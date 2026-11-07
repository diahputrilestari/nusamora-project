-- Uji DB Cari Teman Kondangan (P0). Jalankan pada DB yang sudah memuat rantai SQL + backend/dating-schema.sql
-- (lokal: ops/tests/supabase-shim.sql lebih dulu; di stack nyata: langsung). Setiap blok DO mengakhiri dengan NOTICE "OK ...".
\set ON_ERROR_STOP on
\set QUIET on
-- bersihkan sisa uji sebelumnya
delete from auth.users where email like 'dt.%@uji.nusamora.test';
delete from public.invitations where slug like 'dt-%';
delete from public.dating_reports;
delete from public.assets where file_path like 'dt/%';
delete from public.rate_limits where key like 'dating-%';
delete from public.audit_logs where action like 'dating.%';

create or replace function pg_temp.as_user(u uuid) returns void language plpgsql as $$ begin reset role; perform set_config('request.jwt.claim.sub', u::text, false); perform set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated')::text, false); set role authenticated; end $$;
create or replace function pg_temp.as_anon() returns void language plpgsql as $$ begin reset role; perform set_config('request.jwt.claim.sub', '', false); perform set_config('request.jwt.claims', '', false); set role anon; end $$;
create or replace function pg_temp.su() returns void language plpgsql as $$ begin reset role; end $$;
-- jalankan perintah dan kembalikan kode galat ('' bila sukses)
create or replace function pg_temp.err(q text) returns text language plpgsql as $$ begin execute q; return ''; exception when others then return sqlerrm; end $$;

-- ===== data dasar (sebagai superuser) =====
create table pg_temp.ids (k text primary key, v uuid);
do $$ declare i int; u uuid; owner uuid; inv_l uuid; inv_e uuid; cat uuid; av uuid; begin
  for i in 1..7 loop u := gen_random_uuid(); insert into auth.users (id, email) values (u, 'dt.u' || i || '@uji.nusamora.test'); insert into pg_temp.ids values ('u' || i, u); end loop;
  owner := gen_random_uuid(); insert into auth.users (id, email) values (owner, 'dt.owner@uji.nusamora.test'); insert into pg_temp.ids values ('owner', owner);
  u := gen_random_uuid(); insert into auth.users (id, email) values (u, 'dt.admin@uji.nusamora.test'); insert into pg_temp.ids values ('admin', u);
  insert into public.admin_users (user_id, role) values (u, 'super_admin');
  insert into public.invitations (user_id, title, status, slug, plan_id, expires_at, content) values (owner, 'Uji Luxe', 'aktif', 'dt-luxe', 'luxe', now() + interval '30 days', '{}') returning id into inv_l;
  insert into public.invitations (user_id, title, status, slug, plan_id, expires_at, content) values (owner, 'Uji Essential', 'aktif', 'dt-ess', 'essential', now() + interval '30 days', '{}') returning id into inv_e;
  insert into pg_temp.ids values ('inv_l', inv_l), ('inv_e', inv_e);
  select id into cat from public.asset_categories where slug = 'guest-avatar';
  insert into public.assets (name, category_id, package_types, file_path, file_url, thumbnail_url, file_type, file_size, status) values ('Chibi uji', cat, '{luxe}', 'dt/av1.glb', 'https://x.test/av1.glb', 'https://x.test/av1.png', 'glb', 10, 'active') returning id into av;
  insert into pg_temp.ids values ('av', av);
end $$;
grant all on pg_temp.ids to public;

