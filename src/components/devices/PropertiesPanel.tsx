"use client";

import { useState, useCallback } from "react";
import { useTopologyStore } from "@/stores/topologyStore";
import { useUIStore } from "@/stores/uiStore";
import { DEVICE_TYPES } from "@/lib/network/deviceTypes";
import { isValidIPv4, isValidCIDR } from "@/lib/network/ip";
import { DeviceIcon } from "./DeviceIcon";
import { Trash2 } from "lucide-react";

export function PropertiesPanel() {
  const { nodes, updateNode, removeNodes, edges, removeEdges } = useTopologyStore();
  const { selectedNodeId } = useUIStore();

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);

  // Also check for selected edges
  const { selectedEdgeId } = useUIStore();
  const selectedEdge = edges.find((e) => e.id === selectedEdgeId);

  if (!selectedNode && !selectedEdge) {
    return (
      <div className="text-center py-8">
        <p className="text-xs text-muted-foreground">
          Select a device or connection to view its properties
        </p>
      </div>
    );
  }

  if (selectedEdge) {
    return <EdgeProperties key={selectedEdge.id} edgeId={selectedEdge.id} />;
  }

  if (selectedNode) {
    return <NodeProperties key={selectedNode.id} node={selectedNode as unknown as { id: string; data: { deviceType: string; label: string; config: Record<string, unknown>; category: string; icon: string; color: string } }} />;
  }

  return null;
}

function NodeProperties({ node }: { node: { id: string; data: { deviceType: string; label: string; config: Record<string, unknown>; category: string; icon: string; color: string } } }) {
  const topologyStore = useTopologyStore();
  const updateNode = topologyStore.updateNode as (nodeId: string, data: Partial<Record<string, unknown>>) => void;
  const edges = topologyStore.edges;
  const [config, setConfig] = useState({
    ipAddress: (node.data.config.ipAddress as string) || "",
    subnet: (node.data.config.subnet as string) || "",
    gateway: (node.data.config.gateway as string) || "",
    vlan: node.data.config.vlan !== undefined ? String(node.data.config.vlan) : "",
    description: (node.data.config.description as string) || "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = useCallback(
    (field: string, value: string) => {
      const newErrors = { ...errors };

      if (field === "ipAddress" && value) {
        if (!isValidIPv4(value)) {
          newErrors.ipAddress = "Invalid IPv4 address";
        } else {
          delete newErrors.ipAddress;
        }
      }
      if (field === "subnet" && value) {
        if (!isValidCIDR(value)) {
          newErrors.subnet = "Invalid CIDR (e.g., 192.168.1.0/24)";
        } else {
          delete newErrors.subnet;
        }
      }
      if (field === "gateway" && value) {
        if (!isValidIPv4(value)) {
          newErrors.gateway = "Invalid gateway address";
        } else {
          delete newErrors.gateway;
        }
      }
      if (field === "vlan" && value) {
        const num = parseInt(value, 10);
        if (isNaN(num) || num < 1 || num > 4094) {
          newErrors.vlan = "VLAN ID must be 1-4094";
        } else {
          delete newErrors.vlan;
        }
      }

      setErrors(newErrors);
    },
    [errors]
  );

  const handleChange = (field: string, value: string) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
    validate(field, value);
  };

  const handleBlur = (field: string) => {
    validate(field, config[field as keyof typeof config] || "");
    const value = config[field as keyof typeof config] || "";

    if (field === "vlan" && value) {
      const num = parseInt(value, 10);
      updateNode(node.id, {
        config: {
          ...node.data.config,
          vlan: isNaN(num) ? undefined : num,
        },
      });
    } else if (field === "description") {
      updateNode(node.id, {
        config: {
          ...node.data.config,
          description: value,
        },
      });
    } else if (value || value === "") {
      updateNode(node.id, {
        config: {
          ...node.data.config,
          [field]: value,
        },
      });
    }
  };

  const handleLabelChange = (value: string) => {
    updateNode(node.id, { label: value });
  };

  const handleDelete = () => {
    const connectedEdges = edges.filter(
      (e) => e.source === node.id || e.target === node.id
    );
    if (connectedEdges.length > 0) {
      topologyStore.removeEdges(connectedEdges.map((e) => e.id));
    }
    topologyStore.removeNodes([node.id]);
  };

  const info = DEVICE_TYPES[node.data.deviceType as keyof typeof DEVICE_TYPES];

  return (
    <div className="space-y-4">
      {/* Device Header */}
      <div className="flex items-center gap-3 pb-3 border-b border-border">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: node.data.color + "18" }}
        >
          <DeviceIcon icon={node.data.icon} size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <input
            type="text"
            value={node.data.label}
            onChange={(e) => handleLabelChange(e.target.value)}
            className="w-full font-medium text-sm bg-transparent border-none focus:outline-none"
          />
          <p className="text-[11px] text-muted-foreground">{info?.label || node.data.deviceType}</p>
        </div>
      </div>

      {/* Network Configuration */}
      <div>
        <h3 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider mb-2">
          Network Configuration
        </h3>
        <div className="space-y-2">
          <FieldInput
            label="IP Address"
            value={config.ipAddress}
            onChange={(v) => handleChange("ipAddress", v)}
            onBlur={() => handleBlur("ipAddress")}
            error={errors.ipAddress}
            placeholder="192.168.1.1"
          />
          <FieldInput
            label="Subnet"
            value={config.subnet}
            onChange={(v) => handleChange("subnet", v)}
            onBlur={() => handleBlur("subnet")}
            error={errors.subnet}
            placeholder="192.168.1.0/24"
          />
          <FieldInput
            label="Gateway"
            value={config.gateway}
            onChange={(v) => handleChange("gateway", v)}
            onBlur={() => handleBlur("gateway")}
            error={errors.gateway}
            placeholder="192.168.1.254"
          />
          <FieldInput
            label="VLAN"
            value={config.vlan}
            onChange={(v) => handleChange("vlan", v)}
            onBlur={() => handleBlur("vlan")}
            error={errors.vlan}
            placeholder="10"
          />
        </div>
      </div>

      {/* Description */}
      <div>
        <h3 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider mb-2">
          Description
        </h3>
        <textarea
          value={config.description}
          onChange={(e) => handleChange("description", e.target.value)}
          onBlur={() => handleBlur("description")}
          rows={2}
          placeholder="Optional description..."
          className="w-full px-2 py-1.5 text-xs border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-ring resize-none"
        />
      </div>

      {/* Delete */}
      <button
        onClick={handleDelete}
        className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs text-red-500 border border-red-500/20 rounded-md hover:bg-red-500/5 transition-colors"
      >
        <Trash2 className="w-3.5 h-3.5" />
        Delete Device
      </button>
    </div>
  );
}

