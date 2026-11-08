-- Uji DB admin-reports.sql: pendapatan (kotor/refund/bersih), per paket, pelanggan baru vs kembali, funnel, template, kategori, affiliate, Live Guest, hak akses.
\set ON_ERROR_STOP on
\set QUIET on
delete from public.live_guest_events where invitation_id in (select id from public.invitations where slug like 'rp-%');
delete from public.referrals where affiliate_id in (select id from public.affiliates where code like 'RPT%');
delete from public.affiliates where code like 'RPT%';
delete from public.payments where order_id like 'NMRP%'; delete from public.invitations where slug like 'rp-%';
delete from auth.users where email like 'rp.%@uji.nusamora.test';
create or replace function pg_temp.as_user(u uuid) returns void language plpgsql as $$ begin reset role; perform set_config('request.jwt.claim.sub', u::text, false); perform set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated')::text, false); set role authenticated; end $$;
grant execute on function pg_temp.as_user(uuid) to public;

do $$ declare ad uuid := gen_random_uuid(); fi uuid := gen_random_uuid(); su uuid := gen_random_uuid();
  u1 uuid := gen_random_uuid(); u2 uuid := gen_random_uuid(); u3 uuid := gen_random_uuid(); u4 uuid := gen_random_uuid();
  g1 uuid := gen_random_uuid(); g2 uuid := gen_random_uuid(); g3 uuid := gen_random_uuid(); i1 uuid; i2 uuid; i3 uuid; i4 uuid; i5 uuid; af uuid; begin
  insert into auth.users (id, email) select x, 'rp.' || n || '@uji.nusamora.test' from (values (ad,'admin'),(fi,'fin'),(su,'sup'),(u1,'u1'),(u2,'u2'),(u3,'u3'),(u4,'u4')) v(x, n);
  insert into public.profiles (id, full_name) select x, 'RP ' || x::text from (values (ad),(fi),(su),(u1),(u2),(u3),(u4)) v(x) on conflict (id) do nothing;
  update public.profiles set created_at = now() - interval '200 days' where id in (u4, ad, fi, su);
  insert into public.admin_users (user_id, role) values (ad, 'super_admin'), (fi, 'finance'), (su, 'support');
  insert into public.invitations (user_id, title, category, template_id, package_type, slug, status, event_date, published_at, content) values
   (u1, 'Undangan 1', 'wedding', 'rp-tpl-a', 'essential', 'rp-1', 'aktif', current_date + 20, now() - interval '2 days', '{}') returning id into i1;
  insert into public.invitations (user_id, title, category, template_id, package_type, slug, status, event_date, published_at, content) values
   (u1, 'Undangan 2', 'wedding', 'rp-tpl-a', 'signature', 'rp-2', 'aktif', current_date + 20, now() - interval '1 days', '{}') returning id into i2;
  insert into public.invitations (user_id, title, category, template_id, package_type, slug, status, event_date, content) values
   (u2, 'Undangan 3', 'birthday', 'rp-tpl-b', 'luxe', 'rp-3', 'nonaktif', current_date + 20, '{}') returning id into i3;
  insert into public.invitations (user_id, title, category, template_id, package_type, slug, status, event_date, content) values
   (u3, 'Undangan 4', 'birthday', 'rp-tpl-b', 'essential', 'rp-4', 'menunggu_pembayaran', current_date + 20, '{}') returning id into i4;
  insert into public.invitations (user_id, title, category, template_id, package_type, slug, status, event_date, published_at, content) values
   (u4, 'Undangan 5', 'wedding', 'rp-tpl-a', 'essential', 'rp-5', 'aktif', current_date + 20, now() - interval '3 days', '{}') returning id into i5;
  insert into public.payments (order_id, user_id, invitation_id, plan_id, amount, duration_days, experience, expires_at, status, paid_at, base_amount, discount_name) values
   ('NMRP1', u1, i1, 'essential', 79000, 90, '2d', now() + interval '1 day', 'paid', now() - interval '5 days', 89000, 'Promo X'),
   ('NMRP2', u1, i2, 'signature', 149000, 180, '2d', now() + interval '1 day', 'paid', now() - interval '2 days', null, null),
   ('NMRP3', u2, i3, 'luxe', 249000, 365, '2d', now() + interval '1 day', 'refunded', now() - interval '4 days', null, null),
   ('NMRP4', u3, i4, 'essential', 79000, 90, '2d', now() + interval '1 day', 'pending', null, null, null),
   ('NMRP5', u4, i5, 'essential', 79000, 90, '2d', now() + interval '1 day', 'paid', now() - interval '3 days', null, null),
   ('NMRP6', u4, i5, 'essential', 79000, 90, '2d', now() + interval '1 day', 'paid', now() - interval '90 days', null, null);
  insert into public.affiliates (user_id, code, status) values (u1, 'RPT1', 'aktif') returning id into af;
  insert into public.referrals (affiliate_id, referred_user_id, status, commission) values (af, u2, 'berbayar', 20000), (af, u3, 'terdaftar', 0);
  insert into public.invitation_guests (id, invitation_id, name, token) values (g1, i2, 'A', 'rp-tk1'), (g2, i2, 'B', 'rp-tk2'), (g3, i3, 'C', 'rp-tk3');
  insert into public.live_guest_events (invitation_id, guest_id, guest_name, action) values (i2, g1, 'A', 'masuk'), (i2, g2, 'B', 'masuk'), (i2, g1, 'A', 'sapa'), (i3, g3, 'C', 'masuk');
  perform set_config('rp.admin', ad::text, false); perform set_config('rp.fin', fi::text, false); perform set_config('rp.sup', su::text, false);
