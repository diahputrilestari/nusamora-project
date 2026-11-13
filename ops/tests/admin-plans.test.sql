-- Uji DB admin-plans.sql: validasi paket, alasan perubahan harga, diskon/harga khusus (jadwal, tabrakan), harga efektif di checkout, mata uang, riwayat, hak akses.
\set ON_ERROR_STOP on
\set QUIET on
delete from public.payment_events where order_id like 'NMAP%'; delete from public.payments where user_id in (select id from auth.users where email like 'ap.%@uji.nusamora.test'); delete from public.invoices where number like 'AP-%' or user_id in (select id from auth.users where email like 'ap.%@uji.nusamora.test');
delete from public.invitations where slug like 'ap-%'; delete from public.plan_discounts; delete from public.plan_prices; delete from public.plan_changes;
delete from auth.users where email like 'ap.%@uji.nusamora.test';
update public.plans set price = case id when 'essential' then 79000 when 'signature' then 149000 else 249000 end, gallery_limit = case id when 'essential' then 10 when 'signature' then 20 else 40 end, upload_max_mb = 3, live_max_guests = null, live_max_rooms = null, active = true;
delete from public.plan_changes;
create or replace function pg_temp.as_user(u uuid) returns void language plpgsql as $$ begin reset role; perform set_config('request.jwt.claim.sub', u::text, false); perform set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated')::text, false); set role authenticated; end $$;
grant execute on function pg_temp.as_user(uuid) to public;
do $$ declare a uuid := gen_random_uuid(); f uuid := gen_random_uuid(); sp uuid := gen_random_uuid(); c uuid := gen_random_uuid(); begin
  insert into auth.users (id, email) values (a, 'ap.admin@uji.nusamora.test'), (f, 'ap.fin@uji.nusamora.test'), (sp, 'ap.sup@uji.nusamora.test'), (c, 'ap.cust@uji.nusamora.test');
  insert into public.profiles (id, full_name) values (a, 'Admin Uji'), (f, 'Finance Uji'), (sp, 'Support Uji'), (c, 'Pelanggan Uji') on conflict (id) do update set full_name = excluded.full_name;
  insert into public.admin_users (user_id, role) values (a, 'super_admin'), (f, 'finance'), (sp, 'support');
  perform set_config('ap.admin', a::text, false); perform set_config('ap.fin', f::text, false); perform set_config('ap.sup', sp::text, false); perform set_config('ap.cust', c::text, false);
end $$;

-- 1. Ubah paket: validasi, alasan wajib saat harga berubah, tercatat di riwayat
do $$ declare r jsonb; n int; begin
  perform pg_temp.as_user(current_setting('ap.admin')::uuid);
  r := public.admin_plan_save('essential', '{"price":89000}', null);
  if r ->> 'error' <> 'alasan_harga_wajib' then raise exception 'alasan harga harus wajib: %', r; end if;
  r := public.admin_plan_save('essential', '{"price":500}', 'tes'); if r ->> 'error' <> 'harga_tidak_valid' then raise exception 'harga minimum: %', r; end if;
  r := public.admin_plan_save('essential', '{"upload_max_mb":9}', null); if r ->> 'error' <> 'ukuran_tidak_valid' then raise exception 'ukuran upload maks 3 MB (batas bucket): %', r; end if;
  r := public.admin_plan_save('essential', '{"duration_days":0}', null); if r ->> 'error' <> 'durasi_tidak_valid' then raise exception 'durasi: %', r; end if;
  r := public.admin_plan_save('essential', '{"live_max_guests":0}', null); if r ->> 'error' <> 'batas_live_tidak_valid' then raise exception 'batas live: %', r; end if;
  r := public.admin_plan_save('essential', '{"id":"x"}', null); if r ->> 'error' <> 'kolom_tidak_diizinkan' then raise exception 'kolom: %', r; end if;
  r := public.admin_plan_save('basic', '{"name":"x"}', null); if r ->> 'error' <> 'paket_tidak_valid' then raise exception 'paket: %', r; end if;
  r := public.admin_plan_save('essential', '{"price":89000,"gallery_limit":12,"upload_max_mb":2.5,"live_max_guests":50}', 'Penyesuaian harga 2026');
  if (r ->> 'ok')::boolean is not true then raise exception 'simpan gagal: %', r; end if;
  reset role;
  if (select price from public.plans where id = 'essential') <> 89000 then raise exception 'harga tidak tersimpan'; end if;
  select count(*) into n from public.plan_changes where plan_id = 'essential' and scope = 'paket' and field = 'price' and old_value = '79000' and new_value = '89000' and note = 'Penyesuaian harga 2026' and actor_name = 'Admin Uji';
  if n <> 1 then raise exception 'riwayat harga tidak tercatat lengkap (%)', n; end if;
  select count(*) into n from public.plan_changes where plan_id = 'essential' and field in ('gallery_limit','upload_max_mb','live_max_guests');
  if n <> 3 then raise exception 'perubahan batas tidak tercatat (%)', n; end if;
  raise notice 'OK validasi paket, alasan wajib saat harga berubah, riwayat mencatat siapa/kapan/alasan';
