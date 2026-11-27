#!/usr/bin/env python3
"""Uji prarender artikel tanpa jaringan: Supabase di-stub, lalu snapshot diperiksa dengan JavaScript MATI
(seperti crawler yang tidak menjalankan JS). Jalankan: python3 ops/tests/prerender-artikel.ui.test.py"""
import importlib.util, json, os, sys
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
spec = importlib.util.spec_from_file_location("pre", os.path.join(ROOT, "ops", "seo", "prerender_artikel.py"))
pre = importlib.util.module_from_spec(spec); spec.loader.exec_module(pre)
from playwright.sync_api import sync_playwright

BODY = "Pembukaan artikel uji.\n\n## Ide perayaan\n\nIsi bagian **penting** dengan [tautan](/paket).\n\n- satu\n- dua\n\n## Pertanyaan yang sering diajukan\n\n### Apa itu uji?\n\nJawaban uji prarender.\n" + ("\nParagraf pengisi agar halaman cukup panjang untuk lolos pemeriksaan. " * 40)
ART = {"id": "1", "type": "article", "lang": "id", "slug": "artikel-uji-prarender", "title": "Artikel Uji Prarender untuk SEO", "excerpt": "Ringkasan uji.", "body": BODY,
       "noindex": False, "image_url": None, "seo_title": "Artikel Uji Prarender", "seo_description": "Deskripsi uji prarender artikel NusaMora untuk pemeriksaan otomatis.",
       "alternates": [], "updated_at": "2026-11-27T01:00:00Z", "og_image_url": None, "published_at": "2026-11-20T01:00:00Z", "canonical_url": None}
LIST = [dict(id=str(i), slug="artikel-uji-%d" % i, title="Artikel Uji %d" % i, excerpt="Ringkasan %d" % i, body=BODY, link_url=None, read_min=4, image_url=None, published_at="2026-11-0%dT01:00:00Z" % i) for i in range(1, 4)] + [{**ART, "link_url": None, "read_min": 4}]
STUB = """window.supabase={createClient:function(){var R=function(fn,a){var d=null;if(fn==='public_content')d=window.__ART;else if(fn==='public_content_list')d=a&&a.p_type==='banner'?[]:window.__LIST;return Promise.resolve({data:d,error:null})};
return {rpc:R,auth:{getSession:function(){return Promise.resolve({data:{session:null}})},getUser:function(){return Promise.resolve({data:{user:null}})},onAuthStateChange:function(){return{data:{subscription:{unsubscribe:function(){}}}}}},
from:function(){var q={select:function(){return q},eq:function(){return q},order:function(){return q},limit:function(){return q},maybeSingle:function(){return Promise.resolve({data:null})},then:function(f){return Promise.resolve({data:[],error:null}).then(f)}};return q}}}};"""

fails = 0
def ok(c, m):
    global fails
    print(("PASS " if c else "FAIL ") + m); fails += 0 if c else 1

srv = pre.serve(); base = "http://127.0.0.1:%d" % srv.server_address[1]
with sync_playwright() as p:
    br = p.chromium.launch(args=["--no-sandbox"])
    ctx = br.new_context()
    ctx.add_init_script("window.__ART=%s;window.__LIST=%s;" % (json.dumps(ART), json.dumps(LIST)))
    ctx.route("**/supabase.js", lambda r: r.fulfill(status=200, content_type="application/javascript", body=STUB))
    ctx.route("**/fonts.g*/**", lambda r: r.abort())
    pg = ctx.new_page()
    html, bad, info = pre.snapshot(pg, base, "/konten.html?type=article&slug=artikel-uji-prarender")
    ok(html is not None, "snapshot artikel lolos pemeriksaan %s" % (bad or ""))
    html_l, bad_l, _ = pre.snapshot(pg, base, "/konten.html?type=article", want_h1=False)
    ok(html_l is not None, "snapshot daftar artikel lolos %s" % (bad_l or ""))
    if html:
        open("/tmp/pre-artikel.html", "w").write(html)
        # periksa dengan JS mati, lewat file statis
        c2 = br.new_context(java_script_enabled=False); c2.route("**/*", lambda r: r.abort() if "127.0.0.1" not in r.request.url else r.continue_())
        os.makedirs(os.path.join(ROOT, "prerender", "_uji"), exist_ok=True)
        fp = os.path.join(ROOT, "prerender", "_uji", "a.html"); open(fp, "w").write(html)
        q = c2.new_page(); q.goto(base + "/prerender/_uji/a.html")
        t = q.evaluate("""() => ({title: document.title, robots: document.querySelector('meta[name=robots]').content, canon: document.querySelector('link[rel=canonical]').href,
          h1: (document.querySelector('h1')||{}).textContent, h2: [...document.querySelectorAll('h2')].map(x=>x.textContent), ld: [...document.querySelectorAll('script[type="application/ld+json"]')].map(s=>s.textContent).join(' '),
          txt: document.body.innerText.length, link: !!document.querySelector('a[href="/paket"]')})""")
        os.remove(fp); os.rmdir(os.path.dirname(fp))
        ok("Artikel Uji Prarender" in t["title"], "judul ada tanpa JS: %s" % t["title"])
        ok(t["robots"].startswith("index"), "robots index tanpa JS: %s" % t["robots"])
        ok(t["canon"] == "https://nusamora.com/artikel/artikel-uji-prarender", "canonical memakai domain produksi: %s" % t["canon"])
        ok(t["h1"] and "Uji Prarender" in t["h1"], "h1 ada tanpa JS")
        ok(any("Ide perayaan" in x for x in t["h2"]), "bagian isi (h2) ada tanpa JS")
        ok('"Article"' in t["ld"] and "FAQPage" in t["ld"], "JSON-LD Article + FAQPage ada tanpa JS")
        ok(t["link"], "tautan internal ada tanpa JS")
        ok(t["txt"] > 1500, "teks halaman cukup panjang tanpa JS (%d)" % t["txt"])
        ok("127.0.0.1" not in html, "tidak ada origin lokal tersisa")
    br.close()
print("SEMUA LULUS" if not fails else "GAGAL %d" % fails); sys.exit(1 if fails else 0)
