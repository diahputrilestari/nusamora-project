-- Uji DB admin-live.sql: venue, interaksi, game, ruangan, presence, chat & moderasi, skor, analitik, izin.
\set ON_ERROR_STOP on
\set QUIET on
create temp table _bk_set as select * from public.live_settings;
create or replace function pg_temp.root() returns void language plpgsql as $$ begin reset role; perform set_config('request.jwt.claims', '{}', false); perform set_config('request.jwt.claim.sub', '', false); perform set_config('request.headers', '{}', false); end $$;
grant execute on function pg_temp.root() to public;
create or replace function pg_temp.clean() returns void language plpgsql as $$ begin
  perform pg_temp.root();
  delete from public.invitations where user_id in (select id from auth.users where email like 'lv.%@uji.nusamora.test');
  delete from public.live_rooms where venue_id in (select id from public.live_venues where key like 'lv-%');
  delete from public.live_venues where key like 'lv-%'; delete from public.live_games where key like 'lv-%'; delete from public.live_interactions where key like 'lv\_%';
  delete from public.live_words where word like 'lvx%';
  delete from public.admin_users where user_id in (select id from auth.users where email like 'lv.%@uji.nusamora.test');
  delete from public.profiles where id in (select id from auth.users where email like 'lv.%@uji.nusamora.test');
  delete from auth.users where email like 'lv.%@uji.nusamora.test';
  delete from public.live_settings; insert into public.live_settings select * from _bk_set;
end $$;
do $$ begin perform pg_temp.clean(); end $$;
grant select, insert, update, delete on public.live_venues, public.live_chat, public.live_rooms, public.live_words to authenticated;
create or replace function pg_temp.as_user(u uuid) returns void language plpgsql as $$ begin perform pg_temp.root();
  perform set_config('request.jwt.claim.sub', u::text, false);
  perform set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated')::text, false); set role authenticated; end $$;
grant execute on function pg_temp.as_user(uuid) to public;
create or replace function pg_temp.as_anon() returns void language plpgsql as $$ begin perform pg_temp.root(); set role anon; end $$;
grant execute on function pg_temp.as_anon() to public;
create or replace function pg_temp.fails(sql text, expect text) returns void language plpgsql as $$ begin
  begin execute sql; raise exception 'seharusnya gagal: %', sql; exception when others then if sqlerrm like 'seharusnya gagal%' or sqlerrm not like '%' || expect || '%' then raise exception 'galat salah untuk [%]: % (harap: %)', sql, sqlerrm, expect; end if; end; end $$;
create or replace function pg_temp.sq(q text) returns text language plpgsql security definer as $$ declare r text; begin execute q into r; return r; end $$;
grant execute on function pg_temp.sq(text) to public;
create or replace function pg_temp.mkuser(tag text) returns uuid language plpgsql as $$ declare u uuid := gen_random_uuid(); begin
  perform pg_temp.root(); insert into auth.users (id, email) values (u, 'lv.' || tag || '@uji.nusamora.test');
  insert into public.profiles (id, full_name) values (u, 'LV ' || tag) on conflict (id) do update set full_name = excluded.full_name; return u; end $$;
create or replace function pg_temp.tok(n text) returns text language sql as $$ select current_setting('lv.' || n) $$;

do $$ declare adm uuid := pg_temp.mkuser('admin'); sup uuid := pg_temp.mkuser('support'); own uuid := pg_temp.mkuser('owner'); i1 uuid; i2 uuid; g record; n text;
begin
  insert into public.admin_users (user_id, role) values (adm, 'super_admin'), (sup, 'support');
  insert into public.invitations (user_id, title, status, slug, plan_id, package_type, expires_at, content) values (own, 'LV Aktif', 'aktif', 'lv-aktif', 'luxe', 'luxe', now() + interval '30 days', '{}') returning id into i1;
  insert into public.invitations (user_id, title, status, slug, plan_id, package_type, content) values (own, 'LV Draft', 'draft', 'lv-draft', 'luxe', 'luxe', '{}') returning id into i2;
  perform set_config('lv.adm', adm::text, false); perform set_config('lv.sup', sup::text, false); perform set_config('lv.i1', i1::text, false); perform set_config('lv.i2', i2::text, false);
  foreach n in array array['a', 'b', 'c', 'd'] loop
    insert into public.invitation_guests (invitation_id, name) values (i1, 'Tamu ' || upper(n)) returning id, token into g;
    perform set_config('lv.g' || n, g.id::text, false); perform set_config('lv.t' || n, g.token, false);
  end loop;
  insert into public.invitation_guests (invitation_id, name) values (i2, 'Tamu Draft') returning token into g.token; perform set_config('lv.td', g.token, false);
