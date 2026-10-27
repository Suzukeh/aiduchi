import React, { useEffect, useMemo, useState } from "react";
import { FileText, Loader2, Save, Pencil, Eye, Wifi, WifiOff } from "lucide-react";
import CodeMirror from "@uiw/react-codemirror";
import { markdown } from "@codemirror/lang-markdown";
import { javascript } from "@codemirror/lang-javascript";
import { json } from "@codemirror/lang-json";
import { html } from "@codemirror/lang-html";
import { oneDark } from "@codemirror/theme-one-dark";
import { ytextSync } from "../collab";
import * as Y from "yjs";
import { useStore, getNodeFiles } from "../store";
import * as api from "../api";

type Files = Record<string, string>;

const BASIC_SETUP = { lineNumbers: true, foldGutter: false, highlightActiveLine: true };

function langFor(path: string) {
  if (path.endsWith(".html")) return [html()];
  if (path.endsWith(".md")) return [markdown()];
  if (path.endsWith(".json")) return [json()];
  if (/\.(ts|tsx|js|jsx|mjs|cjs)$/.test(path)) {
    return [javascript({ jsx: true, typescript: path.endsWith("ts") || path.endsWith("tsx") })];
  }
  return [];
}

/**
 * チェックポイント（ノード）単位のファイル閲覧・編集。
 * 共同編集はノードごとのY.Docに接続するので、別分岐の同名ファイルとは混ざらない。
 * 初期内容は同期サーバがスナップショットから一度だけ流し込む。
 */
