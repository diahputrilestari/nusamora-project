/* NusaMora Live Guest: jembatan ke database (backend/admin-live.sql). Aktif HANYA bila alamat memuat ?t=<token tamu 32 heksadesimal>.
   Tanpa token, halaman berjalan sebagai demo seperti semula (tidak ada panggilan jaringan). Semua hook dibungkus try/catch agar tidak merusak halaman. */
(function () {
  "use strict";
  var q = null; try { q = new URLSearchParams(location.search).get("t"); } catch (e) { return; }
  if (!q || !/^[0-9a-f]{32}$/.test(q)) return;
  var TOKEN = q, C = window.NM_CONFIG || {}, d = document, $ = function (s) { return d.querySelector(s); };
  if (!C.SUPABASE_URL || !C.SUPABASE_ANON_KEY || !window.fetch) return;
  var THEME = null, CFG = null, joined = false, hb = null, poll = null, sy = null, raf = 0, peers = {}, lastT = 0, syncBusy = false, seen = {}, mine = {}, esc2 = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  var MSG = { token_tidak_valid: "Link tamu tidak berlaku.", dimatikan: "Live Guest sedang dimatikan oleh penyelenggara.", ruangan_ditutup: "Ruangan sedang ditutup oleh penyelenggara.", penuh: "Ruangan sedang penuh. Coba lagi beberapa saat lagi.", diblokir: "Akses Anda ke ruangan ini diblokir oleh penyelenggara.",
    chat_nonaktif: "Chat sedang dimatikan.", dibisukan: "Anda sedang dibisukan sementara.", terlalu_cepat: "Tunggu sebentar sebelum mengirim lagi.", belum_masuk: "Anda belum masuk ke ruangan.", pesan_tidak_valid: "Pesan tidak valid (1 sampai 300 karakter).", interaksi_tidak_aktif: "Interaksi ini sedang tidak tersedia." };

  function rpc(name, args) {
    return fetch(C.SUPABASE_URL.replace(/\/$/, "") + "/rest/v1/rpc/" + name, { method: "POST", headers: { "Content-Type": "application/json", apikey: C.SUPABASE_ANON_KEY, Authorization: "Bearer " + C.SUPABASE_ANON_KEY }, body: JSON.stringify(args || {}) })
      .then(function (r) { return r.ok ? r.json() : Promise.reject(new Error("http_" + r.status)); });
  }
  function toast(t, bad) {
    var e = $("#nmb-toast"); if (!e) { e = d.createElement("div"); e.id = "nmb-toast"; e.setAttribute("role", "status"); e.style.cssText = "position:fixed;left:50%;bottom:110px;transform:translateX(-50%);z-index:9998;max-width:min(90vw,420px);padding:10px 16px;border-radius:14px;font:600 13px Inter,system-ui,sans-serif;color:#fff;text-align:center;pointer-events:none"; d.body.appendChild(e); }
    e.style.background = bad ? "rgba(160,40,40,.95)" : "rgba(40,40,70,.92)"; e.textContent = t; e.style.display = "block"; clearTimeout(toast.t); toast.t = setTimeout(function () { e.style.display = "none"; }, 3500);
  }
  function block(t) {
    var o = $("#nmb-block"); if (!o) { o = d.createElement("div"); o.id = "nmb-block"; o.setAttribute("role", "alertdialog"); o.setAttribute("aria-modal", "true"); o.style.cssText = "position:fixed;inset:0;z-index:9999;background:rgba(20,16,40,.88);color:#fff;display:flex;align-items:center;justify-content:center;text-align:center;padding:24px;font:16px Inter,system-ui,sans-serif"; d.body.appendChild(o); }
    o.innerHTML = "<div><p style=\"margin:0 0 16px\">" + esc2(t) + "</p><button type=\"button\" onclick=\"location.reload()\" style=\"padding:10px 18px;border-radius:12px;border:0;font-weight:600;cursor:pointer\">Muat ulang</button></div>";
  }
  function safe(fn) { return function () { try { return fn.apply(this, arguments); } catch (e) { return undefined; } }; }

  /* ---- konfigurasi dari admin: area (nama, ikon, aktif/nonaktif) dan fitur. Koordinat TIDAK dipakai: letak objek pada pemandangan ditetapkan oleh halaman. ---- */
  function applyConfig(c) {
    CFG = c;
    try { window.tw = function () { }; } catch (e) { }
    var v = c.venue;
    if (v && typeof AREAS !== "undefined") {
      var by = {}; (v.areas || []).forEach(function (a) { by[a.id] = a; });
      var known = {}; AREAS.forEach(function (a) { known[a.id] = 1; });
      for (var i = AREAS.length - 1; i >= 0; i--) {
        var a = AREAS[i], s = by[a.id];
        if (!s) { if ((v.areas || []).length) AREAS.splice(i, 1); continue; }
        if (s.name) a.n = s.name; if (s.icon) a.t = s.icon;
      }
    }
    var f = c.features || {};
    if (typeof AREAS !== "undefined") {
      if (f.gallery === false) removeArea("galeri"); if (f.guestbook === false) removeArea("buku");
    }
  }
  /* menu area (#ml) dibangun halaman dari daftar tetap; sembunyikan tombol area yang dimatikan admin */
  var hideMenu = safe(function () {
    if (typeof AREAS === "undefined") return; var LB = { stage: "Panggung", resepsi: "Resepsi", booth: "Booth", galeri: "Galeri", video: "Video", buku: "Buku Tamu", kuliner: "Kuliner", istirahat: "Istirahat" };
    var keep = {}; AREAS.forEach(function (a) { keep[a.id] = 1; });
    d.querySelectorAll("#ml button").forEach(function (b) { var t = (b.textContent || "").trim(); Object.keys(LB).forEach(function (id) { if (LB[id] === t && !keep[id]) b.style.display = "none"; }); });
  });
  function removeArea(id) { for (var i = AREAS.length - 1; i >= 0; i--) if (AREAS[i].id === id) AREAS.splice(i, 1); }

  /* ---- masuk ruangan ---- */
  function join() {
    rpc("live_join", { p_token: TOKEN }).then(function (r) {
      if (!r || !r.ok) { block(MSG[r && r.reason] || "Tidak bisa masuk ke ruangan."); return; }
      joined = true; setOnline(r.online); stripDemo(); hideMenu(); buildBars(); buildGames();
      hb = setInterval(function () { rpc("live_heartbeat", { p_token: TOKEN }).then(function (n) { if (n === -1) { clearInterval(hb); clearInterval(poll); stopSync(); block("Anda keluar dari ruangan (ditutup atau diblokir oleh penyelenggara)."); } else if (typeof n === "number") setOnline(n); }, function () { }); }, 30000);
      poll = setInterval(pollChat, 3000); pollChat();
      sy = setInterval(syncTick, 1500); syncTick(); raf = requestAnimationFrame(stepPeers);
    }, function () { toast("Tidak dapat terhubung ke server. Mode demo tetap berjalan.", true); });
  }
  function setOnline(n) { var e = $("#cnt"); if (e && typeof n === "number") e.textContent = n; }


  /* Tema venue dari database -> mesin tema halaman (NM). Template tetap satu; tema = data (palet, jenis acara, lukisan venue). */
  var applyTheme = safe(function (t) {
    if (!t || !t.theme || typeof NM === "undefined") return;
    var id = String(t.id || "").replace(/[^\w-]/g, "").slice(0, 40); if (!id) return;
    var pt = t.painting ? String(t.painting) : null; if (pt && pt.charAt(0) === "/") pt = location.origin + pt; if (pt && !/^https:\/\//.test(pt)) pt = null;
    /* Lukisan dipakai juga sebagai panorama 3D (canvas -> WebGL). Gambar lintas-origin menodai canvas dan scene jadi hitam, jadi lukisan diunduh dulu
       (butuh header CORS) dan dipasang sebagai blob same-origin. Gagal unduh = lukisan bawaan tetap dipakai. */
    NM.registerEnv(id, { name: t.name || id, painting: null, pos: t.pos || "center 38%" });
    var ev = t.event && NM.events[t.event] ? t.event : null;
    var cfg = Object.assign({}, t.theme, { env: id }); if (ev) cfg.events = [ev];
    if (!NM.registerTheme(id, cfg)) return;
    var d = { theme: id }; if (ev) d.eventType = ev; if (t.host) d.hostName = String(t.host);
    INVDATA = Object.assign({}, (typeof INVDATA !== "undefined" && INVDATA) || {}, d);
    if (typeof applyIdentity === "function") applyIdentity();
    if (pt) fetch(pt, { mode: "cors", credentials: "omit" }).then(function (r) { return r.ok ? r.blob() : Promise.reject(new Error("http")); }).then(function (bl) {
      if (!/^image\/(png|jpeg|webp)$/.test(bl.type) || bl.size > 12582912) return;
      document.documentElement.style.setProperty("--bgurl", 'url("' + URL.createObjectURL(bl) + '")');
    }, function () { });
  });

  /* Tamu lain di scene: kirim posisi sendiri, terima tamu aktif lain, tampilkan sebagai karakter. */
  function stopSync() { clearInterval(sy); try { cancelAnimationFrame(raf); } catch (e) { } Object.keys(peers).forEach(dropPeer); }
  function dropPeer(id) {
    var e = peers[id]; if (!e) return; delete peers[id];
    try { if (e.el) e.el.remove(); } catch (x) { }
    try { if (typeof sc !== "undefined" && e.g) sc.remove(e.g); } catch (x) { }
    try { var k = ents.indexOf(e); if (k >= 0) ents.splice(k, 1); } catch (x) { }
  }
  var syncTick = safe(function () {
    if (syncBusy || typeof P === "undefined" || !P || !P.g || typeof ent !== "function") return;
    syncBusy = true;
    var pos = P.g.position, args = { p_token: TOKEN, p_x: Math.round(pos.x * 100) / 100, p_z: Math.round(pos.z * 100) / 100, p_av: { g: S.g, i: S.i } };
    if (!isFinite(args.p_x) || !isFinite(args.p_z)) { args.p_x = null; args.p_z = null; }
    rpc("live_sync", args).then(function (r) {
      syncBusy = false; if (!r) return;
      if (r.online === -1) { clearInterval(hb); clearInterval(poll); stopSync(); block("Anda keluar dari ruangan (ditutup atau diblokir oleh penyelenggara)."); return; }
      setOnline(r.online); applyPeers(r.peers || []);
    }, function () { syncBusy = false; });
  });
  var applyPeers = safe(function (L) {
    var live = {};
    L.forEach(function (p) {
      if (!p || !p.id || typeof p.x !== "number" || typeof p.z !== "number") return;
      live[p.id] = 1; var e = peers[p.id];
      if (!e) {
        var g = p.av && AV[p.av.g] && AV[p.av.g][p.av.i] ? p.av : { g: S.g, i: 0 };
        if (!AV[g.g] || !AV[g.g][g.i]) return;
        e = ent(String(p.name || "Tamu").slice(0, 40), AV[g.g][g.i], p.x, p.z); peers[p.id] = e;
      }
      e.nbx = p.x; e.nbz = p.z;
    });
    Object.keys(peers).forEach(function (id) { if (!live[id]) dropPeer(id); });
  });
  var stepPeers = safe(function (t) {
    var dt = lastT ? Math.min(0.1, (t - lastT) / 1000) : 0.016; lastT = t;
    Object.keys(peers).forEach(function (id) {
      var e = peers[id], dx = e.nbx - e.g.position.x, dz = e.nbz - e.g.position.z, dist = Math.sqrt(dx * dx + dz * dz);
      if (!isFinite(dist)) return;
      if (dist > 12) { e.g.position.x = e.nbx; e.g.position.z = e.nbz; e.mv = 0; return; }
      if (dist > 0.15 && typeof move === "function") move(e, dx / dist, dz / dist, Math.min(dist, 3.2 * dt)); else e.mv = 0;
    });
    raf = requestAnimationFrame(stepPeers);
  });
  var stripDemo = safe(function () {
    if (typeof bots !== "undefined") {
      bots.forEach(function (b) { try { if (b.el) b.el.remove(); if (typeof sc !== "undefined" && b.g) sc.remove(b.g); } catch (e) { } });
      if (typeof ents !== "undefined") { var drop = bots.slice(); for (var i = ents.length - 1; i >= 0; i--) if (drop.indexOf(ents[i]) > -1) ents.splice(i, 1); }
      bots.length = 0;
    }
    var l = $("#log"); if (l) l.innerHTML = "";
    var oa = window.addChat; window.addChat = function (e) { if (!e) return; return oa.apply(this, arguments); };
  });

  /* ---- chat ---- */
  function ownName() { return (typeof S !== "undefined" && S.name) || "Saya"; }
  function showMsg(m) {
    var l = $("#log"); if (!l) return; var t = new Date(m.created_at || Date.now());
    var e = d.createElement("div"); e.className = "m"; e.innerHTML = "<div><b>" + esc2(m.name) + "</b>" + esc2(m.body) + " <i>" + esc2(isNaN(t) ? "" : t.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })) + "</i></div>";
    l.appendChild(e); l.scrollTop = l.scrollHeight;
  }
  var pollChat = safe(function () {
    rpc("live_chat_list", { p_token: TOKEN }).then(function (L) {
      (L || []).forEach(function (m) {
        if (m.status !== "visible") return;
        if (mine[m.id]) { if (!mine[m.id].shown && typeof P !== "undefined" && P && window.addChat) { mine[m.id].shown = 1; window.addChat(P, m.body); } return; }
        if (seen[m.id]) return; seen[m.id] = 1; showMsg(m);
      });
    }, function () { });
  });
  var sendChat = safe(function () {
    var i = $("#ci"), t = (i.value || "").trim(); if (!t || !joined) return;
    i.value = ""; var emo = $("#emo"); if (emo) emo.style.display = "none";
    rpc("live_chat_send", { p_token: TOKEN, p_body: t }).then(function (r) {
      if (!r || !r.ok) { i.value = t; toast(MSG[r && r.reason] || "Pesan gagal terkirim.", true); return; }
      mine[r.id] = { shown: 0 }; seen[r.id] = 1;
      if (r.status === "visible") { mine[r.id].shown = 1; if (typeof P !== "undefined" && P) window.addChat(P, t); }
      else if (r.status === "pending") toast("Pesan Anda menunggu persetujuan moderator.");
      else toast("Pesan Anda tidak dapat ditampilkan.", true);
    }, function () { i.value = t; toast("Pesan gagal terkirim. Periksa koneksi.", true); });
  });

  /* ---- interaksi (dibangun dari konfigurasi admin) ---- */
  var buildBars = safe(function () {
    var bar = $("#rxs"); if (!bar) return; bar.innerHTML = "";
    (CFG.interactions || []).forEach(function (it) {
      var b = d.createElement("button"); b.type = "button"; b.setAttribute("data-ik", it.key); b.setAttribute("aria-label", it.label); b.title = it.label; b.textContent = it.emoji;
      var n = d.createElement("span"); n.textContent = "0"; b.appendChild(n);
      b.onclick = function () {
        rpc("live_interact", { p_token: TOKEN, p_key: it.key }).then(function (r) {
          if (!r || !r.ok) { if (r && r.reason !== "terlalu_cepat") toast(MSG[r.reason] || "Gagal.", true); return; }
          n.textContent = String((+n.textContent || 0) + 1); if (typeof P !== "undefined" && P && window.react) window.react(P, it.emoji);
        }, function () { });
      };
      bar.appendChild(b);
    });
  });

  /* ---- mini game (kuis & tap) ---- */
  var buildGames = safe(function () {
    var gs = (CFG.games || []).filter(function (g) { return g.kind === "trivia" || g.kind === "tap"; }); CFG.playable = gs;
    var nav = $("#ml"); if (!gs.length || !nav || $("#nmb-gm")) return;
    var ref = nav.querySelector("button"), b = d.createElement("button"); if (ref) b.className = ref.className; b.id = "nmb-gm"; b.type = "button"; b.textContent = "Mini Game"; b.onclick = function () { gameList(); var m = $("#map"); if (m) m.classList.add("c"); }; nav.appendChild(b);
  });
  function modal(title, html) { if (typeof openM === "function") openM(title, html); }
  function gameList() {
    modal("🎮 Mini Game", "<div>" + (CFG.playable || []).map(function (g, i) { return '<button class="btn" type="button" data-nmb="play" data-i="' + i + '" style="display:block;width:100%;margin:6px 0">' + esc2(g.name) + "</button>"; }).join("") + "</div>");
  }
  var G = null;
  function play(i) {
    var g = CFG.playable[i]; if (!g) return; G = { g: g, qi: 0, ans: [], taps: 0, left: 0 };
    if (g.kind === "trivia") question(); else tapGame();
  }
  function question() {
    var g = G.g, qs = (g.config && g.config.questions) || [], q = qs[G.qi];
    if (!q) { return rpc("live_game_submit", { p_token: TOKEN, p_game: g.key, p_answers: G.ans }).then(function (r) { result(r); }, function () { toast("Skor gagal dikirim.", true); }); }
    modal(g.name, "<p><b>" + (G.qi + 1) + "/" + qs.length + "</b> " + esc2(q.q) + "</p>" + (q.options || []).map(function (o, j) { return '<button class="btn g" type="button" data-nmb="ans" data-j="' + j + '" style="display:block;width:100%;margin:6px 0">' + esc2(o) + "</button>"; }).join(""));
  }
  function tapGame() {
    var g = G.g, secs = (g.config && g.config.seconds) || 20; G.left = secs;
    modal(g.name, '<p>Ketuk tombol sebanyak mungkin dalam <b id="nmb-t">' + secs + '</b> detik.</p><button class="btn" type="button" id="nmb-tap" data-nmb="tap" style="width:100%;padding:28px;font-size:22px">Ketuk! <span id="nmb-c">0</span></button>');
    G.timer = setInterval(function () { G.left--; var t = $("#nmb-t"); if (t) t.textContent = Math.max(0, G.left); if (G.left <= 0) { clearInterval(G.timer); rpc("live_game_submit", { p_token: TOKEN, p_game: g.key, p_score: Math.min(G.taps, g.points_max) }).then(result, function () { toast("Skor gagal dikirim.", true); }); } }, 1000);
  }
  function result(r) {
    if (!r || !r.ok) { modal("Hasil", "<p>" + esc2(r && r.reason === "game_tidak_aktif" ? "Game ini sudah tidak aktif." : "Skor tidak dapat disimpan.") + "</p>"); return; }
    rpc("live_leaderboard", { p_token: TOKEN, p_game: G.g.key }).then(function (L) {
      modal("Hasil", "<p>Skor Anda: <b>" + esc2(r.score) + "</b> · Terbaik: <b>" + esc2(r.best) + "</b></p><h3>Papan skor</h3><ol>" + (L || []).map(function (x) { return "<li>" + esc2(x.name) + " — " + esc2(x.score) + "</li>"; }).join("") + '</ol><button class="btn g" type="button" data-nmb="list">Kembali</button>');
    }, function () { });
  }
  d.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest("[data-nmb]"); if (!b) return; var k = b.getAttribute("data-nmb");
    if (k === "play") play(+b.getAttribute("data-i")); else if (k === "list") gameList();
    else if (k === "ans" && G) { G.ans.push(+b.getAttribute("data-j")); G.qi++; question(); }
    else if (k === "tap" && G) { G.taps++; var c = $("#nmb-c"); if (c) c.textContent = G.taps; }
  });

  /* ---- pasang ---- */
  rpc("live_config", { p_token: TOKEN }).then(function (c) {
    if (!c) { var n1 = $("#n1"); if (n1) n1.disabled = true; block(MSG.token_tidak_valid); return; }
    if (!c.enabled) { block(MSG.dimatikan); return; }
    applyConfig(c);
    rpc("live_theme", { p_token: TOKEN }).then(function (t) { THEME = t; applyTheme(t); }, function () { });
    var iv = setInterval(function () {
      if (typeof P !== "undefined" && P) {
        clearInterval(iv); join(); if (THEME) try { applyIdentity(); } catch (e) { }
        var sb = $("#sb"), ci = $("#ci"); if (sb) sb.onclick = sendChat; if (ci) ci.onkeydown = function (e) { if (e.key === "Enter") sendChat(); };
      }
    }, 400);
  }, function () { toast("Tidak dapat terhubung ke server. Mode demo tetap berjalan.", true); });
  addEventListener("pagehide", function () { if (joined) try { fetch(C.SUPABASE_URL.replace(/\/$/, "") + "/rest/v1/rpc/live_leave", { method: "POST", keepalive: true, headers: { "Content-Type": "application/json", apikey: C.SUPABASE_ANON_KEY, Authorization: "Bearer " + C.SUPABASE_ANON_KEY }, body: JSON.stringify({ p_token: TOKEN }) }); } catch (e) { } });
})();
