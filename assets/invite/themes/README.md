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
5. Tambahkan baris tema di `backend/themes-seed.sql` dan jalankan di Supabase, atau buat template dengan slug yang sama di Admin > Manajemen Template. Slug template = id tema.

Tema langsung muncul di galeri `/template` dan di pilihan **Tema undangan** pada editor.

## Skema `theme.json`

| Kunci | Isi |
|---|---|
| `colors` | `deep`, `deep2` (latar gelap), `paper`, `soft` (latar terang), `ink`, `muted` (teks), `accent`, `accent2` (emas/aksen), `petal` (warna partikel) |
| `fonts` | `script` (nama pasangan), `serif` (judul & kutipan), `sans` (teks). Nama keluarga Google Fonts. |
| `ornament.pattern` | `lattice`, `dots`, `kawung`, `none` |
| `ornament.border` | `tumpal`, `line`, `none` (strip atas-bawah cover) |
| `ornament.corner` | `vine`, `none` |
| `ornament.divider` | `diamond`, `simple` |
| `ornament.frame` | `arch` (bingkai lengkung foto), `none` |
| `ornament.petals` | daftar dari `bloom`, `leaf`, `dot`, `heart`; kosong = tanpa partikel |
| `ornament.petalCount` | jumlah partikel dasar (mobile otomatis lebih sedikit) |
| `cover.transition` | `gate` (pintu terbelah), `fade`, `rise` |
| `cover.photo` | `false` untuk menyembunyikan foto sampul di cover |
| `sections` | urutan bagian: `salam`, `mempelai`, `hitung`, `acara`, `kisah`, `galeri`, `rsvp`, `hadiah`, `ucapan`. Hapus untuk menyembunyikan. Hero di awal dan penutup di akhir selalu ada. |
| `copy` | teks pengganti, lihat daftar di bawah |
| `art` | ilustrasi per slot, lihat daftar di bawah |

### Teks (`copy`)
`coverEyebrow`, `coverEyebrowEvent`, `guestTo`, `guestSalute`, `guestDefault`, `openButton`, `coupleEyebrow`, `coupleTitle`, `countdownEyebrow`, `countdownTitle`, `eventsEyebrow`, `eventsTitle`, `storyEyebrow`, `storyTitle`, `galleryEyebrow`, `galleryTitle`, `rsvpEyebrow`, `rsvpTitle`, `rsvpLead`, `giftEyebrow`, `giftTitle`, `giftLead`, `wishesEyebrow`, `wishesTitle`, `closingEyebrow`, `closingText`. Teks yang diisi pelanggan di editor (mis. ucapan penutup) selalu didahulukan.

### Slot ilustrasi (`art`)
Nilai: path relatif ke folder tema, `{ "src": "...", "w": 300 }` (w = lebar maksimum px), atau daftar keduanya.

| Slot | Tempat |
|---|---|
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

## Alias
`index.json > aliases` memetakan id lama ke tema baru, sehingga undangan yang sudah terbit tetap tampil saat tema diganti nama.
