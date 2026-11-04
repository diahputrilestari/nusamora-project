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
    sb.from("invitations").select("id,title,category,template_id,slug,status,event_date,content,updated_at,moderation").eq("id", id).maybeSingle().then(function (r) {
      var inv = r.data;
      if (r.error || !inv) { view.innerHTML = note("Undangan tidak ditemukan", "Undangan ini tidak ada atau bukan milik akun Anda.", '<a class="btn" href="/akun#undangan">Undangan Saya</a>'); return; }
      var cat = CATN[inv.category] ? inv.category : "other", lab = LAB[cat], C0 = merge(DEF, inv.content || {}), date = inv.event_date || "", locked = !(inv.status === "draft" || inv.status === "aktif") || inv.moderation === "takedown";
      var dirty = false, busy = false, timer = null, retry = 0, state = "ok", savedAt = inv.updated_at;
      function fld(lbl, p, o) { o = o || {}; var v = p === "date" ? date : (get(C0, p) || ""); return '<div class="f' + (o.full ? " full" : "") + '"><label for="e-' + p + '">' + esc(lbl) + '</label><' + (o.ta ? "textarea" : "input type=\"" + (o.type || "text") + "\"") + ' id="e-' + p + '" data-p="' + p + '"' + (o.max ? ' maxlength="' + o.max + '"' : "") + (o.ph ? ' placeholder="' + esc(o.ph) + '"' : "") + (locked ? " disabled" : "") + (o.ta ? ">" + esc(v) + "</textarea>" : ' value="' + esc(v) + '">') + "</div>"; }
      function sw(p, t, s) { return '<label class="sw"><input type="checkbox" data-p="' + p + '"' + (get(C0, p) ? " checked" : "") + (locked ? " disabled" : "") + "><div><b>" + esc(t) + "</b><span>" + esc(s) + "</span></div></label>"; }
      var secs = [["info", "Informasi Acara"], ["waktu", "Waktu & Tempat"], ["foto", "Foto"], ["musik", "Musik"], ["fitur", "Komponen Undangan"]];
      view.innerHTML = '<div class="fw">' + steps(2) + '<div class="hd"><h1 id="ttl">' + esc(inv.title) + '</h1><p>Isi detail undangan Anda. Perubahan tersimpan otomatis, jadi Anda bisa keluar dan melanjutkan kapan saja.</p></div>' + (locked ? '<div class="note" style="margin-bottom:16px">Undangan ini tidak dapat diubah saat ini.</div>' : "") +
        '<div class="ed"><nav aria-label="Bagian editor">' + secs.map(function (s) { return '<a href="#s-' + s[0] + '">' + s[1] + "</a>"; }).join("") + '</nav><div class="edcol">' +
        '<section class="card sec" id="s-info"><h2>Informasi Acara</h2><p class="sub">Nama yang akan tampil di undangan.</p><div class="g2f">' + fld(lab[0], "names.a", { max: 80 }) + (lab[1] ? fld(lab[1], "names.b", { max: 80 }) : "") + fld("Kata sambutan", "welcome", { ta: 1, full: 1, max: 1000, ph: "Tulis sapaan hangat untuk tamu Anda..." }) + "</div></section>" +
        '<section class="card sec" id="s-waktu"><h2>Waktu &amp; Tempat</h2><div class="g2f">' + fld("Tanggal acara", "date", { type: "date" }) + '<div class="f"><label for="e-event.tz">Zona waktu</label><select id="e-event.tz" data-p="event.tz"' + (locked ? " disabled" : "") + ">" + ["WIB", "WITA", "WIT"].map(function (z) { return '<option value="' + z + '"' + (C0.event.tz === z ? " selected" : "") + ">" + z + "</option>"; }).join("") + "</select></div>" + fld("Jam mulai", "event.start", { type: "time" }) + fld("Jam selesai", "event.end", { type: "time" }) + fld("Nama lokasi", "event.venue", { full: 1, max: 120, ph: "Mis. Gedung Serbaguna Kenanga" }) + fld("Alamat lengkap", "event.address", { ta: 1, full: 1, max: 400 }) + fld("Tautan Google Maps", "event.maps", { type: "url", full: 1, max: 500, ph: "https://maps.google.com/..." }) + "</div></section>" +
        '<section class="card sec" id="s-foto"><h2>Foto</h2><p class="sub">PNG, JPG, atau WebP. Foto dikecilkan otomatis agar undangan cepat dibuka.</p><div class="f"><label>Foto sampul</label><div class="cover" id="cv">' + (C0.photos.cover ? '<img src="' + esc(C0.photos.cover) + '" alt="Foto sampul">' : "Belum ada foto sampul") + '</div>' + (locked ? "" : '<label class="drop"><b>Pilih foto sampul</b><span>atau seret ke sini</span><input type="file" accept="image/png,image/jpeg,image/webp" id="up-c"></label>') + '<span class="err" id="er-c"></span></div>' +
        '<div class="f"><label>Galeri foto <small>(maks. ' + GALLERY_MAX + " foto)</small></label><div class=\"ph\" id=\"gl\"></div>" + (locked ? "" : '<label class="drop"><b>Tambah foto galeri</b><span>Bisa pilih beberapa sekaligus</span><input type="file" accept="image/png,image/jpeg,image/webp" id="up-g" multiple></label>') + '<span class="err" id="er-g"></span></div></section>' +
        '<section class="card sec" id="s-musik"><h2>Musik</h2><p class="sub">Musik latar yang diputar saat tamu membuka undangan.</p>' + sw("music.enabled", "Putar musik latar", "Tamu dapat mematikannya kapan saja.") + '<div class="f"><label for="e-music.track">Pilihan lagu</label><select id="e-music.track" data-p="music.track"' + (locked ? " disabled" : "") + '><option value="we-are">We Are - Moavii (bawaan)</option></select></div></section>' +
        '<section class="card sec" id="s-fitur"><h2>Komponen Undangan</h2>' + sw("features.countdown", "Hitung mundur", "Menampilkan sisa waktu menuju acara.") + sw("features.rsvp", "RSVP", "Tamu mengonfirmasi kehadiran dari link pribadinya.") + sw("features.guestbook", "Buku ucapan", "Ucapan dan doa dari tamu terundang.") + sw("features.gift", "Hadiah digital", "Tampilkan rekening untuk hadiah.") + '<div class="g2f" id="giftf"' + (C0.features.gift ? "" : " hidden") + ">" + fld("Nama bank / e-wallet", "gift.bank", { max: 40 }) + fld("Nomor rekening", "gift.number", { max: 40 }) + fld("Atas nama", "gift.holder", { full: 1, max: 80 }) + "</div></section></div>" +
        '<aside class="ped"><div class="card"><div class="save" id="sv" role="status" aria-live="polite"><i></i><span id="svt">Tersimpan</span></div><div class="f" style="margin-top:14px"><b style="font-size:14px">Kelengkapan <span id="pc">0</span>%</b><div class="bar2"><i id="pb" style="width:0"></i></div><ul class="chk" id="ck"></ul></div></div>' +
        '<div class="card"><div class="f" style="margin-top:0"><small>Link undangan</small><b style="word-break:break-all">nusamora.com/' + esc(inv.slug || "") + '</b><small>Kategori: ' + esc(CATN[cat]) + " &middot; Status: " + esc(inv.status) + '</small></div><div class="acts" style="margin-top:14px;flex-direction:column"><button class="btn" type="button" id="sv-b"' + (locked ? " disabled" : "") + '>Simpan sekarang</button><a class="btn o" href="/akun#undangan">Simpan &amp; ke dashboard</a><button class="btn o" type="button" disabled title="Publikasi tersedia setelah pembayaran paket diaktifkan">Publikasikan (segera)</button></div></div></aside></div></div>';
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
      // nav bagian
      var links = $$(".ed nav a"); function spy() { var cur = secs[0][0]; secs.forEach(function (s) { var el = d.getElementById("s-" + s[0]); if (el && el.getBoundingClientRect().top < 160) cur = s[0]; }); links.forEach(function (a) { a.classList.toggle("on", a.getAttribute("href") === "#s-" + cur); }); } addEventListener("scroll", spy, { passive: true }); spy();
      gallery(); setSv("ok", "Tersimpan");
    }, function () { view.innerHTML = note("Tidak bisa terhubung", "Periksa koneksi internet Anda lalu muat ulang halaman."); });
  }

  /* ================= start ================= */
  if (!sb) { view.innerHTML = note("Sistem belum dikonfigurasi", "Isi SUPABASE_URL dan SUPABASE_ANON_KEY di assets/config.js."); return; }
  sb.auth.getSession().then(function (r) {
    var s = r.data && r.data.session; if (!s) { location.replace("/masuk?next=" + encodeURIComponent(nextUrl())); return; } U = s.user; $("#chip-i").textContent = (U.email || "?").charAt(0).toUpperCase();
    return sb.from("profiles").select("status").eq("id", U.id).maybeSingle().then(function (x) {
      if (x && x.data && x.data.status === "suspended") { view.innerHTML = note("Akun ditangguhkan", "Akun Anda sedang ditangguhkan. Hubungi tim NusaMora untuk bantuan."); return; }
      if (PAGE === "template") pageTemplate(); else if (PAGE === "buat") pageBuat(); else if (PAGE === "editor") pageEditor();
    }, function () { if (PAGE === "template") pageTemplate(); else if (PAGE === "buat") pageBuat(); else pageEditor(); });
  }, function () { view.innerHTML = note("Tidak bisa terhubung", "Periksa koneksi internet Anda lalu muat ulang."); });
  sb.auth.onAuthStateChange(function (ev) { if (ev === "SIGNED_OUT") location.replace("/masuk"); });
})();
