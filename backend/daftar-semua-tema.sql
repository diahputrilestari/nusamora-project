-- NusaMora: daftarkan SEMUA template Essential 2D ke katalog sekaligus.
-- Jalankan sekali di Supabase > SQL Editor. Aman diulang: baris yang sudah ada dilewati.
-- Semua baris disalin dari template 'nusa-kpop-party' (layout, harga, bahasa).
begin;

-- ==== daftar-tema-baru.sql ====
-- Daftarkan 39 template Essential baru ke katalog (jalankan sekali di Supabase > SQL Editor).
-- Menyalin baris "nusa-kpop-party" (layout, harga, bahasa, dll.) lalu mengganti nama, slug, kategori, tema, dan gambar.
-- Aman dijalankan ulang: baris yang sudah ada dilewati.
with src as (select * from public.templates where slug = 'nusa-kpop-party'),
base as (select 'https://dodgerblue-cod-965274.hostingersite.com/assets-essential/invite' as u),
n(slug, name, descr, cats, cat_id, theme, srt) as (values
  ('nusa-little-blackgold', 'Luxury Black Gold Wedding 2D',
   'Pernikahan mewah hitam-emas: aula marmer gelap dengan lampu kristal, tirai beludru, lengkung emas, dan rangkaian lili putih, serta pengantin chibi berbusana hitam bersulam emas.',
   '{wedding,engagement}'::text[], (select id from public.event_categories where slug = 'wedding' limit 1), 'little-blackgold', 81),
  ('nusa-little-luxury', 'Luxury Maroon Wedding 2D',
   'Pernikahan mewah maroon-emas: aula marmer berkarpet merah dengan tirai beludru, lampu kristal, dan rangkaian mawar, serta pengantin chibi berbusana maroon bersulam emas.',
   '{wedding,engagement}'::text[], (select id from public.event_categories where slug = 'wedding' limit 1), 'little-luxury', 80),
  ('nusa-little-beige', 'Beige Gold Wedding 2D',
   'Pernikahan elegan krem-emas: panggung lengkung marmer dengan lentera, lily, dan panel emas, serta pengantin chibi berbusana beige.',
   '{wedding,engagement}'::text[], (select id from public.event_categories where slug = 'wedding' limit 1), 'little-beige', 79),
  ('nusa-little-bugis', 'Bugis Makassar Wedding 2D',
   'Pernikahan adat Bugis Makassar: rumah panggung kayu berukir emas dengan tirai merah, payung dan lentera emas, kapal pinisi di tepi laut, serta pengantin chibi berbusana bodo dan baju bella dada.',
   '{wedding,engagement}'::text[], (select id from public.event_categories where slug = 'wedding' limit 1), 'little-bugis', 78),
  ('nusa-little-idol', 'Idol Birthday Event 2D',
   'Fan party ulang tahun idol K-pop: panggung konser neon ungu-pink dengan lampu sorot, spanduk mahkota, dan booth fan, serta fans chibi berlightstick.',
   '{birthday}'::text[], 'd3cbe4ed-0e85-4f63-b982-ed79d9194022'::uuid, 'little-idol', 77),
  ('nusa-little-hackathon', 'Hackathon Night 2D',
   'Event hackathon bernuansa neon: kota malam ungu dengan gerbang cahaya, panggung bercincin neon, kursi gaming dan booth-booth acara, serta peserta chibi berkode </>.',
   '{corporate,seminar}'::text[], (select id from public.event_categories where slug = 'corporate' limit 1), 'little-hackathon', 76),
  ('nusa-little-sakura', 'Sakura Wedding 2D',
   'Pernikahan taman sakura: panggung bunga ceri dengan lentera emas, jembatan merah di tepi danau, serta pengantin chibi berbusana tradisional Jepang.',
   '{wedding,engagement}'::text[], (select id from public.event_categories where slug = 'wedding' limit 1), 'little-sakura', 75),
  ('nusa-little-wizard', 'Wizard Academy 2D',
   'Pesta ulang tahun akademi penyihir: panggung kastil berlampu dengan topi sihir, panji asrama, jendela bintang, dan kuali ramuan, serta karakter chibi penyihir cilik berjubah ungu-emas.',
   '{birthday}'::text[], 'd3cbe4ed-0e85-4f63-b982-ed79d9194022'::uuid, 'little-wizard', 74),
  ('nusa-arabian-knight', 'Arabian Knight Wedding 2D',
   'Pernikahan malam Arabia: panggung emas berukir dengan lentera, tirai ungu, bulan sabit dan masjid di tepi danau, serta pengantin chibi berbusana ungu-emas.',
   '{wedding,engagement}'::text[], (select id from public.event_categories where slug = 'wedding' limit 1), 'arabian-knight', 73),
  ('nusa-little-pirates', 'Little Pirates 2D',
   'Pesta ulang tahun bajak laut kecil: panggung kapal kayu berlampu dengan topi bajak laut, kompas, peta harta, kapal layar di lautan, serta karakter chibi kapten, bajak laut, dan pangeran berkostum merah-cokelat.',
   '{birthday}'::text[], 'd3cbe4ed-0e85-4f63-b982-ed79d9194022'::uuid, 'little-pirates', 72),
  ('nusa-little-soccer', 'Soccer Champions 2D',
   'Pesta ulang tahun sepak bola: panggung podium berlampu dengan lencana bola dan pita emas, gawang, banner juara, serta lapangan hijau, bersama karakter chibi pemain, pemandu sorak, kiper, dan penonton berseragam biru-emas.',
   '{birthday}'::text[], 'd3cbe4ed-0e85-4f63-b982-ed79d9194022'::uuid, 'little-soccer', 71),
  ('nusa-little-basketball', 'Basketball All-Star 2D',
   'Pesta ulang tahun basketball all-star: panggung podium berlampu dengan lencana bola basket, ring, banner bintang, dan tribun penonton, serta karakter chibi pemain, pemandu sorak, dan penonton berseragam biru-oranye.',
   '{birthday}'::text[], 'd3cbe4ed-0e85-4f63-b982-ed79d9194022'::uuid, 'little-basketball', 70),
  ('nusa-little-baseball', 'Baseball League 2D',
   'Pesta ulang tahun baseball league: panggung podium berlampu dengan lencana bola dan tongkat, lapangan, papan skor, dan tribun penonton, serta karakter chibi pemain, pemandu sorak, dan penonton berseragam biru-merah.',
   '{birthday}'::text[], 'd3cbe4ed-0e85-4f63-b982-ed79d9194022'::uuid, 'little-baseball', 69),
  ('nusa-little-farm', 'Little Farm Friends 2D',
   'Pesta ulang tahun peternakan: panggung lumbung merah berlampu dengan bendera kotak-kotak, jerami, kincir angin, dan padang rumput, serta karakter chibi petani cilik berkostum overall, topi jerami, dan sapi.',
   '{birthday}'::text[], 'd3cbe4ed-0e85-4f63-b982-ed79d9194022'::uuid, 'little-farm', 68),
  ('nusa-little-dino', 'Little Dino Friends 2D',
   'Pesta ulang tahun dino friends: panggung podium berlampu dengan gerbang batu berselimut sulur, hutan prasejarah, air terjun, dan gunung berapi, serta karakter chibi penjelajah berkostum dino.',
   '{birthday}'::text[], 'd3cbe4ed-0e85-4f63-b982-ed79d9194022'::uuid, 'little-dino', 67),
  ('nusa-little-rocket', 'Little Rocket Explorer 2D',
   'Pesta ulang tahun penjelajah roket: panggung podium berlampu dengan peluncuran roket, bulan, dan observatorium di langit berbintang, serta karakter chibi astronot, penjelajah, dan kru antariksa berseragam biru tua-oranye.',
   '{birthday}'::text[], 'd3cbe4ed-0e85-4f63-b982-ed79d9194022'::uuid, 'little-rocket', 66),
  ('nusa-little-train', 'Little Train Adventure 2D',
   'Pesta ulang tahun petualangan kereta api: panggung kayu berlampu dengan lokomotif uap, jembatan lengkung, dan stasiun bergaya klasik, serta karakter chibi masinis, kondektur, dan penumpang berseragam biru tua-merah marun.',
   '{birthday}'::text[], 'd3cbe4ed-0e85-4f63-b982-ed79d9194022'::uuid, 'little-train', 65),
  ('nusa-little-pilot', 'Little Pilot 2D',
   'Pesta ulang tahun little pilot: panggung podium berlampu biru-emas dengan landasan bandara, pesawat, dan menara kontrol, awan-awan lembut, serta karakter chibi pilot, pramugari, dan kru bandara berseragam biru tua.',
   '{birthday}'::text[], 'd3cbe4ed-0e85-4f63-b982-ed79d9194022'::uuid, 'little-pilot', 64),
  ('nusa-little-firefighter', 'Little Firefighter 2D',
   'Pesta ulang tahun little firefighter: panggung podium berlampu dengan pos pemadam, truk damkar dan helikopter, hidran, serta karakter chibi pemadam kebakaran berhelm dan seragam merah-kuning.',
   '{birthday}'::text[], 'd3cbe4ed-0e85-4f63-b982-ed79d9194022'::uuid, 'little-firefighter', 63),
  ('nusa-little-construction', 'Little Construction Zone 2D',
   'Pesta ulang tahun zona konstruksi: panggung podium berlampu kuning-hitam dengan derek, ekskavator, dan truk, tenda proyek, rambu alat berat, serta karakter chibi pekerja bangunan berhelm dan rompi safety.',
   '{birthday}'::text[], 'd3cbe4ed-0e85-4f63-b982-ed79d9194022'::uuid, 'little-construction', 62),
  ('nusa-little-police', 'Little Police Patrol 2D',
   'Pesta ulang tahun polisi patroli: panggung podium berlampu biru-emas dengan markas polisi dan helikopter, mobil patroli, menara jaga, serta karakter chibi polisi, polisi lalu lintas, dan pilot berseragam biru tua kotak-kotak.',
   '{birthday}'::text[], 'd3cbe4ed-0e85-4f63-b982-ed79d9194022'::uuid, 'little-police', 61),
  ('nusa-little-racing', 'Little Racing Champion 2D',
   'Pesta ulang tahun racing champion: panggung podium berlampu dengan gapura bendera finish, sirkuit balap, tenda pit stop, trofi emas, serta karakter chibi pembalap, mekanik, dan kru berseragam merah-hitam kotak-kotak.',
   '{birthday}'::text[], 'd3cbe4ed-0e85-4f63-b982-ed79d9194022'::uuid, 'little-racing', 60),
  ('nusa-little-pearl', 'Little Ocean Pearl 2D',
   'Pesta ulang tahun mutiara lautan: panggung marmer dengan gapura kerang dan lumba-lumba, karang warna-warni, istana bawah laut, serta karakter chibi pangeran, putri duyung, pelaut, dan peri berbusana biru-ungu mutiara.',
   '{birthday}'::text[], 'd3cbe4ed-0e85-4f63-b982-ed79d9194022'::uuid, 'little-pearl', 59),
  ('nusa-little-strawberry', 'Little Strawberry Garden 2D',
   'Pesta ulang tahun kebun strawberry ceria: panggung merah muda berpagar putih, taplak gingham, rumah strawberry, bunga dan keranjang buah, serta karakter chibi bergaun gingham-renda.',
   '{birthday}'::text[], 'd3cbe4ed-0e85-4f63-b982-ed79d9194022'::uuid, 'little-strawberry', 58),
  ('nusa-little-candy', 'Little Candyland 2D',
   'Pesta ulang tahun negeri permen: panggung merah muda dengan gapura permen, lolipop raksasa, bukit gula-gula, pelangi dan istana kue, serta karakter chibi bergaun krim-sprinkle.',
   '{birthday}'::text[], 'd3cbe4ed-0e85-4f63-b982-ed79d9194022'::uuid, 'little-candy', 57),
  ('nusa-little-forest', 'Little Magic Forest 2D',
   'Pesta ulang tahun hutan ajaib: panggung kayu di bawah pohon rindang berhias lentera, jamur, air terjun dan rumah pohon, serta karakter chibi peri, pemanah, dan anak rubah berbusana hijau-krem.',
   '{birthday}'::text[], 'd3cbe4ed-0e85-4f63-b982-ed79d9194022'::uuid, 'little-forest', 56),
  ('nusa-little-ice', 'Little Ice Princess 2D',
   'Pesta ulang tahun putri es: aula salju berhias aurora, istana es, kristal biru, kereta camilan dan gapura bersalju, serta karakter chibi pangeran & putri berbusana biru-perak.',
   '{birthday}'::text[], 'd3cbe4ed-0e85-4f63-b982-ed79d9194022'::uuid, 'little-ice', 55),
  ('nusa-little-arab', 'Little Princess Arabian Night 2D',
   'Pesta ulang tahun putri malam Arabia: panggung emas berukir dengan lentera, tirai ungu, bulan sabit dan masjid di tepi danau, serta karakter chibi pangeran dan putri berbusana ungu-emas.',
   '{birthday}'::text[], 'd3cbe4ed-0e85-4f63-b982-ed79d9194022'::uuid, 'little-arab', 54),
  ('nusa-little-barbie', 'Little Princess Pink Luxe 2D',
   'Pesta ulang tahun putri pink mewah: panggung istana merah muda dengan menara puri, lampu kristal, vas emas berisi mawar, karpet glamor, serta karakter chibi pangeran dan putri bergaun pink berkilau.',
   '{birthday}'::text[], 'd3cbe4ed-0e85-4f63-b982-ed79d9194022'::uuid, 'little-barbie', 53),
  ('nusa-little-swan', 'Little Swan Princess 2D',
   'Pesta ulang tahun putri angsa: aula istana merah muda-lavender dengan angsa bermahkota, danau berkilau, lampu kristal, bunga mawar, serta karakter chibi pangeran dan putri bergaun sayap angsa.',
   '{birthday}'::text[], 'd3cbe4ed-0e85-4f63-b982-ed79d9194022'::uuid, 'little-swan', 52),
  ('nusa-little-princess', 'Little Princess 2D',
   'Pesta ulang tahun putri kecil bergaya dongeng sepatu kaca: aula istana putih-biru dengan lampu kristal, karpet biru, bunga hydrangea, lentera emas, serta karakter chibi pangeran dan putri bergaun biru muda.',
   '{birthday}'::text[], 'd3cbe4ed-0e85-4f63-b982-ed79d9194022'::uuid, 'little-princess', 51),
  ('nusa-little-doctor', 'Little Doctor 2D',
   'Pesta ulang tahun dokter cilik: panggung klinik biru muda dengan sofa emas, kue detak jantung, balon palang merah, serta karakter chibi dokter dan perawat berjas putih.',
   '{birthday}'::text[], 'd3cbe4ed-0e85-4f63-b982-ed79d9194022'::uuid, 'little-doctor', 50),
  ('nusa-little-chef', 'Little Chef 2D',
   'Pesta ulang tahun koki cilik: panggung dapur ceria dengan gapura topi koki, tirai merah-putih, kedai roti, oven pizza, dan karakter chibi koki berseragam merah.',
   '{birthday}'::text[], 'd3cbe4ed-0e85-4f63-b982-ed79d9194022'::uuid, 'little-chef', 49),
  ('nusa-little-circus', 'Little Circus 2D',
   'Pesta ulang tahun sirkus: tenda bergaris merah-putih, komidi putar, badut dan karakter chibi penghibur sirkus.',
   '{birthday}'::text[], 'd3cbe4ed-0e85-4f63-b982-ed79d9194022'::uuid, 'little-circus', 47),
  ('nusa-little-prince', 'Little Prince 2D',
   'Pesta ulang tahun pangeran kecil: panggung istana putih di bawah langit malam berbintang, mahkota emas, balon udara, teleskop, dan karakter chibi pangeran serta putri.',
   '{birthday}'::text[], 'd3cbe4ed-0e85-4f63-b982-ed79d9194022'::uuid, 'little-prince', 48),
  ('nusa-viking-party', 'Viking Party 2D',
   'Pesta ulang tahun petualangan Viking: panggung kayu bertanduk dengan kapal naga dan air terjun, kapal layar bergaris, kedai makanan, tenda berbulu, perisai, kapak, dan lentera hangat.',
   '{birthday}'::text[], 'd3cbe4ed-0e85-4f63-b982-ed79d9194022'::uuid, 'viking-party', 23),
  ('nusa-kuromi-party', 'Kuromi Party 2D',
   'Pesta ulang tahun ungu-pink bergaya Kuromi: panggung tirai ungu di taman kastil, air mancur, balon hati, photo booth, mesin capit, dan untaian lampu bintang.',
   '{birthday}'::text[], 'd3cbe4ed-0e85-4f63-b982-ed79d9194022'::uuid, 'kuromi-party', 24),
  ('nusa-samurai-sakura', 'Samurai Sakura Party 2D',
   'Pesta ulang tahun festival Jepang: panggung kayu di bawah sakura dengan gerbang torii, kabuto emas, katana, lentera kertas, kedai jajanan, daruma, kipas, dan karakter chibi berpakaian samurai serta hakama.',
   '{birthday}'::text[], 'd3cbe4ed-0e85-4f63-b982-ed79d9194022'::uuid, 'samurai-sakura', 26),
  ('nusa-aqiqah-istana-pink', 'Aqiqah Istana Pink 2D',
   'Tasyakuran aqiqah bernuansa istana merah muda: lentera emas, Al-Qur''an di atas rehal, bulan sabit, gazebo bertirai, teddy dan kelinci, serta ilustrasi bayi berhijab bermahkota.',
   '{aqiqah}'::text[], '110dbbc4-0dc3-4452-9b4e-1932fc665e07'::uuid, 'aqiqah-istana-pink', 25)
)
insert into public.templates (slug, name, description, thumbnail_url, preview_url, package_type, categories, category_id, theme_key, status, sort, price, layout, capabilities, languages, default_language, featured, recommended, version, published_at)
select n.slug, n.name, n.descr,
       base.u || '/themes/' || n.theme || '/thumb.webp',
       base.u || '/index?demo=1&theme=' || n.theme,
       'essential', n.cats, n.cat_id, n.theme, 'published', n.srt, src.price, src.layout, src.capabilities, src.languages, src.default_language, false, false, 1, now()
