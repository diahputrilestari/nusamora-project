-- Uji DB artikel-interaksi.sql: suka (tanpa duplikat), komentar bersarang, moderasi, reaksi, laporan, simpan, feedback, jumlah dibaca, notifikasi, hak akses.
\set ON_ERROR_STOP on
\set QUIET on
reset role;
delete from public.contents where title like 'AI %';
delete from auth.users where email like 'ai.%@uji.nusamora.test';
delete from public.article_settings;
delete from public.rate_limits where key like 'cmt-%' or key like 'like-%' or key like 'clike-%' or key like 'fb-%' or key like 'view-%' or key like 'save-%' or key like 'report-%';
insert into public.article_settings (key, value) values ('comments_enabled','true'),('guest_comments','false'),('premoderate','false'),('max_links','2'),('blocked_words','["judi online"]'),('max_length','2000');
create or replace function pg_temp.as_user(u uuid) returns void language plpgsql as $$ begin reset role; perform set_config('request.jwt.claim.sub', u::text, false); perform set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated')::text, false); set role authenticated; end $$;
grant execute on function pg_temp.as_user(uuid) to public;
create or replace function pg_temp.as_anon() returns void language plpgsql as $$ begin reset role; perform set_config('request.jwt.claim.sub', '', false); perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, false); set role anon; end $$;
grant execute on function pg_temp.as_anon() to public;
do $$ declare a uuid := gen_random_uuid(); b uuid := gen_random_uuid(); m uuid := gen_random_uuid(); s uuid := gen_random_uuid(); art uuid; art2 uuid; begin
  insert into auth.users (id, email) values (a, 'ai.a@uji.nusamora.test'), (b, 'ai.b@uji.nusamora.test'), (m, 'ai.mod@uji.nusamora.test'), (s, 'ai.sup@uji.nusamora.test');
  insert into public.profiles (id, full_name) values (a, 'Rani Putri Lestari'), (b, 'Budi'), (m, 'Moderator Uji'), (s, 'Support Uji') on conflict (id) do update set full_name = excluded.full_name;
  insert into public.admin_users (user_id, role) values (m, 'content'), (s, 'support');
  insert into public.contents (type, title, slug, lang, body, excerpt, status, published_at) values ('article', 'AI Artikel Satu', 'ai-artikel-satu', 'id', 'isi satu dua tiga', 'x', 'published', now()) returning id into art;
  insert into public.contents (type, title, slug, lang, body, status) values ('article', 'AI Draft', 'ai-draft', 'id', 'isi', 'draft') returning id into art2;
  perform set_config('ai.a', a::text, false); perform set_config('ai.b', b::text, false); perform set_config('ai.m', m::text, false); perform set_config('ai.s', s::text, false); perform set_config('ai.art', art::text, false);
end $$;

-- 1. Akses langsung ke tabel ditutup
do $$ begin
  perform pg_temp.as_user(current_setting('ai.a')::uuid);
  begin perform count(*) from public.article_likes; raise exception 'FAIL: baca article_likes terbuka'; exception when insufficient_privilege then null; end;
  begin insert into public.article_comments (content_id, user_id, body, status) values (current_setting('ai.art')::uuid, current_setting('ai.a')::uuid, 'langsung', 'approved'); raise exception 'FAIL: insert langsung'; exception when insufficient_privilege then null; end;
  if (select count(*) from public.article_comments) > 0 then raise exception 'FAIL: pelanggan membaca komentar mentah (RLS)'; end if;
  raise notice 'OK 1: tabel tidak bisa diakses langsung oleh pelanggan';
end $$;

