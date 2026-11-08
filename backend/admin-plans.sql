-- NusaMora Admin: Paket & Harga (menu G). Jalankan SETELAH package-schema.sql (dan admin-transactions.sql). ADITIF dan aman diulang.
-- Tiga paket tetap (essential / signature / luxe). Harga resmi = plans.price (IDR, satu-satunya yang ditagih Midtrans).
-- Harga mata uang lain hanya TAMPILAN. Diskon / harga khusus otomatis berlaku sesuai jadwal dan dihitung di server saat checkout.
-- PERINGATAN: menjalankan ulang package-schema.sql sesudah file ini mengembalikan prepare_checkout lama (tanpa diskon). Jalankan file ini lagi sesudahnya.

----------------------------------------------------------------------------- 1. Kolom baru pada plans
alter table public.plans add column if not exists description text;
alter table public.plans add column if not exists upload_max_mb numeric(3,1) not null default 3;
alter table public.plans add column if not exists live_max_guests int;
alter table public.plans add column if not exists live_max_rooms int;
alter table public.plans add column if not exists updated_at timestamptz not null default now();
alter table public.plans add column if not exists updated_by uuid;
alter table public.plans drop constraint if exists plans_upload_max_check;
alter table public.plans add constraint plans_upload_max_check check (upload_max_mb >= 0.5 and upload_max_mb <= 3);
alter table public.plans drop constraint if exists plans_live_limits_check;
alter table public.plans add constraint plans_live_limits_check check ((live_max_guests is null or live_max_guests >= 1) and (live_max_rooms is null or live_max_rooms >= 1));

----------------------------------------------------------------------------- 2. Harga mata uang lain (tampilan), diskon / harga khusus, riwayat
create table if not exists public.plan_prices (
  plan_id text not null references public.plans(id) on delete cascade,
  currency text not null check (currency in ('USD','SGD','MYR','EUR','AUD','GBP','JPY')),
  amount numeric(14,2) not null check (amount > 0),
  active boolean not null default true,
  updated_at timestamptz not null default now(), updated_by uuid,
  primary key (plan_id, currency)
);
create table if not exists public.plan_discounts (
  id uuid primary key default gen_random_uuid(),
  plan_id text not null references public.plans(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 80),
  kind text not null check (kind in ('percent','fixed','special')),
  value numeric(14,2) not null check (value > 0),
  starts_at timestamptz not null, ends_at timestamptz not null check (ends_at > starts_at),
  active boolean not null default true,
  note text check (note is null or char_length(note) <= 300),
  created_by uuid, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists plan_discounts_plan_idx on public.plan_discounts (plan_id, starts_at);
create table if not exists public.plan_changes (
  id bigint generated always as identity primary key,
  plan_id text not null,
  scope text not null check (scope in ('paket','mata_uang','diskon')),
  field text not null, old_value text, new_value text, note text,
  actor_id uuid, actor_name text, at timestamptz not null default now()
);
create index if not exists plan_changes_idx on public.plan_changes (plan_id, at desc);
alter table public.payments add column if not exists base_amount bigint;
alter table public.payments add column if not exists discount_id uuid;
alter table public.payments add column if not exists discount_name text;

alter table public.plan_prices enable row level security;
alter table public.plan_discounts enable row level security;
alter table public.plan_changes enable row level security;
drop policy if exists "admin baca" on public.plan_prices;    create policy "admin baca" on public.plan_prices for select using (public.has_perm('plans.read'));
drop policy if exists "admin baca" on public.plan_discounts; create policy "admin baca" on public.plan_discounts for select using (public.has_perm('plans.read'));
drop policy if exists "admin baca" on public.plan_changes;   create policy "admin baca" on public.plan_changes for select using (public.has_perm('plans.read'));
revoke all on public.plan_prices, public.plan_discounts, public.plan_changes from anon, authenticated;
grant select on public.plan_prices, public.plan_discounts, public.plan_changes to authenticated;
-- perubahan paket hanya lewat fungsi di bawah (tervalidasi dan tercatat)
revoke insert, update, delete on public.plans from authenticated;
grant select on public.plans to authenticated;

----------------------------------------------------------------------------- 3. Harga efektif (diskon otomatis sesuai jadwal)
create or replace function public.plan_effective(p_plan text)
returns table (base bigint, price bigint, discount_id uuid, discount_name text, discount_kind text, discount_value numeric, ends_at timestamptz)
language sql stable set search_path = public as $$
  select p.price,
         case when d.id is null then p.price
              when d.kind = 'percent' then greatest(1, round(p.price * (100 - d.value) / 100))::bigint
              when d.kind = 'fixed' then greatest(1, p.price - round(d.value))::bigint
              else least(p.price, greatest(1, round(d.value)))::bigint end,
         d.id, d.name, d.kind, d.value, d.ends_at
    from public.plans p
    left join lateral (select * from public.plan_discounts x where x.plan_id = p.id and x.active and now() >= x.starts_at and now() < x.ends_at order by x.starts_at desc limit 1) d on true
   where p.id = p_plan
$$;

-- daftar paket publik: harga efektif + harga asli + harga mata uang lain + fitur + batas
create or replace function public.public_plans() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', p.id, 'name', p.name, 'description', p.description, 'sort', p.sort,
    'price', e.price, 'base_price', e.base, 'currency', 'IDR',
    'discount', case when e.discount_id is null then null else jsonb_build_object('name', e.discount_name, 'kind', e.discount_kind, 'value', e.discount_value, 'ends_at', e.ends_at) end,
    'prices', coalesce((select jsonb_object_agg(x.currency, x.amount) from public.plan_prices x where x.plan_id = p.id and x.active), '{}'::jsonb),
    'duration_days', p.duration_days, 'gallery_limit', p.gallery_limit, 'upload_max_mb', p.upload_max_mb,
    'live_max_guests', p.live_max_guests, 'live_max_rooms', p.live_max_rooms,
    'allow_3d', p.allow_3d, 'allow_live_guest', p.allow_live_guest,
    'features', coalesce((select jsonb_agg(f) from unnest(regexp_split_to_array(coalesce(p.features, ''), '\s*[\n,]\s*')) f where btrim(f) <> ''), '[]'::jsonb)
  ) order by p.sort), '[]'::jsonb)
  from public.plans p cross join lateral public.plan_effective(p.id) e where p.active
