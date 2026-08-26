"use client";

import { useState, useMemo } from "react";
import { BarChart3, TrendingUp, AlertTriangle } from "lucide-react";
import { useTopologyStore } from "@/stores/topologyStore";
import { analyzeCapacity } from "@/lib/analysis/capacityPlanning";
import { CapacityPlan } from "@/types";

export function CapacityPlanningPanel() {
  const { nodes, edges, vlans } = useTopologyStore();
  const [plan, setPlan] = useState<CapacityPlan>({
    currentUsers: 100,
    annualGrowthRate: 20,
    planningYears: 3,
  });
  const [hasAnalyzed, setHasAnalyzed] = useState(false);

  const result = useMemo(
    () => hasAnalyzed ? analyzeCapacity(nodes, edges, vlans, plan) : null,
    [nodes, edges, vlans, plan, hasAnalyzed]
  );

  return (
    <div className="space-y-3">
      {/* Input Form */}
      <div className="space-y-2">
        <div>
          <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Current Users</label>
          <input
            type="number"
            value={plan.currentUsers}
            onChange={(e) => setPlan(p => ({ ...p, currentUsers: parseInt(e.target.value) || 0 }))}
            className="w-full mt-1 text-xs px-2 py-1.5 bg-muted/50 border border-border rounded focus:outline-none focus:ring-1 focus:ring-foreground/20"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Annual Growth %</label>
            <input
              type="number"
              value={plan.annualGrowthRate}
              onChange={(e) => setPlan(p => ({ ...p, annualGrowthRate: parseInt(e.target.value) || 0 }))}
              className="w-full mt-1 text-xs px-2 py-1.5 bg-muted/50 border border-border rounded focus:outline-none focus:ring-1 focus:ring-foreground/20"
            />
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Planning Years</label>
            <input
              type="number"
              value={plan.planningYears}
              min={1}
              max={10}
              onChange={(e) => setPlan(p => ({ ...p, planningYears: Math.max(1, parseInt(e.target.value) || 1) }))}
              className="w-full mt-1 text-xs px-2 py-1.5 bg-muted/50 border border-border rounded focus:outline-none focus:ring-1 focus:ring-foreground/20"
            />
          </div>
        </div>
        <button
          onClick={() => setHasAnalyzed(true)}
          className="w-full text-xs px-3 py-1.5 bg-foreground text-background rounded font-medium hover:opacity-90 transition-opacity"
        >
          Analyze Capacity
        </button>
      </div>

      {/* Results */}
      {result && (
        <div className="space-y-3">
          {/* Growth Projections */}
          <div>
            <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">Growth Projections</div>
            <div className="space-y-1">
              {result.projections.map(proj => (
                <div key={proj.year} className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground w-12">Year {proj.year}</span>
                  <div className="flex-1 h-3 bg-muted/50 rounded overflow-hidden">
                    <div
                      className="h-full bg-foreground/20 rounded"
                      style={{ width: `${(proj.projectedUsers / (result.projections[result.projections.length - 1]?.projectedUsers || 1)) * 100}%` }}
                    />
                  </div>
                  <span className="font-mono w-16 text-right">{proj.projectedUsers.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Subnet Utilization */}
          {result.subnetUtilizations.length > 0 && (
            <div>
              <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">Subnet Utilization</div>
              <div className="space-y-2">
                {result.subnetUtilizations.map(sub => (
                  <div key={sub.vlanId} className="bg-muted/30 rounded p-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium">VLAN {sub.vlanId} — {sub.vlanName}</span>
                      <span className={`text-[10px] font-bold ${
                        sub.status === "critical" || sub.status === "exhausted" ? "text-red-500" :
                        sub.status === "warning" ? "text-yellow-500" : "text-green-500"
                      }`}>{sub.utilizationPercent}%</span>
                    </div>
                    <div className="h-1.5 bg-border rounded-full overflow-hidden mb-1">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.min(100, sub.utilizationPercent)}%`,
                          backgroundColor: sub.status === "critical" || sub.status === "exhausted" ? "#ef4444" :
                            sub.status === "warning" ? "#eab308" : "#22c55e",
                        }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>{sub.currentAllocation}/{sub.usableHosts} addresses</span>
                      <span>{sub.subnet}</span>
                    </div>
                    {sub.recommendation && (
                      <div className="text-[10px] text-blue-500 mt-1">{sub.recommendation}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Switch Port Analysis */}
          {result.switchPortAnalysis.length > 0 && (
            <div>
              <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">Switch Port Utilization</div>
              <div className="space-y-1">
                {result.switchPortAnalysis.filter(sw => sw.totalPorts <= 48).map(sw => (
                  <div key={sw.deviceId} className="flex items-center gap-2 text-xs">
                    <span className="truncate min-w-0">{sw.label}</span>
                    <div className="flex-1 h-1 bg-border rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${sw.utilization}%`,
                          backgroundColor: sw.utilization >= 90 ? "#ef4444" :
                            sw.utilization >= 75 ? "#eab308" : "#22c55e",
                        }}
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground w-12 text-right shrink-0">
                      {sw.usedPorts}/{sw.totalPorts}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Capacity Issues */}
          {result.capacityIssues.length > 0 && (
            <div>
              <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">Capacity Issues</div>
              <div className="space-y-1.5">
                {result.capacityIssues.map((issue, i) => (
                  <div key={i} className={`px-2 py-1.5 rounded border text-xs ${
                    issue.severity === "critical" ? "bg-red-500/5 border-red-500/20" :
                    issue.severity === "error" ? "bg-orange-500/5 border-orange-500/20" :
                    "bg-yellow-500/5 border-yellow-500/20"
                  }`}>
                    <div className={`font-medium ${
                      issue.severity === "critical" || issue.severity === "error" ? "text-red-500" : "text-yellow-500"
                    }`}>{issue.title}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">{issue.description}</div>
                    {issue.recommendation && (
                      <div className="text-[10px] text-blue-500 mt-1">{issue.recommendation}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
