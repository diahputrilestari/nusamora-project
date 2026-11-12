/* NusaMora Admin: Live Guest (menumpang pada assets/admin.js lewat window.NM_ADMIN_EXT). Penegakan aturan ada di database (backend/admin-live.sql). */
(function () {
  "use strict";
  window.NM_ADMIN_EXT = window.NM_ADMIN_EXT || [];
  window.NM_ADMIN_EXT.push(function (X) {
    var sb = X.sb, $ = X.$, esc = X.esc, toast = X.toast, empty = X.empty, skel = X.skel, errBox = X.errBox, dlgConfirm = X.dlgConfirm, can = X.can, M = X.M, d = document;
    var ERR = { forbidden: "Anda tidak berhak melakukan ini.", area_tidak_valid: "Area tidak valid: id unik (huruf kecil/angka/-/_), nama 2 sampai 40 karakter, x dan z antara -40 dan 40.", nama_tidak_valid: "Nama 2 sampai 60 karakter.", kunci_tidak_valid: "Kunci: huruf kecil, angka, dan tanda hubung (2 sampai 39 karakter).",
      kunci_sudah_dipakai: "Kunci itu sudah dipakai.", kapasitas_tidak_valid: "Kapasitas 1 sampai 5000.", url_tidak_valid: "URL harus diawali https:// atau /.", venue_dipakai: "Venue masih dipakai ruangan. Ganti venue ruangan itu dulu.", venue_tidak_ditemukan: "Venue tidak ditemukan.",
      alasan_wajib: "Alasan wajib diisi (minimal 3 karakter).", durasi_tidak_valid: "Durasi 1 sampai 10080 menit.", konfigurasi_game_tidak_valid: "Konfigurasi game tidak valid (trivia: 1 sampai 20 soal, 2 sampai 6 pilihan, jawaban benar harus ada).", poin_tidak_valid: "Poin maksimum 1 sampai 10000.",
      jeda_tidak_valid: "Jeda 0 sampai 60 detik.", isian_tidak_valid: "Nama 2 sampai 40 karakter dan emoji 1 sampai 8 karakter.", kata_tidak_valid: "Kata 2 sampai 40 karakter.", rentang_tidak_valid: "Rentang tanggal tidak valid.", max_guests_tidak_valid: "Batas tamu 1 sampai 5000.", default_theme_tidak_valid: "Tema bawaan harus venue yang ada.", slow_mode_tidak_valid: "Slow mode 0 sampai 120 detik." };
    var errText = function (e) { var m = String(e && (e.message || e.error || e) || ""), k = Object.keys(ERR).filter(function (x) { return m.indexOf(x) > -1; })[0]; return k ? ERR[k] : "Gagal: " + m; };
    var jak = function (fn) { return new Promise(function (res, rej) { Promise.resolve(fn()).then(function (r) { if (r && r.error) rej(r.error); else res(r.data); }, rej); }); };
    var wib = function (s) { if (!s) return "-"; var x = new Date(s); return isNaN(x) ? "-" : x.toLocaleString("id-ID", { timeZone: "Asia/Jakarta", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }); };
    var xBtn = '<button class="icon-btn x" type="button" data-close aria-label="Tutup"><svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button>';
    var CST = { visible: ["Tampil", "ok"], pending: ["Menunggu", "warn"], hidden: ["Disembunyikan", "bad"], removed: ["Dihapus", "bad"] };
    var FLAG = { kata_terlarang: "Kata terlarang", tautan: "Berisi tautan" };
    var CHATM = { open: "Terbuka", moderated: "Dimoderasi (tunggu persetujuan)", off: "Dimatikan" };
    var bd = function (map, k) { var x = map[k] || [k || "-", ""]; return '<span class="badge ' + x[1] + '">' + esc(x[0]) + "</span>"; };
    var canW = function () { return can("live", "write"); }, canD = function () { return can("live", "delete"); };
    var PAGE = 25;

    if (!d.getElementById("lg-css")) {
      var st = d.createElement("style"); st.id = "lg-css";
      st.textContent = "#view #body{grid-template-columns:minmax(0,1fr)}#view #body>*{min-width:0}dialog.lg-d{max-width:860px;width:calc(100% - 32px)}.lg-d [hidden]{display:none!important}.lg-d>*{min-width:0}.lg-d h2{overflow-wrap:anywhere}.lg-d .tbl-w{max-width:100%;overflow-x:auto}.lg-f{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(min(220px,100%),1fr))}.lg-f .full{grid-column:1/-1}.lg-e{color:var(--bad,#b3261e);min-height:1.2em}.lg-tool{display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end;margin-bottom:14px}.lg-tool .fld{min-width:150px}.lg-cards{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(min(190px,100%),1fr));margin-bottom:16px}.lg-cards .card{padding:14px;min-width:0}.lg-cards b{display:block;font-size:1.25rem;overflow-wrap:anywhere}.lg-pg{display:flex;gap:10px;align-items:center;justify-content:flex-end;margin-top:12px}.lg-btns{display:flex;gap:8px;flex-wrap:wrap}.lg-sec{margin:18px 0 6px;font-size:1rem}.lg-map{width:100%;max-width:420px;aspect-ratio:1;background:var(--card,#fff);border:1px solid var(--line,#ddd);border-radius:12px}.lg-bar{display:inline-block;height:10px;border-radius:5px;background:var(--brand,#6b4aa8);vertical-align:middle;min-width:2px}.lg-ar input{width:100%;min-width:0}.lg-ar td{vertical-align:middle}.lg-q{border:1px solid var(--line,#ddd);border-radius:10px;padding:10px;margin-bottom:10px}";
      d.head.appendChild(st);
    }
    function dialog(id) { var dl = $("#" + id); if (dl) dl.remove(); dl = d.createElement("dialog"); dl.id = id; dl.className = "wide lg-d"; dl.setAttribute("aria-labelledby", id + "-t"); d.body.appendChild(dl); dl.addEventListener("click", function (e) { if (e.target.closest("[data-close]")) dl.close(); }); return dl; }
    function ask(title, intro, fields, yes, cls) {
      return new Promise(function (res) {
        var dl = dialog("lg-ask"), done = false;
        dl.innerHTML = '<div class="dlg-h"><h2 id="lg-ask-t">' + esc(title) + "</h2>" + xBtn + '</div><form class="lg-f" novalidate><p class="full sub">' + esc(intro || "") + "</p>" + fields.map(function (f) {
          return '<label class="fld full"><span>' + esc(f.l) + "</span>" + (f.opts ? '<select name="' + f.k + '">' + f.opts.map(function (o) { return '<option value="' + esc(o[0]) + '">' + esc(o[1]) + "</option>"; }).join("") + "</select>" : "<input type=\"" + (f.num ? "number" : "text") + '" name="' + f.k + '" maxlength="' + (f.max || 200) + '"' + (f.val != null ? ' value="' + esc(f.val) + '"' : "") + ">") + "</label>";
        }).join("") + '<div class="full lg-e" role="alert"></div><div class="full lg-btns"><button class="btn ' + (cls || "") + '" type="submit">' + esc(yes) + '</button><button class="btn o" type="button" data-close>Batal</button></div></form>';
        dl.addEventListener("close", function () { if (!done) res(null); }, { once: true });
        dl.querySelector("form").addEventListener("submit", function (e) {
          e.preventDefault(); var o = {}, bad = "";
          fields.forEach(function (f) { var v = String(dl.querySelector('[name="' + f.k + '"]').value || "").trim(); o[f.k] = v; if (f.min && v.length < f.min) bad = f.l + " minimal " + f.min + " karakter."; });
          if (bad) { dl.querySelector(".lg-e").textContent = bad; return; }
          done = true; dl.close(); res(o);
        });
        dl.showModal();
      });
    }
    function run(p, okMsg, after) { return p.then(function () { toast(okMsg); if (after) after(); }, function (e) { toast(errText(e), "bad"); }); }
    function pager(root, st, total, cb) {
      var pg = root.querySelector(".lg-pg"); if (!pg) return; var last = Math.max(0, Math.ceil(total / PAGE) - 1);
      pg.innerHTML = '<span class="sub">' + total + " data, halaman " + (st.page + 1) + " dari " + (last + 1) + '</span><button class="btn o" type="button" data-p="-1"' + (st.page <= 0 ? " disabled" : "") + '>Sebelumnya</button><button class="btn o" type="button" data-p="1"' + (st.page >= last ? " disabled" : "") + ">Berikutnya</button>";
      pg.onclick = function (e) { var b = e.target.closest("[data-p]"); if (!b || b.disabled) return; st.page += +b.getAttribute("data-p"); cb(); };
    }
    var card = function (l, v, s) { return '<div class="card"><span class="sub">' + esc(l) + "</span><b>" + v + "</b>" + (s ? '<span class="sub">' + s + "</span>" : "") + "</div>"; };

    /* ---------- Monitoring ruangan ---------- */
    function renderRooms(root) {
      var S = { page: 0, q: "" };
      root.innerHTML = '<div id="lr-ov">' + skel() + '</div><div class="lg-tool"><label class="fld"><span>Cari undangan</span><input type="search" id="lr-q" placeholder="Judul atau link"></label>' + (canW() ? '<button class="btn o" type="button" id="lr-cl">Bersihkan data lama</button>' : "") + '</div><div id="lr-t"></div><div class="lg-pg"></div>';
      jak(function () { return sb.rpc("admin_live_overview"); }).then(function (o) {
        $("#lr-ov").innerHTML = (o.enabled ? "" : '<div class="card" style="border-left:4px solid var(--warn,#b26a00);padding:10px 14px;margin-bottom:14px"><b>Live Guest dimatikan.</b> Tamu tidak bisa masuk. Aktifkan di tab Pengaturan Fitur.</div>') + '<div class="lg-cards">' + card("Tamu online sekarang", o.online_now, o.rooms_live + " ruangan aktif") + card("Masuk 24 jam", o.joins_24h) + card("Chat menunggu moderasi", o.chat_pending) + card("Chat ditandai 24 jam", o.chat_flagged_24h) + card("Bisu/blokir aktif", o.mutes_active) + card("Ruangan ditutup", o.rooms_closed) + "</div>";
      }, function (e) { $("#lr-ov").innerHTML = errBox(errText(e)); });
      function load() {
        var t = $("#lr-t"); t.innerHTML = skel();
        jak(function () { return sb.rpc("admin_live_rooms", { p_q: S.q || null, p_limit: PAGE, p_offset: S.page * PAGE }); }).then(function (r) {
          var rows = r.rows || [];
          t.innerHTML = rows.length ? '<div class="card tbl-w"><table><thead><tr><th>Undangan</th><th>Status</th><th>Online</th><th>Aktivitas 24 jam</th><th>Chat</th><th>Venue</th><th></th></tr></thead><tbody>' + rows.map(function (x) {
            return "<tr><td><b>" + esc(x.title || "-") + '</b><span class="cell-s">' + esc(x.public_url || "") + "</span></td><td>" + (x.status === "closed" ? '<span class="badge bad">Ditutup</span>' : '<span class="badge ok">Terbuka</span>') + "</td><td>" + x.online + (x.max_guests ? " / " + x.max_guests : "") + "</td><td>" + x.events_24h + "</td><td>" + esc(CHATM[x.chat_mode] || x.chat_mode) + (x.chat_pending ? ' <span class="badge warn">' + x.chat_pending + " menunggu</span>" : "") + (x.mutes ? ' <span class="badge bad">' + x.mutes + " dibatasi</span>" : "") + "</td><td>" + esc(x.venue || "Bawaan") + '</td><td><button class="btn o" type="button" data-room="' + esc(x.id) + '">Kelola</button></td></tr>';
          }).join("") + "</tbody></table></div>" : empty("Belum ada ruangan yang aktif atau punya aktivitas.");
          S.rows = rows; pager(root, S, r.total || 0, load);
        }, function (e) { t.innerHTML = errBox(errText(e)); });
      }
      var tm; $("#lr-q").addEventListener("input", function (e) { clearTimeout(tm); tm = setTimeout(function () { S.q = e.target.value; S.page = 0; load(); }, 300); });
      var cl = $("#lr-cl"); if (cl) cl.addEventListener("click", function () { run(jak(function () { return sb.rpc("admin_live_cleanup"); }), "Data lama dibersihkan.", load); });
      root.addEventListener("click", function (e) { var b = e.target.closest("[data-room]"); if (b) roomDlg((S.rows || []).filter(function (x) { return x.id === b.getAttribute("data-room"); })[0], load); });
      load();
    }
    function roomDlg(rm, reload) {
      if (!rm) return; var W = canW(), dl = dialog("lg-room");
      jak(function () { return sb.rpc("admin_live_venues"); }).then(function (V) {
        dl.innerHTML = '<div class="dlg-h"><h2 id="lg-room-t">' + esc(rm.title || "Ruangan") + "</h2>" + xBtn + '</div><form class="lg-f" id="lg-rf" novalidate><label class="fld"><span>Status ruangan</span><select name="status"' + (W ? "" : " disabled") + '><option value="open">Terbuka</option><option value="closed">Ditutup (semua tamu dikeluarkan)</option></select></label><label class="fld"><span>Mode chat</span><select name="chat_mode"' + (W ? "" : " disabled") + '><option value="open">Terbuka</option><option value="moderated">Dimoderasi</option><option value="off">Dimatikan</option></select></label>' +
          '<label class="fld"><span>Slow mode (detik)</span><input type="number" name="slow" min="0" max="120" value="' + esc(rm.slow_seconds) + '"' + (W ? "" : " disabled") + '></label><label class="fld"><span>Batas tamu (kosong = ikut venue)</span><input type="number" name="max" min="1" max="5000" value="' + esc(rm.max_guests == null ? "" : rm.max_guests) + '"' + (W ? "" : " disabled") + '></label><label class="fld full"><span>Venue</span><select name="venue"' + (W ? "" : " disabled") + '><option value="">Bawaan (tema bawaan)</option>' + (V || []).map(function (v) { return '<option value="' + esc(v.id) + '">' + esc(v.name) + "</option>"; }).join("") + '</select></label><div class="full lg-e" role="alert"></div>' + (W ? '<div class="full lg-btns"><button class="btn" type="submit">Simpan</button></div>' : "") + '</form><h3 class="lg-sec">Tamu online</h3><div id="lg-gs">' + skel() + "</div>";
        var f = $("#lg-rf"); f.elements.status.value = rm.status; f.elements.chat_mode.value = rm.chat_mode; f.elements.venue.value = rm.venue_id || "";
        f.addEventListener("submit", function (e) {
          e.preventDefault(); if (!W) return; var mx = String(f.elements.max.value).trim(), sl = Number(f.elements.slow.value);
          if (String(f.elements.slow.value).trim() === "" || isNaN(sl)) { f.querySelector(".lg-e").textContent = "Isi slow mode dengan angka."; return; }
          var go = function () { run(jak(function () { return sb.rpc("admin_live_room_set", { p_inv: rm.id, p_status: f.elements.status.value, p_chat_mode: f.elements.chat_mode.value, p_slow: sl, p_max: mx === "" ? null : Number(mx), p_venue: f.elements.venue.value || null }); }), "Ruangan disimpan.", function () { dl.close(); if (reload) reload(); }); };
          if (f.elements.status.value === "closed" && rm.status !== "closed") dlgConfirm("Tutup ruangan? Semua tamu yang sedang online langsung dikeluarkan.", "Tutup ruangan").then(function (y) { if (y) go(); }); else go();
        });
        function guests() {
          jak(function () { return sb.rpc("admin_live_guests", { p_inv: rm.id }); }).then(function (g) {
            var on = g.online || [], mu = g.mutes || [];
            $("#lg-gs").innerHTML = (on.length ? '<div class="tbl-w"><table><thead><tr><th>Tamu</th><th>Terakhir aktif</th><th></th></tr></thead><tbody>' + on.map(function (x) { return "<tr><td>" + esc(x.name) + (x.mute ? ' <span class="badge bad">' + esc(x.mute === "ban" ? "Diblokir" : "Dibisukan") + "</span>" : "") + "</td><td>" + esc(wib(x.last_seen)) + "</td><td>" + (W ? '<div class="lg-btns"><button class="btn o" type="button" data-k="kick" data-g="' + esc(x.guest_id) + '">Keluarkan</button><button class="btn o" type="button" data-k="mute" data-g="' + esc(x.guest_id) + '">Bisukan</button><button class="btn o bad" type="button" data-k="ban" data-g="' + esc(x.guest_id) + '">Blokir</button></div>' : "") + "</td></tr>"; }).join("") + "</tbody></table></div>" : '<p class="sub">Tidak ada tamu online.</p>') +
              '<h3 class="lg-sec">Bisu dan blokir aktif</h3>' + (mu.length ? '<div class="tbl-w"><table><thead><tr><th>Tamu</th><th>Jenis</th><th>Sampai</th><th>Alasan</th><th></th></tr></thead><tbody>' + mu.map(function (x) { return "<tr><td>" + esc(x.name) + "</td><td>" + esc(x.kind === "ban" ? "Blokir" : "Bisu") + "</td><td>" + esc(wib(x.until)) + "</td><td>" + esc(x.reason || "") + "</td><td>" + (W ? '<button class="btn o" type="button" data-k="un" data-g="' + esc(x.guest_id) + '">Cabut</button>' : "") + "</td></tr>"; }).join("") + "</tbody></table></div>" : '<p class="sub">Tidak ada.</p>');
          }, function (e) { $("#lg-gs").innerHTML = errBox(errText(e)); });
        }
        $("#lg-gs").addEventListener("click", function (e) {
          var b = e.target.closest("[data-k]"); if (!b) return; var k = b.getAttribute("data-k"), g = b.getAttribute("data-g");
          if (k === "kick") run(jak(function () { return sb.rpc("admin_live_kick", { p_inv: rm.id, p_guest: g }); }), "Tamu dikeluarkan (bisa masuk lagi).", guests);
          else if (k === "un") run(jak(function () { return sb.rpc("admin_live_unmute", { p_inv: rm.id, p_guest: g }); }), "Pembatasan dicabut.", guests);
          else ask(k === "ban" ? "Blokir tamu" : "Bisukan tamu", k === "ban" ? "Tamu dikeluarkan dan tidak bisa masuk selama durasi ini." : "Tamu tidak bisa mengirim chat selama durasi ini.", [{ k: "m", l: "Durasi (menit)", num: 1, val: 30, max: 6 }, { k: "r", l: "Alasan", min: 3 }], k === "ban" ? "Blokir" : "Bisukan", "bad").then(function (v) {
            if (!v) return; run(jak(function () { return sb.rpc("admin_live_mute", { p_inv: rm.id, p_guest: g, p_kind: k, p_minutes: Number(v.m), p_reason: v.r }); }), k === "ban" ? "Tamu diblokir." : "Tamu dibisukan.", guests);
          });
        });
        dl.showModal(); guests();
      }, function (e) { toast(errText(e), "bad"); });
    }

    /* ---------- Tema venue (palet, jenis acara, lukisan) ---------- */
    var TH_COL = [["ivory", "Latar halaman"], ["white", "Kartu"], ["soft", "Lembut 1"], ["soft2", "Lembut 2"], ["accent", "Aksen"], ["deep", "Judul / tua"], ["ink", "Teks"], ["mute", "Teks pudar"], ["line", "Garis"]],
      TH_DEF = { ivory: "#F7F1FF", white: "#FFFFFF", soft: "#EDE2FF", soft2: "#D9C6F5", accent: "#6D3FC0", deep: "#3A2160", ink: "#2A1B3D", mute: "#7F6A9E", line: "#E1D4F5" },
      TH_FONT = { "Fredoka": 'Fredoka,"Cormorant Garamond",sans-serif', "Playfair Display": '"Playfair Display",Georgia,serif', "Cinzel": 'Cinzel,"Times New Roman",serif', "Cormorant Garamond": '"Cormorant Garamond",Georgia,serif' },
      TH_ORN = ["sparkle", "confetti", "sprig", "blossom", "diamond", "mandala", "leaf", "line", "rings"], TH_MOTIF = ["sparkle", "confetti", "garden", "sakura", "gold", "royal", "boho", "minimal", "rings"],
      TH_EV = [["", "Ikuti undangan"], ["birthday", "Ulang tahun"], ["sweet17", "Sweet Seventeen"], ["wedding", "Pernikahan"], ["engagement", "Pertunangan"], ["corporate", "Acara perusahaan"]];
    function opt(list, cur) { return list.map(function (o) { var k = Array.isArray(o) ? o[0] : o, l = Array.isArray(o) ? o[1] : o; return '<option value="' + esc(k) + '"' + (k === cur ? " selected" : "") + ">" + esc(l) + "</option>"; }).join(""); }
    function themeHtml(v, dis) {
      var t = v && v.nm_theme, u = (t && t.ui) || TH_DEF, fam = "Fredoka";
      if (t && t.ui && t.ui.serif) Object.keys(TH_FONT).forEach(function (k) { if (TH_FONT[k] === t.ui.serif) fam = k; });
      return '<div class="full"><h3 class="lg-sec">Tema tampilan (template universal)</h3><p class="sub">Warna dan jenis acara dipasang ke halaman Live Guest lewat mesin tema. Gambar lukisan venue (rasio 1672x941, PNG/JPG/WebP) diisi pada URL background di atas; boleh berasal dari Asset Library. Hanya font Fredoka, Playfair Display, Cinzel, dan Cormorant Garamond yang dimuat halaman.</p></div>' +
        '<label class="fld full"><span><input type="checkbox" name="th_on"' + (t ? " checked" : "") + dis + '> Pakai tema warna untuk venue ini</span></label>' +
        '<label class="fld"><span>Jenis acara</span><select name="ev"' + dis + ">" + opt(TH_EV, (v && v.event_type) || "") + '</select></label>' +
        '<label class="fld"><span>Posisi lukisan (CSS, mis. center 38%)</span><input name="pos" maxlength="30" value="' + esc((v && v.bg_pos) || "center 38%") + '"' + dis + "></label>" +
        TH_COL.map(function (c) { return '<label class="fld"><span>' + c[1] + '</span><input type="color" name="c_' + c[0] + '" value="' + esc(u[c[0]] && /^#[0-9a-f]{6}$/i.test(u[c[0]]) ? u[c[0]] : TH_DEF[c[0]]) + '"' + dis + "></label>"; }).join("") +
        '<label class="fld"><span>Warna panel (HUD)</span><input type="color" name="c_hud" value="' + esc(t && t.hud && /^#[0-9a-f]{6}$/i.test(t.hud.acc) ? t.hud.acc : "#F7A8D4") + '"' + dis + "></label>" +
        '<label class="fld"><span>Font</span><select name="font"' + dis + ">" + opt(Object.keys(TH_FONT), fam) + '</select></label>' +
        '<label class="fld"><span>Ornamen judul</span><select name="orn"' + dis + ">" + opt(TH_ORN, (t && t.orn) || "sparkle") + '</select></label>' +
        '<label class="fld"><span>Motif monogram</span><select name="motif"' + dis + ">" + opt(TH_MOTIF, (t && t.mono && t.mono.motif) || "sparkle") + '</select></label>' +
        '<label class="fld"><span><input type="checkbox" name="dark"' + (t && t.dark ? " checked" : "") + dis + '> Tema gelap</span></label>';
    }
    function themeCollect(f, name) {
      if (!f.th_on.checked) return null;
      var g = function (k) { return f["c_" + k].value; }, rgb = function (h) { var n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255].join(","); }, fam = TH_FONT[f.font.value] || TH_FONT.Fredoka;
      return { name: String(name).slice(0, 40), orn: f.orn.value, dark: f.dark.checked,
        ui: { ivory: g("ivory"), white: g("white"), soft: g("soft"), soft2: g("soft2"), accent: g("accent"), deep: g("deep"), ink: g("ink"), mute: g("mute"), line: g("line"), serif: fam, sans: "Inter,system-ui,sans-serif", rad: 24, btnr: 999, btnt: "none", btnls: ".02em" },
        mono: { font: fam, it: 0, paper: g("ivory"), ink: g("deep"), accent: g("accent"), gold: g("hud"), leaf: g("soft2"), hbg: "rgba(" + rgb(g("ivory")) + ",.94)", hline: g("line"), motif: f.motif.value },
        hud: { bg: "rgba(" + rgb(g("deep")) + ",.6)", acc: g("hud"), on: g("ink") }, scr: { wine: g("accent"), veil: rgb(g("ivory")) } };
    }

    /* ---------- Venue builder ---------- */
    function renderVenues(root) {
      root.innerHTML = skel();
      function load() {
        jak(function () { return sb.rpc("admin_live_venues"); }).then(function (V) {
          root.innerHTML = '<div class="lg-tool">' + (canW() ? '<button class="btn" type="button" id="vn-new">Venue baru</button>' : "") + '<span class="sub">Venue menentukan area yang bisa dikunjungi tamu dan koordinatnya. Dipakai ruangan lewat tab Monitoring.</span></div>' +
            (V.length ? '<div class="card tbl-w"><table><thead><tr><th>Venue</th><th>Template</th><th>Area</th><th>Kapasitas</th><th>Status</th><th>Ruangan</th><th></th></tr></thead><tbody>' + V.map(function (v) { return "<tr><td><b>" + esc(v.name) + '</b><span class="cell-s">' + esc(v.key) + "</span></td><td>" + esc(v.template || "-") + "</td><td>" + (v.areas || []).filter(function (a) { return a.enabled !== false; }).length + " / " + (v.areas || []).length + "</td><td>" + v.max_guests + "</td><td>" + (v.active ? '<span class="badge ok">Aktif</span>' : '<span class="badge">Nonaktif</span>') + "</td><td>" + v.rooms + '</td><td><button class="btn o" type="button" data-v="' + esc(v.id) + '">' + (canW() ? "Ubah" : "Lihat") + "</button></td></tr>"; }).join("") + "</tbody></table></div>" : empty("Belum ada venue."));
          root.onclick = function (e) { var n = e.target.closest("#vn-new"), b = e.target.closest("[data-v]"); if (n) venueDlg(null, load); else if (b) venueDlg(V.filter(function (v) { return v.id === b.getAttribute("data-v"); })[0], load); };
        }, function (e) { root.innerHTML = errBox(errText(e)); });
      }
      load();
    }
    function venueDlg(v, reload) {
      var W = canW(), dl = dialog("lg-ven"), areas = v ? JSON.parse(JSON.stringify(v.areas || [])) : [], dis = W ? "" : " disabled";
      dl.innerHTML = '<div class="dlg-h"><h2 id="lg-ven-t">' + esc(v ? v.name : "Venue baru") + "</h2>" + xBtn + '</div><form class="lg-f" id="vf" novalidate><label class="fld"><span>Nama</span><input name="name" maxlength="60" value="' + esc(v ? v.name : "") + '"' + dis + '></label><label class="fld"><span>Kunci (unik)</span><input name="key" maxlength="39" value="' + esc(v ? v.key : "") + '"' + dis + '></label><label class="fld"><span>Template</span><input name="template" maxlength="40" value="' + esc(v && v.template || "") + '"' + dis + '></label>' +
        '<label class="fld"><span>Kapasitas tamu online</span><input type="number" name="max" min="1" max="5000" value="' + esc(v ? v.max_guests : 300) + '"' + dis + '></label><label class="fld full"><span>URL background (https:// atau /)</span><input name="bg" maxlength="500" value="' + esc(v && v.background_url || "") + '"' + dis + '></label><label class="fld"><span>Urutan</span><input type="number" name="sort" value="' + esc(v ? v.sort : 0) + '"' + dis + '></label><label class="fld"><span><input type="checkbox" name="active"' + (!v || v.active ? " checked" : "") + dis + '> Aktif</span></label>' +
        themeHtml(v, dis) +
        '<div class="full"><h3 class="lg-sec">Area</h3><div class="tbl-w"><table class="lg-ar"><thead><tr><th>ID</th><th>Nama</th><th>X</th><th>Z</th><th>Ikon</th><th>Aktif</th><th></th></tr></thead><tbody id="vf-ar"></tbody></table></div>' + (W ? '<button class="btn o" type="button" id="vf-add" style="margin-top:8px">Tambah area</button>' : "") + '<p class="sub">Koordinat x dan z antara -40 dan 40. Catatan: pada tampilan Live Guest saat ini, yang diterapkan dari sini hanya nama, ikon, dan aktif/nonaktif area; letak objek pada pemandangan masih ditetapkan oleh halaman.</p><svg class="lg-map" id="vf-map" viewBox="-40 -40 80 80" role="img" aria-label="Pratinjau posisi area"></svg></div>' +
        '<div class="full lg-e" role="alert"></div>' + (W ? '<div class="full lg-btns"><button class="btn" type="submit">Simpan venue</button>' + (v && canD() ? '<button class="btn o bad" type="button" id="vf-del">Hapus</button>' : "") + "</div>" : "") + "</form>";
      function draw() {
        $("#vf-ar").innerHTML = areas.map(function (a, i) { return "<tr><td><input data-i=\"" + i + '" data-f="id" value="' + esc(a.id) + '"' + dis + '></td><td><input data-i="' + i + '" data-f="name" value="' + esc(a.name) + '"' + dis + '></td><td><input type="number" step="0.1" data-i="' + i + '" data-f="x" value="' + esc(a.x) + '"' + dis + '></td><td><input type="number" step="0.1" data-i="' + i + '" data-f="z" value="' + esc(a.z) + '"' + dis + '></td><td><input data-i="' + i + '" data-f="icon" maxlength="8" value="' + esc(a.icon || "") + '"' + dis + '></td><td><input type="checkbox" data-i="' + i + '" data-f="enabled"' + (a.enabled !== false ? " checked" : "") + dis + "></td><td>" + (W ? '<button class="btn o bad" type="button" data-del="' + i + '" aria-label="Hapus area">&times;</button>' : "") + "</td></tr>"; }).join("");
        $("#vf-map").innerHTML = '<rect x="-40" y="-40" width="80" height="80" fill="none" stroke="currentColor" opacity=".15"/><line x1="-40" y1="0" x2="40" y2="0" stroke="currentColor" opacity=".15"/><line x1="0" y1="-40" x2="0" y2="40" stroke="currentColor" opacity=".15"/>' + areas.map(function (a) { var x = Number(a.x), z = Number(a.z); if (isNaN(x) || isNaN(z)) return ""; return '<circle cx="' + x + '" cy="' + z + '" r="1.6" fill="currentColor" opacity="' + (a.enabled === false ? ".3" : "1") + '"/><text x="' + x + '" y="' + (z - 2.4) + '" font-size="3" text-anchor="middle" fill="currentColor">' + esc(a.name) + "</text>"; }).join("");
      }
      draw();
      dl.addEventListener("input", function (e) { var t = e.target, i = t.getAttribute("data-i"); if (i == null) return; var f = t.getAttribute("data-f"); areas[+i][f] = f === "enabled" ? t.checked : (f === "x" || f === "z") ? (t.value === "" ? "" : Number(t.value)) : t.value; mapOnly(); });
      function mapOnly() { var h = ""; areas.forEach(function (a) { var x = Number(a.x), z = Number(a.z); if (a.x === "" || a.z === "" || isNaN(x) || isNaN(z)) return; h += '<circle cx="' + x + '" cy="' + z + '" r="1.6" fill="currentColor" opacity="' + (a.enabled === false ? ".3" : "1") + '"/><text x="' + x + '" y="' + (z - 2.4) + '" font-size="3" text-anchor="middle" fill="currentColor">' + esc(a.name) + "</text>"; }); $("#vf-map").innerHTML = '<rect x="-40" y="-40" width="80" height="80" fill="none" stroke="currentColor" opacity=".15"/>' + h; }
      dl.addEventListener("click", function (e) {
        if (e.target.closest("#vf-add")) { areas.push({ id: "area-" + (areas.length + 1), name: "Area baru", x: 0, z: 0, icon: "📍", enabled: true }); draw(); }
        var del = e.target.closest("[data-del]"); if (del) { areas.splice(+del.getAttribute("data-del"), 1); draw(); }
        if (e.target.closest("#vf-del")) dlgConfirm("Hapus venue ini? Tidak bisa dibatalkan.", "Hapus").then(function (y) { if (y) run(jak(function () { return sb.rpc("admin_live_venue_delete", { p_id: v.id }); }), "Venue dihapus.", function () { dl.close(); reload(); }); });
      });
      $("#vf").addEventListener("submit", function (e) {
        e.preventDefault(); if (!W) return; var f = e.target.elements, er = e.target.querySelector(".lg-e"); er.textContent = "";
        if (areas.some(function (a) { return a.x === "" || a.z === "" || isNaN(Number(a.x)) || isNaN(Number(a.z)); })) { er.textContent = "Koordinat x dan z semua area harus berupa angka."; return; }
        var p = { id: v ? v.id : null, key: f.key.value.trim(), name: f.name.value.trim(), template: f.template.value.trim() || null, background_url: f.bg.value.trim() || null, max_guests: Number(f.max.value), sort: Number(f.sort.value) || 0, active: f.active.checked, event_type: f.ev.value || null, bg_pos: f.pos.value.trim() || null, nm_theme: themeCollect(f, f.name.value.trim()), areas: areas.map(function (a) { return { id: String(a.id).trim(), name: String(a.name).trim(), x: Number(a.x), z: Number(a.z), icon: String(a.icon || "").trim(), enabled: a.enabled !== false }; }) };
        jak(function () { return sb.rpc("admin_live_venue_save", { p: p }); }).then(function () { toast("Venue disimpan."); dl.close(); reload(); }, function (x) { er.textContent = errText(x); });
      });
      dl.showModal();
    }

    /* ---------- Interaksi ---------- */
    function renderInter(root) {
      root.innerHTML = skel();
      function load() {
        jak(function () { return sb.rpc("admin_live_interactions"); }).then(function (R) {
          root.innerHTML = '<div class="lg-tool">' + (canW() ? '<button class="btn" type="button" id="it-new">Interaksi baru</button>' : "") + '<span class="sub">Sapa dan reaksi yang tersedia untuk tamu. Jeda mencegah spam per tamu.</span></div>' + (R.length ? '<div class="card tbl-w"><table><thead><tr><th></th><th>Nama</th><th>Jenis</th><th>Jeda</th><th>Dipakai 7 hari</th><th>Status</th><th></th></tr></thead><tbody>' + R.map(function (r) { return '<tr><td style="font-size:1.4rem">' + esc(r.emoji) + "</td><td><b>" + esc(r.label) + '</b><span class="cell-s">' + esc(r.key) + "</span></td><td>" + esc(r.kind) + "</td><td>" + r.cooldown_seconds + " dtk</td><td>" + r.uses_7d + "</td><td>" + (r.enabled ? '<span class="badge ok">Aktif</span>' : '<span class="badge">Nonaktif</span>') + "</td><td>" + (canW() ? '<div class="lg-btns"><button class="btn o" type="button" data-e="' + esc(r.key) + '">Ubah</button>' + (canD() ? '<button class="btn o bad" type="button" data-x="' + esc(r.key) + '">Hapus</button>' : "") + "</div>" : "") + "</td></tr>"; }).join("") + "</tbody></table></div>" : empty("Belum ada interaksi."));
          root.onclick = function (e) {
            var n = e.target.closest("#it-new"), b = e.target.closest("[data-e]"), x = e.target.closest("[data-x]");
            if (x) return dlgConfirm("Hapus interaksi ini?", "Hapus").then(function (y) { if (y) run(jak(function () { return sb.rpc("admin_live_interaction_delete", { p_key: x.getAttribute("data-x") }); }), "Interaksi dihapus.", load); });
            if (!n && !b) return; var r = b ? R.filter(function (z) { return z.key === b.getAttribute("data-e"); })[0] : { key: "", label: "", emoji: "", kind: "reaksi", cooldown_seconds: 3, sort: 0, enabled: true };
            ask(b ? "Ubah interaksi" : "Interaksi baru", "", [{ k: "key", l: "Kunci (huruf kecil/angka/_)", val: r.key, max: 24 }, { k: "label", l: "Nama", val: r.label, max: 40 }, { k: "emoji", l: "Emoji", val: r.emoji, max: 8 }, { k: "kind", l: "Jenis", opts: [["reaksi", "Reaksi"], ["sapa", "Sapa"]] }, { k: "cd", l: "Jeda (detik)", num: 1, val: r.cooldown_seconds, max: 3 }, { k: "sort", l: "Urutan", num: 1, val: r.sort, max: 4 }, { k: "en", l: "Status", opts: [["1", "Aktif"], ["0", "Nonaktif"]] }], "Simpan").then(function (v) {
              if (!v) return; run(jak(function () { return sb.rpc("admin_live_interaction_save", { p_key: v.key, p_label: v.label, p_emoji: v.emoji, p_kind: v.kind, p_enabled: v.en === "1", p_cooldown: Number(v.cd), p_sort: Number(v.sort) || 0 }); }), "Interaksi disimpan.", load);
            });
            setTimeout(function () { var s = d.querySelector('#lg-ask [name=kind]'); if (s) s.value = r.kind; var q = d.querySelector('#lg-ask [name=en]'); if (q) q.value = r.enabled ? "1" : "0"; if (b) d.querySelector('#lg-ask [name=key]').readOnly = true; }, 0);
          };
        }, function (e) { root.innerHTML = errBox(errText(e)); });
      }
      load();
    }

    /* ---------- Mini game ---------- */
    function renderGames(root) {
      root.innerHTML = skel();
      function load() {
        jak(function () { return sb.rpc("admin_live_games"); }).then(function (G) {
          root.innerHTML = '<div class="lg-tool">' + (canW() ? '<button class="btn" type="button" id="gm-new">Game baru</button>' : "") + '<span class="sub">Kuis: skor dihitung server dari jawaban. Tap dan Memory: skor dikirim aplikasi dan hanya dibatasi poin maksimum (tidak bisa diverifikasi server).</span></div>' + (G.length ? '<div class="card tbl-w"><table><thead><tr><th>Game</th><th>Jenis</th><th>Poin maks</th><th>Pemain</th><th>Main</th><th>Status</th><th></th></tr></thead><tbody>' + G.map(function (g) { return "<tr><td><b>" + esc(g.name) + '</b><span class="cell-s">' + esc(g.key) + "</span></td><td>" + esc(g.kind) + "</td><td>" + g.points_max + "</td><td>" + g.players + "</td><td>" + g.plays + "</td><td>" + (g.enabled ? '<span class="badge ok">Aktif</span>' : '<span class="badge">Nonaktif</span>') + '</td><td><div class="lg-btns"><button class="btn o" type="button" data-g="' + esc(g.id) + '">' + (canW() ? "Ubah" : "Lihat") + '</button><button class="btn o" type="button" data-s="' + esc(g.id) + '">Skor</button></div></td></tr>'; }).join("") + "</tbody></table></div>" : empty("Belum ada mini game."));
          root.onclick = function (e) {
            var n = e.target.closest("#gm-new"), b = e.target.closest("[data-g]"), s = e.target.closest("[data-s]");
            if (s) return jak(function () { return sb.rpc("admin_live_game_scores", { p_game: s.getAttribute("data-s") }); }).then(function (R) { var dl = dialog("lg-sc"); dl.innerHTML = '<div class="dlg-h"><h2 id="lg-sc-t">Papan skor</h2>' + xBtn + "</div>" + (R.length ? '<div class="tbl-w"><table><thead><tr><th>#</th><th>Tamu</th><th>Undangan</th><th>Skor</th><th>Main</th></tr></thead><tbody>' + R.map(function (r, i) { return "<tr><td>" + (i + 1) + "</td><td>" + esc(r.name) + "</td><td>" + esc(r.invitation) + "</td><td>" + r.score + "</td><td>" + r.plays + "</td></tr>"; }).join("") + "</tbody></table></div>" : '<p class="sub">Belum ada skor.</p>'); dl.showModal(); }, function (x) { toast(errText(x), "bad"); });
            if (n) gameDlg(null, load); else if (b) gameDlg(G.filter(function (g) { return g.id === b.getAttribute("data-g"); })[0], load);
          };
        }, function (e) { root.innerHTML = errBox(errText(e)); });
      }
      load();
    }
    function gameDlg(g, reload) {
      var W = canW(), dl = dialog("lg-gm"), dis = W ? "" : " disabled", qs = g && g.kind === "trivia" ? JSON.parse(JSON.stringify((g.config || {}).questions || [])) : [{ q: "", options: ["", ""], answer: 0 }];
      dl.innerHTML = '<div class="dlg-h"><h2 id="lg-gm-t">' + esc(g ? g.name : "Game baru") + "</h2>" + xBtn + '</div><form class="lg-f" id="gf" novalidate><label class="fld"><span>Nama</span><input name="name" maxlength="60" value="' + esc(g ? g.name : "") + '"' + dis + '></label><label class="fld"><span>Kunci (unik)</span><input name="key" maxlength="39" value="' + esc(g ? g.key : "") + '"' + dis + '></label><label class="fld"><span>Jenis</span><select name="kind"' + (g ? " disabled" : "") + '><option value="trivia">Kuis (trivia)</option><option value="tap">Tap cepat</option><option value="memory">Memory</option></select></label><label class="fld"><span>Poin maksimum</span><input type="number" name="pts" min="1" max="10000" value="' + esc(g ? g.points_max : 100) + '"' + dis + '></label><label class="fld"><span>Urutan</span><input type="number" name="sort" value="' + esc(g ? g.sort : 0) + '"' + dis + '></label><label class="fld"><span><input type="checkbox" name="en"' + (g && g.enabled ? " checked" : "") + dis + '> Aktif untuk tamu</span></label>' +
        '<div class="full" id="gf-x"></div><div class="full lg-e" role="alert"></div>' + (W ? '<div class="full lg-btns"><button class="btn" type="submit">Simpan game</button>' + (g && canD() ? '<button class="btn o bad" type="button" id="gf-del">Hapus</button>' : "") + "</div>" : "") + "</form>";
      var f = $("#gf"); f.elements.kind.value = g ? g.kind : "trivia";
      function sync() {
        var k = f.elements.kind.value, c = (g && g.config) || {};
        if (k === "trivia") {
          $("#gf-x").innerHTML = '<h3 class="lg-sec">Soal</h3>' + qs.map(function (q, i) { return '<div class="lg-q"><label class="fld"><span>Soal ' + (i + 1) + '</span><input data-q="' + i + '" data-f="q" maxlength="200" value="' + esc(q.q) + '"' + dis + '></label>' + q.options.map(function (o, j) { return '<div class="lg-btns" style="margin-top:6px"><input type="radio" name="ans' + i + '" data-q="' + i + '" data-f="answer" value="' + j + '"' + (q.answer === j ? " checked" : "") + dis + ' aria-label="Jawaban benar"><input data-q="' + i + '" data-o="' + j + '" maxlength="100" value="' + esc(o) + '" placeholder="Pilihan ' + (j + 1) + '" style="flex:1;min-width:0"' + dis + '></div>'; }).join("") + (W ? '<div class="lg-btns" style="margin-top:8px"><button class="btn o" type="button" data-addo="' + i + '">Tambah pilihan</button><button class="btn o bad" type="button" data-delq="' + i + '">Hapus soal</button></div>' : "") + "</div>"; }).join("") + (W ? '<button class="btn o" type="button" id="gf-aq">Tambah soal</button>' : "") + '<p class="sub">Pilih bulatan pada jawaban yang benar. Kunci jawaban tidak pernah dikirim ke tamu.</p>';
        } else if (k === "tap") $("#gf-x").innerHTML = '<label class="fld"><span>Durasi (detik, 5 sampai 120)</span><input type="number" name="seconds" value="' + esc(c.seconds || 20) + '"' + dis + "></label>";
        else $("#gf-x").innerHTML = '<label class="fld"><span>Jumlah pasang kartu (2 sampai 12)</span><input type="number" name="pairs" value="' + esc(c.pairs || 6) + '"' + dis + "></label>";
      }
      sync(); f.elements.kind.addEventListener("change", sync);
      dl.addEventListener("input", function (e) { var t = e.target, i = t.getAttribute("data-q"); if (i == null) return; if (t.getAttribute("data-o") != null) qs[+i].options[+t.getAttribute("data-o")] = t.value; else if (t.getAttribute("data-f") === "answer") qs[+i].answer = Number(t.value); else qs[+i].q = t.value; });
      dl.addEventListener("click", function (e) {
        var a = e.target.closest("[data-addo]"), dq = e.target.closest("[data-delq]");
        if (a && qs[+a.getAttribute("data-addo")].options.length < 6) { qs[+a.getAttribute("data-addo")].options.push(""); sync(); }
        if (dq) { qs.splice(+dq.getAttribute("data-delq"), 1); sync(); }
        if (e.target.closest("#gf-aq") && qs.length < 20) { qs.push({ q: "", options: ["", ""], answer: 0 }); sync(); }
        if (e.target.closest("#gf-del")) dlgConfirm("Hapus game ini beserta skornya?", "Hapus").then(function (y) { if (y) run(jak(function () { return sb.rpc("admin_live_game_delete", { p_id: g.id }); }), "Game dihapus.", function () { dl.close(); reload(); }); });
      });
      f.addEventListener("submit", function (e) {
        e.preventDefault(); if (!W) return; var er = f.querySelector(".lg-e"); er.textContent = ""; var k = f.elements.kind.value, cfg;
        if (k === "trivia") cfg = { questions: qs.map(function (q) { return { q: q.q.trim(), options: q.options.map(function (o) { return o.trim(); }), answer: q.answer }; }) };
        else if (k === "tap") cfg = { seconds: Number(f.elements.seconds.value) }; else cfg = { pairs: Number(f.elements.pairs.value) };
        if (k === "trivia" && cfg.questions.some(function (q) { return !q.q || q.options.some(function (o) { return !o; }); })) { er.textContent = "Semua soal dan pilihan harus diisi."; return; }
        jak(function () { return sb.rpc("admin_live_game_save", { p: { id: g ? g.id : null, key: f.elements.key.value.trim(), name: f.elements.name.value.trim(), kind: k, enabled: f.elements.en.checked, points_max: Number(f.elements.pts.value), sort: Number(f.elements.sort.value) || 0, config: cfg } }); }).then(function () { toast("Game disimpan."); dl.close(); reload(); }, function (x) { er.textContent = errText(x); });
      });
      dl.showModal();
    }

    /* ---------- Moderasi chat ---------- */
    function renderChat(root) {
      var S = { page: 0, st: "pending", q: "" };
      root.innerHTML = '<div class="lg-tool"><label class="fld"><span>Cari</span><input type="search" id="ch-q" placeholder="Isi pesan atau nama"></label><label class="fld"><span>Status</span><select id="ch-s"><option value="pending">Menunggu</option><option value="">Semua</option><option value="hidden">Disembunyikan otomatis</option><option value="visible">Tampil</option><option value="removed">Dihapus</option></select></label>' + (canW() ? '<button class="btn o" type="button" id="ch-w">Kata terlarang</button>' : "") + '</div><div id="ch-t"></div><div class="lg-pg"></div>';
      function load() {
        var t = $("#ch-t"); t.innerHTML = skel();
        jak(function () { return sb.rpc("admin_live_chat", { p_status: S.st || null, p_q: S.q || null, p_limit: PAGE, p_offset: S.page * PAGE }); }).then(function (r) {
          var rows = r.rows || [];
          t.innerHTML = rows.length ? '<div class="card tbl-w"><table><thead><tr><th>Pesan</th><th>Tamu</th><th>Status</th><th>Waktu</th><th></th></tr></thead><tbody>' + rows.map(function (m) { return "<tr><td>" + esc(m.body) + (m.auto_flag ? ' <span class="badge warn">' + esc(FLAG[m.auto_flag] || m.auto_flag) + "</span>" : "") + (m.note ? '<span class="cell-s">Catatan: ' + esc(m.note) + "</span>" : "") + "</td><td>" + esc(m.guest_name) + '<span class="cell-s">' + esc(m.invitation) + "</span></td><td>" + bd(CST, m.status) + "</td><td>" + esc(wib(m.created_at)) + "</td><td>" + (canW() ? '<div class="lg-btns">' + (m.status !== "visible" && m.status !== "removed" ? '<button class="btn" type="button" data-a="approve" data-id="' + esc(m.id) + '">Tampilkan</button>' : "") + (m.status === "visible" || m.status === "pending" ? '<button class="btn o" type="button" data-a="hide" data-id="' + esc(m.id) + '">Sembunyikan</button>' : "") + (m.status !== "removed" ? '<button class="btn o bad" type="button" data-a="remove" data-id="' + esc(m.id) + '">Hapus</button>' : "") + "</div>" : "") + "</td></tr>"; }).join("") + "</tbody></table></div>" : empty("Tidak ada pesan.");
          pager(root, S, r.total || 0, load);
        }, function (e) { t.innerHTML = errBox(errText(e)); });
      }
      var tm; $("#ch-q").addEventListener("input", function (e) { clearTimeout(tm); tm = setTimeout(function () { S.q = e.target.value; S.page = 0; load(); }, 300); });
      $("#ch-s").addEventListener("change", function (e) { S.st = e.target.value; S.page = 0; load(); });
      var wb = $("#ch-w"); if (wb) wb.addEventListener("click", wordsDlg);
      root.addEventListener("click", function (e) {
        var b = e.target.closest("[data-a]"); if (!b || !b.getAttribute("data-id")) return; var id = b.getAttribute("data-id"), a = b.getAttribute("data-a");
        if (a === "approve") run(jak(function () { return sb.rpc("admin_live_chat_mod", { p_id: id, p_action: "approve" }); }), "Pesan ditampilkan.", load);
        else ask(a === "hide" ? "Sembunyikan pesan" : "Hapus pesan", "Pesan tidak akan terlihat tamu lain.", [{ k: "r", l: "Alasan", min: 3 }], a === "hide" ? "Sembunyikan" : "Hapus", "bad").then(function (v) { if (v) run(jak(function () { return sb.rpc("admin_live_chat_mod", { p_id: id, p_action: a, p_note: v.r }); }), "Pesan dimoderasi.", load); });
      });
      load();
    }
    function wordsDlg() {
      var dl = dialog("lg-w");
      function show() {
        jak(function () { return sb.rpc("admin_live_words"); }).then(function (W) {
          dl.innerHTML = '<div class="dlg-h"><h2 id="lg-w-t">Kata terlarang</h2>' + xBtn + '</div><p class="sub">Pesan yang memuat kata ini disembunyikan otomatis dan masuk antrean moderasi. Pesan berisi tautan juga disembunyikan.</p><form class="lg-tool" id="wf"><label class="fld"><span>Tambah kata</span><input name="w" maxlength="40"></label><button class="btn" type="submit">Tambah</button></form><div class="lg-e" id="wf-e" role="alert"></div><div class="lg-btns">' + (W.length ? W.map(function (w) { return '<button class="btn o" type="button" data-rm="' + esc(w) + '" title="Hapus">' + esc(w) + " &times;</button>"; }).join("") : '<span class="sub">Belum ada kata.</span>') + "</div>";
          if (!dl.open) dl.showModal();
          $("#wf").addEventListener("submit", function (e) { e.preventDefault(); var v = e.target.elements.w.value; jak(function () { return sb.rpc("admin_live_word_set", { p_word: v, p_on: true }); }).then(show, function (x) { $("#wf-e").textContent = errText(x); }); });
          dl.querySelectorAll("[data-rm]").forEach(function (b) { b.addEventListener("click", function () { jak(function () { return sb.rpc("admin_live_word_set", { p_word: b.getAttribute("data-rm"), p_on: false }); }).then(show, function (x) { toast(errText(x), "bad"); }); }); });
        }, function (e) { toast(errText(e), "bad"); });
      }
      show();
    }

    /* ---------- Analitik ---------- */
    function renderStats(root) {
      var days = 30;
      root.innerHTML = '<div class="lg-tool"><label class="fld"><span>Rentang</span><select id="an-r"><option value="7">7 hari</option><option value="30" selected>30 hari</option><option value="90">90 hari</option></select></label></div><div id="an-b"></div>';
      function load() {
        var b = $("#an-b"); b.innerHTML = skel(); var to = new Date(Date.now() + 864e5), from = new Date(to.getTime() - (days + 1) * 864e5);
        jak(function () { return sb.rpc("admin_live_analytics", { p_from: from.toISOString(), p_to: to.toISOString() }); }).then(function (a) {
          var mx = Math.max.apply(null, [1].concat((a.daily || []).map(function (x) { return x.joins; })));
          b.innerHTML = '<div class="lg-cards">' + card("Tamu masuk", a.joins) + card("Tamu unik", a.unique_guests) + card("Ruangan aktif", a.rooms) + card("Interaksi", a.interactions) + card("Pesan chat", a.chat_total, a.chat_hidden + " disembunyikan/dihapus") + card("Game dimainkan", a.game_plays) + "</div>" +
            '<h3 class="lg-sec">Harian (WIB)</h3>' + ((a.daily || []).length ? '<div class="card tbl-w"><table><thead><tr><th>Tanggal</th><th>Masuk</th><th></th><th>Interaksi</th></tr></thead><tbody>' + a.daily.map(function (x) { return "<tr><td>" + esc(x.day) + "</td><td>" + x.joins + '</td><td><span class="lg-bar" style="width:' + Math.round(x.joins / mx * 160) + 'px"></span></td><td>' + x.interactions + "</td></tr>"; }).join("") + "</tbody></table></div>" : '<p class="sub">Belum ada aktivitas pada rentang ini.</p>') +
            '<h3 class="lg-sec">Interaksi terpopuler</h3>' + ((a.by_interaction || []).length ? '<div class="card tbl-w"><table><thead><tr><th>Interaksi</th><th>Jumlah</th></tr></thead><tbody>' + a.by_interaction.map(function (x) { return "<tr><td>" + esc(x.label) + "</td><td>" + x.n + "</td></tr>"; }).join("") + "</tbody></table></div>" : '<p class="sub">Belum ada.</p>') +
            '<h3 class="lg-sec">Ruangan teratas</h3>' + ((a.top_rooms || []).length ? '<div class="card tbl-w"><table><thead><tr><th>Undangan</th><th>Masuk</th><th>Tamu unik</th></tr></thead><tbody>' + a.top_rooms.map(function (x) { return "<tr><td>" + esc(x.title) + "</td><td>" + x.joins + "</td><td>" + x.guests + "</td></tr>"; }).join("") + "</tbody></table></div>" : '<p class="sub">Belum ada.</p>');
        }, function (e) { b.innerHTML = errBox(errText(e)); });
      }
      $("#an-r").addEventListener("change", function (e) { days = +e.target.value; load(); });
      load();
    }

    /* ---------- Pengaturan fitur ---------- */
    function renderSet(root) {
      root.innerHTML = skel();
      Promise.all([jak(function () { return sb.rpc("admin_live_settings_get"); }), jak(function () { return sb.rpc("admin_live_venues"); })]).then(function (r) {
        var s = r[0], V = r[1], W = canW(), dis = W ? "" : " disabled", ck = function (k, l, h) { return '<label class="fld full"><span><input type="checkbox" name="' + k + '"' + (s[k] ? " checked" : "") + dis + "> " + l + "</span>" + (h ? '<small class="sub">' + h + "</small>" : "") + "</label>"; };
        root.innerHTML = '<form class="lg-f" id="sf" novalidate>' + ck("enabled", "Aktifkan Live Guest", "Bila mati, tamu tidak bisa masuk ke ruangan mana pun.") + ck("music", "Musik latar") + ck("qris", "QRIS hadiah pengantin") + ck("gallery", "Area Galeri Foto") + ck("guestbook", "Area Buku Tamu") +
          '<label class="fld"><span>Venue bawaan</span><select name="default_theme"' + dis + ">" + V.map(function (v) { return '<option value="' + esc(v.key) + '"' + (v.key === s.default_theme ? " selected" : "") + ">" + esc(v.name) + "</option>"; }).join("") + '</select></label><label class="fld"><span>Batas tamu online per ruangan (bawaan)</span><input type="number" name="max_guests" min="1" max="5000" value="' + esc(s.max_guests) + '"' + dis + '></label><div class="full lg-e" role="alert"></div>' + (W ? '<div class="full lg-btns"><button class="btn" type="submit">Simpan pengaturan</button></div>' : '<p class="full sub">Anda hanya punya akses baca.</p>') + "</form>";
        $("#sf").addEventListener("submit", function (e) {
          e.preventDefault(); if (!W) return; var f = e.target.elements, mx = String(f.max_guests.value).trim();
          if (mx === "" || isNaN(Number(mx))) { e.target.querySelector(".lg-e").textContent = "Isi batas tamu dengan angka."; return; }
          var o = { enabled: f.enabled.checked, music: f.music.checked, qris: f.qris.checked, gallery: f.gallery.checked, guestbook: f.guestbook.checked, default_theme: f.default_theme.value, max_guests: Number(mx) };
          var go = function () { run(jak(function () { return sb.rpc("admin_live_settings_save", { p_vals: o }); }), "Pengaturan disimpan."); };
          if (!o.enabled && s.enabled) dlgConfirm("Matikan Live Guest untuk semua undangan?", "Matikan").then(function (y) { if (y) go(); }); else go();
        });
      }, function (e) { root.innerHTML = errBox(errText(e)); });
    }

    var m = M.filter(function (x) { return x.key === "live"; })[0];
    if (m) {
      var keep = function (k) { return (m.tabs || []).filter(function (t) { return t.key === k; })[0]; };
      var T = function (k, l, r) { return { key: k, label: l, render: r }; };
      m.tabs = [T("rooms", "Monitoring Ruangan", renderRooms), T("venue", "Venue Builder", renderVenues), keep("avatar"), keep("background"), keep("asset3d"), T("inter", "Interaksi", renderInter), T("games", "Mini Game", renderGames), T("chat", "Moderasi Chat", renderChat), T("stats", "Analitik", renderStats), T("cfg", "Pengaturan Fitur", renderSet), keep("theme")].filter(Boolean);
    }
  });
})();
