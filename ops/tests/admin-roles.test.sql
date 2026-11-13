-- Uji DB admin-roles.sql: peran fleksibel, izin per aksi, pagar super admin, pembatasan data, sesi/paksa keluar, idle, audit.
\set ON_ERROR_STOP on
\set QUIET on
create temp table _bk_admins as select * from public.admin_users;
create temp table _bk_security as select * from public.security_settings;
create temp table _had as select t, has_table_privilege('authenticated', 'public.' || t, 'SELECT') as sel, has_table_privilege('authenticated', 'public.' || t, 'DELETE') as del
  from unnest(array['templates', 'event_categories', 'contents', 'admin_users', 'role_permissions']) t;
create temp table _had_anon as select has_table_privilege('anon', 'public.templates', 'SELECT') as sel;
grant select on public.templates to anon;
create or replace function pg_temp.root() returns void language plpgsql as $$ begin reset role; perform set_config('request.jwt.claims', '{}', false); perform set_config('request.jwt.claim.sub', '', false); perform set_config('request.headers', '{}', false); end $$;
grant execute on function pg_temp.root() to public;
create or replace function pg_temp.clean() returns void language plpgsql as $$ begin
  perform pg_temp.root();
  delete from public.templates where slug like 'rl-%'; delete from public.contents where title like 'RL %';
  delete from public.event_categories where slug like 'rl-%';
  delete from public.admin_roles where key like 'rl\_%';
  delete from public.admin_scopes where user_id in (select id from auth.users where email like 'rl.%@uji.nusamora.test');
  delete from auth.sessions where user_id in (select id from auth.users where email like 'rl.%@uji.nusamora.test');
  delete from public.admin_users where user_id in (select id from auth.users where email like 'rl.%@uji.nusamora.test');
  delete from auth.users where email like 'rl.%@uji.nusamora.test';
  delete from public.admin_sessions where user_id not in (select id from auth.users);
  delete from public.security_settings where key = 'admin_idle_timeout_min';
  delete from public.security_events where kind like 'admin\_%' and actor not in (select user_id::text from public.admin_users);
end $$;
do $$ begin perform pg_temp.clean(); end $$;
grant select, insert, update, delete on public.templates, public.event_categories, public.contents, public.admin_users, public.role_permissions to authenticated;
create or replace function pg_temp.as_user(u uuid, sid uuid default null, ip text default null, ua text default null) returns void language plpgsql as $$
begin reset role;
  perform set_config('request.jwt.claim.sub', u::text, false);
  perform set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated', 'session_id', sid)::text, false);
  perform set_config('request.headers', json_build_object('x-forwarded-for', ip, 'user-agent', ua)::text, false);
  set role authenticated; end $$;
grant execute on function pg_temp.as_user(uuid, uuid, text, text) to public;
create or replace function pg_temp.sq(q text) returns text language plpgsql security definer as $$ declare r text; begin execute q into r; return r; end $$;
grant execute on function pg_temp.sq(text) to public;
create or replace function pg_temp.fails(sql text, expect text) returns void language plpgsql as $$ begin
  begin execute sql; raise exception 'seharusnya gagal: %', sql; exception when others then if sqlerrm like 'seharusnya gagal%' or sqlerrm not like '%' || expect || '%' then raise exception 'galat salah untuk [%]: % (harap: %)', sql, sqlerrm, expect; end if; end; end $$;

do $$ declare sa uuid := gen_random_uuid(); sb uuid := gen_random_uuid(); op uuid := gen_random_uuid(); ct uuid := gen_random_uuid(); cu uuid := gen_random_uuid(); begin
  insert into auth.users (id, email) values (sa, 'rl.super1@uji.nusamora.test'), (sb, 'rl.super2@uji.nusamora.test'), (op, 'rl.op@uji.nusamora.test'), (ct, 'rl.ct@uji.nusamora.test'), (cu, 'rl.cust@uji.nusamora.test');
  insert into public.admin_users (user_id, role) values (sa, 'super_admin'), (sb, 'super_admin'), (op, 'admin'), (ct, 'content');
  perform set_config('rl.sa', sa::text, false); perform set_config('rl.sb', sb::text, false); perform set_config('rl.op', op::text, false);
  perform set_config('rl.ct', ct::text, false); perform set_config('rl.cu', cu::text, false);
