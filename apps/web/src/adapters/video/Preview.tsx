import React, { useEffect, useRef } from "react";
import type { VideoProject } from "@aiduchi/protocol";
import { renderSceneToContext } from "./renderScene";

type Props = {
  project: VideoProject;
  currentFrame: number;
};

export function Preview({ project, currentFrame }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const scale = 0.5;
    canvas.width = project.width * scale;
    canvas.height = project.height * scale;
    renderSceneToContext(ctx, project, currentFrame, scale);
  }, [project, currentFrame]);

  return (
    <div style={{ background: "#000", display: "flex", justifyContent: "center", alignItems: "center", borderRadius: 4, overflow: "hidden" }}>
      <canvas ref={canvasRef} style={{ maxWidth: "100%", height: "auto" }} />
    </div>
  );
}
