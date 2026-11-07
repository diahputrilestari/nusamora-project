// Uji UI Cari Teman Kondangan (P0) di Chromium terhadap stack Supabase NYATA (GoTrue + PostgREST + Realtime). Tanpa mock backend.
// Situs disajikan lokal; /assets/config.js diarahkan ke stack lokal. CSP Report-Only diambil dari .htaccess (hanya connect-src
// ditambah origin stack lokal). Env: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY. Data uji dihapus di akhir.
import http from "node:http";
import { readFileSync, existsSync, statSync, mkdirSync } from "node:fs";
import { join, extname, resolve } from "node:path";
import { chromium } from "playwright";
import { check, info, finish, svc, mkUser, login, URL_, ANON, sleep } from "./lib.mjs";

const ROOT = resolve(new URL("../../", import.meta.url).pathname), SHOTS = process.env.SHOTS || "stack-results/dating-ui";
mkdirSync(SHOTS, { recursive: true });
if (URL_.includes("ixzmogwaaajkyltcnwaf")) { console.error("URL mengarah ke PRODUKSI. Dihentikan."); process.exit(2); }
const ht = readFileSync(join(ROOT, ".htaccess"), "utf8");
let CSP = (ht.match(/Content-Security-Policy-Report-Only\s+"([^"]+)"/) || [])[1];
if (!CSP) { console.error("CSP tidak ditemukan"); process.exit(2); }
const wsOrigin = URL_.replace(/^http/, "ws");
CSP = CSP.replace("connect-src 'self'", `connect-src 'self' ${URL_} ${wsOrigin}`);
const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png", ".webp": "image/webp", ".json": "application/json" };
const srv = http.createServer((req, res) => {
  const p = decodeURIComponent(new URL(req.url, "http://x").pathname), hdr = { "Content-Security-Policy-Report-Only": CSP };
  if (p === "/assets/config.js") { res.writeHead(200, { ...hdr, "Content-Type": MIME[".js"] }); return res.end(`window.NM_CONFIG=${JSON.stringify({ SUPABASE_URL: URL_, SUPABASE_ANON_KEY: ANON, SITE_URL: "" })};`); }
  let f = join(ROOT, p === "/" ? "index.html" : p);
  if (!f.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  if (!existsSync(f) || statSync(f).isDirectory()) f = existsSync(f + ".html") ? f + ".html" : "";
  if (!f) { res.writeHead(404, hdr); return res.end("404"); }
  res.writeHead(200, { ...hdr, "Content-Type": MIME[extname(f)] || "application/octet-stream" }); res.end(readFileSync(f));
});
await new Promise((r) => srv.listen(0, "127.0.0.1", r));
const BASE = "http://127.0.0.1:" + srv.address().port;

const PW = "Uji-Sandi-Panjang#2026", stamp = Date.now().toString(36);
const ymd = (yrs) => { const d = new Date(); d.setFullYear(d.getFullYear() - yrs); return d.toISOString().slice(0, 10); };
const rpc = async (c, n, a = {}) => { const r = await c.rpc(n, a); return { data: r.data, err: r.error?.message || "" }; };

// ---- data dasar (lewat backend nyata)
const owner = await mkUser(`dtui.owner.${stamp}@uji.nusamora.test`, PW);
const inv = await svc.from("invitations").insert({ user_id: owner.id, title: "Uji UI Dating " + stamp, category: "wedding", slug: "dtui-" + stamp, status: "aktif", plan_id: "luxe",
  expires_at: new Date(Date.now() + 30 * 864e5).toISOString(), event_date: new Date().toISOString().slice(0, 10), content: {} }).select("id").single();
check("undangan Luxe aktif dibuat", !inv.error, inv.error?.message);
const EV = inv.data.id;
const O = await login(`dtui.owner.${stamp}@uji.nusamora.test`, PW);
check("pemilik mengaktifkan fitur", !(await rpc(O.c, "dating_owner_set_event", { p_inv: EV, p_enabled: true, p_like_limit: 50 })).err);
const cat = await svc.from("asset_categories").select("id").eq("slug", "guest-avatar").eq("package_type", "luxe").maybeSingle();
const av = cat.data ? await svc.from("assets").insert({ name: "Avatar Uji " + stamp, category_id: cat.data.id, package_types: ["luxe"], file_path: "uji/dtui-" + stamp + ".webp", file_url: "/assets/avatars/jawa-tengah/guest-male/jgl0.webp", file_type: "webp", file_size: 1234, status: "active" }).select("id").single() : { error: { message: "kategori guest-avatar tidak ada" } };
check("avatar uji 2D (guest-avatar, webp) dibuat", !av.error, av.error?.message);
const av3 = await svc.from("assets").insert({ name: "Avatar 3D Uji " + stamp, category_id: cat.data.id, package_types: ["luxe"], file_path: "uji/dtui3d-" + stamp + ".glb", file_url: "https://example.test/m-" + stamp + ".glb",
  thumbnail_url: "https://example.test/t3-" + stamp + ".png", file_type: "glb", file_size: 1234, status: "active" }).select("id").single();
check("avatar uji 3D (glb) dibuat", !av3.error, av3.error?.message);

async function seed(tag, nick, age, city, bio, interests) {
  const email = `dtui.${tag}.${stamp}@uji.nusamora.test`, u = await mkUser(email, PW), L = await login(email, PW);
  const a = await rpc(L.c, "dating_accept_consent", { p_age: true, p_single: true, p_privacy: true });
  const p = await rpc(L.c, "dating_upsert_profile", { p_nickname: nick, p_birth_date: ymd(age), p_gender: "wanita", p_city: city, p_avatar: av.data?.id || null, p_bio: bio, p_interests: interests, p_education: null, p_occupation: null, p_intent: "teman_baru" });
  const j = await rpc(L.c, "dating_join", { p_inv: EV });
  return { ...L, id: u.id, email, profile: p.data?.profile_id, err: a.err || p.err || j.err };
}
const Y = await seed("y", "Yuni", 27, "Solo", "Suka kopi dan jalan pagi.", ["kopi", "musik"]);
const Z = await seed("z", "<img src=x onerror=__xss=1>", 30, "Jogja", "<script>window.__xss=1</script>", ["traveling"]);
check("peserta seed siap (Y normal, Z berisi payload XSS)", !Y.err && !Z.err && Y.profile && Z.profile, Y.err + "|" + Z.err);
{ const opt = await rpc(Y.c, "dating_avatar_options"); const ids = (opt.data || []).map((x) => x.id);
  check("pilihan avatar hanya 2D: webp ada, glb tidak", ids.includes(av.data.id) && !ids.includes(av3.data.id), JSON.stringify(ids.length));
  const r3 = await rpc(Y.c, "dating_upsert_profile", { p_nickname: "Yuni", p_birth_date: ymd(27), p_gender: "wanita", p_city: "Solo", p_avatar: av3.data.id, p_bio: "x", p_interests: [], p_education: null, p_occupation: null, p_intent: "teman_baru" });
  check("server menolak avatar 3D (glb) pada profil", r3.err.includes("avatar_tidak_valid"), r3.err); }
const xEmail = `dtui.x.${stamp}@uji.nusamora.test`, xUser = await mkUser(xEmail, PW);

// ---- browser
const browser = await chromium.launch();
const viol = [], errs = []; let cur = "-";
async function newCtx(opt = {}) {
  const ctx = await browser.newContext(opt);
  await ctx.exposeFunction("__cspv", (v) => viol.push({ page: cur, ...v }));
  await ctx.addInitScript(() => { document.addEventListener("securitypolicyviolation", (e) => { try { window.__cspv({ dir: e.effectiveDirective, blocked: String(e.blockedURI).slice(0, 100) }); } catch {} }); });
  const pg = await ctx.newPage(); pg.on("pageerror", (e) => errs.push(cur + ": " + String(e.message).slice(0, 140)));
  pg.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource|example\.test|ERR_/.test(m.text())) errs.push(cur + " console: " + m.text().slice(0, 140)); });
  return { ctx, pg };
}
const { ctx, pg: page } = await newCtx({ viewport: { width: 1280, height: 900 } });
const L = `/cari-teman?e=${EV}`;

