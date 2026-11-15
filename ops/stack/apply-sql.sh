#!/usr/bin/env bash
# Terapkan rantai SQL skema sesuai urutan README ke DB_URL (stack uji / staging). Berhenti pada galat pertama.
set -euo pipefail
cd "$(dirname "$0")/../.."
for f in supabase-schema dashboard-schema admin-schema invitation-schema payment-schema package-schema asset-schema security-schema security-mfa dating-schema content-protection customer-features guest-schema template-meta admin-dashboard admin-customers admin-templates admin-transactions support-tickets asset-library admin-plans admin-reports admin-content admin-notifications admin-settings admin-roles admin-affiliate admin-live admin-live-areas admin-live-sync admin-live-theme admin-live-decor admin-live-theme-areas admin-live-theme-viking admin-live-theme-samurai admin-live-decor-avatars admin-live-theme-circus admin-live-theme-arabian-knight admin-live-theme-hackathon admin-live-theme-kpop-birthday admin-live-theme-adat-bugis admin-live-theme-beige-elegant admin-live-theme-luxury-maroon admin-live-theme-luxury-black-gold admin-live-theme-luxury-emerald admin-live-theme-up-up-away admin-live-theme-sunflower admin-live-theme-little-ballerina admin-live-theme-adat-yogyakarta admin-live-theme-adat-bali admin-live-theme-blue-elegance admin-live-theme-sage-garden admin-live-theme-india-sweet-17 admin-live-event-aqiqah admin-live-theme-aqiqah-pink-castle admin-live-theme-adat-betawi admin-live-theme-adat-lampung admin-live-theme-terracotta admin-live-theme-minimalist admin-live-theme-venetian-masquerade admin-live-theme-celtic-woodland admin-live-theme-assets- admin-live-theme-assets- admin-live-theme-assets- admin-live-theme-assets- admin-live-theme-katalog-lama admin-live-demo live-luxe-content seed-luxe-live-templates admin-live-theme-assets admin-live-theme-assets-2; do
  echo "== $f"
  rc=0; out=$(psql "$DB_URL" -v ON_ERROR_STOP=1 -q -f "backend/$f.sql" 2>&1) || rc=$?
  printf '%s\n' "$out" | grep -v NOTICE | head -20 || true
  [ "$rc" -eq 0 ] || { echo "GAGAL: $f (psql rc=$rc)"; exit 1; }
done
psql "$DB_URL" -Atc "select 'tabel public: '||count(*) from pg_tables where schemaname='public'"
