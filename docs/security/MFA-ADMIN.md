# MFA Admin & Kebijakan Password Admin (P0.4)

## Cara kerja (ditegakkan di database)
- Admin mendaftarkan MFA **TOTP** (Supabase Auth) di `/admin-keamanan`. Setelah verifikasi, sesi naik ke **aal2** (klaim `aal` di JWT).
- Bila `admin_mfa_required = true`, fungsi `has_perm()` — dipakai oleh seluruh kebijakan RLS & RPC admin — hanya mengembalikan `true` untuk sesi **aal2**. Jadi sesi hanya-password tidak bisa membaca/menulis data admin walau halaman admin diakali dari browser. Edge Function admin (`asset-register`, `asset-generate`) membaca `aal` dari token yang sudah diverifikasi Supabase lalu memanggil `has_perm_session`.
- Kebijakan password admin (`admin_password_policy_required`): password diganti lewat Edge Function `admin-password` (min. 12 karakter, ≥3 jenis karakter, tanpa bagian email/kata umum/pengulangan; pelanggan tetap min. 8 + huruf + angka). Fungsi mencatat `admin_users.password_policy_at`; bila kebijakan wajib, `has_perm()` menolak admin yang belum memilikinya.
- `my_admin()` tetap mengembalikan `role`/`perms` (kunci lama), ditambah objek `mfa` (`required`, `aal`, `enrolled`, `needed`, ...). Bila `needed`, `perms` dikosongkan dan `admin.html` mengarahkan ke `/admin-keamanan`.
- **Default: penegakan MATI.** Tidak ada admin yang terkunci saat file SQL dijalankan.

## Prosedur aktivasi (urutan wajib)
1. Backup DB (`ops/backup/backup-db.sh`). Jalankan `backend/security-schema.sql` lalu `backend/security-mfa.sql`.
2. Deploy: `supabase functions deploy admin-password asset-register asset-generate --no-verify-jwt`.
3. **Setiap admin** (super admin dulu) membuka `/admin-keamanan` → daftarkan autentikator → **daftarkan perangkat kedua** (cadangan) → ganti password sesuai kebijakan.
4. Super admin membuka panel "Penegakan untuk semua admin". Tabel harus menunjukkan semua admin: perangkat ≥ 1 dan password ok. Klik **Aktifkan MFA wajib** (2 kali klik). Sistem menolak otomatis bila ada admin aktif tanpa faktor terverifikasi, atau bila sesi pemanggil belum aal2.
5. Verifikasi: login admin dari jendela privat tanpa MFA → `/admin` mengarah ke `/admin-keamanan`; data admin tidak terbaca.
6. Setelah stabil: aktifkan **kebijakan password wajib** (butuh semua admin sudah mengganti password).

## Admin baru setelah penegakan aktif
`admin_add_admin` menambah admin tanpa MFA/password-policy → admin itu tidak punya akses sampai ia login, mendaftarkan MFA, dan mengganti password. **Celah yang diketahui:** pendaftaran faktor *pertama* dapat dilakukan dengan sesi hanya-password; penyerang yang sudah memegang password admin baru sebelum admin itu mendaftar bisa mendaftarkan faktornya sendiri. Mitigasi: beri tahu admin baru agar mendaftar segera, periksa panel (perangkat tak dikenal), dan `admin_users.active=false` pada akun yang dicurigai.

## Pemulihan (kehilangan perangkat)
1. Gunakan perangkat cadangan (alasan perangkat kedua disarankan).
2. Tanpa cadangan: pemilik proyek Supabase atau super admin lain menghapus faktor lewat Dashboard (Authentication → Users) **[VERIFIKASI menu pada UI Supabase saat ini]** atau `node ops/security/reset-admin-mfa.mjs <email> --yes` (service role dari mesin tepercaya; **belum diuji ke Supabase asli**). Admin lalu mendaftar ulang. Catat di INCIDENT_RESPONSE.md.
3. **Break-glass** bila semua super admin terkunci (hanya pemilik proyek, lewat SQL Editor):
   `update public.security_settings set value='false' where key in ('admin_mfa_required','admin_password_policy_required');`
   Tindakan ini harus dicatat dan segera diikuti pendaftaran ulang MFA lalu pengaktifan kembali.

## Hasil uji aktual (2026-11-06)
- `ops/tests/mfa-db.test.sql` (Postgres 16 lokal, `auth.jwt()`/`auth.mfa_factors` ditiru oleh `ops/tests/mfa-shim.sql`): default mati tidak mengubah perilaku; pengaktifan ditolak tanpa aal2 / bila ada admin tanpa faktor terverifikasi (faktor *unverified* tidak dihitung); setelah aktif: aal1 → `has_perm` false, RLS menyembunyikan baris `audit_logs`, `my_admin.perms` kosong + `needed=true`, aal2 → akses penuh; admin non-super & anon tidak bisa mengubah/melihat pengaturan; pelanggan tetap membaca katalog publik; `has_perm_session` (aal1/null ditolak, aal2 diterima); kebijakan password (admin baru tanpa `password_policy_at` ditolak); penggantian password tidak buntu; perubahan pengaturan tercatat. Kontrol negatif: `has_perm` versi lama membuat uji **gagal** (uji memang menangkap regresi).
- `ops/tests/admin-password.test.mjs` (16): kebijakan, parser `aal`, 401/403/422/429, password tidak ada di event.
- `ops/tests/admin-security.ui.test.js` (26, Chromium + pustaka Supabase palsu): pendaftaran QR/kode, kode salah, tantangan MFA, redirect `next` aman, admin.js mengarahkan saat `needed`, checklist password, panel super admin, HTML ter-escape, tanpa overflow 390px.
- Regresi: `adm` 92/92, `adm2` 50/50, `ui2` 0 gagal dari 254, `assets_test` 47/47, `gen_test` 33/33.

**Belum teruji / asumsi:** perilaku `mfa.enroll/challengeAndVerify/unenroll` dan klaim `aal` pada Supabase Auth sungguhan (diuji hanya dengan tiruan); akses `postgres` ke `auth.mfa_factors` dari fungsi SECURITY DEFINER; menu dashboard untuk hapus faktor; Edge Function `admin-password` yang ter-deploy. Uji menyeluruh di **staging Supabase** dengan akun admin uji wajib sebelum aktivasi di produksi.
