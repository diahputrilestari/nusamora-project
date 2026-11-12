-- Uji DB admin-notifications.sql: aturan, antrean, dedupe, percobaan ulang, "terkirim" hanya dari callback provider, pengumuman, hak akses.
\set ON_ERROR_STOP on
\set QUIET on
create or replace function pg_temp.clean() returns void language plpgsql as $$ begin
  reset role;
  delete from public.notif_outbox where to_address like '%@uji.nusamora.test' or to_address like '6281999%' or user_id in (select id from auth.users where email like 'nt.%@uji.nusamora.test') or announcement_id in (select id from public.announcements where title like 'NT %') or event = 'test';
  delete from public.announcements where title like 'NT %';
  delete from public.payments where order_id like 'NMNT%'; delete from public.invitations where slug like 'nt-%';
  delete from public.ticket_replies where ticket_id in (select id from public.tickets where subject like 'NT %'); delete from public.tickets where subject like 'NT %';
  delete from public.notif_templates where key like 'nt\_%';
  delete from auth.users where email like 'nt.%@uji.nusamora.test';
  update public.notif_rules set enabled = false; update public.notif_settings set value = '[]' where key in ('internal_emails','internal_whatsapp'); update public.notif_settings set value = 'false' where key = 'paused';
end $$;
select pg_temp.clean();
-- Supabase memberi hak tabel ke authenticated secara bawaan (RLS yang membatasi); tiru di DB uji.
grant select, insert, update, delete on public.announcements to authenticated;
create or replace function pg_temp.as_user(u uuid) returns void language plpgsql as $$ begin reset role; perform set_config('request.jwt.claim.sub', u::text, false); perform set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated')::text, false); set role authenticated; end $$;
grant execute on function pg_temp.as_user(uuid) to public;
do $$ declare ad uuid := gen_random_uuid(); su uuid := gen_random_uuid(); fi uuid := gen_random_uuid(); c1 uuid := gen_random_uuid(); c2 uuid := gen_random_uuid(); begin
  insert into auth.users (id, email) values (ad, 'nt.admin@uji.nusamora.test'), (su, 'nt.sup@uji.nusamora.test'), (fi, 'nt.fin@uji.nusamora.test'), (c1, 'nt.c1@uji.nusamora.test'), (c2, 'nt.c2@uji.nusamora.test');
  insert into public.profiles (id, full_name, whatsapp) values (ad, 'NT Admin', null), (su, 'NT Support', null), (fi, 'NT Fin', null), (c1, 'Dina Uji', '081999000111'), (c2, 'Tanpa WA', null) on conflict (id) do update set full_name = excluded.full_name, whatsapp = excluded.whatsapp;
  insert into public.admin_users (user_id, role) values (ad, 'super_admin'), (su, 'support'), (fi, 'finance');
  perform set_config('nt.ad', ad::text, false); perform set_config('nt.su', su::text, false); perform set_config('nt.c1', c1::text, false); perform set_config('nt.c2', c2::text, false);
end $$;
-- Catatan: pemicu welcome berjalan saat profil dibuat, tetapi aturan nonaktif -> tidak ada pesan.
do $$ declare n int; begin
  select count(*) into n from public.notif_outbox where user_id in (select id from auth.users where email like 'nt.%@uji.nusamora.test');
  if n <> 0 then raise exception 'aturan bawaan harus nonaktif, tapi ada % pesan', n; end if;
  if exists (select 1 from public.notif_rules where enabled) then raise exception 'ada aturan aktif bawaan'; end if;
  raise notice 'OK aturan bawaan nonaktif: tidak ada pesan terkirim sebelum admin mengaktifkan';
end $$;

