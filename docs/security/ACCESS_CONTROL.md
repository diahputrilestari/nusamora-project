# ACCESS CONTROL — Siapa boleh apa

## Peran
| Peran | Akses | Syarat |
|---|---|---|
| Publik/anon | Baca konten publik (RLS) | — |
| Pelanggan | Data sendiri (RLS per `auth.uid()`), upload ke folder sendiri (kuota 40/jam, 400 total) | login |
| Admin | Sesuai izin (`has_perm`) | Saat MFA wajib aktif: sesi **aal2** + faktor **disetujui** |
| Super admin | Admin + `admin_set_security`, `admin_approve_mfa`, `admin_mfa_reset_mark`, panel keamanan | aal2, ≥1 super admin lain untuk persetujuan |
| Operator (service_role) | Backup/restore, reset MFA (`ops/security/reset-admin-mfa.mjs`) | kunci hanya di mesin operator/GitHub Secrets |

## Siklus MFA admin (terbukti di stack lokal, 48/48)
1. Admin mendaftar TOTP di `/admin-keamanan` → faktor terverifikasi **belum** memberi akses.
2. Super admin **lain** menyetujui (`admin_approve_mfa`); tidak bisa menyetujui diri sendiri; non-super ditolak.
3. Setelah disetujui + login aal2 → akses penuh sesuai izin. Hanya password (aal1) → daftar izin kosong, RLS menyembunyikan data admin, Edge Function 403.
4. Pelanggan/admin lain tidak dapat membaca/menghapus/mendaftarkan faktor akun orang lain (GoTrue + RPC).

## Pemulihan & reset
- **Ponsel hilang:** operator menjalankan `node ops/security/reset-admin-mfa.mjs <email>` (service_role) → faktor dihapus, persetujuan dicabut; admin daftar ulang → super admin menyetujui lagi.
- **Break-glass** (semua super admin terkunci): operator menjalankan `select admin_set_security(false,false)` lewat service_role/psql dengan catatan insiden; nyalakan lagi setelah pulih. Terbukti pada S9.
- Tinjau daftar admin & izin tiap kuartal; cabut admin yang tidak aktif.

## Rahasia
Disimpan di Supabase secrets / GitHub Secrets / password manager operator. Rotasi: lihat `INCIDENT_RESPONSE.md`.
