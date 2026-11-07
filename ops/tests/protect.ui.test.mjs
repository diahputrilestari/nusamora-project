// Uji pengaman klien (assets/protect.js) di Chromium: perilaku di halaman publik, TIDAK aktif di halaman aplikasi, dan SEO/UX/aksesibilitas utuh.
import http from "node:http"; import { readFileSync, existsSync, statSync } from "node:fs"; import { join, extname, resolve } from "node:path"; import { execSync } from "node:child_process";
import { chromium } from "playwright";
const ROOT = resolve(new URL("../../", import.meta.url).pathname);
let pass = 0, fail = 0; const ok = (n, c, d = "") => { if (c) { pass++; console.log("PASS ", n) } else { fail++; console.log("FAIL ", n, d) } };
const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png", ".webp": "image/webp", ".mp3": "audio/mpeg" };
const srv = http.createServer((q, r) => { let p = decodeURIComponent(new URL(q.url, "http://x").pathname); if (p === "/assets/config.js") { r.writeHead(200, { "Content-Type": "text/javascript" }); return r.end("window.NM_CONFIG={SUPABASE_URL:'http://127.0.0.1:1',SUPABASE_ANON_KEY:'x'}"); }
  let f = join(ROOT, p === "/" ? "index.html" : p); if (!f.startsWith(ROOT)) { r.writeHead(403); return r.end(); } if (!existsSync(f) || statSync(f).isDirectory()) f = existsSync(f + ".html") ? f + ".html" : existsSync(join(f, "index.html")) ? join(f, "index.html") : "";
  if (!f) { r.writeHead(404); return r.end(); } r.writeHead(200, { "Content-Type": MIME[extname(f)] || "application/octet-stream" }); r.end(readFileSync(f)); });
await new Promise((r) => srv.listen(0, "127.0.0.1", r)); const BASE = "http://127.0.0.1:" + srv.address().port;
const browser = await chromium.launch();

// ---- A. cakupan: hanya halaman publik yang memasang protect.js
const app = ["akun", "buat", "editor", "admin", "admin-keamanan", "template", "preview", "paket", "pembayaran", "masuk", "daftar", "lupa-password", "atur-password"];
ok("halaman aplikasi/dashboard/editor/form TIDAK memuat protect.js", app.every((n) => { const s = readFileSync(join(ROOT, n + ".html"), "utf8"); return !/protect\.js/.test(s) && !/data-protect/.test(s); }), app.filter((n) => /protect/.test(readFileSync(join(ROOT, n + ".html"), "utf8"))).join(","));
ok("beranda dan halaman demo Live Guest memuat protect.js", ["index.html", "live/index.html", "live/jawa-tengah.html"].every((f) => /protect\.js/.test(readFileSync(join(ROOT, f), "utf8")) && /data-protect=/.test(readFileSync(join(ROOT, f), "utf8"))));

// ---- B. SEO: head/isi beranda tidak berubah selain atribut + 1 tag script
{ let before = ""; try { before = execSync("git show HEAD:index.html", { cwd: ROOT, maxBuffer: 1e8 }).toString(); } catch { before = ""; }
  if (before) { const now = readFileSync(join(ROOT, "index.html"), "utf8"), strip = (s) => s.replace(/ data-protect="on" data-wm="\.tv"/, "").replace('<script src="/assets/protect.js?v=1" defer></script>', ""); ok("index.html: SEO (title, meta, JSON-LD, konten) identik; hanya atribut + satu skrip ditambahkan", strip(now) === strip(before), "berbeda dari HEAD"); }
  const s = readFileSync(join(ROOT, "index.html"), "utf8"); ok("index.html: tidak ada noindex, canonical dan JSON-LD tetap", !/noindex/i.test(s) && /rel="canonical"/.test(s) && /application\/ld\+json/.test(s)); }

// ---- C. perilaku di beranda
async function open(path, withProtect = true) { const c = await browser.newContext({ viewport: { width: 1280, height: 900 } }); const p = await c.newPage(); const errs = []; p.on("pageerror", (e) => errs.push(String(e.message).slice(0, 120)));
  if (!withProtect) await p.route("**/assets/protect.js*", (r) => r.abort()); await p.goto(BASE + path, { waitUntil: "load" }); await p.waitForTimeout(1200); return { c, p, errs }; }
