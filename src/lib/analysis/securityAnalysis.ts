/**
 * Security Exposure Analysis Engine
 * Analyzes topology for insecure architecture patterns
 */
import { NetworkNode, NetworkEdge, SecurityFinding, SecurityAnalysisResult, SecuritySeverity } from "@/types";
import { buildGraph, bfs, findAllPaths, shortestPath } from "@/lib/graph/algorithms";

const SENSITIVE_TYPES = ["database-server", "dns-server", "application-server", "server"];

export function analyzeSecurityExposures(
  nodes: NetworkNode[],
  edges: NetworkEdge[]
): SecurityAnalysisResult {
  const findings: SecurityFinding[] = [];
  const exposurePaths: SecurityAnalysisResult["exposurePaths"] = [];
  const graph = buildGraph(nodes, edges);

  const internetNodes = nodes.filter(n => n.data.deviceType === "internet" || n.data.deviceType === "cloud");
  const firewallNodes = nodes.filter(n => n.data.deviceType === "firewall");
  const sensitiveNodes = nodes.filter(n => SENSITIVE_TYPES.includes(n.data.deviceType));
  const iotNodes = nodes.filter(n => n.data.deviceType === "iot-device");
  const clientNodes = nodes.filter(n => n.data.category === "client");

  // Rule 1: Direct Internet → Sensitive exposure
  for (const inet of internetNodes) {
    for (const sensitive of sensitiveNodes) {
      const path = shortestPath(graph, inet.id, sensitive.id);
      if (path && path.length > 0) {
        // Check if path goes through firewall
        const hasFirewall = path.some(pid => {
          const node = nodes.find(n => n.id === pid);
          return node?.data.deviceType === "firewall";
        });

        if (!hasFirewall) {
          const pathLabels = path.map(pid => nodes.find(n => n.id === pid)?.data.label || pid);
          exposurePaths.push({
            source: inet.data.label,
            target: sensitive.data.label,
            path,
            pathLabels,
          });
          findings.push({
            id: `sec-${Date.now()}-exposure-${sensitive.id}`,
            severity: "critical",
            title: `${sensitive.data.label} exposed to Internet`,
            description: `${sensitive.data.label} (${sensitive.data.deviceType}) is reachable from the Internet without passing through a firewall. This represents a significant security risk.`,
            affectedNodeIds: path,
            path,
            pathLabels,
            recommendation: `Add a firewall between the Internet and ${sensitive.data.label}, or route traffic through the existing firewall.`,
          });
        }
      }
    }
  }

  // Rule 2: Missing Firewall Boundary
  if (firewallNodes.length === 0 && internetNodes.length > 0 && sensitiveNodes.length > 0) {
    findings.push({
      id: `sec-${Date.now()}-no-firewall`,
      severity: "critical",
      title: "No firewall in network perimeter",
      description: "The network has Internet connectivity but no firewall device. All traffic is uninspected.",
      affectedNodeIds: [...internetNodes.map(n => n.id), ...sensitiveNodes.map(n => n.id)],
      path: [],
      pathLabels: [],
      recommendation: "Deploy a firewall at the network perimeter to inspect and filter traffic.",
    });
  }

  // Rule 3: Flat Network Detection
  const hasVlanSeparation = new Set(nodes.map(n => n.data.config.vlan).filter(Boolean)).size;
  if (hasVlanSeparation <= 1 && clientNodes.length > 2 && sensitiveNodes.length > 0) {
    findings.push({
      id: `sec-${Date.now()}-flat-network`,
      severity: "high",
      title: "Flat network — no meaningful segmentation",
      description: "Client devices, servers, and potentially sensitive infrastructure share the same network segment. Lateral movement risk is elevated.",
      affectedNodeIds: [...clientNodes.map(n => n.id), ...sensitiveNodes.map(n => n.id)],
      path: [],
      pathLabels: clientNodes.map(n => n.data.label),
      recommendation: "Separate devices into VLANs: Management, Servers, Employees, IoT, and Guest networks.",
    });
  }

  // Rule 4: IoT Segmentation
  if (iotNodes.length > 0) {
    const iotVlans = new Set(iotNodes.map(n => n.data.config.vlan).filter(Boolean));
    if (iotVlans.size === 0 || (iotVlans.size === 1 && iotNodes.some(n => {
      // Check if IoT is on the same VLAN as other devices
      const sameVlan = nodes.filter(other => other.data.config.vlan === n.data.config.vlan && other.data.deviceType !== "iot-device");
      return sameVlan.length > 0;
    }))) {
      findings.push({
        id: `sec-${Date.now()}-iot-segmentation`,
        severity: "medium",
        title: "IoT devices not in isolated VLAN",
        description: `IoT devices (${iotNodes.map(n => n.data.label).join(", ")}) are on the same network segment as other devices. IoT devices often have weaker security.`,
        affectedNodeIds: iotNodes.map(n => n.id),
        path: [],
        pathLabels: [],
        recommendation: "Create a dedicated IoT VLAN to isolate these devices and limit lateral movement.",
      });
    }
  }

  // Rule 5: Database exposure via application server
  for (const db of nodes.filter(n => n.data.deviceType === "database-server")) {
    for (const inet of internetNodes) {
      const path = shortestPath(graph, inet.id, db.id);
      if (path) {
        const pathLabels = path.map(pid => nodes.find(n => n.id === pid)?.data.label || pid);
        const hasAppServer = path.some(pid => {
          const node = nodes.find(n => n.id === pid);
          return node?.data.deviceType === "application-server";
        });
        const hasFirewall = path.some(pid => {
          const node = nodes.find(n => n.id === pid);
          return node?.data.deviceType === "firewall";
        });

        if (hasAppServer && hasFirewall) {
          // Good — database is behind app server and firewall
          findings.push({
            id: `sec-${Date.now()}-db-behind-app-${db.id}`,
            severity: "info",
            title: `${db.data.label} properly segmented`,
            description: `${db.data.label} is reachable only through the application server and firewall.`,
            affectedNodeIds: [db.id],
            path,
            pathLabels,
            recommendation: "This is good architecture. Maintain this pattern.",
          });
        }
      }
    }
  }

  // Rule 6: Critical infrastructure without redundant path
  for (const crit of nodes.filter(n => ["firewall", "router", "l3-switch"].includes(n.data.deviceType))) {
    const allPaths = findAllPaths(graph, nodes[0]?.id || crit.id, crit.id, 5);
    if (allPaths.length <= 1 && internetNodes.length > 0) {
      const testPath = shortestPath(graph, internetNodes[0].id, crit.id);
      if (testPath && testPath.length > 0) {
        findings.push({
          id: `sec-${Date.now()}-single-path-${crit.id}`,
          severity: "medium",
          title: `${crit.data.label} has no redundant access path`,
          description: `${crit.data.label} can only be reached through a single path. A link failure could isolate it.`,
          affectedNodeIds: testPath,
          path: testPath,
          pathLabels: testPath.map(pid => nodes.find(n => n.id === pid)?.data.label || pid),
          recommendation: `Add a redundant link to ${crit.data.label} for improved availability.`,
        });
      }
    }
  }

  // Sort by severity
  const severityOrder: Record<SecuritySeverity, number> = {
    critical: 0, high: 1, medium: 2, low: 3, info: 4,
  };
  findings.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  // Overall risk
  let overallRisk: SecuritySeverity = "info";
  for (const f of findings) {
    if (f.severity === "critical") { overallRisk = "critical"; break; }
    if (f.severity === "high") overallRisk = "high";
    else if (f.severity === "medium" && overallRisk !== "high") overallRisk = "medium";
    else if (f.severity === "low" && overallRisk === "info") overallRisk = "low";
  }

  return { findings, exposurePaths, overallRisk };
}
