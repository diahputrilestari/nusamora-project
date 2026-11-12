# Uji UI admin: Manajemen Pelanggan (daftar tidak error, halaman detail 4 tab, status akun, reset akses) dan Manajemen Undangan (tiga status terpisah, pratinjau, suspend/aktifkan/arsip, riwayat).
# Backend ditiru di browser (window.supabase stub) hanya untuk menguji antarmuka; logika data diuji di ops/tests/admin-customers.test.sql.
import http.server, socketserver, threading, os, json
from playwright.sync_api import sync_playwright
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
    def translate_path(self, p):
        p = p.split("?")[0]; p = "/admin.html" if p == "/admin" else p
        return os.path.join(ROOT, p.lstrip("/"))
srv = socketserver.TCPServer(("127.0.0.1", 0), Q); BASE = "http://127.0.0.1:%d" % srv.server_address[1]
threading.Thread(target=srv.serve_forever, daemon=True).start()
STUB = r"""window.__calls=[];
var PERMS=JSON.parse(sessionStorage.getItem('__perms')||'null')||['dashboard.read','customers.read','customers.write','invitations.read','invitations.write','transactions.read'];
var FAILLIST=sessionStorage.getItem('__faillist')==='1';
var NOW=Date.now(),D=864e5,iso=function(n){return new Date(NOW+n*D).toISOString()};
var CUSTS=[{id:'c1',email:'sari@uji.test',full_name:'Sari Uji',whatsapp:'+628123456789',status:'aktif',created_at:iso(-60),last_sign_in_at:iso(-1),plan:'signature',plan_expires:iso(80)},
 {id:'c2',email:'blok@uji.test',full_name:'Budi Blok',whatsapp:null,status:'suspended',created_at:iso(-30),last_sign_in_at:null,plan:null,plan_expires:null},
 {id:'c3',email:'non@uji.test',full_name:'Nina Nonaktif',whatsapp:null,status:'nonaktif',created_at:iso(-20),last_sign_in_at:null,plan:null,plan_expires:null}];
var INV={i1:{id:'i1',user_id:'c1',title:'Pernikahan <img src=x onerror=window.__xss=1> Sari',slug:'sari-dan-dodi',category:'wedding',event_type:'pernikahan',template_id:'jawa-tengah',package_type:'luxe',experience:'live',event_date:iso(40).slice(0,10),status:'aktif',moderation:'ok',moderation_note:null,archived_at:null,public_url:'https://nusamora.com/sari-dan-dodi',expires_at:iso(80),published_at:iso(-5),created_at:iso(-10),updated_at:iso(-1),guest_count:12,wish_count:3,pay_status:'lunas',pub_status:'aktif',template_name:'Jawa Tengah',plan_name:'Luxe',owner_name:'Sari Uji',owner_email:'sari@uji.test'},
 i2:{id:'i2',user_id:'c1',title:'Ulang Tahun Raka',slug:'raka-10',category:'birthday',template_id:'balon',package_type:'essential',experience:'2d',event_date:null,status:'nonaktif',moderation:'flagged',moderation_note:'Dilaporkan tamu',archived_at:null,public_url:null,expires_at:null,published_at:null,created_at:iso(-3),updated_at:iso(-2),guest_count:0,wish_count:0,pay_status:'belum_bayar',pub_status:'nonaktif',template_name:'Balon',plan_name:'Essential',owner_name:'Sari Uji',owner_email:'sari@uji.test'}};
var LOG={i1:[{kind:'publikasi',from_value:'menunggu_pembayaran',to_value:'aktif',note:null,created_at:iso(-5),actor_id:null,actor_name:null}],i2:[{kind:'moderasi',from_value:'ok',to_value:'flagged',note:'Dilaporkan tamu',created_at:iso(-2),actor_id:'a9',actor_name:'Admin Dua'}]};
function pubOf(i){return i.archived_at?'arsip':i.status}
function list(){return Object.keys(INV).map(function(k){var i=INV[k];i.pub_status=pubOf(i);return i})}
function ok(d){return Promise.resolve({data:d===undefined?null:d,error:null})}
function err(m,c){return Promise.resolve({data:null,error:{message:m,code:c||'P0001'}})}
function cdetail(id){var c=CUSTS.filter(function(x){return x.id===id})[0];if(!c)return null;
 return {profile:{id:c.id,email:c.email,full_name:c.full_name,whatsapp:c.whatsapp,status:c.status,created_at:c.created_at,last_sign_in_at:c.last_sign_in_at,email_confirmed_at:iso(-59),is_admin:false},
  plan:c.plan?{plan:c.plan,started_at:iso(-10),expires_at:c.plan_expires,expired:false}:null,
  subscriptions:c.plan?[{plan:'signature',status:'aktif',started_at:iso(-10),expires_at:c.plan_expires}]:[],
  invitations:c.id==='c1'?list().map(function(i){return {id:i.id,title:i.title,slug:i.slug,package_type:i.package_type,status:i.status,moderation:i.moderation,archived_at:i.archived_at,expires_at:i.expires_at,created_at:i.created_at,updated_at:i.updated_at,pay_status:i.pay_status,pub_status:i.pub_status}}):[],
  tx_visible:PERMS.indexOf('transactions.read')>-1,
  invoices:PERMS.indexOf('transactions.read')>-1&&c.id==='c1'?[{id:'v1',number:'NM-0001',description:'Paket Luxe',amount:149000,status:'lunas',created_at:iso(-10),paid_at:iso(-10),order_id:'NMX1',payment_type:'qris',payment_status:'paid',invitation_id:'i1'}]:[],
  paid_total:PERMS.indexOf('transactions.read')>-1?(c.id==='c1'?149000:0):null,
  activity:[{t:iso(-1),k:'admin',txt:'Status akun diubah menjadi aktif',actor:'a9'},{t:c.created_at,k:'daftar',txt:'Mendaftar akun',actor:null}],actors:{a9:'Admin Dua'}}}
window.supabase={createClient:function(){return{
 from:function(t){var o={insert:function(r){window.__calls.push(['insert:'+t,r]);return ok()},update:function(r){window.__calls.push(['update:'+t,r]);var q={eq:function(k,v){window.__calls.push(['eq',k,v]);return ok()}};return q},select:function(){return o},eq:function(){return o},neq:function(){return o},in:function(){return o},gte:function(){return o},lte:function(){return o},lt:function(){return o},gt:function(){return o},ilike:function(){return o},or:function(){return o},is:function(){return o},order:function(){return o},limit:function(){return o},range:function(){return o},maybeSingle:function(){return ok(null)},then:function(a,b){return Promise.resolve({data:[],error:null,count:0}).then(a,b)}};return o},
 rpc:function(n,a){window.__calls.push([n,a]);
  if(n==='my_admin')return ok({role:'support',perms:PERMS,mfa:{needed:false}});
  if(n==='admin_list_customers')return FAILLIST?err('column reference \"plan\" is ambiguous','42702'):ok(CUSTS);
  if(n==='admin_customer_detail'){var d=cdetail(a.p_user);return d?ok(d):err('pelanggan tidak ditemukan')}
  if(n==='admin_customer_set_status'){CUSTS.forEach(function(c){if(c.id===a.p_user)c.status=a.p_status});return ok()}
  if(n==='admin_customer_log')return ok();
  if(n==='admin_list_invitations')return ok(list());
  if(n==='admin_invitation_detail'){var i=INV[a.p_id];if(!i)return err('undangan tidak ditemukan');i.pub_status=pubOf(i);return ok({invitation:i,owner:{id:'c1',full_name:'Sari Uji',email:'sari@uji.test',whatsapp:null,status:'aktif'},tx_visible:PERMS.indexOf('transactions.read')>-1,payments:i.pay_status==='lunas'?[{order_id:'NMX1',amount:149000,status:'paid',payment_type:'qris',created_at:iso(-10),paid_at:iso(-10),expires_at:iso(-9)}]:[],log:(LOG[a.p_id]||[]).slice().reverse()})}
  if(n==='admin_invitation_action'){var i=INV[a.p_id],L=LOG[a.p_id]=LOG[a.p_id]||[],act=a.p_action,now=iso(0);
   var push=function(k,f,t){L.push({kind:k,from_value:f,to_value:t,note:a.p_note,created_at:now,actor_id:'a1',actor_name:'Admin Uji'})};
   if(act==='suspend'){push('moderasi',i.moderation,'takedown');i.moderation='takedown';if(i.status==='aktif'){push('publikasi','aktif','nonaktif');i.status='nonaktif'}}
   else if(act==='reactivate'){if(i.pay_status!=='lunas')return err('belum_lunas');push('moderasi',i.moderation,'ok');i.moderation='ok';push('publikasi',i.status,'aktif');i.status='aktif'}
   else if(act==='archive'){push('arsip','aktif','arsip');i.archived_at=now}
   else if(act==='unarchive'){push('arsip','arsip','aktif');i.archived_at=null}
   else if(act==='flag'){push('moderasi','ok','flagged');i.moderation='flagged'}
   else if(act==='clear'){push('moderasi',i.moderation,'ok');i.moderation='ok'}
   return ok()}
  return ok([])},
 storage:{from:function(){return{}}},
 auth:{getSession:function(){return Promise.resolve({data:{session:{user:{id:'a1',email:'adm@uji.test'}}}})},signOut:function(){return Promise.resolve({})},onAuthStateChange:function(){return{data:{subscription:{unsubscribe:function(){}}}}},
  resetPasswordForEmail:function(e,o){window.__calls.push(['reset',e,o]);return Promise.resolve({data:{},error:null})}}}}};"""
