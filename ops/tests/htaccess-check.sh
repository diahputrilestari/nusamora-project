#!/usr/bin/env bash
# Uji .htaccess pada Apache ASLI (mod_rewrite + mod_headers + AllowOverride All, seperti Hostinger).
# Memastikan: file/folder internal 403, halaman & aset publik tetap 200, URL bersih, header keamanan & cache tetap ada.
set -u
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"; W="$(mktemp -d)"; PORT=8088; B="http://127.0.0.1:$PORT"
MODS=/usr/lib/apache2/modules
cat > "$W/httpd.conf" <<EOF
ServerRoot "$W"
PidFile "$W/pid"
Listen 127.0.0.1:$PORT
ServerName localhost
LoadModule mpm_event_module $MODS/mod_mpm_event.so
LoadModule authz_core_module $MODS/mod_authz_core.so
LoadModule mime_module $MODS/mod_mime.so
LoadModule dir_module $MODS/mod_dir.so
LoadModule alias_module $MODS/mod_alias.so
LoadModule headers_module $MODS/mod_headers.so
LoadModule rewrite_module $MODS/mod_rewrite.so
LoadModule setenvif_module $MODS/mod_setenvif.so
TypesConfig /etc/mime.types
ErrorLog "$W/error.log"
DocumentRoot "$ROOT"
<Directory "$ROOT">
  AllowOverride All
  Require all granted
</Directory>
EOF
apache2 -f "$W/httpd.conf" -k start || { echo "apache gagal start"; cat "$W/error.log"; exit 2; }
trap 'apache2 -f "$W/httpd.conf" -k stop >/dev/null 2>&1' EXIT
for i in $(seq 1 20); do curl -s -o /dev/null "$B/robots.txt" && break; sleep .3; done
fail=0
st() { curl -s -o /dev/null -w '%{http_code}' "$@"; }
expect() { local want="$1" path="$2" got; got=$(st "$B$path"); if [ "$got" = "$want" ]; then echo "PASS $path -> $got"; else echo "FAIL $path -> $got (harap $want)"; fail=$((fail+1)); fi; }
echo "== harus DIBLOKIR (403)"
for p in /backend/asset-schema.sql /backend/ /ops/stack/lib.mjs /ops/tests/htaccess-check.sh /docs/security/SECURITY.md /source/build.py /builder/build_landing.py \
  /supabase/functions/asset-url/index.ts /supabase/config.toml /next/ /.git/config /.git/HEAD /.github/workflows/supabase-stack.yml /README.md /vercel.json /BACKEND/asset-schema.sql /Docs/security/SECURITY.md /assets/ /assets/img/; do expect 403 "$p"; done
