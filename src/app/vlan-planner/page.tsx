"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Network,
  ArrowLeft,
  Plus,
  Trash2,
  Layers,
  AlertTriangle,
  X,
} from "lucide-react";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { useTopologyStore } from "@/stores/topologyStore";
import { VLAN } from "@/types";
import { isValidCIDR, parseCIDR } from "@/lib/network/ip";
import { v4 as uuidv4 } from "uuid";

export default function VLANPlannerPage() {
  const { vlans, addVlan, updateVlan, removeVlan, nodes, assignDeviceToVlan, unassignDeviceFromVlan } =
    useTopologyStore();
  const [showAddDialog, setShowAddDialog] = useState(false);

  const issues = detectVlanIssues(vlans, nodes);

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center gap-3">
          <Link
            href="/projects"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <Link href="/" className="flex items-center gap-2">
            <Network className="w-4 h-4" />
            <span className="font-semibold text-sm">NetArchitect</span>
          </Link>
          <span className="text-sm text-muted-foreground">/ VLAN Planner</span>
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Layers className="w-6 h-6" />
            <div>
              <h1 className="text-2xl font-bold">VLAN Planner</h1>
              <p className="text-sm text-muted-foreground">
                Plan and manage VLAN segmentation
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowAddDialog(true)}
            className="inline-flex items-center gap-2 text-sm px-4 py-2 bg-foreground text-background rounded-md font-medium hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" />
            Add VLAN
          </button>
        </div>

        {/* Issues */}
        {issues.length > 0 && (
          <div className="mb-6 space-y-1">
            {issues.map((issue, i) => (
              <div
                key={i}
                className="flex items-start gap-2 p-3 rounded-md border border-yellow-500/20 bg-yellow-500/5 text-xs"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-yellow-600 mt-0.5 shrink-0" />
                <span className="text-yellow-700 dark:text-yellow-500">{issue}</span>
              </div>
            ))}
          </div>
        )}

        {/* VLAN List */}
        {vlans.length === 0 ? (
          <div className="text-center py-16">
            <Layers className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
            <h3 className="font-medium mb-1">No VLANs defined</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create VLANs to plan network segmentation
            </p>
            <button
              onClick={() => setShowAddDialog(true)}
              className="inline-flex items-center gap-2 text-sm px-4 py-2 bg-foreground text-background rounded-md"
            >
              <Plus className="w-4 h-4" />
              Add VLAN
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {vlans.map((vlan) => (
              <VLANCard
                key={vlan.id}
                vlan={vlan}
                nodes={nodes}
                onUpdate={(updates) => updateVlan(vlan.id, updates)}
                onDelete={() => removeVlan(vlan.id)}
                onAssignDevice={(deviceId) => assignDeviceToVlan(vlan.id, deviceId)}
                onUnassignDevice={(deviceId) => unassignDeviceFromVlan(vlan.id, deviceId)}
              />
            ))}
          </div>
        )}
      </main>

      {/* Add VLAN Dialog */}
      {showAddDialog && (
        <AddVLANDialog
          onClose={() => setShowAddDialog(false)}
          onAdd={(vlan) => {
            addVlan(vlan);
            setShowAddDialog(false);
          }}
          existingVlanIds={vlans.map((v) => v.vlanId)}
        />
      )}
    </div>
  );
}