from n, src, base
where not exists (select 1 from public.templates t where t.slug = n.slug);

-- Urutkan katalog Essential dari yang paling baru.
-- Halaman template membaca urutan dari kolom "sort" (kecil = tampil lebih dulu),
-- jadi kita beri nomor ulang: template terbaru mendapat sort terkecil.
-- Jalankan ulang setiap kali menambah template baru supaya yang baru selalu di depan.
with r as (
  select id, row_number() over (order by created_at desc, sort desc, name) as rn
  from public.templates
  where package_type = 'essential'
)
update public.templates t set sort = r.rn
from r where t.id = r.id;

-- ==== daftar-tema-emerald.sql ====
-- Daftarkan template Essential "Luxury Emerald Wedding 2D" (jalankan sekali di Supabase > SQL Editor).
-- Menyalin baris "nusa-kpop-party" (layout, harga, bahasa) lalu mengganti nama, slug, kategori, tema, dan gambar.
-- Aman dijalankan ulang: baris yang sudah ada dilewati.
with src as (select * from public.templates where slug = 'nusa-kpop-party')
insert into public.templates (slug, name, description, thumbnail_url, preview_url, package_type, categories, category_id, theme_key, status, sort, price, layout, capabilities, languages, default_language, featured, recommended, version, published_at)
select 'nusa-little-emerald', 'Luxury Emerald Wedding 2D',
       'Pernikahan mewah hijau zamrud-emas: aula marmer dengan tirai beludru emerald, air mancur, lampu kristal, dan rangkaian lili putih, serta pengantin chibi berhijab dan berjas emerald bersulam emas.',
       '/assets/invite/themes/little-emerald/thumb.webp', '/undangan?demo=1&theme=little-emerald',
       'essential', '{wedding,engagement}'::text[], (select id from public.event_categories where slug = 'wedding' limit 1), 'little-emerald', 'published', 0,
       src.price, src.layout, src.capabilities, src.languages, src.default_language, false, false, 1, now()
