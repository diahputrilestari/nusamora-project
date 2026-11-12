-- NusaMora: data tamu per undangan (Statistik Tamu, RSVP, Buku Tamu, Live Guest). Idempoten.
-- Jalankan SETELAH invitation-schema.sql dan security-schema.sql (butuh invitations.slug/expires_at, rl_hit).
-- Model akses:
--   * Pemilik undangan: BACA langsung lewat RLS (hanya miliknya); TULIS hanya lewat RPC security definer (auth.uid()).
--   * Tamu (anon): hanya RPC publik berbasis token tamu (opaque, 32 hex). Token tidak bisa ditebak dan tidak ada daftar publik.
--   * Tabel tidak bisa ditulis langsung oleh anon/authenticated.

create table if not exists public.invitation_guests (
  id uuid primary key default gen_random_uuid(),
  invitation_id uuid not null references public.invitations(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  phone text check (phone is null or phone ~ '^\+?[0-9]{6,18}$'),
  token text not null unique default replace(gen_random_uuid()::text, '-', ''),
  sent_at timestamptz, opened_at timestamptz, open_count int not null default 0 check (open_count >= 0),
  created_at timestamptz not null default now());
create index if not exists invitation_guests_inv_idx on public.invitation_guests (invitation_id, created_at);

create table if not exists public.invitation_rsvps (
  id uuid primary key default gen_random_uuid(),
  invitation_id uuid not null references public.invitations(id) on delete cascade,
  guest_id uuid not null unique references public.invitation_guests(id) on delete cascade,
  status text not null check (status in ('hadir','tidak_hadir','ragu')),
  pax int not null default 1 check (pax between 0 and 20),
  message text check (message is null or char_length(message) <= 500),
  updated_at timestamptz not null default now());
create index if not exists invitation_rsvps_inv_idx on public.invitation_rsvps (invitation_id);

create table if not exists public.guestbook_entries (
  id uuid primary key default gen_random_uuid(),
  invitation_id uuid not null references public.invitations(id) on delete cascade,
  guest_id uuid references public.invitation_guests(id) on delete set null,
  name text not null, message text not null check (char_length(message) between 1 and 500),
  visible boolean not null default true, created_at timestamptz not null default now());
create index if not exists guestbook_inv_idx on public.guestbook_entries (invitation_id, created_at desc);

create table if not exists public.live_guest_events (
  id uuid primary key default gen_random_uuid(),
  invitation_id uuid not null references public.invitations(id) on delete cascade,
  guest_id uuid references public.invitation_guests(id) on delete set null,
  guest_name text not null, action text not null check (action in ('masuk','sapa','reaksi','keluar')),
  detail text check (detail is null or char_length(detail) <= 200), created_at timestamptz not null default now());
create index if not exists live_events_inv_idx on public.live_guest_events (invitation_id, created_at desc);

create or replace function public._owns_inv(p_inv uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.invitations where id = p_inv and user_id = auth.uid());
$$;
revoke all on function public._owns_inv(uuid) from public, anon;
grant execute on function public._owns_inv(uuid) to authenticated;

do $$ declare t text; begin
  foreach t in array array['invitation_guests','invitation_rsvps','guestbook_entries','live_guest_events'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "pemilik baca" on public.%I', t);
    execute format('create policy "pemilik baca" on public.%I for select to authenticated using (public._owns_inv(invitation_id))', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant select on public.%I to authenticated', t);
  end loop;
end $$;

-- sinkronkan penghitung di invitations (dipakai kartu ringkasan dashboard)
create or replace function public._sync_inv_counts(p_inv uuid) returns void language sql security definer set search_path = public as $$
  update public.invitations set
    guest_count = (select count(*) from public.invitation_guests where invitation_id = p_inv),
    wish_count = (select count(*) from public.guestbook_entries where invitation_id = p_inv and visible)
  where id = p_inv;
$$;
create or replace function public._trg_sync_counts() returns trigger language plpgsql security definer set search_path = public as $$
begin perform public._sync_inv_counts(coalesce(new.invitation_id, old.invitation_id)); return null; end $$;
drop trigger if exists sync_guest_counts on public.invitation_guests;
create trigger sync_guest_counts after insert or delete on public.invitation_guests for each row execute function public._trg_sync_counts();
drop trigger if exists sync_wish_counts on public.guestbook_entries;
create trigger sync_wish_counts after insert or delete or update of visible on public.guestbook_entries for each row execute function public._trg_sync_counts();

create or replace function public._own_inv(p_inv uuid) returns void language plpgsql stable security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'tidak_diizinkan' using errcode = '28000'; end if;
  if not exists (select 1 from public.invitations where id = p_inv and user_id = auth.uid()) then raise exception 'tidak_ditemukan'; end if;
end $$;
create or replace function public._rl(k text, lim int, win int) returns void language plpgsql security definer set search_path = public as $$
declare r jsonb; begin r := public.rl_hit(k, lim, win, 'guest_rate_limited');
  if not coalesce((r->>'allowed')::boolean, true) then raise exception 'terlalu_banyak_permintaan'; end if; end $$;

-- ===== RPC pemilik =====
create or replace function public.guest_add(p_inv uuid, p_name text, p_phone text default null) returns uuid
language plpgsql security definer set search_path = public as $$
declare n text := btrim(coalesce(p_name, '')); ph text := nullif(regexp_replace(coalesce(p_phone, ''), '[\s\-().]', '', 'g'), ''); id uuid;
begin
  perform public._own_inv(p_inv);
  if char_length(n) < 1 or char_length(n) > 100 then raise exception 'nama_tidak_valid'; end if;
  if ph is not null and ph !~ '^\+?[0-9]{6,18}$' then raise exception 'telepon_tidak_valid'; end if;
  if (select count(*) from public.invitation_guests where invitation_id = p_inv) >= 1000 then raise exception 'batas_tamu_tercapai'; end if;
  perform public._rl('guest-add-' || auth.uid()::text, 300, 3600);
  insert into public.invitation_guests (invitation_id, name, phone) values (p_inv, n, ph) returning invitation_guests.id into id;
  return id;
end $$;
create or replace function public.guest_delete(p_guest uuid) returns void language plpgsql security definer set search_path = public as $$
declare inv uuid; begin
  select invitation_id into inv from public.invitation_guests where id = p_guest; if inv is null then raise exception 'tidak_ditemukan'; end if;
  perform public._own_inv(inv); delete from public.invitation_guests where id = p_guest; end $$;
create or replace function public.guest_mark_sent(p_guest uuid, p_sent boolean default true) returns void language plpgsql security definer set search_path = public as $$
declare inv uuid; begin
  select invitation_id into inv from public.invitation_guests where id = p_guest; if inv is null then raise exception 'tidak_ditemukan'; end if;
  perform public._own_inv(inv); update public.invitation_guests set sent_at = case when p_sent then coalesce(sent_at, now()) else null end where id = p_guest; end $$;
create or replace function public.guest_stats(p_inv uuid) returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  perform public._own_inv(p_inv);
  return (select jsonb_build_object(
    'total', count(*), 'terkirim', count(sent_at), 'dibuka', count(opened_at),
    'rsvp', (select count(*) from public.invitation_rsvps where invitation_id = p_inv),
    'hadir', (select count(*) from public.invitation_rsvps where invitation_id = p_inv and status = 'hadir'),
    'tidak_hadir', (select count(*) from public.invitation_rsvps where invitation_id = p_inv and status = 'tidak_hadir'),
    'ragu', (select count(*) from public.invitation_rsvps where invitation_id = p_inv and status = 'ragu'),
    'pax_hadir', (select coalesce(sum(pax), 0) from public.invitation_rsvps where invitation_id = p_inv and status = 'hadir'),
    'ucapan', (select count(*) from public.guestbook_entries where invitation_id = p_inv and visible))
  from public.invitation_guests where invitation_id = p_inv);
end $$;
create or replace function public.wish_set_visible(p_id uuid, p_visible boolean) returns void language plpgsql security definer set search_path = public as $$
declare inv uuid; begin
  select invitation_id into inv from public.guestbook_entries where id = p_id; if inv is null then raise exception 'tidak_ditemukan'; end if;
  perform public._own_inv(inv); update public.guestbook_entries set visible = p_visible where id = p_id; end $$;
create or replace function public.wish_delete(p_id uuid) returns void language plpgsql security definer set search_path = public as $$
declare inv uuid; begin
  select invitation_id into inv from public.guestbook_entries where id = p_id; if inv is null then raise exception 'tidak_ditemukan'; end if;
  perform public._own_inv(inv); delete from public.guestbook_entries where id = p_id; end $$;
create or replace function public.live_event_delete(p_id uuid) returns void language plpgsql security definer set search_path = public as $$
declare inv uuid; begin
  select invitation_id into inv from public.live_guest_events where id = p_id; if inv is null then raise exception 'tidak_ditemukan'; end if;
  perform public._own_inv(inv); delete from public.live_guest_events where id = p_id; end $$;

-- ===== RPC tamu (anon): token tamu, undangan harus aktif dan belum kedaluwarsa. Token salah -> hasil seragam (null/false) =====
create or replace function public._guest_ctx(p_token text, out g uuid, out inv uuid, out gname text) language plpgsql stable security definer set search_path = public as $$
begin
  if p_token is null or p_token !~ '^[0-9a-f]{32}$' then return; end if;
  select ig.id, ig.invitation_id, ig.name into g, inv, gname
  from public.invitation_guests ig join public.invitations i on i.id = ig.invitation_id
  where ig.token = p_token and i.status = 'aktif' and (i.expires_at is null or i.expires_at > now());
end $$;
create or replace function public.guest_open(p_token text) returns jsonb language plpgsql security definer set search_path = public as $$
declare c record;
begin
  select * into c from public._guest_ctx(p_token); if c.g is null then return null; end if;
  perform public._rl('guest-open-' || p_token, 60, 3600);
  update public.invitation_guests set opened_at = coalesce(opened_at, now()), open_count = open_count + 1 where id = c.g;
  return jsonb_build_object('name', c.gname);
end $$;
create or replace function public.guest_rsvp(p_token text, p_status text, p_pax int default 1, p_message text default null) returns boolean
language plpgsql security definer set search_path = public as $$
declare c record; m text := nullif(btrim(coalesce(p_message, '')), '');
begin
  select * into c from public._guest_ctx(p_token); if c.g is null then return false; end if;
  if p_status not in ('hadir','tidak_hadir','ragu') then raise exception 'status_tidak_valid'; end if;
  if p_pax < 0 or p_pax > 20 then raise exception 'jumlah_tidak_valid'; end if;
  if m is not null and char_length(m) > 500 then raise exception 'pesan_tidak_valid'; end if;
  perform public._rl('guest-rsvp-' || p_token, 20, 3600);
  insert into public.invitation_rsvps (invitation_id, guest_id, status, pax, message) values (c.inv, c.g, p_status, case when p_status = 'hadir' then greatest(p_pax, 1) else 0 end, m)
  on conflict (guest_id) do update set status = excluded.status, pax = excluded.pax, message = excluded.message, updated_at = now();
  return true;
end $$;
create or replace function public.guest_wish(p_token text, p_message text) returns boolean language plpgsql security definer set search_path = public as $$
declare c record; m text := btrim(coalesce(p_message, ''));
begin
  select * into c from public._guest_ctx(p_token); if c.g is null then return false; end if;
  if char_length(m) < 1 or char_length(m) > 500 then raise exception 'pesan_tidak_valid'; end if;
  perform public._rl('guest-wish-' || p_token, 5, 3600);
  insert into public.guestbook_entries (invitation_id, guest_id, name, message) values (c.inv, c.g, c.gname, m);
  return true;
end $$;
create or replace function public.live_log(p_token text, p_action text, p_detail text default null) returns boolean language plpgsql security definer set search_path = public as $$
declare c record; d text := nullif(left(btrim(coalesce(p_detail, '')), 200), '');
begin
  select * into c from public._guest_ctx(p_token); if c.g is null then return false; end if;
  if p_action not in ('masuk','sapa','reaksi','keluar') then raise exception 'aksi_tidak_valid'; end if;
  perform public._rl('guest-live-' || p_token, 120, 3600);
  insert into public.live_guest_events (invitation_id, guest_id, guest_name, action, detail) values (c.inv, c.g, c.gname, p_action, d);
  return true;
end $$;

do $$ declare f text; begin
  foreach f in array array['public._sync_inv_counts(uuid)','public._trg_sync_counts()','public._own_inv(uuid)','public._rl(text,int,int)','public._guest_ctx(text)'] loop
    execute format('revoke all on function %s from public, anon, authenticated', f); end loop;
  foreach f in array array['guest_add(uuid,text,text)','guest_delete(uuid)','guest_mark_sent(uuid,boolean)','guest_stats(uuid)','wish_set_visible(uuid,boolean)','wish_delete(uuid)','live_event_delete(uuid)'] loop
    execute format('revoke all on function public.%s from public, anon', f); execute format('grant execute on function public.%s to authenticated', f); end loop;
  foreach f in array array['guest_open(text)','guest_rsvp(text,text,int,text)','guest_wish(text,text)','live_log(text,text,text)'] loop
    execute format('revoke all on function public.%s from public', f); execute format('grant execute on function public.%s to anon, authenticated', f); end loop;
end $$;
