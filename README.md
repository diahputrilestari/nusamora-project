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

## Alur Buat Undangan (paket dulu)
Urutan: `/paket` (1 Pilih Paket) → `/template?paket=` (2 Kategori Acara, lalu 3 Template yang SUDAH difilter menurut paket) → `/buat` (4 Kategori + link `nusamora.com/{slug}`, cek ketersediaan real-time) → `/editor?id=` (5 Isi & Kustomisasi, autosave) → `/preview?id=` (6 Preview) → Publikasikan (7 Ringkasan pesanan + checkout Midtrans) → `/pembayaran?order_id=` (hasil; 9 webhook, 10 URL aktif).
Contoh template publik tanpa login: `/preview?demo={slug-template}`.

Tiga paket = tiga jenis produk dengan editor sendiri:
- **Essential** (2D): palet warna, gaya huruf, teks undangan, musik, komponen (RSVP, buku ucapan, galeri, peta).
- **Signature** (3D Cinematic): scene & background, objek 3D, kamera, animasi & partikel, judul sinematik, musik.
- **Luxe** (3D Live Guest): virtual venue, area (resepsi, kuliner, photo booth, galeri), dekorasi, avatar tamu, fitur interaktif.

Model data: `templates.package_type` + `templates.categories[]` + `templates.capabilities` (pilihan yang boleh dipakai editor) dan `invitations.package_type`. Template hanya muncul untuk paketnya; server menolak template/kategori yang tidak cocok dan menolak kunci konten milik paket lain (`konten_tidak_sesuai_paket`, `opsi_tidak_didukung`). Paket yang ditagih selalu paket milik undangan, bukan kiriman browser.

**Urutan SQL di Supabase SQL Editor (wajib berurutan):** `supabase-schema` → `dashboard-schema` → `admin-schema` → `invitation-schema` → `payment-schema` → **`package-schema` (TERAKHIR)**. `package-schema.sql` aman dijalankan ulang dan memigrasikan data lama (undangan lama dipasangkan ke paket Luxe agar tidak berubah perilaku). Jika salah satu file sebelumnya dijalankan ulang, jalankan `package-schema.sql` sekali lagi sesudahnya, karena fungsi `create_invitation`, `save_invitation`, `publish_issues`, `get_public_invitation`, dan `prepare_checkout` ditimpa olehnya.
Tulis data lewat RPC `slug_available`, `create_invitation`, `save_invitation`; foto ke bucket `invitation-media`.

## Theme & Asset Management (Asset Library + Template Studio)

Menu admin **Asset Library** dan **Manajemen Template > Studio (tab A-D)**. Satu template universal per paket (Essential 2D, Signature 3D Cinematic, Luxe 3D Live Guest); **tema = set aset** yang menimpa aset umum template pada slot yang sama.

**Setup (sekali):**
1. SQL Editor: jalankan `backend/asset-schema.sql` **paling akhir** (setelah `package-schema.sql`). Aman dijalankan ulang; membuat kategori aset per paket, `assets`, `themes`, `template_themes`, `template_assets`, bucket storage `theme-assets`, dan fungsi `admin_*`.
2. Deploy Edge Function pendaftaran aset: `supabase functions deploy asset-register --no-verify-jwt` (memakai `SUPABASE_SERVICE_ROLE_KEY` bawaan Supabase; tidak ada secret baru).
3. `git pull origin landing-page` sebelum deploy.

**Keamanan unggah:** browser hanya boleh menulis ke `theme-assets/incoming/...` (izin `templates.write`). Aset baru masuk library **hanya** lewat `asset-register`, yang memeriksa isi file di server (magic bytes, dimensi, SVG dibersihkan/ditolak jika berskrip, GLB/glTF yang merujuk URL luar ditolak, sha256 untuk deteksi duplikat) sebelum memanggil RPC `admin_register_asset`. File yang gagal validasi langsung dihapus dari storage.

**Aturan:** aset tidak disalin; template mengacu lewat tabel `template_assets` (template, tema, slot, section, posisi, config). Melepas relasi tidak menghapus file. Menghapus aset = soft delete dan, jika masih dipakai, butuh konfirmasi (relasi dilepas, file tetap ada). Slot bersifat bebas (admin menambah kunci slot baru tanpa ubah kode). Renderer 2D memakai posisi/animasi dari `config`; pratinjau Signature/Luxe adalah **simulasi** tata letak, bukan mesin 3D penuh.

## Publikasi & Pembayaran (Midtrans Snap)
Alur: editor (Preview / Publikasikan) → dialog ringkasan paket → Edge Function `midtrans-checkout` → halaman pembayaran Snap → `/pembayaran?order_id=…` (hasil).
Status pembayaran HANYA diubah backend: `midtrans-webhook` (signature_key + verifikasi Status API) dan `midtrans-sync` memanggil `apply_payment` (idempoten). Harga selalu dari tabel `plans`.

**Setup (sekali):**
1. SQL Editor: jalankan `backend/payment-schema.sql`, lalu `backend/package-schema.sql` (terakhir).
2. Instal Supabase CLI, `supabase link --project-ref ixzmogwaaajkyltcnwaf`.
3. Secret (Server Key TIDAK boleh ada di kode/GitHub):
   `supabase secrets set MIDTRANS_SERVER_KEY=SB-Mid-server-xxxx MIDTRANS_IS_PRODUCTION=false ALLOWED_ORIGINS=https://dodgerblue-cod-965274.hostingersite.com,https://nusamora.com`
4. `supabase functions deploy midtrans-checkout midtrans-sync midtrans-webhook --no-verify-jwt`
5. Dashboard Midtrans (Sandbox) → Settings → Configuration → Payment Notification URL:
   `https://ixzmogwaaajkyltcnwaf.supabase.co/functions/v1/midtrans-webhook`
6. (Opsional) jadwalkan `select public.expire_invitations();` tiap hari (pg_cron) untuk menonaktifkan undangan yang masa aktifnya habis.

Paket: Essential = 2D, Signature = 3D cinematic, Luxe = 3D + Live Guest (kolom `plans.allow_3d`, `plans.allow_live_guest`). Data publik undangan lewat RPC `get_public_invitation(slug)`, yang membuang fitur Live Guest bila paket tidak memilikinya.