-- ===== 1. Usia & persetujuan wajib (server) =====
do $$ declare e text; u1 uuid := (select v from pg_temp.ids where k='u1'); u2 uuid := (select v from pg_temp.ids where k='u2'); pid jsonb; begin
  perform pg_temp.as_user(u1);
  e := pg_temp.err(format($q$select public.dating_upsert_profile('Ayu', %L, 'wanita', 'Semarang', null, 'halo', '{musik}', null, null, 'teman_baru')$q$, (current_date - interval '25 years')::date));
  assert e = 'persetujuan_wajib', 'profil tanpa consent harus ditolak: ' || e;
  e := pg_temp.err('select public.dating_accept_consent(true, true, false)'); assert e = 'persetujuan_lengkap_wajib', 'consent parsial: ' || e;
  e := pg_temp.err('select public.dating_accept_consent(false, true, true)'); assert e = 'persetujuan_lengkap_wajib', 'usia tidak dikonfirmasi: ' || e;
  e := pg_temp.err('select public.dating_accept_consent(true, true, true, ''hash'')'); assert e = '', 'consent lengkap: ' || e;
  e := pg_temp.err(format($q$select public.dating_upsert_profile('Ayu', %L, 'wanita', 'Semarang', null, 'halo', '{musik}', null, null, 'teman_baru')$q$, (current_date - interval '18 years' + interval '1 day')::date));
  assert e = 'usia_minimal_18', 'umur 17 tahun 364 hari harus ditolak: ' || e;
  e := pg_temp.err(format($q$select public.dating_upsert_profile('Ayu', %L, 'wanita', 'Semarang', null, 'halo', '{musik}', null, null, 'teman_baru')$q$, (current_date - interval '10 years')::date));
  assert e = 'usia_minimal_18', 'anak 10 tahun: ' || e;
  e := pg_temp.err(format($q$select public.dating_upsert_profile('Ayu', %L, 'wanita', 'Semarang', null, 'halo', '{musik}', null, null, 'teman_baru')$q$, (current_date - interval '18 years')::date));
  assert e = '', 'tepat 18 tahun diterima: ' || e;
  -- tabel menolak umur < 18 walau dilewati RPC (superuser)
  perform pg_temp.su();
  e := pg_temp.err(format($q$update public.dating_profiles set birth_date = %L where user_id = %L$q$, (current_date - interval '17 years')::date, u1));
  assert e like '%dating_profiles_birth_date_check%', 'check constraint DB: ' || e;
  -- klien tidak bisa menulis langsung ke tabel
  perform pg_temp.as_user(u1);
  assert pg_temp.err('insert into public.dating_profiles (user_id,nickname,birth_date,gender,city,intent) values (auth.uid(),''xx'',''1990-01-01'',''pria'',''Solo'',''teman_baru'')') like 'permission denied%', 'insert langsung profil';
  assert pg_temp.err('update public.dating_profiles set nickname = ''Hack''') like 'permission denied%', 'update langsung profil';
  raise notice 'OK 1: usia & consent';
end $$;

-- ===== 2. CRUD profil + sanitasi + isolasi baca =====
do $$ declare e text; u1 uuid := (select v from pg_temp.ids where k='u1'); u2 uuid := (select v from pg_temp.ids where k='u2'); av uuid := (select v from pg_temp.ids where k='av'); n int; b text; begin
  perform pg_temp.as_user(u1);
  e := pg_temp.err(format($q$select public.dating_upsert_profile('  Ayu <b>Sari</b>  ', %L, 'wanita', 'Semarang', %L, %L, '{musik,Musik,traveling,"<script>"}', 'S1', 'Desainer', 'teman_dekat')$q$,
        (current_date - interval '25 years')::date, av, repeat('x', 400)));
  assert e = '', 'update profil: ' || e;
  select nickname, char_length(bio) into b, n from public.dating_profiles; assert b = 'Ayu <b>Sari</b>' and n = 300, 'sanitasi/pemotongan: ' || b || ' ' || n;    -- HTML disimpan sebagai TEKS; klien wajib textContent
  assert (select count(*) from public.dating_profiles) = 1, 'hanya profil sendiri terlihat';
  e := pg_temp.err(format($q$select public.dating_upsert_profile('Ayu', %L, 'wanita', 'Semarang', %L, '', '{}', null, null, 'teman_baru')$q$, (current_date - interval '25 years')::date, gen_random_uuid()));
  assert e = 'avatar_tidak_valid', 'avatar sembarang ditolak: ' || e;
  e := pg_temp.err(format($q$select public.dating_upsert_profile('A', %L, 'wanita', 'Semarang', null, '', '{}', null, null, 'teman_baru')$q$, (current_date - interval '25 years')::date)); assert e = 'nama_panggilan_tidak_valid', 'nama pendek: ' || e;
  e := pg_temp.err(format($q$select public.dating_upsert_profile('Ayu', %L, 'x', 'Semarang', null, '', '{}', null, null, 'teman_baru')$q$, (current_date - interval '25 years')::date)); assert e = 'gender_tidak_valid', 'gender: ' || e;
  perform pg_temp.as_user(u2); assert (select count(*) from public.dating_profiles) = 0, 'pengguna lain tidak melihat profil u1 secara langsung';
  perform pg_temp.as_anon(); assert pg_temp.err('select * from public.dating_profiles') like 'permission denied%', 'anon tidak boleh baca profil';
  raise notice 'OK 2: profil';
