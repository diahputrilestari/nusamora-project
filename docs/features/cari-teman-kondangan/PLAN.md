# Cari Teman Kondangan — Audit & Rencana Implementasi

Status: **RENCANA, belum ada kode fitur.** Dasar: spesifikasi pemilik (2026-11-07). Cabang: `feature/cari-teman-kondangan` (dari `security/p0`).
Tagline: "Datang Sendiri, Pulang Siapa Tahu Berdua." 💗

## 1. Temuan audit (fakta dari repo)

| Area | Kondisi nyata | Dampak ke fitur |
|---|---|---|
| **Live Guest** | Satu berkas 3D statis (`source/` → `live/*.html`). Memakai `window.claude.use('db'\|'room'\|'user'\|'downloads')` — **API platform Claude, bukan Supabase**. Di luar platform itu (Hostinger) ia jatuh ke "mode lokal: hanya Anda". Tidak ada `supabase` di `live/*.html`. | Live Guest **tidak punya backend, akun tamu, presence nyata, maupun chat**. "Jumlah peserta aktif" dan "status online" tidak bisa diambil dari Live Guest. Harus dibangun di Supabase. |
| **Realtime** | **Tidak dipakai** di mana pun (`.channel(` / `realtime` tidak ada di `assets/` dan `supabase/functions`). | Realtime Supabase adalah infrastruktur **baru** untuk proyek ini (bukan "reuse"). Perlu diuji di staging; batas plan Free perlu diverifikasi. |
| **Auth** | Supabase Auth; `profiles` (full_name, whatsapp, terms_accepted_at) dibuat trigger `handle_new_user`. Pengguna sekarang = **pemilik undangan** (pelanggan). **Tamu tidak punya akun.** | Perlu identitas tamu. Satu `auth.users` dipakai bersama; peran dibedakan oleh data, bukan tabel auth baru. |
| **Event** | Tidak ada tabel "event"; **`invitations`** adalah event (id, status, expires_at, plan_id, slug). `get_public_invitation(slug)` RPC publik. | "Event yang sama" = `invitation_id` yang sama. Peserta hanya boleh bergabung ke undangan `aktif` dan berpaket Live Guest. |
| **Paket** | `plans.allow_live_guest` (Luxe). | Fitur dibatasi paket Luxe (usul; lihat §9). |
| **Admin/RBAC** | `admin_users`, `role_permissions`, `has_perm(p)` (+ syarat MFA aal2 bila aktif), `audit_logs`, Edge `admin-password`. | Izin baru `dating.*` lewat `role_permissions`; akses investigasi via audit log. |
| **Keamanan P0 yang bisa dipakai** | `rl_hit` (rate limit atomik), `security_events`, Edge handlers testable (`_shared/handlers.ts` + `Deps`), CSP Report-Only, CAPTCHA (Turnstile), MFA admin, pola SQL idempoten. | Dipakai ulang; tidak membuat sistem baru. |
| **UI/Design** | Situs lama vanilla JS + HTML; token lavender (`--bg #faf7ff`, `--accent #6a34b6`, `--accent2 #8c5ad6`, `--soft #efe6fc`, `--line #e4d9f6`) di `assets/*.css`; avatar chibi dari Asset Library (`guest-avatar`). Next.js baru fondasi halaman publik. | UI dibangun mengikuti pola situs lama (tidak bergantung Next.js/Hostinger Node yang belum terbukti). |
| **Tes** | `ops/tests` (SQL/Node), suite stack nyata `ops/stack` (CI `supabase-stack`, hosted `staging`), Playwright (Next e2e; skrip `csp-legacy.mjs`). | Tes fitur memakai kerangka ini; tidak membawa framework baru. |
| **SMTP** | Bawaan Supabase 2 email/jam. | **Pendaftaran tamu massal mustahil** tanpa SMTP kustom (sudah wajib untuk produksi). |

Tidak ada mock data pengganti backend: semua data fitur di Supabase.

## 2. Keputusan arsitektur (usul)

