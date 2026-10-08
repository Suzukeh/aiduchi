import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import * as Y from "yjs";
const API = "http://localhost:3000";
export function App() {
    const [roomId, setRoomId] = useState("");
    const [token, setToken] = useState("");
    const [roomName, setRoomName] = useState("demo");
    const [nodes, setNodes] = useState([]);
    const [view, setView] = useState("tree");
    const [wins, setWins] = useState([
        { id: "w1", nodeId: "root", x: 40, y: 80, z: 1, minimized: false },
        { id: "w2", nodeId: "root", x: 420, y: 120, z: 2, minimized: false },
    ]);
    const [prompt, setPrompt] = useState("");
    const [parentId, setParentId] = useState(null);
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
        setRoomId(r.id);
        setToken(r.joinToken);
        await refresh(r.id, r.joinToken);
    }
    async function refresh(id = roomId, tk = token) {
        if (!id || !tk)
            return;
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
    return (_jsxs("div", { style: { fontFamily: "sans-serif", height: "100vh", display: "flex" }, children: [_jsxs("aside", { style: { width: 300, borderRight: "1px solid #ddd", padding: 12, overflow: "auto" }, children: [_jsx("h2", { children: "aiduchi P0" }), _jsxs("div", { style: { display: "flex", gap: 8 }, children: [_jsx("input", { value: roomName, onChange: (e) => setRoomName(e.target.value), placeholder: "room name" }), _jsx("button", { onClick: createRoom, children: "\u4F5C\u6210" })] }), _jsxs("div", { style: { marginTop: 8, fontSize: 12 }, children: ["room: ", roomId || "-", _jsx("br", {}), "token: ", token ? token.slice(0, 8) + "…" : "-", " ", _jsx("button", { onClick: () => refresh(), children: "\u66F4\u65B0" })] }), _jsx("div", { style: { marginTop: 12, display: "flex", gap: 4 }, children: ["tree", "list", "board"].map((v) => (_jsx("button", { disabled: view === v, onClick: () => setView(v), children: v }, v))) }), _jsxs("div", { style: { marginTop: 8 }, children: [view === "list" && nodes.map((n) => (_jsxs("div", { style: { border: "1px solid #eee", marginBottom: 6, padding: 6 }, children: [_jsxs("div", { style: { fontSize: 12 }, children: [n.id, " [", n.status, "] ", n.provider ?? ""] }), _jsx("div", { children: n.prompt }), _jsx("div", { style: { fontSize: 12, color: "#666" }, children: n.diffSummary }), _jsx("button", { onClick: () => setParentId(n.id), children: "\u3053\u3053\u304B\u3089\u5206\u5C90" })] }, n.id))), view === "tree" && (_jsx("ul", { children: nodes.map((n) => (_jsxs("li", { children: [n.parentId ?? "root", " \u2192 ", n.id, " [", n.status, "] ", n.prompt.slice(0, 24)] }, n.id))) })), view === "board" && ["generating", "review", "adopted", "abandoned"].map((s) => (_jsxs("div", { children: [_jsx("b", { children: s }), _jsx("ul", { children: nodes.filter((n) => n.status === s).map((n) => _jsx("li", { children: n.id }, n.id)) })] }, s)))] })] }), _jsxs("main", { style: { flex: 1, position: "relative", background: "#fafafa" }, children: [_jsxs("div", { style: { padding: 12 }, children: ["\u4E2D\u592E\u30D7\u30EC\u30D3\u30E5\u30FC\uFF08code\u30A2\u30C0\u30D7\u30BF\u4E88\u5B9A\u5730\uFF09 parent=", parentId ?? "root", " ", _jsx("button", { onClick: addWindow, children: "\u7A93\u3092\u8FFD\u52A0" })] }), wins.filter((w) => !w.minimized).map((w) => (_jsxs("div", { style: { position: "absolute", left: w.x, top: 60 + w.y, width: 340, background: "#fff", border: "1px solid #999", zIndex: w.z }, children: [_jsxs("div", { style: { background: "#eee", padding: 4, display: "flex", justifyContent: "space-between" }, children: [_jsxs("span", { children: [w.id, " \u2192 ", w.nodeId] }), _jsxs("span", { children: [_jsx("button", { onClick: () => setWins((ws) => ws.map((x) => x.id === w.id ? { ...x, z: 99 } : { ...x, z: x.z - 1 })), children: "\u524D\u9762" }), _jsx("button", { onClick: () => setWins((ws) => ws.map((x) => x.id === w.id ? { ...x, minimized: true } : x)), children: "\u6700\u5C0F\u5316" })] })] }), _jsxs("div", { style: { padding: 8 }, children: [_jsx("textarea", { value: w.id === wins[0]?.id ? prompt : "", onChange: (e) => setPrompt(e.target.value), rows: 3, style: { width: "100%" }, placeholder: "\u3053\u306E\u7A93\u304B\u3089\u30C1\u30E3\u30C3\u30C8\u9001\u4FE1\uFF08\u5148\u982D\u7A93\u306E\u307F\u6709\u52B9\u30FBP0\u7C21\u6613\uFF09" }), _jsx("button", { onClick: send, disabled: !roomId || !prompt, children: "\u9001\u4FE1\uFF1D\u5B50\u30CE\u30FC\u30C9\u4F5C\u6210" })] })] }, w.id))), _jsxs("div", { style: { position: "absolute", bottom: 0, left: 0, right: 0, background: "#eee", padding: 4 }, children: ["dock: ", wins.map((w) => _jsxs("button", { onClick: () => setWins((ws) => ws.map((x) => x.id === w.id ? { ...x, minimized: !x.minimized } : x)), children: [w.id, w.minimized ? "(閉)" : ""] }, w.id))] })] })] }));
}
