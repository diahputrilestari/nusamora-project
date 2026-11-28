/* Halaman detail artikel NusaMora (editorial). Dipanggil konten.js: window.NMArticle.render(ctx).
   Semua isi (judul, ringkasan, isi, gambar, tanggal) berasal dari database; modul ini hanya menata tampilan,
   membuat daftar isi dari heading, dan mengambil artikel lain untuk terkait / sebelumnya / berikutnya. Vanilla JS. */
(function () {
  "use strict";
  var d = document;
  // Tautan ke halaman kategori template yang paling relevan dengan judul artikel (urutan HARUS sama dengan ops/seo/build_kategori.py -> ARTIKEL_KAT)
  var TPLK = [["ulang-tahun", "Ulang Tahun & Aqiqah", /aqiqah|kelahiran|bayi/i], ["wisuda", "Wisuda", /wisuda|graduation|kelulusan/i], ["seminar-workshop", "Seminar & Workshop", /seminar|workshop|webinar/i], ["pernikahan", "Pernikahan & Lamaran", /lamaran|tunangan|proposal/i], ["ulang-tahun", "Ulang Tahun & Aqiqah", /ulang tahun|birthday|ultah|sweet seventeen/i], ["pernikahan", "Pernikahan & Lamaran", /pernikahan|wedding|nikah/i], ["acara-perusahaan", "Acara Perusahaan", /perusahaan|corporate|gathering|retirement/i]];
  function tplLink(t) { for (var i = 0; i < TPLK.length; i++) if (TPLK[i][2].test(t || "")) return '<a class="ar-pl" href="/template/' + TPLK[i][0] + '">Lihat template undangan ' + TPLK[i][1].replace(/&/g, "&amp;") + " " + ico("right", 16) + "</a>"; return ""; }
  var IC = {
    chev: '<path d="M6 9l6 6 6-6"/>', up: '<path d="M12 19V5M6 11l6-6 6 6"/>', left: '<path d="M19 12H5M11 6l-6 6 6 6"/>', right: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>', chat: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/>',
    share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 10.5l6.8-4M8.6 13.5l6.8 4"/>', clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>', home: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/>'
  };
  var ico = function (n, s) { return '<svg viewBox="0 0 24 24" width="' + (s || 18) + '" height="' + (s || 18) + '" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + IC[n] + "</svg>"; };
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var slugify = function (t) { return String(t).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "bagian"; };
  var words = function (t) { var s = String(t || "").replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1").trim(); return s ? s.split(/\s+/).length : 0; };

  function render(ctx) {
    var c = ctx.c, pv = ctx.pv, esc = ctx.esc, view = ctx.view, sb = ctx.sb;
    var cat = ctx.catOf(c), readMin = Math.max(1, Math.ceil(words(c.body) / 200));
    var author = String(c.author || "Tim NusaMora"), href = ctx.canon || location.href.split("#")[0];
    var published = c.published_at ? ctx.fdate(c.published_at) : "", updated = "";
    if (c.updated_at && c.published_at && String(c.updated_at).slice(0, 10) > String(c.published_at).slice(0, 10)) updated = ctx.fdate(c.updated_at);
    var img = ctx.safeUrl(ctx.artImg(c)), title = c.title;

    /* ---- isi: HTML dari renderer markdown aman, lalu ditata (id heading, gambar bertakar, callout) ---- */
    var box = d.createElement("div"); box.innerHTML = ctx.md(c.body);
    /* Renderer memetakan "##" ke h3 dan "###" ke h4 (h1 dipakai judul halaman). Bila tidak ada h2, naikkan satu level agar hierarki dan daftar isi benar. */
    if (!box.querySelector("h2")) [].slice.call(box.querySelectorAll("h3,h4")).forEach(function (h) {
      var n = d.createElement(h.tagName === "H3" ? "h2" : "h3"); n.innerHTML = h.innerHTML; h.parentNode.replaceChild(n, h);
    });
    var used = {}, toc = [];
    [].slice.call(box.querySelectorAll("h2,h3")).forEach(function (h) {
      var id = slugify(h.textContent), n = used[id] = (used[id] || 0) + 1; if (n > 1) id += "-" + n; h.id = id;
      h.insertAdjacentHTML("beforeend", '<a class="ar-anc" href="#' + id + '" aria-label="Tautan ke bagian ini">#</a>');
      toc.push({ id: id, t: h.firstChild ? h.firstChild.textContent : h.textContent, l: h.tagName === "H2" ? 2 : 3 });
    });
    [].slice.call(box.querySelectorAll("p")).forEach(function (p) {
      var kids = p.childNodes; if (kids.length === 1 && kids[0].nodeName === "IMG") {
        var im = kids[0], fg = d.createElement("figure"); fg.className = "ar-fig"; p.parentNode.replaceChild(fg, p); fg.appendChild(im);
        if (im.alt) { var cp = d.createElement("figcaption"); cp.textContent = im.alt; fg.appendChild(cp); }
      }
    });
    [].slice.call(box.querySelectorAll("blockquote")).forEach(function (b) { if (/^(tips?|catatan|penting|info|perhatian)\s*[:\-]/i.test(b.textContent.trim())) b.className = "ar-callout"; });
    [].slice.call(box.querySelectorAll("a")).forEach(function (a) { if (a.target === "_blank") a.rel = "noopener nofollow ugc"; });
    var bodyHtml = box.innerHTML;
    var hasToc = toc.filter(function (x) { return x.l === 2; }).length >= 2;
    var tocHtml = hasToc ? '<ol>' + toc.map(function (x) { return '<li class="l' + x.l + '"><a href="#' + x.id + '">' + esc(x.t) + "</a></li>"; }).join("") + "</ol>" : "";

    var ldText = "Baca artikel “" + title + "” di NusaMora: ";
    var share = '<ul class="ar-share" aria-label="Bagikan artikel">' +
      '<li><a href="https://wa.me/?text=' + encodeURIComponent(ldText + href) + '" target="_blank" rel="noopener">' + ico("chat", 17) + "<span>WhatsApp</span></a></li>" +
      '<li><a href="https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(href) + '" target="_blank" rel="noopener"><span>Facebook</span></a></li>' +
      '<li><a href="https://twitter.com/intent/tweet?text=' + encodeURIComponent(title) + "&url=" + encodeURIComponent(href) + '" target="_blank" rel="noopener"><span>X</span></a></li>' +
      (img ? '<li><a href="https://pinterest.com/pin/create/button/?url=' + encodeURIComponent(href) + "&media=" + encodeURIComponent(new URL(img, location.origin).href) + "&description=" + encodeURIComponent(title) + '" target="_blank" rel="noopener"><span>Pinterest</span></a></li>' : "") +
      '<li><button type="button" class="ar-native" data-url="' + esc(href) + '" hidden>' + ico("share", 17) + "<span>Bagikan</span></button></li>" +
      '<li><button type="button" class="ar-copy" data-url="' + esc(href) + '">' + ico("link", 17) + "<span>Salin tautan</span></button></li></ul>";

    var h = '<div class="ar"><div class="ar-prog" id="ar-prog" role="progressbar" aria-label="Kemajuan membaca" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><i></i></div>';
    h += (pv ? '<div class="kt-pv" role="status"><b>Pratinjau</b>: ' + esc(pv) + "</div>" : "");
    h += '<header class="ar-head"><nav class="ar-bc" aria-label="Breadcrumb"><ol><li><a href="/">Beranda</a></li><li><a href="/artikel">Artikel</a></li><li><a href="/artikel?kat=' + encodeURIComponent(cat) + '">' + esc(cat) + '</a></li><li aria-current="page"><span>' + esc(title) + "</span></li></ol></nav>";
    h += '<a class="ar-cat" href="/artikel?kat=' + encodeURIComponent(cat) + '">' + esc(cat) + "</a><h1>" + esc(title) + "</h1>" + (c.excerpt ? '<p class="ar-lead">' + esc(c.excerpt) + "</p>" : "");
    h += '<div class="ar-by"><div class="ar-who"><span class="ar-av" aria-hidden="true">' + esc(author.charAt(0).toUpperCase()) + '</span><div><p class="ar-au">Oleh <b>' + esc(author) + '</b></p><p class="ar-mt">' + (published ? '<time datetime="' + esc(String(c.published_at).slice(0, 10)) + '">' + esc(published) + "</time>" : "") +
      (published ? '<i aria-hidden="true"></i>' : "") + "<span>" + ico("clock", 14) + readMin + " menit baca</span>" + (updated ? '<i aria-hidden="true"></i><span>Diperbarui ' + esc(updated) + "</span>" : "") + "</p></div></div>" + share + '</div><p class="ai-stats" id="ai-stats" aria-label="Statistik artikel"></p></header>';
    h += img ? '<figure class="ar-hero">' + ctx.cover(c, cat, true) + "</figure>" : "";
    h += '<div class="ar-grid"><aside class="ar-side" aria-label="Daftar isi">' + (hasToc ? '<nav class="ar-toc" aria-labelledby="ar-th"><p id="ar-th">Daftar Isi</p>' + tocHtml + "</nav>" : "") + "</aside>";
    h += '<div class="ar-main">' + (hasToc ? '<details class="ar-mtoc"><summary>' + ico("list", 18) + '<span>Daftar Isi</span>' + ico("chev", 18) + "</summary>" + tocHtml + "</details>" : "");
    h += '<div class="ar-body kt-body" id="ar-body">' + bodyHtml + "</div>";
    h += '<div class="ar-end"><p class="ar-endl">Bagikan artikel ini</p>' + share + "</div>";
    h += '<div class="ai-root" id="ai-root"></div>';
    h += '<aside class="ar-promo" aria-labelledby="ar-ph"><div><p class="ar-pe">NusaMora</p><h2 id="ar-ph">Undangan digital yang terasa seperti hari bahagia Anda</h2><p>Pilih template, isi data, dan bagikan link pribadi ke tiap tamu. Coba demo dulu, bayar saat Anda siap.</p></div><div class="ar-pa"><a class="btn lg ar-pb" href="/#template">Jelajahi Undangan Pernikahan</a><a class="ar-pl" href="/live/">Lihat demo Live Guest ' + ico("right", 16) + "</a>" + tplLink(title) + "</div></aside>";
    h += '<div class="ar-nav" id="ar-nav" hidden></div>';
    h += '<nav class="ar-cats" aria-label="Kategori artikel"><p>Jelajahi kategori</p><ul id="ar-cl"></ul></nav></div></div>';
    h += '<section class="ar-rel" id="ar-rel" aria-labelledby="ar-rh" hidden><div class="ar-relw"><div class="ar-rh"><h2 id="ar-rh">Baca Juga</h2><a href="/artikel">Semua artikel ' + ico("right", 16) + "</a></div><div class=\"kt-grid\" id=\"ar-rg\"></div></div></section>";
    h += '<button type="button" class="ar-top" id="ar-top" aria-label="Kembali ke atas" hidden>' + ico("up", 20) + "</button><div class=\"ar-toast\" id=\"ar-toast\" role=\"status\" aria-live=\"polite\"></div></div>";
    view.innerHTML = h;
    var $ = function (s) { return view.querySelector(s); };

    /* ---- progres baca, tombol ke atas, bagian aktif di daftar isi ---- */
    var prog = $("#ar-prog"), pbar = prog.firstChild, body = $("#ar-body"), topb = $("#ar-top"), tick = false;
    function onScroll() {
      tick = false; var r = body.getBoundingClientRect(), vh = window.innerHeight, total = r.height - vh * 0.6, done = Math.min(1, Math.max(0, (vh * 0.2 - r.top) / Math.max(1, total)));
      pbar.style.transform = "scaleX(" + done.toFixed(4) + ")"; prog.setAttribute("aria-valuenow", Math.round(done * 100)); topb.hidden = window.scrollY < 700;
    }
    window.addEventListener("scroll", function () { if (!tick) { tick = true; requestAnimationFrame(onScroll); } }, { passive: true }); onScroll();
    topb.addEventListener("click", function () { window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" }); });
    if (hasToc && "IntersectionObserver" in window) {
      var links = [].slice.call(view.querySelectorAll(".ar-toc a")), heads = toc.map(function (x) { return d.getElementById(x.id); }).filter(Boolean);
      var setActive = function (id) { links.forEach(function (a) { var on = a.getAttribute("href") === "#" + id; a.classList.toggle("on", on); if (on) a.setAttribute("aria-current", "true"); else a.removeAttribute("aria-current"); }); };
      var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) setActive(e.target.id); }); }, { rootMargin: "-90px 0px -65% 0px", threshold: 0 });
      heads.forEach(function (x) { io.observe(x); }); if (heads[0]) setActive(heads[0].id);
    }
    view.addEventListener("click", function (e) {
      var a = e.target.closest('.ar-toc a,.ar-mtoc a,.ar-anc'); if (a) {
        var t = d.getElementById(a.getAttribute("href").slice(1)); if (t) { e.preventDefault(); t.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" }); try { history.replaceState(null, "", "#" + t.id); } catch (x) { /* abaikan */ } var md = a.closest("details"); if (md) md.open = false; }
        return;
      }
      var nb = e.target.closest(".ar-native"); if (nb) { navigator.share({ title: title, text: ldText, url: nb.getAttribute("data-url") }).catch(function () { /* dibatalkan */ }); return; }
      var cb = e.target.closest(".ar-copy"); if (cb) {
        var u = cb.getAttribute("data-url"), ok = function () { toast("Tautan tersalin."); }, fb = function () { var ta = d.createElement("textarea"); ta.value = u; ta.style.position = "fixed"; ta.style.opacity = "0"; d.body.appendChild(ta); ta.select(); try { d.execCommand("copy"); ok(); } catch (x) { toast("Salin manual: " + u); } ta.remove(); };
        if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(u).then(ok, fb); else fb();
      }
    });
    var tt; function toast(m) { var t = $("#ar-toast"); t.textContent = m; t.classList.add("on"); clearTimeout(tt); tt = setTimeout(function () { t.classList.remove("on"); }, 2400); }

    view.querySelectorAll(".ar-native").forEach(function (b) { if (navigator.share) b.hidden = false; });
    if (sb && !pv && window.NMInteract) window.NMInteract.mount({ root: $("#ai-root"), stats: $("#ai-stats"), byline: $(".ar-au b"), ctx: ctx, toast: toast });

    /* ---- artikel lain: terkait, sebelumnya/berikutnya, kategori ---- */
    if (sb && !pv) Promise.resolve(sb.rpc("public_content_list", { p_type: "article", p_lang: c.lang || "id", p_limit: 100 })).then(function (r) {
      var rows = (r && r.data) || [], items = rows.map(function (x) { return { r: x, cat: ctx.catOf(x) }; }), idx = -1;
      items.forEach(function (x, i) { if (x.r.slug === c.slug) idx = i; });
      if (!items.length) return;
      var cl = [], seen = {}; ctx.catOrder.concat(items.map(function (x) { return x.cat; })).forEach(function (n) { if (!seen[n] && items.some(function (x) { return x.cat === n; })) { seen[n] = 1; cl.push(n); } });
      $("#ar-cl").innerHTML = cl.map(function (n) { return '<li><a href="/artikel?kat=' + encodeURIComponent(n) + '"' + (n === cat ? ' aria-current="true"' : "") + ">" + esc(n) + "</a></li>"; }).join("");
      var others = items.filter(function (x) { return x.r.slug !== c.slug; }), rel = others.filter(function (x) { return x.cat === cat; }).concat(others.filter(function (x) { return x.cat !== cat; })).slice(0, 3);
      if (rel.length) { $("#ar-rg").innerHTML = rel.map(function (x) { return '<a class="kt-ac" href="' + ctx.href(x.r) + '">' + ctx.cover(x.r, x.cat, false) + '<div class="kt-cb"><span class="kt-badge">' + esc(x.cat) + "</span><h3>" + esc(x.r.title) + "</h3>" + (x.r.excerpt ? '<p class="kt-ex">' + esc(x.r.excerpt) + "</p>" : "") + ctx.meta(x.r) + "</div></a>"; }).join(""); $("#ar-rel").hidden = false; }
      var pr = idx > 0 ? items[idx - 1] : null, nx = idx > -1 && idx < items.length - 1 ? items[idx + 1] : null;
      if (pr || nx) {
        var nv = function (x, dir) { return x ? '<a class="' + dir + '" href="' + ctx.href(x.r) + '" rel="' + (dir === "p" ? "prev" : "next") + '"><small>' + (dir === "p" ? ico("left", 15) + "Artikel Sebelumnya" : "Artikel Berikutnya" + ico("right", 15)) + "</small><b>" + esc(x.r.title) + "</b></a>" : "<span></span>"; };
        $("#ar-nav").innerHTML = nv(pr, "p") + nv(nx, "n"); $("#ar-nav").hidden = false;
      }
    }, function () { /* tanpa artikel lain: bagian terkait tetap tersembunyi */ });
    else $("#ar-cl").innerHTML = ctx.catOrder.map(function (n) { return '<li><a href="/artikel?kat=' + encodeURIComponent(n) + '"' + (n === cat ? ' aria-current="true"' : "") + ">" + esc(n) + "</a></li>"; }).join("");

    return { cat: cat, readMin: readMin, author: author, words: words(c.body) };
  }
  window.NMArticle = { render: render };
})();
