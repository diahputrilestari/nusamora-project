/* NusaMora Admin: Notifikasi (menumpang pada assets/admin.js lewat window.NM_ADMIN_EXT) */
(function () {
  "use strict";
  window.NM_ADMIN_EXT = window.NM_ADMIN_EXT || [];
  window.NM_ADMIN_EXT.push(function (X) {
    var sb = X.sb, $ = X.$, esc = X.esc, toast = X.toast, fail = X.fail, empty = X.empty, skel = X.skel, errBox = X.errBox, dlgConfirm = X.dlgConfirm, can = X.can, M = X.M, d = document;
    var EV = { welcome: "Pelanggan baru mendaftar", payment_paid: "Pembayaran berhasil", payment_failed: "Pembayaran gagal / kedaluwarsa", invitation_active: "Undangan menjadi aktif", ticket_reply: "Staf membalas tiket", ticket_new: "Tiket bantuan baru dibuat", subscription_expiring: "Langganan berakhir 7 hari lagi", announcement: "Pengumuman", test: "Pesan uji" };
    var CH = { email: "Email", whatsapp: "WhatsApp", system: "Sistem (dalam aplikasi)" };
    var VARS = ["nama", "order_id", "paket", "judul", "jumlah", "link", "subjek", "balasan", "kategori", "tanggal"];
    /* "Terkirim" hanya untuk status delivered, yaitu yang dikonfirmasi provider lewat callback. */
    var STL = { pending: ["Menunggu", "warn"], sending: ["Mengirim", "warn"], sent: ["Diterima provider", ""], delivered: ["Terkirim", "ok"], failed: ["Gagal", "bad"], skipped: ["Dilewati", ""], cancelled: ["Dibatalkan", ""] };
    var ASTL = { draft: ["Draft", ""], terjadwal: ["Terjadwal", "warn"], mengirim: ["Mengirim", "warn"], terkirim: ["Terkirim", "ok"], gagal: ["Gagal", "bad"] };
    var ERR = { forbidden: "Anda tidak berhak melakukan ini.", tidak_bisa_dicoba_ulang: "Pesan ini tidak bisa dicoba ulang.", tidak_bisa_dibatalkan: "Hanya pesan yang menunggu yang bisa dibatalkan.", alamat_tidak_valid: "Alamat tujuan tidak valid.", kunci_tidak_valid: "Kunci template: huruf kecil, angka, garis bawah (2-41 karakter).", kanal_tidak_valid: "Kanal tidak valid.",
      nama_wajib: "Nama template wajib diisi.", isi_wajib: "Isi pesan wajib diisi.", subjek_wajib: "Subjek email wajib diisi.", subjek_tidak_valid: "Subjek tidak boleh berbaris-baris.", template_sudah_ada: "Template untuk kunci dan kanal itu sudah ada.", template_tidak_aktif: "Aktifkan templatenya dulu sebelum menyalakan aturan.",
      aturan_tidak_ditemukan: "Aturan tidak ditemukan.", sudah_diproses: "Pengumuman ini sudah diproses.", tidak_ditemukan: "Data tidak ditemukan.", max_attempts_tidak_valid: "Maksimal percobaan harus 1 sampai 10.", retry_base_minutes_tidak_valid: "Jeda dasar harus 1 sampai 1440 menit.", internal_emails_tidak_valid: "Email internal tidak valid (maks. 20).",
      internal_whatsapp_tidak_valid: "Nomor WhatsApp internal tidak valid (8-15 digit, maks. 20).", email_from_name_tidak_valid: "Nama pengirim tidak valid.", email_from_address_tidak_valid: "Email pengirim tidak valid.", email_reply_to_tidak_valid: "Email balasan tidak valid.", status_diatur_sistem: "Status ini diatur otomatis oleh sistem pengiriman." };
    var errText = function (e) { var m = e && (e.message || e.error || e); m = String(m || ""); var k = Object.keys(ERR).filter(function (x) { return m.indexOf(x) > -1; })[0]; return k ? ERR[k] : "Gagal: " + m.slice(0, 120); };
    var wib = function (s) { if (!s) return "-"; var x = new Date(s); return isNaN(x) ? "-" : x.toLocaleString("id-ID", { timeZone: "Asia/Jakarta", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }); };
    var toIn = function (iso) { return iso ? new Date(iso).toLocaleString("sv-SE", { timeZone: "Asia/Jakarta" }).slice(0, 16).replace(" ", "T") : ""; };
    var fromIn = function (v) { if (!v) return null; var x = new Date(v + ":00+07:00"); return isNaN(x) ? null : x.toISOString(); };
    var bdg = function (m, k) { var x = m[k] || [k || "-", ""]; return '<span class="badge ' + x[1] + '">' + esc(x[0]) + "</span>"; };
    var xBtn = '<button class="icon-btn x" type="button" data-close aria-label="Tutup"><svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button>';
    function dialog(id) { var dl = $("#" + id); if (dl) dl.remove(); dl = d.createElement("dialog"); dl.id = id; dl.className = "wide nt-d"; dl.setAttribute("aria-labelledby", id + "-t"); d.body.appendChild(dl); dl.addEventListener("click", function (e) { if (e.target.closest("[data-close]")) dl.close(); }); return dl; }
    if (!d.getElementById("nt-css")) {
      var st = d.createElement("style"); st.id = "nt-css";
      st.textContent = ".nt-d [hidden]{display:none!important}#view #body{grid-template-columns:minmax(0,1fr)}#view #body>*{min-width:0}.nt-tool{display:flex;gap:12px;align-items:flex-end;flex-wrap:wrap;margin-bottom:16px}.nt-tool .grow{flex:1 1 200px;min-width:0}.nt-f{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(min(220px,100%),1fr))}.nt-f .full{grid-column:1/-1}.nt-e{color:var(--bad,#b3261e);min-height:1.2em}dialog.nt-d{max-width:760px;width:calc(100% - 32px)}.nt-chips{display:flex;flex-wrap:wrap;gap:6px}.nt-chips button{font:inherit;font-size:.8rem;padding:2px 8px;border:1px solid var(--line,#d8d3e4);border-radius:999px;background:transparent;cursor:pointer;color:inherit}.nt-pre{white-space:pre-wrap;word-break:break-word;background:var(--soft,#f6f3fb);border-radius:10px;padding:12px;font-size:.9rem}.nt-warn{border-left:4px solid var(--warn,#b26a00);padding:10px 14px;margin-bottom:14px}.nt-stat{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px}.nt-stat .card{flex:1 1 130px;padding:12px 14px;min-width:0}.nt-stat b{display:block;font-size:1.4rem}.nt-code{font-family:ui-monospace,monospace;font-size:.82rem;word-break:break-all}.nt-tbl td,.nt-tbl th{vertical-align:top}.nt-sw{display:inline-flex;gap:8px;align-items:center}";
      d.head.appendChild(st);
    }
    var jak = function (fn) { return new Promise(function (res, rej) { Promise.resolve(fn()).then(function (r) { if (r && r.error) rej(r.error); else res(r.data); }, rej); }); };
    var runNow = function () { return sb.functions.invoke("notify-dispatch", { body: { action: "run" } }).then(function (r) { if (r.error) throw r.error; return r.data; }); };
    function cfgStatus() { return sb.functions.invoke("notify-dispatch", { body: { action: "status" } }).then(function (r) { return r.error ? null : r.data; }, function () { return null; }); }
    function sendNow(ok) { toast("Memproses antrean...", "ok"); return runNow().then(function (r) { var m = r.claimed + " pesan diproses: " + r.sent + " diterima provider" + (r.retry ? ", " + r.retry + " dicoba ulang" : "") + (r.failed ? ", " + r.failed + " gagal" : "") + "."; if (r.skipped_channels && r.skipped_channels.length) m += " Provider " + r.skipped_channels.join(" & ") + " belum terhubung, pesan kanal itu tetap menunggu."; toast(m, r.failed ? "bad" : "ok"); if (ok) ok(); }, function () { toast("Pengirim belum dapat dihubungi. Pastikan Edge Function notify-dispatch sudah di-deploy.", "bad"); }); }

    /* ---------- Pengumuman ---------- */
    function renderAnn0(root) {
      var canW = can("notifications", "write"), rows = [], cnt = {}, f = { q: "", st: "" }; root.innerHTML = skel();
      var load = function () {
        return jak(function () { return sb.from("announcements").select("*").order("created_at", { ascending: false }).limit(200); }).then(function (r) { rows = r || []; return jak(function () { return sb.from("notif_outbox").select("announcement_id,status").not("announcement_id", "is", null).limit(5000); }); })
          .then(function (o) { cnt = {}; (o || []).forEach(function (x) { var c = cnt[x.announcement_id] = cnt[x.announcement_id] || {}; c[x.status] = (c[x.status] || 0) + 1; }); });
      };
      var res = function (id) { var c = cnt[id]; if (!c) return "-"; var p = []; ["pending", "sending", "sent", "delivered", "failed", "skipped"].forEach(function (k) { if (c[k]) p.push(c[k] + " " + STL[k][0].toLowerCase()); }); return esc(p.join(", ")); };
      var draw = function () {
        var vis = rows.filter(function (r) { return (!f.q || r.title.toLowerCase().indexOf(f.q) > -1) && (!f.st || r.status === f.st); });
        $("#nt-rows").innerHTML = vis.length ? '<div class="card tbl-w"><table class="nt-tbl"><thead><tr><th>Judul</th><th>Kanal</th><th>Audiens</th><th>Status</th><th>Hasil pengiriman</th><th>Jadwal (WIB)</th><th></th></tr></thead><tbody>' + vis.map(function (r) {
          return "<tr><td><b>" + esc(r.title) + "</b></td><td>" + esc(CH[r.channel] || r.channel) + "</td><td>" + esc(r.audience) + "</td><td>" + bdg(ASTL, r.status) + "</td><td>" + res(r.id) + "</td><td>" + esc(wib(r.scheduled_at)) + '</td><td><button class="btn o sm" type="button" data-ed="' + esc(r.id) + '">' + (canW && (r.status === "draft" || r.status === "terjadwal") ? "Ubah" : "Lihat") + "</button></td></tr>"; }).join("") + "</tbody></table></div>"
          : '<div class="card">' + empty("Belum ada pengumuman", rows.length ? "Tidak ada yang cocok dengan filter." : "Buat pengumuman pertama.") + "</div>";
      };
      var show = function () {
        root.innerHTML = '<p class="note">Pengumuman <b>Sistem</b> tampil di lonceng pelanggan. <b>Email</b> dan <b>WhatsApp</b> masuk antrean dan dikirim lewat provider. Status <b>Terkirim</b> baru muncul setelah provider mengonfirmasi; sebelum itu pesan berstatus Mengirim.</p><div class="nt-tool"><label class="fld grow">Cari<input id="nt-q" placeholder="Judul"></label><label class="fld">Status<select id="nt-st"><option value="">Semua</option>' + Object.keys(ASTL).map(function (k) { return '<option value="' + k + '">' + esc(ASTL[k][0]) + "</option>"; }).join("") + "</select></label>" + (canW ? '<button class="btn" type="button" id="nt-new">Buat pengumuman</button>' : "") + '</div><div id="nt-rows"></div>';
        $("#nt-q").oninput = function (e) { f.q = e.target.value.trim().toLowerCase(); draw(); }; $("#nt-st").onchange = function (e) { f.st = e.target.value; draw(); };
        if (canW) $("#nt-new").onclick = function () { edit(null); };
        $("#nt-rows").onclick = function (e) { var b = e.target.closest("[data-ed]"); if (b) edit(rows.filter(function (r) { return r.id === b.dataset.ed; })[0]); };
        draw();
      };
      var again = function () { load().then(show).catch(function () { root.innerHTML = errBox("Pengumuman tidak bisa dimuat. Pastikan backend/admin-notifications.sql sudah dijalankan.", 1); root.onclick = function (ev) { if (ev.target.closest("[data-retry]")) again(); }; }); };
      function edit(a) {
        var dl = dialog("nt-ann"), ro = !canW || (a && a.status !== "draft" && a.status !== "terjadwal"); a = a || { title: "", body: "", channel: "email", audience: "semua", status: "draft" };
        dl.innerHTML = xBtn + '<h2 id="nt-ann-t">' + (a.id ? (ro ? "Pengumuman" : "Ubah pengumuman") : "Buat pengumuman") + '</h2><form id="nt-af" class="nt-f" novalidate><label class="fld full">Judul<input id="a-t" maxlength="160" value="' + esc(a.title) + '"' + (ro ? " disabled" : "") + '></label><label class="fld full">Isi pesan<textarea id="a-b" rows="6" maxlength="4000"' + (ro ? " disabled" : "") + ">" + esc(a.body) + '</textarea><small class="sub">Gunakan {{nama}} untuk nama penerima (email/WhatsApp).</small></label>' +
          '<label class="fld">Kanal<select id="a-c"' + (ro || a.id ? " disabled" : "") + ">" + Object.keys(CH).map(function (k) { return '<option value="' + k + '"' + (a.channel === k ? " selected" : "") + ">" + esc(CH[k]) + "</option>"; }).join("") + '</select></label><label class="fld">Audiens<select id="a-a"' + (ro ? " disabled" : "") + ">" + [["semua", "Semua pelanggan"], ["pelanggan_aktif", "Pelanggan berlangganan aktif"], ["affiliate", "Affiliate aktif"], ["admin", "Admin"]].map(function (o) { return '<option value="' + o[0] + '"' + (a.audience === o[0] ? " selected" : "") + ">" + esc(o[1]) + "</option>"; }).join("") + '</select></label>' +
          '<label class="fld">Jadwal kirim (WIB, opsional)<input id="a-s" type="datetime-local" value="' + esc(toIn(a.scheduled_at)) + '"' + (ro ? " disabled" : "") + '><small class="sub">Pengiriman terjadwal berjalan lewat penjadwal pengirim (lihat Pengaturan).</small></label><p class="nt-e full" id="a-e" role="alert"></p>' +
          '<div class="full" style="display:flex;gap:8px;flex-wrap:wrap">' + (ro ? "" : '<button class="btn" type="submit">Simpan</button>' + (a.id ? '<button class="btn o" type="button" id="a-send">Kirim sekarang</button><button class="btn o danger" type="button" id="a-del">Hapus</button>' : "")) + '<button class="btn o" type="button" data-close>Tutup</button></div></form>';
        dl.showModal(); var err = function (m) { $("#a-e").textContent = m || ""; };
        $("#nt-af").onsubmit = function (e) {
          e.preventDefault(); err("");
          var row = { title: $("#a-t").value.trim(), body: $("#a-b").value.trim(), channel: $("#a-c").value, audience: $("#a-a").value, scheduled_at: fromIn($("#a-s").value) };
          if (row.title.length < 2) return err("Judul wajib diisi."); if (!row.body) return err("Isi pesan wajib diisi.");
          row.status = row.scheduled_at ? "terjadwal" : "draft";
          var q = a.id ? sb.from("announcements").update(row).eq("id", a.id) : sb.from("announcements").insert(row);
          q.then(function (r) { if (r.error) return err(errText(r.error)); dl.close(); toast(row.status === "terjadwal" ? "Tersimpan dan dijadwalkan." : "Draft tersimpan.", "ok"); again(); });
        };
        if (a.id && !ro) {
          $("#a-send").onclick = function () {
            dlgConfirm("Kirim pengumuman \"" + a.title + "\" sekarang lewat kanal " + (CH[a.channel] || a.channel) + " ke audiens \"" + a.audience + "\"? Setelah masuk antrean, pengiriman tidak bisa dibatalkan sekaligus.", "Kirim").then(function (yes) {
              if (!yes) return; sb.rpc("admin_announcement_send", { p_id: a.id }).then(function (r) { if (r.error) return err(errText(r.error)); dl.close(); toast(a.channel === "system" ? "Pengumuman tampil di lonceng pelanggan." : r.data + " penerima masuk antrean.", "ok"); if (a.channel !== "system" && r.data > 0) sendNow(again); else again(); });
            });
          };
          $("#a-del").onclick = function () { dlgConfirm("Hapus pengumuman ini secara permanen?", "Hapus").then(function (yes) { if (!yes) return; sb.from("announcements").delete().eq("id", a.id).then(function (r) { if (r.error) return err(errText(r.error)); dl.close(); toast("Dihapus.", "ok"); again(); }); }); };
        }
      }
      again();
    }

    /* ---------- Riwayat ---------- */
    function renderHist(root) {
      var canW = can("notifications", "write"), rows = [], f = { st: "", ch: "", ev: "", q: "" }, PS = 50, more = false; root.innerHTML = skel();
      var query = function (from) {
        var q = sb.from("notif_outbox").select("id,event,channel,recipient_kind,to_address,subject,status,attempts,max_attempts,next_attempt_at,last_error,created_at,sent_at,delivered_at,announcement_id").order("created_at", { ascending: false }).range(from, from + PS - 1);
        if (f.st) q = q.eq("status", f.st); if (f.ch) q = q.eq("channel", f.ch); if (f.ev) q = q.eq("event", f.ev); if (f.q) q = q.ilike("to_address", "%" + f.q.replace(/[%_,()]/g, "") + "%");
        return jak(function () { return q; });
      };
      var label = function (r) { if (r.status === "pending" && r.attempts > 0) return ['<span class="badge warn">Menunggu coba lagi (' + r.attempts + "/" + r.max_attempts + ")</span>"]; return [bdg(STL, r.status)]; };
      var draw = function () {
        $("#nt-rows").innerHTML = rows.length ? '<div class="card tbl-w"><table class="nt-tbl"><thead><tr><th>Waktu (WIB)</th><th>Event</th><th>Kanal</th><th>Tujuan</th><th>Status</th><th>Keterangan</th><th></th></tr></thead><tbody>' + rows.map(function (r) {
          return "<tr><td>" + esc(wib(r.created_at)) + "</td><td>" + esc(EV[r.event] || r.event) + (r.recipient_kind === "internal" ? ' <span class="cell-s">internal</span>' : "") + "</td><td>" + esc(CH[r.channel] || r.channel) + "</td><td>" + esc(r.to_address || "-") + "</td><td>" + label(r)[0] + "</td><td>" + esc(r.last_error || (r.status === "delivered" ? "Dikonfirmasi provider " + wib(r.delivered_at) : r.status === "sent" ? "Belum ada konfirmasi sampai dari provider" : "")) + '</td><td><button class="btn o sm" type="button" data-i="' + esc(r.id) + '">Detail</button></td></tr>'; }).join("") + "</tbody></table></div>" + (more ? '<p><button class="btn o" type="button" id="nt-more">Muat lebih banyak</button></p>' : "")
          : '<div class="card">' + empty("Belum ada riwayat", "Pesan akan muncul di sini setelah aturan event diaktifkan atau pengumuman dikirim.") + "</div>";
        if ($("#nt-more")) $("#nt-more").onclick = function () { query(rows.length).then(function (n) { rows = rows.concat(n); more = n.length === PS; draw(); }); };
      };
      var reload = function () { query(0).then(function (n) { rows = n; more = n.length === PS; draw(); }, function () { $("#nt-rows").innerHTML = errBox("Riwayat tidak bisa dimuat.", 0); }); };
      var detail = function (id) {
        var r = rows.filter(function (x) { return x.id === id; })[0], dl = dialog("nt-det");
        dl.innerHTML = xBtn + '<h2 id="nt-det-t">Detail pesan</h2><div id="nt-db">' + skel() + "</div>"; dl.showModal();
        Promise.all([jak(function () { return sb.from("notif_outbox").select("body,subject,provider,provider_message_id").eq("id", id).maybeSingle(); }), jak(function () { return sb.rpc("admin_notif_attempts", { p_id: id }); })]).then(function (v) {
          var b = v[0] || {}, at = v[1] || [];
          $("#nt-db").innerHTML = '<dl class="kv"><div><dt>Status</dt><dd>' + label(r)[0] + "</dd></div><div><dt>Tujuan</dt><dd>" + esc(r.to_address || "-") + "</dd></div><div><dt>Event</dt><dd>" + esc(EV[r.event] || r.event) + "</dd></div><div><dt>Provider</dt><dd>" + esc(b.provider || "-") + '</dd></div><div><dt>ID pesan provider</dt><dd class="nt-code">' + esc(b.provider_message_id || "-") + "</dd></div><div><dt>Diterima provider</dt><dd>" + esc(wib(r.sent_at)) + "</dd></div><div><dt>Dikonfirmasi terkirim</dt><dd>" + esc(wib(r.delivered_at)) + "</dd></div><div><dt>Percobaan berikutnya</dt><dd>" + (r.status === "pending" ? esc(wib(r.next_attempt_at)) : "-") + "</dd></div></dl>" +
            (b.subject ? "<h3>Subjek</h3><p>" + esc(b.subject) + "</p>" : "") + '<h3>Isi</h3><div class="nt-pre">' + esc(b.body || "") + "</div>" +
            "<h3>Riwayat percobaan</h3>" + (at.length ? '<div class="tbl-w"><table><thead><tr><th>Waktu</th><th>Hasil</th><th>HTTP</th><th>Pesan</th></tr></thead><tbody>' + at.map(function (a) { return "<tr><td>" + esc(wib(a.at)) + "</td><td>" + (a.ok ? "Berhasil" : "Gagal") + "</td><td>" + esc(a.http || "-") + "</td><td>" + esc(a.error || "") + "</td></tr>"; }).join("") + "</tbody></table></div>" : '<p class="sub">Belum ada percobaan.</p>') +
            '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px">' + (canW && (r.status === "failed" || r.status === "cancelled") && r.to_address ? '<button class="btn" type="button" id="nt-rt">Coba kirim ulang</button>' : "") + (canW && r.status === "pending" ? '<button class="btn o danger" type="button" id="nt-cx">Batalkan</button>' : "") + '<button class="btn o" type="button" data-close>Tutup</button></div>';
          if ($("#nt-rt")) $("#nt-rt").onclick = function () { sb.rpc("admin_notif_retry", { p_id: id }).then(function (x) { if (x.error) return toast(errText(x.error), "bad"); dl.close(); toast("Masuk antrean lagi.", "ok"); sendNow(reload); }); };
          if ($("#nt-cx")) $("#nt-cx").onclick = function () { sb.rpc("admin_notif_cancel", { p_id: id }).then(function (x) { if (x.error) return toast(errText(x.error), "bad"); dl.close(); toast("Dibatalkan.", "ok"); reload(); }); };
        }).catch(function () { $("#nt-db").innerHTML = errBox("Detail tidak bisa dimuat.", 0); });
      };
      jak(function () { return sb.rpc("admin_notif_overview"); }).then(function (o) {
        var s = o.by_status || {}, tile = function (l, k) { return '<div class="card"><b>' + (s[k] || 0) + "</b><span class=\"sub\">" + esc(l) + "</span></div>"; };
        root.innerHTML = '<p class="note">30 hari terakhir. <b>Diterima provider</b> berarti provider menerima permintaan kirim; <b>Terkirim</b> hanya bila provider mengonfirmasi lewat callback.</p><div class="nt-stat">' + tile("Menunggu", "pending") + tile("Diterima provider", "sent") + tile("Terkirim", "delivered") + tile("Gagal", "failed") + tile("Dilewati", "skipped") + "</div>" +
          '<div class="nt-tool"><label class="fld grow">Cari tujuan<input id="h-q" placeholder="email atau nomor"></label><label class="fld">Status<select id="h-st"><option value="">Semua</option>' + Object.keys(STL).map(function (k) { return '<option value="' + k + '">' + esc(STL[k][0]) + "</option>"; }).join("") + '</select></label><label class="fld">Kanal<select id="h-ch"><option value="">Semua</option><option value="email">Email</option><option value="whatsapp">WhatsApp</option></select></label><label class="fld">Event<select id="h-ev"><option value="">Semua</option>' + Object.keys(EV).map(function (k) { return '<option value="' + k + '">' + esc(EV[k]) + "</option>"; }).join("") + "</select></label>" + (canW ? '<button class="btn o" type="button" id="h-run">Proses antrean sekarang</button>' : "") + '</div><div id="nt-rows"></div>';
        var t; $("#h-q").oninput = function (e) { f.q = e.target.value.trim(); clearTimeout(t); t = setTimeout(reload, 300); };
        $("#h-st").onchange = function (e) { f.st = e.target.value; reload(); }; $("#h-ch").onchange = function (e) { f.ch = e.target.value; reload(); }; $("#h-ev").onchange = function (e) { f.ev = e.target.value; reload(); };
        if ($("#h-run")) $("#h-run").onclick = function () { sendNow(reload); };
        $("#nt-rows").onclick = function (e) { var b = e.target.closest("[data-i]"); if (b) detail(b.dataset.i); };
        reload();
      }).catch(function () { root.innerHTML = errBox("Riwayat tidak bisa dimuat. Pastikan backend/admin-notifications.sql sudah dijalankan.", 1); });
    }

    /* ---------- Template ---------- */
    function renderTpl(root) {
      var canW = can("notifications", "write"), rows = []; root.innerHTML = skel();
      var load = function () { return jak(function () { return sb.from("notif_templates").select("*").order("key").order("channel"); }).then(function (r) { rows = r || []; }); };
      var show = function () {
        root.innerHTML = '<p class="note">Template dipakai oleh aturan event. Variabel ditulis seperti <code>{{nama}}</code>. Pesan WhatsApp tidak punya subjek.</p><div class="nt-tool">' + (canW ? '<button class="btn" type="button" id="tp-new">Tambah template</button>' : "") + "</div>" +
          (rows.length ? '<div class="card tbl-w"><table class="nt-tbl"><thead><tr><th>Nama</th><th>Kunci</th><th>Kanal</th><th>Status</th><th>Diubah (WIB)</th><th></th></tr></thead><tbody>' + rows.map(function (r) { return "<tr><td><b>" + esc(r.name) + "</b></td><td><code>" + esc(r.key) + "</code></td><td>" + esc(CH[r.channel]) + "</td><td>" + (r.active ? '<span class="badge ok">Aktif</span>' : '<span class="badge">Nonaktif</span>') + "</td><td>" + esc(wib(r.updated_at)) + '</td><td><button class="btn o sm" type="button" data-t="' + esc(r.id) + '">' + (canW ? "Ubah" : "Lihat") + "</button></td></tr>"; }).join("") + "</tbody></table></div>" : '<div class="card">' + empty("Belum ada template", "") + "</div>");
        if ($("#tp-new")) $("#tp-new").onclick = function () { edit(null); };
        root.onclick = function (e) { var b = e.target.closest("[data-t]"); if (b) edit(rows.filter(function (r) { return r.id === b.dataset.t; })[0]); };
      };
      var again = function () { load().then(show).catch(function () { root.innerHTML = errBox("Template tidak bisa dimuat.", 1); root.onclick = function (ev) { if (ev.target.closest("[data-retry]")) again(); }; }); };
      function edit(t) {
        var dl = dialog("nt-tpl"); t = t || { key: "", channel: "email", name: "", subject: "", body: "", active: true };
        dl.innerHTML = xBtn + '<h2 id="nt-tpl-t">' + (t.id ? (canW ? "Ubah template" : "Template") : "Tambah template") + '</h2><form id="nt-tf" class="nt-f" novalidate><label class="fld">Nama<input id="t-n" maxlength="100" value="' + esc(t.name) + '"' + (canW ? "" : " disabled") + '></label><label class="fld">Kunci<input id="t-k" maxlength="41" value="' + esc(t.key) + '"' + (t.id || !canW ? " disabled" : "") + ' placeholder="contoh: payment_paid"></label><label class="fld">Kanal<select id="t-c"' + (t.id || !canW ? " disabled" : "") + '><option value="email"' + (t.channel === "email" ? " selected" : "") + '>Email</option><option value="whatsapp"' + (t.channel === "whatsapp" ? " selected" : "") + ">WhatsApp</option></select></label>" +
          '<label class="chk-l"><input type="checkbox" id="t-a"' + (t.active ? " checked" : "") + (canW ? "" : " disabled") + '> Aktif</label><label class="fld full" id="t-sw">Subjek email<input id="t-s" maxlength="150" value="' + esc(t.subject || "") + '"' + (canW ? "" : " disabled") + '></label><label class="fld full">Isi pesan<textarea id="t-b" rows="8" maxlength="4000"' + (canW ? "" : " disabled") + ">" + esc(t.body) + '</textarea></label><div class="full"><span class="sub">Sisipkan variabel:</span><div class="nt-chips" id="t-v">' + VARS.map(function (v) { return '<button type="button" data-v="' + v + '">{{' + v + "}}</button>"; }).join("") + '</div></div><div class="full"><b>Pratinjau</b> <span class="sub">(data contoh)</span><div class="nt-pre" id="t-p"></div></div><p class="nt-e full" id="t-e" role="alert"></p><div class="full" style="display:flex;gap:8px;flex-wrap:wrap">' + (canW ? '<button class="btn" type="submit">Simpan</button>' : "") + '<button class="btn o" type="button" data-close>Tutup</button></div></form>';
        dl.showModal(); var err = function (m) { $("#t-e").textContent = m || ""; }, tm;
        var sw = function () { $("#t-sw").hidden = $("#t-c").value !== "email"; }; sw(); $("#t-c").onchange = function () { sw(); prev(); };
        var prev = function () { sb.rpc("admin_notif_preview", { p_subject: $("#t-s").value, p_body: $("#t-b").value }).then(function (r) { if (r.error || !r.data) return; $("#t-p").textContent = ($("#t-c").value === "email" && r.data.subject ? "Subjek: " + r.data.subject + "\n\n" : "") + r.data.body; }); };
        $("#t-s").oninput = $("#t-b").oninput = function () { clearTimeout(tm); tm = setTimeout(prev, 250); }; prev();
        $("#t-v").onclick = function (e) { var b = e.target.closest("[data-v]"); if (!b || !canW) return; var ta = $("#t-b"), s = ta.selectionStart || ta.value.length, v = "{{" + b.dataset.v + "}}"; ta.value = ta.value.slice(0, s) + v + ta.value.slice(ta.selectionEnd || s); ta.focus(); ta.setSelectionRange(s + v.length, s + v.length); prev(); };
        $("#nt-tf").onsubmit = function (e) {
          e.preventDefault(); err(""); if (!canW) return;
          sb.rpc("admin_notif_template_save", { p_id: t.id || null, p_key: $("#t-k").value.trim(), p_channel: $("#t-c").value, p_name: $("#t-n").value, p_subject: $("#t-c").value === "email" ? $("#t-s").value : null, p_body: $("#t-b").value, p_active: $("#t-a").checked }).then(function (r) { if (r.error) return err(errText(r.error)); dl.close(); toast("Template tersimpan.", "ok"); again(); });
        };
      }
      again();
    }

    /* ---------- Aturan event ---------- */
    function renderRules(root) {
      var canW = can("notifications", "write"); root.innerHTML = skel();
      Promise.all([jak(function () { return sb.from("notif_rules").select("*").order("event"); }), jak(function () { return sb.from("notif_templates").select("key,channel,name,active").eq("lang", "id"); }), cfgStatus()]).then(function (v) {
        var rules = v[0] || [], tpl = v[1] || [], cs = v[2], name = function (r) { var t = tpl.filter(function (x) { return x.key === r.template_key && x.channel === r.channel; })[0]; return t ? esc(t.name) + (t.active ? "" : ' <span class="badge">Nonaktif</span>') : '<span class="badge bad">Template hilang</span>'; };
        var ready = function (c) { return cs ? (c === "email" ? cs.email.configured : cs.whatsapp.configured) : null; };
        var evs = []; rules.forEach(function (r) { if (evs.indexOf(r.event) < 0) evs.push(r.event); });
        root.innerHTML = '<p class="note">Setiap aturan menentukan pesan apa yang otomatis dibuat saat sebuah event terjadi. Semua aturan <b>nonaktif</b> sampai Anda menyalakannya. Kanal yang provider-nya belum terhubung tetap membuat pesan, tetapi pesan menunggu di antrean.</p>' +
          (cs && (!cs.email.configured || !cs.whatsapp.configured) ? '<div class="card nt-warn" role="status"><b>Provider belum lengkap:</b> ' + (!cs.email.configured ? "Email " + (cs.email.has_key ? "(email pengirim belum diisi)" : "(RESEND_API_KEY belum diatur)") : "") + (!cs.email.configured && !cs.whatsapp.configured ? ", " : "") + (!cs.whatsapp.configured ? "WhatsApp (WA_TOKEN belum diatur)" : "") + ". Lihat tab Pengaturan.</div>" : "") +
          '<div class="card tbl-w"><table class="nt-tbl"><thead><tr><th>Event</th><th>Kanal</th><th>Penerima</th><th>Template</th><th>Aktif</th></tr></thead><tbody>' + evs.map(function (ev) { return rules.filter(function (r) { return r.event === ev; }).map(function (r, i) {
            var rd = ready(r.channel);
            return "<tr>" + (i === 0 ? '<td rowspan="' + rules.filter(function (x) { return x.event === ev; }).length + '"><b>' + esc(EV[ev] || ev) + "</b></td>" : "") + "<td>" + esc(CH[r.channel]) + (rd === false ? ' <span class="cell-s">provider belum terhubung</span>' : "") + "</td><td>" + (r.recipient === "customer" ? "Pelanggan" : "Tim internal") + "</td><td>" + name(r) + '</td><td><label class="nt-sw"><input type="checkbox" data-r="' + esc(r.event + "|" + r.channel + "|" + r.recipient) + '"' + (r.enabled ? " checked" : "") + (canW ? "" : " disabled") + ' aria-label="Aktifkan aturan"> ' + (r.enabled ? "Aktif" : "Mati") + "</label></td></tr>"; }).join(""); }).join("") + "</tbody></table></div>";
        root.onchange = function (e) {
          var c = e.target.closest("[data-r]"); if (!c) return; var p = c.dataset.r.split("|"), on = c.checked;
          sb.rpc("admin_notif_rule_set", { p_event: p[0], p_channel: p[1], p_recipient: p[2], p_enabled: on }).then(function (r) { if (r.error) { c.checked = !on; return toast(errText(r.error), "bad"); } c.parentNode.lastChild.textContent = on ? " Aktif" : " Mati"; toast(on ? "Aturan diaktifkan." : "Aturan dimatikan.", "ok"); });
        };
      }).catch(function () { root.innerHTML = errBox("Aturan tidak bisa dimuat. Pastikan backend/admin-notifications.sql sudah dijalankan.", 0); });
    }

    /* ---------- Pengaturan ---------- */
    function renderSet(root) {
      var canW = can("notifications", "write"); root.innerHTML = skel();
      Promise.all([jak(function () { return sb.from("notif_settings").select("key,value"); }), jak(function () { return sb.rpc("admin_notif_overview"); }), cfgStatus()]).then(function (v) {
        var S = {}; (v[0] || []).forEach(function (x) { S[x.key] = x.value; }); var o = v[1] || {}, cs = v[2], str = function (k) { return typeof S[k] === "string" ? S[k] : ""; }, lines = function (k) { return Array.isArray(S[k]) ? S[k].join("\n") : ""; };
        var ok = function (b) { return b ? '<span class="badge ok">Terhubung</span>' : '<span class="badge bad">Belum</span>'; };
        var age = o.last_dispatch_at ? (Date.now() - new Date(o.last_dispatch_at).getTime()) / 60000 : null, stale = age === null || age > 15;
        root.innerHTML = (o.paused ? '<div class="card nt-warn" role="alert"><b>Pengiriman sedang dijeda.</b> Pesan baru tetap masuk antrean tetapi tidak dikirim sampai dijeda dimatikan.</div>' : "") +
          (stale ? '<div class="card nt-warn" role="status"><b>Penjadwal pengirim ' + (age === null ? "belum pernah berjalan" : "terakhir berjalan " + Math.round(age) + " menit lalu") + ".</b> Pesan baru, percobaan ulang, pengingat langganan, dan pengumuman terjadwal baru diproses saat pengirim berjalan. Atur jadwal berkala (lihat panduan di bawah) atau tekan \"Proses antrean sekarang\".</div>" : "") +
          '<div class="nt-stat"><div class="card"><b>' + (o.backlog || 0) + '</b><span class="sub">Antrean menunggu</span></div><div class="card"><b>' + ok(cs && cs.email.configured) + '</b><span class="sub">Email (Resend)</span></div><div class="card"><b>' + ok(cs && cs.whatsapp.configured) + '</b><span class="sub">WhatsApp (Fonnte)</span></div><div class="card"><b>' + ok(cs && cs.webhook_secret) + '</b><span class="sub">Callback terkirim</span></div></div>' +
          (cs ? "" : '<div class="card nt-warn" role="status">Edge Function <code>notify-dispatch</code> belum dapat dihubungi, jadi status provider tidak diketahui. Deploy fungsinya dulu.</div>') +
          '<form id="st-f" class="card nt-f" novalidate><h3 class="full">Pengirim email</h3><label class="fld">Nama pengirim<input id="s-fn" maxlength="120" value="' + esc(str("email_from_name")) + '"' + (canW ? "" : " disabled") + '></label><label class="fld">Email pengirim<input id="s-fa" type="email" maxlength="120" value="' + esc(str("email_from_address")) + '" placeholder="info@domain-terverifikasi.com"' + (canW ? "" : " disabled") + '><small class="sub">Domain harus terverifikasi di Resend.</small></label><label class="fld">Email balasan (opsional)<input id="s-rt" type="email" maxlength="120" value="' + esc(str("email_reply_to")) + '"' + (canW ? "" : " disabled") + ">" +
          '</label><h3 class="full">Percobaan ulang otomatis</h3><label class="fld">Maksimal percobaan<input id="s-ma" type="number" min="1" max="10" value="' + esc(S.max_attempts || 3) + '"' + (canW ? "" : " disabled") + '><small class="sub">Berlaku untuk pesan baru.</small></label><label class="fld">Jeda dasar (menit)<input id="s-rb" type="number" min="1" max="1440" value="' + esc(S.retry_base_minutes || 5) + '"' + (canW ? "" : " disabled") + '><small class="sub">Jeda berlipat: 5, 10, 20 menit dst.</small></label>' +
          '<h3 class="full">Penerima notifikasi internal</h3><label class="fld">Email tim (satu per baris)<textarea id="s-ie" rows="4"' + (canW ? "" : " disabled") + ">" + esc(lines("internal_emails")) + '</textarea></label><label class="fld">WhatsApp tim (satu per baris)<textarea id="s-iw" rows="4" placeholder="08123456789"' + (canW ? "" : " disabled") + ">" + esc(lines("internal_whatsapp")) + '</textarea></label><label class="chk-l full"><input type="checkbox" id="s-pa"' + (o.paused ? " checked" : "") + (canW ? "" : " disabled") + '> Jeda semua pengiriman (tombol darurat)</label><p class="nt-e full" id="s-e" role="alert"></p>' +
          (canW ? '<div class="full" style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" type="submit">Simpan pengaturan</button><button class="btn o" type="button" id="s-run">Proses antrean sekarang</button></div>' : "") + "</form>" +
          (canW ? '<form id="ts-f" class="card nt-f" novalidate><h3 class="full">Kirim pesan uji</h3><label class="fld">Kanal<select id="ts-c"><option value="email">Email</option><option value="whatsapp">WhatsApp</option></select></label><label class="fld">Tujuan<input id="ts-t" placeholder="email atau nomor"></label><p class="nt-e full" id="ts-e" role="alert"></p><div class="full"><button class="btn o" type="submit">Kirim uji</button> <span class="sub">Hasil terlihat di tab Riwayat.</span></div></form>' : "") +
          '<div class="card"><h3>Panduan menghubungkan provider</h3><ol><li>Daftar Resend, verifikasi domain, lalu buat API key. Daftar Fonnte (atau penyedia WhatsApp serupa) untuk token.</li><li>Isi <b>Secrets</b> Edge Function (Supabase, Edge Functions, Secrets): <code>RESEND_API_KEY</code>, <code>WA_TOKEN</code>, <code>NOTIFY_DISPATCH_SECRET</code> (kata acak panjang), <code>RESEND_WEBHOOK_SECRET</code>. Jangan simpan kunci di repo atau di Hostinger.</li><li>Deploy: <code>supabase functions deploy notify-dispatch --no-verify-jwt</code> dan <code>supabase functions deploy notify-webhook --no-verify-jwt</code>.</li><li>Di Resend, tambahkan webhook ke <span class="nt-code">https://&lt;project-ref&gt;.supabase.co/functions/v1/notify-webhook</span> untuk event delivered, bounced, dan failed. Tanpa ini, email berhenti di "Diterima provider".</li><li>Jadwalkan pemanggilan tiap 5 menit (Supabase, Integrations, Cron): POST ke <span class="nt-code">/functions/v1/notify-dispatch</span> dengan header <code>x-dispatch-secret</code>.</li></ol><p class="sub">WhatsApp: konfirmasi "Terkirim" belum tersedia dari penyedia ini, jadi pesan WhatsApp berhenti di "Diterima provider".</p></div>';
        var err = function (id, m) { $(id).textContent = m || ""; };
        if ($("#st-f")) {
          $("#st-f").onsubmit = function (e) {
            e.preventDefault(); if (!canW) return; err("#s-e", "");
            var ln = function (id) { return $(id).value.split(/\r?\n/).map(function (s) { return s.trim(); }).filter(Boolean); };
            var p = { email_from_name: $("#s-fn").value.trim(), email_from_address: $("#s-fa").value.trim(), email_reply_to: $("#s-rt").value.trim(), max_attempts: Number($("#s-ma").value), retry_base_minutes: Number($("#s-rb").value), internal_emails: ln("#s-ie"), internal_whatsapp: ln("#s-iw"), paused: $("#s-pa").checked };
            sb.rpc("admin_notif_settings_save", { p: p }).then(function (r) { if (r.error) return err("#s-e", errText(r.error)); toast("Pengaturan tersimpan.", "ok"); renderSet(root); });
          };
          if ($("#s-run")) $("#s-run").onclick = function () { sendNow(function () { renderSet(root); }); };
        }
        if ($("#ts-f")) $("#ts-f").onsubmit = function (e) {
          e.preventDefault(); err("#ts-e", "");
          sb.rpc("admin_notif_test", { p_channel: $("#ts-c").value, p_to: $("#ts-t").value }).then(function (r) { if (r.error) return err("#ts-e", errText(r.error)); toast("Pesan uji masuk antrean.", "ok"); sendNow(); });
        };
      }).catch(function () { root.innerHTML = errBox("Pengaturan tidak bisa dimuat. Pastikan backend/admin-notifications.sql sudah dijalankan.", 0); });
    }

    var m = M.filter(function (x) { return x.key === "notifications"; })[0];
    if (m) {
      var keep = (m.tabs || []).filter(function (t) { return t.key === "alerts"; });
      m.tabs = [{ key: "ann", label: "Pengumuman", render: renderAnn0 }, { key: "hist", label: "Riwayat Pengiriman", render: renderHist }, { key: "tpl", label: "Template Pesan", render: renderTpl }, { key: "rules", label: "Aturan Event", render: renderRules }, { key: "set", label: "Pengaturan", render: renderSet }].concat(keep);
      m.render = null;
    }
  });
})();
