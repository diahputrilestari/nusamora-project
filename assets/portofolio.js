/* Portofolio NusaMora: daftar + filter, detail proyek, galeri lightbox, SEO dinamis, dan seksi beranda. Data di portofolio-data.js. */
(function () {
  "use strict";
  var D = window.NM_PORTFOLIO;
  if (!D) return;
  var SITE = "https://nusamora.com";
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  var catLabel = function (k) { for (var i = 0; i < D.categories.length; i++) if (D.categories[i].key === k) return D.categories[i].label; return k; };
  var bySlug = function (s) { for (var i = 0; i < D.projects.length; i++) if (D.projects[i].slug === s) return D.projects[i]; return null; };
  var inCat = function (p, k) { return k === "all" || p.category === k || (p.alsoIn || []).indexOf(k) > -1; };
  /* Demo hanya valid bila berupa path /live/... atau https. Selain itu tombol demo tidak ditampilkan. */
  var demoOf = function (p) { var u = String(p.demoUrl || "").trim(); return /^(https:\/\/[^\s"'<>]+|\/live\/[a-z0-9\/-]+)$/i.test(u) ? u : ""; };
  var statusOf = function (p) { return D.statuses[p.status] || D.statuses.concept; };
  var url = function (p) { return "/portofolio/" + p.slug; };
  var arrow = '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';

  function card(p, i) {
    var demo = demoOf(p), eager = i < 2;
    var tags = p.features.slice(0, 3).map(function (f) { return '<li class="pf-tag">' + esc(f) + "</li>"; }).join("");
    return '<article class="pf-card' + (p.featured ? " is-feat" : "") + '" data-id="' + esc(p.id) + '">' +
      '<a class="pf-img" href="' + url(p) + '" tabindex="-1" aria-hidden="true"><img src="' + esc(p.cover.src) + '" alt="" width="960" height="540"' + (p.cover.pos ? ' style="object-position:' + esc(p.cover.pos) + '"' : "") + ' ' + (eager ? 'fetchpriority="high"' : 'loading="lazy"') + ' decoding="async"><span class="pf-badge s-' + esc(p.status) + '">' + esc(statusOf(p)) + "</span></a>" +
      '<div class="pf-cb"><span class="pf-cat">' + esc(catLabel(p.category)) + "</span>" +
      '<h3><a href="' + url(p) + '">' + esc(p.title) + "</a></h3><p>" + esc(p.short) + "</p>" +
      '<ul class="pf-tags" aria-label="Features">' + tags + "</ul>" +
      '<div class="pf-acts"><a class="pf-link" href="' + url(p) + '" aria-label="View Project: ' + esc(p.title) + '">View Project</a>' +
      (demo ? '<a class="pf-link" href="' + esc(demo) + '" target="_blank" rel="noopener" aria-label="Try Live Demo: ' + esc(p.title) + '">Try Live Demo</a>' : "") +
      "</div></div></article>";
  }

  function setMeta(sel, attr, val) { var el = $(sel); if (el) el.setAttribute(attr, val); }
  function seo(o) {
    document.title = o.title;
    setMeta('meta[name="description"]', "content", o.desc);
    setMeta('link[rel="canonical"]', "href", o.url);
    setMeta('meta[property="og:title"]', "content", o.title);
    setMeta('meta[property="og:description"]', "content", o.desc);
    setMeta('meta[property="og:url"]', "content", o.url);
    setMeta('meta[property="og:image"]', "content", o.image);
    setMeta('meta[property="og:image:alt"]', "content", o.imageAlt);
    setMeta('meta[name="twitter:title"]', "content", o.title);
    setMeta('meta[name="twitter:description"]', "content", o.desc);
    setMeta('meta[name="twitter:image"]', "content", o.image);
    setMeta('meta[name="robots"]', "content", o.noindex ? "noindex,follow" : "index,follow,max-image-preview:large");
    var ld = $("#pf-ld");
    if (ld && o.ld) ld.textContent = JSON.stringify(o.ld);
  }
  var abs = function (p) { return /^https?:/.test(p) ? p : SITE + p; };

  /* reveal on scroll */
  function reveal(root) {
    var els = [].slice.call((root || document).querySelectorAll(".pf-rv:not(.in)"));
    if (!("IntersectionObserver" in window)) { els.forEach(function (e) { e.classList.add("in"); }); return; }
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }); }, { rootMargin: "0px 0px -8% 0px" });
    els.forEach(function (e) { io.observe(e); });
  }

  /* header burger (halaman ini tidak memuat landing.js) */
  var burger = $("#burger"), menu = $("#menu");
  if (burger && menu) burger.addEventListener("click", function () {
    var o = !menu.classList.contains("open"); menu.classList.toggle("open", o);
    burger.setAttribute("aria-expanded", o); burger.setAttribute("aria-label", o ? "Tutup menu" : "Buka menu");
  });

  /* ============ halaman daftar ============ */
  function renderList(app) {
    var q = new URLSearchParams(location.search).get("kategori") || "all";
    var valid = D.categories.some(function (c) { return c.key === q; });
    var cur = valid ? q : "all";
    var chips = $("#pf-chips"), grid = $("#pf-grid"), count = $("#pf-count");

    chips.innerHTML = D.categories.map(function (c) {
      return '<button class="pf-chip" type="button" data-k="' + c.key + '" aria-pressed="' + (c.key === cur) + '">' + esc(c.label) + "</button>";
    }).join("");

    function draw() {
      var list = D.projects.filter(function (p) { return inCat(p, cur); });
      count.textContent = list.length + (list.length === 1 ? " experience" : " experiences") + (cur === "all" ? "" : " in " + catLabel(cur));
      if (!list.length) {
        grid.innerHTML = '<div class="pf-empty" role="status"><h3>New experiences are on the way.</h3><p>We have not published a ' + esc(catLabel(cur)) + ' showcase yet. Explore the other categories, or start from a template and make your own.</p><a class="btn" href="/template">Create Your Invitation ' + arrow + "</a></div>";
      } else grid.innerHTML = list.map(card).join("");
      grid.setAttribute("aria-busy", "false");
    }
    function setCat(k, push) {
      if (k === cur && !push) return;
      cur = k;
      [].forEach.call(chips.children, function (b) { b.setAttribute("aria-pressed", b.dataset.k === k); });
      var u = k === "all" ? "/portofolio" : "/portofolio?kategori=" + k;
      history.replaceState(null, "", u);
      var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduce) { draw(); return; }
      grid.classList.add("is-out");
      setTimeout(function () { draw(); requestAnimationFrame(function () { grid.classList.remove("is-out"); }); }, 200);
    }
    chips.addEventListener("click", function (e) { var b = e.target.closest(".pf-chip"); if (b) setCat(b.dataset.k); });
    draw();

    var lg = $("#pf-legend");
    if (lg) lg.innerHTML = Object.keys(D.statuses).map(function (k) { return "<li><b>" + esc(D.statuses[k]) + "</b><span>" + esc((D.statusNotes || {})[k] || "") + "</span></li>"; }).join("");

    var ld = {
      "@context": "https://schema.org", "@type": "CollectionPage", name: "NusaMora Portfolio", url: SITE + "/portofolio",
      description: "Creative showcase of interactive 3D wedding invitations, virtual celebrations, and immersive digital event experiences by NusaMora.",
      isPartOf: { "@type": "WebSite", name: "NusaMora", url: SITE + "/" },
      mainEntity: { "@type": "ItemList", itemListElement: D.projects.map(function (p, i) { return { "@type": "ListItem", position: i + 1, url: SITE + url(p), name: p.title }; }) }
    };
    var l = $("#pf-ld"); if (l) l.textContent = JSON.stringify(ld);
  }

  /* ============ lightbox ============ */
  function lightbox(images, start, opener) {
    var dlg = $("#pf-lb"), i = start;
    function show() { var im = images[i]; $("#pf-lb-i").src = im.src; $("#pf-lb-i").alt = im.alt; $("#pf-lb-c").textContent = im.alt + "  (" + (i + 1) + "/" + images.length + ")"; }
    function go(d) { i = (i + d + images.length) % images.length; show(); }
    dlg.querySelector(".pv").hidden = dlg.querySelector(".nx").hidden = images.length < 2;
    dlg.querySelector(".pv").onclick = function () { go(-1); };
    dlg.querySelector(".nx").onclick = function () { go(1); };
    dlg.querySelector(".x").onclick = function () { dlg.close(); };
    dlg.onclick = function (e) { if (e.target === dlg) dlg.close(); };
    dlg.onkeydown = function (e) { if (e.key === "ArrowLeft") go(-1); else if (e.key === "ArrowRight") go(1); };
    dlg.onclose = function () { if (opener && opener.focus) opener.focus(); };
    show();
    if (dlg.showModal) dlg.showModal(); else dlg.setAttribute("open", "");
  }

  /* ============ halaman detail ============ */
  function renderDetail(app, slug) {
    var p = bySlug(slug);
    if (!p) {
      seo({ title: "Project not found | NusaMora Portfolio", desc: "The portfolio project you are looking for is not available.", url: SITE + "/portofolio", image: SITE + "/assets/og-nusamora.png", imageAlt: "NusaMora", noindex: true });
      app.innerHTML = '<div class="pf-w"><div class="pf-empty" role="status" style="margin-top:48px"><h1 class="pf-h" style="font-size:32px;margin-bottom:10px">Project not found</h1><p>This showcase does not exist or has been moved.</p><a class="btn" href="/portofolio">Explore All Portfolios ' + arrow + "</a></div></div>";
      return;
    }
    var demo = demoOf(p);
    var rel = D.projects.filter(function (x) { return x.id !== p.id && (x.category === p.category || (x.alsoIn || []).some(function (k) { return (p.alsoIn || []).indexOf(k) > -1; })); });
    rel.sort(function (a, b) { return (b.category === p.category) - (a.category === p.category); });
    rel = rel.slice(0, 3);
    var seen = {}, all = [p.cover].concat(p.gallery || []).filter(function (im) { if (seen[im.src]) return false; seen[im.src] = 1; return true; });

    app.innerHTML =
      '<div class="pf-w"><nav class="pf-crumb" aria-label="Breadcrumb"><a href="/">Beranda</a> / <a href="/portofolio">Portofolio</a> / <span aria-current="page">' + esc(p.title) + "</span></nav>" +
      '<header class="pf-dh"><img src="' + esc(p.cover.src) + '" alt="' + esc(p.cover.alt) + '" width="960" height="540"' + (p.cover.pos ? ' style="object-position:' + esc(p.cover.pos) + '"' : "") + ' fetchpriority="high" decoding="async"><div class="pf-dh-t"><span class="pf-cat">' + esc(catLabel(p.category)) + " &middot; " + esc(statusOf(p)) + "</span><h1>" + esc(p.title) + "</h1><p>" + esc(p.short) + "</p></div></header>" +
      '<section class="pf-ov pf-rv" aria-label="Project overview"><div><h2>Creative Concept</h2><p>' + esc(p.concept) + '</p></div><div><h2>Design Inspiration</h2><p>' + esc(p.inspiration) + '</p></div><div><h2>The Experience</h2><p>' + esc(p.experience) + "</p></div></section>" +
      '<div class="pf-meta pf-rv"><div><span>Category</span><b>' + esc(catLabel(p.category)) + "</b></div><div><span>Theme</span><b>" + esc(p.theme) + "</b></div><div><span>Status</span><b>" + esc(statusOf(p)) + "</b></div></div>" +
      '<section class="pf-band pf-rv" aria-labelledby="g-h"><div class="pf-band-h"><span class="pf-eyebrow">Visual Gallery</span><h2 id="g-h" class="pf-h">A closer look</h2></div><div class="pf-gal">' +
      all.map(function (im, i) { return '<button type="button" data-i="' + i + '" aria-label="Open image ' + (i + 1) + ': ' + esc(im.alt) + '"><img src="' + esc(im.src) + '" alt="' + esc(im.alt) + '" width="960" height="540" loading="' + (i ? "lazy" : "eager") + '" decoding="async"></button>'; }).join("") +
      '</div><p class="pf-note">' + esc(D.visualNote) + "</p></section>" +
      '<section class="pf-band pf-rv" aria-labelledby="f-h"><div class="pf-band-h"><span class="pf-eyebrow">Interactive Features</span><h2 id="f-h" class="pf-h">Built to be explored</h2></div><ul class="pf-feat">' +
      p.features.map(function (f, i) { return "<li><i>" + String(i + 1).padStart(2, "0") + "</i><b>" + esc(f) + "</b></li>"; }).join("") + "</ul></section>" +
      (demo ? '<section class="pf-live pf-rv" aria-labelledby="l-h"><div><h2 id="l-h" class="pf-h">Live Experience</h2><p>Walk through this experience yourself.</p></div><a class="btn lg" href="' + esc(demo) + '" target="_blank" rel="noopener">Experience This Invitation ' + arrow + "</a></section>" : "") +
      (rel.length ? '<section class="pf-band pf-rv" aria-labelledby="r-h"><div class="pf-band-h"><span class="pf-eyebrow">Related Projects</span><h2 id="r-h" class="pf-h">More to explore</h2></div><div class="pf-grid pf-rel">' + rel.map(card).join("") + "</div></section>" : "") +
      "</div>" +
      '<section class="pf-end pf-rv" aria-labelledby="c-h"><h2 id="c-h" class="pf-h">Ready to Create Your Own Extraordinary Invitation?</h2><p>Pick a template, make it yours, and share it with a single link.</p><div class="pf-end-a"><a class="btn lg inv" href="/template">Create Your Invitation ' + arrow + '</a><a class="btn lg ghost" href="/#template">Browse Templates</a></div></section>';

    app.querySelector(".pf-gal").addEventListener("click", function (e) {
      var b = e.target.closest("button[data-i]"); if (b) lightbox(all, +b.dataset.i, b);
    });

    var title = p.title + " | NusaMora Portfolio";
    var desc = p.short.length > 155 ? p.short.slice(0, 152).replace(/\s+\S*$/, "") + "..." : p.short;
    seo({
      title: title, desc: desc, url: SITE + url(p), image: abs(p.cover.src), imageAlt: p.cover.alt,
      ld: { "@context": "https://schema.org", "@graph": [
        { "@type": "CreativeWork", name: p.title, description: p.short, url: SITE + url(p), image: abs(p.cover.src), genre: catLabel(p.category), creator: { "@type": "Organization", name: "NusaMora", url: SITE + "/" } },
        { "@type": "BreadcrumbList", itemListElement: [
          { "@type": "ListItem", position: 1, name: "Beranda", item: SITE + "/" },
          { "@type": "ListItem", position: 2, name: "Portofolio", item: SITE + "/portofolio" },
          { "@type": "ListItem", position: 3, name: p.title, item: SITE + url(p) } ] } ] }
    });
  }

  /* ============ seksi beranda ============ */
  function renderHome(el) {
    var list = D.projects.filter(function (p) { return p.featured; });
    if (list.length < 4) list = list.concat(D.projects.filter(function (p) { return !p.featured; })).slice(0, 4);
    el.innerHTML = list.slice(0, 6).map(card).join("");
  }

  var app = $("#pf-app");
  if (app) {
    var m = location.pathname.replace(/\/+$/, "").match(/^\/portofolio\/([a-z0-9-]+)$/);
    if (m) renderDetail(app, m[1]); else renderList(app);
    reveal(document);
  }
  var home = $("#pfh-grid");
  if (home) renderHome(home);
})();
