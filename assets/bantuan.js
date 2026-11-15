/* Halaman Pusat Bantuan NusaMora (/bantuan). Dipakai oleh konten.js: window.NMHelp.render(ctx).
   Isi FAQ berasal dari fakta produk yang berlaku (paket, masa aktif, pembayaran, Live Guest). FAQ tambahan dari admin
   (Konten > FAQ di database) ikut tampil di kelompok "Dari tim NusaMora". Vanilla JS, tanpa pustaka. */
(function () {
  "use strict";
  var d = document;
  var EMAIL = "halo@nusamora.com";

  var IC = {
    box: '<path d="M21 8l-9-5-9 5 9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/>',
    edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/>',
    users: '<path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2"/><circle cx="10" cy="8" r="4"/><path d="M21 21v-2a4 4 0 0 0-3-3.9"/><path d="M16 4.1a4 4 0 0 1 0 7.8"/>',
    cube: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="10" r="3"/><path d="M6.5 19c.8-3 3-4.5 5.5-4.5s4.7 1.5 5.5 4.5"/>',
    card: '<rect x="2" y="5" width="20" height="14" rx="3"/><path d="M2 10h20"/><path d="M6 15h4"/>',
    tool: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.1L3 17.7V21h3.3l6.3-6.3a4 4 0 0 0 5.1-5.4l-2.6 2.6-2.4-.6-.6-2.4 2.6-2.6z"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
    chev: '<path d="M6 9l6 6 6-6"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M3 7l9 6 9-6"/>',
    chat: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/>',
    book: '<path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v17H6.5A2.5 2.5 0 0 0 4 21.5v-17z"/><path d="M4 21.5A2.5 2.5 0 0 1 6.5 19H20"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    home: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>'
  };
  var ico = function (n, s) { return '<svg viewBox="0 0 24 24" width="' + (s || 22) + '" height="' + (s || 22) + '" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + IC[n] + "</svg>"; };

  var CATS = [
    { id: "mulai", t: "Memulai & Pilih Paket", s: "Perbedaan Essential, Signature, dan Luxe", i: "box" },
    { id: "acara", t: "Pengaturan Acara & Template", s: "Cara isi data, galeri foto, musik latar", i: "edit" },
    { id: "tamu", t: "Daftar Tamu & Link Unik", s: "Sebar lewat WhatsApp, keamanan kode unik, ucapan", i: "users" },
    { id: "live", t: "Fitur Live Guest & Avatar", s: "Tamu memilih avatar dan masuk venue interaktif", i: "cube" },
    { id: "bayar", t: "Pembayaran, Revisi & Masa Aktif", s: "Transfer/QRIS, aturan revisi, perpanjangan", i: "card" },
    { id: "teknis", t: "Kendala Teknis & Browser", s: "Undangan lambat di browser dalam aplikasi WhatsApp", i: "tool" }
  ];
  var TAGS = [{ l: "Link Unik Tamu", q: "link unik" }, { l: "Live Guest", q: "live guest" }, { l: "Masa Aktif", q: "masa aktif" }, { l: "Pembayaran & Revisi", c: "bayar" }];

  /* c = kategori, q = pertanyaan, a = jawaban (HTML tepercaya, ditulis di sini), k = kata kunci tambahan untuk pencarian */
  var FAQ = [
    { c: "mulai", q: "Apa bedanya paket Essential, Signature, dan Luxe?", k: "harga perbandingan paket 2d 3d cinematic",
      a: '<p>Ketiganya dibayar sekali per undangan dan sudah termasuk pajak.</p><ul><li><b>Essential (Rp79.000):</b> undangan website 2D yang ringan, masa aktif 90 hari, 10 foto galeri, tanpa revisi, tanpa dukungan khusus.</li><li><b>Signature (Rp149.000):</b> undangan 3D Cinematic dengan film pembuka, masa aktif 180 hari, 20 foto galeri, 2x revisi minor, dukungan via email.</li><li><b>Luxe (Rp249.000):</b> undangan 3D Live Guest dengan venue dan avatar interaktif (hingga 300 tamu bersamaan), masa aktif 365 hari, 40 foto galeri, revisi wajar tanpa batas, dukungan via email.</li></ul><p>Semua paket memiliki musik latar, RSVP dan ucapan, tanpa watermark, dan daftar tamu yang tidak dibatasi per paket.</p>' },
    { c: "mulai", q: "Paket mana yang cocok untuk saya?", k: "memilih rekomendasi demo coba",
      a: '<p>Pilih <b>Essential</b> bila Anda ingin undangan yang cepat dibuka dan sederhana. Pilih <b>Signature</b> bila ingin kesan sinematik saat tamu membuka undangan. Pilih <b>Luxe</b> bila ingin tamu bisa hadir secara interaktif di venue 3D.</p><p>Coba demo template terlebih dahulu di <a href="/#template">katalog template</a>, karena paket tidak bisa diubah setelah dibayar. Panduan lengkapnya ada di artikel <a href="/artikel/memilih-paket-undangan-digital">Essential, Signature, atau Luxe?</a></p>' },
    { c: "mulai", q: "Bisakah paket diubah (upgrade atau downgrade) setelah dibayar?", k: "ganti paket naik turun",
      a: "<p>Tidak. Paket tidak bisa diubah setelah pembayaran. Jika masih ragu, simpan sebagai draft dan coba demo template dulu sebelum membayar.</p>" },
    { c: "mulai", q: "Apakah NusaMora hanya untuk undangan pernikahan?", k: "acara ulang tahun pertunangan perusahaan",
      a: "<p>Tidak. NusaMora dibuat untuk pernikahan, pertunangan, ulang tahun, hingga acara keluarga dan perusahaan. Template untuk acara non-pernikahan ditambah bertahap.</p>" },
    { c: "mulai", q: "Apakah tersedia dalam bahasa Inggris?", k: "english bahasa",
      a: "<p>Versi pertama berbahasa Indonesia. Bahasa Inggris menyusul.</p>" },

    { c: "acara", q: "Data apa saja yang perlu saya siapkan sebelum mengisi undangan?", k: "isi data checklist nama orang tua tanggal lokasi",
      a: '<p>Siapkan nama lengkap dan nama panggilan kedua mempelai, nama orang tua, tanggal dan jam akad serta resepsi, alamat dan peta lokasi, foto, dan teks sambutan. Daftar lengkapnya ada di <a href="/artikel/checklist-isi-undangan-pernikahan-digital">Checklist Isi Undangan Pernikahan Digital</a>.</p>' },
    { c: "acara", q: "Berapa foto galeri yang bisa saya unggah?", k: "foto galeri batas jumlah",
      a: "<p>Essential 10 foto, Signature 20 foto, dan Luxe 40 foto. Gunakan foto yang jelas dan tidak terlalu berat agar undangan tetap cepat dibuka.</p>" },
    { c: "acara", q: "Apakah saya bisa memasang musik latar?", k: "musik lagu suara audio",
      a: "<p>Ya, semua paket memiliki musik latar. Anda memilih lagu dari pilihan yang tersedia di editor dan bisa menyalakan atau mematikannya. Tamu juga bisa mematikan musik kapan saja.</p>" },
    { c: "acara", q: "Apakah undangan memakai watermark?", k: "watermark logo",
      a: "<p>Tidak. Semua paket bebas watermark.</p>" },
    { c: "acara", q: "Bagaimana cara mencoba template sebelum membeli?", k: "demo coba preview",
      a: '<p>Buka <a href="/#template">katalog template</a>, lalu coba demo tiap template. Anda boleh menyimpan draft dulu, dan link publik baru aktif setelah pembayaran terkonfirmasi. Untuk melihat pengalaman Live Guest, coba juga demo venue 3D di beranda.</p>' },

    { c: "tamu", q: "Bagaimana cara menyebarkan undangan ke tamu lewat WhatsApp?", k: "kirim bagikan whatsapp wa daftar tamu",
      a: '<p>Buka menu <b>Statistik Tamu</b> di dashboard, tambahkan nama (dan nomor) tamu, lalu salin atau kirim link pribadi tiap tamu lewat WhatsApp. Kirim secara pribadi, bukan di grup besar. Tips lengkap ada di <a href="/artikel/tips-membagikan-undangan-digital-lewat-whatsapp">Tips Membagikan Undangan lewat WhatsApp</a> dan <a href="/artikel/cara-praktis-mengatur-daftar-tamu-dan-undangan-whatsapp-tidak-terlewat">cara mengatur daftar tamu</a>.</p>' },
    { c: "tamu", q: "Apa itu link unik per tamu, dan apakah aman dari penyalahgunaan?", k: "link unik kode token keamanan aman teruskan bagikan",
      a: '<p>Link dari menu Statistik Tamu memakai <b>kode unik acak per tamu</b>, bukan nama di alamat link. Kode itu tidak bisa ditebak, dan RSVP serta ucapan hanya bisa dikirim oleh tamu yang Anda undang. Jadi link tidak mudah dipakai orang yang tidak diundang.</p><p>Catatan: pembuat link cepat berdasarkan nama di editor memakai format nama di alamat (<i>?to=Nama</i>). Itu praktis, tetapi nama bisa diubah siapa saja, jadi untuk keamanan lebih baik pakai link dari Statistik Tamu. Penjelasannya ada di <a href="/artikel/link-undangan-digital-nama-tamu-di-url-berisiko-disalahgunakan">artikel risiko nama tamu di URL</a>.</p>' },
    { c: "tamu", q: "Siapa yang bisa mengirim ucapan, dan bagaimana cara memoderasinya?", k: "ucapan buku tamu moderasi sembunyikan hapus spam komentar",
      a: "<p>Hanya tamu terundang yang bisa mengirim ucapan, dengan nama asli dari daftar tamu Anda. Tidak ada komentar anonim. Ucapan melewati filter spam dan kata terlarang. Di menu <b>Buku Tamu</b> Anda bisa menyembunyikan atau menghapus ucapan kapan saja.</p>" },
    { c: "tamu", q: "Bagaimana saya tahu siapa yang sudah membuka undangan dan mengisi RSVP?", k: "rsvp statistik dibuka konfirmasi hadir",
      a: "<p>Menu <b>Statistik Tamu</b> menunjukkan status terkirim, apakah tamu sudah membuka link, dan berapa kali dibuka. Menu <b>RSVP</b> menampilkan kehadiran dan jumlah orang yang dikonfirmasi tamu.</p>" },
    { c: "tamu", q: "Berapa jumlah tamu yang bisa saya masukkan?", k: "batas jumlah tamu kapasitas maksimal rsvp 3000",
      a: "<p>Daftar tamu tidak dibatasi per paket. Secara teknis, satu undangan menerima hingga 3.000 RSVP.</p>" },

    { c: "live", q: "Apa itu Live Guest, dan paket mana yang memilikinya?", k: "live guest venue 3d luxe interaktif",
      a: "<p>Live Guest adalah venue 3D tempat tamu hadir sebagai avatar, saling menyapa, mengisi RSVP, dan mengirim ucapan. Fitur ini hanya ada di paket <b>Luxe</b>.</p>" },
    { c: "live", q: "Bagaimana tamu memilih avatar dan masuk ke venue?", k: "avatar masuk venue ruangan tamu panduan",
      a: "<ol><li>Tamu membuka link pribadinya dari WhatsApp.</li><li>Tamu memilih avatar yang diinginkan.</li><li>Tamu masuk ke venue 3D, lalu bisa menyapa, mengisi RSVP, dan menulis ucapan.</li></ol><p>Tamu tidak perlu memasang aplikasi. Cukup browser di ponsel atau komputer.</p>" },
    { c: "live", q: "Berapa tamu yang bisa masuk ke venue bersamaan?", k: "kapasitas 300 penuh antre",
      a: "<p>Hingga 300 tamu bersamaan. Bila ruang penuh, tamu berikutnya bisa masuk setelah ada tamu yang keluar, jadi minta mereka mencoba lagi beberapa saat kemudian. Batas ini dapat disesuaikan NusaMora untuk undangan tertentu.</p>" },
    { c: "live", q: "Apakah Live Guest ada di paket Essential atau Signature?", k: "live guest essential signature",
      a: "<p>Tidak. Venue dan avatar Live Guest hanya tersedia di paket Luxe.</p>" },

    { c: "bayar", q: "Bagaimana cara membayar?", k: "pembayaran transfer qris bank metode",
      a: "<p>Pembayaran lewat transfer bank atau QRIS. Anda boleh menyimpan draft dulu, dan link publik aktif setelah pembayaran terkonfirmasi. Metode otomatis lain menyusul.</p>" },
    { c: "bayar", q: "Bagaimana aturan revisi?", k: "revisi ubah edit perubahan",
      a: "<ul><li><b>Essential:</b> tanpa revisi.</li><li><b>Signature:</b> 2x revisi minor.</li><li><b>Luxe:</b> revisi wajar tanpa batas.</li></ul><p>Bila ragu apakah suatu perubahan termasuk revisi minor, tanyakan lewat email dukungan sebelum membayar.</p>" },
    { c: "bayar", q: "Berapa lama masa aktif undangan, dan apa yang terjadi setelah habis?", k: "masa aktif 90 180 365 hari kedaluwarsa perpanjangan tenggang arsip",
      a: "<p>Masa aktif Essential 90 hari, Signature 180 hari, Luxe 365 hari. Setelah habis, undangan dinonaktifkan dan ada masa tenggang 7 hari, lalu diarsipkan selama 90 hari. Selama diarsipkan, undangan bisa diaktifkan kembali dengan perpanjangan, sama untuk semua paket: Rp15.000 (1 bulan), Rp30.000 (3 bulan), Rp50.000 (6 bulan), atau Rp80.000 (12 bulan). Setelah 90 hari, data undangan dapat dihapus permanen.</p>" },
    { c: "bayar", q: "Apakah ada pengembalian dana (refund)?", k: "refund pengembalian dana batal non refundable uang kembali",
      a: '<p>Tidak ada pengembalian dana untuk produk digital yang sudah dibeli. Karena itu, mohon <a href="/#template">coba demo template</a> terlebih dahulu sebelum memilih paket. Pengajuan terkait pembatalan dapat dikirim ke email dukungan, dan ketentuan lengkapnya ada di <a href="/syarat-ketentuan#refund">Syarat &amp; Ketentuan</a>.</p>' },
    { c: "bayar", q: "Apakah harga sudah termasuk pajak?", k: "pajak ppn harga",
      a: "<p>Ya, harga paket sudah termasuk pajak.</p>" },

    { c: "teknis", q: "Undangan terasa lambat dibuka dari WhatsApp. Apa yang bisa dilakukan?", k: "lambat lemot loading whatsapp in-app browser browser dalam aplikasi",
      a: "<p>Link yang dibuka di dalam WhatsApp memakai browser bawaan aplikasi yang bisa lebih lambat dan terbatas. Coba:</p><ul><li>Ketuk menu titik tiga atau ikon browser di pojok layar, lalu pilih <b>Buka di browser</b> (Chrome atau Safari).</li><li>Pastikan koneksi stabil, dan matikan mode hemat data bila aktif.</li><li>Tutup aplikasi lain agar memori ponsel lega, terutama untuk undangan 3D.</li></ul><p>Untuk tamu dengan ponsel lama, undangan Essential (2D) lebih ringan.</p>" },
    { c: "teknis", q: "Musik tidak terdengar saat undangan dibuka. Mengapa?", k: "musik tidak bunyi suara audio",
      a: "<p>Beberapa browser menahan suara otomatis sampai tamu menyentuh layar. Ketuk layar atau tombol musik, dan pastikan volume ponsel serta mode senyap sudah dicek.</p>" },
    { c: "teknis", q: "Tampilan 3D patah-patah, kosong, atau tidak muncul. Apa solusinya?", k: "3d patah macet blank kosong error hitam",
      a: "<ul><li>Perbarui browser ke versi terbaru, atau coba Chrome atau Safari.</li><li>Muat ulang halaman dan tutup tab lain.</li><li>Matikan mode hemat daya bila aktif.</li><li>Coba jaringan Wi-Fi bila memakai data seluler yang lemah.</li></ul><p>Bila masih bermasalah, kirim tangkapan layar dan jenis ponsel Anda ke email dukungan.</p>" },
    { c: "teknis", q: "Link undangan tidak bisa dibuka atau tertulis tidak ditemukan.", k: "link error tidak ditemukan 404 tidak aktif",
      a: "<p>Periksa beberapa kemungkinan: link belum aktif karena pembayaran belum terkonfirmasi, masa aktif undangan sudah habis, atau link yang disalin terpotong. Bila sudah memeriksa semuanya, hubungi kami dengan menyertakan link tersebut.</p>" },
    { c: "teknis", q: "Bagaimana cara menghubungi tim NusaMora?", k: "kontak hubungi support dukungan email whatsapp jam layanan",
      a: '<p>Gunakan bagian <a href="#kontak">Masih Butuh Bantuan?</a> di bawah. Sertakan nama undangan, paket, dan tangkapan layar agar kami bisa membantu lebih cepat.</p>' }
  ];

  function plain(h) { return String(h).replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim(); }
  function fold(s) { return String(s || "").toLowerCase(); }

  function render(ctx) {
    var view = ctx.view, esc = ctx.esc, rows = ctx.rows || [], md = ctx.md;
    var cats = CATS.slice(), items = FAQ.map(function (f, i) { return { id: "q" + (i + 1), c: f.c, q: f.q, a: f.a, hay: fold(f.q + " " + plain(f.a) + " " + (f.k || "")) }; });
    if (rows.length) {
      cats.push({ id: "tim", t: "Dari tim NusaMora", s: "", i: "chat", hidden: true });
      rows.forEach(function (r, i) { items.push({ id: "t" + (i + 1), c: "tim", q: String(r.title || ""), a: md(r.body), hay: fold(r.title + " " + plain(md(r.body))) }); });
    }
    var count = {}; items.forEach(function (x) { count[x.c] = (count[x.c] || 0) + 1; });
    var st = { q: "", c: "" };

    ctx.seo({
      title: "Pusat Bantuan NusaMora | Panduan Undangan Digital, Live Guest, dan Pembayaran",
      description: "Temukan jawaban seputar pembuatan undangan digital, fitur Live Guest, pengelolaan tamu, pembayaran, revisi, dan masa aktif di NusaMora.",
      canonical: ctx.urlFor(ctx.type, "", ctx.lang), lang: ctx.lang,
      ld: [{ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: FAQ.map(function (f) { return { "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: plain(f.a) } }; }) },
        { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Beranda", item: location.origin + "/" }, { "@type": "ListItem", position: 2, name: "Bantuan", item: location.origin + "/bantuan" }] }]
    });

    var h = '<div class="bt">';
    h += '<div class="kt-w bt-w"><nav class="bt-bc" aria-label="Breadcrumb"><ol><li><a href="/">' + ico("home", 15) + "<span>Beranda</span></a></li><li aria-current=\"page\">Bantuan</li></ol></nav>";
    h += '<header class="bt-hero"><p class="kt-eyebrow">Pusat Bantuan</p><h1>Pusat Bantuan NusaMora</h1><p class="bt-sub">Temukan jawaban seputar pembuatan undangan, fitur Live Guest, pengelolaan tamu, hingga pembayaran.</p>';
    h += '<form class="bt-search" role="search" onsubmit="return false"><label for="bt-q" class="sr">Cari pertanyaan</label>' + ico("search", 20) + '<input id="bt-q" type="search" placeholder="Cari jawaban, misalnya “link unik” atau “masa aktif”" autocomplete="off" enterkeyhint="search"><button type="button" class="bt-clear" aria-label="Hapus pencarian" hidden>' + ico("x", 16) + "</button></form>";
    h += '<div class="bt-tags"><span>Topik populer:</span>' + TAGS.map(function (t, i) { return '<button type="button" class="bt-tag" data-tag="' + i + '">' + esc(t.l) + "</button>"; }).join("") + "</div></header>";
    h += '<section class="bt-cats" aria-labelledby="bt-ch"><h2 id="bt-ch" class="sr">Kategori bantuan</h2><ul>' + CATS.map(function (c) {
      return '<li><button type="button" class="bt-cat" data-c="' + c.id + '"><span class="bt-ci">' + ico(c.i, 26) + '</span><span class="bt-ct"><b>' + esc(c.t) + "</b><small>" + esc(c.s) + '</small></span><span class="bt-cn">' + (count[c.id] || 0) + " pertanyaan</span></button></li>";
    }).join("") + "</ul></section>";
    h += '<section class="bt-faq" id="faq" aria-labelledby="bt-fh"><div class="bt-fhd"><h2 id="bt-fh">Pertanyaan Umum</h2><p id="bt-count" role="status" aria-live="polite"></p></div>';
    h += '<div class="bt-chips" role="group" aria-label="Filter kategori"><button type="button" class="kt-chip" data-fc="" aria-pressed="true">Semua</button>' + cats.map(function (c) { return '<button type="button" class="kt-chip" data-fc="' + c.id + '" aria-pressed="false">' + esc(c.t) + "</button>"; }).join("") + "</div>";
    h += '<div id="bt-list"></div></section>';
    h += '<section class="bt-help" id="kontak" aria-labelledby="bt-hh"><div class="bt-hhd"><p class="kt-eyebrow inv">Kami Siap Membantu</p><h2 id="bt-hh">Masih Butuh Bantuan?</h2><p>Belum menemukan jawabannya? Tim NusaMora siap membantu Anda lewat kanal resmi di bawah ini.</p></div><div class="bt-hg">';
    h += '<div class="bt-hc"><h3>Kanal Bantuan Resmi</h3><ul class="bt-ch">' +
      '<li><a class="btn bt-wa" id="bt-wa" href="#" target="_blank" rel="noopener" hidden>' + ico("chat", 20) + '<span>Chat WhatsApp Customer Support</span></a></li>' +
      '<li><a class="btn bt-mail" id="bt-mail" href="mailto:' + EMAIL + '?subject=' + encodeURIComponent("Pertanyaan tentang NusaMora") + '">' + ico("mail", 20) + '<span>Email Dukungan</span><small id="bt-mailt">' + EMAIL + "</small></a></li>" +
      '<li><a class="bt-tut" href="/tutorial">' + ico("book", 20) + '<span>Lihat halaman Tutorial</span>' + ico("arrow", 16) + "</a></li></ul>" +
      '<p class="bt-tip">Sertakan nama undangan, paket, dan tangkapan layar agar kami bisa membantu lebih cepat.</p></div>';
    h += '<div class="bt-hc"><h3>' + ico("clock", 20) + ' Jam Layanan &amp; Estimasi Respon</h3><table class="bt-hrs"><tbody>' +
      '<tr data-d="1,2,3,4,5"><th scope="row">Senin–Jumat</th><td>09.00–17.00 WIB</td></tr><tr data-d="6"><th scope="row">Sabtu</th><td>09.00–15.00 WIB</td></tr><tr data-d="0"><th scope="row">Minggu &amp; Hari Libur</th><td>Tutup</td></tr></tbody></table>' +
      '<p class="bt-tip">Pesan di luar jam kerja tetap kami terima dan akan dibalas pada hari kerja berikutnya, maksimal dalam 1x24 jam.</p></div>';
    h += "</div></section></div></div>";
    view.innerHTML = h;

    var list = view.querySelector("#bt-list"), cnt = view.querySelector("#bt-count"), qi = view.querySelector("#bt-q"), clr = view.querySelector(".bt-clear");
    function catOf(id) { return cats.filter(function (c) { return c.id === id; })[0]; }
    function item(x) {
      return '<div class="bt-it" id="' + x.id + '"><h4><button type="button" class="bt-qb" aria-expanded="false" aria-controls="' + x.id + '-p" id="' + x.id + '-b"><span>' + esc(x.q) + "</span>" + ico("chev", 20) + '</button></h4><div class="bt-p" id="' + x.id + '-p" role="region" aria-labelledby="' + x.id + '-b" inert><div class="bt-pi"><div class="kt-body bt-a">' + x.a + "</div></div></div></div>";
    }
    function draw() {
      var toks = fold(st.q).split(/\s+/).filter(Boolean);
      var m = items.filter(function (x) { return (!st.c || x.c === st.c) && toks.every(function (t) { return x.hay.indexOf(t) > -1; }); });
      var html = "";
      if (!m.length) html = '<div class="card bt-empty"><p><b>Belum ada jawaban yang cocok.</b></p><p>Coba kata kunci lain, atau tampilkan semua pertanyaan. Anda juga bisa langsung <a href="#kontak">menghubungi tim kami</a>.</p><p><button type="button" class="btn o bt-reset">Tampilkan semua pertanyaan</button></p></div>';
      else cats.forEach(function (c) {
        var g = m.filter(function (x) { return x.c === c.id; }); if (!g.length) return;
        html += '<section class="bt-g" aria-labelledby="g-' + c.id + '"><h3 id="g-' + c.id + '"><span class="bt-gi">' + ico(c.i, 20) + "</span>" + esc(c.t) + "</h3>" + g.map(item).join("") + "</section>";
      });
      list.innerHTML = html;
      cnt.textContent = (st.q || st.c) ? m.length + " dari " + items.length + " pertanyaan" : items.length + " pertanyaan";
      clr.hidden = !st.q;
    }
    function setOpen(it, open) {
      var b = it.querySelector(".bt-qb"), p = it.querySelector(".bt-p");
      b.setAttribute("aria-expanded", open ? "true" : "false"); it.classList.toggle("open", open);
      if (open) p.removeAttribute("inert"); else p.setAttribute("inert", "");
    }
    function setCat(id) {
      st.c = id || "";
      [].slice.call(view.querySelectorAll(".bt-chips .kt-chip")).forEach(function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-fc") === st.c ? "true" : "false"); });
    }
    function toFaq() { var f = view.querySelector("#faq"); try { f.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" }); } catch (e) { f.scrollIntoView(); } }

    qi.addEventListener("input", function () { st.q = qi.value; draw(); });
    clr.addEventListener("click", function () { qi.value = ""; st.q = ""; draw(); qi.focus(); });
    view.addEventListener("click", function (e) {
      var t;
      if ((t = e.target.closest(".bt-qb"))) { var it = t.closest(".bt-it"); setOpen(it, t.getAttribute("aria-expanded") !== "true"); return; }
      if ((t = e.target.closest(".bt-cat"))) { setCat(t.getAttribute("data-c")); qi.value = ""; st.q = ""; draw(); toFaq(); return; }
      if ((t = e.target.closest(".bt-tag"))) { var tg = TAGS[+t.getAttribute("data-tag")]; if (tg.c) { setCat(tg.c); qi.value = ""; st.q = ""; } else { setCat(""); qi.value = tg.q; st.q = tg.q; } draw(); toFaq(); return; }
      if ((t = e.target.closest(".bt-chips .kt-chip"))) { setCat(t.getAttribute("data-fc")); draw(); return; }
      if (e.target.closest(".bt-reset")) { qi.value = ""; st.q = ""; setCat(""); draw(); }
    });
    draw();

    /* Tautan dalam (#q3) dan ?q= */
    var hm = /^#(q|t)\d+$/.exec(location.hash || ""), pq = (/[?&]q=([^&]+)/.exec(location.search) || [])[1];
    if (pq) { try { qi.value = st.q = decodeURIComponent(pq.replace(/\+/g, " ")).slice(0, 80); draw(); } catch (x) { /* abaikan */ } }
    if (hm) { var el = view.querySelector(location.hash); if (el) { setOpen(el, true); setTimeout(function () { el.scrollIntoView({ block: "center" }); }, 60); } }

    /* Hari ini pada tabel jam layanan (waktu WIB) */
    try {
      var wd = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }[new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: "Asia/Jakarta" }).format(new Date())];
      [].slice.call(view.querySelectorAll(".bt-hrs tr")).forEach(function (r) { if (r.getAttribute("data-d").split(",").indexOf(String(wd)) > -1) { r.classList.add("today"); r.querySelector("th").insertAdjacentHTML("beforeend", ' <span class="bt-now">Hari ini</span>'); } });
    } catch (x) { /* abaikan */ }

    /* Kontak: pakai pengaturan sistem bila ada (support_email, support_whatsapp), selain itu alamat bawaan. WhatsApp tampil hanya bila nomornya diisi. */
    function applyContact(s) {
      s = s || {};
      var mail = String(s.support_email || "").trim(); if (!/^[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']+$/.test(mail)) mail = EMAIL;
      var ma = view.querySelector("#bt-mail"); ma.href = "mailto:" + mail + "?subject=" + encodeURIComponent("Pertanyaan tentang NusaMora"); view.querySelector("#bt-mailt").textContent = mail;
      var n = String(s.support_whatsapp || "").replace(/\D/g, ""); if (n && n.charAt(0) === "0") n = "62" + n.slice(1);
      if (n.length >= 9 && n.length <= 15) {
        var msg = "Halo NusaMora, saya ingin bertanya.\n\nNama: \nPaket / nama undangan: \nPertanyaan: ";
        var wa = view.querySelector("#bt-wa"); wa.href = "https://wa.me/" + n + "?text=" + encodeURIComponent(msg); wa.hidden = false;
      }
    }
    var cached = null; try { var cc = JSON.parse(sessionStorage.getItem("nm_pub_settings") || "null"); cached = cc && cc.v; } catch (x) { /* abaikan */ }
    if (cached) applyContact(cached);
    else {
      var cfg = window.NM_CONFIG || {};
      if (cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY) fetch(cfg.SUPABASE_URL + "/rest/v1/rpc/public_settings", { method: "POST", headers: { apikey: cfg.SUPABASE_ANON_KEY, "Content-Type": "application/json" }, body: "{}" }).then(function (r) { return r.ok ? r.json() : {}; }).then(applyContact, function () { applyContact({}); });
      else applyContact({});
    }
  }
  window.NMHelp = { render: render };
})();
