/* Halaman Tutorial NusaMora (/tutorial). Dipanggil konten.js: window.NMTutorial.render(ctx).
   Isi panduan memakai fakta produk yang berlaku. Konten tutorial tambahan dari admin (Konten > Tutorial) tampil sebagai kartu "Dari tim NusaMora". Vanilla JS. */
(function () {
  "use strict";
  var d = document;
  var IC = {
    book: '<path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v17H6.5A2.5 2.5 0 0 0 4 21.5v-17z"/><path d="M4 21.5A2.5 2.5 0 0 1 6.5 19H20"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', x: '<path d="M6 6l12 12M18 6L6 18"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>', left: '<path d="M19 12H5M11 6l-6 6 6 6"/>', check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    chat: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/>', link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/>', smile: '<circle cx="12" cy="12" r="9"/><path d="M8 14s1.5 2 4 2 4-2 4-2M9 9.5h.01M15 9.5h.01"/>',
    copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h9"/>', box: '<path d="M21 8l-9-5-9 5 9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/>',
    img: '<rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-8 8"/>', shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z"/><path d="M9 12l2 2 4-4"/>',
    gift: '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13M5 12v8h14v-8M12 8c-2-4-6-3-5 0 .5 1.5 3 1 5 0zm0 0c2-4 6-3 5 0-.5 1.5-3 1-5 0z"/>', cube: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="10" r="3"/><path d="M6.5 19c.8-3 3-4.5 5.5-4.5s4.7 1.5 5.5 4.5"/>',
    play: '<path d="M8 5l11 7-11 7z"/>', music: '<path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>'
  };
  var ico = function (n, s) { return '<svg viewBox="0 0 24 24" width="' + (s || 20) + '" height="' + (s || 20) + '" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + IC[n] + "</svg>"; };

  var FILTERS = [{ id: "", t: "Semua Panduan" }, { id: "pemula", t: "Pemula / Setup Awal" }, { id: "tamu", t: "Kelola Tamu & WA" }, { id: "live", t: "Fitur Live Guest" }];
  var CATN = { pemula: "Pemula", tamu: "Kelola Tamu", live: "Live Guest" };

  /* Walkthrough 4 langkah */
  var STEPS = [
    { t: "Pilih Paket & Tema Acara", s: "Coba demo, lalu tentukan paket dan template.", tip: "Coba demo template dulu. Paket tidak bisa diganti setelah dibayar dan produk digital tidak bisa direfund.", mock: "paket" },
    { t: "Isi Data Acara, Galeri & Musik", s: "Nama, tanggal, lokasi, foto, dan lagu latar.", tip: "Simpan sebagai draft kapan saja. Link publik baru aktif setelah pembayaran terkonfirmasi.", mock: "data" },
    { t: "Buat Daftar Tamu & Link Unik Otomatis", s: "Tambah nama tamu, link pribadi dibuat otomatis.", tip: "Gunakan link dari menu Statistik Tamu. Kodenya acak per tamu, jadi lebih aman dari penyalahgunaan.", mock: "tamu" },
    { t: "Sebar ke WhatsApp & Pantau RSVP / Live Guest", s: "Kirim pribadi, lalu lihat siapa yang sudah hadir.", tip: "Kirim lewat chat pribadi, bukan grup besar. Pantau RSVP, ucapan, dan Live Guest dari dashboard.", mock: "sebar" }
  ];

  /* Kartu panduan. steps = isi ringkasan di lightbox. */
  var GUIDES = [
    { id: "wa", c: "tamu", lv: "Pemula", min: 2, t: "Cara Membagikan Link Undangan via WhatsApp dengan Pesan Otomatis", ex: "Kirim link pribadi tiap tamu tanpa mengetik ulang.", ic: "chat", hue: "a",
      steps: ["Buka dashboard, pilih undangan, lalu masuk ke menu Statistik Tamu.", "Tambahkan nama tamu (dan nomor WhatsApp bila ada). Link pribadi dibuat otomatis untuk tiap tamu.", "Salin link, atau gunakan tombol kirim agar pesan sapaan terisi otomatis.", "Tempel di chat pribadi tamu. Hindari grup besar supaya link tidak diteruskan ke orang lain.", "Kembali ke Statistik Tamu untuk melihat status terkirim dan apakah link sudah dibuka."], tip: "Tulis nama tamu dengan sapaan yang Anda pakai sehari-hari agar pesan terasa personal." },
    { id: "avatar", c: "live", lv: "Tamu", min: 1, t: "Panduan Tamu: Cara Memilih Avatar & Berkeliling di Venue Live Guest", ex: "Langkah singkat untuk tamu yang baru pertama kali masuk.", ic: "cube", hue: "b",
      steps: ["Buka link pribadi dari pemilik acara, sebaiknya lewat Chrome atau Safari.", "Pilih avatar yang Anda suka, lalu masuk ke venue.", "Geser atau ketuk layar untuk berkeliling dan menyapa tamu lain.", "Isi RSVP dan tulis ucapan untuk mempelai.", "Jika terasa berat, tutup tab lain atau coba jaringan Wi-Fi."], tip: "Live Guest ada di paket Luxe dan menampung hingga 300 tamu bersamaan." },
    { id: "moderasi", c: "tamu", lv: "Pemula", min: 2, t: "Cara Menyaring & Moderasi Ucapan di Buku Tamu Digital", ex: "Sembunyikan atau hapus ucapan yang tidak pantas.", ic: "shield", hue: "c",
      steps: ["Buka menu Buku Tamu di dashboard dan pilih undangan Anda.", "Baca daftar ucapan yang masuk. Hanya tamu terundang yang bisa menulis, dengan nama asli dari daftar tamu.", "Pilih Sembunyikan untuk menyimpan ucapan tanpa menampilkannya, atau Hapus untuk membuangnya.", "Ucapan yang disembunyikan bisa ditampilkan kembali kapan saja."], tip: "Ucapan sudah melewati filter spam dan kata terlarang sebelum sampai ke Anda." },
    { id: "paket", c: "pemula", lv: "Pemula", min: 2, t: "Perbedaan Pengaturan Paket Essential, Signature, dan Luxe", ex: "Pilih paket yang pas sebelum membayar.", ic: "box", hue: "a",
      steps: ["Essential (Rp79.000): undangan website 2D ringan, aktif 90 hari, 10 foto, tanpa revisi.", "Signature (Rp149.000): 3D Cinematic dengan film pembuka, aktif 180 hari, 20 foto, 2x revisi minor.", "Luxe (Rp249.000): 3D Live Guest dengan venue dan avatar, aktif 365 hari, 40 foto, revisi wajar tanpa batas.", "Semua paket: musik latar, RSVP dan ucapan, tanpa watermark, daftar tamu tidak dibatasi."], tip: "Harga sudah termasuk pajak dan dibayar sekali per undangan." },
    { id: "foto", c: "pemula", lv: "Pemula", min: 2, t: "Tips Memilih & Mengompres Foto Galeri Agar Undangan Ringan Dibuka", ex: "Foto yang tepat membuat undangan cepat terbuka di ponsel tamu.", ic: "img", hue: "b",
      steps: ["Pilih foto yang tajam dan terang. Kualitas lebih penting daripada jumlah, sesuai batas paket (10, 20, atau 40 foto).", "Perkecil foto sebelum diunggah. Sisi terpanjang sekitar 1600 px sudah cukup untuk layar ponsel.", "Simpan sebagai JPG atau WebP dengan kualitas sekitar 75 sampai 80 persen. Ukuran idealnya di bawah 500 KB per foto.", "Hindari tangkapan layar dan foto yang sudah dikirim berulang lewat chat karena sudah turun kualitasnya."], tip: "Ini saran umum untuk performa. Aplikasi bawaan ponsel atau situs kompres gambar mana pun bisa dipakai." },
    { id: "amplop", c: "pemula", lv: "Menengah", min: 2, t: "Cara Mengaktifkan Amplop Digital (Rekening & E-wallet) di Undangan", ex: "Tampilkan rekening hadiah dengan rapi untuk tamu yang jauh.", ic: "gift", hue: "c",
      steps: ["Buka editor undangan, lalu cari bagian Hadiah digital.", "Aktifkan fitur tersebut agar bagian hadiah muncul di undangan.", "Tambahkan rekening atau e-wallet (maksimal 4): nama bank atau e-wallet, nomor, dan atas nama.", "Periksa kembali nomor dan nama penerima, lalu simpan dan lihat pratinjau."], tip: "Selalu cek ulang nomor rekening sebelum undangan disebar, karena salah satu digit bisa mengalihkan hadiah." }
  ];

  var GUEST_TEXT = "Halo, kami mengundang Anda hadir di acara kami, termasuk lewat Live Guest.\n\nCara masuk:\n1. Buka link pribadi Anda dari pesan ini. Gunakan Chrome atau Safari agar lebih lancar (bukan di dalam aplikasi WhatsApp).\n2. Pilih karakter avatar yang Anda suka, lalu masuk ke venue.\n3. Sapa tamu lain, isi RSVP, dan kirim ucapan untuk kami.\n\nLink ini khusus untuk Anda, mohon tidak diteruskan ke orang lain. Terima kasih sudah hadir!";

  /* Mockup tiap langkah (HTML statis; semua teks tepercaya dari file ini) */
  var M = {
    paket: function () {
      return '<div class="tt-m m-paket"><p class="m-h" style="--i:0">Pilih paket</p><div class="m-pk">' +
        ["Essential|Rp79.000|2D ringan|90 hari", "Signature|Rp149.000|3D Cinematic|180 hari", "Luxe|Rp249.000|3D Live Guest|365 hari"].map(function (x, i) { x = x.split("|"); return '<div class="m-p' + (i === 1 ? " sel" : "") + '" style="--i:' + (i + 1) + '"><b>' + x[0] + "</b><i>" + x[1] + "</i><small>" + x[2] + "<br>" + x[3] + "</small></div>"; }).join("") +
        '</div><p class="m-h" style="--i:4">Tema acara</p><div class="m-th" style="--i:5"><span class="t1"></span><span class="t2 sel"></span><span class="t3"></span><span class="t4"></span></div><div class="m-btn" style="--i:6">Coba demo template</div></div>';
    },
    data: function () {
      return '<div class="tt-m m-data"><div class="m-f" style="--i:0"><small>Nama mempelai</small><b>Rani &amp; Dimas</b></div><div class="m-row"><div class="m-f" style="--i:1"><small>Tanggal</small><b>14 Feb 2026</b></div><div class="m-f" style="--i:2"><small>Lokasi</small><b>Gedung Serbaguna</b></div></div>' +
        '<p class="m-h" style="--i:3">Galeri foto <em>8 dari 20</em></p><div class="m-gal" style="--i:4"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i class="add">+</i></div>' +
        '<div class="m-mus" style="--i:5">' + ico("music", 18) + '<span>Musik latar</span><div class="m-eq"><u></u><u></u><u></u><u></u></div><span class="m-sw"></span></div></div>';
    },
    tamu: function () {
      return '<div class="tt-m m-tamu"><p class="m-h" style="--i:0">Statistik Tamu <em>3 tamu</em></p>' +
        [["Bu Ratna", "nm.id/u/k7Q2xA"], ["Pak Hendra", "nm.id/u/p9ZfT3"], ["Kak Sinta", "nm.id/u/c4WmR8"]].map(function (g, i) { return '<div class="m-g" style="--i:' + (i + 1) + '"><span class="av">' + g[0].charAt(0) + '</span><div><b>' + g[0] + "</b><small>" + g[1] + '</small></div><span class="cp">' + ico("copy", 15) + "Salin</span></div>"; }).join("") +
        '<div class="m-add" style="--i:4">+ Tambah tamu</div><p class="m-note" style="--i:5">' + ico("shield", 16) + ' Kode unik acak per tamu</p></div>';
    },
    sebar: function () {
      return '<div class="tt-m m-sebar"><div class="m-wa" style="--i:0"><div class="m-bub"><b>Halo Bu Ratna,</b> kami mengundang Anda ke acara kami. Buka undangan Anda di sini:<br><u>nm.id/u/k7Q2xA</u></div><span class="m-tk">' + ico("check", 14) + ' Terkirim</span></div>' +
        '<p class="m-h" style="--i:1">Pantau RSVP</p><div class="m-bars" style="--i:2"><div><span>Hadir</span><i style="--w:72%"></i><b>18</b></div><div><span>Belum pasti</span><i class="b2" style="--w:26%"></i><b>6</b></div><div><span>Tidak hadir</span><i class="b3" style="--w:10%"></i><b>2</b></div></div>' +
        '<div class="m-live" style="--i:3"><span class="dot"></span>Live Guest: 12 tamu sedang di venue<div class="m-avs"><i></i><i></i><i></i><i></i></div></div></div>';
    }
  };

  function plain(h) { return String(h).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(); }

  function render(ctx) {
    var view = ctx.view, esc = ctx.esc, rows = ctx.rows || [], md = ctx.md;
    var guides = GUIDES.slice();
    rows.forEach(function (r, i) { guides.push({ id: "t" + i, c: "", lv: "Panduan", min: Math.max(1, Math.round(plain(md(r.body)).split(" ").length / 180)), t: String(r.title || ""), ex: String(r.excerpt || ""), ic: "book", hue: "a", html: md(r.body), team: true }); });
    var st = { f: "", step: 0 };

    ctx.seo({
      title: "Tutorial NusaMora | Panduan Langkah demi Langkah Membuat Undangan Digital",
      description: "Pelajari cara membuat undangan digital hingga menyebarkan link unik tamu: pilih paket, isi data, buat daftar tamu, kirim lewat WhatsApp, dan pakai Live Guest.",
      canonical: ctx.urlFor(ctx.type, "", ctx.lang), lang: ctx.lang,
      ld: [{ "@context": "https://schema.org", "@type": "HowTo", name: "Cara membuat undangan digital interaktif di NusaMora", step: STEPS.map(function (s, i) { return { "@type": "HowToStep", position: i + 1, name: s.t, text: s.s + " " + s.tip }; }) },
        { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Beranda", item: location.origin + "/" }, { "@type": "ListItem", position: 2, name: "Tutorial", item: location.origin + "/tutorial" }] }]
    });

    var h = '<div class="tt"><div class="kt-w tt-w">';
    h += '<nav class="bt-bc" aria-label="Breadcrumb"><ol><li><a href="/">' + ico("left", 15) + '<span>Beranda</span></a></li><li aria-current="page">Tutorial</li></ol></nav>';
    h += '<header class="tt-hero"><p class="kt-eyebrow">Pusat Panduan</p><h1>Panduan Langkah demi Langkah</h1><p class="tt-sub">Pelajari cara membuat undangan digital hingga menyebarkan link unik tamu hanya dalam hitungan menit.</p>';
    h += '<div class="tt-tabs" role="tablist" aria-label="Filter mode panduan">' + FILTERS.map(function (f, i) { return '<button type="button" role="tab" class="tt-tab" id="tf' + i + '" data-f="' + f.id + '" aria-selected="' + (i === 0 ? "true" : "false") + '" tabindex="' + (i === 0 ? 0 : -1) + '">' + esc(f.t) + "</button>"; }).join("") + "</div></header>";

    /* Walkthrough */
    h += '<section class="tt-wk" id="alur" aria-labelledby="tt-wh"><div class="tt-sh"><h2 id="tt-wh">Alur Kerja 4 Langkah</h2><p>Klik tiap langkah untuk melihat tampilannya.</p></div><div class="tt-wg">';
    h += '<ol class="tt-steps" role="tablist" aria-label="Langkah pembuatan undangan" aria-orientation="vertical">' + STEPS.map(function (s, i) {
      return '<li role="presentation"><button type="button" role="tab" class="tt-st" id="st' + i + '" data-s="' + i + '" aria-controls="tt-pv" aria-selected="' + (i === 0 ? "true" : "false") + '" tabindex="' + (i === 0 ? 0 : -1) + '"><span class="tt-n">' + (i + 1) + '</span><span class="tt-stt"><b>' + esc(s.t) + "</b><small>" + esc(s.s) + "</small></span></button></li>";
    }).join("") + "</ol>";
    h += '<div class="tt-pvw"><div class="tt-dev" aria-hidden="true"><i></i></div><div class="tt-pv" id="tt-pv" role="tabpanel" aria-live="polite" aria-labelledby="st0"></div><div class="tt-tip"><span>' + ico("check", 16) + '</span><p id="tt-tip"></p></div>';
    h += '<div class="tt-nav"><button type="button" class="btn o sm" id="tt-prev">' + ico("left", 16) + 'Sebelumnya</button><span id="tt-cnt" aria-hidden="true"></span><button type="button" class="btn sm" id="tt-next"><span>Berikutnya</span>' + ico("arrow", 16) + "</button></div></div></div></section>";

    /* Kartu */
    h += '<section class="tt-gs" id="panduan" aria-labelledby="tt-gh"><div class="tt-sh"><h2 id="tt-gh">Panduan Siap Pakai</h2><p id="tt-gc" role="status" aria-live="polite"></p></div><div class="tt-grid" id="tt-grid"></div></section>';

    /* Panduan tamu */
    h += '<section class="tt-gb" id="tamu" aria-labelledby="tt-bh"><div class="tt-gbh"><p class="kt-eyebrow inv">Untuk Tamu Undangan</p><h2 id="tt-bh">Cara Masuk ke Live Guest</h2><p>Bagikan panduan singkat ini bersama link pribadi, supaya tamu tidak bingung saat pertama masuk.</p></div>';
    h += '<ol class="tt-gst">' + [["link", "Buka Link Pribadi", "Ketuk link dari pemilik acara, lebih baik lewat Chrome atau Safari."], ["user", "Pilih Karakter Avatar", "Pilih avatar yang Anda suka lalu masuk ke venue."], ["smile", "Sapa & Kirim Ucapan", "Sapa tamu lain, isi RSVP, dan tulis ucapan untuk mempelai."]].map(function (x, i) { return "<li><span class=\"tt-gi\">" + ico(x[0], 26) + "</span><b>" + (i + 1) + ". " + x[1] + "</b><small>" + x[2] + "</small></li>"; }).join('<li class="tt-ar" aria-hidden="true">' + ico("arrow", 22) + "</li>") + "</ol>";
    h += '<div class="tt-cp"><label for="tt-gt">Teks panduan untuk dibagikan ke tamu</label><textarea id="tt-gt" rows="9" readonly>' + esc(GUEST_TEXT) + '</textarea><div class="tt-cpa"><button type="button" class="btn" id="tt-copy">' + ico("copy", 18) + '<span>Salin Teks Panduan</span></button><span id="tt-cs" role="status" aria-live="polite"></span></div></div></section>';

    /* CTA */
    h += '<section class="tt-cta" aria-labelledby="tt-ch"><div><h2 id="tt-ch">Sudah paham cara kerjanya?</h2><p>Coba langsung demo interaktif atau mulai buat draft undangan Anda. Simpan draft gratis, bayar saat Anda siap.</p></div><div class="tt-ca"><a class="btn lg tt-gold" href="/live/">Lihat Demo Live Guest</a><a class="btn lg o tt-inv" href="/template">Pilih Template</a></div></section>';
    h += '<dialog class="tt-dlg" id="tt-dlg" aria-labelledby="tt-dt"><div class="tt-dc"><button type="button" class="tt-x" aria-label="Tutup panduan">' + ico("x", 20) + '</button><div id="tt-db"></div></div></dialog>';
    h += "</div></div>";
    view.innerHTML = h;

    var $ = function (s) { return view.querySelector(s); }, grid = $("#tt-grid"), pv = $("#tt-pv"), dlg = $("#tt-dlg"), lastBtn = null;

    function thumb(g) { return '<div class="tt-th h-' + g.hue + '"><svg viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><circle cx="270" cy="30" r="70" fill="rgba(255,255,255,.08)"/><circle cx="40" cy="170" r="80" fill="rgba(243,231,207,.1)"/><path d="M0 130c60-30 110 20 170-8s100-30 150 0v58H0z" fill="rgba(255,255,255,.07)"/></svg><span class="tt-ti">' + ico(g.ic, 40) + '</span><span class="tt-pl">' + ico("book", 16) + "Baca</span></div>"; }
    function drawGrid() {
      var m = guides.filter(function (g) { return !st.f || g.c === st.f; });
      grid.innerHTML = m.length ? m.map(function (g) { var i = guides.indexOf(g); return '<article class="tt-gc"><button type="button" class="tt-gcb" data-g="' + i + '" aria-haspopup="dialog">' + thumb(g) + '<div class="tt-gm"><div class="tt-bd"><span class="tt-b1">' + esc(g.lv) + "</span>" + (g.c ? '<span class="tt-b2">' + esc(CATN[g.c]) + "</span>" : "") + '<span class="tt-b3">' + ico("clock", 13) + "Panduan " + g.min + " mnt</span></div><h3>" + esc(g.t) + "</h3>" + (g.ex ? "<p>" + esc(g.ex) + "</p>" : "") + "</div></button></article>"; }).join("") : '<div class="card tt-em">Belum ada panduan di kategori ini.</div>';
      $("#tt-gc").textContent = m.length + " panduan" + (st.f ? " untuk " + FILTERS.filter(function (f) { return f.id === st.f; })[0].t : "");
    }
    function setStep(n, focus) {
      n = (n + STEPS.length) % STEPS.length; st.step = n; var s = STEPS[n];
      [].slice.call(view.querySelectorAll(".tt-st")).forEach(function (b, i) { var on = i === n; b.setAttribute("aria-selected", on ? "true" : "false"); b.tabIndex = on ? 0 : -1; b.classList.toggle("done", i < n); });
      pv.setAttribute("aria-labelledby", "st" + n); pv.classList.remove("in"); pv.innerHTML = M[s.mock](); void pv.offsetWidth; pv.classList.add("in");
      $("#tt-tip").textContent = s.tip; $("#tt-cnt").textContent = "Langkah " + (n + 1) + " dari " + STEPS.length;
      $("#tt-next span").textContent = n === STEPS.length - 1 ? "Ulangi" : "Berikutnya";
      if (focus) $("#st" + n).focus();
    }
    function open(i, btn) {
      var g = guides[i]; lastBtn = btn;
      var body = g.html ? '<div class="kt-body">' + g.html + "</div>" : '<ol class="tt-ol">' + g.steps.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ol>" + (g.tip ? '<p class="tt-dtip">' + ico("check", 16) + "<span>" + esc(g.tip) + "</span></p>" : "");
      $("#tt-db").innerHTML = '<div class="tt-bd"><span class="tt-b1">' + esc(g.lv) + "</span>" + (g.c ? '<span class="tt-b2">' + esc(CATN[g.c]) + "</span>" : "") + '<span class="tt-b3">' + ico("clock", 13) + "Panduan " + g.min + ' mnt</span></div><h2 id="tt-dt">' + esc(g.t) + "</h2>" + body;
      if (typeof dlg.showModal === "function") dlg.showModal(); else dlg.setAttribute("open", "");
      d.documentElement.classList.add("tt-lock");
    }
    function close() { if (dlg.close) dlg.close(); else dlg.removeAttribute("open"); }
    dlg.addEventListener("close", function () { d.documentElement.classList.remove("tt-lock"); if (lastBtn && d.contains(lastBtn)) lastBtn.focus(); });
    dlg.addEventListener("click", function (e) { if (e.target === dlg || e.target.closest(".tt-x")) close(); });

    view.addEventListener("click", function (e) {
      var t;
      if ((t = e.target.closest(".tt-tab"))) { st.f = t.getAttribute("data-f"); [].slice.call(view.querySelectorAll(".tt-tab")).forEach(function (b) { var on = b === t; b.setAttribute("aria-selected", on ? "true" : "false"); b.tabIndex = on ? 0 : -1; }); drawGrid(); return; }
      if ((t = e.target.closest(".tt-st"))) { setStep(+t.getAttribute("data-s")); return; }
      if (e.target.closest("#tt-next")) { setStep(st.step + 1); return; }
      if (e.target.closest("#tt-prev")) { setStep(st.step - 1); return; }
      if ((t = e.target.closest(".tt-gcb"))) { open(+t.getAttribute("data-g"), t); return; }
      if (e.target.closest("#tt-copy")) copy();
    });
    function arrows(sel, fn) { view.addEventListener("keydown", function (e) { var t = e.target.closest(sel); if (!t) return; var k = e.key, list = [].slice.call(view.querySelectorAll(sel)), i = list.indexOf(t), n = -1; if (k === "ArrowRight" || k === "ArrowDown") n = (i + 1) % list.length; else if (k === "ArrowLeft" || k === "ArrowUp") n = (i - 1 + list.length) % list.length; else if (k === "Home") n = 0; else if (k === "End") n = list.length - 1; if (n < 0) return; e.preventDefault(); fn(list[n]); }); }
    arrows(".tt-tab", function (b) { b.click(); b.focus(); });
    arrows(".tt-st", function (b) { setStep(+b.getAttribute("data-s"), true); });

    function copy() {
      var out = $("#tt-cs"), ta = $("#tt-gt");
      function ok() { out.textContent = "Teks panduan tersalin."; out.className = "ok"; setTimeout(function () { out.textContent = ""; }, 3200); }
      function fb() { ta.removeAttribute("readonly"); ta.select(); try { d.execCommand("copy") ? ok() : (out.textContent = "Salin manual: teks sudah terpilih."); } catch (x) { out.textContent = "Salin manual: teks sudah terpilih."; } ta.setAttribute("readonly", ""); }
      if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(GUEST_TEXT).then(ok, fb); else fb();
    }
    drawGrid(); setStep(0);
  }
  window.NMTutorial = { render: render };
})();
