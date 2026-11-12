// Ganti password ADMIN dengan kebijakan lebih kuat daripada pelanggan (pelanggan: min. 8 karakter, huruf+angka).
// Dijalankan server-side supaya kebijakan tidak bisa dilewati dari browser; mencatat password_policy_at untuk penegakan DB.
import { rateCheck, tooMany, logSecurityEvent } from "./ratelimit.ts";
import { jwtAal } from "./jwt.ts";
export { jwtAal };

const COMMON = ["password", "passw0rd", "qwerty", "123456", "12345678", "admin", "letmein", "welcome", "iloveyou", "abc123", "nusamora"];
export function passwordPolicy(pw: string, email = ""): { ok: boolean; problems: string[] } {
  const p: string[] = [];
  if (pw.length < 12) p.push("Minimal 12 karakter.");
  if (pw.length > 72) p.push("Maksimal 72 karakter.");
  const classes = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((r) => r.test(pw)).length;
  if (classes < 3) p.push("Gabungkan minimal 3 jenis: huruf kecil, huruf besar, angka, simbol.");
  const local = email.split("@")[0]!.toLowerCase();
  if (local.length >= 4 && pw.toLowerCase().includes(local)) p.push("Jangan memuat bagian depan email Anda.");
  const low = pw.toLowerCase();
  if (COMMON.some((c) => low.includes(c))) p.push("Jangan memuat kata umum atau nama layanan (mis. password, admin, nusamora).");
  if (/(.)\1{3,}/.test(pw)) p.push("Hindari karakter yang sama berulang 4 kali atau lebih.");
  return { ok: p.length === 0, problems: p };
}

export interface AdminPwDeps {
  env: { allowedOrigins: string[] };
  getUser(token: string): Promise<{ id: string; email?: string | null; aal?: string | null } | null>;
  setPassword(uid: string, password: string): Promise<boolean>;
  rpc(name: string, args: Record<string, unknown>): Promise<{ data: any; error: { message: string } | null }>;
}
function cors(req: Request, d: AdminPwDeps): Record<string, string> {
  const o = req.headers.get("origin") || ""; const h: Record<string, string> = { "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info", "Access-Control-Allow-Methods": "POST, OPTIONS", "Vary": "Origin" };
  if (d.env.allowedOrigins.includes(o)) h["Access-Control-Allow-Origin"] = o; return h;
}
const R = (req: Request, d: AdminPwDeps, s: number, b: unknown) => new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...cors(req, d) } });

export async function handleAdminPassword(req: Request, d: AdminPwDeps): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(req, d) });
  if (req.method !== "POST") return R(req, d, 405, { error: "metode_tidak_didukung" });
  const m = /^Bearer\s+(.+)$/i.exec(req.headers.get("authorization") || ""); const token = m ? m[1]! : "";
  const u = token ? await d.getUser(token) : null; if (!u) return R(req, d, 401, { error: "perlu_login", message: "Silakan masuk terlebih dahulu." });
  { const w = await rateCheck(d, "admin-password-user", u.id, 5, 600); if (w) return tooMany(req, d.env.allowedOrigins, w); }
  const ok = await d.rpc("is_admin_for_password", { uid: u.id, aal: u.aal ?? null });
  if (ok.error || ok.data !== true) return R(req, d, 403, { error: "forbidden", message: "Hanya admin dengan verifikasi MFA yang dapat mengganti password di sini." });
  let b: any; try { b = await req.json(); } catch { return R(req, d, 400, { error: "permintaan_tidak_valid" }); }
  const pw = typeof b?.new_password === "string" ? b.new_password : "";
  const pol = passwordPolicy(pw, u.email || "");
  if (!pol.ok) return R(req, d, 422, { error: "password_lemah", message: pol.problems.join(" "), problems: pol.problems });
  if (!(await d.setPassword(u.id, pw))) return R(req, d, 502, { error: "gagal_ubah_password", message: "Password belum dapat diubah. Coba lagi." });
  const mark = await d.rpc("admin_mark_password_ok", { uid: u.id });
  if (mark.error) return R(req, d, 500, { error: "gagal_mencatat", message: "Password berubah tetapi pencatatan kebijakan gagal. Hubungi super admin." });
  await logSecurityEvent(d, "admin_password_changed", u.id, {});   // tidak pernah memuat password
  return R(req, d, 200, { ok: true });
}
