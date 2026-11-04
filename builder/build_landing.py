#!/usr/bin/env python3
"""NusaMora landing page builder.
Usage: python3 build.py project <outdir>   -> index.html + assets/landing.css + assets/landing.js (+ SEO files)
       python3 build.py artifact <outfile> -> single fragment (inline CSS/JS) for the claude.ai preview
Content lives in DATA below; every section is a small function (component)."""
import sys, json, html, os, re
E = html.escape
SITE = "https://nusamora.com"
MODE = sys.argv[1] if len(sys.argv) > 1 else "project"

LINK = ({"demo_garden": "/live/", "demo_jawa": "/live/jawa-tengah"} if MODE == "project" else
        {"demo_garden": "https://claude.ai/artifact/5TM1uJWDJQDzRSSacAJDFU", "demo_jawa": "https://claude.ai/artifact/AYBPxMPkKJ4PKssZ8aE9yj"})

# ---------------------------------------------------------------- DATA
EVENTS = [  # id, label, icon
    ("pernikahan", "Pernikahan", "heart"), ("ulangtahun", "Ulang Tahun", "gift"), ("wisuda", "Wisuda", "cap"),
    ("seminar", "Seminar & Workshop", "calstar"), ("corporate", "Corporate Event", "building"), ("lainnya", "Lainnya", "grid")]
TEMPLATES = [
    dict(id="romantic-garden", name="Romantic Garden", events=["pernikahan", "ulangtahun"], tags=["Pernikahan", "Pertunangan", "Ulang Tahun"],
         desc="Taman bunga blush dan lavender dengan gazebo kaca. Lembut, romantis, dan cocok untuk acara yang hangat.",
         img="assets/img/romantic-garden-s1.webp", imgm="assets/img/romantic-garden-m.webp", demo=LINK["demo_garden"], accent="#C76A86"),
    dict(id="jawa-tengah", name="Adat Jawa Tengah", events=["pernikahan"], tags=["Pernikahan", "Pertunangan"],
         desc="Pendopo joglo, pelaminan emas, batik kawung, serta avatar kebaya dan beskap. Nuansa adat yang hangat dan megah.",
         img="assets/img/jawa-tengah-s1.webp", imgm="assets/img/jawa-tengah-m.webp", demo=LINK["demo_jawa"], accent="#8A5A33")]
PLANS = [
    dict(id="essential", name="Essential", price=79000, tag="Untuk acara sederhana", cta="Pilih Essential", hot=False,
         feats=[("Masa aktif", "90 hari"), ("Foto galeri", "10 foto"), ("Musik latar", "Ya"), ("RSVP dan ucapan", "Ya"), ("Batas jumlah tamu", "Tidak ada"),
                ("Tanpa watermark", "Ya"), ("Revisi", "Tidak ada"), ("Dukungan", "Tidak ada")]),
    dict(id="signature", name="Signature", price=149000, tag="Seimbang untuk kebanyakan acara", cta="Pilih Signature", hot=True,
         feats=[("Masa aktif", "180 hari"), ("Foto galeri", "20 foto"), ("Musik latar", "Ya"), ("RSVP dan ucapan", "Ya"), ("Batas jumlah tamu", "Tidak ada"),
                ("Tanpa watermark", "Ya"), ("Revisi", "2x revisi minor"), ("Dukungan", "Ya")]),
    dict(id="luxe", name="Luxe", price=249000, tag="Untuk acara besar dan panjang", cta="Pilih Luxe", hot=False,
         feats=[("Masa aktif", "365 hari"), ("Foto galeri", "40 foto"), ("Musik latar", "Ya"), ("RSVP dan ucapan", "Ya"), ("Batas jumlah tamu", "Tidak ada"),
                ("Tanpa watermark", "Ya"), ("Revisi", "Wajar, tanpa batas"), ("Dukungan", "Ya")])]
FAQ = [
    ("Apa itu undangan digital interaktif NusaMora?", "Undangan online yang dibuka lewat link di ponsel. Selain detail acara, countdown, dan lokasi, tamu bisa memilih avatar, masuk ke venue 3D, menyapa, mengisi RSVP, dan mengirim ucapan."),
    ("Apakah hanya untuk undangan pernikahan digital?", "Tidak. NusaMora dibuat untuk pernikahan, pertunangan, ulang tahun, hingga acara keluarga dan perusahaan. Template acara non-pernikahan ditambah bertahap."),
    ("Bagaimana tamu membuka undangan?", "Setiap tamu menerima link pribadi lewat WhatsApp. Tamu cukup membuka link di browser ponsel atau komputer, tanpa memasang aplikasi."),
    ("Apakah link undangan bisa diteruskan ke orang lain?", "Link memakai kode unik per tamu, bukan nama di alamat. RSVP dan ucapan hanya bisa dikirim oleh tamu yang diundang, jadi undangan tidak mudah dipakai orang yang tidak Anda undang."),
    ("Siapa yang bisa mengirim ucapan?", "Hanya tamu terundang, dengan nama asli dari daftar tamu Anda. Tidak ada komentar anonim. Ucapan melewati filter spam dan kata terlarang, dan Anda bisa menyembunyikan atau menghapusnya."),
    ("Bagaimana cara membayar?", "Transfer bank atau QRIS. Anda boleh menyimpan draft dulu. Link publik aktif setelah pembayaran terkonfirmasi. Metode otomatis lain menyusul."),
    ("Berapa lama undangan aktif?", "Essential 90 hari, Signature 180 hari, Luxe 365 hari. Setelah itu undangan dinonaktifkan sementara, lalu diarsipkan, dan bisa diaktifkan kembali dengan biaya perpanjangan."),
    ("Apakah ada pengembalian dana?", "Tidak ada pengembalian dana untuk produk digital yang sudah dibeli. Karena itu, coba demo template dulu sebelum memilih paket."),
    ("Apakah tersedia dalam bahasa Inggris?", "Versi pertama berbahasa Indonesia. Bahasa Inggris menyusul."),
]
SUPPORT_HOURS = [("Senin sampai Jumat", "09.00 - 17.00 WIB"), ("Sabtu", "09.00 - 15.00 WIB"), ("Minggu dan hari libur", "Tutup")]
SEO_TITLE = "NusaMora | Undangan Digital Interaktif & Template Premium"
SEO_DESC = "Buat undangan digital interaktif untuk pernikahan, ulang tahun, dan acara lain. Template unik, link pribadi per tamu, RSVP, dan buku ucapan. Mulai Rp79.000."

