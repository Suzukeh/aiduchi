import { create } from "zustand";
import * as Y from "yjs";
import { HocuspocusProvider } from "@hocuspocus/provider";
import * as api from "./api";
import type { AwarenessUser, NodeMeta, Win } from "./types";

const SYNC_URL_ENV = (import.meta as unknown as { env: Record<string, string> }).env.VITE_SYNC_URL ?? "";
function resolveSyncUrl(): string {
  if (SYNC_URL_ENV) return SYNC_URL_ENV;
  const proto = location.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${location.host}/sync`;
}

function load(key: string, fallback = ""): string {
  return localStorage.getItem(key) ?? fallback;
}
function store(key: string, value: string) {
  localStorage.setItem(key, value);
}

const userId = load("aiduchi.userId") || crypto.randomUUID().slice(0, 8);
store("aiduchi.userId", userId);
const userColor = load("aiduchi.color") || `#${Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, "0")}`;
store("aiduchi.color", userColor);

type Byok = { provider: string; key: string; model: string };

type State = {
  // session
  roomId: string;
  token: string;
  roomName: string;
  error: string;

  // server data
  nodes: NodeMeta[];
  loadingNodes: boolean;

  // shared window state (Yjs-backed)
  windows: Win[];
  activeWinId: string | null;

  // presence
  userName: string;
  peers: AwarenessUser[];
  synced: boolean;

  // byok
  byok: Byok;

  // ui
  view: "list" | "board";
  showTree: boolean;

  // actions
  init: () => void;
  createRoom: (name: string) => Promise<void>;
  refreshNodes: () => Promise<void>;
  sendPrompt: (winId: string, prompt: string) => Promise<void>;
  adopt: (nodeId: string) => Promise<void>;
  abandon: (nodeId: string) => Promise<void>;

  setUserName: (name: string) => void;
  setByok: (b: Byok) => void;

  setActiveWin: (id: string | null) => void;
  setView: (v: "list" | "board") => void;
  setShowTree: (v: boolean) => void;

  openWindow: (nodeId: string | null) => void;
  closeWindow: (winId: string) => void;
  updateWin: (winId: string, patch: Partial<Pick<Win, "x" | "y" | "w" | "h" | "z" | "minimized" | "nodeId">>) => void;
  focusWindow: (winId: string) => void;

  connectSync: () => void;
  disconnectSync: () => void;
};

// ── Yjs runtime (non-reactive) ──
let provider: HocuspocusProvider | null = null;
let doc: Y.Doc | null = null;
let windowsMap: Y.Map<Win> | null = null;
let saveTimer: ReturnType<typeof setTimeout> | null = null;

/** ファイル共同編集などで使うY.Doc参照（未接続時はnull） */
export function getYDoc(): Y.Doc | null {
  return doc;
}
/** ファイル内容の共有マップ（path -> Y.Text）を取得。無ければ作る */
export function getYFiles(): Y.Map<Y.Text> | null {
  if (!doc) return null;
  return doc.getMap<Y.Text>("files");
}
/** リモートカーソル表示用のawareness（未接続時はnull） */
export function getYAwareness() {
  return provider?.awareness ?? null;
}

function writeWindowsToY(next: Win[]) {
  const d = doc;
  const map = windowsMap;
  if (!d || !map) return;
  d.transact(() => {
    const ids = new Set(next.map((w) => w.id));
    for (const key of [...map.keys()]) {
      if (!ids.has(key)) map.delete(key);
    }
    for (const w of next) map.set(w.id, { ...w });
  }, "local");
}

function scheduleRestSave(state: Pick<State, "roomId" | "token" | "windows">) {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    if (state.roomId && state.token) api.saveWindows(state.roomId, state.token, state.windows);
  }, 1500);
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

  userName: load("aiduchi.name"),
  peers: [],
  synced: false,

  byok: {
    provider: load("aiduchi.byokProvider"),
    key: load("aiduchi.byokKey"),
    model: load("aiduchi.byokModel"),
  },

  view: "list",
  showTree: false,

  init: () => {
    const params = new URLSearchParams(location.search);
    const room = params.get("room");
    const token = params.get("token");
    if (room && token) {
      set({ roomId: room, token });
      get().connectSync();
      get().refreshNodes();
    }
  },

  createRoom: async (name) => {
    set({ error: "" });
    try {
      const r = await api.createRoom(name);
      set({ roomId: r.id, token: r.joinToken, roomName: name });
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
    const { roomId, token, byok, windows } = get();
    const win = windows.find((w) => w.id === winId);
    if (!roomId || !token || !win || !prompt.trim()) return;
    set({ error: "" });
    try {
      const parentId = win.nodeId === "root" ? null : win.nodeId;
      const node = await api.createNode(roomId, token, parentId, prompt.trim(), byok);
      // 子ノードの窓を開く（送信元の窓を新ノードに進める）
      get().updateWin(winId, { nodeId: node.id });
      await get().refreshNodes();
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

  setUserName: (name) => {
    store("aiduchi.name", name);
    set({ userName: name });
    if (provider?.awareness) {
      provider.awareness.setLocalStateField("user", {
        userId,
        name: name || `user-${userId}`,
        color: userColor,
      } satisfies AwarenessUser);
    }
  },

  setByok: (b) => {
    store("aiduchi.byokProvider", b.provider);
    store("aiduchi.byokKey", b.key);
    store("aiduchi.byokModel", b.model);
    set({ byok: b });
  },

  setActiveWin: (id) => set({ activeWinId: id }),
  setView: (v) => set({ view: v }),
  setShowTree: (v) => set({ showTree: v }),

  openWindow: (nodeId) => {
    const id = `w${Date.now().toString(36)}`;
    const { windows } = get();
    const maxZ = Math.max(0, ...windows.map((w) => w.z));
    const win: Win = {
      id,
      nodeId: nodeId ?? "root",
      x: 60 + (windows.length % 5) * 36,
      y: 40 + (windows.length % 5) * 32,
      w: 380,
      h: 320,
      z: maxZ + 1,
      minimized: false,
    };
    const next = [...windows, win];
    set({ windows: next, activeWinId: id });
    writeWindowsToY(next);
    scheduleRestSave({ ...get(), windows: next });
  },

  closeWindow: (winId) => {
    const next = get().windows.filter((w) => w.id !== winId);
    set({ windows: next, activeWinId: get().activeWinId === winId ? null : get().activeWinId });
    writeWindowsToY(next);
    scheduleRestSave({ ...get(), windows: next });
  },

  updateWin: (winId, patch) => {
    const next = get().windows.map((w) => (w.id === winId ? { ...w, ...patch } : w));
    set({ windows: next });
    writeWindowsToY(next);
    scheduleRestSave({ ...get(), windows: next });
  },

  focusWindow: (winId) => {
    const { windows } = get();
    const maxZ = Math.max(0, ...windows.map((w) => w.z));
    const next = windows.map((w) => (w.id === winId ? { ...w, z: maxZ + 1 } : w));
    set({ windows: next, activeWinId: winId });
    writeWindowsToY(next);
  },

  connectSync: () => {
    const { roomId, token, userName } = get();
    if (!roomId || !token || provider) return;
    doc = new Y.Doc();
    windowsMap = doc.getMap<Win>("windows");
    provider = new HocuspocusProvider({
      url: resolveSyncUrl(),
      name: `room:${roomId}`,
      token,
      document: doc,
    });

    const pushWindows = () => {
      if (!windowsMap) return;
      const list: Win[] = [];
      windowsMap.forEach((v) => { if (v && v.id) list.push(v); });
      set({ windows: list.sort((a, b) => a.z - b.z) });
    };

    const pushPeers = () => {
      if (!provider?.awareness) return;
      const peers: AwarenessUser[] = [];
      provider.awareness.getStates().forEach((s) => {
        const u = (s as { user?: AwarenessUser }).user;
        if (u && u.userId !== userId) peers.push(u);
      });
      set({ peers });
    };

    provider.on("synced", (e: { state: boolean }) => {
      set({ synced: e.state });
      if (e.state) {
        // 初回: 優先順位は ローカル保持 > REST保存 > 既定窓（他クライアントの窓は上書きしない）
        const fromY = [...windowsMap!.values()];
        if (fromY.length > 0) return;
        const local = get().windows;
        if (local.length > 0) {
          writeWindowsToY(local);
          return;
        }
        api.loadWindows(roomId, token).then((rest) => {
          if (rest && rest.length > 0) {
            const wins = (rest as unknown as { id: string; nodeId: string; x: number; y: number; w: number; h: number; z: number; minimized: number | boolean }[]).map((w) => ({
              id: w.id, nodeId: w.nodeId, x: w.x, y: w.y, w: w.w, h: w.h, z: w.z, minimized: !!w.minimized,
            }));
            writeWindowsToY(wins);
          }
          // 何もなければ空のまま（ユーザーが「新しい窓」で開始）
        }).catch(() => undefined);
      }
    });
    provider.on("status", (e: { status: string }) => set({ synced: e.status === "connected" }));

    windowsMap.observe(pushWindows);
    provider.awareness?.setLocalStateField("user", {
      userId,
      name: userName || `user-${userId}`,
      color: userColor,
    } satisfies AwarenessUser);
    provider.awareness?.on("change", pushPeers);

    pushWindows();
    pushPeers();
  },

  disconnectSync: () => {
    provider?.destroy();
    doc?.destroy();
    provider = null;
    doc = null;
    windowsMap = null;
    set({ synced: false, peers: [], windows: [] });
  },
}));