-- 1. Pembayaran lunas -> pesan pelanggan + internal; dedupe; nomor WA kosong dilewati
do $$ declare c1 uuid := current_setting('nt.c1')::uuid; inv uuid; pid uuid; n int; r record; begin
  perform pg_temp.as_user(current_setting('nt.ad')::uuid);
  perform public.admin_notif_settings_save('{"internal_emails":["ops@uji.nusamora.test"],"internal_whatsapp":["081999000222"]}');
  perform public.admin_notif_rule_set('payment_paid','email','customer',true); perform public.admin_notif_rule_set('payment_paid','whatsapp','customer',true);
  perform public.admin_notif_rule_set('payment_paid','email','internal',true); perform public.admin_notif_rule_set('payment_paid','whatsapp','internal',true);
  reset role;
  insert into public.invitations (user_id, title, category, template_id, package_type, slug, status, event_date, content) values (c1, 'Nikahan Dina', 'wedding', 'nt-tpl', 'essential', 'nt-1', 'menunggu_pembayaran', current_date + 30, '{}') returning id into inv;
  insert into public.payments (order_id, user_id, invitation_id, plan_id, amount, duration_days, experience, expires_at, status) values ('NMNT1', c1, inv, 'essential', 79000, 90, '2d', now() + interval '1 day', 'pending') returning id into pid;
  select count(*) into n from public.notif_outbox where dedupe_key like 'pay:' || pid || '%'; if n <> 0 then raise exception 'pending tidak boleh memicu pesan (%)', n; end if;
  update public.payments set status = 'paid', paid_at = now() where id = pid;
  select count(*) into n from public.notif_outbox where dedupe_key like 'pay:' || pid || '%'; if n <> 4 then raise exception 'harus 4 pesan (email+WA pelanggan, email+WA internal), ada %', n; end if;
  select * into r from public.notif_outbox where dedupe_key like 'pay:' || pid || '%' and channel = 'email' and recipient_kind = 'customer';
  if r.to_address <> 'nt.c1@uji.nusamora.test' or r.subject <> 'Pembayaran NMNT1 berhasil' or r.body not like '%Dina Uji%' or r.body not like '%Rp 79.000%' or r.body not like '%Nikahan Dina%' or r.body like '%{{%' then raise exception 'isi email salah: % / % / %', r.to_address, r.subject, r.body; end if;
  select * into r from public.notif_outbox where dedupe_key like 'pay:' || pid || '%' and channel = 'whatsapp' and recipient_kind = 'customer';
  if r.to_address <> '6281999000111' or r.status <> 'pending' then raise exception 'WA pelanggan: % %', r.to_address, r.status; end if;
  select * into r from public.notif_outbox where dedupe_key like 'pay:' || pid || '%' and channel = 'whatsapp' and recipient_kind = 'internal';
  if r.to_address <> '6281999000222' then raise exception 'WA internal: %', r.to_address; end if;
  -- dedupe: status berubah lagi ke paid tidak menggandakan
  update public.payments set status = 'refunded' where id = pid; update public.payments set status = 'paid' where id = pid;
  select count(*) into n from public.notif_outbox where dedupe_key like 'pay:' || pid || '%'; if n <> 4 then raise exception 'dedupe gagal: %', n; end if;
  -- pelanggan tanpa nomor WA -> dilewati dengan alasan, bukan "terkirim"
  perform public.notif_emit('payment_paid', current_setting('nt.c2')::uuid, '{"order_id":"X","paket":"essential","judul":"J","jumlah":"Rp 1"}', 'nt-skip');
  select * into r from public.notif_outbox where dedupe_key like 'nt-skip:whatsapp:customer%'; if r.status <> 'skipped' or r.last_error not like '%WhatsApp%' then raise exception 'harus skipped: % %', r.status, r.last_error; end if;
  raise notice 'OK event pembayaran: pesan pelanggan+internal terisi variabel, dedupe, nomor kosong dilewati';
end $$;

