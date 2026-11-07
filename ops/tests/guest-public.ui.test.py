"""Uji modul tamu publik (assets/guest.js) di Chromium dengan RPC Supabase ditiru lewat route.
Jalankan: python3 -m http.server 8765 (di akar repo) lalu python3 ops/tests/guest-public.ui.test.py"""
import json, sys
from playwright.sync_api import sync_playwright
TOK = 'a' * 32
PAGE = '<!doctype html><meta charset=utf-8><title>t</title><link rel=stylesheet href=/assets/guest.css><div id=nm-guest></div><script src=/assets/config.js></script><script src=/assets/guest.js defer></script>'
ok = True
def check(name, cond):
    global ok; ok = ok and bool(cond); print(('OK   ' if cond else 'GAGAL'), name)
with sync_playwright() as p:
    b = p.chromium.launch()
    def page(query, handler):
        pg = b.new_page(viewport={'width': 390, 'height': 800}); calls = []; errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.route('**/assets/config.js', lambda r: r.fulfill(content_type='application/javascript', body="window.NM_CONFIG={SUPABASE_URL:'https://stub.test',SUPABASE_ANON_KEY:'anon-key-uji'};"))
        pg.route('http://localhost:8765/uji.html*', lambda r: r.fulfill(content_type='text/html', body=PAGE))
        def rpc(route):
            req = route.request; fn = req.url.split('/rpc/')[1]; body = json.loads(req.post_data or '{}'); calls.append((fn, body, req.headers))
            status, data = handler(fn, body); route.fulfill(status=status, content_type='application/json', body=json.dumps(data))
        pg.route('https://stub.test/rest/v1/rpc/*', rpc); pg.goto('http://localhost:8765/uji.html' + query); pg.wait_for_timeout(700); return pg, calls, errs

    # 1. tanpa token: tidak ada formulir, tidak ada panggilan jaringan
    pg, calls, errs = page('', lambda f, a: (200, None)); check('tanpa token: tidak render & tidak memanggil server', pg.inner_text('#nm-guest') == '' and calls == [])
    pg, calls, errs = page('?t=xyz', lambda f, a: (200, None)); check('token format salah: tidak render & tidak memanggil server', pg.inner_text('#nm-guest') == '' and calls == [])
    # 2. token tidak berlaku (server balas null)
    pg, calls, errs = page('?t=' + TOK, lambda f, a: (200, None)); check('token tidak berlaku: pesan jelas, tanpa formulir', 'tidak berlaku' in pg.inner_text('#nm-guest') and pg.locator('form').count() == 0)
    # 3. token sah: sapaan aman XSS, hanya anon key, RSVP + ucapan
    state = {'n': 0}
    def ok_handler(fn, a):
        if fn == 'guest_open': return 200, {'name': '<img src=x onerror=window.__x=1>Budi'}
        if fn in ('guest_rsvp', 'guest_wish'): return 200, True
        return 200, None
    pg, calls, errs = page('?t=' + TOK, ok_handler)
    check('sapaan tampil sebagai teks (XSS tidak jalan)', '<img src=x' in pg.inner_text('.nmg-h') and pg.evaluate('window.__x') is None and pg.locator('#nm-guest img').count() == 0)
    check('guest_open dipanggil sekali dengan token', [c[0] for c in calls] == ['guest_open'] and calls[0][1] == {'p_token': TOK})
    check('header hanya anon key (bukan service key)', calls[0][2].get('apikey') == 'anon-key-uji')
    pg.check('input[value=ragu]'); check('jumlah tamu disembunyikan jika bukan hadir', pg.locator('#nmg-pax').is_hidden())
    pg.check('input[value=hadir]'); pg.select_option('#nmg-pax', '4'); pg.fill('#nmg-note', 'Insyaallah'); pg.click('text=Kirim Konfirmasi'); pg.wait_for_timeout(400)
    r = [c for c in calls if c[0] == 'guest_rsvp'][0][1]; check('RSVP mengirim status/jumlah/pesan benar', r == {'p_token': TOK, 'p_status': 'hadir', 'p_pax': 4, 'p_message': 'Insyaallah'})
    check('RSVP: pesan sukses', 'Terima kasih' in pg.inner_text('.nmg-s.ok'))
    pg.click('text=Kirim Ucapan'); check('ucapan kosong ditolak di klien', 'dulu' in pg.inner_text('.nmg-card:nth-of-type(2) .nmg-s') and not [c for c in calls if c[0] == 'guest_wish'])
    pg.fill('#nmg-msg', 'Selamat <b>ya</b>'); pg.click('text=Kirim Ucapan'); pg.wait_for_timeout(400)
    check('ucapan terkirim apa adanya & kolom dikosongkan', [c for c in calls if c[0] == 'guest_wish'][0][1]['p_message'] == 'Selamat <b>ya</b>' and pg.input_value('#nmg-msg') == '')
    check('API untuk Live Guest tersedia', pg.evaluate('typeof NMGuest.live') == 'function')
    check('tidak ada galat JS', errs == [])
    pg.screenshot(path='/tmp/claude-0/guest-m.png', full_page=True)
    # 4. batas laju & galat jaringan ditampilkan ramah
    def rl(fn, a):
        if fn == 'guest_open': return 200, {'name': 'Siti'}
        return 400, {'message': 'terlalu_banyak_permintaan'}
    pg, calls, errs = page('?t=' + TOK, rl); pg.fill('#nmg-msg', 'halo'); pg.click('text=Kirim Ucapan'); pg.wait_for_timeout(400)
    check('batas laju: pesan ramah, tombol aktif lagi', 'Terlalu banyak' in pg.inner_text('.nmg-card:nth-of-type(2) .nmg-s.bad') and pg.is_enabled('text=Kirim Ucapan'))
    def down(fn, a):
        return (200, {'name': 'Siti'}) if fn == 'guest_open' else (500, {'message': 'boom internal detail'})
    pg, calls, errs = page('?t=' + TOK, down); pg.click('text=Kirim Konfirmasi'); pg.wait_for_timeout(400)
    t = pg.inner_text('.nmg-card:nth-of-type(1) .nmg-s'); check('galat server: detail internal tidak bocor ke tamu', 'boom' not in t and 'Gagal' in t)
    b.close()
print('SEMUA LULUS' if ok else 'ADA YANG GAGAL'); sys.exit(0 if ok else 1)
