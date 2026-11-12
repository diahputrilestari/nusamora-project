import { createClient } from "npm:@supabase/supabase-js@2.58.0";
import { handleAssetUrl, type AssetUrlDeps } from "../_shared/asseturl.ts";

function makeDeps(): AssetUrlDeps {
  const url = Deno.env.get("SUPABASE_URL")!, service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
  return {
    env: { allowedOrigins: (Deno.env.get("ALLOWED_ORIGINS") || "").split(",").map((s) => s.trim().replace(/\/$/, "")).filter(Boolean) },
    async rpc(name, args) { const r = await admin.rpc(name, args); return { data: r.data, error: r.error ? { message: r.error.message } : null }; },
    async signedUrl(path, ttl) { const r = await admin.storage.from("premium-assets").createSignedUrl(path, ttl); return r.error || !r.data ? null : r.data.signedUrl; },
  };
}
Deno.serve((req) => handleAssetUrl(req, makeDeps()));