-- 2. Pengirim: claim, hasil, percobaan ulang bertahap, permanen, sukses = sent (bukan delivered), callback = delivered
do $$ declare c1 uuid := current_setting('nt.c1')::uuid; o public.notif_outbox; b public.notif_outbox; st text; n int; t1 timestamptz; begin
  reset role;
  perform public.notif_emit('payment_paid', c1, '{"order_id":"R1","paket":"essential","judul":"J","jumlah":"Rp 1"}', 'nt-r1');
  update public.notif_outbox set next_attempt_at = now() + interval '1 day' where status = 'pending' and dedupe_key not like 'nt-r1:email:customer%';
  select count(*) into n from public.notif_claim(10); if n <> 1 then raise exception 'claim harus 1, dapat %', n; end if;
  select * into o from public.notif_outbox where dedupe_key like 'nt-r1:email:customer%'; if o.status <> 'sending' or o.attempts <> 1 then raise exception 'setelah claim: % %', o.status, o.attempts; end if;
  select count(*) into n from public.notif_claim(10); if n <> 0 then raise exception 'claim kedua tidak boleh mengambil yang sedang dikirim'; end if;
  st := public.notif_result(o.id, false, 'resend', null, 'timeout', 504); if st <> 'pending' then raise exception 'gagal sementara -> pending, dapat %', st; end if;
  select * into o from public.notif_outbox where id = o.id; if o.next_attempt_at < now() + interval '4 minutes' or o.next_attempt_at > now() + interval '6 minutes' then raise exception 'jeda percobaan 1 harus 5 menit: %', o.next_attempt_at - now(); end if;
  update public.notif_outbox set next_attempt_at = now() where id = o.id; perform * from public.notif_claim(10);
  st := public.notif_result(o.id, false, 'resend', null, 'timeout', 504); select * into o from public.notif_outbox where id = o.id;
  if o.attempts <> 2 or o.next_attempt_at < now() + interval '9 minutes' then raise exception 'jeda percobaan 2 harus ~10 menit: % %', o.attempts, o.next_attempt_at - now(); end if;
  update public.notif_outbox set next_attempt_at = now() where id = o.id; perform * from public.notif_claim(10);
  st := public.notif_result(o.id, false, 'resend', null, 'timeout', 504); if st <> 'failed' then raise exception 'batas percobaan habis -> failed, dapat %', st; end if;
  select count(*) into n from public.notif_attempts where outbox_id = o.id; if n <> 3 then raise exception 'riwayat percobaan harus 3, ada %', n; end if;
  -- sukses = sent, BUKAN delivered
  perform public.notif_emit('payment_paid', c1, '{"order_id":"R2","paket":"essential","judul":"J","jumlah":"Rp 1"}', 'nt-r2');
  update public.notif_outbox set next_attempt_at = now() + interval '1 day' where status = 'pending' and dedupe_key not like 'nt-r2:email:customer%';
  perform * from public.notif_claim(10); select * into o from public.notif_outbox where dedupe_key like 'nt-r2:email:customer%';
  st := public.notif_result(o.id, true, 'resend', 'msg-123', null, 200); select * into o from public.notif_outbox where id = o.id;
  if o.status <> 'sent' or o.delivered_at is not null or o.provider_message_id <> 'msg-123' then raise exception 'sukses API harus sent bukan delivered: % %', o.status, o.delivered_at; end if;
  if public.notif_result(o.id, true, 'resend', 'msg-999', null, 200) <> 'diabaikan' then raise exception 'hasil ganda harus diabaikan'; end if;
  if public.notif_delivery('msg-tidak-ada', 'delivered') <> 'tidak_ditemukan' then raise exception 'callback id asing'; end if;
  if public.notif_delivery('msg-123', 'delivered') <> 'ok' then raise exception 'callback'; end if;
  select * into o from public.notif_outbox where id = o.id; if o.status <> 'delivered' or o.delivered_at is null then raise exception 'callback delivered: %', o.status; end if;
  if public.notif_delivery('msg-123', 'bounced', 'mailbox penuh') <> 'ok' then raise exception 'bounce'; end if;
  select * into o from public.notif_outbox where id = o.id; if o.status <> 'failed' or o.last_error not like '%mailbox%' then raise exception 'bounce -> failed: % %', o.status, o.last_error; end if;
  -- galat permanen langsung failed tanpa mengulang
  perform public.notif_emit('payment_paid', c1, '{"order_id":"R3","paket":"essential","judul":"J","jumlah":"Rp 1"}', 'nt-r3');
  update public.notif_outbox set next_attempt_at = now() + interval '1 day' where status = 'pending' and dedupe_key not like 'nt-r3:email:customer%';
  perform * from public.notif_claim(10); select * into o from public.notif_outbox where dedupe_key like 'nt-r3:email:customer%';
  if public.notif_result(o.id, false, 'resend', null, 'alamat tidak valid', 422, true) <> 'failed' then raise exception 'permanen'; end if;
  raise notice 'OK pengirim: claim eksklusif, jeda 5/10 menit, batas percobaan, sukses=sent, delivered hanya dari callback, bounce, permanen';
