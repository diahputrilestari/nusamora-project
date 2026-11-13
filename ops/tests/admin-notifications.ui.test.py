# Uji UI admin: Notifikasi: pengumuman, riwayat pengiriman, template, aturan event, pengaturan, izin, mobile.
# Backend ditiru di browser (window.supabase stub) hanya untuk menguji antarmuka; logika data diuji di ops/tests/admin-notifications.test.sql.
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

STUB = r"""window.__calls=[];window.__inv=[];window.__ins=[];window.__upd=[];
var PERMS=JSON.parse(sessionStorage.getItem('__perms')||'null')||['dashboard.read','notifications.read','notifications.write'];
var NOW=Date.now(),H=36e5,iso=function(n){return new Date(NOW+n*H).toISOString()};
var ANN=[{id:'n1',title:'Promo <img src=x onerror=window.__xss=1>',body:'b',channel:'email',audience:'semua',status:'mengirim',scheduled_at:null,created_at:iso(-5)},{id:'n2',title:'Info Sistem',body:'b',channel:'system',audience:'semua',status:'terkirim',scheduled_at:null,created_at:iso(-9)},{id:'n3',title:'Draf WA',body:'Halo {{nama}}',channel:'whatsapp',audience:'admin',status:'draft',scheduled_at:null,created_at:iso(-2)},{id:'n4',title:'Gagal Kirim',body:'b',channel:'email',audience:'admin',status:'gagal',scheduled_at:null,created_at:iso(-20)}];
var OB=[{id:'o1',event:'payment_paid',channel:'email',recipient_kind:'customer',to_address:'dina@x.id',subject:'S',status:'delivered',attempts:1,max_attempts:3,next_attempt_at:iso(-1),last_error:null,created_at:iso(-1),sent_at:iso(-1),delivered_at:iso(-0.9),announcement_id:null},
 {id:'o2',event:'payment_paid',channel:'whatsapp',recipient_kind:'customer',to_address:'6281',subject:null,status:'sent',attempts:1,max_attempts:3,next_attempt_at:iso(-1),last_error:null,created_at:iso(-2),sent_at:iso(-2),delivered_at:null,announcement_id:null},
 {id:'o3',event:'ticket_reply',channel:'email',recipient_kind:'customer',to_address:'budi@x.id',subject:'S',status:'pending',attempts:1,max_attempts:3,next_attempt_at:iso(1),last_error:'HTTP 500',created_at:iso(-3),sent_at:null,delivered_at:null,announcement_id:null},
 {id:'o4',event:'welcome',channel:'email',recipient_kind:'customer',to_address:'siti@x.id',subject:'S',status:'failed',attempts:3,max_attempts:3,next_attempt_at:iso(-4),last_error:'Invalid to <b>x</b>',created_at:iso(-4),sent_at:null,delivered_at:null,announcement_id:null},
 {id:'o5',event:'payment_paid',channel:'whatsapp',recipient_kind:'customer',to_address:null,subject:null,status:'skipped',attempts:0,max_attempts:3,next_attempt_at:iso(-5),last_error:'Penerima belum punya nomor WhatsApp',created_at:iso(-5),sent_at:null,delivered_at:null,announcement_id:null},
 {id:'o6',event:'announcement',channel:'email',recipient_kind:'customer',to_address:'a@x.id',subject:'S',status:'sent',attempts:1,max_attempts:3,next_attempt_at:iso(-5),last_error:null,created_at:iso(-5),sent_at:iso(-5),delivered_at:null,announcement_id:'n1'}];
var TPL=[{id:'t1',key:'payment_paid',channel:'email',lang:'id',name:'Pembayaran berhasil (email)',subject:'Pembayaran {{order_id}} berhasil',body:'Halo {{nama}}',active:true,updated_at:iso(-30)},{id:'t2',key:'payment_paid',channel:'whatsapp',lang:'id',name:'Pembayaran berhasil (WA)',subject:null,body:'Halo {{nama}}',active:true,updated_at:iso(-30)},{id:'t3',key:'welcome',channel:'email',lang:'id',name:'Selamat datang <i>x</i>',subject:'Hai',body:'Hi',active:false,updated_at:iso(-30)}];
var RULES=[{event:'payment_paid',channel:'email',recipient:'customer',template_key:'payment_paid',enabled:true},{event:'payment_paid',channel:'whatsapp',recipient:'customer',template_key:'payment_paid',enabled:false},{event:'welcome',channel:'email',recipient:'customer',template_key:'welcome',enabled:false}];
var SET={email_from_name:'NusaMora',email_from_address:'info@nusamora.test',email_reply_to:'',max_attempts:3,retry_base_minutes:5,internal_emails:['ops@x.id'],internal_whatsapp:[],paused:false,last_dispatch_at:null};
var OVER={paused:false,last_dispatch_at:null,by_status:{pending:1,sent:2,delivered:1,failed:1,skipped:1},backlog:1,oldest_pending:iso(1)};
var CFG={email:{configured:false,has_key:false,has_sender:true},whatsapp:{configured:true},scheduler_secret:false,webhook_secret:false};
var FAIL=null;
function ok(d){return Promise.resolve({data:d===undefined?null:d,error:null})}
function rows(t){return t==='announcements'?ANN:t==='notif_outbox'?OB:t==='notif_templates'?TPL:t==='notif_rules'?RULES:t==='notif_settings'?Object.keys(SET).map(function(k){return{key:k,value:SET[k]}}):[]}
function qb(t){var f={},o={},one=false;['select','order','range','or','in','gte','lte','lt','gt','neq','ilike','contains','not','is','limit'].forEach(function(m){o[m]=function(){return o}});
 o.eq=function(k,v){f[k]=v;return o};o.maybeSingle=function(){one=true;return o};
 o.insert=function(r){window.__ins.push([t,r]);if(t==='announcements')ANN.unshift(Object.assign({id:'nx',created_at:iso(0)},r));return Promise.resolve({data:null,error:FAIL})};
 o.update=function(r){window.__upd.push([t,r,f]);return o};o.delete=function(){window.__upd.push([t,'delete',f]);return o};
 o.then=function(a,b){var r=rows(t).filter(function(x){return Object.keys(f).every(function(k){return String(x[k])===String(f[k])})});if(t==='notif_outbox')window.__inv.push(JSON.stringify(f));var det=one?(r[0]?Object.assign({body:'Halo <script>window.__xss=2</script> Dina',provider:'resend',provider_message_id:'msg-77'},r[0]):null):r;return Promise.resolve({data:det,error:null}).then(a,b)};return o}
window.supabase={createClient:function(){return{
 from:qb,
 rpc:function(n,a){window.__calls.push([n,a]);
  if(n==='my_admin')return ok({role:'super_admin',perms:PERMS,mfa:{needed:false}});
  if(n==='admin_notif_overview')return ok(OVER);
  if(n==='admin_notif_attempts')return ok([{at:iso(-4),ok:false,http:500,error:'HTTP 500'},{at:iso(-3),ok:false,http:422,error:'Invalid to <b>x</b>'}]);
  if(n==='admin_notif_preview')return ok({subject:'Halo Dina Pratama',body:'Isi contoh untuk '+(a.p_body||'')});
  if(n==='admin_announcement_send')return ok(7);
  if(n==='admin_notif_rule_set'&&FAIL){return Promise.resolve({data:null,error:{message:'template_tidak_aktif'}})}
  if(n.indexOf('admin_notif')===0)return Promise.resolve({data:null,error:FAIL});
  return ok([])},
 functions:{invoke:function(name,o){window.__calls.push(['fn:'+name,o&&o.body]);return Promise.resolve({data:(o&&o.body&&o.body.action==='status')?CFG:{claimed:3,sent:2,retry:1,failed:0,skipped_channels:['email']},error:null})}},
 storage:{from:function(){return{}}},
 auth:{getSession:function(){return Promise.resolve({data:{session:{access_token:'tok',user:{id:'u1',email:'adm@uji.test'}}}})},signOut:function(){return Promise.resolve({})},onAuthStateChange:function(){return{data:{subscription:{unsubscribe:function(){}}}}}}}}};"""

