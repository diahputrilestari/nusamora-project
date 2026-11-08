-- Uji DB admin-affiliate.sql: program, kode, klik, atribusi, konversi, komisi, fraud, rekening, penarikan, penjaga uang.
\set ON_ERROR_STOP on
\set QUIET on
create temp table _bk_aff as select * from public.aff_settings;
create temp table _had as select t, has_table_privilege('authenticated', 'public.' || t, 'UPDATE') as upd from unnest(array['referrals', 'withdrawals', 'affiliates']) t;
create or replace function pg_temp.root() returns void language plpgsql as $$ begin reset role; perform set_config('nm.aff_rpc', '', true); perform set_config('request.jwt.claims', '{}', false); perform set_config('request.jwt.claim.sub', '', false); perform set_config('request.headers', '{}', false); end $$;
grant execute on function pg_temp.root() to public;
create or replace function pg_temp.clean() returns void language plpgsql as $$ begin
  perform pg_temp.root();
  delete from public.withdrawals where user_id in (select id from auth.users where email like 'af.%@uji.nusamora.test');
  delete from public.bonus_history where user_id in (select id from auth.users where email like 'af.%@uji.nusamora.test');
  delete from public.referrals where affiliate_id in (select id from public.affiliates where user_id in (select id from auth.users where email like 'af.%@uji.nusamora.test'));
  delete from public.affiliate_clicks where affiliate_id in (select id from public.affiliates where user_id in (select id from auth.users where email like 'af.%@uji.nusamora.test'));
  delete from public.invoices where user_id in (select id from auth.users where email like 'af.%@uji.nusamora.test');
  delete from public.affiliates where user_id in (select id from auth.users where email like 'af.%@uji.nusamora.test');
  delete from public.wallets where user_id in (select id from auth.users where email like 'af.%@uji.nusamora.test');
  delete from public.admin_users where user_id in (select id from auth.users where email like 'af.%@uji.nusamora.test');
  delete from public.profiles where id in (select id from auth.users where email like 'af.%@uji.nusamora.test');
  delete from auth.users where email like 'af.%@uji.nusamora.test';
  delete from public.aff_settings where key <> 'salt'; insert into public.aff_settings select * from _bk_aff where key <> 'salt' on conflict do nothing;
  delete from public.security_events where kind like 'aff\_%';
end $$;
do $$ begin perform pg_temp.clean(); end $$;
grant select, update, insert, delete on public.referrals, public.withdrawals, public.affiliates to authenticated;
create or replace function pg_temp.as_user(u uuid, ip text default null) returns void language plpgsql as $$
begin perform pg_temp.root(); perform set_config('nm.aff_rpc', '', true);
  perform set_config('request.jwt.claim.sub', u::text, false);
  perform set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated')::text, false);
  perform set_config('request.headers', json_build_object('x-real-ip', ip, 'user-agent', 'test')::text, false);
  set role authenticated; end $$;
grant execute on function pg_temp.as_user(uuid, text) to public;
create or replace function pg_temp.as_anon(ip text default null) returns void language plpgsql as $$ begin perform pg_temp.root(); perform set_config('request.headers', json_build_object('x-real-ip', ip)::text, false); set role anon; end $$;
grant execute on function pg_temp.as_anon(text) to public;
create or replace function pg_temp.fails(sql text, expect text) returns void language plpgsql as $$ begin
  begin execute sql; raise exception 'seharusnya gagal: %', sql; exception when others then if sqlerrm like 'seharusnya gagal%' or sqlerrm not like '%' || expect || '%' then raise exception 'galat salah untuk [%]: % (harap: %)', sql, sqlerrm, expect; end if; end; end $$;
create or replace function pg_temp.sq(q text) returns text language plpgsql security definer as $$ declare r text; begin execute q into r; return r; end $$;
grant execute on function pg_temp.sq(text) to public;
create or replace function pg_temp.bal(u uuid) returns bigint language plpgsql security definer as $$ declare r bigint; begin select bonus_balance into r from public.wallets where user_id = u; return coalesce(r, 0); end $$;
grant execute on function pg_temp.bal(uuid) to public;
create or replace function pg_temp.mkuser(tag text, wa text default null) returns uuid language plpgsql as $$ declare u uuid := gen_random_uuid(); begin
  perform pg_temp.root();
  insert into auth.users (id, email) values (u, 'af.' || tag || '@uji.nusamora.test'); insert into public.profiles (id, full_name, whatsapp) values (u, 'AF ' || tag, wa) on conflict (id) do update set full_name = excluded.full_name, whatsapp = excluded.whatsapp; return u; end $$;
