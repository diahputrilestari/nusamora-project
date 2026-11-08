-- Uji DB admin-transactions.sql: pemetaan status Midtrans, detail, tidak ada jalan pintas ke LUNAS, alur refund, ekspor, hak akses.
\set ON_ERROR_STOP on
\set QUIET on
delete from public.payment_events where order_id like 'NMAT%'; delete from public.payments where order_id like 'NMAT%'; delete from public.invoices where number like 'AT-%'; delete from public.invitations where slug like 'at-%';
delete from auth.users where email like 'at.%@uji.nusamora.test';
create or replace function pg_temp.as_user(u uuid) returns void language plpgsql as $$ begin reset role; perform set_config('request.jwt.claim.sub', u::text, false); perform set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated')::text, false); set role authenticated; end $$;
grant execute on function pg_temp.as_user(uuid) to public;
do $$ declare a uuid := gen_random_uuid(); sp uuid := gen_random_uuid(); c uuid := gen_random_uuid(); i1 uuid; i2 uuid; inv1 uuid; inv2 uuid; begin
  insert into auth.users (id, email) values (a, 'at.admin@uji.nusamora.test'), (sp, 'at.support@uji.nusamora.test'), (c, 'at.cust@uji.nusamora.test');
  insert into public.profiles (id, full_name) values (a, 'Admin Uji'), (sp, 'Support Uji'), (c, 'Pelanggan Uji') on conflict (id) do update set full_name = excluded.full_name;
  insert into public.admin_users (user_id, role) values (a, 'super_admin'), (sp, 'support');
  insert into public.invitations (user_id, title, status, slug, plan_id, package_type, expires_at, content) values (c, 'Aktif', 'aktif', 'at-1', 'signature', 'signature', now() + interval '80 days', '{}') returning id into i1;
  insert into public.invitations (user_id, title, status, slug, plan_id, package_type, content) values (c, 'Menunggu', 'menunggu_pembayaran', 'at-2', 'essential', 'essential', '{}') returning id into i2;
  insert into public.invoices (user_id, number, description, amount, status, paid_at, midtrans_order_id) values (c, 'AT-1', 'lunas', 149000, 'lunas', now(), 'NMAT1') returning id into inv1;
  insert into public.invoices (user_id, number, description, amount, status, midtrans_order_id) values (c, 'AT-2', 'menunggu', 79000, 'menunggu', 'NMAT2') returning id into inv2;
  insert into public.payments (order_id, user_id, invitation_id, invoice_id, plan_id, amount, duration_days, experience, status, expires_at, paid_at, transaction_id, payment_type, midtrans_status) values
    ('NMAT1', c, i1, inv1, 'signature', 149000, 90, '3d', 'paid', now() + interval '1 day', now(), 'TX-1', 'qris', 'settlement'),
    ('NMAT2', c, i2, inv2, 'essential', 79000, 90, '2d', 'pending', now() + interval '1 day', null, null, null, 'pending');
  insert into public.payment_events (order_id, event_key, source, transaction_status, result, payload) values
    ('NMAT1', 'at-e1', 'webhook', 'settlement', 'applied', '{"payment_type":"qris","transaction_id":"TX-1","gross_amount":"149000.00"}'),
    ('NMAT1', 'at-e2', 'webhook', 'settlement', 'amount_mismatch', null);
  perform set_config('at.admin', a::text, false); perform set_config('at.support', sp::text, false); perform set_config('at.cust', c::text, false);
  perform set_config('at.inv1', inv1::text, false); perform set_config('at.inv2', inv2::text, false);
end $$;