1. **Backend di Supabase existing**: tabel + RLS + fungsi RPC `security definer` untuk semua operasi sensitif (usia, consent, like→match, kirim pesan, block, report). Klien tidak boleh insert langsung ke like/match/message.
2. **Tanpa `service_role` di klien.** Edge Function hanya bila perlu (mis. notifikasi/pembersihan terjadwal).
3. **Identifikasi lawan bicara memakai `profile_id` buram** (bukan `auth.users.id`) → mencegah enumerasi dan manipulasi `user_id`.
4. **Discover lewat RPC** yang hanya mengembalikan kolom aman (nama panggilan, umur, kota, bio, minat, avatar). Tidak pernah mengembalikan tanggal lahir, email, telepon, alamat, auth id.
5. **Realtime**: `postgres_changes` pada `dating_messages` (RLS berlaku) + Presence untuk status online per percakapan/event.
6. **UI**: halaman statis baru di situs lama (`/cari-teman/...`) memakai `assets/dating.js|css`, dibuka dari menu Live Guest dan halaman undangan. Integrasi ke dalam scene 3D ditunda (P2: Single Guest Lounge).
7. **Modular**: setiap kemampuan tambahan (quiz, ice breaker, lounge, mini games, event matching lintas event) = modul terpisah dengan tabel/fungsi sendiri; MVP hanya matching dalam satu `invitation_id`.

## 3. Rancangan schema (migrasi: `backend/dating-schema.sql`, idempoten, dijalankan setelah `security-*.sql`)

Semua tabel: **RLS aktif**, `revoke all from anon, authenticated` lalu hak minimum lewat policy/RPC. FK `on delete cascade` ke `auth.users` / `invitations`.

| Tabel | Kolom penting | Constraint / indeks |
|---|---|---|
| `dating_profiles` | `id uuid pk` (buram), `user_id uuid unique → auth.users`, `nickname` 2–30, `birth_date date`, `gender` (`pria\|wanita\|lainnya\|tidak_menyebut`), `city`, `avatar_id → assets`, `bio` ≤300, `interests text[]` ≤10, `education`, `occupation`, `intent` (`teman_baru\|teman_dekat\|hubungan_serius`), `created_at/updated_at` | `check (birth_date <= current_date - interval '18 years')` **di DB**; panjang teks dibatasi; indeks `(city)`, GIN `(interests)` |
| `dating_consents` | `id`, `user_id`, `version text`, `age_confirmed bool`, `single_declared bool`, `privacy_accepted bool`, `accepted_at`, `withdrawn_at`, `ip_hash` | Append-only; hanya consent terbaru tak-ditarik yang berlaku. IP disimpan **hash** (pola `RATE_LIMIT_SALT`) |
| `dating_event_settings` *(tambahan; dibutuhkan untuk "aktif/nonaktif per event" dan batas)* | `invitation_id pk`, `enabled bool default false`, `like_limit_per_day int default 30`, `profile_ttl_days int default 7` | Diubah pemilik undangan / admin; default **mati** |
| `dating_event_participants` | `id`, `invitation_id`, `profile_id`, `status` (`aktif\|jeda\|sembunyi\|ditangguhkan\|keluar`), `joined_at`, `expires_at` | `unique (invitation_id, profile_id)`; indeks `(invitation_id, status)` |
| `dating_likes` | `id`, `invitation_id`, `from_profile`, `to_profile`, `kind` (`like\|pass`), `created_at` | `unique (invitation_id, from_profile, to_profile)`; `check (from_profile <> to_profile)`; indeks `(to_profile, kind)` |
| `dating_matches` | `id`, `invitation_id`, `profile_a`, `profile_b` (urut `a<b`), `status` (`aktif\|unmatch\|diblokir`), `matched_at`, `unmatched_by` | `unique (invitation_id, profile_a, profile_b)`; `check (profile_a < profile_b)` → tak bisa duplikat |
| `dating_conversations` | `id`, `match_id unique`, `last_message_at` | 1 percakapan per match |
| `dating_messages` | `id`, `conversation_id`, `sender_profile`, `body` ≤1000 (teks polos), `kind` (`user\|system`), `created_at`, `read_at` | indeks `(conversation_id, created_at)`; **insert hanya via RPC** |
| `dating_blocks` | `blocker`, `blocked`, `created_at` | `pk (blocker, blocked)`; blokir = dua arah di semua RPC (discover, like, pesan) |
| `dating_reports` | `id`, `reporter`, `reported`, `invitation_id`, `reason` (enum), `detail` ≤500, `status` (`baru\|ditinjau\|peringatan\|ditangguhkan\|ditolak\|selesai`), `reviewer`, `evidence jsonb` (cuplikan pesan **dibekukan saat lapor**), `created_at/resolved_at` | Admin membaca bukti laporan, **bukan** seluruh chat |
| `dating_notifications` *(P1)* | `id`, `profile_id`, `kind`, `data`, `read_at` | RLS pemilik |
| `dating_chat_access_log` *(P1)* | `id`, `admin_id`, `report_id`, `reason`, `granted_until`, `created_at` | Akses investigasi di luar bukti laporan: wajib alasan, berbatas waktu, tercatat di `audit_logs` |

