import { create } from "zustand";
import { NetworkNode, NetworkEdge, VLAN, HistoryEntry } from "@/types";
import { useProjectStore } from "./projectStore";

interface TopologyState {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  vlans: VLAN[];

  // History
  history: HistoryEntry[];
  historyIndex: number;
  maxHistorySize: number;

  // Actions
  setNodes: (nodes: NetworkNode[]) => void;
  setEdges: (edges: NetworkEdge[]) => void;
  addNode: (node: NetworkNode) => void;
  updateNode: (nodeId: string, data: Partial<NetworkNode["data"]>) => void;
  removeNodes: (nodeIds: string[]) => void;
  addEdge: (edge: NetworkEdge) => void;
  updateEdge: (edgeId: string, data: Partial<NetworkEdge["data"]>) => void;
  removeEdges: (edgeIds: string[]) => void;
  setVlans: (vlans: VLAN[]) => void;
  addVlan: (vlan: VLAN) => void;
  updateVlan: (vlanId: string, updates: Partial<VLAN>) => void;
  removeVlan: (vlanId: string) => void;
  assignDeviceToVlan: (vlanId: string, deviceId: string) => void;
  unassignDeviceFromVlan: (vlanId: string, deviceId: string) => void;

  // History
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  // Load
  loadFromProject: (nodes: NetworkNode[], edges: NetworkEdge[], vlans: VLAN[]) => void;

  // Clear
  clear: () => void;
}