end $$;

-- 3. Retry/cancel/jeda/test oleh admin; hak akses
do $$ declare o public.notif_outbox; tid uuid; n int; begin
  reset role; update public.notif_outbox set next_attempt_at = now() + interval '1 day' where status = 'pending';
  select * into o from public.notif_outbox where dedupe_key like 'nt-r1:email:customer%'; -- failed
  perform pg_temp.as_user(current_setting('nt.su')::uuid);
  begin perform public.admin_notif_retry(o.id); raise exception 'support (baca saja) bisa retry'; exception when insufficient_privilege then null; end;
  begin perform public.admin_notif_settings_save('{"paused":true}'); raise exception 'support bisa ubah pengaturan'; exception when insufficient_privilege then null; end;
  select count(*) into n from public.notif_outbox; if n = 0 then raise exception 'support harus bisa membaca riwayat'; end if;
  perform pg_temp.as_user(current_setting('nt.c1')::uuid);
  begin select count(*) into n from public.notif_outbox; if n <> 0 then raise exception 'pelanggan membaca outbox'; end if; exception when insufficient_privilege then null; end;
  begin perform public.notif_claim(5); raise exception 'pelanggan memanggil notif_claim'; exception when insufficient_privilege then null; end;
  begin perform public.notif_delivery('x','delivered'); raise exception 'pelanggan memanggil notif_delivery'; exception when insufficient_privilege then null; end;
  perform pg_temp.as_user(current_setting('nt.ad')::uuid);
  perform public.admin_notif_retry(o.id); select * into o from public.notif_outbox where notif_outbox.id = o.id; if o.status <> 'pending' or o.attempts <> 0 then raise exception 'retry: % %', o.status, o.attempts; end if;
  perform public.admin_notif_cancel(o.id); select * into o from public.notif_outbox where id = o.id; if o.status <> 'cancelled' then raise exception 'cancel'; end if;
  begin perform public.admin_notif_cancel(o.id); raise exception 'cancel dua kali lolos'; exception when others then if sqlerrm not like '%tidak_bisa_dibatalkan%' then raise; end if; end;
  begin perform public.admin_notif_retry((select id from public.notif_outbox where status = 'skipped' limit 1)); raise exception 'retry skipped lolos'; exception when others then if sqlerrm not like '%tidak_bisa_dicoba_ulang%' then raise; end if; end;
  tid := public.admin_notif_test('email', 'tes@uji.nusamora.test'); if not exists (select 1 from public.notif_outbox x where x.id = tid and x.event = 'test' and x.status = 'pending') then raise exception 'pesan uji tidak masuk antrean'; end if;
  begin perform public.admin_notif_test('email', 'bukan-email'); raise exception 'alamat salah lolos'; exception when others then if sqlerrm not like '%alamat_tidak_valid%' then raise; end if; end;
  -- pengaturan: validasi
  begin perform public.admin_notif_settings_save('{"max_attempts":0}'); raise exception 'max 0'; exception when others then if sqlerrm not like '%max_attempts_tidak_valid%' then raise; end if; end;
  begin perform public.admin_notif_settings_save('{"internal_emails":["salah"]}'); raise exception 'email salah'; exception when others then if sqlerrm not like '%internal_emails_tidak_valid%' then raise; end if; end;
  begin perform public.admin_notif_settings_save('{"email_from_name":"A\nBcc: x"}'); raise exception 'header injection'; exception when others then if sqlerrm not like '%email_from_name_tidak_valid%' then raise; end if; end;
  begin perform public.admin_notif_settings_save('{"rahasia":"x"}'); raise exception 'kunci asing'; exception when others then if sqlerrm not like '%kunci_tidak_dikenal%' then raise; end if; end;
  -- jeda total
  perform public.admin_notif_settings_save('{"paused":true}'); reset role;
  update public.notif_outbox set next_attempt_at = now() where status = 'pending' and dedupe_key like 'nt-%'; 
  select count(*) into n from public.notif_claim(10); if n <> 0 then raise exception 'saat dijeda, claim harus kosong'; end if;
  update public.notif_settings set value = 'false' where key = 'paused';
  raise notice 'OK hak akses & kontrol admin: retry/batal, support baca saja, pelanggan ditolak, validasi pengaturan, jeda total';
