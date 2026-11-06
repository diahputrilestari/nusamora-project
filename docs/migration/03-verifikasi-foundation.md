# Verifikasi Foundation (Tahap 1) — status aktual

**Status: BELUM TERVERIFIKASI (build/tes belum dijalankan).** Dicek ulang pada 2026-11-06 dari sandbox pengembangan:
`npm view next version` gagal (`registry.npmjs.org` tidak dapat di-resolve; proxy menolak CONNECT). Kami tidak menerobos pemblokiran.
Yang sudah dijalankan secara nyata: `node next/scripts/check-messages.mjs` → `OK: 20 kunci sama di id.json dan en.json`.
Tidak ada hasil `next build`, `tsc`, atau Playwright — jangan menganggapnya lulus.

## Tinjauan kompatibilitas (statik, dari pembacaan kode — bukan hasil build)
| Item | Pin | Catatan yang harus dikonfirmasi saat install |
|---|---|---|
| next | ^15.5 | App Router, `output: "standalone"`; middleware di `src/middleware.ts` |
| react / react-dom | ^19.1 | cocok dengan Next 15 |
| next-intl | ^4.3 | memakai `hasLocale`, `NextIntlClientProvider` tanpa props, `setRequestLocale`, `defineRouting` (API v4). Jika `npm install` memberi versi lain, cek tipe ini |
| tailwindcss + @tailwindcss/postcss | ^4.1 | Tailwind 4 memakai plugin PostCSS terpisah (sudah ada); token di `@theme` pada `globals.css` |
| @supabase/ssr | ^0.7 | `createServerClient`/`createBrowserClient` dengan cookie getAll/setAll — verifikasi tanda tangan di versi terpasang |
| typescript | ^5.8 | `strict` + `noUncheckedIndexedAccess` |
| Node | >=20.9 | Hostinger: pilih Node 22 |
Risiko build yang diketahui: `next/font/google` mengunduh font saat build (perlu internet di mesin build — OK di GitHub Actions/Hostinger, gagal di sandbox tanpa akses).

## Instruksi pengujian lokal (jalankan di komputer Anda, Node 22)
```bash
git fetch && git checkout migration/nextjs   # atau security/p0
cd next
cp .env.example .env.local                   # isi NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY (anon saja), NEXT_PUBLIC_SITE_URL
npm install
npm run check:messages
npm run typecheck
npm run build
npx playwright install chromium
npm run test:e2e
```
Kirim ke saya seluruh output yang gagal (salin teks). Kriteria lulus: typecheck 0 error, build sukses, 6/6 tes e2e hijau.
Alternatif tanpa instalasi lokal: GitHub → Actions → workflow `next-ci` (berjalan otomatis saat push ke `migration/nextjs`).
