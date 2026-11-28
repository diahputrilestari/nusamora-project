import { handleAnalytics, parseUa } from "../../supabase/functions/_shared/analytics.ts";
let pass = 0, fail = 0; const ok = (n, c) => { if (c) { pass++; console.log("PASS ", n) } else { fail++; console.log("FAIL ", n) } };
const V = "11111111-2222-3333-4444-555555555555", S = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
const CH = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36";
const counters = new Map(); let calls = [];
const mk = (over = {}) => ({ env: { allowedOrigins: ["https://nusamora.com"] },
  async rpc(name, a) {
    if (name === "rl_hit") { const c = (counters.get(a.p_key) || 0) + 1; counters.set(a.p_key, c); return { data: c > a.p_limit ? { allowed: false, retry_after: 30 } : { allowed: true }, error: null }; }
    calls.push([name, a]); return { data: { ok: true }, error: null };
  }, ...over });
const req = (body, o = {}) => new Request("https://x.supabase.co/functions/v1/analytics-collect", { method: o.method || "POST",
  headers: { "content-type": "text/plain", origin: o.origin ?? "https://nusamora.com", "user-agent": o.ua ?? CH, "cf-connecting-ip": o.ip || "1.2.3.4", ...(o.h || {}) },
  body: o.method === "GET" ? undefined : (typeof body === "string" ? body : JSON.stringify(body)) });
const good = { vid: V, sid: S, ctx: { ref: "www.google.com", landing: "/", screen: "390x844", utm: { source: "ig" } }, events: [{ e: "page_view", path: "/template" }] };
const ingest = () => calls.filter((c) => c[0] === "analytics_ingest");

let r = await handleAnalytics(req(good), mk());
ok("permintaan sah -> 202 dan diteruskan ke analytics_ingest", r.status === 202 && ingest().length === 1);
const pl = ingest()[0][1].p;
ok("perangkat/browser/OS diambil dari User-Agent di server (bukan klien)", pl.ctx.device === "mobile" && pl.ctx.browser === "Chrome" && pl.ctx.os === "Android");
ok("CORS hanya untuk origin yang diizinkan", r.headers.get("access-control-allow-origin") === "https://nusamora.com");
calls = []; r = await handleAnalytics(req(good, { h: { "cf-ipcountry": "id" } }), mk());
ok("negara dari header cf-ipcountry (huruf besar), tanpa IP diteruskan", ingest()[0][1].p.ctx.country === "ID" && !JSON.stringify(ingest()[0][1]).includes("1.2.3.4"));
calls = []; await handleAnalytics(req(good, { h: { "cf-ipcountry": "XX" } }), mk()); ok("negara tidak dikenal (XX) diabaikan", ingest()[0][1].p.ctx.country === undefined);
calls = []; r = await handleAnalytics(req(good, { origin: "https://evil.example" }), mk()); ok("origin tak terdaftar -> 403 dan tidak diteruskan", r.status === 403 && ingest().length === 0);
calls = []; r = await handleAnalytics(req(good, { origin: "" }), mk()); ok("tanpa origin (curl/skrip) -> 403", r.status === 403 && ingest().length === 0);
for (const ua of ["Googlebot/2.1 (+http://www.google.com/bot.html)", "curl/8.4.0", "python-requests/2.31", "HeadlessChrome/120", "Mozilla/5.0 Lighthouse", "facebookexternalhit/1.1", ""]) {
  calls = []; r = await handleAnalytics(req(good, { ua }), mk()); ok("bot dibuang: " + (ua || "(UA kosong)").slice(0, 30), r.status === 202 && ingest().length === 0);
}
calls = []; r = await handleAnalytics(req(good, { h: { dnt: "1" } }), mk()); ok("Do Not Track dihormati", r.status === 202 && ingest().length === 0);
calls = []; r = await handleAnalytics(req(good, { h: { "sec-gpc": "1" } }), mk()); ok("Global Privacy Control dihormati", r.status === 202 && ingest().length === 0);
r = await handleAnalytics(req("{bukan json"), mk()); ok("JSON rusak -> 400", r.status === 400);
r = await handleAnalytics(req({ ...good, vid: "x" }), mk()); ok("visitor id bukan UUID -> 400", r.status === 400);
r = await handleAnalytics(req({ ...good, sid: "x" }), mk()); ok("session id bukan UUID -> 400", r.status === 400);
r = await handleAnalytics(req("x".repeat(9000)), mk()); ok("badan > 8 KB -> 413", r.status === 413);
r = await handleAnalytics(req(null, { method: "GET" }), mk()); ok("GET ditolak 405", r.status === 405);
r = await handleAnalytics(new Request("https://x/f", { method: "OPTIONS", headers: { origin: "https://evil.example" } }), mk()); ok("preflight origin asing tanpa header Allow-Origin", r.status === 204 && !r.headers.get("access-control-allow-origin"));
calls = []; const many = Array.from({ length: 60 }, (_, i) => ({ e: "search", term: "k" + i })); await handleAnalytics(req({ ...good, events: many }), mk());
ok("maksimal 25 event diteruskan", ingest()[0][1].p.events.length === 25);
calls = []; await handleAnalytics(req({ ...good, events: [{ e: "page_view", path: "x".repeat(900), tpl: 5 }, "bukan objek", null] }), mk());
ok("isi event dipotong dan elemen bukan objek dibuang", ingest()[0][1].p.events.length === 1 && ingest()[0][1].p.events[0].path.length === 300 && ingest()[0][1].p.events[0].tpl === undefined);
calls = []; r = await handleAnalytics(req({ vid: V, forget: true }), mk()); ok("forget memanggil analytics_forget", r.status === 200 && calls.some((c) => c[0] === "analytics_forget" && c[1].p_vid === V));
r = await handleAnalytics(req(good), mk({ async rpc(n) { return n === "rl_hit" ? { data: { allowed: true }, error: null } : { data: null, error: { message: "boom" } }; } })); ok("galat database -> 500 tanpa bocor detail", r.status === 500 && !(await r.text()).includes("boom"));
r = await handleAnalytics(req(good), mk({ async rpc(n) { if (n === "rl_hit") throw new Error("db mati"); return { data: { ok: true }, error: null }; } })); ok("rate limit gagal-buka: tetap dilayani", r.status === 202);
counters.clear(); let codes = []; for (let i = 0; i < 125; i++) codes.push((await handleAnalytics(req({ ...good, vid: V }, { ip: "9.9.9." + (i % 250) }), mk())).status);
ok("rate limit per visitor: 120 pertama lolos, sisanya 429", codes.slice(0, 120).every((c) => c === 202) && codes.slice(120).every((c) => c === 429));
counters.clear(); codes = []; for (let i = 0; i < 245; i++) codes.push((await handleAnalytics(req({ ...good, vid: crypto.randomUUID() }, { ip: "7.7.7.7" }), mk())).status);
ok("rate limit per IP: 240 pertama lolos, sisanya 429", codes.slice(0, 240).every((c) => c === 202) && codes.slice(240).every((c) => c === 429));
ok("parseUa: desktop Windows/Edge, iPhone Safari, iPad tablet", parseUa("Mozilla/5.0 (Windows NT 10.0) Chrome/130 Safari/537 Edg/130").browser === "Edge" && parseUa("Mozilla/5.0 (iPhone; CPU iPhone OS 17) AppleWebKit Version/17 Mobile Safari").os === "iOS" && parseUa("Mozilla/5.0 (iPad; CPU OS 17) Safari").device === "tablet");
console.log(fail ? "GAGAL " + fail : "SEMUA LULUS (" + pass + ")"); process.exit(fail ? 1 : 0);
