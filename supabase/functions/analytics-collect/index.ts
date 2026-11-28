import { createClient } from "npm:@supabase/supabase-js@2.58.0";
import { handleAnalytics, type AnalyticsDeps } from "../_shared/analytics.ts";

function makeDeps(): AnalyticsDeps {
  const url = Deno.env.get("SUPABASE_URL")!, service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
  return {
    env: { allowedOrigins: (Deno.env.get("ALLOWED_ORIGINS") || "").split(",").map((s) => s.trim().replace(/\/$/, "")).filter(Boolean) },
    async rpc(name, args) { const r = await admin.rpc(name, args); return { data: r.data, error: r.error ? { message: r.error.message } : null }; },
  };
}
Deno.serve((req) => handleAnalytics(req, makeDeps()));
