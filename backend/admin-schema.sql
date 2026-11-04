-- NusaMora: skema Admin Dashboard + RBAC. Jalankan SETELAH supabase-schema.sql dan dashboard-schema.sql.
-- Penegakan akses ada di database (RLS), bukan hanya di tampilan: tanpa peran admin, browser tidak bisa membaca/menulis tabel admin.

----------------------------------------------------------------------------- 1. Peran & izin
create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('super_admin','admin','finance','support','content')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create table if not exists public.role_permissions (
  role text not null check (role in ('super_admin','admin','finance','support','content')),
  permission text not null,
  primary key (role, permission)
);

-- seed izin: <modul>.read / <modul>.write
insert into public.role_permissions (role, permission)
select r, m || '.' || a from
  (values ('dashboard'),('customers'),('invitations'),('templates'),('live'),('transactions'),('plans'),('content'),('affiliate'),('support'),('reports'),('notifications'),('settings'),('admins')) mods(m),
  (values ('read'),('write')) acts(a),
  (values ('super_admin')) roles(r)
on conflict do nothing;

insert into public.role_permissions (role, permission) values
 ('admin','dashboard.read'),('admin','customers.read'),('admin','customers.write'),('admin','invitations.read'),('admin','invitations.write'),
 ('admin','templates.read'),('admin','templates.write'),('admin','live.read'),('admin','live.write'),('admin','transactions.read'),
 ('admin','plans.read'),('admin','plans.write'),('admin','content.read'),('admin','content.write'),('admin','affiliate.read'),
 ('admin','support.read'),('admin','support.write'),('admin','reports.read'),('admin','notifications.read'),('admin','notifications.write'),('admin','settings.read'),
 ('finance','dashboard.read'),('finance','customers.read'),('finance','transactions.read'),('finance','transactions.write'),('finance','plans.read'),
 ('finance','affiliate.read'),('finance','affiliate.write'),('finance','reports.read'),
 ('support','dashboard.read'),('support','customers.read'),('support','invitations.read'),('support','support.read'),('support','support.write'),('support','content.read'),('support','notifications.read'),
 ('content','dashboard.read'),('content','templates.read'),('content','templates.write'),('content','content.read'),('content','content.write'),('content','live.read'),('content','live.write'),('content','plans.read')
on conflict do nothing;

create or replace function public.has_perm(p text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.admin_users a
    where a.user_id = auth.uid() and a.active
      and (a.role = 'super_admin' or exists (select 1 from public.role_permissions r where r.role = a.role and r.permission = p))
  );
$$;

create or replace function public.my_admin() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce((
    select jsonb_build_object('role', a.role, 'perms',
      coalesce((select jsonb_agg(r.permission) from public.role_permissions r where r.role = a.role), '[]'::jsonb))
    from public.admin_users a where a.user_id = auth.uid() and a.active
  ), 'null'::jsonb);
$$;

----------------------------------------------------------------------------- 2. Kolom tambahan pada tabel yang sudah ada
alter table public.profiles add column if not exists status text not null default 'aktif' check (status in ('aktif','suspended'));
alter table public.invitations add column if not exists expires_at timestamptz;
alter table public.invitations add column if not exists moderation text not null default 'ok' check (moderation in ('ok','flagged','takedown'));
alter table public.invitations add column if not exists moderation_note text;
alter table public.invoices add column if not exists midtrans_order_id text;
alter table public.invoices add column if not exists midtrans_status text;
alter table public.invoices add column if not exists refunded_at timestamptz;
alter table public.invoices add column if not exists refund_note text;
alter table public.invoices drop constraint if exists invoices_status_check;
alter table public.invoices add constraint invoices_status_check check (status in ('menunggu','lunas','gagal','dibatalkan','refund'));

-- FK ke profiles agar admin bisa mengambil nama pelanggan lewat embed (profiles(full_name))
do $$ declare t text; begin
  foreach t in array array['invitations','subscriptions','invoices','bonus_history','withdrawals'] loop
    if not exists (select 1 from pg_constraint where conname = t || '_profile_fk') then
      execute format('alter table public.%I add constraint %I foreign key (user_id) references public.profiles(id) on delete cascade', t, t || '_profile_fk');
    end if;
  end loop;
