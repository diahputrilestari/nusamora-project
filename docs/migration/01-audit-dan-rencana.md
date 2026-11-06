# Migrasi NusaMora ke Next.js + React + TypeScript: audit dan rencana

Status: **audit selesai, belum ada file lama yang diubah atau dihapus.** Dokumen ini adalah dasar persetujuan sebelum Tahap 1.
Semua angka di bawah diukur dari repo (branch `landing-page`), bukan perkiraan.

## 1. Struktur project saat ini

```
/                     13 halaman HTML + 2 halaman Live Guest (live/)
assets/               JS + CSS per area (tanpa bundler, tanpa TypeScript)
  config.js           NM_CONFIG: SUPABASE_URL, anon key (publik), SITE_URL
  landing.js/css      landing + katalog + dialog "Mulai"        (11 KB / 20 KB)
  auth.js/css         masuk, daftar, lupa & atur password        (9 KB)
  dashboard.js/css    /akun: dashboard pelanggan                 (31 KB / 14 KB)
  flow.js/css         alur buat undangan, editor, preview, bayar (80 KB / 26 KB)
  admin.js            mesin admin (modul, tab, form, tabel)      (80 KB)
  admin-assets.js     Asset Library, Template Studio, AI         (85 KB)
  asset-forms.js      konfigurasi form aset per paket            (19 KB)
  img/                gambar situs
backend/*.sql         7 skema Postgres (idempoten, urutan tetap) + seed
supabase/functions/   Edge Function (Deno): midtrans-checkout/sync/webhook, asset-register, asset-generate
source/               sumber Live Guest (src/*.js digabung build.py -> live/*.html)
builder/              build_landing.py, build_auth.py (generator HTML)
.htaccess / vercel.json   URL bersih tanpa .html, header cache
```

Hosting sekarang: Hostinger (Apache, statis). Backend: Supabase (Auth, Postgres + RLS + RPC, Storage, Edge Functions). Pembayaran: Midtrans lewat Edge Function.

## 2. Inventaris halaman (15)

| # | URL lama | File | Skrip | Area | Padanan Next.js (usulan) |
|---|---|---|---|---|---|
| 1 | `/` | index.html | landing.js | publik | `[locale]/page.tsx` |
| 2 | `/masuk` | masuk.html | auth.js | auth | `[locale]/masuk` |
| 3 | `/daftar` | daftar.html | auth.js | auth | `[locale]/daftar` |
| 4 | `/lupa-password` | lupa-password.html | auth.js | auth | `[locale]/lupa-password` |
| 5 | `/atur-password` | atur-password.html | auth.js | auth | `[locale]/atur-password` |
| 6 | `/akun` | akun.html | dashboard.js | pelanggan | `[locale]/dashboard` |
| 7 | `/paket` | paket.html | flow.js | alur | `[locale]/paket` (pricing) |
| 8 | `/template` | template.html | flow.js | alur | `[locale]/templates` |
| 9 | `/buat` | buat.html | flow.js | alur | `[locale]/buat` |
| 10 | `/editor` | editor.html | flow.js | alur | `[locale]/editor` |
| 11 | `/preview` | preview.html | flow.js | alur | `[locale]/preview` |
| 12 | `/pembayaran` | pembayaran.html | flow.js | alur | `[locale]/pembayaran` |
| 13 | `/admin` | admin.html | admin*.js | admin | `[locale]/admin/[[...modul]]` |
| 14 | `/live/` | live/index.html | engine inline | Live Guest | `[locale]/experience/...` |
| 15 | `/live/jawa-tengah` | live/jawa-tengah.html | engine inline | Live Guest | `[locale]/experience/jawa-tengah` |

Catatan: halaman 7-12 berbagi satu skrip (`flow.js`, router di dalam skrip memilih halaman dari `location.pathname`). Itu sebabnya satu file 80 KB menjadi sekitar 6 halaman Next.js.

## 3. Inventaris fitur

- **Auth:** Supabase Auth (email+password, reset password), profil, status akun.
- **Katalog & tema:** katalog di landing (kartu bawaan + dari DB), katalog `/template`, pemilihan tema, demo `/preview?demo=slug`.
- **Alur buat undangan:** paket, kategori, template, link, editor, preview, checkout; autosave draft via RPC `save_invitation`.
- **Editor per paket:** Essential 2D (palet, font, teks, section), Signature 3D (scene, kamera, animasi, sinematik, musik), Luxe (venue, area, avatar tamu, fitur live); avatar mempelai dari aset admin.
- **Pembayaran:** Midtrans Snap (Edge Function checkout/sync/webhook), status pesanan, halaman pembayaran.
- **Dashboard pelanggan:** ringkasan, undangan, pesanan, profil, notifikasi, bantuan.
- **Admin:** modul template (+ Template Studio 4 tab), Asset Library, AI Asset Generator, kategori aset, pengguna, pesanan, pembayaran, laporan, pengaturan, audit log; RBAC lewat `has_perm`.
- **Live Guest:** pilih avatar, nama tamu, venue virtual, navigasi avatar, landmark, area interaktif, musik, buku tamu/chat, QRIS/hadiah, orientasi layar, presence.

