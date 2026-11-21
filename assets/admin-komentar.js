/* NusaMora Admin: Interaksi Artikel (moderasi komentar, laporan, statistik, pengaturan, penulis).
   Menumpang pada assets/admin.js lewat window.NM_ADMIN_EXT. Hak akses ditegakkan di database (backend/artikel-interaksi.sql). */
(function () {
  "use strict";
  window.NM_ADMIN_EXT = window.NM_ADMIN_EXT || [];
  window.NM_ADMIN_EXT.push(function (X) {
    var sb = X.sb, $ = X.$, esc = X.esc, toast = X.toast, fail = X.fail, empty = X.empty, skel = X.skel, errBox = X.errBox, dlgConfirm = X.dlgConfirm, can = X.can, M = X.M, d = document;
    var ST = { pending: ["Menunggu", "warn"], approved: ["Tampil", "ok"], rejected: ["Ditolak", "bad"], spam: ["Spam", "bad"] };
    var ERR = { komentar_tidak_valid: "Balasan 2–2000 karakter.", tidak_ditemukan: "Data tidak ditemukan.", nilai_tidak_valid: "Nilai tidak valid.", nama_tidak_valid: "Nama 2–80 karakter.", bio_terlalu_panjang: "Bio maksimal 600 karakter.",
      url_tidak_valid: "URL harus diawali https:// atau /.", tautan_tidak_valid: "Tautan maksimal 5; label 1–30 karakter dan URL https://.", penulis_bawaan: "Penulis bawaan tidak bisa dihapus." };
    var bdg = function (k) { var x = ST[k] || [k, ""]; return '<span class="badge ' + x[1] + '">' + esc(x[0]) + "</span>"; };
    var wib = function (s) { var x = new Date(s); return isNaN(x) ? "-" : x.toLocaleString("id-ID", { timeZone: "Asia/Jakarta", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }); };
    var call = function (fn, args) { return sb.rpc(fn, args || {}).then(function (r) { if (r.error) throw r.error; if (r.data && r.data.ok === false) { var e = new Error(ERR[r.data.error] || r.data.error); e.shown = 1; throw e; } return r.data; }); };
    var oops = function (e) { if (e && e.shown) toast(e.message, "bad"); else fail(e, "Gagal"); };
    if (!d.getElementById("ik-css")) {
      var st = d.createElement("style"); st.id = "ik-css";
      st.textContent = ".ik-tool{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:14px}.ik-tool .grow{flex:1 1 200px}.ik-c{border:1px solid var(--line,#e5e7eb);border-radius:12px;padding:12px 14px;margin-bottom:10px;background:var(--card,#fff)}" +
        ".ik-c p{margin:6px 0;white-space:pre-wrap;word-break:break-word}.ik-m{display:flex;gap:8px;flex-wrap:wrap;align-items:center;font-size:.85em;opacity:.85}.ik-a{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}.ik-set{display:grid;gap:14px;max-width:560px}.ik-set label{display:grid;gap:4px}";
      d.head.appendChild(st);
    }
    function paged(root, title, fetchPage, rowHtml, bind) {
      var f = { st: "", q: "" }, off = 0, SZ = 20, total = 0; root.innerHTML = skel();
      var show = function () {
        root.innerHTML = '<div class="ik-tool"><select id="ik-st" aria-label="Status"><option value="">Semua status</option><option value="pending">Menunggu</option><option value="approved">Tampil</option><option value="rejected">Ditolak</option><option value="spam">Spam</option></select>' +
          '<input id="ik-q" class="grow" type="search" placeholder="Cari isi komentar atau nama tamu" maxlength="80"></div><div id="ik-list"></div><div class="ik-tool"><button class="btn o sm" type="button" id="ik-pv">Sebelumnya</button><span id="ik-pg" class="sub"></span><button class="btn o sm" type="button" id="ik-nx">Berikutnya</button></div>';
        $("#ik-st").value = f.st; $("#ik-q").value = f.q;
        $("#ik-st").onchange = function () { f.st = this.value; off = 0; load(); }; var t; $("#ik-q").oninput = function () { var v = this.value; clearTimeout(t); t = setTimeout(function () { f.q = v.trim(); off = 0; load(); }, 350); };
        $("#ik-pv").onclick = function () { off = Math.max(0, off - SZ); load(); }; $("#ik-nx").onclick = function () { off += SZ; load(); };
        load();
      };
      var load = function () {
        var l = $("#ik-list"); if (l) l.setAttribute("aria-busy", "true");
        fetchPage(f, off, SZ).then(function (x) {
          total = x.total || 0; if (!$("#ik-list")) return; var items = x.items || [];
          $("#ik-list").innerHTML = items.length ? items.map(rowHtml).join("") : empty("Tidak ada komentar", "Belum ada yang cocok dengan filter ini.");
          $("#ik-list").setAttribute("aria-busy", "false"); $("#ik-pg").textContent = total ? (off + 1) + "–" + Math.min(off + SZ, total) + " dari " + total : "";
          $("#ik-pv").disabled = off === 0; $("#ik-nx").disabled = off + SZ >= total;
        }).catch(function (e) { $("#ik-list").innerHTML = errBox("Komentar tidak bisa dimuat. Pastikan backend/artikel-interaksi.sql sudah dijalankan.", 1); $("#ik-list").onclick = function (ev) { if (ev.target.closest("[data-retry]")) load(); }; });
      };
      root.onclick = function (e) { var b = e.target.closest("[data-act]"); if (b) bind(b.dataset.act, b.dataset.id, load); };
      show();
    }
    var canW = function () { return can("content", "write"); }, canD = function () { return can("content", "delete"); };
    function acts(it, resolveMode) {
      if (!canW()) return "";
      var h = '<div class="ik-a">';
      if (resolveMode) h += '<button class="btn o sm" data-act="dismiss" data-id="' + esc(it.id) + '">Biarkan tampil</button>';
      else if (it.status !== "approved") h += '<button class="btn sm" data-act="approved" data-id="' + esc(it.id) + '">Setujui</button>';
      if (it.status !== "rejected") h += '<button class="btn o sm" data-act="rejected" data-id="' + esc(it.id) + '">Tolak</button>';
      if (it.status !== "spam") h += '<button class="btn o sm" data-act="spam" data-id="' + esc(it.id) + '">Spam</button>';
      h += '<button class="btn o sm" data-act="reply" data-id="' + esc(it.id) + '">Balas sebagai Tim</button>';
      if (canD()) h += '<button class="btn o sm" data-act="delete" data-id="' + esc(it.id) + '">Hapus</button>';
      return h + "</div>";
    }
    function card(it) {
      return '<article class="ik-c"><div class="ik-m"><b>' + esc(it.name || "Pengguna") + "</b>" + (it.full_name && it.full_name !== it.name ? "<span>(" + esc(it.full_name) + ")</span>" : "") + (it.guest ? '<span class="badge">Tamu</span>' : "") + (it.team ? '<span class="badge ok">Tim</span>' : "") + bdg(it.status) +
        (it.reports ? '<span class="badge bad">' + it.reports + " laporan</span>" : "") + "<span>" + esc(wib(it.created_at)) + "</span><span>&middot; " + esc(it.likes || 0) + " suka</span></div>" +
        '<p>' + esc(it.body) + '</p><div class="ik-m"><a href="/artikel/' + encodeURIComponent(it.slug) + '#c-' + esc(it.id) + '" target="_blank" rel="noopener">' + esc(it.title) + "</a></div>" + acts(it, 0) + "</article>";
    }
    function replyDlg(id, done) {
      var dl = d.createElement("dialog"); dl.className = "wide"; dl.innerHTML = '<h2>Balas sebagai Tim NusaMora</h2><form class="nt-f" novalidate><label class="fld full">Balasan<textarea rows="5" maxlength="2000" id="ik-rb"></textarea></label><p class="sub">Komentar yang dibalas otomatis ikut ditampilkan. Pengirimnya mendapat notifikasi di akunnya.</p><div class="ik-a"><button class="btn" type="submit">Kirim balasan</button><button class="btn o" type="button" data-x>Batal</button></div></form>';
      d.body.appendChild(dl); dl.showModal(); dl.addEventListener("close", function () { dl.remove(); });
      dl.querySelector("[data-x]").onclick = function () { dl.close(); };
      dl.querySelector("form").onsubmit = function (e) { e.preventDefault(); var b = $("#ik-rb").value.trim(); call("admin_comment_reply", { p_id: id, p_body: b }).then(function () { toast("Balasan terkirim.", "ok"); dl.close(); done(); }).catch(oops); };
    }
    function act(a, id, reload, resolveMode) {
      if (a === "reply") return replyDlg(id, reload);
      if (a === "delete") return dlgConfirm("Hapus komentar ini permanen? Balasannya ikut terhapus dan tidak bisa dibatalkan.", "Hapus").then(function (y) { if (!y) return; (resolveMode ? call("admin_report_resolve", { p_comment: id, p_action: "delete" }) : call("admin_comment_delete", { p_id: id })).then(function () { toast("Komentar dihapus.", "ok"); reload(); }).catch(oops); });
      var p = resolveMode ? call("admin_report_resolve", { p_comment: id, p_action: a === "approved" ? "dismiss" : a }) : call("admin_comment_set_status", { p_id: id, p_status: a });
      p.then(function () { toast("Tersimpan.", "ok"); reload(); }).catch(oops);
    }
    function renderMod(root) {
      paged(root, "Moderasi", function (f, off, sz) { return call("admin_comments_list", { p_status: f.st || null, p_q: f.q || null, p_limit: sz, p_offset: off }); }, card, function (a, id, reload) { act(a, id, reload, false); });
    }
    function renderReports(root) {
      root.innerHTML = skel();
      var load = function () {
        call("admin_reports_list", { p_limit: 50 }).then(function (rows) {
          root.innerHTML = rows.length ? rows.map(function (r) {
            var it = { id: r.comment_id, status: r.status, name: r.name, body: r.body, title: r.title, slug: r.slug, reports: r.count, created_at: r.first_at, likes: 0 };
            return card(it).replace(/<div class="ik-a">[\s\S]*<\/div>(?=<\/article>)/, "") .replace("</article>", '<p class="sub">Alasan: ' + esc((r.reasons || []).join("; ")) + "</p>" + acts(it, 1) + "</article>");
          }).join("") : empty("Tidak ada laporan terbuka", "Komentar yang dilaporkan pembaca muncul di sini.");
        }).catch(function () { root.innerHTML = errBox("Laporan tidak bisa dimuat.", 1); root.onclick = function (ev) { if (ev.target.closest("[data-retry]")) load(); }; });
      };
      root.onclick = function (e) { var b = e.target.closest("[data-act]"); if (b) act(b.dataset.act === "dismiss" ? "approved" : b.dataset.act, b.dataset.id, load, true); };
      load();
    }
    function renderStats(root) {
      root.innerHTML = skel();
      var load = function () {
        call("admin_article_stats").then(function (rows) {
          rows.sort(function (a, b) { return (b.views || 0) - (a.views || 0); });
          root.innerHTML = '<p class="note">Urut dari yang paling banyak dibaca. "Berguna" = pembaca memilih artikel membantu.</p><div class="card tbl-w"><table class="nt-tbl"><thead><tr><th>Artikel</th><th>Dibaca</th><th>Suka</th><th>Komentar</th><th>Menunggu</th><th>Berguna / Cukup / Kurang</th><th>Komentar</th></tr></thead><tbody>' +
            rows.map(function (r) { return "<tr><td><a href=\"/artikel/" + encodeURIComponent(r.slug) + '" target="_blank" rel="noopener">' + esc(r.title) + "</a></td><td>" + r.views + "</td><td>" + r.likes + "</td><td>" + r.comments + "</td><td>" + r.pending + "</td><td>" + r.fb_helpful + " / " + r.fb_somewhat + " / " + r.fb_not + "</td><td>" +
              (canW() ? '<button class="btn o sm" data-act="flag" data-id="' + esc(r.id) + '" data-on="' + (r.comments_enabled ? 1 : 0) + '">' + (r.comments_enabled ? "Matikan" : "Aktifkan") + "</button>" : (r.comments_enabled ? "Aktif" : "Mati")) + "</td></tr>"; }).join("") + "</tbody></table></div>";
        }).catch(function () { root.innerHTML = errBox("Statistik tidak bisa dimuat.", 1); root.onclick = function (ev) { if (ev.target.closest("[data-retry]")) load(); }; });
      };
      root.onclick = function (e) { var b = e.target.closest("[data-act=flag]"); if (!b) return; call("admin_article_flag_set", { p_content: b.dataset.id, p_enabled: b.dataset.on !== "1" }).then(function () { toast("Tersimpan.", "ok"); load(); }).catch(oops); };
      load();
    }
    function renderSettings(root) {
      root.innerHTML = skel();
      call("admin_article_settings_get").then(function (s) {
        var ro = canW() ? "" : " disabled", chk = function (k, l, hint) { return '<label><span><input type="checkbox" id="ik-' + k + '"' + (s[k] === true ? " checked" : "") + ro + "> " + l + "</span>" + (hint ? '<small class="sub">' + hint + "</small>" : "") + "</label>"; };
        root.innerHTML = '<form class="ik-set" id="ik-form" novalidate>' + chk("comments_enabled", "Komentar aktif di semua artikel") + chk("guest_comments", "Izinkan komentar tanpa masuk (tamu)", "Komentar tamu selalu ditinjau dulu. Risiko spam lebih tinggi.") + chk("premoderate", "Tinjau semua komentar sebelum tampil", "Komentar pengguna masuk juga menunggu persetujuan.") +
          '<label>Maks. tautan per komentar<input type="number" id="ik-max_links" min="0" max="10" value="' + esc(s.max_links) + '"' + ro + '></label><label>Maks. panjang komentar (100–2000)<input type="number" id="ik-max_length" min="100" max="2000" value="' + esc(s.max_length) + '"' + ro + '></label>' +
          '<label>Kata terlarang (satu per baris, maks. 100)<textarea id="ik-blocked_words" rows="5"' + ro + ">" + esc((s.blocked_words || []).join("\n")) + "</textarea><small class=\"sub\">Komentar yang memuat kata ini masuk antrean tinjauan.</small></label>" + (canW() ? '<div><button class="btn" type="submit">Simpan pengaturan</button></div>' : "") + "</form>";
        if (!canW()) return;
        $("#ik-form").onsubmit = function (e) {
          e.preventDefault();
          var v = { comments_enabled: $("#ik-comments_enabled").checked, guest_comments: $("#ik-guest_comments").checked, premoderate: $("#ik-premoderate").checked, max_links: Number($("#ik-max_links").value), max_length: Number($("#ik-max_length").value),
            blocked_words: $("#ik-blocked_words").value.split("\n").map(function (x) { return x.trim(); }).filter(Boolean) };
          Promise.all(Object.keys(v).map(function (k) { return call("admin_article_settings_set", { p_key: k, p_value: v[k] }); })).then(function () { toast("Pengaturan tersimpan.", "ok"); }).catch(oops);
        };
      }).catch(function () { root.innerHTML = errBox("Pengaturan tidak bisa dimuat.", 1); root.onclick = function (ev) { if (ev.target.closest("[data-retry]")) renderSettings(root); }; });
    }
    function renderAuthors(root) {
      root.innerHTML = skel(); var rows = [];
      var load = function () {
        call("admin_author_list").then(function (r) {
          rows = r; root.innerHTML = (canW() ? '<div class="ik-tool"><button class="btn" id="ik-an" type="button">Tambah penulis</button></div>' : "") +
            (rows.length ? rows.map(function (a) { return '<article class="ik-c"><div class="ik-m"><b>' + esc(a.name) + "</b>" + (a.is_default ? '<span class="badge ok">Bawaan</span>' : "") + "</div><p>" + esc(a.bio || "") + "</p>" + (canW() ? '<div class="ik-a"><button class="btn o sm" data-act="edit" data-id="' + esc(a.id) + '">Ubah</button>' + (canD() && !a.is_default ? '<button class="btn o sm" data-act="del" data-id="' + esc(a.id) + '">Hapus</button>' : "") + "</div>" : "") + "</article>"; }).join("") : empty("Belum ada penulis", ""));
          if ($("#ik-an")) $("#ik-an").onclick = function () { edit(null); };
        }).catch(function () { root.innerHTML = errBox("Penulis tidak bisa dimuat.", 1); root.onclick = function (ev) { if (ev.target.closest("[data-retry]")) load(); }; });
      };
      function edit(a) {
        a = a || { name: "", bio: "", avatar_url: "", links: [], is_default: false };
        var dl = d.createElement("dialog"); dl.className = "wide";
        dl.innerHTML = "<h2>" + (a.id ? "Ubah" : "Tambah") + ' penulis</h2><form class="nt-f" novalidate><label class="fld full">Nama<input id="au-n" maxlength="80" value="' + esc(a.name) + '"></label><label class="fld full">Bio (maks. 600)<textarea id="au-b" rows="3" maxlength="600">' + esc(a.bio || "") + '</textarea></label><label class="fld full">URL foto (https:// atau /…)<input id="au-a" maxlength="300" value="' + esc(a.avatar_url || "") + '"></label>' +
          '<label class="fld full">Tautan (satu per baris: Label | https://…, maks. 5)<textarea id="au-l" rows="3">' + esc((a.links || []).map(function (l) { return l.label + " | " + l.url; }).join("\n")) + '</textarea></label><label><input type="checkbox" id="au-d"' + (a.is_default ? " checked" : "") + '> Jadikan penulis bawaan artikel</label><div class="ik-a"><button class="btn" type="submit">Simpan</button><button class="btn o" type="button" data-x>Batal</button></div></form>';
        d.body.appendChild(dl); dl.showModal(); dl.addEventListener("close", function () { dl.remove(); }); dl.querySelector("[data-x]").onclick = function () { dl.close(); };
        dl.querySelector("form").onsubmit = function (e) {
          e.preventDefault();
          var links = $("#au-l").value.split("\n").map(function (x) { return x.trim(); }).filter(Boolean).map(function (x) { var p = x.split("|"); return { label: (p[0] || "").trim(), url: (p.slice(1).join("|") || "").trim() }; });
          call("admin_author_save", { p_id: a.id || null, p_name: $("#au-n").value.trim(), p_bio: $("#au-b").value.trim(), p_avatar: $("#au-a").value.trim(), p_links: links, p_default: $("#au-d").checked }).then(function () { toast("Penulis tersimpan.", "ok"); dl.close(); load(); }).catch(oops);
        };
      }
      root.onclick = function (e) {
        var b = e.target.closest("[data-act]"); if (!b) return; var a = rows.filter(function (x) { return x.id === b.dataset.id; })[0]; if (!a) return;
        if (b.dataset.act === "edit") edit(a);
        else dlgConfirm("Hapus penulis \"" + a.name + "\"? Artikelnya kembali memakai penulis bawaan.", "Hapus").then(function (y) { if (y) call("admin_author_delete", { p_id: a.id }).then(function () { toast("Penulis dihapus.", "ok"); load(); }).catch(oops); });
      };
      load();
    }
    M.push({ key: "article-interaction", label: "Interaksi Artikel", icon: "users", perm: "content", grp: "Komunikasi", tabs: [
      { key: "mod", label: "Moderasi Komentar", render: renderMod }, { key: "rep", label: "Laporan", render: renderReports }, { key: "stat", label: "Statistik", render: renderStats },
      { key: "set", label: "Pengaturan", render: renderSettings }, { key: "au", label: "Penulis", render: renderAuthors }] });
  });
})();
