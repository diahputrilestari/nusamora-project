# Uji UI jembatan Live Guest (live/live-bridge.js) pada halaman ASLI live/index.html.
# three.js dan server ditiru di browser (three.js tidak tersedia di sandbox; objek tiruan menerima semua panggilan). Logika data diuji di ops/tests/admin-live.test.sql.
import http.server, socketserver, threading, os, json
from playwright.sync_api import sync_playwright
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
    def translate_path(self, p):
        p = p.split("?")[0]; p = {"/live/": "/live/index.html", "/live/jawa-tengah": "/live/jawa-tengah.html"}.get(p, p)
        return os.path.join(ROOT, p.lstrip("/"))
srv = socketserver.TCPServer(("127.0.0.1", 0), Q); BASE = "http://127.0.0.1:%d" % srv.server_address[1]
threading.Thread(target=srv.serve_forever, daemon=True).start()
ok_n = bad_n = 0
def chk(n, c, d=""):
    global ok_n, bad_n
    if c: ok_n += 1; print("PASS", n)
    else: bad_n += 1; print("FAIL", n, d)
TOK = "a" * 32
import base64
PNG1 = base64.b64decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==")
THREE = r"""(function(){var f=function(){};var P=new Proxy(f,{get:function(t,k){if(k===Symbol.toPrimitive)return function(){return 0};if(k==='then')return undefined;if(k==='valueOf')return function(){return 0};if(k==='toString')return function(){return '0'};return P},apply:function(){return P},construct:function(){return P},set:function(){return true}});window.THREE=P})();"""
CONFIGJS = "window.NM_CONFIG={SUPABASE_URL:'https://stub.supabase.co',SUPABASE_ANON_KEY:'anon-stub',SITE_URL:'http://x'};"
BASE_CFG = {"enabled": True, "features": {"music": True, "qris": True, "gallery": True, "guestbook": False},
  "room": {"status": "open", "chat_mode": "open", "slow_seconds": 3, "max_guests": 50, "online": 7},
  "venue": {"key": "romantic-garden", "name": "RG", "template": "romantic-garden", "background_url": None, "areas": [
    {"id": "stage", "name": "Panggung Baru", "x": 1, "z": -20, "icon": "💒", "enabled": True}, {"id": "galeri", "name": "Galeri Baru", "x": 5, "z": -8, "icon": "📷", "enabled": True},
    {"id": "buku", "name": "Buku Tamu", "x": 0, "z": 6.5, "icon": "📖", "enabled": True}, {"id": "tidak-dikenal", "name": "Asing", "x": 0, "z": 0, "icon": "?", "enabled": True}]},
  "interactions": [{"key": "sapa", "label": "Sapa", "emoji": "👋", "kind": "sapa", "cooldown_seconds": 5}, {"key": "cinta", "label": "Cinta", "emoji": "❤️", "kind": "reaksi", "cooldown_seconds": 2}],
  "games": [{"key": "kuis", "name": "Kuis Pengantin", "kind": "trivia", "points_max": 100, "config": {"questions": [{"q": "Warna?", "options": ["Merah", "Biru"]}, {"q": "Kota?", "options": ["Solo", "Bandung"]}]}},
            {"key": "mem", "name": "Memory", "kind": "memory", "points_max": 50, "config": {}}], "avatars": []}
