import { ValidationIssue } from "@/types";
import { ValidationContext, createIssueId } from "../types";

export const vlanSegmentationRule = (ctx: ValidationContext): ValidationIssue[] => {
  const issues: ValidationIssue[] = [];

  if (ctx.nodes.length < 3) return issues;

  // Categorize devices by their VLAN assignments
  const vlanGroups: Map<number, string[]> = new Map();
  const noVlanDevices: { id: string; name: string; category: string }[] = [];

  for (const node of ctx.nodes) {
    if (node.data.deviceType === "internet" || node.data.deviceType === "cloud") continue;

    if (node.data.config.vlan) {
      const vlanId = node.data.config.vlan;
      if (!vlanGroups.has(vlanId)) vlanGroups.set(vlanId, []);
      vlanGroups.get(vlanId)!.push(node.id);
    } else {
      noVlanDevices.push({
        id: node.id,
        name: node.data.label,
        category: node.data.category,
      });
    }
  }

  // Check if different device categories are mixed in same VLAN
  const categories = new Set<string>();

  for (const node of ctx.nodes) {
    if (node.data.deviceType === "internet" || node.data.deviceType === "cloud") continue;
    if (node.data.config.vlan) {
      const vlanId = node.data.config.vlan;
      const group = vlanGroups.get(vlanId);
      if (group) {
        // Check if this VLAN has mixed categories
        for (const nodeId of group) {
          const groupNode = ctx.nodes.find((n) => n.id === nodeId);
          if (groupNode && groupNode.data.category !== node.data.category) {
            categories.add(node.data.category);
          }
        }
      }
    }
  }

  // If no VLANs are configured and we have multiple device types
  if (vlanGroups.size === 0 && ctx.nodes.length >= 4) {
    const deviceCategories = new Set(
      ctx.nodes
        .filter((n) => n.data.deviceType !== "internet" && n.data.deviceType !== "cloud")
        .map((n) => n.data.category)
    );

    if (deviceCategories.size >= 2) {
      issues.push({
        id: createIssueId(),
        severity: "warning",
        title: "No VLAN Segmentation",
        description: `The network has ${deviceCategories.size} different device categories (${Array.from(deviceCategories).join(", ")}) without any VLAN segmentation. All devices share the same broadcast domain.`,
        affectedNodeIds: ctx.nodes
          .filter((n) => n.data.deviceType !== "internet" && n.data.deviceType !== "cloud")
          .map((n) => n.id),
        recommendation:
          "Consider implementing VLANs to segment network traffic. Separate user devices, servers, IoT devices, and management traffic into different VLANs.",
        ruleId: "vlanSegmentation",
      });
    }
  }

  // Check for IoT devices without VLAN separation
  const iotNodes = ctx.nodes.filter((n) => n.data.deviceType === "iot-device");

  if (iotNodes.length > 0) {
    // Check if IoT devices share VLAN with other device types
    for (const iot of iotNodes) {
      if (iot.data.config.vlan) {
        const iotVlan = iot.data.config.vlan;
        const otherDevicesInSameVlan = ctx.nodes.filter(
          (n) =>
            n.id !== iot.id &&
            n.data.config.vlan === iotVlan &&
            n.data.deviceType !== "iot-device" &&
            n.data.deviceType !== "internet"
        );

        if (otherDevicesInSameVlan.length > 0) {
          issues.push({
            id: createIssueId(),
            severity: "warning",
            title: "IoT Devices in Mixed VLAN",
            description: `"${iot.data.label}" shares VLAN ${iotVlan} with ${otherDevicesInSameVlan.length} other non-IoT device(s). IoT devices often have weaker security.`,
            affectedNodeIds: [iot.id, ...otherDevicesInSameVlan.map((n) => n.id)],
            recommendation:
              "Place IoT devices in an isolated VLAN to reduce lateral movement risk. IoT devices are often less secure and should be segmented from critical infrastructure.",
            ruleId: "vlanSegmentation",
          });
          break; // Only report once
        }
      }
    }
  }

  // Check for unassigned devices that should have VLANs
  if (noVlanDevices.length > 2 && ctx.nodes.length >= 5) {
    const clientDevices = noVlanDevices.filter((d) => d.category === "client");
    const serverDevices = noVlanDevices.filter((d) => d.category === "infrastructure");

    if (clientDevices.length >= 2 && serverDevices.length >= 1) {
      issues.push({
        id: createIssueId(),
        severity: "info",
        title: "Consider VLAN Assignment",
        description: `${noVlanDevices.length} devices have no VLAN assignment. Consider assigning VLANs for better network segmentation and security.`,
        affectedNodeIds: noVlanDevices.map((d) => d.id),
        recommendation:
          "Assign VLANs to group devices by function: servers in a server VLAN, clients in a user VLAN, IoT in an isolated VLAN.",
        ruleId: "vlanSegmentation",
      });
    }
  }

  return issues;
};