function EdgeProperties({ edgeId }: { edgeId: string }) {
  const { edges, updateEdge, removeEdges } = useTopologyStore();
  const edge = edges.find((e) => e.id === edgeId);
  const [label, setLabel] = useState(edge?.data?.label || "");

  if (!edge) return null;

  return (
    <div className="space-y-4">
      <div className="pb-3 border-b border-border">
        <h3 className="font-medium text-sm">Connection</h3>
        <p className="text-[11px] text-muted-foreground">
          {edge.source} → {edge.target}
        </p>
      </div>

      <div>
        <h3 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider mb-2">
          Connection Type
        </h3>
        <select
          value={edge.data?.connectionType || "ethernet"}
          onChange={(e) =>
            updateEdge(edgeId, { connectionType: e.target.value as "ethernet" | "fiber" | "wireless" | "vpn" | "internet" })
          }
          className="w-full px-2 py-1.5 text-xs border border-border rounded-md bg-background focus:outline-none"
        >
          <option value="ethernet">Ethernet</option>
          <option value="fiber">Fiber</option>
          <option value="wireless">Wireless</option>
          <option value="vpn">VPN</option>
          <option value="internet">Internet</option>
        </select>
      </div>

      <div>
        <h3 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider mb-2">
          Label
        </h3>
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onBlur={() => updateEdge(edgeId, { label })}
          placeholder="Optional label..."
          className="w-full px-2 py-1.5 text-xs border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      <div>
        <h3 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider mb-2">
          Status
        </h3>
        <select
          value={edge.data?.status || "active"}
          onChange={(e) =>
            updateEdge(edgeId, { status: e.target.value as "active" | "inactive" | "warning" })
          }
          className="w-full px-2 py-1.5 text-xs border border-border rounded-md bg-background focus:outline-none"
        >
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="warning">Warning</option>
        </select>
      </div>

      <button
        onClick={() => removeEdges([edgeId])}
        className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs text-red-500 border border-red-500/20 rounded-md hover:bg-red-500/5 transition-colors"
      >
        Delete Connection
      </button>
    </div>
  );
}

function FieldInput({
  label,
  value,
  onChange,
  onBlur,
  error,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  error?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="text-[11px] text-muted-foreground mb-0.5 block">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        className={`w-full px-2 py-1.5 text-xs border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-ring ${
          error ? "border-red-500" : "border-border"
        }`}
      />
      {error && <p className="text-[10px] text-red-500 mt-0.5">{error}</p>}
    </div>
  );
}
