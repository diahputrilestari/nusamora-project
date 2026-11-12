-- Uji DB fitur dashboard pelanggan: Notifikasi + Bantuan (backend/customer-features.sql). Tiap blok DO diakhiri NOTICE "OK ...".
\set ON_ERROR_STOP on
\set QUIET on
delete from auth.users where email like 'cf.%@uji.nusamora.test';
delete from public.announcements where title like 'CF-%';
delete from public.rate_limits where key like 'support-%';
create temp table ids (k text primary key, v uuid);
grant all on ids to public;
create or replace function pg_temp.as_user(u uuid) returns void language plpgsql as $$ begin reset role; perform set_config('request.jwt.claim.sub', u::text, false); perform set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated')::text, false); set role authenticated; end $$;
create or replace function pg_temp.as_anon() returns void language plpgsql as $$ begin reset role; perform set_config('request.jwt.claim.sub', '', false); perform set_config('request.jwt.claims', '', false); set role anon; end $$;
grant execute on function pg_temp.as_user(uuid), pg_temp.as_anon() to public;

do $$ declare u1 uuid := gen_random_uuid(); u2 uuid := gen_random_uuid(); begin
  insert into auth.users (id, email) values (u1, 'cf.u1@uji.nusamora.test'), (u2, 'cf.u2@uji.nusamora.test');
  insert into ids values ('u1', u1), ('u2', u2);
  insert into public.subscriptions (user_id, plan, status, started_at, expires_at) values (u2, 'signature', 'aktif', now() - interval '1 day', now() + interval '30 days');
  insert into public.announcements (title, body, channel, audience, status) values
    ('CF-semua', 'untuk semua', 'system', 'semua', 'terkirim'),
    ('CF-aktif', 'hanya pelanggan aktif', 'system', 'pelanggan_aktif', 'terkirim'),
    ('CF-draft', 'draft', 'system', 'semua', 'draft'),
    ('CF-email', 'kanal email', 'email', 'semua', 'terkirim'),
    ('CF-admin', 'audiens admin', 'system', 'admin', 'terkirim');
  raise notice 'OK siapkan data';
end $$;

-- 1. anon ditolak; pelanggan tanpa langganan hanya lihat 'semua' (bukan draft/email/admin/aktif)
do $$ declare u1 uuid := (select v from ids where k='u1'); u2 uuid := (select v from ids where k='u2'); j jsonb; t text[]; e text; begin
  perform pg_temp.as_anon();
  begin perform public.my_notifications(); raise exception 'anon lolos'; exception when others then e := sqlerrm; if e = 'anon lolos' then raise; end if; end;
  perform pg_temp.as_user(u1); j := public.my_notifications();
  select array_agg(x->>'title' order by x->>'title') into t from jsonb_array_elements(j) x where x->>'title' like 'CF-%';
  if t is distinct from array['CF-semua'] then raise exception 'u1 melihat %', t; end if;
  perform pg_temp.as_user(u2); j := public.my_notifications();
  select array_agg(x->>'title' order by x->>'title') into t from jsonb_array_elements(j) x where x->>'title' like 'CF-%';
  if t is distinct from array['CF-aktif','CF-semua'] then raise exception 'u2 melihat %', t; end if;
  reset role; raise notice 'OK notifikasi: anon ditolak, audiens & status tersaring';
end $$;

-- 2. tandai dibaca: milik sendiri saja, idempoten; tabel pembaca tidak bisa ditulis langsung
do $$ declare u1 uuid := (select v from ids where k='u1'); u2 uuid := (select v from ids where k='u2'); n int; unread int; e text; begin
  perform pg_temp.as_user(u1); n := public.mark_notifications_read(); if n < 1 then raise exception 'tidak ada yang ditandai'; end if;
  select count(*) into unread from jsonb_array_elements(public.my_notifications()) x where not (x->>'read')::boolean and x->>'title' like 'CF-%';
  if unread <> 0 then raise exception 'masih belum dibaca: %', unread; end if;
  if public.mark_notifications_read() <> 0 then raise exception 'tidak idempoten'; end if;
  perform pg_temp.as_user(u2);
  select count(*) into unread from jsonb_array_elements(public.my_notifications()) x where not (x->>'read')::boolean and x->>'title' like 'CF-%';
  if unread <> 2 then raise exception 'status baca bocor ke u2 (belum dibaca=%)', unread; end if;
  begin insert into public.announcement_reads (user_id, announcement_id) select u2, id from public.announcements limit 1; raise exception 'insert langsung lolos'; exception when insufficient_privilege then null; end;
  reset role; raise notice 'OK tandai dibaca: terisolasi per pengguna';
end $$;

