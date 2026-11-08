-- =====================================================================
-- NusaMora - Asset Library lengkap (additive, idempoten)
-- Jalankan SETELAH asset-schema.sql, admin-templates.sql dan content-protection.sql.
--  * Status aset: Aktif / Nonaktif / Arsip
--      Aktif    : bisa dipilih dan tampil.
--      Nonaktif : TIDAK bisa dipilih untuk penempatan baru; penempatan lama tetap tampil (aman untuk undangan yang sudah terbit).
--      Arsip    : tidak bisa dipilih dan tidak tampil (perilaku lama tidak berubah).
--  * Lisensi & sumber, versi aset (ganti file tanpa mengubah penempatan), riwayat penggunaan di template,
--    deteksi aset serupa, dan aksi massal.
-- =====================================================================

-- 1. Status
alter table public.assets drop constraint if exists assets_status_check;
alter table public.assets add constraint assets_status_check check (status in ('active', 'inactive', 'archived'));

-- 2. Lisensi & sumber
alter table public.assets add column if not exists license text not null default 'belum_diatur' check (license in ('belum_diatur','milik_sendiri','berlisensi_komersial','cc0','cc_by','ai_generated','lainnya'));
alter table public.assets add column if not exists source text not null default 'upload' check (source in ('upload','ai_generator','stok','klien','lainnya'));
alter table public.assets add column if not exists credit text check (credit is null or char_length(credit) <= 160);
alter table public.assets add column if not exists source_url text check (source_url is null or (source_url ~* '^https?://' and char_length(source_url) <= 500));
alter table public.assets add column if not exists license_note text check (license_note is null or char_length(license_note) <= 500);
alter table public.assets add column if not exists license_expires date;
alter table public.assets add column if not exists current_version int not null default 1;

create or replace function public.assets_defaults() returns trigger language plpgsql as $$
begin
  if new.file_path like 'generated/%' then
    if new.source = 'upload' then new.source := 'ai_generator'; end if;
    if new.license = 'belum_diatur' then new.license := 'ai_generated'; end if;
  end if;
  return new;
end $$;
drop trigger if exists assets_defaults_trg on public.assets;
create trigger assets_defaults_trg before insert on public.assets for each row execute function public.assets_defaults();
update public.assets set source = 'ai_generator', license = 'ai_generated' where file_path like 'generated/%' and source = 'upload' and license = 'belum_diatur';

create or replace function public.admin_asset_set_meta(p_id uuid, p_patch jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare a public.assets; lic text; src text; url text; ex date;
begin
  if not public.has_perm('templates.write') then raise exception 'forbidden' using errcode = '42501'; end if;
  select * into a from public.assets where id = p_id and deleted_at is null for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'tidak_ditemukan'); end if;
  lic := coalesce(p_patch->>'license', a.license); src := coalesce(p_patch->>'source', a.source);
  if lic not in ('belum_diatur','milik_sendiri','berlisensi_komersial','cc0','cc_by','ai_generated','lainnya') then return jsonb_build_object('ok', false, 'error', 'lisensi_tidak_valid'); end if;
  if src not in ('upload','ai_generator','stok','klien','lainnya') then return jsonb_build_object('ok', false, 'error', 'sumber_tidak_valid'); end if;
  url := case when p_patch ? 'source_url' then nullif(btrim(p_patch->>'source_url'), '') else a.source_url end;
  if url is not null and (url !~* '^https?://' or char_length(url) > 500) then return jsonb_build_object('ok', false, 'error', 'url_tidak_valid'); end if;
  begin ex := case when p_patch ? 'license_expires' then nullif(p_patch->>'license_expires', '')::date else a.license_expires end;
  exception when others then return jsonb_build_object('ok', false, 'error', 'tanggal_tidak_valid'); end;
  if lic in ('cc_by', 'berlisensi_komersial') and coalesce(nullif(btrim(coalesce(case when p_patch ? 'credit' then p_patch->>'credit' else a.credit end, '')), ''), nullif(btrim(coalesce(case when p_patch ? 'license_note' then p_patch->>'license_note' else a.license_note end, '')), '')) is null and url is null then
    return jsonb_build_object('ok', false, 'error', 'bukti_lisensi_kosong');          -- lisensi yang butuh atribusi/bukti wajib mencantumkan kredit, catatan, atau tautan sumber
  end if;
  update public.assets set license = lic, source = src, source_url = url, license_expires = ex,
         credit = case when p_patch ? 'credit' then left(nullif(btrim(p_patch->>'credit'), ''), 160) else credit end,
         license_note = case when p_patch ? 'license_note' then left(nullif(btrim(p_patch->>'license_note'), ''), 500) else license_note end,
         updated_at = now() where id = a.id returning * into a;
  return jsonb_build_object('ok', true, 'asset', to_jsonb(a));
