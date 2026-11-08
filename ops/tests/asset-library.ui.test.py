# Uji UI admin: Asset Library: status Nonaktif, aksi massal, detail (lisensi, versi, riwayat penggunaan, aset serupa), tab Duplikat, izin baca saja.
# Backend ditiru di browser (window.supabase stub) hanya untuk menguji antarmuka; logika data diuji di ops/tests/admin-customers.test.sql.
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
STUB = r"""window.__calls=[];window.__inv=[];window.__up=[];
var PERMS=JSON.parse(sessionStorage.getItem('__perms')||'null')||['dashboard.read','templates.read','templates.write'];
var NOW=Date.now(),D=864e5,iso=function(n){return new Date(NOW+n*D).toISOString()};
var CATS=[{id:'c1',package_type:'essential',slug:'ornament',name:'Ornament',kind:'image',allowed_ext:['png','webp','svg'],max_bytes:10485760,active:true,sort:40},{id:'c2',package_type:'signature',slug:'background-music',name:'Background music',kind:'audio',allowed_ext:['mp3','ogg','wav'],max_bytes:20971520,active:true,sort:80}];
function A(id,name,o){return Object.assign({id:id,name:name,description:null,category_id:'c1',package_types:['essential'],theme_key:null,file_path:'incoming/'+id+'.png',file_url:'https://cdn.test/incoming/'+id+'.png',thumbnail_url:null,file_type:'png',mime:'image/png',file_size:150000,width:100,height:100,tags:['emas'],is_transparent:true,checksum:null,status:'active',deleted_at:null,attrs:{},license:'belum_diatur',source:'upload',credit:null,source_url:null,license_note:null,license_expires:null,current_version:1,created_at:iso(-5),updated_at:iso(-5)},o||{})}
var ASSETS=[A('a1','Ornamen Emas <img src=x onerror=window.__xss=1>',{license:'cc_by',source:'stok',credit:'Freepik',current_version:2}),A('a2','Ornamen Perak',{status:'inactive'}),A('a3','Bunga'),A('a4','Musik Latar',{category_id:'c2',package_types:['signature'],file_type:'mp3',mime:'audio/mpeg',file_path:'incoming/a4.mp3',file_url:'https://cdn.test/incoming/a4.mp3',width:null,height:null})];
var BULK=null;
function ok(d){return Promise.resolve({data:d===undefined?null:d,error:null})}
function qb(t){var f={},o={};['select','order','range','or','in','gte','lte','lt','gt','neq','ilike','contains','not','is','limit'].forEach(function(m){o[m]=function(c,v){if(m==='select'&&arguments[1]&&arguments[1].count)o.__cnt=1;return o}});
 o.eq=function(k,v){f[k]=v;return o};o.maybeSingle=function(){o.__one=1;return o};
 o.then=function(a,b){var rows=t==='asset_categories'?CATS:t==='themes'?[{id:'th1',slug:'batak',name:'Batak',status:'published'}]:t==='assets'?ASSETS.filter(function(x){return Object.keys(f).every(function(k){return String(x[k])===String(f[k])})}):[];
  var r=o.__one?{data:rows[0]||null,error:null}:{data:rows,error:null,count:rows.length};return Promise.resolve(r).then(a,b)};return o}
window.supabase={createClient:function(){return{
 from:qb,
 rpc:function(n,a){window.__calls.push([n,a]);
  if(n==='my_admin')return ok({role:'content',perms:PERMS,mfa:{needed:false}});
  if(n==='admin_assets_usage')return ok([{asset_id:'a1',uses:2}]);
  if(n==='admin_asset_detail'){var x=ASSETS.filter(function(z){return z.id===a.p_id})[0];return ok({asset:x,category:{name:'Ornament',package_type:'essential'},created_by_name:'Admin Uji',
   placements:a.p_id==='a1'?[{template_id:'t1',template:'Template Terbit',package_type:'essential',template_status:'published',slot:'ornamen',section:'opening',theme:null}]:[],
   usage_log:a.p_id==='a1'?[{at:iso(-1),action:'dipasang',template:'Template Terbit',slot:'ornamen',by:'Admin Uji'},{at:iso(-3),action:'dilepas',template:'Template Lama',slot:'hias',by:null}]:[],
   versions:[{version:x.current_version,file_url:x.file_url,file_type:'png',file_size:150000,width:100,height:100,note:'Warna lebih terang',at:iso(-1),current:true,by:'Admin Uji'}].concat(x.current_version>1?[{version:1,file_url:'https://cdn.test/old.png',file_type:'png',file_size:140000,width:100,height:100,note:'Versi awal',at:iso(-5),current:false,by:null}]:[]),
   similar:a.p_id==='a1'?[{id:'a2',name:'Ornamen Perak',status:'inactive',deleted:false,reason:'ukuran_sama'}]:[]})}
  if(n==='admin_assets_bulk'){window.__bulk=(window.__bulk||[]);window.__bulk.push(a);if(BULK)return ok(BULK(a));return ok({ok:true,done:a.p_ids.length,failed:[]})}
  if(n==='admin_update_asset')return ok({ok:true,asset:{}});
  if(n==='admin_asset_set_meta'){if(a.p_patch.license==='cc_by'&&!a.p_patch.credit&&!a.p_patch.source_url)return ok({ok:false,error:'bukti_lisensi_kosong'});return ok({ok:true,asset:{}})}
  if(n==='admin_asset_restore_version')return ok({ok:true,asset:{}});
  if(n==='admin_asset_duplicates')return ok([{reason:'ukuran_sama',label:'Format, dimensi, dan ukuran sama',assets:[{id:'a1',name:'Ornamen Emas',status:'active',deleted:false,file_url:'https://cdn.test/a1.png',thumbnail_url:null,file_type:'png',file_size:150000,width:100,height:100,uses:2},{id:'a2',name:'Ornamen Perak',status:'inactive',deleted:false,file_url:'https://cdn.test/a2.png',thumbnail_url:null,file_type:'png',file_size:150000,width:100,height:100,uses:0}]},{reason:'nama_sama',label:'Nama sama',assets:[{id:'a3',name:'Bunga',status:'active',deleted:false,file_url:'x',thumbnail_url:null,file_type:'png',file_size:1,width:1,height:1,uses:0},{id:'a3',name:'bunga ',status:'archived',deleted:true,file_url:'x',thumbnail_url:null,file_type:'png',file_size:1,width:1,height:1,uses:0}]}]);
  return ok([])},
 functions:{invoke:function(n,o){window.__inv.push([n,o.body]);return Promise.resolve({data:{ok:true,asset:{id:'a1'},version:3,dimensi_berubah:false},error:null})}},
 storage:{from:function(b){return{upload:function(p,f,o){window.__up.push([b,p,f.name]);return ok({path:p})}}}},
 auth:{getSession:function(){return Promise.resolve({data:{session:{access_token:'tok',user:{id:'u1',email:'adm@uji.test'}}}})},signOut:function(){return Promise.resolve({})},onAuthStateChange:function(){return{data:{subscription:{unsubscribe:function(){}}}}}}}}};"""
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