create or replace function pg_temp.pay(u uuid, amt bigint, num text) returns uuid language plpgsql as $$ declare i uuid; begin
  perform pg_temp.root(); insert into public.invoices (user_id, number, description, amount, status) values (u, num, 't', amt, 'menunggu') returning id into i;
  update public.invoices set status = 'lunas', paid_at = now() where id = i; return i; end $$;

do $$ declare adm uuid; sup uuid; begin
  adm := pg_temp.mkuser('admin'); sup := pg_temp.mkuser('support');
  insert into public.admin_users (user_id, role) values (adm, 'super_admin'), (sup, 'support'), (pg_temp.mkuser('rd'), 'admin');
  perform set_config('af.rd', (select id::text from auth.users where email = 'af.rd@uji.nusamora.test'), false);
  perform set_config('af.adm', adm::text, false); perform set_config('af.sup', sup::text, false);
  perform set_config('af.aff', pg_temp.mkuser('aff', '081234567890')::text, false);
  perform set_config('af.u1', pg_temp.mkuser('u1')::text, false); perform set_config('af.u2', pg_temp.mkuser('u2')::text, false); perform set_config('af.u3', pg_temp.mkuser('u3', '081234567890')::text, false);
end $$;

-- 1. Program mati secara bawaan, pengaturan
do $$ declare c jsonb; cid uuid; r jsonb; begin
  perform pg_temp.as_anon(); c := public.aff_public_config();
  if (c ->> 'enabled')::boolean then raise exception 'program harus mati bawaan'; end if;
  if c ->> 'commission_label' <> '10%' then raise exception 'label komisi: %', c; end if;
  perform pg_temp.fails($q$select public.aff_register()$q$, 'permission denied');
  perform pg_temp.as_user(current_setting('af.aff')::uuid);
  perform pg_temp.fails($q$select public.aff_register()$q$, 'program_belum_dibuka');
  if public.aff_attach_referral('ABCDEFGH', gen_random_uuid()) ->> 'reason' <> 'program_belum_dibuka' then raise exception 'attach harus ditolak'; end if;
  perform pg_temp.fails($q$select public.admin_aff_settings_get()$q$, 'forbidden');
  perform pg_temp.as_user(current_setting('af.sup')::uuid); perform pg_temp.fails($q$select public.admin_aff_settings_save('{"hold_days": 3}')$q$, 'forbidden');
  perform pg_temp.as_user(current_setting('af.adm')::uuid);
  perform pg_temp.fails($q$select public.admin_aff_settings_save('{"rahasia": 1}')$q$, 'kunci_tidak_dikenal');
  perform pg_temp.fails($q$select public.admin_aff_settings_save('{"commission_value": 80}')$q$, 'commission_value_tidak_valid');
  perform pg_temp.fails($q$select public.admin_aff_settings_save('{"commission_type": "fixed", "commission_value": 10}')$q$, 'commission_value_tidak_valid');
  perform pg_temp.fails($q$select public.admin_aff_settings_save('{"hold_days": 200}')$q$, 'hold_days_tidak_valid');
  perform pg_temp.fails($q$select public.admin_aff_settings_save('{"program_enabled": "ya"}')$q$, 'program_enabled_tidak_valid');
  perform pg_temp.fails($q$select public.admin_aff_settings_save('{"min_withdrawal": 5}')$q$, 'min_withdrawal_tidak_valid');
  perform public.admin_aff_settings_save('{"program_enabled": true, "hold_days": 7, "min_withdrawal": 50000, "fraud_fast_minutes": 10}');
  if (public.admin_aff_settings_get() ->> 'hold_days')::int <> 7 then raise exception 'pengaturan tidak tersimpan'; end if;
  if pg_temp.sq($q$select 1 from public.audit_logs where table_name = 'aff_settings' and row_id = 'hold_days' limit 1$q$) is null then raise exception 'perubahan harus diaudit'; end if;
  perform pg_temp.as_user(current_setting('af.sup')::uuid);
  if pg_temp.sq($q$select value::text from public.aff_settings where key = 'salt'$q$) is not null and (select count(*) from public.aff_settings where key = 'salt') <> 0 then raise exception 'garam tidak boleh terbaca admin'; end if;
  raise notice 'OK 1 program & pengaturan';
