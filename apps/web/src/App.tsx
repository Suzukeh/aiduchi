import React, { useCallback, useEffect, useRef, useState } from "react";
import { connectRoom, getPeers, type SyncState, type AwarenessUser } from "./sync";

type Node = {
  id: string; parentId: string | null; prompt: string; status: string;
  provider: string | null; model: string | null; diffSummary: string | null;
};
type Win = { id: string; nodeId: string; x: number; y: number; z: number; minimized: boolean };

// 空文字=同一オリジン（Viteプロキシ経由）。VITE_API_URLで直接指定も可
const API = (import.meta as unknown as { env: Record<string, string> }).env.VITE_API_URL ?? "";

const DEFAULT_WINS: Win[] = [
  { id: "w1", nodeId: "root", x: 40, y: 80, z: 1, minimized: false },
  { id: "w2", nodeId: "root", x: 420, y: 120, z: 2, minimized: false },
];

export function App() {
  const [roomId, setRoomId] = useState("");
  const [token, setToken] = useState("");
  const [roomName, setRoomName] = useState("demo");
  const [nodes, setNodes] = useState<Node[]>([]);
  const [view, setView] = useState<"tree" | "list" | "board">("tree");
  const [wins, setWins] = useState<Win[]>(DEFAULT_WINS);
  const [prompt, setPrompt] = useState("");
  const [activeWinId, setActiveWinId] = useState<string>("w1");
  const [parentId, setParentId] = useState<string | null>(null);
  const [err, setErr] = useState("");
  const [peers, setPeers] = useState<AwarenessUser[]>([]);
  const [synced, setSynced] = useState(false);
  const [userName, setUserName] = useState(() => localStorage.getItem("aiduchi.name") ?? "");
  const syncHandleRef = useRef<{ disconnect: () => void; setPresenceName: (n: string) => void } | null>(null);
  const [byokProvider, setByokProvider] = useState(() => localStorage.getItem("aiduchi.byokProvider") ?? "");
  const [byokKey, setByokKey] = useState(() => localStorage.getItem("aiduchi.byokKey") ?? "");
  const [byokModel, setByokModel] = useState(() => localStorage.getItem("aiduchi.byokModel") ?? "");
  const syncRef = useRef<SyncState | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragRef = useRef<{ id: string; offsetX: number; offsetY: number } | null>(null);

  function byokHeaders(): Record<string, string> {
    const h: Record<string, string> = {};
    if (byokProvider && byokKey) {
      h["x-byok-provider"] = byokProvider;
      h["x-byok-key"] = byokKey;
      if (byokModel) h["x-byok-model"] = byokModel;
      localStorage.setItem("aiduchi.byokProvider", byokProvider);
      localStorage.setItem("aiduchi.byokKey", byokKey);
      localStorage.setItem("aiduchi.byokModel", byokModel);
    }
    return h;
  }

  // ── Yjs同期 ──────────────────────────────────────────────
  // Y.Map "windows" を窓配置の単一情報源にする。
  // ローカル操作 → Y.Map更新 → observe → React state（片方向でループしない）
  const yMapToWins = useCallback((map: SyncState["windows"]): Win[] => {
    const out: Win[] = [];
    map.forEach((v) => {
      if (v && typeof v === "object" && "id" in v) out.push(v as unknown as Win);
    });
    return out.sort((a, b) => a.z - b.z);
  }, []);

  const updateWinY = useCallback((win: Win) => {
    const s = syncRef.current;
    if (!s) return;
    s.doc.transact(() => s.windows.set(win.id, { ...win }), "local");
  }, []);

  useEffect(() => {
    if (!roomId || !token) return;
    const handle = connectRoom(roomId, token, (s) => {
      syncRef.current = s;
      setSynced(s.connected);
      const u = localStorage.getItem("aiduchi.userId") ?? "";
      setPeers(getPeers(s.awareness, u));
      // Y.Mapに既にデータがあればそれを使い、無ければ初期窓を書き込む
      const fromY = yMapToWins(s.windows);
      if (fromY.length > 0) {
        setWins(fromY);
      } else {
        s.doc.transact(() => {
          for (const w of DEFAULT_WINS) s.windows.set(w.id, { ...w });
        }, "local");
        setWins(DEFAULT_WINS);
      }
    });
    syncHandleRef.current = handle;
    return () => { handle.disconnect(); syncRef.current = null; syncHandleRef.current = null; setSynced(false); setPeers([]); };
  }, [roomId, token, yMapToWins]);

  // ローカルのwins変更をY.Mapへ反映（デバウンス）
  useEffect(() => {
    if (!roomId || !token || !syncRef.current) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      const s = syncRef.current;
      if (!s) return;
      s.doc.transact(() => {
        for (const w of wins) {
          const cur = s.windows.get(w.id) as unknown as Win | undefined;
          if (!cur || cur.x !== w.x || cur.y !== w.y || cur.z !== w.z || cur.minimized !== w.minimized || cur.nodeId !== w.nodeId) {
            s.windows.set(w.id, { ...w });
          }
        }
      }, "local");
      // RESTにも永続化（DBが正・Yjsは作業コピー）
      fetch(`${API}/api/rooms/${roomId}/windows`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "x-room-token": token },
        body: JSON.stringify({ windows: wins }),
      }).catch(() => {});
    }, 300);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [wins, roomId, token]);

  // ── API操作 ──────────────────────────────────────────────
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
    setErr("");
    const r = await fetch(`${API}/api/rooms/${roomId}/nodes`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-room-token": token, ...byokHeaders() },
      body: JSON.stringify({ parentId, prompt }),
    });
    const n = await r.json();
    if (!r.ok) {
      setErr(n.error ?? "failed");
      await refresh();
      return;
    }
    setPrompt("");
    await refresh();
    setWins((ws) => ws.map((w, i) => (i === 0 ? { ...w, nodeId: n.id } : w)));
  }

  function addWindow() {
    const w: Win = { id: `w${Date.now()}`, nodeId: parentId ?? "root", x: 60 + wins.length * 40, y: 60 + wins.length * 40, z: wins.length + 1, minimized: false };
    setWins((ws) => [...ws, w]);
    updateWinY(w);
  }

  return (
    <div style={{ fontFamily: "sans-serif", height: "100vh", display: "flex" }}>
      <aside style={{ width: 300, borderRight: "1px solid #ddd", padding: 12, overflow: "auto" }}>
        <h2>aiduchi</h2>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
          <span style={{ width: 10, height: 10, borderRadius: 5, background: localStorage.getItem("aiduchi.color") ?? "#999", flexShrink: 0 }} />
          <input
            value={userName}
            onChange={(e) => {
              setUserName(e.target.value);
              localStorage.setItem("aiduchi.name", e.target.value);
              syncHandleRef.current?.setPresenceName(e.target.value);
            }}
            placeholder="あなたの名前"
            style={{ flex: 1, fontSize: 13 }}
          />
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <input value={roomName} onChange={(e) => setRoomName(e.target.value)} placeholder="room name" style={{ flex: 1 }} />
          <button onClick={createRoom}>作成</button>
        </div>
        <div style={{ marginTop: 8, fontSize: 12 }}>
          room: {roomId || "-"}<br />
          token: {token ? token.slice(0, 8) + "…" : "-"}{" "}
          <button onClick={() => refresh()}>更新</button>
          <br />
          <span style={{ color: synced ? "green" : "#999" }}>{synced ? "● 同期中" : "○ 未接続"}</span>
          {peers.length > 0 && (
            <span style={{ marginLeft: 8 }}>
              {peers.map((p) => (
                <span key={p.userId} title={p.name} style={{ display: "inline-block", width: 10, height: 10, borderRadius: 5, background: p.color, marginLeft: 2 }} />
              ))}
            </span>
          )}
        </div>
        <details style={{ marginTop: 8, fontSize: 12 }}>
          <summary>BYOK（任意・未入力ならホストキー）</summary>
          <input value={byokProvider} onChange={(e) => setByokProvider(e.target.value)} placeholder="provider (例 openai)" style={{ width: "100%" }} />
          <input value={byokKey} onChange={(e) => setByokKey(e.target.value)} placeholder="api key" type="password" style={{ width: "100%" }} />
          <input value={byokModel} onChange={(e) => setByokModel(e.target.value)} placeholder="model" style={{ width: "100%" }} />
        </details>
        {err && <div style={{ color: "red", fontSize: 12 }}>{err}</div>}
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
          {view === "board" && ["draft", "generating", "review", "adopted", "abandoned"].map((s) => (
            <div key={s}><b>{s}</b><ul>{nodes.filter((n) => n.status === s).map((n) => <li key={n.id}>{n.id}</li>)}</ul></div>
          ))}
        </div>
      </aside>
      <main style={{ flex: 1, position: "relative", background: "#fafafa", overflow: "hidden" }}
        onMouseMove={(e) => {
          const d = dragRef.current;
          if (!d) return;
          const mainRect = e.currentTarget.getBoundingClientRect();
          const nx = e.clientX - mainRect.left - d.offsetX;
          const ny = e.clientY - mainRect.top - d.offsetY - 60;
          setWins((ws) => ws.map((w) => w.id === d.id ? { ...w, x: Math.max(0, nx), y: Math.max(0, ny) } : w));
        }}
        onMouseUp={() => { dragRef.current = null; }}
        onMouseLeave={() => { dragRef.current = null; }}>
        <div style={{ padding: 12 }}>中央プレビュー（codeアダプタ予定地） parent={parentId ?? "root"} <button onClick={addWindow}>窓を追加</button></div>
        {wins.filter((w) => !w.minimized).map((w) => (
          <div key={w.id} style={{ position: "absolute", left: w.x, top: 60 + w.y, width: 340, background: "#fff", border: "1px solid #999", zIndex: w.z }}>
            <div style={{ background: "#eee", padding: 4, display: "flex", justifyContent: "space-between", cursor: "move" }}
              onMouseDown={(e) => {
                e.stopPropagation();
                const rect = e.currentTarget.parentElement!.getBoundingClientRect();
                dragRef.current = { id: w.id, offsetX: e.clientX - rect.left, offsetY: e.clientY - rect.top };
                setWins((ws) => ws.map((x) => x.id === w.id ? { ...x, z: Math.max(...ws.map((y) => y.z)) + 1 } : x));
              }}>
              <span>{w.id} → {w.nodeId}</span>
              <span>
                <button onClick={() => setWins((ws) => ws.map((x) => x.id === w.id ? { ...x, minimized: true } : x))}>最小化</button>
              </span>
            </div>
            <div style={{ padding: 8 }} onMouseDown={(e) => { e.stopPropagation(); setActiveWinId(w.id); }}>
              <textarea
                value={w.id === activeWinId ? prompt : ""}
                onChange={(e) => { setActiveWinId(w.id); setPrompt(e.target.value); }}
                onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key === "Enter" && prompt && roomId) { e.preventDefault(); send(); } }}
                rows={3} style={{ width: "100%" }} placeholder="この窓からチャット送信（Ctrl+Enterで送信）" />
              <button onClick={send} disabled={!roomId || !prompt.trim()}>送信＝子ノード作成</button>
            </div>
          </div>
        ))}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "#eee", padding: 4 }}>
          dock: {wins.map((w) => <button key={w.id} onClick={() => setWins((ws) => ws.map((x) => x.id === w.id ? { ...x, minimized: !x.minimized } : x))}>{w.id}{w.minimized ? "(閉)" : ""}</button>)}
          <span style={{ marginLeft: 16, fontSize: 11, color: "#666" }}>
            {userName && <span style={{ marginRight: 8 }}>自分: {userName}</span>}
            {peers.length > 0 ? `参加中: ${peers.map((p) => p.name).join(", ")}` : "他に参加者はいません"}
          </span>
        </div>
      </main>
    </div>
  );
}
