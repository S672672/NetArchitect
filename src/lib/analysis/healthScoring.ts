/**
 * Network Health & Resilience Scoring Engine
 * Calculates deterministic scores from actual topology analysis
 */
import { NetworkNode, NetworkEdge, VLAN, NetworkScore, NetworkScoreDetail, ResilienceScore, ScoreDeduction, ScoreImprovement } from "@/types";
import { buildGraph, bfs, findArticulationPoints, countConnectedComponents, findAllPaths } from "@/lib/graph/algorithms";
import { DEVICE_TYPES } from "@/lib/network/deviceTypes";

const CRITICAL_TYPES = ["firewall", "router", "l3-switch", "database-server", "application-server", "dns-server"];

export function calculateNetworkScore(
  nodes: NetworkNode[],
  edges: NetworkEdge[],
  vlans: VLAN[]
): NetworkScoreDetail {
  const deductions: ScoreDeduction[] = [];

  if (nodes.length === 0) {
    return {
      score: { overall: 0, security: 0, connectivity: 0, redundancy: 0, configuration: 0, segmentation: 0, capacity: 0 },
      deductions: [],
      improvements: [],
      grade: "-",
      gradeColor: "#94a3b8",
      summary: "Add devices to see health scores.",
    };
  }
  const improvements: ScoreImprovement[] = [];

  // --- Security Score ---
  let security = 100;
  const graph = buildGraph(nodes, edges);

  // Check for database exposure
  const dbNodes = nodes.filter(n => n.data.deviceType === "database-server");
  const internetNodes = nodes.filter(n => n.data.deviceType === "internet" || n.data.deviceType === "cloud");
  const firewallNodes = nodes.filter(n => n.data.deviceType === "firewall");

  for (const db of dbNodes) {
    for (const inet of internetNodes) {
      const path = bfs(graph, inet.id);
      if (path.has(db.id)) {
        // Check if firewall is between them
        const pathArray = findAllPaths(graph, inet.id, db.id, 1);
        const hasFirewallInPath = pathArray.some(p => p.some(pid => {
          const node = nodes.find(n => n.id === pid);
          return node?.data.deviceType === "firewall";
        }));
        if (!hasFirewallInPath) {
          security -= 20;
          deductions.push({ points: 20, reason: "Database directly reachable from Internet without firewall", ruleId: "sec-db-exposure" });
        } else {
          improvements.push({ points: 5, reason: "Database protected by firewall boundary" });
        }
      }
    }
  }

  // Check for flat network (no VLAN separation)
  const clientNodes = nodes.filter(n => n.data.category === "client");
  const serverNodes = nodes.filter(n => n.data.category === "infrastructure");
  const iotNodes = nodes.filter(n => n.data.deviceType === "iot-device");

  if (iotNodes.length > 0 && vlans.length <= 1) {
    security -= 10;
    deductions.push({ points: 10, reason: "IoT devices not in a separate VLAN", ruleId: "sec-iot-segmentation" });
  }

  if (clientNodes.length > 3 && serverNodes.length > 0 && vlans.length <= 1) {
    security -= 8;
    deductions.push({ points: 8, reason: "Flat network — no meaningful VLAN segmentation", ruleId: "sec-flat-network" });
  }

  if (firewallNodes.length > 0 && internetNodes.length > 0) {
    improvements.push({ points: 5, reason: "Firewall present at network boundary" });
  }

  security = Math.max(0, Math.min(100, security));

  // --- Connectivity Score ---
  let connectivity = 100;
  const components = countConnectedComponents(graph);

  if (components > 1) {
    connectivity -= (components - 1) * 15;
    deductions.push({ points: (components - 1) * 15, reason: `${components} disconnected network segments detected`, ruleId: "conn-disconnected" });
  }

  // Check for isolated devices
  for (const node of nodes) {
    const neighbors = graph.adjacency.get(node.id);
    if (!neighbors || neighbors.size === 0) {
      connectivity -= 5;
      deductions.push({ points: 5, reason: `${node.data.label} has no connections`, ruleId: "conn-isolated" });
    }
  }

  if (connectivity === 100) {
    improvements.push({ points: 3, reason: "All devices are connected" });
  }

  connectivity = Math.max(0, Math.min(100, connectivity));

  // --- Redundancy Score ---
  let redundancy = 100;
  const articulationPoints = findArticulationPoints(graph);

  for (const apId of articulationPoints) {
    const node = nodes.find(n => n.id === apId);
    if (node) {
      const impact = nodes.length > 0
        ? Math.min(15, Math.max(5, Math.round((10 / nodes.length) * 100)))
        : 10;

      if (CRITICAL_TYPES.includes(node.data.deviceType)) {
        redundancy -= 15;
        deductions.push({ points: 15, reason: `${node.data.label} is a critical single point of failure`, ruleId: "red-spo-critical" });
      } else {
        redundancy -= 8;
        deductions.push({ points: 8, reason: `${node.data.label} is a single point of failure`, ruleId: "red-spo" });
      }
    }
  }

  // Check for redundant links between critical nodes
  let hasRedundantLinks = false;
  for (let i = 0; i < edges.length; i++) {
    for (let j = i + 1; j < edges.length; j++) {
      if (
        (edges[i].source === edges[j].source && edges[i].target === edges[j].target) ||
        (edges[i].source === edges[j].target && edges[i].target === edges[j].source)
      ) {
        hasRedundantLinks = true;
      }
    }
  }
  if (hasRedundantLinks) {
    improvements.push({ points: 5, reason: "Redundant links detected between devices" });
  }

  // Check for backup firewalls
  if (firewallNodes.length > 1) {
    redundancy += 5;
    improvements.push({ points: 5, reason: "Redundant firewall configuration" });
  }

  redundancy = Math.max(0, Math.min(100, redundancy));

  // --- Configuration Score ---
  let configuration = 100;
  const ips = new Map<string, string>();
  const subnets = new Set<string>();

  for (const node of nodes) {
    const ip = node.data.config.ipAddress;
    if (ip) {
      if (ips.has(ip)) {
        configuration -= 10;
        deductions.push({ points: 10, reason: `Duplicate IP address ${ip} detected`, ruleId: "cfg-dup-ip" });
      }
      ips.set(ip, node.id);
    }

    const subnet = node.data.config.subnet;
    if (subnet) {
      subnets.add(subnet);
    }

    // Check gateway requirement
    if (DEVICE_TYPES[node.data.deviceType]?.requiresGateway && !node.data.config.gateway && node.data.config.ipAddress) {
      configuration -= 5;
      deductions.push({ points: 5, reason: `${node.data.label} missing gateway configuration`, ruleId: "cfg-no-gateway" });
    }
  }

  // Check subnet overlaps
  const subnetArr = Array.from(subnets);
  for (let i = 0; i < subnetArr.length; i++) {
    for (let j = i + 1; j < subnetArr.length; j++) {
      if (subnetsOverlap(subnetArr[i], subnetArr[j])) {
        configuration -= 10;
        deductions.push({ points: 10, reason: `Subnet overlap: ${subnetArr[i]} and ${subnetArr[j]}`, ruleId: "cfg-subnet-overlap" });
        break;
      }
    }
  }

  if (configuration === 100) {
    improvements.push({ points: 5, reason: "All IP configurations are valid" });
  }

  configuration = Math.max(0, Math.min(100, configuration));

  // --- Segmentation Score ---
  let segmentation = 100;

  if (vlans.length === 0 && nodes.length > 3) {
    segmentation -= 25;
    deductions.push({ points: 25, reason: "No VLANs configured — network is not segmented", ruleId: "seg-no-vlans" });
  } else if (vlans.length === 1 && nodes.length > 5) {
    segmentation -= 10;
    deductions.push({ points: 10, reason: "Only one VLAN — minimal segmentation", ruleId: "seg-minimal" });
  }

  if (vlans.length >= 3) {
    improvements.push({ points: 5, reason: `${vlans.length} VLANs provide good network segmentation` });
  }

  if (vlans.length >= 2) {
    improvements.push({ points: 3, reason: "Server and client networks are separated" });
  }

  segmentation = Math.max(0, Math.min(100, segmentation));

  // --- Capacity Score ---
  let capacity = 100;

  // Check port utilization based on device connections
  for (const node of nodes) {
    const degree = graph.adjacency.get(node.id)?.size || 0;
    const info = DEVICE_TYPES[node.data.deviceType];
    if (info?.defaultPorts && degree > info.defaultPorts * 0.8) {
      capacity -= 5;
      deductions.push({ points: 5, reason: `${node.data.label} port utilization at ${Math.round((degree / info.defaultPorts) * 100)}%`, ruleId: "cap-port-usage" });
    }
  }

  if (capacity === 100 && nodes.length > 0) {
    improvements.push({ points: 3, reason: "Port utilization is within normal range" });
  }

  capacity = Math.max(0, Math.min(100, capacity));

  // --- Overall Score ---
  const overall = Math.round(
    security * 0.25 +
    connectivity * 0.20 +
    redundancy * 0.25 +
    configuration * 0.15 +
    segmentation * 0.10 +
    capacity * 0.05
  );

  // Grade
  const grade = getGrade(overall);
  const gradeColor = getGradeColor(overall);

  const summary = getSummary(overall, deductions.length, improvements.length);

  return {
    score: { overall, security, connectivity, redundancy, configuration, segmentation, capacity },
    deductions,
    improvements,
    grade,
    gradeColor,
    summary,
  };
}

