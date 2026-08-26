"use client";

import { memo, useCallback } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { NetworkNodeData } from "@/types";
import { DeviceIcon } from "./DeviceIcon";
import { useTopologyStore } from "@/stores/topologyStore";
import { X } from "lucide-react";

interface DeviceNodeProps extends NodeProps {
  data: NetworkNodeData;
}

function DeviceNodeComponent({ data, selected, id }: DeviceNodeProps) {
  const hasIp = data.config.ipAddress && data.config.ipAddress.trim() !== "";
  const isExternal =
    data.deviceType === "internet" || data.deviceType === "cloud";

  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!id) return;
      const store = useTopologyStore.getState();
      // Remove connected edges
      const connectedEdges = store.edges.filter(
        (edge) => edge.source === id || edge.target === id
      );
      if (connectedEdges.length > 0) {
        store.removeEdges(connectedEdges.map((e) => e.id));
      }
      store.removeNodes([id]);
    },
    [id]
  );

  return (
    <div
      className={`network-device-node group relative ${selected ? "ring-2 ring-info" : ""}`}
      style={{ borderColor: selected ? undefined : data.color + "40" }}
    >
      {/* Delete button - only visible when selected */}
      {selected && (
        <button
          onClick={handleDelete}
          className="absolute -top-2.5 -right-2.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center z-10 hover:bg-red-600 transition-colors shadow-md"
          title="Delete device"
        >
          <X size={10} strokeWidth={3} />
        </button>
      )}

      {!isExternal && (
        <Handle
          type="target"
          position={Position.Top}
          className="!w-2.5 !h-2.5 !bg-muted-foreground !border-2 !border-card"
        />
      )}

      <div className="flex flex-col items-center gap-1">
        <div
          className="flex items-center justify-center w-8 h-8 rounded-md"
          style={{ backgroundColor: data.color + "18" }}
        >
          <DeviceIcon icon={data.icon} size={18} style={{ color: data.color }} />
        </div>
        <span className="text-xs font-medium text-foreground leading-tight max-w-[100px] truncate">
          {data.label}
        </span>
        {hasIp && (
          <span className="text-[10px] text-muted-foreground font-mono">
            {data.config.ipAddress}
          </span>
        )}
        {data.config.vlan !== undefined && data.config.vlan !== null && (
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-accent text-accent-foreground font-medium">
            VLAN {data.config.vlan}
          </span>
        )}
      </div>

      {!isExternal && (
        <Handle
          type="source"
          position={Position.Bottom}
          className="!w-2.5 !h-2.5 !bg-muted-foreground !border-2 !border-card"
        />
      )}

      {/* Extra handles for better connection UX */}
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        className="!w-2 !h-2 !bg-muted-foreground/50 !border-2 !border-card opacity-0 group-hover:opacity-100 transition-opacity"
      />
      <Handle
        type="target"
        position={Position.Right}
        id="right"
        className="!w-2 !h-2 !bg-muted-foreground/50 !border-2 !border-card opacity-0 group-hover:opacity-100 transition-opacity"
      />
      <Handle
        type="source"
        position={Position.Left}
        id="left-source"
        className="!w-2 !h-2 !bg-muted-foreground/50 !border-2 !border-card opacity-0 group-hover:opacity-100 transition-opacity"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right-source"
        className="!w-2 !h-2 !bg-muted-foreground/50 !border-2 !border-card opacity-0 group-hover:opacity-100 transition-opacity"
      />
    </div>
  );
}

export const DeviceNode = memo(DeviceNodeComponent);