from src
where not exists (select 1 from public.templates t where t.slug = 'nusa-little-emerald');

-- ==== daftar-tema-upaway.sql ====
-- Daftarkan template Essential "Up Up & Away Birthday 2D" (jalankan sekali di Supabase > SQL Editor).
-- Menyalin baris "nusa-kpop-party" (layout, harga, bahasa) lalu mengganti nama, slug, kategori, tema, dan gambar.
-- Aman dijalankan ulang: baris yang sudah ada dilewati.
with src as (select * from public.templates where slug = 'nusa-kpop-party')
insert into public.templates (slug, name, description, thumbnail_url, preview_url, package_type, categories, category_id, theme_key, status, sort, price, layout, capabilities, languages, default_language, featured, recommended, version, published_at)
select 'nusa-little-upaway', 'Up Up & Away Birthday 2D',
       'Pesta ulang tahun balon udara pastel: panggung berawan dengan lengkung lampu dan pita ungu, balon udara, koper vintage, dan pesawat mungil, dengan booth bertema awan.',
       '/assets/invite/themes/little-upaway/thumb.webp', '/undangan?demo=1&theme=little-upaway',
       'essential', '{birthday}'::text[], 'd3cbe4ed-0e85-4f63-b982-ed79d9194022'::uuid, 'little-upaway', 'published', 0,
       src.price, src.layout, src.capabilities, src.languages, src.default_language, false, false, 1, now()
from src
where not exists (select 1 from public.templates t where t.slug = 'nusa-little-upaway');

-- ==== daftar-tema-ballerina.sql ====
-- Daftarkan template Essential "Little Ballerina Birthday 2D" (jalankan sekali di Supabase > SQL Editor).
-- Menyalin baris "nusa-kpop-party" (layout, harga, bahasa) lalu mengganti nama, slug, kategori, tema, dan gambar.
-- Aman dijalankan ulang: baris yang sudah ada dilewati.
with src as (select * from public.templates where slug = 'nusa-kpop-party')
insert into public.templates (slug, name, description, thumbnail_url, preview_url, package_type, categories, category_id, theme_key, status, sort, price, layout, capabilities, languages, default_language, featured, recommended, version, published_at)
select 'nusa-little-ballerina', 'Little Ballerina Birthday 2D',
       'Pesta ulang tahun little ballerina: panggung istana pastel dengan tirai ungu, jendela lengkung, pemandangan kastil, dan karangan mawar, serta booth bertema balet.',
       '/assets/invite/themes/little-ballerina/thumb.webp', '/undangan?demo=1&theme=little-ballerina',
       'essential', '{birthday}'::text[], 'd3cbe4ed-0e85-4f63-b982-ed79d9194022'::uuid, 'little-ballerina', 'published', 0,
       src.price, src.layout, src.capabilities, src.languages, src.default_language, false, false, 1, now()
from src
where not exists (select 1 from public.templates t where t.slug = 'nusa-little-ballerina');

-- ==== daftar-tema-sunflower.sql ====
-- Daftarkan template Essential "Little Sunflower Birthday 2D" (jalankan sekali di Supabase > SQL Editor).
-- Menyalin baris "nusa-kpop-party" (layout, harga, bahasa) lalu mengganti nama, slug, kategori, tema, dan gambar.
-- Aman dijalankan ulang: baris yang sudah ada dilewati.
with src as (select * from public.templates where slug = 'nusa-kpop-party')
insert into public.templates (slug, name, description, thumbnail_url, preview_url, package_type, categories, category_id, theme_key, status, sort, price, layout, capabilities, languages, default_language, featured, recommended, version, published_at)
select 'nusa-little-sunflower', 'Little Sunflower Birthday 2D',
       'Pesta ulang tahun kebun bunga matahari: panggung kayu hangat dengan tirai gingham kuning, gapura bunga, kincir angin, dan booth bertema sunflower.',
       '/assets/invite/themes/little-sunflower/thumb.webp', '/undangan?demo=1&theme=little-sunflower',
       'essential', '{birthday}'::text[], 'd3cbe4ed-0e85-4f63-b982-ed79d9194022'::uuid, 'little-sunflower', 'published', 0,
       src.price, src.layout, src.capabilities, src.languages, src.default_language, false, false, 1, now()
from src
where not exists (select 1 from public.templates t where t.slug = 'nusa-little-sunflower');

-- ==== daftar-tema-celtic.sql ====
-- Daftarkan template Essential "Celtic Woodland Wedding 2D" (jalankan sekali di Supabase > SQL Editor).
-- Menyalin baris "nusa-kpop-party" (layout, harga, bahasa) lalu mengganti nama, slug, kategori, tema, dan gambar.
-- Aman dijalankan ulang: baris yang sudah ada dilewati.
with src as (select * from public.templates where slug = 'nusa-kpop-party')
insert into public.templates (slug, name, description, thumbnail_url, preview_url, package_type, categories, category_id, theme_key, status, sort, price, layout, capabilities, languages, default_language, featured, recommended, version, published_at)
select 'nusa-little-celtic', 'Celtic Woodland Wedding 2D',
       'Pernikahan/lamaran hutan Celtic: gapura batu berukir triquetra, air terjun dan rusa putih di balik pepohonan, lentera emas, spanduk hijau, serta pengantin chibi berbusana hijau-krem dengan sulam emas.',
       '/assets/invite/themes/little-celtic/thumb.webp', '/undangan?demo=1&theme=little-celtic',
       'essential', '{wedding,engagement}'::text[], (select id from public.event_categories where slug = 'wedding' limit 1), 'little-celtic', 'published', 0,
       src.price, src.layout, src.capabilities, src.languages, src.default_language, false, false, 1, now()
