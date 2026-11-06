# Audit Keamanan, Risiko & Disaster Recovery — NusaMora

Status: **AUDIT SAJA (read-only). Tidak ada kode aplikasi yang diubah.** Implementasi menunggu persetujuan.
Metode: pembacaan kode di repo (`supabase/functions`, `backend/*.sql`, `assets/*.js`, `.htaccess`, `vercel.json`). Tidak ada pengujian ke sistem produksi (sandbox tidak dapat menjangkau Supabase/Hostinger/Midtrans). Hal yang butuh pengecekan di dashboard Supabase/Hostinger ditandai **[VERIFIKASI]**. Skala kompleksitas: S (<1 hari), M (1–3 hari), L (>3 hari).

## 1. Arsitektur keamanan saat ini

| Lapisan | Kondisi (bukti) |
|---|---|
| Autentikasi | Supabase Auth; password min. 8 karakter + huruf + angka (`assets/auth.js` `pwOk`). Tidak ada bukti MFA/CAPTCHA. |
| Otorisasi | RLS di semua skema; RPC `SECURITY DEFINER` dengan `has_perm(...)` untuk admin; role admin/super admin via tabel role. Policy `themes`/`template_themes` tulis hanya `has_perm('templates.write')` (asset-schema.sql:170-177). |
| Pembayaran | Edge Function Midtrans: verifikasi signature SHA-512 (timing-safe), re-verifikasi status ke API Midtrans, validasi format order, cek kepemilikan; RPC pembayaran hanya `service_role`. CORS allowlist via `ALLOWED_ORIGINS`. |
| Upload | Validasi server-side di `_shared/assets.ts` (ukuran, magic/isi, checksum dedupe). SVG: denylist regex (`SVG_DANGER`) menolak script/foreignObject/iframe/on*=. |
| Storage | Bucket `invitation-media` baca publik, tulis folder sendiri; `site-assets`, `theme-assets`. |
| Header web | `.htaccess` / `vercel.json`: hanya `X-Content-Type-Options` dan `Referrer-Policy` + cache. |
| Rahasia | Server Key Midtrans/service_role lewat `supabase secrets`; tidak ada di repo (sesuai ketentuan). |
| Data tamu/RSVP/ucapan | Belum ada tabel backend; Buku Tamu/Video di UI masih lokal (demo). Presence Live Guest bergantung `window.claude.use('room')`. |

## 2. Temuan risiko

### P0 — kerjakan sebelum go-live publik

**R1. Tidak ada CSP, HSTS, X-Frame-Options** — *High*
- Bukti: `.htaccess:15-22` hanya nosniff & Referrer-Policy; `vercel.json` sama.
- Dampak: situs bisa di-frame (clickjacking pada login/checkout); tidak ada lapisan kedua jika ada XSS; downgrade HTTP.
- Mitigasi: HSTS, `frame-ancestors 'self'`, CSP bertahap (Report-Only dulu), Permissions-Policy. Di Next.js lewat `next.config.ts` (sebagian sudah ada: nosniff, Referrer, X-Frame, Permissions). Kompleksitas: **M** (CSP butuh inventaris sumber: Supabase, Midtrans Snap, CDN).

**R2. Tidak ada rate limiting / proteksi brute-force di lapisan aplikasi** — *High*
- Bukti: `handlers.ts` tidak memuat logika limit; hanya kuota generate gambar (40/24 jam) di asset-generate. Login, checkout, upload, RSVP/chat (nanti) belum dibatasi.
- Dampak: credential stuffing, spam order Midtrans, abuse biaya (storage/AI).
- Mitigasi: aktifkan rate limit & CAPTCHA bawaan Supabase Auth **[VERIFIKASI]**; tabel `rate_limits` + cek di Edge Function (checkout, register asset, RSVP, chat Live Guest). Kompleksitas: **M**.

**R3. Backup & DR belum ada/terbukti** — *High*
- Bukti: tidak ada dokumen/skrip backup/restore di repo. Tidak diketahui apakah plan Supabase punya PITR **[VERIFIKASI]**.
- Dampak: kehilangan data undangan/pembayaran tanpa jalur pemulihan; target RPO 24 jam / RTO 4 jam tidak terjamin.
- Mitigasi: backup harian `pg_dump` terenkripsi ke penyimpanan terpisah + backup bucket Storage; **uji restore nyata** dan catat hasilnya; dokumen DR/BACKUP_POLICY. Kompleksitas: **M**.

**R4. Akun admin tanpa MFA & kebijakan sesi** — *High*
- Bukti: tidak ada kode/skema MFA; password policy sama dengan pelanggan (8 char).
- Dampak: satu password admin bocor = kendali penuh template, aset, pembayaran.
- Mitigasi: wajibkan MFA (TOTP Supabase) untuk role admin/super admin, password admin ≥12, audit log aksi admin. Kompleksitas: **M**.

### P1