export function FilesPanel({ nodeId, onSaved }: { nodeId: string; onSaved?: (childId: string) => void }) {
  const roomId = useStore((s) => s.roomId);
  const token = useStore((s) => s.token);
  const saveFiles = useStore((s) => s.saveFiles);
  const setError = useStore((s) => s.setError);
  const ensureNode = useStore((s) => s.ensureNode);
  const filesRev = useStore((s) => s.filesRev);
  const connected = useStore((s) => s.nodeSynced[nodeId] ?? false);

  const [base, setBase] = useState<{ files: Files; hash: string } | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setLocalError] = useState("");

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setEditing(false);
    setLocalError("");
    ensureNode(nodeId);
    if (!roomId || !token) return;
    api
      .getSnapshotWithHash(roomId, token, nodeId)
      .then((snap) => {
        if (!alive) return;
        setBase(snap);
        setSelected((cur) => (cur && snap.files[cur] !== undefined ? cur : (Object.keys(snap.files)[0] ?? null)));
      })
      .catch((e) => alive && setLocalError(e instanceof Error ? e.message : "load failed"))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [nodeId, roomId, token, ensureNode]);

  const files: Files = useMemo(() => {
    void filesRev;
    const map = getNodeFiles(nodeId);
    if (!map || map.size === 0) return base?.files ?? {};
    const out: Files = {};
    map.forEach((text, path) => {
      if (text instanceof Y.Text) out[path] = text.toString();
    });
    return out;
  }, [nodeId, base, filesRev, connected]);

  // 共同編集の拡張は同一インスタンスを保つ（毎レンダーで作り直すと再構成で内容が消える）
  const collab = useMemo(() => {
    if (!editing || !selected) return null;
    const text = getNodeFiles(nodeId)?.get(selected) ?? null;
    if (!text) return null;
    return { text, initial: text.toString() };
    // filesRev: 同期でY.Textが増えたときに再取得する
  }, [editing, selected, nodeId, filesRev, base]);

  const dirty = useMemo(() => {
    if (!base) return false;
    const keys = new Set([...Object.keys(base.files), ...Object.keys(files)]);
    for (const k of keys) if ((base.files[k] ?? "") !== (files[k] ?? "")) return true;
    return false;
  }, [base, files]);

  async function save() {
    if (!roomId || !token || !base) return;
    setSaving(true);
    setLocalError("");
    try {
      const child = await saveFiles(nodeId, files, `手動編集: ${selected ?? "(複数)"}`, base.hash);
      setEditing(false);
      onSaved?.(child.id);
    } catch (e) {
      const message = e instanceof Error ? e.message : "save failed";
      setLocalError(message);
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  if (loading && !base) {
    return (
      <div className="flex h-full items-center justify-center text-gray-500">
        <Loader2 size={16} className="animate-spin" />
      </div>
    );
  }
  if (error) return <div className="p-3 text-xs text-red-400">{error}</div>;

  return (
    <div className="flex h-full flex-col">
      <div className="flex min-h-0 flex-1">
        <div className="w-40 shrink-0 overflow-y-auto border-r border-white/10 p-1.5">
          <div className="mb-1 flex items-center justify-between px-1">
            <span className="text-[10px] uppercase tracking-wider text-gray-600">Files</span>
            <span title={connected ? "共同編集中" : "未接続"}>
              {connected ? <Wifi size={10} className="text-emerald-500" /> : <WifiOff size={10} className="text-gray-600" />}
            </span>
          </div>
          {Object.keys(files).length === 0 && <div className="px-1 py-2 text-[11px] text-gray-500">ファイルがありません</div>}
          {Object.keys(files)
            .sort()
            .map((path) => (
              <button
                key={path}
                className={`flex w-full items-center gap-1 rounded px-1.5 py-1 text-left text-[11px] ${
                  selected === path ? "bg-blue-600/20 text-blue-300" : "text-gray-400 hover:bg-white/5 hover:text-gray-200"
                }`}
                onClick={() => setSelected(path)}
                title={path}
              >
                <FileText size={10} className="shrink-0" />
                <span className="truncate">{path}</span>
              </button>
            ))}
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          {selected ? (
            <>
              <div className="flex shrink-0 items-center gap-2 border-b border-white/10 px-2 py-1">
                <span className="truncate text-[10px] text-gray-500">{selected}</span>
                <div className="ml-auto flex items-center gap-1">
                  <button
                    className={`flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] ${editing ? "bg-white/10 text-gray-200" : "text-gray-500 hover:text-gray-300"}`}
                    onClick={() => setEditing((v) => !v)}
                  >
                    {editing ? <Eye size={10} /> : <Pencil size={10} />}
                    {editing ? "表示" : "編集"}
                  </button>
                  {dirty && (
                    <button
                      className="flex items-center gap-1 rounded bg-emerald-600 px-1.5 py-0.5 text-[10px] text-white hover:bg-emerald-500 disabled:opacity-40"
                      onClick={save}
                      disabled={saving}
                    >
                      {saving ? <Loader2 size={10} className="animate-spin" /> : <Save size={10} />}
                      保存
                    </button>
                  )}
                </div>
              </div>
              <div className="relative min-h-0 flex-1 overflow-hidden text-[11px]">
                {editing ? (
                  collab ? (
                    <div className="absolute inset-0 overflow-auto">
                      <CodeMirror
                        key={`${nodeId}:${selected}`}
                        value={collab.initial}
                        theme={oneDark}
                        extensions={[ytextSync(collab.text), ...langFor(selected)]}
                        basicSetup={BASIC_SETUP}
                        height="100%"
                      />
                    </div>
                  ) : (
                    <div className="p-3 text-xs text-gray-500">
                      この版はまだ同期していません。接続を待つか、表示モードで内容を確認してください。
                    </div>
                  )
                ) : (
                  <div className="absolute inset-0 overflow-auto">
                    <pre className="whitespace-pre-wrap p-3 font-mono leading-relaxed text-gray-300">{files[selected] ?? ""}</pre>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-gray-500">ファイルを選択してください</div>
          )}
        </div>
      </div>
      {dirty && (
        <div className="shrink-0 border-t border-white/10 px-2 py-1 text-[10px] text-amber-400">
          未保存の変更があります（保存すると新しいチェックポイントになります）
        </div>
      )}
    </div>
  );
}
