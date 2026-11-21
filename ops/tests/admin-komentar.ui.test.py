# Uji UI admin: Interaksi Artikel (moderasi, laporan, statistik, pengaturan, penulis, izin). Backend ditiru; logika data di artikel-interaksi.test.sql.
import http.server, socketserver, threading, os, json
from playwright.sync_api import sync_playwright
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
    def translate_path(self, p):
        p = p.split("?")[0]; p = {"/admin": "/admin.html"}.get(p, p)
        return os.path.join(ROOT, p.lstrip("/"))
srv = socketserver.TCPServer(("127.0.0.1", 0), Q); BASE = "http://127.0.0.1:%d" % srv.server_address[1]
threading.Thread(target=srv.serve_forever, daemon=True).start()
ok_n = bad_n = 0
def chk(n, c, d=""):
    global ok_n, bad_n
    if c: ok_n += 1; print("PASS", n)
    else: bad_n += 1; print("FAIL", n, d)
STUB = r"""window.__calls=[];
var PERMS=JSON.parse(sessionStorage.getItem('__perms')||'null')||['dashboard.read','content.read','content.write','content.delete'];
var NOW=new Date().toISOString();
var C=[{id:'c1',content_id:'a1',title:'Artikel Satu',slug:'artikel-satu',name:'Rani',full_name:'Rani Lestari',guest:false,team:false,body:'<img src=x onerror=window.__xss=1> halo',status:'pending',likes:1,deleted:false,reports:0,created_at:NOW},
 {id:'c2',content_id:'a1',title:'Artikel Satu',slug:'artikel-satu',name:'Tamu',full_name:null,guest:true,team:false,body:'beli murah',status:'approved',likes:0,deleted:false,reports:2,created_at:NOW}];
var SET={comments_enabled:true,guest_comments:false,premoderate:false,max_links:2,blocked_words:['judi'],max_length:2000};
var AU=[{id:'u1',name:'Tim Editorial NusaMora',bio:'Bio',avatar_url:null,links:[],is_default:true}];
function ok(d){return Promise.resolve({data:d===undefined?null:d,error:null})}
function qb(){var o={};['select','order','range','or','in','eq','limit','neq','gte','lte','ilike','not','is','maybeSingle'].forEach(function(m){o[m]=function(){return o}});o.then=function(a,b){return Promise.resolve({data:[],error:null}).then(a,b)};return o}
window.supabase={createClient:function(){return{from:qb,
 rpc:function(n,a){window.__calls.push([n,a]);
  if(n==='my_admin')return ok({role:'super_admin',perms:PERMS,mfa:{needed:false}});
  if(n==='admin_comments_list'){var it=C.filter(function(x){return !a.p_status||x.status===a.p_status});return ok({total:it.length,items:it,counts:{}})}
  if(n==='admin_reports_list')return ok([{comment_id:'c2',body:'beli murah',status:'approved',name:'Tamu',title:'Artikel Satu',slug:'artikel-satu',count:2,reasons:['spam promosi','iklan'],first_at:NOW}]);
  if(n==='admin_article_stats')return ok([{id:'a1',title:'Artikel Satu',slug:'artikel-satu',lang:'id',status:'published',views:120,likes:5,comments:2,pending:1,fb_helpful:3,fb_somewhat:1,fb_not:0,comments_enabled:true}]);
  if(n==='admin_article_settings_get')return ok(SET);
  if(n==='admin_author_list')return ok(AU);
  if(n.indexOf('admin_')===0)return ok({ok:true});
  return ok([])},
 storage:{from:function(){return{}}},functions:{invoke:function(){return ok({})}},
 auth:{getSession:function(){return Promise.resolve({data:{session:{access_token:'t',user:{id:'u1',email:'adm@uji.test'}}}})},signOut:function(){return Promise.resolve({})},onAuthStateChange:function(){return{data:{subscription:{unsubscribe:function(){}}}}}}}}};"""
def newpage(b, vw=1280, perms=None):
    ctx = b.new_context(viewport={"width": vw, "height": 900}); errs = []
    pg = ctx.new_page(); pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.route("**/supabase-js@*/**", lambda r: r.fulfill(status=200, content_type="text/javascript", body=STUB))
    pg.route("**/fonts.googleapis.com/**", lambda r: r.abort()); pg.route("**/fonts.gstatic.com/**", lambda r: r.abort())
    if perms: pg.add_init_script("sessionStorage.setItem('__perms', %s)" % json.dumps(json.dumps(perms)))
    return ctx, pg, errs
