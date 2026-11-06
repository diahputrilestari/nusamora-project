/* Halaman Keamanan Akun Admin: pendaftaran & verifikasi MFA (TOTP Supabase Auth), ganti password sesuai kebijakan admin,
   dan (khusus super admin) panel penegakan. Penegakan sebenarnya ada di DATABASE (has_perm + aal2), bukan di halaman ini. */
(function () {
  "use strict";
  var d = document, $ = function (s, r) { return (r || d).querySelector(s); };
  var C = window.NM_CONFIG || {};
  var sb = (C.SUPABASE_URL && C.SUPABASE_ANON_KEY && window.supabase) ? window.supabase.createClient(C.SUPABASE_URL, C.SUPABASE_ANON_KEY, { auth: { persistSession: true, autoRefreshToken: true } }) : null;
  var view = $("#view");
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function toast(t, k) { var e = d.createElement("div"); e.className = "toast " + (k || ""); e.setAttribute("role", k === "bad" ? "alert" : "status"); e.textContent = t; $("#toasts").appendChild(e); setTimeout(function () { e.remove(); }, 4500); }
  function nextUrl() { var n = new URLSearchParams(location.search).get("next") || "/admin"; return /^\/[^\/\\]/.test(n) || n === "/" ? n : "/admin"; }
  function pill(t, k) { return '<span class="sec-pill ' + (k || "") + '">' + esc(t) + "</span>"; }
  function cleanMsg(e) { var m = (e && e.message) || ""; return m.replace(/^prasyarat:\s*/i, "").replace(/^ERROR:\s*/i, ""); }
  function fnErr(err) {
    var ctx = err && err.context; if (ctx && typeof ctx.json === "function") return ctx.json().then(function (j) { return (j && j.message) || "Terjadi kendala. Coba lagi."; }, function () { return "Terjadi kendala. Coba lagi."; });
    return Promise.resolve("Terjadi kendala. Coba lagi.");
  }
  var hints = [["Minimal 12 karakter", function (p) { return p.length >= 12; }], ["Minimal 3 jenis: huruf kecil, besar, angka, simbol", function (p) { return [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter(function (r) { return r.test(p); }).length >= 3; }],
    ["Tanpa kata umum / nama layanan", function (p) { return !/password|passw0rd|qwerty|123456|admin|letmein|welcome|iloveyou|abc123|nusamora/i.test(p); }], ["Tanpa karakter sama 4x berturut-turut", function (p) { return !/(.)\1{3,}/.test(p); }]];

  var S = { me: null, factors: [], all: [], level: "aal1" };

  function load() {
    if (!sb) { view.innerHTML = '<div class="card"><h2>Sistem belum dikonfigurasi</h2><p>Isi SUPABASE_URL dan SUPABASE_ANON_KEY di assets/config.js.</p></div>'; return Promise.resolve(); }
    return sb.auth.getSession().then(function (r) {
      if (!r.data || !r.data.session) { location.replace("/masuk?next=" + encodeURIComponent("/admin-keamanan")); return; }
      S.uid = (r.data.session.user && r.data.session.user.id) || "";
      return Promise.all([sb.rpc("my_admin"), sb.auth.mfa.listFactors(), sb.auth.mfa.getAuthenticatorAssuranceLevel()]).then(function (a) {
        if (a[0].error) { view.innerHTML = '<div class="card"><h2>Panel admin belum siap</h2><p>Jalankan backend/security-mfa.sql di Supabase.</p></div>'; return; }
        S.me = a[0].data; S.factors = (a[1].data && a[1].data.totp) || []; S.all = (a[1].data && a[1].data.all) || [];
        S.level = (a[2].data && a[2].data.currentLevel) || "aal1";
        if (!S.me) { view.innerHTML = '<div class="card"><h2>Khusus admin</h2><p>Akun ini bukan admin.</p><a class="btn" href="/akun">Ke dashboard pelanggan</a></div>'; return; }
        render();
      });
    }, function () { view.innerHTML = '<div class="card"><h2>Tidak bisa terhubung</h2><p>Periksa koneksi internet lalu muat ulang.</p></div>'; });
  }

  function render() {
    var m = S.me.mfa || {}, html = "";
    var verified = S.factors.length;
    html += '<div class="card"><h2>Status keamanan</h2><p>' + esc(S.me.role) + " &middot; sesi: " + pill(S.level === "aal2" ? "MFA terverifikasi" : "Hanya password", S.level === "aal2" ? "ok" : "") +
      " &middot; MFA wajib untuk admin: " + pill(m.required ? "Aktif" : "Belum diaktifkan", m.required ? "ok" : "") + " &middot; Kebijakan password: " + pill(m.password_ok ? "Terpenuhi" : "Belum", m.password_ok ? "ok" : "bad") + "</p>";
    if (m.needed) html += '<p class="sec-err" role="alert">Akses panel admin ditahan sampai ' + (m.required && S.level !== "aal2" ? "verifikasi MFA selesai" : "") + (m.password_required && !m.password_ok ? (m.required && S.level !== "aal2" ? " dan " : "") + "password diperbarui sesuai kebijakan" : "") + ".</p>";
    html += "</div>";
    if (verified && S.level !== "aal2") {
      html += '<div class="card" id="c-chal"><h2>Masukkan kode verifikasi</h2><p>Buka aplikasi autentikator (Google Authenticator, Authy, 1Password, dll.) dan masukkan kode 6 digit.</p>' +
        '<form class="sec-row" id="f-chal" novalidate><label class="sr-only" for="code">Kode 6 digit</label><input id="code" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="[0-9]{6}" placeholder="123456"><button class="btn" type="submit">Verifikasi</button></form><div class="sec-err" id="e-chal" role="alert" hidden></div></div>';
    }
    html += '<div class="card" id="c-fac"><h2>Perangkat autentikator</h2>';
    html += verified ? '<ul class="sec-list">' + S.factors.map(function (f) { return "<li><span>" + esc(f.friendly_name || "Autentikator") + " " + pill("aktif", "ok") + '</span><button class="btn o sm bad" type="button" data-rm="' + esc(f.id) + '">Hapus</button></li>'; }).join("") + "</ul>" : "<p>Belum ada perangkat terdaftar.</p>";
    if (verified === 1) html += "<p><b>Disarankan:</b> daftarkan perangkat kedua (mis. ponsel cadangan atau aplikasi di perangkat lain) sebagai cadangan jika perangkat utama hilang.</p>";
    if (!verified || S.level === "aal2") html += '<div class="sec-row"><button class="btn" type="button" id="b-enr">' + (verified ? "Tambah perangkat" : "Daftarkan aplikasi autentikator") + '</button></div><div id="enr"></div>';
    else html += "<p>Verifikasi dulu untuk menambah atau menghapus perangkat.</p>";
    html += "</div>";
    html += '<div class="card" id="c-pw"><h2>Ganti password admin</h2><p>Password admin harus lebih kuat daripada akun pelanggan.</p><form id="f-pw" novalidate>' +
      '<div class="sec-row"><label class="sr-only" for="pw1">Password baru</label><input id="pw1" type="password" autocomplete="new-password" placeholder="Password baru"></div>' +
      '<div class="sec-row"><label class="sr-only" for="pw2">Ulangi password</label><input id="pw2" type="password" autocomplete="new-password" placeholder="Ulangi password"></div>' +
      '<ul class="sec-list" id="pw-h">' + hints.map(function (h, i) { return '<li data-i="' + i + '"><span>' + esc(h[0]) + "</span>" + pill("-") + "</li>"; }).join("") + "</ul>" +
      '<div class="sec-row"><button class="btn" type="submit">Simpan password</button></div><div class="sec-err" id="e-pw" role="alert" hidden></div></form></div>';
    if (S.me.role === "super_admin" && !m.needed) html += '<div class="card" id="c-adm"><h2>Penegakan untuk semua admin</h2><div id="adm-b"><p>Memuat...</p></div></div>';
    html += '<div class="card"><h2>Kehilangan perangkat?</h2><p>Gunakan perangkat cadangan. Jika tidak ada, minta super admin lain, atau pemilik proyek Supabase, menghapus faktor MFA Anda (Dashboard Supabase &rarr; Authentication &rarr; Users, atau skrip <code>ops/security/reset-admin-mfa.mjs</code>), lalu daftar ulang di halaman ini. Prosedur lengkap: docs/security/MFA-ADMIN.md.</p></div>';
    view.innerHTML = html; wire();
  }

  function wire() {
    var f = $("#f-chal"); if (f) f.addEventListener("submit", function (e) {
      e.preventDefault(); var code = $("#code").value.trim(), er = $("#e-chal"); er.hidden = true;
      if (!/^\d{6}$/.test(code)) { er.textContent = "Masukkan 6 digit angka."; er.hidden = false; return; }
      sb.auth.mfa.challengeAndVerify({ factorId: S.factors[0].id, code: code }).then(function (r) {
        if (r.error) { er.textContent = "Kode salah atau kedaluwarsa. Coba kode terbaru."; er.hidden = false; return; }
        toast("Verifikasi berhasil.", "ok"); return sb.auth.refreshSession().then(function () { return sb.rpc("my_admin"); }).then(function (x) { if (x && x.data && x.data.mfa && !x.data.mfa.needed) location.replace(nextUrl()); else load(); });
      });
    });
    var enr = $("#b-enr"); if (enr) enr.addEventListener("click", enroll);
    Array.prototype.forEach.call(view.querySelectorAll("[data-rm]"), function (b) { b.addEventListener("click", function () {
      if (S.level !== "aal2") return toast("Verifikasi MFA dulu.", "bad");
      if (b.dataset.sure !== "1") { b.dataset.sure = "1"; b.textContent = "Yakin hapus?"; return; }
      sb.auth.mfa.unenroll({ factorId: b.dataset.rm }).then(function (r) { if (r.error) return toast("Gagal menghapus: " + cleanMsg(r.error), "bad"); toast("Perangkat dihapus.", "ok"); sb.auth.refreshSession().then(load); });
    }); });
    var pw1 = $("#pw1"); if (pw1) { var upd = function () { var p = pw1.value; Array.prototype.forEach.call($("#pw-h").children, function (li) { var ok = hints[Number(li.dataset.i)][1](p); li.lastChild.outerHTML = pill(p ? (ok ? "ok" : "belum") : "-", p ? (ok ? "ok" : "bad") : ""); }); }; pw1.addEventListener("input", upd); }
    var fp = $("#f-pw"); if (fp) fp.addEventListener("submit", function (e) {
      e.preventDefault(); var er = $("#e-pw"); er.hidden = true;
      if ($("#pw1").value !== $("#pw2").value) { er.textContent = "Kedua password tidak sama."; er.hidden = false; return; }
      sb.functions.invoke("admin-password", { body: { new_password: $("#pw1").value } }).then(function (r) {
        if (r.error) return fnErr(r.error).then(function (m) { er.textContent = m; er.hidden = false; });
        $("#pw1").value = ""; $("#pw2").value = ""; toast("Password diperbarui.", "ok"); load();
      });
    });
    if ($("#adm-b")) loadAdmin();
  }

  function enroll() {
    var box = $("#enr"), btn = $("#b-enr"); btn.disabled = true; box.innerHTML = "<p>Menyiapkan...</p>";
    var stale = S.all.filter(function (f) { return f.status === "unverified"; });
    Promise.all(stale.map(function (f) { return sb.auth.mfa.unenroll({ factorId: f.id }); })).then(function () {
      return sb.auth.mfa.enroll({ factorType: "totp", friendlyName: "Autentikator " + new Date().toLocaleDateString("id-ID") + " " + Math.random().toString(36).slice(2, 6) });
    }).then(function (r) {
      btn.disabled = false;
      if (r.error) { box.innerHTML = '<div class="sec-err" role="alert">' + esc("Gagal memulai pendaftaran: " + cleanMsg(r.error)) + "</div>"; return; }
      var t = r.data.totp, id = r.data.id;
      box.innerHTML = "<p>1. Pindai kode QR dengan aplikasi autentikator, atau masukkan kunci manual.<br>2. Masukkan kode 6 digit yang muncul.</p>" +
        '<div class="sec-qr"><img alt="Kode QR untuk aplikasi autentikator" src="' + esc(t.qr_code) + '"><div><small>Kunci manual (rahasia, jangan dibagikan):</small><code>' + esc(t.secret) + "</code></div></div>" +
        '<form class="sec-row" id="f-enr" novalidate><label class="sr-only" for="ecode">Kode 6 digit</label><input id="ecode" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="123456"><button class="btn" type="submit">Aktifkan</button></form><div class="sec-err" id="e-enr" role="alert" hidden></div>';
      $("#f-enr").addEventListener("submit", function (e) {
        e.preventDefault(); var code = $("#ecode").value.trim(), er = $("#e-enr"); er.hidden = true;
        if (!/^\d{6}$/.test(code)) { er.textContent = "Masukkan 6 digit angka."; er.hidden = false; return; }
        sb.auth.mfa.challengeAndVerify({ factorId: id, code: code }).then(function (v) {
          if (v.error) { er.textContent = "Kode salah. Pastikan jam ponsel akurat, lalu coba kode terbaru."; er.hidden = false; return; }
          toast("MFA aktif untuk akun Anda.", "ok"); sb.auth.refreshSession().then(load);
        });
      });
    });
  }

  function loadAdmin() {
    sb.rpc("security_status").then(function (r) {
      var b = $("#adm-b"); if (!b) return;
      if (r.error) { b.innerHTML = '<div class="sec-err" role="alert">' + esc(cleanMsg(r.error)) + "</div>"; return; }
      var s = r.data;
      b.innerHTML = '<div class="sec-wrap"><table class="sec-tbl"><thead><tr><th>Email</th><th>Peran</th><th>Perangkat MFA</th><th>Password</th><th>Persetujuan MFA</th></tr></thead><tbody>' +
        s.admins.map(function (a) { return "<tr><td>" + esc(a.email) + "</td><td>" + esc(a.role) + "</td><td>" + (a.factors > 0 ? pill(a.factors + " aktif", "ok") : pill("belum", "bad")) + "</td><td>" + (a.password_ok ? pill("ok", "ok") : pill("belum", "bad")) + "</td><td>" + (a.approved ? pill("disetujui", "ok") : (a.user_id !== S.uid && a.factors > 0 ? '<button class="btn o sm" type="button" data-ap="' + esc(a.user_id) + '">Setujui</button>' : pill(a.user_id === S.uid ? "perlu admin lain" : "menunggu MFA", "bad"))) + "</td></tr>"; }).join("") + "</tbody></table></div>" +
        "<p>MFA wajib: " + pill(s.mfa_required ? "AKTIF" : "belum", s.mfa_required ? "ok" : "") + " &middot; Kebijakan password wajib: " + pill(s.password_policy_required ? "AKTIF" : "belum", s.password_policy_required ? "ok" : "") + "</p>" +
        "<p>Pengaktifan ditolak otomatis bila ada admin aktif yang belum siap (mencegah terkunci). Disarankan: semua admin punya 2 perangkat.</p>" +
        '<div class="sec-row"><button class="btn" type="button" id="a-mfa">' + (s.mfa_required ? "Matikan MFA wajib" : "Aktifkan MFA wajib") + '</button><button class="btn o" type="button" id="a-pw">' + (s.password_policy_required ? "Matikan kebijakan password" : "Aktifkan kebijakan password") + '</button></div><div class="sec-err" id="e-adm" role="alert" hidden></div>';
      Array.prototype.forEach.call(b.querySelectorAll("[data-ap]"), function (x) { x.addEventListener("click", function () {
        if (x.dataset.sure !== "1") { x.dataset.sure = "1"; x.textContent = "Sudah verifikasi identitasnya? Klik lagi"; return; }
        sb.rpc("admin_approve_mfa", { p_user: x.dataset.ap }).then(function (y) { if (y.error) { var er = $("#e-adm"); er.textContent = cleanMsg(y.error); er.hidden = false; x.dataset.sure = ""; return; } toast("Admin disetujui.", "ok"); loadAdmin(); });
      }); });
      function set(mfa, pw, btn) {
        if (btn.dataset.sure !== "1") { btn.dataset.sure = "1"; btn.textContent = "Klik lagi untuk konfirmasi"; return; }
        sb.rpc("admin_set_security", { p_mfa: mfa, p_password: pw }).then(function (x) {
          var er = $("#e-adm"); if (x.error) { er.textContent = cleanMsg(x.error); er.hidden = false; btn.dataset.sure = ""; return; }
          toast("Pengaturan keamanan diperbarui.", "ok"); load();
        });
      }
      $("#a-mfa").addEventListener("click", function () { set(!s.mfa_required, s.password_policy_required, this); });
      $("#a-pw").addEventListener("click", function () { set(s.mfa_required, !s.password_policy_required, this); });
    });
  }

  $("#lo").addEventListener("click", function () { if (sb) sb.auth.signOut().then(function () { location.replace("/masuk"); }); });
  load();
})();
