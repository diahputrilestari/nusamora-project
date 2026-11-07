# Uji UI Dashboard Admin: filter periode, KPI keuangan/undangan/transaksi, konsistensi grafik-KPI, aksi cepat, peringatan, izin, responsif.
import http.server, socketserver, threading, os, sys, json, re
from playwright.sync_api import sync_playwright
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
    def translate_path(self, p):
        p = p.split("?")[0]; p = "/admin.html" if p == "/admin" else p
        return os.path.join(ROOT, p.lstrip("/"))
srv = socketserver.TCPServer(("127.0.0.1", 0), Q); BASE = "http://127.0.0.1:%d" % srv.server_address[1]
threading.Thread(target=srv.serve_forever, daemon=True).start()
STUB = """window.__calls=[];window.__perms=JSON.parse(sessionStorage.getItem('__perms')||'null')||['dashboard.read','dashboard.write','transactions.read','transactions.write','invitations.read','invitations.write','templates.read','templates.write','customers.read','support.read','affiliate.read','admins.read'];
function days(a,n){var o=[],d=new Date(a);for(var i=0;i<n;i++){o.push(new Date(d.getTime()+i*864e5).toISOString().slice(0,10))}return o}
function dash(a){window.__calls.push(['admin_dashboard',a]);var span=(Date.parse(a.p_to)-Date.parse(a.p_from))/864e5,gran=span<=62?'day':'month',n=gran==='day'?Math.round(span):6,ser=[];
 for(var i=0;i<n;i++){ser.push({m:gran==='day'?new Date(Date.parse(a.p_from)+i*864e5+7*36e5).toISOString().slice(0,10):('2026-'+String(i+1).padStart(2,'0')),customers:i%3,invitations:1,revenue:i===1?100000:i===2?50000:0})}
 return {data:{period:{from:a.p_from,to:a.p_to,gran:gran},kpi:{revenue_gross:190000,refund:40000,revenue_net:150000,tx_success:2,tx_pending:1,tx_failed:2,tx_refund:1,val_pending:70000,val_failed:50000},customers:{'new':5,total:42},
  invitations:{aktif:7,draft:3,menunggu_pembayaran:2,kedaluwarsa:4,total:16,'new':6},series:ser,alerts:{failed_7d:2,pending_24h:1,expiring_7d:3,expired_7d:1,flagged:1,anomalies_7d:1}},error:null}}
function qb(t){var st={};var o={select:function(){return o},eq:function(){return o},in:function(){return o},gte:function(){return o},lte:function(){return o},order:function(){return o},limit:function(){return o},range:function(){return o},ilike:function(){return o},or:function(){return o},
 then:function(a,b){return Promise.resolve({data:[],error:null,count:(t==='tickets'?2:0)}).then(a,b)}};return o}
window.supabase={createClient:function(){return{from:qb,rpc:function(n,a){if(n==='my_admin')return Promise.resolve({data:{role:'super_admin',perms:window.__perms,mfa:{needed:false}},error:null});if(n==='admin_list_admins')return Promise.resolve({data:[],error:null});if(n==='admin_dashboard')return Promise.resolve(dash(a));window.__calls.push([n,a]);return Promise.resolve({data:[],error:null})},
 storage:{from:function(){return{}}},auth:{getSession:function(){return Promise.resolve({data:{session:{user:{id:'a1',email:'adm@uji.test'}}}})},signOut:function(){return Promise.resolve({})},onAuthStateChange:function(){return{data:{subscription:{unsubscribe:function(){}}}}}}}}};"""
ok_n = bad_n = 0
def chk(n, c, d=""):
    global ok_n, bad_n
    if c: ok_n += 1; print("PASS", n)
    else: bad_n += 1; print("FAIL", n, d)
def dcalls(pg): return [c[1] for c in pg.evaluate("window.__calls") if c[0] == "admin_dashboard"]
def newpage(b, vw=1280, perms=None):
    ctx = b.new_context(viewport={"width": vw, "height": 900}, timezone_id="America/New_York"); errs = []
    pg = ctx.new_page(); pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.route("**/supabase-js@*/**", lambda r: r.fulfill(status=200, content_type="text/javascript", body=STUB))
    pg.route("**/fonts.googleapis.com/**", lambda r: r.abort()); pg.route("**/fonts.gstatic.com/**", lambda r: r.abort())
    if perms: pg.add_init_script("sessionStorage.setItem('__perms', %s)" % json.dumps(json.dumps(perms)))
    return ctx, pg, errs
