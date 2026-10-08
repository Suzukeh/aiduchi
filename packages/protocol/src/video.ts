import { z } from "zod";

// ── ProjectJSON: 正規化された映像プロジェクト表現（SSOT） ──
// Preview / Export / AI が同じこのJSONだけを見る

export const VideoAsset = z.object({
  id: z.string(),
  name: z.string(),
  kind: z.enum(["color", "image", "video", "audio"]),
  url: z.string().default(""),
  durationFrames: z.number().int().default(0),
});
export type VideoAsset = z.infer<typeof VideoAsset>;

export const VideoTrack = z.object({
  id: z.string(),
  kind: z.enum(["video", "audio", "text"]),
  name: z.string(),
  muted: z.boolean().default(false),
  locked: z.boolean().default(false),
});
export type VideoTrack = z.infer<typeof VideoTrack>;

export const VideoItem = z.object({
  id: z.string(),
  trackId: z.string(),
  type: z.enum(["clip", "text"]),
  startFrame: z.number().int().min(0),
  durationFrames: z.number().int().min(1),
  assetId: z.string().default(""),
  text: z.string().default(""),
  color: z.string().default("#4a90d9"),
  opacity: z.number().min(0).max(1).default(1),
});
export type VideoItem = z.infer<typeof VideoItem>;

export const VideoProject = z.object({
  fps: z.number().default(30),
  width: z.number().default(1920),
  height: z.number().default(1080),
  tracks: z.array(VideoTrack),
  items: z.record(VideoItem),
  assets: z.record(VideoAsset),
});
export type VideoProject = z.infer<typeof VideoProject>;

export function emptyVideoProject(): VideoProject {
  return {
    fps: 30, width: 1920, height: 1080,
    tracks: [
      { id: "v1", kind: "video", name: "V1", muted: false, locked: false },
      { id: "v2", kind: "video", name: "V2", muted: false, locked: false },
      { id: "t1", kind: "text", name: "T1", muted: false, locked: false },
    ],
    items: {},
    assets: {},
  };
}

// ── typed patch steps: AI語彙 = Inspectorに出せるものだけ ──

export const VideoPatchStep = z.discriminatedUnion("op", [
  z.object({ op: z.literal("addClip"), trackId: z.string(), startFrame: z.number().int().min(0), durationFrames: z.number().int().min(1), color: z.string().optional(), assetId: z.string().optional() }),
  z.object({ op: z.literal("addText"), trackId: z.string(), startFrame: z.number().int().min(0), durationFrames: z.number().int().min(1), text: z.string().max(500), color: z.string().optional() }),
  z.object({ op: z.literal("trimItem"), itemId: z.string(), startFrame: z.number().int().min(0), durationFrames: z.number().int().min(1) }),
  z.object({ op: z.literal("moveItem"), itemId: z.string(), trackId: z.string(), startFrame: z.number().int().min(0) }),
  z.object({ op: z.literal("setProp"), itemId: z.string(), prop: z.enum(["text", "color", "opacity"]), value: z.union([z.string(), z.number()]) }),
  z.object({ op: z.literal("removeItem"), itemId: z.string() }),
  z.object({ op: z.literal("addTrack"), kind: z.enum(["video", "audio", "text"]), name: z.string().max(50) }),
  z.object({ op: z.literal("removeTrack"), trackId: z.string() }),
]);
export const VideoPatch = z.object({ steps: z.array(VideoPatchStep).max(20) });
export type VideoPatch = z.infer<typeof VideoPatch>;

// ── applyPatch: 純粋関数 ──

export function applyVideoPatch(project: VideoProject, patch: VideoPatch): VideoProject {
  const p: VideoProject = JSON.parse(JSON.stringify(project));
  for (const s of patch.steps) {
    switch (s.op) {
      case "addClip": {
        const id = `c${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        p.items[id] = { id, trackId: s.trackId, type: "clip", startFrame: s.startFrame, durationFrames: s.durationFrames, assetId: s.assetId ?? "", text: "", color: s.color ?? "#4a90d9", opacity: 1 };
        break;
      }
      case "addText": {
        const id = `t${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        p.items[id] = { id, trackId: s.trackId, type: "text", startFrame: s.startFrame, durationFrames: s.durationFrames, assetId: "", text: s.text, color: s.color ?? "#ffffff", opacity: 1 };
        break;
      }
      case "trimItem": {
        const it = p.items[s.itemId];
        if (it) { it.startFrame = s.startFrame; it.durationFrames = s.durationFrames; }
        break;
      }
      case "moveItem": {
        const it = p.items[s.itemId];
        if (it) { it.trackId = s.trackId; it.startFrame = s.startFrame; }
        break;
      }
      case "setProp": {
        const it = p.items[s.itemId];
        if (it) {
          if (s.prop === "text" && typeof s.value === "string") it.text = s.value;
          else if (s.prop === "color" && typeof s.value === "string") it.color = s.value;
          else if (s.prop === "opacity" && typeof s.value === "number") it.opacity = Math.max(0, Math.min(1, s.value));
        }
        break;
      }
      case "removeItem": {
        delete p.items[s.itemId];
        break;
      }
      case "addTrack": {
        const id = s.kind[0] + (p.tracks.length + 1);
        p.tracks.push({ id, kind: s.kind, name: s.name, muted: false, locked: false });
        break;
      }
      case "removeTrack": {
        p.tracks = p.tracks.filter((t) => t.id !== s.trackId);
        for (const [k, it] of Object.entries(p.items)) {
          if (it.trackId === s.trackId) delete p.items[k];
        }
        break;
      }
    }
  }
  return p;
}

export function videoDiffSummary(before: VideoProject, after: VideoProject): string {
  const added = Object.keys(after.items).filter((k) => !before.items[k]).length;
  const removed = Object.keys(before.items).filter((k) => !after.items[k]).length;
  const changed = Object.keys(after.items).filter((k) => before.items[k] && JSON.stringify(before.items[k]) !== JSON.stringify(after.items[k])).length;
  const trackDelta = after.tracks.length - before.tracks.length;
  const parts: string[] = [];
  if (added) parts.push(`+${added}items`);
  if (removed) parts.push(`-${removed}items`);
  if (changed) parts.push(`~${changed}items`);
  if (trackDelta) parts.push(`${trackDelta > 0 ? "+" : ""}${trackDelta}tracks`);
  return parts.join(", ") || "no change";
}
