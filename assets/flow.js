(function () {
  "use strict";
  var d = document, $ = function (s, r) { return (r || d).querySelector(s); }, $$ = function (s, r) { return Array.prototype.slice.call((r || d).querySelectorAll(s)); };
  var C = window.NM_CONFIG || {};
  var sb = (C.SUPABASE_URL && C.SUPABASE_ANON_KEY && window.supabase) ? window.supabase.createClient(C.SUPABASE_URL, C.SUPABASE_ANON_KEY, { auth: { persistSession: true, autoRefreshToken: true } }) : null;
  var PAGE = d.body.dataset.page, view = $("#view"), U = null;
  var CATS = [["wedding", "Wedding"], ["engagement", "Engagement"], ["birthday", "Birthday"], ["graduation", "Graduation"], ["aqiqah", "Aqiqah"], ["seminar", "Seminar & Workshop"], ["corporate", "Corporate Event"], ["other", "Lainnya"]];
  var CATN = {}; CATS.forEach(function (c) { CATN[c[0]] = c[1]; });
  var BUILTIN = [
    { slug: "romantic-garden", name: "Romantic Garden", cats: ["wedding", "engagement", "birthday"], desc: "Taman bunga blush dan lavender dengan gazebo kaca. Lembut, romantis, dan hangat.", img: "/assets/img/romantic-garden-s1.webp", demo: "/live/" },
    { slug: "jawa-tengah", name: "Adat Jawa Tengah", cats: ["wedding", "engagement"], desc: "Pendopo joglo, pelaminan emas, batik kawung, serta avatar kebaya dan beskap.", img: "/assets/img/jawa-tengah-s1.webp", demo: "/live/jawa-tengah" }
  ];
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function toast(t, k) { var e = d.createElement("div"); e.className = "toast " + (k || ""); e.setAttribute("role", k === "bad" ? "alert" : "status"); e.textContent = t; $("#toasts").appendChild(e); setTimeout(function () { e.remove(); }, 4500); }
  function steps(cur) { var L = ["Pilih Template", "Kategori & Link", "Isi Undangan"]; return '<ol class="stp" aria-label="Tahapan pembuatan undangan">' + L.map(function (l, i) { return '<li class="' + (i < cur ? "done" : i === cur ? "cur" : "") + '"' + (i === cur ? ' aria-current="step"' : "") + "><span>" + l + "</span></li>"; }).join("") + "</ol>"; }
  function note(t, p, cta) { return '<div class="fw narrow"><div class="card"><div class="empty"><span class="ico"><svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/></svg></span><h3>' + esc(t) + "</h3><p>" + esc(p) + "</p>" + (cta || "") + "</div></div></div>"; }
  function nextUrl() { return location.pathname.replace(/^\//, "/").replace(/\.html$/, "") + location.search; }
  var ERR = { slug_digunakan: "URL ini sudah digunakan. Coba yang lain.", slug_dicadangkan: "URL ini dicadangkan sistem. Pilih yang lain.", slug_tidak_valid: "Format URL belum benar.", batas_draft: "Anda sudah memiliki 20 draft. Selesaikan atau hapus draft lama dulu.", akun_ditangguhkan: "Akun Anda sedang ditangguhkan.", template_tidak_valid: "Template tidak tersedia.", kategori_tidak_valid: "Kategori tidak valid.", tidak_ditemukan: "Undangan tidak ditemukan.", tidak_dapat_diubah: "Undangan ini tidak dapat diubah.", foto_tidak_valid: "Foto tidak valid.", konten_tidak_valid: "Isi undangan terlalu besar." };
  function errText(e) { var m = (e && e.message) || ""; return ERR[m] || (/fetch|network/i.test(m) ? "Tidak bisa terhubung. Periksa koneksi internet." : "Terjadi kendala. Coba lagi."); }

  function loadTemplates() {
    return sb.from("templates").select("slug,name,description,thumbnail_url,preview_url,event_categories(slug)").eq("status", "published").order("sort").then(function (r) {
      var out = (r.error || !r.data ? [] : r.data).map(function (t) { return { slug: t.slug, name: t.name, cats: t.event_categories && t.event_categories.slug ? [t.event_categories.slug] : ["other"], desc: t.description || "", img: t.thumbnail_url || "", demo: t.preview_url || "" }; });
      BUILTIN.forEach(function (b) { if (!out.some(function (x) { return x.slug === b.slug; })) out.push(b); });
      return out;
    }, function () { return BUILTIN.slice(); });
  }

  /* ================= HALAMAN TEMPLATE ================= */
  function pageTemplate() {
    var sel = (location.hash || "").slice(1); if (!CATN[sel]) sel = "";
    loadTemplates().then(function (T) {
      function draw() {
        var list = T.filter(function (t) { return !sel || t.cats.indexOf(sel) > -1; });
        view.innerHTML = '<div class="fw">' + steps(0) + '<div class="hd"><h1>Pilih template undangan Anda</h1><p>Pilih kategori acara, lalu coba demo dan gunakan template yang paling mewakili cerita Anda.</p></div>' +
          '<div class="cats" role="group" aria-label="Kategori acara"><button type="button" data-c="" aria-pressed="' + (!sel) + '">Semua</button>' + CATS.map(function (c) { return '<button type="button" data-c="' + c[0] + '" aria-pressed="' + (sel === c[0]) + '">' + esc(c[1]) + "</button>"; }).join("") + "</div>" +
          (list.length ? '<div class="tg">' + list.map(function (t) { return '<article class="card tc hov"><div class="im">' + (t.img ? '<img src="' + esc(t.img) + '" alt="Pratinjau template ' + esc(t.name) + '" loading="lazy">' : "") + '</div><div class="bd"><h2>' + esc(t.name) + '</h2><div class="tags">' + t.cats.map(function (c) { return '<span class="tag">' + esc(CATN[c] || c) + "</span>"; }).join("") + "</div><p>" + esc(t.desc) + '</p><div class="two">' + (t.demo ? '<a class="btn o" target="_blank" rel="noopener" href="' + esc(t.demo) + '">Coba Demo</a>' : "<span></span>") + '<button class="btn" type="button" data-use="' + esc(t.slug) + '">Gunakan Template</button></div></div></article>'; }).join("") + "</div>" :
            '<div class="card"><div class="empty"><span class="ico"><svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="3.5" width="7.5" height="9" rx="1.5"/><rect x="13" y="3.5" width="7.5" height="5" rx="1.5"/><rect x="13" y="10.5" width="7.5" height="10" rx="1.5"/></svg></span><h3>Template ' + esc(CATN[sel] || "") + ' sedang disiapkan</h3><p>Belum ada template khusus kategori ini. Anda bisa memakai template lain dan menyesuaikan isinya.</p><button class="btn" type="button" data-c="">Lihat semua template</button></div></div>') + "</div>";
      }
      draw();
      view.onclick = function (e) {
        var c = e.target.closest("[data-c]"); if (c) { sel = c.dataset.c; history.replaceState(null, "", sel ? "#" + sel : location.pathname + location.search); draw(); return; }
        var u = e.target.closest("[data-use]"); if (u) { var t = T.filter(function (x) { return x.slug === u.dataset.use; })[0], cat = sel && t.cats.indexOf(sel) > -1 ? sel : t.cats[0]; location.href = "/buat?template=" + encodeURIComponent(t.slug) + "&kategori=" + encodeURIComponent(cat); }
      };
    });
  }

  /* ================= HALAMAN ATUR KATEGORI & LINK ================= */
  var SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
  function slugCheckLocal(s) { if (!s) return { s: "idle" }; if (s.length < 3) return { s: "bad", m: "Minimal 3 karakter." }; if (s.length > 40) return { s: "bad", m: "Maksimal 40 karakter." }; if (!/^[a-z0-9-]+$/.test(s)) return { s: "bad", m: "Hanya huruf kecil, angka, dan tanda hubung (-). Tanpa spasi atau simbol lain." }; if (!SLUG_RE.test(s)) return { s: "bad", m: "Tanda hubung tidak boleh di awal, di akhir, atau berurutan." }; return { s: "ok" }; }
  function pageBuat() {
    var q = new URLSearchParams(location.search), tslug = q.get("template") || "", kat = q.get("kategori") || "";
    loadTemplates().then(function (T) {
      var t = T.filter(function (x) { return x.slug === tslug; })[0];
      if (!t) { view.innerHTML = note("Template belum dipilih", "Pilih template terlebih dahulu sebelum mengatur link undangan.", '<a class="btn" href="/template">Pilih Template</a>'); return; }
      if (!CATN[kat]) kat = t.cats[0];
      var saved = {}; try { saved = JSON.parse(sessionStorage.getItem("nm:buat:" + tslug) || "{}"); } catch (e) { }
      view.innerHTML = '<div class="fw">' + steps(1) + '<div class="fc"><div class="card"><h1 style="font:700 clamp(26px,3.4vw,34px)/1.15 var(--display)">Atur Kategori &amp; Link Undangan</h1><p class="sub" style="margin-top:8px">Tentukan jenis acara dan alamat undangan yang mudah diingat tamu Anda.</p>' +
        '<form id="fb" novalidate><div class="f"><label for="cat">Kategori acara</label><select id="cat">' + CATS.map(function (c) { return '<option value="' + c[0] + '"' + (c[0] === kat ? " selected" : "") + ">" + esc(c[1]) + "</option>"; }).join("") + "</select></div>" +
        '<div class="f"><div class="hint"><b>Tips:</b> buat link yang singkat dan mudah diingat, misalnya <b>raka-sinta</b> atau <b>ulangtahun-sinta</b>. Link ini dipakai tamu untuk membuka undangan Anda.</div></div>' +
        '<div class="f"><label for="slug">Link undangan</label><div class="slug" id="sw"><span aria-hidden="true">nusamora.com/</span><input id="slug" type="text" inputmode="url" autocomplete="off" autocapitalize="off" spellcheck="false" maxlength="40" aria-describedby="sst" placeholder="nama-acara-anda" value="' + esc(saved.slug || "") + '"></div><div class="st" id="sst" role="status" aria-live="polite"></div><div class="sugg" id="sg"></div></div>' +
        '<div class="acts"><a class="btn o" href="/template">Kembali</a><button class="btn" type="submit" id="nx" disabled>Selanjutnya</button></div></form></div>' +
        '<aside class="side-c"><div class="card mini"><span class="tag" style="justify-self:start">Template terpilih</span>' + (t.img ? '<img src="' + esc(t.img) + '" alt="">' : "") + "<b>" + esc(t.name) + '</b><a href="/template" style="color:var(--deep);font-weight:700;font-size:14px">Ganti template</a></div></aside></div></div>';
      var inp = $("#slug"), sw = $("#sw"), st = $("#sst"), nx = $("#nx"), tok = 0, timer = null, okSlug = "";
      function setS(cls, html) { sw.className = "slug" + (cls ? " " + cls : ""); st.className = "st " + (cls || ""); st.innerHTML = html; }
      function check() {
        var v = inp.value, p = slugCheckLocal(v); okSlug = ""; nx.disabled = true; $("#sg").innerHTML = "";
        try { sessionStorage.setItem("nm:buat:" + tslug, JSON.stringify({ slug: v })); } catch (e) { }
        if (p.s === "idle") return setS("", ""); if (p.s === "bad") return setS("bad", esc(p.m));
        var my = ++tok; setS("wait", '<i class="spin"></i> Memeriksa ketersediaan...');
        clearTimeout(timer); timer = setTimeout(function () {
          sb.rpc("slug_available", { p_slug: v }).then(function (r) {
            if (my !== tok) return; if (r.error) return setS("bad", "Tidak bisa memeriksa ketersediaan. Coba lagi sebentar.");
            var x = r.data || {};
            if (x.ok) { okSlug = v; nx.disabled = false; return setS("ok", "&#10003; nusamora.com/" + esc(v) + " tersedia"); }
            var msg = { digunakan: "URL ini sudah digunakan. Coba tambahkan nama lengkap atau tahun.", dicadangkan: "URL ini dicadangkan oleh sistem. Pilih yang lain.", format: "Format URL belum benar.", panjang: "Gunakan 3 sampai 40 karakter." }[x.reason] || "URL tidak dapat dipakai.";
            setS("bad", esc(msg)); if (x.reason === "digunakan") $("#sg").innerHTML = [v + "-" + new Date().getFullYear(), v + "-undangan", "undangan-" + v].filter(function (s) { return s.length <= 40; }).map(function (s) { return '<button type="button" data-s="' + esc(s) + '">' + esc(s) + "</button>"; }).join("");
          }, function () { if (my === tok) setS("bad", "Tidak bisa terhubung. Periksa koneksi internet."); });
        }, 450);
      }
      inp.addEventListener("input", function () { var v = inp.value.toLowerCase().replace(/\s+/g, "-"); if (v !== inp.value) inp.value = v; check(); });
      $("#sg").addEventListener("click", function (e) { var b = e.target.closest("[data-s]"); if (b) { inp.value = b.dataset.s; check(); inp.focus(); } });
      $("#fb").addEventListener("submit", function (e) {
        e.preventDefault(); if (!okSlug) return; nx.disabled = true; nx.textContent = "Membuat draft...";
        sb.rpc("create_invitation", { p_template: tslug, p_category: $("#cat").value, p_slug: okSlug }).then(function (r) {
          if (r.error) { nx.textContent = "Selanjutnya"; var m = r.error.message; if (m === "slug_digunakan" || m === "slug_dicadangkan") { okSlug = ""; setS("bad", esc(ERR[m])); } else { nx.disabled = false; toast(errText(r.error), "bad"); } return; }
          try { sessionStorage.removeItem("nm:buat:" + tslug); } catch (e2) { }
          location.href = "/editor?id=" + encodeURIComponent(r.data);
        }, function (er) { nx.disabled = false; nx.textContent = "Selanjutnya"; toast(errText(er), "bad"); });
      });
      if (saved.slug) check(); inp.focus();
    });
  }

  /* ================= EDITOR ================= */
  var LAB = { wedding: ["Nama mempelai wanita", "Nama mempelai pria"], engagement: ["Nama calon mempelai wanita", "Nama calon mempelai pria"], birthday: ["Nama yang berulang tahun", ""], graduation: ["Nama wisudawan/wisudawati", ""], aqiqah: ["Nama anak", "Nama orang tua"], seminar: ["Nama acara", "Penyelenggara"], corporate: ["Nama acara", "Perusahaan / penyelenggara"], other: ["Nama acara", "Penyelenggara"] };
  var DEF = { names: { a: "", b: "" }, welcome: "", event: { start: "", end: "", tz: "WIB", venue: "", address: "", maps: "" }, photos: { cover: "", gallery: [] }, music: { enabled: true, track: "we-are" }, features: { rsvp: true, guestbook: true, countdown: true, gift: false }, gift: { bank: "", number: "", holder: "" } };
  function merge(a, b) { var o = JSON.parse(JSON.stringify(a)); Object.keys(b || {}).forEach(function (k) { if (b[k] && typeof b[k] === "object" && !Array.isArray(b[k]) && o[k] && typeof o[k] === "object" && !Array.isArray(o[k])) o[k] = merge(o[k], b[k]); else if (b[k] != null) o[k] = b[k]; }); return o; }
  function get(o, p) { return p.split(".").reduce(function (x, k) { return x && x[k]; }, o); }
  function set(o, p, v) { var ks = p.split("."), last = ks.pop(), t = ks.reduce(function (x, k) { return x[k] || (x[k] = {}); }, o); t[last] = v; }
  var GALLERY_MAX = 10;
  function pageEditor() {
    var id = new URLSearchParams(location.search).get("id");
    if (!id) { view.innerHTML = note("Undangan tidak ditemukan", "Buka undangan dari daftar Undangan Saya.", '<a class="btn" href="/akun#undangan">Undangan Saya</a>'); return; }
    sb.from("invitations").select("id,title,category,template_id,slug,status,event_date,content,updated_at,moderation,public_url,expires_at").eq("id", id).maybeSingle().then(function (r) {
      var inv = r.data;
      if (r.error || !inv) { view.innerHTML = note("Undangan tidak ditemukan", "Undangan ini tidak ada atau bukan milik akun Anda.", '<a class="btn" href="/akun#undangan">Undangan Saya</a>'); return; }
      var cat = CATN[inv.category] ? inv.category : "other", lab = LAB[cat], C0 = merge(DEF, inv.content || {}), date = inv.event_date || "", locked = !(inv.status === "draft" || inv.status === "aktif") || inv.moderation === "takedown", pend = inv.status === "menunggu_pembayaran";
      var dirty = false, busy = false, timer = null, retry = 0, state = "ok", savedAt = inv.updated_at;
      function fld(lbl, p, o) { o = o || {}; var v = p === "date" ? date : (get(C0, p) || ""); return '<div class="f' + (o.full ? " full" : "") + '"><label for="e-' + p + '">' + esc(lbl) + '</label><' + (o.ta ? "textarea" : "input type=\"" + (o.type || "text") + "\"") + ' id="e-' + p + '" data-p="' + p + '"' + (o.max ? ' maxlength="' + o.max + '"' : "") + (o.ph ? ' placeholder="' + esc(o.ph) + '"' : "") + (locked ? " disabled" : "") + (o.ta ? ">" + esc(v) + "</textarea>" : ' value="' + esc(v) + '">') + "</div>"; }
      function sw(p, t, s) { return '<label class="sw"><input type="checkbox" data-p="' + p + '"' + (get(C0, p) ? " checked" : "") + (locked ? " disabled" : "") + "><div><b>" + esc(t) + "</b><span>" + esc(s) + "</span></div></label>"; }
      var secs = [["info", "Informasi Acara"], ["waktu", "Waktu & Tempat"], ["foto", "Foto"], ["musik", "Musik"], ["fitur", "Komponen Undangan"]];
      view.innerHTML = '<div class="fw">' + steps(2) + '<div class="hd"><h1 id="ttl">' + esc(inv.title) + '</h1><p>Isi detail undangan Anda. Perubahan tersimpan otomatis, jadi Anda bisa keluar dan melanjutkan kapan saja.</p></div>' + banner(inv, locked) +
        '<div class="ed"><nav aria-label="Bagian editor">' + secs.map(function (s) { return '<a href="#s-' + s[0] + '">' + s[1] + "</a>"; }).join("") + '</nav><div class="edcol">' +
        '<section class="card sec" id="s-info"><h2>Informasi Acara</h2><p class="sub">Nama yang akan tampil di undangan.</p><div class="g2f">' + fld(lab[0], "names.a", { max: 80 }) + (lab[1] ? fld(lab[1], "names.b", { max: 80 }) : "") + fld("Kata sambutan", "welcome", { ta: 1, full: 1, max: 1000, ph: "Tulis sapaan hangat untuk tamu Anda..." }) + "</div></section>" +
        '<section class="card sec" id="s-waktu"><h2>Waktu &amp; Tempat</h2><div class="g2f">' + fld("Tanggal acara", "date", { type: "date" }) + '<div class="f"><label for="e-event.tz">Zona waktu</label><select id="e-event.tz" data-p="event.tz"' + (locked ? " disabled" : "") + ">" + ["WIB", "WITA", "WIT"].map(function (z) { return '<option value="' + z + '"' + (C0.event.tz === z ? " selected" : "") + ">" + z + "</option>"; }).join("") + "</select></div>" + fld("Jam mulai", "event.start", { type: "time" }) + fld("Jam selesai", "event.end", { type: "time" }) + fld("Nama lokasi", "event.venue", { full: 1, max: 120, ph: "Mis. Gedung Serbaguna Kenanga" }) + fld("Alamat lengkap", "event.address", { ta: 1, full: 1, max: 400 }) + fld("Tautan Google Maps", "event.maps", { type: "url", full: 1, max: 500, ph: "https://maps.google.com/..." }) + "</div></section>" +
        '<section class="card sec" id="s-foto"><h2>Foto</h2><p class="sub">PNG, JPG, atau WebP. Foto dikecilkan otomatis agar undangan cepat dibuka.</p><div class="f"><label>Foto sampul</label><div class="cover" id="cv">' + (C0.photos.cover ? '<img src="' + esc(C0.photos.cover) + '" alt="Foto sampul">' : "Belum ada foto sampul") + '</div>' + (locked ? "" : '<label class="drop"><b>Pilih foto sampul</b><span>atau seret ke sini</span><input type="file" accept="image/png,image/jpeg,image/webp" id="up-c"></label>') + '<span class="err" id="er-c"></span></div>' +
        '<div class="f"><label>Galeri foto <small>(maks. ' + GALLERY_MAX + " foto)</small></label><div class=\"ph\" id=\"gl\"></div>" + (locked ? "" : '<label class="drop"><b>Tambah foto galeri</b><span>Bisa pilih beberapa sekaligus</span><input type="file" accept="image/png,image/jpeg,image/webp" id="up-g" multiple></label>') + '<span class="err" id="er-g"></span></div></section>' +
        '<section class="card sec" id="s-musik"><h2>Musik</h2><p class="sub">Musik latar yang diputar saat tamu membuka undangan.</p>' + sw("music.enabled", "Putar musik latar", "Tamu dapat mematikannya kapan saja.") + '<div class="f"><label for="e-music.track">Pilihan lagu</label><select id="e-music.track" data-p="music.track"' + (locked ? " disabled" : "") + '><option value="we-are">We Are - Moavii (bawaan)</option></select></div></section>' +
        '<section class="card sec" id="s-fitur"><h2>Komponen Undangan</h2>' + sw("features.countdown", "Hitung mundur", "Menampilkan sisa waktu menuju acara.") + sw("features.rsvp", "RSVP", "Tamu mengonfirmasi kehadiran dari link pribadinya.") + sw("features.guestbook", "Buku ucapan", "Ucapan dan doa dari tamu terundang.") + sw("features.gift", "Hadiah digital", "Tampilkan rekening untuk hadiah.") + '<div class="g2f" id="giftf"' + (C0.features.gift ? "" : " hidden") + ">" + fld("Nama bank / e-wallet", "gift.bank", { max: 40 }) + fld("Nomor rekening", "gift.number", { max: 40 }) + fld("Atas nama", "gift.holder", { full: 1, max: 80 }) + "</div></section></div>" +
        '<aside class="ped"><div class="card"><div class="save" id="sv" role="status" aria-live="polite"><i></i><span id="svt">Tersimpan</span></div><div class="f" style="margin-top:14px"><b style="font-size:14px">Kelengkapan <span id="pc">0</span>%</b><div class="bar2"><i id="pb" style="width:0"></i></div><ul class="chk" id="ck"></ul></div></div>' +
        '<div class="card"><div class="f" style="margin-top:0"><small>Link undangan</small><b style="word-break:break-all">nusamora.com/' + esc(inv.slug || "") + '</b><small>Kategori: ' + esc(CATN[cat]) + " &middot; Status: " + esc(inv.status) + '</small></div><div class="acts" style="margin-top:14px;flex-direction:column">' + (inv.status === "aktif" ? "" : '<button class="btn" type="button" id="pub-b"' + (inv.moderation === "takedown" || inv.status === "selesai" || inv.status === "nonaktif" ? " disabled" : "") + ">" + (pend ? "Lanjutkan pembayaran" : "Publikasikan") + "</button>") + '<button class="btn o" type="button" id="pv-b">Preview</button><button class="btn o" type="button" id="sv-b"' + (locked ? " disabled" : "") + '>Simpan sekarang</button><a class="btn o" href="/akun#undangan">Simpan &amp; ke dashboard</a></div></div></aside></div></div>';
      var photosC = merge(DEF, {}).photos; photosC.cover = C0.photos.cover; photosC.gallery = (C0.photos.gallery || []).slice();
      C0.photos = photosC;

      function content() { return { names: C0.names, welcome: C0.welcome, event: C0.event, photos: C0.photos, music: C0.music, features: C0.features, gift: C0.gift }; }
      function title() { var a = (C0.names.a || "").trim(), b = (C0.names.b || "").trim(); return a && b && (cat === "wedding" || cat === "engagement") ? a + " & " + b : a || inv.title; }
      function setSv(s, t) { state = s; var el = $("#sv"); el.className = "save " + (s === "ok" ? "" : s); $("#svt").textContent = t; }
      function progress() { var ck = [["Nama acara", !!(C0.names.a || "").trim()], ["Tanggal acara", !!date], ["Jam mulai", !!C0.event.start], ["Lokasi", !!(C0.event.venue || "").trim()], ["Foto sampul", !!C0.photos.cover], ["Foto galeri", C0.photos.gallery.length > 0]], n = ck.filter(function (x) { return x[1]; }).length, p = Math.round(n / ck.length * 100); $("#pc").textContent = p; $("#pb").style.width = p + "%"; $("#ck").innerHTML = ck.map(function (x) { return '<li class="' + (x[1] ? "y" : "") + '">' + esc(x[0]) + "</li>"; }).join(""); }
      function gallery() { $("#gl").innerHTML = C0.photos.gallery.map(function (u, i) { return '<div class="it"><img src="' + esc(u) + '" alt="Foto galeri ' + (i + 1) + '" loading="lazy">' + (locked ? "" : '<button type="button" data-rm="' + i + '" aria-label="Hapus foto ' + (i + 1) + '">&times;</button>') + "</div>"; }).join(""); progress(); }
      function save(now) {
        if (locked) return; clearTimeout(timer); dirty = true; setSv("dirty", "Perubahan belum disimpan...");
        timer = setTimeout(run, now ? 0 : 1200);
      }
      function run() {
        if (busy) { timer = setTimeout(run, 400); return; } if (!dirty) return; busy = true; dirty = false; setSv("busy", "Menyimpan...");
        sb.rpc("save_invitation", { p_id: inv.id, p_title: title(), p_event_date: date || null, p_content: content() }).then(function (r) {
          busy = false;
          if (r.error) { dirty = true; if (r.error.message && ERR[r.error.message]) { setSv("err", errText(r.error)); return; } retry++; setSv("err", "Gagal menyimpan. " + (retry < 4 ? "Mencoba lagi..." : "Periksa koneksi lalu tekan Simpan sekarang.")); if (retry < 4) timer = setTimeout(run, 2500 * retry); return; }
          retry = 0; $("#ttl").textContent = title(); var t = new Date(); setSv(dirty ? "dirty" : "ok", dirty ? "Perubahan belum disimpan..." : "Tersimpan " + t.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })); if (dirty) save(false);
        }, function () { busy = false; dirty = true; retry++; setSv("err", "Gagal menyimpan. Mencoba lagi..."); if (retry < 4) timer = setTimeout(run, 2500 * retry); });
      }
      view.addEventListener("input", function (e) { var el = e.target.closest("[data-p]"); if (!el || el.type === "checkbox") return; var p = el.dataset.p; if (p === "date") date = el.value; else set(C0, p, el.value); progress(); save(false); });
      view.addEventListener("change", function (e) { var el = e.target.closest("[data-p]"); if (!el) return; var p = el.dataset.p; if (el.type === "checkbox") { set(C0, p, el.checked); if (p === "features.gift") $("#giftf").hidden = !el.checked; save(false); } else if (el.tagName === "SELECT") { set(C0, p, el.value); save(false); } });
      $("#sv-b").addEventListener("click", function () { retry = 0; save(true); });
      d.addEventListener("visibilitychange", function () { if (d.hidden && dirty && !busy) { clearTimeout(timer); run(); } });
      addEventListener("beforeunload", function (e) { if (dirty || busy) { e.preventDefault(); e.returnValue = ""; } });
      // foto
      function resize(file) { return new Promise(function (res, rej) { var img = new Image(), u = URL.createObjectURL(file); img.onload = function () { var m = 1600, s = Math.min(1, m / Math.max(img.width, img.height)), c = d.createElement("canvas"); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s); c.getContext("2d").drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(u); c.toBlob(function (b) { b ? res(b) : rej(); }, "image/webp", 0.85); }; img.onerror = function () { URL.revokeObjectURL(u); rej(); }; img.src = u; }); }
      function upload(file) {
        if (!/^image\/(png|jpeg|webp)$/.test(file.type)) return Promise.reject("Hanya PNG, JPG, atau WebP.");
        if (file.size > 15 * 1024 * 1024) return Promise.reject("Ukuran foto maksimal 15 MB.");
        return resize(file).then(function (b) { if (b.size > 3145728) throw "Foto terlalu besar setelah dikecilkan."; var path = U.id + "/" + inv.id + "/" + Date.now() + "-" + Math.random().toString(36).slice(2, 7) + ".webp"; return sb.storage.from("invitation-media").upload(path, b, { contentType: "image/webp" }).then(function (r) { if (r.error) throw "Gagal mengunggah foto. Coba lagi."; return sb.storage.from("invitation-media").getPublicUrl(path).data.publicUrl; }); }, function () { throw "Foto tidak bisa dibaca."; });
      }
      var uc = $("#up-c"), ug = $("#up-g");
      if (uc) uc.onchange = function () { var f = uc.files[0]; if (!f) return; $("#er-c").textContent = "Mengunggah..."; upload(f).then(function (u) { C0.photos.cover = u; $("#cv").innerHTML = '<img src="' + esc(u) + '" alt="Foto sampul">'; $("#er-c").textContent = ""; progress(); save(true); }, function (m) { $("#er-c").textContent = typeof m === "string" ? m : "Gagal mengunggah."; }); uc.value = ""; };
      if (ug) ug.onchange = function () {
        var fs = Array.prototype.slice.call(ug.files), room = GALLERY_MAX - C0.photos.gallery.length, er = $("#er-g"); er.textContent = ""; if (!fs.length) return; if (room <= 0) { er.textContent = "Galeri sudah penuh (" + GALLERY_MAX + " foto)."; ug.value = ""; return; } if (fs.length > room) { er.textContent = "Hanya " + room + " foto pertama yang diunggah (batas galeri)."; fs = fs.slice(0, room); }
        er.textContent += (er.textContent ? " " : "") + "Mengunggah..."; Promise.all(fs.map(function (f) { return upload(f).then(function (u) { return { u: u }; }, function (m) { return { e: m }; }); })).then(function (rs) { var bad = rs.filter(function (x) { return x.e; }); rs.forEach(function (x) { if (x.u) C0.photos.gallery.push(x.u); }); er.textContent = bad.length ? (typeof bad[0].e === "string" ? bad[0].e : "Sebagian foto gagal diunggah.") : ""; gallery(); save(true); }); ug.value = "";
      };
      $("#gl").addEventListener("click", function (e) { var b = e.target.closest("[data-rm]"); if (!b) return; var i = Number(b.dataset.rm), u = C0.photos.gallery[i]; C0.photos.gallery.splice(i, 1); gallery(); save(true); var p = u && u.split("/invitation-media/")[1]; if (p) sb.storage.from("invitation-media").remove([p]); });
      // preview & publikasi
      function flush() { clearTimeout(timer); if (dirty && !busy) { run(); } return new Promise(function (res) { (function w(n) { if (!dirty && !busy) return res(); if (n > 40 || state === "err") return res(); setTimeout(function () { w(n + 1); }, 150); })(0); }); }
      function snapshot() { return { inv: inv, cat: cat, date: date, c: C0, lab: lab }; }
      $("#pv-b").addEventListener("click", function () { openPreview(snapshot()); });
      var pb = $("#pub-b");
      if (pb) pb.addEventListener("click", function () { if (pend) { goPayNow(inv); return; } flush().then(function () { openPublish(snapshot(), flush); }); });
      var cb = $("#bn-cancel"); if (cb) cb.addEventListener("click", function () { cancelPay(inv, cb); });
      var cp = $("#bn-copy"); if (cp) cp.addEventListener("click", function () { copyText(cp.dataset.u, cp); });
      if (new URLSearchParams(location.search).get("publish") === "1" && !locked && !pend && inv.status === "draft") flush().then(function () { openPublish(snapshot(), flush); });
      // nav bagian
      var links = $$(".ed nav a"); function spy() { var cur = secs[0][0]; secs.forEach(function (s) { var el = d.getElementById("s-" + s[0]); if (el && el.getBoundingClientRect().top < 160) cur = s[0]; }); links.forEach(function (a) { a.classList.toggle("on", a.getAttribute("href") === "#s-" + cur); }); } addEventListener("scroll", spy, { passive: true }); spy();
      gallery(); setSv("ok", "Tersimpan");
    }, function () { view.innerHTML = note("Tidak bisa terhubung", "Periksa koneksi internet Anda lalu muat ulang halaman."); });
  }


  /* ================= PUBLIKASI & PEMBAYARAN ================= */
  var EXP = { "2d": "Undangan digital 2D", "3d": "Undangan 3D cinematic", "live": "Undangan 3D + Live Guest" };
  var SEC = { "Nama acara": "info", "Nama pasangan": "info", "Tanggal acara": "waktu", "Jam mulai": "waktu", "Nama lokasi": "waktu", "Foto sampul": "foto" };
  function rp(n) { return "Rp" + Number(n || 0).toLocaleString("id-ID"); }
  function fdate(x, long) { if (!x) return "-"; var dt = new Date(x); return isNaN(dt) ? "-" : dt.toLocaleDateString("id-ID", long ? { weekday: "long", day: "numeric", month: "long", year: "numeric" } : { day: "numeric", month: "long", year: "numeric" }); }
  function copyText(t, btn) { var done = function () { if (btn) { var o = btn.textContent; btn.textContent = "Tersalin"; setTimeout(function () { btn.textContent = o; }, 1800); } }; try { navigator.clipboard.writeText(t).then(done, function () { toast("Salin manual: " + t); }); } catch (e) { toast("Salin manual: " + t); } }
  function banner(inv, locked) {
    var url = inv.public_url || ("https://nusamora.com/" + (inv.slug || ""));
    if (inv.status === "aktif") return '<div class="bn ok"><div><b>Undangan sudah dipublikasikan</b><span>Aktif hingga ' + esc(fdate(inv.expires_at)) + ". Perubahan pada isi undangan langsung tersimpan.</span><code>" + esc(url.replace(/^https?:\/\//, "")) + '</code></div><button class="btn o sm" type="button" id="bn-copy" data-u="' + esc(url) + '">Salin link</button></div>';
    if (inv.status === "menunggu_pembayaran") return '<div class="bn warn"><div><b>Menunggu Pembayaran</b><span>Isi undangan dikunci selama pembayaran berjalan. Selesaikan pembayaran, atau batalkan untuk mengubah data atau mengganti paket.</span></div><button class="btn o sm" type="button" id="bn-cancel">Batalkan pembayaran</button></div>';
    if (locked) return '<div class="note" style="margin-bottom:16px">Undangan ini tidak dapat diubah saat ini.</div>';
    return "";
  }
  function dlg(html, cls) {
    var old = d.getElementById("fdlg"); if (old) old.remove();
    var e = d.createElement("dialog"); e.id = "fdlg"; e.className = "fdlg " + (cls || ""); e.innerHTML = html; d.body.appendChild(e);
    e.addEventListener("click", function (ev) { if (ev.target === e || ev.target.closest("[data-x]")) e.close(); });
    e.addEventListener("close", function () { e.remove(); });
    if (typeof e.showModal === "function") e.showModal(); else e.setAttribute("open", "");
    return e;
  }
  function fnError(err) {
    if (!err) return Promise.resolve({ message: "Terjadi kendala. Coba lagi." });
    var ctx = err.context; if (ctx && typeof ctx.json === "function") return ctx.json().then(function (j) { return j || {}; }, function () { return { message: "Terjadi kendala. Coba lagi." }; });
    return Promise.resolve({ message: /fetch|network|relay|Failed/i.test(err.message || "") ? "Layanan pembayaran belum dapat dihubungi. Periksa koneksi internet atau hubungi NusaMora." : "Terjadi kendala. Coba lagi." });
  }
  function checkout(body) {
    return sb.functions.invoke("midtrans-checkout", { body: body }).then(function (r) { if (r.error) return fnError(r.error).then(function (e) { return { err: e }; }); if (r.data && r.data.redirect_url) return { data: r.data }; return { err: { message: "Respons pembayaran tidak valid." } }; }, function () { return { err: { message: "Layanan pembayaran belum dapat dihubungi." } }; });
  }
  function goPayNow(inv) {
    sb.from("payments").select("order_id,redirect_url,status").eq("invitation_id", inv.id).eq("status", "pending").maybeSingle().then(function (r) {
      if (r.data && r.data.redirect_url) { location.href = r.data.redirect_url; return; }
      toast("Data pembayaran tidak ditemukan. Batalkan lalu publikasikan ulang.", "bad");
    });
  }
  function cancelPay(inv, btn) {
    btn.disabled = true; btn.textContent = "Membatalkan...";
    sb.from("payments").select("order_id").eq("invitation_id", inv.id).eq("status", "pending").maybeSingle().then(function (r) {
      if (!r.data) { location.reload(); return; }
      return sb.functions.invoke("midtrans-checkout", { body: { action: "cancel", order_id: r.data.order_id } }).then(function (x) { if (x.error) { btn.disabled = false; btn.textContent = "Batalkan pembayaran"; toast("Gagal membatalkan. Coba lagi.", "bad"); return; } location.reload(); });
    });
  }
  function missingList(s) {
    var c = s.c, m = [];
    if (!(c.names.a || "").trim()) m.push("Nama acara");
    if ((s.cat === "wedding" || s.cat === "engagement") && !(c.names.b || "").trim()) m.push("Nama pasangan");
    if (!s.date) m.push("Tanggal acara"); if (!c.event.start) m.push("Jam mulai"); if (!(c.event.venue || "").trim()) m.push("Nama lokasi"); if (!c.photos.cover) m.push("Foto sampul");
    return m;
  }
  function missingHtml(m) { return '<ul class="miss">' + m.map(function (x) { return '<li><a href="#s-' + (SEC[x] || "info") + '" data-x>' + esc(x) + "</a></li>"; }).join("") + "</ul>"; }
  function openPublish(s, flush) {
    var miss = missingList(s);
    if (miss.length) { dlg('<h2>Lengkapi data undangan</h2><p class="sub">Data berikut wajib diisi sebelum undangan dapat dipublikasikan.</p>' + missingHtml(miss) + '<div class="acts"><button class="btn" type="button" data-x>Lengkapi sekarang</button></div>'); return; }
    var e = dlg('<h2>Publikasikan undangan</h2><p class="sub">Memuat paket...</p><div class="sk h4"></div>', "wide");
    Promise.all([sb.from("plans").select("id,name,price,duration_days,gallery_limit,allow_3d,allow_live_guest,features").eq("active", true).order("sort"), sb.from("profiles").select("plan").eq("id", U.id).maybeSingle()]).then(function (r) {
      var P = (r[0].data || []), def = r[1].data && r[1].data.plan, g = s.c.photos.gallery.length;
      if (!P.length) { e.innerHTML = '<h2>Publikasikan undangan</h2><p class="sub">Paket belum tersedia. Coba lagi nanti.</p><div class="acts"><button class="btn o" type="button" data-x>Tutup</button></div>'; return; }
      var sel = P.filter(function (p) { return p.id === def && g <= p.gallery_limit; })[0] || P.filter(function (p) { return p.id === "signature" && g <= p.gallery_limit; })[0] || P.filter(function (p) { return g <= p.gallery_limit; })[0] || P[0];
      function exp(p) { return p.allow_live_guest ? "live" : p.allow_3d ? "3d" : "2d"; }
      function draw() {
        e.innerHTML = '<h2>Publikasikan undangan</h2><p class="sub">Pilih paket. Undangan aktif setelah pembayaran terkonfirmasi.</p><div class="pls" role="radiogroup" aria-label="Pilih paket">' +
          P.map(function (p) { var off = g > p.gallery_limit; return '<label class="pl' + (p.id === sel.id ? " on" : "") + (off ? " off" : "") + '"><input type="radio" name="pl" value="' + p.id + '"' + (p.id === sel.id ? " checked" : "") + (off ? " disabled" : "") + '><div><b>' + esc(p.name) + "</b><span>" + esc(EXP[exp(p)]) + (off ? " &middot; galeri Anda " + g + " foto, maks. " + p.gallery_limit : "") + "</span></div><em>" + rp(p.price) + "</em></label>"; }).join("") + "</div>" +
          '<dl class="sum"><div><dt>Paket</dt><dd>' + esc(sel.name) + "</dd></div><div><dt>Jenis undangan</dt><dd>" + esc(EXP[exp(sel)]) + "</dd></div><div><dt>Live Guest</dt><dd>" + (sel.allow_live_guest ? "Termasuk" : "Tidak termasuk") + "</dd></div><div><dt>Masa aktif</dt><dd>" + sel.duration_days + " hari, hingga " + esc(fdate(Date.now() + sel.duration_days * 864e5)) + "</dd></div><div><dt>Link undangan</dt><dd>nusamora.com/" + esc(s.inv.slug) + '</dd></div><div class="tot"><dt>Total</dt><dd>' + rp(sel.price) + '</dd></div></dl><p class="fine">Harga final dihitung server saat pembayaran dibuat. Pembayaran diproses aman oleh Midtrans.</p><div class="err" id="pe" role="alert"></div><div class="acts"><button class="btn o" type="button" data-x>Batal</button><button class="btn" type="button" id="pay-go">Bayar ' + rp(sel.price) + "</button></div>";
        $$("input[name=pl]", e).forEach(function (i) { i.addEventListener("change", function () { sel = P.filter(function (p) { return p.id === i.value; })[0]; draw(); }); });
        $("#pay-go", e).addEventListener("click", function () {
          var b = this, er = $("#pe", e); b.disabled = true; b.innerHTML = '<i class="spin"></i> Menyiapkan pembayaran...'; er.textContent = "";
          flush().then(function () { return checkout({ invitation_id: s.inv.id, plan_id: sel.id }); }).then(function (x) {
            if (x.data) { location.href = x.data.redirect_url; return; }
            b.disabled = false; b.textContent = "Bayar " + rp(sel.price); var m = x.err || {};
            if (m.error === "data_belum_lengkap" && m.missing) { e.innerHTML = '<h2>Lengkapi data undangan</h2><p class="sub">Data berikut wajib diisi.</p>' + missingHtml(m.missing) + '<div class="acts"><button class="btn" type="button" data-x>Lengkapi sekarang</button></div>'; return; }
            if (m.error === "sudah_aktif") { er.innerHTML = esc(m.message) + ' <a href="/akun#undangan">Buka dashboard</a>'; return; }
            er.textContent = m.message || "Terjadi kendala. Coba lagi.";
          });
        });
      }
      draw();
    }, function () { e.innerHTML = '<h2>Publikasikan undangan</h2><p class="sub">Tidak bisa memuat paket. Periksa koneksi lalu coba lagi.</p><div class="acts"><button class="btn o" type="button" data-x>Tutup</button></div>'; });
  }
  function openPreview(s) {
    var c = s.c, ttl = (s.cat === "wedding" || s.cat === "engagement") && c.names.b ? esc(c.names.a || "...") + " &amp; " + esc(c.names.b) : esc(c.names.a || s.inv.title);
    var meta = [s.date ? fdate(s.date, true) : "", c.event.start ? c.event.start + (c.event.end ? "-" + c.event.end : "") + " " + c.event.tz : ""].filter(Boolean).join(" · ");
    var maps = /^https?:\/\//i.test(c.event.maps || "") ? '<a class="btn o sm" target="_blank" rel="noopener" href="' + esc(c.event.maps) + '">Buka peta</a>' : "";
    var feats = [c.features.countdown ? "Hitung mundur" : "", c.features.rsvp ? "RSVP" : "", c.features.guestbook ? "Buku ucapan" : "", c.features.gift ? "Hadiah digital" : "", c.music.enabled ? "Musik latar" : ""].filter(Boolean);
    dlg('<div class="pvw"><div class="pv-c">' + (c.photos.cover ? '<img src="' + esc(c.photos.cover) + '" alt="Foto sampul">' : '<div class="pv-ph">Belum ada foto sampul</div>') + '</div><div class="pv-b"><small>' + esc(CATN[s.cat] || "") + "</small><h2>" + ttl + '</h2><p class="pv-m">' + esc(meta || "Tanggal dan jam belum diisi") + "</p>" +
      (c.welcome ? '<p class="pv-w">' + esc(c.welcome) + "</p>" : "") + '<p class="pv-v"><b>' + esc(c.event.venue || "Lokasi belum diisi") + "</b><br>" + esc(c.event.address || "") + "</p>" + maps +
      (c.photos.gallery.length ? '<div class="ph pv-g">' + c.photos.gallery.map(function (u) { return '<div class="it"><img src="' + esc(u) + '" alt="" loading="lazy"></div>'; }).join("") + "</div>" : "") +
      '<div class="tags">' + feats.map(function (f) { return '<span class="tag">' + esc(f) + "</span>"; }).join("") + '</div></div></div><p class="fine">Ini pratinjau isi data Anda. Tampilan penuh mengikuti template dan paket yang dipilih saat publikasi.</p><div class="acts"><button class="btn o" type="button" data-x>Tutup</button></div>', "wide");
  }

  /* ================= HALAMAN HASIL PEMBAYARAN ================= */
  function pageBayar() {
    var order = new URLSearchParams(location.search).get("order_id") || "";
    if (!/^[A-Za-z0-9_-]{6,50}$/.test(order)) { view.innerHTML = note("Pembayaran tidak ditemukan", "Buka hasil pembayaran dari dashboard Anda.", '<a class="btn" href="/akun#undangan">Ke Dashboard</a>'); return; }
    var tries = 0, stop = false, synced = 0;
    function shell(inner) { view.innerHTML = '<div class="fw narrow"><div class="card payres" aria-live="polite">' + inner + "</div></div>"; }
    function icon(k) { return '<span class="pri ' + k + '" aria-hidden="true">' + ({ ok: '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>', wait: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>', bad: '<svg viewBox="0 0 24 24"><path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/></svg>' }[k]) + "</span>"; }
    function rows(p) { return '<dl class="sum"><div><dt>Invoice</dt><dd>' + esc(p.invoice_number || "-") + "</dd></div><div><dt>Paket</dt><dd>" + esc(p.plan_name) + " &middot; " + esc(EXP[p.experience] || "") + "</dd></div><div><dt>Total</dt><dd>" + rp(p.amount) + "</dd></div></dl>"; }
    function render(p) {
      var inv = p.invitation || {}, url = inv.public_url || "";
      if (p.status === "paid") {
        stop = true; shell(icon("ok") + '<h1>Pembayaran berhasil</h1><p class="sub">Undangan Anda sudah dipublikasikan.</p>' + rows(p) +
          '<dl class="sum"><div><dt>Status</dt><dd>Published</dd></div><div><dt>Aktif sejak</dt><dd>' + esc(fdate(inv.published_at)) + "</dd></div><div><dt>Aktif hingga</dt><dd>" + esc(fdate(inv.expires_at)) + "</dd></div></dl>" +
          (inv.status === "aktif" ? '<div class="urlb"><code>' + esc(url.replace(/^https?:\/\//, "")) + '</code><button class="btn o sm" type="button" id="cpy" data-u="' + esc(url) + '">Salin link</button></div>' : '<p class="note">Pembayaran Anda diterima dan sedang ditinjau tim kami karena ada transaksi lain pada undangan ini.</p>') +
          '<div class="acts"><a class="btn o" href="/editor?id=' + encodeURIComponent(inv.id) + '">Buka editor</a><a class="btn" href="/akun#undangan">Ke Dashboard</a></div>');
        var c = $("#cpy"); if (c) c.onclick = function () { copyText(c.dataset.u, c); }; return;
      }
      if (p.status === "pending") {
        shell(icon("wait") + '<h1>Menunggu Pembayaran</h1><p class="sub">Kami menunggu konfirmasi dari Midtrans. Halaman ini diperbarui otomatis. Jika Anda sudah membayar, status berubah dalam beberapa saat.</p>' + rows(p) + '<p class="fine">Batas pembayaran: ' + esc(fdate(p.expires_at)) + " " + esc(new Date(p.expires_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })) + '</p><div class="acts">' + (p.redirect_url ? '<a class="btn" href="' + esc(p.redirect_url) + '">Lanjutkan pembayaran</a>' : "") + '<button class="btn o" type="button" id="chk">Periksa status</button><button class="btn o" type="button" id="cnl">Batalkan pembayaran</button></div>');
        $("#chk").onclick = function () { this.disabled = true; this.textContent = "Memeriksa..."; tries = 0; stop = false; syncThenLoad(true); };
        $("#cnl").onclick = function () { var b = this; b.disabled = true; b.textContent = "Membatalkan..."; sb.functions.invoke("midtrans-checkout", { body: { action: "cancel", order_id: order } }).then(function () { load(); }); }; return;
      }
      stop = true; var T = { failed: ["Pembayaran gagal", "Pembayaran tidak dapat diproses. Anda dapat mencoba lagi, tidak akan dibuat undangan baru."], cancelled: ["Pembayaran dibatalkan", "Pembayaran dibatalkan. Anda dapat mencoba lagi kapan saja, data undangan Anda tetap tersimpan."], expired: ["Pembayaran kedaluwarsa", "Batas waktu pembayaran telah habis. Anda dapat membuat pembayaran baru, data undangan Anda tetap tersimpan."], refunded: ["Pembayaran dikembalikan", "Dana untuk transaksi ini telah dikembalikan. Undangan dinonaktifkan."] }[p.status] || ["Status tidak dikenal", ""];
      shell(icon("bad") + "<h1>" + T[0] + '</h1><p class="sub">' + T[1] + "</p>" + rows(p) + '<div class="acts"><a class="btn o" href="/akun#undangan">Ke Dashboard</a>' + (p.status !== "refunded" ? '<a class="btn" href="/editor?id=' + encodeURIComponent(inv.id) + '&publish=1">Coba bayar lagi</a>' : "") + "</div>");
    }
    function load() {
      sb.rpc("my_payment", { p_order: order }).then(function (r) {
        if (r.error || !r.data || r.data.error) { stop = true; shell(icon("bad") + '<h1>Pembayaran tidak ditemukan</h1><p class="sub">Pembayaran ini tidak ada atau bukan milik akun Anda.</p><div class="acts"><a class="btn" href="/akun#undangan">Ke Dashboard</a></div>'); return; }
        render(r.data);
        if (r.data.status === "pending" && !stop) { tries++; if (tries <= 20) setTimeout(function () { if (!stop) syncThenLoad(tries % 4 === 0); }, 3500); else { stop = true; } }
      }, function () { shell(icon("bad") + '<h1>Tidak bisa terhubung</h1><p class="sub">Periksa koneksi internet lalu muat ulang halaman.</p>'); });
    }
    // status resmi selalu diverifikasi server ke Midtrans (webhook tetap sumber utama); frontend hanya membaca hasilnya
    function syncThenLoad(force) { if (!force) return load(); synced++; sb.functions.invoke("midtrans-sync", { body: { order_id: order } }).then(load, load); }
    shell('<div class="sk h4"></div>'); syncThenLoad(true);
  }

  /* ================= start ================= */
  if (!sb) { view.innerHTML = note("Sistem belum dikonfigurasi", "Isi SUPABASE_URL dan SUPABASE_ANON_KEY di assets/config.js."); return; }
  sb.auth.getSession().then(function (r) {
    var s = r.data && r.data.session; if (!s) { location.replace("/masuk?next=" + encodeURIComponent(nextUrl())); return; } U = s.user; $("#chip-i").textContent = (U.email || "?").charAt(0).toUpperCase();
    return sb.from("profiles").select("status").eq("id", U.id).maybeSingle().then(function (x) {
      if (x && x.data && x.data.status === "suspended") { view.innerHTML = note("Akun ditangguhkan", "Akun Anda sedang ditangguhkan. Hubungi tim NusaMora untuk bantuan."); return; }
      if (PAGE === "template") pageTemplate(); else if (PAGE === "buat") pageBuat(); else if (PAGE === "editor") pageEditor(); else if (PAGE === "pembayaran") pageBayar();
    }, function () { if (PAGE === "template") pageTemplate(); else if (PAGE === "buat") pageBuat(); else if (PAGE === "editor") pageEditor(); else pageBayar(); });
  }, function () { view.innerHTML = note("Tidak bisa terhubung", "Periksa koneksi internet Anda lalu muat ulang."); });
  sb.auth.onAuthStateChange(function (ev) { if (ev === "SIGNED_OUT") location.replace("/masuk"); });
})();
