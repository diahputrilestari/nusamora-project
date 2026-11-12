# INCIDENT RESPONSE

Tingkat: **S1** data bocor/pembayaran dimanipulasi/akun admin diambil alih; **S2** layanan mati/lockout massal; **S3** anomali tanpa dampak.

## Langkah umum
1. **Deteksi & catat waktu.** Sumber: tabel `security_events` (`login_lockout`, `rate_limited`, `webhook_ditolak`…), `audit_logs`, log Edge Function, laporan pelanggan.
2. **Batasi.** Cabut sesi (Auth → Users → revoke), nonaktifkan admin terkait, matikan fungsi bermasalah.
3. **Berantas & pulihkan** sesuai skenario di bawah.
4. **Dokumentasikan** (timeline, dampak, akar masalah) dan putuskan kewajiban notifikasi pengguna (UU PDP).

## Skenario
| Skenario | Tindakan |
|---|---|
| Password/akun admin dicurigai bocor | Reset password, `reset-admin-mfa.mjs <email>`, tinjau `audit_logs` 30 hari, cabut sesi |
| `service_role` bocor | Rotasi key di Supabase, perbarui secrets Edge Function & GitHub, tinjau `audit_logs` & Storage |
| Midtrans Server Key bocor | Regenerasi di dashboard Midtrans, `supabase secrets set MIDTRANS_SERVER_KEY`, rekonsiliasi transaksi 7 hari |
| Webhook palsu (`webhook_ditolak` melonjak) | Biasanya ditolak oleh signature; cek IP/frekuensi, blokir di WAF bila perlu |
| Lockout massal sah | Tunggu jendela 15 mnt atau reset penghitung `login_attempts` untuk akun terkait |
| Data rusak/terhapus | `DISASTER_RECOVERY.md` (restore ke staging dulu, lalu impor terarah/penuh) |
| Penyalahgunaan upload/AI | Lihat `security_events` kind `rate_limited`; turunkan limit via `rl_hit` param di handler |

## Kontak
Isi nama & nomor on-call pemilik sebelum go-live (belum ditetapkan di repo).
