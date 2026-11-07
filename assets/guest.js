/* NusaMora: modul tamu untuk halaman undangan publik (RSVP, ucapan, pelacakan buka, log Live Guest).
   Pasang: <div id="nm-guest"></div> + <link href="/assets/guest.css"> + <script src="/assets/config.js"></script> + <script src="/assets/guest.js" defer></script>
   - Tamu masuk lewat tautan pribadi ?t=<token 32 hex>. Tanpa token yang sah, formulir TIDAK ditampilkan.
   - Hanya memakai kunci anon (publik) lewat fetch ke RPC; semua validasi, batas laju, dan otorisasi ada di server (backend/guest-schema.sql).
   - Semua teks dari server/tamu dirender dengan textContent (aman XSS). Tidak memakai library. */
(function () {
  "use strict";
  var C = window.NM_CONFIG || {}, BASE = (C.SUPABASE_URL || "").replace(/\/$/, ""), KEY = C.SUPABASE_ANON_KEY || "";
  var m = /[?&]t=([0-9a-f]{32})(?:&|#|$)/.exec(location.search), TOKEN = m ? m[1] : "";
  var MSG = { terlalu_banyak_permintaan: "Terlalu banyak percobaan. Coba lagi nanti.", pesan_tidak_valid: "Pesan 1 sampai 500 karakter.", status_tidak_valid: "Pilih salah satu jawaban.", jumlah_tidak_valid: "Jumlah tamu 1 sampai 20." };
  var ready = null, guestName = null;

  function rpc(fn, args) {
    if (!BASE || !KEY || !TOKEN) return Promise.reject(new Error("tidak_dikonfigurasi"));
    return fetch(BASE + "/rest/v1/rpc/" + fn, { method: "POST", headers: { "Content-Type": "application/json", apikey: KEY, Authorization: "Bearer " + KEY }, body: JSON.stringify(args), credentials: "omit" })
      .then(function (r) { return r.json().catch(function () { return null; }).then(function (j) { if (!r.ok) { var e = new Error((j && (j.message || j.hint)) || "gagal"); e.body = j; throw e; } return j; }); });
  }
  function errText(e) { var s = (e && e.message) || ""; for (var k in MSG) if (s.indexOf(k) >= 0) return MSG[k]; return "Gagal mengirim. Periksa koneksi lalu coba lagi."; }

  function open() { if (!ready) ready = TOKEN ? rpc("guest_open", { p_token: TOKEN }).then(function (j) { guestName = j && j.name ? String(j.name) : null; return guestName; }, function () { return null; }) : Promise.resolve(null); return ready; }
  var API = {
    token: TOKEN, open: open,
    rsvp: function (status, pax, message) { return rpc("guest_rsvp", { p_token: TOKEN, p_status: status, p_pax: pax, p_message: message || null }); },
    wish: function (message) { return rpc("guest_wish", { p_token: TOKEN, p_message: message }); },
    live: function (action, detail) { return rpc("live_log", { p_token: TOKEN, p_action: action, p_detail: detail || null }).catch(function () { return false; }); }
  };
  window.NMGuest = API;

  function el(tag, attrs, kids) {
    var n = document.createElement(tag); for (var k in attrs || {}) { if (k === "text") n.textContent = attrs[k]; else n.setAttribute(k, attrs[k]); }
    (kids || []).forEach(function (c) { n.appendChild(c); }); return n;
  }
  function field(label, input, id) { var l = el("label", { "for": id, text: label }); return el("div", { class: "nmg-f" }, [l, input]); }
  function status(box) { var s = el("p", { class: "nmg-s", role: "status", "aria-live": "polite" }); box.appendChild(s); return function (t, bad) { s.textContent = t || ""; s.className = "nmg-s" + (bad ? " bad" : t ? " ok" : ""); }; }

  function render(root, name) {
    root.textContent = ""; root.classList.add("nmg");
    root.appendChild(el("h2", { class: "nmg-h", text: "Halo, " + name }));
    root.appendChild(el("p", { class: "nmg-p", text: "Mohon konfirmasi kehadiran dan tinggalkan ucapan untuk kami." }));

    var rf = el("form", { class: "nmg-card", novalidate: "" }); rf.appendChild(el("h3", { text: "Konfirmasi Kehadiran" }));
    var grp = el("fieldset", { class: "nmg-r" }); grp.appendChild(el("legend", { text: "Apakah Anda akan hadir?" }));
    [["hadir", "Hadir"], ["tidak_hadir", "Tidak bisa hadir"], ["ragu", "Masih ragu"]].forEach(function (o, i) {
      var id = "nmg-st" + i; var inp = el("input", { type: "radio", name: "nmg-status", value: o[0], id: id }); if (i === 0) inp.checked = true;
      grp.appendChild(el("label", { class: "nmg-opt", "for": id }, [inp, el("span", { text: o[1] })]));
    });
    rf.appendChild(grp);
    var pax = el("select", { id: "nmg-pax" }); for (var i = 1; i <= 10; i++) pax.appendChild(el("option", { value: String(i), text: i + " orang" }));
    var paxF = field("Jumlah tamu yang hadir", pax, "nmg-pax"); rf.appendChild(paxF);
    var note = el("textarea", { id: "nmg-note", rows: "2", maxlength: "500" }); rf.appendChild(field("Pesan (opsional)", note, "nmg-note"));
    var rb = el("button", { type: "submit", class: "nmg-b", text: "Kirim Konfirmasi" }); rf.appendChild(rb); var rs = status(rf);
    rf.addEventListener("change", function () { paxF.hidden = rf.querySelector("input[name=nmg-status]:checked").value !== "hadir"; });
    rf.addEventListener("submit", function (e) {
      e.preventDefault(); var st = rf.querySelector("input[name=nmg-status]:checked").value; rb.disabled = true; rs("Mengirim...");
      API.rsvp(st, parseInt(pax.value, 10) || 1, note.value.trim()).then(function (ok) { rb.disabled = false; rs(ok ? "Terima kasih, konfirmasi Anda sudah kami terima." : "Tautan tamu tidak berlaku.", !ok); }, function (er) { rb.disabled = false; rs(errText(er), true); });
    });
    root.appendChild(rf);

    var wf = el("form", { class: "nmg-card", novalidate: "" }); wf.appendChild(el("h3", { text: "Ucapan & Doa" }));
    var msg = el("textarea", { id: "nmg-msg", rows: "3", maxlength: "500", required: "" }); wf.appendChild(field("Tulis ucapan", msg, "nmg-msg"));
    var wb = el("button", { type: "submit", class: "nmg-b", text: "Kirim Ucapan" }); wf.appendChild(wb); var ws = status(wf);
    wf.addEventListener("submit", function (e) {
      e.preventDefault(); var t = msg.value.trim(); if (!t) { ws("Tulis ucapan Anda dulu.", true); msg.focus(); return; }
      wb.disabled = true; ws("Mengirim...");
      API.wish(t).then(function (ok) { wb.disabled = false; if (ok) { msg.value = ""; ws("Terima kasih atas ucapan Anda."); } else ws("Tautan tamu tidak berlaku.", true); }, function (er) { wb.disabled = false; ws(errText(er), true); });
    });
    root.appendChild(wf);
  }

  function start() {
    var root = document.getElementById("nm-guest"); if (!root || !TOKEN) return;   // tanpa token sah: tidak menampilkan apa pun
    open().then(function (name) { if (name) render(root, name); else { root.textContent = ""; root.appendChild(el("p", { class: "nmg-p nmg-bad", role: "status", text: "Tautan undangan ini tidak berlaku atau undangan sudah berakhir." })); } });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
