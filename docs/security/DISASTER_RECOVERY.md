# Disaster Recovery NusaMora

Target: **RPO 24 jam, RTO 4 jam.** Status: **belum terbukti di produksi** (lihat "Hasil uji" di bawah).

## Skenario & respons
| Skenario | Respons |
|---|---|
| Data rusak/terhapus (kesalahan admin, migrasi buruk) | Pulihkan backup terbaru ke proyek Supabase staging, ekspor baris yang dibutuhkan, impor ke produksi; atau pulihkan penuh bila luas. |
| Proyek Supabase hilang/terkompromi | Buat proyek baru → jalankan SQL berurutan (supabase-schema, dashboard, admin, invitation, payment, package, asset) → `restore-db.sh` → `restore-storage.mjs` → deploy Edge Functions → set secrets → ganti `NM_CONFIG` URL/anon key → rotasi semua key. |
| Hostinger down | Situs statis/Next.js dapat di-deploy ulang dari GitHub ke hosting cadangan; DNS dialihkan. Data aman di Supabase. |
| Kebocoran key | Lihat INCIDENT_RESPONSE.md (rotasi Midtrans/service_role, cabut sesi). |

## Prosedur restore (non-produksi dulu)
1. Siapkan proyek Supabase staging kosong (atau Postgres uji). Siapkan `BACKUP_PASSPHRASE_FILE`.
2. `ops/backup/restore-db.sh <nusamora-db-*.tar.enc> "<TARGET_DB_URL>" --yes-overwrite`
3. `SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… node ops/backup/restore-storage.mjs <folder-backup-storage>`
4. Verifikasi: `ops/backup/integrity.sh <SRC_URL> > a.txt; ops/backup/integrity.sh <TARGET_URL> > b.txt; diff a.txt b.txt` (harus kosong); cek login, satu undangan publik, satu pesanan.
5. Catat durasi tiap langkah & hasil di tabel "Hasil uji".

## Hasil uji aktual
| Tanggal | Lingkungan | Cakupan | Hasil | Durasi |
|---|---|---|---|---|
| 2026-11-06 | Postgres 16 **lokal** (skema NusaMora dibangun dari SQL repo + data uji, bukan data produksi) | backup terenkripsi → restore → `integrity.sh` | 33 tabel, jumlah baris & md5 isi **identik**; kontrol negatif (ubah 1 baris) terdeteksi; arsip yang dirusak ditolak oleh checksum | backup 1 dtk, restore <1 dtk |
| 2026-11-06 | **Mock** Storage API lokal (bukan Supabase asli) | 122 objek (3 bucket, subfolder, nama dengan spasi) backup → restore → bandingkan byte | 122/122 identik | detik |
| 2026-11-06 | **Supabase lokal nyata di CI** (GoTrue+PostgREST+Storage+Postgres 17; BUKAN proyek hosted) — run supabase-stack #42169517483 | seed 26 akun/91 berkas/525 baris → backup terenkripsi → rusak (72 berkas hilang, 12 akun dihapus) → restore → verifikasi | LULUS: sidik jari 0 selisih, 91/91 berkas SHA-256 identik, login+TOTP lama valid | backup DB 0,27 s, restore DB 0,26 s, restore Storage 1,1 s, total 1,4 s |

**Yang belum terbukti (jujur):**
- Restore pada **proyek Supabase staging sungguhan** (dengan skema auth/storage asli) belum dilakukan — sandbox tidak bisa menjangkau Supabase. Wajib dilakukan pemilik atau sesi berikutnya dengan akses staging sebelum go-live.
- **RTO 4 jam belum terbukti**: durasi uji lokal pada data kecil tidak mewakili produksi. RTO nyata harus diukur pada staging dengan volume data sebenarnya, termasuk waktu deploy Edge Functions, set secrets, dan DNS.
- **RPO 24 jam belum terpenuhi** sampai penjadwal harian aktif dan satu siklus berjalan sukses (lihat BACKUP_POLICY.md).
- Pengujian restore `auth.users` di Supabase asli berpotensi berbeda kolom antar versi; `restore-db.sh` memakai `--data-only` untuk meminimalkan risiko tetapi tetap harus dicoba di staging.

**Evaluasi RPO/RTO (belum terbukti):** durasi 1,4 s pada 9,5 MB hanya membuktikan prosedur benar, bukan RTO 4 jam pada data produksi. RPO 24 jam hanya tercapai bila backup harian terjadwal berjalan dan disalin keluar Supabase — penjadwal belum aktif. Kedua target = *masuk akal secara teknis*, *belum dibuktikan*.
