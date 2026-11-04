-- NusaMora: daftarkan tema undangan 2D (engine universal /undangan) sebagai template yang bisa dipilih pelanggan.
-- Jalankan SETELAH essential-schema.sql, dan jalankan ulang setiap kali menambah tema baru di assets/invite/themes.
-- Slug template = id folder tema. Harga tambahan, paket minimum, dan status bisa diubah dari Admin > Manajemen Template.

with t(slug, name, cat, description, sort) as (values
  ('marun-songket', 'Marun Songket', 'wedding',  'Marun dan emas dengan pola anyaman songket, sulur bunga, dan pintu cover yang terbelah.', 10),
  ('sage-garden',   'Sage Garden',   'wedding',  'Hijau sage yang tenang dengan daun berguguran, garis tipis, dan cover yang memudar lembut.', 11),
  ('biru-malam',    'Biru Malam',    'wedding',  'Navy dan emas seperti langit malam, dengan titik cahaya yang jatuh pelan.', 12),
  ('blush-rose',    'Blush Rose',    'wedding',  'Merah muda lembut dengan pola kawung, hati dan kelopak mawar yang melayang.', 13),
  ('batak-ulos',    'Batak Ulos',    'wedding',  'Adat Batak: rumah bolon, ulos, gorga, lentera, dan ilustrasi pengantin berbusana adat.', 14)
)
insert into public.templates (slug, name, category_id, description, thumbnail_url, preview_url, min_plan, status, sort)
select t.slug, t.name, (select id from public.event_categories where slug = t.cat), t.description,
       '/assets/invite/themes/' || t.slug || '/thumb.webp', '/undangan?demo=1&theme=' || t.slug, 'essential', 'published', t.sort
from t
on conflict (slug) do update set thumbnail_url = excluded.thumbnail_url, preview_url = excluded.preview_url;

-- Template lama "nusa-essential" kini setara tema marun-songket. Disembunyikan dari galeri;
-- undangan yang sudah memakainya tetap tampil normal (alias di themes/index.json).
update public.templates set status = 'archived' where slug = 'nusa-essential' and status = 'published';
