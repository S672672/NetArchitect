"use client";

import { useState, useMemo } from "react";
import { Route, AlertTriangle, Check, ChevronDown } from "lucide-react";
import { useTopologyStore } from "@/stores/topologyStore";
import { analyzeTraffic } from "@/lib/analysis/trafficAnalysis";
import { TrafficProfile, TrafficType } from "@/types";

const TRAFFIC_TYPES: { value: TrafficType; label: string; typicalBandwidth: number }[] = [
  { value: "http", label: "HTTP", typicalBandwidth: 10 },
  { value: "https", label: "HTTPS", typicalBandwidth: 10 },
  { value: "database", label: "Database", typicalBandwidth: 50 },
  { value: "voip", label: "VoIP", typicalBandwidth: 1 },
  { value: "video", label: "Video", typicalBandwidth: 25 },
  { value: "general", label: "General", typicalBandwidth: 100 },
  { value: "custom", label: "Custom", typicalBandwidth: 100 },
];

export function TrafficAnalysisPanel() {
  const { nodes, edges } = useTopologyStore();
  const [sourceId, setSourceId] = useState("");
  const [targetId, setTargetId] = useState("");
  const [bandwidth, setBandwidth] = useState(100);
  const [trafficType, setTrafficType] = useState<TrafficType>("general");
  const [result, setResult] = useState<ReturnType<typeof analyzeTraffic> | null>(null);

  const analysis = useMemo(() => {
    if (!sourceId || !targetId || sourceId === targetId) return null;
    const profile: TrafficProfile = {
      id: "analysis",
      sourceId,
      targetId,
      expectedBandwidthMbps: bandwidth,
      trafficType,
    };
    return analyzeTraffic(nodes, edges, profile);
  }, [sourceId, targetId, bandwidth, trafficType, nodes, edges]);

  const runAnalysis = () => {
    if (!sourceId || !targetId || sourceId === targetId) return;
    const profile: TrafficProfile = {
      id: "analysis",
      sourceId,
      targetId,
      expectedBandwidthMbps: bandwidth,
      trafficType,
    };
    setResult(analyzeTraffic(nodes, edges, profile));
  };

  if (nodes.length < 2) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Route className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">Add at least 2 devices to analyze traffic</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Route className="w-4 h-4 text-blue-500" />
        <h3 className="text-sm font-semibold">Traffic Analysis</h3>
      </div>
      <p className="text-[10px] text-muted-foreground">Topology-based capacity analysis — not real packet simulation.</p>

      {/* Source */}
      <div>
        <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Source</label>
        <select
          value={sourceId}
          onChange={(e) => setSourceId(e.target.value)}
          className="w-full mt-1 text-xs px-2 py-1.5 bg-muted/50 border border-border rounded focus:outline-none focus:ring-1 focus:ring-foreground/20"
        >
          <option value="">Select source device</option>
          {nodes.filter(n => n.data.deviceType !== "internet" && n.data.deviceType !== "cloud").map(n => (
            <option key={n.id} value={n.id}>{n.data.label}</option>
          ))}
        </select>
      </div>

      {/* Target */}
      <div>
        <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Destination</label>
        <select
          value={targetId}
          onChange={(e) => setTargetId(e.target.value)}
          className="w-full mt-1 text-xs px-2 py-1.5 bg-muted/50 border border-border rounded focus:outline-none focus:ring-1 focus:ring-foreground/20"
        >
          <option value="">Select destination device</option>
          {nodes.filter(n => n.data.deviceType !== "internet" && n.data.deviceType !== "cloud").map(n => (
            <option key={n.id} value={n.id}>{n.data.label}</option>
          ))}
        </select>
      </div>

      {/* Traffic Type + Bandwidth */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Traffic Type</label>
          <select
            value={trafficType}
            onChange={(e) => {
              const t = e.target.value as TrafficType;
              setTrafficType(t);
              const tt = TRAFFIC_TYPES.find(x => x.value === t);
              if (tt) setBandwidth(tt.typicalBandwidth);
            }}
            className="w-full mt-1 text-xs px-2 py-1.5 bg-muted/50 border border-border rounded focus:outline-none focus:ring-1 focus:ring-foreground/20"
          >
            {TRAFFIC_TYPES.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Expected Mbps</label>
          <input
            type="number"
            value={bandwidth}
            min={1}
            onChange={(e) => setBandwidth(Math.max(1, parseInt(e.target.value) || 1))}
            className="w-full mt-1 text-xs px-2 py-1.5 bg-muted/50 border border-border rounded focus:outline-none focus:ring-1 focus:ring-foreground/20"
          />
        </div>
      </div>

      <button
        onClick={runAnalysis}
        disabled={!sourceId || !targetId || sourceId === targetId}
        className="w-full text-xs px-3 py-1.5 bg-foreground text-background rounded font-medium hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed transition-opacity"
      >
        Analyze Traffic
      </button>

      {/* Results */}
      {result && result.pathAnalysis && (
        <div className="space-y-2">
          {/* Path */}
          <div className="bg-muted/30 rounded p-2">
            <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Path</div>
            <div className="flex flex-wrap items-center gap-1 text-xs">
              {result.pathAnalysis.pathLabels.map((label, i) => (
                <span key={i} className="flex items-center gap-1">
                  <span className="px-1.5 py-0.5 bg-muted/50 rounded">{label}</span>
                  {i < result.pathAnalysis!.pathLabels.length - 1 && (
                    <span className="text-muted-foreground">→</span>
                  )}
                </span>
              ))}
            </div>
          </div>

          {/* Segments */}
          <div>
            <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Link Analysis</div>
            <div className="space-y-1">
              {result.pathAnalysis.segments.map((seg, i) => {
                const isBottleneck = i === result.pathAnalysis!.bottleneckSegmentIndex;
                return (
                  <div key={i} className={`p-2 rounded border text-xs ${
                    isBottleneck ? "border-red-500/30 bg-red-500/5" : "border-border"
                  }`}>
                    <div className="flex items-center justify-between mb-1">
                      <span>{seg.fromLabel} → {seg.toLabel}</span>
                      {isBottleneck && <AlertTriangle className="w-3 h-3 text-red-500" />}
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                      <span>{seg.connectionType} · {seg.bandwidthMbps >= 1000 ? `${seg.bandwidthMbps / 1000} Gbps` : `${seg.bandwidthMbps} Mbps`}</span>
                      <span className={seg.utilization > 100 ? "text-red-500 font-bold" : ""}>{seg.utilization}% utilization</span>
                    </div>
                    <div className="h-1 bg-border rounded-full mt-1 overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.min(100, seg.utilization)}%`,
                          backgroundColor: seg.utilization > 100 ? "#ef4444" : seg.utilization > 80 ? "#f97316" : "#22c55e",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottleneck Alert */}
          {result.pathAnalysis.isBottleneck && (
            <div className="bg-red-500/5 border border-red-500/20 rounded p-2">
              <div className="text-[10px] font-medium text-red-500 uppercase mb-0.5">Bottleneck Detected</div>
              <p className="text-xs text-muted-foreground">
                Required: {bandwidth} Mbps · Max capacity on path: {result.pathAnalysis.segments[result.pathAnalysis.bottleneckSegmentIndex!]?.bandwidthMbps || 0} Mbps
              </p>
            </div>
          )}

          {/* Recommendations */}
          {result.recommendations.length > 0 && (
            <div className="space-y-1">
              {result.recommendations.map((rec, i) => (
                <div key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                  {result.pathAnalysis!.isBottleneck ? (
                    <AlertTriangle className="w-3 h-3 text-orange-500 mt-0.5 shrink-0" />
                  ) : (
                    <Check className="w-3 h-3 text-green-500 mt-0.5 shrink-0" />
                  )}
                  <span>{rec}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {result && !result.pathAnalysis && (
        <div className="text-center py-4 text-sm text-orange-500">
          No path found between the selected devices
        </div>
      )}
    </div>
  );
}
