-- NusaMora: alur Buat Undangan (kategori, custom link/slug, draft, editor). Jalankan SETELAH dashboard-schema.sql dan admin-schema.sql.
-- Pelanggan TIDAK menulis tabel langsung: semua lewat fungsi di bawah yang memvalidasi pemilik, status, dan isi.

----------------------------------------------------------------------------- 1. Kolom baru
alter table public.invitations add column if not exists slug text;
alter table public.invitations add column if not exists category text;
alter table public.invitations add column if not exists content jsonb not null default '{}'::jsonb;
alter table public.invitations add column if not exists updated_at timestamptz not null default now();

alter table public.invitations drop constraint if exists invitations_slug_format;
alter table public.invitations add constraint invitations_slug_format check (slug is null or (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) between 3 and 40));
alter table public.invitations drop constraint if exists invitations_category_check;
alter table public.invitations add constraint invitations_category_check check (category is null or category in ('wedding','engagement','birthday','graduation','aqiqah','seminar','corporate','other'));
create unique index if not exists invitations_slug_uq on public.invitations (lower(slug)) where slug is not null;

insert into public.event_categories (name, slug, sort) values
 ('Wedding','wedding',1),('Engagement','engagement',2),('Birthday','birthday',3),('Graduation','graduation',4),
 ('Aqiqah','aqiqah',5),('Seminar & Workshop','seminar',6),('Corporate Event','corporate',7),('Lainnya','other',8)
on conflict (slug) do nothing;

----------------------------------------------------------------------------- 2. Ketersediaan slug (dipanggil real-time dari form)
create or replace function public.slug_available(p_slug text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare s text := lower(trim(coalesce(p_slug, '')));
begin
  if auth.uid() is null then raise exception 'unauthorized' using errcode = '28000'; end if;
  if char_length(s) < 3 or char_length(s) > 40 then return jsonb_build_object('ok', false, 'reason', 'panjang'); end if;
  if s !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then return jsonb_build_object('ok', false, 'reason', 'format'); end if;
  if s = any (array['admin','akun','masuk','daftar','lupa-password','atur-password','live','assets','api','template','templates','buat','editor','dashboard','login','register','logout','harga','fitur','bantuan','help','support','nusamora','www','app','static','undangan','invoice','tutorial','affiliate','robots','sitemap','favicon','kebijakan-privasi','syarat-layanan']) then
    return jsonb_build_object('ok', false, 'reason', 'dicadangkan');
  end if;
  if exists (select 1 from public.invitations where lower(slug) = s) then return jsonb_build_object('ok', false, 'reason', 'digunakan'); end if;
  return jsonb_build_object('ok', true);
end $$;

----------------------------------------------------------------------------- 3. Buat draft undangan
create or replace function public.create_invitation(p_template text, p_category text, p_slug text) returns uuid
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); s text := lower(trim(coalesce(p_slug, ''))); ck jsonb; new_id uuid; ev text; ttl text;
begin
  if uid is null then raise exception 'unauthorized' using errcode = '28000'; end if;
  if exists (select 1 from public.profiles where id = uid and status = 'suspended') then raise exception 'akun_ditangguhkan'; end if;
  if p_category is null or p_category not in ('wedding','engagement','birthday','graduation','aqiqah','seminar','corporate','other') then raise exception 'kategori_tidak_valid'; end if;
  if p_template is null or (p_template not in ('romantic-garden','jawa-tengah') and not exists (select 1 from public.templates where slug = p_template and status = 'published')) then raise exception 'template_tidak_valid'; end if;
  ck := public.slug_available(s);
  if not (ck->>'ok')::boolean then raise exception '%', case ck->>'reason' when 'digunakan' then 'slug_digunakan' when 'dicadangkan' then 'slug_dicadangkan' else 'slug_tidak_valid' end; end if;
  if (select count(*) from public.invitations where user_id = uid and status = 'draft') >= 20 then raise exception 'batas_draft'; end if;
  ev := case p_category when 'wedding' then 'pernikahan' when 'engagement' then 'pertunangan' when 'birthday' then 'ulangtahun' when 'graduation' then 'wisuda' when 'aqiqah' then 'aqiqah' when 'seminar' then 'seminar' when 'corporate' then 'corporate' else 'lainnya' end;
  ttl := 'Undangan ' || case p_category when 'wedding' then 'Wedding' when 'engagement' then 'Engagement' when 'birthday' then 'Birthday' when 'graduation' then 'Graduation' when 'aqiqah' then 'Aqiqah' when 'seminar' then 'Seminar' when 'corporate' then 'Corporate' else 'Acara' end;
  begin
    insert into public.invitations (user_id, title, event_type, category, template_id, slug, status, content)
    values (uid, ttl, ev, p_category, p_template, s, 'draft', '{}'::jsonb) returning id into new_id;
  exception when unique_violation then raise exception 'slug_digunakan';
  end;
  return new_id;