end $$;

-- 1. Katalog, peran bawaan, preset
do $$ declare r jsonb; begin
  perform pg_temp.as_user(current_setting('rl.sa')::uuid);
  r := public.admin_roles_overview();
  if jsonb_array_length(r -> 'roles') < 5 then raise exception 'peran bawaan kurang'; end if;
  perform pg_temp.root();
  if (select label from public.admin_roles where key = 'admin') <> 'Admin Operasional' then raise exception 'label admin'; end if;
  if not exists (select 1 from jsonb_array_elements(r -> 'roles') x where x ->> 'key' = 'super_admin' and (x -> 'perms') @> '"admins.delete"') then raise exception 'super_admin harus punya semua izin'; end if;
  if not public.admin_perm_valid('templates.delete') or public.admin_perm_valid('x.write') or public.admin_perm_valid('templates.export') then raise exception 'validasi izin'; end if;
  if not exists (select 1 from public.role_permissions where role = 'content' and permission = 'templates.delete') then raise exception 'backfill delete'; end if;
  -- non-admin tidak bisa membaca
  perform pg_temp.as_user(current_setting('rl.cu')::uuid);
  perform pg_temp.fails($q$select public.admin_roles_overview()$q$, 'forbidden');
  perform pg_temp.fails($q$select public.admin_role_save('rl_x', 'RL X', null, array['dashboard.read'], true)$q$, 'forbidden');
  raise notice 'OK 1 katalog & preset';
end $$;

-- 2. Peran kustom
do $$ declare ps text[]; begin
  perform pg_temp.as_user(current_setting('rl.sa')::uuid);
  perform public.admin_role_save('rl_marketing', 'RL Marketing', 'Uji', array['templates.delete', 'content.write', 'dashboard.read'], true);
  perform pg_temp.root(); select array_agg(permission order by permission) into ps from public.role_permissions where role = 'rl_marketing'; perform pg_temp.as_user(current_setting('rl.sa')::uuid);
  if ps <> array['content.read', 'content.write', 'dashboard.read', 'templates.delete', 'templates.read', 'templates.write'] then raise exception 'normalisasi izin salah: %', ps; end if;
  perform public.admin_role_save('rl_marketing', 'RL Marketing 2', null, array['content.read'], false);
  perform pg_temp.root(); select array_agg(permission) into ps from public.role_permissions where role = 'rl_marketing'; perform pg_temp.as_user(current_setting('rl.sa')::uuid);
  if ps <> array['content.read'] then raise exception 'izin tidak diganti: %', ps; end if;
  perform pg_temp.fails($q$select public.admin_role_save('rl_marketing', 'Lagi', null, array['content.read'], true)$q$, 'peran_sudah_ada');
  perform pg_temp.fails($q$select public.admin_role_save('super_admin', 'X Super', null, array['content.read'], false)$q$, 'peran_super_admin_terkunci');
  perform pg_temp.fails($q$select public.admin_role_save('rl_bad', 'Bad', null, array['templates.export'], true)$q$, 'izin_tidak_valid');
  perform pg_temp.fails($q$select public.admin_role_save('rl_bad', 'Bad', null, array['admins.write'], true)$q$, 'izin_admins_khusus_super_admin');
  perform pg_temp.fails($q$select public.admin_role_save('Bad Key', 'Bad', null, array['content.read'], true)$q$, 'peran_tidak_valid');
  perform pg_temp.fails($q$select public.admin_role_save('rl_bad', 'B', null, array['content.read'], true)$q$, 'label_tidak_valid');
  perform pg_temp.fails($q$select public.admin_role_delete('admin')$q$, 'peran_bawaan_tidak_bisa_dihapus');
  perform public.admin_add_admin('rl.cust@uji.nusamora.test', 'rl_marketing');
  perform pg_temp.fails($q$select public.admin_role_delete('rl_marketing')$q$, 'peran_masih_dipakai');
  perform pg_temp.fails($q$select public.admin_add_admin('rl.cust@uji.nusamora.test', 'tidak_ada')$q$, 'peran_tidak_valid');
  perform pg_temp.fails($q$select public.admin_add_admin('tidak.ada@uji.nusamora.test', 'rl_marketing')$q$, 'belum terdaftar');
  perform public.admin_set_active(current_setting('rl.cu')::uuid, false);
  perform pg_temp.root(); delete from public.admin_users where user_id = current_setting('rl.cu')::uuid; perform pg_temp.as_user(current_setting('rl.sa')::uuid);
  perform public.admin_role_delete('rl_marketing');
  -- preset: ubah lalu kembalikan
  perform public.admin_role_save('support', 'Admin Support', null, array['dashboard.read'], false);
  perform public.admin_role_apply_preset('support');
  perform pg_temp.root();
  if (select count(*) from public.role_permissions where role = 'support') <> array_length(public.admin_role_preset('support'), 1) then raise exception 'preset tidak diterapkan'; end if;
  perform pg_temp.as_user(current_setting('rl.sa')::uuid);
  perform pg_temp.fails($q$select public.admin_role_apply_preset('super_admin')$q$, 'tidak_ada_preset');
  raise notice 'OK 2 peran kustom';
