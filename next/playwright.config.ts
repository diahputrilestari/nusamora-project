import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  use: { baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000", locale: "id-ID" }, // deterministik; tes deteksi bahasa membuat konteks sendiri
  reporter: [["list"], ["html", { open: "never" }]],
  // Supabase tiruan (e2e/mock-supabase.mjs) dijalankan lebih dulu; aplikasi dibangun dengan URL tiruan itu agar RPC undangan publik bisa diuji.
  webServer: process.env.E2E_BASE_URL ? undefined : [
    { command: "node e2e/mock-supabase.mjs", url: "http://127.0.0.1:54399/__health", timeout: 20_000, reuseExistingServer: true },
    { command: "npm run build && npm run start", url: "http://localhost:3000/id", timeout: 240_000, reuseExistingServer: true,
      env: { PORT: "3000", HOSTNAME: "127.0.0.1", NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54399", NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-e2e" } },
  ],
});