-- 3. pelanggan tidak punya akses langsung ke tiket/pengumuman
do $$ declare u1 uuid := (select v from ids where k='u1'); n int; begin
  perform pg_temp.as_user(u1);
  begin select count(*) into n from public.announcements; if n <> 0 then raise exception 'pelanggan membaca announcements langsung (%)', n; end if; exception when insufficient_privilege then null; end;
  begin select count(*) into n from public.tickets; if n <> 0 then raise exception 'pelanggan membaca tickets langsung (%)', n; end if; exception when insufficient_privilege then null; end;
  begin insert into public.tickets (user_id, subject) values (u1, 'langsung'); raise exception 'insert tiket langsung lolos'; exception when insufficient_privilege or check_violation then null; end;
  reset role; raise notice 'OK tanpa akses langsung ke tickets/announcements';
end $$;

-- 4. tiket: validasi, kepemilikan, balasan, batas laju
do $$ declare u1 uuid := (select v from ids where k='u1'); u2 uuid := (select v from ids where k='u2'); t1 uuid; j jsonb; e text; i int; begin
  perform pg_temp.as_user(u1);
  foreach e in array array['ab','', repeat('x',121)] loop
    begin perform public.support_create_ticket(e, 'bantuan', 'pesan valid'); raise exception 'subjek % lolos', left(e,5); exception when others then if sqlerrm <> 'subjek_tidak_valid' then raise; end if; end;
  end loop;
  begin perform public.support_create_ticket('Subjek ok', 'bantuan', 'abc'); raise exception 'pesan pendek lolos'; exception when others then if sqlerrm <> 'pesan_tidak_valid' then raise; end if; end;
  begin perform public.support_create_ticket('Subjek ok', 'rahasia', 'pesan valid'); raise exception 'kategori liar lolos'; exception when others then if sqlerrm <> 'kategori_tidak_valid' then raise; end if; end;
  t1 := public.support_create_ticket('Tidak bisa bayar', 'pembayaran', 'Pembayaran saya gagal terus.');
  j := public.support_my_tickets(); if jsonb_array_length(j) <> 1 or (j->0->>'status') <> 'open' then raise exception 'daftar tiket u1 salah: %', j; end if;
  perform pg_temp.as_user(u2);
  if jsonb_array_length(public.support_my_tickets()) <> 0 then raise exception 'u2 melihat tiket u1'; end if;
  begin perform public.support_reply(t1, 'menyusup'); raise exception 'u2 membalas tiket u1'; exception when others then if sqlerrm <> 'tidak_ditemukan' then raise; end if; end;
  perform pg_temp.as_user(u1); perform public.support_reply(t1, 'Ini detail tambahan.');
  reset role; insert into public.ticket_replies (ticket_id, is_staff, body) values (t1, true, 'Kami cek ya.'); update public.tickets set status = 'selesai' where id = t1;
  perform pg_temp.as_user(u1); j := public.support_my_tickets();
  if jsonb_array_length(j->0->'replies') <> 2 or (j->0->'replies'->1->>'is_staff')::boolean is not true then raise exception 'balasan salah: %', j->0->'replies'; end if;
  perform public.support_reply(t1, 'Terima kasih.'); if (public.support_my_tickets()->0->>'status') <> 'open' then raise exception 'tiket selesai tidak dibuka lagi'; end if;
  reset role; update public.tickets set status = 'ditutup' where id = t1; perform pg_temp.as_user(u1);
  begin perform public.support_reply(t1, 'setelah ditutup'); raise exception 'balas tiket tertutup lolos'; exception when others then if sqlerrm <> 'tiket_ditutup' then raise; end if; end;
  -- batas laju: 5 tiket/jam (1 sudah dibuat)
  for i in 1..4 loop perform public.support_create_ticket('Tiket ' || i, 'lainnya', 'isi tiket ' || i); end loop;
  begin perform public.support_create_ticket('Tiket 6', 'lainnya', 'isi tiket 6'); raise exception 'batas laju tidak bekerja'; exception when others then if sqlerrm <> 'terlalu_banyak_permintaan' then raise; end if; end;
  reset role; raise notice 'OK tiket: validasi, kepemilikan, balasan staf, status, batas laju';
end $$;

-- 5. teks berbahaya disimpan apa adanya (dirender sebagai teks oleh UI), tidak mengubah struktur
do $$ declare u2 uuid := (select v from ids where k='u2'); j jsonb; begin
  perform pg_temp.as_user(u2); perform public.support_create_ticket('<img src=x onerror=alert(1)>', 'teknis', '<script>alert(1)</script>');
  j := public.support_my_tickets(); if (j->0->>'subject') <> '<img src=x onerror=alert(1)>' then raise exception 'subjek berubah'; end if;
  reset role; raise notice 'OK teks mentah tersimpan utuh (XSS ditangani saat render)';
end $$;
delete from auth.users where email like 'cf.%@uji.nusamora.test';
delete from public.announcements where title like 'CF-%';
\echo SEMUA LULUS
