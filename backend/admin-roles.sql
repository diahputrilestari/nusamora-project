-- NusaMora: Admin & Role (menu N). Aditif dan idempoten. Jalankan SETELAH admin-schema, security-schema, security-mfa (jika dipakai) dan admin-settings.
--
-- Isi:
--  1. Peran fleksibel (admin_roles), izin per menu dan aksi (read / write / delete), preset peran bawaan.
--  2. Pagar keras di database: hanya Super Admin yang boleh mengubah admin/peran/izin; tidak bisa mengubah diri sendiri;
--     Super Admin terakhir tidak bisa dihapus/diturunkan.
--  3. Pembatasan akses berbasis data (admin_scopes): kategori template dan tipe konten (RLS restrictive).
--  4. Riwayat login / sesi admin (IP, perangkat), deteksi IP/perangkat baru, paksa keluar (sesi dicabut di database).
--  5. Batas tidak aktif (idle timeout) opsional, default MATI.
--  6. Audit log: pencarian/filter, tidak bisa diubah dari klien, audit tambahan untuk tabel konfigurasi.
-- Tidak mengaktifkan MFA wajib (security-mfa.sql tetap sesuai keputusan Anda).

----------------------------------------------------------------------------- 0. Prasyarat ringan
create table if not exists public.security_settings (
  key text primary key, value jsonb not null, updated_by uuid, updated_at timestamptz not null default now()
);
alter table public.security_settings enable row level security;
revoke all on public.security_settings from anon, authenticated;

----------------------------------------------------------------------------- 1. Peran
create table if not exists public.admin_roles (
  key text primary key check (key ~ '^[a-z][a-z0-9_]{2,29}$'),
  label text not null check (char_length(label) between 2 and 40),
  description text check (description is null or char_length(description) <= 200),
  is_system boolean not null default false,
  created_at timestamptz not null default now(),
  created_by uuid
);
insert into public.admin_roles (key, label, description, is_system) values
 ('super_admin', 'Super Admin',     'Seluruh platform, konfigurasi, keamanan, dan admin lain.', true),
 ('admin',       'Admin Operasional','Pelanggan, undangan, template, transaksi, dan laporan.', true),
 ('finance',     'Finance',         'Transaksi, paket, dan laporan keuangan.', true),
 ('support',     'Admin Support',   'Customer Support dan komunikasi dengan pelanggan.', true),
 ('content',     'Content Manager', 'Konten, template, dan asset.', true)
on conflict (key) do update set label = excluded.label, is_system = true,
  description = coalesce(public.admin_roles.description, excluded.description);

-- Lepas daftar peran yang dikunci di CHECK lama, ganti dengan FK ke admin_roles (peran kustom bisa dibuat).
do $$ declare c record; begin
  for c in select conrelid::regclass::text as t, conname from pg_constraint
           where contype = 'c' and conrelid in ('public.admin_users'::regclass, 'public.role_permissions'::regclass)
             and pg_get_constraintdef(oid) like '%super_admin%' loop
    execute format('alter table %s drop constraint %I', c.t, c.conname);
  end loop;
  if not exists (select 1 from pg_constraint where conname = 'admin_users_role_fk') then
    alter table public.admin_users add constraint admin_users_role_fk foreign key (role) references public.admin_roles(key) on update cascade;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'role_permissions_role_fk') then
    alter table public.role_permissions add constraint role_permissions_role_fk foreign key (role) references public.admin_roles(key) on update cascade on delete cascade;
  end if;
end $$;

----------------------------------------------------------------------------- 2. Katalog izin (menu x aksi)
create or replace function public.admin_perm_modules() returns text[] language sql immutable as $$
  select array['dashboard','customers','invitations','templates','live','transactions','plans','content','affiliate','support','reports','notifications','settings','admins','dating'] $$;

create or replace function public.admin_perm_valid(p text) returns boolean language sql immutable as $$
  select p ~ '^[a-z]+\.(read|write|delete)$' and split_part(p, '.', 1) = any (public.admin_perm_modules()) $$;

-- Preset peran bawaan (dipakai tombol "Kembalikan ke bawaan"). Peran lama TIDAK diubah otomatis.
create or replace function public.admin_role_preset(p_key text) returns text[] language sql immutable as $$
  select case p_key
    when 'admin' then array['dashboard.read','customers.read','customers.write','invitations.read','invitations.write','templates.read','templates.write','transactions.read','transactions.write','reports.read','plans.read']
    when 'finance' then array['dashboard.read','customers.read','transactions.read','transactions.write','plans.read','affiliate.read','affiliate.write','reports.read']
    when 'support' then array['dashboard.read','customers.read','invitations.read','support.read','support.write','content.read','notifications.read']
    when 'content' then array['dashboard.read','templates.read','templates.write','templates.delete','content.read','content.write','content.delete','live.read','live.write','live.delete','plans.read']
    else null end $$;

