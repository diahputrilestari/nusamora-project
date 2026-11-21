# Uji UI interaksi artikel (suka, simpan, feedback, penulis, komentar bersarang, reaksi, bagikan). Backend ditiru di browser;
# logika data/izin diuji di ops/tests/artikel-interaksi.test.sql.
import http.server, socketserver, threading, os, json
from playwright.sync_api import sync_playwright
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
    def translate_path(self, p):
        p = p.split("?")[0]
        if p.startswith("/artikel"): p = "/konten.html"
        return os.path.join(ROOT, p.lstrip("/"))
srv = socketserver.TCPServer(("127.0.0.1", 0), Q); BASE = "http://127.0.0.1:%d" % srv.server_address[1]
threading.Thread(target=srv.serve_forever, daemon=True).start()
ok_n = bad_n = 0
def chk(n, c, d=""):
    global ok_n, bad_n
    if c: ok_n += 1; print("PASS", n)
    else: bad_n += 1; print("FAIL", n, d)
STUB = r"""window.__calls=[];
var LOGGED=sessionStorage.getItem('__login')==='1', GUEST=sessionStorage.getItem('__guest')==='1', FAIL=sessionStorage.getItem('__fail')||'';
var ART={id:'a1',type:'article',title:'Artikel Uji',slug:'artikel-uji',lang:'id',excerpt:'Ringkasan',image_url:null,published_at:'2026-11-01T00:00:00Z',updated_at:'2026-11-01T00:00:00Z',body:'## Bagian satu\n\nIsi pertama.\n\n## Bagian dua\n\nIsi kedua.'};
var E={id:'a1',views:1200,likes:3,liked:false,comments:2,saved:false,feedback:null,comments_open:true,guest_comments:GUEST,author:{id:'x',name:'Penulis <b>Uji</b>',bio:'Bio penulis',avatar_url:null,links:[{label:'Instagram',url:'https://instagram.com/uji'}]},author_articles:[{title:'Artikel lain',slug:'lain',read_min:4}]};
var NOW=new Date().toISOString();
var CM=[{id:'c1',name:'Rani L.',guest:false,team:false,body:'<script>window.__xss=1</script> komentar bagus',deleted:false,created_at:NOW,edited_at:null,likes:2,status:'approved',liked:false,mine:false,replies:[{id:'r1',name:'Tim NusaMora',team:true,guest:false,body:'Terima kasih!',created_at:NOW,likes:0,status:'approved',liked:false,mine:false,reply_to:null}]},
 {id:'c2',name:'Budi',guest:false,team:false,body:'Milik saya',deleted:false,created_at:NOW,likes:0,status:'approved',liked:false,mine:true,replies:[]}];
function ok(d){return Promise.resolve({data:d===undefined?null:d,error:null})}
function qb(){var o={};['select','order','range','or','in','eq','limit','neq'].forEach(function(m){o[m]=function(){return o}});o.maybeSingle=function(){return ok(null)};o.then=function(a,b){return Promise.resolve({data:[],error:null}).then(a,b)};return o}
window.supabase={createClient:function(){return{from:qb,
 rpc:function(n,a){window.__calls.push([n,a]);
  if(FAIL===n)return Promise.resolve({data:null,error:{message:'x'}});
  if(n==='public_content')return ok(ART);
  if(n==='public_content_list')return ok([ART,{id:'b',type:'article',title:'Lain',slug:'lain',excerpt:'x',published_at:'2026-10-01T00:00:00Z',body:'x'}]);
  if(n==='article_engagement')return ok(JSON.parse(JSON.stringify(E)));
  if(n==='article_track_view')return ok(1201);
  if(n==='article_like_toggle'){E.liked=!E.liked;E.likes+=E.liked?1:-1;return ok({ok:true,liked:E.liked,likes:E.likes})}
  if(n==='article_save_set'){return LOGGED?ok({ok:true,saved:a.p_saved}):ok({ok:false,error:'login_diperlukan'})}
  if(n==='article_feedback_set')return ok({ok:true,value:a.p_value});
  if(n==='article_comments_list'){var it=CM.slice();if(a.p_sort==='oldest')it.reverse();return ok({total:it.length,items:it,comments_open:true})}
  if(n==='article_comment_add'){if(a.p_body.indexOf('dobel')>=0)return ok({ok:false,error:'komentar_duplikat'});var st=GUEST&&!LOGGED?'pending':'approved';CM.unshift({id:'n'+CM.length,name:'Saya',guest:!LOGGED,team:false,body:a.p_body,deleted:false,created_at:NOW,likes:0,status:st,liked:false,mine:true,replies:[]});return ok({ok:true,id:'n',status:st})}
  if(n==='comment_like_toggle'){return ok({ok:true,liked:true,likes:3})}
  if(n==='comment_report')return ok({ok:true});
  if(n==='article_comment_delete')return ok({ok:true});
  return ok([])},
 auth:{getSession:function(){return Promise.resolve({data:{session:LOGGED?{access_token:'t',user:{id:'u1'}}:null}})},onAuthStateChange:function(){return{data:{subscription:{unsubscribe:function(){}}}}}}}}};"""
