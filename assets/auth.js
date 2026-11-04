(function () {
  var d = document, $ = function (s) { return d.querySelector(s); };
  var C = window.NM_CONFIG || {};
  var configured = !!(C.SUPABASE_URL && C.SUPABASE_ANON_KEY && window.supabase);
  var sb = configured ? window.supabase.createClient(C.SUPABASE_URL, C.SUPABASE_ANON_KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }) : null;
  var SITE = (C.SITE_URL || location.origin).replace(/\/$/, "");
  var EVL = { pernikahan: "Pernikahan", ulangtahun: "Ulang Tahun", wisuda: "Wisuda", seminar: "Seminar & Workshop", corporate: "Corporate Event", lainnya: "Lainnya" };
  var TPL = { "romantic-garden": "Romantic Garden", "jawa-tengah": "Adat Jawa Tengah" };
  var PLAN = { essential: "Essential", signature: "Signature", luxe: "Luxe" };

  function msg(text, kind) { var m = $("#msg"); if (!m) return; m.hidden = !text; m.className = "msg " + (kind === "o" ? "o" : "e"); m.textContent = text || ""; }
  function fieldErr(id, text) { var e = d.querySelector('[data-for="' + id + '"]'), i = d.getElementById(id); if (e) e.textContent = text || ""; if (i) i.setAttribute("aria-invalid", text ? "true" : "false"); }
  function busy(on, label) { var b = $("#go"); if (!b) return; b.disabled = on; if (label) b.textContent = on ? "Memproses..." : label; }
  function nextPath() { var n = new URLSearchParams(location.search).get("next"); return n && /^\/[a-z0-9\-\/]*$/i.test(n) ? n : "/akun"; }
  function friendly(err) {
    var m = (err && err.message || "").toLowerCase();
    if (m.indexOf("invalid login") > -1) return "Email atau kata sandi salah.";
    if (m.indexOf("email not confirmed") > -1) return "Email belum diverifikasi. Cek kotak masuk Anda untuk tautan verifikasi.";
    if (m.indexOf("already registered") > -1 || m.indexOf("already been registered") > -1) return "Email ini sudah terdaftar. Silakan masuk.";
    if (m.indexOf("rate limit") > -1 || m.indexOf("too many") > -1 || m.indexOf("after") > -1) return "Terlalu banyak percobaan. Coba lagi beberapa menit lagi.";
    if (m.indexOf("password") > -1) return "Kata sandi belum memenuhi syarat. Gunakan minimal 8 karakter dengan huruf dan angka.";
    if (m.indexOf("fetch") > -1 || m.indexOf("network") > -1) return "Tidak bisa terhubung. Periksa koneksi internet Anda.";
    return "Terjadi kendala. Coba lagi sebentar lagi.";
  }
  function notReady() { msg("Sistem akun belum dikonfigurasi. Isi SUPABASE_URL dan SUPABASE_ANON_KEY di assets/config.js (lihat README).", "e"); }

  var emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  function strength(p) { var s = 0; if (p.length >= 8) s++; if (p.length >= 12) s++; if (/[a-z]/i.test(p) && /\d/.test(p)) s++; if (/[^a-z0-9]/i.test(p) && p.length >= 8) s++; return s; }
  function pwOk(p) { return p.length >= 8 && /[a-z]/i.test(p) && /\d/.test(p); }
  function normWa(v) { v = (v || "").replace(/[\s\-().]/g, ""); if (!v) return ""; if (v.indexOf("+") === 0) return v; if (v.indexOf("0") === 0) return "+62" + v.slice(1); if (v.indexOf("62") === 0) return "+" + v; return v; }

  // tampilkan/sembunyikan kata sandi + meter
  d.querySelectorAll("[data-toggle]").forEach(function (b) {
    b.addEventListener("click", function () { var i = d.getElementById(b.dataset.toggle), s = i.type === "password"; i.type = s ? "text" : "password"; b.textContent = s ? "Sembunyi" : "Lihat"; b.setAttribute("aria-label", s ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"); });
  });
  var meter = $("#meter"), pwi = $("#pw");
  if (meter && pwi) pwi.addEventListener("input", function () { var s = strength(pwi.value); meter.style.width = (s * 25) + "%"; meter.style.background = ["#b3261e", "#b3261e", "#c77a00", "#2e7d32", "#2e7d32"][s]; });

  var form = d.querySelector("form[data-form]"), kind = form && form.dataset.form;

  // pilihan dari landing page (?acara=&template=&paket=)
  var q = new URLSearchParams(location.search), pick = { ev: q.get("acara"), tpl: q.get("template"), plan: q.get("paket") };
  if (!EVL[pick.ev]) pick.ev = ""; if (!TPL[pick.tpl]) pick.tpl = ""; if (!PLAN[pick.plan]) pick.plan = "";
  var pk = $("#pick");
  if (pk && (pick.ev || pick.tpl || pick.plan)) { pk.hidden = false; pk.innerHTML = "<b>Pilihan Anda</b><br>" + (pick.ev ? "Acara: " + EVL[pick.ev] + "<br>" : "") + (pick.tpl ? "Template: " + TPL[pick.tpl] + "<br>" : "") + (pick.plan ? "Paket: " + PLAN[pick.plan] : ""); }

  if (kind) form.addEventListener("submit", function (e) {
    e.preventDefault(); msg("");
    ["name", "email", "wa", "pw", "terms"].forEach(function (k) { fieldErr(k, ""); });
    var v = function (id) { var i = d.getElementById(id); return i ? i.value.trim() : ""; };
    if (!sb) return notReady();
    if (kind === "register") {
      var ok = true;
      if (v("website")) return; // honeypot terisi: kemungkinan bot, abaikan diam-diam
      if (v("name").length < 2) { fieldErr("name", "Isi nama lengkap Anda."); ok = false; }
      if (!emailRe.test(v("email"))) { fieldErr("email", "Format email belum benar."); ok = false; }
      var wa = normWa(v("wa")); if (wa && !/^\+[0-9]{8,15}$/.test(wa)) { fieldErr("wa", "Nomor WhatsApp belum benar."); ok = false; }
      if (!pwOk(pwi.value)) { fieldErr("pw", "Minimal 8 karakter, campur huruf dan angka."); ok = false; }
      if (!$("#terms").checked) { fieldErr("terms", "Anda perlu menyetujui syarat dan kebijakan."); ok = false; }
      if (!ok) return;
      busy(true);
      sb.auth.signUp({ email: v("email"), password: pwi.value, options: { emailRedirectTo: SITE + "/masuk", data: { full_name: v("name"), whatsapp: wa, event_type: pick.ev, template_id: pick.tpl, plan: pick.plan, terms: "true" } } })
        .then(function (r) {
          if (r.error) { busy(false, "Daftar"); return msg(friendly(r.error)); }
          // email sudah terdaftar: Supabase mengembalikan user tanpa identities (tidak membocorkan keberadaan akun)
          form.hidden = true;
          msg("Pendaftaran hampir selesai. Jika email ini belum terdaftar, kami telah mengirim tautan verifikasi ke " + v("email") + ". Periksa juga folder spam. Jika sudah punya akun, silakan masuk.", "o");
        }, function (er) { busy(false, "Daftar"); msg(friendly(er)); });
    } else if (kind === "login") {
      var ok2 = true;
      if (!emailRe.test(v("email"))) { fieldErr("email", "Format email belum benar."); ok2 = false; }
      if (!pwi.value) { fieldErr("pw", "Isi kata sandi."); ok2 = false; }
      if (!ok2) return;
      busy(true);
      sb.auth.signInWithPassword({ email: v("email"), password: pwi.value }).then(function (r) {
        if (r.error) { busy(false, "Masuk"); return msg(friendly(r.error)); }
        location.href = nextPath();
      }, function (er) { busy(false, "Masuk"); msg(friendly(er)); });
    } else if (kind === "forgot") {
      if (!emailRe.test(v("email"))) return fieldErr("email", "Format email belum benar.");
      busy(true);
      sb.auth.resetPasswordForEmail(v("email"), { redirectTo: SITE + "/atur-password" }).then(function () {
        busy(false, "Kirim tautan"); // pesan sama baik akun ada maupun tidak
        msg("Jika email terdaftar, tautan untuk mengatur ulang kata sandi sudah dikirim.", "o");
      }, function (er) { busy(false, "Kirim tautan"); msg(friendly(er)); });
    } else if (kind === "reset") {
      if (!pwOk(pwi.value)) return fieldErr("pw", "Minimal 8 karakter, campur huruf dan angka.");
      busy(true);
      sb.auth.updateUser({ password: pwi.value }).then(function (r) {
        if (r.error) { busy(false, "Simpan kata sandi"); return msg(friendly(r.error)); }
        form.hidden = true; msg("Kata sandi diperbarui. Mengalihkan ke halaman akun...", "o"); setTimeout(function () { location.href = "/akun"; }, 1200);
      }, function (er) { busy(false, "Simpan kata sandi"); msg(friendly(er)); });
    }
  });

  // halaman akun
  if ($("#hi")) {
    if (!sb) { $("#hi").textContent = ""; notReady(); return; }
    sb.auth.getSession().then(function (r) {
      var s = r.data && r.data.session;
      if (!s) { location.replace("/masuk?next=/akun"); return; }
      sb.from("profiles").select("full_name,whatsapp,event_type,template_id,plan").eq("id", s.user.id).maybeSingle().then(function (p) {
        var pr = p.data || {}, w = $("#who"), rows = [["Email", s.user.email], ["Nama", pr.full_name || "-"], ["WhatsApp", pr.whatsapp || "-"]];
        if (pr.event_type) rows.push(["Acara", EVL[pr.event_type] || pr.event_type]);
        if (pr.template_id) rows.push(["Template", TPL[pr.template_id] || pr.template_id]);
        if (pr.plan) rows.push(["Paket", PLAN[pr.plan]]);
        $("#hi").textContent = "Halo, " + (pr.full_name || "pengguna") + ". Akun Anda aktif.";
        w.innerHTML = ""; rows.forEach(function (x) { var dv = d.createElement("div"), a = d.createElement("span"), b = d.createElement("b"); a.textContent = x[0]; b.textContent = x[1]; dv.appendChild(a); dv.appendChild(b); w.appendChild(dv); }); w.hidden = false;
      });
    });
    $("#logout").addEventListener("click", function () { sb.auth.signOut().then(function () { location.href = "/masuk"; }); });
  }
  // halaman atur-password: tautan dari email membuat sesi pemulihan otomatis
  if (kind === "reset" && sb) sb.auth.getSession().then(function (r) { if (!r.data.session) msg("Tautan tidak valid atau sudah kedaluwarsa. Minta tautan baru dari halaman Lupa kata sandi.", "e"); });
})();