-- Aksi hapus: semua peran yang sudah boleh ubah (write) tetap boleh hapus agar perilaku lama tidak berubah; kini bisa dipisah.
insert into public.role_permissions (role, permission)
select role, split_part(permission, '.', 1) || '.delete' from public.role_permissions where permission like '%.write'
on conflict do nothing;
insert into public.role_permissions (role, permission)
select 'super_admin', m || '.delete' from unnest(public.admin_perm_modules()) m on conflict do nothing;

-- Kebijakan hapus tabel admin memakai <menu>.delete (sebelumnya <menu>.write)
do $$ declare r record; begin
  for r in select * from (values
    ('event_categories','templates'),('templates','templates'),('live_assets','live'),('plans','plans'),('contents','content'),
    ('affiliates','affiliate'),('referrals','affiliate'),('tickets','support'),('ticket_replies','support'),('announcements','notifications'),
    ('app_settings','settings'),('admin_users','admins'),('role_permissions','admins'),
    ('invitations','invitations'),('invoices','transactions'),('subscriptions','customers'),('withdrawals','affiliate')) as x(t, m) loop
    if to_regclass('public.' || r.t) is not null then
      execute format('drop policy if exists "admin hapus" on public.%I', r.t);
      execute format('create policy "admin hapus" on public.%I for delete using (public.has_perm(%L))', r.t, r.m || '.delete');
    end if;
  end loop;
end $$;

----------------------------------------------------------------------------- 3. Pagar keras (pemicu)
create or replace function public.admin_is_super() returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admin_users where user_id = auth.uid() and active and role = 'super_admin') $$;
revoke all on function public.admin_is_super() from public, anon;
grant execute on function public.admin_is_super() to authenticated;

-- true hanya untuk permintaan API pengguna (PostgREST: role authenticated/anon dengan JWT). SQL Editor, migrasi, dan service_role dipercaya.
create or replace function public.admin_api_call() returns boolean language sql stable as $$
  select auth.uid() is not null and coalesce(current_setting('role', true), '') in ('authenticated', 'anon') $$;
grant execute on function public.admin_api_call() to anon, authenticated, service_role;

create or replace function public.admin_users_guard() returns trigger language plpgsql security definer set search_path = public as $$
declare n jsonb := case when tg_op = 'DELETE' then null else to_jsonb(new) end;
        o jsonb := case when tg_op = 'INSERT' then null else to_jsonb(old) end;
        v_other int;
begin
  if not public.admin_api_call() then return case when tg_op = 'DELETE' then old else new end; end if;      -- SQL Editor / service_role dipercaya (lihat admin_api_call)
  if not public.admin_is_super() then raise exception 'forbidden' using errcode = '42501'; end if;
  if tg_op = 'UPDATE' and n ->> 'user_id' is distinct from o ->> 'user_id' then raise exception 'user_id_tidak_boleh_diubah'; end if;
  if tg_op in ('UPDATE', 'DELETE') then
    if (o ->> 'user_id')::uuid = auth.uid()
       and (tg_op = 'DELETE' or n ->> 'role' is distinct from o ->> 'role' or (n ->> 'active')::boolean is distinct from (o ->> 'active')::boolean) then
      raise exception 'tidak_boleh_ubah_diri_sendiri';
    end if;
    if o ->> 'role' = 'super_admin' and (o ->> 'active')::boolean
       and (tg_op = 'DELETE' or n ->> 'role' <> 'super_admin' or not (n ->> 'active')::boolean) then
      select count(*) into v_other from public.admin_users where role = 'super_admin' and active and user_id <> (o ->> 'user_id')::uuid;
      if v_other = 0 then raise exception 'super_admin_terakhir'; end if;
    end if;
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end $$;
drop trigger if exists admin_users_guard_trg on public.admin_users;
create trigger admin_users_guard_trg before insert or update or delete on public.admin_users for each row execute function public.admin_users_guard();

create or replace function public.admin_roles_guard() returns trigger language plpgsql security definer set search_path = public as $$
declare n jsonb := case when tg_op = 'DELETE' then null else to_jsonb(new) end;
        o jsonb := case when tg_op = 'INSERT' then null else to_jsonb(old) end;
        k text; v_rp boolean := tg_table_name = 'role_permissions';
begin
  k := case when v_rp then coalesce(n ->> 'role', o ->> 'role') else coalesce(n ->> 'key', o ->> 'key') end;
  if v_rp and tg_op <> 'DELETE' and not public.admin_perm_valid(n ->> 'permission') then raise exception 'izin_tidak_valid'; end if;
  if not public.admin_api_call() then return case when tg_op = 'DELETE' then old else new end; end if;
  if not public.admin_is_super() then raise exception 'forbidden' using errcode = '42501'; end if;
  if k = 'super_admin' then raise exception 'peran_super_admin_terkunci'; end if;
  if not v_rp and tg_op = 'DELETE' and (o ->> 'is_system')::boolean then raise exception 'peran_bawaan_tidak_bisa_dihapus'; end if;
  if not v_rp and tg_op = 'UPDATE' and (n ->> 'key' <> o ->> 'key' or n ->> 'is_system' <> o ->> 'is_system') then raise exception 'peran_tidak_bisa_diubah_kuncinya'; end if;
  if v_rp and tg_op <> 'DELETE' and n ->> 'permission' ~ '^admins\.(write|delete)$' then raise exception 'izin_admins_khusus_super_admin'; end if;
  return case when tg_op = 'DELETE' then old else new end;
