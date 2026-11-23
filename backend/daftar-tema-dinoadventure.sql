-- Daftarkan template Essential "Dino Adventure 2D" (jalankan sekali di Supabase > SQL Editor).
-- Menyalin baris "nusa-kpop-party" (layout, harga, bahasa) lalu mengganti nama, slug, kategori, tema, dan gambar.
-- Aman dijalankan ulang: baris yang sudah ada dilewati.
with src as (select * from public.templates where slug = 'nusa-kpop-party')
insert into public.templates (slug, name, description, thumbnail_url, preview_url, package_type, categories, category_id, theme_key, status, sort, price, layout, capabilities, languages, default_language, featured, recommended, version, published_at)
select 'nusa-dino-adventure', 'Dino Adventure 2D',
       'Dino Adventure: pesta ulang tahun petualangan dinosaurus di hutan prasejarah dengan gerbang batu, air terjun, T-rex dan triceratops, booth safari, serta tamu chibi berpakaian penjelajah.',
       '/assets/invite/themes/dino-adventure/thumb.webp', '/undangan?demo=1&theme=dino-adventure',
       'essential', '{birthday}'::text[], 'd3cbe4ed-0e85-4f63-b982-ed79d9194022'::uuid, 'dino-adventure', 'published', 0,
       src.price, src.layout, src.capabilities, src.languages, src.default_language, false, false, 1, now()
from src
where not exists (select 1 from public.templates t where t.slug = 'nusa-dino-adventure');

-- Taruh yang terbaru di depan katalog Essential (kolom "sort": kecil = tampil lebih dulu).
with r as (
  select id, row_number() over (order by created_at desc, sort desc, name) as rn
  from public.templates where package_type = 'essential'
)
update public.templates t set sort = r.rn from r where t.id = r.id;
