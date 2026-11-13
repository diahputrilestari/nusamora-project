import { createClient } from "npm:@supabase/supabase-js@2.58.0";
import { handleSystemStatus } from "../_shared/sysstatus.ts";
import type { NotifyDeps } from "../_shared/notify.ts";

const has = (k: string) => !!Deno.env.get(k);
function makeDeps(): NotifyDeps {
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false, autoRefreshToken: false } });
  return {
    env: { allowedOrigins: (Deno.env.get("ALLOWED_ORIGINS") || "").split(",").map((s) => s.trim().replace(/\/$/, "")).filter(Boolean) },
    async getUser(token) { const { data, error } = await admin.auth.getUser(token); return error || !data.user ? null : { id: data.user.id }; },
    async rpc(name, args) { const r = await admin.rpc(name, args); return { data: r.data, error: r.error ? { message: r.error.message } : null }; },
    fetch: (u, i) => fetch(u, i),
  };
}
Deno.serve((req) => {
  const d = makeDeps();
  return handleSystemStatus(req, d, {
    secrets: { MIDTRANS_SERVER_KEY: has("MIDTRANS_SERVER_KEY"), MIDTRANS_SIGNATURE_KEY: has("MIDTRANS_SIGNATURE_KEY"), RESEND_API_KEY: has("RESEND_API_KEY"), WA_TOKEN: has("WA_TOKEN"), NOTIFY_DISPATCH_SECRET: has("NOTIFY_DISPATCH_SECRET"), RESEND_WEBHOOK_SECRET: has("RESEND_WEBHOOK_SECRET"), RATE_LIMIT_SALT: has("RATE_LIMIT_SALT"), ALLOWED_ORIGINS: has("ALLOWED_ORIGINS") },
    midtransMode: Deno.env.get("MIDTRANS_IS_PRODUCTION") === "true" ? "production" : "sandbox",
    allowedOrigins: d.env.allowedOrigins.length,
  });
});
