import { DeviceTypeInfo, DeviceType, DeviceTemplate } from "@/types";

export const DEVICE_TYPES: Record<DeviceType, DeviceTypeInfo> = {
  // Network Devices
  router: {
    type: "router",
    label: "Router",
    category: "network",
    icon: "Router",
    color: "#3b82f6",
    defaultPorts: 4,
    requiresGateway: false,
    description: "Routes traffic between different networks",
  },
  "l3-switch": {
    type: "l3-switch",
    label: "Layer 3 Switch",
    category: "network",
    icon: "Network",
    color: "#6366f1",
    defaultPorts: 48,
    requiresGateway: false,
    description: "Layer 3 switch with routing capabilities",
  },
  "l2-switch": {
    type: "l2-switch",
    label: "Layer 2 Switch",
    category: "network",
    icon: "Network",
    color: "#8b5cf6",
    defaultPorts: 48,
    requiresGateway: false,
    description: "Layer 2 switching device",
  },
  firewall: {
    type: "firewall",
    label: "Firewall",
    category: "network",
    icon: "Shield",
    color: "#ef4444",
    defaultPorts: 8,
    requiresGateway: false,
    description: "Network security device that filters traffic",
  },
  "wireless-ap": {
    type: "wireless-ap",
    label: "Wireless AP",
    category: "network",
    icon: "Wifi",
    color: "#06b6d4",
    requiresGateway: true,
    description: "Wireless access point",
  },
  "load-balancer": {
    type: "load-balancer",
    label: "Load Balancer",
    category: "network",
    icon: "Scale",
    color: "#14b8a6",
    defaultPorts: 4,
    requiresGateway: false,
    description: "Distributes traffic across multiple servers",
  },

  // Infrastructure
  server: {
    type: "server",
    label: "Server",
    category: "infrastructure",
    icon: "Server",
    color: "#10b981",
    requiresGateway: true,
    description: "General-purpose server",
  },
  "database-server": {
    type: "database-server",
    label: "Database Server",
    category: "infrastructure",
    icon: "Database",
    color: "#059669",
    requiresGateway: true,
    description: "Database management server",
  },
  "application-server": {
    type: "application-server",
    label: "App Server",
    category: "infrastructure",
    icon: "Cpu",
    color: "#0d9488",
    requiresGateway: true,
    description: "Application processing server",
  },
  "dns-server": {
    type: "dns-server",
    label: "DNS Server",
    category: "infrastructure",
    icon: "Globe",
    color: "#0891b2",
    requiresGateway: true,
    description: "Domain Name System server",
  },

  // Clients
  desktop: {
    type: "desktop",
    label: "Desktop",
    category: "client",
    icon: "Monitor",
    color: "#f59e0b",
    requiresGateway: true,
    description: "Desktop computer",
  },
  laptop: {
    type: "laptop",
    label: "Laptop",
    category: "client",
    icon: "Laptop",
    color: "#d97706",
    requiresGateway: true,
    description: "Portable laptop computer",
  },
  "mobile-device": {
    type: "mobile-device",
    label: "Mobile",
    category: "client",
    icon: "Smartphone",
    color: "#b45309",
    requiresGateway: true,
    description: "Mobile device",
  },
  "iot-device": {
    type: "iot-device",
    label: "IoT Device",
    category: "client",
    icon: "Radio",
    color: "#92400e",
    requiresGateway: true,
    description: "Internet of Things device",
  },
  printer: {
    type: "printer",
    label: "Printer",
    category: "client",
    icon: "Printer",
    color: "#78716c",
    requiresGateway: true,
    description: "Network printer",
  },

  // External
  internet: {
    type: "internet",
    label: "Internet",
    category: "external",
    icon: "Globe",
    color: "#64748b",
    requiresGateway: false,
    description: "Internet / WAN connection",
  },
  cloud: {
    type: "cloud",
    label: "Cloud",
    category: "external",
    icon: "Cloud",
    color: "#94a3b8",
    requiresGateway: false,
    description: "Cloud service provider",
  },
  "vpn-gateway": {
    type: "vpn-gateway",
    label: "VPN Gateway",
    category: "external",
    icon: "Lock",
    color: "#475569",
    defaultPorts: 2,
    requiresGateway: false,
    description: "Virtual Private Network gateway",
  },
};

export const DEVICE_CATEGORIES = [
  {
    key: "network" as const,
    label: "Network Devices",
    types: ["router", "l3-switch", "l2-switch", "firewall", "wireless-ap", "load-balancer"] as DeviceType[],
  },
  {
    key: "infrastructure" as const,
    label: "Infrastructure",
    types: ["server", "database-server", "application-server", "dns-server"] as DeviceType[],
  },
  {
    key: "client" as const,
    label: "Clients",
    types: ["desktop", "laptop", "mobile-device", "iot-device", "printer"] as DeviceType[],
  },
  {
    key: "external" as const,
    label: "External",
    types: ["internet", "cloud", "vpn-gateway"] as DeviceType[],
  },
];

export function getDeviceTemplate(type: DeviceType): DeviceTemplate {
  const info = DEVICE_TYPES[type];
  return {
    type: info.type,
    label: info.label,
    category: info.category,
    icon: info.icon,
    color: info.color,
    description: info.description,
  };
}

let deviceCounters: Record<string, number> = {};

export function generateDeviceName(type: DeviceType): string {
  const info = DEVICE_TYPES[type];
  const prefix = info.label;
  deviceCounters[type] = (deviceCounters[type] || 0) + 1;
  return `${prefix} ${deviceCounters[type]}`;
}

export function resetDeviceCounters(): void {
  deviceCounters = {};
}
