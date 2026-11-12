// Supabase TIRUAN untuk uji e2e undangan publik: hanya RPC yang dipakai halaman. Tanpa dependensi.
// Port 54399. GET /__calls = riwayat RPC (untuk asersi), POST /__reset = kosongkan. Bukan untuk produksi.
import http from "node:http";
const calls = [];
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "apikey,authorization,content-type,x-client-info,prefer,accept-profile,content-profile", "Access-Control-Allow-Methods": "GET,POST,OPTIONS" };
const A = "a".repeat(32), B = "b".repeat(32);
const BASE = { title: "Pernikahan Uji", template_id: "romantic-garden", category: "wedding", event_date: "2027-03-14", experience: "2d", liveGuest: false, expires_at: "2027-06-01T00:00:00Z" };
const INV = {
  "uji-undangan": { ...BASE, content: { names: { a: "Dewi", b: "Raka" }, welcome: "Dengan hormat,\nkami mengundang Anda.", event: { start: "10:00", end: "12:00", tz: "WIB", venue: "Gedung Serbaguna", address: "Jl. Melati 1, Solo", maps: "https://maps.google.com/?q=solo" }, photos: { cover: "" }, features: { rsvp: true, guestbook: true } } },
  "xss-undangan": { ...BASE, content: { names: { a: "<img src=x onerror=window.__xss=1>", b: "<script>window.__xss=1</script>" }, welcome: "<b>tebal</b>", event: { venue: "<i>x</i>", maps: "javascript:window.__xss=1" }, photos: { cover: "javascript:window.__xss=1" } } },
  "tanpa-fitur": { ...BASE, content: { names: { a: "Siti" }, features: { rsvp: false, guestbook: false } } },
};
const json = (res, status, body) => { res.writeHead(status, { "Content-Type": "application/json", ...CORS }); res.end(JSON.stringify(body)); };
http.createServer((req, res) => {
  if (req.method === "OPTIONS") { res.writeHead(204, CORS); return res.end(); }
  const u = new URL(req.url, "http://x");
  if (u.pathname === "/__health") return json(res, 200, { ok: true });
  if (u.pathname === "/__calls") return json(res, 200, calls);
  if (u.pathname === "/__reset") { calls.length = 0; return json(res, 200, { ok: true }); }
  if (u.pathname.startsWith("/auth/v1/")) return json(res, 401, { msg: "tidak ada sesi" });
  let raw = ""; req.on("data", (d) => (raw += d)); req.on("end", () => {
    const m = /^\/rest\/v1\/rpc\/([a-z_]+)$/.exec(u.pathname); if (!m) return json(res, 404, { message: "tidak ada" });
    let a = {}; try { a = JSON.parse(raw || "{}"); } catch { /* abaikan */ }
    calls.push({ fn: m[1], args: a, apikey: req.headers["apikey"] ?? null });
    switch (m[1]) {
      case "get_public_invitation": return json(res, 200, INV[a.p_slug] ?? { error: "tidak_tersedia" });
      case "guest_open": return json(res, 200, a.p_token === A ? { name: "Budi" } : null);
      case "guest_rsvp": return a.p_token === A ? json(res, 200, true) : json(res, 200, false);
      case "guest_wish": return a.p_token === A ? (/LIMIT/.test(a.p_message || "") ? json(res, 400, { message: "terlalu_banyak_permintaan" }) : json(res, 200, true)) : json(res, 200, false);
      default: return json(res, 404, { message: "rpc tidak dikenal" });
    }
  });
}).listen(54399, "127.0.0.1", () => console.log("mock supabase di :54399"));
