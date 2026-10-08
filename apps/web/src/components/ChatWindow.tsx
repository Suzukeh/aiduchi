import React, { useState } from "react";
import { Send, GitBranch, Check, XCircle, Loader2 } from "lucide-react";
import { useStore } from "../store";
import { STATUS_META, type NodeMeta, type Win } from "../types";

export function ChatWindow({ win, node }: { win: Win; node: NodeMeta | null }) {
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const sendPrompt = useStore((s) => s.sendPrompt);
  const adopt = useStore((s) => s.adopt);
  const abandon = useStore((s) => s.abandon);
  const setShowTree = useStore((s) => s.setShowTree);
  const nodes = useStore((s) => s.nodes);

  // 兄弟ノード（同じ親を持つ）
  const siblings = node ? nodes.filter((n) => n.parentId === node.parentId) : [];
  const sibIndex = node ? siblings.findIndex((n) => n.id === node.id) : -1;

  async function handleSend() {
    if (!input.trim() || sending) return;
    setSending(true);
    const text = input;
    setInput("");
    await sendPrompt(win.id, text);
    setSending(false);
  }

  return (
    <div className="flex h-full flex-col">
      {/* node content */}
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
        {node ? (
          <>
            <div className="rounded-md border border-white/10 bg-white/5 p-3">
              <div className="mb-1 flex items-center gap-2 text-[11px] text-gray-400">
                <span
                  className="rounded-full px-2 py-0.5 text-[10px] font-medium text-white"
                  style={{ background: STATUS_META[node.status].color }}
                >
                  {STATUS_META[node.status].label}
                </span>
                <span>{node.id}</span>
                {node.model && <span className="text-gray-500">{node.provider} / {node.model}</span>}
                {siblings.length > 1 && sibIndex >= 0 && (
                  <span className="text-gray-500">{sibIndex + 1}/{siblings.length}</span>
                )}
              </div>
              <div className="text-sm text-gray-200">{node.prompt}</div>
              {node.diffSummary && (
                <div className="mt-2 rounded bg-black/30 px-2 py-1 font-mono text-[11px] text-emerald-400">
                  {node.diffSummary}
                </div>
              )}
            </div>

            {/* node actions */}
            <div className="flex flex-wrap gap-2 text-xs">
              {node.status !== "adopted" && (
                <button
                  className="flex items-center gap-1 rounded border border-emerald-500/40 px-2 py-1 text-emerald-400 hover:bg-emerald-500/10"
                  onClick={() => adopt(node.id)}
                >
                  <Check size={12} /> 採用
                </button>
              )}
              {node.status !== "abandoned" && (
                <button
                  className="flex items-center gap-1 rounded border border-red-500/40 px-2 py-1 text-red-400 hover:bg-red-500/10"
                  onClick={() => abandon(node.id)}
                >
                  <XCircle size={12} /> 破棄
                </button>
              )}
              <button
                className="flex items-center gap-1 rounded border border-white/15 px-2 py-1 text-gray-300 hover:bg-white/10"
                onClick={() => setShowTree(true)}
              >
                <GitBranch size={12} /> ツリーで見る
              </button>
            </div>
          </>
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-gray-500">
            この窓から最初のメッセージを送って開始
          </div>
        )}
      </div>

      {/* input */}
      <div className="shrink-0 border-t border-white/10 p-2">
        <textarea
          className="w-full resize-none rounded-md border border-white/10 bg-black/30 px-2 py-1.5 text-sm text-gray-200 outline-none placeholder:text-gray-600 focus:border-blue-500/60"
          rows={3}
          value={input}
          placeholder="指示を入力（Ctrl+Enterで送信）"
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
              e.preventDefault();
              handleSend();
            }
          }}
        />
        <div className="mt-1 flex items-center justify-between">
          <span className="text-[10px] text-gray-600">parent: {node ? node.id : "root"}</span>
          <button
            className="flex items-center gap-1 rounded-md bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
            disabled={!input.trim() || sending}
            onClick={handleSend}
          >
            {sending ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
            送信
          </button>
        </div>
      </div>
    </div>
  );
}
