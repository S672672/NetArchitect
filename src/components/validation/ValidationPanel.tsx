"use client";

import { useUIStore } from "@/stores/uiStore";
import { useTopologyStore } from "@/stores/topologyStore";
import {
  AlertTriangle,
  AlertCircle,
  AlertOctagon,
  Info,
  ChevronRight,
  Shield,
} from "lucide-react";
import { ValidationSeverity, ValidationIssue } from "@/types";
import { getIssueCounts } from "@/lib/validation";

const SEVERITY_CONFIG: Record<
  ValidationSeverity,
  { icon: React.ComponentType<{ size?: number; className?: string }>; color: string; bg: string }
> = {
  critical: { icon: AlertOctagon, color: "text-red-500", bg: "bg-red-500/10" },
  error: { icon: AlertCircle, color: "text-orange-500", bg: "bg-orange-500/10" },
  warning: { icon: AlertTriangle, color: "text-yellow-600", bg: "bg-yellow-500/10" },
  info: { icon: Info, color: "text-blue-500", bg: "bg-blue-500/10" },
};

export function ValidationPanel() {
  const { validationResults, validationFilter, setValidationFilter } = useUIStore();
  const { nodes } = useTopologyStore();

  if (!validationResults) {
    return (
      <div className="text-center py-8">
        <Shield className="w-8 h-8 mx-auto mb-3 text-muted-foreground/50" />
        <p className="text-xs text-muted-foreground mb-1">No validation results yet</p>
        <p className="text-[11px] text-muted-foreground/70">
          Click &quot;Validate&quot; or make changes to auto-validate
        </p>
      </div>
    );
  }

  const counts = getIssueCounts(validationResults.issues);
  const totalIssues = validationResults.issues.length;

  const filteredIssues =
    validationFilter === "all"
      ? validationResults.issues
      : validationResults.issues.filter((i) => i.severity === validationFilter);

  return (
    <div className="space-y-3">
      {/* Summary */}
      <div className="flex gap-2 flex-wrap">
        {(["critical", "error", "warning", "info"] as ValidationSeverity[]).map(
          (severity) => {
            const config = SEVERITY_CONFIG[severity];
            const Icon = config.icon;
            const count = counts[severity];
            return (
              <button
                key={severity}
                onClick={() =>
                  setValidationFilter(
                    validationFilter === severity ? "all" : severity
                  )
                }
                className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                  validationFilter === severity
                    ? `${config.bg} ${config.color}`
                    : count > 0
                    ? "bg-muted text-muted-foreground hover:bg-muted/80"
                    : "text-muted-foreground/50"
                }`}
              >
                <Icon size={12} />
                {count}
              </button>
            );
          }
        )}
      </div>

      {totalIssues === 0 && (
        <div className="text-center py-6">
          <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-2">
            <Shield className="w-4 h-4 text-green-500" />
          </div>
          <p className="text-xs font-medium text-green-500">No issues found</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Your topology looks healthy
          </p>
        </div>
      )}

      {/* Issues List */}
      <div className="space-y-1">
        {filteredIssues.map((issue) => (
          <IssueCard key={issue.id} issue={issue} nodes={nodes} />
        ))}
      </div>
    </div>
  );
}

function IssueCard({
  issue,
  nodes,
}: {
  issue: ValidationIssue;
  nodes: { id: string; data: { label: string } }[];
}) {
  const config = SEVERITY_CONFIG[issue.severity];
  const Icon = config.icon;

  const affectedLabels = issue.affectedNodeIds
    .map((id) => {
      const node = nodes.find((n) => n.id === id);
      return node?.data.label || id;
    })
    .join(", ");

  const handleClick = () => {
    if (issue.affectedNodeIds.length > 0) {
      const { selectNode } = useUIStore.getState();
      selectNode(issue.affectedNodeIds[0]);
    }
  };

  return (
    <div
      onClick={handleClick}
      className="validation-issue rounded-md border border-transparent hover:border-border cursor-pointer"
    >
      <div className="flex items-start gap-2">
        <div className={`mt-0.5 ${config.color}`}>
          <Icon size={13} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-xs font-medium leading-tight">{issue.title}</span>
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed mb-1">
            {issue.description}
          </p>
          {affectedLabels && (
            <p className="text-[10px] text-muted-foreground/70 mb-1 truncate">
              Affects: {affectedLabels}
            </p>
          )}
          {issue.recommendation && (
            <p className="text-[11px] text-blue-500/80 italic">
              💡 {issue.recommendation}
            </p>
          )}
        </div>
        <ChevronRight size={12} className="text-muted-foreground/50 mt-1 shrink-0" />
      </div>
    </div>
  );
}
