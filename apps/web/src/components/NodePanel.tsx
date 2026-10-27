import React, { useEffect, useMemo, useState } from "react";
import { Eye, FolderCode, GitCompare, Loader2 } from "lucide-react";
import * as Y from "yjs";
import { useStore, getNodeFiles } from "../store";
import * as api from "../api";
import { FilesPanel } from "./FilesPanel";
import { buildPreviewHtml } from "./preview";
import { STATUS_META, titleOf, type NodeMeta } from "../types";

type Tab = "preview" | "files" | "diff";
type Files = Record<string, string>;

function useNodeFiles(nodeId: string | null) {
  const roomId = useStore((s) => s.roomId);
  const token = useStore((s) => s.token);
  const ensureNode = useStore((s) => s.ensureNode);
  const filesRev = useStore((s) => s.filesRev);
  const [snapshot, setSnapshot] = useState<Files | null>(null);

  useEffect(() => {
    if (!nodeId || !roomId || !token) return;
    ensureNode(nodeId);
    let alive = true;
    api
      .getSnapshotWithHash(roomId, token, nodeId)
      .then((snap) => alive && setSnapshot(snap.files))
      .catch(() => alive && setSnapshot(null));
    return () => {
      alive = false;
    };
  }, [nodeId, roomId, token, ensureNode]);

  return useMemo(() => {
    void filesRev;
    if (!nodeId) return snapshot;
    const map = getNodeFiles(nodeId);
    if (!map || map.size === 0) return snapshot;
    const out: Files = {};
    map.forEach((text, path) => {
      if (text instanceof Y.Text) out[path] = text.toString();
    });
    return out;
  }, [nodeId, snapshot, filesRev]);
}

function DiffView({ node }: { node: NodeMeta }) {
  const roomId = useStore((s) => s.roomId);
  const token = useStore((s) => s.token);
  const [state, setState] = useState<{ loading: boolean; rows: { path: string; kind: string; detail: string }[] }>({
    loading: true,
    rows: [],
  });

  useEffect(() => {
    if (!roomId || !token) return;
    let alive = true;
    setState({ loading: true, rows: [] });
    Promise.all([
      api.getSnapshotWithHash(roomId, token, node.id),
      api.getSnapshotWithHash(roomId, token, node.parentId ?? "root"),
    ])
      .then(([after, before]) => {
        if (!alive) return;
        const rows: { path: string; kind: string; detail: string }[] = [];
        const paths = new Set([...Object.keys(before.files), ...Object.keys(after.files)]);
        for (const path of [...paths].sort()) {
          const a = before.files[path];
          const b = after.files[path];
          if (a === b) continue;
          if (a === undefined) rows.push({ path, kind: "追加", detail: `${b.split("\n").length} 行` });
          else if (b === undefined) rows.push({ path, kind: "削除", detail: `${a.split("\n").length} 行` });
          else {
            const beforeLines = a.split("\n").length;
            const afterLines = b.split("\n").length;
            rows.push({ path, kind: "変更", detail: `${beforeLines} → ${afterLines} 行` });
          }
        }
        setState({ loading: false, rows });
      })
      .catch(() => alive && setState({ loading: false, rows: [] }));
    return () => {
      alive = false;
    };
  }, [roomId, token, node.id, node.parentId]);

  if (state.loading) {
    return (
      <div className="flex h-full items-center justify-center text-gray-500">
        <Loader2 size={16} className="animate-spin" />
      </div>
    );
  }
  if (state.rows.length === 0) return <div className="p-3 text-xs text-gray-500">基点からの変更はありません</div>;

  return (
    <div className="space-y-1 p-2">
      {state.rows.map((row) => (
        <div key={row.path} className="flex items-center gap-2 rounded border border-white/10 bg-white/[0.03] px-2 py-1 text-[11px]">
          <span
            className={
              row.kind === "追加" ? "text-emerald-400" : row.kind === "削除" ? "text-red-400" : "text-amber-400"
            }
          >
            {row.kind}
          </span>
          <span className="truncate font-mono text-gray-300">{row.path}</span>
          <span className="ml-auto shrink-0 text-gray-600">{row.detail}</span>
        </div>
      ))}
    </div>
  );
}

export function NodePanel({ nodeId }: { nodeId: string | null }) {
  const nodes = useStore((s) => s.nodes);
  const windows = useStore((s) => s.windows);
  const activeWinId = useStore((s) => s.activeWinId);
  const updateWin = useStore((s) => s.updateWin);
  const adopt = useStore((s) => s.adopt);
  const files = useNodeFiles(nodeId);
  const [tab, setTab] = useState<Tab>("preview");

  const node = nodeId ? (nodes.find((n) => n.id === nodeId) ?? null) : null;
  const html = useMemo(() => (files ? buildPreviewHtml(files) : null), [files]);

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-[#0e1118]">
      <div className="flex h-9 shrink-0 items-center gap-2 border-b border-white/10 px-3">
        <span className="truncate text-[11px] text-gray-400">{node ? titleOf(node) : "プレビューする版を選んでください"}</span>
        {node && (
          <span
            className="shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium text-white"
            style={{ background: STATUS_META[node.status].color }}
          >
            {STATUS_META[node.status].label}
          </span>
        )}
        {/* タブは左寄せ: 右側にフローティング窓が重なっても操作できる */}
        <div className="ml-2 flex items-center gap-1">
          {(
            [
              ["preview", "プレビュー", <Eye key="p" size={11} />],
              ["files", "ファイル", <FolderCode key="f" size={11} />],
              ["diff", "差分", <GitCompare key="d" size={11} />],
            ] as [Tab, string, React.ReactNode][]
          ).map(([id, label, icon]) => (
            <button
              key={id}
              className={`flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] ${
                tab === id ? "bg-white/10 text-gray-100" : "text-gray-500 hover:text-gray-300"
              }`}
              onClick={() => setTab(id)}
            >
              {icon}
              {label}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-1">
          {node && node.status !== "adopted" && (
            <button
              className="rounded px-1.5 py-0.5 text-[10px] text-emerald-400 hover:bg-emerald-500/10"
              onClick={() => adopt(node.id)}
            >
              採用
            </button>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1">
        {!nodeId ? (
          <div className="flex h-full items-center justify-center text-xs text-gray-500">
            窓を開くか、作業を選ぶとプレビューが表示されます
          </div>
        ) : tab === "files" ? (
          <FilesPanel
            nodeId={nodeId}
            onSaved={(childId) => {
              if (activeWinId && windows.some((w) => w.id === activeWinId)) {
                updateWin(activeWinId, { nodeId: childId });
              }
            }}
          />
        ) : tab === "diff" && node ? (
          <DiffView node={node} />
        ) : html ? (
          <iframe
            key={`${nodeId}:${files ? Object.keys(files).length : 0}:${tab}`}
            title="preview"
            sandbox="allow-scripts"
            className="h-full w-full border-0 bg-white"
            srcDoc={html}
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-1 text-xs text-gray-500">
            <span>プレビューできる HTML がありません</span>
            <span className="text-[10px] text-gray-600">index.html を追加するとここに表示されます</span>
          </div>
        )}
      </div>
    </div>
  );
}
