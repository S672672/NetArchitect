import { NetworkNode, NetworkEdge, VLAN, ValidationIssue, ValidationSeverity } from "@/types";
import { ValidationContext, ValidationResult, resetIssueCounter } from "./types";
import { isolatedDevicesRule } from "./rules/isolatedDevices";
import { singlePointOfFailureRule } from "./rules/singlePointOfFailure";
import { subnetOverlapRule } from "./rules/subnetOverlap";
import { invalidIpConfigurationRule } from "./rules/invalidIpConfiguration";
import { missingGatewayRule } from "./rules/missingGateway";
import { publicDatabaseExposureRule } from "./rules/publicDatabaseExposure";
import { vlanSegmentationRule } from "./rules/vlanSegmentation";
import { excessiveConnectionsRule } from "./rules/excessiveConnections";
import { redundantPathRule } from "./rules/redundantPath";

const allRules = [
  isolatedDevicesRule,
  singlePointOfFailureRule,
  subnetOverlapRule,
  invalidIpConfigurationRule,
  missingGatewayRule,
  publicDatabaseExposureRule,
  vlanSegmentationRule,
  excessiveConnectionsRule,
  redundantPathRule,
];

export function validateTopology(
  nodes: NetworkNode[],
  edges: NetworkEdge[],
  vlans: VLAN[]
): ValidationResult {
  resetIssueCounter();

  const context: ValidationContext = {
    nodes,
    edges,
    vlans,
  };

  const allIssues: ValidationIssue[] = [];

  for (const rule of allRules) {
    try {
      const issues = rule(context);
      allIssues.push(...issues);
    } catch {
      // Skip failed rules silently
    }
  }

  // Sort by severity
  const severityOrder: Record<ValidationSeverity, number> = {
    critical: 0,
    error: 1,
    warning: 2,
    info: 3,
  };

  allIssues.sort(
    (a, b) => severityOrder[a.severity] - severityOrder[b.severity]
  );

  return {
    issues: allIssues,
    timestamp: new Date().toISOString(),
    nodeCount: nodes.length,
    edgeCount: edges.length,
  };
}

export function getIssueCounts(issues: ValidationIssue[]): Record<ValidationSeverity, number> {
  const counts: Record<ValidationSeverity, number> = {
    critical: 0,
    error: 0,
    warning: 0,
    info: 0,
  };
  for (const issue of issues) {
    counts[issue.severity]++;
  }
  return counts;
}

export function getHighestSeverity(
  issues: ValidationIssue[]
): ValidationSeverity | null {
  if (issues.length === 0) return null;
  const severityOrder: ValidationSeverity[] = ["critical", "error", "warning", "info"];
  for (const sev of severityOrder) {
    if (issues.some((i) => i.severity === sev)) return sev;
  }
  return null;
}

export type { ValidationResult };