end $$;

-- 2. Diskon: validasi, tabrakan jadwal, harga efektif
do $$ declare r jsonb; id1 uuid; e record; begin
  perform pg_temp.as_user(current_setting('ap.admin')::uuid);
  r := public.admin_discount_save(null, jsonb_build_object('plan_id','essential','name','Promo','kind','percent','value',100,'starts_at',now() - interval '1 day','ends_at',now() + interval '5 days'), null);
  if r ->> 'error' <> 'persen_tidak_valid' then raise exception 'persen 100: %', r; end if;
  r := public.admin_discount_save(null, jsonb_build_object('plan_id','essential','name','Promo','kind','fixed','value',89000,'starts_at',now() - interval '1 day','ends_at',now() + interval '5 days'), null);
  if r ->> 'error' <> 'nilai_melebihi_harga' then raise exception 'potongan >= harga: %', r; end if;
  r := public.admin_discount_save(null, jsonb_build_object('plan_id','essential','name','Promo','kind','percent','value',10,'starts_at',now() + interval '5 days','ends_at',now() + interval '1 day'), null);
  if r ->> 'error' <> 'tanggal_tidak_valid' then raise exception 'tanggal: %', r; end if;
  r := public.admin_discount_save(null, jsonb_build_object('plan_id','essential','name','Diskon 20%','kind','percent','value',20,'starts_at',now() - interval '1 day','ends_at',now() + interval '5 days'), null);
  if (r ->> 'ok')::boolean is not true then raise exception 'diskon gagal: %', r; end if; id1 := (r ->> 'id')::uuid; perform set_config('ap.d1', id1::text, false);
  r := public.admin_discount_save(null, jsonb_build_object('plan_id','essential','name','Tabrakan','kind','fixed','value',5000,'starts_at',now(),'ends_at',now() + interval '2 days'), null);
  if r ->> 'error' <> 'diskon_bertabrakan' then raise exception 'jadwal bertabrakan harus ditolak: %', r; end if;
  select * into e from public.plan_effective('essential');
  if e.base <> 89000 or e.price <> 71200 or e.discount_name <> 'Diskon 20%' then raise exception 'harga efektif persen salah: % %', e.base, e.price; end if;
  -- harga khusus untuk paket lain, jadwal yang belum mulai tidak berlaku
  r := public.admin_discount_save(null, jsonb_build_object('plan_id','signature','name','Khusus Lebaran','kind','special','value',99000,'starts_at',now() + interval '2 days','ends_at',now() + interval '9 days'), null);
  if (r ->> 'ok')::boolean is not true then raise exception 'harga khusus gagal: %', r; end if;
  select * into e from public.plan_effective('signature'); if e.price <> 149000 then raise exception 'diskon belum mulai tidak boleh berlaku: %', e.price; end if;
  -- nonaktifkan diskon
  r := public.admin_discount_save(id1, '{"active":false}', null); if (r ->> 'ok')::boolean is not true then raise exception 'nonaktif gagal: %', r; end if;
  select * into e from public.plan_effective('essential'); if e.price <> 89000 then raise exception 'diskon nonaktif tidak boleh berlaku'; end if;
  r := public.admin_discount_save(id1, '{"active":true}', null);
  -- harga tidak boleh turun di bawah potongan tetap/khusus yang masih aktif
  r := public.admin_plan_save('signature', '{"price":90000}', 'uji'); if r ->> 'error' <> 'harga_di_bawah_diskon' then raise exception 'harga di bawah harga khusus: %', r; end if;
  reset role;
  if not exists (select 1 from public.plan_changes where scope = 'diskon' and plan_id = 'essential' and field = 'Diskon 20%') then raise exception 'riwayat diskon kosong'; end if;
  raise notice 'OK diskon persen / tetap / khusus: validasi, tabrakan jadwal, jadwal mulai-akhir, nonaktif, riwayat';
