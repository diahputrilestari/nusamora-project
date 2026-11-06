# STAGING RUNBOOK — mengulang uji pada Supabase hosted

Tujuan: membuktikan hasil CI pada layanan sungguhan. **Jangan** pakai proyek produksi.

1. Buat proyek Supabase baru "nusamora-staging". Aktifkan MFA TOTP, atur Auth sesuai `RATE-LIMITING.md`.
2. Simpan di GitHub → Settings → Environments → `staging` → Secrets: `STAGING_SUPABASE_URL`, `STAGING_ANON_KEY`, `STAGING_SERVICE_ROLE_KEY`, `STAGING_DB_URL`, `BACKUP_PASSPHRASE`. (Jangan di repo/chat.)
3. Terapkan SQL: `DB_URL=$STAGING_DB_URL ops/stack/apply-sql.sh`; deploy Edge Functions + set secrets (`ENVIRONMENT_SETUP.md`).
4. Jalankan dari `ops/stack/`: `node mfa.mjs`, `node authlimits.mjs` (set `SIGNIN_LIMIT` sesuai dashboard), `node dr.mjs`, lalu CAPTCHA bila diaktifkan.
5. Catat hasil/durasi nyata ke `04-p0-verification-report.md` (kolom "staging hosted"). Pada data/volume sebenarnya ukur RTO.
Catatan: `dr.mjs` menghapus dan memulihkan data — hanya untuk staging.
