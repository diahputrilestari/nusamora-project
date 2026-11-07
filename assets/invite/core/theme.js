/* NusaMora Invite 2D — pemuat tema.
   Tema adalah paket data di assets/invite/themes/<id>/theme.json (warna, font, ornamen, ilustrasi, teks, urutan section).
   Engine tidak tahu tema apa pun: menambah tema = menambah folder + baris di themes/index.json. Lihat themes/README.md. */
(function (w, d) {
  "use strict";
  var ROOT = (w.NM_THEME_ROOT || "/assets/invite/themes/").replace(/\/?$/, "/");
  var DEF = {
    colors: { deep: "#4A0D14", deep2: "#6E1823", paper: "#F7EEDC", ink: "#3A2420", muted: "#7A5F55", accent: "#C9A35B", accent2: "#E8CF93", soft: "#EBD9BB", petal: "#EDB9A6" },
    fonts: { script: "Pinyon Script", serif: "Cormorant Garamond", sans: "Jost" },
    ornament: { pattern: "lattice", border: "tumpal", corner: "vine", divider: "diamond", frame: "arch", petals: ["bloom", "leaf"], petalCount: 10 },
    cover: { photo: true, transition: "gate" },
    copy: {}, art: {}, sections: ["salam", "mempelai", "hitung", "acara", "kisah", "galeri", "rsvp", "hadiah", "ucapan"]
  };
  var SECTIONS = DEF.sections.slice();

  /* ---------- pustaka ornamen (dipilih per tema lewat nama) ---------- */
  function enc(svg) { return "url(\"data:image/svg+xml," + encodeURIComponent(svg) + "\")"; }
  var PATTERN = {
    lattice: function (c, o) { return enc('<svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 44 44"><g fill="none" stroke="' + c + '" stroke-opacity="' + o + '" stroke-width="1"><path d="M22 3 41 22 22 41 3 22z"/><path d="M22 12 32 22 22 32 12 22z"/><path d="M22 18v8M18 22h8"/></g><g fill="' + c + '" fill-opacity="' + o + '"><circle cx="0" cy="0" r="1.6"/><circle cx="44" cy="0" r="1.6"/><circle cx="0" cy="44" r="1.6"/><circle cx="44" cy="44" r="1.6"/></g></svg>'); },
    dots: function (c, o) { return enc('<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28"><g fill="' + c + '" fill-opacity="' + o * 1.4 + '"><circle cx="7" cy="7" r="1.3"/><circle cx="21" cy="21" r="1.3"/></g></svg>'); },
    kawung: function (c, o) { return enc('<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"><g fill="none" stroke="' + c + '" stroke-opacity="' + o + '"><ellipse cx="20" cy="10" rx="6" ry="9"/><ellipse cx="20" cy="30" rx="6" ry="9"/><ellipse cx="10" cy="20" rx="9" ry="6"/><ellipse cx="30" cy="20" rx="9" ry="6"/></g><circle cx="20" cy="20" r="1.5" fill="' + c + '" fill-opacity="' + o + '"/></svg>'); },
    none: function () { return "none"; }
  };
  var BORDER = {
    tumpal: function (c) { return enc('<svg xmlns="http://www.w3.org/2000/svg" width="26" height="18" viewBox="0 0 26 18"><path d="M0 18 13 2 26 18z" fill="none" stroke="' + c + '" stroke-width="1.1"/><path d="M7 18 13 10 19 18z" fill="' + c + '" fill-opacity=".55"/><circle cx="13" cy="5.5" r="1.1" fill="' + c + '"/></svg>'); },
    line: function (c) { return enc('<svg xmlns="http://www.w3.org/2000/svg" width="26" height="18" viewBox="0 0 26 18"><path d="M0 9h26" stroke="' + c + '"/><circle cx="13" cy="9" r="1.6" fill="' + c + '"/></svg>'); },
    none: function () { return "none"; }
  };
  var ORN = {
    vine: '<svg viewBox="0 0 200 200" fill="none" stroke="currentColor" stroke-linecap="round" aria-hidden="true">' +
      '<path d="M8 8C70 10 112 34 138 78s54 66 58 70" stroke-width="1.6"/><path d="M8 8C10 70 34 112 78 138s66 54 70 58" stroke-width="1.6"/>' +
      '<path d="M8 8c38 6 64 24 78 54" stroke-width="1" opacity=".7"/><path d="M8 8c6 38 24 64 54 78" stroke-width="1" opacity=".7"/>' +
      '<path d="M104 40c10-14 28-14 34-2-12 6-24 8-34 2z" fill="currentColor" fill-opacity=".35" stroke-width="1"/><path d="M40 104c-14 10-14 28-2 34 6-12 8-24 2-34z" fill="currentColor" fill-opacity=".35" stroke-width="1"/>' +
      '<path d="M148 92c16-4 28 6 26 18-14 0-24-6-26-18z" fill="currentColor" fill-opacity=".25" stroke-width="1"/><path d="M92 148c-4 16 6 28 18 26 0-14-6-24-18-26z" fill="currentColor" fill-opacity=".25" stroke-width="1"/>' +
      '<g transform="translate(46 46)"><circle r="9" stroke-width="1.2"/><circle r="3.4" fill="currentColor"/>' +
      '<path d="M0-9c4-8 12-8 14-2M9 0c8 4 8 12 2 14M0 9c-4 8-12 8-14 2M-9 0c-8-4-8-12-2-14" stroke-width="1.1"/></g>' +
      '<circle cx="186" cy="138" r="2.6" fill="currentColor" stroke="none"/><circle cx="138" cy="186" r="2.6" fill="currentColor" stroke="none"/></svg>',
    diamond: '<svg viewBox="0 0 240 24" fill="none" stroke="currentColor" aria-hidden="true"><path class="ln" d="M4 12h86M150 12h86" stroke-width="1"/>' +
      '<path d="M120 2l10 10-10 10-10-10z" stroke-width="1.2"/><path d="M120 7l5 5-5 5-5-5z" fill="currentColor"/>' +
      '<path d="M96 12c4-6 8-6 12 0-4 6-8 6-12 0zM132 12c4-6 8-6 12 0-4 6-8 6-12 0z" stroke-width="1"/><circle cx="90" cy="12" r="1.6" fill="currentColor"/><circle cx="150" cy="12" r="1.6" fill="currentColor"/></svg>',
    simple: '<svg viewBox="0 0 240 24" fill="none" stroke="currentColor" aria-hidden="true"><path d="M30 12h76M134 12h76" stroke-width="1"/><circle cx="120" cy="12" r="4" fill="currentColor"/><circle cx="112" cy="12" r="1.4" fill="currentColor"/><circle cx="128" cy="12" r="1.4" fill="currentColor"/></svg>',
    bloom: '<svg viewBox="0 0 40 40" aria-hidden="true"><g fill="currentColor"><ellipse cx="20" cy="9" rx="6" ry="9"/><ellipse cx="20" cy="9" rx="6" ry="9" transform="rotate(72 20 20)"/><ellipse cx="20" cy="9" rx="6" ry="9" transform="rotate(144 20 20)"/><ellipse cx="20" cy="9" rx="6" ry="9" transform="rotate(216 20 20)"/><ellipse cx="20" cy="9" rx="6" ry="9" transform="rotate(288 20 20)"/></g><circle cx="20" cy="20" r="4" fill="#fff" fill-opacity=".55"/></svg>',
    leaf: '<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M6 34C6 16 18 6 36 6 36 24 24 34 6 34z" fill="currentColor"/><path d="M8 32 32 9" stroke="#fff" stroke-opacity=".4" fill="none"/></svg>',
    dot: '<svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="12" fill="currentColor"/></svg>',
    heart: '<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M20 35S4 25 4 14a8.5 8.5 0 0 1 16-4 8.5 8.5 0 0 1 16 4c0 11-16 21-16 21z" fill="currentColor"/></svg>',
    arch: '<svg viewBox="0 0 300 380" fill="none" stroke="currentColor" aria-hidden="true" preserveAspectRatio="none"><path d="M10 376V150C10 72 72 10 150 10s140 62 140 140v226" stroke-width="1.4"/><path d="M22 376V152C22 82 80 24 150 24s128 58 128 128v224" stroke-width=".8" opacity=".7"/></svg>'
  };

  /* ---------- registri & pemuatan ---------- */
  var cache = {}, idx = null;
  function getJSON(u) { if (!cache[u]) cache[u] = fetch(u).then(function (r) { if (!r.ok) throw new Error("tema_tidak_ada"); return r.json(); }); return cache[u]; }
  function index() { return idx || (idx = getJSON(ROOT + "index.json").catch(function () { return { default: "marun-songket", aliases: {}, themes: [] }; })); }
  function pickId(ix, want) {
    var ids = (ix.themes || []).map(function (t) { return t.id; });
    for (var i = 0; i < want.length; i++) { var v = want[i]; if (!v) continue; v = (ix.aliases || {})[v] || v; if (ids.indexOf(v) > -1) return v; }
    return ix.default || ids[0];
  }
  function merge(a, b) { var o = {}; Object.keys(a).forEach(function (k) { o[k] = a[k]; }); Object.keys(b || {}).forEach(function (k) { o[k] = b[k] && typeof b[k] === "object" && !Array.isArray(b[k]) && a[k] && typeof a[k] === "object" && !Array.isArray(a[k]) ? merge(a[k], b[k]) : b[k]; }); return o; }
  /* load(["batak", "nusa-essential"]) -> paket tema pertama yang dikenal, jatuh ke tema bawaan */
  function load(want) {
    return index().then(function (ix) {
      var id = pickId(ix, want || []);
      return getJSON(ROOT + id + "/theme.json").then(function (t) { return t; }, function () { return {}; }).then(function (t) {
        var p = merge(DEF, t); p.id = id; p.base = ROOT + id + "/";
        p.sections = (Array.isArray(t.sections) ? t.sections : DEF.sections).filter(function (s) { return SECTIONS.indexOf(s) > -1; });
        return p;
      });
    });
  }

  var FONT_W = { script: ":wght@400", serif: ":ital,wght@0,500;0,600;1,500", sans: ":wght@400;500;600" };
  function famQ(name, axes) { return "family=" + encodeURIComponent(name).replace(/%20/g, "+") + (axes ? ":" + axes : ""); }
  /* fonts.extra: font cadangan untuk aksara lain (mis. Hangul, Arab), [{ "family": "Nanum Myeongjo", "axes": "wght@400;700" }].
     Dimuat bersama dan disisipkan di belakang font utama, jadi huruf Latin tetap memakai font tema. */
  function extras(f) { return (Array.isArray(f.extra) ? f.extra : []).filter(function (x) { return x && /^[A-Za-z0-9 ]{2,40}$/.test(x.family || "") && /^[a-z,@;.0-9]*$/.test(x.axes || ""); }); }
  function stack(main, f, tail) { return ['"' + main + '"'].concat(extras(f).map(function (x) { return '"' + x.family + '"'; })).concat(tail).join(", "); }
  function fonts(f) {
    var fam = Object.keys(FONT_W).filter(function (k) { return f[k]; }).map(function (k) { return famQ(f[k], FONT_W[k].slice(1)); })
      .concat(extras(f).map(function (x) { return famQ(x.family, x.axes); }));
    var href = "https://fonts.googleapis.com/css2?" + fam.join("&") + "&display=swap", l = d.getElementById("nm-fonts");
    if (!l) { l = d.createElement("link"); l.id = "nm-fonts"; l.rel = "stylesheet"; d.head.appendChild(l); }
    if (l.getAttribute("href") !== href) l.setAttribute("href", href);
  }
  /* terapkan paket ke dokumen: warna, font, pola, kelas body */
  function apply(p, root) {
    var s = (root || d.documentElement).style, c = p.colors, o = p.ornament;
    Object.keys(c).forEach(function (k) { if (/^[a-z0-9]+$/i.test(k)) s.setProperty("--" + k, c[k]); });
    BASE = p.base;
    s.setProperty("--script", stack(p.fonts.script, p.fonts, ['"Great Vibes"', "cursive"]));
    s.setProperty("--serif", stack(p.fonts.serif, p.fonts, ["Georgia", "serif"]));
    s.setProperty("--sans", stack(p.fonts.sans, p.fonts, ["system-ui", "-apple-system", '"Segoe UI"', "sans-serif"]));
    /* pola & strip boleh berupa nama dari pustaka bawaan atau file di folder tema (mis. "art/pola.svg") */
    if (isFile(o.pattern)) { s.setProperty("--pattern", fileUrl(o.pattern)); s.setProperty("--pattern-paper", fileUrl(isFile(o.patternPaper) ? o.patternPaper : o.pattern)); }
    else { var pat = PATTERN[o.pattern] || PATTERN.none; s.setProperty("--pattern", pat(c.accent, 0.16)); s.setProperty("--pattern-paper", pat(c.accent, 0.12)); }
    s.setProperty("--tumpal", isFile(o.border) ? fileUrl(o.border) : (BORDER[o.border] || BORDER.none)(c.accent));
    fonts(p.fonts);
    var m = d.querySelector('meta[name="theme-color"]'); if (m) m.setAttribute("content", c.deep);
    var b = d.body; b.className = b.className.replace(/\b(th|cvt)-[\w-]+/g, "").trim();
    b.classList.add("th-" + p.id, "cvt-" + (p.cover.transition || "gate"));
    b.classList.toggle("has-art", Object.keys(p.art || {}).length > 0);
    /* art.backdrop: pemandangan penuh untuk pintu cover (terbelah saat dibuka) serta latar hero/penutup bila foto belum ada */
    var bd = backdrop(p); b.classList.toggle("has-backdrop", !!bd);
    if (bd) { s.setProperty("--backdrop", 'url("' + bd.lg + '")'); s.setProperty("--backdrop-sm", 'url("' + bd.sm + '")'); }
    if (p.css && !d.getElementById("nm-theme-css")) { var l = d.createElement("link"); l.id = "nm-theme-css"; l.rel = "stylesheet"; l.href = p.base + p.css; d.head.appendChild(l); }
    return p;
  }
  /* ornamen menurut nama (pustaka svg bawaan) atau path file di folder tema aktif; kosong bila "none" */
  var BASE = "";
  function isFile(v) { return typeof v === "string" && /^[\w-]+(\/[\w.-]+)*\.(svg|webp|png)$/.test(v) && v.indexOf("..") < 0; }
  function fileUrl(v) { return 'url("' + BASE + v + '")'; }
  function backdrop(p, key) {
    var v = (p.art || {})[key || "backdrop"]; if (typeof v === "string") v = { src: v };
    if (!v || !isFile(v.src)) return null;
    return { lg: p.base + v.src, sm: p.base + (isFile(v.small) ? v.small : v.src), w: +v.width || 1600 };
  }
  function orn(name) { if (isFile(name)) return '<img class="orn" src="' + BASE + name + '" alt="" aria-hidden="true" decoding="async">'; return ORN[name] || ""; }

  w.NMInvite = w.NMInvite || {};
  w.NMInvite.theme = { load: load, apply: apply, index: index, orn: orn, backdrop: backdrop, root: ROOT, sections: SECTIONS };
})(window, document);