end $$;

-- 1. Venue builder
do $$ declare v jsonb; vid uuid; begin
  perform pg_temp.as_user(current_setting('lv.adm')::uuid);
  v := public.admin_live_venues();
  if jsonb_array_length(v) < 2 or not exists (select 1 from jsonb_array_elements(v) x where x ->> 'key' = 'romantic-garden' and jsonb_array_length(x -> 'areas') = 10) then raise exception 'venue bawaan hilang'; end if;
  perform pg_temp.fails($q$select public.admin_live_venue_save('{"key":"lv-x","name":"Uji","areas":[{"id":"a1","name":"Satu","x":99,"z":0}]}'::jsonb)$q$, 'area_tidak_valid');
  perform pg_temp.fails($q$select public.admin_live_venue_save('{"key":"lv-x","name":"Uji","areas":[{"id":"a1","name":"Satu","x":1,"z":0},{"id":"a1","name":"Dua","x":2,"z":0}]}'::jsonb)$q$, 'area_tidak_valid');
  perform pg_temp.fails($q$select public.admin_live_venue_save('{"key":"Bad Key","name":"Uji","areas":[]}'::jsonb)$q$, 'kunci_tidak_valid');
  perform pg_temp.fails($q$select public.admin_live_venue_save('{"key":"lv-x","name":"Uji","areas":[],"background_url":"javascript:alert(1)"}'::jsonb)$q$, 'url_tidak_valid');
  vid := public.admin_live_venue_save('{"key":"lv-ok","name":"Venue Uji","max_guests":2,"sort":99,"areas":[{"id":"gerbang","name":"Gerbang","x":0,"z":10,"icon":"🚪","enabled":true},{"id":"rahasia","name":"Rahasia","x":5,"z":5,"icon":"🔒","enabled":false}]}'::jsonb);
  perform pg_temp.fails(format($q$select public.admin_live_venue_save('{"key":"romantic-garden","name":"Dobel","areas":[]}'::jsonb)$q$), 'kunci_sudah_dipakai');
  perform set_config('lv.venue', vid::text, false);
  perform pg_temp.as_user(current_setting('lv.sup')::uuid);
  perform pg_temp.fails($q$select public.admin_live_venues()$q$, 'forbidden');
  perform pg_temp.fails($q$select public.admin_live_venue_save('{"key":"lv-s","name":"Uji","areas":[]}'::jsonb)$q$, 'forbidden');
  perform pg_temp.fails($q$insert into public.live_venues (key, name) values ('lv-direct', 'Langsung')$q$, 'row-level security');
  perform pg_temp.root(); raise notice 'OK 1 venue';
end $$;

-- 1b. Pengaturan fitur
do $$ begin
  perform pg_temp.as_user(current_setting('lv.adm')::uuid);
  if (public.admin_live_settings_get() ->> 'max_guests')::int <> 300 then raise exception 'default max_guests'; end if;
  perform pg_temp.fails($q$select public.admin_live_settings_save('{"zzz":true}'::jsonb)$q$, 'kunci_tidak_dikenal');
  perform pg_temp.fails($q$select public.admin_live_settings_save('{"max_guests":0}'::jsonb)$q$, 'max_guests_tidak_valid');
  perform pg_temp.fails($q$select public.admin_live_settings_save('{"music":"ya"}'::jsonb)$q$, 'music_tidak_valid');
  perform pg_temp.fails($q$select public.admin_live_settings_save('{"default_theme":"tidak-ada"}'::jsonb)$q$, 'default_theme_tidak_valid');
  perform public.admin_live_settings_save('{"music":false,"max_guests":250}'::jsonb);
  if (public.admin_live_settings_get() ->> 'music')::boolean or (public.admin_live_settings_get() ->> 'max_guests')::int <> 250 then raise exception 'pengaturan tersimpan'; end if;
  if pg_temp.sq($a$select count(*) from public.audit_logs where table_name = 'live_settings' and row_id = 'music'$a$) = '0' then raise exception 'pengaturan harus diaudit'; end if;
  perform public.admin_live_settings_save('{"music":true,"max_guests":300}'::jsonb);
  perform pg_temp.as_user(current_setting('lv.sup')::uuid);
  perform pg_temp.fails($q$select public.admin_live_settings_save('{"music":false}'::jsonb)$q$, 'forbidden');
  perform pg_temp.root(); raise notice 'OK 1b pengaturan';
