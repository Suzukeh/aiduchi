// @ts-nocheck
import { WebSocketServer } from "ws";
import { Hocuspocus } from "@hocuspocus/server";
import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import * as Y from "yjs";

const dir = process.env.DATA_DIR ?? "./data";
mkdirSync(dir, { recursive: true });
const db = new DatabaseSync(join(dir, "aiduchi.db"));
db.exec(`PRAGMA busy_timeout = 5000`);
try { db.exec(`PRAGMA journal_mode = WAL`); } catch { /* already set by another process */ }
db.exec(`CREATE TABLE IF NOT EXISTS ydocs (
  docName TEXT PRIMARY KEY,
  state BLOB NOT NULL,
  updatedAt TEXT NOT NULL
)`);

const saveStmt = db.prepare(
  `INSERT INTO ydocs (docName, state, updatedAt) VALUES (?, ?, ?)
   ON CONFLICT(docName) DO UPDATE SET state = excluded.state, updatedAt = excluded.updatedAt`,
);
const loadStmt = db.prepare(`SELECT state FROM ydocs WHERE docName = ?`);
const findRoomStmt = db.prepare(`SELECT joinToken FROM rooms WHERE id = ?`);
const snapshotStmt = db.prepare(`SELECT data FROM snapshots WHERE roomId = ? AND nodeId = ?`);

/** room:{roomId}:node:{nodeId} — nodeId is "root", "lobby" or a checkpoint id */
export function parseDocName(name) {
  const m = /^room:([0-9a-f-]{4,64}):node:([A-Za-z0-9_-]{1,64})$/.exec(String(name));
  return m ? { roomId: m[1], nodeId: m[2] } : null;
}

function roomTokenOk(documentName, token) {
  const parsed = parseDocName(documentName);
  if (!parsed || !token) return false;
  const row = findRoomStmt.get(parsed.roomId);
  return !!row && row.joinToken === token;
}

export function filesOf(roomId, nodeId) {
  if (nodeId === "lobby") return {};
  const row = snapshotStmt.get(roomId, nodeId);
  if (!row?.data) return {};
  try {
    const parsed = JSON.parse(row.data);
    return parsed && typeof parsed.files === "object" && parsed.files ? parsed.files : {};
  } catch {
    return {};
  }
}

/**
 * Seed a new document exactly once, on the server, from the checkpoint snapshot.
 * Seeding here (not in each browser) is what stops two participants inserting the
 * same initial text twice and what keeps branch documents independent.
 */
function seedDocument(document, roomId, nodeId) {
  const meta = document.getMap("meta");
  if (meta.get("initialized")) return;
  const files = filesOf(roomId, nodeId);
  const filesMap = document.getMap("files");
  document.transact(() => {
    if (meta.get("initialized")) return;
    for (const [path, content] of Object.entries(files)) {
      const text = new Y.Text();
      const str = typeof content === "string" ? content : String(content ?? "");
      if (str.length > 0) text.insert(0, str);
      filesMap.set(path, text);
    }
    meta.set("initialized", true);
    meta.set("seedNodeId", nodeId);
    meta.set("seededAt", new Date().toISOString());
  }, "server-seed");
}

const hocuspocus = new Hocuspocus({
  async onAuthenticate(data) {
    const token =
      data.token ??
      data.requestParameters?.get("token") ??
      data.requestHeaders?.["x-room-token"];
    if (!roomTokenOk(data.documentName, token)) {
      throw new Error("unauthorized");
    }
    return { user: "guest" };
  },

  async onLoadDocument({ document, documentName }) {
    try {
      const row = loadStmt.get(documentName);
      if (row?.state) {
        const bytes = row.state instanceof Uint8Array ? row.state : new Uint8Array(row.state);
        if (bytes.length > 0) Y.applyUpdate(document, bytes);
      }
      const parsed = parseDocName(documentName);
      if (parsed) seedDocument(document, parsed.roomId, parsed.nodeId);
    } catch (e) {
      console.warn(`onLoadDocument ${documentName}:`, e.message);
    }
    return document;
  },

  async onStoreDocument({ document, documentName }) {
    try {
      const update = Y.encodeStateAsUpdate(document);
      saveStmt.run(documentName, Buffer.from(update), new Date().toISOString());
    } catch (e) {
      console.warn(`onStoreDocument ${documentName}:`, e.message);
    }
  },
});

const port = Number(process.env.SYNC_PORT ?? 1234);
const wss = new WebSocketServer({ port });
wss.on("connection", (ws, req) => hocuspocus.handleConnection(ws, req));
console.log(`aiduchi sync :${port}`);
