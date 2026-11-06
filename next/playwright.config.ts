import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  use: { baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000" },
  webServer: process.env.E2E_BASE_URL ? undefined : { command: "npm run build && npm run start", url: "http://localhost:3000/id", timeout: 240_000, reuseExistingServer: true, env: { PORT: "3000", HOSTNAME: "127.0.0.1" } },
});
