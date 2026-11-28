-- Uji DB after-sales-a-business-rules.sql: refund sebagian, perpanjangan undangan, pengingat pembayaran tertunda, konfigurasi notifikasi.
\set ON_ERROR_STOP on
\set QUIET on
create or replace function pg_temp.clean() returns void language plpgsql as $$ begin
  reset role;
  delete from public.notif_outbox where user_id in (select id from auth.users where email like 'as.%@uji.nusamora.test');
  delete from public.payment_events where order_id like 'NMAS%' or order_id in (select order_id from public.payments where user_id in (select id from auth.users where email like 'as.%@uji.nusamora.test'));
  delete from public.payment_refunds where payment_id in (select id from public.payments where user_id in (select id from auth.users where email like 'as.%@uji.nusamora.test'));
  delete from public.payments where user_id in (select id from auth.users where email like 'as.%@uji.nusamora.test');
  delete from public.invoices where user_id in (select id from auth.users where email like 'as.%@uji.nusamora.test');
  delete from public.invitations where slug like 'as-%';
  delete from auth.users where email like 'as.%@uji.nusamora.test';
  update public.notif_rules set enabled = false where event in ('payment_paid', 'payment_failed', 'payment_pending_reminder');
  update public.notif_settings set value = '""' where key in ('email_from_address', 'support_email');
  update public.notif_settings set value = 'false' where key = 'pending_reminder_enabled';
  update public.notif_settings set value = '60' where key = 'pending_reminder_after_minutes';
end $$;
select pg_temp.clean();
create or replace function pg_temp.as_user(u uuid) returns void language plpgsql as $$ begin reset role; perform set_config('request.jwt.claim.sub', u::text, false); perform set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated')::text, false); set role authenticated; end $$;
grant execute on function pg_temp.as_user(uuid) to public;
-- pembayaran lunas siap pakai untuk undangan (dibuat langsung, seolah sudah diverifikasi sebelumnya)
create or replace function pg_temp.paid(u uuid, inv uuid, oid text, plan text, amt bigint) returns uuid language plpgsql as $$
declare iv uuid; pid uuid; begin
  insert into public.invoices (user_id, number, description, amount, status, paid_at, midtrans_order_id) values (u, 'AS-' || oid, 'uji', amt, 'lunas', now(), oid) returning id into iv;
  insert into public.payments (order_id, user_id, invitation_id, invoice_id, plan_id, amount, duration_days, experience, status, expires_at, paid_at, midtrans_status)
  values (oid, u, inv, iv, plan, amt, 90, '2d', 'paid', now() + interval '1 day', now(), 'settlement') returning id into pid;
  return pid;
end $$;
create or replace function pg_temp.mt(oid text, ts text, refund text default null) returns jsonb language plpgsql as $$
declare amt text; begin
  select amount::text || '.00' into amt from public.payments where order_id = oid;
  return public.apply_payment(oid, ts, 'accept', 'qris', 'TX-' || oid, amt, case when ts like '%refund%' then '200' else '200' end, 'webhook',
    jsonb_build_object('order_id', oid, 'transaction_status', ts) || case when refund is null then '{}'::jsonb else jsonb_build_object('refund_amount', refund) end);
end $$;

do $$ declare a uuid := gen_random_uuid(); sp uuid := gen_random_uuid(); c uuid := gen_random_uuid(); c2 uuid := gen_random_uuid(); begin
  insert into auth.users (id, email) values (a, 'as.admin@uji.nusamora.test'), (sp, 'as.support@uji.nusamora.test'), (c, 'as.cust@uji.nusamora.test'), (c2, 'as.lain@uji.nusamora.test');
  insert into public.profiles (id, full_name) values (a, 'Admin Uji'), (sp, 'Support Uji'), (c, 'Pelanggan Uji'), (c2, 'Pelanggan Lain') on conflict (id) do update set full_name = excluded.full_name;
  insert into public.admin_users (user_id, role) values (a, 'super_admin'), (sp, 'support');
  perform set_config('as.a', a::text, false); perform set_config('as.sp', sp::text, false); perform set_config('as.c', c::text, false); perform set_config('as.c2', c2::text, false);
end $$;

