"use client";

import { useMemo, useState } from "react";
import {
  DollarSign,
  TrendingUp,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Server,
  Cable,
  Wifi,
  Shield,
  Monitor,
  Box,
} from "lucide-react";
import { useTopologyStore } from "@/stores/topologyStore";
import { estimateNetworkCost, formatCost, CostBreakdown } from "@/lib/cost-estimator";

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  network: <Wifi className="w-3.5 h-3.5" />,
  infrastructure: <Server className="w-3.5 h-3.5" />,
  client: <Monitor className="w-3.5 h-3.5" />,
  external: <Globe className="w-3.5 h-3.5" />,
};

function Globe(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="10" /><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" /><path d="M2 12h20" />
    </svg>
  );
}

export function CostEstimatorPanel() {
  const { nodes, edges } = useTopologyStore();
  const [showDetails, setShowDetails] = useState(false);
  const [activeTab, setActiveTab] = useState<"summary" | "devices" | "connections" | "recommendations">("summary");

  const breakdown = useMemo(
    () => estimateNetworkCost(nodes, edges),
    [nodes, edges]
  );

  if (nodes.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <DollarSign className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">Add devices to see cost estimates</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Total Cost Hero */}
      <div className="bg-muted/50 rounded-lg p-4">
        <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
          Estimated First Year Total
        </div>
        <div className="text-2xl font-bold">
          {formatCost(breakdown.totalFirstYear)}
        </div>
        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
          <span>{formatCost(breakdown.totalUpfront)} upfront</span>
          <span>·</span>
          <span>{formatCost(breakdown.monthlyRecurring)}/mo recurring</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        {(["summary", "devices", "connections", "recommendations"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-1.5 text-[11px] font-medium border-b-2 transition-colors capitalize ${
              activeTab === tab
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab}
            {tab === "recommendations" && breakdown.recommendations.length > 0 && (
              <span className="ml-1 px-1 py-0.5 text-[9px] bg-amber-500/10 text-amber-500 rounded-full font-bold">
                {breakdown.recommendations.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Summary Tab */}
      {activeTab === "summary" && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <CostCard
              icon={<Box className="w-4 h-4" />}
              label="Equipment"
              value={formatCost(breakdown.totalDeviceCost)}
            />
            <CostCard
              icon={<Cable className="w-4 h-4" />}
              label="Cabling"
              value={formatCost(breakdown.totalConnectionCost)}
            />
            <CostCard
              icon={<TrendingUp className="w-4 h-4" />}
              label="Monthly"
              value={formatCost(breakdown.monthlyRecurring)}
              sub="/mo"
            />
            <CostCard
              icon={<TrendingUp className="w-4 h-4" />}
              label="Annual"
              value={formatCost(breakdown.annualRecurring)}
              sub="/yr"
            />
          </div>

          {/* Cost by Category */}
          <div>
            <h4 className="text-xs font-medium mb-2 text-muted-foreground">By Category</h4>
            <div className="space-y-1.5">
              {Object.entries(breakdown.byCategory).map(([cat, cost]) => {
                const pct = breakdown.totalDeviceCost > 0
                  ? (cost / breakdown.totalDeviceCost) * 100
                  : 0;
                return (
                  <div key={cat}>
                    <div className="flex items-center justify-between text-xs mb-0.5">
                      <span className="capitalize flex items-center gap-1.5">
                        {CATEGORY_ICONS[cat]}
                        {cat}
                      </span>
                      <span className="text-muted-foreground">{formatCost(cost)}</span>
                    </div>
                    <div className="h-1 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-foreground/60 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Devices Tab */}
      {activeTab === "devices" && (
        <div className="space-y-1">
          {breakdown.devices.map((device) => (
            <div
              key={device.id}
              className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-muted/50 text-xs"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="truncate">{device.name}</span>
                <span className="text-[10px] text-muted-foreground capitalize">
                  {device.type.replace(/-/g, " ")}
                </span>
              </div>
              <span className="text-muted-foreground shrink-0 ml-2">
                {formatCost(device.cost)}
              </span>
            </div>
          ))}
          <div className="border-t border-border mt-2 pt-2 flex justify-between text-xs font-medium">
            <span>Total Equipment</span>
            <span>{formatCost(breakdown.totalDeviceCost)}</span>
          </div>
        </div>
      )}

      {/* Connections Tab */}
      {activeTab === "connections" && (
        <div className="space-y-1">
          {breakdown.connections.map((conn) => (
            <div
              key={conn.id}
              className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-muted/50 text-xs"
            >
              <div className="min-w-0">
                <span className="truncate">{conn.from} → {conn.to}</span>
                <span className="text-[10px] text-muted-foreground ml-2 capitalize">
                  {conn.type}
                </span>
              </div>
              <span className="text-muted-foreground shrink-0 ml-2">
                {formatCost(conn.cost)}
              </span>
            </div>
          ))}
          <div className="border-t border-border mt-2 pt-2 flex justify-between text-xs font-medium">
            <span>Total Cabling</span>
            <span>{formatCost(breakdown.totalConnectionCost)}</span>
          </div>
        </div>
      )}

      {/* Recommendations Tab */}
      {activeTab === "recommendations" && (
        <div className="space-y-2">
          {breakdown.recommendations.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground text-xs">
              No cost optimization recommendations
            </div>
          ) : (
            breakdown.recommendations.map((rec, i) => (
              <div
                key={i}
                className="flex gap-2 p-2.5 bg-amber-500/5 border border-amber-500/20 rounded text-xs"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                <span className="text-muted-foreground leading-relaxed">{rec}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function CostCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="bg-muted/30 rounded-lg p-3">
      <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
        {icon}
        <span className="text-[10px] uppercase tracking-wider">{label}</span>
      </div>
      <div className="text-base font-bold">
        {value}
        {sub && <span className="text-xs font-normal text-muted-foreground">{sub}</span>}
      </div>
    </div>
  );
}