end $$;

-- 3. Versi aset
create table if not exists public.asset_versions (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.assets(id) on delete cascade,
  version int not null check (version > 0),
  file_path text not null, file_url text not null, thumbnail_url text, file_type text not null, mime text,
  file_size bigint not null, width int, height int, checksum text,
  note text check (note is null or char_length(note) <= 300),
  created_by uuid references auth.users(id) on delete set null, created_at timestamptz not null default now(),
  unique (asset_id, version));
create index if not exists asset_versions_asset_idx on public.asset_versions (asset_id, version desc);
alter table public.asset_versions enable row level security;
drop policy if exists "admin baca" on public.asset_versions;
create policy "admin baca" on public.asset_versions for select using (public.has_perm('templates.read'));
revoke all on public.asset_versions from anon; revoke insert, update, delete on public.asset_versions from authenticated; grant select on public.asset_versions to authenticated;
insert into public.asset_versions (asset_id, version, file_path, file_url, thumbnail_url, file_type, mime, file_size, width, height, checksum, note, created_by, created_at)
  select a.id, 1, a.file_path, a.file_url, a.thumbnail_url, a.file_type, a.mime, a.file_size, a.width, a.height, a.checksum, 'Versi awal', a.created_by, a.created_at
    from public.assets a where not exists (select 1 from public.asset_versions v where v.asset_id = a.id);
create or replace function public.assets_v1() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.asset_versions (asset_id, version, file_path, file_url, thumbnail_url, file_type, mime, file_size, width, height, checksum, note, created_by)
  values (new.id, 1, new.file_path, new.file_url, new.thumbnail_url, new.file_type, new.mime, new.file_size, new.width, new.height, new.checksum, 'Versi awal', new.created_by) on conflict do nothing;
  return new;
end $$;
drop trigger if exists assets_v1_trg on public.assets;
create trigger assets_v1_trg after insert on public.assets for each row execute function public.assets_v1();

