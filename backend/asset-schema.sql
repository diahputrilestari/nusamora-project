-- NusaMora: Theme & Asset Management (Asset Library + Template Asset Mapping + AI generator)
-- Jalankan SETELAH package-schema.sql. Aman dijalankan ulang (idempotent). Tidak mengubah tabel/fitur yang sudah ada.
-- Izin memakai modul 'templates' (templates.read / templates.write), jadi matriks peran tidak berubah.

-- ============================================================ 1. Kategori asset per paket
create table if not exists public.asset_categories (
  id uuid primary key default gen_random_uuid(),
  package_type text not null check (package_type in ('essential','signature','luxe')),
  slug text not null check (slug ~ '^[a-z0-9-]{2,40}$'),
  name text not null,
  kind text not null check (kind in ('image','vector','animation','model','texture','hdr','audio','data')),
  allowed_ext text[] not null check (cardinality(allowed_ext) > 0),
  max_bytes bigint not null default 10485760 check (max_bytes between 1024 and 104857600),
  sort int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (package_type, slug)
);

insert into public.asset_categories (package_type, slug, name, kind, allowed_ext, max_bytes, sort) values
 -- Essential: undangan 2D
 ('essential','background','Background','image','{png,jpg,jpeg,webp}',10485760,10),
 ('essential','character','Character illustration','image','{png,webp,svg}',10485760,20),
 ('essential','floral','Floral decoration','image','{png,webp,svg}',10485760,30),
 ('essential','ornament','Ornament','image','{png,webp,svg}',10485760,40),
 ('essential','frame','Border / frame','image','{png,webp,svg}',10485760,50),
 ('essential','wedding-objects','Wedding objects','image','{png,webp,svg}',10485760,60),
 ('essential','section-decoration','Section decoration','image','{png,jpg,jpeg,webp,svg}',10485760,70),
 ('essential','animation','Animation','animation','{gif,json,webp}',10485760,80),
 -- Signature: 3D cinematic
 ('signature','environment-3d','3D environment','model','{glb,gltf}',52428800,10),
 ('signature','character-3d','3D character','model','{glb,gltf}',52428800,20),
 ('signature','venue-3d','Wedding venue','model','{glb,gltf}',52428800,30),
 ('signature','decoration-3d','3D decoration','model','{glb,gltf}',52428800,40),
 ('signature','furniture-3d','Furniture','model','{glb,gltf}',52428800,50),
 ('signature','camera-animation','Camera animation','data','{json,glb,gltf}',20971520,60),
 ('signature','particle-effects','Particle effects','image','{png,webp,json}',10485760,70),
 ('signature','background-music','Background music','audio','{mp3,ogg,wav}',20971520,80),
 ('signature','texture','Texture','texture','{png,jpg,jpeg,webp}',20971520,90),
 ('signature','hdr-environment','HDR environment','hdr','{hdr}',31457280,100),
 ('signature','image-assets','Image assets','image','{png,jpg,jpeg,webp}',10485760,110),
 -- Luxe: 3D Live Guest
 ('luxe','virtual-environment','Virtual environment','model','{glb,gltf,png,jpg,jpeg,webp}',52428800,10),
 ('luxe','guest-avatar','Guest avatars','model','{glb,gltf}',52428800,20),
 ('luxe','couple-avatar','Bride and groom avatars','model','{glb,gltf}',52428800,30),
 ('luxe','interactive-objects','Interactive objects','model','{glb,gltf}',52428800,40),
 ('luxe','venue-decoration','Venue decorations','model','{glb,gltf,png,webp}',52428800,50),
 ('luxe','minigame-assets','Mini game assets','model','{glb,gltf,png,webp,json}',52428800,60),
 ('luxe','ui-icons','UI icons','vector','{svg,png,webp}',2097152,70),
 ('luxe','furniture-3d','3D furniture','model','{glb,gltf}',52428800,80),
 ('luxe','audio','Audio','audio','{mp3,ogg,wav}',20971520,90),
 ('luxe','particle-effects','Particle effects','image','{png,webp,json}',10485760,100),
 ('luxe','texture','Texture','texture','{png,jpg,jpeg,webp}',20971520,110),
 ('luxe','hdr-environment','HDR environment','hdr','{hdr}',31457280,120)