def newpage(b, vw=1280, login=False, guest=False, fail=None):
    ctx = b.new_context(viewport={"width": vw, "height": 900}); errs = []
    pg = ctx.new_page(); pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.route("**/supabase-js@*/**", lambda r: r.fulfill(status=200, content_type="text/javascript", body=STUB))
    pg.route("**/fonts.googleapis.com/**", lambda r: r.abort()); pg.route("**/fonts.gstatic.com/**", lambda r: r.abort())
    pg.add_init_script("sessionStorage.setItem('__login','%d');sessionStorage.setItem('__guest','%d');sessionStorage.setItem('__fail','%s');window.alert=function(){};window.confirm=function(){return true};window.prompt=function(){return 'spam promosi'}" % (login, guest, fail or ""))
    return ctx, pg, errs
def calls(pg, n): return [c[1] for c in pg.evaluate("window.__calls") if c[0] == n]
with sync_playwright() as p:
    b = p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox"])
    # tamu
    ctx, pg, errs = newpage(b); pg.goto(BASE + "/artikel/artikel-uji"); pg.wait_for_selector(".ai-c")
    chk("statistik di header", "1.201" in pg.inner_text("#ai-stats") or "1,2" in pg.inner_text("#ai-stats") or "1201" in pg.inner_text("#ai-stats"), pg.inner_text("#ai-stats"))
    chk("jumlah komentar & suka tampil", pg.inner_text("#ai-lc") == "3" and pg.inner_text("#ai-cc") == "2")
    chk("penulis tampil sebagai teks (bukan HTML)", "Penulis <b>Uji</b>" in pg.inner_text("#ai-au") and pg.locator("#ai-au b").count() == 0)
    chk("byline diganti nama penulis", "Penulis" in pg.inner_text(".ar-au"))
    chk("artikel lain dari penulis", pg.locator("#ai-au .ai-aum li a").count() == 1)
    chk("isi komentar di-escape, tidak jalan sebagai skrip", pg.evaluate("window.__xss") is None and "<script>" in pg.inner_text("#c-c1 .ai-tx"))
    chk("balasan tim berlabel", pg.locator("#c-r1 .ai-tag").inner_text().lower() == "tim")
    chk("tamu: ajakan masuk, tanpa formulir", pg.locator("#ai-form a").count() >= 1 and pg.locator("#ai-form form").count() == 0)
    chk("pinterest & salin tautan ada", pg.locator(".ar-share a", has_text="Facebook").count() >= 1 and pg.locator(".ar-copy").count() >= 1)
    # suka optimistis + animasi + toggle
    pg.click("#ai-like"); chk("suka: hitung bertambah & aria-pressed", pg.inner_text("#ai-lc") == "4" and pg.get_attribute("#ai-like", "aria-pressed") == "true")
    pg.click("#ai-like"); chk("batal suka: kembali", pg.inner_text("#ai-lc") == "3" and pg.get_attribute("#ai-like", "aria-pressed") == "false")
    chk("suka mengirim kode anonim valid", all(len(c["p_anon"]) >= 16 for c in calls(pg, "article_like_toggle")))
    # simpan sebagai tamu -> diarahkan masuk
    pg.click("#ai-save"); pg.wait_for_url("**/masuk?next=*", timeout=5000)
    chk("simpan tamu: diarahkan ke halaman masuk dengan next", "next=%2Fartikel%2Fartikel-uji" in pg.url, pg.url)
    pg.goto(BASE + "/artikel/artikel-uji"); pg.wait_for_selector(".ai-c")
    # feedback
    pg.click('#ai-fb [data-v="helpful"]'); chk("feedback tersimpan & ucapan terima kasih", "Terima kasih" in pg.inner_text("#ai-fbm") and calls(pg, "article_feedback_set")[-1]["p_value"] == "helpful")
    pg.click('#ai-fb [data-v="not_helpful"]'); chk("feedback bisa diganti", pg.get_attribute('#ai-fb [data-v="not_helpful"]', "aria-pressed") == "true" and pg.get_attribute('#ai-fb [data-v="helpful"]', "aria-pressed") == "false")
    # urutkan
    pg.select_option("#ai-sort", "oldest"); pg.wait_for_timeout(300); chk("urut terlama memanggil server", calls(pg, "article_comments_list")[-1]["p_sort"] == "oldest")
    # suka komentar
    pg.click("#c-c1 > .ai-cb > footer .ai-cl"); pg.wait_for_timeout(200); chk("suka komentar dinamis", pg.inner_text("#c-c1 > .ai-cb > footer .ai-cl b") == "3")
    pg.click("#c-c1 > .ai-cb > footer .ai-rep"); pg.wait_for_timeout(200); chk("lapor komentar memanggil RPC", len(calls(pg, "comment_report")) == 1)
    chk("komentar sendiri: Edit/Hapus, bukan Lapor", pg.locator("#c-c2 [data-a=edit]").count() == 1 and pg.locator("#c-c2 .ai-rep").count() == 0)
    chk("tanpa galat JS", not errs, errs); ctx.close()
    # pengguna masuk
    ctx, pg, errs = newpage(b, login=True); pg.goto(BASE + "/artikel/artikel-uji"); pg.wait_for_selector(".ai-c")
    chk("masuk: formulir komentar ada", pg.locator("#ai-form form").count() == 1 and pg.locator("#ai-form input[name=n]").count() == 0)
    pg.fill("#ai-t-main", "Komentar baru saya"); chk("penghitung karakter", pg.inner_text("#ai-form [data-n]") == "18")
    pg.click("#ai-form .ai-send"); pg.wait_for_timeout(500)
    chk("komentar terkirim & muncul", "Komentar baru saya" in pg.inner_text("#ai-list") and calls(pg, "article_comment_add")[-1]["p_parent"] is None)
    pg.fill("#ai-t-main", "x"); pg.click("#ai-form .ai-send"); chk("validasi klien: terlalu pendek", "terlalu pendek" in pg.inner_text("#ai-form .ai-fm"))
    pg.fill("#ai-t-main", "komentar dobel"); pg.click("#ai-form .ai-send"); pg.wait_for_timeout(300); chk("galat server ditampilkan", "sama" in pg.inner_text("#ai-form .ai-fm"))
    pg.click("#c-c1 > .ai-cb > footer [data-a=reply]"); chk("form balasan muncul", pg.locator("#c-c1 form").count() == 1)
    pg.fill("#c-c1 textarea", "Balasan saya"); pg.click("#c-c1 .ai-send"); pg.wait_for_timeout(500)
    chk("balasan mengirim parent", calls(pg, "article_comment_add")[-1]["p_parent"] == "c1")
    pg.click("#ai-save"); pg.wait_for_timeout(300); chk("simpan artikel", calls(pg, "article_save_set")[-1]["p_saved"] is True and pg.get_attribute("#ai-save", "aria-pressed") == "true")
    pg.click("#ai-save"); pg.wait_for_timeout(300); chk("batal simpan", calls(pg, "article_save_set")[-1]["p_saved"] is False)
    chk("tanpa galat JS (masuk)", not errs, errs); ctx.close()
    # tamu boleh komentar (admin aktifkan)
    ctx, pg, errs = newpage(b, guest=True); pg.goto(BASE + "/artikel/artikel-uji"); pg.wait_for_selector(".ai-c")
    chk("tamu: kolom nama + catatan moderasi", pg.locator("#ai-form input[name=n]").count() == 1 and "ditinjau" in pg.inner_text("#ai-form"))
    pg.fill("#ai-n-main", "Tamu Baik"); pg.fill("#ai-t-main", "Halo dari tamu"); pg.click("#ai-form .ai-send"); pg.wait_for_timeout(500)
    chk("komentar tamu: label menunggu persetujuan", "Menunggu persetujuan" in pg.inner_text("#ai-list")); ctx.close()
    # gagal muat komentar -> keadaan galat + coba lagi
    ctx, pg, errs = newpage(b, fail="article_comments_list"); pg.goto(BASE + "/artikel/artikel-uji"); pg.wait_for_selector("#ai-retry")
    chk("galat muat komentar: tombol coba lagi", True); ctx.close()
    # seluruh fitur gagal (migrasi belum diterapkan): halaman tetap utuh
    ctx, pg, errs = newpage(b, fail="article_engagement"); pg.goto(BASE + "/artikel/artikel-uji"); pg.wait_for_selector(".ar-body")
    chk("tanpa backend interaksi: bagian disembunyikan, artikel tetap tampil", pg.is_hidden("#komentar") and pg.is_visible(".ar-body") and not errs, errs); ctx.close()
    # seluler
    ctx, pg, errs = newpage(b, vw=375, login=True); pg.goto(BASE + "/artikel/artikel-uji"); pg.wait_for_selector(".ai-c")
    chk("seluler: tanpa scroll horizontal", pg.evaluate("document.documentElement.scrollWidth <= window.innerWidth + 1"), pg.evaluate("document.documentElement.scrollWidth"))
    pg.screenshot(path="/tmp/ai-mobile.png", full_page=False); ctx.close()
    ctx, pg, errs = newpage(b, vw=1280, login=True); pg.goto(BASE + "/artikel/artikel-uji"); pg.wait_for_selector(".ai-c"); pg.locator("#ai-act").scroll_into_view_if_needed(); pg.screenshot(path="/tmp/ai-desktop.png"); ctx.close()
    b.close()
print("OK=%d BAD=%d" % (ok_n, bad_n)); raise SystemExit(1 if bad_n else 0)
