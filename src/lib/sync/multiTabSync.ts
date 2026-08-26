/**
 * Multi-Tab Sync via BroadcastChannel
 * Real-time synchronization between browser tabs without any server
 * Uses BroadcastChannel API for cross-tab communication
 */
import { NetworkNode, NetworkEdge, VLAN } from "@/types";

type SyncMessage =
  | { type: "node-change"; nodes: NetworkNode[]; tabId: string; timestamp: number }
  | { type: "edge-change"; edges: NetworkEdge[]; tabId: string; timestamp: number }
  | { type: "vlan-change"; vlans: VLAN[]; tabId: string; timestamp: number }
  | { type: "full-sync"; nodes: NetworkNode[]; edges: NetworkEdge[]; vlans: VLAN[]; tabId: string; timestamp: number }
  | { type: "cursor-move"; position: { x: number; y: number }; label: string; tabId: string; timestamp: number }
  | { type: "tab-join"; tabId: string; label: string; timestamp: number }
  | { type: "tab-leave"; tabId: string; timestamp: number }
  | { type: "ping"; tabId: string; timestamp: number };

export interface ConnectedTab {
  tabId: string;
  label: string;
  lastSeen: number;
  cursorPosition?: { x: number; y: number };
  color: string;
}

const TAB_COLORS = [
  "#3b82f6", "#22c55e", "#f59e0b", "#ef4444",
  "#8b5cf6", "#ec4899", "#06b6d4", "#f97316",
];

class MultiTabSyncManager {
  private channel: BroadcastChannel | null = null;
  private tabId: string;
  private tabLabel: string;
  private connectedTabs: Map<string, ConnectedTab> = new Map();
  private listeners: Set<(tabs: ConnectedTab[]) => void> = new Set();
  private onNodeChange: ((nodes: NetworkNode[]) => void) | null = null;
  private onEdgeChange: ((edges: NetworkEdge[]) => void) | null = null;
  private onVlanChange: ((vlans: VLAN[]) => void) | null = null;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;
  private colorIndex = 0;

  constructor() {
    this.tabId = `tab-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    this.tabLabel = `Tab ${this.tabId.slice(-4).toUpperCase()}`;
    this.colorIndex = 0;
  }

  connect(projectId: string) {
    if (this.channel) this.disconnect();

    this.channel = new BroadcastChannel(`NetVerge-${projectId}`);

    this.channel.onmessage = (event: MessageEvent<SyncMessage>) => {
      this.handleMessage(event.data);
    };

    // Announce presence
    this.broadcast({
      type: "tab-join",
      tabId: this.tabId,
      label: this.tabLabel,
      timestamp: Date.now(),
    });

    // Heartbeat
    this.heartbeatInterval = setInterval(() => {
      this.broadcast({
        type: "ping",
        tabId: this.tabId,
        timestamp: Date.now(),
      });
    }, 3000);

    // Cleanup stale tabs
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      let changed = false;
      for (const [id, tab] of this.connectedTabs) {
        if (now - tab.lastSeen > 10000) {
          this.connectedTabs.delete(id);
          changed = true;
        }
      }
      if (changed) this.notifyListeners();
    }, 5000);
  }

  disconnect() {
    if (this.channel) {
      this.broadcast({
        type: "tab-leave",
        tabId: this.tabId,
        timestamp: Date.now(),
      });
      this.channel.close();
      this.channel = null;
    }
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    if (this.cleanupInterval) clearInterval(this.cleanupInterval);
  }

  private handleMessage(msg: SyncMessage) {
    if (msg.tabId === this.tabId) return;

    switch (msg.type) {
      case "tab-join":
        this.connectedTabs.set(msg.tabId, {
          tabId: msg.tabId,
          label: msg.label,
          lastSeen: msg.timestamp,
          color: TAB_COLORS[this.connectedTabs.size % TAB_COLORS.length],
        });
        this.notifyListeners();
        break;

      case "tab-leave":
        this.connectedTabs.delete(msg.tabId);
        this.notifyListeners();
        break;

      case "ping":
        if (this.connectedTabs.has(msg.tabId)) {
          this.connectedTabs.get(msg.tabId)!.lastSeen = msg.timestamp;
        }
        this.notifyListeners();
        break;

      case "node-change":
        this.onNodeChange?.(msg.nodes);
        break;

      case "edge-change":
        this.onEdgeChange?.(msg.edges);
        break;

      case "vlan-change":
        this.onVlanChange?.(msg.vlans);
        break;

      case "full-sync":
        this.onNodeChange?.(msg.nodes);
        this.onEdgeChange?.(msg.edges);
        this.onVlanChange?.(msg.vlans);
        break;

      case "cursor-move":
        if (this.connectedTabs.has(msg.tabId)) {
          const tab = this.connectedTabs.get(msg.tabId)!;
          tab.cursorPosition = msg.position;
          tab.lastSeen = msg.timestamp;
        }
        this.notifyListeners();
        break;
    }
  }

  private broadcast(msg: SyncMessage) {
    this.channel?.postMessage(msg);
  }

  sendNodeChange(nodes: NetworkNode[]) {
    this.broadcast({
      type: "node-change",
      nodes,
      tabId: this.tabId,
      timestamp: Date.now(),
    });
  }

  sendEdgeChange(edges: NetworkEdge[]) {
    this.broadcast({
      type: "edge-change",
      edges,
      tabId: this.tabId,
      timestamp: Date.now(),
    });
  }

  sendVlanChange(vlans: VLAN[]) {
    this.broadcast({
      type: "vlan-change",
      vlans,
      tabId: this.tabId,
      timestamp: Date.now(),
    });
  }

  sendCursorMove(position: { x: number; y: number }) {
    this.broadcast({
      type: "cursor-move",
      position,
      label: this.tabLabel,
      tabId: this.tabId,
      timestamp: Date.now(),
    });
  }

  requestFullSync() {
    this.broadcast({
      type: "ping",
      tabId: this.tabId,
      timestamp: Date.now(),
    });
  }

  onNodesChange(callback: (nodes: NetworkNode[]) => void) {
    this.onNodeChange = callback;
  }

  onEdgesChange(callback: (edges: NetworkEdge[]) => void) {
    this.onEdgeChange = callback;
  }

  onVlansChange(callback: (vlans: VLAN[]) => void) {
    this.onVlanChange = callback;
  }

  onTabsChange(callback: (tabs: ConnectedTab[]) => void) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notifyListeners() {
    const tabs = Array.from(this.connectedTabs.values());
    for (const listener of this.listeners) {
      listener(tabs);
    }
  }

  getConnectedTabs(): ConnectedTab[] {
    return Array.from(this.connectedTabs.values());
  }

  getTabId(): string {
    return this.tabId;
  }

  getTabLabel(): string {
    return this.tabLabel;
  }
}

// Singleton per project
let syncInstance: MultiTabSyncManager | null = null;

export function getSyncManager(): MultiTabSyncManager {
  if (!syncInstance) {
    syncInstance = new MultiTabSyncManager();
  }
  return syncInstance;
}

export function disconnectSync() {
  syncInstance?.disconnect();
  syncInstance = null;
}
