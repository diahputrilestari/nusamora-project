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

## Dashboard Pelanggan (`/akun`)

Setelah login, pelanggan diarahkan ke `/akun`. Menu: Dashboard, Undangan Saya, Invoice, Tutorial, Affiliate, History Bonus, History Penarikan, Edit Profil, Log Out (rute hash: `/akun#undangan`, dst.). File: `akun.html`, `assets/dashboard.css`, `assets/dashboard.js`.

Data dibaca dari Supabase (hanya milik pengguna sendiri, via RLS). Jalankan `backend/dashboard-schema.sql` setelah `supabase-schema.sql`. Tanpa tabel itu, dashboard tetap tampil dengan keadaan kosong. Penulisan data (undangan, paket, invoice, saldo) sengaja tidak dibuka untuk browser; itu dikerjakan backend tepercaya.

## Admin Dashboard (`/admin`)

14 modul (Dashboard, Pelanggan, Undangan, Template, Live Guest, Transaksi, Paket & Harga, Konten, Affiliate, Support, Laporan, Notifikasi, Pengaturan, Admin & Role). File: `admin.html`, `assets/admin.css`, `assets/admin.js`. Semua data berasal dari Supabase.
RBAC ditegakkan di database (RLS + fungsi `has_perm`), bukan hanya di tampilan. Peran: super_admin, admin, finance, support, content. Setiap perubahan tercatat otomatis di `audit_logs` (trigger).

Mengaktifkan:
1. Jalankan `backend/admin-schema.sql` (setelah dua skema sebelumnya) di Supabase SQL Editor.
2. Daftarkan akun Anda di `/daftar`, lalu jalankan baris terakhir file SQL itu (bagian "Admin pertama") dengan email Anda untuk menjadi super_admin.
3. Buka `/admin`. Admin lain ditambahkan dari menu Admin & Role.

Belum terhubung: pembayaran Midtrans otomatis (webhook & refund dana), pengiriman email/WhatsApp, dan pembacaan harga/template oleh landing page. Semuanya membutuhkan layanan di sisi server.
