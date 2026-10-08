import React from "react";
import type { VideoProject, VideoItem } from "@aiduchi/protocol";

type Props = {
  project: VideoProject;
  selectedItemId: string | null;
  onSetProp: (itemId: string, prop: "text" | "color" | "opacity", value: string | number) => void;
  onRemoveItem: (itemId: string) => void;
  onTrimItem: (itemId: string, startFrame: number, durationFrames: number) => void;
};

export function Inspector({ project, selectedItemId, onSetProp, onRemoveItem, onTrimItem }: Props) {
  const item: VideoItem | undefined = selectedItemId ? project.items[selectedItemId] : undefined;

  if (!item) {
    return (
      <div style={{ padding: 12, color: "#888", fontSize: 12 }}>
        クリップを選択するとプロパティが表示されます
        <div style={{ marginTop: 8 }}>
          <b>プロジェクト</b>
          <div>fps: {project.fps}</div>
          <div>size: {project.width}×{project.height}</div>
          <div>tracks: {project.tracks.length}</div>
          <div>items: {Object.keys(project.items).length}</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 12, fontSize: 12 }}>
      <b>{item.type === "text" ? "テキスト" : "クリップ"}</b>
      <div style={{ color: "#888", marginBottom: 8 }}>ID: {item.id}</div>

      {item.type === "text" && (
        <label style={{ display: "block", marginBottom: 6 }}>
          テキスト
          <input value={item.text} onChange={(e) => onSetProp(item.id, "text", e.target.value)} style={{ width: "100%", marginTop: 2 }} />
        </label>
      )}

      <label style={{ display: "block", marginBottom: 6 }}>
        カラー
        <input type="color" value={item.color} onChange={(e) => onSetProp(item.id, "color", e.target.value)} style={{ width: "100%", marginTop: 2, height: 28 }} />
      </label>

      <label style={{ display: "block", marginBottom: 6 }}>
        不透明度: {Math.round(item.opacity * 100)}%
        <input type="range" min={0} max={100} value={Math.round(item.opacity * 100)}
          onChange={(e) => onSetProp(item.id, "opacity", Number(e.target.value) / 100)} style={{ width: "100%" }} />
      </label>

      <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
        <label style={{ flex: 1 }}>
          開始フレーム
          <input type="number" value={item.startFrame} min={0}
            onChange={(e) => onTrimItem(item.id, Number(e.target.value), item.durationFrames)} style={{ width: "100%", marginTop: 2 }} />
        </label>
        <label style={{ flex: 1 }}>
          長さ
          <input type="number" value={item.durationFrames} min={1}
            onChange={(e) => onTrimItem(item.id, item.startFrame, Number(e.target.value))} style={{ width: "100%", marginTop: 2 }} />
        </label>
      </div>

      <button onClick={() => onRemoveItem(item.id)} style={{ color: "#ff6b6b", border: "1px solid #ff6b6b", background: "none", padding: "4px 8px", borderRadius: 4, cursor: "pointer" }}>
        削除
      </button>
    </div>
  );
}
