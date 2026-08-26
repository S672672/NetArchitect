/**
 * Architecture Versioning Engine
 * Create, manage, and compare architecture snapshots
 */
import { ArchitectureVersion, NetworkNode, NetworkEdge, VLAN, VersionDiff } from "@/types";

export function createVersion(
  projectId: string,
  version: string,
  name: string,
  nodes: NetworkNode[],
  edges: NetworkEdge[],
  vlans: VLAN[]
): ArchitectureVersion {
  return {
    id: `ver-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    projectId,
    version,
    name,
    snapshot: {
      nodes: JSON.parse(JSON.stringify(nodes)),
      edges: JSON.parse(JSON.stringify(edges)),
      vlans: JSON.parse(JSON.stringify(vlans)),
    },
    createdAt: new Date().toISOString(),
  };
}

export function compareVersions(
  from: ArchitectureVersion,
  to: ArchitectureVersion
): VersionDiff {
  const changes: VersionDiff["changes"] = [];

  // Compare nodes
  const fromNodeIds = new Set(from.snapshot.nodes.map(n => n.id));
  const toNodeIds = new Set(to.snapshot.nodes.map(n => n.id));

  for (const node of to.snapshot.nodes) {
    if (!fromNodeIds.has(node.id)) {
      changes.push({
        type: "added",
        entityType: "node",
        entityId: node.id,
        entityLabel: node.data.label,
      });
    }
  }

  for (const node of from.snapshot.nodes) {
    if (!toNodeIds.has(node.id)) {
      changes.push({
        type: "removed",
        entityType: "node",
        entityId: node.id,
        entityLabel: node.data.label,
      });
    }
  }

  for (const fn of from.snapshot.nodes) {
    const tn = to.snapshot.nodes.find(n => n.id === fn.id);
    if (tn) {
      const fnData = JSON.stringify(fn.data);
      const tnData = JSON.stringify(tn.data);
      if (fnData !== tnData) {
        // Determine what changed
        const details: string[] = [];
        if (fn.data.config.ipAddress !== tn.data.config.ipAddress) {
          details.push(`IP: ${fn.data.config.ipAddress || "none"} → ${tn.data.config.ipAddress || "none"}`);
        }
        if (fn.data.config.subnet !== tn.data.config.subnet) {
          details.push(`Subnet: ${fn.data.config.subnet || "none"} → ${tn.data.config.subnet || "none"}`);
        }
        if (fn.data.config.vlan !== tn.data.config.vlan) {
          details.push(`VLAN: ${fn.data.config.vlan || "none"} → ${tn.data.config.vlan || "none"}`);
        }
        if (fn.data.label !== tn.data.label) {
          details.push(`Name: ${fn.data.label} → ${tn.data.label}`);
        }

        changes.push({
          type: "modified",
          entityType: "node",
          entityId: fn.id,
          entityLabel: tn.data.label,
          details: details.length > 0 ? details.join(", ") : "Configuration changed",
        });
      }
    }
  }

  // Compare edges
  const fromEdgeIds = new Set(from.snapshot.edges.map(e => e.id));
  const toEdgeIds = new Set(to.snapshot.edges.map(e => e.id));

  for (const edge of to.snapshot.edges) {
    if (!fromEdgeIds.has(edge.id)) {
      changes.push({
        type: "added",
        entityType: "edge",
        entityId: edge.id,
        entityLabel: edge.data?.label || `Connection ${edge.source}→${edge.target}`,
      });
    }
  }

  for (const edge of from.snapshot.edges) {
    if (!toEdgeIds.has(edge.id)) {
      changes.push({
        type: "removed",
        entityType: "edge",
        entityId: edge.id,
        entityLabel: edge.data?.label || `Connection ${edge.source}→${edge.target}`,
      });
    }
  }

  // Compare VLANs
  const fromVlanIds = new Set(from.snapshot.vlans.map(v => v.id));
  const toVlanIds = new Set(to.snapshot.vlans.map(v => v.id));

  for (const vlan of to.snapshot.vlans) {
    if (!fromVlanIds.has(vlan.id)) {
      changes.push({
        type: "added",
        entityType: "vlan",
        entityId: vlan.id,
        entityLabel: `VLAN ${vlan.vlanId} — ${vlan.name}`,
      });
    }
  }

  for (const vlan of from.snapshot.vlans) {
    if (!toVlanIds.has(vlan.id)) {
      changes.push({
        type: "removed",
        entityType: "vlan",
        entityId: vlan.id,
        entityLabel: `VLAN ${vlan.vlanId} — ${vlan.name}`,
      });
    }
  }

  for (const fv of from.snapshot.vlans) {
    const tv = to.snapshot.vlans.find(v => v.id === fv.id);
    if (tv && JSON.stringify(fv) !== JSON.stringify(tv)) {
      changes.push({
        type: "modified",
        entityType: "vlan",
        entityId: fv.id,
        entityLabel: `VLAN ${fv.vlanId} — ${fv.name}`,
        details: "VLAN configuration changed",
      });
    }
  }

  return {
    fromVersion: from.version,
    toVersion: to.version,
    changes,
  };
}

export function getNextVersionNumber(existingVersions: ArchitectureVersion[]): string {
  if (existingVersions.length === 0) return "v1.0";

  const highest = existingVersions
    .map(v => {
      const match = v.version.match(/^v(\d+)\.(\d+)$/);
      if (match) return { major: parseInt(match[1]), minor: parseInt(match[2]) };
      return { major: 1, minor: 0 };
    })
    .sort((a, b) => a.major - b.major || a.minor - b.minor)
    .pop()!;

  return `v${highest.major}.${highest.minor + 1}`;
}
