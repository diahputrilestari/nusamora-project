-- Uji DB admin-customers.sql: daftar pelanggan tidak error, status akun, detail pelanggan, tiga status undangan terpisah, tindakan & riwayat moderasi, hak akses.
\set ON_ERROR_STOP on
\set QUIET on
delete from auth.users where email like 'ac.%@uji.nusamora.test';
create or replace function pg_temp.as_user(u uuid) returns void language plpgsql as $$ begin reset role; perform set_config('request.jwt.claim.sub', u::text, false); perform set_config('request.jwt.claims', json_build_object('sub', u::text, 'role', 'authenticated')::text, false); set role authenticated; end $$;
grant execute on function pg_temp.as_user(uuid) to public;
do $$ declare a uuid := gen_random_uuid(); sp uuid := gen_random_uuid(); c uuid := gen_random_uuid(); a2 uuid := gen_random_uuid(); i1 uuid; i2 uuid; i3 uuid; i4 uuid; i5 uuid; inv1 uuid; begin
  insert into auth.users (id, email) values (a, 'ac.admin@uji.nusamora.test'), (sp, 'ac.support@uji.nusamora.test'), (c, 'ac.cust@uji.nusamora.test'), (a2, 'ac.admin2@uji.nusamora.test');
  insert into public.profiles (id, full_name) values (a, 'Admin Uji'), (sp, 'Support Uji'), (c, 'Pelanggan Uji'), (a2, 'Admin Dua') on conflict (id) do update set full_name = excluded.full_name;
  insert into public.admin_users (user_id, role) values (a, 'super_admin'), (sp, 'support'), (a2, 'admin');
  insert into public.subscriptions (user_id, plan, status, started_at, expires_at) values (c, 'signature', 'aktif', now() - interval '10 days', now() + interval '80 days');
  insert into public.invoices (user_id, number, description, amount, status, created_at, paid_at) values (c, 'AC-1', 't', 149000, 'lunas', now() - interval '5 days', now() - interval '5 days') returning id into inv1;
  insert into public.invitations (user_id, title, status, slug, plan_id, package_type, expires_at, content) values
    (c, 'Lunas Aktif', 'aktif', 'ac-lunas', 'signature', 'signature', now() + interval '80 days', '{}') returning id into i1;
  insert into public.invitations (user_id, title, status, slug, plan_id, package_type, content) values (c, 'Belum Bayar', 'draft', 'ac-draft', 'essential', 'essential', '{}') returning id into i2;
  insert into public.invitations (user_id, title, status, slug, plan_id, package_type, content) values (c, 'Menunggu', 'menunggu_pembayaran', 'ac-wait', 'essential', 'essential', '{}') returning id into i3;
  insert into public.invitations (user_id, title, status, slug, plan_id, package_type, content) values (c, 'Gagal', 'draft', 'ac-fail', 'essential', 'essential', '{}') returning id into i4;
  insert into public.invitations (user_id, title, status, slug, plan_id, package_type, expires_at, content) values (c, 'Kedaluwarsa', 'nonaktif', 'ac-exp', 'signature', 'signature', now() - interval '3 days', '{}') returning id into i5;
  insert into public.payments (order_id, user_id, invitation_id, invoice_id, plan_id, amount, duration_days, experience, status, expires_at, paid_at) values
    ('NMAC1', c, i1, inv1, 'signature', 149000, 90, '3d', 'paid', now() + interval '1 day', now() - interval '5 days'),
    ('NMAC5', c, i5, null, 'signature', 149000, 90, '3d', 'paid', now() - interval '1 day', now() - interval '95 days');
  insert into public.payments (order_id, user_id, invitation_id, plan_id, amount, duration_days, experience, status, expires_at) values
    ('NMAC3', c, i3, 'essential', 79000, 90, '2d', 'pending', now() + interval '1 day'),
    ('NMAC4', c, i4, 'essential', 79000, 90, '2d', 'expired', now() - interval '1 day');
  perform set_config('ac.admin', a::text, false); perform set_config('ac.support', sp::text, false); perform set_config('ac.cust', c::text, false); perform set_config('ac.admin2', a2::text, false);
  perform set_config('ac.i1', i1::text, false); perform set_config('ac.i2', i2::text, false); perform set_config('ac.i3', i3::text, false); perform set_config('ac.i4', i4::text, false); perform set_config('ac.i5', i5::text, false);
end $$;

-- 1. Daftar pelanggan tidak lagi error 42702 dan membawa paket aktif
do $$ declare n int; p text; begin
  perform pg_temp.as_user(current_setting('ac.admin')::uuid);
  select count(*), max(plan) into n, p from public.admin_list_customers() where id = current_setting('ac.cust')::uuid;
  if n <> 1 or p <> 'signature' then raise exception 'daftar pelanggan salah: n=% plan=%', n, p; end if;
  raise notice 'OK daftar pelanggan memuat paket aktif tanpa galat kolom ambigu';
