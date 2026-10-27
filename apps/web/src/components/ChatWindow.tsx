import React, { useMemo, useState } from "react";
import { Send, GitBranch, Check, XCircle, Loader2, MessageSquare } from "lucide-react";
import { useStore } from "../store";
import { STATUS_META, type NodeMeta, type Win } from "../types";

/** 基点から現在までの会話（作業スレッド）を組み立てる */
export function threadOf(nodes: NodeMeta[], nodeId: string | null): NodeMeta[] {
  if (!nodeId) return [];
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const out: NodeMeta[] = [];
  const seen = new Set<string>();
  let cursor: string | null = nodeId;
  while (cursor && !seen.has(cursor)) {
    seen.add(cursor);
    const node = byId.get(cursor);
    if (!node) break;
    out.push(node);
    cursor = node.parentId;
  }
  return out.reverse();
}

export function ChatWindow({ win }: { win: Win }) {
  const nodes = useStore((s) => s.nodes);
  const sendPrompt = useStore((s) => s.sendPrompt);
  const setDraft = useStore((s) => s.setDraft);
  const adopt = useStore((s) => s.adopt);
  const abandon = useStore((s) => s.abandon);
  const openWindow = useStore((s) => s.openWindow);
  const error = useStore((s) => s.error);
  const [sending, setSending] = useState(false);

  const node = win.nodeId ? (nodes.find((n) => n.id === win.nodeId) ?? null) : null;
  const thread = useMemo(() => threadOf(nodes, win.nodeId), [nodes, win.nodeId]);

  async function handleSend() {
    const text = win.draft.trim();
    if (!text || sending) return;
    setSending(true);
    await sendPrompt(win.id, text);
    setSending(false);
  }

  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-2.5">
        {thread.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-1 text-xs text-gray-500">
            <MessageSquare size={18} className="text-gray-700" />
            <span>この窓から指示を送って作業を始めます</span>
            <span className="text-[10px] text-gray-600">ひとつの窓＝ひとつの作業スレッド</span>
          </div>
        )}
        {thread.map((n, i) => (
          <div key={n.id} className="rounded-md border border-white/10 bg-white/[0.03] p-2">
            <div className="mb-1 flex flex-wrap items-center gap-1.5 text-[10px] text-gray-500">
              <span className="rounded-full px-1.5 py-0.5 font-medium text-white" style={{ background: STATUS_META[n.status].color }}>
                {STATUS_META[n.status].label}
              </span>
              <span className="text-gray-400">{n.authorLabel || "you"}</span>
              <span className="text-gray-600">#{i + 1}</span>
              {n.model && (
                <span className="truncate text-gray-600">
                  {n.provider} / {n.model}
                </span>
              )}
              {i === thread.length - 1 && <span className="ml-auto text-blue-400">現在の地点</span>}
            </div>
            <div className="whitespace-pre-wrap text-xs leading-relaxed text-gray-200">{n.prompt}</div>
            {n.diffSummary && (
              <div className="mt-1.5 rounded bg-black/30 px-2 py-1 font-mono text-[10px] text-emerald-400">{n.diffSummary}</div>
            )}
            {i === thread.length - 1 && (
              <div className="mt-1.5 flex flex-wrap gap-1.5 text-[10px]">
                {n.status !== "adopted" && (
                  <button
                    className="flex items-center gap-1 rounded border border-emerald-500/40 px-1.5 py-0.5 text-emerald-400 hover:bg-emerald-500/10"
                    onClick={() => adopt(n.id)}
                  >
                    <Check size={10} /> 採用
                  </button>
                )}
                {n.status !== "abandoned" && (
                  <button
                    className="flex items-center gap-1 rounded border border-red-500/40 px-1.5 py-0.5 text-red-400 hover:bg-red-500/10"
                    onClick={() => abandon(n.id)}
                  >
                    <XCircle size={10} /> 破棄
                  </button>
                )}
                <button
                  className="flex items-center gap-1 rounded border border-white/15 px-1.5 py-0.5 text-gray-300 hover:bg-white/10"
                  onClick={() => openWindow(n.id)}
                  title="この地点から別の作業を分岐する"
                >
                  <GitBranch size={10} /> 分岐
                </button>
              </div>
            )}
          </div>
        ))}
        {error && <div className="rounded bg-red-500/10 px-2 py-1 text-[11px] text-red-400">{error}</div>}
      </div>

      <div className="shrink-0 border-t border-white/10 p-2">
        <textarea
          className="w-full resize-none rounded-md border border-white/10 bg-black/30 px-2 py-1.5 text-sm text-gray-200 outline-none placeholder:text-gray-600 focus:border-blue-500/60"
          rows={3}
          value={win.draft}
          placeholder="指示を入力（Ctrl+Enterで送信）"
          onChange={(e) => setDraft(win.id, e.target.value)}
          onKeyDown={(e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === "Enter" && !e.nativeEvent.isComposing) {
              e.preventDefault();
              handleSend();
            }
          }}
        />
        <div className="mt-1 flex items-center justify-between">
          <span className="truncate text-[10px] text-gray-600">
            {node ? `基点: ${node.id}` : "基点: 採用版（なければ初期状態）"}
          </span>
          <button
            className="flex items-center gap-1 rounded-md bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
            disabled={!win.draft.trim() || sending}
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
