import { ValidationIssue } from "@/types";
import { ValidationContext, createIssueId } from "../types";
import { buildGraph, getDegree } from "@/lib/graph/algorithms";

// Max connections thresholds by device type
const MAX_CONNECTIONS: Record<string, number> = {
  router: 16,
  "l3-switch": 48,
  "l2-switch": 48,
  firewall: 8,
  "wireless-ap": 32,
  "load-balancer": 16,
  server: 8,
  "database-server": 4,
  "application-server": 8,
  "dns-server": 8,
  desktop: 2,
  laptop: 2,
  "mobile-device": 2,
  "iot-device": 2,
  printer: 2,
  internet: 64,
  cloud: 64,
  "vpn-gateway": 4,
};

export const excessiveConnectionsRule = (
  ctx: ValidationContext
): ValidationIssue[] => {
  const issues: ValidationIssue[] = [];
  const graph = buildGraph(ctx.nodes, ctx.edges);

  for (const node of ctx.nodes) {
    const degree = getDegree(graph, node.id);
    const maxConn = MAX_CONNECTIONS[node.data.deviceType] ?? 16;

    if (degree > maxConn) {
      issues.push({
        id: createIssueId(),
        severity: "warning",
        title: `Excessive Connections: ${node.data.label}`,
        description: `"${node.data.label}" (${node.data.deviceType}) has ${degree} connections, exceeding the typical maximum of ${maxConn} for this device type.`,
        affectedNodeIds: [node.id],
        recommendation: `Consider adding additional switches or consolidating connections. This device may become a performance bottleneck.`,
        ruleId: "excessiveConnections",
      });
    }
  }

  return issues;
};
