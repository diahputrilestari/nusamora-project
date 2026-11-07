-- Uji penegakan MFA di database. Prasyarat: skema NusaMora + security-schema.sql + security-mfa.sql + mfa-shim.sql,
-- dan admin uji (super_admin, content, support) seperti pada assettest.sql. Dijalankan sebagai superuser lalu `set role`.
\set ON_ERROR_STOP on
select user_id as sa from public.admin_users where role='super_admin' and active limit 1 \gset
select user_id as ct from public.admin_users where role='content' and active limit 1 \gset
delete from auth.mfa_factors; update public.security_settings set value='false'; update public.admin_users set password_policy_at=null;
delete from public.audit_logs where action='uji-mfa'; insert into public.audit_logs(actor_id, action) values (:'sa','uji-mfa');
create or replace function pg_temp.as_user(uid uuid, aal text) returns void language sql as $$
  select set_config('request.jwt.claim.sub', uid::text, false), set_config('request.jwt.claims', jsonb_build_object('sub', uid, 'aal', aal, 'role','authenticated')::text, false) $$;

\echo == 1. penegakan mati (default): perilaku lama tidak berubah
select pg_temp.as_user(:'sa','aal1') \gset
set role authenticated;
do $$ begin
  assert public.has_perm('templates.write'), 'default: super admin aal1 tetap boleh';
  assert (public.my_admin()->'mfa'->>'needed')::boolean = false, 'default: needed=false';
  assert jsonb_array_length(public.my_admin()->'perms') > 0, 'default: perms ada';
  assert (select count(*) from public.audit_logs where action='uji-mfa') = 1, 'default: audit_logs terbaca';
end $$;

\echo == 2. prasyarat pengaktifan (anti lock-out)
do $$ begin begin perform public.admin_set_security(true,false); raise exception 'SEHARUSNYA DITOLAK'; exception when sqlstate 'P0001' then assert sqlerrm like '%aal2%', 'minta aal2: '||sqlerrm; end; end $$;
reset role; select pg_temp.as_user(:'sa','aal2') \gset
set role authenticated;
do $$ begin begin perform public.admin_set_security(true,false); raise exception 'SEHARUSNYA DITOLAK'; exception when sqlstate 'P0001' then assert sqlerrm like '%belum mendaftarkan MFA%', 'sebut admin tanpa MFA: '||sqlerrm; end; end $$;
reset role;
insert into auth.mfa_factors(user_id,status) select user_id,'verified' from public.admin_users where active and role <> 'support';
\echo (satu admin aktif masih tanpa faktor -> tetap ditolak)
set role authenticated;
do $$ begin begin perform public.admin_set_security(true,false); raise exception 'SEHARUSNYA DITOLAK'; exception when sqlstate 'P0001' then null; end; end $$;
reset role;
insert into auth.mfa_factors(user_id,status) select user_id,'unverified' from public.admin_users where role='support';   -- belum terverifikasi tidak dihitung
set role authenticated;
do $$ begin begin perform public.admin_set_security(true,false); raise exception 'SEHARUSNYA DITOLAK'; exception when sqlstate 'P0001' then null; end; end $$;
reset role;
insert into auth.mfa_factors(user_id,status) select user_id,'verified' from public.admin_users where role='support';
set role authenticated;
do $$ declare s jsonb; begin
  s := public.security_status(); assert jsonb_array_length(s->'admins') >= 3, 'status: daftar admin';
  perform public.admin_set_security(true,false);
end $$;
reset role;
select public.setting_bool('admin_mfa_required') as on \gset
\if :on \echo penegakan MFA aktif \else \echo GAGAL: penegakan tidak aktif \quit \endif

\echo == 3. penegakan aktif: aal1 ditolak di level RLS & fungsi, aal2 diterima
select pg_temp.as_user(:'sa','aal1') \gset
set role authenticated;
do $$ begin
  assert not public.has_perm('templates.write'), 'aal1: has_perm false';
  assert (public.my_admin()->'mfa'->>'needed')::boolean and (public.my_admin()->'mfa'->>'enrolled')::boolean, 'aal1: needed & enrolled';
  assert jsonb_array_length(public.my_admin()->'perms') = 0, 'aal1: perms disembunyikan';
  assert public.my_admin()->>'role' = 'super_admin', 'role tetap terbaca (untuk UI MFA)';
  assert (select count(*) from public.audit_logs where action='uji-mfa') = 0, 'aal1: RLS audit_logs menyembunyikan baris';
  begin perform public.security_status(); raise exception 'SEHARUSNYA DITOLAK'; exception when insufficient_privilege then null; end;
  begin perform public.admin_set_security(false,false); raise exception 'SEHARUSNYA DITOLAK (aal1 tak boleh mematikan)'; exception when insufficient_privilege then null; end;
