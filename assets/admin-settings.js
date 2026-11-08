/* NusaMora Admin: Pengaturan Sistem (menumpang pada assets/admin.js lewat window.NM_ADMIN_EXT) */
(function () {
  "use strict";
  window.NM_ADMIN_EXT = window.NM_ADMIN_EXT || [];
  window.NM_ADMIN_EXT.push(function (X) {
    var sb = X.sb, $ = X.$, esc = X.esc, toast = X.toast, empty = X.empty, skel = X.skel, errBox = X.errBox, dlgConfirm = X.dlgConfirm, can = X.can, M = X.M, d = document;
    var ERR = { maintenance_mode_tidak_valid: "Mode pemeliharaan tidak valid.", platform_name_tidak_valid: "Nama platform 2 sampai 60 karakter.", support_email_tidak_valid: "Email dukungan tidak valid.", support_whatsapp_tidak_valid: "Nomor WhatsApp 8 sampai 15 digit.", brand_primary_tidak_valid: "Warna harus format #RRGGBB.", brand_deep_tidak_valid: "Warna harus format #RRGGBB.",
      default_lang_tidak_valid: "Bahasa tidak valid.", timezone_tidak_valid: "Zona waktu tidak valid.", maintenance_message_terlalu_panjang: "Pesan pemeliharaan maksimal 300 karakter.", forbidden: "Anda tidak berhak melakukan ini.", format_tidak_dikenal: "Berkas bukan ekspor konfigurasi NusaMora.", berkas_terlalu_besar: "Berkas terlalu besar (maks. 1 MB).",
      nama_tidak_valid: "Nama 2 sampai 80 karakter.", url_tidak_valid: "URL harus https://, memakai nama domain (bukan IP/localhost), port 443.", event_wajib: "Pilih minimal satu event.", event_tidak_dikenal: "Event tidak dikenal.", batas_endpoint: "Maksimal 10 webhook.", tidak_ditemukan: "Data tidak ditemukan.", tidak_bisa_dicoba_ulang: "Hanya pengiriman gagal yang bisa dicoba ulang." };
    var SOC = [["social_instagram", "Instagram"], ["social_tiktok", "TikTok"], ["social_facebook", "Facebook"], ["social_youtube", "YouTube"], ["social_x", "X (Twitter)"], ["social_linkedin", "LinkedIn"]];
    var WEV = [["payment_paid", "Pembayaran berhasil"], ["payment_failed", "Pembayaran gagal / kedaluwarsa"], ["invitation_active", "Undangan menjadi aktif"], ["customer_created", "Pelanggan baru"], ["ticket_new", "Tiket bantuan baru"], ["ping", "Uji (ping)"]];
    var evName = function (k) { var x = WEV.filter(function (e) { return e[0] === k; })[0]; return x ? x[1] : k; };
    var errText = function (e) { var m = String(e && (e.message || e.error || e) || ""), k = Object.keys(ERR).filter(function (x) { return m.indexOf(x) > -1; })[0]; if (k) return ERR[k]; var m2 = /kunci_tidak_dikenal|impor_dibatalkan: (.*)/.exec(m); if (m2) return "Impor dibatalkan: " + (m2[1] || "kunci tidak dikenal"); return "Gagal: " + m.slice(0, 140); };
    var wib = function (s) { if (!s) return "-"; var x = new Date(s); return isNaN(x) ? "-" : x.toLocaleString("id-ID", { timeZone: "Asia/Jakarta", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }); };
    var mb = function (b) { return b == null ? "-" : b >= 1073741824 ? (Math.round(b / 107374182.4) / 10) + " GB" : (Math.round(b / 104857.6) / 10) + " MB"; };
    var xBtn = '<button class="icon-btn x" type="button" data-close aria-label="Tutup"><svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button>';
    var jak = function (fn) { return new Promise(function (res, rej) { Promise.resolve(fn()).then(function (r) { if (r && r.error) rej(r.error); else res(r.data); }, rej); }); };
    function dialog(id) { var dl = $("#" + id); if (dl) dl.remove(); dl = d.createElement("dialog"); dl.id = id; dl.className = "wide st-d"; dl.setAttribute("aria-labelledby", id + "-t"); d.body.appendChild(dl); dl.addEventListener("click", function (e) { if (e.target.closest("[data-close]")) dl.close(); }); return dl; }
    if (!d.getElementById("st-css")) {
      var st = d.createElement("style"); st.id = "st-css";
      st.textContent = ".st-d [hidden]{display:none!important}#view #body{grid-template-columns:minmax(0,1fr)}#view #body>*{min-width:0}.st-f{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(min(240px,100%),1fr))}.st-f .full{grid-column:1/-1}.st-e{color:var(--bad,#b3261e);min-height:1.2em}dialog.st-d{max-width:760px;width:calc(100% - 32px)}.st-cards{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(min(220px,100%),1fr));margin-bottom:16px}.st-cards .card{padding:14px;min-width:0}.st-cards b{display:block;font-size:1.25rem;overflow-wrap:anywhere}.st-warn{border-left:4px solid var(--warn,#b26a00);padding:10px 14px;margin-bottom:14px}.st-code{font-family:ui-monospace,monospace;font-size:.82rem;word-break:break-all}.st-pre{white-space:pre-wrap;word-break:break-word;background:var(--soft,#f6f3fb);border-radius:10px;padding:12px;font-size:.82rem;font-family:ui-monospace,monospace;overflow:auto}.st-tool{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:14px}.st-ev{display:flex;flex-wrap:wrap;gap:6px 14px}.st-ev label{display:inline-flex;gap:6px;align-items:center}";
      d.head.appendChild(st);
    }
    var okb = function (b, y, n) { return b ? '<span class="badge ok">' + esc(y || "Terpasang") + "</span>" : '<span class="badge bad">' + esc(n || "Belum") + "</span>"; };
    function loadSettings() { return jak(function () { return sb.from("app_settings").select("key,value"); }).then(function (r) { var o = {}; (r || []).forEach(function (x) { o[x.key] = x.value; }); return o; }); }
    function saveSettings(vals) { var rows = Object.keys(vals).map(function (k) { return { key: k, value: vals[k], updated_at: new Date().toISOString() }; }); return sb.from("app_settings").upsert(rows, { onConflict: "key" }); }
    var sv = function (S, k) { return typeof S[k] === "string" ? S[k] : ""; };
    var isOn = function (v) { return v === true || v === "true"; };

    /* ---------- Lokalisasi & Media sosial: formulir sederhana ---------- */
    function formTab(title, note, build, collect) {
      return function (root) {
        var canW = can("settings", "write"); root.innerHTML = skel();
        loadSettings().then(function (S) {
          root.innerHTML = '<form class="card st-f" id="sf" novalidate><h3 class="full">' + esc(title) + "</h3>" + (note ? '<p class="note full">' + note + "</p>" : "") + build(S, !canW) + '<p class="st-e full" id="sf-e" role="alert"></p>' + (canW ? '<div class="full"><button class="btn" type="submit">Simpan</button></div>' : '<p class="sub full">Anda hanya punya izin melihat.</p>') + "</form>";
          $("#sf").onsubmit = function (e) {
            e.preventDefault(); if (!canW) return; $("#sf-e").textContent = "";
            saveSettings(collect()).then(function (r) { if (r.error) return ($("#sf-e").textContent = errText(r.error)); try { sessionStorage.removeItem("nm_pub_settings"); } catch (x) { /* abaikan */ } toast("Pengaturan disimpan.", "ok"); });
          };
        }).catch(function () { root.innerHTML = errBox("Pengaturan tidak bisa dimuat.", 0); });
      };
    }
    var renderLocal = formTab("Lokalisasi", "<b>Bahasa bawaan</b> dipakai halaman daftar Artikel, Bantuan, dan Tutorial bila pengunjung tidak memilih bahasa. <b>Zona waktu</b> dipakai untuk tanggal di halaman konten publik. Zona waktu panel admin tetap WIB. Mata uang: pembayaran selalu Rupiah (IDR) lewat Midtrans, sehingga tidak ada pilihan mata uang.",
      function (S, ro) {
        var dl = sv(S, "default_lang") || "id", tz = sv(S, "timezone") || "Asia/Jakarta";
        return '<label class="fld">Bahasa bawaan<select id="l-lang"' + (ro ? " disabled" : "") + '><option value="id"' + (dl === "id" ? " selected" : "") + '>Indonesia</option><option value="en"' + (dl === "en" ? " selected" : "") + '>English</option></select></label><label class="fld">Zona waktu<select id="l-tz"' + (ro ? " disabled" : "") + ">" + [["Asia/Jakarta", "WIB (Asia/Jakarta)"], ["Asia/Makassar", "WITA (Asia/Makassar)"], ["Asia/Jayapura", "WIT (Asia/Jayapura)"]].map(function (o) { return '<option value="' + o[0] + '"' + (tz === o[0] ? " selected" : "") + ">" + esc(o[1]) + "</option>"; }).join("") + "</select></label>";
      }, function () { return { default_lang: $("#l-lang").value, timezone: $("#l-tz").value }; });
    var renderSocial = formTab("Media sosial", "Tautan ini tampil di footer halaman utama. Kosongkan untuk menyembunyikan. Hanya alamat https:// yang diterima.",
      function (S, ro) { return SOC.map(function (s) { return '<label class="fld">' + esc(s[1]) + '<input id="' + s[0] + '" type="url" maxlength="300" placeholder="https://" value="' + esc(sv(S, s[0])) + '"' + (ro ? " disabled" : "") + "></label>"; }).join(""); },
      function () { var o = {}; SOC.forEach(function (s) { o[s[0]] = $("#" + s[0]).value.trim(); }); return o; });

    /* ---------- Mode pemeliharaan ---------- */
    function renderMaint(root) {
      var canW = can("settings", "write"); root.innerHTML = skel();
      loadSettings().then(function (S) {
        var on = isOn(S.maintenance_mode);
        root.innerHTML = (on ? '<div class="card st-warn" role="status"><b>Mode pemeliharaan AKTIF.</b> Pelanggan tidak bisa membuat undangan atau pembayaran baru.</div>' : "") +
          '<form class="card st-f" id="mf" novalidate><h3 class="full">Mode pemeliharaan</h3><p class="note full">Saat aktif: (1) <b>database</b> menolak pembuatan undangan dan pembayaran baru oleh pelanggan, (2) halaman pelanggan menampilkan pemberitahuan. Pembayaran yang sedang berjalan tetap diproses dan admin tetap bisa bekerja. Halaman statis di Hostinger tidak ikut mati; pemberitahuan memakai pengaturan ini.</p>' +
          '<label class="chk-l full"><input type="checkbox" id="m-on"' + (on ? " checked" : "") + (canW ? "" : " disabled") + '> Aktifkan mode pemeliharaan</label><label class="fld full">Pesan untuk pengunjung<textarea id="m-msg" rows="3" maxlength="300" placeholder="Kami sedang melakukan pemeliharaan. Kembali pukul 10.00 WIB."' + (canW ? "" : " disabled") + ">" + esc(sv(S, "maintenance_message")) + '</textarea></label><p class="st-e full" id="m-e" role="alert"></p>' + (canW ? '<div class="full"><button class="btn" type="submit">Simpan</button></div>' : "") + "</form>";
        $("#mf").onsubmit = function (e) {
          e.preventDefault(); if (!canW) return; var want = $("#m-on").checked, doit = function () { saveSettings({ maintenance_mode: want, maintenance_message: $("#m-msg").value.trim() }).then(function (r) { if (r.error) return ($("#m-e").textContent = errText(r.error)); try { sessionStorage.removeItem("nm_pub_settings"); } catch (x) { /* abaikan */ } toast(want ? "Mode pemeliharaan aktif." : "Mode pemeliharaan dimatikan.", "ok"); renderMaint(root); }); };
          if (want && !on) dlgConfirm("Aktifkan mode pemeliharaan? Pelanggan langsung tidak bisa membuat undangan atau pembayaran baru.", "Aktifkan").then(function (y) { if (y) doit(); }); else doit();
        };
      }).catch(function () { root.innerHTML = errBox("Pengaturan tidak bisa dimuat.", 0); });
    }

    /* ---------- Integrasi ---------- */
    var sysStatus = function () { return sb.functions.invoke("system-status", { body: {} }).then(function (r) { return r.error ? null : r.data; }, function () { return null; }); };
    var notifStatus = function () { return sb.functions.invoke("notify-dispatch", { body: { action: "status" } }).then(function (r) { return r.error ? null : r.data; }, function () { return null; }); };
    function renderInteg(root) {
      root.innerHTML = skel();
      Promise.all([sysStatus(), notifStatus(), jak(function () { return sb.rpc("admin_system_health"); }).catch(function () { return null; })]).then(function (v) {
        var s = v[0], n = v[1], h = v[2], sec = s && s.secrets || {}, row = function (name, what, ok, extra, known) { return "<tr><td><b>" + esc(name) + "</b><div class=\"cell-s\">" + esc(what) + "</div></td><td>" + (known ? ok : '<span class="badge">Tidak diketahui</span>') + "</td><td>" + (known ? extra : "Status tidak dapat dibaca dari server.") + "</td></tr>"; };
        var web = (window.NM_CONFIG && NM_CONFIG.SUPABASE_URL || "https://&lt;project-ref&gt;.supabase.co").replace(/</g, "&lt;");
        root.innerHTML = (!s ? '<div class="card st-warn" role="status">Edge Function <code>system-status</code> belum dapat dihubungi, jadi status secret tidak diketahui. Deploy: <code>supabase functions deploy system-status --no-verify-jwt</code>.</div>' : "") +
          '<p class="note">Status dibaca dari server. Hanya <b>ada atau tidaknya</b> secret yang ditampilkan, tidak pernah isinya. Secret diatur di Supabase, Edge Functions, Secrets, bukan di halaman ini.</p><div class="card tbl-w"><table><thead><tr><th>Layanan</th><th>Status</th><th>Keterangan</th></tr></thead><tbody>' +
          row("Supabase (database & auth)", "Basis data, login, penyimpanan", okb(!!h, "Terhubung", "Tidak terjangkau"), esc((window.NM_CONFIG && NM_CONFIG.SUPABASE_URL) || "-"), true) +
          row("Midtrans (pembayaran)", "Checkout dan webhook pembayaran", okb(sec.MIDTRANS_SERVER_KEY && sec.MIDTRANS_SIGNATURE_KEY, "Kunci terpasang", "Kunci belum lengkap"), "Mode server: <b>" + esc(s ? s.midtrans_mode : "-") + "</b>. Server key: " + (sec.MIDTRANS_SERVER_KEY ? "ada" : "tidak ada") + ", signature key: " + (sec.MIDTRANS_SIGNATURE_KEY ? "ada" : "tidak ada") + ". Webhook: <span class=\"st-code\">" + web + "/functions/v1/midtrans-webhook</span>", !!s) +
          row("Email (Resend)", "Notifikasi email", okb(n && n.email.configured, "Terhubung", "Belum"), n ? "API key: " + (n.email.has_key ? "ada" : "tidak ada") + ", email pengirim: " + (n.email.has_sender ? "terisi" : "kosong") + ". Callback terkirim: " + (n.webhook_secret ? "aktif" : "belum") : "Atur di Notifikasi, Pengaturan", !!n) +
          row("WhatsApp (Fonnte)", "Notifikasi WhatsApp", okb(n && n.whatsapp.configured, "Terhubung", "Belum"), n ? "Token: " + (n.whatsapp.configured ? "ada" : "tidak ada") : "Atur di Notifikasi, Pengaturan", !!n) +
          row("Penjadwal pengiriman", "Memproses antrean notifikasi dan webhook", okb(n && n.scheduler_secret && h && h.notif_last_dispatch && (Date.now() - new Date(h.notif_last_dispatch).getTime()) < 900000, "Berjalan", "Belum berjalan"), "Terakhir: " + esc(h ? wib(h.notif_last_dispatch) : "-") + ". Secret penjadwal: " + (n && n.scheduler_secret ? "ada" : "tidak ada"), !!n) +
          row("CORS & rate limit", "Perlindungan Edge Function", okb(sec.ALLOWED_ORIGINS && sec.RATE_LIMIT_SALT, "Lengkap", "Perlu dicek"), "ALLOWED_ORIGINS: " + (sec.ALLOWED_ORIGINS ? (s.allowed_origins + " origin") : "belum diatur") + ", RATE_LIMIT_SALT: " + (sec.RATE_LIMIT_SALT ? "ada" : "tidak ada"), !!s) +
          "</tbody></table></div>";
      }).catch(function () { root.innerHTML = errBox("Status integrasi tidak bisa dimuat.", 0); });
    }

    /* ---------- Keamanan ---------- */
    function renderSec(root) {
      root.innerHTML = skel();
      jak(function () { return sb.rpc("admin_system_health"); }).then(function (h) {
        var ev = h.security_24h || {}, ks = Object.keys(ev);
        root.innerHTML = '<p class="note">Ringkasan keamanan 24 jam terakhir. Kejadian dicatat otomatis oleh Edge Function (pembatasan laju, tanda tangan webhook salah, dsb.).</p><div class="card tbl-w">' + (ks.length ? "<table><thead><tr><th>Jenis kejadian</th><th>Jumlah</th></tr></thead><tbody>" + ks.map(function (k) { return "<tr><td><code>" + esc(k) + "</code></td><td>" + esc(ev[k]) + "</td></tr>"; }).join("") + "</tbody></table>" : empty("Tidak ada kejadian keamanan", "Dalam 24 jam terakhir tidak ada pembatasan laju atau percobaan mencurigakan yang tercatat.")) + "</div>" +
          '<div class="card"><h3>Kebijakan yang berlaku</h3><ul><li>Semua tabel dilindungi Row Level Security; admin hanya bisa melakukan apa yang diizinkan perannya.</li><li>Kunci rahasia (service role, Midtrans, Resend, token WhatsApp) hanya ada di Secrets Edge Function, tidak di repo, database, atau halaman ini.</li><li>Pengaturan MFA wajib untuk admin, batas sesi, dan pemantauan IP/perangkat dikelola di menu <b>Admin &amp; Role</b>. Kewajiban MFA dan CSP mode Enforce sengaja belum diaktifkan di produksi.</li></ul></div>';
      }).catch(function (e) { root.innerHTML = errBox(e && e.code === "42501" ? "Anda tidak punya izin melihat ringkasan ini." : "Ringkasan tidak bisa dimuat. Pastikan backend/admin-settings.sql sudah dijalankan.", 1); });
    }

    /* ---------- Kesehatan sistem ---------- */
    function renderHealth(root) {
      root.innerHTML = skel();
      var t0 = Date.now();
      Promise.all([jak(function () { return sb.rpc("admin_system_health"); }), notifStatus()]).then(function (v) {
        var h = v[0], n = v[1], ms = Date.now() - t0, issues = [], age = h.notif_last_dispatch ? (Date.now() - new Date(h.notif_last_dispatch).getTime()) / 60000 : null, bk = h.last_backup_ok ? (Date.now() - new Date(h.last_backup_ok).getTime()) / 36e5 : null;
        if (h.payments_stuck > 0) issues.push(h.payments_stuck + " pembayaran menunggu lebih dari 1 hari.");
        if (h.notif_failed_24h > 0) issues.push(h.notif_failed_24h + " notifikasi gagal dalam 24 jam.");
        if (h.webhook_failed_24h > 0) issues.push(h.webhook_failed_24h + " pengiriman webhook gagal dalam 24 jam.");
        if ((h.notif_pending > 0 || h.webhook_pending > 0) && (age === null || age > 15)) issues.push("Ada antrean tetapi penjadwal pengirim tidak berjalan.");
        if (bk === null) issues.push("Belum ada backup database tercatat."); else if (bk > 48) issues.push("Backup database terakhir " + Math.round(bk) + " jam lalu.");
        if (h.maintenance) issues.push("Mode pemeliharaan sedang aktif.");
        if (n === null) issues.push("Edge Function notify-dispatch tidak terjangkau.");
        var card = function (l, val, sub) { return '<div class="card"><span class="sub">' + esc(l) + "</span><b>" + esc(val) + "</b>" + (sub ? '<span class="sub">' + esc(sub) + "</span>" : "") + "</div>"; };
        root.innerHTML = '<div class="card ' + (issues.length ? "st-warn" : "") + '" role="status"><b>' + (issues.length ? "Perlu perhatian (" + issues.length + ")" : "Semua pemeriksaan normal") + "</b>" + (issues.length ? "<ul>" + issues.map(function (i) { return "<li>" + esc(i) + "</li>"; }).join("") + "</ul>" : "") + '<span class="sub">Diperiksa ' + esc(wib(h.checked_at)) + '. Waktu respons database dari browser Anda: ' + ms + ' ms.</span> <button class="btn o sm" type="button" id="hl-r">Periksa lagi</button></div><div class="st-cards">' +
          card("Ukuran database", mb(h.db_size_bytes)) + card("Penyimpanan file", h.storage_bytes == null ? "-" : mb(h.storage_bytes), h.storage_objects == null ? "" : h.storage_objects + " berkas") + card("Pelanggan", h.customers) + card("Undangan aktif", h.invitations_active) + card("Pembayaran tertahan", h.payments_stuck, "pending lebih dari 1 hari") +
          card("Antrean notifikasi", h.notif_pending, h.notif_failed_24h + " gagal / 24 jam") + card("Antrean webhook", h.webhook_pending, h.webhook_failed_24h + " gagal / 24 jam") + card("Penjadwal terakhir", h.notif_last_dispatch ? Math.round(age) + " menit lalu" : "Belum pernah") + card("Backup DB terakhir", h.last_backup_ok ? wib(h.last_backup_ok) : "Belum tercatat") + "</div>";
        $("#hl-r").onclick = function () { renderHealth(root); };
      }).catch(function (e) { root.innerHTML = errBox(e && e.code === "42501" ? "Anda tidak punya izin melihat kesehatan sistem." : "Kesehatan sistem tidak bisa dimuat. Pastikan backend/admin-settings.sql sudah dijalankan.", 1); });
    }

    /* ---------- Backup & restore ---------- */
    function download(name, text) { var a = d.createElement("a"); a.href = URL.createObjectURL(new Blob([text], { type: "application/json" })); a.download = name; d.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 800); }
    function renderBackup(root) {
      var canW = can("settings", "write"); root.innerHTML = skel();
      jak(function () { return sb.from("backup_log").select("id,at,kind,ok,size_bytes,detail").order("at", { ascending: false }).limit(20); }).then(function (log) {
        var KL = { db: "Database", storage: "File", restore: "Pemulihan", config: "Konfigurasi" };
        root.innerHTML = '<p class="note">Backup <b>database penuh</b> dan <b>file</b> dijalankan dari server oleh skrip <code>ops/backup/backup-db.sh</code> dan <code>backup-storage.mjs</code> (terjadwal), lalu dicatat di sini. Panel ini tidak bisa menjalankan atau memulihkan database penuh dari browser; pemulihan memakai <code>restore-db.sh</code> dan <code>restore-storage.mjs</code> dengan persetujuan Anda. Di sini tersedia <b>ekspor dan impor konfigurasi</b> (pengaturan, template pesan, aturan notifikasi).</p>' +
          '<div class="card"><h3>Konfigurasi</h3><div class="st-tool"><button class="btn" type="button" id="bk-ex">Unduh konfigurasi (.json)</button>' + (canW ? '<label class="btn o" for="bk-im" style="cursor:pointer">Pulihkan dari berkas...</label><input id="bk-im" type="file" accept="application/json,.json" hidden>' : "") + '</div><p class="sub">Berkas tidak memuat rahasia (kunci API, secret webhook). Webhook tidak ikut diekspor. Sebelum diterapkan, berkas diperiksa dulu dan Anda melihat ringkasannya.</p><div id="bk-res"></div></div>' +
          '<div class="card"><h3>Riwayat backup &amp; pemulihan</h3>' + (log.length ? '<div class="tbl-w"><table><thead><tr><th>Waktu (WIB)</th><th>Jenis</th><th>Hasil</th><th>Ukuran</th><th>Keterangan</th></tr></thead><tbody>' + log.map(function (l) { return "<tr><td>" + esc(wib(l.at)) + "</td><td>" + esc(KL[l.kind] || l.kind) + "</td><td>" + (l.ok ? '<span class="badge ok">Berhasil</span>' : '<span class="badge bad">Gagal</span>') + "</td><td>" + esc(l.size_bytes ? mb(l.size_bytes) : "-") + "</td><td>" + esc(l.detail || "") + "</td></tr>"; }).join("") + "</tbody></table></div>" : empty("Belum ada catatan", "Catatan muncul setelah skrip backup dijalankan dengan SUPABASE_DB_URL, atau setelah impor konfigurasi.")) + "</div>";
        $("#bk-ex").onclick = function () { sb.rpc("admin_config_export").then(function (r) { if (r.error) return toast(errText(r.error), "bad"); download("nusamora-config-" + new Date().toISOString().slice(0, 10) + ".json", JSON.stringify(r.data, null, 2)); toast("Konfigurasi diunduh.", "ok"); }); };
        if ($("#bk-im")) $("#bk-im").onchange = function (e) {
          var f = e.target.files[0]; if (!f) return; var res = $("#bk-res");
          if (f.size > 1048576) { res.innerHTML = '<p class="st-e">' + esc(ERR.berkas_terlalu_besar) + "</p>"; return; }
          f.text().then(function (txt) {
            var data; try { data = JSON.parse(txt); } catch (x) { res.innerHTML = '<p class="st-e">Berkas bukan JSON yang valid.</p>'; return; }
            sb.rpc("admin_config_import", { p: data, p_apply: false }).then(function (r) {
              if (r.error) { res.innerHTML = '<p class="st-e">' + esc(errText(r.error)) + "</p>"; return; }
              var o = r.data, c = o.counts;
              res.innerHTML = '<div class="' + (o.valid ? "" : "st-warn") + '"><b>' + (o.valid ? "Berkas valid." : "Berkas bermasalah, tidak bisa diterapkan.") + "</b> Isi: " + c.app_settings + " pengaturan, " + c.notif_settings + " pengaturan notifikasi, " + c.notif_templates + " template, " + c.notif_rules + " aturan.</div>" + (o.problems.length ? "<ul>" + o.problems.slice(0, 10).map(function (p) { return "<li>" + esc(p) + "</li>"; }).join("") + "</ul>" : "") + (o.valid ? '<p><button class="btn" type="button" id="bk-ap">Terapkan konfigurasi ini</button></p>' : "");
              if ($("#bk-ap")) $("#bk-ap").onclick = function () {
                dlgConfirm("Terapkan konfigurasi dari berkas ini? Pengaturan, template, dan aturan dengan kunci yang sama akan ditimpa. Tindakan ini dicatat di log audit.", "Terapkan").then(function (y) { if (!y) return; sb.rpc("admin_config_import", { p: data, p_apply: true }).then(function (x) { if (x.error) { res.innerHTML = '<p class="st-e">' + esc(errText(x.error)) + "</p>"; return; } try { sessionStorage.removeItem("nm_pub_settings"); } catch (z) { /* abaikan */ } toast("Konfigurasi diterapkan.", "ok"); renderBackup(root); }); });
              };
            });
          });
          e.target.value = "";
        };
      }).catch(function (e) { root.innerHTML = errBox(e && e.code === "42501" ? "Anda tidak punya izin melihat backup." : "Riwayat backup tidak bisa dimuat. Pastikan backend/admin-settings.sql sudah dijalankan.", 1); });
    }

    /* ---------- API & Webhook ---------- */
    function renderApi(root) {
      var canW = can("settings", "write"), eps = []; root.innerHTML = skel();
      var base = (window.NM_CONFIG && NM_CONFIG.SUPABASE_URL) || "";
      var load = function () { return jak(function () { return sb.from("webhook_endpoints").select("*").order("created_at"); }).then(function (r) { eps = r || []; }); };
      var show = function () {
        var fn = [["midtrans-checkout", "Membuat transaksi Midtrans (login pelanggan)"], ["midtrans-webhook", "Menerima notifikasi Midtrans (tanda tangan dicek)"], ["midtrans-sync", "Sinkronisasi status pembayaran"], ["notify-dispatch", "Pengirim notifikasi dan webhook (admin atau penjadwal)"], ["notify-webhook", "Callback Resend (tanda tangan Svix)"], ["admin-password", "Ganti password admin"], ["asset-url / asset-register / asset-generate", "Aset template"], ["system-status", "Status secret untuk panel ini"]];
        root.innerHTML = '<div class="card"><h3>Konfigurasi API</h3><dl class="kv"><div><dt>URL proyek</dt><dd class="st-code">' + esc(base || "-") + "</dd></div><div><dt>REST (RPC publik)</dt><dd class=\"st-code\">" + esc(base) + "/rest/v1/rpc/&lt;nama&gt;</dd></div><div><dt>Edge Functions</dt><dd class=\"st-code\">" + esc(base) + "/functions/v1/&lt;nama&gt;</dd></div></dl><p class=\"sub\">Kunci anon di <code>assets/config.js</code> bersifat publik dan dibatasi Row Level Security. Kunci service role tidak boleh pernah berada di repo, Hostinger, atau halaman ini. Belum ada API publik berkunci untuk pihak ketiga; integrasi keluar memakai webhook di bawah.</p><div class=\"tbl-w\"><table><thead><tr><th>Fungsi</th><th>Kegunaan</th></tr></thead><tbody>" + fn.map(function (f) { return "<tr><td><code>" + esc(f[0]) + "</code></td><td>" + esc(f[1]) + "</td></tr>"; }).join("") + "</tbody></table></div></div>" +
          '<div class="card"><h3>Webhook keluar</h3><p class="sub">NusaMora mengirim POST JSON ke URL Anda saat event terjadi. Setiap kiriman ditandatangani (HMAC-SHA256) dan dicoba ulang sampai 6 kali. Status <b>Terkirim</b> berarti URL Anda menjawab 2xx.</p><div class="st-tool">' + (canW ? '<button class="btn" type="button" id="wh-new">Tambah webhook</button>' : "") + "</div>" +
          (eps.length ? '<div class="tbl-w"><table><thead><tr><th>Nama</th><th>URL</th><th>Event</th><th>Status</th><th></th></tr></thead><tbody>' + eps.map(function (e) { return "<tr><td><b>" + esc(e.name) + '</b></td><td class="st-code">' + esc(e.url) + "</td><td>" + esc(e.events.map(evName).join(", ")) + "</td><td>" + (e.enabled ? '<span class="badge ok">Aktif</span>' : '<span class="badge warn">Nonaktif</span>') + (e.disabled_reason ? '<div class="cell-s">' + esc(e.disabled_reason) + "</div>" : "") + '</td><td><button class="btn o sm" type="button" data-w="' + esc(e.id) + '">' + (canW ? "Kelola" : "Lihat") + "</button></td></tr>"; }).join("") + "</tbody></table></div>" : empty("Belum ada webhook", "Tambahkan URL penerima untuk menghubungkan sistem lain.")) + "</div>" +
          '<div class="card"><h3>Memverifikasi tanda tangan</h3><p class="sub">Header: <code>X-NusaMora-Signature: sha256=&lt;hex&gt;</code> dan <code>X-NusaMora-Timestamp</code>. Hitung HMAC-SHA256 dari <code>timestamp + "." + badan mentah</code> dengan secret endpoint, bandingkan secara constant-time, dan tolak timestamp yang lebih dari 5 menit.</p><div class="st-pre">const expected = "sha256=" + crypto.createHmac("sha256", SECRET)\n  .update(ts + "." + rawBody).digest("hex");</div></div>';
        if ($("#wh-new")) $("#wh-new").onclick = function () { edit(null); };
        root.onclick = function (ev) { var b = ev.target.closest("[data-w]"); if (b) edit(eps.filter(function (x) { return x.id === b.dataset.w; })[0]); };
      };
      var again = function () { load().then(show).catch(function (e) { root.innerHTML = errBox(e && e.code === "42501" ? "Anda tidak punya izin melihat webhook." : "Webhook tidak bisa dimuat. Pastikan backend/admin-settings.sql sudah dijalankan.", 1); root.onclick = function (ev) { if (ev.target.closest("[data-retry]")) again(); }; }); };
      function secretBox(dl, secret) {
        var box = d.createElement("div"); box.className = "card st-warn"; box.setAttribute("role", "status");
        box.innerHTML = "<b>Simpan secret ini sekarang.</b> Secret hanya ditampilkan sekali dan tidak bisa dilihat lagi.<div class=\"st-code\" id=\"wh-sec\">" + esc(secret) + '</div><button class="btn o sm" type="button" id="wh-cp">Salin</button>';
        dl.querySelector("#st-wb").prepend(box); box.querySelector("#wh-cp").onclick = function () { try { navigator.clipboard.writeText(secret).then(function () { toast("Disalin.", "ok"); }); } catch (x) { toast("Salin manual dari kotak.", "bad"); } };
      }
      function edit(e, secret) {
        var dl = dialog("st-wh"), isNew = !e; e = e || { name: "", url: "", events: ["payment_paid"], enabled: true };
        dl.innerHTML = xBtn + '<h2 id="st-wh-t">' + (isNew ? "Tambah webhook" : "Webhook") + '</h2><div id="st-wb"><form id="wf" class="st-f" novalidate><label class="fld">Nama<input id="w-n" maxlength="80" value="' + esc(e.name) + '"' + (canW ? "" : " disabled") + '></label><label class="fld">URL tujuan (https)<input id="w-u" type="url" maxlength="300" value="' + esc(e.url) + '" placeholder="https://contoh.com/webhook/nusamora"' + (canW ? "" : " disabled") + '></label><fieldset class="full chk"><legend>Event</legend><div class="st-ev">' +
          WEV.filter(function (x) { return x[0] !== "ping"; }).map(function (x) { return '<label><input type="checkbox" data-e="' + x[0] + '"' + (e.events.indexOf(x[0]) > -1 ? " checked" : "") + (canW ? "" : " disabled") + "> " + esc(x[1]) + "</label>"; }).join("") + '</div></fieldset><label class="chk-l full"><input type="checkbox" id="w-a"' + (e.enabled ? " checked" : "") + (canW ? "" : " disabled") + '> Aktif</label><p class="st-e full" id="w-e" role="alert"></p><div class="full" style="display:flex;gap:8px;flex-wrap:wrap">' + (canW ? '<button class="btn" type="submit">Simpan</button>' : "") +
          (!isNew && canW ? '<button class="btn o" type="button" id="w-t">Kirim uji</button><button class="btn o" type="button" id="w-r">Buat secret baru</button><button class="btn o danger" type="button" id="w-d">Hapus</button>' : "") + '<button class="btn o" type="button" data-close>Tutup</button></div></form>' + (isNew ? "" : '<h3>Pengiriman terakhir</h3><div id="w-log">' + skel() + "</div>") + "</div>";
        dl.showModal(); if (secret) secretBox(dl, secret);
        var err = function (m) { $("#w-e").textContent = m || ""; };
        $("#wf").onsubmit = function (ev) {
          ev.preventDefault(); err(""); if (!canW) return; var evs = Array.prototype.map.call(dl.querySelectorAll("[data-e]:checked"), function (c) { return c.dataset.e; });
          sb.rpc("admin_webhook_save", { p_id: e.id || null, p_name: $("#w-n").value, p_url: $("#w-u").value.trim(), p_events: evs, p_enabled: $("#w-a").checked }).then(function (r) {
            if (r.error) return err(errText(r.error)); toast("Webhook tersimpan.", "ok"); load().then(function () { show(); if (isNew && r.data && r.data.secret) { var ne = eps.filter(function (x) { return x.id === r.data.id; })[0]; edit(ne, r.data.secret); } else dl.close(); });
          });
        };
        if (!isNew) {
          var logIt = function () { sb.rpc("admin_webhook_deliveries", { p_endpoint: e.id, p_limit: 20 }).then(function (r) {
            var rows = r.data || []; $("#w-log").innerHTML = rows.length ? '<div class="tbl-w"><table><thead><tr><th>Waktu (WIB)</th><th>Event</th><th>Status</th><th>HTTP</th><th>Keterangan</th><th></th></tr></thead><tbody>' + rows.map(function (x) { var SL = { pending: ["Menunggu" + (x.attempts ? " coba lagi " + x.attempts + "/" + x.max_attempts : ""), "warn"], sending: ["Mengirim", "warn"], delivered: ["Terkirim", "ok"], failed: ["Gagal", "bad"], cancelled: ["Dibatalkan", ""] }[x.status] || [x.status, ""]; return "<tr><td>" + esc(wib(x.created_at)) + "</td><td>" + esc(evName(x.event)) + '</td><td><span class="badge ' + SL[1] + '">' + esc(SL[0]) + "</span></td><td>" + esc(x.http_status || "-") + "</td><td>" + esc(x.last_error || (x.response_ms != null && x.status === "delivered" ? x.response_ms + " ms" : "")) + "</td><td>" + (canW && x.status === "failed" ? '<button class="btn o sm" type="button" data-rt="' + esc(x.id) + '">Coba lagi</button>' : "") + "</td></tr>"; }).join("") + "</tbody></table></div>" : '<p class="sub">Belum ada pengiriman.</p>';
          }, function () { $("#w-log").innerHTML = errBox("Riwayat tidak bisa dimuat.", 0); }); };
          logIt();
          dl.onclick = function (ev) { if (ev.target.closest("[data-close]")) return dl.close(); var b = ev.target.closest("[data-rt]"); if (b) sb.rpc("admin_webhook_retry", { p_id: b.dataset.rt }).then(function (r) { if (r.error) return toast(errText(r.error), "bad"); toast("Masuk antrean lagi.", "ok"); logIt(); }); };
          if (canW) {
            $("#w-t").onclick = function () { sb.rpc("admin_webhook_test", { p_id: e.id }).then(function (r) { if (r.error) return toast(errText(r.error), "bad"); sb.functions.invoke("notify-dispatch", { body: { action: "run" } }).then(function () { toast("Uji dikirim. Lihat hasilnya di tabel.", "ok"); setTimeout(logIt, 800); }, function () { toast("Uji masuk antrean, tetapi pengirim belum dapat dihubungi.", "bad"); logIt(); }); }); };
            $("#w-r").onclick = function () { dlgConfirm("Buat secret baru? Secret lama langsung tidak berlaku dan penerima harus diperbarui.", "Buat baru").then(function (y) { if (!y) return; sb.rpc("admin_webhook_rotate_secret", { p_id: e.id }).then(function (r) { if (r.error) return toast(errText(r.error), "bad"); var old = dl.querySelector(".st-warn"); if (old) old.remove(); secretBox(dl, r.data); }); }); };
            $("#w-d").onclick = function () { dlgConfirm("Hapus webhook \"" + e.name + "\" beserta riwayat pengirimannya? Tidak bisa dibatalkan.", "Hapus").then(function (y) { if (!y) return; sb.rpc("admin_webhook_delete", { p_id: e.id }).then(function (r) { if (r.error) return toast(errText(r.error), "bad"); dl.close(); toast("Webhook dihapus.", "ok"); again(); }); }); };
          }
        }
      }
      again();
    }

    var m = M.filter(function (x) { return x.key === "settings"; })[0];
    if (m) {
      var by = {}; (m.tabs || []).forEach(function (t) { by[t.key] = t; });
      if (by.platform && by.platform.settings) by.platform.settings = by.platform.settings.filter(function (f) { return f.k !== "maintenance_mode"; });
      if (by.pay) { by.pay.label = "Payment Gateway"; }
      var T = function (key, label, render) { return { key: key, label: label, render: render }; };
      m.tabs = [by.platform, by.brand, T("local", "Lokalisasi", renderLocal), T("social", "Media Sosial", renderSocial), by.seo, by.domain, by.storage, by.pay, T("integ", "Integrasi", renderInteg), T("sec", "Keamanan", renderSec), T("maint", "Pemeliharaan", renderMaint), T("health", "Kesehatan Sistem", renderHealth), T("backup", "Backup & Restore", renderBackup), T("api", "API & Webhook", renderApi)].filter(Boolean);
    }
  });
})();
