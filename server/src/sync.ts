// @ts-nocheck
import { WebSocketServer } from "ws";
import { Hocuspocus } from "@hocuspocus/server";

// P0同期サーバ：認証はjoinToken照合のみ（本番はserverのrooms参照に置換）。
// 起動: npm run dev:sync / SYNC_PORT=1234
const port = Number(process.env.SYNC_PORT ?? 1234);
const hocuspocus = new Hocuspocus({
  async onAuthenticate(data) {
    const token = data.requestParameters?.get("token");
    if (!token) throw new Error("missing token");
    // TODO: serverのroomsに問い合わせてroom存在+joinToken一致を確認
  },
});

const wss = new WebSocketServer({ port });
wss.on("connection", (ws, req) => hocuspocus.handleConnection(ws, req));
console.log(`aiduchi sync :${port}`);