end $$;
drop trigger if exists admin_roles_guard_trg on public.admin_roles;
create trigger admin_roles_guard_trg before insert or update or delete on public.admin_roles for each row execute function public.admin_roles_guard();
drop trigger if exists role_permissions_guard_trg on public.role_permissions;
create trigger role_permissions_guard_trg before insert or update or delete on public.role_permissions for each row execute function public.admin_roles_guard();

alter table public.admin_roles enable row level security;
revoke all on public.admin_roles from anon, authenticated;
grant select on public.admin_roles to authenticated;
drop policy if exists "admin baca" on public.admin_roles;
create policy "admin baca" on public.admin_roles for select to authenticated using (public.has_perm('admins.read'));

----------------------------------------------------------------------------- 4. Pembatasan akses berbasis data
create table if not exists public.admin_scopes (
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('template_category', 'content_type')),
  value text not null check (char_length(value) between 1 and 80),
  created_at timestamptz not null default now(),
  primary key (user_id, kind, value)
);
alter table public.admin_scopes enable row level security;
revoke all on public.admin_scopes from anon, authenticated;
grant select on public.admin_scopes to authenticated;
drop policy if exists "admin baca" on public.admin_scopes;
create policy "admin baca" on public.admin_scopes for select to authenticated using (public.has_perm('admins.read'));

-- true bila pemanggil tidak dibatasi untuk jenis ini, atau nilainya termasuk yang diizinkan
create or replace function public.scope_ok(k text, v text) returns boolean language sql stable security definer set search_path = public as $$
  select auth.uid() is null
      or not exists (select 1 from public.admin_scopes s where s.user_id = auth.uid() and s.kind = k)
      or exists (select 1 from public.admin_scopes s where s.user_id = auth.uid() and s.kind = k and s.value = v) $$;
revoke all on function public.scope_ok(text, text) from public;
grant execute on function public.scope_ok(text, text) to anon, authenticated, service_role;

drop policy if exists "pembatasan data" on public.templates;
create policy "pembatasan data" on public.templates as restrictive for all
  using (public.scope_ok('template_category', category_id::text)) with check (public.scope_ok('template_category', category_id::text));
drop policy if exists "pembatasan data" on public.contents;
create policy "pembatasan data" on public.contents as restrictive for all
  using (public.scope_ok('content_type', type)) with check (public.scope_ok('content_type', type));

----------------------------------------------------------------------------- 5. Sesi & riwayat login admin
create table if not exists public.admin_sessions (
  session_id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  ip inet, device text, user_agent text,
  new_ip boolean not null default false, new_device boolean not null default false,
  first_seen timestamptz not null default now(), last_seen timestamptz not null default now(),
  ended_at timestamptz, ended_reason text, ended_by uuid
);
create index if not exists admin_sessions_user_idx on public.admin_sessions (user_id, first_seen desc);
alter table public.admin_sessions enable row level security;
revoke all on public.admin_sessions from anon, authenticated;