end $$;

-- helper: buat profil lengkap untuk u2..u6 (gender/umur/kota/minat beragam)
do $$ declare i int; u uuid; g text[] := array['pria','pria','wanita','lainnya','pria','wanita']; y int[] := array[0,30,22,35,27,40]; c text[] := array['Solo','Semarang','Solo','Jakarta','Semarang','Solo']; h text[] := array['{musik,kuliner}','{traveling}','{musik}','{kuliner}','{traveling,musik}','{buku}']; begin
  for i in 2..6 loop
    select v into u from pg_temp.ids where k = 'u' || i; perform pg_temp.as_user(u);
    perform public.dating_accept_consent(true, true, true);
    perform public.dating_upsert_profile('Teman' || i, (current_date - make_interval(years => y[i]))::date, g[i], c[i], null, 'bio ' || i, h[i]::text[], null, null, 'teman_baru');
  end loop;
  -- u7: profil tanpa consent aktif (consent ditarik) untuk uji
  select v into u from pg_temp.ids where k = 'u7'; perform pg_temp.as_user(u); perform public.dating_accept_consent(true, true, true);
  perform public.dating_upsert_profile('Teman7', (current_date - interval '30 years')::date, 'pria', 'Solo', null, '', '{}', null, null, 'teman_baru');
  perform pg_temp.su();
end $$;

-- ===== 3. Pengaktifan acara oleh pemilik (opt-in, Luxe saja) =====
do $$ declare e text; o uuid := (select v from pg_temp.ids where k='owner'); u1 uuid := (select v from pg_temp.ids where k='u1'); l uuid := (select v from pg_temp.ids where k='inv_l'); es uuid := (select v from pg_temp.ids where k='inv_e'); j jsonb; begin
  perform pg_temp.as_user(u1);
  assert pg_temp.err(format('select public.dating_join(%L)', l)) = 'acara_tidak_tersedia', 'default MATI: join ditolak';
  assert pg_temp.err(format('select public.dating_owner_set_event(%L, true)', l)) = 'tidak_diizinkan', 'bukan pemilik tidak bisa menyalakan';
  perform pg_temp.as_user(o);
  assert pg_temp.err(format('select public.dating_owner_set_event(%L, true)', es)) = 'tidak_diizinkan', 'paket non-Luxe ditolak';
  assert pg_temp.err(format('select public.dating_owner_set_event(%L, true, 2, 7)', l)) = '', 'pemilik Luxe menyalakan (batas like 2/hari)';
  perform pg_temp.as_anon(); j := public.dating_stats(l); assert (j->>'available')::boolean and (j->>'active_participants')::int = 0, 'stats publik: ' || j;
  j := public.dating_stats(es); assert not (j->>'available')::boolean, 'acara non-Luxe tidak tersedia';
  raise notice 'OK 3: aktivasi acara';
end $$;

