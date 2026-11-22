-- Penggabungan 2 pasang artikel (disetujui pemilik, 22 Nov 2026). Backup: public.contents_backup_20261122.
-- JALANKAN SETELAH .htaccess (301) sudah live. Idempotent.

-- 1) Undangan digital: langkah di NusaMora dilipat ke artikel panjang
update public.contents set body = replace(replace(body,
 E'> Catatan: artikel ini membahas langkah umum. Untuk langkah penggunaan di NusaMora, lihat juga panduan [cara membuat undangan pernikahan digital](/artikel/cara-membuat-undangan-pernikahan-digital).\n\n', ''),
 E'## Penutup',
 E'## Langkah praktis membuatnya di NusaMora\n\nSetelah data siap, alurnya di NusaMora seperti berikut. Progres tersimpan sebagai draft sehingga bisa dilanjutkan kapan saja.\n\n1. **Daftar dan masuk** dengan email Anda. Akun dipakai untuk menyimpan draft, mengelola daftar tamu, dan melihat RSVP serta ucapan.\n2. **Pilih paket.** Tersedia **Essential** (undangan website 2D), **Signature** (undangan 3D sinematik), dan **Luxe** (undangan 3D Live Guest yang interaktif). Masih ragu? Baca [cara memilih paket undangan digital](/artikel/memilih-paket-undangan-digital).\n3. **Pilih kategori dan template.** Setiap template punya tombol **Coba Demo** untuk melihat tampilannya dengan data contoh.\n4. **Tentukan link undangan** yang mudah diingat, misalnya berisi nama mempelai.\n5. **Isi data undangan:** nama mempelai, tanggal dan waktu, lokasi, foto, musik, dan bagian lain yang tersedia.\n6. **Lihat preview** di ukuran desktop, tablet, dan ponsel, lalu pastikan nama, tanggal, dan alamat sudah benar.\n7. **Checkout dan bagikan.** Setelah pembayaran terkonfirmasi, undangan aktif dan link siap dibagikan.\n\nAda pertanyaan? Hubungi kami di support@nusamora.com.\n\n## Penutup')
where slug='cara-membuat-undangan-pernikahan-digital-sendiri-tanpa-keahlian-desain' and type='article'
  and body not like '%Langkah praktis membuatnya di NusaMora%';

-- 2) Pensiun: ide perayaan dan hadiah dari artikel Retirement Party dilipat ke Retirement Celebration
update public.contents set body = replace(replace(body,
 E'Untuk gagasan perayaan yang lebih personal, baca juga [Retirement Party](/artikel/retirement-party-ide-perayaan-pensiun-menghargai-perjalanan-karyawan).',
 E'Pensiun juga perubahan identitas dan rutinitas, jadi bagian "Ide perayaan" di bawah memuat gagasan yang lebih personal.'),
 E'## Hal yang perlu dijaga',
 E'## Ide perayaan\n\n- **Makan malam bersama keluarga dan tim** untuk suasana yang lebih akrab.\n- **Video perjalanan karier** dari foto dan testimoni rekan.\n- **Buku kenangan** berisi pesan dari rekan dan klien.\n- **Pidato rekan dekat** tentang kesan dan pelajaran yang diambil.\n- **Pameran foto** perjalanan kariernya di kantor.\n- **Penanaman pohon** sebagai simbol warisan.\n\n## Hadiah yang bermakna\n\n- Album atau bingkai karya dari perjalanan kariernya.\n- Hadiah untuk hobi yang akan ia tekuni.\n- Pengalaman, seperti perjalanan atau kelas baru.\n- Surat dari pimpinan dan tim.\n\nUntuk suasana yang lebih formal, lihat juga [gala dinner perusahaan](/artikel/gala-dinner-perusahaan-15-ide-tema-elegan-eksklusif).\n\n## Hal yang perlu dijaga')
where slug='retirement-celebration-cara-mengadakan-acara-pensiun-penuh-apresiasi' and type='article'
  and body not like '%## Ide perayaan%';

-- 3) Tautan lama di artikel lain diarahkan ke artikel utama
update public.contents set body = regexp_replace(body, '\(/artikel/cara-membuat-undangan-pernikahan-digital\)', '(/artikel/cara-membuat-undangan-pernikahan-digital-sendiri-tanpa-keahlian-desain)', 'g')
where type='article' and slug not in ('cara-membuat-undangan-pernikahan-digital') and body like '%(/artikel/cara-membuat-undangan-pernikahan-digital)%';
update public.contents set body = replace(body, '(/artikel/retirement-party-ide-perayaan-pensiun-menghargai-perjalanan-karyawan)', '(/artikel/retirement-celebration-cara-mengadakan-acara-pensiun-penuh-apresiasi)')
where type='article' and slug<>'retirement-party-ide-perayaan-pensiun-menghargai-perjalanan-karyawan' and body like '%(/artikel/retirement-party-ide-perayaan-pensiun-menghargai-perjalanan-karyawan)%';

-- 4) Tarik artikel lama dari publikasi (baris tetap ada untuk pemulihan)
update public.contents set status='draft' where type='article' and slug in
 ('cara-membuat-undangan-pernikahan-digital','retirement-party-ide-perayaan-pensiun-menghargai-perjalanan-karyawan');
