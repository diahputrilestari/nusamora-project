-- NusaMora: admin Manajemen Template (aditif, aman dijalankan ulang).
-- Jalankan SETELAH asset-schema.sql, template-meta.sql, admin-customers.sql.
-- Isi: status draft/published/archived yang ditegakkan DB, indikator kelengkapan aset sebelum terbit, versi (snapshot + pulihkan),
-- duplikasi, kompatibilitas paket, bahasa, template unggulan/rekomendasi, jumlah penggunaan.
-- Tidak mengubah kontrak yang ada: kolom baru bernilai bawaan, RPC lama tidak diubah.

----------------------------------------------------------------------------- 1. Kolom baru
alter table public.templates add column if not exists version int not null default 1;
alter table public.templates add column if not exists featured boolean not null default false;
alter table public.templates add column if not exists recommended boolean not null default false;
alter table public.templates add column if not exists languages text[] not null default '{id}';
alter table public.templates add column if not exists default_language text not null default 'id';
alter table public.templates add column if not exists published_at timestamptz;
alter table public.templates add column if not exists updated_at timestamptz;
update public.templates set published_at = coalesce(published_at, created_at) where status = 'published' and published_at is null;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'templates_languages_chk') then
    alter table public.templates add constraint templates_languages_chk
      check (cardinality(languages) between 1 and 8 and languages <@ array['id','en','jv','su','ms','ar','zh','ja']::text[]);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'templates_deflang_chk') then
    alter table public.templates add constraint templates_deflang_chk check (default_language = any (languages));
  end if;
end $$;
drop trigger if exists templates_touch on public.templates;
create trigger templates_touch before update on public.templates for each row execute function public.touch_updated();

create table if not exists public.template_versions (
  id bigint generated always as identity primary key,
  template_id uuid not null references public.templates(id) on delete cascade,
  version int not null,
  note text,
  snapshot jsonb not null,
  snapshot_hash text not null,
  created_by uuid,
  created_at timestamptz not null default now(),
  unique (template_id, version));
alter table public.template_versions enable row level security;
drop policy if exists "admin baca" on public.template_versions;
create policy "admin baca" on public.template_versions for select to authenticated using (public.has_perm('templates.read'));
revoke all on public.template_versions from anon, authenticated;
grant select on public.template_versions to authenticated;

----------------------------------------------------------------------------- 2. Snapshot & kelengkapan (fungsi internal, tidak dapat dipanggil klien)
create or replace function public.tpl_snapshot(p_id uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'info', jsonb_build_object('name', t.name, 'description', t.description, 'thumbnail_url', t.thumbnail_url, 'preview_url', t.preview_url, 'category_id', t.category_id,
              'categories', to_jsonb(t.categories), 'package_type', t.package_type, 'theme_key', t.theme_key, 'capabilities', t.capabilities, 'layout', t.layout,
              'languages', to_jsonb(t.languages), 'default_language', t.default_language, 'price', t.price, 'min_plan', t.min_plan),
    'assets', coalesce((select jsonb_agg(jsonb_build_object('theme_id', ta.theme_id, 'slot_key', ta.slot_key, 'section', ta.section, 'asset_id', ta.asset_id, 'position', ta.position, 'config', ta.config)
                        order by ta.theme_id nulls first, ta.slot_key, ta.position, ta.asset_id) from public.template_assets ta where ta.template_id = t.id), '[]'::jsonb),
    'themes', coalesce((select jsonb_agg(jsonb_build_object('theme_id', tt.theme_id, 'enabled', tt.enabled, 'layout', tt.layout, 'sort', tt.sort) order by tt.theme_id)
                        from public.template_themes tt where tt.template_id = t.id), '[]'::jsonb))
  from public.templates t where t.id = p_id
$$;

create or replace function public.tpl_chk(k text, l text, req boolean, ok boolean, hint text, grp text) returns jsonb
language sql immutable as $$ select jsonb_build_object('key', k, 'label', l, 'required', req, 'ok', coalesce(ok, false), 'hint', hint, 'group', grp) $$;