end $$;

-- 2. Status akun
do $$ declare s text; begin
  perform pg_temp.as_user(current_setting('ac.admin')::uuid);
  begin perform public.admin_customer_set_status(current_setting('ac.cust')::uuid, 'nonaktif'); raise exception 'tanpa alasan harus ditolak';
  exception when others then if sqlerrm like 'alasan wajib%' then raise notice 'OK alasan wajib untuk nonaktif/blokir'; else raise; end if; end;
  begin perform public.admin_customer_set_status(current_setting('ac.admin')::uuid, 'nonaktif', 'uji'); raise exception 'akun sendiri harus ditolak';
  exception when others then if sqlerrm like 'tidak dapat mengubah%' then raise notice 'OK akun sendiri ditolak'; else raise; end if; end;
  begin perform public.admin_customer_set_status(current_setting('ac.admin2')::uuid, 'nonaktif', 'uji'); raise exception 'akun admin lain harus ditolak';
  exception when others then if sqlerrm like 'akun admin%' then raise notice 'OK akun admin tidak dapat diubah'; else raise; end if; end;
  begin perform public.admin_customer_set_status(current_setting('ac.cust')::uuid, 'banned', 'uji'); raise exception 'status liar harus ditolak';
  exception when others then if sqlerrm like 'status tidak valid%' then raise notice 'OK status tidak dikenal ditolak'; else raise; end if; end;
  perform public.admin_customer_set_status(current_setting('ac.cust')::uuid, 'nonaktif', 'Permintaan pelanggan');
  reset role; select status into s from public.profiles where id = current_setting('ac.cust')::uuid; if s <> 'nonaktif' then raise exception 'status harus nonaktif: %', s; end if;
  raise notice 'OK status nonaktif tersimpan';
end $$;
-- akun nonaktif tidak bisa membuat undangan baru
do $$ begin
  perform pg_temp.as_user(current_setting('ac.cust')::uuid); reset role; -- uji pemicu itu sendiri (lewati RLS), identitas tetap pelanggan
  begin insert into public.invitations (user_id, title, slug, content) values (current_setting('ac.cust')::uuid, 'Baru', 'ac-baru', '{}'); raise exception 'akun nonaktif harus ditolak';
  exception when others then if sqlerrm like 'akun_tidak_aktif%' then raise notice 'OK akun nonaktif tidak bisa membuat undangan'; else raise; end if; end;
end $$;
do $$ declare s text; begin
  perform pg_temp.as_user(current_setting('ac.admin')::uuid);
  perform public.admin_customer_set_status(current_setting('ac.cust')::uuid, 'suspended', 'Penyalahgunaan');
  perform public.admin_set_customer_status(current_setting('ac.cust')::uuid, 'aktif');
  reset role; select status into s from public.profiles where id = current_setting('ac.cust')::uuid; if s <> 'aktif' then raise exception 'harus aktif lagi: %', s; end if;
  perform pg_temp.as_user(current_setting('ac.admin')::uuid);
  perform public.admin_customer_log(current_setting('ac.cust')::uuid, 'reset_akses', null);
  begin perform public.admin_customer_log(current_setting('ac.cust')::uuid, 'hapus_semua'); raise exception 'tindakan liar harus ditolak';
  exception when others then if sqlerrm like 'tindakan tidak valid%' then raise notice 'OK tindakan log liar ditolak'; else raise; end if; end;
  raise notice 'OK kontrak lama admin_set_customer_status tetap jalan';
end $$;

