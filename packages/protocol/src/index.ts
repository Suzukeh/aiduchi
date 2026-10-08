import { z } from "zod";

// ---- Node status ----
export const NodeStatus = z.enum(["draft", "generating", "review", "adopted", "abandoned"]);
export type NodeStatus = z.infer<typeof NodeStatus>;

export const NodeMeta = z.object({
  id: z.string(),
  roomId: z.string(),
  parentId: z.string().nullable(),
  rootId: z.string(),
  authorType: z.enum(["user", "ai"]),
  authorLabel: z.string(),
  prompt: z.string(),
  status: NodeStatus,
  provider: z.string().nullable(),
  model: z.string().nullable(),
  diffSummary: z.string().nullable(),
  createdAt: z.string(),
});
export type NodeMeta = z.infer<typeof NodeMeta>;

// ---- code adapter patch (P0最小) ----
export const CodePatchStep = z.discriminatedUnion("op", [
  z.object({ op: z.literal("upsertFile"), path: z.string().min(1), content: z.string() }),
  z.object({ op: z.literal("deleteFile"), path: z.string().min(1) }),
]);
export const CodePatch = z.object({ steps: z.array(CodePatchStep).max(20) });
export type CodePatch = z.infer<typeof CodePatch>;

// ---- video adapter patch (P1予約) ----
export const VideoPatchStep = z.discriminatedUnion("op", [
  z.object({ op: z.literal("addClip"), trackId: z.string(), startFrame: z.number().int(), durationFrames: z.number().int(), assetId: z.string() }),
  z.object({ op: z.literal("trim"), itemId: z.string(), startFrame: z.number().int(), durationFrames: z.number().int() }),
  z.object({ op: z.literal("setKeyframe"), itemId: z.string(), prop: z.string(), frame: z.number().int(), value: z.number() }),
  z.object({ op: z.literal("addText"), trackId: z.string(), startFrame: z.number().int(), text: z.string().max(500) }),
]);
export const VideoPatch = z.object({ steps: z.array(VideoPatchStep).max(20) });

// ---- Adapter I/F ----
export interface ProjectAdapter<TProject, TPatch> {
  kind: string;
  emptyProject(): TProject;
  applyPatch(project: TProject, patch: TPatch): TProject;
  summarizeDiff(before: TProject, after: TProject): string;
}

// ---- Window ----
export const WindowState = z.object({
  id: z.string(),
  nodeId: z.string(),
  x: z.number(), y: z.number(), w: z.number(), h: z.number(), z: z.number(),
  minimized: z.boolean(),
});
export type WindowState = z.infer<typeof WindowState>;

// ---- API ----
export const CreateRoom = z.object({
  name: z.string().min(1).max(100),
  adapterKind: z.enum(["code", "video"]).default("code"),
});
export const CreateNode = z.object({
  parentId: z.string().nullable(),
  prompt: z.string().min(1).max(5000),
});
