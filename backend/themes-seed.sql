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
  ('korean-royal',  'Korean Royal Wedding',  '{wedding,engagement}'::text[],                    'Istana hanok di bawah bunga sakura: lentera kertas, gerbang bunga, jembatan merah, kantong bokjumeoni, dan sentuhan aksara Hangul.', 35)
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
