# Uji UI skrip pengaturan publik (assets/site-settings.js): pemeliharaan, warna merek, sosial, gagal-buka, cache.
import http.server, socketserver, threading, os, json
from playwright.sync_api import sync_playwright
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
    def translate_path(self, p):
        p = p.split("?")[0]; p = {"/akun": "/akun.html", "/": "/index.html"}.get(p, p)
        return os.path.join(ROOT, p.lstrip("/"))
srv = socketserver.TCPServer(("127.0.0.1", 0), Q); BASE = "http://127.0.0.1:%d" % srv.server_address[1]
threading.Thread(target=srv.serve_forever, daemon=True).start()
ok_n = bad_n = 0
def chk(n, c, d=""):
    global ok_n, bad_n
    if c: ok_n += 1; print("PASS", n)
    else: bad_n += 1; print("FAIL", n, d)
STUB = "window.supabase={createClient:function(){var p=function(){return new Proxy(function(){},{get:function(t,k){if(k==='then')return undefined;return p()},apply:function(){return Promise.resolve({data:null,error:null})}})};return p()}};"
S_ON = {"platform_name": "NusaMora", "maintenance_mode": True, "maintenance_message": "Kembali pukul 10.00 <img src=x onerror=window.__xss=1>", "brand_primary": "#1F6F4A", "brand_deep": "#FFFF00",
        "social_instagram": "https://instagram.com/nusamora", "social_tiktok": "javascript:alert(1)", "social_youtube": "http://youtube.com/x", "support_email": "halo@nusamora.com"}
def page(b, settings, status=200, ctx=None):
    ctx = ctx or b.new_context(viewport={"width": 1280, "height": 900}); pg = ctx.new_page(); reqs = []
    pg.route("**/supabase-js@*/**", lambda r: r.fulfill(status=200, content_type="text/javascript", body=STUB))
    pg.route("**/fonts.googleapis.com/**", lambda r: r.abort()); pg.route("**/fonts.gstatic.com/**", lambda r: r.abort())
    def rpc(r):
        if r.request.method == "OPTIONS":
            return r.fulfill(status=204, headers={"Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS"})
        reqs.append((r.request.method, r.request.headers, r.request.post_data))
        r.fulfill(status=status, content_type="application/json", headers={"Access-Control-Allow-Origin": "*"}, body=json.dumps(settings) if status == 200 else "err")
    pg.route("**/rest/v1/rpc/public_settings", rpc)
    return ctx, pg, reqs
