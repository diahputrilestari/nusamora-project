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
  function fail(e, pre) { var c = e && e.code, m = e && e.message || ""; var t = c === "42501" || /forbidden|row-level security/i.test(m) ? "Anda tidak punya izin untuk tindakan ini." : c === "23505" ? "Nilai yang harus unik sudah dipakai data lain." : c === "23514" ? "Nilai tidak memenuhi aturan data." : c === "23503" ? "Data ini masih dipakai oleh data lain." : /fetch|network/i.test(m) ? "Tidak bisa terhubung. Periksa koneksi internet." : (pre || "Terjadi kendala") + (m ? ": " + m : "."); toast(t, "bad"); return t; }
  function ico(n) { var P = { home: '<path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>', users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.500 20c.5-3.500 3-5.500 6.500-5.500s6 2 6.500 5.500"/><circle cx="17.500" cy="9" r="2.500"/><path d="M17 14.500c2.500.2 4 1.700 4.500 4.500"/>', mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>', layout: '<rect x="3.500" y="3.500" width="7.500" height="9" rx="1.500"/><rect x="13" y="3.500" width="7.500" height="5" rx="1.500"/><rect x="13" y="10.500" width="7.500" height="10" rx="1.500"/><rect x="3.500" y="14.500" width="7.500" height="6" rx="1.500"/>', monitor: '<rect x="3" y="4" width="18" height="12.500" rx="2"/><path d="M8 20.500h8M12 16.500v4"/>', card: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M7 15h4"/>', crown: '<path d="M3 8l4.500 4L12 5l4.500 7L21 8l-2 11H5z"/>', doc: '<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 13h7M9 17h7"/>', share: '<circle cx="6" cy="12" r="2.500"/><circle cx="18" cy="6" r="2.500"/><circle cx="18" cy="18" r="2.500"/><path d="M8.200 10.800l7.600-3.600M8.200 13.200l7.600 3.600"/>', help: '<circle cx="12" cy="12" r="9"/><path d="M9.500 9.500a2.500 2.500 0 1 1 3.500 2.300c-.7.400-1 .9-1 1.700M12 17h.01"/>', bars: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>', bell: '<path d="M6 9a6 6 0 0 1 12 0c0 6 2 7 2 7H4s2-1 2-7zM10 20a2 2 0 0 0 4 0"/>', cog: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.200 4.200l2.100 2.100M17.700 17.700l2.100 2.100M2 12h3M19 12h3M4.200 19.800l2.100-2.100M17.700 6.300l2.100-2.100"/>', shield: '<path d="M12 3l8 3v6c0 4.500-3.200 7.800-8 9-4.800-1.200-8-4.500-8-9V6z"/>', plus: '<path d="M12 5v14M5 12h14"/>', out: '<path d="M10 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h5M15 8l4 4-4 4M19 12H9"/>', user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c.6-4 3.800-6 8-6s7.400 2 8 6"/>', pulse: '<path d="M3 12h4l2-6 4 12 2-6h6"/>' }; return '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true">' + (P[n] || "") + "</svg>"; }
  var ST = { aktif: ["Aktif", "ok"], suspended: ["Suspended", "bad"], draft: ["Draft", ""], menunggu_pembayaran: ["Menunggu bayar", "warn"], selesai: ["Selesai", ""], nonaktif: ["Nonaktif", "warn"], published: ["Published", "ok"], archived: ["Arsip", "warn"], menunggu: ["Menunggu", "warn"], lunas: ["Lunas", "ok"], gagal: ["Gagal", "bad"], dibatalkan: ["Dibatalkan", "bad"], refund: ["Refund", "warn"], diproses: ["Diproses", "warn"], berhasil: ["Berhasil", "ok"], ditolak: ["Ditolak", "bad"], open: ["Open", "warn"], ditutup: ["Ditutup", ""], pending: ["Pending", "warn"], terdaftar: ["Terdaftar", ""], berbayar: ["Berbayar", "ok"], batal: ["Batal", "bad"], ok: ["Normal", "ok"], flagged: ["Terlapor", "warn"], takedown: ["Diturunkan", "bad"], terjadwal: ["Terjadwal", "warn"], terkirim: ["Terkirim", "ok"], tinggi: ["Tinggi", "bad"], normal: ["Normal", ""], rendah: ["Rendah", ""] };
  function badge(s) { var x = ST[s] || [s || "-", ""]; return '<span class="badge ' + x[1] + '">' + esc(x[0]) + "</span>"; }
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
    key: "list", label: "Pelanggan", rpc: "admin_list_customers", search: ["full_name", "email", "whatsapp"], noCreate: true, noDelete: true, noEdit: true,
    filters: [{ k: "status", l: "Status akun", o: [["aktif", "Aktif"], ["suspended", "Suspended"]] }, { k: "plan", l: "Paket", o: PL }],
    cols: [{ k: "full_name", l: "Pelanggan", f: function (v, r) { return "<b>" + esc(v || "-") + '</b><span class="cell-s">' + esc(r.email) + "</span>"; } }, { k: "status", l: "Status", f: badge }, { k: "plan", l: "Paket", f: function (v, r) { return v ? esc(v) + '<span class="cell-s">s/d ' + dt(r.plan_expires) + "</span>" : "-"; } }, { k: "last_sign_in_at", l: "Terakhir masuk", f: function (v) { return dt(v); } }, { k: "created_at", l: "Bergabung", f: function (v) { return dt(v); } }],
    title: function (r) { return r.full_name || r.email; },
    actions: [{ l: "Suspend akun", perm: "customers", cls: "bad", show: function (r) { return r.status === "aktif"; }, confirm: "Suspend akun ini? Pelanggan tidak bisa memakai dashboard sampai diaktifkan lagi.", rpc: function (r) { return ["admin_set_customer_status", { uid: r.id, s: "suspended" }]; } },
      { l: "Aktifkan akun", perm: "customers", show: function (r) { return r.status === "suspended"; }, rpc: function (r) { return ["admin_set_customer_status", { uid: r.id, s: "aktif" }]; } },
      { l: "Tambah / ubah langganan", perm: "customers", o: true, fields: [{ k: "plan", l: "Paket", t: "select", opts: PL, req: 1 }, { k: "days", l: "Durasi (hari)", t: "number", req: 1, min: 1, max: 1100, def: 90 }], run: function (r, v) { var st = new Date(), ex = new Date(st.getTime() + v.days * 864e5); return sb.from("subscriptions").insert({ user_id: r.id, plan: v.plan, status: "aktif", started_at: st.toISOString(), expires_at: ex.toISOString() }); } }],
    extra: customerExtra }] });
  M.push({ key: "invitations", label: "Manajemen Undangan", icon: "mail", perm: "invitations", tabs: (function () {
    var cols = [{ k: "title", l: "Undangan", f: function (v, r) { return "<b>" + esc(v) + '</b><span class="cell-s">' + esc(nameOf(r)) + "</span>"; } }, { k: "template_id", l: "Template", f: function (v) { return esc(v || "-"); } }, { k: "status", l: "Status", f: badge }, { k: "moderation", l: "Moderasi", f: badge }, { k: "expires_at", l: "Masa aktif", f: function (v) { return dt(v); } }, { k: "guest_count", l: "Tamu", num: 1 }];
    var fields = [{ k: "title", l: "Judul", req: 1, full: 1, max: 160 }, { k: "event_type", l: "Jenis acara", t: "select", opts: EV }, { k: "template_id", l: "Template (slug)" }, { k: "event_date", l: "Tanggal acara", t: "date" }, { k: "status", l: "Status publikasi", t: "select", opts: [["draft", "Draft"], ["aktif", "Aktif"], ["selesai", "Selesai"], ["nonaktif", "Nonaktif"]], req: 1 }, { k: "public_url", l: "URL publik", full: 1 }, { k: "expires_at", l: "Masa aktif sampai", t: "datetime" }, { k: "guest_count", l: "Jumlah tamu", t: "number", min: 0 }, { k: "wish_count", l: "Jumlah ucapan", t: "number", min: 0 }, { k: "moderation", l: "Moderasi", t: "select", opts: [["ok", "Normal"], ["flagged", "Terlapor"], ["takedown", "Diturunkan"]], req: 1 }, { k: "moderation_note", l: "Catatan moderasi", t: "textarea", full: 1 }];
    function ext(days) { return { l: "Perpanjang " + days + " hari", perm: "invitations", patch: function (r) { var b = Math.max(Date.now(), r.expires_at ? new Date(r.expires_at).getTime() : 0); return { expires_at: new Date(b + days * 864e5).toISOString() }; } }; }
    var base = { table: "invitations", select: "*,profiles(full_name)", order: ["created_at", false], search: ["title", "template_id"], noCreate: true, cols: cols, fields: fields, title: function (r) { return r.title; },
      filters: [{ k: "status", l: "Status", o: [["draft", "Draft"], ["aktif", "Aktif"], ["selesai", "Selesai"], ["nonaktif", "Nonaktif"]] }, { k: "moderation", l: "Moderasi", o: [["ok", "Normal"], ["flagged", "Terlapor"], ["takedown", "Diturunkan"]] }],
      actions: [ext(30), ext(90), ext(365), { l: "Aktifkan", perm: "invitations", show: function (r) { return r.status !== "aktif"; }, patch: function () { return { status: "aktif" }; } }, { l: "Nonaktifkan", perm: "invitations", o: true, show: function (r) { return r.status === "aktif"; }, patch: function () { return { status: "nonaktif" }; } },
        { l: "Moderasi", perm: "invitations", o: true, fields: [{ k: "moderation", l: "Tindakan", t: "select", opts: [["ok", "Normal (pulihkan)"], ["flagged", "Tandai terlapor"], ["takedown", "Turunkan dari publikasi"]], req: 1 }, { k: "note", l: "Catatan", t: "textarea", full: 1 }], patch: function (r, v) { var p = { moderation: v.moderation, moderation_note: v.note || null }; if (v.moderation === "takedown") p.status = "nonaktif"; return p; } }] };
    var t2 = Object.assign({}, base, { key: "flag", label: "Perlu moderasi", fixed: { moderation: "flagged" }, filters: [] });
    return [Object.assign({ key: "all", label: "Semua undangan" }, base), t2];
  })() });
  M.push({ key: "templates", label: "Manajemen Template", icon: "layout", perm: "templates", tabs: [{
    key: "items", label: "Template", table: "templates", select: "*,event_categories(name)", order: ["sort", true], search: ["name", "slug"], title: function (r) { return r.name; },
    filters: [{ k: "status", l: "Status", o: PUB }],
    cols: [{ k: "thumbnail_url", l: "", f: function (v) { return v ? '<img src="' + esc(v) + '" alt="" style="width:56px;height:42px;object-fit:cover;border-radius:8px">' : ""; } }, { k: "name", l: "Template", f: function (v, r) { return "<b>" + esc(v) + '</b><span class="cell-s">' + esc(r.slug) + "</span>"; } }, { k: "event_categories", l: "Kategori", f: function (v) { return esc(v && v.name || "-"); } }, { k: "package_type", l: "Paket", f: function (v) { return esc({ essential: "Essential 2D", signature: "Signature 3D", luxe: "Luxe Live Guest" }[v] || v || "-"); } }, { k: "price", l: "Harga", num: 1, f: function (v) { return v ? rp(v) : "Termasuk paket"; } }, { k: "status", l: "Status", f: badge }],
    fields: [{ k: "name", l: "Nama template", req: 1, max: 80 }, { k: "slug", l: "Slug", req: 1, pat: /^[a-z0-9-]+$/, help: "Huruf kecil, angka, tanda minus." }, { k: "category_id", l: "Kategori acara", t: "select", load: function () { return loadOpts("cat", function () { return sb.from("event_categories").select("id,name").order("sort").then(function (r) { return (r.data || []).map(function (x) { return [x.id, x.name]; }); }); }); } }, { k: "package_type", l: "Jenis paket (2D / 3D Cinematic / 3D Live Guest)", t: "select", opts: PL, req: 1, def: "essential", help: "Template hanya muncul pada paket ini. Wajib." }, { k: "theme_key", l: "Kunci tema (opsional)", max: 60, help: "Samakan antar template satu tema, mis. romantic-garden." }, { k: "min_plan", l: "Paket minimum (lama)", t: "select", opts: PL }, { k: "price", l: "Harga tambahan (Rp)", t: "number", min: 0, def: 0 }, { k: "status", l: "Status publikasi", t: "select", opts: PUB, req: 1, def: "draft" }, { k: "description", l: "Deskripsi", t: "textarea", full: 1 }, { k: "thumbnail_url", l: "Thumbnail", t: "image", folder: "templates", full: 1 }, { k: "preview_url", l: "URL preview/demo", full: 1 }, { k: "sort", l: "Urutan", t: "number", def: 0 }],
    actions: [{ l: "Publikasikan", perm: "templates", show: function (r) { return r.status !== "published"; }, patch: function () { return { status: "published" }; } }, { l: "Tarik dari publikasi", perm: "templates", o: true, show: function (r) { return r.status === "published"; }, patch: function () { return { status: "draft" }; } }],
    extra: function (r, box) { if (r.preview_url && /^https?:\/\//.test(r.preview_url)) box.innerHTML = '<a class="btn o" target="_blank" rel="noopener" href="' + esc(r.preview_url) + '">Buka preview</a>'; } },
  { key: "cats", label: "Kategori Acara", table: "event_categories", order: ["sort", true], search: ["name", "slug"], title: function (r) { return r.name; }, cols: [{ k: "name", l: "Kategori", f: function (v) { return "<b>" + esc(v) + "</b>"; } }, { k: "slug", l: "Slug" }, { k: "active", l: "Status", f: function (v) { return badge(v ? "aktif" : "nonaktif"); } }, { k: "sort", l: "Urutan", num: 1 }], fields: [{ k: "name", l: "Nama kategori", req: 1, max: 60 }, { k: "slug", l: "Slug", req: 1, pat: /^[a-z0-9-]+$/ }, { k: "sort", l: "Urutan", t: "number", def: 0 }, { k: "active", l: "Aktif", t: "bool", def: true }] }] });
  function liveTab(kind, label, ex) { return { key: kind, label: label, table: "live_assets", fixed: { kind: kind }, order: ["sort", true], search: ["name", "theme"], title: function (r) { return r.name; }, cols: [{ k: "url", l: "", f: function (v) { return v && /\.(png|jpe?g|webp)(\?|$)/i.test(v) ? '<img src="' + esc(v) + '" alt="" style="width:48px;height:48px;object-fit:cover;border-radius:8px">' : ""; } }, { k: "name", l: "Nama", f: function (v) { return "<b>" + esc(v) + "</b>"; } }, { k: "theme", l: "Tema", f: function (v) { return esc(v || "-"); } }, { k: "active", l: "Status", f: function (v) { return badge(v ? "aktif" : "nonaktif"); } }, { k: "sort", l: "Urutan", num: 1 }], fields: [{ k: "name", l: "Nama", req: 1, max: 80 }, { k: "theme", l: "Tema (slug)", help: "Mis. romantic-garden, jawa-tengah." }, ex.img ? { k: "url", l: "Gambar", t: "image", folder: "live/" + kind, full: 1 } : { k: "url", l: "URL file / aset", full: 1, help: ex.help || "" }, { k: "config", l: "Konfigurasi (JSON)", t: "textarea", full: 1, json: 1, help: ex.cfg || "Opsional." }, { k: "sort", l: "Urutan", t: "number", def: 0 }, { k: "active", l: "Aktif", t: "bool", def: true }] }; }
  M.push({ key: "live", label: "Live Guest", icon: "monitor", perm: "live", tabs: [
    { key: "cfg", label: "Pengaturan Fitur", settings: [{ k: "live_enabled", l: "Aktifkan Live Guest", t: "bool", def: true }, { k: "live_music", l: "Musik latar", t: "bool", def: true }, { k: "live_qris", l: "QRIS hadiah pengantin", t: "bool", def: true }, { k: "live_gallery", l: "Area Galeri Foto", t: "bool", def: true }, { k: "live_guestbook", l: "Area Buku Tamu", t: "bool", def: true }, { k: "live_default_theme", l: "Tema bawaan", t: "select", opts: [["romantic-garden", "Romantic Garden"], ["jawa-tengah", "Adat Jawa Tengah"]], def: "romantic-garden" }, { k: "live_max_guests", l: "Batas tamu online bersamaan", t: "number", min: 1, def: 200 }], note: "Pengaturan ini tersimpan di database. Aplikasi Live Guest membacanya setelah dihubungkan (belum otomatis)." },
    liveTab("avatar", "Avatar", { img: 1 }), liveTab("background", "Background Venue", { img: 1 }), liveTab("asset3d", "Aset 3D", { help: "Tempel URL file (.glb/.png) yang sudah diunggah." }), liveTab("area", "Area Interaktif", { cfg: 'Mis. {"x":3.4,"z":6.4}' }), liveTab("theme", "Konfigurasi Tema", { cfg: "JSON konfigurasi tema." })] });
  M.push({ key: "transactions", label: "Manajemen Transaksi", icon: "card", perm: "transactions", grp: "Bisnis", tabs: (function () {
    var base = { table: "invoices", select: "*,profiles(full_name)", order: ["created_at", false], search: ["number", "description", "midtrans_order_id"], noCreate: true, noDelete: true, title: function (r) { return r.number; },
      filters: [{ k: "status", l: "Status", o: [["menunggu", "Menunggu"], ["lunas", "Lunas"], ["gagal", "Gagal"], ["dibatalkan", "Dibatalkan"], ["refund", "Refund"]] }],
      cols: [{ k: "number", l: "Invoice", f: function (v, r) { return "<b>" + esc(v) + '</b><span class="cell-s">' + esc(nameOf(r)) + "</span>"; } }, { k: "description", l: "Keterangan" }, { k: "amount", l: "Jumlah", num: 1, f: rp }, { k: "status", l: "Status", f: badge }, { k: "midtrans_status", l: "Midtrans", f: function (v) { return esc(v || "-"); } }, { k: "created_at", l: "Tanggal", f: function (v) { return dt(v); } }],
      fields: [{ k: "description", l: "Keterangan", req: 1, full: 1 }, { k: "amount", l: "Jumlah (Rp)", t: "number", req: 1, min: 0 }, { k: "status", l: "Status", t: "select", req: 1, opts: [["menunggu", "Menunggu"], ["lunas", "Lunas"], ["gagal", "Gagal"], ["dibatalkan", "Dibatalkan"], ["refund", "Refund"]] }, { k: "midtrans_order_id", l: "Midtrans order ID" }, { k: "midtrans_status", l: "Status Midtrans" }],
      actions: [{ l: "Verifikasi pembayaran", perm: "transactions", show: function (r) { return r.status === "menunggu"; }, confirm: "Tandai invoice ini LUNAS? Pastikan dana sudah diterima.", patch: function () { return { status: "lunas", paid_at: new Date().toISOString(), midtrans_status: "manual_verified" }; } },
        { l: "Gagalkan", perm: "transactions", o: true, cls: "bad", show: function (r) { return r.status === "menunggu"; }, confirm: "Tandai invoice ini gagal?", patch: function () { return { status: "gagal" }; } },
        { l: "Proses refund", perm: "transactions", o: true, cls: "bad", show: function (r) { return r.status === "lunas"; }, fields: [{ k: "note", l: "Alasan refund", t: "textarea", req: 1, full: 1 }], confirm: "Tandai invoice ini sebagai refund? Pengembalian dana ke pelanggan harus dilakukan terpisah (belum otomatis).", patch: function (r, v) { return { status: "refund", refunded_at: new Date().toISOString(), refund_note: v.note }; } }],
      extra: function (r, box) { box.innerHTML = '<div class="note">Status Midtrans diperbarui otomatis hanya setelah webhook Midtrans dipasang di server. Sampai saat itu, verifikasi dilakukan manual.</div>'; } };
    return [Object.assign({ key: "all", label: "Semua transaksi" }, base), Object.assign({}, base, { key: "pending", label: "Menunggu verifikasi", fixed: { status: "menunggu" }, filters: [] }), Object.assign({}, base, { key: "refund", label: "Refund", fixed: { status: "refund" }, filters: [] })];
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
  function ticketTab(key, label, fixed) { return { key: key, label: label, table: "tickets", select: "*,profiles(full_name)", fixed: fixed, order: ["created_at", false], search: ["subject"], noCreate: true, title: function (r) { return r.subject; }, emptyText: "Tiket dibuat oleh pelanggan. Form pengajuan tiket di dashboard pelanggan belum tersedia, jadi daftar ini baru terisi setelah fitur itu dibuat.", filters: fixed ? [{ k: "status", l: "Status", o: [["open", "Open"], ["diproses", "Diproses"], ["selesai", "Selesai"], ["ditutup", "Ditutup"]] }] : [{ k: "status", l: "Status", o: [["open", "Open"], ["diproses", "Diproses"], ["selesai", "Selesai"], ["ditutup", "Ditutup"]] }, { k: "priority", l: "Prioritas", o: [["rendah", "Rendah"], ["normal", "Normal"], ["tinggi", "Tinggi"]] }, { k: "category", l: "Kategori", o: [["bantuan", "Bantuan"], ["pembayaran", "Pembayaran"], ["teknis", "Teknis"], ["komplain", "Komplain"], ["lainnya", "Lainnya"]] }], cols: [{ k: "subject", l: "Tiket", f: function (v, r) { return "<b>" + esc(v) + '</b><span class="cell-s">' + esc(nameOf(r)) + " &middot; " + esc(r.category) + "</span>"; } }, { k: "priority", l: "Prioritas", f: badge }, { k: "status", l: "Status", f: badge }, { k: "created_at", l: "Dibuat", f: function (v) { return dt(v); } }], fields: [{ k: "subject", l: "Subjek", req: 1, full: 1 }, { k: "category", l: "Kategori", t: "select", req: 1, opts: [["bantuan", "Bantuan"], ["pembayaran", "Pembayaran"], ["teknis", "Teknis"], ["komplain", "Komplain"], ["lainnya", "Lainnya"]] }, { k: "priority", l: "Prioritas", t: "select", req: 1, opts: [["rendah", "Rendah"], ["normal", "Normal"], ["tinggi", "Tinggi"]] }, { k: "status", l: "Status", t: "select", req: 1, opts: [["open", "Open"], ["diproses", "Diproses"], ["selesai", "Selesai"], ["ditutup", "Ditutup"]] }], beforeSave: function (p) { p.updated_at = new Date().toISOString(); }, actions: [{ l: "Proses", perm: "support", show: function (r) { return r.status === "open"; }, patch: function () { return { status: "diproses", updated_at: new Date().toISOString() }; } }, { l: "Tandai selesai", perm: "support", show: function (r) { return r.status === "open" || r.status === "diproses"; }, patch: function () { return { status: "selesai", updated_at: new Date().toISOString() }; } }, { l: "Tutup tiket", perm: "support", o: true, show: function (r) { return r.status !== "ditutup"; }, patch: function () { return { status: "ditutup", updated_at: new Date().toISOString() }; } }], extra: ticketThread }; }
  M.push({ key: "support", label: "Customer Support", icon: "help", perm: "support", grp: "Komunikasi", tabs: [ticketTab("all", "Semua tiket", null), ticketTab("kom", "Komplain", { category: "komplain" }), ticketTab("tanya", "Pertanyaan", { category: "bantuan" })] });
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
    { key: "audit", label: "Audit Log", table: "audit_logs", order: ["created_at", false], search: ["table_name", "action"], noCreate: true, noEdit: true, noDelete: true, title: function (r) { return r.action + " " + r.table_name; }, filters: [{ k: "action", l: "Aksi", o: [["insert", "Tambah"], ["update", "Ubah"], ["delete", "Hapus"], ["status_pelanggan", "Status pelanggan"]] }], cols: [{ k: "created_at", l: "Waktu", f: function (v) { return dt(v, 1); } }, { k: "actor_id", l: "Admin", f: function (v) { return esc(adminName(v)); } }, { k: "action", l: "Aksi" }, { k: "table_name", l: "Tabel" }, { k: "row_id", l: "ID baris", f: function (v) { return esc(String(v || "-").slice(0, 12)); } }], fields: [{ k: "summary", l: "Ringkasan perubahan", f: function (v) { return "<code>" + esc(JSON.stringify(v)) + "</code>"; } }] }] });
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
      rows = rows.filter(function (x) { return (!q || (tab.search || []).some(function (c) { return String(x[c] || "").toLowerCase().indexOf(q) > -1; })) && Object.keys(st.f).every(function (k) { return !st.f[k] || String(x[k]) === st.f[k]; }); });
      return { rows: rows.slice(st.page * SIZE, st.page * SIZE + SIZE), total: rows.length };
    });
    var qy = sb.from(tab.table).select(tab.select || "*", { count: "exact" });
    Object.keys(tab.fixed || {}).forEach(function (k) { qy = qy.eq(k, tab.fixed[k]); });
    Object.keys(st.f).forEach(function (k) { if (st.f[k]) qy = qy.eq(k, st.f[k]); });
    if (st.q && tab.search) qy = qy.or(tab.search.map(function (c) { return c + ".ilike.%" + clean(st.q) + "%"; }).join(","));
    var o = tab.order || ["created_at", false]; qy = qy.order(o[0], { ascending: o[1] }).range(st.page * SIZE, st.page * SIZE + SIZE - 1);
    return qy.then(function (r) { if (r.error) throw r.error; return { rows: r.data || [], total: r.count == null ? (r.data || []).length : r.count }; });
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
    }).catch(function (e) { tb.innerHTML = empty("Data tidak bisa dimuat", e && e.code === "42P01" || e && e.code === "PGRST205" ? "Tabel belum dibuat. Jalankan backend/admin-schema.sql di Supabase." : (e && e.code === "42501" ? "Anda tidak punya izin untuk melihat data ini." : "Terjadi kendala saat memuat. Coba lagi."), '<button class="btn" type="button" data-retry>Coba lagi</button>'); });
  }
  function bindTable(tab, root) {
    var mod = curMod(), key = mod.key + ":" + tab.key, st = tstate(key), reload = function () { renderTable(tab, root); bindTable(tab, root); };
    root.onclick = function (e) {
      var pg = e.target.closest("[data-pg]"); if (pg) { st.page = Math.max(0, st.page + Number(pg.dataset.pg)); return reload(); }
      if (e.target.closest("[data-retry]")) return reload();
      if (e.target.closest("[data-new]")) return openForm(tab, null, reload);
      if (e.target.closest("[data-add]")) return openForm({ fields: tab.addBtn.fields, title: function () { return tab.addBtn.l; }, custom: tab.addBtn.run }, null, reload, tab.addBtn.l);
      var tr = e.target.closest("tr[data-i]"); if (tr) openDetail(tab, LAST.rows[Number(tr.dataset.i)], reload);
    };
    root.onkeydown = function (e) { if (e.key === "Enter" && e.target.matches("tr[data-i]")) openDetail(tab, LAST.rows[Number(e.target.dataset.i)], reload); if (e.key === "Enter" && e.target.matches("[data-q]")) { e.preventDefault(); st.q = e.target.value.trim(); st.page = 0; reload(); $("[data-q]", root).focus(); } };
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
  function customerExtra(r, box) {
    box.innerHTML = '<div class="sk h3"></div>';
    var id = r.id;
    Promise.all([sb.from("subscriptions").select("plan,status,started_at,expires_at").eq("user_id", id).order("started_at", { ascending: false }).limit(10), sb.from("invoices").select("number,amount,status,created_at").eq("user_id", id).order("created_at", { ascending: false }).limit(10), sb.from("invitations").select("title,status,created_at").eq("user_id", id).order("created_at", { ascending: false }).limit(10), sb.from("tickets").select("subject,status,created_at").eq("user_id", id).order("created_at", { ascending: false }).limit(10), sb.from("audit_logs").select("action,summary,created_at").eq("row_id", id).order("created_at", { ascending: false }).limit(10)]).then(function (rs) {
      var ev = [{ t: r.created_at, a: "Mendaftar" }];
      (rs[0].data || []).forEach(function (x) { ev.push({ t: x.started_at, a: "Langganan " + x.plan + " (s/d " + dt(x.expires_at) + ")" }); });
      (rs[1].data || []).forEach(function (x) { ev.push({ t: x.created_at, a: "Invoice " + x.number + " - " + rp(x.amount) + " (" + x.status + ")" }); });
      (rs[2].data || []).forEach(function (x) { ev.push({ t: x.created_at, a: "Membuat undangan: " + x.title }); });
      (rs[3].data || []).forEach(function (x) { ev.push({ t: x.created_at, a: "Tiket: " + x.subject }); });
      (rs[4].data || []).forEach(function (x) { ev.push({ t: x.created_at, a: "Admin: " + x.action + (x.summary && x.summary.status ? " -> " + x.summary.status : "") }); });
      ev.sort(function (a, b) { return new Date(b.t) - new Date(a.t); });
      box.innerHTML = '<div class="sect"><h3>Riwayat aktivitas</h3><ul class="act-list">' + ev.map(function (x) { return "<li><i>" + ico("pulse").replace("class=\"ic\"", 'class="ic" style="width:16px;height:16px"') + "</i><div><b>" + esc(x.a) + "</b><small>" + dt(x.t, 1) + "</small></div></li>"; }).join("") + "</ul></div>";
    }).catch(function () { box.innerHTML = '<p class="sub">Riwayat tidak bisa dimuat.</p>'; });
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
    series.forEach(function (x, i) { var cx = L + pw * (i + .5) / series.length, h = ph * Number(x[bk]) / mb, lb = new Date(x.m + "-01").toLocaleDateString("id-ID", { month: "short", year: "2-digit" }); o += '<rect x="' + (cx - bw / 2) + '" y="' + (T + ph - h) + '" width="' + bw + '" height="' + h + '" rx="5" fill="#9673D0"><title>' + lb + ": " + (bk === "revenue" ? rp(x[bk]) : x[bk]) + ", " + x[lk] + ' pelanggan</title></rect><text x="' + cx + '" y="' + (H - 8) + '" text-anchor="middle">' + lb + "</text>"; pts.push(cx + "," + (T + ph - ph * Number(x[lk]) / ml)); });
    return o + (series.length > 1 ? '<polyline points="' + pts.join(" ") + '" fill="none" stroke="#7552A8" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>' : "") + "</svg>";
  }
  function renderDashboard(root) {
    root.innerHTML = '<div class="kpis">' + [1, 2, 3, 4].map(function () { return '<div class="card"><div class="sk h1" style="width:50%"></div><div class="sk h2" style="margin-top:12px"></div></div>'; }).join("") + "</div>" + skel();
    var acts = can("admins", "read") ? sb.from("audit_logs").select("actor_id,action,table_name,created_at").order("created_at", { ascending: false }).limit(8) : Promise.resolve({ data: [] });
    var inv = can("transactions", "read") ? sb.from("invoices").select("number,amount,status,created_at").order("created_at", { ascending: false }).limit(5) : Promise.resolve({ data: [] });
    Promise.all([sb.rpc("admin_stats", { months: 6 }), acts, inv]).then(function (rs) {
      if (rs[0].error) throw rs[0].error; var s = rs[0].data || {}, ser = s.series || [];
      var K = [["Total revenue", rp(s.revenue), "card"], ["Pelanggan", Number(s.customers || 0).toLocaleString("id-ID"), "users"], ["Undangan", Number(s.invitations || 0).toLocaleString("id-ID"), "mail"], [s.pending ? "Transaksi (" + s.pending + " menunggu)" : "Transaksi", Number(s.transactions || 0).toLocaleString("id-ID"), "receipt"]];
      var ev = (rs[1].data || []).map(function (x) { return { t: x.created_at, a: adminName(x.actor_id) + ": " + x.action + " " + x.table_name }; }).concat((rs[2].data || []).map(function (x) { return { t: x.created_at, a: "Invoice " + x.number + " " + rp(x.amount) + " (" + x.status + ")" }; })).sort(function (a, b) { return new Date(b.t) - new Date(a.t); }).slice(0, 10);
      root.innerHTML = '<div class="kpis">' + K.map(function (k) { return '<div class="card kpi"><span>' + k[0] + "</span><b>" + esc(k[1]) + '</b><i class="ico">' + ico(k[2] === "receipt" ? "doc" : k[2]) + "</i></div>"; }).join("") + '</div><div class="two-c"><div class="card"><div class="card-h"><h2>Pertumbuhan 6 bulan</h2></div><div class="legend"><span><i style="background:#9673D0"></i>Revenue</span><span><i style="background:#7552A8"></i>Pelanggan baru</span></div>' + (ser.some(function (x) { return Number(x.revenue) || Number(x.customers); }) ? chart(ser, "revenue", "customers") : empty("Belum ada data", "Grafik terisi setelah ada pelanggan dan transaksi lunas.")) + '</div><div class="card"><div class="card-h"><h2>Aktivitas terbaru</h2></div>' + (ev.length ? '<ul class="act-list">' + ev.map(function (x) { return "<li><i>" + ico("pulse").replace('class="ic"', 'class="ic" style="width:16px;height:16px"') + "</i><div><b>" + esc(x.a) + "</b><small>" + dt(x.t, 1) + "</small></div></li>"; }).join("") + "</ul>" : empty("Belum ada aktivitas", "Aktivitas admin dan transaksi tampil di sini.")) + "</div></div>";
    }).catch(function (e) { root.innerHTML = errBox(e && e.code === "42883" || e && e.code === "PGRST202" ? "Fungsi admin belum dibuat. Jalankan backend/admin-schema.sql." : "Terjadi kendala saat memuat.", 1); });
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
    var h = (location.hash || "").slice(1).split(":"), ok = allowed(); if (!ok.length) return;
    var m = ok.filter(function (x) { return x.key === h[0]; })[0] || ok[0]; R.m = m.key; R.t = h[1] || (m.tabs ? m.tabs[0].key : ""); closeNav(); closeDrawer(); buildNav();
    var tab = curTab(), view = $("#view");
    $("#crumbs").innerHTML = '<a href="#dashboard">Admin</a><span>/</span>' + (m.tabs ? '<a href="#' + m.key + '">' + esc(m.label) + '</a><span>/</span><span aria-current="page">' + esc(tab.label) + "</span>" : '<span aria-current="page">' + esc(m.label) + "</span>");
    d.title = m.label + " | Admin NusaMora";
    var head = '<div class="pghead"><div><h1>' + esc(m.label) + "</h1></div></div>";
    var body = '<div id="body"></div>';
    var tabs = m.tabs && m.tabs.length > 1 ? '<div class="tabs" role="tablist">' + m.tabs.map(function (t) { return '<button type="button" role="tab" aria-selected="' + (t.key === tab.key) + '" data-tab="' + t.key + '">' + esc(t.label) + "</button>"; }).join("") + "</div>" : "";
    view.innerHTML = head + tabs + body; var root = $("#body");
    if (m.render) return m.render(root);
    if (tab.render) return tab.render(root);
    if (tab.settings) return renderSettings(tab, root);
    if (tab.note) root.insertAdjacentHTML("beforebegin", '<div class="note" style="margin-bottom:14px">' + esc(tab.note) + "</div>");
    renderTable(tab, root); bindTable(tab, root);
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
    $("#pm-p").innerHTML = '<p><b>' + esc(A.user.email) + "</b><br>" + esc(ROLE[A.role] || A.role) + '</p><a href="/akun">' + ico("user") + ' Dashboard pelanggan</a><button class="mi" type="button" id="lo">' + ico("out") + " Keluar</button>";
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
        A.role = x.data.role; (x.data.perms || []).forEach(function (p) { A.perms[p] = 1; });
        var pre = can("admins", "read") ? sb.rpc("admin_list_admins").then(function (a) { (a.data || []).forEach(function (u) { adminMap[u.user_id] = u.email; }); }) : Promise.resolve();
        return pre.then(function () { shell(); route(); });
      });
    }, function () { denied("Tidak bisa terhubung", "Periksa koneksi internet Anda lalu muat ulang."); });
    sb.auth.onAuthStateChange(function (ev) { if (ev === "SIGNED_OUT") location.replace("/masuk"); });
  }
  start();
})();
