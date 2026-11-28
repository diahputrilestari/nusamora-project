/* NusaMora: analitik first-party (tahap 2). Aktif hanya bila NM_CONFIG.ANALYTICS_ON === true DAN pengunjung menekan "Terima".
   Tanpa persetujuan, atau bila Do Not Track / Global Privacy Control menyala, skrip ini tidak mengirim apa pun dan tidak menyimpan pengenal.
   Tidak mengumpulkan nama, email, telepon, kata sandi, atau data pembayaran. Pengenal acak disimpan di peramban (nm_vid, nm_sid). */
(function () {
  "use strict";
  var W = window, D = document, C = W.NM_CONFIG || {};
  if (!C.ANALYTICS_ON || !C.SUPABASE_URL) return;
  var dnt = navigator.doNotTrack === "1" || W.doNotTrack === "1" || navigator.globalPrivacyControl === true;
  if (dnt) return;

  var KC = "nm_consent_v1", KV = "nm_vid", KS = "nm_sid", ENDPOINT = String(C.SUPABASE_URL).replace(/\/$/, "") + "/functions/v1/analytics-collect";
  var SESSION_MS = 30 * 60 * 1000, HB_MS = 30000, IDLE_MS = 5 * 60 * 1000, FLUSH_MS = 5000;
  var UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  var ls = (function () { try { var t = "__nm"; W.localStorage.setItem(t, "1"); W.localStorage.removeItem(t); return W.localStorage; } catch (e) { return null; } })();
  var get = function (k) { try { return ls ? ls.getItem(k) : null; } catch (e) { return null; } };
  var set = function (k, v) { try { if (ls) ls.setItem(k, v); } catch (e) { /* abaikan */ } };
  var del = function (k) { try { if (ls) ls.removeItem(k); } catch (e) { /* abaikan */ } };
  var uuid = function () { try { return crypto.randomUUID(); } catch (e) { var b = new Uint8Array(16); crypto.getRandomValues(b); b[6] = b[6] & 15 | 64; b[8] = b[8] & 63 | 128; var h = Array.prototype.map.call(b, function (x) { return ("0" + x.toString(16)).slice(-2); }).join(""); return h.replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/, "$1-$2-$3-$4-$5"); } };
  var cookie = function (n) { var m = D.cookie.match(new RegExp("(?:^|; )" + n + "=([^;]*)")); return m ? decodeURIComponent(m[1]) : null; };

  /* ---------- persetujuan ---------- */
  function consent() { var v = get(KC); return v === "granted" || v === "denied" ? v : null; }
  function wipeIds() { del(KV); del(KS); try { D.cookie = KV + "=; Max-Age=0; Path=/; SameSite=Lax"; } catch (e) { /* abaikan */ } }

  /* ---------- pengenal ---------- */
  function vid() {
    var v = get(KV) || cookie(KV);
    if (!v || !UUID.test(v)) { v = uuid(); }
    set(KV, v);
    try { D.cookie = KV + "=" + v + "; Max-Age=" + 395 * 86400 + "; Path=/; SameSite=Lax" + (location.protocol === "https:" ? "; Secure" : ""); } catch (e) { /* abaikan */ }
    return v;
  }
  var sess = null, isNewSession = false;
  function session() {
    var now = Date.now(), s = null;
    try { s = JSON.parse(get(KS) || "null"); } catch (e) { s = null; }
    if (!s || !UUID.test(s.id || "") || now - (s.t || 0) > SESSION_MS) {
      s = { id: uuid(), t: now, ref: externalRef(), utm: utmFromUrl(), landing: cleanPath(location.pathname) };
      isNewSession = true;
    }
    s.t = now; set(KS, JSON.stringify(s)); sess = s; return s;
  }
  function externalRef() {
    try { if (!D.referrer) return ""; var u = new URL(D.referrer); return u.hostname === location.hostname ? "" : u.hostname; } catch (e) { return ""; }
  }
  function utmFromUrl() {
    var o = {}; try { var q = new URLSearchParams(location.search);["source", "medium", "campaign", "content", "term"].forEach(function (k) { var v = q.get("utm_" + k); if (v) o[k] = v.slice(0, 80); }); } catch (e) { /* abaikan */ }
    return o;
  }
  function cleanPath(p) { p = String(p || "/").split("?")[0].split("#")[0].toLowerCase(); return p.length > 1 ? p.replace(/\/+$/, "") || "/" : "/"; }

  /* ---------- antrean dan pengiriman ---------- */
  var queue = [], timer = null, lastAct = Date.now(), sentFirst = false;
  function ctx() {
    var s = sess || session();
    return { ref: s.ref || "", utm: s.utm || {}, landing: s.landing, screen: (screen.width || 0) + "x" + (screen.height || 0) };
  }
  function payload(evs) { var s = session(); return { vid: vid(), sid: s.id, ctx: ctx(), events: evs }; }
  function send(evs, beacon) {
    if (consent() !== "granted") return;
    var body = JSON.stringify(payload(evs));
    try {
      if (beacon && navigator.sendBeacon && navigator.sendBeacon(ENDPOINT, new Blob([body], { type: "text/plain" }))) return;
      fetch(ENDPOINT, { method: "POST", headers: { "Content-Type": "text/plain" }, body: body, keepalive: true, credentials: "omit" }).catch(function () { /* abaikan */ });
    } catch (e) { /* abaikan */ }
  }
  function flush(beacon) { if (timer) { clearTimeout(timer); timer = null; } if (!queue.length) return; var q = queue.splice(0, 25); send(q, beacon); if (queue.length) flush(beacon); }
  function track(e, props) {
    if (consent() !== "granted") return;
    var ev = { e: e }; props = props || {}; Object.keys(props).forEach(function (k) { if (props[k] != null && props[k] !== "") ev[k] = String(props[k]).slice(0, 100); });
    queue.push(ev); if (!timer) timer = setTimeout(function () { flush(false); }, sentFirst ? FLUSH_MS : 800); sentFirst = true;
  }

  /* ---------- peristiwa halaman ---------- */
  var lastPath = "";
  function pageView() {
    var p = cleanPath(location.pathname), q = new URLSearchParams(location.search);
    if (p === lastPath) return; lastPath = p;
    if (p === "/preview" && !q.get("demo")) return;      /* pratinjau undangan milik pelanggan (id=...) tidak dilacak */
    track("page_view", { path: p });
    if (p === "/paket") track("pricing_view", { path: p });
    if (p === "/preview" && q.get("demo")) track("template_preview", { path: p, tpl: slug(q.get("demo")) });
  }
  function slug(s) { return String(s || "").toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 80); }
  function qs(href) { try { return new URL(href, location.href); } catch (e) { return null; } }

  function onClick(ev) {
    var a = ev.target && ev.target.closest ? ev.target.closest("a[href]") : null; if (!a) return;
    var h = a.getAttribute("href") || "", u = qs(h); if (!u) return;
    if (/^mailto:/i.test(h)) return track("contact_click", { path: cleanPath(location.pathname), target: "email" });
    if (/^tel:/i.test(h)) return track("contact_click", { path: cleanPath(location.pathname), target: "telepon" });
    if (/(^|\.)wa\.me$|(^|\.)whatsapp\.com$/i.test(u.hostname)) return track("whatsapp_click", { path: cleanPath(location.pathname), target: "whatsapp" });
    if (u.origin !== location.origin) return;
    var p = cleanPath(u.pathname), q = u.searchParams;
    if (p === "/buat" && q.get("template")) return track("template_select", { path: cleanPath(location.pathname), tpl: slug(q.get("template")), pkg: q.get("paket") });
    if (p === "/preview" && q.get("demo")) return track("template_preview", { path: cleanPath(location.pathname), tpl: slug(q.get("demo")), pkg: q.get("paket") });
    if (/^\/assets(-signature)?\/invite\//.test(u.pathname) && (q.get("theme") || q.get("demo"))) return track("template_preview", { path: cleanPath(location.pathname), tpl: slug(q.get("theme") || q.get("demo")) });
    if (p === "/template" && q.get("paket") && !q.get("kategori")) return track("package_select", { path: cleanPath(location.pathname), pkg: q.get("paket") });
  }

  /* template_view: kartu template yang terlihat (>= 50%) minimal satu kali per halaman */
  var seenTpl = {}, io = null;
  function watchTemplates() {
    if (!("IntersectionObserver" in W)) return;
    io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (!e.isIntersecting) return; var t = slug(e.target.getAttribute("data-use")); if (!t || seenTpl[t]) return; seenTpl[t] = 1; io.unobserve(e.target); track("template_view", { path: cleanPath(location.pathname), tpl: t }); });
    }, { threshold: 0.5 });
    var scan = function () { Array.prototype.forEach.call(D.querySelectorAll("a[data-use]:not([data-nm-w])"), function (el) { el.setAttribute("data-nm-w", "1"); io.observe(el); }); };
    scan(); new MutationObserver(function () { scan(); }).observe(D.body, { childList: true, subtree: true });
  }
  /* pricing_view di landing: bagian #harga terlihat */
  function watchPricing() {
    var el = D.getElementById("harga"); if (!el || !("IntersectionObserver" in W) || cleanPath(location.pathname) === "/paket") return;
    var o = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { o.disconnect(); track("pricing_view", { path: cleanPath(location.pathname) }); } }, { threshold: 0, rootMargin: "0px 0px -30% 0px" }); o.observe(el);
  }
  function watchSignup() {
    if (cleanPath(location.pathname) !== "/daftar") return; var done = false;
    var f = function () { if (done) return; done = true; track("signup_start", { path: "/daftar" }); };
    D.addEventListener("focusin", function (e) { var t = e.target; if (t && /^(INPUT|SELECT|TEXTAREA)$/.test(t.tagName) && /^r-/.test(t.id || "")) f(); }, true);   /* hanya formulir pendaftaran (id r-*), bukan formulir masuk */
  }
  function watchSearch() {
    var t = null;
    D.addEventListener("input", function (e) {
      var el = e.target; if (!el || el.tagName !== "INPUT" || !(el.type === "search" || el.hasAttribute("data-nm-search"))) return;
      clearTimeout(t); t = setTimeout(function () { var v = String(el.value || "").trim(); if (v.length >= 2 && !/@|\d{6,}/.test(v)) track("search", { path: cleanPath(location.pathname), term: v.toLowerCase() }); }, 1200);
    }, true);
  }
  function watchNav() {
    var wrap = function (n) { var o = history[n]; if (!o) return; history[n] = function () { var r = o.apply(this, arguments); setTimeout(pageView, 0); return r; }; };
    wrap("pushState"); W.addEventListener("popstate", function () { setTimeout(pageView, 0); });
  }
  function heartbeat() {
    ["pointerdown", "keydown", "scroll", "touchstart"].forEach(function (n) { W.addEventListener(n, function () { lastAct = Date.now(); }, { passive: true, capture: true }); });
    setInterval(function () { if (D.visibilityState === "visible" && Date.now() - lastAct < IDLE_MS && consent() === "granted") { if (queue.length) flush(false); else send([], false); } }, HB_MS);
  }

  /* ---------- mulai/berhenti ---------- */
  var started = false;
  function start() {
    if (started || consent() !== "granted") return; started = true;
    session(); vid(); pageView(); watchTemplates(); watchPricing(); watchSignup(); watchSearch(); watchNav(); heartbeat();
    D.addEventListener("click", onClick, true);
    D.addEventListener("visibilitychange", function () { if (D.visibilityState === "hidden") flush(true); });
    W.addEventListener("pagehide", function () { flush(true); });
  }
  function grant() { set(KC, "granted"); hide(); start(); }
  function deny() {
    var had = consent() === "granted", v = get(KV) || cookie(KV);
    set(KC, "denied"); queue = []; hide();
    if (had && v && UUID.test(v)) { try { fetch(ENDPOINT, { method: "POST", headers: { "Content-Type": "text/plain" }, body: JSON.stringify({ vid: v, forget: true }), keepalive: true, credentials: "omit" }).catch(function () { /* abaikan */ }); } catch (e) { /* abaikan */ } }
    wipeIds();
  }

  /* ---------- banner persetujuan ---------- */
  var box = null;
  function hide() { if (box && box.parentNode) box.parentNode.removeChild(box); box = null; }
  function show() {
    if (box || !D.body) return;
    var st = D.getElementById("nm-consent-css");
    if (!st) {
      st = D.createElement("style"); st.id = "nm-consent-css";
      st.textContent = "#nm-consent{position:fixed;left:50%;bottom:16px;transform:translateX(-50%);z-index:2147483000;width:min(560px,calc(100vw - 24px));box-sizing:border-box;background:#FBF6EE;color:#241046;border:1px solid #E4D9F2;border-radius:16px;box-shadow:0 12px 40px rgba(36,16,70,.22);padding:16px 18px;font:14px/1.5 'Plus Jakarta Sans',system-ui,-apple-system,Segoe UI,Roboto,sans-serif}" +
        "#nm-consent p{margin:0 0 12px}#nm-consent a{color:#6A34B6;text-decoration:underline}#nm-consent .nm-b{display:flex;gap:10px;flex-wrap:wrap}" +
        "#nm-consent button{font:inherit;font-weight:600;min-height:44px;padding:0 20px;border-radius:12px;cursor:pointer;border:1px solid #6A34B6}" +
        "#nm-consent .nm-y{background:#6A34B6;color:#fff}#nm-consent .nm-n{background:#fff;color:#6A34B6}#nm-consent button:focus-visible{outline:3px solid #8C5AD6;outline-offset:2px}" +
        "@media (prefers-reduced-motion:no-preference){#nm-consent{animation:nmc .3s ease-out}@keyframes nmc{from{opacity:0;transform:translate(-50%,8px)}to{opacity:1;transform:translate(-50%,0)}}}";
      D.head.appendChild(st);
    }
    box = D.createElement("section"); box.id = "nm-consent"; box.setAttribute("role", "region"); box.setAttribute("aria-label", "Pilihan analitik");
    box.innerHTML = "<p><strong>Boleh kami hitung kunjungan Anda?</strong> Kami memakai analitik milik sendiri (tanpa iklan dan tanpa pihak ketiga) untuk tahu halaman dan template mana yang paling berguna. Tidak ada nama, email, nomor telepon, atau alamat IP yang disimpan. Anda bisa mengubah pilihan kapan saja. <a href=\"/kebijakan-privasi#cookies\">Selengkapnya</a></p>" +
      "<div class=\"nm-b\"><button type=\"button\" class=\"nm-y\">Terima</button><button type=\"button\" class=\"nm-n\">Tolak</button></div>";
    box.querySelector(".nm-y").addEventListener("click", grant); box.querySelector(".nm-n").addEventListener("click", deny);
    D.body.appendChild(box);
  }

  W.NMTrack = {
    ids: function () { return consent() === "granted" ? { vid: vid(), sid: session().id } : null; },   /* dipakai form daftar untuk atribusi; null bila tanpa persetujuan */
    event: track,
    consent: consent,
    openChoice: function () { show(); }
  };
  function init() { if (consent() === null) show(); else if (consent() === "granted") start(); }
  if (D.readyState === "loading") D.addEventListener("DOMContentLoaded", init); else init();
})();
