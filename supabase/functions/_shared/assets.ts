// Validasi & pendaftaran asset (runtime-agnostic; dipakai Edge Function asset-register dan tes Node).
// File diperiksa dari ISINYA (magic bytes, struktur), bukan hanya ekstensi/MIME dari browser.
import { cors } from "./handlers.ts";

export interface AssetMeta { ok: boolean; error?: string; message?: string; mime?: string; width?: number; height?: number; transparent?: boolean }
const MAX_BYTES = 52428800;
const u32le = (b: Uint8Array, o: number) => (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0;
const u32be = (b: Uint8Array, o: number) => ((b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0;
const ascii = (b: Uint8Array, o: number, n: number) => String.fromCharCode(...b.slice(o, o + n));
const bad = (error: string, message: string): AssetMeta => ({ ok: false, error, message });
const text = (b: Uint8Array) => new TextDecoder("utf-8", { fatal: false }).decode(b);

export async function sha256hex(b: Uint8Array): Promise<string> {
  const h = await crypto.subtle.digest("SHA-256", b);
  return Array.from(new Uint8Array(h)).map((x) => x.toString(16).padStart(2, "0")).join("");
}

function png(b: Uint8Array): AssetMeta {
  if (b.length < 33 || !(b[0] === 0x89 && ascii(b, 1, 3) === "PNG" && b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a) || ascii(b, 12, 4) !== "IHDR") return bad("isi_tidak_sesuai", "Isi file bukan PNG yang valid.");
  const w = u32be(b, 16), h = u32be(b, 20), ct = b[25];
  if (!w || !h || w > 16384 || h > 16384) return bad("dimensi_tidak_valid", "Dimensi gambar tidak valid atau terlalu besar (maks. 16384 px).");
  let trns = false; for (let o = 8; o + 12 <= b.length && o < b.length;) { const len = u32be(b, o), t = ascii(b, o + 4, 4); if (t === "tRNS") { trns = true; break; } if (t === "IDAT" || t === "IEND") break; o += 12 + len; }
  return { ok: true, mime: "image/png", width: w, height: h, transparent: ct === 4 || ct === 6 || trns };
}
function jpeg(b: Uint8Array): AssetMeta {
  if (b.length < 4 || b[0] !== 0xff || b[1] !== 0xd8 || b[2] !== 0xff) return bad("isi_tidak_sesuai", "Isi file bukan JPEG yang valid.");
  for (let o = 2; o + 9 < b.length;) {
    if (b[o] !== 0xff) { o++; continue; }
    const m = b[o + 1]; if (m === 0xff) { o++; continue; }
    if ((m >= 0xc0 && m <= 0xcf) && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) { const h = (b[o + 5] << 8) | b[o + 6], w = (b[o + 7] << 8) | b[o + 8]; if (!w || !h || w > 16384 || h > 16384) return bad("dimensi_tidak_valid", "Dimensi gambar tidak valid."); return { ok: true, mime: "image/jpeg", width: w, height: h, transparent: false }; }
    if (m === 0xd8 || m === 0x01 || (m >= 0xd0 && m <= 0xd7)) { o += 2; continue; }
    o += 2 + ((b[o + 2] << 8) | b[o + 3]);
  }
  return bad("isi_tidak_sesuai", "Dimensi JPEG tidak terbaca.");
}
function webp(b: Uint8Array): AssetMeta {
  if (b.length < 30 || ascii(b, 0, 4) !== "RIFF" || ascii(b, 8, 4) !== "WEBP") return bad("isi_tidak_sesuai", "Isi file bukan WebP yang valid.");
  const f = ascii(b, 12, 4); let w = 0, h = 0, a = false;
  if (f === "VP8X") { w = 1 + (b[24] | (b[25] << 8) | (b[26] << 16)); h = 1 + (b[27] | (b[28] << 8) | (b[29] << 16)); a = (b[20] & 0x10) !== 0; }
  else if (f === "VP8 ") { w = (b[26] | (b[27] << 8)) & 0x3fff; h = (b[28] | (b[29] << 8)) & 0x3fff; }
  else if (f === "VP8L") { const v = u32le(b, 21); w = (v & 0x3fff) + 1; h = ((v >> 14) & 0x3fff) + 1; a = ((v >> 28) & 1) === 1; }
  else return bad("isi_tidak_sesuai", "Format WebP tidak dikenali.");
  if (!w || !h || w > 16384 || h > 16384) return bad("dimensi_tidak_valid", "Dimensi gambar tidak valid.");
  return { ok: true, mime: "image/webp", width: w, height: h, transparent: a };
}
function gif(b: Uint8Array): AssetMeta {
  const s = ascii(b, 0, 6); if (b.length < 10 || (s !== "GIF87a" && s !== "GIF89a")) return bad("isi_tidak_sesuai", "Isi file bukan GIF yang valid.");
  const w = b[6] | (b[7] << 8), h = b[8] | (b[9] << 8); if (!w || !h) return bad("dimensi_tidak_valid", "Dimensi GIF tidak valid.");
  return { ok: true, mime: "image/gif", width: w, height: h, transparent: false };
}
// SVG dapat memuat skrip: tolak semua unsur aktif / pemuatan sumber luar.
const SVG_DANGER = /<\s*script|<\s*foreignObject|<\s*iframe|<\s*embed|<\s*object|<\s*audio|<\s*video|<\s*link\b|<\s*meta\b|<\s*animate[^>]*\battributeName\s*=\s*["']?(href|xlink:href|on)|\son[a-z]+\s*=|javascript\s*:|vbscript\s*:|data\s*:\s*text\/html|<!ENTITY|<!DOCTYPE[^>]*\[|@import|(?:xlink:)?href\s*=\s*["']\s*(?:https?:)?\/\/|url\(\s*["']?\s*(?:https?:)?\/\//i;
function svg(b: Uint8Array): AssetMeta {
  if (b.length > 2097152) return bad("ukuran_melebihi_batas", "SVG maksimal 2 MB.");
  const t = text(b); if (!/<\s*svg[\s>]/i.test(t)) return bad("isi_tidak_sesuai", "Isi file bukan SVG yang valid.");
  if (SVG_DANGER.test(t)) return bad("svg_tidak_aman", "SVG berisi skrip, event handler, atau tautan luar. Bersihkan SVG sebelum mengunggah.");
  const tag = /<\s*svg\b[^>]*>/i.exec(t)?.[0] || "", num = (n: string) => { const m = new RegExp("\\b" + n + "\\s*=\\s*[\"']\\s*([0-9.]+)", "i").exec(tag); return m ? Math.round(parseFloat(m[1])) : 0; };
  let w = num("width"), h = num("height"); const vb = /viewBox\s*=\s*["']\s*[-0-9.]+[\s,]+[-0-9.]+[\s,]+([0-9.]+)[\s,]+([0-9.]+)/i.exec(tag); if ((!w || !h) && vb) { w = Math.round(parseFloat(vb[1])); h = Math.round(parseFloat(vb[2])); }
  return { ok: true, mime: "image/svg+xml", width: w || undefined, height: h || undefined, transparent: true };
}
function json(b: Uint8Array, allowAny = true): AssetMeta {
  let j: any; try { j = JSON.parse(text(b)); } catch { return bad("isi_tidak_sesuai", "Isi file bukan JSON yang valid."); }
  if (j === null || typeof j !== "object") return bad("isi_tidak_sesuai", "JSON harus berupa objek atau larik.");
  const lottie = !Array.isArray(j) && Array.isArray(j.layers) && typeof j.fr === "number";
  return { ok: true, mime: "application/json", width: lottie && Number.isFinite(j.w) ? j.w : undefined, height: lottie && Number.isFinite(j.h) ? j.h : undefined, transparent: lottie };
}
function gltfSafe(g: any): AssetMeta | null {
  if (!g || typeof g !== "object" || g.asset?.version !== "2.0") return bad("isi_tidak_sesuai", "Bukan glTF 2.0 yang valid.");
  for (const k of ["buffers", "images"]) for (const x of Array.isArray(g[k]) ? g[k] : []) if (typeof x?.uri === "string" && !/^data:/i.test(x.uri)) return bad("referensi_luar", "Model merujuk file luar. Gunakan GLB tunggal (semua data di dalam satu file).");
  return null;
}
function glb(b: Uint8Array): AssetMeta {
  if (b.length < 20 || ascii(b, 0, 4) !== "glTF" || u32le(b, 4) !== 2) return bad("isi_tidak_sesuai", "Isi file bukan GLB 2.0 yang valid.");
  if (u32le(b, 8) !== b.length) return bad("isi_tidak_sesuai", "Ukuran GLB tidak konsisten (file rusak atau terpotong).");
  const cl = u32le(b, 12); if (ascii(b, 16, 4) !== "JSON" || 20 + cl > b.length) return bad("isi_tidak_sesuai", "Struktur GLB tidak valid.");
  let g: any; try { g = JSON.parse(text(b.slice(20, 20 + cl))); } catch { return bad("isi_tidak_sesuai", "Data GLB tidak valid."); }
  const e = gltfSafe(g); return e || { ok: true, mime: "model/gltf-binary" };
}
function gltf(b: Uint8Array): AssetMeta {
  let g: any; try { g = JSON.parse(text(b)); } catch { return bad("isi_tidak_sesuai", "Isi file bukan glTF yang valid."); }
  const e = gltfSafe(g); return e || { ok: true, mime: "model/gltf+json" };
}
function mp3(b: Uint8Array): AssetMeta { if (ascii(b, 0, 3) === "ID3") return { ok: true, mime: "audio/mpeg" }; for (let i = 0; i < Math.min(b.length - 1, 8192); i++) if (b[i] === 0xff && (b[i + 1] & 0xe0) === 0xe0) return { ok: true, mime: "audio/mpeg" }; return bad("isi_tidak_sesuai", "Isi file bukan MP3 yang valid."); }
function ogg(b: Uint8Array): AssetMeta { return ascii(b, 0, 4) === "OggS" ? { ok: true, mime: "audio/ogg" } : bad("isi_tidak_sesuai", "Isi file bukan OGG yang valid."); }
function wav(b: Uint8Array): AssetMeta { return b.length > 12 && ascii(b, 0, 4) === "RIFF" && ascii(b, 8, 4) === "WAVE" ? { ok: true, mime: "audio/wav" } : bad("isi_tidak_sesuai", "Isi file bukan WAV yang valid."); }
function hdr(b: Uint8Array): AssetMeta {
  const head = ascii(b, 0, Math.min(b.length, 256)); if (!/^#\?(RADIANCE|RGBE)/.test(head)) return bad("isi_tidak_sesuai", "Isi file bukan HDR (Radiance) yang valid.");
  const m = /[-+]Y\s+(\d+)\s+[-+]X\s+(\d+)/.exec(head); return { ok: true, mime: "image/vnd.radiance", height: m ? +m[1] : undefined, width: m ? +m[2] : undefined };
}
const V: Record<string, (b: Uint8Array) => AssetMeta> = { png, jpg: jpeg, jpeg, webp, gif, svg, json, glb, gltf, mp3, ogg, wav, hdr };
export const supportedExt = Object.keys(V);
export function validateAsset(bytes: Uint8Array, ext: string): AssetMeta {
  const f = V[ext]; if (!f) return bad("format_tidak_didukung", "Format file tidak didukung.");
  if (!bytes.length) return bad("isi_tidak_sesuai", "File kosong.");
  if (bytes.length > MAX_BYTES) return bad("ukuran_melebihi_batas", "File terlalu besar.");
  return f(bytes);
}

// ---------------------------------------------------------------- handler
export interface AssetDeps {
  env: { allowedOrigins: string[]; publicBase: string };
  getUser(token: string): Promise<{ id: string } | null>;
  download(path: string): Promise<Uint8Array | null>;
  remove(path: string): Promise<void>;
  rpc(name: string, args: Record<string, unknown>): Promise<{ data: any; error: { message: string } | null }>;
}
const R = (req: Request, d: AssetDeps, s: number, b: unknown) => new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...cors(req, d.env as any) } });
const PATH = /^(incoming|generated)\/[A-Za-z0-9._\/-]{3,200}$/;
const CLEAN_ON_FAIL = new Set(["isi_tidak_sesuai", "svg_tidak_aman", "referensi_luar", "dimensi_tidak_valid", "ukuran_melebihi_batas", "format_tidak_didukung", "mime_tidak_sesuai", "ukuran_tidak_cocok", "duplikat", "kategori_tidak_valid", "paket_tidak_kompatibel", "paket_tidak_valid", "attrs_tidak_valid"]);
const MSG: Record<string, string> = { duplikat: "File yang sama sudah ada di Asset Library. Gunakan aset yang sudah ada.", format_tidak_didukung: "Format file tidak diizinkan untuk kategori ini.", kategori_tidak_valid: "Kategori tidak valid.", paket_tidak_kompatibel: "Format file tidak kompatibel dengan salah satu paket yang dipilih.", ukuran_melebihi_batas: "Ukuran file melebihi batas kategori.", file_tidak_ditemukan: "File belum selesai diunggah. Coba lagi.", mime_tidak_sesuai: "Jenis file tidak sesuai dengan ekstensinya.", path_tidak_valid: "Lokasi file tidak valid.", attrs_tidak_valid: "Isian khusus tidak valid." };

export async function handleAssetRegister(req: Request, d: AssetDeps): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(req, d.env as any) });
  if (req.method !== "POST") return R(req, d, 405, { error: "metode_tidak_didukung" });
  const m = /^Bearer\s+(.+)$/i.exec(req.headers.get("authorization") || ""); const token = m ? m[1] : "";
  const u = token ? await d.getUser(token) : null; if (!u) return R(req, d, 401, { error: "perlu_login", message: "Silakan masuk terlebih dahulu." });
  let b: any; try { b = await req.json(); } catch { return R(req, d, 400, { error: "permintaan_tidak_valid" }); }
  const path = String(b?.path || ""); if (!PATH.test(path) || path.includes("..")) return R(req, d, 400, { error: "path_tidak_valid", message: MSG.path_tidak_valid });
  const ext = (path.split(".").pop() || "").toLowerCase(); if (!V[ext]) return R(req, d, 400, { error: "format_tidak_didukung", message: MSG.format_tidak_didukung });
  // izin dicek dulu (tanpa membaca file) agar pengguna tanpa izin tidak bisa memicu pengunduhan
  const perm = await d.rpc("has_perm_user", { uid: u.id, p: "templates.write" }); if (perm.error || perm.data !== true) return R(req, d, 403, { error: "forbidden", message: "Anda tidak punya izin mengelola asset." });
  const bytes = await d.download(path); if (!bytes) return R(req, d, 404, { error: "file_tidak_ditemukan", message: MSG.file_tidak_ditemukan });
  const v = validateAsset(bytes, ext);
  if (!v.ok) { await d.remove(path); return R(req, d, 422, { error: v.error, message: v.message }); }
  const sum = await sha256hex(bytes), thumb = ["png", "jpg", "jpeg", "webp", "gif", "svg"].includes(ext) ? d.env.publicBase + path : "";
  const meta = { file_type: ext, mime: v.mime, size: bytes.length, width: v.width ?? null, height: v.height ?? null, is_transparent: !!v.transparent, checksum: sum, thumbnail_url: thumb, public_base: d.env.publicBase, attrs: b.attrs && typeof b.attrs === "object" && !Array.isArray(b.attrs) ? b.attrs : (b.attrs == null ? {} : "__invalid") };
  const r = await d.rpc("admin_register_asset", { p_user: u.id, p_path: path, p_name: String(b.name || "").slice(0, 120), p_description: b.description ? String(b.description).slice(0, 500) : null, p_category: b.category_id, p_packages: Array.isArray(b.package_types) ? b.package_types : [], p_theme: b.theme_key || null, p_tags: Array.isArray(b.tags) ? b.tags.map(String).slice(0, 20) : [], p_meta: meta });
  if (r.error) return R(req, d, /forbidden/.test(r.error.message) ? 403 : 500, { error: /forbidden/.test(r.error.message) ? "forbidden" : "server", message: "Gagal mendaftarkan asset." });
  const x = r.data || {};
  if (!x.ok) { if (CLEAN_ON_FAIL.has(x.error)) await d.remove(path); return R(req, d, x.error === "duplikat" ? 409 : 422, { error: x.error, id: x.id, name: x.name, message: MSG[x.error] || "Asset tidak dapat didaftarkan." }); }
  return R(req, d, 200, { ok: true, asset: x.asset });
}
