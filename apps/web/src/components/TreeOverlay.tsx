import React, { useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  type Node,
  type Edge,
  MarkerType,
  Position,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { X } from "lucide-react";
import { useStore } from "../store";
import { STATUS_META, type NodeMeta } from "../types";

const NODE_W = 200;
const NODE_H = 64;

/** シンプルなツリー配置: x=inorder風, y=depth */
function layout(nodes: NodeMeta[]): Map<string, { x: number; y: number }> {
  const children = new Map<string | null, NodeMeta[]>();
  for (const n of nodes) {
    const key = n.parentId;
    if (!children.has(key)) children.set(key, []);
    children.get(key)!.push(n);
  }
  const pos = new Map<string, { x: number; y: number }>();
  let cursor = 0;
  function walk(parentId: string | null, depth: number) {
    const kids = children.get(parentId) ?? [];
    if (kids.length === 0) {
      const x = cursor * (NODE_W + 40);
      pos.set(parentId ?? "root", { x, y: depth * (NODE_H + 70) });
      cursor += 1;
      return pos.get(parentId ?? "root")!.x;
    }
    const xs: number[] = [];
    for (const k of kids) xs.push(walk(k.id, depth + 1));
    const x = (Math.min(...xs) + Math.max(...xs)) / 2;
    if (parentId) {
      pos.set(parentId, { x, y: depth * (NODE_H + 70) });
      return x;
    }
    return x;
  }
  walk(null, 0);
  return pos;
}

export function TreeOverlay() {
  const nodes = useStore((s) => s.nodes);
  const setShowTree = useStore((s) => s.setShowTree);
  const openWindow = useStore((s) => s.openWindow);

  const { rfNodes, rfEdges } = useMemo(() => {
    const pos = layout(nodes);
    const rfNodes: Node[] = [
      {
        id: "root",
        position: pos.get("root") ?? { x: 0, y: 0 },
        data: { label: "開始" },
        sourcePosition: Position.Bottom,
        targetPosition: Position.Top,
        style: {
          width: NODE_W,
          borderRadius: 8,
          border: "1px solid #374151",
          background: "#1b2130",
          color: "#9ca3af",
          fontSize: 12,
          padding: 10,
        },
      },
      ...nodes.map((n) => ({
        id: n.id,
        position: pos.get(n.id) ?? { x: 0, y: 0 },
        data: { label: n.prompt.length > 30 ? n.prompt.slice(0, 30) + "…" : n.prompt, meta: n },
        sourcePosition: Position.Bottom,
        targetPosition: Position.Top,
        style: {
          width: NODE_W,
          borderRadius: 8,
          border: `2px solid ${STATUS_META[n.status].color}`,
          background: "#141821",
          color: "#e5e7eb",
          fontSize: 12,
          padding: 10,
        },
      })),
    ];
    const rfEdges: Edge[] = nodes.map((n) => ({
      id: `e-${n.parentId ?? "root"}-${n.id}`,
      source: n.parentId ?? "root",
      target: n.id,
      markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16, color: "#4b5563" },
      style: { stroke: "#4b5563" },
    }));
    return { rfNodes, rfEdges };
  }, [nodes]);

  return (
    <div className="absolute inset-0 z-50 flex flex-col bg-[#0b0d12]/98">
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-white/10 px-4">
        <div className="text-sm font-medium text-gray-200">進捗ツリー</div>
        <button
          className="rounded p-1.5 text-gray-400 hover:bg-white/10 hover:text-gray-200"
          onClick={() => setShowTree(false)}
        >
          <X size={16} />
        </button>
      </div>
      <div className="min-h-0 flex-1">
        <ReactFlow
          nodes={rfNodes}
          edges={rfEdges}
          fitView
          proOptions={{ hideAttribution: true }}
          onNodeClick={(_e, n) => {
            if (n.id !== "root") {
              openWindow(n.id);
              setShowTree(false);
            }
          }}
        >
          <Background color="#1f2937" gap={24} />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>
    </div>
  );
}
