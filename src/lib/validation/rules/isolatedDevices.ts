import { ValidationIssue } from "@/types";
import { ValidationContext, createIssueId } from "../types";

export const isolatedDevicesRule = (ctx: ValidationContext): ValidationIssue[] => {
  const issues: ValidationIssue[] = [];

  for (const node of ctx.nodes) {
    const connectedEdges = ctx.edges.filter(
      (e) => e.source === node.id || e.target === node.id
    );
    if (connectedEdges.length === 0 && node.data.deviceType !== "internet") {
      issues.push({
        id: createIssueId(),
        severity: "warning",
        title: `Isolated Device: ${node.data.label}`,
        description: `"${node.data.label}" (${node.data.label}) has no network connections. It cannot communicate with any other device.`,
        affectedNodeIds: [node.id],
        recommendation: `Connect "${node.data.label}" to an appropriate switch or network device to integrate it into the network.`,
        ruleId: "isolatedDevices",
      });
    }
  }

  return issues;
};
