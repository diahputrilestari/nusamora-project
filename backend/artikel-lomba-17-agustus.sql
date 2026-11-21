-- Artikel: 20 Ide Lomba 17 Agustus. Langsung published. Aman dijalankan ulang.
insert into public.contents (type, title, slug, lang, excerpt, body, seo_title, seo_description, status, published_at, sort)
select v.* from (values
  ('article', $q$20 Ide Lomba 17 Agustus yang Seru untuk Anak-Anak hingga Orang Dewasa$q$, $q$20-ide-lomba-17-agustus-seru-anak-anak-hingga-orang-dewasa$q$, 'id', $q$Lomba 17 Agustus yang bagus membuat satu kampung tertawa bersama, bukan hanya segelintir peserta. Dua puluh ide, dari yang klasik sampai yang segar, lengkap dengan catatan keselamatan.$q$, $q$Ada lomba yang selalu menyisakan tawa: orang dewasa berlarian di dalam karung, kerupuk bergoyang di ujung tali, dan anak-anak berteriak menyemangati bapaknya. Lomba 17 Agustus bekerja karena satu hal sederhana. **Semua orang boleh kalah, dan kekalahan itu lucu, bukan memalukan.**

Karena itu, memilih lomba bukan soal mana yang paling heboh, tetapi mana yang membuat banyak orang ikut dan tidak ada yang pulang dengan perasaan tersisih.

## Lomba klasik yang tidak pernah usang

1. **Balap karung.** Jalur lurus pendek, lantai rata. Beri jarak antarpeserta agar tidak saling tabrak.
2. **Makan kerupuk.** Tangan tidak boleh memegang. Pakai kerupuk kecil agar tidak tersedak, dan siapkan air minum.
3. **Tarik tambang.** Pisahkan kelompok berdasarkan usia atau berat badan yang seimbang, dan gunakan tali yang kuat.
4. **Lomba kelereng.** Peserta membawa kelereng di sendok sambil berjalan. Aman untuk anak dan sepuh.
5. **Balap bakiak.** Bakiak panjang untuk tiga atau empat orang. Kuncinya kekompakan, bukan kecepatan.
6. **Memasukkan paku ke dalam botol.** Paku diikat pada tali di pinggang, lalu peserta menunduk memasukkannya. Gunakan paku besar yang tumpul atau pengganti seperti sedotan agar aman.

## Untuk anak-anak

7. **Lomba memindahkan bola** dari satu ember ke ember lain dengan sendok.
8. **Lomba mewarnai bendera** untuk usia balita dan TK.
9. **Estafet sarung atau topi:** anak memakai lalu melepas atribut sambil berlari.
10. **Lomba menyusun puzzle peta Indonesia.**
11. **Lomba memasukkan bola ke keranjang** dengan jarak yang disesuaikan umur.

## Untuk remaja

12. **Cerdas cermat sejarah kemerdekaan.** Gunakan soal yang lucu agar suasana tetap cair.
13. **Lomba tebak lagu perjuangan.**
14. **Estafet air:** memindahkan air dengan gelas dari satu ember ke ember lain.
15. **Lomba yel-yel antar RT.**

## Untuk orang dewasa dan keluarga

16. **Lomba joget balon:** berpasangan, balon di antara dada, lalu berjoget tanpa menjatuhkannya.
17. **Lomba menghias tumpeng atau nasi kuning** antar RT.
18. **Lomba lagu daerah** berkelompok.
19. **Lomba karaoke bapak-bapak dan ibu-ibu.**
20. **Lomba keluarga kompak:** tugas bergantian yang mengharuskan semua anggota keluarga ikut.

## Soal panjat pinang

Panjat pinang adalah tradisi yang sangat populer, tetapi juga yang paling berisiko cedera. Bila tetap diadakan, pastikan tiang kokoh, tinggi dan jumlah peserta sesuai, ada alas lunak di bawah, petugas yang berjaga, dan batasi usia peserta. Banyak kampung menggantinya dengan versi yang lebih rendah dan aman.

## Cara membuat lomba tidak berantakan

- **Susun jadwal yang masuk akal.** Lomba anak di pagi hari saat cuaca sejuk, lomba dewasa di sore hari.
- **Tunjuk satu juri per lomba** dan sepakati aturan sebelum mulai. Sebagian besar protes berasal dari aturan yang tidak jelas.
- **Siapkan hadiah untuk semua anak,** bukan hanya juara. Hadiah kecil sudah cukup.
- **Sediakan air minum, kotak P3K, dan tempat berteduh.**
- **Beri pilihan ikut atau menonton,** terutama bagi sepuh dan mereka yang tidak nyaman.
- **Siapkan lomba cadangan** bila hujan turun.
- **Libatkan semua RT atau RW,** agar acara terasa milik bersama.

## Mengumumkan dan mengundang

Pengumuman yang jelas membuat warga datang tepat waktu. Cantumkan hari, jam, lokasi, daftar lomba, dan cara mendaftar. Undangan digital yang dikirim lewat grup warga lebih mudah ditemukan dibanding selebaran. Pola penyusunan dan waktu kirimnya ada di [waktu ideal mengirim undangan](/artikel/kapan-undangan-ulang-tahun-sebaiknya-dikirim-waktu-yang-ideal) dan [tips membagikan undangan lewat WhatsApp](/artikel/tips-membagikan-undangan-digital-lewat-whatsapp).

## Ide permainan lain

Untuk kegiatan yang lebih ringan bagi anak-anak, lihat [10 games anak](/artikel/10-games-ulang-tahun-anak-membuat-semua-tamu-bersenang-senang). Untuk lomba di sekolah, baca [ide acara class meeting](/artikel/15-ide-acara-class-meeting-kreatif-tidak-membosankan). Untuk kantor atau komunitas, lihat [employee gathering](/artikel/employee-gathering-20-ide-aktivitas-karyawan-lebih-dekat) dan [family gathering](/artikel/family-gathering-15-ide-acara-keluarga-mempererat-hubungan).

Bila Anda ingin mengirim undangan dan pengumuman acara dengan rapi, [lihat pilihan paket NusaMora](/paket).$q$, $q$20 Ide Lomba 17 Agustus Seru untuk Anak hingga Dewasa$q$, $q$20 ide lomba 17 Agustus untuk anak, remaja, dan dewasa, dengan catatan keselamatan, tips penyelenggaraan, dan cara mengumumkan acara.$q$, 'published', now(), 0)
) as v(type, title, slug, lang, excerpt, body, seo_title, seo_description, status, published_at, sort)
where not exists (select 1 from public.contents c where c.type = 'article' and c.slug = v.slug and c.lang = v.lang);