-- Dipanggil Edge Function asset-register SETELAH isi file diperiksa (magic bytes, checksum dihitung server). Hanya service_role.
create or replace function public.admin_register_asset_version(p_user uuid, p_asset uuid, p_path text, p_note text, p_meta jsonb)
returns jsonb language plpgsql security definer set search_path = public, storage as $$
declare a public.assets; c public.asset_categories; ext text := lower(coalesce(p_meta->>'file_type', '')); sz bigint := nullif(p_meta->>'size', '')::bigint; obj record; dup public.assets; nv int; old public.assets; sum text := p_meta->>'checksum'; pv int;
begin
  if not public.has_perm_user(p_user, 'templates.write') then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_path is null or p_path !~ '^(incoming|generated)/[A-Za-z0-9._/-]{3,200}$' or p_path like '%..%' then return jsonb_build_object('ok', false, 'error', 'path_tidak_valid'); end if;
  select * into a from public.assets where id = p_asset and deleted_at is null for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'tidak_ditemukan'); end if;
  old := a;
  if ext <> a.file_type or right(lower(p_path), char_length(ext) + 1) <> '.' || ext then return jsonb_build_object('ok', false, 'error', 'tipe_berbeda', 'expected', a.file_type); end if;
  select * into c from public.asset_categories where id = a.category_id;
  if not public.asset_mime_ok(ext, lower(coalesce(p_meta->>'mime', ''))) then return jsonb_build_object('ok', false, 'error', 'mime_tidak_sesuai'); end if;
  if sz is null or sz <= 0 or sz > c.max_bytes then return jsonb_build_object('ok', false, 'error', 'ukuran_melebihi_batas', 'max_bytes', c.max_bytes); end if;
  select name, (metadata->>'size')::bigint as size into obj from storage.objects where bucket_id = 'theme-assets' and name = p_path;
  if not found then return jsonb_build_object('ok', false, 'error', 'file_tidak_ditemukan'); end if;
  if obj.size is not null and obj.size <> sz then return jsonb_build_object('ok', false, 'error', 'ukuran_tidak_cocok'); end if;
  if sum is null or sum !~ '^[0-9a-f]{64}$' then return jsonb_build_object('ok', false, 'error', 'isi_tidak_sesuai'); end if;
  if sum = a.checksum then return jsonb_build_object('ok', false, 'error', 'sama_dengan_versi_sekarang'); end if;
  select * into dup from public.assets where checksum = sum and deleted_at is null and id <> a.id;
  if found then return jsonb_build_object('ok', false, 'error', 'duplikat', 'id', dup.id, 'name', dup.name); end if;
  select version into pv from public.asset_versions where asset_id = a.id and checksum = sum order by version desc limit 1;
  if pv is not null then return jsonb_build_object('ok', false, 'error', 'versi_sudah_ada', 'version', pv); end if;
  select coalesce(max(version), 0) + 1 into nv from public.asset_versions where asset_id = a.id;
  insert into public.asset_versions (asset_id, version, file_path, file_url, thumbnail_url, file_type, mime, file_size, width, height, checksum, note, created_by)
  values (a.id, nv, p_path, coalesce(p_meta->>'public_base', '') || p_path, nullif(p_meta->>'thumbnail_url', ''), ext, lower(p_meta->>'mime'), sz, nullif(p_meta->>'width', '')::int, nullif(p_meta->>'height', '')::int, sum, left(nullif(btrim(coalesce(p_note, '')), ''), 300), p_user);
  update public.assets set file_path = p_path, file_url = coalesce(p_meta->>'public_base', '') || p_path, thumbnail_url = nullif(p_meta->>'thumbnail_url', ''), mime = lower(p_meta->>'mime'), file_size = sz,
         width = nullif(p_meta->>'width', '')::int, height = nullif(p_meta->>'height', '')::int, is_transparent = coalesce((p_meta->>'is_transparent')::boolean, is_transparent),
         checksum = sum, current_version = nv, updated_at = now() where id = a.id returning * into a;
  insert into public.audit_logs (actor_id, action, table_name, row_id, summary) values (p_user, 'versi_baru', 'assets', a.id::text, jsonb_build_object('version', nv, 'catatan', nullif(btrim(coalesce(p_note, '')), '')));
  return jsonb_build_object('ok', true, 'asset', to_jsonb(a), 'version', nv, 'dimensi_berubah', (old.width is distinct from a.width or old.height is distinct from a.height));
end $$;
revoke execute on function public.admin_register_asset_version(uuid,uuid,text,text,jsonb) from public, anon, authenticated;
grant execute on function public.admin_register_asset_version(uuid,uuid,text,text,jsonb) to service_role;

create or replace function public.admin_asset_restore_version(p_id uuid, p_version int) returns jsonb
language plpgsql security definer set search_path = public as $$
declare a public.assets; v public.asset_versions;
begin
  if not public.has_perm('templates.write') then raise exception 'forbidden' using errcode = '42501'; end if;
  select * into a from public.assets where id = p_id and deleted_at is null for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'tidak_ditemukan'); end if;
  select * into v from public.asset_versions where asset_id = p_id and version = p_version;
  if not found then return jsonb_build_object('ok', false, 'error', 'versi_tidak_ditemukan'); end if;
  if a.current_version = v.version then return jsonb_build_object('ok', false, 'error', 'versi_sudah_aktif'); end if;
  if v.checksum is not null and exists (select 1 from public.assets x where x.checksum = v.checksum and x.deleted_at is null and x.id <> a.id) then return jsonb_build_object('ok', false, 'error', 'duplikat'); end if;
  update public.assets set file_path = v.file_path, file_url = v.file_url, thumbnail_url = v.thumbnail_url, mime = v.mime, file_size = v.file_size, width = v.width, height = v.height,
         checksum = v.checksum, current_version = v.version, updated_at = now() where id = a.id returning * into a;
  insert into public.audit_logs (actor_id, action, table_name, row_id, summary) values (auth.uid(), 'pulihkan_versi', 'assets', a.id::text, jsonb_build_object('version', v.version));
  return jsonb_build_object('ok', true, 'asset', to_jsonb(a));
end $$;

-- 4. Riwayat penggunaan aset di template (tanpa FK ke template agar tetap ada setelah template dihapus)
create table if not exists public.asset_usage_log (
  id bigint generated always as identity primary key,
  asset_id uuid not null references public.assets(id) on delete cascade,
  template_id uuid, template_name text, slot_key text,
  action text not null check (action in ('dipasang', 'dilepas')),
  txid bigint not null default txid_current(),
  actor_id uuid, created_at timestamptz not null default now());