ok_n = bad_n = 0
def chk(n, c, d=""):
    global ok_n, bad_n
    if c: ok_n += 1; print("PASS", n)
    else: bad_n += 1; print("FAIL", n, d)
def calls(pg, name): return [c for c in pg.evaluate("window.__calls") if c[0] == name]
def newpage(b, vw=1280, perms=None, faillist=False):
    ctx = b.new_context(viewport={"width": vw, "height": 900}); errs = []
    pg = ctx.new_page(); pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.route("**/supabase-js@*/**", lambda r: r.fulfill(status=200, content_type="text/javascript", body=STUB))
    pg.route("**/fonts.googleapis.com/**", lambda r: r.abort()); pg.route("**/fonts.gstatic.com/**", lambda r: r.abort())
    pg.route("**/preview?*", lambda r: r.fulfill(status=200, content_type="text/html", body="<html><body>pratinjau</body></html>"))
    if perms: pg.add_init_script("sessionStorage.setItem('__perms', %s)" % json.dumps(json.dumps(perms)))
    if faillist: pg.add_init_script("sessionStorage.setItem('__faillist','1')")
    return ctx, pg, errs
def txt(pg, sel="#view"): return pg.inner_text(sel)
with sync_playwright() as pw:
    b = pw.chromium.launch()
    # 1. daftar pelanggan
    ctx, pg, errs = newpage(b); pg.goto(BASE + "/admin#customers"); pg.wait_for_selector("#tb tr.row")
    t = txt(pg)
    chk("daftar pelanggan tampil (3 baris)", pg.locator("#tb tr.row").count() == 3)
    chk("status akun memakai istilah Aktif / Nonaktif / Diblokir", all(w in t for w in ("Aktif", "Nonaktif", "Diblokir")) and "Suspended" not in t, t[:300])
    chk("filter status akun punya Nonaktif & Diblokir", pg.evaluate("[...document.querySelectorAll('[data-f=status] option')].map(o=>o.textContent).join('|')") == "Semua|Aktif|Nonaktif|Diblokir")
    # 2. detail pelanggan
    pg.click("#tb tr.row:first-child"); pg.wait_for_selector(".dhead")
    chk("klik pelanggan membuka halaman detail (bukan laci)", pg.evaluate("location.hash") == "#customers:list:c1" and pg.locator("#drawer:not([hidden])").count() == 0)
    t = txt(pg)
    chk("detail: nama, email, status, paket aktif + kedaluwarsa", "Sari Uji" in t and "sari@uji.test" in t and "Aktif" in t and "Signature" in t and "sisa 80 hari" in t, t[:400])
    chk("detail: empat tab Profil, Undangan, Transaksi, Aktivitas", pg.evaluate("[...document.querySelectorAll('[data-pt]')].map(x=>x.textContent.replace(/ \\(.*/,''))") == ["Profil", "Undangan", "Transaksi", "Aktivitas"])
    chk("profil: email terverifikasi, WhatsApp, riwayat langganan", "Terverifikasi" in t and "+628123456789" in t and "Riwayat langganan" in t)
    pg.click("[data-pt=undangan]"); t = txt(pg, "#pbody")
    chk("tab Undangan: daftar milik pelanggan dengan tiga status", "bayar" in t.lower() and "moderasi" in t.lower() and "Lunas" in t and "Ulang Tahun Raka" in t, t)
    chk("judul undangan di-escape (tanpa XSS)", pg.evaluate("window.__xss") is None and pg.locator("#pbody img").count() == 0)
    pg.click("[data-pt=transaksi]"); t = txt(pg, "#pbody")
    chk("tab Transaksi: invoice, jumlah, status, metode", "NM-0001" in t and "149.000" in t and "Lunas" in t and "qris" in t, t)
    pg.click("[data-pt=aktivitas]"); t = txt(pg, "#pbody")
    chk("tab Aktivitas: riwayat dengan pelaku admin", "Mendaftar akun" in t and "oleh Admin Dua" in t, t)
    # 3. tindakan status: nonaktifkan butuh alasan
    pg.click("[data-st=nonaktif]"); pg.wait_for_selector("#fdlg[open] #ff-note")
    n0 = len(calls(pg, "admin_customer_set_status")); pg.click("#f-save")
    chk("nonaktifkan tanpa alasan ditolak di formulir", len(calls(pg, "admin_customer_set_status")) == n0)
    pg.fill("#ff-note", "Permintaan pelanggan"); pg.click("#f-save"); pg.wait_for_function("document.querySelector('.dhead') && document.querySelector('.dhead').innerText.includes('Nonaktif')")
    c = calls(pg, "admin_customer_set_status")[-1][1]
    chk("RPC status dipanggil dengan status & alasan", c == {"p_user": "c1", "p_status": "nonaktif", "p_note": "Permintaan pelanggan"}, c)
    chk("setelah nonaktif, tombol Aktifkan akun muncul", pg.locator("[data-st=aktif]").count() == 1 and pg.locator("[data-st=nonaktif]").count() == 0)
    pg.click("[data-st=suspended]"); pg.wait_for_selector("#fdlg[open] #ff-note"); pg.fill("#ff-note", "Penipuan"); pg.click("#f-save")
    pg.wait_for_function("document.querySelector('.dhead').innerText.includes('Diblokir')")
    chk("blokir akun: status Diblokir + penjelasan", "Tidak bisa memakai dashboard" in (pg.click("[data-pt=profil]") or txt(pg)))
    pg.click("[data-st=aktif]"); pg.click("#cdlg-y"); pg.wait_for_function("!document.querySelector('.dhead').innerText.includes('Diblokir')")
    chk("aktifkan kembali lewat konfirmasi (tanpa alasan)", calls(pg, "admin_customer_set_status")[-1][1]["p_status"] == "aktif")
    # 4. reset akses
    pg.click("[data-reset]"); pg.click("#cdlg-y"); pg.wait_for_function("window.__calls.some(c=>c[0]==='admin_customer_log')")
    r = calls(pg, "reset")[-1]
    chk("reset akses: email atur-password dikirim ke pelanggan, bukan mengubah kata sandi", r[1] == "sari@uji.test" and r[2]["redirectTo"].endswith("/atur-password"), r)
    chk("reset akses dicatat ke log admin", calls(pg, "admin_customer_log")[-1][1] == {"p_user": "c1", "p_action": "reset_akses"})
    # tambah langganan
    pg.click("[data-sub]"); pg.wait_for_selector("#fdlg[open] #ff-plan"); pg.select_option("#ff-plan", "luxe"); pg.fill("#ff-days", "30"); pg.click("#f-save")
    pg.wait_for_function("window.__calls.some(c=>c[0]==='insert:subscriptions')")
    chk("tambah langganan menyimpan paket & durasi", calls(pg, "insert:subscriptions")[-1][1]["plan"] == "luxe")
    chk("tanpa galat JS (pelanggan)", not errs, errs); ctx.close()
    # 5. kegagalan memuat menampilkan galat nyata
    ctx, pg, errs = newpage(b, faillist=True); pg.goto(BASE + "/admin#customers"); pg.wait_for_selector("#tb .empty")
    t = txt(pg, "#tb")
    chk("galat daftar ditampilkan apa adanya + tombol Coba lagi", "Data tidak bisa dimuat" in t and "ambiguous" in t and pg.locator("[data-retry]").count() == 1, t); ctx.close()
    # 6. izin: support (baca saja, tanpa transaksi)
    ctx, pg, errs = newpage(b, perms=["dashboard.read", "customers.read", "invitations.read"]); pg.goto(BASE + "/admin#customers:list:c1"); pg.wait_for_selector(".dhead")
    chk("peran baca-saja: tanpa tombol status/reset/langganan", pg.locator("[data-st],[data-reset],[data-sub]").count() == 0)
    pg.click("[data-pt=transaksi]"); chk("tanpa izin transaksi: pesan jelas, tanpa angka uang", "tidak punya izin melihat transaksi" in txt(pg, "#pbody") and "149.000" not in txt(pg))
    pg.goto(BASE + "/admin#customers:list:zzz"); pg.wait_for_selector("#view .empty")
    chk("pelanggan tidak ada: pesan jelas + tautan kembali", "tidak ditemukan" in txt(pg) and pg.locator(".back").count() == 1); ctx.close()
    # 7. daftar undangan
    ctx, pg, errs = newpage(b); pg.goto(BASE + "/admin#invitations"); pg.wait_for_selector("#tb tr.row")
    chk("dua tab dipertahankan: Semua undangan & Perlu moderasi", pg.evaluate("[...document.querySelectorAll('[data-tab]')].map(x=>x.textContent)") == ["Semua undangan", "Perlu moderasi"])
    chk("tiap baris menampilkan tiga status terpisah", pg.locator("#tb tr.row:first-child .tri > span").count() == 3 and pg.locator("#tb .tri").count() == 2)
    chk("filter Pembayaran / Publikasi / Moderasi terpisah", pg.evaluate("[...document.querySelectorAll('.tool .fld')].map(l=>l.firstChild.textContent.trim()).filter(x=>x!=='Cari')") == ["Pembayaran", "Publikasi", "Moderasi", "Paket"])
    pg.select_option("[data-f=pay_status]", "lunas"); pg.wait_for_function("document.querySelectorAll('#tb tr.row').length===1")
    chk("filter status pembayaran bekerja", "Pernikahan" in txt(pg, "#tb"))
    pg.click("[data-tab=flag]"); pg.wait_for_function("document.querySelector('#tb') && document.querySelector('#tb').innerText.includes('Ulang Tahun Raka')")
    chk("tab Perlu moderasi hanya berisi undangan terlapor", pg.locator("#tb tr.row").count() == 1 and "Ulang Tahun Raka" in txt(pg, "#tb"))
    pg.click("#tb tr.row"); pg.wait_for_selector(".scards")
    chk("klik undangan dari antrian membuka detail", pg.evaluate("location.hash") == "#invitations:flag:i2"); ctx.close()
    # 8. detail undangan
    ctx, pg, errs = newpage(b); pg.goto(BASE + "/admin#invitations:all:i1"); pg.wait_for_selector(".scards")
    cards = pg.evaluate("[...document.querySelectorAll('.scard')].map(c=>c.innerText.replace(/\\n+/g,' | '))")
    chk("tiga kartu status terpisah: pembayaran Lunas, publikasi Tayang, moderasi Normal", len(cards) == 3 and "Status pembayaran | Lunas" in cards[0] and "Status publikasi | Tayang" in cards[1] and "Status moderasi | Normal" in cards[2], cards)
    t = txt(pg)
    chk("detail: pemilik, paket, template, tanggal dibuat/diperbarui, masa aktif, link publik", "Sari Uji" in t and "Luxe Live Guest" in t and "Jawa Tengah" in t and "Dibuat" in t and "Terakhir diperbarui" in t and "sisa 80 hari" in t and "https://nusamora.com/sari-dan-dodi" in t, t[:600])
    chk("link pemilik menuju detail pelanggan", pg.locator("a[href='#customers:list:c1']").count() == 1)
    chk("link publik aktif dibuka di tab baru", pg.locator("a[href='https://nusamora.com/sari-dan-dodi'][target=_blank][rel~=noopener]").count() == 1)
    chk("judul undangan di-escape (tanpa XSS)", pg.evaluate("window.__xss") is None and pg.locator("#view h2 img").count() == 0)
    chk("transaksi undangan & riwayat tampil", "NMX1" in t and "Menunggu bayar" not in t and "Riwayat moderasi" in t and "Sistem" in t)
    chk("tombol: Suspend, Arsipkan, Tandai terlapor (tanpa Aktifkan kembali saat tayang)", pg.locator("[data-ia=suspend]").count() == 1 and pg.locator("[data-ia=archive]").count() == 1 and pg.locator("[data-ia=flag]").count() == 1 and pg.locator("[data-ia=reactivate]").count() == 0)
    chk("pratinjau belum dimuat sebelum diminta", pg.locator("iframe.pvf").count() == 0)
    pg.click("[data-pv=d]"); pg.wait_for_selector("iframe.pvf")
    src = pg.get_attribute("iframe.pvf", "src")
    chk("pratinjau langsung memakai halaman preview yang sama, mode admin hanya-baca", src == "/preview?id=i1&admin=1", src)
    pg.click("[data-pv=m]"); chk("pratinjau ponsel", pg.locator("iframe.pvf.m").count() == 1)
    pg.click("[data-pv='']"); chk("tutup pratinjau", pg.locator("iframe.pvf").count() == 0)
    # suspend
    pg.click("[data-ia=suspend]"); pg.wait_for_selector("#fdlg[open] #ff-note"); n0 = len(calls(pg, "admin_invitation_action")); pg.click("#f-save")
    chk("suspend tanpa alasan ditolak di formulir", len(calls(pg, "admin_invitation_action")) == n0)
    pg.fill("#ff-note", "Konten tidak pantas"); pg.click("#f-save"); pg.wait_for_function("document.querySelectorAll('.scard')[2].innerText.includes('Disuspend')")
    cards = pg.evaluate("[...document.querySelectorAll('.scard')].map(c=>c.innerText.replace(/\\n+/g,' | '))")
    chk("suspend: moderasi Disuspend, publikasi Diturunkan, PEMBAYARAN TETAP Lunas", "Lunas" in cards[0] and "Diturunkan" in cards[1] and "Disuspend" in cards[2], cards)
    chk("RPC suspend membawa alasan", calls(pg, "admin_invitation_action")[-1][1] == {"p_id": "i1", "p_action": "suspend", "p_note": "Konten tidak pantas"})
    t = txt(pg)
    chk("riwayat moderasi mencatat pelaku & alasan", "Moderasi: Normal → Disuspend" in t.replace("\u2192", "→") and "oleh Admin Uji" in t and "Konten tidak pantas" in t, t[-500:])
    chk("setelah suspend: tombol Aktifkan kembali muncul, Suspend hilang", pg.locator("[data-ia=reactivate]").count() == 1 and pg.locator("[data-ia=suspend]").count() == 0)
    pg.click("[data-ia=reactivate]"); pg.click("#cdlg-y"); pg.wait_for_function("document.querySelectorAll('.scard')[1].innerText.includes('Tayang')")
    chk("aktifkan kembali: Tayang + moderasi Normal", "Normal" in pg.inner_text(".scards"))
    pg.click("[data-ia=archive]"); pg.click("#cdlg-y"); pg.wait_for_function("document.querySelectorAll('.scard')[1].innerText.includes('Diarsipkan')")
    chk("arsipkan: publikasi Diarsipkan, tombol Pulihkan dari arsip", pg.locator("[data-ia=unarchive]").count() == 1 and pg.locator("[data-ia=reactivate]").count() == 0)
    pg.click("[data-ia=unarchive]"); pg.wait_for_selector("[data-ia=archive]")
    chk("pulihkan dari arsip", calls(pg, "admin_invitation_action")[-1][1]["p_action"] == "unarchive")
    chk("tanpa galat JS (undangan)", not errs, errs); ctx.close()
    # 9. undangan belum lunas tidak bisa diaktifkan admin
    ctx, pg, errs = newpage(b); pg.goto(BASE + "/admin#invitations:all:i2"); pg.wait_for_selector(".scards")
    cards = pg.evaluate("[...document.querySelectorAll('.scard')].map(c=>c.innerText.replace(/\\n+/g,' | '))")
    chk("undangan i2: Belum bayar / Diturunkan / Terlapor", "Belum bayar" in cards[0] and "Diturunkan" in cards[1] and "Terlapor" in cards[2] and "Dilaporkan tamu" in cards[2], cards)
    chk("link publik tidak aktif ditampilkan sebagai tidak bisa dibuka", pg.locator("a[href^='https://nusamora.com']").count() == 0)
    pg.click("[data-ia=reactivate]"); pg.click("#cdlg-y"); pg.wait_for_selector(".toast.bad")
    chk("aktifkan undangan belum lunas ditolak dengan pesan jelas", "belum lunas" in pg.inner_text(".toast.bad") and "Belum bayar" in pg.inner_text(".scards"), pg.inner_text(".toast.bad"))
    pg.click("[data-ia=clear]"); pg.wait_for_selector("#fdlg[open] #ff-note"); pg.click("#f-save"); pg.wait_for_function("document.querySelectorAll('.scard')[2].innerText.includes('Normal')")
    chk("tolak laporan: moderasi Normal tanpa mengubah publikasi", "Diturunkan" in pg.inner_text(".scards")); ctx.close()
    # 10. responsif
    for vw in (390, 768):
        ctx, pg, errs = newpage(b, vw=vw)
        for h in ("#customers:list:c1", "#invitations:all:i1", "#invitations", "#customers"):
            pg.goto(BASE + "/admin" + h); pg.wait_for_selector(".dhead, #tb tr.row")
            chk(f"[{vw}px] {h} tanpa scroll horizontal halaman", pg.evaluate("document.documentElement.scrollWidth <= innerWidth + 1"), pg.evaluate("document.documentElement.scrollWidth"))
        ctx.close()
    b.close()
print("\nHASIL: %d lulus, %d gagal" % (ok_n, bad_n)); raise SystemExit(1 if bad_n else 0)
