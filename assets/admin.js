(function () {
  "use strict";
  var d = document, $ = function (s, r) { return (r || d).querySelector(s); }, $$ = function (s, r) { return Array.prototype.slice.call((r || d).querySelectorAll(s)); };
  var C = window.NM_CONFIG || {};
  var sb = (C.SUPABASE_URL && C.SUPABASE_ANON_KEY && window.supabase) ? window.supabase.createClient(C.SUPABASE_URL, C.SUPABASE_ANON_KEY, { auth: { persistSession: true, autoRefreshToken: true } }) : null;
  var A = { user: null, role: "", perms: {} };
  var can = function (m, a) { return !!A.perms[m + "." + (a || "read")]; };

  /* ================= util ================= */
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function rp(n) { return "Rp" + Number(n || 0).toLocaleString("id-ID"); }
  function dt(s, time) { if (!s) return "-"; var x = new Date(s); if (isNaN(x)) return "-"; var o = { day: "numeric", month: "short", year: "numeric" }; if (time) { o.hour = "2-digit"; o.minute = "2-digit"; } return x.toLocaleDateString("id-ID", o); }
  function toast(t, k) { var e = d.createElement("div"); e.className = "toast " + (k || ""); e.setAttribute("role", k === "bad" ? "alert" : "status"); e.textContent = t; $("#toasts").appendChild(e); setTimeout(function () { e.remove(); }, 4800); }
  function fail(e, pre) { var c = e && e.code, m = e && e.message || ""; var t = /template_belum_lengkap/.test(m) ? "Template belum lengkap. " + (e && e.hint || "") : /tidak_ada_perubahan/.test(m) ? "Belum ada perubahan sejak versi terakhir." : /template_dipakai/.test(m) ? "Template sudah dipakai undangan, jadi paketnya tidak bisa diganti." : /aset_terpasang/.test(m) ? "Lepas dulu aset terpasang (Studio, tab B) sebelum mengganti paket." : /masih_terbit/.test(m) ? "Template sedang terbit. Tarik ke draft dulu." : /hanya_template_terbit/.test(m) ? "Unggulan dan rekomendasi hanya untuk template Published." : /slug_sudah_dipakai/.test(m) ? "Slug sudah dipakai template lain." : /belum_lunas/.test(m) ? "Pembayaran belum lunas, jadi undangan belum bisa ditayangkan." : /sudah_kedaluwarsa/.test(m) ? "Masa aktif undangan sudah lewat. Perpanjang masa aktif dulu." : /masih_diarsipkan/.test(m) ? "Undangan masih diarsipkan. Pulihkan dari arsip dulu." : c === "42501" || /forbidden|row-level security/i.test(m) ? "Anda tidak punya izin untuk tindakan ini." : c === "23505" ? "Nilai yang harus unik sudah dipakai data lain." : c === "23514" ? "Nilai tidak memenuhi aturan data." : c === "23503" ? "Data ini masih dipakai oleh data lain." : /fetch|network/i.test(m) ? "Tidak bisa terhubung. Periksa koneksi internet." : (pre || "Terjadi kendala") + (m ? ": " + m : "."); toast(t, "bad"); return t; }
  function ico(n) { var P = { home: '<path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>', users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.500 20c.5-3.500 3-5.500 6.500-5.500s6 2 6.500 5.500"/><circle cx="17.500" cy="9" r="2.500"/><path d="M17 14.500c2.500.2 4 1.700 4.500 4.500"/>', mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>', layout: '<rect x="3.500" y="3.500" width="7.500" height="9" rx="1.500"/><rect x="13" y="3.500" width="7.500" height="5" rx="1.500"/><rect x="13" y="10.500" width="7.500" height="10" rx="1.500"/><rect x="3.500" y="14.500" width="7.500" height="6" rx="1.500"/>', monitor: '<rect x="3" y="4" width="18" height="12.500" rx="2"/><path d="M8 20.500h8M12 16.500v4"/>', card: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M7 15h4"/>', crown: '<path d="M3 8l4.500 4L12 5l4.500 7L21 8l-2 11H5z"/>', doc: '<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 13h7M9 17h7"/>', share: '<circle cx="6" cy="12" r="2.500"/><circle cx="18" cy="6" r="2.500"/><circle cx="18" cy="18" r="2.500"/><path d="M8.200 10.800l7.600-3.600M8.200 13.200l7.600 3.600"/>', help: '<circle cx="12" cy="12" r="9"/><path d="M9.500 9.500a2.500 2.500 0 1 1 3.500 2.300c-.7.400-1 .9-1 1.700M12 17h.01"/>', bars: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>', bell: '<path d="M6 9a6 6 0 0 1 12 0c0 6 2 7 2 7H4s2-1 2-7zM10 20a2 2 0 0 0 4 0"/>', cog: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.200 4.200l2.100 2.100M17.700 17.700l2.100 2.100M2 12h3M19 12h3M4.200 19.800l2.100-2.100M17.700 6.300l2.100-2.100"/>', shield: '<path d="M12 3l8 3v6c0 4.500-3.200 7.800-8 9-4.800-1.200-8-4.500-8-9V6z"/>', plus: '<path d="M12 5v14M5 12h14"/>', out: '<path d="M10 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h5M15 8l4 4-4 4M19 12H9"/>', user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c.6-4 3.800-6 8-6s7.400 2 8 6"/>', pulse: '<path d="M3 12h4l2-6 4 12 2-6h6"/>' }; return '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true">' + (P[n] || "") + "</svg>"; }
  var ST = { aktif: ["Aktif", "ok"], suspended: ["Suspended", "bad"], draft: ["Draft", ""], menunggu_pembayaran: ["Menunggu bayar", "warn"], selesai: ["Selesai", ""], nonaktif: ["Nonaktif", "warn"], published: ["Published", "ok"], archived: ["Arsip", "warn"], menunggu: ["Menunggu", "warn"], lunas: ["Lunas", "ok"], gagal: ["Gagal", "bad"], dibatalkan: ["Dibatalkan", "bad"], refund: ["Refund", "warn"], diproses: ["Diproses", "warn"], berhasil: ["Berhasil", "ok"], ditolak: ["Ditolak", "bad"], open: ["Open", "warn"], menunggu_pelanggan: ["Menunggu pelanggan", "warn"], ditutup: ["Ditutup", ""], pending: ["Pending", "warn"], terdaftar: ["Terdaftar", ""], berbayar: ["Berbayar", "ok"], batal: ["Batal", "bad"], ok: ["Normal", "ok"], flagged: ["Terlapor", "warn"], takedown: ["Diturunkan", "bad"], terjadwal: ["Terjadwal", "warn"], terkirim: ["Terkirim", "ok"], tinggi: ["Tinggi", "bad"], normal: ["Normal", ""], rendah: ["Rendah", ""] };
  function badge(s) { var x = ST[s] || [s || "-", ""]; return '<span class="badge ' + x[1] + '">' + esc(x[0]) + "</span>"; }
  var ACC = { aktif: ["Aktif", "ok"], nonaktif: ["Nonaktif", "warn"], suspended: ["Diblokir", "bad"] };
  var ACCH = { aktif: "Dapat memakai dashboard dan membuat undangan.", nonaktif: "Dashboard tetap terbuka, tetapi tidak bisa membuat undangan baru atau membayar.", suspended: "Tidak bisa memakai dashboard sampai diaktifkan lagi." };
  var PLN = { essential: "Essential", signature: "Signature", luxe: "Luxe" }, PKN = { essential: "Essential 2D", signature: "Signature 3D", luxe: "Luxe Live Guest" };
  /* tiga status undangan yang sengaja dipisah: pembayaran, publikasi, moderasi */
  var PAYB = { belum_bayar: ["Belum bayar", ""], menunggu: ["Menunggu", "warn"], lunas: ["Lunas", "ok"], gagal: ["Gagal / kedaluwarsa", "bad"], refund: ["Refund", "warn"] };
  var PUBB = { draft: ["Draft", ""], menunggu_pembayaran: ["Belum tayang", "warn"], aktif: ["Tayang", "ok"], nonaktif: ["Diturunkan", "warn"], selesai: ["Selesai", ""], arsip: ["Diarsipkan", ""] };
  var MODB = { ok: ["Normal", "ok"], flagged: ["Terlapor", "warn"], takedown: ["Disuspend", "bad"] };
  function bdg(m, k) { var x = m[k] || [k || "-", ""]; return '<span class="badge ' + x[1] + '">' + esc(x[0]) + "</span>"; }
  function lopts(m) { return Object.keys(m).map(function (k) { return [k, m[k][0]]; }); }
  function tri(r) { return '<div class="tri"><span><small>Bayar</small>' + bdg(PAYB, r.pay_status) + "</span><span><small>Tayang</small>" + bdg(PUBB, r.pub_status) + "</span><span><small>Moderasi</small>" + bdg(MODB, r.moderation) + "</span></div>"; }
  var ROLE = { super_admin: "Super Admin", admin: "Admin", finance: "Finance", support: "Support", content: "Konten" };
  function empty(t, p, extra) { return '<div class="empty"><span class="ico">' + ico("doc") + "</span><h3>" + esc(t) + "</h3><p>" + esc(p || "") + "</p>" + (extra || "") + "</div>"; }
  function skel() { return '<div class="card"><div class="sk h1" style="width:35%;margin-bottom:16px"></div><div class="sk h4"></div></div>'; }
  function errBox(msg, retry) { return '<div class="card">' + empty("Data tidak bisa dimuat", msg, retry ? '<button class="btn" type="button" data-retry>Coba lagi</button>' : "") + "</div>"; }
  function dlgConfirm(msg, yes) { return new Promise(function (res) { var dl = $("#cdlg"); $("#cdlg-b").textContent = msg; $("#cdlg-y").textContent = yes || "Lanjutkan"; var done = function (v) { dl.close(); res(v); }; $("#cdlg-y").onclick = function () { done(true); }; $("#cdlg-n").onclick = function () { done(false); }; dl.oncancel = function () { res(false); }; dl.showModal(); }); }
  function localDT(s) { if (!s) return ""; var x = new Date(s); if (isNaN(x)) return ""; var p = function (n) { return String(n).padStart(2, "0"); }; return x.getFullYear() + "-" + p(x.getMonth() + 1) + "-" + p(x.getDate()) + "T" + p(x.getHours()) + ":" + p(x.getMinutes()); }
  var nameOf = function (r, k) { return (r[k || "profiles"] && r[k || "profiles"].full_name) || "-"; };

  /* ================= definisi umum ================= */
  var EV = [["pernikahan", "Pernikahan"], ["pertunangan", "Pertunangan"], ["aqiqah", "Aqiqah"], ["ulangtahun", "Ulang Tahun"], ["wisuda", "Wisuda"], ["seminar", "Seminar & Workshop"], ["corporate", "Corporate Event"], ["lainnya", "Lainnya"]];
  var PL = [["essential", "Essential"], ["signature", "Signature"], ["luxe", "Luxe"]];
  var PUB = [["draft", "Draft"], ["published", "Published"], ["archived", "Arsip"]];
  var optsCache = {};
  function loadOpts(key, fn) { return optsCache[key] ? Promise.resolve(optsCache[key]) : fn().then(function (o) { optsCache[key] = o; return o; }); }

  /* ================= definisi modul ================= */
  var M = [];
  M.push({ key: "dashboard", label: "Dashboard", icon: "home", perm: "dashboard", grp: "Ringkasan", render: renderDashboard });
  M.push({ key: "customers", label: "Manajemen Pelanggan", icon: "users", perm: "customers", grp: "Pelanggan & Acara", tabs: [{
    key: "list", label: "Pelanggan", rpc: "admin_list_customers", search: ["full_name", "email", "whatsapp"], noCreate: true, noDelete: true, noEdit: true, detail: customerPage,
    filters: [{ k: "status", l: "Status akun", o: [["aktif", "Aktif"], ["nonaktif", "Nonaktif"], ["suspended", "Diblokir"]] }, { k: "plan", l: "Paket", o: PL }],
    cols: [{ k: "full_name", l: "Pelanggan", f: function (v, r) { return "<b>" + esc(v || "-") + '</b><span class="cell-s">' + esc(r.email) + "</span>"; } }, { k: "status", l: "Status akun", f: function (v) { return bdg(ACC, v); } }, { k: "plan", l: "Paket aktif", f: function (v, r) { return v ? esc(PLN[v] || v) + '<span class="cell-s">s/d ' + dt(r.plan_expires) + "</span>" : "-"; } }, { k: "last_sign_in_at", l: "Terakhir masuk", f: function (v) { return dt(v); } }, { k: "created_at", l: "Bergabung", f: function (v) { return dt(v); } }],
    title: function (r) { return r.full_name || r.email; } }] });
  M.push({ key: "invitations", label: "Manajemen Undangan", icon: "mail", perm: "invitations", tabs: (function () {
    var base = { rpc: "admin_list_invitations", search: ["title", "owner_name", "owner_email", "slug"], noCreate: true, noDelete: true, noEdit: true, detail: invitationPage,
      cols: [{ k: "title", l: "Undangan", f: function (v, r) { return "<b>" + esc(v) + '</b><span class="cell-s">' + esc(r.owner_name || "-") + " &middot; " + esc(r.owner_email || "") + "</span>"; } }, { k: "package_type", l: "Paket", f: function (v) { return esc(PKN[v] || v || "-"); } }, { k: "pay_status", l: "Status (bayar / tayang / moderasi)", f: function (v, r) { return tri(r); } }, { k: "expires_at", l: "Masa aktif", f: function (v) { return dt(v); } }, { k: "updated_at", l: "Diperbarui", f: function (v) { return dt(v); } }],
      filters: [{ k: "pay_status", l: "Pembayaran", o: lopts(PAYB) }, { k: "pub_status", l: "Publikasi", o: lopts(PUBB) }, { k: "moderation", l: "Moderasi", o: lopts(MODB) }, { k: "package_type", l: "Paket", o: PL }],
      title: function (r) { return r.title; } };
    var t2 = Object.assign({}, base, { key: "flag", label: "Perlu moderasi", fixed: { moderation: "flagged" }, filters: [], emptyText: "Tidak ada undangan yang perlu dimoderasi." });
    return [Object.assign({ key: "all", label: "Semua undangan" }, base), t2];
  })() });
  M.push({ key: "templates", label: "Manajemen Template", icon: "layout", perm: "templates", tabs: [{
    key: "items", label: "Template", table: "templates", select: "*,event_categories(name)", order: ["sort", true], search: ["name", "slug"], title: function (r) { return r.name; },
    filters: [{ k: "status", l: "Status", o: PUB }, { k: "package_type", l: "Paket", o: PL }], detail: templatePage, enrich: tplEnrich,
    cols: [{ k: "thumbnail_url", l: "", f: function (v) { return v ? '<img src="' + esc(v) + '" alt="" style="width:56px;height:42px;object-fit:cover;border-radius:8px">' : ""; } }, { k: "name", l: "Template", f: function (v, r) { return "<b>" + esc(v) + '</b><span class="cell-s">' + esc(r.slug) + "</span>"; } }, { k: "event_categories", l: "Kategori", f: function (v) { return esc(v && v.name || "-"); } }, { k: "package_type", l: "Paket", f: function (v) { return esc({ essential: "Essential 2D", signature: "Signature 3D", luxe: "Luxe Live Guest" }[v] || v || "-"); } }, { k: "status", l: "Status", f: function (v, r) { return badge(v) + tplFlags(r); } }, { k: "_ov", l: "Kelengkapan", f: function (v) { return v ? (v.ready ? '<span class="badge ok">Siap</span>' : '<span class="badge warn">' + v.req_ok + "/" + v.req_total + " wajib</span>") : "-"; } }, { k: "_ov", l: "Dipakai", num: 1, f: function (v) { return v ? v.usage_total + ' <small class="sub">(' + v.usage_active + " aktif)</small>" : "-"; } }, { k: "version", l: "Versi", f: function (v) { return "v" + (v || 1); } }],
    fields: [{ k: "name", l: "Nama template", req: 1, max: 80 }, { k: "slug", l: "Slug", req: 1, pat: /^[a-z0-9-]+$/, help: "Huruf kecil, angka, tanda minus." }, { k: "category_id", l: "Kategori acara", t: "select", load: function () { return loadOpts("cat", function () { return sb.from("event_categories").select("id,name").order("sort").then(function (r) { return (r.data || []).map(function (x) { return [x.id, x.name]; }); }); }); } }, { k: "package_type", l: "Jenis paket (2D / 3D Cinematic / 3D Live Guest)", t: "select", opts: PL, req: 1, def: "essential", help: "Template hanya muncul pada paket ini. Wajib." }, { k: "theme_key", l: "Kunci tema (opsional)", max: 60, help: "Samakan antar template satu tema, mis. romantic-garden." }, { k: "min_plan", l: "Paket minimum (lama)", t: "select", opts: PL }, { k: "price", l: "Harga tambahan (Rp)", t: "number", min: 0, def: 0 }, { k: "description", l: "Deskripsi", t: "textarea", full: 1 }, { k: "thumbnail_url", l: "Thumbnail", t: "image", folder: "templates", full: 1 }, { k: "preview_url", l: "URL preview/demo", full: 1 }, { k: "sort", l: "Urutan", t: "number", def: 0 }],
    extra: function (r, box) { if (r.preview_url && /^https?:\/\//.test(r.preview_url)) box.innerHTML = '<a class="btn o" target="_blank" rel="noopener" href="' + esc(r.preview_url) + '">Buka preview</a>'; } },
  { key: "cats", label: "Kategori Acara", table: "event_categories", order: ["sort", true], search: ["name", "slug"], title: function (r) { return r.name; }, cols: [{ k: "name", l: "Kategori", f: function (v) { return "<b>" + esc(v) + "</b>"; } }, { k: "slug", l: "Slug" }, { k: "active", l: "Status", f: function (v) { return badge(v ? "aktif" : "nonaktif"); } }, { k: "sort", l: "Urutan", num: 1 }], fields: [{ k: "name", l: "Nama kategori", req: 1, max: 60 }, { k: "slug", l: "Slug", req: 1, pat: /^[a-z0-9-]+$/ }, { k: "sort", l: "Urutan", t: "number", def: 0 }, { k: "active", l: "Aktif", t: "bool", def: true }] }] });
  function liveTab(kind, label, ex) { return { key: kind, label: label, table: "live_assets", fixed: { kind: kind }, order: ["sort", true], search: ["name", "theme"], title: function (r) { return r.name; }, cols: [{ k: "url", l: "", f: function (v) { return v && /\.(png|jpe?g|webp)(\?|$)/i.test(v) ? '<img src="' + esc(v) + '" alt="" style="width:48px;height:48px;object-fit:cover;border-radius:8px">' : ""; } }, { k: "name", l: "Nama", f: function (v) { return "<b>" + esc(v) + "</b>"; } }, { k: "theme", l: "Tema", f: function (v) { return esc(v || "-"); } }, { k: "active", l: "Status", f: function (v) { return badge(v ? "aktif" : "nonaktif"); } }, { k: "sort", l: "Urutan", num: 1 }], fields: [{ k: "name", l: "Nama", req: 1, max: 80 }, { k: "theme", l: "Tema (slug)", help: "Mis. romantic-garden, jawa-tengah." }, ex.img ? { k: "url", l: "Gambar", t: "image", folder: "live/" + kind, full: 1 } : { k: "url", l: "URL file / aset", full: 1, help: ex.help || "" }, { k: "config", l: "Konfigurasi (JSON)", t: "textarea", full: 1, json: 1, help: ex.cfg || "Opsional." }, { k: "sort", l: "Urutan", t: "number", def: 0 }, { k: "active", l: "Aktif", t: "bool", def: true }] }; }
  M.push({ key: "live", label: "Live Guest", icon: "monitor", perm: "live", tabs: [
    { key: "cfg", label: "Pengaturan Fitur", settings: [{ k: "live_enabled", l: "Aktifkan Live Guest", t: "bool", def: true }, { k: "live_music", l: "Musik latar", t: "bool", def: true }, { k: "live_qris", l: "QRIS hadiah pengantin", t: "bool", def: true }, { k: "live_gallery", l: "Area Galeri Foto", t: "bool", def: true }, { k: "live_guestbook", l: "Area Buku Tamu", t: "bool", def: true }, { k: "live_default_theme", l: "Tema bawaan", t: "select", opts: [["romantic-garden", "Romantic Garden"], ["jawa-tengah", "Adat Jawa Tengah"]], def: "romantic-garden" }, { k: "live_max_guests", l: "Batas tamu online bersamaan", t: "number", min: 1, def: 200 }], note: "Pengaturan ini tersimpan di database. Aplikasi Live Guest membacanya setelah dihubungkan (belum otomatis)." },
    liveTab("avatar", "Avatar", { img: 1 }), liveTab("background", "Background Venue", { img: 1 }), liveTab("asset3d", "Aset 3D", { help: "Tempel URL file (.glb/.png) yang sudah diunggah." }), liveTab("area", "Area Interaktif", { cfg: 'Mis. {"x":3.4,"z":6.4}' }), liveTab("theme", "Konfigurasi Tema", { cfg: "JSON konfigurasi tema." })] });
  M.push({ key: "transactions", label: "Manajemen Transaksi", icon: "card", perm: "transactions", grp: "Bisnis", tabs: (function () {
    var base = { rpc: "admin_list_transactions", search: ["number", "owner_name", "owner_email", "order_id", "transaction_id"], noCreate: true, noDelete: true, noEdit: true, detail: transactionPage,
      title: function (r) { return r.number; },
      filters: [{ k: "status", l: "Status invoice", o: [["menunggu", "Menunggu"], ["lunas", "Lunas"], ["gagal", "Gagal"], ["dibatalkan", "Dibatalkan"], ["refund", "Refund"]] }, { k: "midtrans_status", l: "Status Midtrans", o: [["pending", "Pending"], ["settlement", "Settlement"], ["capture", "Capture"], ["expire", "Expire"], ["cancel", "Cancel"], ["deny", "Deny"], ["refund", "Refund"]] }],
      cols: [{ k: "number", l: "Invoice", f: function (v, r) { return "<b>" + esc(v) + '</b><span class="cell-s">' + esc(r.owner_name || "-") + " &middot; " + esc(r.owner_email || "") + "</span>"; } }, { k: "description", l: "Keterangan" }, { k: "amount", l: "Jumlah", num: 1, f: rp },
        { k: "status", l: "Status", f: function (v, r) { return badge(v) + (r.needs_review ? ' <span class="badge warn">Perlu tinjauan</span>' : "") + (r.refund_status === "diajukan" ? ' <span class="badge warn">Refund diajukan</span>' : ""); } },
        { k: "midtrans_status", l: "Midtrans (asli)", f: function (v, r) { return esc(v || "-") + '<span class="cell-s">' + esc(r.payment_type || "") + "</span>"; } }, { k: "created_at", l: "Tanggal", f: function (v) { return dt(v, 1); } }] };
    return [Object.assign({ key: "all", label: "Semua transaksi" }, base),
      Object.assign({}, base, { key: "pending", label: "Menunggu pembayaran", fixed: { status: "menunggu" }, filters: [], emptyText: "Tidak ada transaksi yang menunggu pembayaran." }),
      Object.assign({}, base, { key: "refund", label: "Refund", fixed: { in_refund: "ya" }, filters: [], emptyText: "Belum ada refund." }),
      Object.assign({}, base, { key: "review", label: "Perlu tinjauan", fixed: { needs_review: "true" }, filters: [], emptyText: "Tidak ada transaksi yang perlu ditinjau." }),
      { key: "rep", label: "Laporan & Ekspor", render: txReport }];
  })() });
  M.push({ key: "plans", label: "Paket & Harga", icon: "crown", perm: "plans", tabs: [{ key: "items", label: "Paket", table: "plans", order: ["sort", true], noCreate: true, noDelete: true, title: function (r) { return r.name; }, cols: [{ k: "name", l: "Paket", f: function (v) { return "<b>" + esc(v) + "</b>"; } }, { k: "price", l: "Harga", num: 1, f: rp }, { k: "duration_days", l: "Durasi", num: 1, f: function (v) { return v + " hari"; } }, { k: "gallery_limit", l: "Galeri", num: 1, f: function (v) { return v + " foto"; } }, { k: "template_quota", l: "Kuota template", num: 1, f: function (v) { return v == null ? "Tanpa batas" : v; } }, { k: "active", l: "Status", f: function (v) { return badge(v ? "aktif" : "nonaktif"); } }], fields: [{ k: "name", l: "Nama paket", req: 1, max: 40 }, { k: "price", l: "Harga (Rp)", t: "number", req: 1, min: 0 }, { k: "duration_days", l: "Durasi (hari)", t: "number", req: 1, min: 1 }, { k: "gallery_limit", l: "Batas foto galeri", t: "number", req: 1, min: 0 }, { k: "template_quota", l: "Kuota template", t: "number", min: 0, help: "Kosongkan = tanpa batas." }, { k: "sort", l: "Urutan", t: "number", def: 0 }, { k: "features", l: "Fitur paket", t: "textarea", full: 1 }, { k: "active", l: "Aktif", t: "bool", def: true }], extra: function (r, box) { box.innerHTML = '<div class="note">Harga di landing page saat ini masih tertulis di halaman dan belum membaca tabel ini. Ubah juga di landing sampai keduanya dihubungkan.</div>'; } }] });
  function ctab(type, label, extraFields) { var f = [{ k: "title", l: "Judul", req: 1, full: 1, max: 200 }].concat(extraFields || []).concat([{ k: "status", l: "Status", t: "select", opts: PUB, req: 1, def: "draft" }, { k: "sort", l: "Urutan", t: "number", def: 0 }]); return { key: type, label: label, table: "contents", fixed: { type: type }, order: ["sort", true], search: ["title", "slug"], title: function (r) { return r.title; }, filters: [{ k: "status", l: "Status", o: PUB }], cols: [{ k: "title", l: "Judul", f: function (v, r) { return "<b>" + esc(v) + "</b>" + (r.slug ? '<span class="cell-s">/' + esc(r.slug) + "</span>" : ""); } }, { k: "status", l: "Status", f: badge }, { k: "updated_at", l: "Diperbarui", f: function (v) { return dt(v); } }], fields: f, beforeSave: function (p) { p.updated_at = new Date().toISOString(); }, actions: [{ l: "Publikasikan", perm: "content", show: function (r) { return r.status !== "published"; }, patch: function () { return { status: "published", updated_at: new Date().toISOString() }; } }, { l: "Jadikan draft", perm: "content", o: true, show: function (r) { return r.status === "published"; }, patch: function () { return { status: "draft", updated_at: new Date().toISOString() }; } }] }; }
  var SEO = [{ k: "seo_title", l: "SEO title", full: 1, max: 70, help: "Ideal sampai 60 karakter." }, { k: "seo_description", l: "SEO meta description", t: "textarea", full: 1, max: 170, help: "Ideal sampai 160 karakter." }];
  M.push({ key: "content", label: "Manajemen Konten", icon: "doc", perm: "content", grp: "Komunikasi", tabs: [ctab("banner", "Banner", [{ k: "image_url", l: "Gambar banner", t: "image", folder: "banners", full: 1 }, { k: "link_url", l: "Tautan", full: 1 }]), ctab("faq", "FAQ", [{ k: "body", l: "Jawaban", t: "textarea", req: 1, full: 1 }]), ctab("tutorial", "Tutorial", [{ k: "body", l: "Isi tutorial", t: "textarea", req: 1, full: 1 }]), ctab("article", "Artikel / Blog", [{ k: "slug", l: "Slug", req: 1, pat: /^[a-z0-9-]+$/ }, { k: "image_url", l: "Gambar sampul", t: "image", folder: "articles", full: 1 }, { k: "body", l: "Isi artikel", t: "textarea", req: 1, full: 1 }].concat(SEO)), ctab("page", "Halaman Informasi", [{ k: "slug", l: "Slug", req: 1, pat: /^[a-z0-9-]+$/ }, { k: "body", l: "Isi halaman", t: "textarea", req: 1, full: 1 }].concat(SEO))] });
  M.push({ key: "affiliate", label: "Affiliate & Referral", icon: "share", perm: "affiliate", grp: "Bisnis", tabs: [
    { key: "list", label: "Affiliate", table: "affiliates", select: "*,profiles(full_name)", order: ["created_at", false], search: ["code"], noCreate: true, noDelete: true, title: function (r) { return r.code; }, filters: [{ k: "status", l: "Status", o: [["pending", "Pending"], ["aktif", "Aktif"], ["suspended", "Suspended"]] }], cols: [{ k: "code", l: "Kode", f: function (v, r) { return "<b>" + esc(v) + '</b><span class="cell-s">' + esc(nameOf(r)) + "</span>"; } }, { k: "status", l: "Status", f: badge }, { k: "created_at", l: "Terdaftar", f: function (v) { return dt(v); } }], fields: [{ k: "status", l: "Status", t: "select", req: 1, opts: [["pending", "Pending"], ["aktif", "Aktif"], ["suspended", "Suspended"]] }], actions: [{ l: "Setujui", perm: "affiliate", show: function (r) { return r.status !== "aktif"; }, patch: function () { return { status: "aktif" }; } }, { l: "Suspend", perm: "affiliate", o: true, cls: "bad", show: function (r) { return r.status === "aktif"; }, patch: function () { return { status: "suspended" }; } }] },
    { key: "ref", label: "Referral", table: "referrals", select: "*,affiliates(code)", order: ["created_at", false], noCreate: true, noDelete: true, title: function (r) { return "Referral"; }, filters: [{ k: "status", l: "Status", o: [["terdaftar", "Terdaftar"], ["berbayar", "Berbayar"], ["batal", "Batal"]] }], cols: [{ k: "affiliates", l: "Affiliate", f: function (v) { return esc(v && v.code || "-"); } }, { k: "status", l: "Status", f: badge }, { k: "commission", l: "Komisi", num: 1, f: rp }, { k: "created_at", l: "Tanggal", f: function (v) { return dt(v); } }], fields: [{ k: "status", l: "Status", t: "select", req: 1, opts: [["terdaftar", "Terdaftar"], ["berbayar", "Berbayar"], ["batal", "Batal"]] }, { k: "commission", l: "Komisi (Rp)", t: "number", min: 0, req: 1 }] },
    { key: "bonus", label: "Komisi & Bonus", table: "bonus_history", select: "*,profiles(full_name)", order: ["created_at", false], search: ["description"], noEdit: true, noDelete: true, title: function () { return "Catatan bonus"; }, cols: [{ k: "profiles", l: "Pelanggan", f: function (v) { return esc(v && v.full_name || "-"); } }, { k: "description", l: "Keterangan" }, { k: "amount", l: "Jumlah", num: 1, f: rp }, { k: "created_at", l: "Tanggal", f: function (v) { return dt(v); } }], fields: [{ k: "user_id", l: "Pelanggan", t: "select", req: 1, full: 1, load: function () { return sb.from("profiles").select("id,full_name").order("full_name").limit(500).then(function (r) { return (r.data || []).map(function (x) { return [x.id, x.full_name]; }); }); } }, { k: "description", l: "Keterangan", req: 1, full: 1 }, { k: "amount", l: "Jumlah (Rp, negatif = koreksi)", t: "number", req: 1 }], note: "Catatan bonus bersifat ledger: tidak bisa diubah/dihapus, dan otomatis menyesuaikan saldo bonus pelanggan." },
    { key: "wd", label: "Pencairan", table: "withdrawals", select: "*,profiles(full_name)", order: ["created_at", false], noCreate: true, noDelete: true, title: function () { return "Pencairan"; }, filters: [{ k: "status", l: "Status", o: [["diproses", "Diproses"], ["berhasil", "Berhasil"], ["ditolak", "Ditolak"]] }], cols: [{ k: "profiles", l: "Pelanggan", f: function (v) { return esc(v && v.full_name || "-"); } }, { k: "amount", l: "Jumlah", num: 1, f: rp }, { k: "destination", l: "Tujuan", f: function (v) { return esc(v || "-"); } }, { k: "status", l: "Status", f: badge }, { k: "created_at", l: "Diajukan", f: function (v) { return dt(v); } }], fields: [{ k: "status", l: "Status", t: "select", req: 1, opts: [["diproses", "Diproses"], ["berhasil", "Berhasil"], ["ditolak", "Ditolak"]] }], actions: [{ l: "Tandai berhasil", perm: "affiliate", show: function (r) { return r.status === "diproses"; }, confirm: "Tandai pencairan ini berhasil? Pastikan transfer sudah dilakukan.", patch: function () { return { status: "berhasil" }; } }, { l: "Tolak", perm: "affiliate", o: true, cls: "bad", show: function (r) { return r.status === "diproses"; }, patch: function () { return { status: "ditolak" }; } }] },
    { key: "rep", label: "Laporan", render: affiliateReport }] });
  var TKSLA = { berjalan: ["Dalam SLA", "ok"], terlambat: ["Terlambat", "bad"], terpenuhi: ["Respons tepat waktu", "ok"], terlambat_dibalas: ["Dibalas terlambat", "warn"], selesai: ["-", ""] };
  var TKSTAT = [["open", "Open"], ["diproses", "In Progress"], ["menunggu_pelanggan", "Waiting for Customer"], ["selesai", "Resolved"], ["ditutup", "Closed"]];
  var TKPRI = [["rendah", "Rendah"], ["normal", "Normal"], ["tinggi", "Tinggi"]];
  var TKCAT = { bantuan: "Bantuan", pembayaran: "Pembayaran", teknis: "Teknis", komplain: "Komplain", lainnya: "Lainnya" };
  function tkSla(v) { var x = TKSLA[v] || [v || "-", ""]; return '<span class="badge ' + x[1] + '">' + esc(x[0]) + "</span>"; }
  function ticketTab(key, label, fixed, empty_) {
    return { key: key, label: label, rpc: "admin_list_tickets", fixed: fixed, search: ["subject", "owner_name", "owner_email"], noCreate: true, noDelete: true, noEdit: true, detail: ticketPage, emptyText: empty_ || "Belum ada tiket. Pelanggan membuat tiket dari menu Bantuan di dashboard mereka.", title: function (r) { return r.subject; },
      filters: fixed ? [] : [{ k: "status", l: "Status", o: TKSTAT }, { k: "priority", l: "Prioritas", o: TKPRI }, { k: "category", l: "Kategori", o: Object.keys(TKCAT).map(function (k) { return [k, TKCAT[k]]; }) }, { k: "sla", l: "SLA", o: [["terlambat", "Terlambat"], ["berjalan", "Dalam SLA"], ["terpenuhi", "Respons tepat waktu"], ["terlambat_dibalas", "Dibalas terlambat"]] }],
      cols: [{ k: "subject", l: "Tiket", f: function (v, r) { return "<b>" + esc(v) + '</b><span class="cell-s">' + esc(r.owner_name || "-") + " &middot; " + esc(TKCAT[r.category] || r.category) + (r.file_count ? " &middot; " + r.file_count + " lampiran" : "") + "</span>"; } },
        { k: "priority", l: "Prioritas", f: badge }, { k: "status", l: "Status", f: badge }, { k: "assigned_name", l: "Penanggung jawab", f: function (v) { return v ? esc(v) : '<span class="badge warn">Belum ditugaskan</span>'; } },
        { k: "sla", l: "SLA respons", f: function (v, r) { return tkSla(v) + (v === "berjalan" || v === "terlambat" ? '<span class="cell-s">' + (v === "terlambat" ? "lewat " : "batas ") + dt(r.due_at, 1) + "</span>" : ""); } }, { k: "updated_at", l: "Diperbarui", f: function (v) { return dt(v, 1); } }] };
  }
  M.push({ key: "support", label: "Customer Support", icon: "help", perm: "support", grp: "Komunikasi", tabs: [ticketTab("all", "Semua tiket", null),
    ticketTab("mine", "Tiket saya", { mine: "true" }, "Tidak ada tiket yang ditugaskan kepada Anda."), ticketTab("unassigned", "Belum ditugaskan", { unassigned: "true" }, "Semua tiket sudah ditugaskan."), ticketTab("late", "Terlambat SLA", { sla: "terlambat" }, "Tidak ada tiket yang melewati batas respons."),
    ticketTab("kom", "Komplain", { category: "komplain" }), ticketTab("tanya", "Pertanyaan", { category: "bantuan" }), { key: "rep", label: "Ringkasan SLA", render: supportReport }] });
  M.push({ key: "reports", label: "Laporan & Analytics", icon: "bars", perm: "reports", grp: "Bisnis", render: renderReports });
  M.push({ key: "notifications", label: "Notifikasi", icon: "bell", perm: "notifications", grp: "Komunikasi", tabs: [{ key: "ann", label: "Pengumuman", table: "announcements", order: ["created_at", false], search: ["title"], title: function (r) { return r.title; }, filters: [{ k: "channel", l: "Kanal", o: [["system", "Sistem"], ["email", "Email"], ["whatsapp", "WhatsApp"]] }, { k: "status", l: "Status", o: [["draft", "Draft"], ["terjadwal", "Terjadwal"], ["terkirim", "Terkirim"]] }], cols: [{ k: "title", l: "Judul", f: function (v) { return "<b>" + esc(v) + "</b>"; } }, { k: "channel", l: "Kanal" }, { k: "audience", l: "Audiens" }, { k: "status", l: "Status", f: badge }, { k: "created_at", l: "Dibuat", f: function (v) { return dt(v); } }], fields: [{ k: "title", l: "Judul", req: 1, full: 1, max: 160 }, { k: "body", l: "Isi pesan", t: "textarea", req: 1, full: 1 }, { k: "channel", l: "Kanal", t: "select", req: 1, opts: [["system", "Sistem (dalam aplikasi)"], ["email", "Email"], ["whatsapp", "WhatsApp"]] }, { k: "audience", l: "Audiens", t: "select", req: 1, opts: [["semua", "Semua pelanggan"], ["pelanggan_aktif", "Pelanggan berlangganan aktif"], ["affiliate", "Affiliate"], ["admin", "Admin"]] }, { k: "status", l: "Status", t: "select", req: 1, opts: [["draft", "Draft"], ["terjadwal", "Terjadwal"], ["terkirim", "Terkirim"]], def: "draft" }, { k: "scheduled_at", l: "Jadwal kirim", t: "datetime" }], note: "Pengumuman tersimpan di database. Pengiriman email dan WhatsApp otomatis membutuhkan layanan pengirim di server dan belum terhubung; status \"Terkirim\" saat ini dicatat manual." }, { key: "alerts", label: "System Alerts", render: renderAlerts }] });
  var SET = {
    platform: [{ k: "platform_name", l: "Nama platform", def: "NusaMora" }, { k: "platform_tagline", l: "Tagline", full: 1 }, { k: "support_email", l: "Email dukungan", t: "email" }, { k: "support_whatsapp", l: "WhatsApp dukungan" }, { k: "maintenance_mode", l: "Mode pemeliharaan", t: "bool" }],
    brand: [{ k: "logo_url", l: "Logo", t: "image", folder: "brand", full: 1 }, { k: "favicon_url", l: "Favicon", t: "image", folder: "brand", full: 1 }, { k: "brand_primary", l: "Warna utama", t: "color", def: "#9673D0" }, { k: "brand_deep", l: "Warna deep", t: "color", def: "#7552A8" }],
    pay: [{ k: "midtrans_mode", l: "Mode Midtrans", t: "select", opts: [["sandbox", "Sandbox"], ["production", "Production"]], def: "sandbox" }, { k: "midtrans_merchant_id", l: "Merchant ID" }, { k: "midtrans_client_key", l: "Client key (publik)", full: 1 }, { k: "bank_transfer_info", l: "Info rekening transfer", t: "textarea", full: 1 }],
    email: [{ k: "email_sender_name", l: "Nama pengirim" }, { k: "email_sender_address", l: "Alamat pengirim", t: "email" }, { k: "smtp_host", l: "SMTP host" }, { k: "smtp_port", l: "SMTP port", t: "number" }],
    storage: [{ k: "storage_bucket", l: "Bucket aset publik", def: "site-assets", ro: 1 }, { k: "max_upload_mb", l: "Batas unggah (MB)", t: "number", min: 1, max: 20, def: 2 }],
    domain: [{ k: "domain_primary", l: "Domain utama", def: "nusamora.com" }, { k: "domain_staging", l: "Domain uji coba" }],
    seo: [{ k: "seo_title", l: "SEO title bawaan", full: 1, max: 70 }, { k: "seo_description", l: "SEO meta description", t: "textarea", full: 1, max: 170 }, { k: "og_image", l: "Gambar Open Graph", t: "image", folder: "brand", full: 1 }]
  };
  var NOTE = { pay: "Jangan simpan server key Midtrans di sini. Simpan sebagai secret di server/Edge Function. Pengaturan ini baru dicatat; koneksi pembayaran otomatis belum aktif.", email: "Jangan simpan password SMTP di sini. Simpan di pengaturan Authentication > SMTP Supabase atau secret server.", storage: "File diunggah ke bucket publik Supabase Storage.", domain: "Mengganti domain perlu pengaturan DNS dan Redirect URL di Supabase." };
  M.push({ key: "settings", label: "Pengaturan Sistem", icon: "cog", perm: "settings", grp: "Sistem", tabs: [["platform", "Profil Platform"], ["brand", "Logo & Branding"], ["pay", "Payment Gateway"], ["email", "Email"], ["storage", "Storage"], ["domain", "Domain"], ["seo", "SEO"]].map(function (x) { return { key: x[0], label: x[1], settings: SET[x[0]], note: NOTE[x[0]] }; }) });
  M.push({ key: "admins", label: "Admin & Role", icon: "shield", perm: "admins", grp: "Sistem", tabs: [
    { key: "list", label: "Admin Users", rpc: "admin_list_admins", search: ["email"], noEdit: true, noDelete: true, title: function (r) { return r.email; }, addBtn: { l: "Tambah admin", fields: [{ k: "email", l: "Email akun terdaftar", t: "email", req: 1, full: 1, help: "Orang ini harus sudah mendaftar di /daftar." }, { k: "role", l: "Peran", t: "select", req: 1, opts: Object.keys(ROLE).map(function (k) { return [k, ROLE[k]]; }) }], run: function (v) { return sb.rpc("admin_add_admin", { p_email: v.email, p_role: v.role }); } }, filters: [{ k: "role", l: "Peran", o: Object.keys(ROLE).map(function (k) { return [k, ROLE[k]]; }) }], cols: [{ k: "email", l: "Admin", f: function (v) { return "<b>" + esc(v) + "</b>"; } }, { k: "role", l: "Peran", f: function (v) { return esc(ROLE[v] || v); } }, { k: "active", l: "Status", f: function (v) { return badge(v ? "aktif" : "nonaktif"); } }, { k: "created_at", l: "Ditambahkan", f: function (v) { return dt(v); } }],
      actions: [{ l: "Ubah peran", perm: "admins", o: true, fields: [{ k: "role", l: "Peran baru", t: "select", req: 1, opts: Object.keys(ROLE).map(function (k) { return [k, ROLE[k]]; }) }], guard: function (r) { return r.user_id === A.user.id ? "Anda tidak dapat mengubah peran akun sendiri." : ""; }, run: function (r, v) { return sb.from("admin_users").update({ role: v.role }).eq("user_id", r.user_id); } }, { l: "Nonaktifkan", perm: "admins", cls: "bad", show: function (r) { return r.active; }, guard: function (r) { return r.user_id === A.user.id ? "Anda tidak dapat menonaktifkan akun sendiri." : ""; }, confirm: "Nonaktifkan admin ini?", run: function (r) { return sb.from("admin_users").update({ active: false }).eq("user_id", r.user_id); } }, { l: "Aktifkan", perm: "admins", show: function (r) { return !r.active; }, run: function (r) { return sb.from("admin_users").update({ active: true }).eq("user_id", r.user_id); } }] },
    { key: "roles", label: "Peran & Izin", render: renderRoles },
    { key: "audit", label: "Audit Log", table: "audit_logs", order: ["created_at", false], search: ["table_name", "action"], noCreate: true, noEdit: true, noDelete: true, title: function (r) { return r.action + " " + r.table_name; }, filters: [{ k: "action", l: "Aksi", o: [["insert", "Tambah"], ["update", "Ubah"], ["delete", "Hapus"], ["status_pelanggan", "Status pelanggan"], ["reset_akses", "Reset akses pelanggan"]] }], cols: [{ k: "created_at", l: "Waktu", f: function (v) { return dt(v, 1); } }, { k: "actor_id", l: "Admin", f: function (v) { return esc(adminName(v)); } }, { k: "action", l: "Aksi" }, { k: "table_name", l: "Tabel" }, { k: "row_id", l: "ID baris", f: function (v) { return esc(String(v || "-").slice(0, 12)); } }], fields: [{ k: "summary", l: "Ringkasan perubahan", f: function (v) { return "<code>" + esc(JSON.stringify(v)) + "</code>"; } }] }] });
  var adminMap = {}; function adminName(id) { return adminMap[id] || (id ? String(id).slice(0, 8) : "sistem"); }

  /* ================= engine tabel ================= */
  var ST_ = {}; // state per tab
  function tstate(k) { return ST_[k] || (ST_[k] = { q: "", page: 0, f: {} }); }
  var SIZE = 10;
  function curMod() { return M.filter(function (m) { return m.key === R.m; })[0]; }
  function curTab() { var m = curMod(); return m && m.tabs ? (m.tabs.filter(function (t) { return t.key === R.t; })[0] || m.tabs[0]) : null; }
  function clean(s) { return String(s).replace(/[,()%*\\]/g, " ").trim(); }
  function fetchRows(tab, st) {
    if (tab.rpc) return sb.rpc(tab.rpc).then(function (r) {
      if (r.error) throw r.error; var rows = r.data || [], q = st.q.toLowerCase();
      rows = rows.filter(function (x) { return Object.keys(tab.fixed || {}).every(function (k) { return String(x[k]) === String(tab.fixed[k]); }) && (!q || (tab.search || []).some(function (c) { return String(x[c] || "").toLowerCase().indexOf(q) > -1; })) && Object.keys(st.f).every(function (k) { return !st.f[k] || String(x[k]) === st.f[k]; }); });
      return { rows: rows.slice(st.page * SIZE, st.page * SIZE + SIZE), total: rows.length };
    });
    var qy = sb.from(tab.table).select(tab.select || "*", { count: "exact" });
    Object.keys(tab.fixed || {}).forEach(function (k) { qy = qy.eq(k, tab.fixed[k]); });
    Object.keys(st.f).forEach(function (k) { if (st.f[k]) qy = qy.eq(k, st.f[k]); });
    if (st.q && tab.search) qy = qy.or(tab.search.map(function (c) { return c + ".ilike.%" + clean(st.q) + "%"; }).join(","));
    var o = tab.order || ["created_at", false]; qy = qy.order(o[0], { ascending: o[1] }).range(st.page * SIZE, st.page * SIZE + SIZE - 1);
    return qy.then(function (r) { if (r.error) throw r.error; return { rows: r.data || [], total: r.count == null ? (r.data || []).length : r.count }; }).then(function (res) { return tab.enrich ? tab.enrich(res.rows).then(function () { return res; }, function () { return res; }) : res; });
  }
  var LAST = { rows: [] };
  function renderTable(tab, root) {
    var mod = curMod(), st = tstate(mod.key + ":" + tab.key), canW = can(mod.perm, "write");
    var fl = (tab.filters || []).map(function (f) { return '<label class="fld">' + esc(f.l) + '<select data-f="' + f.k + '"><option value="">Semua</option>' + f.o.map(function (o) { return '<option value="' + esc(o[0]) + '"' + (st.f[f.k] === o[0] ? " selected" : "") + ">" + esc(o[1]) + "</option>"; }).join("") + "</select></label>"; }).join("");
    var add = tab.addBtn && canW ? '<button class="btn" type="button" data-add>' + ico("plus") + " " + esc(tab.addBtn.l) + "</button>" : (!tab.noCreate && tab.fields && canW ? '<button class="btn" type="button" data-new>' + ico("plus") + " Tambah</button>" : "");
    root.innerHTML = '<div class="tool">' + (tab.search ? '<label class="fld grow">Cari<span class="sbox"><input type="search" data-q placeholder="Ketik lalu Enter..." value="' + esc(st.q) + '"></span></label>' : "") + fl + add + '</div><div class="card" id="tb"><div class="sk h4"></div></div>';
    var tb = $("#tb", root);
    fetchRows(tab, st).then(function (res) {
      LAST = res;
      if (!res.rows.length) { tb.innerHTML = empty(st.q || Object.keys(st.f).some(function (k) { return st.f[k]; }) ? "Tidak ada hasil" : "Belum ada data", st.q || Object.keys(st.f).length ? "Ubah kata kunci atau filter." : (tab.emptyText || "Data akan muncul di sini."), !tab.noCreate && tab.fields && canW && !st.q ? '<button class="btn" type="button" data-new>' + ico("plus") + " Tambah</button>" : ""); return; }
      var head = tab.cols.map(function (c) { return "<th" + (c.num ? ' class="num"' : "") + ">" + esc(c.l) + "</th>"; }).join("");
      var body = res.rows.map(function (r, i) { return '<tr class="row" tabindex="0" data-i="' + i + '">' + tab.cols.map(function (c) { return "<td" + (c.num ? ' class="num"' : "") + ">" + (c.f ? c.f(r[c.k], r) : esc(r[c.k] == null ? "-" : r[c.k])) + "</td>"; }).join("") + "</tr>"; }).join("");
      var pages = Math.max(1, Math.ceil(res.total / SIZE));
      tb.innerHTML = '<div class="tbl-w"><table><thead><tr>' + head + "</tr></thead><tbody>" + body + '</tbody></table></div><div class="pager"><span>' + (st.page * SIZE + 1) + "&ndash;" + (st.page * SIZE + res.rows.length) + " dari " + res.total + '</span><div><button class="btn o sm" type="button" data-pg="-1"' + (st.page === 0 ? " disabled" : "") + '>Sebelumnya</button><button class="btn o sm" type="button" data-pg="1"' + (st.page + 1 >= pages ? " disabled" : "") + ">Berikutnya</button></div></div>";
    }).catch(function (e) { tb.innerHTML = empty("Data tidak bisa dimuat", e && e.code === "42P01" || e && e.code === "PGRST205" ? "Tabel belum dibuat. Jalankan backend/admin-schema.sql di Supabase." : (e && e.code === "42501" ? "Anda tidak punya izin untuk melihat data ini." : "Terjadi kendala saat memuat" + (e && e.message ? ": " + e.message : ". Coba lagi.")), '<button class="btn" type="button" data-retry>Coba lagi</button>'); });
  }
  function openRow(tab, row, reload) { if (tab.detail) { location.hash = "#" + curMod().key + ":" + tab.key + ":" + row[tab.pk || "id"]; return; } openDetail(tab, row, reload); }
  function bindTable(tab, root) {
    var mod = curMod(), key = mod.key + ":" + tab.key, st = tstate(key), reload = function () { renderTable(tab, root); bindTable(tab, root); };
    root.onclick = function (e) {
      var pg = e.target.closest("[data-pg]"); if (pg) { st.page = Math.max(0, st.page + Number(pg.dataset.pg)); return reload(); }
      if (e.target.closest("[data-retry]")) return reload();
      if (e.target.closest("[data-new]")) return openForm(tab, null, reload);
      if (e.target.closest("[data-add]")) return openForm({ fields: tab.addBtn.fields, title: function () { return tab.addBtn.l; }, custom: tab.addBtn.run }, null, reload, tab.addBtn.l);
      var tr = e.target.closest("tr[data-i]"); if (tr) openRow(tab, LAST.rows[Number(tr.dataset.i)], reload);
    };
    root.onkeydown = function (e) { if (e.key === "Enter" && e.target.matches("tr[data-i]")) openRow(tab, LAST.rows[Number(e.target.dataset.i)], reload); if (e.key === "Enter" && e.target.matches("[data-q]")) { e.preventDefault(); st.q = e.target.value.trim(); st.page = 0; reload(); $("[data-q]", root).focus(); } };
    root.onchange = function (e) { var s = e.target.closest("[data-f]"); if (s) { st.f[s.dataset.f] = s.value; st.page = 0; reload(); } };
  }

  /* ---------- drawer detail ---------- */
  function showVal(f, v) { if (f.f) return f.f(v); if (v == null || v === "") return "-"; if (f.t === "bool") return v ? "Ya" : "Tidak"; if (f.t === "image") return v ? '<img src="' + esc(v) + '" alt="" style="max-width:160px;border-radius:10px">' : "-"; if (f.t === "datetime") return esc(dt(v, 1)); if (f.k === "amount" || f.k === "price") return esc(rp(v)); return esc(typeof v === "object" ? JSON.stringify(v) : v); }
  function openDetail(tab, row, reload) {
    var mod = curMod(), canW = can(mod.perm, "write"), seen = {}, kv = "";
    (tab.cols || []).forEach(function (c) { if (!c.l) return; seen[c.k] = 1; kv += "<div><span>" + esc(c.l) + "</span><b>" + (c.f ? c.f(row[c.k], row) : esc(row[c.k] == null ? "-" : row[c.k])) + "</b></div>"; });
    (tab.fields || []).forEach(function (f) { if (seen[f.k]) return; kv += "<div><span>" + esc(f.l) + "</span><b>" + showVal(f, row[f.k]) + "</b></div>"; });
    var btns = "";
    (tab.actions || []).forEach(function (a, i) { if (a.show && !a.show(row)) return; if (a.perm && !can(a.perm, "write")) return; btns += '<button class="btn' + (a.o ? " o" : "") + " " + (a.cls || "") + '" type="button" data-ai="' + i + '">' + esc(a.l) + "</button>"; });
    if (canW && tab.fields && !tab.noEdit && !tab.noEditRow) btns += '<button class="btn o" type="button" data-edit>Edit</button>';
    if (canW && tab.table && !tab.noDelete) btns += '<button class="btn o bad" type="button" data-del>Hapus</button>';
    $("#dr-t").textContent = tab.title ? tab.title(row) : "Detail";
    var b = $("#dr-b"); b.innerHTML = '<div class="kv">' + kv + '</div><div class="btns">' + btns + '</div><div id="dr-x1"></div>';
    var close = function (rl) { closeDrawer(); if (rl) reload(); };
    b.onclick = function (e) {
      var ab = e.target.closest("[data-ai]"), pk = tab.pk || "id";
      if (e.target.closest("[data-edit]")) { closeDrawer(); return openForm(tab, row, reload); }
      if (e.target.closest("[data-del]")) { dlgConfirm("Hapus data ini? Tindakan tidak bisa dibatalkan.", "Hapus").then(function (ok) { if (!ok) return; sb.from(tab.table).delete().eq(pk, row[pk]).then(function (r) { if (r.error) return fail(r.error, "Gagal menghapus"); toast("Data dihapus.", "ok"); close(true); }); }); return; }
      if (!ab) return; var a = tab.actions[Number(ab.dataset.ai)];
      var g = a.guard && a.guard(row); if (g) return toast(g, "bad");
      var go = function (v) {
        var p; try { if (a.rpc) { var c = a.rpc(row, v); p = sb.rpc(c[0], c[1]); } else if (a.run) p = a.run(row, v || {}); else p = sb.from(tab.table).update(a.patch(row, v || {})).eq(tab.pk || "id", row[tab.pk || "id"]); } catch (er) { return fail(er); }
        Promise.resolve(p).then(function (r) { if (r && r.error) return fail(r.error, "Tindakan gagal"); toast(a.l + " berhasil.", "ok"); close(true); }, function (er) { fail(er); });
      };
      var step = function () { if (a.fields) openForm({ fields: a.fields, title: function () { return a.l; }, custom: function (v) { go(v); return Promise.resolve({}); }, noToast: 1 }, null, function () { }, a.l); else go(); };
      if (a.confirm) dlgConfirm(a.confirm, a.l).then(function (ok) { if (ok) step(); }); else step();
    };
    openDrawer(); if (tab.extra) tab.extra(row, $("#dr-x1"), reload);
  }
  var lastFocus = null;
  function openDrawer() { lastFocus = d.activeElement; $("#drawer").hidden = false; $("#dr-scrim").hidden = false; $("#dr-x").focus(); }
  function closeDrawer() { $("#drawer").hidden = true; $("#dr-scrim").hidden = true; if (lastFocus && lastFocus.focus) lastFocus.focus(); }
  $("#dr-x").addEventListener("click", closeDrawer); $("#dr-scrim").addEventListener("click", closeDrawer);

  /* ---------- form dialog ---------- */
  function buildField(f, val) {
    var id = "ff-" + f.k, v = val == null ? (f.def == null ? "" : f.def) : val, cls = "fld" + (f.full || f.t === "textarea" || f.t === "image" ? " full" : ""), h = "", req = f.req ? " required" : "", ro = f.ro && val != null ? " readonly" : "";
    if (f.t === "bool") return '<label class="chk-l full"><input type="checkbox" id="' + id + '"' + (v === true || v === "true" ? " checked" : "") + "> " + esc(f.l) + "</label>";
    if (f.t === "textarea") h = '<textarea id="' + id + '"' + req + (f.max ? ' maxlength="' + f.max + '"' : "") + ">" + esc(f.json && v && typeof v === "object" ? JSON.stringify(v) : v) + "</textarea>";
    else if (f.t === "select") h = '<select id="' + id + '"' + req + ' data-sel="' + esc(v) + '"><option value="">' + (f.req ? "Pilih..." : "-") + "</option>" + (f.opts || []).map(function (o) { return '<option value="' + esc(o[0]) + '"' + (String(o[0]) === String(v) ? " selected" : "") + ">" + esc(o[1]) + "</option>"; }).join("") + "</select>";
    else if (f.t === "image") h = '<div class="imgf"><img id="' + id + '-p" src="' + esc(v || "") + '" alt=""' + (v ? "" : " hidden") + '><input type="file" id="' + id + '-f" accept="image/png,image/jpeg,image/webp"><input type="hidden" id="' + id + '" value="' + esc(v) + '"></div>';
    else { var t = f.t === "number" ? "number" : f.t === "date" ? "date" : f.t === "datetime" ? "datetime-local" : f.t === "email" ? "email" : f.t === "color" ? "color" : "text"; if (t === "date") v = v ? String(v).slice(0, 10) : ""; if (t === "datetime-local") v = localDT(v); h = '<input id="' + id + '" type="' + t + '" value="' + esc(v) + '"' + req + ro + (f.min != null ? ' min="' + f.min + '"' : "") + (f.max != null && t !== "text" ? ' max="' + f.max + '"' : "") + (f.max != null && t === "text" ? ' maxlength="' + f.max + '"' : "") + (t === "number" ? ' step="any"' : "") + ">"; }
    return '<div class="' + cls + '"><label for="' + id + '">' + esc(f.l) + (f.req ? " *" : "") + "</label>" + h + (f.help ? "<small>" + esc(f.help) + "</small>" : "") + '<span class="err" id="' + id + '-e"></span></div>';
  }
  function collect(fields, root) {
    var out = {}, ok = true;
    fields.forEach(function (f) {
      var el = $("#ff-" + f.k, root), er = $("#ff-" + f.k + "-e", root), v; if (er) er.textContent = ""; if (!el) return;
      if (f.t === "bool") v = el.checked; else { v = el.value; if (typeof v === "string") v = v.trim(); }
      var bad = "";
      if (f.t !== "bool") { if (f.req && v === "") bad = "Wajib diisi."; else if (v !== "") { if (f.t === "number") { var n = Number(v); if (isNaN(n)) bad = "Harus angka."; else if (f.min != null && n < f.min) bad = "Minimal " + f.min + "."; else if (f.max != null && n > f.max) bad = "Maksimal " + f.max + "."; else v = n; } else if (f.pat && !f.pat.test(v)) bad = "Format tidak valid."; else if (f.t === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) bad = "Format email belum benar."; else if (f.json) { try { v = JSON.parse(v); } catch (e) { bad = "JSON tidak valid."; } } else if (f.t === "datetime") v = new Date(v).toISOString(); } else v = null; }
      if (bad) { ok = false; if (er) er.textContent = bad; el.setAttribute("aria-invalid", "true"); } else el.removeAttribute("aria-invalid");
      out[f.k] = v;
    });
    return ok ? out : null;
  }
  function openForm(tab, row, reload, title) {
    if (tab.studio) return tab.studio(tab, row, reload);
    var dl = $("#fdlg"), form = $("#fdlg-f"), fields = tab.fields, editing = !!row;
    $("#fdlg-t").textContent = title || ((editing ? "Edit " : "Tambah ") + (tab.title && row ? tab.title(row) : "data"));
    form.innerHTML = '<div class="full" id="fe" role="alert"></div><div class="skel full"><div class="sk h2"></div></div>';
    dl.showModal();
    Promise.all(fields.map(function (f) { return f.load ? f.load().then(function (o) { f.opts = o; }) : null; })).then(function () {
      form.innerHTML = fields.map(function (f) { return buildField(f, row ? row[f.k] : null); }).join("") + '<div class="row-end full"><button class="btn o" type="button" id="f-cancel">Batal</button><button class="btn" type="submit" id="f-save">Simpan</button></div><div class="full" id="fe" role="alert"></div>';
      $("#f-cancel").onclick = function () { dl.close(); };
      fields.filter(function (f) { return f.t === "image"; }).forEach(function (f) {
        $("#ff-" + f.k + "-f").onchange = function (e) {
          var file = e.target.files[0], er = $("#ff-" + f.k + "-e"); if (!file) return; er.textContent = "";
          if (!/^image\/(png|jpeg|webp)$/.test(file.type)) { er.textContent = "Hanya PNG, JPG, atau WebP."; return; } if (file.size > 2 * 1024 * 1024) { er.textContent = "Maksimal 2 MB."; return; }
          er.textContent = "Mengunggah..."; var path = (f.folder || "misc") + "/" + Date.now() + "-" + file.name.replace(/[^a-z0-9._-]/gi, "_");
          sb.storage.from("site-assets").upload(path, file, { upsert: false, contentType: file.type }).then(function (r) { if (r.error) { er.textContent = "Gagal mengunggah. Periksa izin & bucket."; return; } var u = sb.storage.from("site-assets").getPublicUrl(path).data.publicUrl; $("#ff-" + f.k).value = u; var p = $("#ff-" + f.k + "-p"); p.src = u; p.hidden = false; er.textContent = ""; });
        };
      });
      form.onsubmit = function (e) {
        e.preventDefault(); var p = collect(fields, form); if (!p) return $("#fe").textContent = "Periksa kolom yang ditandai."; $("#fe").textContent = "";
        var bt = $("#f-save"); bt.disabled = true; bt.textContent = "Menyimpan...";
        var done = function (r) { bt.disabled = false; bt.textContent = "Simpan"; if (r && r.error) { $("#fe").textContent = fail(r.error, "Gagal menyimpan"); return; } dl.close(); if (!tab.noToast) toast("Tersimpan.", "ok"); reload(); };
        if (tab.custom) { Promise.resolve(tab.custom(p)).then(done, function (er) { done({ error: er }); }); return; }
        Object.keys(tab.fixed || {}).forEach(function (k) { p[k] = tab.fixed[k]; }); if (tab.beforeSave) tab.beforeSave(p, row);
        var pk = tab.pk || "id", q = editing ? sb.from(tab.table).update(p).eq(pk, row[pk]) : sb.from(tab.table).insert(p);
        q.then(done, function (er) { done({ error: er }); });
      };
      var fi = $("input,select,textarea", form); if (fi) fi.focus();
    });
  }

  /* ---------- tab khusus: pengaturan ---------- */
  var SETC = null;
  function renderSettings(tab, root) {
    var canW = can(curMod().perm, "write");
    root.innerHTML = '<div class="card setgrp"><div class="sk h4"></div></div>';
    (SETC ? Promise.resolve() : sb.from("app_settings").select("key,value").then(function (r) { if (r.error) throw r.error; SETC = {}; (r.data || []).forEach(function (x) { SETC[x.key] = x.value; }); })).then(function () {
      var fs = tab.settings;
      root.innerHTML = '<form class="card setgrp" id="sf" novalidate>' + (tab.note ? '<div class="note">' + esc(tab.note) + "</div>" : "") + '<div class="fgrid">' + fs.map(function (f) { return buildField(Object.assign({}, f, { req: 0 }), SETC[f.k] != null ? SETC[f.k] : null); }).join("") + "</div>" + (canW ? '<div class="row-end"><button class="btn" type="submit" id="sbtn">Simpan pengaturan</button></div>' : '<p class="sub">Anda hanya punya izin melihat.</p>') + "</form>";
      if (!canW) $$("#sf input,#sf select,#sf textarea").forEach(function (x) { x.disabled = true; });
      fs.filter(function (f) { return f.t === "image"; }).forEach(function (f) { var inp = $("#ff-" + f.k + "-f"); if (!inp) return; inp.onchange = function (e) { var file = e.target.files[0], er = $("#ff-" + f.k + "-e"); if (!file) return; if (!/^image\/(png|jpeg|webp)$/.test(file.type) || file.size > 2097152) { er.textContent = "PNG/JPG/WebP, maksimal 2 MB."; return; } er.textContent = "Mengunggah..."; var path = (f.folder || "misc") + "/" + Date.now() + "-" + file.name.replace(/[^a-z0-9._-]/gi, "_"); sb.storage.from("site-assets").upload(path, file, { contentType: file.type }).then(function (r) { if (r.error) { er.textContent = "Gagal mengunggah."; return; } var u = sb.storage.from("site-assets").getPublicUrl(path).data.publicUrl; $("#ff-" + f.k).value = u; var p = $("#ff-" + f.k + "-p"); p.src = u; p.hidden = false; er.textContent = ""; }); }; });
      $("#sf").onsubmit = function (e) {
        e.preventDefault(); if (!canW) return; var vals = collect(fs.map(function (f) { return Object.assign({}, f, { req: 0 }); }), $("#sf")); if (!vals) return toast("Periksa kolom yang ditandai.", "bad");
        var rows = Object.keys(vals).map(function (k) { return { key: k, value: vals[k] == null ? "" : vals[k], updated_at: new Date().toISOString() }; }), bt = $("#sbtn"); bt.disabled = true;
        sb.from("app_settings").upsert(rows, { onConflict: "key" }).then(function (r) { bt.disabled = false; if (r.error) return fail(r.error, "Gagal menyimpan"); rows.forEach(function (x) { SETC[x.key] = x.value; }); toast("Pengaturan disimpan.", "ok"); });
      };
    }).catch(function (e) { root.innerHTML = errBox(e && e.code === "42P01" ? "Tabel belum dibuat. Jalankan backend/admin-schema.sql." : "Terjadi kendala saat memuat.", 1); });
  }

  /* ---------- extra detail ---------- */
  /* ---------- halaman detail: pelanggan & undangan ---------- */
  var PT = {};
  function lbl(m, k) { return (m[k] || [k || "-"])[0]; }
  function rel(s) { if (!s) return ""; var n = Math.round((new Date(s) - Date.now()) / 864e5); return n >= 0 ? "sisa " + n + " hari" : "lewat " + (-n) + " hari"; }
  function msgOf(e) { var c = e && e.code, m = e && e.message || ""; return c === "42501" || /forbidden/i.test(m) ? "Anda tidak punya izin untuk melihat data ini." : /tidak ditemukan/i.test(m) ? "Data tidak ditemukan atau sudah dihapus." : "Terjadi kendala saat memuat" + (m ? ": " + m : "") + "."; }
  function backTo(h, l) { return '<a class="back" href="#' + h + '">&larr; ' + esc(l) + "</a>"; }
  function stat(l, v) { return '<div class="stat"><span>' + esc(l) + "</span><b>" + v + "</b></div>"; }
  function kvs(rows) { return '<div class="kv">' + rows.map(function (x) { return "<div><span>" + esc(x[0]) + "</span><b>" + x[1] + "</b></div>"; }).join("") + "</div>"; }
  function ptabs(list, cur) { return '<div class="tabs" role="tablist">' + list.map(function (t) { return '<button type="button" role="tab" aria-selected="' + (t[0] === cur) + '" data-pt="' + t[0] + '">' + esc(t[1]) + "</button>"; }).join("") + "</div>"; }
  function tbl(head, rows) { return '<div class="tbl-w"><table><thead><tr>' + head.map(function (h) { return "<th" + (h[1] ? ' class="num"' : "") + ">" + esc(h[0]) + "</th>"; }).join("") + "</tr></thead><tbody>" + rows.join("") + "</tbody></table></div>"; }
  function noteForm(title, req, help, run, reload) { openForm({ fields: [{ k: "note", l: req ? "Alasan" : "Catatan (opsional)", t: "textarea", req: req, full: 1, max: 300, help: help }], title: function () { return title; }, custom: function (v) { return run(v.note || null); } }, null, reload, title); }
  function rpcDone(okMsg, reload) { return function (r) { if (r && r.error) { fail(r.error, "Tindakan gagal"); return; } toast(okMsg, "ok"); reload(); }; }

  /* ================= Customer Support ================= */
  var TKERR = { pesan_tidak_valid: "Pesan 1 sampai 4000 karakter.", tiket_ditutup: "Tiket sudah ditutup, tidak bisa dibalas.", admin_tidak_valid: "Admin ini tidak bisa menerima tiket.", status_tidak_valid: "Status tidak valid.", prioritas_tidak_valid: "Prioritas tidak valid.", tidak_ditemukan: "Tiket tidak ditemukan." };
  function tkRes(r) { if (r.error) return r; if (r.data && r.data.error) return { error: { message: TKERR[r.data.error] || r.data.error, known: 1 } }; return r; }
  function supportReport(root) {
    root.innerHTML = skel();
    sb.rpc("admin_support_overview").then(function (r) {
      if (r.error) throw r.error; var o = r.data || {};
      root.innerHTML = '<div class="stats">' + stat("Tiket aktif", o.open || 0) + stat("Belum ditugaskan", o.unassigned || 0) + stat("Terlambat SLA", o.overdue || 0) + stat("Selesai 30 hari", o.resolved_30d || 0) + stat("Rata-rata respons pertama (30 hari)", o.avg_first_response_hours == null ? "-" : o.avg_first_response_hours + " jam") + "</div>" +
        '<div class="card"><div class="sect"><h3>Batas SLA respons pertama</h3><p class="sub" style="margin:0">Tinggi 4 jam, Normal 24 jam, Rendah 48 jam. Tiket kategori Pembayaran dan Komplain otomatis berprioritas Tinggi. Batas dihitung ulang saat prioritas diubah.</p></div></div>';
    }).catch(function (e) { root.innerHTML = errBox(msgOf(e), 1); var b = $("[data-retry]", root); if (b) b.onclick = function () { supportReport(root); }; });
  }
  function ticketPage(id, root) {
    var canW = can("support", "write"), back = backTo("support", "Semua tiket"), D = null, ADM = [];
    function load() {
      root.innerHTML = back + skel();
      Promise.all([sb.rpc("admin_ticket_detail", { p_id: id }), sb.rpc("admin_support_admins")]).then(function (rs) { if (rs[0].error) throw rs[0].error; D = rs[0].data; ADM = rs[1].data || []; draw(); })
        .catch(function (e) { root.innerHTML = back + errBox(msgOf(e), 1); var b = $("[data-retry]", root); if (b) b.onclick = load; });
    }
    function done(okMsg) { return function (r) { r = tkRes(r); if (r.error) { if (r.error.known) toast(r.error.message, "bad"); else fail(r.error, "Tindakan gagal"); return; } toast(okMsg, "ok"); load(); }; }
    function files(fs) { return fs && fs.length ? '<div class="btns" style="margin-top:6px">' + fs.map(function (f) { return '<button type="button" class="btn o sm" data-file="' + esc(f.path) + '">' + esc(f.name) + "</button>"; }).join("") + "</div>" : ""; }
    function draw() {
      var t = D.ticket, cu = D.customer || {}, closed = t.status === "ditutup";
      var sel = function (cls, opts, cur, extra) { return '<select class="' + cls + '"' + (canW ? "" : " disabled") + ">" + (extra || "") + opts.map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === cur ? " selected" : "") + ">" + esc(o[1]) + "</option>"; }).join("") + "</select>"; };
      var ctl = '<div class="fgrid"><label class="fld">Status' + sel("t-st", TKSTAT, t.status) + '</label><label class="fld">Prioritas' + sel("t-pr", TKPRI, t.priority) + '</label><label class="fld">Penanggung jawab' + sel("t-as", ADM.map(function (a) { return [a.id, a.name]; }), t.assigned_to, '<option value="">Belum ditugaskan</option>') + "</label></div>";
      var msgs = '<div class="rp"><b>' + esc(cu.full_name || "Pelanggan") + " <small>" + dt(t.created_at, 1) + "</small></b><p style=\"white-space:pre-line\">" + esc(t.message || "") + "</p>" + files(D.files) + "</div>" + (D.replies || []).map(function (r) {
        return '<div class="rp' + (r.is_internal ? " internal" : r.is_staff ? " staff" : "") + '"><b>' + (r.is_internal ? "Catatan internal (tidak terlihat pelanggan) &middot; " : "") + esc(r.is_staff ? (r.author || "Staf") : (cu.full_name || "Pelanggan")) + " <small>" + dt(r.created_at, 1) + '</small></b><p style="white-space:pre-line">' + esc(r.body) + "</p>" + files(r.files) + "</div>";
      }).join("");
      var form = canW && !closed ? '<form id="t-rf" class="fgrid" novalidate><label class="fld full">Balasan<textarea id="t-body" rows="4" maxlength="4000"></textarea></label>' +
        '<label class="fld">Setelah dikirim, ubah status<select id="t-ns"><option value="">Otomatis (menunggu pelanggan)</option>' + TKSTAT.filter(function (x) { return x[0] !== "open"; }).map(function (x) { return '<option value="' + x[0] + '">' + x[1] + "</option>"; }).join("") + '</select></label>' +
        '<fieldset class="chk"><legend>Jenis pesan</legend><label><input type="checkbox" id="t-int"> Catatan internal (tidak dikirim ke pelanggan)</label></fieldset><div class="full"><button class="btn" type="submit">Kirim</button></div></form>' : (closed ? '<p class="sub">Tiket sudah ditutup.</p>' : "");
      var H = { status: "Status", priority: "Prioritas", assigned_to: "Penugasan" };
      var hist = (D.history || []).map(function (h) { var c = h.change || {}, parts = Object.keys(H).filter(function (k) { return Array.isArray(c[k]); }).map(function (k) { return H[k] + (k === "assigned_to" ? " diubah" : ": " + esc(String(c[k][0])) + " &rarr; " + esc(String(c[k][1]))); }); return parts.length ? "<tr><td>" + dt(h.at, 1) + "</td><td>" + parts.join("; ") + "</td><td>" + esc(h.by || "-") + "</td></tr>" : ""; }).filter(Boolean);
      root.innerHTML = back + '<div class="card dhead"><div><h2>' + esc(t.subject) + '</h2><p class="sub">' + esc(TKCAT[t.category] || t.category) + " &middot; dibuat " + dt(t.created_at, 1) + "</p><div>" + badge(t.status) + " " + badge(t.priority) + " " + tkSla(t.sla) + '</div></div></div>' +
        '<div class="stats">' + stat("Batas respons pertama", dt(t.due_at, 1)) + stat("Respons pertama", t.first_response_at ? dt(t.first_response_at, 1) : "Belum ada") + stat("Pelanggan", esc(cu.full_name || "-")) + stat("Total tiket pelanggan", cu.ticket_count || 0) + "</div>" +
        '<div class="card"><div class="sect"><h3>Pengaturan tiket</h3>' + ctl + '<p class="sub" style="margin-top:8px">Kontak: ' + esc(cu.email || "-") + (cu.whatsapp ? " &middot; WhatsApp " + esc(cu.whatsapp) : "") + "</p></div></div>" +
        '<div class="card"><div class="sect"><h3>Percakapan</h3>' + msgs + form + "</div></div>" +
        '<div class="card"><div class="sect"><h3>Riwayat perubahan</h3>' + (hist.length ? tbl([["Waktu"], ["Perubahan"], ["Oleh"]], hist) : '<p class="sub">Belum ada perubahan.</p>') + "</div></div>";
      var ss = $(".t-st", root), sp = $(".t-pr", root), sa = $(".t-as", root);
      if (ss && canW) ss.onchange = function () { sb.rpc("admin_ticket_set_status", { p_id: id, p_status: ss.value }).then(done("Status diperbarui.")); };
      if (sp && canW) sp.onchange = function () { sb.rpc("admin_ticket_set_priority", { p_id: id, p_priority: sp.value }).then(done("Prioritas diperbarui. Batas SLA dihitung ulang.")); };
      if (sa && canW) sa.onchange = function () { sb.rpc("admin_ticket_assign", { p_id: id, p_admin: sa.value || null }).then(done("Penugasan diperbarui.")); };
      var f = $("#t-rf", root); if (f) f.onsubmit = function (e) {
        e.preventDefault(); var b = $("#t-body", root).value.trim(); if (!b) { toast("Isi balasan dulu.", "bad"); return; }
        var internal = $("#t-int", root).checked; f.querySelector("button").disabled = true;
        sb.rpc("admin_ticket_reply", { p_id: id, p_body: b, p_internal: internal, p_status: internal ? null : ($("#t-ns", root).value || null) }).then(function (r) { f.querySelector("button").disabled = false; done(internal ? "Catatan internal disimpan." : "Balasan terkirim ke pelanggan.")(r); });
      };
      $$("[data-file]", root).forEach(function (x) { x.onclick = function () { sb.storage.from("ticket-files").createSignedUrl(x.dataset.file, 120).then(function (r) { if (r.error || !r.data) { toast("Gambar tidak bisa dibuka.", "bad"); return; } window.open(r.data.signedUrl, "_blank", "noopener"); }); }; });
    }
    load();
  }

  /* ================= Manajemen Transaksi ================= */
  var MTX = { pending: ["Pending", "Menunggu pembayaran"], settlement: ["Settlement", "Lunas"], capture: ["Capture", "Lunas (jika fraud = accept)"], expire: ["Expire", "Gagal (kedaluwarsa)"], cancel: ["Cancel", "Dibatalkan"], deny: ["Deny", "Gagal"], failure: ["Failure", "Gagal"], refund: ["Refund", "Refund"], partial_refund: ["Partial refund", "Refund"], chargeback: ["Chargeback", "Refund"] };
  var TXM = [["Pending", "Menunggu"], ["Settlement", "Lunas"], ["Capture + fraud accept", "Lunas"], ["Capture + fraud challenge", "Tetap menunggu keputusan fraud"], ["Expire", "Gagal (kedaluwarsa)"], ["Cancel", "Dibatalkan"], ["Deny / Failure", "Gagal"], ["Refund / Chargeback", "Refund"]];
  var TXE = { applied: ["Diterapkan", "ok"], duplicate: ["Duplikat", ""], ignored: ["Diabaikan", ""], amount_mismatch: ["Jumlah tidak cocok", "bad"], order_tidak_ditemukan: ["Order tidak ditemukan", "bad"] };
  var TXS = { webhook: "Webhook Midtrans", sync: "Sinkronisasi API", user: "Pelanggan", system: "Sistem" };
  var TXERR = { belum_lunas: "Refund hanya bisa diajukan untuk pembayaran yang sudah lunas menurut Midtrans.", pembayaran_tidak_ada: "Invoice ini belum punya data pembayaran Midtrans.", alasan_terlalu_pendek: "Alasan minimal 5 karakter.", refund_sudah_diajukan: "Sudah ada refund yang menunggu keputusan.", sudah_diputuskan: "Refund ini sudah diputuskan.", alasan_penolakan_kosong: "Isi alasan penolakan.", metode_belum_dipilih: "Pilih metode pengembalian dana.", bukti_belum_ada: "Isi tautan bukti atau catatan bukti.", bukti_url_tidak_valid: "Tautan bukti harus diawali http:// atau https://.", catatan_kosong: "Catatan terlalu pendek." };
  function txRes(r) { if (r.error) return r; if (r.data && r.data.error) return { error: { message: TXERR[r.data.error] || r.data.error } }; return r; }
  function txDone(okMsg, reload) { return function (r) { if (r && r.error) { var m = r.error.message || ""; var known = Object.keys(TXERR).some(function (k) { return TXERR[k] === m; }); if (known) toast(m, "bad"); else fail(r.error, "Tindakan gagal"); return; } toast(okMsg, "ok"); reload(); }; }
  function mtLbl(s) { return s ? lbl(MTX, s) : "-"; }
  function csvCell(v) { var t = v == null ? "" : String(v); if (/^[=+\-@\t\r]/.test(t)) t = "'" + t; return '"' + t.replace(/"/g, '""') + '"'; }
  function download(name, mime, text) { var b = new Blob([text], { type: mime }), a = d.createElement("a"); a.href = URL.createObjectURL(b); a.download = name; d.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500); }
  var TXH = [["invoice", "Invoice"], ["dibuat", "Dibuat"], ["pelanggan", "Pelanggan"], ["email", "Email"], ["keterangan", "Keterangan"], ["paket", "Paket"], ["jumlah", "Jumlah"], ["status_internal", "Status internal"], ["status_midtrans", "Status Midtrans"], ["fraud", "Fraud"], ["metode", "Metode"], ["order_id", "Order ID"], ["transaction_id", "Transaction ID"], ["dibayar", "Dibayar"], ["direfund", "Direfund"]];
  function txReport(root) {
    var canR = can("transactions", "read"); root.innerHTML = skel();
    sb.rpc("admin_transactions_overview").then(function (r) {
      if (r.error) throw r.error; var o = r.data || {};
      root.innerHTML = '<div class="stats">' + stat("Lunas", (o.paid_count || 0) + ' <small class="sub">' + rp(o.paid_sum) + "</small>") + stat("Menunggu", o.pending_count || 0) + stat("Gagal / batal", o.failed_count || 0) + stat("Refund selesai", o.refund_count || 0) + stat("Refund diajukan", o.refund_open || 0) + stat("Perlu tinjauan", o.review || 0) + "</div>" +
        '<div class="card"><div class="sect"><h3>Ekspor laporan transaksi</h3><p class="sub" style="margin:0 0 10px">Tanggal memakai zona waktu WIB. Kosongkan tanggal untuk semua data.</p><form id="txf" class="fgrid" novalidate>' +
        '<label class="fld">Dari tanggal<input type="date" id="tx-from"></label><label class="fld">Sampai tanggal<input type="date" id="tx-to"></label>' +
        '<label class="fld">Status invoice<select id="tx-st"><option value="">Semua</option><option value="lunas">Lunas</option><option value="menunggu">Menunggu</option><option value="gagal">Gagal</option><option value="dibatalkan">Dibatalkan</option><option value="refund">Refund</option></select></label>' +
        '<div class="full btns"><button class="btn" type="button" data-ex="csv">Unduh CSV</button><button class="btn o" type="button" data-ex="xls">Unduh Excel (.xls)</button></div></form></div></div>';
      $$("[data-ex]", root).forEach(function (b) {
        b.disabled = !canR; b.onclick = function () {
          var f = $("#tx-from", root).value || null, t = $("#tx-to", root).value || null, s = $("#tx-st", root).value || null;
          if (f && t && f > t) { toast("Tanggal awal tidak boleh setelah tanggal akhir.", "bad"); return; }
          b.disabled = true;
          sb.rpc("admin_export_transactions", { p_from: f, p_to: t, p_status: s }).then(function (x) {
            b.disabled = false; if (x.error) { fail(x.error, "Ekspor gagal"); return; }
            var rows = x.data || [], stamp = new Date().toISOString().slice(0, 10);
            if (!rows.length) { toast("Tidak ada transaksi pada filter ini.", "bad"); return; }
            if (b.dataset.ex === "csv") download("transaksi-" + stamp + ".csv", "text/csv;charset=utf-8", "﻿" + [TXH.map(function (h) { return csvCell(h[1]); }).join(",")].concat(rows.map(function (q) { return TXH.map(function (h) { return csvCell(q[h[0]]); }).join(","); })).join("\r\n"));
            else download("transaksi-" + stamp + ".xls", "application/vnd.ms-excel", '<html><head><meta charset="utf-8"></head><body><table border="1"><tr>' + TXH.map(function (h) { return "<th>" + esc(h[1]) + "</th>"; }).join("") + "</tr>" + rows.map(function (q) { return "<tr>" + TXH.map(function (h) { var v = q[h[0]]; return "<td>" + esc(v == null ? "" : (/^[=+\-@]/.test(String(v)) ? "'" + v : v)) + "</td>"; }).join("") + "</tr>"; }).join("") + "</table></body></html>");
            toast(rows.length + " transaksi diekspor.", "ok");
          }, function () { b.disabled = false; toast("Ekspor gagal. Periksa koneksi.", "bad"); });
        };
      });
    }).catch(function (e) { root.innerHTML = errBox(msgOf(e), 1); var b = $("[data-retry]", root); if (b) b.onclick = function () { txReport(root); }; });
  }
  function transactionPage(id, root) {
    var canW = can("transactions", "write"), back = backTo("transactions", "Semua transaksi"), D = null;
    function load() {
      root.innerHTML = back + skel();
      sb.rpc("admin_transaction_detail", { p_invoice: id }).then(function (r) { if (r.error) throw r.error; D = r.data; draw(); })
        .catch(function (e) { root.innerHTML = back + errBox(msgOf(e), 1); var b = $("[data-retry]", root); if (b) b.onclick = load; });
    }
    function sync() {
      var p = D.payment; if (!p) return; var btn = $("[data-sync]", root); btn.disabled = true; btn.textContent = "Memeriksa ke Midtrans...";
      sb.auth.getSession().then(function (s) {
        var tok = s.data && s.data.session && s.data.session.access_token; if (!tok) throw new Error("sesi");
        return fetch(C.SUPABASE_URL + "/functions/v1/midtrans-sync", { method: "POST", headers: { "content-type": "application/json", apikey: C.SUPABASE_ANON_KEY, authorization: "Bearer " + tok }, body: JSON.stringify({ order_id: p.order_id, admin: true }) });
      }).then(function (res) { return res.json().catch(function () { return {}; }).then(function (j) { return { ok: res.ok, status: res.status, j: j }; }); }).then(function (x) {
        if (!x.ok) { toast(x.status === 403 ? "Anda tidak punya izin menyinkronkan transaksi." : x.status === 502 ? "Midtrans tidak bisa dihubungi. Coba lagi sebentar lagi." : "Sinkronisasi gagal.", "bad"); btn.disabled = false; btn.textContent = "Sinkronkan dengan Midtrans"; return; }
        var res = x.j.verified === false ? "Midtrans belum punya transaksi untuk order ini." : x.j.result === "applied" ? "Status diperbarui dari Midtrans." : x.j.result === "amount_mismatch" ? "Jumlah dari Midtrans tidak cocok. Ditandai untuk ditinjau." : "Status sudah sesuai dengan Midtrans.";
        sb.rpc("admin_transaction_note", { p_invoice: id, p_note: "Sinkronisasi status ke Midtrans: " + res }).then(function () { toast(res, x.j.result === "amount_mismatch" ? "bad" : "ok"); load(); }, function () { toast(res, "ok"); load(); });
      }).catch(function () { toast("Sinkronisasi gagal. Periksa koneksi.", "bad"); btn.disabled = false; btn.textContent = "Sinkronkan dengan Midtrans"; });
    }
    function draw() {
      var iv = D.invoice, p = D.payment, cu = D.customer || {}, inv = D.invitation, rf = D.refunds || [], open = rf.filter(function (x) { return x.status === "diajukan"; })[0], b = "";
      if (canW && p) b += '<button class="btn" type="button" data-sync>Sinkronkan dengan Midtrans</button>';
      if (canW && p && p.status === "paid" && !open) b += '<button class="btn o bad" type="button" data-rf>Ajukan refund</button>';
      if (canW) b += '<button class="btn o" type="button" data-nt>Tambah catatan</button>';
      var map = p && p.midtrans_status ? mtLbl(p.midtrans_status) + " &rarr; " + (MTX[p.midtrans_status] || ["", "belum dikenali"])[1] : "-";
      var warn = p && /tinjauan|tidak_cocok/.test(p.note || "") ? '<div class="note bad" role="alert"><b>Perlu ditinjau:</b> ' + esc(p.note === "jumlah_tidak_cocok" ? "jumlah dari Midtrans tidak sama dengan harga di database" : p.note === "pembayaran_ganda_perlu_tinjauan" ? "undangan sudah aktif dari pembayaran lain (kemungkinan pembayaran ganda)" : "undangan sudah diturunkan saat pembayaran masuk") + ".</div>" : "";
      var payHtml = p ? kvs([["Order ID", esc(p.order_id)], ["Transaction ID Midtrans", esc(p.transaction_id || "-")], ["Metode pembayaran", esc(p.payment_type || "-")], ["Status asli Midtrans", esc(mtLbl(p.midtrans_status)) + (p.fraud_status ? " &middot; fraud: " + esc(p.fraud_status) : "")], ["Dipetakan ke", map], ["Status pembayaran internal", esc(p.status)],
        ["Waktu pembayaran", dt(p.paid_at, 1)], ["Batas bayar", dt(p.expires_at, 1)], ["Dibuat", dt(p.created_at, 1)], ["Terakhir diperbarui", dt(p.updated_at, 1)], ["Paket / durasi", esc(PLN[p.plan_id] || p.plan_id) + " &middot; " + p.duration_days + " hari"]]) : '<p class="sub">Invoice ini belum punya data pembayaran Midtrans (invoice lama atau dibuat manual).</p>';
      var rfHtml = rf.length ? tbl([["Diajukan"], ["Jumlah", 1], ["Alasan"], ["Status"], ["Bukti"], [""]], rf.map(function (x) {
        return "<tr><td>" + dt(x.requested_at, 1) + "<span class=\"cell-s\">" + esc(x.requested_by || "") + "</span></td><td class=\"num\">" + rp(x.amount) + "</td><td>" + esc(x.reason) + (x.decision_note ? '<span class="cell-s">' + esc(x.decision_note) + "</span>" : "") + "</td><td>" + badge(x.status === "selesai" ? "berhasil" : x.status === "ditolak" ? "ditolak" : "diproses") + (x.status === "selesai" ? '<span class="cell-s">' + esc(({ midtrans_dashboard: "Dashboard Midtrans", transfer_manual: "Transfer manual", lainnya: "Lainnya" })[x.method] || "") + " &middot; " + dt(x.decided_at) + "</span>" : "") + "</td><td>" +
          (x.proof_url && /^https?:\/\//.test(x.proof_url) ? '<a target="_blank" rel="noopener" href="' + esc(x.proof_url) + '">Buka bukti</a>' : "") + (x.proof_note ? '<span class="cell-s">' + esc(x.proof_note) + "</span>" : x.proof_url ? "" : "-") + "</td><td>" +
          (canW && x.status === "diajukan" ? '<button class="btn sm" type="button" data-rd="' + x.id + '" data-d="selesai">Selesaikan</button> <button class="btn o sm bad" type="button" data-rd="' + x.id + '" data-d="ditolak">Tolak</button>' : "") + "</td></tr>";
      })) : '<p class="sub">Belum ada refund untuk transaksi ini.</p>';
      var evHtml = (D.events || []).length ? tbl([["Waktu"], ["Sumber"], ["Status Midtrans"], ["Hasil"], ["Metode"]], D.events.map(function (e) {
        var rs = TXE[e.result] || [e.result || "-", ""]; return "<tr><td>" + dt(e.at, 1) + "</td><td>" + esc(TXS[e.source] || e.source) + "</td><td>" + esc(mtLbl(e.status)) + '</td><td><span class="badge ' + rs[1] + '">' + esc(rs[0]) + "</span></td><td>" + esc(e.payment_type || "-") + "</td></tr>";
      })) : '<p class="sub">Belum ada notifikasi webhook atau sinkronisasi untuk order ini.</p>';
      var hsHtml = (D.history || []).length ? tbl([["Waktu"], ["Kejadian"], ["Oleh"]], D.history.map(function (h) {
        var what = h.kind === "admin" ? (h.action === "catatan" ? "Catatan admin: " + esc(typeof h.change === "string" ? h.change : (h.change && h.change.catatan) || "") : h.table === "payments" || h.table === "invoices" ? "Perubahan " + esc(h.table === "payments" ? "pembayaran" : "invoice") + (Array.isArray(h.change) ? ": " + esc(String(h.change[0])) + " &rarr; " + esc(String(h.change[1])) : "") : esc(h.action)) : "Status Midtrans <b>" + esc(mtLbl(h.action)) + "</b> diterapkan";
        return "<tr><td>" + dt(h.at, 1) + "</td><td>" + what + "</td><td>" + esc(h.by || (h.kind === "admin" ? "-" : TXS[h.kind] || h.kind)) + "</td></tr>";
      })) : '<p class="sub">Belum ada perubahan status.</p>';
      root.innerHTML = back + '<div class="card dhead"><div><h2>' + esc(iv.number) + '</h2><p class="sub">' + esc(iv.description) + '</p><div>' + badge(iv.status) + '</div></div><div class="btns">' + b + "</div></div>" + warn +
        '<div class="stats">' + stat("Jumlah", rp(iv.amount)) + stat("Status Midtrans", p ? esc(mtLbl(p.midtrans_status)) : "-") + stat("Metode", p ? esc(p.payment_type || "-") : "-") + stat("Dibayar", p ? dt(p.paid_at) : dt(iv.paid_at)) + "</div>" +
        '<div class="card"><div class="sect"><h3>Pembayaran Midtrans</h3>' + payHtml + (p ? '<p class="sub" style="margin-top:10px">Status lunas hanya berubah dari Midtrans (webhook atau tombol sinkronisasi yang memeriksa langsung ke Midtrans). Admin tidak dapat menandai lunas secara manual.</p>' : "") + "</div></div>" +
        '<div class="card"><div class="sect"><h3>Pelanggan &amp; undangan</h3>' + kvs([["Pelanggan", esc(cu.full_name || "-")], ["Email", esc(cu.email || "-")], ["WhatsApp", esc(cu.whatsapp || "-")], ["Undangan", inv ? esc(inv.title) + " " + badge(inv.status) : "-"], ["Masa aktif undangan", inv ? dt(inv.expires_at) : "-"]]) + "</div></div>" +
        '<div class="card"><div class="sect"><h3>Refund</h3>' + rfHtml + '<p class="sub" style="margin-top:10px">Pengembalian dana dilakukan di luar sistem ini (dashboard Midtrans atau transfer). Di sini hanya dicatat beserta alasan dan buktinya.</p></div></div>' +
        '<div class="card"><div class="sect"><h3>Riwayat webhook &amp; sinkronisasi</h3>' + evHtml + "</div></div>" +
        '<div class="card"><div class="sect"><h3>Riwayat perubahan status</h3>' + hsHtml + "</div></div>" +
        '<div class="card"><div class="sect"><h3>Pemetaan status Midtrans</h3>' + tbl([["Status Midtrans"], ["Status internal"]], TXM.map(function (m) { return "<tr><td>" + esc(m[0]) + "</td><td>" + esc(m[1]) + "</td></tr>"; })) + "</div></div>";
      var sb_ = $("[data-sync]", root); if (sb_) sb_.onclick = sync;
      var rb = $("[data-rf]", root); if (rb) rb.onclick = function () { noteForm("Ajukan refund", 1, "Alasan refund (min. 5 karakter). Refund baru dicatat selesai setelah dana dikembalikan dan bukti diisi.", function (note) { return sb.rpc("admin_refund_request", { p_invoice: id, p_reason: note }).then(txRes); }, load); };
      var nb = $("[data-nt]", root); if (nb) nb.onclick = function () { noteForm("Tambah catatan", 1, "Catatan tersimpan di riwayat perubahan.", function (note) { return sb.rpc("admin_transaction_note", { p_invoice: id, p_note: note }).then(txRes); }, load); };
      $$("[data-rd]", root).forEach(function (x) {
        x.onclick = function () {
          var rid = x.dataset.rd, done = x.dataset.d === "selesai";
          openForm({ fields: done ? [{ k: "method", l: "Metode pengembalian dana", t: "select", req: 1, opts: [["midtrans_dashboard", "Dashboard Midtrans"], ["transfer_manual", "Transfer manual"], ["lainnya", "Lainnya"]] }, { k: "proof_url", l: "Tautan bukti (opsional jika ada catatan)", full: 1, help: "Harus diawali https://" }, { k: "proof_note", l: "Catatan bukti (mis. nomor referensi)", t: "textarea", full: 1, max: 300 }, { k: "note", l: "Catatan tambahan", t: "textarea", full: 1, max: 300, help: "Menyelesaikan refund mengubah invoice menjadi Refund dan menonaktifkan undangan. Pastikan dana sudah dikembalikan." }] : [{ k: "note", l: "Alasan penolakan", t: "textarea", req: 1, full: 1, max: 300 }],
            title: function () { return done ? "Selesaikan refund" : "Tolak refund"; },
            custom: function (v) { return sb.rpc("admin_refund_decide", { p_refund: rid, p_decision: x.dataset.d, p_method: v.method || null, p_proof_url: v.proof_url || null, p_proof_note: v.proof_note || null, p_note: v.note || null }).then(txRes); } }, null, load, done ? "Selesaikan refund" : "Tolak refund");
        };
      });
    }
    load();
  }

  function customerPage(id, root) {
    var canW = can("customers", "write"), key = "c:" + id; PT[key] = PT[key] || "profil";
    var back = backTo("customers", "Semua pelanggan"), D = null;
    function load() {
      root.innerHTML = back + skel();
      sb.rpc("admin_customer_detail", { p_user: id }).then(function (r) { if (r.error) throw r.error; D = r.data; draw(); })
        .catch(function (e) { root.innerHTML = back + errBox(msgOf(e), 1); var b = $("[data-retry]", root); if (b) b.onclick = load; });
    }
    function panel() {
      var p = D.profile, pl = D.plan, inv = D.invitations || [], ivs = D.invoices || [], t = PT[key];
      if (t === "profil") {
        var subs = (D.subscriptions || []).map(function (s) { return "<tr><td>" + esc(PLN[s.plan] || s.plan) + "</td><td>" + '<span class="badge ' + (s.status === "aktif" ? "ok" : "") + '">' + esc(s.status) + "</span>" + "</td><td>" + dt(s.started_at) + "</td><td>" + dt(s.expires_at) + "</td></tr>"; });
        return kvs([["Nama lengkap", esc(p.full_name || "-")], ["Email", esc(p.email) + (p.email_confirmed_at ? ' <span class="badge ok">Terverifikasi</span>' : ' <span class="badge warn">Belum verifikasi</span>')], ["WhatsApp", esc(p.whatsapp || "-")], ["Status akun", bdg(ACC, p.status) + '<span class="cell-s">' + esc(ACCH[p.status] || "") + "</span>"], ["Paket aktif", planTxt(pl)], ["Bergabung", dt(p.created_at, 1)], ["Terakhir masuk", dt(p.last_sign_in_at, 1)]]) +
          '<div class="sect" style="margin-top:18px"><h3>Riwayat langganan</h3>' + (subs.length ? tbl([["Paket"], ["Status"], ["Mulai"], ["Berakhir"]], subs) : '<p class="sub">Belum ada langganan.</p>') + "</div>";
      }
      if (t === "undangan") return inv.length ? tbl([["Undangan"], ["Paket"], ["Status (bayar / tayang / moderasi)"], ["Masa aktif"]], inv.map(function (v) { return "<tr><td><a href=\"#invitations:all:" + esc(v.id) + '"><b>' + esc(v.title) + "</b></a></td><td>" + esc(PKN[v.package_type] || v.package_type || "-") + "</td><td>" + tri(v) + "</td><td>" + dt(v.expires_at) + "</td></tr>"; })) : empty("Belum ada undangan", "Pelanggan ini belum membuat undangan.");
      if (t === "transaksi") {
        if (!D.tx_visible) return '<p class="sub">Peran Anda tidak punya izin melihat transaksi.</p>';
        return ivs.length ? tbl([["Invoice"], ["Deskripsi"], ["Jumlah", 1], ["Status"], ["Metode"], ["Tanggal"]], ivs.map(function (v) { return "<tr><td><b>" + esc(v.number) + '</b><span class="cell-s">' + esc(v.order_id || "") + "</span></td><td>" + esc(v.description) + '</td><td class="num">' + rp(v.amount) + "</td><td>" + badge(v.status) + "</td><td>" + esc(v.payment_type || "-") + "</td><td>" + dt(v.paid_at || v.created_at, 1) + "</td></tr>"; })) : empty("Belum ada transaksi", "Invoice muncul setelah pelanggan melakukan checkout.");
      }
      var acts = D.actors || {};
      return (D.activity || []).length ? '<ul class="act-list">' + D.activity.map(function (x) { return "<li><i>" + ico("pulse").replace('class="ic"', 'class="ic" style="width:16px;height:16px"') + "</i><div><b>" + esc(x.txt) + (x.actor ? " &middot; oleh " + esc(acts[x.actor] || "admin") : "") + "</b><small>" + dt(x.t, 1) + "</small></div></li>"; }).join("") + "</ul>" : empty("Belum ada aktivitas", "");
    }
    function planTxt(pl) { return pl ? esc(PLN[pl.plan] || pl.plan) + (pl.expired ? ' <span class="badge bad">Kedaluwarsa</span>' : "") + '<span class="cell-s">s/d ' + dt(pl.expires_at) + " (" + rel(pl.expires_at) + ")</span>" : "Belum ada paket aktif"; }
    function draw() {
      var p = D.profile, inv = D.invitations || [], me = A.user && A.user.id === p.id, b = "";
      if (canW && !p.is_admin && !me) {
        if (p.status !== "aktif") b += '<button class="btn" type="button" data-st="aktif">Aktifkan akun</button>';
        if (p.status === "aktif") b += '<button class="btn o" type="button" data-st="nonaktif">Nonaktifkan</button>';
        if (p.status !== "suspended") b += '<button class="btn o bad" type="button" data-st="suspended">Blokir akun</button>';
      }
      if (canW) b += '<button class="btn o" type="button" data-reset>Kirim reset akses</button><button class="btn o" type="button" data-sub>Tambah / ubah langganan</button>';
      var tabs = [["profil", "Profil"], ["undangan", "Undangan (" + inv.length + ")"], ["transaksi", "Transaksi" + (D.tx_visible ? " (" + (D.invoices || []).length + ")" : "")], ["aktivitas", "Aktivitas"]];
      root.innerHTML = back + '<div class="card dhead"><div><h2>' + esc(p.full_name || p.email) + '</h2><p class="sub">' + esc(p.email) + (p.whatsapp ? " &middot; " + esc(p.whatsapp) : "") + "</p><div>" + bdg(ACC, p.status) + (p.is_admin ? ' <span class="badge">Akun admin</span>' : "") + '</div></div><div class="btns">' + b + "</div></div>" +
        (p.is_admin ? '<p class="note" style="margin-bottom:12px">Ini akun admin. Status akunnya dikelola di menu Admin.</p>' : "") +
        '<div class="stats">' + stat("Paket aktif", planTxt(D.plan)) + stat("Undangan", inv.length) + stat("Total dibayar", D.tx_visible ? rp(D.paid_total) : "-") + stat("Bergabung", dt(p.created_at)) + stat("Terakhir masuk", dt(p.last_sign_in_at)) + "</div>" +
        ptabs(tabs, PT[key]) + '<div class="card" id="pbody">' + panel() + "</div>";
    }
    root.onclick = function (e) {
      var t = e.target.closest("[data-pt]"); if (t && D) { PT[key] = t.dataset.pt; return draw(); }
      if (!D) return; var p = D.profile, s = e.target.closest("[data-st]");
      if (s) {
        var to = s.dataset.st, name = { aktif: "Aktifkan akun", nonaktif: "Nonaktifkan akun", suspended: "Blokir akun" }[to], run = function (note) { return sb.rpc("admin_customer_set_status", { p_user: id, p_status: to, p_note: note }); };
        if (to === "aktif") return dlgConfirm("Aktifkan kembali akun ini? Pelanggan dapat memakai dashboard dan membuat undangan lagi.", name).then(function (ok) { if (ok) run(null).then(rpcDone("Akun diaktifkan.", load)); });
        return noteForm(name, 1, to === "suspended" ? "Diblokir: pelanggan tidak bisa memakai dashboard sama sekali. Alasan tersimpan di riwayat." : "Nonaktif: dashboard tetap terbuka, tetapi tidak bisa membuat undangan baru atau membayar. Alasan tersimpan di riwayat.", run, load);
      }
      if (e.target.closest("[data-reset]")) return dlgConfirm("Kirim email atur ulang kata sandi ke " + p.email + "? Pelanggan menerima tautan untuk membuat kata sandi baru. Admin tidak melihat atau mengubah kata sandi.", "Kirim email").then(function (ok) {
        if (!ok) return;
        sb.auth.resetPasswordForEmail(p.email, { redirectTo: location.origin + "/atur-password" }).then(function (r) {
          if (r.error) return fail(r.error, "Gagal mengirim email");
          sb.rpc("admin_customer_log", { p_user: id, p_action: "reset_akses" }).then(function () { toast("Email atur ulang kata sandi dikirim.", "ok"); load(); });
        });
      });
      if (e.target.closest("[data-sub]")) openForm({ fields: [{ k: "plan", l: "Paket", t: "select", opts: PL, req: 1 }, { k: "days", l: "Durasi (hari)", t: "number", req: 1, min: 1, max: 1100, def: 90 }], title: function () { return "Tambah / ubah langganan"; }, custom: function (v) { var st = new Date(), ex = new Date(st.getTime() + v.days * 864e5); return sb.from("subscriptions").insert({ user_id: id, plan: v.plan, status: "aktif", started_at: st.toISOString(), expires_at: ex.toISOString() }); } }, null, load, "Tambah / ubah langganan");
    };
    load();
  }

  function invitationPage(id, root) {
    var canW = can("invitations", "write"), back = backTo("invitations", "Semua undangan"), D = null, pv = "", PNAME = { d: "Desktop", m: "Ponsel" };
    function load() {
      root.innerHTML = back + skel();
      sb.rpc("admin_invitation_detail", { p_id: id }).then(function (r) { if (r.error) throw r.error; D = r.data; draw(); })
        .catch(function (e) { root.innerHTML = back + errBox(msgOf(e), 1); var b = $("[data-retry]", root); if (b) b.onclick = load; });
    }
    function scard(t, badgeHtml, hint) { return '<div class="scard"><span>' + esc(t) + "</span>" + badgeHtml + "<p>" + hint + "</p></div>"; }
    function draw() {
      var i = D.invitation, o = D.owner || {}, log = D.log || [], pays = D.payments || [], arch = !!i.archived_at, b = "";
      var live = i.pub_status === "aktif" && i.moderation !== "takedown" && /^https?:\/\//.test(i.public_url || "");
      if (canW) {
        if (!arch && i.moderation !== "takedown") b += '<button class="btn o bad" type="button" data-ia="suspend">Suspend</button>';
        if (!arch && (i.moderation === "takedown" || i.pub_status === "nonaktif")) b += '<button class="btn" type="button" data-ia="reactivate">Aktifkan kembali</button>';
        if (i.moderation === "flagged") b += '<button class="btn o" type="button" data-ia="clear">Tolak laporan</button>'; else if (i.moderation === "ok") b += '<button class="btn o" type="button" data-ia="flag">Tandai terlapor</button>';
        b += arch ? '<button class="btn o" type="button" data-ia="unarchive">Pulihkan dari arsip</button>' : '<button class="btn o" type="button" data-ia="archive">Arsipkan</button>';
        b += '<button class="btn o" type="button" data-ext>Perpanjang masa aktif</button>';
      }
      var hintPay = { lunas: "Terverifikasi dari transaksi pembayaran.", menunggu: "Pelanggan belum menyelesaikan pembayaran.", gagal: "Transaksi gagal, dibatalkan, atau kedaluwarsa.", refund: "Pembayaran dikembalikan.", belum_bayar: "Belum ada transaksi." }[i.pay_status] || "";
      var hintPub = { aktif: "Tayang dan bisa dibuka tamu.", draft: "Masih disusun pelanggan.", menunggu_pembayaran: "Belum tayang, menunggu pembayaran lunas.", nonaktif: "Tidak tayang.", selesai: "Acara sudah selesai.", arsip: "Diarsipkan admin, tidak tayang." }[i.pub_status] || "";
      var hintMod = { ok: "Tidak ada laporan atau tindakan.", flagged: "Dilaporkan, menunggu keputusan admin.", takedown: "Diturunkan oleh admin." }[i.moderation] || "";
      var exp = i.expires_at ? dt(i.expires_at, 1) + " (" + rel(i.expires_at) + ")" : "Belum ditetapkan (diatur saat pembayaran lunas)";
      var pvUrl = "/preview?id=" + encodeURIComponent(id) + "&admin=1";
      var pvHtml = '<div class="card"><div class="sect"><h3>Pratinjau undangan</h3><div class="btns" style="margin-bottom:10px">' + (pv ? '<button class="btn o sm" type="button" data-pv="">Tutup pratinjau</button><button class="btn o sm" type="button" data-pv="d">Desktop</button><button class="btn o sm" type="button" data-pv="m">Ponsel</button>' : '<button class="btn sm" type="button" data-pv="d">Tampilkan pratinjau langsung</button>') + '<a class="btn o sm" href="' + pvUrl + '" target="_blank" rel="noopener">Buka di tab baru</a></div>' +
        (pv ? '<iframe class="pvf ' + pv + '" src="' + pvUrl + '" title="Pratinjau undangan ' + esc(i.title) + '"></iframe><p class="fine">Pratinjau memakai tampilan yang sama seperti yang dilihat pelanggan. Hanya baca.</p>' : '<p class="sub">Lihat undangan persis seperti pelanggan melihatnya, tanpa keluar dari dashboard. Undangan yang belum tayang tetap bisa dipratinjau oleh admin.</p>') + "</div></div>";
      var payHtml = '<div class="card"><div class="sect"><h3>Transaksi undangan</h3>' + (!D.tx_visible ? '<p class="sub">Peran Anda tidak punya izin melihat transaksi.</p>' : pays.length ? tbl([["Order"], ["Jumlah", 1], ["Status"], ["Metode"], ["Tanggal"]], pays.map(function (p) { return "<tr><td>" + esc(p.order_id) + '</td><td class="num">' + rp(p.amount) + "</td><td>" + badge({ paid: "lunas", pending: "menunggu", failed: "gagal", cancelled: "dibatalkan", expired: "gagal", refunded: "refund" }[p.status] || p.status) + "</td><td>" + esc(p.payment_type || "-") + "</td><td>" + dt(p.paid_at || p.created_at, 1) + "</td></tr>"; })) : '<p class="sub">Belum ada transaksi untuk undangan ini.</p>') + "</div></div>";
      var logHtml = '<div class="card"><div class="sect"><h3>Riwayat moderasi & status</h3>' + (log.length ? '<ul class="act-list">' + log.map(function (l) {
        var txt = l.kind === "moderasi" ? "Moderasi: " + esc(lbl(MODB, l.from_value)) + " &rarr; " + esc(lbl(MODB, l.to_value)) : l.kind === "publikasi" ? "Publikasi: " + esc(lbl(PUBB, l.from_value)) + " &rarr; " + esc(lbl(PUBB, l.to_value)) : (l.to_value === "arsip" ? "Diarsipkan" : "Dipulihkan dari arsip");
        var by = l.actor_name || (l.actor_id ? (l.actor_id === i.user_id ? "Pelanggan" : "Admin") : "Sistem");
        return "<li><i>" + ico("pulse").replace('class="ic"', 'class="ic" style="width:16px;height:16px"') + "</i><div><b>" + txt + '</b><small>oleh ' + esc(by) + " &middot; " + dt(l.created_at, 1) + "</small>" + (l.note ? '<p class="sub" style="margin:4px 0 0">&ldquo;' + esc(l.note) + "&rdquo;</p>" : "") + "</div></li>";
      }).join("") + "</ul>" : '<p class="sub">Belum ada perubahan status atau tindakan moderasi.</p>') + "</div></div>";
      root.innerHTML = back + '<div class="card dhead"><div><h2>' + esc(i.title) + '</h2><p class="sub">Pemilik: ' + (o.id ? '<a href="#customers:list:' + esc(o.id) + '">' + esc(o.full_name || o.email) + "</a> &middot; " + esc(o.email) : "-") + "</p></div><div class=\"btns\">" + b + "</div></div>" +
        '<div class="scards">' + scard("Status pembayaran", bdg(PAYB, i.pay_status), hintPay) + scard("Status publikasi", bdg(PUBB, i.pub_status), hintPub) + scard("Status moderasi", bdg(MODB, i.moderation), hintMod + (i.moderation_note ? " Catatan: &ldquo;" + esc(i.moderation_note) + "&rdquo;" : "")) + "</div>" +
        '<div class="card">' + kvs([["Link publik", live ? '<a href="' + esc(i.public_url) + '" target="_blank" rel="noopener">' + esc(i.public_url) + "</a>" : (i.slug ? esc("https://nusamora.com/" + i.slug) + '<span class="cell-s">Belum bisa dibuka tamu (tidak tayang)</span>' : "-")], ["Paket", esc(PKN[i.package_type] || i.package_type || "-") + (i.plan_name ? '<span class="cell-s">Plan: ' + esc(i.plan_name) + "</span>" : "")], ["Template", esc(i.template_name || i.template_id || "-")], ["Jenis acara", esc(i.event_type || i.category || "-")], ["Tanggal acara", dt(i.event_date)], ["Dibuat", dt(i.created_at, 1)], ["Terakhir diperbarui", dt(i.updated_at, 1)], ["Dipublikasikan", dt(i.published_at, 1)], ["Masa aktif sampai", esc(exp)], ["Tamu / ucapan", esc((i.guest_count || 0) + " tamu, " + (i.wish_count || 0) + " ucapan")]]) + "</div>" + pvHtml + payHtml + logHtml;
    }
    root.onclick = function (e) {
      if (!D) return; var i = D.invitation, pb = e.target.closest("[data-pv]");
      if (pb) { pv = pb.dataset.pv; return draw(); }
      var a = e.target.closest("[data-ia]");
      if (a) {
        var act = a.dataset.ia, run = function (note) { return sb.rpc("admin_invitation_action", { p_id: id, p_action: act, p_note: note }); }, ok = function (m) { return rpcDone(m, load); };
        if (act === "suspend") return noteForm("Suspend undangan", 1, "Undangan diturunkan dari publikasi dan tamu tidak bisa membukanya. Alasan tersimpan di riwayat moderasi. Status pembayaran tidak berubah.", run, load);
        if (act === "flag") return noteForm("Tandai terlapor", 1, "Undangan tetap tayang sampai Anda memutuskan. Alasan tersimpan di riwayat.", run, load);
        if (act === "clear") return noteForm("Tolak laporan", 0, "Moderasi dikembalikan ke Normal. Status tayang tidak berubah.", run, load);
        if (act === "reactivate") return dlgConfirm("Aktifkan kembali undangan ini? Undangan tayang lagi untuk tamu. Hanya bisa jika pembayaran sudah lunas dan masa aktif belum habis.", "Aktifkan kembali").then(function (y) { if (y) run(null).then(ok("Undangan diaktifkan kembali.")); });
        if (act === "archive") return dlgConfirm("Arsipkan undangan ini? Undangan tidak lagi tayang. Anda dapat memulihkannya dari arsip.", "Arsipkan").then(function (y) { if (y) run(null).then(ok("Undangan diarsipkan.")); });
        return run(null).then(ok("Undangan dipulihkan dari arsip."));
      }
      if (e.target.closest("[data-ext]")) openForm({ fields: [{ k: "days", l: "Tambah masa aktif", t: "select", req: 1, opts: [["30", "30 hari"], ["90", "90 hari"], ["365", "365 hari"]], def: "30" }], title: function () { return "Perpanjang masa aktif"; }, custom: function (v) { var base = Math.max(Date.now(), i.expires_at ? new Date(i.expires_at).getTime() : 0); return sb.from("invitations").update({ expires_at: new Date(base + Number(v.days) * 864e5).toISOString() }).eq("id", id); } }, null, load, "Perpanjang masa aktif");
    };
    load();
  }
  /* ---------- halaman detail template ---------- */
  var LANGN = { id: "Indonesia", en: "English", jv: "Jawa", su: "Sunda", ms: "Melayu", ar: "Arab", zh: "Mandarin", ja: "Jepang" };
  function tplEnrich(rows) { return sb.rpc("admin_templates_overview").then(function (r) { var o = r.data || {}; rows.forEach(function (x) { x._ov = o[x.id] || null; }); }); }
  function tplFlags(r) { return (r.featured ? ' <span class="badge ok">Unggulan</span>' : "") + (r.recommended ? ' <span class="badge ok">Rekomendasi</span>' : ""); }
  function templatePage(id, root) {
    var canW = can("templates", "write"), back = backTo("templates", "Semua template"), D = null, pv = "";
    function load() {
      root.innerHTML = back + skel();
      sb.rpc("admin_template_detail", { p_id: id }).then(function (r) { if (r.error) throw r.error; D = r.data; draw(); })
        .catch(function (e) { root.innerHTML = back + errBox(msgOf(e), 1); var b = $("[data-retry]", root); if (b) b.onclick = load; });
    }
    function run(name, args, okMsg, after) { return sb.rpc(name, args).then(function (r) { if (r.error) { fail(r.error, "Tindakan gagal"); return null; } toast(okMsg, "ok"); (after || load)(r.data); return r; }); }
    function draw() {
      var t = D.template, rd = D.readiness, us = D.usage, b = "", locked = us.total > 0 || t.status === "published" || D.assets_count > 0;
      if (canW) {
        b += '<button class="btn o" type="button" data-studio>Edit di Studio</button>';
        if (t.status === "draft") b += rd.ready ? '<button class="btn" type="button" data-ta="publish">Publikasikan</button>' : '<button class="btn o bad" type="button" data-ta="force">Terbitkan paksa&hellip;</button>';
        if (t.status === "published") b += '<button class="btn o" type="button" data-ta="unpublish">Tarik ke draft</button>';
        if (t.status === "archived") b += '<button class="btn" type="button" data-ta="unarchive">Pulihkan ke draft</button>'; else b += '<button class="btn o" type="button" data-ta="archive">Arsipkan</button>';
        b += '<button class="btn o" type="button" data-dup>Duplikasi</button><button class="btn o" type="button" data-ver>Simpan versi</button>';
      }
      var ver = D.matches_version ? "v" + D.matches_version : (D.latest_version ? "v" + D.latest_version + " + perubahan" : "Belum ada versi");
      var pct = rd.required_total ? Math.round(rd.required_ok / rd.required_total * 100) : 100;
      var rdHtml = '<div class="card"><div class="sect"><h3>Kelengkapan sebelum terbit</h3><p class="sub" style="margin:0 0 10px">' + (rd.ready ? '<span class="badge ok">Siap diterbitkan</span> Semua syarat wajib terpenuhi.' : '<span class="badge warn">Belum siap</span> ' + (rd.required_total - rd.required_ok) + " syarat wajib belum terpenuhi. Template tidak bisa dipublikasikan sebelum lengkap.") + '</p><div class="pbar" role="progressbar" aria-valuenow="' + pct + '" aria-valuemin="0" aria-valuemax="100" aria-label="Syarat wajib"><i style="width:' + pct + '%"></i></div><small class="sub">' + rd.required_ok + " dari " + rd.required_total + " syarat wajib &middot; " + rd.ok_count + " dari " + rd.total + " item</small>" +
        ["Informasi", "Aset", "Tampilan"].map(function (g) {
          var items = rd.checks.filter(function (c) { return c.group === g; }); if (!items.length) return "";
          return '<h4 class="rdg">' + esc(g) + '</h4><ul class="rdl">' + items.map(function (c) { return '<li class="' + (c.ok ? "ok" : c.required ? "no" : "opt") + '"><i aria-hidden="true">' + (c.ok ? "&#10003;" : c.required ? "&#10007;" : "&#9675;") + "</i><div><b>" + esc(c.label) + '</b> <span class="badge ' + (c.required ? "" : "mut") + '">' + (c.required ? "Wajib" : "Disarankan") + "</span>" + (c.ok ? "" : '<small>' + esc(c.hint || "") + "</small>") + "</div></li>"; }).join("") + "</ul>";
        }).join("") + "</div></div>";
      var langs = Object.keys(LANGN), setHtml = '<div class="card"><div class="sect"><h3>Pengaturan</h3><form id="tset" class="fgrid" novalidate>' +
        '<label class="fld">Paket yang memakai template ini<select id="ts-pkg"' + (locked || !canW ? " disabled" : "") + ">" + PL.map(function (p) { return '<option value="' + p[0] + '"' + (p[0] === t.package_type ? " selected" : "") + ">" + esc(PKN[p[0]]) + "</option>"; }).join("") + "</select>" + (locked ? '<small class="sub">Terkunci: ' + (t.status === "published" ? "template sedang terbit" : us.total > 0 ? "sudah dipakai " + us.total + " undangan" : "sudah punya aset terpasang") + ". Paket menentukan jenis aset dan pengalaman undangan.</small>" : '<small class="sub">Template hanya muncul di paket ini pada langkah Pilih Template.</small>') + "</label>" +
        '<label class="fld">Bahasa utama<select id="ts-dl"' + (canW ? "" : " disabled") + ">" + langs.map(function (l) { return '<option value="' + l + '"' + (l === t.default_language ? " selected" : "") + ">" + esc(LANGN[l]) + "</option>"; }).join("") + "</select></label>" +
        '<fieldset class="full chk"><legend>Bahasa yang tersedia</legend>' + langs.map(function (l) { return '<label><input type="checkbox" data-lang="' + l + '"' + (t.languages.indexOf(l) > -1 ? " checked" : "") + (canW ? "" : " disabled") + "> " + esc(LANGN[l]) + "</label>"; }).join("") + '<small class="sub">Bahasa ditampilkan sebagai penanda di kartu template. Isi undangan tetap ditulis pelanggan.</small></fieldset>' +
        '<fieldset class="full chk"><legend>Sorotan di halaman Pilih Template</legend><label><input type="checkbox" id="ts-feat"' + (t.featured ? " checked" : "") + (canW && t.status === "published" ? "" : " disabled") + '> Unggulan (tampil paling atas)</label><label><input type="checkbox" id="ts-rec"' + (t.recommended ? " checked" : "") + (canW && t.status === "published" ? "" : " disabled") + "> Rekomendasi</label>" + (t.status === "published" ? "" : '<small class="sub">Hanya template Published yang bisa disorot.</small>') + "</fieldset>" +
        (canW ? '<div class="full"><button class="btn" type="submit">Simpan pengaturan</button></div>' : "") + "</form></div></div>";
      var pvUrl = /^\/(?!\/)/.test(t.preview_url || "") ? t.preview_url : "/preview?demo=" + encodeURIComponent(t.slug), ext = /^https?:\/\//.test(t.preview_url || "") ? t.preview_url : "";
      var pvHtml = '<div class="card"><div class="sect"><h3>Preview</h3><div class="btns" style="margin-bottom:10px">' + (pv ? '<button class="btn o sm" type="button" data-pv="">Tutup preview</button><button class="btn o sm" type="button" data-pv="d">Desktop</button><button class="btn o sm" type="button" data-pv="m">Ponsel</button>' : '<button class="btn sm" type="button" data-pv="d">Tampilkan preview</button>') + '<a class="btn o sm" target="_blank" rel="noopener" href="' + esc(ext || pvUrl) + '">Buka di tab baru</a></div>' + (pv ? '<iframe class="pvf ' + pv + '" src="' + esc(pvUrl) + '" title="Preview ' + esc(t.name) + '"></iframe>' : '<p class="sub">Demo yang dilihat pelanggan di tombol "Coba Demo".</p>') + "</div></div>";
      var vrows = (D.versions || []).map(function (v) { return "<tr><td><b>v" + v.version + "</b></td><td>" + dt(v.created_at, 1) + "</td><td>" + esc(v.by || "-") + "</td><td>" + esc(v.note || "-") + "</td><td class=\"num\">" + v.assets + "</td><td>" + (v.current ? '<span class="badge ok">Sama dengan isi saat ini</span>' : (canW && t.status !== "published" ? '<button class="btn o sm" type="button" data-rest="' + v.version + '">Pulihkan</button>' : "")) + "</td></tr>"; });
      var verHtml = '<div class="card"><div class="sect"><h3>Versi template</h3><p class="sub" style="margin:0 0 10px">' + (D.dirty ? '<span class="badge warn">Ada perubahan</span> Isi saat ini belum tersimpan sebagai versi.' : '<span class="badge ok">Tersimpan</span> Isi saat ini sama dengan ' + ver + ".") + " Versi adalah cadangan (info, aset terpasang, tema) untuk memulihkan template. Undangan pelanggan selalu memakai template yang sedang tampil.</p>" + (vrows.length ? tbl([["Versi"], ["Tanggal"], ["Oleh"], ["Catatan"], ["Aset", 1], [""]], vrows) : '<p class="sub">Belum ada versi tersimpan.</p>') + "</div></div>";
      root.innerHTML = back + '<div class="card dhead"><div><h2>' + esc(t.name) + '</h2><p class="sub">' + esc(t.slug) + " &middot; " + esc(PKN[t.package_type] || t.package_type) + "</p><div>" + badge(t.status) + tplFlags(t) + ' <span class="badge mut">' + esc(ver) + '</span></div></div><div class="btns">' + b + "</div></div>" +
        '<div class="stats">' + stat("Dipakai undangan", us.total + ' <small class="sub">(' + us.active + " aktif)</small>") + stat("Draft / menunggu bayar", us.draft + " / " + us.pending) + stat("Dibuat 30 hari terakhir", us.last30) + stat("Aset terpasang", D.assets_count) + stat("Tema aktif", D.themes.filter(function (x) { return x.enabled; }).length) + "</div>" + rdHtml + pvHtml + setHtml +
        '<div class="card">' + kvs([["Kategori acara", esc((t.categories || []).join(", ") || t.category_name || "-")], ["Bahasa", esc(t.languages.map(function (l) { return LANGN[l] || l; }).join(", "))], ["Harga tambahan", t.price ? rp(t.price) : "Termasuk paket"], ["Dibuat", dt(t.created_at, 1)], ["Terakhir diperbarui", dt(t.updated_at, 1)], ["Diterbitkan", dt(t.published_at, 1)]]) + "</div>" + verHtml;
      var f = $("#tset", root);
      if (f) f.onsubmit = function (e) {
        e.preventDefault(); if (!canW) return;
        var ls = $$("[data-lang]", f).filter(function (x) { return x.checked; }).map(function (x) { return x.dataset.lang; });
        run("admin_template_settings", { p_id: id, p_patch: { package_type: $("#ts-pkg").value, languages: ls, default_language: $("#ts-dl").value, featured: $("#ts-feat").checked, recommended: $("#ts-rec").checked } }, "Pengaturan disimpan.");
      };
    }
    root.onclick = function (e) {
      if (!D) return; var t = D.template, pb = e.target.closest("[data-pv]");
      if (pb) { pv = pb.dataset.pv; return draw(); }
      if (e.target.closest("[data-studio]")) {
        var tab = M.filter(function (m) { return m.key === "templates"; })[0].tabs[0];
        return sb.from("templates").select("*,event_categories(name)").eq("id", id).maybeSingle().then(function (r) { if (!r.data) return fail(r.error || {}, "Template tidak ditemukan"); if (tab.studio) tab.studio(tab, r.data, load); else openForm(tab, r.data, load, "Edit template"); });
      }
      var ta = e.target.closest("[data-ta]");
      if (ta) {
        var act = ta.dataset.ta, call = function (n, force) { return run("admin_template_action", { p_id: id, p_action: n, p_note: force ? force : null, p_force: !!force }, "Status template diperbarui."); };
        if (act === "force") { var miss = D.readiness.checks.filter(function (c) { return c.required && !c.ok; }).map(function (c) { return c.label; }).join(", "); return noteForm("Terbitkan paksa", 1, "Belum lengkap: " + miss + ". Template akan tayang tanpa kelengkapan tersebut; alasan tercatat di audit.", function (note) { return sb.rpc("admin_template_action", { p_id: id, p_action: "publish", p_note: note, p_force: true }); }, load); }
        if (act === "publish") return dlgConfirm("Publikasikan template ini? Template langsung muncul di halaman Pilih Template pelanggan.", "Publikasikan").then(function (y) { if (y) call("publish"); });
        if (act === "unpublish") return dlgConfirm("Tarik template dari publikasi? Template tidak lagi tampil di Pilih Template. Undangan yang sudah memakainya tetap berjalan.", "Tarik ke draft").then(function (y) { if (y) call("unpublish"); });
        if (act === "archive") return dlgConfirm("Arsipkan template ini?" + (D.usage.total ? " " + D.usage.total + " undangan memakainya dan tetap berjalan." : "") + " Template tidak tampil di Pilih Template.", "Arsipkan").then(function (y) { if (y) call("archive"); });
        return call("unarchive");
      }
      if (e.target.closest("[data-dup]")) return openForm({ fields: [{ k: "name", l: "Nama template baru", req: 1, max: 80, def: t.name + " (salinan)" }, { k: "slug", l: "Slug baru", req: 1, pat: /^[a-z0-9-]{2,60}$/, def: t.slug + "-salinan", help: "Huruf kecil, angka, tanda minus." }], title: function () { return "Duplikasi template"; }, custom: function (v) { return sb.rpc("admin_template_duplicate", { p_id: id, p_name: v.name, p_slug: v.slug }).then(function (r) { if (!r.error) location.hash = "#templates:items:" + r.data; return r; }); } }, null, function () { }, "Duplikasi template");
      if (e.target.closest("[data-ver]")) return noteForm("Simpan versi", 0, "Menyimpan cadangan info, aset terpasang, dan tema saat ini.", function (note) { return sb.rpc("admin_template_save_version", { p_id: id, p_note: note }); }, load);
      var rs = e.target.closest("[data-rest]");
      if (rs) return dlgConfirm("Pulihkan template ke v" + rs.dataset.rest + "? Info, aset terpasang, dan tema diganti dengan isi versi itu. Kondisi saat ini disimpan otomatis sebagai versi baru bila belum tersimpan.", "Pulihkan").then(function (y) {
        if (y) sb.rpc("admin_template_restore_version", { p_id: id, p_version: Number(rs.dataset.rest) }).then(function (r) { if (r.error) return fail(r.error, "Gagal memulihkan"); var d = r.data || {}; toast("Versi dipulihkan." + (d.skipped_assets ? " " + d.skipped_assets + " aset dilewati karena sudah dihapus." : ""), "ok"); load(); });
      });
    };
    load();
  }
  function ticketThread(r, box, reload) {
    var canW = can("support", "write");
    function load() {
      box.innerHTML = '<div class="sk h3"></div>';
      sb.from("ticket_replies").select("*").eq("ticket_id", r.id).order("created_at").then(function (res) {
        var th = (r.message ? [{ body: r.message, is_staff: false, created_at: r.created_at }] : []).concat(res.data || []);
        box.innerHTML = '<div class="sect"><h3>Percakapan</h3><div class="thread">' + (th.length ? th.map(function (m) { return '<div class="msg-b' + (m.is_staff ? " staff" : "") + '"><small>' + (m.is_staff ? "Tim NusaMora" : "Pelanggan") + " &middot; " + dt(m.created_at, 1) + "</small>" + esc(m.body) + "</div>"; }).join("") : '<p class="sub">Belum ada pesan.</p>') + "</div></div>" + (canW ? '<form id="rf" class="fld"><label for="rb">Balasan</label><textarea id="rb" rows="3" maxlength="4000" required style="font:inherit;padding:10px 12px;border-radius:12px;border:1.5px solid var(--line);width:100%"></textarea><div class="row-end"><button class="btn" type="submit">Kirim balasan</button></div></form>' : "");
        var f = $("#rf", box); if (f) f.onsubmit = function (e) { e.preventDefault(); var b = $("#rb", f).value.trim(); if (!b) return; sb.from("ticket_replies").insert({ ticket_id: r.id, author_id: A.user.id, is_staff: true, body: b }).then(function (x) { if (x.error) return fail(x.error, "Gagal mengirim"); toast("Balasan tersimpan.", "ok"); load(); }); };
      });
    } load();
  }

  /* ---------- halaman khusus ---------- */
  function chart(series, bk, lk) {
    var W = 640, H = 230, L = 46, B = 28, T = 10, R = 10, pw = W - L - R, ph = H - T - B, mb = 1, ml = 1; series.forEach(function (x) { mb = Math.max(mb, Number(x[bk])); ml = Math.max(ml, Number(x[lk])); });
    var o = '<svg class="chart" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="Grafik pertumbuhan">', bw = Math.min(40, pw / series.length * .5), pts = [];
    for (var g = 0; g <= 4; g++) { var y = T + ph - ph * g / 4; o += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + y + '" y2="' + y + '" stroke="#E5E0EC"/><text x="' + (L - 6) + '" y="' + (y + 4) + '" text-anchor="end">' + (bk === "revenue" ? (mb * g / 4 >= 1e6 ? Math.round(mb * g / 4 / 1e5) / 10 + "jt" : Math.round(mb * g / 4 / 1000) + "rb") : Math.round(mb * g / 4)) + "</text>"; }
    series.forEach(function (x, i) { var cx = L + pw * (i + .5) / series.length, h = ph * Number(x[bk]) / mb, lb = x.m.length > 7 ? new Date(x.m + "T00:00:00+07:00").toLocaleDateString("id-ID", { day: "numeric", month: "short", timeZone: "Asia/Jakarta" }) : new Date(x.m + "-01").toLocaleDateString("id-ID", { month: "short", year: "2-digit" }), skip = series.length > 12 ? Math.ceil(series.length / 10) : 1; o += '<rect x="' + (cx - bw / 2) + '" y="' + (T + ph - h) + '" width="' + bw + '" height="' + h + '" rx="5" fill="#9673D0"><title>' + lb + ": " + (bk === "revenue" ? rp(x[bk]) : x[bk]) + ", " + x[lk] + ' pelanggan</title></rect>' + (i % skip === 0 ? '<text x="' + cx + '" y="' + (H - 8) + '" text-anchor="middle">' + lb + "</text>" : ""); pts.push(cx + "," + (T + ph - ph * Number(x[lk]) / ml)); });
    return o + (series.length > 1 ? '<polyline points="' + pts.join(" ") + '" fill="none" stroke="#7552A8" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>' : "") + "</svg>";
  }
  /* ---- Dashboard utama: periode, keuangan, undangan, transaksi, peringatan, aksi cepat ---- */
  var DP = { k: "6m", f: "", t: "" }, DPERIODS = [["today", "Hari ini"], ["7d", "7 hari"], ["30d", "30 hari"], ["3m", "3 bulan"], ["6m", "6 bulan"], ["custom", "Custom"]];
  function jk(off) { return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date(Date.now() + (off || 0) * 864e5)); }
  function jIso(ds) { return new Date(ds + "T00:00:00+07:00").toISOString(); }
  function addDays(ds, n) { var x = new Date(ds + "T00:00:00Z"); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); }
  function dashRange() {
    var today = jk(0), k = DP.k, f, t = addDays(today, 1);
    if (k === "today") f = today; else if (k === "7d") f = addDays(today, -6); else if (k === "30d") f = addDays(today, -29);
    else if (k === "3m" || k === "6m") { var n = k === "3m" ? 2 : 5, y = +today.slice(0, 4), m = +today.slice(5, 7) - n; while (m < 1) { m += 12; y--; } f = y + "-" + String(m).padStart(2, "0") + "-01"; }
    else { f = DP.f; t = addDays(DP.t, 1); }
    return { f: f, t: t, to_incl: addDays(t, -1), from: jIso(f), to: jIso(t) };
  }
  function rangeErr() { if (DP.k !== "custom") return ""; if (!DP.f || !DP.t) return "Isi tanggal mulai dan tanggal akhir."; if (DP.f > DP.t) return "Tanggal mulai tidak boleh setelah tanggal akhir."; if ((Date.parse(DP.t) - Date.parse(DP.f)) / 864e5 > 399) return "Rentang maksimal 400 hari."; return ""; }
  function dfmt(ds) { return new Date(ds + "T00:00:00+07:00").toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Jakarta" }); }
  function nf(n) { return Number(n || 0).toLocaleString("id-ID"); }
  function kpiCard(l, v, sub, ic, href) { var inner = '<span>' + esc(l) + "</span><b>" + esc(v) + "</b>" + (sub ? "<small>" + esc(sub) + "</small>" : "") + '<i class="ico">' + ico(ic) + "</i>"; return href ? '<a class="card kpi lnk" href="' + href + '">' + inner + "</a>" : '<div class="card kpi">' + inner + "</div>"; }
  function dashAlerts(a, extra) {
    var L = [];
    if (a.failed_7d > 0) L.push({ n: a.failed_7d, t: "pembayaran gagal dalam 7 hari terakhir", to: "#transactions:all", c: "bad" });
    if (a.anomalies_7d > 0) L.push({ n: a.anomalies_7d, t: "anomali pembayaran (nominal tidak cocok atau order tidak dikenal) dalam 7 hari", to: "#transactions:all", c: "bad" });
    if (a.pending_24h > 0) L.push({ n: a.pending_24h, t: "pembayaran menunggu lebih dari 24 jam (mungkin tersangkut)", to: "#transactions:pending", c: "warn" });
    if (a.expiring_7d > 0) L.push({ n: a.expiring_7d, t: "undangan aktif akan berakhir dalam 7 hari", to: "#invitations", c: "warn" });
    if (a.expired_7d > 0) L.push({ n: a.expired_7d, t: "undangan berakhir dalam 7 hari terakhir", to: "#invitations", c: "" });
    return L.concat(extra.filter(function (x) { return x.n > 0; }).map(function (x) { return { n: x.n, t: x.t, to: x.to, c: "warn" }; }));
  }
  function renderDashboard(root) {
    var err = rangeErr(), R = err ? null : dashRange();
    var bar = '<div class="tool dper"><div class="seg" role="group" aria-label="Periode">' + DPERIODS.map(function (p) { return '<button type="button" class="sgb' + (DP.k === p[0] ? " on" : "") + '" data-per="' + p[0] + '" aria-pressed="' + (DP.k === p[0]) + '">' + p[1] + "</button>"; }).join("") + "</div>" +
      (DP.k === "custom" ? '<label class="fld">Dari<input type="date" id="pf" value="' + esc(DP.f) + '"></label><label class="fld">Sampai<input type="date" id="pt" value="' + esc(DP.t) + '"></label><button class="btn" type="button" id="pa">Terapkan</button>' : "") + "</div>" +
      (err ? '<div class="alertc bad" role="alert">' + esc(err) + "</div>" : '<p class="fine dnote">Periode: ' + dfmt(R.f) + (R.f === R.to_incl ? "" : " &ndash; " + dfmt(R.to_incl)) + " &middot; zona WIB &middot; tanggal transaksi = tanggal bayar (atau tanggal dibuat bila belum dibayar).</p>");
    function wire() {
      $$("[data-per]", root).forEach(function (b) { b.onclick = function () { DP.k = b.dataset.per; if (DP.k === "custom" && !DP.f) { DP.t = jk(0); DP.f = addDays(DP.t, -29); } renderDashboard(root); }; });
      var pa = $("#pa", root); if (pa) pa.onclick = function () { DP.f = $("#pf", root).value; DP.t = $("#pt", root).value; renderDashboard(root); };
    }
    if (err) { root.innerHTML = bar; wire(); return; }
    root.innerHTML = bar + '<div class="kpis">' + [1, 2, 3, 4].map(function () { return '<div class="card"><div class="sk h1" style="width:50%"></div><div class="sk h2" style="margin-top:12px"></div></div>'; }).join("") + "</div>" + skel(); wire();
    var acts = can("admins", "read") ? sb.from("audit_logs").select("actor_id,action,table_name,created_at").order("created_at", { ascending: false }).limit(8) : Promise.resolve({ data: [] });
    var inv = can("transactions", "read") ? sb.from("invoices").select("number,amount,status,created_at").order("created_at", { ascending: false }).limit(5) : Promise.resolve({ data: [] });
    var token = (renderDashboard.tok = (renderDashboard.tok || 0) + 1);
    Promise.all([sb.rpc("admin_dashboard", { p_from: R.from, p_to: R.to }), acts, inv, alertsData()]).then(function (rs) {
      if (token !== renderDashboard.tok) return;
      if (rs[0].error) throw rs[0].error; var s = rs[0].data || {}, ser = s.series || [], k = s.kpi || {}, iv = s.invitations || {}, cu = s.customers || {};
      var ev = (rs[1].data || []).map(function (x) { return { t: x.created_at, a: adminName(x.actor_id) + ": " + x.action + " " + x.table_name }; }).concat((rs[2].data || []).map(function (x) { return { t: x.created_at, a: "Invoice " + x.number + " " + rp(x.amount) + " (" + x.status + ")" }; })).sort(function (a, b) { return new Date(b.t) - new Date(a.t); }).slice(0, 10);
      var tl = can("transactions", "read"), il = can("invitations", "read"), cl = can("customers", "read");
      var extra = rs[3].filter(function (x) { return /^#(support|affiliate)/.test(x.to) || x.to === "#customers:list" || x.to === "#invitations:flag"; });
      var AL = dashAlerts(s.alerts || {}, extra);
      var qa = [];
      if (can("templates", "write")) qa.push(["#templates:add", "Tambah Template", "plus"]);
      if (il) qa.push(["#invitations:flag", "Moderasi Undangan", "shield"]);
      if (tl) qa.push(["#transactions:pending", "Verifikasi Transaksi", "card"]);
      var money = ["Pendapatan bersih", rp(k.revenue_net), "Kotor " + rp(k.revenue_gross) + " − refund " + rp(k.refund), "card"];
      root.innerHTML = bar +
        (qa.length ? '<div class="qa" aria-label="Aksi cepat">' + qa.map(function (q) { return '<a class="btn o" href="' + q[0] + '">' + ico(q[2]) + " " + q[1] + "</a>"; }).join("") + "</div>" : "") +
        '<div class="card"><div class="card-h"><h2>Perlu perhatian</h2></div>' + (AL.length ? AL.map(function (x) { return '<div class="alertc ' + x.c + '"><b>' + nf(x.n) + "</b> " + esc(x.t) + '<a href="' + x.to + '">Tinjau</a></div>'; }).join("") : '<div class="alertc ok">Tidak ada peringatan operasional saat ini.</div>') + "</div>" +
        '<h3 class="kh">Keuangan <small>periode terpilih</small></h3><div class="kpis">' + [money, ["Pendapatan kotor", rp(k.revenue_gross), "Semua pembayaran lunas + refund", "card"], ["Refund", rp(k.refund), nf(k.tx_refund) + " transaksi", "doc"], ["Pelanggan baru", nf(cu["new"]), "Total " + nf(cu.total) + " pelanggan", "users"]].map(function (c) { return kpiCard(c[0], c[1], c[2], c[3], null); }).join("") + "</div>" +
        '<p class="fine dnote">Pendapatan bersih = pembayaran lunas (setelah refund). Transaksi menunggu atau gagal tidak pernah dihitung. Biaya gateway Midtrans tidak tercatat di sistem, jadi belum dikurangkan.</p>' +
        '<h3 class="kh">Undangan <small>kondisi saat ini &middot; ' + nf(iv.total) + " total, " + nf(iv["new"]) + " baru di periode</small></h3><div class=\"kpis\">" + [["Aktif", iv.aktif, "mail"], ["Draft", iv.draft, "doc"], ["Kedaluwarsa", iv.kedaluwarsa, "bell"], ["Menunggu pembayaran", iv.menunggu_pembayaran, "card"]].map(function (c) { return kpiCard(c[0], nf(c[1]), "", c[2], il ? "#invitations" : null); }).join("") + "</div>" +
        '<h3 class="kh">Transaksi <small>periode terpilih</small></h3><div class="kpis">' + [["Berhasil", nf(k.tx_success), rp(k.revenue_net), "doc", "#transactions"], ["Pending", nf(k.tx_pending), rp(k.val_pending), "doc", "#transactions:pending"], ["Gagal", nf(k.tx_failed), rp(k.val_failed), "doc", "#transactions"], ["Refund", nf(k.tx_refund), rp(k.refund), "doc", "#transactions"]].map(function (c) { return kpiCard(c[0], c[1], c[2], "doc", tl ? c[4] : null); }).join("") + "</div>" +
        '<div class="two-c"><div class="card"><div class="card-h"><h2>Pendapatan bersih &amp; pelanggan baru</h2></div><div class="legend"><span><i style="background:#9673D0"></i>Pendapatan bersih</span><span><i style="background:#7552A8"></i>Pelanggan baru</span></div>' + (ser.some(function (x) { return Number(x.revenue) || Number(x.customers); }) ? chart(ser, "revenue", "customers") : empty("Belum ada data di periode ini", "Grafik terisi setelah ada pelanggan baru atau transaksi lunas.")) + '<p class="fine">Sumber data dan periode sama dengan angka di atas.</p></div><div class="card"><div class="card-h"><h2>Aktivitas terbaru</h2></div>' +
        (ev.length ? '<ul class="act-list">' + ev.map(function (x) { return "<li><i>" + ico("pulse").replace('class="ic"', 'class="ic" style="width:16px;height:16px"') + "</i><div><b>" + esc(x.a) + "</b><span>" + dt(x.t, 1) + "</span></div></li>"; }).join("") + "</ul>" : empty("Belum ada aktivitas", "")) + "</div></div>";
      wire();
    }).catch(function (e) { if (token !== renderDashboard.tok) return; root.innerHTML = bar + errBox(e && (e.code === "42883" || e.code === "PGRST202") ? "Fungsi dashboard belum dibuat. Jalankan backend/admin-dashboard.sql di Supabase." : e && /periode_tidak_valid/.test(e.message || "") ? "Periode tidak valid." : "Terjadi kendala saat memuat.", 1); wire(); });
  }
  function bars(rows, lab, val, fmt) { var mx = Math.max.apply(null, rows.map(function (x) { return Number(x[val]); }).concat([1])); return '<ul class="bars">' + rows.map(function (x) { return "<li><span>" + esc(x[lab]) + '</span><div class="tr"><i style="width:' + (Number(x[val]) / mx * 100) + '%"></i></div><b>' + (fmt ? fmt(x[val]) : esc(x[val])) + "</b></li>"; }).join("") + "</ul>"; }
  var RMONTHS = 6;
  function renderReports(root) {
    root.innerHTML = skel();
    sb.rpc("admin_reports", { months: RMONTHS }).then(function (r) {
      if (r.error) throw r.error; var x = r.data || {}, conv = x.customers ? Math.round(x.paying / x.customers * 1000) / 10 : 0, ser = x.series || [];
      root.innerHTML = '<div class="tool"><label class="fld">Periode<select id="rm"><option value="6"' + (RMONTHS === 6 ? " selected" : "") + '>6 bulan</option><option value="12"' + (RMONTHS === 12 ? " selected" : "") + ">12 bulan</option></select></label></div>" +
        '<div class="kpis">' + [["Pelanggan", x.customers], ["Pelanggan berbayar", x.paying], ["Conversion rate", conv + "%"], ["Total tamu undangan", x.guests], ["Total ucapan", x.wishes]].map(function (k) { return '<div class="card kpi"><span>' + k[0] + "</span><b>" + esc(k[1]) + "</b></div>"; }).join("") + "</div>" +
        '<div class="two-c"><div class="card"><div class="card-h"><h2>Revenue &amp; pertumbuhan pelanggan</h2></div>' + (ser.length ? chart(ser, "revenue", "customers") : "") + '</div><div class="card"><div class="card-h"><h2>Template terpopuler</h2></div>' + ((x.top_templates || []).length ? bars(x.top_templates, "template", "n") : empty("Belum ada data", "")) + "</div></div>" +
        '<div class="two-c"><div class="card"><div class="card-h"><h2>Transaksi per status</h2></div>' + ((x.tx_status || []).length ? '<div class="tbl-w"><table><thead><tr><th>Status</th><th class="num">Jumlah</th><th class="num">Nilai</th></tr></thead><tbody>' + x.tx_status.map(function (t) { return "<tr><td>" + badge(t.status) + '</td><td class="num">' + t.n + '</td><td class="num">' + rp(t.total) + "</td></tr>"; }).join("") + "</tbody></table></div>" : empty("Belum ada transaksi", "")) + '</div><div class="card"><div class="card-h"><h2>Langganan per paket</h2></div>' + ((x.by_plan || []).length ? bars(x.by_plan, "plan", "n") : empty("Belum ada langganan", "")) + "</div></div>";
      $("#rm").onchange = function (e) { RMONTHS = Number(e.target.value); renderReports(root); };
    }).catch(function (e) { root.innerHTML = errBox("Laporan tidak bisa dimuat. Pastikan backend/admin-schema.sql sudah dijalankan.", 1); });
  }
  function affiliateReport(root) {
    root.innerHTML = skel();
    Promise.all([sb.from("affiliates").select("status"), sb.from("referrals").select("status,commission"), sb.from("withdrawals").select("status,amount"), sb.from("bonus_history").select("amount")]).then(function (rs) {
      var af = rs[0].data || [], rf = rs[1].data || [], wd = rs[2].data || [], bn = rs[3].data || [], sum = function (a, k) { return a.reduce(function (t, x) { return t + Number(x[k] || 0); }, 0); };
      var K = [["Affiliate aktif", af.filter(function (x) { return x.status === "aktif"; }).length], ["Total referral", rf.length], ["Referral berbayar", rf.filter(function (x) { return x.status === "berbayar"; }).length], ["Total komisi", rp(sum(rf, "commission"))], ["Total bonus tercatat", rp(sum(bn, "amount"))], ["Dicairkan", rp(sum(wd.filter(function (x) { return x.status === "berhasil"; }), "amount"))], ["Menunggu pencairan", rp(sum(wd.filter(function (x) { return x.status === "diproses"; }), "amount"))]];
      root.innerHTML = '<div class="kpis">' + K.map(function (k) { return '<div class="card kpi"><span>' + k[0] + "</span><b>" + esc(k[1]) + "</b></div>"; }).join("") + "</div>";
    }).catch(function () { root.innerHTML = errBox("Laporan tidak bisa dimuat.", 1); });
  }
  function alertsData() {
    var now = new Date().toISOString(), soon = new Date(Date.now() + 7 * 864e5).toISOString(), cnt = function (t, f) { var q = sb.from(t).select("id", { count: "exact", head: true }); return f(q).then(function (r) { return r.error ? 0 : (r.count || 0); }); }, z = Promise.resolve(0);
    return Promise.all([can("transactions", "read") ? cnt("invoices", function (q) { return q.eq("status", "menunggu"); }) : z, can("support", "read") ? cnt("tickets", function (q) { return q.in("status", ["open", "diproses"]); }) : z, can("invitations", "read") ? cnt("invitations", function (q) { return q.eq("moderation", "flagged"); }) : z, can("customers", "read") ? sb.from("subscriptions").select("id", { count: "exact", head: true }).eq("status", "aktif").gte("expires_at", now).lte("expires_at", soon).then(function (r) { return r.error ? 0 : (r.count || 0); }) : z, can("affiliate", "read") ? cnt("withdrawals", function (q) { return q.eq("status", "diproses"); }) : z]).then(function (n) { return [{ n: n[0], t: "pembayaran menunggu verifikasi", to: "#transactions:pending" }, { n: n[1], t: "tiket belum selesai", to: "#support:all" }, { n: n[2], t: "undangan terlapor perlu moderasi", to: "#invitations:flag" }, { n: n[3], t: "langganan berakhir dalam 7 hari", to: "#customers:list" }, { n: n[4], t: "pencairan menunggu diproses", to: "#affiliate:wd" }]; });
  }
  function renderAlerts(root) {
    root.innerHTML = skel();
    alertsData().then(function (a) { var on = a.filter(function (x) { return x.n > 0; }); root.innerHTML = '<div class="card">' + (on.length ? on.map(function (x) { return '<div class="alertc"><b>' + x.n + "</b> " + esc(x.t) + '<a href="' + x.to + '">Tinjau</a></div>'; }).join("") : '<div class="alertc ok">Tidak ada peringatan sistem. Semua beres.</div>') + "</div>"; });
  }
  function renderRoles(root) {
    root.innerHTML = skel();
    sb.from("role_permissions").select("role,permission").then(function (r) {
      if (r.error) return root.innerHTML = errBox("Daftar izin tidak bisa dimuat.", 1);
      var has = {}; (r.data || []).forEach(function (x) { has[x.role + "|" + x.permission] = 1; });
      var roles = Object.keys(ROLE), mods = M.filter(function (m) { return m.perm; });
      root.innerHTML = '<div class="card"><p class="sub" style="margin-bottom:12px">Matriks izin per peran. B = lihat (read), T = ubah (write). Izin dikelola di tabel <code>role_permissions</code>; penegakan dilakukan oleh database.</p><div class="tbl-w"><table class="matrix"><thead><tr><th>Modul</th>' + roles.map(function (k) { return "<th>" + ROLE[k] + "</th>"; }).join("") + "</tr></thead><tbody>" + mods.map(function (m) { return "<tr><td><b>" + esc(m.label) + "</b></td>" + roles.map(function (k) { var rd = has[k + "|" + m.perm + ".read"], wr = has[k + "|" + m.perm + ".write"]; return "<td>" + (rd ? '<span class="yes">B</span>' : '<span class="no">-</span>') + " " + (wr ? '<span class="yes">T</span>' : '<span class="no">-</span>') + "</td>"; }).join("") + "</tr>"; }).join("") + "</tbody></table></div></div>";
    });
  }

  /* ================= router & shell ================= */
  var R = { m: "", t: "" };
  var GO = ["Ringkasan", "Pelanggan & Acara", "Bisnis", "Komunikasi", "Sistem"];
  function grpOf(m) { return m.grp || (m.key === "invitations" || m.key === "templates" || m.key === "live" ? "Pelanggan & Acara" : m.key === "transactions" || m.key === "plans" || m.key === "affiliate" || m.key === "reports" ? "Bisnis" : ""); }
  function allowed() { return M.filter(function (m) { return can(m.perm, "read"); }).map(function (m, i) { m._g = grpOf(m) || m.grp; m._i = i; return m; }).sort(function (a, b) { return GO.indexOf(a._g) - GO.indexOf(b._g) || a._i - b._i; }); }
  function buildNav() {
    var g = "", h = "";
    allowed().forEach(function (m) { if (m._g && m._g !== g) { g = m._g; h += '<div class="grp">' + esc(g) + "</div>"; } h += '<a href="#' + m.key + '"' + (m.key === R.m ? ' aria-current="page"' : "") + ">" + ico(m.icon) + "<span>" + esc(m.label) + "</span></a>"; });
    $("#nav").innerHTML = h;
  }
  function route() {
    var h = (location.hash || "").slice(1).split(":"), ok = allowed(), wantAdd = h[1] === "add", sub = h[2] || ""; if (!ok.length) return; if (wantAdd) { h[1] = ""; try { history.replaceState(null, "", "#" + h[0]); } catch (e) {} }
    var m = ok.filter(function (x) { return x.key === h[0]; })[0] || ok[0]; R.m = m.key; R.t = h[1] || (m.tabs ? m.tabs[0].key : ""); closeNav(); closeDrawer(); buildNav();
    var tab = curTab(), view = $("#view");
    $("#crumbs").innerHTML = '<a href="#dashboard">Admin</a><span>/</span>' + (m.tabs ? '<a href="#' + m.key + '">' + esc(m.label) + '</a><span>/</span>' + (sub && tab.detail ? '<a href="#' + m.key + ":" + tab.key + '">' + esc(tab.label) + '</a><span>/</span><span aria-current="page">Detail</span>' : '<span aria-current="page">' + esc(tab.label) + "</span>") : '<span aria-current="page">' + esc(m.label) + "</span>");
    d.title = m.label + " | Admin NusaMora";
    var head = '<div class="pghead"><div><h1>' + esc(m.label) + "</h1></div></div>";
    var body = '<div id="body"></div>';
    var tabs = m.tabs && m.tabs.length > 1 && !(sub && tab.detail) ? '<div class="tabs" role="tablist">' + m.tabs.map(function (t) { return '<button type="button" role="tab" aria-selected="' + (t.key === tab.key) + '" data-tab="' + t.key + '">' + esc(t.label) + "</button>"; }).join("") + "</div>" : "";
    view.innerHTML = head + tabs + body; var root = $("#body");
    if (m.render) return m.render(root);
    if (tab.render) return tab.render(root);
    if (sub && tab.detail) return tab.detail(sub, root);
    if (tab.settings) return renderSettings(tab, root);
    if (tab.note) root.insertAdjacentHTML("beforebegin", '<div class="note" style="margin-bottom:14px">' + esc(tab.note) + "</div>");
    renderTable(tab, root); bindTable(tab, root);
    if (wantAdd) setTimeout(function () { var b = $("[data-add],[data-new]", view); if (b) b.click(); }, 350);
  }
  d.addEventListener("click", function (e) { var t = e.target.closest("[data-tab]"); if (t) location.hash = "#" + R.m + ":" + t.dataset.tab; });
  addEventListener("hashchange", route);
  var app = $("#app"), burger = $("#burger"), scrim = $("#scrim");
  function openNav() { app.classList.add("open"); scrim.hidden = false; burger.setAttribute("aria-expanded", "true"); }
  function closeNav() { app.classList.remove("open"); scrim.hidden = true; burger.setAttribute("aria-expanded", "false"); }
  burger.onclick = openNav; scrim.onclick = closeNav; $("#side-x").onclick = function () { closeNav(); burger.focus(); };
  d.addEventListener("keydown", function (e) { if (e.key === "Escape") { closeNav(); if (!$("#drawer").hidden) closeDrawer(); $$(".pop").forEach(function (p) { p.hidden = true; }); } });
  $("#gsearch").addEventListener("submit", function (e) { e.preventDefault(); var q = $("#gq").value.trim(); if (!can("customers", "read")) return toast("Anda tidak punya izin melihat pelanggan.", "bad"); tstate("customers:list").q = q; tstate("customers:list").page = 0; if (location.hash === "#customers:list" || location.hash === "#customers") route(); else location.hash = "#customers:list"; });
  function pop(btn, panel) { btn.addEventListener("click", function (e) { e.stopPropagation(); var open = panel.hidden; $$(".pop").forEach(function (p) { p.hidden = true; }); panel.hidden = !open; btn.setAttribute("aria-expanded", String(open)); }); }
  d.addEventListener("click", function (e) { if (!e.target.closest(".pop-w")) $$(".pop").forEach(function (p) { p.hidden = true; }); });
  function shell() {
    var n = (A.user.email || "Admin"); $("#chip-i").textContent = n.charAt(0).toUpperCase(); $("#chip-n").textContent = ROLE[A.role] || A.role;
    $("#pm-p").innerHTML = '<p><b>' + esc(A.user.email) + "</b><br>" + esc(ROLE[A.role] || A.role) + '</p><a href="/admin-keamanan">' + ico("user") + ' Keamanan akun</a><a href="/akun">' + ico("user") + ' Dashboard pelanggan</a><button class="mi" type="button" id="lo">' + ico("out") + " Keluar</button>";
    pop($("#pm"), $("#pm-p")); pop($("#bell"), $("#bell-p"));
    $("#lo").onclick = function () { sb.auth.signOut().then(function () { location.replace("/masuk"); }); };
    alertsData().then(function (a) { var on = a.filter(function (x) { return x.n > 0; }), tot = on.reduce(function (t, x) { return t + x.n; }, 0); var b = $("#bell-n"); b.hidden = !tot; b.textContent = tot > 99 ? "99+" : tot; $("#bell-p").innerHTML = "<h3>Notifikasi</h3>" + (on.length ? on.map(function (x) { return '<a href="' + x.to + '"><b>' + x.n + "</b> " + esc(x.t) + "</a>"; }).join("") : "<p>Tidak ada notifikasi baru.</p>"); });
  }
  function denied(t, p) { $("#nav").innerHTML = ""; $("#view").innerHTML = '<div class="card">' + empty(t, p, '<a class="btn" href="/akun">Ke dashboard pelanggan</a>') + "</div>"; $("#chip-n").textContent = "-"; }
  function start() {
    if (!sb) return denied("Sistem belum dikonfigurasi", "Isi SUPABASE_URL dan SUPABASE_ANON_KEY di assets/config.js.");
    $("#view").innerHTML = skel();
    sb.auth.getSession().then(function (r) {
      var s = r.data && r.data.session; if (!s) { location.replace("/masuk?next=/admin"); return; } A.user = s.user;
      return sb.rpc("my_admin").then(function (x) {
        if (x.error) return denied("Panel admin belum siap", "Jalankan backend/admin-schema.sql di Supabase, lalu muat ulang halaman ini.");
        if (!x.data) return denied("Akses ditolak", "Akun ini bukan admin. Hubungi super admin untuk mendapatkan akses.");
        if (x.data.mfa && x.data.mfa.needed) { location.replace("/admin-keamanan?next=" + encodeURIComponent("/admin")); return; } /* MFA/password admin belum terpenuhi: ditegakkan di database, halaman ini hanya mengarahkan */
        A.role = x.data.role; (x.data.perms || []).forEach(function (p) { A.perms[p] = 1; });
        var pre = can("admins", "read") ? sb.rpc("admin_list_admins").then(function (a) { (a.data || []).forEach(function (u) { adminMap[u.user_id] = u.email; }); }) : Promise.resolve();
        return pre.then(function () { shell(); route(); });
      });
    }, function () { denied("Tidak bisa terhubung", "Periksa koneksi internet Anda lalu muat ulang."); });
    sb.auth.onAuthStateChange(function (ev) { if (ev === "SIGNED_OUT") location.replace("/masuk"); });
  }
  /* titik sambung untuk modul tambahan (assets/admin-assets.js) */
  window.NM_ADMIN = { sb: sb, $: $, $$: $$, esc: esc, rp: rp, dt: dt, toast: toast, fail: fail, ico: ico, badge: badge, empty: empty, skel: skel, errBox: errBox, dlgConfirm: dlgConfirm, can: can, buildField: buildField, collect: collect, loadOpts: loadOpts, M: M, PL: PL, PUB: PUB, A: A };
  (window.NM_ADMIN_EXT || []).forEach(function (f) { try { f(window.NM_ADMIN); } catch (e) { if (window.console) console.error("admin ext", e); } });
  start();
})();
