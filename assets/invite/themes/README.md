# Tema Undangan 2D NusaMora

Semua undangan 2D dirender oleh satu engine (`assets/invite/core`). Tampilan sebuah undangan ditentukan oleh **paket tema** di folder ini. Engine tidak menyimpan warna, ornamen, ilustrasi, atau teks khas tema, jadi tema baru tidak perlu mengubah kode.

```
themes/
  index.json              registri tema (urutan = urutan di galeri template)
  <id-tema>/
    theme.json            definisi tema
    thumb.webp            gambar galeri 960x540
    art/*.webp            ilustrasi transparan (opsional)
    theme.css             gaya tambahan (opsional, isi "css": "theme.css")
```

## Menambah tema baru

1. Salin folder tema yang paling mirip, ganti nama folder dengan id baru (huruf kecil, angka, tanda minus), mis. `jawa-sogan`.
2. Ubah `theme.json` (lihat skema di bawah). Taruh ilustrasi di `art/` sebagai WebP transparan.
3. Daftarkan di `index.json` pada array `themes` (id, name, description, categories, thumb, swatch).
4. Buka `/undangan?demo=1&theme=jawa-sogan` untuk melihat hasilnya, lalu buat `thumb.webp` dari cover.
5. Tambahkan baris tema di `backend/themes-seed.sql` dan jalankan di Supabase. Template dibuat sebagai paket Essential dengan `capabilities = {"engine":"universal-2d"}` dan slug = id tema; editor dan halaman preview otomatis memakai engine ini.

Tema langsung muncul di galeri `/template` dan di pilihan **Tema undangan** pada editor.

## Skema `theme.json`

| Kunci | Isi |
|---|---|
| `colors` | `deep`, `deep2` (latar gelap), `paper`, `soft` (latar terang), `ink`, `muted` (teks), `accent`, `accent2` (emas/aksen), `petal` (warna partikel) |
| `fonts` | `script` (nama pasangan), `serif` (judul & kutipan), `sans` (teks). Nama keluarga Google Fonts. `extra`: font cadangan untuk aksara lain, mis. `[{"family":"Nanum Myeongjo","axes":"wght@400;700"}]` untuk Hangul. |
| `ornament.pattern` | `lattice`, `dots`, `kawung`, `none`, atau file tema (mis. `art/pattern.svg`). `patternPaper` = pola untuk bagian terang (opsional). |
| `ornament.border` | `tumpal`, `line`, `none`, atau file tema (strip atas-bawah cover) |
| `ornament.corner` | `vine`, `none`, atau file tema |
| `ornament.divider` | `diamond`, `simple`, atau file tema |
| `ornament.frame` | `arch` (bingkai lengkung foto), `none` |
| `ornament.petals` | daftar dari `bloom`, `leaf`, `dot`, `heart` dan/atau file tema (mis. `art/petal-2.webp`); kosong = tanpa partikel |
| `ornament.petalCount` | jumlah partikel dasar (mobile otomatis lebih sedikit) |
| `cover.transition` | `gate` (pintu terbelah), `fade`, `rise` |
| `cover.photo` | `false` untuk menyembunyikan foto sampul di cover |
| `sections` | urutan bagian: `salam`, `mempelai`, `hitung`, `acara`, `kisah`, `galeri`, `rsvp`, `hadiah`, `ucapan`. Hapus untuk menyembunyikan. Hero di awal dan penutup di akhir selalu ada. |
| `css` | file CSS tambahan di folder tema (mis. `theme.css`), untuk mengatur ukuran ilustrasi. Pakai awalan `.th-<id-tema>`. |
| `copy` | teks pengganti, lihat daftar di bawah |
| `art` | ilustrasi per slot, lihat daftar di bawah |

### Teks (`copy`)
`coverEyebrow` (pernikahan), `coverEyebrowEvent` (acara lain, mis. ulang tahun), `profileEyebrow`, `profileTitle` (bagian profil untuk acara satu orang), `guestTo`, `guestSalute`, `guestDefault`, `openButton`, `coupleEyebrow`, `coupleTitle`, `countdownEyebrow`, `countdownTitle`, `eventsEyebrow`, `eventsTitle`, `storyEyebrow`, `storyTitle`, `galleryEyebrow`, `galleryTitle`, `rsvpEyebrow`, `rsvpTitle`, `rsvpLead`, `giftEyebrow`, `giftTitle`, `giftLead`, `wishesEyebrow`, `wishesTitle`, `closingEyebrow`, `closingText`. Teks yang diisi pelanggan di editor (mis. ucapan penutup) selalu didahulukan.

### Slot ilustrasi (`art`)
Nilai: path relatif ke folder tema, `{ "src": "...", "w": 300 }` (w = lebar maksimum px), atau daftar keduanya.

| Slot | Tempat |
|---|---|
| `backdrop` | pemandangan penuh `{ "src": "art/backdrop.webp", "small": "art/backdrop-sm.webp", "width": 1672 }`. Tampil di pintu cover (terbelah saat dibuka), dan sebagai latar hero, panel desktop, serta penutup bila pelanggan belum mengunggah foto sampul. |
| `coverCorner` | sudut atas cover (dicerminkan kiri-kanan); menggantikan sulur SVG |
| `coverHang` | dua hiasan bergantung dan berayun di atas cover |
| `coverGround` | deretan ilustrasi di dasar cover (mis. rumah adat diapit jambangan) |
| `heading` | hiasan kecil di atas setiap judul bagian |
| `introTop`, `introCorners` | hiasan bagian Salam; `introCorners` = [kanan atas, kiri bawah] |
| `figureGroom`, `figureBride` | ilustrasi pengantin bila foto mempelai belum diunggah |
| `countdownRow` | deretan hiasan di bawah hitung mundur |
| `eventBadge` | hiasan pada setiap kartu acara |
| `storyTop`, `giftTop`, `wishesTop` | hiasan pembuka Love Story, Hadiah, Ucapan |
| `rsvpHang` | dua hiasan bergantung di bagian RSVP |
| `closingScene`, `closingFigures` | latar penutup (mis. pelaminan) dan figur di depannya |

## Kategori & demo
`categories` di `theme.json` dan `index.json` menentukan kategori acara yang bisa memakai tema. Demo (`/undangan?demo=1&theme=<id>`) otomatis memakai data contoh kategori pertama tema, mis. ulang tahun untuk Istana Pink.

## Alias
`index.json > aliases` memetakan id lama ke tema baru, sehingga undangan yang sudah terbit tetap tampil saat tema diganti nama.
