#!/usr/bin/env bash
# Terapkan rantai SQL skema sesuai urutan README ke DB_URL (stack uji / staging). Berhenti pada galat pertama.
set -euo pipefail
cd "$(dirname "$0")/../.."
for f in supabase-schema dashboard-schema admin-schema invitation-schema payment-schema package-schema asset-schema security-schema security-mfa dating-schema content-protection customer-features guest-schema template-meta admin-dashboard admin-customers admin-templates admin-transactions support-tickets asset-library admin-plans admin-reports admin-content admin-notifications admin-settings admin-roles admin-affiliate admin-live admin-live-areas admin-live-sync admin-live-theme admin-live-decor admin-live-theme-areas admin-live-theme-viking admin-live-theme-samurai admin-live-decor-avatars admin-live-theme-pilot; do
  echo "== $f"
  rc=0; out=$(psql "$DB_URL" -v ON_ERROR_STOP=1 -q -f "backend/$f.sql" 2>&1) || rc=$?
  printf '%s\n' "$out" | grep -v NOTICE | head -20 || true
  [ "$rc" -eq 0 ] || { echo "GAGAL: $f (psql rc=$rc)"; exit 1; }
done
psql "$DB_URL" -Atc "select 'tabel public: '||count(*) from pg_tables where schemaname='public'"
