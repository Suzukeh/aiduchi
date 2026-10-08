import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 120_000,
  retries: 0,
  use: {
    baseURL: "http://localhost:5180",
    viewport: { width: 1440, height: 900 },
  },
  webServer: [
    {
      command: "node tests/helpers/start-api.cjs",
      port: 5181,
      reuseExistingServer: true,
      timeout: 30_000,
    },
    {
      command: "env VITE_API_URL=http://localhost:5181 npm --prefix apps/web run dev -- --port 5180 --strictPort",
      port: 5180,
      reuseExistingServer: true,
      timeout: 60_000,
    },
  ],
});
