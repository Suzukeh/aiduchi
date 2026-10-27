import React from "react";
import { Rnd } from "react-rnd";
import { Minus, X } from "lucide-react";
import { useStore } from "../store";
import { ChatWindow } from "./ChatWindow";
import { STATUS_META, titleOf, type Win } from "../types";

export function FloatingWindow({ win }: { win: Win }) {
  const nodes = useStore((s) => s.nodes);
  const focusWindow = useStore((s) => s.focusWindow);
  const closeWindow = useStore((s) => s.closeWindow);
  const updateWin = useStore((s) => s.updateWin);

  const node = win.nodeId ? (nodes.find((n) => n.id === win.nodeId) ?? null) : null;
  const title = titleOf(node);

  return (
    <Rnd
      position={{ x: win.x, y: win.y }}
      size={{ width: win.w, height: win.h }}
      minWidth={320}
      minHeight={220}
      bounds="parent"
      dragHandleClassName="win-drag-handle"
      cancel=".win-no-drag"
      style={{ zIndex: win.z, pointerEvents: "auto" }}
      onDragStop={(_e, d) => updateWin(win.id, { x: d.x, y: d.y })}
      onResizeStop={(_e, _dir, ref, _delta, pos) =>
        updateWin(win.id, { w: ref.offsetWidth, h: ref.offsetHeight, x: pos.x, y: pos.y })
      }
      onMouseDown={() => focusWindow(win.id)}
    >
      <div className="flex h-full w-full flex-col overflow-hidden rounded-lg border border-white/10 bg-[#141821] shadow-2xl shadow-black/50">
        <div className="win-drag-handle flex h-9 shrink-0 cursor-move items-center gap-2 border-b border-white/10 bg-[#1b2130] px-3">
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ background: node ? STATUS_META[node.status].color : "#6b7280" }}
          />
          <span className="min-w-0 flex-1 truncate text-xs font-medium text-gray-300">{title}</span>
          <div className="win-no-drag flex items-center gap-1">
            <button
              className="rounded p-1 text-gray-400 hover:bg-white/10 hover:text-gray-200"
              onClick={() => updateWin(win.id, { minimized: true })}
              title="最小化"
            >
              <Minus size={13} />
            </button>
            <button
              className="rounded p-1 text-gray-400 hover:bg-red-500/20 hover:text-red-400"
              onClick={() => closeWindow(win.id)}
              title="閉じる"
            >
              <X size={13} />
            </button>
          </div>
        </div>
        <div className="min-h-0 flex-1">
          <ChatWindow win={win} />
        </div>
      </div>
    </Rnd>
  );
}
