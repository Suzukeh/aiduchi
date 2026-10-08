import type { VideoProject } from "@aiduchi/protocol";

/**
 * resolveTimeline(frame, project) → canvas描画（純粋関数）
 * Preview と export が同じこの関数を使うことでドリフトを防ぐ。
 */
export function renderSceneToContext(ctx: CanvasRenderingContext2D, project: VideoProject, frame: number, scale = 1) {
  const { width, height, tracks, items } = project;
  const w = width * scale;
  const h = height * scale;

  ctx.fillStyle = "#0a0a1a";
  ctx.fillRect(0, 0, w, h);

  const visible = Object.values(items)
    .filter((it) => frame >= it.startFrame && frame < it.startFrame + it.durationFrames)
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
      ctx.font = `${Math.round(h * 0.06)}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(it.text, w / 2, h / 2);
    } else {
      const pad = 0.05;
      ctx.fillStyle = it.color;
      ctx.fillRect(w * pad, h * pad, w * (1 - pad * 2), h * (1 - pad * 2));
      ctx.fillStyle = "#fff";
      ctx.font = `${Math.round(h * 0.04)}px sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText(it.id.slice(0, 12), w / 2, h / 2);
    }
  }
  ctx.globalAlpha = 1;

  // frame counter（プレビュー表示用・exportではscale=1なので目立たない）
  if (scale < 1) {
    ctx.fillStyle = "#666";
    ctx.font = `${Math.round(12 * scale)}px monospace`;
    ctx.textAlign = "left";
    ctx.fillText(`f${frame}`, 8, h - 8);
  }
}

/** プロジェクトの総フレーム数 */
export function totalFrames(project: VideoProject): number {
  return Math.max(1, ...Object.values(project.items).map((i) => i.startFrame + i.durationFrames));
}
