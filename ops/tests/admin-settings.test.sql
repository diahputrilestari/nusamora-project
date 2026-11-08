-- Uji DB admin-settings.sql: validasi pengaturan, public_settings, mode pemeliharaan, kesehatan, ekspor/impor, webhook keluar.
\set ON_ERROR_STOP on
\set QUIET on
create temp table _bk_settings as select * from public.app_settings;
create or replace function pg_temp.clean() returns void language plpgsql as $$ begin
  reset role;
  delete from public.webhook_endpoints where name like 'NT %';
  delete from public.payments where order_id like 'NMST%'; delete from public.invitations where slug like 'st-%';
  delete from public.notif_outbox where user_id in (select id from auth.users where email like 'st.%@uji.nusamora.test');
  delete from auth.users where email like 'st.%@uji.nusamora.test';
  delete from public.app_settings; insert into public.app_settings select * from _bk_settings;
  update public.notif_rules set enabled = false;
end $$;
select pg_temp.clean();
grant select, insert, update, delete on public.app_settings to authenticated;
-- DB uji tidak punya hak tabel bawaan Supabase; beri sementara (RLS/pemicu tetap berlaku) dan pulihkan di akhir.
create temp table _had as select t, has_table_privilege('authenticated', 'public.' || t, 'INSERT') as ins from unnest(array['invitations','payments']) t;
grant insert, select on public.invitations, public.payments to authenticated;
create or replace function pg_temp.as_user(u uuid) returns void language plpgsql as $$ begin reset role; perform set_config('request.jwt.claim.sub', u::text, false); perform set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated')::text, false); set role authenticated; end $$;
grant execute on function pg_temp.as_user(uuid) to public;
create or replace function pg_temp.as_claim(u uuid) returns void language plpgsql as $$ begin reset role; perform set_config('request.jwt.claim.sub', u::text, false); perform set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated')::text, false); end $$;
grant execute on function pg_temp.as_claim(uuid) to public;
create or replace function pg_temp.as_anon() returns void language plpgsql as $$ begin reset role; perform set_config('request.jwt.claim.sub', '', false); perform set_config('request.jwt.claims', '{}', false); set role anon; end $$;
grant execute on function pg_temp.as_anon() to public;
do $$ declare ad uuid := gen_random_uuid(); su uuid := gen_random_uuid(); c1 uuid := gen_random_uuid(); begin
  insert into auth.users (id, email) values (ad, 'st.admin@uji.nusamora.test'), (su, 'st.sup@uji.nusamora.test'), (c1, 'st.c1@uji.nusamora.test');
  insert into public.profiles (id, full_name) values (ad, 'ST Admin'), (su, 'ST Support'), (c1, 'ST Pelanggan') on conflict (id) do update set full_name = excluded.full_name;
  insert into public.admin_users (user_id, role) values (ad, 'super_admin'), (su, 'support');
  perform set_config('st.ad', ad::text, false); perform set_config('st.su', su::text, false); perform set_config('st.c1', c1::text, false);
end $$;
create or replace function pg_temp.fails(sql text, expect text) returns void language plpgsql as $$ begin
  begin execute sql; raise exception 'seharusnya gagal: %', sql; exception when others then if sqlerrm like 'seharusnya gagal%' or sqlerrm not like '%' || expect || '%' then raise exception 'galat salah untuk [%]: % (harap: %)', sql, sqlerrm, expect; end if; end; end $$;