$$;

----------------------------------------------------------------------------- 4. Validasi diskon (dipakai trigger dan fungsi admin)
create or replace function public.plan_discount_issue(p_id uuid, p_plan text, p_kind text, p_value numeric, p_start timestamptz, p_end timestamptz, p_active boolean)
returns text language plpgsql stable set search_path = public as $$
declare base bigint;
begin
  select price into base from public.plans where id = p_plan;
  if base is null then return 'paket_tidak_valid'; end if;
  if p_kind not in ('percent','fixed','special') then return 'jenis_tidak_valid'; end if;
  if p_value is null or p_value <= 0 then return 'nilai_tidak_valid'; end if;
  if p_kind = 'percent' and p_value >= 100 then return 'persen_tidak_valid'; end if;
  if p_kind in ('fixed','special') and p_value >= base then return 'nilai_melebihi_harga'; end if;
  if p_end <= p_start then return 'tanggal_tidak_valid'; end if;
  if p_active and exists (select 1 from public.plan_discounts x where x.plan_id = p_plan and x.active and (p_id is null or x.id <> p_id) and tstzrange(x.starts_at, x.ends_at) && tstzrange(p_start, p_end)) then return 'diskon_bertabrakan'; end if;
  return null;
end $$;

create or replace function public.plan_discounts_guard() returns trigger language plpgsql as $$
declare e text;
begin
  e := public.plan_discount_issue(new.id, new.plan_id, new.kind, new.value, new.starts_at, new.ends_at, new.active);
  if e is not null then raise exception '%', e; end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists plan_discounts_guard_trg on public.plan_discounts;
create trigger plan_discounts_guard_trg before insert or update on public.plan_discounts for each row execute function public.plan_discounts_guard();

----------------------------------------------------------------------------- 5. Riwayat perubahan harga dan paket
create or replace function public.plan_log_row(p_plan text, p_scope text, p_field text, p_old text, p_new text) returns void
language plpgsql security definer set search_path = public as $$
declare u uuid := auth.uid(); nm text;
begin
  if p_old is not distinct from p_new then return; end if;
  select coalesce(nullif(pr.full_name, ''), au.email) into nm from auth.users au left join public.profiles pr on pr.id = au.id where au.id = u;
  insert into public.plan_changes (plan_id, scope, field, old_value, new_value, note, actor_id, actor_name)
  values (p_plan, p_scope, p_field, p_old, p_new, nullif(current_setting('nm.plan_note', true), ''), u, coalesce(nm, 'sistem'));
