-- NusaMora — Keamanan P0.4: MFA wajib untuk admin (ditegakkan di DATABASE) + kebijakan password admin.
-- Jalankan SETELAH security-schema.sql. Idempotent. BACKUP dulu (ops/backup/backup-db.sh).
-- PENTING: file ini menimpa has_perm() dan my_admin(). Jika admin-schema.sql dijalankan ulang, jalankan file ini lagi
-- (urutan: ... asset-schema -> security-schema -> security-mfa). security_status() menunjukkan apakah penegakan aktif.
--
-- Penegakan DEFAULT MATI (aman untuk admin yang sudah ada). Aktifkan hanya setelah semua admin mendaftarkan MFA
-- (lihat docs/security/MFA-ADMIN.md): select public.admin_set_security(true, false);

----------------------------------------------------------------------------- 1. Pengaturan & kolom
create table if not exists public.security_settings (
  key text primary key, value jsonb not null, updated_by uuid, updated_at timestamptz not null default now()
);
alter table public.security_settings enable row level security;
revoke all on public.security_settings from anon, authenticated;
insert into public.security_settings(key, value) values ('admin_mfa_required', 'false'), ('admin_password_policy_required', 'false') on conflict do nothing;
alter table public.admin_users add column if not exists password_policy_at timestamptz;
-- Persetujuan faktor pertama: mencegah penyerang yang memegang password admin baru mendaftarkan faktornya sendiri.
-- Saat MFA wajib, admin hanya berfungsi setelah super admin LAIN (aal2) menyetujui setelah verifikasi identitas di luar sistem.
alter table public.admin_users add column if not exists mfa_approved_at timestamptz;
alter table public.admin_users add column if not exists mfa_approved_by uuid;

create or replace function public.setting_bool(k text) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select (value)::text = 'true' from public.security_settings where key = k), false);
$$;
revoke all on function public.setting_bool(text) from public, anon, authenticated;
grant execute on function public.setting_bool(text) to service_role;

create or replace function public.has_verified_factor(uid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from auth.mfa_factors f where f.user_id = uid and f.status::text = 'verified');
$$;
revoke all on function public.has_verified_factor(uuid) from public, anon, authenticated;
grant execute on function public.has_verified_factor(uuid) to service_role;

-- Syarat tambahan untuk akses admin: sesi aal2 (MFA terverifikasi) dan password lolos kebijakan, bila penegakan aktif.
create or replace function public.mfa_ok(uid uuid, aal text) returns boolean
language sql stable security definer set search_path = public as $$
  select (not public.setting_bool('admin_mfa_required')
          or (coalesce(aal, '') = 'aal2' and exists (select 1 from public.admin_users m where m.user_id = uid and m.mfa_approved_at is not null)))
     and (not public.setting_bool('admin_password_policy_required')
          or exists (select 1 from public.admin_users a where a.user_id = uid and a.password_policy_at is not null));
$$;
revoke all on function public.mfa_ok(uuid, text) from public, anon, authenticated;
grant execute on function public.mfa_ok(uuid, text) to service_role;

----------------------------------------------------------------------------- 2. has_perm (JWT) & has_perm_session (Edge Function)
create or replace function public.has_perm(p text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.admin_users a
    where a.user_id = auth.uid() and a.active
      and (a.role = 'super_admin' or exists (select 1 from public.role_permissions r where r.role = a.role and r.permission = p))
  ) and public.mfa_ok(auth.uid(), coalesce(auth.jwt()->>'aal', ''));
$$;
grant execute on function public.has_perm(text) to anon, authenticated;

-- Dipakai Edge Function: aal dibaca dari JWT yang sudah diverifikasi Supabase Auth (getUser), bukan dari body permintaan.
create or replace function public.has_perm_session(uid uuid, p text, aal text) returns boolean
language sql stable security definer set search_path = public as $$
  select public.has_perm_user(uid, p) and public.mfa_ok(uid, aal);
