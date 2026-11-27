/* Halaman konten publik NusaMora: membaca konten yang TAYANG dari database (artikel, info, FAQ, tutorial), mengatur meta SEO/OG, pratinjau draft untuk admin. */
(function () {
  "use strict";
  var d = document, C = window.NM_CONFIG || window.NUSAMORA_CONFIG || {}, $ = function (s) { return d.querySelector(s); };
  var sb = (C.SUPABASE_URL && C.SUPABASE_ANON_KEY && window.supabase) ? window.supabase.createClient(C.SUPABASE_URL, C.SUPABASE_ANON_KEY, { auth: { persistSession: true, autoRefreshToken: true } }) : null;
  var view = $("#view");
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  var ROUTES = { artikel: "article", info: "page", bantuan: "faq", tutorial: "tutorial" }, BASEP = { article: "artikel", page: "info", faq: "bantuan", tutorial: "tutorial" };
  var TITLE = { article: "Artikel", faq: "Pusat Bantuan", tutorial: "Tutorial", page: "Informasi" };
  var q = new URLSearchParams(location.search), parts = location.pathname.replace(/^\/+|\/+$/g, "").split("/");
  var TZ = "Asia/Jakarta";
  var type = q.get("type") || ROUTES[parts[0]] || "article", slug = q.get("slug") || parts[1] || "", lang = q.get("lang") === "en" ? "en" : "id", preview = q.get("preview");
  var origin = location.origin;
  /* Menu aktif di navbar atas */
  [].slice.call(d.querySelectorAll(".kt-nav a:not(.btn)")).forEach(function (a) { if (a.getAttribute("href") === "/" + (BASEP[type] || "-")) a.setAttribute("aria-current", "page"); });
  var safeUrl = function (u) { u = String(u || "").trim(); return /^(https:\/\/[^\s"'<>]+|\/[^\s"'<>]*)$/.test(u) ? u : ""; };
  /* Gambar bawaan artikel (ilustrasi di /assets/artikel/<slug>.svg), dipakai bila image_url di database kosong. */
  var ARTIMG = { "exhibition-dan-trade-show-15-hal-disiapkan-sebelum-hari-pameran": 2, "business-networking-event-cara-membuat-acara-relasi-bisnis-berkualitas": 2, "10-kesalahan-corporate-event-merusak-reputasi-perusahaan": 2, "cara-mengelola-tamu-vip-dan-registrasi-undangan-acara-perusahaan": 2, "virtual-corporate-event-cara-membuat-acara-online-tetap-profesional": 2, "town-hall-meeting-cara-mengadakan-pertemuan-perusahaan-interaktif": 2, "employee-appreciation-day-15-ide-acara-menghargai-kontribusi-karyawan": 2, "cara-membuat-acara-17-agustus-meriah-tanpa-biaya-besar": 2, "15-ide-tema-acara-17-agustus-di-sekolah-kreatif-edukatif": 2, "20-ide-lomba-17-agustus-seru-anak-anak-hingga-orang-dewasa": 2, "undangan-17-agustus-digital-15-desain-merah-putih-perayaan-kemerdekaan": 2, "15-ide-dekorasi-panggung-17-agustus-lapangan-terlihat-meriah": 2, "hari-kartini-di-sekolah-15-ide-kegiatan-lebih-bermakna-daripada-lomba-kostum": 2, "10-ide-acara-hari-anak-nasional-menyenangkan-edukatif": 2, "hari-guru-nasional-15-ide-perayaan-kreatif-menghargai-perjuangan-guru": 2, "sumpah-pemuda-15-ide-kegiatan-semangat-nasionalisme-generasi-muda": 2, "hari-pahlawan-ide-acara-sekolah-ajarkan-anak-menghargai-sejarah": 2, "15-ide-acara-hari-ibu-momen-bersama-keluarga-berkesan": 2, "undangan-buka-puasa-bersama-digital-contoh-desain-dan-kata-kata-menarik": 2, "buka-puasa-bersama-20-ide-tema-acara-bukber-tidak-membosankan": 2, "maulid-nabi-contoh-susunan-acara-dan-ide-kegiatan-sekolah-komunitas": 2, "cara-membuat-undangan-pernikahan-digital-sendiri-tanpa-keahlian-desain": 1, "cara-membuat-undangan-perayaan-nasional-dan-hari-besar-secara-digital": 2, "tahun-baru-islam-15-ide-kegiatan-bermakna-keluarga-dan-komunitas": 2, "housewarming-party-15-ide-syukuran-rumah-baru-hangat-berkesan": 2, "10-ide-dekorasi-housewarming-rumah-baru-terasa-lebih-istimewa": 2, "silver-wedding-anniversary-cara-merayakan-25-tahun-pernikahan-penuh-makna": 2, "family-reunion-20-ide-acara-reuni-keluarga-semua-generasi-menikmati": 2, "hari-santri-nasional-15-ide-kegiatan-kreatif-sekolah-dan-pesantren": 2, "wedding-anniversary-15-ide-perayaan-ulang-tahun-pernikahan-romantis": 2, "golden-wedding-anniversary-15-ide-perayaan-50-tahun-pernikahan-orang-tua": 2, "retirement-celebration-cara-mengadakan-acara-pensiun-penuh-apresiasi": 2, "volunteer-gathering-10-ide-perayaan-mengapresiasi-para-relawan": 2, "baby-milestone-celebration-10-ide-perayaan-setiap-pencapaian-si-kecil": 2, "community-gathering-15-ide-acara-komunitas-semakin-solid": 2, "farewell-party-sekolah-ide-acara-perpisahan-dikenang-bertahun-tahun": 2, "reuni-sekolah-cara-membuat-acara-reuni-semua-orang-ingin-datang": 2, "charity-event-cara-mengadakan-acara-penggalangan-dana-menarik-partisipan": 2, "pet-birthday-party-10-ide-pesta-ulang-tahun-hewan-peliharaan-menggemaskan": 2, "art-exhibition-cara-membuat-acara-pameran-karya-profesional-menarik": 2, "7-tanda-bahaya-red-flag-promo-pernikahan-terlalu-murah": 2, "cara-membuat-undangan-pernikahan-digital": 1, "cara-praktis-mengatur-daftar-tamu-dan-undangan-whatsapp-tidak-terlewat": 2, "cara-sopan-menjelaskan-intimate-wedding-ke-keluarga-besar": 2, "checklist-isi-undangan-pernikahan-digital": 2, "checklist-kontrak-vendor-pernikahan-poin-wajib-tertulis": 2, "daftar-diskusi-wajib-sebelum-menikah-keuangan-hingga-keluarga-besar": 2, "etika-hadir-pernikahan-era-digital-rsvp-plus-one-amplop-cashless": 2, "hitung-ulang-biaya-resepsi-500-tamu-vs-intimate-wedding-50-orang": 2, "ide-after-party-dan-brunch-intimate-wedding-tanpa-pelaminan": 2, "interactive-food-stall-jajanan-nostalgia-resepsi-pernikahan": 2, "link-undangan-digital-nama-tamu-di-url-berisiko-disalahgunakan": 2, "marriage-is-scary-membangun-kesiapan-mental-sebelum-menikah": 2, "memilih-paket-undangan-digital": 1, "mengemas-adat-tradisional-modern-personal-generasi-muda": 2, "mengenal-bimbingan-perkawinan-bimwin-mandiri-sebelum-hari-h": 2, "menjaga-privasi-acara-pernikahan-di-media-sosial-unplugged-wedding": 2, "panduan-menyusun-rundown-akad-resepsi-tanpa-keterlambatan": 2, "pernikahan-bukan-kompetisi-media-sosial-sesuai-kemampuan-finansial": 2, "tips-membagikan-undangan-digital-lewat-whatsapp": 2, "tren-kua-core-intimate-wedding-pasangan-muda": 2, "tren-tema-pernikahan-transformative-teal-earth-tone-petal-dreamscape": 2, "virtual-venue-buku-tamu-interaktif-tamu-jauh-tetap-hadir": 2 };
  var artImg = function (c) { if (c.image_url) return c.image_url; if (!((c.type === "article" || type === "article") && ARTIMG[c.slug])) return ""; return "/assets/artikel/" + c.slug + (ARTIMG[c.slug] === 2 ? ".webp" : ".svg"); };

  /* Markdown ringan yang aman: judul (#), daftar (-), tebal, miring, tautan, gambar. HTML mentah selalu di-escape. */
  function inline(s) {
    s = esc(s);
    s = s.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, function (m, a, u) { u = safeUrl(u.replace(/&amp;/g, "&")); return u ? '<img src="' + esc(u) + '" alt="' + a + '" loading="lazy" decoding="async">' : a; });
    s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, function (m, t, u) { u = safeUrl(u.replace(/&amp;/g, "&")); return u ? '<a href="' + esc(u) + '"' + (u.charAt(0) === "/" ? "" : ' rel="noopener nofollow ugc" target="_blank"') + ">" + t + "</a>" : t; });
    return s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>").replace(/(^|[\s(])\*([^*\n]+)\*/g, "$1<em>$2</em>");
  }
  function md(text) {
    var out = [], blocks = String(text || "").replace(/\r/g, "").split(/\n{2,}/);
    blocks.forEach(function (b) {
      var lines = b.split("\n").filter(function (l) { return l.trim() !== ""; }); if (!lines.length) return;
      var h = /^(#{1,3})\s+(.+)$/.exec(lines[0]);
      if (h && lines.length === 1) { var n = h[1].length + 1; out.push("<h" + n + ">" + inline(h[2]) + "</h" + n + ">"); return; }
      if (lines.every(function (l) { return /^>\s?/.test(l); })) { out.push("<blockquote>" + lines.map(function (l) { return inline(l.replace(/^>\s?/, "")); }).join("<br>") + "</blockquote>"); return; }
      if (lines.every(function (l) { return /^\s*[-*]\s+/.test(l); })) { out.push("<ul>" + lines.map(function (l) { return "<li>" + inline(l.replace(/^\s*[-*]\s+/, "")) + "</li>"; }).join("") + "</ul>"); return; }
      out.push("<p>" + lines.map(inline).join("<br>") + "</p>");
    });
    return out.join("");
  }
  var plain = function (t) { return String(t || "").replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/[#*_>`-]/g, " ").replace(/\s+/g, " ").trim(); };

  function meta(name, val, attr) { attr = attr || "name"; var el = d.head.querySelector("meta[" + attr + '="' + name + '"]'); if (!el) { el = d.createElement("meta"); el.setAttribute(attr, name); d.head.appendChild(el); } el.setAttribute("content", val); }
  function link(rel, href, extra) { var el = d.createElement("link"); el.rel = rel; el.href = href; if (extra) Object.keys(extra).forEach(function (k) { el.setAttribute(k, extra[k]); }); d.head.appendChild(el); }
  function seo(o) {
    d.title = o.title; d.documentElement.lang = o.lang || "id";
    meta("description", o.description || ""); meta("robots", o.noindex ? "noindex,follow" : "index,follow");
    d.head.querySelectorAll('link[rel="canonical"],link[rel="alternate"][hreflang],script[data-ld]').forEach(function (e) { e.remove(); });
    if (o.canonical && !o.noindex) link("canonical", o.canonical);
    (o.alternates || []).forEach(function (a) { link("alternate", a.href, { hreflang: a.lang }); });
    meta("og:type", o.og || "website", "property"); meta("og:site_name", "NusaMora", "property"); meta("og:title", o.title, "property"); meta("og:description", o.description || "", "property"); meta("og:locale", o.lang === "en" ? "en_US" : "id_ID", "property");
    if (o.canonical) meta("og:url", o.canonical, "property");
    meta("twitter:card", o.image ? "summary_large_image" : "summary"); meta("twitter:title", o.title); meta("twitter:description", o.description || "");
    if (o.image) { meta("og:image", o.image, "property"); meta("twitter:image", o.image); }
    if (o.ld) { var s = d.createElement("script"); s.type = "application/ld+json"; s.setAttribute("data-ld", "1"); s.textContent = JSON.stringify(o.ld).replace(/</g, "\\u003c"); d.head.appendChild(s); }
  }
  var fdate = function (iso) { try { return new Date(iso).toLocaleDateString(lang === "en" ? "en-US" : "id-ID", { day: "numeric", month: "long", year: "numeric", timeZone: TZ }); } catch (e) { return ""; } };
  var urlFor = function (t, s, l) { return origin + "/" + BASEP[t] + (s ? "/" + s : "") + (l === "en" ? "?lang=en" : ""); };

  function notFound() {
    seo({ title: "Tidak ditemukan | NusaMora", description: "", noindex: true });
    view.innerHTML = '<div class="kt-w"><div class="card kt-empty"><h1>Halaman tidak ditemukan</h1><p>Konten yang Anda cari belum tersedia atau sudah tidak tayang.</p><p><a class="btn" href="/">Kembali ke beranda</a></p></div></div>';
  }
  function faqLd(body) {
    var m = /(?:^|\n)## Pertanyaan yang sering diajukan\s*\n([\s\S]*?)(?=\n## |$)/.exec(String(body || ""));
    if (!m) return [];
    var clean = function (t) { return t.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1").replace(/[*_`>#]/g, "").replace(/\s+/g, " ").trim(); };
    var out = [], parts = ("\n" + m[1]).split(/\n### /);
    for (var i = 1; i < parts.length; i++) {
      var nl = parts[i].indexOf("\n"); if (nl < 0) continue;
      var q = clean(parts[i].slice(0, nl)), a = clean(parts[i].slice(nl));
      if (q && a) out.push({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } });
    }
    return out.length ? [{ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: out }] : [];
  }
  function showOne(c, pv) {
    var title = c.seo_title || c.title, desc = c.seo_description || c.excerpt || plain(c.body).slice(0, 155), img = c.og_image_url || c.image_url || "";
    var canon = c.canonical_url || urlFor(c.type, c.slug, c.lang);
    var alts = [{ lang: c.lang, href: urlFor(c.type, c.slug, c.lang) }].concat((c.alternates || []).map(function (a) { return { lang: a.lang, href: urlFor(c.type, a.slug, a.lang) }; }));
    seo({ title: title + " | NusaMora", description: desc, canonical: canon, noindex: pv || c.noindex, image: safeUrl(img), lang: c.lang, og: c.type === "article" ? "article" : "website", alternates: alts.length > 1 ? alts : [],
      ld: c.type === "article" && !pv ? { "@context": "https://schema.org", "@type": "Article", headline: c.title, description: desc, image: safeUrl(img) || undefined, inLanguage: c.lang, datePublished: c.published_at, dateModified: c.updated_at, mainEntityOfPage: canon, publisher: { "@type": "Organization", name: "NusaMora" } } : null });
    if (c.type === "article" && c.lang !== "en" && window.NMArticle) {
      var info = window.NMArticle.render({ c: c, pv: pv, view: view, sb: sb, esc: esc, md: md, safeUrl: safeUrl, artImg: artImg, catOf: catOf, catOrder: CAT_ORDER, fdate: fdate, canon: canon, cover: ktCover, meta: ktMeta, href: ktHref });
      var au = { "@type": "Organization", name: String(c.author || "NusaMora") };
      seo({ title: title + " | NusaMora", description: desc, canonical: canon, noindex: pv || c.noindex, image: safeUrl(img), lang: c.lang, og: "article", alternates: alts.length > 1 ? alts : [],
        ld: pv ? null : [{ "@context": "https://schema.org", "@type": "Article", headline: c.title, description: desc, image: safeUrl(img) || undefined, inLanguage: c.lang, datePublished: c.published_at, dateModified: c.updated_at || c.published_at, articleSection: info.cat, wordCount: info.words, author: au, mainEntityOfPage: canon, publisher: { "@type": "Organization", name: "NusaMora", logo: { "@type": "ImageObject", url: origin + "/assets/logo-nusamora.png" } } },
          { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Beranda", item: origin + "/" }, { "@type": "ListItem", position: 2, name: "Artikel", item: origin + "/artikel" }, { "@type": "ListItem", position: 3, name: info.cat, item: origin + "/artikel?kat=" + encodeURIComponent(info.cat) }, { "@type": "ListItem", position: 4, name: c.title, item: canon }] }].concat(faqLd(c.body)) });
      return;
    }
    var sw = (c.alternates || [])[0];
    view.innerHTML = '<article class="kt-w">' + (pv ? '<div class="kt-pv" role="status"><b>Pratinjau</b>: ' + esc(pv) + "</div>" : "") +
      '<header class="kt-h"><h1>' + esc(c.title) + "</h1>" + (c.type === "article" && c.published_at ? '<p class="kt-meta">' + esc(fdate(c.published_at)) + "</p>" : "") + (c.excerpt ? '<p class="kt-lead">' + esc(c.excerpt) + "</p>" : "") + "</header>" +
      (artImg(c) && safeUrl(artImg(c)) ? '<img class="kt-cover" src="' + esc(safeUrl(artImg(c))) + '" alt="" decoding="async">' : "") + '<div class="kt-body">' + md(c.body) + "</div>" +
      (sw ? '<p class="kt-sw"><a href="/' + BASEP[c.type] + "/" + esc(sw.slug) + (sw.lang === "en" ? "?lang=en" : "") + '" hreflang="' + esc(sw.lang) + '">' + (sw.lang === "en" ? "Read this in English" : "Baca dalam Bahasa Indonesia") + "</a></p>" : "") + "</article>";
  }
  /* ---- Daftar artikel: hero, pencarian + filter kategori, artikel unggulan, grid kartu, dan ajakan penutup ---- */
  var CAT_ORDER = ["Tips Undangan", "Persiapan Pernikahan", "Acara Spesial", "Panduan NusaMora"], CAT_CLS = { "Tips Undangan": "c1", "Persiapan Pernikahan": "c2", "Acara Spesial": "c1", "Panduan NusaMora": "c3" };
  /* Belum ada kolom kategori di database: dipakai r.category bila suatu saat ada, selain itu diturunkan dari judul. */
  function catOf(r) {
    if (r.category) return String(r.category);
    var t = String(r.title || "").toLowerCase();
    if (/ulang tahun|birthday|baby shower|gender reveal|tasyakuran|family gathering|graduation|hadiah wisuda|kelulusan|wisuda|perpisahan|pentas seni|seminar|workshop|webinar|konferensi|business summit|company|corporate|pelatihan|anniversary|event organizer|gathering|pet birthday|art exhibition|pameran|reuni|volunteer|charity|baby milestone|retirement|tahun baru islam|hari santri|housewarming|anniversary|reunion|hari besar|hari ibu|bukber|buka puasa|halal bihalal|ramadan|maulid|hari guru|hari anak|hari pendidikan|sumpah pemuda|hari pahlawan|hari kartini|kartini|dekorasi panggung|17 agustus|tamu vip|town hall|virtual|appreciation|networking|exhibition|trade show|product launching|grand opening|gala dinner|awarding|farewell|retirement|corporate|class meeting|graduation ceremony|pengajian|khitan|sunat|aqiqah|goodie|sweet seventeen|bridal shower|bachelorette|lamaran|engagement|proposal|games ulang/.test(t)) return "Acara Spesial";
    if (/nusamora|paket|essential|signature|luxe|cara membuat|template/.test(t)) return "Panduan NusaMora";
    if (/link undangan|whatsapp|rsvp|buku tamu|virtual venue|daftar tamu/.test(t)) return "Tips Undangan";
    if (/pernikahan|nikah|pengantin|akad|resepsi|checklist|wedding|pelaminan|kua|perkawinan|bimwin|vendor|kontrak|privasi|adat|tema|marriage|keluarga|tradisi|red flag|pasangan/.test(t)) return "Persiapan Pernikahan";
    return "Tips Undangan";
  }
  var ORN = '<svg class="kt-orn" viewBox="0 0 200 120" aria-hidden="true" focusable="false"><g fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"><circle cx="100" cy="60" r="34"/><circle cx="100" cy="60" r="22" opacity=".6"/><path d="M100 26c10 8 10 20 0 34-10-14-10-26 0-34zM100 94c10-8 10-20 0-34-10 14-10 26 0 34zM66 60c8-10 20-10 34 0-14 10-26 10-34 0zM134 60c-8 10-20 10-34 0 14-10 26-10 34 0z"/><path d="M20 100c24-4 40-18 52-40M180 20c-24 4-40 18-52 40" opacity=".5"/></g></svg>';
  var ARR = '<svg class="kt-ar" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
  var SRCH = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true" focusable="false"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>';
  function ktCover(r, cat, eager) {
    var img = safeUrl(artImg(r));
    return '<div class="kt-cv ' + (CAT_CLS[cat] || "c1") + (img ? "" : " ph") + '">' + (img ? '<img src="' + esc(img) + '" alt="" width="640" height="360" loading="' + (eager ? "eager" : "lazy") + '" decoding="async">' : ORN) + "</div>";
  }
  function ktMeta(r) {
    var bits = [];
    if (r.published_at) bits.push('<time datetime="' + esc(String(r.published_at).slice(0, 10)) + '">' + esc(fdate(r.published_at)) + "</time>");
    if (r.read_min) bits.push(esc(r.read_min) + " mnt baca");
    return bits.length ? '<p class="kt-meta">' + bits.join('<i aria-hidden="true"></i>') + "</p>" : "";
  }
  var ktHref = function (r) { return "/" + BASEP[type] + "/" + esc(r.slug) + (lang === "en" ? "?lang=en" : ""); };
  function showArticles(rows) {
    seo({ title: "Artikel | NusaMora", description: "Artikel dan tips seputar undangan digital dari NusaMora.", canonical: urlFor(type, "", lang), lang: lang });
    var items = rows.map(function (r) { return { r: r, cat: catOf(r), hay: (String(r.title || "") + " " + String(r.excerpt || "")).toLowerCase() }; }), cats = [];
    items.forEach(function (x) { if (cats.indexOf(x.cat) < 0) cats.push(x.cat); });
    cats.sort(function (a, b) { var i = CAT_ORDER.indexOf(a), j = CAT_ORDER.indexOf(b); return (i < 0 ? 99 : i) - (j < 0 ? 99 : j); });
    var PER = 9, st = { q: "", cat: "", page: Math.max(1, parseInt((/[?&]hal=(\d+)/.exec(location.search) || [])[1], 10) || 1) };
    function pager(cur, total) {
      var n = [], i, last = 0, h = '<nav class="kt-pg" aria-label="Halaman artikel"><ul>';
      for (i = 1; i <= total; i++) if (i === 1 || i === total || Math.abs(i - cur) <= 1) n.push(i);
      h += '<li><button type="button" class="kt-pgb kt-pgn" data-p="' + (cur - 1) + '"' + (cur === 1 ? " disabled" : "") + ' aria-label="Halaman sebelumnya"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M19 12H5M11 6l-6 6 6 6"/></svg><span>Sebelumnya</span></button></li>';
      n.forEach(function (v) {
        if (last && v - last > 1) h += '<li class="kt-pge" aria-hidden="true">&hellip;</li>';
        h += '<li class="kt-pgx"><button type="button" class="kt-pgb" data-p="' + v + '"' + (v === cur ? ' aria-current="page"' : "") + ' aria-label="Halaman ' + v + '">' + v + "</button></li>"; last = v;
      });
      h += '<li class="kt-pgm" aria-hidden="true">Halaman ' + cur + " dari " + total + '</li>';
      return h + '<li><button type="button" class="kt-pgb kt-pgn" data-p="' + (cur + 1) + '"' + (cur === total ? " disabled" : "") + ' aria-label="Halaman berikutnya"><span>Berikutnya</span><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M5 12h14M13 6l6 6-6 6"/></svg></button></li></ul></nav>';
    }
    function setUrl() { try { var qs = []; if (st.cat) qs.push("kat=" + encodeURIComponent(st.cat)); if (st.page > 1) qs.push("hal=" + st.page); var u = location.pathname + (qs.length ? "?" + qs.join("&") : "") + location.hash; history.replaceState(null, "", u); } catch (e) {} }
    var tools = items.length ? '<div class="kt-tools"><label class="kt-search">' + SRCH + '<span class="sr">Cari artikel</span><input id="kt-q" type="search" placeholder="Cari artikel, misalnya RSVP atau WhatsApp" autocomplete="off" enterkeyhint="search"></label>' +
      '<div class="kt-chips" role="group" aria-label="Filter kategori"><button type="button" class="kt-chip" data-cat="" aria-pressed="true">Semua</button>' + cats.map(function (c) { return '<button type="button" class="kt-chip" data-cat="' + esc(c) + '" aria-pressed="false">' + esc(c) + "</button>"; }).join("") + "</div></div>" : "";
    view.innerHTML = '<div class="kt-w kt-wide"><header class="kt-hero"><p class="kt-eyebrow">Panduan &amp; Inspirasi</p><h1>Artikel NusaMora</h1>' +
      '<p class="kt-sub">Tips, checklist, dan panduan singkat untuk menyiapkan undangan digital yang rapi, dari memilih paket sampai membagikannya ke tamu.</p>' + tools + '<p class="kt-count" id="kt-count" role="status" aria-live="polite"></p></header>' +
      '<div id="kt-res"></div>' +
      '<aside class="kt-cta" aria-labelledby="kt-cta-h"><div><p class="kt-eyebrow inv">Siap Memulai?</p><h2 id="kt-cta-h">Sudah siap merancang undangan impian Anda?</h2><p>Lihat katalog template interaktif kami, lalu coba demonya dulu sebelum memilih paket.</p></div>' +
      '<div class="kt-cta-a"><a class="btn kt-gold" href="/#template">Lihat Katalog Template ' + ARR + '</a><a class="kt-cta-l" href="/paket">Langsung buat undangan</a></div></aside></div>';
    var res = $("#kt-res"), cnt = $("#kt-count");
    function feat(x) {
      var r = x.r;
      return '<a class="kt-feat" href="' + ktHref(r) + '">' + ktCover(r, x.cat, true) + '<div class="kt-fb"><p class="kt-row"><span class="kt-badge">' + esc(x.cat) + '</span><span class="kt-star">Artikel Unggulan</span></p><h2>' + esc(r.title) + "</h2>" +
        (r.excerpt ? '<p class="kt-ex">' + esc(r.excerpt) + "</p>" : "") + ktMeta(r) + '<span class="kt-more">Baca Selengkapnya ' + ARR + "</span></div></a>";
    }
    function card(x) {
      var r = x.r;
      return '<a class="kt-ac" href="' + ktHref(r) + '">' + ktCover(r, x.cat, false) + '<div class="kt-cb"><span class="kt-badge">' + esc(x.cat) + "</span><h2>" + esc(r.title) + "</h2>" + (r.excerpt ? '<p class="kt-ex">' + esc(r.excerpt) + "</p>" : "") + ktMeta(r) + '<span class="kt-go" aria-hidden="true">' + ARR + "</span></div></a>";
    }
    function draw() {
      var q = st.q.trim().toLowerCase(), list = items.filter(function (x) { return (!st.cat || x.cat === st.cat) && (!q || x.hay.indexOf(q) > -1); });
      var f0 = !st.cat && !q && list.length ? list[0] : null, rest0 = f0 ? list.slice(1) : list;
      /* Halaman 1: artikel unggulan + PER kartu; halaman berikutnya: PER kartu. */
      var total = Math.max(1, Math.ceil(rest0.length / PER)); if (st.page > total) st.page = total;
      var f = st.page === 1 ? f0 : null, rest = rest0.slice((st.page - 1) * PER, st.page * PER);
      if (!items.length) { res.innerHTML = '<div class="card kt-empty">Belum ada artikel. Kunjungi lagi sebentar lagi.</div>'; cnt.textContent = ""; return; }
      res.innerHTML = list.length ? (f ? feat(f) : "") + (rest.length ? '<div class="kt-grid">' + rest.map(card).join("") + "</div>" : "") + (total > 1 ? pager(st.page, total) : "") :
        '<div class="card kt-empty"><p><b>Tidak ada artikel yang cocok.</b></p><p>Coba kata kunci lain, atau tampilkan semua artikel.</p><p><button type="button" class="btn o kt-reset">Tampilkan semua artikel</button></p></div>';
      cnt.textContent = ((st.cat || q) ? list.length + " dari " + items.length + " artikel" : items.length + " artikel") + (total > 1 ? " \u00b7 halaman " + st.page + " dari " + total : "");
      setUrl();
    }
    var kq = (/[?&]kat=([^&]+)/.exec(location.search) || [])[1]; try { kq = kq ? decodeURIComponent(kq.replace(/\+/g, " ")) : ""; } catch (e) { kq = ""; }
    if (kq && cats.indexOf(kq) > -1) { st.cat = kq; [].slice.call(d.querySelectorAll(".kt-chip")).forEach(function (x) { x.setAttribute("aria-pressed", x.getAttribute("data-cat") === kq ? "true" : "false"); }); }
    var qi = $("#kt-q");
    if (qi) qi.addEventListener("input", function () { st.q = qi.value; st.page = 1; draw(); });
    [].slice.call(d.querySelectorAll(".kt-chip")).forEach(function (b) {
      b.addEventListener("click", function () { st.cat = b.getAttribute("data-cat"); st.page = 1; [].slice.call(d.querySelectorAll(".kt-chip")).forEach(function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); }); draw(); });
    });
    res.addEventListener("click", function (e) {
      var pb = e.target.closest(".kt-pgb");
      if (pb && !pb.disabled) { st.page = parseInt(pb.getAttribute("data-p"), 10) || 1; draw(); var top = $(".kt-tools") || res; try { top.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" }); } catch (x) { top.scrollIntoView(); } var cur = res.querySelector(".kt-pgb[aria-current]"); if (cur) cur.focus({ preventScroll: true }); return; }
      if (!e.target.closest(".kt-reset")) return; st.q = ""; st.cat = ""; st.page = 1; if (qi) qi.value = "";
      [].slice.call(d.querySelectorAll(".kt-chip")).forEach(function (x) { x.setAttribute("aria-pressed", x.getAttribute("data-cat") === "" ? "true" : "false"); }); draw();
    });
    draw();
  }
  function showList(rows) {
    if (type === "article" && lang !== "en") { showArticles(rows); return; }
    if (type === "tutorial" && lang !== "en" && window.NMTutorial) { window.NMTutorial.render({ view: view, rows: rows, esc: esc, md: md, seo: seo, urlFor: urlFor, type: type, lang: lang }); return; }
    if (type === "faq" && lang !== "en" && window.NMHelp) { window.NMHelp.render({ view: view, rows: rows, esc: esc, md: md, seo: seo, urlFor: urlFor, type: type, lang: lang }); return; }
    var t = TITLE[type] || "Konten";
    seo({ title: t + " | NusaMora", description: type === "article" ? "Artikel dan tips seputar undangan digital dari NusaMora." : type === "faq" ? "Jawaban atas pertanyaan yang sering diajukan tentang NusaMora." : "Panduan langkah demi langkah menggunakan NusaMora.", canonical: urlFor(type, "", lang), lang: lang });
    var body;
    if (!rows.length) body = '<div class="card kt-empty">Belum ada konten.</div>';
    else if (type === "faq" || type === "tutorial") body = '<div class="kt-faq">' + rows.map(function (r) { return "<details><summary>" + esc(r.title) + '</summary><div class="kt-body">' + md(r.body) + "</div></details>"; }).join("") + "</div>";
    else body = '<div class="kt-list">' + rows.map(function (r) { return '<a class="card kt-card" href="/' + BASEP[type] + "/" + esc(r.slug) + (lang === "en" ? "?lang=en" : "") + '">' + (safeUrl(r.image_url) ? '<img src="' + esc(safeUrl(r.image_url)) + '" alt="" loading="lazy" decoding="async">' : "") + "<div><h2>" + esc(r.title) + "</h2>" + (r.excerpt ? "<p>" + esc(r.excerpt) + "</p>" : "") + (r.published_at ? '<p class="kt-meta">' + esc(fdate(r.published_at)) + "</p>" : "") + "</div></a>"; }).join("") + "</div>";
    view.innerHTML = '<div class="kt-w"><header class="kt-h"><h1>' + esc(t) + "</h1></header>" + body + "</div>";
  }
  function banner() {
    if (!sb) return;
    Promise.resolve(sb.rpc("public_content_list", { p_type: "banner", p_lang: lang, p_limit: 1 })).then(function (r) {
      var b = r && r.data && r.data[0]; if (!b) return;
      var u = safeUrl(b.link_url), el = $("#kt-banner"), inner = (safeUrl(b.image_url) ? '<img src="' + esc(safeUrl(b.image_url)) + '" alt="' + esc(b.title) + '">' : esc(b.title));
      el.innerHTML = u ? '<a href="' + esc(u) + '">' + inner + "</a>" : inner; el.hidden = false;
    }, function () {});
  }
  function run() {
    if (!sb) { notFound(); return; }
    banner();
    if (preview) {
      sb.from("contents").select("*").eq("id", preview).maybeSingle().then(function (r) {
        var c = r && r.data; if (!c) { seo({ title: "Pratinjau | NusaMora", noindex: true }); view.innerHTML = '<div class="kt-w"><div class="card kt-empty"><h1>Pratinjau tidak tersedia</h1><p>Masuk sebagai admin yang berhak, lalu buka kembali dari panel admin.</p></div></div>'; return; }
        var now = Date.now(), live = c.status === "published" && (!c.publish_at || new Date(c.publish_at) <= now) && (!c.unpublish_at || new Date(c.unpublish_at) > now);
        var why = live ? "konten ini sudah tayang." : c.status === "published" ? (c.publish_at && new Date(c.publish_at) > now ? "dijadwalkan tayang " + fdate(c.publish_at) + "." : "masa tayang sudah berakhir.") : c.status === "draft" ? "masih draft, belum tayang." : "diarsipkan, tidak tayang.";
        c.alternates = c.alternates || [];
        if (c.type === "faq" || c.type === "tutorial" || c.type === "banner") { type = c.type === "banner" ? "faq" : c.type; seo({ title: "Pratinjau | NusaMora", noindex: true }); view.innerHTML = '<div class="kt-w"><div class="kt-pv" role="status"><b>Pratinjau</b>: ' + esc(why) + '</div><header class="kt-h"><h1>' + esc(c.title) + '</h1></header><div class="kt-body">' + (c.type === "banner" ? (safeUrl(c.image_url) ? '<img src="' + esc(safeUrl(c.image_url)) + '" alt="' + esc(c.title) + '">' : "") : md(c.body)) + "</div></div>"; return; }
        showOne(c, why);
      });
      return;
    }
    if (type === "page" && !slug) { notFound(); return; }
    if (slug) {
      Promise.resolve(sb.rpc("public_content", { p_type: type, p_slug: slug, p_lang: lang })).then(function (r) { var c = r && r.data; if (!c) { if (lang === "en") { lang = "id"; q.delete("lang"); } notFound(); return; } showOne(c, ""); }, notFound);
    } else {
      Promise.resolve(sb.rpc("public_content_list", { p_type: type, p_lang: lang, p_limit: 200 })).then(function (r) { showList((r && r.data) || []); }, function () { showList([]); });
    }
  }
  var site = window.NM_SITE && window.NM_SITE.ready ? window.NM_SITE.ready : Promise.resolve();
  site.then(function () {
    var st = (window.NM_SITE && window.NM_SITE.s) || {};
    if (st.timezone) TZ = st.timezone;
    if (!q.get("lang") && !slug && st.default_lang === "en") lang = "en";
  }, function () {}).then(run, run);
})();
