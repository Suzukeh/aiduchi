import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const dir = process.env.DATA_DIR ?? "./data";
mkdirSync(dir, { recursive: true });

export const db = new DatabaseSync(join(dir, "aiduchi.db"));
db.exec(`PRAGMA journal_mode = WAL`);

db.exec(`CREATE TABLE IF NOT EXISTS rooms (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  adapterKind TEXT NOT NULL DEFAULT 'code',
  joinToken TEXT NOT NULL,
  adminTokenHash TEXT NOT NULL,
  createdAt TEXT NOT NULL
)`);

db.exec(`CREATE TABLE IF NOT EXISTS nodes (
  id TEXT PRIMARY KEY,
  roomId TEXT NOT NULL REFERENCES rooms(id),
  parentId TEXT,
  rootId TEXT NOT NULL DEFAULT 'root',
  authorType TEXT NOT NULL,
  authorLabel TEXT NOT NULL DEFAULT '',
  prompt TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft',
  provider TEXT,
  model TEXT,
  promptTokens INTEGER NOT NULL DEFAULT 0,
  completionTokens INTEGER NOT NULL DEFAULT 0,
  diffSummary TEXT,
  createdAt TEXT NOT NULL
)`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_nodes_room ON nodes(roomId)`);

db.exec(`CREATE TABLE IF NOT EXISTS snapshots (
  id TEXT PRIMARY KEY,
  roomId TEXT NOT NULL REFERENCES rooms(id),
  nodeId TEXT NOT NULL,
  data TEXT NOT NULL,
  createdAt TEXT NOT NULL
)`);
db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_snapshots_node ON snapshots(roomId, nodeId)`);

db.exec(`CREATE TABLE IF NOT EXISTS windows (
  id TEXT PRIMARY KEY,
  roomId TEXT NOT NULL REFERENCES rooms(id),
  nodeId TEXT NOT NULL DEFAULT 'root',
  x REAL NOT NULL DEFAULT 40, y REAL NOT NULL DEFAULT 80,
  w REAL NOT NULL DEFAULT 340, h REAL NOT NULL DEFAULT 220,
  z REAL NOT NULL DEFAULT 1,
  minimized INTEGER NOT NULL DEFAULT 0,
  updatedAt TEXT NOT NULL
)`);

db.exec(`CREATE TABLE IF NOT EXISTS ai_usage (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  roomId TEXT NOT NULL,
  nodeId TEXT NOT NULL DEFAULT '',
  provider TEXT NOT NULL DEFAULT '',
  model TEXT NOT NULL DEFAULT '',
  promptTokens INTEGER NOT NULL DEFAULT 0,
  completionTokens INTEGER NOT NULL DEFAULT 0,
  byok INTEGER NOT NULL DEFAULT 0,
  createdAt TEXT NOT NULL
)`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_usage_room_month ON ai_usage(roomId, createdAt)`);

export type RoomRow = {
  id: string; name: string; adapterKind: "code" | "video";
  joinToken: string; adminTokenHash: string; createdAt: string;
};

export type NodeRow = {
  id: string; roomId: string; parentId: string | null; rootId: string;
  authorType: "user" | "ai"; authorLabel: string; prompt: string; status: string;
  provider: string | null; model: string | null;
  promptTokens: number; completionTokens: number;
  diffSummary: string | null; createdAt: string;
};

export function monthUsage(roomId: string): number {
  const month = new Date().toISOString().slice(0, 7);
  const row = db.prepare(
    `SELECT COALESCE(SUM(promptTokens + completionTokens), 0) AS t FROM ai_usage WHERE roomId = ? AND substr(createdAt, 1, 7) = ? AND byok = 0`
  ).get(roomId, month) as { t: number };
  return row.t;
}
