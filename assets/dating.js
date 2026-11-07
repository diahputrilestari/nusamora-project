/* Cari Teman Kondangan (P0). Semua operasi sensitif divalidasi di server (RPC security definer + RLS).
   Klien hanya menampilkan. Semua teks pengguna dirender dengan textContent (tanpa innerHTML) agar aman dari XSS. */
(function () {
  "use strict";
  var d = document, C = window.NM_CONFIG || {};
  var sb = (C.SUPABASE_URL && C.SUPABASE_ANON_KEY && window.supabase) ? window.supabase.createClient(C.SUPABASE_URL, C.SUPABASE_ANON_KEY, { auth: { persistSession: true, autoRefreshToken: true } }) : null;
  var UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  var qe = new URLSearchParams(location.search).get("e");
  var EV = qe && UUID.test(qe) ? qe.toLowerCase() : null;
  var NS = "http://www.w3.org/2000/svg";
  var app = d.getElementById("app"), nav = d.getElementById("dt-nav"), badge = d.getElementById("dt-badge");
  var S = { user: null, consent: false, profile: null, part: null, avatars: null, filter: {}, online: {}, matches: [], chan: null, pres: null, poll: null };
  var REDUCED = matchMedia("(prefers-reduced-motion:reduce)").matches;

  var ERR = { persetujuan_wajib: "Anda perlu menyetujui syarat terlebih dahulu.", profil_wajib: "Lengkapi profil Anda dulu.", usia_minimal_18: "Fitur ini hanya untuk usia 18 tahun ke atas.",
    acara_tidak_tersedia: "Cari Teman belum aktif untuk acara ini.", bukan_peserta: "Anda belum menjadi peserta aktif di acara ini.", target_tidak_tersedia: "Profil ini sudah tidak tersedia.",
    target_tidak_valid: "Tindakan tidak valid.", percakapan_ditutup: "Percakapan ini sudah ditutup.", pesan_tidak_valid: "Pesan kosong atau terlalu panjang (maks. 1000 karakter).",
    tidak_ditemukan: "Data tidak ditemukan.", avatar_tidak_valid: "Avatar tidak valid.", nama_panggilan_tidak_valid: "Nama panggilan 2 sampai 30 karakter.", kota_tidak_valid: "Isi kota domisili.",
    tanggal_lahir_wajib: "Isi tanggal lahir.", tanggal_lahir_tidak_valid: "Tanggal lahir tidak valid.", gender_tidak_valid: "Pilih gender.", tujuan_tidak_valid: "Pilih tujuan perkenalan.",
    dinonaktifkan_admin: "Fitur ini dinonaktifkan oleh admin NusaMora untuk acara tersebut.", akses_ditangguhkan: "Akses Anda ditangguhkan.", alasan_tidak_valid: "Pilih alasan laporan.",
    batas_like_harian: "Batas like harian tercapai. Coba lagi besok.", terlalu_cepat: "Terlalu cepat. Coba lagi sebentar lagi.", terlalu_banyak_permintaan: "Terlalu cepat. Coba lagi sebentar lagi.", akun_ditangguhkan: "Akun Anda ditangguhkan.", unauthorized: "Sesi berakhir. Silakan masuk lagi.", forbidden: "Anda tidak berhak melakukan ini.", tidak_diizinkan: "Anda tidak berhak melakukan ini.", status_tidak_valid: "Status tidak valid.", persetujuan_lengkap_wajib: "Centang ketiga persetujuan untuk melanjutkan.",
    tidak_berwenang: "Hanya pemilik undangan Luxe yang dapat mengaktifkan fitur ini." };
  ERR.acara_tidak_tersedia = "Cari Teman belum aktif untuk acara ini."; ERR.forbidden = ERR.tidak_diizinkan = "Hanya pemilik undangan Luxe yang dapat mengaktifkan fitur ini.";
  function friendly(e) {
    var m = String((e && (e.message || e.details)) || "").toLowerCase();
    for (var k in ERR) if (m.indexOf(k) > -1) return ERR[k];
    if (m.indexOf("rate") > -1 || m.indexOf("limit") > -1 || m.indexOf("too many") > -1) return ERR.terlalu_cepat;
    if (m.indexOf("fetch") > -1 || m.indexOf("network") > -1) return "Tidak bisa terhubung. Periksa koneksi Anda.";
    if (m.indexOf("jwt") > -1 || m.indexOf("not authenticated") > -1 || m.indexOf("login") > -1) return "Sesi berakhir. Silakan masuk lagi.";
    return "Terjadi kendala. Coba lagi sebentar lagi.";
  }

  /* ---------- helper DOM aman ---------- */
  function h(tag, props, kids) {
    var e = d.createElement(tag);
    if (props) Object.keys(props).forEach(function (k) {
      var v = props[k]; if (v === null || v === undefined || v === false) return;
      if (k === "class") e.className = v; else if (k === "text") e.textContent = v;
      else if (k.slice(0, 2) === "on") e.addEventListener(k.slice(2), v);
      else if (k === "html") return; else e.setAttribute(k, v === true ? "" : v);
    });
    (kids || []).forEach(function (c) { if (c === null || c === undefined || c === false) return; e.appendChild(typeof c === "string" ? d.createTextNode(c) : c); });
    return e;
  }
  function clear(n) { while (n.firstChild) n.removeChild(n.firstChild); return n; }
  function safeUrl(u) { u = String(u || ""); return /^https:\/\//i.test(u) ? u : ""; }
  function heart(sz) { var s = d.createElementNS(NS, "svg"); s.setAttribute("viewBox", "0 0 24 24"); s.setAttribute("aria-hidden", "true"); if (sz) { s.style.width = s.style.height = sz; }
    var p = d.createElementNS(NS, "path"); p.setAttribute("d", "M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"); p.setAttribute("fill", "currentColor"); s.appendChild(p); return s; }
  function avatar(url, name, cls) {
    var u = safeUrl(url), box = h("span", { class: cls || "" });
    if (u) box.appendChild(h("img", { src: u, alt: "Avatar " + (name || ""), loading: "lazy", decoding: "async", referrerpolicy: "no-referrer" }));
    else box.appendChild(h("span", { class: "dt-ph", "aria-hidden": "true", text: (name || "?").trim().charAt(0).toUpperCase() }));
    return box;
  }
  var toastT;
  function toast(t, err) { var n = d.getElementById("dt-toast"); n.textContent = t; n.className = "dt-toast" + (err ? " err" : ""); n.hidden = false; clearTimeout(toastT); toastT = setTimeout(function () { n.hidden = true; }, 4200); }
  function busy(btn, on, label) { if (!btn) return; btn.disabled = on; if (label !== undefined) btn.textContent = on ? "Memproses..." : label; }
  function hm(ts) { try { return new Date(ts).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }).replace(":", "."); } catch (e) { return ""; } }
  function ageFrom(iso) { var b = new Date(iso), t = new Date(), a = t.getFullYear() - b.getFullYear(), m = t.getMonth() - b.getMonth(); if (m < 0 || (m === 0 && t.getDate() < b.getDate())) a--; return a; }

  /* ---------- dialog ---------- */
  var dlg = d.getElementById("dt-dlg"), dbody = d.getElementById("dt-dlg-body");
  function openDlg(node) { clear(dbody).appendChild(node); if (!dlg.open) { if (dlg.showModal) dlg.showModal(); else dlg.setAttribute("open", ""); } }
  function closeDlg() { if (dlg.open) dlg.close(); }
  dlg.addEventListener("click", function (e) { if (e.target === dlg) closeDlg(); });
  function closeBtn() { return h("button", { class: "x", type: "button", "aria-label": "Tutup", text: "×", onclick: closeDlg }); }
  function confirmDlg(title, text, label, danger) {
    return new Promise(function (res) {
      var ok = h("button", { class: "btn" + (danger ? " danger" : ""), type: "button", text: label });
      var no = h("button", { class: "btn o", type: "button", text: "Batal" });
      var done = function (v) { dlg.removeEventListener("close", onc); closeDlg(); res(v); }, onc = function () { res(false); };
      ok.onclick = function () { dlg.removeEventListener("close", onc); closeDlg(); res(true); }; no.onclick = function () { done(false); };
      dlg.addEventListener("close", onc, { once: true });
      openDlg(h("div", { class: "box" }, [h("h2", { id: "dt-dlg-t", text: title }), h("p", { class: "dt-sub", text: text }), h("div", { class: "two" }, [no, ok])]));
    });
  }

  /* ---------- data ---------- */
  function rpc(name, args) { return sb.rpc(name, args || {}).then(function (r) { if (r.error) throw r.error; return r.data; }); }
  function loadMe() {
    return sb.auth.getSession().then(function (r) {
      S.user = r.data && r.data.session ? r.data.session.user : null;
      if (!S.user) { S.consent = false; S.profile = null; S.part = null; return; }
      return Promise.all([
        sb.from("dating_consents").select("version,withdrawn_at").is("withdrawn_at", null).limit(1),
        sb.from("dating_profiles").select("id,nickname,birth_date,gender,city,avatar_id,bio,interests,education,occupation,intent").limit(1),
        EV ? sb.from("dating_event_participants").select("status,expires_at").eq("invitation_id", EV).limit(1) : Promise.resolve({ data: [] })
      ]).then(function (a) {
        a.forEach(function (x) { if (x.error) throw x.error; });
        S.consent = !!(a[0].data && a[0].data.length); S.profile = (a[1].data || [])[0] || null; S.part = (a[2].data || [])[0] || null;
      });
    });
  }
  function loadAvatars() {
    if (S.avatars) return Promise.resolve(S.avatars);
    return sb.from("assets").select("id,name,thumbnail_url,file_url,asset_categories!inner(slug)").eq("asset_categories.slug", "guest-avatar").eq("status", "active").is("deleted_at", null).limit(60)
      .then(function (r) { if (r.error) throw r.error; S.avatars = (r.data || []).map(function (a) { return { id: a.id, name: a.name, url: a.thumbnail_url || a.file_url }; }); return S.avatars; });
  }
  function myAvatarUrl() { var a = (S.avatars || []).filter(function (x) { return S.profile && x.id === S.profile.avatar_id; })[0]; return a ? a.url : ""; }
  function isActive() { return !!(S.part && S.part.status === "aktif"); }

  /* ---------- router ---------- */
  var routes = { "": viewLanding, "profil": viewProfile, "jelajah": viewDiscover, "match": viewMatches, "chat": viewChat, "pengaturan": viewSettings };
  function route() {
    if (S.chan) { sb.removeChannel(S.chan); S.chan = null; } clearInterval(S.poll);
    var parts = (location.hash || "").replace(/^#\/?/, "").split("/"), key = parts[0] || "";
    var fn = routes[key] || viewLanding;
    nav.hidden = !(S.user && S.profile);
    Array.prototype.forEach.call(nav.querySelectorAll("a"), function (a) { a.classList.toggle("on", a.dataset.r === key); });
    clear(app).appendChild(h("div", { class: "dt-sk", "aria-hidden": "true" })); app.setAttribute("aria-busy", "true");
    Promise.resolve().then(function () { return fn(parts.slice(1)); }).catch(function (e) { showError(friendly(e), route); }).then(function () { app.removeAttribute("aria-busy"); });
  }
  function go(hash) { if (location.hash === hash) route(); else location.hash = hash; }
  function showError(text, retry) { clear(app).appendChild(h("div", { class: "dt-empty", role: "alert" }, [h("p", { text: text }), retry ? h("button", { class: "btn o", type: "button", text: "Coba lagi", onclick: retry }) : null])); }
  function guard(needActive) {
    if (!S.user) { location.href = "/masuk?next=" + encodeURIComponent("/cari-teman" + (EV ? "?e=" + EV : "")); return false; }
    if (!S.profile || (needActive && !isActive())) { go("#/profil"); return false; }
    return true;
  }

  /* ---------- 1. landing ---------- */
  function viewLanding() {
    var st = EV ? rpc("dating_stats", { p_inv: EV }).catch(function () { return null; }) : Promise.resolve(null);
    return st.then(function (s) {
      var avail = !!(s && s.available), box = clear(app);
      var cta;
      if (!EV) cta = h("p", { class: "dt-note", text: "Buka halaman ini lewat tautan Cari Teman dari undangan yang Anda terima." });
      else if (!avail) cta = h("p", { class: "dt-note", text: "Cari Teman belum diaktifkan oleh pemilik undangan ini." });
      else if (!S.user) cta = h("a", { class: "btn lg", href: "/masuk?next=" + encodeURIComponent("/cari-teman?e=" + EV), text: "Masuk untuk ikut" });
      else if (isActive()) cta = h("a", { class: "btn lg", href: "#/jelajah", text: "Mulai Jelajah" });
      else cta = h("a", { class: "btn lg", href: "#/profil", text: "Ikut Cari Teman" });
      box.appendChild(h("section", { class: "dt-hero" }, [
        h("p", { class: "dt-pill", text: "Cari Teman Kondangan" }),
        h("h1", { class: "dt-h" }, ["Datang Sendiri, ", h("em", { text: "Pulang Siapa Tahu Berdua." }), " ", heart("0.8em")]),
        h("p", { class: "dt-sub", text: "Berkenalan dengan sesama tamu undangan di acara ini. Sepenuhnya sukarela, khusus usia 18 tahun ke atas." }),
        avail ? h("p", { class: "dt-stat" }, [h("b", { id: "dt-cnt", text: String(s.active_participants || 0) }), "peserta aktif"]) : null,
        h("div", {}, [cta])
      ]));
      box.appendChild(h("div", { class: "dt-steps" }, [
        h("div", { class: "dt-card" }, [h("h3", { text: "1. Buat profil singkat" }), h("p", { text: "Nama panggilan, usia, kota, dan hobi. Tanggal lahir tidak ditampilkan, hanya usia." })]),
        h("div", { class: "dt-card" }, [h("h3", { text: "2. Like yang menarik" }), h("p", { text: "Jika saling Like, terbentuk Match dan Anda bisa mulai mengobrol." })]),
        h("div", { class: "dt-card" }, [h("h3", { text: "3. Ngobrol dengan aman" }), h("p", { text: "Chat hanya setelah Match. Anda bisa Unmatch, Blokir, atau Laporkan kapan saja." })])]));
      box.appendChild(h("p", { class: "dt-note", text: "Status \"tidak memiliki pasangan\" adalah pernyataan pengguna dan tidak diverifikasi oleh NusaMora. Email, nomor telepon, dan alamat Anda tidak pernah ditampilkan ke peserta lain." }));
    });
  }

  /* ---------- 2. persetujuan + profil ---------- */
  function viewProfile() {
    if (!S.user) return guard(false);
    return loadAvatars().then(function (avs) {
      var P = S.profile || {}, box = clear(app), msg = h("div", { class: "msg e", role: "alert", hidden: true });
      var needConsent = !S.consent;
      function fld(id, label, input, hint) { return h("div", { class: "f" }, [h("label", { for: id, text: label }), input, hint ? h("small", { text: hint }) : null, h("span", { class: "err", "data-for": id })]); }
      var nick = h("input", { id: "nick", type: "text", maxlength: "30", autocomplete: "nickname", required: true, value: P.nickname || "" });
      var bd = h("input", { id: "bd", type: "date", required: true, value: P.birth_date || "", max: new Date(Date.now() - 18 * 365.25 * 864e5).toISOString().slice(0, 10) });
      var gender = h("select", { id: "gender", required: true }, [["", "Pilih"], ["pria", "Pria"], ["wanita", "Wanita"], ["lainnya", "Lainnya"], ["tidak_menyebut", "Tidak ingin menyebut"]].map(function (o) { return h("option", { value: o[0], text: o[1], selected: P.gender === o[0] ? true : null }); }));
      var city = h("input", { id: "city", type: "text", maxlength: "60", required: true, autocomplete: "address-level2", value: P.city || "" });
      var bio = h("textarea", { id: "bio", maxlength: "300", text: P.bio || "" });
      var ints = h("input", { id: "ints", type: "text", placeholder: "traveling, kopi, musik", value: (P.interests || []).join(", ") });
      var edu = h("input", { id: "edu", type: "text", maxlength: "60", value: P.education || "" }), occ = h("input", { id: "occ", type: "text", maxlength: "60", value: P.occupation || "" });
      var intent = h("select", { id: "intent", required: true }, [["", "Pilih"], ["teman_baru", "Teman baru"], ["teman_dekat", "Teman dekat"], ["hubungan_serius", "Hubungan serius"]].map(function (o) { return h("option", { value: o[0], text: o[1], selected: P.intent === o[0] ? true : null }); }));
      var avBox = h("div", { class: "dt-avs", role: "radiogroup", "aria-label": "Pilih avatar" });
      if (!avs.length) avBox.appendChild(h("p", { class: "dt-sub", text: "Belum ada avatar tersedia. Profil tetap bisa dibuat tanpa avatar." }));
      avs.forEach(function (a) { avBox.appendChild(h("label", { class: "dt-av", title: a.name }, [h("input", { type: "radio", name: "av", value: a.id, checked: P.avatar_id === a.id ? true : null }), avatar(a.url, a.name)])); });
      var c1 = h("input", { type: "checkbox", id: "c1" }), c2 = h("input", { type: "checkbox", id: "c2" }), c3 = h("input", { type: "checkbox", id: "c3" });
      var go1 = h("button", { class: "btn lg full", type: "submit", text: P.id ? "Simpan perubahan" : "Simpan dan ikut" });
      var form = h("form", { class: "dt-form", novalidate: true }, [
        h("h1", { class: "dt-h", text: P.id ? "Edit profil" : "Buat profil" }), msg,
        needConsent ? h("div", { class: "dt-card", style: "margin-bottom:14px" }, [h("h3", { text: "Persetujuan" }),
          h("label", { class: "chk" }, [c1, h("span", { text: "Saya berusia 18 tahun atau lebih." })]),
          h("label", { class: "chk" }, [c2, h("span", { text: "Saya menyatakan sendiri bahwa saya sedang tidak memiliki pasangan. Pernyataan ini tidak diverifikasi NusaMora." })]),
          h("label", { class: "chk" }, [c3, h("span", {}, ["Saya menyetujui pemrosesan data profil saya untuk fitur ini sesuai Kebijakan Privasi. Saya bisa menghapus profil kapan saja."])]),
          h("span", { class: "err", "data-for": "consent" })]) : null,
        fld("nick", "Nama panggilan", nick),
        h("div", { class: "row" }, [fld("bd", "Tanggal lahir", bd, "Hanya usia yang ditampilkan."), fld("gender", "Gender", gender)]),
        fld("city", "Kota domisili", city, "Kota saja, bukan alamat lengkap."),
        h("div", { class: "f" }, [h("label", { text: "Avatar" }), avBox]),
        fld("bio", "Bio singkat", bio, "Maksimal 300 karakter. Jangan cantumkan nomor telepon atau alamat."),
        fld("ints", "Hobi / minat", ints, "Pisahkan dengan koma, maksimal 10."),
        h("div", { class: "row" }, [fld("edu", "Pendidikan (opsional)", edu), fld("occ", "Pekerjaan (opsional)", occ)]),
        fld("intent", "Tujuan perkenalan", intent), go1]);
      form.addEventListener("submit", function (e) {
        e.preventDefault(); msg.hidden = true;
        Array.prototype.forEach.call(form.querySelectorAll(".err"), function (x) { x.textContent = ""; });
        var bad = false; function er(id, t) { var x = form.querySelector('[data-for="' + id + '"]'); if (x) x.textContent = t; var i = d.getElementById(id); if (i) i.setAttribute("aria-invalid", "true"); bad = true; }
        if (nick.value.trim().length < 2) er("nick", "Isi nama panggilan (2 sampai 30 karakter).");
        if (!bd.value) er("bd", "Isi tanggal lahir."); else if (ageFrom(bd.value) < 18) er("bd", "Fitur ini hanya untuk usia 18 tahun ke atas.");
        if (!gender.value) er("gender", "Pilih gender."); if (city.value.trim().length < 2) er("city", "Isi kota domisili."); if (!intent.value) er("intent", "Pilih tujuan.");
        if (needConsent && !(c1.checked && c2.checked && c3.checked)) er("consent", "Centang ketiga persetujuan untuk melanjutkan.");
        if (bad) return;
        var av = form.querySelector('input[name="av"]:checked');
        var list = ints.value.split(",").map(function (x) { return x.trim(); }).filter(Boolean).slice(0, 10);
        busy(go1, true, "");
        var chain = needConsent ? rpc("dating_accept_consent", { p_age: true, p_single: true, p_privacy: true, p_ip_hash: null }) : Promise.resolve();
        chain.then(function () {
          return rpc("dating_upsert_profile", { p_nickname: nick.value, p_birth_date: bd.value, p_gender: gender.value, p_city: city.value, p_avatar: av ? av.value : null, p_bio: bio.value, p_interests: list, p_education: edu.value || null, p_occupation: occ.value || null, p_intent: intent.value });
        }).then(function () {
          if (EV && (!S.part || S.part.status === "keluar")) return rpc("dating_join", { p_inv: EV });
        }).then(loadMe).then(function () { toast("Profil tersimpan."); go(EV ? "#/jelajah" : "#/pengaturan"); })
          .catch(function (er2) { busy(go1, false, P.id ? "Simpan perubahan" : "Simpan dan ikut"); msg.textContent = friendly(er2); msg.hidden = false; msg.scrollIntoView({ block: "center" }); });
      });
      box.appendChild(form);
      if (!EV) box.appendChild(h("p", { class: "dt-note", text: "Anda membuka halaman tanpa tautan acara. Profil tetap tersimpan, tetapi untuk ikut Cari Teman buka tautan dari undangan." }));
    });
  }

  /* ---------- 3. discover ---------- */
  var OFFSET = 0, LOADING = false;
  function viewDiscover() {
    if (!guard(true)) return;
    return Promise.all([loadAvatars()]).then(function () {
      var box = clear(app), grid = h("div", { class: "dt-grid" }), more = h("button", { class: "btn o", type: "button", text: "Muat lagi", hidden: true }), state = h("div", { "aria-live": "polite" });
      var gSel = h("select", { id: "f-g", "aria-label": "Gender" }, [["", "Semua"], ["pria", "Pria"], ["wanita", "Wanita"], ["lainnya", "Lainnya"]].map(function (o) { return h("option", { value: o[0], text: o[1] }); }));
      var a1 = h("input", { id: "f-a1", type: "number", min: "18", max: "99", placeholder: "18" }), a2 = h("input", { id: "f-a2", type: "number", min: "18", max: "99", placeholder: "99" });
      var cty = h("input", { id: "f-c", type: "text", maxlength: "60", placeholder: "Semua kota" }), hb = h("input", { id: "f-h", type: "text", placeholder: "kopi, musik" });
      var it = h("select", { id: "f-i", "aria-label": "Tujuan" }, [["", "Semua"], ["teman_baru", "Teman baru"], ["teman_dekat", "Teman dekat"], ["hubungan_serius", "Hubungan serius"]].map(function (o) { return h("option", { value: o[0], text: o[1] }); }));
      var apply = h("button", { class: "btn sm", type: "button", text: "Terapkan" });
      function filt() { var f = {}; if (gSel.value) f.gender = [gSel.value]; if (a1.value) f.age_min = +a1.value; if (a2.value) f.age_max = +a2.value; if (cty.value.trim()) f.city = cty.value.trim();
        var hs = hb.value.split(",").map(function (x) { return x.trim(); }).filter(Boolean); if (hs.length) f.interests = hs; if (it.value) f.intent = [it.value]; return f; }
      function lbl(t, n) { return h("label", {}, [t, n]); }
      box.appendChild(h("div", { class: "dt-bar" }, [h("h1", { class: "dt-h", style: "margin:0", text: "Jelajah" })]));
      box.appendChild(h("form", { class: "dt-filter", onsubmit: function (e) { e.preventDefault(); apply.click(); } }, [lbl("Gender", gSel), lbl("Usia dari", a1), lbl("Usia sampai", a2), lbl("Kota", cty), lbl("Hobi", hb), lbl("Tujuan", it), h("div", { style: "align-self:end" }, [apply])]));
      box.appendChild(grid); box.appendChild(state); box.appendChild(h("div", { style: "text-align:center;margin-top:18px" }, [more]));
      function load(reset) {
        if (LOADING) return; LOADING = true; if (reset) { OFFSET = 0; clear(grid); }
        clear(state).appendChild(h("p", { class: "dt-load", text: "Memuat..." })); more.hidden = true;
        rpc("dating_discover", { p_inv: EV, p_filter: filt(), p_limit: 20, p_offset: OFFSET }).then(function (rows) {
          rows = rows || []; OFFSET += rows.length; clear(state);
          rows.forEach(function (r) { grid.appendChild(card(r, grid, state)); });
          if (!grid.children.length) state.appendChild(h("div", { class: "dt-empty" }, [h("p", { text: "Belum ada profil yang cocok. Coba longgarkan filter, atau kembali lagi nanti." })]));
          more.hidden = rows.length < 20;
        }).catch(function (e) { clear(state); state.appendChild(h("div", { class: "dt-empty", role: "alert" }, [h("p", { text: friendly(e) }), h("button", { class: "btn o", type: "button", text: "Coba lagi", onclick: function () { load(true); } })])); })
          .then(function () { LOADING = false; });
      }
      apply.onclick = function () { load(true); }; more.onclick = function () { load(false); };
      load(true);
    });
  }
  function card(r, grid, state) {
    var el = h("article", { class: "dt-pc" });
    var pic = h("button", { class: "pic", type: "button", "aria-label": "Lihat profil " + r.nickname, onclick: function () { detail(r, el, grid, state); } }, [avatar(r.avatar_url, r.nickname)]);
    var ptag = h("div", { class: "dt-tags" }, (r.interests || []).slice(0, 4).map(function (x) { return h("span", { class: "dt-tag", text: x }); }));
    var like = h("button", { class: "btn like", type: "button", text: "Like" }), pass = h("button", { class: "btn o", type: "button", text: "Lewati" });
    el.appendChild(pic);
    el.appendChild(h("div", { class: "in" }, [h("h3", { text: r.nickname + ", " + r.age }), h("div", { class: "meta", text: r.city + " · " + intentTxt(r.intent) }), r.bio ? h("p", { class: "bio", text: r.bio }) : null, ptag]));
    el.appendChild(h("div", { class: "dt-act" }, [pass, like]));
    like.onclick = function () { act(el, like, pass, "dating_like", r, grid, state); }; pass.onclick = function () { act(el, like, pass, "dating_pass", r, grid, state); };
    return el;
  }
  function intentTxt(i) { return { teman_baru: "Teman baru", teman_dekat: "Teman dekat", hubungan_serius: "Hubungan serius" }[i] || ""; }
  function act(el, like, pass, fn, r, grid, state) {
    like.disabled = pass.disabled = true;
    rpc(fn, { p_inv: EV, p_to: r.profile_id }).then(function (res) {
      el.classList.add("out"); setTimeout(function () { el.remove(); if (!grid.children.length) state.appendChild(h("div", { class: "dt-empty" }, [h("p", { text: "Sudah semua. Kembali lagi nanti untuk profil baru." })])); }, REDUCED ? 0 : 300);
      if (fn === "dating_like") { if (res && res.matched && res.new_match) matchModal(r, res); else toast("Like terkirim."); }
    }).catch(function (e) { like.disabled = pass.disabled = false; toast(friendly(e), true); });
  }
  function detail(r, el, grid, state) {
    var like = h("button", { class: "btn like", type: "button", text: "Like" }), pass = h("button", { class: "btn o", type: "button", text: "Lewati" });
    like.onclick = function () { closeDlg(); el.querySelector(".like").click(); }; pass.onclick = function () { closeDlg(); el.querySelector(".dt-act .o").click(); };
    openDlg(h("div", { class: "box" }, [closeBtn(), h("div", { class: "dt-big" }, [avatar(r.avatar_url, r.nickname)]), h("h2", { id: "dt-dlg-t", text: r.nickname + ", " + r.age }),
      h("p", { class: "meta", text: r.city + " · " + intentTxt(r.intent) }), r.bio ? h("p", { text: r.bio }) : null,
      h("div", { class: "dt-tags" }, (r.interests || []).map(function (x) { return h("span", { class: "dt-tag", text: x }); })),
      r.education || r.occupation ? h("p", { class: "meta", text: [r.education, r.occupation].filter(Boolean).join(" · ") }) : null,
      h("div", { class: "two" }, [pass, like])]));
  }
  function matchModal(r, res) {
    if (!REDUCED) for (var k = 0; k < 14; k++) (function () { var s = heart("22px"); s.setAttribute("class", "dt-heart"); s.style.left = (30 + Math.random() * 40) + "vw"; s.style.top = "55vh";
      s.style.setProperty("--hx", ((Math.random() - .5) * 240) + "px"); s.style.setProperty("--hy", (-120 - Math.random() * 280) + "px"); s.style.setProperty("--hr", ((Math.random() - .5) * 90) + "deg"); d.body.appendChild(s); setTimeout(function () { s.remove(); }, 1700); })();
    var start = h("button", { class: "btn lg full", type: "button", text: "Mulai Berkenalan", onclick: function () { closeDlg(); go("#/chat/" + res.conversation_id); } });
    openDlg(h("div", { class: "box dt-match" }, [closeBtn(), h("h2", { id: "dt-dlg-t", text: "It's a Match!" }),
      h("div", { class: "dt-pair" }, [avatar(myAvatarUrl(), S.profile.nickname, "a"), h("span", { class: "hrt" }, [heart("38px")]), avatar(r.avatar_url, r.nickname, "a")]),
      h("p", { class: "dt-sub", style: "margin:0 auto", text: "Anda dan " + r.nickname + " saling menyukai." }), start,
      h("button", { class: "btn o full", type: "button", text: "Nanti saja", onclick: closeDlg })]));
  }

  /* ---------- 4. daftar match ---------- */
  function fetchMatches() { return rpc("dating_my_matches").then(function (rows) { S.matches = (rows || []).filter(function (m) { return m.status === "aktif"; }); var u = S.matches.reduce(function (n, m) { return n + (m.unread || 0); }, 0); badge.hidden = !u; badge.textContent = String(u); return S.matches; }); }
  function presence() {
    if (!EV || !S.profile || S.pres) return;
    S.pres = sb.channel("dating-presence-" + EV, { config: { presence: { key: S.profile.id } } });
    S.pres.on("presence", { event: "sync" }, function () { S.online = S.pres.presenceState(); Array.prototype.forEach.call(d.querySelectorAll("[data-pid]"), function (n) { n.hidden = !S.online[n.dataset.pid]; }); }).subscribe(function (st) { if (st === "SUBSCRIBED") S.pres.track({ t: Date.now() }); });
  }
  function viewMatches() {
    if (!guard(false)) return;
    presence();
    return Promise.all([fetchMatches(), loadAvatars()]).then(function (a) {
      var ms = a[0], box = clear(app);
      box.appendChild(h("h1", { class: "dt-h", text: "Match saya" }));
      if (!ms.length) return box.appendChild(h("div", { class: "dt-empty" }, [h("p", { text: "Belum ada match. Like beberapa profil, dan jika saling Like, obrolan akan muncul di sini." }), h("a", { class: "btn", href: "#/jelajah", text: "Jelajah profil" })]));
      var list = h("div", { class: "dt-ml" });
      ms.forEach(function (m) {
        var av = h("span", { class: "ava" }, [avatar(m.avatar_url, m.nickname), h("i", { class: "on", "data-pid": m.other_profile, hidden: !S.online[m.other_profile], title: "Online" })]);
        var last = m.last_body ? ((m.last_mine ? "Anda: " : "") + m.last_body) : "Belum ada pesan. Sapa duluan!";
        list.appendChild(h("a", { class: "dt-mi", href: "#/chat/" + m.conversation_id }, [av, h("div", {}, [h("b", { text: m.nickname + ", " + m.age }), h("small", { text: last })]), m.unread ? h("span", { class: "un", "aria-label": m.unread + " belum dibaca", text: String(m.unread) }) : h("small", { text: m.last_at ? hm(m.last_at) : "" })]));
      });
      box.appendChild(list);
    });
  }

  /* ---------- 5. chat ---------- */
  var OPENERS = ["Hai! Apa hal paling menarik dari acara ini?", "Kamu berasal dari kota mana?", "Apa hobi favoritmu?", "Lebih suka traveling atau staycation?"];
  var EMOJI = ["😊", "😄", "😍", "🥰", "😂", "👋", "❤️", "✨"];
  function viewChat(p) {
    if (!guard(false)) return;
    var cid = p[0]; if (!cid || !UUID.test(cid)) return go("#/match");
    presence();
    return Promise.all([fetchMatches(), loadAvatars()]).then(function (a) {
      var m = a[0].filter(function (x) { return x.conversation_id === cid; })[0];
      if (!m) return showError("Percakapan tidak ditemukan atau sudah ditutup.", function () { go("#/match"); });
      var box = clear(app), seen = {}, msgs = h("div", { class: "dt-msgs", role: "log", "aria-live": "polite", "aria-label": "Pesan" });
      var ta = h("textarea", { rows: "1", maxlength: "1000", placeholder: "Tulis pesan...", "aria-label": "Tulis pesan" }), send = h("button", { class: "btn", type: "button", text: "Kirim" });
      var menu = h("button", { class: "btn o sm", type: "button", "aria-haspopup": "dialog", text: "Opsi" });
      var chips = h("div", { class: "dt-chips" }, OPENERS.map(function (t) { return h("button", { type: "button", text: t, onclick: function () { ta.value = t; ta.focus(); } }); }).concat(EMOJI.map(function (e) { return h("button", { type: "button", "aria-label": "Emoji " + e, text: e, onclick: function () { ta.value += e; ta.focus(); } }); })));
      box.appendChild(h("div", { class: "dt-bar" }, [h("a", { href: "#/match", class: "btn o sm", text: "← Match" })]));
      box.appendChild(h("section", { class: "dt-chat", "aria-label": "Obrolan dengan " + m.nickname }, [
        h("div", { class: "dt-ch" }, [avatar(m.avatar_url, m.nickname, "ava"), h("h2", {}, [m.nickname + ", " + m.age, h("small", { id: "dt-on", text: S.online[m.other_profile] ? "Online" : "" })]), menu]),
        msgs, h("div", { class: "dt-comp" }, [chips, h("div", { class: "row" }, [ta, send])])]));
      function paint(rows) {
        var stick = msgs.scrollHeight - msgs.scrollTop - msgs.clientHeight < 80, fresh = false;
        rows.forEach(function (r) {
          var ex = seen[r.id];
          if (ex) { var t = ex.querySelector("time"); if (t && r.sender_profile === S.profile.id) t.textContent = hm(r.created_at) + (r.read_at ? " ✓✓" : " ✓"); return; }
          var mine = r.sender_profile === S.profile.id, sys = r.kind === "system";
          var b = h("div", { class: "dt-b " + (sys ? "sys" : mine ? "me" : "th") }, [h("span", { text: r.body }), sys ? null : h("time", { datetime: r.created_at, text: hm(r.created_at) + (mine ? (r.read_at ? " ✓✓" : " ✓") : "") })]);
          seen[r.id] = b; msgs.appendChild(b); if (!mine && !sys && !r.read_at) fresh = true;
        });
        if (stick || !msgs.dataset.init) { msgs.scrollTop = msgs.scrollHeight; msgs.dataset.init = "1"; }
        if (fresh) rpc("dating_mark_read", { p_conversation: cid }).then(fetchMatches).catch(function () {});
      }
      function refresh() { return sb.from("dating_messages").select("id,sender_profile,kind,body,created_at,read_at").eq("conversation_id", cid).order("created_at", { ascending: true }).limit(300).then(function (r) { if (r.error) throw r.error; paint(r.data || []); }); }
      refresh().catch(function (e) { toast(friendly(e), true); });
      S.chan = sb.channel("dating-chat-" + cid).on("postgres_changes", { event: "INSERT", schema: "public", table: "dating_messages", filter: "conversation_id=eq." + cid }, function () { refresh().catch(function () {}); }).subscribe();
      S.poll = setInterval(function () { refresh().catch(function () {}); var o = d.getElementById("dt-on"); if (o) o.textContent = S.online[m.other_profile] ? "Online" : ""; }, 8000);
      function doSend() {
        var t = ta.value.trim(); if (!t) return; busy(send, true, "");
        rpc("dating_send_message", { p_conversation: cid, p_body: t }).then(function () { ta.value = ""; return refresh(); }).catch(function (e) { toast(friendly(e), true); }).then(function () { busy(send, false, "Kirim"); ta.focus(); });
      }
      send.onclick = doSend; ta.addEventListener("keydown", function (e) { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); doSend(); } });
      menu.onclick = function () { chatMenu(m); };
    });
  }
  function chatMenu(m) {
    var un = h("button", { class: "btn o full", type: "button", text: "Unmatch" }), bl = h("button", { class: "btn o full", type: "button", text: "Blokir" }), rp = h("button", { class: "btn danger full", type: "button", text: "Laporkan" });
    un.onclick = function () { confirmDlg("Unmatch " + m.nickname + "?", "Obrolan akan ditutup untuk kalian berdua.", "Unmatch", true).then(function (ok) { if (ok) rpc("dating_unmatch", { p_match: m.match_id }).then(function () { toast("Unmatch berhasil."); go("#/match"); }).catch(function (e) { toast(friendly(e), true); }); }); };
    bl.onclick = function () { confirmDlg("Blokir " + m.nickname + "?", "Kalian tidak akan saling melihat atau mengirim pesan lagi.", "Blokir", true).then(function (ok) { if (ok) rpc("dating_block", { p_profile: m.other_profile }).then(function () { toast("Pengguna diblokir."); go("#/match"); }).catch(function (e) { toast(friendly(e), true); }); }); };
    rp.onclick = function () { reportDlg(m); };
    openDlg(h("div", { class: "box" }, [closeBtn(), h("h2", { id: "dt-dlg-t", text: m.nickname }), un, bl, rp]));
  }
  function reportDlg(m) {
    var reason = h("select", { id: "rp-r", "aria-label": "Alasan" }, [["", "Pilih alasan"], ["pelecehan", "Pelecehan"], ["penipuan", "Penipuan"], ["konten_tidak_pantas", "Konten tidak pantas"], ["akun_palsu", "Akun palsu"], ["di_bawah_umur", "Diduga di bawah umur"], ["spam", "Spam"], ["lainnya", "Lainnya"]].map(function (o) { return h("option", { value: o[0], text: o[1] }); }));
    var det = h("textarea", { maxlength: "500", placeholder: "Detail (opsional)", "aria-label": "Detail laporan" }), blk = h("input", { type: "checkbox", checked: true });
    var go2 = h("button", { class: "btn danger", type: "button", text: "Kirim laporan" }), err = h("p", { class: "err", role: "alert" });
    go2.onclick = function () {
      if (!reason.value) { err.textContent = "Pilih alasan laporan."; return; } busy(go2, true, "");
      rpc("dating_report", { p_inv: m.invitation_id, p_profile: m.other_profile, p_reason: reason.value, p_detail: det.value || null, p_block: blk.checked }).then(function () { closeDlg(); toast("Laporan terkirim. Tim kami akan meninjau."); if (blk.checked) go("#/match"); }).catch(function (e) { busy(go2, false, "Kirim laporan"); err.textContent = friendly(e); });
    };
    openDlg(h("div", { class: "box" }, [closeBtn(), h("h2", { id: "dt-dlg-t", text: "Laporkan " + m.nickname }), h("p", { class: "dt-sub", text: "Bukti 20 pesan terakhir disimpan untuk peninjauan moderator." }), reason, det, h("label", { class: "chk" }, [blk, h("span", { text: "Blokir pengguna ini juga" })]), err, go2]));
  }

  /* ---------- 6. pengaturan ---------- */
  function viewSettings() {
    if (!S.user) return guard(false);
    var box = clear(app); box.appendChild(h("h1", { class: "dt-h", text: "Pengaturan Cari Teman" }));
    var wrap = h("div", { class: "dt-set" }); box.appendChild(wrap);
    if (S.profile && EV) {
      var cur = S.part ? S.part.status : "keluar";
      var opts = [["aktif", "Aktif"], ["jeda", "Jeda sementara"], ["sembunyi", "Sembunyikan profil"], ["keluar", "Keluar dari acara ini"]];
      var grp = h("div", { class: "dt-opts", role: "radiogroup", "aria-label": "Status keikutsertaan" }, opts.map(function (o) {
        var i = h("input", { type: "radio", name: "st", value: o[0], checked: cur === o[0] ? true : null, disabled: cur === "ditangguhkan" ? true : null });
        i.addEventListener("change", function () { if (!S.part) { toast("Bergabung dulu lewat Edit profil.", true); return; } rpc("dating_set_status", { p_inv: EV, p_status: o[0] }).then(function () { S.part.status = o[0]; toast("Status diperbarui."); }).catch(function (e) { toast(friendly(e), true); }); });
        return h("label", { class: "dt-opt" }, [i, o[1]]); }));
      wrap.appendChild(h("div", { class: "dt-card" }, [h("h3", { text: "Status saya di acara ini" }), cur === "ditangguhkan" ? h("p", { class: "msg e", text: "Akses Anda ditangguhkan oleh moderator." }) : null, grp]));
    }
    wrap.appendChild(h("div", { class: "dt-card" }, [h("h3", { text: "Profil" }), h("p", { text: S.profile ? "Perbarui informasi profil Anda." : "Anda belum memiliki profil." }), h("div", { style: "margin-top:12px" }, [h("a", { class: "btn", href: "#/profil", text: S.profile ? "Edit profil" : "Buat profil" })])]));
    var inv = h("div", { class: "dt-card" }, [h("h3", { text: "Untuk pemilik undangan Luxe" }), h("p", { text: "Aktifkan Cari Teman untuk acara Anda, lalu bagikan tautannya ke tamu." })]);
    wrap.appendChild(inv);
    sb.from("invitations").select("id,title").order("created_at", { ascending: false }).limit(50).then(function (r) {
      if (r.error || !r.data || !r.data.length) { inv.appendChild(h("p", { class: "dt-sub", style: "margin-top:10px", text: "Tidak ada undangan di akun ini." })); return; }
      r.data.forEach(function (iv) { var row = h("div", { class: "dt-inv" }), st = h("small", { text: "..." }), b = h("button", { class: "btn o sm", type: "button", text: "..." }), cp = h("button", { class: "btn o sm", type: "button", text: "Salin tautan" });
        row.appendChild(h("div", {}, [h("b", { text: iv.title || "Undangan" }), h("br"), st])); row.appendChild(h("div", { style: "display:flex;gap:8px" }, [cp, b])); inv.appendChild(row);
        var on = false;
        function sync() { return rpc("dating_stats", { p_inv: iv.id }).then(function (s) { on = !!(s && s.available); st.textContent = on ? "Aktif. " + (s.active_participants || 0) + " peserta" : "Belum aktif"; b.textContent = on ? "Nonaktifkan" : "Aktifkan"; }).catch(function () { st.textContent = "Tidak tersedia"; }); }
        b.onclick = function () { busy(b, true, ""); rpc("dating_owner_set_event", { p_inv: iv.id, p_enabled: !on, p_like_limit: 30, p_ttl_days: 7 }).then(sync).then(function () { toast(on ? "Cari Teman diaktifkan." : "Cari Teman dinonaktifkan."); }).catch(function (e) { toast(friendly(e), true); sync(); }).then(function () { b.disabled = false; }); };
        cp.onclick = function () { var u = location.origin + "/cari-teman?e=" + iv.id; (navigator.clipboard ? navigator.clipboard.writeText(u) : Promise.reject()).then(function () { toast("Tautan disalin."); }, function () { toast(u); }); };
        sync(); });
    });
    if (S.profile) {
      var del = h("button", { class: "btn danger", type: "button", text: "Hapus profil" });
      del.onclick = function () { confirmDlg("Hapus profil?", "Profil, like, match, dan obrolan Anda akan dihapus permanen, dan persetujuan ditarik.", "Hapus permanen", true).then(function (ok) { if (ok) rpc("dating_delete_my_profile").then(loadMe).then(function () { toast("Profil dihapus."); go("#/"); }).catch(function (e) { toast(friendly(e), true); }); }); };
      wrap.appendChild(h("div", { class: "dt-card dt-danger" }, [h("h3", { text: "Zona berbahaya" }), h("p", { text: "Menghapus profil menarik persetujuan Anda dan menghapus data Cari Teman." }), h("div", { style: "margin-top:12px" }, [del])]));
    }
  }

  /* ---------- boot ---------- */
  if (!sb) { clear(app).appendChild(h("p", { class: "dt-empty", role: "alert", text: "Sistem belum dikonfigurasi." })); return; }
  addEventListener("hashchange", route);
  sb.auth.onAuthStateChange(function (ev) { if (ev === "SIGNED_OUT") { S.user = null; S.profile = null; S.part = null; nav.hidden = true; } });
  loadMe().then(function () { nav.hidden = !(S.user && S.profile); route(); }).catch(function (e) { showError(friendly(e), function () { location.reload(); }); });
})();
