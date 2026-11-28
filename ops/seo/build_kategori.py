#!/usr/bin/env python3
"""Bangun halaman landing kategori template (SEO) dari katalog template nyata.

Sumber data  : ops/seo/data/template-katalog.psv  (hasil tarik tabel `templates` Supabase)
               ops/seo/data/template-demo.psv     (URL demo non-default)
Keluaran     : prerender/kategori/<slug>.html     (disajikan di /template/<slug> oleh .htaccess)
               sitemap.xml                         (blok kategori diperbarui; lastmod dari updated_at nyata)

Jalankan ulang setiap katalog berubah:  python3 ops/seo/build_kategori.py
Kategori tanpa template TIDAK dibuat dan tidak masuk sitemap.
"""
import glob, html, json, os, re, sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
SITE = "https://nusamora.com"
STORE = "https://ixzmogwaaajkyltcnwaf.supabase.co/storage/v1/object/public/site-assets/"
PK = {"e": ("essential", "Essential"), "s": ("signature", "Signature"), "l": ("luxe", "Luxe")}
PKDESC = {
    "essential": "undangan website 2D yang ringan dan cepat dibuka, aktif 90 hari dengan 10 foto galeri",
    "signature": "film pembuka sinematik dengan scene 3D, aktif 180 hari dengan 20 foto galeri",
    "luxe": "venue virtual 3D tempat tamu memilih avatar dan berkeliling, aktif 365 hari dengan 40 foto galeri",
}
CKEY = {"w": "wedding", "b": "birthday", "e": "engagement", "g": "graduation", "a": "aqiqah", "s": "seminar", "c": "corporate", "o": "other"}