end $$;

----------------------------------------------------------------------------- 3. Tabel admin
create table if not exists public.event_categories (
  id uuid primary key default gen_random_uuid(), name text not null, slug text not null unique,
  active boolean not null default true, sort int not null default 0, created_at timestamptz not null default now());

create table if not exists public.templates (
  id uuid primary key default gen_random_uuid(), slug text not null unique, name text not null,
  category_id uuid references public.event_categories(id) on delete set null,
  description text, thumbnail_url text, preview_url text,
  price bigint not null default 0 check (price >= 0), min_plan text check (min_plan is null or min_plan in ('essential','signature','luxe')),
  status text not null default 'draft' check (status in ('draft','published','archived')), sort int not null default 0,
  created_at timestamptz not null default now());

create table if not exists public.live_assets (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('avatar','background','asset3d','area','theme')),
  name text not null, theme text, url text, config text,
  active boolean not null default true, sort int not null default 0, created_at timestamptz not null default now());

create table if not exists public.plans (
  id text primary key check (id in ('essential','signature','luxe')), name text not null,
  price bigint not null check (price >= 0), duration_days int not null check (duration_days > 0),
  gallery_limit int not null check (gallery_limit >= 0), template_quota int, features text,
  active boolean not null default true, sort int not null default 0);
insert into public.plans (id, name, price, duration_days, gallery_limit, template_quota, features, sort) values
 ('essential','Essential',79000,90,10,null,'RSVP dan ucapan, musik latar, tanpa watermark',1),
 ('signature','Signature',149000,180,20,null,'RSVP dan ucapan, musik latar, tanpa watermark, 2x revisi minor, dukungan',2),
 ('luxe','Luxe',249000,365,40,null,'RSVP dan ucapan, musik latar, tanpa watermark, revisi wajar, dukungan',3)
on conflict do nothing;

create table if not exists public.contents (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('banner','faq','tutorial','article','page')),
  title text not null, slug text, body text, image_url text, link_url text,
  seo_title text, seo_description text,
  status text not null default 'draft' check (status in ('draft','published','archived')), sort int not null default 0,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now());

create table if not exists public.affiliates (
  id uuid primary key default gen_random_uuid(), user_id uuid not null unique references public.profiles(id) on delete cascade,
  code text not null unique, status text not null default 'pending' check (status in ('pending','aktif','suspended')),
  created_at timestamptz not null default now());
create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(), affiliate_id uuid not null references public.affiliates(id) on delete cascade,
  referred_user_id uuid references public.profiles(id) on delete set null, status text not null default 'terdaftar' check (status in ('terdaftar','berbayar','batal')),
  commission bigint not null default 0 check (commission >= 0), created_at timestamptz not null default now());

create table if not exists public.tickets (
  id uuid primary key default gen_random_uuid(), user_id uuid references public.profiles(id) on delete set null,
  subject text not null, category text not null default 'bantuan' check (category in ('bantuan','pembayaran','teknis','komplain','lainnya')),
  priority text not null default 'normal' check (priority in ('rendah','normal','tinggi')),
  status text not null default 'open' check (status in ('open','diproses','selesai','ditutup')),
  message text, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists public.ticket_replies (
  id uuid primary key default gen_random_uuid(), ticket_id uuid not null references public.tickets(id) on delete cascade,
  author_id uuid references auth.users(id) on delete set null, is_staff boolean not null default false,
  body text not null, created_at timestamptz not null default now());

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(), title text not null, body text not null,
  channel text not null default 'system' check (channel in ('system','email','whatsapp')),
  audience text not null default 'semua' check (audience in ('semua','pelanggan_aktif','affiliate','admin')),
  status text not null default 'draft' check (status in ('draft','terjadwal','terkirim')),
  scheduled_at timestamptz, created_at timestamptz not null default now());

create table if not exists public.app_settings (key text primary key, value jsonb not null default '""'::jsonb, updated_at timestamptz not null default now());

create table if not exists public.audit_logs (
  id bigint generated always as identity primary key, actor_id uuid, action text not null, table_name text, row_id text,
  summary jsonb, created_at timestamptz not null default now());
create index if not exists audit_logs_time_idx on public.audit_logs (created_at desc);

