# Uji UI Step 5 "Isi Undangan": accordion + kelengkapan, preview langsung, field Luxe, validasi, simpan otomatis & cadangan lokal.
import http.server, socketserver, threading, os, sys, json
from playwright.sync_api import sync_playwright
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
    def translate_path(self, p):
        p = p.split("?")[0]; p = "/editor.html" if p == "/editor" else p
        return os.path.join(ROOT, p.lstrip("/"))
srv = socketserver.TCPServer(("127.0.0.1", 0), Q); BASE = "http://127.0.0.1:%d" % srv.server_address[1]
threading.Thread(target=srv.serve_forever, daemon=True).start()
STUB = """window.__calls=[];window.__fail=(sessionStorage.getItem('__fail')==='1');
var TPL={lx:{slug:'lx',name:'Taman Live',description:'x',thumbnail_url:'',preview_url:'/live/',package_type:'luxe',categories:['wedding'],capabilities:{scenes:[{id:'day',name:'Taman Siang'},{id:'night',name:'Taman Malam'}],areas:[{id:'resepsi',name:'Area Resepsi'},{id:'photobooth',name:'Photo Booth'}],decorations:[{id:'bunga',name:'Bunga'},{id:'lampu',name:'Lampu'}],avatars:[{id:'l1',name:'Pria Batik'},{id:'l2',name:'Pria Jas'},{id:'p1',name:'Wanita Kebaya'}]}},
 es:{slug:'es',name:'Joglo Klasik',description:'x',thumbnail_url:'',preview_url:'',package_type:'essential',categories:['wedding'],capabilities:{palettes:[{id:'lavender',name:'Lavender'},{id:'rose',name:'Rose'}]}}};
var AV=[{slot:'l1',side:'groom',name:'Pria Batik',type:'x',url:''},{slot:'l2',side:'groom',name:'Pria Jas',type:'x',url:''},{slot:'p1',side:'bride',name:'Wanita Kebaya',type:'x',url:''}];
var INV={luxe:{id:'aaaa1111-1111-1111-1111-111111111111',title:'Undangan Wedding',category:'wedding',template_id:'lx',package_type:'luxe',slug:'uji-lx',status:'draft',event_date:null,content:{},updated_at:'2020-01-01T00:00:00Z',moderation:null,public_url:null,expires_at:null,theme_key:null},
 essential:{id:'bbbb2222-2222-2222-2222-222222222222',title:'Undangan Wedding',category:'wedding',template_id:'es',package_type:'essential',slug:'uji-es',status:'draft',event_date:null,content:{},updated_at:'2020-01-01T00:00:00Z',moderation:null,public_url:null,expires_at:null,theme_key:null}};
var PLANS=[{id:'essential',name:'Essential',price:79000,duration_days:90,gallery_limit:10,allow_3d:false,allow_live_guest:false,features:[]},{id:'luxe',name:'Luxe',price:249000,duration_days:365,gallery_limit:40,allow_3d:true,allow_live_guest:true,features:[]}];
function qb(t){var st={};var o={select:function(){return o},eq:function(c,v){st[c]=v;return o},order:function(){return o},maybeSingle:function(){var d=null;if(t==='invitations')d=(st.id===INV.luxe.id?INV.luxe:st.id===INV.essential.id?INV.essential:null);if(t==='templates')d=TPL[st.slug]||null;return Promise.resolve({data:d,error:null})},
 then:function(a,b){return Promise.resolve({data:t==='plans'?PLANS:[],error:null}).then(a,b)}};return o}
window.supabase={createClient:function(){return{from:qb,
 rpc:function(n,a){window.__calls.push([n,a]);
  if(n==='template_avatar_options')return Promise.resolve({data:AV,error:null});
  if(n==='save_invitation'){if(window.__fail)return Promise.resolve({data:null,error:{message:'network'}});return Promise.resolve({data:'2026-01-01T00:00:00Z',error:null})}
  return Promise.resolve({data:null,error:null})},
 storage:{from:function(){return{upload:function(){return Promise.resolve({error:null})},getPublicUrl:function(){return{data:{publicUrl:'x'}}},remove:function(){return Promise.resolve({})}}}},
 auth:{getSession:function(){return Promise.resolve({data:{session:{user:{id:'u1',email:'uji@uji.test'}}}})},onAuthStateChange:function(){return{data:{subscription:{unsubscribe:function(){}}}}}}}}};"""
ok_n = bad_n = 0
def chk(n, c, d=""):
    global ok_n, bad_n
    if c: ok_n += 1; print("PASS", n)
    else: bad_n += 1; print("FAIL", n, d)