end $$;

-- 2. Daftar affiliate, kode unik, persetujuan
do $$ declare r jsonb; id1 uuid; begin
  perform pg_temp.as_user(current_setting('af.aff')::uuid);
  r := public.aff_register();
  if r ->> 'code' !~ '^[A-HJ-NP-Z2-9]{8}$' or r ->> 'status' <> 'pending' then raise exception 'pendaftaran salah: %', r; end if;
  if public.aff_register() ->> 'code' <> r ->> 'code' then raise exception 'pendaftaran harus idempoten'; end if;
  perform set_config('af.code', r ->> 'code', false);
  -- sebelum disetujui, kode tidak melacak
  perform pg_temp.as_anon('203.0.113.5'); if public.aff_track_click(current_setting('af.code'), 'visitor-aaaa-0001') is not null then raise exception 'affiliate pending tidak boleh melacak'; end if;
  perform pg_temp.as_user(current_setting('af.adm')::uuid);
  id1 := (public.admin_aff_list(null, null, 'AF aff') -> 'rows' -> 0 ->> 'id')::uuid; perform set_config('af.id', id1::text, false);
  perform pg_temp.fails(format($q$select public.admin_aff_set_status(%L, 'suspended')$q$, id1), 'alasan_wajib');
  perform public.admin_aff_set_status(id1, 'aktif');
  if (public.admin_aff_detail(id1) ->> 'status') <> 'aktif' then raise exception 'persetujuan gagal'; end if;
  perform pg_temp.as_user(current_setting('af.sup')::uuid); perform pg_temp.fails(format($q$select public.admin_aff_set_status(%L, 'suspended', 'x y z')$q$, id1), 'forbidden');
  perform pg_temp.as_user(current_setting('af.adm')::uuid); perform pg_temp.fails(format($q$update public.affiliates set code = 'HACKED12' where id = %L$q$, id1), 'gunakan_menu_resmi');
  raise notice 'OK 2 pendaftaran affiliate';
end $$;

-- 3. Klik
do $$ declare c1 uuid; c2 uuid; ip text; begin
  perform pg_temp.as_anon('203.0.113.5');
  c1 := public.aff_track_click(current_setting('af.code'), 'visitor-aaaa-0001', '/daftar');
  if c1 is null then raise exception 'klik valid harus tercatat'; end if;
  if public.aff_track_click(current_setting('af.code'), 'visitor-aaaa-0001') <> c1 then raise exception 'klik berulang 10 menit harus sama'; end if;
  if public.aff_track_click('ZZZZZZZZ', 'visitor-aaaa-0001') is not null then raise exception 'kode asing harus null'; end if;
  if public.aff_track_click('a;drop', 'visitor-aaaa-0001') is not null or public.aff_track_click(current_setting('af.code'), 'x') is not null then raise exception 'format tidak valid harus null'; end if;
  c2 := public.aff_track_click(lower(current_setting('af.code')), 'visitor-bbbb-0002'); if c2 is null or c2 = c1 then raise exception 'pengunjung lain = klik baru, kode tidak peka huruf besar'; end if;
  perform set_config('af.c1', c1::text, false); perform set_config('af.c2', c2::text, false);
  ip := pg_temp.sq($q$select string_agg(coalesce(ip_hash, '') || visitor_hash, ',') from public.affiliate_clicks$q$);
  if ip like '%203.0.113.5%' or ip like '%visitor-aaaa%' then raise exception 'IP/pengunjung mentah tidak boleh disimpan'; end if;
  if pg_temp.sq($q$select count(*) from public.affiliate_clicks where ip_hash is not null$q$)::int < 2 then raise exception 'ip harus di-hash'; end if;
  raise notice 'OK 3 klik';
end $$;

