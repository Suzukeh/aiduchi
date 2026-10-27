import React, { useEffect, useState } from "react";
import { Plus, GitBranch } from "lucide-react";
import { useStore } from "./store";
import { Sidebar } from "./components/Sidebar";
import { FloatingWindow } from "./components/FloatingWindow";
import { TreeOverlay } from "./components/TreeOverlay";
import { Dock } from "./components/Dock";
import { NodePanel } from "./components/NodePanel";

export function App() {
  const init = useStore((s) => s.init);
  const roomId = useStore((s) => s.roomId);
  const windows = useStore((s) => s.windows);
  const selectedNodeId = useStore((s) => s.selectedNodeId);
  const nodes = useStore((s) => s.nodes);
  const openWindow = useStore((s) => s.openWindow);
  const refreshNodes = useStore((s) => s.refreshNodes);
  const [showTree, setShowTree] = useState(false);

  useEffect(() => {
    init();
  }, [init]);

  // 他ユーザーの追加を自動反映（5秒ポーリング）
  useEffect(() => {
    if (!roomId) return;
    const t = setInterval(() => refreshNodes(), 5000);
    return () => clearInterval(t);
  }, [roomId, refreshNodes]);

  // 中央パネルは「明示的に選んだ版」を表示。窓のフォーカスでは切り替えない。
  const adopted = nodes.find((n) => n.status === "adopted") ?? null;
  const shownNodeId = selectedNodeId ?? adopted?.id ?? null;

  return (
    <div className="flex h-full">
      <Sidebar onShowTree={() => setShowTree(true)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-11 shrink-0 items-center gap-2 border-b border-white/10 bg-[#0f1219] px-3">
          <span className="truncate text-xs text-gray-500">
            {roomId ? `room ${roomId}` : "room 未作成 — 左のフォームから作成してください"}
          </span>
          <div className="ml-auto flex items-center gap-1">
            <button
              className="flex items-center gap-1 rounded px-2 py-1 text-xs text-gray-300 hover:bg-white/10 disabled:opacity-40"
              onClick={() => openWindow(shownNodeId)}
              disabled={!roomId}
              title="この版から新しいチャットを開く"
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

        <div className="relative flex min-h-0 flex-1 overflow-hidden">
          <NodePanel nodeId={shownNodeId} />

          {/* フローティングのチャット窓（配置は個人ごと） */}
          <div className="pointer-events-none absolute inset-0">
            {windows
              .filter((w) => !w.minimized)
              .map((w) => (
                <FloatingWindow key={w.id} win={w} />
              ))}
          </div>

          {windows.length === 0 && roomId && (
            <div className="pointer-events-none absolute inset-x-0 bottom-6 flex justify-center">
              <button
                className="pointer-events-auto flex items-center gap-2 rounded-lg border border-dashed border-white/20 bg-[#0e1118]/80 px-5 py-3 text-sm text-gray-400 hover:border-blue-500/40 hover:text-gray-200"
                onClick={() => openWindow(null)}
              >
                <Plus size={15} /> チャット窓を開いて作業を始める
              </button>
            </div>
          )}

          {showTree && <TreeOverlay onClose={() => setShowTree(false)} />}
        </div>

        <Dock />
      </div>
    </div>
  );
}