end $$;

-- 2. Interaksi & game
do $$ declare gid uuid; begin
  perform pg_temp.as_user(current_setting('lv.adm')::uuid);
  if jsonb_array_length(public.admin_live_interactions()) < 6 then raise exception 'interaksi bawaan hilang'; end if;
  perform pg_temp.fails($q$select public.admin_live_interaction_save('lv_x', 'Xx', '🎈', 'lain', true, 2, 1)$q$, 'jenis_tidak_valid');
  perform pg_temp.fails($q$select public.admin_live_interaction_save('lv_x', 'Xx', '🎈', 'reaksi', true, 99, 1)$q$, 'jeda_tidak_valid');
  perform public.admin_live_interaction_save('lv_balon', 'Balon', '🎈', 'reaksi', true, 0, 9);
  perform pg_temp.fails($q$select public.admin_live_game_save('{"key":"lv-t","name":"Kuis","kind":"trivia","config":{"questions":[{"q":"Apa?","options":["a","b"],"answer":5}]}}'::jsonb)$q$, 'konfigurasi_game_tidak_valid');
  perform pg_temp.fails($q$select public.admin_live_game_save('{"key":"lv-t","name":"Kuis","kind":"tap","config":{"seconds":1}}'::jsonb)$q$, 'konfigurasi_game_tidak_valid');
  gid := public.admin_live_game_save('{"key":"lv-kuis","name":"Kuis Pengantin","kind":"trivia","enabled":true,"points_max":100,"config":{"questions":[{"q":"Warna favorit?","options":["Merah","Biru"],"answer":1},{"q":"Kota pertemuan?","options":["Solo","Bandung","Jakarta"],"answer":2}]}}'::jsonb);
  perform set_config('lv.game', gid::text, false);
  perform public.admin_live_game_save('{"key":"lv-tap","name":"Tap","kind":"tap","enabled":false,"points_max":50,"config":{"seconds":20}}'::jsonb);
  perform pg_temp.as_user(current_setting('lv.sup')::uuid);
  perform pg_temp.fails($q$select public.admin_live_game_delete(gen_random_uuid())$q$, 'forbidden');
  perform pg_temp.root(); raise notice 'OK 2 interaksi & game';
end $$;

