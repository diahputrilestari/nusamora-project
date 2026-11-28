# Uji UI pelacak analytics (assets/nm-track.js): persetujuan opt-in, DNT/GPC, tanpa permintaan sebelum Terima, isi event, hak hapus.
# Endpoint ditiru di browser (route); logika database diuji di ops/tests/analytics.test.sql.
import http.server, socketserver, threading, os, json
from playwright.sync_api import sync_playwright
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
PAGES = {"/": "/index.html", "/paket": "/paket.html", "/syarat-ketentuan": "/syarat-ketentuan.html", "/template": "/template.html", "/kebijakan-privasi": "/kebijakan-privasi.html", "/preview": "/preview.html", "/daftar": "/daftar.html", "/masuk": "/masuk.html"}
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
    def translate_path(self, p):
        p = p.split("?")[0]; p = PAGES.get(p, p)
        return os.path.join(ROOT, p.lstrip("/"))
srv = socketserver.TCPServer(("127.0.0.1", 0), Q); BASE = "http://127.0.0.1:%d" % srv.server_address[1]
threading.Thread(target=srv.serve_forever, daemon=True).start()
ok_n = bad_n = 0
def chk(n, c, d=""):
    global ok_n, bad_n
    if c: ok_n += 1; print("PASS", n)
    else: bad_n += 1; print("FAIL", n, d)
CFG_ON = "window.NM_CONFIG={SUPABASE_URL:'https://stub.supabase.co',SUPABASE_ANON_KEY:'x',ANALYTICS_ON:true,GA4_ID:''};"
CFG_OFF = "window.NM_CONFIG={SUPABASE_URL:'https://stub.supabase.co',SUPABASE_ANON_KEY:'x',ANALYTICS_ON:false,GA4_ID:''};"
def newpage(b, cfg=CFG_ON, dnt=False, vw=390):
    ctx = b.new_context(viewport={"width": vw, "height": 800}, extra_http_headers={"DNT": "1"} if dnt else None); reqs = []; errs = []
    pg = ctx.new_page(); pg.on("pageerror", lambda e: errs.append(str(e)))
    if dnt: pg.add_init_script("Object.defineProperty(navigator,'doNotTrack',{get:()=> '1'})")
    pg.route("**/assets/config.js*", lambda r: r.fulfill(status=200, content_type="text/javascript", body=cfg))
    pg.route("**/supabase-js@*/**", lambda r: r.fulfill(status=200, content_type="text/javascript", body="window.supabase={createClient:function(){return {auth:{getSession:function(){return Promise.resolve({data:{session:null}})},onAuthStateChange:function(){return {data:{subscription:{unsubscribe(){}}}}},signUp:function(a){window.__su=a;return Promise.resolve({data:{},error:null})}},rpc:function(){return Promise.resolve({data:[],error:null})},from:function(){var q={select:function(){return q},eq:function(){return q},order:function(){return q},then:function(f){return Promise.resolve({data:[],error:null}).then(f)}};return q},functions:{invoke:function(){return Promise.resolve({data:null,error:null})}}}}};"))
    pg.route("**/fonts.googleapis.com/**", lambda r: r.abort()); pg.route("**/fonts.gstatic.com/**", lambda r: r.abort())
    def ep(r):
        body = r.request.post_data or ""; reqs.append(body); r.fulfill(status=202, content_type="application/json", body='{"ok":true}', headers={"access-control-allow-origin": "*"})
    pg.route("**/functions/v1/analytics-collect", ep)
    return ctx, pg, reqs, errs
def evs(reqs):
    out = []
    for b in reqs:
        try: j = json.loads(b); out += [e["e"] for e in j.get("events", [])]
        except Exception: pass
    return out
def last(reqs):
    for b in reversed(reqs):
        try:
            j = json.loads(b)
            if j.get("events"): return j
        except Exception: pass
    return {}

