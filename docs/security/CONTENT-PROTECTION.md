# Perlindungan konten & aset

Prinsip: **perlindungan sebenarnya ada di server.** Pemblokiran klik kanan/Inspect hanya penghalang UX; browser tidak bisa mencegah inspeksi atau unduhan.

## Yang diterapkan (server)
| Lapisan | Perubahan | Bukti uji |
|---|---|---|
| Web root | `.htaccess` (dan `vercel.json`) memblokir `backend/ ops/ docs/ source/ builder/ supabase/ next/ .git/ .github/`, `README.md`, `*.sql *.md *.py *.mjs *.ts *.toml *.yml *.map`, dan daftar direktori tanpa `index.html` (mis. `/assets/`). Repo dideploy apa adanya ke web root, jadi sebelumnya tidak ada yang menghalangi. | `ops/tests/htaccess-check.sh` pada Apache asli (CI `content-protection`): 19 jalur 403, 13 jalur publik tetap 200, URL bersih, header keamanan/cache utuh |
| Storage | SELECT publik pada `site-assets`, `theme-assets`, `invitation-media` dicabut (memungkinkan `list()` = enumerasi folder/ID pengguna dan nama file). URL objek publik tetap dilayani. Diperbaiki di sumber `asset-schema.sql`, `admin-schema.sql`, `invitation-schema.sql` dan `content-protection.sql`. | `ops/stack/content-protection.mjs` (Supabase nyata): anon/pengguna lain tidak bisa list; URL publik tetap 200; pemilik tetap bisa list/unggah folder sendiri |
| Aset berbayar | Bucket privat `premium-assets` (path `premium/...`), RPC `premium_asset_path` (hanya `service_role`), Edge Function `asset-url` (signed URL ≤10 menit, rate limit per IP, respons 404 seragam). `get_template_assets` tidak lagi mengembalikan URL aset premium. | Stack nyata: undangan draft/kedaluwarsa/paket salah/template lain ditolak; signed URL valid → 200, token palsu ditolak, kedaluwarsa ditolak. `ops/tests/asset-url.test.mjs` (13) |
| Rahasia | Tidak ada secret di repo (pemindaian pola kunci umum). `config.js` hanya berisi URL + anon key (publik by design, dilindungi RLS). `service_role`/`MIDTRANS_SERVER_KEY` hanya di secrets Edge Function. | Pemindaian manual, bukan jaminan |

## Yang diterapkan (klien, hanya penghalang)
`assets/protect.js`, aktif bila `<html data-protect="on|demo">`: beranda dan demo Live Guest. **Tidak** dipasang di editor, dashboard, admin, form, dan alur pembayaran (diuji). Memblokir: klik kanan (kecuali kolom isian, tautan, teks terseleksi), F12, Ctrl/Cmd+U/S, Ctrl+Shift+I/J/C, drag dan seleksi gambar. Tidak memblokir: salin teks, cetak, Ctrl+F/A/C/P, navigasi keyboard, zoom. Watermark `nusamora.com` (tile SVG, `aria-hidden`, tidak menangkap klik, hilang saat cetak) pada pratinjau template dan halaman demo.

## Batasan (jujur)
- Halaman demo Live Guest menanam asetnya di dalam HTML (±21 MB); siapa pun tetap bisa mengunduhnya. Hanya penghalang.
- Aset Luxe yang **sudah ada** di `theme-assets` (bucket publik) belum dipindah. Mekanisme privat sudah siap tetapi belum dipakai: perlu (1) dukungan unggah ke `premium-assets` di Asset Library admin, (2) migrasi data aset yang ada, (3) halaman tamu Luxe yang memanggil `asset-url`. Semuanya butuh persetujuan karena mengubah data produksi.
- Watermark tidak dibakar ke piksel gambar; kartu template yang dimuat dinamis dari database belum diberi watermark.
- `.htaccess` diuji pada Apache; belum diuji pada server Hostinger yang sebenarnya.
- Aplikasi `next/` memakai header sendiri dan tidak dicakup perubahan ini.

## Operasional
1. Terapkan `backend/content-protection.sql` (sudah ada di `ops/stack/apply-sql.sh`) setelah skema lain. Jalankan ulang skema lain tidak lagi membuka SELECT publik.
2. Deploy fungsi: `supabase functions deploy asset-url --no-verify-jwt`.
3. Uji sebelum produksi: `ops/tests/htaccess-check.sh` dan `ops/stack/content-protection.mjs`.
