/**
 * Network Cost Estimator
 * Estimates equipment costs based on device types and connections
 * Uses real-world approximate pricing for network equipment
 */
import { NetworkNode, NetworkEdge } from "@/types";

// Approximate equipment costs in USD (mid-range enterprise pricing)
const DEVICE_COSTS: Record<string, number> = {
  router: 3500,
  "l3-switch": 5000,
  "l2-switch": 1500,
  firewall: 8000,
  "wireless-ap": 600,
  "load-balancer": 12000,
  server: 6000,
  "database-server": 15000,
  "application-server": 8000,
  "dns-server": 4000,
  desktop: 1200,
  laptop: 1500,
  "mobile-device": 800,
  "iot-device": 150,
  printer: 500,
  internet: 0,
  cloud: 0,
  "vpn-gateway": 3000,
};

// Connection type costs (cabling + installation, per link)
const CONNECTION_COSTS: Record<string, number> = {
  ethernet: 200,
  fiber: 800,
  wireless: 0,
  vpn: 0,
  internet: 500,
};

// Monthly recurring costs (hosting, licenses, cloud)
const MONTHLY_COSTS: Record<string, number> = {
  server: 200,
  "database-server": 500,
  "application-server": 300,
  "dns-server": 100,
  firewall: 300,
  "load-balancer": 500,
  "vpn-gateway": 150,
  cloud: 1000,
  internet: 500,
};

export interface CostBreakdown {
  devices: { id: string; name: string; type: string; cost: number }[];
  connections: { id: string; from: string; to: string; type: string; cost: number }[];
  totalDeviceCost: number;
  totalConnectionCost: number;
  totalUpfront: number;
  monthlyRecurring: number;
  annualRecurring: number;
  totalFirstYear: number;
  byCategory: Record<string, number>;
  byDeviceType: Record<string, number>;
  recommendations: string[];
}

export function estimateNetworkCost(
  nodes: NetworkNode[],
  edges: NetworkEdge[]
): CostBreakdown {
  const devices: CostBreakdown["devices"] = [];
  const connections: CostBreakdown["connections"] = [];
  const byCategory: Record<string, number> = {};
  const byDeviceType: Record<string, number> = {};
  let monthlyRecurring = 0;

  // Calculate device costs
  for (const node of nodes) {
    const cost = DEVICE_COSTS[node.data.deviceType] || 0;
    devices.push({
      id: node.id,
      name: node.data.label,
      type: node.data.deviceType,
      cost,
    });

    byCategory[node.data.category] =
      (byCategory[node.data.category] || 0) + cost;
    byDeviceType[node.data.deviceType] =
      (byDeviceType[node.data.deviceType] || 0) + cost;

    monthlyRecurring += MONTHLY_COSTS[node.data.deviceType] || 0;
  }

  // Calculate connection costs
  for (const edge of edges) {
    const src = nodes.find((n) => n.id === edge.source);
    const tgt = nodes.find((n) => n.id === edge.target);
    const cost = CONNECTION_COSTS[edge.data?.connectionType || "ethernet"] || 200;
    connections.push({
      id: edge.id,
      from: src?.data.label || "Unknown",
      to: tgt?.data.label || "Unknown",
      type: edge.data?.connectionType || "ethernet",
      cost,
    });
  }

  const totalDeviceCost = devices.reduce((sum, d) => sum + d.cost, 0);
  const totalConnectionCost = connections.reduce((sum, c) => sum + c.cost, 0);
  const totalUpfront = totalDeviceCost + totalConnectionCost;
  const annualRecurring = monthlyRecurring * 12;
  const totalFirstYear = totalUpfront + annualRecurring;

  // Generate recommendations
  const recommendations: string[] = [];

  const firewallCount = nodes.filter(
    (n) => n.data.deviceType === "firewall"
  ).length;
  if (firewallCount === 0) {
    recommendations.push(
      "Consider adding a firewall for perimeter security. Estimated cost: $8,000"
    );
  }

  const switchCount = nodes.filter(
    (n) => n.data.deviceType === "l2-switch" || n.data.deviceType === "l3-switch"
  ).length;
  if (nodes.length > 10 && switchCount < 2) {
    recommendations.push(
      "With " + nodes.length + " devices, consider adding more switches for better segmentation and redundancy."
    );
  }

  const serverCount = nodes.filter(
    (n) =>
      n.data.deviceType === "server" ||
      n.data.deviceType === "application-server"
  ).length;
  if (serverCount > 3) {
    recommendations.push(
      "Consider a load balancer (" + formatCost(12000) + ") to distribute traffic across your " + serverCount + " servers."
    );
  }

  const fiberCount = edges.filter(
    (e) => e.data?.connectionType === "fiber"
  ).length;
  const ethernetCount = edges.filter(
    (e) => e.data?.connectionType === "ethernet"
  ).length;
  if (ethernetCount > 5 && fiberCount === 0) {
    recommendations.push(
      "Consider upgrading backbone connections to fiber for higher throughput and lower latency."
    );
  }

  const backupFirewallCount = nodes.filter(
    (n) => n.data.deviceType === "firewall"
  ).length;
  if (backupFirewallCount === 1 && nodes.length > 5) {
    recommendations.push(
      "Single firewall detected. Adding a secondary firewall for HA (" + formatCost(8000) + ") eliminates a single point of failure."
    );
  }

  return {
    devices,
    connections,
    totalDeviceCost,
    totalConnectionCost,
    totalUpfront,
    monthlyRecurring,
    annualRecurring,
    totalFirstYear,
    byCategory,
    byDeviceType,
    recommendations,
  };
}

export function formatCost(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}
