/* NusaMora Admin: Laporan & Analytics (menumpang pada assets/admin.js lewat window.NM_ADMIN_EXT) */
(function () {
  "use strict";
  window.NM_ADMIN_EXT = window.NM_ADMIN_EXT || [];
  window.NM_ADMIN_EXT.push(function (X) {
    var sb = X.sb, $ = X.$, esc = X.esc, toast = X.toast, errBox = X.errBox, empty = X.empty, skel = X.skel, rp = X.rp, M = X.M, d = document;
    var PCOL = { essential: "#3d6ea8", signature: "#b7791f", luxe: "#7a4fa6" }, PNAME = { essential: "Essential", signature: "Signature", luxe: "Luxe" };
    var PRESETS = [["30d", "30 hari"], ["90d", "90 hari"], ["6m", "6 bulan"], ["12m", "12 bulan"], ["month", "Bulan ini"], ["custom", "Custom"]];
    var P = { k: "90d", f: "", t: "" }, CACHE = { key: "", data: null };

    if (!d.getElementById("rpt-css")) {
      var st = d.createElement("style"); st.id = "rpt-css";
      st.textContent = ".rp-tool{display:flex;gap:12px;align-items:flex-end;flex-wrap:wrap;margin-bottom:16px}.rp-tool .grow{flex:1}.rp-leg{display:flex;gap:14px;flex-wrap:wrap;font-size:.85rem;margin:6px 0}.rp-leg i{display:inline-block;width:10px;height:10px;border-radius:2px;margin-right:5px}.rp-ch{width:100%;height:auto;display:block}.rp-ch text{font-size:11px;fill:currentColor}.rp-fn{display:grid;gap:8px}.rp-fr{display:grid;grid-template-columns:150px 1fr 110px;gap:10px;align-items:center}.rp-fb{height:22px;border-radius:4px;background:#7a4fa6;min-width:2px}.rp-fr small{opacity:.7}.rp-two{display:grid;gap:16px;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));margin-top:16px}.rp-note{margin:8px 0 0;font-size:.85rem;opacity:.75}@media(max-width:560px){.rp-fr{grid-template-columns:1fr}}";
      d.head.appendChild(st);
    }
    var jk = function (off) { return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date(Date.now() + (off || 0) * 864e5)); };
    var jIso = function (ds) { return new Date(ds + "T00:00:00+07:00").toISOString(); };
    var addDays = function (ds, n) { var x = new Date(ds + "T00:00:00Z"); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
    var addMonths = function (ds, n) { var x = new Date(ds + "T00:00:00Z"); x.setUTCMonth(x.getUTCMonth() + n); return x.toISOString().slice(0, 10); };
    function range() {
      var today = jk(), f, t = addDays(today, 1);
      if (P.k === "30d") f = addDays(today, -29); else if (P.k === "90d") f = addDays(today, -89);
      else if (P.k === "6m") f = addMonths(today.slice(0, 8) + "01", -5); else if (P.k === "12m") f = addMonths(today.slice(0, 8) + "01", -11);
      else if (P.k === "month") f = today.slice(0, 8) + "01";
      else { f = P.f || addDays(today, -29); t = addDays(P.t || today, 1); }
      return { f: f, t: t, label: f + " s/d " + addDays(t, -1) };
    }
    function load() {
      var r = range(); if (r.t <= r.f) return Promise.reject({ message: "Tanggal akhir harus setelah tanggal awal." });
      var key = r.f + "|" + r.t; if (CACHE.key === key && CACHE.data && Date.now() - CACHE.at < 30000) return Promise.resolve({ x: CACHE.data, r: r });
      return sb.rpc("admin_report", { p_from: jIso(r.f), p_to: jIso(r.t) }).then(function (res) {
        if (res.error) throw res.error; CACHE = { key: key, data: res.data, at: Date.now() }; return { x: res.data, r: r };
      });
    }
    var n = function (v) { return Number(v || 0); }, fmt = function (v) { return n(v).toLocaleString("id-ID"); }, pct = function (a, b) { return b ? Math.round(a / b * 1000) / 10 : 0; };
    var bucketLabel = function (m) { return m.length > 7 ? new Date(m + "T00:00:00+07:00").toLocaleDateString("id-ID", { day: "numeric", month: "short", timeZone: "Asia/Jakarta" }) : new Date(m + "-01T00:00:00+07:00").toLocaleDateString("id-ID", { month: "short", year: "2-digit", timeZone: "Asia/Jakarta" }); };

    /* ---------- bagian data (dipakai tampilan, CSV, dan Excel) ---------- */
    function sections(x) {
      var rv = x.revenue || {}, cu = x.customers || {}, S = [];
      S.push({ id: "ringkasan", name: "Ringkasan", head: ["Metrik", "Nilai"], rows: [["Pendapatan kotor (Rp)", n(rv.gross)], ["Refund (Rp)", n(rv.refund)], ["Pendapatan bersih (Rp)", n(rv.net)], ["Jumlah transaksi lunas", n(rv.orders)], ["Rata-rata nilai transaksi (Rp)", n(rv.avg_order)], ["Refund rate (%)", n(rv.refund_rate)], ["Total potongan diskon (Rp)", n(rv.discount_total)], ["Pelanggan baru", n(cu.new)], ["Pembeli baru", n(cu.buyers_new)], ["Pembeli kembali", n(cu.buyers_returning)]] });
      S.push({ id: "paket", name: "Per paket", head: ["Paket", "Transaksi", "Pendapatan bersih (Rp)", "Refund (transaksi)", "Rata-rata (Rp)"], rows: (x.by_plan || []).map(function (p) { return [p.plan, n(p.orders), n(p.revenue), n(p.refunded), n(p.avg_order)]; }) });
      S.push({ id: "tren", name: "Tren", head: ["Periode", "Pelanggan baru", "Transaksi", "Pendapatan (Rp)", "Essential (Rp)", "Signature (Rp)", "Luxe (Rp)"], rows: (x.series || []).map(function (s) { return [s.m, n(s.new_customers), n(s.orders), n(s.revenue), n(s.essential), n(s.signature), n(s.luxe)]; }) });
      var f = x.funnel || [], top = f.length ? n(f[0].n) : 0;
      S.push({ id: "funnel", name: "Funnel", head: ["Tahap", "Pelanggan", "% dari pendaftar"], rows: f.map(function (s) { return [s.step, n(s.n), pct(n(s.n), top)]; }) });
      S.push({ id: "template", name: "Template teratas", head: ["Template", "Undangan dibuat", "Berbayar", "Terbit"], rows: (x.top_templates || []).map(function (t) { return [t.template, n(t.invitations), n(t.paid), n(t.published)]; }) });
      S.push({ id: "kategori", name: "Kategori acara", head: ["Kategori", "Undangan", "Berbayar"], rows: (x.categories || []).map(function (c) { return [c.category, n(c.invitations), n(c.paid)]; }) });
      if (x.affiliate) {
        var a = x.affiliate; S.push({ id: "affiliate", name: "Affiliate", head: ["Metrik", "Nilai"], rows: [["Affiliate aktif", n(a.affiliates_active)], ["Referral (periode)", n(a.referrals)], ["Referral berbayar", n(a.referrals_paid)], ["Komisi dari referral berbayar (Rp)", n(a.commission)], ["Permintaan penarikan (Rp)", n(a.withdrawals)]] });
        S.push({ id: "affiliate_top", name: "Affiliate teratas", head: ["Kode", "Referral", "Berbayar", "Komisi (Rp)"], rows: (a.top || []).map(function (t) { return [t.code, n(t.referrals), n(t.paid), n(t.commission)]; }) });
      }
      var l = x.live || {};
      S.push({ id: "live", name: "Live Guest", head: ["Metrik", "Nilai"], rows: [["Aktivitas tamu", n(l.events)], ["Room digunakan", n(l.rooms)], ["Tamu unik", n(l.guests)]] });
      S.push({ id: "live_aksi", name: "Live Guest aksi", head: ["Aksi", "Jumlah"], rows: (l.by_action || []).map(function (a) { return [a.action, n(a.n)]; }) });
      S.push({ id: "live_room", name: "Live Guest room", head: ["Undangan", "Aktivitas", "Tamu"], rows: (l.top_rooms || []).map(function (t) { return [t.title, n(t.events), n(t.guests)]; }) });
      return S;
    }

    /* ---------- ekspor ---------- */
    var guard = function (v) { return typeof v === "string" && /^[=+\-@\t\r]/.test(v) ? "'" + v : v; };
    var csvCell = function (v) { v = guard(v == null ? "" : v); v = String(v); return /[",\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
    function toCsv(secs, label) {
      var out = ["Laporan NusaMora", "Periode," + csvCell(label), ""];
      secs.forEach(function (s) { out.push(csvCell(s.name)); out.push(s.head.map(csvCell).join(",")); s.rows.forEach(function (r) { out.push(r.map(csvCell).join(",")); }); out.push(""); });
      return "﻿" + out.join("\r\n");
    }
    var T = (function () { var t = [], c; for (var i = 0; i < 256; i++) { c = i; for (var k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[i] = c >>> 0; } return t; })();
    function crc32(b) { var c = 0xFFFFFFFF; for (var i = 0; i < b.length; i++) c = T[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
    function zip(files) { /* ZIP tanpa kompresi (store) */
      var enc = new TextEncoder(), parts = [], cd = [], off = 0;
      var u16 = function (v) { return [v & 255, (v >>> 8) & 255]; }, u32 = function (v) { return [v & 255, (v >>> 8) & 255, (v >>> 16) & 255, (v >>> 24) & 255]; };
      files.forEach(function (f) {
        var nm = enc.encode(f.name), data = enc.encode(f.data), crc = crc32(data);
        var lh = [0x50, 0x4b, 3, 4].concat(u16(20), u16(0x0800), u16(0), u16(0), u16(0x21), u32(crc), u32(data.length), u32(data.length), u16(nm.length), u16(0));
        parts.push(new Uint8Array(lh), nm, data);
        cd.push(new Uint8Array([0x50, 0x4b, 1, 2].concat(u16(20), u16(20), u16(0x0800), u16(0), u16(0), u16(0x21), u32(crc), u32(data.length), u32(data.length), u16(nm.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(off))), nm);
        off += lh.length + nm.length + data.length;
      });
      var cds = 0; cd.forEach(function (c) { cds += c.length; });
      var end = new Uint8Array([0x50, 0x4b, 5, 6].concat(u16(0), u16(0), u16(files.length), u16(files.length), u32(cds), u32(off), u16(0)));
      return new Blob(parts.concat(cd, [end]), { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    }
    var xe = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, ""); };
    var colName = function (i) { var s = ""; i++; while (i > 0) { var m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; };
    function xlsx(secs, label) {
      var names = [], used = {};
      secs.forEach(function (s) { var nm = s.name.replace(/[\[\]:*?\/\\]/g, " ").slice(0, 31), b = nm, k = 2; while (used[nm.toLowerCase()]) nm = b.slice(0, 28) + " " + k++; used[nm.toLowerCase()] = 1; names.push(nm); });
      var cell = function (v, r, c, style) { var ref = colName(c) + r; if (typeof v === "number" && isFinite(v)) return '<c r="' + ref + '"' + (style ? ' s="1"' : "") + "><v>" + v + "</v></c>"; return '<c r="' + ref + '"' + (style ? ' s="1"' : "") + ' t="inlineStr"><is><t xml:space="preserve">' + xe(guard(v == null ? "" : String(v))) + "</t></is></c>"; };
      var sheets = secs.map(function (s, i) {
        var rows = ['<row r="1">' + [("Laporan " + s.name + " | " + label)].map(function (t) { return cell(t, 1, 0, 1); }).join("") + "</row>", '<row r="2">' + s.head.map(function (h, c) { return cell(h, 2, c, 1); }).join("") + "</row>"];
        s.rows.forEach(function (r, ri) { rows.push('<row r="' + (ri + 3) + '">' + r.map(function (v, c) { return cell(v, ri + 3, c); }).join("") + "</row>"); });
        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><cols><col min="1" max="1" width="34" customWidth="1"/><col min="2" max="8" width="22" customWidth="1"/></cols><sheetData>' + rows.join("") + "</sheetData></worksheet>";
      });
      var files = [
        { name: "[Content_Types].xml", data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' + secs.map(function (s, i) { return '<Override PartName="/xl/worksheets/sheet' + (i + 1) + '.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'; }).join("") + "</Types>" },
        { name: "_rels/.rels", data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>' },
        { name: "xl/workbook.xml", data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>' + names.map(function (nm, i) { return '<sheet name="' + xe(nm) + '" sheetId="' + (i + 1) + '" r:id="rId' + (i + 1) + '"/>'; }).join("") + "</sheets></workbook>" },
        { name: "xl/_rels/workbook.xml.rels", data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' + secs.map(function (s, i) { return '<Relationship Id="rId' + (i + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet' + (i + 1) + '.xml"/>'; }).join("") + '<Relationship Id="rId' + (secs.length + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>' },
        { name: "xl/styles.xml", data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs></styleSheet>' }
      ];
      sheets.forEach(function (s, i) { files.push({ name: "xl/worksheets/sheet" + (i + 1) + ".xml", data: s }); });
      return zip(files);
    }
    function save(name, blob) { var a = d.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; d.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 800); }

    /* ---------- kerangka tab ---------- */
    function frame(root, tabId, title, body, ctx) {
      var x = ctx.x, r = ctx.r, secs = sections(x), mine = secs.filter(function (s) { return tabIds[tabId].indexOf(s.id) > -1; }), stamp = r.f + "_" + addDays(r.t, -1);
      root.innerHTML = '<div class="rp-tool"><label class="fld">Periode<select id="rp-k">' + PRESETS.map(function (p) { return '<option value="' + p[0] + '"' + (P.k === p[0] ? " selected" : "") + ">" + p[1] + "</option>"; }).join("") + "</select></label>" +
        (P.k === "custom" ? '<label class="fld">Dari<input type="date" id="rp-f" value="' + esc(r.f) + '"></label><label class="fld">Sampai<input type="date" id="rp-t" value="' + esc(addDays(r.t, -1)) + '"></label><button class="btn o" type="button" id="rp-go">Terapkan</button>' : "") +
        '<span class="grow cell-s">Periode: ' + esc(r.label) + ' (WIB)</span><button class="btn o" type="button" id="rp-csv">Unduh CSV</button><button class="btn" type="button" id="rp-xl">Unduh Excel (.xlsx)</button></div>' + body;
      $("#rp-k").onchange = function (e) { P.k = e.target.value; if (P.k === "custom") { P.f = r.f; P.t = addDays(r.t, -1); } rerender(root, tabId); };
      if ($("#rp-go")) $("#rp-go").onclick = function () { P.f = $("#rp-f").value; P.t = $("#rp-t").value; rerender(root, tabId); };
      $("#rp-csv").onclick = function () { save("laporan-" + tabId + "-" + stamp + ".csv", new Blob([toCsv(mine, r.label)], { type: "text/csv;charset=utf-8" })); };
      $("#rp-xl").onclick = function () { save("laporan-nusamora-" + stamp + ".xlsx", xlsx(secs, r.label)); toast("Excel berisi semua bagian laporan (satu sheet per bagian).", "ok"); };
    }
    var tabIds = { sum: ["ringkasan", "paket", "tren"], cust: ["ringkasan", "funnel", "tren"], tpl: ["template", "kategori"], aff: ["affiliate", "affiliate_top"], live: ["live", "live_aksi", "live_room"] };
    function rerender(root, tabId) { TABS[tabId](root); }
    function wrap(tabId, build) {
      return function (root) {
        root.innerHTML = skel();
        load().then(function (ctx) { var body = build(ctx.x, ctx.r); frame(root, tabId, "", body, ctx); })
          .catch(function (e) {
            var m = e && e.code === "42501" ? "Anda tidak punya izin melihat laporan." : e && /periode_tidak_valid/.test(e.message || "") ? "Periode tidak valid (maksimal 400 hari)." : e && e.message && !e.code ? e.message : "Laporan tidak bisa dimuat. Pastikan backend/admin-reports.sql sudah dijalankan.";
            root.innerHTML = errBox(m, 1); root.onclick = function (ev) { if (ev.target.closest("[data-retry]")) rerender(root, tabId); };
            if (e && !e.code && /Tanggal/.test(e.message || "")) { P.k = "30d"; }
          });
      };
    }
    var kpi = function (l, v, s) { return '<div class="card kpi"><span>' + l + "</span><b>" + v + "</b>" + (s ? '<small class="cell-s">' + s + "</small>" : "") + "</div>"; };
    var table = function (head, rows, num) { return rows.length ? '<div class="tbl-w"><table><thead><tr>' + head.map(function (h, i) { return "<th" + (num && num.indexOf(i) > -1 ? ' class="num"' : "") + ">" + esc(h) + "</th>"; }).join("") + "</tr></thead><tbody>" + rows.map(function (r) { return "<tr>" + r.map(function (c, i) { return "<td" + (num && num.indexOf(i) > -1 ? ' class="num"' : "") + ">" + c + "</td>"; }).join("") + "</tr>"; }).join("") + "</tbody></table></div>" : empty("Belum ada data", "Tidak ada data pada periode ini."); };

    function barChart(series, keys, colors, names, money) {
      if (!series.length) return empty("Belum ada data", "Tidak ada data pada periode ini.");
      var W = 640, H = 240, L = 54, B = 30, T = 10, R = 8, pw = W - L - R, ph = H - T - B, mx = 1;
      series.forEach(function (s) { var t = 0; keys.forEach(function (k) { t += n(s[k]); }); mx = Math.max(mx, t); });
      var o = '<svg class="rp-ch" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="' + esc(names.join(", ")) + ' per periode">', bw = Math.min(46, pw / series.length * 0.62);
      for (var g = 0; g <= 4; g++) { var y = T + ph - ph * g / 4, v = mx * g / 4; o += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + y + '" y2="' + y + '" stroke="currentColor" opacity=".15"/><text x="' + (L - 6) + '" y="' + (y + 4) + '" text-anchor="end">' + (money ? (v >= 1e6 ? Math.round(v / 1e5) / 10 + " jt" : v >= 1e3 ? Math.round(v / 1e3) + " rb" : Math.round(v)) : Math.round(v)) + "</text>"; }
      var step = Math.ceil(series.length / 8);
      series.forEach(function (s, i) {
        var cx = L + pw * (i + 0.5) / series.length, yb = T + ph, tip = bucketLabel(s.m) + ": " + keys.map(function (k, j) { return names[j] + " " + (money ? rp(n(s[k])) : fmt(s[k])); }).join(", ");
        keys.forEach(function (k, j) { var h = ph * n(s[k]) / mx; if (h > 0) { yb -= h; o += '<rect x="' + (cx - bw / 2) + '" y="' + yb + '" width="' + bw + '" height="' + h + '" fill="' + colors[j] + '"><title>' + esc(tip) + "</title></rect>"; } });
        if (i % step === 0) o += '<text x="' + cx + '" y="' + (H - 10) + '" text-anchor="middle">' + esc(bucketLabel(s.m)) + "</text>";
      });
      return o + "</svg>";
    }
    var legend = function (keys, colors, names) { return '<div class="rp-leg">' + keys.map(function (k, j) { return '<span><i style="background:' + colors[j] + '"></i>' + esc(names[j]) + "</span>"; }).join("") + "</div>"; };

    var TABS = {};
    TABS.sum = wrap("sum", function (x) {
      var rv = x.revenue || {}, ks = ["essential", "signature", "luxe"], cs = ks.map(function (k) { return PCOL[k]; }), nm = ks.map(function (k) { return PNAME[k]; });
      return '<div class="kpis">' + kpi("Pendapatan bersih", rp(n(rv.net)), "Kotor " + rp(n(rv.gross))) + kpi("Transaksi lunas", fmt(rv.orders)) + kpi("Rata-rata nilai transaksi", rp(n(rv.avg_order))) + kpi("Refund rate", n(rv.refund_rate) + "%", fmt(rv.refunded_orders) + " transaksi, " + rp(n(rv.refund))) + kpi("Potongan diskon", rp(n(rv.discount_total)), "Selisih harga normal dan harga bayar") + "</div>" +
        '<div class="card"><div class="card-h"><h2>Pendapatan bersih per paket</h2></div>' + legend(ks, cs, nm) + barChart(x.series || [], ks, cs, nm, true) + '<p class="rp-note">Pendapatan bersih = transaksi lunas yang belum di-refund.</p></div>' +
        '<div class="card" style="margin-top:16px"><div class="card-h"><h2>Per paket</h2></div>' + table(["Paket", "Transaksi", "Pendapatan bersih", "Refund", "Rata-rata"], (x.by_plan || []).map(function (p) { return [esc(p.plan), fmt(p.orders), rp(n(p.revenue)), fmt(p.refunded), rp(n(p.avg_order))]; }), [1, 2, 3, 4]) + "</div>";
    });
    TABS.cust = wrap("cust", function (x) {
      var cu = x.customers || {}, f = x.funnel || [], top = f.length ? n(f[0].n) : 0;
      return '<div class="kpis">' + kpi("Pelanggan baru", fmt(cu.new), "Total " + fmt(cu.total)) + kpi("Pembeli pada periode", fmt(cu.buyers)) + kpi("Pembeli baru", fmt(cu.buyers_new), "Pembelian pertama dalam periode") + kpi("Pembeli kembali", fmt(cu.buyers_returning), "Sudah pernah membeli sebelum periode") + kpi("Transaksi ulang", n(cu.repeat_orders_share) + "%", "Dari pembeli yang pernah membeli lebih awal") + "</div>" +
        '<div class="rp-two"><div class="card"><div class="card-h"><h2>Pertumbuhan pelanggan</h2></div>' + barChart(x.series || [], ["new_customers"], ["#3d6ea8"], ["Pelanggan baru"], false) + '</div><div class="card"><div class="card-h"><h2>Funnel pendaftar baru</h2></div><div class="rp-fn" role="list">' +
        (top ? f.map(function (s) { var w = Math.max(1, Math.round(n(s.n) / top * 100)); return '<div class="rp-fr" role="listitem"><span>' + esc(s.step) + '</span><div><div class="rp-fb" style="width:' + w + '%"></div></div><b>' + fmt(s.n) + " <small>" + pct(n(s.n), top) + "%</small></b></div>"; }).join("") : empty("Belum ada pendaftar", "Tidak ada pelanggan baru pada periode ini.")) +
        '</div><p class="rp-note">Hanya pelanggan yang mendaftar pada periode ini dihitung di funnel.</p></div></div>';
    });
    TABS.tpl = wrap("tpl", function (x) {
      var cats = x.categories || [], tot = cats.reduce(function (t, c) { return t + n(c.invitations); }, 0);
      return '<div class="rp-two" style="margin-top:0"><div class="card"><div class="card-h"><h2>Template paling banyak dipakai</h2></div>' + table(["Template", "Undangan", "Berbayar", "Terbit"], (x.top_templates || []).map(function (t) { return [esc(t.template), fmt(t.invitations), fmt(t.paid), fmt(t.published)]; }), [1, 2, 3]) +
        '</div><div class="card"><div class="card-h"><h2>Kategori acara populer</h2></div>' + table(["Kategori", "Undangan", "Porsi", "Berbayar"], cats.map(function (c) { return [esc(c.category), fmt(c.invitations), pct(n(c.invitations), tot) + "%", fmt(c.paid)]; }), [1, 2, 3]) + "</div></div>";
    });
    TABS.aff = wrap("aff", function (x) {
      var a = x.affiliate; if (!a) return '<div class="card">' + empty("Tidak ada akses", "Anda tidak punya izin melihat data affiliate.") + "</div>";
      return '<div class="kpis">' + kpi("Affiliate aktif", fmt(a.affiliates_active)) + kpi("Referral pada periode", fmt(a.referrals), fmt(a.referrals_paid) + " berbayar") + kpi("Konversi referral", pct(n(a.referrals_paid), n(a.referrals)) + "%") + kpi("Komisi referral berbayar", rp(n(a.commission))) + kpi("Permintaan penarikan", rp(n(a.withdrawals))) + "</div>" +
        '<div class="card"><div class="card-h"><h2>Affiliate teratas</h2></div>' + table(["Kode", "Referral", "Berbayar", "Komisi"], (a.top || []).map(function (t) { return [esc(t.code), fmt(t.referrals), fmt(t.paid), rp(n(t.commission))]; }), [1, 2, 3]) + '</div><p class="rp-note">Komisi dihitung dari data referral yang tersedia saat ini; pencairan dan verifikasi dikelola di menu Affiliate.</p>';
    });
    TABS.live = wrap("live", function (x) {
      var l = x.live || {};
      return '<div class="kpis">' + kpi("Aktivitas tamu", fmt(l.events)) + kpi("Room digunakan", fmt(l.rooms)) + kpi("Tamu unik", fmt(l.guests)) + "</div>" +
        '<div class="rp-two"><div class="card"><div class="card-h"><h2>Jenis aktivitas</h2></div>' + table(["Aksi", "Jumlah"], (l.by_action || []).map(function (a) { return [esc(a.action), fmt(a.n)]; }), [1]) + '</div><div class="card"><div class="card-h"><h2>Room paling aktif</h2></div>' + table(["Undangan", "Aktivitas", "Tamu"], (l.top_rooms || []).map(function (t) { return [esc(t.title), fmt(t.events), fmt(t.guests)]; }), [1, 2]) + "</div></div>";
    });

    var rm = M.filter(function (m) { return m.key === "reports"; })[0];
    if (rm) { rm.render = null; rm.tabs = [{ key: "sum", label: "Pendapatan", render: TABS.sum }, { key: "cust", label: "Pelanggan & Funnel", render: TABS.cust }, { key: "tpl", label: "Template & Kategori", render: TABS.tpl }, { key: "aff", label: "Affiliate", render: TABS.aff }, { key: "live", label: "Live Guest", render: TABS.live }]; }
  });
})();