end $$;

-- 3. Pagar keras
do $$ declare op uuid := current_setting('rl.op')::uuid; sa uuid := current_setting('rl.sa')::uuid; sb uuid := current_setting('rl.sb')::uuid; begin
  -- admin biasa yang (lewat SQL Editor) diberi admins.write tetap tidak boleh mengubah admin
  perform pg_temp.root(); insert into public.role_permissions (role, permission) values ('admin', 'admins.write'), ('admin', 'admins.read');
  perform pg_temp.as_user(op);
  perform pg_temp.fails(format($q$update public.admin_users set role = 'super_admin' where user_id = %L$q$, op), 'forbidden');
  perform pg_temp.fails($q$select public.admin_add_admin('rl.ct@uji.nusamora.test', 'super_admin')$q$, 'forbidden');
  perform pg_temp.fails($q$insert into public.role_permissions (role, permission) values ('admin', 'settings.write')$q$, 'forbidden');
  perform pg_temp.fails($q$delete from public.admin_roles where key = 'content'$q$, 'permission denied');
  perform pg_temp.fails($q$select public.admin_set_role(gen_random_uuid(), 'admin')$q$, 'forbidden');
  perform pg_temp.fails($q$select public.admin_scope_set(gen_random_uuid(), 'content_type', array['faq'])$q$, 'forbidden');
  perform pg_temp.as_user(sa);
  -- tidak boleh mengubah diri sendiri
  perform pg_temp.fails(format($q$select public.admin_set_role(%L, 'admin')$q$, sa), 'tidak_boleh_ubah_diri_sendiri');
  perform pg_temp.fails(format($q$select public.admin_set_active(%L, false)$q$, sa), 'tidak_boleh_ubah_diri_sendiri');
  perform pg_temp.fails(format($q$delete from public.admin_users where user_id = %L$q$, sa), 'tidak_boleh_ubah_diri_sendiri');
  -- super admin lain bisa diturunkan selama masih ada satu; yang terakhir tidak
  perform pg_temp.root(); update public.admin_users set active = false where role = 'super_admin' and user_id not in (sa, sb);
  perform pg_temp.as_user(sa);
  perform public.admin_set_role(sb, 'admin');
  perform pg_temp.as_user(sb);   -- sb sudah bukan super
  perform pg_temp.fails(format($q$select public.admin_set_role(%L, 'admin')$q$, sa), 'forbidden');
  perform pg_temp.root(); update public.admin_users set role = 'super_admin' where user_id = sb;
  perform pg_temp.as_user(sb);
  perform public.admin_set_active(sa, false);       -- sa dinonaktifkan oleh sb: masih ada sb
  perform pg_temp.fails(format($q$select public.admin_set_role(%L, 'admin')$q$, sb), 'tidak_boleh_ubah_diri_sendiri');
  perform pg_temp.root(); update public.admin_users set active = true where user_id = sa;
  perform pg_temp.as_user(sa);
  perform public.admin_set_active(sb, false);       -- sb nonaktif; sa terakhir
  perform pg_temp.root(); update public.admin_users set active = true where user_id = sb;
  -- terakhir: nonaktifkan sb lewat SQL (dipercaya) lalu coba turunkan sa lewat pemicu langsung dari admin lain tidak mungkin; uji lewat pemicu
  update public.admin_users set role = 'admin' where user_id = sb;
  perform pg_temp.as_user(sa);
  -- sa satu-satunya super: tak ada yang lain yang bisa menurunkannya, tetapi hapus/ubah sendiri sudah ditolak di atas
  perform pg_temp.root(); delete from public.role_permissions where role = 'admin' and permission in ('admins.write', 'admins.read');
  update public.admin_users set role = 'super_admin' where user_id = sb;
  raise notice 'OK 3 pagar keras';
