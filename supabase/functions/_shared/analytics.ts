// Pengumpul analytics first-party. Runtime-agnostic (dipakai Edge Function + tes Node).
// Tanpa cookie pihak ketiga, tanpa IP tersimpan: IP hanya dipakai sebagai kunci rate limit ber-hash (lihat ratelimit.ts).
// Penyaringan: origin harus terdaftar (ALLOWED_ORIGINS), User-Agent bot/skrip dibuang, Do Not Track / Global Privacy Control dihormati,
// badan permintaan dibatasi 8 KB, rate limit per IP dan per visitor. Semua validasi isi diulang di database (analytics_ingest).
import { cors } from "./handlers.ts";
import { rateCheck, tooMany, clientIp } from "./ratelimit.ts";

export interface AnalyticsDeps {
  env: { allowedOrigins: string[] };
  rpc(name: string, args: Record<string, unknown>): Promise<{ data: any; error: { message: string } | null }>;
}
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const BOT = /bot|crawl|spider|slurp|headless|phantom|puppeteer|playwright|selenium|lighthouse|pagespeed|gtmetrix|pingdom|uptime|monitor|facebookexternalhit|embedly|preview|curl|wget|httpie|python|node-fetch|axios|go-http|java\/|okhttp|libwww|scrapy|httpclient|apache-http|postman|insomnia/i;
const MAX_BODY = 8192;

export function parseUa(ua: string): { device: string; browser: string; os: string } {
  const t = /ipad|tablet|(android(?!.*mobile))/i.test(ua) ? "tablet" : /mobi|iphone|ipod|android/i.test(ua) ? "mobile" : "desktop";
  const browser = /edg\//i.test(ua) ? "Edge" : /opr\/|opera/i.test(ua) ? "Opera" : /samsungbrowser/i.test(ua) ? "Samsung Internet" : /firefox|fxios/i.test(ua) ? "Firefox"
    : /chrome|crios/i.test(ua) ? "Chrome" : /safari/i.test(ua) ? "Safari" : "Other";
  const os = /windows/i.test(ua) ? "Windows" : /iphone|ipad|ipod/i.test(ua) ? "iOS" : /android/i.test(ua) ? "Android" : /mac os x|macintosh/i.test(ua) ? "macOS" : /cros/i.test(ua) ? "ChromeOS" : /linux/i.test(ua) ? "Linux" : "Other";
  return { device: t, browser, os };
}
const hdr = (req: Request, d: AnalyticsDeps) => ({ "Content-Type": "application/json", "Cache-Control": "no-store", ...cors(req, d.env as any) });
const R = (req: Request, d: AnalyticsDeps, status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: hdr(req, d) });
const str = (v: unknown, n: number) => (typeof v === "string" ? v.slice(0, n) : undefined);

export async function handleAnalytics(req: Request, d: AnalyticsDeps): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(req, d.env as any) });
  if (req.method !== "POST") return R(req, d, 405, { error: "metode_tidak_didukung" });
  const origin = (req.headers.get("origin") || "").replace(/\/$/, "");
  if (!origin || !d.env.allowedOrigins.includes(origin)) return R(req, d, 403, { error: "origin_tidak_diizinkan" });
  const ua = req.headers.get("user-agent") || "";
  if (!ua || BOT.test(ua)) return R(req, d, 202, { ok: true, dropped: "bot" });
  if (req.headers.get("dnt") === "1" || req.headers.get("sec-gpc") === "1") return R(req, d, 202, { ok: true, dropped: "dnt" });
  { const w = await rateCheck(d, "analytics-ip", clientIp(req), 240, 60); if (w) return tooMany(req, d.env.allowedOrigins, w); }

  const len = Number(req.headers.get("content-length") || 0);
  if (len > MAX_BODY) return R(req, d, 413, { error: "terlalu_besar" });
  let text = ""; try { text = await req.text(); } catch { return R(req, d, 400, { error: "permintaan_tidak_valid" }); }
  if (text.length > MAX_BODY) return R(req, d, 413, { error: "terlalu_besar" });
  let b: any; try { b = JSON.parse(text); } catch { return R(req, d, 400, { error: "permintaan_tidak_valid" }); }   // sendBeacon mengirim text/plain: tetap JSON
  if (!b || typeof b !== "object" || !UUID.test(String(b.vid || ""))) return R(req, d, 400, { error: "permintaan_tidak_valid" });
  { const w = await rateCheck(d, "analytics-vid", String(b.vid).toLowerCase(), 120, 60); if (w) return tooMany(req, d.env.allowedOrigins, w); }

  if (b.forget === true) {   // hak hapus: pengunjung mencabut persetujuan
    const f = await d.rpc("analytics_forget", { p_vid: String(b.vid).toLowerCase() });
    return f.error ? R(req, d, 500, { error: "server" }) : R(req, d, 200, { ok: true });
  }
  if (!UUID.test(String(b.sid || ""))) return R(req, d, 400, { error: "permintaan_tidak_valid" });

  const c = b.ctx && typeof b.ctx === "object" ? b.ctx : {}, u = c.utm && typeof c.utm === "object" ? c.utm : {};
  const p = parseUa(ua); const cc = (req.headers.get("cf-ipcountry") || "").toUpperCase();
  const events = (Array.isArray(b.events) ? b.events : []).slice(0, 25).filter((e: any) => e && typeof e === "object").map((e: any) => ({
    e: str(e.e, 40), path: str(e.path, 300), tpl: str(e.tpl, 100), term: str(e.term, 100), target: str(e.target, 100), pkg: str(e.pkg, 20),
  }));
  const payload = {
    vid: String(b.vid).toLowerCase(), sid: String(b.sid).toLowerCase(),
    ctx: {
      ref: str(c.ref, 120), landing: str(c.landing, 300), screen: str(c.screen, 12),
      utm: { source: str(u.source, 80), medium: str(u.medium, 80), campaign: str(u.campaign, 100), content: str(u.content, 100), term: str(u.term, 100) },
      device: p.device, browser: p.browser, os: p.os, country: /^[A-Z]{2}$/.test(cc) && cc !== "XX" && cc !== "T1" ? cc : undefined,
    },
    events,
  };
  const r = await d.rpc("analytics_ingest", { p: payload });
  if (r.error) return R(req, d, 500, { error: "server" });
  return R(req, d, 202, { ok: r.data?.ok !== false });
}