# ---------------------------------------------------------------- ICONS
IC = {
 "heart": '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
 "gift": '<rect x="3" y="9" width="18" height="12" rx="1.5"/><path d="M3 13h18M12 9v12M12 9c-3 0-4.5-1-4.5-2.5S9 4 12 9c3-5 4.5-3.5 4.5-2S15 9 12 9z"/>',
 "cap": '<path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11.5V16c0 1.5 3 3 6 3s6-1.500 6-3v-4.500"/><path d="M22 9v6"/>',
 "calstar": '<rect x="3.500" y="5" width="17" height="15.500" rx="2"/><path d="M8 3v4M16 3v4M3.500 10h17"/><path d="M12 12.500l1 2 2.200.3-1.600 1.500.4 2.200-2-1.100-2 1.100.4-2.200-1.600-1.500 2.200-.3z"/>',
 "building": '<path d="M4 21V5l8-2v18M12 8l8 2v11M3 21h18M7 9h2M7 13h2M7 17h2M15 14h2M15 18h2"/>',
 "grid": '<rect x="4" y="4" width="6.500" height="6.500" rx="1.200"/><rect x="13.500" y="4" width="6.500" height="6.500" rx="1.200"/><rect x="4" y="13.500" width="6.500" height="6.500" rx="1.200"/><rect x="13.500" y="13.500" width="6.500" height="6.500" rx="1.200"/>',
 "bolt": '<path d="M13 2L4.500 13.500H11L10 22l8.500-11.500H13z"/>',
 "users": '<circle cx="9" cy="8" r="3.500"/><path d="M2.500 20c.5-3.500 3-5.500 6.500-5.500s6 2 6.500 5.500"/><circle cx="17.500" cy="9" r="2.500"/><path d="M17 14.500c2.500.2 4 1.700 4.500 4.500"/>',
 "spark": '<path d="M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2z"/>',
 "monitor": '<rect x="3" y="4" width="18" height="12.500" rx="2"/><path d="M8 20.500h8M12 16.500v4"/><path d="M10.500 8l4 2.250-4 2.250z"/>',
 "layout": '<rect x="3.500" y="3.500" width="7.500" height="9" rx="1.500"/><rect x="13" y="3.500" width="7.500" height="5" rx="1.500"/><rect x="13" y="10.500" width="7.500" height="10" rx="1.500"/><rect x="3.500" y="14.500" width="7.500" height="6" rx="1.500"/>',
 "chat": '<path d="M4 5h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1h-8l-5 4v-4H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z"/><path d="M7.500 9.500h9M7.500 12.500h5.500"/>',
 "rsvp": '<circle cx="12" cy="12" r="9"/><path d="M8 12.500l2.800 2.800L16.500 9"/>',
 "bars": '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
 "arrow": '<path d="M5 12h14M13 6l6 6-6 6"/>',
 "play": '<circle cx="12" cy="12" r="9"/><path d="M10 8.500l5.500 3.500-5.500 3.500z"/>',
 "shield": '<path d="M12 3l8 3v6c0 4.500-3.200 7.800-8 9-4.800-1.200-8-4.500-8-9V6z"/><path d="M8.500 12l2.500 2.500 4.500-5"/>',
 "link": '<path d="M10 14a4 4 0 0 0 5.600 0l3-3a4 4 0 0 0-5.600-5.600l-1 1"/><path d="M14 10a4 4 0 0 0-5.600 0l-3 3a4 4 0 0 0 5.600 5.600l1-1"/>',
 "menu": '<path d="M4 7h16M4 12h16M4 17h16"/>',
 "close": '<path d="M6 6l12 12M18 6L6 18"/>',
 "check": '<path d="M5 12.500l4.500 4.500L19 7.500"/>',
 "plus": '<path d="M12 5v14M5 12h14"/>',
 "copy": '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
 "phone": '<rect x="7" y="2.500" width="10" height="19" rx="2.500"/><path d="M11 18.500h2"/>',
 "desktop": '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>',
 "clock": '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
}
def ic(n, cls="ic"): return f'<svg class="{cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">{IC[n].replace(".500",".5").replace(".200",".2").replace(".300",".3").replace(".400",".4").replace(".700",".7").replace(".250",".25").replace(".100",".1")}</svg>'
def rp(n): return "Rp" + f"{n:,}".replace(",", ".")

# ---------------------------------------------------------------- COMPONENTS
def flowers():
    return ('<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><defs>'
      '<linearGradient id="pg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#D9C6F5"/><stop offset="1" stop-color="#9A6FDB"/></linearGradient>'
      '<linearGradient id="lg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#A9C79A"/><stop offset="1" stop-color="#6E9A63"/></linearGradient>'
      '<symbol id="bl" viewBox="-50 -50 100 100"><g fill="url(#pg)" stroke="#8D62D2" stroke-opacity=".25" stroke-width="1">'
      + "".join(f'<ellipse cx="0" cy="-23" rx="13.500" ry="22" transform="rotate({a})"/>' for a in (0,72,144,216,288)) +
      '</g><circle r="6.500" fill="#F3D88C"/><circle r="2.500" fill="#E3B85A"/></symbol>'
      '<symbol id="lf" viewBox="0 0 40 80"><path d="M20 78C4 60 2 30 20 2c18 28 16 58 0 76z" fill="url(#lg)" opacity=".85"/><path d="M20 76V10" stroke="#fff" stroke-opacity=".5" stroke-width="1.200" fill="none"/></symbol>'
      '</defs></svg>')
def sprig(cls, items):
    out = f'<svg class="sprig {cls}" viewBox="0 0 200 200" aria-hidden="true" focusable="false">'
    for kind, x, y, s, r in items:
        out += f'<use href="#{kind}" x="{x-s/2}" y="{y-s/2}" width="{s}" height="{s*(2 if kind=="lf" else 1)/(1)}" transform="rotate({r} {x} {y})"/>' if kind=="lf" else f'<use href="#{kind}" x="{x-s/2}" y="{y-s/2}" width="{s}" height="{s}" transform="rotate({r} {x} {y})"/>'
    return out + '</svg>'

def nav():
    links = [("#beranda", "Beranda"), ("#fitur", "Fitur"), ("#template", "Template"), ("#harga", "Harga"), ("#bantuan", "Bantuan")]
    li = "".join(f'<a href="{h}" data-nav>{t}</a>' for h, t in links)
    return f'''<a class="skip" href="#utama">Lewati ke konten</a>
<header class="top" id="top"><div class="wrap bar">
 <a class="brand" href="#beranda" aria-label="NusaMora, ke beranda">nusamora<span>.</span></a>
 <nav class="m" id="menu" aria-label="Navigasi utama">{li}
  <div class="mob-acts"><button class="btn o" type="button" data-open="login">Masuk</button><button class="btn" type="button" data-open="start">Buat Undangan {ic("arrow")}</button></div></nav>
 <div class="acts"><button class="btn o sm" type="button" data-open="login">Masuk</button><button class="btn sm" type="button" data-open="start">Buat Undangan {ic("arrow")}</button></div>
 <button class="burger" type="button" id="burger" aria-expanded="false" aria-controls="menu" aria-label="Buka menu">{ic("menu")}</button>
</div></header>'''

def hero():
    t0, t1 = TEMPLATES
    return f'''<section class="hero wrap" id="beranda" aria-labelledby="h-hero">
 {sprig("sp-a", [("bl",40,48,64,-10),("bl",92,22,38,18),("lf",22,96,26,-28),("bl",16,110,44,30)])}
 <div class="hero-txt rv">
  <p class="pill">Digital Invitation &amp; Event Experience</p>
  <h1 id="h-hero">Every Moment, <em>Made Memorable.</em></h1>
  <p class="lead">Bukan sekadar undangan. Ciptakan pengalaman istimewa yang membuat setiap tamu merasa menjadi bagian dari cerita Anda.</p>
  <div class="cta"><button class="btn lg" type="button" data-open="start">Buat Undangan {ic("arrow")}</button><a class="btn o lg" href="{LINK["demo_garden"]}" target="_blank" rel="noopener">{ic("play")} Lihat Demo</a></div>
  <ul class="trust" aria-label="Keunggulan utama"><li>{ic("link")}Link unik untuk setiap tamu</li><li>{ic("shield")}Ucapan dengan nama asli</li></ul>
  <ul class="mini">
   <li>{ic("bolt")}<div><b>Praktis dan jelas</b><span>Isi data acara sekali, link tamu siap dibagikan lewat WhatsApp.</span></div></li>
   <li>{ic("users")}<div><b>Interaktif</b><span>Live Guest, RSVP, dan buku ucapan dalam satu undangan.</span></div></li>
   <li>{ic("spark")}<div><b>Beragam acara</b><span>Pernikahan, ulang tahun, sampai acara perusahaan.</span></div></li></ul>
 </div>
 <div class="devs rv" aria-label="Contoh tampilan undangan digital interaktif NusaMora">
  <div class="laptop"><div class="scr" id="hs">
   <img class="on" src="{t0["img"]}" width="960" height="540" fetchpriority="high" decoding="async" alt="Halaman pilih avatar pada undangan digital interaktif tema {t0["name"]}">
   <img src="{t1["img"]}" width="960" height="540" decoding="async" alt="Halaman pilih avatar pada undangan digital interaktif tema {t1["name"]}"></div><div class="base"></div></div>
  <div class="phone" id="hp"><img class="on" src="{t0["imgm"]}" width="420" height="908" alt="Tampilan ponsel tema {t0["name"]}"><img src="{t1["imgm"]}" width="420" height="908" alt="Tampilan ponsel tema {t1["name"]}"></div>
  <p class="cap" aria-live="polite">Tema: <b id="hn">{t0["name"]}</b></p>
  {sprig("sp-b", [("bl",150,150,60,12),("bl",100,172,34,-14),("lf",176,100,24,32),("bl",176,60,40,20)])}
 </div></section>'''

def strip():
    b = "".join(f'<button class="ev" type="button" data-ev="{i}" aria-pressed="false">{ic(c)}<span>{E(n)}</span></button>' for i, n, c in EVENTS)
    return f'''<section class="wrap" aria-labelledby="h-ev"><div class="strip rv"><h2 id="h-ev">Cocok untuk Berbagai Acara</h2><div class="evs" role="group" aria-label="Pilih jenis acara">{b}</div></div></section>'''

