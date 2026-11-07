# Uji UI Step 1 "Pilih Paket" di Chromium. supabase-js diganti stub di browser (tanpa jaringan/Supabase sungguhan).
# Pakai: python3 ops/tests/pilih-paket.ui.test.py  (butuh: python playwright + chromium)
import http.server, socketserver, threading, os, sys, functools
from playwright.sync_api import sync_playwright
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
    def translate_path(self, p):
        p = p.split("?")[0]; p = "/paket.html" if p == "/paket" else p
        return os.path.join(ROOT, p.lstrip("/"))
srv = socketserver.TCPServer(("127.0.0.1", 0), Q); BASE = "http://127.0.0.1:%d" % srv.server_address[1]
threading.Thread(target=srv.serve_forever, daemon=True).start()
STUB = """window.supabase={createClient:function(){
 var PL=[{id:'essential',name:'Essential',price:79000,duration_days:90,gallery_limit:10},{id:'signature',name:'Signature',price:149000,duration_days:180,gallery_limit:20},{id:'luxe',name:'Luxe',price:249000,duration_days:365,gallery_limit:40}];
 var TP={essential:[{slug:'e1',name:'E1',package_type:'essential',categories:['wedding']}],signature:[{slug:'s1',name:'S1',package_type:'signature',categories:['wedding']}],luxe:[]};
 function qb(t){var st={pk:null};var o={select:function(){return o},eq:function(c,v){if(c==='package_type')st.pk=v;return o},order:function(){return o},maybeSingle:function(){return Promise.resolve({data:{plan:null}})},
  then:function(a,b){var d=t==='plans'?PL:t==='templates'?(TP[st.pk]||[]):[];return Promise.resolve({data:d,error:null}).then(a,b)}};return o}
 return{from:qb,rpc:function(){return Promise.resolve({data:null,error:null})},auth:{getSession:function(){return Promise.resolve({data:{session:{user:{id:'u1',email:'uji@uji.test'}}}})},onAuthStateChange:function(){return{data:{subscription:{unsubscribe:function(){}}}}}}}}};"""
ok_n = bad_n = 0
def chk(n, c, d=""):
    global ok_n, bad_n
    if c: ok_n += 1; print("PASS", n)
    else: bad_n += 1; print("FAIL", n, d)
with sync_playwright() as pw:
    b = pw.chromium.launch(); 
    for vw, vh, tag in ((1280, 900, "desktop"), (390, 844, "ponsel")):
        pg = b.new_page(viewport={"width": vw, "height": vh}); errs = []; pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.route("**/supabase.js", lambda r: r.fulfill(status=200, content_type="text/javascript", body=STUB))
        pg.route("**/fonts.googleapis.com/**", lambda r: r.abort()); pg.route("**/fonts.gstatic.com/**", lambda r: r.abort())
        pg.goto(BASE + "/paket"); pg.wait_for_selector(".pkg3", timeout=8000)
        T = pg.inner_text("main")
        chk(f"[{tag}] 3 kartu paket", pg.locator(".pkc").count() == 3)
        chk(f"[{tag}] harga dari plans (Rp79.000, Rp149.000, Rp249.000)", all(x in T.replace("\xa0", " ") for x in ("Rp79.000", "Rp149.000", "Rp249.000")))
        chk(f"[{tag}] masa aktif & galeri konsisten (90/10, 180/20, 365/40) di kartu", all(x in T for x in ("Aktif 90 hari", "galeri maks. 10 foto", "Aktif 180 hari", "galeri maks. 20 foto", "Aktif 365 hari", "galeri maks. 40 foto")))
        row = lambda name: pg.locator(".cmp tbody tr", has=pg.locator("th", has_text=name)).first.inner_text()
        chk(f"[{tag}] tabel: masa aktif sama dengan kartu", "90 hari" in row("Masa aktif") and "180 hari" in row("Masa aktif") and "365 hari" in row("Masa aktif"))
        chk(f"[{tag}] tabel: batas galeri sama dengan kartu", "10 foto" in row("Batas galeri") and "20 foto" in row("Batas galeri") and "40 foto" in row("Batas galeri"))
        mark = lambda name: [c.inner_text().strip().replace("\n", "") for c in pg.locator(".cmp tbody tr", has=pg.locator("th", has_text=name)).first.locator("td").all()]
        chk(f"[{tag}] tabel: Website 2D hanya Essential", [("Termasuk" in x) for x in mark("Website undangan 2D")] == [True, False, False], mark("Website undangan 2D"))
        chk(f"[{tag}] tabel: Cinematic 3D hanya Signature", [("Termasuk" in x) and "Tidak" not in x for x in mark("Cinematic 3D")] == [False, True, False])
        chk(f"[{tag}] tabel: Virtual Venue & Avatar tamu hanya Luxe", all([("Tidak" not in x) for x in mark(n)] == [False, False, True] for n in ("Virtual Venue", "Avatar tamu")))
        chk(f"[{tag}] tabel: RSVP, buku ucapan, statistik tamu semua paket", all(all("Tidak" not in x for x in mark(n)) for n in ("RSVP", "Buku ucapan", "Statistik tamu")))
        chk(f"[{tag}] 'Tidak termasuk' ada di Essential & Signature, dan memuat Virtual Venue", pg.locator(".pk-no").count() == 3 and "Virtual Venue" in pg.locator(".pk-no").first.inner_text())
        d = pg.locator(".pk-demo")
        chk(f"[{tag}] tombol demo: Essential & Signature berupa tautan /preview?demo=, Luxe 'segera hadir' (tanpa template terbit)", d.count() == 3 and "/preview?demo=e1" in (d.nth(0).get_attribute("href") or "") and "/preview?demo=s1" in (d.nth(1).get_attribute("href") or "") and d.nth(2).get_attribute("aria-disabled") == "true")
        I = pg.inner_text(".pkinfo")
        chk(f"[{tag}] info harga/pajak, masa aktif, batas galeri, ganti paket & upgrade", all(x in I for x in ("tanpa biaya tambahan", "sejak pembayaran berhasil", "Batas galeri", "Upgrade paket setelah undangan dipublikasikan belum tersedia")))
        pg.locator("input[value=luxe]").check(force=True); pg.wait_for_selector(".pkc.on")
        chk(f"[{tag}] memilih Luxe memperbarui tombol lanjut", "Luxe" in pg.inner_text("#go"))
        ovf = pg.evaluate("document.documentElement.scrollWidth > document.documentElement.clientWidth")
        chk(f"[{tag}] tidak ada scroll horizontal halaman", not ovf)
        chk(f"[{tag}] tanpa galat JS", not errs, errs)
        pg.screenshot(path=os.environ.get("SHOT", "/tmp") + f"/paket-{tag}.png", full_page=True); pg.close()
    b.close()
print(f"\n{ok_n} lulus, {bad_n} gagal"); sys.exit(1 if bad_n else 0)
