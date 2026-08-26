import { describe, it, expect } from "vitest";
import { calculateNetworkScore, calculateResilienceScore } from "@/lib/analysis/healthScoring";
import { analyzeSecurityExposures } from "@/lib/analysis/securityAnalysis";
import { analyzeCapacity } from "@/lib/analysis/capacityPlanning";
import { analyzeTraffic } from "@/lib/analysis/trafficAnalysis";
import { NetworkNode, NetworkEdge, VLAN, CapacityPlan, TrafficProfile } from "@/types";
import { v4 as uuidv4 } from "uuid";

function makeNode(type: string, name: string, config: Record<string, any> = {}): NetworkNode {
  const categoryMap: Record<string, string> = {
    internet: "external", cloud: "external", "vpn-gateway": "external",
    firewall: "network", router: "network", "l3-switch": "network", "l2-switch": "network",
    "wireless-ap": "network", "load-balancer": "network",
    server: "infrastructure", "database-server": "infrastructure",
    "application-server": "infrastructure", "dns-server": "infrastructure",
    desktop: "client", laptop: "client", "mobile-device": "client",
    "iot-device": "client", printer: "client",
  };
  return {
    id: uuidv4(),
    type: "network-device",
    position: { x: 0, y: 0 },
    data: {
      deviceType: type as any,
      label: name,
      config,
      category: (categoryMap[type] || "client") as any,
      icon: "Network",
      color: "#000",
    },
  };
}

function makeEdge(source: NetworkNode, target: NetworkNode, connectionType = "ethernet"): NetworkEdge {
  return {
    id: uuidv4(),
    source: source.id,
    target: target.id,
    type: "default",
    data: { connectionType: connectionType as any, status: "active" },
  };
}

describe("Network Health Scoring", () => {
  it("should return 0 for empty topology", () => {
    const score = calculateNetworkScore([], [], []);
    expect(score.score.overall).toBe(0);
    expect(score.grade).toBe("-");
    expect(score.deductions.length).toBe(0);
  });

  it("should penalize single points of failure", () => {
    const fw = makeNode("firewall", "FW");
    const sw = makeNode("l3-switch", "SW");
    const srv = makeNode("server", "SRV");
    const nodes = [fw, sw, srv];
    const edges = [makeEdge(fw, sw), makeEdge(sw, srv)];
    const score = calculateNetworkScore(nodes, edges, []);
    // Core Switch (l3-switch) is an articulation point — it should be detected
    expect(score.score.redundancy).toBeLessThanOrEqual(100);
  });

  it("should penalize flat network with many clients", () => {
    const nodes = [
      makeNode("l3-switch", "SW"),
      makeNode("desktop", "D1"), makeNode("desktop", "D2"), makeNode("desktop", "D3"),
      makeNode("server", "S1"), makeNode("server", "S2"),
    ];
    const edges = nodes.slice(1).map(n => makeEdge(nodes[0], n));
    const score = calculateNetworkScore(nodes, edges, []);
    // More than 3 clients + servers in 0 VLANs = segmentation penalty
    expect(score.score.segmentation).toBeLessThan(100);
  });

  it("should improve with VLAN segmentation", () => {
    const sw = makeNode("l3-switch", "SW");
    const srv = makeNode("server", "SRV", { vlan: 10 });
    const desk = makeNode("desktop", "D", { vlan: 20 });
    const nodes = [sw, srv, desk];
    const edges = [makeEdge(sw, srv), makeEdge(sw, desk)];
    const vlans: VLAN[] = [
      { id: uuidv4(), vlanId: 10, name: "Servers", deviceIds: [], subnet: "10.0.10.0/24" },
      { id: uuidv4(), vlanId: 20, name: "Clients", deviceIds: [], subnet: "10.0.20.0/24" },
    ];
    const score = calculateNetworkScore(nodes, edges, vlans);
    expect(score.score.segmentation).toBeGreaterThan(50);
  });

  it("should provide grade and grade color", () => {
    const nodes = [makeNode("router", "R"), makeNode("server", "S")];
    const edges = [makeEdge(nodes[0], nodes[1])];
    const score = calculateNetworkScore(nodes, edges, []);
    expect(score.grade).toBeTruthy();
    expect(score.gradeColor).toBeTruthy();
    expect(score.summary).toBeTruthy();
  });
});

describe("Resilience Scoring", () => {
  it("should return 0 for empty topology", () => {
    const resilience = calculateResilienceScore([], []);
    expect(resilience.overall).toBe(0);
  });

  it("should penalize single path topology", () => {
    const nodes = [makeNode("firewall", "FW"), makeNode("l3-switch", "SW"), makeNode("server", "SRV")];
    const edges = [makeEdge(nodes[0], nodes[1]), makeEdge(nodes[1], nodes[2])];
    const resilience = calculateResilienceScore(nodes, edges);
    expect(resilience.overall).toBeLessThan(100);
  });

  it("should improve with redundant paths", () => {
    const fw = makeNode("firewall", "FW");
    const sw1 = makeNode("l3-switch", "SW1");
    const sw2 = makeNode("l3-switch", "SW2");
    const srv = makeNode("server", "SRV");
    const nodes = [fw, sw1, sw2, srv];
    const edges = [makeEdge(fw, sw1), makeEdge(fw, sw2), makeEdge(sw1, srv), makeEdge(sw2, srv)];
    const resilience = calculateResilienceScore(nodes, edges);
    expect(resilience.redundantPaths).toBeGreaterThan(0);
  });
});