def features():
    F = [
     ("monitor", "Live Guest", "Tamu masuk ke venue 3D, memilih avatar, berkeliling, lalu menyapa dan mengirim reaksi. Undangan terasa seperti hadir di acaranya.",
      ["Pilih avatar sebelum masuk", "Area Panggung, Resepsi, Photo Booth, Galeri, dan Buku Tamu", "Musik latar dan QRIS hadiah pengantin"], "f-live"),
     ("layout", "Template Premium", "Setiap tema punya lukisan venue, warna, font, dan ornamen sendiri. Bukan sekadar ganti warna.", [], "f-tpl"),
     ("chat", "Buku Tamu Digital", "Ucapan dan doa dikirim tamu terundang dengan nama asli. Tidak ada komentar anonim, dan ucapan disaring sebelum tampil.", [], "f-gb"),
     ("rsvp", "RSVP", "Tamu konfirmasi hadir dari link pribadinya. Anda tidak perlu mencatat satu per satu.", [], "f-rsvp"),
     ("bars", "Dashboard Acara", "Pantau RSVP dan ucapan, kelola daftar tamu, dan kirim link lewat WhatsApp dari satu tempat.", [], "f-dash")]
    cards = ""
    for icn, t, d, bl, cl in F:
        ul = ("<ul class='ticks'>" + "".join(f"<li>{ic('check')}{E(x)}</li>" for x in bl) + "</ul>") if bl else ""
        cards += f'<article class="feat {cl} rv"><span class="fi">{ic(icn)}</span><h3>{t}</h3><p>{d}</p>{ul}</article>'
    trust = [("link", "Link unik per tamu", "Alamat undangan memakai kode acak, bukan nama tamu, sehingga tidak mudah ditebak."),
             ("shield", "Ucapan terverifikasi", "Hanya tamu terundang yang bisa mengirim ucapan, dengan nama asli dari daftar tamu."),
             ("rsvp", "Anda yang mengatur", "Pemilik undangan bisa menyembunyikan atau menghapus ucapan kapan saja.")]
    tr = "".join(f'<li>{ic(i)}<div><b>{t}</b><span>{d}</span></div></li>' for i, t, d in trust)
    return f'''<section class="sec wrap" id="fitur" aria-labelledby="h-fitur">
 <div class="sec-h rv"><p class="tagp">Fitur Unggulan</p><h2 id="h-fitur" class="t">Lebih dari Sekadar Undangan Digital</h2><p class="sub">Undangan digital interaktif yang menjual pengalaman: tamu tidak hanya membaca, mereka ikut hadir dan meninggalkan kenangan.</p></div>
 <div class="feats">{cards}</div>
 <ul class="trustband rv" aria-label="Keamanan dan kepercayaan">{tr}</ul></section>'''

def templates():
    cards = ""
    for t in TEMPLATES:
        tags = "".join(f'<span class="tag">{x}</span>' for x in t["tags"])
        cards += f'''<article class="tcard rv" data-ev="{" ".join(t["events"])}" data-id="{t["id"]}" style="--ta:{t["accent"]}">
 <div class="tv"><img src="{t["img"]}" width="960" height="540" loading="lazy" decoding="async" alt="Pratinjau template undangan digital {t["name"]}, halaman pilih avatar" data-d="{t["img"]}" data-m="{t["imgm"]}">
  <div class="vt" role="group" aria-label="Ganti ukuran pratinjau"><button type="button" class="on" data-v="d" aria-label="Tampilan komputer">{ic("desktop")}</button><button type="button" data-v="m" aria-label="Tampilan ponsel">{ic("phone")}</button></div></div>
 <div class="tb"><h3>{t["name"]}</h3><div class="tags">{tags}</div><p>{t["desc"]}</p>
  <div class="two"><a class="btn o" href="{t["demo"]}" target="_blank" rel="noopener">Coba Demo</a><button class="btn" type="button" data-open="start" data-tpl="{t["id"]}">Gunakan Template Ini</button></div></div></article>'''
    cards += f'''<article class="tcard soon rv" data-ev="all" aria-label="Template baru menyusul"><div class="tb"><span class="fi">{ic("plus")}</span><h3>Template baru menyusul</h3><p>Template ditambah bertahap, termasuk untuk ulang tahun, wisuda, seminar, dan acara perusahaan. Ceritakan acara Anda, kami catat sebagai prioritas.</p><div class="two"><button class="btn o" type="button" data-open="start" data-tpl="">Beri Tahu Kami</button></div></div></article>'''
    return f'''<section class="sec wrap" id="template" aria-labelledby="h-tpl">
 <div class="sec-h rv"><p class="tagp">Template</p><h2 id="h-tpl" class="t">Template Undangan Digital yang Tidak Biasa</h2><p class="sub">Coba demo-nya langsung, lalu pilih yang paling mewakili cerita Anda. Semua template bisa dipakai di semua paket.</p></div>
 <div class="countrow"><p class="count" id="tcount" aria-live="polite">2 template tersedia</p><button class="reset" type="button" id="treset" hidden>Tampilkan semua</button></div>
 <p class="tnote" id="tnote" hidden></p>
 <div class="tgrid" id="tgrid">{cards}</div></section>'''

def steps():
    S = [("Pilih template", "Coba demo, lalu pilih template yang sesuai dengan acara dan suasana yang Anda mau."),
         ("Isi data acara", "Masukkan detail acara, lokasi, foto galeri, musik, dan daftar tamu. Progres tersimpan sebagai draft, jadi Anda bisa lanjut kapan saja."),
         ("Bayar dan bagikan", "Setelah pembayaran terkonfirmasi, kirim link pribadi ke tiap tamu lewat WhatsApp.")]
    li = "".join(f'<li class="step rv"><span class="num" aria-hidden="true">{i+1}</span><h3>{t}</h3><p>{d}</p></li>' for i, (t, d) in enumerate(S))
    return f'''<section class="sec wrap" id="cara-kerja" aria-labelledby="h-cara"><div class="sec-h rv"><p class="tagp">Cara Kerja</p><h2 id="h-cara" class="t">Tiga Langkah Menuju Hari-H</h2><p class="sub">Tanpa pindah-pindah aplikasi. Dari memilih template sampai undangan sampai ke tamu.</p></div><ol class="steps">{li}</ol></section>'''

def pricing():
    cards = ""
    for p in PLANS:
        rows = "".join(f'<li><span>{k}</span><b>{v}</b></li>' for k, v in p["feats"])
        badge = '<span class="badge">Pilihan seimbang</span>' if p["hot"] else ""
        cards += f'''<article class="plan{" hot" if p["hot"] else ""} rv" data-plan="{p["id"]}">{badge}<h3>{p["name"]}</h3><p class="ptag">{p["tag"]}</p>
 <p class="price"><span class="cur">Rp</span>{rp(p["price"])[2:]}</p><p class="per">sekali bayar per undangan</p>
 <ul class="pf">{rows}</ul><button class="btn{"" if p["hot"] else " o"} full" type="button" data-open="start" data-plan="{p["id"]}">{p["cta"]}</button></article>'''
    return f'''<section class="sec wrap" id="harga" aria-labelledby="h-harga"><div class="sec-h rv"><p class="tagp">Harga</p><h2 id="h-harga" class="t">Harga Jelas, Tanpa Paket Gratis Tersembunyi</h2><p class="sub">Pilih sesuai lama masa aktif dan jumlah foto. Semua paket tanpa watermark dan tanpa batas jumlah tamu.</p></div>
 <div class="plans">{cards}</div>
 <p class="pnote rv">Pembayaran lewat transfer bank atau QRIS, dan link publik aktif setelah pembayaran terkonfirmasi. Produk digital tidak dapat dikembalikan setelah dibeli, jadi coba demo template terlebih dulu.</p></section>'''

def testimonials():
    ph = "".join(f'<figure class="tm rv" aria-label="Slot testimoni kosong"><div class="ghost" aria-hidden="true"><i></i><i></i><i></i></div><figcaption>Slot testimoni<small>Menunggu cerita dari pelanggan nyata</small></figcaption></figure>' for _ in range(3))
    return f'''<section class="sec wrap" id="testimoni" aria-labelledby="h-tes"><div class="sec-h rv"><p class="tagp">Cerita Pelanggan</p><h2 id="h-tes" class="t">Ruang untuk Cerita Pelanggan Pertama</h2><p class="sub">NusaMora baru dibuka. Kami hanya menampilkan testimoni dari pelanggan yang benar-benar memakai layanan ini, tidak ada yang dibuat-buat.</p></div>
 <div class="tms">{ph}</div><div class="tcta rv"><button class="btn o" type="button" data-open="start">Jadi pelanggan pertama {ic("arrow")}</button></div></section>'''

