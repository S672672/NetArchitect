import { ValidationIssue } from "@/types";
import { ValidationContext, createIssueId } from "../types";
import {
  buildGraph,
  findAllPaths,
  getDegree,
} from "@/lib/graph/algorithms";

export const redundantPathRule = (ctx: ValidationContext): ValidationIssue[] => {
  const issues: ValidationIssue[] = [];
  if (ctx.nodes.length < 4) return issues;

  const graph = buildGraph(ctx.nodes, ctx.edges);

  // Check critical nodes (servers, firewalls, routers) for redundant paths
  const criticalTypes = [
    "server",
    "database-server",
    "application-server",
    "firewall",
    "router",
  ];

  for (const node of ctx.nodes) {
    if (!criticalTypes.includes(node.data.deviceType)) continue;

    // Find connected switches/hubs (intermediate devices)
    const neighbors = Array.from(graph.adjacency.get(node.id) || []);

    // Check if critical node has only one path to core network
    const switchNeighbors = neighbors.filter((nId) => {
      const n = ctx.nodes.find((nd) => nd.id === nId);
      return n && (n.data.deviceType === "l2-switch" || n.data.deviceType === "l3-switch" || n.data.deviceType === "firewall");
    });

    if (switchNeighbors.length <= 1) {
      // Find paths to internet
      const internetNodes = ctx.nodes.filter(
        (n) => n.data.deviceType === "internet"
      );
      for (const internet of internetNodes) {
        const paths = findAllPaths(graph, node.id, internet.id, 5);
        if (paths.length <= 1) {
          const degree = getDegree(graph, node.id);
          if (degree > 0) {
            issues.push({
              id: createIssueId(),
              severity: "warning",
              title: `No Redundant Path: ${node.data.label}`,
              description: `"${node.data.label}" (${node.data.deviceType}) has no redundant path to the network core. A single link failure could isolate this critical device.`,
              affectedNodeIds: [node.id],
              recommendation: `Add a secondary network connection or link aggregation to provide redundancy for this critical device.`,
              ruleId: "redundantPath",
            });
          }
          break;
        }
      }
    }
  }

  return issues;
};