-- 3. Konfigurasi tamu, masuk, kapasitas, ruangan, blokir
do $$ declare c jsonb; j jsonb; begin
  perform pg_temp.as_anon();
  perform pg_temp.fails(format($q$select public.admin_live_overview()$q$), 'permission denied');
  c := public.live_config(pg_temp.tok('ta'));
  if c -> 'venue' ->> 'key' <> 'romantic-garden' then raise exception 'venue bawaan salah: %', c -> 'venue' ->> 'key'; end if;
  if not exists (select 1 from jsonb_array_elements(c -> 'interactions') x where x ->> 'key' = 'lv_balon') then raise exception 'interaksi aktif tidak tampil'; end if;
  if c::text like '%"answer"%' then raise exception 'kunci jawaban bocor ke tamu'; end if;
  if jsonb_array_length(c -> 'games') <> 1 then raise exception 'hanya game aktif yang tampil: %', c -> 'games'; end if;
  if public.live_config('salah') is not null then raise exception 'token salah harus null'; end if;
  if (public.live_join(pg_temp.tok('td')) ->> 'reason') <> 'token_tidak_valid' then raise exception 'undangan draft harus ditolak'; end if;
  -- pakai venue kecil (kapasitas 2) lewat admin
  perform pg_temp.as_user(current_setting('lv.adm')::uuid);
  perform public.admin_live_room_set(current_setting('lv.i1')::uuid, 'open', 'open', 0, null, current_setting('lv.venue')::uuid);
  perform pg_temp.as_anon();
  c := public.live_config(pg_temp.tok('ta'));
  if jsonb_array_length(c -> 'venue' -> 'areas') <> 1 or c -> 'room' ->> 'max_guests' <> '2' then raise exception 'area nonaktif harus disembunyikan & kapasitas venue dipakai: %', c; end if;
  if not (public.live_join(pg_temp.tok('ta')) ->> 'ok')::boolean then raise exception 'tamu A harus bisa masuk'; end if;
  if not (public.live_join(pg_temp.tok('tb')) ->> 'ok')::boolean then raise exception 'tamu B harus bisa masuk'; end if;
  j := public.live_join(pg_temp.tok('tc'));
  if j ->> 'reason' <> 'penuh' then raise exception 'kapasitas harus penuh: %', j; end if;
  if not (public.live_join(pg_temp.tok('ta')) ->> 'ok')::boolean then raise exception 'masuk ulang tamu yang sudah online harus tetap boleh'; end if;
  if public.live_heartbeat(pg_temp.tok('ta')) <> 2 then raise exception 'online harus 2'; end if;
  if public.live_heartbeat(pg_temp.tok('tc')) <> -1 then raise exception 'tamu yang belum masuk harus -1'; end if;
  -- tutup ruangan
  perform pg_temp.as_user(current_setting('lv.adm')::uuid);
  perform public.admin_live_room_set(current_setting('lv.i1')::uuid, 'closed', 'open', 0, null, current_setting('lv.venue')::uuid);
  if pg_temp.sq(format('select count(*) from public.live_presence where invitation_id = %L', current_setting('lv.i1'))) <> '0' then raise exception 'menutup ruangan harus mengeluarkan semua'; end if;
  perform pg_temp.as_anon();
  if public.live_join(pg_temp.tok('ta')) ->> 'reason' <> 'ruangan_ditutup' then raise exception 'ruangan tutup menolak masuk'; end if;
  perform pg_temp.as_user(current_setting('lv.adm')::uuid);
  perform public.admin_live_room_set(current_setting('lv.i1')::uuid, 'open', 'open', 0, 5, null);
  perform pg_temp.as_anon();
  -- fitur dimatikan global
  perform pg_temp.as_user(current_setting('lv.adm')::uuid); perform public.admin_live_settings_save('{"enabled":false}'::jsonb);
  perform pg_temp.as_anon();
  if public.live_join(pg_temp.tok('ta')) ->> 'reason' <> 'dimatikan' then raise exception 'fitur mati menolak masuk'; end if;
  perform pg_temp.as_user(current_setting('lv.adm')::uuid); perform public.admin_live_settings_save('{"enabled":true}'::jsonb);
  -- blokir
  perform pg_temp.as_user(current_setting('lv.adm')::uuid);
  perform pg_temp.fails(format($q$select public.admin_live_mute(%L, %L, 'ban', 30, 'x')$q$, current_setting('lv.i1'), current_setting('lv.gd')), 'alasan_wajib');
  perform public.admin_live_mute(current_setting('lv.i1')::uuid, current_setting('lv.gd')::uuid, 'ban', 30, 'Mengganggu tamu');
  perform pg_temp.as_anon();
  if public.live_join(pg_temp.tok('td')) is null then null; end if;
  perform pg_temp.root(); raise notice 'OK 3 masuk & ruangan';
end $$;

-- 4. Interaksi dengan jeda
do $$ declare r jsonb; begin
  perform pg_temp.as_anon();
  if public.live_join(pg_temp.tok('ta')) is null then raise exception 'join'; end if;
  if not (public.live_interact(pg_temp.tok('ta'), 'sapa') ->> 'ok')::boolean then raise exception 'sapa pertama harus lolos'; end if;
  r := public.live_interact(pg_temp.tok('ta'), 'sapa');
  if r ->> 'reason' <> 'terlalu_cepat' then raise exception 'jeda sapa harus berlaku: %', r; end if;
  if not (public.live_interact(pg_temp.tok('ta'), 'lv_balon') ->> 'ok')::boolean then raise exception 'jeda 0 harus lolos'; end if;
  if (public.live_interact(pg_temp.tok('ta'), 'tidak-ada') ->> 'reason') <> 'interaksi_tidak_aktif' then raise exception 'interaksi tidak dikenal'; end if;
  if (public.live_interact(pg_temp.tok('tc'), 'cinta') ->> 'reason') <> 'belum_masuk' then raise exception 'harus masuk dulu'; end if;
  perform pg_temp.as_user(current_setting('lv.adm')::uuid);
  perform public.admin_live_interaction_save('lv_balon', 'Balon', '🎈', 'reaksi', false, 0, 9);
  perform pg_temp.as_anon();
  if (public.live_interact(pg_temp.tok('ta'), 'lv_balon') ->> 'reason') <> 'interaksi_tidak_aktif' then raise exception 'interaksi nonaktif ditolak'; end if;
  perform pg_temp.root(); raise notice 'OK 4 interaksi';
