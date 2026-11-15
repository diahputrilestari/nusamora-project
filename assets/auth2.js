/* Interaksi halaman Masuk & Daftar: tab geser, parallax kartu, carousel keunggulan, ikon mata, meter sandi, tombol Google.
   Logika autentikasi (submit, validasi, Supabase) ada di auth.js. Vanilla JS, tanpa pustaka. */
(function () {
  "use strict";
  var d = document, $ = function (s, r) { return (r || d).querySelector(s); }, $$ = function (s, r) { return [].slice.call((r || d).querySelectorAll(s)); };
  var root = $(".au"); if (!root) return;
  d.documentElement.classList.remove("no-js"); d.documentElement.classList.add("js");
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fine = window.matchMedia && matchMedia("(hover:hover) and (pointer:fine)").matches;

  /* ---------- Tab Masuk / Daftar tanpa muat ulang ---------- */
  var tabs = $$(".au-tabs [role=tab]"), panels = { login: $("#panel-login"), register: $("#panel-register") }, stage = $(".au-stagep");
  var TITLE = { login: "Masuk | NusaMora", register: "Daftar Akun | NusaMora" }, PATH = { login: "/masuk", register: "/daftar" };
  var mode = root.getAttribute("data-mode") || "login";
  function fit() { var p = panels[mode]; if (p && stage) stage.style.height = p.offsetHeight + "px"; }
  function show(m, push, focus) {
    if (!panels[m]) return;
    mode = m; root.setAttribute("data-mode", m);
    Object.keys(panels).forEach(function (k) { var on = k === m; panels[k].classList.toggle("on", on); if (on) panels[k].removeAttribute("inert"); else panels[k].setAttribute("inert", ""); });
    tabs.forEach(function (t) { var on = t.getAttribute("data-mode") === m; t.setAttribute("aria-selected", on ? "true" : "false"); t.tabIndex = on ? 0 : -1; });
    d.title = TITLE[m];
    if (push) { try { history.pushState({ m: m }, "", PATH[m] + location.search); } catch (e) { /* abaikan */ } }
    fit();
    if (focus) { var f = $("input", panels[m]); if (f) setTimeout(function () { try { f.focus({ preventScroll: true }); } catch (e) { f.focus(); } }, reduce ? 0 : 280); }
  }
  tabs.forEach(function (t) {
    t.addEventListener("click", function (e) { if (e.metaKey || e.ctrlKey || e.shiftKey) return; e.preventDefault(); if (t.getAttribute("data-mode") !== mode) show(t.getAttribute("data-mode"), true, true); });
    t.addEventListener("keydown", function (e) {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight" && e.key !== "Home" && e.key !== "End") return;
      e.preventDefault(); var i = tabs.indexOf(t), n = e.key === "Home" ? 0 : e.key === "End" ? tabs.length - 1 : (i + (e.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
      show(tabs[n].getAttribute("data-mode"), true, false); tabs[n].focus();
    });
  });
  $$("[data-switch]").forEach(function (a) { a.addEventListener("click", function (e) { e.preventDefault(); show(a.getAttribute("data-switch"), true, true); }); });
  window.addEventListener("popstate", function () { show(/\/daftar(\.html)?\/?$/.test(location.pathname) ? "register" : "login", false, false); });
  show(mode, false, false);
  if ("ResizeObserver" in window) { var ro = new ResizeObserver(fit); Object.keys(panels).forEach(function (k) { ro.observe(panels[k]); }); }
  window.addEventListener("resize", fit);
  if (d.fonts && d.fonts.ready) d.fonts.ready.then(fit);
  setTimeout(fit, 60);

  /* ---------- Ikon mata (tampil/sembunyi sandi) ---------- */
  $$(".eye").forEach(function (b) {
    b.addEventListener("click", function () {
      var i = d.getElementById(b.getAttribute("data-toggle")), s = i.type === "password"; i.type = s ? "text" : "password";
      b.setAttribute("aria-pressed", s ? "true" : "false"); b.setAttribute("aria-label", s ? "Sembunyikan kata sandi" : "Tampilkan kata sandi");
    });
  });

  /* ---------- Meter kekuatan sandi (Lemah / Cukup / Kuat) ---------- */
  var rp = $("#r-pw"), sm = $(".pm"), smt = $("#pm-t");
  function level(p) {
    if (!p) return 0;
    var mix = p.length >= 8 && /[a-z]/i.test(p) && /\d/.test(p); if (!mix) return 1;
    var s = 2 + (p.length >= 12 ? 1 : 0) + (/[^a-z0-9]/i.test(p) ? 1 : 0); return s >= 3 ? 3 : 2;
  }
  var LBL = ["Minimal 8 karakter, campur huruf dan angka.", "Lemah. Tambahkan panjang, huruf, dan angka.", "Cukup. Tambah simbol atau panjang agar lebih kuat.", "Kuat. Kata sandi Anda sudah baik."];
  if (rp && sm) rp.addEventListener("input", function () { var l = level(rp.value); sm.setAttribute("data-level", l); smt.textContent = LBL[l]; });

  /* ---------- Carousel keunggulan (otomatis, bisa dijeda) ---------- */
  var slides = $$(".au-slides li"), dots = $$(".au-dots button"), cur = 0, timer = null, car = $(".au-car");
  function go(n) {
    cur = (n + slides.length) % slides.length;
    slides.forEach(function (s, i) { s.classList.toggle("on", i === cur); s.setAttribute("aria-hidden", i === cur ? "false" : "true"); });
    dots.forEach(function (b, i) { b.classList.toggle("on", i === cur); if (i === cur) b.setAttribute("aria-current", "true"); else b.removeAttribute("aria-current"); });
  }
  function play() { stop(); if (!reduce && slides.length > 1) timer = setInterval(function () { go(cur + 1); }, 5200); }
  function stop() { if (timer) { clearInterval(timer); timer = null; } }
  dots.forEach(function (b, i) { b.addEventListener("click", function () { go(i); play(); }); });
  if (car) { car.addEventListener("mouseenter", stop); car.addEventListener("mouseleave", play); car.addEventListener("focusin", stop); car.addEventListener("focusout", play); }
  d.addEventListener("visibilitychange", function () { if (d.hidden) stop(); else play(); });
  go(0); play();

  /* ---------- Parallax halus mengikuti kursor ---------- */
  var show_ = $(".au-show"), layers = $$(".au-layer");
  if (show_ && fine && !reduce && layers.length) {
    var tx = 0, ty = 0, cx = 0, cy = 0, raf = 0;
    function tick() {
      cx += (tx - cx) * 0.1; cy += (ty - cy) * 0.1;
      layers.forEach(function (l) { var k = (+l.getAttribute("data-depth") || 10) / 100; l.style.transform = "translate3d(" + (cx * k * -1).toFixed(2) + "px," + (cy * k * -1).toFixed(2) + "px,0)"; });
      raf = (Math.abs(tx - cx) > .05 || Math.abs(ty - cy) > .05) ? requestAnimationFrame(tick) : 0;
    }
    show_.addEventListener("mousemove", function (e) { var r = show_.getBoundingClientRect(); tx = ((e.clientX - r.left) / r.width - .5) * 60; ty = ((e.clientY - r.top) / r.height - .5) * 60; if (!raf) raf = requestAnimationFrame(tick); });
    show_.addEventListener("mouseleave", function () { tx = 0; ty = 0; if (!raf) raf = requestAnimationFrame(tick); });
  }

  /* ---------- Masuk dengan Google: tampil hanya bila penyedia aktif di Supabase ---------- */
  var C = window.NM_CONFIG || {}, gb = $("#au-g"), or = $("#au-or");
  if (gb && C.SUPABASE_URL && C.SUPABASE_ANON_KEY && window.fetch) {
    fetch(C.SUPABASE_URL.replace(/\/$/, "") + "/auth/v1/settings", { headers: { apikey: C.SUPABASE_ANON_KEY } })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (s) { if (s && s.external && s.external.google) { gb.hidden = false; or.hidden = false; fit(); } })
      .catch(function () { /* tanpa Google: tombol tetap tersembunyi */ });
  }
})();
