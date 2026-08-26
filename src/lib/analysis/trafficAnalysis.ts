/**
 * Traffic & Bottleneck Analysis Engine
 * Analyzes expected traffic flows and detects bandwidth bottlenecks
 */
import { NetworkNode, NetworkEdge, TrafficProfile, TrafficPathAnalysis, TrafficAnalysisResult, ConnectionType } from "@/types";
import { buildGraph, shortestPath } from "@/lib/graph/algorithms";

const DEFAULT_BANDWIDTH: Record<ConnectionType, number> = {
  ethernet: 1000,  // 1 Gbps
  fiber: 10000,    // 10 Gbps
  wireless: 300,   // 300 Mbps
  vpn: 100,        // 100 Mbps
  internet: 500,   // 500 Mbps
};

const TRAFFIC_TYPE_LABELS: Record<string, string> = {
  http: "HTTP",
  https: "HTTPS",
  database: "Database",
  voip: "VoIP",
  video: "Video",
  general: "General",
  custom: "Custom",
};

export function analyzeTraffic(
  nodes: NetworkNode[],
  edges: NetworkEdge[],
  profile: TrafficProfile
): TrafficAnalysisResult {
  const graph = buildGraph(nodes, edges);
  const path = shortestPath(graph, profile.sourceId, profile.targetId);

  if (!path) {
    return {
      pathAnalysis: null,
      recommendations: ["No path found between the selected source and destination. Check connectivity."],
    };
  }

  // Build segment analysis
  const segments: TrafficPathAnalysis["segments"] = [];
  let bottleneckIndex: number | null = null;
  let maxUtilization = 0;

  for (let i = 0; i < path.length - 1; i++) {
    const fromId = path[i];
    const toId = path[i + 1];
    const fromNode = nodes.find(n => n.id === fromId);
    const toNode = nodes.find(n => n.id === toId);

    // Find the edge
    const edge = edges.find(e =>
      (e.source === fromId && e.target === toId) ||
      (e.source === toId && e.target === fromId)
    );

    const connectionType = edge?.data?.connectionType || "ethernet";
    const bandwidthMbps = DEFAULT_BANDWIDTH[connectionType];

    const utilization = Math.round((profile.expectedBandwidthMbps / bandwidthMbps) * 100);

    if (utilization > maxUtilization) {
      maxUtilization = utilization;
      bottleneckIndex = i;
    }

    segments.push({
      from: fromId,
      to: toId,
      fromLabel: fromNode?.data.label || fromId,
      toLabel: toNode?.data.label || toId,
      bandwidthMbps,
      connectionType,
      utilization: Math.min(utilization, 100),
    });
  }

  const isBottleneck = maxUtilization > 80;

  const recommendations: string[] = [];

  if (isBottleneck) {
    const bn = bottleneckIndex !== null ? segments[bottleneckIndex] : null;
    if (bn) {
      recommendations.push(
        `Bottleneck detected: ${bn.fromLabel} → ${bn.toLabel} (${bn.connectionType}, ${bn.bandwidthMbps} Mbps). ` +
        `Required: ${profile.expectedBandwidthMbps} Mbps (${maxUtilization}% utilization). ` +
        `Consider upgrading this link.`
      );
    }
  }

  if (maxUtilization > 50 && !isBottleneck) {
    recommendations.push(
      `Moderate utilization (${maxUtilization}%) on the path. Monitor for growth.`
    );
  }

  if (maxUtilization <= 50) {
    recommendations.push("Path has sufficient bandwidth for the expected traffic.");
  }

  // Check for single-path dependency
  const allPaths = [];
  for (let i = 0; i < path.length - 1; i++) {
    // This is simplified — just check if edge exists
  }

  return {
    pathAnalysis: {
      path,
      pathLabels: path.map(pid => nodes.find(n => n.id === pid)?.data.label || pid),
      segments,
      bottleneckSegmentIndex: bottleneckIndex,
      maxUtilization,
      isBottleneck,
    },
    recommendations,
  };
}

export function getTrafficTypeLabel(type: string): string {
  return TRAFFIC_TYPE_LABELS[type] || type;
}