-- ===== 4. Join + discover + filter + kolom aman =====
do $$ declare l uuid := (select v from pg_temp.ids where k='inv_l'); i int; u uuid; n int; r record; cols text[]; e text; pid uuid; begin
  for i in 1..6 loop select v into u from pg_temp.ids where k = 'u' || i; perform pg_temp.as_user(u); perform public.dating_join(l); end loop;
  select v into u from pg_temp.ids where k = 'u7'; perform pg_temp.as_user(u);
  assert pg_temp.err(format('select * from public.dating_discover(%L)', l)) = 'bukan_peserta', 'bukan peserta tidak bisa discover';
  select v into u from pg_temp.ids where k = 'u1'; perform pg_temp.as_user(u);
  select count(*) into n from public.dating_discover(l); assert n = 5, 'u1 melihat 5 peserta lain, bukan dirinya: ' || n;
  select array_agg(a.attname::text order by a.attnum) into cols from pg_proc p join pg_attribute a on false where false; -- placeholder
  select count(*) into n from public.dating_discover(l, '{"gender":["wanita"]}'); assert n = 2, 'filter gender wanita: ' || n;
  select count(*) into n from public.dating_discover(l, '{"age_min":26,"age_max":36}'); assert n = 3, 'filter umur 26-36 (30,35,27): ' || n;
  select count(*) into n from public.dating_discover(l, '{"city":"solo"}'); assert n = 2, 'filter kota solo (u3,u6): ' || n;
  select count(*) into n from public.dating_discover(l, '{"interests":["MUSIK"]}'); assert n = 2, 'filter minat musik (u3,u5; tanpa peduli huruf besar): ' || n;
  select count(*) into n from public.dating_discover(l, '{"intent":["hubungan_serius"]}'); assert n = 0, 'filter tujuan: ' || n;
  select count(*) into n from public.dating_discover(l, '{"gender":["pria"],"city":"Semarang","age_min":28}'); assert n = 1, 'filter gabungan: ' || n;
  select count(*) into n from public.dating_discover(l, '{}', 100, 0); assert n <= 20, 'batas 20 per panggilan';
  -- kolom yang dikembalikan tidak memuat data sensitif
  select array_agg(column_name) into cols from (select unnest(proargnames) column_name from pg_proc where proname = 'dating_discover' and pronamespace = 'public'::regnamespace) q;
  assert not (cols && array['birth_date','user_id','email','whatsapp','phone']), 'kolom sensitif bocor: ' || cols::text;
  -- peserta dengan status jeda / sembunyi / consent ditarik tidak tampil
  select v into u from pg_temp.ids where k = 'u2'; perform pg_temp.as_user(u); perform public.dating_set_status(l, 'jeda');
  select v into u from pg_temp.ids where k = 'u1'; perform pg_temp.as_user(u);
  select count(*) into n from public.dating_discover(l); assert n = 4, 'peserta jeda tidak tampil: ' || n;
  select v into u from pg_temp.ids where k = 'u2'; perform pg_temp.as_user(u); perform public.dating_set_status(l, 'aktif');
  select v into u from pg_temp.ids where k = 'u3'; perform pg_temp.as_user(u); perform public.dating_withdraw_consent();
  select v into u from pg_temp.ids where k = 'u1'; perform pg_temp.as_user(u);
  select count(*) into n from public.dating_discover(l); assert n = 4, 'consent ditarik: tidak tampil: ' || n;
  select v into u from pg_temp.ids where k = 'u3'; perform pg_temp.as_user(u); perform public.dating_accept_consent(true, true, true); perform public.dating_join(l);
  select v into u from pg_temp.ids where k = 'u1'; perform pg_temp.as_user(u); assert (select count(*) from public.dating_discover(l)) = 5, 'consent baru: tampil lagi';
  perform pg_temp.as_user((select v from pg_temp.ids where k='u1'));
  assert (public.dating_stats(l)->>'active_participants')::int = 6, 'jumlah peserta aktif';
  raise notice 'OK 4: discover/filter';
end $$;

