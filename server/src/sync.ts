// @ts-nocheck
import { WebSocketServer } from "ws";
import { Hocuspocus } from "@hocuspocus/server";
import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { encodeStateAsUpdate, applyUpdate } from "yjs";

const dir = process.env.DATA_DIR ?? "./data";
mkdirSync(dir, { recursive: true });
const db = new DatabaseSync(join(dir, "aiduchi.db"));
db.exec(`PRAGMA journal_mode = WAL`);
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

function roomTokenOk(documentName, token) {
  if (!token) return false;
  const roomId = documentName.startsWith("room:") ? documentName.slice(5) : documentName;
  const row = findRoomStmt.get(roomId);
  return !!row && row.joinToken === token;
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
        if (bytes.length > 0) applyUpdate(document, bytes);
      }
    } catch (e) {
      console.warn(`onLoadDocument ${documentName}:`, e.message);
    }
    return document;
  },

  async onStoreDocument({ document, documentName }) {
    try {
      const update = encodeStateAsUpdate(document);
      saveStmt.run(docName(documentName), Buffer.from(update), new Date().toISOString());
    } catch (e) {
      console.warn(`onStoreDocument ${documentName}:`, e.message);
    }
  },
});

function docName(name) { return name; }

const port = Number(process.env.SYNC_PORT ?? 1234);
const wss = new WebSocketServer({ port });
wss.on("connection", (ws, req) => hocuspocus.handleConnection(ws, req));
console.log(`aiduchi sync :${port}`);
