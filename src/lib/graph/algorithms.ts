/**
 * Graph algorithms for network topology analysis
 */
import { NetworkNode, NetworkEdge } from "@/types";

export interface Graph {
  adjacency: Map<string, Set<string>>;
  nodeIds: string[];
  edgeMap: Map<string, { source: string; target: string }>;
}

export function buildGraph(nodes: NetworkNode[], edges: NetworkEdge[]): Graph {
  const adjacency = new Map<string, Set<string>>();
  const edgeMap = new Map<string, { source: string; target: string }>();

  for (const node of nodes) {
    if (!adjacency.has(node.id)) {
      adjacency.set(node.id, new Set());
    }
  }

  for (const edge of edges) {
    const source = edge.source;
    const target = edge.target;

    if (!adjacency.has(source)) adjacency.set(source, new Set());
    if (!adjacency.has(target)) adjacency.set(target, new Set());

    adjacency.get(source)!.add(target);
    adjacency.get(target)!.add(source);
    edgeMap.set(edge.id, { source, target });
  }

  return {
    adjacency,
    nodeIds: nodes.map((n) => n.id),
    edgeMap,
  };
}

/** BFS from a starting node, returns all reachable nodes */
export function bfs(graph: Graph, startId: string): Set<string> {
  const visited = new Set<string>();
  const queue = [startId];
  visited.add(startId);

  while (queue.length > 0) {
    const current = queue.shift()!;
    const neighbors = graph.adjacency.get(current);
    if (!neighbors) continue;

    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push(neighbor);
      }
    }
  }

  return visited;
}

/** Find shortest path between two nodes using BFS */
export function shortestPath(
  graph: Graph,
  startId: string,
  endId: string
): string[] | null {
  if (startId === endId) return [startId];
  if (!graph.adjacency.has(startId) || !graph.adjacency.has(endId)) return null;

  const visited = new Set<string>();
  const parent = new Map<string, string>();
  const queue = [startId];
  visited.add(startId);

  while (queue.length > 0) {
    const current = queue.shift()!;
    const neighbors = graph.adjacency.get(current);
    if (!neighbors) continue;

    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        parent.set(neighbor, current);
        if (neighbor === endId) {
          // Reconstruct path
          const path: string[] = [endId];
          let currentParent = endId;
          while (parent.has(currentParent)) {
            currentParent = parent.get(currentParent)!;
            path.unshift(currentParent);
          }
          return path;
        }
        queue.push(neighbor);
      }
    }
  }

  return null;
}

/** Find all paths between two nodes using DFS */
export function findAllPaths(
  graph: Graph,
  startId: string,
  endId: string,
  maxPaths: number = 10
): string[][] {
  const paths: string[][] = [];
  const visited = new Set<string>();

  function dfs(current: string, path: string[]) {
    if (paths.length >= maxPaths) return;
    if (current === endId) {
      paths.push([...path]);
      return;
    }

    const neighbors = graph.adjacency.get(current);
    if (!neighbors) return;

    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        path.push(neighbor);
        dfs(neighbor, path);
        path.pop();
        visited.delete(neighbor);
      }
    }
  }

  visited.add(startId);
  dfs(startId, [startId]);
  return paths;
}

/**
 * Find articulation points (cut vertices) in the graph.
 * Removing an articulation point disconnects the graph.
 */
export function findArticulationPoints(graph: Graph): string[] {
  const articulationPoints: string[] = [];
  const visited = new Set<string>();
  const discovery = new Map<string, number>();
  const low = new Map<string, number>();
  const parent = new Map<string, string | null>();
  let timer = 0;

  function dfs(u: string) {
    visited.add(u);
    discovery.set(u, timer);
    low.set(u, timer);
    timer++;

    let children = 0;
    const neighbors = graph.adjacency.get(u);
    if (!neighbors) return;

    for (const v of neighbors) {
      if (!visited.has(v)) {
        children++;
        parent.set(v, u);
        dfs(v);

        // Check if u is an articulation point
        const lowV = low.get(v) ?? 0;
        const lowU = low.get(u) ?? 0;
        const discU = discovery.get(u) ?? 0;
        const parentU = parent.get(u);

        if (parentU === null && children > 1) {
          articulationPoints.push(u);
        }
        if (parentU !== null && parentU !== null && lowV >= discU) {
          if (!articulationPoints.includes(u)) {
            articulationPoints.push(u);
          }
        }
        low.set(u, Math.min(lowU, lowV));
      } else {
        const discV = discovery.get(v) ?? 0;
        low.set(u, Math.min(low.get(u) ?? 0, discV));
      }
    }
  }

  // Run DFS on all connected components
  for (const nodeId of graph.nodeIds) {
    if (!visited.has(nodeId)) {
      parent.set(nodeId, null);
      dfs(nodeId);
    }
  }

  return articulationPoints;
}

/**
 * Check if removing a specific node disconnects the graph
 */
export function isNodeCritical(graph: Graph, nodeId: string): boolean {
  const remainingNodes = graph.nodeIds.filter((id) => id !== nodeId);
  if (remainingNodes.length === 0) return false;

  // Build subgraph without the node
  const subAdjacency = new Map<string, Set<string>>();
  for (const id of remainingNodes) {
    subAdjacency.set(id, new Set());
  }

  for (const [node, neighbors] of graph.adjacency) {
    if (node === nodeId) continue;
    for (const neighbor of neighbors) {
      if (neighbor === nodeId) continue;
      if (subAdjacency.has(node) && subAdjacency.has(neighbor)) {
        subAdjacency.get(node)!.add(neighbor);
      }
    }
  }

  const subGraph: Graph = {
    adjacency: subAdjacency,
    nodeIds: remainingNodes,
    edgeMap: new Map(),
  };

  // BFS from first remaining node
  if (remainingNodes.length === 0) return false;
  const reachable = bfs(subGraph, remainingNodes[0]);
  return reachable.size < remainingNodes.length;
}

/**
 * Count connected components in the graph
 */
export function countConnectedComponents(graph: Graph): number {
  const visited = new Set<string>();
  let components = 0;

  for (const nodeId of graph.nodeIds) {
    if (!visited.has(nodeId)) {
      const reachable = bfs(graph, nodeId);
      for (const id of reachable) {
        visited.add(id);
      }
      components++;
    }
  }

  return components;
}

/**
 * Get all nodes connected to a given node (directly)
 */
export function getDirectNeighbors(graph: Graph, nodeId: string): string[] {
  const neighbors = graph.adjacency.get(nodeId);
  return neighbors ? Array.from(neighbors) : [];
}

/**
 * Get the degree of a node
 */
export function getDegree(graph: Graph, nodeId: string): number {
  const neighbors = graph.adjacency.get(nodeId);
  return neighbors ? neighbors.size : 0;
}