-- ===== 5. Like, mutual match, duplikat, batas harian =====
do $$ declare l uuid := (select v from pg_temp.ids where k='inv_l'); u1 uuid := (select v from pg_temp.ids where k='u1'); u2 uuid := (select v from pg_temp.ids where k='u2'); u3 uuid := (select v from pg_temp.ids where k='u3'); u4 uuid := (select v from pg_temp.ids where k='u4'); u5 uuid := (select v from pg_temp.ids where k='u5');
        p1 uuid; p2 uuid; p3 uuid; p4 uuid; p5 uuid; j jsonb; e text; n int; begin
  perform pg_temp.su(); select id into p1 from public.dating_profiles where user_id = u1; select id into p2 from public.dating_profiles where user_id = u2; select id into p3 from public.dating_profiles where user_id = u3; select id into p4 from public.dating_profiles where user_id = u4; select id into p5 from public.dating_profiles where user_id = u5;
  perform pg_temp.as_user(u1);
  assert pg_temp.err(format('select public.dating_like(%L, %L)', l, p1)) = 'target_tidak_valid', 'like diri sendiri';
  assert pg_temp.err(format('select public.dating_like(%L, %L)', l, gen_random_uuid())) = 'target_tidak_tersedia', 'like profil asing';
  j := public.dating_like(l, p2); assert not (j->>'matched')::boolean, 'like pertama belum match';
  j := public.dating_like(l, p2); assert (j->>'duplicate')::boolean, 'like ganda idempoten: ' || j;
  perform pg_temp.su(); assert (select count(*) from public.dating_likes where from_profile = p1 and to_profile = p2) = 1, 'tidak ada baris like ganda';
  perform pg_temp.as_user(u2); j := public.dating_like(l, p1);
  assert (j->>'matched')::boolean and (j->>'new_match')::boolean, 'saling like => match: ' || j;
  perform pg_temp.su();
  assert (select count(*) from public.dating_matches where invitation_id = l) = 1, 'tepat satu match';
  assert (select count(*) from public.dating_conversations) = 1 and (select count(*) from public.dating_messages where kind = 'system') = 1, 'satu percakapan + satu pesan sistem';
  assert (select profile_a < profile_b from public.dating_matches limit 1), 'pasangan berurutan';
  perform pg_temp.as_user(u1); j := public.dating_like(l, p2); assert (j->>'matched')::boolean and (j->>'duplicate')::boolean, 'like ulang setelah match idempoten';
  perform pg_temp.su(); assert (select count(*) from public.dating_matches) = 1, 'tidak ada match ganda setelah like ulang';
  -- tidak bisa menyisipkan match ganda terbalik (A,B) dan (B,A)
  assert pg_temp.err(format('insert into public.dating_matches (invitation_id, profile_a, profile_b) values (%L, %L, %L)', l, greatest(p1,p2), least(p1,p2))) like '%dating_matches_check%', 'urutan wajib a<b';
  -- pass tidak membentuk match & kartu hilang dari discover
  perform pg_temp.as_user(u1); perform public.dating_pass(l, p3);
  assert (select count(*) from public.dating_discover(l) where profile_id = p3) = 0, 'yang di-pass tidak tampil lagi';
  -- batas like harian (diset 2): like ke-2 ok (u1 sudah 1), ke-3 ditolak
  j := public.dating_like(l, p4); e := pg_temp.err(format('select public.dating_like(%L, %L)', l, p5));
  assert e = 'batas_like_harian', 'batas like harian: ' || e;
  -- like ditolak bila target dalam blokir
  raise notice 'OK 5: like/match';
end $$;

-- ===== 6. Chat: otorisasi, validasi, read status, rate limit, unmatch =====
do $$ declare l uuid := (select v from pg_temp.ids where k='inv_l'); u1 uuid := (select v from pg_temp.ids where k='u1'); u2 uuid := (select v from pg_temp.ids where k='u2'); u3 uuid := (select v from pg_temp.ids where k='u3');
        cid uuid; mid uuid; e text; n int; i int; j jsonb; p2 uuid; begin
  perform pg_temp.su(); select c.id, c.match_id into cid, mid from public.dating_conversations c limit 1; select id into p2 from public.dating_profiles where user_id = u2;
  perform pg_temp.as_user(u3);
  assert pg_temp.err(format($q$select public.dating_send_message(%L, 'halo')$q$, cid)) = 'tidak_ditemukan', 'non-anggota tidak bisa kirim';
  assert (select count(*) from public.dating_messages) = 0 and (select count(*) from public.dating_conversations) = 0 and (select count(*) from public.dating_matches) = 0, 'non-anggota tidak bisa membaca chat/match (RLS)';
  assert pg_temp.err(format('select public.dating_mark_read(%L)', cid)) = 'tidak_ditemukan', 'non-anggota tak bisa tandai baca';
  assert pg_temp.err(format('select public.dating_unmatch(%L)', mid)) = 'tidak_ditemukan', 'non-anggota tak bisa unmatch';
  assert pg_temp.err(format($q$insert into public.dating_messages (conversation_id, body) values (%L, 'x')$q$, cid)) like 'permission denied%', 'insert langsung pesan ditolak';
  perform pg_temp.as_user(u1);
  assert pg_temp.err(format($q$select public.dating_send_message(%L, '   ')$q$, cid)) = 'pesan_tidak_valid', 'pesan kosong';
  assert pg_temp.err(format($q$select public.dating_send_message(%L, %L)$q$, cid, repeat('a', 1001))) = 'pesan_tidak_valid', 'pesan > 1000';
  j := public.dating_send_message(cid, 'Halo 😊 <img src=x onerror=alert(1)>'); assert (j->>'ok')::boolean, 'kirim pesan';
  assert (select body from public.dating_messages where kind = 'user') = 'Halo 😊 <img src=x onerror=alert(1)>', 'emoji & teks disimpan apa adanya (dirender sebagai teks oleh klien)';
  perform pg_temp.as_user(u2);
  select count(*) into n from public.dating_my_matches() where unread = 1; assert n = 1, 'unread count = 1';
  assert (select last_body from public.dating_my_matches()) like 'Halo%', 'pesan terakhir';
  perform public.dating_mark_read(cid);
  assert (select unread from public.dating_my_matches()) = 0, 'setelah dibaca unread 0';
  assert (select read_at is not null from public.dating_messages where kind = 'user'), 'read_at terisi';
  -- rate limit pesan 30/menit: u1 sudah kirim 1; kirim 29 lagi lolos, berikutnya ditolak
  perform pg_temp.as_user(u1);
  for i in 1..29 loop perform public.dating_send_message(cid, 'pesan ' || i); end loop;
  e := pg_temp.err(format($q$select public.dating_send_message(%L, 'spam')$q$, cid)); assert e = 'terlalu_banyak_permintaan', 'rate limit pesan: ' || e;
  -- unmatch menutup percakapan dua arah
  perform pg_temp.as_user(u2); perform public.dating_unmatch(mid);
  perform pg_temp.as_user(u1);
  assert pg_temp.err(format($q$select public.dating_send_message(%L, 'masih bisa?')$q$, cid)) in ('percakapan_ditutup','terlalu_banyak_permintaan'), 'setelah unmatch tidak bisa kirim';
  assert (select count(*) from public.dating_my_matches()) = 0, 'unmatch menghilang dari daftar';
  perform pg_temp.su(); delete from public.rate_limits where key like 'dating-%';
  perform pg_temp.as_user(u1); assert pg_temp.err(format($q$select public.dating_send_message(%L, 'masih bisa?')$q$, cid)) = 'percakapan_ditutup', 'unmatch: ditutup';
  e := pg_temp.err(format('select public.dating_like(%L, %L)', l, p2)); assert e = '', 'like ulang tidak error: ' || e;
  assert (select count(*) from public.dating_matches where status = 'aktif') = 0, 'pasangan unmatch tidak dicocokkan ulang';
  raise notice 'OK 6: chat';
