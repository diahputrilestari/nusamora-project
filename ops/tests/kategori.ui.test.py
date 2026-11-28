#!/usr/bin/env python3
"""Uji halaman kategori template tanpa jaringan: server statis lokal meniru rewrite .htaccess (/template/<slug> -> prerender/kategori/<slug>.html).
Memeriksa konten TANPA JavaScript (seperti crawler), lalu filter/pencarian DENGAN JavaScript, galat konsol, dan tampilan ponsel.
Jalankan dari akar repo: python3 ops/tests/kategori.ui.test.py"""
import glob, http.server, os, re, socketserver, sys, threading
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
os.chdir(ROOT)
from playwright.sync_api import sync_playwright

class H(http.server.SimpleHTTPRequestHandler):
    def translate_path(self, path):
        p = path.split("?")[0]
        m = re.match(r"^/template/([a-z0-9-]+)/?$", p)
        if m and os.path.exists("prerender/kategori/%s.html" % m.group(1)): p = "/prerender/kategori/%s.html" % m.group(1)
        elif p == "/": p = "/index.html"
        return super().translate_path(p)
    def log_message(self, *a): pass
socketserver.TCPServer.allow_reuse_address = True
srv = socketserver.TCPServer(("127.0.0.1", 0), H); threading.Thread(target=srv.serve_forever, daemon=True).start()
base = "http://127.0.0.1:%d" % srv.server_address[1]
fails = 0
def ok(c, m):
    global fails
    print(("PASS " if c else "FAIL ") + m); fails += 0 if c else 1
slugs = sorted(os.path.basename(f)[:-5] for f in glob.glob("prerender/kategori/*.html"))
ok(len(slugs) == 6, "6 halaman kategori ada (%d)" % len(slugs))
with sync_playwright() as p:
    br = p.chromium.launch(args=["--no-sandbox"])
    # 1) JS mati: konten harus lengkap di HTML awal
    c1 = br.new_context(java_script_enabled=False); c1.route("**/*", lambda r: r.continue_() if "127.0.0.1" in r.request.url else r.abort())
    for s in slugs:
        q = c1.new_page(); resp = q.goto(base + "/template/" + s)
        t = q.evaluate("""() => ({h1: document.querySelectorAll('h1').length, cards: document.querySelectorAll('.tc').length,
          vis: [...document.querySelectorAll('.tc')].filter(e => e.offsetParent !== null).length, canon: (document.querySelector('link[rel=canonical]')||{}).href,
          imgs: [...document.querySelectorAll('.tc img')].filter(i => !i.getAttribute('src')).length, art: document.querySelectorAll('.kt-ac').length,
          cat: document.querySelectorAll('.kat-rc a').length, bc: document.querySelectorAll('.ar-bc li').length, ld: document.querySelectorAll('script[type="application/ld+json"]').length})""")
        ok(resp.status == 200 and t["h1"] == 1 and t["cards"] > 0 and t["vis"] == t["cards"] and t["imgs"] == 0 and t["art"] >= 3 and t["cat"] == 5 and t["bc"] == 3 and t["canon"].endswith("/template/" + s) and t["ld"] == 1,
           "tanpa JS /template/%s: %s" % (s, t))
        q.close()
    # 2) JS hidup: filter + cari + tanpa galat konsol
    c2 = br.new_context(viewport={"width": 390, "height": 844}, is_mobile=True); c2.route("**/*", lambda r: r.continue_() if "127.0.0.1" in r.request.url else r.abort())
    pg = c2.new_page(); errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.on("console", lambda m: errs.append(m.text) if m.type == "error" and "ERR_FAILED" not in m.text and "net::" not in m.text and "Failed to load resource" not in m.text else None)
    pg.goto(base + "/template/pernikahan"); pg.wait_for_load_state("domcontentloaded")
    tot = pg.locator(".tc").count()
    pg.click('.kat-f .ch[data-pk="luxe"]'); vis = pg.locator(".tc:not([hidden])").count()
    pk_ok = pg.evaluate("[...document.querySelectorAll('.tc:not([hidden])')].every(e=>e.dataset.pkg==='luxe')")
    ok(0 < vis < tot and pk_ok, "filter paket Luxe: %d dari %d" % (vis, tot))
    pg.click('.kat-f .ch[data-pk=""]'); pg.fill("#kat-q", "betawi"); v2 = pg.locator(".tc:not([hidden])").count()
    ok(0 < v2 < tot, "pencarian 'betawi': %d" % v2)
    pg.fill("#kat-q", "zzzzzz"); ok(pg.locator("#kat-e").is_visible() and pg.locator(".tc:not([hidden])").count() == 0, "keadaan kosong tampil")
    pg.fill("#kat-q", ""); ok(pg.locator(".tc:not([hidden])").count() == tot, "reset menampilkan semua")
    ov = pg.evaluate("document.documentElement.scrollWidth <= window.innerWidth + 1")
    ok(ov, "tanpa scroll horizontal di 390px")
    pg.screenshot(path="/tmp/kat-mobile.png"); ok(not errs, "tanpa galat konsol %s" % errs[:3])
    # 3) beranda menaut ke semua kategori
    pg.goto(base + "/"); hl = pg.evaluate("[...document.querySelectorAll('a[href^=\"/template/\"]')].map(a=>a.getAttribute('href'))")
    ok(all(("/template/" + s) in hl for s in slugs), "beranda menaut ke 6 kategori (%d tautan)" % len(hl))
    # 4) jalur lama tidak rusak: /template?paket= tetap file template.html
    r = pg.goto(base + "/template.html?paket=luxe"); ok(r.status == 200, "template.html (alur lama) masih ada")
    br.close()
print("%d gagal" % fails); sys.exit(1 if fails else 0)