----------------------------------------------------------------------------- A. Refund sebagian / penuh
do $$ declare c uuid := current_setting('as.c')::uuid; i1 uuid; pid uuid; r jsonb; p public.payments; iv public.invoices; ok boolean; begin
  insert into public.invitations (user_id, title, status, slug, plan_id, package_type, expires_at, content) values (c, 'Refund', 'aktif', 'as-rf', 'signature', 'signature', now() + interval '80 days', '{}') returning id into i1;
  pid := pg_temp.paid(c, i1, 'NMASRF1', 'signature', 149000);

  -- refund sebagian: undangan tetap aktif, invoice tetap lunas, jumlah tercatat
  r := pg_temp.mt('NMASRF1', 'partial_refund', '50000.00');
  select * into p from public.payments where id = pid; select * into iv from public.invoices where id = p.invoice_id;
  if r ->> 'result' <> 'applied' or p.status <> 'partially_refunded' or p.refunded_amount <> 50000 then raise exception 'refund sebagian gagal: % %', r, p.status; end if;
  if (select status from public.invitations where id = i1) <> 'aktif' then raise exception 'refund sebagian tidak boleh menonaktifkan undangan'; end if;
  if iv.status <> 'lunas' or iv.refunded_amount <> 50000 then raise exception 'invoice refund sebagian salah: % %', iv.status, iv.refunded_amount; end if;
  raise notice 'OK refund sebagian: status partially_refunded, undangan tetap aktif, invoice tetap lunas';

  -- webhook ganda (total sama) tidak diproses dua kali
  r := pg_temp.mt('NMASRF1', 'partial_refund', '50000.00');
  if r ->> 'result' <> 'duplicate' or (select refunded_amount from public.payments where id = pid) <> 50000 then raise exception 'refund ganda diproses: %', r; end if;
  -- sumber lain (sync) dengan total sama juga tidak menambah
  r := public.apply_payment('NMASRF1', 'partial_refund', 'accept', 'qris', 'TX-NMASRF1', '149000.00', '200', 'sync', '{"refund_amount":"50000"}');
  if (select refunded_amount from public.payments where id = pid) <> 50000 or (select count(*) from public.payment_events where order_id = 'NMASRF1' and result = 'applied') <> 1 then raise exception 'refund ganda (sync) diproses: %', r; end if;
  raise notice 'OK refund ganda: total kumulatif yang sama tidak diproses ulang';

  -- melebihi jumlah bayar ditolak & ditandai untuk ditinjau
  r := pg_temp.mt('NMASRF1', 'partial_refund', '200000.00');
  select * into p from public.payments where id = pid;
  if r ->> 'result' <> 'refund_exceeds' or p.refunded_amount <> 50000 or p.status <> 'partially_refunded' or p.note <> 'refund_melebihi_perlu_tinjauan' then raise exception 'refund melebihi lolos: % %', r, p; end if;
  begin update public.payments set refunded_amount = 999999 where id = pid; ok := false; exception when check_violation then ok := true; end;
  if not ok then raise exception 'constraint refunded_amount <= amount tidak aktif'; end if;
  begin update public.payments set refunded_amount = 10 where id = pid; ok := false; exception when others then ok := sqlerrm = 'refund_tidak_boleh_berkurang'; end;
  if not ok then raise exception 'jumlah refund bisa berkurang'; end if;
  -- refund sebagian tanpa angka: tidak menebak, minta ditinjau
  r := public.apply_payment('NMASRF1', 'partial_refund', 'accept', 'qris', 'TX-NMASRF1', '149000.00', '201', 'webhook', '{}');
  if r ->> 'result' <> 'needs_review' or (select refunded_amount from public.payments where id = pid) <> 50000 then raise exception 'refund tanpa jumlah harus ditinjau: %', r; end if;
  raise notice 'OK refund melebihi jumlah ditolak; refund tanpa jumlah tidak diterapkan';

  -- refund penuh: undangan nonaktif, invoice refund
  r := pg_temp.mt('NMASRF1', 'refund', '149000.00');
  select * into p from public.payments where id = pid; select * into iv from public.invoices where id = p.invoice_id;
  if p.status <> 'refunded' or p.refunded_amount <> 149000 or iv.status <> 'refund' or iv.refunded_amount <> 149000 then raise exception 'refund penuh salah: % %', p.status, iv.status; end if;
  if (select status from public.invitations where id = i1) <> 'nonaktif' then raise exception 'refund penuh harus menonaktifkan undangan'; end if;
  raise notice 'OK refund penuh: undangan dinonaktifkan, invoice refund';

  -- refund tidak pernah kembali menjadi lunas
  r := pg_temp.mt('NMASRF1', 'settlement');
  if r ->> 'result' <> 'ignored' or (select status from public.payments where id = pid) <> 'refunded' then raise exception 'settlement setelah refund harus diabaikan: %', r; end if;
  begin update public.payments set status = 'paid' where id = pid; ok := false; exception when others then ok := sqlerrm = 'status_refund_final'; end;
  if not ok then raise exception 'payment refunded bisa kembali paid'; end if;
  begin update public.invoices set status = 'lunas' where id = p.invoice_id; ok := false; exception when others then ok := sqlerrm = 'invoice_refund_final'; end;
  if not ok then raise exception 'invoice refund bisa kembali lunas'; end if;
  update public.payments set refunded_amount = 1 where id = pid;            -- refund penuh selalu = jumlah bayar
  if (select refunded_amount from public.payments where id = pid) <> 149000 then raise exception 'jumlah refund penuh bisa diubah'; end if;
  raise notice 'OK refund final: tidak bisa kembali ke paid/lunas, jumlah tidak bisa berkurang';

  -- refund pada pembayaran yang belum lunas tidak mengubah apa pun
  insert into public.invoices (user_id, number, description, amount, status, midtrans_order_id) values (c, 'AS-NMASRF2', 'uji', 79000, 'menunggu', 'NMASRF2');
  insert into public.payments (order_id, user_id, invitation_id, invoice_id, plan_id, amount, duration_days, experience, status, expires_at)
  values ('NMASRF2', c, i1, (select id from public.invoices where number = 'AS-NMASRF2'), 'essential', 79000, 90, '2d', 'pending', now() + interval '1 day');
  r := pg_temp.mt('NMASRF2', 'refund', '79000.00');
  if (select status from public.payments where order_id = 'NMASRF2') <> 'pending' or r ->> 'result' <> 'needs_review' then raise exception 'refund pada pending harus ditinjau: %', r; end if;
  update public.payments set status = 'cancelled' where order_id = 'NMASRF2';
  raise notice 'OK refund pada pembayaran belum lunas tidak diterapkan';