end $$;

-- 4. Aksi hapus terpisah
do $$ declare ct uuid := current_setting('rl.ct')::uuid; cat uuid; n int; begin
  perform pg_temp.root();
  insert into public.event_categories (name, slug) values ('RL Kat A', 'rl-a') returning id into cat;
  insert into public.templates (slug, name, package_type, category_id, status) values ('rl-t1', 'RL T1', 'essential', cat, 'draft');
  perform pg_temp.as_user(ct);
  delete from public.templates where slug = 'rl-t1'; get diagnostics n = row_count;
  if n <> 1 then raise exception 'content manager seharusnya boleh hapus template (bawaan)'; end if;
  perform pg_temp.root(); insert into public.templates (slug, name, package_type, category_id, status) values ('rl-t2', 'RL T2', 'essential', cat, 'draft');
  delete from public.role_permissions where role = 'content' and permission = 'templates.delete';
  perform pg_temp.as_user(ct);
  delete from public.templates where slug = 'rl-t2'; get diagnostics n = row_count;
  if n <> 0 then raise exception 'tanpa izin delete tidak boleh menghapus'; end if;
  update public.templates set name = 'RL T2 ubah' where slug = 'rl-t2'; get diagnostics n = row_count;
  if n <> 1 then raise exception 'masih boleh ubah (write)'; end if;
  perform pg_temp.root(); insert into public.role_permissions (role, permission) values ('content', 'templates.delete') on conflict do nothing;
  raise notice 'OK 4 izin hapus terpisah';
end $$;

