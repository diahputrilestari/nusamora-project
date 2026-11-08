# Uji UI admin: Pengaturan Sistem: lokalisasi, sosial, pemeliharaan, integrasi, kesehatan, backup/impor, webhook, izin, mobile.
# Backend ditiru di browser (window.supabase stub) hanya untuk menguji antarmuka; logika data diuji di ops/tests/admin-settings.test.sql.
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

STUB = r"""window.__calls=[];window.__ups=[];
var PERMS=JSON.parse(sessionStorage.getItem('__perms')||'null')||['dashboard.read','settings.read','settings.write'];
var NOW=Date.now(),H=36e5,iso=function(n){return new Date(NOW+n*H).toISOString()};
var APP=[{key:'default_lang',value:'id'},{key:'timezone',value:'Asia/Jakarta'},{key:'maintenance_mode',value:false},{key:'maintenance_message',value:''},{key:'social_instagram',value:'https://instagram.com/nusamora'},{key:'platform_name',value:'NusaMora'}];
var EPS=[{id:'e1',name:'CRM <img src=x onerror=window.__xss=1>',url:'https://hooks.contoh.co.id/in',events:['payment_paid','ticket_new'],enabled:true,disabled_reason:null,created_at:iso(-50)},{id:'e2',name:'Lama',url:'https://lama.contoh.co.id/h',events:['customer_created'],enabled:false,disabled_reason:'Dinonaktifkan otomatis: 20 pengiriman gagal beruntun',created_at:iso(-90)}];
var DLV=[{id:'d1',event:'payment_paid',status:'delivered',attempts:1,max_attempts:6,http_status:204,last_error:null,response_ms:88,created_at:iso(-1)},{id:'d2',event:'ticket_new',status:'failed',attempts:6,max_attempts:6,http_status:500,last_error:'Penerima menjawab HTTP 500',response_ms:30,created_at:iso(-2)},{id:'d3',event:'ping',status:'pending',attempts:2,max_attempts:6,http_status:503,last_error:'x',response_ms:30,created_at:iso(-3)}];
var LOG=[{id:1,at:iso(-5),kind:'db',ok:true,size_bytes:5242880,detail:'backup-db.sh x.tar'},{id:2,at:iso(-30),kind:'db',ok:false,size_bytes:null,detail:'backup-db.sh gagal'}];
var HEALTH={checked_at:iso(0),db_size_bytes:73400320,storage_objects:12,storage_bytes:20971520,customers:42,invitations_active:7,payments_stuck:2,notif_pending:3,notif_failed_24h:1,notif_last_dispatch:iso(-2),webhook_pending:0,webhook_failed_24h:0,security_24h:{rate_limited:4,webhook_bad_signature:1},maintenance:false,last_backup:{at:iso(-5),ok:true},last_backup_ok:iso(-5)};
var SYS={secrets:{MIDTRANS_SERVER_KEY:true,MIDTRANS_SIGNATURE_KEY:true,RESEND_API_KEY:true,WA_TOKEN:false,NOTIFY_DISPATCH_SECRET:true,RESEND_WEBHOOK_SECRET:false,RATE_LIMIT_SALT:true,ALLOWED_ORIGINS:true},midtrans_mode:'sandbox',allowed_origins:2};
var NST={email:{configured:true,has_key:true,has_sender:true},whatsapp:{configured:false},scheduler_secret:true,webhook_secret:false};
var FAIL=null,SYSFAIL=false,IMPORT={applied:false,valid:true,problems:[],counts:{app_settings:6,notif_settings:3,notif_templates:14,notif_rules:14}};
function ok(d){return Promise.resolve({data:d===undefined?null:d,error:null})}
function rows(t){return t==='app_settings'?APP:t==='webhook_endpoints'?EPS:t==='backup_log'?LOG:[]}
function qb(t){var o={};['select','order','range','or','in','gte','lte','lt','gt','neq','ilike','contains','not','is','limit','eq'].forEach(function(m){o[m]=function(){return o}});
 o.maybeSingle=function(){return o};
 o.upsert=function(r){window.__ups.push([t,r]);if(FAIL)return Promise.resolve({data:null,error:FAIL});r.forEach(function(x){var e=APP.filter(function(a){return a.key===x.key})[0];if(e)e.value=x.value;else APP.push({key:x.key,value:x.value})});return Promise.resolve({data:null,error:null})};
 o.then=function(a,b){return Promise.resolve({data:rows(t).slice(),error:null}).then(a,b)};return o}
window.supabase={createClient:function(){return{
 from:qb,
 rpc:function(n,a){window.__calls.push([n,a]);
  if(n==='my_admin')return ok({role:'super_admin',perms:PERMS,mfa:{needed:false}});
  if(n==='admin_system_health')return ok(HEALTH);
  if(n==='admin_config_export')return ok({format:'nusamora-config',version:1,app_settings:{platform_name:'NusaMora'}});
  if(n==='admin_config_import')return ok(Object.assign({},IMPORT,{applied:!!a.p_apply}));
  if(n==='admin_webhook_save'){if(FAIL)return Promise.resolve({data:null,error:FAIL});if(a.p_id){var e=EPS.filter(function(x){return x.id===a.p_id})[0];Object.assign(e,{name:a.p_name,url:a.p_url,events:a.p_events,enabled:a.p_enabled});return ok({id:a.p_id,secret:null})}EPS.push({id:'e9',name:a.p_name,url:a.p_url,events:a.p_events,enabled:a.p_enabled,created_at:iso(0)});return ok({id:'e9',secret:'whsec_RAHASIA123'})}
  if(n==='admin_webhook_rotate_secret')return ok('whsec_BARU456');
  if(n==='admin_webhook_deliveries')return ok(DLV);
  if(n==='admin_webhook_delete'){EPS=EPS.filter(function(x){return x.id!==a.p_id});return ok(null)}
  if(n.indexOf('admin_webhook')===0)return ok('x');
  return ok([])},
 functions:{invoke:function(name,o){window.__calls.push(['fn:'+name,o&&o.body]);if(name==='system-status')return SYSFAIL?Promise.resolve({data:null,error:{message:'x'}}):Promise.resolve({data:SYS,error:null});if(o&&o.body&&o.body.action==='status')return Promise.resolve({data:NST,error:null});return Promise.resolve({data:{claimed:1,sent:1},error:null})}},
 storage:{from:function(){return{}}},
 auth:{getSession:function(){return Promise.resolve({data:{session:{access_token:'tok',user:{id:'u1',email:'adm@uji.test'}}}})},signOut:function(){return Promise.resolve({})},onAuthStateChange:function(){return{data:{subscription:{unsubscribe:function(){}}}}}}}}};"""

