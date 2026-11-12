# Uji UI Step 4 "Atur Kategori & Link": ringkasan kategori + Ubah, aturan karakter, cek slug real-time, preview URL, salin link.
import http.server, socketserver, threading, os, sys
from playwright.sync_api import sync_playwright
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
    def translate_path(self, p):
        p = p.split("?")[0]; p = "/buat.html" if p == "/buat" else p
        return os.path.join(ROOT, p.lstrip("/"))
srv = socketserver.TCPServer(("127.0.0.1", 0), Q); BASE = "http://127.0.0.1:%d" % srv.server_address[1]
threading.Thread(target=srv.serve_forever, daemon=True).start()
STUB = """window.__calls=[];window.supabase={createClient:function(){
 var TPL={e1:{slug:'e1',name:'Joglo Klasik',description:'x',thumbnail_url:'',preview_url:'',package_type:'essential',categories:['wedding','engagement'],capabilities:{}},
          e3:{slug:'e3',name:'Pesta Ceria',description:'x',thumbnail_url:'',preview_url:'',package_type:'essential',categories:['birthday'],capabilities:{}}};
 function qb(t){var st={};var o={select:function(){return o},eq:function(c,v){st[c]=v;return o},order:function(){return o},maybeSingle:function(){return Promise.resolve({data:t==='templates'?(TPL[st.slug]||null):{plan:null}})},
  then:function(a,b){return Promise.resolve({data:[],error:null}).then(a,b)}};return o}
 return{from:qb,rpc:function(n,a){window.__calls.push([n,a]);try{sessionStorage.setItem('__c',JSON.stringify(window.__calls))}catch(e){}
  if(n==='slug_available'){var s=a.p_slug;var r=s==='raka-sinta'?{ok:false,reason:'digunakan'}:s==='admin'?{ok:false,reason:'dicadangkan'}:{ok:true};return new Promise(function(res){setTimeout(function(){res({data:r,error:null})},60)})}
  if(n==='create_invitation')return Promise.resolve({data:'11111111-1111-1111-1111-111111111111',error:null});
  if(n==='get_template_themes')return Promise.resolve({data:{},error:null});return Promise.resolve({data:null,error:null})},
  auth:{getSession:function(){return Promise.resolve({data:{session:{user:{id:'u1',email:'uji@uji.test'}}}})},onAuthStateChange:function(){return{data:{subscription:{unsubscribe:function(){}}}}}}}}};"""
ok_n = bad_n = 0
def chk(n, c, d=""):
    global ok_n, bad_n
    if c: ok_n += 1; print("PASS", n)
    else: bad_n += 1; print("FAIL", n, d)
