"use client";

import { useState, useMemo } from "react";
import { AlertTriangle, Zap, X, ChevronDown, ArrowRight } from "lucide-react";
import { useTopologyStore } from "@/stores/topologyStore";
import { simulateFailure } from "@/lib/analysis/failureSimulation";
import { FailureSimulationResult, NetworkNode, DeviceType } from "@/types";
import { DEVICE_TYPES } from "@/lib/network/deviceTypes";

const IMPACT_COLORS: Record<string, string> = {
  low: "text-green-500 bg-green-500/10 border-green-500/20",
  medium: "text-yellow-500 bg-yellow-500/10 border-yellow-500/20",
  high: "text-orange-500 bg-orange-500/10 border-orange-500/20",
  critical: "text-red-500 bg-red-500/10 border-red-500/20",
};

export function FailureSimulationPanel({ onClose }: { onClose: () => void }) {
  const { nodes, edges, vlans } = useTopologyStore();
  const [failureType, setFailureType] = useState<"device" | "connection">("device");
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
  const [selectedEdgeIds, setSelectedEdgeIds] = useState<string[]>([]);
  const [result, setResult] = useState<FailureSimulationResult | null>(null);
  const [hasRun, setHasRun] = useState(false);

  const availableNodes = useMemo(() =>
    nodes.filter(n => n.data.deviceType !== "internet" && n.data.deviceType !== "cloud"),
    [nodes]
  );

  const runSimulation = () => {
    if (failureType === "device" && selectedNodeIds.length === 0) return;
    if (failureType === "connection" && selectedEdgeIds.length === 0) return;

    const simResult = simulateFailure(
      nodes, edges, vlans,
      failureType === "device" ? selectedNodeIds : [],
      failureType === "connection" ? selectedEdgeIds : []
    );
    setResult(simResult);
    setHasRun(true);
  };

  const toggleNode = (id: string) => {
    setSelectedNodeIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleEdge = (id: string) => {
    setSelectedEdgeIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const reset = () => {
    setResult(null);
    setHasRun(false);
    setSelectedNodeIds([]);
    setSelectedEdgeIds([]);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-orange-500" />
          <h3 className="text-sm font-semibold">Failure Simulation</h3>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-muted rounded transition-colors">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {!hasRun ? (
        <>
          {/* Failure Type */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-2 block">Select failure type</label>
            <div className="flex gap-2">
              <button
                onClick={() => setFailureType("device")}
                className={`flex-1 text-xs px-3 py-2 rounded border transition-colors ${
                  failureType === "device" ? "bg-foreground text-background" : "border-border hover:bg-muted"
                }`}
              >
                Device
              </button>
              <button
                onClick={() => setFailureType("connection")}
                className={`flex-1 text-xs px-3 py-2 rounded border transition-colors ${
                  failureType === "connection" ? "bg-foreground text-background" : "border-border hover:bg-muted"
                }`}
              >
                Connection
              </button>
            </div>
          </div>

          {/* Selection */}
          {failureType === "device" && (
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">Select device(s) to fail</label>
              <div className="max-h-48 overflow-y-auto space-y-0.5 border border-border rounded p-1">
                {availableNodes.map(node => {
                  const info = DEVICE_TYPES[node.data.deviceType];
                  return (
                    <button
                      key={node.id}
                      onClick={() => toggleNode(node.id)}
                      className={`w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded transition-colors text-left ${
                        selectedNodeIds.includes(node.id)
                          ? "bg-orange-500/10 text-orange-500 border border-orange-500/20"
                          : "hover:bg-muted"
                      }`}
                    >
                      <div className={`w-2 h-2 rounded-full ${selectedNodeIds.includes(node.id) ? "bg-orange-500" : "bg-muted-foreground/30"}`} />
                      <span className="truncate">{node.data.label}</span>
                      <span className="text-[10px] text-muted-foreground ml-auto shrink-0">{info?.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {failureType === "connection" && (
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">Select connection(s) to fail</label>
              <div className="max-h-48 overflow-y-auto space-y-0.5 border border-border rounded p-1">
                {edges.map(edge => {
                  const src = nodes.find(n => n.id === edge.source);
                  const tgt = nodes.find(n => n.id === edge.target);
                  return (
                    <button
                      key={edge.id}
                      onClick={() => toggleEdge(edge.id)}
                      className={`w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded transition-colors text-left ${
                        selectedEdgeIds.includes(edge.id)
                          ? "bg-orange-500/10 text-orange-500 border border-orange-500/20"
                          : "hover:bg-muted"
                      }`}
                    >
                      <div className={`w-2 h-2 rounded-full ${selectedEdgeIds.includes(edge.id) ? "bg-orange-500" : "bg-muted-foreground/30"}`} />
                      <span className="truncate">{src?.data.label} → {tgt?.data.label}</span>
                      <span className="text-[10px] text-muted-foreground ml-auto shrink-0">{edge.data?.connectionType}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <button
            onClick={runSimulation}
            disabled={(failureType === "device" ? selectedNodeIds : selectedEdgeIds).length === 0}
            className="w-full flex items-center justify-center gap-2 text-xs px-3 py-2 bg-orange-500 text-white rounded font-medium hover:bg-orange-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <Zap className="w-3.5 h-3.5" />
            Run Simulation
          </button>
        </>
      ) : result && (
        /* Results */
        <div className="space-y-3">
          {/* Impact Banner */}
          <div className={`px-3 py-2 rounded border text-xs font-medium ${IMPACT_COLORS[result.impactLevel]}`}>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span className="uppercase font-bold">{result.impactLevel} Impact</span>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-muted/50 rounded p-2 text-center">
              <div className="text-lg font-bold text-green-500">{result.reachableCount}</div>
              <div className="text-[10px] text-muted-foreground">Reachable</div>
            </div>
            <div className="bg-muted/50 rounded p-2 text-center">
              <div className="text-lg font-bold text-red-500">{result.unreachableCount}</div>
              <div className="text-[10px] text-muted-foreground">Unreachable</div>
            </div>
          </div>

          {/* Connectivity */}
          <div>
            <div className="flex justify-between text-[10px] mb-1">
              <span className="text-muted-foreground">Network Connectivity</span>
              <span>{Math.round(result.connectivityRatio * 100)}%</span>
            </div>
            <div className="h-1.5 bg-border rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${result.connectivityRatio * 100}%`,
                  backgroundColor: result.connectivityRatio > 0.8 ? "#22c55e" :
                    result.connectivityRatio > 0.5 ? "#eab308" : "#ef4444",
                }}
              />
            </div>
          </div>

          {/* Failed Components */}
          <div>
            <div className="text-xs font-medium text-muted-foreground mb-1">Failed Components</div>
            <div className="space-y-0.5">
              {result.failedNodeIds.map(id => {
                const node = nodes.find(n => n.id === id);
                return node ? (
                  <div key={id} className="flex items-center gap-2 text-xs text-red-500">
                    <X className="w-3 h-3" />
                    <span>{node.data.label}</span>
                  </div>
                ) : null;
              })}
              {result.failedEdgeIds.map(id => (
                <div key={id} className="flex items-center gap-2 text-xs text-red-500">
                  <X className="w-3 h-3" />
                  <span>Connection removed</span>
                </div>
              ))}
            </div>
          </div>

          {/* Affected Services */}
          {result.affectedServices.length > 0 && (
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-1">Affected Services</div>
              <div className="space-y-0.5">
                {result.affectedServices.map(s => (
                  <div key={s.nodeId} className="flex items-center gap-2 text-xs">
                    <span className="text-red-500">✕</span>
                    <span>{s.label}</span>
                    <span className="text-[10px] text-muted-foreground ml-auto">{s.deviceType.replace(/-/g, " ")}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Affected VLANs */}
          {result.affectedVlans.length > 0 && (
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-1">Affected VLANs</div>
              <div className="space-y-0.5">
                {result.affectedVlans.map(v => (
                  <div key={v.vlanId} className="text-xs text-yellow-500">
                    VLAN {v.vlanId} — {v.name}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommendation */}
          <div className="bg-blue-500/5 border border-blue-500/20 rounded p-2">
            <div className="text-[10px] font-medium text-blue-500 uppercase mb-1">Recommended Action</div>
            <p className="text-xs text-muted-foreground leading-relaxed">{result.recommendation}</p>
          </div>

          {/* Buttons */}
          <div className="flex gap-2">
            <button
              onClick={reset}
              className="flex-1 text-xs px-3 py-1.5 border border-border rounded hover:bg-muted transition-colors"
            >
              New Simulation
            </button>
            <button
              onClick={onClose}
              className="flex-1 text-xs px-3 py-1.5 bg-foreground text-background rounded font-medium hover:opacity-90 transition-opacity"
            >
              Exit Simulation
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