-- Pemeriksaan sesi pada has_perm: sesi harus masih ada di auth.sessions (paksa keluar berlaku seketika), belum diakhiri,
-- dan tidak melewati batas tidak aktif bila diaktifkan. JWT tanpa session_id dibiarkan lolos.
create or replace function public.admin_gate() returns boolean
language plpgsql stable security definer set search_path = public as $$
declare sid uuid; idle int; s record;
begin
  if auth.uid() is null then return true; end if;
  begin sid := nullif(auth.jwt() ->> 'session_id', '')::uuid; exception when others then sid := null; end;
  if sid is null then return true; end if;
  if not exists (select 1 from auth.sessions where id = sid) then return false; end if;
  select ended_at, last_seen into s from public.admin_sessions where session_id = sid;
  if found then
    if s.ended_at is not null then return false; end if;
    select coalesce(nullif(value #>> '{}', '')::int, 0) into idle from public.security_settings where key = 'admin_idle_timeout_min';
    if coalesce(idle, 0) > 0 and s.last_seen < now() - make_interval(mins => idle) then return false; end if;
  end if;
  return true;
end $$;
revoke all on function public.admin_gate() from public, anon, authenticated;

-- has_perm: tetap menghormati MFA (mfa_ok) bila security-mfa.sql dipasang; ditambah pemeriksaan sesi.
do $do$ begin
  if to_regprocedure('public.mfa_ok(uuid,text)') is not null then
    execute $f$
      create or replace function public.has_perm(p text) returns boolean
      language sql stable security definer set search_path = public as $b$
        select exists (
          select 1 from public.admin_users a
          where a.user_id = auth.uid() and a.active
            and (a.role = 'super_admin' or exists (select 1 from public.role_permissions r where r.role = a.role and r.permission = p))
        ) and public.mfa_ok(auth.uid(), coalesce(auth.jwt()->>'aal', '')) and public.admin_gate();
      $b$ $f$;
  else
    execute $f$
      create or replace function public.has_perm(p text) returns boolean
      language sql stable security definer set search_path = public as $b$
        select exists (
          select 1 from public.admin_users a
          where a.user_id = auth.uid() and a.active
            and (a.role = 'super_admin' or exists (select 1 from public.role_permissions r where r.role = a.role and r.permission = p))
        ) and public.admin_gate();
      $b$ $f$;
  end if;
end $do$;
grant execute on function public.has_perm(text) to anon, authenticated;

create or replace function public.admin_session_ping() returns jsonb
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); sid uuid; h jsonb; ua text; ip_s text; v_ip inet; os text; br text; dev text;
        ex public.admin_sessions; v_prev boolean; nip boolean := false; ndev boolean := false; idle int;
begin
  if uid is null or not exists (select 1 from public.admin_users where user_id = uid and active) then
    return jsonb_build_object('ok', false, 'admin', false);
  end if;
  begin sid := nullif(auth.jwt() ->> 'session_id', '')::uuid; exception when others then sid := null; end;
  if sid is null then return jsonb_build_object('ok', true, 'tracked', false); end if;
  if not exists (select 1 from auth.sessions where id = sid) then
    update public.admin_sessions set ended_at = coalesce(ended_at, now()), ended_reason = coalesce(ended_reason, 'sesi_dicabut') where session_id = sid;
    return jsonb_build_object('ok', false, 'revoked', true);
  end if;
  select * into ex from public.admin_sessions where session_id = sid;
  if found then
    if ex.ended_at is not null then return jsonb_build_object('ok', false, 'revoked', true); end if;
    select coalesce(nullif(value #>> '{}', '')::int, 0) into idle from public.security_settings where key = 'admin_idle_timeout_min';
    if coalesce(idle, 0) > 0 and ex.last_seen < now() - make_interval(mins => idle) then
      update public.admin_sessions set ended_at = now(), ended_reason = 'tidak_aktif' where session_id = sid;
      return jsonb_build_object('ok', false, 'revoked', true, 'reason', 'tidak_aktif');
    end if;
    if ex.last_seen < now() - interval '30 seconds' then update public.admin_sessions set last_seen = now() where session_id = sid; end if;
    return jsonb_build_object('ok', true, 'tracked', true, 'new_ip', ex.new_ip, 'new_device', ex.new_device);
  end if;
  -- sesi baru: IP dan peramban diambil dari header permintaan di server (bukan kiriman klien)
  h := coalesce(nullif(current_setting('request.headers', true), ''), '{}')::jsonb;
  ip_s := nullif(btrim(coalesce(h ->> 'cf-connecting-ip', h ->> 'x-real-ip', split_part(coalesce(h ->> 'x-forwarded-for', ''), ',', 1))), '');
  begin v_ip := ip_s::inet; exception when others then v_ip := null; end;
  ua := left(coalesce(h ->> 'user-agent', ''), 300);
  os := case when ua ~* 'Android' then 'Android' when ua ~* 'iPhone|iPad|iPod' then 'iOS' when ua ~* 'Windows' then 'Windows'
             when ua ~* 'Mac OS X|Macintosh' then 'macOS' when ua ~* 'Linux|X11' then 'Linux' else 'Tidak diketahui' end;
  br := case when ua ~ 'Edg/' then 'Edge' when ua ~ 'OPR/|Opera' then 'Opera' when ua ~ 'Firefox/' then 'Firefox'
             when ua ~ 'Chrome/|CriOS/' then 'Chrome' when ua ~ 'Safari/' then 'Safari' else 'Peramban lain' end;
  dev := br || ' di ' || os;
  select exists (select 1 from public.admin_sessions where user_id = uid) into v_prev;
  if v_prev then
    nip := v_ip is not null and not exists (select 1 from public.admin_sessions where user_id = uid and ip = v_ip);
    ndev := not exists (select 1 from public.admin_sessions where user_id = uid and device = dev);
  end if;
  insert into public.admin_sessions (session_id, user_id, ip, device, user_agent, new_ip, new_device)
  values (sid, uid, v_ip, dev, ua, nip, ndev) on conflict (session_id) do nothing;
  if nip then insert into public.security_events (kind, actor, detail) values ('admin_new_ip', uid::text, jsonb_build_object('ip', host(v_ip), 'device', dev)); end if;
  if ndev then insert into public.security_events (kind, actor, detail) values ('admin_new_device', uid::text, jsonb_build_object('ip', host(v_ip), 'device', dev)); end if;
  delete from public.admin_sessions where first_seen < now() - interval '180 days';
  return jsonb_build_object('ok', true, 'tracked', true, 'new_ip', nip, 'new_device', ndev);
end $$;

create or replace function public.admin_session_end() returns void language plpgsql security definer set search_path = public as $$
declare sid uuid;
begin
  begin sid := nullif(auth.jwt() ->> 'session_id', '')::uuid; exception when others then sid := null; end;
  if sid is null or auth.uid() is null then return; end if;
  update public.admin_sessions set ended_at = coalesce(ended_at, now()), ended_reason = coalesce(ended_reason, 'keluar') where session_id = sid and user_id = auth.uid();
end $$;

-- Paksa keluar: Super Admin untuk siapa pun; admin biasa hanya untuk dirinya sendiri. Sesi dihapus dari auth.sessions
-- sehingga token penyegar mati dan has_perm langsung menolak token yang masih berlaku.
create or replace function public.admin_force_logout(p_user uuid, p_session uuid default null, p_keep_current boolean default false) returns int
language plpgsql security definer set search_path = public as $$
declare cur uuid; n int;
begin
  if auth.uid() is null or not exists (select 1 from public.admin_users where user_id = auth.uid() and active) then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_user is distinct from auth.uid() and not public.admin_is_super() then raise exception 'forbidden' using errcode = '42501'; end if;
  begin cur := nullif(auth.jwt() ->> 'session_id', '')::uuid; exception when others then cur := null; end;
  update public.admin_sessions set ended_at = now(), ended_reason = 'dipaksa_keluar', ended_by = auth.uid()
   where user_id = p_user and ended_at is null and (p_session is null or session_id = p_session) and (not p_keep_current or session_id is distinct from cur);
  delete from auth.sessions where user_id = p_user and (p_session is null or id = p_session) and (not p_keep_current or id is distinct from cur);
  get diagnostics n = row_count;
  insert into public.security_events (kind, actor, detail) values ('admin_force_logout', auth.uid()::text, jsonb_build_object('target', p_user, 'session', p_session, 'sessions', n));
  insert into public.audit_logs (actor_id, action, table_name, row_id, summary) values (auth.uid(), 'paksa_keluar', 'admin_sessions', p_user::text, jsonb_build_object('session', p_session, 'jumlah', n));
  return n;
end $$;

create or replace function public.admin_sessions_list(p_user uuid default null, p_flagged boolean default false, p_active boolean default false, p_limit int default 100, p_offset int default 0) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare cur uuid; v_total int; v_rows jsonb;
begin
  if not public.has_perm('admins.read') then raise exception 'forbidden' using errcode = '42501'; end if;
  begin cur := nullif(auth.jwt() ->> 'session_id', '')::uuid; exception when others then cur := null; end;
  with f as (
    select s.*, u.email::text as email, a.role, exists (select 1 from auth.sessions x where x.id = s.session_id) as live
      from public.admin_sessions s join auth.users u on u.id = s.user_id left join public.admin_users a on a.user_id = s.user_id
     where (p_user is null or s.user_id = p_user) and (not p_flagged or s.new_ip or s.new_device))
  select count(*) filter (where not p_active or (ended_at is null and live)) into v_total from f;
  select coalesce(jsonb_agg(to_jsonb(q) order by q.first_seen desc), '[]'::jsonb) into v_rows from (
    select s.session_id, s.user_id, u.email::text as email, a.role, host(s.ip) as ip, s.device, s.new_ip, s.new_device, s.first_seen, s.last_seen, s.ended_at, s.ended_reason,
           (s.ended_at is null and exists (select 1 from auth.sessions x where x.id = s.session_id)) as live, (s.session_id = cur) as current
      from public.admin_sessions s join auth.users u on u.id = s.user_id left join public.admin_users a on a.user_id = s.user_id
     where (p_user is null or s.user_id = p_user) and (not p_flagged or s.new_ip or s.new_device)
       and (not p_active or (s.ended_at is null and exists (select 1 from auth.sessions x where x.id = s.session_id)))
     order by s.first_seen desc limit greatest(1, least(coalesce(p_limit, 100), 500)) offset greatest(0, coalesce(p_offset, 0))) q;
  return jsonb_build_object('total', v_total, 'rows', v_rows);
end $$;

----------------------------------------------------------------------------- 6. Daftar admin, peran, kebijakan
create or replace function public.admin_role_labels() returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if auth.uid() is null or not exists (select 1 from public.admin_users where user_id = auth.uid() and active) then return '{}'::jsonb; end if;
  return coalesce((select jsonb_object_agg(key, label) from public.admin_roles), '{}'::jsonb);
end $$;

create or replace function public.admin_admins_overview() returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not public.has_perm('admins.read') then raise exception 'forbidden' using errcode = '42501'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object(
    'user_id', a.user_id, 'email', u.email, 'role', a.role, 'role_label', r.label, 'active', a.active, 'created_at', a.created_at,
    'last_sign_in_at', u.last_sign_in_at,
    'mfa_factors', (select count(*) from auth.mfa_factors f where f.user_id = a.user_id and f.status::text = 'verified'),
    'live_sessions', (select count(*) from public.admin_sessions s where s.user_id = a.user_id and s.ended_at is null and exists (select 1 from auth.sessions x where x.id = s.session_id)),
    'last_seen', (select max(last_seen) from public.admin_sessions s where s.user_id = a.user_id),
    'last_ip', (select host(ip) from public.admin_sessions s where s.user_id = a.user_id order by first_seen desc limit 1),
    'scopes', coalesce((select jsonb_object_agg(kind, vals) from (select kind, jsonb_agg(value order by value) as vals from public.admin_scopes sc where sc.user_id = a.user_id group by kind) z), '{}'::jsonb)
  ) order by a.created_at) from public.admin_users a join auth.users u on u.id = a.user_id left join public.admin_roles r on r.key = a.role), '[]'::jsonb);