def newpage(b, cfg=None, join=None, hb=None, chat=None, token=TOK, listing=None):
    ctx = b.new_context(viewport={"width": 1280, "height": 800}); pg = ctx.new_page(); errs = []; calls = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.route("**/three.min.js", lambda r: r.fulfill(status=200, content_type="text/javascript", body=THREE))
    pg.route("**/assets/config.js", lambda r: r.fulfill(status=200, content_type="text/javascript", body=CONFIGJS))
    pg.route("**/fonts.g*/**", lambda r: r.abort())
    state = {"chat": listing or []}
    def rpc(r):
        name = r.request.url.split("/rpc/")[1]; body = json.loads(r.request.post_data or "{}"); calls.append((name, body)); out = None
        if name == "live_config": out = cfg
        elif name == "live_join": out = join or {"ok": True, "online": 8}
        elif name == "live_heartbeat": out = hb if hb is not None else 9
        elif name == "live_interact": out = {"ok": True}
        elif name == "live_chat_send": out = chat or {"ok": True, "id": "m1", "status": "visible"}
        elif name == "live_chat_list": out = state["chat"]
        elif name == "live_game_submit": out = {"ok": True, "score": 50, "best": 100}
        elif name == "live_leaderboard": out = [{"name": "Budi", "score": 100}]
        elif name == "live_theme": out = state.get("theme")
        elif name == "live_sync": out = state.get("sync")
        elif name == "live_leave": out = True
        r.fulfill(status=200, content_type="application/json", body=json.dumps(out), headers={"access-control-allow-origin": "*"})
    pg.route("**/rest/v1/rpc/**", rpc)
    pg.route("**/rest/v1/rpc/**", rpc)
    return ctx, pg, errs, calls, state
def enter(pg, path="/live/"):
    pg.goto(BASE + path + ("?t=" + TOK if "?" not in path else "")); pg.wait_for_selector("#n1"); pg.click("#n1"); pg.fill("#nm", "Budi Uji"); pg.click("#go")
