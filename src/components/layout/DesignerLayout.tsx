"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Network,
  Undo2,
  Redo2,
  Shield,
  Download,
  Upload,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  FileJson,
  Image,
  FileText,
  Activity,
  DollarSign,
  Code2,
  Zap,
  Lock,
  BarChart3,
  GitBranch,
  History,
  Lightbulb,
  TrafficCone,
} from "lucide-react";
import { useTopologyStore } from "@/stores/topologyStore";
import { useProjectStore } from "@/stores/projectStore";
import { useUIStore } from "@/stores/uiStore";
import { NetworkCanvas } from "@/components/canvas/NetworkCanvas";
import { DeviceLibrary } from "@/components/devices/DeviceLibrary";
import { PropertiesPanel } from "@/components/devices/PropertiesPanel";
import { ValidationPanel } from "@/components/validation/ValidationPanel";
import { HealthScore } from "@/components/validation/HealthScore";
import { CostEstimatorPanel } from "@/components/devices/CostEstimatorPanel";
import { ConfigExportPanel } from "@/components/devices/ConfigExportPanel";
import { FailureSimulationPanel } from "@/components/analysis/FailureSimulationPanel";
import { SecurityAnalysisPanel } from "@/components/analysis/SecurityAnalysisPanel";
import { CapacityPlanningPanel } from "@/components/analysis/CapacityPlanningPanel";
import { ScenarioPanel } from "@/components/analysis/ScenarioPanel";
import { VersionHistoryPanel } from "@/components/analysis/VersionHistoryPanel";
import { RecommendationsPanel } from "@/components/analysis/RecommendationsPanel";
import { TrafficAnalysisPanel } from "@/components/analysis/TrafficAnalysisPanel";
import { PathVisualization } from "@/components/canvas/PathVisualization";
import { CommandPalette } from "@/components/ui/CommandPalette";
import { OnboardingTour } from "@/components/ui/OnboardingTour";
import { ConnectedTabs } from "@/components/ui/ConnectedTabs";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { validateTopology, getIssueCounts } from "@/lib/validation";
import { debounce } from "@/lib/utils";
import Link from "next/link";  type RightTab = "properties" | "validation" | "health" | "cost" | "config" | "security" | "failure" | "capacity" | "traffic" | "scenarios" | "versions" | "recommendations";

