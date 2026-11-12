# Uji UI Step 2 "Pilih Kategori" di Chromium. supabase-js diganti stub di browser (tanpa jaringan/Supabase sungguhan).
import http.server, socketserver, threading, os, sys
from playwright.sync_api import sync_playwright
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
    def translate_path(self, p):
        p = p.split("?")[0]; p = "/template.html" if p == "/template" else p
        return os.path.join(ROOT, p.lstrip("/"))
srv = socketserver.TCPServer(("127.0.0.1", 0), Q); BASE = "http://127.0.0.1:%d" % srv.server_address[1]
threading.Thread(target=srv.serve_forever, daemon=True).start()
PX = "data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2216%22 height=%2210%22%3E%3Crect width=%2216%22 height=%2210%22 fill=%22%23c9b6ee%22/%3E%3C/svg%3E"
STUB = """window.supabase={createClient:function(){
 var TP={essential:[{slug:'e1',name:'E1',package_type:'essential',categories:['wedding','engagement'],thumbnail_url:'%s'},{slug:'e2',name:'E2',package_type:'essential',categories:['wedding'],thumbnail_url:''},{slug:'e3',name:'E3',package_type:'essential',categories:['birthday'],thumbnail_url:'%s'}],signature:[],luxe:[]};
 function qb(t){var st={pk:null};var o={select:function(){return o},eq:function(c,v){if(c==='package_type')st.pk=v;return o},order:function(){return o},maybeSingle:function(){return Promise.resolve({data:{plan:null}})},
  then:function(a,b){var d=t==='templates'?(TP[st.pk]||[]):[];return Promise.resolve({data:d,error:null}).then(a,b)}};return o}
 return{from:qb,rpc:function(){return Promise.resolve({data:null,error:null})},auth:{getSession:function(){return Promise.resolve({data:{session:{user:{id:'u1',email:'uji@uji.test'}}}})},onAuthStateChange:function(){return{data:{subscription:{unsubscribe:function(){}}}}}}}}};""" % (PX, PX)
ok_n = bad_n = 0
def chk(n, c, d=""):
    global ok_n, bad_n
    if c: ok_n += 1; print("PASS", n)
    else: bad_n += 1; print("FAIL", n, d)
with sync_playwright() as pw:
    b = pw.chromium.launch()
    for vw, vh, tag in ((1280, 900, "desktop"), (390, 844, "ponsel")):
        pg = b.new_page(viewport={"width": vw, "height": vh}); errs = []; pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.route("**/supabase.js", lambda r: r.fulfill(status=200, content_type="text/javascript", body=STUB))
        pg.route("**/fonts.googleapis.com/**", lambda r: r.abort()); pg.route("**/fonts.gstatic.com/**", lambda r: r.abort())
        pg.goto(BASE + "/template?paket=essential"); pg.wait_for_selector(".cg")
        cards = pg.locator(".cgi"); on = pg.locator("a.cgi"); off = pg.locator(".cgi.off")
        chk(f"[{tag}] 8 kategori ditampilkan", cards.count() == 8)
        chk(f"[{tag}] hanya kategori ber-template yang berupa tautan (3: wedding, engagement, birthday)", on.count() == 3 and off.count() == 5, (on.count(), off.count()))
        chk(f"[{tag}] kategori tanpa template BUKAN tautan, tidak bisa difokus", all(off.nth(i).evaluate("e=>e.tagName==='DIV' && !e.hasAttribute('href') && e.tabIndex<0") for i in range(off.count())))
        chk(f"[{tag}] label 'Coming Soon' pada setiap kategori kosong", pg.locator(".cgi.off em.soon").count() == 5 and all("Coming Soon" in off.nth(i).inner_text() for i in range(5)))
        chk(f"[{tag}] jumlah template tersedia (Wedding 2, Engagement 1, Birthday 1)", all(x in pg.inner_text(".cg") for x in ("2 template tersedia", "1 template tersedia")) and pg.locator("em.cnt").count() == 3)
        w = pg.locator("a.cgi", has_text="Wedding").first
        chk(f"[{tag}] Wedding memakai thumbnail template (gambar)", w.locator(".cgi-im img").count() == 1)
        chk(f"[{tag}] Engagement memakai thumbnail template; kategori kosong memakai ilustrasi SVG", pg.locator("a.cgi", has_text="Engagement").locator(".cgi-im img").count() == 1 and all(off.nth(i).locator("svg.cgi-ill").count() == 1 for i in range(5)))
        chk(f"[{tag}] ringkasan '3 dari 8 kategori'", "3 dari 8 kategori" in pg.inner_text(".cgsum"))
        url0 = pg.url; off.first.click(force=True, no_wait_after=True); pg.wait_for_timeout(300)
        chk(f"[{tag}] mengklik kategori kosong tidak berpindah halaman", pg.url == url0 and pg.locator(".toast").count() == 0)
        href = w.get_attribute("href"); chk(f"[{tag}] tautan Wedding ke daftar template", "paket=essential" in href and "kategori=wedding" in href, href)
        chk(f"[{tag}] tidak ada scroll horizontal", not pg.evaluate("document.documentElement.scrollWidth > document.documentElement.clientWidth"))
        chk(f"[{tag}] tanpa galat JS", not errs, errs)
        pg.screenshot(path=os.environ.get("SHOT", "/tmp") + f"/kategori-{tag}.png", full_page=True)
        pg.goto(BASE + "/template?paket=essential&kategori=seminar"); pg.wait_for_selector(".fw")
        chk(f"[{tag}] URL langsung ke kategori kosong tidak menampilkan kartu template", pg.locator(".tc").count() == 0)
        pg.goto(BASE + "/template?paket=signature"); pg.wait_for_selector(".cg")
        chk(f"[{tag}] paket tanpa template sama sekali: semua Coming Soon, tidak ada tautan", pg.locator("a.cgi").count() == 0 and pg.locator(".cgi.off").count() == 8 and "0 dari 8" in pg.inner_text(".cgsum"))
        pg.close()
    b.close()
print(f"\n{ok_n} lulus, {bad_n} gagal"); sys.exit(1 if bad_n else 0)