end $$;

create or replace function public.admin_roles_overview() returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not public.has_perm('admins.read') then raise exception 'forbidden' using errcode = '42501'; end if;
  return jsonb_build_object(
    'modules', to_jsonb(public.admin_perm_modules()),
    'roles', coalesce((select jsonb_agg(jsonb_build_object('key', r.key, 'label', r.label, 'description', r.description, 'is_system', r.is_system,
        'members', (select count(*) from public.admin_users a where a.role = r.key and a.active),
        'perms', case when r.key = 'super_admin' then (select to_jsonb(array_agg(m || '.' || x)) from unnest(public.admin_perm_modules()) m, unnest(array['read','write','delete']) x)
                      else coalesce((select jsonb_agg(p.permission order by p.permission) from public.role_permissions p where p.role = r.key), '[]'::jsonb) end,
        'preset', to_jsonb(public.admin_role_preset(r.key))) order by (r.key = 'super_admin') desc, r.is_system desc, r.label) from public.admin_roles r), '[]'::jsonb),
    'categories', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'name', name) order by name) from public.event_categories), '[]'::jsonb));
end $$;

create or replace function public.admin_role_save(p_key text, p_label text, p_desc text, p_perms text[], p_new boolean default false) returns void
language plpgsql security definer set search_path = public as $$
declare p text; v_set text[] := '{}'; m text;
begin
  if not public.admin_is_super() then raise exception 'forbidden' using errcode = '42501'; end if;
  p_key := lower(btrim(coalesce(p_key, ''))); p_label := btrim(coalesce(p_label, ''));
  if p_key !~ '^[a-z][a-z0-9_]{2,29}$' then raise exception 'peran_tidak_valid'; end if;
  if p_key = 'super_admin' then raise exception 'peran_super_admin_terkunci'; end if;
  if char_length(p_label) < 2 or char_length(p_label) > 40 then raise exception 'label_tidak_valid'; end if;
  foreach p in array coalesce(p_perms, '{}') loop
    if not public.admin_perm_valid(p) then raise exception 'izin_tidak_valid'; end if;
    if p ~ '^admins\.(write|delete)$' then raise exception 'izin_admins_khusus_super_admin'; end if;
    v_set := v_set || p;
  end loop;
  -- delete menyiratkan write, write menyiratkan read
  foreach p in array v_set loop
    m := split_part(p, '.', 1);
    if p like '%.delete' then v_set := v_set || (m || '.write') || (m || '.read');
    elsif p like '%.write' then v_set := v_set || (m || '.read'); end if;
  end loop;
  select coalesce(array_agg(distinct x), '{}') into v_set from unnest(v_set) x;
  if p_new then
    if exists (select 1 from public.admin_roles where key = p_key) then raise exception 'peran_sudah_ada'; end if;
    insert into public.admin_roles (key, label, description, created_by) values (p_key, p_label, nullif(btrim(p_desc), ''), auth.uid());
  else
    update public.admin_roles set label = p_label, description = nullif(btrim(p_desc), '') where key = p_key;
    if not found then raise exception 'peran_tidak_ditemukan'; end if;
  end if;
  delete from public.role_permissions where role = p_key and permission <> all (v_set);
  insert into public.role_permissions (role, permission) select p_key, x from unnest(v_set) x on conflict do nothing;