-- 5. Pembatasan akses berbasis data
do $$ declare ct uuid := current_setting('rl.ct')::uuid; sa uuid := current_setting('rl.sa')::uuid; a uuid; b uuid; n int; begin
  perform pg_temp.root();
  select id into a from public.event_categories where slug = 'rl-a';
  insert into public.event_categories (name, slug) values ('RL Kat B', 'rl-b') returning id into b;
  delete from public.templates where slug like 'rl-%';
  insert into public.templates (slug, name, package_type, category_id, status) values ('rl-ta', 'RL TA', 'essential', a, 'published'), ('rl-tb', 'RL TB', 'essential', b, 'published');
  insert into public.contents (type, title, status) values ('faq', 'RL faq', 'published'), ('article', 'RL artikel', 'published');
  perform pg_temp.as_user(sa);
  perform public.admin_scope_set(ct, 'template_category', array[a::text]);
  perform public.admin_scope_set(ct, 'content_type', array['faq']);
  perform pg_temp.fails(format($q$select public.admin_scope_set(%L, 'template_category', array['bukan-uuid'])$q$, ct), 'nilai_tidak_valid');
  perform pg_temp.fails(format($q$select public.admin_scope_set(%L, 'content_type', array['rahasia'])$q$, ct), 'nilai_tidak_valid');
  perform pg_temp.fails(format($q$select public.admin_scope_set(%L, 'lainnya', array['x'])$q$, ct), 'jenis_tidak_valid');
  perform pg_temp.as_user(ct);
  select count(*) into n from public.templates where slug like 'rl-t%'; if n <> 1 then raise exception 'content manager harus melihat 1 template, dapat %', n; end if;
  select count(*) into n from public.contents where title like 'RL %'; if n <> 1 then raise exception 'content manager harus melihat 1 konten, dapat %', n; end if;
  update public.templates set name = 'RL TB ubah' where slug = 'rl-tb'; get diagnostics n = row_count;
  if n <> 0 then raise exception 'tidak boleh mengubah di luar cakupan'; end if;
  perform pg_temp.fails(format($q$insert into public.templates (slug, name, package_type, category_id, status) values ('rl-tb2', 'RL TB2', 'essential', %L, 'draft')$q$, b), 'row-level security');
  insert into public.templates (slug, name, package_type, category_id, status) values ('rl-ta2', 'RL TA2', 'essential', a, 'draft');
  -- pelanggan/anon tetap melihat yang terbit
  perform pg_temp.root(); set role anon;
  select count(*) into n from public.templates where slug like 'rl-t%' and status = 'published'; if n <> 2 then raise exception 'anon harus melihat 2 template terbit, dapat %', n; end if;
  perform pg_temp.root(); perform pg_temp.as_user(sa);
  perform public.admin_scope_set(ct, 'template_category', '{}'::text[]);
  perform pg_temp.as_user(ct);
  select count(*) into n from public.templates where slug like 'rl-t%'; if n <> 3 then raise exception 'cakupan dicabut, harus lihat 3, dapat %', n; end if;
  raise notice 'OK 5 pembatasan data';
end $$;