**R5. Sanitasi SVG berbasis denylist regex** — *Medium*
- Bukti: `assets.ts:51-59`. Regex mudah dilewati (entity encoding, `<use href>` ke luar, `style` dengan `url()`). Bucket publik menyajikan SVG langsung → risiko stored XSS bila dibuka sebagai dokumen.
- Mitigasi: sanitasi allowlist (mis. DOMPurify/svg-sanitizer) atau konversi ke raster; sajikan dengan `Content-Disposition`/CSP `sandbox` untuk SVG; hanya admin yang boleh mengunggah SVG (sudah via `has_perm`, **[VERIFIKASI]** untuk upload pelanggan). Kompleksitas: **M**.

**R6. Skrip CDN tanpa SRI** (supabase-js via CDN, Three.js) — *Medium*
- Bukti: `grep integrity= *.html` kosong.
- Dampak: kompromi CDN = eksekusi kode di sesi pengguna/admin.
- Mitigasi: SRI + versi dipin, atau bundel sendiri (otomatis di Next.js). Kompleksitas: **S**.

**R7. Foto undangan di bucket publik** — *Medium (privasi)*
- Bukti: `invitation-media` baca publik. Foto pribadi (prewedding, keluarga) dapat diakses siapa pun yang tahu URL; tidak ada penghapusan otomatis setelah undangan kedaluwarsa.
- Mitigasi: nama objek tidak dapat ditebak (UUID), kebijakan retensi/hapus saat akun dihapus, opsi signed URL untuk undangan privat. Kompleksitas: **M**.

**R8. Data pribadi & kepatuhan (UU PDP/GDPR)** — *Medium*
- Bukti: tidak ada kebijakan privasi/ToS di repo, tidak ada alur ekspor/hapus akun, tidak ada consent untuk data tamu.
- Mitigasi: halaman Privacy/Terms, fitur hapus & ekspor data, daftar pemroses (Supabase, Midtrans, Hostinger), retensi log. Kompleksitas: **M–L**.

**R9. Fitur Live Guest (RSVP/chat/presence) belum punya backend aman** — *Medium (risiko di masa depan)*
- Bukti: tidak ada tabel RSVP/guestbook; presence via `window.claude`.
- Mitigasi (saat Tahap 5): channel Realtime per undangan dengan token tamu, validasi & batas panjang pesan, rate limit, moderasi/report, sanitasi output. Kompleksitas: **L**.

**R10. Tidak ada monitoring/alerting & health check** — *Medium*
- Bukti: tidak ada konfigurasi uptime/log/error tracking; endpoint `/api/health` baru ada di scaffold Next.js (belum terverifikasi).
- Mitigasi: uptime monitor eksternal, Sentry-sejenis, alert webhook Midtrans gagal, log Edge Function. Kompleksitas: **M**.

### P2

**R11. Idempotensi webhook** — *Low–Medium*: tinjau `apply_payment` agar notifikasi ganda tidak menggandakan aktivasi (verifikasi status & kepemilikan sudah baik). **S**, perlu uji dengan Midtrans Sandbox.
**R12. Audit dependensi/SCA** — *Low*: belum dapat dijalankan (registry npm diblokir sandbox); jalankan `npm audit` di CI. **S**.
**R13. Variabel CORS bila kosong** — *Low*: fungsi menolak (500) bila `ALLOWED_ORIGINS` kosong — aman, tetapi dokumentasikan di DEPLOYMENT_CHECKLIST. **S**.
**R14. `localStorage` untuk musik/QRIS demo** — *Low*: hanya preferensi non-sensitif; pastikan tidak ada token/data pribadi. **S**.
**R15. Keamanan migrasi** — *Medium*: URL undangan lama harus tetap hidup; tag rollback, staging terpisah, jangan hapus file lama sebelum regresi lulus. Sudah sesuai rencana migrasi; tambahkan tag git per tahap. **S**.

## 3. Hal yang sudah baik (pertahankan)
Verifikasi signature & status Midtrans; RPC pembayaran hanya `service_role`; RLS + `has_perm`; CORS allowlist; validasi upload server-side & dedupe checksum; kuota generate AI; tidak ada secret di repo; admin write policy terbatas.

## 4. Usulan urutan implementasi (setelah disetujui)
1. **Fase A (P0)**: header keamanan (R1) → rate limit & CAPTCHA (R2) → MFA admin (R4) → backup + uji restore (R3).
2. **Fase B (P1)**: SVG allowlist (R5), SRI/bundel (R6), retensi & privasi (R7, R8), monitoring (R10).
3. **Fase C**: keamanan Live Guest (R9) bersamaan Tahap 5 migrasi; P2.
4. **Dokumen** (operasional, bukan template kosong): SECURITY.md, INCIDENT_RESPONSE.md, DISASTER_RECOVERY.md (RPO 24 j / RTO 4 j), BACKUP_POLICY.md, DEPLOYMENT_CHECKLIST.md, ACCESS_CONTROL.md, ENVIRONMENT_SETUP.md.

## 5. Keterbatasan audit ini
Berbasis kode, bukan uji penetrasi. Tidak memeriksa konfigurasi live (Supabase Auth settings, plan/backup, Hostinger, Midtrans dashboard) — butuh konfirmasi Anda untuk item **[VERIFIKASI]**. Dependency audit belum dapat dijalankan.
