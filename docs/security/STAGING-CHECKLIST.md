# Checklist Kebutuhan Staging (hosted)

Semua uji memakai data staging. **Dilarang** memakai kredensial/proyek produksi. Secret tidak boleh ada di repo atau dikirim lewat chat.

## 1. Supabase staging
- [ ] Proyek baru terpisah (`nusamora-staging`), region sama dengan produksi, tanpa data pelanggan nyata.
- [ ] Plan: catat apakah ada PITR/backup bawaan.
- [ ] Auth: MFA TOTP (enroll+verify) ON; Confirm email OFF di staging agar uji otomatis berjalan (ON di produksi); rate limit sesuai `RATE-LIMITING.md`.
- [ ] CAPTCHA: Turnstile **kunci uji** (secret `1x0000000000000000000000000000000AA`) — bukan kunci produksi.
- [ ] Hook Password verification attempt → `public.hook_password_verification_attempt`.
- [ ] Jalankan `ops/stack/apply-sql.sh` (DB_URL staging), deploy Edge Functions, set secrets fungsi.
- [ ] Buat bucket: invitation-media, site-assets, theme-assets (dibuat SQL repo).
- [ ] Direct DB connection string tersedia (pg_dump/psql, IPv4/pooler).

## 2. GitHub Secrets (Settings → Environments → `staging`; tambahkan required reviewer)
| Secret | Isi |
|---|---|
| STAGING_SUPABASE_URL | https://<ref>.supabase.co |
| STAGING_ANON_KEY | anon/publishable key staging |
| STAGING_SERVICE_ROLE_KEY | service_role staging |
| STAGING_DB_URL | postgresql://… staging |
| BACKUP_PASSPHRASE | passphrase acak ≥32 karakter (khusus staging) |
| STAGING_RATE_LIMIT_SALT | acak ≥32 karakter |
| STAGING_ALLOWED_ORIGINS | origin staging, dipisah koma |
| STAGING_PROJECT_REF | Reference ID proyek staging (pengaman: harus sama dengan ref di URL) |
| STAGING_SUPABASE_ACCESS_TOKEN | Personal Access Token Supabase (untuk deploy Edge Functions); buat di Account > Access Tokens, beri nama `ci-staging`, cabut setelah uji selesai |

Cara mengisi: `gh secret set NAMA --env staging` (nilai dimasukkan interaktif di terminal Anda) atau lewat UI GitHub. Jangan menempel nilainya di chat.

## 3. Midtrans Sandbox (terpisah)
- [ ] Akun Sandbox: Server Key & Client Key Sandbox → secret `STAGING_MIDTRANS_SERVER_KEY`, `STAGING_MIDTRANS_CLIENT_KEY`; `MIDTRANS_IS_PRODUCTION=false`.
- [ ] Notification URL Sandbox → `https://<ref>.supabase.co/functions/v1/<fungsi-webhook>` (staging).
- [ ] Uji: checkout → bayar (simulator) → webhook valid; webhook signature salah ditolak; notifikasi ganda idempoten; CSP Snap diamati Report-Only.

## 4. Hostinger (uji deployment Next.js)
- [ ] Konfirmasi paket mendukung Node.js app (versi ≥20). Jika tidak: Next.js standalone tidak bisa jalan di paket statis — keputusan hosting diperlukan.
- [ ] Subdomain staging (mis. staging.<domain>) terpisah dari produksi.
- [ ] Env: NEXT_PUBLIC_SUPABASE_URL/ANON_KEY staging, NEXT_PUBLIC_SITE_URL, CSP_MODE=report-only.

## 5. Pengecekan sebelum run
- [ ] URL/ref yang dipakai ≠ produksi (verifikasi manual ref proyek).
- [ ] `dr.mjs` hanya dijalankan terhadap staging (skrip menghapus data).
- [ ] Tidak ada MFA wajib/CSP Enforce di produksi.

## 6. Midtrans Sandbox (uji pembayaran)
- Secret GitHub (environment staging): `STAGING_MIDTRANS_SERVER_KEY` = Server Key **Sandbox** (awalan bisa `SB-Mid-server-` atau `Mid-server-`; yang menentukan: diterima API Sandbox). Workflow dan skrip menguji kunci ke API Sandbox Midtrans (kunci Production ditolak 401), tidak bergantung pada awalan.
- Dashboard Midtrans **Sandbox** → Settings → Configuration → Payment Notification URL: `https://<ref>.supabase.co/functions/v1/midtrans-webhook`.
- Urutan fase workflow `staging`: `secrets` → (CAPTCHA harus mati) `midtrans-pay` → bayar manual lewat tautan di log (kartu uji 4811 1111 1111 1114, exp 12/30, CVV 123, OTP 112233) → `midtrans-verify`.
- Client Key tidak dipakai oleh backend (pembayaran memakai Snap redirect).
- Opsional: `STAGING_MIDTRANS_SIGNATURE_KEY` = Signature Secret Key Sandbox (Settings → Access Keys). Dipasang sebagai `MIDTRANS_SIGNATURE_KEY` pada fungsi; webhook menerima signature dari Server Key ATAU Signature Secret Key.
