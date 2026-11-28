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
    if any(l == ORIGIN + u or l.startswith(ORIGIN + u + "?") or (u != "/template" and l.startswith(ORIGIN + u)) for l in locs): bad("sitemap memuat halaman privat/alur: " + u)
rb = rd("robots.txt")
if "Sitemap: %s/sitemap.xml" % ORIGIN not in rb: bad("robots.txt tanpa Sitemap yang benar")
if re.search(r"Disallow:\s*/(assets|prerender)?\s*$", rb, re.M) or re.search(r"Disallow:\s*/\s*$", rb, re.M): bad("robots.txt memblokir sumber daya penting")

# robots: tiru aturan Google (pola terpanjang menang; Allow menang bila sama panjang; mendukung $ dan *)
def robots_ok(path):
    best = (-1, True)
    for kind, pat in re.findall(r"^(Allow|Disallow):\s*(\S*)", rb, re.M | re.I):
        if not pat: continue
        rx = re.escape(pat).replace(r"\*", ".*").replace(r"\$", "$")
        if re.match(rx, path):
            L = len(pat.rstrip("$"))
            if L > best[0] or (L == best[0] and kind.lower() == "allow"): best = (L, kind.lower() == "allow")
    return best[1]
for pth, want in (("/template/pernikahan", True), ("/template", False), ("/template?paket=luxe", False), ("/buat?paket=luxe", False), ("/live/", False), ("/artikel", True), ("/", True)):
    if robots_ok(pth) != want: bad("robots: %s seharusnya %s" % (pth, "boleh dirayapi" if want else "diblokir"))

pages = {"/": "index.html", "/portofolio": "portofolio.html", "/kebijakan-privasi": "kebijakan-privasi.html", "/syarat-ketentuan": "syarat-ketentuan.html"}
for f in glob.glob("prerender/artikel/*.html"):
    s = os.path.basename(f)[:-5]; pages["/artikel" if s == "index" else "/artikel/" + s] = f
for f in glob.glob("prerender/kategori/*.html"): pages["/template/" + os.path.basename(f)[:-5]] = f
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
# ---- halaman kategori template ----
kat = sorted(u for u in pages if u.startswith("/template/"))
if not kat: bad("tidak ada halaman kategori template")
sm_kat = sorted(l.replace(ORIGIN, "") for l in locs if l.startswith(ORIGIN + "/template/"))
if sm_kat != kat: bad("sitemap kategori %s != file kategori %s" % (sm_kat, kat))
art_slugs = {u[len("/artikel/"):] for u in art}
rbody = {}
for u in kat:
    h = rd(pages[u]); o = info(pages[u]); body = re.sub(r"<script.*?</script>", "", h, flags=re.S)
    n_cards = len(re.findall(r'<article class="card tc', h))
    if n_cards < 1: bad("%s: katalog kosong (halaman kategori tidak boleh kosong)" % u)
    il = [x for x in re.findall(r'"numberOfItems":(\d+)', h)]
    if not il or int(il[0]) != n_cards: bad("%s: ItemList.numberOfItems %s != jumlah kartu %d" % (u, il, n_cards))
    for t in ("CollectionPage", "BreadcrumbList", "ItemList"):
        if t not in o["ld"]: bad("%s: JSON-LD %s tidak ada" % (u, t))
    if len(re.findall(r"<h2[\s>]", h)) < 4: bad("%s: struktur H2 kurang" % u)
    if len(re.findall(r'<nav class="ar-bc"', h)) != 1: bad("%s: breadcrumb tidak ada" % u)
    txt = re.sub(r"<[^>]+>", " ", body.split("<main")[1] if "<main" in body else body)
    if len(txt.split()) < 350: bad("%s: teks terlalu sedikit (%d kata)" % (u, len(txt.split())))
    rbody[u] = re.search(r'<section class="kat-intro"[^>]*>(.*?)</section>', h, re.S).group(1)
    if not o["links"] or not any(l.startswith("/artikel/") for l in o["links"]): bad("%s: tanpa tautan artikel terkait" % u)
    ra = re.findall(r'<a class="kt-ac" href="/artikel/([^"]+)"', h)
    if not ra: bad("%s: tanpa artikel terkait" % u)
    for x in ra:
        if x not in art_slugs: bad("%s: artikel terkait %s tidak ada" % (u, x))
    rc = re.findall(r'<ul class="kat-rc">(.*?)</ul>', h, re.S)
    rcs = re.findall(r'href="/template/([^"]+)"', rc[0]) if rc else []
    if not rcs or any(("/template/" + x) not in pages for x in rcs) or ("/template/" + u.split("/")[-1]) in [("/template/" + x) for x in rcs]: bad("%s: kategori terkait kosong/rusak/menaut diri sendiri" % u)
    if not re.search(r'href="/buat\?paket=(essential|signature|luxe)&amp;kategori=\w+&amp;template=', h): bad("%s: tautan Gunakan Template tidak ada" % u)
    if not any(l.rstrip("/") == u for l in info("index.html")["links"]): bad("%s: tidak ditautkan dari beranda" % u)
    if u not in [ORIGIN + x for x in []] and ORIGIN + u not in locs: bad("%s: tidak ada di sitemap" % u)
ks = list(rbody.values())
for i in range(len(kat)):
    for j in range(i + 1, len(kat)):
        if rbody[kat[i]] == rbody[kat[j]]: bad("intro sama: %s & %s" % (kat[i], kat[j]))
inbound = sum(1 for u, f in pages.items() if u.startswith("/artikel/") and any(l.split("?")[0].rstrip("/").startswith("/template/") for l in info(f)["links"]))
if inbound < 20: bad("tautan artikel -> kategori terlalu sedikit (%d)" % inbound)
for u in kat:
    if sum(1 for uu, f in pages.items() if uu != u and any(l.split("?")[0].rstrip("/") == u for l in info(f)["links"])) < 2: bad("%s: tautan masuk < 2 halaman" % u)
print("kategori: %d halaman | artikel yang menaut ke kategori: %d" % (len(kat), inbound))
print("halaman diaudit: %d | artikel: %d | URL sitemap: %d" % (len(pages), len(art), len(locs)))
for m in fails[:60]: print("GAGAL", m)
print("%d pelanggaran" % len(fails)); sys.exit(1 if fails else 0)