const { c: c1, p } = await open("/");
const prevented = (sel, type = "contextmenu", init = {}) => p.evaluate(({ sel, type, init }) => { const el = document.querySelector(sel); if (!el) return "tidak ada elemen"; const ev = new (type === "dragstart" ? DragEvent : MouseEvent)(type, { bubbles: true, cancelable: true, ...init }); el.dispatchEvent(ev); return ev.defaultPrevented; }, { sel, type, init });
ok("klik kanan pada gambar diblokir", (await prevented(".tv img")) === true);
ok("klik kanan pada area halaman (non-tautan, tanpa seleksi) diblokir", (await prevented("h1")) === true);
ok("klik kanan pada tautan TIDAK diblokir (buka di tab baru tetap bisa)", (await prevented("a[href]")) === false);
ok("klik kanan pada kolom isian TIDAK diblokir (salin/tempel)", (await prevented("#f-ev")) === false);
await p.evaluate(() => { const r = document.createRange(); r.selectNodeContents(document.querySelector(".lead")); const s = getSelection(); s.removeAllRanges(); s.addRange(r); });
ok("klik kanan pada TEKS TERSELEKSI tidak diblokir (salin teks tetap bisa)", (await prevented(".lead")) === false);
await p.evaluate(() => getSelection().removeAllRanges());
ok("dragstart gambar diblokir", (await prevented(".tv img", "dragstart")) === true);
const css = await p.evaluate(() => { const i = document.querySelector(".tv img"), h = document.querySelector("h1"); return { imgSel: getComputedStyle(i).userSelect, imgDrag: getComputedStyle(i).webkitUserDrag, hSel: getComputedStyle(h).userSelect }; });
ok("gambar tidak bisa diseleksi/di-drag lewat CSS, teks tetap bisa diseleksi", css.imgSel === "none" && css.hSel !== "none" && css.imgDrag === "none", JSON.stringify(css));
await p.evaluate(() => { window.__k = []; window.addEventListener("keydown", (e) => { const rec = [e.key, e.ctrlKey, e.shiftKey, null]; window.__k.push(rec); setTimeout(() => { rec[3] = e.defaultPrevented; }, 0); }, true); });
for (const [combo, want] of [["F12", true], ["Control+u", true], ["Control+s", true], ["Control+Shift+I", true], ["Control+Shift+J", true], ["Control+Shift+C", true], ["Control+c", false], ["Control+p", false], ["Control+f", false], ["Tab", false], ["Control+a", false]]) {
  await p.evaluate(() => (window.__k = [])); await p.keyboard.press(combo); await p.waitForTimeout(50); const k = await p.evaluate(() => window.__k.filter((x) => !["Control", "Shift", "Meta", "Alt"].includes(x[0])).slice(-1)[0]); ok(`pintasan ${combo}: ${want ? "diblokir" : "TIDAK diblokir"}`, !!k && k[3] === want, JSON.stringify(k)); }
ok("keyboard tetap bisa dipakai: Tab memindahkan fokus", await p.evaluate(() => { document.activeElement?.blur?.(); return true; }) && (await (async () => { await p.keyboard.press("Tab"); return p.evaluate(() => document.activeElement && document.activeElement !== document.body); })()));
await p.locator(".tv").first().scrollIntoViewIfNeeded(); await p.waitForTimeout(300);
const wm = await p.evaluate(() => { const w = document.querySelector(".tv .nm-wm"); if (!w) return null; const cs = getComputedStyle(w); const r = w.getBoundingClientRect(); const el = document.elementFromPoint(r.left + r.width / 2, r.top + 10); return { aria: w.getAttribute("aria-hidden"), pe: cs.pointerEvents, hit: el && !el.classList.contains("nm-wm") }; });
ok("watermark pada pratinjau template: aria-hidden, tidak menangkap klik", !!wm && wm.aria === "true" && wm.pe === "none" && wm.hit === true, JSON.stringify(wm));
ok("fitur beranda tetap jalan (filter acara)", await (async () => { await p.click('.ev[data-ev="wisuda"]'); return /Wisuda/.test(await p.textContent("#tcount")); })());
ok("modal Buat Undangan tetap bisa dibuka (klik tidak terhalang overlay)", await (async () => { await p.click('.hero [data-open="start"]'); return p.evaluate(() => document.getElementById("dlg").open); })());
await c1.close();

// ---- D. halaman demo Live Guest: watermark halaman penuh, fungsi tidak berubah dibanding tanpa protect.js
for (const page of ["/live/jawa-tengah", "/live/"]) {
  const a = await open(page, true), b = await open(page, false);
  const hasWm = await a.p.evaluate(() => { const w = document.querySelector("body > .nm-wm.fixed"); return !!w && getComputedStyle(w).pointerEvents === "none" && w.getAttribute("aria-hidden") === "true"; });
  ok(`${page}: watermark halaman penuh, tidak menghalangi interaksi`, hasWm);
  const pe = await a.p.evaluate(() => (window.getComputedStyle(document.body).display, true));
  ok(`${page}: tidak ada galat JS baru akibat protect.js`, JSON.stringify(a.errs) === JSON.stringify(b.errs), JSON.stringify([a.errs, b.errs]));
  const cm = await a.p.evaluate(() => { const ev = new MouseEvent("contextmenu", { bubbles: true, cancelable: true }); (document.querySelector("canvas") || document.body).dispatchEvent(ev); return ev.defaultPrevented; });
  ok(`${page}: klik kanan pada kanvas/halaman diblokir`, cm === true);
  await a.c.close(); await b.c.close(); }
await browser.close(); srv.close();
console.log(fail ? "GAGAL " + fail : "SEMUA LULUS (" + pass + ")"); process.exit(fail ? 1 : 0);