def faq():
    items = "".join(f'<details class="q rv"><summary><span>{E(q)}</span>{ic("plus","pl")}</summary><p>{E(a)}</p></details>' for q, a in FAQ)
    hrs = "".join(f'<li><span>{d}</span><b>{h}</b></li>' for d, h in SUPPORT_HOURS)
    return f'''<section class="sec wrap" id="bantuan" aria-labelledby="h-faq"><div class="sec-h rv"><p class="tagp">Bantuan</p><h2 id="h-faq" class="t">Pertanyaan yang Sering Diajukan</h2><p class="sub">Seputar undangan online, keamanan link tamu, pembayaran, dan masa aktif.</p></div>
 <div class="faqgrid"><div class="qs">{items}</div>
 <aside class="help rv" aria-labelledby="h-help"><span class="fi">{ic("clock")}</span><h3 id="h-help">Jam layanan bantuan</h3><ul>{hrs}</ul><p>Pertanyaan di luar daftar ini? Kanal bantuan resmi akan diumumkan di halaman ini saat layanan dibuka.</p></aside></div></section>'''

def final_cta():
    return f'''<section class="wrap fin-w" aria-labelledby="h-fin"><div class="fin rv">{sprig("sp-c", [("bl",44,60,56,-12),("lf",14,110,24,-30),("bl",20,138,34,22)])}{sprig("sp-d", [("bl",156,60,56,16),("lf",186,112,24,30),("bl",176,142,34,-18)])}
 <h2 id="h-fin" class="t">Hari istimewa Anda layak dikenang.</h2><p>Mulai dari memilih template. Draft tersimpan, dan Anda baru membayar saat siap.</p>
 <div class="cta"><button class="btn lg inv" type="button" data-open="start">Buat Undangan {ic("arrow")}</button><a class="btn lg ghost" href="#template">Lihat Template</a></div></div></section>'''

def footer():
    return f'''<footer class="foot"><div class="wrap fg"><div class="fb"><a class="brand" href="#beranda">nusamora<span>.</span></a><p>Undangan digital interaktif untuk pernikahan, ulang tahun, dan acara istimewa lainnya.</p></div>
 <nav aria-label="Produk"><h2>Produk</h2><a href="#fitur">Fitur</a><a href="#template">Template</a><a href="#harga">Harga</a><a href="{LINK["demo_garden"]}" target="_blank" rel="noopener">Demo Live Guest</a></nav>
 <nav aria-label="Bantuan"><h2>Bantuan</h2><a href="#cara-kerja">Cara kerja</a><a href="#bantuan">Pertanyaan umum</a><button type="button" data-open="legal" data-doc="Kebijakan Privasi">Kebijakan Privasi</button><button type="button" data-open="legal" data-doc="Syarat Layanan">Syarat Layanan</button></nav></div>
 <div class="wrap copy"><p>&copy; 2026 NusaMora. Seluruh hak dilindungi.</p></div></footer>'''

def modal():
    pl = "".join(f'<label class="pc"><input type="radio" name="plan" value="{p["id"]}"{" checked" if p["hot"] else ""}><span><b>{p["name"]}</b><small>{rp(p["price"])}</small></span></label>' for p in PLANS)
    ev = "".join(f'<option value="{i}">{E(n)}</option>' for i, n, _ in EVENTS)
    tp = '<option value="">Belum memilih</option>' + "".join(f'<option value="{t["id"]}">{t["name"]}</option>' for t in TEMPLATES)
    return f'''<dialog id="dlg" aria-labelledby="dt"><form method="dialog" class="dh"><button class="x" aria-label="Tutup" value="x">{ic("close")}</button></form>
 <div id="pane-start"><p class="tagp">Mulai</p><h2 id="dt" class="t sm">Rancang Undangan Anda</h2><p class="sub">Pilih acara, template, dan paket. Pilihan Anda kami simpan di perangkat ini dan dipakai saat pendaftaran dibuka.</p>
  <div class="fld"><label for="f-ev">Jenis acara</label><select id="f-ev">{ev}</select></div>
  <div class="fld"><label for="f-tp">Template</label><select id="f-tp">{tp}</select></div>
  <fieldset class="fld"><legend>Paket</legend><div class="pcs">{pl}</div></fieldset>
  <div class="sum" id="sum" aria-live="polite"></div>
  <div class="note" id="appnote"><b>Pendaftaran akun sedang disiapkan.</b> Anda bisa menyalin ringkasan ini sebagai catatan, atau melanjutkan ke pendaftaran bila tombolnya sudah tersedia.</div>
  <div class="two"><button class="btn" type="button" id="b-copy">{ic("copy")} Salin ringkasan</button><a class="btn o" id="b-go" href="#" hidden>Lanjut ke pendaftaran</a><a class="btn o" id="b-wa" href="#" target="_blank" rel="noopener" hidden>Hubungi via WhatsApp</a></div><p class="ok" id="okmsg" role="status"></p></div>
 <div id="pane-info" hidden><h2 class="t sm" id="it">Segera hadir</h2><p class="sub" id="ib"></p><div class="two"><button class="btn" type="button" id="b-close">Mengerti</button></div></div></dialog>
<div class="mbar" id="mbar"><button class="btn lg full" type="button" data-open="start">Buat Undangan {ic("arrow")}</button></div>'''

