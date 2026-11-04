/* NusaMora Invite — motion engine 2D (tanpa library).
   - reveal: [data-rv] masuk viewport -> kelas .in (arah: up/down/left/right/zoom/fade/blur), stagger lewat [data-stagger]
   - parallax: [data-px="0.2"] digeser berdasarkan scroll (transform saja, rAF)
   - kelopak: partikel bunga ringan (DOM + CSS), berhenti saat tab tersembunyi
   - splitText: animasi per huruf untuk nama
   Semua mati otomatis bila pengguna memilih prefers-reduced-motion. */
(function (w, d) {
  "use strict";
  var mq = w.matchMedia ? w.matchMedia("(prefers-reduced-motion: reduce)") : { matches: false };
  var M = { reduced: mq.matches };

  /* ---------- reveal ---------- */
  var io = null;
  function reveal(root) {
    var els = Array.prototype.slice.call((root || d).querySelectorAll("[data-rv]:not(.in)"));
    // stagger: anak dari [data-stagger] mendapat delay bertahap
    Array.prototype.forEach.call((root || d).querySelectorAll("[data-stagger]"), function (g) {
      var step = parseFloat(g.getAttribute("data-stagger")) || 90, i = 0;
      Array.prototype.forEach.call(g.querySelectorAll(":scope > [data-rv]"), function (c) { if (!c.style.getPropertyValue("--dl")) c.style.setProperty("--dl", (i++ * step) + "ms"); });
    });
    if (M.reduced || !("IntersectionObserver" in w)) { els.forEach(function (e) { e.classList.add("in"); }); return; }
    if (!io) io = new IntersectionObserver(function (ents) {
      ents.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.12 });
    els.forEach(function (e) { io.observe(e); });
  }

  /* ---------- parallax ---------- */
  var pxEls = [], ticking = false;
  function parallax() {
    pxEls = Array.prototype.slice.call(d.querySelectorAll("[data-px]"));
    if (M.reduced || !pxEls.length) return;
    function upd() {
      ticking = false; var vh = w.innerHeight;
      for (var i = 0; i < pxEls.length; i++) {
        var e = pxEls[i], r = e.parentElement.getBoundingClientRect();
        if (r.bottom < -100 || r.top > vh + 100) continue;
        var k = parseFloat(e.getAttribute("data-px")) || 0.15, off = (r.top + r.height / 2 - vh / 2) * -k;
        e.style.transform = "translate3d(0," + off.toFixed(1) + "px,0)";
      }
    }
    w.addEventListener("scroll", function () { if (!ticking) { ticking = true; w.requestAnimationFrame(upd); } }, { passive: true });
    w.addEventListener("resize", upd, { passive: true }); upd();
  }

  /* ---------- kelopak / partikel ---------- */
  function petals(host, svgs, n) {
    if (M.reduced || !host) return { stop: function () {} };
    n = n || (w.innerWidth < 640 ? 9 : 14);
    var frag = d.createDocumentFragment();
    for (var i = 0; i < n; i++) {
      var p = d.createElement("span"); p.className = "pt"; p.innerHTML = svgs[i % svgs.length];
      var s = 8 + Math.random() * 12;
      p.style.cssText = "left:" + (Math.random() * 100).toFixed(1) + "%;width:" + s.toFixed(0) + "px;height:" + s.toFixed(0) + "px;" +
        "--dur:" + (11 + Math.random() * 10).toFixed(1) + "s;--del:-" + (Math.random() * 18).toFixed(1) + "s;--sway:" + (20 + Math.random() * 50).toFixed(0) + "px;--rot:" + (Math.random() > .5 ? 1 : -1) * (180 + Math.random() * 360).toFixed(0) + "deg;opacity:" + (0.35 + Math.random() * 0.5).toFixed(2);
      frag.appendChild(p);
    }
    host.appendChild(frag);
    function vis() { host.classList.toggle("paused", d.hidden); }
    d.addEventListener("visibilitychange", vis);
    return { stop: function () { host.innerHTML = ""; d.removeEventListener("visibilitychange", vis); } };
  }

  /* ---------- teks per huruf ---------- */
  function splitText(el, base, step) {
    var txt = el.textContent; el.textContent = ""; el.setAttribute("aria-label", txt);
    var i = 0;
    txt.split(/(\s+)/).forEach(function (word) {
      if (/^\s+$/.test(word)) { el.appendChild(d.createTextNode(" ")); return; }
      var wd = d.createElement("span"); wd.className = "sw"; wd.setAttribute("aria-hidden", "true");
      Array.prototype.forEach.call(word, function (ch) { var s = d.createElement("span"); s.className = "sc"; s.textContent = ch; s.style.setProperty("--dl", ((base || 0) + i++ * (step || 45)) + "ms"); wd.appendChild(s); });
      el.appendChild(wd);
    });
  }

  /* ---------- scroll halus ke elemen ---------- */
  function scrollToEl(el) { if (!el) return; var y = el.getBoundingClientRect().top + w.pageYOffset - 8; w.scrollTo({ top: y, behavior: M.reduced ? "auto" : "smooth" }); }

  /* ---------- gulir otomatis (dibatalkan saat pengguna menyentuh layar) ---------- */
  function autoScroll(onChange) {
    var on = false, raf = 0, last = 0, speed = 38; // px per detik
    function step(t) { if (!on) return; if (last) w.scrollBy(0, speed * (t - last) / 1000); last = t; if (w.innerHeight + w.pageYOffset >= d.documentElement.scrollHeight - 2) { set(false); return; } raf = w.requestAnimationFrame(step); }
    function set(v) { on = v; last = 0; w.cancelAnimationFrame(raf); if (on) raf = w.requestAnimationFrame(step); onChange && onChange(on); }
    ["wheel", "touchstart", "keydown"].forEach(function (ev) { w.addEventListener(ev, function (e) { if (on && !(e.target && e.target.closest && e.target.closest("[data-autoscroll]"))) set(false); }, { passive: true }); });
    return { toggle: function () { set(!on); }, set: set, get on() { return on; } };
  }

  if (mq.addEventListener) mq.addEventListener("change", function (e) { M.reduced = e.matches; });
  M.reveal = reveal; M.parallax = parallax; M.petals = petals; M.splitText = splitText; M.scrollToEl = scrollToEl; M.autoScroll = autoScroll;
  w.NMInvite = w.NMInvite || {}; w.NMInvite.motion = M;
})(window, document);