-- 4. Atribusi
do $$ declare u1 uuid := current_setting('af.u1')::uuid; aff uuid := current_setting('af.aff')::uuid; r jsonb; old uuid; cold uuid; begin
  perform pg_temp.as_user(aff); if public.aff_attach_referral(current_setting('af.code'), current_setting('af.c1')::uuid) ->> 'reason' <> 'tidak_boleh_diri_sendiri' then raise exception 'rujukan diri sendiri harus ditolak'; end if;
  perform pg_temp.as_user(u1, '198.51.100.7');
  if public.aff_attach_referral(current_setting('af.code'), gen_random_uuid()) ->> 'reason' <> 'klik_tidak_ditemukan' then raise exception 'klik palsu'; end if;
  if public.aff_attach_referral('ZZZZZZZZ', current_setting('af.c1')::uuid) ->> 'reason' <> 'kode_tidak_dikenal' then raise exception 'kode asing'; end if;
  r := public.aff_attach_referral(current_setting('af.code'), current_setting('af.c1')::uuid);
  if not (r ->> 'ok')::boolean then raise exception 'atribusi gagal: %', r; end if;
  if public.aff_attach_referral(current_setting('af.code'), current_setting('af.c1')::uuid) ->> 'reason' <> 'sudah_tercatat' then raise exception 'atribusi ganda'; end if;
  -- jendela atribusi
  old := current_setting('af.u2')::uuid; perform pg_temp.root();
  insert into public.affiliate_clicks (affiliate_id, visitor_hash, created_at) values (current_setting('af.id')::uuid, 'oldvisitor', now() - interval '40 days') returning id into cold;
  perform pg_temp.as_user(old); if public.aff_attach_referral(current_setting('af.code'), cold) ->> 'reason' <> 'di_luar_jendela_atribusi' then raise exception 'jendela 30 hari'; end if;
  -- pelanggan lama (akun dibuat sebelum klik)
  perform pg_temp.root(); update auth.users set created_at = now() - interval '5 days' where id = old;
  perform pg_temp.as_user(old); if public.aff_attach_referral(current_setting('af.code'), current_setting('af.c2')::uuid) ->> 'reason' <> 'bukan_pendaftar_baru' then raise exception 'pelanggan lama tidak boleh diatribusikan'; end if;
  perform pg_temp.root(); update auth.users set created_at = now() where id = old;
  -- pernah membayar
  perform pg_temp.pay(old, 50000, 'AF-OLD1'); perform pg_temp.as_user(old);
  if public.aff_attach_referral(current_setting('af.code'), current_setting('af.c2')::uuid) ->> 'reason' <> 'sudah_pernah_membayar' then raise exception 'sudah membayar'; end if;
  perform pg_temp.root(); delete from public.invoices where number = 'AF-OLD1';
  perform pg_temp.as_user(u1); perform pg_temp.fails(format($q$insert into public.referrals (affiliate_id, referred_user_id) values (%L, %L)$q$, current_setting('af.id'), u1), 'gunakan_menu_resmi');
  raise notice 'OK 4 atribusi';
end $$;

