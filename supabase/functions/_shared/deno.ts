// Penghubung runtime Supabase Edge (Deno). Semua rahasia dibaca dari environment, tidak pernah ada di kode.
import { createClient } from "npm:@supabase/supabase-js@2.58.0";
import type { Deps } from "./handlers.ts";

export function makeDeps(): Deps {
  const url = Deno.env.get("SUPABASE_URL")!, service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
  return {
    env: {
      serverKey: Deno.env.get("MIDTRANS_SERVER_KEY") || "",
      signatureKey: Deno.env.get("MIDTRANS_SIGNATURE_KEY") || "",
      isProd: Deno.env.get("MIDTRANS_IS_PRODUCTION") === "true",
      allowedOrigins: (Deno.env.get("ALLOWED_ORIGINS") || "").split(",").map((s) => s.trim().replace(/\/$/, "")).filter(Boolean),
    },
    fetch: (i, o) => fetch(i, o),
    async getUser(token) { const { data, error } = await admin.auth.getUser(token); return error || !data.user ? null : { id: data.user.id }; },
    async ownsOrder(token, orderId) {
      const c = createClient(url, anon, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false, autoRefreshToken: false } });
      const { data } = await c.from("payments").select("status").eq("order_id", orderId).maybeSingle();
      return data ? { status: data.status } : null;
    },
    async rpc(name, args) { const r = await admin.rpc(name, args); return { data: r.data, error: r.error ? { message: r.error.message } : null }; },
  };
}