export function DesignerLayout() {
  const { currentProject, saveStatus, saveCurrentProject } = useProjectStore();
  const { nodes, edges, vlans, undo, redo, canUndo, canRedo } = useTopologyStore();
  const { validationResults, setValidationResults, showValidation, toggleValidation } = useUIStore();
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showPathPanel, setShowPathPanel] = useState(false);
  const [rightTab, setRightTab] = useState<RightTab>("properties");
  const exportRef = useRef<HTMLDivElement>(null);

  // Manual validation trigger
  const runValidation = useCallback(() => {
    const results = validateTopology(nodes, edges, vlans);
    setValidationResults(results);
    setRightTab("validation");
  }, [nodes, edges, vlans, setValidationResults]);

  // Auto-validate with debounce
  const debouncedValidationRef = useRef<ReturnType<typeof debounce> | null>(null);
  useEffect(() => {
    debouncedValidationRef.current = debounce(() => {
      const results = validateTopology(
        useTopologyStore.getState().nodes,
        useTopologyStore.getState().edges,
        useTopologyStore.getState().vlans
      );
      setValidationResults(results);
    }, 800);
    return () => { debouncedValidationRef.current = null; };
  }, [setValidationResults]);

  useEffect(() => {
    debouncedValidationRef.current?.();
  }, [nodes, edges, vlans]);

  // Auto-save with debounce
  const debouncedSaveRef = useRef<ReturnType<typeof debounce> | null>(null);
  useEffect(() => {
    debouncedSaveRef.current = debounce(() => {
      useProjectStore.getState().saveCurrentProject();
    }, 2000);
    return () => { debouncedSaveRef.current = null; };
  }, []);

  useEffect(() => {
    debouncedSaveRef.current?.();
  }, [nodes, edges, vlans]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;

      if (ctrl && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      if (ctrl && e.key === "z" && e.shiftKey) {
        e.preventDefault();
        redo();
      }
      if (ctrl && e.key === "s") {
        e.preventDefault();
        saveCurrentProject();
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [undo, redo, saveCurrentProject]);

  // Close export menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setShowExportMenu(false);
      }
    };
    if (showExportMenu) {
      document.addEventListener("mousedown", handler);
    }
    return () => document.removeEventListener("mousedown", handler);
  }, [showExportMenu]);

  const counts = validationResults ? getIssueCounts(validationResults.issues) : null;

  const handleExportJSON = () => {
    if (!currentProject) return;
    const data = {
      version: 1,
      project: {
        id: currentProject.id,
        name: currentProject.name,
        description: currentProject.description,
      },
      nodes,
      edges,
      vlans,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${currentProject.name.replace(/\s+/g, "-").toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  };

  const handleExportSVG = async () => {
    const svgEl = document.querySelector(".react-flow__viewport");
    if (!svgEl) return;
    const { toSvg } = await import("html-to-image");
    const svg = await toSvg(svgEl as HTMLElement, { backgroundColor: "#ffffff" });
    const link = document.createElement("a");
    link.download = `${currentProject?.name.replace(/\s+/g, "-").toLowerCase() || "topology"}.svg`;
    link.href = svg;
    link.click();
    setShowExportMenu(false);
  };

  const handleExportPNG = async () => {
    const svgEl = document.querySelector(".react-flow__viewport");
    if (!svgEl) return;
    const { toPng } = await import("html-to-image");
    const png = await toPng(svgEl as HTMLElement, { backgroundColor: "#ffffff" });
    const link = document.createElement("a");
    link.download = `${currentProject?.name.replace(/\s+/g, "-").toLowerCase() || "topology"}.png`;
    link.href = png;
    link.click();
    setShowExportMenu(false);
  };

  const handleImportJSON = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        if (!data.nodes || !data.edges) {
          alert("Invalid project file: missing nodes or edges");
          return;
        }
        const { loadFromProject } = useTopologyStore.getState();
        loadFromProject(data.nodes || [], data.edges || [], data.vlans || []);
        useProjectStore.getState().updateCurrentProject({
          nodes: data.nodes || [],
          edges: data.edges || [],
          vlans: data.vlans || [],
        });
      } catch {
        alert("Failed to import file. Please check the format.");
      }
    };
    input.click();
    setShowExportMenu(false);
  };

  const rightTabs: { key: RightTab; label: string; icon: React.ReactNode; badge?: number; group: string; shortLabel?: string }[] = [
    { key: "properties", label: "Properties", icon: null, group: "design", shortLabel: "Props" },
    {
      key: "validation",
      label: "Validate",
      icon: null,
      badge: counts ? counts.critical + counts.error : undefined,
      group: "analyze",
    },
    { key: "health", label: "Health Score", icon: <Activity className="w-3 h-3" />, group: "analyze" },
    { key: "security", label: "Security", icon: <Lock className="w-3 h-3" />, group: "analyze" },
    { key: "recommendations", label: "Recommendations", icon: <Lightbulb className="w-3 h-3" />, group: "analyze", shortLabel: "Recs" },
    { key: "failure", label: "Simulate Failure", icon: <Zap className="w-3 h-3" />, group: "simulate", shortLabel: "Simulate" },
    { key: "traffic", label: "Traffic Analysis", icon: <TrafficCone className="w-3 h-3" />, group: "analyze", shortLabel: "Traffic" },
    { key: "scenarios", label: "Scenarios", icon: <GitBranch className="w-3 h-3" />, group: "compare" },
    { key: "versions", label: "Version History", icon: <History className="w-3 h-3" />, group: "compare", shortLabel: "Versions" },
    { key: "capacity", label: "Capacity Planning", icon: <BarChart3 className="w-3 h-3" />, group: "analyze", shortLabel: "Capacity" },
    { key: "cost", label: "Cost Estimate", icon: <DollarSign className="w-3 h-3" />, group: "analyze", shortLabel: "Cost" },
    { key: "config", label: "Config Export", icon: <Code2 className="w-3 h-3" />, group: "analyze", shortLabel: "Config" },
  ];

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Command Palette */}
      <CommandPalette />

      {/* Onboarding Tour */}
      <OnboardingTour />

      {/* Toolbar */}
      <header className="h-12 border-b border-border flex items-center px-3 gap-2 shrink-0 z-20">
        <Link
          href="/projects"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex items-center gap-2">
          <Network className="w-4 h-4" />
          <span className="text-sm font-medium max-w-[200px] truncate">
            {currentProject?.name || "Untitled"}
          </span>
        </div>

        <div className="flex items-center gap-1 ml-4">
          <button
            onClick={undo}
            disabled={!canUndo()}
            className="p-1.5 rounded hover:bg-muted disabled:opacity-30 transition-colors"
            title="Undo (Ctrl+Z)"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            onClick={redo}
            disabled={!canRedo()}
            className="p-1.5 rounded hover:bg-muted disabled:opacity-30 transition-colors"
            title="Redo (Ctrl+Shift+Z)"
          >
            <Redo2 className="w-4 h-4" />
          </button>
        </div>

        {/* Command Palette hint */}
        <button
          onClick={() => {
            window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true }));
          }}
          className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground border border-border rounded px-2 py-1 hover:bg-muted transition-colors ml-2"
          title="Command Palette (Ctrl+K)"
        >
          <span className="text-[10px]">⌘K</span>
          <span>Commands</span>
        </button>

        <div className="ml-auto flex items-center gap-2">
          {/* Theme toggle */}
          <ThemeToggle />

          {/* Save status */}
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            {saveStatus === "saving" && (
              <>
                <Loader2 className="w-3 h-3 animate-spin" />
                Saving...
              </>
            )}
            {saveStatus === "saved" && (
              <>
                <CheckCircle2 className="w-3 h-3 text-green-500" />
                Saved
              </>
            )}
            {saveStatus === "unsaved" && "Unsaved"}
          </span>

          {/* Path visualization */}
          <button
            onClick={() => setShowPathPanel(!showPathPanel)}
            data-tour="paths-button"
            className={`text-sm px-3 py-1.5 rounded-md border transition-colors ${
              showPathPanel
                ? "bg-foreground text-background border-foreground"
                : "border-border hover:bg-muted"
            }`}
            title="Traffic Flow Analysis"
          >
            Paths
          </button>

          {/* Validate */}
          <button
            onClick={runValidation}
            data-tour="validate-button"
            className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 border border-border rounded-md hover:bg-muted transition-colors"
          >
            <Shield className="w-3.5 h-3.5" />
            Validate
          </button>

          {/* Export/Import */}
          <div className="relative" ref={exportRef}>
            {/* Hidden buttons for Command Palette to trigger */}
            <button data-export-json onClick={handleExportJSON} className="hidden" />
            <button data-export-png onClick={handleExportPNG} className="hidden" />
            <button data-import-json onClick={handleImportJSON} className="hidden" />

            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              data-tour="export-button"
              className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 bg-foreground text-background rounded-md font-medium hover:opacity-90 transition-opacity"
            >
              <Download className="w-3.5 h-3.5" />
              Export
            </button>
            {showExportMenu && (
              <div className="absolute right-0 top-full mt-1 bg-card border border-border rounded-md shadow-lg py-1 z-50 w-44">
                <button
                  onClick={handleExportJSON}
                  className="w-full text-left px-3 py-1.5 text-sm hover:bg-muted flex items-center gap-2"
                >
                  <FileJson className="w-3.5 h-3.5" />
                  Export JSON
                </button>
                <button
                  onClick={handleExportPNG}
                  className="w-full text-left px-3 py-1.5 text-sm hover:bg-muted flex items-center gap-2"
                >
                  <Image className="w-3.5 h-3.5" aria-hidden="true" />
                  Export PNG
                </button>
                <button
                  onClick={handleExportSVG}
                  className="w-full text-left px-3 py-1.5 text-sm hover:bg-muted flex items-center gap-2"
                >
                  <FileText className="w-3.5 h-3.5" />
                  Export SVG
                </button>
                <div className="border-t border-border my-1" />
                <button
                  onClick={handleImportJSON}
                  className="w-full text-left px-3 py-1.5 text-sm hover:bg-muted flex items-center gap-2"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Import JSON
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Device Library */}
        <aside
          className="w-56 border-r border-border bg-sidebar-bg overflow-y-auto shrink-0"
          data-tour="device-library"
        >
          <DeviceLibrary />
        </aside>

        {/* Canvas */}
        <div className="flex-1 relative" data-tour="canvas">
          <NetworkCanvas />

          {/* Path Visualization Overlay */}
          {showPathPanel && (
            <div className="absolute top-3 left-3 z-10 bg-card border border-border rounded-lg shadow-lg w-64 p-3">
              <PathVisualization />
            </div>
          )}
        </div>

        {/* Right Sidebar - Properties / Validation / Health / Cost / Config */}
        <aside className="w-72 border-l border-border bg-sidebar-bg overflow-y-auto shrink-0">
          <div className="border-b border-border">
            <div className="flex overflow-x-auto">
              {rightTabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setRightTab(tab.key)}
                  data-tour={`${tab.key}-tab`}
                  className={`min-w-0 py-2 text-[10px] font-medium border-b-2 transition-colors flex items-center justify-center gap-1 px-1.5 shrink-0 ${
                    rightTab === tab.key
                      ? "border-foreground text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                  title={tab.label}
                  aria-label={tab.label}
                >
                  {tab.icon}
                  <span className="truncate hidden xl:inline">{tab.label}</span>
                  <span className="truncate xl:hidden hidden lg:inline">{tab.shortLabel || tab.label}</span>
                  <span className="lg:hidden">{tab.icon && tab.key !== tab.label ? null : tab.shortLabel || tab.label.charAt(0)}</span>
                  {tab.badge !== undefined && tab.badge > 0 && (
                    <span className="px-1 py-0.5 text-[9px] bg-red-500/10 text-red-500 rounded-full font-bold">
                      {tab.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
          <div className="p-3">
            {rightTab === "properties" && <PropertiesPanel />}
            {rightTab === "validation" && <ValidationPanel />}
            {rightTab === "health" && <HealthScore />}
            {rightTab === "security" && <SecurityAnalysisPanel />}
            {rightTab === "failure" && (
              <FailureSimulationPanel onClose={() => setRightTab("health")} />
            )}
            {rightTab === "scenarios" && (
              <ScenarioPanel
                onLoadScenario={(scenario) => {
                  const { loadFromProject } = useTopologyStore.getState();
                  loadFromProject(scenario.nodes, scenario.edges, scenario.vlans);
                }}
              />
            )}
            {rightTab === "versions" && (
              <VersionHistoryPanel
                onRestore={(ver) => {
                  const { loadFromProject } = useTopologyStore.getState();
                  loadFromProject(ver.snapshot.nodes, ver.snapshot.edges, ver.snapshot.vlans);
                }}
              />
            )}
            {rightTab === "traffic" && <TrafficAnalysisPanel />}
            {rightTab === "capacity" && <CapacityPlanningPanel />}
            {rightTab === "cost" && <CostEstimatorPanel />}
            {rightTab === "config" && <ConfigExportPanel />}
            {rightTab === "recommendations" && <RecommendationsPanel />}
          </div>
        </aside>
      </div>

      {/* Bottom Status Bar */}
      <footer className="h-7 border-t border-border flex items-center px-3 text-[11px] text-muted-foreground shrink-0 gap-4">
        {/* Left: Theme toggle + project stats */}
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <span className="text-border">│</span>
          <span>{nodes.length} devices</span>
          <span>{edges.length} connections</span>
          {vlans.length > 0 && <span>{vlans.length} VLANs</span>}
        </div>

        {/* Right: Validation status + tabs */}
        {validationResults && (
          <span className="ml-auto">
            {validationResults.issues.length === 0
              ? "✓ No issues"
              : `${validationResults.issues.length} issue${validationResults.issues.length !== 1 ? "s" : ""}`}
          </span>
        )}
        {currentProject?.id && (
          <ConnectedTabs projectId={currentProject.id} />
        )}
      </footer>
    </div>
  );
}