end $$;

-- ===== 7. Block dua arah =====
do $$ declare l uuid := (select v from pg_temp.ids where k='inv_l'); u4 uuid := (select v from pg_temp.ids where k='u4'); u5 uuid := (select v from pg_temp.ids where k='u5'); p4 uuid; p5 uuid; j jsonb; cid uuid; n int; begin
  perform pg_temp.su(); delete from public.rate_limits where key like 'dating-%'; select id into p4 from public.dating_profiles where user_id = u4; select id into p5 from public.dating_profiles where user_id = u5;
  perform pg_temp.as_user(u4); perform public.dating_like(l, p5); perform pg_temp.as_user(u5); j := public.dating_like(l, p4); cid := (j->>'conversation_id')::uuid; assert (j->>'matched')::boolean, 'match u4-u5';
  perform public.dating_send_message(cid, 'hai');
  perform pg_temp.as_user(u4); perform public.dating_block(p5);
  assert (select count(*) from public.dating_discover(l) where profile_id = p5) = 0, 'pemblokir tidak melihat yang diblokir';
  perform pg_temp.as_user(u5);
  assert (select count(*) from public.dating_discover(l) where profile_id = p4) = 0, 'yang diblokir tidak melihat pemblokir (dua arah)';
  assert pg_temp.err(format($q$select public.dating_send_message(%L, 'tolong')$q$, cid)) = 'percakapan_ditutup', 'diblokir tak bisa kirim';
  assert pg_temp.err(format('select public.dating_like(%L, %L)', l, p4)) = 'target_tidak_tersedia', 'diblokir tak bisa like';
  assert (select count(*) from public.dating_my_matches()) = 0, 'match hilang dari daftar';
  perform pg_temp.su(); assert (select status from public.dating_matches where id = (select match_id from public.dating_conversations where id = cid)) = 'diblokir', 'status match diblokir';
  perform pg_temp.as_user(u4); perform public.dating_unblock(p5);
  assert (select status from public.dating_matches where id = (select match_id from public.dating_conversations where id = cid)) = 'diblokir', 'unblock tidak menghidupkan match lama';
  raise notice 'OK 7: block';
end $$;