end $$;

create or replace function public.admin_role_delete(p_key text) returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.admin_is_super() then raise exception 'forbidden' using errcode = '42501'; end if;
  if exists (select 1 from public.admin_roles where key = p_key and is_system) then raise exception 'peran_bawaan_tidak_bisa_dihapus'; end if;
  if exists (select 1 from public.admin_users where role = p_key) then raise exception 'peran_masih_dipakai'; end if;
  delete from public.admin_roles where key = p_key;
  if not found then raise exception 'peran_tidak_ditemukan'; end if;
end $$;

create or replace function public.admin_role_apply_preset(p_key text) returns void language plpgsql security definer set search_path = public as $$
declare v text[] := public.admin_role_preset(p_key);
begin
  if not public.admin_is_super() then raise exception 'forbidden' using errcode = '42501'; end if;
  if v is null then raise exception 'tidak_ada_preset'; end if;
  delete from public.role_permissions where role = p_key and permission <> all (v);
  insert into public.role_permissions (role, permission) select p_key, x from unnest(v) x on conflict do nothing;
end $$;

-- Kelola admin (khusus Super Admin; pagar tambahan ada di pemicu admin_users_guard)
create or replace function public.admin_add_admin(p_email text, p_role text) returns void
language plpgsql security definer set search_path = public as $$
declare uid uuid;
begin
  if not public.admin_is_super() then raise exception 'forbidden' using errcode = '42501'; end if;
  if not exists (select 1 from public.admin_roles where key = p_role) then raise exception 'peran_tidak_valid'; end if;
  select id into uid from auth.users where lower(email) = lower(btrim(p_email));
  if uid is null then raise exception 'Pengguna dengan email itu belum terdaftar'; end if;
  insert into public.admin_users (user_id, role, active) values (uid, p_role, true)
  on conflict (user_id) do update set role = excluded.role, active = true;
