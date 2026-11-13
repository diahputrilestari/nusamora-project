# Uji UI admin: Admin & Role: admin users, peran & izin, sesi & login, keamanan akses, audit log, izin, mobile.
# Backend ditiru di browser (window.supabase stub) hanya untuk menguji antarmuka; logika data diuji di ops/tests/admin-roles.test.sql.
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
var ROLE=JSON.parse(sessionStorage.getItem('__role'));var EXTRA=JSON.parse(sessionStorage.getItem('__perms'));
var ALLP=['dashboard.read','admins.read','admins.write','admins.delete'];
var PERMS=ROLE==='super_admin'?ALLP:['dashboard.read','admins.read'].concat(EXTRA);
var NOW=Date.now(),H=36e5,iso=function(n){return new Date(NOW+n*H).toISOString()};
var MODS=['dashboard','customers','invitations','templates','live','transactions','plans','content','affiliate','support','reports','notifications','settings','admins','dating'];
var ADMINS=[{user_id:'u1',email:'adm@uji.test',role:'super_admin',role_label:'Super Admin',active:true,created_at:iso(-900),last_sign_in_at:iso(-1),mfa_factors:1,live_sessions:1,last_seen:iso(-0.1),last_ip:'10.0.0.1',scopes:{}},
 {user_id:'u2',email:'ops<img src=x onerror=window.__xss=1>@uji.test',role:'admin',role_label:'Admin Operasional',active:true,created_at:iso(-500),last_sign_in_at:iso(-20),mfa_factors:0,live_sessions:2,last_seen:iso(-3),last_ip:'203.0.113.9',scopes:{content_type:['faq']}},
 {user_id:'u3',email:'lama@uji.test',role:'support',role_label:'Admin Support',active:false,created_at:iso(-300),last_sign_in_at:null,mfa_factors:0,live_sessions:0,last_seen:null,last_ip:null,scopes:{}}];
var ROLES=[{key:'super_admin',label:'Super Admin',description:'Seluruh platform',is_system:true,members:1,perms:MODS.reduce(function(a,m){return a.concat([m+'.read',m+'.write',m+'.delete'])},[]),preset:null},
 {key:'admin',label:'Admin Operasional',description:'Pelanggan dan transaksi',is_system:true,members:1,perms:['customers.read','customers.write','dashboard.read'],preset:['dashboard.read','customers.read']},
 {key:'rl_pemasaran',label:'Pemasaran',description:'Kustom',is_system:false,members:0,perms:['content.read'],preset:null}];
