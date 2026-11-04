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

## Alur Buat Undangan
`/template` (pilih kategori & template) → `/buat` (kategori + link `nusamora.com/{slug}`, cek ketersediaan real-time) → `/editor?id=` (draft, autosave).
Backend: jalankan `backend/invitation-schema.sql` SETELAH `dashboard-schema.sql` dan `admin-schema.sql`. Semua tulis lewat RPC `slug_available`, `create_invitation`, `save_invitation`; foto ke bucket `invitation-media`.

## Publikasi & Pembayaran (Midtrans Snap)
Alur: editor (Preview / Publikasikan) → dialog ringkasan paket → Edge Function `midtrans-checkout` → halaman pembayaran Snap → `/pembayaran?order_id=…` (hasil).
Status pembayaran HANYA diubah backend: `midtrans-webhook` (signature_key + verifikasi Status API) dan `midtrans-sync` memanggil `apply_payment` (idempoten). Harga selalu dari tabel `plans`.

**Setup (sekali):**
1. SQL Editor: jalankan `backend/payment-schema.sql` (setelah 3 skema sebelumnya).
2. Instal Supabase CLI, `supabase link --project-ref ixzmogwaaajkyltcnwaf`.
3. Secret (Server Key TIDAK boleh ada di kode/GitHub):
   `supabase secrets set MIDTRANS_SERVER_KEY=SB-Mid-server-xxxx MIDTRANS_IS_PRODUCTION=false ALLOWED_ORIGINS=https://dodgerblue-cod-965274.hostingersite.com,https://nusamora.com`
4. `supabase functions deploy midtrans-checkout midtrans-sync midtrans-webhook --no-verify-jwt`
5. Dashboard Midtrans (Sandbox) → Settings → Configuration → Payment Notification URL:
   `https://ixzmogwaaajkyltcnwaf.supabase.co/functions/v1/midtrans-webhook`
6. (Opsional) jadwalkan `select public.expire_invitations();` tiap hari (pg_cron) untuk menonaktifkan undangan yang masa aktifnya habis.

Paket: Essential = 2D, Signature = 3D cinematic, Luxe = 3D + Live Guest (kolom `plans.allow_3d`, `plans.allow_live_guest`). Data publik undangan lewat RPC `get_public_invitation(slug)`, yang membuang fitur Live Guest bila paket tidak memilikinya.

## Template 2D Essential (`nusa-essential`)
Halaman publik `nusamora.com/{slug}` dirender oleh `undangan.html` + `assets/invite/` (tanpa Supabase SDK, ringan untuk tamu dari WhatsApp):
- `data.js` — ambil undangan (`get_public_invitation`), normalisasi `invitations.content`, kirim RSVP/ucapan. `?to=Nama` = nama tamu, `?preview=<id>` = pratinjau pemilik (sesi login), `?demo=1&theme=sage` = demo galeri template.
- `themes.js` — tema warna (marun, sage, navy, blush, batak dengan ilustrasi di `art/batak`) + ornamen SVG. `motion.js` — reveal, parallax, kelopak, animasi huruf, gulir otomatis (menghormati prefers-reduced-motion).
- `essential.js` + `essential.css` — section: cover, hero, salam, mempelai, hitung mundur, acara (multi), love story, galeri + lightbox, RSVP, hadiah (multi rekening, salin), ucapan, penutup, dock navigasi, musik.
- Template 2D baru cukup mendaftar ke `NMInvite.templates["slug"]` dan `ESSENTIAL` di `assets/flow.js`. Template tanpa renderer sendiri memakai tampilan Essential.

Editor (`/editor`) menampilkan bagian tambahan untuk template ini: Mempelai, Acara lainnya, Love Story, Hadiah, Tema, dan Tamu & Ucapan (link tamu + WhatsApp, rekap RSVP, sembunyikan ucapan).

**Setup:** jalankan `backend/essential-schema.sql` SETELAH `payment-schema.sql` (tabel `rsvps`, `wishes`, RPC `submit_rsvp`, `submit_wish`, `list_wishes`, `set_wish_hidden`, validasi foto tambahan di `save_invitation`, baris template). Routing slug: `vercel.json` (rewrites) dan `.htaccess` sudah diatur; file/halaman yang ada tetap didahulukan.
