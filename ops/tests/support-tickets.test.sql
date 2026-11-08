-- Uji DB support-tickets.sql: prioritas & SLA otomatis, percakapan pelanggan-staf, catatan internal tersembunyi, transisi status, penugasan, lampiran aman, hak akses.
\set ON_ERROR_STOP on
\set QUIET on
delete from storage.objects where bucket_id = 'ticket-files';
delete from public.tickets where subject like 'ST %';
delete from auth.users where email like 'st.%@uji.nusamora.test';
create or replace function pg_temp.as_user(u uuid) returns void language plpgsql as $$ begin reset role; perform set_config('request.jwt.claim.sub', u::text, false); perform set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated')::text, false); set role authenticated; end $$;
grant execute on function pg_temp.as_user(uuid) to public;
do $$ declare a uuid := gen_random_uuid(); s1 uuid := gen_random_uuid(); s2 uuid := gen_random_uuid(); ct uuid := gen_random_uuid(); c1 uuid := gen_random_uuid(); c2 uuid := gen_random_uuid(); begin
  insert into auth.users (id, email) values (a, 'st.admin@uji.nusamora.test'), (s1, 'st.sup1@uji.nusamora.test'), (s2, 'st.sup2@uji.nusamora.test'), (ct, 'st.content@uji.nusamora.test'), (c1, 'st.c1@uji.nusamora.test'), (c2, 'st.c2@uji.nusamora.test');
  insert into public.profiles (id, full_name) values (a, 'Admin Uji'), (s1, 'Support Satu'), (s2, 'Support Dua'), (ct, 'Konten'), (c1, 'Pelanggan Satu'), (c2, 'Pelanggan Dua') on conflict (id) do update set full_name = excluded.full_name;
  insert into public.admin_users (user_id, role) values (a, 'super_admin'), (s1, 'support'), (s2, 'support'), (ct, 'content');
  perform set_config('st.admin', a::text, false); perform set_config('st.s1', s1::text, false); perform set_config('st.s2', s2::text, false); perform set_config('st.ct', ct::text, false);
  perform set_config('st.c1', c1::text, false); perform set_config('st.c2', c2::text, false);
end $$;

-- 1. Prioritas otomatis & batas respons
do $$ declare t1 uuid; t2 uuid; p1 text; p2 text; d1 numeric; d2 numeric; begin
  perform pg_temp.as_user(current_setting('st.c1')::uuid);
  t1 := public.support_create_ticket('ST pembayaran gagal', 'pembayaran', 'Saya sudah bayar tapi belum aktif');
  t2 := public.support_create_ticket('ST tanya fitur', 'bantuan', 'Bagaimana cara ganti template?');
  reset role;
  select priority, extract(epoch from (due_at - created_at)) / 3600 into p1, d1 from public.tickets where id = t1;
  select priority, extract(epoch from (due_at - created_at)) / 3600 into p2, d2 from public.tickets where id = t2;
  if p1 <> 'tinggi' or d1 <> 4 or p2 <> 'normal' or d2 <> 24 then raise exception 'prioritas/SLA salah: % % % %', p1, d1, p2, d2; end if;
  perform set_config('st.t1', t1::text, false); perform set_config('st.t2', t2::text, false);
  raise notice 'OK pembayaran = prioritas tinggi (respons 4 jam); bantuan = normal (24 jam)';
end $$;

