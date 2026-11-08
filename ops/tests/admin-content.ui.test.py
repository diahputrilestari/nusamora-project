# Uji UI admin: Manajemen Konten: daftar per jenis, editor (slug, SEO, jadwal, terjemahan), revisi, media, sitemap, izin baca saja.
# Backend ditiru di browser (window.supabase stub) hanya untuk menguji antarmuka; logika data diuji di ops/tests/admin-content.test.sql.
import http.server, socketserver, threading, os, json
from playwright.sync_api import sync_playwright
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
    def translate_path(self, p):
        p = p.split("?")[0]; p = {"/admin": "/admin.html", "/akun": "/akun.html"}.get(p, p)
        return os.path.join(ROOT, p.lstrip("/"))
srv = socketserver.TCPServer(("127.0.0.1", 0), Q); BASE = "http://127.0.0.1:%d" % srv.server_address[1]
threading.Thread(target=srv.serve_forever, daemon=True).start()
ok_n = bad_n = 0
def chk(n, c, d=""):
    global ok_n, bad_n
    if c: ok_n += 1; print("PASS", n)
    else: bad_n += 1; print("FAIL", n, d)
def newpage(b, vw=1280, perms=None, stub=None):
    ctx = b.new_context(viewport={"width": vw, "height": 900}); errs = []
    pg = ctx.new_page(); pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.route("**/supabase-js@*/**", lambda r: r.fulfill(status=200, content_type="text/javascript", body=stub or STUB))
    pg.route("**/fonts.googleapis.com/**", lambda r: r.abort()); pg.route("**/fonts.gstatic.com/**", lambda r: r.abort())
    pg.route("**/live/**", lambda r: r.fulfill(status=200, content_type="text/html", body="<html><body>live</body></html>"))
    pg.route("**/preview?*", lambda r: r.fulfill(status=200, content_type="text/html", body="<html><body>demo</body></html>"))
    if perms: pg.add_init_script("sessionStorage.setItem('__perms', %s)" % json.dumps(json.dumps(perms)))
    return ctx, pg, errs
def txt(pg, sel="#view"): return pg.inner_text(sel)

