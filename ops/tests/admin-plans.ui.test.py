# Uji UI admin: Paket & Harga: kartu paket, ubah paket (alasan harga wajib), diskon terjadwal, mata uang, riwayat, izin baca saja.
# Backend ditiru di browser (window.supabase stub) hanya untuk menguji antarmuka; logika data diuji di ops/tests/admin-plans.test.sql.
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

STUB = r"""window.__calls=[];
var PERMS=JSON.parse(sessionStorage.getItem('__perms')||'null')||['dashboard.read','plans.read','plans.write'];
var NOW=Date.now(),D=864e5,iso=function(n){return new Date(NOW+n*D).toISOString()};
function P(id,name,price,o){return Object.assign({id:id,name:name,description:null,price:price,duration_days:90,gallery_limit:10,upload_max_mb:3,live_max_guests:null,live_max_rooms:null,template_quota:null,features:'RSVP dan ucapan, musik latar, tanpa watermark',active:true,sort:1},o||{})}
var PLANS=[P('essential','Essential',89000),P('signature','Signature',149000,{sort:2,duration_days:180,gallery_limit:20}),P('luxe','Luxe <img src=x onerror=window.__xss=1>',249000,{sort:3,live_max_guests:100})];
var DISC=[{id:'d1',plan_id:'essential',name:'Diskon 20%',kind:'percent',value:20,starts_at:iso(-1),ends_at:iso(5),active:true,note:'Akhir tahun',used:2},{id:'d2',plan_id:'signature',name:'Khusus Lebaran',kind:'special',value:99000,starts_at:iso(10),ends_at:iso(15),active:true,note:null,used:0},{id:'d3',plan_id:'luxe',name:'Lama',kind:'fixed',value:20000,starts_at:iso(-30),ends_at:iso(-20),active:false,note:null,used:1}];
var PRICES=[{plan_id:'essential',currency:'USD',amount:5.99,active:true}];
var NEXT=null;
function ok(d){return Promise.resolve({data:d===undefined?null:d,error:null})}
function qb(){var o={};['select','order','range','or','in','gte','lte','lt','gt','neq','ilike','contains','not','is','limit','eq'].forEach(function(m){o[m]=function(){return o}});o.maybeSingle=function(){return o};o.then=function(a,b){return Promise.resolve({data:[],error:null,count:0}).then(a,b)};return o}
window.supabase={createClient:function(){return{
 from:qb,
 rpc:function(n,a){window.__calls.push([n,a]);
  if(n==='my_admin')return ok({role:'admin',perms:PERMS,mfa:{needed:false}});
  if(n==='admin_plans_overview')return ok(PLANS.map(function(p){var dd=DISC.filter(function(x){return x.plan_id===p.id}).map(function(x){return Object.assign({},x,{running:x.active&&new Date(x.starts_at)<NOW&&new Date(x.ends_at)>NOW})});var run=dd.filter(function(x){return x.running})[0];
   return {plan:p,effective_price:run?Math.round(p.price*0.8):p.price,discount_active:run?run.name:null,prices:PRICES.filter(function(x){return x.plan_id===p.id}),discounts:dd,stats:{active_invitations:3,paid_count:5,paid_30d:1,revenue:p.price*5}}}));
  if(n==='admin_plan_save'){if(NEXT){var e=NEXT;NEXT=null;return ok({ok:false,error:e})}var pl=PLANS.filter(function(x){return x.id===a.p_id})[0];Object.assign(pl,a.p_patch);return ok({ok:true})}
  if(n==='admin_discount_save'){if(NEXT){var e2=NEXT;NEXT=null;return ok({ok:false,error:e2})}if(a.p_id){var x=DISC.filter(function(z){return z.id===a.p_id})[0];Object.assign(x,a.p_data)}else DISC.push(Object.assign({id:'d'+(DISC.length+1),used:0},a.p_data));return ok({ok:true,id:'dx'})}
  if(n==='admin_discount_delete'){DISC=DISC.filter(function(z){return z.id!==a.p_id});return ok({ok:true})}
  if(n==='admin_plan_price_set'){return ok({ok:true})}
  if(n==='admin_plan_history')return ok([{id:2,plan_id:'essential',scope:'paket',field:'price',old_value:'79000',new_value:'89000',note:'Penyesuaian <b>harga</b>',actor_name:'Admin <i>Uji</i>',at:iso(-1)},{id:1,plan_id:'signature',scope:'diskon',field:'Khusus Lebaran',old_value:null,new_value:'special 99000.00 (2026-12-01 s/d 2026-12-05)',note:null,actor_name:'Admin',at:iso(-2)}].filter(function(h){return !a.p_plan||h.plan_id===a.p_plan}));
  return ok([])},
 functions:{invoke:function(){return Promise.resolve({data:{ok:true},error:null})}},
 storage:{from:function(){return{upload:function(){return ok({})}}}},
 auth:{getSession:function(){return Promise.resolve({data:{session:{access_token:'tok',user:{id:'u1',email:'adm@uji.test'}}}})},signOut:function(){return Promise.resolve({})},onAuthStateChange:function(){return{data:{subscription:{unsubscribe:function(){}}}}}}}}};"""