create index if not exists asset_usage_log_asset_idx on public.asset_usage_log (asset_id, created_at desc);
alter table public.asset_usage_log enable row level security;
drop policy if exists "admin baca" on public.asset_usage_log;
create policy "admin baca" on public.asset_usage_log for select using (public.has_perm('templates.read'));
revoke all on public.asset_usage_log from anon; revoke insert, update, delete on public.asset_usage_log from authenticated; grant select on public.asset_usage_log to authenticated;

create or replace function public.asset_usage_trg() returns trigger language plpgsql security definer set search_path = public as $$
declare r public.template_assets; opp text; hit bigint; tn text;
begin
  if tg_op = 'INSERT' then r := new; opp := 'dilepas'; else r := old; opp := 'dipasang'; end if;
  -- pasang+lepas slot yang sama dalam satu transaksi (mis. simpan ulang studio) saling meniadakan: tidak dicatat sebagai perubahan
  delete from public.asset_usage_log where id = (select l.id from public.asset_usage_log l where l.txid = txid_current() and l.action = opp and l.asset_id = r.asset_id
         and l.template_id is not distinct from r.template_id and l.slot_key is not distinct from r.slot_key limit 1) returning id into hit;
  if hit is not null then return coalesce(new, old); end if;
  select name into tn from public.templates where id = r.template_id;
  insert into public.asset_usage_log (asset_id, template_id, template_name, slot_key, action, actor_id)
  values (r.asset_id, r.template_id, tn, r.slot_key, case when tg_op = 'INSERT' then 'dipasang' else 'dilepas' end, auth.uid());
  return coalesce(new, old);
end $$;
drop trigger if exists asset_usage_ins on public.template_assets; drop trigger if exists asset_usage_del on public.template_assets;
create trigger asset_usage_ins after insert on public.template_assets for each row execute function public.asset_usage_trg();
create trigger asset_usage_del after delete on public.template_assets for each row execute function public.asset_usage_trg();
insert into public.asset_usage_log (asset_id, template_id, template_name, slot_key, action, txid, created_at)
  select ta.asset_id, ta.template_id, t.name, ta.slot_key, 'dipasang', 0, coalesce((to_jsonb(ta)->>'created_at')::timestamptz, now())
    from public.template_assets ta join public.templates t on t.id = ta.template_id
   where not exists (select 1 from public.asset_usage_log l where l.asset_id = ta.asset_id and l.template_id = ta.template_id and l.slot_key = ta.slot_key and l.action = 'dipasang');

