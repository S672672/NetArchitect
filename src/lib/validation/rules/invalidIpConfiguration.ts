import { ValidationIssue } from "@/types";
import { ValidationContext, createIssueId } from "../types";
import {
  isValidIPv4,
  isValidCIDR,
  parseCIDR,
  isIPInSubnet,
  getNetworkAddress,
} from "@/lib/network/ip";

export const invalidIpConfigurationRule = (
  ctx: ValidationContext
): ValidationIssue[] => {
  const issues: ValidationIssue[] = [];
  const usedIPs: Map<string, string[]> = new Map(); // ip -> nodeIds

  for (const node of ctx.nodes) {
    const { config, label } = node.data;

    // Skip internet/cloud nodes
    if (node.data.deviceType === "internet" || node.data.deviceType === "cloud") continue;

    // Check IP address validity
    if (config.ipAddress && config.ipAddress.trim() !== "") {
      if (!isValidIPv4(config.ipAddress)) {
        issues.push({
          id: createIssueId(),
          severity: "error",
          title: `Invalid IP Address: ${label}`,
          description: `"${label}" has an invalid IP address "${config.ipAddress}".`,
          affectedNodeIds: [node.id],
          recommendation: `Enter a valid IPv4 address (e.g., 192.168.1.1).`,
          ruleId: "invalidIpConfiguration",
        });
      } else {
        // Check for duplicate IPs
        if (!usedIPs.has(config.ipAddress)) {
          usedIPs.set(config.ipAddress, []);
        }
        usedIPs.get(config.ipAddress)!.push(node.id);

        // Check IP is within subnet
        if (config.subnet && isValidCIDR(config.subnet)) {
          const parsed = parseCIDR(config.subnet);
          if (parsed) {
            const networkAddr = getNetworkAddress(parsed.ip, parsed.prefix);
            if (!isIPInSubnet(config.ipAddress, networkAddr, parsed.prefix)) {
              issues.push({
                id: createIssueId(),
                severity: "error",
                title: `IP Outside Subnet: ${label}`,
                description: `"${label}" has IP ${config.ipAddress} which is outside its configured subnet ${config.subnet}.`,
                affectedNodeIds: [node.id],
                recommendation: `Ensure the IP address is within the subnet range. Use the subnet calculator for reference.`,
                ruleId: "invalidIpConfiguration",
              });
            }
          }
        }
      }
    }

    // Check CIDR validity
    if (config.subnet && config.subnet.trim() !== "") {
      if (!isValidCIDR(config.subnet)) {
        issues.push({
          id: createIssueId(),
          severity: "error",
          title: `Invalid Subnet: ${label}`,
          description: `"${label}" has an invalid CIDR notation "${config.subnet}".`,
          affectedNodeIds: [node.id],
          recommendation: `Enter a valid CIDR (e.g., 192.168.1.0/24).`,
          ruleId: "invalidIpConfiguration",
        });
      }
    }

    // Check gateway validity
    if (config.gateway && config.gateway.trim() !== "") {
      if (!isValidIPv4(config.gateway)) {
        issues.push({
          id: createIssueId(),
          severity: "error",
          title: `Invalid Gateway: ${label}`,
          description: `"${label}" has an invalid gateway address "${config.gateway}".`,
          affectedNodeIds: [node.id],
          recommendation: `Enter a valid IPv4 gateway address.`,
          ruleId: "invalidIpConfiguration",
        });
      }
    }
  }

  // Report duplicate IPs
  for (const [ip, nodeIds] of usedIPs) {
    if (nodeIds.length > 1) {
      const nodeNames = nodeIds
        .map((id) => {
          const node = ctx.nodes.find((n) => n.id === id);
          return node ? node.data.label : id;
        })
        .join(", ");
      issues.push({
        id: createIssueId(),
        severity: "error",
        title: `Duplicate IP Address: ${ip}`,
        description: `Multiple devices share the same IP address ${ip}: ${nodeNames}. This will cause network conflicts.`,
        affectedNodeIds: nodeIds,
        recommendation: `Assign unique IP addresses to each device.`,
        ruleId: "invalidIpConfiguration",
      });
    }
  }

  return issues;
};
