-- NusaMora: metadata template untuk filter & label di "Pilih Template". Idempoten. Jalankan SETELAH package-schema.sql (butuh templates, invitations).
-- 1) Budaya disimpan di templates.capabilities->>'culture' (tanpa kolom baru). Template awal diberi label bila belum punya.
update public.templates set capabilities = capabilities || jsonb_build_object('culture', 'Jawa')
  where slug in ('jawa-tengah-2d', 'jawa-tengah-3d', 'jawa-tengah') and not (capabilities ? 'culture');
update public.templates set capabilities = capabilities || jsonb_build_object('culture', 'Umum')
  where slug in ('romantic-garden-2d', 'romantic-garden-3d', 'romantic-garden') and not (capabilities ? 'culture');

-- 2) Popularitas = jumlah undangan AKTIF (belum kedaluwarsa) per template terbit. Hanya agregat; tidak membuka data undangan/pengguna.
create or replace function public.template_popularity() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_object_agg(t.slug, c.n), '{}'::jsonb)
  from public.templates t
  join (select template_id, count(*) n from public.invitations
        where status = 'aktif' and (expires_at is null or expires_at > now()) and template_id is not null group by template_id) c on c.template_id = t.slug
  where t.status = 'published'
$$;
revoke all on function public.template_popularity() from public, anon;
grant execute on function public.template_popularity() to authenticated;
