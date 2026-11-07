# Uji UI Step 3 "Pilih Template" di Chromium: filter (kategori, tema, budaya, warna), label Baru/Populer, deskripsi tema, tombol, rasio thumbnail.
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
IMG = "data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22400%22 height=%22250%22%3E%3Crect width=%22400%22 height=%22250%22 fill=%22%23c9b6ee%22/%3E%3C/svg%3E"
STUB = """window.supabase={createClient:function(){
 var D=function(n){return new Date(Date.now()-n*864e5).toISOString()};
 var TP={essential:[
  {slug:'e1',name:'Joglo Klasik',description:'Nuansa batik dan emas.',thumbnail_url:'IMG',preview_url:'/preview?demo=e1',package_type:'essential',categories:['wedding','engagement'],created_at:D(5),capabilities:{culture:'Jawa',palettes:['gold','lavender']}},
  {slug:'e2',name:'Taman Blush',description:'Taman bunga lembut.',thumbnail_url:'IMG',preview_url:'/preview?demo=e2',package_type:'essential',categories:['wedding'],created_at:D(90),capabilities:{culture:'Umum',palettes:['blush']}},
  {slug:'e3',name:'Pesta Ceria',description:'Ulang tahun penuh warna.',thumbnail_url:'',preview_url:'',package_type:'essential',categories:['birthday'],created_at:D(90),capabilities:{culture:'Umum',palettes:['sage']}}],signature:[],luxe:[]};
 var TH={e1:[{slug:'joglo',name:'Joglo',description:'Pendopo joglo bernuansa emas.'},{slug:'kawung',name:'Kawung',description:'Motif kawung klasik.'}]};
 function qb(t){var st={pk:null};var o={select:function(){return o},eq:function(c,v){if(c==='package_type')st.pk=v;return o},order:function(){return o},maybeSingle:function(){return Promise.resolve({data:{plan:null}})},
  then:function(a,b){var d=t==='templates'?(TP[st.pk]||[]):[];return Promise.resolve({data:d,error:null}).then(a,b)}};return o}
 return{from:qb,rpc:function(n){if(n==='get_template_themes')return Promise.resolve({data:TH,error:null});if(n==='template_popularity')return window.__NOPOP?Promise.resolve({data:null,error:{message:'x'}}):Promise.resolve({data:{e2:5,e3:1},error:null});return Promise.resolve({data:null,error:null})},auth:{getSession:function(){return Promise.resolve({data:{session:{user:{id:'u1',email:'uji@uji.test'}}}})},onAuthStateChange:function(){return{data:{subscription:{unsubscribe:function(){}}}}}}}}};""".replace("IMG", IMG)
ok_n = bad_n = 0
def chk(n, c, d=""):
    global ok_n, bad_n
    if c: ok_n += 1; print("PASS", n)
    else: bad_n += 1; print("FAIL", n, d)
