# Deployment Next.js di Hostinger (Tahap 1)

Sumber: dokumentasi resmi Hostinger ([Node.js overview](https://docs.hostinger.com/node.js/overview), [panduan deploy](https://www.hostinger.com/support/how-to-deploy-a-nodejs-website-in-hostinger/), [Next.js hosting](https://www.hostinger.com/web-apps-hosting/nextjs-hosting)), dibaca 6 Nov 2026. Saya tidak punya akses ke akun Hostinger Anda, jadi paket yang Anda miliki **belum terverifikasi**.

## 1. Kompatibilitas

| Kebutuhan | Status | Keterangan |
|---|---|---|
| Node.js | Didukung (terverifikasi di docs) | 18, 20, 22, 24. Pakai **22 LTS** (dev dan produksi; `engines >=20.9`). |
| Next.js server (SSR, App Router) | Didukung | Docs: Next.js "always runs in server mode"; Hostinger menjalankan server standalone. Static export tidak dipakai. |
| Deploy dari GitHub | Didukung | Build otomatis tiap push; repo privat didukung. Root directory dapat diatur (kita pakai `next/`). |
| Perintah build | Otomatis | Hostinger memasang dependency dan menjalankan skrip `build` dari `package.json`. |
| Perintah start | Otomatis untuk Next.js | "No entry file needed". Skrip `postbuild` menyalin `public/` dan `.next/static` ke folder standalone. |
| Environment variables | Didukung | Diisi di dashboard Node.js. Tidak ada secret di repo. |
| SSL & domain kustom | Didukung (Next.js hosting page) | SSL terkelola gratis; domain dipetakan di hPanel. |
| Paket yang mendukung | Business Web Hosting, Cloud Startup/Professional/Enterprise | Paket **Premium/Single** dan sejenisnya tidak tercantum. **Anda perlu memeriksa paket Anda** (hPanel, Hosting, lihat apakah ada menu "Node.js"). |
| Proses | **Berjalan on-demand** | Setelah sepi trafik proses berhenti dan hidup lagi pada request berikutnya, jadi ada *cold start* pada permintaan SSR pertama. Aplikasi yang crash dimulai ulang otomatis. |
| RAM / CPU / jumlah proses, bandwidth, timeout request, batas waktu build, WebSocket | **Tidak dinyatakan di halaman yang saya baca** | Angka ada di artikel terpisah ("Hostinger Node.js limits"). Saya tidak mengasumsikannya; periksa di dashboard Anda. Untuk referensi, halaman Next.js hosting menyebut Cloud Startup 4 CPU / 4 GB RAM. |

Dampak WebSocket: Supabase Realtime (Tahap 5) berjalan **dari browser langsung ke Supabase**, bukan lewat server Hostinger, sehingga dukungan WebSocket di Hostinger tidak diperlukan.

## 2. Arsitektur deployment

```
Browser -> Hostinger (Next.js standalone, Node 22): halaman SSR, /api/health, middleware locale + sesi
        -> Supabase (langsung): Auth, Postgres+RLS, Storage, Realtime
        -> Edge Function Supabase: midtrans-checkout / sync / webhook  (tidak berubah)
Midtrans --webhook--> Edge Function (bukan ke Hostinger)
GitHub (branch) --push--> Hostinger build otomatis
```

Pembagian tanggung jawab sesuai arahan: Hostinger = hosting, SSR, routing, situs publik, dashboard, editor; Supabase = data, auth, storage, realtime; Midtrans = pembayaran lewat Edge Function yang sudah ada.

## 3. Pengaturan di Hostinger (hPanel > Websites > Add website > Node.js Apps)

| Pengaturan | Nilai |
|---|---|
| Sumber | GitHub, repo `diahputrilestari/nusamora-project` |
| Branch | `migration/nextjs` (staging), kelak `main` untuk produksi |
| Root directory | `next` |
| Framework | Next.js (terdeteksi dari `package.json`) |
| Node.js | 22.x |
| Package manager | npm |
| Build command | `npm run build` (menjalankan `next build` lalu `postbuild`) |
| Start command | otomatis (standalone). Setara lokal: `npm run start` = `node .next/standalone/server.js` |
| Output | `output: "standalone"` di `next.config.ts` |

### Environment variables

| Nama | Nilai | Catatan |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL project Supabase | publik |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | publishable/anon key | publik, dilindungi RLS |
| `NEXT_PUBLIC_SITE_URL` | `https://<domain>` | dipakai canonical/hreflang/sitemap |

Variabel `NEXT_PUBLIC_*` ditanam saat **build**: ubah nilainya lalu deploy ulang. Jangan pernah mengisi `service_role` key atau Midtrans Server Key di sini; keduanya tetap hanya di `supabase secrets` (Edge Function).

### Lingkungan
- **Development:** `.env.local` di mesin pengembang (`npm run dev`).
- **Staging:** aplikasi Node.js kedua di Hostinger (domain sementara `*.hostingersite.com`) dari branch `migration/nextjs`, memakai project Supabase yang sama dengan produksi saat ini (tidak ada project staging terpisah; hati-hati saat menguji tulis data).
- **Produksi:** aplikasi dari `main` setelah regresi lulus dan Anda menyetujui. Situs lama tetap melayani domain sampai saat itu.

## 4. Prosedur deploy
1. Push ke `migration/nextjs`; Hostinger membangun otomatis (atau tekan Deploy di dashboard).
2. Setelah selesai: buka `https://<domain>/id` dan `/en`, periksa `/api/health` (200 = Supabase terjangkau; 503 = degraded).
3. Jalankan `E2E_BASE_URL=https://<domain> npx playwright test` dari folder `next/`.

## 5. Rollback
- Hostinger menyimpan riwayat deployment: pilih deployment sebelumnya di dashboard, atau `git revert` lalu push.
- Sebelum rilis besar buat tag Git (`git tag -a pra-nextjs-v1 && git push origin pra-nextjs-v1`); situs HTML lama tetap ada di branch `landing-page`/`main` dan dapat dipasang kembali kapan saja.
- Tahap 1 tidak menyentuh database, jadi tidak ada rollback data.

## 6. Logging produksi
Next.js menulis ke stdout/stderr; lihat log di dashboard Node.js Hostinger. Jangan mencatat token, password, atau data pembayaran. Pemantauan lanjutan dirancang di laporan audit keamanan.

## 7. Keterbatasan dan alternatif (tetap di infrastruktur Hostinger)
- Bila paket Anda **tidak punya menu Node.js**: upgrade ke Business/Cloud Startup (masih Hostinger). VPS hanya dipertimbangkan bila batas RAM/CPU terbukti tidak cukup, dan hanya setelah persetujuan Anda.
- *Cold start* on-demand: halaman publik penting dapat dibuat statis/ISR di Tahap 2; pemantau uptime berkala (health check) menjaga proses tetap hangat.
- Batas RAM paket kecil dapat membatasi `next build`; bila build gagal karena memori, bangun di GitHub Actions dan unggah hasil `standalone`.
