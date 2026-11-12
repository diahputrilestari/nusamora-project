#!/usr/bin/env bash
# Pulihkan DATA dari backup ke database TUJUAN yang skemanya SUDAH ada (proyek baru: jalankan dulu rantai SQL backend/*.sql).
# Atomik: seluruh penghapusan + pemuatan terjadi dalam SATU transaksi; bila gagal, tujuan kembali seperti semula.
#   restore-db.sh <nusamora-db-*.tar[.enc]> <TARGET_DB_URL> --yes-overwrite
# Untuk .enc isi BACKUP_PASSPHRASE_FILE. Simulasi: arahkan ke DB NON-PRODUKSI. Skema (DDL), kebijakan Storage, hook Auth, dan
# bucket TIDAK disentuh (itu hasil rantai SQL), sehingga restore tidak bisa merusaknya.
set -euo pipefail
F="${1:?berkas backup}"; TARGET="${2:?TARGET_DB_URL}"
[ "${3:-}" = "--yes-overwrite" ] || { echo "Tambahkan --yes-overwrite: semua data tabel public & akun (auth.users, identities, mfa_factors) tujuan akan diganti"; exit 2; }
[ -f "$F.sha256" ] && ( cd "$(dirname "$F")" && sha256sum -c "$(basename "$F").sha256" )
T0=$(date +%s); TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT; TAR="$F"
if [[ "$F" == *.enc ]]; then : "${BACKUP_PASSPHRASE_FILE:?isi BACKUP_PASSPHRASE_FILE}"; TAR="$TMP/a.tar"
  openssl enc -d -aes-256-cbc -pbkdf2 -in "$F" -out "$TAR" -pass "file:$BACKUP_PASSPHRASE_FILE"; fi
tar -xf "$TAR" -C "$TMP"; D="$(find "$TMP" -mindepth 1 -maxdepth 1 -type d | head -1)"
( cd "$D" && sha256sum -c SHA256SUMS )
# Prasyarat skema: semua tabel public di backup harus ada di tujuan.
pg_restore -l "$D/public.dump" | awk '$4=="TABLE" && $5=="public"{print $6}' | sort > "$TMP/want.txt"
psql "$TARGET" -Atc "select tablename from pg_tables where schemaname='public' order by 1" | sort > "$TMP/have.txt"
MISSING="$(comm -23 "$TMP/want.txt" "$TMP/have.txt" | tr '\n' ' ')"
[ -z "$MISSING" ] || { echo "Skema tujuan belum lengkap, tabel hilang: $MISSING -- jalankan rantai SQL backend/*.sql dulu"; exit 3; }
# SQL data dari kedua arsip (urutan dependensi dijaga pg_restore). session_replication_role=replica mematikan trigger/FK saat memuat
# (sama seperti `supabase db dump --data-only`), sehingga trigger on_auth_user_created tidak menggandakan profil.
pg_restore --data-only --no-owner --no-privileges -f "$TMP/auth.sql" "$D/authstorage.dump"
pg_restore --data-only --no-owner --no-privileges -f "$TMP/public.sql" "$D/public.dump"
{
  echo "begin;"
  echo "delete from auth.mfa_factors;"
  echo "delete from auth.users;"   # kosongkan akun SEBELUM mematikan trigger: kaskade ke identities, sesi, dll. harus berjalan
  echo "set local session_replication_role = replica;"
  psql "$TARGET" -Atc "select 'truncate '||string_agg(format('%I.%I',schemaname,tablename),', ')||' restart identity cascade;' from pg_tables where schemaname='public'"
  grep -v -E '^(SET (statement_timeout|lock_timeout|idle_in_transaction_session_timeout|transaction_timeout|client_encoding|standard_conforming_strings|check_function_bodies|xmloption|client_min_messages|row_security)|SELECT pg_catalog.set_config\(.search_path)' "$TMP/auth.sql"
  grep -v -E '^(SET (statement_timeout|lock_timeout|idle_in_transaction_session_timeout|transaction_timeout|client_encoding|standard_conforming_strings|check_function_bodies|xmloption|client_min_messages|row_security)|SELECT pg_catalog.set_config\(.search_path)' "$TMP/public.sql"
  echo "commit;"
} > "$TMP/restore.sql"
psql "$TARGET" -v ON_ERROR_STOP=1 -q -f "$TMP/restore.sql" >/dev/null
psql "$TARGET" -qAt -c "insert into public.backup_log (kind, ok, detail) values ('restore', true, 'restore-db.sh')" >/dev/null 2>&1 || true
echo "OK restore durasi=$(( $(date +%s)-T0 ))s"
