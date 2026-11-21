/* Interaksi halaman artikel NusaMora: suka, simpan, bagikan, feedback, profil penulis, komentar bersarang + reaksi.
   Semua data dari Supabase lewat RPC (backend/artikel-interaksi.sql); otorisasi dan batas laju ditegakkan di database.
   Teks pengguna SELALU dipasang sebagai teks (esc / textContent), tidak pernah sebagai HTML. Vanilla JS.
   Dipanggil artikel-detail.js: window.NMInteract.mount({root, stats, ctx, toast}) */
(function () {
  "use strict";
  var d = document;
  var P = {
    heart: '<path d="M12 20.5s-7.5-4.6-9.3-9.4C1.5 7.600 3.700 4.500 6.900 4.500c1.900 0 3.500 1 5.100 3 1.600-2 3.200-3 5.100-3 3.200 0 5.400 3.100 4.200 6.600-1.800 4.800-9.300 9.400-9.300 9.400z"/>',
    mark: '<path d="M6 3.500h12v17l-6-4.500-6 4.500z"/>', chat: '<path d="M21 12a8 8 0 0 1-11.600 7.100L4 20l1-4.600A8 8 0 1 1 21 12z"/>', eye: '<path d="M2 12s3.500-7 10-7 10 7 10 7-3.500 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.600 10.500l6.800-4M8.600 13.500l6.800 4"/>', flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>', check: '<path d="M5 12.500l4.500 4.500L19 7.500"/>'
  };
  var ico = function (n, s) { return '<svg viewBox="0 0 24 24" width="' + (s || 18) + '" height="' + (s || 18) + '" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + P[n] + "</svg>"; };
  var ERR = {
    login_diperlukan: "Masuk dulu untuk melakukan ini.", terlalu_banyak_permintaan: "Terlalu cepat. Coba lagi beberapa menit lagi.", komentar_terlalu_pendek: "Komentar terlalu pendek.", komentar_terlalu_panjang: "Komentar terlalu panjang.",
    komentar_duplikat: "Komentar yang sama baru saja Anda kirim.", komentar_ditutup: "Komentar untuk artikel ini ditutup.", nama_tidak_valid: "Nama 2–40 karakter.", tidak_diizinkan: "Anda tidak berhak melakukan ini.",
    tidak_ditemukan: "Data tidak ditemukan atau sudah dihapus.", identitas_tidak_valid: "Peramban Anda tidak mengizinkan penyimpanan lokal. Aktifkan lalu muat ulang.", komentar_induk_tidak_valid: "Komentar yang dibalas sudah tidak tersedia.", alasan_tidak_valid: "Tulis alasan 3–300 karakter."
  };
  var errMsg = function (e) { return ERR[e] || "Terjadi kesalahan. Coba lagi."; };
  function anonId() {
    var k = "nm_anon", v = ""; try { v = localStorage.getItem(k) || ""; } catch (x) { /* privat */ }
    if (!/^[A-Za-z0-9_-]{16,64}$/.test(v)) {
      var a = new Uint8Array(18); (window.crypto || {}).getRandomValues ? crypto.getRandomValues(a) : a.forEach(function (_, i) { a[i] = Math.floor(Math.random() * 256); });
      v = btoa(String.fromCharCode.apply(null, a)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); try { localStorage.setItem(k, v); } catch (x) { /* tetap pakai di memori */ }
    }
    return v;
  }
  function ago(iso) {
    var s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
    if (s < 60) return "baru saja"; if (s < 3600) return Math.floor(s / 60) + " menit lalu"; if (s < 86400) return Math.floor(s / 3600) + " jam lalu";
    if (s < 86400 * 7) return Math.floor(s / 86400) + " hari lalu";
    return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
  }
  var nfmt = function (n) { n = Number(n) || 0; return n >= 10000 ? (n / 1000).toFixed(n >= 100000 ? 0 : 1).replace(".", ",") + " rb" : String(n).replace(/\B(?=(\d{3})+(?!\d))/g, "."); };

  function mount(o) {
    var ctx = o.ctx, sb = ctx.sb, esc = ctx.esc, root = o.root, c = ctx.c, toast = o.toast || function () { };
    var slug = c.slug, lang = c.lang || "id", anon = anonId(), user = null, eng = null, sort = "newest", loaded = 0, total = 0, busy = false, PAGE = 10;
    var rpc = function (fn, args) { return Promise.resolve(sb.rpc(fn, args)).then(function (r) { return r || {}; }, function (e) { return { error: e }; }); };
    var $ = function (s, el) { return (el || root).querySelector(s); };
    var loginUrl = "/masuk?next=" + encodeURIComponent(location.pathname + location.search + "#komentar");
    function say(m, bad) { toast(m, bad); }

    root.innerHTML =
      '<div class="ai-act" id="ai-act"><button type="button" class="ai-btn ai-like" id="ai-like" aria-pressed="false"><span class="ai-ic">' + ico("heart", 20) + '</span><span class="ai-lb">Suka</span><b id="ai-lc">0</b></button>' +
      '<button type="button" class="ai-btn ai-save" id="ai-save" aria-pressed="false"><span class="ai-ic">' + ico("mark", 20) + '</span><span class="ai-lb">Simpan</span></button>' +
      '<a class="ai-btn" href="#komentar" id="ai-cj"><span class="ai-ic">' + ico("chat", 20) + '</span><span class="ai-lb">Komentar</span><b id="ai-cc">0</b></a></div>' +
      '<section class="ai-fb" id="ai-fb" aria-labelledby="ai-fbh"><h2 id="ai-fbh">Apakah artikel ini membantu?</h2><div class="ai-fbo" role="group" aria-labelledby="ai-fbh">' +
      '<button type="button" data-v="helpful">Sangat membantu</button><button type="button" data-v="somewhat">Cukup membantu</button><button type="button" data-v="not_helpful">Kurang membantu</button></div><p class="ai-fbm" id="ai-fbm" role="status" aria-live="polite"></p></section>' +
      '<section class="ai-au" id="ai-au" hidden aria-labelledby="ai-auh"></section>' +
      '<section class="ai-cm" id="komentar" aria-labelledby="ai-cmh"><div class="ai-cmh"><h2 id="ai-cmh">Komentar <span id="ai-cmn"></span></h2><label class="ai-sort"><span>Urutkan</span><select id="ai-sort"><option value="newest">Terbaru</option><option value="oldest">Terlama</option><option value="liked">Terpopuler</option></select></label></div>' +
      '<div id="ai-form"></div><div id="ai-list" aria-live="polite" aria-busy="true">' + skel() + '</div><div class="ai-more"><button type="button" class="ai-ghost" id="ai-more" hidden>Muat lebih banyak</button></div></section>';

    function skel() { var s = ""; for (var i = 0; i < 3; i++) s += '<div class="ai-sk" aria-hidden="true"><i></i><div><b></b><span></span><span></span></div></div>'; return s; }

    /* ---------------- ringkasan: suka, simpan, jumlah, feedback, penulis ---------------- */
    function paintStats() {
      if (!eng) return;
      var like = $("#ai-like"); like.setAttribute("aria-pressed", eng.liked ? "true" : "false"); like.classList.toggle("on", !!eng.liked); $("#ai-lc").textContent = nfmt(eng.likes);
      like.setAttribute("aria-label", (eng.liked ? "Batal suka. " : "Suka artikel ini. ") + eng.likes + " suka");
      var sv = $("#ai-save"); sv.setAttribute("aria-pressed", eng.saved ? "true" : "false"); sv.classList.toggle("on", !!eng.saved); $(".ai-lb", sv).textContent = eng.saved ? "Tersimpan" : "Simpan";
      $("#ai-cc").textContent = nfmt(eng.comments); $("#ai-cmn").textContent = eng.comments ? "(" + nfmt(eng.comments) + ")" : "";
      if (o.stats) o.stats.innerHTML = '<span>' + ico("eye", 15) + nfmt(eng.views) + ' dibaca</span><span>' + ico("heart", 15) + nfmt(eng.likes) + ' suka</span><span>' + ico("chat", 15) + nfmt(eng.comments) + " komentar</span>";
      $$("#ai-fb [data-v]").forEach(function (b) { var on = b.getAttribute("data-v") === eng.feedback; b.classList.toggle("on", on); b.setAttribute("aria-pressed", on ? "true" : "false"); });
      if (eng.feedback) $("#ai-fbm").textContent = "Terima kasih atas masukan Anda.";
    }
    function $$(s) { return [].slice.call(root.querySelectorAll(s)); }

    function paintAuthor() {
      var a = eng && eng.author; if (!a) return;
      var by = o.byline; if (by) by.textContent = a.name;
      var av = a.avatar_url ? '<img src="' + esc(ctx.safeUrl(a.avatar_url)) + '" alt="" loading="lazy" width="64" height="64">' : '<span>' + esc(a.name.charAt(0).toUpperCase()) + "</span>";
      var lk = (a.links || []).map(function (l) { var u = ctx.safeUrl(l.url); return u ? '<li><a href="' + esc(u) + '" target="_blank" rel="noopener nofollow">' + esc(l.label) + "</a></li>" : ""; }).join("");
      var more = (eng.author_articles || []).map(function (x) { return '<li><a href="' + ctx.href({ slug: x.slug }) + '">' + esc(x.title) + "</a><small>" + esc(x.read_min) + " menit baca</small></li>"; }).join("");
      var el = $("#ai-au"); el.hidden = false;
      el.innerHTML = '<div class="ai-aup"><div class="ai-ava" aria-hidden="true">' + av + '</div><div><p class="ai-auk">Tentang penulis</p><h2 id="ai-auh">' + esc(a.name) + "</h2>" + (a.bio ? "<p>" + esc(a.bio) + "</p>" : "") + (lk ? '<ul class="ai-lks">' + lk + "</ul>" : "") + "</div></div>" +
        (more ? '<div class="ai-aum"><p class="ai-auk">Artikel lain dari penulis</p><ul>' + more + "</ul></div>" : "");
    }

    /* ---------------- tindakan: suka, simpan, feedback ---------------- */
    $("#ai-like").addEventListener("click", function () {
      if (!eng || busy) return; var was = eng.liked, n = eng.likes; eng.liked = !was; eng.likes = n + (was ? -1 : 1); paintStats(); var b = this; b.classList.remove("pop"); void b.offsetWidth; if (eng.liked) b.classList.add("pop");
      rpc("article_like_toggle", { p_slug: slug, p_lang: lang, p_anon: anon }).then(function (r) {
        var x = r.data; if (r.error || !x || !x.ok) { eng.liked = was; eng.likes = n; paintStats(); say(errMsg(x && x.error), true); return; } eng.liked = x.liked; eng.likes = Number(x.likes); paintStats();
      });
    });
    $("#ai-save").addEventListener("click", function () {
      if (!eng) return; if (!user) { say("Masuk untuk menyimpan artikel."); setTimeout(function () { location.href = loginUrl.replace("#komentar", ""); }, 900); return; }
      var want = !eng.saved; eng.saved = want; paintStats();
      rpc("article_save_set", { p_slug: slug, p_lang: lang, p_saved: want }).then(function (r) {
        var x = r.data; if (r.error || !x || !x.ok) { eng.saved = !want; paintStats(); say(errMsg(x && x.error), true); return; }
        say(want ? "Disimpan. Lihat di Dashboard › Disimpan." : "Dihapus dari simpanan.");
      });
    });
    $("#ai-fb").addEventListener("click", function (e) {
      var b = e.target.closest("[data-v]"); if (!b || !eng) return; var v = b.getAttribute("data-v"), prev = eng.feedback; eng.feedback = v; paintStats();
      rpc("article_feedback_set", { p_slug: slug, p_value: v, p_lang: lang, p_anon: anon }).then(function (r) {
        var x = r.data; if (r.error || !x || !x.ok) { eng.feedback = prev; paintStats(); if (!prev) $("#ai-fbm").textContent = ""; say(errMsg(x && x.error), true); }
      });
    });
    $("#ai-cj").addEventListener("click", function (e) { var t = $("#komentar"); if (t) { e.preventDefault(); t.scrollIntoView({ behavior: "smooth", block: "start" }); } });

    /* ---------------- komentar ---------------- */
    function formHtml(opts) {
      opts = opts || {}; var id = opts.id || "main", guest = !user;
      return '<form class="ai-f' + (opts.reply ? " ai-fr" : "") + '" data-f="' + id + '" novalidate>' +
        (guest ? '<label class="ai-lbl" for="ai-n-' + id + '">Nama</label><input class="ai-in" id="ai-n-' + id + '" name="n" maxlength="40" autocomplete="nickname" required>' : "") +
        '<label class="ai-lbl" for="ai-t-' + id + '">' + (opts.reply ? "Balasan Anda" : "Tulis komentar") + '</label><textarea class="ai-in" id="ai-t-' + id + '" name="t" rows="' + (opts.reply ? 3 : 4) + '" maxlength="2000" required placeholder="' + (opts.reply ? "Tulis balasan…" : "Bagikan pendapat atau pengalaman Anda…") + '">' + esc(opts.text || "") + "</textarea>" +
        '<input class="ai-hp" name="hp" tabindex="-1" autocomplete="off" aria-hidden="true">' +
        '<div class="ai-fr2"><span class="ai-cn" aria-live="polite"><span data-n>0</span>/2000</span><span class="ai-fm" role="status"></span>' + (opts.reply ? '<button type="button" class="ai-ghost" data-cancel>Batal</button>' : "") +
        '<button class="ai-send" type="submit">' + (opts.edit ? "Simpan" : "Kirim") + "</button></div></form>";
    }
    function paintForm() {
      var box = $("#ai-form"); if (!eng) return;
      if (!eng.comments_open) { box.innerHTML = '<p class="ai-note">Komentar untuk artikel ini ditutup.</p>'; return; }
      if (!user && !eng.guest_comments) { box.innerHTML = '<p class="ai-note"><a href="' + esc(loginUrl) + '">Masuk</a> atau <a href="/daftar?next=' + encodeURIComponent(location.pathname + "#komentar") + '">daftar</a> untuk ikut berkomentar.</p>'; return; }
      box.innerHTML = formHtml({ id: "main" }) + (!user ? '<p class="ai-note ai-sm">Komentar tamu ditinjau moderator sebelum tampil.</p>' : "");
    }
    function itemHtml(it, isReply, parentId) {
      var nm = esc(it.name || "Pengguna"), pend = it.status === "pending";
      var h = '<article class="ai-c' + (isReply ? " ai-rp" : "") + (it.deleted ? " ai-del" : "") + '" id="c-' + esc(it.id) + '" data-id="' + esc(it.id) + '"' + (isReply ? ' data-p="' + esc(parentId) + '"' : "") + ">";
      h += '<div class="ai-av" aria-hidden="true">' + esc((it.name || "?").charAt(0).toUpperCase()) + '</div><div class="ai-cb">';
      if (it.deleted) return h + '<p class="ai-dl">Komentar ini telah dihapus.</p>' + (isReply ? "" : '<div class="ai-rs" data-rs></div>') + "</div></article>";
      h += '<header><b class="ai-nm">' + nm + "</b>" + (it.team ? '<span class="ai-tag">Tim</span>' : "") + (it.guest && !it.team ? '<span class="ai-tag ai-tg">Tamu</span>' : "") + '<time datetime="' + esc(it.created_at) + '">' + esc(ago(it.created_at)) + "</time>" + (it.edited_at ? "<small>diedit</small>" : "") + (pend ? '<span class="ai-tag ai-wt">Menunggu persetujuan</span>' : "") + "</header>";
      h += "<p class=\"ai-tx\">" + (it.reply_to ? '<span class="ai-to">@' + esc(it.reply_to) + "</span> " : "") + esc(it.body) + "</p>";
      h += '<footer>' + (pend ? "" : '<button type="button" class="ai-ca ai-cl' + (it.liked ? " on" : "") + '" data-a="like" aria-pressed="' + (it.liked ? "true" : "false") + '" aria-label="Suka komentar ' + nm + '">' + ico("heart", 15) + '<b>' + (it.likes || 0) + "</b></button>") +
        (pend ? "" : '<button type="button" class="ai-ca" data-a="reply">Balas</button>') +
        (it.mine ? '<button type="button" class="ai-ca" data-a="edit">Edit</button><button type="button" class="ai-ca" data-a="del">Hapus</button>' : (pend ? "" : '<button type="button" class="ai-ca ai-rep" data-a="report" aria-label="Laporkan komentar">' + ico("flag", 14) + "</button>")) + "</footer>";
      if (!isReply) h += '<div class="ai-rs" data-rs>' + (it.replies || []).map(function (r) { return itemHtml(r, true, it.id); }).join("") + "</div>";
      return h + "</div></article>";
    }
    var cache = {};
    function paintList(items, append) {
      var list = $("#ai-list"); items.forEach(function (it) { cache[it.id] = it; (it.replies || []).forEach(function (r) { cache[r.id] = r; }); });
      var html = items.map(function (it) { return itemHtml(it, false); }).join("");
      if (append) list.insertAdjacentHTML("beforeend", html); else list.innerHTML = html || (eng && eng.comments_open ? '<p class="ai-empty">Belum ada komentar. Jadilah yang pertama menulis.</p>' : "");
      list.setAttribute("aria-busy", "false"); $("#ai-more").hidden = loaded >= total;
    }
    function loadComments(reset) {
      if (busy) return; busy = true; var lim = PAGE, off = reset ? 0 : loaded, keep = reset && loaded > PAGE ? Math.min(30, loaded) : PAGE; if (reset) { lim = keep; $("#ai-list").setAttribute("aria-busy", "true"); }
      rpc("article_comments_list", { p_slug: slug, p_lang: lang, p_sort: sort, p_limit: lim, p_offset: off, p_anon: anon }).then(function (r) {
        busy = false; var x = r.data;
        if (r.error || !x) { var l = $("#ai-list"); l.setAttribute("aria-busy", "false"); if (reset || !loaded) l.innerHTML = '<div class="ai-err" role="alert">Komentar belum bisa dimuat. <button type="button" class="ai-ghost" id="ai-retry">Coba lagi</button></div>'; else say("Gagal memuat komentar.", true); return; }
        var items = x.items || []; total = Number(x.total) || 0; loaded = (reset ? 0 : loaded) + items.length; paintList(items, !reset);
      });
    }
    $("#ai-sort").addEventListener("change", function () { sort = this.value; loaded = 0; loadComments(true); });
    $("#ai-more").addEventListener("click", function () { loadComments(false); });
    root.addEventListener("click", function (e) { if (e.target.id === "ai-retry") { loaded = 0; loadComments(true); } });

    root.addEventListener("input", function (e) { var t = e.target; if (t.name === "t") { var n = t.closest("form").querySelector("[data-n]"); n.textContent = t.value.length; n.parentNode.classList.toggle("bad", t.value.length > 1900); } });
    root.addEventListener("submit", function (e) {
      var f = e.target.closest("form[data-f]"); if (!f) return; e.preventDefault();
      var t = f.elements.t.value.trim(), nm = f.elements.n ? f.elements.n.value.trim() : null, hp = f.elements.hp.value, fm = $(".ai-fm", f), btn = $(".ai-send", f), fid = f.getAttribute("data-f");
      var fail = function (m) { fm.textContent = m; fm.className = "ai-fm bad"; };
      if (nm !== null && (nm.length < 2 || nm.length > 40)) return fail("Nama 2–40 karakter."); if (t.length < 2) return fail("Komentar terlalu pendek."); if (t.length > 2000) return fail("Komentar terlalu panjang.");
      btn.disabled = true; btn.classList.add("ld"); fm.textContent = ""; var done = function () { btn.disabled = false; btn.classList.remove("ld"); };
      if (fid.indexOf("e-") === 0) { /* edit */
        rpc("article_comment_edit", { p_id: fid.slice(2), p_body: t, p_anon: anon }).then(function (r) { done(); var x = r.data; if (r.error || !x || !x.ok) return fail(errMsg(x && x.error)); say(x.status === "pending" ? "Perubahan tersimpan, menunggu persetujuan moderator." : "Komentar diperbarui."); loadComments(true); });
        return;
      }
      var parent = fid.indexOf("r-") === 0 ? fid.slice(2) : null;
      rpc("article_comment_add", { p_slug: slug, p_body: t, p_lang: lang, p_parent: parent, p_guest_name: nm, p_anon: anon, p_hp: hp }).then(function (r) {
        done(); var x = r.data; if (r.error || !x || !x.ok) return fail(errMsg(x && x.error));
        f.elements.t.value = ""; var cn = $("[data-n]", f); if (cn) cn.textContent = "0";
        if (parent) f.remove();
        if (x.status === "approved") { say("Komentar terkirim."); if (eng) eng.comments++; paintStats(); } else if (x.status === "spam") say("Komentar Anda ditandai untuk ditinjau."); else say("Komentar terkirim dan menunggu persetujuan moderator.");
        loaded = 0; loadComments(true);
      });
    });
    root.addEventListener("click", function (e) {
      var b = e.target.closest("[data-a],[data-cancel]"); if (!b) return;
      if (b.hasAttribute("data-cancel")) { b.closest("form").remove(); return; }
      var art = b.closest(".ai-c"), id = art.getAttribute("data-id"), a = b.getAttribute("data-a"), it = cache[id] || {};
      if (a === "like") {
        if (b.disabled) return; var was = b.classList.contains("on"), cnt = b.querySelector("b"), n = Number(cnt.textContent) || 0; b.classList.toggle("on", !was); b.setAttribute("aria-pressed", was ? "false" : "true"); cnt.textContent = n + (was ? -1 : 1); if (!was) { b.classList.remove("pop"); void b.offsetWidth; b.classList.add("pop"); }
        rpc("comment_like_toggle", { p_id: id, p_anon: anon }).then(function (r) { var x = r.data; if (r.error || !x || !x.ok) { b.classList.toggle("on", was); b.setAttribute("aria-pressed", was ? "true" : "false"); cnt.textContent = n; say(errMsg(x && x.error), true); return; } b.classList.toggle("on", !!x.liked); cnt.textContent = x.likes; cache[id] && (cache[id].likes = x.likes); });
      } else if (a === "reply") {
        if (!eng.comments_open) return say("Komentar untuk artikel ini ditutup.", true);
        if (!user && !eng.guest_comments) { say("Masuk untuk membalas."); setTimeout(function () { location.href = loginUrl; }, 900); return; }
        var ex = art.querySelector(":scope > .ai-cb > form, :scope > .ai-cb > .ai-fwrap"); if (ex) { ex.remove(); return; }
        var host = art.querySelector(":scope > .ai-cb"), w = d.createElement("div"); w.className = "ai-fwrap"; w.innerHTML = formHtml({ id: "r-" + id, reply: true }); host.insertBefore(w, art.classList.contains("ai-rp") ? null : host.querySelector("[data-rs]")); var ta = w.querySelector("textarea"); ta.focus();
        if (art.classList.contains("ai-rp")) ta.value = ""; w.querySelector("[data-cancel]").onclick = function () { w.remove(); };
      } else if (a === "edit") {
        var tx = art.querySelector(".ai-tx"), w2 = d.createElement("div"); w2.className = "ai-fwrap"; w2.innerHTML = formHtml({ id: "e-" + id, reply: true, edit: true, text: it.body }); tx.replaceWith(w2); w2.querySelector("textarea").focus(); w2.querySelector("[data-cancel]").onclick = function () { loaded = 0; loadComments(true); };
      } else if (a === "del") {
        if (!confirm("Hapus komentar ini?")) return;
        rpc("article_comment_delete", { p_id: id, p_anon: anon }).then(function (r) { var x = r.data; if (r.error || !x || !x.ok) return say(errMsg(x && x.error), true); say("Komentar dihapus."); if (eng && eng.comments > 0) eng.comments--; paintStats(); loaded = 0; loadComments(true); });
      } else if (a === "report") {
        var why = prompt("Kenapa komentar ini perlu ditinjau? (spam, menyinggung, dll.)"); if (why === null) return;
        rpc("comment_report", { p_id: id, p_reason: why, p_anon: anon }).then(function (r) { var x = r.data; if (r.error || !x || !x.ok) return say(errMsg(x && x.error), true); say("Terima kasih, laporan Anda kami tinjau."); });
      }
    });

    /* ---------------- mulai: sesi, ringkasan, jumlah dibaca, komentar ---------------- */
    var sess = sb.auth && sb.auth.getSession ? Promise.resolve(sb.auth.getSession()).then(function (r) { return (r && r.data && r.data.session) || null; }, function () { return null; }) : Promise.resolve(null);
    sess.then(function (s) {
      user = s ? s.user : null;
      return rpc("article_engagement", { p_slug: slug, p_lang: lang, p_anon: anon });
    }).then(function (r) {
      if (r.error || !r.data) { $("#ai-act").hidden = true; $("#ai-fb").hidden = true; $("#komentar").hidden = true; $("#ai-list").setAttribute("aria-busy", "false"); return; }
      eng = r.data; eng.comments = Number(eng.comments) || 0; eng.likes = Number(eng.likes) || 0; paintStats(); paintAuthor(); paintForm(); loadComments(true);
      rpc("article_track_view", { p_slug: slug, p_lang: lang, p_anon: anon }).then(function (v) { if (typeof v.data === "number" || /^\d+$/.test(String(v.data))) { eng.views = Number(v.data); paintStats(); } });
      if (location.hash === "#komentar") setTimeout(function () { var t = $("#komentar"); t && t.scrollIntoView(); }, 400);
    });
  }
  window.NMInteract = { mount: mount };
})();
