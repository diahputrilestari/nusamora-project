# Kebijakan Backup NusaMora

| Aset | Cara | Frekuensi target | Retensi | Skrip |
|---|---|---|---|---|
| Database (`public` + data `auth.users/identities`, `storage.buckets/objects`) | `pg_dump -Fc`, checksum SHA-256, enkripsi AES-256 | harian (RPO 24 jam) | 14 backup terakhir (`BACKUP_KEEP`) | `ops/backup/backup-db.sh` |
| Berkas Storage (`invitation-media`, `site-assets`, `theme-assets`) | unduh via Storage API + `MANIFEST.json` SHA-256 | harian | 14 salinan | `ops/backup/backup-storage.mjs` |
| Kode & skema SQL | Git (GitHub), tag rilis | tiap rilis | permanen | — |
| Secret (Midtrans Server Key, service_role, passphrase backup) | **tidak** di repo/backup; simpan di password manager milik pemilik | saat berubah | — | — |

Aturan:
- Simpan backup di lokasi **terpisah dari Supabase & Hostinger** (mis. penyimpanan cloud pribadi dengan akses terbatas). Passphrase disimpan terpisah dari arsip.
- Rahasia hanya lewat environment (`SUPABASE_DB_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `BACKUP_PASSPHRASE_FILE`), tidak pernah di-commit atau dicetak ke log.
- Backup harus dijalankan oleh **penjadwal** (cron di mesin pemilik/CI privat). **Status saat ini: penjadwal BELUM dipasang** — skrip siap, jadwal belum aktif sampai pemilik menyediakan lokasi penyimpanan & secret.
- Uji restore minimal sebulan sekali dan setelah perubahan skema (lihat DISASTER_RECOVERY.md).
- Cek juga fitur bawaan Supabase (backup harian / PITR bergantung paket) di dashboard — **[VERIFIKASI]**; backup mandiri ini tetap diperlukan sebagai salinan independen.
