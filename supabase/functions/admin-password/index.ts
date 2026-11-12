import { createClient } from "npm:@supabase/supabase-js@2.58.0";
import { handleAdminPassword, jwtAal, type AdminPwDeps } from "../_shared/adminpw.ts";

function makeDeps(): AdminPwDeps {
  const url = Deno.env.get("SUPABASE_URL")!, service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
  return {
    env: { allowedOrigins: (Deno.env.get("ALLOWED_ORIGINS") || "").split(",").map((s) => s.trim().replace(/\/$/, "")).filter(Boolean) },
    async getUser(token) { const { data, error } = await admin.auth.getUser(token); return error || !data.user ? null : { id: data.user.id, email: data.user.email, aal: jwtAal(token) }; },
    async setPassword(uid, password) { const r = await admin.auth.admin.updateUserById(uid, { password }); return !r.error; },
    async rpc(name, args) { const r = await admin.rpc(name, args); return { data: r.data, error: r.error ? { message: r.error.message } : null }; },
  };
}
Deno.serve((req) => handleAdminPassword(req, makeDeps()));
