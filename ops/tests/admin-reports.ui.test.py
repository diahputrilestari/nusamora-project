# Uji UI admin: Laporan & Analytics: periode (WIB), tab, funnel, ekspor CSV dan XLSX asli, izin, mobile.
# Backend ditiru di browser (window.supabase stub) hanya untuk menguji antarmuka; logika data diuji di ops/tests/admin-reports.test.sql.
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
var PERMS=JSON.parse(sessionStorage.getItem('__perms')||'null')||['dashboard.read','reports.read','affiliate.read'];
var REP={period:{gran:'month'},revenue:{gross:556000,refund:249000,net:307000,orders:4,refunded_orders:1,avg_order:139000,refund_rate:25,discount_total:10000,discounted_orders:2},
 by_plan:[{plan_id:'essential',plan:'Essential',orders:2,revenue:158000,refunded:0,avg_order:79000},{plan_id:'signature',plan:'Signature',orders:1,revenue:149000,refunded:0,avg_order:149000},{plan_id:'luxe',plan:'Luxe',orders:1,revenue:0,refunded:1,avg_order:249000}],
 series:[{m:'2026-09',new_customers:2,orders:1,revenue:79000,essential:79000,signature:0,luxe:0},{m:'2026-10',new_customers:3,orders:3,revenue:228000,essential:79000,signature:149000,luxe:0}],
 customers:{total:50,new:5,buyers:3,buyers_new:2,buyers_returning:1,repeat_orders_share:25},
 funnel:[{step:'Mendaftar',n:10},{step:'Membuat undangan',n:8},{step:'Masuk checkout',n:5},{step:'Membayar',n:4},{step:'Undangan terbit',n:3}],
 top_templates:[{template:'=HYPERLINK(\"x\")',slug:'a',invitations:5,paid:3,published:2},{template:'<img src=x onerror=window.__xss=1>',slug:'b',invitations:2,paid:1,published:1}],
 categories:[{category:'wedding',invitations:6,paid:3},{category:'birthday',invitations:2,paid:1}],
 affiliate:{affiliates_active:2,referrals:4,referrals_paid:1,commission:20000,withdrawals:50000,top:[{code:'RPT1',referrals:3,paid:1,commission:20000}]},
 live:{events:40,rooms:3,guests:12,by_action:[{action:'masuk',n:30},{action:'sapa',n:10}],top_rooms:[{title:'Pesta A',events:25,guests:8}]}};
