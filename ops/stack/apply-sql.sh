#!/usr/bin/env bash
# Terapkan rantai SQL skema sesuai urutan README ke DB_URL (stack uji / staging). Berhenti pada galat pertama.
set -euo pipefail
cd "$(dirname "$0")/../.."
for f in supabase-schema dashboard-schema admin-schema invitation-schema payment-schema package-schema asset-schema security-schema security-mfa; do
  echo "== $f"; psql "$DB_URL" -v ON_ERROR_STOP=1 -q -f "backend/$f.sql" 2>&1 | grep -v NOTICE | head -20; test "${PIPESTATUS[0]}" -eq 0
done
psql "$DB_URL" -Atc "select 'tabel public: '||count(*) from pg_tables where schemaname='public'"
