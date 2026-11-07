import { clientIp, logSecurityEvent, rateCheck, tooMany } from "./ratelimit.ts";
// Logika Midtrans yang tidak bergantung pada runtime (Deno/Node), supaya bisa diuji. Server Key hanya datang dari env backend.
export interface Env { serverKey: string; signatureKey?: string; isProd: boolean; allowedOrigins: string[] }
export interface Deps {
  env: Env;
  fetch: typeof fetch;
  getUser(token: string): Promise<{ id: string } | null>;
  ownsOrder(token: string, orderId: string): Promise<{ status: string } | null>;   // dibaca dengan JWT pelanggan (RLS)
  rpc(name: string, args: Record<string, unknown>): Promise<{ data: any; error: { message: string } | null }>;
}
const PLANS = ["essential", "signature", "luxe"];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ORDER = /^[A-Za-z0-9_-]{6,50}$/;

export const snapBase = (prod: boolean) => prod ? "https://app.midtrans.com" : "https://app.sandbox.midtrans.com";
export const apiBase = (prod: boolean) => prod ? "https://api.midtrans.com" : "https://api.sandbox.midtrans.com";
const auth = (k: string) => "Basic " + btoa(k + ":");

export async function sha512hex(s: string): Promise<string> {
  const b = await crypto.subtle.digest("SHA-512", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(b)).map((x) => x.toString(16).padStart(2, "0")).join("");
}
function safeEq(a: string, b: string): boolean { if (a.length !== b.length) return false; let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i); return r === 0; }
export async function signatureValid(n: any, serverKey: string): Promise<boolean> {
  if (!n || typeof n.signature_key !== "string") return false;
  const exp = await sha512hex(String(n.order_id) + String(n.status_code) + String(n.gross_amount) + serverKey);
  return safeEq(exp, n.signature_key.toLowerCase());
}

export function cors(req: Request, env: Env): Record<string, string> {
  const o = req.headers.get("origin") || "";
  const h: Record<string, string> = { "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info", "Access-Control-Allow-Methods": "POST, OPTIONS", "Vary": "Origin" };
  if (env.allowedOrigins.includes(o)) h["Access-Control-Allow-Origin"] = o;
  return h;
}
function json(req: Request, env: Env, status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...cors(req, env) } });
}
function bearer(req: Request): string | null { const m = /^Bearer\s+(.+)$/i.exec(req.headers.get("authorization") || ""); return m ? m[1] : null; }
function finishOrigin(req: Request, env: Env): string | null { const o = req.headers.get("origin") || ""; return env.allowedOrigins.includes(o) ? o : (env.allowedOrigins[0] || null); }

const MSG: Record<string, [number, string]> = {
  tidak_ditemukan: [404, "Undangan tidak ditemukan."], akun_ditangguhkan: [403, "Akun Anda sedang ditangguhkan."],
  sudah_aktif: [409, "Undangan ini sudah dipublikasikan dan masih aktif."], tidak_dapat_dipublikasi: [409, "Undangan ini tidak dapat dipublikasikan."],
  paket_tidak_valid: [400, "Paket tidak tersedia."], harga_tidak_valid: [400, "Harga paket tidak valid."], data_belum_lengkap: [422, "Data undangan belum lengkap."],
};

async function midtransStatus(orderId: string, d: Deps): Promise<{ ok: boolean; notFound?: boolean; data?: any }> {
  const r = await d.fetch(`${apiBase(d.env.isProd)}/v2/${encodeURIComponent(orderId)}/status`, { headers: { Accept: "application/json", Authorization: auth(d.env.serverKey) } });
  if (r.status >= 500) throw new Error("midtrans_5xx");
  let j: any = null; try { j = await r.json(); } catch { /* kosong */ }
  if (j && String(j.status_code) === "404") return { ok: false, notFound: true };
  if (!r.ok || !j) return { ok: false };
  return { ok: true, data: j };
}
const slim = (j: any) => ({ order_id: j.order_id, transaction_status: j.transaction_status, status_code: j.status_code, gross_amount: j.gross_amount, payment_type: j.payment_type, transaction_id: j.transaction_id, fraud_status: j.fraud_status, transaction_time: j.transaction_time });
async function applyFromMidtrans(j: any, source: "webhook" | "sync", d: Deps) {
  return d.rpc("apply_payment", { p_order: j.order_id, p_tx_status: j.transaction_status, p_fraud: j.fraud_status ?? null, p_payment_type: j.payment_type ?? null, p_tx_id: j.transaction_id ?? null,
    p_gross: j.gross_amount != null ? String(j.gross_amount) : null, p_status_code: j.status_code != null ? String(j.status_code) : null, p_source: source, p_payload: slim(j) });
}