end $$;

create or replace function public.admin_set_role(p_user uuid, p_role text) returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.admin_is_super() then raise exception 'forbidden' using errcode = '42501'; end if;
  if not exists (select 1 from public.admin_roles where key = p_role) then raise exception 'peran_tidak_valid'; end if;
  update public.admin_users set role = p_role where user_id = p_user;
  if not found then raise exception 'admin_tidak_ditemukan'; end if;
end $$;

create or replace function public.admin_set_active(p_user uuid, p_active boolean) returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.admin_is_super() then raise exception 'forbidden' using errcode = '42501'; end if;
  update public.admin_users set active = coalesce(p_active, false) where user_id = p_user;
  if not found then raise exception 'admin_tidak_ditemukan'; end if;
end $$;

create or replace function public.admin_scope_set(p_user uuid, p_kind text, p_values text[]) returns void language plpgsql security definer set search_path = public as $$
declare v text;
begin
  if not public.admin_is_super() then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_kind not in ('template_category', 'content_type') then raise exception 'jenis_tidak_valid'; end if;
  if not exists (select 1 from public.admin_users where user_id = p_user) then raise exception 'admin_tidak_ditemukan'; end if;
  foreach v in array coalesce(p_values, '{}') loop
    if p_kind = 'content_type' and v <> all (array['banner', 'faq', 'tutorial', 'article', 'page']) then raise exception 'nilai_tidak_valid'; end if;
    if p_kind = 'template_category' and not exists (select 1 from public.event_categories where id::text = v) then raise exception 'nilai_tidak_valid'; end if;
  end loop;
  delete from public.admin_scopes where user_id = p_user and kind = p_kind and value <> all (coalesce(p_values, '{}'));
  insert into public.admin_scopes (user_id, kind, value) select p_user, p_kind, x from unnest(coalesce(p_values, '{}')) x on conflict do nothing;
end $$;

create or replace function public.admin_access_get() returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_mfa boolean := false; v_avail boolean := to_regprocedure('public.setting_bool(text)') is not null;
begin
  if not public.has_perm('admins.read') then raise exception 'forbidden' using errcode = '42501'; end if;
  if v_avail then execute 'select public.setting_bool(''admin_mfa_required'')' into v_mfa; end if;
  return jsonb_build_object(
    'idle_timeout_min', coalesce((select nullif(value #>> '{}', '')::int from public.security_settings where key = 'admin_idle_timeout_min'), 0),
    'mfa_available', v_avail, 'mfa_required', coalesce(v_mfa, false),
    'admins_active', (select count(*) from public.admin_users where active),
    'admins_with_mfa', (select count(*) from public.admin_users a where a.active and exists (select 1 from auth.mfa_factors f where f.user_id = a.user_id and f.status::text = 'verified')));
end $$;

create or replace function public.admin_access_set(p_idle_min int) returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.admin_is_super() then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_idle_min is null or not (p_idle_min = 0 or p_idle_min between 5 and 1440) then raise exception 'batas_tidak_aktif_tidak_valid'; end if;
  insert into public.security_settings (key, value, updated_by) values ('admin_idle_timeout_min', to_jsonb(p_idle_min), auth.uid())
  on conflict (key) do update set value = excluded.value, updated_by = excluded.updated_by, updated_at = now();
  insert into public.security_events (kind, actor, detail) values ('admin_access_settings_changed', auth.uid()::text, jsonb_build_object('idle_timeout_min', p_idle_min));
  insert into public.audit_logs (actor_id, action, table_name, row_id, summary) values (auth.uid(), 'update', 'security_settings', 'admin_idle_timeout_min', jsonb_build_object('idle_timeout_min', p_idle_min));
end $$;

create or replace function public.admin_security_alerts(p_limit int default 50) returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not public.has_perm('admins.read') then raise exception 'forbidden' using errcode = '42501'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('id', e.id, 'at', e.at, 'kind', e.kind, 'actor', e.actor, 'email', u.email, 'detail', e.detail) order by e.at desc)
    from (select * from public.security_events where kind like 'admin\_%' order by at desc limit greatest(1, least(coalesce(p_limit, 50), 200))) e
    left join auth.users u on u.id::text = e.actor), '[]'::jsonb);
