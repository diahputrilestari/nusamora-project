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

-- Taruh yang terbaru di depan katalog Essential (kolom "sort": kecil = tampil lebih dulu).
with r as (
  select id, row_number() over (order by created_at desc, sort desc, name) as rn
  from public.templates where package_type = 'essential'
)
update public.templates t set sort = r.rn from r where t.id = r.id;