-- 1. Pemetaan status
do $$ begin
  if public.map_midtrans_status('settlement') <> 'paid' or public.map_midtrans_status('capture', 'accept') <> 'paid' or public.map_midtrans_status('capture', 'challenge') <> 'pending'
     or public.map_midtrans_status('pending') <> 'pending' or public.map_midtrans_status('expire') <> 'expired' or public.map_midtrans_status('cancel') <> 'cancelled'
     or public.map_midtrans_status('deny') <> 'failed' or public.map_midtrans_status('refund') <> 'refunded' or public.map_midtrans_status('xyz') is not null then
    raise exception 'pemetaan status salah'; end if;
  raise notice 'OK pemetaan Pending/Settlement/Expire/Cancel/Refund';
end $$;

-- 2. Daftar, ringkasan, detail
do $$ declare l jsonb; o jsonb; d jsonb; begin
  perform pg_temp.as_user(current_setting('at.admin')::uuid);
  l := public.admin_list_transactions();
  if jsonb_array_length(l) <> 2 then raise exception 'daftar salah: %', l; end if;
  o := public.admin_transactions_overview();
  if (o->>'paid_count')::int <> 1 or (o->>'paid_sum')::bigint <> 149000 or (o->>'pending_count')::int <> 1 then raise exception 'ringkasan salah: %', o; end if;
  d := public.admin_transaction_detail(current_setting('at.inv1')::uuid);
  if d#>>'{payment,transaction_id}' <> 'TX-1' or d#>>'{payment,payment_type}' <> 'qris' or d#>>'{payment,mapped_status}' <> 'paid' or jsonb_array_length(d->'events') <> 2 then raise exception 'detail salah: %', d; end if;
  raise notice 'OK daftar, ringkasan, detail (Transaction ID, metode, status gateway, riwayat webhook)';
end $$;

-- 3. Tidak ada jalan pintas: admin tidak bisa mengubah invoice langsung & refund butuh pembayaran lunas
do $$ declare r jsonb; begin
  perform pg_temp.as_user(current_setting('at.admin')::uuid);
  begin update public.invoices set status = 'lunas' where id = current_setting('at.inv2')::uuid; if found then raise exception 'update langsung harus ditolak'; end if;
  exception when insufficient_privilege then null; end;
  r := public.admin_refund_request(current_setting('at.inv2')::uuid, 'belum dibayar tapi minta refund');
  if r->>'error' <> 'belum_lunas' then raise exception 'refund tanpa lunas harus ditolak: %', r; end if;
  raise notice 'OK invoice tidak bisa diubah ke lunas dari tombol admin; refund hanya untuk yang lunas';
end $$;

-- 4. Alur refund
do $$ declare r jsonb; rid uuid; s text; ps text; ist text; begin
  perform pg_temp.as_user(current_setting('at.admin')::uuid);
  r := public.admin_refund_request(current_setting('at.inv1')::uuid, 'pelanggan salah pilih paket');
  if (r->>'ok') is distinct from 'true' then raise exception 'ajukan refund gagal: %', r; end if;
  rid := (r->>'id')::uuid;
  if public.admin_refund_request(current_setting('at.inv1')::uuid, 'diajukan lagi')->>'error' <> 'refund_sudah_diajukan' then raise exception 'refund ganda harus ditolak'; end if;
  if public.admin_refund_decide(rid, 'selesai', 'transfer_manual')->>'error' <> 'bukti_belum_ada' then raise exception 'selesai tanpa bukti harus ditolak'; end if;
  if public.admin_refund_decide(rid, 'selesai', null, null, 'transfer BCA')->>'error' <> 'metode_belum_dipilih' then raise exception 'tanpa metode harus ditolak'; end if;
  if public.admin_refund_decide(rid, 'selesai', 'transfer_manual', 'javascript:alert(1)')->>'error' <> 'bukti_url_tidak_valid' then raise exception 'URL bukti tidak valid harus ditolak'; end if;
  r := public.admin_refund_decide(rid, 'selesai', 'transfer_manual', 'https://bukti.example/ref.png', 'TF BCA 08/11', 'ok');
  if (r->>'ok') is distinct from 'true' then raise exception 'selesaikan refund gagal: %', r; end if;
  reset role;
  select status into s from public.payment_refunds where id = rid;
  select status into ps from public.payments where order_id = 'NMAT1';
  select status into ist from public.invoices where number = 'AT-1';
  if s <> 'selesai' or ps <> 'refunded' or ist <> 'refund' then raise exception 'status akhir salah: % % %', s, ps, ist; end if;
  if (select status from public.invitations where slug = 'at-1') <> 'nonaktif' then raise exception 'undangan harus nonaktif setelah refund'; end if;
  raise notice 'OK alur refund: alasan, metode, bukti wajib; status internal ikut berubah; undangan dinonaktifkan';
