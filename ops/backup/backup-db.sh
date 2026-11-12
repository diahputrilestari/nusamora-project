#!/usr/bin/env bash
# Backup database NusaMora: skema+data `public` (pg_dump -Fc) dan DATA SAJA akun (auth.users, auth.identities, auth.mfa_factors).
# Catatan: auth.mfa_factors WAJIB ikut (tanpa itu admin kehilangan MFA setelah restore). Berkas Storage dan baris storage.objects TIDAK ada di dump
# DB; berkas dipulihkan lewat Storage API (restore-storage.mjs) agar baris & blob konsisten. Bucket dibuat oleh skrip SQL skema.
# Rahasia hanya dari environment, TIDAK disimpan di repo:
#   SUPABASE_DB_URL         string koneksi Postgres (Supabase > Project Settings > Database)
#   BACKUP_DIR              folder tujuan (default ./backups)
#   BACKUP_PASSPHRASE_FILE  (opsional) berkas passphrase -> arsip dienkripsi AES-256 (.tar.enc)
#   BACKUP_KEEP             jumlah backup yang disimpan (default 14)
set -euo pipefail
# Bila gagal di tengah jalan, catat kegagalan (best-effort) agar terlihat di panel admin.
log_fail() { psql "${SUPABASE_DB_URL:-}" -qAt -c "insert into public.backup_log (kind, ok, detail) values ('db', false, 'backup-db.sh gagal')" >/dev/null 2>&1 || true; }
trap log_fail ERR
: "${SUPABASE_DB_URL:?SUPABASE_DB_URL belum diisi}"
BASE="${BACKUP_DIR:-./backups}"; KEEP="${BACKUP_KEEP:-14}"; mkdir -p "$BASE"; chmod 700 "$BASE"
NAME="nusamora-db-$(date -u +%Y%m%dT%H%M%SZ)"; W="$BASE/$NAME"; mkdir "$W"; T0=$(date +%s)
pg_dump "$SUPABASE_DB_URL" -Fc --no-owner --no-privileges --schema=public -f "$W/public.dump"
pg_dump "$SUPABASE_DB_URL" -Fc --no-owner --no-privileges --data-only \
  --table=auth.users --table=auth.identities --table=auth.mfa_factors -f "$W/authstorage.dump"
pg_restore -l "$W/public.dump" >/dev/null; pg_restore -l "$W/authstorage.dump" >/dev/null   # arsip harus terbaca
( cd "$W" && sha256sum public.dump authstorage.dump > SHA256SUMS )
( cd "$BASE" && tar -cf "$NAME.tar" "$NAME" && rm -rf "$NAME" )
FINAL="$BASE/$NAME.tar"
if [ -n "${BACKUP_PASSPHRASE_FILE:-}" ]; then
  openssl enc -aes-256-cbc -pbkdf2 -salt -in "$FINAL" -out "$FINAL.enc" -pass "file:$BACKUP_PASSPHRASE_FILE"; rm -f "$FINAL"; FINAL="$FINAL.enc"
fi
( cd "$BASE" && sha256sum "$(basename "$FINAL")" > "$(basename "$FINAL").sha256" )
ls -1t "$BASE"/nusamora-db-*.tar* 2>/dev/null | grep -v '\.sha256$' | tail -n +$((KEEP+1)) | while read -r f; do rm -f "$f" "$f.sha256"; done
SZ=$(stat -c %s "$FINAL")
# Catat ke Admin > Pengaturan Sistem > Backup & Restore (opsional; gagal mencatat tidak menggagalkan backup, mis. sebelum admin-settings.sql dijalankan).
psql "$SUPABASE_DB_URL" -qAt -c "insert into public.backup_log (kind, ok, size_bytes, detail) values ('db', true, $SZ, 'backup-db.sh $(basename "$FINAL")')" >/dev/null 2>&1 || true
echo "OK backup=$FINAL ukuran=${SZ}B durasi=$(( $(date +%s)-T0 ))s"
