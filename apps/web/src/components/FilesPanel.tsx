import React, { useEffect, useState } from "react";
import { FileText, RefreshCw, Loader2 } from "lucide-react";
import { useStore } from "../store";
import * as api from "../api";

type Files = Record<string, string>;

export function FilesPanel({ nodeId }: { nodeId: string }) {
  const roomId = useStore((s) => s.roomId);
  const token = useStore((s) => s.token);
  const [files, setFiles] = useState<Files | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    if (!roomId || !token) return;
    setLoading(true);
    setError("");
    try {
      const snap = (await api.getSnapshot(roomId, token, nodeId)) as { files?: Files };
      const f = snap?.files ?? {};
      setFiles(f);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodeId, roomId, token]);

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

  return (
    <div className="flex h-full">
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
          </button>
        ))}
      </div>
      {/* content */}
      <div className="min-w-0 flex-1 overflow-auto">
        {selected && files[selected] !== undefined ? (
          <pre className="p-3 font-mono text-[11px] leading-relaxed text-gray-300 whitespace-pre-wrap">{files[selected]}</pre>
        ) : (
          <div className="p-3 text-xs text-gray-500">ファイルを選択</div>
        )}
      </div>
    </div>
  );
}