echo "== harus TETAP TERBUKA"
for p in / /masuk /daftar /akun /live/ /live/jawa-tengah /assets/landing.css /assets/landing.js /assets/protect.js /assets/favicon.svg /assets/img/romantic-garden-s1.webp /robots.txt /sitemap.xml /artikel /artikel/contoh-slug /info/tentang-kami /bantuan /tutorial; do expect 200 "$p"; done
echo "== prarender artikel (snapshot dipakai bila ada, jatuh ke konten.html bila tidak)"
mkdir -p "$ROOT/prerender/artikel"; [ -f "$ROOT/prerender/artikel/index.html" ] && mv "$ROOT/prerender/artikel/index.html" "$ROOT/prerender/artikel/index.html.bak-uji"
printf '<!doctype html><title>uji</title>PRARENDER-UJI-OK' > "$ROOT/prerender/artikel/zz-uji-prarender.html"
printf '<!doctype html><title>uji</title>PRARENDER-INDEKS-OK' > "$ROOT/prerender/artikel/index.html"
curl -s "$B/artikel/zz-uji-prarender" | grep -q PRARENDER-UJI-OK && echo "PASS /artikel/<slug> memakai snapshot" || { echo "FAIL snapshot artikel tidak dipakai"; fail=$((fail+1)); }
curl -s "$B/artikel/zz-uji-prarender/" | grep -q PRARENDER-UJI-OK && echo "PASS /artikel/<slug>/ memakai snapshot" || { echo "FAIL snapshot (slash)"; fail=$((fail+1)); }
curl -s "$B/artikel" | grep -q PRARENDER-INDEKS-OK && echo "PASS /artikel memakai snapshot daftar" || { echo "FAIL snapshot daftar"; fail=$((fail+1)); }
curl -s "$B/artikel?kat=Tips" | grep -q PRARENDER-INDEKS-OK && { echo "FAIL /artikel?kat= tidak boleh memakai snapshot daftar"; fail=$((fail+1)); } || echo "PASS /artikel?kat= tetap dilayani konten.html"
curl -s "$B/artikel/slug-tanpa-snapshot" | grep -q "Aktifkan JavaScript" && echo "PASS artikel tanpa snapshot jatuh ke konten.html" || { echo "FAIL fallback konten.html"; fail=$((fail+1)); }
rm -f "$ROOT/prerender/artikel/zz-uji-prarender.html" "$ROOT/prerender/artikel/index.html"; [ -f "$ROOT/prerender/artikel/index.html.bak-uji" ] && mv "$ROOT/prerender/artikel/index.html.bak-uji" "$ROOT/prerender/artikel/index.html"; rmdir "$ROOT/prerender/artikel" "$ROOT/prerender" 2>/dev/null || true
echo "== URL bersih & header"
echo "== halaman kategori template (/template/<slug> dari prerender/kategori/, /template?paket= tetap alur lama)"
for s in $(ls "$ROOT/prerender/kategori" | sed 's/\.html$//'); do got=$(st "$B/template/$s"); [ "$got" = 200 ] && echo "PASS /template/$s -> 200" || { echo "FAIL /template/$s -> $got"; fail=$((fail+1)); }; done
curl -s "$B/template/pernikahan" | grep -q "<h1>Template Undangan Pernikahan" && echo "PASS /template/pernikahan memuat H1 di HTML awal" || { echo "FAIL H1 kategori"; fail=$((fail+1)); }
got=$(st "$B/template/tidak-ada-kategori"); [ "$got" = 404 ] && echo "PASS kategori tak dikenal -> 404" || { echo "FAIL /template/tidak-ada-kategori -> $got (harap 404)"; fail=$((fail+1)); }
got=$(st "$B/template?paket=luxe"); [ "$got" = 200 ] && echo "PASS /template?paket=luxe tetap 200 (alur lama)" || { echo "FAIL /template?paket=luxe -> $got"; fail=$((fail+1)); }
for p in /konten /konten.html "/konten?x=1"; do got=$(st "$B$p"); [ "$got" = 301 ] && echo "PASS $p -> 301 (ke /artikel)" || { echo "FAIL $p -> $got (harap 301)"; fail=$((fail+1)); }; done
got=$(st "$B/masuk.html"); [ "$got" = 301 ] && echo "PASS /masuk.html -> 301 (URL bersih)" || { echo "FAIL /masuk.html -> $got"; fail=$((fail+1)); }
h=$(curl -sI "$B/"); for k in "x-content-type-options: nosniff" "content-security-policy-report-only" "referrer-policy"; do echo "$h" | grep -qi "$k" && echo "PASS header $k" || { echo "FAIL header $k"; fail=$((fail+1)); }; done
c=$(curl -sI "$B/assets/img/romantic-garden-s1.webp" | grep -i '^cache-control'); echo "$c" | grep -qi immutable && echo "PASS cache aset gambar immutable" || { echo "FAIL cache aset: $c"; fail=$((fail+1)); }
[ "$(curl -s "$B/robots.txt" | head -1)" = "User-agent: *" ] && echo "PASS robots.txt terbaca" || { echo "FAIL robots.txt"; fail=$((fail+1)); }
curl -s "$B/" | grep -q "Every Moment" && echo "PASS beranda berisi konten (SEO tidak terganggu)" || { echo "FAIL isi beranda"; fail=$((fail+1)); }
[ "$fail" -eq 0 ] && echo "SEMUA LULUS" || { echo "GAGAL $fail"; tail -5 "$W/error.log"; }
exit $([ "$fail" -eq 0 ] && echo 0 || echo 1)