-- 2. Percakapan: balasan staf, catatan internal tersembunyi, status mengikuti
do $$ declare r jsonb; c jsonb; t record; begin
  perform pg_temp.as_user(current_setting('st.s1')::uuid);
  r := public.admin_ticket_reply(current_setting('st.t2')::uuid, 'Catatan: pelanggan ini baru daftar', true);
  if r->>'ok' <> 'true' then raise exception 'catatan internal gagal: %', r; end if;
  reset role; select status, first_response_at into t from public.tickets where id = current_setting('st.t2')::uuid;
  if t.status <> 'open' or t.first_response_at is not null then raise exception 'catatan internal tidak boleh mengubah status/respons pertama'; end if;
  perform pg_temp.as_user(current_setting('st.s1')::uuid);
  r := public.admin_ticket_reply(current_setting('st.t2')::uuid, 'Silakan buka menu Template lalu pilih Ganti.');
  if r->>'status' <> 'menunggu_pelanggan' then raise exception 'balasan staf harus menunggu pelanggan: %', r; end if;
  reset role; select status, first_response_at, assigned_to into t from public.tickets where id = current_setting('st.t2')::uuid;
  if t.first_response_at is null or t.assigned_to <> current_setting('st.s1')::uuid then raise exception 'respons pertama/penugasan otomatis salah'; end if;
  perform pg_temp.as_user(current_setting('st.c1')::uuid);
  c := public.support_my_tickets();
  if (select count(*) from jsonb_array_elements(c) x where x->>'id' = current_setting('st.t2')) <> 1 then raise exception 'tiket tidak muncul'; end if;
  if c::text like '%baru daftar%' then raise exception 'catatan internal bocor ke pelanggan'; end if;
  if c::text not like '%pilih Ganti%' then raise exception 'balasan staf tidak tampil'; end if;
  perform public.support_reply_v2(current_setting('st.t2')::uuid, 'Sudah berhasil, terima kasih');
  reset role; select status into t from public.tickets where id = current_setting('st.t2')::uuid;
  if t.status <> 'diproses' then raise exception 'balasan pelanggan harus kembali ke diproses: %', t.status; end if;
  raise notice 'OK catatan internal tersembunyi; balasan staf -> Waiting for Customer; balasan pelanggan -> In Progress';
end $$;

-- 3. Resolved, buka lagi, tutup oleh pelanggan
do $$ declare t record; ok boolean := false; begin
  perform pg_temp.as_user(current_setting('st.s1')::uuid);
  perform public.admin_ticket_set_status(current_setting('st.t2')::uuid, 'selesai');
  reset role; select status, resolved_at into t from public.tickets where id = current_setting('st.t2')::uuid;
  if t.status <> 'selesai' or t.resolved_at is null then raise exception 'selesai harus mengisi resolved_at'; end if;
  perform pg_temp.as_user(current_setting('st.c1')::uuid);
  perform public.support_reply_v2(current_setting('st.t2')::uuid, 'Ternyata masih bermasalah');
  reset role; select status, resolved_at into t from public.tickets where id = current_setting('st.t2')::uuid;
  if t.status <> 'open' or t.resolved_at is not null then raise exception 'balasan pelanggan harus membuka kembali tiket'; end if;
  perform pg_temp.as_user(current_setting('st.c1')::uuid);
  perform public.support_close(current_setting('st.t2')::uuid);
  begin perform public.support_reply_v2(current_setting('st.t2')::uuid, 'tes'); exception when others then ok := sqlerrm like '%tiket_ditutup%'; end;
  if not ok then raise exception 'tiket ditutup tidak boleh dibalas pelanggan'; end if;
  perform pg_temp.as_user(current_setting('st.s1')::uuid);
  if public.admin_ticket_reply(current_setting('st.t2')::uuid, 'balas tutup')->>'error' <> 'tiket_ditutup' then raise exception 'staf tidak boleh membalas tiket ditutup'; end if;
  begin perform public.support_close(current_setting('st.t2')::uuid); raise exception 'pelanggan lain harus ditolak'; exception when others then if sqlerrm like 'pelanggan lain%' then raise; end if; end;
  raise notice 'OK Resolved/Closed: buka lagi oleh balasan pelanggan, tutup oleh pelanggan, tiket tertutup tidak bisa dibalas';
end $$;