# slug halaman -> (kunci kategori di katalog, nama pendek, H1, title, kata kunci artikel terkait)
CATS = [
    dict(key="wedding", slug="pernikahan", name="Pernikahan", h1="Template Undangan Pernikahan Digital",
         title="Template Undangan Pernikahan Digital", kw=["pernikahan", "nikah", "wedding", "akad", "resepsi", "mempelai"],
         lead="Undangan pernikahan digital untuk akad, resepsi, dan syukuran, dari gaya adat daerah sampai film pembuka 3D.",
         body=[
             "Undangan pernikahan adalah kesan pertama tamu terhadap hari bahagia Anda. Di halaman ini ada {n} template pernikahan NusaMora yang bisa langsung dicoba demonya: ada tema adat Nusantara seperti Jawa, Betawi, Minang, dan Melayu, ada juga tema modern dan romantis dengan taman, pantai, atau istana sebagai latar.",
             "Setiap template dilengkapi susunan acara, peta lokasi, RSVP, dan buku ucapan. Anda memilih tingkat pengalaman yang cocok: {pk}.",
         ],
         tips=[
             ("Mulai dari suasana, bukan dari fitur", "Tentukan dulu suasana yang Anda mau: khidmat adat, hangat dan sederhana, atau megah dan sinematik. Suasana itu menyempitkan pilihan jauh lebih cepat daripada membandingkan fitur."),
             ("Cocokkan dengan tamu Anda", "Jika sebagian besar tamu membuka dari WhatsApp di ponsel, pilih Essential yang ringan. Jika Anda ingin tamu berkesan dan ada waktu untuk menontonnya, Signature atau Luxe layak dicoba."),
             ("Coba demo sebelum memutuskan", "Buka demo di ponsel, bukan hanya di komputer, karena sebagian besar tamu akan membukanya di sana."),
         ]),
    dict(key="birthday", slug="ulang-tahun", name="Ulang Tahun", h1="Template Undangan Ulang Tahun Digital",
         title="Template Undangan Ulang Tahun Digital", kw=["ulang tahun", "birthday", "ultah", "sweet seventeen", "sweet 17"],
         lead="Undangan ulang tahun digital untuk anak, remaja, hingga dewasa, dengan tema yang ceria dan mudah dibagikan.",
         body=[
             "Ulang tahun punya karakter yang berbeda dari pernikahan: lebih ringan, lebih ceria, dan sering bertema. Ada {n} template ulang tahun di NusaMora, dari tema karakter dan hobi anak sampai tema elegan untuk perayaan dewasa.",
             "Undangan dibagikan sebagai tautan lewat WhatsApp, lengkap dengan lokasi, jam acara, dan konfirmasi kehadiran. Pilihan paket: {pk}.",
         ],
         tips=[
             ("Samakan tema dengan pesta", "Pilih template yang warna dan temanya senada dengan dekorasi pesta, agar undangan terasa menjadi bagian dari acaranya."),
             ("Ulang tahun anak: pikirkan orang tua tamu", "Yang membuka undangan biasanya orang tua. Pastikan jam, alamat, dan kontak panitia mudah ditemukan."),
             ("Tema sinematik untuk momen besar", "Untuk ulang tahun yang dirayakan besar-besaran, template Signature atau Luxe memberi pembuka yang lebih berkesan."),
         ]),
    dict(key="engagement", slug="lamaran", name="Lamaran & Pertunangan", h1="Template Undangan Lamaran dan Pertunangan Digital",
         title="Template Undangan Lamaran & Pertunangan", kw=["lamaran", "tunangan", "pertunangan", "khitbah", "proposal"],
         lead="Undangan lamaran dan pertunangan digital yang hangat, untuk acara keluarga yang intim namun tetap berkesan.",
         body=[
             "Lamaran dan pertunangan biasanya dihadiri keluarga dan kerabat dekat. Karena itu undangannya perlu terasa personal dan jelas: siapa, kapan, di mana, dan bagaimana menghubungi keluarga. Tersedia {n} template yang bisa Anda pilih.",
             "Anda bisa memakai tema adat sesuai budaya keluarga atau tema modern yang sederhana. Pilihan paket: {pk}.",
         ],
         tips=[
             ("Sesuaikan dengan adat keluarga", "Pilih tema yang dekat dengan budaya kedua keluarga agar undangan terasa pantas bagi para sesepuh."),
             ("Daftar tamu kecil, undangan tetap rapi", "Meski tamunya sedikit, tautan pribadi per tamu membuat sapaan terasa hangat dan memudahkan Anda mencatat siapa yang hadir."),
             ("Pertimbangkan lanjutan ke pernikahan", "Jika setelah lamaran Anda akan membuat undangan pernikahan, memilih gaya yang serasi membuat rangkaian acara terasa utuh."),
         ]),
    dict(key="graduation", slug="wisuda", name="Wisuda", h1="Template Undangan Wisuda Digital",
         title="Template Undangan Wisuda Digital", kw=["wisuda", "graduation", "kelulusan", "lulus"],
         lead="Undangan wisuda dan syukuran kelulusan digital, praktis dibagikan ke keluarga, sahabat, dan dosen.",
         body=[
             "Wisuda adalah penutup perjalanan panjang, dan banyak yang ingin merayakannya bersama keluarga dan teman. Saat ini tersedia {n} template wisuda di NusaMora yang bisa dicoba demonya.",
             "Undangan memuat waktu, tempat, dan konfirmasi kehadiran, sehingga Anda tidak perlu mengirim pesan satu per satu. Pilihan paket: {pk}.",
         ],
         tips=[
             ("Cantumkan detail yang dibutuhkan tamu", "Tulis jam, lokasi, dan informasi parkir atau akses masuk jika acara berada di kampus atau gedung."),
             ("Libatkan foto", "Foto toga dan galeri kenangan membuat undangan terasa lebih personal."),
         ]),
    dict(key="aqiqah", slug="aqiqah", name="Aqiqah & Syukuran Kelahiran", h1="Template Undangan Aqiqah dan Syukuran Kelahiran Digital",
         title="Template Undangan Aqiqah Digital", kw=["aqiqah", "kelahiran", "bayi", "syukuran", "baby"],
         lead="Undangan aqiqah dan syukuran kelahiran digital yang khidmat, lembut, dan mudah dibagikan.",
         body=[
             "Aqiqah adalah wujud syukur atas kelahiran buah hati, dan undangannya sebaiknya terasa tenang, hangat, dan khidmat. NusaMora menyediakan {n} template aqiqah dengan nuansa lembut dan pilihan warna untuk putra maupun putri.",
             "Undangan memuat waktu, tempat, dan doa pembuka, lengkap dengan konfirmasi kehadiran. Pilihan paket: {pk}.",
         ],
         tips=[
             ("Pilih warna sesuai kebutuhan", "Tersedia tema berwarna biru, merah muda, dan netral. Pilih yang paling sesuai dengan suasana keluarga."),
             ("Perhatikan kenyamanan tamu", "Karena banyak tamu yang membawa anak kecil, tuliskan jam mulai dan selesai acara dengan jelas."),
             ("Bagikan lewat WhatsApp", "Tautan undangan cukup dikirim sekali; tamu bisa membuka, melihat lokasi, dan mengonfirmasi kehadiran dari satu halaman."),
         ]),
    dict(key="seminar", slug="seminar-workshop", name="Seminar & Workshop", h1="Template Undangan Seminar dan Workshop Digital",
         title="Template Undangan Seminar & Workshop", kw=["seminar", "workshop", "pelatihan", "webinar", "konferensi"],
         lead="Undangan seminar dan workshop digital yang rapi, dengan jadwal dan konfirmasi peserta.",
         body=[
             "Undangan seminar dan workshop perlu menyampaikan topik, pembicara, waktu, dan lokasi secara ringkas. Saat ini tersedia {n} template untuk kebutuhan ini di NusaMora.",
             "Peserta dapat mengonfirmasi kehadiran langsung dari undangan, sehingga Anda lebih mudah memperkirakan jumlah kursi dan konsumsi. Pilihan paket: {pk}.",
         ],
         tips=[
             ("Tonjolkan topik dan pembicara", "Peserta memutuskan hadir dari topik dan siapa yang berbicara. Letakkan keduanya di bagian atas."),
             ("Gunakan konfirmasi kehadiran", "Data konfirmasi membantu panitia menyiapkan kapasitas ruangan dan konsumsi."),
         ]),
    dict(key="corporate", slug="acara-perusahaan", name="Acara Perusahaan", h1="Template Undangan Acara Perusahaan Digital",
         title="Template Undangan Acara Perusahaan Digital", kw=["perusahaan", "corporate", "kantor", "gathering", "peluncuran", "pensiun", "launching", "karyawan"],
         lead="Undangan acara perusahaan digital untuk peluncuran, perayaan, dan pertemuan, dengan tampilan profesional.",
         body=[
             "Acara perusahaan seperti peluncuran produk, perayaan, atau pertemuan karyawan membutuhkan undangan yang rapi dan profesional. NusaMora menyediakan {n} template acara perusahaan yang bisa Anda sesuaikan dengan identitas acara.",
             "Tamu menerima tautan pribadi, melihat jadwal dan lokasi, lalu mengonfirmasi kehadiran. Pilihan paket: {pk}.",
         ],
         tips=[
             ("Jaga nada yang sesuai", "Pilih template yang bernuansa formal dan bersih jika tamunya mitra bisnis atau klien."),
             ("Kelola daftar tamu", "Tautan per tamu memudahkan Anda mengetahui siapa yang sudah membuka dan mengonfirmasi."),
         ]),
    dict(key="other", slug="acara-lainnya", name="Acara Lainnya", h1="Template Undangan Digital untuk Acara Lainnya",
         title="Template Undangan Digital Acara Lainnya", kw=["acara spesial", "perayaan", "kemerdekaan", "pameran", "reuni", "arisan", "syukuran"],
         lead="Undangan digital untuk perayaan di luar kategori utama: acara kemerdekaan, tema olahraga, pameran, dan lainnya.",
         body=[
             "Tidak semua acara masuk kategori pernikahan atau ulang tahun. Di sini terkumpul {n} template untuk perayaan lain, misalnya acara kemerdekaan, tema olahraga, dan perayaan komunitas.",
             "Setiap template tetap menyediakan jadwal, lokasi, dan konfirmasi kehadiran. Pilihan paket: {pk}.",
         ],
         tips=[
             ("Pilih tema yang paling mendekati acara Anda", "Jika tidak ada tema yang persis sama, pilih yang suasananya paling dekat; teks dan foto bisa Anda ganti sendiri."),
             ("Cek kategori lain", "Beberapa acara punya template di kategori yang lebih spesifik, misalnya ulang tahun atau acara perusahaan."),
         ]),
]
BYKEY = {c["key"]: c for c in CATS}