RPC (semua `security definer`, `set search_path = public`, `auth.uid()` dari JWT — tidak menerima `user_id` dari klien): `dating_join(invitation_id, consent…)`, `dating_upsert_profile(...)`, `dating_set_status(...)`, `dating_discover(invitation_id, filter jsonb, cursor)`, `dating_like(invitation_id, to_profile)`, `dating_pass(...)`, `dating_my_matches()`, `dating_send_message(conversation_id, body)`, `dating_mark_read(conversation_id)`, `dating_unmatch(match_id)`, `dating_block(profile_id)`, `dating_report(...)`, `dating_delete_my_profile()`, `dating_stats(invitation_id)` (peserta aktif untuk landing). Pembatasan laju lewat `rl_hit` (like per hari sesuai `dating_event_settings`, pesan per menit, discover per menit).

**Aturan server yang wajib:** usia ≥ 18 dihitung di DB dari `birth_date` (join dan update profil); consent terbaru wajib; undangan harus `aktif`, berpaket Live Guest, `enabled`; profil tak muncul di discover tanpa consent + status `aktif` + belum kedaluwarsa + tidak diblokir (dua arah) + bukan diri sendiri; pesan hanya jika match `aktif` dan tak ada blokir; like ganda ditolak oleh constraint; mutual match dibuat atomik (kunci advisory pada pasangan) lalu membuat percakapan + pesan sistem.

## 4. RLS (ringkas)
- `dating_profiles`: pemilik baca/ubah profil sendiri; profil orang lain **hanya lewat RPC discover/match** (kolom terbatas).
- `dating_consents`, `dating_likes`: pemilik baca miliknya; tulis hanya RPC.
- `dating_matches`, `dating_conversations`, `dating_messages`: hanya dua anggota match (select); Realtime mengikuti policy ini; tulis hanya RPC.
- `dating_blocks`: pemilik. `dating_reports`: pelapor baca laporan sendiri; admin dengan `has_perm('dating.moderate')` (+MFA) baca/ubah status.
- `dating_event_settings`: pemilik undangan & admin ubah; peserta hanya melihat `enabled` lewat RPC.
- Tidak ada policy yang mengizinkan admin membaca `dating_messages` secara bebas.

## 5. Keamanan & privasi (pemetaan ke persyaratan)
18+ (server) → check DB + RPC; consent eksplisit tercatat → `dating_consents`; tidak muncul tanpa consent → filter discover; tanpa email/telepon/alamat → kolom tidak ada di profil & discover; chat setelah match → RPC + RLS; block dua arah → semua RPC; report + workflow → `dating_reports` + status; rate limit → `rl_hit`; spam/scraping → batas discover + cursor + tanpa total hitungan presisi bocor; XSS → pesan/bio disimpan teks polos, dirender `textContent`; manipulasi `user_id` → tidak ada parameter `user_id`; RLS semua tabel; tanpa `service_role` di klien; penghapusan profil → `dating_delete_my_profile()` menghapus profil, like, match, pesan terkait; **status single = deklarasi pengguna, tidak pernah diklaim terverifikasi** (teks UI & kebijakan privasi). Retensi: profil kedaluwarsa `profile_ttl_days` setelah acara; pembersihan terjadwal (pg_cron/Edge) — dirancang di P1.
Data sensitif (tanggal lahir, gender, kota, bio): perlu pembaruan Kebijakan Privasi (UU PDP) sebelum produksi — **keputusan/penulis hukum di pemilik**.

## 6. UI (9 halaman, token lavender; chibi dari Asset Library)
Landing, Create/Edit Profile, Discover (+filter), Profile Detail, Mutual Match Modal ("It's a Match!"), Match List (pesan terakhir, unread, online), Private Chat (emoji, timestamp, read status, unmatch/block/report), User Settings, Admin Management (P1). Semua punya loading/empty/error/success. Responsif desktop/tablet/mobile (diuji Playwright pada 3 viewport).

