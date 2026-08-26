import { describe, it, expect } from "vitest";
import { simulateFailure } from "@/lib/analysis/failureSimulation";
import { NetworkNode, NetworkEdge, VLAN } from "@/types";
import { v4 as uuidv4 } from "uuid";

function makeNode(type: string, name: string): NetworkNode {
  return {
    id: uuidv4(),
    type: "network-device",
    position: { x: 0, y: 0 },
    data: {
      deviceType: type as any,
      label: name,
      config: {},
      category: "network",
      icon: "Network",
      color: "#000",
    },
  };
}

function makeEdge(source: NetworkNode, target: NetworkNode): NetworkEdge {
  return {
    id: uuidv4(),
    source: source.id,
    target: target.id,
    type: "default",
    data: { connectionType: "ethernet", status: "active" },
  };
}

describe("Failure Simulation", () => {
  // Internet → Firewall → Switch → { Server, Desktop }
  const internet = makeNode("internet", "Internet");
  const firewall = makeNode("firewall", "Firewall");
  const coreSwitch = makeNode("l3-switch", "Core Switch");
  const server = makeNode("server", "Server");
  const desktop = makeNode("desktop", "Desktop");
  const printer = makeNode("printer", "Printer");

  const nodes = [internet, firewall, coreSwitch, server, desktop, printer];
  const edges = [
    makeEdge(internet, firewall),
    makeEdge(firewall, coreSwitch),
    makeEdge(coreSwitch, server),
    makeEdge(coreSwitch, desktop),
    makeEdge(coreSwitch, printer),
  ];
  const vlans: VLAN[] = [];

  it("should detect firewall failure as high or critical impact", () => {
    const result = simulateFailure(nodes, edges, vlans, [firewall.id], []);
    expect(["critical", "high"]).toContain(result.impactLevel);
    expect(result.unreachableCount).toBeGreaterThan(0);
    expect(result.failedNodeIds).toContain(firewall.id);
  });

  it("should detect core switch failure as high impact", () => {
    const result = simulateFailure(nodes, edges, vlans, [coreSwitch.id], []);
    expect(result.impactLevel).toBe("high");
    expect(result.unreachableCount).toBeGreaterThan(0);
    expect(result.reachableCount).toBeGreaterThan(0);
  });

  it("should detect printer failure as low impact", () => {
    const result = simulateFailure(nodes, edges, vlans, [printer.id], []);
    expect(result.impactLevel).toBe("low");
  });

  it("should detect edge failure", () => {
    const edgeToFw = edges.find(e =>
      (e.source === internet.id && e.target === firewall.id) ||
      (e.source === firewall.id && e.target === internet.id)
    )!;
    const result = simulateFailure(nodes, edges, vlans, [], [edgeToFw.id]);
    expect(result.failedEdgeIds).toContain(edgeToFw.id);
    expect(result.impactLevel).toBeDefined();
  });

  it("should handle multiple device failures", () => {
    const result = simulateFailure(nodes, edges, vlans, [coreSwitch.id, printer.id], []);
    expect(result.failedNodeIds.length).toBe(2);
    expect(result.unreachableCount).toBeGreaterThan(0);
  });

  it("should maintain original topology unchanged", () => {
    const originalNodeCount = nodes.length;
    const originalEdgeCount = edges.length;
    simulateFailure(nodes, edges, vlans, [firewall.id], []);
    expect(nodes.length).toBe(originalNodeCount);
    expect(edges.length).toBe(originalEdgeCount);
  });

  it("should calculate connectivity ratio", () => {
    const result = simulateFailure(nodes, edges, vlans, [coreSwitch.id], []);
    expect(result.connectivityRatio).toBeGreaterThanOrEqual(0);
    expect(result.connectivityRatio).toBeLessThanOrEqual(1);
  });

  it("should identify affected services", () => {
    const appServer = makeNode("application-server", "App Server");
    const nodesWithApp = [...nodes, appServer];
    const edgesWithApp = [...edges, makeEdge(coreSwitch, appServer)];
    const result = simulateFailure(nodesWithApp, edgesWithApp, vlans, [coreSwitch.id], []);
    expect(result.affectedServices.length).toBeGreaterThan(0);
  });

  it("should generate a recommendation", () => {
    const result = simulateFailure(nodes, edges, vlans, [coreSwitch.id], []);
    expect(result.recommendation).toBeTruthy();
    expect(result.recommendation.length).toBeGreaterThan(0);
  });

  it("should produce a valid result ID", () => {
    const result = simulateFailure(nodes, edges, vlans, [coreSwitch.id], []);
    expect(result.id).toBeTruthy();
    expect(result.id.startsWith("sim-")).toBe(true);
  });
});
