(function () {
  "use strict";
  var d = document, $ = function (s, r) { return (r || d).querySelector(s); }, $$ = function (s, r) { return Array.prototype.slice.call((r || d).querySelectorAll(s)); };
  var C = window.NM_CONFIG || {};
  var sb = (C.SUPABASE_URL && C.SUPABASE_ANON_KEY && window.supabase) ? window.supabase.createClient(C.SUPABASE_URL, C.SUPABASE_ANON_KEY, { auth: { persistSession: true, autoRefreshToken: true } }) : null;
  var SITE = (C.SITE_URL || location.origin).replace(/\/$/, "");
  var EVL = { pernikahan: "Pernikahan", ulangtahun: "Ulang Tahun", wisuda: "Wisuda", seminar: "Seminar & Workshop", corporate: "Corporate Event", lainnya: "Lainnya" };
  var TPL = { "romantic-garden": "Romantic Garden", "jawa-tengah": "Adat Jawa Tengah" };
  var PLAN = { essential: "Essential", signature: "Signature", luxe: "Luxe" };
  var ST = { draft: ["Draft", ""], aktif: ["Aktif", "ok"], selesai: ["Selesai", ""], nonaktif: ["Nonaktif", "warn"], menunggu: ["Menunggu bayar", "warn"], lunas: ["Lunas", "ok"], gagal: ["Gagal", "bad"], dibatalkan: ["Dibatalkan", "bad"], diproses: ["Diproses", "warn"], berhasil: ["Berhasil", "ok"], ditolak: ["Ditolak", "bad"] };

  /* ---------- util ---------- */
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function rp(n) { return "Rp" + Number(n || 0).toLocaleString("id-ID"); }
  function dt(s, long) { if (!s) return "-"; var x = new Date(s); if (isNaN(x)) return "-"; return x.toLocaleDateString("id-ID", { day: "numeric", month: long ? "long" : "short", year: "numeric" }); }
  function ico(name) {
    var P = {
      home: '<path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>', mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
      receipt: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>', book: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 21V5"/>',
      share: '<circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="M8.2 10.8l7.6-3.6M8.2 13.2l7.6 3.6"/>', gift: '<rect x="3" y="9" width="18" height="12" rx="1.5"/><path d="M3 13h18M12 9v12M12 9c-3 0-4.5-1-4.5-2.5S9 4 12 9c3-5 4.5-3.5 4.5-2S15 9 12 9z"/>',
      wallet: '<path d="M3 7a2 2 0 0 1 2-2h13v4"/><rect x="3" y="7" width="18" height="13" rx="2"/><circle cx="16.5" cy="13.5" r="1.2"/>', user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c.6-4 3.8-6 8-6s7.400 2 8 6"/>',
      out: '<path d="M10 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h5M15 8l4 4-4 4M19 12H9"/>', plus: '<path d="M12 5v14M5 12h14"/>', layout: '<rect x="3.500" y="3.500" width="7.500" height="9" rx="1.500"/><rect x="13" y="3.500" width="7.500" height="5" rx="1.500"/><rect x="13" y="10.500" width="7.500" height="10" rx="1.500"/><rect x="3.500" y="14.500" width="7.500" height="6" rx="1.500"/>',
      users: '<circle cx="9" cy="8" r="3.500"/><path d="M2.500 20c.5-3.500 3-5.500 6.500-5.500s6 2 6.500 5.500"/><circle cx="17.500" cy="9" r="2.500"/><path d="M17 14.500c2.500.2 4 1.700 4.500 4.500"/>', chat: '<path d="M4 5h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1h-8l-5 4v-4H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z"/>',
      star: '<path d="M12 3l2.600 5.600 6 .7-4.500 4.100 1.200 6L12 16.400 6.700 19.400l1.200-6L3.400 9.300l6-.7z"/>', arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>', copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>', crown: '<path d="M3 8l4.500 4L12 5l4.500 7L21 8l-2 11H5z"/>'
    };
    return '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true">' + (P[name] || "") + "</svg>";
  }
  function toast(text, kind) { var t = d.createElement("div"); t.className = "toast " + (kind || ""); t.setAttribute("role", kind === "bad" ? "alert" : "status"); t.textContent = text; $("#toasts").appendChild(t); setTimeout(function () { t.remove(); }, 4500); }
  function info(title, body) { $("#dlg-t").textContent = title; $("#dlg-b").textContent = body; if (typeof $("#dlg").showModal === "function") $("#dlg").showModal(); else $("#dlg").setAttribute("open", ""); }
  $("#dlg-ok").addEventListener("click", function () { $("#dlg").close(); });
  function empty(icon, title, text, cta) { return '<div class="empty"><span class="ico">' + ico(icon) + "</span><h3>" + esc(title) + "</h3><p>" + esc(text) + "</p>" + (cta || "") + "</div>"; }
  function badge(s) { var x = ST[s] || [s, ""]; return '<span class="badge ' + x[1] + '">' + esc(x[0]) + "</span>"; }
  function skeleton(n) { var h = ""; for (var i = 0; i < n; i++) h += '<div class="card"><div class="sk h1" style="width:40%;margin-bottom:14px"></div><div class="sk h3"></div></div>'; return h; }
  function thumb(t) { return '<div class="thumb">' + (TPL[t] ? '<img src="/assets/img/' + esc(t) + '-m.webp" alt="" loading="lazy">' : ico("mail")) + "</div>"; }
  function cta() { return '<button class="btn" type="button" data-act="create">' + ico("plus") + " Buat Undangan</button>"; }

  /* ---------- state & data ---------- */
  var S = { user: null, profile: {}, inv: [], sub: null, wallet: { credits: 0, bonus_balance: 0 }, invoices: [], bonus: [], wd: [], loaded: false, warn: false, period: "30", from: "", to: "" };
  function safe(p, fallback) { return p.then(function (r) { if (r.error) { S.warn = S.warn || (r.error.code !== "42P01" && r.error.code !== "PGRST205"); return fallback; } return r.data == null ? fallback : r.data; }, function () { S.warn = true; return fallback; }); }
  function loadAll() {
    var uid = S.user.id;
    return Promise.all([
      safe(sb.from("profiles").select("full_name,whatsapp,event_type,template_id,plan,created_at").eq("id", uid).maybeSingle(), {}),
      safe(sb.from("invitations").select("id,title,event_type,template_id,event_date,status,public_url,guest_count,wish_count,created_at").order("created_at", { ascending: false }).limit(500), []),
      safe(sb.from("subscriptions").select("plan,status,started_at,expires_at").eq("status", "aktif").order("expires_at", { ascending: false }).limit(1), []),
      safe(sb.from("wallets").select("credits,bonus_balance").eq("user_id", uid).maybeSingle(), { credits: 0, bonus_balance: 0 }),
      safe(sb.from("invoices").select("number,description,amount,status,created_at,paid_at").order("created_at", { ascending: false }).limit(200), []),
      safe(sb.from("bonus_history").select("description,amount,created_at").order("created_at", { ascending: false }).limit(200), []),
      safe(sb.from("withdrawals").select("amount,destination,status,created_at").order("created_at", { ascending: false }).limit(200), [])
    ]).then(function (r) { S.profile = r[0]; S.inv = r[1]; S.sub = r[2][0] || null; S.wallet = r[3]; S.invoices = r[4]; S.bonus = r[5]; S.wd = r[6]; S.loaded = true; });
  }
  function name() { return (S.profile && S.profile.full_name) || (S.user && S.user.email ? S.user.email.split("@")[0] : "Pelanggan"); }
  function range() {
    var now = new Date(), end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59), start;
    if (S.period === "custom") { start = S.from ? new Date(S.from + "T00:00:00") : new Date(0); if (S.to) end = new Date(S.to + "T23:59:59"); }
    else if (S.period === "all") start = new Date(0);
    else if (S.period === "year") start = new Date(now.getFullYear(), 0, 1);
    else start = new Date(end.getTime() - (parseInt(S.period, 10) - 1) * 864e5 - (end.getHours() * 36e5 + end.getMinutes() * 6e4 + end.getSeconds() * 1e3));
    if (S.period !== "custom" && S.period !== "all" && S.period !== "year") start = new Date(new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime() - (parseInt(S.period, 10) - 1) * 864e5);
    return [start, end];
  }
  function inRange(i) { var r = range(), t = new Date(i.created_at); return t >= r[0] && t <= r[1]; }

  /* ---------- views ---------- */
  var V = {};
  function filterBar() {
    var o = [["7", "7 hari terakhir"], ["30", "30 hari terakhir"], ["90", "90 hari terakhir"], ["year", "Tahun ini"], ["all", "Semua waktu"], ["custom", "Rentang tanggal"]].map(function (x) { return '<option value="' + x[0] + '"' + (S.period === x[0] ? " selected" : "") + ">" + x[1] + "</option>"; }).join("");
    return '<div class="filters"><label class="fld">Periode<select id="f-per">' + o + "</select></label>" +
      (S.period === "custom" ? '<label class="fld">Dari<input type="date" id="f-from" value="' + esc(S.from) + '"></label><label class="fld">Sampai<input type="date" id="f-to" value="' + esc(S.to) + '"></label>' : "") + "</div>";
  }
  function chartSvg(items) {
    var r = range(), s = r[0], e = r[1];
    if (S.period === "all") { s = items.length ? new Date(items[items.length - 1].created_at) : new Date(e.getTime() - 29 * 864e5); }
    var days = Math.max(1, Math.round((e - s) / 864e5) + 1), monthly = days > 62, keys = [], map = {};
    function key(x) { return monthly ? x.getFullYear() + "-" + (x.getMonth() + 1) : x.getFullYear() + "-" + (x.getMonth() + 1) + "-" + x.getDate(); }
    var c = new Date(s.getFullYear(), s.getMonth(), monthly ? 1 : s.getDate());
    while (c <= e && keys.length < 400) { var k = key(c); keys.push({ k: k, label: c.toLocaleDateString("id-ID", monthly ? { month: "short", year: "2-digit" } : { day: "numeric", month: "short" }) }); map[k] = { n: 0, g: 0 }; if (monthly) c.setMonth(c.getMonth() + 1); else c.setDate(c.getDate() + 1); }
    items.forEach(function (i) { var k = key(new Date(i.created_at)); if (map[k]) { map[k].n++; map[k].g += i.guest_count || 0; } });
    var W = 640, H = 230, L = 36, B = 28, T = 10, R = 8, pw = W - L - R, ph = H - T - B, maxN = 1, maxG = 1;
    keys.forEach(function (x) { maxN = Math.max(maxN, map[x.k].n); maxG = Math.max(maxG, map[x.k].g); });
    maxN = Math.max(4, Math.ceil(maxN / 4) * 4);
    var bw = Math.max(3, Math.min(34, pw / keys.length * .55)), out = '<svg class="chart" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="Grafik undangan dibuat dan tamu per periode">';
    for (var g = 0; g <= 4; g++) { var y = T + ph - ph * g / 4; out += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + y + '" y2="' + y + '" stroke="#E5E0EC"/><text x="' + (L - 6) + '" y="' + (y + 4) + '" text-anchor="end">' + maxN * g / 4 + "</text>"; }
    var pts = [], step = Math.ceil(keys.length / 7);
    keys.forEach(function (x, i) {
      var cx = L + pw * (i + .5) / keys.length, h = ph * map[x.k].n / maxN;
      out += '<rect x="' + (cx - bw / 2) + '" y="' + (T + ph - h) + '" width="' + bw + '" height="' + h + '" rx="4" fill="#9673D0"><title>' + esc(x.label) + ": " + map[x.k].n + " undangan, " + map[x.k].g + " tamu</title></rect>";
      pts.push((cx) + "," + (T + ph - ph * map[x.k].g / maxG));
      if (i % step === 0) out += '<text x="' + cx + '" y="' + (H - 8) + '" text-anchor="middle">' + esc(x.label) + "</text>";
    });
    if (keys.length > 1) out += '<polyline points="' + pts.join(" ") + '" fill="none" stroke="#7552A8" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/>';
    return out + "</svg>";
  }
  function invRow(i, actions) {
    var meta = [EVL[i.event_type] || "", i.event_date ? dt(i.event_date) : "Tanggal belum diatur"].filter(Boolean).map(esc).join(" &middot; ");
    return '<li class="inv">' + thumb(i.template_id) + "<div><b>" + esc(i.title) + '</b><div class="m"><span>' + meta + "</span>" + badge(i.status) + "</div></div>" +
      '<div class="ac">' + (actions === false ? "" : (i.public_url && /^https?:\/\//.test(i.public_url) ? '<button class="btn o sm" type="button" data-copy="' + esc(i.public_url) + '">' + ico("copy") + " Salin link</button>" : "") + '<button class="btn sm" type="button" data-act="manage">Kelola</button>') + "</div></li>";
  }
  V.dashboard = function () {
    var f = S.inv.filter(inRange), gs = f.reduce(function (a, i) { return a + (i.guest_count || 0); }, 0), ws = f.reduce(function (a, i) { return a + (i.wish_count || 0); }, 0);
    var u = S.user, ver = !!u.email_confirmed_at, sub = S.sub, left = 0, pct = 0;
    if (sub) { var tot = new Date(sub.expires_at) - new Date(sub.started_at), rem = new Date(sub.expires_at) - new Date(); left = Math.max(0, Math.ceil(rem / 864e5)); pct = tot > 0 ? Math.max(0, Math.min(100, rem / tot * 100)) : 0; }
    var h = '<section class="card welcome"><span class="tag">Dashboard Pelanggan</span><h1>Selamat datang, <em>' + esc(name().split(" ")[0]) + '</em></h1><p>' +
      (S.inv.length ? "Kelola undangan, pantau tamu, dan siapkan hari istimewa Anda dari satu tempat." : "Mulai dengan memilih template, lalu rancang undangan digital interaktif pertama Anda.") + '</p>' +
      '<div class="qa"><button class="btn" type="button" data-act="create">' + ico("plus") + ' Buat Undangan</button><a class="btn o" href="/#template">' + ico("layout") + ' Lihat Template</a><a class="btn o" href="#undangan">' + ico("mail") + " Kelola Undangan</a></div></section>";
    h += S.warn ? '<div class="note" role="status">Sebagian data belum bisa dimuat. Muat ulang halaman, atau coba lagi nanti.</div>' : "";
    h += '<div class="grid dash-g"><div class="stack">';
    h += '<div class="grid g3"><div class="card stat hov"><span class="ico">' + ico("mail") + "</span><div><b>" + f.length + "</b><span>Undangan Dibuat</span></div></div>" +
      '<div class="card stat hov"><span class="ico">' + ico("users") + "</span><div><b>" + gs + "</b><span>Tamu Undangan</span></div></div>" +
      '<div class="card stat hov"><span class="ico">' + ico("chat") + "</span><div><b>" + ws + "</b><span>Ucapan &amp; Doa</span></div></div></div>";
    h += '<div class="card"><div class="card-h"><h2>Analitik Undangan</h2>' + filterBar() + "</div>";
    h += f.length ? '<div class="legend"><span><i style="background:#9673D0"></i>Undangan dibuat</span><span><i style="background:#7552A8"></i>Tamu</span></div>' + chartSvg(f) : empty("layout", "Belum ada data pada periode ini", "Grafik akan terisi setelah Anda membuat undangan.");
    h += "</div>";
    h += '<div class="card"><div class="card-h"><h2>Undangan Terbaru</h2><a class="btn o sm" href="#undangan">Lihat semua</a></div>';
    h += S.inv.length ? '<ul>' + S.inv.slice(0, 4).map(function (i) { return invRow(i); }).join("") + "</ul>" : empty("mail", "Belum ada undangan", "Buat undangan pertama Anda dan bagikan ke tamu lewat WhatsApp.", cta());
    h += "</div></div><div class=\"stack\">";
    h += '<div class="card"><div class="prof"><div class="av" aria-hidden="true">' + esc(name().charAt(0).toUpperCase()) + "</div><div><b>" + esc(name()) + "</b><span>" + esc(u.email) + "</span></div></div>" +
      '<div class="meta"><div><span>Status akun</span>' + (ver ? '<span class="badge ok">Aktif, email terverifikasi</span>' : '<span class="badge warn">Email belum diverifikasi</span>') + "</div><div><span>WhatsApp</span><b>" + esc(S.profile.whatsapp || "-") + "</b></div><div><span>Bergabung</span><b>" + dt(S.profile.created_at || u.created_at) + '</b></div></div><div class="row-end"><a class="btn o sm" href="#profil">Edit Profil</a></div></div>';
    h += '<div class="card"><div class="card-h"><h2>Langganan</h2>' + (sub ? badge("aktif") : '<span class="badge">Belum aktif</span>') + "</div>";
    h += sub ? '<p class="sub">Paket aktif</p><div class="plan-n">' + esc(PLAN[sub.plan] || sub.plan) + '</div><div class="bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + Math.round(pct) + '" aria-label="Sisa masa aktif"><i style="width:' + pct + '%"></i></div><div class="meta" style="margin-top:8px"><div><span>Berlaku sampai</span><b>' + dt(sub.expires_at, true) + "</b></div><div><span>Sisa masa aktif</span><b>" + left + " hari</b></div></div>" :
      '<p class="sub">Anda belum memiliki paket aktif. Pilih paket saat undangan siap dipublikasikan.</p>';
    h += '<div class="row-end"><a class="btn' + (sub ? "" : "") + ' sm" href="/#harga">' + ico("crown") + " Upgrade</a></div></div>";
    h += '<div class="card"><div class="card-h"><h2>Saldo Kredit</h2></div><div class="cred"><b>' + Number(S.wallet.credits || 0).toLocaleString("id-ID") + "</b><span>kredit</span></div><p class=\"sub\" style=\"margin-top:6px\">Saldo bonus: " + rp(S.wallet.bonus_balance) + "</p></div>";
    return h + "</div></div>";
  };
  V.undangan = function () {
    var q = S.q || "all", list = S.inv.filter(function (i) { return q === "all" || i.status === q; });
    var tabs = [["all", "Semua"], ["draft", "Draft"], ["aktif", "Aktif"], ["selesai", "Selesai"], ["nonaktif", "Nonaktif"]].map(function (x) { return '<option value="' + x[0] + '"' + (q === x[0] ? " selected" : "") + ">" + x[1] + "</option>"; }).join("");
    return '<div class="pghead"><div><h1>Undangan Saya</h1><p class="sub">' + S.inv.length + ' undangan</p></div><div class="filters"><label class="fld">Status<select id="f-st">' + tabs + "</select></label>" + cta() + '</div></div><div class="card">' +
      (list.length ? "<ul>" + list.map(function (i) { return invRow(i); }).join("") + "</ul>" : S.inv.length ? empty("mail", "Tidak ada undangan dengan status ini", "Ubah filter status untuk melihat undangan lain.") : empty("mail", "Belum ada undangan", "Buat undangan pertama Anda dan bagikan ke tamu lewat WhatsApp.", cta())) + "</div>";
  };
  V.invoice = function () {
    var h = '<div class="pghead"><div><h1>Invoice</h1><p class="sub">Riwayat tagihan dan pembayaran</p></div></div><div class="card">';
    if (!S.invoices.length) return h + empty("receipt", "Belum ada invoice", "Invoice muncul di sini setelah Anda memilih paket.", '<a class="btn" href="/#harga">Lihat Paket</a>') + "</div>";
    return h + '<div class="tbl-w"><table><thead><tr><th>No. Invoice</th><th>Keterangan</th><th>Tanggal</th><th class="num">Jumlah</th><th>Status</th></tr></thead><tbody>' + S.invoices.map(function (i) { return "<tr><td><b>" + esc(i.number) + "</b></td><td>" + esc(i.description) + "</td><td>" + dt(i.created_at) + '</td><td class="num">' + rp(i.amount) + "</td><td>" + badge(i.status) + "</td></tr>"; }).join("") + "</tbody></table></div></div>";
  };
  V.tutorial = function () {
    var T = [["Memulai: memilih template", "Buka menu Template di beranda, coba demo tiap template, lalu pilih yang paling sesuai dengan acara Anda."], ["Mengisi data acara", "Isi detail acara, lokasi, foto galeri, musik, dan daftar tamu. Progres disimpan sebagai draft sehingga bisa dilanjutkan kapan saja."], ["Membayar dan mengaktifkan", "Pilih paket Essential, Signature, atau Luxe. Link publik aktif setelah pembayaran terkonfirmasi lewat transfer bank atau QRIS."], ["Membagikan ke tamu", "Setiap tamu mendapat link pribadi dengan kode unik. Kirim lewat WhatsApp agar tamu tidak perlu memasang aplikasi."], ["RSVP dan ucapan", "Tamu konfirmasi kehadiran dan mengirim ucapan dengan nama asli. Anda dapat menyembunyikan atau menghapus ucapan yang tidak pantas."], ["Masa aktif dan perpanjangan", "Essential 90 hari, Signature 180 hari, Luxe 365 hari. Setelah itu undangan dinonaktifkan sementara dan dapat diaktifkan kembali dengan biaya perpanjangan."]];
    return '<div class="pghead"><div><h1>Tutorial</h1><p class="sub">Panduan singkat memakai NusaMora</p></div></div><div class="grid g2" style="align-items:start"><div class="card faq">' + T.map(function (t) { return "<details><summary>" + esc(t[0]) + ico("plus") + "</summary><p>" + esc(t[1]) + "</p></details>"; }).join("") + '</div><div class="card"><h2 style="margin-bottom:14px">Alur singkat</h2><ol class="steps"><li><div><b>Pilih template</b><p class="sub">Coba demo, pilih yang cocok.</p></div></li><li><div><b>Isi data acara</b><p class="sub">Detail, galeri, musik, tamu.</p></div></li><li><div><b>Bayar dan bagikan</b><p class="sub">Kirim link pribadi ke tamu.</p></div></li></ol></div></div>';
  };
  V.affiliate = function () {
    var code = S.user.id.replace(/-/g, "").slice(0, 8).toUpperCase(), link = SITE + "/daftar?ref=" + code;
    return '<div class="pghead"><div><h1>Affiliate</h1><p class="sub">Ajak teman memakai NusaMora</p></div></div><div class="grid g2" style="align-items:start"><div class="card"><h2 style="margin-bottom:6px">Link referral Anda</h2><p class="sub" style="margin-bottom:14px">Kode: <b>' + esc(code) + '</b></p><div class="copy"><input type="text" readonly value="' + esc(link) + '" id="ref" aria-label="Link referral"><button class="btn" type="button" data-copy="' + esc(link) + '">' + ico("copy") + " Salin</button></div>" +
      '<p class="note" style="margin-top:16px">Pencatatan referral dan besaran komisi belum aktif. Ketentuan program akan diumumkan sebelum dibuka, jadi link ini baru dipakai setelah program berjalan.</p></div><div class="card"><h2 style="margin-bottom:14px">Saldo bonus</h2><div class="cred"><b>' + rp(S.wallet.bonus_balance) + '</b></div><div class="row-end"><a class="btn o sm" href="#bonus">History Bonus</a><a class="btn o sm" href="#penarikan">History Penarikan</a></div></div></div>';
  };
  V.bonus = function () {
    var h = '<div class="pghead"><div><h1>History Bonus</h1><p class="sub">Bonus yang Anda terima</p></div></div><div class="card">';
    if (!S.bonus.length) return h + empty("gift", "Belum ada bonus", "Bonus dari program affiliate akan tercatat di sini.") + "</div>";
    return h + '<div class="tbl-w"><table><thead><tr><th>Tanggal</th><th>Keterangan</th><th class="num">Jumlah</th></tr></thead><tbody>' + S.bonus.map(function (b) { return "<tr><td>" + dt(b.created_at) + "</td><td>" + esc(b.description) + '</td><td class="num">' + rp(b.amount) + "</td></tr>"; }).join("") + "</tbody></table></div></div>";
  };
  V.penarikan = function () {
    var h = '<div class="pghead"><div><h1>History Penarikan</h1><p class="sub">Riwayat penarikan saldo bonus</p></div></div><div class="card">';
    if (!S.wd.length) return h + empty("wallet", "Belum ada penarikan", "Riwayat penarikan saldo akan tampil di sini setelah program affiliate dibuka.") + "</div>";
    return h + '<div class="tbl-w"><table><thead><tr><th>Tanggal</th><th>Tujuan</th><th class="num">Jumlah</th><th>Status</th></tr></thead><tbody>' + S.wd.map(function (w) { return "<tr><td>" + dt(w.created_at) + "</td><td>" + esc(w.destination || "-") + '</td><td class="num">' + rp(w.amount) + "</td><td>" + badge(w.status) + "</td></tr>"; }).join("") + "</tbody></table></div></div>";
  };
  V.profil = function () {
    return '<div class="pghead"><div><h1>Edit Profil</h1><p class="sub">Perbarui data akun Anda</p></div></div><div class="grid g2" style="align-items:start"><form class="card form" id="f-prof" novalidate><h2>Data diri</h2><label class="fld">Nama lengkap<input type="text" id="p-name" maxlength="80" value="' + esc(S.profile.full_name || "") + '" autocomplete="name"><span class="err" id="e-name"></span></label><label class="fld">Email<input type="email" value="' + esc(S.user.email) + '" readonly><small>Email tidak dapat diubah di sini.</small></label><label class="fld">Nomor WhatsApp<input type="tel" id="p-wa" value="' + esc(S.profile.whatsapp || "") + '" placeholder="08123456789" autocomplete="tel"><span class="err" id="e-wa"></span></label><div class="row-end"><button class="btn" type="submit" id="p-go">Simpan perubahan</button></div></form>' +
      '<form class="card form" id="f-pw" novalidate><h2>Ganti kata sandi</h2><label class="fld">Kata sandi baru<input type="password" id="w-new" autocomplete="new-password"><small>Minimal 8 karakter, campur huruf dan angka.</small><span class="err" id="e-pw"></span></label><div class="row-end"><button class="btn" type="submit" id="w-go">Perbarui kata sandi</button></div></form></div>';
  };
  var TITLES = { dashboard: "Dashboard", undangan: "Undangan Saya", invoice: "Invoice", tutorial: "Tutorial", affiliate: "Affiliate", bonus: "History Bonus", penarikan: "History Penarikan", profil: "Edit Profil" };
  var NAV = [["dashboard", "home", "Dashboard"], ["undangan", "mail", "Undangan Saya"], ["invoice", "receipt", "Invoice"], ["tutorial", "book", "Tutorial"], ["affiliate", "share", "Affiliate"], ["bonus", "gift", "History Bonus"], ["penarikan", "wallet", "History Penarikan"], ["profil", "user", "Edit Profil"]];
  function buildNav(cur) {
    $("#nav").innerHTML = NAV.map(function (n) { return '<a href="#' + n[0] + '"' + (n[0] === cur ? ' aria-current="page"' : "") + ">" + ico(n[1]) + "<span>" + n[2] + "</span></a>"; }).join("") + '<div class="sep" role="separator"></div><button type="button" class="out" id="logout">' + ico("out") + "<span>Log Out</span></button>";
  }

  /* ---------- router ---------- */
  var norm = function (s) { return String(s || "").replace(/&amp;/g, "&"); }; void norm;
  function route() {
    var r = (location.hash || "#dashboard").slice(1); if (!V[r]) r = "dashboard";
    buildNav(r); $("#crumb").textContent = TITLES[r]; d.title = TITLES[r] + " | NusaMora"; closeNav();
    var view = $("#view");
    if (!S.loaded) { view.innerHTML = '<div class="grid" style="gap:18px"><div class="card"><div class="sk h2"></div></div>' + skeleton(2) + "</div>"; return; }
    view.innerHTML = V[r](); bind(r); window.scrollTo(0, 0);
  }
  function bind(r) {
    var f = $("#f-per"); if (f) f.addEventListener("change", function () { S.period = f.value; route(); $("#f-per").focus(); });
    var a = $("#f-from"), b = $("#f-to"); if (a) a.addEventListener("change", function () { S.from = a.value; route(); }); if (b) b.addEventListener("change", function () { S.to = b.value; route(); });
    var st = $("#f-st"); if (st) st.addEventListener("change", function () { S.q = st.value; route(); $("#f-st").focus(); });
    if (r === "profil") bindProfile();
  }
  function copyText(t) { function fb() { var ta = d.createElement("textarea"); ta.value = t; ta.setAttribute("readonly", ""); ta.style.cssText = "position:fixed;opacity:0"; d.body.appendChild(ta); ta.select(); var ok = false; try { ok = d.execCommand("copy"); } catch (e) { } ta.remove(); toast(ok ? "Tersalin." : "Gagal menyalin. Salin manual dari kolom.", ok ? "ok" : "bad"); } try { navigator.clipboard.writeText(t).then(function () { toast("Tersalin.", "ok"); }, fb); } catch (e) { fb(); } }
  d.addEventListener("click", function (e) {
    var c = e.target.closest("[data-copy]"); if (c) return copyText(c.dataset.copy);
    var x = e.target.closest("[data-act]"); if (!x) return;
    if (x.dataset.act === "create") info("Editor undangan segera hadir", "Pembuatan undangan dari dashboard sedang disiapkan. Sementara ini, coba demo template di halaman Template, dan data pilihan Anda sudah tersimpan di profil.");
    if (x.dataset.act === "manage") info("Pengelolaan undangan segera hadir", "Halaman pengaturan undangan (data acara, tamu, RSVP, dan ucapan) sedang disiapkan.");
  });
  $("#top-create").addEventListener("click", function () { info("Editor undangan segera hadir", "Pembuatan undangan dari dashboard sedang disiapkan. Sementara ini, coba demo template di halaman Template."); });
  d.addEventListener("click", function (e) { if (e.target.closest("#logout")) { sb.auth.signOut().then(function () { location.replace("/masuk"); }); } });

  /* ---------- profil ---------- */
  var emailOk = function (s) { return s; }; void emailOk;
  function normWa(v) { v = (v || "").replace(/[\s\-().]/g, ""); if (!v) return ""; if (v[0] === "+") return v; if (v[0] === "0") return "+62" + v.slice(1); if (v.indexOf("62") === 0) return "+" + v; return v; }
  function bindProfile() {
    $("#f-prof").addEventListener("submit", function (e) {
      e.preventDefault(); $("#e-name").textContent = ""; $("#e-wa").textContent = "";
      var n = $("#p-name").value.trim(), wa = normWa($("#p-wa").value), ok = true;
      if (n.length < 2) { $("#e-name").textContent = "Isi nama lengkap Anda."; ok = false; }
      if (wa && !/^\+[0-9]{8,15}$/.test(wa)) { $("#e-wa").textContent = "Nomor WhatsApp belum benar."; ok = false; }
      if (!ok) return; var bt = $("#p-go"); bt.disabled = true; bt.textContent = "Menyimpan...";
      sb.from("profiles").update({ full_name: n, whatsapp: wa || null }).eq("id", S.user.id).then(function (r) {
        bt.disabled = false; bt.textContent = "Simpan perubahan";
        if (r.error) return toast("Gagal menyimpan. Coba lagi.", "bad");
        S.profile.full_name = n; S.profile.whatsapp = wa || null; head(); toast("Profil diperbarui.", "ok");
      });
    });
    $("#f-pw").addEventListener("submit", function (e) {
      e.preventDefault(); var p = $("#w-new").value; $("#e-pw").textContent = "";
      if (p.length < 8 || !/[a-z]/i.test(p) || !/\d/.test(p)) { $("#e-pw").textContent = "Minimal 8 karakter, campur huruf dan angka."; return; }
      var bt = $("#w-go"); bt.disabled = true; bt.textContent = "Memproses...";
      sb.auth.updateUser({ password: p }).then(function (r) { bt.disabled = false; bt.textContent = "Perbarui kata sandi"; if (r.error) return toast("Gagal memperbarui kata sandi. Coba lagi.", "bad"); $("#w-new").value = ""; toast("Kata sandi diperbarui.", "ok"); });
    });
  }

  /* ---------- drawer mobile ---------- */
  var app = $("#app"), burger = $("#burger"), scrim = $("#scrim");
  function openNav() { app.classList.add("open"); scrim.hidden = false; burger.setAttribute("aria-expanded", "true"); var a = $("#nav a"); if (a) a.focus(); }
  function closeNav() { app.classList.remove("open"); scrim.hidden = true; burger.setAttribute("aria-expanded", "false"); }
  burger.addEventListener("click", openNav); scrim.addEventListener("click", closeNav); $("#side-x").addEventListener("click", function () { closeNav(); burger.focus(); });
  d.addEventListener("keydown", function (e) { if (e.key === "Escape" && app.classList.contains("open")) { closeNav(); burger.focus(); } });
  matchMedia("(min-width:901px)").addEventListener && matchMedia("(min-width:901px)").addEventListener("change", closeNav);
  function head() { var n = name(); $("#chip-i").textContent = n.charAt(0).toUpperCase(); $("#chip-n").textContent = n; }

  /* ---------- start ---------- */
  buildNav("dashboard");
  if (!sb) { $("#view").innerHTML = '<div class="note" role="alert">Sistem akun belum dikonfigurasi (lihat assets/config.js).</div>'; return; }
  route();
  sb.auth.getSession().then(function (r) {
    var s = r.data && r.data.session;
    if (!s) { location.replace("/masuk?next=/akun"); return; }
    S.user = s.user; head();
    return loadAll().then(function () {
      return sb.from("profiles").select("status").eq("id", S.user.id).maybeSingle().then(function (x) {
        if (x && x.data && x.data.status === "suspended") {
          $("#nav").innerHTML = ""; $("#view").innerHTML = '<div class="card">' + empty("Akun ditangguhkan", "Akun Anda sedang ditangguhkan. Hubungi tim NusaMora untuk bantuan.", '<button class="btn" type="button" id="lo2">Keluar</button>') + "</div>";
          $("#lo2").addEventListener("click", function () { sb.auth.signOut().then(function () { location.replace("/masuk"); }); }); return;
        }
        head(); route();
      }, function () { head(); route(); });
    });
  }, function () { $("#view").innerHTML = '<div class="note" role="alert">Tidak bisa terhubung. Periksa koneksi internet Anda lalu muat ulang.</div>'; });
  sb.auth.onAuthStateChange(function (ev) { if (ev === "SIGNED_OUT") location.replace("/masuk"); });
  addEventListener("hashchange", route);
})();