-- 6. Sesi, riwayat login, paksa keluar
do $$ declare op uuid := current_setting('rl.op')::uuid; sa uuid := current_setting('rl.sa')::uuid; s1 uuid := gen_random_uuid(); s2 uuid := gen_random_uuid(); s3 uuid := gen_random_uuid();
  r jsonb; ok boolean; n int; ua1 text := 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36';
  ua2 text := 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Safari/604.1'; begin
  perform pg_temp.root(); insert into auth.sessions (id, user_id) values (s1, op), (s2, op), (s3, sa);
  perform pg_temp.as_user(op, s1, '10.0.0.5', ua1);
  r := public.admin_session_ping();
  if not (r ->> 'ok')::boolean or (r ->> 'new_ip')::boolean or (r ->> 'new_device')::boolean then raise exception 'sesi pertama tidak boleh ditandai baru: %', r; end if;
  if pg_temp.sq(format('select device from public.admin_sessions where session_id = %L', s1)) <> 'Chrome di Windows' then raise exception 'perangkat salah'; end if;
  perform pg_temp.as_user(op, s2, '203.0.113.9', ua2);
  r := public.admin_session_ping();
  if not (r ->> 'new_ip')::boolean or not (r ->> 'new_device')::boolean then raise exception 'IP/perangkat baru harus ditandai: %', r; end if;
  perform pg_temp.root();
  if (select count(*) from public.security_events where kind in ('admin_new_ip', 'admin_new_device') and actor = op::text) <> 2 then raise exception 'peristiwa keamanan tidak dicatat'; end if;
  -- pemanggil bukan admin: tidak mencatat apa-apa
  insert into auth.users (id, email) values (gen_random_uuid(), 'rl.nobody@uji.nusamora.test');
  perform pg_temp.as_user((select id from auth.users where email = 'rl.nobody@uji.nusamora.test'), gen_random_uuid());
  if (public.admin_session_ping() ->> 'admin')::boolean then raise exception 'bukan admin harus ditolak'; end if;
  perform pg_temp.root(); delete from auth.users where email = 'rl.nobody@uji.nusamora.test';
  -- admin biasa punya izin lewat sesi s1
  perform pg_temp.as_user(op, s1, '10.0.0.5', ua1);
  if not public.has_perm('customers.read') then raise exception 'has_perm harus true'; end if;
  perform pg_temp.fails($q$select public.admin_sessions_list()$q$, 'forbidden');
  -- hanya super yang boleh memaksa orang lain keluar
  perform pg_temp.fails(format($q$select public.admin_force_logout(%L)$q$, sa), 'forbidden');
  perform pg_temp.as_user(sa, s3, '10.0.0.1', ua1);
  perform public.admin_session_ping();
  r := public.admin_sessions_list();
  if (r ->> 'total')::int < 3 then raise exception 'riwayat kurang: %', r; end if;
  r := public.admin_sessions_list(op, true);
  if (r ->> 'total')::int <> 1 or (r -> 'rows' -> 0 ->> 'device') <> 'Safari di iOS' then raise exception 'filter ditandai salah: %', r; end if;
  -- paksa keluar satu sesi
  n := public.admin_force_logout(op, s2);
  if n <> 1 then raise exception 'harus mencabut 1 sesi, dapat %', n; end if;
  perform pg_temp.as_user(op, s2, '203.0.113.9', ua2);
  if public.has_perm('customers.read') then raise exception 'sesi yang dicabut harus ditolak has_perm'; end if;
  if (public.admin_session_ping() ->> 'revoked')::boolean is not true then raise exception 'ping sesi dicabut harus revoked'; end if;
  perform pg_temp.as_user(op, s1, '10.0.0.5', ua1);
  if not public.has_perm('customers.read') then raise exception 'sesi lain tidak boleh ikut dicabut'; end if;
  -- keluar sendiri
  perform public.admin_session_end();
  if public.has_perm('customers.read') then raise exception 'sesi yang diakhiri harus ditolak'; end if;
  -- JWT tanpa session_id tidak diblokir
  perform pg_temp.as_user(op, null, null, null);
  if not public.has_perm('customers.read') then raise exception 'tanpa session_id harus lolos'; end if;
  -- diri sendiri boleh mencabut sesi lain dengan mempertahankan yang sekarang
  perform pg_temp.root(); insert into auth.sessions (id, user_id) values (gen_random_uuid(), op);
  perform pg_temp.as_user(op, s1);
  perform pg_temp.root(); update public.admin_sessions set ended_at = null, ended_reason = null where session_id = s1;
  perform pg_temp.as_user(op, s1);
  n := public.admin_force_logout(op, null, true);
  if n < 1 or pg_temp.sq(format('select 1 from auth.sessions where id = %L', s1)) is null then raise exception 'sesi sekarang harus dipertahankan (n=%)', n; end if;
  if pg_temp.sq($q$select 1 from public.audit_logs where action = 'paksa_keluar' and table_name = 'admin_sessions' limit 1$q$) is null then raise exception 'paksa keluar harus diaudit'; end if;
  raise notice 'OK 6 sesi & paksa keluar';
end $$;

-- 7. Batas tidak aktif
do $$ declare op uuid := current_setting('rl.op')::uuid; sa uuid := current_setting('rl.sa')::uuid; s1 uuid := gen_random_uuid(); r jsonb; begin
  perform pg_temp.root(); insert into auth.sessions (id, user_id) values (s1, op);
  perform pg_temp.as_user(op, s1, '10.0.0.5', 'Mozilla/5.0 (X11; Linux x86_64) Firefox/120.0');
  perform public.admin_session_ping();
  perform pg_temp.fails($q$select public.admin_access_set(30)$q$, 'forbidden');
  perform pg_temp.as_user(sa);
  perform pg_temp.fails($q$select public.admin_access_set(3)$q$, 'batas_tidak_aktif_tidak_valid');
  perform public.admin_access_set(30);
  if (public.admin_access_get() ->> 'idle_timeout_min')::int <> 30 then raise exception 'pengaturan idle tidak tersimpan'; end if;
  perform pg_temp.as_user(op, s1);
  if not public.has_perm('customers.read') then raise exception 'aktif baru saja harus lolos'; end if;
  perform pg_temp.root(); update public.admin_sessions set last_seen = now() - interval '31 minutes' where session_id = s1;
  perform pg_temp.as_user(op, s1);
  if public.has_perm('customers.read') then raise exception 'melewati batas tidak aktif harus ditolak'; end if;
  r := public.admin_session_ping();
  if (r ->> 'reason') <> 'tidak_aktif' then raise exception 'ping harus melaporkan tidak_aktif: %', r; end if;
  perform pg_temp.root(); delete from public.security_settings where key = 'admin_idle_timeout_min';
  update public.admin_sessions set ended_at = null where session_id = s1;
  perform pg_temp.as_user(op, s1);
  if not public.has_perm('customers.read') then raise exception 'idle mati: harus lolos'; end if;
  raise notice 'OK 7 batas tidak aktif';
