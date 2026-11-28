# Uji UI admin: Analytics Pengunjung (tahap 3): izin menu, filter periode (WIB), KPI, grafik, tab, ekspor CSV/XLSX asli, XSS, real-time (polling), mobile.
# Backend ditiru di browser (window.supabase stub) hanya untuk menguji antarmuka. Isi tiruan = keluaran RPC ASLI dari database lokal
# (ops/tests/fixtures-admin-analytics.json, dibuat dengan menjalankan data uji ops/tests/admin-analytics.test.sql lalu memanggil tiap RPC).
# Logika data, izin server, dan keamanan SQL diuji di ops/tests/admin-analytics.test.sql.
import http.server, socketserver, threading, os, json, zipfile, tempfile, datetime, re
from playwright.sync_api import sync_playwright
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
FIX = json.load(open(os.path.join(os.path.dirname(__file__), "fixtures-admin-analytics.json")))
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
    else: bad_n += 1; print("FAIL", n, str(d)[:300])
def newpage(b, vw=1280, perms=None, clock=False):
    ctx = b.new_context(viewport={"width": vw, "height": 900}); errs = []
    pg = ctx.new_page(); pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.route("**/supabase-js@*/**", lambda r: r.fulfill(status=200, content_type="text/javascript", body=STUB))
    pg.route("**/fonts.googleapis.com/**", lambda r: r.abort()); pg.route("**/fonts.gstatic.com/**", lambda r: r.abort())
    if clock: pg.clock.install()
    if perms: pg.add_init_script("sessionStorage.setItem('__perms', %s)" % json.dumps(json.dumps(perms)))
    return ctx, pg, errs
def txt(pg, sel="#view"): return pg.inner_text(sel)

STUB = ("window.__F=" + json.dumps(FIX) + ";") + r"""window.__calls=[];
var PERMS=JSON.parse(sessionStorage.getItem('__perms')||'null')||['dashboard.read','analytics.read'];
function ok(d){return Promise.resolve({data:d===undefined?null:d,error:null})}
function qb(){var o={};['select','order','range','or','in','gte','lte','lt','gt','neq','ilike','contains','not','is','limit','eq'].forEach(function(m){o[m]=function(){return o}});o.maybeSingle=function(){return ok(null)};o.single=function(){return ok(null)};o.then=function(f){return ok([]).then(f)};return o}
function clone(x){return JSON.parse(JSON.stringify(x))}
window.supabase={createClient:function(){return{
 from:qb,
 rpc:function(n,a){window.__calls.push([n,a]);
  if(n==='my_admin')return ok({role:'admin',perms:PERMS,mfa:{needed:false}});
  if(n==='admin_analytics_refresh')return ok({ok:true});
  if(n.indexOf('admin_analytics_')!==0)return ok([]);
  var m=sessionStorage.getItem('__mode')||'';
  if(m==='deny')return Promise.resolve({data:null,error:{code:'42501',message:'forbidden'}});
  if(m==='nofn')return Promise.resolve({data:null,error:{code:'PGRST202',message:'Could not find the function public.'+n}});
  var k=n.replace('admin_analytics_',''), F=window.__F, e=(m==='empty')?'_e':'', d=clone(F[(k==='overview'?'ov':k)+e]);
  if(k==='pages'&&m==='many'){d.total_rows=60;d.offset=a.p_offset||0;}
  if(k==='sources'&&m==='xss'){d.by_campaign[0].k='=HYPERLINK("x")';d.by_source[0].k='<img src=x onerror=window.__xss=1>';}
  return ok(d)},
 functions:{invoke:function(){return Promise.resolve({data:{ok:true},error:null})}},
 storage:{from:function(){return{upload:function(){return ok({})}}}},
 auth:{getSession:function(){return Promise.resolve({data:{session:{access_token:'tok',user:{id:'u1',email:'adm@uji.test'}}}})},signOut:function(){return Promise.resolve({})},onAuthStateChange:function(){return{data:{subscription:{unsubscribe:function(){}}}}}}}}};"""

def calls(pg, n): return [c[1] for c in pg.evaluate("window.__calls") if c[0] == n]
def ncalls(pg, n): return len(calls(pg, n))
def mode(pg, m): pg.evaluate("sessionStorage.setItem('__mode','%s')" % m)
def jk(off=0):
    return (datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=7) + datetime.timedelta(days=off)).strftime("%Y-%m-%d")
