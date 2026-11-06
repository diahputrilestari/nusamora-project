#!/usr/bin/env bash
# Pulihkan backup ke database TUJUAN (menimpa skema public tujuan). Simulasi: arahkan ke proyek/DB NON-PRODUKSI.
#   restore-db.sh <nusamora-db-*.tar[.enc]> <TARGET_DB_URL> --yes-overwrite
# Tujuan harus sudah punya skema auth & storage (proyek Supabase baru otomatis punya). Untuk .enc isi BACKUP_PASSPHRASE_FILE.
set -euo pipefail
F="${1:?berkas backup}"; TARGET="${2:?TARGET_DB_URL}"
[ "${3:-}" = "--yes-overwrite" ] || { echo "Tambahkan --yes-overwrite: skema public tujuan akan ditimpa"; exit 2; }
[ -f "$F.sha256" ] && ( cd "$(dirname "$F")" && sha256sum -c "$(basename "$F").sha256" )
T0=$(date +%s); TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT; TAR="$F"
if [[ "$F" == *.enc ]]; then : "${BACKUP_PASSPHRASE_FILE:?isi BACKUP_PASSPHRASE_FILE}"; TAR="$TMP/a.tar"
  openssl enc -d -aes-256-cbc -pbkdf2 -in "$F" -out "$TAR" -pass "file:$BACKUP_PASSPHRASE_FILE"; fi
tar -xf "$TAR" -C "$TMP"; D="$(find "$TMP" -mindepth 1 -maxdepth 1 -type d | head -1)"
( cd "$D" && sha256sum -c SHA256SUMS )
# 1) data akun & metadata storage dulu (public punya FK ke auth.users)
psql "$TARGET" -v ON_ERROR_STOP=1 -qc "truncate auth.users, storage.objects, storage.buckets cascade" 
pg_restore --data-only --no-owner --no-privileges --exit-on-error -d "$TARGET" "$D/authstorage.dump"
# 2) skema + data aplikasi
pg_restore --clean --if-exists --no-owner --no-privileges --exit-on-error -d "$TARGET" "$D/public.dump"
echo "OK restore durasi=$(( $(date +%s)-T0 ))s"