end $$;

-- refund oleh admin (sebagian lalu sisanya) + idempotensi dengan webhook Midtrans
do $$ declare c uuid := current_setting('as.c')::uuid; a uuid := current_setting('as.a')::uuid; i1 uuid; pid uuid; inv uuid; r jsonb; rid uuid; begin
  insert into public.invitations (user_id, title, status, slug, plan_id, package_type, expires_at, content) values (c, 'Refund admin', 'aktif', 'as-ra', 'essential', 'essential', now() + interval '80 days', '{}') returning id into i1;
  pid := pg_temp.paid(c, i1, 'NMASRA1', 'essential', 79000); select invoice_id into inv from public.payments where id = pid;
  perform pg_temp.as_user(a);
  r := public.admin_refund_request(inv, 'Pelanggan minta sebagian', 100000::bigint);
  if r ->> 'error' <> 'jumlah_refund_tidak_valid' then raise exception 'admin refund melebihi lolos: %', r; end if;
  r := public.admin_refund_request(inv, 'Pelanggan minta sebagian', 29000::bigint); rid := (r ->> 'id')::uuid;
  if not (r ->> 'ok')::boolean or (r ->> 'amount')::int <> 29000 then raise exception 'pengajuan sebagian gagal: %', r; end if;
  r := public.admin_refund_decide(rid, 'selesai', 'midtrans_dashboard', null, 'Refund sebagian via dashboard');
  reset role;
  if (select status from public.payments where id = pid) <> 'partially_refunded' or (select refunded_amount from public.payments where id = pid) <> 29000 then raise exception 'keputusan sebagian salah: %', r; end if;
  if (select status from public.invitations where id = i1) <> 'aktif' then raise exception 'refund sebagian admin menonaktifkan undangan'; end if;
  -- webhook Midtrans untuk refund yang sama (total 29000) tidak menambah lagi
  r := pg_temp.mt('NMASRA1', 'partial_refund', '29000.00');
  if r ->> 'result' <> 'duplicate' or (select refunded_amount from public.payments where id = pid) <> 29000 then raise exception 'webhook setelah refund admin diproses ulang: %', r; end if;
  -- sisa (2 argumen = sisa jumlah) -> refund penuh
  perform pg_temp.as_user(a);
  r := public.admin_refund_request(inv, 'Sisa refund pelanggan'); rid := (r ->> 'id')::uuid;
  if (r ->> 'amount')::int <> 50000 then raise exception 'sisa refund salah: %', r; end if;
  r := public.admin_refund_decide(rid, 'selesai', 'transfer_manual', null, 'Transfer sisa');
  r := public.admin_refund_request(inv, 'Coba lagi setelah penuh');
  if r ->> 'error' <> 'belum_lunas' then raise exception 'refund setelah penuh harus ditolak: %', r; end if;
  reset role;
  if (select status from public.payments where id = pid) <> 'refunded' or (select status from public.invitations where id = i1) <> 'nonaktif' or (select status from public.invoices where id = inv) <> 'refund' then raise exception 'refund admin penuh salah'; end if;
  if (select count(*) from public.payment_refunds where payment_id = pid and status = 'selesai') <> 2 or (select count(*) from public.payment_events where order_id = 'NMASRA1' and event_key like '%refund-admin%') <> 2 then raise exception 'jejak audit refund tidak lengkap'; end if;
  raise notice 'OK refund admin: sebagian lalu sisa, batas jumlah, idempoten dengan webhook, jejak audit tersimpan';