-- 2. Suka: tanpa duplikat, masuk/keluar, tamu dan pengguna
do $$ declare r jsonb; e jsonb; begin
  perform pg_temp.as_anon();
  r := public.article_like_toggle('ai-artikel-satu', 'id', 'anonanonanonanon1'); if not (r ->> 'liked')::boolean or (r ->> 'likes')::int <> 1 then raise exception 'like tamu: %', r; end if;
  r := public.article_like_toggle('ai-artikel-satu', 'id', 'anonanonanonanon1'); if (r ->> 'liked')::boolean or (r ->> 'likes')::int <> 0 then raise exception 'unlike tamu: %', r; end if;
  r := public.article_like_toggle('ai-artikel-satu', 'id', 'anonanonanonanon1');
  r := public.article_like_toggle('ai-artikel-satu', 'id', 'x'); if r ->> 'error' <> 'identitas_tidak_valid' then raise exception 'anon pendek: %', r; end if;
  perform pg_temp.as_user(current_setting('ai.a')::uuid);
  r := public.article_like_toggle('ai-artikel-satu'); if (r ->> 'likes')::int <> 2 then raise exception 'like user: %', r; end if;
  e := public.article_engagement('ai-artikel-satu'); if (e ->> 'likes')::int <> 2 or not (e ->> 'liked')::boolean then raise exception 'engagement: %', e; end if;
  r := public.article_like_toggle('ai-draft'); if r ->> 'error' <> 'tidak_ditemukan' then raise exception 'draft tidak boleh disukai: %', r; end if;
  reset role; if (select count(*) from public.article_likes where content_id = current_setting('ai.art')::uuid) <> 2 then raise exception 'baris like'; end if;
  begin insert into public.article_likes (content_id, viewer) values (current_setting('ai.art')::uuid, 'a:anonanonanonanon1'); raise exception 'FAIL: duplikat suka lolos'; exception when unique_violation then null; end;
  raise notice 'OK 2: suka (toggle, tamu+pengguna, duplikat ditolak constraint, draft ditolak)';
end $$;

-- 3. Komentar: login, validasi, balasan bersarang, edit, hapus
do $$ declare r jsonb; c1 uuid; c2 uuid; c3 uuid; l jsonb; begin
  perform pg_temp.as_anon();
  r := public.article_comment_add('ai-artikel-satu', 'Halo dunia', 'id', null, null, 'anonanonanonanon1'); if r ->> 'error' <> 'login_diperlukan' then raise exception 'tamu nonaktif: %', r; end if;
  perform pg_temp.as_user(current_setting('ai.a')::uuid);
  r := public.article_comment_add('ai-artikel-satu', 'x'); if r ->> 'error' <> 'komentar_terlalu_pendek' then raise exception 'pendek: %', r; end if;
  r := public.article_comment_add('ai-artikel-satu', repeat('a', 2001)); if r ->> 'error' <> 'komentar_terlalu_panjang' then raise exception 'panjang: %', r; end if;
  r := public.article_comment_add('ai-draft', 'komentar di draft'); if r ->> 'error' <> 'tidak_ditemukan' then raise exception 'draft: %', r; end if;
  r := public.article_comment_add('ai-artikel-satu', '<script>alert(1)</script> artikel bagus'); if not (r ->> 'ok')::boolean or r ->> 'status' <> 'approved' then raise exception 'tambah: %', r; end if; c1 := (r ->> 'id')::uuid;
  r := public.article_comment_add('ai-artikel-satu', '<script>alert(1)</script> artikel bagus'); if r ->> 'error' <> 'komentar_duplikat' then raise exception 'duplikat: %', r; end if;
  perform pg_temp.as_user(current_setting('ai.b')::uuid);
  r := public.article_comment_add('ai-artikel-satu', 'Setuju sekali', 'id', c1); c2 := (r ->> 'id')::uuid; if r ->> 'status' <> 'approved' then raise exception 'balas: %', r; end if;
  perform pg_temp.as_user(current_setting('ai.a')::uuid);
  r := public.article_comment_add('ai-artikel-satu', 'Terima kasih Budi', 'id', c2); c3 := (r ->> 'id')::uuid;
  reset role; if (select parent_id from public.article_comments where id = c3) <> c1 or (select reply_to_id from public.article_comments where id = c3) <> c2 then raise exception 'utas dua tingkat'; end if;
  perform pg_temp.as_anon();
  l := public.article_comments_list('ai-artikel-satu', 'id', 'newest', 10, 0, null);
  if (l ->> 'total')::int <> 1 or jsonb_array_length(l -> 'items' -> 0 -> 'replies') <> 2 then raise exception 'daftar: %', l; end if;
  if l -> 'items' -> 0 ->> 'name' <> 'Rani L.' then raise exception 'nama harus disingkat: %', l -> 'items' -> 0; end if;
  if (l -> 'items' -> 0 -> 'replies' -> 1 ->> 'reply_to') <> 'Budi' then raise exception 'reply_to: %', l; end if;
  if l::text like '%@uji.nusamora.test%' or l::text like '%user_id%' then raise exception 'data privat bocor: %', l; end if;
  if l -> 'items' -> 0 ->> 'body' not like '<script>%' then raise exception 'isi harus apa adanya (klien yang escape): %', l; end if;
  -- edit: hanya pemilik
  perform pg_temp.as_user(current_setting('ai.b')::uuid);
  r := public.article_comment_edit(c1, 'dibajak'); if r ->> 'error' <> 'tidak_diizinkan' then raise exception 'edit orang lain: %', r; end if;
  r := public.article_comment_delete(c1); if r ->> 'error' <> 'tidak_diizinkan' then raise exception 'hapus orang lain: %', r; end if;
  r := public.article_comment_edit(c2, 'Setuju banget'); if not (r ->> 'ok')::boolean then raise exception 'edit sendiri: %', r; end if;
  perform pg_temp.as_user(current_setting('ai.a')::uuid);
  r := public.article_comment_delete(c1); if not (r ->> 'ok')::boolean then raise exception 'hapus: %', r; end if;
  l := public.article_comments_list('ai-artikel-satu', 'id', 'newest', 10, 0, null);
  if (l -> 'items' -> 0 ->> 'deleted')::boolean is not true or l -> 'items' -> 0 ->> 'body' is not null or jsonb_array_length(l -> 'items' -> 0 -> 'replies') <> 2 then raise exception 'hapus lunak: %', l; end if;
  raise notice 'OK 3: komentar (login, validasi, duplikat, utas, nama disingkat, privasi, edit/hapus hanya pemilik, hapus lunak)';