export const useTopologyStore = create<TopologyState>((set, get) => ({
  nodes: [],
  edges: [],
  vlans: [],
  history: [],
  historyIndex: -1,
  maxHistorySize: 50,

  setNodes: (nodes) => {
    set({ nodes });
    get().pushHistory();
    useProjectStore.getState().updateCurrentProject({ nodes });
  },

  setEdges: (edges) => {
    set({ edges });
    get().pushHistory();
    useProjectStore.getState().updateCurrentProject({ edges });
  },

  addNode: (node) => {
    set((state) => ({ nodes: [...state.nodes, node] }));
    get().pushHistory();
    useProjectStore.getState().updateCurrentProject({ nodes: get().nodes });
  },

  updateNode: (nodeId: string, data: Partial<NetworkNode["data"]>) => {
    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === nodeId ? { ...n, data: { ...n.data, ...data } } as NetworkNode : n
      ),
    }));
    useProjectStore.getState().updateCurrentProject({ nodes: get().nodes });
  },

  removeNodes: (nodeIds) => {
    const nodeSet = new Set(nodeIds);
    set((state) => ({
      nodes: state.nodes.filter((n) => !nodeSet.has(n.id)),
      edges: state.edges.filter(
        (e) => !nodeSet.has(e.source) && !nodeSet.has(e.target)
      ),
    }));
    get().pushHistory();
    useProjectStore.getState().updateCurrentProject({
      nodes: get().nodes,
      edges: get().edges,
    });
  },

  addEdge: (edge: NetworkEdge) => {
    // Prevent duplicate edges
    const exists = get().edges.some(
      (e) =>
        (e.source === edge.source && e.target === edge.target) ||
        (e.source === edge.target && e.target === edge.source)
    );
    if (exists) return;
    set((state) => ({ edges: [...state.edges, edge] as NetworkEdge[] }));
    get().pushHistory();
    useProjectStore.getState().updateCurrentProject({ edges: get().edges });
  },

  updateEdge: (edgeId: string, data: Partial<NetworkEdge["data"]>) => {
    set((state) => ({
      edges: state.edges.map((e) =>
        e.id === edgeId ? { ...e, data: { ...e.data, ...data } } as NetworkEdge : e
      ),
    }));
    useProjectStore.getState().updateCurrentProject({ edges: get().edges });
  },

  removeEdges: (edgeIds) => {
    const edgeSet = new Set(edgeIds);
    set((state) => ({
      edges: state.edges.filter((e) => !edgeSet.has(e.id)),
    }));
    get().pushHistory();
    useProjectStore.getState().updateCurrentProject({ edges: get().edges });
  },

  setVlans: (vlans) => {
    set({ vlans });
    get().pushHistory();
    useProjectStore.getState().updateCurrentProject({ vlans });
  },

  addVlan: (vlan) => {
    set((state) => ({ vlans: [...state.vlans, vlan] }));
    get().pushHistory();
    useProjectStore.getState().updateCurrentProject({ vlans: get().vlans });
  },

  updateVlan: (vlanId, updates) => {
    set((state) => ({
      vlans: state.vlans.map((v) =>
        v.id === vlanId ? { ...v, ...updates } : v
      ),
    }));
    useProjectStore.getState().updateCurrentProject({ vlans: get().vlans });
  },

  removeVlan: (vlanId) => {
    set((state) => ({
      vlans: state.vlans.filter((v) => v.id !== vlanId),
    }));
    get().pushHistory();
    useProjectStore.getState().updateCurrentProject({ vlans: get().vlans });
  },

  assignDeviceToVlan: (vlanId, deviceId) => {
    set((state) => ({
      vlans: state.vlans.map((v) =>
        v.id === vlanId
          ? { ...v, deviceIds: [...new Set([...v.deviceIds, deviceId])] }
          : v
      ),
    }));
    useProjectStore.getState().updateCurrentProject({ vlans: get().vlans });
  },

  unassignDeviceFromVlan: (vlanId, deviceId) => {
    set((state) => ({
      vlans: state.vlans.map((v) =>
        v.id === vlanId
          ? { ...v, deviceIds: v.deviceIds.filter((id) => id !== deviceId) }
          : v
      ),
    }));
    useProjectStore.getState().updateCurrentProject({ vlans: get().vlans });
  },

  pushHistory: () => {
    const { nodes, edges, vlans, history, historyIndex, maxHistorySize } = get();
    const entry: HistoryEntry = {
      nodes: JSON.parse(JSON.stringify(nodes)),
      edges: JSON.parse(JSON.stringify(edges)),
      vlans: JSON.parse(JSON.stringify(vlans)),
      timestamp: Date.now(),
    };

    // Trim future entries if we've undone
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(entry);

    // Limit history size
    if (newHistory.length > maxHistorySize) {
      newHistory.shift();
    }

    set({
      history: newHistory,
      historyIndex: newHistory.length - 1,
    });
  },

  undo: () => {
    const { historyIndex, history } = get();
    if (historyIndex <= 0) return;
    const newIndex = historyIndex - 1;
    const entry = history[newIndex];
    set({
      nodes: JSON.parse(JSON.stringify(entry.nodes)),
      edges: JSON.parse(JSON.stringify(entry.edges)),
      vlans: JSON.parse(JSON.stringify(entry.vlans)),
      historyIndex: newIndex,
    });
    useProjectStore.getState().updateCurrentProject({
      nodes: get().nodes,
      edges: get().edges,
      vlans: get().vlans,
    });
  },

  redo: () => {
    const { historyIndex, history } = get();
    if (historyIndex >= history.length - 1) return;
    const newIndex = historyIndex + 1;
    const entry = history[newIndex];
    set({
      nodes: JSON.parse(JSON.stringify(entry.nodes)),
      edges: JSON.parse(JSON.stringify(entry.edges)),
      vlans: JSON.parse(JSON.stringify(entry.vlans)),
      historyIndex: newIndex,
    });
    useProjectStore.getState().updateCurrentProject({
      nodes: get().nodes,
      edges: get().edges,
      vlans: get().vlans,
    });
  },

  canUndo: () => get().historyIndex > 0,
  canRedo: () => get().historyIndex < get().history.length - 1,

  loadFromProject: (nodes, edges, vlans) => {
    set({
      nodes: JSON.parse(JSON.stringify(nodes)),
      edges: JSON.parse(JSON.stringify(edges)),
      vlans: JSON.parse(JSON.stringify(vlans)),
      history: [
        {
          nodes: JSON.parse(JSON.stringify(nodes)),
          edges: JSON.parse(JSON.stringify(edges)),
          vlans: JSON.parse(JSON.stringify(vlans)),
          timestamp: Date.now(),
        },
      ],
      historyIndex: 0,
    });
  },

  clear: () => {
    set({
      nodes: [],
      edges: [],
      vlans: [],
      history: [],
      historyIndex: -1,
    });
  },
}));