end $$;

-- 5. Penolakan refund butuh alasan
do $$ declare c uuid := current_setting('at.cust')::uuid; i3 uuid; inv3 uuid; r jsonb; rid uuid; begin
  reset role;
  insert into public.invitations (user_id, title, status, slug, plan_id, package_type, expires_at, content) values (c, 'Aktif3', 'aktif', 'at-3', 'essential', 'essential', now() + interval '10 days', '{}') returning id into i3;
  insert into public.invoices (user_id, number, description, amount, status, paid_at) values (c, 'AT-3', 'x', 79000, 'lunas', now()) returning id into inv3;
  insert into public.payments (order_id, user_id, invitation_id, invoice_id, plan_id, amount, duration_days, experience, status, expires_at, paid_at) values ('NMAT3', c, i3, inv3, 'essential', 79000, 90, '2d', 'paid', now() + interval '1 day', now());
  perform pg_temp.as_user(current_setting('at.admin')::uuid);
  rid := (public.admin_refund_request(inv3, 'alasan cukup panjang')->>'id')::uuid;
  if public.admin_refund_decide(rid, 'ditolak')->>'error' <> 'alasan_penolakan_kosong' then raise exception 'tolak tanpa alasan harus ditolak'; end if;
  r := public.admin_refund_decide(rid, 'ditolak', null, null, null, 'di luar kebijakan');
  reset role;
  if (select status from public.invoices where number = 'AT-3') <> 'lunas' then raise exception 'penolakan tidak boleh mengubah invoice'; end if;
  raise notice 'OK penolakan refund tidak mengubah status lunas';
end $$;

-- 6. Ekspor & hak akses
do $$ declare e jsonb; begin
  perform pg_temp.as_user(current_setting('at.admin')::uuid);
  e := public.admin_export_transactions(current_date - 1, current_date + 1, null);
  if jsonb_array_length(e) < 2 or not (e->0 ? 'transaction_id') then raise exception 'ekspor salah: %', e; end if;
  if jsonb_array_length(public.admin_export_transactions(null, null, 'menunggu')) <> 1 then raise exception 'filter status ekspor salah'; end if;
  perform pg_temp.as_user(current_setting('at.cust')::uuid);
  begin perform public.admin_list_transactions(); raise exception 'pelanggan harus ditolak'; exception when insufficient_privilege then null; end;
  begin perform public.admin_refund_request(current_setting('at.inv1')::uuid, 'coba coba'); raise exception 'pelanggan harus ditolak'; exception when insufficient_privilege then null; end;
  perform pg_temp.as_user(current_setting('at.support')::uuid);
  begin perform public.admin_transaction_note(current_setting('at.inv1')::uuid, 'catatan'); raise exception 'support tanpa izin tulis harus ditolak'; exception when insufficient_privilege then null; end;
  raise notice 'OK ekspor terfilter; non-admin/izin tidak cukup ditolak';
end $$;
reset role;
delete from public.payment_events where order_id like 'NMAT%'; delete from public.payments where order_id like 'NMAT%'; delete from public.invoices where number like 'AT-%'; delete from public.invitations where slug like 'at-%';
delete from auth.users where email like 'at.%@uji.nusamora.test';
\echo SELESAI admin-transactions
