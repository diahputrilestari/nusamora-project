import { handleAssetUrl } from "../../supabase/functions/_shared/asseturl.ts";
let pass = 0, fail = 0; const ok = (n, c) => { if (c) { pass++; console.log("PASS ", n) } else { fail++; console.log("FAIL ", n) } };
const A = "11111111-2222-3333-4444-555555555555"; const counters = new Map(); let signed = [];
const mk = (over = {}) => ({ env: { allowedOrigins: ["https://nusamora.com"] },
  async rpc(name, a) { if (name === "rl_hit") { const c = (counters.get(a.p_key) || 0) + 1; counters.set(a.p_key, c); return { data: c > a.p_limit ? { allowed: false, retry_after: 9 } : { allowed: true }, error: null }; }
    if (name === "premium_asset_path") return { data: a.p_slug === "undangan-aktif" && a.p_asset === A ? "premium/luxe/model.glb" : null, error: null }; return { data: null, error: null }; },
  async signedUrl(p, ttl) { signed.push([p, ttl]); return "https://x.supabase.co/storage/v1/object/sign/premium-assets/" + p + "?token=abc"; }, ...over });
const req = (body, o = {}) => new Request("https://x.supabase.co/functions/v1/asset-url", { method: o.method || "POST", headers: { "content-type": "application/json", origin: "https://nusamora.com", "cf-connecting-ip": o.ip || "1.1.1.1" }, body: o.method === "GET" ? undefined : JSON.stringify(body) });
let r = await handleAssetUrl(req({ slug: "undangan-aktif", asset_id: A }), mk()); let j = await r.json();
ok("undangan aktif + aset berhak -> 200 dengan signed URL", r.status === 200 && /\/object\/sign\/premium-assets\/premium\/luxe\/model\.glb\?token=/.test(j.url));
ok("umur tautan pendek (<= 600 detik) dan tidak di-cache", j.expires_in <= 600 && r.headers.get("cache-control") === "no-store" && signed[0][1] === 300);
ok("CORS hanya untuk origin yang diizinkan", r.headers.get("access-control-allow-origin") === "https://nusamora.com");
r = await handleAssetUrl(req({ slug: "undangan-draft", asset_id: A }), mk()); ok("undangan tidak aktif -> 404 tanpa URL", r.status === 404 && !(await r.text()).includes("http"));
const r2 = await handleAssetUrl(req({ slug: "undangan-aktif", asset_id: "99999999-2222-3333-4444-555555555555" }), mk()); ok("aset bukan haknya -> 404 yang SAMA (tidak membocorkan keberadaan)", r2.status === 404);
for (const [n, b] of [["slug tidak valid", { slug: "../etc", asset_id: A }], ["asset_id bukan UUID", { slug: "undangan-aktif", asset_id: "x" }], ["tanpa isi", {}]]) { r = await handleAssetUrl(req(b), mk()); ok("400: " + n, r.status === 400); }
r = await handleAssetUrl(req(null, { method: "GET" }), mk()); ok("GET ditolak 405", r.status === 405);
r = await handleAssetUrl(new Request("https://x/functions/v1/asset-url", { method: "OPTIONS", headers: { origin: "https://evil.example" } }), mk()); ok("preflight origin asing tidak diberi Allow-Origin", r.status === 204 && !r.headers.get("access-control-allow-origin"));
r = await handleAssetUrl(req({ slug: "undangan-aktif", asset_id: A }), mk({ async rpc(n) { return n === "rl_hit" ? { data: { allowed: true }, error: null } : { data: "premium/../../secret", error: null }; } })); ok("path berbahaya dari DB ditolak (defense in depth)", r.status === 404);
r = await handleAssetUrl(req({ slug: "undangan-aktif", asset_id: A }), mk({ async signedUrl() { return null; } })); ok("gagal menandatangani -> 502 tanpa bocoran", r.status === 502);
counters.clear(); let codes = []; for (let i = 0; i < 305; i++) codes.push((await handleAssetUrl(req({ slug: "undangan-aktif", asset_id: A }, { ip: "7.7.7.7" }), mk())).status);
ok("rate limit per IP: 300 pertama dilayani, sisanya 429", codes.slice(0, 300).every((c) => c === 200) && codes.slice(300).every((c) => c === 429));
console.log(fail ? "GAGAL " + fail : "SEMUA LULUS (" + pass + ")"); process.exit(fail ? 1 : 0);
