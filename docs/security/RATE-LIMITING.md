# Rate Limiting & Proteksi Brute-Force (P0.3)

## Apa yang dibatasi dan di mana
| Endpoint | Siapa menegakkan | Batas | Kunci |
|---|---|---|---|
| Login | **Supabase Auth** (+ hook `hook_password_verification_attempt`) | hook: 5 gagal/15 mnt → tolak 15 mnt per akun; batas IP Auth: lihat tabel pengaturan | akun / IP |
| Registrasi, reset password, OTP/email | **Supabase Auth** (rate limit bawaan + CAPTCHA) | lihat tabel pengaturan | IP / email |
| Checkout (`midtrans-checkout`) | Edge Function + `rl_hit` | 120/10 mnt per IP (sebelum Auth), 20/10 mnt per pengguna | IP, user id (di-hash) |
| Sync pembayaran (`midtrans-sync`) | Edge Function | 30/10 mnt per pengguna | user id |
| Webhook Midtrans | tanda tangan SHA-512 + verifikasi API; signature palsu **dicatat** (maks 5/10 mnt/IP) | tidak dibatasi (IP Midtrans bersama; dilindungi signature) | IP |
| Registrasi aset admin (`asset-register`) | Edge Function | 60/10 mnt per admin | user id |
| Generate AI (`asset-generate`) | Edge Function + kuota 40 gambar/24 jam yang sudah ada | 10/menit per admin | user id |
| Unggah foto pelanggan (`invitation-media`) | **Kebijakan Storage** (SQL) | 40 berkas/jam, 400 total per pengguna; 3 MB & MIME dibatasi di bucket | folder = user id |
| Live Guest (RSVP/chat/presence) | **belum ada backend** — wajib memakai `rl_hit` saat dibangun (Tahap 5) | — | — |

Penting: login/registrasi/reset dikirim browser **langsung ke Supabase Auth**, bukan lewat server NusaMora, sehingga batasnya hanya bisa ditegakkan oleh Supabase Auth. Di Next.js (Tahap 2+) alur ini bisa dipindah ke route handler agar memakai `rl_hit` + CAPTCHA kita sendiri.

## Mekanisme
- `public.rl_hit(key, limit, window, kind)` (`backend/security-schema.sql`): jendela tetap, atomik (kunci baris), hanya `service_role`.
- **Cooldown eskalatif**: pelanggaran ke-1/2 → blok sampai jendela habis; ≥3 jendela beruntun melanggar → blok `min(1 jam, jendela × n)`. Jendela bersih mereset.
- **Shared IP / proxy**: batas IP sengaja longgar (120 vs 20 per pengguna) agar kantor/WiFi bersama tidak saling mengunci; batas ketat memakai identitas pengguna. IP diambil dari `cf-connecting-ip` (bukan `X-Forwarded-For` yang bisa dipalsukan klien) lalu `X-Forwarded-For` hop pertama.
- **Privasi**: kunci = SHA-256(`RATE_LIMIT_SALT`|scope|subjek); IP/ID mentah tidak disimpan. Event keamanan 90 hari, `rate_limits` dibersihkan 2 hari.
- **Logging mencurigakan**: tabel `security_events` (kind: `rate_limited:*`, `cooldown`, `webhook_bad_signature`, `login_lockout`), satu catatan per jendela; terbaca oleh admin dengan izin `admins.read`. Tidak ada password/token/kartu/signature di event. (Juga dihapus: log lama `webhook_ditolak` yang memuat panjang & 7 karakter awal Server Key.)
- **Gagal-buka**: bila DB limiter tak terjangkau, permintaan tetap dilayani dan `rate_limit_error` dicatat di log fungsi.
- Respons terblokir: HTTP 429, `Retry-After`, JSON `{error:"terlalu_banyak_permintaan", message}` (pesan Indonesia, ditampilkan apa adanya oleh front-end yang sudah ada).

## Langkah aktivasi (oleh pemilik)
1. Backup (`ops/backup/backup-db.sh`), lalu jalankan `backend/security-schema.sql` di SQL Editor (setelah `asset-schema.sql`; aman diulang).
2. `supabase secrets set RATE_LIMIT_SALT=<acak 32+ karakter>`
3. Deploy ulang: `supabase functions deploy midtrans-checkout midtrans-sync midtrans-webhook asset-register asset-generate --no-verify-jwt`
4. Dashboard → Authentication → **Rate Limits**: set sesuai tabel; → **Attack Protection**: aktifkan CAPTCHA (Turnstile/hCaptcha) untuk sign-in/sign-up/reset (butuh perubahan form auth.html — belum dikerjakan) **[VERIFIKASI ketersediaan per paket]**.
5. Dashboard → Authentication → **Hooks** → Password verification attempt → `public.hook_password_verification_attempt` **[VERIFIKASI: hook ini bergantung paket]**.

Rekomendasi pengaturan Auth (nilai awal, sesuaikan): email dikirim ≤ 4/jam (pantau SMTP), sign-in/up per IP ≤ 30 per 5 menit, token refresh per IP ≤ 150/5 menit, verifikasi OTP ≤ 30/5 menit.

## Hasil uji aktual (2026-11-06, Postgres 16 lokal + Node)
- `ops/tests/rate-limit-db.test.sql`: batas, isolasi kunci, jendela baru, cooldown eskalatif, argumen tak valid, hak akses (anon/authenticated ditolak memanggil `rl_hit`/membaca tabel), hook lockout (5 gagal → tolak, password benar tetap ditolak saat terkunci, pulih setelah kunci habis, log) — semua lulus.
- Konkurensi: 60 panggilan paralel (30 proses) dengan batas 20 → tepat **20 diizinkan**, 40 ditolak.
- Kuota unggah Storage: 45 percobaan → 40 berhasil, 5 ditolak; folder pengguna lain ditolak; pulih setelah 1 jam (disimulasikan).
- `ops/tests/rate-limit-handlers.test.mjs` (13 pemeriksaan): 429 + Retry-After + CORS, batas per pengguna vs IP bersama, banjir tanpa token berhenti sebelum memanggil Auth, fail-open, sync, webhook palsu dicatat ≤5 tanpa rahasia, kunci ter-hash — lulus.
- Regresi: `assets_test` 47/47, `gen_test` 33/33 (stub `rl_hit`), uji signature webhook lulus.
**Belum teruji:** Edge Function yang ter-deploy di Supabase sungguhan (tidak ada Deno/akses di sandbox), perilaku Auth rate limit/CAPTCHA/hook (konfigurasi dashboard), `cf-connecting-ip` pada runtime nyata.


## Catatan hosted (2026-11-07, plan Free)
- Password Verification Attempt hook **tidak tersedia** (butuh Team/Enterprise): lockout per akun tidak aktif. Kontrol yang berlaku: batas per-IP Supabase (sign-in 30/5 mnt teramati memblok), CAPTCHA (belum diuji hosted), MFA admin, password kuat.
- SMTP bawaan membatasi email 2/jam → pendaftaran/reset dapat 429. Pasang SMTP kustom sebelum go-live.
