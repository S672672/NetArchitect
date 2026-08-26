import { ValidationIssue } from "@/types";
import { ValidationContext, createIssueId } from "../types";
import { isValidCIDR, parseCIDR, doSubnetsOverlap } from "@/lib/network/ip";

export const subnetOverlapRule = (ctx: ValidationContext): ValidationIssue[] => {
  const issues: ValidationIssue[] = [];

  // Collect all valid subnets from nodes
  const subnets: { nodeId: string; nodeName: string; cidr: string }[] = [];
  for (const node of ctx.nodes) {
    if (node.data.config.subnet && isValidCIDR(node.data.config.subnet)) {
      subnets.push({
        nodeId: node.id,
        nodeName: node.data.label,
        cidr: node.data.config.subnet,
      });
    }
  }

  // Also check VLAN subnets
  for (const vlan of ctx.vlans) {
    if (vlan.subnet && isValidCIDR(vlan.subnet)) {
      subnets.push({
        nodeId: "",
        nodeName: `VLAN ${vlan.vlanId} (${vlan.name})`,
        cidr: vlan.subnet,
      });
    }
  }

  // Check for overlaps
  const checked = new Set<string>();
  for (let i = 0; i < subnets.length; i++) {
    for (let j = i + 1; j < subnets.length; j++) {
      const key = `${i}-${j}`;
      if (checked.has(key)) continue;
      checked.add(key);

      const parsed1 = parseCIDR(subnets[i].cidr);
      const parsed2 = parseCIDR(subnets[j].cidr);

      if (!parsed1 || !parsed2) continue;

      if (doSubnetsOverlap(parsed1.ip, parsed1.prefix, parsed2.ip, parsed2.prefix)) {
        // Check they're not the exact same subnet
        const sameNet =
          parsed1.ip === parsed2.ip && parsed1.prefix === parsed2.prefix;

        const affectedNodeIds = [subnets[i].nodeId, subnets[j].nodeId].filter(
          (id) => id !== ""
        );

        issues.push({
          id: createIssueId(),
          severity: sameNet ? "error" : "warning",
          title: `Subnet Overlap: ${subnets[i].cidr} ↔ ${subnets[j].cidr}`,
          description: `Subnets "${subnets[i].nodeName}" (${subnets[i].cidr}) and "${subnets[j].nodeName}" (${subnets[j].cidr}) overlap${sameNet ? " — they are identical" : ""}. This can cause routing conflicts.`,
          affectedNodeIds,
          recommendation: `Reassign IP subnets to avoid overlap. Use the subnet calculator to find non-overlapping ranges.`,
          ruleId: "subnetOverlap",
        });
      }
    }
  }

  return issues;
};
