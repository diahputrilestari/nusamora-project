# Uji UI halaman publik konten (konten.html): meta/SEO, markdown aman, 404, FAQ, pratinjau, bahasa, banner.
# Backend ditiru di browser (window.supabase stub); logika data diuji di ops/tests/admin-content.test.sql.
import http.server, socketserver, threading, os, json
from playwright.sync_api import sync_playwright
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
    def translate_path(self, p):
        p = p.split("?")[0]
        if p == "/konten" or p.split("/")[1] in ("artikel", "info", "bantuan", "tutorial"): p = "/konten.html"
        return os.path.join(ROOT, p.lstrip("/"))
srv = socketserver.TCPServer(("127.0.0.1", 0), Q); BASE = "http://127.0.0.1:%d" % srv.server_address[1]
threading.Thread(target=srv.serve_forever, daemon=True).start()
ok_n = bad_n = 0
def chk(n, c, d=""):
    global ok_n, bad_n
    if c: ok_n += 1; print("PASS", n)
    else: bad_n += 1; print("FAIL", n, d)
STUB = r"""var NOW=Date.now(),D=864e5,iso=function(n){return new Date(NOW+n*D).toISOString()};
var ART={type:'article',slug:'tips',lang:'id',title:'Tips <img src=x onerror=window.__xss=1>',seo_title:'Tips Undangan Digital',seo_description:'Deskripsi SEO',excerpt:'Ringkas',
 body:'## Judul Bagian\n\nHalo **tebal** dan [aman](https://nusamora.id/x) [jahat](javascript:alert(1)) <script>window.__xss=2</script>\n\n- satu\n- dua\n\n![gbr](https://x.test/g.png)',
 image_url:'https://x.test/c.png',og_image_url:'https://x.test/og.png',canonical_url:null,noindex:false,published_at:iso(-3),updated_at:iso(-1),alternates:[{lang:'en',slug:'tips-en'}]};
var DB={'article/tips/id':ART,'article/tips-en/en':Object.assign({},ART,{lang:'en',slug:'tips-en',title:'Tips EN',alternates:[{lang:'id',slug:'tips'}]}),'page/tentang/id':{type:'page',slug:'tentang',lang:'id',title:'Tentang',body:'Kami',noindex:true,alternates:[]}};
var LIST={faq:[{title:'Bagaimana cara bayar?',body:'Lewat **Midtrans**',slug:null}],article:[{title:'Tips',slug:'tips',excerpt:'Ringkas',published_at:iso(-3)}],banner:[{title:'Promo',image_url:null,link_url:'/paket'}],tutorial:[]};
var CONTENTS={p1:{id:'p1',type:'article',slug:'draf',lang:'id',title:'Draf Rahasia',body:'Isi',status:'draft',alternates:[]}};
window.__calls=[];
window.supabase={createClient:function(){return{
 rpc:function(n,a){window.__calls.push([n,a]);if(n==='public_content')return Promise.resolve({data:DB[a.p_type+'/'+a.p_slug+'/'+a.p_lang]||null});if(n==='public_content_list')return Promise.resolve({data:LIST[a.p_type]||[]});return Promise.resolve({data:null})},
 from:function(){var id;var o={select:function(){return o},eq:function(k,v){id=v;return o},maybeSingle:function(){return Promise.resolve({data:CONTENTS[id]||null})}};return o}}}};"""
CFG = "window.NM_CONFIG=window.NM_CONFIG||{};window.NM_CONFIG.SUPABASE_URL=window.NM_CONFIG.SUPABASE_URL||'https://x.supabase.test';window.NM_CONFIG.SUPABASE_ANON_KEY=window.NM_CONFIG.SUPABASE_ANON_KEY||'anon';"
def page(b, path, vw=1280):
    ctx = b.new_context(viewport={"width": vw, "height": 900}); pg = ctx.new_page(); errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.route("**/supabase-js@*/**", lambda r: r.fulfill(status=200, content_type="text/javascript", body=STUB))
    pg.route("**/fonts.googleapis.com/**", lambda r: r.abort()); pg.route("**/fonts.gstatic.com/**", lambda r: r.abort())
    pg.add_init_script(CFG)
    pg.goto(BASE + path); return ctx, pg, errs