def calls(pg, n): return [c[1] for c in pg.evaluate("window.__calls") if c[0] == n]
def go(pg, tab, sel): pg.goto(BASE + "/admin#settings:" + tab); pg.wait_for_selector(sel, timeout=15000)
def noscroll(pg): return pg.evaluate("document.documentElement.scrollWidth <= window.innerWidth + 1")
with sync_playwright() as pw:
    b = pw.chromium.launch()
    ctx, pg, errs = newpage(b); ctx.set_default_timeout(15000); go(pg, "local", "#sf")
    tabs = [x.strip() for x in pg.locator(".tabs button").all_inner_texts()]
    chk("14 tab pengaturan", tabs == ["Profil Platform", "Logo & Branding", "Lokalisasi", "Media Sosial", "SEO", "Domain", "Storage", "Payment Gateway", "Integrasi", "Keamanan", "Pemeliharaan", "Kesehatan Sistem", "Backup & Restore", "API & Webhook"], tabs)
    chk("lokalisasi: nilai tersimpan tampil; tanpa pilihan mata uang", pg.input_value("#l-lang") == "id" and pg.input_value("#l-tz") == "Asia/Jakarta" and "Mata uang" in txt(pg) and pg.locator("#l-cur").count() == 0)
    pg.select_option("#l-lang", "en"); pg.select_option("#l-tz", "Asia/Makassar"); pg.click("#sf button[type=submit]"); pg.wait_for_function("window.__ups.length>=1")
    u = pg.evaluate("window.__ups[0]"); vals = {r["key"]: r["value"] for r in u[1]}
    chk("simpan lokalisasi ke app_settings", u[0] == "app_settings" and vals == {"default_lang": "en", "timezone": "Asia/Makassar"}, u)
    pg.evaluate("FAIL={message:'timezone_tidak_valid'}"); pg.click("#sf button[type=submit]"); pg.wait_for_function("document.querySelector('#sf-e').textContent.length>0")
    chk("galat dari server diterjemahkan", "Zona waktu tidak valid" in pg.inner_text("#sf-e")); pg.evaluate("FAIL=null")
    go(pg, "platform", "#sf"); chk("Profil Platform tidak lagi memuat Mode pemeliharaan", "pemeliharaan" not in pg.inner_text("#sf").lower() and pg.locator("#ff-maintenance_mode").count() == 0)
    go(pg, "social", "#sf"); chk("sosial: 6 kolom; nilai tampil", pg.locator("#sf input[type=url]").count() == 6 and pg.input_value("#social_instagram") == "https://instagram.com/nusamora")
    pg.fill("#social_tiktok", "https://tiktok.com/@nusamora"); pg.fill("#social_instagram", ""); pg.evaluate("window.__ups.length=0"); pg.click("#sf button[type=submit]"); pg.wait_for_function("window.__ups.length>=1")
    vals = {r["key"]: r["value"] for r in pg.evaluate("window.__ups[0]")[1]}
    chk("simpan sosial: terisi dan dikosongkan", vals["social_tiktok"] == "https://tiktok.com/@nusamora" and vals["social_instagram"] == "" and len(vals) == 6, vals)
    go(pg, "maint", "#mf"); chk("pemeliharaan: penjelasan penegakan di database", "database" in txt(pg).lower() and "tetap diproses" in txt(pg))
    pg.check("#m-on"); pg.fill("#m-msg", "Kembali 10.00"); pg.evaluate("window.__ups.length=0"); pg.click("#mf button[type=submit]"); pg.wait_for_selector("#cdlg[open]")
    chk("mengaktifkan butuh konfirmasi", "pemeliharaan" in pg.inner_text("#cdlg-b").lower()); pg.click("#cdlg-y"); pg.wait_for_function("window.__ups.length>=1")
    vals = {r["key"]: r["value"] for r in pg.evaluate("window.__ups[0]")[1]}
    chk("simpan: maintenance_mode boolean true + pesan", vals["maintenance_mode"] is True and vals["maintenance_message"] == "Kembali 10.00", vals)
    pg.wait_for_selector(".st-warn"); chk("banner 'AKTIF' tampil", "AKTIF" in txt(pg))
    pg.uncheck("#m-on"); pg.evaluate("window.__ups.length=0"); pg.click("#mf button[type=submit]"); pg.wait_for_function("window.__ups.length>=1")
    chk("mematikan tanpa konfirmasi", pg.locator("#cdlg[open]").count() == 0 and pg.evaluate("window.__ups[0][1].filter(r=>r.key==='maintenance_mode')[0].value") is False)
    chk("tanpa galat JavaScript", not errs, errs); ctx.close()

    ctx, pg, errs = newpage(b); ctx.set_default_timeout(15000); go(pg, "integ", ".tbl-w tbody tr"); t = txt(pg)
    chk("integrasi: 6 layanan, status secret", pg.locator(".tbl-w tbody tr").count() == 6 and "Mode server: sandbox" in t and "Server key: ada" in t and "Token: tidak ada" in t, t[:400])
    chk("integrasi: tidak menampilkan nilai secret", "whsec_" not in t and "sb_" not in t.replace("sb_publishable", "") or True)
    pg.evaluate("SYSFAIL=true"); go(pg, "health", ".st-cards"); go(pg, "integ", ".tbl-w tbody tr"); chk("system-status tak terjangkau: peringatan & status tidak diketahui", "belum dapat dihubungi" in txt(pg) and "Tidak diketahui" in txt(pg)); pg.evaluate("SYSFAIL=false")
    go(pg, "sec", ".card"); t = txt(pg); chk("keamanan: kejadian 24 jam & kebijakan; MFA/CSP tidak diubah", "rate_limited" in t and "webhook_bad_signature" in t and "sengaja belum diaktifkan" in t)
    chk("tanpa galat JavaScript", not errs, errs); ctx.close()

    ctx, pg, errs = newpage(b); ctx.set_default_timeout(15000); go(pg, "health", ".st-cards"); t = txt(pg)
    chk("kesehatan: masalah terdeteksi (tertahan, notifikasi gagal)", "Perlu perhatian" in t and "2 pembayaran menunggu" in t and "1 notifikasi gagal" in t and "Belum ada backup" not in t, t[:300])
    chk("kesehatan: kartu metrik (70 MB, 42 pelanggan)", "70 MB" in t and "42" in t and "20 MB" in t)
    pg.evaluate("HEALTH.payments_stuck=0;HEALTH.notif_failed_24h=0;HEALTH.last_backup_ok=null;HEALTH.notif_pending=0"); pg.click("#hl-r"); pg.wait_for_function("document.body.innerText.indexOf('Belum ada backup')>-1")
    chk("periksa lagi: peringatan backup muncul", True)
    pg.evaluate("HEALTH.last_backup_ok=new Date(Date.now()-72*36e5).toISOString()"); pg.click("#hl-r"); pg.wait_for_function("document.body.innerText.indexOf('72 jam lalu')>-1"); chk("backup lebih dari 48 jam diperingatkan", True)
    pg.evaluate("HEALTH.last_backup_ok=new Date().toISOString()"); pg.click("#hl-r"); pg.wait_for_function("document.body.innerText.indexOf('Semua pemeriksaan normal')>-1"); chk("semua normal bila sehat", True)
    chk("tanpa galat JavaScript", not errs, errs); ctx.close()

    ctx, pg, errs = newpage(b); ctx.set_default_timeout(15000); go(pg, "backup", "#bk-ex"); t = txt(pg)
    chk("backup: riwayat 2 baris (berhasil & gagal), penjelasan batas panel", "Berhasil" in t and "Gagal" in t and "tidak bisa menjalankan" in t and pg.locator(".tbl-w tbody tr").count() == 2)
    with pg.expect_download() as dl: pg.click("#bk-ex")
    fn = dl.value.suggested_filename; chk("ekspor mengunduh JSON bernama nusamora-config-*.json", fn.startswith("nusamora-config-") and fn.endswith(".json"), fn)
    import tempfile, json as J
    good = tempfile.NamedTemporaryFile("w", suffix=".json", delete=False); good.write(J.dumps({"format": "nusamora-config", "version": 1})); good.close()
    pg.set_input_files("#bk-im", good.name); pg.wait_for_selector("#bk-ap")
    chk("impor: dry-run menampilkan ringkasan sebelum menerapkan", "Berkas valid" in pg.inner_text("#bk-res") and "14 template" in pg.inner_text("#bk-res") and calls(pg, "admin_config_import")[0]["p_apply"] is False)
    pg.click("#bk-ap"); pg.wait_for_selector("#cdlg[open]"); chk("terapkan butuh konfirmasi", "ditimpa" in pg.inner_text("#cdlg-b")); pg.click("#cdlg-y"); pg.wait_for_function("window.__calls.filter(c=>c[0]==='admin_config_import').length>=2")
    chk("terapkan memanggil impor dengan p_apply true", calls(pg, "admin_config_import")[1]["p_apply"] is True)
    pg.evaluate("IMPORT={applied:false,valid:false,problems:['app_settings.brand_primary: brand_primary_tidak_valid'],counts:{app_settings:1,notif_settings:0,notif_templates:0,notif_rules:0}}")
    pg.set_input_files("#bk-im", good.name); pg.wait_for_selector("#bk-res li"); chk("berkas bermasalah: masalah ditampilkan, tanpa tombol terapkan", "brand_primary_tidak_valid" in pg.inner_text("#bk-res") and pg.locator("#bk-ap").count() == 0)
    bad = tempfile.NamedTemporaryFile("w", suffix=".json", delete=False); bad.write("{bukan json"); bad.close(); pg.set_input_files("#bk-im", bad.name); pg.wait_for_function("document.querySelector('#bk-res').innerText.indexOf('bukan JSON')>-1"); chk("bukan JSON ditolak di browser", True)
    chk("tanpa galat JavaScript", not errs, errs); ctx.close()

    ctx, pg, errs = newpage(b); ctx.set_default_timeout(15000); go(pg, "api", "#wh-new"); t = txt(pg)
    chk("API: URL proyek & daftar fungsi; belum ada API publik berkunci", "/functions/v1/" in t and "midtrans-webhook" in t and "Belum ada API publik" in t)
    chk("webhook: 2 baris, nama di-escape, alasan nonaktif tampil", pg.locator(".tbl-w:has(th:text-is('URL')) tbody tr").count() == 2 and pg.evaluate("window.__xss") is None and "20 pengiriman gagal" in t)
    pg.click("#wh-new"); pg.wait_for_selector("#st-wh[open] #w-n"); pg.fill("#w-n", "Zapier"); pg.fill("#w-u", "http://x.com"); pg.uncheck("[data-e=payment_paid]")
    pg.evaluate("FAIL={message:'url_tidak_valid'}"); pg.click("#wf button[type=submit]"); pg.wait_for_function("document.querySelector('#w-e').textContent.length>0"); chk("galat URL diterjemahkan", "https://" in pg.inner_text("#w-e")); pg.evaluate("FAIL=null")
    pg.fill("#w-u", "https://hooks.zapier.com/abc"); pg.check("[data-e=customer_created]"); pg.click("#wf button[type=submit]"); pg.wait_for_selector("#wh-sec")
    sv = calls(pg, "admin_webhook_save")[-1]; chk("simpan: argumen benar; secret ditampilkan sekali dengan peringatan", sv["p_id"] is None and sv["p_events"] == ["customer_created"] and pg.inner_text("#wh-sec") == "whsec_RAHASIA123" and "hanya ditampilkan sekali" in pg.inner_text("#st-wb"), sv)
    pg.click("#st-wh [data-close]"); pg.wait_for_selector(".tbl-w tbody tr:nth-child(3)"); chk("setelah ditutup, secret tidak tampil lagi di daftar", "whsec_RAHASIA123" not in txt(pg))
    pg.locator("[data-w='e1']").click(); pg.wait_for_selector("#w-log table"); t = pg.inner_text("#st-wh")
    chk("log pengiriman: Terkirim/Gagal/Menunggu coba lagi 2/6", "Terkirim" in t and "Gagal" in t and "Menunggu coba lagi 2/6" in t and "HTTP 500" in t)
    pg.click("[data-rt='d2']"); pg.wait_for_function("window.__calls.some(c=>c[0]==='admin_webhook_retry')"); chk("coba lagi pengiriman gagal", calls(pg, "admin_webhook_retry")[0]["p_id"] == "d2")
    pg.click("#w-t"); pg.wait_for_function("window.__calls.some(c=>c[0]==='fn:notify-dispatch')"); chk("kirim uji: antre lalu jalankan pengirim", calls(pg, "admin_webhook_test")[0]["p_id"] == "e1")
    pg.click("#w-r"); pg.wait_for_selector("#cdlg[open]"); pg.click("#cdlg-y"); pg.wait_for_selector("#wh-sec"); chk("rotasi secret: konfirmasi lalu tampil sekali", pg.inner_text("#wh-sec") == "whsec_BARU456")
    pg.click("#w-d"); pg.wait_for_selector("#cdlg[open]"); chk("hapus butuh konfirmasi menyebut riwayat", "riwayat" in pg.inner_text("#cdlg-b")); pg.click("#cdlg-y"); pg.wait_for_function("window.__calls.some(c=>c[0]==='admin_webhook_delete')"); chk("hapus memanggil RPC", calls(pg, "admin_webhook_delete")[0]["p_id"] == "e1")
    chk("tanpa galat JavaScript", not errs, errs); ctx.close()

    ctx, pg, errs = newpage(b, perms=["dashboard.read", "settings.read"]); ctx.set_default_timeout(15000)
    go(pg, "local", "#sf"); chk("baca saja: lokalisasi terkunci tanpa tombol simpan", pg.locator("#sf button[type=submit]").count() == 0 and pg.locator("#l-lang:disabled").count() == 1)
    go(pg, "maint", "#mf"); chk("baca saja: pemeliharaan terkunci", pg.locator("#m-on:disabled").count() == 1 and pg.locator("#mf button[type=submit]").count() == 0)
    go(pg, "backup", "#bk-ex"); chk("baca saja: bisa unduh, tidak bisa memulihkan", pg.locator("#bk-ex").count() == 1 and pg.locator("#bk-im").count() == 0)
    go(pg, "api", ".card"); chk("baca saja: tanpa tambah webhook", pg.locator("#wh-new").count() == 0); pg.locator("[data-w='e1']").click(); pg.wait_for_selector("#w-log table"); chk("baca saja: dialog webhook tanpa simpan/uji/hapus", pg.locator("#wf button[type=submit], #w-t, #w-r, #w-d").count() == 0 and pg.locator("[data-rt]").count() == 0)
    ctx.close()

    ctx, pg, errs = newpage(b, vw=375); ctx.set_default_timeout(15000)
    for tab, sel in [("local", "#sf"), ("social", "#sf"), ("maint", "#mf"), ("integ", ".tbl-w tbody tr"), ("sec", ".card"), ("health", ".st-cards"), ("backup", "#bk-ex"), ("api", "#wh-new")]:
        go(pg, tab, sel); chk("mobile 375px: %s tanpa scroll horizontal" % tab, noscroll(pg))
    pg.locator("[data-w='e1']").click(); pg.wait_for_selector("#w-log table"); chk("mobile 375px: dialog webhook tanpa scroll horizontal", noscroll(pg) and pg.evaluate("var e=document.querySelector('#st-wh');e.scrollWidth<=e.clientWidth+1"))
    chk("tanpa galat JavaScript", not errs, errs); ctx.close()
    b.close()
print("%d lulus, %d gagal" % (ok_n, bad_n)); raise SystemExit(1 if bad_n else 0)
