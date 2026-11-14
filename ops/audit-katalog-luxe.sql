-- Audit katalog Luxe (Live Guest). Hanya SELECT, aman dijalankan kapan saja di Supabase SQL Editor.
-- Satu baris per template; kolom "masalah" kosong = sehat.
-- Template bawaan (preview_url bukan /live/?venue=..., mis. romantic-garden dan jawa-tengah) memakai scene bawaan,
-- jadi dekor/avatar/panorama venue tidak dicek.
with a as (
  select t.slug, t.name, t.status, t.categories, t.sort, t.thumbnail_url, t.preview_url,
         v.key as venue, v.event_type, v.active as venue_aktif, v.background_url, v.decor, v.areas,
         (t.preview_url like '/live/?venue=%') as pakai_venue
  from public.templates t
  left join public.live_venues v on v.key = t.theme_key
  where t.package_type = 'luxe'
)
select slug, name, status, categories, sort, venue, event_type, venue_aktif,
  (select count(*) from jsonb_object_keys(coalesce(decor, '{}'::jsonb)) k where k not like 'av\_%') as slot_dekor,
  (select count(*) from jsonb_object_keys(coalesce(decor, '{}'::jsonb)) k where k like 'av\_%') as slot_avatar,
  (select count(*) from jsonb_array_elements(coalesce(areas, '[]'::jsonb)) x where (x ->> 'enabled')::boolean) as area_aktif,
  concat_ws('; ',
    case when status <> 'published' then 'template belum published' end,
    case when coalesce(thumbnail_url, '') = '' then 'thumbnail kosong' end,
    case when cardinality(categories) = 0 then 'kategori kosong' end,
    case when coalesce(preview_url, '') = '' then 'preview_url kosong' end,
    case when pakai_venue and venue is null then 'venue tidak ditemukan' end,
    case when pakai_venue and venue is not null and not venue_aktif then 'venue nonaktif' end,
    case when pakai_venue and venue is not null and coalesce(background_url, '') = '' then 'panorama kosong' end,
    case when pakai_venue and venue is not null and (select count(*) from jsonb_object_keys(coalesce(decor, '{}'::jsonb)) k where k not like 'av\_%') < 5 then 'slot dekor kurang dari 5' end,
    case when pakai_venue and venue is not null and (select count(*) from jsonb_object_keys(coalesce(decor, '{}'::jsonb)) k where k like 'av\_%' and k <> 'av_host') < 7 then 'avatar tamu kurang dari 7' end,
    case when pakai_venue and venue is not null and event_type in ('wedding', 'engagement') and not (decor ? 'av_host') then 'avatar pengantin kosong' end,
    case when pakai_venue and venue is not null and (select count(*) from jsonb_array_elements(coalesce(areas, '[]'::jsonb)) x where (x ->> 'enabled')::boolean) < 6 then 'area aktif kurang dari 6' end,
    case when pakai_venue and venue is not null and event_type <> 'wedding' and not (categories && array[event_type]) then 'kategori tidak sesuai jenis venue' end,
    case when pakai_venue and venue is not null and event_type = 'wedding' and not (categories && array['wedding', 'engagement']) then 'kategori tidak sesuai jenis venue' end
  ) as masalah
from a
order by sort, slug;
