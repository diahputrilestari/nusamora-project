// Rate limiting server-side untuk Edge Function. Penghitung ada di Postgres (public.rl_hit, hanya service_role),
// sehingga berlaku konsisten walau fungsi berjalan di banyak instance. Kunci di-hash (SHA-256 + RATE_LIMIT_SALT):
// IP/ID pengguna mentah tidak disimpan. Gagal-buka: bila database tidak terjangkau, permintaan tetap dilayani
// (ketersediaan pembayaran lebih penting) dan kegagalan dicatat ke log fungsi.
type Rpc = { rpc(name: string, args: Record<string, unknown>): Promise<{ data: any; error: { message: string } | null }> };

export function clientIp(req: Request): string {
  // Edge Supabase berada di belakang proxy Cloudflare: cf-connecting-ip lebih tepercaya daripada X-Forwarded-For buatan klien.
  const cf = req.headers.get("cf-connecting-ip"); if (cf) return cf.trim();
  const xf = req.headers.get("x-forwarded-for"); if (xf) return xf.split(",")[0]!.trim();
  return "unknown";
}
async function hashKey(scope: string, subject: string): Promise<string> {
  const salt = (globalThis as any).Deno?.env?.get?.("RATE_LIMIT_SALT") || "";
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${salt}|${scope}|${subject}`));
  return scope + ":" + Array.from(new Uint8Array(b)).slice(0, 16).map((x) => x.toString(16).padStart(2, "0")).join("");
}
/** Mengembalikan detik tunggu bila diblokir, atau null bila boleh lanjut. */
export async function rateCheck(d: Rpc, scope: string, subject: string, limit: number, windowSecs: number): Promise<number | null> {
  try {
    const r = await d.rpc("rl_hit", { p_key: await hashKey(scope, subject), p_limit: limit, p_window_secs: windowSecs, p_kind: "rate_limited:" + scope });
    if (r.error || !r.data) { console.warn("rate_limit_error", scope, r.error?.message); return null; }
    return r.data.allowed === false ? Math.max(1, Number(r.data.retry_after) || windowSecs) : null;
  } catch (e) { console.warn("rate_limit_exception", scope, String((e as Error)?.message || e).slice(0, 120)); return null; }
}
export function tooMany(req: Request, allowedOrigins: string[], retryAfter: number): Response {
  const o = req.headers.get("origin") || "";
  const h: Record<string, string> = { "Content-Type": "application/json", "Cache-Control": "no-store", "Retry-After": String(retryAfter), "Vary": "Origin" };
  if (allowedOrigins.includes(o)) h["Access-Control-Allow-Origin"] = o;
  return new Response(JSON.stringify({ error: "terlalu_banyak_permintaan", retry_after: retryAfter,
    message: `Terlalu banyak permintaan. Coba lagi dalam ${retryAfter < 90 ? retryAfter + " detik" : Math.ceil(retryAfter / 60) + " menit"}.` }), { status: 429, headers: h });
}
export async function logSecurityEvent(d: Rpc, kind: string, actor: string, detail: Record<string, unknown> = {}): Promise<void> {
  try { await d.rpc("log_security_event", { p_kind: kind, p_actor: actor, p_detail: detail }); } catch { /* jangan ganggu respons */ }
}