----------------------------------------------------------------------------- 4. Audit otomatis (trigger, tidak bisa dipalsukan dari klien)
create or replace function public.audit_row() returns trigger
language plpgsql security definer set search_path = public as $$
declare j jsonb; o jsonb; diff jsonb := '{}'::jsonb; k text;
begin
  if auth.uid() is null or not exists (select 1 from public.admin_users where user_id = auth.uid() and active) then
    return coalesce(new, old);
  end if;
  if tg_op = 'DELETE' then j := to_jsonb(old); else j := to_jsonb(new); end if;
  if tg_op = 'UPDATE' then
    o := to_jsonb(old);
    for k in select jsonb_object_keys(j) loop
      if j->k is distinct from o->k then diff := diff || jsonb_build_object(k, jsonb_build_array(o->k, j->k)); end if;
    end loop;
  else diff := j; end if;
  insert into public.audit_logs (actor_id, action, table_name, row_id, summary)
  values (auth.uid(), lower(tg_op), tg_table_name, coalesce(j->>'id', j->>'key', j->>'user_id'), case when length(diff::text) > 4000 then jsonb_build_object('truncated', true) else diff end);
  return coalesce(new, old);
end $$;

do $$ declare t text; begin
  foreach t in array array['event_categories','templates','live_assets','plans','contents','affiliates','referrals','tickets','ticket_replies','announcements','app_settings','admin_users','role_permissions','invitations','invoices','subscriptions','withdrawals','bonus_history'] loop
    execute format('drop trigger if exists audit_%1$s on public.%1$I', t);
    execute format('create trigger audit_%1$s after insert or update or delete on public.%1$I for each row execute function public.audit_row()', t);
  end loop;
end $$;

-- ledger bonus: setiap catatan bonus menyesuaikan saldo pelanggan
create or replace function public.bonus_apply() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.wallets (user_id, bonus_balance) values (new.user_id, greatest(0, new.amount))
  on conflict (user_id) do update set bonus_balance = greatest(0, public.wallets.bonus_balance + new.amount);
  return new;
end $$;
drop trigger if exists bonus_apply_trg on public.bonus_history;
create trigger bonus_apply_trg after insert on public.bonus_history for each row execute function public.bonus_apply();

----------------------------------------------------------------------------- 5. RLS
do $$
declare r record;
begin
  for r in select * from (values
    ('event_categories','templates'),('templates','templates'),('live_assets','live'),('plans','plans'),('contents','content'),
    ('affiliates','affiliate'),('referrals','affiliate'),('tickets','support'),('ticket_replies','support'),('announcements','notifications'),
    ('app_settings','settings'),('admin_users','admins'),('role_permissions','admins'),
    ('invitations','invitations'),('invoices','transactions'),('subscriptions','customers'),('withdrawals','affiliate')
  ) as x(t, m) loop
    execute format('alter table public.%I enable row level security', r.t);
    execute format('drop policy if exists "admin baca" on public.%I', r.t);
    execute format('drop policy if exists "admin tambah" on public.%I', r.t);
    execute format('drop policy if exists "admin ubah" on public.%I', r.t);
    execute format('drop policy if exists "admin hapus" on public.%I', r.t);
    execute format('create policy "admin baca" on public.%I for select using (public.has_perm(%L))', r.t, r.m || '.read');
    execute format('create policy "admin tambah" on public.%I for insert with check (public.has_perm(%L))', r.t, r.m || '.write');
    execute format('create policy "admin ubah" on public.%I for update using (public.has_perm(%L)) with check (public.has_perm(%L))', r.t, r.m || '.write', r.m || '.write');
    execute format('create policy "admin hapus" on public.%I for delete using (public.has_perm(%L))', r.t, r.m || '.write');
  end loop;
end $$;

