// テスト用APIサーバ起動（dummy AIモード・HOSTキーなし）
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

const DATA_DIR = path.join(__dirname, "..", "..", ".test-data");
fs.mkdirSync(DATA_DIR, { recursive: true });

const server = spawn(
  process.execPath,
  [path.join(__dirname, "..", "..", "server", "dist", "index.js")],
  {
    env: {
      ...process.env,
      PORT: "5181",
      DATA_DIR,
      HOST_OPENAI_KEY: "", // dummyモードで動作
    },
    stdio: "inherit",
  },
);

process.on("SIGTERM", () => { server.kill(); process.exit(0); });
process.on("SIGINT", () => { server.kill(); process.exit(0); });