end $$;

----------------------------------------------------------------------------- 4. Simpan draft (autosave dari editor)
create or replace function public.save_invitation(p_id uuid, p_title text, p_event_date date, p_content jsonb) returns timestamptz
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); r public.invitations; u text; pref text; g jsonb;
begin
  if uid is null then raise exception 'unauthorized' using errcode = '28000'; end if;
  select * into r from public.invitations where id = p_id and user_id = uid for update;
  if not found then raise exception 'tidak_ditemukan'; end if;
  if r.status not in ('draft','aktif') or r.moderation = 'takedown' then raise exception 'tidak_dapat_diubah'; end if;
  if jsonb_typeof(p_content) <> 'object' or length(p_content::text) > 60000 then raise exception 'konten_tidak_valid'; end if;
  pref := '%/storage/v1/object/public/invitation-media/' || uid::text || '/%';
  u := coalesce(p_content #>> '{photos,cover}', '');
  if u <> '' and u not like pref then raise exception 'foto_tidak_valid'; end if;
  g := p_content #> '{photos,gallery}';
  if g is not null and g <> 'null'::jsonb then
    if jsonb_typeof(g) <> 'array' or jsonb_array_length(g) > 40 then raise exception 'foto_tidak_valid'; end if;
    for u in select jsonb_array_elements_text(g) loop
      if u not like pref then raise exception 'foto_tidak_valid'; end if;
    end loop;
  end if;
  update public.invitations
     set title = left(coalesce(nullif(trim(p_title), ''), title), 160), event_date = p_event_date, content = p_content, updated_at = now()
   where id = p_id;
  return now();
end $$;

revoke execute on function public.slug_available(text), public.create_invitation(text,text,text), public.save_invitation(uuid,text,date,jsonb) from public, anon;
grant execute on function public.slug_available(text), public.create_invitation(text,text,text), public.save_invitation(uuid,text,date,jsonb) to authenticated;

----------------------------------------------------------------------------- 5. Storage foto undangan (folder per pengguna)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('invitation-media', 'invitation-media', true, 3145728, array['image/png','image/jpeg','image/webp'])
on conflict (id) do update set file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
drop policy if exists "invitation-media baca" on storage.objects;
-- Hanya pemilik folder (mencegah list()/enumerasi semua pengguna; URL objek publik tetap dilayani). Lihat content-protection.sql.
create policy "invitation-media baca" on storage.objects for select to authenticated using (bucket_id = 'invitation-media' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "invitation-media unggah sendiri" on storage.objects;
create policy "invitation-media unggah sendiri" on storage.objects for insert to authenticated with check (bucket_id = 'invitation-media' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "invitation-media hapus sendiri" on storage.objects;
create policy "invitation-media hapus sendiri" on storage.objects for delete to authenticated using (bucket_id = 'invitation-media' and (storage.foldername(name))[1] = auth.uid()::text);
