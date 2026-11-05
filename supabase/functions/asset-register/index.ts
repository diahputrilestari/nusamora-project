import { createClient } from "npm:@supabase/supabase-js@2.58.0";
import { handleAssetRegister, type AssetDeps } from "../_shared/assets.ts";

function makeAssetDeps(): AssetDeps {
  const url = Deno.env.get("SUPABASE_URL")!, service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
  return {
    env: { allowedOrigins: (Deno.env.get("ALLOWED_ORIGINS") || "").split(",").map((s) => s.trim().replace(/\/$/, "")).filter(Boolean), publicBase: `${url}/storage/v1/object/public/theme-assets/` },
    async getUser(token) { const { data, error } = await admin.auth.getUser(token); return error || !data.user ? null : { id: data.user.id }; },
    async download(path) { const r = await admin.storage.from("theme-assets").download(path); return r.error || !r.data ? null : new Uint8Array(await r.data.arrayBuffer()); },
    async remove(path) { await admin.storage.from("theme-assets").remove([path]); },
    async rpc(name, args) { const r = await admin.rpc(name, args); return { data: r.data, error: r.error ? { message: r.error.message } : null }; },
  };
}
Deno.serve((req) => handleAssetRegister(req, makeAssetDeps()));
