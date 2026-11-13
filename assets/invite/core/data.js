/* NusaMora Invite 2D — lapisan data.
   Mengambil undangan dari Supabase (REST/RPC, tanpa SDK agar ringan saat dibuka dari WhatsApp),
   lalu menormalkan `invitations.content` (jsonb dari editor) menjadi view model yang dipakai template.
   Tidak ada konten undangan yang ditulis di sini; DEMO hanya dipakai untuk pratinjau template. */
(function (w) {
  "use strict";
  var C = w.NM_CONFIG || {};
  var BASE = (C.SUPABASE_URL || "").replace(/\/$/, ""), KEY = C.SUPABASE_ANON_KEY || "";
  var TZ = { WIB: "+07:00", WITA: "+08:00", WIT: "+09:00" };
  var TRACKS = { "we-are": "/live/audio/we-are.mp3" };
  var RESERVED = /^(undangan|admin|akun|masuk|daftar|template|buat|editor|pembayaran|paket|preview|index|lupa-password|atur-password|live|assets|docs|backend|supabase)$/;

  function str(v, n) { v = v == null ? "" : String(v).trim(); return n ? v.slice(0, n) : v; }
  function arr(v) { return Array.isArray(v) ? v : []; }
  function okUrl(u) { u = str(u); return /^https:\/\//i.test(u) || /^\/(?!\/)/.test(u) ? u : ""; }
  function ig(h) { h = str(h).replace(/^@/, "").replace(/^https?:\/\/(www\.)?instagram\.com\//i, "").replace(/\/.*$/, ""); return /^[A-Za-z0-9._]{1,30}$/.test(h) ? h : ""; }

  /* ---------- akses Supabase ---------- */
  function headers(token) { var h = { apikey: KEY, "Content-Type": "application/json" }; h.Authorization = "Bearer " + (token || KEY); return h; }
  function rpc(fn, body, token) {
    if (!BASE || !KEY) return Promise.reject(new Error("config"));
    return fetch(BASE + "/rest/v1/rpc/" + fn, { method: "POST", headers: headers(token), body: JSON.stringify(body || {}) })
      .then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error((j && (j.message || j.error)) || "http_" + r.status); return j; }); });
  }
  /* sesi pemilik (dibuat supabase-js di dashboard) untuk mode pratinjau draft */
  function ownerToken() {
    try {
      var ref = (BASE.match(/^https:\/\/([^.]+)\./) || [])[1]; if (!ref) return "";
      var s = JSON.parse(localStorage.getItem("sb-" + ref + "-auth-token") || "null");
      if (s && s.currentSession) s = s.currentSession;
      return s && s.access_token && (!s.expires_at || s.expires_at * 1000 > Date.now()) ? s.access_token : "";
    } catch (e) { return ""; }
  }

  /* ---------- normalisasi content -> view model ---------- */
  function normalize(raw, meta) {
    /* Kunci editor paket Essential: texts (opening, quote, quoteSource, closing), design2d.theme, sections (gallery, map), gift.address.
       Kunci lama (welcome, quote, closing, theme, giftAddress) tetap dibaca untuk undangan yang sudah ada. */
    var c = raw || {}, names = c.names || {}, cp = c.couple || {}, ph = c.photos || {}, ev = c.event || {}, ft = c.features || {};
    var tx = c.texts || {}, dz = c.design2d || {}, sc = c.sections || {}, gf = c.gift || {};
    var cat = meta.category || "wedding", isCouple = cat === "wedding" || cat === "engagement";
    var bride = { nick: str(names.a, 80), full: str((cp.bride || {}).full, 120) || str(names.a, 80), parents: str((cp.bride || {}).parents, 200), ig: ig((cp.bride || {}).ig), photo: okUrl(ph.bride), sex: !isCouple && (cp.bride || {}).sex === "m" ? "m" : "f" };
    var groom = { nick: str(names.b, 80), full: str((cp.groom || {}).full, 120) || str(names.b, 80), parents: str((cp.groom || {}).parents, 200), ig: ig((cp.groom || {}).ig), photo: okUrl(ph.groom), sex: "m" };
    var groomFirst = cp.order !== "wanita";
    var people = isCouple ? (groomFirst ? [groom, bride] : [bride, groom]) : [bride];
    var roles = isCouple ? (groomFirst ? ["Mempelai Pria", "Mempelai Wanita"] : ["Mempelai Wanita", "Mempelai Pria"]) : [""];
    people.forEach(function (p, i) { p.role = roles[i]; });
    var pair = people.filter(function (p) { return p.nick; }).map(function (p) { return p.nick; });

    var baseDate = str(meta.event_date), mainTz = TZ[ev.tz] ? ev.tz : "WIB";
    function evt(e, name) { return { name: str(e.name, 60) || name || "", date: str(e.date) || baseDate, start: str(e.start, 5), end: str(e.end, 5), tz: TZ[e.tz] ? e.tz : mainTz, venue: str(e.venue, 120), address: str(e.address, 400), maps: okUrl(e.maps) }; }
    // acara utama (event + event_date, wajib saat publikasi) lalu acara tambahan (events[])
    var events = (baseDate || str(ev.venue) ? [evt(ev, isCouple ? "Resepsi" : "Acara")] : []).concat(arr(c.events).map(function (e) { return evt(e || {}, "Acara"); }).filter(function (e) { return e.venue || e.start || e.name !== "Acara"; }));
    events.forEach(function (e) { e.at = when(e.date, e.start, e.tz); e.until = e.end ? when(e.date, e.end, e.tz) : null; });

    var EW = /gopay|ovo|dana|shopee|linkaja|jenius|sakuku|i\.?saku|flip/i;
    function acct(a) { a = a || {}; var b = str(a.bank, 40); return { type: a.type === "ewallet" || EW.test(b) ? "ewallet" : "bank", bank: b, number: str(a.number, 40), holder: str(a.holder, 80) }; }
    var accounts = [acct(c.gift)].concat(arr(c.accounts).map(acct)).filter(function (a) { return a.number; });

    var story = arr(c.story).map(function (s) { s = s || {}; return { date: str(s.date, 40), title: str(s.title, 80), text: str(s.text, 600), photo: okUrl(s.photo) }; }).filter(function (s) { return s.title || s.text; });
    var gallery = sc.gallery === false ? [] : arr(ph.gallery).map(okUrl).filter(Boolean);
    if (sc.map === false) events.forEach(function (e) { e.maps = ""; });
    var giftAddress = str(gf.address, 300) || str(c.giftAddress, 300), theme = str(dz.theme) || str(c.theme);
    var music = c.music || {};
    var target = events.length ? events[0].at : (baseDate ? when(baseDate, "", "WIB") : null);

    return {
      slug: meta.slug || "", category: cat, isCouple: isCouple, title: str(meta.title),
      pair: pair, people: people, displayNames: pair.length ? pair.join(" & ") : str(meta.title),
      theme: /^[a-z0-9-]{1,40}$/.test(theme) ? theme : "",
      welcome: str(c.welcome, 1000) || str(tx.opening, 1000), quote: { text: str(tx.quote, 500) || str((c.quote || {}).text, 400), source: str(tx.quoteSource, 80) || str((c.quote || {}).source, 80) },
      cover: okUrl(ph.cover), gallery: gallery, events: events, target: target, story: story, accounts: accounts,
      giftAddress: giftAddress, closing: str(tx.closing, 600) || str(c.closing, 600),
      music: { on: music.enabled !== false, src: TRACKS[music.track] || TRACKS["we-are"] },
      features: { countdown: ft.countdown !== false, rsvp: ft.rsvp !== false, wishes: ft.guestbook !== false, gift: !!ft.gift && (accounts.length > 0 || !!giftAddress), story: ft.story !== false && story.length > 0 },
      mode: meta.mode || "live"
    };
  }
  function when(date, time, tz) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date || "")) return null;
    var t = /^\d{2}:\d{2}$/.test(time || "") ? time : "08:00";
    var d = new Date(date + "T" + t + ":00" + (TZ[tz] || TZ.WIB)); return isNaN(d) ? null : d;
  }

  /* ---------- tamu ---------- */
  function guestName() {
    var q = new URLSearchParams(location.search), n = q.get("to") || q.get("kpd") || q.get("u") || "";
    n = n.replace(/\+/g, " ").replace(/[<>{}\[\]\\]/g, "").replace(/\s+/g, " ").trim();
    return n.slice(0, 60);
  }

  /* ---------- sumber undangan ---------- */
  function resolve() {
    var q = new URLSearchParams(location.search);
    var demo = q.get("demo"), prev = q.get("preview");
    var seg = location.pathname.replace(/^\/+|\/+$/g, "").replace(/\.html$/, "");
    if (demo) return Promise.resolve(demoData(q.get("theme")));
    if (prev && /^[0-9a-f-]{36}$/i.test(prev)) return loadPreview(prev);
    var slug = q.get("slug") || (seg && !RESERVED.test(seg) && /^[a-z0-9]+(-[a-z0-9]+)*$/i.test(seg) ? seg : "");
    if (!slug) return Promise.reject(new Error("tidak_tersedia"));
    return rpc("get_public_invitation", { p_slug: slug }).then(function (r) {
      if (!r || r.error) throw new Error(r && r.error || "tidak_tersedia");
      return { vm: normalize(r.content, { slug: slug, title: r.title, category: r.category, event_date: r.event_date, mode: "live" }), template: r.template_id };
    });
  }
  function loadPreview(id) {
    var tk = ownerToken();
    if (!tk) return Promise.reject(new Error("perlu_masuk"));
    return fetch(BASE + "/rest/v1/invitations?id=eq." + encodeURIComponent(id) + "&select=title,slug,category,template_id,event_date,content", { headers: headers(tk) })
      .then(function (r) { return r.json(); }).then(function (rows) {
        var r = Array.isArray(rows) && rows[0]; if (!r) throw new Error("tidak_tersedia");
        return { vm: normalize(r.content, { slug: r.slug, title: r.title, category: r.category, event_date: r.event_date, mode: "preview" }), template: r.template_id };
      });
  }

  /* ---------- aksi tamu ---------- */
  var local = { wishes: [] };
  function sendRsvp(vm, d) {
    if (vm.mode !== "live") return Promise.resolve({ ok: true, preview: true });
    return rpc("submit_rsvp", { p_slug: vm.slug, p_name: d.name, p_attendance: d.attendance, p_pax: d.pax, p_note: d.note || null });
  }
  function sendWish(vm, d) {
    if (vm.mode !== "live") { var x = { id: "l" + Date.now(), name: d.name, message: d.message, attendance: d.attendance || null, created_at: new Date().toISOString() }; local.wishes.unshift(x); return Promise.resolve({ ok: true, wish: x, preview: true }); }
    return rpc("submit_wish", { p_slug: vm.slug, p_name: d.name, p_message: d.message, p_attendance: d.attendance || null });
  }
  function wishes(vm, before) {
    if (vm.mode !== "live") { var all = (vm.mode === "demo" ? (vm.isCouple ? DEMO_WISHES : vm.category === "aqiqah" ? DEMO_WISHES_AQ : DEMO_WISHES_KID) : []).concat([]); all = local.wishes.concat(all); return Promise.resolve({ total: all.length, items: all }); }
    return rpc("list_wishes", { p_slug: vm.slug, p_before: before || null, p_limit: 20 });
  }

  /* ---------- data demo (hanya untuk tombol "Lihat demo" di galeri template) ---------- */
  var DEMO_WISHES = [
    { id: "d1", name: "Keluarga Wiratama", message: "Selamat menempuh hidup baru. Semoga menjadi keluarga yang sakinah, mawaddah, warahmah.", attendance: "hadir", created_at: "2026-11-01T09:12:00+07:00" },
    { id: "d2", name: "Rani & Bima", message: "Ikut bahagia! Semoga langgeng sampai kakek nenek.", attendance: "hadir", created_at: "2026-10-30T19:40:00+07:00" },
    { id: "d3", name: "Teman SMA 3", message: "Maaf belum bisa datang, doa terbaik untuk kalian berdua.", attendance: "tidak", created_at: "2026-10-28T08:05:00+07:00" }
  ];
  var DEMO_WISHES_KID = [
    { id: "k1", name: "Tante Mira & Om Bayu", message: "Selamat ulang tahun, Sayang! Semoga sehat, ceria, dan makin pintar.", attendance: "hadir", created_at: "2026-11-01T09:12:00+07:00" },
    { id: "k2", name: "Kirana (teman TK)", message: "Happy birthday! Sampai ketemu di pesta ya!", attendance: "hadir", created_at: "2026-10-30T19:40:00+07:00" },
    { id: "k3", name: "Eyang Putri", message: "Doa terbaik untuk cucu tersayang. Maaf Eyang belum bisa datang.", attendance: "tidak", created_at: "2026-10-28T08:05:00+07:00" }
  ];
  var DEMO_WISHES_AQ = [
    { id: "q1", name: "Ustadzah Halimah", message: "Barakallahu lakum. Semoga menjadi anak yang salihah, penyejuk mata, dan berbakti kepada orang tua.", attendance: "hadir", created_at: "2026-11-01T09:12:00+07:00" },
    { id: "q2", name: "Tante Mira & Om Bayu", message: "Selamat atas kelahiran si kecil! Semoga sehat selalu dan tumbuh penuh kasih sayang.", attendance: "hadir", created_at: "2026-10-30T19:40:00+07:00" },
    { id: "q3", name: "Eyang Putri", message: "Doa terbaik untuk cucu tersayang. Maaf Eyang belum bisa datang, insyaAllah segera berkunjung.", attendance: "tidak", created_at: "2026-10-28T08:05:00+07:00" }
  ];
  /* demo per kategori acara: tema ulang tahun memakai data contoh ulang tahun */
  /* o = theme.json "demo" (opsional): { name, full, parents, age } untuk menyesuaikan data contoh */
  function demoFor(theme, cat, o) {
    if (cat === "aqiqah") return demoAqiqah(theme, o);
    if (cat !== "birthday") return demoData(theme);
    o = o || {}; var nm = str(o.name, 30) || "Alesha", age = str(o.age, 10) || "5";
    var u = function (seed, w, h) { return "https://picsum.photos/seed/" + seed + "/" + w + "/" + h; };
    var d = new Date(Date.now() + 47 * 864e5), iso = d.toISOString().slice(0, 10);
    var content = {
      theme: /^[a-z0-9-]{1,40}$/.test(theme || "") ? theme : "",
      names: { a: nm },
      couple: { bride: { full: str(o.full, 80) || "Alesha Putri Maharani", parents: str(o.parents, 120) || "Putri kecil Bapak Dimas Pratama & Ibu Rania Larasati" } },
      welcome: "Hore, " + nm + " genap " + age + " tahun! Kami mengundang keluarga dan teman-teman untuk merayakan pesta ulang tahunnya bersama kami.",
      quote: { text: "Setiap tahun bersamamu adalah hadiah terindah bagi kami.", source: "Ayah & Bunda" },
      photos: { cover: u("nm-kid-cover", 900, 1200), bride: u("nm-kid", 600, 800), gallery: ["k1", "k2", "k3", "k4", "k5", "k6"].map(function (s, i) { return u("nm-" + s, i % 3 === 0 ? 800 : 900, i % 3 === 0 ? 1100 : 700); }) },
      event: { name: "Pesta Ulang Tahun ke-" + age, start: "15:00", end: "18:00", tz: "WIB", venue: "Ballroom Taman Ceria", address: "Jl. Melati Raya No. 21, Cikarang Utara, Bekasi", maps: "https://maps.google.com/?q=Cikarang" },
      story: [
        { date: "Maret 2021", title: "Hari Pertama di Dunia", text: nm + " lahir di pagi yang cerah dan langsung jadi pusat dunia kecil kami.", photo: u("nm-kid-s1", 700, 500) },
        { date: "Maret 2022", title: "Langkah Pertama", text: "Di ulang tahun pertamanya, " + nm + " berjalan sendiri menuju kue ulang tahunnya.", photo: "" },
        { date: "Juli 2025", title: "Hari Pertama Sekolah", text: "Dengan tas barunya, " + nm + " berangkat ke TK dengan senyum lebar.", photo: u("nm-kid-s3", 700, 500) }
      ],
      gift: { bank: "BCA", number: "1234567890", holder: "Rania Larasati" },
      giftAddress: "Jl. Melati Raya No. 21, Cikarang Utara, Bekasi 17530",
      closing: "Terima kasih sudah menjadi bagian dari hari istimewa " + nm + ". Kami tunggu kehadiranmu di pesta!",
      music: { enabled: true, track: "we-are" },
      features: { countdown: true, rsvp: true, guestbook: true, gift: true, story: true }
    };
    return { vm: normalize(content, { slug: "demo", title: "Ulang Tahun " + nm, category: "birthday", event_date: iso, mode: "demo" }), template: theme || "" };
  }
  function demoAqiqah(theme, o) {
    o = o || {}; var nm = str(o.name, 30) || "Aisyah";
    var u = function (seed, w, h) { return "https://picsum.photos/seed/" + seed + "/" + w + "/" + h; };
    var d = new Date(Date.now() + 47 * 864e5), iso = d.toISOString().slice(0, 10);
    var content = {
      theme: /^[a-z0-9-]{1,40}$/.test(theme || "") ? theme : "",
      names: { a: nm },
      couple: { bride: { full: str(o.full, 80) || "Aisyah Humaira Putri", parents: str(o.parents, 120) || "Putri pertama Bapak Dimas Pratama & Ibu Rania Larasati" } },
      welcome: "Assalamu'alaikum warahmatullahi wabarakatuh. Dengan memohon rahmat dan ridha Allah SWT, kami bermaksud menyelenggarakan tasyakuran aqiqah putri kami. Merupakan kebahagiaan bagi kami apabila Bapak/Ibu/Saudara/i berkenan hadir dan memberikan doa.",
      quote: { text: "Setiap anak tergadaikan dengan aqiqahnya, disembelihkan untuknya pada hari ketujuh, dicukur rambutnya, dan diberi nama.", source: "HR. Abu Dawud" },
      photos: { cover: u("nm-baby-cover", 900, 1200), bride: u("nm-baby", 600, 800), gallery: ["b1", "b2", "b3", "b4", "b5", "b6"].map(function (s, i) { return u("nm-" + s, i % 3 === 0 ? 800 : 900, i % 3 === 0 ? 1100 : 700); }) },
      event: { name: "Tasyakuran Aqiqah", start: "10:00", end: "13:00", tz: "WIB", venue: "Kediaman Bapak Dimas Pratama", address: "Jl. Melati Raya No. 21, Cikarang Utara, Bekasi", maps: "https://maps.google.com/?q=Cikarang" },
      story: [
        { date: "Juni 2026", title: "Kabar Bahagia", text: "Kami mendapat kabar bahwa keluarga kecil kami akan bertambah. Alhamdulillah.", photo: "" },
        { date: "Februari 2027", title: "Hari Kelahiran", text: nm + " lahir dengan sehat, membawa tangis haru dan syukur yang tak terhingga.", photo: u("nm-baby-s2", 700, 500) },
        { date: "Hari ke-7", title: "Nama yang Indah", text: "Kami memberinya nama " + nm + ", dengan doa semoga tumbuh menjadi anak salihah.", photo: "" }
      ],
      gift: { bank: "BSI", number: "7123456789", holder: "Rania Larasati" },
      giftAddress: "Jl. Melati Raya No. 21, Cikarang Utara, Bekasi 17530",
      closing: "Atas kehadiran dan doa restu Bapak/Ibu/Saudara/i, kami ucapkan terima kasih. Wassalamu'alaikum warahmatullahi wabarakatuh.",
      music: { enabled: true, track: "we-are" },
      features: { countdown: true, rsvp: true, guestbook: true, gift: true, story: true }
    };
    return { vm: normalize(content, { slug: "demo", title: "Aqiqah " + nm, category: "aqiqah", event_date: iso, mode: "demo" }), template: theme || "" };
  }
  function demoData(theme) {
    var u = function (seed, w, h) { return "https://picsum.photos/seed/" + seed + "/" + w + "/" + h; };
    var d = new Date(Date.now() + 47 * 864e5), iso = d.toISOString().slice(0, 10);
    var content = {
      theme: /^[a-z0-9-]{1,40}$/.test(theme || "") ? theme : "",
      names: { a: "Sekar", b: "Raka" },
      couple: { order: "pria", groom: { full: "Raka Aditya Pratama, S.T.", parents: "Putra pertama Bapak Hendra Pratama & Ibu Sri Wahyuni", ig: "raka.aditya" }, bride: { full: "Sekar Ayu Larasati, S.Ds.", parents: "Putri kedua Bapak Bambang Larasno & Ibu Dewi Kartika", ig: "sekarayu" } },
      welcome: "Dengan memohon rahmat dan ridho Tuhan Yang Maha Esa, kami bermaksud menyelenggarakan pernikahan putra-putri kami.",
      quote: { text: "Dan di antara tanda-tanda kekuasaan-Nya ialah Dia menciptakan untukmu pasangan dari jenismu sendiri, supaya kamu merasa tenteram kepadanya.", source: "QS. Ar-Rum: 21" },
      photos: { cover: u("nm-cover", 900, 1200), groom: u("nm-groom", 600, 800), bride: u("nm-bride", 600, 800), gallery: ["g1", "g2", "g3", "g4", "g5", "g6"].map(function (s, i) { return u("nm-" + s, i % 3 === 0 ? 800 : 900, i % 3 === 0 ? 1100 : 700); }) },
      event: { name: "Akad Nikah", start: "08:00", end: "10:00", tz: "WIB", venue: "Masjid Al-Ikhlas", address: "Jl. Kenanga No. 12, Cikarang Utara, Bekasi", maps: "https://maps.google.com/?q=Cikarang" },
      events: [
        { name: "Resepsi", date: iso, start: "11:00", end: "14:00", tz: "WIB", venue: "Gedung Serbaguna Kenanga", address: "Jl. Kenanga No. 20, Cikarang Utara, Bekasi", maps: "https://maps.google.com/?q=Cikarang" }
      ],
      story: [
        { date: "Agustus 2019", title: "Pertama Bertemu", text: "Kami berkenalan di sebuah pameran desain kampus. Obrolan singkat soal kopi berubah jadi janji bertemu lagi.", photo: u("nm-s1", 700, 500) },
        { date: "Februari 2022", title: "Menjalin Kasih", text: "Setelah bertahun-tahun bersahabat, kami memutuskan untuk melangkah bersama.", photo: "" },
        { date: "Juni 2026", title: "Lamaran", text: "Di hadapan kedua keluarga, kami bersepakat menuju hari yang paling kami nantikan.", photo: u("nm-s3", 700, 500) }
      ],
      gift: { bank: "BCA", number: "1234567890", holder: "Raka Aditya Pratama" },
      accounts: [{ bank: "GoPay", number: "081234567890", holder: "Sekar Ayu Larasati" }],
      giftAddress: "Jl. Melati No. 8, Cikarang Utara, Bekasi 17530",
      closing: "Merupakan suatu kehormatan dan kebahagiaan bagi kami apabila Bapak/Ibu/Saudara/i berkenan hadir dan memberikan doa restu.",
      music: { enabled: true, track: "we-are" },
      features: { countdown: true, rsvp: true, guestbook: true, gift: true, story: true }
    };
    return { vm: normalize(content, { slug: "demo", title: "Raka & Sekar", category: "wedding", event_date: iso, mode: "demo" }), template: "nusa-essential" };
  }

  w.NMInvite = w.NMInvite || {};
  w.NMInvite.data = { resolve: resolve, demo: demoFor, normalize: normalize, guestName: guestName, sendRsvp: sendRsvp, sendWish: sendWish, wishes: wishes };
})(window);
