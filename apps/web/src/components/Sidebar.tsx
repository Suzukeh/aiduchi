import React, { useState } from "react";
import { Plus, RefreshCw, GitBranch, List, Columns, Check, Users, KeyRound, Link2, Copy } from "lucide-react";
import { useStore } from "../store";
import { STATUS_META, type NodeMeta } from "../types";

export function Sidebar() {
  const roomId = useStore((s) => s.roomId);
  const nodes = useStore((s) => s.nodes);
  const view = useStore((s) => s.view);
  const setView = useStore((s) => s.setView);
  const setShowTree = useStore((s) => s.setShowTree);
  const refreshNodes = useStore((s) => s.refreshNodes);
  const openWindow = useStore((s) => s.openWindow);
  const adopt = useStore((s) => s.adopt);
  const userName = useStore((s) => s.userName);
  const setUserName = useStore((s) => s.setUserName);
  const peers = useStore((s) => s.peers);
  const synced = useStore((s) => s.synced);
  const error = useStore((s) => s.error);

  const [name, setName] = useState("demo");
  const [creating, setCreating] = useState(false);
  const createRoom = useStore((s) => s.createRoom);

  async function handleCreate() {
    setCreating(true);
    await createRoom(name);
    setCreating(false);
  }

  return (
    <aside className="flex h-full w-72 shrink-0 flex-col border-r border-white/10 bg-[#0f1219]">
      {/* header */}
      <div className="border-b border-white/10 p-3">
        <div className="mb-3 flex items-center gap-2">
          <span className="text-sm font-semibold tracking-wide text-gray-100">aiduchi</span>
          <span className="text-[10px] text-gray-600">collab vibe coding</span>
          <span className={`ml-auto h-2 w-2 rounded-full ${synced ? "bg-emerald-500" : "bg-gray-600"}`} title={synced ? "同期中" : "未接続"} />
        </div>

        {/* user name */}
        <div className="mb-2 flex items-center gap-2">
          <Users size={13} className="text-gray-500" />
          <input
            className="w-full rounded border border-white/10 bg-black/30 px-2 py-1 text-xs text-gray-200 outline-none placeholder:text-gray-600 focus:border-blue-500/60"
            placeholder="あなたの名前"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
          />
        </div>
        {peers.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1">
            {peers.map((p) => (
              <span key={p.userId} className="flex items-center gap-1 rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-gray-300">
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: p.color }} />
                {p.name}
              </span>
            ))}
          </div>
        )}

        {/* room */}
        {!roomId ? (
          <div className="flex gap-1">
            <input
              className="min-w-0 flex-1 rounded border border-white/10 bg-black/30 px-2 py-1 text-xs text-gray-200 outline-none placeholder:text-gray-600 focus:border-blue-500/60"
              placeholder="room name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />
            <button
              className="flex items-center gap-1 rounded bg-blue-600 px-2 py-1 text-xs text-white hover:bg-blue-500 disabled:opacity-40"
              onClick={handleCreate}
              disabled={creating}
            >
              <Plus size={12} /> 作成
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-[11px] text-gray-500">
            <span className="font-mono">{roomId}</span>
            <button className="rounded p-1 hover:bg-white/10 hover:text-gray-300" onClick={() => refreshNodes()} title="更新">
              <RefreshCw size={11} />
            </button>
            <ShareButton />
          </div>
        )}
        {error && <div className="mt-2 rounded bg-red-500/10 px-2 py-1 text-[11px] text-red-400">{error}</div>}
      </div>

      {/* view tabs */}
      <div className="flex items-center gap-1 border-b border-white/10 px-3 py-2">
        <button
          className={`flex items-center gap-1 rounded px-2 py-1 text-[11px] ${view === "list" ? "bg-white/10 text-gray-100" : "text-gray-500 hover:text-gray-300"}`}
          onClick={() => setView("list")}
        >
          <List size={12} /> リスト
        </button>
        <button
          className={`flex items-center gap-1 rounded px-2 py-1 text-[11px] ${view === "board" ? "bg-white/10 text-gray-100" : "text-gray-500 hover:text-gray-300"}`}
          onClick={() => setView("board")}
        >
          <Columns size={12} /> ボード
        </button>
        <button
          className="ml-auto flex items-center gap-1 rounded px-2 py-1 text-[11px] text-gray-400 hover:bg-white/10 hover:text-gray-200"
          onClick={() => setShowTree(true)}
        >
          <GitBranch size={12} /> ツリー
        </button>
      </div>

      {/* content */}
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {view === "list" ? <ListView nodes={nodes} onOpen={openWindow} onAdopt={adopt} /> : <BoardView nodes={nodes} onOpen={openWindow} />}
        {nodes.length === 0 && roomId && <div className="mt-6 text-center text-xs text-gray-600">窓からメッセージを送ると進捗ノードができます</div>}
      </div>

      <ByokSection />
    </aside>
  );
}