-- 4. Penugasan
do $$ declare l jsonb; begin
  perform pg_temp.as_user(current_setting('st.admin')::uuid);
  if public.admin_ticket_assign(current_setting('st.t1')::uuid, current_setting('st.c1')::uuid)->>'error' <> 'admin_tidak_valid' then raise exception 'pelanggan tidak boleh jadi penerima tugas'; end if;
  if public.admin_ticket_assign(current_setting('st.t1')::uuid, current_setting('st.ct')::uuid)->>'error' <> 'admin_tidak_valid' then raise exception 'admin tanpa izin support tidak boleh jadi penerima tugas'; end if;
  if (public.admin_ticket_assign(current_setting('st.t1')::uuid, current_setting('st.s2')::uuid)->>'ok') <> 'true' then raise exception 'penugasan gagal'; end if;
  l := public.admin_support_admins();
  if jsonb_array_length(l) <> 3 or l::text like '%Konten%' then raise exception 'daftar penerima tugas salah: %', l; end if;
  l := public.admin_list_tickets();
  if (select (x->>'assigned_name') from jsonb_array_elements(l) x where x->>'id' = current_setting('st.t1')) <> 'Support Dua' then raise exception 'nama penerima tugas tidak tampil'; end if;
  if (select (x->>'status') from jsonb_array_elements(l) x where x->>'id' = current_setting('st.t1')) <> 'diproses' then raise exception 'penugasan tiket open harus jadi diproses'; end if;
  if public.admin_ticket_set_priority(current_setting('st.t1')::uuid, 'sangat')->>'error' <> 'prioritas_tidak_valid' then raise exception 'prioritas salah harus ditolak'; end if;
  if public.admin_ticket_set_status(current_setting('st.t1')::uuid, 'lunas')->>'error' <> 'status_tidak_valid' then raise exception 'status salah harus ditolak'; end if;
  raise notice 'OK penugasan hanya ke staf support; status & prioritas divalidasi';
end $$;

-- 5. SLA terlambat & ringkasan
do $$ declare o jsonb; l jsonb; begin
  reset role;
  update public.tickets set created_at = now() - interval '10 hours', due_at = now() - interval '6 hours' where id = current_setting('st.t1')::uuid;
  perform pg_temp.as_user(current_setting('st.admin')::uuid);
  l := public.admin_list_tickets();
  if (select (x->>'sla') from jsonb_array_elements(l) x where x->>'id' = current_setting('st.t1')) <> 'terlambat' then raise exception 'SLA harus terlambat'; end if;
  o := public.admin_support_overview();
  if (o->>'overdue')::int < 1 or (o->>'open')::int < 1 or o->'avg_first_response_hours' is null then raise exception 'ringkasan salah: %', o; end if;
  raise notice 'OK SLA terlambat terdeteksi; ringkasan terbuka/terlambat/rata-rata respons';
end $$;

