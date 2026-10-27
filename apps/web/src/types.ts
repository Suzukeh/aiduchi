export type NodeStatus = "draft" | "generating" | "review" | "adopted" | "abandoned";

export type NodeMeta = {
  id: string;
  roomId: string;
  parentId: string | null;
  rootId: string;
  authorType: "user" | "ai";
  authorLabel: string;
  prompt: string;
  status: NodeStatus;
  provider: string | null;
  model: string | null;
  diffSummary: string | null;
  createdAt: string;
};

/** 窓は個人の表示設定。サーバや他参加者と共有しない */
export type Win = {
  id: string;
  /** null = まだ送信していない新しいチャット */
  nodeId: string | null;
  /** 未送信の入力。最小化・再読込でも失わない */
  draft: string;
  x: number;
  y: number;
  w: number;
  h: number;
  z: number;
  minimized: boolean;
};

export type AwarenessUser = {
  userId: string;
  name: string;
  color: string;
};

export type RoomInfo = {
  id: string;
  name: string;
  adapterKind: string;
};

export const STATUS_META: Record<NodeStatus, { label: string; color: string }> = {
  draft: { label: "下書き", color: "#6b7280" },
  generating: { label: "生成中", color: "#f59e0b" },
  review: { label: "レビュー待ち", color: "#3b82f6" },
  adopted: { label: "採用", color: "#10b981" },
  abandoned: { label: "破棄", color: "#ef4444" },
};

export function titleOf(node: NodeMeta | null | undefined): string {
  if (!node) return "新しいチャット";
  const text = node.prompt.trim().replace(/\s+/g, " ");
  return text.length > 30 ? text.slice(0, 30) + "…" : text || "(空の指示)";
}