-- 5. Konversi & komisi
do $$ declare u1 uuid := current_setting('af.u1')::uuid; u2 uuid := current_setting('af.u2')::uuid; u3 uuid := current_setting('af.u3')::uuid; inv uuid; r public.referrals; a uuid := current_setting('af.id')::uuid; begin
  perform pg_temp.root();
  inv := pg_temp.pay(u1, 149000, 'AF-1');
  select * into r from public.referrals where referred_user_id = u1;
  if r.commission <> 14900 or r.status <> 'berbayar' or r.commission_status <> 'review' then raise exception 'komisi 10%% = 14900, dan bayar <10 menit harus ditinjau: % % %', r.commission, r.status, r.fraud_reasons; end if;
  if not ('bayar_terlalu_cepat' = any (r.fraud_reasons)) then raise exception 'alasan fraud: %', r.fraud_reasons; end if;
  if r.commission_rate <> '10%' or r.commission_base <> 149000 then raise exception 'rate/base'; end if;
  perform pg_temp.pay(u1, 79000, 'AF-1B'); if (select commission from public.referrals where referred_user_id = u1) <> 14900 then raise exception 'komisi hanya sekali (invoice pertama)'; end if;
  -- pembayaran tanpa rujukan tidak terganggu
  perform pg_temp.pay(u2, 79000, 'AF-X'); if exists (select 1 from public.referrals where referred_user_id = u2) then raise exception 'tanpa atribusi tidak boleh ada referral'; end if;
  -- affiliate pending-lalu-tinjau: admin menyetujui dengan alasan
  perform pg_temp.as_user(current_setting('af.adm')::uuid);
  perform pg_temp.fails(format($q$select public.admin_aff_referral_review(%L, 'approve')$q$, r.id), 'alasan_wajib');
  perform public.admin_aff_referral_review(r.id, 'approve', 'Pembeli nyata, sudah dicek');
  if pg_temp.sq(format($q$select commission_status from public.referrals where id = %L$q$, r.id)) <> 'approved' then raise exception 'persetujuan tinjauan'; end if;
  if pg_temp.bal(current_setting('af.aff')::uuid) <> 14900 then raise exception 'saldo harus 14900'; end if;
  perform pg_temp.fails(format($q$select public.admin_aff_referral_review(%L, 'approve', 'lagi')$q$, r.id), 'status_tidak_bisa_ditinjau');
  -- refund setelah disetujui: komisi ditarik kembali
  perform pg_temp.root(); update public.invoices set status = 'refund' where number = 'AF-1';
  if pg_temp.bal(current_setting('af.aff')::uuid) <> 0 then raise exception 'refund harus menarik komisi'; end if;
  if (select commission_status from public.referrals where referred_user_id = u1) <> 'reversed' then raise exception 'status reversed'; end if;
  -- referral kedua: bersih, ditahan lalu dilepas; tarif khusus affiliate
  perform pg_temp.as_anon('198.51.100.20'); perform set_config('af.c3', public.aff_track_click(current_setting('af.code'), 'visitor-cccc-0003')::text, false);
  perform pg_temp.as_user(u3, '198.51.100.21'); perform public.aff_attach_referral(current_setting('af.code'), current_setting('af.c3')::uuid);
  perform pg_temp.as_user(current_setting('af.adm')::uuid); perform public.admin_aff_set_rate(a, 'fixed', 25000);
  perform pg_temp.root(); update public.referrals set attributed_at = now() - interval '2 hours' where referred_user_id = u3;
  perform pg_temp.pay(u3, 149000, 'AF-3'); select * into r from public.referrals where referred_user_id = u3;
  if r.commission <> 25000 or r.commission_rate <> 'Rp 25000' then raise exception 'tarif khusus: % %', r.commission, r.commission_rate; end if;
  if not ('whatsapp_sama' = any (r.fraud_reasons)) or r.commission_status <> 'review' then raise exception 'whatsapp sama harus ditandai: % %', r.commission_status, r.fraud_reasons; end if;
  perform pg_temp.as_user(current_setting('af.adm')::uuid); perform public.admin_aff_referral_review(r.id, 'reject', 'Akun kerabat sendiri');
  select * into r from public.referrals where referred_user_id = u3; if r.commission_status <> 'rejected' or r.status <> 'batal' then raise exception 'penolakan'; end if;
  perform set_config('nm.aff_rpc', '', true);
  perform pg_temp.fails(format($q$update public.referrals set commission = 999999 where id = %L$q$, r.id), 'gunakan_menu_resmi');
  perform pg_temp.fails(format($q$delete from public.referrals where id = %L$q$, r.id), 'gunakan_menu_resmi');
  perform public.admin_aff_set_rate(a, null, null);
  raise notice 'OK 5 konversi & komisi';
end $$;

-- 6. Masa tahan & pelepasan, fraud IP
do $$ declare aff uuid := current_setting('af.aff')::uuid; ux uuid; c uuid; r public.referrals; n int; i int; begin
  -- 4 pendaftar dari IP yang sama -> ip_banyak_pendaftar
  for i in 1..4 loop
    perform pg_temp.as_anon('192.0.2.77'); c := public.aff_track_click(current_setting('af.code'), 'visitor-ipp-000' || i);
    ux := pg_temp.mkuser('ip' || i); perform pg_temp.as_user(ux, '192.0.2.77'); perform public.aff_attach_referral(current_setting('af.code'), c);
    perform pg_temp.root(); update public.referrals set attributed_at = now() - interval '3 hours' where referred_user_id = ux; perform pg_temp.pay(ux, 100000, 'AF-IP' || i);
  end loop;
  select * into r from public.referrals where referred_user_id = ux;
  if not ('ip_banyak_pendaftar' = any (r.fraud_reasons)) then raise exception 'IP banyak pendaftar: %', r.fraud_reasons; end if;
  perform pg_temp.as_user(current_setting('af.adm')::uuid);
  if jsonb_array_length(public.admin_aff_fraud() -> 'ip_clusters') < 1 or jsonb_array_length(public.admin_aff_fraud() -> 'flagged') < 1 then raise exception 'fraud overview kosong'; end if;
  -- referral bersih: pending, belum dilepas, lalu dilepas setelah masa tahan
  perform pg_temp.as_anon('198.51.100.90'); c := public.aff_track_click(current_setting('af.code'), 'visitor-clean-001');
  ux := pg_temp.mkuser('clean'); perform pg_temp.as_user(ux, '198.51.100.91'); perform public.aff_attach_referral(current_setting('af.code'), c);
  perform pg_temp.root(); update public.referrals set attributed_at = now() - interval '3 hours' where referred_user_id = ux; perform pg_temp.pay(ux, 200000, 'AF-CL');
  select * into r from public.referrals where referred_user_id = ux;
  if r.commission_status <> 'pending' or r.commission <> 20000 or r.commission_available_at < now() + interval '6 days' then raise exception 'referral bersih harus pending 7 hari: % %', r.commission_status, r.commission_available_at; end if;
  if public.aff_release_due(aff) <> 0 then raise exception 'belum waktunya'; end if;
  update public.referrals set commission_available_at = now() - interval '1 minute' where id = r.id;
  perform pg_temp.as_user(aff); r := null; if (public.aff_me() -> 'stats' ->> 'commission_approved')::bigint <> 20000 then raise exception 'aff_me harus melepas komisi: %', public.aff_me(); end if;
  perform pg_temp.root(); if pg_temp.bal(aff) <> 20000 then raise exception 'saldo 20000'; end if;
  -- refund sebelum dilepas
  update public.invoices set status = 'refund' where number = 'AF-CL'; if pg_temp.bal(aff) <> 0 then raise exception 'refund menarik komisi'; end if;
  -- affiliate ditangguhkan: komisi baru ditahan untuk ditinjau
  raise notice 'OK 6 masa tahan & fraud';