-- 1. Validasi pengaturan
do $$ declare v text; begin
  perform pg_temp.as_user(current_setting('st.ad')::uuid);
  insert into public.app_settings (key, value) values ('platform_name', '"NusaMora"'), ('brand_primary', '"#9673D0"'), ('social_instagram', '"https://instagram.com/nusamora"'), ('timezone', '"Asia/Makassar"'), ('maintenance_mode', 'false'), ('support_email', '""') on conflict (key) do update set value = excluded.value;
  perform pg_temp.fails($q$insert into public.app_settings (key, value) values ('rahasia_baru', '"x"')$q$, 'kunci_tidak_dikenal');
  perform pg_temp.fails($q$update public.app_settings set value = '"merah"' where key = 'brand_primary'$q$, 'brand_primary_tidak_valid');
  perform pg_temp.fails($q$update public.app_settings set value = '"http://instagram.com/x"' where key = 'social_instagram'$q$, 'social_instagram_tidak_valid');
  perform pg_temp.fails($q$update public.app_settings set value = '"javascript:alert(1)"' where key = 'social_instagram'$q$, 'social_instagram_tidak_valid');
  perform pg_temp.fails($q$update public.app_settings set value = '"Mars/Olympus"' where key = 'timezone'$q$, 'timezone_tidak_valid');
  perform pg_temp.fails($q$update public.app_settings set value = '"bukan-email"' where key = 'support_email'$q$, 'support_email_tidak_valid');
  perform pg_temp.fails($q$update public.app_settings set value = '"x"' where key = 'platform_name'$q$, 'platform_name_tidak_valid');
  perform pg_temp.fails($q$update public.app_settings set value = '"ya"' where key = 'maintenance_mode'$q$, 'maintenance_mode_tidak_valid');
  perform pg_temp.fails($q$insert into public.app_settings (key, value) values ('max_upload_mb', '99') on conflict (key) do update set value = excluded.value$q$, 'max_upload_mb_tidak_valid');
  perform pg_temp.fails($q$insert into public.app_settings (key, value) values ('logo_url', '"javascript:alert(1)"') on conflict (key) do update set value = excluded.value$q$, 'logo_url_tidak_valid');
  perform pg_temp.fails($q$insert into public.app_settings (key, value) values ('seo_title', to_jsonb(repeat('x', 71))) on conflict (key) do update set value = excluded.value$q$, 'seo_title_terlalu_panjang');
  perform pg_temp.as_user(current_setting('st.su')::uuid);
  begin update public.app_settings set value = '"Lain"' where key = 'platform_name'; if found then raise exception 'support mengubah pengaturan'; end if; exception when insufficient_privilege then null; end;
  perform pg_temp.as_user(current_setting('st.c1')::uuid);
  select count(*)::text into v from public.app_settings; if v <> '0' then raise exception 'pelanggan membaca app_settings langsung (%)', v; end if;
  raise notice 'OK validasi: kunci asing, warna, URL sosial/logo (https saja), zona waktu, email, panjang, bool; support/pelanggan tidak bisa menulis/membaca';
end $$;

-- 2. public_settings
do $$ declare j jsonb; begin
  reset role;
  insert into public.app_settings (key, value) values ('midtrans_merchant_id', '"G123"'), ('bank_transfer_info', '"BCA 123"'), ('smtp_host', '"smtp.x"'), ('maintenance_message', '"Kembali pukul 10.00"') on conflict (key) do update set value = excluded.value;
  perform pg_temp.as_anon();
  j := public.public_settings();
  if j ->> 'platform_name' <> 'NusaMora' or j ->> 'brand_primary' <> '#9673D0' or j ->> 'timezone' <> 'Asia/Makassar' then raise exception 'pengaturan publik hilang: %', j; end if;
  if j ? 'midtrans_merchant_id' or j ? 'bank_transfer_info' or j ? 'smtp_host' or j ? 'support_email' then raise exception 'kebocoran: %', j; end if;
  if (j -> 'maintenance_mode') <> 'false' then raise exception 'maintenance_mode harus boolean false: %', j; end if;
  begin perform public.app_setting_on('maintenance_mode'); raise exception 'anon memanggil app_setting_on'; exception when insufficient_privilege then null; end;
  raise notice 'OK public_settings: hanya kunci aman, tanpa rahasia/rekening/SMTP, kunci kosong disembunyikan, maintenance boolean';
end $$;

