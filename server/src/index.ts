import express from "express";
import cors from "cors";
import { randomUUID, createHash } from "node:crypto";
import { CreateRoom, CreateNode, CodePatch } from "@aiduchi/protocol";
import { db, monthUsage, type RoomRow, type NodeRow } from "./db.js";
import { resolveCreds, generatePatch, dummyPatch, streamChat } from "./ai.js";

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

const now = () => new Date().toISOString();
const hash = (s: string) => createHash("sha256").update(s).digest("hex");

function authRoom(req: express.Request): RoomRow | null {
  const room = db.prepare(`SELECT * FROM rooms WHERE id = ?`).get(req.params.id) as RoomRow | undefined;
  if (!room) return null;
  if (req.header("x-room-token") !== room.joinToken) return null;
  return room;
}

function publicNode(n: NodeRow) {
  return { ...n, promptTokens: undefined, completionTokens: undefined };
}

function latestFiles(roomId: string): Record<string, string> {
  const row = db.prepare(`SELECT data FROM snapshots WHERE roomId = ? ORDER BY createdAt DESC LIMIT 1`).get(roomId) as { data: string } | undefined;
  if (!row) return {};
  try {
    return (JSON.parse(row.data) as { files: Record<string, string> }).files ?? {};
  } catch {
    return {};
  }
}

app.get("/healthz", (_req, res) => res.json({ ok: true }));

app.post("/api/rooms", (req, res) => {
  const parsed = CreateRoom.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  const id = randomUUID().slice(0, 8);
  const joinToken = randomUUID();
  const adminToken = randomUUID();
  db.prepare(`INSERT INTO rooms (id, name, adapterKind, joinToken, adminTokenHash, createdAt) VALUES (?, ?, ?, ?, ?, ?)`)
    .run(id, parsed.data.name, parsed.data.adapterKind, joinToken, hash(adminToken), now());
  db.prepare(`INSERT INTO snapshots (id, roomId, nodeId, data, createdAt) VALUES (?, ?, 'root', ?, ?)`)
    .run(randomUUID(), id, JSON.stringify({ files: { "README.md": `# ${parsed.data.name}\n` } }), now());
  res.json({ id, joinToken, adminToken });
});

app.get("/api/rooms/:id", (req, res) => {
  const room = authRoom(req);
  if (!room) return res.status(404).json({ error: "not found" });
  res.json({ id: room.id, name: room.name, adapterKind: room.adapterKind });
});

app.get("/api/rooms/:id/nodes", (req, res) => {
  const room = authRoom(req);
  if (!room) return res.status(404).json({ error: "not found" });
  const list = db.prepare(`SELECT * FROM nodes WHERE roomId = ? ORDER BY createdAt ASC`).all(room.id) as NodeRow[];
  res.json(list.map(publicNode));
});

app.get("/api/rooms/:id/snapshots/:nodeId", (req, res) => {
  const room = authRoom(req);
  if (!room) return res.status(404).json({ error: "not found" });
  const snap = db.prepare(`SELECT * FROM snapshots WHERE roomId = ? AND nodeId = ?`).get(room.id, req.params.nodeId) as { data: string } | undefined;
  if (!snap) return res.status(404).json({ error: "not found" });
  res.json(JSON.parse(snap.data));
});

