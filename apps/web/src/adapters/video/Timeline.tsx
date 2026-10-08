import React, { useCallback, useRef, useState } from "react";
import type { VideoProject, VideoItem, VideoTrack } from "@aiduchi/protocol";

type Props = {
  project: VideoProject;
  currentFrame: number;
  selectedItemId: string | null;
  onSeek: (frame: number) => void;
  onSelect: (itemId: string | null) => void;
  onMoveItem: (itemId: string, trackId: string, startFrame: number) => void;
  onTrimItem: (itemId: string, startFrame: number, durationFrames: number) => void;
};

const PX_PER_SEC = 40;
const TRACK_HEIGHT = 48;

function frameToX(frame: number, fps: number): number {
  return (frame / fps) * PX_PER_SEC;
}
function xToFrame(x: number, fps: number): number {
  return Math.max(0, Math.round((x / PX_PER_SEC) * fps));
}

export function Timeline({ project, currentFrame, selectedItemId, onSeek, onSelect, onMoveItem, onTrimItem }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<{ itemId: string; mode: "move" | "trim-l" | "trim-r"; startX: number; origStart: number; origDur: number } | null>(null);
  const { fps, tracks, items } = project;
  const totalItems = Object.values(items);
  const maxFrame = Math.max(300, ...totalItems.map((i) => i.startFrame + i.durationFrames));
  const width = frameToX(maxFrame, fps) + 200;

  const itemsByTrack = useCallback((trackId: string): VideoItem[] => {
    return totalItems.filter((i) => i.trackId === trackId).sort((a, b) => a.startFrame - b.startFrame);
  }, [totalItems]);

  function handleRulerClick(e: React.MouseEvent) {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    onSeek(xToFrame(e.clientX - rect.left, fps));
  }

  function startDrag(e: React.MouseEvent, itemId: string, mode: "move" | "trim-l" | "trim-r") {
    e.stopPropagation();
    const it = items[itemId];
    if (!it) return;
    setDragging({ itemId, mode, startX: e.clientX, origStart: it.startFrame, origDur: it.durationFrames });
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (!dragging) return;
    const it = items[dragging.itemId];
    if (!it) return;
    const dx = e.clientX - dragging.startX;
    const df = xToFrame(Math.abs(dx), fps) * Math.sign(dx);
    if (dragging.mode === "move") {
      const newStart = Math.max(0, dragging.origStart + df);
      onMoveItem(dragging.itemId, it.trackId, newStart);
    } else if (dragging.mode === "trim-l") {
      const newStart = Math.max(0, dragging.origStart + df);
      const newDur = Math.max(1, dragging.origDur - (newStart - dragging.origStart));
      onTrimItem(dragging.itemId, newStart, newDur);
    } else {
      const newDur = Math.max(1, dragging.origDur + df);
      onTrimItem(dragging.itemId, dragging.origStart, newDur);
    }
  }

  function endDrag() { setDragging(null); }

  // Ruler marks
  const rulerMarks: number[] = [];
  for (let f = 0; f <= maxFrame; f += fps) rulerMarks.push(f);

  return (
    <div style={{ overflowX: "auto", overflowY: "auto", maxHeight: 300, border: "1px solid #ddd", background: "#1a1a2e", color: "#eee", userSelect: "none" }}
      onMouseMove={handleMouseMove} onMouseUp={endDrag} onMouseLeave={endDrag}>
      {/* Ruler */}
      <div ref={ref} onClick={handleRulerClick} style={{ position: "sticky", top: 0, height: 28, background: "#16213e", cursor: "pointer", borderBottom: "1px solid #333", width, minWidth: "100%" }}>
        {rulerMarks.map((f) => (
          <div key={f} style={{ position: "absolute", left: frameToX(f, fps), top: 0, height: 28, borderLeft: "1px solid #444", paddingLeft: 3, fontSize: 10, color: "#888", lineHeight: "28px" }}>
            {f}
          </div>
        ))}
        {/* Playhead */}
        <div style={{ position: "absolute", left: frameToX(currentFrame, fps), top: 0, bottom: -1000, width: 2, background: "#ff6b6b", zIndex: 10, pointerEvents: "none" }} />
      </div>

      {/* Tracks */}
      {tracks.map((track) => (
        <div key={track.id} style={{ display: "flex", height: TRACK_HEIGHT, borderBottom: "1px solid #2a2a4a", width, minWidth: "100%", position: "relative" }}>
          {/* Track label */}
          <div style={{ position: "sticky", left: 0, width: 60, background: "#16213e", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "#aaa", zIndex: 5, borderRight: "1px solid #333" }}>
            {track.name}
          </div>
          {/* Lane */}
          <div style={{ flex: 1, position: "relative", height: "100%" }}>
            {itemsByTrack(track.id).map((it) => {
              const x = frameToX(it.startFrame, fps);
              const w = Math.max(4, frameToX(it.durationFrames, fps));
              const sel = selectedItemId === it.id;
              return (
                <div key={it.id}
                  onMouseDown={(e) => { onSelect(it.id); startDrag(e, it.id, "move"); }}
                  style={{
                    position: "absolute", left: x, top: 6, width: w, height: TRACK_HEIGHT - 14,
                    background: it.type === "text" ? "#6c5ce7" : it.color,
                    border: sel ? "2px solid #ffd32a" : "1px solid #555",
                    borderRadius: 4, cursor: "move", opacity: it.opacity,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 10, overflow: "hidden", whiteSpace: "nowrap", color: "#fff",
                  }}>
                  {it.type === "text" ? `T: ${it.text.slice(0, 12)}` : it.id.slice(0, 8)}
                  {/* trim handles */}
                  <div onMouseDown={(e) => startDrag(e, it.id, "trim-l")} style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 6, cursor: "ew-resize", background: "rgba(255,255,255,0.3)" }} />
                  <div onMouseDown={(e) => startDrag(e, it.id, "trim-r")} style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 6, cursor: "ew-resize", background: "rgba(255,255,255,0.3)" }} />
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
