-- Perlindungan konten & aset (sisi server). Idempoten. Jalankan SETELAH asset-schema.sql, invitation-schema.sql, admin-schema.sql.
-- Prinsip: bucket publik tetap melayani URL objek yang dibagikan, tetapi TIDAK bisa didaftar (di-enumerasi) oleh siapa pun;
-- aset berbayar ("premium/...") hidup di bucket privat dan hanya dilayani lewat signed URL berumur pendek.

----------------------------------------------------------------------------- 1. Cegah enumerasi bucket publik
-- URL objek pada bucket publik dilayani Storage tanpa kebijakan SELECT. Kebijakan SELECT untuk semua orang justru mengizinkan
-- list() oleh anon (mendata semua folder pengguna dan nama file). Diganti dengan akses terbatas.
drop policy if exists "site-assets baca" on storage.objects;
create policy "site-assets baca" on storage.objects for select to authenticated
  using (bucket_id = 'site-assets' and (public.has_perm('templates.read') or public.has_perm('templates.write') or public.has_perm('content.write')));
drop policy if exists "theme-assets baca" on storage.objects;
create policy "theme-assets baca" on storage.objects for select to authenticated
  using (bucket_id = 'theme-assets' and (public.has_perm('templates.read') or public.has_perm('templates.write')));
drop policy if exists "invitation-media baca" on storage.objects;
create policy "invitation-media baca" on storage.objects for select to authenticated
  using (bucket_id = 'invitation-media' and (storage.foldername(name))[1] = auth.uid()::text);

----------------------------------------------------------------------------- 2. Bucket privat untuk aset berbayar
insert into storage.buckets (id, name, public, file_size_limit)
values ('premium-assets', 'premium-assets', false, 52428800)
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit;
drop policy if exists "premium-assets baca admin" on storage.objects;
create policy "premium-assets baca admin" on storage.objects for select to authenticated
  using (bucket_id = 'premium-assets' and (public.has_perm('templates.read') or public.has_perm('templates.write')));
drop policy if exists "premium-assets tulis admin" on storage.objects;
create policy "premium-assets tulis admin" on storage.objects for insert to authenticated
  with check (bucket_id = 'premium-assets' and public.has_perm('templates.write') and name ~ '^premium/');
drop policy if exists "premium-assets hapus admin" on storage.objects;
create policy "premium-assets hapus admin" on storage.objects for delete to authenticated
  using (bucket_id = 'premium-assets' and public.has_perm('templates.write') and name ~ '^premium/');

----------------------------------------------------------------------------- 3. Otorisasi akses aset berbayar (dipanggil Edge Function asset-url dengan service_role)
-- Mengembalikan path objek hanya bila: aset berstatus aktif & berawalan premium/, undangan (slug) berstatus aktif dan belum kedaluwarsa,
-- paket undangan termasuk dalam package_types aset, dan aset dipetakan pada template (dan tema) yang dipakai undangan itu.
create or replace function public.premium_asset_path(p_slug text, p_asset uuid) returns text
language plpgsql stable security definer set search_path = public as $$
declare pth text;
begin
  if p_slug is null or p_asset is null then return null; end if;
  select a.file_path into pth
    from public.invitations i
    join public.templates t on t.slug = i.template_id
    join public.template_assets ta on ta.template_id = t.id and ta.asset_id = p_asset
    join public.assets a on a.id = ta.asset_id
   where i.slug = p_slug and i.status = 'aktif' and (i.expires_at is null or i.expires_at > now())
     and a.deleted_at is null and a.status = 'active' and a.file_path like 'premium/%'
     and coalesce(i.package_type, t.package_type) = any (a.package_types)
     and (ta.theme_id is null or ta.theme_id in (select th.id from public.themes th where th.slug = i.theme_key))
   limit 1;
  return pth;
end $$;
revoke all on function public.premium_asset_path(text, uuid) from public, anon, authenticated;
grant execute on function public.premium_asset_path(text, uuid) to service_role;
