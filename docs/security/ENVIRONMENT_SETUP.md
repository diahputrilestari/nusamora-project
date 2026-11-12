# ENVIRONMENT SETUP

## Lingkungan
| Lingkungan | Tujuan | Catatan |
|---|---|---|
| Lokal | pengembangan | `cd next && npm ci && npm run dev` |
| CI (GitHub Actions) | `next-ci`, `supabase-stack` (Supabase lokal nyata via CLI) | tanpa secret produksi |
| Staging (hosted Supabase) | uji integrasi sebelum produksi | **belum dibuat** — lihat STAGING-RUNBOOK.md |
| Produksi | pengguna nyata | hanya setelah checklist |

## Variabel — Next.js (`next/.env.example`)
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (publik, aman), `NEXT_PUBLIC_SITE_URL`, `CSP_MODE` (`report-only` | `enforce`). Tidak ada service_role di Next.

## Secrets Edge Function (`supabase secrets set …`)
`ALLOWED_ORIGINS`, `MIDTRANS_SERVER_KEY`, `MIDTRANS_IS_PRODUCTION`, `MIDTRANS_SIGNATURE_KEY` (bila dipakai), `RATE_LIMIT_SALT`. `SUPABASE_URL/ANON_KEY/SERVICE_ROLE_KEY` disuntik platform.

## Operator (tidak pernah di repo)
`BACKUP_PASSPHRASE_FILE`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_URL` — simpan di password manager / GitHub Environment `staging` (secrets).

## Menjalankan uji
- Next: `cd next && npm ci && npx playwright install --with-deps chromium && npm run build && npx playwright test`
- Stack nyata: workflow `supabase-stack` (lihat header workflow) — butuh Docker + Supabase CLI.
- Unit lokal: `cd ops && npm i && node --test` / skrip di `ops/tests/`.

## Hosting
Situs legacy di Hostinger (statis + `.htaccess`). Next.js (folder `next/`, output standalone) belum di-deploy; kecocokan paket Hostinger untuk Node **belum diverifikasi**.
