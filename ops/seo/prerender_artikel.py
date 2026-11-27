#!/usr/bin/env python3
"""Prarender halaman artikel NusaMora menjadi HTML statis (SEO).

Masalah: /artikel/<slug> dirender di sisi klien (konten.html + konten.js membaca Supabase), dan HTML awalnya
membawa <meta robots="noindex"> lalu diubah JS. Mesin pencari bisa melewatkan perubahan itu.

Cara kerja: tiap artikel yang tayang dibuka di Chromium lewat konten.html (konten.js dan data Supabase asli),
DOM hasil render disimpan sebagai prerender/artikel/<slug>.html, dan daftar artikel sebagai prerender/artikel/index.html.
.htaccess menyajikan file itu bila ada; bila tidak ada, jatuh ke konten.html seperti sebelumnya.
Skrip JS di halaman tetap jalan, jadi interaksi (suka, komentar, artikel terkait) tidak berubah.

Pemakaian:  python3 ops/seo/prerender_artikel.py [--only slug1,slug2] [--out prerender/artikel]
Butuh: pip install playwright && playwright install chromium. Jaringan ke Supabase.
"""
import argparse, functools, http.server, json, os, re, sys, threading, urllib.parse, urllib.request

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
SITE = "https://nusamora.com"


def read_config():
    s = open(os.path.join(ROOT, "assets", "config.js"), encoding="utf-8").read()
    g = lambda k: (re.search(k + r"\s*[:=]\s*[\"']([^\"']+)[\"']", s) or [None, ""])[1]
    return g("SUPABASE_URL"), g("SUPABASE_ANON_KEY")


def rpc(url, key, fn, body):
    req = urllib.request.Request(url + "/rest/v1/rpc/" + fn, data=json.dumps(body).encode(), method="POST",
                                 headers={"apikey": key, "Authorization": "Bearer " + key, "Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)


def serve(port=0):
    class H(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a): pass
    srv = http.server.ThreadingHTTPServer(("127.0.0.1", port), functools.partial(H, directory=ROOT))
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv


def finish(html, base):
    """Ganti origin lokal dengan domain produksi dan beri doctype."""
    html = html.replace(base, SITE)
    html = html.replace(urllib.parse.quote(base, safe=""), urllib.parse.quote(SITE, safe=""))  # tautan bagikan (URL ter-encode)
    return html if html.lstrip().lower().startswith("<!doctype") else "<!doctype html>\n" + html


def check(page, want_h1=True):
    """Kembalikan daftar masalah bila hasil render belum layak dijadikan snapshot."""
    info = page.evaluate("""() => ({
      title: document.title,
      robots: (document.querySelector('meta[name=robots]') || {}).content || '',
      canon: (document.querySelector('link[rel=canonical]') || {}).href || '',
      h1: !!document.querySelector('#view h1'),
      ld: document.querySelectorAll('script[type="application/ld+json"]').length,
      len: (document.getElementById('view') || {innerHTML: ''}).innerHTML.length })""")
    bad = []
    if info["title"].strip() in ("", "NusaMora"): bad.append("judul belum terisi")
    if "noindex" in info["robots"].lower(): bad.append("robots noindex")
    if want_h1 and not info["h1"]: bad.append("tidak ada h1")
    if not info["canon"]: bad.append("tidak ada canonical")
    if info["len"] < 1500: bad.append("isi terlalu pendek (%d)" % info["len"])
    return bad, info


def snapshot(page, base, path, want_h1=True):
    page.goto(base + path, wait_until="load")
    page.wait_for_selector("#view h1", timeout=20000)
    page.wait_for_load_state("networkidle", timeout=20000)
    bad, info = check(page, want_h1)
    return (None if bad else finish(page.content(), base)), bad, info


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", default="")
    ap.add_argument("--out", default=os.path.join("prerender", "artikel"))
    ap.add_argument("--slugs-from", default="", help="berkas JSON daftar slug (untuk uji tanpa jaringan)")
    a = ap.parse_args()
    url, key = read_config()
    if a.slugs_from:
        slugs = json.load(open(a.slugs_from))
    else:
        rows = rpc(url, key, "public_content_list", {"p_type": "article", "p_lang": "id", "p_limit": 500})
        slugs = [r["slug"] for r in rows if re.fullmatch(r"[a-z0-9]+(-[a-z0-9]+)*", r.get("slug") or "")]
    if a.only: slugs = [s for s in slugs if s in a.only.split(",")]
    if not slugs: sys.exit("Tidak ada artikel yang diambil. Dibatalkan agar snapshot lama tidak terhapus.")
    out = os.path.join(ROOT, a.out); os.makedirs(out, exist_ok=True)
    srv = serve(); base = "http://127.0.0.1:%d" % srv.server_address[1]
    from playwright.sync_api import sync_playwright
    ok, fail = [], []
    with sync_playwright() as p:
        br = p.chromium.launch(args=["--no-sandbox"])
        pg = br.new_page(viewport={"width": 1280, "height": 900})
        jobs = [("index", "/konten.html?type=article", False)] + [(s, "/konten.html?type=article&slug=" + s, True) for s in slugs]
        for name, path, h1 in jobs:
            try:
                html, bad, info = snapshot(pg, base, path, h1)
            except Exception as e:
                html, bad, info = None, ["error: %s" % str(e)[:120]], {}
            if html:
                open(os.path.join(out, name + ".html"), "w", encoding="utf-8").write(html); ok.append(name)
            else:
                fail.append((name, bad)); print("GAGAL", name, bad)
        br.close()
    if not a.only:  # hapus snapshot artikel yang sudah tidak tayang
        keep = set(slugs) | {"index"}
        for f in os.listdir(out):
            if f.endswith(".html") and f[:-5] not in keep: os.remove(os.path.join(out, f)); print("dihapus", f)
    print("Selesai: %d berhasil, %d gagal" % (len(ok), len(fail)))
    sys.exit(0 if not fail else 1)


if __name__ == "__main__":
    main()
