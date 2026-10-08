import React, { useEffect, useRef } from "react";
import type { VideoProject } from "@aiduchi/protocol";

type Props = {
  project: VideoProject;
  currentFrame: number;
};

/** フレーム時点のシーンを描画する（純粋関数: resolveTimeline → canvas） */
export function Preview({ project, currentFrame }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { width, height, fps, tracks, items } = project;
    canvas.width = width / 2;
    canvas.height = height / 2;
    const sx = canvas.width / width;
    const sy = canvas.height / height;

    // background
    ctx.fillStyle = "#0a0a1a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // draw items visible at currentFrame, track order (bottom to top)
    const visible = Object.values(items)
      .filter((it) => currentFrame >= it.startFrame && currentFrame < it.startFrame + it.durationFrames)
      .sort((a, b) => {
        const ai = tracks.findIndex((t) => t.id === a.trackId);
        const bi = tracks.findIndex((t) => t.id === b.trackId);
        return ai - bi;
      });

    for (const it of visible) {
      const track = tracks.find((t) => t.id === it.trackId);
      if (track?.muted) continue;
      ctx.globalAlpha = it.opacity;

      if (it.type === "text") {
        ctx.fillStyle = it.color;
        ctx.font = `${Math.round(32 * sy)}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(it.text, canvas.width / 2, canvas.height / 2);
      } else {
        // clip: colored rectangle (placeholder for real video)
        const pad = 0.05;
        ctx.fillStyle = it.color;
        ctx.fillRect(
          canvas.width * pad,
          canvas.height * pad,
          canvas.width * (1 - pad * 2),
          canvas.height * (1 - pad * 2),
        );
        ctx.fillStyle = "#fff";
        ctx.font = `${Math.round(20 * sy)}px sans-serif`;
        ctx.textAlign = "center";
        ctx.fillText(it.id.slice(0, 12), canvas.width / 2, canvas.height / 2);
      }
    }
    ctx.globalAlpha = 1;

    // frame counter
    ctx.fillStyle = "#666";
    ctx.font = `${Math.round(12 * sy)}px monospace`;
    ctx.textAlign = "left";
    ctx.fillText(`f${currentFrame} / ${fps}fps`, 8, canvas.height - 8);
  }, [project, currentFrame]);

  return (
    <div style={{ background: "#000", display: "flex", justifyContent: "center", alignItems: "center", borderRadius: 4, overflow: "hidden" }}>
      <canvas ref={canvasRef} style={{ maxWidth: "100%", height: "auto" }} />
    </div>
  );
}
