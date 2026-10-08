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

export type Win = {
  id: string;
  nodeId: string; // "root" or a node id
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