export function calculateResilienceScore(
  nodes: NetworkNode[],
  edges: NetworkEdge[]
): ResilienceScore {
  if (nodes.length === 0) {
    return { overall: 0, criticalInfrastructureRedundancy: 0, redundantPaths: 0, failureTolerance: 0 };
  }

  const graph = buildGraph(nodes, edges);
  const articulationPoints = findArticulationPoints(graph);

  // Critical Infrastructure Redundancy (0-100)
  const criticalNodes = nodes.filter(n => CRITICAL_TYPES.includes(n.data.deviceType));
  const criticalWithoutRedundancy = criticalNodes.filter(n =>
    articulationPoints.includes(n.id)
  );
  const criticalInfrastructureRedundancy = criticalNodes.length > 0
    ? Math.round(100 - (criticalWithoutRedundancy.length / criticalNodes.length) * 100)
    : 100;

  // Redundant Paths (0-100)
  let totalRedundantPairs = 0;
  let pairsWithAlternates = 0;
  const criticalPairs = criticalNodes.slice(0, Math.min(criticalNodes.length, 10));
  for (let i = 0; i < criticalPairs.length; i++) {
    for (let j = i + 1; j < criticalPairs.length; j++) {
      totalRedundantPairs++;
      const paths = findAllPaths(graph, criticalPairs[i].id, criticalPairs[j].id, 3);
      if (paths.length > 1) pairsWithAlternates++;
    }
  }
  const redundantPaths = totalRedundantPairs > 0
    ? Math.round((pairsWithAlternates / totalRedundantPairs) * 100)
    : 100;

  // Failure Tolerance (0-100) — how many random failures before network fragments
  let failuresBeforeFragment = 0;
  for (let i = 1; i <= Math.min(articulationPoints.length + 1, 5); i++) {
    const remaining = nodes.length - i;
    if (remaining <= 0) break;
    // Simulate removing i articulation points
    const testNodeIds = articulationPoints.slice(0, i);
    const survivingNodes = nodes.filter(n => !testNodeIds.includes(n.id));
    const survivingEdges = edges.filter(e =>
      !testNodeIds.includes(e.source) && !testNodeIds.includes(e.target)
    );
    const testGraph = buildGraph(survivingNodes, survivingEdges);
    const comps = countConnectedComponents(testGraph);
    if (comps > 1) break;
    failuresBeforeFragment = i;
  }

  const failureTolerance = nodes.length > 0
    ? Math.round(Math.min(100, (failuresBeforeFragment / Math.max(1, articulationPoints.length)) * 100))
    : 0;

  const overall = Math.round(
    criticalInfrastructureRedundancy * 0.40 +
    redundantPaths * 0.30 +
    failureTolerance * 0.30
  );

  return {
    overall: Math.max(0, Math.min(100, overall)),
    criticalInfrastructureRedundancy,
    redundantPaths,
    failureTolerance,
  };
}