-- ===== 8. Report + moderasi + audit + RBAC =====
do $$ declare l uuid := (select v from pg_temp.ids where k='inv_l'); u1 uuid := (select v from pg_temp.ids where k='u1'); u6 uuid := (select v from pg_temp.ids where k='u6'); u7 uuid := (select v from pg_temp.ids where k='u7'); u5 uuid := (select v from pg_temp.ids where k='u5'); ad uuid := (select v from pg_temp.ids where k='admin');
        p4 uuid; p5 uuid; p6 uuid; p7 uuid; j jsonb; rid uuid; e text; n int; st text; begin
  perform pg_temp.su(); delete from public.rate_limits where key like 'dating-%'; select id into p4 from public.dating_profiles where user_id = (select v from pg_temp.ids where k='u4'); select id into p5 from public.dating_profiles where user_id = u5; select id into p6 from public.dating_profiles where user_id = u6; select id into p7 from public.dating_profiles where user_id = u7;
  -- u7 bukan peserta acara => tidak boleh melapor
  perform pg_temp.as_user(u7); assert pg_temp.err(format($q$select public.dating_report(%L, %L, 'spam')$q$, l, p5)) = 'tidak_diizinkan', 'bukan peserta tidak bisa melapor';
  -- u5 melaporkan u4 (pernah match + ada pesan) => bukti dibekukan
  perform pg_temp.as_user(u5); j := public.dating_report(l, p4, 'pelecehan', 'kata kasar');
  assert (j->>'ok')::boolean and j ? 'report_id', 'laporan dibuat: ' || j; rid := (j->>'report_id')::uuid;
  j := public.dating_report(l, p4, 'pelecehan'); assert (j->>'duplicate')::boolean, 'laporan terbuka ganda ditolak';
  assert (select count(*) from public.dating_reports) = 1, 'pelapor melihat laporannya sendiri';
  assert pg_temp.err(format($q$select public.dating_report(%L, %L, 'karangan')$q$, l, p6)) = 'alasan_tidak_valid', 'alasan harus dari daftar';
  perform pg_temp.as_user(u1); assert (select count(*) from public.dating_reports) = 0, 'pengguna lain tidak melihat laporan';
  assert pg_temp.err('select * from public.dating_admin_reports()') like '%forbidden%', 'non-admin tak bisa antrean moderasi';
  assert pg_temp.err(format($q$select public.dating_admin_resolve_report(%L, 'selesai')$q$, rid)) like '%forbidden%', 'non-admin tak bisa memutuskan';
  assert pg_temp.err(format('select public.dating_admin_set_event(%L, false)', l)) like '%forbidden%', 'non-admin tak bisa menonaktifkan acara';
  -- admin
  perform pg_temp.as_user(ad);
  select count(*) into n from public.dating_admin_reports('baru'); assert n = 1, 'admin melihat antrean: ' || n;
  assert (select jsonb_array_length(evidence) from public.dating_admin_reports('baru') limit 1) >= 1, 'bukti pesan dibekukan';
  assert pg_temp.err('select * from public.dating_messages') like 'permission denied%' or (select count(*) from public.dating_messages) = 0, 'admin TIDAK membaca chat bebas';
  j := public.dating_admin_resolve_report(rid, 'tangguhkan', 'terbukti'); assert j->>'status' = 'ditangguhkan', 'tangguhkan: ' || j;
  perform pg_temp.su();
  assert (select status from public.dating_event_participants where profile_id = (select id from public.dating_profiles where user_id = (select v from pg_temp.ids where k='u4'))) = 'ditangguhkan', 'peserta ditangguhkan';
  assert exists (select 1 from public.audit_logs where action = 'dating.report.tangguhkan'), 'audit log tercatat';
  perform pg_temp.as_user((select v from pg_temp.ids where k='u4'));
  assert pg_temp.err(format('select public.dating_join(%L)', l)) = 'akses_ditangguhkan', 'ditangguhkan tak bisa join ulang';
  assert pg_temp.err(format($q$select public.dating_set_status(%L, 'aktif')$q$, l)) = 'tidak_ditemukan', 'ditangguhkan tak bisa mengaktifkan diri';
  -- admin menonaktifkan acara => pemilik tak bisa menyalakannya lagi
  perform pg_temp.as_user(ad); perform public.dating_admin_set_event(l, false);
  perform pg_temp.as_user((select v from pg_temp.ids where k='owner')); assert pg_temp.err(format('select public.dating_owner_set_event(%L, true)', l)) = 'dinonaktifkan_admin', 'penonaktifan admin dihormati';
  perform pg_temp.as_user(u1); assert pg_temp.err(format('select * from public.dating_discover(%L)', l)) = 'acara_tidak_tersedia', 'acara nonaktif: discover ditolak';
  raise notice 'OK 8: report/moderasi';