/* ---------------- POST /midtrans-checkout ---------------- */
export async function handleCheckout(req: Request, d: Deps): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(req, d.env) });
  if (req.method !== "POST") return json(req, d.env, 405, { error: "metode_tidak_didukung" });
  if (!d.env.serverKey) return json(req, d.env, 500, { error: "konfigurasi", message: "Pembayaran belum dikonfigurasi di server." });
  // batas longgar per IP (kantor/WiFi bersama tetap aman) sebelum memanggil Auth; batas ketat per pengguna sesudahnya
  { const w = await rateCheck(d, "checkout-ip", clientIp(req), 120, 600); if (w) return tooMany(req, d.env.allowedOrigins, w); }
  const token = bearer(req); const user = token ? await d.getUser(token) : null;
  if (!token || !user) return json(req, d.env, 401, { error: "unauthorized", message: "Sesi berakhir. Silakan masuk kembali." });
  { const w = await rateCheck(d, "checkout-user", user.id, 20, 600); if (w) return tooMany(req, d.env.allowedOrigins, w); }
  let b: any; try { b = await req.json(); } catch { return json(req, d.env, 400, { error: "permintaan_tidak_valid" }); }

  if (b.action === "cancel") {
    if (typeof b.order_id !== "string" || !ORDER.test(b.order_id)) return json(req, d.env, 400, { error: "permintaan_tidak_valid" });
    const own = await d.ownsOrder(token, b.order_id);
    if (!own) return json(req, d.env, 404, { error: "tidak_ditemukan", message: "Pembayaran tidak ditemukan." });
    if (own.status !== "pending") return json(req, d.env, 200, { ok: true, status: own.status });
    try {
      const st = await midtransStatus(b.order_id, d);
      if (st.ok && ["settlement", "capture"].includes(st.data.transaction_status)) { await applyFromMidtrans(st.data, "sync", d); return json(req, d.env, 200, { ok: true, status: "paid" }); }
      if (st.ok) await d.fetch(`${apiBase(d.env.isProd)}/v2/${encodeURIComponent(b.order_id)}/cancel`, { method: "POST", headers: { Accept: "application/json", Authorization: auth(d.env.serverKey) } });
    } catch { return json(req, d.env, 502, { error: "midtrans", message: "Tidak dapat menghubungi Midtrans. Coba lagi sebentar." }); }
    const r = await d.rpc("apply_payment", { p_order: b.order_id, p_tx_status: "cancel", p_fraud: null, p_payment_type: null, p_tx_id: null, p_gross: null, p_status_code: "user", p_source: "user", p_payload: { by: "user" } });
    return json(req, d.env, 200, { ok: true, status: r.data?.status || "cancelled" });
  }

  if (typeof b.invitation_id !== "string" || !UUID.test(b.invitation_id) || !PLANS.includes(b.plan_id)) return json(req, d.env, 400, { error: "permintaan_tidak_valid", message: "Permintaan tidak valid." });
  const origin = finishOrigin(req, d.env);
  if (!origin) return json(req, d.env, 500, { error: "konfigurasi", message: "ALLOWED_ORIGINS belum diisi di server." });

  // harga, validasi data wajib, dan pencegahan transaksi ganda ditentukan database; nilai harga TIDAK diterima dari klien
  const prep = await d.rpc("prepare_checkout", { p_user: user.id, p_invitation: b.invitation_id, p_plan: b.plan_id });
  if (prep.error) return json(req, d.env, 500, { error: "server", message: "Terjadi kendala. Coba lagi." });
  const p = prep.data;
  if (!p?.ok) { const m = MSG[p?.error] || [400, "Permintaan ditolak."]; return json(req, d.env, m[0], { error: p?.error, message: m[1], missing: p?.missing }); }
  if (p.reuse && p.redirect_url) return json(req, d.env, 200, { ok: true, reuse: true, order_id: p.order_id, redirect_url: p.redirect_url, amount: p.amount, plan_id: p.plan_id });

  if (p.cancel_order) { try { await d.fetch(`${apiBase(d.env.isProd)}/v2/${encodeURIComponent(p.cancel_order)}/cancel`, { method: "POST", headers: { Accept: "application/json", Authorization: auth(d.env.serverKey) } }); } catch { /* paket lama tetap kedaluwarsa sendiri */ } }

  try {
    const r = await d.fetch(`${snapBase(d.env.isProd)}/snap/v1/transactions`, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json", Authorization: auth(d.env.serverKey) },
      body: JSON.stringify({
        transaction_details: { order_id: p.order_id, gross_amount: p.amount },
        item_details: [{ id: p.plan_id, price: p.amount, quantity: 1, name: `NusaMora ${p.plan_name} (${p.duration_days} hari)`.slice(0, 50) }],
        customer_details: { first_name: String(p.name || "Pelanggan").slice(0, 50), email: p.email },
        callbacks: { finish: `${origin}/pembayaran?order_id=${encodeURIComponent(p.order_id)}` },
        expiry: { unit: "hours", duration: 24 },
      }) });
    const j: any = await r.json().catch(() => null);
    if (!r.ok || !j?.token || !j?.redirect_url) throw new Error("snap_gagal");
    await d.rpc("payment_set_snap", { p_order: p.order_id, p_token: j.token, p_url: j.redirect_url });
    return json(req, d.env, 200, { ok: true, reuse: false, order_id: p.order_id, redirect_url: j.redirect_url, amount: p.amount, plan_id: p.plan_id });
  } catch {
    await d.rpc("payment_abort", { p_order: p.order_id });     // undangan kembali ke draft agar bisa dicoba lagi tanpa membuat undangan baru
    return json(req, d.env, 502, { error: "midtrans", message: "Gagal membuat transaksi pembayaran. Silakan coba lagi." });
  }
}

