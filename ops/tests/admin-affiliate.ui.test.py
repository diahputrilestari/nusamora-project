# Uji UI admin: Affiliate & Referral: ringkasan, affiliate, referral, penarikan, fraud, pengaturan, izin, mobile.
# Backend ditiru di browser (window.supabase stub) hanya untuk menguji antarmuka; logika data diuji di ops/tests/admin-affiliate.test.sql.
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
def newpage(b, vw=1280, role="super_admin", perms=None):
    ctx = b.new_context(viewport={"width": vw, "height": 900}, accept_downloads=True); errs = []
    pg = ctx.new_page(); pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.route("**/supabase-js@*/**", lambda r: r.fulfill(status=200, content_type="text/javascript", body=STUB))
    pg.route("**/fonts.googleapis.com/**", lambda r: r.abort()); pg.route("**/fonts.gstatic.com/**", lambda r: r.abort())
    pg.add_init_script("sessionStorage.setItem('__role', %s);sessionStorage.setItem('__perms', %s)" % (json.dumps(json.dumps(role)), json.dumps(json.dumps(perms or []))))
    return ctx, pg, errs
def txt(pg, sel="#view"): return pg.inner_text(sel)

STUB = r"""window.__calls=[];window.__out=0;
var ROLE=JSON.parse(sessionStorage.getItem('__role'));
var PERMS=ROLE==='super_admin'?['dashboard.read','affiliate.read','affiliate.write']:['dashboard.read','affiliate.read'];
var NOW=Date.now(),H=36e5,iso=function(n){return new Date(NOW+n*H).toISOString()};
var FAIL=null,SET={program_enabled:false,auto_approve:false,commission_type:'percent',commission_value:10,attribution_days:30,hold_days:14,min_withdrawal:100000,require_bank_verified:true,fraud_ip_limit:3,fraud_fast_minutes:10};
var AFF=[];for(var i=0;i<30;i++)AFF.push({id:'a'+i,code:i===0?'AAAA1111':'KODE'+(1000+i),status:i===0?'pending':'aktif',bank_status:i===0?'pending':'none',bank_name:null,bank_mask:null,created_at:iso(-i),name:i===0?'Budi <img src=x onerror=window.__xss=1>':'Nama '+i,email:'n'+i+'@uji.test',custom_rate:false,clicks:i,signups:2,paid:1,commission:50000,balance:20000,in_review:i===1?2:0});
var REF=[{id:'r1',status:'berbayar',commission:50000,commission_status:'review',commission_available_at:null,fraud_reasons:['ip_sama_dengan_affiliate','bayar_terlalu_cepat'],attributed_at:iso(-5),paid_at:iso(-4),code:'AAAA1111',affiliate_id:'a0',referred_name:'Ani',referred_email:'ani@uji.test',review_note:null},
 {id:'r2',status:'berbayar',commission:40000,commission_status:'pending',commission_available_at:iso(100),fraud_reasons:[],attributed_at:iso(-8),paid_at:iso(-7),code:'KODE1001',affiliate_id:'a1',referred_name:'Candra',referred_email:'c@uji.test',review_note:null},
 {id:'r3',status:'terdaftar',commission:0,commission_status:'none',commission_available_at:null,fraud_reasons:[],attributed_at:iso(-9),paid_at:null,code:'KODE1001',affiliate_id:'a1',referred_name:'Dewi',referred_email:'d@uji.test',review_note:null}];
var WD=[{id:'w1',amount:150000,status:'diproses',created_at:iso(-3),bank_name:'BCA',bank_account_no:'1234567890',bank_account_name:'Budi',bank_verified:true,note:null,payout_ref:null,processed_at:null,name:'Budi',email:'b@uji.test',code:'AAAA1111',balance_now:0,in_review:1},
 {id:'w2',amount:200000,status:'berhasil',created_at:iso(-30),bank_name:'BNI',bank_account_no:'999',bank_account_name:'Sari',bank_verified:true,note:null,payout_ref:'TRF-77',processed_at:iso(-29),name:'Sari',email:'s@uji.test',code:'KODE1002',balance_now:0,in_review:0}];
function ok(d){return Promise.resolve({data:d===undefined?null:d,error:null})}
function ret(d){return FAIL?Promise.resolve({data:null,error:FAIL}):ok(d)}
function qb(t){var o={};['select','order','range','or','in','gte','lte','lt','gt','neq','ilike','contains','not','is','limit','eq'].forEach(function(m){o[m]=function(){return o}});o.maybeSingle=function(){return o};o.then=function(a,b){return Promise.resolve({data:[],error:null}).then(a,b)};return o}
window.supabase={createClient:function(){return{
 from:qb,
 rpc:function(n,a){window.__calls.push([n,a]);
  if(n==='my_admin')return ok({role:ROLE,perms:PERMS,mfa:{needed:false}});
  if(n==='admin_role_labels')return ok({super_admin:'Super Admin',admin:'Admin'});
  if(n==='admin_session_ping')return ok({ok:true,tracked:true});
  if(n==='admin_aff_overview')return ok({enabled:SET.program_enabled,affiliates:{aktif:28,pending:1,suspended:1,bank_pending:1},clicks_30d:120,signups_30d:30,paid_30d:9,commission:{pending:80000,review:50000,approved:300000},review_count:1,withdrawals:{waiting:1,waiting_amount:150000,paid_amount:200000},top:[{code:'KODE1001',signups:5,paid:3,commission:120000}]});
  if(n==='admin_aff_list'){var r=AFF.filter(function(x){return(!a.p_status||x.status===a.p_status)&&(!a.p_bank||x.bank_status===a.p_bank)&&(!a.p_q||JSON.stringify(x).toLowerCase().indexOf(a.p_q.toLowerCase())>-1)});return ok({total:r.length,rows:r.slice(a.p_offset,a.p_offset+a.p_limit)})}
  if(n==='admin_aff_detail')return ok({id:a.p_id,code:'AAAA1111',status:'pending',status_reason:null,created_at:iso(-2),approved_at:null,name:'Budi',email:'b@uji.test',whatsapp:'+6281',rate:{type:null,value:null},bank:{status:'pending',name:'BCA',account_no:ROLE==='super_admin'?'1234567890':'••••••7890',account_name:'Budi Santoso',note:null,name_match:false,shared_with:1},stats:{clicks:10,clicks_30d:5,signups:3,paid:1,commission_pending:0,commission_approved:50000,withdrawn:0,balance:50000}});
  if(n==='admin_aff_referrals'){var r2=REF.filter(function(x){return!a.p_cstatus||x.commission_status===a.p_cstatus});return ok({total:r2.length,rows:r2})}
  if(n==='admin_aff_withdrawals'){var r3=WD.filter(function(x){return!a.p_status||x.status===a.p_status});return ok({total:r3.length,rows:r3})}
  if(n==='admin_aff_fraud')return ok({flagged:[{id:'r1',code:'AAAA1111',fraud_reasons:['ip_sama_dengan_affiliate'],commission:50000,attributed_at:iso(-5)}],ip_clusters:[{ip:'abcd1234',signups:4,affiliates:1,codes:['AAAA1111']}],shared_banks:[{account:'••••7890',affiliates:2,codes:['AAAA1111','KODE1001']}],click_bursts:[{code:'KODE1002',clicks:150,visitors:2}]});
  if(n==='admin_aff_settings_get')return ok(SET);
  if(n==='admin_aff_settings_save'){if(!FAIL)Object.assign(SET,a.p_vals);return ret(null)}
  if(['admin_aff_set_status','admin_aff_bank_review','admin_aff_set_rate','admin_aff_referral_review','admin_aff_withdrawal_process','admin_aff_release_due'].indexOf(n)>-1)return ret(null);
  return ok([])},
 functions:{invoke:function(){return Promise.resolve({data:null,error:null})}},
 storage:{from:function(){return{}}},
 auth:{getSession:function(){return Promise.resolve({data:{session:{access_token:'tok',user:{id:'u1',email:'adm@uji.test'}}}})},signOut:function(){window.__out++;return Promise.resolve({})},onAuthStateChange:function(){return{data:{subscription:{unsubscribe:function(){}}}}}}}}};"""

