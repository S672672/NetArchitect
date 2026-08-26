"use client";

import { useMemo, useState } from "react";
import { Shield, AlertTriangle, Info, Eye, ChevronDown, ChevronRight } from "lucide-react";
import { useTopologyStore } from "@/stores/topologyStore";
import { analyzeSecurityExposures } from "@/lib/analysis/securityAnalysis";
import { SecurityFinding } from "@/types";

const SEVERITY_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  critical: { bg: "bg-red-500/5", text: "text-red-500", border: "border-red-500/20" },
  high: { bg: "bg-orange-500/5", text: "text-orange-500", border: "border-orange-500/20" },
  medium: { bg: "bg-yellow-500/5", text: "text-yellow-500", border: "border-yellow-500/20" },
  low: { bg: "bg-blue-500/5", text: "text-blue-500", border: "border-blue-500/20" },
  info: { bg: "bg-muted/30", text: "text-muted-foreground", border: "border-border" },
};

export function SecurityAnalysisPanel() {
  const { nodes, edges } = useTopologyStore();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const result = useMemo(
    () => analyzeSecurityExposures(nodes, edges),
    [nodes, edges]
  );

  if (nodes.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Shield className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">Add devices to run security analysis</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Overall Risk */}
      <div className={`px-3 py-2 rounded border ${
        result.overallRisk === "critical" ? "bg-red-500/5 border-red-500/20" :
        result.overallRisk === "high" ? "bg-orange-500/5 border-orange-500/20" :
        result.overallRisk === "medium" ? "bg-yellow-500/5 border-yellow-500/20" :
        "bg-green-500/5 border-green-500/20"
      }`}>
        <div className="flex items-center gap-2">
          <Shield className={`w-4 h-4 ${
            result.overallRisk === "critical" ? "text-red-500" :
            result.overallRisk === "high" ? "text-orange-500" :
            result.overallRisk === "medium" ? "text-yellow-500" :
            "text-green-500"
          }`} />
          <div>
            <div className="text-xs font-medium">Overall Risk</div>
            <div className={`text-sm font-bold uppercase ${
              result.overallRisk === "critical" ? "text-red-500" :
              result.overallRisk === "high" ? "text-orange-500" :
              result.overallRisk === "medium" ? "text-yellow-500" :
              "text-green-500"
            }`}>
              {result.overallRisk}
            </div>
          </div>
        </div>
      </div>

      {/* Findings Count */}
      <div className="grid grid-cols-3 gap-1.5 text-center">
        {(["critical", "high", "medium"] as const).map(sev => {
          const count = result.findings.filter(f => f.severity === sev).length;
          return (
            <div key={sev} className="bg-muted/30 rounded p-2">
              <div className={`text-sm font-bold ${
                sev === "critical" ? "text-red-500" :
                sev === "high" ? "text-orange-500" : "text-yellow-500"
              }`}>{count}</div>
              <div className="text-[10px] text-muted-foreground capitalize">{sev}</div>
            </div>
          );
        })}
      </div>

      {/* Findings List */}
      <div className="space-y-1">
        {result.findings.length === 0 ? (
          <div className="text-center py-6 text-sm text-green-500">
            <Shield className="w-6 h-6 mx-auto mb-1" />
            No security exposures detected
          </div>
        ) : (
          result.findings.map(finding => {
            const style = SEVERITY_STYLES[finding.severity] || SEVERITY_STYLES.info;
            const isExpanded = expandedId === finding.id;
            return (
              <div
                key={finding.id}
                className={`border rounded ${style.bg} ${style.border}`}
              >
                <button
                  onClick={() => setExpandedId(isExpanded ? null : finding.id)}
                  className="w-full flex items-center gap-2 px-2.5 py-2 text-left"
                >
                  {isExpanded ?
                    <ChevronDown className="w-3 h-3 shrink-0" /> :
                    <ChevronRight className="w-3 h-3 shrink-0" />
                  }
                  <span className={`text-[10px] font-bold uppercase ${style.text} shrink-0`}>
                    {finding.severity}
                  </span>
                  <span className="text-xs truncate">{finding.title}</span>
                </button>
                {isExpanded && (
                  <div className="px-2.5 pb-2.5 space-y-2">
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {finding.description}
                    </p>
                    {finding.pathLabels.length > 0 && (
                      <div>
                        <div className="text-[10px] font-medium text-muted-foreground mb-1">Exposure Path</div>
                        <div className="flex flex-wrap items-center gap-1 text-[11px]">
                          {finding.pathLabels.map((label, i) => (
                            <span key={i} className="flex items-center gap-1">
                              <span className="px-1.5 py-0.5 bg-muted/50 rounded text-foreground">{label}</span>
                              {i < finding.pathLabels.length - 1 && (
                                <span className="text-muted-foreground">→</span>
                              )}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {finding.recommendation && (
                      <div className="bg-blue-500/5 border border-blue-500/20 rounded p-2">
                        <div className="text-[10px] font-medium text-blue-500 mb-0.5">Recommendation</div>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">{finding.recommendation}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
