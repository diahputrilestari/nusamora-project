import { createClient } from "npm:@supabase/supabase-js@2.58.0";
import { handleNotifyWebhook, type NotifyDeps } from "../_shared/notify.ts";

function makeDeps(): NotifyDeps {
  const url = Deno.env.get("SUPABASE_URL")!, service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
  return {
    env: { allowedOrigins: [], webhookSecret: Deno.env.get("RESEND_WEBHOOK_SECRET") || undefined },
    async getUser() { return null; },
    async rpc(name, args) { const r = await admin.rpc(name, args); return { data: r.data, error: r.error ? { message: r.error.message } : null }; },
    fetch: (u, i) => fetch(u, i),
  };
}
Deno.serve((req) => handleNotifyWebhook(req, makeDeps()));