// 1. landing anonim
cur = "landing"; await page.goto(BASE + L); await page.waitForSelector(".dt-hero", { timeout: 20000 });
const t1 = await page.textContent("body");
check("landing: tagline dan jumlah peserta aktif tampil", t1.includes("Pulang Siapa Tahu Berdua") && (await page.textContent("#dt-cnt")) === "2", await page.textContent("#dt-cnt").catch(() => "-"));
check("landing: ada penegasan status tidak diverifikasi", /tidak diverifikasi/.test(t1));
check("landing anonim menawarkan Masuk (bukan Ikut)", (await page.locator("a.btn.lg").first().textContent()).includes("Masuk"));
await page.screenshot({ path: `${SHOTS}/landing-desktop.png` });
cur = "guard"; await page.goto(BASE + L + "#/jelajah"); await page.waitForURL(/\/masuk/, { timeout: 15000 }).catch(() => {});
check("halaman terkunci: anonim diarahkan ke /masuk", new URL(page.url()).pathname === "/masuk", page.url().replace(BASE, ""));

// 2. login lewat UI lalu kembali ke halaman
cur = "login"; await page.goto(BASE + "/masuk?next=" + encodeURIComponent(L)); await page.fill("#email", xEmail); await page.fill("#pw", PW); await page.click("#go");
await page.waitForURL((u) => new URL(u).pathname === "/cari-teman", { timeout: 20000 }).catch(() => {});
check("login lewat UI kembali ke Cari Teman", new URL(page.url()).pathname === "/cari-teman" && page.url().includes("e=" + EV), page.url().replace(BASE, ""));
await page.waitForSelector(".dt-hero");
check("setelah login: tombol Ikut Cari Teman", (await page.locator("a.btn.lg").first().textContent()).includes("Ikut"));

