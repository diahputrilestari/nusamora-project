# Security Headers (P0.2)

| Header | Situs lama (`.htaccess`) | Next.js (`next/`) |
|---|---|---|
| Content-Security-Policy | **Report-Only** (belum memblokir) | **Report-Only** default, bernonce per-request (`src/lib/security/csp.ts`, `src/middleware.ts`); `CSP_MODE=enforce` untuk menegakkan |
| Strict-Transport-Security | `max-age=604800` hanya saat HTTPS | `max-age=604800` hanya `NODE_ENV=production` |
| Anti-framing | `X-Frame-Options: SAMEORIGIN` + `frame-ancestors 'self'` | sama |
| X-Content-Type-Options | `nosniff` (dipertahankan) | `nosniff` |
| Referrer-Policy | `strict-origin-when-cross-origin` (dipertahankan) | sama |
| Permissions-Policy | kamera/mikrofon/geolokasi/payment dimatikan | sama |

## Sumber eksternal yang diizinkan (dari inventaris kode)
jsDelivr (supabase-js 2.58.0), cdnjs (three.js r128, hanya Live Guest), Google Fonts (CSS+font), Supabase (`*.supabase.co`, `wss:`), Midtrans (`app[.sandbox].midtrans.com` untuk skrip/frame, `api[.sandbox].midtrans.com`), Google Maps (frame, bila dipakai), `wa.me` (hanya tautan keluar, tidak perlu diizinkan).

## Hasil uji aktual (2026-11-06, Chromium/Playwright, sandbox tanpa internet luar)
- Situs lama, mode Report-Only: 15 halaman dimuat → **0 pelanggaran**.
- Mode enforce (hanya untuk uji): **0 pelanggaran sah**; kontrol negatif (skrip/fetch/iframe ke `evil.example`) → **3 pelanggaran terdeteksi** (script-src-elem, connect-src, frame-src). Jadi alat uji bekerja.
- **Batas uji:** sandbox tidak bisa memuat CDN/Supabase/Midtrans sungguhan dan tidak login, jadi alur setelah login (dashboard, editor dengan data, redirect pembayaran) belum teruji. Karena itu CSP **tetap Report-Only**. `THREE is not defined` di halaman Live Guest adalah akibat CDN tak terjangkau di sandbox, bukan CSP.
- Next.js: **belum dibangun/diuji** (npm diblokir). Kode CSP: logika `makeNonce/buildCsp/cspHeaderName` dijalankan langsung (nonce unik, `frame-ancestors`, nama header berubah sesuai `CSP_MODE`). Yang BELUM terbukti: next-intl meneruskan header `x-nonce` ke render sehingga skrip inline Next bernonce — jika tidak, akan muncul laporan pelanggaran (tidak memblokir selama Report-Only). Tes e2e baru (`foundation.spec.ts`) memeriksa header dan endpoint `/api/csp-report`.

## Rencana naik ke enforce
1. Deploy (Report-Only) ke staging dan produksi; pantau 7 hari: Next → log server `[csp-violation]`; situs lama → konsol browser (belum ada kolektor).
2. Telusuri alur lengkap sebagai pengguna: daftar, masuk, buat undangan, bayar (Sandbox), dashboard, admin, Live Guest.
3. Perbaiki sumber yang terlewat; bila 0 pelanggaran sah: ganti ke `Content-Security-Policy` (situs lama) / `CSP_MODE=enforce` (Next).
4. HSTS: naikkan bertahap 1 minggu → 1 bulan → 6 bulan; `includeSubDomains` hanya bila semua subdomain HTTPS; preload tidak dipakai.
5. Hapus `'unsafe-inline'` skrip situs lama saat halaman dimigrasi ke Next.js.
