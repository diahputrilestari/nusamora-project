import { createClient } from "npm:@supabase/supabase-js@2.58.0";
import { handleAssetGenerate, providerFromEnv, type GenDeps } from "../_shared/ai.ts";

function makeDeps(): GenDeps {
  const url = Deno.env.get("SUPABASE_URL")!, service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
  return {
    env: { allowedOrigins: (Deno.env.get("ALLOWED_ORIGINS") || "").split(",").map((s) => s.trim().replace(/\/$/, "")).filter(Boolean), publicBase: `${url}/storage/v1/object/public/theme-assets/` },
    provider: providerFromEnv((k) => Deno.env.get(k)),
    async getUser(token) { const { data, error } = await admin.auth.getUser(token); return error || !data.user ? null : { id: data.user.id }; },
    async upload(path, bytes, mime) { const r = await admin.storage.from("theme-assets").upload(path, bytes, { contentType: mime, upsert: false }); return !r.error; },
    async rpc(name, args) { const r = await admin.rpc(name, args); return { data: r.data, error: r.error ? { message: r.error.message } : null }; },
  };
}
Deno.serve((req) => handleAssetGenerate(req, makeDeps()));