end $$;

-- 4. Komentar tamu (diaktifkan admin), moderasi, spam, kata terlarang, tautan
do $$ declare r jsonb; g uuid; l jsonb; cnt int; begin
  reset role; update public.article_settings set value = 'true' where key = 'guest_comments';
  perform pg_temp.as_anon();
  r := public.article_comment_add('ai-artikel-satu', 'Komentar tamu', 'id', null, 'T', 'anonanonanonanon2'); if r ->> 'error' <> 'nama_tidak_valid' then raise exception 'nama tamu: %', r; end if;
  r := public.article_comment_add('ai-artikel-satu', 'Komentar tamu', 'id', null, 'Tamu Baik', 'anonanonanonanon2', 'isi-bot'); if r ->> 'status' <> 'pending' or r ? 'id' then raise exception 'honeypot: %', r; end if;
  r := public.article_comment_add('ai-artikel-satu', 'Komentar tamu', 'id', null, 'Tamu Baik', 'anonanonanonanon2'); if r ->> 'status' <> 'pending' then raise exception 'tamu pending: %', r; end if; g := (r ->> 'id')::uuid;
  l := public.article_comments_list('ai-artikel-satu', 'id', 'newest', 10, 0, 'anonanonanonanon2'); if (l ->> 'total')::int <> 2 then raise exception 'tamu melihat miliknya: %', l; end if;
  l := public.article_comments_list('ai-artikel-satu', 'id', 'newest', 10, 0, null); if (l ->> 'total')::int <> 1 then raise exception 'publik tidak boleh melihat pending: %', l; end if;
  r := public.article_comment_add('ai-artikel-satu', 'Mau judi online murah', 'id', null, 'Spammer', 'anonanonanonanon3'); reset role; if (select status from public.article_comments where id = (r ->> 'id')::uuid) <> 'spam' then raise exception 'kata terlarang'; end if;
  perform pg_temp.as_user(current_setting('ai.b')::uuid);
  r := public.article_comment_add('ai-artikel-satu', 'cek http://a.com http://b.com http://c.com'); if r ->> 'status' <> 'pending' then raise exception 'terlalu banyak tautan: %', r; end if;
  -- laju: 6 per 10 menit per pengguna
  reset role; delete from public.rate_limits where key = 'cmt-u-' || current_setting('ai.b'); perform pg_temp.as_user(current_setting('ai.b')::uuid);
  for i in 1..6 loop r := public.article_comment_add('ai-artikel-satu', 'komentar ke ' || i || ' halo'); end loop;
  r := public.article_comment_add('ai-artikel-satu', 'komentar tujuh halo'); if r ->> 'error' <> 'terlalu_banyak_permintaan' then raise exception 'laju: %', r; end if;
  raise notice 'OK 4: tamu (moderasi paksa, honeypot, nama), kata terlarang, tautan berlebih, pembatasan laju';
