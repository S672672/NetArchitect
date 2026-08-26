/**
 * Failure Simulation Engine
 * Simulates device/connection failures and analyzes impact
 * Does NOT modify the original topology — works on a snapshot
 */
import { NetworkNode, NetworkEdge, VLAN, FailureSimulationResult, ImpactLevel, DeviceType } from "@/types";
import { buildGraph, bfs, findAllPaths } from "@/lib/graph/algorithms";

const CRITICAL_DEVICE_TYPES: DeviceType[] = [
  "firewall", "router", "l3-switch", "database-server", "application-server", "dns-server"
];

const INFRASTRUCTURE_TYPES: DeviceType[] = [
  "server", "database-server", "application-server", "dns-server", "load-balancer"
];

const LOW_IMPACT_TYPES: DeviceType[] = ["printer"];

export function simulateFailure(
  nodes: NetworkNode[],
  edges: NetworkEdge[],
  vlans: VLAN[],
  failedNodeIds: string[],
  failedEdgeIds: string[]
): FailureSimulationResult {
  // Build graph with failures removed
  const survivingNodes = nodes.filter(n => !failedNodeIds.includes(n.id));
  const survivingEdges = edges.filter(e =>
    !failedEdgeIds.includes(e.id) &&
    !failedNodeIds.includes(e.source) &&
    !failedNodeIds.includes(e.target)
  );

  const graph = buildGraph(survivingNodes, survivingEdges);

  // Determine reachable nodes from each external node
  const externalNodes = survivingNodes.filter(n =>
    n.data.deviceType === "internet" || n.data.deviceType === "cloud" || n.data.deviceType === "vpn-gateway"
  );

  let reachableFromExternal = new Set<string>();
  if (externalNodes.length > 0) {
    for (const ext of externalNodes) {
      const reachable = bfs(graph, ext.id);
      for (const r of reachable) reachableFromExternal.add(r);
    }
  } else {
    // No external nodes — all surviving nodes are "reachable" from each other
    for (const n of survivingNodes) reachableFromExternal.add(n.id);
  }

  // Also include fully internal nodes (like printers on an internal network)
  // A node is reachable if it's in a connected component with other internal nodes
  const visited = new Set<string>();
  const internalComponents: string[][] = [];
  for (const node of survivingNodes) {
    if (!visited.has(node.id)) {
      const component = bfs(graph, node.id);
      for (const id of component) visited.add(id);
      if (component.size > 0) internalComponents.push(Array.from(component));
    }
  }

  // Determine truly unreachable: nodes not reachable from any external node
  // AND in a component that has no external nodes
  const unreachableNodeIds: string[] = [];
  const reachableNodeIds: string[] = [];

  for (const comp of internalComponents) {
    const hasExternal = comp.some(id => {
      const node = survivingNodes.find(n => n.id === id);
      return node && (node.data.deviceType === "internet" || node.data.deviceType === "cloud" || node.data.deviceType === "vpn-gateway");
    });

    for (const id of comp) {
      if (externalNodes.length > 0 && !hasExternal && !reachableFromExternal.has(id)) {
        unreachableNodeIds.push(id);
      } else if (externalNodes.length === 0 && comp.length < survivingNodes.length) {
        // Check if this component is smaller and disconnected from the main one
        const mainComp = internalComponents.reduce((a, b) => a.length > b.length ? a : b, []);
        if (comp.length < mainComp.length) {
          unreachableNodeIds.push(id);
        } else {
          reachableNodeIds.push(id);
        }
      } else {
        reachableNodeIds.push(id);
      }
    }
  }

  // Affected services — unreachable infrastructure
  const affectedServices = unreachableNodeIds
    .map(id => survivingNodes.find(n => n.id === id))
    .filter((n): n is NetworkNode => n !== undefined && INFRASTRUCTURE_TYPES.includes(n.data.deviceType))
    .map(n => ({ nodeId: n.id, label: n.data.label, deviceType: n.data.deviceType }));

  // Affected VLANs
  const affectedVlans = vlans.filter(vlan => {
    const allDeviceIds = [...vlan.deviceIds, ...failedNodeIds, ...unreachableNodeIds];
    const affectedCount = vlan.deviceIds.filter(id =>
      failedNodeIds.includes(id) || unreachableNodeIds.includes(id)
    ).length;
    return affectedCount > 0;
  }).map(v => ({ vlanId: v.vlanId, name: v.name }));

  // Affected segments
  const affectedSegments = [...new Set(affectedVlans.map(v => `VLAN ${v.vlanId} — ${v.name}`))];

  // Impact classification
  const impactLevel = classifyImpact(
    failedNodeIds,
    unreachableNodeIds,
    affectedServices,
    nodes.length,
    survivingNodes
  );

  // Recommendation
  const recommendation = generateFailureRecommendation(
    impactLevel,
    failedNodeIds,
    failedEdgeIds,
    nodes,
    unreachableNodeIds,
    affectedServices
  );

  const connectivityRatio = survivingNodes.length > 0
    ? reachableNodeIds.length / survivingNodes.length
    : 0;

  return {
    id: `sim-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    failedNodeIds,
    failedEdgeIds,
    reachableNodeIds,
    unreachableNodeIds,
    affectedServices,
    affectedVlans,
    impactLevel,
    totalNodes: nodes.length,
    reachableCount: reachableNodeIds.length,
    unreachableCount: unreachableNodeIds.length,
    connectivityRatio,
    affectedSegments,
    recommendation,
    createdAt: new Date().toISOString(),
  };
}

function classifyImpact(
  failedNodeIds: string[],
  unreachableNodeIds: string[],
  affectedServices: FailureSimulationResult["affectedServices"],
  totalNodes: number,
  survivingNodes: NetworkNode[]
): ImpactLevel {
  const failedDevices = failedNodeIds.map(id =>
    survivingNodes.find(n => n.id === id)
  ).filter(Boolean) as NetworkNode[];

  // Check for critical device failures
  const criticalFailures = failedDevices.filter(d =>
    CRITICAL_DEVICE_TYPES.includes(d.data.deviceType)
  );

  // Printer only = LOW
  if (
    failedDevices.length === 1 &&
    LOW_IMPACT_TYPES.includes(failedDevices[0].data.deviceType)
  ) {
    return "low";
  }

  // Check unreachable infrastructure
  const unreachableInfraCount = affectedServices.length;

  // CRITICAL: major infrastructure failure
  if (criticalFailures.length > 0) {
    if (unreachableInfraCount >= 3) return "critical";
    if (unreachableInfraCount >= 1 && unreachableNodeIds.length > totalNodes * 0.3) return "critical";
    if (criticalFailures.some(d => d.data.deviceType === "firewall" || d.data.deviceType === "router")) {
      return unreachableNodeIds.length > 0 ? "critical" : "high";
    }
    return "high";
  }

  // HIGH: significant portion unreachable
  if (unreachableNodeIds.length > totalNodes * 0.4) return "high";
  if (unreachableInfraCount >= 2) return "high";

  // MEDIUM: some devices unreachable or non-critical segment affected
  if (unreachableNodeIds.length > 0) return "medium";
  if (affectedServices.length > 0) return "medium";

  // LOW: no significant impact
  return "low";
}

function generateFailureRecommendation(
  impact: ImpactLevel,
  failedNodeIds: string[],
  failedEdgeIds: string[],
  allNodes: NetworkNode[],
  unreachableIds: string[],
  affectedServices: FailureSimulationResult["affectedServices"]
): string {
  const parts: string[] = [];

  if (impact === "critical" || impact === "high") {
    parts.push("Add redundancy to eliminate this single point of failure.");
  }

  if (affectedServices.length > 0) {
    const serviceNames = affectedServices.map(s => s.label).join(", ");
    parts.push(`Critical services affected: ${serviceNames}. Consider alternate paths or failover configurations.`);
  }

  if (failedEdgeIds.length > 0) {
    parts.push("Add redundant links to improve connection resilience.");
  }

  if (impact === "medium") {
    parts.push("Evaluate whether this failure scenario is acceptable for your SLA requirements.");
  }

  if (impact === "low") {
    parts.push("Impact is minimal. Consider whether additional redundancy is cost-effective.");
  }

  return parts.join(" ") || "Review this failure scenario and assess risk tolerance.";
}

/**
 * Quick impact assessment for a single node
 */
export function quickImpactAssessment(
  nodes: NetworkNode[],
  edges: NetworkEdge[],
  nodeId: string
): { reachable: number; unreachable: number; criticalServices: number; impact: ImpactLevel } {
  const result = simulateFailure(nodes, edges, [], [nodeId], []);
  return {
    reachable: result.reachableCount,
    unreachable: result.unreachableCount,
    criticalServices: result.affectedServices.length,
    impact: result.impactLevel,
  };
}
