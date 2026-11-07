// Signed URL berumur pendek untuk aset BERBAYAR (bucket privat premium-assets). Runtime-agnostic (dipakai Edge Function + tes Node).
// Akses = pemegang slug undangan yang aktif dan berbayar (tamu), BUKAN akun login: slug bertindak sebagai kapabilitas, dan
// otorisasi sebenarnya (undangan aktif, paket cocok, aset dipetakan ke template undangan) dihitung di database (premium_asset_path).
import { cors } from "./handlers.ts";
import { rateCheck, tooMany, clientIp } from "./ratelimit.ts";

export interface AssetUrlDeps {
  env: { allowedOrigins: string[]; ttlSeconds?: number };
  rpc(name: string, args: Record<string, unknown>): Promise<{ data: any; error: { message: string } | null }>;
  signedUrl(path: string, ttlSeconds: number): Promise<string | null>;
}
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SLUG = /^[a-z0-9][a-z0-9-]{1,80}$/;
const hdr = (req: Request, d: AssetUrlDeps) => ({ "Content-Type": "application/json", "Cache-Control": "no-store", ...cors(req, d.env as any) });
const R = (req: Request, d: AssetUrlDeps, status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: hdr(req, d) });

export async function handleAssetUrl(req: Request, d: AssetUrlDeps): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(req, d.env as any) });
  if (req.method !== "POST") return R(req, d, 405, { error: "metode_tidak_didukung" });
  { const w = await rateCheck(d, "asset-url-ip", clientIp(req), 300, 600); if (w) return tooMany(req, d.env.allowedOrigins, w); }
  let b: any; try { b = await req.json(); } catch { return R(req, d, 400, { error: "permintaan_tidak_valid" }); }
  const slug = String(b?.slug || "").toLowerCase(), asset = String(b?.asset_id || "");
  if (!SLUG.test(slug) || !UUID.test(asset)) return R(req, d, 400, { error: "permintaan_tidak_valid" });
  const r = await d.rpc("premium_asset_path", { p_slug: slug, p_asset: asset });
  if (r.error) return R(req, d, 500, { error: "server", message: "Gagal memeriksa akses." });
  // Sengaja SAMA untuk "aset tidak ada", "undangan tidak aktif", dan "bukan haknya": tidak membocorkan keberadaan aset.
  if (typeof r.data !== "string" || !/^premium\/[A-Za-z0-9._\/-]+$/.test(r.data) || r.data.includes("..")) return R(req, d, 404, { error: "tidak_ditemukan" });
  const ttl = Math.min(600, Math.max(30, d.env.ttlSeconds ?? 300));
  const url = await d.signedUrl(r.data, ttl);
  if (!url) return R(req, d, 502, { error: "server", message: "Gagal membuat tautan aset." });
  return R(req, d, 200, { url, expires_in: ttl });
}
