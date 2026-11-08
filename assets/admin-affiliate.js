/* NusaMora Admin: Affiliate & Referral (menumpang pada assets/admin.js lewat window.NM_ADMIN_EXT). Penegakan aturan ada di database (backend/admin-affiliate.sql). */
(function () {
  "use strict";
  window.NM_ADMIN_EXT = window.NM_ADMIN_EXT || [];
  window.NM_ADMIN_EXT.push(function (X) {
    var sb = X.sb, $ = X.$, esc = X.esc, rp = X.rp, toast = X.toast, empty = X.empty, skel = X.skel, errBox = X.errBox, dlgConfirm = X.dlgConfirm, can = X.can, M = X.M, d = document;
    var ERR = { forbidden: "Anda tidak berhak melakukan ini.", alasan_wajib: "Alasan wajib diisi (minimal 3 karakter).", referensi_transfer_wajib: "Referensi transfer wajib diisi (3 sampai 80 karakter).", penarikan_sudah_diproses: "Penarikan ini sudah diproses.",
      rekening_tidak_menunggu: "Rekening ini tidak sedang menunggu verifikasi.", status_tidak_bisa_ditinjau: "Komisi ini sudah ditinjau.", affiliate_tidak_aktif: "Affiliate tidak aktif, komisi tidak bisa disetujui.", invoice_tidak_lunas: "Invoice belum lunas atau sudah direfund.",
      commission_value_tidak_valid: "Nilai komisi di luar batas (persen 0,5 sampai 50; tetap Rp 1.000 sampai Rp 5.000.000).", commission_type_tidak_valid: "Jenis komisi tidak valid.", attribution_days_tidak_valid: "Masa atribusi 1 sampai 180 hari.",
      hold_days_tidak_valid: "Masa tahan 0 sampai 90 hari.", min_withdrawal_tidak_valid: "Minimum penarikan Rp 10.000 sampai Rp 10.000.000.", fraud_ip_limit_tidak_valid: "Batas pendaftar per IP 1 sampai 50.", fraud_fast_minutes_tidak_valid: "Batas bayar cepat 0 sampai 1440 menit.",
      affiliate_tidak_ditemukan: "Affiliate tidak ditemukan.", referral_tidak_ditemukan: "Referral tidak ditemukan.", penarikan_tidak_ditemukan: "Penarikan tidak ditemukan." };
    var errText = function (e) { var m = String(e && (e.message || e.error || e) || ""), k = Object.keys(ERR).filter(function (x) { return m.indexOf(x) > -1; })[0]; return k ? ERR[k] : "Gagal: " + m; };
    var jak = function (fn) { return new Promise(function (res, rej) { Promise.resolve(fn()).then(function (r) { if (r && r.error) rej(r.error); else res(r.data); }, rej); }); };
    var wib = function (s) { if (!s) return "-"; var x = new Date(s); return isNaN(x) ? "-" : x.toLocaleString("id-ID", { timeZone: "Asia/Jakarta", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }); };
    var xBtn = '<button class="icon-btn x" type="button" data-close aria-label="Tutup"><svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button>';
    var CS = { none: ["-", ""], pending: ["Ditahan", "warn"], review: ["Perlu tinjauan", "bad"], approved: ["Disetujui", "ok"], rejected: ["Ditolak", "bad"], reversed: ["Dibatalkan (refund)", "bad"] };
    var BS = { none: ["Belum ada", ""], pending: ["Menunggu verifikasi", "warn"], verified: ["Terverifikasi", "ok"], rejected: ["Ditolak", "bad"] };
    var AS = { pending: ["Menunggu", "warn"], aktif: ["Aktif", "ok"], suspended: ["Ditangguhkan", "bad"] };
    var WS = { diproses: ["Menunggu", "warn"], berhasil: ["Dibayar", "ok"], ditolak: ["Ditolak", "bad"] };
    var FR = { affiliate_tidak_aktif: "Affiliate tidak aktif", ip_sama_dengan_affiliate: "IP sama dengan affiliate", ip_banyak_pendaftar: "Banyak pendaftar dari satu IP", bayar_terlalu_cepat: "Bayar terlalu cepat setelah daftar", rekening_dipakai_banyak_affiliate: "Rekening dipakai banyak affiliate", whatsapp_sama: "WhatsApp sama dengan affiliate", klik_beruntun: "Klik beruntun mencurigakan" };
    var bd = function (map, k) { var x = map[k] || [k || "-", ""]; return '<span class="badge ' + x[1] + '">' + esc(x[0]) + "</span>"; };
    var canW = function () { return can("affiliate", "write"); };
    var PAGE = 25;

    if (!d.getElementById("af-css")) {
      var st = d.createElement("style"); st.id = "af-css";
      st.textContent = "#view #body{grid-template-columns:minmax(0,1fr)}#view #body>*{min-width:0}dialog.af-d{max-width:760px;width:calc(100% - 32px)}.af-d [hidden]{display:none!important}.af-d>*{min-width:0}.af-d h2{overflow-wrap:anywhere}.af-d .tbl-w{max-width:100%;overflow-x:auto}.af-f{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(min(220px,100%),1fr))}.af-f .full{grid-column:1/-1}.af-e{color:var(--bad,#b3261e);min-height:1.2em}.af-tool{display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end;margin-bottom:14px}.af-tool .fld{min-width:150px}.af-warn{border-left:4px solid var(--warn,#b26a00);padding:10px 14px;margin-bottom:14px}.af-cards{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(min(200px,100%),1fr));margin-bottom:16px}.af-cards .card{padding:14px;min-width:0}.af-cards b{display:block;font-size:1.25rem;overflow-wrap:anywhere}.af-pg{display:flex;gap:10px;align-items:center;justify-content:flex-end;margin-top:12px}.af-btns{display:flex;gap:8px;flex-wrap:wrap}.af-sec{margin:18px 0 6px;font-size:1rem}.af-kv{display:grid;grid-template-columns:minmax(110px,170px) 1fr;gap:6px 12px;margin:0}.af-kv dt{color:var(--muted,#667)}.af-kv dd{margin:0;overflow-wrap:anywhere}";
      d.head.appendChild(st);
    }
    function dialog(id) { var dl = $("#" + id); if (dl) dl.remove(); dl = d.createElement("dialog"); dl.id = id; dl.className = "wide af-d"; dl.setAttribute("aria-labelledby", id + "-t"); d.body.appendChild(dl); dl.addEventListener("click", function (e) { if (e.target.closest("[data-close]")) dl.close(); }); return dl; }
    function ask(title, intro, fields, yes, cls) { /* dialog isian kecil; resolve(objek nilai) atau null bila batal */
      return new Promise(function (res) {
        var dl = dialog("af-ask"), done = false;
        dl.innerHTML = '<div class="dlg-h"><h2 id="af-ask-t">' + esc(title) + "</h2>" + xBtn + '</div><form class="af-f" novalidate><p class="full sub">' + esc(intro || "") + "</p>" + fields.map(function (f) {
          return '<label class="fld full"><span>' + esc(f.l) + '</span><' + (f.t === "textarea" ? 'textarea rows="3"' : 'input type="text"') + ' name="' + f.k + '" maxlength="' + (f.max || 200) + '"' + (f.ph ? ' placeholder="' + esc(f.ph) + '"' : "") + (f.t === "textarea" ? "></textarea>" : ">") + "</label>";
        }).join("") + '<div class="full af-e" role="alert"></div><div class="full af-btns"><button class="btn ' + (cls || "") + '" type="submit">' + esc(yes) + '</button><button class="btn o" type="button" data-close>Batal</button></div></form>';
        dl.addEventListener("close", function () { if (!done) res(null); }, { once: true });
        dl.querySelector("form").addEventListener("submit", function (e) {
          e.preventDefault(); var o = {}, bad = "";
          fields.forEach(function (f) { var v = String(dl.querySelector('[name="' + f.k + '"]').value || "").trim(); o[f.k] = v; if (f.min && v.length < f.min) bad = f.l + " minimal " + f.min + " karakter."; });
          if (bad) { dl.querySelector(".af-e").textContent = bad; return; }
          done = true; dl.close(); res(o);
        });
        dl.showModal();
      });
    }
    function run(p, okMsg, after) { return p.then(function () { toast(okMsg); if (after) after(); }, function (e) { toast(errText(e), "bad"); }); }
    function pager(root, st, total, cb) {
      var pg = root.querySelector(".af-pg"); if (!pg) return;
      var last = Math.max(0, Math.ceil(total / PAGE) - 1);
      pg.innerHTML = '<span class="sub">' + total + ' data, halaman ' + (st.page + 1) + " dari " + (last + 1) + '</span><button class="btn o" type="button" data-p="-1"' + (st.page <= 0 ? " disabled" : "") + '>Sebelumnya</button><button class="btn o" type="button" data-p="1"' + (st.page >= last ? " disabled" : "") + ">Berikutnya</button>";
      pg.onclick = function (e) { var b = e.target.closest("[data-p]"); if (!b || b.disabled) return; st.page += +b.getAttribute("data-p"); cb(); };
    }
    function banner(on) { return on ? "" : '<div class="af-warn card"><b>Program affiliate belum dibuka (Coming Soon).</b> Pelanggan melihat halaman "Segera hadir" dan belum bisa mendaftar. Atur dan buka program di tab Pengaturan Program.</div>'; }
    function csv(name, rows) {
      var q = function (v) { v = v == null ? "" : String(v); if (/^[=+\-@\t\r]/.test(v)) v = "'" + v; return '"' + v.replace(/"/g, '""') + '"'; };
      var blob = new Blob(["﻿" + rows.map(function (r) { return r.map(q).join(","); }).join("\r\n")], { type: "text/csv;charset=utf-8" }), a = d.createElement("a");
      a.href = URL.createObjectURL(blob); a.download = name; d.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    }

    /* ---------- Ringkasan ---------- */
    function renderOv(root) {
      root.innerHTML = skel();
      jak(function () { return sb.rpc("admin_aff_overview"); }).then(function (o) {
        var c = o.commission || {}, w = o.withdrawals || {}, a = o.affiliates || {};
        var card = function (l, v, s) { return '<div class="card"><span class="sub">' + esc(l) + "</span><b>" + v + "</b>" + (s ? '<span class="sub">' + s + "</span>" : "") + "</div>"; };
        root.innerHTML = banner(o.enabled) + '<div class="af-cards">' + card("Affiliate aktif", a.aktif || 0, (a.pending || 0) + " menunggu persetujuan, " + (a.suspended || 0) + " ditangguhkan") + card("Rekening menunggu verifikasi", a.bank_pending || 0) +
          card("Klik 30 hari", o.clicks_30d || 0) + card("Pendaftar 30 hari", o.signups_30d || 0) + card("Pelanggan berbayar 30 hari", o.paid_30d || 0) +
          card("Komisi ditahan", rp(c.pending || 0)) + card("Komisi perlu tinjauan", rp(c.review || 0), (o.review_count || 0) + " referral") + card("Komisi disetujui", rp(c.approved || 0)) +
          card("Penarikan menunggu", w.waiting || 0, rp(w.waiting_amount || 0)) + card("Sudah dibayarkan", rp(w.paid_amount || 0)) + "</div>" +
          '<h3 class="af-sec">Affiliate teratas</h3>' + ((o.top || []).length ? '<div class="card tbl-w"><table><thead><tr><th>Kode</th><th>Pendaftar</th><th>Berbayar</th><th>Komisi disetujui</th></tr></thead><tbody>' + o.top.map(function (t) { return "<tr><td><b>" + esc(t.code) + "</b></td><td>" + t.signups + "</td><td>" + t.paid + "</td><td>" + rp(t.commission) + "</td></tr>"; }).join("") + "</tbody></table></div>" : empty("Belum ada data affiliate."));
      }, function (e) { root.innerHTML = errBox(errText(e)); });
    }

    /* ---------- Daftar affiliate ---------- */
    function renderList(root) {
      var S = { page: 0, status: "", bank: "", q: "" };
      root.innerHTML = '<div class="af-tool"><label class="fld"><span>Cari</span><input type="search" id="al-q" placeholder="Kode, nama, email"></label><label class="fld"><span>Status</span><select id="al-s"><option value="">Semua</option><option value="pending">Menunggu</option><option value="aktif">Aktif</option><option value="suspended">Ditangguhkan</option></select></label>' +
        '<label class="fld"><span>Rekening</span><select id="al-b"><option value="">Semua</option><option value="pending">Menunggu verifikasi</option><option value="verified">Terverifikasi</option><option value="rejected">Ditolak</option><option value="none">Belum ada</option></select></label></div><div id="al-t"></div><div class="af-pg"></div>';
      function load() {
        var t = $("#al-t"); t.innerHTML = skel();
        jak(function () { return sb.rpc("admin_aff_list", { p_status: S.status || null, p_bank: S.bank || null, p_q: S.q || null, p_limit: PAGE, p_offset: S.page * PAGE }); }).then(function (r) {
          var rows = r.rows || [];
          t.innerHTML = rows.length ? '<div class="card tbl-w"><table><thead><tr><th>Affiliate</th><th>Status</th><th>Rekening</th><th>Klik</th><th>Daftar</th><th>Berbayar</th><th>Komisi</th><th>Saldo</th><th></th></tr></thead><tbody>' + rows.map(function (a) {
            return "<tr><td><b>" + esc(a.code) + '</b><span class="cell-s">' + esc(a.name || "") + " " + esc(a.email || "") + "</span></td><td>" + bd(AS, a.status) + "</td><td>" + bd(BS, a.bank_status) + "</td><td>" + a.clicks + "</td><td>" + a.signups + "</td><td>" + a.paid + (a.in_review ? ' <span class="badge bad">' + a.in_review + " ditinjau</span>" : "") + "</td><td>" + rp(a.commission) + "</td><td>" + rp(a.balance) + '</td><td><button class="btn o" type="button" data-id="' + esc(a.id) + '">Detail</button></td></tr>';
          }).join("") + "</tbody></table></div>" : empty("Tidak ada affiliate yang cocok.");
          pager(root, S, r.total || 0, load);
        }, function (e) { t.innerHTML = errBox(errText(e)); });
      }
      var tm; $("#al-q").addEventListener("input", function (e) { clearTimeout(tm); tm = setTimeout(function () { S.q = e.target.value; S.page = 0; load(); }, 300); });
      $("#al-s").addEventListener("change", function (e) { S.status = e.target.value; S.page = 0; load(); });
      $("#al-b").addEventListener("change", function (e) { S.bank = e.target.value; S.page = 0; load(); });
      root.addEventListener("click", function (e) { var b = e.target.closest("[data-id]"); if (b) detail(b.getAttribute("data-id"), load); });
      load();
    }
    function detail(id, reload) {
      var dl = dialog("af-det"); dl.innerHTML = '<div class="dlg-h"><h2 id="af-det-t">Detail affiliate</h2>' + xBtn + '</div><div id="af-db">' + skel() + "</div>"; dl.showModal();
      function show() {
        jak(function () { return sb.rpc("admin_aff_detail", { p_id: id }); }).then(function (a) {
          var b = a.bank || {}, s = a.stats || {}, W = canW(), rate = a.rate || {};
          var rl = rate.value == null ? "Mengikuti pengaturan program" : (rate.type === "percent" ? rate.value + "%" : rp(rate.value) + " per konversi");
          $("#af-det-t").textContent = a.code + " · " + (a.name || "");
          $("#af-db").innerHTML = '<dl class="af-kv"><dt>Status</dt><dd>' + bd(AS, a.status) + (a.status_reason ? " " + esc(a.status_reason) : "") + "</dd><dt>Email</dt><dd>" + esc(a.email || "-") + "</dd><dt>WhatsApp</dt><dd>" + esc(a.whatsapp || "-") + "</dd><dt>Terdaftar</dt><dd>" + esc(wib(a.created_at)) + "</dd><dt>Komisi</dt><dd>" + esc(rl) + "</dd></dl>" +
            '<h3 class="af-sec">Kinerja</h3><dl class="af-kv"><dt>Klik</dt><dd>' + s.clicks + " (30 hari: " + s.clicks_30d + ")</dd><dt>Pendaftar</dt><dd>" + s.signups + "</dd><dt>Berbayar</dt><dd>" + s.paid + "</dd><dt>Komisi ditahan</dt><dd>" + rp(s.commission_pending) + "</dd><dt>Komisi disetujui</dt><dd>" + rp(s.commission_approved) + "</dd><dt>Sudah ditarik</dt><dd>" + rp(s.withdrawn) + "</dd><dt>Saldo sekarang</dt><dd>" + rp(s.balance) + "</dd></dl>" +
            '<h3 class="af-sec">Rekening bank</h3><dl class="af-kv"><dt>Status</dt><dd>' + bd(BS, b.status) + "</dd><dt>Bank</dt><dd>" + esc(b.name || "-") + "</dd><dt>No. rekening</dt><dd>" + esc(b.account_no || "-") + "</dd><dt>Atas nama</dt><dd>" + esc(b.account_name || "-") + (b.name_match === true ? ' <span class="badge ok">Sama dengan nama akun</span>' : b.name_match === false ? ' <span class="badge warn">Berbeda dari nama akun</span>' : "") + "</dd>" +
            (b.shared_with ? '<dt>Peringatan</dt><dd><span class="badge bad">Rekening sama dipakai ' + b.shared_with + " affiliate lain</span></dd>" : "") + (b.note ? "<dt>Catatan</dt><dd>" + esc(b.note) + "</dd>" : "") + "</dl>" +
            (W ? '<div class="af-btns" style="margin-top:16px">' + (a.status !== "aktif" ? '<button class="btn" type="button" data-a="on">Aktifkan</button>' : '<button class="btn o bad" type="button" data-a="off">Tangguhkan</button>') + (b.status === "pending" ? '<button class="btn" type="button" data-a="bv">Verifikasi rekening</button><button class="btn o bad" type="button" data-a="br">Tolak rekening</button>' : "") + '<button class="btn o" type="button" data-a="rate">Atur komisi khusus</button></div>' : '<p class="sub">Anda hanya punya akses baca.</p>');
          $("#af-db").onclick = function (e) {
            var k = e.target.closest("[data-a]"); if (!k) return; k = k.getAttribute("data-a");
            var done = function () { show(); if (reload) reload(); };
            if (k === "on") run(jak(function () { return sb.rpc("admin_aff_set_status", { p_id: id, p_status: "aktif" }); }), "Affiliate diaktifkan.", done);
            else if (k === "off") ask("Tangguhkan affiliate", "Komisi baru tidak akan dihitung selama ditangguhkan. Saldo yang ada tetap tersimpan.", [{ k: "r", l: "Alasan", min: 3 }], "Tangguhkan", "bad").then(function (v) { if (v) run(jak(function () { return sb.rpc("admin_aff_set_status", { p_id: id, p_status: "suspended", p_reason: v.r }); }), "Affiliate ditangguhkan.", done); });
            else if (k === "bv") dlgConfirm("Verifikasi rekening ini? Pastikan nama dan nomor rekening sudah Anda periksa.", "Verifikasi").then(function (y) { if (y) run(jak(function () { return sb.rpc("admin_aff_bank_review", { p_id: id, p_action: "verify" }); }), "Rekening terverifikasi.", done); });
            else if (k === "br") ask("Tolak rekening", "Affiliate akan diminta mengisi ulang rekening.", [{ k: "r", l: "Alasan", min: 3 }], "Tolak", "bad").then(function (v) { if (v) run(jak(function () { return sb.rpc("admin_aff_bank_review", { p_id: id, p_action: "reject", p_note: v.r }); }), "Rekening ditolak.", done); });
            else if (k === "rate") ask("Komisi khusus", 'Isi jenis ("persen" atau "tetap") dan nilainya. Kosongkan keduanya untuk kembali mengikuti pengaturan program. Berlaku untuk konversi berikutnya.', [{ k: "t", l: "Jenis (persen / tetap)", max: 10 }, { k: "v", l: "Nilai (persen: 0,5 sampai 50; tetap: rupiah)", max: 12 }], "Simpan").then(function (v) {
              if (!v) return; var ty = v.t.toLowerCase() === "tetap" ? "fixed" : v.t.toLowerCase() === "persen" ? "percent" : null, num = v.v === "" ? null : Number(v.v.replace(",", "."));
              if ((v.t || v.v) && (!ty || num == null || isNaN(num))) return toast("Isi jenis (persen/tetap) dan nilai angka yang benar.", "bad");
              run(jak(function () { return sb.rpc("admin_aff_set_rate", { p_id: id, p_type: ty, p_value: num }); }), "Komisi khusus disimpan.", done);
            });
          };
        }, function (e) { $("#af-db").innerHTML = errBox(errText(e)); });
      }
      show();
    }

    /* ---------- Referral & konversi ---------- */
    function renderRef(root) {
      var S = { page: 0, cs: "", q: "" };
      root.innerHTML = '<div class="af-tool"><label class="fld"><span>Cari</span><input type="search" id="rf-q" placeholder="Kode, nama, email"></label><label class="fld"><span>Status komisi</span><select id="rf-s"><option value="">Semua</option><option value="review">Perlu tinjauan</option><option value="pending">Ditahan</option><option value="approved">Disetujui</option><option value="rejected">Ditolak</option><option value="reversed">Dibatalkan (refund)</option></select></label>' +
        (canW() ? '<button class="btn o" type="button" id="rf-rel">Cairkan komisi yang masa tahannya selesai</button>' : "") + '</div><div id="rf-t"></div><div class="af-pg"></div>';
      function load() {
        var t = $("#rf-t"); t.innerHTML = skel();
        jak(function () { return sb.rpc("admin_aff_referrals", { p_cstatus: S.cs || null, p_q: S.q || null, p_limit: PAGE, p_offset: S.page * PAGE }); }).then(function (r) {
          var rows = r.rows || [];
          t.innerHTML = rows.length ? '<div class="card tbl-w"><table><thead><tr><th>Pelanggan</th><th>Affiliate</th><th>Status</th><th>Komisi</th><th>Tanda risiko</th><th>Dikaitkan</th><th></th></tr></thead><tbody>' + rows.map(function (x) {
            var rv = (x.commission_status === "pending" || x.commission_status === "review") && canW();
            return "<tr><td><b>" + esc(x.referred_name || "-") + '</b><span class="cell-s">' + esc(x.referred_email || "") + "</span></td><td>" + esc(x.code) + "</td><td>" + bd(CS, x.commission_status) + (x.commission_status === "pending" && x.commission_available_at ? '<span class="cell-s">cair ' + esc(wib(x.commission_available_at)) + "</span>" : "") + "</td><td>" + (x.status === "berbayar" ? rp(x.commission) : "-") + "</td><td>" +
              ((x.fraud_reasons || []).map(function (f) { return '<span class="badge bad">' + esc(FR[f] || f) + "</span>"; }).join(" ") || "-") + (x.review_note ? '<span class="cell-s">' + esc(x.review_note) + "</span>" : "") + "</td><td>" + esc(wib(x.attributed_at)) + "</td><td>" +
              (rv ? '<div class="af-btns"><button class="btn" type="button" data-a="ok" data-id="' + esc(x.id) + '" data-st="' + esc(x.commission_status) + '">Setujui</button><button class="btn o bad" type="button" data-a="no" data-id="' + esc(x.id) + '">Tolak</button></div>' : "") + "</td></tr>";
          }).join("") + "</tbody></table></div>" : empty("Belum ada referral.");
          pager(root, S, r.total || 0, load);
        }, function (e) { t.innerHTML = errBox(errText(e)); });
      }
      var tm; $("#rf-q").addEventListener("input", function (e) { clearTimeout(tm); tm = setTimeout(function () { S.q = e.target.value; S.page = 0; load(); }, 300); });
      $("#rf-s").addEventListener("change", function (e) { S.cs = e.target.value; S.page = 0; load(); });
      var rel = $("#rf-rel"); if (rel) rel.addEventListener("click", function () { run(jak(function () { return sb.rpc("admin_aff_release_due"); }), "Pencairan komisi dijalankan.", load); });
      root.addEventListener("click", function (e) {
        var b = e.target.closest("[data-a]"); if (!b || !b.getAttribute("data-id")) return; var id = b.getAttribute("data-id");
        if (b.getAttribute("data-a") === "ok") {
          var needNote = b.getAttribute("data-st") === "review";
          (needNote ? ask("Setujui komisi bertanda risiko", "Komisi ini ditandai sistem. Tulis alasan Anda menyetujuinya.", [{ k: "r", l: "Alasan", min: 3 }], "Setujui") : dlgConfirm("Setujui komisi ini sekarang? Saldo affiliate akan bertambah.", "Setujui").then(function (y) { return y ? { r: "" } : null; }))
            .then(function (v) { if (v) run(jak(function () { return sb.rpc("admin_aff_referral_review", { p_id: id, p_action: "approve", p_note: v.r || null }); }), "Komisi disetujui.", load); });
        } else ask("Tolak komisi", "Komisi tidak akan dibayarkan dan referral ditandai batal.", [{ k: "r", l: "Alasan", min: 3 }], "Tolak", "bad").then(function (v) { if (v) run(jak(function () { return sb.rpc("admin_aff_referral_review", { p_id: id, p_action: "reject", p_note: v.r }); }), "Komisi ditolak.", load); });
      });
      load();
    }

    /* ---------- Penarikan ---------- */
    function renderWd(root) {
      var S = { page: 0, s: "diproses" };
      root.innerHTML = '<div class="af-tool"><label class="fld"><span>Status</span><select id="wd-s"><option value="diproses">Menunggu</option><option value="">Semua</option><option value="berhasil">Dibayar</option><option value="ditolak">Ditolak</option></select></label><button class="btn o" type="button" id="wd-csv">Unduh CSV halaman ini</button></div>' +
        '<p class="sub">Pembayaran dilakukan manual: transfer ke rekening affiliate di luar sistem, lalu catat referensi transfernya di sini. Sistem tidak memindahkan uang.</p><div id="wd-t"></div><div class="af-pg"></div>';
      var cur = [];
      function load() {
        var t = $("#wd-t"); t.innerHTML = skel();
        jak(function () { return sb.rpc("admin_aff_withdrawals", { p_status: S.s || null, p_limit: PAGE, p_offset: S.page * PAGE }); }).then(function (r) {
          var rows = cur = r.rows || [];
          t.innerHTML = rows.length ? '<div class="card tbl-w"><table><thead><tr><th>Affiliate</th><th>Jumlah</th><th>Rekening tujuan</th><th>Status</th><th>Diajukan</th><th></th></tr></thead><tbody>' + rows.map(function (w) {
            return "<tr><td><b>" + esc(w.name || "-") + '</b><span class="cell-s">' + esc(w.code || "") + " " + esc(w.email || "") + "</span></td><td>" + rp(w.amount) + "</td><td>" + esc(w.bank_name || "-") + '<span class="cell-s">' + esc(w.bank_account_no || "") + " a.n. " + esc(w.bank_account_name || "") + "</span>" + (w.bank_verified ? ' <span class="badge ok">Terverifikasi</span>' : ' <span class="badge warn">Belum terverifikasi</span>') + (w.in_review ? ' <span class="badge bad">' + w.in_review + " komisi ditinjau</span>" : "") + "</td><td>" + bd(WS, w.status) + (w.payout_ref ? '<span class="cell-s">Ref: ' + esc(w.payout_ref) + "</span>" : "") + (w.note ? '<span class="cell-s">' + esc(w.note) + "</span>" : "") + "</td><td>" + esc(wib(w.created_at)) + "</td><td>" +
              (w.status === "diproses" && canW() ? '<div class="af-btns"><button class="btn" type="button" data-a="paid" data-id="' + esc(w.id) + '">Tandai dibayar</button><button class="btn o bad" type="button" data-a="rej" data-id="' + esc(w.id) + '">Tolak</button></div>' : "") + "</td></tr>";
          }).join("") + "</tbody></table></div>" : empty("Tidak ada penarikan.");
          pager(root, S, r.total || 0, load);
        }, function (e) { t.innerHTML = errBox(errText(e)); });
      }
      $("#wd-s").addEventListener("change", function (e) { S.s = e.target.value; S.page = 0; load(); });
      $("#wd-csv").addEventListener("click", function () {
        if (!cur.length) return toast("Tidak ada data untuk diunduh.", "bad");
        csv("penarikan-affiliate.csv", [["Tanggal", "Affiliate", "Kode", "Jumlah", "Bank", "No. rekening", "Atas nama", "Status", "Referensi"]].concat(cur.map(function (w) { return [wib(w.created_at), w.name, w.code, w.amount, w.bank_name, w.bank_account_no, w.bank_account_name, w.status, w.payout_ref]; })));
      });
      root.addEventListener("click", function (e) {
        var b = e.target.closest("[data-a]"); if (!b || !b.getAttribute("data-id")) return; var id = b.getAttribute("data-id");
        if (b.getAttribute("data-a") === "paid") ask("Tandai sudah dibayar", "Pastikan transfer sudah Anda lakukan. Tindakan ini tidak bisa dibatalkan.", [{ k: "ref", l: "Referensi transfer", max: 80, min: 3 }, { k: "n", l: "Catatan (opsional)" }], "Tandai dibayar").then(function (v) { if (v) run(jak(function () { return sb.rpc("admin_aff_withdrawal_process", { p_id: id, p_action: "paid", p_ref: v.ref, p_note: v.n || null }); }), "Penarikan ditandai dibayar.", load); });
        else ask("Tolak penarikan", "Saldo akan dikembalikan ke affiliate.", [{ k: "r", l: "Alasan", min: 3 }], "Tolak", "bad").then(function (v) { if (v) run(jak(function () { return sb.rpc("admin_aff_withdrawal_process", { p_id: id, p_action: "reject", p_note: v.r }); }), "Penarikan ditolak dan saldo dikembalikan.", load); });
      });
      load();
    }

    /* ---------- Deteksi fraud ---------- */
    function renderFraud(root) {
      root.innerHTML = skel();
      jak(function () { return sb.rpc("admin_aff_fraud"); }).then(function (f) {
        var tb = function (h, rows, cells, none) { return rows && rows.length ? '<div class="card tbl-w"><table><thead><tr>' + h.map(function (x) { return "<th>" + x + "</th>"; }).join("") + "</tr></thead><tbody>" + rows.map(function (r) { return "<tr>" + cells(r).map(function (c) { return "<td>" + c + "</td>"; }).join("") + "</tr>"; }).join("") + "</tbody></table></div>" : '<p class="sub">' + none + "</p>"; };
        root.innerHTML = '<p class="sub">Aturan ini heuristik: hanya menandai untuk ditinjau manusia, bukan bukti kecurangan. IP hanya disimpan dalam bentuk hash.</p>' +
          '<h3 class="af-sec">Komisi menunggu tinjauan</h3>' + tb(["Affiliate", "Komisi", "Alasan", "Tanggal"], f.flagged, function (r) { return [esc(r.code), rp(r.commission), (r.fraud_reasons || []).map(function (x) { return '<span class="badge bad">' + esc(FR[x] || x) + "</span>"; }).join(" "), esc(wib(r.attributed_at))]; }, "Tidak ada komisi yang ditandai.") +
          '<h3 class="af-sec">Banyak pendaftar dari satu IP (30 hari)</h3>' + tb(["IP (hash)", "Pendaftar", "Affiliate", "Kode"], f.ip_clusters, function (r) { return ['<span class="ar-code">' + esc(r.ip) + "</span>", r.signups, r.affiliates, esc((r.codes || []).join(", "))]; }, "Tidak ada pola.") +
          '<h3 class="af-sec">Rekening dipakai beberapa affiliate</h3>' + tb(["Rekening", "Jumlah affiliate", "Kode"], f.shared_banks, function (r) { return [esc(r.account), r.affiliates, esc((r.codes || []).join(", "))]; }, "Tidak ada pola.") +
          '<h3 class="af-sec">Lonjakan klik (24 jam)</h3>' + tb(["Kode", "Klik", "Pengunjung unik"], f.click_bursts, function (r) { return [esc(r.code), r.clicks, r.visitors]; }, "Tidak ada pola.");
      }, function (e) { root.innerHTML = errBox(errText(e)); });
    }

    /* ---------- Pengaturan program ---------- */
    function renderSet(root) {
      root.innerHTML = skel();
      jak(function () { return sb.rpc("admin_aff_settings_get"); }).then(function (s) {
        var W = canW(), dis = W ? "" : " disabled";
        var num = function (k, l, hint) { return '<label class="fld"><span>' + l + '</span><input type="number" name="' + k + '" value="' + esc(s[k]) + '" step="' + (k === "commission_value" ? "any" : "1") + '"' + dis + '><small class="sub">' + hint + "</small></label>"; };
        root.innerHTML = banner(s.program_enabled) + '<form class="af-f" id="as-f" novalidate><label class="fld full"><span><input type="checkbox" name="program_enabled"' + (s.program_enabled ? " checked" : "") + dis + '> Program affiliate dibuka</span><small class="sub">Bila mati, pelanggan melihat "Segera hadir"; pendaftaran dan pelacakan klik berhenti. Penarikan dan konversi referral yang sudah ada tetap berjalan.</small></label>' +
          '<label class="fld full"><span><input type="checkbox" name="auto_approve"' + (s.auto_approve ? " checked" : "") + dis + '> Setujui pendaftar otomatis</span><small class="sub">Bila mati, setiap pendaftar menunggu persetujuan admin.</small></label>' +
          '<label class="fld"><span>Jenis komisi</span><select name="commission_type"' + dis + '><option value="percent"' + (s.commission_type === "percent" ? " selected" : "") + '>Persen dari pembayaran</option><option value="fixed"' + (s.commission_type === "fixed" ? " selected" : "") + ">Nominal tetap</option></select></label>" +
          num("commission_value", "Nilai komisi", "Persen: 0,5 sampai 50. Tetap: Rp 1.000 sampai Rp 5.000.000.") + num("attribution_days", "Masa atribusi (hari)", "Klik dihitung selama ini sebelum pendaftaran (1 sampai 180).") + num("hold_days", "Masa tahan komisi (hari)", "Komisi baru cair setelah masa ini (0 sampai 90).") + num("min_withdrawal", "Minimum penarikan (Rp)", "10.000 sampai 10.000.000.") +
          '<label class="fld full"><span><input type="checkbox" name="require_bank_verified"' + (s.require_bank_verified ? " checked" : "") + dis + '> Wajib rekening terverifikasi untuk menarik</span></label>' + num("fraud_ip_limit", "Batas pendaftar per IP", "Lebih dari ini ditandai untuk ditinjau.") + num("fraud_fast_minutes", "Bayar terlalu cepat (menit)", "Bayar kurang dari ini setelah daftar ditandai. 0 untuk mematikan.") +
          '<div class="full af-e" role="alert"></div>' + (W ? '<div class="full af-btns"><button class="btn" type="submit">Simpan pengaturan</button></div>' : '<p class="full sub">Anda hanya punya akses baca.</p>') + "</form>";
        var f = $("#as-f");
        f.addEventListener("submit", function (e) {
          e.preventDefault(); if (!W) return; var o = {}, g = function (n) { return f.elements[n]; };
          ["program_enabled", "auto_approve", "require_bank_verified"].forEach(function (k) { o[k] = g(k).checked; });
          o.commission_type = g("commission_type").value;
          ["commission_value", "attribution_days", "hold_days", "min_withdrawal", "fraud_ip_limit", "fraud_fast_minutes"].forEach(function (k) { o[k] = String(g(k).value).trim() === "" ? NaN : Number(String(g(k).value).replace(",", ".")); });
          if (Object.keys(o).some(function (k) { return typeof o[k] === "number" && isNaN(o[k]); })) { f.querySelector(".af-e").textContent = "Semua isian angka harus diisi dengan benar."; return; }
          var opening = o.program_enabled && !s.program_enabled, closing = !o.program_enabled && s.program_enabled;
          (opening || closing ? dlgConfirm(opening ? "Buka program affiliate untuk semua pelanggan sekarang?" : "Tutup program? Pelanggan akan melihat \"Segera hadir\" dan tidak bisa mendaftar atau menghasilkan klik baru.", opening ? "Buka program" : "Tutup program") : Promise.resolve(true)).then(function (y) {
            if (y) run(jak(function () { return sb.rpc("admin_aff_settings_save", { p_vals: o }); }), "Pengaturan disimpan.", function () { renderSet(root); });
          });
        });
      }, function (e) { root.innerHTML = errBox(errText(e)); });
    }

    var m = M.filter(function (x) { return x.key === "affiliate"; })[0];
    if (m) {
      var keep = function (k) { return (m.tabs || []).filter(function (t) { return t.key === k; })[0]; };
      var T = function (k, l, r) { return { key: k, label: l, render: r }; };
      m.tabs = [T("ov", "Ringkasan", renderOv), T("list", "Affiliate", renderList), T("ref", "Referral & Konversi", renderRef), T("wd", "Penarikan", renderWd), T("fraud", "Deteksi Fraud", renderFraud), T("set", "Pengaturan Program", renderSet), keep("bonus"), keep("rep")].filter(Boolean);
    }
  });
})();
