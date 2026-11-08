-- Uji DB admin-live-sync.sql: sinkron posisi tamu dan tamu lain yang terlihat.
\set ON_ERROR_STOP on
\set QUIET on
create or replace function pg_temp.root() returns void language plpgsql as $$ begin reset role; end $$;
grant execute on function pg_temp.root() to public;
create or replace function pg_temp.as_anon() returns void language plpgsql as $$ begin perform pg_temp.root(); set role anon; end $$;
grant execute on function pg_temp.as_anon() to public;
create or replace function pg_temp.clean() returns void language plpgsql as $$ begin perform pg_temp.root();
  delete from public.invitations where user_id in (select id from auth.users where email like 'ls.%@uji.nusamora.test');
  delete from public.profiles where id in (select id from auth.users where email like 'ls.%@uji.nusamora.test');
  delete from auth.users where email like 'ls.%@uji.nusamora.test'; end $$;
do $$ begin perform pg_temp.clean(); end $$;
do $$ declare own uuid := gen_random_uuid(); i1 uuid; g record; n text; begin
  insert into auth.users (id, email) values (own, 'ls.owner@uji.nusamora.test'); insert into public.profiles (id, full_name) values (own, 'LS') on conflict (id) do nothing;
  insert into public.invitations (user_id, title, status, slug, plan_id, package_type, expires_at, content) values (own, 'LS Aktif', 'aktif', 'ls-aktif', 'luxe', 'luxe', now() + interval '30 days', '{}') returning id into i1;
  foreach n in array array['a', 'b', 'c'] loop
    insert into public.invitation_guests (invitation_id, name) values (i1, 'Tamu ' || upper(n)) returning token into g; perform set_config('ls.t' || n, g.token, false); end loop;
  perform set_config('ls.i1', i1::text, false);
end $$;
do $$ declare r jsonb; begin
  perform pg_temp.as_anon();
  if public.live_sync(current_setting('ls.ta'), 1, 2, '{"g":"L","i":1}') is null then raise exception 'token sah tidak boleh null'; end if;
  if (public.live_sync(current_setting('ls.ta'), 1, 2, null) ->> 'online')::int <> -1 then raise exception 'belum masuk = -1'; end if;
  if public.live_sync('salah', 1, 2) is not null then raise exception 'token salah null'; end if;
  perform public.live_join(current_setting('ls.ta')); perform public.live_join(current_setting('ls.tb'));
  r := public.live_sync(current_setting('ls.ta'), 3.5, -4.25, '{"g":"L","i":1}');
  if (r ->> 'online')::int <> 2 then raise exception 'online 2: %', r; end if;
  if jsonb_array_length(r -> 'peers') <> 0 then raise exception 'peer tanpa posisi tidak ditampilkan: %', r; end if;
  r := public.live_sync(current_setting('ls.tb'), -7, 9, '{"g":"P","i":3}');
  if jsonb_array_length(r -> 'peers') <> 1 or (r -> 'peers' -> 0 ->> 'name') <> 'Tamu A' or (r -> 'peers' -> 0 ->> 'x')::numeric <> 3.5 or (r -> 'peers' -> 0 -> 'av' ->> 'i')::int <> 1 then raise exception 'B melihat A: %', r; end if;
  if r::text like '%' || current_setting('ls.ta') || '%' or r::text like '%guest_id%' or length(r -> 'peers' -> 0 ->> 'id') <> 10 then raise exception 'tidak boleh membocorkan token/id tamu: %', r; end if;
  -- masukan buruk tidak mengubah posisi / avatar
  r := public.live_sync(current_setting('ls.ta'), 999, null, '{"g":"X","i":99}');
  r := public.live_sync(current_setting('ls.tb'));
  if (r -> 'peers' -> 0 ->> 'x')::numeric <> 3.5 or (r -> 'peers' -> 0 -> 'av' ->> 'g') <> 'L' then raise exception 'masukan di luar batas harus diabaikan: %', r; end if;
  -- tamu lama (tidak aktif) tidak tampil
  perform pg_temp.root(); update public.live_presence set last_seen = now() - interval '30 seconds' where guest_id = (select id from public.invitation_guests where token = current_setting('ls.ta'));
  perform pg_temp.as_anon(); r := public.live_sync(current_setting('ls.tb'));
  if jsonb_array_length(r -> 'peers') <> 0 then raise exception 'peer tidak aktif disembunyikan: %', r; end if;
  -- ruangan ditutup / fitur mati -> -1 dan presence dihapus
  perform pg_temp.root(); insert into public.live_rooms (invitation_id, status) values (current_setting('ls.i1')::uuid, 'closed') on conflict (invitation_id) do update set status = 'closed';
  perform pg_temp.as_anon();
  if (public.live_sync(current_setting('ls.tb')) ->> 'online')::int <> -1 then raise exception 'ruangan tutup = -1'; end if;
  perform pg_temp.root(); if (select count(*) from public.live_presence where invitation_id = current_setting('ls.i1')::uuid and guest_id = (select id from public.invitation_guests where token = current_setting('ls.tb'))) <> 0 then raise exception 'presence harus dihapus'; end if;
  raise notice 'OK live_sync';
end $$;
do $$ begin perform pg_temp.clean(); end $$;
