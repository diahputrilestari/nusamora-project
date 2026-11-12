# DEPLOYMENT CHECKLIST (staging → produksi)

Tanda ✅ = sudah diuji di CI/stack lokal; ☐ = harus dikerjakan/diuji di Supabase **hosted** oleh pemilik.

## A. Sebelum menyentuh produksi
- ☐ Proyek Supabase **staging** hosted dibuat; secrets CI diset (lihat STAGING-RUNBOOK.md) dan workflow dijalankan terhadapnya.
- ✅ Rantai SQL berurutan + dijalankan ulang (idempoten) lolos: `ops/stack/apply-sql.sh`.
- ☐ Backup penuh produksi + uji restore ke staging **sebelum** migrasi.

## B. Urutan SQL produksi (setelah persetujuan)
`supabase-schema → dashboard → admin → invitation → payment → package → asset → security-schema → security-mfa` (jalankan ulang `security-mfa.sql` bila `admin-schema.sql` dijalankan ulang).

## C. Edge Functions & secrets
- Deploy: `admin-password`, `asset-register`, `asset-generate`, dan fungsi existing. Pastikan `verify_jwt=false` untuk `admin-password` sesuai `supabase/config.toml`.
- Produksi: **SMTP kustom wajib** (SMTP bawaan 2 email/jam menolak pendaftaran/reset sah); Notification URL Midtrans Production → proyek produksi, tidak dicampur dengan Sandbox/staging; `ALLOWED_ORIGINS` berisi domain nyata (bila tidak, halaman finish Midtrans gagal); tinjau/batasi jejak `webhook_trace`; Signature Secret Key Midtrans bila akun memakainya.
- Secrets: `ALLOWED_ORIGINS` (wajib; kosong → 500), `MIDTRANS_SERVER_KEY`, `MIDTRANS_IS_PRODUCTION`, `RATE_LIMIT_SALT` (acak ≥32 karakter), kunci AI bila dipakai.

## D. Supabase Auth (dashboard) — lihat RATE-LIMITING.md
- ☐ Authentication → Rate Limits: sign-in/sign-up/email sesuai tabel; ☐ CAPTCHA (Turnstile) aktif + site key di `NM_CONFIG`; ☐ Hooks → Password verification attempt → `public.hook_password_verification_attempt`; ☐ MFA TOTP enroll+verify ON; ☐ Confirm email ON; ☐ Site URL/redirect allowlist.

## E. Penegakan MFA (hanya dengan persetujuan)
1. Semua admin daftar TOTP; super admin lain menyetujui. 2. Simpan `reset-admin-mfa.mjs` & prosedur break-glass. 3. Super admin (aal2) memanggil `admin_set_security(true, …)`.

## F. Header & CSP
- Legacy: `.htaccess` tetap **Report-Only**; tinjau laporan sebelum Enforce.
- Next.js: `CSP_MODE=report-only`; ganti `https://*.supabase.co` dengan host proyek bila ingin lebih ketat; Enforce hanya setelah laporan bersih untuk semua alur, termasuk Midtrans Snap (belum diuji).

## G. Backup terjadwal
- ☐ Cron/Action harian `backup-db.sh` + `backup-storage.mjs`, passphrase di secret store, salinan di penyimpanan terpisah, uji restore berkala.

## H. Pasca-rilis
Pantau `security_events`, log Edge Function, tes login admin aal1/aal2, satu pembayaran Sandbox end-to-end.
