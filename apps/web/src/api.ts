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

export function getThread(roomId: string, token: string, nodeId: string) {
  return req<{ messages: NodeMeta[] }>(`/api/rooms/${roomId}/nodes/${nodeId}/thread`, {
    headers: { "x-room-token": token },
  });
}

/** スナップショット本文と、保存時の競合検出に使うハッシュ */
export async function getSnapshotWithHash(roomId: string, token: string, nodeId: string) {
  const res = await fetch(`${API}/api/rooms/${roomId}/snapshots/${nodeId}`, {
    headers: { "x-room-token": token },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const body = (await res.json()) as { files?: Record<string, string>; hash?: string };
  return { files: body.files ?? {}, hash: body.hash ?? res.headers.get("x-snapshot-hash") ?? "" };
}

export type Byok = { provider: string; key: string; model: string };

function byokHeaders(byok?: Byok): Record<string, string> {
  const headers: Record<string, string> = {};
  if (byok && byok.provider && byok.key) {
    headers["x-byok-provider"] = byok.provider;
    headers["x-byok-key"] = byok.key;
    if (byok.model) headers["x-byok-model"] = byok.model;
  }
  return headers;
}

export function createNode(
  roomId: string,
  token: string,
  parentId: string | null,
  prompt: string,
  byok?: Byok,
  userName?: string,
) {
  return req<NodeMeta & { error?: string }>(`/api/rooms/${roomId}/nodes`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-room-token": token,
      ...byokHeaders(byok),
    },
    body: JSON.stringify({ parentId, prompt, authorName: userName }),
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

/** 現在のファイル群を新しいチェックポイントとして保存。baseHash が古ければ 409 */
export function saveSnapshot(
  roomId: string,
  token: string,
  parentNodeId: string | null,
  files: Record<string, string>,
  label: string,
  userName: string,
  baseHash: string,
) {
  return req<NodeMeta>(`/api/rooms/${roomId}/snapshots`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-room-token": token },
    body: JSON.stringify({ parentNodeId, files, label, baseHash, authorName: userName }),
  });
}
