/* NusaMora Admin: Analytics Pengunjung (tahap 3). Menumpang pada assets/admin.js lewat window.NM_ADMIN_EXT.
   Semua data dibaca lewat RPC admin_analytics_* (backend/admin-analytics.sql) yang memeriksa izin analytics.read di server.
   Tabel analytics tidak pernah dibaca langsung dari browser. Tidak ada data contoh: kosong tetap ditampilkan kosong. */
(function () {
  "use strict";
  window.NM_ADMIN_EXT = window.NM_ADMIN_EXT || [];
  window.NM_ADMIN_EXT.push(function (X) {
    var sb = X.sb, $ = X.$, esc = X.esc, toast = X.toast, errBox = X.errBox, empty = X.empty, skel = X.skel, rp = X.rp, M = X.M, d = document;
    if (!sb) return;
    var PRESETS = [["today", "Hari ini"], ["yesterday", "Kemarin"], ["7d", "7 hari terakhir"], ["30d", "30 hari terakhir"], ["month", "Bulan ini"], ["lastmonth", "Bulan lalu"], ["custom", "Rentang kustom"]];
    var P = { k: "7d", f: "", t: "", pages: { q: "", sort: "views", page: 0 } }, LAST_REFRESH = 0, LIVE_TIMER = null;
    var SRC = { direct: "Direct", organic: "Organic Search", social: "Social", referral: "Referral", paid: "Iklan berbayar (paid)", email: "Email", other: "Lainnya / tidak diketahui", unattributed: "Tidak teratribusi" };
    var DEV = { mobile: "Mobile", desktop: "Desktop", tablet: "Tablet", other: "Lainnya" }, VT = { new: "Pengunjung baru", returning: "Pengunjung kembali" };
    var DEF = {
      visitor_days: "Total Visitors: jumlah pengunjung per hari. Orang yang sama datang di dua hari berbeda dihitung dua kali. Hanya pengunjung yang menyetujui analitik.",
      unique_visitors: "Unique Visitors: jumlah pengunjung berbeda (ID acak first-party) pada seluruh periode. Hanya pengunjung yang menyetujui analitik; bukan jumlah orang sebenarnya.",
      sessions: "Sesi: satu kunjungan. Sesi baru dimulai setelah 30 menit tanpa aktivitas.",
      pageviews: "Page Views: jumlah halaman yang dibuka (tanpa halaman admin dan pratinjau pelanggan).",
      pages_per_session: "Rata-rata halaman per sesi = Page Views / Sesi.",
      avg_duration_s: "Perkiraan: selisih aktivitas terakhir dan awal sesi (denyut tiap 30 detik saat halaman terbuka, maks. 60 menit). Sesi yang ditutup sebelum denyut pertama dihitung 0.",
      bounce_rate: "Bounce rate = sesi dengan satu halaman dan tanpa interaksi (klik, pilih template, dll.) dibagi seluruh sesi.",
      registrations: "Pendaftaran baru: akun baru pada tabel profil (tidak bergantung persetujuan analitik).",
      paid_orders: "Pesanan lunas: invoice berstatus lunas yang bukan sandbox, pada hari pembayaran (WIB). Bukan dari event browser.",
      revenue: "Revenue: total nominal invoice lunas non-sandbox pada periode. Bukan dari event browser."
    };
    if (!d.getElementById("an-css")) {
      var st = d.createElement("style"); st.id = "an-css";
      st.textContent = ".an-tool{display:flex;gap:12px;align-items:flex-end;flex-wrap:wrap;margin-bottom:16px}.an-tool .grow{flex:1;min-width:140px}.an-note{margin:8px 0 0;font-size:.85rem;opacity:.75}.an-warn{margin-bottom:14px}.an-grid{display:grid;gap:16px;grid-template-columns:repeat(auto-fit,minmax(min(320px,100%),1fr));margin-top:16px}.an-ch{width:100%;height:auto;display:block}.an-ch text{font-size:11px;fill:currentColor}.an-d{font-size:12.5px;opacity:.8;display:block;margin-top:4px}.an-k{min-height:112px}.an-k>span{padding-right:0!important;display:flex;align-items:center;gap:6px}.an-tip{display:inline-block;flex:none;width:16px;height:16px;line-height:16px;text-align:center;border-radius:50%;border:1px solid currentColor;font-size:11px;cursor:help;opacity:.6;padding:0;background:none;color:inherit}.an-fr{display:grid;grid-template-columns:170px 1fr 150px;gap:10px;align-items:center;margin:8px 0}.an-fb{height:24px;border-radius:4px;background:#7a4fa6;min-width:2px}.an-hb{height:10px;border-radius:3px;background:#3d6ea8;min-width:2px}.an-pg{display:flex;gap:10px;align-items:center;justify-content:flex-end;margin-top:12px;flex-wrap:wrap}.an-big{font-size:2.4rem;font-weight:800;line-height:1.1}.an-code{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:.85rem;word-break:break-all}.an-def dt{font-weight:700;margin-top:10px}.an-def dd{margin:2px 0 0;opacity:.8}@media(max-width:560px){.an-fr{grid-template-columns:1fr}}";
      d.head.appendChild(st);
    }

    /* ---------- tanggal (WIB) ---------- */
    var jk = function (off) { return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date(Date.now() + (off || 0) * 864e5)); };
    var addDays = function (ds, n) { var x = new Date(ds + "T00:00:00Z"); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
    function range() {
      var today = jk(), f, t = today;
      if (P.k === "today") f = today; else if (P.k === "yesterday") { f = t = addDays(today, -1); }
      else if (P.k === "7d") f = addDays(today, -6); else if (P.k === "30d") f = addDays(today, -29);
      else if (P.k === "month") f = today.slice(0, 8) + "01";
      else if (P.k === "lastmonth") { var fm = addDays(today.slice(0, 8) + "01", -1); f = fm.slice(0, 8) + "01"; t = fm; }
      else { f = P.f || addDays(today, -6); t = P.t || today; }
      return { f: f, t: t, label: f === t ? f : f + " s/d " + t };
    }
    var n = function (v) { return Number(v || 0); }, fmt = function (v) { return n(v).toLocaleString("id-ID"); };
    var pct = function (a, b) { return b ? Math.round(a / b * 1000) / 10 : 0; }, pc = function (v) { return (v == null ? "-" : String(v).replace(".", ",") + "%"); };
    var dur = function (s) { if (s == null) return "-"; s = Math.round(s); return s >= 60 ? Math.floor(s / 60) + " mnt " + (s % 60) + " dtk" : s + " dtk"; };
    var MON = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
    function bl(b, gran) { var y = b.slice(0, 4), m = MON[Number(b.slice(5, 7)) - 1], dd = Number(b.slice(8, 10)); return gran === "month" ? m + " " + y.slice(2) : (gran === "week" ? "Mgg " : "") + dd + " " + m; }
    var cc = (function () { try { return new Intl.DisplayNames(["id"], { type: "region" }); } catch (e) { return null; } })();
    var country = function (c) { if (!c || c === "unknown") return "Tidak diketahui"; try { return (cc && cc.of(c)) || c; } catch (e) { return c; } };
    function delta(cur, prev, rate) {
      if (cur == null || prev == null) return "";
      var a = n(cur), b = n(prev);
      if (rate) { var dp = Math.round((a - b) * 10) / 10; return (dp === 0 ? "=" : dp > 0 ? "▲ +" : "▼ ") + String(dp).replace(".", ",") + " poin vs periode lalu (" + String(b).replace(".", ",") + "%)"; }
      if (b === 0) return a === 0 ? "Periode lalu juga 0" : "Periode lalu 0 (belum ada pembanding)";
      var c = Math.round((a - b) / b * 1000) / 10; return (c === 0 ? "=" : c > 0 ? "▲ +" : "▼ ") + String(c).replace(".", ",") + "% vs periode lalu (" + fmt(b) + ")";
    }

    /* ---------- RPC ---------- */
    function errMsg(e) {
      var m = String(e && (e.message || e.error) || "");
      if (e && (e.code === "42501" || /forbidden|permission denied/i.test(m))) return "Anda tidak punya izin melihat Analytics (butuh izin analytics.read).";
      if (/periode_tidak_valid/.test(m)) return "Periode tidak valid (maksimal 366 hari, tanggal akhir tidak boleh sebelum tanggal awal).";
      if (e && (e.code === "PGRST202" || e.code === "42883" || /Could not find the function|does not exist/i.test(m))) return "Fungsi analytics belum terpasang di database. Jalankan backend/admin-analytics.sql di Supabase.";
      return "Data tidak bisa dimuat. Coba lagi sebentar.";
    }
    function call(name, args) { return sb.rpc(name, args).then(function (r) { if (r.error) throw r.error; return r.data; }); }
    function rargs(r, extra) { var o = { p_from: r.f, p_to: r.t }; for (var k in (extra || {})) o[k] = extra[k]; return o; }
    function ensureRollup(force) {
      if (!force && Date.now() - LAST_REFRESH < 60000) return Promise.resolve();
      LAST_REFRESH = Date.now();
      return sb.rpc("admin_analytics_refresh", { p_days: force ? Math.min(90, Math.max(1, Math.round((Date.parse(jk()) - Date.parse(range().f)) / 864e5) + 1)) : 2 }).then(function (r) { return r; }, function () { /* tidak fatal */ });
    }

    /* ---------- tabel dan grafik ---------- */
    var table = function (head, rows, num) { return rows.length ? '<div class="tbl-w"><table><thead><tr>' + head.map(function (h, i) { return "<th" + (num && num.indexOf(i) > -1 ? ' class="num"' : "") + ">" + esc(h) + "</th>"; }).join("") + "</tr></thead><tbody>" + rows.map(function (r) { return "<tr>" + r.map(function (c, i) { return "<td" + (num && num.indexOf(i) > -1 ? ' class="num"' : "") + ">" + c + "</td>"; }).join("") + "</tr>"; }).join("") + "</tbody></table></div>" : empty("Belum ada data", "Tidak ada data pada periode ini."); };
    function chart(rows, key, money, gran, label) {
      var any = rows.some(function (r) { return n(r[key]) > 0; });
      if (!rows.length || !any) return empty("Belum ada data", "Tidak ada aktivitas pada periode ini.");
      var W = 640, H = 220, L = 52, B = 28, T = 10, R = 8, pw = W - L - R, ph = H - T - B, mx = 1;
      rows.forEach(function (r) { mx = Math.max(mx, n(r[key])); }); if (!money) mx = Math.max(4, Math.ceil(mx / 4) * 4);
      var o = '<svg class="an-ch" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="' + esc(label) + '">', bw = Math.min(40, pw / rows.length * 0.66), step = Math.ceil(rows.length / 8);
      for (var g = 0; g <= 4; g++) { var y = T + ph - ph * g / 4, v = mx * g / 4; o += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + y + '" y2="' + y + '" stroke="currentColor" opacity=".15"/><text x="' + (L - 6) + '" y="' + (y + 4) + '" text-anchor="end">' + (money ? (v >= 1e6 ? Math.round(v / 1e5) / 10 + " jt" : v >= 1e3 ? Math.round(v / 1e3) + " rb" : Math.round(v)) : Math.round(v)) + "</text>"; }
      rows.forEach(function (r, i) {
        var cx = L + pw * (i + 0.5) / rows.length, h = ph * n(r[key]) / mx;
        if (h > 0) o += '<rect x="' + (cx - bw / 2) + '" y="' + (T + ph - h) + '" width="' + bw + '" height="' + h + '" fill="#7a4fa6" rx="2"><title>' + esc(bl(r.bucket, gran) + ": " + (money ? rp(n(r[key])) : fmt(r[key]))) + "</title></rect>";
        if (i % step === 0) o += '<text x="' + cx + '" y="' + (H - 8) + '" text-anchor="middle">' + esc(bl(r.bucket, gran)) + "</text>";
      });
      return o + "</svg>";
    }
    var tip = function (k) { return DEF[k] ? '<button type="button" class="an-tip" title="' + esc(DEF[k]) + '" aria-label="' + esc(DEF[k]) + '">i</button>' : ""; };
    var kpi = function (label, k, val, sub) { return '<div class="card kpi an-k"><span>' + esc(label) + tip(k) + "</span><b>" + val + "</b>" + (sub ? '<small class="an-d">' + esc(sub) + "</small>" : "") + "</div>"; };
    var hbar = function (v, mx) { return '<div class="an-hb" style="width:' + Math.max(1, Math.round(n(v) / (mx || 1) * 100)) + '%"></div>'; };

    /* ---------- ekspor (CSV dan Excel .xlsx; tanpa data pribadi, mengikuti filter aktif) ---------- */
    var guard = function (v) { return typeof v === "string" && /^[=+\-@\t\r]/.test(v) ? "'" + v : v; };
    var csvCell = function (v) { v = guard(v == null ? "" : v); v = String(v); return /[",\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
    function toCsv(secs, label) {
      var out = ["Laporan Analytics NusaMora", "Dibuat (WIB)," + csvCell(new Date().toLocaleString("sv-SE", { timeZone: "Asia/Jakarta" })), "Periode," + csvCell(label), ""];
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
    function check(r) {
      if (r.t < r.f) return "Tanggal akhir tidak boleh sebelum tanggal awal.";
      if ((Date.parse(r.t) - Date.parse(r.f)) / 864e5 > 365) return "Rentang maksimal 366 hari.";
      return "";
    }
    function toolbar(T, r) {
      var rangeUi = T.live ? "" : '<label class="fld">Periode<select id="an-k">' + PRESETS.map(function (p) { return '<option value="' + p[0] + '"' + (P.k === p[0] ? " selected" : "") + ">" + p[1] + "</option>"; }).join("") + "</select></label>" +
        (P.k === "custom" ? '<label class="fld">Dari<input type="date" id="an-f" value="' + esc(r.f) + '" max="' + esc(jk()) + '"></label><label class="fld">Sampai<input type="date" id="an-t" value="' + esc(r.t) + '" max="' + esc(jk()) + '"></label><button class="btn o" type="button" id="an-go">Terapkan</button>' : "") +
        '<span class="grow cell-s">Periode: ' + esc(r.label) + " (WIB)</span>";
      return '<div class="an-tool">' + rangeUi + (T.live ? '<span class="grow cell-s">Diperbarui otomatis tiap 30 detik saat tab ini terbuka.</span><button class="btn o" type="button" id="an-live-r">Muat ulang</button>' : "") +
        (T.rollup ? '<button class="btn o" type="button" id="an-refresh" title="Hitung ulang rekap harian untuk periode ini">Rekap sekarang</button>' : "") +
        (T.noExport ? "" : '<button class="btn o" type="button" id="an-csv">Unduh CSV</button><button class="btn" type="button" id="an-xl">Unduh Excel (.xlsx)</button>') + "</div>";
    }
    function bindToolbar(root, T, rerender) {
      var k = $("#an-k", root); if (k) k.onchange = function (e) { var r0 = range(); P.k = e.target.value; if (P.k === "custom") { P.f = r0.f; P.t = r0.t; } P.pages.page = 0; rerender(); };
      var go = $("#an-go", root); if (go) go.onclick = function () { P.f = $("#an-f", root).value; P.t = $("#an-t", root).value; P.pages.page = 0; rerender(); };
      var rf = $("#an-refresh", root); if (rf) rf.onclick = function () { rf.disabled = true; ensureRollup(true).then(function (r) { if (r && r.error) toast(errMsg(r.error), "bad"); else toast("Rekap harian diperbarui.", "ok"); rerender(); }); };
      var exp = function (kind) { return function () {
        var r = range(), btn = this; btn.disabled = true;
        (T.exportLoad || T.load)(r).then(function (data) {
          var secs = T.sections(data, r), stamp = r.f + "_" + r.t, name = "nusamora-analytics-" + T.id + "-" + stamp;
          if (kind === "csv") save(name + ".csv", new Blob([toCsv(secs, r.label)], { type: "text/csv;charset=utf-8" })); else save(name + ".xlsx", xlsx(secs, r.label));
          toast("File " + (kind === "csv" ? "CSV" : "Excel") + " diunduh.", "ok");
        }).catch(function (e) { toast(errMsg(e), "bad"); }).then(function () { btn.disabled = false; });
      }; };
      var c = $("#an-csv", root), x = $("#an-xl", root); if (c) c.onclick = exp("csv"); if (x) x.onclick = exp("xlsx");
    }
    function makeTab(T) {
      return function render(root) {
        if (LIVE_TIMER) { clearInterval(LIVE_TIMER); LIVE_TIMER = null; }
        var r = range(), again = function () { render(root); };
        var showErr = function (msg, retry) { root.innerHTML = toolbar(T, r) + errBox(msg, retry); bindToolbar(root, T, again); var b = $("[data-retry]", root); if (b) b.onclick = again; };
        var bad = T.live ? "" : check(r); if (bad) { showErr(bad, false); return; }
        root.innerHTML = skel();
        (T.rollup ? ensureRollup() : Promise.resolve()).then(function () { return T.load(r); }).then(function (data) {
          root.innerHTML = toolbar(T, r) + T.build(data, r); bindToolbar(root, T, again); if (T.bind) T.bind(root, data, r, again);
        }).catch(function (e) { showErr(errMsg(e), true); });
      };
    }
    var defs = function (items) { return '<details class="card" style="margin-top:16px"><summary><b>Definisi dan batasan data</b></summary><dl class="an-def">' + items.map(function (i) { return "<dt>" + esc(i[0]) + "</dt><dd>" + esc(i[1]) + "</dd>"; }).join("") + "</dl></details>"; };
    var warn = function (html) { return '<div class="note an-warn">' + html + "</div>"; };

    /* ---------- 1. Ringkasan ---------- */
    var OV = { id: "ringkasan", rollup: true };
    OV.load = function (r) { return Promise.all([call("admin_analytics_overview", rargs(r)), call("admin_analytics_series", rargs(r))]).then(function (x) { return { o: x[0], s: x[1] }; }); };
    OV.build = function (D) {
      var o = D.o, c = o.current, p = o.previous, m = o.meta, rows = D.s.rows || [], g = D.s.gran, h = "";
      if (!m.collecting) h += warn("<b>Pengumpulan data pengunjung belum diaktifkan.</b> Angka pengunjung, sesi, dan page views akan 0 sampai analytics dinyalakan. Pendaftaran, pesanan, dan revenue tetap dibaca dari data akun dan invoice.");
      if (!m.payment_live) h += warn("<b>Pembayaran belum live.</b> Semua invoice saat ini dianggap sandbox" + (n(m.sandbox_invoices) ? " (" + fmt(m.sandbox_invoices) + " pada periode ini)" : "") + " dan tidak dihitung, jadi Pesanan lunas dan Revenue bernilai 0 sampai go-live pembayaran.");
      else if (n(m.sandbox_invoices)) h += warn(fmt(m.sandbox_invoices) + " invoice sandbox pada periode ini diabaikan dari pesanan dan revenue.");
      h += '<div class="kpis">' +
        kpi("Total Visitors", "visitor_days", fmt(c.visitor_days), delta(c.visitor_days, p.visitor_days)) + kpi("Unique Visitors", "unique_visitors", fmt(c.unique_visitors), delta(c.unique_visitors, p.unique_visitors)) +
        kpi("Total Sessions", "sessions", fmt(c.sessions), delta(c.sessions, p.sessions)) + kpi("Total Page Views", "pageviews", fmt(c.pageviews), delta(c.pageviews, p.pageviews)) +
        kpi("Rata-rata halaman per sesi", "pages_per_session", c.pages_per_session == null ? "-" : String(c.pages_per_session).replace(".", ","), delta(c.pages_per_session, p.pages_per_session)) +
        kpi("Rata-rata durasi sesi (perkiraan)", "avg_duration_s", dur(c.avg_duration_s), p.avg_duration_s == null || c.avg_duration_s == null ? "" : delta(c.avg_duration_s, p.avg_duration_s)) +
        kpi("Bounce Rate", "bounce_rate", pc(c.bounce_rate), delta(c.bounce_rate, p.bounce_rate, true)) + kpi("Pendaftaran baru", "registrations", fmt(c.registrations), delta(c.registrations, p.registrations)) +
        kpi("Pesanan lunas", "paid_orders", fmt(c.paid_orders), delta(c.paid_orders, p.paid_orders)) + kpi("Revenue", "revenue", rp(n(c.revenue)), delta(c.revenue, p.revenue)) + "</div>";
      if (!n(c.sessions)) h += '<div class="card" style="margin-top:16px">' + empty("Belum ada data pengunjung pada periode ini", m.collecting ? "Tidak ada sesi tercatat pada rentang ini. Coba perluas periode." : "Analytics masih nonaktif, jadi belum ada sesi yang dikumpulkan.") + "</div>";
      var lab = { visitors: "Pengunjung", pageviews: "Page views", sessions: "Sesi", registrations: "Pendaftaran", orders: "Pesanan lunas", revenue: "Revenue" }, gl = { day: "per hari", week: "per minggu (mulai Senin)", month: "per bulan" }[g] || "";
      h += '<div class="an-grid">' + ["visitors", "pageviews", "sessions", "registrations", "orders", "revenue"].map(function (k) { return '<div class="card"><div class="card-h"><h2>' + lab[k] + '</h2></div><span class="an-d" style="margin:0 0 6px">' + esc(gl) + (k === "visitors" ? " (pengunjung berbeda di tiap bagian waktu)" : "") + "</span>" + chart(rows, k, k === "revenue", g, lab[k] + " " + gl) + "</div>"; }).join("") + "</div>";
      h += '<p class="an-note">Rekap harian terakhir: ' + esc(m.last_rollup ? new Date(m.last_rollup).toLocaleString("id-ID", { timeZone: "Asia/Jakarta", dateStyle: "medium", timeStyle: "short" }) + " WIB" : "belum ada") + ". Pembanding: " + esc(o.period.prev_from + " s/d " + o.period.prev_to) + ".</p>";
      var NM = { visitor_days: "Total Visitors", unique_visitors: "Unique Visitors", sessions: "Sesi", pageviews: "Page Views", pages_per_session: "Halaman per sesi", avg_duration_s: "Durasi sesi", bounce_rate: "Bounce Rate", registrations: "Pendaftaran baru", paid_orders: "Pesanan lunas", revenue: "Revenue" };
      return h + defs(Object.keys(DEF).map(function (k) { return [NM[k], DEF[k]]; }));
    };
    OV.sections = function (D) {
      var c = D.o.current, p = D.o.previous, rr = function (l, k) { return [l, c[k] == null ? "" : c[k], p[k] == null ? "" : p[k], DEF[k]]; };
      return [{ id: "kpi", name: "KPI", head: ["Metrik", "Periode ini", "Periode sebelumnya", "Definisi"], rows: [rr("Total Visitors (pengunjung-hari)", "visitor_days"), rr("Unique Visitors", "unique_visitors"), rr("Sesi", "sessions"), rr("Page Views", "pageviews"), rr("Halaman per sesi", "pages_per_session"), rr("Durasi sesi rata-rata (detik, perkiraan)", "avg_duration_s"), rr("Bounce rate (%)", "bounce_rate"), rr("Pendaftaran baru", "registrations"), rr("Pesanan lunas", "paid_orders"), rr("Revenue (Rp)", "revenue")] },
        { id: "tren", name: "Tren", head: ["Awal periode (" + D.s.gran + ")", "Pengunjung", "Sesi", "Page views", "Pendaftaran", "Checkout (invoice dibuat)", "Pesanan lunas", "Revenue (Rp)"], rows: (D.s.rows || []).map(function (x) { return [x.bucket, n(x.visitors), n(x.sessions), n(x.pageviews), n(x.registrations), n(x.checkouts), n(x.orders), n(x.revenue)]; }) }];
    };

    /* ---------- 2. Sumber traffic dan UTM ---------- */
    var SO = { id: "sumber-utm", rollup: true };
    SO.load = function (r) { return call("admin_analytics_sources", rargs(r)); };
    function utmTable(title, rows, attr) {
      var mx = Math.max.apply(null, (rows || []).map(function (x) { return n(x.sessions); }).concat([1]));
      return '<div class="card"><div class="card-h"><h2>' + esc(title) + "</h2></div>" + table(attr ? ["Nama", "Pengunjung", "Sesi", "", "Pendaftaran", "Pesanan lunas", "Revenue"] : ["Nama", "Pengunjung", "Sesi", ""], (rows || []).map(function (x) { var a = [esc(x.k), fmt(x.visitors), fmt(x.sessions), hbar(x.sessions, mx)]; return attr ? a.concat([fmt(x.signups), fmt(x.orders), rp(n(x.revenue))]) : a; }), attr ? [1, 2, 4, 5, 6] : [1, 2]) + "</div>";
    }
    SO.build = function (s) {
      var g = s.groups || [], tot = g.reduce(function (t, x) { return t + n(x.sessions); }, 0), mx = Math.max.apply(null, g.map(function (x) { return n(x.sessions); }).concat([1])), a = s.attribution || {}, un = a.unattributed || {}, h = "";
      if (n(a.rollup_days) < n(a.days_in_range)) h += warn("Rekap harian baru mencakup " + fmt(a.rollup_days) + " dari " + fmt(a.days_in_range) + " hari pada periode ini, jadi pendaftaran, pesanan, dan revenue per sumber belum lengkap. Klik <b>Rekap sekarang</b> untuk melengkapi.");
      h += '<div class="kpis">' + kpi("Sesi dari kampanye (utm_campaign)", "", fmt(s.campaign_sessions), tot ? pc(pct(n(s.campaign_sessions), tot)) + " dari semua sesi" : "") + kpi("Pendaftaran tidak teratribusi", "", fmt(un.signups), "Tidak terbukti berasal dari sumber tertentu") + kpi("Pesanan tidak teratribusi", "", fmt(un.orders), rp(n(un.revenue))) + "</div>";
      h += '<div class="card" style="margin-top:16px"><div class="card-h"><h2>Sumber traffic</h2></div>' + table(["Sumber", "Pengunjung", "Sesi", "Porsi sesi", "", "Bounce", "Pendaftaran", "Pesanan lunas", "Revenue"], g.map(function (x) { return [esc(SRC[x.source_group] || x.source_group), fmt(x.visitors), fmt(x.sessions), tot ? pc(pct(n(x.sessions), tot)) : "-", hbar(x.sessions, mx), n(x.sessions) ? pc(pct(n(x.bounced), n(x.sessions))) : "-", fmt(x.signups), fmt(x.orders), rp(n(x.revenue))]; }), [1, 2, 3, 5, 6, 7, 8]) + '<p class="an-note">Pendaftaran, pesanan, dan revenue per sumber hanya terisi bila bisa dihubungkan ke sesi (pengguna menyetujui analitik sebelum mendaftar). Sisanya masuk "Tidak teratribusi"; kampanye tidak dinyatakan menghasilkan transaksi tanpa bukti tautan itu.</p></div>';
      h += '<div class="an-grid">' + utmTable("Per utm_source", s.by_source, true) + utmTable("Per utm_medium", s.by_medium, true) + utmTable("Per utm_campaign", s.by_campaign, true) + utmTable("Per utm_content", s.by_content, false) + utmTable("Per utm_term", s.by_term, false) +
        '<div class="card"><div class="card-h"><h2>Situs perujuk (referrer)</h2></div>' + table(["Domain", "Pengunjung", "Sesi"], (s.referrers || []).map(function (x) { return [esc(x.host), fmt(x.visitors), fmt(x.sessions)]; }), [1, 2]) + "</div></div>";
      return h + defs([["Direct", "Tanpa referrer dan tanpa UTM."], ["Organic Search", "Referrer mesin pencari atau utm_medium=organic."], ["Social", "Referrer media sosial atau utm_medium=social."], ["Referral", "Referrer situs lain."], ["Iklan berbayar / Email", "Dari utm_medium (cpc, paid, email, dll.)."], ["Lainnya / tidak diketahui", "UTM ada tetapi tidak cocok dengan kelompok lain."], ["utm_content dan utm_term", "Hanya lalu lintas (tanpa atribusi pesanan)."]]);
    };
    SO.sections = function (s) {
      var f = function (rows, attr) { return (rows || []).map(function (x) { var a = [x.k, n(x.visitors), n(x.sessions)]; return attr ? a.concat([n(x.signups), n(x.orders), n(x.revenue)]) : a; }); };
      var hh = ["Nama", "Pengunjung", "Sesi"], ha = hh.concat(["Pendaftaran (teratribusi)", "Pesanan lunas (teratribusi)", "Revenue (Rp, teratribusi)"]);
      return [{ id: "sumber", name: "Sumber traffic", head: ["Sumber", "Pengunjung", "Sesi", "Sesi bounce", "Pendaftaran (teratribusi)", "Pesanan lunas (teratribusi)", "Revenue (Rp, teratribusi)"], rows: (s.groups || []).map(function (x) { return [SRC[x.source_group] || x.source_group, n(x.visitors), n(x.sessions), n(x.bounced), n(x.signups), n(x.orders), n(x.revenue)]; }) },
        { id: "utm_source", name: "utm_source", head: ha, rows: f(s.by_source, true) }, { id: "utm_medium", name: "utm_medium", head: ha, rows: f(s.by_medium, true) }, { id: "utm_campaign", name: "utm_campaign", head: ha, rows: f(s.by_campaign, true) },
        { id: "utm_content", name: "utm_content", head: hh, rows: f(s.by_content) }, { id: "utm_term", name: "utm_term", head: hh, rows: f(s.by_term) }, { id: "referrer", name: "Referrer", head: ["Domain", "Pengunjung", "Sesi"], rows: (s.referrers || []).map(function (x) { return [x.host, n(x.visitors), n(x.sessions)]; }) }];
    };

    /* ---------- 3. Halaman populer ---------- */
    var PG = { id: "halaman", rollup: true }, PS = 25;
    PG.load = function (r) { return call("admin_analytics_pages", rargs(r, { p_q: P.pages.q || null, p_sort: P.pages.sort, p_limit: PS, p_offset: P.pages.page * PS })); };
    PG.exportLoad = function (r) { return call("admin_analytics_pages", rargs(r, { p_q: P.pages.q || null, p_sort: P.pages.sort, p_limit: 200, p_offset: 0, p_export: true })); };
    var chg = function (cur, prev) { cur = n(cur); prev = n(prev); if (!prev) return cur ? "baru" : "-"; var c = Math.round((cur - prev) / prev * 1000) / 10; return (c > 0 ? "▲ +" : c < 0 ? "▼ " : "= ") + String(c).replace(".", ",") + "%"; };
    PG.build = function (p) {
      var rows = p.rows || [], from = p.total_rows ? p.offset + 1 : 0, to = p.offset + rows.length, st = P.pages;
      return '<div class="card"><form class="an-tool" id="an-pf" role="search"><label class="fld grow">Cari URL<input type="search" id="an-pq" value="' + esc(st.q) + '" maxlength="100" placeholder="mis. /template" autocomplete="off"></label><label class="fld">Urutkan<select id="an-ps">' + [["views", "Views terbanyak"], ["visitors", "Pengunjung terbanyak"], ["entrances", "Halaman masuk terbanyak"], ["change", "Kenaikan view terbesar"]].map(function (o) { return '<option value="' + o[0] + '"' + (st.sort === o[0] ? " selected" : "") + ">" + o[1] + "</option>"; }).join("") + '</select></label><button class="btn o" type="submit">Cari</button></form>' +
        table(["URL", "Grup", "Views", "Kontribusi", "Pengunjung (harian)", "Halaman masuk", "Bounce halaman masuk", "Rata-rata waktu", "Perubahan views"], rows.map(function (x) { return ['<span class="an-code">' + esc(x.path) + "</span>", esc(x.group), fmt(x.views), pc(x.share), fmt(x.visitors), fmt(x.entrances), x.bounce_rate == null ? "-" : pc(x.bounce_rate), x.avg_time_s == null ? "-" : dur(x.avg_time_s), esc(chg(x.views, x.prev_views))]; }), [2, 3, 4, 5, 6, 7, 8]) +
        '<div class="an-pg"><span class="cell-s">' + fmt(from) + "-" + fmt(to) + " dari " + fmt(p.total_rows) + ' halaman. Total views publik: ' + fmt(p.total_views) + '</span><button class="btn o" type="button" id="an-prev"' + (st.page ? "" : " disabled") + '>Sebelumnya</button><button class="btn o" type="button" id="an-next"' + (to >= p.total_rows ? " disabled" : "") + ">Berikutnya</button></div></div>" +
        defs([["Views", "Jumlah page_view per URL (tanpa query dan hash). Halaman privat (akun, admin, undangan pelanggan) dan URL berisi ID atau e-mail tidak ditampilkan."], ["Pengunjung (harian)", "Jumlah pengunjung unik per hari, dijumlahkan antar hari; orang yang sama di hari berbeda dihitung lagi."], ["Halaman masuk dan bounce", "Sesi yang mendarat di URL itu dan persentase yang berhenti tanpa interaksi."], ["Judul halaman dan sesi per halaman", "TIDAK TERSEDIA: judul dan jumlah sesi per halaman tidak dikumpulkan; yang tersedia adalah halaman masuk."], ["Perubahan", "Dibanding periode sebelumnya dengan panjang yang sama."], ["Ekspor", "Ekspor memuat sampai 200 baris teratas sesuai pencarian dan urutan yang sedang dipilih."]]);
    };
    PG.bind = function (root, p, r, again) {
      var go = function () { P.pages.q = $("#an-pq", root).value.trim(); P.pages.sort = $("#an-ps", root).value; P.pages.page = 0; again(); };
      $("#an-pf", root).onsubmit = function (e) { e.preventDefault(); go(); }; $("#an-ps", root).onchange = go;
      $("#an-prev", root).onclick = function () { P.pages.page = Math.max(0, P.pages.page - 1); again(); }; $("#an-next", root).onclick = function () { P.pages.page++; again(); };
    };
    PG.sections = function (p) { return [{ id: "halaman", name: "Halaman populer", head: ["URL", "Grup", "Views", "Kontribusi (%)", "Pengunjung (harian)", "Halaman masuk", "Bounce halaman masuk (%)", "Rata-rata waktu (detik)", "Views periode sebelumnya"], rows: (p.rows || []).map(function (x) { return [x.path, x.group, n(x.views), x.share == null ? "" : n(x.share), n(x.visitors), n(x.entrances), x.bounce_rate == null ? "" : n(x.bounce_rate), x.avg_time_s == null ? "" : n(x.avg_time_s), n(x.prev_views)]; }) }]; };

    /* ---------- 4. Template ---------- */
    var TP = { id: "template", rollup: true };
    TP.load = function (r) { return call("admin_analytics_templates", rargs(r)); };
    TP.build = function (t) {
      var rows = t.rows || [], rise = rows.filter(function (x) { return n(x.views) - n(x.prev_views) > 0; }).sort(function (a, b) { return (n(b.views) - n(b.prev_views)) - (n(a.views) - n(a.prev_views)); }).slice(0, 3), h = "";
      if (n(t.rollup_days) < n(t.days_in_range)) h += warn("Rekap harian baru mencakup " + fmt(t.rollup_days) + " dari " + fmt(t.days_in_range) + " hari. Klik <b>Rekap sekarang</b> bila angka terasa kurang.");
      h += '<div class="an-grid" style="margin-top:0"><div class="card"><div class="card-h"><h2>Minat naik tertinggi</h2></div>' + (rise.length ? table(["Template", "Views", "Periode lalu", "Perubahan"], rise.map(function (x) { return [esc(x.name) + '<span class="cell-s">' + esc(x.slug) + "</span>", fmt(x.views), fmt(x.prev_views), esc(chg(x.views, x.prev_views))]; }), [1, 2, 3]) : empty("Belum bisa dihitung", "Tidak ada template yang view-nya naik dibanding periode sebelumnya.")) +
        '</div><div class="card"><div class="card-h"><h2>Kategori paling populer</h2></div>' + table(["Kategori", "Template", "Views", "Preview", "Dipilih"], (t.categories || []).map(function (x) { return [esc(x.category), fmt(x.templates), fmt(x.views), fmt(x.previews), fmt(x.selects)]; }), [1, 2, 3, 4]) + "</div></div>";
      h += '<div class="card" style="margin-top:16px"><div class="card-h"><h2>Tren view template per hari</h2></div>' + chart((t.trend || []).map(function (x) { return { bucket: x.day, views: x.views }; }), "views", false, "day", "View template per hari") + "</div>";
      h += '<div class="card" style="margin-top:16px"><div class="card-h"><h2>Template</h2></div>' + table(["Template (ID/slug)", "Kategori", "Views", "Preview", "Dipilih", "Checkout", "Pembelian", "Pengunjung (harian)", "Perubahan views"], rows.map(function (x) { return [esc(x.name) + '<span class="cell-s an-code">' + esc(x.slug) + "</span>", esc(x.category), fmt(x.views), fmt(x.previews), fmt(x.selects), fmt(x.checkouts), fmt(x.purchases), fmt(x.visitors), esc(chg(x.views, x.prev_views))]; }), [2, 3, 4, 5, 6, 7, 8]) + "</div>";
      return h + defs([["Identitas", "Template diidentifikasi dengan slug (ID template) dari event, bukan nama atau URL. Nama dan kategori dari katalog bila slug ada di katalog."], ["View, preview, dipilih", "Event template_view, template_preview, template_select. View tidak sama dengan minat beli; preview dan dipilih adalah sinyal yang lebih kuat."], ["Checkout dan pembelian", "Berasal dari trigger invoice (non-sandbox) yang tertaut ke sesi; tidak dihitung dari browser."], ["Event yang BELUM dikumpulkan", "Favorit template dan klik CTA per template belum ada. Tahap berikutnya perlu event template_favorite dan template_cta_click agar minat bisa dianalisis lebih dalam."], ["Pengunjung (harian)", "Dijumlahkan antar hari, bukan pengunjung unik sepanjang periode."]]);
    };
    TP.sections = function (t) {
      return [{ id: "template", name: "Template", head: ["Slug template", "Nama", "Kategori", "Views", "Preview", "Dipilih", "Checkout", "Pembelian", "Pengunjung (harian)", "Views periode sebelumnya"], rows: (t.rows || []).map(function (x) { return [x.slug, x.name, x.category, n(x.views), n(x.previews), n(x.selects), n(x.checkouts), n(x.purchases), n(x.visitors), n(x.prev_views)]; }) },
        { id: "kategori", name: "Kategori", head: ["Kategori", "Jumlah template", "Views", "Preview", "Dipilih"], rows: (t.categories || []).map(function (x) { return [x.category, n(x.templates), n(x.views), n(x.previews), n(x.selects)]; }) },
        { id: "tren", name: "Tren harian", head: ["Tanggal (WIB)", "Views", "Preview", "Dipilih"], rows: (t.trend || []).map(function (x) { return [x.day, n(x.views), n(x.previews), n(x.selects)]; }) }];
    };

    /* ---------- 5. Funnel ---------- */
    var FN = { id: "funnel" }, FL = { visitors: "Pengunjung (sesi analitik)", registrations: "Pendaftaran", checkout: "Checkout (invoice dibuat)", paid: "Pembayaran sukses" };
    FN.load = function (r) { return call("admin_analytics_funnel", rargs(r)); };
    FN.build = function (f) {
      var st = f.stages || [], v = n(st[0] && st[0].n), top = Math.max(n(st[0] && st[0].n), n(st[1] && st[1].n), 1), h = "";
      if (f.status === "tidak_ada_pendaftar") h += warn("<b>Data belum cukup:</b> belum ada pendaftar pada periode ini, jadi konversi tahap berikutnya tidak bisa dihitung.");
      else if (f.status === "tanpa_data_pengunjung") h += warn("<b>Tahap pengunjung tidak bisa dihitung:</b> tidak ada sesi analitik pada periode ini (analytics belum aktif atau tidak ada persetujuan). Tahap pendaftaran sampai pembayaran tetap dari data akun dan invoice.");
      else if (f.status === "sampel_kecil") h += warn("<b>Sampel kecil</b> (kurang dari 30 pendaftar): persentase belum stabil, jangan dipakai untuk keputusan besar.");
      h += '<div class="card"><div class="card-h"><h2>Funnel konversi</h2></div>' + st.map(function (s, i) {
        var prev = i ? n(st[i - 1].n) : 0, ok = i === 0 ? true : (i === 1 ? v > 0 : prev > 0), cv = i && ok ? pc(pct(n(s.n), prev)) : "", dr = i && ok ? fmt(Math.max(prev - n(s.n), 0)) : "";
        return '<div class="an-fr"><span>' + esc(FL[s.key]) + '</span><div><div class="an-fb" style="width:' + Math.max(1, Math.round(n(s.n) / top * 100)) + '%"></div></div><b>' + fmt(s.n) + (i ? ' <small class="cell-s">' + (ok ? cv + " dari tahap sebelumnya; hilang " + dr : "tidak dapat dihitung") + "</small>" : "") + "</b></div>";
      }).join("") + '<p class="an-note">Pendaftar yang terhubung ke pengunjung (dengan persetujuan analitik): ' + fmt(f.linked_registrations) + ". Periode ini: " + fmt(f.period_totals.checkout_invoices) + " invoice dibuat dan " + fmt(f.period_totals.paid_orders) + " pesanan lunas (semua pengguna, non-sandbox).</p></div>";
      h += '<div class="card" style="margin-top:16px"><div class="card-h"><h2>Tren</h2></div>' + table(["Awal periode (" + esc(f.gran) + ")", "Pengunjung", "Pendaftaran", "Invoice dibuat", "Pesanan lunas"], (f.trend || []).map(function (x) { return [esc(x.bucket), fmt(x.visitors), fmt(x.registrations), fmt(x.checkouts), fmt(x.orders)]; }), [1, 2, 3, 4]) + "</div>";
      return h + defs([["Tahap 1 (Pengunjung)", "Pengunjung berbeda yang menyetujui analitik. Satuannya pengunjung anonim, bukan pengguna."], ["Tahap 2 sampai 4", "Kohort: pengguna yang mendaftar pada periode ini, dilihat sampai sekarang. Checkout = punya invoice non-sandbox; Pembayaran sukses = invoice lunas non-sandbox (dari tabel invoice, bukan event browser)."], ["Conversion rate", "Tahap n dibagi tahap n-1. Pengunjung ke Pendaftaran adalah rasio periode (pendaftaran dibagi pengunjung), bukan kohort, karena identitas anonim tidak dihubungkan ke pengguna tanpa tautan yang sah."], ["Sandbox", "Invoice sandbox diabaikan. Selama pembayaran belum live, tahap Checkout dan Pembayaran bernilai 0."]]);
    };
    FN.sections = function (f) {
      var st = f.stages || [];
      return [{ id: "funnel", name: "Funnel", head: ["Tahap", "Jumlah", "Konversi dari tahap sebelumnya (%)", "Hilang dari tahap sebelumnya"], rows: st.map(function (s, i) { var prev = i ? n(st[i - 1].n) : 0; return [FL[s.key], n(s.n), i && prev ? pct(n(s.n), prev) : "", i && prev ? Math.max(prev - n(s.n), 0) : ""]; }) },
        { id: "tren", name: "Tren", head: ["Awal periode (" + f.gran + ")", "Pengunjung", "Pendaftaran", "Invoice dibuat", "Pesanan lunas"], rows: (f.trend || []).map(function (x) { return [x.bucket, n(x.visitors), n(x.registrations), n(x.checkouts), n(x.orders)]; }) }];
    };

    /* ---------- 6. Audiens ---------- */
    var AU = { id: "audiens" }, DIMS = [["country", "Negara", country], ["device", "Perangkat", function (v) { return DEV[v] || v; }], ["browser", "Browser", function (v) { return v; }], ["os", "Sistem operasi", function (v) { return v; }], ["screen", "Kategori layar", function (v) { return v; }], ["visitor_type", "Pengunjung baru vs kembali", function (v) { return VT[v] || v; }]];
    AU.load = function (r) { return call("admin_analytics_audience", rargs(r)); };
    AU.build = function (a) {
      var tot = n(a.total_sessions), dm = a.dims || {};
      if (!tot) return '<div class="card">' + empty("Belum ada data audiens", "Tidak ada sesi tercatat pada periode ini.") + "</div>" + defs([["Sumber", "Hanya dimensi yang memang dikumpulkan; tanpa IP dan tanpa fingerprint."]]);
      return '<div class="an-grid" style="margin-top:0">' + DIMS.map(function (x) { var rows = dm[x[0]] || [], mx = Math.max.apply(null, rows.map(function (r) { return n(r.sessions); }).concat([1])); return '<div class="card"><div class="card-h"><h2>' + esc(x[1]) + "</h2></div>" + table(["Nilai", "Pengunjung", "Sesi", "Porsi sesi", ""], rows.map(function (r) { return [esc(x[2](r.value)), fmt(r.visitors), fmt(r.sessions), pc(pct(n(r.sessions), tot)), hbar(r.sessions, mx)]; }), [1, 2, 3]) + "</div>"; }).join("") + "</div>" +
        defs([["Yang dikumpulkan", "Negara (dari header CDN, tanpa menyimpan IP), jenis perangkat, browser, sistem operasi, dan ukuran layar yang dikelompokkan. Tidak ada IP, fingerprint, atau data pribadi."], ["Porsi", "Persentase dari seluruh sesi pada periode. 15 nilai teratas per dimensi."], ["Pengunjung", "Pengunjung berbeda (ID acak) pada dimensi tersebut; satu pengunjung bisa muncul di beberapa nilai (mis. dua browser)."]]);
    };
    AU.sections = function (a) { var tot = n(a.total_sessions); return DIMS.map(function (x) { return { id: x[0], name: x[1], head: ["Nilai", "Pengunjung", "Sesi", "Porsi sesi (%)"], rows: ((a.dims || {})[x[0]] || []).map(function (r) { return [x[2](r.value), n(r.visitors), n(r.sessions), pct(n(r.sessions), tot)]; }) }; }); };

    /* ---------- 7. Real-time (polling 30 detik, hanya saat tab terlihat) ---------- */
    var LV = { id: "realtime", live: true, noExport: true };
    var ago = function (s) { s = n(s); return s < 60 ? s + " dtk lalu" : Math.floor(s / 60) + " mnt lalu"; };
    LV.load = function () { return call("admin_analytics_live", {}); };
    function liveBody(l) {
      var h = "";
      if (!l.collecting) h += warn("Pengumpulan data analytics belum diaktifkan, jadi panel ini kosong sampai analytics dinyalakan.");
      h += '<div class="kpis">' + kpi("Sesi aktif", "", '<span class="an-big">' + fmt(l.active_sessions) + "</span>", "Aktivitas dalam " + Math.round(n(l.window_s) / 60) + " menit terakhir") + kpi("Pengunjung aktif", "", fmt(l.active_visitors), "Pengunjung berbeda pada sesi aktif") + "</div>";
      h += '<div class="an-grid"><div class="card"><div class="card-h"><h2>Halaman yang sedang dibuka</h2></div>' + table(["Halaman", "Sesi aktif"], (l.by_page || []).map(function (x) { return ['<span class="an-code">' + esc(x.path) + "</span>", fmt(x.n)]; }), [1]) + '</div><div class="card"><div class="card-h"><h2>Perangkat</h2></div>' + table(["Perangkat", "Sesi aktif"], (l.by_device || []).map(function (x) { return [esc(DEV[x.device] || x.device), fmt(x.n)]; }), [1]) + "</div></div>";
      h += '<div class="card" style="margin-top:16px"><div class="card-h"><h2>Aktivitas terbaru (30 menit)</h2></div>' + table(["Waktu", "Halaman", "Perangkat", "Negara", "Sumber"], (l.recent || []).map(function (x) { return [esc(ago(x.ago_s)), '<span class="an-code">' + esc(x.path) + "</span>", esc(DEV[x.device] || x.device), esc(country(x.country)), esc(SRC[x.source_group] || x.source_group || "-")]; })) + "</div>";
      return h + defs([["Sesi aktif", "Sesi dengan aktivitas atau denyut dalam 5 menit terakhir. Denyut dikirim tiap 30 detik hanya saat halaman terlihat dan aktif."], ["Privasi", "Tanpa ID pengunjung, IP, atau identitas pribadi. Halaman privat disamarkan."], ["Beban database", "Panel ini diperbarui tiap 30 detik, berhenti bila tab disembunyikan atau ditinggalkan."]]);
    }
    LV.build = function (l) { return '<div id="an-live-body">' + liveBody(l) + '</div><p class="an-note" id="an-live-t"></p>'; };
    LV.bind = function (root, l, r, again) {
      var stamp = function () { var t = $("#an-live-t", root); if (t) t.textContent = "Terakhir diperbarui " + new Date().toLocaleTimeString("id-ID", { timeZone: "Asia/Jakarta" }) + " WIB"; }; stamp();
      var tick = function () {
        if (!d.body.contains(root)) { clearInterval(LIVE_TIMER); LIVE_TIMER = null; return; }
        if (d.hidden) return;
        LV.load().then(function (x) { var b = $("#an-live-body", root); if (b) { b.innerHTML = liveBody(x); stamp(); } }, function () { /* biarkan data terakhir */ });
      };
      LIVE_TIMER = setInterval(tick, 30000);
      var rb = $("#an-live-r", root); if (rb) rb.onclick = function () { tick(); };
    };

    var TABS = [["ringkasan", "Ringkasan", OV], ["sumber", "Sumber & UTM", SO], ["halaman", "Halaman populer", PG], ["template", "Template", TP], ["funnel", "Funnel", FN], ["audiens", "Audiens", AU], ["realtime", "Real-time", LV]];
    M.push({ key: "analytics", label: "Analytics Pengunjung", icon: "pulse", perm: "analytics", grp: "Bisnis", tabs: TABS.map(function (t) { return { key: t[0], label: t[1], render: makeTab(t[2]) }; }) });
  });
})();