$$;
revoke all on function public.has_perm_session(uuid, text, text) from public, anon, authenticated;
grant execute on function public.has_perm_session(uuid, text, text) to service_role;

----------------------------------------------------------------------------- 3. my_admin (tambahan kunci "mfa"; kunci lama tetap)
create or replace function public.my_admin() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare a public.admin_users; v_aal text := coalesce(auth.jwt()->>'aal', 'aal1'); v_ok boolean; v_perms jsonb;
begin
  select * into a from public.admin_users where user_id = auth.uid() and active;
  if not found then return 'null'::jsonb; end if;
  v_ok := public.mfa_ok(auth.uid(), v_aal);
  v_perms := case when v_ok then coalesce((select jsonb_agg(r.permission) from public.role_permissions r where r.role = a.role), '[]'::jsonb) else '[]'::jsonb end;
  return jsonb_build_object('role', a.role, 'perms', v_perms, 'mfa', jsonb_build_object(
    'required', public.setting_bool('admin_mfa_required'), 'aal', v_aal, 'enrolled', public.has_verified_factor(auth.uid()),
    'password_required', public.setting_bool('admin_password_policy_required'), 'password_ok', a.password_policy_at is not null,
    'approved', a.mfa_approved_at is not null, 'needed', not v_ok));
end $$;
grant execute on function public.my_admin() to authenticated;

----------------------------------------------------------------------------- 4. Status & pengaktifan (khusus super admin)
create or replace function public.security_status() returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not exists (select 1 from public.admin_users where user_id = auth.uid() and active and role = 'super_admin')
     or not public.mfa_ok(auth.uid(), coalesce(auth.jwt()->>'aal', '')) then raise exception 'forbidden' using errcode = '42501'; end if;
  return jsonb_build_object('mfa_required', public.setting_bool('admin_mfa_required'), 'password_policy_required', public.setting_bool('admin_password_policy_required'),
    'admins', coalesce((select jsonb_agg(jsonb_build_object('email', u.email, 'role', a.role, 'active', a.active,
        'factors', (select count(*) from auth.mfa_factors f where f.user_id = a.user_id and f.status::text = 'verified'),
        'password_ok', a.password_policy_at is not null, 'user_id', a.user_id, 'approved', a.mfa_approved_at is not null) order by a.created_at)
      from public.admin_users a join auth.users u on u.id = a.user_id where a.active), '[]'::jsonb));
end $$;
revoke all on function public.security_status() from public, anon;
grant execute on function public.security_status() to authenticated;

-- Mengaktifkan MFA hanya bila SEMUA admin aktif sudah punya faktor terverifikasi dan pemanggil sendiri sudah aal2 (anti lock-out).
create or replace function public.admin_set_security(p_mfa boolean, p_password boolean) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_missing text; v_aal text := coalesce(auth.jwt()->>'aal', '');
begin
  if not exists (select 1 from public.admin_users where user_id = auth.uid() and active and role = 'super_admin')
     or not public.mfa_ok(auth.uid(), v_aal) then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_mfa and not public.setting_bool('admin_mfa_required') then
    if v_aal <> 'aal2' then raise exception 'prasyarat: verifikasi MFA sesi ini dulu (aal2)' using errcode = 'P0001'; end if;
    select string_agg(u.email, ', ') into v_missing from public.admin_users a join auth.users u on u.id = a.user_id
      where a.active and not public.has_verified_factor(a.user_id);
    if v_missing is not null then raise exception 'prasyarat: admin belum mendaftarkan MFA: %', v_missing using errcode = 'P0001'; end if;
  end if;
  if p_password and not public.setting_bool('admin_password_policy_required') then
    select string_agg(u.email, ', ') into v_missing from public.admin_users a join auth.users u on u.id = a.user_id
      where a.active and a.password_policy_at is null;
    if v_missing is not null then raise exception 'prasyarat: admin belum memperbarui password sesuai kebijakan: %', v_missing using errcode = 'P0001'; end if;
  end if;
  if p_mfa and not public.setting_bool('admin_mfa_required') then   -- admin yang ada sudah diperiksa di atas: setujui sebagai titik awal
    update public.admin_users set mfa_approved_at = now(), mfa_approved_by = auth.uid() where active and mfa_approved_at is null;
  end if;
  insert into public.security_settings(key, value, updated_by) values ('admin_mfa_required', to_jsonb(p_mfa), auth.uid()), ('admin_password_policy_required', to_jsonb(p_password), auth.uid())
    on conflict (key) do update set value = excluded.value, updated_by = excluded.updated_by, updated_at = now();
  insert into public.security_events(kind, actor, detail) values ('security_settings_changed', auth.uid()::text, jsonb_build_object('mfa', p_mfa, 'password_policy', p_password));
  return jsonb_build_object('mfa_required', p_mfa, 'password_policy_required', p_password);