# ---------------------------------------------------------------- CSS / JS
CSS = r"""
/* Konsep layout: satu kolom narasi di atas kanvas lavender; hero dua kolom dengan perangkat, strip acara melayang, bento fitur, katalog template, langkah, harga. */
:root{--bg:#faf7ff;--bg2:#f3ecff;--ivory:#fbf6ee;--card:#fff;--ink:#241046;--mute:#5a4f73;--line:#e4d9f6;--soft:#efe6fc;--soft2:#e2d4f8;--accent:#6a34b6;--accent2:#8c5ad6;--onacc:#fff;--glow:rgba(122,76,196,.24);--shadow:0 1px 2px rgba(60,30,110,.06),0 22px 44px -22px rgba(90,50,160,.30);--display:"Playfair Display",Georgia,"Times New Roman",serif;--sans:"Plus Jakarta Sans",system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;--r:18px}
*{box-sizing:border-box}html{overflow-x:clip;scroll-behavior:smooth;scroll-padding-top:84px;color-scheme:light}
body{margin:0;background:var(--bg);color:var(--ink);font:400 16px/1.65 var(--sans);-webkit-font-smoothing:antialiased;padding-inline:max(16px,env(safe-area-inset-left,0px)) max(16px,env(safe-area-inset-right,0px));overflow-x:clip}
img{max-width:100%;height:auto}a{color:inherit}h1,h2,h3{text-wrap:balance}p{margin:0}ul,ol{margin:0;padding:0;list-style:none}
.wrap{max-width:1200px;margin-inline:auto;position:relative}
.skip{position:absolute;left:-999px;top:8px;background:var(--accent);color:#fff;padding:10px 16px;border-radius:10px;z-index:100}.skip:focus{left:8px}
:focus-visible{outline:3px solid var(--accent2);outline-offset:3px;border-radius:8px}
/* header */
header.top{position:sticky;top:env(safe-area-inset-top,0px);z-index:50;isolation:isolate}
header.top::before{content:"";position:absolute;inset:0 calc(50% - 50vw);z-index:-1;background:color-mix(in srgb,var(--bg) 84%,transparent);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border-bottom:1px solid var(--line)}
.bar{display:flex;align-items:center;gap:22px;padding-block:13px}
.brand{font:800 30px/1 var(--sans);letter-spacing:-.045em;color:var(--accent);text-decoration:none}.brand span{color:var(--accent2)}
nav.m{display:flex;gap:30px;margin-inline:auto}nav.m a{position:relative;text-decoration:none;font-weight:600;font-size:15px;padding-block:6px;color:var(--ink);transition:color .2s}nav.m a:hover,nav.m a.on{color:var(--accent)}
nav.m a::after{content:"";position:absolute;left:0;right:0;bottom:-2px;height:2px;border-radius:2px;background:var(--accent);transform:scaleX(0);transform-origin:left;transition:transform .25s}nav.m a.on::after{transform:scaleX(1)}
.acts{display:flex;gap:10px}.burger,.mob-acts{display:none}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:9px;font:700 15px var(--sans);padding:13px 22px;border-radius:12px;border:1.5px solid var(--accent);background:var(--accent);color:var(--onacc);cursor:pointer;text-decoration:none;box-shadow:0 12px 24px -14px var(--glow);transition:transform .2s,background .2s,box-shadow .2s,color .2s}
.btn:hover{background:var(--accent2);border-color:var(--accent2);transform:translateY(-2px);box-shadow:0 16px 28px -14px var(--glow)}.btn:active{transform:translateY(0)}
.btn.o{background:transparent;color:var(--accent);box-shadow:none}.btn.o:hover{background:var(--soft);color:var(--accent);border-color:var(--accent)}
.btn.sm{padding:10px 18px;font-size:14px}.btn.lg{padding:15px 28px;font-size:16px}.btn.full{width:100%}.btn .ic{width:18px;height:18px}
.ic{width:24px;height:24px;flex:none}
/* hero */
.hero{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.08fr);gap:34px;align-items:center;padding-block:56px 30px}
.hero::before{content:"";position:absolute;z-index:-1;inset:-120px calc(50% - 50vw) -60px;background:radial-gradient(55% 60% at 80% 28%,var(--soft2),transparent 70%),radial-gradient(40% 45% at 6% 6%,var(--soft),transparent 72%)}
.pill{display:inline-block;font:600 14px var(--sans);color:var(--accent);background:var(--soft);padding:9px 18px;border-radius:999px;margin-bottom:22px}
h1{font:700 clamp(42px,6.2vw,74px)/1.02 var(--display);letter-spacing:-.018em;margin:0 0 22px}
h1 em{display:block;font-style:italic;font-weight:600;background:linear-gradient(95deg,var(--accent),var(--accent2));-webkit-background-clip:text;background-clip:text;color:transparent;padding-bottom:.06em}
.lead{font-size:18px;color:var(--mute);max-width:46ch;margin-bottom:28px}.cta{display:flex;gap:14px;flex-wrap:wrap}
.trust{display:flex;gap:10px 22px;flex-wrap:wrap;margin:22px 0 30px;font-size:14px;font-weight:600;color:var(--mute)}.trust li{display:flex;gap:8px;align-items:center}.trust .ic{width:18px;height:18px;color:var(--accent)}
.mini{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px}.mini li{display:flex;gap:11px;align-items:flex-start;min-width:0}
.mini .ic{width:40px;height:40px;padding:10px;border-radius:12px;background:var(--soft);color:var(--accent)}.mini b{display:block;font-size:14.5px;line-height:1.35}.mini span{display:block;color:var(--mute);font-size:13px;line-height:1.5;margin-top:2px}
.devs{position:relative;display:flex;justify-content:center;align-items:center;min-height:320px;padding-bottom:36px}
.laptop{width:min(100%,600px);position:relative;z-index:1}.laptop .scr{position:relative;border:9px solid #1e1b26;border-bottom-width:12px;border-radius:16px 16px 6px 6px;background:#1e1b26;overflow:hidden;aspect-ratio:16/10;box-shadow:var(--shadow)}
.laptop .base{height:14px;margin:0 -4%;border-radius:0 0 18px 18px;background:linear-gradient(#d6d3dd,#9f9ba9)}
.scr img,.phone img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0;transition:opacity .9s ease}.scr img.on,.phone img.on{opacity:1}
.phone{position:absolute;right:-1%;bottom:2%;z-index:2;width:27%;min-width:110px;aspect-ratio:9/19;border:6px solid #1e1b26;border-radius:26px;overflow:hidden;background:#1e1b26;box-shadow:var(--shadow)}
.cap{position:absolute;left:50%;bottom:0;transform:translateX(-50%);font-size:13px;color:var(--mute);white-space:nowrap}.cap b{color:var(--accent)}
.sprig{position:absolute;pointer-events:none;z-index:0;overflow:visible;opacity:.95}.sp-a{left:-92px;top:-20px;width:190px;animation:sway 9s ease-in-out infinite}.sp-b{right:-20px;bottom:-30px;width:180px;z-index:3;animation:sway 11s ease-in-out infinite reverse}
@keyframes sway{50%{transform:rotate(3deg) translateY(-5px)}}
/* strip */
.strip{display:grid;grid-template-columns:minmax(0,230px) minmax(0,1fr);gap:8px 14px;align-items:center;background:var(--card);border:1px solid var(--line);border-radius:24px;box-shadow:var(--shadow);padding:14px 20px;margin-top:44px}
.strip h2{font:700 20px/1.25 var(--sans);margin:0;padding-right:16px;border-right:1px solid var(--line)}.evs{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:4px}
.ev{display:flex;flex-direction:column;align-items:center;gap:8px;padding:14px 6px;border-radius:16px;border:1.5px solid transparent;background:transparent;color:var(--ink);font:600 13.5px/1.3 var(--sans);cursor:pointer;text-align:center;transition:background .2s,transform .2s,border-color .2s}
.ev .ic{width:34px;height:34px;color:var(--accent);transition:transform .25s}.ev:hover{background:var(--soft)}.ev:hover .ic{transform:translateY(-3px) scale(1.06)}.ev[aria-pressed=true]{background:var(--soft);border-color:var(--accent)}
/* sections */
.sec{padding-block:84px 0}.sec-h{display:flex;flex-direction:column;gap:12px;margin-bottom:34px}
.tagp{align-self:flex-start;font:600 13px var(--sans);color:var(--accent);background:var(--soft);padding:7px 15px;border-radius:999px}
.t{font:700 clamp(30px,4.2vw,46px)/1.1 var(--display);letter-spacing:-.012em;margin:0}.t.sm{font-size:clamp(26px,3.4vw,34px)}.sub{color:var(--mute);max-width:60ch}
.fi{display:inline-grid;place-items:center;width:46px;height:46px;border-radius:14px;background:var(--soft);color:var(--accent);margin-bottom:16px}
/* features bento */
.feats{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:16px}
.feat{background:var(--card);border:1px solid var(--line);border-radius:var(--r);padding:26px 24px;box-shadow:var(--shadow);transition:transform .25s,border-color .25s;min-width:0}.feat:hover{transform:translateY(-4px);border-color:var(--soft2)}
.feat h3{font:700 19px/1.3 var(--sans);margin:0 0 8px}.feat p{color:var(--mute);font-size:15px}
.f-live{grid-column:span 4;background:linear-gradient(150deg,#fff,var(--soft) 140%)}.f-tpl{grid-column:span 2}.f-gb,.f-rsvp,.f-dash{grid-column:span 2}
.ticks{display:grid;gap:9px;margin-top:18px}.ticks li{display:flex;gap:10px;align-items:flex-start;font-size:14.5px;font-weight:500}.ticks .ic{width:18px;height:18px;margin-top:3px;color:var(--accent)}
.trustband{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:22px;margin-top:22px;padding:24px 28px;border-radius:22px;background:var(--ivory);border:1px solid #efe4d2}
.trustband li{display:flex;gap:14px;align-items:flex-start;min-width:0}.trustband .ic{width:42px;height:42px;padding:10px;border-radius:12px;background:#fff;color:var(--accent);box-shadow:0 6px 14px -8px var(--glow)}.trustband b{display:block;font-size:15px}.trustband span{display:block;color:var(--mute);font-size:13.5px;line-height:1.55;margin-top:2px}
/* templates */
.countrow{display:flex;align-items:center;gap:14px;margin-bottom:12px}.count{font-size:13.5px;color:var(--mute)}.reset{font:600 13px var(--sans);color:var(--accent);background:none;border:0;cursor:pointer;text-decoration:underline;padding:4px}.tnote{background:var(--soft);color:var(--ink);border-radius:14px;padding:12px 16px;font-size:14.5px;margin-bottom:16px}
.tgrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:22px}
.tcard{background:var(--card);border:1px solid var(--line);border-radius:22px;overflow:hidden;display:flex;flex-direction:column;box-shadow:var(--shadow);transition:transform .25s,opacity .3s}.tcard:hover{transform:translateY(-5px)}.tcard.dim{opacity:.45}
.tv{position:relative;background:var(--soft)}.tv img{display:block;width:100%;aspect-ratio:16/9;object-fit:cover;transition:opacity .25s}.tv.ph img{aspect-ratio:16/9;object-fit:contain;background:linear-gradient(120deg,var(--soft),var(--soft2));padding:8px 0}
.vt{position:absolute;right:10px;bottom:10px;display:flex;gap:2px;padding:3px;border-radius:12px;background:rgba(255,255,255,.92);box-shadow:0 6px 16px -8px rgba(0,0,0,.4)}.vt button{display:grid;place-items:center;width:34px;height:30px;border:0;border-radius:9px;background:transparent;color:var(--mute);cursor:pointer}.vt button .ic{width:18px;height:18px}.vt button.on{background:var(--ta,var(--accent));color:#fff}
.tb{display:flex;flex-direction:column;gap:12px;padding:20px;flex:1}.tb h3{font:700 26px/1.1 var(--display);margin:0}.tb p{color:var(--mute);font-size:14.5px}.tags{display:flex;gap:6px;flex-wrap:wrap}.tag{font:600 11.5px var(--sans);padding:4px 11px;border-radius:999px;background:var(--soft);color:var(--accent)}
.two{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:auto;padding-top:6px}.two .btn{padding-inline:12px;font-size:14px}
.tcard.soon{background:linear-gradient(160deg,#fff,var(--ivory));border-style:dashed;border-color:var(--soft2)}.tcard.soon .two{grid-template-columns:1fr}
/* steps */
.steps{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px;counter-reset:s;position:relative}
.step{background:var(--card);border:1px solid var(--line);border-radius:var(--r);padding:26px 24px;box-shadow:var(--shadow)}.step h3{font:700 19px/1.3 var(--sans);margin:14px 0 8px}.step p{color:var(--mute);font-size:15px}
.num{display:grid;place-items:center;width:42px;height:42px;border-radius:50%;background:var(--accent);color:#fff;font:700 18px var(--display)}
/* pricing */
.plans{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px;align-items:stretch}
.plan{position:relative;display:flex;flex-direction:column;gap:4px;background:var(--card);border:1px solid var(--line);border-radius:24px;padding:30px 26px 26px;box-shadow:var(--shadow);transition:transform .25s}.plan:hover{transform:translateY(-5px)}
.plan.hot{border:2px solid var(--accent);background:linear-gradient(180deg,#fff,var(--soft) 160%);box-shadow:0 26px 54px -26px rgba(106,52,182,.5)}
.badge{position:absolute;top:-13px;left:26px;background:var(--accent);color:#fff;font:700 12px var(--sans);padding:5px 13px;border-radius:999px}
.plan h3{font:700 28px/1.1 var(--display);margin:0}.ptag{color:var(--mute);font-size:14px}.price{font:700 44px/1.1 var(--display);margin-top:14px;font-variant-numeric:tabular-nums}.cur{font:600 18px var(--sans);margin-right:4px;color:var(--mute)}.per{font-size:13px;color:var(--mute);margin-bottom:16px}
.pf{display:grid;margin-bottom:22px}.pf li{display:flex;justify-content:space-between;gap:12px;padding:10px 0;border-top:1px solid var(--line);font-size:14.5px}.pf span{color:var(--mute)}.pf b{font-weight:600;text-align:right}.plan .btn{margin-top:auto}
.pnote{margin-top:22px;color:var(--mute);font-size:14px;max-width:74ch}
/* testimonials */
.tms{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px}
.tm{margin:0;border:1.5px dashed var(--soft2);border-radius:var(--r);padding:26px 24px;background:rgba(255,255,255,.6);display:flex;flex-direction:column;gap:20px}.ghost{display:grid;gap:10px}.ghost i{display:block;height:10px;border-radius:6px;background:var(--soft)}.ghost i:nth-child(2){width:88%}.ghost i:nth-child(3){width:62%}
.tm figcaption{font-weight:700;font-size:14.5px}.tm small{display:block;font-weight:500;color:var(--mute);font-size:13px}.tcta{margin-top:22px}
/* faq */
.faqgrid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,340px);gap:28px;align-items:start}.qs{display:grid;gap:10px}
.q{background:var(--card);border:1px solid var(--line);border-radius:16px;transition:border-color .2s,box-shadow .2s}.q[open]{border-color:var(--accent2);box-shadow:var(--shadow)}
.q summary{list-style:none;cursor:pointer;display:flex;justify-content:space-between;align-items:center;gap:16px;padding:18px 20px;font-weight:700;font-size:16px;border-radius:16px}.q summary::-webkit-details-marker{display:none}
.pl{width:22px;height:22px;color:var(--accent);transition:transform .25s}.q[open] .pl{transform:rotate(45deg)}.q p{padding:0 20px 20px;color:var(--mute);max-width:64ch}
.help{background:var(--ivory);border:1px solid #efe4d2;border-radius:22px;padding:26px;position:sticky;top:96px}.help h3{font:700 20px var(--display);margin:0 0 12px}.help ul{display:grid;margin-bottom:14px}.help li{display:flex;justify-content:space-between;gap:10px;padding:9px 0;border-top:1px solid #eadfcb;font-size:14px}.help p{font-size:13.5px;color:var(--mute)}
/* final cta */
.fin-w{padding-block:96px 0}.fin{position:relative;overflow:hidden;text-align:center;border-radius:32px;padding:68px 28px;background:linear-gradient(135deg,#4f2391,#7a45c8 60%,#9a6fe0);color:#fff;box-shadow:0 34px 70px -34px rgba(79,35,145,.7)}
.fin .t{color:#fff;max-width:20ch;margin:0 auto 14px}.fin p{color:#eadcff;max-width:46ch;margin:0 auto 28px}.fin .cta{justify-content:center}.btn.inv{background:#fff;color:var(--accent);border-color:#fff}.btn.inv:hover{background:var(--soft);border-color:var(--soft)}.btn.ghost{background:transparent;color:#fff;border-color:rgba(255,255,255,.6);box-shadow:none}.btn.ghost:hover{background:rgba(255,255,255,.14);border-color:#fff}
.sp-c{left:-40px;top:-10px;width:200px}.sp-d{right:-40px;bottom:-14px;width:200px}.fin .sprig{opacity:.55}
/* footer */
.foot{margin-top:96px;padding-block:56px 28px;background:var(--ivory);margin-inline:calc(50% - 50vw);padding-inline:max(16px,env(safe-area-inset-left,0px)) max(16px,env(safe-area-inset-right,0px));border-top:1px solid #efe4d2}
.fg{display:grid;grid-template-columns:minmax(0,1.5fr) repeat(2,minmax(0,1fr));gap:34px}.fb p{color:var(--mute);margin-top:12px;max-width:38ch;font-size:14.5px}.foot nav{display:grid;gap:10px;align-content:start}.foot h2{font:700 13px var(--sans);letter-spacing:.1em;text-transform:uppercase;color:var(--mute);margin:0 0 4px}
.foot nav a,.foot nav button{font:500 15px var(--sans);color:var(--ink);text-decoration:none;background:none;border:0;padding:0;text-align:left;cursor:pointer}.foot nav a:hover,.foot nav button:hover{color:var(--accent)}
.copy{margin-top:36px;padding-top:20px;border-top:1px solid #eadfcb;font-size:13px;color:var(--mute)}
/* dialog */
dialog{width:min(560px,calc(100vw - 32px));max-height:calc(100dvh - 32px);overflow:auto;border:0;border-radius:24px;padding:30px;background:var(--card);color:var(--ink);box-shadow:0 40px 90px -30px rgba(36,16,70,.6)}dialog::backdrop{background:rgba(36,16,70,.5);backdrop-filter:blur(3px)}
.dh{position:absolute;top:14px;right:14px;margin:0}.x{display:grid;place-items:center;width:38px;height:38px;border-radius:50%;border:0;background:var(--soft);color:var(--accent);cursor:pointer}.x .ic{width:20px;height:20px}
.fld{display:grid;gap:6px;margin:16px 0 0;border:0;padding:0;min-width:0}.fld label,.fld legend{font-weight:700;font-size:14px;padding:0}select{font:inherit;padding:12px 14px;border-radius:12px;border:1.5px solid var(--line);background:#fff;color:var(--ink);width:100%}
.pcs{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.pc{position:relative}.pc input{position:absolute;opacity:0;inset:0;cursor:pointer}.pc span{display:grid;gap:2px;text-align:center;padding:12px 6px;border-radius:12px;border:1.5px solid var(--line);transition:border-color .2s,background .2s}.pc small{color:var(--mute);font-size:12.5px}.pc input:checked+span{border-color:var(--accent);background:var(--soft)}.pc input:focus-visible+span{outline:3px solid var(--accent2);outline-offset:2px}
.sum{margin-top:18px;padding:14px 16px;border-radius:14px;background:var(--bg2);font-size:14.5px;line-height:1.7}.sum b{color:var(--accent)}.note{margin-top:12px;font-size:13.5px;color:var(--mute)}.note b{color:var(--ink)}#pane-start .two{margin-top:16px;grid-template-columns:1fr}#pane-info .two{grid-template-columns:1fr}.ok{min-height:1.4em;margin-top:10px;font-size:13.5px;color:var(--accent);font-weight:600}
.mbar{display:none}
/* motion */
.rv{opacity:1;transform:none;transition:transform .7s cubic-bezier(.2,.7,.2,1)}.js .rv.pre{transform:translateY(14px)}
@media(prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}html{scroll-behavior:auto}.js .rv.pre{transform:none}}
/* responsive */
@media(max-width:1100px){.hero{grid-template-columns:1fr;gap:44px;padding-top:36px}.hero-txt{max-width:640px}.devs{max-width:640px;margin-inline:auto;width:100%}.sp-a{left:-60px}.tgrid{grid-template-columns:repeat(2,minmax(0,1fr))}.feats{grid-template-columns:repeat(4,minmax(0,1fr))}.f-live{grid-column:span 4}.f-tpl,.f-gb,.f-rsvp,.f-dash{grid-column:span 2}.plans{grid-template-columns:1fr 1fr 1fr;gap:14px}.plan{padding-inline:20px}.faqgrid{grid-template-columns:1fr}.help{position:static}
 .acts{display:none}nav.m{display:none}.burger{display:grid;place-items:center;margin-left:auto;width:44px;height:44px;border-radius:12px;border:1.5px solid var(--line);background:#fff;color:var(--accent);cursor:pointer}
 nav.m.open{display:flex;flex-direction:column;gap:4px;position:absolute;left:0;right:0;top:100%;margin:0;padding:12px;background:var(--card);border:1px solid var(--line);border-radius:18px;box-shadow:var(--shadow)}nav.m.open a{padding:13px 12px;border-radius:10px}nav.m.open a:hover{background:var(--soft)}nav.m a::after{display:none}.mob-acts{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px}}
@media(max-width:820px){.strip{grid-template-columns:1fr}.strip h2{border:0;padding:0}.evs{grid-template-columns:repeat(3,minmax(0,1fr))}.tgrid{grid-template-columns:1fr}.steps{grid-template-columns:1fr}.plans{grid-template-columns:1fr;max-width:480px;margin-inline:auto}.tms{grid-template-columns:1fr}.trustband{grid-template-columns:1fr}.fg{grid-template-columns:1fr 1fr}.fb{grid-column:1/-1}.sec{padding-top:64px}.mini{grid-template-columns:1fr}}
@media(max-width:620px){body{padding-bottom:84px}.feats{grid-template-columns:1fr}.f-live,.f-tpl,.f-gb,.f-rsvp,.f-dash{grid-column:auto}.cta .btn{flex:1 1 100%}.phone{right:-3%}.sp-a,.sp-b{display:none}.fin{padding:52px 20px;border-radius:26px}.mbar{display:block;position:fixed;left:0;right:0;bottom:0;z-index:40;padding:10px max(16px,env(safe-area-inset-right,0px)) calc(10px + env(safe-area-inset-bottom,0px)) max(16px,env(safe-area-inset-left,0px));background:color-mix(in srgb,var(--bg) 90%,transparent);backdrop-filter:blur(10px);border-top:1px solid var(--line);transition:transform .3s}.mbar.hide{transform:translateY(110%)}.pcs{grid-template-columns:1fr}.pc span{display:flex;justify-content:space-between;padding:12px 14px}dialog{padding:24px 20px}.evs{gap:2px}.ev{padding:12px 2px;font-size:12.5px}}
"""

