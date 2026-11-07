(function () {
  "use strict";
  var d = document, $ = function (s, r) { return (r || d).querySelector(s); }, $$ = function (s, r) { return Array.prototype.slice.call((r || d).querySelectorAll(s)); };
  var C = window.NM_CONFIG || {};
  var sb = (C.SUPABASE_URL && C.SUPABASE_ANON_KEY && window.supabase) ? window.supabase.createClient(C.SUPABASE_URL, C.SUPABASE_ANON_KEY, { auth: { persistSession: true, autoRefreshToken: true } }) : null;
  var SITE = (C.SITE_URL || location.origin).replace(/\/$/, "");
  var EVL = { pernikahan: "Pernikahan", pertunangan: "Pertunangan", aqiqah: "Aqiqah", ulangtahun: "Ulang Tahun", wisuda: "Wisuda", seminar: "Seminar & Workshop", corporate: "Corporate Event", lainnya: "Lainnya" };
  var TPL = { "romantic-garden": "Romantic Garden", "jawa-tengah": "Adat Jawa Tengah" };
  var PLAN = { essential: "Essential", signature: "Signature", luxe: "Luxe" };
  var ST = { draft: ["Draft", ""], menunggu_pembayaran: ["Menunggu pembayaran", "warn"], aktif: ["Aktif", "ok"], selesai: ["Selesai", ""], nonaktif: ["Nonaktif", "warn"], menunggu: ["Menunggu bayar", "warn"], lunas: ["Lunas", "ok"], gagal: ["Gagal", "bad"], dibatalkan: ["Dibatalkan", "bad"], diproses: ["Diproses", "warn"], berhasil: ["Berhasil", "ok"], ditolak: ["Ditolak", "bad"] };

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
  /* Fitur yang belum diluncurkan: ubah ke true saat program dibuka. Menu DAN rute ikut tersembunyi (hash langsung kembali ke Dashboard). */
  var FEATURES = { affiliate: false, dompet: false };
  var S = { notif: null, tickets: null, user: null, profile: {}, inv: [], sub: null, wallet: { credits: 0, bonus_balance: 0 }, invoices: [], bonus: [], wd: [], loaded: false, warn: false, period: "30", from: "", to: "" };
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
    ]).then(function (r) { S.profile = r[0]; S.inv = r[1]; S.sub = r[2][0] || null; S.wallet = r[3]; S.invoices = r[4]; S.bonus = r[5]; S.wd = r[6]; S.loaded = true; }).then(function () { return sb.rpc("my_notifications").then(function (r) { if (!r.error) { S.notif = r.data || []; S.unread = S.notif.filter(function (n) { return !n.read; }).length; } }, function () { }); });
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
    return '<li class="inv" data-id="' + esc(i.id) + '">' + thumb(i.template_id) + "<div><b>" + esc(i.title) + '</b><div class="m"><span>' + meta + "</span>" + badge(i.status) + "</div></div>" +
      '<div class="ac">' + (actions === false ? "" : (i.public_url && /^https?:\/\//.test(i.public_url) ? '<button class="btn o sm" type="button" data-copy="' + esc(i.public_url) + '">' + ico("copy") + " Salin link</button>" : "") + '<button class="btn sm" type="button" data-act="manage">Kelola</button>') + "</div></li>";
  }
  V.dashboard = function () {
    var f = S.inv.filter(inRange), gs = f.reduce(function (a, i) { return a + (i.guest_count || 0); }, 0), ws = f.reduce(function (a, i) { return a + (i.wish_count || 0); }, 0);
    var u = S.user, ver = !!u.email_confirmed_at, sub = S.sub, left = 0, pct = 0;
    if (sub) { var tot = new Date(sub.expires_at) - new Date(sub.started_at), rem = new Date(sub.expires_at) - new Date(); left = Math.max(0, Math.ceil(rem / 864e5)); pct = tot > 0 ? Math.max(0, Math.min(100, rem / tot * 100)) : 0; }
    var h = '<section class="card welcome"><span class="tag">Dashboard Pelanggan</span><h1>Selamat datang, <em>' + esc(name().split(" ")[0]) + '</em></h1><p>' +
      (S.inv.length ? "Kelola undangan, pantau tamu, dan siapkan hari istimewa Anda dari satu tempat." : "Mulai dengan memilih template, lalu rancang undangan digital interaktif pertama Anda.") + '</p>' +
      '<div class="qa"><button class="btn" type="button" data-act="create">' + ico("plus") + ' Buat Undangan</button><a class="btn o" href="/paket">' + ico("layout") + ' Lihat Template</a><a class="btn o" href="#undangan">' + ico("mail") + " Kelola Undangan</a></div></section>";
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
  V.dompet = function () {
    var tab = S.dtab === "penarikan" ? "penarikan" : "bonus";
    var h = '<div class="pghead"><div><h1>Dompet Bonus</h1><p class="sub">Riwayat bonus dan penarikan saldo Anda</p></div></div>';
    h += '<div class="card" style="margin-bottom:16px"><div class="cred"><b>' + rp(S.wallet.bonus_balance) + '</b><span>saldo bonus</span></div></div>';
    h += '<div class="card"><div class="tabs" role="tablist" aria-label="Dompet Bonus"><button type="button" role="tab" data-dtab="bonus" aria-selected="' + (tab === "bonus") + '">Riwayat Bonus</button><button type="button" role="tab" data-dtab="penarikan" aria-selected="' + (tab === "penarikan") + '">Riwayat Penarikan</button></div>';
    if (tab === "bonus") {
      if (!S.bonus.length) return h + empty("gift", "Belum ada bonus", "Bonus yang Anda terima akan tercatat di sini.") + "</div>";
      return h + '<div class="tbl-w"><table><thead><tr><th>Tanggal</th><th>Keterangan</th><th class="num">Jumlah</th></tr></thead><tbody>' + S.bonus.map(function (b) { return "<tr><td>" + dt(b.created_at) + "</td><td>" + esc(b.description) + '</td><td class="num">' + rp(b.amount) + "</td></tr>"; }).join("") + "</tbody></table></div></div>";
    }
    if (!S.wd.length) return h + empty("wallet", "Belum ada penarikan", "Riwayat penarikan saldo akan tampil di sini.") + "</div>";
    return h + '<div class="tbl-w"><table><thead><tr><th>Tanggal</th><th>Tujuan</th><th class="num">Jumlah</th><th>Status</th></tr></thead><tbody>' + S.wd.map(function (w) { return "<tr><td>" + dt(w.created_at) + "</td><td>" + esc(w.destination || "-") + '</td><td class="num">' + rp(w.amount) + "</td><td>" + badge(w.status) + "</td></tr>"; }).join("") + "</tbody></table></div></div>";
  };
  /* ---- Langganan: data nyata dari subscriptions + invoices + plans (tanpa tabel baru) ---- */
  V.langganan = function () {
    var sub = S.sub, h = '<div class="pghead"><div><h1>Langganan</h1><p class="sub">Paket, masa aktif, dan perpanjangan</p></div></div>';
    if (!sub) return h + '<div class="card">' + empty("crown", "Belum ada paket aktif", "Pilih paket saat undangan Anda siap dipublikasikan.", '<a class="btn" href="/#harga">Lihat Paket</a>') + "</div>" + subHistory();
    var left = Math.max(0, Math.ceil((new Date(sub.expires_at) - new Date()) / 864e5)), soon = left <= 14;
    h += '<div class="grid g2" style="align-items:start"><div class="card"><div class="card-h"><h2>Paket aktif</h2>' + badge("aktif") + '</div><div class="plan-n">' + esc(PLAN[sub.plan] || sub.plan) + '</div>' +
      '<div class="meta"><div><span>Mulai</span><b>' + dt(sub.started_at, true) + '</b></div><div><span>Berakhir</span><b>' + dt(sub.expires_at, true) + '</b></div><div><span>Sisa masa aktif</span><b>' + left + ' hari</b></div></div>' +
      (soon ? '<p class="note" style="margin-top:14px">Masa aktif paket Anda tinggal ' + left + ' hari. Perpanjang agar undangan tetap bisa dibuka tamu.</p>' : "") +
      '<div class="row-end"><a class="btn" href="/#harga">' + ico("crown") + ' Perpanjang / Upgrade</a></div></div>' +
      '<div class="card"><h2 style="margin-bottom:8px">Saldo</h2><div class="cred"><b>' + Number(S.wallet.credits || 0).toLocaleString("id-ID") + '</b><span>kredit</span></div></div></div>';
    return h + subHistory();
  };
  function subHistory() {
    if (!S.invoices.length) return "";
    return '<div class="card" style="margin-top:16px"><div class="card-h"><h2>Riwayat pembayaran</h2><a class="btn o sm" href="#invoice">Semua invoice</a></div><div class="tbl-w"><table><thead><tr><th>No. Invoice</th><th>Tanggal</th><th class="num">Jumlah</th><th>Status</th></tr></thead><tbody>' + S.invoices.slice(0, 5).map(function (i) { return "<tr><td><b>" + esc(i.number) + "</b></td><td>" + dt(i.created_at) + '</td><td class="num">' + rp(i.amount) + "</td><td>" + badge(i.status) + "</td></tr>"; }).join("") + "</tbody></table></div></div>";
  }
  /* ---- Domain: belum ada backend domain. Tidak ada data palsu; status jujur. ---- */
  V.domain = function () {
    return '<div class="pghead"><div><h1>Domain</h1><p class="sub">Atur domain khusus untuk undangan Anda</p></div></div><div class="card">' +
      empty("layout", "Domain khusus belum tersedia", "Saat ini undangan Anda memakai alamat nusamora. Fitur domain khusus akan muncul di sini setelah tersedia untuk paket Anda.") + '</div>';
  };
  /* ---- Notifikasi: pengumuman sistem untuk saya (RPC my_notifications) ---- */
  V.notifikasi = function () {
    var h = '<div class="pghead"><div><h1>Notifikasi</h1><p class="sub">Informasi terbaru dan pengingat</p></div></div><div class="card" id="nt-box">';
    if (S.notif === null) { loadNotif(); return h + '<div class="sk h3"></div></div>'; }
    if (S.notif === false) return h + empty("chat", "Notifikasi belum bisa dimuat", "Muat ulang halaman, atau coba lagi nanti.") + "</div>";
    if (!S.notif.length) return h + empty("chat", "Belum ada notifikasi", "Pengumuman dan pengingat dari NusaMora akan tampil di sini.") + "</div>";
    return h + "<ul class=\"nt\">" + S.notif.map(function (n) { return '<li' + (n.read ? "" : ' class="unread"') + "><b>" + esc(n.title) + "</b><p>" + esc(n.body) + "</p><small>" + dt(n.created_at, true) + "</small></li>"; }).join("") + "</ul></div>";
  };
  function loadNotif() {
    sb.rpc("my_notifications").then(function (r) { S.notif = r.error ? false : (r.data || []); S.unread = S.notif ? S.notif.filter(function (n) { return !n.read; }).length : 0; if (location.hash === "#notifikasi") route(); });
  }
  function markNotifRead() {
    if (!S.notif || !S.notif.some(function (n) { return !n.read; })) return;
    var snap = S.notif.map(function (n) { return n.read; });  // tampilkan penanda 'baru' dulu, tandai dibaca di server
    sb.rpc("mark_notifications_read").then(function (r) { if (r.error) return; S.unread = 0; buildNav("notifikasi"); void snap; });
  }

  /* ===== Data tamu per undangan: Statistik Tamu, RSVP, Buku Tamu, Live Guest (backend/guest-schema.sql) ===== */
  var G = { inv: "", kind: "", data: null, err: false, filter: "semua" };
  var GM = { nama_tidak_valid: "Isi nama tamu (maksimal 100 karakter).", telepon_tidak_valid: "Nomor telepon belum benar.", batas_tamu_tercapai: "Batas 1.000 tamu per undangan tercapai.", terlalu_banyak_permintaan: "Terlalu banyak permintaan. Coba lagi nanti.", tidak_ditemukan: "Data tidak ditemukan." };
  function gErr(e) { var m = (e && e.message) || ""; for (var k in GM) if (m.indexOf(k) >= 0) return GM[k]; return "Gagal. Coba lagi."; }
  function gPick(kind) {
    if (!S.inv.length) return { html: empty("mail", "Belum ada undangan", "Buat undangan terlebih dulu untuk mengelola tamu.", cta()) };
    if (!G.inv || !S.inv.some(function (i) { return i.id === G.inv; })) G.inv = S.inv[0].id;
    if (G.kind !== kind) { G.kind = kind; G.data = null; G.err = false; G.filter = "semua"; }
    return { sel: '<label class="fld" style="max-width:360px;margin-bottom:14px">Undangan<select id="g-inv">' + S.inv.map(function (i) { return '<option value="' + esc(i.id) + '"' + (i.id === G.inv ? " selected" : "") + ">" + esc(i.title) + "</option>"; }).join("") + "</select></label>" };
  }
  function gLoad(kind) {
    var id = G.inv, q;
    if (kind === "statistik") q = Promise.all([sb.rpc("guest_stats", { p_inv: id }), sb.from("invitation_guests").select("id,name,phone,token,sent_at,opened_at,open_count,invitation_rsvps(status,pax)").eq("invitation_id", id).order("created_at", { ascending: true }).limit(1000)]).then(function (r) { return r[0].error || r[1].error ? false : { stats: r[0].data, guests: r[1].data || [] }; });
    else if (kind === "rsvp") q = sb.from("invitation_rsvps").select("status,pax,message,updated_at,invitation_guests(name)").eq("invitation_id", id).order("updated_at", { ascending: false }).limit(1000).then(function (r) { return r.error ? false : { rows: r.data || [] }; });
    else if (kind === "bukutamu") q = sb.from("guestbook_entries").select("id,name,message,visible,created_at").eq("invitation_id", id).order("created_at", { ascending: false }).limit(500).then(function (r) { return r.error ? false : { rows: r.data || [] }; });
    else q = sb.from("live_guest_events").select("id,guest_name,action,detail,created_at").eq("invitation_id", id).order("created_at", { ascending: false }).limit(300).then(function (r) { return r.error ? false : { rows: r.data || [] }; });
    q.then(function (d) { if (G.inv !== id || G.kind !== kind) return; if (d === false) G.err = true; else G.data = d; if (curRoute() === kind) route(); }, function () { G.err = true; if (curRoute() === kind) route(); });
  }
  function curRoute() { return (location.hash || "#dashboard").slice(1); }
  function gHead(t, sub) { return '<div class="pghead"><div><h1>' + t + '</h1><p class="sub">' + sub + "</p></div></div>"; }
  function gBody(kind, title, sub, render) {
    var p = gPick(kind), h = gHead(title, sub); if (!p.sel) return h + '<div class="card">' + p.html + "</div>";
    h += p.sel;
    if (G.err) return h + '<div class="card">' + empty("chat", "Data belum bisa dimuat", "Muat ulang halaman, atau coba lagi nanti.") + "</div>";
    if (!G.data) { gLoad(kind); return h + '<div class="card"><div class="sk h3"></div></div>'; }
    return h + render(G.data);
  }
  function waLink(g, link) { var ph = (g.phone || "").replace(/^\+/, "").replace(/^0/, "62"); return "https://wa.me/" + ph + "?text=" + encodeURIComponent("Halo " + g.name + ", kami mengundang Anda: " + link); }
  function guestLink(g) { var u = (S.inv.filter(function (i) { return i.id === G.inv; })[0] || {}).public_url; if (!u) return ""; return u + (u.indexOf("?") >= 0 ? "&" : "?") + "t=" + g.token; }
  var RS = { hadir: ["Hadir", "ok"], tidak_hadir: ["Tidak hadir", "bad"], ragu: ["Ragu-ragu", "warn"] };
  V.statistik = function () {
    return gBody("statistik", "Statistik Tamu", "Undangan terkirim, dibuka, dan konfirmasi kehadiran", function (d) {
      var s = d.stats || {}, K = [["Tamu", s.total], ["Terkirim", s.terkirim], ["Dibuka", s.dibuka], ["Sudah RSVP", s.rsvp], ["Hadir", s.hadir], ["Tidak hadir", s.tidak_hadir], ["Ragu-ragu", s.ragu], ["Total orang hadir", s.pax_hadir]];
      var h = '<div class="grid g4" style="margin-bottom:16px">' + K.map(function (k) { return '<div class="card stat"><div><b>' + Number(k[1] || 0).toLocaleString("id-ID") + "</b><span>" + k[0] + "</span></div></div>"; }).join("") + "</div>";
      h += '<form class="card form" id="f-gadd" novalidate style="margin-bottom:16px"><h2>Tambah tamu</h2><div class="grid g2"><label class="fld">Nama<input type="text" id="ga-name" maxlength="100"><span class="err" id="e-ga"></span></label><label class="fld">WhatsApp (opsional)<input type="tel" id="ga-ph" placeholder="0812..."></label></div><div class="row-end"><button class="btn" type="submit" id="ga-go">Tambah</button></div></form>';
      h += '<div class="card"><div class="card-h"><h2>Daftar tamu</h2></div>';
      if (!d.guests.length) return h + empty("users", "Belum ada tamu", "Tambahkan tamu untuk membuat tautan undangan pribadi dan memantau statusnya.") + "</div>";
      h += '<p class="sub" style="margin-bottom:10px">Tautan pribadi tamu mulai berfungsi penuh setelah halaman undangan mendukung RSVP.</p><div class="tbl-w"><table><thead><tr><th>Nama</th><th>Status</th><th>RSVP</th><th>Aksi</th></tr></thead><tbody>' + d.guests.map(function (g) {
        var r = g.invitation_rsvps && (Array.isArray(g.invitation_rsvps) ? g.invitation_rsvps[0] : g.invitation_rsvps), l = guestLink(g);
        return "<tr><td><b>" + esc(g.name) + "</b>" + (g.phone ? "<br><small>" + esc(g.phone) + "</small>" : "") + "</td><td>" + (g.opened_at ? '<span class="badge ok">Dibuka ' + g.open_count + "x</span>" : g.sent_at ? '<span class="badge">Terkirim</span>' : '<span class="badge warn">Belum dikirim</span>') + "</td><td>" + (r ? '<span class="badge ' + RS[r.status][1] + '">' + RS[r.status][0] + (r.status === "hadir" ? " (" + r.pax + ")" : "") + "</span>" : "-") + '</td><td class="acts">' +
          (l ? '<button class="btn o sm" type="button" data-copy="' + esc(l) + '">Salin tautan</button>' : "") + (l && g.phone ? '<a class="btn o sm" target="_blank" rel="noopener" href="' + esc(waLink(g, l)) + '">WhatsApp</a>' : "") +
          '<button class="btn o sm" type="button" data-g="sent" data-id="' + esc(g.id) + '" data-v="' + (g.sent_at ? "0" : "1") + '">' + (g.sent_at ? "Batal terkirim" : "Tandai terkirim") + '</button><button class="btn o sm" type="button" data-g="gdel" data-id="' + esc(g.id) + '">Hapus</button></td></tr>';
      }).join("") + "</tbody></table></div></div>";
      return h;
    });
  };
  V.rsvp = function () {
    return gBody("rsvp", "RSVP", "Konfirmasi kehadiran tamu", function (d) {
      var rows = d.rows.filter(function (r) { return G.filter === "semua" || r.status === G.filter; });
      var h = '<div class="card"><div class="card-h"><h2>Konfirmasi (' + d.rows.length + ')</h2><div class="acts"><select id="g-flt" aria-label="Filter status"><option value="semua">Semua status</option>' + Object.keys(RS).map(function (k) { return '<option value="' + k + '"' + (G.filter === k ? " selected" : "") + ">" + RS[k][0] + "</option>"; }).join("") + '</select><button class="btn o sm" type="button" data-g="csv">Unduh CSV</button></div></div>';
      if (!rows.length) return h + empty("mail", "Belum ada RSVP", "Konfirmasi dari tamu akan tampil di sini.") + "</div>";
      return h + '<div class="tbl-w"><table><thead><tr><th>Nama</th><th>Status</th><th class="num">Jumlah</th><th>Pesan</th><th>Diperbarui</th></tr></thead><tbody>' + rows.map(function (r) { var g = r.invitation_guests || {}; return "<tr><td><b>" + esc(g.name || "-") + '</b></td><td><span class="badge ' + RS[r.status][1] + '">' + RS[r.status][0] + '</span></td><td class="num">' + r.pax + "</td><td>" + esc(r.message || "-") + "</td><td>" + dt(r.updated_at) + "</td></tr>"; }).join("") + "</tbody></table></div></div>";
    });
  };
  V.bukutamu = function () {
    return gBody("bukutamu", "Buku Tamu", "Ucapan dan doa dari tamu", function (d) {
      var h = '<div class="card"><div class="card-h"><h2>Ucapan (' + d.rows.length + ")</h2></div>";
      if (!d.rows.length) return h + empty("book", "Belum ada ucapan", "Ucapan dan doa dari tamu akan tampil di sini.") + "</div>";
      return h + '<ul class="nt">' + d.rows.map(function (w) { return "<li" + (w.visible ? "" : ' class="muted"') + "><b>" + esc(w.name) + "</b>" + (w.visible ? "" : ' <span class="badge warn">Disembunyikan</span>') + "<p>" + esc(w.message) + "</p><small>" + dt(w.created_at, true) + '</small><div class="acts"><button class="btn o sm" type="button" data-g="wvis" data-id="' + esc(w.id) + '" data-v="' + (w.visible ? "0" : "1") + '">' + (w.visible ? "Sembunyikan" : "Tampilkan") + '</button><button class="btn o sm" type="button" data-g="wdel" data-id="' + esc(w.id) + '">Hapus</button></div></li>'; }).join("") + "</ul></div>";
    });
  };
  var LA = { masuk: "Masuk venue", sapa: "Menyapa", reaksi: "Reaksi", keluar: "Keluar" };
  V.live = function () {
    return gBody("live", "Live Guest", "Aktivitas dan interaksi tamu di venue", function (d) {
      var h = '<div class="card"><div class="card-h"><h2>Aktivitas terbaru</h2></div>';
      if (!d.rows.length) return h + empty("star", "Belum ada aktivitas", "Tamu yang masuk, menyapa, dan bereaksi di Live Guest akan tampil di sini.") + "</div>";
      return h + '<div class="tbl-w"><table><thead><tr><th>Waktu</th><th>Tamu</th><th>Aktivitas</th><th>Detail</th><th></th></tr></thead><tbody>' + d.rows.map(function (e) { return "<tr><td>" + dt(e.created_at) + "</td><td><b>" + esc(e.guest_name) + "</b></td><td>" + esc(LA[e.action] || e.action) + "</td><td>" + esc(e.detail || "-") + '</td><td><button class="btn o sm" type="button" data-g="edel" data-id="' + esc(e.id) + '">Hapus</button></td></tr>'; }).join("") + "</tbody></table></div></div>";
    });
  };
  function csvCell(v) { v = String(v == null ? "" : v); if (/^[=+\-@\t\r]/.test(v)) v = "'" + v; return '"' + v.replace(/"/g, '""') + '"'; }
  function bindGuests(r) {
    var sel = $("#g-inv"); if (sel) sel.addEventListener("change", function () { G.inv = sel.value; G.data = null; G.err = false; route(); });
    var fl = $("#g-flt"); if (fl) fl.addEventListener("change", function () { G.filter = fl.value; route(); });
    var f = $("#f-gadd"); if (f) f.addEventListener("submit", function (e) {
      e.preventDefault(); var n = $("#ga-name").value.trim(); $("#e-ga").textContent = ""; if (!n) { $("#e-ga").textContent = "Isi nama tamu."; return; }
      var bt = $("#ga-go"); bt.disabled = true; sb.rpc("guest_add", { p_inv: G.inv, p_name: n, p_phone: $("#ga-ph").value.trim() || null }).then(function (x) { bt.disabled = false; if (x.error) return toast(gErr(x.error), "bad"); toast("Tamu ditambahkan.", "ok"); G.data = null; route(); });
    });
  }
  d.addEventListener("click", function (e) {
    var b = e.target.closest("[data-g]"); if (!b) return; var a = b.dataset.g, id = b.dataset.id, call;
    if (a === "csv") {
      var rows = (G.data && G.data.rows || []).map(function (r) { return [(r.invitation_guests || {}).name, r.status, r.pax, r.message, r.updated_at].map(csvCell).join(","); });
      var blob = new Blob(["﻿Nama,Status,Jumlah,Pesan,Diperbarui\n" + rows.join("\n")], { type: "text/csv;charset=utf-8" }), l = d.createElement("a"); l.href = URL.createObjectURL(blob); l.download = "rsvp.csv"; l.click(); setTimeout(function () { URL.revokeObjectURL(l.href); }, 1000); return;
    }
    if (a === "sent") call = sb.rpc("guest_mark_sent", { p_guest: id, p_sent: b.dataset.v === "1" });
    else if (a === "gdel") { if (!confirm("Hapus tamu ini beserta RSVP-nya?")) return; call = sb.rpc("guest_delete", { p_guest: id }); }
    else if (a === "wvis") call = sb.rpc("wish_set_visible", { p_id: id, p_visible: b.dataset.v === "1" });
    else if (a === "wdel") { if (!confirm("Hapus ucapan ini?")) return; call = sb.rpc("wish_delete", { p_id: id }); }
    else if (a === "edel") call = sb.rpc("live_event_delete", { p_id: id });
    if (call) call.then(function (x) { if (x.error) return toast(gErr(x.error), "bad"); G.data = null; route(); });
  });
  /* ---- Bantuan & Dukungan: tiket lewat RPC (support_*) ---- */
  var CAT = { bantuan: "Bantuan umum", pembayaran: "Pembayaran", teknis: "Masalah teknis", komplain: "Komplain", lainnya: "Lainnya" };
  V.bantuan = function () {
    var h = '<div class="pghead"><div><h1>Bantuan &amp; Dukungan</h1><p class="sub">Hubungi tim NusaMora</p></div></div><div class="grid g2" style="align-items:start"><form class="card form" id="f-tk" novalidate><h2>Buat tiket baru</h2>' +
      '<label class="fld">Kategori<select id="tk-cat">' + Object.keys(CAT).map(function (k) { return '<option value="' + k + '">' + CAT[k] + "</option>"; }).join("") + '</select></label>' +
      '<label class="fld">Subjek<input type="text" id="tk-sub" maxlength="120"><span class="err" id="e-tks"></span></label>' +
      '<label class="fld">Pesan<textarea id="tk-msg" rows="5" maxlength="4000"></textarea><span class="err" id="e-tkm"></span></label>' +
      '<div class="row-end"><button class="btn" type="submit" id="tk-go">Kirim tiket</button></div></form><div class="card"><h2 style="margin-bottom:12px">Tiket saya</h2><div id="tk-list">';
    if (S.tickets === null) { loadTickets(); return h + '<div class="sk h3"></div></div></div></div>'; }
    if (S.tickets === false) return h + empty("chat", "Tiket belum bisa dimuat", "Muat ulang halaman, atau coba lagi nanti.") + "</div></div></div>";
    if (!S.tickets.length) return h + empty("chat", "Belum ada tiket", "Tiket yang Anda buat akan tampil di sini.") + "</div></div></div>";
    return h + S.tickets.map(function (t) {
      return '<details class="tk"><summary><span>' + esc(t.subject) + "</span>" + badge(t.status) + "</summary><small>" + esc(CAT[t.category] || t.category) + " &middot; " + dt(t.created_at, true) + "</small><p>" + esc(t.message || "") + "</p>" +
        t.replies.map(function (r) { return '<div class="rp' + (r.is_staff ? " staff" : "") + '"><b>' + (r.is_staff ? "Tim NusaMora" : "Anda") + "</b><p>" + esc(r.body) + "</p></div>"; }).join("") +
        (t.status === "ditutup" ? "" : '<form class="rf" data-tk="' + esc(t.id) + '"><textarea rows="2" maxlength="4000" aria-label="Balasan"></textarea><button class="btn sm" type="submit">Balas</button></form>') + "</details>";
    }).join("") + "</div></div></div>";
  };
  function loadTickets() { sb.rpc("support_my_tickets").then(function (r) { S.tickets = r.error ? false : (r.data || []); if (location.hash === "#bantuan") route(); }); }
  var ERR = { subjek_tidak_valid: "Subjek 3 sampai 120 karakter.", pesan_tidak_valid: "Pesan 5 sampai 4000 karakter.", terlalu_banyak_permintaan: "Terlalu banyak tiket. Coba lagi nanti.", tiket_ditutup: "Tiket ini sudah ditutup." };
  function errMsg(e) { var m = (e && e.message) || ""; for (var k in ERR) if (m.indexOf(k) >= 0) return ERR[k]; return "Gagal mengirim. Coba lagi."; }
  function bindSupport() {
    var f = $("#f-tk"); if (f) f.addEventListener("submit", function (e) {
      e.preventDefault(); $("#e-tks").textContent = ""; $("#e-tkm").textContent = "";
      var sj = $("#tk-sub").value.trim(), ms = $("#tk-msg").value.trim(), ok = true;
      if (sj.length < 3) { $("#e-tks").textContent = "Isi subjek (minimal 3 karakter)."; ok = false; }
      if (ms.length < 5) { $("#e-tkm").textContent = "Isi pesan (minimal 5 karakter)."; ok = false; }
      if (!ok) return; var bt = $("#tk-go"); bt.disabled = true; bt.textContent = "Mengirim...";
      sb.rpc("support_create_ticket", { p_subject: sj, p_category: $("#tk-cat").value, p_message: ms }).then(function (r) {
        bt.disabled = false; bt.textContent = "Kirim tiket"; if (r.error) return toast(errMsg(r.error), "bad");
        toast("Tiket terkirim.", "ok"); S.tickets = null; route();
      });
    });
    $$(".rf").forEach(function (rf) { rf.addEventListener("submit", function (e) {
      e.preventDefault(); var ta = rf.querySelector("textarea"), b = ta.value.trim(); if (!b) return;
      sb.rpc("support_reply", { p_ticket: rf.dataset.tk, p_body: b }).then(function (r) { if (r.error) return toast(errMsg(r.error), "bad"); toast("Balasan terkirim.", "ok"); S.tickets = null; route(); });
    }); });
  }
  V.profil = function () {
    return '<div class="pghead"><div><h1>Edit Profil</h1><p class="sub">Perbarui data akun Anda</p></div></div><div class="grid g2" style="align-items:start"><form class="card form" id="f-prof" novalidate><h2>Data diri</h2><label class="fld">Nama lengkap<input type="text" id="p-name" maxlength="80" value="' + esc(S.profile.full_name || "") + '" autocomplete="name"><span class="err" id="e-name"></span></label><label class="fld">Email<input type="email" value="' + esc(S.user.email) + '" readonly><small>Email tidak dapat diubah di sini.</small></label><label class="fld">Nomor WhatsApp<input type="tel" id="p-wa" value="' + esc(S.profile.whatsapp || "") + '" placeholder="08123456789" autocomplete="tel"><span class="err" id="e-wa"></span></label><div class="row-end"><button class="btn" type="submit" id="p-go">Simpan perubahan</button></div></form>' +
      '<form class="card form" id="f-pw" novalidate><h2>Ganti kata sandi</h2><label class="fld">Kata sandi baru<input type="password" id="w-new" autocomplete="new-password"><small>Minimal 8 karakter, campur huruf dan angka.</small><span class="err" id="e-pw"></span></label><div class="row-end"><button class="btn" type="submit" id="w-go">Perbarui kata sandi</button></div></form></div>';
  };
  var TITLES = { dashboard: "Dashboard", undangan: "Undangan Saya", statistik: "Statistik Tamu", rsvp: "RSVP", bukutamu: "Buku Tamu", live: "Live Guest", notifikasi: "Notifikasi", invoice: "Invoice", langganan: "Langganan", domain: "Domain", bantuan: "Bantuan & Dukungan", tutorial: "Tutorial", affiliate: "Affiliate", dompet: "Dompet Bonus", profil: "Edit Profil" };
  var NAV = [["dashboard", "home", "Dashboard"], ["undangan", "mail", "Undangan Saya"], ["statistik", "users", "Statistik Tamu"], ["rsvp", "mail", "RSVP"], ["bukutamu", "book", "Buku Tamu"], ["live", "star", "Live Guest"], ["notifikasi", "chat", "Notifikasi"], ["invoice", "receipt", "Invoice"], ["langganan", "crown", "Langganan"], ["domain", "layout", "Domain"], ["bantuan", "book", "Bantuan & Dukungan"], ["tutorial", "book", "Tutorial"], ["affiliate", "share", "Affiliate"], ["dompet", "wallet", "Dompet Bonus"], ["profil", "user", "Edit Profil"]];
  function visible(k) { return FEATURES[k] !== false; }
  function buildNav(cur) {
    $("#nav").innerHTML = NAV.filter(function (n) { return visible(n[0]); }).map(function (n) {
      var b = n[0] === "notifikasi" && S.unread > 0 ? '<span class="badge warn" style="margin-left:auto" aria-label="' + S.unread + ' belum dibaca">' + (S.unread > 9 ? "9+" : S.unread) + "</span>" : "";
      return '<a href="#' + n[0] + '"' + (n[0] === cur ? ' aria-current="page"' : "") + ">" + ico(n[1]) + "<span>" + n[2] + "</span>" + b + "</a>";
    }).join("") + '<div class="sep" role="separator"></div><button type="button" class="out" id="logout">' + ico("out") + "<span>Log Out</span></button>";
  }

  /* ---------- router ---------- */
  var norm = function (s) { return String(s || "").replace(/&amp;/g, "&"); }; void norm;
  function route() {
    var r = (location.hash || "#dashboard").slice(1); if (!V[r] || !visible(r)) r = "dashboard";
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
    if (r === "bantuan") bindSupport();
    if (r === "notifikasi") markNotifRead();
    if (["statistik", "rsvp", "bukutamu", "live"].indexOf(r) >= 0) bindGuests(r);
    $$("[data-dtab]").forEach(function (t) { t.addEventListener("click", function () { S.dtab = t.dataset.dtab; route(); }); });
  }
  function copyText(t) { function fb() { var ta = d.createElement("textarea"); ta.value = t; ta.setAttribute("readonly", ""); ta.style.cssText = "position:fixed;opacity:0"; d.body.appendChild(ta); ta.select(); var ok = false; try { ok = d.execCommand("copy"); } catch (e) { } ta.remove(); toast(ok ? "Tersalin." : "Gagal menyalin. Salin manual dari kolom.", ok ? "ok" : "bad"); } try { navigator.clipboard.writeText(t).then(function () { toast("Tersalin.", "ok"); }, fb); } catch (e) { fb(); } }
  d.addEventListener("click", function (e) {
    var c = e.target.closest("[data-copy]"); if (c) return copyText(c.dataset.copy);
    var x = e.target.closest("[data-act]"); if (!x) return;
    if (x.dataset.act === "create") location.href = "/paket";
    if (x.dataset.act === "manage") location.href = "/editor?id=" + encodeURIComponent(x.closest("[data-id]") ? x.closest("[data-id]").dataset.id : "");
  });
  $("#top-create").addEventListener("click", function () { location.href = "/paket"; });
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