end $$;
revoke execute on function public.plan_log_row(text,text,text,text,text) from public, anon, authenticated;

create or replace function public.plans_log() returns trigger language plpgsql security definer set search_path = public as $$
declare k text; o jsonb := to_jsonb(old); n jsonb := to_jsonb(new);
begin
  for k in select jsonb_object_keys(n) loop
    if k in ('updated_at','updated_by') then continue; end if;
    if o -> k is distinct from n -> k then perform public.plan_log_row(new.id, 'paket', k, o ->> k, n ->> k); end if;
  end loop;
  return new;
end $$;
drop trigger if exists plans_log_trg on public.plans;
create trigger plans_log_trg after update on public.plans for each row execute function public.plans_log();

create or replace function public.plan_prices_log() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'DELETE' then perform public.plan_log_row(old.plan_id, 'mata_uang', old.currency, old.amount::text, null);
  elsif tg_op = 'INSERT' then perform public.plan_log_row(new.plan_id, 'mata_uang', new.currency, null, new.amount::text || case when new.active then '' else ' (nonaktif)' end);
  else perform public.plan_log_row(new.plan_id, 'mata_uang', new.currency, old.amount::text || case when old.active then '' else ' (nonaktif)' end, new.amount::text || case when new.active then '' else ' (nonaktif)' end); end if;
  return null;
end $$;
drop trigger if exists plan_prices_log_trg on public.plan_prices;
create trigger plan_prices_log_trg after insert or update or delete on public.plan_prices for each row execute function public.plan_prices_log();

create or replace function public.plan_discounts_log() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'DELETE' then
    perform public.plan_log_row(old.plan_id, 'diskon', old.name, old.kind || ' ' || old.value, null);
  elsif tg_op = 'INSERT' then
    perform public.plan_log_row(new.plan_id, 'diskon', new.name, null, new.kind || ' ' || new.value || ' (' || to_char(new.starts_at at time zone 'Asia/Jakarta', 'YYYY-MM-DD') || ' s/d ' || to_char(new.ends_at at time zone 'Asia/Jakarta', 'YYYY-MM-DD') || ')');
  else
    perform public.plan_log_row(new.plan_id, 'diskon', new.name,
      old.kind || ' ' || old.value || ' (' || to_char(old.starts_at at time zone 'Asia/Jakarta', 'YYYY-MM-DD') || ' s/d ' || to_char(old.ends_at at time zone 'Asia/Jakarta', 'YYYY-MM-DD') || ')' || case when old.active then '' else ' nonaktif' end,
      new.kind || ' ' || new.value || ' (' || to_char(new.starts_at at time zone 'Asia/Jakarta', 'YYYY-MM-DD') || ' s/d ' || to_char(new.ends_at at time zone 'Asia/Jakarta', 'YYYY-MM-DD') || ')' || case when new.active then '' else ' nonaktif' end);
  end if;
  return null;
end $$;
drop trigger if exists plan_discounts_log_trg on public.plan_discounts;
create trigger plan_discounts_log_trg after insert or update or delete on public.plan_discounts for each row execute function public.plan_discounts_log();

----------------------------------------------------------------------------- 6. Fungsi admin
create or replace function public.admin_plans_overview() returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.has_perm('plans.read') then raise exception 'forbidden' using errcode = '42501'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object(
    'plan', to_jsonb(p), 'effective_price', e.price, 'discount_active', e.discount_name,
    'prices', coalesce((select jsonb_agg(to_jsonb(x) order by x.currency) from public.plan_prices x where x.plan_id = p.id), '[]'::jsonb),
    'discounts', coalesce((select jsonb_agg(to_jsonb(d) || jsonb_build_object('used', (select count(*) from public.payments py where py.discount_id = d.id), 'running', d.active and now() >= d.starts_at and now() < d.ends_at) order by d.starts_at desc) from public.plan_discounts d where d.plan_id = p.id), '[]'::jsonb),
    'stats', jsonb_build_object(
      'active_invitations', (select count(*) from public.invitations i where i.status = 'aktif' and coalesce(i.package_type, i.plan_id) = p.id),
      'paid_count', (select count(*) from public.payments y where y.plan_id = p.id and y.status = 'paid'),
      'paid_30d', (select count(*) from public.payments y where y.plan_id = p.id and y.status = 'paid' and y.paid_at >= now() - interval '30 days'),
      'revenue', (select coalesce(sum(y.amount), 0) from public.payments y where y.plan_id = p.id and y.status = 'paid'))
  ) order by p.sort) from public.plans p cross join lateral public.plan_effective(p.id) e), '[]'::jsonb);
