# Uji UI admin: Customer Support: form tiket pelanggan (lampiran, riwayat, tutup) dan panel admin (daftar, tab, SLA, penugasan, percakapan, catatan internal).
# Backend ditiru di browser (window.supabase stub) hanya untuk menguji antarmuka; logika data diuji di ops/tests/admin-customers.test.sql.
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
STUB = r"""window.__calls=[];window.__up=[];window.__tk=JSON.parse(sessionStorage.getItem('__tk')||'null')||[];
var PERMS=JSON.parse(sessionStorage.getItem('__perms')||'null')||['dashboard.read','support.read','support.write'];
var NOW=Date.now(),H=36e5,iso=function(n){return new Date(NOW+n*H).toISOString()};
var LIST=[
 {id:'k1',subject:'Bayar belum aktif <img src=x onerror=window.__xss=1>',category:'pembayaran',priority:'tinggi',status:'open',created_at:iso(-10),updated_at:iso(-9),due_at:iso(-6),first_response_at:null,sla:'terlambat',assigned_to:null,mine:false,unassigned:true,assigned_name:null,owner_name:'Sari',owner_email:'sari@uji.test',reply_count:0,file_count:2},
 {id:'k2',subject:'Cara ganti template',category:'bantuan',priority:'normal',status:'menunggu_pelanggan',created_at:iso(-30),updated_at:iso(-2),due_at:iso(-6),first_response_at:iso(-20),sla:'terpenuhi',assigned_to:'a1',mine:true,unassigned:false,assigned_name:'Admin Uji',owner_name:'Budi',owner_email:'budi@uji.test',reply_count:2,file_count:0},
 {id:'k3',subject:'Komplain tampilan',category:'komplain',priority:'tinggi',status:'diproses',created_at:iso(-3),updated_at:iso(-1),due_at:iso(1),first_response_at:null,sla:'berjalan',assigned_to:'a2',mine:false,unassigned:false,assigned_name:'Support Dua',owner_name:'Dewi',owner_email:'dewi@uji.test',reply_count:1,file_count:0}];
var REPLIES=[{id:'r1',body:'Silakan cek menu Template.',is_staff:true,is_internal:false,created_at:iso(-20),author:'Admin Uji',files:[]},{id:'r2',body:'Pelanggan ini VIP <b>x</b>',is_staff:true,is_internal:true,created_at:iso(-19),author:'Admin Uji',files:[]},{id:'r3',body:'Sudah, terima kasih',is_staff:false,is_internal:false,created_at:iso(-2),author:null,files:[{id:'f9',path:'c1/k2/z.png',name:'layar.png',size:1000}]}];
function ok(d){return Promise.resolve({data:d===undefined?null:d,error:null})}
window.supabase={createClient:function(){return{
 from:function(t){var o={select:function(){return o},eq:function(){return o},order:function(){return o},limit:function(){return o},maybeSingle:function(){return o},range:function(){return o},or:function(){return o},in:function(){return o},gte:function(){return o},lte:function(){return o},lt:function(){return o},gt:function(){return o},neq:function(){return o},ilike:function(){return o},is:function(){return o},not:function(){return o},then:function(a,b){return Promise.resolve({data:t==='profiles'?{full_name:'Sari Uji'}:[],error:null,count:0}).then(a,b)}};return o},
 rpc:function(n,a){window.__calls.push([n,a]);
  if(n==='my_admin')return ok({role:'support',perms:PERMS,mfa:{needed:false}});
  if(n==='admin_list_tickets')return ok(LIST);
  if(n==='admin_support_overview')return ok({open:3,unassigned:1,overdue:1,resolved_30d:7,avg_first_response_hours:3.5});
  if(n==='admin_support_admins')return ok([{id:'a1',name:'Admin Uji',role:'super_admin'},{id:'a2',name:'Support Dua',role:'support'}]);
  if(n==='admin_ticket_detail'){var t=LIST.filter(function(x){return x.id===a.p_id})[0];return ok({ticket:Object.assign({},t,{message:'Isi pesan awal pelanggan',resolved_at:null,closed_at:null}),customer:{id:'c1',full_name:t.owner_name,email:t.owner_email,whatsapp:'0812',ticket_count:3},replies:t.id==='k2'?REPLIES:[],files:t.id==='k1'?[{id:'f1',path:'c1/k1/a.png',name:'bukti.png',size:2000}]:[],history:[{at:iso(-1),action:'update',by:'Admin Uji',change:{status:['open','diproses']}}]})}
  if(n==='admin_ticket_reply'){if(a.p_body==='tutup')return ok({error:'tiket_ditutup'});return ok({ok:true,id:'rx'})}
  if(n==='admin_ticket_set_status'||n==='admin_ticket_set_priority'||n==='admin_ticket_assign')return ok({ok:true});
  if(n==='my_notifications')return ok([]);
  if(n==='support_my_tickets')return ok(window.__tk||[]);
  if(n==='support_create_ticket'){window.__tk=[{id:'n1',subject:a.p_subject,category:a.p_category,status:'open',message:a.p_message,created_at:iso(0),updated_at:iso(0),replies:[],files:[]}];return ok('n1')}
  if(n==='support_reply_v2')return ok('rr1');
  if(n==='support_add_attachment')return ok('att1');
  if(n==='support_close'){window.__tk[0].status='ditutup';return ok()}
  return ok([])},
 storage:{from:function(b){return{upload:function(p,f,o){window.__up.push([b,p,f.name,o.contentType]);return ok({path:p})},createSignedUrl:function(p){window.__signed=p;return ok({signedUrl:'https://files.test/'+p+'?t=1'})}}}},
 auth:{getSession:function(){return Promise.resolve({data:{session:{access_token:'tok',user:{id:'a1',email:'adm@uji.test'}}}})},getUser:function(){return Promise.resolve({data:{user:{id:'c1',email:'sari@uji.test',email_confirmed_at:'2026-01-01'}}})},signOut:function(){return Promise.resolve({})},onAuthStateChange:function(){return{data:{subscription:{unsubscribe:function(){}}}}}}}}};"""
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