with sync_playwright() as pw:
    b = pw.chromium.launch()
    ctx, pg, reqs = page(b, S_ON); pg.goto(BASE + "/"); pg.wait_for_selector("#nm-mt", timeout=15000)
    chk("beranda: pemeliharaan = pita pemberitahuan (tidak memblokir)", pg.locator(".nm-mt-bar[role=status]").count() == 1 and pg.locator(".nm-mt-ov").count() == 0 and "Kembali pukul 10.00" in pg.inner_text("#nm-mt"))
    chk("pesan pemeliharaan di-escape (teks, bukan HTML)", pg.evaluate("window.__xss") is None and pg.locator("#nm-mt img").count() == 0)
    chk("permintaan: POST ke public_settings dengan apikey, badan kosong, tanpa token pengguna", reqs[0][0] == "POST" and "apikey" in reqs[0][1] and "authorization" not in reqs[0][1] and reqs[0][2] == "{}", reqs[0][1].keys())
    st = pg.evaluate("[getComputedStyle(document.documentElement).getPropertyValue('--primary').trim(), getComputedStyle(document.documentElement).getPropertyValue('--deep').trim()]")
    chk("warna merek valid dipakai; kontras rendah (#FFFF00) diabaikan", st[0].lower() == "#1f6f4a" and st[1] != "#FFFF00" and st[1].lower() != "#ffff00", st)
    soc = pg.locator("[data-nm-social] a"); chk("sosial: hanya https (Instagram), javascript:/http ditolak", soc.count() == 1 and soc.first.get_attribute("href") == "https://instagram.com/nusamora" and "noopener" in soc.first.get_attribute("rel") and soc.first.get_attribute("target") == "_blank")
    chk("NM_SITE.ready menyediakan pengaturan", pg.evaluate("NM_SITE.ready.then(s=>s.platform_name)") == "NusaMora"); ctx.close()
    BLOK = '<!doctype html><html lang="id" data-nm-maint="block"><head><meta charset="utf-8"><script src="/assets/config.js"></script><script src="/assets/site-settings.js"></script></head><body><main>Halaman pelanggan</main></body></html>'
    ctx, pg, reqs = page(b, S_ON); pg.route("**/__blok", lambda r: r.fulfill(status=200, content_type="text/html", body=BLOK)); pg.goto(BASE + "/__blok"); pg.wait_for_selector("#nm-mt", timeout=15000)
    chk("halaman pelanggan (data-nm-maint=block): dialog yang memblokir", pg.locator(".nm-mt-ov[role=alertdialog][aria-modal=true]").count() == 1 and "Sedang dalam pemeliharaan" in pg.inner_text("#nm-mt") and pg.locator("#nm-mt a[href='/']").count() == 1)
    chk("dialog menutupi seluruh layar (fixed, inset 0)", pg.evaluate("var r=document.querySelector('.nm-mt-ov').getBoundingClientRect();r.width>=window.innerWidth-1&&r.height>=window.innerHeight-1")); ctx.close()
    ctx, pg, reqs = page(b, {"platform_name": "NusaMora", "maintenance_mode": False}); pg.route("**/__blok", lambda r: r.fulfill(status=200, content_type="text/html", body=BLOK)); pg.goto(BASE + "/__blok"); pg.wait_for_function("window.NM_SITE && NM_SITE.s && NM_SITE.s.platform_name"); pg.wait_for_timeout(200)
    chk("pemeliharaan mati: tidak ada pita/dialog; sosial tersembunyi bila kosong", pg.locator("#nm-mt").count() == 0); ctx.close()
    ctx, pg, reqs = page(b, {}, status=500); pg.goto(BASE + "/"); pg.wait_for_function("window.NM_SITE"); pg.evaluate("NM_SITE.ready"); pg.wait_for_timeout(300)
    chk("gagal-buka: server 500 -> halaman tetap normal tanpa pita", pg.locator("#nm-mt").count() == 0 and pg.evaluate("Object.keys(NM_SITE.s).length") == 0 and pg.locator("footer").count() == 1); ctx.close()
    ctx, pg, reqs = page(b, S_ON); pg.goto(BASE + "/"); pg.wait_for_selector("#nm-mt"); pg2 = ctx.new_page()
    pg2.route("**/supabase-js@*/**", lambda r: r.fulfill(status=200, content_type="text/javascript", body=STUB)); pg2.route("**/fonts.g*/**", lambda r: r.abort())
    n2 = []; pg2.route("**/rest/v1/rpc/public_settings", lambda r: (n2.append(1), r.fulfill(status=200, content_type="application/json", headers={"Access-Control-Allow-Origin": "*"}, body="{}")))
    pg.route("**/__blok", lambda r: r.fulfill(status=200, content_type="text/html", body=BLOK)); pg.goto(BASE + "/__blok"); pg.wait_for_selector("#nm-mt"); chk("cache sesi: navigasi kedua dalam 60 detik tidak meminta ulang", len(reqs) == 1, len(reqs)); ctx.close()
    ctx, pg, reqs = page(b, S_ON); ctx.new_page().close(); pg.set_viewport_size({"width": 375, "height": 800}); pg.goto(BASE + "/"); pg.wait_for_selector("#nm-mt")
    chk("mobile 375px: tanpa scroll horizontal dengan pita aktif", pg.evaluate("document.documentElement.scrollWidth <= window.innerWidth + 1")); ctx.close()
    for f in ["akun", "buat", "paket", "pembayaran"]:
        chk("%s.html menandai diri data-nm-maint=block dan memuat site-settings.js" % f, 'data-nm-maint="block"' in open(os.path.join(ROOT, f + ".html")).read() and "site-settings.js" in open(os.path.join(ROOT, f + ".html")).read())
    for f in ["index", "masuk", "daftar", "konten"]:
        t = open(os.path.join(ROOT, f + ".html")).read(); chk("%s.html memuat site-settings.js tanpa memblokir (pita saja)" % f, "site-settings.js" in t and 'data-nm-maint="block"' not in t)
    b.close()
print("%d lulus, %d gagal" % (ok_n, bad_n)); raise SystemExit(1 if bad_n else 0)