def wait_load(pg, n_exp, name="admin_analytics_overview"): pg.wait_for_function("window.__calls.filter(c=>c[0]==='%s').length>=%d" % (name, n_exp))

with sync_playwright() as pw:
    b = pw.chromium.launch()
    # ---------- izin menu
    ctx, pg, errs = newpage(b, perms=["dashboard.read"]); ctx.set_default_timeout(15000); pg.goto(BASE + "/admin#analytics"); pg.wait_for_selector("#nav a")
    chk("tanpa analytics.read: menu Analytics tidak tampil dan data tidak diminta", "Analytics Pengunjung" not in pg.inner_text("#nav") and ncalls(pg, "admin_analytics_overview") == 0, pg.inner_text("#nav")[:200]); ctx.close()
    ctx, pg, errs = newpage(b); ctx.set_default_timeout(15000); pg.goto(BASE + "/admin#analytics:ringkasan"); pg.wait_for_selector(".kpi", timeout=15000); t = txt(pg)
    chk("dengan analytics.read: menu Analytics tampil di grup Bisnis", "Analytics Pengunjung" in pg.inner_text("#nav"))
    chk("7 tab", [x.strip() for x in pg.locator(".tabs button").all_inner_texts()] == ["Ringkasan", "Sumber & UTM", "Halaman populer", "Template", "Funnel", "Audiens", "Real-time"], pg.locator(".tabs button").all_inner_texts())
    chk("rekap harian dipicu sebelum membaca (aman diulang, dibatasi server)", ncalls(pg, "admin_analytics_refresh") == 1 and calls(pg, "admin_analytics_refresh")[0]["p_days"] == 2)
    # ---------- periode
    c = calls(pg, "admin_analytics_overview")[0]
    chk("default 7 hari terakhir (WIB), tanggal inklusif", c["p_from"] == jk(-6) and c["p_to"] == jk(0), c)
    for key, f, t_ in [("today", jk(0), jk(0)), ("yesterday", jk(-1), jk(-1)), ("30d", jk(-29), jk(0))]:
        n0 = ncalls(pg, "admin_analytics_overview"); pg.select_option("#an-k", key); wait_load(pg, n0 + 1); pg.wait_for_selector(".kpi"); c = calls(pg, "admin_analytics_overview")[-1]
        chk("preset " + key, c["p_from"] == f and c["p_to"] == t_, c)
    today = datetime.date.fromisoformat(jk(0)); first = today.replace(day=1); lm_end = first - datetime.timedelta(days=1)
    n0 = ncalls(pg, "admin_analytics_overview"); pg.select_option("#an-k", "month"); wait_load(pg, n0 + 1); c = calls(pg, "admin_analytics_overview")[-1]
    chk("preset bulan ini", c["p_from"] == first.isoformat() and c["p_to"] == jk(0), c)
    n0 = ncalls(pg, "admin_analytics_overview"); pg.select_option("#an-k", "lastmonth"); wait_load(pg, n0 + 1); c = calls(pg, "admin_analytics_overview")[-1]
    chk("preset bulan lalu: tanggal 1 sampai hari terakhir bulan lalu", c["p_from"] == lm_end.replace(day=1).isoformat() and c["p_to"] == lm_end.isoformat(), c)
    pg.select_option("#an-k", "custom"); pg.wait_for_selector("#an-f"); pg.fill("#an-f", "2026-03-10"); pg.fill("#an-t", "2026-03-12"); n0 = ncalls(pg, "admin_analytics_overview"); pg.click("#an-go"); wait_load(pg, n0 + 1); pg.wait_for_selector(".kpi")
    c = calls(pg, "admin_analytics_overview")[-1]; chk("kustom 10-12 Maret dikirim apa adanya", c["p_from"] == "2026-03-10" and c["p_to"] == "2026-03-12", c)
    # ---------- KPI dari keluaran RPC asli
    t = txt(pg)
    chk("10 KPI: pengunjung unik 3, sesi 5, page views 11, bounce 40%, pendaftaran 3, pesanan 2, revenue Rp200.000", all(s in t for s in ["Total Visitors", "Unique Visitors", "Total Sessions", "Total Page Views", "40%", "Rp200.000", "Pesanan lunas", "Pendaftaran baru"]) and pg.locator(".kpi").count() == 10, t[:700])
    vals = pg.locator(".kpi b").all_inner_texts()
    chk("nilai KPI sesuai data (4, 3, 5, 11, 2,2, 3 mnt 24 dtk, 40%, 3, 2, Rp200.000)", vals == ["4", "3", "5", "11", "2,2", "3 mnt 24 dtk", "40%", "3", "2", "Rp200.000"], vals)
    chk("pembanding periode sebelumnya tampil", "vs periode lalu" in t)
    chk("tooltip definisi pada setiap KPI", pg.locator(".kpi .an-tip").count() == 10 and all(len(x) > 20 for x in pg.locator(".kpi .an-tip").evaluate_all("els=>els.map(e=>e.title)")))
    chk("peringatan: pembayaran belum live dan pengumpulan belum aktif", "Pembayaran belum live" in t and "belum diaktifkan" in t)
    chk("6 grafik; pengunjung per hari = 3 batang", pg.locator(".an-grid .card").count() == 6 and pg.locator(".an-grid .card svg").first.locator("rect").count() == 3)
    chk("definisi dan batasan data tersedia", "Bounce rate = sesi dengan satu halaman" in pg.locator("details").text_content() and pg.locator("details dt").count() == 10)
    # rentang tidak valid
    pg.select_option("#an-k", "custom"); pg.wait_for_selector("#an-f"); pg.fill("#an-f", "2026-03-12"); pg.fill("#an-t", "2026-03-10"); n0 = ncalls(pg, "admin_analytics_overview"); pg.click("#an-go"); pg.wait_for_selector(".err, .empty, [data-retry]")
    chk("rentang terbalik: pesan jelas tanpa panggilan ke server", "Tanggal akhir tidak boleh sebelum" in txt(pg) and ncalls(pg, "admin_analytics_overview") == n0, txt(pg)[:200])
    pg.fill("#an-f", "2024-01-01"); pg.fill("#an-t", "2026-03-10"); pg.click("#an-go"); pg.wait_for_selector(".empty")
    chk("rentang > 366 hari: pesan jelas tanpa panggilan ke server", "maksimal 366" in txt(pg) and ncalls(pg, "admin_analytics_overview") == n0)
    # ---------- keadaan kosong, tanpa izin server, fungsi belum terpasang
    mode(pg, "empty"); pg.goto(BASE + "/admin#analytics:ringkasan"); pg.reload(); pg.wait_for_selector(".kpi")
    t = txt(pg); chk("data kosong: keadaan kosong informatif, rasio '-' bukan angka karangan", "Belum ada data pengunjung" in t and pg.locator(".kpi b").nth(6).inner_text() == "-" and pg.locator(".kpi b").nth(5).inner_text() == "-", pg.locator(".kpi b").all_inner_texts())
    chk("data kosong: grafik menampilkan keadaan kosong", "Tidak ada aktivitas pada periode ini" in t)
    mode(pg, "deny"); pg.reload(); pg.wait_for_selector("[data-retry]"); chk("ditolak server (42501): pesan izin analytics.read", "analytics.read" in txt(pg), txt(pg)[:200])
    mode(pg, "nofn"); pg.reload(); pg.wait_for_selector("[data-retry]"); chk("fungsi belum dipasang: arahkan ke backend/admin-analytics.sql", "admin-analytics.sql" in txt(pg)); mode(pg, "")
    # ---------- sumber & UTM
    pg.goto(BASE + "/admin#analytics:sumber"); pg.reload(); pg.wait_for_selector(".tbl-w"); t = txt(pg)
    chk("sumber: organic, social, paid, direct, tidak teratribusi", all(s in t for s in ["Organic Search", "Social", "Iklan berbayar", "Direct", "Tidak teratribusi"]), t[:400])
    chk("UTM: source, medium, campaign promo-nov, content, term, referrer", all(s in t for s in ["utm_source", "utm_medium", "utm_campaign", "promo-nov", "utm_content", "utm_term", "www.google.com"]))
    chk("catatan atribusi: tidak mengklaim kampanye menghasilkan transaksi tanpa bukti", "tidak dinyatakan menghasilkan transaksi" in t)
    mode(pg, "xss"); pg.reload(); pg.wait_for_selector(".tbl-w"); chk("nama sumber/kampanye di-escape (tanpa XSS)", pg.evaluate("window.__xss") is None and pg.locator(".tbl-w img").count() == 0)
    with pg.expect_download() as dl: pg.click("#an-csv")
    path = tempfile.mktemp(suffix=".csv"); dl.value.save_as(path); raw = open(path, "rb").read(); s = raw.decode("utf-8"); mode(pg, "")
    chk("CSV sumber: BOM, nama file tab+periode, judul bagian", raw[:3] == b"\xef\xbb\xbf" and re.match(r"nusamora-analytics-sumber-utm-\d{4}-\d\d-\d\d_\d{4}-\d\d-\d\d\.csv$", dl.value.suggested_filename) and "utm_campaign" in s and "Sumber traffic" in s, dl.value.suggested_filename)
    chk("CSV: formula berbahaya dinetralkan dengan tanda petik", "'=HYPERLINK" in s and ",=HYPERLINK" not in s and "\n=HYPERLINK" not in s)
    chk("CSV: tanpa data pribadi (tanpa UUID/visitor_id/e-mail)", not re.search(r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}", s) and "visitor_id" not in s and "@" not in s, s[:200])
    # ---------- halaman populer
    pg.goto(BASE + "/admin#analytics:halaman"); pg.reload(); pg.wait_for_selector(".tbl-w"); t = txt(pg)
    chk("halaman: URL, views, kontribusi, perubahan; /akun tidak ada", "/template" in t and "/paket" in t and "30%" in t and "/akun" not in t and pg.locator("tbody tr").count() == 4, t[:300])
    chk("judul halaman dan sesi per halaman ditandai TIDAK TERSEDIA", "TIDAK TERSEDIA" in pg.locator("details").text_content())
    mode(pg, "many"); pg.reload(); pg.wait_for_selector("#an-pq"); chk("paginasi: 1-4 dari 60, Sebelumnya nonaktif", "dari 60" in txt(pg) and pg.is_disabled("#an-prev") and not pg.is_disabled("#an-next"))
    pg.fill("#an-pq", "temp"); pg.press("#an-pq", "Enter"); pg.wait_for_function("window.__calls.some(c=>c[0]==='admin_analytics_pages'&&c[1].p_q==='temp')")
    chk("pencarian URL dikirim sebagai parameter (p_q)", True)
    pg.select_option("#an-ps", "change"); pg.wait_for_function("window.__calls.some(c=>c[0]==='admin_analytics_pages'&&c[1].p_sort==='change')"); chk("urutan dikirim (p_sort)", True)
    pg.click("#an-next"); pg.wait_for_function("window.__calls.some(c=>c[0]==='admin_analytics_pages'&&c[1].p_offset===25)"); chk("halaman berikutnya: offset 25, batas 25", calls(pg, "admin_analytics_pages")[-1]["p_limit"] == 25)
    with pg.expect_download() as dl: pg.click("#an-xl")
    path = tempfile.mktemp(suffix=".xlsx"); dl.value.save_as(path)
    cexp = [c for c in calls(pg, "admin_analytics_pages") if c.get("p_export")]
    chk("ekspor halaman memanggil RPC terotorisasi dengan p_export dan batas 200", len(cexp) == 1 and cexp[0]["p_limit"] == 200 and cexp[0]["p_q"] == "temp", cexp)
    z = zipfile.ZipFile(path); chk("XLSX: arsip valid (uji CRC) dan nama file benar", z.testzip() is None and dl.value.suggested_filename.startswith("nusamora-analytics-halaman-") and dl.value.suggested_filename.endswith(".xlsx"))
    import openpyxl
    wb = openpyxl.load_workbook(path); ws = wb["Halaman populer"]; rows = [[c.value for c in r] for r in ws.iter_rows(min_row=2)]
    chk("XLSX: header dan angka bertipe angka", rows[0][0] == "URL" and rows[1][0] == "/" and rows[1][2] == 3 and isinstance(rows[1][2], (int, float)), rows[:3]); mode(pg, "")
    # ---------- template
    pg.goto(BASE + "/admin#analytics:template"); pg.reload(); pg.wait_for_selector(".tbl-w"); t = txt(pg)
    chk("template: nama dari katalog + slug, kategori, minat naik tertinggi", "Dino Kids" in t and "dino-kids" in t and "rose-gold" in t and "Ulang Tahun AA" in t and "Minat naik tertinggi" in t, t[:300])
    chk("event yang belum dikumpulkan dilaporkan (template_favorite, template_cta_click)", "template_favorite" in pg.locator("details").text_content() and "template_cta_click" in pg.locator("details").text_content())
    # ---------- funnel
    pg.goto(BASE + "/admin#analytics:funnel"); pg.reload(); pg.wait_for_selector(".an-fr"); t = txt(pg)
    chk("funnel: 4 tahap, konversi dan drop-off, peringatan sampel kecil", pg.locator(".an-fr").count() == 4 and "dari tahap sebelumnya; hilang" in t and "Sampel kecil" in t and "Pembayaran sukses" in t, t[:500])
    mode(pg, "empty"); pg.reload(); pg.wait_for_selector(".an-fr"); chk("funnel tanpa pendaftar: status data belum cukup", "Data belum cukup" in txt(pg)); mode(pg, "")
    # ---------- audiens
    pg.goto(BASE + "/admin#analytics:audiens"); pg.reload(); pg.wait_for_selector(".tbl-w"); t = txt(pg)
    chk("audiens: 6 dimensi, negara berbahasa Indonesia, tanpa IP/fingerprint", pg.locator(".an-grid .card").count() == 6 and "Indonesia" in t and "Pengunjung baru" in t and "Kecil (<640 px)" in t, t[:300])
    # ---------- real-time (polling 30 detik, berhenti saat ditinggalkan)
    ctx.close(); ctx, pg, errs = newpage(b, clock=True); ctx.set_default_timeout(15000); pg.goto(BASE + "/admin#analytics:realtime"); pg.wait_for_selector("#an-live-body"); t = txt(pg)
    chk("real-time: sesi aktif 1 (aktivitas <= 5 menit), halaman /paket, tanpa identitas", "Sesi aktif" in t and "/paket" in t and pg.locator(".kpi b").first.inner_text().strip() == "1" and "visitor" not in t.lower().replace("pengunjung", ""), t[:300])
    n0 = ncalls(pg, "admin_analytics_live"); pg.clock.run_for(31000); pg.wait_for_function("window.__calls.filter(c=>c[0]==='admin_analytics_live').length>%d" % n0)
    chk("polling: data diperbarui otomatis tiap 30 detik", ncalls(pg, "admin_analytics_live") == n0 + 1, ncalls(pg, "admin_analytics_live"))
    pg.evaluate("location.hash='#analytics:ringkasan'"); pg.wait_for_selector(".kpi"); n1 = ncalls(pg, "admin_analytics_live"); pg.clock.run_for(95000)
    chk("polling berhenti saat meninggalkan tab real-time (tidak membebani database)", ncalls(pg, "admin_analytics_live") == n1)
    chk("tanpa galat JavaScript", not errs, errs); ctx.close()
    # ---------- mobile
    ctx, pg, errs = newpage(b, vw=375); ctx.set_default_timeout(15000)
    for tab, sel in [("ringkasan", ".kpi"), ("sumber", ".tbl-w"), ("halaman", ".tbl-w"), ("template", ".tbl-w"), ("funnel", ".an-fr"), ("audiens", ".tbl-w"), ("realtime", "#an-live-body")]:
        pg.goto(BASE + "/admin#analytics:" + tab); pg.reload(); pg.wait_for_selector(sel)
        chk("mobile 375px tanpa scroll horizontal: " + tab, pg.evaluate("document.documentElement.scrollWidth <= window.innerWidth + 1"), pg.evaluate("document.documentElement.scrollWidth"))
    chk("tanpa galat JavaScript (mobile)", not errs, errs); b.close()
print("\n%d lulus, %d gagal" % (ok_n, bad_n)); raise SystemExit(1 if bad_n else 0)