app.post("/api/rooms/:id/nodes", async (req, res) => {
  const room = authRoom(req);
  if (!room) return res.status(404).json({ error: "not found" });
  const parsed = CreateNode.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  if (parsed.data.parentId) {
    const parent = db.prepare(`SELECT * FROM nodes WHERE id = ? AND roomId = ?`).get(parsed.data.parentId, room.id) as NodeRow | undefined;
    if (!parent) return res.status(400).json({ error: "parent not found" });
  }

  const creds = resolveCreds(req);
  if (creds && "forbidden" in creds) return res.status(403).json({ error: creds.forbidden });

  const parentRow = parsed.data.parentId
    ? (db.prepare(`SELECT rootId FROM nodes WHERE id = ?`).get(parsed.data.parentId) as { rootId: string })
    : null;
  const nodeId = randomUUID().slice(0, 8);
  const insert = (status: string) => {
    db.prepare(
      `INSERT INTO nodes (id, roomId, parentId, rootId, authorType, authorLabel, prompt, status, provider, model, diffSummary, createdAt) VALUES (?, ?, ?, ?, 'user', 'you', ?, ?, ?, ?, ?, ?)`,
    ).run(nodeId, room.id, parsed.data.parentId, parentRow?.rootId ?? parsed.data.parentId ?? "root",
      parsed.data.prompt, status,
      creds && !("forbidden" in creds) ? creds.provider : creds ? "host" : "dummy",
      creds && !("forbidden" in creds) ? creds.model : "dummy-0.1",
      null, now());
  };
  insert("generating");

  try {
    // 予算 enforcement（BYOKは対象外、集計のみ）
    if (creds && !creds.byok) {
      const limit = Number(process.env.ROOM_MONTHLY_TOKEN_LIMIT ?? 1000000);
      if (monthUsage(room.id) >= limit) {
        db.prepare(`UPDATE nodes SET status = 'draft', diffSummary = 'budget exceeded' WHERE id = ?`).run(nodeId);
        return res.status(403).json({ error: "room token budget exceeded" });
      }
    }

    let steps: { op: string; path: string; content?: string }[];
    let pt = 0, ct = 0;
    let provider = "dummy", model = "dummy-0.1";
    if (!creds) {
      steps = dummyPatch(parsed.data.prompt, nodeId, provider, model).steps as typeof steps;
    } else {
      provider = creds.provider; model = creds.model;
      const out = await generatePatch(creds, parsed.data.prompt, latestFiles(room.id), `aiduchi-${room.id}`);
      steps = out.patch.steps as typeof steps;
      pt = out.promptTokens; ct = out.completionTokens;
      db.prepare(`INSERT INTO ai_usage (roomId, nodeId, provider, model, promptTokens, completionTokens, byok, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(room.id, nodeId, provider, model, pt, ct, creds.byok ? 1 : 0, now());
    }

    const validated = CodePatch.safeParse({ steps });
    if (!validated.success) throw new Error("invalid patch");
    const nextFiles = { ...latestFiles(room.id) };
    const touched: string[] = [];
    for (const s of validated.data.steps) {
      if (s.op === "upsertFile") { nextFiles[s.path] = s.content; touched.push("+" + s.path); }
      else { delete nextFiles[s.path]; touched.push("-" + s.path); }
    }
    db.prepare(`INSERT INTO snapshots (id, roomId, nodeId, data, createdAt) VALUES (?, ?, ?, ?, ?)`)
      .run(randomUUID(), room.id, nodeId, JSON.stringify({ files: nextFiles }), now());
    db.prepare(`UPDATE nodes SET status = 'review', provider = ?, model = ?, promptTokens = ?, completionTokens = ?, diffSummary = ? WHERE id = ?`)
      .run(provider, model, pt, ct, touched.join(", ").slice(0, 500), nodeId);
    const node = db.prepare(`SELECT * FROM nodes WHERE id = ?`).get(nodeId) as NodeRow;
    res.json(publicNode(node));
  } catch (e) {
    const msg = e instanceof Error ? e.message : "ai failed";
    db.prepare(`UPDATE nodes SET status = 'draft', diffSummary = ? WHERE id = ?`).run(`error: ${msg}`.slice(0, 500), nodeId);
    const node = db.prepare(`SELECT * FROM nodes WHERE id = ?`).get(nodeId) as NodeRow;
    res.status(502).json({ ...publicNode(node), error: msg });
  }
});

// SSE: キーあり→上流stream中継、なし→ダミー。どちらもイベント形は token/patch/done/error
app.post("/api/rooms/:id/nodes/:nodeId/chat", async (req, res) => {
  const room = authRoom(req);
  if (!room) return res.status(404).json({ error: "not found" });
  const creds = resolveCreds(req);
  if (creds && "forbidden" in creds) return res.status(403).json({ error: creds.forbidden });
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  const send = (event: string, data: unknown) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  if (!creds) {
    send("token", { text: "aiduchi: 相槌を打ちました。（HOSTキー未設定のためダミー応答）" });
    send("patch", { steps: [] });
    send("done", { ok: true, dummy: true });
    return res.end();
  }
  try {
    let pt = 0, ct = 0;
    for await (const chunk of streamChat(creds, String(req.body?.prompt ?? "hello"), `aiduchi-${room.id}`)) {
      if ("text" in chunk && chunk.text) send("token", { text: chunk.text });
      else if ("done" in chunk && chunk.done) { pt = chunk.usage.promptTokens; ct = chunk.usage.completionTokens; }
    }
    db.prepare(`INSERT INTO ai_usage (roomId, nodeId, provider, model, promptTokens, completionTokens, byok, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(room.id, req.params.nodeId, creds.provider, creds.model, pt, ct, creds.byok ? 1 : 0, now());
    send("done", { ok: true });
    res.end();
  } catch (e) {
    send("error", { message: e instanceof Error ? e.message : "stream failed" });
    res.end();
  }
});

app.post("/api/rooms/:id/nodes/:nodeId/adopt", (req, res) => {
  const room = authRoom(req);
  if (!room) return res.status(404).json({ error: "not found" });
  const target = db.prepare(`SELECT * FROM nodes WHERE id = ? AND roomId = ?`).get(req.params.nodeId, room.id) as NodeRow | undefined;
  if (!target) return res.status(404).json({ error: "not found" });
  db.prepare(`UPDATE nodes SET status = 'review' WHERE roomId = ? AND status = 'adopted'`).run(room.id);
  db.prepare(`UPDATE nodes SET status = 'adopted' WHERE id = ?`).run(req.params.nodeId);
  res.json(publicNode({ ...target, status: "adopted" }));
});

app.post("/api/rooms/:id/nodes/:nodeId/abandon", (req, res) => {
  const room = authRoom(req);
  if (!room) return res.status(404).json({ error: "not found" });
  const target = db.prepare(`SELECT * FROM nodes WHERE id = ? AND roomId = ?`).get(req.params.nodeId, room.id) as NodeRow | undefined;
  if (!target) return res.status(404).json({ error: "not found" });
  db.prepare(`UPDATE nodes SET status = 'abandoned' WHERE id = ?`).run(req.params.nodeId);
  res.json(publicNode({ ...target, status: "abandoned" }));
});

// 共有窓配置の永続化（ドラッグ中間値はYjs、確定形だけここにPUT）
app.get("/api/rooms/:id/windows", (req, res) => {
  const room = authRoom(req);
  if (!room) return res.status(404).json({ error: "not found" });
  res.json(db.prepare(`SELECT * FROM windows WHERE roomId = ?`).all(room.id));
});

app.put("/api/rooms/:id/windows", (req, res) => {
  const room = authRoom(req);
  if (!room) return res.status(404).json({ error: "not found" });
  const wins = Array.isArray(req.body?.windows) ? req.body.windows : null;
  if (!wins) return res.status(400).json({ error: "windows[] required" });
  for (const w of wins.slice(0, 50)) {
    if (!w?.id || !w?.nodeId) continue;
    db.prepare(`INSERT INTO windows (id, roomId, nodeId, x, y, w, h, z, minimized, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET nodeId = excluded.nodeId, x = excluded.x, y = excluded.y, w = excluded.w, h = excluded.h, z = excluded.z, minimized = excluded.minimized, updatedAt = excluded.updatedAt`)
      .run(String(w.id), room.id, String(w.nodeId), Number(w.x) || 0, Number(w.y) || 0, Number(w.w) || 340, Number(w.h) || 220, Number(w.z) || 1, w.minimized ? 1 : 0, now());
  }
  res.json({ ok: true });
});

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => console.log(`aiduchi server :${port}`));
