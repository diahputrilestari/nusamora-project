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

**Tema untuk pelanggan:** pelanggan memilih tema di langkah *Pilih Template* (`get_template_themes`), tersimpan di `invitations.theme_key` lewat `set_invitation_theme`. Renderer undangan membaca aset lewat `get_template_assets(slug, tema)` (aset tema menimpa aset umum pada slot yang sama). Halaman tamu `nusamora.com/{slug}` yang merender aset ini belum dibangun.

**AI Asset Generator (tambahan, opsional):** tab *AI Generator* di Asset Library. Tidak mengasumsikan provider: tanpa konfigurasi, UI menampilkan "belum dikonfigurasi". Untuk mengaktifkan: `supabase secrets set AI_PROVIDER=openai OPENAI_API_KEY=... [AI_IMAGE_MODEL=gpt-image-1]` lalu `supabase functions deploy asset-generate --no-verify-jwt`. Kunci hanya dibaca di server. Provider baru = tambah adapter `ImageProvider` di `supabase/functions/_shared/ai.ts`. AI hanya membuat gambar (kategori PNG/JPG/WebP), maks. 40 gambar/24 jam per admin; hasil harus dipilih dan disimpan, lewat validator `asset-register` yang sama.

### Avatar mempelai pilihan pelanggan

Di editor undangan (semua paket) ada bagian **Avatar Mempelai**: pelanggan memilih avatar mempelai pria dan wanita. Pilihannya adalah aset yang diunggah admin dan dipetakan ke template **dan tema** undangan itu (tema menimpa aset umum), jadi tiap tema punya avatar sendiri. Tidak ada data contoh: bila admin belum memetakan avatar, editor menampilkan pesan kosong.

Cara admin menyiapkannya: unggah avatar dengan peran yang benar, lalu petakan ke slot template/tema di Template Studio (tab B).

| Paket | Peran aset (isian saat unggah) | Slot saran |
|---|---|---|
| Essential | Karakter = Mempelai pria / Mempelai wanita | `groom_illustration`, `bride_illustration` |
| Signature | Peran model = Avatar mempelai pria / wanita | `avatar_groom`, `avatar_bride` |
| Luxe | Peran avatar = Pengantin pria / Pengantin wanita | `avatar_groom`, `avatar_bride` |

Beberapa pilihan = beberapa aset dengan peran yang sama pada slot berbeda (slot kustom, mis. `avatar_groom_2`). Avatar tamu (Luxe: Tamu pria/wanita/umum) tidak termasuk pilihan ini.

Backend: RPC `template_avatar_options(slug, tema)` (membaca `get_template_assets`), kunci konten `avatars.groom` / `avatars.bride` (berisi `slot_key`), dan `save_invitation` memvalidasi slot hanya bila nilainya berubah. Preview undangan menampilkan avatar terpilih. Jalankan ulang `backend/asset-schema.sql` (paling akhir).

### Impor avatar bawaan template Jawa Tengah

Avatar tamu laki-laki template **Adat Jawa Tengah** (7 avatar, sebelumnya hanya tertanam di demo Live Guest) diimpor ke Asset Library dan slot `avatar_male` lewat `backend/seed-jawa-tengah-avatars.sql` (jalankan setelah `asset-schema.sql`, idempoten). Gambarnya ada di `assets/avatars/jawa-tengah/guest-male/` dan disimpan sebagai URL relatif `/assets/...` (ikut domain situs). Avatar wanita, pengantin pria dan pengantin wanita template yang sama dapat diimpor dengan cara yang sama.

### Form aset per paket (modular)

Form **Unggah aset**, **detail aset**, **picker slot** dan **pengaturan aset di Template Studio** berubah otomatis mengikuti paket yang dipilih. Semua definisinya ada di satu file konfigurasi: `assets/asset-forms.js` (`window.NM_ASSET_FORMS`).

