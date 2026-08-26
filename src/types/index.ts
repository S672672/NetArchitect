import { Node, Edge } from "@xyflow/react";

// ============================================================
// Device Types
// ============================================================

export type DeviceCategory =
  | "network"
  | "infrastructure"
  | "client"
  | "external";

export type NetworkDeviceType =
  | "router"
  | "l3-switch"
  | "l2-switch"
  | "firewall"
  | "wireless-ap"
  | "load-balancer";

export type InfrastructureDeviceType =
  | "server"
  | "database-server"
  | "application-server"
  | "dns-server";

export type ClientDeviceType =
  | "desktop"
  | "laptop"
  | "mobile-device"
  | "iot-device"
  | "printer";

export type ExternalDeviceType = "internet" | "cloud" | "vpn-gateway";

export type DeviceType =
  | NetworkDeviceType
  | InfrastructureDeviceType
  | ClientDeviceType
  | ExternalDeviceType;

export interface DeviceTypeInfo {
  type: DeviceType;
  label: string;
  category: DeviceCategory;
  icon: string;
  color: string;
  defaultPorts?: number;
  requiresGateway?: boolean;
  description: string;
}

export interface DeviceConfig {
  ipAddress?: string;
  subnet?: string;
  gateway?: string;
  vlan?: number;
  description?: string;
  macAddress?: string;
  dnsServers?: string[];
  adminPassword?: string;
  firmware?: string;
  portSpeed?: string;
}

// ============================================================
// Node & Edge Types
// ============================================================

export interface NetworkNodeData extends Record<string, unknown> {
  deviceType: DeviceType;
  label: string;
  config: DeviceConfig;
  category: DeviceCategory;
  icon: string;
  color: string;
}

export type NetworkNode = Node<NetworkNodeData, "network-device">;

export type ConnectionType = "ethernet" | "fiber" | "wireless" | "vpn" | "internet";

export type ConnectionStatus = "active" | "inactive" | "warning";

export interface NetworkEdgeData extends Record<string, unknown> {
  label?: string;
  connectionType: ConnectionType;
  bandwidth?: string;
  status: ConnectionStatus;
}

export type NetworkEdge = Edge<NetworkEdgeData>;

// ============================================================
// VLAN
// ============================================================

export interface VLAN {
  id: string;
  vlanId: number;
  name: string;
  subnet?: string;
  gateway?: string;
  description?: string;
  deviceIds: string[];
  color?: string;
}

// ============================================================
// Project
// ============================================================

export interface NetworkProject {
  id: string;
  name: string;
  description?: string;
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  vlans: VLAN[];
  createdAt: string;
  updatedAt: string;
  version: number;
}

// ============================================================
// Validation
// ============================================================

export type ValidationSeverity = "info" | "warning" | "error" | "critical";

export interface ValidationIssue {
  id: string;
  severity: ValidationSeverity;
  title: string;
  description: string;
  affectedNodeIds: string[];
  affectedEdgeIds?: string[];
  recommendation?: string;
  ruleId: string;
}

export interface ValidationResults {
  issues: ValidationIssue[];
  timestamp: string;
  nodeCount: number;
  edgeCount: number;
}

// ============================================================
// Subnet Calculator
// ============================================================

export interface SubnetInfo {
  networkAddress: string;
  broadcastAddress: string;
  firstUsable: string;
  lastUsable: string;
  totalAddresses: number;
  usableHosts: number;
  subnetMask: string;
  wildcardMask: string;
  cidr: number;
  binaryNetwork: string;
  binaryMask: string;
}

export interface SubnetSplit {
  original: SubnetInfo;
  subnets: SubnetInfo[];
}

// ============================================================
// Settings
// ============================================================

export type Theme = "light" | "dark" | "system";

export interface AppSettings {
  theme: Theme;
  autosaveEnabled: boolean;
  autosaveDelay: number;
  validationEnabled: boolean;
  showGrid: boolean;
  snapToGrid: boolean;
  gridSize: number;
}

// ============================================================
// History (Undo/Redo)
// ============================================================

export interface HistoryEntry {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  vlans: VLAN[];
  timestamp: number;
}

// ============================================================
// Device Library
// ============================================================

export interface DeviceTemplate {
  type: DeviceType;
  label: string;
  category: DeviceCategory;
  icon: string;
  color: string;
  description: string;
  defaultConfig?: Partial<DeviceConfig>;
}
