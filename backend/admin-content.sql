-- NusaMora Admin: Manajemen Konten (menu J). Jalankan SETELAH admin-schema.sql. ADITIF dan aman diulang.
-- Konten tayang ke publik hanya bila status 'published' DAN dalam jadwal (publish_at/unpublish_at) - tanpa cron, dihitung saat dibaca.
-- Perubahan konten hanya lewat fungsi admin_content_* (tervalidasi, tercatat di riwayat revisi dan audit log).

----------------------------------------------------------------------------- 1. Kolom baru
alter table public.contents add column if not exists lang text not null default 'id';
alter table public.contents add column if not exists translation_of uuid references public.contents(id) on delete set null;
alter table public.contents add column if not exists excerpt text;
alter table public.contents add column if not exists canonical_url text;
alter table public.contents add column if not exists og_image_url text;
alter table public.contents add column if not exists noindex boolean not null default false;
alter table public.contents add column if not exists publish_at timestamptz;
alter table public.contents add column if not exists unpublish_at timestamptz;
alter table public.contents add column if not exists published_at timestamptz;
alter table public.contents add column if not exists updated_by uuid;
alter table public.contents drop constraint if exists contents_lang_check;
alter table public.contents add constraint contents_lang_check check (lang in ('id','en'));
alter table public.contents drop constraint if exists contents_schedule_check;
alter table public.contents add constraint contents_schedule_check check (unpublish_at is null or publish_at is null or unpublish_at > publish_at);
-- slug unik per jenis dan bahasa (konten arsip boleh memakai ulang slug)
create unique index if not exists contents_slug_uniq on public.contents (type, lang, slug) where slug is not null and status <> 'archived';
create index if not exists contents_public_idx on public.contents (type, lang, status, publish_at);
update public.contents set published_at = coalesce(published_at, updated_at) where status = 'published' and published_at is null;

----------------------------------------------------------------------------- 2. Revisi dan media
create table if not exists public.content_revisions (
  id bigint generated always as identity primary key,
  content_id uuid not null references public.contents(id) on delete cascade,
  version int not null, snapshot jsonb not null, changed text[] not null default '{}',
  note text, actor_id uuid, actor_name text, at timestamptz not null default now(),
  unique (content_id, version));
create table if not exists public.content_media (
  path text primary key check (path like 'media/%'),
  alt text check (alt is null or char_length(alt) <= 200),
  mime text, size_bytes bigint, width int, height int,
  uploaded_by uuid, created_at timestamptz not null default now());
alter table public.content_revisions enable row level security;
alter table public.content_media enable row level security;
drop policy if exists "admin baca" on public.content_revisions; create policy "admin baca" on public.content_revisions for select using (public.has_perm('content.read'));
drop policy if exists "admin baca" on public.content_media;     create policy "admin baca" on public.content_media for select using (public.has_perm('content.read'));
revoke all on public.content_revisions, public.content_media from anon, authenticated;
grant select on public.content_revisions, public.content_media to authenticated;

-- penulisan langsung ke contents ditutup; semua lewat fungsi
revoke insert, update, delete on public.contents from authenticated;
grant select on public.contents to anon, authenticated;
drop policy if exists "publik baca" on public.contents;
create policy "publik baca" on public.contents for select to anon, authenticated using (status = 'published' and (publish_at is null or publish_at <= now()) and (unpublish_at is null or unpublish_at > now()));

----------------------------------------------------------------------------- 3. Pencatat revisi
create or replace function public.contents_revision() returns trigger language plpgsql security definer set search_path = public as $$
declare k text; o jsonb := case when tg_op = 'UPDATE' then to_jsonb(old) else '{}'::jsonb end; n jsonb := to_jsonb(new); ch text[] := '{}'; v int; nm text; snap jsonb;
begin
  foreach k in array array['title','slug','lang','translation_of','excerpt','body','image_url','link_url','seo_title','seo_description','canonical_url','og_image_url','noindex','status','publish_at','unpublish_at','sort'] loop
    if tg_op = 'INSERT' or o -> k is distinct from n -> k then ch := ch || k; end if;
  end loop;
  if array_length(ch, 1) is null then return null; end if;
  select coalesce(max(version), 0) + 1 into v from public.content_revisions where content_id = new.id;
  select coalesce(nullif(pr.full_name, ''), au.email) into nm from auth.users au left join public.profiles pr on pr.id = au.id where au.id = auth.uid();
  snap := jsonb_build_object('title', new.title, 'slug', new.slug, 'lang', new.lang, 'translation_of', new.translation_of, 'excerpt', new.excerpt, 'body', new.body, 'image_url', new.image_url, 'link_url', new.link_url,
    'seo_title', new.seo_title, 'seo_description', new.seo_description, 'canonical_url', new.canonical_url, 'og_image_url', new.og_image_url, 'noindex', new.noindex, 'status', new.status, 'publish_at', new.publish_at, 'unpublish_at', new.unpublish_at, 'sort', new.sort);
  insert into public.content_revisions (content_id, version, snapshot, changed, note, actor_id, actor_name)
  values (new.id, v, snap, ch, nullif(current_setting('nm.content_note', true), ''), auth.uid(), coalesce(nm, 'sistem'));
  delete from public.content_revisions where content_id = new.id and version <= v - 50; -- simpan 50 revisi terakhir
  return null;
