/**
 * Network Capacity Planning Engine
 * Analyzes subnet utilization, growth projections, and port capacity
 */
import { NetworkNode, NetworkEdge, VLAN, CapacityPlan, CapacityAnalysisResult, GrowthProjection, SubnetUtilization, ValidationSeverity } from "@/types";
import { buildGraph } from "@/lib/graph/algorithms";
import { DEVICE_TYPES } from "@/lib/network/deviceTypes";

export function analyzeCapacity(
  nodes: NetworkNode[],
  edges: NetworkEdge[],
  vlans: VLAN[],
  plan: CapacityPlan
): CapacityAnalysisResult {
  const graph = buildGraph(nodes, edges);

  // Growth projections
  const projections: GrowthProjection[] = [];
  for (let y = 0; y <= plan.planningYears; y++) {
    projections.push({
      year: y,
      projectedUsers: Math.round(plan.currentUsers * Math.pow(1 + plan.annualGrowthRate / 100, y)),
    });
  }

  // Subnet utilization per VLAN
  const subnetUtilizations: SubnetUtilization[] = [];

  for (const vlan of vlans) {
    if (!vlan.subnet) continue;

    const [networkAddr, prefixStr] = vlan.subnet.split("/");
    if (!prefixStr) continue;

    const prefix = parseInt(prefixStr);
    if (isNaN(prefix)) continue;

    const usableHosts = prefix === 32 ? 1 : Math.pow(2, 32 - prefix) - 2;
    const assignedDevices = vlan.deviceIds.length;

    // Also count devices in the topology with matching subnet
    const topoDevicesWithSubnet = nodes.filter(n => n.data.config.subnet === vlan.subnet);
    const totalAssigned = Math.max(assignedDevices, topoDevicesWithSubnet.length);

    const utilizationPercent = usableHosts > 0 ? Math.round((totalAssigned / usableHosts) * 100) : 100;

    // Project future need
    const year2Users = plan.currentUsers * Math.pow(1 + plan.annualGrowthRate / 100, plan.planningYears);
    const scaleFactor = plan.currentUsers > 0 ? totalAssigned / plan.currentUsers : 0;
    const projectedNeed = Math.round(year2Users * scaleFactor);

    let status: SubnetUtilization["status"] = "ok";
    let recommendation: string | undefined;

    if (utilizationPercent >= 100) {
      status = "exhausted";
      recommendation = `Subnet ${vlan.subnet} is fully allocated. Consider subnet expansion.`;
    } else if (utilizationPercent >= 85 || projectedNeed > usableHosts) {
      status = "critical";
      if (prefix < 32) {
        const newPrefix = prefix - 1;
        recommendation = `Consider upgrading from /${prefix} to /${newPrefix} (${Math.pow(2, 32 - newPrefix) - 2} hosts).`;
      }
    } else if (utilizationPercent >= 70) {
      status = "warning";
      recommendation = "Approaching capacity. Plan for subnet expansion.";
    }

    subnetUtilizations.push({
      vlanId: vlan.vlanId,
      vlanName: vlan.name,
      subnet: vlan.subnet,
      usableHosts,
      currentAllocation: totalAssigned,
      utilizationPercent,
      projectedNeed,
      status,
      recommendation,
    });
  }

  // Switch port analysis
  const switchPortAnalysis: CapacityAnalysisResult["switchPortAnalysis"] = [];

  for (const node of nodes) {
    const info = DEVICE_TYPES[node.data.deviceType];
    if (!info?.defaultPorts) continue;

    const degree = graph.adjacency.get(node.id)?.size || 0;
    const utilization = Math.round((degree / info.defaultPorts) * 100);

    switchPortAnalysis.push({
      deviceId: node.id,
      label: node.data.label,
      usedPorts: degree,
      totalPorts: info.defaultPorts,
      utilization,
    });
  }

  // Capacity issues
  const capacityIssues: CapacityAnalysisResult["capacityIssues"] = [];

  for (const sub of subnetUtilizations) {
    if (sub.status === "critical" || sub.status === "exhausted") {
      capacityIssues.push({
        severity: sub.status === "exhausted" ? "critical" : "error",
        title: `Subnet ${sub.subnet} at ${sub.utilizationPercent}% capacity`,
        description: `VLAN ${sub.vlanId} (${sub.vlanName}) has ${sub.currentAllocation}/${sub.usableHosts} addresses allocated.`,
        recommendation: sub.recommendation || "Expand subnet or redistribute devices.",
      });
    } else if (sub.status === "warning") {
      capacityIssues.push({
        severity: "warning",
        title: `Subnet ${sub.subnet} approaching capacity`,
        description: `VLAN ${sub.vlanId} (${sub.vlanName}) is at ${sub.utilizationPercent}% utilization.`,
        recommendation: sub.recommendation || "Monitor and plan for expansion.",
      });
    }
  }

  for (const sw of switchPortAnalysis) {
    if (sw.utilization >= 90) {
      capacityIssues.push({
        severity: "error",
        title: `${sw.label} at ${sw.utilization}% port utilization`,
        description: `${sw.usedPorts}/${sw.totalPorts} ports in use.`,
        recommendation: "Consider upgrading to a higher-capacity switch or adding an additional switch.",
      });
    } else if (sw.utilization >= 75) {
      capacityIssues.push({
        severity: "warning",
        title: `${sw.label} port utilization at ${sw.utilization}%`,
        description: `${sw.usedPorts}/${sw.totalPorts} ports in use.`,
        recommendation: "Monitor port usage and plan for expansion.",
      });
    }
  }

  return {
    projections,
    subnetUtilizations,
    switchPortAnalysis,
    capacityIssues,
  };
}

export function getGrowthProjection(
  currentUsers: number,
  annualGrowthRate: number,
  years: number
): GrowthProjection[] {
  const projections: GrowthProjection[] = [];
  for (let y = 0; y <= years; y++) {
    projections.push({
      year: y,
      projectedUsers: Math.round(currentUsers * Math.pow(1 + annualGrowthRate / 100, y)),
    });
  }
  return projections;
}
