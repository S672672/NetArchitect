"use client";

import { useMemo } from "react";
import { useTopologyStore } from "@/stores/topologyStore";
import { useUIStore } from "@/stores/uiStore";
import { validateTopology } from "@/lib/validation";
import { ValidationSeverity } from "@/types";

interface HealthMetrics {
  score: number;
  grade: string;
  gradeColor: string;
  breakdown: { label: string; score: number; maxScore: number }[];
  summary: string;
}

function calculateHealthScore(
  issueCount: number,
  severityCounts: Record<ValidationSeverity, number>,
  deviceCount: number,
  edgeCount: number
): HealthMetrics {
  let score = 100;

  // Deductions based on severity
  score -= severityCounts.critical * 25;
  score -= severityCounts.error * 15;
  score -= severityCounts.warning * 5;
  score -= severityCounts.info * 0;

  // Bonus for good practices
  if (deviceCount > 0 && edgeCount > 0) {
    // Has connections
    score += 2;
  }

  // Connectivity ratio
  if (deviceCount > 2) {
    const expectedEdges = deviceCount - 1; // minimum spanning tree
    const connectivityRatio = Math.min(edgeCount / expectedEdges, 1);
    score += Math.round(connectivityRatio * 5);
  }

  // Clamp
  score = Math.max(0, Math.min(100, score));

  // Grade
  let grade: string;
  let gradeColor: string;
  let summary: string;

  if (score >= 90) {
    grade = "A+";
    gradeColor = "#22c55e";
    summary = "Excellent! Your network architecture is well-designed with minimal issues.";
  } else if (score >= 80) {
    grade = "A";
    gradeColor = "#22c55e";
    summary = "Great network design. A few minor improvements could make it even better.";
  } else if (score >= 70) {
    grade = "B+";
    gradeColor = "#84cc16";
    summary = "Good overall. Some warnings should be addressed for production readiness.";
  } else if (score >= 60) {
    grade = "B";
    gradeColor = "#eab308";
    summary = "Decent design but has issues that should be fixed before deployment.";
  } else if (score >= 50) {
    grade = "C";
    gradeColor = "#f97316";
    summary = "Needs improvement. Several errors found that could cause network problems.";
  } else if (score >= 30) {
    grade = "D";
    gradeColor = "#ef4444";
    summary = "Significant issues detected. Review critical and error-level findings.";
  } else {
    grade = "F";
    gradeColor = "#dc2626";
    summary = "Critical issues found. This network design needs major revisions.";
  }

  // Breakdown
  const totalIssues = issueCount;
  const breakdown = [
    {
      label: "Security",
      score: Math.max(0, 100 - severityCounts.critical * 30 - severityCounts.error * 15),
      maxScore: 100,
    },
    {
      label: "Reliability",
      score: Math.max(0, 100 - severityCounts.error * 20 - severityCounts.warning * 5),
      maxScore: 100,
    },
    {
      label: "Configuration",
      score: Math.max(0, 100 - (totalIssues > 0 ? Math.min(totalIssues * 5, 60) : 0)),
      maxScore: 100,
    },
    {
      label: "Best Practices",
      score: Math.max(0, 100 - severityCounts.warning * 10 - severityCounts.info * 2),
      maxScore: 100,
    },
  ];

  return { score, grade, gradeColor, breakdown, summary };
}

export function HealthScore() {
  const { nodes, edges, vlans } = useTopologyStore();
  const { validationResults } = useUIStore();

  const metrics = useMemo(() => {
    if (nodes.length === 0) {
      return {
        score: 0,
        grade: "-",
        gradeColor: "#94a3b8",
        breakdown: [],
        summary: "Add devices to see a health score.",
      };
    }

    const results = validationResults || validateTopology(nodes, edges, vlans);
    const severityCounts: Record<ValidationSeverity, number> = {
      info: 0,
      warning: 0,
      error: 0,
      critical: 0,
    };
    for (const issue of results.issues) {
      severityCounts[issue.severity]++;
    }

    return calculateHealthScore(
      results.issues.length,
      severityCounts,
      nodes.length,
      edges.length
    );
  }, [nodes, edges, vlans, validationResults]);

  if (nodes.length === 0) return null;

  // SVG circle progress
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (metrics.score / 100) * circumference;

  return (
    <div className="bg-muted/30 rounded-lg p-4">
      <div className="flex items-center gap-4">
        {/* Score Circle */}
        <div className="relative w-24 h-24 shrink-0">
          <svg className="w-24 h-24 -rotate-90" viewBox="0 0 80 80">
            {/* Background circle */}
            <circle
              cx="40"
              cy="40"
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth="6"
              className="text-border"
            />
            {/* Score arc */}
            <circle
              cx="40"
              cy="40"
              r={radius}
              fill="none"
              stroke={metrics.gradeColor}
              strokeWidth="6"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              className="transition-all duration-1000 ease-out"
            />
          </svg>
          {/* Grade text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span
              className="text-xl font-bold"
              style={{ color: metrics.gradeColor }}
            >
              {metrics.grade}
            </span>
            <span className="text-[9px] text-muted-foreground -mt-0.5">
              {metrics.score}/100
            </span>
          </div>
        </div>

        {/* Summary */}
        <div className="min-w-0">
          <h3 className="text-sm font-semibold mb-1">Network Health</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {metrics.summary}
          </p>
        </div>
      </div>

      {/* Breakdown Bars */}
      {metrics.breakdown.length > 0 && (
        <div className="mt-4 space-y-2">
          {metrics.breakdown.map((item) => (
            <div key={item.label}>
              <div className="flex items-center justify-between text-[10px] mb-0.5">
                <span className="text-muted-foreground">{item.label}</span>
                <span className="text-muted-foreground font-mono">
                  {item.score}/{item.maxScore}
                </span>
              </div>
              <div className="h-1 bg-border rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700 ease-out"
                  style={{
                    width: `${item.score}%`,
                    backgroundColor:
                      item.score >= 80
                        ? "#22c55e"
                        : item.score >= 60
                        ? "#eab308"
                        : item.score >= 40
                        ? "#f97316"
                        : "#ef4444",
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
