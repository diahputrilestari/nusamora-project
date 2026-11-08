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
  var safeUrl = function (u) { u = String(u || "").trim(); return /^(https:\/\/[^\s"'<>]+|\/[^\s"'<>]*)$/.test(u) ? u : ""; };

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
  function showOne(c, pv) {
    var title = c.seo_title || c.title, desc = c.seo_description || c.excerpt || plain(c.body).slice(0, 155), img = c.og_image_url || c.image_url || "";
    var canon = c.canonical_url || urlFor(c.type, c.slug, c.lang);
    var alts = [{ lang: c.lang, href: urlFor(c.type, c.slug, c.lang) }].concat((c.alternates || []).map(function (a) { return { lang: a.lang, href: urlFor(c.type, a.slug, a.lang) }; }));
    seo({ title: title + " | NusaMora", description: desc, canonical: canon, noindex: pv || c.noindex, image: safeUrl(img), lang: c.lang, og: c.type === "article" ? "article" : "website", alternates: alts.length > 1 ? alts : [],
      ld: c.type === "article" && !pv ? { "@context": "https://schema.org", "@type": "Article", headline: c.title, description: desc, image: safeUrl(img) || undefined, inLanguage: c.lang, datePublished: c.published_at, dateModified: c.updated_at, mainEntityOfPage: canon, publisher: { "@type": "Organization", name: "NusaMora" } } : null });
    var sw = (c.alternates || [])[0];
    view.innerHTML = '<article class="kt-w">' + (pv ? '<div class="kt-pv" role="status"><b>Pratinjau</b>: ' + esc(pv) + "</div>" : "") +
      '<header class="kt-h"><h1>' + esc(c.title) + "</h1>" + (c.type === "article" && c.published_at ? '<p class="kt-meta">' + esc(fdate(c.published_at)) + "</p>" : "") + (c.excerpt ? '<p class="kt-lead">' + esc(c.excerpt) + "</p>" : "") + "</header>" +
      (c.image_url && safeUrl(c.image_url) ? '<img class="kt-cover" src="' + esc(safeUrl(c.image_url)) + '" alt="" decoding="async">' : "") + '<div class="kt-body">' + md(c.body) + "</div>" +
      (sw ? '<p class="kt-sw"><a href="/' + BASEP[c.type] + "/" + esc(sw.slug) + (sw.lang === "en" ? "?lang=en" : "") + '" hreflang="' + esc(sw.lang) + '">' + (sw.lang === "en" ? "Read this in English" : "Baca dalam Bahasa Indonesia") + "</a></p>" : "") + "</article>";
  }
  function showList(rows) {
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
      Promise.resolve(sb.rpc("public_content_list", { p_type: type, p_lang: lang, p_limit: 100 })).then(function (r) { showList((r && r.data) || []); }, function () { showList([]); });
    }
  }
  var site = window.NM_SITE && window.NM_SITE.ready ? window.NM_SITE.ready : Promise.resolve();
  site.then(function () {
    var st = (window.NM_SITE && window.NM_SITE.s) || {};
    if (st.timezone) TZ = st.timezone;
    if (!q.get("lang") && !slug && st.default_lang === "en") lang = "en";
  }, function () {}).then(run, run);
})();