def cn(calls, n): return [c[1] for c in calls if c[0] == n]
with sync_playwright() as pw:
    b = pw.chromium.launch()
    # 1. demo tanpa token: tidak ada panggilan jaringan, bot demo tetap ada
    ctx, pg, errs, calls, st = newpage(b, BASE_CFG)
    pg.goto(BASE + "/live/"); pg.wait_for_selector("#n1"); pg.click("#n1"); pg.fill("#nm", "Budi Uji"); pg.click("#go"); pg.wait_for_function("typeof P!=='undefined'&&P&&bots.length>0"); pg.wait_for_timeout(1500)
    chk("demo (tanpa token): tidak ada panggilan RPC", len(calls) == 0, calls)
    chk("demo: bot demo dan daftar 8 area tetap", pg.evaluate("bots.length") > 0 and pg.evaluate("AREAS.length") == 8)
    ctx.close()
    # 2. token tidak valid / fitur mati
    ctx, pg, errs, calls, st = newpage(b, None); pg.goto(BASE + "/live/?t=" + TOK); pg.wait_for_selector("#nmb-block")
    chk("token tidak valid: pesan + tombol lanjut nonaktif", "tidak berlaku" in pg.inner_text("#nmb-block") and pg.locator("#n1:disabled").count() == 1); ctx.close()
    ctx, pg, errs, calls, st = newpage(b, dict(BASE_CFG, enabled=False)); pg.goto(BASE + "/live/?t=" + TOK); pg.wait_for_selector("#nmb-block")
    chk("fitur dimatikan: pesan", "dimatikan" in pg.inner_text("#nmb-block")); ctx.close()
    ctx, pg, errs, calls, st = newpage(b, BASE_CFG); pg.goto(BASE + "/live/?t=bukan-token"); pg.wait_for_selector("#n1"); pg.wait_for_timeout(500)
    chk("token berformat salah: jembatan tidak aktif (demo)", len(calls) == 0); ctx.close()
    # 3. ditolak saat masuk
    for reason, kata in (("penuh", "penuh"), ("ruangan_ditutup", "ditutup"), ("diblokir", "diblokir")):
        ctx, pg, errs, calls, st = newpage(b, BASE_CFG, join={"ok": False, "reason": reason}); enter(pg); pg.wait_for_selector("#nmb-block", timeout=15000)
        chk("masuk ditolak: " + reason, kata in pg.inner_text("#nmb-block")); ctx.close()
    # 4. alur normal
    ctx, pg, errs, calls, st = newpage(b, BASE_CFG); pg.clock.install(); enter(pg); pg.wait_for_function("typeof P!=='undefined'&&P"); pg.clock.run_for(1500)
    pg.wait_for_function("window.__j||true")
    chk("konfigurasi: area dari admin diterapkan, area tak dikenal diabaikan, area di luar daftar dibuang", pg.evaluate("AREAS.map(a=>a.id).join()") == "stage,galeri", pg.evaluate("AREAS.map(a=>a.id).join()"))
    chk("konfigurasi: nama area diterapkan, koordinat tidak diubah", pg.evaluate("AREAS.find(a=>a.id=='stage').n") == "Panggung Baru" and pg.evaluate("AREAS.find(a=>a.id=='stage').z") == -27)
    chk("fitur buku tamu mati & area dimatikan: tombol menu disembunyikan, yang aktif tetap", pg.evaluate("(()=>{const v=t=>[...document.querySelectorAll('#ml button')].filter(b=>b.textContent.trim()==t).map(b=>b.style.display);return v('Buku Tamu')[0]=='none'&&v('Video')[0]=='none'&&v('Galeri')[0]!='none'&&v('Panggung')[0]!='none'})()"))
    chk("masuk ke ruangan dipanggil dengan token", cn(calls, "live_join") == [{"p_token": TOK}], calls)
    chk("bot demo dibuang dan jumlah online dari server", pg.evaluate("bots.length") == 0 and pg.inner_text("#cnt") == "8")
    chk("bar reaksi dibangun dari konfigurasi admin", pg.locator("#rxs button").count() == 2 and pg.locator("#rxs button").nth(1).inner_text().startswith("❤️"))
    pg.locator("#rxs button").nth(1).click(); pg.wait_for_function("1"); pg.clock.run_for(200)
    chk("klik reaksi memanggil live_interact", {"p_token": TOK, "p_key": "cinta"} in cn(calls, "live_interact"), calls)
    pg.fill("#ci", "Selamat ya!"); pg.click("#sb"); pg.clock.run_for(200)
    chk("kirim chat memanggil live_chat_send & tampil di log", cn(calls, "live_chat_send") == [{"p_token": TOK, "p_body": "Selamat ya!"}] and "Selamat ya!" in pg.inner_text("#log"), pg.inner_text("#log"))
    st["chat"] = [{"id": "x1", "name": "Ani <img src=x onerror=window.__xss=1>", "body": "Halo <b>semua</b>", "status": "visible", "created_at": "2026-11-09T01:00:00Z"}, {"id": "m1", "name": "Budi", "body": "Selamat ya!", "status": "visible", "created_at": "2026-11-09T01:00:01Z"}]
    pg.clock.run_for(3500); pg.wait_for_function("document.querySelector('#log').innerText.includes('Halo')")
    lg = pg.inner_text("#log")
    chk("pesan tamu lain tampil tanpa dieksekusi sebagai HTML; pesan sendiri tidak ganda", pg.evaluate("window.__xss") is None and "<b>semua</b>" in lg and lg.count("Selamat ya!") == 1, lg)
    # game
    pg.wait_for_selector("#nmb-gm", state="attached"); pg.evaluate("document.querySelector('#nmb-gm').click()"); pg.wait_for_selector("[data-nmb=play]")
    chk("hanya game yang didukung (kuis) yang tampil", pg.locator("[data-nmb=play]").count() == 1)
    pg.click("[data-nmb=play]"); pg.wait_for_selector("[data-nmb=ans]"); pg.locator("[data-nmb=ans]").nth(1).click(); pg.wait_for_selector("[data-nmb=ans]"); pg.locator("[data-nmb=ans]").nth(0).click()
    pg.wait_for_function("document.body.innerText.includes('Papan skor')")
    chk("jawaban kuis dikirim ke server; papan skor tampil", cn(calls, "live_game_submit") == [{"p_token": TOK, "p_game": "kuis", "p_answers": [1, 0]}] and "Budi — 100" in pg.inner_text("#bx"), cn(calls, "live_game_submit"))
    pg.keyboard.press("Escape")
    pg.clock.run_for(31000)
    chk("heartbeat tiap 30 detik", len(cn(calls, "live_heartbeat")) >= 1 and pg.inner_text("#cnt") == "9")
    ctx.close()
    # 5. pesan menunggu / ditolak, heartbeat -1
    ctx, pg, errs, calls, st = newpage(b, BASE_CFG, chat={"ok": True, "id": "p1", "status": "pending"}); pg.clock.install(); enter(pg); pg.wait_for_function("typeof P!=='undefined'&&P"); pg.clock.run_for(1500)
    pg.fill("#ci", "tunggu"); pg.click("#sb"); pg.clock.run_for(200)
    chk("mode moderasi: pemberitahuan menunggu, belum tampil di log", "menunggu persetujuan" in pg.inner_text("#nmb-toast") and "tunggu" not in pg.inner_text("#log"))
    st["chat"] = [{"id": "p1", "name": "Budi", "body": "tunggu", "status": "visible", "created_at": "2026-11-09T01:00:00Z"}]; pg.clock.run_for(3500)
    chk("setelah disetujui, pesan sendiri muncul sekali", pg.inner_text("#log").count("tunggu") == 1, pg.inner_text("#log"))
    ctx.close()
    ctx, pg, errs, calls, st = newpage(b, BASE_CFG, chat={"ok": False, "reason": "dibisukan"}); pg.clock.install(); enter(pg); pg.wait_for_function("typeof P!=='undefined'&&P"); pg.clock.run_for(1500)
    pg.fill("#ci", "halo"); pg.click("#sb"); pg.clock.run_for(200)
    chk("dibisukan: pesan galat & teks dikembalikan ke kolom", "dibisukan" in pg.inner_text("#nmb-toast") and pg.input_value("#ci") == "halo"); ctx.close()
    ctx, pg, errs, calls, st = newpage(b, BASE_CFG, hb=-1); pg.clock.install(); enter(pg); pg.wait_for_function("typeof P!=='undefined'&&P"); pg.clock.run_for(1500); pg.clock.run_for(31000)
    chk("heartbeat -1 (dikeluarkan): layar blokir", pg.locator("#nmb-block").count() == 1 and "keluar" in pg.inner_text("#nmb-block")); ctx.close()
    # 5b. tamu lain di scene
    ctx, pg, errs, calls, st = newpage(b, BASE_CFG); pg.clock.install(); enter(pg); pg.wait_for_function("typeof P!=='undefined'&&P"); pg.clock.run_for(1500)
    n0 = pg.evaluate("ents.length"); l0 = pg.locator("#lbls > *").count()
    chk("sinkron: posisi & avatar sendiri dikirim", len(cn(calls, "live_sync")) >= 1 and set(cn(calls, "live_sync")[0].keys()) == {"p_token", "p_x", "p_z", "p_av"} and cn(calls, "live_sync")[0]["p_av"].get("g") in ("L", "P"), cn(calls, "live_sync")[:1])
    st["sync"] = {"online": 5, "peers": [{"id": "aaa", "name": "Sari", "x": 2, "z": 3, "av": {"g": "P", "i": 2}}, {"id": "bbb", "name": "<img src=x onerror=window.__x=1>", "x": -2, "z": 4, "av": {"g": "X", "i": 99}}]}
    pg.clock.run_for(1600)
    chk("tamu lain muncul sebagai entitas + label; jumlah online dari server", pg.evaluate("ents.length") == n0 + 2 and pg.locator("#lbls > *").count() == l0 + 2 and pg.inner_text("#cnt") == "5", (pg.evaluate("ents.length"), n0))
    chk("nama tamu lain aman dari XSS", pg.evaluate("window.__x") is None and "Sari" in pg.inner_text("#lbls"))
    pg.clock.run_for(1600)
    chk("peer yang sama tidak digandakan", pg.evaluate("ents.length") == n0 + 2)
    st["sync"] = {"online": 4, "peers": [{"id": "aaa", "name": "Sari", "x": 2.5, "z": 3, "av": {"g": "P", "i": 2}}]}; pg.clock.run_for(1600)
    chk("peer yang hilang dibuang dari scene", pg.evaluate("ents.length") == n0 + 1 and pg.locator("#lbls > *").count() == l0 + 1 and pg.inner_text("#cnt") == "4")
    st["sync"] = {"online": -1, "peers": []}; pg.clock.run_for(1600)
    chk("sync -1: layar blokir & semua peer dibuang", pg.locator("#nmb-block").count() == 1 and pg.evaluate("ents.length") == n0); ctx.close()
    # 5c. tema venue dari database
    TH = {"id": "v-midnight-party", "name": "Midnight Party", "event": "birthday", "host": "Alya", "painting": "https://cdn.test/venue.png", "pos": "center 30%",
          "theme": {"name": "Midnight Party", "orn": "sparkle", "ui": {"ivory": "#F7F1FF", "white": "#FFFFFF", "soft": "#EDE2FF", "soft2": "#D9C6F5", "accent": "#6D3FC0", "deep": "#3A2160", "ink": "#2A1B3D", "mute": "#7F6A9E", "line": "#E1D4F5"}, "hud": {"bg": "rgba(42,27,61,.6)", "acc": "#F7A8D4", "on": "#2A1B3D"}}}
    ctx, pg, errs, calls, st = newpage(b, BASE_CFG); st["theme"] = TH; pg.route("https://cdn.test/venue.png", lambda r: r.fulfill(status=200, content_type="image/png", headers={"access-control-allow-origin": "*"}, body=PNG1)); pg.goto(BASE + "/live/?t=" + TOK); pg.wait_for_selector("#n1"); pg.wait_for_function("document.documentElement.dataset.nmTheme==='v-midnight-party'", timeout=8000)
    cs = pg.evaluate("[document.documentElement.dataset.nmEvent, getComputedStyle(document.documentElement).getPropertyValue('--nm-accent').trim(), getComputedStyle(document.documentElement).getPropertyValue('--bgurl').trim(), NMID.host, NMID.event]")
    chk("tema venue diterapkan: tema, jenis acara, warna aksen", cs[0] == "birthday" and cs[1].lower() == "#6d3fc0" and cs[4] == "birthday", cs)
    pg.wait_for_function("getComputedStyle(document.documentElement).getPropertyValue('--bgurl').includes('blob:')", timeout=8000); cs[2] = pg.evaluate("getComputedStyle(document.documentElement).getPropertyValue('--bgurl')")
    chk("lukisan venue diunduh & dipasang sebagai blob same-origin (aman untuk panorama 3D); nama tuan rumah dari undangan", "blob:" in cs[2] and cs[3] == "Alya", cs)
    pg.click("#n1"); pg.fill("#nm", "Budi Uji"); pg.click("#go"); pg.wait_for_function("typeof P!=='undefined'&&P"); pg.wait_for_timeout(1200)
    chk("tema tetap setelah masuk venue; tanpa galat halaman", pg.evaluate("document.documentElement.dataset.nmTheme") == "v-midnight-party" and not errs, errs); ctx.close()
    TH2 = dict(TH, painting="http://insecure.test/x.png", theme=dict(TH["theme"], ui=dict(TH["theme"]["ui"], accent="url(x)")))
    ctx, pg, errs, calls, st = newpage(b, BASE_CFG); st["theme"] = TH2; pg.goto(BASE + "/live/?t=" + TOK); pg.wait_for_selector("#n1"); pg.wait_for_timeout(1500)
    chk("tema tidak aman diabaikan (aksen url() -> bawaan; http ditolak)", "insecure.test" not in pg.evaluate("getComputedStyle(document.documentElement).getPropertyValue('--bgurl')") and "url" not in pg.evaluate("getComputedStyle(document.documentElement).getPropertyValue('--nm-accent')"), errs); ctx.close()
    ctx, pg, errs, calls, st = newpage(b, BASE_CFG); pg.goto(BASE + "/live/?t=" + TOK); pg.wait_for_selector("#n1"); pg.wait_for_timeout(1000)
    chk("tanpa tema di venue: tema bawaan tetap", pg.evaluate("document.documentElement.dataset.nmTheme||''") != "v-midnight-party" and len(cn(calls, "live_theme")) == 1); ctx.close()
    # 6. halaman Jawa Tengah
    ctx, pg, errs, calls, st = newpage(b, BASE_CFG); pg.clock.install(); enter(pg, "/live/jawa-tengah"); pg.wait_for_function("typeof P!=='undefined'&&P"); pg.clock.run_for(1500)
    chk("halaman jawa-tengah: jembatan juga aktif", len(cn(calls, "live_join")) == 1 and pg.evaluate("bots.length") == 0); ctx.close()
    b.close()
print("\n%d lulus, %d gagal" % (ok_n, bad_n)); raise SystemExit(1 if bad_n else 0)