def calls(pg, n): return [c[1] for c in pg.evaluate("window.__calls") if c[0] == n]
def go(pg, tab, sel): pg.goto(BASE + "/admin#article-interaction:" + tab); pg.wait_for_selector(sel, timeout=15000)
with sync_playwright() as p:
    b = p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox"])
    ctx, pg, errs = newpage(b); go(pg, "mod", ".ik-c")
    chk("daftar komentar tampil, HTML di-escape", pg.locator(".ik-c").count() == 2 and pg.evaluate("window.__xss") is None and "<img" in pg.inner_text(".ik-c"))
    chk("badge tamu & laporan", "Tamu" in pg.inner_text("#view") and "2 laporan" in pg.inner_text("#view"))
    pg.select_option("#ik-st", "pending"); pg.wait_for_timeout(400); chk("filter status memanggil server", calls(pg, "admin_comments_list")[-1]["p_status"] == "pending" and pg.locator(".ik-c").count() == 1)
    pg.click('[data-act="approved"]'); pg.wait_for_timeout(300); chk("setujui", calls(pg, "admin_comment_set_status")[-1] == {"p_id": "c1", "p_status": "approved"})
    pg.click('[data-act="reply"]'); pg.fill("#ik-rb", "Terima kasih"); pg.click("dialog form button[type=submit]"); pg.wait_for_timeout(300)
    chk("balas sebagai tim", calls(pg, "admin_comment_reply")[-1]["p_body"] == "Terima kasih")
    pg.click('[data-act="delete"]'); pg.click("#cdlg-y"); pg.wait_for_timeout(300); chk("hapus lewat konfirmasi", len(calls(pg, "admin_comment_delete")) == 1)
    go(pg, "rep", ".ik-c"); chk("laporan: alasan tampil", "spam promosi" in pg.inner_text("#view"))
    pg.click('[data-act="spam"]'); pg.wait_for_timeout(300); chk("laporan ditandai spam", calls(pg, "admin_report_resolve")[-1] == {"p_comment": "c2", "p_action": "spam"})
    go(pg, "stat", "table"); chk("statistik tampil", "120" in pg.inner_text("table"))
    pg.click('[data-act="flag"]'); pg.wait_for_timeout(300); chk("matikan komentar per artikel", calls(pg, "admin_article_flag_set")[-1] == {"p_content": "a1", "p_enabled": False})
    go(pg, "set", "#ik-form"); pg.check("#ik-guest_comments"); pg.fill("#ik-blocked_words", "judi\nslot"); pg.click("#ik-form button[type=submit]"); pg.wait_for_timeout(400)
    sv = {c["p_key"]: c["p_value"] for c in calls(pg, "admin_article_settings_set")}
    chk("pengaturan tersimpan", sv.get("guest_comments") is True and sv.get("blocked_words") == ["judi", "slot"] and sv.get("max_links") == 2, sv)
    go(pg, "au", ".ik-c"); pg.click("#ik-an"); pg.fill("#au-n", "Dina"); pg.fill("#au-l", "Instagram | https://instagram.com/dina"); pg.click("dialog form button[type=submit]"); pg.wait_for_timeout(300)
    a = calls(pg, "admin_author_save")[-1]; chk("penulis baru tersimpan dengan tautan", a["p_name"] == "Dina" and a["p_links"] == [{"label": "Instagram", "url": "https://instagram.com/dina"}], a)
    chk("tanpa galat JS", not errs, errs); ctx.close()
    ctx, pg, errs = newpage(b, perms=["dashboard.read", "content.read"]); go(pg, "mod", ".ik-c")
    chk("hanya-baca: tanpa tombol aksi", pg.locator("[data-act]").count() == 0); ctx.close()
    ctx, pg, errs = newpage(b, vw=375); go(pg, "mod", ".ik-c")
    chk("seluler: tanpa scroll horizontal", pg.evaluate("document.documentElement.scrollWidth <= window.innerWidth + 1"), pg.evaluate("document.documentElement.scrollWidth")); ctx.close()
    b.close()
print("OK=%d BAD=%d" % (ok_n, bad_n)); raise SystemExit(1 if bad_n else 0)
