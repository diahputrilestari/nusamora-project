/* NusaMora Admin: Admin & Role (menumpang pada assets/admin.js lewat window.NM_ADMIN_EXT). Penegakan akses ada di database (backend/admin-roles.sql). */
(function () {
  "use strict";
  window.NM_ADMIN_EXT = window.NM_ADMIN_EXT || [];
  window.NM_ADMIN_EXT.push(function (X) {
    var sb = X.sb, $ = X.$, esc = X.esc, toast = X.toast, empty = X.empty, skel = X.skel, errBox = X.errBox, dlgConfirm = X.dlgConfirm, can = X.can, M = X.M, A = X.A, d = document;
    var ERR = { forbidden: "Anda tidak berhak melakukan ini. Hanya Super Admin yang boleh mengelola admin dan peran.", tidak_boleh_ubah_diri_sendiri: "Anda tidak dapat mengubah peran atau status akun Anda sendiri.", super_admin_terakhir: "Super Admin aktif terakhir tidak boleh dinonaktifkan, diturunkan, atau dihapus.",
      peran_tidak_valid: "Kunci peran harus 3 sampai 30 karakter: huruf kecil, angka, garis bawah, dan diawali huruf.", label_tidak_valid: "Nama peran 2 sampai 40 karakter.", izin_tidak_valid: "Ada izin yang tidak dikenal.", izin_admins_khusus_super_admin: "Izin ubah dan hapus pada Admin & Role khusus Super Admin.",
      peran_sudah_ada: "Kunci peran itu sudah dipakai.", peran_super_admin_terkunci: "Peran Super Admin tidak bisa diubah.", peran_bawaan_tidak_bisa_dihapus: "Peran bawaan tidak bisa dihapus.", peran_masih_dipakai: "Peran masih dipakai admin. Pindahkan admin tersebut dulu.",
      peran_tidak_ditemukan: "Peran tidak ditemukan.", admin_tidak_ditemukan: "Admin tidak ditemukan.", tidak_ada_preset: "Peran ini tidak punya preset bawaan.", nilai_tidak_valid: "Ada nilai pembatasan yang tidak valid.", batas_tidak_aktif_tidak_valid: "Pilih Mati atau minimal 5 menit.", "belum terdaftar": "Email itu belum mendaftar sebagai pengguna. Minta orangnya mendaftar di /daftar dulu." };
    var errText = function (e) { var m = String(e && (e.message || e.error || e) || ""), k = Object.keys(ERR).filter(function (x) { return m.indexOf(x) > -1; })[0]; return k ? ERR[k] : "Gagal: " + m.slice(0, 120); };
    var jak = function (fn) { return new Promise(function (res, rej) { Promise.resolve(fn()).then(function (r) { if (r && r.error) rej(r.error); else res(r.data); }, rej); }); };
    var wib = function (s) { if (!s) return "-"; var x = new Date(s); return isNaN(x) ? "-" : x.toLocaleString("id-ID", { timeZone: "Asia/Jakarta", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }); };
    var xBtn = '<button class="icon-btn x" type="button" data-close aria-label="Tutup"><svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button>';
    var MODS = { dashboard: "Dasbor", customers: "Pelanggan", invitations: "Undangan", templates: "Template", live: "Live Guest", transactions: "Transaksi", plans: "Paket & Harga", content: "Manajemen Konten", affiliate: "Affiliate & Referral", support: "Customer Support", reports: "Laporan", notifications: "Notifikasi", settings: "Pengaturan Sistem", admins: "Admin & Role", dating: "Mode Dating (tamu)" };
    var CTYPES = [["banner", "Banner"], ["faq", "FAQ"], ["tutorial", "Tutorial"], ["article", "Artikel"], ["page", "Halaman"]];
    var REASON = { keluar: "Keluar", dipaksa_keluar: "Dipaksa keluar", tidak_aktif: "Tidak aktif", sesi_dicabut: "Sesi dicabut" };
    var ALERT = { admin_new_ip: "Login dari IP baru", admin_new_device: "Login dari perangkat baru", admin_force_logout: "Paksa keluar", admin_access_settings_changed: "Pengaturan akses diubah" };
    var isSuper = function () { return A.role === "super_admin"; };
    var canW = function () { return can("admins", "write"); };
    var roleLabel = function (R, k) { var r = (R || []).filter(function (x) { return x.key === k; })[0]; return r ? r.label : k; };

    if (!d.getElementById("ar-css")) {
      var st = d.createElement("style"); st.id = "ar-css";
      st.textContent = ".ar-d [hidden]{display:none!important}#view #body{grid-template-columns:minmax(0,1fr)}#view #body>*{min-width:0}dialog.ar-d{max-width:820px;width:calc(100% - 32px)}.ar-d .tbl-w{max-width:100%;overflow-x:auto}.ar-d>*{min-width:0}.ar-d h2{overflow-wrap:anywhere}.ar-f{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(min(240px,100%),1fr))}.ar-f .full{grid-column:1/-1}.ar-e{color:var(--bad,#b3261e);min-height:1.2em}.ar-tool{display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end;margin-bottom:14px}.ar-tool .fld{min-width:160px}.ar-warn{border-left:4px solid var(--warn,#b26a00);padding:10px 14px;margin-bottom:14px}.ar-code{font-family:ui-monospace,monospace;font-size:.82rem;word-break:break-all}.ar-sec{margin:18px 0 6px;font-size:1rem}.ar-chk{display:flex;flex-wrap:wrap;gap:6px 14px}.ar-chk label{display:inline-flex;gap:6px;align-items:center}.ar-mx td,.ar-mx th{text-align:center}.ar-mx td:first-child,.ar-mx th:first-child{text-align:left}.ar-pg{display:flex;gap:10px;align-items:center;justify-content:flex-end;margin-top:12px}.ar-btns{display:flex;gap:8px;flex-wrap:wrap}.ar-diff td{vertical-align:top;word-break:break-word;max-width:260px}.ar-cards{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(min(220px,100%),1fr));margin-bottom:16px}.ar-cards .card{padding:14px;min-width:0}.ar-cards b{display:block;font-size:1.25rem;overflow-wrap:anywhere}";
      d.head.appendChild(st);
    }
    function dialog(id) { var dl = $("#" + id); if (dl) dl.remove(); dl = d.createElement("dialog"); dl.id = id; dl.className = "wide ar-d"; dl.setAttribute("aria-labelledby", id + "-t"); d.body.appendChild(dl); dl.addEventListener("click", function (e) { if (e.target.closest("[data-close]")) dl.close(); }); return dl; }
    var badgeOn = function (b, y, n) { return '<span class="badge ' + (b ? "ok" : "warn") + '">' + esc(b ? y : n) + "</span>"; };
    var loadRoles = function () { return jak(function () { return sb.rpc("admin_roles_overview"); }); };

    /* ---------- Pelacak sesi: catat sesi ini, tutup panel bila sesi dicabut ---------- */
    (function () {
      var last = 0, act = true, busy = false;
      function ping() {
        if (busy) return; busy = true; last = Date.now();
        Promise.resolve(sb.rpc("admin_session_ping")).then(function (r) {
          busy = false; var v = r && r.data;
          if (v && v.revoked) { toast(v.reason === "tidak_aktif" ? "Sesi admin berakhir karena tidak aktif." : "Sesi admin ini telah diakhiri.", "bad"); setTimeout(function () { sb.auth.signOut().then(function () { location.replace("/masuk?next=/admin"); }); }, 1200); }
        }, function () { busy = false; });
      }
      try {
        sb.auth.getSession().then(function (s) {
          if (!(s && s.data && s.data.session)) return; ping();
          setInterval(function () { if (!d.hidden && act) { act = false; ping(); } }, 120000);
          ["click", "keydown", "mousemove", "touchstart"].forEach(function (ev) { d.addEventListener(ev, function () { act = true; if (Date.now() - last > 60000) ping(); }, { passive: true }); });
        });
      } catch (e) { /* abaikan */ }
    })();

    /* ---------- Admin Users ---------- */
    function renderUsers(root) {
      root.innerHTML = skel();
      Promise.all([jak(function () { return sb.rpc("admin_admins_overview"); }), loadRoles()]).then(function (v) {
        var rows = v[0] || [], R = v[1], W = canW() && isSuper();
        root.innerHTML = '<div class="ar-tool">' + (W ? '<button class="btn" type="button" id="ad-new">Tambah admin</button>' : "") + '<span class="sub">' + rows.filter(function (x) { return x.active; }).length + " admin aktif dari " + rows.length + '. Hanya Super Admin yang bisa menambah, mengubah, atau menonaktifkan admin.</span></div>' +
          '<div class="card tbl-w"><table><thead><tr><th>Admin</th><th>Peran</th><th>Status</th><th>MFA</th><th>Sesi aktif</th><th>Terakhir terlihat</th><th>Pembatasan data</th><th></th></tr></thead><tbody>' +
          rows.map(function (u) {
            var sc = u.scopes || {}, n = (sc.template_category || []).length + (sc.content_type || []).length;
            return "<tr><td><b>" + esc(u.email) + '</b><div class="cell-s">Login terakhir: ' + esc(wib(u.last_sign_in_at)) + "</div></td><td>" + esc(u.role_label || u.role) + "</td><td>" + badgeOn(u.active, "Aktif", "Nonaktif") + "</td><td>" + (u.mfa_factors > 0 ? '<span class="badge ok">Aktif</span>' : '<span class="badge mut">Belum</span>') + "</td><td>" + esc(u.live_sessions) +
              "</td><td>" + esc(wib(u.last_seen)) + (u.last_ip ? '<div class="cell-s">IP ' + esc(u.last_ip) + "</div>" : "") + "</td><td>" + (n ? '<span class="badge warn">' + n + " pembatasan</span>" : '<span class="badge mut">Tidak ada</span>') + '</td><td><button class="btn o sm" type="button" data-u="' + esc(u.user_id) + '">' + (W ? "Kelola" : "Lihat") + "</button></td></tr>";
          }).join("") + "</tbody></table></div>";
        if ($("#ad-new")) $("#ad-new").onclick = function () { addAdmin(R, function () { renderUsers(root); }); };
        root.onclick = function (ev) { var b = ev.target.closest("[data-u]"); if (b) manage(rows.filter(function (x) { return x.user_id === b.dataset.u; })[0], R, W, function () { renderUsers(root); }); };
      }).catch(function (e) { root.innerHTML = errBox(e && e.code === "42501" ? "Anda tidak punya izin melihat admin." : "Daftar admin tidak bisa dimuat. Pastikan backend/admin-roles.sql sudah dijalankan.", 1); });
    }
    function roleOpts(R, sel) { return (R.roles || []).map(function (r) { return '<option value="' + esc(r.key) + '"' + (r.key === sel ? " selected" : "") + ">" + esc(r.label) + "</option>"; }).join(""); }
    function addAdmin(R, done) {
      var dl = dialog("ar-add");
      dl.innerHTML = xBtn + '<h2 id="ar-add-t">Tambah admin</h2><form id="af" class="ar-f" novalidate><label class="fld full">Email akun terdaftar<input id="a-em" type="email" maxlength="200" autocomplete="off"><small>Orang ini harus sudah mendaftar di /daftar.</small></label><label class="fld full">Peran<select id="a-role">' + roleOpts(R, "admin") + '</select></label><p class="ar-e full" id="a-e" role="alert"></p><div class="ar-btns full"><button class="btn" type="submit">Tambah</button><button class="btn o" type="button" data-close>Batal</button></div></form>';
      dl.showModal();
      $("#af").onsubmit = function (e) { e.preventDefault(); var em = $("#a-em").value.trim(); if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) return ($("#a-e").textContent = "Email tidak valid.");
        sb.rpc("admin_add_admin", { p_email: em, p_role: $("#a-role").value }).then(function (r) { if (r.error) return ($("#a-e").textContent = errText(r.error)); toast("Admin ditambahkan.", "ok"); dl.close(); done(); }); };
    }
    function manage(u, R, W, done) {
      var dl = dialog("ar-mg"), self = u.user_id === A.user.id, sc = u.scopes || {};
      var chk = function (arr, key, sel) { return arr.map(function (o) { return '<label><input type="checkbox" data-sc="' + key + '" value="' + esc(o[0]) + '"' + (sel.indexOf(o[0]) > -1 ? " checked" : "") + (W ? "" : " disabled") + "> " + esc(o[1]) + "</label>"; }).join(""); };
      dl.innerHTML = xBtn + '<h2 id="ar-mg-t">' + esc(u.email) + "</h2>" +
        '<p class="sub">' + badgeOn(u.active, "Aktif", "Nonaktif") + " &nbsp;MFA: " + (u.mfa_factors > 0 ? "terdaftar" : "belum terdaftar") + " &nbsp;Dibuat " + esc(wib(u.created_at)) + "</p>" + (self ? '<p class="note">Ini akun Anda. Peran dan status tidak bisa Anda ubah sendiri.</p>' : "") +
        '<h3 class="ar-sec">Peran</h3><div class="ar-tool"><label class="fld">Peran<select id="m-role"' + (W && !self ? "" : " disabled") + ">" + roleOpts(R, u.role) + "</select></label>" + (W && !self ? '<button class="btn" type="button" id="m-rs">Simpan peran</button>' : "") + "</div>" +
        '<h3 class="ar-sec">Pembatasan akses data</h3><p class="sub">Kosong berarti tanpa pembatasan. Pembatasan berlaku di database untuk tabel Template dan Konten. Peran tetap menentukan menu dan aksi.</p>' +
        '<fieldset class="chk"><legend>Kategori template yang boleh diakses</legend><div class="ar-chk">' + (R.categories || []).map(function (c) { return [c.id, c.name]; }).reduce(function (h, o) { return h + chk([o], "template_category", sc.template_category || []); }, "") + '</div></fieldset><fieldset class="chk"><legend>Tipe konten yang boleh diakses</legend><div class="ar-chk">' + chk(CTYPES, "content_type", sc.content_type || []) + "</div></fieldset>" +
        (W ? '<div class="ar-tool" style="margin-top:10px"><button class="btn" type="button" id="m-ss">Simpan pembatasan</button></div>' : "") +
        '<h3 class="ar-sec">Sesi aktif</h3><div id="m-ses">' + skel() + "</div>" +
        '<p class="ar-e" id="m-e" role="alert"></p><div class="ar-btns">' + (W && !self ? (u.active ? '<button class="btn o bad" type="button" id="m-act">Nonaktifkan admin</button>' : '<button class="btn o" type="button" id="m-act">Aktifkan admin</button>') : "") + '<button class="btn o" type="button" data-close>Tutup</button></div>';
      dl.showModal();
      var err = function (m) { $("#m-e").textContent = m || ""; };
      var ses = function () {
        jak(function () { return sb.rpc("admin_sessions_list", { p_user: u.user_id, p_active: true, p_limit: 50 }); }).then(function (r) {
          var rows = r.rows || [], canK = W || self;
          $("#m-ses").innerHTML = rows.length ? '<div class="tbl-w"><table><thead><tr><th>Perangkat</th><th>IP</th><th>Login</th><th>Terakhir aktif</th><th></th></tr></thead><tbody>' + rows.map(function (s) { return "<tr><td>" + esc(s.device || "-") + (s.current ? ' <span class="badge ok">Sesi ini</span>' : "") + "</td><td>" + esc(s.ip || "-") + "</td><td>" + esc(wib(s.first_seen)) + "</td><td>" + esc(wib(s.last_seen)) + "</td><td>" + (canK && !s.current ? '<button class="btn o sm" type="button" data-k="' + esc(s.session_id) + '">Keluarkan</button>' : "") + "</td></tr>"; }).join("") + "</tbody></table></div>" + (canK && rows.length ? '<div class="ar-tool" style="margin-top:10px"><button class="btn o bad" type="button" id="m-ka">Keluarkan dari semua perangkat' + (self ? " lain" : "") + "</button></div>" : "") : '<p class="sub">Tidak ada sesi admin aktif tercatat.</p>';
        }, function () { $("#m-ses").innerHTML = errBox("Sesi tidak bisa dimuat.", 0); });
      };
      ses();
      var kick = function (sid, all) { dlgConfirm(all ? "Keluarkan " + (self ? "dari semua perangkat lain?" : u.email + " dari semua perangkat? Akun ini juga akan keluar dari dashboard pelanggan.") : "Keluarkan sesi ini? Akses admin pada perangkat itu langsung berhenti.", "Keluarkan").then(function (y) { if (!y) return;
        sb.rpc("admin_force_logout", { p_user: u.user_id, p_session: sid || null, p_keep_current: self }).then(function (r) { if (r.error) return err(errText(r.error)); toast(r.data + " sesi dikeluarkan.", "ok"); ses(); }); }); };
      dl.onclick = function (ev) { if (ev.target.closest("[data-close]")) return dl.close(); var b = ev.target.closest("[data-k]"); if (b) return kick(b.dataset.k, false); if (ev.target.closest("#m-ka")) kick(null, true); };
      if (W && !self) {
        $("#m-rs").onclick = function () { err(""); sb.rpc("admin_set_role", { p_user: u.user_id, p_role: $("#m-role").value }).then(function (r) { if (r.error) return err(errText(r.error)); toast("Peran disimpan.", "ok"); dl.close(); done(); }); };
        $("#m-act").onclick = function () { var to = !u.active; dlgConfirm(to ? "Aktifkan admin ini?" : "Nonaktifkan admin ini? Ia tidak lagi punya akses panel admin (akun pelanggannya tetap ada).", to ? "Aktifkan" : "Nonaktifkan").then(function (y) { if (!y) return; sb.rpc("admin_set_active", { p_user: u.user_id, p_active: to }).then(function (r) { if (r.error) return err(errText(r.error)); toast(to ? "Admin diaktifkan." : "Admin dinonaktifkan.", "ok"); dl.close(); done(); }); }); };
      }
      if (W) $("#m-ss").onclick = function () {
        err(""); var pick = function (k) { return Array.prototype.map.call(dl.querySelectorAll('[data-sc="' + k + '"]:checked'), function (c) { return c.value; }); };
        sb.rpc("admin_scope_set", { p_user: u.user_id, p_kind: "template_category", p_values: pick("template_category") }).then(function (a) { if (a.error) return err(errText(a.error));
          return sb.rpc("admin_scope_set", { p_user: u.user_id, p_kind: "content_type", p_values: pick("content_type") }).then(function (b) { if (b.error) return err(errText(b.error)); toast("Pembatasan disimpan.", "ok"); dl.close(); done(); }); });
      };
    }

    /* ---------- Peran & Izin ---------- */
    function renderRoles(root) {
      root.innerHTML = skel();
      loadRoles().then(function (R) {
        var W = canW() && isSuper(), roles = R.roles || [], letter = function (r, m) { var p = r.perms || []; return (p.indexOf(m + ".read") > -1 ? "B" : "-") + (p.indexOf(m + ".write") > -1 ? "T" : "-") + (p.indexOf(m + ".delete") > -1 ? "H" : "-"); };
        root.innerHTML = '<div class="ar-tool">' + (W ? '<button class="btn" type="button" id="rl-new">Buat peran baru</button>' : "") + '<span class="sub">Izin per menu dan aksi: Lihat (B), Ubah (T), Hapus (H). Database yang menegakkan, bukan hanya tampilan.</span></div>' +
          '<div class="card tbl-w"><table><thead><tr><th>Peran</th><th>Deskripsi</th><th>Anggota aktif</th><th>Jenis</th><th></th></tr></thead><tbody>' + roles.map(function (r) { return "<tr><td><b>" + esc(r.label) + '</b><div class="cell-s ar-code">' + esc(r.key) + "</div></td><td>" + esc(r.description || "-") + "</td><td>" + esc(r.members) + "</td><td>" + (r.is_system ? '<span class="badge mut">Bawaan</span>' : '<span class="badge ok">Kustom</span>') + '</td><td><button class="btn o sm" type="button" data-r="' + esc(r.key) + '">' + (W && r.key !== "super_admin" ? "Kelola" : "Lihat") + "</button></td></tr>"; }).join("") + "</tbody></table></div>" +
          '<div class="card"><h3>Ringkasan izin</h3><p class="sub">B = lihat, T = ubah, H = hapus.</p><div class="tbl-w"><table class="ar-mx"><thead><tr><th>Menu</th>' + roles.map(function (r) { return "<th>" + esc(r.label) + "</th>"; }).join("") + "</tr></thead><tbody>" + (R.modules || []).map(function (m) { return "<tr><td><b>" + esc(MODS[m] || m) + "</b></td>" + roles.map(function (r) { var l = letter(r, m); return '<td><span class="' + (l === "---" ? "no" : "yes") + '">' + esc(l) + "</span></td>"; }).join("") + "</tr>"; }).join("") + "</tbody></table></div></div>";
        if ($("#rl-new")) $("#rl-new").onclick = function () { editRole(null, R, W, function () { renderRoles(root); }); };
        root.onclick = function (ev) { var b = ev.target.closest("[data-r]"); if (b) editRole(roles.filter(function (x) { return x.key === b.dataset.r; })[0], R, W, function () { renderRoles(root); }); };
      }).catch(function (e) { root.innerHTML = errBox(e && e.code === "42501" ? "Anda tidak punya izin melihat peran." : "Peran tidak bisa dimuat. Pastikan backend/admin-roles.sql sudah dijalankan.", 1); });
    }
    function editRole(r, R, W, done) {
      var dl = dialog("ar-rl"), isNew = !r, locked = r && r.key === "super_admin", ro = !W || locked; r = r || { key: "", label: "", description: "", perms: [], members: 0, is_system: false };
      var has = function (p) { return r.perms.indexOf(p) > -1; };
      dl.innerHTML = xBtn + '<h2 id="ar-rl-t">' + (isNew ? "Buat peran" : esc(r.label)) + '</h2>' + (locked ? '<p class="note">Super Admin selalu memiliki semua izin dan tidak bisa diubah.</p>' : "") +
        '<form id="rf" class="ar-f" novalidate><label class="fld">Kunci peran<input id="r-k" maxlength="30" value="' + esc(r.key) + '"' + (isNew && !ro ? "" : " disabled") + ' placeholder="contoh: marketing"><small>Huruf kecil, angka, garis bawah. Tidak bisa diubah nanti.</small></label><label class="fld">Nama peran<input id="r-l" maxlength="40" value="' + esc(r.label) + '"' + (ro ? " disabled" : "") + '></label><label class="fld full">Deskripsi<input id="r-d" maxlength="200" value="' + esc(r.description || "") + '"' + (ro ? " disabled" : "") + "></label>" +
        '<div class="full tbl-w"><table class="ar-mx"><thead><tr><th>Menu</th><th>Lihat</th><th>Ubah</th><th>Hapus</th></tr></thead><tbody>' + (R.modules || []).map(function (m) { var su = m === "admins"; return "<tr><td><b>" + esc(MODS[m] || m) + "</b></td>" + ["read", "write", "delete"].map(function (a) { var dis = ro || (su && a !== "read"); return '<td><input type="checkbox" data-p="' + m + "." + a + '" aria-label="' + esc((MODS[m] || m) + " " + a) + '"' + (has(m + "." + a) || locked ? " checked" : "") + (dis ? " disabled" : "") + (su && a !== "read" ? ' title="Khusus Super Admin"' : "") + "></td>"; }).join("") + "</tr>"; }).join("") + "</tbody></table></div>" +
        '<p class="sub full">Ubah otomatis mencakup Lihat; Hapus mencakup Ubah dan Lihat. Mengelola admin dan peran selalu khusus Super Admin.</p><p class="ar-e full" id="r-e" role="alert"></p><div class="ar-btns full">' + (!ro ? '<button class="btn" type="submit">Simpan</button>' : "") + (!ro && r.is_system && r.preset ? '<button class="btn o" type="button" id="r-pre">Kembalikan ke bawaan</button>' : "") + (!ro && !isNew && !r.is_system ? '<button class="btn o bad" type="button" id="r-del">Hapus peran</button>' : "") + '<button class="btn o" type="button" data-close>Tutup</button></div></form>';
      dl.showModal();
      var err = function (m) { $("#r-e").textContent = m || ""; };
      var cb = function (p) { return dl.querySelector('[data-p="' + p + '"]'); };
      dl.addEventListener("change", function (ev) { var c = ev.target.closest("[data-p]"); if (!c) return; var m = c.dataset.p.split(".")[0], a = c.dataset.p.split(".")[1], rd = cb(m + ".read"), wr = cb(m + ".write"), dlx = cb(m + ".delete");
        if (c.checked) { if (a !== "read" && !rd.disabled) rd.checked = true; if (a === "delete" && !wr.disabled) wr.checked = true; } else { if (a === "read") { if (!wr.disabled) wr.checked = false; if (!dlx.disabled) dlx.checked = false; } if (a === "write" && !dlx.disabled) dlx.checked = false; } });
      var perms = function () { return Array.prototype.map.call(dl.querySelectorAll("[data-p]:checked"), function (c) { return c.dataset.p; }); };
      if (!ro) $("#rf").onsubmit = function (ev) { ev.preventDefault(); err("");
        sb.rpc("admin_role_save", { p_key: $("#r-k").value.trim(), p_label: $("#r-l").value.trim(), p_desc: $("#r-d").value.trim(), p_perms: perms(), p_new: isNew }).then(function (x) { if (x.error) return err(errText(x.error)); toast("Peran disimpan.", "ok"); dl.close(); done(); }); };
      else $("#rf").onsubmit = function (ev) { ev.preventDefault(); };
      if ($("#r-pre")) $("#r-pre").onclick = function () { dlgConfirm("Kembalikan izin peran ini ke pengaturan bawaan? Izin yang Anda tambahkan akan dihapus.", "Kembalikan").then(function (y) { if (!y) return; sb.rpc("admin_role_apply_preset", { p_key: r.key }).then(function (x) { if (x.error) return err(errText(x.error)); toast("Izin dikembalikan ke bawaan.", "ok"); dl.close(); done(); }); }); };
      if ($("#r-del")) $("#r-del").onclick = function () { dlgConfirm("Hapus peran \"" + r.label + "\"? Tidak bisa dibatalkan.", "Hapus").then(function (y) { if (!y) return; sb.rpc("admin_role_delete", { p_key: r.key }).then(function (x) { if (x.error) return err(errText(x.error)); toast("Peran dihapus.", "ok"); dl.close(); done(); }); }); };
    }

    /* ---------- Sesi & Login ---------- */
    function renderSessions(root) {
      var S = { user: "", flagged: false, active: false, page: 0 }, SIZE = 25;
      root.innerHTML = skel();
      jak(function () { return sb.rpc("admin_admins_overview"); }).then(function (admins) {
        root.innerHTML = '<p class="note">Riwayat login admin. IP dan perangkat diambil server dari permintaan saat sesi pertama kali tercatat. Login dari IP atau perangkat yang belum pernah dipakai admin itu ditandai. Kegagalan login belum tercatat di sini.</p><div class="ar-tool"><label class="fld">Admin<select id="s-u"><option value="">Semua</option>' + admins.map(function (a) { return '<option value="' + esc(a.user_id) + '">' + esc(a.email) + "</option>"; }).join("") + '</select></label><label class="chk-l"><input type="checkbox" id="s-f"> Hanya IP/perangkat baru</label><label class="chk-l"><input type="checkbox" id="s-a"> Hanya yang masih aktif</label></div><div id="s-t"></div>';
        var W = canW() && isSuper();
        var load = function () {
          $("#s-t").innerHTML = skel();
          jak(function () { return sb.rpc("admin_sessions_list", { p_user: S.user || null, p_flagged: S.flagged, p_active: S.active, p_limit: SIZE, p_offset: S.page * SIZE }); }).then(function (r) {
            var rows = r.rows || [], total = r.total || 0;
            $("#s-t").innerHTML = rows.length ? '<div class="card tbl-w"><table><thead><tr><th>Admin</th><th>Perangkat</th><th>IP</th><th>Login</th><th>Terakhir aktif</th><th>Status</th><th></th></tr></thead><tbody>' + rows.map(function (s) {
              var stt = s.live ? '<span class="badge ok">Aktif</span>' : s.ended_at ? '<span class="badge mut">' + esc(REASON[s.ended_reason] || "Berakhir") + "</span>" : '<span class="badge mut">Kedaluwarsa</span>';
              return "<tr><td>" + esc(s.email) + "</td><td>" + esc(s.device || "-") + (s.new_device ? ' <span class="badge warn">Perangkat baru</span>' : "") + "</td><td>" + esc(s.ip || "-") + (s.new_ip ? ' <span class="badge warn">IP baru</span>' : "") + "</td><td>" + esc(wib(s.first_seen)) + "</td><td>" + esc(wib(s.last_seen)) + "</td><td>" + stt + (s.current ? ' <span class="badge ok">Sesi ini</span>' : "") + "</td><td>" + (s.live && !s.current && (W || s.user_id === A.user.id) ? '<button class="btn o sm" type="button" data-k="' + esc(s.session_id) + '" data-uid="' + esc(s.user_id) + '">Keluarkan</button>' : "") + "</td></tr>";
            }).join("") + '</tbody></table></div><div class="ar-pg"><span class="sub">' + (S.page * SIZE + 1) + "-" + (S.page * SIZE + rows.length) + " dari " + total + '</span><button class="btn o sm" type="button" id="s-p"' + (S.page ? "" : " disabled") + '>Sebelumnya</button><button class="btn o sm" type="button" id="s-n"' + ((S.page + 1) * SIZE >= total ? " disabled" : "") + ">Berikutnya</button></div>" : empty("Belum ada riwayat", "Riwayat tercatat saat admin membuka panel ini setelah backend/admin-roles.sql dijalankan.");
            if ($("#s-p")) { $("#s-p").onclick = function () { S.page--; load(); }; $("#s-n").onclick = function () { S.page++; load(); }; }
          }, function () { $("#s-t").innerHTML = errBox("Riwayat tidak bisa dimuat.", 0); });
        };
        $("#s-u").onchange = function () { S.user = this.value; S.page = 0; load(); }; $("#s-f").onchange = function () { S.flagged = this.checked; S.page = 0; load(); }; $("#s-a").onchange = function () { S.active = this.checked; S.page = 0; load(); };
        root.onclick = function (ev) { var b = ev.target.closest("[data-k]"); if (!b) return; dlgConfirm("Keluarkan sesi ini? Akses admin pada perangkat itu langsung berhenti.", "Keluarkan").then(function (y) { if (!y) return; sb.rpc("admin_force_logout", { p_user: b.dataset.uid, p_session: b.dataset.k, p_keep_current: false }).then(function (r) { if (r.error) return toast(errText(r.error), "bad"); toast("Sesi dikeluarkan.", "ok"); load(); }); }); };
        load();
      }).catch(function (e) { root.innerHTML = errBox(e && e.code === "42501" ? "Anda tidak punya izin melihat riwayat login." : "Riwayat tidak bisa dimuat. Pastikan backend/admin-roles.sql sudah dijalankan.", 1); });
    }

    /* ---------- Keamanan Akses ---------- */
    function renderSecurity(root) {
      root.innerHTML = skel();
      Promise.all([jak(function () { return sb.rpc("admin_access_get"); }), jak(function () { return sb.rpc("admin_security_alerts", { p_limit: 30 }); })]).then(function (v) {
        var g = v[0], al = v[1] || [], W = canW() && isSuper(), idleOpts = [[0, "Mati"], [15, "15 menit"], [30, "30 menit"], [60, "1 jam"], [120, "2 jam"], [480, "8 jam"]];
        root.innerHTML = '<div class="ar-cards"><div class="card"><span class="sub">Admin aktif</span><b>' + esc(g.admins_active) + '</b></div><div class="card"><span class="sub">Admin dengan MFA terdaftar</span><b>' + esc(g.admins_with_mfa) + " / " + esc(g.admins_active) + '</b></div><div class="card"><span class="sub">MFA wajib</span><b>' + (g.mfa_available ? (g.mfa_required ? "Aktif" : "Belum diaktifkan") : "Tidak tersedia") + "</b></div></div>" +
          '<div class="card"><h3>MFA admin</h3><p class="sub">' + (g.mfa_available ? "Penegakan MFA wajib diatur terpisah lewat prosedur di docs/security/MFA-ADMIN.md setelah semua admin mendaftarkan faktor. Halaman ini tidak mengaktifkannya." : "backend/security-mfa.sql belum dipasang di database ini, jadi MFA wajib belum bisa ditegakkan. Admin tetap bisa mendaftarkan MFA sendiri.") + ' <a href="/admin-keamanan">Kelola MFA akun saya</a></p></div>' +
          '<form class="card ar-f" id="sf" novalidate><h3 class="full">Batas tidak aktif</h3><p class="note full">Bila aktif, sesi admin yang tidak ada aktivitas lebih lama dari batas ditolak oleh database dan admin harus login lagi. Panel mengirim sinyal aktivitas tiap beberapa menit selama Anda aktif.</p><label class="fld">Batas<select id="sf-i"' + (W ? "" : " disabled") + ">" + idleOpts.map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === g.idle_timeout_min ? " selected" : "") + ">" + o[1] + "</option>"; }).join("") + '</select></label><p class="ar-e full" id="sf-e" role="alert"></p>' + (W ? '<div class="full"><button class="btn" type="submit">Simpan</button></div>' : "") + "</form>" +
          '<div class="card"><h3>Peringatan akses</h3><p class="sub">Login dari IP atau perangkat baru, paksa keluar, dan perubahan pengaturan akses.</p>' + (al.length ? '<div class="tbl-w"><table><thead><tr><th>Waktu</th><th>Kejadian</th><th>Admin</th><th>Rincian</th></tr></thead><tbody>' + al.map(function (a) { var dt = a.detail || {}; return "<tr><td>" + esc(wib(a.at)) + "</td><td>" + esc(ALERT[a.kind] || a.kind) + "</td><td>" + esc(a.email || a.actor || "-") + '</td><td class="ar-code">' + esc(Object.keys(dt).map(function (k) { return k + ": " + dt[k]; }).join(", ")) + "</td></tr>"; }).join("") + "</tbody></table></div>" : empty("Belum ada peringatan", "Peringatan muncul saat ada login dari IP atau perangkat baru.")) + "</div>" +
          '<div class="card"><h3>Kebijakan yang berlaku</h3><ul><li>Hanya Super Admin yang bisa menambah admin, mengubah peran, dan mengubah izin; admin tidak bisa mengubah dirinya sendiri; Super Admin aktif terakhir tidak bisa dihapus atau diturunkan.</li><li>Paksa keluar mencabut sesi di database, jadi berlaku seketika.</li><li>IP berasal dari header gateway Supabase pada saat sesi pertama kali tercatat. Pembatasan akses berdasarkan IP belum ada; yang ada hanya pemantauan dan peringatan.</li></ul></div>';
        $("#sf").onsubmit = function (e) { e.preventDefault(); if (!W) return; $("#sf-e").textContent = ""; sb.rpc("admin_access_set", { p_idle_min: parseInt($("#sf-i").value, 10) }).then(function (r) { if (r.error) return ($("#sf-e").textContent = errText(r.error)); toast("Pengaturan disimpan.", "ok"); }); };
      }).catch(function (e) { root.innerHTML = errBox(e && e.code === "42501" ? "Anda tidak punya izin melihat keamanan akses." : "Data keamanan tidak bisa dimuat. Pastikan backend/admin-roles.sql sudah dijalankan.", 1); });
    }

    /* ---------- Audit Log ---------- */
    function renderAudit(root) {
      var S = { actor: "", table: "", action: "", from: "", to: "", q: "", page: 0 }, SIZE = 25, last = null;
      root.innerHTML = skel();
      jak(function () { return sb.rpc("admin_audit_facets"); }).then(function (F) {
        var opt = function (arr, f) { return arr.map(f).join(""); };
        root.innerHTML = '<p class="note">Catatan otomatis perubahan konfigurasi, transaksi, dan data admin oleh admin. Tidak bisa diubah atau dihapus dari panel.</p><form class="ar-tool" id="au-f"><label class="fld">Admin<select id="au-a"><option value="">Semua</option>' + opt(F.actors || [], function (a) { return '<option value="' + esc(a.id) + '">' + esc(a.email) + "</option>"; }) + '</select></label><label class="fld">Tabel<select id="au-t"><option value="">Semua</option>' + opt(F.tables || [], function (t) { return '<option value="' + esc(t) + '">' + esc(t) + "</option>"; }) + '</select></label><label class="fld">Aksi<select id="au-x"><option value="">Semua</option>' + opt(F.actions || [], function (t) { return '<option value="' + esc(t) + '">' + esc(t) + "</option>"; }) + '</select></label><label class="fld">Dari<input type="date" id="au-d1"></label><label class="fld">Sampai<input type="date" id="au-d2"></label><label class="fld">Cari<input id="au-q" maxlength="80" placeholder="tabel, aksi, ID, isi"></label><button class="btn" type="submit">Terapkan</button><button class="btn o" type="button" id="au-csv">Ekspor CSV</button></form><div id="au-t2"></div>';
        var args = function (lim, off) { return { p_actor: S.actor || null, p_table: S.table || null, p_action: S.action || null, p_from: S.from ? new Date(S.from + "T00:00:00+07:00").toISOString() : null, p_to: S.to ? new Date(new Date(S.to + "T00:00:00+07:00").getTime() + 86400000).toISOString() : null, p_q: S.q || null, p_limit: lim, p_offset: off }; };
        var load = function () {
          $("#au-t2").innerHTML = skel();
          jak(function () { return sb.rpc("admin_audit_list", args(SIZE, S.page * SIZE)); }).then(function (r) {
            last = r; var rows = r.rows || [], total = r.total || 0;
            $("#au-t2").innerHTML = rows.length ? '<div class="card tbl-w"><table><thead><tr><th>Waktu (WIB)</th><th>Admin</th><th>Aksi</th><th>Tabel</th><th>ID baris</th><th></th></tr></thead><tbody>' + rows.map(function (a, i) { return "<tr><td>" + esc(wib(a.created_at)) + "</td><td>" + esc(a.actor_email || (a.actor_id ? String(a.actor_id).slice(0, 8) : "sistem")) + "</td><td>" + esc(a.action) + "</td><td>" + esc(a.table_name || "-") + '</td><td class="ar-code">' + esc(String(a.row_id || "-").slice(0, 14)) + '</td><td><button class="btn o sm" type="button" data-i="' + i + '">Detail</button></td></tr>'; }).join("") + '</tbody></table></div><div class="ar-pg"><span class="sub">' + (S.page * SIZE + 1) + "-" + (S.page * SIZE + rows.length) + " dari " + total + '</span><button class="btn o sm" type="button" id="au-p"' + (S.page ? "" : " disabled") + '>Sebelumnya</button><button class="btn o sm" type="button" id="au-n"' + ((S.page + 1) * SIZE >= total ? " disabled" : "") + ">Berikutnya</button></div>" : empty("Tidak ada catatan", "Ubah filter untuk melihat catatan lain.");
            if ($("#au-p")) { $("#au-p").onclick = function () { S.page--; load(); }; $("#au-n").onclick = function () { S.page++; load(); }; }
          }, function () { $("#au-t2").innerHTML = errBox("Audit log tidak bisa dimuat.", 0); });
        };
        $("#au-f").onsubmit = function (e) { e.preventDefault(); S.actor = $("#au-a").value; S.table = $("#au-t").value; S.action = $("#au-x").value; S.from = $("#au-d1").value; S.to = $("#au-d2").value; S.q = $("#au-q").value.trim(); S.page = 0; load(); };
        $("#au-csv").onclick = function () {
          jak(function () { return sb.rpc("admin_audit_list", args(2000, 0)); }).then(function (r) {
            var cell = function (v) { var s = v == null ? "" : String(v); if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; return '"' + s.replace(/"/g, '""') + '"'; };
            var lines = [["Waktu", "Admin", "Aksi", "Tabel", "ID baris", "Ringkasan"].map(cell).join(",")].concat((r.rows || []).map(function (a) { return [a.created_at, a.actor_email || a.actor_id || "sistem", a.action, a.table_name, a.row_id, JSON.stringify(a.summary)].map(cell).join(","); }));
            var el = d.createElement("a"); el.href = URL.createObjectURL(new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" })); el.download = "audit-log.csv"; d.body.appendChild(el); el.click(); setTimeout(function () { URL.revokeObjectURL(el.href); el.remove(); }, 500);
            toast((r.rows || []).length + " baris diekspor" + (r.total > 2000 ? " (2000 terbaru dari " + r.total + ")" : "") + ".", "ok");
          }, function () { toast("Ekspor gagal.", "bad"); });
        };
        root.onclick = function (ev) { var b = ev.target.closest("[data-i]"); if (!b || !last) return; detail(last.rows[+b.dataset.i]); };
        load();
      }).catch(function (e) { root.innerHTML = errBox(e && e.code === "42501" ? "Anda tidak punya izin melihat audit log." : "Audit log tidak bisa dimuat. Pastikan backend/admin-roles.sql sudah dijalankan.", 1); });
    }
    function detail(a) {
      var dl = dialog("ar-au"), s = a.summary || {}, short = function (v) { var t = typeof v === "string" ? v : JSON.stringify(v); return t == null ? "-" : (t.length > 200 ? t.slice(0, 200) + "..." : t); };
      var upd = a.action === "update" && Object.keys(s).every(function (k) { return Array.isArray(s[k]) && s[k].length === 2; }) && Object.keys(s).length;
      dl.innerHTML = xBtn + '<h2 id="ar-au-t">' + esc(a.action) + " " + esc(a.table_name || "") + '</h2><p class="sub">' + esc(wib(a.created_at)) + " oleh " + esc(a.actor_email || "sistem") + (a.row_id ? " · ID " + esc(a.row_id) : "") + "</p>" +
        (Object.keys(s).length ? '<div class="tbl-w"><table class="ar-diff"><thead><tr><th>Kolom</th>' + (upd ? "<th>Sebelum</th><th>Sesudah</th>" : "<th>Nilai</th>") + "</tr></thead><tbody>" + Object.keys(s).map(function (k) { return "<tr><td><b>" + esc(k) + "</b></td>" + (upd ? "<td>" + esc(short(s[k][0])) + "</td><td>" + esc(short(s[k][1])) + "</td>" : "<td>" + esc(short(s[k])) + "</td>") + "</tr>"; }).join("") + "</tbody></table></div>" : '<p class="sub">Tanpa rincian.</p>') + '<div class="ar-btns" style="margin-top:12px"><button class="btn o" type="button" data-close>Tutup</button></div>';
      dl.showModal();
    }

    var m = M.filter(function (x) { return x.key === "admins"; })[0];
    if (m) {
      var T = function (k, l, r) { return { key: k, label: l, render: r }; };
      m.tabs = [T("list", "Admin Users", renderUsers), T("roles", "Peran & Izin", renderRoles), T("sessions", "Sesi & Login", renderSessions), T("sec", "Keamanan Akses", renderSecurity), T("audit", "Audit Log", renderAudit)];
    }
  });
})();
