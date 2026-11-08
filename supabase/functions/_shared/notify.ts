// Pengirim notifikasi (email via Resend, WhatsApp via Fonnte) + penerima callback pengiriman.
// Kunci provider hanya dibaca dari Secrets Edge Function; tidak pernah disimpan di database atau repo.
// Status "terkirim" tidak pernah dipasang di sini: panggilan API yang diterima provider dicatat sebagai "sent";
// "delivered" hanya datang dari callback provider (handleNotifyWebhook -> notif_delivery).
import { rateCheck, tooMany, logSecurityEvent } from "./ratelimit.ts";

export interface NotifyEnv { allowedOrigins: string[]; dispatchSecret?: string; resendKey?: string; waToken?: string; webhookSecret?: string }
export interface NotifyDeps {
  env: NotifyEnv;
  getUser(token: string): Promise<{ id: string } | null>;
  rpc(name: string, args: Record<string, unknown>): Promise<{ data: any; error: { message: string } | null }>;
  fetch(url: string, init: RequestInit): Promise<Response>;
  /** Opsional: menerjemahkan nama host ke alamat IP (dipakai menolak webhook ke jaringan privat). */
  resolveHost?(host: string): Promise<string[]>;
  now?: () => number;
}
type Row = { id: string; channel: "email" | "whatsapp"; to_address: string | null; subject: string | null; body: string };
export type SendResult = { ok: true; messageId: string } | { ok: false; error: string; http: number; permanent: boolean };

function cors(req: Request, d: NotifyDeps): Record<string, string> {
  const o = req.headers.get("origin") || "";
  const h: Record<string, string> = { "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info", "Access-Control-Allow-Methods": "POST, OPTIONS", "Vary": "Origin" };
  if (d.env.allowedOrigins.includes(o)) h["Access-Control-Allow-Origin"] = o; return h;
}
const R = (req: Request, d: NotifyDeps, s: number, b: unknown) => new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...cors(req, d) } });

function safeEq(a: string, b: string): boolean {
  if (a.length !== b.length || a.length === 0) return false;
  let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i); return r === 0;
}
export const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
export const toHtml = (text: string) => `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:#222">${esc(text).replace(/\r?\n/g, "<br>")}</div>`;
const oneLine = (s: string) => s.replace(/[\r\n]+/g, " ").trim();
const asStr = (v: any) => (typeof v === "string" ? v : "");