end $$;

-- 5. Chat & moderasi
do $$ declare r jsonb; l jsonb; idh uuid; idp uuid; begin
  perform pg_temp.as_user(current_setting('lv.adm')::uuid);
  perform public.admin_live_word_set('lvxkasar', true); perform pg_temp.fails($q$select public.admin_live_word_set('a', true)$q$, 'kata_tidak_valid');
  perform public.admin_live_room_set(current_setting('lv.i1')::uuid, 'open', 'open', 120, 5, null);
  perform pg_temp.as_anon();
  perform public.live_join(pg_temp.tok('tb'));
  r := public.live_chat_send(pg_temp.tok('ta'), '  Selamat   ya!  ');
  if not (r ->> 'ok')::boolean or r ->> 'status' <> 'visible' then raise exception 'chat biasa harus tampil: %', r; end if;
  if (public.live_chat_send(pg_temp.tok('ta'), 'lagi') ->> 'reason') <> 'terlalu_cepat' then raise exception 'slow mode harus berlaku'; end if;
  if pg_temp.sq($q$select body from public.live_chat where guest_name = 'Tamu A' limit 1$q$) <> 'Selamat ya!' then raise exception 'spasi harus dirapikan'; end if;
  perform pg_temp.as_user(current_setting('lv.adm')::uuid);
  perform public.admin_live_room_set(current_setting('lv.i1')::uuid, 'open', 'open', 0, 5, null);
  perform pg_temp.as_anon();
  r := public.live_chat_send(pg_temp.tok('tb'), 'dasar LVXKASAR kamu');
  if r ->> 'status' <> 'hidden' then raise exception 'kata terlarang harus disembunyikan: %', r; end if; idh := (r ->> 'id')::uuid;
  r := public.live_chat_send(pg_temp.tok('ta'), 'klik https://spam.example');
  if r ->> 'status' <> 'hidden' or pg_temp.sq(format('select auto_flag from public.live_chat where id = %L', r ->> 'id')) <> 'tautan' then raise exception 'tautan harus ditandai'; end if;
  if (public.live_chat_send(pg_temp.tok('ta'), repeat('x', 301)) ->> 'reason') <> 'pesan_tidak_valid' then raise exception 'pesan terlalu panjang'; end if;
  l := public.live_chat_list(pg_temp.tok('tc'));
  if l::text like '%LVXKASAR%' or jsonb_array_length(l) <> 1 then raise exception 'tamu lain hanya melihat pesan tampil: %', l; end if;
  l := public.live_chat_list(pg_temp.tok('tb'));
  if jsonb_array_length(l) <> 2 then raise exception 'pengirim melihat pesannya yang disembunyikan: %', l; end if;
  -- mode moderasi
  perform pg_temp.as_user(current_setting('lv.adm')::uuid);
  perform public.admin_live_room_set(current_setting('lv.i1')::uuid, 'open', 'moderated', 0, 5, null);
  perform pg_temp.as_anon();
  r := public.live_chat_send(pg_temp.tok('tb'), 'menunggu ya'); idp := (r ->> 'id')::uuid;
  if r ->> 'status' <> 'pending' then raise exception 'mode moderasi: pending'; end if;
  if jsonb_array_length(public.live_chat_list(pg_temp.tok('tc'))) <> 1 then raise exception 'pending tidak tampil ke tamu lain'; end if;
  perform pg_temp.as_user(current_setting('lv.adm')::uuid);
  if (public.admin_live_chat('pending') ->> 'total')::int <> 1 then raise exception 'antrean moderasi harus 1'; end if;
  perform pg_temp.fails(format($q$select public.admin_live_chat_mod(%L, 'hide', 'x')$q$, idp), 'alasan_wajib');
  perform public.admin_live_chat_mod(idp, 'approve');
  perform public.admin_live_chat_mod(idh, 'remove', 'Kata kasar');
  perform pg_temp.as_anon();
  if jsonb_array_length(public.live_chat_list(pg_temp.tok('tc'))) <> 2 then raise exception 'setelah disetujui tampil (dan yang dihapus hilang)'; end if;
  -- chat mati, bisukan
  perform pg_temp.as_user(current_setting('lv.adm')::uuid);
  perform public.admin_live_room_set(current_setting('lv.i1')::uuid, 'open', 'off', 0, 5, null);
  perform pg_temp.as_anon();
  if (public.live_chat_send(pg_temp.tok('ta'), 'halo') ->> 'reason') <> 'chat_nonaktif' then raise exception 'chat off'; end if;
  perform pg_temp.as_user(current_setting('lv.adm')::uuid);
  perform public.admin_live_room_set(current_setting('lv.i1')::uuid, 'open', 'open', 0, 5, null);
  perform public.admin_live_mute(current_setting('lv.i1')::uuid, current_setting('lv.ga')::uuid, 'mute', 10, 'Spam');
  if jsonb_array_length(public.admin_live_guests(current_setting('lv.i1')::uuid) -> 'mutes') <> 2 then raise exception 'daftar bisu (ban tamu D + bisu tamu A)'; end if;
  perform pg_temp.as_anon();
  if (public.live_chat_send(pg_temp.tok('ta'), 'halo') ->> 'reason') <> 'dibisukan' then raise exception 'tamu bisu tidak boleh chat'; end if;
  perform pg_temp.as_user(current_setting('lv.adm')::uuid);
  perform public.admin_live_unmute(current_setting('lv.i1')::uuid, current_setting('lv.ga')::uuid);
  perform public.admin_live_mute(current_setting('lv.i1')::uuid, current_setting('lv.ga')::uuid, 'ban', 10, 'Berulang');
  if pg_temp.sq(format('select count(*) from public.live_presence where guest_id = %L', current_setting('lv.ga'))) <> '0' then raise exception 'ban mengeluarkan dari ruangan'; end if;
  perform pg_temp.as_anon();
  if public.live_join(pg_temp.tok('ta')) ->> 'reason' <> 'diblokir' then raise exception 'ban menolak masuk'; end if;
  perform pg_temp.as_user(current_setting('lv.sup')::uuid);
  perform pg_temp.fails($q$select public.admin_live_chat()$q$, 'forbidden');
  perform pg_temp.fails($q$select public.admin_live_chat_mod(gen_random_uuid(), 'approve')$q$, 'forbidden');
  perform pg_temp.root(); raise notice 'OK 5 chat & moderasi';