JS = r"""
(function(){
var d=document,$=function(s,r){return(r||d).querySelector(s)},$$=function(s,r){return Array.prototype.slice.call((r||d).querySelectorAll(s))};
d.documentElement.classList.add('js');
var APP={signup:'',login:'',whatsapp:''}; /* isi saat pendaftaran/login/WhatsApp siap; kosong = dialog informasi */
var PLAN={essential:['Essential',79000],signature:['Signature',149000],luxe:['Luxe',249000]};
var EVL={pernikahan:'Pernikahan',ulangtahun:'Ulang Tahun',wisuda:'Wisuda',seminar:'Seminar & Workshop',corporate:'Corporate Event',lainnya:'Lainnya'};
var TPL={'romantic-garden':'Romantic Garden','jawa-tengah':'Adat Jawa Tengah'};
function store(k,v){try{if(v===undefined)return JSON.parse(localStorage.getItem(k));localStorage.setItem(k,JSON.stringify(v))}catch(e){return null}}
/* menu mobile */
var burger=$('#burger'),menu=$('#menu');
function menuSet(o){menu.classList.toggle('open',o);burger.setAttribute('aria-expanded',o);burger.setAttribute('aria-label',o?'Tutup menu':'Buka menu')}
burger.addEventListener('click',function(){menuSet(!menu.classList.contains('open'))});
$$('#menu a').forEach(function(a){a.addEventListener('click',function(){menuSet(false)})});
d.addEventListener('keydown',function(e){if(e.key==='Escape')menuSet(false)});
/* nav aktif */
var secs=['beranda','fitur','template','harga','bantuan'].map(function(i){return d.getElementById(i)}).filter(Boolean),links=$$('[data-nav]');
function spy(){var y=innerHeight*.35,cur='beranda';secs.forEach(function(s){if(s.getBoundingClientRect().top<y)cur=s.id});links.forEach(function(a){a.classList.toggle('on',a.getAttribute('href')==='#'+cur)})}
addEventListener('scroll',spy,{passive:true});spy();
/* hero: pergantian tema */
var hs=$$('#hs img'),hp=$$('#hp img'),hn=$('#hn'),names=['Romantic Garden','Adat Jawa Tengah'],hi=0,hold=false;
function hero(i){hs.forEach(function(x,j){x.classList.toggle('on',j===i)});hp.forEach(function(x,j){x.classList.toggle('on',j===i)});hn.textContent=names[i]}
if(!matchMedia('(prefers-reduced-motion:reduce)').matches){var dv=$('.devs');dv.addEventListener('pointerenter',function(){hold=true});dv.addEventListener('pointerleave',function(){hold=false});setInterval(function(){if(hold||d.hidden)return;hi=(hi+1)%hs.length;hero(hi)},4200)}
/* filter template per jenis acara */
var tcards=$$('.tcard'),tcount=$('#tcount'),treset=$('#treset'),tnote=$('#tnote'),evb=$$('.ev'),flt=null;
function filt(id){flt=flt===id?null:id;evb.forEach(function(b){b.setAttribute('aria-pressed',b.dataset.ev===flt)});
 var n=0;tcards.forEach(function(c){var soon=c.classList.contains('soon'),match=!flt||c.dataset.ev.split(' ').indexOf(flt)>-1;if(!soon){c.classList.toggle('dim',!!flt&&!match);if(!flt||match)n++}else c.classList.remove('dim')});
 tcount.textContent=flt?(n?n+' template untuk '+EVL[flt]:'Belum ada template khusus '+EVL[flt]):'2 template tersedia';
 treset.hidden=!flt;tnote.hidden=!(flt&&!n);if(flt&&!n)tnote.textContent='Template khusus '+EVL[flt]+' sedang disiapkan. Anda tetap bisa memakai template yang ada dan menyesuaikan teksnya, atau beri tahu kami acara yang Anda rencanakan.';
 if(flt)$('#template').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'auto':'smooth'})}
evb.forEach(function(b){b.addEventListener('click',function(){filt(b.dataset.ev)})});treset.addEventListener('click',function(){filt(flt)});
/* pratinjau desktop / ponsel */
$$('.tcard .vt').forEach(function(g){var tv=g.parentNode,img=$('img',tv);$$('button',g).forEach(function(b){b.addEventListener('click',function(){var m=b.dataset.v==='m';$$('button',g).forEach(function(x){x.classList.toggle('on',x===b)});img.src=m?img.dataset.m:img.dataset.d;tv.classList.toggle('ph',m)})})});
/* dialog */
var dlg=$('#dlg'),pS=$('#pane-start'),pI=$('#pane-info'),fEv=$('#f-ev'),fTp=$('#f-tp'),sum=$('#sum'),okm=$('#okmsg'),bGo=$('#b-go'),bWa=$('#b-wa'),note=$('#appnote');
function plan(){var r=$('input[name=plan]:checked');return r?r.value:'signature'}
function summary(){var p=PLAN[plan()],t=fTp.value?TPL[fTp.value]:'Belum memilih';var s='Jenis acara: '+EVL[fEv.value]+'\nTemplate: '+t+'\nPaket: '+p[0]+' (Rp'+p[1].toLocaleString('id-ID')+')';return s}
function render(){var p=PLAN[plan()],t=fTp.value?TPL[fTp.value]:'Belum memilih';sum.innerHTML='<b>Ringkasan</b><br>Acara: '+EVL[fEv.value]+'<br>Template: '+t+'<br>Paket: '+p[0]+' &middot; Rp'+p[1].toLocaleString('id-ID');okm.textContent='';
 store('nm:pilihan',{ev:fEv.value,tpl:fTp.value,plan:plan()});
 var q='?acara='+encodeURIComponent(fEv.value)+'&template='+encodeURIComponent(fTp.value)+'&paket='+plan();
 if(APP.signup){bGo.hidden=false;bGo.href=APP.signup+q;note.hidden=true}else{bGo.hidden=true;note.hidden=false}
 if(APP.whatsapp){bWa.hidden=false;bWa.href='https://wa.me/'+APP.whatsapp+'?text='+encodeURIComponent('Halo NusaMora, saya ingin membuat undangan.\n'+summary())}else bWa.hidden=true}
function show(mode,o){o=o||{};
 if(mode==='login'&&APP.login){location.href=APP.login;return}
 if(mode==='start'){pS.hidden=false;pI.hidden=true;var s=store('nm:pilihan')||{};fEv.value=o.ev||s.ev||'pernikahan';fTp.value=o.tpl!==undefined?o.tpl:(s.tpl||'');var pl=o.plan||s.plan||'signature',r=$('input[name=plan][value='+pl+']');if(r)r.checked=true;render()}
 else{pS.hidden=true;pI.hidden=false;if(mode==='login'){$('#it').textContent='Masuk ke dashboard';$('#ib').textContent='Login dashboard pelanggan dibuka bersamaan dengan pendaftaran akun, yang sedang kami siapkan. Sementara ini Anda bisa mencoba demo template tanpa login.'}else{$('#it').textContent=o.doc||'Dokumen';$('#ib').textContent=(o.doc||'Dokumen')+' sedang disusun dan akan dipublikasikan sebelum pelanggan pertama menggunakan layanan. Dokumen ini wajib ada karena undangan menyimpan data pribadi tamu.'}}
 if(typeof dlg.showModal==='function'){if(!dlg.open)dlg.showModal()}else dlg.setAttribute('open','')}
d.addEventListener('click',function(e){var t=e.target.closest('[data-open]');if(!t)return;e.preventDefault();var m=t.dataset.open;show(m,{tpl:t.dataset.tpl,plan:t.dataset.plan,doc:t.dataset.doc,ev:t.closest('.tcard')&&t.dataset.tpl?(TPL_EV[t.dataset.tpl]||undefined):undefined})});
var TPL_EV={'romantic-garden':'pernikahan','jawa-tengah':'pernikahan'};
[fEv,fTp].forEach(function(x){x.addEventListener('change',render)});$$('input[name=plan]').forEach(function(x){x.addEventListener('change',render)});
$('#b-close').addEventListener('click',function(){dlg.close()});
dlg.addEventListener('click',function(e){if(e.target===dlg)dlg.close()});
$('#b-copy').addEventListener('click',function(){var txt='NusaMora - rencana undangan\n'+summary();
 function done(){okm.textContent='Ringkasan disalin.'}function fb(){var ta=d.createElement('textarea');ta.value=txt;ta.setAttribute('readonly','');ta.style.cssText='position:fixed;opacity:0';d.body.appendChild(ta);ta.select();try{d.execCommand('copy')?done():okm.textContent='Salin manual: '+txt.replace(/\n/g,' | ')}catch(er){okm.textContent='Salin manual: '+txt.replace(/\n/g,' | ')}ta.remove()}
 try{navigator.clipboard.writeText(txt).then(done,fb)}catch(er){fb()}});
/* muncul halus saat scroll */
if('IntersectionObserver' in window&&!matchMedia('(prefers-reduced-motion:reduce)').matches){var io=new IntersectionObserver(function(es){es.forEach(function(en){if(en.isIntersecting){en.target.classList.remove('pre');io.unobserve(en.target)}})},{rootMargin:'0px 0px -6% 0px'});
 $$('.rv').forEach(function(el){if(el.getBoundingClientRect().top>innerHeight){el.classList.add('pre');io.observe(el)}})}
/* bar CTA mobile disembunyikan saat CTA akhir terlihat */
var mb=$('#mbar'),fin=$('.fin');if(mb&&fin&&'IntersectionObserver' in window){new IntersectionObserver(function(es){mb.classList.toggle('hide',es[0].isIntersecting)}).observe(fin)}
})();
"""

