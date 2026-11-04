# NusaMora

- `/` landing page (`index.html`, `assets/landing.css`, `assets/landing.js`), dibangun dari `builder/build_landing.py` (`python3 builder/build_landing.py project .`).
- `/live/` demo Live Guest tema Romantic Garden, `/live/jawa-tengah` tema Adat Jawa Tengah. Kode sumber Live Guest di `source/`.
- Konfigurasi CTA: di `assets/landing.js`, isi `APP.signup`, `APP.login`, `APP.whatsapp` bila sudah ada. Kosong = dialog informasi.
- Domain canonical dan OG memakai `https://nusamora.com` (ubah `SITE` di builder bila berbeda).
- Deploy: Vercel static, `cleanUrls` aktif.

## Akun pengguna (daftar, masuk, lupa kata sandi)

Halaman: `/daftar`, `/masuk`, `/lupa-password`, `/atur-password`, `/akun`. Dibuat oleh `builder/build_auth.py`, logika di `assets/auth.js`.
Backend memakai Supabase (Auth + Postgres, skala terkelola). Cara mengaktifkan:

1. Buat project di supabase.com, lalu jalankan `backend/supabase-schema.sql` di SQL Editor (tabel `profiles` + RLS + trigger).
2. Authentication > Providers > Email: aktifkan "Confirm email". Authentication > URL Configuration: isi Site URL dan Redirect URLs dengan domain Anda (`https://dodgerblue-cod-965274.hostingersite.com/**`, lalu `https://nusamora.com/**`).
3. Isi `SUPABASE_URL` dan `SUPABASE_ANON_KEY` di `assets/config.js` (anon key memang publik; jangan pernah memasukkan service_role key).
4. Sebelum peluncuran: atur SMTP sendiri (Authentication > SMTP), karena email bawaan Supabase dibatasi jumlahnya.
