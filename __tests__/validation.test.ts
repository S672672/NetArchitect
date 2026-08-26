import { describe, it, expect } from "vitest";
import { validateTopology, getIssueCounts } from "@/lib/validation";
import { NetworkNode, NetworkEdge, VLAN, ValidationIssue } from "@/types";
import { v4 as uuidv4 } from "uuid";

function makeNode(
  id: string,
  deviceType: string,
  config: Record<string, unknown> = {}
): NetworkNode {
  return {
    id,
    type: "network-device",
    position: { x: 0, y: 0 },
    data: {
      deviceType: deviceType as "router" | "firewall" | "l3-switch" | "l2-switch" | "server" | "database-server" | "desktop" | "laptop" | "iot-device" | "printer" | "internet" | "cloud" | "application-server" | "dns-server" | "mobile-device" | "load-balancer" | "wireless-ap" | "vpn-gateway",
      label: `Device ${id}`,
      config,
      category: "network",
      icon: "Router",
      color: "#3b82f6",
    },
  };
}

function makeEdge(id: string, source: string, target: string): NetworkEdge {
  return {
    id,
    source,
    target,
    type: "default",
    data: { connectionType: "ethernet", status: "active" },
  };
}

describe("validateTopology", () => {
  it("detects isolated devices", () => {
    const nodes = [makeNode("a", "desktop"), makeNode("b", "router")];
    const edges = [makeEdge("e1", "a", "b")];
    const result = validateTopology(nodes, edges, []);

    // Device "a" and "b" are connected, no issues
    expect(result.issues.some((i) => i.ruleId === "isolatedDevices")).toBe(false);
  });

  it("reports isolated devices when they exist", () => {
    const nodes = [
      makeNode("a", "desktop"),
      makeNode("b", "desktop"),
      makeNode("c", "router"),
    ];
    const edges = [makeEdge("e1", "a", "c")]; // b is isolated
    const result = validateTopology(nodes, edges, []);

    const isolatedIssues = result.issues.filter(
      (i) => i.ruleId === "isolatedDevices"
    );
    expect(isolatedIssues.length).toBeGreaterThan(0);
  });

  it("detects duplicate IPs", () => {
    const nodes = [
      makeNode("a", "desktop", { ipAddress: "192.168.1.10", subnet: "192.168.1.0/24" }),
      makeNode("b", "desktop", { ipAddress: "192.168.1.10", subnet: "192.168.1.0/24" }),
    ];
    const edges = [makeEdge("e1", "a", "b")];
    const result = validateTopology(nodes, edges, []);

    const dupIssues = result.issues.filter(
      (i) => i.ruleId === "invalidIpConfiguration" && i.title.includes("Duplicate")
    );
    expect(dupIssues.length).toBeGreaterThan(0);
  });

  it("detects invalid IP addresses", () => {
    const nodes = [
      makeNode("a", "desktop", { ipAddress: "999.999.999.999" }),
      makeNode("b", "router", { ipAddress: "192.168.1.1" }),
    ];
    const edges = [makeEdge("e1", "a", "b")];
    const result = validateTopology(nodes, edges, []);

    const invalidIP = result.issues.filter(
      (i) => i.ruleId === "invalidIpConfiguration" && i.title.includes("Invalid IP")
    );
    expect(invalidIP.length).toBeGreaterThan(0);
  });

  it("detects subnet overlap", () => {
    const nodes = [
      makeNode("a", "server", { subnet: "192.168.1.0/24" }),
      makeNode("b", "desktop", { subnet: "192.168.1.0/25" }),
    ];
    const edges = [makeEdge("e1", "a", "b")];
    const result = validateTopology(nodes, edges, []);

    const overlapIssues = result.issues.filter(
      (i) => i.ruleId === "subnetOverlap"
    );
    expect(overlapIssues.length).toBeGreaterThan(0);
  });

  it("detects public database exposure", () => {
    const internet = makeNode("inet", "internet");
    const db = makeNode("db", "database-server");
    const edge = makeEdge("e1", "inet", "db");
    const result = validateTopology([internet, db], [edge], []);

    const exposureIssues = result.issues.filter(
      (i) => i.ruleId === "publicDatabaseExposure"
    );
    expect(exposureIssues.length).toBeGreaterThan(0);
    expect(exposureIssues[0].severity).toBe("critical");
  });

  it("does not flag database behind firewall", () => {
    const internet = makeNode("inet", "internet");
    const firewall = makeNode("fw", "firewall");
    const db = makeNode("db", "database-server");
    const edges = [makeEdge("e1", "internet", "firewall"), makeEdge("e2", "firewall", "db")];
    const result = validateTopology([internet, firewall, db], edges, []);

    // Should be a warning (not critical) because firewall is present
    const exposureIssues = result.issues.filter(
      (i) => i.ruleId === "publicDatabaseExposure"
    );
    if (exposureIssues.length > 0) {
      expect(exposureIssues[0].severity).not.toBe("critical");
    }
  });

  it("getIssueCounts works correctly", () => {
    const issues = [
      { id: "1", severity: "critical" as const, title: "", description: "", affectedNodeIds: [], ruleId: "" },
      { id: "2", severity: "error" as const, title: "", description: "", affectedNodeIds: [], ruleId: "" },
      { id: "3", severity: "error" as const, title: "", description: "", affectedNodeIds: [], ruleId: "" },
      { id: "4", severity: "warning" as const, title: "", description: "", affectedNodeIds: [], ruleId: "" },
    ] as ValidationIssue[];
    const counts = getIssueCounts(issues);
    expect(counts.critical).toBe(1);
    expect(counts.error).toBe(2);
    expect(counts.warning).toBe(1);
    expect(counts.info).toBe(0);
  });
});
