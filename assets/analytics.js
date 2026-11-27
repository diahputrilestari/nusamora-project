/* NusaMora: Google Analytics 4, aktif hanya bila NM_CONFIG.GA4_ID diisi (format G-XXXXXXXXXX) di assets/config.js.
   Tanpa ID, skrip ini tidak melakukan apa pun dan tidak memuat apa pun dari Google.
   Menghormati sinyal Do Not Track / Global Privacy Control. IP dianonimkan. Tanpa sinyal iklan. */
(function () {
  "use strict";
  var id = ((window.NM_CONFIG || {}).GA4_ID || "").trim();
  if (!/^G-[A-Z0-9]{6,14}$/.test(id)) return;
  var dnt = navigator.doNotTrack === "1" || window.doNotTrack === "1" || navigator.globalPrivacyControl === true;
  if (dnt) return;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { window.dataLayer.push(arguments); };
  window.gtag("js", new Date());
  window.gtag("config", id, { anonymize_ip: true, allow_google_signals: false, allow_ad_personalization_signals: false });
  var s = document.createElement("script"); s.async = true; s.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(id);
  document.head.appendChild(s);
  /* Klik CTA penting (tombol ke /paket, /template, /daftar, /buat): satu peristiwa 'cta_click' berparameter tujuan. */
  document.addEventListener("click", function (e) {
    var a = e.target && e.target.closest ? e.target.closest("a[href]") : null; if (!a) return;
    var h = a.getAttribute("href") || ""; if (!/^\/(paket|template|daftar|buat|masuk)(\/|\?|#|$)/.test(h)) return;
    window.gtag("event", "cta_click", { destination: h.split(/[?#]/)[0], page_path: location.pathname });
  }, true);
})();
