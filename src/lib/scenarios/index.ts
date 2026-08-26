/**
 * Architecture Scenario Comparison Engine
 * Compares two topology snapshots and detects structural differences
 */
import { NetworkNode, NetworkEdge, VLAN, ArchitectureScenario, ScenarioDiff } from "@/types";

export function createScenario(
  projectId: string,
  name: string,
  nodes: NetworkNode[],
  edges: NetworkEdge[],
  vlans: VLAN[]
): ArchitectureScenario {
  return {
    id: `scenario-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    projectId,
    name,
    nodes: JSON.parse(JSON.stringify(nodes)),
    edges: JSON.parse(JSON.stringify(edges)),
    vlans: JSON.parse(JSON.stringify(vlans)),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function compareScenarios(
  current: { nodes: NetworkNode[]; edges: NetworkEdge[]; vlans: VLAN[] },
  proposed: { nodes: NetworkNode[]; edges: NetworkEdge[]; vlans: VLAN[] }
): ScenarioDiff {
  const currentNodeIds = new Set(current.nodes.map(n => n.id));
  const proposedNodeIds = new Set(proposed.nodes.map(n => n.id));

  const addedNodeIds = proposed.nodes.filter(n => !currentNodeIds.has(n.id)).map(n => n.id);
  const removedNodeIds = current.nodes.filter(n => !proposedNodeIds.has(n.id)).map(n => n.id);
  const modifiedNodeIds: string[] = [];

  for (const cn of current.nodes) {
    const pn = proposed.nodes.find(n => n.id === cn.id);
    if (pn && JSON.stringify(cn.data) !== JSON.stringify(pn.data)) {
      modifiedNodeIds.push(cn.id);
    }
  }

  const currentEdgeIds = new Set(current.edges.map(e => e.id));
  const proposedEdgeIds = new Set(proposed.edges.map(e => e.id));

  const addedEdgeIds = proposed.edges.filter(e => !currentEdgeIds.has(e.id)).map(e => e.id);
  const removedEdgeIds = current.edges.filter(e => !proposedEdgeIds.has(e.id)).map(e => e.id);
  const modifiedEdgeIds: string[] = [];

  for (const ce of current.edges) {
    const pe = proposed.edges.find(e => e.id === ce.id);
    if (pe && JSON.stringify(ce.data) !== JSON.stringify(pe.data)) {
      modifiedEdgeIds.push(ce.id);
    }
  }

  const currentVlanIds = new Set(current.vlans.map(v => v.id));
  const proposedVlanIds = new Set(proposed.vlans.map(v => v.id));

  const addedVlanIds = proposed.vlans.filter(v => !currentVlanIds.has(v.id)).map(v => v.id);
  const removedVlanIds = current.vlans.filter(v => !proposedVlanIds.has(v.id)).map(v => v.id);
  const modifiedVlanIds: string[] = [];

  for (const cv of current.vlans) {
    const pv = proposed.vlans.find(v => v.id === cv.id);
    if (pv && JSON.stringify(cv) !== JSON.stringify(pv)) {
      modifiedVlanIds.push(cv.id);
    }
  }

  return {
    addedNodeIds,
    removedNodeIds,
    modifiedNodeIds,
    addedEdgeIds,
    removedEdgeIds,
    modifiedEdgeIds,
    addedVlanIds,
    removedVlanIds,
    modifiedVlanIds,
  };
}

export function formatDiffSummary(
  diff: ScenarioDiff,
  currentNodes: NetworkNode[],
  proposedNodes: NetworkNode[],
  currentVlans: VLAN[],
  proposedVlans: VLAN[]
): string[] {
  const lines: string[] = [];

  for (const id of diff.addedNodeIds) {
    const node = proposedNodes.find(n => n.id === id);
    lines.push(`+ Added ${node?.data.label || "Unknown device"}`);
  }

  for (const id of diff.removedNodeIds) {
    const node = currentNodes.find(n => n.id === id);
    lines.push(`- Removed ${node?.data.label || "Unknown device"}`);
  }

  for (const id of diff.modifiedNodeIds) {
    const node = proposedNodes.find(n => n.id === id);
    lines.push(`~ Modified ${node?.data.label || "Unknown device"}`);
  }

  for (const id of diff.addedVlanIds) {
    const vlan = proposedVlans.find(v => v.id === id);
    lines.push(`+ Added VLAN ${vlan?.vlanId} — ${vlan?.name || "Unknown"}`);
  }

  for (const id of diff.removedVlanIds) {
    const vlan = currentVlans.find(v => v.id === id);
    lines.push(`- Removed VLAN ${vlan?.vlanId} — ${vlan?.name || "Unknown"}`);
  }

  if (diff.addedEdgeIds.length > 0) {
    lines.push(`+ Added ${diff.addedEdgeIds.length} connection(s)`);
  }
  if (diff.removedEdgeIds.length > 0) {
    lines.push(`- Removed ${diff.removedEdgeIds.length} connection(s)`);
  }

  return lines;
}