end $$;

-- 6. Game & papan skor
do $$ declare r jsonb; begin
  perform pg_temp.as_user(current_setting('lv.adm')::uuid);
  perform public.admin_live_mute(current_setting('lv.i1')::uuid, current_setting('lv.ga')::uuid, 'mute', 1, 'sementara'); perform public.admin_live_unmute(current_setting('lv.i1')::uuid, current_setting('lv.ga')::uuid);
  perform pg_temp.root(); delete from public.live_mutes;
  perform pg_temp.as_anon();
  r := public.live_game_submit(pg_temp.tok('tb'), 'lv-kuis', null, array[1, 2]);
  if (r ->> 'score')::int <> 100 then raise exception 'semua benar = 100: %', r; end if;
  r := public.live_game_submit(pg_temp.tok('tb'), 'lv-kuis', null, array[0, 2]);
  if (r ->> 'score')::int <> 50 or (r ->> 'best')::int <> 100 then raise exception 'skor terbaik dipertahankan: %', r; end if;
  if (public.live_game_submit(pg_temp.tok('tb'), 'lv-kuis', null, array[1]) ->> 'reason') <> 'jawaban_tidak_valid' then raise exception 'jumlah jawaban'; end if;
  if (public.live_game_submit(pg_temp.tok('tb'), 'lv-tap', 10, null) ->> 'reason') <> 'game_tidak_aktif' then raise exception 'game nonaktif'; end if;
  perform pg_temp.as_user(current_setting('lv.adm')::uuid);
  perform public.admin_live_game_save(jsonb_build_object('id', (select id from public.live_games where key = 'lv-tap'), 'key', 'lv-tap', 'name', 'Tap', 'kind', 'tap', 'enabled', true, 'points_max', 50, 'config', '{"seconds":20}'::jsonb));
  perform pg_temp.as_anon();
  if (public.live_game_submit(pg_temp.tok('tb'), 'lv-tap', 51, null) ->> 'reason') <> 'skor_tidak_valid' then raise exception 'skor di atas batas'; end if;
  if (public.live_game_submit(pg_temp.tok('tc'), 'lv-tap', 40, null) ->> 'score')::int <> 40 then raise exception 'skor tap'; end if;
  r := public.live_leaderboard(pg_temp.tok('ta'), 'lv-kuis');
  if jsonb_array_length(r) <> 1 or (r -> 0 ->> 'score')::int <> 100 or r::text like '%guest_id%' then raise exception 'papan skor: %', r; end if;
  perform pg_temp.as_user(current_setting('lv.adm')::uuid);
  if jsonb_array_length(public.admin_live_game_scores(current_setting('lv.game')::uuid)) <> 1 then raise exception 'skor admin'; end if;
  perform pg_temp.root(); raise notice 'OK 6 game';