// 3. persetujuan + profil: validasi klien, lalu validasi server
await page.click("a.btn.lg"); await page.waitForSelector("form.dt-form");
await page.click("form.dt-form button[type=submit]");
const e0 = await page.locator(".err").allTextContents();
check("form kosong: pesan galat tampil, tidak ada panggilan simpan", e0.filter(Boolean).length >= 4, e0.filter(Boolean).join(" | "));
await page.fill("#nick", "Budi"); await page.fill("#bd", ymd(16)); await page.selectOption("#gender", "pria"); await page.fill("#city", "Solo"); await page.selectOption("#intent", "teman_baru");
await page.check("#c1"); await page.check("#c2"); await page.check("#c3"); await page.click("form.dt-form button[type=submit]");
check("usia < 18 ditolak di formulir", (await page.locator('[data-for="bd"]').textContent()).includes("18"));
check("usia < 18: tidak ada profil/persetujuan tersimpan di DB", ((await svc.from("dating_profiles").select("id").eq("user_id", xUser.id)).data || []).length === 0);
// bypass klien: pengguna lain (W) memanggil RPC langsung dengan usia 16 -> server menolak
{ const wEmail = `dtui.w.${stamp}@uji.nusamora.test`, wu = await mkUser(wEmail, PW), W = await login(wEmail, PW);
  await rpc(W.c, "dating_accept_consent", { p_age: true, p_single: true, p_privacy: true });
  const bad = await rpc(W.c, "dating_upsert_profile", { p_nickname: "Budi", p_birth_date: ymd(16), p_gender: "pria", p_city: "Solo", p_avatar: null, p_bio: "", p_interests: [], p_education: null, p_occupation: null, p_intent: "teman_baru" });
  check("server menolak usia 16 walau klien dilewati", bad.err.includes("usia_minimal_18"), bad.err);
  await svc.auth.admin.deleteUser(wu.id).catch(() => {}); }