function ok(d){return Promise.resolve({data:d===undefined?null:d,error:null})}
function qb(){var o={};['select','order','range','or','in','gte','lte','lt','gt','neq','ilike','contains','not','is','limit','eq'].forEach(function(m){o[m]=function(){return o}});o.maybeSingle=function(){return o};o.then=function(a,b){return Promise.resolve({data:[],error:null,count:0}).then(a,b)};return o}
window.supabase={createClient:function(){return{
 from:qb,
 rpc:function(n,a){window.__calls.push([n,a]);
  if(n==='my_admin')return ok({role:'finance',perms:PERMS,mfa:{needed:false}});
  if(n==='admin_report'){var m=sessionStorage.getItem('__mode');if(m==='deny')return Promise.resolve({data:null,error:{code:'42501',message:'forbidden'}});var r=JSON.parse(JSON.stringify(REP));if(m==='noaff')r.affiliate=null;if(m==='empty'){r.series=[];r.top_templates=[];r.categories=[];r.funnel=[{step:'Mendaftar',n:0}];r.by_plan=[]}return ok(r)}
  return ok([])},
 functions:{invoke:function(){return Promise.resolve({data:{ok:true},error:null})}},
 storage:{from:function(){return{upload:function(){return ok({})}}}},
 auth:{getSession:function(){return Promise.resolve({data:{session:{access_token:'tok',user:{id:'u1',email:'adm@uji.test'}}}})},signOut:function(){return Promise.resolve({})},onAuthStateChange:function(){return{data:{subscription:{unsubscribe:function(){}}}}}}}}};"""

import zipfile, tempfile
def calls(pg, n): return [c[1] for c in pg.evaluate("window.__calls") if c[0] == n]
def mode(pg, m): pg.evaluate("sessionStorage.setItem('__mode','%s')" % m)
with sync_playwright() as pw:
    b = pw.chromium.launch()
    ctx, pg, errs = newpage(b); ctx.set_default_timeout(15000); pg.goto(BASE + "/admin#reports:sum"); pg.wait_for_selector(".kpi", timeout=15000); t = txt(pg)
    chk("5 tab laporan", [x.strip() for x in pg.locator(".tabs button").all_inner_texts()] == ["Pendapatan", "Pelanggan & Funnel", "Template & Kategori", "Affiliate", "Live Guest"], pg.locator(".tabs button").all_inner_texts())
    chk("KPI pendapatan: bersih, kotor, rata-rata, refund rate, diskon", all(s in t for s in ["Rp307.000", "Rp556.000", "Rp139.000", "25%", "Rp10.000"]), t[:500])
    chk("grafik per paket: tiga warna dan legenda", pg.locator(".rp-ch rect").count() >= 3 and pg.locator(".rp-leg span").count() == 3)
    chk("tabel per paket memuat tiga paket", pg.locator(".tbl-w tbody tr").count() == 3)
    c = calls(pg, "admin_report")[0]
    chk("periode default 90 hari dikirim dengan batas tengah malam WIB", c["p_from"].endswith("T17:00:00.000Z") and c["p_to"].endswith("T17:00:00.000Z") and 88 <= (__import__("datetime").datetime.fromisoformat(c["p_to"].replace("Z","+00:00")) - __import__("datetime").datetime.fromisoformat(c["p_from"].replace("Z","+00:00"))).days <= 91, c)
    pg.select_option("#rp-k", "30d"); pg.wait_for_function("window.__calls.filter(c=>c[0]==='admin_report').length===2")
    c = calls(pg, "admin_report")[1]; chk("ganti periode memuat ulang", 29 <= (__import__("datetime").datetime.fromisoformat(c["p_to"].replace("Z","+00:00")) - __import__("datetime").datetime.fromisoformat(c["p_from"].replace("Z","+00:00"))).days <= 31, c)
    pg.select_option("#rp-k", "custom"); pg.wait_for_selector("#rp-f"); pg.fill("#rp-f", "2026-10-01"); pg.fill("#rp-t", "2026-10-31"); pg.click("#rp-go"); pg.wait_for_function("window.__calls.filter(c=>c[0]==='admin_report').length>=3")
    c = calls(pg, "admin_report")[-1]; chk("custom: 1 Okt s/d 31 Okt WIB, tanggal akhir inklusif", c["p_from"] == "2026-09-30T17:00:00.000Z" and c["p_to"] == "2026-10-31T17:00:00.000Z", c)
    pg.fill("#rp-t", "2026-09-01"); pg.click("#rp-go"); pg.wait_for_selector(".err, .errbox, [data-retry]")
    chk("rentang terbalik: pesan jelas, tanpa panggilan ke server", "Tanggal akhir" in txt(pg) and len(calls(pg, "admin_report")) == 3, txt(pg)[:200])
    # pelanggan & funnel
    pg.goto(BASE + "/admin#reports:cust"); pg.wait_for_selector(".rp-fr"); t = txt(pg)
    chk("funnel: lima tahap dengan persentase dari pendaftar", pg.locator(".rp-fr").count() == 5 and "80%" in t and "30%" in t and "100%" in t, t[:600])
    chk("pembeli baru vs kembali", "Pembeli baru" in t and "Pembeli kembali" in t and "Transaksi ulang" in t)
    # template
    pg.goto(BASE + "/admin#reports:tpl"); pg.wait_for_selector(".tbl-w"); t = txt(pg)
    chk("template teratas dan kategori + porsi", "wedding" in t and "75%" in t and pg.locator(".tbl-w").count() == 2)
    chk("nama template di-escape (tanpa XSS)", pg.evaluate("window.__xss") is None and pg.locator(".tbl-w img").count() == 0)
    # affiliate & live
    pg.goto(BASE + "/admin#reports:aff"); pg.wait_for_selector(".kpi"); t = txt(pg); chk("affiliate: referral, konversi, komisi, kode teratas", "RPT1" in t and "25%" in t and "Rp20.000" in t)
    mode(pg, "noaff"); pg.goto(BASE + "/admin#reports:sum"); pg.goto(BASE + "/admin#reports:aff"); pg.reload(); pg.wait_for_selector(".card")
    chk("tanpa izin affiliate: pesan akses, bukan angka nol", "tidak punya izin melihat data affiliate" in txt(pg)); mode(pg, "")
    pg.goto(BASE + "/admin#reports:live"); pg.wait_for_selector(".kpi"); t = txt(pg); chk("Live Guest: aktivitas, room, tamu, aksi, room teratas", "40" in t and "Pesta A" in t and "masuk" in t)
    # ekspor
    pg.goto(BASE + "/admin#reports:tpl"); pg.wait_for_selector("#rp-csv")
    with pg.expect_download() as dl: pg.click("#rp-csv")
    path = tempfile.mktemp(suffix=".csv"); dl.value.save_as(path); raw = open(path, "rb").read(); s = raw.decode("utf-8")
    chk("CSV: BOM UTF-8, nama file memuat tab dan periode", raw[:3] == b"\xef\xbb\xbf" and dl.value.suggested_filename.startswith("laporan-tpl-") and dl.value.suggested_filename.endswith(".csv"), dl.value.suggested_filename)
    chk("CSV: judul bagian, header, data", "Template teratas" in s and "Kategori acara" in s and "Undangan dibuat" in s and "wedding,6,3" in s, s[:400])
    chk("CSV: sel berawalan = diberi tanda petik (anti formula)", "'=HYPERLINK" in s and "\n=HYPERLINK" not in s and ",=HYPERLINK" not in s)
    with pg.expect_download() as dl: pg.click("#rp-xl")
    path = tempfile.mktemp(suffix=".xlsx"); dl.value.save_as(path)
    chk("Excel: berkas .xlsx", dl.value.suggested_filename.startswith("laporan-nusamora-") and dl.value.suggested_filename.endswith(".xlsx"))
    z = zipfile.ZipFile(path); chk("Excel: arsip valid dan lulus uji CRC", z.testzip() is None and "xl/workbook.xml" in z.namelist())
    try:
        import openpyxl
        wb = openpyxl.load_workbook(path)
        chk("Excel: satu sheet per bagian", wb.sheetnames[:3] == ["Ringkasan", "Per paket", "Tren"] and "Template teratas" in wb.sheetnames and "Live Guest" in wb.sheetnames, wb.sheetnames)
        ws = wb["Per paket"]; rows = [[c.value for c in r] for r in ws.iter_rows(min_row=2)]
        chk("Excel: header dan angka bertipe angka", rows[0][0] == "Paket" and rows[1] == ["Essential", 2, 158000, 0, 79000], rows[:3])
        ws = wb["Template teratas"]; v = ws["A3"].value
        chk("Excel: sel formula berbahaya dinetralkan", isinstance(v, str) and v.startswith("'=") and ws["A3"].data_type == "s", (v, ws["A3"].data_type))
    except ImportError:
        chk("Excel: openpyxl tidak tersedia", False, "pip install openpyxl")
    # data kosong dan izin
    mode(pg, "empty"); pg.goto(BASE + "/admin#reports:sum"); pg.reload(); pg.wait_for_selector(".kpi"); chk("data kosong: keadaan kosong, tanpa error", "Belum ada data" in txt(pg)); mode(pg, "deny"); pg.reload(); pg.wait_for_selector("[data-retry], .err")
    chk("tanpa izin laporan: pesan izin", "tidak punya izin" in txt(pg)); mode(pg, "")
    chk("tanpa galat JavaScript", not errs, errs); ctx.close()
    ctx, pg, errs = newpage(b, vw=375); pg.goto(BASE + "/admin#reports:sum"); pg.wait_for_selector(".kpi")
    chk("mobile 375px: tanpa scroll horizontal (pendapatan)", pg.evaluate("document.documentElement.scrollWidth <= window.innerWidth + 1"))
    pg.goto(BASE + "/admin#reports:cust"); pg.wait_for_selector(".rp-fr"); chk("mobile 375px: tanpa scroll horizontal (funnel)", pg.evaluate("document.documentElement.scrollWidth <= window.innerWidth + 1"))
    b.close()
print("\n%d lulus, %d gagal" % (ok_n, bad_n)); raise SystemExit(1 if bad_n else 0)
