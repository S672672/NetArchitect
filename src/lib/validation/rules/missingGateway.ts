import { ValidationIssue } from "@/types";
import { ValidationContext, createIssueId } from "../types";
import { buildGraph, getDirectNeighbors } from "@/lib/graph/algorithms";
import { DEVICE_TYPES } from "@/lib/network/deviceTypes";

export const missingGatewayRule = (ctx: ValidationContext): ValidationIssue[] => {
  const issues: ValidationIssue[] = [];
  const graph = buildGraph(ctx.nodes, ctx.edges);

  for (const node of ctx.nodes) {
    const { config, label, deviceType, category } = node.data;

    // Only check devices that require gateways
    const deviceInfo = DEVICE_TYPES[deviceType];
    if (!deviceInfo?.requiresGateway) continue;

    // Skip if already has gateway
    if (config.gateway && config.gateway.trim() !== "") continue;

    // Skip if device is on the same subnet as a router/L3 switch
    const neighbors = getDirectNeighbors(graph, node.id);
    const hasRouterNeighbor = neighbors.some((neighborId) => {
      const neighborNode = ctx.nodes.find((n) => n.id === neighborId);
      if (!neighborNode) return false;
      const nType = neighborNode.data.deviceType;
      return nType === "router" || nType === "l3-switch" || nType === "firewall";
    });

    // Check if the device has an IP assigned (needed for routing)
    if (config.ipAddress && config.ipAddress.trim() !== "") {
      issues.push({
        id: createIssueId(),
        severity: hasRouterNeighbor ? "info" : "warning",
        title: `Missing Gateway: ${label}`,
        description: `"${label}" (${category}) has an IP address but no default gateway configured. Without a gateway, this device may not be able to communicate outside its local subnet.`,
        affectedNodeIds: [node.id],
        recommendation: hasRouterNeighbor
          ? `Set the gateway to the IP address of the connected router or L3 switch.`
          : `Connect this device to a router and configure the gateway address.`,
        ruleId: "missingGateway",
      });
    }
  }

  return issues;
};