end $$;

-- 5. Moderasi admin + hak akses + notifikasi
do $$ declare r jsonb; g uuid; l jsonb; n jsonb; ra uuid; begin
  reset role; select id into g from public.article_comments where guest_name = 'Tamu Baik' and status = 'pending' limit 1;
  perform pg_temp.as_user(current_setting('ai.a')::uuid);
  begin perform public.admin_comments_list(); raise exception 'FAIL: pelanggan memanggil admin'; exception when sqlstate '42501' then null; end;
  begin perform public.admin_comment_set_status(g, 'approved'); raise exception 'FAIL: set status oleh pelanggan'; exception when sqlstate '42501' then null; end;
  perform pg_temp.as_user(current_setting('ai.s')::uuid);
  l := public.admin_comments_list('pending'); if (l ->> 'total')::int < 1 then raise exception 'support boleh baca: %', l; end if;
  begin perform public.admin_comment_set_status(g, 'approved'); raise exception 'FAIL: support tanpa content.write'; exception when sqlstate '42501' then null; end;
  perform pg_temp.as_user(current_setting('ai.m')::uuid);
  r := public.admin_comment_set_status(g, 'approved'); if not (r ->> 'ok')::boolean then raise exception 'setujui: %', r; end if;
  r := public.admin_comment_set_status(g, 'bukan'); if r ->> 'error' <> 'status_tidak_valid' then raise exception 'status tak valid: %', r; end if;
  -- balasan tim pada komentar Rani (c1 sudah dihapus lunak): pakai balasan Budi
  reset role; select id into ra from public.article_comments where user_id = current_setting('ai.b')::uuid and parent_id is not null and status = 'approved' limit 1;
  perform pg_temp.as_user(current_setting('ai.m')::uuid);
  r := public.admin_comment_reply(ra, 'Terima kasih atas masukannya!'); if not (r ->> 'ok')::boolean then raise exception 'balas tim: %', r; end if;
  perform pg_temp.as_anon(); l := public.article_comments_list('ai-artikel-satu', 'id', 'oldest', 10, 0, null);
  if not exists (select 1 from jsonb_array_elements(l -> 'items') i, jsonb_array_elements(i -> 'replies') rp where (rp ->> 'team')::boolean and rp ->> 'name' = 'Tim NusaMora') then raise exception 'badge tim: %', l; end if;
  -- notifikasi: Budi dibalas Rani + tim; Rani menerima 'reply' dari Budi
  perform pg_temp.as_user(current_setting('ai.b')::uuid); n := public.my_article_notifs(); if (n ->> 'unread')::int < 1 then raise exception 'notif balasan Budi: %', n; end if;
  r := public.article_notifs_read(); n := public.my_article_notifs(); if (n ->> 'unread')::int <> 0 then raise exception 'tandai dibaca: %', n; end if;
  perform pg_temp.as_user(current_setting('ai.a')::uuid); n := public.my_article_notifs(); if not exists (select 1 from jsonb_array_elements(n -> 'items') i where i ->> 'kind' = 'reply') then raise exception 'notif reply Rani: %', n; end if;
  -- preferensi
  r := public.article_notif_prefs_set(false, true, true); if (r ->> 'reply')::boolean then raise exception 'pref: %', r; end if;
  raise notice 'OK 5: moderasi (read/write dipisah), balasan tim, notifikasi (balasan, dibaca, preferensi)';
end $$;

