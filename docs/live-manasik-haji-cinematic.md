# Live Guest: Manasik Haji Cinematic (TK)

Tema Luxe Live Guest bertema miniatur Tanah Suci, versi sinematik dari `manasik-haji-tk`.
Template TIDAK diubah: 8 area bawaan, slot dekor, slot avatar, dan posisi tetap sama dengan `manasik-haji-tk`. Yang baru hanya palet, nama area, dan gambar.

- SQL: `backend/admin-live-theme-manasik-haji-cinematic.sql` (venue `manasik-haji-cinematic`, **nonaktif** sampai aset diunggah).
- Aset: `/assets/live-decor/manasik-haji-cinematic/` (nama berkas di bawah).
- Setelah semua berkas ada: Admin > Live Guest > Venue Builder > aktifkan; lalu buat template Luxe (draft) dengan theme key `manasik-haji-cinematic`, unggah thumbnail, Publikasikan.

## Palet
Hitam Ka'bah `#17130F`, emas `#C9A24A` / `#E2BC5A`, gading `#FBF6E9`, zamrud `#0F6B4B`, krem `#EFE3C8`, pasir `#D9BE8E`, biru langit `#8EC9E8`.

## Pemetaan 10 zona ke 8 area bawaan
Live Guest memiliki 8 area interaktif tetap (menambah area berarti mengubah template). Zona yang diminta dipetakan begini; yang tidak punya area sendiri menjadi pemandangan di lukisan dan teks info.

| Area (id) | Nama di tema | Zona yang diminta |
|---|---|---|
| stage | Ka'bah & Panggung Wisuda | Main Stage (wisuda haji) + Area Ka'bah (simulasi tawaf) |
| resepsi | Area Sa'i (Safa–Marwa) | Area Sa'i |
| booth | Mini Games Haji | Mini Games |
| galeri | Galeri Madinah | Galeri foto Madinah |
| video | Video Ucapan Anak | Video Ucapan |
| buku | Buku Doa & Ucapan | Buku Tamu (doa dan ucapan) |
| kuliner | Kantin & Souvenir Haji | Area Hadiah (souvenir haji virtual) |
| istirahat | Perkemahan Mina | Area Mina (tenda putih) |
| (lukisan saja) | Arafah + Jabal Rahmah, Jamarat, Muzdalifah | Wukuf dan Jamarat sebagai pemandangan edukasi |

Mini game mengikuti 4 game bawaan template. Enam konsep game yang diminta belum bisa ditambah tanpa mengubah template.

## 1. Lukisan venue: `painting.webp` (1672x941, RGB, <350 KB)
Panorama miniatur Tanah Suci, kamera depan sedikit dari atas, hangat dan sinematik. Tata letak (kiri-ke-kanan, jauh-ke-dekat) harus mengikuti posisi area:
- Tengah-atas (z jauh, area stage): halaman marmer putih Masjidil Haram dengan **Ka'bah** kubus hitam proporsional, sabuk kiswah emas dan pintu emas, dikelilingi lingkaran thawaf dan arkade putih bertiang.
- Kiri-jauh: **Masjid Nabawi** mini dengan kubah hijau ikonik dan menara.
- Kanan-jauh: bukit **Safa dan Marwah** dengan jalur sa'i berkarpet dan lampu hijau, di dekat area resepsi.
- Latar paling belakang: gurun **Arafah** dengan Jabal Rahmah dan tugu; di sampingnya **Jamarat** (tiga tugu batu) dan hamparan **tenda putih Mina** berderet rapi di sisi kanan-depan (area istirahat).
- Muzdalifah: hamparan pasir kecil dengan tikar istirahat di tepi kanan.
- Lentera Islam, pohon kurma, lengkungan ornamen; langit biru lembut, sinar matahari emas hangat, pantulan di marmer; kedalaman medan halus.
- Wajib: tanpa orang, tanpa teks, tanpa logo; bangunan presisi dan tidak cacat (Ka'bah berbentuk kubus tegas, tidak miring).

Prompt: `Cinematic miniature 3D diorama of the holy city of Makkah for a children's Hajj manasik event: white marble Masjidil Haram courtyard with a perfectly cubic black Kaaba with golden kiswah band and door, circular tawaf area, white arcades, miniature Masjid Nabawi with green dome on the far left, Safa and Marwah hills with a sa'i path on the right, Jamarat stone pillars, Arafah desert with Mount Arafat, rows of white Mina tents, palm trees, Islamic lanterns, warm golden sunlight, soft volumetric light, marble reflections, subtle depth of field, cheerful child-friendly premium 3D animation style, palette black gold ivory emerald beige sand sky blue, wide 16:9, no people, no text, no logo, accurate architecture`

## 2. Dekor (WebP transparan, ukuran piksel mengikuti `manasik-haji-tk`, tanpa teks kecuali "sign" dan "easel")
| Berkas | Isi | px |
|---|---|---|
| arch | gerbang lengkung ornamen emas-gading dengan lentera | 360x234 |
| sign | papan "Selamat Datang Jamaah Cilik" kaligrafi sederhana, emas di krem | 736x330 |
| easel | papan jadwal manasik (4 langkah) | 314x247 |
| balloons | balon emas, putih, dan zamrud | 291x260 |
| gifts | tumpukan kotak souvenir haji bermotif Ka'bah | 736x330 |
| fountain | sumur zamzam mini dengan air jernih | 162x284 |
| stall_drinks | kios air zamzam mini | 302x245 |
| stall_snacks | kios kurma dan camilan | 317x247 |
| stall_candy | kios souvenir (tasbih, sajadah mini) | 720x330 |
| claw | stan game kumpulkan kerikil jumrah | 279x242 |
| photobooth | bingkai foto kubah hijau Madinah | 266x246 |
| speakers | pengeras suara bernuansa emas | 179x256 |
| bush | semak dan pohon kurma | 187x118 |
| planter | pot tanaman gading-emas | 137x173 |
| lamp | lentera Islam berdiri | 43x208 |
| banner | spanduk "Manasik Haji" gading-zamrud | 555x330 |
| rope | tali pembatas emas | 161x114 |
| table | meja lipat berkain gading | 344x216 |

Gaya sama dengan lukisan; tepi bersih; latar transparan.

## 3. Avatar (WebP transparan, tubuh penuh menghadap depan, chibi, usia TK, ekspresi ceria)
| Berkas | Isi | px |
|---|---|---|
| av_host | jamaah cilik berihram putih, kecil dan manis (maskot utama) | 640x631 |
| av_l1 | anak laki-laki kain ihram putih | 260x594 |
| av_l2 | anak laki-laki baju koko putih + peci | 232x584 |
| av_l3 | ustadz pembimbing dewasa muda berbaju putih | 230x582 |
| av_l4 | anak laki-laki ihram + tas selempang kecil | 283x591 |
| av_p1 | anak perempuan hijab putih | 240x566 |
| av_p2 | anak perempuan mukena putih | 312x583 |
| av_p3 | ustadzah pembimbing hijab putih | 295x563 |
Konsisten satu gaya 3D chibi; pakaian sopan; tanpa aksesori yang tidak sesuai.

## Lisensi
Gambar yang diunggah wajib berlisensi milik penyelenggara.