end $$;

-- ===== 9. Akses langsung tabel & anon =====
do $$ declare t text; u1 uuid := (select v from pg_temp.ids where k='u1'); l uuid := (select v from pg_temp.ids where k='inv_l'); begin
  perform pg_temp.as_user(u1);
  foreach t in array array['dating_likes','dating_event_settings'] loop assert pg_temp.err('select * from public.' || t) like 'permission denied%', 'select langsung ' || t; end loop;
  foreach t in array array['dating_matches','dating_conversations','dating_messages','dating_blocks','dating_reports','dating_event_participants','dating_consents','dating_notifications'] loop
    assert pg_temp.err(format('insert into public.%I select * from public.%I limit 0', t, t)) like 'permission denied%', 'insert langsung ' || t;
    assert pg_temp.err(format('delete from public.%I', t)) like 'permission denied%', 'delete langsung ' || t;
  end loop;
  perform pg_temp.as_anon();
  assert (public.dating_stats(l)) is not null, 'anon boleh statistik';
  assert pg_temp.err(format('select public.dating_like(%L, %L)', l, gen_random_uuid())) like 'permission denied%', 'anon tak bisa like';
  assert pg_temp.err(format('select * from public.dating_discover(%L)', l)) like 'permission denied%', 'anon tak bisa discover';
  assert pg_temp.err('select public.dating_my_profile()') like 'permission denied%', 'anon tak bisa fungsi profil';
  assert pg_temp.err('select public._dating_uid()') like 'permission denied%', 'helper internal tidak terbuka';
  assert pg_temp.err('select public.dating_accept_consent(true,true,true)') like 'permission denied%', 'anon tak bisa consent';
  -- pengguna tanpa JWT sub tidak bisa memakai RPC
  perform pg_temp.su(); perform set_config('request.jwt.claim.sub', '', false); perform set_config('request.jwt.claims', '', false); set role authenticated;
  assert pg_temp.err(format('select public.dating_like(%L, %L)', l, gen_random_uuid())) like '%unauthorized%', 'tanpa sub => unauthorized';
  raise notice 'OK 9: akses langsung';
end $$;

-- ===== 10. Hapus profil =====
do $$ declare u5 uuid := (select v from pg_temp.ids where k='u5'); u1 uuid := (select v from pg_temp.ids where k='u1'); p5 uuid; n int; begin
  perform pg_temp.su(); select id into p5 from public.dating_profiles where user_id = u5;
  perform pg_temp.as_user(u5); perform public.dating_delete_my_profile();
  perform pg_temp.su();
  assert not exists (select 1 from public.dating_profiles where user_id = u5), 'profil terhapus';
  assert (select count(*) from public.dating_event_participants where profile_id = p5) = 0 and (select count(*) from public.dating_likes where from_profile = p5 or to_profile = p5) = 0
     and (select count(*) from public.dating_matches where p5 in (profile_a, profile_b)) = 0, 'turunan terhapus (partisipasi/like/match)';
  assert (select count(*) from public.dating_reports) = 1 and (select reporter from public.dating_reports limit 1) is null, 'laporan tetap ada tanpa tautan profil';
  assert not (select consent_active from (select bool_or(withdrawn_at is null) consent_active from public.dating_consents where user_id = u5) q), 'consent ditandai ditarik';
  raise notice 'OK 10: hapus profil';
end $$;
-- pembersihan: tidak meninggalkan akun/admin/undangan uji (tes lain, mis. MFA, bergantung pada admin_users bersih)
reset role;
delete from public.dating_reports;
delete from auth.users where email like 'dt.%@uji.nusamora.test';
delete from public.invitations where slug like 'dt-%';
delete from public.assets where file_path like 'dt/%';
delete from public.rate_limits where key like 'dating-%';
delete from public.audit_logs where action like 'dating.%';
select 'SEMUA UJI DB DATING LULUS' as hasil;