from src
where not exists (select 1 from public.templates t where t.slug = 'nusa-little-celtic');

-- ==== daftar-tema-venetian.sql ====
-- Daftarkan template Essential "Venetian Masquerade Wedding 2D" (jalankan sekali di Supabase > SQL Editor).
-- Menyalin baris "nusa-kpop-party" (layout, harga, bahasa) lalu mengganti nama, slug, kategori, tema, dan gambar.
-- Aman dijalankan ulang: baris yang sudah ada dilewati.
with src as (select * from public.templates where slug = 'nusa-kpop-party')
insert into public.templates (slug, name, description, thumbnail_url, preview_url, package_type, categories, category_id, theme_key, status, sort, price, layout, capabilities, languages, default_language, featured, recommended, version, published_at)
select 'nusa-little-venetian', 'Venetian Masquerade Wedding 2D',
       'Pernikahan/lamaran bergaya pesta topeng Venesia: panggung marmer dengan tirai beludru merah marun dan emas, kanal serta jembatan malam, karangan mawar merah, dan pengantin chibi bertopeng emas.',
       '/assets/invite/themes/little-venetian/thumb.webp', '/undangan?demo=1&theme=little-venetian',
       'essential', '{wedding,engagement}'::text[], (select id from public.event_categories where slug = 'wedding' limit 1), 'little-venetian', 'published', 0,
       src.price, src.layout, src.capabilities, src.languages, src.default_language, false, false, 1, now()
from src
where not exists (select 1 from public.templates t where t.slug = 'nusa-little-venetian');

-- ==== daftar-tema-minimalist.sql ====
-- Daftarkan template Essential "Minimalist Wedding 2D" (jalankan sekali di Supabase > SQL Editor).
-- Menyalin baris "nusa-kpop-party" (layout, harga, bahasa) lalu mengganti nama, slug, kategori, tema, dan gambar.
-- Aman dijalankan ulang: baris yang sudah ada dilewati.
with src as (select * from public.templates where slug = 'nusa-kpop-party')
insert into public.templates (slug, name, description, thumbnail_url, preview_url, package_type, categories, category_id, theme_key, status, sort, price, layout, capabilities, languages, default_language, featured, recommended, version, published_at)
select 'nusa-little-minimalist', 'Minimalist Wedding 2D',
       'Pernikahan/lamaran minimalis krem-emas: aula kaca modern dengan panggung marmer, kolam pantul, lentera, dan rangkaian mawar putih, serta pengantin chibi berbusana krem.',
       '/assets/invite/themes/little-minimalist/thumb.webp', '/undangan?demo=1&theme=little-minimalist',
       'essential', '{wedding,engagement}'::text[], (select id from public.event_categories where slug = 'wedding' limit 1), 'little-minimalist', 'published', 0,
       src.price, src.layout, src.capabilities, src.languages, src.default_language, false, false, 1, now()
from src
where not exists (select 1 from public.templates t where t.slug = 'nusa-little-minimalist');

-- ==== daftar-tema-terracotta.sql ====
-- Daftarkan template Essential "Terracotta Wedding 2D" (jalankan sekali di Supabase > SQL Editor).
-- Menyalin baris "nusa-kpop-party" (layout, harga, bahasa) lalu mengganti nama, slug, kategori, tema, dan gambar.
-- Aman dijalankan ulang: baris yang sudah ada dilewati.
with src as (select * from public.templates where slug = 'nusa-kpop-party')
insert into public.templates (slug, name, description, thumbnail_url, preview_url, package_type, categories, category_id, theme_key, status, sort, price, layout, capabilities, languages, default_language, featured, recommended, version, published_at)
select 'nusa-little-terracotta', 'Terracotta Wedding 2D',
       'Pernikahan/lamaran terakota hangat: aula kaca berpanggung lengkung dengan lampu rotan, kolam pantul, mawar persik, serta pengantin chibi berbusana terakota dan krem.',
       '/assets/invite/themes/little-terracotta/thumb.webp', '/undangan?demo=1&theme=little-terracotta',
       'essential', '{wedding,engagement}'::text[], (select id from public.event_categories where slug = 'wedding' limit 1), 'little-terracotta', 'published', 0,
       src.price, src.layout, src.capabilities, src.languages, src.default_language, false, false, 1, now()
from src
where not exists (select 1 from public.templates t where t.slug = 'nusa-little-terracotta');

-- ==== daftar-tema-lampung.sql ====
-- Daftarkan template Essential "Adat Lampung 2D" (jalankan sekali di Supabase > SQL Editor).
-- Menyalin baris "nusa-kpop-party" (layout, harga, bahasa) lalu mengganti nama, slug, kategori, tema, dan gambar.
-- Aman dijalankan ulang: baris yang sudah ada dilewati.
with src as (select * from public.templates where slug = 'nusa-kpop-party')
insert into public.templates (slug, name, description, thumbnail_url, preview_url, package_type, categories, category_id, theme_key, status, sort, price, layout, capabilities, languages, default_language, featured, recommended, version, published_at)
select 'nusa-little-lampung', 'Adat Lampung 2D',
       'Pernikahan/lamaran adat Lampung: pelaminan beratap sirap dengan siger emas, permadani tapis merah marun, payung emas, dan pengantin chibi berbusana adat Lampung.',
       '/assets/invite/themes/little-lampung/thumb.webp', '/undangan?demo=1&theme=little-lampung',
       'essential', '{wedding,engagement}'::text[], (select id from public.event_categories where slug = 'wedding' limit 1), 'little-lampung', 'published', 0,
       src.price, src.layout, src.capabilities, src.languages, src.default_language, false, false, 1, now()
from src
where not exists (select 1 from public.templates t where t.slug = 'nusa-little-lampung');

-- ==== daftar-tema-betawi.sql ====
-- Daftarkan template Essential "Adat Betawi 2D" (jalankan sekali di Supabase > SQL Editor).
-- Menyalin baris "nusa-kpop-party" (layout, harga, bahasa) lalu mengganti nama, slug, kategori, tema, dan gambar.
-- Aman dijalankan ulang: baris yang sudah ada dilewati.
with src as (select * from public.templates where slug = 'nusa-kpop-party')
insert into public.templates (slug, name, description, thumbnail_url, preview_url, package_type, categories, category_id, theme_key, status, sort, price, layout, capabilities, languages, default_language, featured, recommended, version, published_at)
select 'nusa-little-betawi', 'Adat Betawi 2D',
       'Pernikahan/lamaran adat Betawi: rumah kebaya berkayu hijau berhias gigi balang emas, atap genteng terakota, kembang kelapa, serta pengantin chibi berbusana none dan abang Betawi.',
       '/assets/invite/themes/little-betawi/thumb.webp', '/undangan?demo=1&theme=little-betawi',
       'essential', '{wedding,engagement}'::text[], (select id from public.event_categories where slug = 'wedding' limit 1), 'little-betawi', 'published', 0,
       src.price, src.layout, src.capabilities, src.languages, src.default_language, false, false, 1, now()
from src
where not exists (select 1 from public.templates t where t.slug = 'nusa-little-betawi');

-- ==== daftar-tema-bali.sql ====
-- Daftarkan template Essential "Adat Bali 2D" (jalankan sekali di Supabase > SQL Editor).
-- Menyalin baris "nusa-kpop-party" (layout, harga, bahasa) lalu mengganti nama, slug, kategori, tema, dan gambar.
-- Aman dijalankan ulang: baris yang sudah ada dilewati.
with src as (select * from public.templates where slug = 'nusa-kpop-party')
insert into public.templates (slug, name, description, thumbnail_url, preview_url, package_type, categories, category_id, theme_key, status, sort, price, layout, capabilities, languages, default_language, featured, recommended, version, published_at)
select 'nusa-little-bali', 'Adat Bali 2D',
       'Pernikahan/lamaran adat Bali: bale beratap ijuk dengan ukiran emas, penjor dan payung agung, patung penjaga pura, frangipani, serta pengantin chibi berbusana payas agung Bali.',
       '/assets/invite/themes/little-bali/thumb.webp', '/undangan?demo=1&theme=little-bali',
       'essential', '{wedding,engagement}'::text[], (select id from public.event_categories where slug = 'wedding' limit 1), 'little-bali', 'published', 0,
       src.price, src.layout, src.capabilities, src.languages, src.default_language, false, false, 1, now()
