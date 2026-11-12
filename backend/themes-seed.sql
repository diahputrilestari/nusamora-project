-- NusaMora: daftarkan tema undangan 2D universal (engine /undangan) sebagai template paket Essential.
-- Jalankan SETELAH essential-schema.sql, dan jalankan ulang setiap kali menambah tema baru di assets/invite/themes.
-- Slug template = id folder tema. capabilities.engine = 'universal-2d' membuat editor & preview memakai engine ini.
-- Harga, urutan, dan status bisa diubah dari Admin > Manajemen Template.

with t(slug, name, cats, description, sort) as (values
  ('marun-songket', 'Marun Songket',         '{wedding,engagement}'::text[],                    'Marun dan emas dengan pola anyaman songket, sulur bunga, dan pintu cover yang terbelah.', 30),
  ('sage-garden',   'Sage Garden',           '{wedding,engagement,birthday,aqiqah}'::text[],    'Hijau sage yang tenang dengan daun berguguran, garis tipis, dan cover yang memudar lembut.', 31),
  ('biru-malam',    'Biru Malam',            '{wedding,engagement,graduation,corporate}'::text[], 'Navy dan emas seperti langit malam, dengan titik cahaya yang jatuh pelan.', 32),
  ('blush-rose',    'Blush Rose',            '{wedding,engagement,birthday}'::text[],           'Merah muda lembut dengan pola kawung, hati dan kelopak mawar yang melayang.', 33),
  ('batak-ulos',    'Batak Ulos',            '{wedding,engagement}'::text[],                    'Adat Batak: rumah bolon, ulos, gorga, lentera, dan ilustrasi pengantin berbusana adat.', 34),
  ('korean-royal',  'Korean Royal Wedding',  '{wedding,engagement}'::text[],                    'Istana hanok di bawah bunga sakura: lentera kertas, gerbang bunga, jembatan merah, kantong bokjumeoni, dan sentuhan aksara Hangul.', 35),
  ('javanese-wedding', 'Javanese Wedding',   '{wedding,engagement}'::text[],                    'Pawiwahan adat Jawa: pendopo joglo berukir emas, gunungan, pelaminan, lentera, payung songsong, batik kawung, dan sentuhan aksara Jawa.', 36),
  ('chinese-wedding', 'Chinese Wedding',     '{wedding,engagement}'::text[],                    'Pernikahan Tionghoa: aula merah berukir naga, lampion merah, gerbang bulan 囍, bunga plum dan peony, kipas, serta pelaminan merah-emas.', 37),
  ('istana-pink',   'Istana Pink',           '{birthday}'::text[],                              'Pesta ulang tahun di istana merah muda: gerbang kastil, balon hati, air mancur, kereta permen, kado berpita, dan bendera segitiga.', 40),
  ('dino-adventure', 'Dino Adventure',       '{birthday}'::text[],                              'Pesta ulang tahun petualangan di lembah dinosaurus: gunung berapi, obor, telur dino, fosil, gua, balon jejak kaki, dan para dino lucu.', 41),
  ('metal-rock',    'Metal Rock Party',      '{birthday}'::text[],                              'Pesta ulang tahun bergaya konser metal rock: panggung neon merah, gitar listrik, drum, ampli, tengkorak bersayap, mahkota krom, dan percikan petir.', 42),
  ('kpop-party',    'K-Pop Party',           '{birthday}'::text[],                              'Pesta ulang tahun ala konser K-Pop: panggung neon ungu di bawah sakura, lightstick, bola disko, photo booth, dan karakter chibi idola berbusana ungu.', 43),
  ('kuromi-party',  'Kuromi Party',          '{birthday}'::text[],                              'Pesta ulang tahun ungu-pink bergaya Kuromi: panggung tirai ungu di taman kastil, air mancur, balon hati, photo booth, mesin capit, dan untaian lampu bintang.', 44),
  ('aqiqah-istana-pink', 'Aqiqah Istana Pink', '{aqiqah}'::text[],                              'Tasyakuran aqiqah bernuansa istana merah muda: lentera emas, Al-Qur''an di atas rehal, bulan sabit, gazebo bertirai, teddy dan kelinci, serta ilustrasi bayi berhijab bermahkota.', 50),
  ('viking-party',  'Viking Party',          '{birthday}'::text[],                              'Pesta ulang tahun petualangan Viking: panggung kayu bertanduk dengan kapal naga dan air terjun, kapal layar bergaris, kedai makanan, tenda berbulu, perisai, kapak, dan lentera hangat.', 45),
  ('samurai-sakura', 'Samurai Sakura Party', '{birthday}'::text[],                           'Pesta ulang tahun festival Jepang: panggung kayu di bawah sakura dengan gerbang torii, kabuto emas, katana, lentera kertas, kedai jajanan, daruma, kipas, dan karakter chibi berpakaian samurai serta hakama.', 46),
  ('little-circus', 'Little Circus', '{birthday}'::text[],                                  'Pesta ulang tahun sirkus mungil: panggung tenda belang merah-putih dengan tirai dan lampu bohlam, komidi putar, gerobak popcorn, loket tiket, photo booth, serta karakter chibi badut, pesulap, dan pemain drum.', 47),
  ('little-prince', 'Little Prince', '{birthday}'::text[],                                  'Pesta ulang tahun pangeran kecil: panggung istana putih di bawah langit malam berbintang dengan bulan purnama, mahkota emas, balon udara, teleskop, rak buku, air mancur, dan karakter chibi pangeran serta putri berjubah biru-emas.', 48),
  ('little-chef', 'Little Chef', '{birthday}'::text[],                                  'Pesta ulang tahun koki cilik: panggung dapur ceria dengan gapura topi koki dan tirai merah-putih, kedai roti, oven pizza, papan menu, meja kotak-kotak, serta karakter chibi koki dan pastry chef berseragam merah.', 49),
  ('little-doctor', 'Little Doctor', '{birthday}'::text[],                                  'Pesta ulang tahun dokter cilik: panggung klinik biru muda dengan sofa emas, kue detak jantung, balon palang merah, serta karakter chibi dokter dan perawat berjas putih.', 50),
  ('little-princess', 'Little Princess', '{birthday}'::text[],                                  'Pesta ulang tahun putri kecil bergaya dongeng sepatu kaca: aula istana putih-biru dengan lampu kristal, karpet biru, bunga hydrangea, lentera emas, serta karakter chibi pangeran dan putri bergaun biru muda.', 51),
  ('little-swan', 'Little Swan Princess', '{birthday}'::text[],                                  'Pesta ulang tahun putri angsa: aula istana merah muda-lavender dengan angsa bermahkota, danau berkilau, lampu kristal, bunga mawar, serta karakter chibi pangeran dan putri bergaun sayap angsa.', 52),
  ('little-barbie', 'Little Princess Pink Luxe', '{birthday}'::text[],                                  'Pesta ulang tahun putri pink mewah: panggung istana merah muda dengan menara puri, lampu kristal, vas emas berisi mawar, karpet glamor, serta karakter chibi pangeran dan putri bergaun pink berkilau.', 53)
)
insert into public.templates (slug, name, description, thumbnail_url, preview_url, package_type, categories, theme_key, status, sort, capabilities)
select t.slug, t.name, t.description, '/assets/invite/themes/' || t.slug || '/thumb.webp', '/preview?demo=' || t.slug,
       'essential', t.cats, t.slug, 'published', t.sort, '{"engine":"universal-2d"}'::jsonb
from t
on conflict (slug) do update set
  thumbnail_url = excluded.thumbnail_url, preview_url = excluded.preview_url, package_type = excluded.package_type,
  theme_key = excluded.theme_key, capabilities = public.templates.capabilities || excluded.capabilities;

-- Versi awal engine terdaftar sebagai "nusa-essential"; kini setara tema marun-songket (alias di themes/index.json).
update public.templates set status = 'archived' where slug = 'nusa-essential' and status = 'published';
