import express from "express";
import cors from "cors";
import { randomUUID } from "node:crypto";
import { CreateRoom, CreateNode, CodePatch } from "@aiduchi/protocol";

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

type Room = { id: string; name: string; adapterKind: "code" | "video"; joinToken: string; adminToken: string; createdAt: string };
type Node = { id: string; roomId: string; parentId: string | null; rootId: string; authorType: "user" | "ai"; authorLabel: string; prompt: string; status: string; provider: string | null; model: string | null; diffSummary: string | null; createdAt: string };
type Snapshot = { id: string; roomId: string; nodeId: string; data: unknown; createdAt: string };

const rooms = new Map<string, Room>();
const nodes = new Map<string, Node[]>(); // roomId -> nodes
const snapshots = new Map<string, Snapshot[]>(); // roomId -> snapshots

function authRoom(req: express.Request): Room | null {
  const id = req.params.id;
  const room = rooms.get(id);
  if (!room) return null;
  if (req.header("x-room-token") !== room.joinToken) return null;
  return room;
}

app.get("/healthz", (_req, res) => res.json({ ok: true }));

app.post("/api/rooms", (req, res) => {
  const parsed = CreateRoom.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  const id = randomUUID().slice(0, 8);
  const room: Room = {
    id, name: parsed.data.name, adapterKind: parsed.data.adapterKind,
    joinToken: randomUUID(), adminToken: randomUUID(), createdAt: new Date().toISOString(),
  };
  rooms.set(id, room);
  nodes.set(id, []);
  snapshots.set(id, [{ id: randomUUID(), roomId: id, nodeId: "root", data: { files: { "README.md": "# " + room.name + "\n" } }, createdAt: new Date().toISOString() }]);
  res.json({ id, joinToken: room.joinToken, adminToken: room.adminToken });
});

app.get("/api/rooms/:id", (req, res) => {
  const room = authRoom(req);
  if (!room) return res.status(404).json({ error: "not found" });
  res.json({ id: room.id, name: room.name, adapterKind: room.adapterKind });
});

app.get("/api/rooms/:id/nodes", (req, res) => {
  const room = authRoom(req);
  if (!room) return res.status(404).json({ error: "not found" });
  res.json(nodes.get(room.id) ?? []);
});

app.post("/api/rooms/:id/nodes", (req, res) => {
  const room = authRoom(req);
  if (!room) return res.status(404).json({ error: "not found" });
  const parsed = CreateNode.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  const list = nodes.get(room.id)!;
  const parent = parsed.data.parentId ? list.find((n) => n.id === parsed.data.parentId) : null;
  if (parsed.data.parentId && !parent) return res.status(400).json({ error: "parent not found" });
  const node: Node = {
    id: randomUUID().slice(0, 8), roomId: room.id,
    parentId: parsed.data.parentId, rootId: parent?.rootId ?? parsed.data.parentId ?? "root",
    authorType: "user", authorLabel: "you", prompt: parsed.data.prompt,
    status: "generating", provider: null, model: null, diffSummary: null,
    createdAt: new Date().toISOString(),
  };
  // 兄弟分岐は上書きせず追加する（設計通り）
  list.push(node);

  // P0: ダミーAI適用（HOSTキー未設定でも動く）。本番はここでGateway経由SSEにする
  const byokProvider = req.header("x-byok-provider") ?? null;
  const byokModel = req.header("x-byok-model") ?? null;
  const useProvider = byokProvider ?? (process.env.HOST_OPENAI_KEY ? "host" : "dummy");
  const useModel = byokModel ?? process.env.ALLOWED_MODELS?.split(",")[0] ?? "dummy-0.1";
  const patch = { steps: [{ op: "upsertFile", path: `notes/${node.id}.md`, content: `# ${parsed.data.prompt}\n\n- parent: ${parsed.data.parentId ?? "root"}\n- provider: ${useProvider} / ${useModel}\n` }] };
  const validated = CodePatch.safeParse(patch);
  const roomSnaps = snapshots.get(room.id)!;
  const base = (roomSnaps[roomSnaps.length - 1]?.data as { files: Record<string, string> }) ?? { files: {} };
  const nextFiles = { ...base.files };
  if (validated.success) {
    for (const s of validated.data.steps) {
      if (s.op === "upsertFile") nextFiles[s.path] = s.content;
      else delete nextFiles[s.path];
    }
  }
  roomSnaps.push({ id: randomUUID(), roomId: room.id, nodeId: node.id, data: { files: nextFiles }, createdAt: new Date().toISOString() });
  node.status = "review";
  node.provider = useProvider;
  node.model = useModel;
  node.diffSummary = `+notes/${node.id}.md`;
  res.json(node);
});

// SSEの最小形：P0はダミートークンを流す。本実装はGatewayのストリーム中継に置換
app.post("/api/rooms/:id/nodes/:nodeId/chat", (req, res) => {
  const room = authRoom(req);
  if (!room) return res.status(404).json({ error: "not found" });
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  const send = (event: string, data: unknown) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  send("token", { text: "aiduchi: 相槌を打ちました。" });
  send("patch", { steps: [] });
  send("done", { ok: true });
  res.end();
});

app.post("/api/rooms/:id/nodes/:nodeId/adopt", (req, res) => {
  const room = authRoom(req);
  if (!room) return res.status(404).json({ error: "not found" });
  const list = nodes.get(room.id)!;
  const target = list.find((n) => n.id === req.params.nodeId);
  if (!target) return res.status(404).json({ error: "not found" });
  for (const n of list) if (n.status === "adopted") n.status = "review";
  target.status = "adopted";
  res.json(target);
});

app.post("/api/rooms/:id/nodes/:nodeId/abandon", (req, res) => {
  const room = authRoom(req);
  if (!room) return res.status(404).json({ error: "not found" });
  const list = nodes.get(room.id)!;
  const target = list.find((n) => n.id === req.params.nodeId);
  if (!target) return res.status(404).json({ error: "not found" });
  target.status = "abandoned";
  res.json(target);
});

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => console.log(`aiduchi server :${port}`));