-- 6. Reaksi komentar, laporan otomatis menyembunyikan
do $$ declare r jsonb; c uuid; l jsonb; begin
  reset role; select id into c from public.article_comments where user_id = current_setting('ai.b')::uuid and parent_id is not null and status = 'approved' and is_team = false order by created_at limit 1;
  perform pg_temp.as_anon();
  r := public.comment_like_toggle(c, 'anonanonanonanon4'); if not (r ->> 'liked')::boolean or (r ->> 'likes')::int <> 1 then raise exception 'reaksi: %', r; end if;
  perform pg_temp.as_user(current_setting('ai.a')::uuid);
  r := public.comment_like_toggle(c); if (r ->> 'likes')::int <> 2 then raise exception 'reaksi 2: %', r; end if;
  r := public.comment_like_toggle(c); if (r ->> 'likes')::int <> 1 or (r ->> 'liked')::boolean then raise exception 'batal: %', r; end if;
  r := public.comment_like_toggle(c); 
  reset role; begin insert into public.comment_reactions (comment_id, viewer) values (c, 'a:anonanonanonanon4'); raise exception 'FAIL: reaksi ganda'; exception when unique_violation then null; end;
  if (select like_count from public.article_comments where id = c) <> 2 then raise exception 'like_count sinkron'; end if;
  perform pg_temp.as_user(current_setting('ai.b')::uuid); r := public.my_article_notifs(); if not exists (select 1 from jsonb_array_elements(r -> 'items') i where i ->> 'kind' = 'reaction') then raise exception 'notif reaksi: %', r; end if;
  -- laporan: 3 pelapor menyembunyikan otomatis
  perform pg_temp.as_anon();
  r := public.comment_report(c, 'ab', 'anonanonanonanon5'); if r ->> 'error' <> 'alasan_tidak_valid' then raise exception 'alasan: %', r; end if;
  perform public.comment_report(c, 'spam promosi', 'anonanonanonanon5'); perform public.comment_report(c, 'spam promosi', 'anonanonanonanon5');
  reset role; if (select status from public.article_comments where id = c) <> 'approved' then raise exception 'jangan sembunyikan sebelum 3'; end if;
  perform pg_temp.as_anon(); perform public.comment_report(c, 'menyinggung', 'anonanonanonanon6'); perform public.comment_report(c, 'menyinggung', 'anonanonanonanon7');
  reset role; if (select status from public.article_comments where id = c) <> 'pending' then raise exception 'sembunyi otomatis'; end if;
  perform pg_temp.as_user(current_setting('ai.m')::uuid); r := public.admin_reports_list(); if jsonb_array_length(r) <> 1 or (r -> 0 ->> 'count')::int <> 3 then raise exception 'daftar laporan: %', r; end if;
  r := public.admin_report_resolve(c, 'dismiss'); reset role; if (select status from public.article_comments where id = c) <> 'approved' or exists (select 1 from public.comment_reports where comment_id = c and status = 'open') then raise exception 'tolak laporan'; end if;
  raise notice 'OK 6: reaksi komentar (tanpa duplikat, hitungan sinkron, notifikasi), laporan (3 laporan menyembunyikan, admin meninjau)';
end $$;