-- 6. Lampiran
do $$ declare c1 uuid := current_setting('st.c1')::uuid; t uuid := current_setting('st.t1')::uuid; rid uuid; ok boolean; d jsonb; i int; begin
  reset role;
  insert into storage.objects (bucket_id, name, owner) values ('ticket-files', c1 || '/' || t || '/a.png', c1), ('ticket-files', c1 || '/' || t || '/b.png', c1), ('ticket-files', c1 || '/' || t || '/c.png', c1), ('ticket-files', c1 || '/' || t || '/d.png', c1), ('ticket-files', current_setting('st.c2') || '/x/y.png', c1);
  perform pg_temp.as_user(c1);
  rid := public.support_reply_v2(t, 'Ini screenshot-nya');
  perform public.support_add_attachment(t, rid, c1 || '/' || t || '/a.png', 'Layar <1>.png', 'image/png', 1000);
  perform public.support_add_attachment(t, rid, c1 || '/' || t || '/b.png', 'b.png', 'image/png', 1000);
  perform public.support_add_attachment(t, rid, c1 || '/' || t || '/c.png', 'c.png', 'image/webp', 1000);
  ok := false; begin perform public.support_add_attachment(t, rid, c1 || '/' || t || '/d.png', 'd.png', 'image/png', 1000); exception when others then ok := sqlerrm like '%lampiran_terlalu_banyak%'; end;
  if not ok then raise exception 'lebih dari 3 lampiran per pesan harus ditolak'; end if;
  ok := false; begin perform public.support_add_attachment(t, null, current_setting('st.c2') || '/x/y.png', 'y.png', 'image/png', 1000); exception when others then ok := sqlerrm like '%lampiran_tidak_valid%'; end;
  if not ok then raise exception 'path milik pengguna lain harus ditolak'; end if;
  ok := false; begin perform public.support_add_attachment(t, null, c1 || '/' || t || '/../x.png', 'x.png', 'image/png', 1000); exception when others then ok := sqlerrm like '%lampiran_tidak_valid%'; end;
  if not ok then raise exception 'path traversal harus ditolak'; end if;
  ok := false; begin perform public.support_add_attachment(t, null, c1 || '/' || t || '/d.png', 'd.svg', 'image/svg+xml', 1000); exception when others then ok := sqlerrm like '%lampiran_tidak_valid%'; end;
  if not ok then raise exception 'SVG harus ditolak'; end if;
  ok := false; begin perform public.support_add_attachment(t, null, c1 || '/' || t || '/d.png', 'd.png', 'image/png', 9999999); exception when others then ok := sqlerrm like '%lampiran_terlalu_besar%'; end;
  if not ok then raise exception 'file >3MB harus ditolak'; end if;
  ok := false; begin perform public.support_add_attachment(t, null, c1 || '/' || t || '/tidak-ada.png', 'z.png', 'image/png', 1000); exception when others then ok := sqlerrm like '%lampiran_tidak_ditemukan%'; end;
  if not ok then raise exception 'berkas yang belum diunggah harus ditolak'; end if;
  ok := false; perform pg_temp.as_user(current_setting('st.c2')::uuid);
  begin perform public.support_add_attachment(t, null, current_setting('st.c2') || '/' || t || '/y.png', 'y.png', 'image/png', 1000); exception when others then ok := sqlerrm like '%tidak_ditemukan%'; end;
  if not ok then raise exception 'melampirkan ke tiket orang lain harus ditolak'; end if;
  perform pg_temp.as_user(current_setting('st.admin')::uuid);
  d := public.admin_ticket_detail(t);
  if jsonb_array_length((select x->'files' from jsonb_array_elements(d->'replies') x where x->>'body' = 'Ini screenshot-nya')) <> 3 then raise exception 'lampiran tidak tampil di detail admin: %', d; end if;
  if d::text not like '%Layar _1_.png%' then raise exception 'nama file harus dibersihkan: %', d::text; end if;
  raise notice 'OK lampiran: tipe/ukuran/jumlah/folder dibatasi, path traversal & tiket orang lain ditolak, tampil di detail admin';
end $$;

-- 7. Hak akses
do $$ declare ok boolean; begin
  perform pg_temp.as_user(current_setting('st.c1')::uuid);
  ok := false; begin perform public.admin_list_tickets(); exception when insufficient_privilege then ok := true; end; if not ok then raise exception 'pelanggan tidak boleh melihat daftar admin'; end if;
  perform pg_temp.as_user(current_setting('st.ct')::uuid);
  ok := false; begin perform public.admin_list_tickets(); exception when insufficient_privilege then ok := true; end; if not ok then raise exception 'role content tidak boleh melihat tiket'; end if;
  ok := false; begin perform public.admin_ticket_reply(current_setting('st.t1')::uuid, 'x'); exception when insufficient_privilege then ok := true; end; if not ok then raise exception 'role content tidak boleh membalas'; end if;
  perform pg_temp.as_user(current_setting('st.c2')::uuid);
  if (select count(*) from jsonb_array_elements(public.support_my_tickets())) <> 0 then raise exception 'pelanggan 2 tidak boleh melihat tiket pelanggan 1'; end if;
  raise notice 'OK hak akses: pelanggan & role tanpa izin support ditolak; data pelanggan terisolasi';
end $$;
reset role;
delete from storage.objects where bucket_id = 'ticket-files';
delete from public.tickets where subject like 'ST %';
delete from auth.users where email like 'st.%@uji.nusamora.test';
\echo SELESAI support-tickets