def esc(s):
    return html.escape(str(s), quote=True)


def thumb(t):
    t = t.strip()
    if t.startswith("~"):
        return STORE + t[1:]
    t = t.replace("/assets-essential/invite/themes/", "/assets/invite/themes/")
    return t


def read_psv(path, n):
    out = []
    for ln in open(path, encoding="utf-8").read().splitlines():
        if not ln.strip():
            continue
        p = ln.split("|", n - 1)
        out.append(p)
    return out


def load_templates():
    demos = {a: b for a, b in read_psv(os.path.join(ROOT, "ops/seo/data/template-demo.psv"), 2)}
    rows = []
    for slug, name, th, pk, cats, desc, upd in read_psv(os.path.join(ROOT, "ops/seo/data/template-katalog.psv"), 7):
        demo = demos.get(slug)
        if not demo:
            if pk == "l":
                demo = "/live/?venue=" + re.sub(r"^live-", "", slug)
            else:
                demo = "/preview?demo=" + slug
        d = desc.strip()
        if len(d) >= 100:
            d = d[:100].rsplit(" ", 1)[0].rstrip(",.;:- ") + "…"
        rows.append(dict(slug=slug, name=name.strip(), img=thumb(th), pkg=PK[pk][0], pkn=PK[pk][1],
                         cats=[CKEY[c] for c in cats], desc=d, upd=upd.strip(), demo=demo))
    return rows