end $$;

-- 3. public_plans: harga efektif, harga asli, mata uang lain, fitur terpecah
do $$ declare r jsonb; e jsonb; begin
  perform pg_temp.as_user(current_setting('ap.admin')::uuid);
  r := public.admin_plan_price_set('essential', 'USD', 5.99, true, null); if (r ->> 'ok')::boolean is not true then raise exception 'USD: %', r; end if;
  r := public.admin_plan_price_set('essential', 'JPY', 900.5, true, null); if r ->> 'error' <> 'jumlah_tidak_valid' then raise exception 'JPY pecahan harus ditolak: %', r; end if;
  r := public.admin_plan_price_set('essential', 'IDR', 1, true, null); if r ->> 'error' <> 'mata_uang_tidak_valid' then raise exception 'IDR bukan harga tampilan: %', r; end if;
  r := public.admin_plan_price_set('essential', 'SGD', 8, false, null);
  reset role; set role anon;
  e := (select x from jsonb_array_elements(public.public_plans()) x where x ->> 'id' = 'essential');
  if (e ->> 'price')::int <> 71200 or (e ->> 'base_price')::int <> 89000 or e #>> '{discount,name}' <> 'Diskon 20%' then raise exception 'public_plans harga: %', e; end if;
  if e #>> '{prices,USD}' <> '5.99' or e #> '{prices,SGD}' is not null then raise exception 'mata uang tampil hanya yang aktif: %', e -> 'prices'; end if;
  if jsonb_array_length(e -> 'features') < 3 then raise exception 'fitur harus terpecah: %', e -> 'features'; end if;
  if (e ->> 'upload_max_mb')::numeric <> 2.5 or (e ->> 'live_max_guests')::int <> 50 then raise exception 'batas paket: %', e; end if;
  reset role;
  raise notice 'OK public_plans (anon): harga efektif + asli + diskon, mata uang aktif saja, fitur, batas';
end $$;

