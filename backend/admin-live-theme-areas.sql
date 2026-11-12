-- NusaMora: tema ulang tahun "midnight-party": matikan area Resepsi dan Video (menu dan area tidak tampil untuk tamu). Aditif, idempoten.
-- Hanya menyentuh venue key 'midnight-party'. Admin tetap bisa menyalakannya lagi di Venue Builder.
update public.live_venues v set areas = (
  select jsonb_agg(case when t.a ->> 'id' in ('resepsi', 'video') then t.a || '{"enabled": false}'::jsonb else t.a end order by t.ord)
    from jsonb_array_elements(v.areas) with ordinality as t(a, ord))
 where v.key = 'midnight-party' and jsonb_typeof(v.areas) = 'array'
   and exists (select 1 from jsonb_array_elements(v.areas) e where e ->> 'id' in ('resepsi', 'video') and coalesce((e ->> 'enabled')::boolean, true));
