# SECURITY — Ringkasan Kontrol Keamanan NusaMora

Dokumen ini hanya memuat yang **benar-benar ada di kode** (cabang `security/p0`). Status pengujian ada di `04-p0-verification-report.md`.

## Kontrol & lokasi
| Area | Implementasi | Berkas |
|---|---|---|
| Otorisasi | RLS + RPC `SECURITY DEFINER` memakai `has_perm()` | `backend/*.sql` |
| MFA admin (TOTP) | `has_perm()` mensyaratkan `aal2` + `mfa_approved_at` saat `admin_mfa_required=true`; persetujuan faktor pertama oleh super admin lain | `backend/security-mfa.sql`, `assets/admin-security.js` |
| Kebijakan password admin | ≥12 karakter, ≥3 kelas, tanpa kata umum/bagian email; via Edge Function `admin-password` | `supabase/functions/_shared/adminpw.ts` |
| Rate limit aplikasi | `rl_hit()` (Postgres, jendela tetap + cooldown bertingkat, kunci di-hash) pada checkout, sync, upload, generate, admin-password | `backend/security-schema.sql`, `_shared/ratelimit.ts` |
| Lockout login per-akun | Auth Hook `hook_password_verification_attempt` (5 gagal/15 mnt) — per akun, bukan per IP | `backend/security-schema.sql` |
| Header web (legacy) | HSTS, X-Frame-Options, Permissions-Policy, CSP **Report-Only** | `.htaccess` |
| Header + CSP bernonce (Next.js) | middleware membuat nonce per-permintaan; `CSP_MODE=report-only` default | `next/src/middleware.ts`, `next/src/lib/security/csp.ts` |
| Pembayaran | verifikasi signature Midtrans + re-verifikasi status; RPC pembayaran hanya `service_role` | `supabase/functions/_shared/handlers.ts` |
| Backup/DR | `pg_dump` + Storage manifest, AES-256 + SHA-256 | `ops/backup/` |

## Aturan wajib
- Tidak ada secret di repo (service_role, Midtrans Server Key, passphrase backup, `RATE_LIMIT_SALT`).
- Penegakan MFA (`admin_set_security`) dan CSP Enforce **tidak** diaktifkan di produksi tanpa persetujuan tertulis pemilik.
- Perubahan SQL dijalankan dulu di staging; produksi hanya setelah checklist `DEPLOYMENT_CHECKLIST.md`.

## Pelaporan kerentanan
Kirim ke pemilik proyek (email kontak pemilik NusaMora); jangan membuka issue publik berisi detail eksploit. Insiden: ikuti `INCIDENT_RESPONSE.md`.

## Batasan yang diketahui (jujur)
- Batas per-IP bawaan Supabase Auth tidak teramati (tidak ada 429) pada stack lokal; wajib dikonfirmasi di dashboard hosted.
- CSP situs legacy dan alur Midtrans belum diuji terhadap layanan nyata; masih Report-Only.
- SVG masih denylist (P1), SRI belum ada (P1).