def calls(pg, n): return [c[1] for c in pg.evaluate("window.__calls") if c[0] == n]
with sync_playwright() as pw:
    b = pw.chromium.launch()
    ctx, pg, errs = newpage(b); pg.goto(BASE + "/admin#plans:items"); pg.wait_for_selector(".pl-card", timeout=15000); t = txt(pg)
    chk("4 tab: Paket, Diskon & Harga Khusus, Mata Uang, Riwayat Harga", [x.strip() for x in pg.locator(".tabs button").all_inner_texts()] == ["Paket", "Diskon & Harga Khusus", "Mata Uang", "Riwayat Harga"], pg.locator(".tabs button").all_inner_texts())
    chk("tiga paket tampil", pg.locator(".pl-card").count() == 3)
    chk("paket berdiskon: harga asli dicoret + harga efektif + label promo", pg.locator("[data-p=essential] .pl-pr s").inner_text() == "Rp89.000" and "Rp71.200" in pg.locator("[data-p=essential] .pl-pr").inner_text() and "Diskon 20%" in pg.locator("[data-p=essential]").inner_text())
    chk("paket tanpa diskon: harga biasa", pg.locator("[data-p=signature] .pl-pr s").count() == 0 and "Rp149.000" in pg.locator("[data-p=signature] .pl-pr").inner_text())
    chk("batas Live Guest hanya pada Luxe", "Tamu Live Guest" in pg.locator("[data-p=luxe]").inner_text() and "Tamu Live Guest" not in pg.locator("[data-p=essential]").inner_text())
    chk("nama paket di-escape (tanpa XSS)", pg.evaluate("window.__xss") is None and pg.locator(".pl-card img[src='x']").count() == 0)
    chk("statistik: undangan aktif, terjual, pendapatan", "Undangan aktif" in t and "Rp445.000" in pg.locator("[data-p=essential]").inner_text())
    # ubah paket
    pg.click("[data-edit=essential]"); pg.wait_for_selector("#pl-edit[open]")
    chk("form ubah Essential tanpa kolom Live Guest", pg.locator("#f-lg").count() == 0)
    pg.fill("#f-price", "99000"); pg.click("#f-save")
    chk("harga berubah tanpa alasan: ditolak di klien, tanpa panggilan ke server", "alasan perubahan harga" in pg.inner_text("#f-err") and not calls(pg, "admin_plan_save"), pg.inner_text("#f-err"))
    pg.fill("#f-up", "5"); pg.click("#f-save"); chk("batas ukuran foto di atas 3 MB ditolak", "3 MB" in pg.inner_text("#f-err"))
    pg.fill("#f-up", "3"); pg.fill("#f-note", "Kenaikan biaya"); pg.evaluate("NEXT='harga_di_bawah_diskon';0"); pg.click("#f-save"); pg.wait_for_function("document.querySelector('#f-err').textContent.length>0")
    chk("galat server ditampilkan dengan bahasa jelas, dialog tetap terbuka", "potongan" in pg.inner_text("#f-err") and pg.locator("#pl-edit[open]").count() == 1, pg.inner_text("#f-err"))
    pg.click("#f-save"); pg.wait_for_selector("#pl-edit", state="detached", timeout=5000) if False else pg.wait_for_function("!document.querySelector('#pl-edit[open]')")
    c = calls(pg, "admin_plan_save")[-1]
    chk("simpan: hanya kolom yang berubah + alasan dikirim", c["p_id"] == "essential" and c["p_patch"] == {"price": 99000} and c["p_note"] == "Kenaikan biaya", c)
    pg.wait_for_function("document.querySelector('[data-p=essential] .pl-pr').innerText.indexOf('99.000')>-1") if False else None
    pg.click("[data-edit=luxe]"); pg.wait_for_selector("#pl-edit[open]")
    chk("form Luxe memuat batas tamu dan room Live Guest", pg.locator("#f-lg").count() == 1 and pg.locator("#f-lr").count() == 1 and pg.input_value("#f-lg") == "100")
    pg.fill("#f-lg", ""); pg.fill("#f-lr", "5"); pg.click("#f-save"); pg.wait_for_function("!document.querySelector('#pl-edit[open]')")
    c = calls(pg, "admin_plan_save")[-1]; chk("batas kosong dikirim sebagai null (tanpa batas)", c["p_id"] == "luxe" and c["p_patch"] == {"live_max_guests": None, "live_max_rooms": 5}, c)
    pg.click("[data-edit=signature]"); pg.wait_for_selector("#pl-edit[open]"); pg.uncheck("#f-act"); pg.click("#f-save"); pg.wait_for_selector("#cdlg[open]")
    chk("menonaktifkan paket meminta konfirmasi", "tidak bisa membeli" in pg.inner_text("#cdlg")); pg.click("#cdlg-n")
    chk("batal konfirmasi: tidak ada panggilan simpan baru", len(calls(pg, "admin_plan_save")) == 3); pg.keyboard.press("Escape")
    # diskon
    pg.goto(BASE + "/admin#plans:disc"); pg.wait_for_selector(".tbl-w tbody tr"); t = txt(pg)
    chk("tabel diskon: 3 baris dengan status Berjalan, Terjadwal, Nonaktif", pg.locator(".tbl-w tbody tr").count() == 3 and "Berjalan" in t and "Terjadwal" in t and "Nonaktif" in t, t[:400])
    chk("nilai persen dan rupiah ditampilkan", "20%" in t and "Rp99.000" in t)
    chk("diskon yang sudah dipakai: tombol Hapus nonaktif", pg.locator("[data-dx='1']").is_disabled() and pg.locator("[data-dx='2']").is_disabled() and not pg.locator("[data-dx='0']").is_disabled())
    pg.click("#d-new"); pg.wait_for_selector("#pl-disc[open]")
    pg.select_option("#x-plan", "signature"); pg.select_option("#x-kind", "percent"); pg.fill("#x-val", "10"); pg.fill("#x-name", "Promo Baru"); pg.fill("#x-s", "2026-12-01T10:00"); pg.fill("#x-e", "2026-12-05T10:00")
    chk("pratinjau harga pelanggan", "Rp134.100" in pg.inner_text("#x-pv"), pg.inner_text("#x-pv"))
    pg.evaluate("NEXT='diskon_bertabrakan';0"); pg.click("#x-save"); pg.wait_for_function("document.querySelector('#x-err').textContent.length>0")
    chk("jadwal bertabrakan: pesan jelas", "bertabrakan" in pg.inner_text("#x-err"))
    pg.click("#x-save"); pg.wait_for_function("!document.querySelector('#pl-disc[open]')")
    c = calls(pg, "admin_discount_save")[-1]
    chk("simpan diskon: jadwal dikonversi dari WIB ke UTC", c["p_id"] is None and c["p_data"]["plan_id"] == "signature" and c["p_data"]["kind"] == "percent" and c["p_data"]["value"] == 10 and c["p_data"]["starts_at"] == "2026-12-01T03:00:00.000Z" and c["p_data"]["ends_at"] == "2026-12-05T03:00:00.000Z", c)
    pg.wait_for_function("document.querySelectorAll('.tbl-w tbody tr').length===4")
    pg.locator("tbody tr", has_text="Promo Baru").locator("[data-dt]").click(); pg.wait_for_function("window.__calls.filter(c=>c[0]==='admin_discount_save').length===3")
    c = calls(pg, "admin_discount_save")[-1]; chk("nonaktifkan diskon: hanya kolom active", c["p_data"] == {"active": False}, c)
    pg.locator("tbody tr", has_text="Promo Baru").locator("[data-dx]").click(); pg.wait_for_selector("#cdlg[open]"); pg.click("#cdlg-y"); pg.wait_for_function("window.__calls.some(c=>c[0]==='admin_discount_delete')")
    chk("hapus diskon belum terpakai lewat konfirmasi", len(calls(pg, "admin_discount_delete")) == 1)
    # mata uang
    pg.goto(BASE + "/admin#plans:cur"); pg.wait_for_selector(".pl-cur input"); t = txt(pg)
    chk("tabel mata uang: IDR resmi + 7 mata uang", "IDR" in t and all(x in t for x in ["USD", "SGD", "MYR", "EUR", "AUD", "GBP", "JPY"]) and pg.locator(".pl-cur input").count() == 21)
    chk("catatan: tampilan saja, bayar tetap Rupiah", "tetap dalam Rupiah" in t)
    chk("harga USD yang ada terisi", pg.input_value("[data-c='essential|USD']") == "5.99")
    pg.fill("[data-c='signature|SGD']", "12.5"); pg.fill("[data-c='essential|USD']", ""); pg.fill("#c-note", "Kurs baru"); pg.click("#c-save"); pg.wait_for_function("window.__calls.filter(c=>c[0]==='admin_plan_price_set').length===2")
    cs = sorted(calls(pg, "admin_plan_price_set"), key=lambda x: x["p_plan"])
    chk("hanya sel yang berubah dikirim; kosong = hapus (null)", len(cs) == 2 and cs[0]["p_plan"] == "essential" and cs[0]["p_currency"] == "USD" and cs[0]["p_amount"] is None and cs[1]["p_plan"] == "signature" and cs[1]["p_amount"] == 12.5 and cs[1]["p_note"] == "Kurs baru", cs)
    # riwayat
    pg.goto(BASE + "/admin#plans:hist"); pg.wait_for_selector(".tbl-w tbody tr"); t = txt(pg)
    chk("riwayat: perubahan harga dalam Rupiah, alasan, pelaku", pg.locator(".tbl-w tbody tr").count() == 2 and "Rp79.000" in t and "Rp89.000" in t and "Harga (Rp)" in t, t[:300])
    chk("riwayat: teks pengguna di-escape", pg.locator(".tbl-w b", has_text="harga").count() == 0 or "<b>harga</b>" in t)
    pg.select_option("#h-plan", "signature"); pg.wait_for_function("document.querySelectorAll('.tbl-w tbody tr').length===1")
    chk("filter paket memanggil riwayat per paket", calls(pg, "admin_plan_history")[-1]["p_plan"] == "signature")
    chk("tanpa galat JavaScript", not errs, errs); ctx.close()
    # baca saja
    ctx, pg, errs = newpage(b, perms=["dashboard.read", "plans.read"]); pg.goto(BASE + "/admin#plans:items"); pg.wait_for_selector(".pl-card")
    chk("izin baca saja: tanpa tombol Ubah paket", pg.locator("[data-edit]").count() == 0)
    pg.goto(BASE + "/admin#plans:disc"); pg.wait_for_selector(".tbl-w"); chk("izin baca saja: tanpa tambah/ubah/hapus diskon", pg.locator("#d-new, [data-de], [data-dt], [data-dx]").count() == 0)
    pg.goto(BASE + "/admin#plans:cur"); pg.wait_for_selector(".pl-cur input"); chk("izin baca saja: kolom harga terkunci dan tanpa tombol simpan", pg.locator(".pl-cur input:not(:disabled)").count() == 0 and pg.locator("#c-save").count() == 0)
    ctx.close()
    ctx, pg, errs = newpage(b, vw=375); pg.goto(BASE + "/admin#plans:items"); pg.wait_for_selector(".pl-card")
    chk("mobile 375px: tanpa scroll horizontal (paket)", pg.evaluate("document.documentElement.scrollWidth <= window.innerWidth + 1"))
    pg.goto(BASE + "/admin#plans:disc"); pg.wait_for_selector(".tbl-w"); chk("mobile 375px: tanpa scroll horizontal (diskon)", pg.evaluate("document.documentElement.scrollWidth <= window.innerWidth + 1"))
    b.close()
print("\n%d lulus, %d gagal" % (ok_n, bad_n)); raise SystemExit(1 if bad_n else 0)
