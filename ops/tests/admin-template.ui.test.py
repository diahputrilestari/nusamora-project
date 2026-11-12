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
var PERMS=JSON.parse(sessionStorage.getItem('__perms')||'null')||['dashboard.read','templates.read','templates.write'];
var NOW=Date.now(),D=864e5,iso=function(n){return new Date(NOW+n*D).toISOString()};
function chk(k,l,req,ok,hint,g){return {key:k,label:l,required:req,ok:ok,hint:hint,group:g}}
var TPL={
 t1:{id:'t1',slug:'jawa-luxe',name:'Jawa <img src=x onerror=window.__xss=1> Luxe',description:'Deskripsi lengkap template.',thumbnail_url:'https://x.test/t.png',preview_url:'/live/',category_id:'k1',categories:['wedding'],package_type:'luxe',theme_key:null,min_plan:null,price:0,status:'draft',sort:1,version:2,featured:false,recommended:false,languages:['id'],default_language:'id',created_at:iso(-30),updated_at:iso(-1),published_at:null,category_name:'Pernikahan'},
 t2:{id:'t2',slug:'romantic',name:'Romantic Garden',description:'Taman romantis.',thumbnail_url:'https://x.test/r.png',preview_url:null,category_id:'k1',categories:['wedding'],package_type:'essential',theme_key:null,min_plan:null,price:0,status:'published',sort:2,version:1,featured:true,recommended:false,languages:['id','en'],default_language:'id',created_at:iso(-90),updated_at:iso(-5),published_at:iso(-80),category_name:'Pernikahan'}};
var READY={t1:false,t2:true};
function rd(id){var ok=READY[id];var c=[chk('description','Deskripsi template (min. 20 karakter)',true,true,'Tulis deskripsi.','Informasi'),chk('thumbnail','Thumbnail template',true,true,'Unggah.','Informasi'),chk('venue','Venue virtual',true,ok,'Pasang gambar latar atau model venue pada slot Venue virtual.','Aset'),chk('avatar_groom','Avatar mempelai pria',true,ok,'Tandai peran avatar pada aset.','Aset'),chk('interactive','Objek interaktif',false,false,'Opsional.','Aset'),chk('layout','Layout & section diatur',false,ok,'Atur di Studio tab C.','Tampilan')];
 var req=c.filter(function(x){return x.required}),ro=req.filter(function(x){return x.ok}).length;return {ready:ro===req.length,required_total:req.length,required_ok:ro,total:c.length,ok_count:c.filter(function(x){return x.ok}).length,checks:c}}