| Paket | Jenis aset | Pengaturan |
|---|---|---|
| Essential (2D) | background per section, ilustrasi pengantin & karakter, dekorasi/ornamen/bunga/frame/border, animasi GIF/Lottie | posisi %, lebar, skala, rotasi, layer (z), opasitas, animasi |
| Signature (3D cinematic) | model GLB/glTF, texture & material, background/environment, kamera & efek, musik | posisi XYZ, rotasi XYZ, skala, bayangan, animasi objek, shot kamera; layout: cahaya & kamera scene |
| Luxe (3D live guest) | background virtual venue (PNG/JPG/WebP/GLB), model venue & area interaktif, avatar (pria/wanita/pengantin/tamu), furniture & dekorasi, interactive objects, asset mini games | posisi, collision, interaksi, kunci mini game; layout: kapasitas, collision bawaan, titik spawn |

Menambah kategori/field/slot **tanpa mengubah komponen**: edit `asset-forms.js` (grup `groups`, `fields`, `slots`, `config`, `layout`). Kategori baru di database ditambah lewat modul *Aset > Kategori Aset* atau `asset_categories` di `asset-schema.sql`.

Isian khusus jenis aset (mis. `avatar_role`, `model_role`, `map_type`) disimpan di kolom `assets.attrs` (jsonb, divalidasi `asset_attrs_clean`: kunci `[a-z][a-z0-9_]{0,29}`, nilai string/angka/boolean, maks. 20 kunci). Konfigurasi aset per template tetap di `template_assets.config`, dan pengaturan scene/venue di `layout`. Unggah banyak file sekaligus didukung; aset dapat dipakai ulang dari Asset Library. Jalankan ulang `backend/asset-schema.sql` (idempoten) lalu deploy ulang `asset-register`:

```
supabase functions deploy asset-register --no-verify-jwt
```


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

## Undangan 2D universal (engine + tema)
Semua undangan paket Essential yang templatenya bertanda `capabilities.engine = "universal-2d"` dirender satu engine di `nusamora.com/{slug}`; tampilannya ditentukan paket tema.
- `undangan.html` memuat `assets/invite/core/`: `data.js` (ambil & normalisasi undangan, RSVP/ucapan), `theme.js` (muat & terapkan paket tema), `motion.js` (reveal, parallax, partikel, animasi huruf, gulir otomatis; menghormati prefers-reduced-motion), `engine.js` + `engine.css` (semua section dan interaksi).
- Paket tema di `assets/invite/themes/<id>/`: warna, font (termasuk font aksara lain), ornamen bawaan atau file, transisi cover, urutan section, teks, backdrop pemandangan, dan slot ilustrasi. Panduan: `assets/invite/themes/README.md`.
- Tema bawaan: Marun Songket, Sage Garden, Biru Malam, Blush Rose, Batak Ulos, Korean Royal Wedding, Javanese Wedding, Chinese Wedding, serta tema ulang tahun Istana Pink, Dino Adventure, dan Metal Rock Party (tema gelap). Teks bawaan engine menyesuaikan kategori (pernikahan atau acara satu orang seperti ulang tahun).
- Alur paket tetap sama (`/paket` → `/template` → `/buat` → `/editor` → `/preview`). Untuk template engine, editor Essential menampilkan Tema Undangan, Mempelai, Acara lainnya, Love Story, Hadiah Digital, dan Tamu & Ucapan; `/preview` menampilkan engine asli di dalam bingkai desktop/ponsel.
- Konten disimpan dengan kunci paket Essential: `design2d.theme`, `texts.quote/quoteSource/closing`, `sections`, `gift.address`, ditambah `couple`, `events`, `story`, `accounts`.
- URL: `?to=Nama` = nama tamu, `?preview=<id>` = pratinjau pemilik, `?demo=1&theme=<id>` = demo tema.

**Setup:** setelah `asset-schema.sql`, jalankan `backend/essential-schema.sql` (RSVP, ucapan, kunci konten engine, validasi foto; menimpa `pkg_keys` dan `save_invitation`) lalu `backend/themes-seed.sql` (tema sebagai template Essential). Jika `package-schema.sql` atau `asset-schema.sql` dijalankan ulang, jalankan ulang kedua file ini. Routing slug sudah diatur di `vercel.json` dan `.htaccess`.