-- 3. Detail pelanggan
do $$ declare r jsonb; begin
  perform pg_temp.as_user(current_setting('ac.admin')::uuid);
  r := public.admin_customer_detail(current_setting('ac.cust')::uuid);
  if r->'profile'->>'email' <> 'ac.cust@uji.nusamora.test' or r->'plan'->>'plan' <> 'signature' or (r->'plan'->>'expired')::boolean then raise exception 'profil/paket salah: %', r->'profile'; end if;
  if jsonb_array_length(r->'invitations') <> 5 then raise exception 'jumlah undangan salah'; end if;
  if (select count(*) from jsonb_array_elements(r->'invitations') x where x->>'pay_status' = 'lunas') <> 2
     or (select count(*) from jsonb_array_elements(r->'invitations') x where x->>'pay_status' = 'menunggu') <> 1
     or (select count(*) from jsonb_array_elements(r->'invitations') x where x->>'pay_status' = 'gagal') <> 1
     or (select count(*) from jsonb_array_elements(r->'invitations') x where x->>'pay_status' = 'belum_bayar') <> 1 then raise exception 'status pembayaran undangan salah: %', r->'invitations'; end if;
  if (r->>'paid_total')::bigint <> 149000 or jsonb_array_length(r->'invoices') <> 1 then raise exception 'transaksi salah'; end if;
  if not exists (select 1 from jsonb_array_elements(r->'activity') x where x->>'k' = 'daftar') or not exists (select 1 from jsonb_array_elements(r->'activity') x where x->>'k' = 'admin') then raise exception 'aktivitas kurang: %', r->'activity'; end if;
  if not exists (select 1 from jsonb_array_elements(r->'activity') x where x->>'txt' like 'Email atur ulang%') then raise exception 'log reset akses tidak muncul'; end if;
  raise notice 'OK detail pelanggan: profil, paket, undangan, transaksi, aktivitas';
  perform pg_temp.as_user(current_setting('ac.support')::uuid);
  r := public.admin_customer_detail(current_setting('ac.cust')::uuid);
  if (r->>'tx_visible')::boolean or jsonb_array_length(r->'invoices') <> 0 or r->'paid_total' <> 'null'::jsonb then raise exception 'support tidak boleh melihat transaksi'; end if;
  begin perform public.admin_customer_set_status(current_setting('ac.cust')::uuid, 'nonaktif', 'uji'); raise exception 'support tidak punya hak tulis';
  exception when others then if sqlerrm like 'forbidden%' then raise notice 'OK support: baca tanpa transaksi, tanpa hak ubah status'; else raise; end if; end;
end $$;

-- 4. Daftar & detail undangan: tiga status terpisah
do $$ declare r jsonb; x jsonb; begin
  perform pg_temp.as_user(current_setting('ac.admin')::uuid);
  r := public.admin_list_invitations();
  select e into x from jsonb_array_elements(r) e where e->>'id' = current_setting('ac.i1');
  if x->>'pay_status' <> 'lunas' or x->>'pub_status' <> 'aktif' or x->>'moderation' <> 'ok' then raise exception 'tiga status i1 salah: %', x; end if;
  select e into x from jsonb_array_elements(r) e where e->>'id' = current_setting('ac.i3');
  if x->>'pay_status' <> 'menunggu' or x->>'pub_status' <> 'menunggu_pembayaran' then raise exception 'tiga status i3 salah: %', x; end if;
  if x->>'owner_name' <> 'Pelanggan Uji' then raise exception 'pemilik salah'; end if;
  r := public.admin_invitation_detail(current_setting('ac.i1')::uuid);
  if r->'owner'->>'email' <> 'ac.cust@uji.nusamora.test' or r->'invitation'->>'plan_name' <> 'Signature' or jsonb_array_length(r->'payments') <> 1 then raise exception 'detail undangan salah: %', r; end if;
  raise notice 'OK daftar & detail undangan memisahkan status pembayaran, publikasi, moderasi';
end $$;