-- 4. Checkout memakai harga efektif dan mencatat diskon pada pembayaran
do $$ declare c uuid := current_setting('ap.cust')::uuid; i uuid; r jsonb; pa record; begin
  reset role;
  insert into public.invitations (user_id, title, category, template_id, package_type, slug, status, event_date, content) values
   (c, 'Uji Harga', 'other', null, 'essential', 'ap-1', 'draft', current_date + 30,
    '{"names":{"a":"Acara Uji"},"event":{"start":"10:00","venue":"Aula"},"photos":{"cover":"https://x/y.webp"},"design2d":{"palette":"gold"}}') returning id into i;
  r := public.prepare_checkout(c, i, 'essential');
  if (r ->> 'ok')::boolean is not true then raise exception 'checkout gagal: %', r; end if;
  if (r ->> 'amount')::int <> 71200 then raise exception 'jumlah checkout harus harga setelah diskon: %', r; end if;
  select * into pa from public.payments where order_id = r ->> 'order_id';
  if pa.amount <> 71200 or pa.base_amount <> 89000 or pa.discount_name <> 'Diskon 20%' or pa.discount_id <> current_setting('ap.d1')::uuid then raise exception 'pembayaran tidak mencatat diskon: %', pa; end if;
  if not exists (select 1 from public.invoices where id = pa.invoice_id and amount = 71200 and description like '%promo Diskon 20%%') then raise exception 'invoice tidak sesuai'; end if;
  perform set_config('ap.order', r ->> 'order_id', false);
  -- jumlah dari Midtrans harus sama dengan harga efektif
  r := public.apply_payment(current_setting('ap.order'), 'settlement', 'accept', 'qris', 'tx-ap-1', '89000.00', '200', 'webhook', '{}');
  if r ->> 'result' <> 'amount_mismatch' then raise exception 'harga asli tidak boleh melunasi pesanan diskon: %', r; end if;
  r := public.apply_payment(current_setting('ap.order'), 'settlement', 'accept', 'qris', 'tx-ap-2', '71200.00', '200', 'webhook', '{}');
  if (select status from public.payments where order_id = current_setting('ap.order')) <> 'paid' then raise exception 'pembayaran harga diskon harus lunas: %', r; end if;
  -- diskon yang sudah dipakai tidak boleh dihapus
  perform pg_temp.as_user(current_setting('ap.admin')::uuid);
  r := public.admin_discount_delete(current_setting('ap.d1')::uuid); if r ->> 'error' <> 'sudah_dipakai' then raise exception 'diskon terpakai tidak boleh dihapus: %', r; end if;
  r := public.admin_discount_delete((select id from public.plan_discounts where name = 'Khusus Lebaran')); if (r ->> 'ok')::boolean is not true then raise exception 'hapus diskon belum dipakai: %', r; end if;
  reset role;
  raise notice 'OK checkout = harga efektif, pembayaran mencatat harga asli + diskon, jumlah Midtrans harus cocok, diskon terpakai tidak bisa dihapus';
end $$;

-- 5. Ringkasan admin dan hak akses
do $$ declare o jsonb; r jsonb; ok boolean; begin
  perform pg_temp.as_user(current_setting('ap.fin')::uuid);
  o := public.admin_plans_overview();
  if jsonb_array_length(o) <> 3 then raise exception 'ringkasan harus memuat 3 paket'; end if;
  if (select (x #>> '{stats,paid_count}')::int from jsonb_array_elements(o) x where x #>> '{plan,id}' = 'essential') <> 1 then raise exception 'statistik paket salah: %', o; end if;
  begin r := public.admin_plan_save('essential', '{"name":"X"}', null); ok := false; exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'finance (baca saja) tidak boleh mengubah paket'; end if;
  perform pg_temp.as_user(current_setting('ap.sup')::uuid);
  begin perform public.admin_plans_overview(); ok := false; exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'support tidak boleh melihat paket'; end if;
  perform pg_temp.as_user(current_setting('ap.cust')::uuid);
  begin perform public.admin_plan_history(); ok := false; exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'pelanggan tidak boleh melihat riwayat'; end if;
  begin update public.plans set price = 1 where id = 'essential'; ok := false; exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'tulis langsung ke tabel plans harus ditolak'; end if;
  perform pg_temp.as_user(current_setting('ap.fin')::uuid);
  if (select count(*) from public.admin_plan_history('essential', 50)) < 5 then raise exception 'riwayat harus terbaca oleh finance'; end if;
  reset role;
  raise notice 'OK hak akses: finance baca saja, support/pelanggan ditolak, tulis langsung ke plans ditolak';
end $$;

-- bersihkan agar uji lain pada DB yang sama tidak terpengaruh
reset role;
delete from public.payment_events where order_id in (select order_id from public.payments where user_id = current_setting('ap.cust')::uuid);
delete from public.payments where user_id = current_setting('ap.cust')::uuid;
delete from public.invoices where user_id = current_setting('ap.cust')::uuid;
delete from public.invitations where slug like 'ap-%';
delete from public.plan_discounts; delete from public.plan_prices; delete from public.plan_changes;
update public.plans set price = case id when 'essential' then 79000 when 'signature' then 149000 else 249000 end, gallery_limit = case id when 'essential' then 10 when 'signature' then 20 else 40 end, upload_max_mb = 3, live_max_guests = null, live_max_rooms = null, active = true;
delete from auth.users where email like 'ap.%@uji.nusamora.test';