STUB = r"""window.__calls=[];window.__up=[];window.__rm=[];
var PERMS=JSON.parse(sessionStorage.getItem('__perms')||'null')||['dashboard.read','content.read','content.write'];
var NOW=Date.now(),D=864e5,iso=function(n){return new Date(NOW+n*D).toISOString()};
function C(id,type,title,o){return Object.assign({id:id,type:type,title:title,slug:null,lang:'id',status:'draft',publish_at:null,unpublish_at:null,updated_at:iso(-1),published_at:null,sort:0,translation_of:null,image_url:null,body:'Isi',excerpt:null,seo_title:null,seo_description:null,canonical_url:null,og_image_url:null,noindex:false,link_url:null},o||{})}
var CONT=[C('a1','article','Tips <img src=x onerror=window.__xss=1>',{slug:'tips',status:'published',published_at:iso(-5),body:'Halo'}),C('a2','article','Artikel Terjadwal',{slug:'terjadwal',status:'published',publish_at:iso(3)}),C('a3','article','Artikel Draft',{slug:'draft'}),C('a4','article','Artikel Arsip',{slug:'arsip',status:'archived'}),C('a5','article','Article EN',{slug:'tips-en',lang:'en',status:'published',translation_of:'a1'}),C('f1','faq','Bagaimana cara bayar?',{status:'published'}),C('b1','banner','Promo Akhir Tahun',{status:'published',image_url:'https://x.test/b.png',link_url:'/paket'})];
var MEDIA=[{path:'media/a.png',alt:'Logo',mime:'image/png',size:2048,width:300,height:200,at:iso(-2),used_in:[{id:'a1',title:'Tips',type:'article'}]},{path:'media/b.png',alt:null,mime:'image/png',size:204800,width:800,height:600,at:iso(-1),used_in:[]}];
var REVS=[{version:3,at:iso(-1),actor_name:'Admin <b>Uji</b>',changed:['body','seo_title'],note:'Perbaiki isi'},{version:2,at:iso(-2),actor_name:'Admin',changed:['status'],note:null},{version:1,at:iso(-5),actor_name:'Admin',changed:['title','slug','body'],note:'Draf awal'}];
var NEXT=null;
function ok(d){return Promise.resolve({data:d===undefined?null:d,error:null})}
function qb(t){var f={},o={};['select','order','range','or','in','gte','lte','lt','gt','neq','ilike','contains','not','is','limit'].forEach(function(m){o[m]=function(){return o}});
 o.eq=function(k,v){f[k]=v;return o};o.maybeSingle=function(){o.__one=1;return o};
 o.then=function(a,b){var rows=t==='contents'?CONT.filter(function(x){return Object.keys(f).every(function(k){return String(x[k])===String(f[k])})}):[];return Promise.resolve(o.__one?{data:rows[0]||null,error:null}:{data:rows,error:null,count:rows.length}).then(a,b)};return o}
window.supabase={createClient:function(){return{
 from:qb,
 rpc:function(n,a){window.__calls.push([n,a]);
  if(n==='my_admin')return ok({role:'content',perms:PERMS,mfa:{needed:false}});
  if(n==='admin_content_save'){if(NEXT){var e=NEXT;NEXT=null;return ok({ok:false,error:e})}if(a.p_id){var x=CONT.filter(function(z){return z.id===a.p_id})[0];Object.assign(x,a.p_data)}else CONT.push(Object.assign(C('n'+CONT.length,a.p_type,a.p_data.title),a.p_data));return ok({ok:true,id:'n'})}
  if(n==='admin_content_revisions')return ok(REVS);
  if(n==='admin_content_restore')return ok({ok:true});
  if(n==='admin_content_delete'){CONT=CONT.filter(function(z){return z.id!==a.p_id});return ok({ok:true})}
  if(n==='admin_media_list')return ok(MEDIA);
  if(n==='admin_media_register'){MEDIA.push({path:a.p_path,alt:null,mime:'image/png',size:1000,width:a.p_width,height:a.p_height,at:iso(0),used_in:[]});return ok({ok:true})}
  if(n==='admin_media_set_alt')return ok({ok:true});
  if(n==='admin_media_delete')return ok({ok:true});
  if(n==='public_sitemap')return ok([{type:'article',lang:'id',slug:'tips',updated_at:iso(-1)},{type:'page',lang:'en',slug:'about&co',updated_at:iso(-2)}]);
  return ok([])},
 functions:{invoke:function(){return Promise.resolve({data:{ok:true},error:null})}},
 storage:{from:function(b){return{upload:function(p,f){window.__up.push([b,p,f.name]);return ok({path:p})},remove:function(l){window.__rm.push(l);return ok({})},getPublicUrl:function(p){return{data:{publicUrl:'https://cdn.test/'+b+'/'+p}}}}}},
 auth:{getSession:function(){return Promise.resolve({data:{session:{access_token:'tok',user:{id:'u1',email:'adm@uji.test'}}}})},signOut:function(){return Promise.resolve({})},onAuthStateChange:function(){return{data:{subscription:{unsubscribe:function(){}}}}}}}}};"""