end $$;

-- 7. Rekening & penarikan
do $$ declare aff uuid := current_setting('af.aff')::uuid; id1 uuid := current_setting('af.id')::uuid; w uuid; wi jsonb; begin
  perform pg_temp.root(); insert into public.wallets (user_id, bonus_balance) values (aff, 0) on conflict do nothing;
  insert into public.bonus_history (user_id, description, amount) values (aff, 'Uji saldo', 120000);
  perform pg_temp.as_user(aff);
  perform pg_temp.fails($q$select public.aff_request_withdrawal(60000)$q$, 'rekening_belum_diisi');
  perform pg_temp.fails($q$select public.aff_save_bank('B', '123456', 'Nama')$q$, 'bank_tidak_valid');
  perform pg_temp.fails($q$select public.aff_save_bank('BCA', 'abc', 'Nama')$q$, 'nomor_rekening_tidak_valid');
  perform pg_temp.fails($q$select public.aff_save_bank('BCA', '1234567890', 'N')$q$, 'nama_rekening_tidak_valid');
  perform public.aff_save_bank('BCA', '1234 5678 90', 'AF aff');
  if public.aff_me() -> 'affiliate' ->> 'bank_account_mask' <> '••••••1234'::text and public.aff_me() -> 'affiliate' ->> 'bank_account_mask' not like '%7890' then raise exception 'rekening harus disamarkan'; end if;
  perform pg_temp.fails($q$select public.aff_request_withdrawal(60000)$q$, 'rekening_belum_terverifikasi');
  perform pg_temp.as_user(current_setting('af.adm')::uuid);
  wi := public.admin_aff_detail(id1) -> 'bank'; if (wi ->> 'name_match')::boolean is not true or wi ->> 'account_no' <> '1234567890' then raise exception 'detail bank: %', wi; end if;
  perform pg_temp.fails(format($q$select public.admin_aff_bank_review(%L, 'reject')$q$, id1), 'alasan_wajib');
  perform public.admin_aff_bank_review(id1, 'verify', 'Nama cocok');
  perform pg_temp.as_user(current_setting('af.rd')::uuid); if public.admin_aff_detail(id1) -> 'bank' ->> 'account_no' like '1234567890' then raise exception 'peninjau baca saja harus melihat nomor tersamar'; end if;
  perform pg_temp.as_user(aff);
  perform pg_temp.fails($q$select public.aff_request_withdrawal(10000)$q$, 'di_bawah_minimum');
  perform pg_temp.fails($q$select public.aff_request_withdrawal(500000)$q$, 'saldo_tidak_cukup');
  w := public.aff_request_withdrawal(70000);
  if pg_temp.bal(aff) <> 50000 then raise exception 'saldo harus berkurang saat mengajukan'; end if;
  perform pg_temp.fails($q$select public.aff_request_withdrawal(50000)$q$, 'ada_penarikan_berjalan');
  perform pg_temp.fails($q$select public.aff_save_bank('BNI', '99999999', 'AF aff')$q$, 'ada_penarikan_berjalan');
  perform pg_temp.as_user(current_setting('af.adm')::uuid);
  perform pg_temp.fails(format($q$update public.withdrawals set status = 'berhasil' where id = %L$q$, w), 'gunakan_menu_resmi');
  perform pg_temp.as_user(current_setting('af.adm')::uuid);
  if (public.admin_aff_withdrawals('diproses') ->> 'total')::int < 1 then raise exception 'daftar penarikan'; end if;
  perform pg_temp.fails(format($q$select public.admin_aff_withdrawal_process(%L, 'paid', '')$q$, w), 'referensi_transfer_wajib');
  perform pg_temp.fails(format($q$select public.admin_aff_withdrawal_process(%L, 'reject')$q$, w), 'alasan_wajib');
  perform public.admin_aff_withdrawal_process(w, 'reject', null, 'Rekening salah ketik');
  if pg_temp.bal(aff) <> 120000 then raise exception 'penolakan harus mengembalikan saldo'; end if;
  perform pg_temp.fails(format($q$select public.admin_aff_withdrawal_process(%L, 'paid', 'TRX1')$q$, w), 'penarikan_sudah_diproses');
  perform pg_temp.as_user(aff); w := public.aff_request_withdrawal(100000);
  perform pg_temp.as_user(current_setting('af.adm')::uuid); perform public.admin_aff_withdrawal_process(w, 'paid', 'TRF-20261108-01', 'Via BCA');
  if pg_temp.sq(format($q$select status || payout_ref from public.withdrawals where id = %L$q$, w)) <> 'berhasilTRF-20261108-01' then raise exception 'pembayaran tidak tercatat'; end if;
  if pg_temp.bal(aff) <> 20000 then raise exception 'saldo akhir 20000'; end if;
  -- penangguhan menghentikan penarikan
  perform public.admin_aff_set_status(id1, 'suspended', 'Pelanggaran ketentuan');
  perform pg_temp.as_user(aff); perform pg_temp.fails($q$select public.aff_request_withdrawal(20000)$q$, 'affiliate_tidak_aktif');
  perform pg_temp.as_user(current_setting('af.adm')::uuid); perform public.admin_aff_set_status(id1, 'aktif');
  perform pg_temp.as_user(aff); perform public.aff_save_bank('BNI', '99999999', 'AF aff');
  if (public.aff_me() -> 'affiliate' ->> 'bank_status') <> 'pending' then raise exception 'ganti rekening harus reset verifikasi'; end if;
  raise notice 'OK 7 rekening & penarikan';
