# Uji UI Step 6 Luxe: preview = pengalaman Live Guest asli (iframe), bukan ringkasan konfigurasi; perangkat, layar penuh, demo, kembali, kelengkapan.
import os, sys
src = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "editor-isi.ui.test.py"), encoding="utf-8").read()
head = src.split("ok_n = bad_n = 0")[0].replace('p = "/editor.html" if p == "/editor" else p', 'p = "/editor.html" if p == "/editor" else "/preview.html" if p == "/preview" else p')
__file__ = os.path.join(ROOT_DIR := os.path.dirname(os.path.abspath(__file__)), "x.py")
exec(head)
LX = "aaaa1111-1111-1111-1111-111111111111"
ok_n = bad_n = 0
def chk(n, c, d=""):
    global ok_n, bad_n
    if c: ok_n += 1; print("PASS", n)
    else: bad_n += 1; print("FAIL", n, d)
LIVE = "<!doctype html><html><body><h1 id=live>LIVE-GUEST-ASLI</h1></body></html>"
with sync_playwright() as pw:
    b = pw.chromium.launch()
    for vw, vh, tag in ((1280, 900, "desktop"), (390, 844, "ponsel")):
        ctx = b.new_context(viewport={"width": vw, "height": vh}); errs = []
        pg = ctx.new_page(); pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.route("**/supabase.js", lambda r: r.fulfill(status=200, content_type="text/javascript", body=STUB))
        pg.route("**/fonts.googleapis.com/**", lambda r: r.abort()); pg.route("**/fonts.gstatic.com/**", lambda r: r.abort())
        pg.route("**/live/**", lambda r: r.fulfill(status=200, content_type="text/html", body=LIVE))
        pg.goto(BASE + "/preview?id=" + LX); pg.wait_for_selector("#stage")
        txt = pg.inner_text("#stage")
        chk(f"[{tag}] tidak menampilkan ringkasan konfigurasi (Denah venue / Fitur interaktif)", "Denah venue" not in txt and "Fitur interaktif" not in txt, txt[:120])
        chk(f"[{tag}] tampil poster 'Mulai preview' Live Guest (iframe belum dimuat)", pg.locator("#lx-go").is_visible() and pg.locator("#stage iframe").count() == 0)
        pg.locator("#lx-go").click(); pg.wait_for_selector("#stage iframe")
        chk(f"[{tag}] iframe memuat halaman Live Guest asli /live/", pg.get_attribute("#stage iframe", "src") == "/live/")
        fr = pg.frame_locator("#stage iframe"); chk(f"[{tag}] isi iframe adalah halaman live", fr.locator("#live").inner_text() == "LIVE-GUEST-ASLI")
        sz = lambda: pg.evaluate("(()=>{const f=document.querySelector('#dvf');return [parseInt(f.style.width),parseInt(f.style.height)]})()")
        chk(f"[{tag}] default Desktop 1280x720", sz() == [1280, 720], sz())
        pg.locator("input[name=dv][value=t]").check(force=True); chk(f"[{tag}] Tablet 820x1100", sz() == [820, 1100], sz())
        pg.locator("input[name=dv][value=m]").check(force=True); chk(f"[{tag}] Ponsel 390x844", sz() == [390, 844], sz())
        pg.locator("input[name=dv][value=d]").check(force=True); chk(f"[{tag}] kembali ke Desktop", sz() == [1280, 720])
        chk(f"[{tag}] frame diskalakan agar muat tanpa scroll horizontal", not pg.evaluate("document.documentElement.scrollWidth > document.documentElement.clientWidth"))
        chk(f"[{tag}] ada tombol Layar penuh", pg.locator("#fs-b").is_visible())
        pg.locator("#fs-b").click(); pg.wait_for_timeout(300)
        fsel = pg.evaluate("document.fullscreenElement && document.fullscreenElement.className")
        chk(f"[{tag}] Layar penuh aktif pada area preview", bool(fsel) and "pvwrap" in fsel, fsel)
        pg.keyboard.press("Escape"); pg.evaluate("document.fullscreenElement && document.exitFullscreen()"); pg.wait_for_timeout(200)
        chk(f"[{tag}] tombol Coba Demo membuka demo asli di tab baru", pg.get_attribute("#demo-b", "href") == "/live/" and pg.get_attribute("#demo-b", "target") == "_blank")
        chk(f"[{tag}] tombol Kembali ke editor", pg.locator("a:has-text('Kembali ke editor')").get_attribute("href") == "/editor?id=" + LX)
        info = pg.inner_text(".pvinfo")
        chk(f"[{tag}] info kelengkapan: yang belum lengkap ditandai & tertaut ke editor", "belum lengkap" in info and pg.locator(".pvinfo a[href*='#s-waktu']").count() >= 1, info[:200])
        chk(f"[{tag}] info fitur Live Guest aktif/nonaktif (Live chat aktif, Video ucapan nonaktif)", "Live chat · aktif" in info and "Video ucapan · nonaktif" in info, info[:400])
        chk(f"[{tag}] catatan jujur: pengaturan Anda belum diterapkan di demo", "belum diterapkan" in info)
        chk(f"[{tag}] tanpa galat JS", not errs, errs)
        pg.goto(BASE + "/preview?demo=lx"); pg.wait_for_selector("#stage"); chk(f"[{tag}] halaman demo template Luxe juga memakai Live Guest asli", pg.locator("#lx-go").count() == 1 and "Denah venue" not in pg.inner_text("#stage"))
        ctx.close()
    # template tanpa demo /live: tidak boleh jatuh ke ringkasan konfigurasi
    ctx = b.new_context(viewport={"width": 1280, "height": 900}); pg = ctx.new_page()
    pg.route("**/supabase.js", lambda r: r.fulfill(status=200, content_type="text/javascript", body=STUB.replace("preview_url:'/live/'", "preview_url:''")))
    pg.route("**/fonts.*/**", lambda r: r.abort())
    pg.goto(BASE + "/preview?id=" + LX); pg.wait_for_selector("#stage")
    chk("template Luxe tanpa demo: pesan jelas, tanpa ringkasan konfigurasi pengganti", "belum tersedia" in pg.inner_text("#stage") and "Denah venue" not in pg.inner_text("#stage") and pg.locator("#demo-b").count() == 0, pg.inner_text("#stage")[:150])
    ctx.close(); b.close()
print(f"\n{ok_n} lulus, {bad_n} gagal"); sys.exit(1 if bad_n else 0)
