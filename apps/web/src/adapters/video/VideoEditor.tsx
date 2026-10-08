import React, { useCallback, useEffect, useRef, useState } from "react";
import { emptyVideoProject, applyVideoPatch, videoDiffSummary, type VideoProject, type VideoPatch } from "@aiduchi/protocol";
import { Timeline } from "./Timeline";
import { Preview } from "./Preview";
import { Inspector } from "./Inspector";
import { isExportSupported, exportAndDownload, type ExportProgress } from "./export";

type Props = {
  /** サーバーから取得したプロジェクト（初回ロード用） */
  initialProject: VideoProject | null;
  /** AI生成結果のpatchを適用するためのキー。変化したらapply */
  aiPatch: VideoPatch | null;
  onProjectChange: (project: VideoProject, summary: string) => void;
};

export function VideoEditor({ initialProject, aiPatch, onProjectChange }: Props) {
  const [project, setProject] = useState<VideoProject>(initialProject ?? emptyVideoProject());
  const [currentFrame, setCurrentFrame] = useState(0);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<ExportProgress | null>(null);
  const [exportError, setExportError] = useState("");
  const rafRef = useRef<number>(0);
  const projectRef = useRef(project);
  projectRef.current = project;

  // 初回プロジェクト読み込み
  useEffect(() => {
    if (initialProject) setProject(initialProject);
  }, [initialProject]);

  // AI patch適用
  useEffect(() => {
    if (!aiPatch) return;
    const before = projectRef.current;
    const after = applyVideoPatch(before, aiPatch);
    const summary = videoDiffSummary(before, after);
    setProject(after);
    onProjectChange(after, summary);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aiPatch]);

  // 再生ループ
  useEffect(() => {
    if (!playing) { cancelAnimationFrame(rafRef.current); return; }
    let last = performance.now();
    const loop = (now: number) => {
      const dt = now - last;
      last = now;
      setCurrentFrame((f) => {
        const next = f + Math.round((dt / 1000) * projectRef.current.fps);
        return next;
      });
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [playing]);

  const update = useCallback((fn: (p: VideoProject) => VideoProject, summary: string) => {
    setProject((prev) => {
      const next = fn(prev);
      onProjectChange(next, summary);
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onMoveItem = useCallback((itemId: string, trackId: string, startFrame: number) => {
    update((p) => applyVideoPatch(p, { steps: [{ op: "moveItem", itemId, trackId, startFrame }] }), `move ${itemId}`);
  }, [update]);

  const onTrimItem = useCallback((itemId: string, startFrame: number, durationFrames: number) => {
    update((p) => applyVideoPatch(p, { steps: [{ op: "trimItem", itemId, startFrame, durationFrames }] }), `trim ${itemId}`);
  }, [update]);

  const onSetProp = useCallback((itemId: string, prop: "text" | "color" | "opacity", value: string | number) => {
    update((p) => applyVideoPatch(p, { steps: [{ op: "setProp", itemId, prop, value }] }), `set ${prop} ${itemId}`);
  }, [update]);

  const onRemoveItem = useCallback((itemId: string) => {
    update((p) => applyVideoPatch(p, { steps: [{ op: "removeItem", itemId }] }), `remove ${itemId}`);
    setSelectedItemId(null);
  }, [update]);

  async function handleExport() {
    if (!isExportSupported()) { setExportError("このブラウザはWebCodecs非対応です（Chrome/Edge推奨）"); return; }
    setExporting(true); setExportError(""); setExportProgress(null);
    try {
      await exportAndDownload(projectRef.current, "aiduchi-export", (p) => setExportProgress(p));
    } catch (e) {
      setExportError(e instanceof Error ? e.message : "export failed");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, height: "100%" }}>
      {/* transport */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0" }}>
        <button onClick={() => setPlaying(!playing)} style={{ width: 32 }}>{playing ? "⏸" : "▶"}</button>
        <button onClick={() => { setPlaying(false); setCurrentFrame(0); }} style={{ width: 32 }}>⏮</button>
        <input type="range" min={0} max={Math.max(300, ...Object.values(project.items).map((i) => i.startFrame + i.durationFrames))}
          value={currentFrame} onChange={(e) => { setPlaying(false); setCurrentFrame(Number(e.target.value)); }} style={{ flex: 1 }} />
        <span style={{ fontSize: 11, color: "#888", width: 80, textAlign: "right" }}>{currentFrame}f</span>
        <button onClick={handleExport} disabled={exporting}
          style={{ fontSize: 11, padding: "4px 10px", borderRadius: 4, border: "1px solid #4a90d9", background: exporting ? "#333" : "#4a90d9", color: "#fff", cursor: exporting ? "wait" : "pointer" }}>
          {exporting ? `MP4出力中 ${exportProgress?.percent ?? 0}%` : "MP4出力"}
        </button>
      </div>
      {exportError && <div style={{ color: "#ff6b6b", fontSize: 11 }}>{exportError}</div>}
      {exporting && exportProgress && (
        <div style={{ height: 3, background: "#222", borderRadius: 2 }}>
          <div style={{ height: "100%", background: "#4a90d9", borderRadius: 2, width: `${exportProgress.percent}%`, transition: "width 0.2s" }} />
        </div>
      )}

      {/* Preview + Inspector */}
      <div style={{ display: "flex", gap: 4, flex: 1, minHeight: 200 }}>
        <div style={{ flex: 1 }}>
          <Preview project={project} currentFrame={currentFrame} />
        </div>
        <div style={{ width: 220, border: "1px solid #ddd", borderRadius: 4, overflow: "auto" }}>
          <Inspector project={project} selectedItemId={selectedItemId} onSetProp={onSetProp} onRemoveItem={onRemoveItem} onTrimItem={onTrimItem} />
        </div>
      </div>

      {/* Timeline */}
      <Timeline project={project} currentFrame={currentFrame} selectedItemId={selectedItemId}
        onSeek={(f) => { setPlaying(false); setCurrentFrame(f); }}
        onSelect={setSelectedItemId} onMoveItem={onMoveItem} onTrimItem={onTrimItem} />
    </div>
  );
}