from src
where not exists (select 1 from public.templates t where t.slug = 'nusa-little-bali');

-- ==== daftar-tema-hydrangea.sql ====
-- Daftarkan template Essential "Blue Hydrangea 2D" (jalankan sekali di Supabase > SQL Editor).
-- Menyalin baris "nusa-kpop-party" (layout, harga, bahasa) lalu mengganti nama, slug, kategori, tema, dan gambar.
-- Aman dijalankan ulang: baris yang sudah ada dilewati.
with src as (select * from public.templates where slug = 'nusa-kpop-party')
insert into public.templates (slug, name, description, thumbnail_url, preview_url, package_type, categories, category_id, theme_key, status, sort, price, layout, capabilities, languages, default_language, featured, recommended, version, published_at)
select 'nusa-little-hydrangea', 'Blue Hydrangea 2D',
       'Pernikahan/lamaran Blue Hydrangea: aula marmer putih berpilar dengan tirai biru langit, hortensia dan mawar pastel, lampu kristal emas, serta pengantin chibi berbusana biru muda.',
       '/assets/invite/themes/little-hydrangea/thumb.webp', '/undangan?demo=1&theme=little-hydrangea',
       'essential', '{wedding,engagement}'::text[], (select id from public.event_categories where slug = 'wedding' limit 1), 'little-hydrangea', 'published', 0,
       src.price, src.layout, src.capabilities, src.languages, src.default_language, false, false, 1, now()
from src
where not exists (select 1 from public.templates t where t.slug = 'nusa-little-hydrangea');

-- ==== daftar-tema-india17.sql ====
-- Daftarkan template Essential "Sweet 17 India 2D" (jalankan sekali di Supabase > SQL Editor).
-- Menyalin baris "nusa-kpop-party" (layout, harga, bahasa) lalu mengganti nama, slug, kategori, tema, dan gambar.
-- Aman dijalankan ulang: baris yang sudah ada dilewati.
with src as (select * from public.templates where slug = 'nusa-kpop-party')
insert into public.templates (slug, name, description, thumbnail_url, preview_url, package_type, categories, category_id, theme_key, status, sort, price, layout, capabilities, languages, default_language, featured, recommended, version, published_at)
select 'nusa-little-india17', 'Sweet 17 India 2D',
       'Pesta sweet seventeen bertema India: istana marmer putih berkubah dengan tirai magenta, karangan marigold dan bunga pink, lentera emas, kolam teratai, serta booth bernuansa kerawang.',
       '/assets/invite/themes/little-india17/thumb.webp', '/undangan?demo=1&theme=little-india17',
       'essential', '{birthday}'::text[], 'd3cbe4ed-0e85-4f63-b982-ed79d9194022'::uuid, 'little-india17', 'published', 0,
       src.price, src.layout, src.capabilities, src.languages, src.default_language, false, false, 1, now()
from src
where not exists (select 1 from public.templates t where t.slug = 'nusa-little-india17');

-- ==== daftar-tema-papua.sql ====
-- Daftarkan template Essential "Adat Papua 2D" (jalankan sekali di Supabase > SQL Editor).
-- Menyalin baris "nusa-kpop-party" (layout, harga, bahasa) lalu mengganti nama, slug, kategori, tema, dan gambar.
-- Aman dijalankan ulang: baris yang sudah ada dilewati.
with src as (select * from public.templates where slug = 'nusa-kpop-party')
insert into public.templates (slug, name, description, thumbnail_url, preview_url, package_type, categories, category_id, theme_key, status, sort, price, layout, capabilities, languages, default_language, featured, recommended, version, published_at)
select 'nusa-little-papua', 'Adat Papua 2D',
       'Pernikahan/lamaran adat Papua: paviliun beratap alang-alang di tepi danau, totem ukir, lentera, hibiscus dan kamboja, bulu cenderawasih, serta pengantin chibi berbusana adat.',
       '/assets/invite/themes/little-papua/thumb.webp', '/undangan?demo=1&theme=little-papua',
       'essential', '{wedding,engagement}'::text[], (select id from public.event_categories where slug = 'wedding' limit 1), 'little-papua', 'published', 0,
       src.price, src.layout, src.capabilities, src.languages, src.default_language, false, false, 1, now()
from src
where not exists (select 1 from public.templates t where t.slug = 'nusa-little-papua');

-- ==== daftar-tema-riau.sql ====
-- Daftarkan template Essential "Melayu Riau 2D" (jalankan sekali di Supabase > SQL Editor).
-- Menyalin baris "nusa-kpop-party" (layout, harga, bahasa) lalu mengganti nama, slug, kategori, tema, dan gambar.
-- Aman dijalankan ulang: baris yang sudah ada dilewati.
with src as (select * from public.templates where slug = 'nusa-kpop-party')
insert into public.templates (slug, name, description, thumbnail_url, preview_url, package_type, categories, category_id, theme_key, status, sort, price, layout, capabilities, languages, default_language, featured, recommended, version, published_at)
select 'nusa-little-riau', 'Melayu Riau 2D',
       'Pernikahan/lamaran adat Melayu Riau: balai berlipat kuning emas beratap hijau di tepi sungai, karangan melati dan bunga kuning, lampu hias, serta pengantin chibi berbusana hijau-emas.',
       '/assets/invite/themes/little-riau/thumb.webp', '/undangan?demo=1&theme=little-riau',
       'essential', '{wedding,engagement}'::text[], (select id from public.event_categories where slug = 'wedding' limit 1), 'little-riau', 'published', 0,
       src.price, src.layout, src.capabilities, src.languages, src.default_language, false, false, 1, now()
from src
where not exists (select 1 from public.templates t where t.slug = 'nusa-little-riau');

-- ==== daftar-tema-aqiqah-biru.sql ====
-- Daftarkan template Essential "Aqiqah Istana Biru 2D" (jalankan sekali di Supabase > SQL Editor).
-- Menyalin baris "nusa-kpop-party" (layout, harga, bahasa) lalu mengganti nama, slug, kategori, tema, dan gambar.
-- Aman dijalankan ulang: baris yang sudah ada dilewati.
with src as (select * from public.templates where slug = 'nusa-kpop-party')
insert into public.templates (slug, name, description, thumbnail_url, preview_url, package_type, categories, category_id, theme_key, status, sort, price, layout, capabilities, languages, default_language, featured, recommended, version, published_at)
select 'nusa-aqiqah-istana-biru', 'Aqiqah Istana Biru 2D',
       'Tasyakuran aqiqah bernuansa istana biru-krem: lengkung mozaik biru dan emas, lentera emas, kolam teratai, kubah masjid, domba kecil, bulan sabit, serta ilustrasi bayi laki-laki berkopiah.',
       '/assets/invite/themes/aqiqah-istana-biru/thumb.webp', '/undangan?demo=1&theme=aqiqah-istana-biru',
       'essential', '{aqiqah}'::text[], '110dbbc4-0dc3-4452-9b4e-1932fc665e07'::uuid, 'aqiqah-istana-biru', 'published', 0,
       src.price, src.layout, src.capabilities, src.languages, src.default_language, false, false, 1, now()
from src
where not exists (select 1 from public.templates t where t.slug = 'nusa-aqiqah-istana-biru');

-- ==== daftar-tema-wisuda.sql ====
-- Daftarkan template Essential "Wisuda Skripsi 2D" (jalankan sekali di Supabase > SQL Editor).
-- Menyalin baris "nusa-kpop-party" (layout, harga, bahasa) lalu mengganti nama, slug, kategori, tema, dan gambar.
-- Aman dijalankan ulang: baris yang sudah ada dilewati.
with src as (select * from public.templates where slug = 'nusa-kpop-party')
insert into public.templates (slug, name, description, thumbnail_url, preview_url, package_type, categories, category_id, theme_key, status, sort, price, layout, capabilities, languages, default_language, featured, recommended, version, published_at)
select 'nusa-little-wisuda', 'Wisuda Skripsi 2D',
       'Syukuran kelulusan skripsi: panggung ungu-emas bertirai dengan toga dan daun laurel, karangan bunga pink, lentera emas, photo booth dan galeri foto, serta wisudawati chibi bertoga membawa skripsi.',
       '/assets/invite/themes/little-wisuda/thumb.webp', '/undangan?demo=1&theme=little-wisuda',
       'essential', '{graduation}'::text[], (select id from public.event_categories where slug = 'graduation'), 'little-wisuda', 'published', 0,
       src.price, src.layout, src.capabilities, src.languages, src.default_language, false, false, 1, now()
