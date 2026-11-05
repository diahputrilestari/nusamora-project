(function () {
  "use strict";
  var d = document, $ = function (s, r) { return (r || d).querySelector(s); }, $$ = function (s, r) { return Array.prototype.slice.call((r || d).querySelectorAll(s)); };
  var C = window.NM_CONFIG || {};
  var sb = (C.SUPABASE_URL && C.SUPABASE_ANON_KEY && window.supabase) ? window.supabase.createClient(C.SUPABASE_URL, C.SUPABASE_ANON_KEY, { auth: { persistSession: true, autoRefreshToken: true } }) : null;
  var PAGE = d.body.dataset.page, view = $("#view"), U = null;
  var CATS = [["wedding", "Wedding"], ["engagement", "Engagement"], ["birthday", "Birthday"], ["graduation", "Graduation"], ["aqiqah", "Aqiqah"], ["seminar", "Seminar & Workshop"], ["corporate", "Corporate Event"], ["other", "Lainnya"]];
  var CATN = {}; CATS.forEach(function (c) { CATN[c[0]] = c[1]; });
  var CATD = { wedding: "Akad, resepsi, dan hari bahagia.", engagement: "Lamaran dan pertunangan.", birthday: "Ulang tahun dan perayaan.", graduation: "Wisuda dan kelulusan.", aqiqah: "Syukuran kelahiran.", seminar: "Seminar, workshop, dan pelatihan.", corporate: "Acara perusahaan dan peluncuran.", other: "Acara lain yang ingin Anda rayakan." };
  /* Tiga paket = tiga jenis produk. Harga & masa aktif dibaca dari tabel plans; teks di bawah hanya deskripsi produk. */
  var PK = {
    essential: { name: "Essential", kind: "Undangan digital 2D", icon: "2D", desc: "Undangan berbasis website 2D yang ringan, cepat dibuka, dan mudah dibagikan.", feats: ["Template website 2D", "Editor teks, foto, musik, dan warna", "RSVP dan buku ucapan", "Hitung mundur dan lokasi peta", "Galeri foto"], gal: 10 },
    signature: { name: "Signature", kind: "Undangan 3D Cinematic", icon: "3D", desc: "Film pembuka sinematik: scene 3D, gerakan kamera, animasi, dan musik yang membuat tamu terkesan.", feats: ["Template 3D cinematic", "Editor scene, background, dan objek 3D", "Pengaturan kamera dan animasi", "Teks dan efek sinematik", "RSVP dan buku ucapan"], gal: 20 },
    luxe: { name: "Luxe", kind: "Undangan 3D Live Guest", icon: "Live", desc: "Venue virtual 3D tempat tamu memilih avatar, berjalan-jalan, dan menyapa secara langsung.", feats: ["Virtual venue 3D interaktif", "Avatar dan pemilihan karakter tamu", "Dekorasi, area resepsi, dan area kuliner", "Photo booth dan galeri di venue", "Fitur interaktif Live Guest"], gal: 40 }
  };
  var PKS = ["essential", "signature", "luxe"];
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function toast(t, k) { var e = d.createElement("div"); e.className = "toast " + (k || ""); e.setAttribute("role", k === "bad" ? "alert" : "status"); e.textContent = t; $("#toasts").appendChild(e); setTimeout(function () { e.remove(); }, 4500); }
  /* Progress: 7 tahap. cur = indeks tahap aktif (0-6). */
  var STEP_L = ["Paket", "Kategori", "Template", "Link", "Isi Undangan", "Preview", "Checkout"];
  function steps(cur, pkg) {
    return '<div class="pkbar">' + (pkg && PK[pkg] ? '<span class="pkchip"><i>' + PK[pkg].icon + "</i>Paket " + PK[pkg].name + " &middot; " + PK[pkg].kind + "</span>" : "") + '<span class="stn">Langkah ' + (cur + 1) + " dari " + STEP_L.length + " &middot; " + STEP_L[cur] + "</span></div>" +
      '<ol class="stp s7" aria-label="Tahapan pembuatan undangan">' + STEP_L.map(function (l, i) { return '<li class="' + (i < cur ? "done" : i === cur ? "cur" : "") + '"' + (i === cur ? ' aria-current="step"' : "") + "><span>" + l + "</span></li>"; }).join("") + "</ol>";
  }
  function note(t, p, cta) { return '<div class="fw narrow"><div class="card"><div class="empty"><span class="ico"><svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/></svg></span><h3>' + esc(t) + "</h3><p>" + esc(p) + "</p>" + (cta || "") + "</div></div></div>"; }
  function nextUrl() { return location.pathname + location.search; }
  var ERR = { slug_digunakan: "URL ini sudah digunakan. Coba yang lain.", slug_dicadangkan: "URL ini dicadangkan sistem. Pilih yang lain.", slug_tidak_valid: "Format URL belum benar.", batas_draft: "Anda sudah memiliki 20 draft. Selesaikan atau hapus draft lama dulu.", akun_ditangguhkan: "Akun Anda sedang ditangguhkan.", template_tidak_valid: "Template tidak tersedia.", kategori_tidak_valid: "Kategori tidak valid.", kategori_tidak_cocok: "Template ini tidak tersedia untuk kategori tersebut.", tidak_ditemukan: "Undangan tidak ditemukan.", tidak_dapat_diubah: "Undangan ini tidak dapat diubah.", foto_tidak_valid: "Foto tidak valid.", konten_tidak_valid: "Isi undangan terlalu besar.", konten_tidak_sesuai_paket: "Isi undangan tidak sesuai dengan paket Anda.", opsi_tidak_didukung: "Pilihan tersebut tidak didukung template ini." };
  function errText(e) { var m = (e && e.message) || ""; return ERR[m] || (/fetch|network/i.test(m) ? "Tidak bisa terhubung. Periksa koneksi internet." : "Terjadi kendala. Coba lagi."); }
  function ids(a) { return (Array.isArray(a) ? a : []).map(function (x) { return typeof x === "string" ? x : x.id; }); }
  function opts(a) { return (Array.isArray(a) ? a : []).map(function (x) { return typeof x === "string" ? [x, x] : [x.id, x.name || x.id]; }); }
  function pkgOk(p) { return PKS.indexOf(p) > -1 ? p : ""; }
  var PCOL = { lavender: ["#9673D0", "#EEE9FA", "Lavender"], blush: ["#D98FA0", "#FBEAEF", "Blush"], sage: ["#6F9A78", "#EAF2EA", "Sage"], gold: ["#B8893C", "#F7EFD9", "Emas"] };
  var FONTS = { romantic: ["'Cormorant Garamond',Georgia,serif", "Romantis"], classic: ["'Playfair Display',Georgia,serif", "Klasik"], modern: ["'Plus Jakarta Sans',system-ui,sans-serif", "Modern"] };
  var CAMN = { orbit: "Orbit", dolly: "Dolly maju", crane: "Crane naik", static: "Statis" }, INTN = { fade: "Fade", zoom: "Zoom", flythrough: "Fly-through" }, PARN = { none: "Tanpa efek", petals: "Kelopak bunga", fireflies: "Kunang-kunang" }, GRN = { warm: "Hangat", cool: "Sejuk", soft: "Lembut" };

  /* Template dibaca dari DB dan selalu difilter menurut paket. */
  function mapT(t) { return { slug: t.slug, name: t.name, desc: t.description || "", img: t.thumbnail_url || "", demo: t.preview_url || "", pkg: t.package_type, cats: t.categories || [], caps: t.capabilities || {} }; }
  var TSEL = "slug,name,description,thumbnail_url,preview_url,package_type,categories,capabilities";
  function loadTemplates(pkg) { return sb.from("templates").select(TSEL).eq("status", "published").eq("package_type", pkg).order("sort").then(function (r) { return r.error || !r.data ? [] : r.data.map(mapT); }, function () { return []; }); }
  /* Tema (set aset) per template; gagal/belum ada tabel -> tanpa tema, alur lama tetap jalan. */
  function loadThemes(slugs) { if (!slugs.length) return Promise.resolve({}); return sb.rpc("get_template_themes", { p_templates: slugs }).then(function (r) { return r.error || !r.data || typeof r.data !== "object" ? {} : r.data; }, function () { return {}; }); }
  function themePick(t, th) { if (!th || !th.length) return ""; return '<fieldset class="thm"><legend>Pilih tema</legend>' + th.map(function (x, i) { return '<label class="thc"><input type="radio" name="th-' + esc(t.slug) + '" data-th="' + esc(t.slug) + '" value="' + esc(x.slug) + '"' + (i === 0 ? " checked" : "") + "><span>" + esc(x.name) + "</span></label>"; }).join("") + "</fieldset>"; }
  function loadTemplate(slug) { return sb.from("templates").select(TSEL).eq("slug", slug).maybeSingle().then(function (r) { return r.data ? mapT(r.data) : null; }, function () { return null; }); }
  function loadPlans() { return sb.from("plans").select("id,name,price,duration_days,gallery_limit,allow_3d,allow_live_guest,features").eq("active", true).order("sort").then(function (r) { return r.data || []; }, function () { return []; }); }
  function rp(n) { return "Rp" + Number(n || 0).toLocaleString("id-ID"); }

  /* ================= 1. PILIH PAKET ================= */
  function pagePaket() {
    var q = new URLSearchParams(location.search), want = pkgOk(q.get("paket"));
    Promise.all([loadPlans(), sb.from("profiles").select("plan").eq("id", U.id).maybeSingle().then(function (r) { return r.data && r.data.plan; }, function () { return null; })]).then(function (r) {
      var P = r[0], sel = want || pkgOk(r[1]) || "signature", by = {}; P.forEach(function (p) { by[p.id] = p; });
      if (!P.length) { view.innerHTML = note("Paket belum tersedia", "Daftar paket belum dapat dimuat. Muat ulang halaman atau coba lagi nanti.", '<a class="btn" href="/paket">Muat ulang</a>'); return; }
      function draw() {
        view.innerHTML = '<div class="fw">' + steps(0, "") + '<div class="hd"><h1>Pilih paket undangan Anda</h1><p>Setiap paket adalah jenis undangan yang berbeda, lengkap dengan template dan editornya sendiri. Pilih yang paling cocok dengan acara Anda.</p></div>' +
          '<div class="pkg3" role="radiogroup" aria-label="Pilih paket">' + PKS.filter(function (k) { return by[k]; }).map(function (k) {
            var p = by[k], m = PK[k];
            return '<label class="card pkc' + (k === sel ? " on" : "") + (k === "signature" ? " hot" : "") + '"><input type="radio" name="pk" value="' + k + '"' + (k === sel ? " checked" : "") + '>' + (k === "signature" ? '<span class="ribbon">Paling dipilih</span>' : "") +
              '<span class="pk-ic">' + m.icon + '</span><h2>' + m.name + '</h2><b class="pk-kind">' + m.kind + '</b><p>' + m.desc + '</p><div class="pk-pr">' + rp(p.price) + "<small> / undangan</small></div><div class=\"pk-du\">Aktif " + p.duration_days + " hari &middot; galeri " + p.gallery_limit + " foto</div><ul>" + m.feats.map(function (f) { return "<li>" + esc(f) + "</li>"; }).join("") + "</ul></label>";
          }).join("") + '</div><div class="acts stk"><a class="btn o" href="/akun#undangan">Batal</a><button class="btn" type="button" id="go">Lanjut dengan paket ' + PK[sel].name + "</button></div></div>";
        $$("input[name=pk]").forEach(function (i) { i.addEventListener("change", function () { sel = i.value; try { sessionStorage.setItem("nm:paket", sel); } catch (e) { } draw(); var c = $("input[name=pk]:checked"); if (c) c.focus(); }); });
        $("#go").onclick = function () { location.href = "/template?paket=" + sel; };
      }
      draw();
    });
  }

  /* ================= 2 + 3. KATEGORI lalu TEMPLATE ================= */
  function pageTemplate() {
    var q = new URLSearchParams(location.search), pkg = pkgOk(q.get("paket")), kat = CATN[q.get("kategori")] ? q.get("kategori") : "";
    if (!pkg) { location.replace("/paket"); return; }
    loadTemplates(pkg).then(function (T) {
      if (!kat) {
        view.innerHTML = '<div class="fw">' + steps(1, pkg) + '<div class="hd"><h1>Pilih kategori acara</h1><p>Kami hanya menampilkan template ' + esc(PK[pkg].kind) + " yang cocok dengan jenis acara Anda.</p></div>" +
          '<div class="cg">' + CATS.map(function (c) { var n = T.filter(function (t) { return t.cats.indexOf(c[0]) > -1; }).length; return '<a class="card cgi hov' + (n ? "" : " off") + '" href="' + (n ? "/template?paket=" + pkg + "&kategori=" + c[0] : "#") + '"' + (n ? "" : ' aria-disabled="true" tabindex="-1"') + "><b>" + esc(c[1]) + "</b><span>" + esc(CATD[c[0]]) + "</span><em>" + (n ? n + " template" : "Segera hadir") + "</em></a>"; }).join("") + '</div><div class="acts"><a class="btn o" href="/paket?paket=' + pkg + '">Kembali</a></div></div>';
        $$(".cgi.off").forEach(function (a) { a.addEventListener("click", function (e) { e.preventDefault(); toast("Template kategori ini sedang disiapkan untuk paket " + PK[pkg].name + ".", ""); }); });
        return;
      }
      var list = T.filter(function (t) { return t.cats.indexOf(kat) > -1; });
      loadThemes(list.map(function (t) { return t.slug; })).then(function (TH) { renderList(list, TH); });
    });
    function renderList(list, TH) {
      view.innerHTML = '<div class="fw">' + steps(2, pkg) + '<div class="hd"><h1>Pilih template ' + esc(CATN[kat]) + '</h1><p>Template ' + esc(PK[pkg].kind) + ". Coba demo, lalu gunakan yang paling mewakili cerita Anda.</p></div>" +
        (list.length ? '<div class="tg">' + list.map(function (t) { return '<article class="card tc hov"><div class="im">' + (t.img ? '<img src="' + esc(t.img) + '" alt="Pratinjau template ' + esc(t.name) + '" loading="lazy">' : "") + '<span class="pkchip sm"><i>' + PK[pkg].icon + "</i>" + PK[pkg].name + '</span></div><div class="bd"><h2>' + esc(t.name) + '</h2>' + themePick(t, TH[t.slug]) + '<div class="tags">' + t.cats.map(function (c) { return '<span class="tag">' + esc(CATN[c] || c) + "</span>"; }).join("") + "</div><p>" + esc(t.desc) + '</p><div class="two">' + (t.demo ? '<a class="btn o" target="_blank" rel="noopener" href="' + esc(t.demo) + '">Coba Demo</a>' : "<span></span>") + '<a class="btn" data-use="' + esc(t.slug) + '" href="/buat?paket=' + pkg + "&kategori=" + kat + "&template=" + encodeURIComponent(t.slug) + (TH[t.slug] && TH[t.slug].length ? "&tema=" + encodeURIComponent(TH[t.slug][0].slug) : "") + '">Gunakan Template</a></div></div></article>'; }).join("") + "</div>" :
          '<div class="card"><div class="empty"><h3>Template ' + esc(CATN[kat]) + " sedang disiapkan</h3><p>Belum ada template " + esc(PK[pkg].kind) + " untuk kategori ini.</p></div></div>") +
        '<div class="acts"><a class="btn o" href="/template?paket=' + pkg + '">Kembali ke kategori</a></div></div>';
      view.addEventListener("change", function (e) { var r = e.target.closest("input[data-th]"); if (!r) return; var a = $('[data-use="' + r.dataset.th + '"]'); if (a) a.href = a.href.replace(/&tema=[^&]*/, "") + "&tema=" + encodeURIComponent(r.value); });
    }
  }

  /* ================= 4. ATUR KATEGORI & LINK ================= */
  var SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
  function slugCheckLocal(s) { if (!s) return { s: "idle" }; if (s.length < 3) return { s: "bad", m: "Minimal 3 karakter." }; if (s.length > 40) return { s: "bad", m: "Maksimal 40 karakter." }; if (!/^[a-z0-9-]+$/.test(s)) return { s: "bad", m: "Hanya huruf kecil, angka, dan tanda hubung (-). Tanpa spasi atau simbol lain." }; if (!SLUG_RE.test(s)) return { s: "bad", m: "Tanda hubung tidak boleh di awal, di akhir, atau berurutan." }; return { s: "ok" }; }
  function pageBuat() {
    var q = new URLSearchParams(location.search), pkg = pkgOk(q.get("paket")), tslug = q.get("template") || "", kat = q.get("kategori") || "";
    if (!pkg) { location.replace("/paket"); return; }
    Promise.all([loadTemplate(tslug), loadThemes(tslug ? [tslug] : [])]).then(function (z) { var t = z[0], TH = z[1][tslug] || [], tema = q.get("tema") || "";
      if (tema && !TH.some(function (x) { return x.slug === tema; })) tema = TH.length ? TH[0].slug : "";
      if (!t || t.pkg !== pkg) { view.innerHTML = note(t ? "Template tidak cocok dengan paket" : "Template belum dipilih", t ? "Template ini milik paket lain. Pelanggan hanya dapat memakai template sesuai paket yang dipilih." : "Pilih template terlebih dahulu sebelum mengatur link undangan.", '<a class="btn" href="/template?paket=' + pkg + '">Pilih Template</a>'); return; }
      if (t.cats.indexOf(kat) < 0) kat = t.cats[0];
      var saved = {}; try { saved = JSON.parse(sessionStorage.getItem("nm:buat:" + tslug) || "{}"); } catch (e) { }
      var back = "/template?paket=" + pkg + "&kategori=" + kat;
      view.innerHTML = '<div class="fw">' + steps(3, pkg) + '<div class="fc"><div class="card"><h1 style="font:700 clamp(26px,3.4vw,34px)/1.15 var(--display)">Atur Kategori &amp; Link Undangan</h1><p class="sub" style="margin-top:8px">Tentukan jenis acara dan alamat undangan yang mudah diingat tamu Anda.</p>' +
        '<form id="fb" novalidate><div class="f"><label for="cat">Kategori acara</label><select id="cat">' + t.cats.map(function (c) { return '<option value="' + c + '"' + (c === kat ? " selected" : "") + ">" + esc(CATN[c] || c) + "</option>"; }).join("") + "</select></div>" +
        (TH.length ? '<div class="f"><label for="thm">Tema</label><select id="thm">' + TH.map(function (x) { return '<option value="' + esc(x.slug) + '"' + (x.slug === tema ? " selected" : "") + ">" + esc(x.name) + "</option>"; }).join("") + '</select><small class="sub">Tema menentukan set ilustrasi dan dekorasi undangan.</small></div>' : "") +
        '<div class="f"><div class="hint"><b>Tips:</b> buat link yang singkat dan mudah diingat, misalnya <b>raka-sinta</b> atau <b>ulangtahun-sinta</b>. Link ini dipakai tamu untuk membuka undangan Anda.</div></div>' +
        '<div class="f"><label for="slug">Link undangan</label><div class="slug" id="sw"><span aria-hidden="true">nusamora.com/</span><input id="slug" type="text" inputmode="url" autocomplete="off" autocapitalize="off" spellcheck="false" maxlength="40" aria-describedby="sst" placeholder="nama-acara-anda" value="' + esc(saved.slug || "") + '"></div><div class="st" id="sst" role="status" aria-live="polite"></div><div class="sugg" id="sg"></div></div>' +
        '<div class="acts"><a class="btn o" href="' + back + '">Kembali</a><button class="btn" type="submit" id="nx" disabled>Selanjutnya</button></div></form></div>' +
        '<aside class="side-c"><div class="card mini"><span class="pkchip"><i>' + PK[pkg].icon + "</i>Paket " + PK[pkg].name + "</span>" + (t.img ? '<img src="' + esc(t.img) + '" alt="">' : "") + "<b>" + esc(t.name) + '</b><span class="sub">' + esc(PK[pkg].kind) + '</span><a href="' + back + '" style="color:var(--deep);font-weight:700;font-size:14px">Ganti template</a></div></aside></div></div>';
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
          var go = function () { location.href = "/editor?id=" + encodeURIComponent(r.data); }, th = $("#thm");
          if (th && th.value) sb.rpc("set_invitation_theme", { p_invitation: r.data, p_theme: th.value }).then(function (x) { if (x.error || !x.data || !x.data.ok) toast("Undangan dibuat, tetapi tema belum bisa dipasang. Pilih ulang nanti.", "bad"); go(); }, go); else go();
        }, function (er) { nx.disabled = false; nx.textContent = "Selanjutnya"; toast(errText(er), "bad"); });
      });
      if (saved.slug) check(); inp.focus();
    });
  }

  /* ================= 5. EDITOR (berbeda untuk tiap paket) ================= */
  var LAB = { wedding: ["Nama mempelai wanita", "Nama mempelai pria"], engagement: ["Nama calon mempelai wanita", "Nama calon mempelai pria"], birthday: ["Nama yang berulang tahun", ""], graduation: ["Nama wisudawan/wisudawati", ""], aqiqah: ["Nama anak", "Nama orang tua"], seminar: ["Nama acara", "Penyelenggara"], corporate: ["Nama acara", "Perusahaan / penyelenggara"], other: ["Nama acara", "Penyelenggara"] };
  var DEF = { names: { a: "", b: "" }, welcome: "", event: { start: "", end: "", tz: "WIB", venue: "", address: "", maps: "" }, photos: { cover: "", gallery: [] }, music: { enabled: true, track: "we-are" }, features: { rsvp: true, guestbook: true, countdown: true, gift: false }, gift: { bank: "", number: "", holder: "" } };
  var COMMON_KEYS = ["names", "welcome", "event", "photos", "music", "features", "gift"];
  var PKEYS = { essential: ["design2d", "texts", "sections"], signature: ["scene", "camera", "anim", "cinematic"], luxe: ["scene", "venue", "live"] };
  function merge(a, b) { var o = JSON.parse(JSON.stringify(a)); Object.keys(b || {}).forEach(function (k) { if (b[k] && typeof b[k] === "object" && !Array.isArray(b[k]) && o[k] && typeof o[k] === "object" && !Array.isArray(o[k])) o[k] = merge(o[k], b[k]); else if (b[k] != null) o[k] = b[k]; }); return o; }
  function get(o, p) { return p.split(".").reduce(function (x, k) { return x && x[k]; }, o); }
  function set(o, p, v) { var ks = p.split("."), last = ks.pop(), t = ks.reduce(function (x, k) { return x[k] || (x[k] = {}); }, o); t[last] = v; }
  function pkgDefaults(pkg, caps) {
    var f = function (a, def) { var i = ids(a); return i.length ? i[0] : def; };
    if (pkg === "essential") return { design2d: { palette: f(caps.palettes, "lavender"), font: f(caps.fonts, "romantic"), accent: "" }, texts: { opening: "", quote: "", closing: "" }, sections: { gallery: true, map: true } };
    if (pkg === "signature") return { scene: { preset: f(caps.scenes, ""), objects: ids(caps.objects).slice(0, 2) }, camera: { path: f(caps.camera, "orbit"), speed: 5 }, anim: { intro: f(caps.intro, "fade"), particles: f(caps.particles, "none"), intensity: 5 }, cinematic: { title: "", subtitle: "", letterbox: true, grade: f(caps.grades, "warm") } };
    if (pkg === "luxe") { var ar = {}; ids(caps.areas).forEach(function (a) { ar[a] = true; }); return { scene: { preset: f(caps.scenes, "") }, venue: { areas: ar, decorations: ids(caps.decorations).slice(0, 2) }, live: { avatars: ids(caps.avatars), allowSelect: true, greeting: "" } }; }
    return {};
  }
  function fullContent(pkg, caps, saved) { return merge(merge(DEF, pkgDefaults(pkg, caps || {})), saved || {}); }
  function pickKeys(pkg, c) { var o = {}; COMMON_KEYS.concat(PKEYS[pkg] || []).forEach(function (k) { if (c[k] !== undefined) o[k] = c[k]; }); return o; }
  function extraChecks(pkg, c) {
    if (pkg === "essential") return [["Warna undangan", !!get(c, "design2d.palette")]];
    if (pkg === "signature") return [["Scene 3D", !!get(c, "scene.preset")], ["Gerakan kamera", !!get(c, "camera.path")]];
    if (pkg === "luxe") return [["Scene venue", !!get(c, "scene.preset")], ["Area venue", Object.keys(get(c, "venue.areas") || {}).some(function (k) { return c.venue.areas[k]; })], ["Avatar tamu", (get(c, "live.avatars") || []).length > 0]];
    return [];
  }
  function baseChecks(c, date) { return [["Nama acara", !!(c.names.a || "").trim()], ["Tanggal acara", !!date], ["Jam mulai", !!c.event.start], ["Lokasi", !!(c.event.venue || "").trim()], ["Foto sampul", !!c.photos.cover], ["Foto galeri", c.photos.gallery.length > 0]]; }
  var SEC_OF = { "Nama acara": "info", "Nama pasangan": "info", "Tanggal acara": "waktu", "Jam mulai": "waktu", "Nama lokasi": "waktu", "Foto sampul": "foto", "Warna undangan": "design", "Scene 3D": "scene", "Gerakan kamera": "kamera", "Scene venue": "venue", "Minimal satu area venue": "venue", "Minimal satu pilihan avatar tamu": "avatar" };
  function secOf(l) { return /^Galeri/.test(l) ? "foto" : (SEC_OF[l] || "info"); }

  function pageEditor() {
    var id = new URLSearchParams(location.search).get("id");
    if (!id) { view.innerHTML = note("Undangan tidak ditemukan", "Buka undangan dari daftar Undangan Saya.", '<a class="btn" href="/akun#undangan">Undangan Saya</a>'); return; }
    sb.from("invitations").select("id,title,category,template_id,package_type,slug,status,event_date,content,updated_at,moderation,public_url,expires_at").eq("id", id).maybeSingle().then(function (r) {
      var inv = r.data;
      if (r.error || !inv) { view.innerHTML = note("Undangan tidak ditemukan", "Undangan ini tidak ada atau bukan milik akun Anda.", '<a class="btn" href="/akun#undangan">Undangan Saya</a>'); return; }
      return Promise.all([loadTemplate(inv.template_id), loadPlans()]).then(function (z) { startEditor(inv, z[0], z[1]); });
    }, function () { view.innerHTML = note("Tidak bisa terhubung", "Periksa koneksi internet Anda lalu muat ulang halaman."); });
  }
  function startEditor(inv, tpl, plans) {
    var pkg = pkgOk(inv.package_type) || (tpl && pkgOk(tpl.pkg));
    if (!pkg) { view.innerHTML = note("Paket undangan belum ditentukan", "Undangan ini dibuat dengan versi lama. Buat undangan baru melalui Pilih Paket.", '<a class="btn" href="/paket">Pilih Paket</a>'); return; }
    var caps = (tpl && tpl.caps) || {}, cat = CATN[inv.category] ? inv.category : "other", lab = LAB[cat], C0 = fullContent(pkg, caps, inv.content), date = inv.event_date || "";
    var locked = !(inv.status === "draft" || inv.status === "aktif") || inv.moderation === "takedown", pend = inv.status === "menunggu_pembayaran";
    var plan = plans.filter(function (p) { return p.id === pkg; })[0], GMAX = plan ? plan.gallery_limit : PK[pkg].gal;
    var dirty = false, busy = false, timer = null, retry = 0, state = "ok";
    function dis() { return locked ? " disabled" : ""; }
    function T(label, p, o) { o = o || {}; var v = p === "date" ? date : (get(C0, p) || ""); return '<div class="f' + (o.full ? " full" : "") + '"><label for="e-' + p + '">' + esc(label) + '</label><' + (o.ta ? "textarea" : 'input type="' + (o.type || "text") + '"') + ' id="e-' + p + '" data-p="' + p + '"' + (o.max ? ' maxlength="' + o.max + '"' : "") + (o.ph ? ' placeholder="' + esc(o.ph) + '"' : "") + dis() + (o.ta ? ">" + esc(v) + "</textarea>" : ' value="' + esc(v) + '">') + (o.help ? "<small>" + esc(o.help) + "</small>" : "") + "</div>"; }
    function SW(p, t, s) { return '<label class="sw"><input type="checkbox" data-p="' + p + '"' + (get(C0, p) ? " checked" : "") + dis() + "><div><b>" + esc(t) + "</b><span>" + esc(s) + "</span></div></label>"; }
    function SEG(label, p, os, o) { o = o || {}; if (!os.length) return ""; return '<div class="f full"><label>' + esc(label) + '</label><div class="seg' + (o.sw ? " swt" : "") + '" role="radiogroup" aria-label="' + esc(label) + '">' + os.map(function (x) { return '<label class="sgi"><input type="radio" name="r-' + p + '" data-p="' + p + '" value="' + esc(x[0]) + '"' + (get(C0, p) === x[0] ? " checked" : "") + dis() + ">" + (o.sw && PCOL[x[0]] ? '<i style="background:' + PCOL[x[0]][0] + '"></i>' : "") + "<span>" + esc(x[1]) + "</span></label>"; }).join("") + "</div>" + (o.help ? "<small>" + esc(o.help) + "</small>" : "") + "</div>"; }
    function CH(label, p, os, help) { if (!os.length) return ""; var cur = get(C0, p) || []; return '<div class="f full"><label>' + esc(label) + '</label><div class="seg chs">' + os.map(function (x) { return '<label class="sgi"><input type="checkbox" data-p="' + p + '" data-v="' + esc(x[0]) + '"' + (cur.indexOf(x[0]) > -1 ? " checked" : "") + dis() + "><span>" + esc(x[1]) + "</span></label>"; }).join("") + "</div>" + (help ? "<small>" + esc(help) + "</small>" : "") + "</div>"; }
    function RNG(label, p, min, max, help) { var v = get(C0, p); return '<div class="f full"><label for="e-' + p + '">' + esc(label) + ' <output id="o-' + p + '">' + esc(v) + '</output></label><input type="range" id="e-' + p + '" data-p="' + p + '" min="' + min + '" max="' + max + '" value="' + esc(v) + '"' + dis() + (help ? "><small>" + esc(help) + "</small>" : ">") + "</div>"; }
    function sec(id, title, sub, body) { return '<section class="card sec" id="s-' + id + '"><h2>' + esc(title) + "</h2>" + (sub ? '<p class="sub">' + esc(sub) + "</p>" : "") + body + "</section>"; }
    var secs = [], S = function (id, title, sub, body) { secs.push([id, title]); return sec(id, title, sub, body); };
    var html = "";
    html += S("info", "Informasi Acara", "Nama yang akan tampil di undangan.", '<div class="g2f">' + T(lab[0], "names.a", { max: 80 }) + (lab[1] ? T(lab[1], "names.b", { max: 80 }) : "") + T("Kata sambutan", "welcome", { ta: 1, full: 1, max: 1000, ph: "Tulis sapaan hangat untuk tamu Anda..." }) + "</div>");
    html += S("waktu", "Waktu & Tempat", "", '<div class="g2f">' + T("Tanggal acara", "date", { type: "date" }) + '<div class="f"><label for="e-event.tz">Zona waktu</label><select id="e-event.tz" data-p="event.tz"' + dis() + ">" + ["WIB", "WITA", "WIT"].map(function (z) { return '<option value="' + z + '"' + (C0.event.tz === z ? " selected" : "") + ">" + z + "</option>"; }).join("") + "</select></div>" + T("Jam mulai", "event.start", { type: "time" }) + T("Jam selesai", "event.end", { type: "time" }) + T("Nama lokasi", "event.venue", { full: 1, max: 120, ph: "Mis. Gedung Serbaguna Kenanga" }) + T("Alamat lengkap", "event.address", { ta: 1, full: 1, max: 400 }) + T("Tautan Google Maps", "event.maps", { type: "url", full: 1, max: 500, ph: "https://maps.google.com/..." }) + "</div>");
    html += S("foto", "Foto", "PNG, JPG, atau WebP. Foto dikecilkan otomatis agar undangan cepat dibuka.", '<div class="f"><label>Foto sampul</label><div class="cover" id="cv">' + (C0.photos.cover ? '<img src="' + esc(C0.photos.cover) + '" alt="Foto sampul">' : "Belum ada foto sampul") + "</div>" + (locked ? "" : '<label class="drop"><b>Pilih foto sampul</b><span>atau seret ke sini</span><input type="file" accept="image/png,image/jpeg,image/webp" id="up-c"></label>') + '<span class="err" id="er-c"></span></div><div class="f"><label>Galeri foto <small>(maks. ' + GMAX + ' foto untuk paket ' + PK[pkg].name + ')</small></label><div class="ph" id="gl"></div>' + (locked ? "" : '<label class="drop"><b>Tambah foto galeri</b><span>Bisa pilih beberapa sekaligus</span><input type="file" accept="image/png,image/jpeg,image/webp" id="up-g" multiple></label>') + '<span class="err" id="er-g"></span></div>');
    var comp = SW("features.countdown", "Hitung mundur", "Menampilkan sisa waktu menuju acara.") + SW("features.rsvp", "RSVP", "Tamu mengonfirmasi kehadiran dari link pribadinya.") + SW("features.guestbook", "Buku ucapan", "Ucapan dan doa dari tamu terundang.") + SW("features.gift", "Hadiah digital", "Tampilkan rekening untuk hadiah.") + '<div class="g2f" id="giftf"' + (C0.features.gift ? "" : " hidden") + ">" + T("Nama bank / e-wallet", "gift.bank", { max: 40 }) + T("Nomor rekening", "gift.number", { max: 40 }) + T("Atas nama", "gift.holder", { full: 1, max: 80 }) + "</div>";
    var music = SW("music.enabled", "Putar musik latar", "Tamu dapat mematikannya kapan saja.") + '<div class="f"><label for="e-music.track">Pilihan lagu</label><select id="e-music.track" data-p="music.track"' + dis() + '><option value="we-are">We Are - Moavii (bawaan)</option></select></div>';
    if (pkg === "essential") {
      html += S("design", "Warna & Tipografi", "Tampilan undangan 2D Anda.", '<div class="g2f">' + SEG("Palet warna", "design2d.palette", opts(caps.palettes).map(function (x) { return [x[0], (PCOL[x[0]] || [0, 0, x[1]])[2]]; }), { sw: 1 }) + SEG("Gaya huruf", "design2d.font", opts(caps.fonts).map(function (x) { return [x[0], (FONTS[x[0]] || [0, x[1]])[1]]; })) + '<div class="f"><label for="e-design2d.accent">Warna aksen khusus <small>(opsional)</small></label><div class="colr"><input type="color" id="e-design2d.accent" data-p="design2d.accent" value="' + esc(/^#[0-9a-f]{6}$/i.test(C0.design2d.accent) ? C0.design2d.accent : (PCOL[C0.design2d.palette] || PCOL.lavender)[0]) + '"' + dis() + '><button type="button" class="btn o sm" id="acc-x"' + dis() + ">Pakai warna palet</button></div></div></div>");
      html += S("teks", "Teks Undangan", "Kalimat pembuka, kutipan, dan penutup.", '<div class="g2f">' + T("Kalimat pembuka", "texts.opening", { full: 1, max: 200, ph: "Dengan penuh syukur, kami mengundang Anda..." }) + T("Kutipan / ayat", "texts.quote", { ta: 1, full: 1, max: 500 }) + T("Kalimat penutup", "texts.closing", { ta: 1, full: 1, max: 300, ph: "Terima kasih atas doa dan kehadiran Anda." }) + "</div>");
      html += S("musik", "Musik", "Musik latar yang diputar saat tamu membuka undangan.", music);
      html += S("fitur", "Komponen Undangan", "", comp + SW("sections.gallery", "Bagian galeri", "Tampilkan galeri foto di undangan.") + SW("sections.map", "Bagian lokasi & peta", "Tampilkan kartu lokasi dengan tombol peta."));
    } else if (pkg === "signature") {
      html += S("scene", "Scene & Background", "Latar dan objek 3D yang tersedia di template ini.", '<div class="g2f">' + SEG("Scene", "scene.preset", opts(caps.scenes)) + CH("Objek 3D", "scene.objects", opts(caps.objects), "Objek yang ditampilkan di dalam scene.") + "</div>");
      html += S("kamera", "Kamera", "Gerakan kamera saat film pembuka diputar.", '<div class="g2f">' + SEG("Gerakan kamera", "camera.path", opts(caps.camera).map(function (x) { return [x[0], CAMN[x[0]] || x[1]]; })) + RNG("Kecepatan kamera", "camera.speed", 1, 10, "1 = sangat pelan, 10 = cepat.") + "</div>");
      html += S("animasi", "Animasi & Efek", "Pembukaan dan partikel yang menghidupkan scene.", '<div class="g2f">' + SEG("Animasi pembuka", "anim.intro", opts(caps.intro).map(function (x) { return [x[0], INTN[x[0]] || x[1]]; })) + SEG("Efek partikel", "anim.particles", opts(caps.particles).map(function (x) { return [x[0], PARN[x[0]] || x[1]]; })) + RNG("Intensitas efek", "anim.intensity", 1, 10) + "</div>");
      html += S("sinema", "Teks & Elemen Sinematik", "Judul film pembuka dan tampilan layar lebar.", '<div class="g2f">' + T("Judul sinematik", "cinematic.title", { full: 1, max: 80, ph: "Kosongkan untuk memakai nama acara" }) + T("Subjudul", "cinematic.subtitle", { full: 1, max: 120, ph: "Mis. Sebuah kisah yang dimulai di taman" }) + SEG("Warna sinematik (color grade)", "cinematic.grade", opts(caps.grades).map(function (x) { return [x[0], GRN[x[0]] || x[1]]; })) + '<div class="f full">' + SW("cinematic.letterbox", "Layar lebar (letterbox)", "Bilah hitam atas dan bawah ala film.") + "</div></div>");
      html += S("musik", "Musik Sinematik", "Musik yang mengiringi film pembuka.", music);
      html += S("fitur", "Komponen Undangan", "", comp);
    } else {
      html += S("venue", "Virtual Venue", "Tampilan venue 3D dan area yang dapat dikunjungi tamu.", '<div class="g2f">' + SEG("Scene venue", "scene.preset", opts(caps.scenes)) + '<div class="f full"><label>Area venue</label>' + ids(caps.areas).map(function (a) { var nm = opts(caps.areas).filter(function (x) { return x[0] === a; })[0][1]; return SW("venue.areas." + a, nm, { resepsi: "Area utama tempat tamu berkumpul dan menyapa.", kuliner: "Area makanan dan minuman virtual.", photobooth: "Tamu berfoto bersama avatar mereka.", galeri: "Foto-foto Anda ditampilkan di venue." }[a] || "Area yang dapat dikunjungi tamu."); }).join("") + "</div>" + CH("Dekorasi", "venue.decorations", opts(caps.decorations), "Dekorasi yang dipasang di venue.") + "</div>");
      html += S("avatar", "Avatar & Karakter", "Karakter yang dapat dipakai tamu di venue.", '<div class="g2f">' + CH("Pilihan avatar untuk tamu", "live.avatars", opts(caps.avatars)) + '<div class="f full">' + SW("live.allowSelect", "Tamu boleh memilih karakter", "Jika dimatikan, tamu memakai avatar pertama yang Anda aktifkan.") + "</div>" + T("Sapaan avatar mempelai", "live.greeting", { full: 1, max: 160, ph: "Selamat datang di hari bahagia kami!" }) + "</div>");
      html += S("interaktif", "Fitur Interaktif Live Guest", "Cara tamu berinteraksi di venue.", comp);
      html += S("musik", "Musik", "Musik latar venue.", music);
    }
    view.innerHTML = '<div class="fw">' + steps(4, pkg) + '<div class="hd"><h1 id="ttl">' + esc(inv.title) + "</h1><p>Isi dan sesuaikan undangan " + esc(PK[pkg].kind) + ' Anda. Perubahan tersimpan otomatis, jadi Anda bisa keluar dan melanjutkan kapan saja.</p></div>' + banner(inv, locked) +
      '<div class="ed"><nav aria-label="Bagian editor">' + secs.map(function (s) { return '<a href="#s-' + s[0] + '">' + esc(s[1]) + "</a>"; }).join("") + '</nav><div class="edcol">' + html + "</div>" +
      '<aside class="ped"><div class="card"><div class="save" id="sv" role="status" aria-live="polite"><i></i><span id="svt">Tersimpan</span></div><div class="f" style="margin-top:14px"><b style="font-size:14px">Kelengkapan <span id="pc">0</span>%</b><div class="bar2"><i id="pb" style="width:0"></i></div><ul class="chk" id="ck"></ul></div></div>' +
      '<div class="card"><div class="f" style="margin-top:0"><small>Paket &amp; template</small><b>' + PK[pkg].name + " &middot; " + esc(tpl ? tpl.name : inv.template_id) + '</b><small>Link undangan</small><b style="word-break:break-all">nusamora.com/' + esc(inv.slug || "") + "</b><small>Kategori: " + esc(CATN[cat]) + " &middot; Status: " + esc(inv.status) + '</small></div><div class="acts" style="margin-top:14px;flex-direction:column"><button class="btn" type="button" id="pv-b"' + (inv.moderation === "takedown" ? " disabled" : "") + ">" + (pend ? "Lanjutkan pembayaran" : inv.status === "aktif" ? "Lihat preview" : "Lanjut ke Preview") + '</button><button class="btn o" type="button" id="sv-b"' + dis() + '>Simpan sekarang</button><a class="btn o" href="/akun#undangan">Simpan &amp; ke dashboard</a></div></div></aside></div></div>';

    function content() { return pickKeys(pkg, C0); }
    function title() { var a = (C0.names.a || "").trim(), b = (C0.names.b || "").trim(); return a && b && (cat === "wedding" || cat === "engagement") ? a + " & " + b : a || inv.title; }
    function setSv(s, t) { state = s; var el = $("#sv"); el.className = "save " + (s === "ok" ? "" : s); $("#svt").textContent = t; }
    function progress() { var ck = baseChecks(C0, date).concat(extraChecks(pkg, C0)), n = ck.filter(function (x) { return x[1]; }).length, p = Math.round(n / ck.length * 100); $("#pc").textContent = p; $("#pb").style.width = p + "%"; $("#ck").innerHTML = ck.map(function (x) { return '<li class="' + (x[1] ? "y" : "") + '">' + esc(x[0]) + "</li>"; }).join(""); }
    function gallery() { $("#gl").innerHTML = C0.photos.gallery.map(function (u, i) { return '<div class="it"><img src="' + esc(u) + '" alt="Foto galeri ' + (i + 1) + '" loading="lazy">' + (locked ? "" : '<button type="button" data-rm="' + i + '" aria-label="Hapus foto ' + (i + 1) + '">&times;</button>') + "</div>"; }).join(""); progress(); }
    function save(now) { if (locked) return; clearTimeout(timer); dirty = true; setSv("dirty", "Perubahan belum disimpan..."); timer = setTimeout(run, now ? 0 : 1200); }
    function run() {
      if (busy) { timer = setTimeout(run, 400); return; } if (!dirty) return; busy = true; dirty = false; setSv("busy", "Menyimpan...");
      sb.rpc("save_invitation", { p_id: inv.id, p_title: title(), p_event_date: date || null, p_content: content() }).then(function (r) {
        busy = false;
        if (r.error) { dirty = true; if (r.error.message && ERR[r.error.message]) { setSv("err", errText(r.error)); return; } retry++; setSv("err", "Gagal menyimpan. " + (retry < 4 ? "Mencoba lagi..." : "Periksa koneksi lalu tekan Simpan sekarang.")); if (retry < 4) timer = setTimeout(run, 2500 * retry); return; }
        retry = 0; $("#ttl").textContent = title(); var t = new Date(); setSv(dirty ? "dirty" : "ok", dirty ? "Perubahan belum disimpan..." : "Tersimpan " + t.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })); if (dirty) save(false);
      }, function () { busy = false; dirty = true; retry++; setSv("err", "Gagal menyimpan. Mencoba lagi..."); if (retry < 4) timer = setTimeout(run, 2500 * retry); });
    }
    function apply(p, v) { if (p === "date") date = v; else set(C0, p, v); progress(); save(false); }
    view.addEventListener("input", function (e) {
      var el = e.target.closest("[data-p]"); if (!el || el.type === "checkbox" || el.type === "radio") return;
      var v = el.type === "range" ? Number(el.value) : el.value; if (el.type === "range") { var o = d.getElementById("o-" + el.dataset.p); if (o) o.textContent = v; }
      apply(el.dataset.p, v);
    });
    view.addEventListener("change", function (e) {
      var el = e.target.closest("[data-p]"); if (!el) return; var p = el.dataset.p;
      if (el.type === "checkbox" && el.dataset.v !== undefined) { var a = (get(C0, p) || []).slice(), i = a.indexOf(el.dataset.v); if (el.checked && i < 0) a.push(el.dataset.v); if (!el.checked && i > -1) a.splice(i, 1); apply(p, a); }
      else if (el.type === "checkbox") { set(C0, p, el.checked); if (p === "features.gift") $("#giftf").hidden = !el.checked; progress(); save(false); }
      else if (el.type === "radio") { if (el.checked) apply(p, el.value); }
      else if (el.tagName === "SELECT") apply(p, el.value);
    });
    var ax = $("#acc-x"); if (ax) ax.addEventListener("click", function () { C0.design2d.accent = ""; var c = $("#e-design2d\\.accent"); if (c) c.value = (PCOL[C0.design2d.palette] || PCOL.lavender)[0]; save(false); });
    $("#sv-b").addEventListener("click", function () { retry = 0; save(true); });
    d.addEventListener("visibilitychange", function () { if (d.hidden && dirty && !busy) { clearTimeout(timer); run(); } });
    addEventListener("beforeunload", function (e) { if (dirty || busy) { e.preventDefault(); e.returnValue = ""; } });
    function resize(file) { return new Promise(function (res, rej) { var img = new Image(), u = URL.createObjectURL(file); img.onload = function () { var m = 1600, s = Math.min(1, m / Math.max(img.width, img.height)), c = d.createElement("canvas"); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s); c.getContext("2d").drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(u); c.toBlob(function (b) { b ? res(b) : rej(); }, "image/webp", 0.85); }; img.onerror = function () { URL.revokeObjectURL(u); rej(); }; img.src = u; }); }
    function upload(file) {
      if (!/^image\/(png|jpeg|webp)$/.test(file.type)) return Promise.reject("Hanya PNG, JPG, atau WebP.");
      if (file.size > 15 * 1024 * 1024) return Promise.reject("Ukuran foto maksimal 15 MB.");
      return resize(file).then(function (b) { if (b.size > 3145728) throw "Foto terlalu besar setelah dikecilkan."; var path = U.id + "/" + inv.id + "/" + Date.now() + "-" + Math.random().toString(36).slice(2, 7) + ".webp"; return sb.storage.from("invitation-media").upload(path, b, { contentType: "image/webp" }).then(function (r) { if (r.error) throw "Gagal mengunggah foto. Coba lagi."; return sb.storage.from("invitation-media").getPublicUrl(path).data.publicUrl; }); }, function () { throw "Foto tidak bisa dibaca."; });
    }
    var uc = $("#up-c"), ug = $("#up-g");
    if (uc) uc.onchange = function () { var f = uc.files[0]; if (!f) return; $("#er-c").textContent = "Mengunggah..."; upload(f).then(function (u) { C0.photos.cover = u; $("#cv").innerHTML = '<img src="' + esc(u) + '" alt="Foto sampul">'; $("#er-c").textContent = ""; progress(); save(true); }, function (m) { $("#er-c").textContent = typeof m === "string" ? m : "Gagal mengunggah."; }); uc.value = ""; };
    if (ug) ug.onchange = function () {
      var fs = Array.prototype.slice.call(ug.files), room = GMAX - C0.photos.gallery.length, er = $("#er-g"); er.textContent = ""; if (!fs.length) return; if (room <= 0) { er.textContent = "Galeri sudah penuh (" + GMAX + " foto)."; ug.value = ""; return; } if (fs.length > room) { er.textContent = "Hanya " + room + " foto pertama yang diunggah (batas galeri)."; fs = fs.slice(0, room); }
      er.textContent += (er.textContent ? " " : "") + "Mengunggah..."; Promise.all(fs.map(function (f) { return upload(f).then(function (u) { return { u: u }; }, function (m) { return { e: m }; }); })).then(function (rs) { var bad = rs.filter(function (x) { return x.e; }); rs.forEach(function (x) { if (x.u) C0.photos.gallery.push(x.u); }); er.textContent = bad.length ? (typeof bad[0].e === "string" ? bad[0].e : "Sebagian foto gagal diunggah.") : ""; gallery(); save(true); }); ug.value = "";
    };
    $("#gl").addEventListener("click", function (e) { var b = e.target.closest("[data-rm]"); if (!b) return; var i = Number(b.dataset.rm), u = C0.photos.gallery[i]; C0.photos.gallery.splice(i, 1); gallery(); save(true); var p = u && u.split("/invitation-media/")[1]; if (p) sb.storage.from("invitation-media").remove([p]); });
    function flush() { clearTimeout(timer); if (dirty && !busy) { run(); } return new Promise(function (res) { (function w(n) { if (!dirty && !busy) return res(); if (n > 40 || state === "err") return res(); setTimeout(function () { w(n + 1); }, 150); })(0); }); }
    $("#pv-b").addEventListener("click", function () { if (pend) { goPayNow(inv); return; } this.disabled = true; this.textContent = "Menyimpan..."; flush().then(function () { location.href = "/preview?id=" + encodeURIComponent(inv.id); }); });
    var cb = $("#bn-cancel"); if (cb) cb.addEventListener("click", function () { cancelPay(inv, cb); });
    var cp = $("#bn-copy"); if (cp) cp.addEventListener("click", function () { copyText(cp.dataset.u, cp); });
    var links = $$(".ed nav a"); function spy() { var cur = secs[0][0]; secs.forEach(function (s) { var el = d.getElementById("s-" + s[0]); if (el && el.getBoundingClientRect().top < 160) cur = s[0]; }); links.forEach(function (a) { a.classList.toggle("on", a.getAttribute("href") === "#s-" + cur); }); } addEventListener("scroll", spy, { passive: true }); spy();
    gallery(); setSv("ok", "Tersimpan");
    // draft baru belum punya nilai bawaan paket di database: simpan sekali agar validasi publikasi server melihatnya
    var sv0 = inv.content || {}; if (!locked && inv.status === "draft" && (PKEYS[pkg] || []).some(function (k) { return sv0[k] === undefined; })) save(true);
  }

  /* ================= 6. PREVIEW (berbeda untuk tiap paket) ================= */
  function tz(c) { return { WIB: "+07:00", WITA: "+08:00", WIT: "+09:00" }[c.event.tz] || "+07:00"; }
  function titleOf(x) { var c = x.c; return (x.cat === "wedding" || x.cat === "engagement") && c.names.b ? esc(c.names.a || "...") + " &amp; " + esc(c.names.b) : esc(c.names.a || x.inv.title || "Undangan"); }
  function r2d(x) {
    var c = x.c, g = c.design2d, pal = PCOL[g.palette] || PCOL.lavender, acc = /^#[0-9a-f]{6}$/i.test(g.accent || "") ? g.accent : pal[0], ff = (FONTS[g.font] || FONTS.romantic)[0];
    var ts = x.date ? Date.parse(x.date + "T" + (c.event.start || "00:00") + ":00" + tz(c)) : NaN, gal = c.photos.gallery || [];
    var maps = /^https?:\/\//i.test(c.event.maps || "") ? '<a class="i2-btn" target="_blank" rel="noopener" href="' + esc(c.event.maps) + '">Buka peta</a>' : "";
    return '<div class="i2" style="--ac:' + acc + ";--bg2:" + pal[1] + ";--ff:" + ff + '"><header class="i2-h"' + (c.photos.cover ? ' style="background-image:linear-gradient(180deg,rgba(0,0,0,.25),rgba(0,0,0,.55)),url(' + esc(c.photos.cover) + ')"' : "") + "><small>" + esc(c.texts.opening || "Dengan penuh syukur, kami mengundang Anda") + "</small><h1>" + titleOf(x) + "</h1><p>" + esc(x.date ? fdate(x.date, true) : "Tanggal belum diisi") + "</p></header>" +
      (c.welcome ? '<section class="i2-s"><p class="i2-w">' + esc(c.welcome) + "</p></section>" : "") +
      (c.texts.quote ? '<section class="i2-s q"><p>&ldquo;' + esc(c.texts.quote) + "&rdquo;</p></section>" : "") +
      (c.features.countdown && !isNaN(ts) ? '<section class="i2-s"><h2>Menuju hari bahagia</h2><div class="i2-cd" data-ts="' + ts + '"><b>0</b><span>hari</span><b>0</b><span>jam</span><b>0</b><span>menit</span><b>0</b><span>detik</span></div></section>' : "") +
      '<section class="i2-s"><h2>Waktu &amp; Tempat</h2><div class="i2-card"><b>' + esc(x.date ? fdate(x.date, true) : "-") + "</b><span>" + esc(c.event.start ? c.event.start + (c.event.end ? " - " + c.event.end : "") + " " + c.event.tz : "Jam belum diisi") + "</span><b>" + esc(c.event.venue || "Lokasi belum diisi") + "</b><span>" + esc(c.event.address || "") + "</span>" + (c.sections.map ? maps : "") + "</div></section>" +
      (c.sections.gallery && gal.length ? '<section class="i2-s"><h2>Galeri</h2><div class="i2-g">' + gal.map(function (u) { return '<img src="' + esc(u) + '" alt="" loading="lazy">'; }).join("") + "</div></section>" : "") +
      (c.features.rsvp ? '<section class="i2-s"><h2>RSVP</h2><form class="i2-f" data-demo><input placeholder="Nama Anda" aria-label="Nama Anda"><select aria-label="Kehadiran"><option>Hadir</option><option>Tidak hadir</option></select><button class="i2-btn" type="submit">Kirim konfirmasi</button></form></section>' : "") +
      (c.features.guestbook ? '<section class="i2-s"><h2>Buku ucapan</h2><div class="i2-card"><b>Contoh ucapan</b><span>Barakallah, semoga menjadi keluarga yang sakinah.</span></div></section>' : "") +
      (c.features.gift && (c.gift.bank || c.gift.number) ? '<section class="i2-s"><h2>Hadiah digital</h2><div class="i2-card"><b>' + esc(c.gift.bank) + "</b><span>" + esc(c.gift.number) + "</span><span>a.n. " + esc(c.gift.holder) + "</span></div></section>" : "") +
      '<footer class="i2-f2">' + esc(c.texts.closing || "Terima kasih atas doa dan kehadiran Anda.") + (c.music.enabled ? '<em>&#9835; Musik latar aktif</em>' : "") + "</footer></div>";
  }
  function rCin(x) {
    var c = x.c, sc = c.scene.preset || "", tone = /night/.test(sc) ? "night" : /dusk/.test(sc) ? "dusk" : "day", dur = Math.max(6, 34 - c.camera.speed * 2.6), n = Math.min(44, Math.round(c.anim.intensity * 4)), pt = c.anim.particles, ps = "";
    if (pt !== "none") for (var i = 0; i < n; i++) { var r = function (k) { return ((Math.sin(i * 12.9898 + k * 78.233) * 43758.5453) % 1 + 1) % 1; }; ps += '<i class="pt ' + pt + '" style="left:' + (r(1) * 100).toFixed(1) + "%;animation-delay:-" + (r(2) * 12).toFixed(1) + "s;animation-duration:" + (8 + r(3) * 9).toFixed(1) + "s;--s:" + (6 + r(4) * 9).toFixed(0) + 'px"></i>'; }
    var nm = function (arr, id) { var f = (Array.isArray(arr) ? arr : []).filter(function (o) { return (o.id || o) === id; })[0]; return f ? (f.name || f) : id; };
    var objs = (c.scene.objects || []).map(function (o) { return nm(x.caps.objects, o); });
    return '<div class="cin g-' + c.cinematic.grade + '"><div class="cin-st"><div class="cin-bg cam-' + c.camera.path + '" style="background-image:url(' + esc(x.tpl && x.tpl.img || c.photos.cover || "") + ");animation-duration:" + dur + 's"></div><div class="cin-tone ' + tone + '"></div>' + ps + (c.cinematic.letterbox ? '<div class="cin-lb t"></div><div class="cin-lb b"></div>' : "") +
      '<div class="cin-t in-' + c.anim.intro + '"><small>' + esc(c.cinematic.subtitle || (x.date ? fdate(x.date) : "")) + "</small><h1>" + (c.cinematic.title ? esc(c.cinematic.title) : titleOf(x)) + "</h1><p>" + esc(c.event.venue || "") + "</p></div></div>" +
      '<div class="cin-info"><span>Scene: <b>' + esc(nm(x.caps.scenes, sc) || "-") + "</b></span><span>Kamera: <b>" + esc(CAMN[c.camera.path] || c.camera.path) + " (kecepatan " + c.camera.speed + ")</b></span><span>Animasi: <b>" + esc(INTN[c.anim.intro] || c.anim.intro) + "</b></span><span>Efek: <b>" + esc(PARN[pt] || pt) + "</b></span><span>Objek: <b>" + esc(objs.join(", ") || "-") + '</b></span></div><button type="button" class="btn o sm" id="replay">Putar ulang</button><p class="fine">Simulasi pratinjau pengaturan Anda. Render 3D penuh memakai engine template saat undangan tayang.</p></div>';
  }
  var AREAI = { resepsi: "Area Resepsi", kuliner: "Area Kuliner", photobooth: "Photo Booth", galeri: "Galeri Foto" };
  function rLive(x) {
    var c = x.c, sc = c.scene.preset || "", tone = /night/.test(sc) ? "night" : /dusk/.test(sc) ? "dusk" : "day", nm = function (arr, id) { var f = (Array.isArray(arr) ? arr : []).filter(function (o) { return (o.id || o) === id; })[0]; return f ? (f.name || f) : id; };
    var areas = Object.keys(c.venue.areas || {}).filter(function (k) { return c.venue.areas[k]; }), av = c.live.avatars || [], dec = c.venue.decorations || [];
    return '<div class="lv"><div class="lv-h"><div class="lv-bg" style="background-image:url(' + esc(x.tpl && x.tpl.img || "") + ')"></div><div class="cin-tone ' + tone + '"></div><div class="lv-t"><small>Virtual venue &middot; ' + esc(nm(x.caps.scenes, sc) || "") + "</small><h1>" + titleOf(x) + "</h1><p>" + esc(x.date ? fdate(x.date, true) : "") + " &middot; " + esc(c.event.venue || "") + "</p></div>" + (c.live.greeting ? '<div class="lv-b">' + esc(c.live.greeting) + "</div>" : "") + "</div>" +
      '<div class="lv-g"><section class="card"><h3>Denah venue</h3>' + (areas.length ? '<div class="lv-a">' + areas.map(function (a) { return "<div><b>" + esc(nm(x.caps.areas, a) || AREAI[a] || a) + "</b><span>" + (a === "galeri" ? c.photos.gallery.length + " foto dipajang" : "Dapat dikunjungi tamu") + "</span></div>"; }).join("") + "</div>" : "<p class=\"sub\">Belum ada area aktif.</p>") + '</section><section class="card"><h3>Avatar tamu</h3>' + (av.length ? '<div class="seg chs" id="avs">' + av.map(function (a, i) { return '<label class="sgi"><input type="radio" name="av" value="' + esc(a) + '"' + (i === 0 ? " checked" : "") + "><span>" + esc(nm(x.caps.avatars, a)) + "</span></label>"; }).join("") + '</div><p class="sub" id="av-n">' + (c.live.allowSelect ? "Tamu bebas memilih karakter ini saat masuk venue." : "Tamu memakai avatar pertama.") + "</p>" : '<p class="sub">Belum ada avatar yang diaktifkan.</p>') + '</section><section class="card"><h3>Dekorasi</h3><div class="tags">' + (dec.length ? dec.map(function (a) { return '<span class="tag">' + esc(nm(x.caps.decorations, a)) + "</span>"; }).join("") : '<span class="sub">Tanpa dekorasi tambahan</span>') + '</div></section><section class="card"><h3>Fitur interaktif</h3><div class="tags">' + [c.features.rsvp ? "RSVP" : "", c.features.guestbook ? "Ucapan" : "", c.features.countdown ? "Hitung mundur" : "", c.features.gift ? "Hadiah digital" : "", c.music.enabled ? "Musik latar" : ""].filter(Boolean).map(function (f) { return '<span class="tag">' + f + "</span>"; }).join("") + "</div></section></div>" +
      (x.tpl && /^\/live/.test(x.tpl.demo || "") ? '<a class="btn o" target="_blank" rel="noopener" href="' + esc(x.tpl.demo) + '">Coba demo Live Guest template ini</a>' : "") + '<p class="fine">Denah mengikuti pengaturan Anda. Pengalaman 3D penuh dapat dicoba di demo template.</p></div>';
  }
  function renderStage(x, host) {
    host.innerHTML = x.pkg === "essential" ? r2d(x) : x.pkg === "signature" ? rCin(x) : rLive(x);
    $$(".i2-cd", host).forEach(function (el) { var ts = Number(el.dataset.ts); function t() { var s = Math.max(0, Math.floor((ts - Date.now()) / 1000)), b = el.querySelectorAll("b"); b[0].textContent = Math.floor(s / 86400); b[1].textContent = Math.floor(s % 86400 / 3600); b[2].textContent = Math.floor(s % 3600 / 60); b[3].textContent = s % 60; } t(); var iv = setInterval(function () { if (!d.body.contains(el)) clearInterval(iv); else t(); }, 1000); });
    $$("form[data-demo]", host).forEach(function (f) { f.addEventListener("submit", function (e) { e.preventDefault(); toast("Contoh tampilan. RSVP aktif setelah undangan dipublikasikan."); }); });
    var rp = $("#replay", host); if (rp) rp.onclick = function () { renderStage(x, host); };
    var avs = $("#avs", host); if (avs) avs.addEventListener("change", function () { var n = $("#av-n", host); if (n) n.textContent = "Contoh: tamu memakai karakter terpilih."; });
  }
  function sampleContent(pkg, tpl) {
    var c = fullContent(pkg, tpl.caps, { names: { a: "Sinta", b: "Raka" }, welcome: "Dengan penuh rasa syukur, kami mengundang Anda untuk hadir di hari bahagia kami.", event: { start: "10:00", end: "13:00", tz: "WIB", venue: "Gedung Serbaguna Kenanga", address: "Jl. Kenanga No. 12, Yogyakarta", maps: "" }, photos: { cover: tpl.img, gallery: [tpl.img, tpl.img, tpl.img] } });
    if (pkg === "essential") c.texts = { opening: "Dengan penuh syukur, kami mengundang Anda", quote: "Dan di antara tanda-tanda kekuasaan-Nya ialah Dia menciptakan pasangan untukmu.", closing: "Terima kasih atas doa dan kehadiran Anda." };
    if (pkg === "signature") c.cinematic.subtitle = "Sebuah kisah yang dimulai di sini";
    if (pkg === "luxe") c.live.greeting = "Selamat datang di hari bahagia kami!";
    return c;
  }
  function pagePreview() {
    var q = new URLSearchParams(location.search), demo = q.get("demo"), id = q.get("id");
    function shell(x, mode) {
      var head = mode === "demo" ? '<div class="hd"><h1>Contoh template ' + esc(x.tpl.name) + "</h1><p>Contoh tampilan dengan data contoh. Data Anda belum dipakai.</p></div>" : '<div class="hd"><h1>Preview undangan</h1><p>Periksa tampilan undangan ' + esc(PK[x.pkg].kind) + " Anda. Pembayaran dilakukan setelah Anda puas dengan hasilnya.</p></div>";
      var act = mode === "demo" ? '<a class="btn o" href="/paket">Lihat paket</a><a class="btn" href="/buat?paket=' + x.pkg + "&kategori=" + x.cat + "&template=" + encodeURIComponent(x.tpl.slug) + '">Gunakan template ini</a>' :
        '<a class="btn o" href="/editor?id=' + encodeURIComponent(x.inv.id) + '">Kembali ke editor</a>' + (x.inv.status === "aktif" ? '<a class="btn" href="/akun#undangan">Ke dashboard</a>' : x.inv.status === "menunggu_pembayaran" ? '<button class="btn" type="button" id="pay-b">Lanjutkan pembayaran</button>' : '<button class="btn" type="button" id="pub-b">Publikasikan</button>');
      view.innerHTML = '<div class="fw">' + (mode === "demo" ? '<div class="pkbar"><span class="pkchip"><i>' + PK[x.pkg].icon + "</i>Paket " + PK[x.pkg].name + " &middot; " + PK[x.pkg].kind + "</span></div>" : steps(5, x.pkg)) + head + '<div class="pvbar"><div class="seg" role="radiogroup" aria-label="Ukuran layar"><label class="sgi"><input type="radio" name="dv" value="d" checked><span>Desktop</span></label><label class="sgi"><input type="radio" name="dv" value="m"><span>Ponsel</span></label></div><div class="acts pvact">' + act + '</div></div><div class="pvwrap"><div class="stage pk-' + x.pkg + '" id="stage"></div></div></div>';
      var host = $("#stage"); renderStage(x, host);
      $$("input[name=dv]").forEach(function (i) { i.addEventListener("change", function () { $(".pvwrap").classList.toggle("mob", i.value === "m" && i.checked); }); });
      var pb = $("#pub-b"); if (pb) pb.addEventListener("click", function () { openCheckout(x); });
      var pyb = $("#pay-b"); if (pyb) pyb.addEventListener("click", function () { goPayNow(x.inv); });
      if (mode !== "demo" && q.get("publish") === "1" && x.inv.status === "draft") openCheckout(x);
    }
    if (demo) {
      loadTemplate(demo).then(function (tpl) {
        if (!tpl) { view.innerHTML = note("Template tidak ditemukan", "Template ini tidak tersedia.", '<a class="btn" href="/paket">Pilih Paket</a>'); return; }
        var cat = tpl.cats[0] || "wedding"; shell({ pkg: tpl.pkg, cat: cat, date: new Date(Date.now() + 120 * 864e5).toISOString().slice(0, 10), c: sampleContent(tpl.pkg, tpl), tpl: tpl, caps: tpl.caps, inv: { title: tpl.name } }, "demo");
      }); return;
    }
    if (!id) { view.innerHTML = note("Undangan tidak ditemukan", "Buka preview dari editor undangan.", '<a class="btn" href="/akun#undangan">Undangan Saya</a>'); return; }
    sb.from("invitations").select("id,title,category,template_id,package_type,slug,status,event_date,content,moderation,public_url,expires_at").eq("id", id).maybeSingle().then(function (r) {
      var inv = r.data; if (r.error || !inv) { view.innerHTML = note("Undangan tidak ditemukan", "Undangan ini tidak ada atau bukan milik akun Anda.", '<a class="btn" href="/akun#undangan">Undangan Saya</a>'); return; }
      Promise.all([loadTemplate(inv.template_id), loadPlans()]).then(function (z) {
        var tpl = z[0], pkg = pkgOk(inv.package_type) || (tpl && pkgOk(tpl.pkg));
        if (!pkg) { view.innerHTML = note("Paket undangan belum ditentukan", "Buat undangan baru melalui Pilih Paket.", '<a class="btn" href="/paket">Pilih Paket</a>'); return; }
        var caps = (tpl && tpl.caps) || {};
        shell({ pkg: pkg, cat: CATN[inv.category] ? inv.category : "other", date: inv.event_date || "", c: fullContent(pkg, caps, inv.content), tpl: tpl, caps: caps, inv: inv, plan: z[1].filter(function (p) { return p.id === pkg; })[0] }, "own");
      });
    }, function () { view.innerHTML = note("Tidak bisa terhubung", "Periksa koneksi internet Anda lalu muat ulang halaman."); });
  }

  /* ================= 7. PUBLIKASI: ringkasan pesanan & checkout ================= */
  function missingList(x) {
    var c = x.c, m = [];
    if (!(c.names.a || "").trim()) m.push("Nama acara");
    if ((x.cat === "wedding" || x.cat === "engagement") && !(c.names.b || "").trim()) m.push("Nama pasangan");
    if (!x.date) m.push("Tanggal acara"); if (!c.event.start) m.push("Jam mulai"); if (!(c.event.venue || "").trim()) m.push("Nama lokasi"); if (!c.photos.cover) m.push("Foto sampul");
    extraChecks(x.pkg, c).forEach(function (e) { if (!e[1]) m.push(e[0] === "Area venue" ? "Minimal satu area venue" : e[0] === "Avatar tamu" ? "Minimal satu pilihan avatar tamu" : e[0]); });
    if (x.plan && c.photos.gallery.length > x.plan.gallery_limit) m.push("Galeri maksimal " + x.plan.gallery_limit + " foto untuk paket ini");
    return m;
  }
  function missingHtml(m, inv) { return '<ul class="miss">' + m.map(function (l) { return '<li><a href="/editor?id=' + encodeURIComponent(inv.id) + "#s-" + secOf(l) + '">' + esc(l) + "</a></li>"; }).join("") + "</ul>"; }
  function openCheckout(x) {
    var miss = missingList(x), inv = x.inv, p = x.plan;
    if (miss.length) { dlg('<h2>Lengkapi data undangan</h2><p class="sub">Data berikut wajib diisi sebelum undangan dapat dipublikasikan.</p>' + missingHtml(miss, inv) + '<div class="acts"><button class="btn o" type="button" data-x>Tutup</button><a class="btn" href="/editor?id=' + encodeURIComponent(inv.id) + '">Lengkapi di editor</a></div>'); return; }
    if (!p) { dlg('<h2>Ringkasan pesanan</h2><p class="sub">Data paket belum dapat dimuat. Muat ulang halaman lalu coba lagi.</p><div class="acts"><button class="btn o" type="button" data-x>Tutup</button></div>'); return; }
    var e = dlg('<h2>Ringkasan pesanan</h2><p class="sub">Periksa pesanan Anda sebelum membayar. Undangan aktif setelah pembayaran terkonfirmasi.</p><div class="ord"><span class="pkchip"><i>' + PK[x.pkg].icon + "</i>Paket " + PK[x.pkg].name + "</span><b>" + PK[x.pkg].kind + "</b><ul>" + PK[x.pkg].feats.map(function (f) { return "<li>" + esc(f) + "</li>"; }).join("") + "</ul></div>" +
      '<dl class="sum"><div><dt>Undangan</dt><dd>' + esc(inv.title) + "</dd></div><div><dt>Template</dt><dd>" + esc(x.tpl ? x.tpl.name : inv.template_id) + "</dd></div><div><dt>Link undangan</dt><dd>nusamora.com/" + esc(inv.slug) + "</dd></div><div><dt>Masa aktif</dt><dd>" + p.duration_days + " hari, hingga " + esc(fdate(Date.now() + p.duration_days * 864e5)) + "</dd></div><div><dt>Harga paket</dt><dd>" + rp(p.price) + '</dd></div><div class="tot"><dt>Total</dt><dd>' + rp(p.price) + '</dd></div></dl><p class="fine">Harga final dihitung server saat pembayaran dibuat. Pembayaran diproses aman oleh Midtrans.</p><div class="err" id="pe" role="alert"></div><div class="acts"><button class="btn o" type="button" data-x>Batal</button><button class="btn" type="button" id="pay-go">Bayar ' + rp(p.price) + "</button></div>", "wide");
    $("#pay-go", e).addEventListener("click", function () {
      var b = this, er = $("#pe", e); b.disabled = true; b.innerHTML = '<i class="spin"></i> Menyiapkan pembayaran...'; er.textContent = "";
      checkout({ invitation_id: inv.id, plan_id: x.pkg }).then(function (r) {
        if (r.data) { location.href = r.data.redirect_url; return; }
        b.disabled = false; b.textContent = "Bayar " + rp(p.price); var m = r.err || {};
        if (m.error === "data_belum_lengkap" && m.missing) { e.innerHTML = '<h2>Lengkapi data undangan</h2><p class="sub">Data berikut wajib diisi.</p>' + missingHtml(m.missing, inv) + '<div class="acts"><button class="btn o" type="button" data-x>Tutup</button><a class="btn" href="/editor?id=' + encodeURIComponent(inv.id) + '">Lengkapi di editor</a></div>'; return; }
        if (m.error === "sudah_aktif") { er.innerHTML = esc(m.message) + ' <a href="/akun#undangan">Buka dashboard</a>'; return; }
        er.textContent = m.message || "Terjadi kendala. Coba lagi.";
      });
    });
  }

  /* ================= PUBLIKASI & PEMBAYARAN ================= */
  var EXP = { "2d": "Undangan digital 2D", "3d": "Undangan 3D cinematic", "live": "Undangan 3D + Live Guest" };
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
  var PAGES = { paket: pagePaket, template: pageTemplate, buat: pageBuat, editor: pageEditor, preview: pagePreview, pembayaran: pageBayar };
  function go() { (PAGES[PAGE] || pagePaket)(); }
  if (!sb) { view.innerHTML = note("Sistem belum dikonfigurasi", "Isi SUPABASE_URL dan SUPABASE_ANON_KEY di assets/config.js."); return; }
  var isDemo = PAGE === "preview" && !!new URLSearchParams(location.search).get("demo");     // contoh template: terbuka tanpa login
  sb.auth.getSession().then(function (r) {
    var s = r.data && r.data.session;
    if (!s) { if (isDemo) { go(); return; } location.replace("/masuk?next=" + encodeURIComponent(nextUrl())); return; }
    U = s.user; $("#chip-i").textContent = (U.email || "?").charAt(0).toUpperCase();
    return sb.from("profiles").select("status").eq("id", U.id).maybeSingle().then(function (x) {
      if (x && x.data && x.data.status === "suspended") { view.innerHTML = note("Akun ditangguhkan", "Akun Anda sedang ditangguhkan. Hubungi tim NusaMora untuk bantuan."); return; }
      go();
    }, go);
  }, function () { view.innerHTML = note("Tidak bisa terhubung", "Periksa koneksi internet Anda lalu muat ulang."); });
  sb.auth.onAuthStateChange(function (ev) { if (ev === "SIGNED_OUT" && !isDemo) location.replace("/masuk"); });
})();