end $$;

-- 4. Template: validasi, pratinjau, aturan butuh template aktif
do $$ declare tid uuid; j jsonb; begin
  perform pg_temp.as_user(current_setting('nt.ad')::uuid);
  begin perform public.admin_notif_template_save(null, 'Salah Kunci', 'email', 'Nama', 's', 'b', true); raise exception 'kunci salah'; exception when others then if sqlerrm not like '%kunci_tidak_valid%' then raise; end if; end;
  begin perform public.admin_notif_template_save(null, 'nt_x', 'email', 'Nama', '', 'b', true); raise exception 'subjek kosong'; exception when others then if sqlerrm not like '%subjek_wajib%' then raise; end if; end;
  begin perform public.admin_notif_template_save(null, 'nt_x', 'email', 'Nama', E'a\nBcc: x', 'b', true); raise exception 'subjek multi baris'; exception when others then if sqlerrm not like '%subjek_tidak_valid%' then raise; end if; end;
  tid := public.admin_notif_template_save(null, 'nt_x', 'whatsapp', 'Uji WA', 'diabaikan', 'Halo {{nama}}', true);
  if (select subject from public.notif_templates x where x.id = tid) is not null then raise exception 'WA tidak boleh punya subjek'; end if;
  begin perform public.admin_notif_template_save(null, 'nt_x', 'whatsapp', 'Dobel', null, 'x', true); raise exception 'duplikat'; exception when others then if sqlerrm not like '%template_sudah_ada%' then raise; end if; end;
  j := public.admin_notif_preview('Halo {{nama}}', 'Order {{order_id}} {{tidak_ada}}'); if j ->> 'subject' <> 'Halo Dina Pratama' or j ->> 'body' <> 'Order NM-20261108-0001' then raise exception 'pratinjau: %', j; end if;
  reset role; update public.notif_templates set active = false where key = 'welcome' and channel = 'email'; perform pg_temp.as_user(current_setting('nt.ad')::uuid);
  begin perform public.admin_notif_rule_set('welcome','email','customer',true); raise exception 'aturan dengan template nonaktif lolos'; exception when others then if sqlerrm not like '%template_tidak_aktif%' then raise; end if; end;
  reset role; update public.notif_templates set active = true where key = 'welcome' and channel = 'email';
  raise notice 'OK template: validasi kunci/subjek/header, duplikat, pratinjau, aturan butuh template aktif';
end $$;

