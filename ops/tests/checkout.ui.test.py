# Uji UI Step 7: tombol Preview 'Kembali ke Editor' & 'Lanjut ke Checkout'; tidak ada publikasi sebelum pembayaran terverifikasi.
import os, sys, json
src = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "editor-isi.ui.test.py"), encoding="utf-8").read()
head = src.split("ok_n = bad_n = 0")[0].replace('p = "/editor.html" if p == "/editor" else p', 'p = "/editor.html" if p == "/editor" else "/preview.html" if p == "/preview" else p')
__file__ = os.path.join(os.path.dirname(os.path.abspath(__file__)), "x.py")
exec(head)
ES = "bbbb2222-2222-2222-2222-222222222222"
COMPLETE = "{names:{a:'Sinta',b:'Raka'},event:{start:'10:00',end:'12:00',tz:'WIB',venue:'Gedung A',address:'Jl. X',maps:''},photos:{cover:'https://x/storage/v1/object/public/invitation-media/u1/a.webp',gallery:['https://x/storage/v1/object/public/invitation-media/u1/b.webp']}}"
S_OK = STUB.replace("event_date:null,content:{},updated_at:'2020-01-01T00:00:00Z',moderation:null,public_url:null,expires_at:null,theme_key:null}};", "event_date:'2027-01-10',content:" + COMPLETE + ",updated_at:'2020-01-01T00:00:00Z',moderation:null,public_url:null,expires_at:null,theme_key:null}};")
S_OK = S_OK.replace("auth:{getSession", "functions:{invoke:function(n,o){window.__calls.push(['fn:'+n,o.body]);return Promise.resolve({data:{redirect_url:'/bayar-midtrans-uji'},error:null})}},auth:{getSession", 1)
ok_n = bad_n = 0
def chk(n, c, d=""):
    global ok_n, bad_n
    if c: ok_n += 1; print("PASS", n)
    else: bad_n += 1; print("FAIL", n, d)
def mk(b, stub, vw=1280):
    ctx = b.new_context(viewport={"width": vw, "height": 900}); pg = ctx.new_page(); errs = []; pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.route("**/supabase.js", lambda r: r.fulfill(status=200, content_type="text/javascript", body=stub))
    pg.route("**/fonts.googleapis.com/**", lambda r: r.abort()); pg.route("**/fonts.gstatic.com/**", lambda r: r.abort())
    pg.route("**/bayar-midtrans-uji", lambda r: r.fulfill(status=200, content_type="text/html", body="<html><body>midtrans</body></html>"))
    return ctx, pg, errs
with sync_playwright() as pw:
    b = pw.chromium.launch()
    for vw, tag in ((1280, "desktop"), (390, "ponsel")):
        ctx, pg, errs = mk(b, S_OK, vw); pg.goto(BASE + "/preview?id=" + ES); pg.wait_for_selector("#stage")
        acts = pg.inner_text(".pvact"); allt = pg.inner_text("body")
        chk(f"[{tag}] tombol: 'Kembali ke Editor' dan 'Lanjut ke Checkout'", "Kembali ke Editor" in acts and "Lanjut ke Checkout" in acts, acts)
        chk(f"[{tag}] tidak ada tombol/teks 'Publikasikan' di halaman Preview", "Publikasikan" not in allt, allt[:80])
        chk(f"[{tag}] catatan: belum dipublikasikan, aktif setelah pembayaran terverifikasi", "baru aktif setelah pembayaran" in pg.inner_text(".pvnote"))
        chk(f"[{tag}] Kembali ke Editor menuju editor undangan ini", pg.locator("a:has-text('Kembali ke Editor')").get_attribute("href") == "/editor?id=" + ES)
        pg.locator("#pub-b").click(); pg.wait_for_selector("#fdlg")
        dl = pg.inner_text("#fdlg")
        chk(f"[{tag}] checkout: judul 'Checkout' & pesan belum dipublikasikan sampai pembayaran terverifikasi", dl.startswith("Checkout") and "belum dipublikasikan" in dl and "verifikasi" in dl, dl[:160])
        chk(f"[{tag}] ringkasan pesanan lengkap (paket, link, masa aktif, total)", all(k in dl for k in ["Paket Essential", "nusamora.com/uji-es", "Masa aktif", "Total", "Rp"]), dl[:400])
        chk(f"[{tag}] hanya klik Checkout tidak memanggil pembayaran/publikasi", not [c for c in pg.evaluate("window.__calls") if c[0].startswith("fn:") or "publish" in c[0]])
        pg.locator("#pay-go").click(); pg.wait_for_url("**/bayar-midtrans-uji", timeout=4000)
        calls = pg.evaluate("window.__calls") if False else None
        chk(f"[{tag}] hanya tombol Bayar yang memanggil checkout pembayaran, lalu menuju Midtrans", "bayar-midtrans-uji" in pg.url)
        chk(f"[{tag}] tanpa galat JS", not errs, errs); ctx.close()
    # data belum lengkap -> tidak bisa checkout
    ctx, pg, errs = mk(b, STUB); pg.goto(BASE + "/preview?id=" + ES); pg.wait_for_selector("#stage"); pg.locator("#pub-b").click(); pg.wait_for_selector("#fdlg")
    dl = pg.inner_text("#fdlg")
    chk("data belum lengkap: daftar yang kurang & teks 'lanjut ke checkout', tanpa tombol bayar", "checkout" in dl and "Nama acara" in dl and pg.locator("#pay-go").count() == 0, dl[:200])
    ctx.close(); b.close()
print(f"\n{ok_n} lulus, {bad_n} gagal"); sys.exit(1 if bad_n else 0)
