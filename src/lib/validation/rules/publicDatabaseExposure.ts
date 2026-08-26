import { ValidationIssue } from "@/types";
import { ValidationContext, createIssueId } from "../types";
import { buildGraph, shortestPath } from "@/lib/graph/algorithms";

export const publicDatabaseExposureRule = (
  ctx: ValidationContext
): ValidationIssue[] => {
  const issues: ValidationIssue[] = [];
  const graph = buildGraph(ctx.nodes, ctx.edges);

  // Find internet nodes
  const internetNodes = ctx.nodes.filter(
    (n) => n.data.deviceType === "internet"
  );

  // Find database servers
  const dbServers = ctx.nodes.filter(
    (n) => n.data.deviceType === "database-server"
  );

  for (const db of dbServers) {
    for (const internet of internetNodes) {
      const path = shortestPath(graph, internet.id, db.id);
      if (!path) continue;

      // Check if any firewall exists on the path
      const hasFirewallOnPath = path.some((nodeId) => {
        const node = ctx.nodes.find((n) => n.id === nodeId);
        return node?.data.deviceType === "firewall";
      });

      if (!hasFirewallOnPath) {
        const pathLabels = path
          .map((id) => {
            const node = ctx.nodes.find((n) => n.id === id);
            return node ? node.data.label : id;
          })
          .join(" → ");

        issues.push({
          id: createIssueId(),
          severity: "critical",
          title: `Public Database Exposure: ${db.data.label}`,
          description: `"${db.data.label}" (${db.data.label}) is reachable from the Internet without a firewall in the path. Path: ${pathLabels}. This is a critical security vulnerability.`,
          affectedNodeIds: path,
          recommendation: `Place a firewall between the Internet and the database server, or ensure all database traffic is routed through a firewall. Never expose database servers directly to public networks.`,
          ruleId: "publicDatabaseExposure",
        });
      } else {
        // Even with firewall, warn about direct path from internet to DB
        const pathLabels = path
          .map((id) => {
            const node = ctx.nodes.find((n) => n.id === id);
            return node ? node.data.label : id;
          })
          .join(" → ");

        issues.push({
          id: createIssueId(),
          severity: "warning",
          title: `Database Accessible from Internet: ${db.data.label}`,
          description: `"${db.data.label}" is reachable from the Internet (path: ${pathLabels}). While a firewall is present, verify that strict access rules are in place.`,
          affectedNodeIds: path,
          recommendation: `Ensure the firewall has strict rules blocking direct database access from the public Internet. Database servers should typically only be accessible from application servers.`,
          ruleId: "publicDatabaseExposure",
        });
      }
    }
  }

  return issues;
};