SYNC = []

PNG = bytes.fromhex("89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c6360000002000001e221bc330000000049454e44ae426082")

PNG = bytes.fromhex("89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c6360000002000001e221bc330000000049454e44ae426082")
def calls(pg, n): return [c[1] for c in pg.evaluate("window.__calls") if c[0] == n]
with sync_playwright() as pw:
    b = pw.chromium.launch()
    ctx, pg, errs = newpage(b); pg.goto(BASE + "/admin#assetlib:lib"); pg.wait_for_selector(".al-card", timeout=15000)
    t = txt(pg)
    chk("tab: Library, Duplikat, AI Generator, Kategori Aset", [x.strip() for x in pg.locator(".tabs button").all_inner_texts()] == ["Library", "Duplikat", "AI Generator", "Kategori Aset"], pg.locator(".tabs button").all_inner_texts())
    chk("library: tampilan awal hanya aset aktif", pg.locator(".al-card").count() == 3)
    chk("filter status punya Aktif, Nonaktif, Arsip, Terhapus", pg.evaluate("[...document.querySelectorAll('#l-st option')].map(o=>o.textContent)") == ["Aktif", "Nonaktif", "Arsip", "Terhapus"])
    chk("nama aset di-escape (tanpa XSS)", pg.evaluate("window.__xss") is None and pg.locator(".al-card img[src='x']").count() == 0)
    chk("tanpa pilihan: bar aksi massal tersembunyi", pg.locator("#l-bulk").is_hidden())
    pg.check("[data-sel=a1]"); pg.check("[data-sel=a3]")
    chk("pilih 2 aset: bar aksi massal tampil", "2 aset dipilih" in txt(pg, "#l-bulk") and pg.locator("#l-bulk").is_visible())
    pg.select_option("#b-act", "status"); pg.select_option("#b-v", "inactive"); pg.click("#b-go"); pg.wait_for_function("window.__bulk && window.__bulk.length===1")
    c = pg.evaluate("window.__bulk[0]")
    chk("ubah status massal: RPC membawa id, aksi, nilai, tanpa force", sorted(c["p_ids"]) == ["a1", "a3"] and c["p_action"] == "status" and c["p_value"] == {"status": "inactive"} and c["p_force"] is False, c)
    chk("setelah sukses: pilihan dibersihkan", pg.locator("#l-bulk").is_hidden())
    # tag massal
    pg.check("[data-sel=a4]"); pg.select_option("#b-act", "add_tags"); pg.fill("#b-v", "floral, emas"); pg.click("#b-go"); pg.wait_for_function("window.__bulk.length===2")
    c = pg.evaluate("window.__bulk[1]"); chk("tambah tag massal: daftar tag terkirim", c["p_action"] == "add_tags" and c["p_value"]["tags"] == ["floral", "emas"], c)
    # arsip yang terblokir -> konfirmasi paksa
    pg.evaluate("BULK=function(a){return a.p_force?{ok:true,done:1,failed:[]}:{ok:true,done:0,failed:[{id:'a1',name:'Ornamen Emas',error:'dipakai_template_terbit'}]}};0")
    pg.check("[data-sel=a1]"); pg.select_option("#b-act", "status"); pg.select_option("#b-v", "archived"); pg.click("#b-go")
    pg.wait_for_selector("#cdlg[open]"); chk("arsip aset terpasang di template terbit: diminta konfirmasi, bukan langsung berhasil", "dipakai di template" in pg.inner_text("#cdlg") and len(pg.evaluate("window.__bulk")) == 3)
    pg.click("#cdlg-y"); pg.wait_for_function("window.__bulk.length===4")
    c = pg.evaluate("window.__bulk[3]"); chk("setelah dikonfirmasi: diulang dengan force hanya untuk aset yang terblokir", c["p_force"] is True and c["p_ids"] == ["a1"], c)
    # gagal sebagian
    pg.evaluate("BULK=function(a){return {ok:true,done:1,failed:[{id:'a2',name:'Ornamen Perak',error:'paket_tidak_kompatibel'}]}};0")
    pg.check("[data-sel=a1]"); pg.check("[data-sel=a4]"); pg.select_option("#b-act", "add_tags"); pg.fill("#b-v", "x"); pg.click("#b-go"); pg.wait_for_selector("#b-res b")
    chk("gagal sebagian: nama aset dan alasan ditampilkan", "Ornamen Perak" in txt(pg, "#b-res") and "tidak kompatibel" in txt(pg, "#b-res"), txt(pg, "#b-res"))
    pg.evaluate("BULK=null"); pg.click("#b-clear")
    # detail
    pg.click(".al-card[data-i='0']"); pg.wait_for_selector("#adlg[open] .al-ver"); pg.wait_for_selector("#adlg .al-log")
    t = pg.inner_text("#adlg")
    chk("detail: lisensi & sumber terisi dari data", pg.input_value("#a-lic") == "cc_by" and pg.input_value("#a-src") == "stok" and pg.input_value("#a-credit") == "Freepik")
    chk("detail: dipakai di template, riwayat pasang/lepas", "Template Terbit" in t and "Dipasang" in t and "Dilepas" in t and "Template Lama" in t, t[:900])
    chk("detail: riwayat versi (v2 aktif, v1 bisa dipulihkan)", "v2" in t and "Warna lebih terang" in t and pg.locator("#adlg [data-rv='1']").count() == 1 and pg.locator("#adlg [data-rv='2']").count() == 0)
    chk("detail: aset serupa ditampilkan dengan alasannya", "Ornamen Perak" in t and "ukuran sama" in t.lower())
    chk("detail: opsi status Nonaktif tersedia", "Nonaktif" in pg.inner_text("#a-st"))
    pg.select_option("#a-lic", "cc_by"); pg.fill("#a-credit", ""); pg.fill("#a-surl", ""); pg.click("#a-save"); pg.wait_for_selector("#a-e:not(:empty)")
    chk("CC BY tanpa kredit: pesan jelas dan dialog tetap terbuka", "wajib disertai kredit" in pg.inner_text("#a-e") and pg.locator("#adlg[open]").count() == 1, pg.inner_text("#a-e"))
    pg.fill("#a-credit", "Freepik - Seniman"); pg.fill("#a-surl", "https://freepik.test/x"); pg.click("#a-save"); pg.wait_for_function("window.__calls.filter(c=>c[0]==='admin_asset_set_meta').length>=2")
    m = calls(pg, "admin_asset_set_meta")[-1]
    chk("simpan: lisensi, sumber, kredit, tautan dikirim ke admin_asset_set_meta", m["p_id"] == "a1" and m["p_patch"]["license"] == "cc_by" and m["p_patch"]["credit"] == "Freepik - Seniman" and m["p_patch"]["source_url"] == "https://freepik.test/x", m)
    # versi baru
    pg.click(".al-card[data-i='0']"); pg.wait_for_selector("#adlg[open] #v-pick")
    pg.set_input_files("#v-file", [{"name": "baru.webp", "mimeType": "image/webp", "buffer": PNG}])
    chk("versi baru berformat beda ditolak sebelum diunggah", "berformat .png" in pg.inner_text("#v-msg") and not pg.evaluate("window.__up"), pg.inner_text("#v-msg"))
    pg.fill("#v-note", "Perbaiki warna"); pg.set_input_files("#v-file", [{"name": "baru.png", "mimeType": "image/png", "buffer": PNG}]); pg.wait_for_function("window.__inv.length===1")
    inv = pg.evaluate("window.__inv[0]"); up = pg.evaluate("window.__up[0]")
    chk("versi baru: unggah ke storage lalu asset-register dengan replace_asset dan catatan", up[1].startswith("incoming/u1/") and up[1].endswith(".png") and inv[0] == "asset-register" and inv[1]["replace_asset"] == "a1" and inv[1]["note"] == "Perbaiki warna" and inv[1]["path"] == up[1], (up, inv))
    pg.wait_for_selector("#adlg[open] .al-ver")
    pg.click("#adlg [data-rv='1']"); pg.wait_for_selector("#cdlg[open]"); pg.click("#cdlg-y"); pg.wait_for_function("window.__calls.some(c=>c[0]==='admin_asset_restore_version')")
    chk("pulihkan versi lama lewat konfirmasi", calls(pg, "admin_asset_restore_version")[-1] == {"p_id": "a1", "p_version": 1})
    pg.keyboard.press("Escape")
    # duplikat
    pg.goto(BASE + "/admin#assetlib:dup"); pg.wait_for_selector(".al-dup", timeout=10000); t = txt(pg)
    chk("tab Duplikat: kelompok dengan alasan, jumlah, status, pemakaian", pg.locator(".al-dup").count() == 2 and "Format, dimensi, dan ukuran sama" in t and "Nama sama" in t and "Terhapus" in t and "dipakai 2x" in t, t[:500])
    chk("tanpa galat JavaScript", not errs, errs); ctx.close()
    # baca saja
    ctx, pg, errs = newpage(b, perms=["dashboard.read", "templates.read"]); pg.goto(BASE + "/admin#assetlib:lib"); pg.wait_for_selector(".al-card")
    chk("izin baca saja: tanpa kotak pilih, tanpa tombol unggah", pg.locator(".al-sel").count() == 0 and pg.locator("#l-up").count() == 0)
    pg.click(".al-card[data-i='0']"); pg.wait_for_selector("#adlg[open] .al-ver")
    chk("izin baca saja: tanpa unggah versi dan tanpa pulihkan, lisensi terkunci", pg.locator("#v-pick, [data-rv]").count() == 0 and pg.locator("#a-lic:disabled").count() == 1)
    ctx.close(); ctx, pg, errs = newpage(b, vw=375); pg.goto(BASE + "/admin#assetlib:lib"); pg.wait_for_selector(".al-card"); pg.check("[data-sel=a1]")
    chk("mobile 375px: tanpa scroll horizontal", pg.evaluate("document.documentElement.scrollWidth <= window.innerWidth + 1"))
    b.close()
print("\n%d lulus, %d gagal" % (ok_n, bad_n)); raise SystemExit(1 if bad_n else 0)
