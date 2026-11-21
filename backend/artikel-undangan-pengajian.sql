-- Satu artikel: undangan pengajian digital. Langsung published. Aman dijalankan ulang (dilewati bila slug sudah ada).
insert into public.contents (type, title, slug, lang, excerpt, body, seo_title, seo_description, status, published_at, sort)
select v.* from (values
  ('article', $q$Undangan Pengajian Digital: Contoh Desain dan Kata-Kata yang Bisa Digunakan$q$, $q$undangan-pengajian-digital-contoh-desain-dan-kata-kata$q$, 'id', $q$Undangan pengajian yang baik terasa tenang, sopan, dan jelas. Ini contoh desain, kata-kata, dan cara menyusunnya agar jamaah mudah hadir.$q$, $q$Pengajian adalah acara yang dihadiri berbagai kalangan, dari anak muda sampai sesepuh. Karena itu, undangannya perlu **tenang, sopan, dan mudah dipahami dalam beberapa detik**. Tamu harus langsung tahu apa acaranya, kapan, di mana, dan siapa yang mengisi.

> Catatan: sesuaikan bahasa dan nuansa dengan tradisi majelis atau keluarga Anda. Ketersediaan template berbeda-beda, lihat [halaman template](/#template) dan [paket NusaMora](/paket).

## Jenis acara pengajian

Undangan bisa dipakai untuk pengajian rutin, tasyakuran, syukuran rumah, peringatan hari besar, doa bersama, atau pengajian menjelang pernikahan. Pesan inti tiap acara berbeda, jadi sesuaikan kalimat pembukanya.

## Contoh desain

1. **Minimalis putih dan hijau** dengan tipografi bersih.
2. **Krem dan emas lembut** untuk kesan hangat.
3. **Ornamen arabesque tipis** sebagai bingkai.
4. **Kaligrafi sederhana** sebagai aksen judul.
5. **Siluet masjid** dengan warna tenang.
6. **Motif bulan sabit dan bintang** yang halus.
7. **Palet sage dan putih** untuk kesan teduh.
8. **Foto lokasi atau dekorasi** dengan sapuan warna lembut.
9. **Tipografi besar** yang mudah dibaca sesepuh.
10. **Nuansa biru tua dan putih** untuk acara formal.

## Isi yang perlu ada

- Nama acara dan tujuan, misalnya pengajian rutin atau syukuran.
- Hari, tanggal, jam, dan lokasi dengan peta.
- Nama penceramah atau pengisi acara.
- Susunan acara singkat.
- Kontak penanggung jawab.
- Informasi konsumsi bila ada.
- RSVP bila jumlah jamaah perlu dihitung.

## Contoh kata-kata

**Formal**
*Assalamu'alaikum warahmatullahi wabarakatuh.* Dengan memohon rahmat dan ridha Allah SWT, kami mengundang Bapak/Ibu/Saudara/i untuk hadir pada pengajian yang akan diselenggarakan pada hari, tanggal, dan tempat berikut. Kehadiran dan doa Anda sangat kami harapkan.

**Hangat**
*Bismillahirrahmanirrahim.* Mari berkumpul, mengaji, dan saling mendoakan dalam suasana yang hangat. Kami menunggu kehadiran Bapak/Ibu bersama keluarga.

**Untuk syukuran**
Sebagai wujud syukur atas nikmat yang Allah berikan, kami mengundang keluarga dan sahabat untuk hadir dan mendoakan bersama.

**Penutup**
"Atas kehadiran dan doanya, kami ucapkan terima kasih. Jazakumullahu khairan."

Pola kalimat lain bisa mengikuti [contoh kata-kata undangan aqiqah](/artikel/contoh-kata-kata-undangan-aqiqah-sopan-islami-menyentuh-hati).

## Tips agar undangan mudah dipahami

- Tulis nama acara di bagian atas dengan huruf besar.
- Pastikan jam dan zona waktu jelas.
- Gunakan warna kontras agar nyaman dibaca orang tua.
- Uji undangan di ponsel sebelum dibagikan.
- Hindari musik latar yang mengganggu bila undangan dibuka di tempat umum.

## Kapan mengirim

Sekitar 1 sampai 2 minggu sebelum acara untuk pengajian rutin, dan 2 sampai 3 minggu untuk acara besar. Kirim pengingat sehari sebelumnya. Pola waktunya mirip dengan [waktu ideal mengirim undangan](/artikel/kapan-undangan-ulang-tahun-sebaiknya-dikirim-waktu-yang-ideal), dan pengirimannya bisa mengikuti [tips membagikan undangan lewat WhatsApp](/artikel/tips-membagikan-undangan-digital-lewat-whatsapp).

## Menyiapkan acara

Bagi tugas panitia: penerima tamu, konsumsi, perlengkapan, dan dokumentasi. Bila acara terkait kelahiran, lihat [tasyakuran kelahiran bayi](/artikel/tasyakuran-kelahiran-bayi-cara-mengadakan-acara-sederhana-penuh-makna) dan [susunan acara aqiqah](/artikel/susunan-acara-aqiqah-sederhana-tetap-khidmat).

## Penutup

Undangan pengajian yang baik mengajak orang hadir dengan hati yang tenang. Pilih desain yang bersih, tulis kata-kata yang tulus, dan pastikan informasinya jelas. Untuk mulai menyiapkan, [lihat pilihan paket NusaMora](/paket).$q$, $q$Undangan Pengajian Digital: Contoh Desain dan Kata-Kata$q$, $q$Contoh desain dan kata-kata undangan pengajian digital: isi yang perlu ada, contoh kalimat formal dan hangat, serta tips mengirim.$q$, 'published', now(), 0)
) as v(type, title, slug, lang, excerpt, body, seo_title, seo_description, status, published_at, sort)
where not exists (select 1 from public.contents c where c.type = 'article' and c.slug = v.slug and c.lang = v.lang);