end $$;

create or replace function public.admin_plan_save(p_id text, p_patch jsonb, p_note text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare cur public.plans; k text; v jsonb; nn text := btrim(coalesce(p_note, '')); np bigint; bad int;
begin
  if not public.has_perm('plans.write') then raise exception 'forbidden' using errcode = '42501'; end if;
  select * into cur from public.plans where id = p_id for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'paket_tidak_valid'); end if;
  if jsonb_typeof(p_patch) <> 'object' then return jsonb_build_object('ok', false, 'error', 'data_tidak_valid'); end if;
  for k in select jsonb_object_keys(p_patch) loop
    if k not in ('name','description','price','duration_days','gallery_limit','upload_max_mb','live_max_guests','live_max_rooms','template_quota','features','active','sort') then return jsonb_build_object('ok', false, 'error', 'kolom_tidak_diizinkan'); end if;
  end loop;
  if p_patch ? 'name' and char_length(btrim(p_patch ->> 'name')) not between 2 and 40 then return jsonb_build_object('ok', false, 'error', 'nama_tidak_valid'); end if;
  if p_patch ? 'description' and char_length(coalesce(p_patch ->> 'description', '')) > 300 then return jsonb_build_object('ok', false, 'error', 'deskripsi_terlalu_panjang'); end if;
  if p_patch ? 'features' and char_length(coalesce(p_patch ->> 'features', '')) > 1500 then return jsonb_build_object('ok', false, 'error', 'fitur_terlalu_panjang'); end if;
  if p_patch ? 'price' then
    if jsonb_typeof(p_patch -> 'price') <> 'number' or (p_patch ->> 'price')::numeric <> trunc((p_patch ->> 'price')::numeric) or (p_patch ->> 'price')::numeric < 1000 or (p_patch ->> 'price')::numeric > 1000000000 then return jsonb_build_object('ok', false, 'error', 'harga_tidak_valid'); end if;
    np := (p_patch ->> 'price')::bigint;
    if np <> cur.price and char_length(nn) < 3 then return jsonb_build_object('ok', false, 'error', 'alasan_harga_wajib'); end if;
    if exists (select 1 from public.plan_discounts d where d.plan_id = p_id and d.active and d.ends_at > now() and d.kind in ('fixed','special') and d.value >= np) then return jsonb_build_object('ok', false, 'error', 'harga_di_bawah_diskon'); end if;
  end if;
  if p_patch ? 'duration_days' and (jsonb_typeof(p_patch -> 'duration_days') <> 'number' or (p_patch ->> 'duration_days')::numeric not between 1 and 3650 or (p_patch ->> 'duration_days')::numeric <> trunc((p_patch ->> 'duration_days')::numeric)) then return jsonb_build_object('ok', false, 'error', 'durasi_tidak_valid'); end if;
  if p_patch ? 'gallery_limit' and (jsonb_typeof(p_patch -> 'gallery_limit') <> 'number' or (p_patch ->> 'gallery_limit')::numeric not between 0 and 200 or (p_patch ->> 'gallery_limit')::numeric <> trunc((p_patch ->> 'gallery_limit')::numeric)) then return jsonb_build_object('ok', false, 'error', 'galeri_tidak_valid'); end if;
  if p_patch ? 'upload_max_mb' and (jsonb_typeof(p_patch -> 'upload_max_mb') <> 'number' or (p_patch ->> 'upload_max_mb')::numeric not between 0.5 and 3) then return jsonb_build_object('ok', false, 'error', 'ukuran_tidak_valid'); end if;
  foreach k in array array['live_max_guests','live_max_rooms','template_quota'] loop
    if p_patch ? k and jsonb_typeof(p_patch -> k) <> 'null' and (jsonb_typeof(p_patch -> k) <> 'number' or (p_patch ->> k)::numeric not between 1 and 100000 or (p_patch ->> k)::numeric <> trunc((p_patch ->> k)::numeric)) then return jsonb_build_object('ok', false, 'error', case when k = 'template_quota' then 'kuota_tidak_valid' else 'batas_live_tidak_valid' end); end if;
  end loop;
  if p_patch ? 'sort' and (jsonb_typeof(p_patch -> 'sort') <> 'number' or (p_patch ->> 'sort')::numeric not between 0 and 1000) then return jsonb_build_object('ok', false, 'error', 'urutan_tidak_valid'); end if;
  if p_patch ? 'active' and jsonb_typeof(p_patch -> 'active') <> 'boolean' then return jsonb_build_object('ok', false, 'error', 'data_tidak_valid'); end if;
  if (p_patch ? 'active' and (p_patch ->> 'active')::boolean = false and cur.active) and (select count(*) from public.plans where active and id <> p_id) = 0 then return jsonb_build_object('ok', false, 'error', 'paket_terakhir_aktif'); end if;

  perform set_config('nm.plan_note', nn, true);
  update public.plans set
    name = case when p_patch ? 'name' then btrim(p_patch ->> 'name') else name end,
    description = case when p_patch ? 'description' then nullif(btrim(p_patch ->> 'description'), '') else description end,
    price = case when p_patch ? 'price' then (p_patch ->> 'price')::bigint else price end,
    duration_days = case when p_patch ? 'duration_days' then (p_patch ->> 'duration_days')::int else duration_days end,
    gallery_limit = case when p_patch ? 'gallery_limit' then (p_patch ->> 'gallery_limit')::int else gallery_limit end,
    upload_max_mb = case when p_patch ? 'upload_max_mb' then (p_patch ->> 'upload_max_mb')::numeric else upload_max_mb end,
    live_max_guests = case when p_patch ? 'live_max_guests' then (p_patch ->> 'live_max_guests')::int else live_max_guests end,
    live_max_rooms = case when p_patch ? 'live_max_rooms' then (p_patch ->> 'live_max_rooms')::int else live_max_rooms end,
    template_quota = case when p_patch ? 'template_quota' then (p_patch ->> 'template_quota')::int else template_quota end,
    features = case when p_patch ? 'features' then nullif(btrim(p_patch ->> 'features'), '') else features end,
    active = case when p_patch ? 'active' then (p_patch ->> 'active')::boolean else active end,
    sort = case when p_patch ? 'sort' then (p_patch ->> 'sort')::int else sort end,
    updated_at = now(), updated_by = auth.uid()
  where id = p_id;
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.admin_plan_price_set(p_plan text, p_currency text, p_amount numeric, p_active boolean default true, p_note text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not public.has_perm('plans.write') then raise exception 'forbidden' using errcode = '42501'; end if;
  if not exists (select 1 from public.plans where id = p_plan) then return jsonb_build_object('ok', false, 'error', 'paket_tidak_valid'); end if;
  if p_currency not in ('USD','SGD','MYR','EUR','AUD','GBP','JPY') then return jsonb_build_object('ok', false, 'error', 'mata_uang_tidak_valid'); end if;
  perform set_config('nm.plan_note', btrim(coalesce(p_note, '')), true);
  if p_amount is null then delete from public.plan_prices where plan_id = p_plan and currency = p_currency; return jsonb_build_object('ok', true); end if;
  if p_amount <= 0 or p_amount > 100000000000 or (p_currency = 'JPY' and p_amount <> trunc(p_amount)) then return jsonb_build_object('ok', false, 'error', 'jumlah_tidak_valid'); end if;
  insert into public.plan_prices (plan_id, currency, amount, active, updated_by) values (p_plan, p_currency, round(p_amount, 2), coalesce(p_active, true), auth.uid())
  on conflict (plan_id, currency) do update set amount = excluded.amount, active = excluded.active, updated_at = now(), updated_by = auth.uid();
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.admin_discount_save(p_id uuid, p_data jsonb, p_note text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare cur public.plan_discounts; v_plan text; v_kind text; val numeric; s timestamptz; e timestamptz; act boolean; nm text; nt text; iss text; nid uuid;
begin
  if not public.has_perm('plans.write') then raise exception 'forbidden' using errcode = '42501'; end if;
  if jsonb_typeof(p_data) <> 'object' then return jsonb_build_object('ok', false, 'error', 'data_tidak_valid'); end if;
  if p_id is not null then select * into cur from public.plan_discounts where id = p_id for update; if not found then return jsonb_build_object('ok', false, 'error', 'tidak_ditemukan'); end if; end if;
  begin
    v_plan := coalesce(p_data ->> 'plan_id', cur.plan_id); v_kind := coalesce(p_data ->> 'kind', cur.kind); val := coalesce((p_data ->> 'value')::numeric, cur.value);
    s := coalesce((p_data ->> 'starts_at')::timestamptz, cur.starts_at); e := coalesce((p_data ->> 'ends_at')::timestamptz, cur.ends_at);
  exception when others then return jsonb_build_object('ok', false, 'error', 'data_tidak_valid'); end;
  act := coalesce((p_data ->> 'active')::boolean, cur.active, true); nm := btrim(coalesce(p_data ->> 'name', cur.name, ''));
  nt := case when p_data ? 'note' then nullif(btrim(p_data ->> 'note'), '') else cur.note end;
  if p_id is not null and v_plan <> cur.plan_id then return jsonb_build_object('ok', false, 'error', 'paket_tidak_dapat_diubah'); end if;
  if char_length(nm) not between 2 and 80 then return jsonb_build_object('ok', false, 'error', 'nama_tidak_valid'); end if;
  if nt is not null and char_length(nt) > 300 then return jsonb_build_object('ok', false, 'error', 'catatan_terlalu_panjang'); end if;
  if s is null or e is null then return jsonb_build_object('ok', false, 'error', 'tanggal_tidak_valid'); end if;
  iss := public.plan_discount_issue(p_id, v_plan, v_kind, val, s, e, act);
  if iss is not null then return jsonb_build_object('ok', false, 'error', iss); end if;
  perform set_config('nm.plan_note', btrim(coalesce(p_note, '')), true);
  if p_id is null then insert into public.plan_discounts (plan_id, name, kind, value, starts_at, ends_at, active, note, created_by) values (v_plan, nm, v_kind, val, s, e, act, nt, auth.uid()) returning id into nid;
  else update public.plan_discounts set name = nm, kind = v_kind, value = val, starts_at = s, ends_at = e, active = act, note = nt where id = p_id; nid := p_id; end if;
  return jsonb_build_object('ok', true, 'id', nid);
end $$;

create or replace function public.admin_discount_delete(p_id uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not public.has_perm('plans.write') then raise exception 'forbidden' using errcode = '42501'; end if;
  if exists (select 1 from public.payments where discount_id = p_id) then return jsonb_build_object('ok', false, 'error', 'sudah_dipakai'); end if;
  delete from public.plan_discounts where id = p_id;
  if not found then return jsonb_build_object('ok', false, 'error', 'tidak_ditemukan'); end if;
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.admin_plan_history(p_plan text default null, p_limit int default 100) returns setof public.plan_changes
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.has_perm('plans.read') then raise exception 'forbidden' using errcode = '42501'; end if;
  return query select * from public.plan_changes where p_plan is null or plan_id = p_plan order by at desc, id desc limit least(greatest(coalesce(p_limit, 100), 1), 500);
end $$;

----------------------------------------------------------------------------- 7. Checkout memakai harga efektif (diskon otomatis); selain itu identik dengan package-schema.sql
create or replace function public.prepare_checkout(p_user uuid, p_invitation uuid, p_plan text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare i public.invitations; pl public.plans; pend public.payments; oid text; inv_id uuid; miss text[]; pay public.payments; eff text; v_email text; v_name text; cancel_order text; fp record;
begin
  select * into i from public.invitations where id = p_invitation and user_id = p_user for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'tidak_ditemukan'); end if;
  if exists (select 1 from public.profiles where id = p_user and status = 'suspended') then return jsonb_build_object('ok', false, 'error', 'akun_ditangguhkan'); end if;
  perform public.expire_stale_payments(p_user);
  select * into i from public.invitations where id = p_invitation;
  eff := coalesce(i.package_type, p_plan);      -- paket ditentukan saat undangan dibuat; p_plan dari klien hanya dipakai untuk undangan lama tanpa paket
  if i.moderation = 'takedown' then return jsonb_build_object('ok', false, 'error', 'tidak_dapat_dipublikasi'); end if;
  if i.status = 'aktif' and (i.expires_at is null or i.expires_at > now()) then return jsonb_build_object('ok', false, 'error', 'sudah_aktif'); end if;
  if i.status not in ('draft', 'menunggu_pembayaran') then return jsonb_build_object('ok', false, 'error', 'tidak_dapat_dipublikasi'); end if;
  select * into pl from public.plans where id = eff and active;
  if not found then return jsonb_build_object('ok', false, 'error', 'paket_tidak_valid'); end if;
  select * into fp from public.plan_effective(eff);
  if fp.price is null or fp.price <= 0 then return jsonb_build_object('ok', false, 'error', 'harga_tidak_valid'); end if;
  miss := public.publish_issues(i, eff);
  if array_length(miss, 1) > 0 then return jsonb_build_object('ok', false, 'error', 'data_belum_lengkap', 'missing', to_jsonb(miss)); end if;

  select u.email into v_email from auth.users u where u.id = p_user;
  select pr.full_name into v_name from public.profiles pr where pr.id = p_user;

  select * into pend from public.payments where invitation_id = p_invitation and status = 'pending' for update;
  if found then
    if pend.plan_id = eff and pend.expires_at > now() then
      return jsonb_build_object('ok', true, 'reuse', true, 'order_id', pend.order_id, 'amount', pend.amount, 'plan_id', pend.plan_id, 'plan_name', pl.name,
        'duration_days', pend.duration_days, 'experience', pend.experience, 'snap_token', pend.snap_token, 'redirect_url', pend.redirect_url,
        'expires_at', pend.expires_at, 'title', i.title, 'email', v_email, 'name', v_name);
    end if;
    -- ganti paket: pembayaran lama dibatalkan (Edge Function juga membatalkannya di Midtrans)
    cancel_order := pend.order_id;
    update public.payments set status = 'cancelled', note = 'ganti_paket', updated_at = now() where id = pend.id;
    update public.invoices set status = 'dibatalkan' where id = pend.invoice_id and status = 'menunggu';
    insert into public.payment_events (order_id, event_key, source, transaction_status, result) values (pend.order_id, pend.order_id || '|ganti-paket', 'user', 'cancel', 'applied') on conflict do nothing;
  end if;

  oid := 'NM' || to_char(now() at time zone 'utc', 'YYMMDDHH24MISS') || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
  insert into public.invoices (user_id, number, description, amount, status, midtrans_order_id)
  values (p_user, 'INV-' || to_char(now() at time zone 'utc', 'YYMMDD') || '-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6)),
          'Paket ' || pl.name || ' - ' || i.title || case when fp.discount_id is not null then ' (promo ' || fp.discount_name || ')' else '' end, fp.price, 'menunggu', oid) returning id into inv_id;
  insert into public.payments (order_id, user_id, invitation_id, invoice_id, plan_id, amount, duration_days, experience, status, expires_at)
  values (oid, p_user, p_invitation, inv_id, eff, fp.price, pl.duration_days, public.plan_experience(eff), 'pending', now() + interval '24 hours') returning * into pay;
  update public.payments set base_amount = fp.base, discount_id = fp.discount_id, discount_name = fp.discount_name where id = pay.id returning * into pay;
  update public.invitations set status = 'menunggu_pembayaran', updated_at = now() where id = p_invitation;
  insert into public.payment_events (order_id, event_key, source, transaction_status, result) values (oid, oid || '|dibuat', 'system', 'created', 'applied') on conflict do nothing;

  return jsonb_build_object('ok', true, 'reuse', false, 'order_id', oid, 'amount', pay.amount, 'plan_id', eff, 'plan_name', pl.name, 'duration_days', pay.duration_days,
    'experience', pay.experience, 'expires_at', pay.expires_at, 'title', i.title, 'email', v_email, 'name', v_name, 'cancel_order', cancel_order);
end $$;

----------------------------------------------------------------------------- 8. Hak eksekusi
revoke execute on function public.prepare_checkout(uuid,uuid,text) from public, anon, authenticated;
grant execute on function public.prepare_checkout(uuid,uuid,text) to service_role;
revoke execute on function public.admin_plans_overview(), public.admin_plan_save(text,jsonb,text), public.admin_plan_price_set(text,text,numeric,boolean,text),
  public.admin_discount_save(uuid,jsonb,text), public.admin_discount_delete(uuid), public.admin_plan_history(text,int) from public, anon;
grant execute on function public.admin_plans_overview(), public.admin_plan_save(text,jsonb,text), public.admin_plan_price_set(text,text,numeric,boolean,text),
  public.admin_discount_save(uuid,jsonb,text), public.admin_discount_delete(uuid), public.admin_plan_history(text,int) to authenticated;
grant execute on function public.public_plans() to anon, authenticated;
grant execute on function public.plan_effective(text) to service_role, authenticated;
