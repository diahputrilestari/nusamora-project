-- Uji DB admin-live-theme.sql: validasi tema, simpan venue bertema, live_theme untuk tamu.
\set ON_ERROR_STOP on
\set QUIET on
create or replace function pg_temp.root() returns void language plpgsql as $$ begin reset role; perform set_config('request.jwt.claims', '{}', false); perform set_config('request.jwt.claim.sub', '', false); end $$;
grant execute on function pg_temp.root() to public;
create or replace function pg_temp.clean() returns void language plpgsql as $$ begin perform pg_temp.root();
  delete from public.live_rooms where venue_id in (select id from public.live_venues where key like 'lt-%');
  delete from public.live_venues where key like 'lt-%';
  delete from public.invitations where user_id in (select id from auth.users where email like 'lt.%@uji.nusamora.test');
  delete from public.admin_users where user_id in (select id from auth.users where email like 'lt.%@uji.nusamora.test');
  delete from public.profiles where id in (select id from auth.users where email like 'lt.%@uji.nusamora.test');
  delete from auth.users where email like 'lt.%@uji.nusamora.test'; end $$;
do $$ begin perform pg_temp.clean(); end $$;
grant select, insert, update, delete on public.live_venues, public.live_rooms to authenticated;
create or replace function pg_temp.as_user(u uuid) returns void language plpgsql as $$ begin perform pg_temp.root();
  perform set_config('request.jwt.claim.sub', u::text, false); perform set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated')::text, false); set role authenticated; end $$;
grant execute on function pg_temp.as_user(uuid) to public;
create or replace function pg_temp.as_anon() returns void language plpgsql as $$ begin perform pg_temp.root(); set role anon; end $$;
grant execute on function pg_temp.as_anon() to public;
create or replace function pg_temp.sq(q text) returns text language plpgsql security definer as $$ declare r text; begin execute q into r; return r; end $$;
grant execute on function pg_temp.sq(text) to public;
create or replace function pg_temp.fails(sql text, expect text) returns void language plpgsql as $$ begin
  begin execute sql; raise exception 'seharusnya gagal: %', sql; exception when others then if sqlerrm like 'seharusnya gagal%' or sqlerrm not like '%' || expect || '%' then raise exception 'galat salah untuk [%]: % (harap: %)', sql, sqlerrm, expect; end if; end; end $$;
grant execute on function pg_temp.fails(text, text) to public;