LX = "aaaa1111-1111-1111-1111-111111111111"; ES = "bbbb2222-2222-2222-2222-222222222222"
def saves(pg): return [c for c in pg.evaluate("window.__calls") if c[0] == "save_invitation"]
def opened(pg): return pg.evaluate("[...document.querySelectorAll('.acb')].filter(b=>!b.hidden).map(b=>b.id)")
def newpage(ctx, errs):
    pg = ctx.new_page(); pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.route("**/supabase.js", lambda r: r.fulfill(status=200, content_type="text/javascript", body=STUB))
    pg.route("**/fonts.googleapis.com/**", lambda r: r.abort()); pg.route("**/fonts.gstatic.com/**", lambda r: r.abort())
    pg.route("**/preview?**", lambda r: r.fulfill(status=200, content_type="text/html", body="<html><body>preview</body></html>"))
    return pg
with sync_playwright() as pw:
    b = pw.chromium.launch()
    for vw, vh, tag in ((1280, 900, "desktop"), (390, 844, "ponsel")):
        ctx = b.new_context(viewport={"width": vw, "height": vh}); errs = []
        pg = newpage(ctx, errs)
        pg.goto(BASE + "/editor?id=" + LX); pg.wait_for_selector(".acb")
        t = pg.evaluate("[...document.querySelectorAll('.sec .att')].map(e=>e.textContent)")
        chk(f"[{tag}] Luxe: bagian sesuai tabel (Informasi Acara, Mempelai, Waktu & Lokasi, Galeri, Virtual Venue, Avatar & Karakter, Interaksi, Musik)", t == ["Informasi Acara", "Mempelai", "Waktu & Lokasi", "Galeri", "Virtual Venue", "Avatar & Karakter", "Interaksi", "Musik"], t)
        chk(f"[{tag}] hanya satu bagian terbuka: yang pertama belum lengkap", opened(pg) == ["b-info"], opened(pg))
        if vw <= 860:
            chk(f"[{tag}] ponsel: tombol Preview mengambang membuka panel preview", pg.locator("#lp-o").is_visible() and not pg.locator("#lpc").is_visible())
            pg.locator("#lp-o").click(); chk(f"[{tag}] ponsel: panel preview terbuka & bisa ditutup", pg.locator("#lpc").is_visible() and pg.locator("#lp-x").is_visible()); pg.locator("#lp-x").click(); chk(f"[{tag}] ponsel: panel tertutup lagi", not pg.locator("#lpc").is_visible())
        else:
            chk(f"[{tag}] desktop: preview selalu terlihat di samping form", pg.locator("#lpc").is_visible() and not pg.locator("#lp-o").is_visible())
        pg.locator('[data-ac=waktu]').click(); chk(f"[{tag}] klik judul membuka bagian lain & menutup yang pertama", opened(pg) == ["b-waktu"] and pg.get_attribute('[data-ac=waktu]', "aria-expanded") == "true")
        pg.locator('[data-ac=waktu]').click(); chk(f"[{tag}] klik lagi menutup bagian", opened(pg) == [])
        chk(f"[{tag}] indikator Waktu & Lokasi awalnya '0 dari 3'", pg.inner_text("#s-waktu .ast") == "0 dari 3", pg.inner_text("#s-waktu .ast"))
        chk(f"[{tag}] bagian tanpa wajib diberi label Opsional (Musik)", pg.inner_text("#s-musik .ast") == "Opsional")
        pg.locator('[data-ac=waktu]').click()
        pg.fill("#e-date", "2027-01-10"); chk(f"[{tag}] mengisi 1 dari 3 -> '1 dari 3' & status sebagian", pg.inner_text("#s-waktu .ast") == "1 dari 3" and pg.get_attribute("#s-waktu", "data-st") == "part")
        pg.fill("#e-event\\.start", "10:00"); pg.fill("#e-event\\.venue", "Taman Asri")
        chk(f"[{tag}] semua terisi -> 'Lengkap' di judul", pg.inner_text("#s-waktu .ast") == "Lengkap" and pg.get_attribute("#s-waktu", "data-st") == "ok")
        if vw > 860: chk(f"[{tag}] navigasi samping ikut 'Lengkap'", pg.inner_text('.ed nav a[data-nv=waktu] small') == "Lengkap")
        pg.wait_for_timeout(400); chk(f"[{tag}] preview isian kosong memakai contoh seperti halaman demo (sapaan contoh)", "selamat datang di hari bahagia kami" in pg.inner_text("#lpi").lower(), pg.inner_text("#lpi")[:200])
        chk(f"[{tag}] preview memakai bingkai stage seperti demo", pg.locator("#lpi.stage").count() == 1)
        # preview langsung
        pg.locator('[data-ac=info]').click(); pg.fill("#e-names\\.a", "Sinta"); pg.fill("#e-names\\.b", "Raka"); pg.wait_for_timeout(500)
        chk(f"[{tag}] preview langsung: nama baru tampil tanpa pindah halaman", "Sinta" in pg.inner_text("#lpi") and pg.url.endswith(LX), pg.inner_text("#lpi")[:120])
        pg.locator('[data-ac=venue]').click(); pg.locator("#s-venue .seg label", has_text="Taman Malam").click(); pg.wait_for_timeout(500)
        chk(f"[{tag}] preview Luxe: ganti scene langsung terlihat", "taman malam" in pg.inner_text("#lpi").lower())
        chk(f"[{tag}] isian pengguna menimpa contoh (lokasi 'Taman Asri')", "Taman Asri" in pg.evaluate("document.querySelector('#lpi').textContent") and "Gedung Serbaguna Kenanga" not in pg.evaluate("document.querySelector('#lpi').textContent"))
        # avatar & karakter
        pg.locator('[data-ac=avatar]').click()
        chk(f"[{tag}] avatar dikelompokkan pria & wanita", pg.locator("#s-avatar label", has_text="Avatar pria").count() >= 1 and pg.locator("#s-avatar label", has_text="Avatar wanita").count() >= 1)
        pg.locator("#s-avatar .avc", has_text="Wanita Kebaya").hover(); chk(f"[{tag}] pratinjau avatar sebelum dipilih (hover)", "Wanita Kebaya" in pg.inner_text("#avpi") and "wanita" in pg.inner_text("#avpi").lower())
        chk(f"[{tag}] penghitung avatar tamu", "3 dari 3" in pg.inner_text("#avcnt"), pg.inner_text("#avcnt"))
        pg.select_option("#e-live\\.avatarLimit", "2"); pg.fill("#e-live\\.greeting", "Halo tamu!")
        chk(f"[{tag}] ada pengaturan jumlah pilihan avatar & pesan sambutan", pg.locator("#e-live\\.avatarLimit option").count() == 3 and pg.input_value("#e-live\\.greeting") == "Halo tamu!")
        pg.locator('[data-ac=interaktif]').click()
        chk(f"[{tag}] Interaksi lengkap: RSVP+jumlah tamu, buku ucapan, live chat, photo booth, galeri, video, mini games, hadiah", all(pg.locator("#s-interaktif", has_text=x).count() for x in ["RSVP dan jumlah tamu", "Buku ucapan", "Live chat", "Photo booth", "Galeri foto", "Video ucapan", "Mini games", "Hadiah digital"]))
        chk(f"[{tag}] field rekening tersembunyi saat hadiah mati", not pg.locator("#giftf").is_visible())
        pg.locator('input[data-p="features.gift"]').check(force=True); chk(f"[{tag}] field rekening muncul saat hadiah diaktifkan", pg.locator("#giftf").is_visible())
        chk(f"[{tag}] status Interaksi 0 dari 3 saat hadiah aktif & kosong", pg.inner_text("#s-interaktif .ast") == "0 dari 3", pg.inner_text("#s-interaktif .ast"))
        pg.locator("#e-gift\\.number").fill("abc"); pg.locator("#e-gift\\.holder").focus(); chk(f"[{tag}] nomor rekening non-angka ditolak inline", pg.locator("#fe-gift\\.number").count() == 1 and pg.get_attribute("#e-gift\\.number", "aria-invalid") == "true")
        pg.locator('input[data-p="features.gift"]').uncheck(force=True); chk(f"[{tag}] field rekening hilang lagi saat dimatikan", not pg.locator("#giftf").is_visible())
        pg.locator('input[data-p="features.rsvp"]').uncheck(force=True); chk(f"[{tag}] pilihan jumlah tamu hanya muncul saat RSVP aktif", not pg.locator("#rsvpf").is_visible())
        pg.locator('input[data-p="features.rsvp"]').check(force=True); pg.select_option("#e-live\\.rsvpMax", "5")
        pg.locator('input[data-p="features.video"]').check(force=True); pg.locator('input[data-p="features.games"]').check(force=True)
        # simpan otomatis
        n0 = len(saves(pg)); pg.wait_for_timeout(2000); sv = saves(pg)
        chk(f"[{tag}] simpan otomatis berjalan & indikator 'Tersimpan'", len(sv) > n0 - 0 and len(sv) >= 1 and "Tersimpan" in pg.inner_text("#svt"), pg.inner_text("#svt"))
        c = sv[-1][1]["p_content"]
        chk(f"[{tag}] isi tersimpan: fitur Luxe baru + batas avatar + sambutan + jumlah tamu", c["features"]["video"] is True and c["features"]["games"] is True and c["features"]["livechat"] is True and c["live"]["avatarLimit"] == 2 and c["live"]["rsvpMax"] == 5 and c["live"]["greeting"] == "Halo tamu!" and sv[-1][1]["p_event_date"] == "2027-01-10", json.dumps(c)[:300])
        chk(f"[{tag}] cadangan lokal dibersihkan setelah berhasil tersimpan", pg.evaluate("localStorage.getItem('nm:draft:%s')" % LX) is None)
        # validasi
        pg.locator('[data-ac=info]').click(); pg.fill("#e-names\\.a", ""); pg.locator("#e-names\\.b").focus()
        chk(f"[{tag}] field wajib kosong -> pesan galat inline", "wajib" in pg.inner_text("#fe-names\\.a"))
        pg.fill("#e-names\\.a", "Sinta"); chk(f"[{tag}] galat hilang saat diperbaiki", pg.locator("#fe-names\\.a").count() == 0)
        pg.locator('[data-ac=waktu]').click(); pg.fill("#e-event\\.maps", "maps.com/x"); pg.locator("#e-event\\.venue").focus(); chk(f"[{tag}] tautan peta tanpa https ditolak", pg.locator("#fe-event\\.maps").count() == 1)
        pg.fill("#e-event\\.maps", "https://maps.google.com/x"); pg.fill("#e-date", ""); pg.locator("#pv-b").click()
        chk(f"[{tag}] Preview diblokir bila wajib kosong & ringkasan tampil", pg.locator("#vsum").is_visible() and "Tanggal" in pg.inner_text("#vsum") and "/preview" not in pg.url)
        pg.locator("#vgo").click(); pg.wait_for_url("**/preview?**", timeout=4000); chk(f"[{tag}] 'Tetap lihat preview' tetap bisa", "/preview" in pg.url)
        chk(f"[{tag}] tanpa scroll horizontal", not pg.evaluate("document.documentElement.scrollWidth > document.documentElement.clientWidth"))
        chk(f"[{tag}] tanpa galat JS", not errs, errs); ctx.close()
    # gagal simpan -> cadangan lokal -> pulih, konfirmasi keluar
    ctx = b.new_context(viewport={"width": 1280, "height": 900}); errs = []; pg = newpage(ctx, errs)
    pg.goto(BASE + "/editor?id=" + ES); pg.wait_for_selector(".acb"); pg.evaluate("sessionStorage.setItem('__fail','1')"); pg.reload(); pg.wait_for_selector(".acb")
    pg.fill("#e-names\\.a", "Dina"); pg.wait_for_timeout(1500)
    chk("Essential: preview langsung memuat nama", "Dina" in pg.inner_text("#lpi"))
    chk("gagal menyimpan -> indikator galat jelas", "Gagal" in pg.inner_text("#svt"), pg.inner_text("#svt"))
    bk = pg.evaluate("localStorage.getItem('nm:draft:%s')" % ES); chk("perubahan belum tersimpan dicadangkan di perangkat", bk is not None and "Dina" in bk)
    chk("konfirmasi keluar halaman saat ada perubahan belum tersimpan", pg.evaluate("(()=>{const e=new Event('beforeunload',{cancelable:true});window.dispatchEvent(e);return e.defaultPrevented})()"))
    pg.evaluate("sessionStorage.setItem('__fail','0')"); pg.evaluate("window.onbeforeunload=null")
    pg2 = newpage(ctx, errs); pg2.add_init_script("sessionStorage.setItem('__fail','0')"); pg2.goto(BASE + "/editor?id=" + ES); pg2.wait_for_selector(".acb")
    chk("buka ulang (browser ditutup lalu dibuka): draft dipulihkan", pg2.input_value("#e-names\\.a") == "Dina")
    pg2.wait_for_timeout(2200); chk("draft pulihan langsung disimpan ke server & cadangan dibersihkan", len(saves(pg2)) >= 1 and pg2.evaluate("localStorage.getItem('nm:draft:%s')" % ES) is None)
    chk("batas file jelas di antarmuka (15 MB, PNG/JPG/WebP)", "15 MB" in pg2.inner_text("#s-foto .sub") and "PNG" in pg2.inner_text("#s-foto .sub"))
    pg2.locator('[data-ac=foto]').click()
    pg2.set_input_files("#up-c", files=[{"name": "a.gif", "mimeType": "image/gif", "buffer": b"GIF89a"}]); pg2.wait_for_timeout(300)
    chk("tipe file salah ditolak dengan pesan jelas", "PNG, JPG, atau WebP" in pg2.inner_text("#er-c"), pg2.inner_text("#er-c"))
    pg2.set_input_files("#up-c", files=[{"name": "b.png", "mimeType": "image/png", "buffer": b"0" * (16 * 1024 * 1024)}]); pg2.wait_for_timeout(300)
    chk("file di atas 15 MB ditolak dengan pesan jelas", "15 MB" in pg2.inner_text("#er-c"), pg2.inner_text("#er-c"))
    chk("tanpa galat JS (sesi gagal-simpan)", not errs, errs); ctx.close()
    b.close()
print(f"\n{ok_n} lulus, {bad_n} gagal"); sys.exit(1 if bad_n else 0)
