"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  Search,
  Network,
  Shield,
  Calculator,
  Layers,
  Download,
  Upload,
  Undo2,
  Redo2,
  Trash2,
  Copy,
  Plus,
  GitBranch,
  Settings,
  FileJson,
  Image,
  Zap,
  Keyboard,
  Moon,
  Sun,
  Monitor,
  Layout,
  ArrowRight,
  Box,
  Globe,
} from "lucide-react";
import { useTopologyStore } from "@/stores/topologyStore";
import { useUIStore } from "@/stores/uiStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useProjectStore } from "@/stores/projectStore";
import { DEVICE_TYPES } from "@/lib/network/deviceTypes";
import { DeviceType, NetworkNode } from "@/types";
import { v4 as uuidv4 } from "uuid";

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon: React.ReactNode;
  category: string;
  keywords: string[];
  action: () => void;
  shortcut?: string;
}

function fuzzyMatch(query: string, text: string): boolean {
  const q = query.toLowerCase();
  const t = text.toLowerCase();
  if (t.includes(q)) return true;
  // Fuzzy: all query chars appear in order
  let qi = 0;
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) qi++;
  }
  return qi === q.length;
}

function scoreMatch(query: string, text: string): number {
  const q = query.toLowerCase();
  const t = text.toLowerCase();
  if (t === q) return 100;
  if (t.startsWith(q)) return 90;
  if (t.includes(q)) return 70;
  // Fuzzy score
  let qi = 0;
  let score = 0;
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) {
      score += ti === 0 ? 10 : 5;
      qi++;
    }
  }
  return qi === q.length ? score : 0;
}

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const { nodes, addNode, undo, redo, canUndo, canRedo, removeNodes } =
    useTopologyStore();
  const {
    toggleValidation,
    setValidationResults,
    selectedNodeId,
    clearSelection,
    showPathVisualization,
    setShowPathVisualization,
  } = useUIStore();
  const { theme, setTheme } = useSettingsStore();
  const { saveCurrentProject } = useProjectStore();

  // Build command items
  const commands: CommandItem[] = useMemo(() => {
    const items: CommandItem[] = [];

    // --- Actions ---
    items.push({
      id: "validate",
      label: "Validate Topology",
      description: "Run all validation rules on the current network",
      icon: <Shield className="w-4 h-4" />,
      category: "Actions",
      keywords: ["validate", "check", "analyze", "rules", "security"],
      action: () => {
        const { nodes, edges, vlans } = useTopologyStore.getState();
        const { validateTopology } = require("@/lib/validation");
        setValidationResults(validateTopology(nodes, edges, vlans));
      },
      shortcut: "",
    });

    items.push({
      id: "save",
      label: "Save Project",
      description: "Manually save to IndexedDB",
      icon: <Download className="w-4 h-4" />,
      category: "Actions",
      keywords: ["save", "persist", "store", "indexeddb"],
      action: () => saveCurrentProject(),
      shortcut: "⌘S",
    });

    items.push({
      id: "undo",
      label: "Undo",
      description: "Undo the last action",
      icon: <Undo2 className="w-4 h-4" />,
      category: "Actions",
      keywords: ["undo", "back", "revert"],
      action: undo,
      shortcut: "⌘Z",
    });

    items.push({
      id: "redo",
      label: "Redo",
      description: "Redo the last undone action",
      icon: <Redo2 className="w-4 h-4" />,
      category: "Actions",
      keywords: ["redo", "forward", "revert"],
      action: redo,
      shortcut: "⌘⇧Z",
    });

    items.push({
      id: "export-json",
      label: "Export as JSON",
      description: "Download the full project as a JSON file",
      icon: <FileJson className="w-4 h-4" />,
      category: "Export",
      keywords: ["export", "json", "download", "backup", "save file"],
      action: () => document.querySelector<HTMLButtonElement>("[data-export-json]")?.click(),
    });

    items.push({
      id: "export-png",
      label: "Export as PNG",
      description: "Export the canvas as a PNG image",
      icon: <Image className="w-4 h-4" />,
      category: "Export",
      keywords: ["export", "png", "image", "screenshot", "download"],
      action: () => document.querySelector<HTMLButtonElement>("[data-export-png]")?.click(),
    });

    items.push({
      id: "import-json",
      label: "Import JSON Project",
      description: "Load a project from a JSON file",
      icon: <Upload className="w-4 h-4" />,
      category: "Import",
      keywords: ["import", "json", "load", "open"],
      action: () => document.querySelector<HTMLButtonElement>("[data-import-json]")?.click(),
    });

    items.push({
      id: "clear-selection",
      label: "Clear Selection",
      description: "Deselect all devices and connections",
      icon: <Trash2 className="w-4 h-4" />,
      category: "Canvas",
      keywords: ["deselect", "clear", "unselect"],
      action: clearSelection,
    });

    items.push({
      id: "toggle-validation",
      label: "Toggle Validation Panel",
      description: "Show or hide the validation results panel",
      icon: <Layout className="w-4 h-4" />,
      category: "Panels",
      keywords: ["validation", "panel", "toggle", "show", "hide"],
      action: toggleValidation,
    });

    items.push({
      id: "toggle-paths",
      label: "Toggle Traffic Flow Analysis",
      description: "Show or hide the path visualization panel",
      icon: <GitBranch className="w-4 h-4" />,
      category: "Panels",
      keywords: ["path", "traffic", "flow", "route", "toggle"],
      action: () => setShowPathVisualization(!showPathVisualization),
    });

    // --- Theme ---
    items.push({
      id: "theme-dark",
      label: "Switch to Dark Mode",
      icon: <Moon className="w-4 h-4" />,
      category: "Theme",
      keywords: ["theme", "dark", "mode", "night"],
      action: () => setTheme("dark"),
    });

    items.push({
      id: "theme-light",
      label: "Switch to Light Mode",
      icon: <Sun className="w-4 h-4" />,
      category: "Theme",
      keywords: ["theme", "light", "mode", "day"],
      action: () => setTheme("light"),
    });

    items.push({
      id: "theme-system",
      label: "Use System Theme",
      icon: <Monitor className="w-4 h-4" />,
      category: "Theme",
      keywords: ["theme", "system", "auto", "os"],
      action: () => setTheme("system"),
    });

    // --- Add Devices ---
    const categories = ["network", "infrastructure", "client", "external"] as const;
    for (const cat of categories) {
      for (const [type, info] of Object.entries(DEVICE_TYPES)) {
        if (info.category === cat) {
          items.push({
            id: `add-${type}`,
            label: `Add ${info.label}`,
            description: `Place a new ${info.label} on the canvas`,
            icon: <Plus className="w-4 h-4" />,
            category: "Add Device",
            keywords: [
              "add",
              "create",
              "place",
              "device",
              info.label.toLowerCase(),
              type,
            ],
            action: () => {
              const topoNodes = useTopologyStore.getState().nodes;
              const count = topoNodes.length;
              const col = count % 5;
              const row = Math.floor(count / 5);
              const newNode: NetworkNode = {
                id: uuidv4(),
                type: "network-device",
                position: { x: 250 + col * 160, y: 150 + row * 160 },
                data: {
                  deviceType: type as DeviceType,
                  label: `${info.label} ${count + 1}`,
                  config: {},
                  category: info.category,
                  icon: info.icon,
                  color: info.color,
                },
              };
              useTopologyStore.getState().addNode(newNode);
            },
          });
        }
      }
    }

    // --- Delete selected ---
    if (selectedNodeId) {
      const node = nodes.find((n) => n.id === selectedNodeId);
      items.push({
        id: "delete-selected",
        label: `Delete "${node?.data.label || "Device"}"`,
        description: "Remove the selected device from the canvas",
        icon: <Trash2 className="w-4 h-4" />,
        category: "Edit",
        keywords: ["delete", "remove", "selected", "device"],
        action: () => {
          removeNodes([selectedNodeId]);
          clearSelection();
        },
        shortcut: "Del",
      });
    }

    // --- Navigation ---
    items.push({
      id: "goto-projects",
      label: "Go to Projects",
      description: "Navigate to the projects dashboard",
      icon: <Globe className="w-4 h-4" />,
      category: "Navigation",
      keywords: ["go", "projects", "dashboard", "navigate"],
      action: () => (window.location.href = "/projects"),
      shortcut: "",
    });

    items.push({
      id: "goto-subnet",
      label: "Go to Subnet Calculator",
      description: "Navigate to the subnet calculator tool",
      icon: <Calculator className="w-4 h-4" />,
      category: "Navigation",
      keywords: ["go", "subnet", "calculator", "cidr", "navigate"],
      action: () => (window.location.href = "/subnet-calculator"),
    });

    items.push({
      id: "goto-vlan",
      label: "Go to VLAN Planner",
      description: "Navigate to the VLAN planner tool",
      icon: <Layers className="w-4 h-4" />,
      category: "Navigation",
      keywords: ["go", "vlan", "planner", "segmentation", "navigate"],
      action: () => (window.location.href = "/vlan-planner"),
    });

    // --- Quick add for common devices ---
    items.push({
      id: "quick-add-server",
      label: "Quick Add: Server",
      description: "Add a server at the center of the canvas",
      icon: <Box className="w-4 h-4" />,
      category: "Quick Add",
      keywords: ["quick", "add", "server", "fast"],
      action: () => {
        const info = DEVICE_TYPES["server"];
        const topoNodes = useTopologyStore.getState().nodes;
        const newNode: NetworkNode = {
          id: uuidv4(),
          type: "network-device",
          position: { x: 400, y: 300 },
          data: {
            deviceType: "server",
            label: `${info.label} ${topoNodes.length + 1}`,
            config: {},
            category: info.category,
            icon: info.icon,
            color: info.color,
          },
        };
        useTopologyStore.getState().addNode(newNode);
      },
    });

    return items;
  }, [
    selectedNodeId,
    nodes,
    undo,
    redo,
    removeNodes,
    clearSelection,
    toggleValidation,
    setValidationResults,
    saveCurrentProject,
    showPathVisualization,
    setShowPathVisualization,
    setTheme,
  ]);

  // Filter commands
  const filtered = useMemo(() => {
    if (!query.trim()) return commands.slice(0, 20);
    const scored = commands
      .map((cmd) => {
        const labelScore = scoreMatch(query, cmd.label);
        const descScore = cmd.description ? scoreMatch(query, cmd.description) * 0.8 : 0;
        const keywordScore = Math.max(
          ...cmd.keywords.map((kw) => scoreMatch(query, kw) * 0.6)
        );
        return { cmd, score: Math.max(labelScore, descScore, keywordScore) };
      })
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score);
    return scored.slice(0, 15).map((s) => s.cmd);
  }, [query, commands]);

  // Group by category
  const grouped = useMemo(() => {
    const groups: { category: string; items: CommandItem[] }[] = [];
    const seen = new Set<string>();
    for (const cmd of filtered) {
      if (!seen.has(cmd.category)) {
        seen.add(cmd.category);
        groups.push({
          category: cmd.category,
          items: filtered.filter((f) => f.category === cmd.category),
        });
      }
    }
    return groups;
  }, [filtered]);

  // Flatten for keyboard nav
  const flatItems = filtered;

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const executeCommand = useCallback(
    (cmd: CommandItem) => {
      cmd.action();
      setIsOpen(false);
      setQuery("");
    },
    []
  );

  // Global keyboard handler
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;

      // Cmd+K to open
      if (ctrl && e.key === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
        return;
      }

      // Escape to close
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
        setQuery("");
        return;
      }

      // Keyboard nav inside palette
      if (isOpen) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setSelectedIndex((i) => Math.min(i + 1, flatItems.length - 1));
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          setSelectedIndex((i) => Math.max(i - 1, 0));
        } else if (e.key === "Enter" && flatItems[selectedIndex]) {
          e.preventDefault();
          executeCommand(flatItems[selectedIndex]);
        }
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, flatItems, selectedIndex, executeCommand]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Scroll selected item into view
  useEffect(() => {
    if (!listRef.current) return;
    const items = listRef.current.querySelectorAll("[data-command-item]");
    items[selectedIndex]?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  if (!isOpen) return null;

  let flatIndex = -1;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]"
      onClick={() => setIsOpen(false)}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Palette */}
      <div
        className="relative w-full max-w-lg bg-card border border-border rounded-xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 border-b border-border">
          <Search className="w-4 h-4 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command or search..."
            className="flex-1 py-3 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground bg-muted rounded border border-border">
            esc
          </kbd>
        </div>

        {/* Results */}
        <div
          ref={listRef}
          className="max-h-80 overflow-y-auto py-2"
        >
          {flatItems.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              No matching commands
            </div>
          )}

          {grouped.map((group) => (
            <div key={group.category}>
              <div className="px-4 py-1 text-[10px] font-semibold uppercase text-muted-foreground tracking-wider">
                {group.category}
              </div>
              {group.items.map((cmd) => {
                flatIndex++;
                const isSelected = flatIndex === selectedIndex;
                const idx = flatIndex;
                return (
                  <button
                    key={cmd.id}
                    data-command-item
                    className={`w-full flex items-center gap-3 px-4 py-2 text-left text-sm transition-colors ${
                      isSelected
                        ? "bg-muted text-foreground"
                        : "text-foreground hover:bg-muted/50"
                    }`}
                    onClick={() => executeCommand(cmd)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                  >
                    <span className="text-muted-foreground shrink-0">
                      {cmd.icon}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">
                        {cmd.label}
                      </div>
                      {cmd.description && (
                        <div className="text-xs text-muted-foreground truncate">
                          {cmd.description}
                        </div>
                      )}
                    </div>
                    {cmd.shortcut && (
                      <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground bg-muted rounded border border-border shrink-0">
                        {cmd.shortcut}
                      </kbd>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-border flex items-center gap-4 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 bg-muted rounded text-[10px] font-mono border border-border">↑↓</kbd>
            navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 bg-muted rounded text-[10px] font-mono border border-border">↵</kbd>
            select
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 bg-muted rounded text-[10px] font-mono border border-border">esc</kbd>
            close
          </span>
        </div>
      </div>
    </div>
  );
}
