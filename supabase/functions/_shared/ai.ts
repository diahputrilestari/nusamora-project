// AI Asset Generator: lapisan adapter provider + handler. Tidak mengasumsikan provider; tanpa konfigurasi -> "belum_dikonfigurasi".
// Kunci API hanya dibaca di server (Deno.env) dan tidak pernah dikirim ke browser.
import { cors } from "./handlers.ts";
import { validateAsset } from "./assets.ts";

export type GenImage = { bytes: Uint8Array; ext: "png" | "jpg" | "webp" };
export interface ImageProvider { name: string; generate(o: { prompt: string; count: number }): Promise<GenImage[]> }

const b64 = (s: string) => { const bin = atob(s); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; };

/** Adapter OpenAI Images (gpt-image-1 / dall-e). Dibuat mengikuti dokumentasi API; BELUM diuji terhadap layanan sungguhan dari lingkungan ini. */
export function openAIProvider(key: string, model: string, f: typeof fetch = fetch): ImageProvider {
  return {
    name: "openai",
    async generate({ prompt, count }) {
      const r = await f("https://api.openai.com/v1/images/generations", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` }, body: JSON.stringify({ model, prompt, n: count, size: "1024x1024" }) });
      if (!r.ok) throw new Error("provider_http_" + r.status);
      const j = await r.json(); const out: GenImage[] = [];
      for (const it of j?.data || []) if (typeof it?.b64_json === "string") out.push({ bytes: b64(it.b64_json), ext: "png" });
      if (!out.length) throw new Error("provider_tanpa_gambar");
      return out;
    },
  };
}
/** Menambah provider baru = mengembalikan ImageProvider lain di sini (mis. Stability, Replicate). */
export function providerFromEnv(get: (k: string) => string | undefined, f: typeof fetch = fetch): ImageProvider | null {
  const p = (get("AI_PROVIDER") || "").toLowerCase();
  if (p === "openai" && get("OPENAI_API_KEY")) return openAIProvider(get("OPENAI_API_KEY")!, get("AI_IMAGE_MODEL") || "gpt-image-1", f);
  return null;
}

export interface GenDeps {
  env: { allowedOrigins: string[]; publicBase: string };
  provider: ImageProvider | null;
  getUser(token: string): Promise<{ id: string } | null>;
  upload(path: string, bytes: Uint8Array, mime: string): Promise<boolean>;
  rpc(name: string, args: Record<string, unknown>): Promise<{ data: any; error: { message: string } | null }>;
}
const R = (req: Request, d: GenDeps, s: number, b: unknown) => new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...cors(req, d.env as any) } });
const PKGN: Record<string, string> = { essential: "2D (Essential)", signature: "3D cinematic (Signature)", luxe: "3D live guest (Luxe)" };
const MIME: Record<string, string> = { png: "image/png", jpg: "image/jpeg", webp: "image/webp" };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function handleAssetGenerate(req: Request, d: GenDeps): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(req, d.env as any) });
  if (req.method !== "POST") return R(req, d, 405, { error: "metode_tidak_didukung" });
  const m = /^Bearer\s+(.+)$/i.exec(req.headers.get("authorization") || ""); const token = m ? m[1] : "";
  const u = token ? await d.getUser(token) : null; if (!u) return R(req, d, 401, { error: "perlu_login", message: "Silakan masuk terlebih dahulu." });
  const perm = await d.rpc("has_perm_user", { uid: u.id, p: "templates.write" }); if (perm.error || perm.data !== true) return R(req, d, 403, { error: "forbidden", message: "Anda tidak punya izin mengelola asset." });
  let b: any; try { b = await req.json(); } catch { return R(req, d, 400, { error: "permintaan_tidak_valid" }); }
  if (b?.action === "status") return R(req, d, 200, { ok: true, configured: !!d.provider, provider: d.provider ? d.provider.name : null });
  if (b?.action !== "generate") return R(req, d, 400, { error: "aksi_tidak_dikenal" });
  if (!d.provider) return R(req, d, 503, { error: "belum_dikonfigurasi", message: "AI Asset Generator belum dikonfigurasi. Atur AI_PROVIDER dan kunci API di Supabase secrets." });

  const pkg = String(b.package_type || ""), prompt = String(b.prompt || "").trim(), theme = String(b.theme_key || "").trim().toLowerCase(), count = Number(b.count);
  if (!PKGN[pkg]) return R(req, d, 400, { error: "paket_tidak_valid", message: "Paket tidak valid." });
  if (prompt.length < 3 || prompt.length > 2000) return R(req, d, 400, { error: "prompt_tidak_valid", message: "Prompt 3-2000 karakter." });
  if (!Number.isInteger(count) || count < 1 || count > 4) return R(req, d, 400, { error: "jumlah_tidak_valid", message: "Jumlah 1-4 gambar." });
  if (theme && !/^[a-z0-9-]{2,60}$/.test(theme)) return R(req, d, 400, { error: "tema_tidak_valid", message: "Kunci tema tidak valid." });
  if (!UUID.test(String(b.category_id || ""))) return R(req, d, 400, { error: "kategori_tidak_valid", message: "Pilih kategori." });
  const cr = await d.rpc("ai_category", { p_id: b.category_id }); const cat = cr.data;
  if (cr.error || !cat) return R(req, d, 422, { error: "kategori_tidak_valid", message: "Kategori tidak ditemukan." });
  if (cat.package_type !== pkg) return R(req, d, 422, { error: "kategori_tidak_cocok", message: "Kategori bukan milik paket yang dipilih." });
  const exts: string[] = (cat.allowed_ext || []).filter((x: string) => x in MIME);
  if (!exts.length) return R(req, d, 422, { error: "kategori_tidak_didukung_ai", message: "AI hanya membuat gambar. Kategori ini memakai format 3D/audio/animasi; unggah manual." });
  const q = await d.rpc("admin_generation_allowed", { p_user: u.id, p_count: count });
  if (q.error || q.data !== true) return R(req, d, 429, { error: "kuota_harian", message: "Batas 40 gambar per 24 jam tercapai." });

  const full = `${cat.name} untuk undangan digital ${PKGN[pkg]}${theme ? ", tema " + theme : ""}. ${prompt}. Tanpa teks, tanpa watermark, tanpa logo.`;
  const rec = (status: string, err: string | null, variants: unknown[]) => d.rpc("admin_record_generation", { p_user: u.id, p_package: pkg, p_theme: theme || null, p_category: cat.id, p_prompt: prompt, p_provider: d.provider!.name, p_count: count, p_status: status, p_error: err, p_variants: variants });
  let imgs: GenImage[];
  try { imgs = await d.provider.generate({ prompt: full, count }); } catch (e) { await rec("failed", String((e as Error).message || "gagal").slice(0, 120), []); return R(req, d, 502, { error: "provider_gagal", message: "Provider AI gagal membuat gambar. Coba lagi nanti." }); }

  const run = crypto.randomUUID(), variants: { file_path: string; file_url: string }[] = []; let skipped = 0;
  for (let i = 0; i < imgs.length && variants.length < count; i++) {
    const im = imgs[i];
    if (exts.indexOf(im.ext) < 0 || !validateAsset(im.bytes, im.ext).ok) { skipped++; continue; }
    const path = `generated/${u.id}/${run}/${i + 1}.${im.ext}`;
    if (await d.upload(path, im.bytes, MIME[im.ext])) variants.push({ file_path: path, file_url: d.env.publicBase + path }); else skipped++;
  }
  if (!variants.length) { await rec("failed", "tidak_ada_hasil_valid", []); return R(req, d, 502, { error: "hasil_tidak_valid", message: "Provider tidak menghasilkan gambar yang valid untuk kategori ini." }); }
  const r = await rec("done", null, variants);
  if (r.error || !r.data?.ok) return R(req, d, 500, { error: "server", message: "Gagal menyimpan riwayat generasi." });
  return R(req, d, 200, { ok: true, generation_id: r.data.generation_id, variants: r.data.variants, skipped });
}