-- 3. Mode pemeliharaan
do $$ declare c1 uuid := current_setting('st.c1')::uuid; ad uuid := current_setting('st.ad')::uuid; inv uuid; pid uuid; st text; begin
  reset role; update public.app_settings set value = 'false' where key = 'maintenance_mode';
  perform pg_temp.as_claim(c1);
  insert into public.invitations (user_id, title, category, template_id, package_type, slug, status, event_date, content) values (c1, 'Normal', 'wedding', 'st-tpl', 'essential', 'st-0', 'menunggu_pembayaran', current_date + 30, '{}');
  reset role; update public.app_settings set value = 'true' where key = 'maintenance_mode';
  perform pg_temp.as_claim(c1);
  begin insert into public.invitations (user_id, title, category, template_id, package_type, slug, status, event_date, content) values (c1, 'Saat MT', 'wedding', 'st-tpl', 'essential', 'st-1', 'menunggu_pembayaran', current_date + 30, '{}'); raise exception 'pelanggan membuat undangan saat pemeliharaan'; exception when others then if sqlerrm not like 'maintenance%' then raise; end if; end;
  begin insert into public.payments (order_id, user_id, plan_id, amount, duration_days, experience, expires_at, status) values ('NMST9', c1, 'essential', 1, 90, '2d', now() + interval '1 day', 'pending'); raise exception 'pelanggan membuat pembayaran saat pemeliharaan'; exception when others then if sqlerrm not like 'maintenance%' then raise; end if; end;
  perform pg_temp.as_claim(ad);
  insert into public.invitations (user_id, title, category, template_id, package_type, slug, status, event_date, content) values (c1, 'Oleh admin', 'wedding', 'st-tpl', 'essential', 'st-2', 'menunggu_pembayaran', current_date + 30, '{}');
  reset role; perform set_config('request.jwt.claim.sub', '', false); perform set_config('request.jwt.claims', '{}', false);
  insert into public.invitations (user_id, title, category, template_id, package_type, slug, status, event_date, content) values (c1, 'Service role', 'wedding', 'st-tpl', 'essential', 'st-3', 'menunggu_pembayaran', current_date + 30, '{}') returning id into inv;
  insert into public.payments (order_id, user_id, invitation_id, plan_id, amount, duration_days, experience, expires_at, status) values ('NMST1', c1, inv, 'essential', 79000, 90, '2d', now() + interval '1 day', 'pending') returning id into pid;
  update public.payments set status = 'paid', paid_at = now() where id = pid; select status into st from public.payments where id = pid;
  if st <> 'paid' then raise exception 'webhook harus tetap bisa melunasi saat pemeliharaan'; end if;
  update public.app_settings set value = '"true"' where key = 'maintenance_mode';
  perform pg_temp.as_claim(c1);
  begin insert into public.invitations (user_id, title, category, template_id, package_type, slug, status, event_date, content) values (c1, 'x', 'wedding', 'st-tpl', 'essential', 'st-4', 'menunggu_pembayaran', current_date + 30, '{}'); raise exception 'nilai string "true" tidak berlaku'; exception when others then if sqlerrm not like 'maintenance%' then raise; end if; end;
  reset role; update public.app_settings set value = 'false' where key = 'maintenance_mode';
  perform pg_temp.as_claim(c1);
  insert into public.invitations (user_id, title, category, template_id, package_type, slug, status, event_date, content) values (c1, 'Setelah', 'wedding', 'st-tpl', 'essential', 'st-5', 'menunggu_pembayaran', current_date + 30, '{}');
  raise notice 'OK pemeliharaan: pelanggan diblokir (undangan & pembayaran baru), admin/service_role boleh, pelunasan webhook tetap jalan, nilai "true" string berlaku, mati = normal';
end $$;

-- 4. Kesehatan sistem
do $$ declare j jsonb; begin
  perform pg_temp.as_user(current_setting('st.ad')::uuid); j := public.admin_system_health();
  if (j ->> 'db_size_bytes')::bigint <= 0 or not (j ? 'notif_pending' and j ? 'webhook_pending' and j ? 'security_24h' and j ? 'last_backup' and j ? 'customers' and j ? 'payments_stuck') then raise exception 'kesehatan tidak lengkap: %', j; end if;
  perform pg_temp.as_user(current_setting('st.c1')::uuid);
  begin perform public.admin_system_health(); raise exception 'pelanggan membaca kesehatan'; exception when insufficient_privilege then null; end;
  perform pg_temp.as_user(current_setting('st.su')::uuid);
  begin perform public.admin_system_health(); raise exception 'support membaca kesehatan'; exception when insufficient_privilege then null; end;
  raise notice 'OK kesehatan sistem: metrik lengkap, hanya admin berizin settings.read';
end $$;