from src
where not exists (select 1 from public.templates t where t.slug = 'nusa-little-wisuda');

-- ==== daftar-tema-manasik.sql ====
-- Daftarkan template Essential "Manasik Haji Cilik 2D" (jalankan sekali di Supabase > SQL Editor).
-- Menyalin baris "nusa-kpop-party" (layout, harga, bahasa) lalu mengganti nama, slug, kategori, tema, dan gambar.
-- Aman dijalankan ulang: baris yang sudah ada dilewati.
with src as (select * from public.templates where slug = 'nusa-kpop-party')
insert into public.templates (slug, name, description, thumbnail_url, preview_url, package_type, categories, category_id, theme_key, status, sort, price, layout, capabilities, languages, default_language, featured, recommended, version, published_at)
select 'nusa-little-manasik', 'Manasik Haji Cilik 2D',
       'Manasik haji anak TK: panggung putih-emas bermenara dengan karpet hijau, Ka''bah mungil, papan arah Sa''i dan Wukuf, booth hijau-emas, serta dua anak berpakaian ihram.',
       '/assets/invite/themes/little-manasik/thumb.webp', '/undangan?demo=1&theme=little-manasik',
       'essential', '{other}'::text[], (select id from public.event_categories where slug = 'other'), 'little-manasik', 'published', 0,
       src.price, src.layout, src.capabilities, src.languages, src.default_language, false, false, 1, now()
from src
where not exists (select 1 from public.templates t where t.slug = 'nusa-little-manasik');

-- ==== daftar-tema-wisuda-sma.sql ====
-- Daftarkan template Essential "Wisuda SMA 2D" (jalankan sekali di Supabase > SQL Editor).
-- Menyalin baris "nusa-kpop-party" (layout, harga, bahasa) lalu mengganti nama, slug, kategori, tema, dan gambar.
-- Aman dijalankan ulang: baris yang sudah ada dilewati.
with src as (select * from public.templates where slug = 'nusa-kpop-party')
insert into public.templates (slug, name, description, thumbnail_url, preview_url, package_type, categories, category_id, theme_key, status, sort, price, layout, capabilities, languages, default_language, featured, recommended, version, published_at)
select 'nusa-little-wisuda-sma', 'Wisuda SMA 2D',
       'Syukuran kelulusan SMA: aula wisuda navy-emas dengan tirai, spanduk, balon, dan lili-hortensia, booth buku tamu, photo booth, galeri foto, serta lulusan chibi berjubah navy membawa gulungan ijazah.',
       '/assets/invite/themes/little-wisuda-sma/thumb.webp', '/undangan?demo=1&theme=little-wisuda-sma',
       'essential', '{graduation}'::text[], (select id from public.event_categories where slug = 'graduation'), 'little-wisuda-sma', 'published', 0,
       src.price, src.layout, src.capabilities, src.languages, src.default_language, false, false, 1, now()
from src
where not exists (select 1 from public.templates t where t.slug = 'nusa-little-wisuda-sma');

-- ==== daftar-tema-move-on.sql ====
-- Daftarkan template Essential "Move On Celebration – Live Guest 2D" (jalankan sekali di Supabase > SQL Editor).
-- Menyalin baris "nusa-kpop-party" (layout, harga, bahasa) lalu mengganti nama, slug, kategori, tema, dan gambar.
-- Aman dijalankan ulang: baris yang sudah ada dilewati.
with src as (select * from public.templates where slug = 'nusa-kpop-party')
insert into public.templates (slug, name, description, thumbnail_url, preview_url, package_type, categories, category_id, theme_key, status, sort, price, layout, capabilities, languages, default_language, featured, recommended, version, published_at)
select 'nusa-move-on-celebration', 'Move On Celebration – Live Guest 2D',
       'Pesta move on dan bab baru: panggung marmer ungu-senja bertabur lampu dan bunga sakura, papan Healing-Self Love-Growth, booth buku tamu, photo booth, galeri, fan letter wall, serta si tokoh utama chibi bergaun pink.',
       '/assets/invite/themes/move-on-celebration/thumb.webp', '/undangan?demo=1&theme=move-on-celebration',
       'essential', '{other}'::text[], (select id from public.event_categories where slug = 'other'), 'move-on-celebration', 'published', 0,
       src.price, src.layout, src.capabilities, src.languages, src.default_language, false, false, 1, now()
from src
where not exists (select 1 from public.templates t where t.slug = 'nusa-move-on-celebration');

-- ==== daftar-tema-babyshower.sql ====
-- Daftarkan template Essential "Baby Shower 2D" (jalankan sekali di Supabase > SQL Editor).
-- Menyalin baris "nusa-kpop-party" (layout, harga, bahasa) lalu mengganti nama, slug, kategori, tema, dan gambar.
-- Aman dijalankan ulang: baris yang sudah ada dilewati.
with src as (select * from public.templates where slug = 'nusa-kpop-party')
insert into public.templates (slug, name, description, thumbnail_url, preview_url, package_type, categories, category_id, theme_key, status, sort, price, layout, capabilities, languages, default_language, featured, recommended, version, published_at)
select 'nusa-little-babyshower', 'Baby Shower 2D',
       'Perayaan virtual menyambut bayi pertama: panggung krem bertirai dengan bunga hortensia biru-pink, balon dan lentera, booth buku tamu, photo booth bulan-beruang, galeri USG, serta sepasang calon ayah-bunda chibi berbaju biru.',
       '/assets/invite/themes/little-babyshower/thumb.webp', '/undangan?demo=1&theme=little-babyshower',
       'essential', '{other}'::text[], (select id from public.event_categories where slug = 'other'), 'little-babyshower', 'published', 0,
       src.price, src.layout, src.capabilities, src.languages, src.default_language, false, false, 1, now()
from src
where not exists (select 1 from public.templates t where t.slug = 'nusa-little-babyshower');

-- ==== daftar-tema-kemerdekaan.sql ====
-- Daftarkan template Essential "Hari Kemerdekaan 17 Agustus 2D" (jalankan sekali di Supabase > SQL Editor).
-- Menyalin baris "nusa-kpop-party" (layout, harga, bahasa) lalu mengganti nama, slug, kategori, tema, dan gambar.
-- Aman dijalankan ulang: baris yang sudah ada dilewati.
with src as (select * from public.templates where slug = 'nusa-kpop-party')
insert into public.templates (slug, name, description, thumbnail_url, preview_url, package_type, categories, category_id, theme_key, status, sort, price, layout, capabilities, languages, default_language, featured, recommended, version, published_at)
select 'nusa-hari-kemerdekaan', 'Hari Kemerdekaan 17 Agustus 2D',
       'Perayaan virtual Hari Kemerdekaan 17 Agustus: panggung kayu bergorden merah-putih dengan Garuda, Monas, bendera dan kokarde, booth buku tamu, photo booth, galeri, serta pemuda berpeci pembawa semangat merdeka.',
       '/assets/invite/themes/hari-kemerdekaan/thumb.webp', '/undangan?demo=1&theme=hari-kemerdekaan',
       'essential', '{other}'::text[], (select id from public.event_categories where slug = 'other'), 'hari-kemerdekaan', 'published', 0,
       src.price, src.layout, src.capabilities, src.languages, src.default_language, false, false, 1, now()
from src
where not exists (select 1 from public.templates t where t.slug = 'nusa-hari-kemerdekaan');

