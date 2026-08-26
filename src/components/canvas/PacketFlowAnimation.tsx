"use client";

/**
 * Animated Packet Flow Visualization
 * Renders animated dots flowing along edges to simulate packet traversal
 */
import { useEffect, useRef, useState, useCallback } from "react";
import { useReactFlow } from "@xyflow/react";
import { useTopologyStore } from "@/stores/topologyStore";
import { useUIStore } from "@/stores/uiStore";
import { NetworkNode, NetworkEdge } from "@/types";

interface PacketDot {
  id: string;
  edgeId: string;
  progress: number; // 0 to 1
  speed: number;
  color: string;
  size: number;
}

interface FlowPath {
  nodeIds: string[];
  edgeIds: string[];
  color: string;
  label: string;
  packetsPerSecond: number;
}

export function PacketFlowAnimation() {
  const { nodes, edges } = useTopologyStore();
  const { showPathVisualization } = useUIStore();
  const { getNodes, getEdges } = useReactFlow();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number>(0);
  const packetsRef = useRef<PacketDot[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const [speed, setSpeed] = useState(1);

  // Predefined traffic flows
  const flows: FlowPath[] = [
    {
      nodeIds: findPath("internet", "firewall"),
      edgeIds: findEdgePath("internet", "firewall"),
      color: "#3b82f6",
      label: "Internet → Firewall",
      packetsPerSecond: 3,
    },
    {
      nodeIds: findPath("firewall", "l2-switch"),
      edgeIds: findEdgePath("firewall", "l2-switch"),
      color: "#22c55e",
      label: "Firewall → Switch",
      packetsPerSecond: 2,
    },
    {
      nodeIds: findPath("l2-switch", "server"),
      edgeIds: findEdgePath("l2-switch", "server"),
      color: "#f59e0b",
      label: "Switch → Server",
      packetsPerSecond: 1,
    },
  ];

  function findPath(fromType: string, toType: string): string[] {
    const fromNode = nodes.find((n) => n.data.deviceType === fromType);
    const toNode = nodes.find((n) => n.data.deviceType === toType);
    if (!fromNode || !toNode) return [];

    // BFS
    const adj = new Map<string, string[]>();
    for (const n of nodes) adj.set(n.id, []);
    for (const e of edges) {
      adj.get(e.source)?.push(e.target);
      adj.get(e.target)?.push(e.source);
    }

    const visited = new Set<string>();
    const queue: { id: string; path: string[] }[] = [{ id: fromNode.id, path: [fromNode.id] }];
    visited.add(fromNode.id);

    while (queue.length > 0) {
      const { id, path } = queue.shift()!;
      if (id === toNode.id) return path;

      for (const neighbor of adj.get(id) || []) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push({ id: neighbor, path: [...path, neighbor] });
        }
      }
    }
    return [];
  }

  function findEdgePath(fromType: string, toType: string): string[] {
    const path = findPath(fromType, toType);
    const edgeIds: string[] = [];
    for (let i = 0; i < path.length - 1; i++) {
      const edge = edges.find(
        (e) =>
          (e.source === path[i] && e.target === path[i + 1]) ||
          (e.source === path[i + 1] && e.target === path[i])
      );
      if (edge) edgeIds.push(edge.id);
    }
    return edgeIds;
  }

  const startAnimation = useCallback(() => {
    setIsAnimating(true);
  }, []);

  const stopAnimation = useCallback(() => {
    setIsAnimating(false);
    packetsRef.current = [];
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }, []);

  // Animation loop
  useEffect(() => {
    if (!isAnimating || !showPathVisualization) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;

    const resize = () => {
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight;
    };
    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(parent);

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let lastSpawn = 0;

    const animate = (timestamp: number) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Spawn new packets
      if (timestamp - lastSpawn > 500 / speed) {
        lastSpawn = timestamp;
        for (const flow of flows) {
          if (flow.edgeIds.length === 0) continue;
          if (Math.random() < flow.packetsPerSecond / 30) {
            packetsRef.current.push({
              id: `${flow.edgeIds[0]}-${Date.now()}-${Math.random()}`,
              edgeId: flow.edgeIds[0],
              progress: 0,
              speed: 0.008 * speed + Math.random() * 0.004,
              color: flow.color,
              size: 3 + Math.random() * 2,
            });
          }
        }
      }

      // Get edge positions from React Flow
      const rfNodes = getNodes();
      const rfEdges = getEdges();

      // Update and draw packets
      packetsRef.current = packetsRef.current.filter((pkt) => {
        pkt.progress += pkt.speed;
        if (pkt.progress > 1) return false;

        const edge = rfEdges.find((e) => e.id === pkt.edgeId);
        if (!edge) return false;

        const srcNode = rfNodes.find((n) => n.id === edge.source);
        const tgtNode = rfNodes.find((n) => n.id === edge.target);
        if (!srcNode || !tgtNode) return false;

        // Convert React Flow positions to canvas coordinates
        const x = srcNode.position.x + (tgtNode.position.x - srcNode.position.x) * pkt.progress;
        const y = srcNode.position.y + (tgtNode.position.y - srcNode.position.y) * pkt.progress + 25; // offset for node height

        // Glow
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, pkt.size * 3);
        gradient.addColorStop(0, pkt.color + "80");
        gradient.addColorStop(1, pkt.color + "00");
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, pkt.size * 3, 0, Math.PI * 2);
        ctx.fill();

        // Core dot
        ctx.fillStyle = pkt.color;
        ctx.beginPath();
        ctx.arc(x, y, pkt.size, 0, Math.PI * 2);
        ctx.fill();

        return true;
      });

      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      resizeObserver.disconnect();
    };
  }, [isAnimating, showPathVisualization, flows, getNodes, getEdges, speed]);

  return (
    <div className="absolute inset-0 pointer-events-none z-[5]">
      <canvas ref={canvasRef} className="absolute inset-0" />
      {showPathVisualization && (
        <div className="absolute top-3 right-3 pointer-events-auto z-10">
          <div className="bg-card/90 backdrop-blur border border-border rounded-lg shadow-lg p-3 space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-2 h-2 rounded-full ${isAnimating ? "bg-green-500 animate-pulse" : "bg-gray-400"}`} />
              <span className="text-xs font-medium">Packet Flow</span>
            </div>

            {!isAnimating ? (
              <button
                onClick={startAnimation}
                className="w-full text-xs px-3 py-1.5 bg-foreground text-background rounded font-medium hover:opacity-90 transition-opacity"
              >
                ▶ Start Simulation
              </button>
            ) : (
              <button
                onClick={stopAnimation}
                className="w-full text-xs px-3 py-1.5 border border-border rounded font-medium hover:bg-muted transition-colors"
              >
                ■ Stop
              </button>
            )}

            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground">Speed</span>
              <input
                type="range"
                min="0.5"
                max="3"
                step="0.5"
                value={speed}
                onChange={(e) => setSpeed(parseFloat(e.target.value))}
                className="flex-1 h-1"
              />
              <span className="text-[10px] text-muted-foreground w-6">{speed}x</span>
            </div>

            <div className="space-y-1 mt-1">
              {flows
                .filter((f) => f.edgeIds.length > 0)
                .map((flow, i) => (
                  <div key={i} className="flex items-center gap-2 text-[10px]">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: flow.color }} />
                    <span className="text-muted-foreground truncate">{flow.label}</span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