-- 5. Ekspor / impor konfigurasi
do $$ declare j jsonb; r jsonb; before_v jsonb; begin
  perform pg_temp.as_user(current_setting('st.ad')::uuid); j := public.admin_config_export();
  if j ->> 'format' <> 'nusamora-config' or not (j -> 'app_settings' ? 'platform_name') or (j -> 'notif_settings') ? 'last_dispatch_at' or j::text like '%whsec_%' or j::text like '%secret%' then raise exception 'ekspor salah/bocor: %', left(j::text, 200); end if;
  -- dry-run: berkas rusak tidak mengubah apa pun
  r := public.admin_config_import(jsonb_set(j, '{app_settings,brand_primary}', '"merah"'), false);
  if (r ->> 'valid')::boolean or jsonb_array_length(r -> 'problems') <> 1 then raise exception 'dry-run harus mendeteksi 1 masalah: %', r; end if;
  begin perform public.admin_config_import(jsonb_set(jsonb_set(j, '{app_settings,brand_primary}', '"merah"'), '{app_settings,platform_name}', '"Diubah"'), true); raise exception 'impor rusak lolos'; exception when others then if sqlerrm not like 'impor_dibatalkan%' then raise; end if; end;
  reset role; if (select value from public.app_settings where key = 'platform_name') <> '"NusaMora"' then raise exception 'impor gagal harus atomik (platform_name berubah)'; end if;
  perform pg_temp.as_user(current_setting('st.ad')::uuid);
  r := public.admin_config_import(jsonb_set(j, '{app_settings,platform_name}', '"NusaMora 2"'), true);
  reset role; if (select value from public.app_settings where key = 'platform_name') <> '"NusaMora 2"' then raise exception 'impor sah tidak diterapkan'; end if;
  if not exists (select 1 from public.backup_log where kind = 'config') then raise exception 'impor tidak dicatat'; end if;
  perform pg_temp.as_user(current_setting('st.ad')::uuid);
  begin perform public.admin_config_import('{"format":"lain"}', false); raise exception 'format asing lolos'; exception when others then if sqlerrm not like '%format_tidak_dikenal%' then raise; end if; end;
  r := public.admin_config_import(jsonb_set(j, '{notif_rules}', '[{"event":"tidak_ada","channel":"email","recipient":"customer","enabled":true}]'), false);
  if (r ->> 'valid')::boolean then raise exception 'aturan asing lolos'; end if;
  perform pg_temp.as_user(current_setting('st.su')::uuid);
  begin perform public.admin_config_import(j, false); raise exception 'support impor'; exception when insufficient_privilege then null; end;
  begin perform public.admin_config_export(); raise exception 'support ekspor'; exception when insufficient_privilege then null; end;
  raise notice 'OK ekspor/impor: tanpa rahasia, dry-run mendeteksi, impor rusak atomik, impor sah diterapkan & dicatat, hak akses';
end $$;

