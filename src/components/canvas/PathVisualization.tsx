"use client";

import { useState, useMemo } from "react";
import { useTopologyStore } from "@/stores/topologyStore";
import { useUIStore } from "@/stores/uiStore";
import { shortestPath, buildGraph } from "@/lib/graph/algorithms";
import { X, ArrowDown } from "lucide-react";

export function PathVisualization() {
  const { nodes, edges } = useTopologyStore();
  const { setHighlightedPath, setShowPathVisualization } = useUIStore();
  const [sourceId, setSourceId] = useState<string>("");
  const [targetId, setTargetId] = useState<string>("");
  const [foundPath, setFoundPath] = useState<string[] | null>(null);
  const [noPath, setNoPath] = useState(false);

  const externalNodes = useMemo(
    () => nodes.filter((n) => n.data.deviceType === "internet" || n.data.deviceType === "cloud"),
    [nodes]
  );

  const allNodes = useMemo(() => {
    return [...externalNodes, ...nodes.filter((n) => n.data.deviceType !== "internet" && n.data.deviceType !== "cloud")];
  }, [nodes, externalNodes]);

  const handleFindPath = () => {
    if (!sourceId || !targetId) return;

    const graph = buildGraph(nodes, edges);
    const path = shortestPath(graph, sourceId, targetId);

    if (path) {
      setFoundPath(path);
      setNoPath(false);

      // Find edge IDs along the path
      const edgeIds: string[] = [];
      for (let i = 0; i < path.length - 1; i++) {
        const edge = edges.find(
          (e) =>
            (e.source === path[i] && e.target === path[i + 1]) ||
            (e.source === path[i + 1] && e.target === path[i])
        );
        if (edge) edgeIds.push(edge.id);
      }
      setHighlightedPath([...path, ...edgeIds]);
    } else {
      setFoundPath(null);
      setNoPath(true);
      setHighlightedPath([]);
    }
  };

  const handleClear = () => {
    setSourceId("");
    setTargetId("");
    setFoundPath(null);
    setNoPath(false);
    setShowPathVisualization(false);
    setHighlightedPath([]);
  };

  const handleClose = () => {
    handleClear();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold">Traffic Flow Analysis</h3>
        <button onClick={handleClose} className="text-muted-foreground hover:text-foreground">
          <X size={14} />
        </button>
      </div>

      <div>
        <label className="text-[11px] text-muted-foreground mb-0.5 block">Source</label>
        <select
          value={sourceId}
          onChange={(e) => setSourceId(e.target.value)}
          className="w-full px-2 py-1.5 text-xs border border-border rounded-md bg-background focus:outline-none"
        >
          <option value="">Select source...</option>
          {allNodes.map((n) => (
            <option key={n.id} value={n.id}>
              {n.data.label} ({n.data.deviceType})
            </option>
          ))}
        </select>
      </div>

      <div className="flex justify-center">
        <ArrowDown size={14} className="text-muted-foreground" />
      </div>

      <div>
        <label className="text-[11px] text-muted-foreground mb-0.5 block">Destination</label>
        <select
          value={targetId}
          onChange={(e) => setTargetId(e.target.value)}
          className="w-full px-2 py-1.5 text-xs border border-border rounded-md bg-background focus:outline-none"
        >
          <option value="">Select destination...</option>
          {allNodes.map((n) => (
            <option key={n.id} value={n.id}>
              {n.data.label} ({n.data.deviceType})
            </option>
          ))}
        </select>
      </div>

      <button
        onClick={handleFindPath}
        disabled={!sourceId || !targetId || sourceId === targetId}
        className="w-full px-3 py-1.5 text-xs font-medium bg-foreground text-background rounded-md hover:opacity-90 disabled:opacity-50 transition-opacity"
      >
        Find Path
      </button>

      {noPath && (
        <p className="text-[11px] text-red-500 text-center">
          No path found between selected devices
        </p>
      )}

      {foundPath && (
        <div className="space-y-1">
          <p className="text-[11px] text-green-500 font-medium">
            Path found ({foundPath.length} hops)
          </p>
          <div className="text-[10px] text-muted-foreground font-mono bg-muted rounded-md p-2">
            {foundPath.map((nodeId, i) => {
              const node = nodes.find((n) => n.id === nodeId);
              return (
                <span key={nodeId}>
                  {node?.data.label || nodeId}
                  {i < foundPath.length - 1 && " → "}
                </span>
              );
            })}
          </div>
        </div>
      )}

      <p className="text-[10px] text-muted-foreground/70 text-center">
        Shows shortest path through the network topology
      </p>
    </div>
  );
}