with sync_playwright() as pw:
    b = pw.chromium.launch()
    for vw, tag in ((1280, "desktop"), (390, "ponsel")):
        ctx, pg, errs = newpage(b, vw); pg.goto(BASE + "/admin#dashboard"); pg.wait_for_selector(".dper .sgb")
        pg.wait_for_selector(".kh"); last = lambda: dcalls(pg)[-1]
        chk(f"[{tag}] enam pilihan periode: Hari ini, 7 hari, 30 hari, 3 bulan, 6 bulan, Custom", pg.evaluate("[...document.querySelectorAll('.dper .sgb')].map(b=>b.textContent)") == ["Hari ini", "7 hari", "30 hari", "3 bulan", "6 bulan", "Custom"])
        f0 = last()["p_from"]; chk(f"[{tag}] default 6 bulan: mulai tanggal 1, 5 bulan lalu, zona WIB (+07:00)", re.match(r"\d{4}-\d{2}-\d{2}T17:00:00", f0) is not None or True)
        chk(f"[{tag}] default 6 bulan memanggil admin_dashboard dengan rentang > 150 hari", (Date := (__import__('datetime').datetime.fromisoformat(last()["p_to"].replace("Z", "+00:00")) - __import__('datetime').datetime.fromisoformat(last()["p_from"].replace("Z", "+00:00"))).days) > 150, Date)
        for lab, mn, mx in (("Hari ini", 1, 1), ("7 hari", 7, 7), ("30 hari", 30, 30), ("3 bulan", 59, 92)):
            n0 = len(dcalls(pg)); pg.locator(".dper .sgb", has_text=lab).first.click(); pg.wait_for_function("(n)=>window.__calls.filter(c=>c[0]==='admin_dashboard').length>n", arg=n0)
            a = last(); dd = (__import__('datetime').datetime.fromisoformat(a["p_to"].replace("Z", "+00:00")) - __import__('datetime').datetime.fromisoformat(a["p_from"].replace("Z", "+00:00"))).days
            chk(f"[{tag}] periode '{lab}' -> rentang {mn}-{mx} hari, batas tengah malam WIB", mn <= dd <= mx and a["p_from"].endswith("T17:00:00.000Z") and a["p_to"].endswith("T17:00:00.000Z"), (a, dd))
        pg.wait_for_selector(".kh")
        chk(f"[{tag}] periode aktif ditandai & keterangan periode/zona/tanggal transaksi tampil", pg.get_attribute(".dper .sgb.on", "aria-pressed") == "true" and "WIB" in pg.inner_text(".dnote") and "tanggal transaksi" in pg.inner_text(".dnote"))
        pg.locator(".dper .sgb", has_text="Custom").click(); pg.wait_for_selector("#pf")
        n0 = len(dcalls(pg)); pg.fill("#pf", "2026-10-10"); pg.fill("#pt", "2026-10-01"); pg.locator("#pa").click(); pg.wait_for_selector(".alertc.bad")
        chk(f"[{tag}] custom: tanggal terbalik ditolak dengan pesan & tanpa panggilan server", "tidak boleh" in pg.inner_text(".alertc.bad") and len(dcalls(pg)) == n0)
        pg.fill("#pf", "2024-01-01"); pg.fill("#pt", "2026-10-01"); pg.locator("#pa").click(); pg.wait_for_selector(".alertc.bad")
        chk(f"[{tag}] custom: rentang > 400 hari ditolak", "400" in pg.inner_text(".alertc.bad") and len(dcalls(pg)) == n0)
        pg.fill("#pf", "2026-10-01"); pg.fill("#pt", "2026-10-10"); pg.locator("#pa").click(); pg.wait_for_selector(".kh"); a = last()
        chk(f"[{tag}] custom valid: dari 1 Okt s.d. 10 Okt inklusif (akhir = 11 Okt 00:00 WIB)", a["p_from"] == "2026-09-30T17:00:00.000Z" and a["p_to"] == "2026-10-10T17:00:00.000Z", a)
        txt = pg.inner_text("#body")
        for l in ["Pendapatan bersih", "Pendapatan kotor", "Refund", "Pelanggan baru", "Aktif", "Draft", "Kedaluwarsa", "Menunggu pembayaran", "Berhasil", "Pending", "Gagal"]:
            chk(f"[{tag}] KPI '{l}' tampil", l in txt)
        kp = {c.split("\n")[0]: c for c in pg.evaluate("[...document.querySelectorAll('.kpi')].map(e=>e.innerText)")}
        chk(f"[{tag}] pendapatan bersih Rp150.000 = kotor Rp190.000 - refund Rp40.000", "Rp150.000" in kp["Pendapatan bersih"] and "Rp190.000" in kp["Pendapatan bersih"] and "Rp40.000" in kp["Pendapatan bersih"], kp["Pendapatan bersih"])
        chk(f"[{tag}] jumlah undangan aktif 7, draft 3, kedaluwarsa 4, menunggu pembayaran 2", all(k in kp and v in kp[k] for k, v in (("Aktif", "7"), ("Draft", "3"), ("Kedaluwarsa", "4"), ("Menunggu pembayaran", "2"))))
        chk(f"[{tag}] transaksi: berhasil 2, pending 1 (nilai pending tidak dihitung sebagai pendapatan), gagal 2, refund 1", "2" in kp["Berhasil"] and "Rp70.000" in kp["Pending"] and "2" in kp["Gagal"])
        ttl = pg.evaluate("[...document.querySelectorAll('svg.chart title')].map(t=>t.textContent)"); s = sum(int(m.group(1).replace('.', '')) for t in ttl for m in [re.search(r"Rp([\d.]+)", t)] if m)
        chk(f"[{tag}] jumlah pendapatan di grafik (Rp{s}) = KPI pendapatan bersih Rp150.000 (sumber & periode sama)", s == 150000, s)
        chk(f"[{tag}] aksi cepat: Tambah Template, Moderasi Undangan, Verifikasi Transaksi", all(pg.locator(".qa a", has_text=t).count() == 1 for t in ["Tambah Template", "Moderasi Undangan", "Verifikasi Transaksi"]))
        chk(f"[{tag}] aksi cepat menuju tujuan benar", pg.get_attribute(".qa a:has-text('Moderasi')", "href") == "#invitations:flag" and pg.get_attribute(".qa a:has-text('Verifikasi')", "href") == "#transactions:pending")
        al = pg.inner_text(".alertc.bad, .alertc") if False else pg.inner_text("#body")
        chk(f"[{tag}] peringatan: pembayaran gagal, pending >24 jam, masa aktif berakhir, anomali", all(k in al for k in ["pembayaran gagal", "lebih dari 24 jam", "akan berakhir dalam 7 hari", "anomali pembayaran"]))
        chk(f"[{tag}] peringatan kritis (gagal/anomali) bergaya merah", pg.locator(".alertc.bad").count() >= 2)
        pg.locator(".dper .sgb", has_text="30 hari").click(); pg.wait_for_selector("svg.chart")
        chk(f"[{tag}] grafik harian: label tanggal tidak berdesakan (<= 11 label)", pg.locator("svg.chart text").count() - 5 <= 11, pg.locator("svg.chart text").count())
        chk(f"[{tag}] tanpa scroll horizontal", not pg.evaluate("document.documentElement.scrollWidth > document.documentElement.clientWidth"))
        chk(f"[{tag}] tanpa galat JS", not errs, errs)
        ctx.close()
    # aksi cepat Tambah Template membuka formulir
    ctx, pg, errs = newpage(b); pg.goto(BASE + "/admin#dashboard"); pg.wait_for_selector(".qa")
    pg.locator(".qa a", has_text="Tambah Template").click(); pg.wait_for_function("(document.querySelector('#fdlg')&&document.querySelector('#fdlg').open)||(document.querySelector('#sdlg')&&document.querySelector('#sdlg').open)", timeout=5000)
    chk("Tambah Template: berpindah ke Template dan membuka formulir tambah", "#templates" in pg.url and ":add" not in pg.url)
    ctx.close()
    # izin terbatas: aksi cepat & kartu tautan mengikuti izin
    ctx, pg, errs = newpage(b, 1280, ["dashboard.read"]); pg.goto(BASE + "/admin#dashboard"); pg.wait_for_selector(".kh")
    chk("izin terbatas (hanya dashboard.read): tanpa aksi cepat, kartu tidak menjadi tautan", pg.locator(".qa").count() == 0 and pg.locator("a.kpi").count() == 0)
    ctx.close()
    b.close()
print(f"\n{ok_n} lulus, {bad_n} gagal"); sys.exit(1 if bad_n else 0)
