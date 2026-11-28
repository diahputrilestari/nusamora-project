# Uji UI dashboard pelanggan: tombol Perpanjang per undangan (after-sales A). Supabase di-stub; tidak ada jaringan/pembayaran sungguhan.
import http.server, socketserver, threading, os, sys
from playwright.sync_api import sync_playwright
ROOT=os.path.abspath(os.path.join(os.path.dirname(__file__),"..",".."))
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*a): pass
    def translate_path(self,p):
        p=p.split("?")[0]; p={"/akun":"/akun.html"}.get(p,p); return os.path.join(ROOT,p.lstrip("/"))
srv=socketserver.TCPServer(("127.0.0.1",0),Q); BASE="http://127.0.0.1:%d"%srv.server_address[1]; threading.Thread(target=srv.serve_forever,daemon=True).start()
STUB=r"""window.__c=[];window.__mode='ok';function ok(d){return Promise.resolve({data:d===undefined?null:d,error:null})}
var D=new Date(),F=new Date(D.getTime()+10*864e5).toISOString(),P=new Date(D.getTime()-5*864e5).toISOString();
var INV=[{id:'11111111-1111-4111-8111-111111111111',title:'Aktif',status:'aktif',plan_id:'essential',package_type:'essential',expires_at:F,created_at:D.toISOString(),public_url:'https://nusamora.com/a'},
 {id:'22222222-2222-4222-8222-222222222222',title:'Habis',status:'nonaktif',plan_id:'signature',package_type:'signature',expires_at:P,created_at:D.toISOString()},
 {id:'33333333-3333-4333-8333-333333333333',title:'Draft',status:'draft',package_type:'essential',created_at:D.toISOString()},
 {id:'44444444-4444-4444-8444-444444444444',title:'Refund',status:'nonaktif',plan_id:'luxe',package_type:'luxe',expires_at:F,created_at:D.toISOString()}];
function qb(t){var o={};['select','order','range','or','in','eq','limit','neq','maybeSingle','single'].forEach(function(m){o[m]=function(){return o}});o.then=function(a,b){return Promise.resolve({data:t==='invitations'?INV:[],error:null}).then(a,b)};return o}
window.supabase={createClient:function(){return{from:qb,rpc:function(n,a){window.__c.push([n,a]);return ok(null)},
 functions:{invoke:function(n,o){window.__c.push([n,o.body]);
   if(window.__mode==='err')return Promise.resolve({data:null,error:{message:'x',context:{json:function(){return Promise.resolve({error:'upgrade_belum_didukung',message:'Perpanjangan dengan paket lebih tinggi belum tersedia.'})}}}});
   return Promise.resolve({data:{ok:true,redirect_url:'javascript:alert(1)'},error:null})}},
 auth:{getSession:function(){return Promise.resolve({data:{session:{access_token:'t',user:{id:'u1',email:'a@b.c',user_metadata:{}}}}})},getUser:function(){return Promise.resolve({data:{user:{id:'u1',email:'a@b.c'}}})},signOut:function(){return Promise.resolve({})},onAuthStateChange:function(){return{data:{subscription:{unsubscribe:function(){}}}}}},storage:{from:function(){return{}}}}}};"""
fails=[]
def ok(n,c):
    print(("PASS " if c else "FAIL ")+n)
    if not c: fails.append(n)
with sync_playwright() as p:
    b=p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox"]); pg=b.new_page(); errs=[]; pg.on("pageerror",lambda e:errs.append(str(e)))
    pg.on("dialog",lambda d:d.accept())
    pg.route("**/supabase-js@*/**",lambda r:r.fulfill(status=200,content_type="text/javascript",body=STUB)); pg.route("**/fonts.*/**",lambda r:r.abort())
    pg.goto(BASE+"/akun#undangan"); pg.wait_for_selector("li.inv",timeout=15000)
    ids=pg.eval_on_selector_all("[data-renew]","e=>e.map(x=>x.dataset.renew+'|'+x.dataset.plan)")
    ok("tombol Perpanjang hanya untuk aktif & yang sudah habis (bukan draft / nonaktif sebelum habis)", sorted(ids)==sorted(['11111111-1111-4111-8111-111111111111|essential','22222222-2222-4222-8222-222222222222|signature']))
    pg.click("[data-renew='11111111-1111-4111-8111-111111111111']"); pg.wait_for_timeout(300)
    c=[x for x in pg.evaluate("window.__c") if x[0]=="midtrans-checkout"]
    ok("klik memanggil midtrans-checkout action renew tanpa harga dari klien", len(c)==1 and c[0][1]=={"action":"renew","invitation_id":"11111111-1111-4111-8111-111111111111","plan_id":"essential"})
    ok("redirect_url bukan https tidak diikuti", pg.url.startswith(BASE))
    pg.evaluate("window.__mode='err'"); pg.click("[data-renew='22222222-2222-4222-8222-222222222222']"); pg.wait_for_timeout(400)
    ok("pesan penolakan server ditampilkan", "paket lebih tinggi belum tersedia" in pg.inner_text("#toasts"))
    ok("tombol aktif kembali setelah gagal", pg.is_enabled("[data-renew='22222222-2222-4222-8222-222222222222']"))
    ok("tanpa error JavaScript", not errs)
    b.close()
srv.shutdown()
print("\n%d gagal" % len(fails)); sys.exit(1 if fails else 0)