end $$;

-- 8. Daftar admin, ringkasan, izin
do $$ declare r jsonb; begin
  perform pg_temp.as_user(current_setting('af.adm')::uuid);
  r := public.admin_aff_overview(); if (r -> 'affiliates' ->> 'aktif')::int < 1 or (r ->> 'enabled')::boolean is not true then raise exception 'ringkasan: %', r; end if;
  if (public.admin_aff_list('aktif') ->> 'total')::int < 1 or (public.admin_aff_referrals('rejected') ->> 'total')::int < 1 or (public.admin_aff_referrals(null, null, 'AF u1') ->> 'total')::int < 1 then raise exception 'daftar'; end if;
  if (public.admin_aff_list(null, null, '100%_nope') ->> 'total')::int <> 0 then raise exception 'wildcard harus di-escape'; end if;
  perform pg_temp.as_user(current_setting('af.u1')::uuid);
  perform pg_temp.fails($q$select public.admin_aff_overview()$q$, 'forbidden');
  perform pg_temp.fails($q$select public.admin_aff_withdrawals()$q$, 'forbidden');
  perform pg_temp.fails($q$select public.admin_aff_release_due()$q$, 'forbidden');
  perform pg_temp.as_anon(); perform pg_temp.fails($q$select public.aff_me()$q$, 'permission denied');
  raise notice 'OK 8 admin & izin';
end $$;

do $$ begin
  perform pg_temp.clean();
  delete from public.aff_settings; insert into public.aff_settings select * from _bk_aff;
  perform pg_temp.root();
end $$;
do $$ declare h record; begin
  for h in select * from _had loop
    if not h.upd then execute format('revoke select, insert, update, delete on public.%I from authenticated', h.t); end if;
  end loop;
end $$;
