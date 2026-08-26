import { create } from "zustand";
import { ValidationResults } from "@/types";

interface UIState {
  // Selection
  selectedNodeId: string | null;
  selectedEdgeId: string | null;

  // Panels
  showDeviceLibrary: boolean;
  showProperties: boolean;
  showValidation: boolean;
  validationPanelExpanded: boolean;

  // Validation
  validationResults: ValidationResults | null;
  validationFilter: "all" | "critical" | "error" | "warning" | "info";

  // Sidebar
  sidebarTab: "devices" | "vlans" | "validation";

  // Path visualization
  pathSourceId: string | null;
  pathTargetId: string | null;
  highlightedPath: string[];
  showPathVisualization: boolean;

  // Actions
  selectNode: (nodeId: string | null) => void;
  selectEdge: (edgeId: string | null) => void;
  clearSelection: () => void;
  toggleDeviceLibrary: () => void;
  toggleProperties: () => void;
  toggleValidation: () => void;
  setValidationResults: (results: ValidationResults | null) => void;
  setValidationFilter: (filter: UIState["validationFilter"]) => void;
  setSidebarTab: (tab: UIState["sidebarTab"]) => void;
  setPathSource: (id: string | null) => void;
  setPathTarget: (id: string | null) => void;
  setHighlightedPath: (path: string[]) => void;
  setShowPathVisualization: (show: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  selectedNodeId: null,
  selectedEdgeId: null,
  showDeviceLibrary: true,
  showProperties: true,
  showValidation: true,
  validationPanelExpanded: true,
  validationResults: null,
  validationFilter: "all",
  sidebarTab: "devices",
  pathSourceId: null,
  pathTargetId: null,
  highlightedPath: [],
  showPathVisualization: false,

  selectNode: (nodeId) =>
    set({ selectedNodeId: nodeId, selectedEdgeId: null }),
  selectEdge: (edgeId) =>
    set({ selectedEdgeId: edgeId, selectedNodeId: null }),
  clearSelection: () =>
    set({ selectedNodeId: null, selectedEdgeId: null }),
  toggleDeviceLibrary: () =>
    set((s) => ({ showDeviceLibrary: !s.showDeviceLibrary })),
  toggleProperties: () =>
    set((s) => ({ showProperties: !s.showProperties })),
  toggleValidation: () =>
    set((s) => ({ showValidation: !s.showValidation, validationPanelExpanded: !s.showValidation })),
  setValidationResults: (results) => set({ validationResults: results }),
  setValidationFilter: (filter) => set({ validationFilter: filter }),
  setSidebarTab: (tab) => set({ sidebarTab: tab }),
  setPathSource: (id) => set({ pathSourceId: id }),
  setPathTarget: (id) => set({ pathTargetId: id }),
  setHighlightedPath: (path) => set({ highlightedPath: path }),
  setShowPathVisualization: (show) => set({ showPathVisualization: show }),
}));