with sync_playwright() as p:
    b = p.chromium.launch()

    ctx, pg, reqs, errs = newpage(b, CFG_OFF); pg.goto(BASE + "/"); pg.wait_for_timeout(1200)
    chk("flag ANALYTICS_ON=false: tidak ada banner dan tidak ada permintaan", pg.locator("#nm-consent").count() == 0 and not reqs and pg.evaluate("typeof window.NMTrack") == "undefined", reqs)
    ctx.close()

    ctx, pg, reqs, errs = newpage(b); pg.goto(BASE + "/"); pg.wait_for_timeout(1500)
    chk("flag nyala, belum memilih: banner tampil dengan tombol Terima dan Tolak", pg.locator("#nm-consent").is_visible() and pg.locator("#nm-consent .nm-y").inner_text() == "Terima" and pg.locator("#nm-consent .nm-n").inner_text() == "Tolak")
    chk("sebelum persetujuan: nol permintaan ke pengumpul dan nol pengenal tersimpan", not reqs and pg.evaluate("localStorage.getItem('nm_vid')") is None and pg.evaluate("localStorage.getItem('nm_sid')") is None and pg.evaluate("document.cookie.indexOf('nm_vid')") == -1, reqs)
    chk("banner aksesibel: region berlabel, tombol >= 44px", pg.get_attribute("#nm-consent", "role") == "region" and pg.locator("#nm-consent .nm-y").bounding_box()["height"] >= 44)
    pg.click("#nm-consent .nm-n"); pg.wait_for_timeout(1500)
    chk("Tolak: banner hilang, tidak ada permintaan, tidak ada pengenal", pg.locator("#nm-consent").count() == 0 and not reqs and pg.evaluate("localStorage.getItem('nm_vid')") is None and pg.evaluate("localStorage.getItem('nm_consent_v1')") == "denied")
    pg.goto(BASE + "/"); pg.wait_for_timeout(1000)
    chk("pilihan Tolak diingat: banner tidak muncul lagi dan tetap tanpa permintaan", pg.locator("#nm-consent").count() == 0 and not reqs)
    chk("NMTrack.ids() = null tanpa persetujuan (form daftar tidak membawa pengenal)", pg.evaluate("window.NMTrack.ids()") is None)
    ctx.close()

    ctx, pg, reqs, errs = newpage(b); pg.goto(BASE + "/"); pg.wait_for_timeout(800); pg.click("#nm-consent .nm-y"); pg.wait_for_timeout(2000)
    j = last(reqs)
    chk("Terima: page_view terkirim dengan path bersih", "page_view" in evs(reqs) and j["events"][0].get("path") == "/", reqs)
    pg.evaluate("document.getElementById('harga').scrollIntoView()"); pg.wait_for_timeout(6500)
    chk("bagian Harga di landing terlihat: pricing_view terkirim", "pricing_view" in evs(reqs), evs(reqs))
    chk("payload memuat UUID visitor dan sesi, tanpa nama/email/IP", len(j.get("vid", "")) == 36 and len(j.get("sid", "")) == 36 and not any(k in json.dumps(j).lower() for k in ["email", "password", "whatsapp"]), j)
    chk("pengenal tersimpan setelah Terima", pg.evaluate("localStorage.getItem('nm_vid')") == j["vid"] and "nm_vid" in pg.evaluate("document.cookie"))
    chk("NMTrack.ids() mengembalikan pengenal yang sama untuk atribusi pendaftaran", pg.evaluate("window.NMTrack.ids().vid") == j["vid"])
    pg.evaluate("document.body.insertAdjacentHTML('beforeend','<a id=t1 href=\"/template?paket=signature\">x</a><a id=t2 href=\"/buat?paket=essential&kategori=pernikahan&template=Dino_Kids\">y</a><a id=t3 href=\"/preview?demo=dino-kids\">z</a><a id=t4 href=\"mailto:support@nusamora.com\">m</a><a id=t5 href=\"https://wa.me/62\">w</a>')")
    for sel in ["#t1", "#t2", "#t3", "#t4", "#t5"]:
        pg.evaluate("s=>document.querySelector(s).addEventListener('click',e=>e.preventDefault())", sel); pg.click(sel)
    pg.wait_for_timeout(6500)
    ev = evs(reqs)
    chk("klik: package_select, template_select, template_preview, contact_click, whatsapp_click", all(x in ev for x in ["package_select", "template_select", "template_preview", "contact_click", "whatsapp_click"]), ev)
    allev = [e for bd in reqs for e in json.loads(bd).get("events", [])]
    chk("template_select membawa slug disaring dan paket", any(e["e"] == "template_select" and e.get("tpl") == "dinokids" and e.get("pkg") == "essential" for e in allev), allev)
    pg.evaluate("window.NMTrack.openChoice()"); pg.wait_for_timeout(300); n0 = len(reqs)
    pg.click("#nm-consent .nm-n"); pg.wait_for_timeout(1200)
    forget = [x for x in reqs[n0:] if '"forget":true' in x]
    chk("Tolak setelah Terima: permintaan hapus (forget) dikirim dan pengenal dibuang dari peramban", len(forget) == 1 and pg.evaluate("localStorage.getItem('nm_vid')") is None and pg.evaluate("localStorage.getItem('nm_sid')") is None and "nm_vid" not in pg.evaluate("document.cookie"))
    n1 = len(reqs); pg.evaluate("document.querySelector('#t1').click()"); pg.wait_for_timeout(6500)
    chk("setelah dicabut: tidak ada event lagi", len(reqs) == n1)
    chk("tidak ada galat JavaScript", not errs, errs); ctx.close()

    ctx, pg, reqs, errs = newpage(b, dnt=True); pg.goto(BASE + "/"); pg.wait_for_timeout(1500)
    chk("Do Not Track: tidak ada banner, tidak ada permintaan, tidak ada pengenal", pg.locator("#nm-consent").count() == 0 and not reqs and pg.evaluate("localStorage.getItem('nm_vid')") is None); ctx.close()

    ctx, pg, reqs, errs = newpage(b); pg.add_init_script("localStorage.setItem('nm_consent_v1','granted')")
    pg.goto(BASE + "/preview?id=11111111-2222-3333-4444-555555555555"); pg.wait_for_timeout(2000)
    chk("pratinjau undangan pelanggan (?id=) tidak dilacak (hanya tujuan pengalihan yang tercatat)", not any(e.get("path") == "/preview" for bd in reqs for e in json.loads(bd).get("events", [])), reqs)
    pg.goto(BASE + "/preview?demo=dino-kids"); pg.wait_for_timeout(2000)
    chk("pratinjau demo template: page_view + template_preview dengan slug", "template_preview" in evs(reqs) and any(e.get("tpl") == "dino-kids" for bd in reqs for e in json.loads(bd).get("events", [])), reqs); ctx.close()

    ctx, pg, reqs, errs = newpage(b); pg.add_init_script("localStorage.setItem('nm_consent_v1','granted')")
    pg.goto(BASE + "/?utm_source=Instagram&utm_medium=Social&utm_campaign=Promo"); pg.wait_for_timeout(1800)
    j = last(reqs); u = j.get("ctx", {}).get("utm", {})
    chk("UTM dibaca pada awal sesi dan dikirim (query tidak masuk path)", u.get("source") == "Instagram" and u.get("campaign") == "Promo" and j["events"][0].get("path") == "/", j)
    pg.goto(BASE + "/kebijakan-privasi"); pg.wait_for_timeout(1500)
    sid2 = last(reqs).get("sid"); chk("sesi sama dipakai antar halaman (kurang dari 30 menit)", sid2 == j.get("sid"))
    pg.evaluate("var s=JSON.parse(localStorage.getItem('nm_sid'));s.t=Date.now()-31*60*1000;localStorage.setItem('nm_sid',JSON.stringify(s))"); pg.goto(BASE + "/syarat-ketentuan"); pg.wait_for_timeout(1500)
    chk("sesi baru setelah 30 menit tidak aktif", last(reqs).get("sid") != sid2); ctx.close()

    ctx, pg, reqs, errs = newpage(b); pg.add_init_script("localStorage.setItem('nm_consent_v1','granted')")
    pg.goto(BASE + "/daftar"); pg.wait_for_timeout(1000)
    chk("halaman daftar: signup_start saat mulai mengisi formulir pendaftaran (bukan formulir masuk)", (pg.focus("#r-name") or True) and (pg.wait_for_timeout(6500) or True) and "signup_start" in evs(reqs), evs(reqs)); ctx.close()

    ctx, pg, reqs, errs = newpage(b, vw=1280); pg.goto(BASE + "/kebijakan-privasi"); pg.wait_for_timeout(800)
    chk("kebijakan privasi: tombol Ubah pilihan analitik membuka banner", (pg.click("#nm-choice") or True) and pg.locator("#nm-consent").is_visible())
    txt = pg.inner_text("#cookies")
    chk("kebijakan privasi bagian 7 menyebut persetujuan, 90 hari, 13 bulan, tanpa IP, dan tidak lagi mengaku tanpa analitik", all(x in txt for x in ["Terima", "90 hari", "13 bulan", "alamat IP tidak disimpan"]) and "tidak memasang layanan analitik" not in txt)
    ctx.close(); b.close()
print("SEMUA LULUS (%d)" % ok_n if not bad_n else "GAGAL %d dari %d" % (bad_n, ok_n + bad_n)); raise SystemExit(1 if bad_n else 0)
