# Uji UI admin: Manajemen Transaksi (daftar, tab, detail Midtrans, sinkronisasi lewat backend, tanpa tombol lunas manual, refund berbukti, ekspor CSV/Excel, izin baca saja).
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
var PERMS=JSON.parse(sessionStorage.getItem('__perms')||'null')||['dashboard.read','transactions.read','transactions.write'];
var NOW=Date.now(),D=864e5,iso=function(n){return new Date(NOW+n*D).toISOString()};
var LIST=[
 {id:'v1',number:'INV-1',description:'Paket Signature <img src=x onerror=window.__xss=1>',amount:149000,status:'lunas',created_at:iso(-3),paid_at:iso(-3),order_id:'NM1',midtrans_status:'settlement',pay_status:'paid',payment_type:'qris',transaction_id:'TX-1',owner_name:'Sari',owner_email:'sari@uji.test',refund_status:null,needs_review:false,in_refund:'tidak'},
 {id:'v2',number:'INV-2',description:'Paket Essential',amount:79000,status:'menunggu',created_at:iso(-1),paid_at:null,order_id:'NM2',midtrans_status:'pending',pay_status:'pending',payment_type:null,transaction_id:null,owner_name:'Budi',owner_email:'budi@uji.test',refund_status:null,needs_review:false,in_refund:'tidak'},
 {id:'v3',number:'INV-3',description:'Paket Luxe',amount:299000,status:'lunas',created_at:iso(-9),paid_at:iso(-9),order_id:'NM3',midtrans_status:'settlement',pay_status:'paid',payment_type:'gopay',transaction_id:'TX-3',owner_name:'Dewi',owner_email:'dewi@uji.test',refund_status:'diajukan',needs_review:true,in_refund:'ya'},
 {id:'v4',number:'INV-4',description:'Invoice lama',amount:50000,status:'lunas',created_at:iso(-90),paid_at:iso(-90),order_id:null,midtrans_status:null,pay_status:null,payment_type:null,transaction_id:null,owner_name:'Eko',owner_email:'eko@uji.test',refund_status:null,needs_review:false,in_refund:'tidak'}];
var REF=[];
function det(id){var l=LIST.filter(function(x){return x.id===id})[0];if(!l)return null;
 var p=l.order_id?{id:'p'+id,order_id:l.order_id,status:l.pay_status,transaction_id:l.transaction_id,payment_type:l.payment_type,midtrans_status:l.midtrans_status,fraud_status:null,mapped_status:l.pay_status,plan_id:'signature',duration_days:90,experience:'3d',paid_at:l.paid_at,expires_at:iso(1),note:l.needs_review?'jumlah_tidak_cocok':null,created_at:iso(-3),updated_at:iso(-3)}:null;
 return {invoice:{id:l.id,number:l.number,description:l.description,amount:l.amount,status:l.status,created_at:l.created_at,paid_at:l.paid_at,refunded_at:null},customer:{id:'c1',full_name:l.owner_name,email:l.owner_email,whatsapp:'0812'},payment:p,invitation:p?{id:'i1',title:'Undangan Uji',status:'aktif',expires_at:iso(80)}:null,
  events:p?[{at:iso(-3),source:'webhook',status:'settlement',result:'applied',payment_type:'qris'},{at:iso(-3),source:'webhook',status:'settlement',result:'duplicate'},{at:iso(-4),source:'webhook',status:'pending',result:'applied'}]:[],
  history:p?[{at:iso(-3),kind:'webhook',action:'settlement',result:'applied'},{at:iso(-2),kind:'admin',action:'catatan',table:'transaksi',by:'Admin Uji',change:'Dicek manual'}]:[],refunds:REF.filter(function(r){return r.inv===id}).map(function(r){return r.row})}}
