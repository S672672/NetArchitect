/**
 * Recommendation Engine
 * Aggregates analysis results into prioritized recommendations
 */
import { NetworkNode, NetworkEdge, VLAN, Recommendation, RecommendationPriority } from "@/types";
import { buildGraph, findArticulationPoints } from "@/lib/graph/algorithms";
import { validateTopology } from "@/lib/validation";
import { DEVICE_TYPES } from "@/lib/network/deviceTypes";

let recCounter = 0;

function createRecId(): string {
  return `rec-${Date.now()}-${++recCounter}`;
}

/**
 * Calculate deterministic redundancy cost based on device type
 */
function calculateRedundancyCost(node: NetworkNode): number {
  const costs: Record<string, number> = {
    "l3-switch": 5000,
    firewall: 8000,
    router: 3500,
    "l2-switch": 1500,
    "load-balancer": 12000,
    "wireless-ap": 600,
    server: 6000,
    "database-server": 15000,
    "application-server": 8000,
    "dns-server": 4000,
  };
  return costs[node.data.deviceType] || 2000;
}

export function generateRecommendations(
  nodes: NetworkNode[],
  edges: NetworkEdge[],
  vlans: VLAN[]
): Recommendation[] {
  if (nodes.length === 0) return [];

  const recommendations: Recommendation[] = [];
  const graph = buildGraph(nodes, edges);

  // 1. Single Points of Failure (from validation)
  const validation = validateTopology(nodes, edges, vlans);
  const spoIssues = validation.issues.filter(i => i.ruleId === "spof");

  for (const issue of spoIssues) {
    const affectedNode = issue.affectedNodeIds[0];
    const node = nodes.find(n => n.id === affectedNode);
    if (!node) continue;

    recommendations.push({
      id: createRecId(),
      priority: "critical",
      title: `Add redundancy to ${node.data.label}`,
      why: `${node.data.label} is a single point of failure. Its failure would disconnect significant portions of the network.`,
      estimatedCost: calculateRedundancyCost(node),
      impact: "High resilience improvement",
      affectedNodeIds: issue.affectedNodeIds,
      category: "redundancy",
    });
  }

  // 2. Security findings
  const secIssues = validation.issues.filter(i =>
    i.ruleId === "public-db-exposure" || i.ruleId === "security"
  );

  for (const issue of secIssues) {
    recommendations.push({
      id: createRecId(),
      priority: issue.severity === "critical" ? "critical" : "high",
      title: issue.title,
      why: issue.description,
      impact: issue.recommendation || "Improved network security",
      affectedNodeIds: issue.affectedNodeIds,
      category: "security",
    });
  }

  // 3. IoT segmentation
  const iotNodes = nodes.filter(n => n.data.deviceType === "iot-device");
  if (iotNodes.length > 0) {
    const hasIotVlan = vlans.some(v =>
      v.name.toLowerCase().includes("iot") || v.name.toLowerCase().includes("sensor")
    );

    if (!hasIotVlan) {
      recommendations.push({
        id: createRecId(),
        priority: "high",
        title: "Move IoT devices to a dedicated VLAN",
        why: `IoT devices (${iotNodes.map(n => n.data.label).join(", ")}) share the employee network. IoT devices often have weaker security.`,
        impact: "Improved segmentation and reduced lateral movement risk",
        affectedNodeIds: iotNodes.map(n => n.id),
        category: "segmentation",
      });
    }
  }

  // 4. VLAN segmentation
  if (vlans.length === 0 && nodes.length > 3) {
    recommendations.push({
      id: createRecId(),
      priority: "high",
      title: "Implement VLAN segmentation",
      why: "No VLANs are configured. All devices share the same network segment.",
      impact: "Improved network isolation and security",
      affectedNodeIds: [],
      category: "segmentation",
    });
  }

  // 5. Missing gateways
  const gwIssues = validation.issues.filter(i => i.ruleId === "missing-gateway");
  for (const issue of gwIssues) {
    recommendations.push({
      id: createRecId(),
      priority: "medium",
      title: issue.title,
      why: issue.description,
      impact: issue.recommendation || "Improved connectivity",
      affectedNodeIds: issue.affectedNodeIds,
      category: "configuration",
    });
  }

  // 6. Subnet overlap
  const subnetIssues = validation.issues.filter(i => i.ruleId === "subnet-overlap");
  for (const issue of subnetIssues) {
    recommendations.push({
      id: createRecId(),
      priority: "medium",
      title: issue.title,
      why: issue.description,
      impact: "Resolved IP conflicts",
      affectedNodeIds: issue.affectedNodeIds,
      category: "configuration",
    });
  }

  // 7. Duplicate IPs
  const dupIpIssues = validation.issues.filter(i => i.ruleId === "dup-ip");
  for (const issue of dupIpIssues) {
    recommendations.push({
      id: createRecId(),
      priority: "medium",
      title: issue.title,
      why: issue.description,
      impact: "Resolved IP conflicts",
      affectedNodeIds: issue.affectedNodeIds,
      category: "configuration",
    });
  }

  // 8. Port utilization
  for (const node of nodes) {
    const info = DEVICE_TYPES[node.data.deviceType];
    if (!info?.defaultPorts) continue;
    const degree = graph.adjacency.get(node.id)?.size || 0;
    if (degree >= info.defaultPorts * 0.9) {
      recommendations.push({
        id: createRecId(),
        priority: "medium",
        title: `${node.data.label} port capacity at ${Math.round((degree / info.defaultPorts) * 100)}%`,
        why: `${node.data.label} is using ${degree}/${info.defaultPorts} ports. Capacity is nearly exhausted.`,
        estimatedCost: 1500,
        impact: "Expanded port capacity",
        affectedNodeIds: [node.id],
        category: "capacity",
      });
    }
  }

  // Sort by priority
  const priorityOrder: Record<RecommendationPriority, number> = {
    critical: 0, high: 1, medium: 2, low: 3,
  };
  recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return recommendations;
}