/* ---------------- POST /midtrans-sync (pelanggan menanyakan status; selalu diverifikasi ke Midtrans) ---------------- */
export async function handleSync(req: Request, d: Deps): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(req, d.env) });
  if (req.method !== "POST") return json(req, d.env, 405, { error: "metode_tidak_didukung" });
  const token = bearer(req); const user = token ? await d.getUser(token) : null;
  if (!token || !user) return json(req, d.env, 401, { error: "unauthorized" });
  { const w = await rateCheck(d, "sync-user", user.id, 30, 600); if (w) return tooMany(req, d.env.allowedOrigins, w); }
  let b: any; try { b = await req.json(); } catch { return json(req, d.env, 400, { error: "permintaan_tidak_valid" }); }
  if (typeof b.order_id !== "string" || !ORDER.test(b.order_id)) return json(req, d.env, 400, { error: "permintaan_tidak_valid" });
  const own = await d.ownsOrder(token, b.order_id);
  if (!own) return json(req, d.env, 404, { error: "tidak_ditemukan" });
  if (own.status !== "pending") return json(req, d.env, 200, { ok: true, status: own.status });
  try {
    const st = await midtransStatus(b.order_id, d);
    if (!st.ok) return json(req, d.env, 200, { ok: true, status: "pending", verified: false });     // belum ada transaksi di Midtrans
    const r = await applyFromMidtrans(st.data, "sync", d);
    if (r.error) return json(req, d.env, 500, { error: "server" });
    return json(req, d.env, 200, { ok: true, result: r.data?.result, status: r.data?.status, verified: true });
  } catch { return json(req, d.env, 502, { error: "midtrans" }); }
}

