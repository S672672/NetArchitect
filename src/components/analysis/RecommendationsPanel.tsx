"use client";

import { useMemo, useState } from "react";
import { Lightbulb, ChevronDown, ChevronRight, DollarSign } from "lucide-react";
import { useTopologyStore } from "@/stores/topologyStore";
import { generateRecommendations } from "@/lib/analysis/recommendations";
import { RecommendationPriority } from "@/types";

const PRIORITY_STYLES: Record<RecommendationPriority, { bg: string; text: string; border: string }> = {
  critical: { bg: "bg-red-500/5", text: "text-red-500", border: "border-red-500/20" },
  high: { bg: "bg-orange-500/5", text: "text-orange-500", border: "border-orange-500/20" },
  medium: { bg: "bg-yellow-500/5", text: "text-yellow-500", border: "border-yellow-500/20" },
  low: { bg: "bg-blue-500/5", text: "text-blue-500", border: "border-blue-500/20" },
};

const CATEGORY_LABELS: Record<string, string> = {
  redundancy: "Redundancy",
  security: "Security",
  capacity: "Capacity",
  segmentation: "Segmentation",
  configuration: "Configuration",
};

export function RecommendationsPanel() {
  const { nodes, edges, vlans } = useTopologyStore();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  const recommendations = useMemo(
    () => generateRecommendations(nodes, edges, vlans),
    [nodes, edges, vlans]
  );

  const filtered = categoryFilter
    ? recommendations.filter(r => r.category === categoryFilter)
    : recommendations;

  if (nodes.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Lightbulb className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">Add devices to see recommendations</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Summary */}
      <div className="flex items-center gap-2">
        <Lightbulb className="w-4 h-4 text-yellow-500" />
        <h3 className="text-sm font-semibold">Top Recommendations</h3>
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        {(["critical", "high", "medium", "low"] as const).map(pri => {
          const count = recommendations.filter(r => r.priority === pri).length;
          return (
            <div key={pri} className="bg-muted/30 rounded p-1.5 text-center">
              <div className={`text-sm font-bold ${PRIORITY_STYLES[pri].text}`}>{count}</div>
              <div className="text-[10px] text-muted-foreground capitalize">{pri}</div>
            </div>
          );
        })}
      </div>

      {/* Category Filter */}
      <div className="flex gap-1 flex-wrap">
        <button
          onClick={() => setCategoryFilter(null)}
          className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${
            !categoryFilter ? "bg-foreground text-background" : "border-border hover:bg-muted"
          }`}
        >
          All
        </button>
        {["redundancy", "security", "capacity", "segmentation", "configuration"].map(cat => (
          <button
            key={cat}
            onClick={() => setCategoryFilter(categoryFilter === cat ? null : cat)}
            className={`text-[10px] px-2 py-0.5 rounded border transition-colors capitalize ${
              categoryFilter === cat ? "bg-foreground text-background" : "border-border hover:bg-muted"
            }`}
          >
            {CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      {/* Recommendations List */}
      <div className="space-y-1.5">
        {filtered.length === 0 ? (
          <div className="text-center py-6 text-xs text-green-500">
            No recommendations for this category
          </div>
        ) : (
          filtered.map((rec, idx) => {
            const style = PRIORITY_STYLES[rec.priority];
            const isExpanded = expandedId === rec.id;
            return (
              <div
                key={rec.id}
                className={`border rounded ${style.bg} ${style.border}`}
              >
                <button
                  onClick={() => setExpandedId(isExpanded ? null : rec.id)}
                  className="w-full flex items-center gap-2 px-2.5 py-2 text-left"
                >
                  {isExpanded ?
                    <ChevronDown className="w-3 h-3 shrink-0" /> :
                    <ChevronRight className="w-3 h-3 shrink-0" />
                  }
                  <span className={`text-[10px] font-bold uppercase ${style.text} shrink-0 w-14`}>
                    {rec.priority}
                  </span>
                  <span className="text-xs font-medium truncate">{rec.title}</span>
                </button>
                {isExpanded && (
                  <div className="px-2.5 pb-2.5 space-y-2">
                    <div>
                      <div className="text-[10px] font-medium text-muted-foreground mb-0.5">Why</div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{rec.why}</p>
                    </div>
                    {rec.estimatedCost && (
                      <div className="flex items-center gap-1 text-xs">
                        <DollarSign className="w-3 h-3 text-muted-foreground" />
                        <span className="text-muted-foreground">Estimated cost:</span>
                        <span className="font-medium">${rec.estimatedCost.toLocaleString()}</span>
                      </div>
                    )}
                    <div>
                      <div className="text-[10px] font-medium text-muted-foreground mb-0.5">Impact</div>
                      <p className="text-xs text-muted-foreground">{rec.impact}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] px-1.5 py-0.5 bg-muted/50 rounded capitalize">{rec.category}</span>
                    </div>
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