-- 5. Detail aset
create or replace function public.admin_asset_detail(p_id uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare a public.assets;
begin
  if not public.has_perm('templates.read') then raise exception 'forbidden' using errcode = '42501'; end if;
  select * into a from public.assets where id = p_id;
  if not found then raise exception 'aset tidak ditemukan'; end if;
  return jsonb_build_object(
    'asset', to_jsonb(a),
    'category', (select jsonb_build_object('name', c.name, 'package_type', c.package_type, 'max_bytes', c.max_bytes) from public.asset_categories c where c.id = a.category_id),
    'created_by_name', (select coalesce(p.full_name, u.email) from auth.users u left join public.profiles p on p.id = u.id where u.id = a.created_by),
    'placements', coalesce((select jsonb_agg(jsonb_build_object('template_id', t.id, 'template', t.name, 'package_type', t.package_type, 'template_status', t.status, 'slot', ta.slot_key, 'section', ta.section,
                     'theme', (select th.name from public.themes th where th.id = ta.theme_id)) order by t.name, ta.slot_key)
                     from public.template_assets ta join public.templates t on t.id = ta.template_id where ta.asset_id = a.id), '[]'::jsonb),
    'usage_log', coalesce((select jsonb_agg(jsonb_build_object('at', l.created_at, 'action', l.action, 'template', coalesce(l.template_name, '(template dihapus)'), 'slot', l.slot_key,
                     'by', (select coalesce(p.full_name, u.email) from auth.users u left join public.profiles p on p.id = u.id where u.id = l.actor_id)) order by l.created_at desc, l.id desc)
                     from (select * from public.asset_usage_log x where x.asset_id = a.id order by x.created_at desc, x.id desc limit 50) l), '[]'::jsonb),
    'versions', coalesce((select jsonb_agg(jsonb_build_object('version', v.version, 'file_url', v.file_url, 'file_type', v.file_type, 'file_size', v.file_size, 'width', v.width, 'height', v.height,
                     'note', v.note, 'at', v.created_at, 'current', v.version = a.current_version,
                     'by', (select coalesce(p.full_name, u.email) from auth.users u left join public.profiles p on p.id = u.id where u.id = v.created_by)) order by v.version desc)
                     from public.asset_versions v where v.asset_id = a.id), '[]'::jsonb),
    'similar', coalesce((select jsonb_agg(jsonb_build_object('id', s.id, 'name', s.name, 'status', s.status, 'deleted', s.deleted_at is not null, 'thumbnail_url', s.thumbnail_url, 'file_type', s.file_type,
                     'reason', case when s.checksum is not null and s.checksum = a.checksum then 'isi_sama' when s.file_type = a.file_type and s.width = a.width and s.height = a.height and s.file_size = a.file_size then 'ukuran_sama' else 'nama_sama' end))
                     from (select x.* from public.assets x where x.id <> a.id and ((x.checksum is not null and x.checksum = a.checksum)
                           or (x.file_type = a.file_type and x.width is not null and x.width = a.width and x.height = a.height and x.file_size = a.file_size)
                           or lower(btrim(x.name)) = lower(btrim(a.name))) order by x.created_at desc limit 20) s), '[]'::jsonb));
end $$;

-- 6. Daftar kelompok aset serupa
create or replace function public.admin_asset_duplicates() returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.has_perm('templates.read') then raise exception 'forbidden' using errcode = '42501'; end if;
  return coalesce((select jsonb_agg(g) from (
    select * from (
      select jsonb_build_object('reason', 'isi_sama', 'label', 'Isi file identik', 'assets', jsonb_agg(public.asset_brief(x) order by x.created_at)) as g, 1 as ord
        from public.assets x where x.checksum is not null group by x.checksum having count(*) > 1
      union all
      select jsonb_build_object('reason', 'ukuran_sama', 'label', 'Format, dimensi, dan ukuran sama', 'assets', jsonb_agg(public.asset_brief(x) order by x.created_at)), 2
        from public.assets x where x.deleted_at is null and x.width is not null group by x.file_type, x.width, x.height, x.file_size having count(*) > 1
      union all
      select jsonb_build_object('reason', 'nama_sama', 'label', 'Nama sama', 'assets', jsonb_agg(public.asset_brief(x) order by x.created_at)), 3
        from public.assets x where x.deleted_at is null group by lower(btrim(x.name)) having count(*) > 1) u
    order by ord limit 100) z), '[]'::jsonb);
end $$;
create or replace function public.asset_brief(a public.assets) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('id', a.id, 'name', a.name, 'status', a.status, 'deleted', a.deleted_at is not null, 'file_url', a.file_url, 'thumbnail_url', a.thumbnail_url, 'file_type', a.file_type,
         'file_size', a.file_size, 'width', a.width, 'height', a.height, 'created_at', a.created_at, 'uses', (select count(*) from public.template_assets ta where ta.asset_id = a.id))
$$;

-- 7. Aksi massal. Setiap aset diproses terpisah; yang gagal dilaporkan beserta alasannya, yang lain tetap berhasil.
create or replace function public.admin_assets_bulk(p_ids uuid[], p_action text, p_value jsonb default '{}'::jsonb, p_force boolean default false) returns jsonb
language plpgsql security definer set search_path = public as $$
declare aid uuid; a public.assets; r jsonb; done int := 0; failed jsonb := '[]'::jsonb; nt text[]; pub int; patch jsonb; ids uuid[];
begin
  if not public.has_perm('templates.write') then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_action not in ('status', 'add_tags', 'remove_tags', 'packages', 'category', 'meta', 'delete', 'restore') then return jsonb_build_object('ok', false, 'error', 'aksi_tidak_valid'); end if;
  select array_agg(distinct x) into ids from unnest(coalesce(p_ids, '{}')) x;
  if ids is null or cardinality(ids) = 0 then return jsonb_build_object('ok', false, 'error', 'tidak_ada_aset'); end if;
  if cardinality(ids) > 200 then return jsonb_build_object('ok', false, 'error', 'terlalu_banyak'); end if;
  foreach aid in array ids loop
    select * into a from public.assets where id = aid;
    if not found then failed := failed || jsonb_build_object('id', aid, 'name', null, 'error', 'tidak_ditemukan'); continue; end if;
    begin
      if p_action = 'status' then
        if coalesce(p_value->>'status', '') = 'archived' and not p_force then
          select count(*) into pub from public.template_assets ta join public.templates t on t.id = ta.template_id where ta.asset_id = aid and t.status = 'published';
          if pub > 0 then raise exception 'dipakai_template_terbit'; end if;
        end if;
        r := public.admin_update_asset(aid, jsonb_build_object('status', p_value->>'status'));
      elsif p_action in ('add_tags', 'remove_tags') then
        select coalesce(array_agg(t order by t), '{}') into nt from (
          select distinct lower(left(btrim(value), 30)) as t from jsonb_array_elements_text(coalesce(p_value->'tags', '[]'::jsonb)) where btrim(value) <> '') s;
        if p_action = 'add_tags' then nt := (select coalesce(array_agg(distinct x), '{}') from unnest(a.tags || nt) x);
        else nt := (select coalesce(array_agg(x), '{}') from unnest(a.tags) x where lower(x) <> all (nt)); end if;
        if cardinality(nt) > 20 then raise exception 'terlalu_banyak_tag'; end if;
        r := public.admin_update_asset(aid, jsonb_build_object('tags', to_jsonb(nt)));
      elsif p_action = 'packages' then r := public.admin_update_asset(aid, jsonb_build_object('package_types', p_value->'package_types'));
      elsif p_action = 'category' then r := public.admin_update_asset(aid, jsonb_build_object('category_id', p_value->>'category_id'));
      elsif p_action = 'meta' then r := public.admin_asset_set_meta(aid, p_value);
      elsif p_action = 'delete' then r := public.admin_delete_asset(aid, p_force);
      else r := public.admin_restore_asset(aid); end if;
      if coalesce((r->>'ok')::boolean, false) then done := done + 1;
      else failed := failed || jsonb_build_object('id', aid, 'name', a.name, 'error', coalesce(r->>'error', 'gagal')); end if;
    exception when others then
      failed := failed || jsonb_build_object('id', aid, 'name', a.name, 'error', case when sqlerrm in ('dipakai_template_terbit', 'terlalu_banyak_tag') then sqlerrm else 'gagal' end);
    end;
  end loop;
  return jsonb_build_object('ok', true, 'done', done, 'failed', failed);
end $$;

-- 8. Override fungsi lama: status 'inactive' dianggap masih TAMPIL (tetapi tidak boleh dipasang baru)
create or replace function public.admin_update_asset(p_id uuid, p_patch jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare a public.assets; c public.asset_categories; pk text; pkgs text[]; cat uuid; at jsonb;
begin
  if not public.has_perm('templates.write') then raise exception 'forbidden' using errcode = '42501'; end if;
  select * into a from public.assets where id = p_id and deleted_at is null for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'tidak_ditemukan'); end if;
  cat := coalesce(nullif(p_patch->>'category_id','')::uuid, a.category_id);
  select * into c from public.asset_categories where id = cat and active;
  if not found then return jsonb_build_object('ok', false, 'error', 'kategori_tidak_valid'); end if;
  if not (a.file_type = any (c.allowed_ext)) then return jsonb_build_object('ok', false, 'error', 'format_tidak_didukung'); end if;
  if p_patch ? 'package_types' then select coalesce(array_agg(value), '{}') into pkgs from jsonb_array_elements_text(p_patch->'package_types'); else pkgs := a.package_types; end if;
  if not (c.package_type = any (pkgs)) then pkgs := array_append(pkgs, c.package_type); end if;
  foreach pk in array pkgs loop
    if not exists (select 1 from public.asset_categories x where x.package_type = pk and x.active and a.file_type = any (x.allowed_ext)) then return jsonb_build_object('ok', false, 'error', 'paket_tidak_kompatibel', 'package', pk); end if;
  end loop;
  -- paket yang dilepas tidak boleh masih dipakai template paket tersebut
  if exists (select 1 from public.template_assets ta join public.templates t on t.id = ta.template_id where ta.asset_id = a.id and not (t.package_type = any (pkgs))) then
    return jsonb_build_object('ok', false, 'error', 'masih_dipakai_paket_lain');
  end if;
  if p_patch ? 'attrs' then at := public.asset_attrs_clean(p_patch->'attrs'); if at is null then return jsonb_build_object('ok', false, 'error', 'attrs_tidak_valid'); end if; else at := a.attrs; end if;
  if p_patch ? 'status' and (p_patch->>'status') not in ('active','inactive','archived') then return jsonb_build_object('ok', false, 'error', 'status_tidak_valid'); end if;
  update public.assets set
    name = left(trim(coalesce(nullif(p_patch->>'name',''), name)), 120),
    description = case when p_patch ? 'description' then left(nullif(p_patch->>'description',''), 500) else description end,
    category_id = c.id, package_types = (select array_agg(distinct x order by x) from unnest(pkgs) x),
    theme_key = case when p_patch ? 'theme_key' then nullif(lower(trim(p_patch->>'theme_key')), '') else theme_key end,
    tags = case when p_patch ? 'tags' then coalesce((select array_agg(left(trim(value), 30)) from jsonb_array_elements_text(p_patch->'tags') where trim(value) <> '' limit 20), '{}') else tags end,
    is_transparent = coalesce((p_patch->>'is_transparent')::boolean, is_transparent),
    thumbnail_url = case when p_patch ? 'thumbnail_url' then nullif(p_patch->>'thumbnail_url','') else thumbnail_url end,
    status = coalesce(p_patch->>'status', status), attrs = at
  where id = a.id returning * into a;
  return jsonb_build_object('ok', true, 'asset', to_jsonb(a));
end $$;

create or replace function public.get_template_assets(p_slug text, p_theme text default null) returns jsonb
language sql stable security definer set search_path = public as $$
  with t as (select * from public.templates where slug = p_slug and status = 'published'),
       th as (select th.* from public.themes th join t on true join public.template_themes tt on tt.template_id = t.id and tt.theme_id = th.id and tt.enabled
              where th.slug = p_theme and th.status = 'published'),
       pick as (
         select ta.*, a.file_url, a.file_path as afile_path, a.file_type, a.width, a.height, a.name as aname, a.attrs as aattrs from t
         join public.template_assets ta on ta.template_id = t.id
         join public.assets a on a.id = ta.asset_id and a.deleted_at is null and a.status in ('active','inactive')
         where (ta.theme_id is null and not exists (select 1 from th join public.template_assets x on x.template_id = t.id and x.theme_id = th.id and x.slot_key = ta.slot_key
                                                     join public.assets xa on xa.id = x.asset_id and xa.deleted_at is null and xa.status in ('active','inactive')))
            or ta.theme_id in (select id from th))
  select case when (select count(*) from t) = 0 then null else jsonb_build_object('template', (select slug from t), 'package', (select package_type from t),
      'theme', (select slug from th), 'layout', coalesce((select tt.layout from th join public.template_themes tt on tt.theme_id = th.id and tt.template_id = (select id from t)), '{}'::jsonb) || '{}'::jsonb,
      'base_layout', (select layout from t),
      'assets', coalesce((select jsonb_agg(jsonb_build_object('slot', slot_key, 'section', section, 'position', position, 'config', config, 'url', case when afile_path like 'premium/%' then null else file_url end, 'asset_id', case when afile_path like 'premium/%' then asset_id end, 'premium', (afile_path like 'premium/%'), 'type', file_type, 'width', width, 'height', height, 'name', aname, 'attrs', aattrs) order by position, slot_key) from pick), '[]'::jsonb)) end;
$$;

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
     and a.deleted_at is null and a.status in ('active','inactive') and a.file_path like 'premium/%'
     and coalesce(i.package_type, t.package_type) = any (a.package_types)
     and (ta.theme_id is null or ta.theme_id in (select th.id from public.themes th where th.slug = i.theme_key))
   limit 1;
  return pth;
end $$;

create or replace function public.tpl_readiness(p_id uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare t public.templates; c jsonb := '[]'::jsonb; slots text[]; broken int; wed boolean; hasg boolean; hasb boolean; r int; ro int; tot int; tok int;
begin
  select * into t from public.templates x where x.id = p_id;
  if not found then return null; end if;
  select coalesce(array_agg(distinct ta.slot_key), '{}') into slots from public.template_assets ta join public.assets a on a.id = ta.asset_id
    where ta.template_id = p_id and a.deleted_at is null and a.status in ('active','inactive');
  select count(*) into broken from public.template_assets ta join public.assets a on a.id = ta.asset_id
    where ta.template_id = p_id and (a.deleted_at is not null or a.status not in ('active','inactive'));
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
      into hasg, hasb from public.template_assets ta join public.assets a on a.id = ta.asset_id where ta.template_id = p_id and a.deleted_at is null and a.status in ('active','inactive');
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

create or replace function public.admin_save_template_mapping(p_template uuid, p_theme uuid, p_layout jsonb, p_items jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare t public.templates; it jsonb; a public.assets; n int := 0; keep uuid[] := '{}'; rid uuid; secs jsonb; th public.themes;
begin
  if not public.has_perm('templates.write') then raise exception 'forbidden' using errcode = '42501'; end if;
  select * into t from public.templates where id = p_template for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'template_tidak_ditemukan'); end if;
  if p_theme is not null then
    select * into th from public.themes where id = p_theme;
    if not found then return jsonb_build_object('ok', false, 'error', 'tema_tidak_ditemukan'); end if;
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' then return jsonb_build_object('ok', false, 'error', 'data_tidak_valid'); end if;
  if jsonb_array_length(p_items) > 200 then return jsonb_build_object('ok', false, 'error', 'terlalu_banyak_asset'); end if;
  if p_layout is not null and (jsonb_typeof(p_layout) <> 'object' or pg_column_size(p_layout) > 20000) then return jsonb_build_object('ok', false, 'error', 'layout_tidak_valid'); end if;
  secs := p_layout->'sections';
  if secs is not null and (jsonb_typeof(secs) <> 'array' or jsonb_array_length(secs) > 30) then return jsonb_build_object('ok', false, 'error', 'layout_tidak_valid'); end if;
  for it in select * from jsonb_array_elements(p_items) loop
    if coalesce(it->>'slot_key','') !~ '^[a-z0-9_]{2,40}$' or coalesce(it->>'section','general') !~ '^[a-z0-9_]{2,40}$' then return jsonb_build_object('ok', false, 'error', 'slot_tidak_valid', 'slot', it->>'slot_key'); end if;
    select * into a from public.assets where id = nullif(it->>'asset_id','')::uuid and deleted_at is null
       and (status = 'active' or (status = 'inactive' and exists (select 1 from public.template_assets ex where ex.template_id = t.id and ex.asset_id = nullif(it->>'asset_id','')::uuid and ex.slot_key = it->>'slot_key')));
    if not found then return jsonb_build_object('ok', false, 'error', 'asset_tidak_tersedia', 'slot', it->>'slot_key'); end if;
    if not (t.package_type = any (a.package_types)) then return jsonb_build_object('ok', false, 'error', 'asset_tidak_kompatibel', 'asset', a.name, 'package', t.package_type); end if;
    if jsonb_typeof(coalesce(it->'config', '{}'::jsonb)) <> 'object' or pg_column_size(coalesce(it->'config', '{}'::jsonb)) > 4096 then return jsonb_build_object('ok', false, 'error', 'config_tidak_valid'); end if;
    insert into public.template_assets (template_id, theme_id, slot_key, section, asset_id, position, config)
    values (t.id, p_theme, it->>'slot_key', coalesce(it->>'section', 'general'), a.id, coalesce((it->>'position')::int, n), coalesce(it->'config', '{}'::jsonb))
    on conflict (template_id, coalesce(theme_id, '00000000-0000-0000-0000-000000000000'::uuid), slot_key, asset_id) do update set section = excluded.section, position = excluded.position, config = excluded.config
    returning id into rid;
    keep := array_append(keep, rid); n := n + 1;
  end loop;
  -- hapus hanya relasi pada cakupan yang sama (umum atau tema ini); file asli tidak disentuh
  delete from public.template_assets where template_id = t.id and theme_id is not distinct from p_theme and not (id = any (keep));
  if p_theme is null then
    if p_layout is not null then update public.templates set layout = p_layout where id = t.id; end if;
  else
    insert into public.template_themes (template_id, theme_id, layout) values (t.id, p_theme, coalesce(p_layout, '{}'::jsonb))
    on conflict (template_id, theme_id) do update set layout = case when p_layout is null then public.template_themes.layout else excluded.layout end;
  end if;
  return jsonb_build_object('ok', true, 'count', n);
end $$;

-- 9. Hak eksekusi
do $$ declare f text; begin
  foreach f in array array['admin_asset_set_meta(uuid,jsonb)','admin_asset_restore_version(uuid,int)','admin_asset_detail(uuid)','admin_asset_duplicates()','admin_assets_bulk(uuid[],text,jsonb,boolean)'] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
  revoke all on function public.asset_brief(public.assets), public.assets_defaults(), public.assets_v1(), public.asset_usage_trg() from public, anon, authenticated;
  grant execute on function public.admin_update_asset(uuid,jsonb), public.admin_save_template_mapping(uuid,uuid,jsonb,jsonb) to authenticated;
  grant execute on function public.get_template_assets(text, text) to anon, authenticated;
end $$;