## 4. Peta dependensi

| Dependensi | Dipakai oleh | Cara dimuat | Rencana Next.js |
|---|---|---|---|
| `@supabase/supabase-js` 2.58.0 | semua halaman kecuali landing | CDN jsDelivr (UMD, global `supabase`) | paket npm `@supabase/supabase-js` + `@supabase/ssr` |
| `window.NM_CONFIG` | semua | `/assets/config.js` | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| Google Fonts (Playfair, Plus Jakarta, Cormorant, Inter) | semua | `<link>` | `next/font` (DM Sans ditambah sesuai spesifikasi) |
| Three.js r128 | live/*.html | CDN cdnjs, `<script>` | paket `three`, dynamic import, hanya di halaman Live Guest |
| model-viewer 3.5.0 | admin (pratinjau GLB) | CDN, dimuat saat dibutuhkan | `@google/model-viewer` dynamic import |
| bodymovin (Lottie) 5.12.2 | admin (pratinjau) | CDN saat dibutuhkan | `lottie-web` dynamic import |
| Midtrans Snap | checkout | redirect URL dari Edge Function | tetap (tidak diubah) |

Pola kode lama yang harus dirombak (bukan disalin): 2.218 pemanggilan `innerHTML/querySelector/addEventListener` di `assets/*.js`; templating dengan string HTML; state global di closure; routing berdasar `location.pathname`; `sessionStorage`/`localStorage` untuk state alur.

## 5. Temuan khusus Live Guest

- File `live/jawa-tengah.html` = **12,06 MB, tetapi 98% (11,83 MB) adalah 106 gambar base64** (avatar, perabot, latar). Kode sebenarnya sekitar 230 KB (`source/src/*.js` tanpa `10-config.js` dan `67-landmarks.js`, yang berisi data gambar: 4,77 MB dan 0,70 MB).
- Renderer: **DOM/CSS/canvas 2.5D dengan sprite gambar**. Three.js r128 dimuat dari CDN tetapi hanya dirujuk di `40-identity.js`; belum ada scene WebGL penuh.
- Build: `source/build.py` menggabungkan `src/*.js` menjadi satu HTML. Data gambar ada di `NM_SCENES[...]` (JSON dengan `data:image/webp;base64`).
- **Presence/chat "real-time" bergantung pada `window.claude.use('room')`**, yaitu runtime artefak Claude, bukan layanan NusaMora. Di Hostinger/Next.js fungsi itu tidak ada, sehingga jatuh ke "Mode lokal: hanya Anda". Jadi multiplayer nyata belum ada di luar lingkungan artefak. Ini harus diputuskan sebelum Tahap 5 (lihat risiko R1).
- Kesempatan besar: mengeluarkan 11,8 MB gambar base64 menjadi file `.webp` di `public/` (atau Supabase Storage) menurunkan HTML menjadi sekitar 250 KB dan mengaktifkan cache + lazy loading. Hal yang sama sudah saya lakukan untuk 7 avatar pria (`assets/avatars/jawa-tengah/guest-male/`).

## 6. Inventaris aset

- `assets/img/` + `og-nusamora.png` + `favicon.svg`: dipindah apa adanya ke `public/`.
- `live/audio/we-are.mp3`: ke `public/audio/`.
- Gambar tertanam base64 di `source/src/10-config.js` dan `67-landmarks.js`: diekstrak (skrip ekstraksi seperti yang sudah dipakai untuk avatar).
- Backend (`backend/*.sql`, `supabase/functions/*`): **tidak berubah**. Kontrak RPC dan Edge Function dipertahankan.

## 7. Struktur target

```
src/
  app/[locale]/ (page, paket, templates, buat, editor, preview, pembayaran, masuk, daftar,
                 lupa-password, atur-password, dashboard, admin/[[...modul]], experience/[slug])
  app/api/            (hanya bila perlu; Midtrans tetap di Edge Function)
  components/ {common,layout,navigation,forms,modals,ui}
  features/ {authentication,templates,invitations,editor/{essential,signature,luxe},assets,payments,dashboard,admin,live-guest}
  hooks/ services/ lib/ types/ config/
messages/ id.json en.json
public/ {assets,images,icons,fonts,models,audio}
```

Keputusan teknis usulan:
- Next.js 15 (App Router), React 19, TypeScript strict, Tailwind CSS 4, `next-intl`, `@supabase/ssr`.
- Server Components untuk halaman publik (landing, katalog, pricing, hukum); Client Components untuk editor, dashboard, admin, Live Guest.
- Token desain dari spesifikasi (#9673D0, #7552A8, #4A356B, #D9C9F5, #EEE9FA, #FAF8FF, #302442, #746782) sebagai variabel Tailwind; CSS lama dipetakan, tampilan tidak diubah.
- Live Guest: modul `features/live-guest` memuat engine lama lewat adapter (`dynamic(..., { ssr: false })`), aset gambar dari file terpisah.
- Bahasa antarmuka (`[locale]`) terpisah dari `invitation_language` (kolom/konten undangan baru; migrasi SQL kompatibel mundur).
- URL lama (`/paket`, `/akun`, `/live/jawa-tengah`, ...) dialihkan 301 ke `/id/...`; `hreflang`, canonical, dan sitemap per bahasa.

## 8. Risiko

| ID | Risiko | Dampak | Mitigasi |
|---|---|---|---|
| R1 | Presence/chat Live Guest memakai runtime artefak Claude yang tidak ada di produksi | multiplayer tidak berfungsi di luar lingkungan itu | putuskan backend real-time: Supabase Realtime (Presence/Broadcast + tabel pesan dengan RLS). Ini fitur baru, butuh persetujuan |
| R2 | Hosting: Hostinger statis tidak menjalankan Next.js server | SSR, middleware locale, redirect tidak jalan | pilih: Vercel (sudah ada `vercel.json`), VPS/Hostinger Node, atau `output: 'export'` (tanpa middleware; locale lewat folder `/id` `/en`) |
| R3 | `flow.js` 80 KB + admin 165 KB berlogika rapat dengan DOM | regresi perilaku editor/Studio saat ditulis ulang | migrasi per modul + port tes Playwright yang sudah ada (editor 38, admin 92+50, pelanggan 254, tema 12) sebagai tes regresi bersama |
| R4 | 12 MB engine Live Guest | LCP/memori buruk jika dibawa utuh | ekstraksi gambar base64, lazy load per scene, `dynamic ssr:false`, pembersihan listener saat keluar |
| R5 | Auth session pindah dari klien murni ke SSR | loop redirect, sesi hilang | `@supabase/ssr` + uji alur masuk, reset password, sesi kedaluwarsa |
| R6 | Midtrans callback/redirect memakai URL situs | pembayaran gagal bila URL berubah | URL `/pembayaran` dipertahankan lewat redirect; uji Sandbox ulang |
| R7 | Dua bahasa untuk ~290 KB teks (ratusan string) + dokumen hukum | kualitas terjemahan | kamus `id.json`/`en.json` per fitur, pengecekan kunci kembar otomatis, tinjauan manusia untuk dokumen hukum |
| R8 | Sandbox saya tidak dapat menjangkau Supabase/Midtrans/Hostinger | tidak semua alur bisa diuji end-to-end di sini | tes dengan Supabase tiruan (seperti sekarang) + daftar uji manual untuk Anda per tahap |

## 9. Urutan implementasi (tiap tahap bisa dijalankan dan diuji sebelum lanjut)

1. **Fondasi:** Next.js + TS + Tailwind + next-intl, token desain, layout, language switcher, `services/supabase`, tes dasar. Folder `next/` berdampingan; situs lama tetap berjalan.
2. **Publik:** landing, pricing (`paket`), katalog (`template`, termasuk katalog dari DB), demo preview, hukum + kamus id/en, SEO (hreflang, canonical, sitemap), redirect URL lama.
3. **Pelanggan:** auth (4 halaman), dashboard, alur buat, editor tiga paket, preview, checkout/pembayaran.
4. **Admin:** shell + modul, Asset Library, Template Studio, AI generator, pengguna/pesanan/pembayaran.
5. **Live Guest:** ekstraksi aset, adapter engine, lazy load, keputusan real-time (R1), uji performa.
6. **Pengujian & rilis:** regresi, responsif, performa, SEO, multi-bahasa, Sandbox Midtrans, build produksi.

## 10. File yang dibuat / diubah / dipertahankan

- **Dipertahankan tanpa perubahan** sampai tahap yang bersangkutan lulus uji: seluruh `*.html`, `assets/`, `live/`, `source/`, `builder/`, `.htaccess`, `vercel.json`.
- **Dipertahankan permanen:** `backend/`, `supabase/functions/` (kontrak API tidak berubah).
- **Dibuat:** folder `next/` (proyek baru), `docs/migration/*`, `messages/id.json` + `en.json`, migrasi SQL kolom `invitation_language` (tahap 3).
- **Dihapus:** tidak ada sampai Tahap 6 dan persetujuan Anda; berkas lama dipindah ke `legacy/` terlebih dahulu.

## 11. Keputusan yang saya butuhkan sebelum Tahap 1

1. **Hosting produksi** (R2): Vercel, VPS/Hostinger Node, atau static export? Menentukan apakah `/id` `/en` dilayani lewat middleware atau folder statis.
2. **Real-time Live Guest** (R1): Supabase Realtime sebagai pengganti, atau tetap mode lokal untuk sementara?
3. **Lokasi proyek:** folder `next/` di repo yang sama (branch `landing-page`) atau branch/repo baru?
4. **Dokumen hukum** (Syarat, Privasi): terjemahan dasar bertanda "perlu ditinjau", atau Indonesia saja dulu?