export async function sendEmail(d: NotifyDeps, r: Row, cfg: { name: string; address: string; replyTo: string }): Promise<SendResult> {
  const from = cfg.name ? `${oneLine(cfg.name).replace(/[<>"]/g, "")} <${cfg.address}>` : cfg.address;
  const payload: Record<string, unknown> = { from, to: [r.to_address], subject: oneLine(r.subject || "(tanpa subjek)"), text: r.body, html: toHtml(r.body) };
  if (cfg.replyTo) payload.reply_to = cfg.replyTo;
  let res: Response;
  try { res = await d.fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${d.env.resendKey}`, "Content-Type": "application/json" }, body: JSON.stringify(payload) }); }
  catch (e) { return { ok: false, error: "Jaringan: " + String((e as Error)?.message || e).slice(0, 150), http: 0, permanent: false }; }
  let j: any = null; try { j = await res.json(); } catch { /* bukan JSON */ }
  if (res.status >= 200 && res.status < 300 && j && typeof j.id === "string") return { ok: true, messageId: j.id };
  const msg = asStr(j?.message) || asStr(j?.error) || `HTTP ${res.status}`;
  return { ok: false, error: msg.slice(0, 300), http: res.status, permanent: res.status >= 400 && res.status < 500 && res.status !== 429 && res.status !== 408 && res.status !== 401 && res.status !== 403 };
}

export async function sendWhatsApp(d: NotifyDeps, r: Row): Promise<SendResult> {
  let res: Response;
  try { res = await d.fetch("https://api.fonnte.com/send", { method: "POST", headers: { Authorization: d.env.waToken! }, body: new URLSearchParams({ target: r.to_address || "", message: r.body, countryCode: "62" }) }); }
  catch (e) { return { ok: false, error: "Jaringan: " + String((e as Error)?.message || e).slice(0, 150), http: 0, permanent: false }; }
  let j: any = null; try { j = await res.json(); } catch { /* bukan JSON */ }
  const id = Array.isArray(j?.id) ? j.id[0] : j?.id;
  if (res.status >= 200 && res.status < 300 && j?.status === true && id != null && String(id) !== "") return { ok: true, messageId: String(id) };
  const reason = asStr(j?.reason) || asStr(j?.detail) || `HTTP ${res.status}`;
  return { ok: false, error: reason.slice(0, 300), http: res.status, permanent: /nomor|number|target|invalid number|not valid|tidak valid/i.test(reason) && !/token/i.test(reason) };
}

export async function authorize(req: Request, d: NotifyDeps, perm: string): Promise<{ actor: string } | Response> {
  const sec = req.headers.get("x-dispatch-secret") || "";
  if (sec) return d.env.dispatchSecret && safeEq(sec, d.env.dispatchSecret) ? { actor: "scheduler" } : R(req, d, 401, { error: "rahasia_salah" });
  const m = /^Bearer\s+(.+)$/i.exec(req.headers.get("authorization") || ""); const token = m ? m[1]! : "";
  const u = token ? await d.getUser(token) : null; if (!u) return R(req, d, 401, { error: "perlu_login", message: "Silakan masuk terlebih dahulu." });
  const ok = await d.rpc("notif_is_admin", { p_uid: u.id, p_perm: perm });
  if (ok.error || ok.data !== true) return R(req, d, 403, { error: "forbidden", message: "Anda tidak berhak mengelola notifikasi." });
  { const w = await rateCheck(d, "notify-dispatch-user", u.id, 12, 60); if (w) return tooMany(req, d.env.allowedOrigins, w); }
  return { actor: u.id };
}


// ---- Webhook keluar. "delivered" = penerima menjawab 2xx. Tanda tangan: HMAC-SHA256 atas `${timestamp}.${body}`.
type WhRow = { id: string; endpoint_id: string; event: string; payload: unknown; url: string; secret: string; attempts: number; created_at: string };
export function isPrivateIp(ip: string): boolean {
  const x = ip.trim().toLowerCase();
  const m4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(x);
  if (m4) { const [a, b] = [Number(m4[1]), Number(m4[2])]; return a === 0 || a === 10 || a === 127 || a >= 224 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || (a === 192 && b === 0); }
  if (x.includes(":")) { const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(x); if (mapped) return isPrivateIp(mapped[1]!); return x === "::" || x === "::1" || /^f[cd]/.test(x) || /^fe[89ab]/.test(x); }
  return true; // bukan IP yang dikenal: anggap tidak aman
}
export function webhookHostBlocked(host: string): boolean {
  const h = host.toLowerCase();
  return !h.includes(".") || h === "localhost" || /^[0-9.]+$/.test(h) || h.includes(":") || h.includes("[") || /\.(local|localhost|internal|lan|home|test|invalid|example|onion)$/.test(h);
}
async function hmacHex(secret: string, msg: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return Array.from(new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(msg)))).map((b) => b.toString(16).padStart(2, "0")).join("");
}
export async function sendWebhook(d: NotifyDeps, r: WhRow): Promise<{ ok: boolean; http: number; error: string; permanent: boolean; ms: number }> {
  const t0 = (d.now ?? Date.now)(); const bad = (error: string, permanent: boolean, http = 0) => ({ ok: false, http, error, permanent, ms: (d.now ?? Date.now)() - t0 });
  let u: URL; try { u = new URL(r.url); } catch { return bad("URL tidak valid", true); }
  if (u.protocol !== "https:" || (u.port && u.port !== "443") || u.username || u.password || webhookHostBlocked(u.hostname)) return bad("URL tujuan tidak diizinkan", true);
  if (d.resolveHost) {
    let ips: string[]; try { ips = await d.resolveHost(u.hostname); } catch { return bad("DNS tujuan tidak ditemukan", false); }
    if (!ips.length) return bad("DNS tujuan tidak ditemukan", false);
    if (ips.some(isPrivateIp)) return bad("Tujuan mengarah ke alamat jaringan privat", true);
  }
  const body = JSON.stringify({ id: r.id, event: r.event, created_at: r.created_at, data: r.payload });
  const ts = String(Math.floor((d.now ?? Date.now)() / 1000)); const sig = await hmacHex(r.secret, `${ts}.${body}`);
  const ac = new AbortController(); const to = setTimeout(() => ac.abort(), 8000);
  try {
    const res = await d.fetch(u.toString(), { method: "POST", redirect: "manual", signal: ac.signal, body,
      headers: { "Content-Type": "application/json", "User-Agent": "NusaMora-Webhook/1", "X-NusaMora-Event": r.event, "X-NusaMora-Delivery": r.id, "X-NusaMora-Timestamp": ts, "X-NusaMora-Signature": "sha256=" + sig } });
    const ms = (d.now ?? Date.now)() - t0;
    if (res.status >= 200 && res.status < 300) return { ok: true, http: res.status, error: "", permanent: false, ms };
    if (res.status >= 300 && res.status < 400) return bad("Penerima mengalihkan (redirect) dan tidak diikuti", true, res.status);
    return bad(`Penerima menjawab HTTP ${res.status}`, res.status >= 400 && res.status < 500 && res.status !== 408 && res.status !== 429, res.status);
  } catch (e) { return bad("Jaringan: " + String((e as Error)?.name === "AbortError" ? "timeout 8 detik" : (e as Error)?.message || e).slice(0, 150), false); }
  finally { clearTimeout(to); }
}
async function runWebhooks(d: NotifyDeps, out: Record<string, unknown>, t0: number): Promise<void> {
  const w = { claimed: 0, delivered: 0, retry: 0, failed: 0 }; out.webhooks = w;
  for (let round = 0; round < 5 && (d.now ?? Date.now)() - t0 < 20000; round++) {
    const c = await d.rpc("webhook_claim", { p_limit: 20 }); if (c.error) { out.webhook_error = c.error.message; return; }
    const rows: WhRow[] = c.data || []; if (!rows.length) return; w.claimed += rows.length;
    for (let i = 0; i < rows.length; i += 5) await Promise.all(rows.slice(i, i + 5).map(async (r) => {
      const res = await sendWebhook(d, r);
      const st = await d.rpc("webhook_result", { p_id: r.id, p_ok: res.ok, p_http: res.http || null, p_error: res.ok ? null : res.error, p_ms: res.ms, p_permanent: res.permanent });
      if (res.ok) w.delivered++; else if (st.data === "failed") w.failed++; else w.retry++;
    }));
  }
}

export async function handleNotifyDispatch(req: Request, d: NotifyDeps): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(req, d) });
  if (req.method !== "POST") return R(req, d, 405, { error: "metode_tidak_didukung" });
  let b: any = {}; try { b = await req.json(); } catch { /* badan kosong = run */ }
  const action = b?.action === "status" ? "status" : "run";
  const a = await authorize(req, d, action === "status" ? "notifications.read" : "notifications.write"); if (a instanceof Response) return a;

  const get = async (k: string) => { const r = await d.rpc("notif_setting", { p_key: k }); return r.error ? null : r.data; };
  const cfg = { name: asStr(await get("email_from_name")), address: asStr(await get("email_from_address")), replyTo: asStr(await get("email_reply_to")) };
  const emailReady = !!d.env.resendKey && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(cfg.address), waReady = !!d.env.waToken;
  if (action === "status") return R(req, d, 200, { email: { configured: emailReady, has_key: !!d.env.resendKey, has_sender: !!cfg.address }, whatsapp: { configured: waReady }, scheduler_secret: !!d.env.dispatchSecret, webhook_secret: !!d.env.webhookSecret });

  const channels: string[] = []; if (emailReady) channels.push("email"); if (waReady) channels.push("whatsapp");
  const due = await d.rpc("notif_enqueue_due", {});
  const out = { claimed: 0, sent: 0, retry: 0, failed: 0, skipped_channels: [] as string[], due: due.error ? null : due.data };
  if (!emailReady) out.skipped_channels.push("email"); if (!waReady) out.skipped_channels.push("whatsapp");
  const t0 = (d.now ?? Date.now)();
  if (!channels.length) { await runWebhooks(d, out, t0); return R(req, d, 200, out); }
  for (let round = 0; round < 5 && (d.now ?? Date.now)() - t0 < 20000; round++) {
    const c = await d.rpc("notif_claim", { p_limit: 20, p_channels: channels });
    if (c.error) return R(req, d, 500, { error: "gagal_ambil_antrean", message: c.error.message, ...out });
    const rows: Row[] = c.data || []; if (!rows.length) break; out.claimed += rows.length;
    for (let i = 0; i < rows.length; i += 5) {
      await Promise.all(rows.slice(i, i + 5).map(async (r) => {
        let res: SendResult;
        if (!r.to_address) res = { ok: false, error: "Alamat tujuan kosong", http: 0, permanent: true };
        else res = r.channel === "email" ? await sendEmail(d, r, cfg) : await sendWhatsApp(d, r);
        const st = await d.rpc("notif_result", { p_id: r.id, p_ok: res.ok, p_provider: r.channel === "email" ? "resend" : "fonnte", p_message_id: res.ok ? res.messageId : null,
          p_error: res.ok ? null : res.error, p_http: res.ok ? 200 : res.http, p_permanent: res.ok ? false : res.permanent });
        if (res.ok) out.sent++; else if (st.data === "failed") out.failed++; else out.retry++;
      }));
    }
  }
  await runWebhooks(d, out, t0);
  if (a.actor !== "scheduler") await logSecurityEvent(d, "notify_dispatch_manual", a.actor, { claimed: out.claimed, sent: out.sent });
  return R(req, d, 200, out);
}

// ---- Callback Resend (Svix). Hanya mengubah status lewat notif_delivery.
export async function verifySvix(secret: string, id: string, ts: string, sigHeader: string, body: string, nowMs: number): Promise<boolean> {
  if (!secret || !id || !ts || !sigHeader) return false;
  const t = Number(ts); if (!Number.isFinite(t) || Math.abs(nowMs / 1000 - t) > 300) return false;
  const raw = secret.startsWith("whsec_") ? secret.slice(6) : secret;
  let keyBytes: Uint8Array; try { keyBytes = Uint8Array.from(atob(raw), (c) => c.charCodeAt(0)); } catch { return false; }
  const key = await crypto.subtle.importKey("raw", keyBytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${id}.${ts}.${body}`)));
  let bin = ""; for (const x of mac) bin += String.fromCharCode(x); const expect = btoa(bin);
  return sigHeader.split(" ").some((p) => { const [v, sig] = p.split(","); return v === "v1" && !!sig && safeEq(sig, expect); });
}
const MAP: Record<string, "delivered" | "bounced" | "failed"> = { "email.delivered": "delivered", "email.bounced": "bounced", "email.failed": "failed", "email.complained": "failed" };

