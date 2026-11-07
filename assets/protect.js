/* NusaMora: pencegahan penyalinan ringan untuk halaman PUBLIK. Ini hanya PENGHALANG UX, bukan perlindungan.
   Browser tidak bisa mencegah inspeksi/unduhan sepenuhnya; perlindungan sebenarnya ada di server (aset berbayar via signed URL,
   bucket tidak bisa didaftar, direktori internal diblokir, tanpa rahasia di frontend). Jangan dipasang di editor/dashboard/form.
   Aktif hanya bila <html data-protect="on|demo">. "demo" menambah watermark pada seluruh halaman (halaman demo/pratinjau).
   Sengaja TIDAK diblokir (aksesibilitas/UX): kolom isian, tautan, teks yang sedang diseleksi, salin teks, cetak, zoom, keyboard navigasi. */
(function () {
  "use strict";
  var d = document, root = d.documentElement, mode = root.getAttribute("data-protect");
  if (mode !== "on" && mode !== "demo") return;
  var FIELD = "input,textarea,select,[contenteditable=''],[contenteditable='true'],[data-allow-copy]";
  var MEDIA = "img,picture,video,canvas,svg image";
  function hit(t, sel) { return !!(t && t.closest && t.closest(sel)); }
  function selecting() { var s = window.getSelection && window.getSelection(); return !!(s && !s.isCollapsed && String(s).trim()); }

  /* 1. klik kanan / menu konteks (juga tombol menu keyboard): diblokir kecuali di kolom isian, tautan, dan teks terseleksi */
  d.addEventListener("contextmenu", function (e) { var t = e.target; if (hit(t, FIELD) || hit(t, "a[href]") || (selecting() && !hit(t, MEDIA))) return; e.preventDefault(); });

  /* 2. pintasan umum: F12, Ctrl/Cmd+U, Ctrl/Cmd+S, Ctrl+Shift+I/J/C, Cmd+Opt+I/J/U */
  d.addEventListener("keydown", function (e) {
    var k = String(e.key || "").toLowerCase(), c = e.ctrlKey || e.metaKey;
    if (k === "f12" || (c && !e.altKey && !e.shiftKey && (k === "u" || k === "s")) || (c && e.shiftKey && (k === "i" || k === "j" || k === "c")) || (e.metaKey && e.altKey && (k === "i" || k === "j" || k === "u" || k === "c"))) { e.preventDefault(); e.stopPropagation(); }
  }, true);

  /* 3. seret-lepas gambar & seleksi gambar */
  d.addEventListener("dragstart", function (e) { if (hit(e.target, MEDIA)) e.preventDefault(); });
  d.addEventListener("selectstart", function (e) { if (hit(e.target, MEDIA)) e.preventDefault(); });
  var st = d.createElement("style");
  st.textContent = "img,picture,video,canvas{-webkit-user-drag:none;user-drag:none;-webkit-touch-callout:none}img,picture,video{-webkit-user-select:none;user-select:none}" +
    ".nm-wm{position:absolute;inset:0;pointer-events:none;z-index:5;background-repeat:repeat;opacity:.55}" +
    ".nm-wm.fixed{position:fixed;z-index:2147483000;opacity:.5}@media print{.nm-wm{display:none!important}}";
  d.head.appendChild(st);

  /* 4. watermark: tile SVG halus, tidak menangkap pointer, disembunyikan dari pembaca layar */
  function tile(text, alpha) {
    var svg = "<svg xmlns='http://www.w3.org/2000/svg' width='260' height='170'><text x='50%' y='50%' text-anchor='middle' transform='rotate(-24 130 85)' font-family='sans-serif' font-size='15' font-weight='700' fill='rgb(106,52,182)' fill-opacity='" + alpha + "'>" + text + "</text></svg>";
    return "url(\"data:image/svg+xml;utf8," + encodeURIComponent(svg) + "\")";
  }
  function mark(host, fixed, alpha) {
    if (!host || (host.querySelector && host.querySelector(":scope > .nm-wm"))) return;
    var w = d.createElement("div"); w.className = "nm-wm" + (fixed ? " fixed" : ""); w.setAttribute("aria-hidden", "true"); w.style.backgroundImage = tile("nusamora.com", alpha);
    if (!fixed) { var cs = getComputedStyle(host); if (cs.position === "static") host.style.position = "relative"; }
    host.appendChild(w);
  }
  function run() {
    if (mode === "demo") mark(d.body, true, ".16");
    (root.getAttribute("data-wm") || "").split(",").map(function (s) { return s.trim(); }).filter(Boolean).forEach(function (sel) {
      Array.prototype.forEach.call(d.querySelectorAll(sel), function (h) { mark(h, false, ".2"); });
    });
  }
  if (d.readyState === "loading") d.addEventListener("DOMContentLoaded", run); else run();
})();
