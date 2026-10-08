import type { NodeMeta, RoomInfo } from "./types";

const API = (import.meta as unknown as { env: Record<string, string> }).env.VITE_API_URL ?? "";

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, init);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
  return body as T;
}

export function createRoom(name: string) {
  return req<{ id: string; joinToken: string; adminToken: string }>("/api/rooms", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, adapterKind: "code" }),
  });
}

export function getRoom(roomId: string, token: string) {
  return req<RoomInfo>(`/api/rooms/${roomId}`, { headers: { "x-room-token": token } });
}

export function listNodes(roomId: string, token: string) {
  return req<NodeMeta[]>(`/api/rooms/${roomId}/nodes`, { headers: { "x-room-token": token } });
}

export function getSnapshot(roomId: string, token: string, nodeId: string) {
  return req<unknown>(`/api/rooms/${roomId}/snapshots/${nodeId}`, { headers: { "x-room-token": token } });
}

export type Byok = { provider: string; key: string; model: string };

export function createNode(
  roomId: string,
  token: string,
  parentId: string | null,
  prompt: string,
  byok?: Byok,
) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "x-room-token": token,
  };
  if (byok && byok.provider && byok.key) {
    headers["x-byok-provider"] = byok.provider;
    headers["x-byok-key"] = byok.key;
    if (byok.model) headers["x-byok-model"] = byok.model;
  }
  return req<NodeMeta & { error?: string }>(`/api/rooms/${roomId}/nodes`, {
    method: "POST",
    headers,
    body: JSON.stringify({ parentId, prompt }),
  });
}

export function adoptNode(roomId: string, token: string, nodeId: string) {
  return req<NodeMeta>(`/api/rooms/${roomId}/nodes/${nodeId}/adopt`, {
    method: "POST",
    headers: { "x-room-token": token },
  });
}

export function abandonNode(roomId: string, token: string, nodeId: string) {
  return req<NodeMeta>(`/api/rooms/${roomId}/nodes/${nodeId}/abandon`, {
    method: "POST",
    headers: { "x-room-token": token },
  });
}

export function saveWindows(roomId: string, token: string, windows: unknown[]) {
  return fetch(`${API}/api/rooms/${roomId}/windows`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", "x-room-token": token },
    body: JSON.stringify({ windows }),
  }).catch(() => undefined);
}

export function loadWindows(roomId: string, token: string) {
  return req<unknown[]>(`/api/rooms/${roomId}/windows`, { headers: { "x-room-token": token } });
}
