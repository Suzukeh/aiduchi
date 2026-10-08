import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    allowedHosts: [".trycloudflare.com", "vtest.suzuke.dev", ".suzuke.dev"],
    proxy: {
      "/api": {
        target: process.env.API_PROXY_TARGET ?? "http://localhost:3000",
        changeOrigin: true,
      },
      "/sync": {
        target: process.env.SYNC_PROXY_TARGET ?? "ws://localhost:1234",
        ws: true,
      },
    },
  },
});
