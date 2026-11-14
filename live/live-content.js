/* NusaMora Live Guest: isi undangan pelanggan (RPC live_invitation) -> tampilan venue.
   Dipanggil oleh live-bridge.js setelah data diterima: NMLC.apply(data, {token, rpc}). Semua hook dibungkus try/catch agar halaman tidak rusak. */
(function () {
  "use strict";
  var D = null, T = "", RPC = null, done = false, greeted = false;
  function q(s) { return document.querySelector(s); }
  function safeUrl(u) { u = String(u || ""); return (/^https:\/\/[^\s"'<>]+$/.test(u) || /^\/(?!\/)[^\s"'<>]+$/.test(u)) ? u : ""; }
  function E(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function dateObj() { var m = String((D && D.event_date) || "").match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; }
  function dateLong() { var d = dateObj(); return d ? d.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : ""; }
  function timeTxt() { var e = (D && D.event) || {}; return e.start ? e.start + (e.end ? " – " + e.end : "") + " " + (e.tz || "WIB") : ""; }
  function mapsUrl() { var e = D.event || {}, m = safeUrl(e.maps); if (m) return m; var s = [e.venue, e.address].filter(Boolean).join(", "); return s ? "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(s) : ""; }
  function daysLeft() { var d = dateObj(); if (!d) return null; var t = new Date(); t = new Date(t.getFullYear(), t.getMonth(), t.getDate()); return Math.round((d - t) / 86400000); }
  function feat(k, def) { var f = (D && D.features) || {}; return f[k] === undefined ? def : f[k] !== false; }
  function giftOk() { var g = D && D.gift; return !!(g && g.bank && g.number && g.holder); }
  function photos() { var p = (D && D.photos) || {}, a = []; if (safeUrl(p.cover)) a.push(p.cover); (p.gallery || []).forEach(function (u) { if (safeUrl(u) && a.indexOf(u) < 0) a.push(u); }); return a; }
  var MAPSVG = '<div class="nm-map" aria-hidden="true"><svg viewBox="0 0 400 150" preserveAspectRatio="xMidYMid slice" fill="none" stroke="#DDD3EE" stroke-width="10" stroke-linecap="round"><path d="M-10 110C80 90 120 40 210 60s120 50 220 10"/><path d="M60 -10C80 50 70 100 110 160"/><path d="M290 -10c-20 60 10 100-10 170" stroke-width="6"/><path d="M-10 40h120M240 110h170" stroke-width="5"/></svg><svg viewBox="0 0 400 150" style="color:#6A5A8C"><g transform="translate(188 52)" fill="#6A5A8C" stroke="none"><path d="M12 46S-4 31 -4 18a16 16 0 0 1 32 0c0 13-16 28-16 28z"/><circle cx="12" cy="18" r="6" fill="#FBF8F2"/></g></svg></div>';

  function setWelcome() { var b = q("#s1 .sub"); if (b && D && D.welcome) b.textContent = String(D.welcome).slice(0, 300); }

  function patchModal() {
    var bxEl = document.getElementById("bx"); if (!bxEl || !D) return;
    bxEl.querySelectorAll(".nm-sec").forEach(function (s) {
      var h = s.querySelector("h3"); if (!h || !/Wedding Gift/i.test(h.textContent)) return;
      if (!giftOk()) { s.remove(); return; }
      var g = D.gift, qr = (typeof nmQris === "function") ? nmQris() : "";
      s.innerHTML = "<h3>Wedding Gift</h3><p class=\"nm-mute\" style=\"margin:0 0 12px\">Bila berkenan berbagi kebahagiaan, hadiah digital dapat dikirim ke:</p>" + bank(E(g.bank), E(g.number), E(g.holder)) + (g.address ? "<p class=\"nm-mute\" style=\"margin:12px 0 0\">Alamat kirim kado: " + E(g.address) + "</p>" : "") + qr;
    });
    var lv = bxEl.querySelector(".nm-live span"); if (lv) { var t = [dateLong(), timeTxt()].filter(Boolean).join(" · "); if (t) lv.textContent = t; }
  }

  function loc() {
    nav("lokasi"); var e = D.event || {}, dt = dateLong(), tm = timeTxt(), mu = mapsUrl(), n = daysLeft();
    if (!e.venue && !e.address && !dt && !tm) { openM("Lokasi Acara", "<p class=\"nm-p\">Detail lokasi belum diisi oleh penyelenggara.</p>", { eyebrow: "Hari Bahagia" }); return; }
    var full = [e.venue, e.address].filter(Boolean).join(", ");
    openM("Lokasi Acara", MAPSVG + "<div class=\"nm-venue\"><h3>" + E(e.venue || "Lokasi acara") + "</h3>" + (e.address ? "<p>" + E(e.address) + "</p>" : "") + "</div>" +
      "<dl class=\"nm-meta\">" + (dt ? "<div>" + nmI("calendar") + "<dt>Tanggal</dt><dd>" + E(dt) + "</dd></div>" : "") + (tm ? "<div>" + nmI("clock") + "<dt>Waktu</dt><dd>" + E(tm) + "</dd></div>" : "") +
      (feat("countdown", true) && n !== null && n >= 0 ? "<div>" + nmI("clock") + "<dt>Hitung mundur</dt><dd>" + (n === 0 ? "Hari ini" : n + " hari lagi") + "</dd></div>" : "") + "</dl>" +
      "<div class=\"nm-row\">" + (mu ? "<a class=\"nm-btn\" target=\"_blank\" rel=\"noopener\" href=\"" + E(mu) + "\">" + nmI("pin") + "<span>Buka Google Maps</span></a>" : "") +
      (full ? "<button class=\"nm-btn sec\" type=\"button\" data-act=\"copy\" data-v=\"" + E(full) + "\"><span class=\"nm-bi\">" + nmI("copy") + "</span><span class=\"nm-bl\">Salin Alamat</span></button>" : "") + "</div>", { eyebrow: "Hari Bahagia" });
  }

  function gallery() {
    nav("galeri"); GL = null; var L = photos();
    openM("Galeri Foto", L.length ? "<div class=\"nm-gal\">" + L.map(function (u, i) { return "<button class=\"nm-tile\" type=\"button\" data-i=\"" + i + "\" aria-label=\"Foto " + (i + 1) + "\" style=\"padding:0;overflow:hidden\"><img src=\"" + E(u) + "\" alt=\"Foto galeri " + (i + 1) + "\" loading=\"lazy\" style=\"width:100%;height:100%;object-fit:cover;display:block\"></button>"; }).join("") + "</div><p class=\"nm-hint\">" + L.length + " foto · ketuk untuk memperbesar</p>" : "<p class=\"nm-p\">Belum ada foto di galeri.</p>", { eyebrow: "Momen Kita" });
    document.getElementById("bx").querySelectorAll("[data-i]").forEach(function (b) { b.onclick = function () { lb(+b.dataset.i); }; });
  }
  function lb(i) {
    var L = photos(); if (!L.length) return gallery(); i = (i + L.length) % L.length;
    openM("Foto " + (i + 1) + " / " + L.length, "<div style=\"text-align:center\"><img src=\"" + E(L[i]) + "\" alt=\"Foto " + (i + 1) + "\" style=\"max-width:100%;max-height:60vh;border-radius:12px\"></div><div class=\"nm-bar\"><button class=\"nm-ibtn\" type=\"button\" data-go=\"" + (i - 1) + "\" aria-label=\"Sebelumnya\">" + nmI("prev") + "</button><span class=\"nm-cnt\">" + (i + 1) + " / " + L.length + "</span><button class=\"nm-ibtn\" type=\"button\" data-go=\"" + (i + 1) + "\" aria-label=\"Berikutnya\">" + nmI("next") + "</button></div>", { eyebrow: "Foto", back: { label: "Kembali ke galeri", fn: gallery } });
    document.getElementById("bx").querySelectorAll("[data-go]").forEach(function (b) { b.onclick = function () { lb(+b.dataset.go); }; });
  }
  /* video ucapan dari pelanggan (live.videoUrl): YouTube (embed tanpa cookie) atau file .mp4/.webm lewat https; selain itu tidak diputar */
  function videoHtml(u) {
    u = String(u || "").trim(); var m;
    if ((m = u.match(/^https:\/\/(?:(?:www|m)\.)?youtube\.com\/(?:watch\?(?:[^#]*&)?v=|embed\/|shorts\/)([A-Za-z0-9_-]{11})(?:[?&#].*)?$/i)) || (m = u.match(/^https:\/\/youtu\.be\/([A-Za-z0-9_-]{11})(?:[?&#].*)?$/i)))
      return "<div style=\"position:relative;padding-top:56.25%;border-radius:12px;overflow:hidden;background:#000\"><iframe src=\"https://www.youtube-nocookie.com/embed/" + m[1] + "?rel=0\" title=\"Video ucapan\" style=\"position:absolute;inset:0;width:100%;height:100%;border:0\" allow=\"encrypted-media; picture-in-picture\" allowfullscreen referrerpolicy=\"strict-origin-when-cross-origin\" loading=\"lazy\"></iframe></div>";
    if (/^https:\/\/[^\s"'<>]+\.(mp4|webm)(\?[^\s"'<>]*)?$/i.test(u))
      return "<video src=\"" + E(u) + "\" controls playsinline preload=\"metadata\" style=\"width:100%;max-height:60vh;border-radius:12px;background:#000\"></video>";
    return "";
  }
  function videos() {
    nav("video"); var h = feat("video", false) ? videoHtml((D.live || {}).videoUrl) : "";
    openM("Video Ucapan", h || "<p class=\"nm-p\">Belum ada video ucapan.</p>", { eyebrow: "Pesan Hangat" });
  }

  function rsvpBlock() {
    if (!feat("rsvp", true)) return "";
    var r = D.rsvp || {}, mx = Math.max(1, Math.min(10, Number((D.live || {}).rsvpMax) || 2)), st = r.status || "", o = "";
    for (var i = 1; i <= mx; i++) o += "<option value=\"" + i + "\"" + (i === (r.pax || 1) ? " selected" : "") + ">" + i + " orang</option>";
    function rb(v, l) { return "<label style=\"display:inline-flex;gap:6px;align-items:center;margin:0 12px 6px 0\"><input type=\"radio\" name=\"nm-rs\" value=\"" + v + "\"" + (st === v ? " checked" : "") + ">" + l + "</label>"; }
    return "<div class=\"nm-sec\" id=\"nm-rsvp\"><h3>Konfirmasi Kehadiran</h3><div>" + rb("hadir", "Hadir") + rb("tidak_hadir", "Tidak hadir") + rb("ragu", "Masih ragu") + "</div>" +
      "<div class=\"nm-fld\" id=\"nm-rp\"" + (st === "tidak_hadir" ? " hidden" : "") + "><label class=\"nm-lb\" for=\"nm-pax\">Jumlah tamu</label><select class=\"nm-in\" id=\"nm-pax\">" + o + "</select></div>" +
      "<div class=\"nm-fld\"><label class=\"nm-lb\" for=\"nm-rn\">Catatan (opsional)</label><input class=\"nm-in\" id=\"nm-rn\" maxlength=\"200\" value=\"" + E(r.message || "") + "\"></div>" +
      "<div class=\"nm-err\" id=\"nm-re\" role=\"alert\"></div><button class=\"nm-btn\" type=\"button\" id=\"nm-rb\"><span class=\"nm-bl\">" + (st ? "Perbarui RSVP" : "Kirim RSVP") + "</span></button></div>";
  }
  function wireRsvp() {
    var b = document.getElementById("nm-rb"); if (!b) return;
    document.querySelectorAll("input[name=nm-rs]").forEach(function (x) { x.onchange = function () { var p = document.getElementById("nm-rp"); if (p) p.hidden = x.value === "tidak_hadir"; }; });
    b.onclick = function () {
      var s = q("input[name=nm-rs]:checked"), er = document.getElementById("nm-re"); if (!s) { er.textContent = "Pilih status kehadiran."; return; }
      var pax = s.value === "tidak_hadir" ? 0 : +document.getElementById("nm-pax").value, note = (document.getElementById("nm-rn").value || "").trim() || null; b.disabled = true; er.textContent = "";
      RPC("guest_rsvp", { p_token: T, p_status: s.value, p_pax: pax, p_message: note }).then(function (ok) {
        if (!ok) throw 0; D.rsvp = { status: s.value, pax: pax, message: note }; nmToastMsg = "Terima kasih, kehadiran Anda tercatat."; book();
      }, function () { b.disabled = false; er.textContent = "Gagal menyimpan RSVP. Coba lagi."; });
    };
  }
  function book() {
    nav("buku"); var l = D.wishes || [], av = (typeof AV !== "undefined") ? AV : null, ph = "";
    try { ph = nmFmt(nmEv().book.ph); } catch (e) { }
    openM("Buku Tamu", rsvpBlock() + "<form class=\"nm-form\" id=\"nm-gf\" novalidate><div class=\"nm-fld\"><label class=\"nm-lb\" for=\"gm\">Ucapan &amp; doa</label><textarea class=\"nm-ta\" id=\"gm\" rows=\"3\" maxlength=\"300\" placeholder=\"" + E(ph) + "\"></textarea><div class=\"nm-cnt2\"><span class=\"nm-err\" id=\"ge\" role=\"alert\"></span><span id=\"gc\">0 / 300</span></div></div><button class=\"nm-btn\" type=\"submit\" id=\"gs\">" + nmI("send") + "<span class=\"nm-bl\">Kirim Ucapan</span></button></form>" +
      "<div class=\"nm-sec\"><h3>Ucapan dari Tamu <em>" + l.length + "</em></h3>" + (l.length ? l.map(function (x, i) { var a = av ? av[i % 2 ? "L" : "P"][0] : null; return "<article class=\"nm-msg\">" + (a ? "<span class=\"nm-av\">" + svg(a, 30) + "</span>" : "") + "<div><div class=\"nm-mh\"><b>" + E(x.name) + "</b><time>" + E(x.at ? new Date(x.at).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" }) : "") + "</time></div><p>" + E(x.message) + "</p></div></article>"; }).join("") : "<p class=\"nm-mute\">Belum ada ucapan. Jadilah yang pertama.</p>") + "</div>", { eyebrow: "Ucapan & Doa", focus: "#gm" });
    var g = document.getElementById("gm"); g.oninput = function () { document.getElementById("gc").textContent = g.value.length + " / 300"; g.removeAttribute("aria-invalid"); document.getElementById("ge").textContent = ""; };
    document.getElementById("nm-gf").onsubmit = function (e) { e.preventDefault(); gsub(); }; wireRsvp();
  }
  function gsub() {
    var g = document.getElementById("gm"), er = document.getElementById("ge"), m = (g.value || "").trim(); if (!m) { er.textContent = "Ucapan wajib diisi."; g.setAttribute("aria-invalid", "true"); g.focus(); return; }
    var b = document.getElementById("gs"); b.disabled = true;
    RPC("guest_wish", { p_token: T, p_message: m }).then(function (ok) {
      if (!ok) throw 0; (D.wishes = D.wishes || []).unshift({ name: (D.guest && D.guest.name) || S.name || "Tamu", message: m, at: new Date().toISOString() }); nmToastMsg = "Terima kasih, ucapan Anda telah terkirim."; book();
    }, function () { b.disabled = false; er.textContent = "Gagal mengirim ucapan (mungkin terlalu sering). Coba lagi nanti."; });
  }

  window.NMLC = {
    apply: function (d, ctx) {
      if (done || !d) return; done = true; D = d; T = ctx.token; RPC = ctx.rpc;
      var n = D.names || {}, couple = /^(wedding|engagement)$/.test(D.category || ""), f = {};
      if (couple) { if (n.a) f.brideName = String(n.a); if (n.b) f.groomName = String(n.b); f.nameOrder = "bride"; } else if (n.a) f.hostName = String(n.a);
      try { INVDATA = Object.assign({}, INVDATA || {}, f); applyIdentity(); } catch (e) { }
      try {
        window.loc = loc; window.gallery = gallery; window.lb = lb; window.videos = videos; window.book = book; window.gsub = gsub;
        var o = window.openM; window.openM = function () { var r = o.apply(this, arguments); try { patchModal(); } catch (e) { } return r; };
        var st = document.createElement("style"); st.textContent = "#ml .nv[data-id=\"story\"]{display:none!important}"; document.head.appendChild(st);
      } catch (e) { }
      setWelcome(); setTimeout(setWelcome, 500); setTimeout(setWelcome, 2500);
    },
    greet: function () { if (greeted) return; greeted = true; try { var g = D && D.live && D.live.greeting; if (g && typeof addChat === "function") addChat({ n: (NMID && NMID.pair) || "Mempelai", a: AV.L[0] }, String(g).slice(0, 160)); } catch (e) { } }
  };
})();