function ShareButton() {
  const [copied, setCopied] = useState(false);
  const roomId = useStore((s) => s.roomId);
  const token = useStore((s) => s.token);

  function copy() {
    const url = `${location.origin}/?room=${roomId}&token=${token}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <button
      className="flex items-center gap-1 rounded px-1.5 py-1 text-[10px] text-gray-400 hover:bg-white/10 hover:text-gray-200"
      onClick={copy}
      title="参加リンクをコピー"
    >
      {copied ? <Copy size={11} className="text-emerald-400" /> : <Link2 size={11} />}
      {copied ? "コピー済み" : "共有"}
    </button>
  );
}

function ByokSection() {
  const byok = useStore((s) => s.byok);
  const setByok = useStore((s) => s.setByok);
  const [open, setOpen] = useState(false);

  return (
    <div className="shrink-0 border-t border-white/10">
      <button
        className="flex w-full items-center gap-2 px-3 py-2 text-[11px] text-gray-500 hover:text-gray-300"
        onClick={() => setOpen(!open)}
      >
        <KeyRound size={12} />
        BYOK（任意・未入力ならホストキー）
        {byok.key && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-emerald-500" />}
      </button>
      {open && (
        <div className="space-y-1 px-3 pb-3">
          <input
            className="w-full rounded border border-white/10 bg-black/30 px-2 py-1 text-[11px] text-gray-200 outline-none placeholder:text-gray-600 focus:border-blue-500/60"
            placeholder="provider (例 openai)"
            value={byok.provider}
            onChange={(e) => setByok({ ...byok, provider: e.target.value })}
          />
          <input
            className="w-full rounded border border-white/10 bg-black/30 px-2 py-1 text-[11px] text-gray-200 outline-none placeholder:text-gray-600 focus:border-blue-500/60"
            placeholder="api key"
            type="password"
            value={byok.key}
            onChange={(e) => setByok({ ...byok, key: e.target.value })}
          />
          <input
            className="w-full rounded border border-white/10 bg-black/30 px-2 py-1 text-[11px] text-gray-200 outline-none placeholder:text-gray-600 focus:border-blue-500/60"
            placeholder="model"
            value={byok.model}
            onChange={(e) => setByok({ ...byok, model: e.target.value })}
          />
        </div>
      )}
    </div>
  );
}

function ListView({ nodes, onOpen, onAdopt }: { nodes: NodeMeta[]; onOpen: (id: string) => void; onAdopt: (id: string) => void }) {
  return (
    <div className="space-y-2">
      {[...nodes].reverse().map((n) => (
        <div key={n.id} className="rounded-md border border-white/10 bg-white/[0.03] p-2 hover:border-white/20">
          <div className="mb-1 flex items-center gap-2 text-[10px] text-gray-500">
            <span className="rounded-full px-1.5 py-0.5 font-medium text-white" style={{ background: STATUS_META[n.status].color }}>
              {STATUS_META[n.status].label}
            </span>
            <span className="font-mono">{n.id}</span>
            {n.model && <span className="truncate text-gray-600">{n.model}</span>}
          </div>
          <div className="cursor-pointer text-xs text-gray-200" onClick={() => onOpen(n.id)}>
            {n.prompt}
          </div>
          {n.diffSummary && <div className="mt-1 truncate font-mono text-[10px] text-emerald-500/80">{n.diffSummary}</div>}
          <div className="mt-1.5 flex gap-1">
            <button className="rounded px-1.5 py-0.5 text-[10px] text-gray-400 hover:bg-white/10" onClick={() => onOpen(n.id)}>
              窓で開く
            </button>
            {n.status !== "adopted" && (
              <button className="flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] text-emerald-400 hover:bg-emerald-500/10" onClick={() => onAdopt(n.id)}>
                <Check size={10} /> 採用
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function BoardView({ nodes, onOpen }: { nodes: NodeMeta[]; onOpen: (id: string) => void }) {
  const cols: NodeMeta["status"][] = ["generating", "review", "adopted", "abandoned", "draft"];
  return (
    <div className="space-y-3">
      {cols.map((s) => {
        const items = nodes.filter((n) => n.status === s);
        if (items.length === 0) return null;
        return (
          <div key={s}>
            <div className="mb-1 flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider" style={{ color: STATUS_META[s].color }}>
              {STATUS_META[s].label} ({items.length})
            </div>
            <div className="space-y-1">
              {items.map((n) => (
                <div
                  key={n.id}
                  className="cursor-pointer rounded border border-white/10 bg-white/[0.03] px-2 py-1.5 text-[11px] text-gray-300 hover:border-white/20"
                  onClick={() => onOpen(n.id)}
                >
                  {n.prompt.length > 40 ? n.prompt.slice(0, 40) + "…" : n.prompt}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