function VLANCard({
  vlan,
  nodes,
  onUpdate,
  onDelete,
  onAssignDevice,
  onUnassignDevice,
}: {
  vlan: VLAN;
  nodes: { id: string; data: { label: string; deviceType: string } }[];
  onUpdate: (updates: Partial<VLAN>) => void;
  onDelete: () => void;
  onAssignDevice: (deviceId: string) => void;
  onUnassignDevice: (deviceId: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(vlan.name);
  const [subnet, setSubnet] = useState(vlan.subnet || "");
  const [gateway, setGateway] = useState(vlan.gateway || "");
  const [description, setDescription] = useState(vlan.description || "");

  const assignedDevices = nodes.filter((n) =>
    vlan.deviceIds.includes(n.id)
  );

  const unassignedDevices = nodes.filter(
    (n) =>
      !vlan.deviceIds.includes(n.id) &&
      n.data.deviceType !== "internet" &&
      n.data.deviceType !== "cloud"
  );

  const subnetValid = !subnet || isValidCIDR(subnet);

  const handleSave = () => {
    onUpdate({
      name,
      subnet: subnet || undefined,
      gateway: gateway || undefined,
      description: description || undefined,
    });
    setEditing(false);
  };

  return (
    <div className="border border-border rounded-lg bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-indigo-500/10 flex items-center justify-center">
            <span className="text-xs font-bold text-indigo-500">{vlan.vlanId}</span>
          </div>
          {editing ? (
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="text-sm font-medium px-2 py-0.5 border border-border rounded bg-background focus:outline-none"
            />
          ) : (
            <div>
              <h3 className="font-medium text-sm">{vlan.name}</h3>
              {vlan.description && (
                <p className="text-[11px] text-muted-foreground">{vlan.description}</p>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1">
          {editing ? (
            <>
              <button
                onClick={handleSave}
                className="text-xs px-2 py-1 bg-foreground text-background rounded hover:opacity-90"
              >
                Save
              </button>
              <button
                onClick={() => setEditing(false)}
                className="text-xs px-2 py-1 border border-border rounded hover:bg-muted"
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setEditing(true)}
                className="text-xs px-2 py-1 border border-border rounded hover:bg-muted"
              >
                Edit
              </button>
              <button
                onClick={onDelete}
                className="p-1 text-muted-foreground hover:text-red-500 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </div>

      {editing ? (
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div>
            <label className="text-[10px] text-muted-foreground block mb-0.5">Subnet</label>
            <input
              type="text"
              value={subnet}
              onChange={(e) => setSubnet(e.target.value)}
              placeholder="192.168.10.0/24"
              className={`w-full px-2 py-1.5 text-xs font-mono border rounded bg-background focus:outline-none ${
                !subnetValid ? "border-red-500" : "border-border"
              }`}
            />
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground block mb-0.5">Gateway</label>
            <input
              type="text"
              value={gateway}
              onChange={(e) => setGateway(e.target.value)}
              placeholder="192.168.10.1"
              className="w-full px-2 py-1.5 text-xs font-mono border border-border rounded bg-background focus:outline-none"
            />
          </div>
          <div className="col-span-2">
            <label className="text-[10px] text-muted-foreground block mb-0.5">Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
              className="w-full px-2 py-1.5 text-xs border border-border rounded bg-background focus:outline-none"
            />
          </div>
        </div>
      ) : (
        <div className="flex gap-4 text-xs text-muted-foreground mb-3">
          {vlan.subnet && <span className="font-mono">Subnet: {vlan.subnet}</span>}
          {vlan.gateway && <span className="font-mono">Gateway: {vlan.gateway}</span>}
          <span>{vlan.deviceIds.length} device(s)</span>
        </div>
      )}

      {/* Device Assignment */}
      <div className="flex gap-2 flex-wrap">
        {assignedDevices.map((d) => (
          <span
            key={d.id}
            className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-500/10 text-indigo-500 rounded text-[11px]"
          >
            {d.data.label}
            <button
              onClick={() => onUnassignDevice(d.id)}
              className="hover:text-red-500"
            >
              <X size={10} />
            </button>
          </span>
        ))}
        {unassignedDevices.length > 0 && (
          <select
            value=""
            onChange={(e) => {
              if (e.target.value) onAssignDevice(e.target.value);
            }}
            className="text-[11px] px-2 py-0.5 border border-dashed border-border rounded bg-transparent focus:outline-none"
          >
            <option value="">+ Add device</option>
            {unassignedDevices.map((d) => (
              <option key={d.id} value={d.id}>
                {d.data.label}
              </option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
}

function AddVLANDialog({
  onClose,
  onAdd,
  existingVlanIds,
}: {
  onClose: () => void;
  onAdd: (vlan: VLAN) => void;
  existingVlanIds: number[];
}) {
  const [vlanId, setVlanId] = useState(10);
  const [name, setName] = useState("");
  const [subnet, setSubnet] = useState("");
  const [gateway, setGateway] = useState("");
  const [description, setDescription] = useState("");

  const idExists = existingVlanIds.includes(vlanId);
  const subnetValid = !subnet || isValidCIDR(subnet);
  const canCreate = name.trim() && !idExists && subnetValid;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-card border border-border rounded-lg p-6 w-full max-w-sm mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Add VLAN</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground block mb-0.5">VLAN ID</label>
            <input
              type="number"
              value={vlanId}
              onChange={(e) => setVlanId(Number(e.target.value))}
              min={1}
              max={4094}
              className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-ring"
            />
            {idExists && (
              <p className="text-[11px] text-red-500 mt-0.5">VLAN ID already exists</p>
            )}
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-0.5">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Servers"
              className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-0.5">Subnet</label>
            <input
              type="text"
              value={subnet}
              onChange={(e) => setSubnet(e.target.value)}
              placeholder="192.168.10.0/24"
              className={`w-full px-3 py-2 text-sm font-mono border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-ring ${
                !subnetValid ? "border-red-500" : "border-border"
              }`}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-0.5">Gateway</label>
            <input
              type="text"
              value={gateway}
              onChange={(e) => setGateway(e.target.value)}
              placeholder="192.168.10.1"
              className="w-full px-3 py-2 text-sm font-mono border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-0.5">Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
              className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            className="text-sm px-3 py-1.5 border border-border rounded-md hover:bg-muted"
          >
            Cancel
          </button>
          <button
            onClick={() =>
              onAdd({
                id: uuidv4(),
                vlanId,
                name: name.trim(),
                subnet: subnet || undefined,
                gateway: gateway || undefined,
                description: description || undefined,
                deviceIds: [],
              })
            }
            disabled={!canCreate}
            className="text-sm px-3 py-1.5 bg-foreground text-background rounded-md font-medium hover:opacity-90 disabled:opacity-50"
          >
            Add VLAN
          </button>
        </div>
      </div>
    </div>
  );
}

function detectVlanIssues(
  vlans: VLAN[],
  nodes: { id: string; data: { deviceType: string } }[]
): string[] {
  const issues: string[] = [];

  // Check for duplicate VLAN IDs
  const ids = vlans.map((v) => v.vlanId);
  const duplicates = ids.filter((id, i) => ids.indexOf(id) !== i);
  if (duplicates.length > 0) {
    issues.push(
      `Duplicate VLAN ID(s): ${[...new Set(duplicates)].join(", ")}`
    );
  }

  // Check for invalid VLAN IDs
  for (const vlan of vlans) {
    if (vlan.vlanId < 1 || vlan.vlanId > 4094) {
      issues.push(
        `Invalid VLAN ID ${vlan.vlanId} for "${vlan.name}". Must be 1-4094.`
      );
    }
  }

  // Check for overlapping subnets
  for (let i = 0; i < vlans.length; i++) {
    for (let j = i + 1; j < vlans.length; j++) {
      const s1 = vlans[i].subnet;
      const s2 = vlans[j].subnet;
      if (s1 && s2) {
        const p1 = parseCIDR(s1);
        const p2 = parseCIDR(s2);
        if (p1 && p2 && p1.ip === p2.ip && p1.prefix === p2.prefix) {
          issues.push(
            `VLANs "${vlans[i].name}" and "${vlans[j].name}" share the same subnet: ${s1}`
          );
        }
      }
    }
  }

  return issues;
}