end $$;
reset role; select pg_temp.as_user(:'sa','aal2') \gset
set role authenticated;
do $$ begin
  assert public.has_perm('templates.write'), 'aal2: has_perm true';
  assert not (public.my_admin()->'mfa'->>'needed')::boolean, 'aal2: needed=false';
  assert jsonb_array_length(public.my_admin()->'perms') > 0, 'aal2: perms ada';
  assert (select count(*) from public.audit_logs where action='uji-mfa') = 1, 'aal2: audit_logs terbaca';
end $$;
reset role;
\echo == 4. admin non-super tidak boleh mengubah pengaturan; pelanggan biasa tidak terpengaruh
select pg_temp.as_user(:'ct','aal2') \gset
set role authenticated;
do $$ begin
  assert public.has_perm('templates.write'), 'content aal2 boleh';
  begin perform public.admin_set_security(false,false); raise exception 'SEHARUSNYA DITOLAK'; exception when insufficient_privilege then null; end;
  begin perform public.security_status(); raise exception 'SEHARUSNYA DITOLAK'; exception when insufficient_privilege then null; end;
end $$;
reset role; select pg_temp.as_user(gen_random_uuid(),'aal1') \gset
set role authenticated;
do $$ begin
  assert (select count(*) from public.templates where status='published') >= 0, 'pelanggan masih bisa membaca katalog publik';
  assert not public.has_perm('templates.write'), 'pelanggan bukan admin';
  assert public.my_admin() = 'null'::jsonb, 'my_admin null untuk non-admin';
end $$;
reset role; set role anon;
do $$ begin begin perform public.admin_set_security(false,false); raise exception 'SEHARUSNYA DITOLAK'; exception when insufficient_privilege then null; end;
  begin perform public.security_status(); raise exception 'SEHARUSNYA DITOLAK'; exception when insufficient_privilege then null; end; end $$;
reset role;
\echo == 5. has_perm_session (Edge Function)
set role service_role;
do $$ declare u uuid := (select user_id from public.admin_users where role='super_admin' and active limit 1); begin
  assert not public.has_perm_session(u,'templates.write','aal1'), 'session aal1 ditolak';
  assert not public.has_perm_session(u,'templates.write',null), 'session tanpa aal ditolak';
  assert public.has_perm_session(u,'templates.write','aal2'), 'session aal2 diterima';
  assert not public.has_perm_session(gen_random_uuid(),'templates.write','aal2'), 'bukan admin ditolak';
end $$;
reset role;
\echo == 5b. ganti password tidak boleh buntu
set role service_role;
do $$ declare u uuid := (select user_id from public.admin_users where role='super_admin' and active limit 1); begin
  update public.security_settings set value='true' where key='admin_password_policy_required';
  assert public.is_admin_for_password(u,'aal2'), 'admin aal2 boleh ganti password walau kebijakan belum terpenuhi';
  assert not public.is_admin_for_password(u,'aal1'), 'MFA wajib: aal1 tidak boleh';
  assert not public.is_admin_for_password(gen_random_uuid(),'aal2'), 'non-admin tidak boleh';
  update public.security_settings set value='false' where key='admin_password_policy_required';