await page.reload(); await page.waitForSelector("form.dt-form");
await page.fill("#nick", "Budi"); await page.fill("#bd", ymd(28)); await page.selectOption("#gender", "pria"); await page.fill("#city", "Solo"); await page.fill("#bio", "Suka kopi. Hubungi saya di 0812 (jangan tampil).");
await page.fill("#ints", "kopi, musik, traveling"); await page.selectOption("#intent", "teman_baru"); await page.locator(".dt-av").first().click();
await page.click("form.dt-form button[type=submit]");
check("tanpa centang persetujuan: ditolak", (await page.locator('[data-for="consent"]').textContent()).length > 0);
await page.check("#c1"); await page.check("#c2"); await page.check("#c3"); await page.screenshot({ path: `${SHOTS}/profil-desktop.png`, fullPage: true });
await page.click("form.dt-form button[type=submit]"); await page.waitForSelector(".dt-grid", { timeout: 20000 });
const cons = await svc.from("dating_consents").select("version,age_confirmed,single_declared,privacy_accepted").eq("user_id", xUser.id);
const prof = await svc.from("dating_profiles").select("id,nickname,city,interests,avatar_id").eq("user_id", xUser.id).maybeSingle();
const part = await svc.from("dating_event_participants").select("status").eq("invitation_id", EV).eq("profile_id", prof.data?.id || "00000000-0000-0000-0000-000000000000");
check("persetujuan tercatat lengkap (versi, usia, single, privasi)", cons.data?.length === 1 && cons.data[0].age_confirmed && cons.data[0].single_declared && cons.data[0].privacy_accepted && !!cons.data[0].version, JSON.stringify(cons.data));
check("profil tersimpan + peserta aktif di acara", prof.data?.nickname === "Budi" && prof.data.interests.length === 3 && !!prof.data.avatar_id && part.data?.[0]?.status === "aktif", JSON.stringify([prof.data, part.data]));

// 4. discover: kartu, tidak ada data sensitif, XSS tidak dieksekusi, filter
await page.waitForSelector(".dt-pc"); const cards = page.locator(".dt-pc");
check("discover menampilkan 2 peserta lain (bukan diri sendiri)", (await cards.count()) === 2, String(await cards.count()));
const body4 = await page.textContent("body");
check("discover: payload XSS tampil sebagai teks, tidak dieksekusi", body4.includes("<img src=x onerror=__xss=1>") && !(await page.evaluate(() => window.__xss)), "xss=" + (await page.evaluate(() => window.__xss)));
check("avatar 2D berasal dari situs sendiri tampil (gambar termuat)", await page.evaluate(() => { const i = document.querySelector(".dt-pc img[alt^=Avatar]"); return !!i && i.complete && i.naturalWidth > 0; }));
check("discover: tidak ada email/telepon/tanggal lahir", !/@uji\.nusamora|0812|\d{4}-\d{2}-\d{2}/.test(body4));
await page.screenshot({ path: `${SHOTS}/jelajah-desktop.png`, fullPage: true });
await page.fill("#f-c", "Solo"); await page.click("button:has-text('Terapkan')"); await page.waitForFunction(() => document.querySelectorAll(".dt-pc").length === 1, null, { timeout: 10000 }).catch(() => {});
check("filter kota Solo menyisakan 1 profil (Yuni)", (await cards.count()) === 1 && (await cards.first().textContent()).includes("Yuni"), String(await cards.count()));
await page.fill("#f-c", "Bandung"); await page.click("button:has-text('Terapkan')"); await page.waitForSelector(".dt-empty", { timeout: 10000 }).catch(() => {});
check("filter tanpa hasil: keadaan kosong tampil", (await page.locator(".dt-empty").count()) === 1);
await page.fill("#f-c", ""); await page.click("button:has-text('Terapkan')"); await page.waitForFunction(() => document.querySelectorAll(".dt-pc").length === 2, null, { timeout: 10000 }).catch(() => {});

// 5. Like -> mutual match -> modal
const likeY = await rpc(Y.c, "dating_like", { p_inv: EV, p_to: prof.data.id });   // Yuni sudah menyukai Budi
check("Yuni menyukai Budi (belum match)", !likeY.err && likeY.data?.matched === false, likeY.err);
const yCard = page.locator(".dt-pc", { hasText: "Yuni" }); await yCard.locator("button.like").click();
await page.waitForSelector(".dt-match", { timeout: 15000 });
check("modal \"It's a Match!\" tampil dengan dua avatar", (await page.textContent(".dt-match h2")) === "It's a Match!" && (await page.locator(".dt-pair .a").count()) === 2);
await page.screenshot({ path: `${SHOTS}/match-modal.png` });
const ms = await svc.from("dating_matches").select("id").eq("invitation_id", EV);
check("tepat 1 match di DB", ms.data?.length === 1, String(ms.data?.length));
await page.click("button:has-text('Mulai Berkenalan')"); await page.waitForSelector(".dt-chat", { timeout: 15000 });
check("Mulai Berkenalan membuka chat", page.url().includes("#/chat/"));