do $$ declare adm uuid := gen_random_uuid(); sup uuid := gen_random_uuid(); own uuid := gen_random_uuid(); i1 uuid; g record; vid uuid; ok jsonb; r jsonb; th jsonb; ar jsonb;
begin
  insert into auth.users (id, email) values (adm, 'lt.admin@uji.nusamora.test'), (sup, 'lt.support@uji.nusamora.test'), (own, 'lt.owner@uji.nusamora.test');
  insert into public.profiles (id, full_name) values (adm, 'LT A'), (sup, 'LT S'), (own, 'LT O') on conflict (id) do nothing;
  insert into public.admin_users (user_id, role) values (adm, 'super_admin'), (sup, 'support');
  insert into public.invitations (user_id, title, status, slug, plan_id, package_type, expires_at, event_type, content) values (own, 'Ulang Tahun Alya', 'aktif', 'lt-aktif', 'luxe', 'luxe', now() + interval '30 days', 'wedding', '{}') returning id into i1;
  insert into public.invitation_guests (invitation_id, name) values (i1, 'Tamu A') returning token into g;
  perform set_config('lt.tok', g.token, false); perform set_config('lt.i1', i1::text, false); perform set_config('lt.adm', adm::text, false); perform set_config('lt.sup', sup::text, false);

  -- 1. validator
  th := (select nm_theme from public.live_venues v0 where v0.key = 'midnight-party');
  if not public.live_theme_ok(th) or not public.live_theme_ok(null) then raise exception 'tema contoh harus valid'; end if;
  if public.live_theme_ok('[]') or public.live_theme_ok('{"x":1}') or public.live_theme_ok('{"orn":"bebas"}') or public.live_theme_ok('{"dark":"ya"}') then raise exception 'bentuk tema salah harus ditolak'; end if;
  if public.live_theme_ok('{"ui":{"accent":"merah"}}') or public.live_theme_ok('{"ui":{"accent":"#12"}}') then raise exception 'warna salah harus ditolak'; end if;
  if public.live_theme_ok('{"mono":{"motif":"url(http://x)"}}') or public.live_theme_ok('{"mono":{"font":"a;b"}}') or public.live_theme_ok('{"hud":{"bg":"expression(1)"}}') or public.live_theme_ok('{"scr":{"veil":"@import x"}}') then raise exception 'nilai berbahaya harus ditolak'; end if;
  if public.live_theme_ok(jsonb_build_object('ui', jsonb_build_object('serif', repeat('a', 200)))) then raise exception 'teks terlalu panjang harus ditolak'; end if;
  begin insert into public.live_venues (key, name, areas, nm_theme) values ('lt-bad', 'Bad', '[]', '{"hack":1}'); raise exception 'check constraint seharusnya menolak'; exception when check_violation then null; end;

  -- 2. simpan venue bertema (admin)
  ar := (select v0.areas from public.live_venues v0 where v0.key = 'midnight-party');
  perform pg_temp.as_user(adm);
  vid := public.admin_live_venue_save(jsonb_build_object('key', 'lt-uji', 'name', 'LT Uji', 'areas', ar, 'max_guests', 50, 'active', true, 'event_type', 'birthday', 'bg_pos', 'center 30%', 'background_url', 'https://x.test/a.png', 'nm_theme', th));
  if pg_temp.sq(format('select event_type||(nm_theme->>''orn'')||bg_pos from public.live_venues where id=%L', vid)) <> 'birthdaysparklecenter 30%' then raise exception 'tema tidak tersimpan'; end if;
  perform public.admin_live_venue_save(jsonb_build_object('id', vid, 'key', 'lt-uji', 'name', 'LT Uji 2', 'areas', ar, 'max_guests', 50, 'active', true));
  if pg_temp.sq(format('select (nm_theme is not null)::text||event_type from public.live_venues where id=%L', vid)) <> 'truebirthday' then raise exception 'kunci tema tidak dikirim harus dipertahankan'; end if;
  perform public.admin_live_venue_save(jsonb_build_object('id', vid, 'key', 'lt-uji', 'name', 'LT Uji 2', 'areas', ar, 'max_guests', 50, 'active', true, 'nm_theme', null, 'event_type', ''));
  if pg_temp.sq(format('select (nm_theme is null)::text||(event_type is null)::text from public.live_venues where id=%L', vid)) <> 'truetrue' then raise exception 'null harus menghapus tema'; end if;
  perform pg_temp.fails(format('select public.admin_live_venue_save(%L::jsonb)', jsonb_build_object('key', 'lt-x1', 'name', 'LT X', 'areas', ar, 'nm_theme', '{"ui":{"accent":"merah"}}'::jsonb)), 'tema_tidak_valid');
  perform pg_temp.fails(format('select public.admin_live_venue_save(%L::jsonb)', jsonb_build_object('key', 'lt-x2', 'name', 'LT X', 'areas', ar, 'event_type', 'pesta')), 'jenis_acara_tidak_valid');
  perform pg_temp.fails(format('select public.admin_live_venue_save(%L::jsonb)', jsonb_build_object('key', 'lt-x3', 'name', 'LT X', 'areas', ar, 'bg_pos', 'url(x)')), 'posisi_tidak_valid');
  perform pg_temp.as_user(sup);
  perform pg_temp.fails(format('select public.admin_live_venue_save(%L::jsonb)', jsonb_build_object('key', 'lt-x4', 'name', 'LT X', 'areas', ar)), 'forbidden');

  -- 3. live_theme untuk tamu
  perform pg_temp.root(); update public.live_venues set nm_theme = th, event_type = 'birthday', bg_pos = 'center 30%', background_url = 'https://x.test/a.png' where id = vid;
  perform pg_temp.as_anon();
  if public.live_theme('salah') is not null or public.live_theme(null) is not null then raise exception 'token salah = null'; end if;
  r := public.live_theme(current_setting('lt.tok'));
  if r is not null and (r ->> 'id') like 'v-lt-%' then raise exception 'venue default bukan lt-uji'; end if;
  perform pg_temp.root(); insert into public.live_rooms (invitation_id, venue_id) values (i1, vid) on conflict (invitation_id) do update set venue_id = vid;
  perform pg_temp.as_anon(); r := public.live_theme(current_setting('lt.tok'));
  if (r ->> 'id') <> 'v-lt-uji' or (r ->> 'event') <> 'birthday' or (r ->> 'host') <> 'Ulang Tahun Alya' or (r ->> 'painting') <> 'https://x.test/a.png' or (r ->> 'pos') <> 'center 30%' or (r -> 'theme' -> 'ui' ->> 'accent') <> '#6D3FC0' then raise exception 'live_theme salah: %', r; end if;
  if r::text like '%' || current_setting('lt.tok') || '%' or r::text like '%' || i1::text || '%' then raise exception 'tidak boleh membocorkan token/id undangan'; end if;
  -- event venue kosong -> pakai event undangan; event tak dikenal -> null
  perform pg_temp.root(); update public.live_venues set event_type = null where id = vid; perform pg_temp.as_anon();
  if (public.live_theme(current_setting('lt.tok')) ->> 'event') <> 'wedding' then raise exception 'event cadangan dari undangan'; end if;
  perform pg_temp.root(); update public.invitations set event_type = 'lainnya' where id = i1; perform pg_temp.as_anon();
  if (public.live_theme(current_setting('lt.tok')) -> 'event') <> 'null'::jsonb then raise exception 'event tak dikenal = null'; end if;
  -- venue tanpa tema -> null
  perform pg_temp.root(); update public.live_venues set nm_theme = null where id = vid; perform pg_temp.as_anon();
  if public.live_theme(current_setting('lt.tok')) is not null then raise exception 'tanpa tema = null'; end if;
  raise notice 'OK live_theme';
end $$;
do $$ begin perform pg_temp.clean(); end $$;
