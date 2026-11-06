#!/usr/bin/env bash
# Sidik jari tiap tabel (jumlah baris + md5 isi terurut). Jalankan di sumber & hasil restore lalu bandingkan.
#   integrity.sh <DB_URL> > sidik.txt
set -euo pipefail
URL="${1:?DB_URL}"
for t in $(psql "$URL" -Atc "select format('%I.%I',schemaname,tablename) from pg_tables where schemaname='public' union all select t from unnest(array['auth.users','auth.identities','storage.buckets','storage.objects']) t where to_regclass(t) is not null order by 1"); do
  echo "$t|$(psql "$URL" -Atc "select count(*)||'|'||coalesce(md5(string_agg(x::text,'~' order by x::text)),'-') from $t x")"
done
