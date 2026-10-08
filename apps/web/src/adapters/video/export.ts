import { Muxer, ArrayBufferTarget } from "mp4-muxer";
import type { VideoProject } from "@aiduchi/protocol";
import { renderSceneToContext, totalFrames } from "./renderScene";

/**
 * ProjectJSON → MP4 エクスポート。
 * Previewと同じ resolveTimeline 相当の描画ロジックを使う（ゼロドリフト）。
 * WebCodecs + mp4-muxer 使用。非対応ブラウザでは isExportSupported() で事前判定。
 */

export function isExportSupported(): boolean {
  return typeof VideoEncoder !== "undefined" && typeof VideoFrame !== "undefined";
}

export type ExportProgress = { frame: number; totalFrames: number; percent: number };

export async function exportVideo(
  project: VideoProject,
  onProgress: (p: ExportProgress) => void,
): Promise<Blob> {
  const { width, height, fps } = project;
  const tf = totalFrames(project);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;

  const target = new ArrayBufferTarget();
  const muxer = new Muxer({
    target,
    video: { codec: "avc", width, height, frameRate: fps },
    fastStart: "in-memory",
  });

  let encoderError: Error | null = null;
  const encoder = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error: (e) => { encoderError = e as Error; },
  });
  encoder.configure({
    codec: "avc1.420028", // H.264 Baseline Level 4.0 (1080p対応)
    width, height,
    bitrate: 5_000_000,
    framerate: fps,
  });

  const frameDurationUs = Math.round(1_000_000 / fps);
  let keyframeInterval = Math.round(fps * 2); // 2秒ごとにキーフレーム

  for (let f = 0; f < tf; f++) {
    if (encoderError) throw encoderError;
    renderSceneToContext(ctx, project, f, 1);
    const videoFrame = new VideoFrame(canvas, { timestamp: f * frameDurationUs, duration: frameDurationUs });
    encoder.encode(videoFrame, { keyFrame: f % keyframeInterval === 0 });
    videoFrame.close();
    onProgress({ frame: f + 1, totalFrames: tf, percent: Math.round(((f + 1) / tf) * 100) });
    // エンコーダのキューが詰まったら待つ
    while (encoder.encodeQueueSize > 4) {
      await new Promise((r) => setTimeout(r, 10));
    }
    // UIフリーズ防止のため時折yield
    if (f % 10 === 0) await new Promise((r) => setTimeout(r, 0));
  }

  await encoder.flush();
  encoder.close();
  muxer.finalize();

  return new Blob([target.buffer], { type: "video/mp4" });
}

/** エクスポート実行＋ダウンロード */
export async function exportAndDownload(project: VideoProject, filename: string, onProgress: (p: ExportProgress) => void) {
  const blob = await exportVideo(project, onProgress);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".mp4") ? filename : `${filename}.mp4`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  return blob;
}