# ---------------------------------------------------------------- JSON-LD
def jsonld():
    offers = [{"@type": "Offer", "name": p["name"], "price": str(p["price"]), "priceCurrency": "IDR", "availability": "https://schema.org/PreOrder",
               "url": f"{SITE}/#harga", "description": f"Masa aktif {p['feats'][0][1]}, {p['feats'][1][1]} galeri"} for p in PLANS]
    g = {"@context": "https://schema.org", "@graph": [
        {"@type": "Organization", "@id": f"{SITE}/#org", "name": "NusaMora", "url": f"{SITE}/", "logo": f"{SITE}/assets/favicon.svg",
         "description": "Layanan undangan digital interaktif untuk pernikahan, ulang tahun, dan acara lainnya."},
        {"@type": "WebSite", "@id": f"{SITE}/#web", "url": f"{SITE}/", "name": "NusaMora", "inLanguage": "id-ID", "publisher": {"@id": f"{SITE}/#org"}},
        {"@type": "Product", "@id": f"{SITE}/#produk", "name": "Undangan Digital Interaktif NusaMora", "brand": {"@id": f"{SITE}/#org"},
         "description": "Undangan digital interaktif dengan template unik, link pribadi per tamu, RSVP, buku ucapan, dan Live Guest 3D.",
         "image": f"{SITE}/assets/og-nusamora.png", "category": "Undangan digital",
         "offers": {"@type": "AggregateOffer", "priceCurrency": "IDR", "lowPrice": "79000", "highPrice": "249000", "offerCount": len(offers), "offers": offers}},
        {"@type": "FAQPage", "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in FAQ]}]}
    return json.dumps(g, ensure_ascii=False, separators=(",", ":"))

# ---------------------------------------------------------------- ASSEMBLY
FONTS = "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Playfair+Display:ital,wght@0,500;0,600;0,700;1,600;1,700&display=swap"
def body():
    return "\n".join([flowers(), nav(), '<main id="utama">', hero(), strip(), features(), templates(), steps(), pricing(), testimonials(), faq(), final_cta(), '</main>', footer(), modal()])

def head_meta():
    return f'''<title>{SEO_TITLE}</title>
<meta name="description" content="{E(SEO_DESC)}">
<meta name="keywords" content="undangan digital, undangan pernikahan digital, undangan online, undangan digital interaktif, undangan ulang tahun digital, template undangan digital">
<meta name="theme-color" content="#6a34b6"><meta name="color-scheme" content="light">
<link rel="canonical" href="{SITE}/">
<meta property="og:type" content="website"><meta property="og:locale" content="id_ID"><meta property="og:site_name" content="NusaMora">
<meta property="og:title" content="{SEO_TITLE}"><meta property="og:description" content="{E(SEO_DESC)}"><meta property="og:url" content="{SITE}/">
<meta property="og:image" content="{SITE}/assets/og-nusamora.png"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="Tampilan undangan digital interaktif NusaMora di laptop dan ponsel">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="{SEO_TITLE}"><meta name="twitter:description" content="{E(SEO_DESC)}"><meta name="twitter:image" content="{SITE}/assets/og-nusamora.png">'''

def build_project(out):
    os.makedirs(f"{out}/assets", exist_ok=True)
    open(f"{out}/assets/landing.css", "w").write(CSS.strip() + "\n")
    open(f"{out}/assets/landing.js", "w").write(JS.strip() + "\n")
    page = f'''<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
{head_meta()}
<meta name="robots" content="index,follow,max-image-preview:large">
<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="preload" as="image" href="{TEMPLATES[0]["img"]}" fetchpriority="high">
<link rel="stylesheet" href="{FONTS}">
<link rel="stylesheet" href="/assets/landing.css">
<script type="application/ld+json">{jsonld()}</script>
</head>
<body>
{body()}
<script src="/assets/landing.js" defer></script>
</body>
</html>
'''
    open(f"{out}/index.html", "w").write(page)

def build_artifact(out):
    frag = f'''{head_meta().split(chr(10))[0]}
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="{FONTS}">
<style>{CSS}</style>
{body()}
<script>{JS}</script>
'''
    frag = frag.replace(f"<title>{SEO_TITLE}</title>", "<title>Landing Page NusaMora</title>", 1)
    open(out, "w").write(frag)

if __name__ == "__main__":
    out = sys.argv[2]
    (build_project if MODE == "project" else build_artifact)(out)
    print("built", MODE, out)
