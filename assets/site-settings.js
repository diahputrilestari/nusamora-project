/* NusaMora: pengaturan situs publik (dari Admin > Pengaturan Sistem). Membaca public_settings() lewat REST dan menerapkannya:
   mode pemeliharaan, warna merek, favicon, tautan media sosial, kontak dukungan. Gagal-buka: bila gagal dimuat, halaman tampil normal.
   Penegakan pemeliharaan yang sebenarnya ada di database; skrip ini hanya memberi tahu pengunjung. */
(function () {
  "use strict";
  var d = document, cfg = window.NM_CONFIG || {}, KEY = "nm_pub_settings", TTL = 60000;
  var safeUrl = function (u) { return /^https:\/\/[^\s"'<>]+$/i.test(u || "") ? u : ""; };
  function lum(h) { var c = [1, 3, 5].map(function (i) { var v = parseInt(h.substr(i, 2), 16) / 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; }
  var contrastWhite = function (h) { return 1.05 / (lum(h) + 0.05); };
  function fetchSettings() {
    try { var c = JSON.parse(sessionStorage.getItem(KEY) || "null"); if (c && Date.now() - c.t < TTL) return Promise.resolve(c.v); } catch (e) { /* abaikan */ }
    if (!cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY) return Promise.resolve({});
    var ac = typeof AbortController === "function" ? new AbortController() : null, to = ac && setTimeout(function () { ac.abort(); }, 4000);
    return fetch(cfg.SUPABASE_URL + "/rest/v1/rpc/public_settings", { method: "POST", headers: { apikey: cfg.SUPABASE_ANON_KEY, "Content-Type": "application/json" }, body: "{}", signal: ac ? ac.signal : undefined })
      .then(function (r) { return r.ok ? r.json() : {}; }).then(function (v) { if (to) clearTimeout(to); v = v && typeof v === "object" ? v : {}; try { sessionStorage.setItem(KEY, JSON.stringify({ t: Date.now(), v: v })); } catch (e) { /* abaikan */ } return v; }, function () { return {}; });
  }
  function css() {
    if (d.getElementById("nm-site-css")) return;
    var s = d.createElement("style"); s.id = "nm-site-css";
    s.textContent = ".nm-mt-bar{position:sticky;top:0;z-index:2147483000;background:#fff4d6;color:#4a3600;border-bottom:1px solid #e4c36a;padding:10px 16px;text-align:center;font:600 14px/1.4 system-ui,sans-serif}.nm-mt-ov{position:fixed;inset:0;z-index:2147483001;background:rgba(20,12,36,.82);display:flex;align-items:center;justify-content:center;padding:24px}.nm-mt-box{max-width:460px;background:#fff;color:#2b2140;border-radius:18px;padding:28px 24px;text-align:center;font:15px/1.55 system-ui,sans-serif;box-shadow:0 20px 60px rgba(0,0,0,.4)}.nm-mt-box h2{margin:0 0 8px;font-size:1.3rem}.nm-mt-box a{display:inline-block;margin-top:14px;color:#6a34b6;font-weight:600}.nm-social{display:flex;gap:12px;flex-wrap:wrap;margin-top:12px}.nm-social a{color:inherit;opacity:.85;text-decoration:underline}";
    d.head.appendChild(s);
  }
  function maintenance(s) {
    if (!s.maintenance_mode || d.getElementById("nm-mt")) return;
    css(); var msg = s.maintenance_message || "Kami sedang melakukan pemeliharaan sistem. Silakan kembali beberapa saat lagi.", mode = d.documentElement.getAttribute("data-nm-maint") || "banner";
    if (mode === "block") {
      var ov = d.createElement("div"); ov.id = "nm-mt"; ov.className = "nm-mt-ov"; ov.setAttribute("role", "alertdialog"); ov.setAttribute("aria-modal", "true"); ov.setAttribute("aria-labelledby", "nm-mt-h");
      var bx = d.createElement("div"); bx.className = "nm-mt-box"; var h = d.createElement("h2"); h.id = "nm-mt-h"; h.textContent = "Sedang dalam pemeliharaan"; var p = d.createElement("p"); p.textContent = msg; var a = d.createElement("a"); a.href = "/"; a.textContent = "Kembali ke beranda";
      bx.appendChild(h); bx.appendChild(p); bx.appendChild(a); ov.appendChild(bx); d.body.appendChild(ov);
    } else { var bar = d.createElement("div"); bar.id = "nm-mt"; bar.className = "nm-mt-bar"; bar.setAttribute("role", "status"); bar.textContent = msg; d.body.insertBefore(bar, d.body.firstChild); }
  }
  function brand(s) {
    var r = d.documentElement.style;
    [["brand_primary", "--primary"], ["brand_deep", "--deep"]].forEach(function (x) { var v = s[x[0]]; if (/^#[0-9a-fA-F]{6}$/.test(v || "") && contrastWhite(v) >= 3) r.setProperty(x[1], v); });
  }
  function social(s) {
    var L = [["social_instagram", "Instagram"], ["social_tiktok", "TikTok"], ["social_facebook", "Facebook"], ["social_youtube", "YouTube"], ["social_x", "X"], ["social_linkedin", "LinkedIn"]];
    Array.prototype.forEach.call(d.querySelectorAll("[data-nm-social]"), function (box) {
      box.textContent = ""; var n = 0;
      L.forEach(function (x) { var u = safeUrl(s[x[0]]); if (!u) return; var a = d.createElement("a"); a.href = u; a.target = "_blank"; a.rel = "noopener noreferrer"; a.textContent = x[1]; box.appendChild(a); n++; });
      if (n) { css(); box.classList.add("nm-social"); box.hidden = false; } else box.hidden = true;
    });
  }
  function support(s) {
    Array.prototype.forEach.call(d.querySelectorAll("[data-nm-support-email]"), function (e) { if (s.support_email) { e.href = "mailto:" + s.support_email; e.textContent = s.support_email; e.hidden = false; } });
    Array.prototype.forEach.call(d.querySelectorAll("[data-nm-support-wa]"), function (e) { var n = String(s.support_whatsapp || "").replace(/\D/g, ""); if (n) { if (n.charAt(0) === "0") n = "62" + n.slice(1); e.href = "https://wa.me/" + n; e.hidden = false; } });
    Array.prototype.forEach.call(d.querySelectorAll("[data-nm-name]"), function (e) { if (s.platform_name) e.textContent = s.platform_name; });
  }
  function favicon(s) { var u = s.favicon_url; if (!u || !/^(https:\/\/|\/)[^\s"'<>]+$/.test(u)) return; var l = d.querySelector('link[rel="icon"]'); if (l) l.href = u; }
  var ready = fetchSettings().then(function (s) {
    window.NM_SITE.s = s;
    var go = function () { try { maintenance(s); brand(s); social(s); support(s); favicon(s); } catch (e) { /* jangan ganggu halaman */ } };
    if (d.readyState === "loading") d.addEventListener("DOMContentLoaded", go); else go();
    return s;
  });
  window.NM_SITE = { s: {}, ready: ready };
})();