def calls(pg, n): return [c[1] for c in pg.evaluate("window.__calls") if c[0] == n]
def go(pg, tab, sel): pg.goto(BASE + "/admin#affiliate:" + tab); pg.wait_for_selector(sel, timeout=15000)
def noscroll(pg): return pg.evaluate("document.documentElement.scrollWidth <= window.innerWidth + 1")
def confirm(pg): pg.wait_for_selector("#cdlg[open]"); pg.click("#cdlg-y")
def fillask(pg, **kw):
    pg.wait_for_selector("#af-ask[open]")
    for k, v in kw.items(): pg.fill("#af-ask [name=%s]" % k, v)
    pg.click("#af-ask button[type=submit]")
with sync_playwright() as pw:
    b = pw.chromium.launch()
    ctx, pg, errs = newpage(b); ctx.set_default_timeout(15000); go(pg, "ov", ".af-cards")
    tabs = [x.strip() for x in pg.locator(".tabs button").all_inner_texts()]
    chk("7 tab Affiliate", tabs == ["Ringkasan", "Affiliate", "Referral & Konversi", "Penarikan", "Deteksi Fraud", "Pengaturan Program", "Komisi & Bonus", "Laporan"][:len(tabs)] and len(tabs) == 8, tabs)
    t = txt(pg)
    chk("ringkasan: Coming Soon saat program tutup + angka", "Coming Soon" in t and "28" in t and "KODE1001" in t, t[:300])
    # daftar
    go(pg, "list", ".tbl-w tbody tr")
    chk("daftar: 25 baris + halaman", pg.locator(".tbl-w tbody tr").count() == 25 and "halaman 1 dari 2" in txt(pg))
    chk("nama berisi HTML tidak dieksekusi", pg.evaluate("window.__xss") is None)
    pg.click(".af-pg [data-p='1']"); pg.wait_for_function("document.querySelectorAll('.tbl-w tbody tr').length==5")
    pg.select_option("#al-s", "pending"); pg.wait_for_function("document.querySelectorAll('.tbl-w tbody tr').length==1")
    chk("filter status dikirim ke RPC", calls(pg, "admin_aff_list")[-1]["p_status"] == "pending" and calls(pg, "admin_aff_list")[-1]["p_offset"] == 0)
    pg.locator("[data-id='a0']").click(); pg.wait_for_selector("#af-det[open] .af-kv")
    d = pg.inner_text("#af-det")
    chk("detail: rekening, peringatan nama berbeda & rekening dipakai bersama", "Berbeda dari nama akun" in d and "dipakai 1 affiliate lain" in d and "1234567890" in d, d[:400])
    pg.click("[data-a=bv]"); confirm(pg); pg.wait_for_function("window.__calls.some(c=>c[0]==='admin_aff_bank_review')")
    chk("verifikasi rekening", calls(pg, "admin_aff_bank_review")[0] == {"p_id": "a0", "p_action": "verify"})
    pg.click("[data-a=br]"); fillask(pg, r="ok"); chk("alasan pendek ditolak di klien", "minimal 3" in pg.inner_text("#af-ask .af-e") and len(calls(pg, "admin_aff_bank_review")) == 1)
    fillask(pg, r="Nama tidak cocok"); pg.wait_for_function("window.__calls.filter(c=>c[0]==='admin_aff_bank_review').length==2")
    chk("tolak rekening kirim alasan", calls(pg, "admin_aff_bank_review")[1] == {"p_id": "a0", "p_action": "reject", "p_note": "Nama tidak cocok"})
    pg.click("[data-a=on]"); pg.wait_for_function("window.__calls.some(c=>c[0]==='admin_aff_set_status')")
    chk("aktifkan affiliate", calls(pg, "admin_aff_set_status")[0] == {"p_id": "a0", "p_status": "aktif"})
    pg.click("[data-a=rate]"); fillask(pg, t="persen", v="abc"); pg.wait_for_selector(".toast")
    chk("komisi khusus tak valid ditolak di klien", not calls(pg, "admin_aff_set_rate"))
    pg.click("[data-a=rate]"); fillask(pg, t="tetap", v="25000"); pg.wait_for_function("window.__calls.some(c=>c[0]==='admin_aff_set_rate')")
    chk("komisi khusus tetap", calls(pg, "admin_aff_set_rate")[0] == {"p_id": "a0", "p_type": "fixed", "p_value": 25000})
    pg.keyboard.press("Escape")
    # referral
    go(pg, "ref", ".tbl-w tbody tr")
    t = txt(pg)
    chk("referral: tanda risiko diterjemahkan", "IP sama dengan affiliate" in t and "Bayar terlalu cepat" in t and "Perlu tinjauan" in t)
    pg.locator("[data-a=ok][data-id=r1]").click(); fillask(pg, r="Sudah diverifikasi manual"); pg.wait_for_function("window.__calls.some(c=>c[0]==='admin_aff_referral_review')")
    chk("setujui komisi bertanda wajib alasan", calls(pg, "admin_aff_referral_review")[0] == {"p_id": "r1", "p_action": "approve", "p_note": "Sudah diverifikasi manual"})
    pg.locator("[data-a=ok][data-id=r2]").click(); confirm(pg); pg.wait_for_function("window.__calls.filter(c=>c[0]==='admin_aff_referral_review').length==2")
    chk("setujui komisi biasa tanpa alasan", calls(pg, "admin_aff_referral_review")[1]["p_note"] is None)
    pg.locator("[data-a=no][data-id=r2]").click(); fillask(pg, r="Pesanan palsu"); pg.wait_for_function("window.__calls.filter(c=>c[0]==='admin_aff_referral_review').length==3")
    chk("tolak komisi", calls(pg, "admin_aff_referral_review")[2]["p_action"] == "reject")
    pg.click("#rf-rel"); pg.wait_for_function("window.__calls.some(c=>c[0]==='admin_aff_release_due')")
    # penarikan
    go(pg, "wd", ".tbl-w tbody tr")
    chk("penarikan: default hanya yang menunggu", pg.locator(".tbl-w tbody tr").count() == 1 and "manual" in txt(pg))
    with pg.expect_download() as dl: pg.click("#wd-csv")
    chk("CSV diunduh", dl.value.suggested_filename == "penarikan-affiliate.csv")
    pg.click("[data-a=paid]"); fillask(pg, ref="TF"); chk("referensi pendek ditolak", len(calls(pg, "admin_aff_withdrawal_process")) == 0)
    fillask(pg, ref="TRF-123"); pg.wait_for_function("window.__calls.some(c=>c[0]==='admin_aff_withdrawal_process')")
    chk("tandai dibayar kirim referensi", calls(pg, "admin_aff_withdrawal_process")[0]["p_ref"] == "TRF-123" and calls(pg, "admin_aff_withdrawal_process")[0]["p_action"] == "paid")
    pg.select_option("#wd-s", ""); pg.wait_for_function("document.querySelectorAll('.tbl-w tbody tr').length==2")
    # fraud
    go(pg, "fraud", "h3.af-sec")
    t = txt(pg)
    chk("fraud: 4 bagian", "abcd1234" in t and "Rekening dipakai" in t and "KODE1002" in t and "heuristik" in t)
    # pengaturan
    go(pg, "set", "#as-f")
    chk("pengaturan: nilai dimuat + Coming Soon", pg.input_value("[name=hold_days]") == "14" and "Coming Soon" in txt(pg))
    pg.fill("[name=commission_value]", "12"); pg.click("#as-f button[type=submit]"); pg.wait_for_function("window.__calls.some(c=>c[0]==='admin_aff_settings_save')")
    chk("simpan pengaturan tanpa konfirmasi bila tidak membuka program", calls(pg, "admin_aff_settings_save")[0]["p_vals"]["commission_value"] == 12 and calls(pg, "admin_aff_settings_save")[0]["p_vals"]["program_enabled"] is False)
    pg.check("[name=program_enabled]"); pg.click("#as-f button[type=submit]"); confirm(pg); pg.wait_for_function("window.__calls.filter(c=>c[0]==='admin_aff_settings_save').length==2")
    chk("membuka program minta konfirmasi", calls(pg, "admin_aff_settings_save")[1]["p_vals"]["program_enabled"] is True)
    pg.wait_for_function("!document.body.innerText.includes('Coming Soon')")
    pg.fill("[name=hold_days]", ""); pg.click("#as-f button[type=submit]"); chk("isian kosong ditolak di klien", "diisi dengan benar" in pg.inner_text(".af-e") and len(calls(pg, "admin_aff_settings_save")) == 2)
    chk("tanpa galat JS", not errs, errs)
    # mobile
    ctx.close(); ctx, pg, errs = newpage(b, 375); ctx.set_default_timeout(15000)
    for tb, sel in [("ov", ".af-cards"), ("list", ".tbl-w"), ("ref", ".tbl-w"), ("wd", ".tbl-w"), ("fraud", "h3.af-sec"), ("set", "#as-f")]:
        go(pg, tb, sel); chk("mobile 375px tanpa scroll horizontal: " + tb, noscroll(pg))
    ctx.close()
    # hanya baca
    ctx, pg, errs = newpage(b, 1280, role="admin"); ctx.set_default_timeout(15000); go(pg, "ref", ".tbl-w tbody tr")
    chk("hanya baca: tanpa tombol aksi referral", pg.locator("[data-a]").count() == 0)
    go(pg, "wd", ".tbl-w tbody tr"); chk("hanya baca: tanpa tombol bayar", pg.locator("[data-a]").count() == 0)
    go(pg, "set", "#as-f"); chk("hanya baca: pengaturan nonaktif, tanpa simpan", pg.locator("#as-f button[type=submit]").count() == 0 and pg.locator("[name=hold_days]:disabled").count() == 1)
    go(pg, "list", ".tbl-w tbody tr"); pg.locator("[data-id='a0']").first.click(); pg.wait_for_selector("#af-det .af-kv"); chk("hanya baca: detail tanpa tombol aksi", pg.locator("#af-det [data-a]").count() == 0 and "••••" in pg.inner_text("#af-det"))
    ctx.close(); b.close()
print("\n%d lulus, %d gagal" % (ok_n, bad_n)); raise SystemExit(1 if bad_n else 0)