def names(pg): return [pg.locator(".tc h2").nth(i).inner_text() for i in range(pg.locator(".tc").count())]
def chip(pg, g, label): pg.locator(f'[data-f="{g}"]', has_text=label).first.click(); pg.wait_for_timeout(150)
with sync_playwright() as pw:
    b = pw.chromium.launch()
    def page(vw, vh, nopop=False):
        pg = b.new_page(viewport={"width": vw, "height": vh}); pg.errs = []; pg.on("pageerror", lambda e: pg.errs.append(str(e)))
        if nopop: pg.add_init_script("window.__NOPOP=1")
        pg.route("**/supabase.js", lambda r: r.fulfill(status=200, content_type="text/javascript", body=STUB))
        pg.route("**/fonts.googleapis.com/**", lambda r: r.abort()); pg.route("**/fonts.gstatic.com/**", lambda r: r.abort()); return pg
    for vw, vh, tag in ((1280, 900, "desktop"), (390, 844, "ponsel")):
        pg = page(vw, vh); pg.goto(BASE + "/template?paket=essential&kategori=wedding"); pg.wait_for_selector(".tg")
        chk(f"[{tag}] kategori Wedding: 2 template (e1, e2)", names(pg) == ["Joglo Klasik", "Taman Blush"], names(pg))
        grp = lambda g: pg.locator(f'[data-f="{g}"]').all_inner_texts()
        chk(f"[{tag}] filter kategori memuat 3 kategori ber-template", [x.strip() for x in grp("kat")] == ["Wedding", "Engagement", "Birthday"], grp("kat"))
        chk(f"[{tag}] filter tema (Joglo, Kawung), budaya (Jawa, Umum), warna (Emas, Lavender, Blush, Sage)", [x.strip() for x in grp("tema")][1:] == ["Joglo", "Kawung"] and [x.strip() for x in grp("budaya")][1:] == ["Jawa", "Umum"] and [x.strip() for x in grp("warna")][1:] == ["Emas", "Lavender", "Blush", "Sage"], (grp("tema"), grp("budaya"), grp("warna")))
        lab = lambda i: pg.locator(".tc").nth(i).locator(".tlb").all_inner_texts()
        chk(f"[{tag}] label: e1 'Baru' (5 hari), e2 'Populer' (5 undangan aktif)", lab(0) == ["Baru"] and lab(1) == ["Populer"], (lab(0), lab(1)))
        chk(f"[{tag}] badge paket dan kategori pada tiap kartu", all("Essential" in pg.locator(".tc").nth(i).locator(".pkchip").inner_text() and pg.locator(".tc").nth(i).locator(".tag").count() >= 1 for i in range(2)))
        chk(f"[{tag}] tombol Coba Demo (tautan) dan Gunakan Template", pg.locator(".tc").nth(0).locator("a.btn.o").get_attribute("href") == "/preview?demo=e1" and "/buat?paket=essential&kategori=wedding&template=e1" in pg.locator("[data-use=e1]").get_attribute("href"))
        chk(f"[{tag}] deskripsi tema tampil dan memuat nama + deskripsi tema pertama", "Tema Joglo" in pg.locator("[data-thd=e1]").inner_text() and "joglo bernuansa emas" in pg.locator("[data-thd=e1]").inner_text())
        pg.locator('input[data-th="e1"][value="kawung"]').check(force=True); pg.wait_for_timeout(100)
        chk(f"[{tag}] ganti tema memperbarui deskripsi & tautan Gunakan Template", "Tema Kawung" in pg.locator("[data-thd=e1]").inner_text() and "tema=kawung" in pg.locator("[data-use=e1]").get_attribute("href"))
        h = pg.evaluate("[...document.querySelectorAll('.tc .im')].map(e=>Math.round(e.getBoundingClientRect().height))")
        chk(f"[{tag}] thumbnail rasio konsisten (tinggi sama)", len(set(h)) == 1, h)
        chip(pg, "budaya", "Jawa"); chk(f"[{tag}] filter budaya Jawa -> hanya e1, URL tersinkron", names(pg) == ["Joglo Klasik"] and "f_budaya=Jawa" in pg.url, (names(pg), pg.url))
        chip(pg, "warna", "Blush"); chk(f"[{tag}] Jawa + Blush -> kosong, ada pesan dan Reset filter", pg.locator(".tc").count() == 0 and "Tidak ada template yang cocok" in pg.inner_text("main") and pg.locator("#flt-reset").count() == 1)
        pg.locator("#flt-reset").click(); pg.wait_for_timeout(150); chk(f"[{tag}] Reset filter mengembalikan 2 template", len(names(pg)) == 2 and "f_budaya" not in pg.url)
        chip(pg, "warna", "Blush"); chk(f"[{tag}] filter warna Blush -> hanya e2", names(pg) == ["Taman Blush"])
        chip(pg, "warna", "Semua"); chip(pg, "tema", "Kawung"); chk(f"[{tag}] filter tema Kawung -> hanya e1", names(pg) == ["Joglo Klasik"])
        chip(pg, "tema", "Semua"); chip(pg, "kat", "Birthday")
        chk(f"[{tag}] kategori Birthday -> e3, judul mengikuti, tanpa gambar memakai placeholder, demo bawaan /preview?demo=e3", names(pg) == ["Pesta Ceria"] and "Birthday" in pg.inner_text("h1") and pg.locator(".tc .noim").count() == 1 and pg.locator(".tc a.btn.o").get_attribute("href") == "/preview?demo=e3")
        chk(f"[{tag}] e3 (1 undangan) tidak berlabel Populer, e3 lama tidak 'Baru'", pg.locator(".tlb").count() == 0)
        chk(f"[{tag}] tidak ada scroll horizontal", not pg.evaluate("document.documentElement.scrollWidth > document.documentElement.clientWidth"))
        chk(f"[{tag}] tanpa galat JS", not pg.errs, pg.errs)
        pg.screenshot(path=os.environ.get("SHOT", "/tmp") + f"/template-{tag}.png", full_page=True); pg.close()
    pg = page(1280, 900, nopop=True); pg.goto(BASE + "/template?paket=essential&kategori=wedding"); pg.wait_for_selector(".tg")
    chk("RPC popularitas gagal/belum ada -> tidak ada label Populer, halaman tetap jalan", pg.locator(".tlb.pop").count() == 0 and pg.locator(".tc").count() == 2 and not pg.errs, pg.errs); pg.close()
    b.close()
print(f"\n{ok_n} lulus, {bad_n} gagal"); sys.exit(1 if bad_n else 0)