end $$;
drop trigger if exists contents_revision_trg on public.contents;
create trigger contents_revision_trg after insert or update on public.contents for each row execute function public.contents_revision();

----------------------------------------------------------------------------- 4. Validasi dan simpan
create or replace function public.content_issue(p_id uuid, p_type text, p_d jsonb) returns text language plpgsql stable set search_path = public as $$
declare v_slug text := nullif(btrim(p_d ->> 'slug'), ''); v_st text := coalesce(p_d ->> 'status', 'draft'); v_lang text := coalesce(p_d ->> 'lang', 'id'); u text; src public.contents;
begin
  if p_type not in ('banner','faq','tutorial','article','page') then return 'jenis_tidak_valid'; end if;
  if char_length(btrim(coalesce(p_d ->> 'title', ''))) not between 2 and 200 then return 'judul_tidak_valid'; end if;
  if v_lang not in ('id','en') then return 'bahasa_tidak_valid'; end if;
  if v_st not in ('draft','published','archived') then return 'status_tidak_valid'; end if;
  if p_type in ('article','page') then
    if v_slug is null then return 'slug_wajib'; end if;
    if v_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' or char_length(v_slug) > 80 then return 'slug_tidak_valid'; end if;
    if v_slug in ('admin','api','assets','live','akun','masuk','daftar','baru','new') then return 'slug_dicadangkan'; end if;
  elsif v_slug is not null and (v_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' or char_length(v_slug) > 80) then return 'slug_tidak_valid'; end if;
  if v_slug is not null and v_st <> 'archived' and exists (select 1 from public.contents c where c.type = p_type and c.lang = v_lang and c.slug = v_slug and c.status <> 'archived' and (p_id is null or c.id <> p_id)) then return 'slug_dipakai'; end if;
  if char_length(coalesce(p_d ->> 'body', '')) > 100000 then return 'isi_terlalu_panjang'; end if;
  if char_length(coalesce(p_d ->> 'excerpt', '')) > 300 then return 'ringkasan_terlalu_panjang'; end if;
  if char_length(coalesce(p_d ->> 'seo_title', '')) > 70 then return 'seo_title_terlalu_panjang'; end if;
  if char_length(coalesce(p_d ->> 'seo_description', '')) > 170 then return 'seo_deskripsi_terlalu_panjang'; end if;
  foreach u in array array[coalesce(p_d ->> 'canonical_url', ''), coalesce(p_d ->> 'og_image_url', '')] loop
    if u <> '' and (u !~ '^https://[^\s]+$' or char_length(u) > 500) then return 'url_tidak_valid'; end if;
  end loop;
  u := coalesce(p_d ->> 'image_url', '');
  if u <> '' and (u !~ '^https://[^\s]+$' or char_length(u) > 500) then return 'url_tidak_valid'; end if;
  u := coalesce(p_d ->> 'link_url', '');
  if u <> '' and (u !~ '^(https://[^\s]+|/[A-Za-z0-9/_\-.?=&#%]*)$' or char_length(u) > 500) then return 'url_tidak_valid'; end if;
  if nullif(p_d ->> 'publish_at', '') is not null and nullif(p_d ->> 'unpublish_at', '') is not null and (p_d ->> 'unpublish_at')::timestamptz <= (p_d ->> 'publish_at')::timestamptz then return 'jadwal_tidak_valid'; end if;
  if nullif(p_d ->> 'translation_of', '') is not null then
    select * into src from public.contents where id = (p_d ->> 'translation_of')::uuid;
    if not found or src.type <> p_type or src.lang = v_lang or (p_id is not null and src.id = p_id) or src.translation_of is not null then return 'terjemahan_tidak_valid'; end if;
    if exists (select 1 from public.contents c where c.translation_of = src.id and c.lang = v_lang and c.status <> 'archived' and (p_id is null or c.id <> p_id)) then return 'terjemahan_sudah_ada'; end if;
  end if;
  if v_st = 'published' then
    if p_type = 'banner' and coalesce(p_d ->> 'image_url', '') = '' then return 'konten_belum_lengkap'; end if;
    if p_type <> 'banner' and char_length(btrim(coalesce(p_d ->> 'body', ''))) < 1 then return 'konten_belum_lengkap'; end if;
  end if;
  return null;
exception when invalid_text_representation or datetime_field_overflow or invalid_datetime_format then return 'data_tidak_valid';
end $$;

create or replace function public.admin_content_save(p_id uuid, p_type text, p_data jsonb, p_note text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare cur public.contents; d jsonb; iss text; nid uuid; st text; pub timestamptz;
begin
  if not public.has_perm('content.write') then raise exception 'forbidden' using errcode = '42501'; end if;
  if jsonb_typeof(p_data) <> 'object' then return jsonb_build_object('ok', false, 'error', 'data_tidak_valid'); end if;
  if p_id is not null then
    select * into cur from public.contents where id = p_id for update;
    if not found then return jsonb_build_object('ok', false, 'error', 'tidak_ditemukan'); end if;
    if p_type is not null and p_type <> cur.type then return jsonb_build_object('ok', false, 'error', 'jenis_tidak_dapat_diubah'); end if;
    p_type := cur.type;
    d := jsonb_build_object('title', cur.title, 'slug', cur.slug, 'lang', cur.lang, 'translation_of', cur.translation_of, 'excerpt', cur.excerpt, 'body', cur.body, 'image_url', cur.image_url, 'link_url', cur.link_url,
      'seo_title', cur.seo_title, 'seo_description', cur.seo_description, 'canonical_url', cur.canonical_url, 'og_image_url', cur.og_image_url, 'noindex', cur.noindex, 'status', cur.status, 'publish_at', cur.publish_at, 'unpublish_at', cur.unpublish_at, 'sort', cur.sort) || p_data;
  else d := p_data; end if;
  iss := public.content_issue(p_id, p_type, d);
  if iss is not null then return jsonb_build_object('ok', false, 'error', iss); end if;
  st := coalesce(d ->> 'status', 'draft');
  pub := case when st = 'published' then coalesce(cur.published_at, now()) else cur.published_at end;
  perform set_config('nm.content_note', btrim(coalesce(p_note, '')), true);
  if p_id is null then
    insert into public.contents (type, title, slug, lang, translation_of, excerpt, body, image_url, link_url, seo_title, seo_description, canonical_url, og_image_url, noindex, status, publish_at, unpublish_at, published_at, sort, updated_by)
    values (p_type, btrim(d ->> 'title'), nullif(btrim(d ->> 'slug'), ''), coalesce(d ->> 'lang', 'id'), nullif(d ->> 'translation_of', '')::uuid, nullif(btrim(d ->> 'excerpt'), ''), nullif(d ->> 'body', ''), nullif(d ->> 'image_url', ''), nullif(d ->> 'link_url', ''),
      nullif(btrim(d ->> 'seo_title'), ''), nullif(btrim(d ->> 'seo_description'), ''), nullif(d ->> 'canonical_url', ''), nullif(d ->> 'og_image_url', ''), coalesce((d ->> 'noindex')::boolean, false), st,
      nullif(d ->> 'publish_at', '')::timestamptz, nullif(d ->> 'unpublish_at', '')::timestamptz, case when st = 'published' then now() end, coalesce((d ->> 'sort')::int, 0), auth.uid()) returning id into nid;
  else
    update public.contents set title = btrim(d ->> 'title'), slug = nullif(btrim(d ->> 'slug'), ''), lang = coalesce(d ->> 'lang', 'id'), translation_of = nullif(d ->> 'translation_of', '')::uuid, excerpt = nullif(btrim(d ->> 'excerpt'), ''),
      body = nullif(d ->> 'body', ''), image_url = nullif(d ->> 'image_url', ''), link_url = nullif(d ->> 'link_url', ''), seo_title = nullif(btrim(d ->> 'seo_title'), ''), seo_description = nullif(btrim(d ->> 'seo_description'), ''),
      canonical_url = nullif(d ->> 'canonical_url', ''), og_image_url = nullif(d ->> 'og_image_url', ''), noindex = coalesce((d ->> 'noindex')::boolean, false), status = st,
      publish_at = nullif(d ->> 'publish_at', '')::timestamptz, unpublish_at = nullif(d ->> 'unpublish_at', '')::timestamptz, published_at = pub, sort = coalesce((d ->> 'sort')::int, 0), updated_at = now(), updated_by = auth.uid()
    where id = p_id;
    nid := p_id;
  end if;
  return jsonb_build_object('ok', true, 'id', nid);
end $$;

create or replace function public.admin_content_restore(p_id uuid, p_version int) returns jsonb
language plpgsql security definer set search_path = public as $$
declare r public.content_revisions; res jsonb;
begin
  if not public.has_perm('content.write') then raise exception 'forbidden' using errcode = '42501'; end if;
  select * into r from public.content_revisions where content_id = p_id and version = p_version;
  if not found then return jsonb_build_object('ok', false, 'error', 'revisi_tidak_ditemukan'); end if;
  -- dipulihkan sebagai draft agar tidak langsung tayang; admin menerbitkan ulang secara sadar
  res := public.admin_content_save(p_id, null, (r.snapshot - 'translation_of') || jsonb_build_object('status', 'draft'), 'Dipulihkan dari versi ' || p_version);
  return res;
end $$;

create or replace function public.admin_content_delete(p_id uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare c public.contents;
begin
  if not public.has_perm('content.write') then raise exception 'forbidden' using errcode = '42501'; end if;
  select * into c from public.contents where id = p_id;
  if not found then return jsonb_build_object('ok', false, 'error', 'tidak_ditemukan'); end if;
  if c.status = 'published' then return jsonb_build_object('ok', false, 'error', 'arsipkan_dulu'); end if;
  delete from public.contents where id = p_id;
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.admin_content_revisions(p_id uuid) returns setof public.content_revisions
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.has_perm('content.read') then raise exception 'forbidden' using errcode = '42501'; end if;
  return query select * from public.content_revisions where content_id = p_id order by version desc limit 50;
end $$;

----------------------------------------------------------------------------- 5. Media (bucket site-assets, folder media/)
create or replace function public.admin_media_register(p_path text, p_alt text default null, p_width int default null, p_height int default null) returns jsonb
language plpgsql security definer set search_path = public, storage as $$
declare o record;
begin
  if not public.has_perm('content.write') then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_path is null or p_path !~ '^media/[A-Za-z0-9._-]+$' then return jsonb_build_object('ok', false, 'error', 'path_tidak_valid'); end if;
  if char_length(coalesce(p_alt, '')) > 200 then return jsonb_build_object('ok', false, 'error', 'alt_terlalu_panjang'); end if;
  select name, metadata into o from storage.objects where bucket_id = 'site-assets' and name = p_path;
  if not found then return jsonb_build_object('ok', false, 'error', 'berkas_tidak_ditemukan'); end if;
  if coalesce(o.metadata ->> 'mimetype', '') not in ('image/jpeg','image/png','image/webp','image/gif') then return jsonb_build_object('ok', false, 'error', 'tipe_tidak_didukung'); end if;
  if coalesce((o.metadata ->> 'size')::bigint, 0) > 3145728 then return jsonb_build_object('ok', false, 'error', 'berkas_terlalu_besar'); end if;
  insert into public.content_media (path, alt, mime, size_bytes, width, height, uploaded_by)
  values (p_path, nullif(btrim(p_alt), ''), o.metadata ->> 'mimetype', (o.metadata ->> 'size')::bigint,
          case when p_width between 1 and 20000 then p_width end, case when p_height between 1 and 20000 then p_height end, auth.uid())
  on conflict (path) do update set alt = excluded.alt, width = excluded.width, height = excluded.height;
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.admin_media_list() returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.has_perm('content.read') then raise exception 'forbidden' using errcode = '42501'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('path', m.path, 'alt', m.alt, 'mime', m.mime, 'size', m.size_bytes, 'width', m.width, 'height', m.height, 'at', m.created_at,
      'used_in', coalesce((select jsonb_agg(jsonb_build_object('id', c.id, 'title', c.title, 'type', c.type) order by c.title) from public.contents c
         where position(m.path in coalesce(c.image_url, '')) > 0 or position(m.path in coalesce(c.og_image_url, '')) > 0 or position(m.path in coalesce(c.body, '')) > 0), '[]'::jsonb)
    ) order by m.created_at desc) from public.content_media m), '[]'::jsonb);