end $$;

-- 7. Ruangan, analitik, izin
do $$ declare o jsonb; a jsonb; rm jsonb; begin
  perform pg_temp.as_user(current_setting('lv.adm')::uuid);
  o := public.admin_live_overview();
  if (o ->> 'online_now')::int < 1 then raise exception 'online_now: %', o; end if;
  rm := public.admin_live_rooms('LV Aktif');
  if (rm ->> 'total')::int <> 1 or (rm -> 'rows' -> 0 ->> 'online')::int < 1 then raise exception 'daftar ruangan: %', rm; end if;
  if (public.admin_live_rooms('tidak-ada-sama-sekali') ->> 'total')::int <> 0 then raise exception 'filter ruangan'; end if;
  a := public.admin_live_analytics(now() - interval '1 day', now() + interval '1 day');
  if (a ->> 'joins')::int < 2 or (a ->> 'chat_total')::int < 4 or (a ->> 'chat_hidden')::int < 2 or (a ->> 'game_plays')::int < 3 then raise exception 'angka analitik: %', a; end if;
  if not exists (select 1 from jsonb_array_elements(a -> 'by_interaction') x where x ->> 'key' = 'sapa') then raise exception 'rincian interaksi'; end if;
  perform pg_temp.fails($q$select public.admin_live_analytics(now(), now() - interval '1 day')$q$, 'rentang_tidak_valid');
  perform public.admin_live_room_set(current_setting('lv.i1')::uuid, 'open', 'open', 3, 5, current_setting('lv.venue')::uuid);
  perform pg_temp.fails(format($q$select public.admin_live_venue_delete(%L)$q$, current_setting('lv.venue')), 'venue_dipakai');
  perform public.admin_live_room_set(current_setting('lv.i1')::uuid, 'open', 'open', 3, 5, null);
  perform public.admin_live_venue_delete(current_setting('lv.venue')::uuid);
  if pg_temp.sq($a$select count(*) from public.audit_logs where table_name = 'live_venues' and action = 'delete'$a$) = '0' then raise exception 'penghapusan venue harus diaudit'; end if;
  if pg_temp.sq($a$select count(*) from public.audit_logs where table_name = 'live_chat'$a$) = '0' then raise exception 'moderasi chat harus diaudit'; end if;
  perform public.admin_live_kick(current_setting('lv.i1')::uuid, current_setting('lv.gb')::uuid);
  perform pg_temp.as_user(current_setting('lv.sup')::uuid);
  perform pg_temp.fails($q$select public.admin_live_overview()$q$, 'forbidden');
  perform pg_temp.fails($q$select public.admin_live_analytics(now() - interval '1 day', now())$q$, 'forbidden');
  perform pg_temp.fails($q$select public.admin_live_room_set(gen_random_uuid(), 'open', 'open', 1, null, null)$q$, 'forbidden');
  if pg_temp.sq($q$select 1$q$) is null then null; end if;
  perform pg_temp.root(); raise notice 'OK 7 ruangan, analitik, izin';
end $$;

do $$ begin perform pg_temp.clean(); end $$;
revoke select, insert, update, delete on public.live_venues, public.live_chat, public.live_rooms, public.live_words from authenticated;
grant select on public.live_venues, public.live_chat, public.live_rooms, public.live_words to authenticated;
