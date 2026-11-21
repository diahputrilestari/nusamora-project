# Uji UI dashboard pelanggan: Artikel Saya (disimpan, kabar komentar, preferensi notifikasi).
import http.server, socketserver, threading, os
from playwright.sync_api import sync_playwright
ROOT=os.path.abspath(os.path.join(os.path.dirname(__file__),"..",".."))
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*a): pass
    def translate_path(self,p):
        p=p.split("?")[0]; p={"/akun":"/akun.html"}.get(p,p); return os.path.join(ROOT,p.lstrip("/"))
srv=socketserver.TCPServer(("127.0.0.1",0),Q); BASE="http://127.0.0.1:%d"%srv.server_address[1]; threading.Thread(target=srv.serve_forever,daemon=True).start()
STUB=r"""window.__c=[];function ok(d){return Promise.resolve({data:d===undefined?null:d,error:null})}
function qb(){var o={};['select','order','range','or','in','eq','limit','neq','maybeSingle','single'].forEach(function(m){o[m]=function(){return o}});o.then=function(a,b){return Promise.resolve({data:[],error:null}).then(a,b)};return o}
window.supabase={createClient:function(){return{from:qb,rpc:function(n,a){window.__c.push([n,a]);
 if(n==='my_saved_articles')return ok([{title:'Artikel <b>Simpan</b>',slug:'simpan',lang:'id',excerpt:'ringkas',read_min:4,saved_at:new Date().toISOString()}]);
 if(n==='my_article_notifs')return ok({unread:1,items:[{id:'1',kind:'reply',actor:'Rani',title:'Artikel X',slug:'x',created_at:new Date().toISOString(),read:false}]});
 if(n==='article_notif_prefs_get')return ok({reply:true,approved:true,reaction:false});
 if(n==='article_notif_prefs_set')return ok(a?{reply:a.p_reply,approved:a.p_approved,reaction:a.p_reaction}:{});
 if(n==='article_save_set')return ok({ok:true,saved:false});
 return ok(null)},
 auth:{getSession:function(){return Promise.resolve({data:{session:{access_token:'t',user:{id:'u1',email:'a@b.c',user_metadata:{}}}}})},getUser:function(){return Promise.resolve({data:{user:{id:'u1',email:'a@b.c'}}})},signOut:function(){return Promise.resolve({})},onAuthStateChange:function(){return{data:{subscription:{unsubscribe:function(){}}}}}},storage:{from:function(){return{}}}}}};"""
with sync_playwright() as p:
    b=p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox"]); pg=b.new_page(); errs=[]; pg.on("pageerror",lambda e:errs.append(str(e)))
    pg.route("**/supabase-js@*/**",lambda r:r.fulfill(status=200,content_type="text/javascript",body=STUB)); pg.route("**/fonts.*/**",lambda r:r.abort())
    pg.goto(BASE+"/akun#artikel"); pg.wait_for_selector("[data-unsave]",timeout=15000)
    t=pg.inner_text("#view"); print("escape", "<b>Simpan</b>" in t, "reply", "Rani membalas komentarmu" in t, "nav", "Artikel Saya" in pg.inner_text("#nav"))
    print("reaction unchecked", not pg.is_checked("#ak-pf [name=reaction]"))
    pg.uncheck("#ak-pf [name=reply]"); pg.click("#ak-pf button"); pg.wait_for_timeout(300); print([c for c in pg.evaluate("window.__c") if c[0]=="article_notif_prefs_set"])
    pg.click("[data-unsave]"); pg.wait_for_timeout(300); print("empty after unsave", "Belum ada artikel tersimpan" in pg.inner_text("#view"), errs)