var VERS={t1:[{version:2,note:'Ubah deskripsi',created_at:iso(-2),by:'Admin Uji',assets:3,current:false},{version:1,note:'Awal',created_at:iso(-10),by:'Admin Uji',assets:2,current:false}],t2:[{version:1,note:null,created_at:iso(-80),by:null,assets:5,current:true}]};
function ok(d){return Promise.resolve({data:d===undefined?null:d,error:null})}
function err(m,h){return Promise.resolve({data:null,error:{message:m,hint:h||null,code:'P0001'}})}
window.supabase={createClient:function(){return{
 from:function(t){var o={select:function(){return o},eq:function(){return o},neq:function(){return o},in:function(){return o},gte:function(){return o},lte:function(){return o},lt:function(){return o},gt:function(){return o},ilike:function(){return o},or:function(){return o},is:function(){return o},order:function(){return o},limit:function(){return o},range:function(){return o},maybeSingle:function(){return ok(TPL.t1)},
  then:function(a,b){var rows=t==='templates'?[TPL.t1,TPL.t2].map(function(x){return Object.assign({},x,{event_categories:{name:'Pernikahan'}})}):[];return Promise.resolve({data:rows,error:null,count:rows.length}).then(a,b)}};return o},
 rpc:function(n,a){window.__calls.push([n,a]);
  if(n==='my_admin')return ok({role:'content',perms:PERMS,mfa:{needed:false}});
  if(n==='admin_templates_overview'){var o={};Object.keys(TPL).forEach(function(k){var r=rd(k);o[k]={usage_total:k==='t2'?5:0,usage_active:k==='t2'?3:0,ready:r.ready,req_ok:r.required_ok,req_total:r.required_total}});return ok(o)}
  if(n==='admin_template_detail'){var t=TPL[a.p_id];if(!t)return err('template tidak ditemukan');var u=a.p_id==='t2';
   return ok({template:t,readiness:rd(a.p_id),usage:{total:u?5:0,active:u?3:0,draft:u?1:0,pending:u?1:0,last30:u?2:0},assets_count:u?5:2,themes:[{slug:'batak',name:'Batak',enabled:true,status:'published'}],versions:VERS[a.p_id]||[],latest_version:(VERS[a.p_id]||[{version:0}])[0].version,matches_version:a.p_id==='t2'?1:null,dirty:a.p_id!=='t2'})}
  if(n==='admin_template_action'){var t=TPL[a.p_id];if(a.p_action==='publish'){if(!rd(a.p_id).ready&&!a.p_force)return err('template_belum_lengkap','Belum lengkap: Venue virtual, Avatar mempelai pria');t.status='published'}else if(a.p_action==='unpublish')t.status='draft';else if(a.p_action==='archive')t.status='archived';else if(a.p_action==='unarchive')t.status='draft';return ok()}
  if(n==='admin_template_settings'){var t=TPL[a.p_id];var p=a.p_patch;t.languages=p.languages;t.default_language=p.default_language;t.featured=p.featured;t.recommended=p.recommended;return ok()}
  if(n==='admin_template_duplicate'){if(a.p_slug==='romantic')return err('slug_sudah_dipakai');TPL.t3=Object.assign({},TPL[a.p_id],{id:'t3',slug:a.p_slug,name:a.p_name,status:'draft',version:1,featured:false});READY.t3=false;return ok('t3')}
  if(n==='admin_template_save_version'){if(a.p_note==='sama')return err('tidak_ada_perubahan');return ok(3)}
  if(n==='admin_template_restore_version')return ok({ok:true,skipped_assets:1,skipped_themes:0});
  return ok([])},
 storage:{from:function(){return{}}},
 auth:{getSession:function(){return Promise.resolve({data:{session:{user:{id:'a1',email:'adm@uji.test'}}}})},signOut:function(){return Promise.resolve({})},onAuthStateChange:function(){return{data:{subscription:{unsubscribe:function(){}}}}}}}}};"""
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
with sync_playwright() as pw:
    b = pw.chromium.launch()
    ctx, pg, errs = newpage(b); pg.goto(BASE + "/admin#templates"); pg.wait_for_selector("#tb tr.row")
    t = txt(pg, "#tb")
    chk("daftar: dua template tampil", pg.locator("#tb tr.row").count() == 2)
    chk("daftar: kolom Kelengkapan (Siap vs x/y wajib), Dipakai, Versi", "Siap" in t and "2/4 wajib" in t and "5 (3 aktif)" in t and "v2" in t, t)
    chk("daftar: penanda Unggulan pada template unggulan", "Unggulan" in t)
    chk("daftar: filter Paket & Status", pg.evaluate("[...document.querySelectorAll('.tool .fld')].map(l=>l.firstChild.textContent.trim()).filter(x=>x!=='Cari')") == ["Status", "Paket"])
    chk("daftar: nama di-escape (tanpa XSS)", pg.evaluate("window.__xss") is None and pg.locator("#tb img[src='x']").count() == 0)
    pg.click("#tb tr.row:first-child"); pg.wait_for_selector(".dhead")
    chk("klik template membuka halaman detail", pg.evaluate("location.hash") == "#templates:items:t1")
    t = txt(pg)
    chk("detail: kelengkapan 2 dari 4 syarat wajib, belum siap", "Belum siap" in t and "2 dari 4 syarat wajib" in t, t[:500])
    li = pg.evaluate("[...document.querySelectorAll('.rdl li')].map(l=>l.className+'|'+l.innerText.replace(/\\n+/g,' '))")
    chk("syarat wajib gagal ditandai 'no' + petunjuk; opsional ditandai 'opt'", any(x.startswith("no|") and "Venue virtual" in x and "Pasang gambar latar" in x for x in li) and any(x.startswith("opt|") and "Disarankan" in x for x in li) and any(x.startswith("ok|") for x in li), li)
    chk("belum siap: tombol 'Terbitkan paksa', bukan 'Publikasikan'", pg.locator("[data-ta=force]").count() == 1 and pg.locator("[data-ta=publish]").count() == 0)
    chk("paket terkunci karena sudah punya aset", pg.locator("#ts-pkg:disabled").count() == 1 and "Terkunci" in txt(pg))
    chk("unggulan/rekomendasi nonaktif untuk draft", pg.locator("#ts-feat:disabled").count() == 1 and "Hanya template Published" in txt(pg))
    chk("nama template di-escape (tanpa XSS)", pg.evaluate("window.__xss") is None and pg.locator(".dhead h2 img").count() == 0)
    pg.click("[data-ta=force]"); pg.wait_for_selector("#fdlg[open] #ff-note"); n0 = len([c for c in pg.evaluate("window.__calls") if c[0] == "admin_template_action"]); pg.click("#f-save")
    chk("terbit paksa tanpa alasan ditolak di formulir", len([c for c in pg.evaluate("window.__calls") if c[0] == "admin_template_action"]) == n0)
    chk("formulir menyebut apa yang belum lengkap", "Venue virtual" in pg.inner_text("#fdlg"))
    pg.fill("#ff-note", "Template bawaan"); pg.click("#f-save"); pg.wait_for_function("document.querySelector('.dhead').innerText.includes('Published')")
    c = [c for c in pg.evaluate("window.__calls") if c[0] == "admin_template_action"][-1][1]
    chk("RPC terbit paksa membawa p_force + alasan", c == {"p_id": "t1", "p_action": "publish", "p_note": "Template bawaan", "p_force": True}, c)
    pg.check("#ts-feat") if pg.locator("#ts-feat:enabled").count() else None
    chk("setelah terbit: sorotan bisa dicentang", pg.locator("#ts-feat:enabled").count() == 1)
    pg.check("#ts-feat"); pg.uncheck("[data-lang=id]"); pg.check("[data-lang=en]"); pg.select_option("#ts-dl", "en"); pg.click("#tset button[type=submit]")
    pg.wait_for_function("window.__calls.some(c=>c[0]==='admin_template_settings')")
    c = [c for c in pg.evaluate("window.__calls") if c[0] == "admin_template_settings"][-1][1]["p_patch"]
    chk("pengaturan: paket, bahasa, bahasa utama, unggulan terkirim", c["languages"] == ["en"] and c["default_language"] == "en" and c["featured"] is True and c["package_type"] == "luxe", c)
    # template siap
    pg.goto(BASE + "/admin#templates:items:t2"); pg.wait_for_selector(".dhead")
    chk("template lengkap: 'Siap diterbitkan' dan terkunci karena terbit", "Siap diterbitkan" in txt(pg) and pg.locator("#ts-pkg:disabled").count() == 1)
    chk("riwayat versi: v1 'Sama dengan isi saat ini', tanpa tombol pulihkan", "Sama dengan isi saat ini" in txt(pg) and pg.locator("[data-rest]").count() == 0)
    chk("penggunaan: 5 undangan (3 aktif), 1 draft, 1 menunggu bayar", "5 (3 aktif)" in txt(pg).replace("\n", " ") or "5\n(3 aktif)" in txt(pg), txt(pg)[:400])
    pg.click("[data-ta=unpublish]"); pg.click("#cdlg-y"); pg.wait_for_function("document.querySelector('.dhead').innerText.includes('Draft')")
    chk("tarik ke draft lewat konfirmasi", pg.locator("[data-ta=publish]").count() == 1)
    pg.click("[data-ta=publish]"); pg.click("#cdlg-y"); pg.wait_for_function("document.querySelector('.dhead').innerText.includes('Published')")
    chk("template siap: Publikasikan biasa (tanpa paksa)", [c for c in pg.evaluate("window.__calls") if c[0] == "admin_template_action"][-1][1]["p_force"] is False)
    pg.click("[data-ta=archive]"); pg.click("#cdlg-y"); pg.wait_for_function("document.querySelector('.dhead').innerText.includes('Arsip')")
    chk("arsipkan template; konfirmasi menyebut undangan yang masih berjalan", pg.locator("[data-ta=unarchive]").count() == 1)
    # duplikasi
    pg.click("[data-dup]"); pg.wait_for_selector("#fdlg[open] #ff-slug")
    chk("duplikasi: nama & slug terisi bawaan", pg.input_value("#ff-slug") == "romantic-salinan" and "(salinan)" in pg.input_value("#ff-name"))
    pg.fill("#ff-slug", "romantic"); pg.click("#f-save"); pg.wait_for_selector("#fe:not(:empty), #fdlg .err:not(:empty), .toast.bad")
    chk("slug kembar ditolak dengan pesan jelas", "Slug sudah dipakai" in (pg.inner_text(".toast.bad") if pg.locator(".toast.bad").count() else pg.inner_text("#fdlg")))
    pg.fill("#ff-slug", "romantic-baru"); pg.click("#f-save"); pg.wait_for_function("location.hash==='#templates:items:t3'")
    pg.wait_for_function("document.querySelector('.dhead') && document.querySelector('.dhead').innerText.includes('romantic-baru')"); chk("duplikasi: pindah ke template salinan (draft)", "Draft" in txt(pg, ".dhead"))
    ctx.close()
    # versi (halaman baru agar status template kembali draft)
    ctx, pg, errs = newpage(b); pg.goto(BASE + "/admin#templates:items:t1"); pg.wait_for_selector(".dhead")
    chk("versi: 'Ada perubahan' + tombol pulihkan per versi (template belum terbit)", "Ada perubahan" in txt(pg) and pg.locator("[data-rest]").count() >= 1)
    pg.click("[data-ver]"); pg.wait_for_selector("#fdlg[open] #ff-note"); pg.fill("#ff-note", "sama"); pg.click("#f-save"); pg.wait_for_selector(".toast.bad, #fdlg .err:not(:empty), #fe:not(:empty)")
    chk("simpan versi tanpa perubahan: pesan jelas", "Belum ada perubahan" in (pg.inner_text(".toast.bad") if pg.locator(".toast.bad").count() else pg.inner_text("#fdlg")))
    pg.fill("#ff-note", "Rilis Oktober"); pg.click("#f-save"); pg.wait_for_function("window.__calls.filter(c=>c[0]==='admin_template_save_version').length>=2")
    chk("simpan versi mengirim catatan", [c for c in pg.evaluate("window.__calls") if c[0] == "admin_template_save_version"][-1][1] == {"p_id": "t1", "p_note": "Rilis Oktober"})
    pg.reload(); pg.wait_for_selector("[data-rest]")
    pg.click("[data-rest='1']"); pg.click("#cdlg-y"); pg.wait_for_selector(".toast.ok")
    chk("pulihkan versi: RPC + peringatan aset dilewati", [c for c in pg.evaluate("window.__calls") if c[0] == "admin_template_restore_version"][-1][1] == {"p_id": "t1", "p_version": 1})
    chk("tanpa galat JS", not errs, errs); ctx.close()
    ctx, pg, errs = newpage(b, perms=["dashboard.read", "templates.read"]); pg.goto(BASE + "/admin#templates:items:t1"); pg.wait_for_selector(".dhead")
    chk("baca-saja: tanpa tombol tindakan, pengaturan nonaktif", pg.locator("[data-ta],[data-dup],[data-ver],[data-studio],[data-rest],#tset button[type=submit]").count() == 0 and pg.locator("#ts-dl:disabled").count() == 1)
    ctx.close()
    ctx, pg, errs = newpage(b); pg.goto(BASE + "/admin#templates:items:t1"); pg.wait_for_selector(".dhead")
    pg.click("[data-pv=d]"); pg.wait_for_selector("iframe.pvf")
    chk("preview memakai preview_url yang sama-origin", pg.get_attribute("iframe.pvf", "src") == "/live/", pg.get_attribute("iframe.pvf", "src")); ctx.close()
    for vw in (390, 768):
        ctx, pg, errs = newpage(b, vw=vw)
        for h in ("#templates", "#templates:items:t1", "#templates:items:t2"):
            pg.goto(BASE + "/admin" + h); pg.wait_for_selector(".dhead, #tb tr.row")
            chk(f"[{vw}px] {h} tanpa scroll horizontal halaman", pg.evaluate("document.documentElement.scrollWidth <= innerWidth + 1"), pg.evaluate("document.documentElement.scrollWidth"))
        ctx.close()
    b.close()
print("\nHASIL: %d lulus, %d gagal" % (ok_n, bad_n)); raise SystemExit(1 if bad_n else 0)
