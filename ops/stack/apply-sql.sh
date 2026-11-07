#!/usr/bin/env bash
# Terapkan rantai SQL skema sesuai urutan README ke DB_URL (stack uji / staging). Berhenti pada galat pertama.
set -euo pipefail
cd "$(dirname "$0")/../.."
for f in supabase-schema dashboard-schema admin-schema invitation-schema payment-schema package-schema asset-schema security-schema security-mfa content-protection; do
  echo "== $f"
  rc=0; out=$(psql "$DB_URL" -v ON_ERROR_STOP=1 -q -f "backend/$f.sql" 2>&1) || rc=$?
  printf '%s\n' "$out" | grep -v NOTICE | head -20 || true
  [ "$rc" -eq 0 ] || { echo "GAGAL: $f (psql rc=$rc)"; exit 1; }
done
psql "$DB_URL" -Atc "select 'tabel public: '||count(*) from pg_tables where schemaname='public'"
