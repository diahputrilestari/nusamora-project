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
for p in / /masuk /daftar /akun /live/ /live/jawa-tengah /assets/landing.css /assets/landing.js /assets/protect.js /assets/favicon.svg /assets/img/romantic-garden-s1.webp /robots.txt /sitemap.xml; do expect 200 "$p"; done
echo "== URL bersih & header"
got=$(st "$B/masuk.html"); [ "$got" = 301 ] && echo "PASS /masuk.html -> 301 (URL bersih)" || { echo "FAIL /masuk.html -> $got"; fail=$((fail+1)); }
h=$(curl -sI "$B/"); for k in "x-content-type-options: nosniff" "content-security-policy-report-only" "referrer-policy"; do echo "$h" | grep -qi "$k" && echo "PASS header $k" || { echo "FAIL header $k"; fail=$((fail+1)); }; done
c=$(curl -sI "$B/assets/img/romantic-garden-s1.webp" | grep -i '^cache-control'); echo "$c" | grep -qi immutable && echo "PASS cache aset gambar immutable" || { echo "FAIL cache aset: $c"; fail=$((fail+1)); }
[ "$(curl -s "$B/robots.txt" | head -1)" = "User-agent: *" ] && echo "PASS robots.txt terbaca" || { echo "FAIL robots.txt"; fail=$((fail+1)); }
curl -s "$B/" | grep -q "Every Moment" && echo "PASS beranda berisi konten (SEO tidak terganggu)" || { echo "FAIL isi beranda"; fail=$((fail+1)); }
[ "$fail" -eq 0 ] && echo "SEMUA LULUS" || { echo "GAGAL $fail"; tail -5 "$W/error.log"; }
exit $([ "$fail" -eq 0 ] && echo 0 || echo 1)
