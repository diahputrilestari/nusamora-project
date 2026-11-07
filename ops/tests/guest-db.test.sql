-- Uji DB data tamu (backend/guest-schema.sql): isolasi pemilik, token tamu, RSVP, ucapan, Live Guest, penghitung, batas laju.
\set ON_ERROR_STOP on
\set QUIET on
delete from auth.users where email like 'gt.%@uji.nusamora.test';
delete from public.invitations where slug like 'gt-%';
delete from public.rate_limits where key like 'guest-%';
create temp table ids (k text primary key, v uuid); grant all on ids to public;
create temp table tk (k text primary key, v text); grant all on tk to public;
create or replace function pg_temp.as_user(u uuid) returns void language plpgsql as $$ begin reset role; perform set_config('request.jwt.claim.sub', u::text, false); perform set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated')::text, false); set role authenticated; end $$;
create or replace function pg_temp.as_anon() returns void language plpgsql as $$ begin reset role; perform set_config('request.jwt.claim.sub', '', false); perform set_config('request.jwt.claims', '', false); set role anon; end $$;
grant execute on function pg_temp.as_user(uuid), pg_temp.as_anon() to public;
create or replace function pg_temp.fails(sql text, expect text) returns void language plpgsql as $$
begin execute sql; raise exception 'seharusnya gagal (%): %', expect, sql;
exception when others then if sqlerrm not like '%' || expect || '%' then raise exception 'galat salah untuk [%]: % (harap: %)', sql, sqlerrm, expect; end if; end $$;
grant execute on function pg_temp.fails(text, text) to public;

do $$ declare o uuid := gen_random_uuid(); x uuid := gen_random_uuid(); ia uuid; ib uuid; id uuid; begin
  insert into auth.users (id, email) values (o, 'gt.owner@uji.nusamora.test'), (x, 'gt.other@uji.nusamora.test');
  insert into public.invitations (user_id, title, status, slug, plan_id, expires_at, content) values (o, 'Aktif', 'aktif', 'gt-aktif', 'signature', now() + interval '30 days', '{}') returning invitations.id into ia;
  insert into public.invitations (user_id, title, status, slug, plan_id, expires_at, content) values (o, 'Draft', 'draft', 'gt-draft', 'signature', now() + interval '30 days', '{}') returning invitations.id into ib;
  insert into ids values ('o', o), ('x', x), ('ia', ia), ('ib', ib);
  raise notice 'OK siapkan data';
end $$;

-- 1. pemilik menambah tamu; orang lain & anon ditolak; validasi
do $$ declare o uuid := (select v from ids where k='o'); x uuid := (select v from ids where k='x'); ia uuid := (select v from ids where k='ia'); g uuid; tkn text; begin
  perform pg_temp.as_user(o); g := public.guest_add(ia, '  Budi Santoso ', '0812-3456-7890' );
  perform pg_temp.fails($q$select public.guest_add((select v from ids where k='ia'), 'Budi', '0812')$q$, 'telepon_tidak_valid');
  reset role; perform pg_temp.as_user(o);
  perform pg_temp.fails($q$select public.guest_add((select v from ids where k='ia'), '', null)$q$, 'nama_tidak_valid');
  perform public.guest_add(ia, 'Siti', '+6281234567890'); perform public.guest_add(ia, 'Andi', null);
  reset role; select token into tkn from public.invitation_guests where id = g; insert into tk values ('budi', tkn);
  insert into tk select 'siti', token from public.invitation_guests where name = 'Siti' and invitation_id = ia;
  if (select name from public.invitation_guests where id = g) <> 'Budi Santoso' then raise exception 'nama tidak dirapikan'; end if;
  if tkn !~ '^[0-9a-f]{32}$' then raise exception 'token tidak opaque: %', tkn; end if;
  perform pg_temp.as_user(x);
  perform pg_temp.fails($q$select public.guest_add((select v from ids where k='ia'), 'Penyusup', null)$q$, 'tidak_ditemukan');
  perform pg_temp.fails($q$select public.guest_stats((select v from ids where k='ia'))$q$, 'tidak_ditemukan');
  if (select count(*) from public.invitation_guests) <> 0 then raise exception 'x membaca tamu orang lain'; end if;
  perform pg_temp.as_anon();
  begin perform public.guest_add(ia, 'anon', null); raise exception 'anon lolos'; exception when insufficient_privilege then null; end;
  begin perform count(*) from public.invitation_guests; raise exception 'anon membaca tabel'; exception when insufficient_privilege then null; end;
  reset role; raise notice 'OK tamu: isolasi pemilik, validasi, token opaque, anon ditolak';
end $$;

