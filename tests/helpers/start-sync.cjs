// テスト用syncサーバ起動（テスト用DATA_DIRで動作）
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

const DATA_DIR = path.join(__dirname, "..", "..", ".test-data");
fs.mkdirSync(DATA_DIR, { recursive: true });

const server = spawn(
  process.execPath,
  [path.join(__dirname, "..", "..", "server", "dist", "sync.js")],
  {
    env: {
      ...process.env,
      SYNC_PORT: "5182",
      DATA_DIR,
    },
    stdio: "inherit",
  },
);

process.on("SIGTERM", () => { server.kill(); process.exit(0); });
process.on("SIGINT", () => { server.kill(); process.exit(0); });