end $$;
revoke all on function public.admin_set_security(boolean, boolean) from public, anon;
grant execute on function public.admin_set_security(boolean, boolean) to authenticated;

create or replace function public.admin_mark_password_ok(uid uuid) returns void
language sql security definer set search_path = public as $$
  update public.admin_users set password_policy_at = now() where user_id = uid and active;
$$;
revoke all on function public.admin_mark_password_ok(uuid) from public, anon, authenticated;
grant execute on function public.admin_mark_password_ok(uuid) to service_role;

-- Ganti password admin harus tetap bisa walau kebijakan password belum terpenuhi (kalau tidak: kebuntuan).
-- Syaratnya hanya: admin aktif, dan sesi aal2 bila MFA wajib.
create or replace function public.is_admin_for_password(uid uuid, aal text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admin_users a where a.user_id = uid and a.active)
     and (not public.setting_bool('admin_mfa_required') or coalesce(aal, '') = 'aal2');
$$;
revoke all on function public.is_admin_for_password(uuid, text) from public, anon, authenticated;
grant execute on function public.is_admin_for_password(uuid, text) to service_role;

-- Persetujuan admin baru / setelah reset MFA. Tidak boleh menyetujui diri sendiri; wajib super admin aal2 yang lolos mfa_ok.
create or replace function public.admin_approve_mfa(p_user uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.admin_users where user_id = auth.uid() and active and role = 'super_admin')
     or not public.mfa_ok(auth.uid(), coalesce(auth.jwt()->>'aal', '')) then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_user = auth.uid() then raise exception 'tidak boleh menyetujui diri sendiri' using errcode = 'P0001'; end if;
  if not public.has_verified_factor(p_user) then raise exception 'admin tersebut belum punya faktor MFA terverifikasi' using errcode = 'P0001'; end if;
  update public.admin_users set mfa_approved_at = now(), mfa_approved_by = auth.uid() where user_id = p_user and active;
  if not found then raise exception 'admin tidak ditemukan' using errcode = 'P0001'; end if;
  insert into public.security_events(kind, actor, detail) values ('admin_mfa_approved', auth.uid()::text, jsonb_build_object('target', p_user));
end $$;
revoke all on function public.admin_approve_mfa(uuid) from public, anon;
grant execute on function public.admin_approve_mfa(uuid) to authenticated;

-- Dipanggil prosedur reset MFA (service_role): cabut persetujuan agar faktor baru harus disetujui ulang.
create or replace function public.admin_mfa_reset_mark(uid uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.admin_users set mfa_approved_at = null, mfa_approved_by = null where user_id = uid;
  insert into public.security_events(kind, actor, detail) values ('admin_mfa_reset', uid::text, '{}'::jsonb);
end $$;
revoke all on function public.admin_mfa_reset_mark(uuid) from public, anon, authenticated;
grant execute on function public.admin_mfa_reset_mark(uuid) to service_role;