end $$;

----------------------------------------------------------------------------- B. Perpanjangan
do $$ declare c uuid := current_setting('as.c')::uuid; c2 uuid := current_setting('as.c2')::uuid; i2 uuid; i3 uuid; i4 uuid; i5 uuid; old_exp timestamptz; r jsonb; p public.payments; ok boolean; n int; begin
  -- undangan aktif (sisa 10 hari)
  insert into public.invitations (user_id, title, status, slug, plan_id, package_type, expires_at, content, public_url) values (c, 'Aktif', 'aktif', 'as-rn1', 'essential', 'essential', now() + interval '10 days', '{}', 'https://nusamora.com/as-rn1') returning id into i2;
  perform pg_temp.paid(c, i2, 'NMASRN0', 'essential', 79000);
  old_exp := now() + interval '10 days';

  -- milik orang lain tidak bisa
  r := public.prepare_renewal(c2, i2, 'essential');
  if r ->> 'error' <> 'tidak_ditemukan' then raise exception 'perpanjang undangan orang lain lolos: %', r; end if;
  -- upgrade belum didukung, downgrade tidak diizinkan
  r := public.prepare_renewal(c, i2, 'luxe');
  if r ->> 'error' <> 'upgrade_belum_didukung' then raise exception 'upgrade harus ditolak: %', r; end if;
  r := public.prepare_renewal(c, i2, 'tidak-ada');
  if r ->> 'error' <> 'paket_tidak_valid' then raise exception 'paket asing harus ditolak: %', r; end if;
  raise notice 'OK perpanjangan: kepemilikan dicek di backend, upgrade belum didukung';

  -- checkout tidak mengubah hak akses sebelum pembayaran terverifikasi
  r := public.prepare_renewal(c, i2, 'essential');
  if not (r ->> 'ok')::boolean or r ->> 'kind' <> 'renewal' or (r ->> 'amount')::bigint <> (select price from public.plan_effective('essential')) then raise exception 'prepare_renewal gagal: %', r; end if;
  perform set_config('as.rn1', r ->> 'order_id', false);
  if (select expires_at from public.invitations where id = i2) <> old_exp or (select status from public.invitations where id = i2) <> 'aktif' then raise exception 'checkout mengubah undangan'; end if;
  if (select count(*) from public.payments where invitation_id = i2 and status = 'pending') <> 1 then raise exception 'harus tepat satu pending'; end if;
  r := public.prepare_renewal(c, i2, 'essential');
  if not (r ->> 'reuse')::boolean or r ->> 'order_id' <> current_setting('as.rn1') then raise exception 'pending perpanjangan harus dipakai ulang: %', r; end if;
  -- webhook pending/expire tidak mengubah undangan
  r := pg_temp.mt(current_setting('as.rn1'), 'pending');
  if (select status from public.invitations where id = i2) <> 'aktif' or (select expires_at from public.invitations where id = i2) <> old_exp then raise exception 'webhook pending mengubah undangan perpanjangan'; end if;
  raise notice 'OK checkout perpanjangan: harga dari database, satu pending, tidak mengubah masa aktif sebelum verifikasi';

  -- terverifikasi: mulai dari masa aktif lama
  r := pg_temp.mt(current_setting('as.rn1'), 'settlement');
  select * into p from public.payments where order_id = current_setting('as.rn1');
  if r ->> 'result' <> 'applied' or p.status <> 'paid' or p.period_start <> old_exp or p.period_end <> old_exp + interval '90 days' then raise exception 'perpanjangan aktif salah: % % %', r, p.period_start, p.period_end; end if;
  if (select expires_at from public.invitations where id = i2) <> old_exp + interval '90 days' then raise exception 'masa aktif tidak dilanjutkan dari expiry lama'; end if;
  if (select published_at from public.invitations where id = i2) is not null and false then null; end if;
  -- webhook ganda tidak memperpanjang dua kali
  r := pg_temp.mt(current_setting('as.rn1'), 'settlement');
  r := public.apply_payment(current_setting('as.rn1'), 'settlement', 'accept', 'qris', 'TX-lain', '79000.00', '200', 'sync', '{}');
  if (select expires_at from public.invitations where id = i2) <> old_exp + interval '90 days' then raise exception 'webhook ganda memperpanjang dua kali'; end if;
  if (select count(*) from public.subscriptions where user_id = c and started_at = old_exp) <> 1 then raise exception 'riwayat langganan perpanjangan salah'; end if;
  raise notice 'OK perpanjangan undangan aktif: mulai dari expiry lama, webhook ganda tidak memperpanjang dua kali';

  -- undangan sudah habis: mulai dari tanggal bayar
  insert into public.invitations (user_id, title, status, slug, plan_id, package_type, expires_at, content) values (c, 'Habis', 'nonaktif', 'as-rn2', 'signature', 'signature', now() - interval '5 days', '{}') returning id into i3;
  perform pg_temp.paid(c, i3, 'NMASRN2', 'signature', 149000);
  r := public.prepare_renewal(c, i3, 'signature');
  if not (r ->> 'ok')::boolean then raise exception 'perpanjang undangan habis gagal: %', r; end if;
  if (select status from public.invitations where id = i3) <> 'nonaktif' then raise exception 'checkout mengaktifkan undangan sebelum bayar'; end if;
  r := pg_temp.mt(r ->> 'order_id', 'settlement');
  select * into p from public.payments where invitation_id = i3 and kind = 'renewal';
  if p.period_start <> now() or (select expires_at from public.invitations where id = i3) <> now() + make_interval(days => p.duration_days) or (select status from public.invitations where id = i3) <> 'aktif' then raise exception 'perpanjangan habis salah: % % % %', p.period_start, now(), (select expires_at from public.invitations where id = i3), (select status from public.invitations where id = i3); end if;
  raise notice 'OK perpanjangan undangan habis: mulai dari tanggal pembayaran berhasil, undangan aktif kembali';

  -- tidak bisa: draft, nonaktif karena refund sebelum habis, pembayaran gagal tidak memperpanjang
  insert into public.invitations (user_id, title, status, slug, package_type, content) values (c, 'Draft', 'draft', 'as-rn3', 'essential', '{}') returning id into i4;
  r := public.prepare_renewal(c, i4, 'essential');
  if r ->> 'error' <> 'tidak_dapat_diperpanjang' then raise exception 'draft bisa diperpanjang: %', r; end if;
  r := public.prepare_renewal(c, (select id from public.invitations where slug = 'as-rf'), 'signature');
  if r ->> 'error' <> 'tidak_dapat_diperpanjang' then raise exception 'undangan refund penuh bisa diperpanjang: %', r; end if;
  insert into public.invitations (user_id, title, status, slug, plan_id, package_type, expires_at, content) values (c, 'Gagal', 'aktif', 'as-rn4', 'essential', 'essential', now() + interval '3 days', '{}') returning id into i5;
  perform pg_temp.paid(c, i5, 'NMASRN4', 'essential', 79000);
  r := public.prepare_renewal(c, i5, 'essential');
  perform pg_temp.mt(r ->> 'order_id', 'expire');
  if (select expires_at from public.invitations where id = i5) <> now() + interval '3 days' or (select status from public.invitations where id = i5) <> 'aktif' then raise exception 'pembayaran gagal mengubah undangan'; end if;
  raise notice 'OK perpanjangan ditolak untuk draft/refund; pembayaran gagal tidak mengubah masa aktif';

  -- hak eksekusi: pelanggan tidak bisa memanggil prepare_renewal langsung
  perform pg_temp.as_user(c);
  begin perform public.prepare_renewal(c, i2, 'essential'); ok := false; exception when insufficient_privilege then ok := true; end;
  -- riwayat periode hanya milik sendiri
  n := jsonb_array_length(public.my_invitation_periods(i2));
  perform pg_temp.as_user(c2);
  if jsonb_array_length(public.my_invitation_periods(i2)) <> 0 then raise exception 'riwayat periode bocor ke pengguna lain'; end if;
  reset role;
  if not ok then raise exception 'prepare_renewal bisa dipanggil pelanggan'; end if;
  if n <> 2 then raise exception 'riwayat periode pemilik salah: %', n; end if;
  raise notice 'OK hak akses: prepare_renewal hanya service_role, riwayat periode memakai auth.uid()';
