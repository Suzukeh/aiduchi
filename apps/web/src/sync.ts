import * as Y from "yjs";
import { HocuspocusProvider } from "@hocuspocus/provider";

export type SyncState = {
  doc: Y.Doc;
  provider: HocuspocusProvider | null;
  windows: Y.Map<Record<string, unknown>>;
  awareness: HocuspocusProvider["awareness"] | null;
  connected: boolean;
};

export type AwarenessUser = {
  userId: string;
  name: string;
  color: string;
  activeWindowId: string | null;
};

const SYNC_URL = (import.meta as unknown as { env: Record<string, string> }).env.VITE_SYNC_URL ?? "ws://localhost:1234";

/** room単位のY.Doc接続を張り、windows共有マップとpresenceを返す */
export function connectRoom(roomId: string, joinToken: string, onSync: (s: SyncState) => void): () => void {
  const doc = new Y.Doc();
  const windows = doc.getMap<Record<string, unknown>>("windows");

  const provider = new HocuspocusProvider({
    url: SYNC_URL,
    name: `room:${roomId}`,
    token: joinToken,
    document: doc,
    onConnect: () => {
      state.connected = true;
      emit();
    },
  });

  const state: SyncState = { doc, provider, windows, awareness: provider.awareness, connected: false };
  const emit = () => onSync({ ...state });

  provider.on("status", (e: { status: string }) => {
    state.connected = e.status === "connected";
    emit();
  });
  provider.on("synced", (e: { state: boolean }) => {
    state.connected = e.state;
    emit();
  });
  windows.observe(() => emit());

  // 自分のpresenceを設定（表示名と色はlocalStorageに保存）
  const userId = localStorage.getItem("aiduchi.userId") ?? crypto.randomUUID().slice(0, 8);
  localStorage.setItem("aiduchi.userId", userId);
  const color = localStorage.getItem("aiduchi.color") ?? `#${Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, "0")}`;
  localStorage.setItem("aiduchi.color", color);
  const name = localStorage.getItem("aiduchi.name") ?? `user-${userId}`;
  localStorage.setItem("aiduchi.name", name);

  const aw = provider.awareness;
  if (aw) {
    aw.setLocalStateField("user", { userId, name, color, activeWindowId: null } satisfies AwarenessUser);
    aw.on("change", () => emit());
  }

  emit();
  return () => {
    provider.destroy();
    doc.destroy();
  };
}

/** Awarenessから自分以外のユーザー一覧を取る */
export function getPeers(awareness: SyncState["awareness"], selfUserId: string): AwarenessUser[] {
  if (!awareness) return [];
  const peers: AwarenessUser[] = [];
  awareness.getStates().forEach((state) => {
    const u = state?.user as AwarenessUser | undefined;
    if (u && u.userId !== selfUserId) peers.push(u);
  });
  return peers;
}
