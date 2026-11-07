# Laporan Verifikasi P0 — NusaMora (`security/p0`)

Tanggal: 2026-11-06 (stack lokal) dan 2026-11-07 (**Supabase hosted staging**, lihat bagian A). **Status keseluruhan: P0 BELUM production-ready.** Uji pertama berjalan pada stack Supabase lokal di GitHub Actions; uji kedua pada proyek Supabase **hosted** `nusamora-staging` (plan Free, Postgres 17.11). Midtrans Sandbox, CSP di domain staging, dan deployment Hostinger belum diuji.

## Bukti (run GitHub Actions)
- `next-ci` #42170637508: **sukses**, 15/15 Playwright.
- `supabase-stack` #42169517483: **sukses** (MFA, batas Auth, backup/DR, CAPTCHA).

## A. Hasil di Supabase HOSTED staging (run `staging` #5 prepare, #6 verify; commit f856916)
Lingkungan: proyek `nusamora-staging` (organisasi plan **Free**), runner GitHub (Azure US) → Supabase region ap-southeast-1 lewat Session pooler. Data uji saja; produksi tidak disentuh.

| Area | Hasil nyata |
|---|---|
| Rantai SQL (9 file) + ulang idempoten | **Lulus** (34 tabel `public`; 3 file terakhir rc=0 dijalankan ulang) |
| Deploy Edge Functions + secrets | **Lulus** — 6 fungsi ACTIVE (admin-password, asset-generate, asset-register, midtrans-checkout, midtrans-sync, midtrans-webhook). Midtrans Server Key belum diatur → fungsi Midtrans belum diuji |
| MFA (S1–S10) | **48/48 PASS** pada GoTrue/PostgREST/Edge hosted: enrollment, TOTP, aal1/aal2, login password-saja vs setelah MFA, RLS, Edge 401/403, penegakan, persetujuan faktor pertama (tidak bisa menyetujui diri sendiri/non-super), reset MFA, break-glass, password policy |
| Backup/restore DB+Storage | **Lulus**, selisih sidik jari 0, 91/91 berkas SHA-256 identik, 0 yatim, login+TOTP lama valid, passphrase salah & arsip rusak ditolak |
| Rate limit per IP | **Teramati 429 di hosted** (berbeda dari stack lokal): sign-in mulai diblok pada permintaan ke-30 (sesuai batas 30/5 mnt), verifyOtp ke-32, reset password 429 beruntun |
| Lockout per akun (Auth Hook) | **TIDAK TERSEDIA** — Password Verification Attempt hook butuh plan Team/Enterprise (dropdown dashboard menolak di plan Free). Terukur: 6 password salah lalu password benar tetap **berhasil** → tidak ada lockout per akun |
| CAPTCHA, CSP domain staging, Midtrans Sandbox, Hostinger | **Belum diuji** |

### Metrik backup/restore pada hosted (334 baris, 39 tabel, 91 berkas, 9,5 MB)
| Metrik | Hosted | (lokal CI) |
|---|---|---|
| Backup DB | 61,3 s | 0,27 s |
| Backup Storage | 196,2 s | 0,8 s |
| Restore DB | 23,5 s | 0,26 s |
| Restore Storage | 150,2 s | 1,1 s |
| Total pemulihan (DB+Storage) | **173,7 s (2,9 menit)** | 1,4 s |
| Ukuran backup DB (terenkripsi) / Storage | 235.552 B / 9.565.851 B | |
| Selisih baris / sidik jari | 0 / 0 | |

**Evaluasi RPO/RTO (berdasarkan angka ini, bukan klaim tercapai):**
- Biaya Storage terukur ≈ 2,2 dtk/berkas (backup) dan ≈ 1,65 dtk/berkas (restore), berurutan (tanpa paralel), dari runner di AS ke Singapura. Ekstrapolasi kasar: restore **~8.700 berkas ≈ 4 jam** → **RTO 4 jam tidak aman jika jumlah foto undangan mencapai puluhan ribu**, kecuali restore diparalelkan (belum diimplementasikan) dan dijalankan dekat region database. Biaya DB lebih kecil tetapi didominasi latensi jaringan, bukan ukuran.
- Pada volume sekarang (pengujian), pemulihan ±3 menit: RTO 4 jam **layak untuk skala kecil**, belum terbukti untuk skala produksi.
- **RPO 24 jam** tetap belum terpenuhi karena backup harian terjadwal belum aktif; plan Free tidak menyediakan PITR/backup harian yang dapat diunduh (perlu verifikasi di dashboard).

### Temuan baru dari hosted
1. **Auth Hook tidak tersedia di plan Free** → kontrol lockout per akun yang dibangun dan terbukti di stack lokal tidak dapat diaktifkan. Keputusan pemilik: tetap Free, andalkan rate limit per IP + CAPTCHA + MFA admin + password kuat. **Risiko diterima: penebakan password pelanggan dari banyak IP tidak dikunci per akun.**
2. **signUp terkena 429 sejak permintaan ke-3 dan reset password 429 beruntun**: konsisten dengan batas email bawaan Supabase (2/jam, SMTP bawaan). Pada produksi ini dapat **menolak pendaftaran/reset pelanggan sah**. **Wajib memasang SMTP kustom sebelum go-live.**
3. refreshSession 429 sejak permintaan pertama: kemungkinan jendela 5 menit sudah terpakai oleh uji MFA/DR sebelumnya dari IP runner yang sama (belum dipastikan terpisah).
4. Tidak teramati: login sah dari akun lain langsung setelah banjir tidak diblokir — namun runner berbagi IP, sehingga efek IP bersama pada pengguna sah di hosted belum dapat disimpulkan dari satu pengukuran.

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