def load_articles():
    arts = []
    for f in sorted(glob.glob(os.path.join(ROOT, "prerender/artikel/*.html"))):
        slug = os.path.basename(f)[:-5]
        if slug == "index":
            continue
        s = open(f, encoding="utf-8").read()
        h1 = re.search(r"<h1>(.*?)</h1>", s, re.S)
        ds = re.search(r'<p class="ar-lead">(.*?)</p>', s, re.S)
        if not h1:
            continue
        arts.append(dict(slug=slug, title=html.unescape(re.sub("<[^>]+>", "", h1.group(1))).strip(),
                         lead=html.unescape(re.sub("<[^>]+>", "", ds.group(1))).strip() if ds else ""))
    return arts


def related_articles(cat, arts, k=4):
    sc = []
    for a in arts:
        t = a["title"].lower()
        s = sum(2 for w in cat["kw"] if w in t)
        if s == 0:
            s = sum(1 for w in cat["kw"] if w in a["lead"].lower())
        if s:
            sc.append((-s, a["slug"], a))
    sc.sort(key=lambda x: (x[0], x[1]))
    return [x[2] for x in sc[:k]]


def pk_sentence(items):
    cnt = {}
    for t in items:
        cnt[t["pkg"]] = cnt.get(t["pkg"], 0) + 1
    parts = []
    for p in ("essential", "signature", "luxe"):
        if p in cnt:
            parts.append("%s (%s)" % (p.capitalize(), PKDESC[p]))
    if len(parts) == 1:
        return parts[0]
    return ", ".join(parts[:-1]) + ", dan " + parts[-1]


def card(t, cat):
    use = "/buat?paket=%s&amp;kategori=%s&amp;template=%s" % (t["pkg"], cat["key"], esc(t["slug"]))
    return (
        '<article class="card tc hov" data-pkg="%s" data-q="%s"><div class="im"><img src="%s" alt="Pratinjau template %s" width="640" height="400" loading="lazy" decoding="async">'
        '<span class="pkchip sm">%s</span></div><div class="bd"><h3>%s</h3><p>%s</p>'
        '<div class="two"><a class="btn o" target="_blank" rel="noopener" href="%s">Coba Demo</a>'
        '<a class="btn" href="%s">Gunakan Template</a></div></div></article>'
    ) % (t["pkg"], esc((t["name"] + " " + t["desc"]).lower()), esc(t["img"]), esc(t["name"]), esc(t["pkn"]), esc(t["name"]), esc(t["desc"]), esc(t["demo"]), use)