// --- Helpers ---

function getGrade(score: number): string {
  if (score >= 90) return "A+";
  if (score >= 85) return "A";
  if (score >= 80) return "A-";
  if (score >= 75) return "B+";
  if (score >= 70) return "B";
  if (score >= 65) return "B-";
  if (score >= 60) return "C+";
  if (score >= 55) return "C";
  if (score >= 50) return "C-";
  if (score >= 40) return "D";
  return "F";
}

function getGradeColor(score: number): string {
  if (score >= 80) return "#22c55e";
  if (score >= 65) return "#84cc16";
  if (score >= 50) return "#eab308";
  if (score >= 35) return "#f97316";
  return "#ef4444";
}

function getSummary(score: number, deductionCount: number, improvementCount: number): string {
  if (score >= 90) return "Excellent architecture. Your network is well-designed with strong resilience.";
  if (score >= 75) return "Good architecture. A few improvements could strengthen your network further.";
  if (score >= 60) return "Decent design. Some issues should be addressed for production readiness.";
  if (score >= 40) return "Needs improvement. Significant issues found that should be resolved.";
  return "Critical issues detected. Major revisions recommended before deployment.";
}

function subnetsOverlap(a: string, b: string): boolean {
  if (!a || !b || a === b) return false;
  try {
    const [aAddr, aPrefix] = a.split("/");
    const [bAddr, bPrefix] = b.split("/");
    if (!aPrefix || !bPrefix) return false;
    const aInt = ipToInt(aAddr);
    const bInt = ipToInt(bAddr);
    if (aInt === null || bInt === null) return false;
    const prefixA = parseInt(aPrefix);
    const prefixB = parseInt(bPrefix);
    if (isNaN(prefixA) || isNaN(prefixB)) return false;
    const maskA = prefixA === 0 ? 0 : (~0 << (32 - prefixA)) >>> 0;
    const maskB = prefixB === 0 ? 0 : (~0 << (32 - prefixB)) >>> 0;
    return (aInt & maskA) === (bInt & maskB) || (bInt & maskB) === (aInt & maskA);
  } catch {
    return false;
  }
}

function ipToInt(ip: string): number | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  const nums = parts.map(p => parseInt(p));
  if (nums.some(isNaN) || nums.some(n => n < 0 || n > 255)) return null;
  return ((nums[0] << 24) | (nums[1] << 16) | (nums[2] << 8) | nums[3]) >>> 0;
}