-- tabel khusus: hanya baca / hanya tambah (ledger & log tidak bisa diubah dari klien)
alter table public.audit_logs enable row level security;
drop policy if exists "admin baca" on public.audit_logs;
create policy "admin baca" on public.audit_logs for select using (public.has_perm('admins.read'));
alter table public.bonus_history enable row level security;
drop policy if exists "admin baca" on public.bonus_history; drop policy if exists "admin tambah" on public.bonus_history;
create policy "admin baca" on public.bonus_history for select using (public.has_perm('affiliate.read'));
create policy "admin tambah" on public.bonus_history for insert with check (public.has_perm('affiliate.write'));
drop policy if exists "admin baca" on public.wallets;
create policy "admin baca" on public.wallets for select using (public.has_perm('customers.read'));
drop policy if exists "admin baca" on public.profiles;
create policy "admin baca" on public.profiles for select using (public.has_perm('customers.read'));
-- admin dapat membaca sebagian akun milik sendiri sebagai admin
drop policy if exists "admin lihat diri" on public.admin_users;
create policy "admin lihat diri" on public.admin_users for select using (user_id = auth.uid());

-- konten publik (untuk landing page nanti): hanya yang berstatus published/aktif
do $$ begin
  drop policy if exists "publik baca" on public.templates;     create policy "publik baca" on public.templates for select to anon, authenticated using (status = 'published');
  drop policy if exists "publik baca" on public.contents;      create policy "publik baca" on public.contents for select to anon, authenticated using (status = 'published');
  drop policy if exists "publik baca" on public.plans;         create policy "publik baca" on public.plans for select to anon, authenticated using (active);
  drop policy if exists "publik baca" on public.event_categories; create policy "publik baca" on public.event_categories for select to anon, authenticated using (active);
end $$;

