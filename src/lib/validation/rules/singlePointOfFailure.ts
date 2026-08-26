import { ValidationIssue } from "@/types";
import { ValidationContext, createIssueId } from "../types";
import { buildGraph, isNodeCritical, getDirectNeighbors } from "@/lib/graph/algorithms";

export const singlePointOfFailureRule = (ctx: ValidationContext): ValidationIssue[] => {
  const issues: ValidationIssue[] = [];
  if (ctx.nodes.length < 3) return issues;

  const graph = buildGraph(ctx.nodes, ctx.edges);

  for (const node of ctx.nodes) {
    // Skip leaf nodes and internet/cloud nodes
    const neighbors = getDirectNeighbors(graph, node.id);
    if (neighbors.length <= 1) continue;
    if (node.data.deviceType === "internet" || node.data.deviceType === "cloud") continue;

    if (isNodeCritical(graph, node.id)) {
      issues.push({
        id: createIssueId(),
        severity: "error",
        title: `Single Point of Failure: ${node.data.label}`,
        description: `"${node.data.label}" (${node.data.deviceType}) is a critical node. If this device fails, ${neighbors.length} directly connected device(s) could become isolated from other parts of the network.`,
        affectedNodeIds: [node.id],
        recommendation: `Consider adding a redundant "${node.data.label}" or alternative path to ensure network availability if this device fails.`,
        ruleId: "singlePointOfFailure",
      });
    }
  }

  return issues;
};