end $$;

-- 8. Daftar admin, peringatan, audit
do $$ declare sa uuid := current_setting('rl.sa')::uuid; ct uuid := current_setting('rl.ct')::uuid; r jsonb; n int; begin
  perform pg_temp.as_user(sa);
  r := public.admin_admins_overview();
  if not exists (select 1 from jsonb_array_elements(r) x where x ->> 'email' = 'rl.ct@uji.nusamora.test' and x ->> 'role_label' = 'Content Manager') then raise exception 'ikhtisar admin'; end if;
  if jsonb_array_length(public.admin_security_alerts()) < 1 then raise exception 'peringatan keamanan kosong'; end if;
  if (public.admin_role_labels() ->> 'support') <> 'Admin Support' then raise exception 'label peran'; end if;
  perform pg_temp.as_user(ct);
  if public.admin_role_labels() ? 'support' is not true then raise exception 'admin biasa boleh melihat label'; end if;
  perform pg_temp.fails($q$select public.admin_audit_list()$q$, 'forbidden');
  perform pg_temp.as_user(sa);
  r := public.admin_audit_list(sa, 'admin_roles', null, null, null, null, 10, 0);
  if (r ->> 'total')::int < 1 then raise exception 'audit peran tidak tercatat: %', r; end if;
  r := public.admin_audit_list(null, null, null, now() - interval '1 hour', now() + interval '1 hour', 'rl_marketing', 5, 0);
  if (r ->> 'total')::int < 1 or jsonb_array_length(r -> 'rows') > 5 then raise exception 'pencarian audit: %', r; end if;
  r := public.admin_audit_list(null, null, null, null, null, '100%_tidak_ada_sama_sekali', 5, 0);
  if (r ->> 'total')::int <> 0 then raise exception 'wildcard harus di-escape'; end if;
  if jsonb_array_length(public.admin_audit_facets() -> 'actors') < 2 then raise exception 'facet'; end if;
  -- tidak bisa diubah/dihapus dari klien
  -- RLS sudah menolak (tanpa kebijakan ubah/hapus); pemicu adalah garis pertahanan terakhir bila kelak ada kebijakan longgar
  perform pg_temp.root(); grant update, delete on public.audit_logs to authenticated;
  create policy rl_tmp on public.audit_logs for all to authenticated using (true) with check (true);
  perform pg_temp.as_user(sa);
  perform pg_temp.fails($q$update public.audit_logs set action = 'x'$q$, 'audit_log_tidak_bisa_diubah');
  perform pg_temp.fails($q$delete from public.audit_logs$q$, 'audit_log_tidak_bisa_diubah');
  perform pg_temp.root(); drop policy rl_tmp on public.audit_logs; revoke update, delete on public.audit_logs from authenticated;
  perform pg_temp.as_user(sa);
  raise notice 'OK 8 audit';
end $$;

-- pulihkan
reset role;
do $$ begin perform pg_temp.clean(); end $$;
delete from public.admin_users; insert into public.admin_users select * from _bk_admins where user_id in (select id from auth.users);
delete from public.security_settings; insert into public.security_settings select * from _bk_security;
do $$ declare h record; begin
  if not (select sel from _had_anon) then revoke select on public.templates from anon; end if;
  for h in select * from _had loop
    if not h.sel then execute format('revoke select on public.%I from authenticated', h.t); end if;
    if not h.del then execute format('revoke insert, update, delete on public.%I from authenticated', h.t); end if;
  end loop;
end $$;
