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
    const LIC = { belum_diatur: "Belum diatur", milik_sendiri: "Milik sendiri / buatan sendiri", berlisensi_komersial: "Berlisensi komersial (dibeli)", cc0: "CC0 / domain publik", cc_by: "CC BY (wajib kredit)", ai_generated: "Hasil AI generator", lainnya: "Lainnya" };
    const SRC = { upload: "Unggahan admin", ai_generator: "AI Generator", stok: "Situs stok", klien: "Dari klien", lainnya: "Lainnya" };
    const STL = { active: "Aktif", inactive: "Nonaktif", archived: "Arsip" };
    const ACT = { dipasang: "Dipasang", dilepas: "Dilepas" };
    const SIM = { isi_sama: "Isi file identik", ukuran_sama: "Format, dimensi, dan ukuran sama", nama_sama: "Nama sama" };
    const FM = window.NM_ASSET_FORMS || {};
    const pcfg = (pkg) => Object.assign({ groups: [], fields: {}, slots: [], config: [], layout: [], title: pkg, intro: "" }, FM[pkg] || {});
    const SLOTS = { get essential() { return pcfg("essential").slots.map(x => x.key); }, get signature() { return pcfg("signature").slots.map(x => x.key); }, get luxe() { return pcfg("luxe").slots.map(x => x.key); } };
    const slotInfo = (pkg, key) => pcfg(pkg).slots.filter(x => x.key === key)[0] || null;
    const groupOfCat = (pkg, slug) => pcfg(pkg).groups.filter(g => g.cats.indexOf(slug) > -1)[0] || null;
    const catSlug = (id) => { const c = (CATS || []).filter(x => x.id === id)[0]; return c ? c.slug : ""; };
    const getPath = (o, path) => path.split(".").reduce((a, k) => (a && typeof a === "object" ? a[k] : undefined), o);
    const setPath = (o, path, v) => { const ks = path.split("."); let c = o; ks.slice(0, -1).forEach(k => { if (!c[k] || typeof c[k] !== "object") c[k] = {}; c = c[k]; }); if (v === undefined) delete c[ks[ks.length - 1]]; else c[ks[ks.length - 1]] = v; };
    /* render & baca isian berdasarkan definisi field (dipakai form unggah, detail aset, pengaturan penempatan, layout) */
    function fieldHTML(f, val, pre) {
      const id = pre + f.k.replace(/\./g, "-"), v = val == null ? (f.def == null ? "" : f.def) : val, rq = f.req ? " required" : "", hp = f.help ? `<small class="al-hint">${esc(f.help)}</small>` : "";
      if (f.t === "bool") return `<label class="chk-l"><input type="checkbox" id="${id}" data-fk="${esc(f.k)}" ${v === true || v === "true" ? "checked" : ""}> ${esc(f.l)}</label>`;
      if (f.t === "select") return `<label class="fld">${esc(f.l)}${f.req ? " *" : ""}<select id="${id}" data-fk="${esc(f.k)}"${rq}><option value="">${f.req ? "Pilih..." : "-"}</option>${(f.opts || []).map(o => `<option value="${esc(o[0])}" ${String(o[0]) === String(v) ? "selected" : ""}>${esc(o[1])}</option>`).join("")}</select>${hp}</label>`;
      if (f.t === "number") return `<label class="fld">${esc(f.l)}${f.req ? " *" : ""}<input type="number" step="any" id="${id}" data-fk="${esc(f.k)}" value="${v === "" ? "" : esc(v)}" placeholder="${f.ph != null ? esc(f.ph) : ""}"${f.min != null ? ` min="${f.min}"` : ""}${f.max != null ? ` max="${f.max}"` : ""}${rq}>${hp}</label>`;
      return `<label class="fld">${esc(f.l)}${f.req ? " *" : ""}<input id="${id}" data-fk="${esc(f.k)}" maxlength="${f.max || 80}" value="${esc(v)}"${rq}>${hp}</label>`;
    }
    function readFields(fields, root, pre) {
      const out = {}, errs = [];
      fields.forEach(f => {
        const el = $("#" + pre + f.k.replace(/\./g, "-"), root); if (!el) return; let v;
        if (f.t === "bool") { if (el.checked) v = true; else if (f.def === true) v = false; else return; }
        else { const raw = String(el.value).trim(); if (raw === "") { if (f.req) errs.push(f.l); return; }
          if (f.t === "number") { v = Number(raw); if (isNaN(v) || (f.min != null && v < f.min) || (f.max != null && v > f.max)) { errs.push(f.l + " (di luar batas)"); return; } }
          else { v = raw; if (f.pat && !new RegExp(f.pat).test(v)) { errs.push(f.l + " (format salah)"); return; } } }
        out[f.k] = v;
      });
      return { v: out, errs };
    }
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
      belum_dikonfigurasi: "AI Asset Generator belum dikonfigurasi.", kuota_harian: "Batas 40 gambar per 24 jam tercapai.", provider_gagal: "Provider AI gagal membuat gambar. Coba lagi nanti.", hasil_tidak_valid: "Provider tidak menghasilkan gambar yang valid untuk kategori ini.", kategori_tidak_didukung_ai: "AI hanya membuat gambar. Kategori 3D/audio/animasi diunggah manual.", prompt_tidak_valid: "Prompt 3-2000 karakter.", jumlah_tidak_valid: "Jumlah 1-4 gambar.", kategori_tidak_cocok: "Kategori bukan milik paket yang dipilih.", perlu_login: "Silakan masuk terlebih dahulu.", jaringan: "Tidak bisa terhubung ke server.",
      attrs_tidak_valid: "Isian khusus tidak valid (maks. 20 isian, nilai teks/angka/ya-tidak).", unauthorized: "Sesi berakhir. Muat ulang dan masuk lagi.", status_tidak_valid: "Status tidak valid.", lisensi_tidak_valid: "Lisensi tidak valid.", sumber_tidak_valid: "Sumber tidak valid.", url_tidak_valid: "Tautan sumber harus diawali http:// atau https://.", tanggal_tidak_valid: "Tanggal tidak valid.",
      bukti_lisensi_kosong: "Lisensi ini wajib disertai kredit, catatan, atau tautan sumber.", tipe_berbeda: "Versi baru harus berformat sama dengan aset.", sama_dengan_versi_sekarang: "File ini sama persis dengan versi yang sedang dipakai.", versi_sudah_ada: "File ini pernah menjadi versi aset ini. Pulihkan dari riwayat versi.",
      versi_tidak_ditemukan: "Versi tidak ditemukan.", versi_sudah_aktif: "Versi ini sudah aktif.", dipakai_template_terbit: "Dipakai di template yang sudah terbit.", aksi_tidak_valid: "Aksi tidak valid.", tidak_ada_aset: "Pilih aset dulu.", terlalu_banyak: "Maksimal 200 aset sekali proses.", terlalu_banyak_tag: "Maksimal 20 tag per aset.", gagal: "Gagal diproses.", tidak_ditemukan: "Aset tidak ditemukan."
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
    async function callFn(name, body) {
      const r = await sb.functions.invoke(name, { body });
      if (r.error) {
        let j = null; try { j = await r.error.context.json(); } catch (e) { /* abaikan */ }
        return { ok: false, error: (j && j.error) || (r.error.name === "FunctionsFetchError" ? "jaringan" : "gagal"), message: j && j.message, detail: j };
      }
      return r.data && r.data.ok ? r.data : { ok: false, error: (r.data && r.data.error) || "gagal", message: r.data && r.data.message };
    }
    const callRegister = (body) => callFn("asset-register", body);

    /* ============================================================
       UNGGAH ASET: form berbeda per paket (konfigurasi di asset-forms.js)
       ============================================================ */
    function openUpload(opt) {
      opt = opt || {};
      Promise.all([loadCats(), loadThemes().catch(() => [])]).then(() => {
        const dl = dialog("udlg", "al-dlg");
        dl.innerHTML = `${closeBtn}<h2 id="udlg-t">Unggah aset</h2>
        <div class="fgrid" style="margin-top:6px">
          <label class="fld full">Paket${opt.lock ? " (mengikuti template)" : ""}<select id="u-pkg" ${opt.lock ? "disabled" : ""}>${PKGS.map(p => `<option value="${p}" ${p === (opt.pkg || "essential") ? "selected" : ""}>${esc(pcfg(p).title)}</option>`).join("")}</select></label>
          <p class="sub full" id="u-intro" style="margin:0"></p>
          <fieldset class="al-groups full" id="u-groups"><legend>Jenis aset</legend><div id="u-glist"></div></fieldset>
          <label class="fld">Kategori<select id="u-cat"></select></label>
          <label class="fld">Tema (opsional)<input id="u-theme" list="u-themes" maxlength="60" placeholder="mis. batak, keraton"><datalist id="u-themes">${(THEMES || []).map(t => `<option value="${esc(t.slug)}">${esc(t.name)}</option>`).join("")}</datalist></label>
          <div class="fgrid full al-attrs" id="u-fields" style="margin:0"></div>
          <label class="fld full">Tag (pisahkan koma)<input id="u-tags" maxlength="200" placeholder="floral, emas"></label>
          <label class="chk-l full"><input type="checkbox" id="u-also" ${opt.lock ? "disabled" : ""}> Aset juga boleh dipakai paket lain yang formatnya kompatibel</label>
        </div>
        <p class="sub" id="u-rule" style="margin:10px 0"></p>
        <fieldset class="al-lic full"><legend>Lisensi &amp; sumber (berlaku untuk semua file ini)</legend><div class="fgrid" style="margin:0">
          <label class="fld">Lisensi<select id="u-lic">${Object.keys(LIC).filter(k => k !== "ai_generated").map(k => `<option value="${k}">${esc(LIC[k])}</option>`).join("")}</select></label>
          <label class="fld">Sumber<select id="u-src">${Object.keys(SRC).filter(k => k !== "ai_generator").map(k => `<option value="${k}">${esc(SRC[k])}</option>`).join("")}</select></label>
          <label class="fld full">Kredit / tautan sumber (wajib untuk CC BY dan berlisensi komersial)<input id="u-credit" maxlength="160" placeholder="mis. Freepik - Nama Seniman"></label></div></fieldset>
        <div class="full" id="u-e" role="alert"></div>
        <div class="al-drop" id="u-drop" tabindex="0" role="button" aria-label="Pilih atau seret file ke sini"><b>Seret file ke sini</b><span>atau klik untuk memilih (bisa banyak file)</span><input type="file" id="u-file" multiple hidden></div>
        <ul class="al-files" id="u-list"></ul>
        <div class="row-end"><button class="btn o" type="button" data-close>Tutup</button><button class="btn" type="button" id="u-go" disabled>Unggah</button></div>`;
        const files = []; let GK = opt.group || "";
        const pkg = () => $("#u-pkg").value;
        const grp = () => pcfg(pkg()).groups.filter(g => g.key === GK)[0] || pcfg(pkg()).groups[0] || null;
        const catsOf = () => { const g = grp(); return g ? g.cats.map(sl => CATS.filter(c => c.package_type === pkg() && c.slug === sl && c.active)[0]).filter(Boolean) : CATS.filter(c => c.package_type === pkg() && c.active); };
        const cur = () => CATS.filter(c => c.id === $("#u-cat").value)[0];
        const rule = () => { const c = cur(), g = grp(); $("#u-rule").innerHTML = (g && g.hint ? esc(g.hint) + "<br>" : "") + (c ? `Format: <b>${esc(c.allowed_ext.join(", ").toUpperCase())}</b> · maks. ${fmtSize(c.max_bytes)} per file.` : ""); };
        const revalidate = () => { const c = cur(); files.forEach(f => { if (f.st === "ok" || f.st === "run") return; const bad = !c ? "Pilih kategori dulu." : c.allowed_ext.indexOf(f.ext) < 0 ? "Format ." + f.ext + " tidak diizinkan di kategori ini." : f.file.size > c.max_bytes ? "Melebihi " + fmtSize(c.max_bytes) + "." : ""; f.st = bad ? "bad" : ""; f.msg = bad; }); draw(); };
        const fillCats = (prefer) => { const cs = catsOf(); $("#u-cat").innerHTML = cs.map(c => `<option value="${c.id}" ${c.slug === prefer ? "selected" : ""}>${esc(c.name)}</option>`).join(""); rule(); };
        const drawFields = () => {
          const g = grp(), cfg = pcfg(pkg()), fs = g ? g.fields.map(k => cfg.fields[k]).filter(Boolean) : [];
          $("#u-fields").innerHTML = fs.length ? `<p class="sub full" style="margin:0"><b>Isian khusus ${esc(g.label)}</b></p>` + fs.map(f => fieldHTML(f, null, "uf-")).join("") : "";
          fs.filter(f => f.catMap).forEach(f => { const el = $("#uf-" + f.k); if (el) el.onchange = () => { const sl = f.catMap[el.value]; const c = sl && catsOf().filter(x => x.slug === sl)[0]; if (c) { $("#u-cat").value = c.id; rule(); revalidate(); } }; });
        };
        const drawGroups = () => {
          const cfg = pcfg(pkg()); $("#u-intro").textContent = cfg.intro;
          if (!cfg.groups.some(g => g.key === GK)) GK = cfg.groups[0] ? cfg.groups[0].key : "";
          $("#u-glist").innerHTML = cfg.groups.map(g => `<label class="al-g"><input type="radio" name="u-g" value="${esc(g.key)}" ${g.key === GK ? "checked" : ""}><span><b>${esc(g.label)}</b></span></label>`).join("");
          fillCats(); drawFields(); revalidate();
        };
        const draw = () => {
          $("#u-list").innerHTML = files.map((f, i) => `<li class="al-f ${f.st || ""}"><span class="n">${esc(f.file.name)}</span><span class="s">${fmtSize(f.file.size)}</span><span class="m">${esc(f.msg || "Menunggu")}</span>${f.st ? "" : `<button type="button" class="btn o sm" data-rm="${i}" aria-label="Hapus dari daftar">×</button>`}</li>`).join("");
          $("#u-go").disabled = !files.some(f => !f.st);
        };
        const add = (list) => { Array.prototype.forEach.call(list, file => { files.push({ file, ext: (file.name.split(".").pop() || "").toLowerCase(), st: "", msg: "" }); }); revalidate(); };
        $("#u-pkg").onchange = () => { GK = ""; drawGroups(); };
        $("#u-glist").onchange = (e) => { if (e.target.name === "u-g") { GK = e.target.value; fillCats(); drawFields(); revalidate(); } };
        $("#u-cat").onchange = () => { rule(); revalidate(); };
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
          const c = cur(); if (!c) return; const er = $("#u-e"); er.textContent = "";
          const g = grp(), cfg = pcfg(pkg()), fs = g ? g.fields.map(k => cfg.fields[k]).filter(Boolean) : [], rd = readFields(fs, dl, "uf-");
          if (rd.errs.length) { er.textContent = "Lengkapi isian: " + rd.errs.join(", ") + "."; return; }
          const sess = await sb.auth.getSession(); const user = sess.data && sess.data.session && sess.data.session.user; if (!user) return toast("Sesi berakhir. Masuk lagi.", "bad");
          $("#u-go").disabled = true; $("#u-pkg").disabled = $("#u-cat").disabled = true; $$("#u-glist input, #u-fields input, #u-fields select", dl).forEach(x => { x.disabled = true; });
          const pk = pkg(), also = $("#u-also").checked;
          const theme = $("#u-theme").value.trim().toLowerCase() || null, tags = $("#u-tags").value.split(",").map(s => s.trim()).filter(Boolean).slice(0, 20);
          for (const f of files) {
            if (f.st) continue; f.st = "run"; f.msg = "Mengunggah..."; draw();
            const path = "incoming/" + user.id + "/" + Date.now() + "-" + uid() + "." + f.ext;
            const up = await sb.storage.from(BUCKET).upload(path, f.file, { contentType: MIME[f.ext] || "application/octet-stream", upsert: false });
            if (up.error) { f.st = "bad"; f.msg = /exceeded|size|payload/i.test(up.error.message || "") ? "Ukuran melebihi batas storage." : /mime|type/i.test(up.error.message || "") ? "Tipe file ditolak storage." : "Gagal mengunggah. Periksa izin & bucket."; draw(); continue; }
            f.msg = "Memeriksa file..."; draw();
            const base = f.file.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim().slice(0, 120) || "Aset";
            // paket tambahan hanya yang punya kategori aktif yang menerima format file ini (server tetap memvalidasi ulang)
            const pkgs = [pk]; if (also) PKGS.forEach(q => { if (q !== pk && CATS.some(x => x.package_type === q && x.active && x.allowed_ext.indexOf(f.ext) > -1)) pkgs.push(q); });
            const r = await callRegister({ path, name: base, category_id: c.id, package_types: pkgs, theme_key: theme, tags, attrs: rd.v });
            if (r.ok) {
              f.st = "ok"; f.msg = "Tersimpan"; created.push(r.asset);
              const lic = $("#u-lic").value, src = $("#u-src").value, cr = $("#u-credit").value.trim();
              if (lic !== "belum_diatur" || src !== "upload" || cr) {
                const mr = await sb.rpc("admin_asset_set_meta", { p_id: r.asset.id, p_patch: { license: lic, source: src, credit: cr, source_url: /^https?:\/\//i.test(cr) ? cr : "" } });
                if (mr.error || !mr.data || !mr.data.ok) f.msg = "Tersimpan, tetapi lisensi belum diatur" + (mr.data && mr.data.error ? ": " + errText(mr.data.error) : "") + ". Atur dari detail aset.";
              }
            } else { f.st = "bad"; f.msg = errText(r.error, r.error === "jaringan" ? "Tidak bisa terhubung ke server." : "Gagal memproses file."); }
            draw();
          }
          $("#u-go").disabled = true; $("#u-pkg").disabled = !!opt.lock; $("#u-cat").disabled = false; $$("#u-glist input, #u-fields input, #u-fields select", dl).forEach(x => { x.disabled = false; });
          if (created.length) toast(created.length + " aset masuk ke library.", "ok");
        };
        drawGroups(); draw(); dl.showModal();
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
          <div class="fgrid al-attrs" id="a-attrs" style="margin:0"></div>
          <fieldset class="al-pk"><legend>Boleh dipakai paket</legend>${PKGS.map(p => `<label class="chk-l"><input type="checkbox" data-pk="${p}" ${a.package_types.indexOf(p) > -1 ? "checked" : ""} ${canW && !gone ? "" : "disabled"}> ${esc(PKG[p])}</label>`).join("")}</fieldset>
          <label class="fld">Tema<input id="a-theme" maxlength="60" value="${esc(a.theme_key || "")}" ${canW && !gone ? "" : "disabled"}></label>
          <label class="fld">Tag (pisahkan koma)<input id="a-tags" value="${esc((a.tags || []).join(", "))}" ${canW && !gone ? "" : "disabled"}></label>
          <label class="chk-l"><input type="checkbox" id="a-tr" ${a.is_transparent ? "checked" : ""} ${canW && !gone ? "" : "disabled"}> Latar transparan</label>
          <fieldset class="al-lic full"><legend>Lisensi &amp; sumber</legend><div class="fgrid" style="margin:0">
            <label class="fld">Lisensi<select id="a-lic" ${canW && !gone ? "" : "disabled"}>${Object.keys(LIC).map(k => `<option value="${k}" ${a.license === k ? "selected" : ""}>${esc(LIC[k])}</option>`).join("")}</select></label>
            <label class="fld">Sumber<select id="a-src" ${canW && !gone ? "" : "disabled"}>${Object.keys(SRC).map(k => `<option value="${k}" ${a.source === k ? "selected" : ""}>${esc(SRC[k])}</option>`).join("")}</select></label>
            <label class="fld">Kredit / atribusi<input id="a-credit" maxlength="160" value="${esc(a.credit || "")}" ${canW && !gone ? "" : "disabled"}></label>
            <label class="fld">Tautan sumber<input id="a-surl" maxlength="500" placeholder="https://..." value="${esc(a.source_url || "")}" ${canW && !gone ? "" : "disabled"}></label>
            <label class="fld">Lisensi berlaku sampai<input id="a-lexp" type="date" value="${esc(a.license_expires || "")}" ${canW && !gone ? "" : "disabled"}></label>
            <label class="fld">Catatan lisensi<input id="a-lnote" maxlength="500" value="${esc(a.license_note || "")}" ${canW && !gone ? "" : "disabled"}></label></div></fieldset>
          <label class="fld">Status<select id="a-st" ${canW && !gone ? "" : "disabled"}><option value="active" ${a.status === "active" ? "selected" : ""}>Aktif</option><option value="inactive" ${a.status === "inactive" ? "selected" : ""}>Nonaktif (tidak bisa dipilih baru; penempatan lama tetap tampil)</option><option value="archived" ${a.status === "archived" ? "selected" : ""}>Arsip (tidak bisa dipilih dan tidak tampil)</option></select></label>
          <div class="full" id="a-e" role="alert"></div>
          <div class="row-end">${canW ? (gone ? '<button class="btn o" type="button" id="a-restore">Pulihkan</button>' : '<button class="btn o bad" type="button" id="a-del">Hapus</button>') : ""}<button class="btn o" type="button" data-close>Tutup</button>${canW && !gone ? '<button class="btn" type="submit" id="a-save">Simpan</button>' : ""}</div>
        </form></div>`;
        mount(dl); dl.showModal();
        dl.addEventListener("click", (e) => { if (e.target.closest("[data-close]")) dl.close(); });
        const aFields = () => { const c = CATS.filter(x => x.id === $("#a-cat").value)[0]; if (!c) return []; const g = groupOfCat(c.package_type, c.slug), cfg = pcfg(c.package_type); return g ? g.fields.map(k => cfg.fields[k]).filter(Boolean) : []; };
        const drawAttrs = () => { const fs = aFields(), at = a.attrs || {}; $("#a-attrs").innerHTML = fs.length ? '<p class="sub full" style="margin:0"><b>Isian khusus paket</b></p>' + fs.map(f => fieldHTML(f, at[f.k], "af-")).join("") : ""; if (!(canW && !gone)) $$("#a-attrs input,#a-attrs select").forEach(x => { x.disabled = true; }); };
        drawAttrs(); $("#a-cat").onchange = drawAttrs;
        const reopen = () => { dl.close(); sb.from("assets").select("*").eq("id", a.id).maybeSingle().then(r => { if (r.data) openAsset(r.data, onChange); if (onChange) onChange(); }); };
        const loadDetail = () => sb.rpc("admin_asset_detail", { p_id: a.id }).then(r => {
          if (r.error) throw r.error; const D = r.data, pl = D.placements || [], lg = D.usage_log || [], vs = D.versions || [], sm = D.similar || [];
          const when = (t) => new Date(t).toLocaleString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
          const info = `<p class="sub" style="margin:6px 0">Dibuat ${esc(when(D.asset.created_at))}${D.created_by_name ? " oleh " + esc(D.created_by_name) : ""} &middot; versi aktif v${D.asset.current_version}</p>`;
          const useH = pl.length ? `<h3>Dipakai di ${pl.length} penempatan</h3><ul>${pl.map(x => `<li>${esc(x.template)} <small>(${esc(x.template_status)})</small> &middot; <code>${esc(x.slot)}</code>${x.theme ? " &middot; tema " + esc(x.theme) : ""}</li>`).join("")}</ul>` : '<p class="sub">Belum dipakai template mana pun.</p>';
          const logH = lg.length ? `<h3>Riwayat penggunaan</h3><ul class="al-log">${lg.map(x => `<li><b>${esc(ACT[x.action] || x.action)}</b> &middot; ${esc(x.template)} &middot; <code>${esc(x.slot || "")}</code><small> ${esc(when(x.at))}${x.by ? " &middot; " + esc(x.by) : ""}</small></li>`).join("")}</ul>` : "";
          const verH = `<h3>Versi file</h3>${canW && !gone ? `<div class="al-vup"><input id="v-note" maxlength="300" placeholder="Catatan versi baru (opsional)" aria-label="Catatan versi"><button class="btn o sm" type="button" id="v-pick">Unggah versi baru</button><input type="file" id="v-file" accept=".${esc(a.file_type)}" hidden></div><p class="sub" id="v-msg" role="status" style="margin:4px 0"></p>` : ""}<ul class="al-ver">${vs.map(v => `<li class="${v.current ? "cur" : ""}"><b>v${v.version}</b>${v.current ? ' <i class="al-pkb essential">Aktif</i>' : ""} &middot; ${dims(v)} &middot; ${fmtSize(v.file_size)}<small> ${esc(when(v.at))}${v.by ? " &middot; " + esc(v.by) : ""}</small>${v.note ? `<br><small>${esc(v.note)}</small>` : ""} ${!v.current && canW && !gone ? `<button class="btn o sm" type="button" data-rv="${v.version}">Pulihkan</button>` : ""} <a href="${esc(v.file_url)}" target="_blank" rel="noopener">Buka file</a></li>`).join("")}</ul>`;
          const simH = sm.length ? `<h3>Aset serupa</h3><ul>${sm.map(x => `<li><button type="button" class="lnk" data-sim="${esc(x.id)}">${esc(x.name)}</button> <small>${esc(SIM[x.reason] || x.reason)}${x.deleted ? " &middot; terhapus" : x.status !== "active" ? " &middot; " + esc(STL[x.status] || x.status) : ""}</small></li>`).join("")}</ul>` : "";
          $("#a-use").innerHTML = info + useH + logH + verH + simH;
          $$("[data-sim]", dl).forEach(b => { b.onclick = () => { dl.close(); sb.from("assets").select("*").eq("id", b.dataset.sim).maybeSingle().then(r => { if (r.data) openAsset(r.data, onChange); }); }; });
          $$("[data-rv]", dl).forEach(b => { b.onclick = async () => { if (!(await dlgConfirm("Pulihkan file ke versi " + b.dataset.rv + "? Penempatan di template tidak berubah, tetapi tampilannya memakai file versi itu.", "Pulihkan"))) return;
            sb.rpc("admin_asset_restore_version", { p_id: a.id, p_version: Number(b.dataset.rv) }).then(r => { if (r.error) return fail(r.error, "Gagal memulihkan"); if (!r.data.ok) return toast(errText(r.data.error), "bad"); toast("Versi dipulihkan.", "ok"); reopen(); }); }; });
          const pick = $("#v-pick"), vf = $("#v-file");
          if (pick) { pick.onclick = () => vf.click(); vf.onchange = async () => {
            const f = vf.files[0]; vf.value = ""; if (!f) return; const msg = $("#v-msg"), ext = (f.name.split(".").pop() || "").toLowerCase();
            if (ext !== a.file_type) { msg.textContent = "Versi baru harus berformat ." + a.file_type + "."; return; }
            const sess = await sb.auth.getSession(); const user = sess.data && sess.data.session && sess.data.session.user; if (!user) return toast("Sesi berakhir. Masuk lagi.", "bad");
            pick.disabled = true; msg.textContent = "Mengunggah...";
            const path = "incoming/" + user.id + "/" + Date.now() + "-" + uid() + "." + ext;
            const up = await sb.storage.from(BUCKET).upload(path, f, { contentType: MIME[ext] || "application/octet-stream", upsert: false });
            if (up.error) { pick.disabled = false; msg.textContent = "Gagal mengunggah. Periksa izin dan bucket."; return; }
            msg.textContent = "Memeriksa file...";
            const r = await callRegister({ path, replace_asset: a.id, note: $("#v-note").value.trim() });
            pick.disabled = false;
            if (!r.ok) { msg.textContent = errText(r.error, r.error === "jaringan" ? "Tidak bisa terhubung ke server." : "Gagal memproses file."); return; }
            toast(r.dimensi_berubah ? "Versi baru tersimpan. Dimensi berubah: periksa tampilannya di template." : "Versi baru tersimpan.", r.dimensi_berubah ? "bad" : "ok"); reopen();
          }; }
        }).catch(e => { $("#a-use").innerHTML = '<p class="sub">Detail tidak bisa dimuat: ' + esc(e && e.message || "coba lagi") + "</p>"; });
        loadDetail();
        const done = (msg) => { toast(msg, "ok"); dl.close(); if (onChange) onChange(); };
        const f = $("#a-f"); if (!f) return;
        f.onsubmit = (e) => {
          e.preventDefault(); const er = $("#a-e"); er.textContent = "";
          const name = $("#a-name").value.trim(); if (!name) { er.textContent = "Nama wajib diisi."; return; }
          const pk = $$("[data-pk]", f).filter(x => x.checked).map(x => x.dataset.pk); if (!pk.length) { er.textContent = "Pilih minimal satu paket."; return; }
          const patch = { name, description: $("#a-desc").value.trim(), category_id: $("#a-cat").value, package_types: pk, theme_key: $("#a-theme").value.trim().toLowerCase(), tags: $("#a-tags").value.split(",").map(s => s.trim()).filter(Boolean), is_transparent: $("#a-tr").checked, status: $("#a-st").value };
          const fs = aFields(), rd = readFields(fs, f, "af-"); if (rd.errs.length) { er.textContent = "Lengkapi isian: " + rd.errs.join(", ") + "."; return; }
          const at = Object.assign({}, a.attrs || {}); fs.forEach(x => { delete at[x.k]; }); patch.attrs = Object.assign(at, rd.v);
          const b = $("#a-save"); b.disabled = true; b.textContent = "Menyimpan...";
          sb.rpc("admin_update_asset", { p_id: a.id, p_patch: patch }).then(r => { b.disabled = false; b.textContent = "Simpan"; if (r.error) { er.textContent = fail(r.error, "Gagal menyimpan"); return; } if (!r.data.ok) { er.textContent = errText(r.data.error) + (r.data.package ? " (" + PKG[r.data.package] + ")" : ""); return; } const meta = { license: $("#a-lic").value, source: $("#a-src").value, credit: $("#a-credit").value.trim(), source_url: $("#a-surl").value.trim(), license_expires: $("#a-lexp").value, license_note: $("#a-lnote").value.trim() };
            sb.rpc("admin_asset_set_meta", { p_id: a.id, p_patch: meta }).then(m => { if (m.error) { er.textContent = fail(m.error, "Gagal menyimpan lisensi"); return; } if (!m.data.ok) { er.textContent = "Metadata tersimpan, tetapi lisensi ditolak: " + errText(m.data.error); return; } done("Metadata tersimpan."); }); });
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
    const LS = { q: "", pkg: "", cat: "", theme: "", ext: "", status: "active", view: "grid", page: 0 }, PAGE = 24, SEL = new Set();
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
          <label class="fld">Status<select id="l-st"><option value="active" ${LS.status === "active" ? "selected" : ""}>Aktif</option><option value="inactive" ${LS.status === "inactive" ? "selected" : ""}>Nonaktif</option><option value="archived" ${LS.status === "archived" ? "selected" : ""}>Arsip</option><option value="deleted" ${LS.status === "deleted" ? "selected" : ""}>Terhapus</option></select></label>
          <div class="al-vt" role="group" aria-label="Tampilan"><button type="button" class="btn o sm" data-v="grid" aria-pressed="${LS.view === "grid"}">Grid</button><button type="button" class="btn o sm" data-v="list" aria-pressed="${LS.view === "list"}">Daftar</button></div>
          ${canW ? '<button class="btn" type="button" id="l-up">' + ico("plus") + " Unggah aset</button>" : ""}</div><div id="l-bulk" class="card al-bulk" hidden></div><div id="l-res" class="card"><div class="sk h4"></div></div>`;
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
          bulkBar();
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
            const meta = (a) => `${esc(a.file_type.toUpperCase())} · ${dims(a)} · ${fmtSize(a.file_size)}${a.status === "inactive" ? " · Nonaktif" : a.status === "archived" ? " · Arsip" : ""}`;
            const pkb = (a) => a.package_types.map(p => `<i class="al-pkb ${p}">${p === "essential" ? "2D" : p === "signature" ? "Cinematic" : "Live"}</i>`).join("");
            const cats = {}; CATS.forEach(c => { cats[c.id] = c.name; });
            const body = LS.view === "grid"
              ? `<ul class="al-grid">${ROWS.map((a, i) => `<li class="al-li">${canW ? `<label class="al-sel-l"><input type="checkbox" class="al-sel" data-sel="${a.id}" ${SEL.has(a.id) ? "checked" : ""} aria-label="Pilih ${esc(a.name)}"></label>` : ""}<button type="button" class="al-card" data-i="${i}">${thumb(a, "al-th")}<span class="al-n">${esc(a.name)}</span><span class="al-m">${esc(cats[a.category_id] || "-")}</span><span class="al-m">${meta(a)}</span><span class="al-b">${pkb(a)}${use[a.id] ? `<i class="al-use">dipakai ${use[a.id]}×</i>` : ""}</span></button></li>`).join("")}</ul>`
              : `<div class="tbl-w"><table><thead><tr>${canW ? '<th><input type="checkbox" id="l-all" aria-label="Pilih semua di halaman ini"></th>' : ""}<th></th><th>Nama</th><th>Kategori</th><th>Paket</th><th>Format</th><th class="num">Ukuran</th><th class="num">Dipakai</th></tr></thead><tbody>${ROWS.map((a, i) => `<tr class="row" tabindex="0" data-i="${i}">${canW ? `<td><input type="checkbox" class="al-sel" data-sel="${a.id}" ${SEL.has(a.id) ? "checked" : ""} aria-label="Pilih ${esc(a.name)}"></td>` : ""}<td>${thumb(a, "al-th s")}</td><td><b>${esc(a.name)}</b><span class="cell-s">${esc((a.tags || []).join(", "))}</span></td><td>${esc(cats[a.category_id] || "-")}</td><td>${pkb(a)}</td><td>${esc(a.file_type.toUpperCase())} ${dims(a)}</td><td class="num">${fmtSize(a.file_size)}</td><td class="num">${use[a.id] || 0}</td></tr>`).join("")}</tbody></table></div>`;
            box.innerHTML = body + `<div class="pager"><span>${LS.page * PAGE + 1}&ndash;${LS.page * PAGE + ROWS.length} dari ${r.count == null ? ROWS.length : r.count}</span><div><button class="btn o sm" type="button" data-pg="-1" ${LS.page === 0 ? "disabled" : ""}>Sebelumnya</button><button class="btn o sm" type="button" data-pg="1" ${LS.page + 1 >= pages ? "disabled" : ""}>Berikutnya</button></div></div>`;
          }).catch(e => { box.innerHTML = empty("Library tidak bisa dimuat", e && (e.code === "42P01" || e.code === "PGRST205" || e.code === "PGRST202") ? "Tabel/fungsi belum dibuat. Jalankan backend/asset-schema.sql di Supabase." : "Terjadi kendala saat memuat. Coba lagi.", '<button class="btn" type="button" data-retry>Coba lagi</button>'); });
        }
        const bulkBar = () => {
          const bar = $("#l-bulk"); if (!bar) return; const n = SEL.size;
          if (!canW || !n) { bar.hidden = true; bar.innerHTML = ""; return; }
          const deleted = LS.status === "deleted";
          bar.hidden = false;
          bar.innerHTML = `<div class="al-bulk-h"><b>${n} aset dipilih</b><button type="button" class="btn o sm" id="b-clear">Batal pilih</button></div>
            <div class="al-bulk-b"><label class="fld">Aksi<select id="b-act">${deleted ? '<option value="restore">Pulihkan</option>' : `<option value="status">Ubah status</option><option value="add_tags">Tambah tag</option><option value="remove_tags">Hapus tag</option><option value="packages">Atur paket yang boleh memakai</option><option value="meta">Atur lisensi &amp; sumber</option><option value="delete">Hapus dari library</option>`}</select></label><div id="b-par" class="al-bulk-p"></div><button class="btn" type="button" id="b-go">Terapkan</button></div><div id="b-res" role="status"></div>`;
          const par = () => {
            const a = $("#b-act").value, box = $("#b-par");
            box.innerHTML = a === "status" ? `<label class="fld">Status<select id="b-v"><option value="active">Aktif</option><option value="inactive">Nonaktif</option><option value="archived">Arsip</option></select></label>`
              : a === "add_tags" || a === "remove_tags" ? `<label class="fld">Tag (pisahkan koma)<input id="b-v" maxlength="200" placeholder="floral, emas"></label>`
              : a === "packages" ? `<fieldset class="al-pk"><legend>Boleh dipakai paket</legend>${PKGS.map(q => `<label class="chk-l"><input type="checkbox" data-bp="${q}"> ${esc(PKG[q])}</label>`).join("")}</fieldset>`
              : a === "meta" ? `<label class="fld">Lisensi<select id="b-lic"><option value="">(tidak diubah)</option>${Object.keys(LIC).map(k => `<option value="${k}">${esc(LIC[k])}</option>`).join("")}</select></label><label class="fld">Sumber<select id="b-src"><option value="">(tidak diubah)</option>${Object.keys(SRC).map(k => `<option value="${k}">${esc(SRC[k])}</option>`).join("")}</select></label><label class="fld">Kredit<input id="b-credit" maxlength="160"></label>`
              : "";
          };
          par(); $("#b-act").onchange = par;
          $("#b-clear").onclick = () => { SEL.clear(); $$(".al-sel").forEach(x => { x.checked = false; }); bulkBar(); };
          $("#b-go").onclick = async () => {
            const act = $("#b-act").value, ids = Array.from(SEL), res = $("#b-res"); let val = {};
            if (act === "status") val = { status: $("#b-v").value };
            else if (act === "add_tags" || act === "remove_tags") { val = { tags: $("#b-v").value.split(",").map(x => x.trim()).filter(Boolean) }; if (!val.tags.length) { res.textContent = "Isi minimal satu tag."; return; } }
            else if (act === "packages") { val = { package_types: $$("[data-bp]", bar).filter(x => x.checked).map(x => x.dataset.bp) }; if (!val.package_types.length) { res.textContent = "Pilih minimal satu paket."; return; } }
            else if (act === "meta") { if ($("#b-lic").value) val.license = $("#b-lic").value; if ($("#b-src").value) val.source = $("#b-src").value; if ($("#b-credit").value.trim()) val.credit = $("#b-credit").value.trim(); if (!Object.keys(val).length) { res.textContent = "Pilih minimal satu isian."; return; } }
            else if (act === "delete" && !(await dlgConfirm("Hapus " + ids.length + " aset dari library? File asli di storage tidak dihapus dan aset bisa dipulihkan dari filter Terhapus.", "Hapus"))) return;
            const run = (list, force) => sb.rpc("admin_assets_bulk", { p_ids: list, p_action: act, p_value: val, p_force: !!force });
            $("#b-go").disabled = true; res.textContent = "Memproses...";
            let r = await run(ids, false);
            if (r.error) { $("#b-go").disabled = false; res.textContent = ""; return fail(r.error, "Aksi massal gagal"); }
            if (!r.data.ok) { $("#b-go").disabled = false; res.textContent = errText(r.data.error); return; }
            let done = r.data.done, failed = r.data.failed || [];
            const blocked = failed.filter(x => x.error === "dipakai_template_terbit" || x.error === "asset_dipakai");
            if (blocked.length && (act === "status" || act === "delete") && await dlgConfirm(blocked.length + " aset dipakai di template (" + blocked.slice(0, 5).map(x => x.name).join(", ") + (blocked.length > 5 ? ", ..." : "") + "). Lanjutkan juga? " + (act === "delete" ? "Relasi ke template dilepas." : "Aset tidak akan tampil lagi di template yang sudah terbit."), "Lanjutkan")) {
              const r2 = await run(blocked.map(x => x.id), true);
              if (!r2.error && r2.data.ok) { done += r2.data.done; failed = failed.filter(x => blocked.indexOf(x) < 0).concat(r2.data.failed || []); }
            }
            $("#b-go").disabled = false;
            toast(done + " aset diproses" + (failed.length ? ", " + failed.length + " gagal." : "."), failed.length ? "bad" : "ok");
            if (!failed.length) SEL.clear();
            load();
            const res2 = $("#b-res");
            if (failed.length && res2) res2.innerHTML = "<b>Gagal:</b> " + failed.slice(0, 10).map(x => esc(x.name || x.id) + " (" + esc(errText(x.error)) + ")").join("; ") + (failed.length > 10 ? "; ..." : "");
          };
        };
        $("#l-res").onchange = (e) => {
          const c = e.target.closest("[data-sel]"); if (c) { if (c.checked) SEL.add(c.dataset.sel); else SEL.delete(c.dataset.sel); bulkBar(); return; }
          if (e.target.id === "l-all") { $$("[data-sel]", $("#l-res")).forEach(x => { x.checked = e.target.checked; if (x.checked) SEL.add(x.dataset.sel); else SEL.delete(x.dataset.sel); }); bulkBar(); }
        };
        $("#l-res").onclick = (e) => {
          if (e.target.closest("[data-sel], #l-all, .al-sel-l")) return;
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
    function layoutDefaults(pkg, o) { pcfg(pkg).layout.forEach(f => { if (f.def != null && getPath(o, f.k) === undefined) setPath(o, f.k, f.def); }); return o; }
    function defaultLayout(pkg) { return layoutDefaults(pkg, { version: 1, mode: MODE[pkg] || "scroll2d", sections: (SECS[pkg] || []).map(s => ({ key: s[0], label: s[1], enabled: true })) }); }
    function normLayout(l, pkg) {
      const b = defaultLayout(pkg); if (!l || typeof l !== "object" || !Array.isArray(l.sections) || !l.sections.length) return b;
      const o = { version: 1, mode: MODE[pkg], sections: l.sections.map(s => ({ key: slug(s.key) || "section", label: String(s.label || s.key).slice(0, 60), enabled: s.enabled !== false, duration: s.duration })) };
      ["scene", "venue", "style"].forEach(k => { if (l[k] && typeof l[k] === "object" && !Array.isArray(l[k])) o[k] = JSON.parse(JSON.stringify(l[k])); });
      return layoutDefaults(pkg, o);
    }

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
        const p = S.tpl.package_type, cfg = pcfg(p), slots = {}; S.items.forEach(it => { (slots[it.slot_key] = slots[it.slot_key] || []).push(it); });
        const known = cfg.slots.map(x => x.key), custom = Array.from(new Set(Object.keys(slots).concat(S.extra))).filter(k => known.indexOf(k) < 0);
        const blocks = cfg.groups.map(g => ({ label: g.label, hint: g.hint, slots: cfg.slots.filter(x => x.group === g.key) })).filter(x => x.slots.length);
        if (custom.length) blocks.push({ label: "Slot kustom", hint: "Slot buatan admin; renderer memakai kunci slot ini.", slots: custom.map(k => ({ key: k, label: k, custom: true })) });
        const slotHTML = (sl) => `<section class="st-slot" data-slot="${esc(sl.key)}"><header><h3>${esc(sl.label)} <code>${esc(sl.key)}</code></h3>${canW ? `<div><button class="btn sm" type="button" data-pick="${esc(sl.key)}">Pilih aset</button>${sl.custom ? `<button class="btn o sm" type="button" data-rmslot="${esc(sl.key)}">Hapus slot</button>` : ""}</div>` : ""}</header>
          ${(slots[sl.key] || []).length ? `<ul class="st-items">${slots[sl.key].map(it => { const a = it.asset, i = S.items.indexOf(it); return `<li data-i="${i}">${thumb(a, "al-th s")}<div class="in"><b>${esc(a.name)}</b><span class="al-m">${esc(a.file_type.toUpperCase())} · ${dims(a)} · ${fmtSize(a.file_size)}</span></div><label class="fld sm">Section<select data-sec="${i}" ${canW ? "" : "disabled"}>${secOptions(it.section)}</select></label>${canW ? `<div class="st-btns"><button type="button" class="btn o sm" data-up="${i}" aria-label="Naik">↑</button><button type="button" class="btn o sm" data-dn="${i}" aria-label="Turun">↓</button><button type="button" class="btn o sm" data-cfg="${i}">Atur</button><button type="button" class="btn o sm bad" data-del="${i}">Lepas</button></div>` : ""}<div class="st-cfg" id="cfg-${i}" hidden></div></li>`; }).join("")}</ul>` : '<p class="sub st-none">Belum ada aset di slot ini.</p>'}</section>`;
        pane("b").innerHTML = `${scopeBar()}
        <p class="sub"><b>${esc(cfg.title)}</b> · renderer ${esc(cfg.renderer || "")}. ${esc(cfg.intro)} Aset di pemilih hanya yang kompatibel dengan paket ini. Melepas aset dari slot hanya melepas relasi; file tidak dihapus.</p>
        <div class="st-add"><label class="fld">Tambah slot baru<input id="ns" list="ns-l" maxlength="40" placeholder="mis. gerbang_masuk"></label><datalist id="ns-l">${known.map(k => `<option value="${k}">`).join("")}</datalist><button class="btn o" type="button" id="ns-b">Tambah slot</button></div>
        <div class="st-slots">${blocks.map(g => `<div class="st-grp"><h3 class="st-gh">${esc(g.label)}</h3>${g.hint ? `<p class="al-hint">${esc(g.hint)}</p>` : ""}${g.slots.map(slotHTML).join("")}</div>`).join("")}</div>`;
        bindScope(); const b = pane("b");
        $("#ns-b", b).onclick = () => { const k = slug($("#ns", b).value); if (k.length < 2) return toast("Nama slot minimal 2 karakter (huruf kecil, angka, garis bawah).", "bad"); if (!S.extra.includes(k)) S.extra.push(k); setDirty(); drawB(); };
        b.onclick = (e) => {
          const t = e.target.closest("button"); if (!t) return;
          if (t.dataset.pick) return openPicker(t.dataset.pick);
          if (t.dataset.rmslot) { const k = t.dataset.rmslot; S.items = S.items.filter(x => x.slot_key !== k); S.extra = S.extra.filter(x => x !== k); setDirty(); return drawB(); }
          const idx = ["up", "dn", "del", "cfg"].map(n => t.dataset[n]).filter(x => x != null)[0]; if (idx == null) return; const i = Number(idx), it = S.items[i];
          if (t.dataset.del != null) { S.items.splice(i, 1); setDirty(); return drawB(); }
          if (t.dataset.cfg != null) { const box = $("#cfg-" + i, b); if (!box.hidden) { box.hidden = true; return; } box.hidden = false; return cfgForm(box, it, i); }
          const sibs = S.items.filter(x => x.slot_key === it.slot_key), j = sibs.indexOf(it), o = sibs[j + (t.dataset.up != null ? -1 : 1)]; if (!o) return;
          const a = S.items.indexOf(it), c = S.items.indexOf(o); S.items[a] = o; S.items[c] = it; setDirty(); drawB();
        };
        b.onchange = (e) => { const s = e.target.closest("[data-sec]"); if (s) { S.items[Number(s.dataset.sec)].section = s.value; setDirty(); } };
      }
      /* Pengaturan penempatan per aset: field mengikuti paket (asset-forms.js > config) */
      function cfgForm(box, it, i) {
        const p = S.tpl.package_type, cfg = pcfg(p), c = it.config || {}, secs = [];
        cfg.config.forEach(f => { let g = secs.filter(x => x.n === (f.sec || "Pengaturan"))[0]; if (!g) secs.push(g = { n: f.sec || "Pengaturan", f: [] }); g.f.push(f); });
        const g = groupOfCat(p, catSlug(it.asset.category_id));
        box.innerHTML = `<p class="sub">${p === "essential" ? "Posisi dalam % dari section, lebar dalam % section. Skala 1 = ukuran asli." : p === "signature" ? "Satuan scene 3D. Rotasi dalam derajat. Kamera dan cahaya scene diatur di tab C." : "Satuan venue. Collision, interaksi, dan posisi dipakai mesin Live Guest. Titik spawn diatur di tab C."}</p>${secs.map(sc => `<fieldset class="st-cs"><legend>${esc(sc.n)}</legend><div class="st-cg">${sc.f.map(f => fieldHTML(f, c[f.k], "c" + i + "-")).join("")}</div></fieldset>`).join("")}`;
        box.oninput = box.onchange = (e) => {
          const k = e.target.dataset.fk; if (!k) return; const f = cfg.config.filter(x => x.k === k)[0]; if (!f) return; const cf = it.config = it.config || {};
          if (f.t === "bool") { if (e.target.checked) cf[k] = true; else if (f.def === true) cf[k] = false; else delete cf[k]; }
          else { const v = String(e.target.value).trim(); if (v === "" || (f.t === "select" && v === "none")) delete cf[k]; else cf[k] = f.t === "number" ? Number(v) : v; }
          setDirty();
        };
      }

      // pemilih aset dari library
      function openPicker(slot) {
        const pd = dialog("pdlg", "al-dlg"), p = S.tpl.package_type; const sg = slotInfo(p, slot), grp = sg ? pcfg(p).groups.filter(g => g.key === sg.group)[0] : null, gids = grp ? CATS.filter(c => c.package_type === p && grp.cats.indexOf(c.slug) > -1).map(c => c.id) : [];
        let PQ = { q: "", cat: "", all: !gids.length }, sel = {}, rows = [];
        pd.innerHTML = `${closeBtn}<h2 id="pdlg-t">Pilih aset untuk <code>${esc(slot)}</code></h2><p class="sub">Hanya aset yang kompatibel dengan paket ${esc(PKG[p])} yang ditampilkan.</p>
        <div class="tool"><label class="fld grow">Cari<span class="sbox"><input type="search" id="p-q" placeholder="Nama atau tag..."></span></label>${gids.length ? `<label class="chk-l"><input type="checkbox" id="p-all"> Semua kategori paket</label>` : ""}<label class="fld">Kategori<select id="p-cat"><option value="">Semua</option>${CATS.filter(c => c.package_type === p && c.active).map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join("")}</select></label>${canW ? '<button class="btn o" type="button" id="p-up">Unggah baru</button>' : ""}</div>
        <div id="p-res" class="al-pick"><div class="sk h4"></div></div><div class="row-end"><span class="sub" id="p-n"></span><button class="btn o" type="button" data-close>Batal</button><button class="btn" type="button" id="p-ok" disabled>Pakai</button></div>`;
        pd.addEventListener("click", (e) => { if (e.target.closest("[data-close]")) pd.close(); });
        const load = () => {
          let qy = sb.from("assets").select("*").is("deleted_at", null).eq("status", "active").contains("package_types", [p]);
          if (PQ.cat) qy = qy.eq("category_id", PQ.cat); else if (!PQ.all && gids.length) qy = qy.in("category_id", gids);
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
        const pa = $("#p-all", pd); if (pa) pa.onchange = () => { PQ.all = pa.checked; load(); };
        const upb = $("#p-up", pd); if (upb) upb.onclick = () => openUpload({ pkg: p, lock: true, group: grp ? grp.key : "", onDone: (made) => { made.forEach(a => { sel[a.id] = a; }); setTimeout(() => { pd.showModal && !pd.open && pd.showModal(); load(); }, 0); } });
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
        const cnt = (k) => S.items.filter(x => x.section === k).length, lf = pcfg(p).layout;
        const layoutCard = () => {
          if (!lf.length) return "";
          const secs = []; lf.forEach(f => { let g = secs.filter(x => x.n === (f.sec || "Pengaturan"))[0]; if (!g) secs.push(g = { n: f.sec || "Pengaturan", f: [] }); g.f.push(f); });
          const pts = (f) => { const arr = getPath(L, f.k) || []; return `<div class="st-pts"><p class="al-hint">${esc(f.help || "")}</p><ul>${arr.map((x, i) => `<li class="st-pt"><label class="fld sm">Kunci<input data-pk value="${esc(x.key)}" maxlength="40"></label><label class="fld sm">Nama<input data-pl value="${esc(x.label || "")}" maxlength="40"></label><label class="fld sm">X<input type="number" step="any" data-px value="${esc(x.x)}"></label><label class="fld sm">Z<input type="number" step="any" data-pz value="${esc(x.z)}"></label>${canW ? `<button type="button" class="btn o sm bad" data-prm="${i}">Hapus</button>` : ""}</li>`).join("")}</ul>${canW ? '<button type="button" class="btn o sm" data-padd>Tambah titik spawn</button>' : ""}</div>`; };
          return `<div class="card st-lay" style="box-shadow:none"><div class="card-h"><h2>${p === "signature" ? "Scene sinematik: cahaya & kamera" : p === "luxe" ? "Venue virtual: kapasitas, collision & spawn" : "Pengaturan layout"}</h2></div>${secs.map(sc => `<fieldset class="st-cs"><legend>${esc(sc.n)}</legend><div class="st-cg">${sc.f.map(f => f.t === "points" ? `<div style="grid-column:1/-1">${pts(f)}</div>` : fieldHTML(f, getPath(L, f.k), "lk-").replace(/data-fk=/, "data-lk=")).join("")}</div></fieldset>`).join("")}</div>`;
        };
        pane("c").innerHTML = `${scopeBar()}<div class="card" style="box-shadow:none">
          <div class="card-h"><h2>Section undangan</h2><div>${canW ? '<button class="btn o sm" type="button" id="c-def">Isi bawaan paket</button>' : ""}</div></div>
          <p class="sub">Renderer: <b>${p === "essential" ? "2D scroll (Essential)" : p === "signature" ? "3D cinematic (Signature)" : "Virtual venue live guest (Luxe)"}</b>. Urutan section menentukan urutan tampil. Aset ditautkan ke section di tab B.</p>
          <ul class="st-secs">${L.sections.map((s, i) => `<li data-i="${i}"><label class="chk-l"><input type="checkbox" data-en ${s.enabled ? "checked" : ""} ${canW ? "" : "disabled"} aria-label="Aktif"></label><label class="fld sm">Kunci<input data-key value="${esc(s.key)}" maxlength="40" ${canW ? "" : "disabled"}></label><label class="fld sm">Nama<input data-lab value="${esc(s.label)}" maxlength="60" ${canW ? "" : "disabled"}></label>${cin ? `<label class="fld sm">Durasi (dtk)<input type="number" min="1" max="120" data-dur value="${s.duration || ""}" placeholder="6" ${canW ? "" : "disabled"}></label>` : ""}<span class="al-m">${cnt(s.key)} aset</span>${canW ? `<div class="st-btns"><button type="button" class="btn o sm" data-mu aria-label="Naik">↑</button><button type="button" class="btn o sm" data-md aria-label="Turun">↓</button><button type="button" class="btn o sm bad" data-mx>Hapus</button></div>` : ""}</li>`).join("")}</ul>
          ${canW ? '<button class="btn o" type="button" id="c-add">Tambah section</button>' : ""}</div>${layoutCard()}`;
        bindScope(); const c = pane("c");
        const readLayout = () => {
          lf.forEach(f => {
            if (f.t === "points") { setPath(L, f.k, $$("li.st-pt", c).map(li => ({ key: slug($("[data-pk]", li).value) || "spawn", label: $("[data-pl]", li).value.trim().slice(0, 40), x: Number($("[data-px]", li).value) || 0, z: Number($("[data-pz]", li).value) || 0 })).slice(0, f.max || 12)); return; }
            const el = $("#lk-" + f.k.replace(/\./g, "-"), c); if (!el) return; let v;
            if (f.t === "bool") v = el.checked; else { const raw = String(el.value).trim(); v = raw === "" ? undefined : f.t === "number" ? Number(raw) : raw; if (f.t === "number" && v !== undefined && (isNaN(v) || (f.min != null && v < f.min) || (f.max != null && v > f.max))) { v = undefined; el.setAttribute("aria-invalid", "true"); } else el.removeAttribute("aria-invalid"); }
            setPath(L, f.k, v);
          });
        };
        const read = () => { $$("li[data-i]", c).forEach(li => { const s = L.sections[Number(li.dataset.i)]; s.enabled = $("[data-en]", li).checked; s.key = slug($("[data-key]", li).value) || s.key; s.label = $("[data-lab]", li).value.trim() || s.key; const du = $("[data-dur]", li); if (du) { const v = Number(du.value); if (v) s.duration = v; else delete s.duration; } }); };
        c.oninput = c.onchange = (e) => { if (e.target.closest(".st-lay")) { readLayout(); setDirty(); return; } if (e.target.closest("li[data-i]")) { const old = L.sections.map(s => s.key); read(); S.items.forEach(it => { const i = old.indexOf(it.section); if (i > -1 && L.sections[i] && L.sections[i].key !== it.section) it.section = L.sections[i].key; }); setDirty(); } };
        c.onclick = (e) => {
          const t = e.target.closest("button"); if (!t) return;
          if (t.dataset.padd != null) { readLayout(); const f = lf.filter(x => x.t === "points")[0], arr = getPath(L, f.k) || []; if (arr.length >= (f.max || 12)) return toast("Maksimal " + (f.max || 12) + " titik.", "bad"); arr.push({ key: "spawn_" + (arr.length + 1), label: "", x: 0, z: 0 }); setPath(L, f.k, arr); setDirty(); return drawC(); }
          if (t.dataset.prm != null) { readLayout(); const f = lf.filter(x => x.t === "points")[0], arr = getPath(L, f.k) || []; arr.splice(Number(t.dataset.prm), 1); setPath(L, f.k, arr); setDirty(); return drawC(); }
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
    function el2d(it, pkg) {
      const a = it.asset, c = it.config || {}, bg = /background|backdrop|bg|environment|venue|ground|floor/.test(it.slot_key) && isImg(a);
      const anim = c.anim && c.anim !== "none" ? ` an-${c.anim}` : "", dur = c.speed ? `animation-duration:${Number(c.speed)}s;` : "";
      if (bg) return `<img class="pv-l pv-bg${anim}" style="${dur}opacity:${c.opacity != null ? c.opacity : 1}" src="${esc(a.file_url)}" alt="" loading="lazy">`;
      const d3 = pkg === "signature" || pkg === "luxe";   // 3D: satuan scene dipetakan ke bidang pratinjau (simulasi)
      const x = d3 ? 50 + (c.x || 0) * 8 : (c.x != null ? c.x : 50), y = d3 ? 64 - (c.y || 0) * 8 + (c.z || 0) * 5 : (c.y != null ? c.y : 50), w = c.w != null ? c.w + "%" : (isImg(a) ? "40%" : "auto");
      const tf = `translate(-50%,-50%) scale(${c.scale != null ? c.scale : 1}) rotate(${(d3 ? c.ry : c.rotate) || 0}deg)`;
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
        return `<section class="pv-sec pv-${pkg}" data-scene="${idx}"><span class="pv-tag">${esc(s.label)}${s.duration ? " · " + s.duration + " dtk" : ""}</span>${ls.map(it => el2d(it, pkg)).join("")}${pkg === "luxe" && s.key === "venue" ? ((layout.venue && layout.venue.spawns) || []).map(sp => `<span class="pv-spawn" style="left:${50 + (sp.x || 0) * 8}%;top:${64 + (sp.z || 0) * 5}%" title="Spawn: ${esc(sp.label || sp.key)}">⦿</span>`).join("") : ""}<div class="pv-txt"><small>${esc(tpl && tpl.name || "Template")}</small><h4>${esc(sample[s.key] || s.label)}</h4><p>Contoh teks. Isi asli berasal dari data undangan pelanggan.</p></div>${!ls.length ? '<p class="pv-empty">Belum ada aset di section ini.</p>' : ""}</section>`;
      }).join("");
      if (!list.length) return '<p class="sub" style="padding:24px">Belum ada section aktif. Atur di tab C.</p>';
      if (pkg === "signature") return `<div class="pv-cine pv-light-${esc((layout.scene && layout.scene.lighting) || "soft")}"><div class="pv-bar"><button type="button" class="btn sm" data-play>▶ Putar sinematik</button><span class="al-m" data-pos>Scene 1/${list.length}</span></div><div class="pv-stage">${body}</div></div>`;
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
       AI ASSET GENERATOR (tambahan; provider diatur di server)
       ============================================================ */
    const AIL = { pkg: "essential", cat: "", theme: "", prompt: "", count: 2, run: null };
    function renderDup(root) {
      root.innerHTML = skel();
      sb.rpc("admin_asset_duplicates").then(r => {
        if (r.error) throw r.error; const gs = r.data || [];
        if (!gs.length) { root.innerHTML = '<div class="card">' + empty("Tidak ada aset serupa", "Library bersih: tidak ditemukan file kembar, ukuran sama, atau nama sama.") + "</div>"; return; }
        root.innerHTML = '<p class="sub" style="margin:0 0 10px">Kelompok aset yang mungkin kembar. Buka tiap aset untuk membandingkan, lalu arsipkan yang tidak perlu (pemakaian di template tercantum di detail aset).</p>' + gs.map(g => `<div class="card al-dup"><h3>${esc(g.label)} <small class="sub">${g.assets.length} aset</small></h3><ul class="al-grid">${g.assets.map(a => `<li><button type="button" class="al-card" data-dup="${esc(a.id)}">${thumb(a, "al-th")}<span class="al-n">${esc(a.name)}</span><span class="al-m">${esc((a.file_type || "").toUpperCase())} &middot; ${dims(a)} &middot; ${fmtSize(a.file_size)}</span><span class="al-m">${a.deleted ? "Terhapus" : esc(STL[a.status] || a.status)} &middot; dipakai ${a.uses}x</span></button></li>`).join("")}</ul></div>`).join("");
        root.onclick = (e) => { const b = e.target.closest("[data-dup]"); if (b) sb.from("assets").select("*").eq("id", b.dataset.dup).maybeSingle().then(x => { if (x.data) openAsset(x.data, () => renderDup(root)); }); };
      }).catch(e => { root.innerHTML = errBox(e && (e.code === "PGRST202" || e.code === "42883") ? "Fungsi belum dibuat. Jalankan backend/asset-library.sql di Supabase." : "Terjadi kendala saat memuat.", 1); const b = $("[data-retry]", root); if (b) b.onclick = () => renderDup(root); });
    }
    function renderAI(root) {
      const canW = can("templates", "write");
      root.innerHTML = skel();
      Promise.all([loadCats(true), loadThemes().catch(() => []), callFn("asset-generate", { action: "status" })]).then(([, , st]) => {
        const configured = !!(st.ok && st.configured), svcDown = !st.ok && (st.error === "jaringan" || st.error === "gagal");
        const imgCats = () => CATS.filter(c => c.package_type === AIL.pkg && c.active && c.allowed_ext.some(x => ["png", "jpg", "jpeg"].indexOf(x) > -1));
        const dis = !configured || !canW ? "disabled" : "";
        root.innerHTML = `${configured ? "" : `<div class="note" role="status"><b>AI Asset Generator belum dikonfigurasi.</b> ${svcDown ? "Fungsi <code>asset-generate</code> belum di-deploy atau tidak terjangkau." : "Provider dan kunci API belum diatur di server."} Atur <code>AI_PROVIDER</code> dan kunci API lewat <code>supabase secrets set</code>, lalu deploy <code>asset-generate</code>. Kunci tidak pernah dikirim ke browser. Unggah manual dan Asset Library tetap berfungsi penuh.</div>`}
        <div class="card"><div class="card-h"><h2>Buat aset dengan AI</h2>${configured ? `<span class="badge ok">Provider: ${esc(st.provider)}</span>` : '<span class="badge warn">Belum dikonfigurasi</span>'}</div>
        <form id="ai-f" novalidate class="fgrid" style="margin-top:6px">
          <label class="fld">Paket<select id="ai-pkg" ${dis}>${PKGS.map(p => `<option value="${p}" ${AIL.pkg === p ? "selected" : ""}>${esc(PKG[p])}</option>`).join("")}</select></label>
          <label class="fld">Kategori (gambar)<select id="ai-cat" ${dis}></select></label>
          <label class="fld">Tema (opsional)<input id="ai-theme" list="ai-themes" maxlength="60" value="${esc(AIL.theme)}" ${dis}><datalist id="ai-themes">${(THEMES || []).map(t => `<option value="${esc(t.slug)}">${esc(t.name)}</option>`).join("")}</datalist></label>
          <label class="fld">Jumlah variasi<select id="ai-n" ${dis}>${[1, 2, 3, 4].map(n => `<option ${AIL.count === n ? "selected" : ""}>${n}</option>`).join("")}</select></label>
          <label class="fld full">Prompt<textarea id="ai-prompt" maxlength="2000" rows="3" placeholder="mis. ornamen gorga Batak warna merah-hitam-putih, simetris, latar polos" ${dis}>${esc(AIL.prompt)}</textarea></label>
          <div class="full" id="ai-e" role="alert"></div>
          <div class="row-end full"><button class="btn" type="submit" id="ai-go" ${dis}>Generate</button></div>
        </form><p class="sub">AI hanya membuat gambar 2D/tekstur. Aset 3D (GLB), audio, dan animasi diunggah manual. Hasil harus dipilih dan disimpan ke library; tidak ada yang otomatis dipakai template. Maks. 40 gambar per 24 jam per admin.</p></div>
        <div id="ai-res"></div><div class="card"><div class="card-h"><h2>Riwayat generasi</h2></div><div id="ai-hist"><div class="sk h4"></div></div></div>`;
        const fillCat = () => { const cs = imgCats(); if (!cs.some(c => c.id === AIL.cat)) AIL.cat = cs[0] ? cs[0].id : ""; $("#ai-cat").innerHTML = cs.length ? cs.map(c => `<option value="${c.id}" ${c.id === AIL.cat ? "selected" : ""}>${esc(c.name)}</option>`).join("") : '<option value="">Tidak ada kategori gambar</option>'; };
        fillCat();
        $("#ai-pkg").onchange = (e) => { AIL.pkg = e.target.value; fillCat(); };
        $("#ai-cat").onchange = (e) => { AIL.cat = e.target.value; };
        const hist = () => sb.from("asset_generations").select("id,package_type,theme_key,prompt,count,status,provider,error,created_at").order("created_at", { ascending: false }).limit(10).then(r => {
          const rows = r.data || [];
          $("#ai-hist").innerHTML = rows.length ? `<div class="tbl-w"><table><thead><tr><th>Waktu</th><th>Paket</th><th>Prompt</th><th class="num">Jml</th><th>Status</th></tr></thead><tbody>${rows.map(x => `<tr><td>${X.dt(x.created_at, true)}</td><td>${esc(PKG[x.package_type] || x.package_type)}</td><td>${esc(x.prompt.slice(0, 70))}${x.theme_key ? ' <i class="al-pkb">' + esc(x.theme_key) + "</i>" : ""}</td><td class="num">${x.count}</td><td>${badge(x.status === "done" ? "selesai" : "gagal")}</td></tr>`).join("")}</tbody></table></div>` : '<p class="sub">Belum ada riwayat.</p>';
        }, () => { $("#ai-hist").innerHTML = '<p class="sub">Riwayat tidak bisa dimuat.</p>'; });
        hist();
        function showRun(run) {
          const box = $("#ai-res");
          box.innerHTML = `<div class="card"><div class="card-h"><h2>Hasil (${run.variants.length})</h2><div><button class="btn o sm" type="button" id="ai-re">Buat ulang</button> <button class="btn sm" type="button" id="ai-save" disabled>Simpan terpilih ke library</button></div></div>
            <ul class="al-grid">${run.variants.map((v, i) => `<li><label class="al-card ai-v" data-i="${i}"><img class="al-th" src="${esc(v.file_url)}" alt="Hasil ${i + 1}" loading="lazy"><span class="chk-l"><input type="checkbox" data-sel="${i}"> Pilih</span><input class="ai-name" data-nm="${i}" maxlength="120" value="${esc((run.theme || run.catName) + " AI " + (i + 1))}" aria-label="Nama aset ${i + 1}"><span class="al-m" data-st="${i}"></span></label></li>`).join("")}</ul></div>`;
          const upd = () => { $("#ai-save").disabled = !$$("[data-sel]:checked", box).length; };
          box.onchange = (e) => { if (e.target.matches("[data-sel]")) upd(); };
          $("#ai-re").onclick = () => generate(true);
          $("#ai-save").onclick = async () => {
            const sel = $$("[data-sel]:checked", box).map(x => Number(x.dataset.sel)); $("#ai-save").disabled = true; let okn = 0;
            for (const i of sel) {
              const v = run.variants[i], st = $('[data-st="' + i + '"]', box); st.textContent = "Menyimpan...";
              const r = await callRegister({ path: v.file_path, name: $('[data-nm="' + i + '"]', box).value.trim() || "Aset AI", category_id: run.cat, package_types: [run.pkg], theme_key: run.theme || null, tags: ["ai"] });
              if (!r.ok) { st.textContent = errText(r.error, r.message); st.style.color = "var(--bad)"; continue; }
              const l = await sb.rpc("admin_link_variant", { p_variant: v.id, p_asset: r.asset.id });
              st.textContent = "Tersimpan di library" + (l.error ? " (riwayat tidak diperbarui)" : ""); st.style.color = "var(--ok)"; okn++;
              const cb = $('[data-sel="' + i + '"]', box); cb.checked = false; cb.disabled = true;
            }
            if (okn) toast(okn + " aset AI masuk ke library.", "ok"); upd(); hist();
          };
        }
        async function generate(again) {
          const er = $("#ai-e"); er.textContent = ""; const a = again && AIL.run ? AIL.run : null;
          const prm = a ? { pkg: a.pkg, cat: a.cat, theme: a.theme, prompt: a.prompt, count: a.count } : { pkg: $("#ai-pkg").value, cat: $("#ai-cat").value, theme: $("#ai-theme").value.trim().toLowerCase(), prompt: $("#ai-prompt").value.trim(), count: Number($("#ai-n").value) };
          if (!prm.cat) { er.textContent = "Pilih kategori gambar."; return; } if (prm.prompt.length < 3) { er.textContent = "Prompt minimal 3 karakter."; return; }
          AIL.theme = prm.theme; AIL.prompt = prm.prompt; AIL.count = prm.count;
          const b = $("#ai-go"); b.disabled = true; b.textContent = "Membuat gambar..."; $("#ai-res").innerHTML = '<div class="card"><div class="sk h4"></div><p class="sub">AI sedang membuat gambar, biasanya 10-40 detik...</p></div>';
          const r = await callFn("asset-generate", { action: "generate", package_type: prm.pkg, category_id: prm.cat, theme_key: prm.theme || null, prompt: prm.prompt, count: prm.count });
          b.disabled = false; b.textContent = "Generate";
          if (!r.ok) { $("#ai-res").innerHTML = ""; er.textContent = errText(r.error, r.message); hist(); return; }
          const cn = (CATS.filter(c => c.id === prm.cat)[0] || {}).name || "Aset";
          AIL.run = Object.assign({}, prm, { variants: r.variants, catName: cn }); showRun(AIL.run); hist();
        }
        $("#ai-f").onsubmit = (e) => { e.preventDefault(); if (!configured || !canW) return; generate(false); };
        if (AIL.run && configured) showRun(AIL.run);
      }).catch(e => { root.innerHTML = errBox("Terjadi kendala saat memuat.", 1); });
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
        { key: "dup", label: "Duplikat", render: renderDup },
        { key: "ai", label: "AI Generator", render: renderAI },
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