on conflict (package_type, slug) do nothing;
-- Luxe > Virtual environment juga menerima gambar latar (PNG/JPG/WebP), bukan hanya model 3D. Menyusul untuk database yang sudah terisi.
update public.asset_categories set allowed_ext = '{glb,gltf,png,jpg,jpeg,webp}' where package_type = 'luxe' and slug = 'virtual-environment' and not ('png' = any (allowed_ext));
-- Luxe: avatar, objek interaktif, furniture boleh berupa ilustrasi 2D (png/jpg/webp) yang ditampilkan sebagai billboard 3D.
update public.asset_categories set allowed_ext = '{glb,gltf,png,jpg,jpeg,webp}'
 where package_type = 'luxe' and slug in ('guest-avatar','couple-avatar','interactive-objects','furniture-3d') and not ('png' = any (allowed_ext));
update public.asset_categories set allowed_ext = '{glb,gltf,png,jpg,jpeg,webp}'
 where package_type = 'luxe' and slug = 'venue-decoration' and not ('jpg' = any (allowed_ext));

-- ============================================================ 2. Asset Library
create table if not exists public.assets (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  description text check (description is null or char_length(description) <= 500),
  category_id uuid not null references public.asset_categories(id),
  package_types text[] not null check (cardinality(package_types) > 0 and package_types <@ array['essential','signature','luxe']),
  theme_key text check (theme_key is null or theme_key ~ '^[a-z0-9-]{2,60}$'),
  file_path text not null unique,
  file_url text not null,
  thumbnail_url text,
  file_type text not null,
  mime text,
  file_size bigint not null check (file_size > 0),
  width int check (width is null or width > 0),
  height int check (height is null or height > 0),
  tags text[] not null default '{}' check (cardinality(tags) <= 20),
  is_transparent boolean not null default false,
  checksum text check (checksum is null or checksum ~ '^[0-9a-f]{64}$'),
  status text not null default 'active' check (status in ('active','archived')),
  deleted_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- file yang sama (isi identik) hanya boleh terdaftar sekali: gunakan ulang lewat relasi
create unique index if not exists assets_checksum_uq on public.assets (checksum) where deleted_at is null and checksum is not null;
create index if not exists assets_cat_idx on public.assets (category_id) where deleted_at is null;
create index if not exists assets_theme_idx on public.assets (theme_key) where deleted_at is null;
create index if not exists assets_pkg_idx on public.assets using gin (package_types);

-- ============================================================ 3. Relasi template <-> asset (slot fleksibel)
alter table public.templates add column if not exists layout jsonb not null default '{}'::jsonb;

-- Tema = set aset yang dipasang ke template universal sebuah paket (mis. Batak, Keraton). Satu tema bisa dipakai di beberapa paket.
create table if not exists public.themes (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,60}$'),
  name text not null check (char_length(name) between 2 and 80),
  description text check (description is null or char_length(description) <= 500),
  thumbnail_url text, preview_url text,
  categories text[] not null default '{}',                    -- kategori acara yang cocok; kosong = semua kategori template
  status text not null default 'draft' check (status in ('draft','published','archived')),
  sort int not null default 0,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
-- tema aktif untuk sebuah template (tema bisa dimatikan per template tanpa menghapus asetnya)
create table if not exists public.template_themes (
  template_id uuid not null references public.templates(id) on delete cascade,
  theme_id uuid not null references public.themes(id) on delete cascade,
  enabled boolean not null default true,
  layout jsonb not null default '{}'::jsonb,                  -- konfigurasi section khusus tema ini
  sort int not null default 0,
  primary key (template_id, theme_id)
);

-- theme_id NULL = aset umum template (berlaku untuk semua tema); terisi = hanya untuk tema itu (menimpa slot yang sama)
create table if not exists public.template_assets (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.templates(id) on delete cascade,
  theme_id uuid references public.themes(id) on delete cascade,
  slot_key text not null check (slot_key ~ '^[a-z0-9_]{2,40}$'),
  section text not null default 'general' check (section ~ '^[a-z0-9_]{2,40}$'),
  asset_id uuid not null references public.assets(id) on delete restrict,
  position int not null default 0 check (position between 0 and 1000),
  config jsonb not null default '{}'::jsonb check (jsonb_typeof(config) = 'object' and pg_column_size(config) <= 4096),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists template_assets_uq on public.template_assets (template_id, coalesce(theme_id, '00000000-0000-0000-0000-000000000000'::uuid), slot_key, asset_id);
create index if not exists template_assets_tpl_idx on public.template_assets (template_id, theme_id, position);
create index if not exists template_assets_asset_idx on public.template_assets (asset_id);

-- ============================================================ 4. AI Asset Generator (riwayat + varian)
create table if not exists public.asset_generations (
  id uuid primary key default gen_random_uuid(),
  requested_by uuid references auth.users(id) on delete set null,
  package_type text not null check (package_type in ('essential','signature','luxe')),
  theme_key text, category_id uuid references public.asset_categories(id),
  prompt text not null check (char_length(prompt) between 3 and 2000),
  provider text, count int not null default 1 check (count between 1 and 8),
  status text not null default 'pending' check (status in ('pending','done','failed')),
  error text, created_at timestamptz not null default now(), finished_at timestamptz
);
create table if not exists public.asset_variants (
  id uuid primary key default gen_random_uuid(),
  generation_id uuid not null references public.asset_generations(id) on delete cascade,
  file_path text not null, file_url text not null,
  selected boolean not null default false,
  asset_id uuid references public.assets(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists asset_variants_gen_idx on public.asset_variants (generation_id);

-- ============================================================ 5. RLS: hanya admin berizin templates.*
do $$ declare t text; begin
  foreach t in array array['asset_categories','assets','template_assets','asset_generations','asset_variants','themes','template_themes'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "admin baca" on public.%I', t);
    execute format('create policy "admin baca" on public.%I for select to authenticated using (public.has_perm(''templates.read''))', t);
  end loop;
end $$;
-- kategori boleh diatur admin; aset/relasi/generasi HANYA lewat RPC (tidak ada policy tulis langsung)
drop policy if exists "admin tulis" on public.asset_categories;
create policy "admin tulis" on public.asset_categories for all to authenticated using (public.has_perm('templates.write')) with check (public.has_perm('templates.write'));
-- tema: admin kelola langsung; publik hanya membaca tema yang sudah dipublikasikan (untuk langkah 'Pilih Template' pelanggan)
drop policy if exists "admin tulis" on public.themes;
create policy "admin tulis" on public.themes for all to authenticated using (public.has_perm('templates.write')) with check (public.has_perm('templates.write'));
drop policy if exists "publik baca" on public.themes;
create policy "publik baca" on public.themes for select to anon, authenticated using (status = 'published');
drop policy if exists "admin tulis" on public.template_themes;
create policy "admin tulis" on public.template_themes for all to authenticated using (public.has_perm('templates.write')) with check (public.has_perm('templates.write'));
drop policy if exists "publik baca" on public.template_themes;
create policy "publik baca" on public.template_themes for select to anon, authenticated using (enabled and exists (select 1 from public.themes th where th.id = theme_id and th.status = 'published'));
revoke insert, update, delete on public.assets, public.template_assets, public.asset_generations, public.asset_variants from anon, authenticated;
revoke all on public.assets, public.template_assets, public.asset_generations, public.asset_variants, public.asset_categories from anon;

create or replace function public.touch_updated() returns trigger language plpgsql as $$ begin new.updated_at := now(); return new; end $$;
drop trigger if exists assets_touch on public.assets; create trigger assets_touch before update on public.assets for each row execute function public.touch_updated();
drop trigger if exists themes_touch on public.themes; create trigger themes_touch before update on public.themes for each row execute function public.touch_updated();
drop trigger if exists template_assets_touch on public.template_assets; create trigger template_assets_touch before update on public.template_assets for each row execute function public.touch_updated();

-- ============================================================ 6. Storage: bucket theme-assets
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('theme-assets', 'theme-assets', true, 52428800, array['image/png','image/jpeg','image/webp','image/gif','image/svg+xml','application/json','model/gltf-binary','model/gltf+json','audio/mpeg','audio/ogg','audio/wav','audio/x-wav','image/vnd.radiance','application/octet-stream'])
on conflict (id) do update set file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
drop policy if exists "theme-assets baca" on storage.objects;
-- TIDAK untuk publik: URL objek bucket publik dilayani tanpa kebijakan SELECT, sedangkan SELECT publik membuka list() (enumerasi). Lihat content-protection.sql.
create policy "theme-assets baca" on storage.objects for select to authenticated using (bucket_id = 'theme-assets' and (public.has_perm('templates.read') or public.has_perm('templates.write')));
drop policy if exists "theme-assets tulis" on storage.objects;
create policy "theme-assets tulis" on storage.objects for insert to authenticated with check (bucket_id = 'theme-assets' and public.has_perm('templates.write') and name ~ '^(incoming|generated)/');
drop policy if exists "theme-assets hapus" on storage.objects;
create policy "theme-assets hapus" on storage.objects for delete to authenticated using (bucket_id = 'theme-assets' and public.has_perm('templates.write') and name ~ '^incoming/');

-- ============================================================ 7. RPC
create or replace function public.has_perm_user(uid uuid, p text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admin_users a where a.user_id = uid and a.active
    and (a.role = 'super_admin' or exists (select 1 from public.role_permissions r where r.role = a.role and r.permission = p)));
$$;
revoke execute on function public.has_perm_user(uuid, text) from public, anon, authenticated;
grant execute on function public.has_perm_user(uuid, text) to service_role;

create or replace function public.asset_mime_ok(p_ext text, p_mime text) returns boolean language sql immutable as $$
  select case p_ext
    when 'png' then p_mime = 'image/png' when 'jpg' then p_mime = 'image/jpeg' when 'jpeg' then p_mime = 'image/jpeg'
    when 'webp' then p_mime = 'image/webp' when 'gif' then p_mime = 'image/gif' when 'svg' then p_mime = 'image/svg+xml'
    when 'json' then p_mime in ('application/json','text/plain') when 'glb' then p_mime in ('model/gltf-binary','application/octet-stream')
    when 'gltf' then p_mime in ('model/gltf+json','application/json') when 'mp3' then p_mime in ('audio/mpeg','audio/mp3')
    when 'ogg' then p_mime in ('audio/ogg','application/ogg') when 'wav' then p_mime in ('audio/wav','audio/x-wav','audio/wave')
    when 'hdr' then p_mime in ('image/vnd.radiance','application/octet-stream') else false end;
$$;

-- Pendaftaran asset: HANYA service_role (Edge Function asset-register, yang sudah memeriksa isi file). Memeriksa ulang aturan paket/kategori di DB.
-- Isian khusus paket (mis. peran avatar, collision, bagian undangan). Divalidasi generik: kunci bebas (huruf kecil/angka/_),
-- nilai skalar saja, sehingga isian baru bisa ditambah di konfigurasi form tanpa mengubah SQL.
alter table public.assets add column if not exists attrs jsonb not null default '{}'::jsonb;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'assets_attrs_chk') then
    alter table public.assets add constraint assets_attrs_chk check (jsonb_typeof(attrs) = 'object' and pg_column_size(attrs) <= 2048);
  end if;
end $$;
create or replace function public.asset_attrs_clean(p jsonb) returns jsonb language plpgsql immutable as $$
declare k text; v jsonb; o jsonb := '{}'::jsonb; n int := 0;
begin
  if p is null or p = 'null'::jsonb then return '{}'::jsonb; end if;
  if jsonb_typeof(p) <> 'object' then return null; end if;
  for k, v in select * from jsonb_each(p) loop
    if k !~ '^[a-z][a-z0-9_]{0,29}$' then return null; end if;
    if jsonb_typeof(v) = 'string' then
      if char_length(v #>> '{}') > 80 then return null; end if;
      if v #>> '{}' = '' then continue; end if;
    elsif jsonb_typeof(v) not in ('number','boolean') then
      if jsonb_typeof(v) = 'null' then continue; end if;
      return null;
    end if;
    n := n + 1; if n > 20 then return null; end if;
    o := o || jsonb_build_object(k, v);
  end loop;
  return o;
end $$;

create or replace function public.admin_register_asset(p_user uuid, p_path text, p_name text, p_description text, p_category uuid, p_packages text[], p_theme text, p_tags text[], p_meta jsonb)
returns jsonb language plpgsql security definer set search_path = public, storage as $$
declare c public.asset_categories; ext text := lower(coalesce(p_meta->>'file_type','')); sz bigint := nullif(p_meta->>'size','')::bigint; obj record; dup public.assets; a public.assets;
        pk text; pkgs text[]; url text; at jsonb;
begin
  if not public.has_perm_user(p_user, 'templates.write') then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_path is null or p_path !~ '^(incoming|generated)/[A-Za-z0-9._/-]{3,200}$' or p_path like '%..%' then return jsonb_build_object('ok', false, 'error', 'path_tidak_valid'); end if;
  select * into c from public.asset_categories where id = p_category and active;
  if not found then return jsonb_build_object('ok', false, 'error', 'kategori_tidak_valid'); end if;
  if ext = '' or not (ext = any (c.allowed_ext)) or right(lower(p_path), char_length(ext) + 1) <> '.' || ext then return jsonb_build_object('ok', false, 'error', 'format_tidak_didukung', 'allowed', to_jsonb(c.allowed_ext)); end if;
  if not public.asset_mime_ok(ext, lower(coalesce(p_meta->>'mime',''))) then return jsonb_build_object('ok', false, 'error', 'mime_tidak_sesuai'); end if;
  if sz is null or sz <= 0 or sz > c.max_bytes then return jsonb_build_object('ok', false, 'error', 'ukuran_melebihi_batas', 'max_bytes', c.max_bytes); end if;
  at := public.asset_attrs_clean(p_meta->'attrs');
  if at is null then return jsonb_build_object('ok', false, 'error', 'attrs_tidak_valid'); end if;
  pkgs := coalesce(nullif(p_packages, '{}'), array[c.package_type]);
  if not (c.package_type = any (pkgs)) then pkgs := array_append(pkgs, c.package_type); end if;
  foreach pk in array pkgs loop
    if pk not in ('essential','signature','luxe') then return jsonb_build_object('ok', false, 'error', 'paket_tidak_valid'); end if;
    if not exists (select 1 from public.asset_categories x where x.package_type = pk and x.active and ext = any (x.allowed_ext)) then
      return jsonb_build_object('ok', false, 'error', 'paket_tidak_kompatibel', 'package', pk);
    end if;
  end loop;
  select name, (metadata->>'size')::bigint as size into obj from storage.objects where bucket_id = 'theme-assets' and name = p_path;
  if not found then return jsonb_build_object('ok', false, 'error', 'file_tidak_ditemukan'); end if;
  if obj.size is not null and obj.size <> sz then return jsonb_build_object('ok', false, 'error', 'ukuran_tidak_cocok'); end if;
  select * into dup from public.assets where checksum = p_meta->>'checksum' and deleted_at is null;
  if found then return jsonb_build_object('ok', false, 'error', 'duplikat', 'id', dup.id, 'name', dup.name); end if;
  url := coalesce(p_meta->>'public_base', '') || p_path;
  insert into public.assets (name, description, category_id, package_types, theme_key, file_path, file_url, thumbnail_url, file_type, mime, file_size, width, height, tags, is_transparent, checksum, created_by, attrs)
  values (left(trim(coalesce(nullif(p_name, ''), p_path)), 120), left(p_description, 500), c.id, (select array_agg(distinct x order by x) from unnest(pkgs) x), nullif(lower(trim(p_theme)), ''), p_path, url,
          nullif(p_meta->>'thumbnail_url', ''), ext, lower(p_meta->>'mime'), sz, nullif(p_meta->>'width','')::int, nullif(p_meta->>'height','')::int,
          coalesce((select array_agg(left(trim(t), 30)) from unnest(p_tags) t where trim(t) <> '' limit 20), '{}'), coalesce((p_meta->>'is_transparent')::boolean, false), p_meta->>'checksum', p_user, at)
  returning * into a;
  return jsonb_build_object('ok', true, 'asset', to_jsonb(a));
end $$;
revoke execute on function public.admin_register_asset(uuid,text,text,text,uuid,text[],text,text[],jsonb) from public, anon, authenticated;
grant execute on function public.admin_register_asset(uuid,text,text,text,uuid,text[],text,text[],jsonb) to service_role;

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
  if p_patch ? 'status' and (p_patch->>'status') not in ('active','archived') then return jsonb_build_object('ok', false, 'error', 'status_tidak_valid'); end if;
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

create or replace function public.admin_delete_asset(p_id uuid, p_force boolean default false) returns jsonb
language plpgsql security definer set search_path = public as $$
declare n int; names text[];
begin
  if not public.has_perm('templates.write') then raise exception 'forbidden' using errcode = '42501'; end if;
  if not exists (select 1 from public.assets where id = p_id and deleted_at is null) then return jsonb_build_object('ok', false, 'error', 'tidak_ditemukan'); end if;
  select count(*), coalesce(array_agg(distinct t.name), '{}') into n, names from public.template_assets ta join public.templates t on t.id = ta.template_id where ta.asset_id = p_id;
  if n > 0 and not coalesce(p_force, false) then return jsonb_build_object('ok', false, 'error', 'asset_dipakai', 'count', n, 'templates', to_jsonb(names)); end if;
  delete from public.template_assets where asset_id = p_id;            -- hanya relasi; file asli di storage TIDAK dihapus
  update public.assets set deleted_at = now(), status = 'archived' where id = p_id;   -- soft delete
  return jsonb_build_object('ok', true, 'relations_removed', n);
end $$;

create or replace function public.admin_restore_asset(p_id uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not public.has_perm('templates.write') then raise exception 'forbidden' using errcode = '42501'; end if;
  begin update public.assets set deleted_at = null, status = 'active' where id = p_id and deleted_at is not null;
  exception when unique_violation then return jsonb_build_object('ok', false, 'error', 'duplikat'); end;
  return jsonb_build_object('ok', found);
end $$;

create or replace function public.admin_assets_usage() returns table (asset_id uuid, uses bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.has_perm('templates.read') then raise exception 'forbidden' using errcode = '42501'; end if;
  return query select ta.asset_id, count(*) from public.template_assets ta group by ta.asset_id;
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
    select * into a from public.assets where id = nullif(it->>'asset_id','')::uuid and deleted_at is null and status = 'active';
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

-- Data aset untuk renderer / pratinjau. Aset tema menimpa aset umum pada slot yang sama.
create or replace function public.get_template_assets(p_slug text, p_theme text default null) returns jsonb
language sql stable security definer set search_path = public as $$
  with t as (select * from public.templates where slug = p_slug and status = 'published'),
       th as (select th.* from public.themes th join t on true join public.template_themes tt on tt.template_id = t.id and tt.theme_id = th.id and tt.enabled
              where th.slug = p_theme and th.status = 'published'),
       pick as (
         select ta.*, a.file_url, a.file_path as afile_path, a.file_type, a.width, a.height, a.name as aname, a.attrs as aattrs from t
         join public.template_assets ta on ta.template_id = t.id
         join public.assets a on a.id = ta.asset_id and a.deleted_at is null and a.status = 'active'
         where (ta.theme_id is null and not exists (select 1 from th join public.template_assets x on x.template_id = t.id and x.theme_id = th.id and x.slot_key = ta.slot_key
                                                     join public.assets xa on xa.id = x.asset_id and xa.deleted_at is null and xa.status = 'active'))
            or ta.theme_id in (select id from th))
  select case when (select count(*) from t) = 0 then null else jsonb_build_object('template', (select slug from t), 'package', (select package_type from t),
      'theme', (select slug from th), 'layout', coalesce((select tt.layout from th join public.template_themes tt on tt.theme_id = th.id and tt.template_id = (select id from t)), '{}'::jsonb) || '{}'::jsonb,
      'base_layout', (select layout from t),
      'assets', coalesce((select jsonb_agg(jsonb_build_object('slot', slot_key, 'section', section, 'position', position, 'config', config, 'url', case when afile_path like 'premium/%' then null else file_url end, 'asset_id', case when afile_path like 'premium/%' then asset_id end, 'premium', (afile_path like 'premium/%'), 'type', file_type, 'width', width, 'height', height, 'name', aname, 'attrs', aattrs) order by position, slot_key) from pick), '[]'::jsonb)) end;
$$;

revoke execute on function public.admin_update_asset(uuid,jsonb), public.admin_delete_asset(uuid,boolean), public.admin_restore_asset(uuid), public.admin_assets_usage(), public.admin_save_template_mapping(uuid,uuid,jsonb,jsonb) from public, anon;
grant execute on function public.admin_update_asset(uuid,jsonb), public.admin_delete_asset(uuid,boolean), public.admin_restore_asset(uuid), public.admin_assets_usage(), public.admin_save_template_mapping(uuid,uuid,jsonb,jsonb) to authenticated;
grant execute on function public.get_template_assets(text, text) to anon, authenticated;
grant select on public.asset_categories, public.assets, public.template_assets, public.asset_generations, public.asset_variants to authenticated;
grant select on public.themes, public.template_themes to anon, authenticated;
grant insert, update, delete on public.themes, public.template_themes to authenticated;

-- ============================================================ 7. Tema pada undangan pelanggan (kompatibel mundur)
alter table public.invitations add column if not exists theme_key text;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'invitations_theme_key_chk') then
    alter table public.invitations add constraint invitations_theme_key_chk check (theme_key is null or theme_key ~ '^[a-z0-9-]{2,60}$');
  end if;
end $$;

-- Tema yang boleh dipilih pelanggan untuk template tertentu (hanya tema Published + diaktifkan di template Published).
create or replace function public.get_template_themes(p_templates text[]) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_object_agg(x.slug, x.themes), '{}'::jsonb) from (
    select t.slug, jsonb_agg(jsonb_build_object('slug', th.slug, 'name', th.name, 'description', th.description, 'thumbnail_url', th.thumbnail_url) order by tt.sort, th.sort, th.name) as themes
    from public.templates t
    join public.template_themes tt on tt.template_id = t.id and tt.enabled
    join public.themes th on th.id = tt.theme_id and th.status = 'published'
    where t.slug = any (coalesce(p_templates, '{}')) and t.status = 'published'
    group by t.slug) x
$$;

-- Pelanggan menetapkan tema undangannya sendiri (null = tanpa tema / aset umum).
create or replace function public.set_invitation_theme(p_invitation uuid, p_theme text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); r public.invitations; th text := nullif(lower(trim(coalesce(p_theme, ''))), '');
begin
  if uid is null then raise exception 'unauthorized' using errcode = '28000'; end if;
  select * into r from public.invitations where id = p_invitation and user_id = uid for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'tidak_ditemukan'); end if;
  if r.status not in ('draft','aktif') or r.moderation = 'takedown' then return jsonb_build_object('ok', false, 'error', 'tidak_dapat_diubah'); end if;
  if th is not null and not exists (
      select 1 from public.templates t join public.template_themes tt on tt.template_id = t.id and tt.enabled
      join public.themes x on x.id = tt.theme_id and x.status = 'published'
      where t.slug = r.template_id and x.slug = th) then
    return jsonb_build_object('ok', false, 'error', 'tema_tidak_tersedia');
  end if;
  update public.invitations set theme_key = th where id = r.id;
  return jsonb_build_object('ok', true, 'theme', th);
end $$;

revoke execute on function public.set_invitation_theme(uuid, text) from public, anon;
grant execute on function public.set_invitation_theme(uuid, text) to authenticated;
grant execute on function public.get_template_themes(text[]) to anon, authenticated;

-- ============================================================ 8. AI Asset Generator (tanpa asumsi provider; kunci API hanya di server)
create or replace function public.ai_category(p_id uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select to_jsonb(c) - 'created_at' from public.asset_categories c where c.id = p_id and c.active
$$;

-- Batas harian per admin (40 gambar / 24 jam) agar biaya provider terkendali.
create or replace function public.admin_generation_allowed(p_user uuid, p_count int) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select sum(g.count) from public.asset_generations g where g.requested_by = p_user and g.created_at > now() - interval '1 day'), 0) + coalesce(p_count, 0) <= 40
$$;

create or replace function public.admin_record_generation(p_user uuid, p_package text, p_theme text, p_category uuid, p_prompt text, p_provider text, p_count int, p_status text, p_error text, p_variants jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare gid uuid; v jsonb; vid uuid; outv jsonb := '[]'::jsonb;
begin
  if not public.has_perm_user(p_user, 'templates.write') then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_package not in ('essential','signature','luxe') then return jsonb_build_object('ok', false, 'error', 'paket_tidak_valid'); end if;
  if p_status not in ('done','failed') then return jsonb_build_object('ok', false, 'error', 'status_tidak_valid'); end if;
  insert into public.asset_generations (requested_by, package_type, theme_key, category_id, prompt, provider, count, status, error, finished_at)
  values (p_user, p_package, nullif(p_theme, ''), p_category, left(p_prompt, 2000), left(p_provider, 40), greatest(1, least(8, coalesce(p_count, 1))), p_status, left(p_error, 300), now()) returning id into gid;
  for v in select * from jsonb_array_elements(coalesce(p_variants, '[]'::jsonb)) loop
    insert into public.asset_variants (generation_id, file_path, file_url) values (gid, v->>'file_path', v->>'file_url') returning id into vid;
    outv := outv || jsonb_build_array(jsonb_build_object('id', vid, 'file_path', v->>'file_path', 'file_url', v->>'file_url'));
  end loop;
  return jsonb_build_object('ok', true, 'generation_id', gid, 'variants', outv);
end $$;

-- Menandai varian yang sudah disimpan ke library.
create or replace function public.admin_link_variant(p_variant uuid, p_asset uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not public.has_perm('templates.write') then raise exception 'forbidden' using errcode = '42501'; end if;
  if not exists (select 1 from public.assets where id = p_asset and deleted_at is null) then return jsonb_build_object('ok', false, 'error', 'asset_tidak_tersedia'); end if;
  update public.asset_variants set selected = true, asset_id = p_asset where id = p_variant;
  return jsonb_build_object('ok', found);
end $$;

revoke execute on function public.ai_category(uuid), public.admin_generation_allowed(uuid,int), public.admin_record_generation(uuid,text,text,uuid,text,text,int,text,text,jsonb) from public, anon, authenticated;
grant execute on function public.ai_category(uuid), public.admin_generation_allowed(uuid,int), public.admin_record_generation(uuid,text,text,uuid,text,text,int,text,text,jsonb) to service_role;
revoke execute on function public.admin_link_variant(uuid, uuid) from public, anon;
grant execute on function public.admin_link_variant(uuid, uuid) to authenticated;

-- 9. Sinkron kategori template: template yang dibuat dari dashboard admin (hanya category_id) harus punya categories[]
--    agar muncul di katalog pelanggan (katalog memfilter dengan categories). Idempoten.
update public.templates t set categories = array[c.slug] from public.event_categories c
 where t.category_id = c.id and cardinality(coalesce(t.categories, '{}')) = 0;


-- 10. Avatar mempelai pilihan pelanggan: diambil dari aset yang dipetakan admin pada template + tema undangan.
--     Sisi (groom/bride) ditentukan dari atribut aset: essential character_role pria/wanita, signature model_role
--     mempelai_pria/mempelai_wanita, luxe avatar_role pengantin_pria/pengantin_wanita.
create or replace function public.template_avatar_options(p_slug text, p_theme text default null) returns jsonb
language sql stable security definer set search_path = public as $$
  with g as (select public.get_template_assets(p_slug, p_theme) as j),
  a as (select g.j->>'package' as pkg, x as it from g, jsonb_array_elements(coalesce(g.j->'assets', '[]'::jsonb)) x),
  s as (select pkg, it,
          case when pkg = 'essential' then it#>>'{attrs,character_role}'
               when pkg = 'signature' then it#>>'{attrs,model_role}'
               when pkg = 'luxe' then it#>>'{attrs,avatar_role}' end as role from a),
  m as (select it, case when (pkg = 'essential' and role = 'pria') or (pkg = 'signature' and role = 'mempelai_pria') or (pkg = 'luxe' and role = 'pengantin_pria') then 'groom'
                        when (pkg = 'essential' and role = 'wanita') or (pkg = 'signature' and role = 'mempelai_wanita') or (pkg = 'luxe' and role = 'pengantin_wanita') then 'bride' end as side from s)
  select coalesce(jsonb_agg(jsonb_build_object('slot', it->>'slot', 'side', side, 'name', it->>'name', 'url', it->>'url', 'type', it->>'type', 'width', it->'width', 'height', it->'height')
                            order by it->>'position', it->>'slot'), '[]'::jsonb)
  from m where side is not null
$$;
revoke execute on function public.template_avatar_options(text, text) from public;
grant execute on function public.template_avatar_options(text, text) to anon, authenticated;

-- Kunci konten yang diizinkan per paket: ditambah "avatars" (pilihan avatar mempelai).
create or replace function public.pkg_keys(p text) returns text[] language sql immutable as $$
  select array['names','welcome','event','photos','music','features','gift','avatars'] || case p
    when 'essential' then array['design2d','texts','sections']
    when 'signature' then array['scene','camera','anim','cinematic']
    when 'luxe' then array['scene','venue','live'] else array[]::text[] end
$$;

-- save_invitation: sama dengan versi package-schema.sql, ditambah validasi avatars.groom / avatars.bride
-- (slot harus ada di aset template + tema undangan dan bersisi sesuai; hanya diperiksa bila nilainya berubah).
create or replace function public.save_invitation(p_id uuid, p_title text, p_event_date date, p_content jsonb) returns timestamptz
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); r public.invitations; u text; pref text; g jsonb; caps jsonb; iss text; sd text; v text; ok boolean;
begin
  if uid is null then raise exception 'unauthorized' using errcode = '28000'; end if;
  select * into r from public.invitations where id = p_id and user_id = uid for update;
  if not found then raise exception 'tidak_ditemukan'; end if;
  if r.status not in ('draft','aktif') or r.moderation = 'takedown' then raise exception 'tidak_dapat_diubah'; end if;
  if jsonb_typeof(p_content) <> 'object' or length(p_content::text) > 60000 then raise exception 'konten_tidak_valid'; end if;
  select capabilities into caps from public.templates where slug = r.template_id;
  iss := public.content_issue(r.package_type, coalesce(caps, '{}'::jsonb), p_content);
  if iss is not null then raise exception '%', iss; end if;
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
  if p_content ? 'avatars' then
    if jsonb_typeof(p_content->'avatars') <> 'object' then raise exception 'avatar_tidak_valid'; end if;
    foreach sd in array array['groom','bride'] loop
      v := coalesce(p_content #>> array['avatars', sd], '');
      if v <> '' and v is distinct from coalesce(r.content #>> array['avatars', sd], '') then
        select exists (select 1 from jsonb_array_elements(public.template_avatar_options(r.template_id, r.theme_key)) o where o->>'slot' = v and o->>'side' = sd) into ok;
        if not ok then raise exception 'avatar_tidak_valid'; end if;
      end if;
    end loop;
  end if;
  update public.invitations
     set title = left(coalesce(nullif(trim(p_title), ''), title), 160), event_date = p_event_date, content = p_content, updated_at = now()
   where id = p_id;
  return now();
end $$;
revoke execute on function public.save_invitation(uuid,text,date,jsonb) from public, anon;
grant execute on function public.save_invitation(uuid,text,date,jsonb) to authenticated;