// 6. chat: kirim (XSS sebagai teks), balasan realtime, status baca
const payload = "Halo <b>tebal</b> <img src=x onerror=__xss=1> ok";
await page.fill(".dt-comp textarea", payload); await page.click(".dt-comp .btn");
await page.waitForSelector(".dt-b.me >> text=Halo", { timeout: 15000 });
check("pesan terkirim, dirender sebagai teks (tanpa HTML)", (await page.locator(".dt-b.me").first().textContent()).includes("<b>tebal</b>") && (await page.locator(".dt-b.me b, .dt-b.me img").count()) === 0 && !(await page.evaluate(() => window.__xss)));
const conv = (await rpc(Y.c, "dating_my_matches")).data?.[0]?.conversation_id;
const t0 = Date.now(); await rpc(Y.c, "dating_send_message", { p_conversation: conv, p_body: "Halo juga, Budi 😊" });
await page.waitForSelector(".dt-b.th >> text=Halo juga", { timeout: 15000 }).catch(() => {});
check("balasan realtime muncul tanpa reload", (await page.locator(".dt-b.th").count()) >= 1, "ms=" + (Date.now() - t0));
info("latensi balasan tampil (ms)", { ms: Date.now() - t0 });
await rpc(Y.c, "dating_mark_read", { p_conversation: conv });
await page.waitForFunction(() => /✓✓/.test(document.querySelector(".dt-b.me time")?.textContent || ""), null, { timeout: 15000 }).catch(() => {});
check("status baca (✓✓) muncul setelah lawan membaca", /✓✓/.test((await page.locator(".dt-b.me time").first().textContent()) || ""));
check("emoji dan pesan pembuka tersedia", (await page.locator(".dt-chips button").count()) >= 10);
await page.screenshot({ path: `${SHOTS}/chat-desktop.png` });

// 7. daftar match
await page.click("a[href='#/match']"); await page.waitForSelector(".dt-mi");
const mt = await page.textContent(".dt-mi");
check("daftar match: nama, usia, pesan terakhir", mt.includes("Yuni") && mt.includes("27") && mt.includes("Halo juga"), mt.slice(0, 80));

