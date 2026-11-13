import { createClient } from "npm:@supabase/supabase-js@2.58.0";
import { handleNotifyDispatch, type NotifyDeps } from "../_shared/notify.ts";

function makeDeps(): NotifyDeps {
  const url = Deno.env.get("SUPABASE_URL")!, service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
  return {
    env: { allowedOrigins: (Deno.env.get("ALLOWED_ORIGINS") || "").split(",").map((s) => s.trim().replace(/\/$/, "")).filter(Boolean),
      dispatchSecret: Deno.env.get("NOTIFY_DISPATCH_SECRET") || undefined, resendKey: Deno.env.get("RESEND_API_KEY") || undefined, waToken: Deno.env.get("WA_TOKEN") || undefined, webhookSecret: Deno.env.get("RESEND_WEBHOOK_SECRET") || undefined },
    async getUser(token) { const { data, error } = await admin.auth.getUser(token); return error || !data.user ? null : { id: data.user.id }; },
    async rpc(name, args) { const r = await admin.rpc(name, args); return { data: r.data, error: r.error ? { message: r.error.message } : null }; },
    fetch: (u, i) => fetch(u, i),
    async resolveHost(host) {
      const out: string[] = [];
      for (const type of ["A", "AAAA"] as const) { try { out.push(...(await Deno.resolveDns(host, type))); } catch { /* tipe tidak ada */ } }
      return out;
    },
  };
}
Deno.serve((req) => handleNotifyDispatch(req, makeDeps()));