SYNC = []

PNG = bytes.fromhex("89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c6360000002000001e221bc330000000049454e44ae426082")
with sync_playwright() as pw:
    b = pw.chromium.launch()
    # ---------- pelanggan ----------
    ctx, pg, errs = newpage(b); pg.goto(BASE + "/akun#bantuan")
    pg.wait_for_selector("#f-tk", timeout=8000)
    chk("pelanggan: form tiket punya kategori, subjek, pesan, screenshot", pg.locator("#tk-cat, #tk-sub, #tk-msg, #tk-file").count() == 4 and "Riwayat tiket saya" in txt(pg))
    pg.fill("#tk-sub", "Bayar belum aktif"); pg.fill("#tk-msg", "Sudah bayar tadi pagi")
    pg.set_input_files("#tk-file", [{"name": "a.png", "mimeType": "image/png", "buffer": PNG}, {"name": "b.gif", "mimeType": "image/gif", "buffer": b"GIF89a"}])
    pg.click("#tk-go")
    chk("lampiran bukan PNG/JPG/WebP ditolak sebelum dikirim", "Hanya PNG" in pg.inner_text("#e-tkf") and not any(c[0] == "support_create_ticket" for c in pg.evaluate("window.__calls")))
    pg.set_input_files("#tk-file", [{"name": "a.png", "mimeType": "image/png", "buffer": PNG}])
    pg.click("#tk-go"); pg.wait_for_function("window.__calls.some(c=>c[0]==='support_add_attachment')")
    up = pg.evaluate("window.__up"); c = [c for c in pg.evaluate("window.__calls") if c[0] == "support_add_attachment"][0][1]
    chk("unggah ke bucket privat ticket-files di folder milik sendiri (uid/tiket/)", len(up) == 1 and up[0][0] == "ticket-files" and up[0][1].startswith("a1/n1/") and up[0][1].endswith(".png"), up)
    chk("lampiran didaftarkan lewat RPC dengan tipe & ukuran", c["p_ticket"] == "n1" and c["p_mime"] == "image/png" and c["p_path"] == up[0][1] and c["p_size"] > 0, c)
    pg.wait_for_selector("details.tk")
    t = txt(pg, "#tk-list")
    chk("riwayat: tiket tampil dengan status Dibuka", "Bayar belum aktif" in t and "Dibuka" in t, t)
    pg.evaluate("window.__tk[0].status='menunggu_pelanggan';window.__tk[0].replies=[{id:'r1',body:'Mohon kirim bukti transfer',is_staff:true,created_at:new Date().toISOString(),files:[]}];window.__tk[0].files=[{id:'f1',path:'c1/n1/q.png',name:'a.png'}];sessionStorage.setItem('__tk',JSON.stringify(window.__tk))")
    pg.reload(); pg.wait_for_selector("details.tk"); pg.click("details.tk summary")
    t = txt(pg, "#tk-list")
    chk("status Waiting for Customer tampil jelas + balasan Tim NusaMora", "Menunggu balasan Anda" in t and "Tim kami menunggu balasan Anda" in t and "Tim NusaMora" in t and "Mohon kirim bukti transfer" in t, t)
    pg.click("[data-file]"); pg.wait_for_function("window.__signed")
    chk("lampiran dibuka lewat tautan bertanda tangan sementara (bukan URL publik)", pg.evaluate("window.__signed") == "c1/n1/q.png")
    pg.fill(".rf textarea", "Ini bukti transfernya"); pg.set_input_files(".rf input[type=file]", [{"name": "bukti.png", "mimeType": "image/png", "buffer": PNG}]); pg.click(".rf button")
    pg.wait_for_function("window.__calls.some(c=>c[0]==='support_reply_v2')")
    pg.wait_for_function("window.__calls.filter(c=>c[0]==='support_add_attachment').length===1")
    c = [c for c in pg.evaluate("window.__calls") if c[0] == "support_add_attachment"][-1][1]
    chk("balasan pelanggan memakai support_reply_v2 dan lampiran terhubung ke balasan", c["p_reply"] == "rr1" and c["p_ticket"] == "n1", c)
    pg.reload(); pg.wait_for_selector("details.tk"); pg.click("details.tk summary"); pg.click("[data-close]")
    chk("tutup tiket butuh dua klik (konfirmasi)", not any(c[0] == "support_close" for c in pg.evaluate("window.__calls")) and "Yakin" in pg.inner_text("[data-close]"))
    pg.click("[data-close]"); pg.wait_for_function("window.__calls.some(c=>c[0]==='support_close')")
    pg.wait_for_function("document.querySelector('#tk-list').innerText.includes('Ditutup')")
    chk("tiket ditutup: status Ditutup, tidak ada form balas", pg.locator(".rf").count() == 0)
    chk("pelanggan: tanpa galat JavaScript", not errs, errs); ctx.close()
    # ---------- admin ----------
    ctx, pg, errs = newpage(b); pg.goto(BASE + "/admin#support"); pg.wait_for_selector("#tb tr.row")
    t = txt(pg, "#tb")
    chk("admin: 3 tiket, prioritas, status, penanggung jawab, SLA", pg.locator("#tb tr.row").count() == 3 and "Belum ditugaskan" in t and "Terlambat" in t and "Support Dua" in t and "Menunggu pelanggan" in t, t)
    chk("admin: judul di-escape (tanpa XSS)", pg.evaluate("window.__xss") is None and pg.locator("#tb img[src='x']").count() == 0)
    chk("tab: Semua, Tiket saya, Belum ditugaskan, Terlambat SLA, Komplain, Pertanyaan, Ringkasan", [x.strip() for x in pg.locator(".tabs button").all_inner_texts()] == ["Semua tiket", "Tiket saya", "Belum ditugaskan", "Terlambat SLA", "Komplain", "Pertanyaan", "Ringkasan SLA"], pg.locator(".tabs button").all_inner_texts())
    for tab, want in [("mine", "Cara ganti template"), ("unassigned", "Bayar belum aktif"), ("late", "Bayar belum aktif"), ("kom", "Komplain tampilan")]:
        pg.click("[data-tab=%s]" % tab); pg.wait_for_function("document.querySelectorAll('#tb tr.row').length===1 && document.querySelector('#tb').innerText.includes(%s)" % json.dumps(want))
        chk("tab %s hanya memuat tiket yang tepat" % tab, pg.locator("#tb tr.row").count() == 1)
    pg.click("[data-tab=rep]"); pg.wait_for_selector(".stats")
    chk("ringkasan SLA: aktif, terlambat, rata-rata respons", "3.5 jam" in txt(pg) and "Terlambat SLA" in txt(pg) and "4 jam" in txt(pg))
    pg.goto(BASE + "/admin#support:all:k2"); pg.wait_for_selector(".dhead"); t = txt(pg)
    chk("detail: percakapan lengkap, catatan internal ditandai, lampiran pelanggan", "Silakan cek menu Template" in t and "Catatan internal (tidak terlihat pelanggan)" in t and "layar.png" in t and "Isi pesan awal pelanggan" in t, t[:700])
    chk("detail: HTML di catatan di-escape", pg.locator(".rp b:not(:first-child)").count() == 0 and "<b>x</b>" in t)
    chk("detail: riwayat perubahan status", "open" in t and "diproses" in t.lower() and "Riwayat perubahan" in t)
    chk("detail: opsi status Open/In Progress/Waiting/Resolved/Closed", pg.evaluate("[...document.querySelectorAll('.t-st option')].map(o=>o.textContent)") == ["Open", "In Progress", "Waiting for Customer", "Resolved", "Closed"])
    pg.select_option(".t-st", "selesai"); pg.wait_for_function("window.__calls.some(c=>c[0]==='admin_ticket_set_status')")
    pg.select_option(".t-pr", "rendah"); pg.wait_for_function("window.__calls.some(c=>c[0]==='admin_ticket_set_priority')")
    pg.wait_for_selector(".t-as"); pg.select_option(".t-as", "a2"); pg.wait_for_function("window.__calls.some(c=>c[0]==='admin_ticket_assign')")
    cs = {c[0]: c[1] for c in pg.evaluate("window.__calls")}
    chk("status, prioritas, penugasan memanggil RPC yang tepat", cs["admin_ticket_set_status"]["p_status"] == "selesai" and cs["admin_ticket_set_priority"]["p_priority"] == "rendah" and cs["admin_ticket_assign"]["p_admin"] == "a2", cs)
    pg.wait_for_selector("#t-rf"); pg.fill("#t-body", "Terima kasih, sudah kami bantu"); pg.select_option("#t-ns", "selesai"); pg.click("#t-rf button")
    pg.wait_for_function("window.__calls.some(c=>c[0]==='admin_ticket_reply')")
    c = [c for c in pg.evaluate("window.__calls") if c[0] == "admin_ticket_reply"][-1][1]
    chk("balasan ke pelanggan: bukan internal, status dipilih", c == {"p_id": "k2", "p_body": "Terima kasih, sudah kami bantu", "p_internal": False, "p_status": "selesai"}, c)
    pg.wait_for_selector("#t-rf"); pg.fill("#t-body", "catatan staf"); pg.check("#t-int"); pg.click("#t-rf button")
    pg.wait_for_function("window.__calls.filter(c=>c[0]==='admin_ticket_reply').length===2")
    c = [c for c in pg.evaluate("window.__calls") if c[0] == "admin_ticket_reply"][-1][1]
    chk("catatan internal dikirim dengan p_internal=true tanpa ubah status", c["p_internal"] is True and c["p_status"] is None, c)
    pg.wait_for_selector("#t-rf"); pg.fill("#t-body", "tutup"); pg.click("#t-rf button"); pg.wait_for_selector(".toast.bad")
    chk("balas tiket ditutup: pesan jelas dari backend", "sudah ditutup" in txt(pg, "#toasts"))
    pg.click("[data-file]"); pg.wait_for_function("window.__signed")
    chk("admin membuka lampiran lewat URL bertanda tangan", pg.evaluate("window.__signed") == "c1/k2/z.png")
    chk("admin: tanpa galat JavaScript", not errs, errs); ctx.close()
    # baca saja
    ctx, pg, errs = newpage(b, perms=["dashboard.read", "support.read"]); pg.goto(BASE + "/admin#support:all:k2"); pg.wait_for_selector(".dhead")
    chk("izin baca saja: form balas hilang dan pengaturan terkunci", pg.locator("#t-rf").count() == 0 and pg.locator(".t-st:disabled").count() == 1)
    ctx.close(); ctx, pg, errs = newpage(b, vw=375); pg.goto(BASE + "/admin#support:all:k2"); pg.wait_for_selector(".dhead")
    chk("mobile 375px: tanpa scroll horizontal", pg.evaluate("document.documentElement.scrollWidth <= window.innerWidth + 1"))
    b.close()
print("\n%d lulus, %d gagal" % (ok_n, bad_n)); raise SystemExit(1 if bad_n else 0)