PNG = bytes.fromhex("89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c6360000002000001e221bc330000000049454e44ae426082")
def calls(pg, n): return [c[1] for c in pg.evaluate("window.__calls") if c[0] == n]
with sync_playwright() as pw:
    b = pw.chromium.launch()
    ctx, pg, errs = newpage(b); ctx.set_default_timeout(15000); pg.goto(BASE + "/admin#content:article"); pg.wait_for_selector(".tbl-w tbody tr", timeout=15000); t = txt(pg)
    chk("6 tab: 5 jenis konten + Media", [x.strip() for x in pg.locator(".tabs button").all_inner_texts()] == ["Artikel / Blog", "Halaman Informasi", "FAQ", "Tutorial", "Banner", "Media"], pg.locator(".tabs button").all_inner_texts())
    chk("daftar artikel: 5 baris dengan status turunan Tayang/Terjadwal/Draft/Arsip", pg.locator(".tbl-w tbody tr").count() == 5 and all(s in t for s in ["Tayang", "Terjadwal", "Draft", "Arsip"]), t[:400])
    chk("judul di-escape (tanpa XSS)", pg.evaluate("window.__xss") is None and pg.locator(".tbl-w img").count() == 0)
    pg.select_option("#ct-st", "Terjadwal"); chk("filter status", pg.locator(".tbl-w tbody tr").count() == 1 and "Artikel Terjadwal" in txt(pg))
    pg.select_option("#ct-st", ""); pg.select_option("#ct-lg", "en"); chk("filter bahasa", pg.locator(".tbl-w tbody tr").count() == 1); pg.select_option("#ct-lg", "")
    pg.fill("#ct-q", "draft"); chk("pencarian judul/slug", pg.locator(".tbl-w tbody tr").count() == 1); pg.fill("#ct-q", "")
    chk("tautan pratinjau membuka /konten?preview=id di tab baru", pg.locator("a:has-text('Pratinjau')").first.get_attribute("href").startswith("/konten?preview=") and pg.locator("a:has-text('Pratinjau')").first.get_attribute("target") == "_blank")
    # artikel baru
    pg.click("#ct-new"); pg.wait_for_selector("#ct-edit[open] #c-title")
    pg.fill("#c-title", "Tips Memilih Template!"); chk("slug otomatis dari judul", pg.input_value("#c-slug") == "tips-memilih-template" and "tips-memilih-template" in pg.inner_text("#c-slug-v"))
    pg.fill("#c-st", "x" * 62); chk("penghitung SEO title memberi tanda melewati 60", "62/60" in pg.inner_text("#c-st-n") and pg.locator("#c-st-n.over").count() == 1)
    pg.fill("#c-st", "Cara Memilih Template"); pg.fill("#c-sd", "Panduan singkat memilih template undangan."); chk("pratinjau hasil pencarian", "Cara Memilih Template | NusaMora" in pg.inner_text("#c-serp") and "/artikel/tips-memilih-template" in pg.inner_text("#c-serp") and "Panduan singkat" in pg.inner_text("#c-serp"))
    pg.fill("#c-body", "Isi artikel"); pg.select_option("#c-status", "published"); pg.fill("#c-pa", "2099-01-05T09:00")
    chk("petunjuk jadwal: akan tayang otomatis", "Akan tayang otomatis" in pg.inner_text("#c-hint"), pg.inner_text("#c-hint"))
    pg.fill("#c-note", "Versi awal"); pg.evaluate("NEXT='slug_dipakai';0"); pg.click("#c-save"); pg.wait_for_function("document.querySelector('#c-err').textContent.length>0")
    chk("slug bentrok: pesan jelas, dialog tetap terbuka", "sudah dipakai" in pg.inner_text("#c-err") and pg.locator("#ct-edit[open]").count() == 1)
    pg.click("#c-save"); pg.wait_for_function("!document.querySelector('#ct-edit[open]')")
    c = calls(pg, "admin_content_save")[-1]; dd = c["p_data"]
    chk("simpan: jenis, slug, SEO, status, catatan", c["p_id"] is None and c["p_type"] == "article" and dd["slug"] == "tips-memilih-template" and dd["seo_title"] == "Cara Memilih Template" and dd["status"] == "published" and c["p_note"] == "Versi awal", c)
    chk("jadwal WIB dikonversi ke UTC (09:00 WIB = 02:00Z)", dd["publish_at"] == "2099-01-05T02:00:00.000Z" and dd["unpublish_at"] is None and dd["translation_of"] is None, dd)
    pg.wait_for_function("document.querySelectorAll('.tbl-w tbody tr').length===6")
    # edit + revisi
    pg.locator("tr", has_text="Artikel Draft").locator("[data-ed]").click(); pg.wait_for_selector("#ct-edit[open] #c-rev table")
    t = pg.inner_text("#c-rev")
    chk("riwayat revisi: versi, pelaku, bidang berubah, catatan", "v3" in t and "Perbaiki isi" in t and "Isi, SEO title" in t and "Draf awal" in t and pg.locator("#c-rev [data-rv]").count() == 2, t[:400])
    chk("nama pelaku revisi di-escape", pg.locator("#c-rev b").count() == 0)
    chk("draft boleh dihapus (tombol Hapus ada)", pg.locator("#c-del").count() == 1)
    pg.click("#c-rev [data-rv='1']"); pg.wait_for_selector("#cdlg[open]"); chk("pulihkan meminta konfirmasi dan menyebut hasilnya draft", "draft" in pg.inner_text("#cdlg")); pg.click("#cdlg-y"); pg.wait_for_function("window.__calls.some(c=>c[0]==='admin_content_restore')")
    chk("pulihkan memanggil RPC dengan versi", calls(pg, "admin_content_restore")[-1] == {"p_id": "a3", "p_version": 1})
    pg.wait_for_selector("#ct-edit", state="hidden")
    pg.locator("tr", has_text="Artikel Draft").locator("[data-ed]").click(); pg.wait_for_selector("#c-del"); pg.click("#c-del"); pg.wait_for_selector("#cdlg[open]"); pg.click("#cdlg-y"); pg.wait_for_function("window.__calls.some(c=>c[0]==='admin_content_delete')")
    chk("hapus draft lewat konfirmasi", calls(pg, "admin_content_delete")[-1] == {"p_id": "a3"})
    pg.locator("tr", has_text="Tips").first.locator("[data-ed]").click(); pg.wait_for_selector("#ct-edit[open] #c-rev table"); chk("konten tayang: tidak ada tombol Hapus", pg.locator("#c-del").count() == 0); pg.keyboard.press("Escape")
    # terjemahan
    pg.click("#ct-new"); pg.wait_for_selector("#c-tr"); pg.select_option("#c-lang", "en"); chk("pilihan terjemahan memuat artikel Indonesia tanpa terjemahan", "Artikel Terjadwal" in pg.inner_html("#c-tr") and "Article EN" not in pg.inner_html("#c-tr") and "Tips" not in pg.locator("#c-tr option").all_inner_texts()); pg.keyboard.press("Escape")
    # pemilih media di editor
    pg.click("#ct-new"); pg.wait_for_selector("#c-img-b"); pg.click("#c-img-b"); pg.wait_for_selector("#ct-pick[open] .ct-mc")
    chk("pemilih media menampilkan gambar perpustakaan", pg.locator("#ct-pick .ct-mc").count() == 2)
    pg.locator("#ct-pick .ct-mc").first.click(); pg.wait_for_function("!document.querySelector('#ct-pick[open]')")
    chk("memilih gambar mengisi sampul dengan URL publik", pg.input_value("#c-img") == "https://cdn.test/site-assets/media/a.png" and not pg.locator("#c-img-p").is_hidden())
    pg.click("#c-img-x"); chk("hapus sampul", pg.input_value("#c-img") == "")
    pg.click("#c-ins"); pg.wait_for_selector("#ct-pick[open] .ct-mc"); pg.locator("#ct-pick .ct-mc").first.click(); pg.wait_for_function("!document.querySelector('#ct-pick[open]')")
    chk("sisipkan gambar ke isi (markdown)", "![Logo](https://cdn.test/site-assets/media/a.png)" in pg.input_value("#c-body")); pg.keyboard.press("Escape")
    # sitemap
    with pg.expect_download() as dl: pg.click("#ct-sm")
    import tempfile; p = tempfile.mktemp(suffix=".xml"); dl.value.save_as(p); xml = open(p).read()
    chk("sitemap.xml: URL artikel + halaman, & di-escape, bahasa EN", "/artikel/tips</loc>" in xml and "/info/about&amp;co?lang=en</loc>" in xml and xml.startswith("<?xml"), xml[:400])
    # banner & faq
    pg.goto(BASE + "/admin#content:banner"); pg.wait_for_selector(".tbl-w"); pg.click("#ct-new"); pg.wait_for_selector("#c-link")
    chk("form banner: tanpa slug dan SEO, ada gambar + tautan", pg.locator("#c-slug").count() == 0 and pg.locator("#c-st").count() == 0 and pg.locator("#c-img-b").count() == 1); pg.keyboard.press("Escape")
    pg.goto(BASE + "/admin#content:faq"); pg.wait_for_selector(".tbl-w"); pg.click("#ct-new"); pg.wait_for_selector("#c-body"); chk("form FAQ: label Pertanyaan/Jawaban, tanpa slug", "Pertanyaan" in pg.inner_text("#ct-edit") and "Jawaban" in pg.inner_text("#ct-edit") and pg.locator("#c-slug").count() == 0); pg.keyboard.press("Escape")
    # media
    pg.goto(BASE + "/admin#content:media"); pg.wait_for_selector("#view .ct-mc"); t = txt(pg)
    chk("media: 2 gambar, ukuran, dimensi, pemakaian", pg.locator("#view .ct-mc").count() == 2 and "300×200" in t and "Dipakai di: Tips" in t and "Belum dipakai" in t and "Belum ada teks alternatif" in t, t[:400])
    chk("media terpakai: tombol Hapus nonaktif", pg.locator("[data-rm='0']").is_disabled() and not pg.locator("[data-rm='1']").is_disabled())
    pg.fill("[data-alt='1']", "Foto dekorasi"); pg.locator("[data-alt='1']").blur(); pg.wait_for_function("window.__calls.some(c=>c[0]==='admin_media_set_alt')")
    chk("teks alternatif disimpan", calls(pg, "admin_media_set_alt")[-1] == {"p_path": "media/b.png", "p_alt": "Foto dekorasi"})
    pg.click("[data-rm='1']"); pg.wait_for_selector("#cdlg[open]"); pg.click("#cdlg-y"); pg.wait_for_function("window.__rm.length===1")
    chk("hapus media: cek pemakaian di server lalu hapus berkas storage", calls(pg, "admin_media_delete")[-1] == {"p_path": "media/b.png"} and pg.evaluate("window.__rm[0]") == ["media/b.png"])
    pg.set_input_files("#m-up", [{"name": "x.txt", "mimeType": "text/plain", "buffer": b"hi"}]); pg.wait_for_timeout(300)
    chk("unggah berkas bukan gambar ditolak di klien (tanpa upload)", not pg.evaluate("window.__up"))
    pg.set_input_files("#m-up", [{"name": "besar.png", "mimeType": "image/png", "buffer": b"0" * (3 * 1024 * 1024 + 10)}]); pg.wait_for_timeout(300)
    chk("unggah >3 MB ditolak di klien", not pg.evaluate("window.__up"))
    pg.set_input_files("#m-up", [{"name": "ok.png", "mimeType": "image/png", "buffer": PNG}]); pg.wait_for_function("window.__up.length===1")
    up = pg.evaluate("window.__up[0]"); rg = calls(pg, "admin_media_register")[-1]
    chk("unggah valid: ke bucket site-assets/media/ lalu didaftarkan dengan dimensi", up[0] == "site-assets" and up[1].startswith("media/") and up[1].endswith(".png") and rg["p_path"] == up[1] and rg["p_width"] == 1 and rg["p_height"] == 1, (up, rg))
    chk("tanpa galat JavaScript", not errs, errs); ctx.close()
    # baca saja
    ctx, pg, errs = newpage(b, perms=["dashboard.read", "content.read"]); pg.goto(BASE + "/admin#content:article"); pg.wait_for_selector(".tbl-w tbody tr")
    chk("izin baca saja: tanpa tombol Tambah/Unduh sitemap tetap ada", pg.locator("#ct-new").count() == 0 and pg.locator("#ct-sm").count() == 1)
    pg.locator("[data-ed]").first.click(); pg.wait_for_selector("#ct-edit[open] #c-title")
    chk("izin baca saja: kolom terkunci, tanpa Simpan dan Pulihkan", pg.locator("#c-title:disabled").count() == 1 and pg.locator("#c-save").count() == 0 and pg.locator("#c-note").count() == 0); pg.wait_for_selector("#c-rev table"); chk("izin baca saja: tanpa tombol Pulihkan", pg.locator("[data-rv]").count() == 0); pg.keyboard.press("Escape")
    pg.goto(BASE + "/admin#content:media"); pg.wait_for_selector(".ct-mc"); chk("izin baca saja: media tanpa unggah/hapus", pg.locator("#m-up, [data-rm]").count() == 0 and pg.locator("[data-alt]:not(:disabled)").count() == 0)
    ctx.close()
    ctx, pg, errs = newpage(b, vw=375); pg.goto(BASE + "/admin#content:article"); pg.wait_for_selector(".tbl-w")
    chk("mobile 375px: tanpa scroll horizontal (daftar)", pg.evaluate("document.documentElement.scrollWidth <= window.innerWidth + 1"))
    pg.click("#ct-new"); pg.wait_for_selector("#c-title"); chk("mobile 375px: dialog editor tanpa scroll horizontal", pg.evaluate("document.documentElement.scrollWidth <= window.innerWidth + 1 && document.querySelector('#ct-edit').scrollWidth <= document.querySelector('#ct-edit').clientWidth + 1"))
    b.close()
print("\n%d lulus, %d gagal" % (ok_n, bad_n)); raise SystemExit(1 if bad_n else 0)
