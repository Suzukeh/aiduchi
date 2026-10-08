import React, { useEffect, useState } from "react";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";

type Node = {
  id: string; parentId: string | null; prompt: string; status: string;
  provider: string | null; model: string | null; diffSummary: string | null;
};
type Win = { id: string; nodeId: string; x: number; y: number; z: number; minimized: boolean };

const API = "http://localhost:3000";

export function App() {
  const [roomId, setRoomId] = useState("");
  const [token, setToken] = useState("");
  const [roomName, setRoomName] = useState("demo");
  const [nodes, setNodes] = useState<Node[]>([]);
  const [view, setView] = useState<"tree" | "list" | "board">("tree");
  const [wins, setWins] = useState<Win[]>([
    { id: "w1", nodeId: "root", x: 40, y: 80, z: 1, minimized: false },
    { id: "w2", nodeId: "root", x: 420, y: 120, z: 2, minimized: false },
  ]);
  const [prompt, setPrompt] = useState("");
  const [parentId, setParentId] = useState<string | null>(null);

  // Yjs presence stub: windows共有の受け皿（P0はローカルのみ、sync接続は任意）
  useEffect(() => {
    const doc = new Y.Doc();
    const m = doc.getMap("windows");
    m.set("ready", true);
    return () => doc.destroy();
  }, []);

  async function createRoom() {
    const r = await fetch(`${API}/api/rooms`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: roomName, adapterKind: "code" }),
    }).then((r) => r.json());
    setRoomId(r.id); setToken(r.joinToken);
    await refresh(r.id, r.joinToken);
  }

  async function refresh(id = roomId, tk = token) {
    if (!id || !tk) return;
    const list = await fetch(`${API}/api/rooms/${id}/nodes`, { headers: { "x-room-token": tk } }).then((r) => r.json());
    setNodes(list);
  }

  async function send() {
    const n = await fetch(`${API}/api/rooms/${roomId}/nodes`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-room-token": token },
      body: JSON.stringify({ parentId, prompt }),
    }).then((r) => r.json());
    setPrompt("");
    await refresh();
    // 送信した窓の対象を新ノードへ
    setWins((ws) => ws.map((w, i) => (i === 0 ? { ...w, nodeId: n.id } : w)));
  }

  function addWindow() {
    setWins((ws) => [...ws, { id: `w${Date.now()}`, nodeId: parentId ?? "root", x: 60 + ws.length * 40, y: 60 + ws.length * 40, z: ws.length + 1, minimized: false }]);
  }

  return (
    <div style={{ fontFamily: "sans-serif", height: "100vh", display: "flex" }}>
      <aside style={{ width: 300, borderRight: "1px solid #ddd", padding: 12, overflow: "auto" }}>
        <h2>aiduchi P0</h2>
        <div style={{ display: "flex", gap: 8 }}>
          <input value={roomName} onChange={(e) => setRoomName(e.target.value)} placeholder="room name" />
          <button onClick={createRoom}>作成</button>
        </div>
        <div style={{ marginTop: 8, fontSize: 12 }}>
          room: {roomId || "-"}<br />token: {token ? token.slice(0, 8) + "…" : "-"} <button onClick={() => refresh()}>更新</button>
        </div>
        <div style={{ marginTop: 12, display: "flex", gap: 4 }}>
          {(["tree", "list", "board"] as const).map((v) => (
            <button key={v} disabled={view === v} onClick={() => setView(v)}>{v}</button>
          ))}
        </div>
        <div style={{ marginTop: 8 }}>
          {view === "list" && nodes.map((n) => (
            <div key={n.id} style={{ border: "1px solid #eee", marginBottom: 6, padding: 6 }}>
              <div style={{ fontSize: 12 }}>{n.id} [{n.status}] {n.provider ?? ""}</div>
              <div>{n.prompt}</div>
              <div style={{ fontSize: 12, color: "#666" }}>{n.diffSummary}</div>
              <button onClick={() => setParentId(n.id)}>ここから分岐</button>
            </div>
          ))}
          {view === "tree" && (
            <ul>{nodes.map((n) => (
              <li key={n.id}>{n.parentId ?? "root"} → {n.id} [{n.status}] {n.prompt.slice(0, 24)}</li>
            ))}</ul>
          )}
          {view === "board" && ["generating", "review", "adopted", "abandoned"].map((s) => (
            <div key={s}><b>{s}</b><ul>{nodes.filter((n) => n.status === s).map((n) => <li key={n.id}>{n.id}</li>)}</ul></div>
          ))}
        </div>
      </aside>
      <main style={{ flex: 1, position: "relative", background: "#fafafa" }}>
        <div style={{ padding: 12 }}>中央プレビュー（codeアダプタ予定地） parent={parentId ?? "root"} <button onClick={addWindow}>窓を追加</button></div>
        {wins.filter((w) => !w.minimized).map((w) => (
          <div key={w.id} style={{ position: "absolute", left: w.x, top: 60 + w.y, width: 340, background: "#fff", border: "1px solid #999", zIndex: w.z }}>
            <div style={{ background: "#eee", padding: 4, display: "flex", justifyContent: "space-between" }}>
              <span>{w.id} → {w.nodeId}</span>
              <span>
                <button onClick={() => setWins((ws) => ws.map((x) => x.id === w.id ? { ...x, z: 99 } : { ...x, z: x.z - 1 }))}>前面</button>
                <button onClick={() => setWins((ws) => ws.map((x) => x.id === w.id ? { ...x, minimized: true } : x))}>最小化</button>
              </span>
            </div>
            <div style={{ padding: 8 }}>
              <textarea value={w.id === wins[0]?.id ? prompt : ""} onChange={(e) => setPrompt(e.target.value)} rows={3} style={{ width: "100%" }} placeholder="この窓からチャット送信（先頭窓のみ有効・P0簡易）" />
              <button onClick={send} disabled={!roomId || !prompt}>送信＝子ノード作成</button>
            </div>
          </div>
        ))}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "#eee", padding: 4 }}>
          dock: {wins.map((w) => <button key={w.id} onClick={() => setWins((ws) => ws.map((x) => x.id === w.id ? { ...x, minimized: !x.minimized } : x))}>{w.id}{w.minimized ? "(閉)" : ""}</button>)}
        </div>
      </main>
    </div>
  );
}