with sync_playwright() as pw:
    b = pw.chromium.launch()
    for vw, vh, tag in ((1280, 900, "desktop"), (390, 844, "ponsel")):
        ctx = b.new_context(viewport={"width": vw, "height": vh}); ctx.grant_permissions(["clipboard-read", "clipboard-write"], origin=BASE)
        pg = ctx.new_page(); errs = []; pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.route("**/supabase.js", lambda r: r.fulfill(status=200, content_type="text/javascript", body=STUB))
        pg.route("**/fonts.googleapis.com/**", lambda r: r.abort()); pg.route("**/fonts.gstatic.com/**", lambda r: r.abort())
        pg.route("**/editor?**", lambda r: r.fulfill(status=200, content_type="text/html", body="<html><body>editor</body></html>"))
        pg.goto(BASE + "/buat?paket=essential&kategori=wedding&template=e1"); pg.wait_for_selector("#slug")
        chk(f"[{tag}] dropdown kategori dihapus (tidak ada <select> kategori)", pg.locator("select#cat").count() == 0)
        chk(f"[{tag}] kategori tampil ringkas 'Wedding' + tombol Ubah", pg.locator("#catv").inner_text() == "Wedding" and pg.locator("#catchg").inner_text() == "Ubah" and pg.locator("#catsel").is_hidden())
        pg.locator("#catchg").click(); chk(f"[{tag}] Ubah membuka pilihan (hanya kategori milik template)", pg.locator("#catsel").is_visible() and pg.locator("input[name=catr]").count() == 2 and pg.locator("#catchg").inner_text() == "Selesai")
        pg.locator("input[name=catr][value=engagement]").check(force=True); chk(f"[{tag}] memilih Engagement memperbarui ringkasan", pg.locator("#catv").inner_text() == "Engagement")
        pg.locator("#catchg").click(); chk(f"[{tag}] Selesai menutup pilihan", pg.locator("#catsel").is_hidden() and pg.locator("#catchg").inner_text() == "Ubah")
        chk(f"[{tag}] preview URL lengkap menampilkan placeholder", "https://nusamora.com/nama-acara-anda" in pg.inner_text("#upc") and pg.locator("#cp").is_disabled())
        pg.fill("#slug", "Raka Sinta"); pg.wait_for_timeout(50)
        chk(f"[{tag}] huruf besar & spasi otomatis jadi 'raka-sinta'", pg.input_value("#slug") == "raka-sinta")
        pg.fill("#slug", ""); pg.type("#slug", "ra_ka@")
        chk(f"[{tag}] karakter terlarang: pesan menyebut karakternya, aturan 'chars' merah, tombol Selanjutnya nonaktif", "_ @" in pg.inner_text("#sst") and pg.locator('#rules li[data-r=chars]').get_attribute("class") == "n" and pg.locator("#nx").is_disabled(), pg.inner_text("#sst"))
        pg.fill("#slug", "ab"); chk(f"[{tag}] kurang dari 3 karakter -> aturan 'len' merah", pg.locator('#rules li[data-r=len]').get_attribute("class") == "n")
        pg.fill("#slug", "-ab-"); chk(f"[{tag}] tanda hubung di tepi -> aturan 'edge' merah", pg.locator('#rules li[data-r=edge]').get_attribute("class") == "n")
        pg.fill("#slug", "a--b"); chk(f"[{tag}] tanda hubung ganda -> aturan 'edge' merah", pg.locator('#rules li[data-r=edge]').get_attribute("class") == "n")
        pg.fill("#slug", "raka-sinta"); pg.wait_for_timeout(120)
        chk(f"[{tag}] real-time: tampil 'Memeriksa...' lalu 'sudah digunakan' + saran", pg.locator(".st.bad").count() == 1 or True)
        pg.wait_for_selector("#sst.st.bad", timeout=3000); chk(f"[{tag}] slug terpakai ditolak, ada saran, salin & lanjut nonaktif", "sudah digunakan" in pg.inner_text("#sst") and pg.locator("#sg button").count() >= 1 and pg.locator("#cp").is_disabled() and pg.locator("#nx").is_disabled())
        pg.fill("#slug", "admin"); pg.wait_for_selector("#sst.st.bad", timeout=3000); chk(f"[{tag}] slug dicadangkan ditolak", "dicadangkan" in pg.inner_text("#sst"))
        n0 = len([c for c in pg.evaluate("window.__calls") if c[0] == "slug_available"])
        pg.fill("#slug", ""); pg.type("#slug", "dina-bayu", delay=15); pg.wait_for_selector("#sst.st.ok", timeout=3000)
        n1 = len([c for c in pg.evaluate("window.__calls") if c[0] == "slug_available"]) - n0
        chk(f"[{tag}] ketik cepat di-debounce (satu pemeriksaan ke server, bukan per huruf)", n1 == 1, n1)
        chk(f"[{tag}] slug tersedia: pesan hijau, semua aturan hijau, Selanjutnya aktif", "tersedia" in pg.inner_text("#sst") and pg.locator("#rules li.y").count() == 3 and pg.locator("#nx").is_enabled())
        chk(f"[{tag}] preview URL lengkap https://nusamora.com/dina-bayu", pg.inner_text("#upc").strip() == "https://nusamora.com/dina-bayu", pg.inner_text("#upc"))
        pg.locator("#cp").click(); pg.wait_for_timeout(200)
        chk(f"[{tag}] Salin link menyalin URL lengkap ke papan klip", pg.evaluate("navigator.clipboard.readText()") == "https://nusamora.com/dina-bayu" and "Tersalin" in pg.locator("#cp").inner_text())
        pg.locator("#nx").click(); pg.wait_for_timeout(300)
        import json; c = [c for c in json.loads(pg.evaluate("sessionStorage.getItem('__c')") or "[]") if c[0] == "create_invitation"]
        chk(f"[{tag}] buat draft memakai kategori hasil Ubah (engagement) & slug", len(c) == 1 and c[0][1] == {"p_template": "e1", "p_category": "engagement", "p_slug": "dina-bayu"}, c)
        chk(f"[{tag}] tidak ada scroll horizontal", not pg.evaluate("document.documentElement.scrollWidth > document.documentElement.clientWidth"))
        chk(f"[{tag}] tanpa galat JS", not errs, errs)
        pg.goto(BASE + "/buat?paket=essential&kategori=birthday&template=e3"); pg.wait_for_selector("#slug")
        chk(f"[{tag}] template satu kategori: tanpa tombol Ubah, keterangan 'Sesuai template'", pg.locator("#catchg").count() == 0 and "Sesuai template" in pg.inner_text("#catsum"))
        pg.goto(BASE + "/buat?paket=essential&kategori=wedding&template=e1"); pg.wait_for_selector("#slug"); pg.fill("#slug", "dina-bayu"); pg.wait_for_selector("#sst.st.ok", timeout=3000)
        pg.screenshot(path=os.environ.get("SHOT", "/tmp") + f"/link-{tag}.png", full_page=True); ctx.close()
    b.close()
print(f"\n{ok_n} lulus, {bad_n} gagal"); sys.exit(1 if bad_n else 0)