/* ---------------- POST /midtrans-webhook (notifikasi server-ke-server dari Midtrans) ---------------- */
// Pembungkus: mencatat jejak aman setiap webhook yang masuk (status balasan + hasil), tanpa signature/kunci/data kartu.
export async function handleWebhook(req: Request, d: Deps): Promise<Response> {
  let meta: Record<string, unknown> = { m: req.method, ua: (req.headers.get("user-agent") || "").slice(0, 60), ct: (req.headers.get("content-type") || "").slice(0, 40) };
  try { const n = await req.clone().json(); meta = { ...meta, order: typeof n?.order_id === "string" ? n.order_id.slice(0, 40) : null, tx: n?.transaction_status ?? null, sc: n?.status_code ?? null }; } catch { /* abaikan */ }
  let res: Response;
  try { res = await handleWebhookInner(req, d); } catch (e) { await logSecurityEvent(d, "webhook_trace", "webhook", { ...meta, http: 500, err: "exception" }); throw e; }
  let result: unknown = null; try { const j = await res.clone().json(); result = j?.result ?? j?.error ?? j?.status ?? null; } catch { /* abaikan */ }
  // 401 sudah tercatat (dibatasi) sebagai webhook_bad_signature; sisanya dicatat. SEMENTARA untuk diagnosis staging: batasi/hapus sebelum produksi.
  if (res.status !== 401) await logSecurityEvent(d, "webhook_trace", "webhook", { ...meta, http: res.status, result });
  return res;
}
async function handleWebhookInner(req: Request, d: Deps): Promise<Response> {
  const R = (s: number, b: unknown) => new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json" } });
  if (req.method !== "POST") return R(405, { error: "metode_tidak_didukung" });
  if (!d.env.serverKey) return R(500, { error: "konfigurasi" });
  let n: any; try { n = await req.json(); } catch { return R(400, { error: "permintaan_tidak_valid" }); }
  const orderOk = !!n && typeof n.order_id === "string" && ORDER.test(n.order_id);
  // signature dicek dengan Server Key; bila akun Midtrans memakai Signature Secret Key terpisah, kunci itu juga diterima (opsional)
  let sigOk = false;
  if (orderOk) { for (const k of [d.env.serverKey, d.env.signatureKey || ""]) { if (k && await signatureValid(n, k)) { sigOk = true; break; } } }
  if (!orderOk || !sigOk) {
    // diagnostik aman: tanpa Server Key dan tanpa signature
    try { console.log("webhook_ditolak", JSON.stringify({ orderOk, hasSig: typeof n?.signature_key === "string", sigLen: typeof n?.signature_key === "string" ? n.signature_key.length : 0, status_code: n?.status_code, gross_amount: n?.gross_amount, gross_type: typeof n?.gross_amount, keyEndsWithSpace: /\s$/.test(d.env.serverKey), hasSigKeyEnv: !!d.env.signatureKey, tx_status: n?.transaction_status })); } catch { /* abaikan */ }
    // kejadian mencurigakan: dicatat (tanpa signature/Server Key) dan dibatasi agar log tidak dibanjiri
    { const w = await rateCheck(d, "webhook-bad", clientIp(req), 5, 600); if (w === null) await logSecurityEvent(d, "webhook_bad_signature", "webhook", { orderOk, hasSig: typeof n?.signature_key === "string" }); }
    return R(401, { error: "signature_tidak_valid" });
  }
  try {
    // jangan percaya isi notifikasi: ambil status resmi dari Midtrans, lalu terapkan
    const st = await midtransStatus(n.order_id, d);
    // order NusaMora (awalan NM) yang belum terbaca di API status = jeda sesaat setelah pembayaran: balas 503 agar Midtrans mengirim ulang.
    // order lain (bukan milik kita) tetap dibalas 200 supaya tidak dikirim ulang terus.
    if (st.notFound) return n.order_id.startsWith("NM") ? R(503, { error: "status_belum_tersedia" }) : R(200, { result: "order_tidak_ditemukan" });
    if (!st.ok || st.data.order_id !== n.order_id) return R(500, { error: "verifikasi_gagal" });      // 5xx: Midtrans akan mengirim ulang
    const r = await applyFromMidtrans(st.data, "webhook", d);
    if (r.error) return R(500, { error: "server" });
    return R(200, r.data);
  } catch { return R(500, { error: "verifikasi_gagal" }); }
}