----------------------------------------------------------------------------- 6. Fungsi admin (RPC)
create or replace function public.admin_list_customers() returns table (
  id uuid, email text, full_name text, whatsapp text, status text, created_at timestamptz, last_sign_in_at timestamptz, plan text, plan_expires timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.has_perm('customers.read') then raise exception 'forbidden' using errcode = '42501'; end if;
  return query
    select p.id, u.email::text, p.full_name, p.whatsapp, p.status, p.created_at, u.last_sign_in_at,
           s.plan, s.expires_at
    from public.profiles p join auth.users u on u.id = p.id
    left join lateral (select plan, expires_at from public.subscriptions x where x.user_id = p.id and x.status = 'aktif' order by x.expires_at desc limit 1) s on true
    order by p.created_at desc limit 5000;
end $$;

create or replace function public.admin_set_customer_status(uid uuid, s text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.has_perm('customers.write') then raise exception 'forbidden' using errcode = '42501'; end if;
  if s not in ('aktif','suspended') then raise exception 'status tidak valid'; end if;
  if uid = auth.uid() then raise exception 'tidak dapat mengubah status akun sendiri'; end if;
  update public.profiles set status = s where id = uid;
  insert into public.audit_logs (actor_id, action, table_name, row_id, summary) values (auth.uid(), 'status_pelanggan', 'profiles', uid::text, jsonb_build_object('status', s));
end $$;

create or replace function public.admin_add_admin(p_email text, p_role text) returns void
language plpgsql security definer set search_path = public as $$
declare uid uuid;
begin
  if not public.has_perm('admins.write') then raise exception 'forbidden' using errcode = '42501'; end if;
  select id into uid from auth.users where lower(email) = lower(p_email);
  if uid is null then raise exception 'Pengguna dengan email itu belum terdaftar'; end if;
  insert into public.admin_users (user_id, role, active) values (uid, p_role, true)
  on conflict (user_id) do update set role = excluded.role, active = true;
end $$;

create or replace function public.admin_list_admins() returns table (user_id uuid, email text, role text, active boolean, created_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.has_perm('admins.read') then raise exception 'forbidden' using errcode = '42501'; end if;
  return query select a.user_id, u.email::text, a.role, a.active, a.created_at from public.admin_users a join auth.users u on u.id = a.user_id order by a.created_at;
end $$;

create or replace function public.admin_stats(months int default 6) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare res jsonb;
begin
  if not public.has_perm('dashboard.read') then raise exception 'forbidden' using errcode = '42501'; end if;
  select jsonb_build_object(
    'customers', (select count(*) from public.profiles),
    'invitations', (select count(*) from public.invitations),
    'transactions', (select count(*) from public.invoices),
    'revenue', coalesce((select sum(amount) from public.invoices where status = 'lunas'), 0),
    'pending', (select count(*) from public.invoices where status = 'menunggu'),
    'open_tickets', (select count(*) from public.tickets where status in ('open','diproses')),
    'series', coalesce((select jsonb_agg(x order by x.m) from (
        select to_char(g, 'YYYY-MM') as m,
          (select count(*) from public.profiles p where date_trunc('month', p.created_at) = g) as customers,
          (select count(*) from public.invitations i where date_trunc('month', i.created_at) = g) as invitations,
          coalesce((select sum(v.amount) from public.invoices v where v.status = 'lunas' and date_trunc('month', coalesce(v.paid_at, v.created_at)) = g), 0) as revenue
        from generate_series(date_trunc('month', now()) - make_interval(months => greatest(months,1) - 1), date_trunc('month', now()), interval '1 month') g) x), '[]'::jsonb)
  ) into res;
  return res;
end $$;

create or replace function public.admin_reports(months int default 6) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare res jsonb;
begin
  if not public.has_perm('reports.read') then raise exception 'forbidden' using errcode = '42501'; end if;
  select jsonb_build_object(
    'customers', (select count(*) from public.profiles),
    'paying', (select count(distinct user_id) from public.invoices where status = 'lunas'),
    'guests', coalesce((select sum(guest_count) from public.invitations), 0),
    'wishes', coalesce((select sum(wish_count) from public.invitations), 0),
    'top_templates', coalesce((select jsonb_agg(t) from (select coalesce(template_id, '(tanpa template)') as template, count(*) as n from public.invitations group by 1 order by n desc limit 8) t), '[]'::jsonb),
    'by_plan', coalesce((select jsonb_agg(t) from (select plan, count(*) as n from public.subscriptions group by 1 order by n desc) t), '[]'::jsonb),
    'tx_status', coalesce((select jsonb_agg(t) from (select status, count(*) as n, coalesce(sum(amount),0) as total from public.invoices group by 1) t), '[]'::jsonb),
    'series', public.admin_stats(months) -> 'series'
  ) into res;
  return res;
end $$;

revoke execute on function public.my_admin(), public.admin_list_customers(), public.admin_set_customer_status(uuid,text),
  public.admin_add_admin(text,text), public.admin_list_admins(), public.admin_stats(int), public.admin_reports(int) from public, anon;
grant execute on function public.my_admin(), public.admin_list_customers(), public.admin_set_customer_status(uuid,text),
  public.admin_add_admin(text,text), public.admin_list_admins(), public.admin_stats(int), public.admin_reports(int) to authenticated;
-- has_perm dievaluasi di dalam policy RLS untuk semua peran (termasuk anon); untuk anon hasilnya selalu false
grant execute on function public.has_perm(text) to anon, authenticated;

----------------------------------------------------------------------------- 7. Storage (thumbnail, logo, aset)
insert into storage.buckets (id, name, public) values ('site-assets', 'site-assets', true) on conflict (id) do nothing;
drop policy if exists "site-assets baca" on storage.objects;
create policy "site-assets baca" on storage.objects for select using (bucket_id = 'site-assets');
drop policy if exists "site-assets tulis" on storage.objects;
create policy "site-assets tulis" on storage.objects for insert to authenticated with check (bucket_id = 'site-assets' and (public.has_perm('templates.write') or public.has_perm('content.write') or public.has_perm('live.write') or public.has_perm('settings.write')));
drop policy if exists "site-assets ubah" on storage.objects;
create policy "site-assets ubah" on storage.objects for update to authenticated using (bucket_id = 'site-assets' and (public.has_perm('templates.write') or public.has_perm('content.write') or public.has_perm('live.write') or public.has_perm('settings.write')));
drop policy if exists "site-assets hapus" on storage.objects;
create policy "site-assets hapus" on storage.objects for delete to authenticated using (bucket_id = 'site-assets' and (public.has_perm('templates.write') or public.has_perm('content.write') or public.has_perm('live.write') or public.has_perm('settings.write')));

----------------------------------------------------------------------------- 8. Admin pertama (JALANKAN MANUAL, ganti emailnya, setelah akun itu terdaftar lewat /daftar)
-- insert into public.admin_users (user_id, role) select id, 'super_admin' from auth.users where email = 'EMAIL_ANDA@contoh.com';