var CATS=[{id:'c1',name:'Pernikahan'},{id:'c2',name:'Ulang Tahun'}];
var SES=[];for(var i=0;i<30;i++)SES.push({session_id:'s'+i,user_id:i%2?'u1':'u2',email:i%2?'adm@uji.test':'ops@uji.test',role:'admin',ip:'10.0.0.'+i,device:'Chrome di Windows',new_ip:i===3,new_device:i===3,first_seen:iso(-i),last_seen:iso(-i+0.5),ended_at:i>20?iso(-i+1):null,ended_reason:i>20?'dipaksa_keluar':null,live:i<5,current:i===1});
var AUD=[];for(var j=0;j<60;j++)AUD.push({id:j,created_at:iso(-j),actor_id:'u1',actor_email:'adm@uji.test',action:j===0?'update':'insert',table_name:j===0?'plans':'contents',row_id:j===0?'=1+1':'row'+j,summary:j===0?{price:[79000,89000],name:['=CMD()','Essential']}:{title:'Judul '+j}});
var ACC={idle_timeout_min:0,mfa_available:true,mfa_required:false,admins_active:2,admins_with_mfa:1};
var ALERTS=[{id:1,at:iso(-2),kind:'admin_new_ip',actor:'u2',email:'ops@uji.test',detail:{ip:'203.0.113.9',device:'Chrome di Windows'}}];
var FAIL=null,REVOKE=sessionStorage.getItem('__revoke')==='1';
function ok(d){return Promise.resolve({data:d===undefined?null:d,error:null})}
function ret(d){return FAIL?Promise.resolve({data:null,error:FAIL}):ok(d)}
function qb(t){var o={};['select','order','range','or','in','gte','lte','lt','gt','neq','ilike','contains','not','is','limit','eq'].forEach(function(m){o[m]=function(){return o}});o.maybeSingle=function(){return o};o.then=function(a,b){return Promise.resolve({data:[],error:null}).then(a,b)};return o}
window.supabase={createClient:function(){return{
 from:qb,
 rpc:function(n,a){window.__calls.push([n,a]);
  if(n==='my_admin')return ok({role:ROLE,perms:PERMS,mfa:{needed:false}});
  if(n==='admin_role_labels')return ok({super_admin:'Super Admin',admin:'Admin Operasional',rl_pemasaran:'Pemasaran',support:'Admin Support'});
  if(n==='admin_list_admins')return ok(ADMINS.map(function(x){return{user_id:x.user_id,email:x.email,role:x.role,active:x.active,created_at:x.created_at}}));
  if(n==='admin_session_ping')return ok(REVOKE?{ok:false,revoked:true}:{ok:true,tracked:true});
  if(n==='admin_admins_overview')return ok(ADMINS);
  if(n==='admin_roles_overview')return ok({modules:MODS,roles:ROLES,categories:CATS});
  if(n==='admin_sessions_list'){var r=SES.filter(function(s){return(!a.p_user||s.user_id===a.p_user)&&(!a.p_flagged||s.new_ip||s.new_device)&&(!a.p_active||s.live)});return ok({total:r.length,rows:r.slice(a.p_offset||0,(a.p_offset||0)+(a.p_limit||100))})}
  if(n==='admin_access_get')return ok(ACC);
  if(n==='admin_security_alerts')return ok(ALERTS);
  if(n==='admin_audit_facets')return ok({tables:['contents','plans'],actions:['insert','update'],actors:[{id:'u1',email:'adm@uji.test'}]});
  if(n==='admin_audit_list'){var q=(a.p_q||'').toLowerCase();var r2=AUD.filter(function(x){return(!a.p_table||x.table_name===a.p_table)&&(!a.p_action||x.action===a.p_action)&&(!q||JSON.stringify(x).toLowerCase().indexOf(q)>-1)});return ok({total:r2.length,rows:r2.slice(a.p_offset||0,(a.p_offset||0)+(a.p_limit||25))})}
  if(n==='admin_force_logout')return ret(1);
  if(['admin_add_admin','admin_set_role','admin_set_active','admin_scope_set','admin_role_save','admin_role_delete','admin_role_apply_preset','admin_access_set'].indexOf(n)>-1)return ret(null);
  return ok([])},
 functions:{invoke:function(){return Promise.resolve({data:null,error:null})}},
 storage:{from:function(){return{}}},
 auth:{getSession:function(){return Promise.resolve({data:{session:{access_token:'tok',user:{id:'u1',email:'adm@uji.test'}}}})},signOut:function(){window.__out++;sessionStorage.setItem('__outn','1');return Promise.resolve({})},onAuthStateChange:function(){return{data:{subscription:{unsubscribe:function(){}}}}}}}}};"""

def calls(pg, n): return [c[1] for c in pg.evaluate("window.__calls") if c[0] == n]
def go(pg, tab, sel): pg.goto(BASE + "/admin#admins:" + tab); pg.wait_for_selector(sel, timeout=15000)
def noscroll(pg): return pg.evaluate("document.documentElement.scrollWidth <= window.innerWidth + 1")
def confirm(pg): pg.wait_for_selector("#cdlg[open]"); pg.click("#cdlg-y")
with sync_playwright() as pw:
    b = pw.chromium.launch()
    ctx, pg, errs = newpage(b); ctx.set_default_timeout(15000); go(pg, "list", ".tbl-w tbody tr")
    tabs = [x.strip() for x in pg.locator(".tabs button").all_inner_texts()]
    chk("5 tab Admin & Role", tabs == ["Admin Users", "Peran & Izin", "Sesi & Login", "Keamanan Akses", "Audit Log"], tabs)
    chk("sesi dicatat saat panel dibuka (ping)", len(calls(pg, "admin_session_ping")) >= 1)
    chk("label peran kustom dimuat ke header", "Super Admin" in pg.inner_text("#chip-n"))
    t = txt(pg)
    chk("admin users: 3 baris, peran, MFA, sesi, pembatasan", pg.locator(".tbl-w tbody tr").count() == 3 and "Admin Operasional" in t and "1 pembatasan" in t and "10.0.0.1" in t, t[:300])
    chk("email tidak dieksekusi sebagai HTML (XSS)", pg.evaluate("window.__xss") is None and "onerror" in t)
    # tambah admin
    pg.click("#ad-new"); pg.wait_for_selector("#af")
    pg.fill("#a-em", "salah"); pg.click("#af button[type=submit]"); chk("email tak valid ditolak di klien", "tidak valid" in pg.inner_text("#a-e") and not calls(pg, "admin_add_admin"))
    pg.fill("#a-em", "baru@uji.test"); pg.select_option("#a-role", "rl_pemasaran"); pg.click("#af button[type=submit]"); pg.wait_for_function("window.__calls.some(c=>c[0]==='admin_add_admin')")
    chk("tambah admin: email & peran dikirim", calls(pg, "admin_add_admin")[0] == {"p_email": "baru@uji.test", "p_role": "rl_pemasaran"}, calls(pg, "admin_add_admin"))
    pg.wait_for_selector("#ar-add:not([open])", state="attached")
    pg.click("#ad-new"); pg.wait_for_selector("#af"); pg.evaluate("FAIL={message:'Pengguna dengan email itu belum terdaftar'}"); pg.fill("#a-em", "x@uji.test"); pg.click("#af button[type=submit]"); pg.wait_for_function("document.querySelector('#a-e').textContent.length>0")
    chk("galat 'belum terdaftar' diterjemahkan", "mendaftar" in pg.inner_text("#a-e")); pg.evaluate("FAIL=null"); pg.keyboard.press("Escape")
    # kelola diri sendiri
    pg.locator("[data-u='u1']").click(); pg.wait_for_selector("#ar-mg[open]")
    chk("akun sendiri: peran terkunci, tanpa tombol nonaktifkan", pg.locator("#m-role:disabled").count() == 1 and pg.locator("#m-act").count() == 0 and "akun Anda" in pg.inner_text("#ar-mg"))
    pg.keyboard.press("Escape")
    # kelola admin lain
    pg.locator("[data-u='u2']").click(); pg.wait_for_selector("#ar-mg[open]"); pg.wait_for_selector("#m-ses table")
    chk("sesi aktif admin lain tampil dengan tombol keluarkan", pg.locator("#m-ses [data-k]").count() >= 1)
    pg.select_option("#m-role", "rl_pemasaran"); pg.click("#m-rs"); pg.wait_for_function("window.__calls.some(c=>c[0]==='admin_set_role')")
    chk("ubah peran", calls(pg, "admin_set_role")[0] == {"p_user": "u2", "p_role": "rl_pemasaran"})
    pg.locator("[data-u='u2']").click(); pg.wait_for_selector("#ar-mg[open]"); pg.wait_for_selector("#m-ses table")
    chk("pembatasan tersimpan tampil tercentang", pg.is_checked("[data-sc=content_type][value=faq]") and not pg.is_checked("[data-sc=content_type][value=article]"))
    pg.check("[data-sc=template_category][value=c1]"); pg.check("[data-sc=content_type][value=article]"); pg.click("#m-ss"); pg.wait_for_function("window.__calls.filter(c=>c[0]==='admin_scope_set').length>=2")
    sc = calls(pg, "admin_scope_set")
    chk("simpan pembatasan: kedua jenis dikirim", sc[0] == {"p_user": "u2", "p_kind": "template_category", "p_values": ["c1"]} and sc[1]["p_kind"] == "content_type" and sorted(sc[1]["p_values"]) == ["article", "faq"], sc)
    pg.locator("[data-u='u2']").click(); pg.wait_for_selector("#m-ses table")
    pg.locator("#m-ses [data-k]").first.click(); confirm(pg); pg.wait_for_function("window.__calls.some(c=>c[0]==='admin_force_logout')")
    chk("keluarkan satu sesi", calls(pg, "admin_force_logout")[0]["p_user"] == "u2" and calls(pg, "admin_force_logout")[0]["p_session"] and calls(pg, "admin_force_logout")[0]["p_keep_current"] is False)
    pg.wait_for_selector("#m-ka"); pg.click("#m-ka"); pg.wait_for_selector("#cdlg[open]"); chk("keluarkan semua: peringatan akun pelanggan ikut keluar", "dashboard pelanggan" in pg.inner_text("#cdlg-b")); pg.click("#cdlg-y")
    pg.wait_for_function("window.__calls.filter(c=>c[0]==='admin_force_logout').length>=2"); chk("keluarkan semua: tanpa p_session", calls(pg, "admin_force_logout")[1]["p_session"] is None)
    pg.click("#m-act"); confirm(pg); pg.wait_for_function("window.__calls.some(c=>c[0]==='admin_set_active')"); chk("nonaktifkan admin", calls(pg, "admin_set_active")[0] == {"p_user": "u2", "p_active": False})
    pg.locator("[data-u='u3']").click(); pg.wait_for_selector("#ar-mg[open]"); chk("admin nonaktif: tombol Aktifkan", "Aktifkan admin" in pg.inner_text("#m-act")); pg.keyboard.press("Escape")
    pg.evaluate("FAIL={message:'super_admin_terakhir'}"); pg.locator("[data-u='u2']").click(); pg.wait_for_selector("#m-rs"); pg.click("#m-rs"); pg.wait_for_function("document.querySelector('#m-e').textContent.length>0")
    chk("galat super admin terakhir diterjemahkan", "terakhir" in pg.inner_text("#m-e")); pg.evaluate("FAIL=null"); pg.keyboard.press("Escape")
    chk("tanpa galat JavaScript", not errs, errs); ctx.close()

    # peran & izin
    ctx, pg, errs = newpage(b); ctx.set_default_timeout(15000); go(pg, "roles", ".tbl-w tbody tr"); t = txt(pg)
    chk("peran: 3 peran, jenis, ringkasan izin", pg.locator(".tbl-w").first.locator("tbody tr").count() == 3 and "Bawaan" in t and "Kustom" in t and "Ringkasan izin" in t and "BTH" in t)
    pg.locator("[data-r='rl_pemasaran']").click(); pg.wait_for_selector("#rf")
    chk("peran kustom: izin tampil, hanya Lihat konten", pg.is_checked("[data-p='content.read']") and not pg.is_checked("[data-p='content.write']"))
    chk("Admin & Role: ubah/hapus terkunci (khusus Super Admin)", pg.locator("[data-p='admins.write']:disabled").count() == 1 and pg.locator("[data-p='admins.delete']:disabled").count() == 1 and pg.locator("[data-p='admins.read']:enabled").count() == 1)
    pg.check("[data-p='templates.delete']"); chk("centang Hapus otomatis mencentang Ubah dan Lihat", pg.is_checked("[data-p='templates.write']") and pg.is_checked("[data-p='templates.read']"))
    pg.uncheck("[data-p='templates.read']"); chk("cabut Lihat otomatis mencabut Ubah dan Hapus", not pg.is_checked("[data-p='templates.write']") and not pg.is_checked("[data-p='templates.delete']"))
    pg.check("[data-p='templates.write']"); pg.fill("#r-l", "Pemasaran Baru"); pg.click("#rf button[type=submit]"); pg.wait_for_function("window.__calls.some(c=>c[0]==='admin_role_save')")
    s = calls(pg, "admin_role_save")[0]
    chk("simpan peran: kunci, nama, izin, bukan baru", s["p_key"] == "rl_pemasaran" and s["p_label"] == "Pemasaran Baru" and sorted(s["p_perms"]) == ["content.read", "templates.read", "templates.write"] and s["p_new"] is False, s)
    pg.click("#rl-new"); pg.wait_for_selector("#rf"); pg.fill("#r-k", "tim_baru"); pg.fill("#r-l", "Tim Baru"); pg.check("[data-p='reports.read']")
    pg.click("#rf button[type=submit]"); pg.wait_for_function("window.__calls.filter(c=>c[0]==='admin_role_save').length>=2")
    s = calls(pg, "admin_role_save")[1]; chk("peran baru: p_new true", s["p_new"] is True and s["p_key"] == "tim_baru" and s["p_perms"] == ["reports.read"], s)
    pg.click("#rl-new"); pg.wait_for_selector("#rf"); pg.evaluate("FAIL={message:'peran_sudah_ada'}"); pg.fill("#r-k", "admin"); pg.fill("#r-l", "Dobel"); pg.click("#rf button[type=submit]"); pg.wait_for_function("document.querySelector('#r-e').textContent.length>0")
    chk("galat peran sudah ada diterjemahkan", "sudah dipakai" in pg.inner_text("#r-e")); pg.evaluate("FAIL=null"); pg.keyboard.press("Escape")
    pg.locator("[data-r='rl_pemasaran']").click(); pg.wait_for_selector("#r-del"); pg.click("#r-del"); confirm(pg); pg.wait_for_function("window.__calls.some(c=>c[0]==='admin_role_delete')"); chk("hapus peran kustom (konfirmasi)", calls(pg, "admin_role_delete")[0] == {"p_key": "rl_pemasaran"})
    pg.locator("[data-r='admin']").click(); pg.wait_for_selector("#rf"); chk("peran bawaan: tombol kembalikan, tanpa hapus", pg.locator("#r-pre").count() == 1 and pg.locator("#r-del").count() == 0 and pg.locator("#r-k:disabled").count() == 1)
    pg.click("#r-pre"); confirm(pg); pg.wait_for_function("window.__calls.some(c=>c[0]==='admin_role_apply_preset')"); chk("kembalikan ke bawaan", calls(pg, "admin_role_apply_preset")[0] == {"p_key": "admin"})
    pg.locator("[data-r='super_admin']").click(); pg.wait_for_selector("#rf"); chk("Super Admin: semua terkunci dan tercentang", pg.locator("#rf [data-p]:checked").count() == 45 and pg.locator("#rf [data-p]:enabled").count() == 0 and pg.locator("#rf button[type=submit]").count() == 0)
    chk("tanpa galat JavaScript", not errs, errs); ctx.close()

    # sesi & login
    ctx, pg, errs = newpage(b); ctx.set_default_timeout(15000); go(pg, "sessions", ".tbl-w tbody tr")
    chk("sesi: halaman pertama 25 baris, penomoran", pg.locator(".tbl-w tbody tr").count() == 25 and "1-25 dari 30" in txt(pg))
    pg.click("#s-n"); pg.wait_for_function("document.querySelectorAll('.tbl-w tbody tr').length==5"); chk("halaman 2: 5 baris", "26-30 dari 30" in txt(pg)); pg.click("#s-p"); pg.wait_for_function("document.querySelectorAll('.tbl-w tbody tr').length==25")
    pg.check("#s-f"); pg.wait_for_function("document.querySelectorAll('.tbl-w tbody tr').length==1"); t = txt(pg)
    chk("filter IP/perangkat baru: tanda tampil", "IP baru" in t and "Perangkat baru" in t); pg.uncheck("#s-f")
    pg.check("#s-a"); pg.wait_for_function("document.querySelectorAll('.tbl-w tbody tr').length==5"); chk("hanya aktif: sesi ini tanpa tombol keluarkan", pg.locator("[data-k]").count() == 4 and "Sesi ini" in txt(pg))
    pg.locator("[data-k]").first.click(); confirm(pg); pg.wait_for_function("window.__calls.some(c=>c[0]==='admin_force_logout')"); chk("keluarkan dari tabel sesi", calls(pg, "admin_force_logout")[0]["p_session"])
    pg.uncheck("#s-a"); pg.select_option("#s-u", "u2"); pg.wait_for_function("window.__calls.some(c=>c[0]==='admin_sessions_list'&&c[1].p_user==='u2')"); chk("filter per admin", True)
    chk("tanpa galat JavaScript", not errs, errs); ctx.close()

    # keamanan akses
    ctx, pg, errs = newpage(b); ctx.set_default_timeout(15000); go(pg, "sec", "#sf"); t = txt(pg)
    chk("keamanan: kartu MFA, tidak mengaktifkan MFA, peringatan IP baru", "1 / 2" in t and "tidak mengaktifkannya" in t and "Login dari IP baru" in t and "203.0.113.9" in t, t[:300])
    pg.select_option("#sf-i", "30"); pg.click("#sf button[type=submit]"); pg.wait_for_function("window.__calls.some(c=>c[0]==='admin_access_set')"); chk("simpan batas tidak aktif", calls(pg, "admin_access_set")[0] == {"p_idle_min": 30})
    pg.evaluate("FAIL={message:'batas_tidak_aktif_tidak_valid'}"); pg.click("#sf button[type=submit]"); pg.wait_for_function("document.querySelector('#sf-e').textContent.length>0"); chk("galat batas diterjemahkan", "minimal 5" in pg.inner_text("#sf-e")); pg.evaluate("FAIL=null")
    chk("tanpa galat JavaScript", not errs, errs); ctx.close()

    # audit log
    ctx, pg, errs = newpage(b); ctx.set_default_timeout(15000); go(pg, "audit", ".tbl-w tbody tr")
    chk("audit: 25 baris dari 60", pg.locator(".tbl-w tbody tr").count() == 25 and "1-25 dari 60" in txt(pg))
    pg.select_option("#au-t", "plans"); pg.fill("#au-d1", "2026-11-01"); pg.fill("#au-d2", "2026-11-30"); pg.click("#au-f button[type=submit]"); pg.wait_for_function("document.querySelectorAll('.tbl-w tbody tr').length==1")
    a = calls(pg, "admin_audit_list")[-1]
    chk("filter: tabel, tanggal WIB (+07:00) dikirim sebagai UTC", a["p_table"] == "plans" and a["p_from"] == "2026-10-31T17:00:00.000Z" and a["p_to"] == "2026-11-30T17:00:00.000Z", a)
    pg.locator("[data-i='0']").click(); pg.wait_for_selector("#ar-au[open]"); t = pg.inner_text("#ar-au").lower()
    chk("detail: tabel sebelum/sesudah", "sebelum" in t and "79000" in t and "89000" in t, t)
    with pg.expect_download() as dn:
        pg.keyboard.press("Escape"); pg.click("#au-csv")
    f = dn.value.path(); csv = open(f, encoding="utf-8-sig").read()
    chk("CSV: header dan sel berawalan = diberi petik (cegah formula)", csv.startswith('"Waktu"') and '"\'=1+1"' in csv, csv[:300])
    pg.fill("#au-q", "tidak-ada-sama-sekali"); pg.select_option("#au-t", ""); pg.click("#au-f button[type=submit]"); pg.wait_for_selector("text=Tidak ada catatan")
    chk("tanpa hasil: pesan kosong", True)
    chk("tanpa galat JavaScript", not errs, errs); ctx.close()

    # sesi dicabut -> keluar otomatis
    ctx, pg, errs = newpage(b); ctx.set_default_timeout(15000)
    pg.goto(BASE + "/admin#admins:list"); pg.wait_for_selector(".tbl-w tbody tr"); pg.evaluate("sessionStorage.setItem('__revoke','1')"); pg.reload(); pg.wait_for_function("sessionStorage.getItem('__outn')==='1'", timeout=8000)
    chk("sesi dicabut: panel keluar otomatis", True)
    ctx.close()

    # hanya baca (admin dengan admins.read)
    ctx, pg, errs = newpage(b, role="ops"); ctx.set_default_timeout(15000); go(pg, "list", ".tbl-w tbody tr")
    chk("baca saja: tanpa Tambah admin; tombol 'Lihat'", pg.locator("#ad-new").count() == 0 and pg.locator("[data-u='u2']").inner_text() == "Lihat")
    pg.locator("[data-u='u2']").click(); pg.wait_for_selector("#ar-mg[open]"); pg.wait_for_selector("#m-ses table")
    chk("baca saja: tak bisa ubah peran/pembatasan/keluarkan", pg.locator("#m-rs").count() == 0 and pg.locator("#m-ss").count() == 0 and pg.locator("#m-act").count() == 0 and pg.locator("#m-ses [data-k]").count() == 0 and pg.locator("[data-sc]:enabled").count() == 0)
    pg.keyboard.press("Escape"); go(pg, "roles", ".tbl-w tbody tr"); chk("baca saja: tanpa Buat peran", pg.locator("#rl-new").count() == 0)
    pg.locator("[data-r='admin']").click(); pg.wait_for_selector("#rf"); chk("baca saja: izin terkunci, tanpa simpan", pg.locator("#rf [data-p]:enabled").count() == 0 and pg.locator("#rf button[type=submit]").count() == 0); pg.keyboard.press("Escape")
    go(pg, "sec", ".card"); chk("baca saja: batas tidak aktif terkunci", pg.locator("#sf-i:disabled").count() == 1 and pg.locator("#sf button[type=submit]").count() == 0)
    chk("tanpa galat JavaScript", not errs, errs); ctx.close()

    # mobile
    ctx, pg, errs = newpage(b, vw=375); ctx.set_default_timeout(15000)
    for tab, sel in [("list", ".tbl-w tbody tr"), ("roles", ".tbl-w tbody tr"), ("sessions", ".tbl-w tbody tr"), ("sec", "#sf"), ("audit", ".tbl-w tbody tr")]:
        go(pg, tab, sel); chk("mobile 375px: %s tanpa scroll horizontal" % tab, noscroll(pg))
    go(pg, "list", ".tbl-w tbody tr"); pg.locator("[data-u='u2']").click(); pg.wait_for_selector("#m-ses table"); chk("mobile 375px: dialog kelola admin tanpa scroll horizontal", noscroll(pg) and pg.evaluate("var e=document.querySelector('#ar-mg');e.scrollWidth<=e.clientWidth+1"))
    pg.keyboard.press("Escape"); go(pg, "roles", ".tbl-w tbody tr"); pg.locator("[data-r='admin']").click(); pg.wait_for_selector("#rf"); chk("mobile 375px: dialog peran tanpa scroll horizontal", noscroll(pg) and pg.evaluate("var e=document.querySelector('#ar-rl');e.scrollWidth<=e.clientWidth+1"))
    chk("tanpa galat JavaScript", not errs, errs); ctx.close()
    b.close()
print("%d lulus, %d gagal" % (ok_n, bad_n)); raise SystemExit(1 if bad_n else 0)
