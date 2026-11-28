#!/usr/bin/env python3
"""Audit SEO statis (tanpa jaringan): metadata, canonical, H1, Open Graph, JSON-LD, sitemap, robots, tautan internal.
Jalankan dari akar repo: python3 ops/tests/seo-audit.py  (keluar 1 bila ada pelanggaran)."""
import glob, html, json, os, re, sys
ORIGIN = "https://nusamora.com"
fails = []
def rd(p): return open(p, encoding="utf-8", errors="replace").read()
def meta(h, attr, val):
    for m in re.finditer(r"<meta\s[^>]*>", h, re.I):
        t = m.group(0)
        if re.search(r'%s=(["\'])%s\1' % (attr, re.escape(val)), t, re.I):
            c = re.search(r'content=(["\'])(.*?)\1', t, re.I | re.S)
            return html.unescape(c.group(2)) if c else ""
    return None
def info(p):
    h = rd(p); o = {}
    t = re.search(r"<title[^>]*>(.*?)</title>", h, re.S | re.I); o["title"] = html.unescape(t.group(1).strip()) if t else ""
    o["desc"] = meta(h, "name", "description") or ""; o["robots"] = meta(h, "name", "robots") or ""
    c = re.search(r'<link[^>]+rel=["\']canonical["\'][^>]*>', h, re.I); o["canon"] = re.search(r'href=["\']([^"\']*)', c.group(0)).group(1) if c else ""
    o["h1"] = len(re.findall(r"<h1[\s>]", h, re.I)); o["og"] = {k: meta(h, "property", k) for k in ("og:title", "og:description", "og:image", "og:url")}
    o["ld"] = []
    for m in re.finditer(r'<script[^>]+application/ld\+json[^>]*>(.*?)</script>', h, re.S | re.I):
        try:
            j = json.loads(m.group(1))
            for x in (j if isinstance(j, list) else j.get("@graph", [j])): o["ld"].append(x.get("@type"))
        except Exception: fails.append("%s: JSON-LD tidak valid" % p)
    o["links"] = re.findall(r'<a[^>]+href=["\']([^"\'#][^"\']*)["\']', h, re.I)
    return o
def bad(msg): fails.append(msg)

sm = open("sitemap.xml", encoding="utf-8").read(); locs = re.findall(r"<loc>([^<]+)</loc>", sm)
if len(locs) != len(set(locs)): bad("sitemap: URL ganda")
for u in locs:
    if not u.startswith(ORIGIN) or "?" in u or u.endswith(".html"): bad("sitemap: URL tidak kanonik %s" % u)
for u in ("/admin", "/akun", "/masuk", "/daftar", "/paket", "/template", "/buat", "/editor", "/preview", "/pembayaran", "/live"):
    if any(l.startswith(ORIGIN + u) for l in locs): bad("sitemap memuat halaman privat/alur: " + u)
rb = rd("robots.txt")
if "Sitemap: %s/sitemap.xml" % ORIGIN not in rb: bad("robots.txt tanpa Sitemap yang benar")
if re.search(r"Disallow:\s*/(assets|prerender)?\s*$", rb, re.M) or re.search(r"Disallow:\s*/\s*$", rb, re.M): bad("robots.txt memblokir sumber daya penting")

pages = {"/": "index.html", "/portofolio": "portofolio.html", "/kebijakan-privasi": "kebijakan-privasi.html", "/syarat-ketentuan": "syarat-ketentuan.html"}
for f in glob.glob("prerender/artikel/*.html"):
    s = os.path.basename(f)[:-5]; pages["/artikel" if s == "index" else "/artikel/" + s] = f
seen_t, seen_d = {}, {}
for u, f in sorted(pages.items()):
    o = info(f); full = ORIGIN + (u if u != "/" else "/")
    if not o["title"] or len(o["title"]) > 65: bad("%s: judul kosong/terlalu panjang (%d)" % (u, len(o["title"])))
    if not (70 <= len(o["desc"]) <= 165): bad("%s: panjang deskripsi %d di luar 70-165" % (u, len(o["desc"])))
    if o["h1"] != 1: bad("%s: jumlah H1 = %d" % (u, o["h1"]))
    if o["canon"] != full: bad("%s: canonical %r != %r" % (u, o["canon"], full))
    if "noindex" in o["robots"]: bad("%s: noindex pada halaman yang indeksabel" % u)
    for k in ("og:title", "og:description", "og:image", "og:url"):
        if not o["og"][k]: bad("%s: %s hilang" % (u, k))
    if o["og"]["og:url"] and o["og"]["og:url"] != full: bad("%s: og:url berbeda dari canonical" % u)
    if full not in locs and u != "/artikel": bad("%s: tidak ada di sitemap" % u)
    if o["title"] in seen_t: bad("%s: judul sama dengan %s" % (u, seen_t[o["title"]]))
    if o["desc"] in seen_d: bad("%s: deskripsi sama dengan %s" % (u, seen_d[o["desc"]]))
    seen_t[o["title"]] = u; seen_d[o["desc"]] = u
home = info("index.html")
if "Organization" not in home["ld"] or "WebSite" not in home["ld"]: bad("beranda tanpa Organization/WebSite")
if not any(l.split("?")[0].rstrip("/") == "/artikel" for l in home["links"]): bad("beranda tidak menautkan /artikel")
art = [u for u in pages if u.startswith("/artikel/")]
inl = {u: 0 for u in art}
for u, f in pages.items():
    for l in info(f)["links"]:
        l = l.replace(ORIGIN, "").split("?")[0].split("#")[0].rstrip("/")
        if l in inl and l != u: inl[l] += 1
for u in art:
    if inl[u] == 0: bad("%s: yatim (tidak ada tautan masuk statis)" % u)
for u in art:
    ld = info(pages[u])["ld"]
    if "Article" not in ld or "BreadcrumbList" not in ld: bad("%s: JSON-LD Article/BreadcrumbList kurang" % u)
print("halaman diaudit: %d | artikel: %d | URL sitemap: %d" % (len(pages), len(art), len(locs)))
for m in fails[:60]: print("GAGAL", m)
print("%d pelanggaran" % len(fails)); sys.exit(1 if fails else 0)