## 7. Tahapan
**P0 (MVP)** — 1) schema + RLS + RPC; 2) usia + consent; 3) profil; 4) discover + filter; 5) like + mutual match; 6) private chat realtime (emoji, timestamp, read, unmatch); 7) block + report (**laporan tersimpan + status; antrean admin minimal via RPC**, UI admin penuh di P1).
**P1** — admin moderation penuh (+ akses investigasi berbatas/beralasan/audit), ice breaker, notifikasi, compatibility quiz, retensi/pembersihan.
**P2** — Single Guest Lounge (venue 3D), mini games, lintas event.
*Catatan konflik spesifikasi:* P0 mensyaratkan "Report memiliki moderation workflow", sedangkan "Admin moderation" ada di P1 → P0 mengerjakan data+status+RPC moderasi; **UI** admin di P1. Ice breaker dan pesan pembuka: pesan sistem pembuka masuk P0 (satu baris netral); ice breaker interaktif di P1.

## 8. Rencana pengujian (kerangka existing)
- **SQL/DB** (`ops/tests/dating-db.test.sql`): usia 17/18/dewasa, consent wajib, duplikat like, duplikat match, `a<b`, cascade hapus, RLS per tabel (anon, pengguna lain, peserta event lain).
- **Stack nyata** (`ops/stack/dating.mjs`, CI `supabase-stack` + `staging`): alur penuh pengguna A/B/C, filter, mutual match atomik di bawah paralelisme, otorisasi chat (non-anggota, setelah unmatch/block), rate limit, **Realtime** (pesan diterima klien lawan, tidak diterima non-anggota), laporan + status, penghapusan profil.
- **UI** (Playwright seperti `csp-legacy.mjs`): 3 viewport, state loading/empty/error, tanpa pelanggaran CSP, XSS payload di bio/pesan tampil sebagai teks.
- Tidak ada klaim selesai sebelum seluruh tes lulus di CI dan di staging hosted.

## 9. Keputusan yang dibutuhkan dari pemilik (memblokir implementasi)
1. **Identitas tamu**: wajib akun Supabase Auth? Usul: email+kata sandi (konfirmasi email) + CAPTCHA; membutuhkan **SMTP kustom** (sudah wajib untuk produksi). Alternatif: magic link / Google / anonymous (tidak disarankan untuk dating).
2. **Pintu masuk**: P0 lewat tombol di menu Live Guest/halaman undangan yang membuka `/cari-teman` (Live Guest 3D sendiri tidak punya backend). Setuju?
3. **Paket & siapa yang mengaktifkan**: hanya Luxe? Usul: **opt-in pemilik undangan** (default mati) + admin dapat menonaktifkan.
4. **Avatar**: chibi dari Asset Library saja (tanpa unggah foto) untuk MVP? Usul: ya (risiko privasi/moderasi foto jauh lebih kecil).
5. **Gender & filter**: pilihan `pria/wanita/lainnya/tidak menyebut` dan filter gender saja; **tidak** mengumpulkan orientasi seksual. Setuju?
6. **Hukum/privasi**: pembaruan Kebijakan Privasi (UU PDP), teks consent, retensi 7 hari pasca-acara — siapa yang menyetujui?
7. **Moderasi**: siapa yang meninjau laporan dan target waktunya?
8. Batas **Realtime plan Free** (koneksi bersamaan/pesan per detik) perlu diverifikasi di dashboard staging sebelum acara besar.

## 10. Risiko
Live Guest tanpa backend (cakupan membesar); SMTP bawaan 2/jam; Realtime baru & batas plan; data sensitif (UU PDP); penyalahgunaan (pelecehan, penipuan, scraping) → mitigasi blokir/laporan/rate limit/tanpa kontak langsung; deklarasi usia/status tidak terverifikasi (ditulis jelas, tidak diklaim); moderasi butuh manusia.

## Status P0 (diperbarui 2026-11-07)
- Backend: lulus (DB 10/10; stack 24/24 termasuk balapan like dan Realtime).
- UI: `/cari-teman` (landing, profil+persetujuan, jelajah+filter, match modal, daftar match, chat realtime, pengaturan, panel pemilik). Uji Chromium 42/42 di stack Supabase lokal nyata (CI run 42374036558).
- Temuan: tabel `assets` hanya terbaca admin, sehingga pilihan avatar memakai RPC `dating_avatar_options` (RLS tidak dilonggarkan).
- Belum: uji di Supabase staging yang di-host; uji di perangkat nyata/Safari/Firefox; tombol masuk dari halaman Live Guest (demo Live Guest statis tanpa id undangan, jadi pemilik membagikan tautan `/cari-teman?e=<id>` dari Pengaturan); gambar thumbnail avatar (asset saat ini model 3D); teks kebijakan privasi UU PDP; custom SMTP.
- P1/P2 belum dimulai.
