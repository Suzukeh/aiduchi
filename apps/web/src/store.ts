import { create } from "zustand";
import * as Y from "yjs";
import { HocuspocusProvider } from "@hocuspocus/provider";
import * as api from "./api";
import type { AwarenessUser, NodeMeta, Win } from "./types";

const ENV = (import.meta as unknown as { env: Record<string, string> }).env;
const SYNC_URL_ENV = ENV.VITE_SYNC_URL ?? "";

function resolveSyncUrl(): string {
  if (SYNC_URL_ENV) return SYNC_URL_ENV;
  const proto = location.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${location.host}/sync`;
}

function load(key: string, fallback = ""): string {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}
function store(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* 表示設定が保存できなくても致命的ではない */
  }
}

const userId = load("aiduchi.userId") || crypto.randomUUID().slice(0, 8);
store("aiduchi.userId", userId);
try { localStorage.removeItem("aiduchi.byokKey"); } catch { /* 旧版が保存していたキーを消す */ }
const userColor = load("aiduchi.color") || `#${Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, "0")}`;
store("aiduchi.color", userColor);

type Byok = { provider: string; key: string; model: string };
type NodeDoc = { doc: Y.Doc; provider: HocuspocusProvider; files: Y.Map<Y.Text> };

type State = {
  roomId: string;
  token: string;
  roomName: string;
  error: string;

  nodes: NodeMeta[];
  loadingNodes: boolean;

  /** 個人の窓配置。サーバ・他参加者とは共有しない */
  windows: Win[];
  activeWinId: string | null;
  /** 中央パネルが表示している版。窓のフォーカスや最小化では変えない */
  selectedNodeId: string | null;

  userName: string;
  peers: AwarenessUser[];
  synced: boolean;

  /** チェックポイントごとの同期接続状態 */
  nodeSynced: Record<string, boolean>;
  /** Yjsのファイル内容が変わったことをUIへ伝えるカウンタ */
  filesRev: number;

  byok: Byok;

  view: "list" | "board";

  init: () => void;
  createRoom: (name: string) => Promise<void>;
  refreshNodes: () => Promise<void>;
  sendPrompt: (winId: string, prompt: string) => Promise<void>;
  adopt: (nodeId: string) => Promise<void>;
  abandon: (nodeId: string) => Promise<void>;
  saveFiles: (nodeId: string, files: Record<string, string>, label: string, baseHash: string) => Promise<NodeMeta>;

  setUserName: (name: string) => void;
  setByok: (b: Byok) => void;
  setView: (v: "list" | "board") => void;
  setError: (message: string) => void;

  setActiveWin: (id: string | null) => void;
  setDraft: (winId: string, text: string) => void;
  openWindow: (nodeId: string | null) => void;
  closeWindow: (winId: string) => void;
  updateWin: (winId: string, patch: Partial<Pick<Win, "x" | "y" | "w" | "h" | "z" | "minimized" | "nodeId">>) => void;
  focusWindow: (winId: string) => void;

  connectSync: () => void;
  disconnectSync: () => void;
  ensureNode: (nodeId: string) => NodeDoc | null;
  readFiles: (nodeId: string) => Record<string, string> | null;
};

// ── Yjs runtime（非リアクティブ） ──
let lobby: HocuspocusProvider | null = null;
const nodeDocs = new Map<string, NodeDoc>();

function windowsKey(roomId: string) {
  return `aiduchi.windows.${roomId}`;
}

function readWindows(roomId: string): Win[] {
  try {
    const raw = load(windowsKey(roomId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Win[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((w) => w && typeof w.id === "string")
      .map((w) => ({
        id: w.id,
        nodeId: typeof w.nodeId === "string" && w.nodeId !== "root" ? w.nodeId : null,
        draft: typeof w.draft === "string" ? w.draft : "",
        x: Number(w.x) || 40,
        y: Number(w.y) || 40,
        w: Number(w.w) || 400,
        h: Number(w.h) || 380,
        z: Number(w.z) || 1,
        minimized: !!w.minimized,
      }));
  } catch {
    return [];
  }
}

function persistWindows(roomId: string, windows: Win[]) {
  if (!roomId) return;
  store(windowsKey(roomId), JSON.stringify(windows));
}

export const useStore = create<State>((set, get) => ({
  roomId: "",
  token: "",
  roomName: "",
  error: "",

  nodes: [],
  loadingNodes: false,

  windows: [],
  activeWinId: null,
  selectedNodeId: null,

  userName: load("aiduchi.name"),
  peers: [],
  synced: false,

  nodeSynced: {},
  filesRev: 0,

  byok: { provider: load("aiduchi.byokProvider"), key: "", model: load("aiduchi.byokModel") },

  view: "list",

  init: () => {
    const params = new URLSearchParams(location.search);
    const room = params.get("room");
    const token = params.get("token");
    if (!room || !token) return;
    set({ roomId: room, token, windows: readWindows(room) });
    get().connectSync();
    get().refreshNodes();
    api
      .getRoom(room, token)
      .then((info) => set({ roomName: info.name }))
      .catch(() => undefined);
  },

  createRoom: async (name) => {
    set({ error: "" });
    try {
      const r = await api.createRoom(name);
      set({ roomId: r.id, token: r.joinToken, roomName: name, windows: readWindows(r.id), activeWinId: null });
      history.replaceState(null, "", `?room=${r.id}&token=${r.joinToken}`);
      get().connectSync();
      await get().refreshNodes();
    } catch (e) {
      set({ error: e instanceof Error ? e.message : "room creation failed" });
    }
  },

  refreshNodes: async () => {
    const { roomId, token } = get();
    if (!roomId || !token) return;
    set({ loadingNodes: true });
    try {
      const nodes = await api.listNodes(roomId, token);
      set({ nodes });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : "failed to load nodes" });
    } finally {
      set({ loadingNodes: false });
    }
  },

  sendPrompt: async (winId, prompt) => {
    const { roomId, token, byok, windows, userName } = get();
    const win = windows.find((w) => w.id === winId);
    const text = prompt.trim();
    if (!roomId || !token || !win || !text) return;
    set({ error: "" });
    try {
      const node = await api.createNode(roomId, token, win.nodeId, text, byok, userName);
      get().updateWin(winId, { nodeId: node.id });
      set({ selectedNodeId: node.id });
      get().setDraft(winId, "");
      await get().refreshNodes();
      get().ensureNode(node.id);
    } catch (e) {
      set({ error: e instanceof Error ? e.message : "send failed" });
    }
  },

  adopt: async (nodeId) => {
    const { roomId, token } = get();
    if (!roomId || !token) return;
    try {
      await api.adoptNode(roomId, token, nodeId);
      await get().refreshNodes();
    } catch (e) {
      set({ error: e instanceof Error ? e.message : "adopt failed" });
    }
  },

  abandon: async (nodeId) => {
    const { roomId, token } = get();
    if (!roomId || !token) return;
    try {
      await api.abandonNode(roomId, token, nodeId);
      await get().refreshNodes();
    } catch (e) {
      set({ error: e instanceof Error ? e.message : "abandon failed" });
    }
  },

  saveFiles: async (nodeId, files, label, baseHash) => {
    const { roomId, token, userName } = get();
    if (!roomId || !token) throw new Error("not in a room");
    const child = await api.saveSnapshot(roomId, token, nodeId, files, label, userName, baseHash);
    await get().refreshNodes();
    return child;
  },

  setUserName: (name) => {
    store("aiduchi.name", name);
    set({ userName: name });
    if (lobby?.awareness) {
      lobby.awareness.setLocalStateField("user", {
        userId,
        name: name || `user-${userId}`,
        color: userColor,
      } satisfies AwarenessUser);
    }
  },

  // BYOKキーはメモリのみ。localStorageへは保存しない（プロバイダ名とモデル名だけ記憶）
  setByok: (b) => {
    store("aiduchi.byokProvider", b.provider);
    store("aiduchi.byokModel", b.model);
    set({ byok: b });
  },

  setView: (v) => set({ view: v }),
  setActiveWin: (id) => set({ activeWinId: id }),
  setError: (message) => set({ error: message }),

  setDraft: (winId, text) => {
    const next = get().windows.map((w) => (w.id === winId ? { ...w, draft: text } : w));
    set({ windows: next });
    persistWindows(get().roomId, next);
  },

  openWindow: (nodeId) => {
    const { windows, roomId } = get();
    const id = `w${Date.now().toString(36)}${Math.floor(Math.random() * 100).toString(36)}`;
    const maxZ = Math.max(0, ...windows.map((w) => w.z));
    const offset = (windows.length % 6) * 24;
    // 中央のプレビュー/ファイル領域を隠しすぎないよう、右側に置く
    const canvasWidth = Math.max(480, window.innerWidth - 288);
    const x = Math.max(24, Math.min(canvasWidth - 430, canvasWidth * 0.52)) - offset;
    const win: Win = {
      id,
      nodeId: nodeId ?? null,
      draft: "",
      x,
      y: 56 + offset,
      w: 400,
      h: 380,
      z: maxZ + 1,
      minimized: false,
    };
    const next = [...windows, win];
    set({ windows: next, activeWinId: id, ...(nodeId ? { selectedNodeId: nodeId } : {}) });
    persistWindows(roomId, next);
  },

  closeWindow: (winId) => {
    const next = get().windows.filter((w) => w.id !== winId);
    const activeWinId = get().activeWinId === winId ? (next[next.length - 1]?.id ?? null) : get().activeWinId;
    set({ windows: next, activeWinId });
    persistWindows(get().roomId, next);
  },

  updateWin: (winId, patch) => {
    const next = get().windows.map((w) => (w.id === winId ? { ...w, ...patch } : w));
    set({ windows: next, ...(patch.nodeId ? { selectedNodeId: patch.nodeId } : {}) });
    persistWindows(get().roomId, next);
  },

  focusWindow: (winId) => {
    const { windows } = get();
    const maxZ = Math.max(0, ...windows.map((w) => w.z));
    const next = windows.map((w) => (w.id === winId ? { ...w, z: maxZ + 1 } : w));
    set({ windows: next, activeWinId: winId });
    persistWindows(get().roomId, next);
  },

  connectSync: () => {
    const { roomId, token, userName } = get();
    if (!roomId || !token || lobby) return;
    lobby = new HocuspocusProvider({
      url: resolveSyncUrl(),
      name: `room:${roomId}:node:lobby`,
      token,
    });

    const pushPeers = () => {
      if (!lobby?.awareness) return;
      const peers: AwarenessUser[] = [];
      lobby.awareness.getStates().forEach((s) => {
        const u = (s as { user?: AwarenessUser }).user;
        if (u && u.userId !== userId) peers.push(u);
      });
      set({ peers });
    };

    lobby.on("synced", (e: { state: boolean }) => set({ synced: e.state }));
    lobby.on("status", (e: { status: string }) => set({ synced: e.status === "connected" }));
    lobby.awareness?.setLocalStateField("user", {
      userId,
      name: userName || `user-${userId}`,
      color: userColor,
    } satisfies AwarenessUser);
    lobby.awareness?.on("change", pushPeers);
    pushPeers();
  },

  disconnectSync: () => {
    lobby?.destroy();
    lobby = null;
    for (const entry of nodeDocs.values()) {
      entry.provider.destroy();
      entry.doc.destroy();
    }
    nodeDocs.clear();
    set({ synced: false, peers: [], nodeSynced: {} });
  },

  /**
   * チェックポイントごとのY.Doc。ドキュメント名にノードIDを含めるので、
   * 別分岐の同名ファイルが同じ共同編集オブジェクトに接続されることはない。
   * 初期内容は同期サーバがスナップショットから一度だけ流し込む。
   */
  ensureNode: (nodeId) => {
    const { roomId, token } = get();
    if (!roomId || !token) return null;
    const existing = nodeDocs.get(nodeId);
    if (existing) return existing;

    const doc = new Y.Doc();
    const files = doc.getMap<Y.Text>("files");
    const provider = new HocuspocusProvider({
      url: resolveSyncUrl(),
      name: `room:${roomId}:node:${nodeId}`,
      token,
      document: doc,
    });
    const entry: NodeDoc = { doc, provider, files };
    nodeDocs.set(nodeId, entry);

    const bump = () => set((s) => ({ filesRev: s.filesRev + 1 }));
    files.observeDeep(bump);
    provider.on("synced", (e: { state: boolean }) => {
      set((s) => ({ nodeSynced: { ...s.nodeSynced, [nodeId]: e.state } }));
      bump();
    });
    provider.on("status", (e: { status: string }) => {
      set((s) => ({ nodeSynced: { ...s.nodeSynced, [nodeId]: e.status === "connected" } }));
    });
    return entry;
  },

  readFiles: (nodeId) => {
    const entry = get().ensureNode(nodeId);
    if (!entry) return null;
    const out: Record<string, string> = {};
    entry.files.forEach((text, path) => {
      if (text instanceof Y.Text) out[path] = text.toString();
    });
    return out;
  },
}));

/** テスト・デバッグ用 */
export function getNodeYDoc(nodeId: string): Y.Doc | null {
  return nodeDocs.get(nodeId)?.doc ?? null;
}

export function getNodeFiles(nodeId: string): Y.Map<Y.Text> | null {
  return nodeDocs.get(nodeId)?.files ?? null;
}

export function getNodeAwareness(nodeId: string) {
  return nodeDocs.get(nodeId)?.provider.awareness ?? null;
}
