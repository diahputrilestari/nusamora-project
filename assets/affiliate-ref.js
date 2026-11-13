/* NusaMora: tangkap link referral (?ref=KODE). Mencatat klik lewat aff_track_click (anon) dan menyimpan kode di perangkat ini untuk dikaitkan setelah pelanggan masuk. Tidak menyimpan data pribadi. */
(function () {
  "use strict";
  var C = window.NM_CONFIG || {}, q;
  try { q = new URLSearchParams(location.search).get("ref"); } catch (e) { return; }
  if (!q) return;
  var code = String(q).toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (code.length < 6 || code.length > 12) return;
  var ls = { get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) { } } };
  var vid = ls.get("nm_vid");
  if (!vid) { vid = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now()) + "-" + Math.random().toString(16).slice(2, 12); ls.set("nm_vid", vid); }
  var rec = { code: code, click: null, t: Date.now() };
  ls.set("nm_ref", JSON.stringify(rec));
  if (!C.SUPABASE_URL || !C.SUPABASE_ANON_KEY || !window.fetch) return;
  fetch(C.SUPABASE_URL.replace(/\/$/, "") + "/rest/v1/rpc/aff_track_click", {
    method: "POST", headers: { "Content-Type": "application/json", apikey: C.SUPABASE_ANON_KEY, Authorization: "Bearer " + C.SUPABASE_ANON_KEY },
    body: JSON.stringify({ p_code: code, p_visitor: vid, p_landing: location.pathname }), keepalive: true
  }).then(function (r) { return r.ok ? r.json() : null; }).then(function (id) {
    if (typeof id === "string") { rec.click = id; ls.set("nm_ref", JSON.stringify(rec)); }
  }).catch(function () { });
})();
