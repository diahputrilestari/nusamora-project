/* NusaMora Admin: Manajemen Konten (menumpang pada assets/admin.js lewat window.NM_ADMIN_EXT) */
(function () {
  "use strict";
  window.NM_ADMIN_EXT = window.NM_ADMIN_EXT || [];
  window.NM_ADMIN_EXT.push(function (X) {
    var sb = X.sb, $ = X.$, esc = X.esc, toast = X.toast, fail = X.fail, badge = X.badge, empty = X.empty, skel = X.skel, errBox = X.errBox, dlgConfirm = X.dlgConfirm, can = X.can, M = X.M, d = document;
    var BUCKET = "site-assets", MAXB = 3145728, OK_MIME = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    var T = {
      article: { label: "Artikel / Blog", one: "artikel", slug: true, excerpt: true, cover: true, seo: true, path: "artikel", tl: "Judul" },
      page: { label: "Halaman Informasi", one: "halaman", slug: true, seo: true, path: "info", tl: "Judul" },
      faq: { label: "FAQ", one: "FAQ", path: "bantuan", tl: "Pertanyaan", bl: "Jawaban" },
      tutorial: { label: "Tutorial", one: "tutorial", path: "tutorial", tl: "Judul", bl: "Isi tutorial" },
      banner: { label: "Banner", one: "banner", banner: true, tl: "Judul (teks alternatif)" }
    };
    var FLD = { title: "Judul", slug: "Slug", lang: "Bahasa", translation_of: "Terjemahan dari", excerpt: "Ringkasan", body: "Isi", image_url: "Gambar", link_url: "Tautan", seo_title: "SEO title", seo_description: "Meta description", canonical_url: "Canonical", og_image_url: "Gambar OG", noindex: "Noindex", status: "Status", publish_at: "Mulai tayang", unpublish_at: "Akhir tayang", sort: "Urutan" };
    var ERR = {
      slug_wajib: "Slug wajib diisi.", slug_tidak_valid: "Slug hanya huruf kecil, angka, dan tanda hubung (maks. 80).", slug_dicadangkan: "Slug ini dicadangkan sistem. Pilih yang lain.", slug_dipakai: "Slug sudah dipakai konten lain pada jenis dan bahasa yang sama.",
      judul_tidak_valid: "Judul 2 sampai 200 karakter.", bahasa_tidak_valid: "Bahasa tidak valid.", status_tidak_valid: "Status tidak valid.", isi_terlalu_panjang: "Isi terlalu panjang (maks. 100.000 karakter).", ringkasan_terlalu_panjang: "Ringkasan maksimal 300 karakter.",
      seo_title_terlalu_panjang: "SEO title maksimal 70 karakter.", seo_deskripsi_terlalu_panjang: "Meta description maksimal 170 karakter.", url_tidak_valid: "URL harus diawali https:// (tautan boleh juga diawali /).", jadwal_tidak_valid: "Akhir tayang harus setelah mulai tayang.",
      konten_belum_lengkap: "Konten belum lengkap untuk diterbitkan (isi/gambar kosong).", terjemahan_tidak_valid: "Terjemahan harus merujuk konten berjenis sama, bahasa berbeda, yang bukan terjemahan.", terjemahan_sudah_ada: "Konten sumber sudah punya terjemahan di bahasa ini.",
      jenis_tidak_dapat_diubah: "Jenis konten tidak bisa diubah.", tidak_ditemukan: "Konten tidak ditemukan.", revisi_tidak_ditemukan: "Revisi tidak ditemukan.", arsipkan_dulu: "Konten yang tayang harus diarsipkan dulu sebelum dihapus.", data_tidak_valid: "Isian tidak valid.",
      path_tidak_valid: "Nama berkas tidak valid.", berkas_tidak_ditemukan: "Berkas belum terunggah.", tipe_tidak_didukung: "Hanya JPG, PNG, WebP, atau GIF.", berkas_terlalu_besar: "Ukuran berkas maksimal 3 MB.", media_dipakai: "Media masih dipakai konten. Lepaskan dulu.", alt_terlalu_panjang: "Teks alternatif maksimal 200 karakter."
    };
    var errText = function (c) { return ERR[c] || ("Gagal: " + c); };
    var wib = function (s, t) { if (!s) return "-"; var x = new Date(s); return isNaN(x) ? "-" : x.toLocaleString("id-ID", t ? { timeZone: "Asia/Jakarta", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" } : { timeZone: "Asia/Jakarta", day: "numeric", month: "short", year: "numeric" }); };
    var toIn = function (iso) { return iso ? new Date(iso).toLocaleString("sv-SE", { timeZone: "Asia/Jakarta" }).slice(0, 16).replace(" ", "T") : ""; };
    var fromIn = function (v) { if (!v) return null; var x = new Date(v + ":00+07:00"); return isNaN(x) ? null : x.toISOString(); };
    var pubUrl = function (path) { try { var r = sb.storage.from(BUCKET).getPublicUrl(path); return r && r.data && r.data.publicUrl || ""; } catch (e) { return ""; } };
    var kb = function (b) { return b >= 1048576 ? (Math.round(b / 104857.6) / 10) + " MB" : Math.max(1, Math.round(b / 1024)) + " KB"; };
    var slugify = function (s) { return String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80); };
    function state(r) { var n = Date.now(); if (r.status === "archived") return ["nonaktif", "Arsip"]; if (r.status === "draft") return ["draft", "Draft"]; if (r.publish_at && new Date(r.publish_at) > n) return ["menunggu", "Terjadwal"]; if (r.unpublish_at && new Date(r.unpublish_at) <= n) return ["selesai", "Berakhir"]; return ["aktif", "Tayang"]; }
    var stBadge = function (r) { var s = state(r); return badge(s[0]).replace(/>[^<]*</, ">" + esc(s[1]) + "<"); };

    if (!d.getElementById("ct-css")) {
      var st = d.createElement("style"); st.id = "ct-css";
      st.textContent = "#view #body{grid-template-columns:minmax(0,1fr)}#view #body>*{min-width:0}.ct-tool{display:flex;gap:12px;align-items:flex-end;flex-wrap:wrap;margin-bottom:16px}.ct-tool .grow{flex:1 1 200px;min-width:0}.ct-f{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(220px,1fr))}.ct-f .full{grid-column:1/-1}.ct-e{color:var(--bad,#b3261e);min-height:1.2em}dialog.ct-d{max-width:860px;width:calc(100% - 32px)}.ct-cnt{font-size:.8rem;opacity:.7}.ct-cnt.over{color:var(--bad,#b3261e);opacity:1}.ct-serp{border:1px solid currentColor;border-color:rgba(128,128,128,.35);border-radius:10px;padding:12px;background:var(--white,#fff);color:#202124}.ct-serp b{display:block;color:#1a0dab;font-weight:400;font-size:1.1rem}.ct-serp i{display:block;color:#188038;font-style:normal;font-size:.85rem}.ct-serp span{font-size:.9rem;color:#4d5156}.ct-cv{display:flex;gap:12px;align-items:center}.ct-cv img{width:96px;height:64px;object-fit:cover;border-radius:8px;background:rgba(128,128,128,.2)}.ct-rv{max-height:220px;overflow:auto}.ct-mg{display:grid;gap:14px;grid-template-columns:repeat(auto-fill,minmax(210px,1fr))}.ct-mc{display:flex;flex-direction:column;gap:8px;padding:12px}.ct-mc img{width:100%;height:130px;object-fit:cover;border-radius:8px;background:rgba(128,128,128,.2)}.ct-mc small{opacity:.75}.ct-pick{cursor:pointer}.ct-fieldset{border:1px solid rgba(128,128,128,.3);border-radius:10px;padding:12px;margin:0}.ct-fieldset legend{font-weight:600;padding:0 6px}";
      d.head.appendChild(st);
    }
    function dialog(id) { var dl = $("#" + id); if (dl) dl.remove(); dl = d.createElement("dialog"); dl.id = id; dl.className = "wide ct-d"; dl.setAttribute("aria-labelledby", id + "-t"); d.body.appendChild(dl); return dl; }
    var xBtn = '<button class="icon-btn x" type="button" data-close aria-label="Tutup"><svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button>';
    var mediaList = function () { return sb.rpc("admin_media_list").then(function (r) { if (r.error) throw r.error; return r.data || []; }); };

    /* ---------- unggah media ---------- */
    function imgDims(file) { return new Promise(function (res) { var u = URL.createObjectURL(file), im = new Image(); im.onload = function () { URL.revokeObjectURL(u); res([im.naturalWidth, im.naturalHeight]); }; im.onerror = function () { URL.revokeObjectURL(u); res([null, null]); }; im.src = u; }); }
    function uploadOne(file) {
      if (OK_MIME.indexOf(file.type) < 0) return Promise.resolve({ error: file.name + ": hanya JPG, PNG, WebP, atau GIF." });
      if (file.size > MAXB) return Promise.resolve({ error: file.name + ": maksimal 3 MB." });
      var ext = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" }[file.type], path = "media/" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8) + "." + ext;
      return imgDims(file).then(function (wh) {
        return sb.storage.from(BUCKET).upload(path, file, { contentType: file.type, upsert: false }).then(function (u) {
          if (u.error) return { error: file.name + ": gagal mengunggah." };
          return sb.rpc("admin_media_register", { p_path: path, p_alt: null, p_width: wh[0], p_height: wh[1] }).then(function (r) {
            if (r.error) return { error: file.name + ": " + (r.error.message || "gagal") };
            if (!r.data || !r.data.ok) { sb.storage.from(BUCKET).remove([path]); return { error: file.name + ": " + errText(r.data && r.data.error) }; }
            return { path: path };
          });
        });
      });
    }
    function uploadMany(files, done) { var list = Array.prototype.slice.call(files), bad = [], seq = Promise.resolve(), okN = 0; list.forEach(function (f) { seq = seq.then(function () { return uploadOne(f).then(function (r) { if (r.error) bad.push(r.error); else okN++; }); }); }); seq.then(function () { if (okN) toast(okN + " gambar diunggah.", "ok"); if (bad.length) toast(bad.join(" "), "bad"); done(); }); }

    function pickMedia() {
      return new Promise(function (resolve) {
        var dl = dialog("ct-pick"), done = false, fin = function (v) { if (done) return; done = true; if (dl.open) dl.close(); resolve(v); };
        dl.innerHTML = xBtn + '<h2 id="ct-pick-t">Pilih gambar</h2><div class="ct-tool"><label class="fld grow">Cari<input id="mp-q" placeholder="Nama berkas atau teks alternatif"></label>' + (can("content", "write") ? '<label class="btn o" for="mp-up">Unggah gambar</label><input id="mp-up" type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple hidden>' : "") + '</div><div id="mp-g" class="ct-mg">' + skel() + "</div>";
        dl.showModal(); dl.onclose = function () { fin(null); }; dl.onclick = function (e) { if (e.target.closest("[data-close]")) fin(null); };
        var all = [];
        var draw = function () { var q = $("#mp-q").value.trim().toLowerCase(), rows = all.filter(function (m) { return !q || m.path.toLowerCase().indexOf(q) > -1 || (m.alt || "").toLowerCase().indexOf(q) > -1; });
          $("#mp-g").innerHTML = rows.length ? rows.map(function (m, i) { return '<button type="button" class="card ct-mc ct-pick" data-i="' + all.indexOf(m) + '"><img src="' + esc(pubUrl(m.path)) + '" alt="' + esc(m.alt || "") + '" loading="lazy"><b>' + esc(m.path.replace("media/", "")) + "</b><small>" + esc(m.alt || "Tanpa teks alternatif") + "</small></button>"; }).join("") : empty("Belum ada gambar", "Unggah gambar pertama Anda."); };
        var load = function () { mediaList().then(function (l) { all = l; draw(); }).catch(function () { $("#mp-g").innerHTML = errBox("Media tidak bisa dimuat.", 0); }); };
        $("#mp-q").oninput = draw; $("#mp-g").onclick = function (e) { var b = e.target.closest("[data-i]"); if (b) fin(all[Number(b.dataset.i)]); };
        if ($("#mp-up")) $("#mp-up").onchange = function (e) { uploadMany(e.target.files, load); };
        load();
      });
    }

    /* ---------- daftar per jenis ---------- */
    function renderType(type) {
      return function (root) {
        var cfg = T[type], canW = can("content", "write"), rows = [], f = { q: "", st: "", lang: "" }; root.innerHTML = skel();
        var load = function () {
          return sb.from("contents").select("id,type,title,slug,lang,status,publish_at,unpublish_at,updated_at,sort,translation_of,image_url,published_at").eq("type", type).order("updated_at", { ascending: false }).limit(500).then(function (r) {
            if (r.error) throw r.error; rows = r.data || [];
          });
        };
        var draw = function () {
          var vis = rows.filter(function (r) { return (!f.q || (r.title + " " + (r.slug || "")).toLowerCase().indexOf(f.q) > -1) && (!f.lang || r.lang === f.lang) && (!f.st || state(r)[1] === f.st); });
          $("#ct-rows").innerHTML = vis.length ? '<div class="card tbl-w"><table><thead><tr><th>' + esc(cfg.tl) + "</th>" + (cfg.slug ? "<th>Slug</th>" : "") + "<th>Bahasa</th><th>Status</th><th>Jadwal (WIB)</th><th>Diubah</th><th></th></tr></thead><tbody>" + vis.map(function (r) {
            return "<tr><td><b>" + esc(r.title) + "</b></td>" + (cfg.slug ? "<td><code>" + esc(r.slug || "-") + "</code></td>" : "") + "<td>" + esc(r.lang.toUpperCase()) + (r.translation_of ? ' <span class="cell-s">terjemahan</span>' : "") + "</td><td>" + stBadge(r) + "</td><td>" + (r.publish_at ? wib(r.publish_at, 1) : "-") + (r.unpublish_at ? ' <span class="cell-s">s/d ' + wib(r.unpublish_at, 1) + "</span>" : "") + "</td><td>" + wib(r.updated_at) + '</td><td class="nowrap"><button class="btn o sm" type="button" data-ed="' + esc(r.id) + '">' + (canW ? "Ubah" : "Lihat") + '</button> <a class="btn o sm" target="_blank" rel="noopener" href="/konten?preview=' + esc(r.id) + '">Pratinjau</a></td></tr>';
          }).join("") + "</tbody></table></div>" : '<div class="card">' + empty("Belum ada " + cfg.one, rows.length ? "Tidak ada yang cocok dengan filter." : "Tambahkan " + cfg.one + " pertama.") + "</div>";
        };
        var show = function () {
          root.innerHTML = '<div class="ct-tool"><label class="fld grow">Cari<input id="ct-q" placeholder="Judul atau slug"></label><label class="fld">Status<select id="ct-st"><option value="">Semua</option><option>Draft</option><option>Terjadwal</option><option>Tayang</option><option>Berakhir</option><option>Arsip</option></select></label><label class="fld">Bahasa<select id="ct-lg"><option value="">Semua</option><option value="id">Indonesia</option><option value="en">English</option></select></label>' +
            (cfg.slug ? '<button class="btn o" type="button" id="ct-sm">Unduh sitemap.xml</button>' : "") + (canW ? '<button class="btn" type="button" id="ct-new">Tambah ' + esc(cfg.one) + "</button>" : "") + '</div><div id="ct-rows"></div>';
          $("#ct-q").oninput = function (e) { f.q = e.target.value.trim().toLowerCase(); draw(); }; $("#ct-st").onchange = function (e) { f.st = e.target.value; draw(); }; $("#ct-lg").onchange = function (e) { f.lang = e.target.value; draw(); };
          if (canW) $("#ct-new").onclick = function () { openEditor(type, null, rows, again); };
          if ($("#ct-sm")) $("#ct-sm").onclick = sitemap;
          $("#ct-rows").onclick = function (e) { var b = e.target.closest("[data-ed]"); if (b) openEditor(type, b.dataset.ed, rows, again); };
          draw();
        };
        var again = function () { load().then(show).catch(onErr); };
        var onErr = function (e) { root.innerHTML = errBox(e && e.code === "42501" ? "Anda tidak punya izin melihat konten." : "Konten tidak bisa dimuat. Pastikan backend/admin-content.sql sudah dijalankan.", 1); root.onclick = function (ev) { if (ev.target.closest("[data-retry]")) again(); }; };
        again();
      };
    }
    function sitemap() {
      sb.rpc("public_sitemap").then(function (r) {
        if (r.error) return fail(r.error, "Gagal");
        var o = location.origin, u = [{ loc: o + "/", p: "1.0" }, { loc: o + "/artikel", p: "0.7" }, { loc: o + "/bantuan", p: "0.5" }, { loc: o + "/tutorial", p: "0.5" }];
        (r.data || []).forEach(function (x) { u.push({ loc: o + "/" + (x.type === "article" ? "artikel" : "info") + "/" + x.slug + (x.lang === "en" ? "?lang=en" : ""), m: x.updated_at && x.updated_at.slice(0, 10), p: "0.6" }); });
        var xe = function (s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;"); };
        var xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' + u.map(function (x) { return "<url><loc>" + xe(x.loc) + "</loc>" + (x.m ? "<lastmod>" + x.m + "</lastmod>" : "") + "<priority>" + x.p + "</priority></url>"; }).join("\n") + "</urlset>";
        var a = d.createElement("a"); a.href = URL.createObjectURL(new Blob([xml], { type: "application/xml" })); a.download = "sitemap.xml"; d.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 800);
        toast("sitemap.xml berisi " + u.length + " URL. Unggah ke folder utama situs untuk menggantinya.", "ok");
      });
    }

    /* ---------- editor ---------- */
    function openEditor(type, id, rows, reload) {
      var cfg = T[type], canW = can("content", "write"), dl = dialog("ct-edit"), cur = null;
      dl.innerHTML = xBtn + '<h2 id="ct-edit-t">' + (id ? (canW ? "Ubah " : "Lihat ") : "Tambah ") + esc(cfg.one) + "</h2><div id=\"ct-body\">" + skel() + "</div>";
      dl.showModal(); dl.onclick = function (e) { if (e.target.closest("[data-close]")) dl.close(); };
      var go = function (c) { cur = c; build(); };
      if (id) sb.from("contents").select("*").eq("id", id).maybeSingle().then(function (r) { if (r.error || !r.data) { $("#ct-body").innerHTML = errBox("Konten tidak bisa dimuat.", 0); return; } go(r.data); });
      else go({ type: type, title: "", slug: "", lang: "id", status: "draft", sort: 0, noindex: false });
      function build() {
        var c = cur, ro = !canW ? " disabled" : "", srcOpts = rows.filter(function (r) { return r.lang === "id" && !r.translation_of && r.id !== c.id; });
        var h = '<form id="ct-f" class="ct-f" novalidate>' +
          '<label class="fld full">' + esc(cfg.tl) + '<input id="c-title" maxlength="200" value="' + esc(c.title) + '"' + ro + "></label>" +
          (cfg.slug ? '<label class="fld">Slug (alamat)<input id="c-slug" maxlength="80" value="' + esc(c.slug || "") + '"' + ro + '><small class="cell-s">/' + cfg.path + '/<span id="c-slug-v">' + esc(c.slug || "…") + "</span></small></label>" : "") +
          '<label class="fld">Bahasa<select id="c-lang"' + ro + '><option value="id"' + (c.lang === "id" ? " selected" : "") + '>Indonesia</option><option value="en"' + (c.lang === "en" ? " selected" : "") + ">English</option></select></label>" +
          (type !== "banner" ? '<label class="fld">Terjemahan dari<select id="c-tr"' + ro + '><option value="">(bukan terjemahan)</option>' + srcOpts.map(function (r) { return '<option value="' + esc(r.id) + '"' + (c.translation_of === r.id ? " selected" : "") + ">" + esc(r.title) + "</option>"; }).join("") + "</select><small class=\"cell-s\">Hanya untuk versi English dari konten Indonesia.</small></label>" : "");
        if (cfg.excerpt) h += '<label class="fld full">Ringkasan<textarea id="c-ex" rows="2" maxlength="300"' + ro + ">" + esc(c.excerpt || "") + "</textarea></label>";
        if (cfg.cover || cfg.banner) h += '<div class="fld full"><span>' + (cfg.banner ? "Gambar banner" : "Gambar sampul") + '</span><div class="ct-cv"><img id="c-img-p" alt="" src="' + esc(c.image_url || "") + '"' + (c.image_url ? "" : " hidden") + '><input id="c-img" type="hidden" value="' + esc(c.image_url || "") + '">' + (canW ? '<button class="btn o sm" type="button" id="c-img-b">Pilih gambar</button><button class="btn o sm" type="button" id="c-img-x">Hapus</button>' : "") + "</div></div>";
        if (cfg.banner) h += '<label class="fld full">Tautan saat diklik<input id="c-link" maxlength="500" placeholder="https://… atau /paket" value="' + esc(c.link_url || "") + '"' + ro + "></label>";
        else h += '<div class="fld full"><label for="c-body">' + esc(cfg.bl || "Isi") + "</label>" + (canW ? '<div><button class="btn o sm" type="button" id="c-ins">Sisipkan gambar</button></div>' : "") + '<textarea id="c-body" rows="' + (cfg.slug ? 14 : 8) + '" maxlength="100000"' + ro + ">" + esc(c.body || "") + '</textarea><small class="cell-s">Format: <code># Judul</code>, <code>- daftar</code>, <code>**tebal**</code>, <code>[teks](https://…)</code>. HTML tidak dijalankan.</small></div>';
        if (cfg.seo) h += '<fieldset class="ct-fieldset full"><legend>SEO &amp; berbagi</legend><div class="ct-f">' +
          '<label class="fld full">SEO title <span class="ct-cnt" id="c-st-n"></span><input id="c-st" maxlength="70" value="' + esc(c.seo_title || "") + '"' + ro + "></label>" +
          '<label class="fld full">Meta description <span class="ct-cnt" id="c-sd-n"></span><textarea id="c-sd" rows="2" maxlength="170"' + ro + ">" + esc(c.seo_description || "") + "</textarea></label>" +
          '<label class="fld full">Canonical URL (opsional)<input id="c-can" maxlength="500" placeholder="https://nusamora.com/…" value="' + esc(c.canonical_url || "") + '"' + ro + "></label>" +
          '<div class="fld full"><span>Gambar berbagi (Open Graph)</span><div class="ct-cv"><img id="c-og-p" alt="" src="' + esc(c.og_image_url || "") + '"' + (c.og_image_url ? "" : " hidden") + '><input id="c-og" type="hidden" value="' + esc(c.og_image_url || "") + '">' + (canW ? '<button class="btn o sm" type="button" id="c-og-b">Pilih gambar</button><button class="btn o sm" type="button" id="c-og-x">Hapus</button>' : "") + "</div></div>" +
          '<label class="chk-l full"><input type="checkbox" id="c-ni"' + (c.noindex ? " checked" : "") + ro + "> Jangan diindeks mesin pencari (noindex)</label>" +
          '<div class="full"><span class="cell-s">Pratinjau hasil pencarian</span><div class="ct-serp" id="c-serp" aria-live="polite"></div></div></div></fieldset>';
        h += '<fieldset class="ct-fieldset full"><legend>Penerbitan</legend><div class="ct-f"><label class="fld">Status<select id="c-status"' + ro + '><option value="draft"' + (c.status === "draft" ? " selected" : "") + '>Draft</option><option value="published"' + (c.status === "published" ? " selected" : "") + '>Terbit</option><option value="archived"' + (c.status === "archived" ? " selected" : "") + ">Arsip</option></select></label>" +
          '<label class="fld">Urutan<input id="c-sort" type="number" step="1" value="' + (c.sort || 0) + '"' + ro + "></label>" +
          '<label class="fld">Mulai tayang (WIB)<input id="c-pa" type="datetime-local" value="' + toIn(c.publish_at) + '"' + ro + '></label><label class="fld">Akhir tayang (WIB, opsional)<input id="c-ua" type="datetime-local" value="' + toIn(c.unpublish_at) + '"' + ro + '></label><div class="full cell-s" id="c-hint" aria-live="polite"></div></div></fieldset>';
        if (canW) h += '<label class="fld full">Catatan perubahan (masuk riwayat revisi)<input id="c-note" maxlength="200"></label>';
        h += '<div class="full ct-e" id="c-err" role="alert"></div><div class="full row-end">' + (id && canW && c.status !== "published" ? '<button class="btn o" type="button" id="c-del">Hapus</button>' : "") + '<button class="btn o" type="button" data-close>' + (canW ? "Batal" : "Tutup") + "</button>" + (canW ? '<button class="btn" type="submit" id="c-save">Simpan</button>' : "") + "</div></form>" +
          (id ? '<div class="card" style="margin-top:16px"><div class="card-h"><h3>Riwayat revisi</h3></div><div class="ct-rv" id="c-rev">' + skel() + "</div></div>" : "");
        $("#ct-body").innerHTML = h; wire(); if (id) revisions();
      }
      function val(i) { var e = $("#" + i); return e ? e.value : ""; }
      function wire() {
        var c = cur, slugTouched = !!c.slug;
        var upd = function () {
          if ($("#c-slug-v")) $("#c-slug-v").textContent = val("c-slug") || "…";
          if ($("#c-st")) { var a = val("c-st").length, b = val("c-sd").length; $("#c-st-n").textContent = a + "/60"; $("#c-st-n").className = "ct-cnt" + (a > 60 ? " over" : ""); $("#c-sd-n").textContent = b + "/160"; $("#c-sd-n").className = "ct-cnt" + (b > 160 ? " over" : "");
            $("#c-serp").innerHTML = "<b>" + esc((val("c-st") || val("c-title") || "Judul halaman") + " | NusaMora") + "</b><i>" + esc(location.origin.replace(/^https?:\/\//, "") + "/" + cfg.path + "/" + (val("c-slug") || "…")) + "</i><span>" + esc(val("c-sd") || val("c-ex") || "Tambahkan meta description agar hasil pencarian lebih menarik.") + "</span>"; }
          var pa = fromIn(val("c-pa")), ua = fromIn(val("c-ua")), s = val("c-status"), hint = "";
          if (s === "published") hint = pa && new Date(pa) > Date.now() ? "Akan tayang otomatis pada " + wib(pa, 1) + " WIB." : ua && new Date(ua) <= Date.now() ? "Masa tayang sudah lewat: tidak tampil di publik." : "Tayang sekarang di publik" + (ua ? " sampai " + wib(ua, 1) + " WIB" : "") + "."; else hint = s === "draft" ? "Draft tidak tampil di publik. Gunakan Pratinjau untuk melihatnya." : "Arsip tidak tampil di publik.";
          $("#c-hint").textContent = hint;
        };
        d.getElementById("ct-f").addEventListener("input", function (e) { if (e.target.id === "c-slug") slugTouched = true; if (e.target.id === "c-title" && cfg.slug && !slugTouched && !id) $("#c-slug").value = slugify(e.target.value); upd(); });
        d.getElementById("ct-f").addEventListener("change", upd); upd();
        var setImg = function (inp, prev, m) { var u = m ? pubUrl(m.path) : ""; $("#" + inp).value = u; $("#" + prev).src = u; $("#" + prev).hidden = !u; };
        [["c-img", "c-img-p"], ["c-og", "c-og-p"]].forEach(function (p) { var b = $("#" + p[0] + "-b"), x = $("#" + p[0] + "-x"); if (b) b.onclick = function () { pickMedia().then(function (m) { if (m) setImg(p[0], p[1], m); }); }; if (x) x.onclick = function () { setImg(p[0], p[1], null); }; });
        if ($("#c-ins")) $("#c-ins").onclick = function () { pickMedia().then(function (m) { if (!m) return; var t = $("#c-body"), s = t.selectionStart || t.value.length, ins = "\n\n![" + (m.alt || "") + "](" + pubUrl(m.path) + ")\n\n"; t.value = t.value.slice(0, s) + ins + t.value.slice(s); t.focus(); }); };
        if ($("#c-del")) $("#c-del").onclick = function () { dlgConfirm("Hapus permanen \"" + c.title + "\"? Riwayat revisinya ikut terhapus dan tidak bisa dibatalkan.", "Hapus").then(function (y) { if (!y) return; sb.rpc("admin_content_delete", { p_id: c.id }).then(function (r) { if (r.error) return fail(r.error, "Gagal"); if (!r.data.ok) { $("#c-err").textContent = errText(r.data.error); return; } dl.close(); toast("Konten dihapus.", "ok"); reload(); }); }); };
        $("#ct-f").onsubmit = function (e) {
          e.preventDefault(); if (!canW) return; var er = $("#c-err"); er.textContent = "";
          var data = { title: val("c-title").trim(), lang: val("c-lang"), status: val("c-status"), sort: Number(val("c-sort") || 0), publish_at: fromIn(val("c-pa")), unpublish_at: fromIn(val("c-ua")) };
          if (val("c-pa") && !data.publish_at || val("c-ua") && !data.unpublish_at) { er.textContent = "Tanggal tidak valid."; return; }
          if (cfg.slug) data.slug = val("c-slug").trim(); if (cfg.excerpt) data.excerpt = val("c-ex").trim();
          if (cfg.cover || cfg.banner) data.image_url = val("c-img"); if (cfg.banner) data.link_url = val("c-link").trim(); else data.body = val("c-body");
          if (type !== "banner") data.translation_of = val("c-tr") || null;
          if (cfg.seo) { data.seo_title = val("c-st").trim(); data.seo_description = val("c-sd").trim(); data.canonical_url = val("c-can").trim(); data.og_image_url = val("c-og"); data.noindex = $("#c-ni").checked; }
          var b = $("#c-save"); b.disabled = true;
          sb.rpc("admin_content_save", { p_id: id || null, p_type: type, p_data: data, p_note: val("c-note").trim() || null }).then(function (r) {
            b.disabled = false; if (r.error) { fail(r.error, "Gagal menyimpan"); return; } if (!r.data || !r.data.ok) { er.textContent = errText(r.data && r.data.error); return; }
            dl.close(); toast("Tersimpan.", "ok"); reload();
          });
        };
      }
      function revisions() {
        sb.rpc("admin_content_revisions", { p_id: id }).then(function (r) {
          var box = $("#c-rev"); if (!box) return; if (r.error) { box.innerHTML = errBox("Riwayat tidak bisa dimuat.", 0); return; }
          var list = r.data || [];
          box.innerHTML = list.length ? '<table><thead><tr><th>Versi</th><th>Waktu (WIB)</th><th>Oleh</th><th>Perubahan</th><th>Catatan</th>' + (canW ? "<th></th>" : "") + "</tr></thead><tbody>" + list.map(function (v, i) {
            return "<tr><td>v" + v.version + "</td><td>" + wib(v.at, 1) + "</td><td>" + esc(v.actor_name || "-") + "</td><td>" + esc((v.changed || []).map(function (k) { return FLD[k] || k; }).join(", ")) + "</td><td>" + esc(v.note || "-") + "</td>" + (canW ? '<td>' + (i === 0 ? '<span class="cell-s">Saat ini</span>' : '<button class="btn o sm" type="button" data-rv="' + v.version + '">Pulihkan</button>') + "</td>" : "") + "</tr>";
          }).join("") + "</tbody></table>" : empty("Belum ada revisi", "");
          box.onclick = function (e) { var b = e.target.closest("[data-rv]"); if (!b) return; var n = Number(b.dataset.rv);
            dlgConfirm("Pulihkan isi dari versi " + n + "? Hasilnya disimpan sebagai draft (tidak langsung tayang) dan versi sekarang tetap ada di riwayat.", "Pulihkan").then(function (y) { if (!y) return; sb.rpc("admin_content_restore", { p_id: id, p_version: n }).then(function (x) { if (x.error) return fail(x.error, "Gagal"); if (!x.data.ok) { $("#c-err").textContent = errText(x.data.error); return; } toast("Dipulihkan sebagai draft.", "ok"); dl.close(); reload(); }); }); };
        });
      }
    }

    /* ---------- media ---------- */
    function renderMedia(root) {
      var canW = can("content", "write"); root.innerHTML = skel();
      var load = function () {
        mediaList().then(function (list) {
          root.innerHTML = '<p class="note">Gambar untuk sampul, banner, dan isi konten. Hanya JPG, PNG, WebP, GIF sampai 3 MB. Isi teks alternatif agar ramah pembaca layar dan SEO. Gambar yang masih dipakai tidak bisa dihapus.</p><div class="ct-tool">' + (canW ? '<label class="btn" for="m-up">Unggah gambar</label><input id="m-up" type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple hidden>' : "") + '<span class="cell-s">' + list.length + " gambar</span></div>" +
            (list.length ? '<div class="ct-mg">' + list.map(function (m, i) {
              return '<div class="card ct-mc"><img src="' + esc(pubUrl(m.path)) + '" alt="' + esc(m.alt || "") + '" loading="lazy"><b>' + esc(m.path.replace("media/", "")) + "</b><small>" + (m.width ? m.width + "×" + m.height + " px · " : "") + kb(m.size || 0) + " · " + wib(m.at) + "</small>" +
                '<label class="fld">Teks alternatif<input data-alt="' + i + '" maxlength="200" value="' + esc(m.alt || "") + '"' + (canW ? "" : " disabled") + "></label>" + (m.alt ? "" : '<small class="ct-e">Belum ada teks alternatif</small>') +
                "<small>" + (m.used_in.length ? "Dipakai di: " + m.used_in.map(function (u) { return esc(u.title); }).join(", ") : "Belum dipakai") + '</small><div class="row-end"><button class="btn o sm" type="button" data-cp="' + i + '">Salin URL</button>' + (canW ? '<button class="btn o sm" type="button" data-rm="' + i + '"' + (m.used_in.length ? ' disabled title="Masih dipakai"' : "") + ">Hapus</button>" : "") + "</div></div>";
            }).join("") + "</div>" : '<div class="card">' + empty("Belum ada gambar", "Unggah gambar pertama Anda.") + "</div>");
          if ($("#m-up")) $("#m-up").onchange = function (e) { uploadMany(e.target.files, function () { renderMedia(root); }); };
          root.onchange = function (e) { var i = e.target.dataset && e.target.dataset.alt; if (i == null) return; sb.rpc("admin_media_set_alt", { p_path: list[Number(i)].path, p_alt: e.target.value.trim() }).then(function (r) { if (r.error) return fail(r.error, "Gagal"); if (!r.data.ok) return toast(errText(r.data.error), "bad"); toast("Teks alternatif disimpan.", "ok"); list[Number(i)].alt = e.target.value.trim(); }); };
          root.onclick = function (e) {
            var cp = e.target.closest("[data-cp]"), rm = e.target.closest("[data-rm]");
            if (cp) { var u = pubUrl(list[Number(cp.dataset.cp)].path); (navigator.clipboard ? navigator.clipboard.writeText(u) : Promise.reject()).then(function () { toast("URL disalin.", "ok"); }, function () { toast(u, ""); }); }
            if (rm) { var m = list[Number(rm.dataset.rm)]; dlgConfirm("Hapus gambar ini dari perpustakaan? Berkas akan terhapus permanen.", "Hapus").then(function (y) { if (!y) return; sb.rpc("admin_media_delete", { p_path: m.path }).then(function (r) { if (r.error) return fail(r.error, "Gagal"); if (!r.data.ok) return toast(errText(r.data.error), "bad"); sb.storage.from(BUCKET).remove([m.path]).then(function () { toast("Gambar dihapus.", "ok"); renderMedia(root); }); }); }); }
          };
        }).catch(function (e) { root.innerHTML = errBox(e && e.code === "42501" ? "Anda tidak punya izin melihat media." : "Media tidak bisa dimuat. Pastikan backend/admin-content.sql sudah dijalankan.", 1); root.onclick = function (ev) { if (ev.target.closest("[data-retry]")) renderMedia(root); }; });
      };
      load();
    }

    var cm = M.filter(function (m) { return m.key === "content"; })[0];
    if (cm) cm.tabs = ["article", "page", "faq", "tutorial", "banner"].map(function (t) { return { key: t, label: T[t].label, render: renderType(t) }; }).concat([{ key: "media", label: "Media", render: renderMedia }]);
  });
})();
