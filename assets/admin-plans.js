/* NusaMora Admin: Paket & Harga (menumpang pada engine assets/admin.js lewat window.NM_ADMIN_EXT) */
(function () {
  "use strict";
  window.NM_ADMIN_EXT = window.NM_ADMIN_EXT || [];
  window.NM_ADMIN_EXT.push(function (X) {
    var sb = X.sb, $ = X.$, esc = X.esc, toast = X.toast, fail = X.fail, badge = X.badge, empty = X.empty, skel = X.skel, errBox = X.errBox, dlgConfirm = X.dlgConfirm, can = X.can, rp = X.rp, M = X.M;
    var d = document;
    var PLN = { essential: "Essential (2D)", signature: "Signature (3D Cinematic)", luxe: "Luxe (3D Live Guest)" };
    var CUR = [["USD", "US Dollar"], ["SGD", "Singapore Dollar"], ["MYR", "Ringgit Malaysia"], ["EUR", "Euro"], ["AUD", "Australian Dollar"], ["GBP", "Pound Sterling"], ["JPY", "Yen Jepang"]];
    var KIND = { percent: "Persentase (%)", fixed: "Potongan tetap (Rp)", special: "Harga khusus (Rp)" };
    var ERR = {
      alasan_harga_wajib: "Isi alasan perubahan harga (minimal 3 karakter).", harga_tidak_valid: "Harga harus bilangan bulat antara Rp1.000 dan Rp1.000.000.000.", ukuran_tidak_valid: "Batas ukuran foto 0,5 sampai 3 MB (batas bucket penyimpanan).",
      durasi_tidak_valid: "Durasi 1 sampai 3650 hari.", galeri_tidak_valid: "Batas galeri 0 sampai 200 foto.", batas_live_tidak_valid: "Batas Live Guest harus bilangan bulat minimal 1 (kosongkan = tanpa batas).", kuota_tidak_valid: "Kuota template harus bilangan bulat minimal 1 (kosongkan = tanpa batas).",
      nama_tidak_valid: "Nama 2 sampai 40 karakter (diskon sampai 80).", urutan_tidak_valid: "Urutan 0 sampai 1000.", harga_di_bawah_diskon: "Harga baru tidak boleh sama atau lebih kecil dari potongan/harga khusus yang masih aktif. Ubah dulu diskonnya.",
      paket_terakhir_aktif: "Minimal satu paket harus tetap aktif.", paket_tidak_valid: "Paket tidak valid.", persen_tidak_valid: "Persentase harus di bawah 100.", nilai_melebihi_harga: "Potongan/harga khusus harus lebih kecil dari harga paket.",
      nilai_tidak_valid: "Nilai harus lebih dari 0.", tanggal_tidak_valid: "Tanggal selesai harus setelah tanggal mulai.", diskon_bertabrakan: "Jadwal bertabrakan dengan diskon aktif lain di paket yang sama.", sudah_dipakai: "Diskon sudah dipakai pada transaksi dan tidak bisa dihapus. Nonaktifkan saja.",
      jumlah_tidak_valid: "Jumlah tidak valid (Yen tanpa pecahan).", mata_uang_tidak_valid: "Mata uang tidak didukung.", data_tidak_valid: "Isian tidak valid.", tidak_ditemukan: "Data tidak ditemukan.", jenis_tidak_valid: "Jenis diskon tidak valid.", catatan_terlalu_panjang: "Catatan maksimal 300 karakter."
    };
    var errText = function (c) { return ERR[c] || ("Gagal: " + c); };
    var FLD = { name: "Nama", description: "Deskripsi", price: "Harga (Rp)", duration_days: "Durasi (hari)", gallery_limit: "Batas galeri (foto)", upload_max_mb: "Batas ukuran foto (MB)", live_max_guests: "Maks. tamu Live Guest", live_max_rooms: "Maks. room Live Guest", template_quota: "Kuota template", features: "Fitur", active: "Aktif", sort: "Urutan" };
    var wib = function (s, t) { if (!s) return "-"; var x = new Date(s); if (isNaN(x)) return "-"; return x.toLocaleString("id-ID", t ? { timeZone: "Asia/Jakarta", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" } : { timeZone: "Asia/Jakarta", day: "numeric", month: "short", year: "numeric" }); };
    var toLocalIn = function (iso) { return new Date(iso).toLocaleString("sv-SE", { timeZone: "Asia/Jakarta" }).slice(0, 16).replace(" ", "T"); };
    var fromLocalIn = function (v) { var x = new Date(v + ":00+07:00"); return isNaN(x) ? null : x.toISOString(); };
    var dec = function (v) { return Number(v).toLocaleString("id-ID", { maximumFractionDigits: 2 }); };
    var lim = function (v) { return v == null ? "Tanpa batas" : dec(v); };

    if (!d.getElementById("pl-css")) {
      var st = d.createElement("style"); st.id = "pl-css";
      st.textContent = ".pl-grid{display:grid;gap:16px;grid-template-columns:repeat(auto-fit,minmax(280px,1fr))}.pl-card{display:flex;flex-direction:column;gap:12px}.pl-h{display:flex;justify-content:space-between;gap:8px;align-items:flex-start}.pl-h h3{margin:0}.pl-pr{font-size:1.6rem;font-weight:700}.pl-pr s{font-size:1rem;font-weight:400;opacity:.6;margin-right:6px}.pl-feat{margin:0;padding-left:18px;font-size:.9rem}.pl-st{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.pl-st .stat{padding:8px}.pl-acts{display:flex;gap:8px;flex-wrap:wrap;margin-top:auto}.pl-note{margin:0 0 16px}.pl-cur td input{width:100%;min-width:110px}.pl-f{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(200px,1fr))}.pl-f .full{grid-column:1/-1}.pl-pv{font-weight:600}.pl-e{color:var(--bad,#b3261e);min-height:1.2em}dialog.pl-d{max-width:720px;width:calc(100% - 32px)}.pl-tool{width:100%;max-width:100%;box-sizing:border-box;display:flex;gap:12px;align-items:flex-end;flex-wrap:wrap;margin-bottom:12px}";
      d.head.appendChild(st);
    }
    function dialog(id) { var dl = $("#" + id); if (dl) dl.remove(); dl = d.createElement("dialog"); dl.id = id; dl.className = "wide pl-d"; dl.setAttribute("aria-labelledby", id + "-t"); d.body.appendChild(dl); return dl; }
    var xBtn = '<button class="icon-btn x" type="button" data-close aria-label="Tutup"><svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button>';
    var load = function () { return sb.rpc("admin_plans_overview").then(function (r) { if (r.error) throw r.error; return r.data || []; }); };

    /* ---------- tab 1: paket ---------- */
    function renderPlans(root) {
      var canW = can("plans", "write"); root.innerHTML = skel();
      load().then(function (list) {
        root.innerHTML = '<p class="note pl-note">Tiga paket tetap. Harga resmi dalam Rupiah dan dipakai di checkout (Midtrans). Perubahan harga tidak mengubah transaksi yang sudah dibuat.</p><div class="pl-grid">' + list.map(function (x) {
          var p = x.plan, disc = x.discount_active, feats = String(p.features || "").split(/\s*[\n,]\s*/).filter(Boolean);
          return '<article class="card pl-card" data-p="' + esc(p.id) + '"><div class="pl-h"><div><h3>' + esc(p.name) + '</h3><span class="cell-s">' + esc(PLN[p.id] || p.id) + "</span></div>" + badge(p.active ? "aktif" : "nonaktif") + "</div>" +
            '<div class="pl-pr">' + (disc ? "<s>" + rp(p.price) + "</s>" + rp(x.effective_price) : rp(p.price)) + "</div>" + (disc ? '<span class="badge ok">Promo berjalan: ' + esc(disc) + "</span>" : "") +
            '<div class="kv"><div><span>Durasi</span><b>' + p.duration_days + ' hari</b></div><div><span>Galeri</span><b>' + p.gallery_limit + ' foto</b></div><div><span>Ukuran foto</span><b>maks. ' + dec(p.upload_max_mb) + ' MB</b></div><div><span>Kuota template</span><b>' + lim(p.template_quota) + "</b></div>" +
            (p.id === "luxe" ? "<div><span>Tamu Live Guest</span><b>" + lim(p.live_max_guests) + "</b></div><div><span>Room Live Guest</span><b>" + lim(p.live_max_rooms) + "</b></div>" : "") + "</div>" +
            (p.description ? "<p>" + esc(p.description) + "</p>" : "") + (feats.length ? '<ul class="pl-feat">' + feats.map(function (f) { return "<li>" + esc(f) + "</li>"; }).join("") + "</ul>" : "") +
            '<div class="pl-st"><div class="stat"><span>Undangan aktif</span><b>' + x.stats.active_invitations + '</b></div><div class="stat"><span>Terjual</span><b>' + x.stats.paid_count + '</b></div><div class="stat"><span>Pendapatan</span><b>' + rp(x.stats.revenue) + "</b></div></div>" +
            (canW ? '<div class="pl-acts"><button class="btn" type="button" data-edit="' + esc(p.id) + '">Ubah paket</button></div>' : "") + "</article>";
        }).join("") + "</div>";
        root.onclick = function (e) { var b = e.target.closest("[data-edit]"); if (b) openEdit(list.filter(function (x) { return x.plan.id === b.dataset.edit; })[0].plan, function () { renderPlans(root); }); };
      }).catch(function (e) { root.innerHTML = errBox(e && e.code === "42501" ? "Anda tidak punya izin melihat paket." : (e && (e.code === "42883" || e.code === "PGRST202") ? "Fungsi belum dibuat. Jalankan backend/admin-plans.sql di Supabase." : "Terjadi kendala saat memuat."), 1); root.onclick = function (ev) { if (ev.target.closest("[data-retry]")) renderPlans(root); }; });
    }
    function num(id) { var v = $("#" + id).value.trim(); return v === "" ? null : Number(v); }
    function openEdit(p, reload) {
      var dl = dialog("pl-edit"), live = p.id === "luxe";
      var feats = String(p.features || "").split(/\s*[\n,]\s*/).filter(Boolean).join("\n");
      dl.innerHTML = xBtn + '<h2 id="pl-edit-t">Ubah paket ' + esc(p.name) + '</h2><form id="pl-f" class="pl-f" novalidate>' +
        '<label class="fld">Nama paket<input id="f-name" maxlength="40" value="' + esc(p.name) + '"></label>' +
        '<label class="fld">Harga (Rp)<input id="f-price" type="number" min="1000" step="1" value="' + p.price + '"></label>' +
        '<label class="fld">Durasi aktif (hari)<input id="f-dur" type="number" min="1" max="3650" step="1" value="' + p.duration_days + '"></label>' +
        '<label class="fld">Batas foto galeri<input id="f-gal" type="number" min="0" max="200" step="1" value="' + p.gallery_limit + '"></label>' +
        '<label class="fld">Batas ukuran foto (MB)<input id="f-up" type="number" min="0.5" max="3" step="0.5" value="' + p.upload_max_mb + '"><small class="cell-s">Maksimal 3 MB sesuai batas bucket penyimpanan.</small></label>' +
        '<label class="fld">Kuota template<input id="f-quota" type="number" min="1" step="1" value="' + (p.template_quota == null ? "" : p.template_quota) + '" placeholder="Kosong = tanpa batas"></label>' +
        (live ? '<label class="fld">Maks. tamu Live Guest<input id="f-lg" type="number" min="1" step="1" value="' + (p.live_max_guests == null ? "" : p.live_max_guests) + '" placeholder="Kosong = tanpa batas"></label><label class="fld">Maks. room Live Guest<input id="f-lr" type="number" min="1" step="1" value="' + (p.live_max_rooms == null ? "" : p.live_max_rooms) + '" placeholder="Kosong = tanpa batas"></label>' : "") +
        '<label class="fld">Urutan<input id="f-sort" type="number" min="0" step="1" value="' + p.sort + '"></label>' +
        '<label class="fld full">Deskripsi singkat<input id="f-desc" maxlength="300" value="' + esc(p.description || "") + '"></label>' +
        '<label class="fld full">Fitur paket (satu per baris)<textarea id="f-feat" rows="5" maxlength="1500">' + esc(feats) + "</textarea></label>" +
        '<label class="chk-l full"><input type="checkbox" id="f-act"' + (p.active ? " checked" : "") + "> Paket aktif (bisa dibeli pelanggan)</label>" +
        '<label class="fld full">Alasan perubahan harga<input id="f-note" maxlength="200" placeholder="Wajib diisi bila harga berubah"></label>' +
        '<div class="full pl-e" id="f-err" role="alert"></div><div class="full row-end"><button class="btn o" type="button" data-close>Batal</button><button class="btn" type="submit" id="f-save">Simpan</button></div></form>';
      dl.showModal();
      dl.onclick = function (e) { if (e.target.closest("[data-close]")) dl.close(); };
      $("#pl-f").onsubmit = function (e) {
        e.preventDefault(); var er = $("#f-err"); er.textContent = "";
        var patch = {}, cmp = function (k, v, old) { if (v !== old) patch[k] = v; };
        var nm = $("#f-name").value.trim(), pr = num("f-price"), du = num("f-dur"), ga = num("f-gal"), up = num("f-up");
        if (nm.length < 2) { er.textContent = errText("nama_tidak_valid"); return; }
        if (pr == null || pr < 1000 || pr !== Math.floor(pr)) { er.textContent = errText("harga_tidak_valid"); return; }
        if (du == null || du < 1) { er.textContent = errText("durasi_tidak_valid"); return; }
        if (ga == null || ga < 0) { er.textContent = errText("galeri_tidak_valid"); return; }
        if (up == null || up < 0.5 || up > 3) { er.textContent = errText("ukuran_tidak_valid"); return; }
        cmp("name", nm, p.name); cmp("price", pr, p.price); cmp("duration_days", du, p.duration_days); cmp("gallery_limit", ga, p.gallery_limit); cmp("upload_max_mb", up, Number(p.upload_max_mb));
        cmp("template_quota", num("f-quota"), p.template_quota); if (live) { cmp("live_max_guests", num("f-lg"), p.live_max_guests); cmp("live_max_rooms", num("f-lr"), p.live_max_rooms); }
        cmp("sort", num("f-sort") == null ? 0 : num("f-sort"), p.sort); cmp("description", $("#f-desc").value.trim() || null, p.description || null);
        var fe = $("#f-feat").value.split("\n").map(function (x) { return x.trim(); }).filter(Boolean).join("\n"), fo = String(p.features || "").split(/\s*[\n,]\s*/).filter(Boolean).join("\n"); if (fe !== fo) patch.features = fe || null;
        cmp("active", $("#f-act").checked, p.active);
        if (!Object.keys(patch).length) { dl.close(); return; }
        var note = $("#f-note").value.trim();
        if (patch.price != null && note.length < 3) { er.textContent = errText("alasan_harga_wajib"); return; }
        var go = function () { var b = $("#f-save"); b.disabled = true; sb.rpc("admin_plan_save", { p_id: p.id, p_patch: patch, p_note: note || null }).then(function (r) {
          b.disabled = false; if (r.error) { fail(r.error, "Gagal menyimpan"); return; } if (!r.data || !r.data.ok) { er.textContent = errText(r.data && r.data.error); return; }
          dl.close(); toast("Paket disimpan.", "ok"); reload(); }); };
        if (patch.active === false) dlgConfirm("Paket " + p.name + " akan dinonaktifkan. Pelanggan tidak bisa membeli paket ini sampai diaktifkan lagi. Lanjutkan?", "Nonaktifkan").then(function (y) { if (y) go(); }); else go();
      };
    }

    /* ---------- tab 2: diskon & harga khusus ---------- */
    function discState(x) { var n = Date.now(); if (!x.active) return ["nonaktif", "Nonaktif"]; if (new Date(x.ends_at) <= n) return ["selesai", "Selesai"]; if (new Date(x.starts_at) > n) return ["menunggu", "Terjadwal"]; return ["aktif", "Berjalan"]; }
    function discVal(x) { return x.kind === "percent" ? dec(x.value) + "%" : rp(x.value); }
    function renderDisc(root) {
      var canW = can("plans", "write"); root.innerHTML = skel();
      load().then(function (list) {
        var rows = []; list.forEach(function (x) { x.discounts.forEach(function (dd) { rows.push({ d: dd, plan: x.plan }); }); });
        rows.sort(function (a, b) { return new Date(b.d.starts_at) - new Date(a.d.starts_at); });
        root.innerHTML = '<p class="note pl-note">Diskon dan harga khusus berlaku otomatis sesuai jadwal (WIB) dan dihitung di server saat checkout. Satu paket hanya boleh punya satu diskon aktif pada waktu yang sama. Kode promo yang dimasukkan pelanggan belum didukung.</p>' +
          (canW ? '<div class="pl-tool"><button class="btn" type="button" id="d-new">Tambah diskon</button></div>' : "") +
          (rows.length ? '<div class="card tbl-w"><table><thead><tr><th>Nama</th><th>Paket</th><th>Jenis</th><th class="num">Nilai</th><th>Jadwal (WIB)</th><th>Status</th><th class="num">Dipakai</th>' + (canW ? "<th></th>" : "") + "</tr></thead><tbody>" + rows.map(function (r, i) {
            var s = discState(r.d); return "<tr><td><b>" + esc(r.d.name) + "</b>" + (r.d.note ? '<span class="cell-s">' + esc(r.d.note) + "</span>" : "") + "</td><td>" + esc(r.plan.name) + "</td><td>" + esc(KIND[r.d.kind]) + '</td><td class="num">' + discVal(r.d) + "</td><td>" + wib(r.d.starts_at, 1) + " &ndash; " + wib(r.d.ends_at, 1) + "</td><td>" + badge(s[0]).replace(/>[^<]*</, ">" + esc(s[1]) + "<") + '</td><td class="num">' + r.d.used + "x</td>" +
              (canW ? '<td><button class="btn o sm" type="button" data-de="' + i + '">Ubah</button> <button class="btn o sm" type="button" data-dt="' + i + '">' + (r.d.active ? "Nonaktifkan" : "Aktifkan") + '</button> <button class="btn o sm" type="button" data-dx="' + i + '"' + (r.d.used ? ' disabled title="Sudah dipakai di transaksi"' : "") + ">Hapus</button></td>" : "") + "</tr>";
          }).join("") + "</tbody></table></div>" : '<div class="card">' + empty("Belum ada diskon", "Tambahkan diskon atau harga khusus berjadwal untuk salah satu paket.") + "</div>");
        var reload = function () { renderDisc(root); };
        if (canW) {
          $("#d-new").onclick = function () { openDisc(null, list, reload); };
          root.onclick = function (e) {
            var b = e.target.closest("[data-de],[data-dt],[data-dx]"); if (!b) return;
            if (b.dataset.de != null) return openDisc(rows[Number(b.dataset.de)].d, list, reload);
            if (b.dataset.dt != null) { var r = rows[Number(b.dataset.dt)].d; return sb.rpc("admin_discount_save", { p_id: r.id, p_data: { active: !r.active }, p_note: null }).then(function (x) { if (x.error) return fail(x.error, "Gagal"); if (!x.data.ok) return toast(errText(x.data.error), "bad"); toast("Diskon diperbarui.", "ok"); reload(); }); }
            var q = rows[Number(b.dataset.dx)].d;
            dlgConfirm("Hapus diskon " + q.name + "? Tindakan ini tidak dapat dibatalkan.", "Hapus").then(function (y) { if (!y) return; sb.rpc("admin_discount_delete", { p_id: q.id }).then(function (x) { if (x.error) return fail(x.error, "Gagal"); if (!x.data.ok) return toast(errText(x.data.error), "bad"); toast("Diskon dihapus.", "ok"); reload(); }); });
          };
        }
      }).catch(function (e) { root.innerHTML = errBox("Terjadi kendala saat memuat.", 1); root.onclick = function (ev) { if (ev.target.closest("[data-retry]")) renderDisc(root); }; });
    }
    function openDisc(cur, list, reload) {
      var dl = dialog("pl-disc"), now = Date.now(), plans = list.map(function (x) { return x.plan; });
      dl.innerHTML = xBtn + '<h2 id="pl-disc-t">' + (cur ? "Ubah diskon" : "Tambah diskon") + '</h2><form id="pl-df" class="pl-f" novalidate>' +
        '<label class="fld">Paket<select id="x-plan"' + (cur ? " disabled" : "") + ">" + plans.map(function (p) { return '<option value="' + esc(p.id) + '"' + (cur && cur.plan_id === p.id ? " selected" : "") + ">" + esc(p.name) + " (" + rp(p.price) + ")</option>"; }).join("") + "</select></label>" +
        '<label class="fld">Nama promo<input id="x-name" maxlength="80" value="' + esc(cur ? cur.name : "") + '" placeholder="Contoh: Promo Akhir Tahun"></label>' +
        '<label class="fld">Jenis<select id="x-kind">' + Object.keys(KIND).map(function (k) { return '<option value="' + k + '"' + (cur && cur.kind === k ? " selected" : "") + ">" + KIND[k] + "</option>"; }).join("") + "</select></label>" +
        '<label class="fld">Nilai<input id="x-val" type="number" min="0" step="any" value="' + (cur ? cur.value : "") + '"></label>' +
        '<label class="fld">Mulai (WIB)<input id="x-s" type="datetime-local" value="' + toLocalIn(cur ? cur.starts_at : new Date(now).toISOString()) + '"></label>' +
        '<label class="fld">Selesai (WIB)<input id="x-e" type="datetime-local" value="' + toLocalIn(cur ? cur.ends_at : new Date(now + 7 * 864e5).toISOString()) + '"></label>' +
        '<label class="fld full">Catatan internal<input id="x-note" maxlength="300" value="' + esc(cur && cur.note || "") + '"></label>' +
        '<label class="chk-l full"><input type="checkbox" id="x-act"' + (!cur || cur.active ? " checked" : "") + "> Aktif</label>" +
        '<div class="full pl-pv" id="x-pv" aria-live="polite"></div><div class="full pl-e" id="x-err" role="alert"></div><div class="full row-end"><button class="btn o" type="button" data-close>Batal</button><button class="btn" type="submit" id="x-save">Simpan</button></div></form>';
      dl.showModal(); dl.onclick = function (e) { if (e.target.closest("[data-close]")) dl.close(); };
      var pv = function () {
        var p = plans.filter(function (x) { return x.id === $("#x-plan").value; })[0], k = $("#x-kind").value, v = Number($("#x-val").value), out = null;
        if (p && v > 0) out = k === "percent" ? Math.round(p.price * (100 - v) / 100) : k === "fixed" ? p.price - Math.round(v) : Math.min(p.price, Math.round(v));
        $("#x-pv").textContent = out != null && out > 0 ? "Harga pelanggan: " + rp(out) + " (harga normal " + rp(p.price) + ")" : "";
      };
      ["x-plan", "x-kind", "x-val"].forEach(function (i) { $("#" + i).oninput = pv; }); pv();
      $("#pl-df").onsubmit = function (e) {
        e.preventDefault(); var er = $("#x-err"); er.textContent = "";
        var s = fromLocalIn($("#x-s").value), en = fromLocalIn($("#x-e").value), v = Number($("#x-val").value);
        if (!s || !en) { er.textContent = errText("tanggal_tidak_valid"); return; }
        var data = { plan_id: $("#x-plan").value, name: $("#x-name").value.trim(), kind: $("#x-kind").value, value: v, starts_at: s, ends_at: en, active: $("#x-act").checked, note: $("#x-note").value.trim() };
        var b = $("#x-save"); b.disabled = true;
        sb.rpc("admin_discount_save", { p_id: cur ? cur.id : null, p_data: data, p_note: null }).then(function (r) {
          b.disabled = false; if (r.error) { fail(r.error, "Gagal menyimpan"); return; } if (!r.data || !r.data.ok) { er.textContent = errText(r.data && r.data.error); return; }
          dl.close(); toast("Diskon disimpan.", "ok"); reload(); });
      };
    }

    /* ---------- tab 3: mata uang ---------- */
    function renderCur(root) {
      var canW = can("plans", "write"); root.innerHTML = skel();
      load().then(function (list) {
        var map = {}; list.forEach(function (x) { x.prices.forEach(function (p) { map[x.plan.id + "|" + p.currency] = p; }); });
        root.innerHTML = '<p class="note pl-note">Harga mata uang lain hanya ditampilkan sebagai informasi untuk calon pelanggan internasional. Kurs tidak otomatis dan pembayaran tetap dalam Rupiah (Midtrans). Kosongkan kolom untuk menyembunyikan harga.</p>' +
          '<div class="card tbl-w pl-cur"><table><thead><tr><th>Mata uang</th>' + list.map(function (x) { return "<th>" + esc(x.plan.name) + "</th>"; }).join("") + "</tr></thead><tbody>" +
          '<tr><td><b>IDR</b> <span class="cell-s">Rupiah (harga resmi)</span></td>' + list.map(function (x) { return "<td>" + rp(x.plan.price) + "</td>"; }).join("") + "</tr>" +
          CUR.map(function (c) { return "<tr><td><b>" + c[0] + '</b> <span class="cell-s">' + esc(c[1]) + "</span></td>" + list.map(function (x) { var p = map[x.plan.id + "|" + c[0]]; return '<td><input type="number" min="0" step="' + (c[0] === "JPY" ? 1 : "0.01") + '" data-c="' + x.plan.id + "|" + c[0] + '" data-o="' + (p ? p.amount : "") + '" value="' + (p ? p.amount : "") + '" aria-label="' + c[0] + " " + esc(x.plan.name) + '"' + (canW ? "" : " disabled") + "></td>"; }).join("") + "</tr>"; }).join("") + "</tbody></table></div>" +
          (canW ? '<div class="pl-tool" style="margin-top:12px"><label class="fld grow">Alasan perubahan (opsional)<input id="c-note" maxlength="200"></label><button class="btn" type="button" id="c-save">Simpan harga</button></div><div class="pl-e" id="c-err" role="alert"></div>' : "");
        if (!canW) return;
        $("#c-save").onclick = function () {
          var ins = Array.prototype.slice.call(root.querySelectorAll("[data-c]")).filter(function (i) { return Number(i.value || 0) !== Number(i.dataset.o || 0) || (i.value === "") !== (i.dataset.o === ""); });
          var er = $("#c-err"); er.textContent = ""; if (!ins.length) return toast("Tidak ada perubahan.", "");
          var note = $("#c-note").value.trim(), b = $("#c-save"); b.disabled = true;
          var seq = Promise.resolve(), bad = null;
          ins.forEach(function (i) { seq = seq.then(function () { if (bad) return; var k = i.dataset.c.split("|"); return sb.rpc("admin_plan_price_set", { p_plan: k[0], p_currency: k[1], p_amount: i.value === "" ? null : Number(i.value), p_active: true, p_note: note || null }).then(function (r) { if (r.error) bad = msg(r.error); else if (!r.data.ok) bad = k[1] + " " + k[0] + ": " + errText(r.data.error); }); }); });
          seq.then(function () { b.disabled = false; if (bad) { er.textContent = bad; return; } toast("Harga disimpan.", "ok"); renderCur(root); });
        };
      }).catch(function () { root.innerHTML = errBox("Terjadi kendala saat memuat.", 1); root.onclick = function (ev) { if (ev.target.closest("[data-retry]")) renderCur(root); }; });
    }
    function msg(e) { return (e && e.message) || "Gagal menyimpan."; }

    /* ---------- tab 4: riwayat ---------- */
    function renderHist(root) {
      root.innerHTML = skel();
      var plan = "";
      var run = function () {
        sb.rpc("admin_plan_history", { p_plan: plan || null, p_limit: 200 }).then(function (r) {
          if (r.error) { root.innerHTML = errBox(r.error.code === "42501" ? "Anda tidak punya izin melihat riwayat." : "Terjadi kendala saat memuat.", 1); return; }
          var rows = r.data || [];
          root.innerHTML = '<div class="pl-tool"><label class="fld">Paket<select id="h-plan"><option value="">Semua paket</option>' + Object.keys(PLN).map(function (k) { return '<option value="' + k + '"' + (plan === k ? " selected" : "") + ">" + esc(PLN[k]) + "</option>"; }).join("") + "</select></label></div>" +
            (rows.length ? '<div class="card tbl-w"><table><thead><tr><th>Waktu (WIB)</th><th>Paket</th><th>Jenis</th><th>Perubahan</th><th>Oleh</th><th>Alasan</th></tr></thead><tbody>' + rows.map(function (h) {
              var scope = h.scope === "paket" ? "Paket" : h.scope === "diskon" ? "Diskon" : "Mata uang", fld = h.scope === "paket" ? (FLD[h.field] || h.field) : h.field, f = function (v) { return v == null ? "<i>kosong</i>" : esc(h.scope === "paket" && (h.field === "price") ? rp(v) : v); };
              return "<tr><td>" + wib(h.at, 1) + "</td><td>" + esc(h.plan_id) + "</td><td>" + scope + "</td><td><b>" + esc(fld) + "</b>: " + f(h.old_value) + " &rarr; " + f(h.new_value) + "</td><td>" + esc(h.actor_name || "-") + "</td><td>" + esc(h.note || "-") + "</td></tr>";
            }).join("") + "</tbody></table></div>" : '<div class="card">' + empty("Belum ada perubahan", "Perubahan harga, batas, diskon, dan mata uang akan tercatat di sini.") + "</div>");
          $("#h-plan").onchange = function (e) { plan = e.target.value; run(); };
        });
      };
      root.onclick = function (ev) { if (ev.target.closest("[data-retry]")) run(); }; run();
    }

    var pm = M.filter(function (m) { return m.key === "plans"; })[0];
    if (pm) pm.tabs = [{ key: "items", label: "Paket", render: renderPlans }, { key: "disc", label: "Diskon & Harga Khusus", render: renderDisc }, { key: "cur", label: "Mata Uang", render: renderCur }, { key: "hist", label: "Riwayat Harga", render: renderHist }];
  });
})();