-- 6. Webhook keluar
do $$ declare ad uuid := current_setting('st.ad')::uuid; c1 uuid := current_setting('st.c1')::uuid; w jsonb; w2 jsonb; wid uuid; inv uuid; pid uuid; n int; d record; s1 text; s2 text; i int; begin
  if public.webhook_url_ok('http://x.com/h') or public.webhook_url_ok('https://localhost/h') or public.webhook_url_ok('https://127.0.0.1/h') or public.webhook_url_ok('https://10.0.0.5/h') or public.webhook_url_ok('https://user@evil.com/h') or public.webhook_url_ok('https://x.internal/h') or public.webhook_url_ok('https://x.com:8443/h') or public.webhook_url_ok('https://[::1]/h') or public.webhook_url_ok('https://intranet/h') or public.webhook_url_ok('ftp://x.com') then raise exception 'webhook_url_ok terlalu longgar'; end if;
  if not public.webhook_url_ok('https://hooks.contoh-crm.co.id/nusamora?x=1') or not public.webhook_url_ok('https://api.x.com:443/h') then raise exception 'webhook_url_ok terlalu ketat'; end if;
  perform pg_temp.as_user(ad);
  perform pg_temp.fails($q$select public.admin_webhook_save(null, 'NT a', 'http://x.com/h', array['payment_paid'], true)$q$, 'url_tidak_valid');
  perform pg_temp.fails($q$select public.admin_webhook_save(null, 'NT a', 'https://x.com/h', array[]::text[], true)$q$, 'event_wajib');
  perform pg_temp.fails($q$select public.admin_webhook_save(null, 'NT a', 'https://x.com/h', array['hapus_semua'], true)$q$, 'event_tidak_dikenal');
  w := public.admin_webhook_save(null, 'NT CRM', 'https://hooks.contoh-crm.co.id/nusamora', array['payment_paid','ticket_new'], true); wid := (w ->> 'id')::uuid; s1 := w ->> 'secret';
  if s1 not like 'whsec_%' or length(s1) < 40 then raise exception 'secret tidak dibuat: %', s1; end if;
  w2 := public.admin_webhook_save(null, 'NT Lain', 'https://lain.contoh.co.id/h', array['customer_created'], false);
  begin perform 1 from public.webhook_secrets; raise exception 'authenticated membaca webhook_secrets'; exception when insufficient_privilege then null; end;
  if (select count(*) from public.webhook_endpoints where name like 'NT %') <> 2 then raise exception 'endpoint tidak terbaca admin'; end if;
  perform public.admin_webhook_save(wid, 'NT CRM', 'https://hooks.contoh-crm.co.id/nusamora', array['payment_paid','ticket_new'], true);
  reset role; if (select secret from public.webhook_secrets where endpoint_id = wid) <> s1 then raise exception 'edit mengganti secret'; end if;
  -- pemicu: hanya endpoint yang berlangganan dan aktif
  insert into public.invitations (user_id, title, category, template_id, package_type, slug, status, event_date, content) values (c1, 'WH', 'wedding', 'st-tpl', 'essential', 'st-6', 'menunggu_pembayaran', current_date + 30, '{}') returning id into inv;
  insert into public.payments (order_id, user_id, invitation_id, plan_id, amount, duration_days, experience, expires_at, status) values ('NMST2', c1, inv, 'essential', 79000, 90, '2d', now() + interval '1 day', 'pending') returning id into pid;
  select count(*) into n from public.webhook_deliveries where endpoint_id = wid; if n <> 0 then raise exception 'pending tidak boleh memicu webhook'; end if;
  update public.payments set status = 'paid', paid_at = now() where id = pid; update public.payments set status = 'refunded' where id = pid; update public.payments set status = 'paid' where id = pid;
  select count(*) into n from public.webhook_deliveries where endpoint_id = wid and event = 'payment_paid'; if n <> 1 then raise exception 'payment_paid harus 1 (dedupe), ada %', n; end if;
  if exists (select 1 from public.webhook_deliveries where endpoint_id = (w2 ->> 'id')::uuid) then raise exception 'endpoint nonaktif/tak berlangganan menerima kiriman'; end if;
  if (select payload::text from public.webhook_deliveries where endpoint_id = wid limit 1) like '%@%' then raise exception 'payload membawa email'; end if;
  -- claim -> hasil
  select * into d from public.webhook_claim(10); if d.id is null or d.url <> 'https://hooks.contoh-crm.co.id/nusamora' or d.secret <> s1 or d.attempts <> 1 then raise exception 'claim: %', d; end if;
  if (select count(*) from public.webhook_claim(10)) <> 0 then raise exception 'claim ganda'; end if;
  if public.webhook_result(d.id, false, 503, 'unavailable', 120) <> 'pending' then raise exception 'retry'; end if;
  if (select next_attempt_at from public.webhook_deliveries where id = d.id) < now() + interval '1 minute 30 seconds' or (select next_attempt_at from public.webhook_deliveries where id = d.id) > now() + interval '2 minutes 30 seconds' then raise exception 'jeda 1 harus ~2 menit'; end if;
  update public.webhook_deliveries set next_attempt_at = now() where id = d.id; perform * from public.webhook_claim(10);
  perform public.webhook_result(d.id, false, 500, 'x', 50); if (select next_attempt_at from public.webhook_deliveries where id = d.id) < now() + interval '3 minutes 30 seconds' then raise exception 'jeda 2 harus ~4 menit'; end if;
  update public.webhook_deliveries set next_attempt_at = now() where id = d.id; perform * from public.webhook_claim(10);
  if public.webhook_result(d.id, true, 204, null, 80) <> 'delivered' then raise exception 'sukses'; end if;
  if (select status from public.webhook_deliveries where id = d.id) <> 'delivered' or (select http_status from public.webhook_deliveries where id = d.id) <> 204 then raise exception 'status delivered'; end if;
  if public.webhook_result(d.id, false, 500, 'x', 1) <> 'diabaikan' then raise exception 'hasil ganda'; end if;
  -- permanen & batas
  perform public.webhook_emit('payment_paid', '{"a":1}', 'nt-perm'); select * into d from public.webhook_claim(10);
  if public.webhook_result(d.id, false, 410, 'gone', 5, true) <> 'failed' then raise exception 'permanen'; end if;
  -- auto-nonaktif setelah 20 gagal beruntun
  update public.webhook_endpoints set fail_streak = 19 where id = wid;
  perform public.webhook_emit('payment_paid', '{"a":2}', 'nt-streak'); select * into d from public.webhook_claim(10); perform public.webhook_result(d.id, false, 410, 'gone', 5, true);
  if (select enabled from public.webhook_endpoints where id = wid) then raise exception 'harus nonaktif otomatis'; end if;
  perform public.webhook_emit('payment_paid', '{"a":3}', 'nt-off'); if exists (select 1 from public.webhook_deliveries where dedupe_key like 'nt-off%') then raise exception 'endpoint nonaktif tidak boleh menerima'; end if;
  -- admin: test, retry, rotate, hapus
  perform pg_temp.as_user(ad);
  perform public.admin_webhook_save(wid, 'NT CRM', 'https://hooks.contoh-crm.co.id/nusamora', array['payment_paid','ticket_new'], true);
  if (select fail_streak from public.webhook_endpoints where id = wid) <> 0 then raise exception 'mengaktifkan ulang harus mereset streak'; end if;
  perform public.admin_webhook_test(wid); if not exists (select 1 from public.webhook_deliveries where endpoint_id = wid and event = 'ping' and status = 'pending') then raise exception 'ping'; end if;
  perform public.admin_webhook_retry((select id from public.webhook_deliveries where endpoint_id = wid and status = 'failed' limit 1));
  begin perform public.admin_webhook_retry((select id from public.webhook_deliveries where endpoint_id = wid and status = 'delivered' limit 1)); raise exception 'retry delivered lolos'; exception when others then if sqlerrm not like '%tidak_bisa_dicoba_ulang%' then raise; end if; end;
  s2 := public.admin_webhook_rotate_secret(wid); if s2 = s1 or s2 not like 'whsec_%' then raise exception 'rotate'; end if;
  if jsonb_array_length(public.admin_webhook_deliveries(wid, 50)) < 3 then raise exception 'daftar pengiriman'; end if;
  perform pg_temp.as_user(current_setting('st.su')::uuid);
  begin perform public.admin_webhook_save(null, 'NT x', 'https://x.contoh.co.id/h', array['payment_paid'], true); raise exception 'support membuat webhook'; exception when insufficient_privilege then null; end;
  begin perform public.admin_webhook_rotate_secret(wid); raise exception 'support rotate'; exception when insufficient_privilege then null; end;
  perform pg_temp.as_user(c1);
  begin perform public.webhook_claim(5); raise exception 'pelanggan memanggil webhook_claim'; exception when insufficient_privilege then null; end;
  begin perform public.admin_webhook_deliveries(wid, 5); raise exception 'pelanggan membaca pengiriman'; exception when insufficient_privilege then null; end;
  perform pg_temp.as_user(ad); perform public.admin_webhook_delete((w2 ->> 'id')::uuid);
  for i in 1..9 loop perform public.admin_webhook_save(null, 'NT B' || i, 'https://b' || i || '.contoh.co.id/h', array['ticket_new'], true); end loop;
  perform pg_temp.fails($q$select public.admin_webhook_save(null, 'NT X', 'https://z.contoh.co.id/h', array['ticket_new'], true)$q$, 'batas_endpoint');
  raise notice 'OK webhook: URL aman, secret sekali tampil & tak terbaca client, pemicu+dedupe, retry 2/4 menit, delivered=2xx, permanen, auto-nonaktif, ping/retry/rotate, izin';
end $$;
select pg_temp.clean();
revoke all on public.app_settings from authenticated;
do $$ declare r record; begin for r in select * from _had where not ins loop execute format('revoke insert on public.%I from authenticated', r.t); end loop; end $$;
