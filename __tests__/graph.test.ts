import { describe, it, expect } from "vitest";
import {
  buildGraph,
  bfs,
  shortestPath,
  findAllPaths,
  findArticulationPoints,
  isNodeCritical,
  countConnectedComponents,
} from "@/lib/graph/algorithms";
import { NetworkNode, NetworkEdge } from "@/types";

function makeNode(id: string): NetworkNode {
  return {
    id,
    type: "network-device",
    position: { x: 0, y: 0 },
    data: {
      deviceType: "router",
      label: id,
      config: {},
      category: "network",
      icon: "Router",
      color: "#3b82f6",
    },
  };
}

function makeEdge(source: string, target: string): NetworkEdge {
  return {
    id: `${source}-${target}`,
    source,
    target,
    type: "default",
    data: { connectionType: "ethernet", status: "active" },
  };
}

describe("buildGraph", () => {
  it("builds adjacency correctly", () => {
    const nodes = [makeNode("A"), makeNode("B"), makeNode("C")];
    const edges = [makeEdge("A", "B"), makeEdge("B", "C")];
    const graph = buildGraph(nodes, edges);

    expect(graph.adjacency.get("A")).toEqual(new Set(["B"]));
    expect(graph.adjacency.get("B")).toEqual(new Set(["A", "C"]));
    expect(graph.adjacency.get("C")).toEqual(new Set(["B"]));
  });
});

describe("bfs", () => {
  it("finds all reachable nodes", () => {
    const nodes = [makeNode("A"), makeNode("B"), makeNode("C"), makeNode("D")];
    const edges = [makeEdge("A", "B"), makeEdge("B", "C")];
    const graph = buildGraph(nodes, edges);

    const reachable = bfs(graph, "A");
    expect(reachable).toEqual(new Set(["A", "B", "C"]));
    expect(reachable.has("D")).toBe(false);
  });

  it("returns just the start node if no connections", () => {
    const nodes = [makeNode("A"), makeNode("B")];
    const graph = buildGraph(nodes, []);

    const reachable = bfs(graph, "A");
    expect(reachable).toEqual(new Set(["A"]));
  });
});

describe("shortestPath", () => {
  it("finds shortest path", () => {
    const nodes = [makeNode("A"), makeNode("B"), makeNode("C"), makeNode("D")];
    const edges = [
      makeEdge("A", "B"),
      makeEdge("A", "C"),
      makeEdge("B", "D"),
      makeEdge("C", "D"),
    ];
    const graph = buildGraph(nodes, edges);

    const path = shortestPath(graph, "A", "D");
    expect(path).toBeTruthy();
    expect(path!.length).toBe(3); // A -> B -> D or A -> C -> D
    expect(path![0]).toBe("A");
    expect(path![path!.length - 1]).toBe("D");
  });

  it("returns null for unreachable nodes", () => {
    const nodes = [makeNode("A"), makeNode("B")];
    const graph = buildGraph(nodes, []);

    expect(shortestPath(graph, "A", "B")).toBeNull();
  });
});

describe("findAllPaths", () => {
  it("finds multiple paths", () => {
    const nodes = [makeNode("A"), makeNode("B"), makeNode("C"), makeNode("D")];
    const edges = [
      makeEdge("A", "B"),
      makeEdge("A", "C"),
      makeEdge("B", "D"),
      makeEdge("C", "D"),
    ];
    const graph = buildGraph(nodes, edges);

    const paths = findAllPaths(graph, "A", "D");
    expect(paths.length).toBe(2);
  });
});

describe("isNodeCritical", () => {
  it("detects critical nodes", () => {
    // A - B - C (B is a bridge)
    const nodes = [makeNode("A"), makeNode("B"), makeNode("C")];
    const edges = [makeEdge("A", "B"), makeEdge("B", "C")];
    const graph = buildGraph(nodes, edges);

    expect(isNodeCritical(graph, "B")).toBe(true);
    expect(isNodeCritical(graph, "A")).toBe(false);
    expect(isNodeCritical(graph, "C")).toBe(false);
  });

  it("detects non-critical in redundant topology", () => {
    // A - B - C, A - C (triangle, no single point of failure)
    const nodes = [makeNode("A"), makeNode("B"), makeNode("C")];
    const edges = [makeEdge("A", "B"), makeEdge("B", "C"), makeEdge("A", "C")];
    const graph = buildGraph(nodes, edges);

    expect(isNodeCritical(graph, "A")).toBe(false);
    expect(isNodeCritical(graph, "B")).toBe(false);
    expect(isNodeCritical(graph, "C")).toBe(false);
  });
});

describe("countConnectedComponents", () => {
  it("counts components", () => {
    const nodes = [makeNode("A"), makeNode("B"), makeNode("C"), makeNode("D")];
    const edges = [makeEdge("A", "B")];
    const graph = buildGraph(nodes, edges);

    expect(countConnectedComponents(graph)).toBe(3); // {A,B}, {C}, {D}
  });

  it("returns 1 for fully connected", () => {
    const nodes = [makeNode("A"), makeNode("B"), makeNode("C")];
    const edges = [makeEdge("A", "B"), makeEdge("B", "C")];
    const graph = buildGraph(nodes, edges);

    expect(countConnectedComponents(graph)).toBe(1);
  });
});