end $$;

----------------------------------------------------------------------------- C. Pengingat pembayaran tertunda
do $$ declare c uuid := current_setting('as.c')::uuid; i6 uuid; n int; st text; k text; begin
  insert into public.invitations (user_id, title, status, slug, package_type, content) values (c, 'Pengingat', 'menunggu_pembayaran', 'as-pr', 'essential', '{}') returning id into i6;
  insert into public.invoices (user_id, number, description, amount, status, midtrans_order_id) values
    (c, 'AS-PR1', 'uji', 79000, 'menunggu', 'NMASPR1'), (c, 'AS-PR2', 'uji', 79000, 'lunas', 'NMASPR2'), (c, 'AS-PR3', 'uji', 79000, 'gagal', 'NMASPR3'),
    (c, 'AS-PR4', 'uji', 79000, 'gagal', 'NMASPR4'), (c, 'AS-PR5', 'uji', 79000, 'menunggu', 'NMASPR5');
  insert into public.payments (order_id, user_id, invitation_id, invoice_id, plan_id, amount, duration_days, experience, status, expires_at, created_at) values
    ('NMASPR1', c, i6, (select id from public.invoices where number = 'AS-PR1'), 'essential', 79000, 90, '2d', 'pending', now() + interval '20 hours', now() - interval '2 hours'),
    ('NMASPR2', c, i6, (select id from public.invoices where number = 'AS-PR2'), 'essential', 79000, 90, '2d', 'paid', now() + interval '20 hours', now() - interval '2 hours'),
    ('NMASPR3', c, i6, (select id from public.invoices where number = 'AS-PR3'), 'essential', 79000, 90, '2d', 'expired', now() - interval '1 hour', now() - interval '30 hours'),
    ('NMASPR4', c, i6, (select id from public.invoices where number = 'AS-PR4'), 'essential', 79000, 90, '2d', 'failed', now() + interval '20 hours', now() - interval '2 hours');
  -- pending yang baru dibuat (belum melewati interval) tidak diingatkan; checkout tidak memicu email
  if exists (select 1 from public.notif_outbox where user_id = c) then raise exception 'email terkirim saat checkout'; end if;

  n := public.enqueue_pending_payment_reminders(100);
  if n <> 0 then raise exception 'pengingat jalan saat dinonaktifkan: %', n; end if;
  update public.notif_settings set value = 'true' where key = 'pending_reminder_enabled';
  n := public.enqueue_pending_payment_reminders(100);
  if n <> 0 then raise exception 'pengingat jalan saat aturan nonaktif: %', n; end if;
  update public.notif_rules set enabled = true where event = 'payment_pending_reminder';
  n := public.enqueue_pending_payment_reminders(100);
  if n <> 1 or (select count(*) from public.notif_outbox where event = 'payment_pending_reminder' and user_id = c) <> 1
     or not exists (select 1 from public.notif_outbox where dedupe_key like 'payrem:' || (select id from public.payments where order_id = 'NMASPR1') || ':%') then raise exception 'hanya pending yang boleh diingatkan: %', n; end if;
  raise notice 'OK pengingat: hanya pending yang melewati interval; paid/expired/failed tidak; tidak ada email saat checkout';

  -- tidak ganda: panggilan ulang & reset penanda tetap satu pesan (dedupe key)
  n := public.enqueue_pending_payment_reminders(100);
  update public.payments set reminder_queued_at = null where order_id = 'NMASPR1';
  n := n + public.enqueue_pending_payment_reminders(100);
  if n <> 0 or (select count(*) from public.notif_outbox where event = 'payment_pending_reminder' and user_id = c) <> 1 then raise exception 'pengingat ganda: %', n; end if;
  raise notice 'OK pengingat maksimal satu per transaksi (dedupe key)';

  -- interval bisa diatur
  insert into public.payments (order_id, user_id, invitation_id, invoice_id, plan_id, amount, duration_days, experience, status, expires_at, created_at)
  values ('NMASPR5', c, (select id from public.invitations where slug = 'as-rn3'), (select id from public.invoices where number = 'AS-PR5'), 'essential', 79000, 90, '2d', 'pending', now() + interval '23 hours', now() - interval '30 minutes');
  if public.enqueue_pending_payment_reminders(100) <> 0 then raise exception 'interval 60 menit tidak dihormati'; end if;
  update public.notif_settings set value = '20' where key = 'pending_reminder_after_minutes';
  if public.enqueue_pending_payment_reminders(100) <> 1 then raise exception 'interval 20 menit tidak dipakai'; end if;
  raise notice 'OK interval pengingat dapat dikonfigurasi';

  -- dibayar sebelum terkirim: pengingat dibatalkan
  perform pg_temp.mt('NMASPR1', 'settlement');
  select status into st from public.notif_outbox where event = 'payment_pending_reminder' and dedupe_key like 'payrem:' || (select id from public.payments where order_id = 'NMASPR1') || ':%';
  if st <> 'cancelled' then raise exception 'pengingat untuk pembayaran lunas tidak dibatalkan: %', st; end if;
  -- kedaluwarsa (belum disapu) saat akan dikirim: notif_claim membatalkan, tidak mengirim
  update public.payments set expires_at = now() - interval '1 minute' where order_id = 'NMASPR5';
  update public.notif_outbox set next_attempt_at = now() - interval '1 minute' where user_id = c;
  if exists (select 1 from public.notif_claim(100, array['email']) x where x.event = 'payment_pending_reminder') then raise exception 'pengingat kedaluwarsa ikut dikirim'; end if;
  select status into st from public.notif_outbox where event = 'payment_pending_reminder' and dedupe_key like 'payrem:' || (select id from public.payments where order_id = 'NMASPR5') || ':%';
  if st <> 'cancelled' then raise exception 'pengingat kedaluwarsa tidak dibatalkan: %', st; end if;
  raise notice 'OK status dicek ulang: lunas/kedaluwarsa membatalkan pengingat sebelum dikirim';
  update public.notif_outbox set status = 'cancelled' where user_id = c and status in ('pending', 'sending');
