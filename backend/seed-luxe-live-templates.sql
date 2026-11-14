-- Template paket Luxe (Live Guest) untuk setiap tema venue. Aditif & idempoten (on conflict do update).
-- Tampil di /template?paket=luxe. Jalankan SETELAH package-schema.sql dan admin-live-theme-*.sql.
-- Venue (live_venues) harus diaktifkan admin setelah aset diunggah agar pratinjau /live/?t=<key> bisa dibuka.
with t(slug, name, descr, cats, sort) as (values
 ('luxury-black-gold','Luxury Black Gold Live Guest','Venue 3D hitam dan emas dengan lampu kristal, lengkungan bunga putih, dan avatar tamu berbusana elegan.','{wedding,engagement}'::text[],30),
 ('luxury-maroon','Luxury Maroon Live Guest','Venue 3D marun dan emas yang hangat dengan dekor bunga, avatar tamu, serta area resepsi lengkap.','{wedding,engagement}'::text[],31),
 ('beige-elegant','Beige Elegant Live Guest','Venue 3D bernuansa krem dan emas yang lembut, cocok untuk pernikahan elegan dan minimalis.','{wedding,engagement}'::text[],32),
 ('adat-bugis','Adat Bugis Live Guest','Venue 3D adat Bugis dengan pelaminan, ornamen emas, dan avatar busana adat untuk tamu.','{wedding,engagement}'::text[],33),
 ('arabian-knight','Arabian Knight Live Guest','Venue 3D bertema malam Arabia dengan lentera, karpet, dan avatar tamu berpakaian khas.','{wedding,engagement}'::text[],34),
 ('little-circus','Little Circus Live Guest','Venue 3D pesta ulang tahun bertema sirkus yang ceria dengan tenda, balon, dan stan permainan.','{birthday}'::text[],40),
 ('little-samurai','Little Samurai Live Guest','Venue 3D pesta ulang tahun bertema samurai cilik dengan taman jepang dan avatar berseragam.','{birthday}'::text[],41),
 ('viking-feast','Viking Feast Live Guest','Venue 3D pesta ulang tahun bertema viking dengan aula kayu dan avatar prajurit cilik.','{birthday}'::text[],42),
 ('kpop-birthday','K-Pop Birthday Live Guest','Venue 3D konser ulang tahun idol K-Pop dengan panggung, lightstick, dan avatar penggemar.','{birthday,corporate}'::text[],43),
 ('hackathon','Hackathon Live Guest','Venue 3D acara hackathon dengan main stage, area networking, dan avatar peserta.','{corporate}'::text[],50)
)
insert into public.templates (slug, name, description, thumbnail_url, preview_url, package_type, categories, theme_key, status, sort, capabilities)
select 'live-' || t.slug, t.name, t.descr, '/assets/img/live-' || t.slug || '.webp', '/live/?t=' || t.slug, 'luxe', t.cats, t.slug, 'published', t.sort,
       jsonb_build_object('scenes', jsonb_build_array(jsonb_build_object('id', t.slug, 'name', t.name)),
         'areas', '[{"id":"resepsi","name":"Area Resepsi"},{"id":"kuliner","name":"Area Kuliner"},{"id":"photobooth","name":"Photo Booth"},{"id":"galeri","name":"Galeri Foto"}]'::jsonb,
         'avatars', '[{"id":"tamu-wanita","name":"Avatar tamu wanita"},{"id":"tamu-pria","name":"Avatar tamu pria"},{"id":"pengantin","name":"Avatar pengantin"}]'::jsonb,
         'decorations', '[{"id":"dekor-utama","name":"Dekor utama"},{"id":"bunga","name":"Rangkaian bunga"}]'::jsonb)
from t
on conflict (slug) do update set name = excluded.name, description = excluded.description, thumbnail_url = excluded.thumbnail_url,
  preview_url = excluded.preview_url, package_type = excluded.package_type, categories = excluded.categories, theme_key = excluded.theme_key, sort = excluded.sort;