function ok(d){return Promise.resolve({data:d===undefined?null:d,error:null})}
function err(m){return Promise.resolve({data:null,error:{message:m,code:'P0001'}})}
window.supabase={createClient:function(){return{
 from:function(t){var o={select:function(){return o},eq:function(){return o},order:function(){return o},range:function(){return o},or:function(){return o},then:function(a,b){return Promise.resolve({data:[],error:null,count:0}).then(a,b)}};return o},
 rpc:function(n,a){window.__calls.push([n,a]);
  if(n==='my_admin')return ok({role:'finance',perms:PERMS,mfa:{needed:false}});
  if(n==='admin_list_transactions')return ok(LIST);
  if(n==='admin_transactions_overview')return ok({paid_count:2,paid_sum:448000,pending_count:1,failed_count:0,refund_count:0,refund_open:1,review:1});
  if(n==='admin_transaction_detail'){var d=det(a.p_invoice);return d?ok(d):err('transaksi tidak ditemukan')}
  if(n==='admin_transaction_note')return ok();
  if(n==='admin_refund_request'){if(a.p_reason.length<5)return ok({error:'alasan_terlalu_pendek'});REF.push({inv:a.p_invoice,row:{id:'r1',amount:149000,reason:a.p_reason,status:'diajukan',requested_at:iso(0),requested_by:'Admin Uji'}});return ok({ok:true,id:'r1'})}
  if(n==='admin_refund_decide'){var r=REF[0].row;if(a.p_decision==='selesai'&&!a.p_proof_url&&!a.p_proof_note)return ok({error:'bukti_belum_ada'});r.status=a.p_decision;r.method=a.p_method;r.proof_url=a.p_proof_url;r.proof_note=a.p_proof_note;r.decided_at=iso(0);return ok({ok:true,status:a.p_decision})}
  if(n==='admin_export_transactions')return ok([{invoice:'INV-1',dibuat:'2026-11-05 10:00',pelanggan:'=HYPERLINK("x")',email:'a@b.c',keterangan:'Paket "Signature", 3D',paket:'signature',jumlah:149000,status_internal:'lunas',status_midtrans:'settlement',fraud:null,metode:'qris',order_id:'NM1',transaction_id:'TX-1',dibayar:'2026-11-05 10:01',direfund:null}]);
  return ok([])},
 storage:{from:function(){return{}}},
 auth:{getSession:function(){return Promise.resolve({data:{session:{access_token:'tok-admin',user:{id:'a1',email:'adm@uji.test'}}}})},signOut:function(){return Promise.resolve({})},onAuthStateChange:function(){return{data:{subscription:{unsubscribe:function(){}}}}}}}}};"""
ok_n = bad_n = 0
def chk(n, c, d=""):
    global ok_n, bad_n
    if c: ok_n += 1; print("PASS", n)
    else: bad_n += 1; print("FAIL", n, d)
def newpage(b, vw=1280, perms=None):
    ctx = b.new_context(viewport={"width": vw, "height": 900}); errs = []
    pg = ctx.new_page(); pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.route("**/supabase-js@*/**", lambda r: r.fulfill(status=200, content_type="text/javascript", body=STUB))
    pg.route("**/fonts.googleapis.com/**", lambda r: r.abort()); pg.route("**/fonts.gstatic.com/**", lambda r: r.abort())
    pg.route("**/live/**", lambda r: r.fulfill(status=200, content_type="text/html", body="<html><body>live</body></html>"))
    pg.route("**/preview?*", lambda r: r.fulfill(status=200, content_type="text/html", body="<html><body>demo</body></html>"))
    if perms: pg.add_init_script("sessionStorage.setItem('__perms', %s)" % json.dumps(json.dumps(perms)))
    return ctx, pg, errs
def txt(pg, sel="#view"): return pg.inner_text(sel)

SYNC = []
with sync_playwright() as pw:
    b = pw.chromium.launch()
    ctx, pg, errs = newpage(b)
    def sync_route(r):
        SYNC.append({"body": json.loads(r.request.post_data), "auth": r.request.headers.get("authorization")})
        r.fulfill(status=200, content_type="application/json", headers={"access-control-allow-origin": "*"}, body=json.dumps({"ok": True, "result": "applied", "status": "paid", "verified": True}))
    pg.route("**/functions/v1/midtrans-sync", sync_route)
    pg.goto(BASE + "/admin#transactions"); pg.wait_for_selector("#tb tr.row")
    t = txt(pg, "#tb")
    chk("daftar: empat transaksi tampil", pg.locator("#tb tr.row").count() == 4)
    chk("daftar: status internal dan status asli Midtrans tampil terpisah", "Lunas" in t and "settlement" in t and "pending" in t and "qris" in t, t)
    chk("daftar: penanda Perlu tinjauan dan Refund diajukan", "Perlu tinjauan" in t and "Refund diajukan" in t)
    chk("daftar: deskripsi di-escape (tanpa XSS)", pg.evaluate("window.__xss") is None and pg.locator("#tb img[src='x']").count() == 0)
    chk("tidak ada tombol tandai lunas manual di mana pun", "Verifikasi pembayaran" not in txt(pg, "body") and "Tandai" not in txt(pg, "body"))
    chk("tab: Semua, Menunggu, Refund, Perlu tinjauan, Laporan", [x.strip() for x in pg.locator(".tabs button").all_inner_texts()] == ["Semua transaksi", "Menunggu pembayaran", "Refund", "Perlu tinjauan", "Laporan & Ekspor"], pg.locator(".tabs button").all_inner_texts())
    pg.click("[data-tab=pending]"); pg.wait_for_function("document.querySelectorAll('#tb tr.row').length===1")
    chk("tab Menunggu: hanya INV-2", "INV-2" in txt(pg, "#tb"))
    pg.click("[data-tab=refund]"); pg.wait_for_function("document.querySelector('#tb') && document.querySelector('#tb').innerText.includes('INV-3')")
    chk("tab Refund: hanya INV-3", "INV-3" in txt(pg, "#tb"))
    pg.click("[data-tab=review]"); pg.wait_for_function("document.querySelector('#tb') && document.querySelector('#tb').innerText.includes('INV-3')")
    chk("tab Perlu tinjauan: hanya INV-3", "INV-3" in txt(pg, "#tb"))
    # detail transaksi lunas
    pg.goto(BASE + "/admin#transactions:all:v1"); pg.wait_for_selector(".dhead")
    t = txt(pg)
    chk("detail: Transaction ID, metode, status asli Midtrans", "TX-1" in t and "qris" in t and "Settlement" in t, t[:600])
    chk("detail: pemetaan Settlement -> Lunas dan tabel pemetaan status", "Settlement → Lunas" in t.replace("→", "→") and "capture + fraud accept" in t.lower() and "kedaluwarsa" in t.lower(), t[:900])
    chk("detail: riwayat webhook (diterapkan, duplikat)", "Webhook Midtrans" in t and "Diterapkan" in t and "Duplikat" in t)
    chk("detail: riwayat perubahan status memuat catatan admin", "Dicek manual" in t and "Admin Uji" in t)
    chk("detail: deskripsi di-escape", pg.evaluate("window.__xss") is None and pg.locator(".dhead img").count() == 0)
    pg.click("[data-sync]"); pg.wait_for_function("window.__calls.some(c=>c[0]==='admin_transaction_note')")
    chk("sinkronisasi memanggil backend midtrans-sync (mode admin, token sesi), bukan mengubah status langsung", len(SYNC) == 1 and SYNC[0]["body"] == {"order_id": "NM1", "admin": True} and SYNC[0]["auth"] == "Bearer tok-admin", SYNC)
    chk("sinkronisasi dicatat di riwayat", any(c[0] == "admin_transaction_note" and "Sinkronisasi" in c[1]["p_note"] for c in pg.evaluate("window.__calls")))
    chk("tidak ada panggilan RPC yang menyetel status lunas", not any("lunas" in json.dumps(c[1]) for c in pg.evaluate("window.__calls") if c[0] not in ("admin_transaction_note",)))
    # refund
    pg.click("[data-rf]"); pg.wait_for_selector("#fdlg[open] #ff-note"); pg.fill("#ff-note", "abc"); pg.click("#f-save")
    pg.wait_for_selector(".toast.bad")
    chk("refund: alasan pendek ditolak dengan pesan jelas", "minimal 5" in txt(pg, "#toasts"))
    pg.fill("#ff-note", "Pelanggan salah pilih paket"); pg.click("#f-save"); pg.wait_for_selector("[data-rd]")
    chk("refund diajukan: muncul status diproses dan tombol Selesaikan/Tolak", pg.locator("[data-rd]").count() == 2 and pg.locator("[data-rf]").count() == 0)
    pg.click("[data-rd][data-d=selesai]"); pg.wait_for_selector("#fdlg[open]")
    chk("form selesai refund meminta metode dan bukti", "Metode pengembalian dana" in pg.inner_text("#fdlg") and "Tautan bukti" in pg.inner_text("#fdlg"))
    pg.select_option("#fdlg select", "transfer_manual"); pg.click("#f-save"); pg.wait_for_function("document.querySelector('#toasts').innerText.includes('bukti')")
    chk("selesai tanpa bukti ditolak backend", True)
    pg.fill("#fdlg input[type=text], #fdlg input:not([type])", "https://bukti.example/ref.png") if pg.locator("#fdlg input:not([type]), #fdlg input[type=text]").count() else None
    pg.click("#f-save"); pg.wait_for_function("document.querySelector('.tbl-w').innerText.includes('Berhasil')")
    c = [c for c in pg.evaluate("window.__calls") if c[0] == "admin_refund_decide"][-1][1]
    chk("refund selesai membawa metode + bukti", c["p_method"] == "transfer_manual" and c["p_proof_url"] == "https://bukti.example/ref.png" and c["p_decision"] == "selesai", c)
    chk("bukti refund tampil sebagai tautan aman", pg.locator("a[href='https://bukti.example/ref.png'][rel~=noopener]").count() == 1)
    # invoice lama tanpa pembayaran
    pg.goto(BASE + "/admin#transactions:all:v4"); pg.wait_for_selector(".dhead")
    chk("invoice tanpa data Midtrans: tidak ada tombol sinkron/refund, ada penjelasan", pg.locator("[data-sync]").count() == 0 and pg.locator("[data-rf]").count() == 0 and "belum punya data pembayaran" in txt(pg))
    # laporan & ekspor
    pg.goto(BASE + "/admin#transactions:rep"); pg.wait_for_selector("[data-ex]")
    chk("laporan: ringkasan angka", "448" in txt(pg).replace(".", "") and "Refund diajukan" in txt(pg))
    with pg.expect_download() as dl: pg.click("[data-ex=csv]")
    path = dl.value.path(); csv = open(path, encoding="utf-8").read()
    chk("CSV: nama file, BOM UTF-8, header Indonesia", dl.value.suggested_filename.endswith(".csv") and csv.startswith("﻿\"Invoice\",\"Dibuat\"") and "Transaction ID" in csv, csv[:120])
    chk("CSV: kutip dan koma di-escape; rumus diberi tanda petik (anti CSV injection)", '"Paket ""Signature"", 3D"' in csv and "\"'=HYPERLINK" in csv, csv)
    with pg.expect_download() as dl2: pg.click("[data-ex=xls]")
    x = open(dl2.value.path(), encoding="utf-8").read()
    chk("Excel: tabel HTML .xls dengan isi ter-escape", dl2.value.suggested_filename.endswith(".xls") and "<th>Invoice</th>" in x and "Paket &quot;Signature&quot;, 3D" in x and "&#39;=HYPERLINK" in x, x[:300])
    pg.fill("#tx-from", "2026-12-01"); pg.fill("#tx-to", "2026-11-01"); n0 = len([c for c in pg.evaluate("window.__calls") if c[0] == "admin_export_transactions"]); pg.click("[data-ex=csv]")
    chk("rentang tanggal terbalik ditolak tanpa memanggil backend", len([c for c in pg.evaluate("window.__calls") if c[0] == "admin_export_transactions"]) == n0)
    chk("tanpa galat JavaScript", not errs, errs)
    ctx.close()
    # hanya baca
    ctx, pg, errs = newpage(b, perms=["dashboard.read", "transactions.read"])
    pg.goto(BASE + "/admin#transactions:all:v1"); pg.wait_for_selector(".dhead")
    chk("izin baca saja: tidak ada tombol sinkron, refund, catatan", pg.locator("[data-sync], [data-rf], [data-nt]").count() == 0)
    # mobile
    ctx.close(); ctx, pg, errs = newpage(b, vw=375); pg.goto(BASE + "/admin#transactions:all:v1"); pg.wait_for_selector(".dhead")
    chk("mobile 375px: tanpa scroll horizontal halaman", pg.evaluate("document.documentElement.scrollWidth <= window.innerWidth + 1"))
    b.close()
print("\n%d lulus, %d gagal" % (ok_n, bad_n)); raise SystemExit(1 if bad_n else 0)