create or replace function public.tpl_readiness(p_id uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare t public.templates; c jsonb := '[]'::jsonb; slots text[]; broken int; wed boolean; hasg boolean; hasb boolean; r int; ro int; tot int; tok int;
begin
  select * into t from public.templates x where x.id = p_id;
  if not found then return null; end if;
  select coalesce(array_agg(distinct ta.slot_key), '{}') into slots from public.template_assets ta join public.assets a on a.id = ta.asset_id
    where ta.template_id = p_id and a.deleted_at is null and a.status = 'active';
  select count(*) into broken from public.template_assets ta join public.assets a on a.id = ta.asset_id
    where ta.template_id = p_id and (a.deleted_at is not null or a.status <> 'active');
  wed := t.categories && array['wedding','engagement']::text[];
  c := c || public.tpl_chk('description', 'Deskripsi template (min. 20 karakter)', true, char_length(btrim(coalesce(t.description, ''))) >= 20, 'Tulis deskripsi di Studio template, tab A.', 'Informasi')
         || public.tpl_chk('thumbnail', 'Thumbnail template', true, coalesce(btrim(t.thumbnail_url), '') <> '', 'Unggah thumbnail di Studio template, tab A.', 'Informasi')
         || public.tpl_chk('category', 'Kategori acara', true, cardinality(t.categories) > 0, 'Pilih minimal satu kategori acara.', 'Informasi')
         || public.tpl_chk('preview', 'URL demo / preview', false, coalesce(btrim(t.preview_url), '') <> '', 'Tanpa URL, pelanggan memakai halaman demo bawaan.', 'Informasi');
  if t.package_type = 'essential' then
    c := c || public.tpl_chk('bg', 'Latar (background) 2D', true, slots && array['opening_background','hero_background','section_background'], 'Pasang aset pada slot Latar pembuka / Latar utama / Latar section (Studio, tab B).', 'Aset')
           || public.tpl_chk('deco', 'Ilustrasi atau dekorasi', false, slots && array['couple_illustration','groom_illustration','bride_illustration','floral_decoration','gorga_border','frame_border','ornament_corner','closing_decoration','animated_decoration'], 'Membuat undangan lebih hidup.', 'Aset');
  elsif t.package_type = 'signature' then
    c := c || public.tpl_chk('venue', 'Model venue 3D', true, '3d_wedding_venue' = any (slots), 'Pasang model GLB/glTF pada slot Venue pernikahan 3D.', 'Aset')
           || public.tpl_chk('camera', 'Kamera sinematik', false, 'cinematic_camera_scene' = any (slots), 'Tanpa ini kamera memakai gerak bawaan.', 'Aset')
           || public.tpl_chk('env', 'Environment / langit', false, slots && array['environment_map','sky_background'], 'HDR atau backdrop untuk pencahayaan.', 'Aset')
           || public.tpl_chk('music', 'Musik latar', false, 'background_music' = any (slots), 'Opsional.', 'Aset');
  else
    c := c || public.tpl_chk('venue', 'Venue virtual', true, slots && array['virtual_venue','venue_backdrop','venue_model'], 'Pasang gambar latar atau model venue pada slot Venue virtual / Backdrop / Model venue.', 'Aset')
           || public.tpl_chk('guestav', 'Avatar tamu', false, slots && array['avatar_guest','avatar_male','avatar_female'], 'Pelanggan memilih avatar tamu dari sini.', 'Aset')
           || public.tpl_chk('interactive', 'Objek interaktif', false, 'interactive_objects' = any (slots), 'Opsional.', 'Aset')
           || public.tpl_chk('audio', 'Audio venue', false, 'venue_audio' = any (slots), 'Opsional.', 'Aset');
  end if;
  if t.package_type in ('essential','signature','luxe') then
    select coalesce(bool_or(a.attrs->>'character_role' = 'pria' or a.attrs->>'model_role' = 'mempelai_pria' or a.attrs->>'avatar_role' = 'pengantin_pria'), false),
           coalesce(bool_or(a.attrs->>'character_role' = 'wanita' or a.attrs->>'model_role' = 'mempelai_wanita' or a.attrs->>'avatar_role' = 'pengantin_wanita'), false)
      into hasg, hasb from public.template_assets ta join public.assets a on a.id = ta.asset_id where ta.template_id = p_id and a.deleted_at is null and a.status = 'active';
    c := c || public.tpl_chk('avatar_groom', 'Avatar mempelai pria', t.package_type = 'luxe' and wed, hasg, 'Dipilih pelanggan di editor. Tandai peran avatar pada aset.', 'Aset')
           || public.tpl_chk('avatar_bride', 'Avatar mempelai wanita', t.package_type = 'luxe' and wed, hasb, 'Dipilih pelanggan di editor. Tandai peran avatar pada aset.', 'Aset');
  end if;
  c := c || public.tpl_chk('broken', 'Semua aset terpasang masih aktif', true, broken = 0, broken || ' aset terpasang diarsipkan atau dihapus. Ganti di Studio, tab B.', 'Aset')
         || public.tpl_chk('layout', 'Layout & section diatur', false, case when jsonb_typeof(t.layout->'sections') = 'array' then jsonb_array_length(t.layout->'sections') > 0 else false end, 'Atur di Studio template, tab C.', 'Tampilan')
         || public.tpl_chk('theme', 'Minimal satu tema aktif', false, exists (select 1 from public.template_themes tt where tt.template_id = p_id and tt.enabled), 'Opsional: beri pelanggan pilihan tema.', 'Tampilan');
  select count(*) filter (where (e->>'required')::boolean), count(*) filter (where (e->>'required')::boolean and (e->>'ok')::boolean), count(*), count(*) filter (where (e->>'ok')::boolean)
    into r, ro, tot, tok from jsonb_array_elements(c) e;
  return jsonb_build_object('ready', r = ro, 'required_total', r, 'required_ok', ro, 'total', tot, 'ok_count', tok, 'checks', c);
end $$;

-- Penjaga status: publikasi dari UI wajib lolos kelengkapan, kecuali "terbitkan paksa" (RPC) dengan alasan tercatat.
create or replace function public.templates_guard_status() returns trigger
language plpgsql security definer set search_path = public as $$
declare rd jsonb; miss text;
begin
  if new.status = 'published' and old.status is distinct from 'published' then
    new.published_at := now();
    if auth.uid() is not null and coalesce(current_setting('nm.force_publish', true), '') <> '1' then
      rd := public.tpl_readiness(new.id);
      if not (rd->>'ready')::boolean then
        select string_agg(e->>'label', ', ') into miss from jsonb_array_elements(rd->'checks') e where (e->>'required')::boolean and not (e->>'ok')::boolean;
        raise exception 'template_belum_lengkap' using errcode = 'P0001', hint = 'Belum lengkap: ' || coalesce(miss, '-');
      end if;
    end if;
  end if;
  if new.status <> 'published' then new.featured := false; new.recommended := false; end if;
  return new;
end $$;
drop trigger if exists templates_guard_status_trg on public.templates;
create trigger templates_guard_status_trg before update of status on public.templates for each row execute function public.templates_guard_status();

----------------------------------------------------------------------------- 3. RPC admin
create or replace function public.admin_templates_overview() returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.has_perm('templates.read') then raise exception 'forbidden' using errcode = '42501'; end if;
  return coalesce((select jsonb_object_agg(t.id::text, jsonb_build_object(
      'usage_total', coalesce(u.n, 0), 'usage_active', coalesce(u.a, 0),
      'ready', (rd->>'ready')::boolean, 'req_ok', (rd->>'required_ok')::int, 'req_total', (rd->>'required_total')::int))
    from public.templates t
    left join (select i.template_id, count(*) n, count(*) filter (where i.status = 'aktif' and (i.expires_at is null or i.expires_at > now())) a from public.invitations i group by i.template_id) u on u.template_id = t.slug
    cross join lateral (select public.tpl_readiness(t.id) as rd) z), '{}'::jsonb);
end $$;

create or replace function public.admin_template_detail(p_id uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare t public.templates; snap jsonb; h text; lastv int; match int;
begin
  if not public.has_perm('templates.read') then raise exception 'forbidden' using errcode = '42501'; end if;
  select * into t from public.templates x where x.id = p_id;
  if not found then raise exception 'template tidak ditemukan'; end if;
  snap := public.tpl_snapshot(p_id); h := md5(snap::text);
  select max(v.version) into lastv from public.template_versions v where v.template_id = p_id;
  select max(v.version) into match from public.template_versions v where v.template_id = p_id and v.snapshot_hash = h;
  return jsonb_build_object(
    'template', (select to_jsonb(z) from (select t.id, t.slug, t.name, t.description, t.thumbnail_url, t.preview_url, t.category_id, t.categories, t.package_type, t.theme_key, t.min_plan, t.price,
        t.status, t.sort, t.version, t.featured, t.recommended, t.languages, t.default_language, t.created_at, t.updated_at, t.published_at,
        (select c.name from public.event_categories c where c.id = t.category_id) as category_name) z),
    'readiness', public.tpl_readiness(p_id),
    'usage', (select jsonb_build_object('total', count(*), 'active', count(*) filter (where i.status = 'aktif' and (i.expires_at is null or i.expires_at > now())),
                'draft', count(*) filter (where i.status = 'draft'), 'pending', count(*) filter (where i.status = 'menunggu_pembayaran'),
                'last30', count(*) filter (where i.created_at > now() - interval '30 days')) from public.invitations i where i.template_id = t.slug),
    'assets_count', (select count(*) from public.template_assets ta where ta.template_id = p_id),
    'themes', coalesce((select jsonb_agg(jsonb_build_object('slug', th.slug, 'name', th.name, 'enabled', tt.enabled, 'status', th.status) order by tt.sort, th.name)
                        from public.template_themes tt join public.themes th on th.id = tt.theme_id where tt.template_id = p_id), '[]'::jsonb),
    'versions', coalesce((select jsonb_agg(jsonb_build_object('version', v.version, 'note', v.note, 'created_at', v.created_at, 'by', pr.full_name,
                          'assets', jsonb_array_length(v.snapshot->'assets'), 'current', v.snapshot_hash = h) order by v.version desc)
                          from (select * from public.template_versions w where w.template_id = p_id order by w.version desc limit 50) v left join public.profiles pr on pr.id = v.created_by), '[]'::jsonb),
    'latest_version', lastv, 'matches_version', match, 'dirty', match is null);
end $$;

create or replace function public.admin_template_action(p_id uuid, p_action text, p_note text default null, p_force boolean default false) returns void
language plpgsql security definer set search_path = public as $$
declare t public.templates; nt text := nullif(btrim(coalesce(p_note, '')), '');
begin
  if not public.has_perm('templates.write') then raise exception 'forbidden' using errcode = '42501'; end if;
  select * into t from public.templates x where x.id = p_id for update;
  if not found then raise exception 'template tidak ditemukan'; end if;
  if p_action = 'publish' then
    if t.status = 'published' then return; end if;
    if coalesce(p_force, false) then
      if char_length(coalesce(nt, '')) < 3 then raise exception 'alasan wajib diisi'; end if;
      perform set_config('nm.force_publish', '1', true);
      insert into public.audit_logs (actor_id, action, table_name, row_id, summary)
      values (auth.uid(), 'template_terbit_paksa', 'templates', p_id::text, jsonb_build_object('catatan', nt, 'kelengkapan', public.tpl_readiness(p_id)->'required_ok'));
    end if;
    update public.templates set status = 'published' where id = p_id;
    perform set_config('nm.force_publish', '', true);
  elsif p_action = 'unpublish' then
    if t.status <> 'published' then raise exception 'template tidak sedang terbit'; end if;
    update public.templates set status = 'draft' where id = p_id;
  elsif p_action = 'archive' then
    if t.status = 'archived' then return; end if;
    update public.templates set status = 'archived' where id = p_id;
  elsif p_action = 'unarchive' then
    if t.status <> 'archived' then raise exception 'template tidak diarsipkan'; end if;
    update public.templates set status = 'draft' where id = p_id;
  else raise exception 'tindakan tidak valid';
  end if;
end $$;

create or replace function public.admin_template_settings(p_id uuid, p_patch jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare t public.templates; pk text; langs text[]; dl text; n int;
begin
  if not public.has_perm('templates.write') then raise exception 'forbidden' using errcode = '42501'; end if;
  select * into t from public.templates x where x.id = p_id for update;
  if not found then raise exception 'template tidak ditemukan'; end if;
  pk := coalesce(nullif(p_patch->>'package_type', ''), t.package_type);
  if pk not in ('essential','signature','luxe') then raise exception 'paket tidak valid'; end if;
  if pk <> t.package_type then
    select count(*) into n from public.invitations i where i.template_id = t.slug;
    if n > 0 then raise exception 'template_dipakai'; end if;
    select count(*) into n from public.template_assets ta where ta.template_id = p_id;
    if n > 0 then raise exception 'aset_terpasang'; end if;
    if t.status = 'published' then raise exception 'masih_terbit'; end if;
  end if;
  if p_patch ? 'languages' then select coalesce(array_agg(distinct value order by value), '{}') into langs from jsonb_array_elements_text(p_patch->'languages'); else langs := t.languages; end if;
  dl := coalesce(nullif(p_patch->>'default_language', ''), t.default_language);
  if cardinality(langs) = 0 then raise exception 'pilih minimal satu bahasa'; end if;
  if not (dl = any (langs)) then raise exception 'bahasa utama harus termasuk bahasa yang dipilih'; end if;
  if t.status <> 'published' and ((p_patch ? 'featured' and coalesce((p_patch->>'featured')::boolean, false)) or (p_patch ? 'recommended' and coalesce((p_patch->>'recommended')::boolean, false))) then
    raise exception 'hanya_template_terbit';
  end if;
  update public.templates set package_type = pk, languages = langs, default_language = dl,
    featured = case when p_patch ? 'featured' then coalesce((p_patch->>'featured')::boolean, false) else featured end,
    recommended = case when p_patch ? 'recommended' then coalesce((p_patch->>'recommended')::boolean, false) else recommended end
  where id = p_id;
end $$;

create or replace function public.admin_template_duplicate(p_id uuid, p_name text, p_slug text) returns uuid
language plpgsql security definer set search_path = public as $$
declare t public.templates; nid uuid; sl text := lower(btrim(coalesce(p_slug, '')));
begin
  if not public.has_perm('templates.write') then raise exception 'forbidden' using errcode = '42501'; end if;
  select * into t from public.templates x where x.id = p_id;
  if not found then raise exception 'template tidak ditemukan'; end if;
  if sl !~ '^[a-z0-9-]{2,60}$' then raise exception 'slug tidak valid'; end if;
  if char_length(btrim(coalesce(p_name, ''))) < 2 then raise exception 'nama wajib diisi'; end if;
  if exists (select 1 from public.templates x where x.slug = sl) then raise exception 'slug_sudah_dipakai'; end if;
  insert into public.templates (slug, name, category_id, description, thumbnail_url, preview_url, price, min_plan, status, sort, package_type, categories, capabilities, theme_key, layout, languages, default_language, version)
  values (sl, left(btrim(p_name), 80), t.category_id, t.description, t.thumbnail_url, t.preview_url, t.price, t.min_plan, 'draft', t.sort + 1, t.package_type, t.categories, t.capabilities, t.theme_key, t.layout, t.languages, t.default_language, 1)
  returning id into nid;
  insert into public.template_assets (template_id, theme_id, slot_key, section, asset_id, position, config)
    select nid, ta.theme_id, ta.slot_key, ta.section, ta.asset_id, ta.position, ta.config from public.template_assets ta where ta.template_id = p_id;
  insert into public.template_themes (template_id, theme_id, enabled, layout, sort)
    select nid, tt.theme_id, tt.enabled, tt.layout, tt.sort from public.template_themes tt where tt.template_id = p_id;
  insert into public.audit_logs (actor_id, action, table_name, row_id, summary)
  values (auth.uid(), 'template_duplikasi', 'templates', nid::text, jsonb_build_object('dari', p_id, 'slug', sl));
  return nid;
end $$;

create or replace function public.admin_template_save_version(p_id uuid, p_note text default null) returns int
language plpgsql security definer set search_path = public as $$
declare snap jsonb; h text; n int;
begin
  if not public.has_perm('templates.write') then raise exception 'forbidden' using errcode = '42501'; end if;
  perform 1 from public.templates x where x.id = p_id for update;
  if not found then raise exception 'template tidak ditemukan'; end if;
  snap := public.tpl_snapshot(p_id); h := md5(snap::text);
  if exists (select 1 from public.template_versions v where v.template_id = p_id and v.snapshot_hash = h and v.version = (select max(w.version) from public.template_versions w where w.template_id = p_id)) then
    raise exception 'tidak_ada_perubahan';
  end if;
  select coalesce(max(v.version), 0) + 1 into n from public.template_versions v where v.template_id = p_id;
  insert into public.template_versions (template_id, version, note, snapshot, snapshot_hash, created_by)
  values (p_id, n, left(nullif(btrim(coalesce(p_note, '')), ''), 300), snap, h, auth.uid());
  update public.templates set version = n where id = p_id;
  return n;
end $$;

create or replace function public.admin_template_restore_version(p_id uuid, p_version int) returns jsonb
language plpgsql security definer set search_path = public as $$
declare t public.templates; v public.template_versions; i jsonb; sk_a int := 0; sk_t int := 0; e jsonb; snap jsonb;
begin
  if not public.has_perm('templates.write') then raise exception 'forbidden' using errcode = '42501'; end if;
  select * into t from public.templates x where x.id = p_id for update;
  if not found then raise exception 'template tidak ditemukan'; end if;
  if t.status = 'published' then raise exception 'masih_terbit'; end if;
  select * into v from public.template_versions w where w.template_id = p_id and w.version = p_version;
  if not found then raise exception 'versi tidak ditemukan'; end if;
  -- cadangan otomatis kondisi saat ini bila belum identik dengan versi mana pun
  snap := public.tpl_snapshot(p_id);
  if not exists (select 1 from public.template_versions w where w.template_id = p_id and w.snapshot_hash = md5(snap::text)) then
    insert into public.template_versions (template_id, version, note, snapshot, snapshot_hash, created_by)
    values (p_id, (select max(w.version) + 1 from public.template_versions w where w.template_id = p_id), 'Otomatis sebelum memulihkan v' || p_version, snap, md5(snap::text), auth.uid());
  end if;
  i := v.snapshot->'info';
  update public.templates set name = i->>'name', description = i->>'description', thumbnail_url = i->>'thumbnail_url', preview_url = i->>'preview_url',
    category_id = nullif(i->>'category_id', '')::uuid, categories = coalesce((select array_agg(x) from jsonb_array_elements_text(i->'categories') x), '{}'),
    package_type = i->>'package_type', theme_key = i->>'theme_key', capabilities = coalesce(i->'capabilities', '{}'::jsonb), layout = coalesce(i->'layout', '{}'::jsonb),
    languages = coalesce((select array_agg(x) from jsonb_array_elements_text(i->'languages') x), '{id}'), default_language = coalesce(i->>'default_language', 'id'),
    price = coalesce((i->>'price')::bigint, 0), min_plan = i->>'min_plan'
  where id = p_id;
  delete from public.template_assets where template_id = p_id;
  for e in select * from jsonb_array_elements(v.snapshot->'assets') loop
    if exists (select 1 from public.assets a where a.id = (e->>'asset_id')::uuid and a.deleted_at is null)
       and (nullif(e->>'theme_id', '') is null or exists (select 1 from public.themes th where th.id = (e->>'theme_id')::uuid)) then
      insert into public.template_assets (template_id, theme_id, slot_key, section, asset_id, position, config)
      values (p_id, nullif(e->>'theme_id', '')::uuid, e->>'slot_key', e->>'section', (e->>'asset_id')::uuid, (e->>'position')::int, coalesce(e->'config', '{}'::jsonb));
    else sk_a := sk_a + 1; end if;
  end loop;
  delete from public.template_themes where template_id = p_id;
  for e in select * from jsonb_array_elements(v.snapshot->'themes') loop
    if exists (select 1 from public.themes th where th.id = (e->>'theme_id')::uuid) then
      insert into public.template_themes (template_id, theme_id, enabled, layout, sort) values (p_id, (e->>'theme_id')::uuid, (e->>'enabled')::boolean, coalesce(e->'layout', '{}'::jsonb), coalesce((e->>'sort')::int, 0));
    else sk_t := sk_t + 1; end if;
  end loop;
  update public.templates set version = (select max(w.version) from public.template_versions w where w.template_id = p_id) where id = p_id;
  insert into public.audit_logs (actor_id, action, table_name, row_id, summary)
  values (auth.uid(), 'template_pulihkan_versi', 'templates', p_id::text, jsonb_build_object('versi', p_version, 'aset_dilewati', sk_a, 'tema_dilewati', sk_t));
  return jsonb_build_object('ok', true, 'skipped_assets', sk_a, 'skipped_themes', sk_t);
end $$;

----------------------------------------------------------------------------- 4. Penanda untuk pelanggan (agregat publik, hanya template terbit)
create or replace function public.template_flags() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_object_agg(t.slug, jsonb_build_object('featured', t.featured, 'recommended', t.recommended, 'languages', to_jsonb(t.languages), 'default_language', t.default_language)), '{}'::jsonb)
  from public.templates t where t.status = 'published'
$$;

----------------------------------------------------------------------------- 5. Hak akses
revoke all on function public.tpl_snapshot(uuid), public.tpl_readiness(uuid), public.tpl_chk(text,text,boolean,boolean,text,text) from public, anon, authenticated;
revoke execute on function public.admin_templates_overview(), public.admin_template_detail(uuid), public.admin_template_action(uuid,text,text,boolean), public.admin_template_settings(uuid,jsonb),
  public.admin_template_duplicate(uuid,text,text), public.admin_template_save_version(uuid,text), public.admin_template_restore_version(uuid,int) from public, anon;
grant execute on function public.admin_templates_overview(), public.admin_template_detail(uuid), public.admin_template_action(uuid,text,text,boolean), public.admin_template_settings(uuid,jsonb),
  public.admin_template_duplicate(uuid,text,text), public.admin_template_save_version(uuid,text), public.admin_template_restore_version(uuid,int) to authenticated;
revoke execute on function public.template_flags() from public;
grant execute on function public.template_flags() to anon, authenticated;