end $$;

----------------------------------------------------------------------------- 7. Audit log
create or replace function public.audit_logs_immutable() returns trigger language plpgsql as $$
begin
  if public.admin_api_call() then raise exception 'audit_log_tidak_bisa_diubah'; end if;
  return coalesce(new, old);
end $$;
drop trigger if exists audit_logs_immutable_trg on public.audit_logs;
create trigger audit_logs_immutable_trg before update or delete on public.audit_logs for each row execute function public.audit_logs_immutable();

create or replace function public.admin_audit_list(p_actor uuid default null, p_table text default null, p_action text default null,
  p_from timestamptz default null, p_to timestamptz default null, p_q text default null, p_limit int default 25, p_offset int default 0) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare q text := nullif(btrim(coalesce(p_q, '')), ''); pat text; v_total bigint; v_rows jsonb;
begin
  if not public.has_perm('admins.read') then raise exception 'forbidden' using errcode = '42501'; end if;
  pat := case when q is null then null else '%' || replace(replace(replace(q, '\', '\\'), '%', '\%'), '_', '\_') || '%' end;
  select count(*) into v_total from public.audit_logs a
   where (p_actor is null or a.actor_id = p_actor) and (p_table is null or a.table_name = p_table) and (p_action is null or a.action = p_action)
     and (p_from is null or a.created_at >= p_from) and (p_to is null or a.created_at < p_to)
     and (pat is null or a.table_name ilike pat or a.action ilike pat or a.row_id ilike pat or a.summary::text ilike pat);
  select coalesce(jsonb_agg(to_jsonb(z) order by z.created_at desc, z.id desc), '[]'::jsonb) into v_rows from (
    select a.id, a.created_at, a.actor_id, u.email::text as actor_email, a.action, a.table_name, a.row_id, a.summary
      from public.audit_logs a left join auth.users u on u.id = a.actor_id
     where (p_actor is null or a.actor_id = p_actor) and (p_table is null or a.table_name = p_table) and (p_action is null or a.action = p_action)
       and (p_from is null or a.created_at >= p_from) and (p_to is null or a.created_at < p_to)
       and (pat is null or a.table_name ilike pat or a.action ilike pat or a.row_id ilike pat or a.summary::text ilike pat)
     order by a.created_at desc, a.id desc limit greatest(1, least(coalesce(p_limit, 25), 2000)) offset greatest(0, coalesce(p_offset, 0))) z;
  return jsonb_build_object('total', v_total, 'rows', v_rows);
end $$;

create or replace function public.admin_audit_facets() returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not public.has_perm('admins.read') then raise exception 'forbidden' using errcode = '42501'; end if;
  return jsonb_build_object(
    'tables', coalesce((select jsonb_agg(t order by t) from (select distinct table_name t from public.audit_logs where table_name is not null limit 200) x), '[]'::jsonb),
    'actions', coalesce((select jsonb_agg(t order by t) from (select distinct action t from public.audit_logs limit 100) x), '[]'::jsonb),
    'actors', coalesce((select jsonb_agg(jsonb_build_object('id', a.user_id, 'email', u.email) order by u.email) from public.admin_users a join auth.users u on u.id = a.user_id), '[]'::jsonb));
end $$;

-- Audit untuk tabel konfigurasi tambahan (hanya perubahan oleh admin; rahasia webhook ada di tabel lain dan tidak diaudit)
do $$ declare t text; begin
  foreach t in array array['admin_roles', 'admin_scopes', 'notif_settings', 'notif_templates', 'notif_rules', 'webhook_endpoints'] loop
    if to_regclass('public.' || t) is not null then
      execute format('drop trigger if exists audit_%1$s on public.%1$I', t);
      execute format('create trigger audit_%1$s after insert or update or delete on public.%1$I for each row execute function public.audit_row()', t);
    end if;
  end loop;
end $$;

----------------------------------------------------------------------------- 8. Hak eksekusi
do $$ declare f text; begin
  foreach f in array array[
    'admin_session_ping()', 'admin_session_end()', 'admin_force_logout(uuid,uuid,boolean)', 'admin_sessions_list(uuid,boolean,boolean,int,int)',
    'admin_role_labels()', 'admin_admins_overview()', 'admin_roles_overview()', 'admin_role_save(text,text,text,text[],boolean)', 'admin_role_delete(text)',
    'admin_role_apply_preset(text)', 'admin_add_admin(text,text)', 'admin_set_role(uuid,text)', 'admin_set_active(uuid,boolean)', 'admin_scope_set(uuid,text,text[])',
    'admin_access_get()', 'admin_access_set(int)', 'admin_security_alerts(int)', 'admin_audit_list(uuid,text,text,timestamptz,timestamptz,text,int,int)', 'admin_audit_facets()'] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;
