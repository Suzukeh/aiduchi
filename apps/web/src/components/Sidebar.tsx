import React, { useMemo, useState } from "react";
import { Plus, RefreshCw, GitBranch, Check, Users, KeyRound, Link2, Copy, List } from "lucide-react";
import { useStore } from "../store";
import { STATUS_META, titleOf, type NodeMeta } from "../types";

/** 親→子の順に並べ、深さでインデントする（リストでも関係が分かるように） */
function flatten(nodes: NodeMeta[]): { node: NodeMeta; depth: number }[] {
  const children = new Map<string | null, NodeMeta[]>();
  for (const n of nodes) {
    const key = n.parentId;
    if (!children.has(key)) children.set(key, []);
    children.get(key)!.push(n);
  }
  const out: { node: NodeMeta; depth: number }[] = [];
  const walk = (parentId: string | null, depth: number) => {
    for (const child of children.get(parentId) ?? []) {
      out.push({ node: child, depth });
      walk(child.id, depth + 1);
    }
  };
  walk(null, 0);
  return out;
}

export function Sidebar({ onShowTree }: { onShowTree: () => void }) {
  const roomId = useStore((s) => s.roomId);
  const roomName = useStore((s) => s.roomName);
  const nodes = useStore((s) => s.nodes);
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

  const rows = useMemo(() => flatten(nodes), [nodes]);

  async function handleCreate() {
    setCreating(true);
    await createRoom(name);
    setCreating(false);
  }

  return (
    <aside className="flex h-full w-72 shrink-0 flex-col border-r border-white/10 bg-[#0f1219]">
      <div className="border-b border-white/10 p-3">
        <div className="mb-3 flex items-center gap-2">
          <span className="text-sm font-semibold tracking-wide text-gray-100">aiduchi</span>
          <span className="text-[10px] text-gray-600">collab vibe coding</span>
          <span
            className={`ml-auto h-2 w-2 rounded-full ${synced ? "bg-emerald-500" : "bg-gray-600"}`}
            title={synced ? "同期中" : "未接続"}
          />
        </div>

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
            <span className="truncate" title={roomName || roomId}>
              {roomName || roomId}
            </span>
            <button className="rounded p-1 hover:bg-white/10 hover:text-gray-300" onClick={() => refreshNodes()} title="更新">
              <RefreshCw size={11} />
            </button>
            <ShareButton />
          </div>
        )}
        {error && <div className="mt-2 rounded bg-red-500/10 px-2 py-1 text-[11px] text-red-400">{error}</div>}
      </div>

      <div className="flex items-center gap-1 border-b border-white/10 px-3 py-2">
        <span className="flex items-center gap-1 text-[11px] text-gray-300">
          <List size={12} /> 作業とチェックポイント
        </span>
        <button
          className="ml-auto flex items-center gap-1 rounded px-2 py-1 text-[11px] text-gray-400 hover:bg-white/10 hover:text-gray-200"
          onClick={onShowTree}
        >
          <GitBranch size={12} /> ツリー
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {rows.length === 0 && roomId && (
          <div className="mt-6 px-2 text-center text-xs text-gray-600">
            窓から指示を送ると、ここに作業のチェックポイントが並びます
          </div>
        )}
        <div className="space-y-1.5">
          {rows.map(({ node, depth }) => (
            <div
              key={node.id}
              className="rounded-md border border-white/10 bg-white/[0.03] p-2 hover:border-white/20"
              style={{ marginLeft: Math.min(depth, 4) * 10 }}
            >
              <div className="mb-1 flex items-center gap-1.5 text-[10px] text-gray-500">
                <span
                  className="shrink-0 rounded-full px-1.5 py-0.5 font-medium text-white"
                  style={{ background: STATUS_META[node.status].color }}
                >
                  {STATUS_META[node.status].label}
                </span>
                <span className="truncate text-gray-600">{node.authorLabel || "you"}</span>
                {depth > 0 && <span className="ml-auto shrink-0 text-gray-700">深さ{depth}</span>}
              </div>
              <button className="block w-full text-left text-xs text-gray-200" onClick={() => openWindow(node.id)}>
                {titleOf(node)}
              </button>
              {node.diffSummary && (
                <div className="mt-1 truncate font-mono text-[10px] text-emerald-500/80">{node.diffSummary}</div>
              )}
              <div className="mt-1.5 flex gap-1">
                <button className="rounded px-1.5 py-0.5 text-[10px] text-gray-400 hover:bg-white/10" onClick={() => openWindow(node.id)}>
                  窓で開く
                </button>
                {node.status !== "adopted" && (
                  <button
                    className="flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] text-emerald-400 hover:bg-emerald-500/10"
                    onClick={() => adopt(node.id)}
                  >
                    <Check size={10} /> 採用
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
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
            placeholder="api key（このタブ内のみ・保存しません）"
            type="password"
            autoComplete="off"
            value={byok.key}
            onChange={(e) => setByok({ ...byok, key: e.target.value })}
          />
          <input
            className="w-full rounded border border-white/10 bg-black/30 px-2 py-1 text-[11px] text-gray-200 outline-none placeholder:text-gray-600 focus:border-blue-500/60"
            placeholder="model"
            value={byok.model}
            onChange={(e) => setByok({ ...byok, model: e.target.value })}
          />
          <div className="text-[10px] leading-relaxed text-gray-600">
            キーはメモリにのみ保持し、localStorage・DB・ログには保存しません。リロードで消えます。
          </div>
        </div>
      )}
    </div>
  );
}