end $$;

do $$ declare r jsonb; ok boolean; begin
  perform pg_temp.as_user(current_setting('rp.admin')::uuid);
  r := public.admin_report(now() - interval '30 days', now() + interval '1 day');
  -- pendapatan periode: 79000 + 149000 + 79000 (paid) ; 249000 refund
  if (r #>> '{revenue,net}')::int <> 307000 then raise exception 'pendapatan bersih salah: %', r -> 'revenue'; end if;
  if (r #>> '{revenue,refund}')::int <> 249000 or (r #>> '{revenue,gross}')::int <> 556000 then raise exception 'kotor/refund salah: %', r -> 'revenue'; end if;
  if (r #>> '{revenue,orders}')::int <> 4 or (r #>> '{revenue,refunded_orders}')::int <> 1 or (r #>> '{revenue,refund_rate}')::numeric <> 25.0 then raise exception 'jumlah pesanan / refund rate salah: %', r -> 'revenue'; end if;
  if (r #>> '{revenue,avg_order}')::int <> 139000 then raise exception 'rata-rata transaksi salah: %', r -> 'revenue'; end if;
  if (r #>> '{revenue,discount_total}')::int <> 10000 or (r #>> '{revenue,discounted_orders}')::int <> 0 then raise exception 'total diskon salah: %', r -> 'revenue'; end if;
  raise notice 'OK pendapatan: kotor, refund, bersih, pesanan, refund rate, rata-rata, total diskon';
  -- per paket
  if (select (x ->> 'revenue')::int from jsonb_array_elements(r -> 'by_plan') x where x ->> 'plan_id' = 'essential') <> 158000
     or (select (x ->> 'revenue')::int from jsonb_array_elements(r -> 'by_plan') x where x ->> 'plan_id' = 'luxe') <> 0
     or (select (x ->> 'refunded')::int from jsonb_array_elements(r -> 'by_plan') x where x ->> 'plan_id' = 'luxe') <> 1 then raise exception 'per paket salah: %', r -> 'by_plan'; end if;
  if jsonb_array_length(r -> 'by_plan') <> 3 then raise exception 'semua paket harus tampil walau tanpa penjualan'; end if;
  -- seri: total revenue seri = bersih; seri per paket konsisten
  if (select sum((x ->> 'revenue')::int) from jsonb_array_elements(r -> 'series') x) <> 307000
     or (select sum((x ->> 'essential')::int + (x ->> 'signature')::int + (x ->> 'luxe')::int) from jsonb_array_elements(r -> 'series') x) <> 307000 then raise exception 'seri tidak konsisten dengan total: %', r -> 'series'; end if;
  raise notice 'OK pendapatan per paket dan seri (jumlah seri = total, tiga paket selalu tampil)';
  -- pelanggan
  if (r #>> '{customers,buyers}')::int <> 3 or (r #>> '{customers,buyers_new}')::int <> 2 or (r #>> '{customers,buyers_returning}')::int <> 1 then raise exception 'pembeli baru/kembali salah: %', r -> 'customers'; end if;
  if (r #>> '{customers,new}')::int <> 3 then raise exception 'pelanggan baru salah: %', r -> 'customers'; end if;
  raise notice 'OK pelanggan: baru vs kembali';
  -- funnel kohort (u1,u2,u3 mendaftar pada periode)
  if (select array_agg((x ->> 'n')::int order by ord) from jsonb_array_elements(r -> 'funnel') with ordinality t(x, ord)) <> array[3,3,3,2,1] then raise exception 'funnel salah: %', r -> 'funnel'; end if;
  raise notice 'OK funnel: daftar > undangan > checkout > bayar > terbit';
  -- template dan kategori
  if (select (x ->> 'invitations')::int from jsonb_array_elements(r -> 'top_templates') x where x ->> 'slug' = 'rp-tpl-a') < 2 then raise exception 'template teratas salah: %', r -> 'top_templates'; end if;
  if (select (x ->> 'paid')::int from jsonb_array_elements(r -> 'categories') x where x ->> 'category' = 'birthday') <> 1 then raise exception 'kategori salah: %', r -> 'categories'; end if;
  raise notice 'OK template teratas dan kategori acara';
  -- affiliate dan live
  if (r #>> '{affiliate,referrals}')::int <> 2 or (r #>> '{affiliate,referrals_paid}')::int <> 1 or (r #>> '{affiliate,commission}')::int <> 20000 then raise exception 'affiliate salah: %', r -> 'affiliate'; end if;
  if (r #>> '{live,events}')::int <> 4 or (r #>> '{live,rooms}')::int <> 2 or (r #>> '{live,guests}')::int <> 3 then raise exception 'live guest salah: %', r -> 'live'; end if;
  raise notice 'OK affiliate dan penggunaan Live Guest';
  -- periode lain tidak ikut: 7 hari terakhir tanpa NMRP6
  r := public.admin_report(now() - interval '120 days', now() - interval '60 days');
  if (r #>> '{revenue,net}')::int <> 79000 or (r #>> '{customers,buyers_returning}')::int <> 0 then raise exception 'periode lama salah: %', r; end if;
  -- validasi periode
  begin perform public.admin_report(now(), now() - interval '1 day'); ok := false; exception when others then ok := sqlerrm = 'periode_tidak_valid'; end;
  if not ok then raise exception 'periode terbalik harus ditolak'; end if;
  begin perform public.admin_report(now() - interval '500 days', now()); ok := false; exception when others then ok := sqlerrm = 'periode_tidak_valid'; end;
  if not ok then raise exception 'periode > 400 hari harus ditolak'; end if;
  raise notice 'OK periode: jendela waktu dihormati, periode tidak valid ditolak';
end $$;

do $$ declare r jsonb; ok boolean; begin
  perform pg_temp.as_user(current_setting('rp.fin')::uuid);
  r := public.admin_report(now() - interval '30 days', now() + interval '1 day');
  if (r #>> '{revenue,net}')::int <> 307000 then raise exception 'finance harus bisa membaca laporan'; end if;
  perform pg_temp.as_user(current_setting('rp.sup')::uuid);
  begin perform public.admin_report(now() - interval '30 days', now()); ok := false; exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'support tidak boleh membaca laporan'; end if;
  begin perform public.admin_report(now() - interval '30 days', now()); exception when others then null; end;
  reset role; set role anon;
  begin perform public.admin_report(now() - interval '30 days', now()); ok := false; exception when others then ok := true; end;
  reset role;
  if not ok then raise exception 'anon tidak boleh membaca laporan'; end if;
  raise notice 'OK hak akses: finance boleh, support dan anon ditolak';
end $$;

reset role;
delete from public.live_guest_events where invitation_id in (select id from public.invitations where slug like 'rp-%');
delete from public.referrals where affiliate_id in (select id from public.affiliates where code like 'RPT%');
delete from public.affiliates where code like 'RPT%';
delete from public.payments where order_id like 'NMRP%'; delete from public.invitations where slug like 'rp-%';
delete from auth.users where email like 'rp.%@uji.nusamora.test';