end $$;

----------------------------------------------------------------------------- D. Konfigurasi notifikasi pembayaran
do $$ declare c uuid := current_setting('as.c')::uuid; a uuid := current_setting('as.a')::uuid; sp uuid := current_setting('as.sp')::uuid; r jsonb; i7 uuid; ok boolean; oid text; begin
  update public.notif_rules set enabled = false where event in ('payment_paid', 'payment_failed', 'payment_pending_reminder');
  perform pg_temp.as_user(a);
  r := public.admin_notif_payment_readiness();
  if (r ->> 'ready')::boolean or not (r -> 'missing_config' ? 'email_from_address') or not (r -> 'missing_config' ? 'support_email') then raise exception 'kesiapan salah: %', r; end if;
  r := public.admin_notif_payment_preset(true);
  if r ->> 'error' <> 'perlu_konfigurasi' then raise exception 'preset tanpa konfigurasi lolos: %', r; end if;
  if exists (select 1 from public.notif_rules where event in ('payment_paid', 'payment_failed') and enabled) then raise exception 'aturan aktif tanpa konfigurasi'; end if;
  begin perform public.admin_notif_settings_save('{"support_email":"bukan-email"}'); ok := false; exception when others then ok := sqlerrm = 'support_email_tidak_valid'; end;
  if not ok then raise exception 'support_email tidak divalidasi'; end if;
  perform public.admin_notif_settings_save('{"email_from_address":"noreply@uji.nusamora.test","support_email":"bantuan@uji.nusamora.test","pending_reminder_after_minutes":45}');
  r := public.admin_notif_payment_readiness();
  if not (r ->> 'ready')::boolean or (r #>> '{pending_reminder,after_minutes}')::int <> 45 then raise exception 'kesiapan setelah konfigurasi salah: %', r; end if;
  r := public.admin_notif_payment_preset(true);
  if not exists (select 1 from public.notif_rules where event = 'payment_paid' and channel = 'email' and recipient = 'customer' and enabled)
     or not exists (select 1 from public.notif_rules where event = 'payment_failed' and channel = 'email' and recipient = 'customer' and enabled)
     or exists (select 1 from public.notif_rules where event = 'payment_paid' and channel = 'whatsapp' and enabled) then raise exception 'preset mengaktifkan aturan yang salah'; end if;
  perform pg_temp.as_user(sp);
  begin perform public.admin_notif_payment_preset(false); ok := false; exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'support bisa mengubah preset'; end if;
  reset role;
  raise notice 'OK konfigurasi: payment_paid & payment_failed dapat diatur, butuh pengirim + support_email, hak akses';

  -- tidak ada email sebelum pembayaran terverifikasi; dedupe saat webhook dikirim ulang
  insert into public.invitations (user_id, title, status, slug, package_type, content) values (c, 'Notif', 'menunggu_pembayaran', 'as-nt', 'essential', '{}') returning id into i7;
  insert into public.invoices (user_id, number, description, amount, status, midtrans_order_id) values (c, 'AS-NT1', 'uji', 79000, 'menunggu', 'NMASNT1');
  insert into public.payments (order_id, user_id, invitation_id, invoice_id, plan_id, amount, duration_days, experience, status, expires_at)
  values ('NMASNT1', c, i7, (select id from public.invoices where number = 'AS-NT1'), 'essential', 79000, 90, '2d', 'pending', now() + interval '1 day');
  perform pg_temp.mt('NMASNT1', 'pending');
  if exists (select 1 from public.notif_outbox where user_id = c and event in ('payment_paid', 'payment_failed') and status <> 'cancelled') then raise exception 'email sebelum pembayaran terverifikasi'; end if;
  perform pg_temp.mt('NMASNT1', 'settlement');
  perform pg_temp.mt('NMASNT1', 'settlement');
  perform public.apply_payment('NMASNT1', 'settlement', 'accept', 'qris', 'TX-lain', '79000.00', '200', 'sync', '{}');
  if (select count(*) from public.notif_outbox where user_id = c and event = 'payment_paid') <> 1 then raise exception 'email lunas ganda'; end if;
  -- refund sebagian tidak memicu email pembayaran
  perform pg_temp.mt('NMASNT1', 'partial_refund', '1000.00');
  if (select count(*) from public.notif_outbox where user_id = c and event in ('payment_paid', 'payment_failed')) <> 1 then raise exception 'refund sebagian memicu email pembayaran'; end if;
  raise notice 'OK notifikasi: tidak ada email sebelum verifikasi, webhook ulang tidak menggandakan email';
end $$;

select pg_temp.clean();