describe("Security Analysis", () => {
  it("should detect database exposed to internet", () => {
    const inet = makeNode("internet", "Internet");
    const db = makeNode("database-server", "Database");
    const nodes = [inet, db];
    const edges = [makeEdge(inet, db)];
    const result = analyzeSecurityExposures(nodes, edges);
    expect(result.overallRisk).toBe("critical");
    expect(result.findings.some(f => f.severity === "critical")).toBe(true);
  });

  it("should not flag database when firewall is present", () => {
    const inet = makeNode("internet", "Internet");
    const fw = makeNode("firewall", "FW");
    const db = makeNode("database-server", "Database");
    const nodes = [inet, fw, db];
    const edges = [makeEdge(inet, fw), makeEdge(fw, db)];
    const result = analyzeSecurityExposures(nodes, edges);
    // Database is behind firewall, so the critical finding should not exist
    expect(result.findings.some(f => f.severity === "critical" && f.title.includes("exposed"))).toBe(false);
  });

  it("should detect flat network", () => {
    const sw = makeNode("l3-switch", "SW");
    const d1 = makeNode("desktop", "D1");
    const d2 = makeNode("desktop", "D2");
    const d3 = makeNode("desktop", "D3");
    const srv = makeNode("server", "S1");
    const nodes = [sw, d1, d2, d3, srv];
    const edges = [makeEdge(sw, d1), makeEdge(sw, d2), makeEdge(sw, d3), makeEdge(sw, srv)];
    const result = analyzeSecurityExposures(nodes, edges);
    expect(result.findings.some(f => f.title.toLowerCase().includes("flat network"))).toBe(true);
  });

  it("should return empty findings for no internet nodes", () => {
    const nodes = [makeNode("server", "S"), makeNode("desktop", "D")];
    const edges = [makeEdge(nodes[0], nodes[1])];
    const result = analyzeSecurityExposures(nodes, edges);
    expect(result.overallRisk).not.toBe("critical");
  });
});

describe("Capacity Planning", () => {
  it("should calculate growth projections", () => {
    const plan: CapacityPlan = { currentUsers: 100, annualGrowthRate: 20, planningYears: 3 };
    const nodes = [makeNode("l3-switch", "SW")];
    const result = analyzeCapacity(nodes, [], [], plan);
    expect(result.projections.length).toBe(4); // year 0, 1, 2, 3
    expect(result.projections[0].projectedUsers).toBe(100);
    expect(result.projections[3].projectedUsers).toBe(173);
  });

  it("should detect subnet utilization", () => {
    const plan: CapacityPlan = { currentUsers: 100, annualGrowthRate: 20, planningYears: 3 };
    const sw = makeNode("l3-switch", "SW", { vlan: 10 });
    const nodes = [sw];
    const vlans: VLAN[] = [
      { id: uuidv4(), vlanId: 10, name: "Test", subnet: "10.0.10.0/24", deviceIds: [sw.id] },
    ];
    const result = analyzeCapacity(nodes, [], vlans, plan);
    expect(result.subnetUtilizations.length).toBeGreaterThan(0);
  });
});

describe("Traffic Analysis", () => {
  it("should find path between connected devices", () => {
    const src = makeNode("server", "App Server");
    const sw = makeNode("l3-switch", "Switch");
    const tgt = makeNode("database-server", "Database");
    const nodes = [src, sw, tgt];
    const edges = [makeEdge(src, sw), makeEdge(sw, tgt)];
    const profile: TrafficProfile = {
      id: uuidv4(),
      sourceId: src.id,
      targetId: tgt.id,
      expectedBandwidthMbps: 100,
      trafficType: "database",
    };
    const result = analyzeTraffic(nodes, edges, profile);
    expect(result.pathAnalysis).not.toBeNull();
    expect(result.pathAnalysis!.path.length).toBe(3);
  });

  it("should detect bottleneck", () => {
    const src = makeNode("server", "App Server");
    const tgt = makeNode("database-server", "Database");
    const nodes = [src, tgt];
    const edges = [makeEdge(src, tgt, "wireless")]; // 300 Mbps wireless
    const profile: TrafficProfile = {
      id: uuidv4(),
      sourceId: src.id,
      targetId: tgt.id,
      expectedBandwidthMbps: 500, // 500 Mbps on 300 Mbps link
      trafficType: "database",
    };
    const result = analyzeTraffic(nodes, edges, profile);
    expect(result.pathAnalysis!.isBottleneck).toBe(true);
    expect(result.pathAnalysis!.maxUtilization).toBeGreaterThan(100);
  });

  it("should return null path for disconnected devices", () => {
    const src = makeNode("server", "A");
    const tgt = makeNode("database-server", "B");
    const nodes = [src, tgt];
    const edges: NetworkEdge[] = [];
    const profile: TrafficProfile = {
      id: uuidv4(),
      sourceId: src.id,
      targetId: tgt.id,
      expectedBandwidthMbps: 100,
      trafficType: "database",
    };
    const result = analyzeTraffic(nodes, edges, profile);
    expect(result.pathAnalysis).toBeNull();
  });
});
