"use client";

import { useState } from "react";
import { GitBranch, Plus, Copy, Trash2, ArrowLeftRight, Check } from "lucide-react";
import { useTopologyStore } from "@/stores/topologyStore";
import { createScenario, compareScenarios, formatDiffSummary } from "@/lib/scenarios";
import { calculateNetworkScore } from "@/lib/analysis/healthScoring";
import { estimateNetworkCost } from "@/lib/cost-estimator";
import { ArchitectureScenario, ScenarioDiff } from "@/types";
import { useProjectStore } from "@/stores/projectStore";

interface ScenarioPanelProps {
  onLoadScenario: (scenario: ArchitectureScenario) => void;
}

export function ScenarioPanel({ onLoadScenario }: ScenarioPanelProps) {
  const { nodes, edges, vlans } = useTopologyStore();
  const { currentProject } = useProjectStore();
  const [scenarios, setScenarios] = useState<ArchitectureScenario[]>([]);
  const [comparingId, setComparingId] = useState<string | null>(null);
  const [diff, setDiff] = useState<ScenarioDiff | null>(null);

  const projectId = currentProject?.id || "";

  const createNewScenario = () => {
    const name = `Scenario ${scenarios.length + 1}`;
    const scenario = createScenario(projectId, name, nodes, edges, vlans);
    setScenarios(prev => [...prev, scenario]);
  };

  const duplicateScenario = (id: string) => {
    const original = scenarios.find(s => s.id === id);
    if (!original) return;
    const dup = createScenario(projectId, `${original.name} (copy)`, original.nodes, original.edges, original.vlans);
    setScenarios(prev => [...prev, dup]);
  };

  const deleteScenario = (id: string) => {
    setScenarios(prev => prev.filter(s => s.id !== id));
    if (comparingId === id) {
      setComparingId(null);
      setDiff(null);
    }
  };

  const compareWithCurrent = (scenarioId: string) => {
    const scenario = scenarios.find(s => s.id === scenarioId);
    if (!scenario) return;

    const current = { nodes, edges, vlans };
    const proposed = { nodes: scenario.nodes, edges: scenario.edges, vlans: scenario.vlans };
    const d = compareScenarios(current, proposed);
    setDiff(d);
    setComparingId(scenarioId);
  };

  const getScenarioStats = (scenario: ArchitectureScenario) => {
    const score = calculateNetworkScore(scenario.nodes, scenario.edges, scenario.vlans);
    const cost = estimateNetworkCost(scenario.nodes, scenario.edges);
    return { score: score.score.overall, cost: cost.totalFirstYear };
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GitBranch className="w-4 h-4" />
          <h3 className="text-sm font-semibold">Architecture Scenarios</h3>
        </div>
        <button
          onClick={createNewScenario}
          className="flex items-center gap-1 text-[10px] px-2 py-1 bg-foreground text-background rounded font-medium hover:opacity-90 transition-opacity"
        >
          <Plus className="w-3 h-3" />
          Create
        </button>
      </div>

      {/* Scenarios List */}
      {scenarios.length === 0 ? (
        <div className="text-center py-6 text-xs text-muted-foreground">
          <GitBranch className="w-6 h-6 mx-auto mb-2 opacity-50" />
          <p>No scenarios yet.</p>
          <p className="mt-1">Create a scenario to snapshot your current topology, then modify it to explore alternatives.</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {scenarios.map(scenario => {
            const stats = getScenarioStats(scenario);
            const isComparing = comparingId === scenario.id;
            return (
              <div
                key={scenario.id}
                className={`border rounded p-2 ${
                  isComparing ? "border-foreground" : "border-border"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium">{scenario.name}</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => compareWithCurrent(scenario.id)}
                      className="p-1 hover:bg-muted rounded transition-colors"
                      title="Compare with current"
                    >
                      <ArrowLeftRight className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => onLoadScenario(scenario)}
                      className="p-1 hover:bg-muted rounded transition-colors"
                      title="Load scenario"
                    >
                      <Check className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => duplicateScenario(scenario.id)}
                      className="p-1 hover:bg-muted rounded transition-colors"
                      title="Duplicate"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => deleteScenario(scenario.id)}
                      className="p-1 hover:bg-muted rounded transition-colors text-red-500"
                      title="Delete"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                  <span>{scenario.nodes.length} devices</span>
                  <span>{scenario.edges.length} connections</span>
                  <span>Score: {stats.score}/100</span>
                  <span>${stats.cost.toLocaleString()}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Diff View */}
      {diff && comparingId && (
        <div className="border border-border rounded p-3 space-y-2">
          <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
            Changes: Current → {scenarios.find(s => s.id === comparingId)?.name}
          </div>
          <div className="space-y-0.5">
            {formatDiffSummary(
              diff,
              nodes,
              scenarios.find(s => s.id === comparingId)?.nodes || [],
              vlans,
              scenarios.find(s => s.id === comparingId)?.vlans || []
            ).length === 0 ? (
              <div className="text-xs text-muted-foreground">No differences found</div>
            ) : (
              formatDiffSummary(
                diff,
                nodes,
                scenarios.find(s => s.id === comparingId)?.nodes || [],
                vlans,
                scenarios.find(s => s.id === comparingId)?.vlans || []
              ).map((line, i) => (
                <div key={i} className={`text-xs ${
                  line.startsWith("+") ? "text-green-500" :
                  line.startsWith("-") ? "text-red-500" :
                  "text-yellow-500"
                }`}>
                  {line}
                </div>
              ))
            )}
          </div>
          <button
            onClick={() => { setDiff(null); setComparingId(null); }}
            className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
          >
            Close diff
          </button>
        </div>
      )}
    </div>
  );
}