-- ==== daftar-tema-kartini.sql ====
-- Daftarkan template Essential "Hari Kartini 2D" (jalankan sekali di Supabase > SQL Editor).
-- Menyalin baris "nusa-kpop-party" (layout, harga, bahasa) lalu mengganti nama, slug, kategori, tema, dan gambar.
-- Aman dijalankan ulang: baris yang sudah ada dilewati.
with src as (select * from public.templates where slug = 'nusa-kpop-party')
insert into public.templates (slug, name, description, thumbnail_url, preview_url, package_type, categories, category_id, theme_key, status, sort, price, layout, capabilities, languages, default_language, featured, recommended, version, published_at)
select 'nusa-hari-kartini', 'Hari Kartini 2D',
       'Perayaan Hari Kartini: panggung kayu berukir dengan potret Kartini, vas bunga, karpet batik maroon-emas, booth buku tamu, photo booth, galeri, kuliner, serta perempuan berkebaya dan bunga melati di sanggul.',
       '/assets/invite/themes/hari-kartini/thumb.webp', '/undangan?demo=1&theme=hari-kartini',
       'essential', '{other}'::text[], (select id from public.event_categories where slug = 'other'), 'hari-kartini', 'published', 0,
       src.price, src.layout, src.capabilities, src.languages, src.default_language, false, false, 1, now()
from src
where not exists (select 1 from public.templates t where t.slug = 'nusa-hari-kartini');

-- ==== daftar-tema-hardiknas.sql ====
-- Daftarkan template Essential "Hardiknas 2D" (jalankan sekali di Supabase > SQL Editor).
-- Menyalin baris "nusa-kpop-party" (layout, harga, bahasa) lalu mengganti nama, slug, kategori, tema, dan gambar.
-- Aman dijalankan ulang: baris yang sudah ada dilewati.
with src as (select * from public.templates where slug = 'nusa-kpop-party')
insert into public.templates (slug, name, description, thumbnail_url, preview_url, package_type, categories, category_id, theme_key, status, sort, price, layout, capabilities, languages, default_language, featured, recommended, version, published_at)
select 'nusa-hardiknas', 'Hardiknas 2D',
       'Perayaan Hari Pendidikan Nasional: aula kayu bergorden merah-putih dengan papan Hardiknas, toga dan buku, karpet biru-emas, booth buku tamu, photo booth toga, galeri sekolah, serta pelajar berbatik biru-emas.',
       '/assets/invite/themes/hardiknas/thumb.webp', '/undangan?demo=1&theme=hardiknas',
       'essential', '{other}'::text[], (select id from public.event_categories where slug = 'other'), 'hardiknas', 'published', 0,
       src.price, src.layout, src.capabilities, src.languages, src.default_language, false, false, 1, now()
from src
where not exists (select 1 from public.templates t where t.slug = 'nusa-hardiknas');

-- ==== daftar-tema-pramuka.sql ====
-- Daftarkan template Essential "Hari Pramuka 2D" (jalankan sekali di Supabase > SQL Editor).
-- Menyalin baris "nusa-kpop-party" (layout, harga, bahasa) lalu mengganti nama, slug, kategori, tema, dan gambar.
-- Aman dijalankan ulang: baris yang sudah ada dilewati.
with src as (select * from public.templates where slug = 'nusa-kpop-party')
insert into public.templates (slug, name, description, thumbnail_url, preview_url, package_type, categories, category_id, theme_key, status, sort, price, layout, capabilities, languages, default_language, featured, recommended, version, published_at)
select 'nusa-hari-pramuka', 'Hari Pramuka 2D',
       'Perayaan 14 Agustus – Hari Pramuka: panggung perkemahan dengan papan tali, tenda, api unggun, kacu merah-putih dan lencana tunas kelapa, booth buku tamu, photo booth, galeri, kuliner, serta pramuka cilik berseragam coklat.',
       '/assets/invite/themes/hari-pramuka/thumb.webp', '/undangan?demo=1&theme=hari-pramuka',
       'essential', '{other}'::text[], (select id from public.event_categories where slug = 'other'), 'hari-pramuka', 'published', 0,
       src.price, src.layout, src.capabilities, src.languages, src.default_language, false, false, 1, now()
from src
where not exists (select 1 from public.templates t where t.slug = 'nusa-hari-pramuka');

-- ==== daftar-tema-rups.sql ====
-- Daftarkan template Essential "RUPS AGM 2D" (jalankan sekali di Supabase > SQL Editor).
-- Menyalin baris "nusa-kpop-party" (layout, harga, bahasa) lalu mengganti nama, slug, kategori, tema, dan gambar.
-- Aman dijalankan ulang: baris yang sudah ada dilewati.
with src as (select * from public.templates where slug = 'nusa-kpop-party')
insert into public.templates (slug, name, description, thumbnail_url, preview_url, package_type, categories, category_id, theme_key, status, sort, price, layout, capabilities, languages, default_language, featured, recommended, version, published_at)
select 'nusa-rups-agm', 'RUPS AGM 2D',
       'RUPS / Annual General Meeting: aula korporat marmer putih berpanel emas dengan dua layar presentasi, podium dan bunga ungu, booth buku tamu, photo booth, galeri, kuliner, meja pemegang saham, serta profesional berjas ungu.',
       '/assets/invite/themes/rups-agm/thumb.webp', '/undangan?demo=1&theme=rups-agm',
       'essential', '{other}'::text[], (select id from public.event_categories where slug = 'other'), 'rups-agm', 'published', 0,
       src.price, src.layout, src.capabilities, src.languages, src.default_language, false, false, 1, now()
from src
where not exists (select 1 from public.templates t where t.slug = 'nusa-rups-agm');

-- ==== daftar-tema-grandopening.sql ====
-- Daftarkan template Essential "Grand Opening 2D" (jalankan sekali di Supabase > SQL Editor).
-- Menyalin baris "nusa-kpop-party" (layout, harga, bahasa) lalu mengganti nama, slug, kategori, tema, dan gambar.
-- Aman dijalankan ulang: baris yang sudah ada dilewati.
with src as (select * from public.templates where slug = 'nusa-kpop-party')
insert into public.templates (slug, name, description, thumbnail_url, preview_url, package_type, categories, category_id, theme_key, status, sort, price, layout, capabilities, languages, default_language, featured, recommended, version, published_at)
select 'nusa-grand-opening', 'Grand Opening 2D',
       'Grand Opening – Peresmian Kantor/Cabang Baru: aula ungu-emas bertabur balon dan karangan bunga, pita peresmian dengan gunting, dua layar gedung baru, booth buku tamu, photo booth, galeri kantor, kuliner, serta tim profesional berjas ungu.',
       '/assets/invite/themes/grand-opening/thumb.webp', '/undangan?demo=1&theme=grand-opening',
       'essential', '{other}'::text[], (select id from public.event_categories where slug = 'other'), 'grand-opening', 'published', 0,
       src.price, src.layout, src.capabilities, src.languages, src.default_language, false, false, 1, now()
from src
where not exists (select 1 from public.templates t where t.slug = 'nusa-grand-opening');

-- ==== daftar-tema-sumpahpemuda.sql ====
-- Daftarkan template Essential "Sumpah Pemuda 2D" (jalankan sekali di Supabase > SQL Editor).
-- Menyalin baris "nusa-kpop-party" (layout, harga, bahasa) lalu mengganti nama, slug, kategori, tema, dan gambar.
-- Aman dijalankan ulang: baris yang sudah ada dilewati.
with src as (select * from public.templates where slug = 'nusa-kpop-party')
insert into public.templates (slug, name, description, thumbnail_url, preview_url, package_type, categories, category_id, theme_key, status, sort, price, layout, capabilities, languages, default_language, featured, recommended, version, published_at)
select 'nusa-sumpah-pemuda', 'Sumpah Pemuda 2D',
       'Hari Sumpah Pemuda 28 Oktober: panggung kayu bertirai merah putih dengan papan Sumpah Pemuda, foto Kongres Pemuda, karpet peta Nusantara, booth buku tamu, photo booth, galeri sejarah, kuliner Nusantara, serta pemuda berseragam perjuangan.',
       '/assets/invite/themes/sumpah-pemuda/thumb.webp', '/undangan?demo=1&theme=sumpah-pemuda',
       'essential', '{other}'::text[], (select id from public.event_categories where slug = 'other'), 'sumpah-pemuda', 'published', 0,
       src.price, src.layout, src.capabilities, src.languages, src.default_language, false, false, 1, now()
from src
where not exists (select 1 from public.templates t where t.slug = 'nusa-sumpah-pemuda');