-- 2. sisi tamu: buka, RSVP (upsert), ucapan, live; token salah & undangan draft seragam
do $$ declare t text := (select v from tk where k='budi'); o uuid := (select v from ids where k='o'); ia uuid := (select v from ids where k='ia'); ib uuid := (select v from ids where k='ib'); j jsonb; n int; gd uuid; dt text; begin
  perform pg_temp.as_anon();
  j := public.guest_open(t); if j->>'name' <> 'Budi Santoso' then raise exception 'guest_open: %', j; end if;
  perform public.guest_open(t);
  if public.guest_open('ngawur') is not null or public.guest_open(repeat('0',32)) is not null then raise exception 'token salah tidak seragam'; end if;
  if not public.guest_rsvp(t, 'hadir', 3, 'Insyaallah hadir') then raise exception 'rsvp gagal'; end if;
  if not public.guest_rsvp(t, 'tidak_hadir', 5, null) then raise exception 'rsvp ubah gagal'; end if;
  perform pg_temp.fails(format('select public.guest_rsvp(%L, %L, 1, null)', t, 'mungkin'), 'status_tidak_valid');
  perform pg_temp.fails(format('select public.guest_rsvp(%L, %L, 99, null)', t, 'hadir'), 'jumlah_tidak_valid');
  if public.guest_rsvp(repeat('a',32), 'hadir', 1, null) then raise exception 'token acak diterima'; end if;
  if not public.guest_wish(t, 'Selamat menempuh hidup baru') then raise exception 'ucapan gagal'; end if;
  perform pg_temp.fails(format('select public.guest_wish(%L, %L)', t, repeat('x',501)), 'pesan_tidak_valid');
  if not public.live_log(t, 'masuk', null) or not public.live_log(t, 'reaksi', '❤') then raise exception 'live gagal'; end if;
  perform pg_temp.fails(format('select public.live_log(%L, %L, null)', t, 'hapus'), 'aksi_tidak_valid');
  reset role;
  select count(*) into n from public.invitation_rsvps; if n <> 1 then raise exception 'rsvp ganda: %', n; end if;
  if (select status from public.invitation_rsvps) <> 'tidak_hadir' or (select pax from public.invitation_rsvps) <> 0 then raise exception 'upsert rsvp salah'; end if;
  if (select open_count from public.invitation_guests where token = t) <> 2 or (select opened_at from public.invitation_guests where token = t) is null then raise exception 'pelacakan buka salah'; end if;
  -- undangan draft: tamu tidak bisa berinteraksi
  insert into public.invitation_guests (invitation_id, name) values (ib, 'Tamu Draft') returning id, token into gd, dt;
  perform pg_temp.as_anon();
  if public.guest_open(dt) is not null then raise exception 'draft bisa dibuka'; end if;
  reset role; raise notice 'OK tamu: buka/RSVP/ucapan/live, upsert, token salah & draft seragam';
end $$;

-- 3. statistik, penghitung, moderasi, isolasi baca
do $$ declare o uuid := (select v from ids where k='o'); x uuid := (select v from ids where k='x'); ia uuid := (select v from ids where k='ia'); j jsonb; w uuid; e uuid; g uuid; begin
  perform pg_temp.as_user(o);
  select id into g from public.invitation_guests where name = 'Siti'; perform public.guest_mark_sent(g, true);
  perform public.guest_mark_sent((select id from public.invitation_guests where name='Budi Santoso'), true);
  j := public.guest_stats(ia);
  if (j->>'total')::int <> 3 or (j->>'terkirim')::int <> 2 or (j->>'dibuka')::int <> 1 or (j->>'rsvp')::int <> 1 or (j->>'tidak_hadir')::int <> 1 or (j->>'hadir')::int <> 0 or (j->>'ucapan')::int <> 1 then raise exception 'statistik salah: %', j; end if;
  select id into w from public.guestbook_entries; perform public.wish_set_visible(w, false);
  if (public.guest_stats(ia)->>'ucapan')::int <> 0 then raise exception 'ucapan tersembunyi masih dihitung'; end if;
  reset role;
  if (select wish_count from public.invitations where id = ia) <> 0 or (select guest_count from public.invitations where id = ia) <> 3 then raise exception 'penghitung invitations tidak sinkron'; end if;
  perform pg_temp.as_user(o);
  if (select count(*) from public.live_guest_events) <> 2 then raise exception 'pemilik tidak melihat live'; end if;
  select id into e from public.live_guest_events limit 1; perform public.live_event_delete(e);
  perform public.wish_delete(w); perform public.guest_delete(g);
  if (public.guest_stats(ia)->>'total')::int <> 2 then raise exception 'hapus tamu gagal'; end if;
  perform pg_temp.as_user(x);
  perform pg_temp.fails(format('select public.wish_delete(%L)', w), 'tidak_ditemukan');
  if (select count(*) from public.invitation_rsvps) + (select count(*) from public.guestbook_entries) + (select count(*) from public.live_guest_events) <> 0 then raise exception 'x membaca data orang lain'; end if;
  reset role; raise notice 'OK statistik, penghitung sinkron, moderasi, hapus, isolasi baca';
end $$;

-- 4. batas laju publik
do $$ declare t text := (select v from tk where k='budi'); i int; begin
  perform pg_temp.as_anon();
  for i in 1..4 loop perform public.guest_wish(t, 'ucapan ' || i); end loop;  -- 1 ucapan sudah dikirim di blok 2
  perform pg_temp.fails(format('select public.guest_wish(%L, %L)', t, 'ke-6'), 'terlalu_banyak_permintaan');
  reset role; raise notice 'OK batas laju ucapan 5/jam';
end $$;
delete from auth.users where email like 'gt.%@uji.nusamora.test';
delete from public.invitations where slug like 'gt-%';
\echo SEMUA LULUS
