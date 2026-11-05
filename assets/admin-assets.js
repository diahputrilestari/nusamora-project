/* NusaMora Admin: Asset Library + Template Studio (menumpang pada engine assets/admin.js lewat window.NM_ADMIN) */
(function () {
  "use strict";
  window.NM_ADMIN_EXT = window.NM_ADMIN_EXT || [];
  window.NM_ADMIN_EXT.push(function (X) {
    const { sb, $, $$, esc, toast, fail, ico, badge, empty, skel, errBox, dlgConfirm, can, buildField, collect, M } = X;
    const d = document;
    const PKG = { essential: "Essential (2D)", signature: "Signature (3D Cinematic)", luxe: "Luxe (3D Live Guest)" };
    const PKGS = Object.keys(PKG);
    const BUCKET = "theme-assets";
    const MIME = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp", gif: "image/gif", svg: "image/svg+xml", json: "application/json", glb: "model/gltf-binary", gltf: "model/gltf+json", mp3: "audio/mpeg", ogg: "audio/ogg", wav: "audio/wav", hdr: "image/vnd.radiance" };
    const IMG = ["png", "jpg", "jpeg", "webp", "gif", "svg"];
    const SLOTS = {
      essential: ["opening_background", "hero_background", "couple_illustration", "floral_decoration", "gorga_border", "closing_decoration"],
      signature: ["3d_wedding_venue", "3d_couple", "3d_flower", "cinematic_camera_scene"],
      luxe: ["virtual_venue", "avatar_male", "avatar_female", "interactive_objects", "mini_game_assets"]
    };
    const SECS = {
      essential: [["opening", "Pembuka"], ["couple", "Mempelai"], ["event", "Acara"], ["gallery", "Galeri"], ["rsvp", "RSVP & Ucapan"], ["closing", "Penutup"]],
      signature: [["intro", "Intro sinematik"], ["venue", "Venue 3D"], ["couple", "Mempelai"], ["story", "Cerita"], ["event", "Acara"], ["rsvp", "RSVP"]],
      luxe: [["lobby", "Lobi tamu"], ["venue", "Venue virtual"], ["stage", "Pelaminan"], ["interaction", "Interaksi tamu"], ["guestbook", "Buku tamu"]]
    };
    const MODE = { essential: "scroll2d", signature: "cinematic", luxe: "venue" };
    const ERR = {
      path_tidak_valid: "Lokasi file tidak valid.", kategori_tidak_valid: "Kategori tidak valid.", format_tidak_didukung: "Format file tidak didukung untuk kategori/paket ini.",
      mime_tidak_sesuai: "Tipe file tidak sesuai ekstensi.", ukuran_melebihi_batas: "Ukuran file melebihi batas kategori.", paket_tidak_valid: "Paket tidak valid.",
      paket_tidak_kompatibel: "Format file tidak kompatibel dengan salah satu paket yang dipilih.", file_tidak_ditemukan: "File belum selesai diunggah. Coba lagi.",
      ukuran_tidak_cocok: "Ukuran file tidak cocok. Unggah ulang.", duplikat: "File yang sama persis sudah ada di library.", svg_tidak_aman: "SVG berisi skrip/elemen berbahaya dan ditolak.",
      isi_tidak_sesuai: "Isi file tidak sesuai ekstensinya.", referensi_luar: "Model merujuk file/URL luar. Gunakan GLB tunggal atau glTF yang embedded.", forbidden: "Anda tidak punya izin mengelola aset.",
      asset_dipakai: "Aset masih dipakai template.", asset_tidak_kompatibel: "Aset tidak kompatibel dengan paket template.", masih_dipakai_paket_lain: "Aset masih dipakai template paket yang akan dilepas.",
      slot_tidak_valid: "Nama slot hanya huruf kecil, angka, dan garis bawah (2-40 karakter).", asset_tidak_tersedia: "Ada aset yang sudah dihapus/diarsipkan.", terlalu_banyak_asset: "Maksimal 200 aset per template.",
      config_tidak_valid: "Konfigurasi aset terlalu besar/tidak valid.", layout_tidak_valid: "Layout tidak valid (maks. 30 section).", tema_tidak_ditemukan: "Tema tidak ditemukan.", template_tidak_ditemukan: "Template tidak ditemukan.",
      unauthorized: "Sesi berakhir. Muat ulang dan masuk lagi.", status_tidak_valid: "Status tidak valid.", tidak_ditemukan: "Aset tidak ditemukan."
    };
    const errText = (c, fb) => ERR[c] || fb || ("Gagal: " + c);
    const fmtSize = (b) => b == null ? "-" : b < 1024 ? b + " B" : b < 1048576 ? (b / 1024).toFixed(1) + " KB" : (b / 1048576).toFixed(1) + " MB";
    const dims = (a) => a && a.width && a.height ? a.width + "×" + a.height : "-";
    const clean = (s) => String(s).replace(/[,()%*\\"]/g, " ").trim();
    const uid = () => Math.random().toString(36).slice(2, 8);
    const isImg = (a) => a && IMG.indexOf(a.file_type) > -1;
    const slug = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9_]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 40);

    /* ---------- cache referensi ---------- */
    let CATS = null, THEMES = null;
    const loadCats = (force) => (!force && CATS) ? Promise.resolve(CATS) : sb.from("asset_categories").select("*").order("package_type").order("sort").then(r => { if (r.error) throw r.error; return (CATS = r.data || []); });
    const loadThemes = (force) => (!force && THEMES) ? Promise.resolve(THEMES) : sb.from("themes").select("id,slug,name,status").order("sort").order("name").then(r => { if (r.error) throw r.error; return (THEMES = r.data || []); });
    const catName = (id) => { const c = (CATS || []).filter(x => x.id === id)[0]; return c ? c.name : "-"; };

    /* ---------- pustaka pratinjau (dimuat saat dibutuhkan) ---------- */
    const LIBS = {};
    const loadScript = (key, src, module) => LIBS[key] || (LIBS[key] = new Promise((res, rej) => { const s = d.createElement("script"); s.src = src; if (module) s.type = "module"; s.onload = () => res(); s.onerror = () => { delete LIBS[key]; rej(new Error(key)); }; d.head.appendChild(s); }));
    const loadMV = () => loadScript("mv", "https://cdn.jsdelivr.net/npm/@google/model-viewer@3.5.0/dist/model-viewer.min.js", true);
    const loadLottie = () => loadScript("lottie", "https://cdnjs.cloudflare.com/ajax/libs/bodymovin/5.12.2/lottie.min.js");

    function thumb(a, cls) {
      if (isImg(a)) return `<img class="${cls || "al-th"}" src="${esc(a.thumbnail_url || a.file_url)}" alt="" loading="lazy">`;
      const lab = { glb: "3D", gltf: "3D", mp3: "♪", ogg: "♪", wav: "♪", hdr: "HDR", json: "Lottie" }[a.file_type] || a.file_type;
      return `<span class="${cls || "al-th"} al-ph" aria-hidden="true">${esc(lab)}</span>`;
    }
    function preview(a, big) {
      const u = esc(a.file_url);
      if (isImg(a)) return `<div class="al-pv ${a.is_transparent ? "chk" : ""}"><img src="${u}" alt="${esc(a.name)}"></div>`;
      if (["mp3", "ogg", "wav"].indexOf(a.file_type) > -1) return `<div class="al-pv"><audio controls preload="none" src="${u}"></audio></div>`;
      if (a.file_type === "glb" || a.file_type === "gltf") return `<div class="al-pv"><model-viewer src="${u}" camera-controls auto-rotate shadow-intensity="0.6" alt="${esc(a.name)}" style="width:100%;height:${big ? 320 : 180}px"></model-viewer><small class="al-hint">Pratinjau 3D memuat pustaka model-viewer dari CDN.</small></div>`;
      if (a.file_type === "json") return `<div class="al-pv"><div class="al-lottie" data-lottie="${u}" style="width:100%;height:${big ? 280 : 160}px"></div></div>`;
      return `<div class="al-pv"><p class="sub">Peta lingkungan HDR (${dims(a)}). Pratinjau tidak tersedia di browser; file dipakai langsung oleh renderer 3D.</p></div>`;
    }
    function mount(root) {
      if ($("model-viewer", root)) loadMV().catch(() => { $$("model-viewer", root).forEach(m => { m.outerHTML = '<p class="sub">Pratinjau 3D tidak bisa dimuat (CDN tidak terjangkau).</p>'; }); });
      const L = $$("[data-lottie]", root);
      if (L.length) loadLottie().then(() => L.forEach(el => { try { window.lottie.loadAnimation({ container: el, renderer: "svg", loop: true, autoplay: true, path: el.dataset.lottie }); } catch (e) { el.textContent = "Animasi tidak bisa diputar."; } })).catch(() => L.forEach(el => { el.textContent = "Pustaka animasi tidak bisa dimuat."; }));
    }

    /* ---------- dialog generik ---------- */
    function dialog(id, cls) {
      let dl = $("#" + id); if (dl) dl.remove();
      dl = d.createElement("dialog"); dl.id = id; dl.className = "wide " + (cls || ""); dl.setAttribute("aria-labelledby", id + "-t"); d.body.appendChild(dl); return dl;
    }
    const closeBtn = '<button class="icon-btn x" type="button" data-close aria-label="Tutup"><svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button>';

    /* ---------- panggilan Edge Function ---------- */
    async function callRegister(body) {
      const r = await sb.functions.invoke("asset-register", { body });
      if (r.error) {
        let j = null; try { j = await r.error.context.json(); } catch (e) { /* abaikan */ }
        return { ok: false, error: (j && j.error) || (r.error.name === "FunctionsFetchError" ? "jaringan" : "gagal"), detail: j };
      }
      return r.data && r.data.ok ? r.data : { ok: false, error: (r.data && r.data.error) || "gagal" };
    }

    /* ============================================================
       UNGGAH ASET (multi-file, drag & drop)
       ============================================================ */
    function openUpload(opt) {
      opt = opt || {};
      Promise.all([loadCats(), loadThemes().catch(() => [])]).then(() => {
        const dl = dialog("udlg", "al-dlg");
        const pk0 = opt.pkg || "essential";
        dl.innerHTML = `${closeBtn}<h2 id="udlg-t">Unggah aset</h2>
        <div class="fgrid" style="margin-top:6px">
          <label class="fld">Paket${opt.lock ? " (mengikuti template)" : ""}<select id="u-pkg" ${opt.lock ? "disabled" : ""}>${PKGS.map(p => `<option value="${p}" ${p === pk0 ? "selected" : ""}>${esc(PKG[p])}</option>`).join("")}</select></label>
          <label class="fld">Kategori<select id="u-cat"></select></label>
          <label class="fld">Tema (opsional)<input id="u-theme" list="u-themes" maxlength="60" placeholder="mis. batak, keraton"><datalist id="u-themes">${(THEMES || []).map(t => `<option value="${esc(t.slug)}">${esc(t.name)}</option>`).join("")}</datalist></label>
          <label class="fld">Tag (pisahkan koma)<input id="u-tags" maxlength="200" placeholder="floral, emas"></label>
          <label class="chk-l full"><input type="checkbox" id="u-also" ${opt.lock ? "disabled" : ""}> Aset juga boleh dipakai paket lain yang formatnya kompatibel</label>
        </div>
        <p class="sub" id="u-rule" style="margin:10px 0"></p>
        <div class="al-drop" id="u-drop" tabindex="0" role="button" aria-label="Pilih atau seret file ke sini"><b>Seret file ke sini</b><span>atau klik untuk memilih (bisa banyak file)</span><input type="file" id="u-file" multiple hidden></div>
        <ul class="al-files" id="u-list"></ul>
        <div class="row-end"><button class="btn o" type="button" data-close>Tutup</button><button class="btn" type="button" id="u-go" disabled>Unggah</button></div>`;
        const files = [];
        const cats = () => CATS.filter(c => c.package_type === $("#u-pkg").value && c.active);
        const cur = () => CATS.filter(c => c.id === $("#u-cat").value)[0];
        const fillCats = () => { $("#u-cat").innerHTML = cats().map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join(""); rule(); };
        const rule = () => { const c = cur(); $("#u-rule").textContent = c ? `Format: ${c.allowed_ext.join(", ").toUpperCase()} · maks. ${fmtSize(c.max_bytes)} per file.` : ""; };
        const draw = () => {
          $("#u-list").innerHTML = files.map((f, i) => `<li class="al-f ${f.st || ""}"><span class="n">${esc(f.file.name)}</span><span class="s">${fmtSize(f.file.size)}</span><span class="m">${esc(f.msg || "Menunggu")}</span>${f.st ? "" : `<button type="button" class="btn o sm" data-rm="${i}" aria-label="Hapus dari daftar">×</button>`}</li>`).join("");
          $("#u-go").disabled = !files.some(f => !f.st);
        };
        const add = (list) => {
          const c = cur();
          Array.prototype.forEach.call(list, file => {
            const ext = (file.name.split(".").pop() || "").toLowerCase(); let msg = "";
            if (!c) msg = "Pilih kategori dulu."; else if (c.allowed_ext.indexOf(ext) < 0) msg = "Format ." + ext + " tidak diizinkan di kategori ini."; else if (file.size > c.max_bytes) msg = "Melebihi " + fmtSize(c.max_bytes) + ".";
            files.push({ file, ext, st: msg ? "bad" : "", msg });
          }); draw();
        };
        $("#u-pkg").onchange = () => { fillCats(); files.forEach(f => { if (f.st !== "ok") { f.st = ""; f.msg = ""; } }); };
        $("#u-cat").onchange = () => { rule(); const c = cur(); files.forEach(f => { if (f.st === "ok") return; const bad = !c || c.allowed_ext.indexOf(f.ext) < 0 || f.file.size > c.max_bytes; f.st = bad ? "bad" : ""; f.msg = bad ? "Tidak sesuai kategori ini." : ""; }); draw(); };
        const drop = $("#u-drop"), inp = $("#u-file");
        drop.onclick = () => inp.click(); drop.onkeydown = (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); inp.click(); } };
        inp.onchange = () => { add(inp.files); inp.value = ""; };
        ["dragenter", "dragover"].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add("on"); }));
        ["dragleave", "drop"].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove("on"); }));
        drop.addEventListener("drop", e => add(e.dataTransfer.files));
        $("#u-list").onclick = (e) => { const b = e.target.closest("[data-rm]"); if (b) { files.splice(Number(b.dataset.rm), 1); draw(); } };
        dl.addEventListener("click", (e) => { if (e.target.closest("[data-close]")) dl.close(); });
        const created = [];
        dl.addEventListener("close", () => { if (created.length && opt.onDone) opt.onDone(created); });
        $("#u-go").onclick = async () => {
          const c = cur(); if (!c) return;
          const sess = await sb.auth.getSession(); const user = sess.data && sess.data.session && sess.data.session.user; if (!user) return toast("Sesi berakhir. Masuk lagi.", "bad");
          $("#u-go").disabled = true; $("#u-pkg").disabled = $("#u-cat").disabled = true;
          const pk = $("#u-pkg").value, also = $("#u-also").checked;
          const theme = $("#u-theme").value.trim().toLowerCase() || null, tags = $("#u-tags").value.split(",").map(s => s.trim()).filter(Boolean).slice(0, 20);
          for (const f of files) {
            if (f.st) continue; f.st = "run"; f.msg = "Mengunggah..."; draw();
            const path = "incoming/" + user.id + "/" + Date.now() + "-" + uid() + "." + f.ext;
            const up = await sb.storage.from(BUCKET).upload(path, f.file, { contentType: MIME[f.ext] || "application/octet-stream", upsert: false });
            if (up.error) { f.st = "bad"; f.msg = /exceeded|size|payload/i.test(up.error.message || "") ? "Ukuran melebihi batas storage." : /mime|type/i.test(up.error.message || "") ? "Tipe file ditolak storage." : "Gagal mengunggah. Periksa izin & bucket."; draw(); continue; }
            f.msg = "Memeriksa file..."; draw();
            const base = f.file.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim().slice(0, 120) || "Aset";
            // paket tambahan dikirim hanya bila formatnya memang kompatibel (divalidasi lagi di server)
            // paket tambahan hanya yang punya kategori aktif yang menerima format file ini (server tetap memvalidasi ulang)
            const pkgs = [pk]; if (also) PKGS.forEach(q => { if (q !== pk && CATS.some(x => x.package_type === q && x.active && x.allowed_ext.indexOf(f.ext) > -1)) pkgs.push(q); });
            const r = await callRegister({ path, name: base, category_id: c.id, package_types: pkgs, theme_key: theme, tags });
            if (r.ok) { f.st = "ok"; f.msg = "Tersimpan"; created.push(r.asset); } else { f.st = "bad"; f.msg = errText(r.error, r.error === "jaringan" ? "Tidak bisa terhubung ke server." : "Gagal memproses file."); }
            draw();
          }
          $("#u-go").disabled = true; $("#u-pkg").disabled = opt.lock ? true : false; $("#u-cat").disabled = false;
          if (created.length) toast(created.length + " aset masuk ke library.", "ok");
        };
        fillCats(); draw(); dl.showModal();
      }).catch(e => fail(e, "Kategori aset tidak bisa dimuat. Jalankan backend/asset-schema.sql"));
    }

    /* ============================================================
       DETAIL / EDIT ASET
       ============================================================ */
    function openAsset(a, onChange) {
      loadCats().then(() => {
        const dl = dialog("adlg", "al-dlg"), canW = can("templates", "write"), gone = !!a.deleted_at;
        const catOpts = PKGS.map(p => `<optgroup label="${esc(PKG[p])}">${CATS.filter(c => c.package_type === p && c.active).map(c => `<option value="${c.id}" ${c.id === a.category_id ? "selected" : ""}>${esc(c.name)}</option>`).join("")}</optgroup>`).join("");
        dl.innerHTML = `${closeBtn}<h2 id="adlg-t">${esc(a.name)}</h2>
        <div class="al-split"><div>${preview(a, true)}<dl class="al-kv"><div><dt>Format</dt><dd>${esc(a.file_type.toUpperCase())}</dd></div><div><dt>Dimensi</dt><dd>${dims(a)}</dd></div><div><dt>Ukuran</dt><dd>${fmtSize(a.file_size)}</dd></div><div><dt>Transparan</dt><dd>${a.is_transparent ? "Ya" : "Tidak"}</dd></div><div><dt>Diunggah</dt><dd>${X.dt(a.created_at, true)}</dd></div></dl>
          <div class="al-use" id="a-use"><p class="sub">Memuat pemakaian...</p></div></div>
        <form id="a-f" novalidate class="al-form">
          <label class="fld">Nama<input id="a-name" maxlength="120" value="${esc(a.name)}" ${canW && !gone ? "" : "disabled"}></label>
          <label class="fld">Deskripsi<textarea id="a-desc" maxlength="500" ${canW && !gone ? "" : "disabled"}>${esc(a.description || "")}</textarea></label>
          <label class="fld">Kategori<select id="a-cat" ${canW && !gone ? "" : "disabled"}>${catOpts}</select></label>
          <fieldset class="al-pk"><legend>Boleh dipakai paket</legend>${PKGS.map(p => `<label class="chk-l"><input type="checkbox" data-pk="${p}" ${a.package_types.indexOf(p) > -1 ? "checked" : ""} ${canW && !gone ? "" : "disabled"}> ${esc(PKG[p])}</label>`).join("")}</fieldset>
          <label class="fld">Tema<input id="a-theme" maxlength="60" value="${esc(a.theme_key || "")}" ${canW && !gone ? "" : "disabled"}></label>
          <label class="fld">Tag (pisahkan koma)<input id="a-tags" value="${esc((a.tags || []).join(", "))}" ${canW && !gone ? "" : "disabled"}></label>
          <label class="chk-l"><input type="checkbox" id="a-tr" ${a.is_transparent ? "checked" : ""} ${canW && !gone ? "" : "disabled"}> Latar transparan</label>
          <label class="fld">Status<select id="a-st" ${canW && !gone ? "" : "disabled"}><option value="active" ${a.status === "active" ? "selected" : ""}>Aktif</option><option value="archived" ${a.status === "archived" ? "selected" : ""}>Arsip (tidak muncul di pemilih)</option></select></label>
          <div class="full" id="a-e" role="alert"></div>
          <div class="row-end">${canW ? (gone ? '<button class="btn o" type="button" id="a-restore">Pulihkan</button>' : '<button class="btn o bad" type="button" id="a-del">Hapus</button>') : ""}<button class="btn o" type="button" data-close>Tutup</button>${canW && !gone ? '<button class="btn" type="submit" id="a-save">Simpan</button>' : ""}</div>
        </form></div>`;
        mount(dl); dl.showModal();
        dl.addEventListener("click", (e) => { if (e.target.closest("[data-close]")) dl.close(); });
        sb.from("template_assets").select("slot_key,theme_id,templates(name,package_type)").eq("asset_id", a.id).then(r => {
          const rows = r.data || [];
          $("#a-use").innerHTML = rows.length ? `<h3>Dipakai di ${rows.length} penempatan</h3><ul>${rows.map(x => `<li>${esc(x.templates ? x.templates.name : "?")} · <code>${esc(x.slot_key)}</code></li>`).join("")}</ul>` : '<p class="sub">Belum dipakai template mana pun.</p>';
        });
        const done = (msg) => { toast(msg, "ok"); dl.close(); if (onChange) onChange(); };
        const f = $("#a-f"); if (!f) return;
        f.onsubmit = (e) => {
          e.preventDefault(); const er = $("#a-e"); er.textContent = "";
          const name = $("#a-name").value.trim(); if (!name) { er.textContent = "Nama wajib diisi."; return; }
          const pk = $$("[data-pk]", f).filter(x => x.checked).map(x => x.dataset.pk); if (!pk.length) { er.textContent = "Pilih minimal satu paket."; return; }
          const patch = { name, description: $("#a-desc").value.trim(), category_id: $("#a-cat").value, package_types: pk, theme_key: $("#a-theme").value.trim().toLowerCase(), tags: $("#a-tags").value.split(",").map(s => s.trim()).filter(Boolean), is_transparent: $("#a-tr").checked, status: $("#a-st").value };
          const b = $("#a-save"); b.disabled = true; b.textContent = "Menyimpan...";
          sb.rpc("admin_update_asset", { p_id: a.id, p_patch: patch }).then(r => { b.disabled = false; b.textContent = "Simpan"; if (r.error) { er.textContent = fail(r.error, "Gagal menyimpan"); return; } if (!r.data.ok) { er.textContent = errText(r.data.error) + (r.data.package ? " (" + PKG[r.data.package] + ")" : ""); return; } done("Metadata tersimpan."); });
        };
        const del = $("#a-del");
        if (del) del.onclick = () => {
          sb.rpc("admin_delete_asset", { p_id: a.id, p_force: false }).then(async r => {
            if (r.error) return fail(r.error, "Gagal menghapus");
            if (r.data.ok) return done("Aset dihapus dari library (file asli tetap tersimpan).");
            if (r.data.error !== "asset_dipakai") return toast(errText(r.data.error), "bad");
            const ok = await dlgConfirm("Aset ini dipakai di " + r.data.count + " penempatan (" + (r.data.templates || []).join(", ") + "). Jika dilanjutkan, relasi ke template dilepas dan aset dipindah ke Terhapus. File asli di storage tidak dihapus.", "Hapus & lepas relasi");
            if (!ok) return;
            sb.rpc("admin_delete_asset", { p_id: a.id, p_force: true }).then(r2 => { if (r2.error) return fail(r2.error, "Gagal menghapus"); done("Aset dihapus; " + (r2.data.relations_removed || 0) + " relasi dilepas."); });
          });
        };
        const rs = $("#a-restore");
        if (rs) rs.onclick = () => sb.rpc("admin_restore_asset", { p_id: a.id }).then(r => { if (r.error) return fail(r.error, "Gagal memulihkan"); if (!r.data.ok) return toast(errText(r.data.error, "Tidak bisa dipulihkan."), "bad"); done("Aset dipulihkan."); });
      }).catch(e => fail(e));
    }

    /* ============================================================
       ASSET LIBRARY (halaman admin)
       ============================================================ */
    const LS = { q: "", pkg: "", cat: "", theme: "", ext: "", status: "active", view: "grid", page: 0 }, PAGE = 24;
    function renderLibrary(root) {
      const canW = can("templates", "write");
      root.innerHTML = skel();
      Promise.all([loadCats(true), loadThemes(true).catch(() => [])]).then(() => {
        const exts = Array.from(new Set([].concat.apply([], CATS.map(c => c.allowed_ext)))).sort();
        const catsFor = () => CATS.filter(c => !LS.pkg || c.package_type === LS.pkg);
        root.innerHTML = `<div class="tool al-tool">
          <label class="fld grow">Cari<span class="sbox"><input type="search" id="l-q" placeholder="Nama atau tag, lalu Enter..." value="${esc(LS.q)}"></span></label>
          <label class="fld">Paket<select id="l-pkg"><option value="">Semua</option>${PKGS.map(p => `<option value="${p}" ${LS.pkg === p ? "selected" : ""}>${esc(PKG[p])}</option>`).join("")}</select></label>
          <label class="fld">Kategori<select id="l-cat"></select></label>
          <label class="fld">Tema<select id="l-theme"><option value="">Semua</option>${(THEMES || []).map(t => `<option value="${esc(t.slug)}" ${LS.theme === t.slug ? "selected" : ""}>${esc(t.name)}</option>`).join("")}</select></label>
          <label class="fld">Format<select id="l-ext"><option value="">Semua</option>${exts.map(x => `<option value="${x}" ${LS.ext === x ? "selected" : ""}>${x.toUpperCase()}</option>`).join("")}</select></label>
          <label class="fld">Status<select id="l-st"><option value="active" ${LS.status === "active" ? "selected" : ""}>Aktif</option><option value="archived" ${LS.status === "archived" ? "selected" : ""}>Arsip</option><option value="deleted" ${LS.status === "deleted" ? "selected" : ""}>Terhapus</option></select></label>
          <div class="al-vt" role="group" aria-label="Tampilan"><button type="button" class="btn o sm" data-v="grid" aria-pressed="${LS.view === "grid"}">Grid</button><button type="button" class="btn o sm" data-v="list" aria-pressed="${LS.view === "list"}">Daftar</button></div>
          ${canW ? '<button class="btn" type="button" id="l-up">' + ico("plus") + " Unggah aset</button>" : ""}</div><div id="l-res" class="card"><div class="sk h4"></div></div>`;
        const fillCat = () => { $("#l-cat").innerHTML = '<option value="">Semua</option>' + catsFor().map(c => `<option value="${c.id}" ${LS.cat === c.id ? "selected" : ""}>${esc((LS.pkg ? "" : c.package_type + " · ") + c.name)}</option>`).join(""); };
        fillCat();
        const go = () => { LS.page = 0; load(); };
        $("#l-pkg").onchange = (e) => { LS.pkg = e.target.value; LS.cat = ""; fillCat(); go(); };
        $("#l-cat").onchange = (e) => { LS.cat = e.target.value; go(); };
        $("#l-theme").onchange = (e) => { LS.theme = e.target.value; go(); };
        $("#l-ext").onchange = (e) => { LS.ext = e.target.value; go(); };
        $("#l-st").onchange = (e) => { LS.status = e.target.value; go(); };
        $("#l-q").onkeydown = (e) => { if (e.key === "Enter") { e.preventDefault(); LS.q = e.target.value.trim(); go(); } };
        $$("[data-v]", root).forEach(b => b.onclick = () => { LS.view = b.dataset.v; $$("[data-v]", root).forEach(x => x.setAttribute("aria-pressed", String(x.dataset.v === LS.view))); load(); });
        const up = $("#l-up"); if (up) up.onclick = () => openUpload({ pkg: LS.pkg || "essential", onDone: load });
        let ROWS = [];
        function load() {
          const box = $("#l-res"); box.innerHTML = '<div class="sk h4"></div>';
          let qy = sb.from("assets").select("*", { count: "exact" });
          if (LS.status === "deleted") qy = qy.not("deleted_at", "is", null); else qy = qy.is("deleted_at", null).eq("status", LS.status);
          if (LS.pkg) qy = qy.contains("package_types", [LS.pkg]);
          if (LS.cat) qy = qy.eq("category_id", LS.cat);
          if (LS.theme) qy = qy.eq("theme_key", LS.theme);
          if (LS.ext) qy = qy.eq("file_type", LS.ext);
          if (LS.q) qy = qy.or("name.ilike.%" + clean(LS.q) + "%,tags.cs.{" + clean(LS.q).replace(/\s+/g, "") + "}");
          qy = qy.order("created_at", { ascending: false }).range(LS.page * PAGE, LS.page * PAGE + PAGE - 1);
          Promise.all([qy, sb.rpc("admin_assets_usage")]).then(([r, u]) => {
            if (r.error) throw r.error;
            const use = {}; (u.data || []).forEach(x => { use[x.asset_id] = Number(x.uses); });
            ROWS = r.data || [];
            if (!ROWS.length) { const f = LS.q || LS.pkg || LS.cat || LS.theme || LS.ext || LS.status !== "active"; box.innerHTML = empty(f ? "Tidak ada aset yang cocok" : "Library masih kosong", f ? "Ubah kata kunci atau filter." : "Unggah aset pertama untuk dipakai di banyak template.", !f && canW ? '<button class="btn" type="button" id="l-up2">Unggah aset</button>' : ""); const b2 = $("#l-up2"); if (b2) b2.onclick = () => openUpload({ onDone: load }); return; }
            const pages = Math.max(1, Math.ceil((r.count || ROWS.length) / PAGE));
            const meta = (a) => `${esc(a.file_type.toUpperCase())} · ${dims(a)} · ${fmtSize(a.file_size)}`;
            const pkb = (a) => a.package_types.map(p => `<i class="al-pkb ${p}">${p === "essential" ? "2D" : p === "signature" ? "Cinematic" : "Live"}</i>`).join("");
            const cats = {}; CATS.forEach(c => { cats[c.id] = c.name; });
            const body = LS.view === "grid"
              ? `<ul class="al-grid">${ROWS.map((a, i) => `<li><button type="button" class="al-card" data-i="${i}">${thumb(a, "al-th")}<span class="al-n">${esc(a.name)}</span><span class="al-m">${esc(cats[a.category_id] || "-")}</span><span class="al-m">${meta(a)}</span><span class="al-b">${pkb(a)}${use[a.id] ? `<i class="al-use">dipakai ${use[a.id]}×</i>` : ""}</span></button></li>`).join("")}</ul>`
              : `<div class="tbl-w"><table><thead><tr><th></th><th>Nama</th><th>Kategori</th><th>Paket</th><th>Format</th><th class="num">Ukuran</th><th class="num">Dipakai</th></tr></thead><tbody>${ROWS.map((a, i) => `<tr class="row" tabindex="0" data-i="${i}"><td>${thumb(a, "al-th s")}</td><td><b>${esc(a.name)}</b><span class="cell-s">${esc((a.tags || []).join(", "))}</span></td><td>${esc(cats[a.category_id] || "-")}</td><td>${pkb(a)}</td><td>${esc(a.file_type.toUpperCase())} ${dims(a)}</td><td class="num">${fmtSize(a.file_size)}</td><td class="num">${use[a.id] || 0}</td></tr>`).join("")}</tbody></table></div>`;
            box.innerHTML = body + `<div class="pager"><span>${LS.page * PAGE + 1}&ndash;${LS.page * PAGE + ROWS.length} dari ${r.count == null ? ROWS.length : r.count}</span><div><button class="btn o sm" type="button" data-pg="-1" ${LS.page === 0 ? "disabled" : ""}>Sebelumnya</button><button class="btn o sm" type="button" data-pg="1" ${LS.page + 1 >= pages ? "disabled" : ""}>Berikutnya</button></div></div>`;
          }).catch(e => { box.innerHTML = empty("Library tidak bisa dimuat", e && (e.code === "42P01" || e.code === "PGRST205" || e.code === "PGRST202") ? "Tabel/fungsi belum dibuat. Jalankan backend/asset-schema.sql di Supabase." : "Terjadi kendala saat memuat. Coba lagi.", '<button class="btn" type="button" data-retry>Coba lagi</button>'); });
        }
        $("#l-res").onclick = (e) => {
          if (e.target.closest("[data-retry]")) return load();
          const pg = e.target.closest("[data-pg]"); if (pg) { LS.page = Math.max(0, LS.page + Number(pg.dataset.pg)); return load(); }
          const it = e.target.closest("[data-i]"); if (it) openAsset(ROWS[Number(it.dataset.i)], load);
        };
        $("#l-res").onkeydown = (e) => { if (e.key === "Enter" && e.target.matches("tr[data-i]")) openAsset(ROWS[Number(e.target.dataset.i)], load); };
        load();
      }).catch(e => { root.innerHTML = errBox(e && (e.code === "42P01" || e.code === "PGRST205") ? "Tabel belum dibuat. Jalankan backend/asset-schema.sql di Supabase (paling akhir)." : "Terjadi kendala saat memuat.", 1); });
    }

    /* ============================================================
       TEMPLATE STUDIO (tab A-D)
       ============================================================ */
    function defaultLayout(pkg) { return { version: 1, mode: MODE[pkg] || "scroll2d", sections: (SECS[pkg] || []).map(s => ({ key: s[0], label: s[1], enabled: true })) }; }
    function normLayout(l, pkg) { const b = defaultLayout(pkg); if (!l || typeof l !== "object" || !Array.isArray(l.sections) || !l.sections.length) return b; return { version: 1, mode: MODE[pkg], sections: l.sections.map(s => ({ key: slug(s.key) || "section", label: String(s.label || s.key).slice(0, 60), enabled: s.enabled !== false, duration: s.duration })) }; }

    function openStudio(tab, row, reload) {
      Promise.all([loadCats(), loadThemes(true).catch(() => []), Promise.all((tab.fields || []).map(f => f.load ? f.load().then(o => { f.opts = o; }) : null))]).then(() => studio(tab, row, reload)).catch(e => fail(e, "Studio tidak bisa dibuka"));
    }
    function studio(tab, row, reload) {
      const canW = can("templates", "write");
      const S = { mappedOther: 0, tpl: row || null, tab: "a", scope: "", items: [], layout: null, extra: [], loaded: false, dirty: false, mapped: 0, dev: "mobile", themeLinks: [] };
      const dl = dialog("sdlg", "studio");
      const pkg = () => (S.tpl && S.tpl.package_type) || ($("#ff-package_type") && $("#ff-package_type").value) || "essential";
      const TABS = [["a", "A. Informasi Template"], ["b", "B. Asset Management"], ["c", "C. Layout & Section"], ["d", "D. Preview"]];
      dl.innerHTML = `${closeBtn}<h2 id="sdlg-t">${row ? "Edit template: " + esc(row.name) : "Tambah template"}</h2>
      <div class="tabs st-tabs" role="tablist">${TABS.map(t => `<button type="button" role="tab" data-st="${t[0]}" aria-selected="${t[0] === "a"}" ${t[0] !== "a" && !row ? "disabled" : ""}>${esc(t[1])}</button>`).join("")}</div>
      <div id="st-a" class="st-pane"></div><div id="st-b" class="st-pane" hidden></div><div id="st-c" class="st-pane" hidden></div><div id="st-d" class="st-pane" hidden></div>
      <div class="st-foot"><span id="st-msg" class="sub" role="status"></span><div class="row-end" style="margin:0"><button class="btn o" type="button" data-close>Tutup</button>${canW ? '<button class="btn" type="button" id="st-save">Simpan</button>' : ""}</div></div>`;
      const pane = (k) => $("#st-" + k, dl);
      const msg = (t) => { $("#st-msg", dl).textContent = t || ""; };
      const setDirty = () => { S.dirty = true; msg("Ada perubahan yang belum disimpan."); };

      // ----- A. Informasi (semua field lama dipertahankan)
      pane("a").innerHTML = `<form id="sa-f" novalidate class="fgrid">${tab.fields.map(f => buildField(f, S.tpl ? S.tpl[f.k] : null)).join("")}<div class="full" id="sa-e" role="alert"></div></form>`;
      const fa = $("#sa-f", dl);
      tab.fields.filter(f => f.t === "image").forEach(f => {
        const inp = $("#ff-" + f.k + "-f", dl); if (!inp) return;
        inp.onchange = (e) => {
          const file = e.target.files[0], er = $("#ff-" + f.k + "-e", dl); if (!file) return; er.textContent = "";
          if (!/^image\/(png|jpeg|webp)$/.test(file.type)) { er.textContent = "Hanya PNG, JPG, atau WebP."; return; } if (file.size > 2 * 1024 * 1024) { er.textContent = "Maksimal 2 MB."; return; }
          er.textContent = "Mengunggah..."; const path = (f.folder || "misc") + "/" + Date.now() + "-" + file.name.replace(/[^a-z0-9._-]/gi, "_");
          sb.storage.from("site-assets").upload(path, file, { upsert: false, contentType: file.type }).then(r => { if (r.error) { er.textContent = "Gagal mengunggah. Periksa izin & bucket."; return; } const u = sb.storage.from("site-assets").getPublicUrl(path).data.publicUrl; $("#ff-" + f.k, dl).value = u; const p = $("#ff-" + f.k + "-p", dl); p.src = u; p.hidden = false; er.textContent = ""; setDirty(); });
        };
      });
      fa.addEventListener("input", setDirty); fa.addEventListener("change", setDirty);
      fa.onsubmit = (e) => { e.preventDefault(); };
      if (!canW) $$("input,select,textarea", fa).forEach(x => { x.disabled = true; });

      // ----- muat pemetaan aset
      function loadScope(scope) {
        S.scope = scope; S.loaded = false;
        const tid = S.tpl.id;
        return Promise.all([
          sb.from("template_assets").select("*,assets(id,name,file_url,thumbnail_url,file_type,file_size,width,height,is_transparent,deleted_at,status)").eq("template_id", tid).order("position"),
          sb.from("template_themes").select("theme_id,layout,enabled").eq("template_id", tid),
          sb.from("templates").select("layout").eq("id", tid).single()
        ]).then(([ta, tt, tp]) => {
          if (ta.error) throw ta.error;
          const all = ta.data || []; S.mapped = all.length; S.mappedOther = all.filter(x => (x.theme_id || "") !== scope).length; S.themeLinks = tt.data || [];
          S.items = all.filter(x => (x.theme_id || "") === scope && x.assets && !x.assets.deleted_at).map(x => ({ slot_key: x.slot_key, section: x.section, position: x.position, config: x.config || {}, asset: x.assets, asset_id: x.asset_id }));
          const link = S.themeLinks.filter(x => x.theme_id === scope)[0];
          const base = tp.data && tp.data.layout;
          S.layout = normLayout(scope ? (link && link.layout && link.layout.sections ? link.layout : base) : base, S.tpl.package_type);
          S.extra = []; S.loaded = true; S.dirty = false; msg("");
        });
      }
      function showTab(k) {
        S.tab = k; $$("[data-st]", dl).forEach(b => b.setAttribute("aria-selected", String(b.dataset.st === k)));
        ["a", "b", "c", "d"].forEach(x => { pane(x).hidden = x !== k; });
        if (k === "b") drawB(); if (k === "c") drawC(); if (k === "d") drawD();
      }
      $(".st-tabs", dl).onclick = (e) => {
        const b = e.target.closest("[data-st]"); if (!b || b.disabled) return;
        if (b.dataset.st !== "a" && !S.loaded) { pane(b.dataset.st).innerHTML = skel(); pane("a").hidden = true; ["b", "c", "d"].forEach(x => { pane(x).hidden = x !== b.dataset.st; }); loadScope(S.scope).then(() => showTab(b.dataset.st)).catch(er => { pane(b.dataset.st).innerHTML = errBox(er && er.code === "42P01" ? "Tabel aset belum dibuat. Jalankan backend/asset-schema.sql." : "Pemetaan aset tidak bisa dimuat.", 1); }); return; }
        showTab(b.dataset.st);
      };
      const scopeBar = () => `<div class="st-scope"><label class="fld">Cakupan aset<select id="sc">${'<option value="">Umum (semua tema)</option>'}${(THEMES || []).map(t => `<option value="${t.id}" ${S.scope === t.id ? "selected" : ""}>Tema: ${esc(t.name)}${t.status !== "published" ? " (" + t.status + ")" : ""}</option>`).join("")}</select></label><p class="sub">Aset "Umum" dipakai semua tema. Aset khusus tema menimpa aset umum pada slot yang sama. Pelanggan memilih tema saat membuat undangan.</p></div>`;
      const bindScope = (draw) => { const s = $("#sc", dl); if (!s) return; s.onchange = async () => { if (S.dirty && !(await dlgConfirm("Perubahan cakupan ini belum disimpan dan akan hilang.", "Buang perubahan"))) { s.value = S.scope; return; } pane(S.tab).innerHTML = skel(); loadScope(s.value).then(() => showTab(S.tab)).catch(er => fail(er, "Gagal memuat")); }; };

      // ----- B. Asset Management
      function secOptions(cur) { const s = (S.layout.sections || []).map(x => [x.key, x.label]); if (!s.some(x => x[0] === "general")) s.unshift(["general", "Umum"]); if (cur && !s.some(x => x[0] === cur)) s.push([cur, cur]); return s.map(x => `<option value="${esc(x[0])}" ${x[0] === cur ? "selected" : ""}>${esc(x[1])}</option>`).join(""); }
      function drawB() {
        const p = S.tpl.package_type, slots = {}; S.items.forEach(it => { (slots[it.slot_key] = slots[it.slot_key] || []).push(it); });
        const order = Array.from(new Set(SLOTS[p].concat(Object.keys(slots), S.extra)));
        pane("b").innerHTML = `${scopeBar()}
        <div class="st-add"><label class="fld">Tambah slot baru<input id="ns" list="ns-l" maxlength="40" placeholder="mis. gerbang_masuk"></label><datalist id="ns-l">${SLOTS[p].map(s => `<option value="${s}">`).join("")}</datalist><button class="btn o" type="button" id="ns-b">Tambah slot</button></div>
        <p class="sub">Paket ${esc(PKG[p])}: aset yang tampil di pemilih hanya yang kompatibel dengan paket ini. Menghapus aset dari slot hanya melepas relasi, file tidak dihapus.</p>
        <div class="st-slots">${order.map(sk => `<section class="st-slot" data-slot="${esc(sk)}"><header><h3><code>${esc(sk)}</code>${SLOTS[p].indexOf(sk) < 0 ? ' <i class="al-use">kustom</i>' : ""}</h3>${canW ? `<div><button class="btn sm" type="button" data-pick="${esc(sk)}">Pilih aset</button>${SLOTS[p].indexOf(sk) < 0 ? `<button class="btn o sm" type="button" data-rmslot="${esc(sk)}">Hapus slot</button>` : ""}</div>` : ""}</header>
          ${(slots[sk] || []).length ? `<ul class="st-items">${slots[sk].map(it => { const a = it.asset, i = S.items.indexOf(it); return `<li data-i="${i}">${thumb(a, "al-th s")}<div class="in"><b>${esc(a.name)}</b><span class="al-m">${esc(a.file_type.toUpperCase())} · ${dims(a)} · ${fmtSize(a.file_size)}</span></div><label class="fld sm">Section<select data-sec="${i}" ${canW ? "" : "disabled"}>${secOptions(it.section)}</select></label>${canW ? `<div class="st-btns"><button type="button" class="btn o sm" data-up="${i}" aria-label="Naik">↑</button><button type="button" class="btn o sm" data-dn="${i}" aria-label="Turun">↓</button><button type="button" class="btn o sm" data-cfg="${i}">Atur</button><button type="button" class="btn o sm bad" data-del="${i}">Lepas</button></div>` : ""}<div class="st-cfg" id="cfg-${i}" hidden></div></li>`; }).join("")}</ul>` : '<p class="sub st-none">Belum ada aset di slot ini.</p>'}</section>`).join("")}</div>`;
        bindScope(); const b = pane("b");
        $("#ns-b", b).onclick = () => { const k = slug($("#ns", b).value); if (k.length < 2) return toast("Nama slot minimal 2 karakter (huruf kecil, angka, garis bawah).", "bad"); if (!S.extra.includes(k)) S.extra.push(k); setDirty(); drawB(); };
        b.onclick = (e) => {
          const t = e.target.closest("button"); if (!t) return;
          if (t.dataset.pick) return openPicker(t.dataset.pick);
          if (t.dataset.rmslot) { const k = t.dataset.rmslot; S.items = S.items.filter(x => x.slot_key !== k); S.extra = S.extra.filter(x => x !== k); setDirty(); return drawB(); }
          const idx = ["up", "dn", "del", "cfg"].map(n => t.dataset[n]).filter(x => x != null)[0]; if (idx == null) return; const i = Number(idx), it = S.items[i];
          if (t.dataset.del != null) { S.items.splice(i, 1); setDirty(); return drawB(); }
          if (t.dataset.cfg != null) { const box = $("#cfg-" + i, b); if (!box.hidden) { box.hidden = true; return; } box.hidden = false; return cfgForm(box, it); }
          const sibs = S.items.filter(x => x.slot_key === it.slot_key), j = sibs.indexOf(it), o = sibs[j + (t.dataset.up != null ? -1 : 1)]; if (!o) return;
          const a = S.items.indexOf(it), c = S.items.indexOf(o); S.items[a] = o; S.items[c] = it; setDirty(); drawB();
        };
        b.onchange = (e) => { const s = e.target.closest("[data-sec]"); if (s) { S.items[Number(s.dataset.sec)].section = s.value; setDirty(); } };
      }
      const CFG = [["x", "X", 0, "number"], ["y", "Y", 0, "number"], ["z", "Z / lapisan", 0, "number"], ["scale", "Skala", 1, "number"], ["rotate", "Rotasi (°)", 0, "number"], ["opacity", "Opasitas (0-1)", 1, "number"], ["speed", "Durasi anim. (dtk)", 6, "number"]];
      const ANIMS = [["none", "Tanpa animasi"], ["fade", "Muncul perlahan"], ["float", "Melayang"], ["sway", "Bergoyang"], ["zoom", "Zoom lembut"], ["slide", "Geser masuk"], ["spin", "Berputar pelan"]];
      function cfgForm(box, it) {
        const c = it.config || {}, is2d = S.tpl.package_type === "essential";
        box.innerHTML = `<p class="sub">${is2d ? "Posisi dalam % dari section (X, Y), lebar dalam % (W). Skala 1 = ukuran asli." : "Posisi/rotasi/skala objek 3D dalam satuan scene. Dipakai renderer & simulasi pratinjau."}</p><div class="st-cg">${CFG.map(f => `<label class="fld sm">${f[1]}<input type="number" step="any" data-k="${f[0]}" value="${c[f[0]] != null ? esc(c[f[0]]) : ""}" placeholder="${f[2]}"></label>`).join("")}${is2d ? `<label class="fld sm">Lebar W (%)<input type="number" step="any" data-k="w" value="${c.w != null ? esc(c.w) : ""}" placeholder="auto"></label>` : ""}<label class="fld sm">Animasi<select data-k="anim">${ANIMS.map(a => `<option value="${a[0]}" ${(c.anim || "none") === a[0] ? "selected" : ""}>${a[1]}</option>`).join("")}</select></label></div>`;
        box.oninput = box.onchange = (e) => { const k = e.target.dataset.k; if (!k) return; const v = e.target.value; const cfg = it.config = it.config || {}; if (v === "" || v === "none") delete cfg[k]; else cfg[k] = e.target.type === "number" ? Number(v) : v; setDirty(); };
      }

      // pemilih aset dari library
      function openPicker(slot) {
        const pd = dialog("pdlg", "al-dlg"), p = S.tpl.package_type; let PQ = { q: "", cat: "" }, sel = {}, rows = [];
        pd.innerHTML = `${closeBtn}<h2 id="pdlg-t">Pilih aset untuk <code>${esc(slot)}</code></h2><p class="sub">Hanya aset yang kompatibel dengan paket ${esc(PKG[p])} yang ditampilkan.</p>
        <div class="tool"><label class="fld grow">Cari<span class="sbox"><input type="search" id="p-q" placeholder="Nama atau tag..."></span></label><label class="fld">Kategori<select id="p-cat"><option value="">Semua</option>${CATS.filter(c => c.package_type === p && c.active).map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join("")}</select></label>${canW ? '<button class="btn o" type="button" id="p-up">Unggah baru</button>' : ""}</div>
        <div id="p-res" class="al-pick"><div class="sk h4"></div></div><div class="row-end"><span class="sub" id="p-n"></span><button class="btn o" type="button" data-close>Batal</button><button class="btn" type="button" id="p-ok" disabled>Pakai</button></div>`;
        pd.addEventListener("click", (e) => { if (e.target.closest("[data-close]")) pd.close(); });
        const load = () => {
          let qy = sb.from("assets").select("*").is("deleted_at", null).eq("status", "active").contains("package_types", [p]);
          if (PQ.cat) qy = qy.eq("category_id", PQ.cat);
          if (PQ.q) qy = qy.or("name.ilike.%" + clean(PQ.q) + "%,tags.cs.{" + clean(PQ.q).replace(/\s+/g, "") + "}");
          qy.order("created_at", { ascending: false }).limit(60).then(r => {
            if (r.error) { $("#p-res", pd).innerHTML = empty("Gagal memuat", "Coba lagi."); return; }
            rows = r.data || [];
            $("#p-res", pd).innerHTML = rows.length ? `<ul class="al-grid">${rows.map((a, i) => { const used = S.items.some(x => x.slot_key === slot && x.asset_id === a.id); return `<li><button type="button" class="al-card ${sel[a.id] ? "on" : ""}" data-i="${i}" ${used ? "disabled" : ""} aria-pressed="${!!sel[a.id]}">${thumb(a)}<span class="al-n">${esc(a.name)}</span><span class="al-m">${esc(a.file_type.toUpperCase())} · ${dims(a)} · ${fmtSize(a.file_size)}</span>${used ? '<span class="al-b"><i class="al-use">sudah di slot ini</i></span>' : ""}</button></li>`; }).join("")}</ul>` : empty("Belum ada aset kompatibel", "Unggah aset baru untuk paket ini.");
            upd();
          });
        };
        const upd = () => { const n = Object.keys(sel).length; $("#p-n", pd).textContent = n ? n + " dipilih" : ""; $("#p-ok", pd).disabled = !n; };
        $("#p-res", pd).onclick = (e) => { const c = e.target.closest("[data-i]"); if (!c || c.disabled) return; const a = rows[Number(c.dataset.i)]; if (sel[a.id]) delete sel[a.id]; else sel[a.id] = a; c.classList.toggle("on"); c.setAttribute("aria-pressed", String(!!sel[a.id])); upd(); };
        $("#p-q", pd).onkeydown = (e) => { if (e.key === "Enter") { e.preventDefault(); PQ.q = e.target.value.trim(); load(); } };
        $("#p-cat", pd).onchange = (e) => { PQ.cat = e.target.value; load(); };
        const upb = $("#p-up", pd); if (upb) upb.onclick = () => openUpload({ pkg: p, lock: true, onDone: (made) => { made.forEach(a => { sel[a.id] = a; }); setTimeout(() => { pd.showModal && !pd.open && pd.showModal(); load(); }, 0); } });
        $("#p-ok", pd).onclick = () => {
          Object.keys(sel).forEach(id => { const a = sel[id]; if (S.items.some(x => x.slot_key === slot && x.asset_id === id)) return; S.items.push({ slot_key: slot, section: defaultSection(slot), position: S.items.filter(x => x.slot_key === slot).length, config: {}, asset: a, asset_id: id }); });
          pd.close(); setDirty(); if (S.tab === "b") drawB();
        };
        pd.showModal(); load();
      }
      function defaultSection(slot) { const keys = (S.layout.sections || []).map(s => s.key); const hit = keys.filter(k => slot.indexOf(k) > -1)[0]; if (hit) return hit; if (/opening|intro|hero/.test(slot) && keys.indexOf("opening") > -1) return "opening"; if (/closing/.test(slot) && keys.indexOf("closing") > -1) return "closing"; return keys.indexOf("general") > -1 ? "general" : (keys[0] || "general"); }

      // ----- C. Layout & Section
      function drawC() {
        const p = S.tpl.package_type, L = S.layout, cin = p === "signature";
        const cnt = (k) => S.items.filter(x => x.section === k).length;
        pane("c").innerHTML = `${scopeBar()}<div class="card" style="box-shadow:none">
          <div class="card-h"><h2>Section undangan</h2><div>${canW ? '<button class="btn o sm" type="button" id="c-def">Isi bawaan paket</button>' : ""}</div></div>
          <p class="sub">Renderer: <b>${p === "essential" ? "2D scroll (Essential)" : p === "signature" ? "3D cinematic (Signature)" : "Virtual venue live guest (Luxe)"}</b>. Urutan section menentukan urutan tampil. Aset ditautkan ke section di tab B.</p>
          <ul class="st-secs">${L.sections.map((s, i) => `<li data-i="${i}"><label class="chk-l"><input type="checkbox" data-en ${s.enabled ? "checked" : ""} ${canW ? "" : "disabled"} aria-label="Aktif"></label><label class="fld sm">Kunci<input data-key value="${esc(s.key)}" maxlength="40" ${canW ? "" : "disabled"}></label><label class="fld sm">Nama<input data-lab value="${esc(s.label)}" maxlength="60" ${canW ? "" : "disabled"}></label>${cin ? `<label class="fld sm">Durasi (dtk)<input type="number" min="1" max="120" data-dur value="${s.duration || ""}" placeholder="6" ${canW ? "" : "disabled"}></label>` : ""}<span class="al-m">${cnt(s.key)} aset</span>${canW ? `<div class="st-btns"><button type="button" class="btn o sm" data-mu aria-label="Naik">↑</button><button type="button" class="btn o sm" data-md aria-label="Turun">↓</button><button type="button" class="btn o sm bad" data-mx>Hapus</button></div>` : ""}</li>`).join("")}</ul>
          ${canW ? '<button class="btn o" type="button" id="c-add">Tambah section</button>' : ""}</div>`;
        bindScope(); const c = pane("c");
        const read = () => { $$("li[data-i]", c).forEach(li => { const s = L.sections[Number(li.dataset.i)]; s.enabled = $("[data-en]", li).checked; s.key = slug($("[data-key]", li).value) || s.key; s.label = $("[data-lab]", li).value.trim() || s.key; const du = $("[data-dur]", li); if (du) { const v = Number(du.value); if (v) s.duration = v; else delete s.duration; } }); };
        c.oninput = c.onchange = (e) => { if (e.target.closest("li[data-i]")) { const old = L.sections.map(s => s.key); read(); S.items.forEach(it => { const i = old.indexOf(it.section); if (i > -1 && L.sections[i] && L.sections[i].key !== it.section) it.section = L.sections[i].key; }); setDirty(); } };
        c.onclick = (e) => {
          const t = e.target.closest("button"); if (!t) return;
          if (t.id === "c-add") { read(); const n = L.sections.length + 1; L.sections.push({ key: "section_" + n, label: "Section " + n, enabled: true }); setDirty(); return drawC(); }
          if (t.id === "c-def") { L.sections = defaultLayout(p).sections; setDirty(); return drawC(); }
          const li = t.closest("li[data-i]"); if (!li) return; read(); const i = Number(li.dataset.i);
          if (t.dataset.mx != null) { if (cnt(L.sections[i].key)) { toast("Pindahkan atau lepas aset section ini di tab B dulu.", "bad"); return; } L.sections.splice(i, 1); }
          else { const j = i + (t.dataset.mu != null ? -1 : 1); if (j < 0 || j >= L.sections.length) return; const tmp = L.sections[i]; L.sections[i] = L.sections[j]; L.sections[j] = tmp; }
          setDirty(); drawC();
        };
        if (!canW) $$("input", c).forEach(x => { x.disabled = true; });
      }

      // ----- D. Preview
      function drawD() {
        const p = S.tpl.package_type;
        pane("d").innerHTML = `${scopeBar()}<div class="st-pvbar"><div role="group" aria-label="Perangkat"><button type="button" class="btn o sm" data-dev="mobile" aria-pressed="${S.dev === "mobile"}">Mobile</button><button type="button" class="btn o sm" data-dev="desktop" aria-pressed="${S.dev === "desktop"}">Desktop</button></div><button type="button" class="btn o sm" id="pv-re">Muat ulang</button></div>
        <p class="sub st-sim">Pratinjau dari data yang sedang diedit (belum perlu disimpan). ${p === "essential" ? "Ini render 2D sesuai posisi & animasi aset." : "Ini <b>simulasi</b> tata letak untuk memeriksa aset dan urutan section; mesin 3D penuh dijalankan di halaman undangan."}</p>
        <div class="st-dev ${S.dev}" id="pv-dev"></div>`;
        bindScope(); const dv = $("#pv-dev", dl);
        const render = () => { dv.innerHTML = buildPreview(p, S.layout, S.items, S.tpl); mount(dv); if (p !== "essential") wirePlay(dv); };
        pane("d").onclick = (e) => { const b = e.target.closest("[data-dev]"); if (b) { S.dev = b.dataset.dev; dv.className = "st-dev " + S.dev; $$("[data-dev]", pane("d")).forEach(x => x.setAttribute("aria-pressed", String(x.dataset.dev === S.dev))); } if (e.target.closest("#pv-re")) render(); };
        render();
      }

      // ----- simpan
      function saveAll() {
        const er = $("#sa-e", dl); er.textContent = "";
        const p = collect(tab.fields, fa); if (!p) { showTab("a"); er.textContent = "Periksa kolom yang ditandai."; return; }
        const bt = $("#st-save", dl); bt.disabled = true; bt.textContent = "Menyimpan...";
        const fin = (ok) => { bt.disabled = false; bt.textContent = "Simpan"; if (ok) { S.dirty = false; msg("Tersimpan."); } };
        const changedPkg = S.tpl && p.package_type !== S.tpl.package_type;
        const go = () => {
          const q = S.tpl ? sb.from("templates").update(p).eq("id", S.tpl.id).select("*,event_categories(name)").single() : sb.from("templates").insert(p).select("*,event_categories(name)").single();
          q.then(r => {
            if (r.error) { er.textContent = fail(r.error, "Gagal menyimpan template"); showTab("a"); return fin(false); }
            const fresh = !S.tpl; S.tpl = r.data; $("#sdlg-t", dl).textContent = "Edit template: " + S.tpl.name;
            $$("[data-st]", dl).forEach(b => { b.disabled = false; });
            if (reload) reload();
            if (fresh) { S.layout = defaultLayout(S.tpl.package_type); S.items = []; S.loaded = true; S.mapped = 0; toast("Template dibuat. Lanjutkan ke tab Asset Management.", "ok"); fin(true); return showTab("b"); }
            if (!S.loaded) { toast("Informasi template tersimpan.", "ok"); return fin(true); }
            const items = S.items.map((it, i) => ({ slot_key: it.slot_key, section: it.section || "general", asset_id: it.asset_id, position: i, config: it.config || {} }));
            sb.rpc("admin_save_template_mapping", { p_template: S.tpl.id, p_theme: S.scope || null, p_layout: S.layout, p_items: items }).then(m => {
              if (m.error) { fail(m.error, "Template tersimpan, tetapi aset gagal disimpan"); return fin(false); }
              if (!m.data.ok) { const t = errText(m.data.error) + (m.data.asset ? " (" + m.data.asset + ")" : "") + (m.data.slot ? " [" + m.data.slot + "]" : ""); toast("Template tersimpan, tetapi aset ditolak: " + t, "bad"); msg(t); return fin(false); }
              S.mapped = (S.mappedOther || 0) + items.length; toast("Template, aset, dan layout tersimpan.", "ok"); fin(true);
            });
          });
        };
        if (changedPkg && S.mapped > 0) { er.textContent = "Jenis paket tidak bisa diubah selama template masih punya aset terpasang. Lepas semua aset dulu (tab B)."; showTab("a"); return fin(false); }
        if (p.status === "published" && S.loaded && !S.items.length && S.tpl) { dlgConfirm("Template ini belum punya aset pada cakupan yang sedang dibuka. Tetap simpan sebagai Published?", "Tetap simpan").then(ok => ok ? go() : fin(false)); return; }
        go();
      }
      const sv = $("#st-save", dl); if (sv) sv.onclick = saveAll;
      dl.addEventListener("click", async (e) => { if (e.target.closest("[data-close]")) { if (S.dirty && !(await dlgConfirm("Ada perubahan yang belum disimpan. Tutup tanpa menyimpan?", "Tutup"))) return; dl.close(); } });
      dl.addEventListener("cancel", (e) => { if (S.dirty) { e.preventDefault(); dlgConfirm("Ada perubahan yang belum disimpan. Tutup tanpa menyimpan?", "Tutup").then(ok => { if (ok) dl.close(); }); } });
      dl.showModal();
      if (S.tpl) loadScope("").catch(() => { /* dimuat ulang saat tab B dibuka */ });
    }

    /* ---------- renderer pratinjau ---------- */
    function layers(items, sec) { return items.filter(it => it.section === sec).sort((a, b) => a.position - b.position); }
    function el2d(it, mode) {
      const a = it.asset, c = it.config || {}, bg = /background|backdrop|bg|environment|venue|ground|floor/.test(it.slot_key) && isImg(a);
      const anim = c.anim && c.anim !== "none" ? ` an-${c.anim}` : "", dur = c.speed ? `animation-duration:${Number(c.speed)}s;` : "";
      if (bg) return `<img class="pv-l pv-bg${anim}" style="${dur}opacity:${c.opacity != null ? c.opacity : 1}" src="${esc(a.file_url)}" alt="" loading="lazy">`;
      const x = c.x != null ? c.x : 50, y = c.y != null ? c.y : 50, w = c.w != null ? c.w + "%" : (isImg(a) ? "40%" : "auto");
      const tf = `translate(-50%,-50%) scale(${c.scale != null ? c.scale : 1}) rotate(${c.rotate || 0}deg)`;
      const st = `left:${x}%;top:${y}%;width:${w};z-index:${(c.z || 0) + 2};opacity:${c.opacity != null ? c.opacity : 1};${dur}`;
      if (isImg(a)) return `<span class="pv-l pv-box${anim}" style="${st}"><img src="${esc(a.file_url)}" alt="" loading="lazy" style="transform:${tf}"></span>`;
      if (a.file_type === "glb" || a.file_type === "gltf") return `<model-viewer class="pv-l pv-box pv-mv" style="${st}height:42%;transform:${tf}" src="${esc(a.file_url)}" auto-rotate camera-controls alt="${esc(a.name)}"></model-viewer>`;
      if (a.file_type === "json") return `<span class="pv-l pv-box" style="${st}"><span data-lottie="${esc(a.file_url)}" style="display:block;width:100%;aspect-ratio:1;transform:${tf}"></span></span>`;
      if (["mp3", "ogg", "wav"].indexOf(a.file_type) > -1) return `<span class="pv-aud" title="${esc(a.name)}">♪ ${esc(a.name)}</span>`;
      return `<span class="pv-aud">${esc(a.name)} (${esc(a.file_type.toUpperCase())})</span>`;
    }
    function buildPreview(pkg, layout, items, tpl) {
      const secs = (layout.sections || []).filter(s => s.enabled !== false);
      const known = secs.map(s => s.key), orphan = items.filter(it => known.indexOf(it.section) < 0);
      const list = secs.slice(); if (orphan.length) list.push({ key: "__x", label: "Tanpa section" });
      const sample = { opening: "Anindya & Raka", intro: "Anindya & Raka", couple: "Mempelai", event: "Akad & Resepsi", rsvp: "RSVP & Ucapan", closing: "Terima kasih", gallery: "Galeri", story: "Cerita Kami", venue: "Venue", lobby: "Selamat datang", guestbook: "Buku tamu", stage: "Pelaminan", interaction: "Interaksi tamu" };
      const body = list.map((s, idx) => {
        const ls = s.key === "__x" ? orphan : layers(items, s.key);
        const bgs = ls.filter(it => /background|backdrop|bg|environment|venue|ground|floor/.test(it.slot_key));
        return `<section class="pv-sec pv-${pkg}" data-scene="${idx}"><span class="pv-tag">${esc(s.label)}${s.duration ? " · " + s.duration + " dtk" : ""}</span>${ls.map(it => el2d(it)).join("")}<div class="pv-txt"><small>${esc(tpl && tpl.name || "Template")}</small><h4>${esc(sample[s.key] || s.label)}</h4><p>Contoh teks. Isi asli berasal dari data undangan pelanggan.</p></div>${!ls.length ? '<p class="pv-empty">Belum ada aset di section ini.</p>' : ""}</section>`;
      }).join("");
      if (!list.length) return '<p class="sub" style="padding:24px">Belum ada section aktif. Atur di tab C.</p>';
      if (pkg === "signature") return `<div class="pv-cine"><div class="pv-bar"><button type="button" class="btn sm" data-play>▶ Putar sinematik</button><span class="al-m" data-pos>Scene 1/${list.length}</span></div><div class="pv-stage">${body}</div></div>`;
      if (pkg === "luxe") return `<div class="pv-venue"><div class="pv-bar"><button type="button" class="btn sm" data-play>▶ Tur venue</button><span class="al-m" data-pos>Area 1/${list.length}</span></div><div class="pv-stage">${body}</div><p class="al-hint">Tamu live (avatar, interaksi, mini-game) dijalankan oleh mesin Live Guest; slot terkait tampil sebagai aset statis di sini.</p></div>`;
      return `<div class="pv-2d">${body}</div>`;
    }
    function wirePlay(root) {
      const btn = $("[data-play]", root), sc = $$(".pv-sec", root), pos = $("[data-pos]", root); if (!btn || !sc.length) return;
      let cur = 0, timer = null;
      const show = (i) => { cur = i; sc.forEach((s, k) => s.classList.toggle("on", k === i)); if (pos) pos.textContent = "Scene " + (i + 1) + "/" + sc.length; };
      show(0);
      btn.onclick = () => { if (timer) { clearInterval(timer); timer = null; btn.textContent = "▶ Putar"; return; } btn.textContent = "❚❚ Jeda"; timer = setInterval(() => { if (!root.isConnected) { clearInterval(timer); return; } show((cur + 1) % sc.length); }, 2600); };
      root.addEventListener("click", (e) => { const s = e.target.closest(".pv-sec"); if (s) show(sc.indexOf(s)); });
    }

    /* ============================================================
       PENDAFTARAN MODUL
       ============================================================ */
    const tm = M.filter(m => m.key === "templates")[0];
    if (tm) {
      const t0 = tm.tabs[0]; t0.studio = openStudio;
      tm.tabs.push({
        key: "themes", label: "Tema", table: "themes", order: ["sort", true], search: ["name", "slug"], title: r => r.name,
        filters: [{ k: "status", l: "Status", o: [["draft", "Draft"], ["published", "Published"], ["archived", "Arsip"]] }],
        cols: [{ k: "thumbnail_url", l: "", f: v => v ? `<img src="${esc(v)}" alt="" style="width:56px;height:42px;object-fit:cover;border-radius:8px">` : "" }, { k: "name", l: "Tema", f: (v, r) => `<b>${esc(v)}</b><span class="cell-s">${esc(r.slug)}</span>` }, { k: "status", l: "Status", f: badge }, { k: "sort", l: "Urutan", num: 1 }],
        fields: [{ k: "name", l: "Nama tema", req: 1, max: 80 }, { k: "slug", l: "Slug tema", req: 1, pat: /^[a-z0-9-]{2,60}$/, help: "Huruf kecil, angka, minus. Dipakai sebagai kunci tema pada aset." }, { k: "description", l: "Deskripsi", t: "textarea", full: 1 }, { k: "thumbnail_url", l: "Thumbnail tema", t: "image", folder: "themes", full: 1 }, { k: "status", l: "Status", t: "select", opts: X.PUB, req: 1, def: "draft", help: "Hanya tema Published yang bisa dipilih pelanggan." }, { k: "sort", l: "Urutan", t: "number", def: 0 }],
        note: "Satu template universal per paket dipakai banyak tema. Tema berisi set aset yang menimpa aset umum template (atur di Studio template, tab B)."
      });
    }
    const lib = {
      key: "assetlib", label: "Asset Library", icon: "layout", perm: "templates", grp: "Pelanggan & Acara", tabs: [
        { key: "lib", label: "Library", render: renderLibrary },
        {
          key: "cats", label: "Kategori Aset", table: "asset_categories", order: ["package_type", true], search: ["name", "slug"], title: r => r.name,
          filters: [{ k: "package_type", l: "Paket", o: PKGS.map(p => [p, PKG[p]]) }],
          cols: [{ k: "name", l: "Kategori", f: v => `<b>${esc(v)}</b>` }, { k: "package_type", l: "Paket", f: v => esc(PKG[v] || v) }, { k: "kind", l: "Jenis" }, { k: "allowed_ext", l: "Format", f: v => esc((v || []).join(", ")) }, { k: "max_bytes", l: "Maks.", num: 1, f: v => fmtSize(v) }, { k: "active", l: "Status", f: v => badge(v ? "aktif" : "nonaktif") }],
          fields: [{ k: "package_type", l: "Paket", t: "select", opts: PKGS.map(p => [p, PKG[p]]), req: 1, ro: 1 }, { k: "name", l: "Nama kategori", req: 1, max: 60 }, { k: "slug", l: "Slug", req: 1, pat: /^[a-z0-9-]{2,40}$/, ro: 1 }, { k: "kind", l: "Jenis", t: "select", req: 1, opts: ["image", "vector", "animation", "model", "texture", "hdr", "audio", "data"].map(x => [x, x]) }, { k: "allowed_ext", l: "Format diizinkan (pisah koma)", req: 1, full: 1, help: "Contoh: png,jpg,webp. Format yang tidak dikenal validator server akan tetap ditolak saat unggah." }, { k: "max_bytes", l: "Ukuran maks. (byte)", t: "number", min: 1024, max: 104857600, def: 10485760 }, { k: "sort", l: "Urutan", t: "number", def: 0 }, { k: "active", l: "Aktif", t: "bool", def: true }],
          beforeSave: (p) => { p.allowed_ext = String(p.allowed_ext).toLowerCase().split(/[ ,]+/).filter(Boolean); CATS = null; },
          note: "Mengubah kategori tidak mengubah aset yang sudah terunggah. Registrasi aset selalu divalidasi ulang di server."
        }
      ]
    };
    M.splice(Math.max(0, M.indexOf(tm)) + 1, 0, lib);
  });
})();