// 8. blokir lewat UI menutup chat dua arah
await page.click(".dt-mi"); await page.waitForSelector(".dt-chat"); await page.click("button:has-text('Opsi')"); await page.click("dialog button:has-text('Blokir')"); await page.locator("dialog .two button").last().click();
await page.waitForURL(/#\/match/, { timeout: 15000 }).catch(() => {});
const blk = await svc.from("dating_blocks").select("blocker,blocked").eq("blocker", prof.data.id).eq("blocked", Y.profile);
check("blokir tercatat di DB", blk.data?.length === 1, JSON.stringify(blk.data));
const afterBlock = await rpc(Y.c, "dating_send_message", { p_conversation: conv, p_body: "masih bisa?" });
check("setelah blokir lawan tidak bisa mengirim pesan", !!afterBlock.err, afterBlock.err);

// 9. pengaturan: jeda + pemilik + hapus profil
await page.click("a[href='#/pengaturan']"); await page.waitForSelector(".dt-opts");
await page.locator(".dt-opt", { hasText: "Jeda sementara" }).click(); await sleep(1500);
check("status Jeda tersimpan di DB", (await svc.from("dating_event_participants").select("status").eq("profile_id", prof.data.id).eq("invitation_id", EV).single()).data?.status === "jeda");
await page.locator(".dt-opt", { hasText: "Aktif" }).click(); await sleep(1000);
await page.screenshot({ path: `${SHOTS}/pengaturan-desktop.png`, fullPage: true });
await page.click("button:has-text('Hapus profil')"); await page.click("dialog button:has-text('Hapus permanen')"); await sleep(2500);
check("hapus profil: data profil hilang dan persetujuan ditarik", ((await svc.from("dating_profiles").select("id").eq("user_id", xUser.id)).data || []).length === 0 && !!(await svc.from("dating_consents").select("withdrawn_at").eq("user_id", xUser.id)).data?.[0]?.withdrawn_at);

// 10. pemilik: panel pengaturan mengaktifkan/mematikan acara
{ const o = await newCtx({ viewport: { width: 1280, height: 900 } }); cur = "owner";
  await o.pg.goto(BASE + "/masuk"); await o.pg.fill("#email", `dtui.owner.${stamp}@uji.nusamora.test`); await o.pg.fill("#pw", PW); await o.pg.click("#go");
  await o.pg.waitForURL((u) => new URL(u).pathname !== "/masuk", { timeout: 20000 }).catch(() => {});
  await o.pg.goto(BASE + "/cari-teman#/pengaturan"); await o.pg.waitForSelector(".dt-inv", { timeout: 20000 });
  const row = o.pg.locator(".dt-inv", { hasText: "Uji UI Dating" }); await row.locator("button:has-text('Nonaktifkan')").click({ timeout: 10000 }).catch(() => {}); await sleep(1500);
  check("pemilik menonaktifkan acara lewat UI", (await rpc(Y.c, "dating_stats", { p_inv: EV })).data?.available === false);
  await row.locator("button:has-text('Aktifkan')").click({ timeout: 10000 }).catch(() => {}); await sleep(1500);
  check("pemilik mengaktifkan kembali lewat UI", (await rpc(Y.c, "dating_stats", { p_inv: EV })).data?.available === true);
  await o.ctx.close(); }

// 11. responsif: tanpa scroll horizontal di mobile/tablet/desktop (sebagai Yuni, sudah login)
for (const [name, vp] of [["mobile", { width: 390, height: 844 }], ["tablet", { width: 820, height: 1180 }], ["desktop", { width: 1366, height: 850 }]]) {
  const c = await newCtx({ viewport: vp, isMobile: name === "mobile", hasTouch: name !== "desktop" }); cur = "resp-" + name;
  await c.pg.goto(BASE + "/masuk?next=" + encodeURIComponent(L)); await c.pg.fill("#email", Y.email); await c.pg.fill("#pw", PW); await c.pg.click("#go");
  await c.pg.waitForURL((u) => new URL(u).pathname === "/cari-teman", { timeout: 20000 }).catch(() => {});
  const res = {};
  for (const [k, h] of [["landing", ""], ["jelajah", "#/jelajah"], ["match", "#/match"], ["pengaturan", "#/pengaturan"]]) {
    await c.pg.goto(BASE + L + h); await c.pg.waitForSelector(".dt-main > :not(.dt-sk)", { timeout: 15000 }).catch(() => {}); await sleep(900);
    res[k] = await c.pg.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);
    if (k === "jelajah" || k === "match") await c.pg.screenshot({ path: `${SHOTS}/${k}-${name}.png`, fullPage: true });
  }
  check(`responsif ${name} (${vp.width}px): tanpa scroll horizontal di semua halaman`, Object.values(res).every(Boolean), JSON.stringify(res));
  await c.ctx.close();
}

check("tidak ada galat JS/konsol", errs.length === 0, errs.slice(0, 4).join(" | "));
check("tidak ada pelanggaran CSP (kebijakan .htaccess)", viol.length === 0, JSON.stringify(viol.slice(0, 4)));
await browser.close(); srv.close();
for (const u of [Y, Z]) await svc.auth.admin.deleteUser(u.id).catch(() => {});
await svc.auth.admin.deleteUser(xUser.id).catch(() => {}); await svc.auth.admin.deleteUser(owner.id).catch(() => {});
await svc.from("dating_reports").delete().eq("invitation_id", EV);
for (const a of [av, av3]) if (a.data?.id) await svc.from("assets").delete().eq("id", a.data.id);
finish();
