"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { DEVICE_CATEGORIES, DEVICE_TYPES } from "@/lib/network/deviceTypes";
import { DeviceIcon } from "./DeviceIcon";
import { DeviceType, NetworkNode } from "@/types";
import { useTopologyStore } from "@/stores/topologyStore";
import { v4 as uuidv4 } from "uuid";

export function DeviceLibrary() {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    network: true,
    infrastructure: true,
    client: true,
    external: false,
  });

  const toggleCategory = (key: string) => {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const onDragStart = (event: React.DragEvent, type: DeviceType) => {
    event.dataTransfer.setData("application/device-type", type);
    event.dataTransfer.effectAllowed = "move";
  };

  const addDeviceToCanvas = (type: DeviceType) => {
    const info = DEVICE_TYPES[type];
    const topoNodes = useTopologyStore.getState().nodes;
    const nodeCount = topoNodes.length;

    // Place new device in a spread pattern near center
    const col = nodeCount % 5;
    const row = Math.floor(nodeCount / 5);
    const position = {
      x: 250 + col * 160,
      y: 150 + row * 160,
    };

    const newNode: NetworkNode = {
      id: uuidv4(),
      type: "network-device",
      position,
      data: {
        deviceType: type,
        label: `${info.label} ${nodeCount + 1}`,
        config: {},
        category: info.category,
        icon: info.icon,
        color: info.color,
      },
    };

    useTopologyStore.getState().addNode(newNode);
  };

  return (
    <div className="p-3">
      <h2 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider mb-3 px-1">
        Device Library
      </h2>

      {DEVICE_CATEGORIES.map((category) => (
        <div key={category.key} className="mb-1">
          <button
            onClick={() => toggleCategory(category.key)}
            className="w-full flex items-center gap-1 px-1 py-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            {expanded[category.key] ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronRight className="w-3 h-3" />
            )}
            {category.label}
          </button>

          {expanded[category.key] && (
            <div className="ml-1 space-y-0.5">
              {category.types.map((type) => {
                const info = DEVICE_TYPES[type];
                return (
                  <div
                    key={type}
                    draggable
                    onDragStart={(e) => onDragStart(e, type)}
                    onClick={() => addDeviceToCanvas(type)}
                    className="device-library-item"
                  >
                    <DeviceIcon
                      icon={info.icon}
                      size={16}
                      className="shrink-0"
                    />
                    <span className="text-muted-foreground">{info.label}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}

      {/* Shortcuts info */}
      <div className="mt-6 px-1">
        <h3 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider mb-2">
          Shortcuts
        </h3>
        <div className="space-y-1 text-[11px] text-muted-foreground">
          <div className="flex justify-between">
            <span>Delete</span>
            <span><kbd className="kbd">Del</kbd></span>
          </div>
          <div className="flex justify-between">
            <span>Undo</span>
            <span><kbd className="kbd">⌘Z</kbd></span>
          </div>
          <div className="flex justify-between">
            <span>Redo</span>
            <span><kbd className="kbd">⌘⇧Z</kbd></span>
          </div>
          <div className="flex justify-between">
            <span>Save</span>
            <span><kbd className="kbd">⌘S</kbd></span>
          </div>
        </div>
      </div>
    </div>
  );
}