-- 5. Tindakan undangan + riwayat
do $$ declare r jsonb; i uuid; begin
  perform pg_temp.as_user(current_setting('ac.admin')::uuid);
  i := current_setting('ac.i1')::uuid;
  begin perform public.admin_invitation_action(i, 'suspend'); raise exception 'suspend tanpa alasan harus ditolak';
  exception when others then if sqlerrm like 'alasan wajib%' then raise notice 'OK suspend wajib alasan'; else raise; end if; end;
  perform public.admin_invitation_action(i, 'suspend', 'Konten tidak pantas');
  r := public.admin_invitation_detail(i);
  if r->'invitation'->>'moderation' <> 'takedown' or r->'invitation'->>'status' <> 'nonaktif' or r->'invitation'->>'pay_status' <> 'lunas' then raise exception 'suspend salah (pembayaran tidak boleh berubah): %', r->'invitation'; end if;
  if jsonb_array_length(r->'log') < 2 or not exists (select 1 from jsonb_array_elements(r->'log') l where l->>'kind' = 'moderasi' and l->>'to_value' = 'takedown' and l->>'note' = 'Konten tidak pantas' and l->>'actor_name' = 'Admin Uji') then raise exception 'riwayat moderasi tidak tercatat: %', r->'log'; end if;
  perform public.admin_invitation_action(i, 'archive');
  r := public.admin_invitation_detail(i);
  if r->'invitation'->>'pub_status' <> 'arsip' then raise exception 'arsip salah'; end if;
  begin perform public.admin_invitation_action(i, 'reactivate'); raise exception 'aktifkan saat arsip harus ditolak';
  exception when others then if sqlerrm like 'masih_diarsipkan%' then raise notice 'OK tidak bisa diaktifkan selagi diarsipkan'; else raise; end if; end;
  perform public.admin_invitation_action(i, 'unarchive');
  perform public.admin_invitation_action(i, 'reactivate', 'Banding diterima');
  r := public.admin_invitation_detail(i);
  if r->'invitation'->>'status' <> 'aktif' or r->'invitation'->>'moderation' <> 'ok' or r->'invitation'->>'pub_status' <> 'aktif' then raise exception 'aktifkan kembali salah: %', r->'invitation'; end if;
  -- belum lunas tidak boleh tayang
  begin perform public.admin_invitation_action(current_setting('ac.i2')::uuid, 'reactivate'); raise exception 'belum lunas harus ditolak';
  exception when others then if sqlerrm like 'belum_lunas%' then raise notice 'OK undangan belum lunas tidak bisa ditayangkan admin'; else raise; end if; end;
  begin perform public.admin_invitation_action(current_setting('ac.i3')::uuid, 'reactivate'); raise exception 'menunggu pembayaran harus ditolak';
  exception when others then if sqlerrm like 'belum_lunas%' then raise notice 'OK status menunggu juga ditolak'; else raise; end if; end;
  begin perform public.admin_invitation_action(current_setting('ac.i5')::uuid, 'reactivate'); raise exception 'kedaluwarsa harus ditolak';
  exception when others then if sqlerrm like 'sudah_kedaluwarsa%' then raise notice 'OK undangan kedaluwarsa tidak bisa ditayangkan'; else raise; end if; end;
  perform public.admin_invitation_action(current_setting('ac.i2')::uuid, 'flag', 'Dilaporkan tamu');
  if (select count(*) from jsonb_array_elements(public.admin_list_invitations()) e where e->>'moderation' = 'flagged') <> 1 then raise exception 'antrian moderasi salah'; end if;
  perform public.admin_invitation_action(current_setting('ac.i2')::uuid, 'clear', 'Aman');
  -- perubahan langsung ke tabel (jalur lama) tetap tercatat oleh trigger
  reset role; update public.invitations set moderation = 'flagged', moderation_note = 'via tabel' where id = current_setting('ac.i4')::uuid;
  if not exists (select 1 from public.invitation_moderation_log where invitation_id = current_setting('ac.i4')::uuid and note = 'via tabel') then raise exception 'trigger riwayat tidak mencatat'; end if;
  perform pg_temp.as_user(current_setting('ac.admin')::uuid);
  begin perform public.admin_invitation_action(i, 'hapus'); raise exception 'tindakan liar harus ditolak';
  exception when others then if sqlerrm like 'tindakan tidak valid%' then raise notice 'OK tindakan liar ditolak'; else raise; end if; end;
  raise notice 'OK suspend, arsip, aktifkan kembali, flag, riwayat';
end $$;

-- 6. Hak akses
do $$ begin
  perform pg_temp.as_user(current_setting('ac.cust')::uuid);
  begin perform public.admin_list_customers(); raise exception 'pelanggan harus ditolak';
  exception when others then if sqlerrm like 'forbidden%' then null; else raise; end if; end;
  begin perform public.admin_customer_detail(current_setting('ac.cust')::uuid); raise exception 'pelanggan harus ditolak';
  exception when others then if sqlerrm like 'forbidden%' then null; else raise; end if; end;
  begin perform public.admin_list_invitations(); raise exception 'pelanggan harus ditolak';
  exception when others then if sqlerrm like 'forbidden%' then null; else raise; end if; end;
  begin perform public.admin_invitation_detail(current_setting('ac.i1')::uuid); raise exception 'pelanggan harus ditolak';
  exception when others then if sqlerrm like 'forbidden%' then null; else raise; end if; end;
  begin perform public.admin_invitation_action(current_setting('ac.i1')::uuid, 'suspend', 'coba'); raise exception 'pelanggan harus ditolak';
  exception when others then if sqlerrm like 'forbidden%' then null; else raise; end if; end;
  if exists (select 1 from public.invitation_moderation_log) then raise exception 'pelanggan tidak boleh melihat riwayat moderasi'; end if;
  begin perform public.inv_pay_status(current_setting('ac.i1')::uuid); raise exception 'helper tidak boleh dipanggil klien';
  exception when insufficient_privilege then null; end;
  reset role; set role anon;
  begin perform public.admin_invitation_action(current_setting('ac.i1')::uuid, 'suspend', 'coba'); raise exception 'anon harus ditolak';
  exception when insufficient_privilege then null; end;
  reset role;
  raise notice 'OK hak akses: pelanggan & anon ditolak';
end $$;
reset role;
delete from auth.users where email like 'ac.%@uji.nusamora.test';