export async function handleNotifyWebhook(req: Request, d: NotifyDeps): Promise<Response> {
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "metode_tidak_didukung" }), { status: 405 });
  const body = await req.text();
  const ok = await verifySvix(d.env.webhookSecret || "", req.headers.get("svix-id") || "", req.headers.get("svix-timestamp") || "", req.headers.get("svix-signature") || "", body, (d.now ?? Date.now)());
  if (!ok) return new Response(JSON.stringify({ error: "tanda_tangan_tidak_valid" }), { status: 401 });
  let ev: any; try { ev = JSON.parse(body); } catch { return new Response(JSON.stringify({ error: "permintaan_tidak_valid" }), { status: 400 }); }
  const st = MAP[asStr(ev?.type)]; const mid = asStr(ev?.data?.email_id);
  if (!st || !mid) return new Response(JSON.stringify({ ok: true, ignored: true }), { status: 200 });
  const r = await d.rpc("notif_delivery", { p_provider_message_id: mid, p_status: st, p_error: asStr(ev?.data?.bounce?.message) || asStr(ev?.data?.reason) || null });
  if (r.error) return new Response(JSON.stringify({ error: "gagal_mencatat" }), { status: 500 });
  return new Response(JSON.stringify({ ok: true, result: r.data }), { status: 200 });
}