def page(cat, items, arts, allcats):
    url = "%s/template/%s" % (SITE, cat["slug"])
    n = len(items)
    pks = pk_sentence(items)
    title = "%s (%d Desain) | NusaMora" % (cat["title"], n)
    desc = "%s %d template siap pakai, bisa dicoba demonya dulu. Pilih Essential, Signature, atau Luxe." % (cat["lead"], n)
    if len(desc) > 165:
        desc = "%d template %s siap pakai, bisa dicoba demonya dulu. Pilih paket Essential, Signature, atau Luxe." % (n, cat["title"].replace("Template ", "").lower())
    upd = max(t["upd"] for t in items)
    rel = related_articles(cat, arts)
    others = [c for c in allcats if c["key"] != cat["key"]]
    og_img = items[0]["img"] if items[0]["img"].startswith("http") else SITE + items[0]["img"].split("?")[0]

    counts = {p: sum(1 for t in items if t["pkg"] == p) for p in ("essential", "signature", "luxe")}
    chips = '<button type="button" class="ch" data-pk="" aria-pressed="true">Semua (%d)</button>' % n
    for p in ("essential", "signature", "luxe"):
        if counts[p]:
            chips += '<button type="button" class="ch" data-pk="%s" aria-pressed="false">%s (%d)</button>' % (p, p.capitalize(), counts[p])

    ld = [
        {"@context": "https://schema.org", "@type": "CollectionPage", "name": cat["h1"], "description": desc, "url": url, "inLanguage": "id",
         "dateModified": upd, "isPartOf": {"@type": "WebSite", "name": "NusaMora", "url": SITE + "/"}},
        {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "Beranda", "item": SITE + "/"},
            {"@type": "ListItem", "position": 2, "name": cat["name"], "item": url}]},
        {"@context": "https://schema.org", "@type": "ItemList", "name": cat["h1"], "numberOfItems": n, "itemListElement": [
            {"@type": "ListItem", "position": i + 1, "name": t["name"], "image": t["img"] if t["img"].startswith("http") else SITE + t["img"].split("?")[0]}
            for i, t in enumerate(items)]},
    ]

    body = "".join("<p>%s</p>" % esc(p.format(n=n, pk=pks)) for p in cat["body"])
    for o in allcats:
        if o["key"] == cat["key"]:
            continue
        both = [t for t in items if o["key"] in t["cats"]]
        if len(both) * 2 >= n and len(both) >= 5:
            body += '<p>%d dari %d template di halaman ini juga cocok untuk <a href="/template/%s">%s</a>, karena tema yang sama sering dipakai untuk kedua acara. Template yang dibuat khusus untuk %s tampil lebih dulu.</p>' % (len(both), n, o["slug"], esc(o["name"].lower()), esc(cat["name"].lower()))
    tips = "".join("<li><h3>%s</h3><p>%s</p></li>" % (esc(a), esc(b)) for a, b in cat["tips"])
    relart = "".join(
        '<a class="kt-ac" href="/artikel/%s"><div class="kt-cb"><h3>%s</h3><p class="kt-ex">%s</p></div></a>' % (a["slug"], esc(a["title"]), esc(a["lead"]))
        for a in rel)
    relcat = "".join(
        '<li><a class="ch" href="/template/%s">%s <small>(%d)</small></a></li>' % (c["slug"], esc(c["name"]), c["n"]) for c in others)

    h = []
    h.append('<!DOCTYPE html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">')
    h.append("<title>%s</title>" % esc(title))
    h.append('<meta name="description" content="%s"><meta name="robots" content="index,follow">' % esc(desc))
    h.append('<meta name="theme-color" content="#7552A8"><link rel="icon" href="/assets/logo-icon.png?v=1" type="image/png" sizes="256x256"><link rel="apple-touch-icon" href="/assets/logo-icon.png?v=1">')
    h.append('<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>')
    h.append('<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&amp;family=Playfair+Display:ital,wght@0,600;0,700;1,600&amp;display=swap">')
    h.append('<link rel="stylesheet" href="/assets/dashboard.css?v=4"><link rel="stylesheet" href="/assets/flow.css?v=21"><link rel="stylesheet" href="/assets/konten.css?v=6"><link rel="stylesheet" href="/assets/kategori.css?v=1"><link rel="stylesheet" href="/assets/logo.css?v=1">')
    h.append('<meta property="og:type" content="website"><meta property="og:site_name" content="NusaMora"><meta property="og:title" content="%s"><meta property="og:description" content="%s"><meta property="og:locale" content="id_ID"><meta property="og:url" content="%s"><meta property="og:image" content="%s">' % (esc(title), esc(desc), url, esc(og_img)))
    h.append('<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="%s"><meta name="twitter:description" content="%s"><meta name="twitter:image" content="%s">' % (esc(title), esc(desc), esc(og_img)))
    h.append('<link rel="canonical" href="%s">' % url)
    h.append('<script type="application/ld+json">%s</script></head>' % json.dumps(ld, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/"))
    h.append('<body class="flow kt kat" data-page="kategori"><a class="skip" href="#view">Lewati ke konten</a>')
    h.append('<header class="fh"><div class="fh-in"><a class="brand" href="/" aria-label="NusaMora, ke beranda"><img src="/assets/logo-nusamora-sm.webp?v=1" alt="NusaMora" width="640" height="312" decoding="async"></a>'
             '<nav class="fh-r kt-nav" aria-label="Informasi"><a href="/artikel">Artikel</a><a href="/bantuan">Bantuan</a><a href="/tutorial">Tutorial</a><a class="btn o sm" href="/masuk">Masuk</a></nav></div></header>')
    h.append('<main id="view" tabindex="-1"><div class="kat-w">')
    h.append('<nav class="ar-bc" aria-label="Breadcrumb"><ol><li><a href="/">Beranda</a></li><li><a href="/#template">Template</a></li><li aria-current="page"><span>%s</span></li></ol></nav>' % esc(cat["name"]))
    h.append('<header class="kat-h"><h1>%s</h1><p class="kat-lead">%s</p></header>' % (esc(cat["h1"]), esc(cat["lead"])))
    h.append('<section class="kat-intro" aria-label="Tentang kategori">%s</section>' % body)
    h.append('<section aria-labelledby="kat-kt"><h2 id="kat-kt">%d template %s</h2>' % (n, esc(cat["name"].lower())))
    h.append('<div class="kat-f"><div class="chs" role="group" aria-label="Filter paket">%s</div>'
             '<label class="kat-s"><span class="sr">Cari template</span><input type="search" id="kat-q" placeholder="Cari nama template" autocomplete="off"></label></div>' % chips)
    h.append('<p class="fltn" id="kat-n" role="status" aria-live="polite">Menampilkan %d dari %d template</p>' % (n, n))
    h.append('<div class="tg" id="kat-g">%s</div>' % "".join(card(t, cat) for t in items))
    h.append('<p class="kat-empty" id="kat-e" hidden>Tidak ada template yang cocok. Coba kata kunci lain atau pilih "Semua".</p></section>')
    h.append('<section class="kat-tips" aria-labelledby="kat-tp"><h2 id="kat-tp">Cara memilih template %s</h2><ol>%s</ol></section>' % (esc(cat["name"].lower()), tips))
    if relart:
        h.append('<section aria-labelledby="kat-ra"><h2 id="kat-ra">Panduan terkait</h2><div class="kt-grid kat-ra">%s</div></section>' % relart)
    h.append('<section aria-labelledby="kat-rc"><h2 id="kat-rc">Kategori template lainnya</h2><ul class="kat-rc">%s</ul></section>' % relcat)
    h.append('<aside class="ar-promo" aria-labelledby="kat-ph"><div><p class="ar-pe">NusaMora</p><h2 id="kat-ph">Coba demo dulu, bayar saat Anda siap</h2><p>Pilih template, isi data, lalu bagikan link pribadi ke tiap tamu.</p></div>'
             '<div class="ar-pa"><a class="btn lg ar-pb" href="/#template">Lihat paket dan harga</a></div></aside>')
    h.append("</div></main>")
    h.append('<script src="/assets/config.js"></script><script src="/assets/analytics.js?v=1" defer></script><script src="/assets/kategori.js?v=1" defer></script>')
    h.append("</body></html>")
    return "".join(h), upd


# Urutan HARUS sama dengan TPLK di assets/artikel-detail.js (tautan artikel -> kategori template)
ARTIKEL_KAT = [("aqiqah", "Aqiqah", r"aqiqah|kelahiran|bayi"), ("wisuda", "Wisuda", r"wisuda|graduation|kelulusan"),
               ("seminar-workshop", "Seminar &amp; Workshop", r"seminar|workshop|webinar"), ("lamaran", "Lamaran &amp; Pertunangan", r"lamaran|tunangan|proposal"),
               ("ulang-tahun", "Ulang Tahun", r"ulang tahun|birthday|ultah|sweet seventeen"), ("pernikahan", "Pernikahan", r"pernikahan|wedding|nikah"),
               ("acara-perusahaan", "Acara Perusahaan", r"perusahaan|corporate|gathering|retirement")]


def link_artikel(live_slugs):
    """Sisipkan tautan artikel -> kategori ke snapshot artikel (sama dengan yang dibuat JS saat dirender). Idempoten."""
    n = 0
    for f in sorted(glob.glob(os.path.join(ROOT, "prerender/artikel/*.html"))):
        if f.endswith("index.html"):
            continue
        s = open(f, encoding="utf-8").read()
        s2 = re.sub(r'<a class="ar-pl" href="/template/[^"]*">.*?</a>(?=</div></aside>)', "", s, flags=re.S)
        m = re.search(r"<h1>(.*?)</h1>", s2, re.S)
        sv = re.search(r'(<a class="ar-pl" href="/live/">.*?(<svg.*?</svg>)</a>)(</div></aside>)', s2, re.S)
        if m and sv:
            title = html.unescape(re.sub("<[^>]+>", "", m.group(1)))
            for slug, nm, rx in ARTIKEL_KAT:
                if slug in live_slugs and re.search(rx, title, re.I):
                    a = '<a class="ar-pl" href="/template/%s">Lihat template undangan %s %s</a>' % (slug, nm, sv.group(2))
                    s2 = s2.replace(sv.group(0), sv.group(1) + a + sv.group(3), 1)
                    n += 1
                    break
        s2 = s2.replace("/assets/artikel-detail.js?v=3", "/assets/artikel-detail.js?v=4")
        if s2 != s:
            open(f, "w", encoding="utf-8", newline="").write(s2)
    return n


def main():
    tpl = load_templates()
    arts = load_articles()
    built = []
    for c in CATS:
        items = [t for t in tpl if c["key"] in t["cats"]]
        items.sort(key=lambda t: len(t["cats"]))  # template khusus kategori ini tampil lebih dulu (sort stabil)
        c["n"] = len(items)
        c["items"] = items
    live = [c for c in CATS if c["n"] > 0]  # tidak ada halaman kosong
    outdir = os.path.join(ROOT, "prerender/kategori")
    os.makedirs(outdir, exist_ok=True)
    for f in glob.glob(os.path.join(outdir, "*.html")):
        os.remove(f)
    for c in live:
        doc, upd = page(c, c["items"], arts, live)
        open(os.path.join(outdir, c["slug"] + ".html"), "w", encoding="utf-8").write(doc)
        built.append((c["slug"], c["n"], upd))
        print("%-18s %3d template  lastmod %s  %d artikel terkait" % (c["slug"], c["n"], upd, len(related_articles(c, arts))))
    print("artikel -> kategori: %d tautan" % link_artikel({c["slug"] for c in live}))
    # sitemap
    sm = os.path.join(ROOT, "sitemap.xml")
    s = open(sm, encoding="utf-8").read()
    s = re.sub(r"\s*<url><loc>%s/template/[^<]*</loc>.*?</url>" % re.escape(SITE), "", s, flags=re.S)
    block = "".join('\n  <url><loc>%s/template/%s</loc><lastmod>%s</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>' % (SITE, slug, upd) for slug, _, upd in built)
    s = s.replace("</urlset>", "").rstrip() + block + "\n</urlset>\n"
    open(sm, "w", encoding="utf-8").write(s)
    print("sitemap: %d URL kategori" % len(built))


if __name__ == "__main__":
    sys.exit(main())
