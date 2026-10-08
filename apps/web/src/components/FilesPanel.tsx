import React, { useEffect, useState } from "react";
import { FileText, RefreshCw, Loader2, Save, Pencil, Eye } from "lucide-react";
import { useStore } from "../store";
import * as api from "../api";

type Files = Record<string, string>;

export function FilesPanel({ nodeId }: { nodeId: string }) {
  const roomId = useStore((s) => s.roomId);
  const token = useStore((s) => s.token);
  const userName = useStore((s) => s.userName);
  const refreshNodes = useStore((s) => s.refreshNodes);
  const [files, setFiles] = useState<Files | null>(null);
  const [edits, setEdits] = useState<Files>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");

  const dirty = Object.keys(edits).some((k) => edits[k] !== (files?.[k] ?? undefined));

  async function load() {
    if (!roomId || !token) return;
    setLoading(true);
    setError("");
    try {
      const snap = (await api.getSnapshot(roomId, token, nodeId)) as { files?: Files };
      const f = snap?.files ?? {};
      setFiles(f);
      setEdits({});
      const first = Object.keys(f)[0] ?? null;
      setSelected((cur) => (cur && f[cur] !== undefined ? cur : first));
    } catch (e) {
      setError(e instanceof Error ? e.message : "load failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    setEditing(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodeId, roomId, token]);

  async function save() {
    if (!roomId || !token || !files) return;
    setSaving(true);
    setError("");
    try {
      const next: Files = { ...files, ...edits };
      await api.saveSnapshot(roomId, token, nodeId, next, `手動編集: ${selected ?? ""}`, userName);
      await refreshNodes();
      await load();
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "save failed");
    } finally {
      setSaving(false);
    }
  }

  if (loading && !files) {
    return (
      <div className="flex h-full items-center justify-center text-gray-500">
        <Loader2 size={16} className="animate-spin" />
      </div>
    );
  }
  if (error) {
    return <div className="p-3 text-xs text-red-400">{error}</div>;
  }
  if (!files || Object.keys(files).length === 0) {
    return <div className="p-3 text-xs text-gray-500">ファイルがありません</div>;
  }

  const currentContent = selected ? (edits[selected] ?? files[selected] ?? "") : "";

  return (
    <div className="flex h-full flex-col">
      <div className="flex min-h-0 flex-1">
        {/* file list */}
        <div className="w-40 shrink-0 overflow-y-auto border-r border-white/10 p-1.5">
          <div className="mb-1 flex items-center justify-between px-1">
            <span className="text-[10px] uppercase tracking-wider text-gray-600">Files</span>
            <button className="rounded p-0.5 text-gray-500 hover:bg-white/10 hover:text-gray-300" onClick={load} title="再読込">
              <RefreshCw size={10} />
            </button>
          </div>
          {Object.keys(files).map((path) => (
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
              {edits[path] !== undefined && edits[path] !== files[path] && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-amber-400" />}
            </button>
          ))}
        </div>
        {/* content */}
        <div className="flex min-w-0 flex-1 flex-col">
          {selected && (
            <>
              <div className="flex shrink-0 items-center gap-2 border-b border-white/10 px-2 py-1">
                <span className="truncate text-[10px] text-gray-500">{selected}</span>
                <div className="ml-auto flex items-center gap-1">
                  <button
                    className={`flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] ${editing ? "bg-white/10 text-gray-200" : "text-gray-500 hover:text-gray-300"}`}
                    onClick={() => setEditing(!editing)}
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
              {editing ? (
                <textarea
                  className="min-h-0 flex-1 resize-none bg-black/20 p-3 font-mono text-[11px] leading-relaxed text-gray-200 outline-none"
                  value={currentContent}
                  onChange={(e) => setEdits((prev) => ({ ...prev, [selected]: e.target.value }))}
                  spellCheck={false}
                />
              ) : (
                <pre className="min-h-0 flex-1 overflow-auto p-3 font-mono text-[11px] leading-relaxed whitespace-pre-wrap text-gray-300">{currentContent}</pre>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
