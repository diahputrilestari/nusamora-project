#!/usr/bin/env bash
# Sidik jari tiap tabel (jumlah baris + md5 isi terurut). Jalankan di sumber & hasil restore lalu bandingkan.
#   integrity.sh <DB_URL> > sidik.txt
set -euo pipefail
URL="${1:?DB_URL}"
for t in $(psql "$URL" -Atc "select format('%I.%I',schemaname,tablename) from pg_tables where schemaname='public' union all select t from unnest(array['auth.users','auth.identities','auth.mfa_factors','storage.buckets']) t where to_regclass(t) is not null order by 1"); do
  echo "$t|$(psql "$URL" -Atc "select count(*)||'|'||coalesce(md5(string_agg(x::text,'~' order by x::text)),'-') from $t x")"
done
# berkas Storage: bandingkan (bucket,nama,ukuran) — id/waktu dibuat ulang oleh Storage saat restore sehingga tidak dibandingkan
if [ -n "$(psql "$URL" -Atc "select to_regclass('storage.objects')")" ]; then
  echo "storage.objects(nama+ukuran)|$(psql "$URL" -Atc "select count(*)||'|'||coalesce(md5(string_agg(bucket_id||'/'||name||'/'||coalesce((metadata->>'size'),'?'),'~' order by bucket_id,name)),'-') from storage.objects")"
fi
