"use client";

import { useCallback, useRef, useMemo, useState, useEffect } from "react";
import {
  ReactFlow,
  Controls,
  MiniMap,
  Background,
  BackgroundVariant,
  addEdge,
  Connection,
  ReactFlowProvider,
  NodeTypes,
  MarkerType,
  Node,
  Edge,
  NodeChange,
  EdgeChange,
  applyNodeChanges,
  applyEdgeChanges,
  ReactFlowInstance,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useTopologyStore } from "@/stores/topologyStore";
import { useUIStore } from "@/stores/uiStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { DeviceNode } from "@/components/devices/DeviceNode";
import { NetworkNode, NetworkEdge } from "@/types";
import { DEVICE_TYPES } from "@/lib/network/deviceTypes";
import { v4 as uuidv4 } from "uuid";

function NetworkCanvasInner() {
  const { nodes, edges, addEdge: addTopologyEdge } = useTopologyStore();
  const { selectNode, selectEdge, selectedNodeId, highlightedPath, showPathVisualization } = useUIStore();
  const { showGrid, gridSize } = useSettingsStore();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null);

  const nodeTypes: NodeTypes = useMemo(() => ({ "network-device": DeviceNode }), []);

  // Convert topology nodes to React Flow nodes
  const flowNodes: Node[] = useMemo(() => {
    return nodes.map((tn) => ({
      ...tn,
      selected: tn.id === selectedNodeId,
    }));
  }, [nodes, selectedNodeId]);

  // Convert topology edges to React Flow edges
  const flowEdges: Edge[] = useMemo(() => {
    return edges.map((te) => {
      const isHighlighted = showPathVisualization && highlightedPath.includes(te.id);
      return {
        ...te,
        data: { ...te.data },
        animated: isHighlighted,
        style: isHighlighted
          ? { stroke: "#3b82f6", strokeWidth: 3 }
          : { strokeWidth: 1.5 },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: isHighlighted ? "#3b82f6" : undefined,
        },
      };
    });
  }, [edges, selectedNodeId, showPathVisualization, highlightedPath]);

  // Track local flow state for position changes (dragging)
  const [localNodes, setLocalNodes] = useState<Node[]>(flowNodes);
  
  // Sync from store to local when store changes (but not during drag)
  const isDragging = useRef(false);
  
  useEffect(() => {
    if (!isDragging.current) {
      setLocalNodes(flowNodes);
    }
  }, [flowNodes]);

  // Handle all node changes (position drag, selection, remove, etc.)
  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      // Filter out "remove" and "select" changes — handle those ourselves
      const posChanges = changes.filter(
        (c) => c.type === "position" || c.type === "dimensions"
      );
      const selectChanges = changes.filter((c) => c.type === "select");
      const removeChanges = changes.filter((c) => c.type === "remove");

      // Apply position/dimension changes locally for smooth dragging
      if (posChanges.length > 0) {
        isDragging.current = true;
        setLocalNodes((nds) => applyNodeChanges(posChanges, nds));
      }

      // Handle selection
      for (const sc of selectChanges) {
        if ("selected" in sc && "id" in sc) {
          if (sc.selected) {
            selectNode(sc.id as string);
          } else if (sc.id === selectedNodeId) {
            selectNode(null);
          }
        }
      }

      // Handle removal
      if (removeChanges.length > 0) {
        const removedIds = removeChanges
          .filter((c) => "id" in c)
          .map((c) => c.id as string);
        useTopologyStore.getState().removeNodes(removedIds);
      }
    },
    [selectNode, selectedNodeId]
  );

  // Handle all edge changes
  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      const selectChanges = changes.filter((c) => c.type === "select");
      const removeChanges = changes.filter((c) => c.type === "remove");

      for (const sc of selectChanges) {
        if ("selected" in sc && "id" in sc) {
          if (sc.selected) {
            selectEdge(sc.id as string);
          } else if (sc.id === useUIStore.getState().selectedEdgeId) {
            selectEdge(null);
          }
        }
      }

      if (removeChanges.length > 0) {
        const removedIds = removeChanges
          .filter((c) => "id" in c)
          .map((c) => c.id as string);
        useTopologyStore.getState().removeEdges(removedIds);
      }
    },
    [selectEdge]
  );

  // Sync positions back to topology store when drag ends
  const onNodeDragStop = useCallback(() => {
    isDragging.current = false;
    setLocalNodes((currentNodes) => {
      const topoNodes = useTopologyStore.getState().nodes;
      const updatedNodes = topoNodes.map((tn) => {
        const flowNode = currentNodes.find((fn) => fn.id === tn.id);
        if (flowNode) {
          return { ...tn, position: flowNode.position };
        }
        return tn;
      });
      useTopologyStore.setState({ nodes: updatedNodes });
      return currentNodes;
    });
  }, []);

  // Handle new connections
  const onConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return;

      const edgeId = uuidv4();
      const newEdge: NetworkEdge = {
        id: edgeId,
        source: connection.source,
        target: connection.target,
        type: "default",
        data: {
          connectionType: "ethernet",
          status: "active",
        },
      };

      addTopologyEdge(newEdge);
    },
    [addTopologyEdge]
  );

  // Handle drop
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const type = event.dataTransfer.getData("application/device-type") as
        | keyof typeof DEVICE_TYPES
        | undefined;

      if (!type || !DEVICE_TYPES[type]) return;

      const wrapper = reactFlowWrapper.current;
      if (!wrapper) return;

      const bounds = wrapper.getBoundingClientRect();
      const position = {
        x: event.clientX - bounds.left - 50,
        y: event.clientY - bounds.top - 25,
      };

      const info = DEVICE_TYPES[type];
      const topoNodes = useTopologyStore.getState().nodes;
      const newNode: NetworkNode = {
        id: uuidv4(),
        type: "network-device",
        position,
        data: {
          deviceType: type,
          label: `${info.label} ${topoNodes.length + 1}`,
          config: {},
          category: info.category,
          icon: info.icon,
          color: info.color,
        },
      };

      useTopologyStore.getState().addNode(newNode);
    },
    []
  );

  // Handle keyboard deletion
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Delete" || e.key === "Backspace") {
        const active = document.activeElement;
        if (active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA")) return;

        if (rfInstance) {
          const selected = rfInstance.getNodes().filter((n) => n.selected);
          if (selected.length > 0) {
            useTopologyStore.getState().removeNodes(selected.map((n) => n.id));
            return;
          }

          const selectedEdges = rfInstance.getEdges().filter((e) => e.selected);
          if (selectedEdges.length > 0) {
            useTopologyStore.getState().removeEdges(selectedEdges.map((e) => e.id));
            return;
          }
        }
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [rfInstance]);

  // Handle click on pane (deselect)
  const onPaneClick = useCallback(() => {
    selectNode(null);
    selectEdge(null);
  }, [selectNode, selectEdge]);

  // Node selection
  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      selectNode(node.id);
    },
    [selectNode]
  );

  // Edge selection
  const onEdgeClick = useCallback(
    (_: React.MouseEvent, edge: Edge) => {
      selectEdge(edge.id);
    },
    [selectEdge]
  );

  return (
    <div ref={reactFlowWrapper} className="w-full h-full" onDrop={onDrop} onDragOver={onDragOver}>
      <ReactFlow
        nodes={localNodes}
        edges={flowEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onPaneClick={onPaneClick}
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        onNodeDragStop={onNodeDragStop}
        nodeTypes={nodeTypes}
        deleteKeyCode={null}
        fitView
        snapToGrid={useSettingsStore.getState().snapToGrid}
        snapGrid={[gridSize, gridSize]}
        defaultEdgeOptions={{
          type: "default",
          style: { strokeWidth: 1.5 },
          markerEnd: { type: MarkerType.ArrowClosed },
        }}
        proOptions={{ hideAttribution: true }}
        onInit={(instance) => setRfInstance(instance)}
      >
        <Controls
          position="bottom-right"
          className="!bottom-4 !right-4"
        />
        <MiniMap
          position="bottom-right"
          className="!bottom-4 !right-14"
          nodeStrokeWidth={2}
          pannable
        />
        {showGrid && (
          <Background
            variant={BackgroundVariant.Dots}
            gap={gridSize}
            size={1}
          />
        )}
      </ReactFlow>
    </div>
  );
}

export function NetworkCanvas() {
  return (
    <ReactFlowProvider>
      <NetworkCanvasInner />
    </ReactFlowProvider>
  );
}
