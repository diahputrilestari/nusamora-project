-- Daftar konten publik: tambah read_min (estimasi menit baca, ~200 kata per menit) untuk kartu artikel.
-- Aman dijalankan ulang; hanya menambah satu kunci pada jsonb yang sudah ada. Isi body artikel tetap tidak dikirim di daftar.
create or replace function public.public_content_list(p_type text, p_lang text default 'id', p_limit int default 50) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', t.id, 'title', t.title, 'slug', t.slug, 'excerpt', t.excerpt, 'body', case when t.type in ('faq','tutorial') then t.body end, 'image_url', t.image_url, 'link_url', t.link_url, 'published_at', t.published_at,
    'read_min', greatest(1, ceil(coalesce(array_length(regexp_split_to_array(nullif(btrim(coalesce(t.body, '')), ''), '\s+'), 1), 0) / 200.0)::int)) order by t.sort, t.published_at desc nulls last), '[]'::jsonb)
  from (select * from public.contents x where x.type = p_type and x.lang = coalesce(p_lang, 'id') and x.status = 'published' and (x.publish_at is null or x.publish_at <= now()) and (x.unpublish_at is null or x.unpublish_at > now())
        order by x.sort, x.published_at desc nulls last limit least(greatest(coalesce(p_limit, 50), 1), 200)) t
$$;
grant execute on function public.public_content_list(text,text,int) to anon, authenticated;
