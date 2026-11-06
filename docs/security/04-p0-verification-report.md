# Laporan Verifikasi P0 — NusaMora (`security/p0`)

Tanggal: 2026-11-06. **Status keseluruhan: P0 BELUM production-ready.** Seluruh uji integrasi berjalan pada **stack Supabase lokal nyata di GitHub Actions** (GoTrue, PostgREST, Storage, Edge Runtime, Postgres 17 dari Supabase CLI) — **bukan** proyek Supabase hosted (belum ada proyek/kredensial staging). Midtrans tidak diuji (tidak ada kunci Sandbox).

## Bukti (run GitHub Actions)
- `next-ci` #42170637508: **sukses**, 15/15 Playwright.
- `supabase-stack` #42169517483: **sukses** (MFA, batas Auth, backup/DR, CAPTCHA).

## 1. Implemented
Foundation Next.js; MFA admin + gerbang persetujuan faktor pertama; kebijakan password admin; rate limit `rl_hit`; lockout per-akun (Auth Hook); upload quota; header legacy & CSP bernonce Next; backup/restore terenkripsi + SHA-256 (DB & Storage); skrip reset MFA; 5 dokumen operasional + runbook.

## 2. Tested locally (sandbox)
Unit/DB/UI: rate-limit DB & handler, MFA SQL (shim), admin-password, UI admin-security (26), mock Storage (122/122), restore atomik pada Postgres 16.

## 3. Tested on real services (stack lokal nyata di CI — bukan hosted)
| Area | Hasil |
|---|---|
| Foundation | npm install, build, TS strict, standalone, env-less server: lulus; Playwright 15/15 |
| MFA | **48/48 PASS** (S1–S10): enrollment, TOTP, aal1/aal2, login password-saja vs setelah MFA, RLS, Edge Function 401/403, penegakan, persetujuan faktor pertama, tidak bisa menyetujui diri sendiri / non-super, lintas-akun ditolak, reset MFA, break-glass, password policy |
| Lockout Auth | 5 gagal → akun terkunci (password benar pun ditolak) & tercatat; akun lain di IP sama tetap bisa login; kunci berakhir → pulih; 8 pengguna sah dari 1 IP semua berhasil; reset-password dibatasi |
| CAPTCHA (Turnstile test secret) | signUp/login/reset tanpa token ditolak; dengan token diterima |
| Backup/DR | lihat tabel di bawah |
| CSP Next.js | nonce pada semua `<script>` = nonce header, berbeda tiap permintaan; 0 pelanggaran CSP di browser untuk `/id`, `/en`, 404 |

### Metrik backup/restore (data uji, bukan produksi)
| Metrik | Nilai |
|---|---|
| Data seed | 26 akun, 39 tabel, 525 baris, 91 berkas, 9.544.040 B |
| Waktu backup DB / Storage | 0,27 s / ~0,8 s |
| Waktu restore DB / Storage / total | 0,26 s / 1,12 s / **1,37 s** |
| Ukuran backup DB (terenkripsi) / Storage | 245.792 B / 9.565.851 B |
| Berkas dipulihkan | 91/91, SHA-256 identik |
| Selisih baris & md5 isi sebelum vs sesudah | **0** (kecuali `security_events`/`rate_limits`, memang berubah) |
| Relasi berkas↔pemilik akun | 0 yatim; profil↔auth.users utuh; login+TOTP lama valid setelah restore |
| Negatif | passphrase salah & arsip rusak ditolak sebelum menyentuh DB; arsip terenkripsi tidak memuat email |

**RPO 24 j / RTO 4 j: BELUM terbukti.** Prosedur terbukti benar pada data kecil; RTO nyata harus diukur di staging hosted dengan volume sebenarnya, RPO butuh backup harian terjadwal (belum aktif).

## 4. Passed
Semua butir §3 di atas.

## 5. Failed / temuan
- **Batas per-IP bawaan GoTrue tidak teramati** (tanpa 429 untuk sign-in/refresh/OTP/signup pada konfigurasi lokal, `sign_in_sign_ups=20`). Belum bisa diklaim berfungsi; kontrol efektif yang terbukti = lockout per-akun + CAPTCHA. Harus dikonfirmasi di dashboard hosted.
- Bug yang ditemukan lalu diperbaiki selama verifikasi: restore `--clean` merusak hook & tidak atomik; Storage restore salah MIME; **nonce tidak diterapkan** karena halaman statis (diperbaiki: render dinamis + 404 lewat catch-all); `apply-sql.sh` rusak oleh pipefail. Semuanya kini lulus di CI.

## 6. Not tested
- Proyek Supabase **hosted** (semua uji di atas diulang di sana — lihat STAGING-RUNBOOK.md).
- CSP situs **legacy** (login/register/dashboard/editor/preview/admin, Storage) pada layanan nyata; CSP **Midtrans Snap** (tanpa Sandbox key); alur Next selain halaman publik (belum ada: dashboard/editor/admin ada di legacy).
- Pengaturan dashboard Supabase hosted (CAPTCHA site key, rate limit) — didokumentasikan, belum diterapkan.
- Widget CAPTCHA di form login legacy (belum diintegrasikan; default mati).
- Backup terjadwal, restore skala produksi, hosting Next.js di Hostinger.

## 7. Production deployment required
Jalankan SQL `security-schema` & `security-mfa` (setelah staging hosted lulus); deploy Edge Functions + secrets; konfigurasi Auth (RATE-LIMITING.md); setujui lalu aktifkan MFA wajib (DEPLOYMENT_CHECKLIST §E); jadwalkan backup. **Tidak ada yang diaktifkan di produksi**; MFA wajib & CSP Enforce menunggu persetujuan Anda.

## 8. Remaining risks
Batas per-IP belum terbukti; CSP legacy/Midtrans belum diverifikasi (tetap Report-Only); RTO/RPO belum terbukti; ketergantungan operator pada passphrase backup & service_role; P1 (SVG allowlist, SRI, retensi/privasi, monitoring) belum dikerjakan. Keputusan produk terbuka: deteksi bahasa `/`→`/en` untuk browser en-US.

## Rekomendasi berikutnya
1. Buat proyek Supabase staging + secrets GitHub `staging`; jalankan ulang suite (runbook).
2. Terapkan konfigurasi Auth dashboard; ukur 429 nyata.
3. Uji alur legacy + Midtrans Sandbox dengan CSP Report-Only; tinjau laporan.
4. Aktifkan backup harian; ukur RTO pada data nyata.
5. Setelah itu: persetujuan Anda untuk MFA wajib & Tahap 2. P1 dan Tahap 2 **belum dimulai**.