-- 7. Simpan, feedback, jumlah dibaca, pengaturan per artikel, penulis
do $$ declare r jsonb; e jsonb; v bigint; art uuid := current_setting('ai.art')::uuid; au uuid; begin
  perform pg_temp.as_anon();
  begin r := public.article_save_set('ai-artikel-satu', 'id', true); raise exception 'FAIL: tamu bisa menyimpan'; exception when insufficient_privilege then null; end;
  perform pg_temp.as_user(current_setting('ai.a')::uuid);
  r := public.article_save_set('ai-artikel-satu', 'id', true); r := public.article_save_set('ai-artikel-satu', 'id', true);
  r := public.my_saved_articles(); if jsonb_array_length(r) <> 1 or r -> 0 ->> 'slug' <> 'ai-artikel-satu' then raise exception 'daftar simpan: %', r; end if;
  e := public.article_engagement('ai-artikel-satu'); if not (e ->> 'saved')::boolean then raise exception 'saved flag: %', e; end if;
  perform pg_temp.as_user(current_setting('ai.b')::uuid); r := public.my_saved_articles(); if jsonb_array_length(r) <> 0 then raise exception 'simpanan privat: %', r; end if;
  perform pg_temp.as_user(current_setting('ai.a')::uuid); r := public.article_save_set('ai-artikel-satu', 'id', false); r := public.my_saved_articles(); if jsonb_array_length(r) <> 0 then raise exception 'hapus simpanan: %', r; end if;
  -- feedback (satu suara per pembaca, boleh diganti)
  perform pg_temp.as_anon();
  r := public.article_feedback_set('ai-artikel-satu', 'luar_biasa', 'id', 'anonanonanonanon8'); if r ->> 'error' <> 'nilai_tidak_valid' then raise exception 'nilai: %', r; end if;
  r := public.article_feedback_set('ai-artikel-satu', 'helpful', 'id', 'anonanonanonanon8'); r := public.article_feedback_set('ai-artikel-satu', 'not_helpful', 'id', 'anonanonanonanon8');
  perform pg_temp.as_user(current_setting('ai.m')::uuid); r := public.admin_article_stats();
  if (select (x ->> 'fb_not')::int from jsonb_array_elements(r) x where x ->> 'slug' = 'ai-artikel-satu') <> 1 or (select (x ->> 'fb_helpful')::int from jsonb_array_elements(r) x where x ->> 'slug' = 'ai-artikel-satu') <> 0 then raise exception 'agregat feedback: %', r; end if;
  -- jumlah dibaca: satu per pembaca per hari
  perform pg_temp.as_anon();
  v := public.article_track_view('ai-artikel-satu', 'id', 'anonanonanonanon9'); v := public.article_track_view('ai-artikel-satu', 'id', 'anonanonanonanon9'); if v <> 1 then raise exception 'view dedupe: %', v; end if;
  v := public.article_track_view('ai-artikel-satu', 'id', 'anonanonanonanona'); if v <> 2 then raise exception 'view kedua: %', v; end if;
  -- komentar ditutup per artikel dan global
  perform pg_temp.as_user(current_setting('ai.m')::uuid); r := public.admin_article_flag_set(art, false);
  perform pg_temp.as_user(current_setting('ai.a')::uuid); reset role; delete from public.rate_limits where key like 'cmt-%'; perform pg_temp.as_user(current_setting('ai.a')::uuid);
  r := public.article_comment_add('ai-artikel-satu', 'komentar saat ditutup'); if r ->> 'error' <> 'komentar_ditutup' then raise exception 'ditutup: %', r; end if;
  perform pg_temp.as_user(current_setting('ai.m')::uuid); r := public.admin_article_flag_set(art, true);
  r := public.admin_article_settings_set('guest_comments', '"ya"'); if r ->> 'error' <> 'nilai_tidak_valid' then raise exception 'pengaturan tak valid: %', r; end if;
  r := public.admin_article_settings_set('max_links', '99'); if r ->> 'error' <> 'nilai_tidak_valid' then raise exception 'max_links: %', r; end if;
  r := public.admin_article_settings_set('rahasia', 'true'); if r ->> 'error' <> 'kunci_tidak_valid' then raise exception 'kunci: %', r; end if;
  r := public.admin_article_settings_set('premoderate', 'true'); if not (r ->> 'ok')::boolean then raise exception 'premoderate: %', r; end if;
  perform pg_temp.as_user(current_setting('ai.a')::uuid); reset role; delete from public.rate_limits where key like 'cmt-%'; perform pg_temp.as_user(current_setting('ai.a')::uuid);
  r := public.article_comment_add('ai-artikel-satu', 'komentar saat moderasi awal aktif'); if r ->> 'status' <> 'pending' then raise exception 'moderasi sebelum tayang: %', r; end if;
  -- penulis
  perform pg_temp.as_user(current_setting('ai.m')::uuid);
  r := public.admin_author_save(null, 'Penulis Uji', 'Bio singkat', 'javascript:alert(1)', '[]'); if r ->> 'error' <> 'url_tidak_valid' then raise exception 'avatar berbahaya: %', r; end if;
  r := public.admin_author_save(null, 'Penulis Uji', 'Bio singkat', null, '[{"label":"IG","url":"http://x"}]'); if r ->> 'error' <> 'tautan_tidak_valid' then raise exception 'tautan http: %', r; end if;
  r := public.admin_author_save(null, 'Penulis Uji', 'Bio singkat', null, '[{"label":"Instagram","url":"https://instagram.com/uji"}]'); au := (r ->> 'id')::uuid;
  r := public.admin_article_set_author(art, au);
  perform pg_temp.as_anon(); e := public.article_engagement('ai-artikel-satu'); if e -> 'author' ->> 'name' <> 'Penulis Uji' then raise exception 'penulis artikel: %', e; end if;
  if e::text like '%user_id%' then raise exception 'bocor'; end if;
  raise notice 'OK 7: simpan (privat), feedback (satu suara, agregat admin), jumlah dibaca (dedupe), komentar ditutup, pengaturan tervalidasi, moderasi awal, penulis';
end $$;
reset role;
delete from public.contents where title like 'AI %'; delete from auth.users where email like 'ai.%@uji.nusamora.test';
\echo SEMUA UJI artikel-interaksi LULUS
