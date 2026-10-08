import React from "react";
import { useStore } from "../store";
import { STATUS_META } from "../types";

export function Dock() {
  const windows = useStore((s) => s.windows);
  const nodes = useStore((s) => s.nodes);
  const updateWin = useStore((s) => s.updateWin);

  if (windows.length === 0) return null;

  return (
    <div className="flex shrink-0 items-center gap-1 border-t border-white/10 bg-[#0f1219] px-3 py-1.5">
      {windows.map((w) => {
        const node = w.nodeId === "root" ? null : nodes.find((n) => n.id === w.nodeId);
        return (
          <button
            key={w.id}
            className={`flex max-w-48 items-center gap-1.5 rounded px-2 py-1 text-[11px] ${
              w.minimized ? "text-gray-400 hover:bg-white/10" : "bg-white/10 text-gray-200"
            }`}
            onClick={() => updateWin(w.id, { minimized: !w.minimized })}
            title={node ? node.prompt : "新しいチャット"}
          >
            <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: node ? STATUS_META[node.status].color : "#6b7280" }} />
            <span className="truncate">{node ? (node.prompt.length > 20 ? node.prompt.slice(0, 20) + "…" : node.prompt) : "新しいチャット"}</span>
          </button>
        );
      })}
    </div>
  );
}
