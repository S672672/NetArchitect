"use client";

import { useMemo, useState } from "react";
import { useTopologyStore } from "@/stores/topologyStore";
import { calculateNetworkScore, calculateResilienceScore } from "@/lib/analysis/healthScoring";

export function HealthScore() {
  const { nodes, edges, vlans } = useTopologyStore();
  const [showDetails, setShowDetails] = useState(false);

  const scoreDetail = useMemo(
    () => calculateNetworkScore(nodes, edges, vlans),
    [nodes, edges, vlans]
  );

  const resilience = useMemo(
    () => calculateResilienceScore(nodes, edges),
    [nodes, edges]
  );

  if (nodes.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p className="text-sm">Add devices to see health scores</p>
      </div>
    );
  }

  const { score, deductions, improvements, grade, gradeColor, summary } = scoreDetail;
  const circumference = 2 * Math.PI * 40;
  const offset = circumference - (score.overall / 100) * circumference;

  return (
    <div className="space-y-4">
      {/* Overall Score */}
      <div className="flex items-center gap-4">
        <div className="relative w-28 h-28 shrink-0">
          <svg className="w-28 h-28 -rotate-90" viewBox="0 0 90 90">
            <circle cx="45" cy="45" r={40} fill="none" stroke="currentColor" strokeWidth="5" className="text-border" />
            <circle cx="45" cy="45" r={40} fill="none" stroke={gradeColor} strokeWidth="5"
              strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
              className="transition-all duration-1000" />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold" style={{ color: gradeColor }}>{grade}</span>
            <span className="text-[10px] text-muted-foreground">{score.overall}/100</span>
          </div>
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold mb-1">Network Health</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">{summary}</p>
        </div>
      </div>

      {/* Category Scores */}
      <div className="space-y-1.5">
        {([
          { key: "security", label: "Security", value: score.security },
          { key: "connectivity", label: "Connectivity", value: score.connectivity },
          { key: "redundancy", label: "Redundancy", value: score.redundancy },
          { key: "configuration", label: "Configuration", value: score.configuration },
          { key: "segmentation", label: "Segmentation", value: score.segmentation },
          { key: "capacity", label: "Capacity", value: score.capacity },
        ] as const).map(item => (
          <div key={item.key}>
            <div className="flex items-center justify-between text-[10px] mb-0.5">
              <span className="text-muted-foreground">{item.label}</span>
              <span className="font-mono text-muted-foreground">{item.value}/100</span>
            </div>
            <div className="h-1 bg-border rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${item.value}%`,
                  backgroundColor: item.value >= 80 ? "#22c55e" : item.value >= 60 ? "#eab308" : item.value >= 40 ? "#f97316" : "#ef4444",
                }} />
            </div>
          </div>
        ))}
      </div>

      {/* Resilience Score */}
      <div className="bg-muted/30 rounded-lg p-3">
        <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">Resilience</div>
        <div className="text-xl font-bold mb-2">{resilience.overall}<span className="text-xs font-normal text-muted-foreground">/100</span></div>
        <div className="space-y-1.5">
          {([
            { label: "Critical Infrastructure", value: resilience.criticalInfrastructureRedundancy },
            { label: "Redundant Paths", value: resilience.redundantPaths },
            { label: "Failure Tolerance", value: resilience.failureTolerance },
          ] as const).map(item => (
            <div key={item.label}>
              <div className="flex justify-between text-[10px] mb-0.5">
                <span className="text-muted-foreground">{item.label}</span>
                <span className="text-muted-foreground">{item.value}%</span>
              </div>
              <div className="h-1 bg-border rounded-full overflow-hidden">
                <div className="h-full bg-foreground/40 rounded-full" style={{ width: `${item.value}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Deductions & Improvements */}
      {(deductions.length > 0 || improvements.length > 0) && (
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="w-full text-[10px] text-muted-foreground hover:text-foreground transition-colors text-left"
        >
          {showDetails ? "Hide details" : `Show ${deductions.length} deductions, ${improvements.length} improvements`}
        </button>
      )}

      {showDetails && (
        <div className="space-y-2">
          {deductions.length > 0 && (
            <div>
              <div className="text-[10px] font-medium text-red-500 mb-1">Deductions</div>
              {deductions.map((d, i) => (
                <div key={i} className="flex items-start gap-2 text-xs py-0.5">
                  <span className="text-red-500 font-mono shrink-0">-{d.points}</span>
                  <span className="text-muted-foreground">{d.reason}</span>
                </div>
              ))}
            </div>
          )}
          {improvements.length > 0 && (
            <div>
              <div className="text-[10px] font-medium text-green-500 mb-1">Improvements</div>
              {improvements.map((imp, i) => (
                <div key={i} className="flex items-start gap-2 text-xs py-0.5">
                  <span className="text-green-500 font-mono shrink-0">+{imp.points}</span>
                  <span className="text-muted-foreground">{imp.reason}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
