import React, { useEffect } from "react";
import { Plus, GitBranch } from "lucide-react";
import { useStore } from "./store";
import { Sidebar } from "./components/Sidebar";
import { FloatingWindow } from "./components/FloatingWindow";
import { TreeOverlay } from "./components/TreeOverlay";
import { Dock } from "./components/Dock";

export function App() {
  const init = useStore((s) => s.init);
  const roomId = useStore((s) => s.roomId);
  const windows = useStore((s) => s.windows);
  const showTree = useStore((s) => s.showTree);
  const openWindow = useStore((s) => s.openWindow);
  const setShowTree = useStore((s) => s.setShowTree);
  const refreshNodes = useStore((s) => s.refreshNodes);

  useEffect(() => {
    init();
  }, [init]);

  // 他ユーザーのノード追加を自動反映（5秒ポーリング）
  useEffect(() => {
    if (!roomId) return;
    const t = setInterval(() => refreshNodes(), 5000);
    return () => clearInterval(t);
  }, [roomId, refreshNodes]);

  return (
    <div className="flex h-full">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        {/* top bar */}
        <div className="flex h-11 shrink-0 items-center gap-2 border-b border-white/10 bg-[#0f1219] px-3">
          <span className="text-xs text-gray-500">
            {roomId ? `room ${roomId}` : "room 未作成 — 左のフォームから作成してください"}
          </span>
          <div className="ml-auto flex items-center gap-1">
            <button
              className="flex items-center gap-1 rounded px-2 py-1 text-xs text-gray-300 hover:bg-white/10 disabled:opacity-40"
              onClick={() => openWindow(null)}
              disabled={!roomId}
            >
              <Plus size={13} /> 新しい窓
            </button>
            <button
              className="flex items-center gap-1 rounded px-2 py-1 text-xs text-gray-300 hover:bg-white/10"
              onClick={() => setShowTree(true)}
            >
              <GitBranch size={13} /> ツリー
            </button>
          </div>
        </div>

        {/* canvas */}
        <div className="relative min-h-0 flex-1 overflow-hidden bg-[#0b0d12]">
          {/* dot grid */}
          <div
            className="pointer-events-none absolute inset-0 opacity-40"
            style={{
              backgroundImage: "radial-gradient(circle, #1f2937 1px, transparent 1px)",
              backgroundSize: "24px 24px",
            }}
          />
          {windows.filter((w) => !w.minimized).map((w) => (
            <FloatingWindow key={w.id} win={w} />
          ))}
          {windows.length === 0 && roomId && (
            <div className="absolute inset-0 flex items-center justify-center">
              <button
                className="flex items-center gap-2 rounded-lg border border-dashed border-white/20 px-6 py-4 text-sm text-gray-500 hover:border-blue-500/40 hover:text-gray-300"
                onClick={() => openWindow(null)}
              >
                <Plus size={16} /> 新しい窓を開く
              </button>
            </div>
          )}
          {showTree && <TreeOverlay />}
        </div>

        <Dock />
      </div>
    </div>
  );
}