def calls(pg, n): return [c[1] for c in pg.evaluate("window.__calls") if c[0] == n]
def go(pg, tab, sel): pg.goto(BASE + "/admin#notifications:" + tab); pg.wait_for_selector(sel, timeout=15000)
def noscroll(pg): return pg.evaluate("document.documentElement.scrollWidth <= window.innerWidth + 1")
with sync_playwright() as pw:
    b = pw.chromium.launch()
    ctx, pg, errs = newpage(b); ctx.set_default_timeout(15000); go(pg, "ann", "#nt-rows tbody tr")
    chk("6 tab: 5 baru + System Alerts", [x.strip() for x in pg.locator(".tabs button").all_inner_texts()] == ["Pengumuman", "Riwayat Pengiriman", "Template Pesan", "Aturan Event", "Pengaturan", "System Alerts"], pg.locator(".tabs button").all_inner_texts())
    t = txt(pg)
    chk("pengumuman: 4 baris, status Mengirim/Terkirim/Draft/Gagal", pg.locator("#nt-rows tbody tr").count() == 4 and all(s in t for s in ["Mengirim", "Terkirim", "Draft", "Gagal"]), t[:300])
    chk("hasil pengiriman per pengumuman dari antrean (1 diterima provider)", "1 diterima provider" in pg.locator("#nt-rows tbody tr").first.inner_text())
    chk("judul di-escape (tanpa XSS)", pg.evaluate("window.__xss") is None and pg.locator("#nt-rows img").count() == 0)
    chk("hanya satu baris berlabel Terkirim (yang statusnya terkirim)", pg.locator("#nt-rows .badge:text-is('Terkirim')").count() == 1)
    pg.select_option("#nt-st", "draft"); chk("filter status", pg.locator("#nt-rows tbody tr").count() == 1); pg.select_option("#nt-st", "")
    pg.click("#nt-new"); pg.wait_for_selector("#nt-ann[open] #a-t")
    chk("form pengumuman tidak menawarkan status Terkirim", pg.locator("#nt-ann option:text-is('Terkirim')").count() == 0)
    pg.click("#nt-af button[type=submit]"); chk("judul wajib", "Judul wajib" in pg.inner_text("#a-e"))
    pg.fill("#a-t", "Halo"); pg.click("#nt-af button[type=submit]"); chk("isi wajib", "Isi pesan wajib" in pg.inner_text("#a-e"))
    pg.fill("#a-b", "Isi {{nama}}"); pg.select_option("#a-c", "whatsapp"); pg.fill("#a-s", "2026-12-01T09:30"); pg.click("#nt-af button[type=submit]"); pg.wait_for_function("window.__ins.length===1")
    ins = pg.evaluate("window.__ins[0]")
    chk("simpan terjadwal: status terjadwal, WIB -> UTC (02:30Z)", ins[0] == "announcements" and ins[1]["status"] == "terjadwal" and ins[1]["scheduled_at"] == "2026-12-01T02:30:00.000Z" and ins[1]["channel"] == "whatsapp", ins)
    pg.wait_for_selector("#nt-rows tbody tr:nth-child(5)"); 
    # kirim sekarang untuk draf
    pg.locator("#nt-rows tr:has-text('Draf WA') [data-ed]").click(); pg.wait_for_selector("#a-send"); pg.click("#a-send"); pg.wait_for_selector("#cdlg[open]"); pg.click("#cdlg-y")
    pg.wait_for_function("window.__calls.some(c=>c[0]==='fn:notify-dispatch' && c[1].action==='run')")
    chk("kirim sekarang: RPC admin_announcement_send lalu pengirim dijalankan", calls(pg, "admin_announcement_send")[0]["p_id"] == "n3" and len(calls(pg, "fn:notify-dispatch")) >= 1)
    chk("ringkasan proses menyebut kanal belum terhubung", "belum terhubung" in pg.inner_text(".toast, #toasts, body"), "")
    pg.locator("#nt-rows tr:has-text('Info Sistem') [data-ed]").click(); pg.wait_for_selector("#nt-ann[open]")
    chk("pengumuman yang sudah diproses: tanpa tombol Simpan/Kirim", pg.locator("#a-send, #nt-af button[type=submit]").count() == 0 and pg.locator("#a-t:disabled").count() == 1)
    chk("tanpa galat JavaScript", not errs, errs); ctx.close()

    ctx, pg, errs = newpage(b); ctx.set_default_timeout(15000); go(pg, "hist", "#nt-rows tbody tr")
    chk("riwayat: 6 baris dan ubin ringkasan", pg.locator("#nt-rows tbody tr").count() == 6 and pg.locator(".nt-stat .card").count() == 5)
    row = lambda tid: pg.locator("#nt-rows tr:has([data-i='%s'])" % tid).inner_text()
    chk("sent = 'Diterima provider' (bukan Terkirim)", "Diterima provider" in row("o2") and "Terkirim" not in row("o2") and "Belum ada konfirmasi" in row("o2"), row("o2"))
    chk("delivered = 'Terkirim' dengan waktu konfirmasi", "Terkirim" in row("o1") and "Dikonfirmasi provider" in row("o1"), row("o1"))
    chk("pending dengan percobaan = 'Menunggu coba lagi (1/3)'", "Menunggu coba lagi (1/3)" in row("o3"), row("o3"))
    chk("gagal menampilkan alasan ter-escape; dilewati menampilkan alasan", "Gagal" in row("o4") and "Invalid to <b>x</b>" in row("o4") and "nomor WhatsApp" in row("o5"))
    chk("hanya 1 label 'Terkirim' di tabel", pg.locator("#nt-rows tbody .badge:text-is('Terkirim')").count() == 1)
    pg.select_option("#h-st", "failed"); pg.wait_for_function("window.__inv.some(x=>x.indexOf('failed')>-1)"); chk("filter status dikirim ke query (eq status)", True)
    pg.select_option("#h-st", ""); pg.locator("[data-i='o4']").click(); pg.wait_for_selector("#nt-det[open] #nt-rt")
    dt = pg.inner_text("#nt-det")
    chk("detail: riwayat percobaan, ID pesan, isi ter-escape", "HTTP 500" in dt and "msg-77" in dt and pg.evaluate("window.__xss") is None and pg.locator("#nt-det script").count() == 0 and "Riwayat percobaan" in dt)
    pg.click("#nt-rt"); pg.wait_for_function("window.__calls.some(c=>c[0]==='fn:notify-dispatch')"); chk("coba kirim ulang memanggil RPC lalu pengirim", calls(pg, "admin_notif_retry")[0]["p_id"] == "o4")
    pg.locator("[data-i='o3']").click(); pg.wait_for_selector("#nt-cx"); pg.click("#nt-cx"); pg.wait_for_function("window.__calls.some(c=>c[0]==='admin_notif_cancel')"); chk("batalkan pesan menunggu", calls(pg, "admin_notif_cancel")[0]["p_id"] == "o3")
    pg.locator("[data-i='o1']").click(); pg.wait_for_selector("#nt-det[open] .nt-pre"); chk("pesan delivered: tanpa tombol retry/batalkan", pg.locator("#nt-rt, #nt-cx").count() == 0)
    chk("tanpa galat JavaScript", not errs, errs); ctx.close()

    ctx, pg, errs = newpage(b); ctx.set_default_timeout(15000); go(pg, "tpl", ".tbl-w tbody tr")
    chk("template: 3 baris, nama ter-escape", pg.locator(".tbl-w tbody tr").count() == 3 and pg.locator(".tbl-w i").count() == 0 and "Nonaktif" in txt(pg))
    pg.locator("[data-t='t2']").click(); pg.wait_for_selector("#nt-tpl[open] #t-b")
    chk("template WhatsApp: kolom subjek disembunyikan", pg.locator("#t-sw").is_hidden())
    pg.fill("#t-b", ""); pg.click("#t-v [data-v='jumlah']"); chk("tombol variabel menyisipkan {{jumlah}}", pg.input_value("#t-b") == "{{jumlah}}")
    pg.wait_for_function("window.__calls.some(c=>c[0]==='admin_notif_preview')"); chk("pratinjau memanggil admin_notif_preview", True)
    pg.click("#nt-tf button[type=submit]"); pg.wait_for_function("window.__calls.some(c=>c[0]==='admin_notif_template_save')"); sv = calls(pg, "admin_notif_template_save")[0]
    chk("simpan: id, kunci, kanal, subjek null untuk WA", sv["p_id"] == "t2" and sv["p_key"] == "payment_paid" and sv["p_channel"] == "whatsapp" and sv["p_subject"] is None and sv["p_body"] == "{{jumlah}}" and sv["p_active"] is True, sv)
    pg.wait_for_selector(".tbl-w tbody tr"); pg.click("#tp-new"); pg.wait_for_selector("#nt-tpl[open] #t-k"); chk("tambah template: kunci & kanal dapat diisi", pg.locator("#t-k:not(:disabled)").count() == 1)
    chk("tanpa galat JavaScript", not errs, errs); ctx.close()

    ctx, pg, errs = newpage(b); ctx.set_default_timeout(15000); go(pg, "rules", ".tbl-w tbody tr")
    chk("aturan: 3 baris; peringatan provider email belum terhubung", pg.locator(".tbl-w tbody tr").count() == 3 and "Provider belum lengkap" in txt(pg) and "RESEND_API_KEY" in txt(pg), txt(pg)[:300])
    pg.locator("[data-r='welcome|email|customer']").check(); pg.wait_for_function("window.__calls.some(c=>c[0]==='admin_notif_rule_set')")
    chk("nyalakan aturan memanggil rule_set dengan argumen benar", calls(pg, "admin_notif_rule_set")[0] == {"p_event": "welcome", "p_channel": "email", "p_recipient": "customer", "p_enabled": True})
    pg.evaluate("FAIL=null"); pg.evaluate("window.__calls.length=0"); pg.evaluate("FAIL={message:'x'}")
    pg.locator("[data-r='payment_paid|whatsapp|customer']").click(); pg.wait_for_function("window.__calls.some(c=>c[0]==='admin_notif_rule_set')")
    chk("gagal menyalakan: kotak dikembalikan & pesan alasan", pg.locator("[data-r='payment_paid|whatsapp|customer']").is_checked() is False)
    chk("tanpa galat JavaScript", not errs, errs); ctx.close()

    ctx, pg, errs = newpage(b); ctx.set_default_timeout(15000); go(pg, "set", "#st-f")
    t = txt(pg)
    chk("pengaturan: status provider, peringatan penjadwal belum berjalan", "belum pernah berjalan" in t and "Email (Resend)" in t and "WhatsApp (Fonnte)" in t)
    chk("panduan menyebut nama secret, tanpa nilai rahasia", all(s in t for s in ["RESEND_API_KEY", "WA_TOKEN", "NOTIFY_DISPATCH_SECRET", "RESEND_WEBHOOK_SECRET", "notify-webhook"]) and "re_" not in t)
    pg.fill("#s-ie", "a@x.id\n\n b@x.id "); pg.fill("#s-iw", "08123"); pg.fill("#s-ma", "5"); pg.check("#s-pa"); pg.click("#st-f button[type=submit]"); pg.wait_for_function("window.__calls.some(c=>c[0]==='admin_notif_settings_save')")
    p = calls(pg, "admin_notif_settings_save")[0]["p"]
    chk("simpan: array dari baris, angka, boolean", p["internal_emails"] == ["a@x.id", "b@x.id"] and p["internal_whatsapp"] == ["08123"] and p["max_attempts"] == 5 and p["paused"] is True and p["email_from_address"] == "info@nusamora.test", p)
    pg.fill("#ts-t", "tes@x.id"); pg.click("#ts-f button[type=submit]"); pg.wait_for_function("window.__calls.some(c=>c[0]==='admin_notif_test')"); chk("pesan uji memanggil admin_notif_test", calls(pg, "admin_notif_test")[0] == {"p_channel": "email", "p_to": "tes@x.id"})
    pg.click("#s-run"); pg.wait_for_function("window.__calls.filter(c=>c[0]==='fn:notify-dispatch' && c[1].action==='run').length>=1"); chk("Proses antrean sekarang menjalankan pengirim", True)
    chk("tanpa galat JavaScript", not errs, errs); ctx.close()

    ctx, pg, errs = newpage(b, perms=["dashboard.read", "notifications.read"]); ctx.set_default_timeout(15000); go(pg, "set", "#st-f")
    chk("baca saja: pengaturan terkunci tanpa tombol simpan/uji", pg.locator("#st-f button[type=submit], #ts-f").count() == 0 and pg.locator("#s-fn:disabled").count() == 1)
    go(pg, "rules", ".tbl-w tbody tr"); chk("baca saja: sakelar aturan terkunci", pg.locator("[data-r]:not(:disabled)").count() == 0)
    go(pg, "tpl", ".tbl-w tbody tr"); chk("baca saja: tanpa tombol tambah template", pg.locator("#tp-new").count() == 0)
    go(pg, "hist", "#nt-rows tbody tr"); pg.locator("[data-i='o4']").click(); pg.wait_for_selector("#nt-det[open] .nt-pre"); chk("baca saja: detail tanpa retry/batal", pg.locator("#nt-rt, #nt-cx").count() == 0)
    go(pg, "ann", "#nt-rows tbody tr"); chk("baca saja: tanpa tombol buat pengumuman", pg.locator("#nt-new").count() == 0); ctx.close()

    ctx, pg, errs = newpage(b, vw=375); ctx.set_default_timeout(15000)
    for tab, sel in [("ann", "#nt-rows tbody tr"), ("hist", "#nt-rows tbody tr"), ("tpl", ".tbl-w tbody tr"), ("rules", ".tbl-w tbody tr"), ("set", "#st-f")]:
        go(pg, tab, sel); chk("mobile 375px: %s tanpa scroll horizontal" % tab, noscroll(pg))
    go(pg, "tpl", ".tbl-w tbody tr"); pg.locator("[data-t='t1']").click(); pg.wait_for_selector("#nt-tpl[open] #t-b"); chk("mobile 375px: dialog template tanpa scroll horizontal", noscroll(pg) and pg.evaluate("var e=document.querySelector('#nt-tpl');e.scrollWidth<=e.clientWidth+1"))
    chk("tanpa galat JavaScript", not errs, errs); ctx.close()
    b.close()
print("%d lulus, %d gagal" % (ok_n, bad_n)); raise SystemExit(1 if bad_n else 0)