def meta(pg, sel, attr="content"): return pg.evaluate("(a)=>{var e=document.querySelector(a[0]);return e?e.getAttribute(a[1]):null}", [sel, attr])
with sync_playwright() as p:
    b = p.chromium.launch()
    ctx, pg, errs = page(b, "/artikel/tips"); pg.wait_for_selector("article h1")
    chk("judul halaman memakai SEO title", pg.title() == "Tips Undangan Digital | NusaMora", pg.title())
    chk("meta description dari SEO", meta(pg, 'meta[name=description]') == "Deskripsi SEO")
    chk("robots index", meta(pg, 'meta[name=robots]') == "index,follow")
    chk("canonical memakai alamat halaman", (meta(pg, 'link[rel=canonical]', 'href') or "").endswith("/artikel/tips"))
    chk("og:image dari gambar OG", meta(pg, 'meta[property="og:image"]') == "https://x.test/og.png" and meta(pg, 'meta[property="og:type"]') == "article")
    chk("hreflang id dan en", pg.locator('link[rel=alternate][hreflang]').count() == 2)
    ld = pg.evaluate("(()=>{var s=document.querySelector('script[data-ld]');return s?JSON.parse(s.textContent):null})()")
    chk("JSON-LD Article", ld and ld["@type"] == "Article" and ld["inLanguage"] == "id", ld)
    chk("judul di-escape (tidak ada XSS)", pg.evaluate("window.__xss") is None and pg.locator("article h1 img").count() == 0)
    chk("markdown: heading, tebal, daftar, gambar", pg.locator(".kt-body h3").count() == 1 and pg.locator(".kt-body strong").count() == 1 and pg.locator(".kt-body li").count() == 2 and pg.locator(".kt-body img").count() == 1)
    chk("tautan https aman tetap ada, javascript: dibuang", pg.locator('.kt-body a[href^="https://nusamora.id"]').count() == 1 and pg.locator('.kt-body a[href^="javascript"]').count() == 0)
    chk("HTML mentah di isi tidak dieksekusi", pg.locator(".kt-body script").count() == 0)
    chk("tautan pindah bahasa", pg.locator('a.kt-sw, .kt-sw a').count() == 1 and "tips-en" in (pg.locator('.kt-sw a').get_attribute("href") or ""))
    chk("banner tampil dari public_content_list", pg.locator("#kt-banner:not([hidden]) a[href='/paket']").count() == 1)
    chk("tanpa galat JavaScript", not errs, errs); ctx.close()
    ctx, pg, errs = page(b, "/artikel/tips-en?lang=en"); pg.wait_for_selector("article h1")
    chk("bahasa Inggris: html lang=en dan og:locale", pg.evaluate("document.documentElement.lang") == "en" and meta(pg, 'meta[property="og:locale"]') == "en_US")
    chk("bahasa Inggris: tautan ke versi Indonesia", "Indonesia" in pg.locator(".kt-sw a").inner_text()); ctx.close()
    ctx, pg, errs = page(b, "/artikel/tidak-ada"); pg.wait_for_selector(".kt-empty")
    chk("404: noindex dan tanpa canonical", meta(pg, 'meta[name=robots]') == "noindex,follow" and pg.locator('link[rel=canonical]').count() == 0)
    ctx.close()
    ctx, pg, errs = page(b, "/info/tentang"); pg.wait_for_selector("article h1")
    chk("halaman dengan noindex diberi robots noindex & tanpa canonical", meta(pg, 'meta[name=robots]') == "noindex,follow" and pg.locator('link[rel=canonical]').count() == 0)
    chk("halaman info tanpa JSON-LD Article", pg.locator('script[data-ld]').count() == 0); ctx.close()
    ctx, pg, errs = page(b, "/info"); pg.wait_for_selector(".kt-empty"); chk("/info tanpa slug: tidak ditemukan", True); ctx.close()
    ctx, pg, errs = page(b, "/bantuan"); pg.wait_for_selector(".kt-faq details")
    chk("FAQ: pertanyaan dalam details, jawaban markdown", pg.locator(".kt-faq details").count() == 1 and pg.locator(".kt-faq strong").count() == 1)
    ctx.close()
    ctx, pg, errs = page(b, "/artikel"); pg.wait_for_selector(".kt-card")
    chk("daftar artikel: kartu menaut ke /artikel/tips", pg.locator('.kt-card[href="/artikel/tips"]').count() == 1); ctx.close()
    ctx, pg, errs = page(b, "/konten?preview=p1"); pg.wait_for_selector(".kt-pv")
    chk("pratinjau draf: banner pratinjau, noindex, tanpa JSON-LD", "draft" in pg.locator(".kt-pv").inner_text() and meta(pg, 'meta[name=robots]') == "noindex,follow" and pg.locator('script[data-ld]').count() == 0)
    ctx.close()
    ctx, pg, errs = page(b, "/konten?preview=zzz"); pg.wait_for_selector(".kt-empty")
    chk("pratinjau tak berizin: tidak membocorkan isi & noindex", "Draf Rahasia" not in pg.content() and meta(pg, 'meta[name=robots]') == "noindex,follow"); ctx.close()
    ctx, pg, errs = page(b, "/artikel/tips", vw=375); pg.wait_for_selector("article h1")
    chk("mobile 375px: tanpa scroll horizontal", pg.evaluate("document.documentElement.scrollWidth <= window.innerWidth + 1")); ctx.close()
    b.close()
print("%d lulus, %d gagal" % (ok_n, bad_n)); raise SystemExit(1 if bad_n else 0)