end $$;

create or replace function public.admin_media_set_alt(p_path text, p_alt text) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not public.has_perm('content.write') then raise exception 'forbidden' using errcode = '42501'; end if;
  if char_length(coalesce(p_alt, '')) > 200 then return jsonb_build_object('ok', false, 'error', 'alt_terlalu_panjang'); end if;
  update public.content_media set alt = nullif(btrim(p_alt), '') where path = p_path;
  if not found then return jsonb_build_object('ok', false, 'error', 'tidak_ditemukan'); end if;
  return jsonb_build_object('ok', true);
end $$;

-- hanya menghapus catatan bila tidak dipakai; berkas di storage dihapus klien setelah ini berhasil
create or replace function public.admin_media_delete(p_path text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if not public.has_perm('content.write') then raise exception 'forbidden' using errcode = '42501'; end if;
  select count(*) into n from public.contents c where position(p_path in coalesce(c.image_url, '')) > 0 or position(p_path in coalesce(c.og_image_url, '')) > 0 or position(p_path in coalesce(c.body, '')) > 0;
  if n > 0 then return jsonb_build_object('ok', false, 'error', 'media_dipakai', 'used', n); end if;
  delete from public.content_media where path = p_path;
  if not found then return jsonb_build_object('ok', false, 'error', 'tidak_ditemukan'); end if;
  return jsonb_build_object('ok', true);
end $$;

----------------------------------------------------------------------------- 6. Fungsi publik (hanya konten tayang)
create or replace function public.public_content(p_type text, p_slug text, p_lang text default 'id') returns jsonb
language sql stable security definer set search_path = public as $$
  with c as (
    select * from public.contents x
     where x.type = p_type and x.slug = p_slug and x.lang = coalesce(p_lang, 'id') and x.status = 'published'
       and (x.publish_at is null or x.publish_at <= now()) and (x.unpublish_at is null or x.unpublish_at > now()) limit 1)
  select jsonb_build_object('id', c.id, 'type', c.type, 'title', c.title, 'slug', c.slug, 'lang', c.lang, 'excerpt', c.excerpt, 'body', c.body, 'image_url', c.image_url,
      'seo_title', c.seo_title, 'seo_description', c.seo_description, 'canonical_url', c.canonical_url, 'og_image_url', c.og_image_url, 'noindex', c.noindex,
      'published_at', c.published_at, 'updated_at', c.updated_at,
      'alternates', coalesce((select jsonb_agg(jsonb_build_object('lang', a.lang, 'slug', a.slug)) from public.contents a
         where a.type = c.type and a.id <> c.id and a.status = 'published' and (a.publish_at is null or a.publish_at <= now()) and (a.unpublish_at is null or a.unpublish_at > now())
           and coalesce(a.translation_of, a.id) = coalesce(c.translation_of, c.id) and a.slug is not null), '[]'::jsonb))
  from c
$$;

create or replace function public.public_content_list(p_type text, p_lang text default 'id', p_limit int default 50) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', t.id, 'title', t.title, 'slug', t.slug, 'excerpt', t.excerpt, 'body', case when t.type in ('faq','tutorial') then t.body end, 'image_url', t.image_url, 'link_url', t.link_url, 'published_at', t.published_at) order by t.sort, t.published_at desc nulls last), '[]'::jsonb)
  from (select * from public.contents x where x.type = p_type and x.lang = coalesce(p_lang, 'id') and x.status = 'published' and (x.publish_at is null or x.publish_at <= now()) and (x.unpublish_at is null or x.unpublish_at > now())
        order by x.sort, x.published_at desc nulls last limit least(greatest(coalesce(p_limit, 50), 1), 200)) t
$$;

create or replace function public.public_sitemap() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('type', type, 'lang', lang, 'slug', slug, 'updated_at', updated_at) order by type, slug), '[]'::jsonb)
  from public.contents where type in ('article','page') and slug is not null and status = 'published' and not noindex
    and (publish_at is null or publish_at <= now()) and (unpublish_at is null or unpublish_at > now())
$$;

----------------------------------------------------------------------------- 7. Hak eksekusi
revoke execute on function public.content_issue(uuid,text,jsonb), public.contents_revision() from public, anon, authenticated;
revoke execute on function public.admin_content_save(uuid,text,jsonb,text), public.admin_content_restore(uuid,int), public.admin_content_delete(uuid), public.admin_content_revisions(uuid),
  public.admin_media_register(text,text,int,int), public.admin_media_list(), public.admin_media_set_alt(text,text), public.admin_media_delete(text) from public, anon;
grant execute on function public.admin_content_save(uuid,text,jsonb,text), public.admin_content_restore(uuid,int), public.admin_content_delete(uuid), public.admin_content_revisions(uuid),
  public.admin_media_register(text,text,int,int), public.admin_media_list(), public.admin_media_set_alt(text,text), public.admin_media_delete(text) to authenticated;
grant execute on function public.public_content(text,text,text), public.public_content_list(text,text,int), public.public_sitemap() to anon, authenticated;