-- ==== daftar-tema-isramikraj.sql ====
-- Daftarkan template Essential "Isra Mikraj & Maulid 2D" (jalankan sekali di Supabase > SQL Editor).
-- Menyalin baris "nusa-kpop-party" (layout, harga, bahasa) lalu mengganti nama, slug, kategori, tema, dan gambar.
-- Aman dijalankan ulang: baris yang sudah ada dilewati.
with src as (select * from public.templates where slug = 'nusa-kpop-party')
insert into public.templates (slug, name, description, thumbnail_url, preview_url, package_type, categories, category_id, theme_key, status, sort, price, layout, capabilities, languages, default_language, featured, recommended, version, published_at)
select 'nusa-isra-mikraj-maulid', 'Isra Mikraj & Maulid 2D',
       'Peringatan Isra Mikraj & Maulid Nabi Muhammad SAW: panggung ungu-emas dengan pelengkung arabesque, siluet masjid di malam berbintang, lentera dan bunga lili, booth buku tamu, photo booth bulan sabit, galeri, kuliner kurma, serta santri berbusana muslim serasi.',
       '/assets/invite/themes/isra-mikraj-maulid/thumb.webp', '/undangan?demo=1&theme=isra-mikraj-maulid',
       'essential', '{other}'::text[], (select id from public.event_categories where slug = 'other'), 'isra-mikraj-maulid', 'published', 0,
       src.price, src.layout, src.capabilities, src.languages, src.default_language, false, false, 1, now()
from src
where not exists (select 1 from public.templates t where t.slug = 'nusa-isra-mikraj-maulid');

-- ==== daftar-tema-hariguru.sql ====
-- Daftarkan template Essential "Hari Guru 2D" (jalankan sekali di Supabase > SQL Editor).
-- Menyalin baris "nusa-kpop-party" (layout, harga, bahasa) lalu mengganti nama, slug, kategori, tema, dan gambar.
-- Aman dijalankan ulang: baris yang sudah ada dilewati.
with src as (select * from public.templates where slug = 'nusa-kpop-party')
insert into public.templates (slug, name, description, thumbnail_url, preview_url, package_type, categories, category_id, theme_key, status, sort, price, layout, capabilities, languages, default_language, featured, recommended, version, published_at)
select 'nusa-hari-guru', 'Hari Guru 2D',
       'Hari Guru Nasional 25 November: panggung kayu ungu-krem dengan papan Ki Hajar Dewantara dan papan tulis ucapan, booth buku tamu, photo booth toga, galeri foto, kuliner, serta guru berbusana batik dan seragam ungu.',
       '/assets/invite/themes/hari-guru/thumb.webp', '/undangan?demo=1&theme=hari-guru',
       'essential', '{other}'::text[], (select id from public.event_categories where slug = 'other'), 'hari-guru', 'published', 0,
       src.price, src.layout, src.capabilities, src.languages, src.default_language, false, false, 1, now()
from src
where not exists (select 1 from public.templates t where t.slug = 'nusa-hari-guru');

-- ==== daftar-tema-pinkparadise.sql ====
-- Daftarkan template Essential "Pink Paradise 2D" (jalankan sekali di Supabase > SQL Editor).
-- Menyalin baris "nusa-kpop-party" (layout, harga, bahasa) lalu mengganti nama, slug, kategori, tema, dan gambar.
-- Aman dijalankan ulang: baris yang sudah ada dilewati.
with src as (select * from public.templates where slug = 'nusa-kpop-party')
insert into public.templates (slug, name, description, thumbnail_url, preview_url, package_type, categories, category_id, theme_key, status, sort, price, layout, capabilities, languages, default_language, featured, recommended, version, published_at)
select 'nusa-pink-paradise', 'Pink Paradise 2D',
       'Pink Paradise: pesta ulang tahun pantai tropis pink saat matahari terbenam, dengan pelengkung berlampu, pohon kelapa, bunga hibiscus, flamingo, papan selancar, booth tiki, serta tamu chibi berbusana liburan pink.',
       '/assets/invite/themes/pink-paradise/thumb.webp', '/undangan?demo=1&theme=pink-paradise',
       'essential', '{birthday}'::text[], 'd3cbe4ed-0e85-4f63-b982-ed79d9194022'::uuid, 'pink-paradise', 'published', 0,
       src.price, src.layout, src.capabilities, src.languages, src.default_language, false, false, 1, now()
from src
where not exists (select 1 from public.templates t where t.slug = 'nusa-pink-paradise');

-- ==== daftar-tema-robotfactory.sql ====
-- Daftarkan template Essential "Robot Factory 2D" (jalankan sekali di Supabase > SQL Editor).
-- Menyalin baris "nusa-kpop-party" (layout, harga, bahasa) lalu mengganti nama, slug, kategori, tema, dan gambar.
-- Aman dijalankan ulang: baris yang sudah ada dilewati.
with src as (select * from public.templates where slug = 'nusa-kpop-party')
insert into public.templates (slug, name, description, thumbnail_url, preview_url, package_type, categories, category_id, theme_key, status, sort, price, layout, capabilities, languages, default_language, featured, recommended, version, published_at)
select 'nusa-robot-factory', 'Robot Factory 2D',
       'Robot Factory: pesta ulang tahun pabrik robot biru-kuning dengan panggung gerigi, jendela kota futuristik, drone dan lengan robot, booth robot lucu, serta tamu chibi berseragam teknisi.',
       '/assets/invite/themes/robot-factory/thumb.webp', '/undangan?demo=1&theme=robot-factory',
       'essential', '{birthday}'::text[], 'd3cbe4ed-0e85-4f63-b982-ed79d9194022'::uuid, 'robot-factory', 'published', 0,
       src.price, src.layout, src.capabilities, src.languages, src.default_language, false, false, 1, now()
from src
where not exists (select 1 from public.templates t where t.slug = 'nusa-robot-factory');

-- ==== daftar-tema-dinojungle.sql ====
-- Daftarkan template Essential "Dino Jungle 2D" (jalankan sekali di Supabase > SQL Editor).
-- Menyalin baris "nusa-kpop-party" (layout, harga, bahasa) lalu mengganti nama, slug, kategori, tema, dan gambar.
-- Aman dijalankan ulang: baris yang sudah ada dilewati.
with src as (select * from public.templates where slug = 'nusa-kpop-party')
insert into public.templates (slug, name, description, thumbnail_url, preview_url, package_type, categories, category_id, theme_key, status, sort, price, layout, capabilities, languages, default_language, featured, recommended, version, published_at)
select 'nusa-dino-jungle', 'Dino Jungle 2D',
       'Dino Jungle: pesta ulang tahun penjelajah hutan dinosaurus dengan gerbang batu raksasa, air terjun, T-rex dan triceratops, booth safari berobor, serta tamu chibi berpakaian penjelajah.',
       '/assets/invite/themes/dino-jungle/thumb.webp', '/undangan?demo=1&theme=dino-jungle',
       'essential', '{birthday}'::text[], 'd3cbe4ed-0e85-4f63-b982-ed79d9194022'::uuid, 'dino-jungle', 'published', 0,
       src.price, src.layout, src.capabilities, src.languages, src.default_language, false, false, 1, now()
from src
where not exists (select 1 from public.templates t where t.slug = 'nusa-dino-jungle');

-- ==== daftar-tema-esportarena.sql ====
-- Daftarkan template Essential "E-Sport Arena 2D" (jalankan sekali di Supabase > SQL Editor).
-- Menyalin baris "nusa-kpop-party" (layout, harga, bahasa) lalu mengganti nama, slug, kategori, tema, dan gambar.
-- Aman dijalankan ulang: baris yang sudah ada dilewati.
with src as (select * from public.templates where slug = 'nusa-kpop-party')
insert into public.templates (slug, name, description, thumbnail_url, preview_url, package_type, categories, category_id, theme_key, status, sort, price, layout, capabilities, languages, default_language, featured, recommended, version, published_at)
select 'nusa-esport-arena', 'E-Sport Arena 2D',
       'E-Sport Arena: turnamen e-sport di arena neon ungu-biru dengan layar raksasa, panggung berlampu sorot, booth gaming, serta tim pemain chibi berheadset.',
       '/assets/invite/themes/esport-arena/thumb.webp', '/undangan?demo=1&theme=esport-arena',
       'essential', '{other}'::text[], (select id from public.event_categories where slug = 'other'), 'esport-arena', 'published', 0,
       src.price, src.layout, src.capabilities, src.languages, src.default_language, false, false, 1, now()
from src
where not exists (select 1 from public.templates t where t.slug = 'nusa-esport-arena');

-- Urutkan katalog Essential: yang terbaru di depan.
with r as (
  select id, row_number() over (order by created_at desc, sort desc, name) as rn
  from public.templates where package_type = 'essential'
)
update public.templates t set sort = r.rn from r where t.id = r.id;

commit;