end $$;
reset role;
\echo == 6. kebijakan password admin
select pg_temp.as_user(:'sa','aal2') \gset
set role authenticated;
do $$ begin begin perform public.admin_set_security(true,true); raise exception 'SEHARUSNYA DITOLAK'; exception when sqlstate 'P0001' then assert sqlerrm like '%password%', sqlerrm; end; end $$;
reset role; set role service_role; select public.admin_mark_password_ok(user_id) from public.admin_users where active; reset role;
set role authenticated;
do $$ begin perform public.admin_set_security(true,true); assert public.has_perm('templates.write'), 'password ok + aal2 -> boleh'; end $$;
reset role;
-- admin baru tanpa password_ok kehilangan akses meski aal2
insert into auth.users(id,email) values ('00000000-0000-0000-0000-0000000000f1','newadmin@x.id') on conflict do nothing;
insert into public.admin_users(user_id, role, active) values ('00000000-0000-0000-0000-0000000000f1','super_admin',true) on conflict (user_id) do update set active=true, password_policy_at=null;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000f1','aal2') \gset
set role authenticated;
do $$ begin assert not public.has_perm('templates.write'), 'admin baru tanpa password policy ditolak'; assert (public.my_admin()->'mfa'->>'password_ok')::boolean = false; end $$;
reset role; delete from public.admin_users where user_id='00000000-0000-0000-0000-0000000000f1';
\echo == 6b. persetujuan faktor pertama (admin baru tidak otomatis dipercaya)
insert into auth.users(id,email) values ('00000000-0000-0000-0000-0000000000f2','newadmin2@x.id') on conflict do nothing;
insert into public.admin_users(user_id, role, active, password_policy_at, mfa_approved_at) values ('00000000-0000-0000-0000-0000000000f2','super_admin',true, now(), null)
  on conflict (user_id) do update set active=true, password_policy_at=now(), mfa_approved_at=null;
insert into auth.mfa_factors(user_id,status) values ('00000000-0000-0000-0000-0000000000f2','verified');   -- penyerang mendaftar faktornya sendiri
select pg_temp.as_user('00000000-0000-0000-0000-0000000000f2','aal2') \gset
set role authenticated;
do $$ begin
  assert not public.has_perm('templates.write'), 'aal2 tetapi belum disetujui -> ditolak';
  assert (public.my_admin()->'mfa'->>'needed')::boolean and not (public.my_admin()->'mfa'->>'approved')::boolean, 'needed & belum approved';
  begin perform public.admin_approve_mfa('00000000-0000-0000-0000-0000000000f2'); raise exception 'SEHARUSNYA DITOLAK'; exception when insufficient_privilege then null; end;   -- tidak bisa menyetujui diri sendiri (juga tidak lolos mfa_ok)
end $$;
reset role; select pg_temp.as_user(:'ct','aal2') \gset
set role authenticated;
do $$ begin begin perform public.admin_approve_mfa('00000000-0000-0000-0000-0000000000f2'); raise exception 'SEHARUSNYA DITOLAK'; exception when insufficient_privilege then null; end; end $$;   -- admin non-super tidak boleh
reset role; select pg_temp.as_user(:'sa','aal2') \gset
set role authenticated;
do $$ begin
  begin perform public.admin_approve_mfa(auth.uid()); raise exception 'SEHARUSNYA DITOLAK'; exception when sqlstate 'P0001' then assert sqlerrm like '%diri sendiri%', sqlerrm; end;
  begin perform public.admin_approve_mfa(gen_random_uuid()); raise exception 'SEHARUSNYA DITOLAK'; exception when sqlstate 'P0001' then assert sqlerrm like '%faktor%', sqlerrm; end;
  perform public.admin_approve_mfa('00000000-0000-0000-0000-0000000000f2');
end $$;
reset role; select pg_temp.as_user('00000000-0000-0000-0000-0000000000f2','aal2') \gset
set role authenticated;
do $$ begin assert public.has_perm('templates.write'), 'setelah disetujui super admin lain -> boleh'; end $$;
reset role;
set role service_role; select public.admin_mfa_reset_mark('00000000-0000-0000-0000-0000000000f2'); reset role;
set role authenticated;
do $$ begin assert not public.has_perm('templates.write'), 'setelah reset MFA persetujuan dicabut'; end $$;
reset role; delete from auth.mfa_factors where user_id='00000000-0000-0000-0000-0000000000f2'; delete from public.admin_users where user_id='00000000-0000-0000-0000-0000000000f2';
\echo == 7. mematikan kembali (prosedur darurat lewat super admin aal2) & jejak audit
select pg_temp.as_user(:'sa','aal2') \gset
set role authenticated; select public.admin_set_security(false,false) \gset
reset role;
do $$ begin
  assert not public.setting_bool('admin_mfa_required'), 'dimatikan';
  assert (select count(*) from public.security_events where kind='security_settings_changed') >= 3, 'perubahan dicatat';
end $$;
\echo SEMUA UJI MFA DB LULUS
