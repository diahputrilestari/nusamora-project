/* NusaMora Invite 2D — engine universal.
   Menyusun undangan dari view model (data.js) + paket tema (theme.js). Tidak ada warna, ornamen, ilustrasi,
   atau teks khas tema di sini: semuanya datang dari assets/invite/themes/<id>/theme.json.
   Animasi dari motion.js, styling dasar di engine.css. */
(function (w, d) {
  "use strict";
  var NI = w.NMInvite, M = NI.motion, TH = NI.theme, D = NI.data;
  var IANA = { WIB: "Asia/Jakarta", WITA: "Asia/Makassar", WIT: "Asia/Jayapura" };

  /* ---------- util ---------- */
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function nl(s) { return esc(s).replace(/\n/g, "<br>"); }
  function $(s, r) { return (r || d).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || d).querySelectorAll(s)); }
  function fmt(dt, tz, o) { if (!dt) return ""; try { return dt.toLocaleDateString("id-ID", Object.assign({ timeZone: IANA[tz] || IANA.WIB }, o)); } catch (e) { return dt.toLocaleDateString("id-ID", o); } }
  function fdate(dt, tz) { return fmt(dt, tz, { weekday: "long", day: "numeric", month: "long", year: "numeric" }); }
  function dotDate(dt, tz) { if (!dt) return ""; var p = fmt(dt, tz, { day: "2-digit", month: "2-digit", year: "numeric" }); return p.replace(/\//g, " . "); }
  function initials(n) { return (n || "?").trim().split(/\s+/).slice(0, 2).map(function (x) { return x.charAt(0).toUpperCase(); }).join(""); }
  function ago(iso) {
    var s = (Date.now() - new Date(iso).getTime()) / 1000; if (!(s >= 0)) return "";
    if (s < 60) return "baru saja"; if (s < 3600) return Math.floor(s / 60) + " menit lalu"; if (s < 86400) return Math.floor(s / 3600) + " jam lalu";
    if (s < 2592000) return Math.floor(s / 86400) + " hari lalu"; return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
  }
  function store(k, v) { try { if (v === undefined) return JSON.parse(localStorage.getItem(k) || "null"); localStorage.setItem(k, JSON.stringify(v)); } catch (e) { return null; } }
  function toast(t) { var e = d.createElement("div"); e.className = "tst"; e.setAttribute("role", "status"); e.textContent = t; $("#tsts").appendChild(e); setTimeout(function () { e.classList.add("out"); }, 2400); setTimeout(function () { e.remove(); }, 2900); }
  function copy(text, btn) {
    function ok() { if (btn) { btn.classList.add("done"); var l = $(".lb", btn); var o = l ? l.textContent : ""; if (l) l.textContent = "Tersalin"; setTimeout(function () { btn.classList.remove("done"); if (l) l.textContent = o; }, 1800); } toast("Berhasil disalin"); }
    function fb() { var t = d.createElement("textarea"); t.value = text; t.setAttribute("readonly", ""); t.style.cssText = "position:fixed;opacity:0"; d.body.appendChild(t); t.select(); try { d.execCommand("copy"); ok(); } catch (e) { toast("Salin manual: " + text); } t.remove(); }
    if (navigator.clipboard && w.isSecureContext) navigator.clipboard.writeText(text).then(ok, fb); else fb();
  }
  /* ---------- paket tema aktif ---------- */
  var P = null;
  function O(name) { return TH.orn(name); }                       // ornamen svg menurut nama
  function div() { return O(P.ornament.divider); }
  function ring() { return P.ornament.frame === "none" ? "" : '<span class="ring">' + O("arch") + "</span>"; }
  function tx(key, def) { var c = P.copy || {}; return c[key] != null && c[key] !== "" ? c[key] : def; }
  /* slot ilustrasi: string, {src, w} atau daftar keduanya, relatif ke folder tema. Dekoratif: alt kosong. */
  function items(slot) {
    var v = P.art && P.art[slot]; if (!v) return [];
    return (Array.isArray(v) ? v : [v]).map(function (x) { return typeof x === "string" ? { src: x } : x; })
      .filter(function (x) { return x && /^[\w./-]+$/.test(x.src || "") && x.src.indexOf("..") < 0; });
  }
  function has(slot) { return items(slot).length > 0; }
  /* latar: foto sampul pelanggan, atau backdrop tema bila foto belum ada */
  /* hero: art.heroBackdrop (bila ada) selalu menjadi latar Beranda, mendahului foto sampul */
  function bgImg(vm, eager, hero) {
    var hb = hero && TH.backdrop(P, "heroBackdrop");
    if (!hb && vm.cover) return img(vm.cover, "", "", eager);
    var b = hb || TH.backdrop(P); if (!b) return "";
    return '<img src="' + esc(b.sm) + '" srcset="' + esc(b.sm) + " 900w, " + esc(b.lg) + " " + b.w + 'w" sizes="(min-width: 1024px) 60vw, 100vw" alt="" ' + (eager ? 'fetchpriority="high"' : 'loading="lazy"') + ' decoding="async">';
  }
  function art(slot, cls, eager, only) {
    var L = items(slot); if (only != null) L = L[only] ? [L[only]] : [];
    return L.map(function (x) { return '<img class="art ' + (cls || "") + '" src="' + esc(P.base + x.src) + '" alt="" aria-hidden="true"' + (x.w ? ' style="--w:' + (+x.w || 0) + "px;--wn:" + (+x.w || 0) + '"' : "") + (eager ? "" : ' loading="lazy"') + ' decoding="async">'; }).join("");
  }
  function img(src, alt, cls, eager) { return src ? '<img class="' + (cls || "") + '" src="' + esc(src) + '" alt="' + esc(alt || "") + '" ' + (eager ? 'fetchpriority="high"' : 'loading="lazy"') + ' decoding="async">' : ""; }
  function calUrl(e, vm) {
    if (!e.at) return "";
    var f = function (x) { return x.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, ""); };
    var end = e.until && e.until > e.at ? e.until : new Date(e.at.getTime() + 2 * 3600e3);
    return "https://calendar.google.com/calendar/render?action=TEMPLATE&text=" + encodeURIComponent(e.name + " " + vm.displayNames) + "&dates=" + f(e.at) + "/" + f(end) +
      "&location=" + encodeURIComponent([e.venue, e.address].filter(Boolean).join(", ")) + "&details=" + encodeURIComponent("Undangan " + vm.displayNames + (vm.slug && vm.mode === "live" ? " — " + location.origin + "/" + vm.slug : ""));
  }
  var I = {
    map: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.6"/></svg>',
    cal: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>',
    clock: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>',
    copy: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8.5" y="8.5" width="11" height="11" rx="2"/><path d="M15.5 8.5V6a1.5 1.5 0 0 0-1.5-1.5H6A1.5 1.5 0 0 0 4.5 6v8A1.5 1.5 0 0 0 6 15.5h2.5"/></svg>',
    check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
    ig: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.2" cy="6.8" r=".9" fill="currentColor"/></svg>',
    mail: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5.5" width="18" height="13" rx="2"/><path d="M3.5 7l8.5 6 8.5-6"/></svg>',
    gift: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="9" width="17" height="11.5" rx="1.5"/><path d="M2.5 9h19v-2.5h-19zM12 6.5v14M12 6.5C10 2.5 6 3.5 7.5 6.5M12 6.5c2-4 6-3 4.5 0"/></svg>',
    home: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 11 12 4l8 7v8.5a1 1 0 0 1-1 1h-4.5V15h-5v5.5H5a1 1 0 0 1-1-1z"/></svg>',
    heart: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.2a4.3 4.3 0 0 1 7.5 2.6C19.5 15.4 12 20 12 20z"/></svg>',
    users: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8.5" r="3.5"/><path d="M2.5 20c.5-3.6 3.2-5.5 6.5-5.5s6 1.9 6.5 5.5"/><circle cx="17" cy="9" r="2.6"/><path d="M16.5 14.6c2.6.1 4.5 1.7 5 4.4"/></svg>',
    photo: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="4.5" width="17" height="15" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M4 18l5-5 4 4 3-3 4 4"/></svg>',
    book: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4.5h11.5a2 2 0 0 1 2 2V20H7a2 2 0 0 1-2-2zM5 18a2 2 0 0 1 2-2h11.5"/></svg>',
    chat: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5.5h14a1.5 1.5 0 0 1 1.5 1.5v8.5A1.5 1.5 0 0 1 19 17h-8l-4.5 3.5V17H5a1.5 1.5 0 0 1-1.5-1.5V7A1.5 1.5 0 0 1 5 5.5z"/></svg>',
    flower: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="2.4"/><path d="M12 9.6C10 5 14 5 12 9.6zM14.4 12c4.6-2 4.6 2 0 0zM12 14.4c2 4.6-2 4.6 0 0zM9.6 12C5 14 5 10 9.6 12z"/></svg>',
    play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l10.5-6.5z"/></svg>',
    pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13M16 5.5v13"/></svg>',
    note: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18V6l10-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="16" r="2.5"/></svg>',
    scroll: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v15M6.5 13.5 12 19l5.5-5.5"/></svg>',
    x: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>',
    l: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>',
    r: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>'
  };

  /* ---------- bagian-bagian ---------- */
  function head(eyebrow, title, rv) { return '<header class="sh">' + (has("heading") ? '<div class="gable" data-rv="zoom">' + art("heading") + "</div>" : "") + '<p class="eb" data-rv="fade">' + esc(eyebrow) + '</p><h2 class="st" data-rv="' + (rv || "up") + '">' + esc(title) + '</h2><div class="dv" data-rv="draw">' + div() + "</div></header>"; }

  function cover(vm, guest) {
    var e = vm.events[0] || {};
    return '<div class="cover" id="cover" role="dialog" aria-modal="true" aria-label="Sampul undangan">' +
      '<div class="gate l"></div><div class="gate r"></div><div class="cv-petals" aria-hidden="true"></div>' +
      '<div class="cv-frame' + (has("coverGround") ? " gnd" : "") + '"><span class="tp t"></span><span class="tp b"></span>' +
      art("coverCorner", "cv-sl l", 1, 0) + art("coverCorner", "cv-sl r", 1, 0) + art("coverHang", "cv-lt l", 1, 0) + art("coverHang", "cv-lt r", 1, 0) +
      (has("coverGround") ? '<div class="cv-ground">' + art("coverGround", "cv-gi", 1) + "</div>" : "") +
      (has("coverCorner") ? "" : ["tl", "tr", "bl", "br"].map(function (k) { return '<i class="co ' + k + '">' + O(P.ornament.corner) + "</i>"; }).join("")) +
      '<div class="cv-in">' +
      (vm.cover && P.cover.photo !== false ? '<div class="cv-arch">' + ring() + img(vm.cover, "Foto " + vm.displayNames, "", true) + "</div>" : has("coverGround") ? "" : '<div class="cv-bloom">' + O("bloom") + "</div>") +
      '<p class="cv-eb">' + esc(vm.isCouple ? tx("coverEyebrow", "The Wedding of") : tx("coverEyebrowEvent", "Undangan")) + '</p><h1 class="cv-nm" id="cv-nm">' + esc(vm.displayNames) + "</h1>" +
      (e.at ? '<p class="cv-dt">' + esc(dotDate(e.at, e.tz)) + "</p>" : "") +
      '<div class="cv-to"><span>' + esc(tx("guestTo", "Kepada Yth.")) + "</span><span>" + esc(tx("guestSalute", "Bapak/Ibu/Saudara/i")) + "</span><b>" + esc(guest || tx("guestDefault", "Tamu Undangan")) + "</b></div>" +
      '<button class="btn-open" type="button" id="open-btn">' + I.mail + "<span>" + esc(tx("openButton", "Buka Undangan")) + "</span></button>" +
      (vm.mode !== "live" ? '<p class="cv-mode">' + (vm.mode === "demo" ? "Mode demo &middot; data contoh" : "Mode pratinjau &middot; belum dipublikasikan") + "</p>" : "") +
      "</div></div></div>";
  }

  function hero(vm) {
    var e = vm.events[0] || {};
    return '<section class="hero" id="beranda" data-nav="Beranda" data-ico="home">' +
      '<div class="hero-bg" data-px="0.18">' + bgImg(vm, true, true) + "</div><div class=\"hero-sh\"></div>" +
      '<div class="hero-in"><p class="eb lt" data-rv="down" style="--dl:200ms">' + esc(vm.isCouple ? tx("coverEyebrow", "The Wedding of") : tx("coverEyebrowEvent", "Undangan")) + '</p><h1 class="hero-nm" id="hero-nm">' + esc(vm.displayNames) + "</h1>" +
      '<div class="dv lt" data-rv="draw" style="--dl:900ms">' + div() + "</div>" +
      (e.at ? '<p class="hero-dt" data-rv="up" style="--dl:1100ms">' + esc(fdate(e.at, e.tz)) + "</p>" : "") +
      (vm.features.countdown && vm.target ? '<div class="cd mini" data-rv="up" style="--dl:1300ms" data-cd></div>' : "") +
      '<a class="scrl" href="#main-start" data-rv="fade" style="--dl:1600ms" aria-label="Gulir ke bawah">' + I.scroll + "</a></div></section>";
  }

  function salam(vm) {
    if (!vm.welcome && !vm.quote.text) return "";
    return '<section class="sec paper" id="salam" data-nav="Salam" data-ico="flower"><div class="wrap">' +
      art("introCorners", "sec-tr", 0, 0) + art("introCorners", "sec-bl", 0, 1) +
      (has("introTop") ? '<div class="ulos-dec" data-rv="zoom">' + art("introTop") + "</div>" : '<div class="bloom-dec" data-px="0.08" aria-hidden="true">' + O("bloom") + "</div>") +
      (vm.quote.text ? '<blockquote class="qt" data-rv="zoom"><p>' + nl(vm.quote.text) + "</p>" + (vm.quote.source ? "<cite>" + esc(vm.quote.source) + "</cite>" : "") + "</blockquote>" : "") +
      (vm.quote.text && vm.welcome ? '<div class="dv" data-rv="draw">' + div() + "</div>" : "") +
      (vm.welcome ? '<p class="lead" data-rv="up">' + nl(vm.welcome) + "</p>" : "") + "</div></section>";
  }

  function couple(vm) {
    var ps = vm.people.filter(function (p) { return p.nick; }); if (!ps.length) return "";
    return '<section class="sec" id="mempelai" data-nav="' + (vm.isCouple ? "Mempelai" : "Profil") + '" data-ico="heart"><div class="wrap">' + head(vm.isCouple ? tx("coupleEyebrow", "Kami yang berbahagia") : tx("profileEyebrow", "Yang berbahagia"), vm.isCouple ? tx("coupleTitle", "Mempelai") : tx("profileTitle", "Profil")) +
      '<div class="cpl">' + ps.map(function (p, i) {
        var side = i % 2 ? "right" : "left";
        return (i ? '<div class="amp" data-rv="zoom" aria-hidden="true">&amp;</div>' : "") +
          '<article class="ps" data-stagger="120"><div class="pf" data-rv="' + side + '">' + ring() +
          (p.photo ? img(p.photo, "Foto " + p.full) : has(p.sex === "m" ? "figureGroom" : "figureBride") ? '<span class="pf-ph fig">' + art(p.sex === "m" ? "figureGroom" : "figureBride") + "</span>" : '<span class="pf-ph">' + esc(initials(p.nick)) + "</span>") + "</div>" +
          (p.role ? '<p class="role" data-rv="up">' + esc(p.role) + "</p>" : "") + '<h3 class="pn" data-rv="up">' + esc(p.full) + "</h3>" +
          (p.parents ? '<p class="pp" data-rv="up">' + nl(p.parents) + "</p>" : "") +
          (p.ig ? '<a class="chip" data-rv="up" href="https://instagram.com/' + esc(p.ig) + '" target="_blank" rel="noopener">' + I.ig + "<span>@" + esc(p.ig) + "</span></a>" : "") + "</article>";
      }).join("") + "</div></div></section>";
  }

  function countdown(vm) {
    if (!vm.features.countdown || !vm.target) return "";
    var e = vm.events[0];
    return '<section class="sec deep" id="hitung" data-nav="Hitung" data-ico="clock"><div class="pat" data-px="0.1"></div><div class="wrap">' + head(tx("countdownEyebrow", vm.isCouple ? "Menuju hari bahagia" : "Menuju hari istimewa"), tx("countdownTitle", "Save the Date")) +
      '<div class="cd" data-cd data-rv="up"></div>' +
      (has("countdownRow") ? '<div class="jb-row" aria-hidden="true">' + art("countdownRow") + "</div>" : "") +
      (e && e.at ? '<p class="cd-dt" data-rv="up">' + esc(fdate(e.at, e.tz)) + "</p>" + '<a class="btn ghost" data-rv="up" target="_blank" rel="noopener" href="' + esc(calUrl(e, vm)) + '">' + I.cal + "<span>Simpan ke Kalender</span></a>" : "") +
      "</div></section>";
  }

  function events(vm) {
    if (!vm.events.length) return "";
    return '<section class="sec paper" id="acara" data-nav="Acara" data-ico="cal"><div class="wrap">' + head(tx("eventsEyebrow", "Waktu & tempat"), tx("eventsTitle", "Rangkaian Acara")) +
      '<div class="evs" data-stagger="140">' + vm.events.map(function (e, i) {
        var t = e.start ? e.start.replace(":", ".") + (e.end ? " – " + e.end.replace(":", ".") : " – selesai") + " " + e.tz : "";
        return '<article class="ev" data-rv="' + (i % 2 ? "right" : "left") + '">' + (has("eventBadge") ? art("eventBadge", "ev-lt") : P.ornament.corner !== "none" ? '<span class="ev-co" aria-hidden="true">' + O(P.ornament.corner) + "</span>" : "") +
          "<h3>" + esc(e.name || "Acara") + "</h3>" +
          (e.at ? '<div class="ev-date"><b>' + esc(fmt(e.at, e.tz, { day: "2-digit" })) + "</b><span>" + esc(fmt(e.at, e.tz, { weekday: "long" })) + "<br>" + esc(fmt(e.at, e.tz, { month: "long", year: "numeric" })) + "</span></div>" : "") +
          (t ? '<p class="ev-l">' + I.clock + "<span>" + esc(t) + "</span></p>" : "") +
          (e.venue || e.address ? '<p class="ev-l">' + I.map + "<span><b>" + esc(e.venue) + "</b>" + (e.address ? "<br>" + nl(e.address) : "") + "</span></p>" : "") +
          '<div class="ev-a">' + (e.maps ? '<a class="btn" target="_blank" rel="noopener" href="' + esc(e.maps) + '">' + I.map + "<span>Google Maps</span></a>" : "") +
          (e.at ? '<a class="btn ghost" target="_blank" rel="noopener" href="' + esc(calUrl(e, vm)) + '">' + I.cal + "<span>Kalender</span></a>" : "") + "</div></article>";
      }).join("") + "</div></div></section>";
  }

  function story(vm) {
    if (!vm.features.story) return "";
    return '<section class="sec" id="kisah" data-nav="Kisah" data-ico="book"><div class="wrap">' + head(tx("storyEyebrow", vm.isCouple ? "Perjalanan kami" : "Momen berharga"), tx("storyTitle", vm.isCouple ? "Love Story" : "Cerita Kami")) +
      art("storyTop", "st-kf") + '<ol class="tml"><span class="tl-line" aria-hidden="true"><i></i></span>' + vm.story.map(function (s, i) {
        return '<li class="tl-i ' + (i % 2 ? "r" : "l") + '"><span class="tl-dot" data-rv="zoom" aria-hidden="true">' + I.heart + '</span><div class="tl-c" data-rv="' + (i % 2 ? "right" : "left") + '">' +
          (s.photo ? '<div class="tl-ph">' + img(s.photo, s.title) + "</div>" : "") + (s.date ? '<p class="tl-d">' + esc(s.date) + "</p>" : "") +
          (s.title ? "<h3>" + esc(s.title) + "</h3>" : "") + (s.text ? "<p>" + nl(s.text) + "</p>" : "") + "</div></li>";
      }).join("") + "</ol></div></section>";
  }

  function gallery(vm) {
    if (!vm.gallery.length) return "";
    return '<section class="sec paper" id="galeri" data-nav="Galeri" data-ico="photo"><div class="wrap wide">' + head(tx("galleryEyebrow", "Momen berharga"), tx("galleryTitle", "Galeri")) +
      '<div class="gl" data-stagger="70">' + vm.gallery.map(function (u, i) {
        return '<button type="button" class="gi g' + (i % 6) + '" data-rv="zoom" data-lb="' + i + '" aria-label="Lihat foto ' + (i + 1) + ' dari ' + vm.gallery.length + '">' + img(u, "Foto galeri " + (i + 1)) + "</button>";
      }).join("") + "</div></div></section>";
  }

  function rsvp(vm, guest) {
    if (!vm.features.rsvp) return "";
    return '<section class="sec deep" id="rsvp" data-nav="RSVP" data-ico="users"><div class="pat" data-px="0.1"></div><div class="wrap">' + head(tx("rsvpEyebrow", "Konfirmasi kehadiran"), tx("rsvpTitle", "RSVP")) +
      art("rsvpHang", "rs-lt l", 0, 0) + art("rsvpHang", "rs-lt r", 0, 0) + '<p class="lead lt" data-rv="up">' + nl(tx("rsvpLead", "Mohon bantu kami mempersiapkan acara dengan mengonfirmasi kehadiran Anda.")) + "</p>" +
      '<div class="card form" data-rv="up" id="rsvp-box"><form id="rsvp-f" novalidate>' +
      '<label class="fl"><span>Nama</span><input name="name" maxlength="60" autocomplete="name" required value="' + esc(guest) + '" placeholder="Nama Anda"></label>' +
      '<fieldset class="att"><legend>Kehadiran</legend>' + [["hadir", "Hadir", I.check], ["tidak", "Tidak hadir", I.x], ["ragu", "Masih ragu", I.clock]].map(function (a, i) {
        return '<label class="opt"><input type="radio" name="attendance" value="' + a[0] + '"' + (i === 0 ? " checked" : "") + "><span>" + a[2] + "<b>" + a[1] + "</b></span></label>";
      }).join("") + "</fieldset>" +
      '<div class="fl pax" id="pax-w"><span id="pax-l">Jumlah tamu</span><div class="step" role="group" aria-labelledby="pax-l"><button type="button" data-st="-1" aria-label="Kurangi">&minus;</button><output id="pax" aria-live="polite">1</output><button type="button" data-st="1" aria-label="Tambah">+</button></div></div>' +
      '<label class="fl"><span>Catatan <small>(opsional)</small></span><textarea name="note" rows="2" maxlength="300" placeholder="Mis. datang bersama keluarga"></textarea></label>' +
      '<p class="err" id="rsvp-e" role="alert"></p><button class="btn full" type="submit">' + I.check + "<span>Kirim Konfirmasi</span></button></form></div></div></section>";
  }

  function gift(vm) {
    if (!vm.features.gift) return "";
    return '<section class="sec paper" id="hadiah" data-nav="Hadiah" data-ico="gift"><div class="wrap">' + head(tx("giftEyebrow", "Tanda kasih"), tx("giftTitle", vm.isCouple ? "Wedding Gift" : "Kado")) +
      (has("giftTop") ? '<div class="gf-amp" data-rv="zoom">' + art("giftTop") + "</div>" : "") + '<p class="lead" data-rv="up">' + nl(tx("giftLead", "Doa restu Anda adalah karunia terindah bagi kami. Bila ingin memberi tanda kasih, dapat melalui:")) + "</p>" +
      '<div class="acc" data-stagger="130">' + vm.accounts.map(function (a) {
        return '<div class="bc ' + a.type + '" data-rv="up"><div class="bc-t"><b>' + esc(a.bank || (a.type === "ewallet" ? "E-Wallet" : "Bank")) + '</b><span class="chipc" aria-hidden="true"></span></div>' +
          '<p class="bc-n">' + esc(a.number.replace(/(\d{4})(?=\d)/g, "$1 ")) + '</p><p class="bc-h">a.n. ' + esc(a.holder) + "</p>" +
          '<button type="button" class="btn sm" data-copy="' + esc(a.number) + '">' + I.copy + '<span class="lb">Salin nomor</span></button></div>';
      }).join("") + "</div>" +
      (vm.giftAddress ? '<div class="card addr" data-rv="up">' + I.gift + "<div><b>Kirim kado</b><p>" + nl(vm.giftAddress) + '</p></div><button type="button" class="btn sm ghost" data-copy="' + esc(vm.giftAddress) + '">' + I.copy + '<span class="lb">Salin alamat</span></button></div>' : "") +
      "</div></section>";
  }

  function wishes(vm, guest) {
    if (!vm.features.wishes) return "";
    return '<section class="sec" id="ucapan" data-nav="Ucapan" data-ico="chat"><div class="wrap">' + head(tx("wishesEyebrow", "Doa & harapan"), tx("wishesTitle", "Ucapan Tamu")) + (has("wishesTop") ? '<div class="ws-bk" data-rv="zoom">' + art("wishesTop") + "</div>" : "") +
      '<div class="card form" data-rv="up"><form id="wish-f" novalidate>' +
      '<label class="fl"><span>Nama</span><input name="name" maxlength="60" required value="' + esc(guest) + '" placeholder="Nama Anda"></label>' +
      '<label class="fl"><span>Ucapan &amp; doa</span><textarea name="message" rows="3" maxlength="500" required placeholder="Tulis ucapan terbaik Anda..."></textarea><small class="cnt"><i id="wcnt">0</i>/500</small></label>' +
      '<label class="hp" aria-hidden="true">Website<input name="website" tabindex="-1" autocomplete="off"></label>' +
      '<p class="err" id="wish-e" role="alert"></p><button class="btn full" type="submit">' + I.chat + "<span>Kirim Ucapan</span></button></form></div>" +
      '<p class="wcount" id="wtot" aria-live="polite"></p><ul class="wl" id="wl" aria-live="polite"></ul><button type="button" class="btn ghost more" id="wmore" hidden>Muat lebih banyak</button></div></section>';
  }

  function closing(vm) {
    return '<section class="sec deep end" id="terima-kasih" data-nav="Terima kasih" data-ico="flower">' +
      (vm.cover || TH.backdrop(P) ? '<div class="end-bg" data-px="0.12">' + bgImg(vm) + "</div>" : "") + '<div class="pat"></div><div class="wrap">' +
      (has("closingScene") ? '<div class="end-art" data-rv="up">' + art("closingScene", "eg") + '<div class="cp">' + art("closingFigures") + "</div></div>" : '<div class="bloom-dec lt" data-rv="zoom" aria-hidden="true">' + O("bloom") + "</div>") +
      '<p class="lead lt" data-rv="up">' + nl(vm.closing || tx("closingText", vm.isCouple ? "Merupakan suatu kehormatan dan kebahagiaan bagi kami apabila Bapak/Ibu/Saudara/i berkenan hadir dan memberikan doa restu." : "Terima kasih atas doa dan kehadiran Bapak/Ibu/Saudara/i di hari istimewa ini.")) + "</p>" +
      '<p class="eb lt" data-rv="fade">' + esc(tx("closingEyebrow", "Kami yang berbahagia")) + '</p><h2 class="end-nm" data-rv="zoom">' + esc(vm.displayNames) + "</h2>" +
      '<div class="dv lt" data-rv="draw">' + div() + '</div><p class="brand" data-rv="fade">Undangan digital oleh <a href="/" target="_blank" rel="noopener">NusaMora</a></p></div></section>';
  }

  /* ---------- interaksi ---------- */
  function startCountdown(vm) {
    var boxes = $$("[data-cd]"); if (!boxes.length) return;
    var U = [["d", "Hari", 864e5], ["h", "Jam", 36e5], ["m", "Menit", 6e4], ["s", "Detik", 1e3]];
    boxes.forEach(function (b) { b.innerHTML = U.map(function (u) { return '<div class="cu"><b data-u="' + u[0] + '">00</b><span>' + u[1] + "</span></div>"; }).join(""); });
    var prev = {};
    function tick() {
      var diff = vm.target - Date.now();
      if (diff <= 0) { boxes.forEach(function (b) { b.classList.add("done"); b.innerHTML = '<p class="cd-ok">' + (diff > -864e5 ? "Hari bahagia telah tiba" : "Terima kasih atas doa dan kehadiran Anda") + "</p>"; }); return; }
      var rest = diff, val = {};
      U.forEach(function (u) { val[u[0]] = Math.floor(rest / u[2]); rest -= val[u[0]] * u[2]; });
      U.forEach(function (u) {
        var v = String(val[u[0]]).padStart(2, "0"); if (prev[u[0]] === v) return; prev[u[0]] = v;
        $$('[data-u="' + u[0] + '"]').forEach(function (el) { el.textContent = v; el.classList.remove("tick"); void el.offsetWidth; el.classList.add("tick"); });
      });
      setTimeout(tick, 1000 - (Date.now() % 1000));
    }
    tick();
  }

  function lightbox(list) {
    if (!list.length) return;
    var lb = d.createElement("div"); lb.className = "lbx"; lb.setAttribute("role", "dialog"); lb.setAttribute("aria-modal", "true"); lb.setAttribute("aria-label", "Galeri foto"); lb.hidden = true;
    lb.innerHTML = '<button class="lbx-x" type="button" aria-label="Tutup">' + I.x + '</button><button class="lbx-n p" type="button" aria-label="Foto sebelumnya">' + I.l + '</button><figure><img alt=""><figcaption></figcaption></figure><button class="lbx-n n" type="button" aria-label="Foto berikutnya">' + I.r + "</button>";
    d.body.appendChild(lb);
    var im = $("img", lb), cap = $("figcaption", lb), cur = 0, lastFocus = null, sx = 0;
    function show(i, dir) {
      cur = (i + list.length) % list.length; im.classList.remove("sl", "sr"); void im.offsetWidth; if (dir) im.classList.add(dir > 0 ? "sl" : "sr");
      im.src = list[cur]; im.alt = "Foto " + (cur + 1); cap.textContent = (cur + 1) + " / " + list.length;
      [cur + 1, cur - 1].forEach(function (k) { var p = new Image(); p.src = list[(k + list.length) % list.length]; });
    }
    function open(i) { lastFocus = d.activeElement; lb.hidden = false; requestAnimationFrame(function () { lb.classList.add("on"); }); show(i); d.body.classList.add("noscroll"); $(".lbx-x", lb).focus(); }
    function close() { lb.classList.remove("on"); d.body.classList.remove("noscroll"); setTimeout(function () { lb.hidden = true; }, 280); if (lastFocus) lastFocus.focus(); }
    d.addEventListener("click", function (e) { var b = e.target.closest("[data-lb]"); if (b) open(+b.getAttribute("data-lb")); });
    $(".lbx-x", lb).onclick = close; $(".p", lb).onclick = function () { show(cur - 1, -1); }; $(".n", lb).onclick = function () { show(cur + 1, 1); };
    lb.addEventListener("click", function (e) { if (e.target === lb || e.target.tagName === "FIGURE") close(); });
    d.addEventListener("keydown", function (e) {
      if (lb.hidden) return;
      if (e.key === "Escape") close(); else if (e.key === "ArrowRight") show(cur + 1, 1); else if (e.key === "ArrowLeft") show(cur - 1, -1);
      else if (e.key === "Tab") { var f = $$("button", lb), a = f.indexOf(d.activeElement); if (e.shiftKey && a <= 0) { e.preventDefault(); f[f.length - 1].focus(); } else if (!e.shiftKey && a === f.length - 1) { e.preventDefault(); f[0].focus(); } }
    });
    lb.addEventListener("touchstart", function (e) { sx = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener("touchend", function (e) { var dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 45) show(cur + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1); }, { passive: true });
  }

  var ERRS = { nama_wajib: "Nama wajib diisi.", isi_wajib: "Nama dan ucapan wajib diisi.", duplikat: "Ucapan yang sama sudah terkirim.", terlalu_cepat: "Tunggu sebentar sebelum mengirim lagi.", fitur_nonaktif: "Fitur ini dinonaktifkan oleh pemilik undangan.", tidak_tersedia: "Undangan sudah tidak aktif.", batas_tercapai: "Batas data untuk undangan ini telah tercapai." };
  function errMsg(e) { var m = (e && (e.error || e.message)) || ""; return ERRS[m] || (/fetch|network|Failed/i.test(m) ? "Tidak bisa terhubung. Periksa koneksi internet Anda." : "Terjadi kendala. Coba lagi."); }

  var rsvpForm = "";
  function bindRsvp(vm, again, init) {
    var f = $("#rsvp-f"); if (!f) return;
    if (!rsvpForm) rsvpForm = $("#rsvp-box").innerHTML;
    var key = "nm:rsvp:" + vm.slug, pax = init && init.pax > 0 ? init.pax : 1, out = $("#pax"), wrap = $("#pax-w");
    if (init && init.pax > 0) out.textContent = pax;
    function syncPax() { var a = f.attendance.value; wrap.classList.toggle("off", a === "tidak"); }
    f.addEventListener("change", syncPax);
    wrap.addEventListener("click", function (e) { var b = e.target.closest("[data-st]"); if (!b) return; pax = Math.max(1, Math.min(10, pax + +b.getAttribute("data-st"))); out.textContent = pax; out.classList.remove("tick"); void out.offsetWidth; out.classList.add("tick"); });
    function done(r, name) {
      var lbl = { hadir: "Terima kasih, kami menantikan kehadiran Anda", tidak: "Terima kasih atas konfirmasinya", ragu: "Terima kasih, kabari kami bila sudah pasti" }[r.attendance] || "Terima kasih";
      $("#rsvp-box").innerHTML = '<div class="ok-box"><span class="ok-ic">' + I.check + "</span><h3>" + esc(lbl) + "</h3><p>" + esc(name) + (r.attendance === "tidak" ? " &middot; tidak hadir" : r.attendance === "ragu" ? " &middot; masih ragu" : " &middot; " + r.pax + " orang") + "</p>" + (vm.mode !== "live" ? '<p class="fine">Mode ' + (vm.mode === "demo" ? "demo" : "pratinjau") + ": jawaban tidak disimpan.</p>" : "") + '<button type="button" class="btn ghost sm" id="rsvp-re">Ubah jawaban</button></div>';
      $("#rsvp-re").onclick = function () {
        $("#rsvp-box").innerHTML = rsvpForm; bindRsvp(vm, true, r);
        var nf = $("#rsvp-f"); nf.name.value = name; if (r.note) nf.note.value = r.note; var r0 = nf.querySelector('input[name=attendance][value="' + r.attendance + '"]'); if (r0) r0.checked = true;
        nf.dispatchEvent(new Event("change")); nf.name.focus();
      };
    }
    var saved = vm.mode === "live" && !again ? store(key) : null; if (saved && saved.attendance) { done(saved, saved.name); return; }
    f.addEventListener("submit", function (e) {
      e.preventDefault(); var er = $("#rsvp-e"), name = f.name.value.trim(), att = f.attendance.value, btn = $("button[type=submit]", f);
      er.textContent = ""; if (!name) { er.textContent = ERRS.nama_wajib; f.name.focus(); return; }
      btn.disabled = true; btn.classList.add("busy");
      D.sendRsvp(vm, { name: name, attendance: att, pax: att === "tidak" ? 0 : pax, note: f.note.value.trim() }).then(function (r) {
        btn.disabled = false; btn.classList.remove("busy");
        if (!r || r.ok === false) { er.textContent = errMsg(r); return; }
        var res = { attendance: att, pax: att === "tidak" ? 0 : pax, name: name, note: f.note.value.trim() }; if (vm.mode === "live") store(key, res); done(res, name);
      }, function (x) { btn.disabled = false; btn.classList.remove("busy"); er.textContent = errMsg(x); });
    });
    syncPax();
  }

  function bindWishes(vm) {
    var f = $("#wish-f"); if (!f) return;
    var list = $("#wl"), more = $("#wmore"), tot = $("#wtot"), last = null, total = 0;
    var BADGE = { hadir: "Hadir", tidak: "Tidak hadir", ragu: "Ragu" };
    function item(x, fresh) { return '<li class="wi' + (fresh ? " fresh" : "") + '"><span class="av" aria-hidden="true">' + esc(initials(x.name)) + '</span><div><p class="wn"><b>' + esc(x.name) + "</b>" + (x.attendance ? '<em class="bd ' + esc(x.attendance) + '">' + BADGE[x.attendance] + "</em>" : "") + "</p><p>" + nl(x.message) + '</p><time datetime="' + esc(x.created_at) + '">' + esc(ago(x.created_at)) + "</time></div></li>"; }
    function setTot() { tot.textContent = total ? total + " ucapan" : "Jadilah yang pertama memberi ucapan."; }
    function load() {
      more.disabled = true;
      D.wishes(vm, last).then(function (r) {
        more.disabled = false; if (!r || r.error) { tot.textContent = ""; return; }
        total = r.total || 0; setTot(); var it = r.items || [];
        list.insertAdjacentHTML("beforeend", it.map(function (x) { return item(x); }).join(""));
        if (it.length) last = it[it.length - 1].created_at; more.hidden = vm.mode !== "live" || list.children.length >= total || !it.length;
      }, function () { more.disabled = false; tot.textContent = "Ucapan belum dapat dimuat."; });
    }
    var cnt = $("#wcnt"); f.message.addEventListener("input", function () { cnt.textContent = f.message.value.length; });
    f.addEventListener("submit", function (e) {
      e.preventDefault(); var er = $("#wish-e"), btn = $("button[type=submit]", f), name = f.name.value.trim(), msg = f.message.value.trim();
      er.textContent = ""; if (f.website.value) return; if (!name || !msg) { er.textContent = ERRS.isi_wajib; (name ? f.message : f.name).focus(); return; }
      var att = (store("nm:rsvp:" + vm.slug) || {}).attendance;
      btn.disabled = true; btn.classList.add("busy");
      D.sendWish(vm, { name: name, message: msg, attendance: att }).then(function (r) {
        btn.disabled = false; btn.classList.remove("busy");
        if (!r || r.ok === false) { er.textContent = errMsg(r); return; }
        list.insertAdjacentHTML("afterbegin", item(r.wish, true)); total++; setTot(); f.message.value = ""; cnt.textContent = "0"; toast("Ucapan terkirim. Terima kasih!");
      }, function (x) { btn.disabled = false; btn.classList.remove("busy"); er.textContent = errMsg(x); });
    });
    more.onclick = load; load();
  }

  function dock(root) {
    var secs = $$("section[data-nav]", root); if (secs.length < 2) return;
    var nav = d.createElement("nav"); nav.className = "dock"; nav.setAttribute("aria-label", "Navigasi undangan");
    nav.innerHTML = '<div class="dock-in">' + secs.map(function (s) { return '<a href="#' + s.id + '" data-to="' + s.id + '">' + (I[s.getAttribute("data-ico")] || I.flower) + "<span>" + esc(s.getAttribute("data-nav")) + "</span></a>"; }).join("") + "</div>";
    d.body.appendChild(nav);
    var links = $$("a", nav), inner = $(".dock-in", nav);
    nav.addEventListener("click", function (e) { var a = e.target.closest("a"); if (!a) return; e.preventDefault(); M.scrollToEl(d.getElementById(a.getAttribute("data-to"))); });
    if ("IntersectionObserver" in w) {
      var io = new IntersectionObserver(function (ents) {
        ents.forEach(function (en) {
          if (!en.isIntersecting) return;
          links.forEach(function (l) { var on = l.getAttribute("data-to") === en.target.id; l.classList.toggle("on", on); if (on) { l.setAttribute("aria-current", "true"); var x = l.offsetLeft - inner.clientWidth / 2 + l.clientWidth / 2; inner.scrollTo({ left: x, behavior: M.reduced ? "auto" : "smooth" }); } else l.removeAttribute("aria-current"); });
        });
      }, { rootMargin: "-45% 0px -50% 0px" });
      secs.forEach(function (s) { io.observe(s); });
    }
  }

  function controls(vm) {
    var fab = d.createElement("div"); fab.className = "fab";
    var audio = null;
    if (vm.music.on) {
      audio = new Audio(); audio.src = vm.music.src; audio.loop = true; audio.preload = "none"; audio.volume = 0.7;
      fab.insertAdjacentHTML("beforeend", '<button type="button" class="fb mus" id="mus" aria-pressed="false" aria-label="Putar musik">' + I.note + "</button>");
    }
    fab.insertAdjacentHTML("beforeend", '<button type="button" class="fb" id="auto" data-autoscroll aria-pressed="false" aria-label="Gulir otomatis">' + I.play + "</button>");
    d.body.appendChild(fab);
    var auto = M.autoScroll(function (on) { var b = $("#auto"); b.innerHTML = on ? I.pause : I.play; b.setAttribute("aria-pressed", on); b.setAttribute("aria-label", on ? "Hentikan gulir otomatis" : "Gulir otomatis"); b.classList.toggle("on", on); });
    $("#auto").onclick = function () { auto.toggle(); };
    var wanted = false;
    function setMus(on) { var b = $("#mus"); if (!b) return; b.classList.toggle("on", on); b.setAttribute("aria-pressed", on); b.setAttribute("aria-label", on ? "Jeda musik" : "Putar musik"); }
    function play() { if (!audio) return; wanted = true; var p = audio.play(); if (p && p.then) p.then(function () { setMus(true); }, function () { setMus(false); }); else setMus(true); }
    function pause() { if (!audio) return; wanted = false; audio.pause(); setMus(false); }
    if (audio) {
      $("#mus").onclick = function () { audio.paused ? play() : pause(); };
      d.addEventListener("visibilitychange", function () { if (d.hidden) { if (!audio.paused) { audio.pause(); audio._resume = true; } } else if (audio._resume && wanted) { audio._resume = false; play(); } });
    }
    return { play: play, auto: auto };
  }

  /* ---------- render utama ---------- */
  var SEC = { salam: salam, mempelai: couple, hitung: countdown, acara: events, kisah: story, galeri: gallery, rsvp: rsvp, hadiah: gift, ucapan: wishes };
  /* render(root, vm, pack): pack = hasil NMInvite.theme.load(), sudah diterapkan dengan theme.apply() */
  function render(root, vm, pack) {
    P = pack; var guest = D.guestName();
    var body = P.sections.map(function (k) { return SEC[k](vm, guest); }).join("");
    d.title = (vm.isCouple ? "The Wedding of " : "") + vm.displayNames + " | NusaMora";
    d.body.classList.add("is-locked");
    root.innerHTML =
      '<div class="bgfx" aria-hidden="true"></div>' +
      (P.ornament.corner !== "none" && !has("coverCorner") ? '<div class="corners" aria-hidden="true">' + ["tl", "tr", "bl", "br"].map(function (k) { return '<i class="co ' + k + '">' + O(P.ornament.corner) + "</i>"; }).join("") + "</div>" : "") +
      cover(vm, guest) +
      '<div class="layout"><aside class="side" aria-hidden="true"><div class="side-bg">' + bgImg(vm, true) + '</div><div class="side-in"><p class="eb lt">' + esc(vm.isCouple ? tx("coverEyebrow", "The Wedding of") : tx("coverEyebrowEvent", "Undangan")) + '</p><p class="side-nm">' + esc(vm.displayNames) + '</p><div class="dv lt">' + div() + "</div>" + (vm.events[0] && vm.events[0].at ? '<p class="side-dt">' + esc(fdate(vm.events[0].at, vm.events[0].tz)) + "</p>" : "") + (guest ? '<p class="side-to">Kepada Yth. <b>' + esc(guest) + "</b></p>" : "") + "</div></aside>" +
      '<main class="col" id="main" tabindex="-1">' + hero(vm) + '<span id="main-start"></span>' + body + closing(vm) + "</main></div>" +
      '<div class="tsts" id="tsts" aria-live="polite"></div>';

    M.splitText($("#cv-nm"), 500, 55);
    var petalSvg = (P.ornament.petals || []).map(O).filter(Boolean), pc = +P.ornament.petalCount || 10;
    var cvPetals = petalSvg.length ? M.petals($(".cv-petals"), petalSvg, Math.round(pc * (w.innerWidth < 640 ? 0.9 : 1.4))) : { stop: function () {} };
    requestAnimationFrame(function () { $("#cover").classList.add("ready"); });

    var ctl = null;
    $("#open-btn").addEventListener("click", function () {
      ctl = ctl || controls(vm); ctl.play(); // audio dimulai karena interaksi pengguna
      var cv = $("#cover"); cv.classList.add("opening"); d.body.classList.remove("is-locked"); d.body.classList.add("is-open");
      w.scrollTo(0, 0);
      setTimeout(function () { cv.remove(); cvPetals.stop(); $("#main").focus({ preventScroll: true }); }, M.reduced ? 0 : 1500);
      M.splitText($("#hero-nm"), M.reduced ? 0 : 700, 60);
      $("#hero-nm").classList.add("go");
      M.reveal(); M.parallax(); dock(d); startCountdown(vm);
      var bg = d.createElement("div"); bg.className = "petals"; bg.setAttribute("aria-hidden", "true"); d.body.appendChild(bg); if (petalSvg.length) M.petals(bg, petalSvg, Math.round(pc * (w.innerWidth < 640 ? 0.6 : 1)));
    });
    // timeline: garis tumbuh mengikuti scroll
    var tl = $(".tml");
    if (tl && !M.reduced) { var line = $(".tl-line i", tl); w.addEventListener("scroll", function () { var r = tl.getBoundingClientRect(), p = Math.min(1, Math.max(0, (innerHeight * 0.7 - r.top) / r.height)); line.style.transform = "scaleY(" + p.toFixed(3) + ")"; }, { passive: true }); }
    else if (tl) $(".tl-line i", tl).style.transform = "none";
    d.addEventListener("click", function (e) { var c = e.target.closest("[data-copy]"); if (c) copy(c.getAttribute("data-copy"), c); });
    $$('a[href^="#"]', root).forEach(function (a) { a.addEventListener("click", function (e) { var t = d.getElementById(a.getAttribute("href").slice(1)); if (t) { e.preventDefault(); M.scrollToEl(t); } }); });
    lightbox(vm.gallery); bindRsvp(vm); bindWishes(vm);
  }

  NI.engine = { render: render, sections: Object.keys(SEC) };
})(window, document);