-- 5. Pengumuman: status dikunci sistem; system langsung; email menunggu callback; semua gagal = gagal
do $$ declare a1 uuid; a2 uuid; a3 uuid; n int; st text; o record; begin
  perform pg_temp.as_user(current_setting('nt.ad')::uuid);
  begin insert into public.announcements (title, body, channel, audience, status) values ('NT curang', 'x', 'email', 'semua', 'terkirim'); raise exception 'admin menandai Terkirim manual'; exception when insufficient_privilege then if sqlerrm not like '%status_diatur_sistem%' then raise; end if; end;
  insert into public.announcements (title, body, channel, audience) values ('NT sistem', 'Halo semua', 'system', 'semua') returning id into a1;
  insert into public.announcements (title, body, channel, audience) values ('NT email', 'Halo {{nama}}', 'email', 'admin') returning id into a2;
  begin update public.announcements set status = 'terkirim' where id = a2; raise exception 'update manual ke terkirim lolos'; exception when insufficient_privilege then if sqlerrm not like '%status_diatur_sistem%' then raise; end if; end;
  n := public.admin_announcement_send(a1); select status into st from public.announcements where id = a1; if st <> 'terkirim' then raise exception 'system -> terkirim, dapat %', st; end if;
  n := public.admin_announcement_send(a2); if n < 3 then raise exception 'penerima admin >= 3, dapat %', n; end if;
  select status into st from public.announcements where id = a2; if st <> 'mengirim' then raise exception 'email -> mengirim (bukan terkirim), dapat %', st; end if;
  begin perform public.admin_announcement_send(a2); raise exception 'kirim dua kali'; exception when others then if sqlerrm not like '%sudah_diproses%' then raise; end if; end;
  reset role;
  update public.notif_outbox set next_attempt_at = now() + interval '1 day' where status = 'pending' and announcement_id is distinct from a2;
  for o in select * from public.notif_claim(50) where announcement_id = a2 loop perform public.notif_result(o.id, true, 'resend', 'ann-' || o.id, null, 200); end loop;
  select status into st from public.announcements where id = a2; if st <> 'mengirim' then raise exception 'diterima provider belum berarti terkirim: %', st; end if;
  perform public.notif_delivery('ann-' || (select id from public.notif_outbox where announcement_id = a2 and status = 'sent' limit 1), 'delivered');
  select status into st from public.announcements where id = a2; if st <> 'terkirim' then raise exception 'ada callback delivered -> terkirim, dapat %', st; end if;
  -- semua gagal
  perform set_config('nm.notif', '1', false); insert into public.announcements (title, body, channel, audience, status, scheduled_at) values ('NT jadwal', 'Jadwal', 'whatsapp', 'admin', 'terjadwal', now() - interval '1 minute') returning id into a3; perform set_config('nm.notif', '', false);
  update public.notif_outbox set next_attempt_at = now() + interval '1 day' where status = 'pending';
  perform public.notif_enqueue_due(); select status into st from public.announcements where id = a3; if st not in ('mengirim','gagal') then raise exception 'terjadwal harus diproses oleh dispatcher, dapat %', st; end if;
  update public.notif_outbox set status = 'failed' where announcement_id = a3 and status in ('pending','skipped'); perform public.notif_refresh_announcements(a3);
  select status into st from public.announcements where id = a3; if st <> 'gagal' then raise exception 'semua gagal -> gagal, dapat %', st; end if;
  if (select value from public.notif_settings where key = 'last_dispatch_at') = 'null'::jsonb then raise exception 'detak dispatcher tidak dicatat'; end if;
  raise notice 'OK pengumuman: status dikunci sistem, system langsung terkirim, email baru terkirim setelah callback, terjadwal diproses, semua gagal = gagal';
end $$;

-- 6. Pemicu lain tidak menggagalkan transaksi; tiket & balasan
do $$ declare c1 uuid := current_setting('nt.c1')::uuid; t uuid; n int; begin
  reset role;
  update public.notif_rules set enabled = true where event in ('ticket_reply','ticket_new') and channel = 'email';
  update public.notif_settings set value = '["ops@uji.nusamora.test"]' where key = 'internal_emails';
  insert into public.tickets (user_id, subject, category) values (c1, 'NT tiket', 'bantuan') returning id into t;
  select count(*) into n from public.notif_outbox where dedupe_key like 'ticket:' || t || '%'; if n <> 1 then raise exception 'tiket baru -> 1 pesan internal, ada %', n; end if;
  insert into public.ticket_replies (ticket_id, author_id, is_staff, body) values (t, null, false, 'balasan pelanggan'); 
  select count(*) into n from public.notif_outbox where event = 'ticket_reply' and user_id = c1; if n <> 0 then raise exception 'balasan pelanggan tidak boleh memicu email'; end if;
  insert into public.ticket_replies (ticket_id, author_id, is_staff, body) values (t, null, true, 'balasan staf');
  select count(*) into n from public.notif_outbox where event = 'ticket_reply' and user_id = c1 and body like '%balasan staf%' and to_address = 'nt.c1@uji.nusamora.test'; if n <> 1 then raise exception 'balasan staf -> 1 email, ada %', n; end if;
  raise notice 'OK pemicu tiket/balasan: hanya balasan staf memicu email; pemicu dibungkus exception';
end $$;
select pg_temp.clean();
revoke all on public.announcements from authenticated;
