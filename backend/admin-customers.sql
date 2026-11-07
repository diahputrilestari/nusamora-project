-- NusaMora: admin Manajemen Pelanggan & Manajemen Undangan (aditif, aman dijalankan ulang).
-- Jalankan SETELAH admin-schema.sql, invitation-schema.sql, payment-schema.sql, package-schema.sql.
-- 1) Memperbaiki admin_list_customers (kolom ambigu 42702 -> "Data tidak bisa dimuat").
-- 2) Status akun: aktif | nonaktif | suspended (ditampilkan "Diblokir"). Nilai 'suspended' dipertahankan agar kontrak lama tetap berlaku.
-- 3) Detail pelanggan & detail undangan (tiga status terpisah: pembayaran, publikasi, moderasi) + riwayat moderasi.
-- Tidak ada kunci rahasia; semua fungsi memeriksa has_perm().

----------------------------------------------------------------------------- 1. Status akun
do $$ declare c record; begin
  for c in select conname from pg_constraint
           where conrelid = 'public.profiles'::regclass and contype = 'c' and pg_get_constraintdef(oid) ilike '%status%' loop
    execute format('alter table public.profiles drop constraint %I', c.conname);
  end loop;
end $$;
alter table public.profiles add constraint profiles_status_check check (status in ('aktif','nonaktif','suspended'));

-- akun nonaktif / diblokir tidak boleh membuat undangan baru atau memulai pembayaran (service role & admin tidak terpengaruh)
create or replace function public.guard_active_account() returns trigger
language plpgsql security definer set search_path = public as $$
declare st text;
begin
  if auth.uid() is null or auth.uid() <> new.user_id then return new; end if;
  select p.status into st from public.profiles p where p.id = new.user_id;
  if st is not null and st <> 'aktif' then
    raise exception 'akun_tidak_aktif' using errcode = 'P0001', hint = 'Akun Anda sedang ' || case st when 'nonaktif' then 'dinonaktifkan' else 'diblokir' end || '. Hubungi tim NusaMora.';
  end if;
  return new;
end $$;
drop trigger if exists guard_active_inv on public.invitations;
create trigger guard_active_inv before insert on public.invitations for each row execute function public.guard_active_account();
drop trigger if exists guard_active_pay on public.payments;
create trigger guard_active_pay before insert on public.payments for each row execute function public.guard_active_account();

----------------------------------------------------------------------------- 2. Kolom & tabel tambahan undangan
alter table public.invitations add column if not exists archived_at timestamptz;

create table if not exists public.invitation_moderation_log (
  id bigint generated always as identity primary key,
  invitation_id uuid not null references public.invitations(id) on delete cascade,
  actor_id uuid,
  kind text not null check (kind in ('moderasi','publikasi','arsip')),
  from_value text, to_value text, note text,
  created_at timestamptz not null default now());
create index if not exists inv_modlog_idx on public.invitation_moderation_log (invitation_id, created_at desc);
alter table public.invitation_moderation_log enable row level security;
drop policy if exists "admin baca" on public.invitation_moderation_log;
create policy "admin baca" on public.invitation_moderation_log for select using (public.has_perm('invitations.read'));
revoke all on public.invitation_moderation_log from anon, authenticated;
grant select on public.invitation_moderation_log to authenticated;

create or replace function public.log_invitation_change() returns trigger
language plpgsql security definer set search_path = public as $$
declare nt text := nullif(current_setting('nm.note', true), '');
begin
  if new.moderation is distinct from old.moderation then
    insert into public.invitation_moderation_log (invitation_id, actor_id, kind, from_value, to_value, note)
    values (new.id, auth.uid(), 'moderasi', old.moderation, new.moderation, coalesce(nt, new.moderation_note));
  end if;
  if new.status is distinct from old.status then
    insert into public.invitation_moderation_log (invitation_id, actor_id, kind, from_value, to_value, note)
    values (new.id, auth.uid(), 'publikasi', old.status, new.status, nt);
  end if;
  if (new.archived_at is null) is distinct from (old.archived_at is null) then
    insert into public.invitation_moderation_log (invitation_id, actor_id, kind, from_value, to_value, note)
    values (new.id, auth.uid(), 'arsip', case when old.archived_at is null then 'aktif' else 'arsip' end, case when new.archived_at is null then 'aktif' else 'arsip' end, nt);
  end if;
  return new;
end $$;
drop trigger if exists log_invitation_change_trg on public.invitations;
create trigger log_invitation_change_trg after update on public.invitations for each row execute function public.log_invitation_change();

-- status pembayaran turunan dari tabel payments (bukan kolom status undangan). Hanya dipanggil dari fungsi lain.
create or replace function public.inv_pay_status(p_inv uuid) returns text
language sql stable security definer set search_path = public as $$
  select case
    when exists (select 1 from public.payments x where x.invitation_id = p_inv and x.status = 'paid') then 'lunas'
    when exists (select 1 from public.payments x where x.invitation_id = p_inv and x.status = 'pending' and x.expires_at > now()) then 'menunggu'
    when exists (select 1 from public.payments x where x.invitation_id = p_inv and x.status = 'refunded') then 'refund'
    when exists (select 1 from public.payments x where x.invitation_id = p_inv) then 'gagal'
    else 'belum_bayar' end
$$;
revoke all on function public.inv_pay_status(uuid) from public, anon, authenticated;

----------------------------------------------------------------------------- 3. Pelanggan
-- perbaikan: kolom subquery dikualifikasi (x.plan, x.expires_at) agar tidak bentrok dengan kolom hasil fungsi
create or replace function public.admin_list_customers() returns table (
  id uuid, email text, full_name text, whatsapp text, status text, created_at timestamptz, last_sign_in_at timestamptz, plan text, plan_expires timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.has_perm('customers.read') then raise exception 'forbidden' using errcode = '42501'; end if;
  return query
    select p.id, u.email::text, p.full_name, p.whatsapp, p.status, p.created_at, u.last_sign_in_at, s.sp, s.se
    from public.profiles p join auth.users u on u.id = p.id
    left join lateral (select x.plan as sp, x.expires_at as se from public.subscriptions x
                       where x.user_id = p.id and x.status = 'aktif' order by x.expires_at desc limit 1) s on true
    order by p.created_at desc limit 5000;
end $$;

create or replace function public.admin_customer_set_status(p_user uuid, p_status text, p_note text default null) returns void
language plpgsql security definer set search_path = public as $$
declare old_s text;
begin
  if not public.has_perm('customers.write') then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_status not in ('aktif','nonaktif','suspended') then raise exception 'status tidak valid'; end if;
  if p_user = auth.uid() then raise exception 'tidak dapat mengubah status akun sendiri'; end if;
  if exists (select 1 from public.admin_users a where a.user_id = p_user and a.active) then raise exception 'akun admin tidak dapat diubah dari sini'; end if;
  if p_status <> 'aktif' and char_length(coalesce(btrim(p_note), '')) < 3 then raise exception 'alasan wajib diisi'; end if;
  select pr.status into old_s from public.profiles pr where pr.id = p_user;
  if old_s is null then raise exception 'pelanggan tidak ditemukan'; end if;
  if old_s = p_status then return; end if;
  update public.profiles set status = p_status where id = p_user;
  insert into public.audit_logs (actor_id, action, table_name, row_id, summary)
  values (auth.uid(), 'status_pelanggan', 'profiles', p_user::text, jsonb_build_object('status', p_status, 'dari', old_s, 'catatan', nullif(btrim(coalesce(p_note, '')), '')));
end $$;

-- kontrak lama (uid, s) tetap ada; sekarang menerima 'nonaktif' juga
create or replace function public.admin_set_customer_status(uid uuid, s text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if s not in ('aktif','nonaktif','suspended') then raise exception 'status tidak valid'; end if;
  perform public.admin_customer_set_status(uid, s, case when s = 'aktif' then null else 'Diubah dari daftar pelanggan' end);
end $$;

-- mencatat tindakan administratif yang dilakukan di sisi klien (mis. kirim email atur ulang kata sandi)
create or replace function public.admin_customer_log(p_user uuid, p_action text, p_note text default null) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.has_perm('customers.write') then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_action not in ('reset_akses','catatan') then raise exception 'tindakan tidak valid'; end if;
  if not exists (select 1 from public.profiles pr where pr.id = p_user) then raise exception 'pelanggan tidak ditemukan'; end if;
  insert into public.audit_logs (actor_id, action, table_name, row_id, summary)
  values (auth.uid(), p_action, 'profiles', p_user::text, jsonb_build_object('catatan', nullif(btrim(coalesce(p_note, '')), '')));
end $$;

create or replace function public.admin_customer_detail(p_user uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare res jsonb; tx boolean := public.has_perm('transactions.read');
begin
  if not public.has_perm('customers.read') then raise exception 'forbidden' using errcode = '42501'; end if;
  if not exists (select 1 from public.profiles pr where pr.id = p_user) then raise exception 'pelanggan tidak ditemukan'; end if;
  select jsonb_build_object(
    'profile', (select jsonb_build_object('id', pr.id, 'email', u.email, 'full_name', pr.full_name, 'whatsapp', pr.whatsapp, 'status', pr.status,
                  'created_at', pr.created_at, 'last_sign_in_at', u.last_sign_in_at, 'email_confirmed_at', u.email_confirmed_at,
                  'is_admin', exists (select 1 from public.admin_users a where a.user_id = pr.id and a.active))
                from public.profiles pr join auth.users u on u.id = pr.id where pr.id = p_user),
    'plan', (select to_jsonb(z) from (select x.plan, x.started_at, x.expires_at, (x.expires_at < now()) as expired
                from public.subscriptions x where x.user_id = p_user and x.status = 'aktif' order by x.expires_at desc limit 1) z),
    'subscriptions', coalesce((select jsonb_agg(to_jsonb(z) order by z.started_at desc) from (
                select x.plan, x.status, x.started_at, x.expires_at from public.subscriptions x where x.user_id = p_user order by x.started_at desc limit 20) z), '[]'::jsonb),
    'invitations', coalesce((select jsonb_agg(to_jsonb(z) order by z.created_at desc) from (
                select i.id, i.title, i.slug, i.package_type, i.status, i.moderation, i.archived_at, i.expires_at, i.created_at, i.updated_at,
                       public.inv_pay_status(i.id) as pay_status
                from public.invitations i where i.user_id = p_user order by i.created_at desc limit 100) z), '[]'::jsonb),
    'tx_visible', tx,
    'invoices', case when tx then coalesce((select jsonb_agg(to_jsonb(z) order by z.created_at desc) from (
                select v.id, v.number, v.description, v.amount, v.status, v.created_at, v.paid_at, pm.order_id, pm.payment_type, pm.status as payment_status, pm.invitation_id
                from public.invoices v left join public.payments pm on pm.invoice_id = v.id
                where v.user_id = p_user order by v.created_at desc limit 100) z), '[]'::jsonb) else '[]'::jsonb end,
    'paid_total', case when tx then coalesce((select sum(v.amount) from public.invoices v where v.user_id = p_user and v.status = 'lunas'), 0) else null end,
    'activity', coalesce((select jsonb_agg(to_jsonb(a) order by a.t desc) from (
                select * from (
                  select pr.created_at as t, 'daftar' as k, 'Mendaftar akun' as txt, null::uuid as actor from public.profiles pr where pr.id = p_user
                  union all select u.last_sign_in_at, 'masuk', 'Terakhir masuk', null from auth.users u where u.id = p_user and u.last_sign_in_at is not null
                  union all select x.started_at, 'langganan', 'Langganan ' || x.plan || ' (s/d ' || to_char(x.expires_at at time zone 'Asia/Jakarta', 'DD Mon YYYY') || ')', null from public.subscriptions x where x.user_id = p_user
                  union all select i.created_at, 'undangan', 'Membuat undangan: ' || i.title, null from public.invitations i where i.user_id = p_user
                  union all select l.created_at, 'moderasi', 'Undangan "' || i.title || '": ' || l.kind || ' ' || coalesce(l.from_value, '-') || ' -> ' || coalesce(l.to_value, '-') || coalesce(' (' || l.note || ')', ''), l.actor_id
                       from public.invitation_moderation_log l join public.invitations i on i.id = l.invitation_id where i.user_id = p_user
                  union all select v.created_at, 'invoice', 'Invoice ' || v.number || ' ' || v.status, null from public.invoices v where tx and v.user_id = p_user
                  union all select v.paid_at, 'bayar', 'Pembayaran ' || v.number || ' lunas', null from public.invoices v where tx and v.user_id = p_user and v.paid_at is not null
                  union all select tk.created_at, 'tiket', 'Tiket bantuan: ' || tk.subject, null from public.tickets tk where tk.user_id = p_user
                  union all select al.created_at, 'admin',
                       case al.action when 'status_pelanggan' then 'Status akun diubah menjadi ' || coalesce(al.summary->>'status', '-') || coalesce(' (' || (al.summary->>'catatan') || ')', '')
                                      when 'reset_akses' then 'Email atur ulang kata sandi dikirim'
                                      else 'Catatan admin' || coalesce(': ' || (al.summary->>'catatan'), '') end, al.actor_id
                       from public.audit_logs al where al.table_name = 'profiles' and al.row_id = p_user::text
                ) u2 where u2.t is not null order by u2.t desc limit 120) a), '[]'::jsonb),
    'actors', coalesce((select jsonb_object_agg(q.id::text, q.full_name) from public.profiles q where q.id in (
                select al.actor_id from public.audit_logs al where al.table_name = 'profiles' and al.row_id = p_user::text and al.actor_id is not null
                union select l.actor_id from public.invitation_moderation_log l join public.invitations i on i.id = l.invitation_id where i.user_id = p_user and l.actor_id is not null)), '{}'::jsonb)
  ) into res;
  return res;
end $$;

----------------------------------------------------------------------------- 4. Undangan
create or replace function public.admin_list_invitations() returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.has_perm('invitations.read') then raise exception 'forbidden' using errcode = '42501'; end if;
  return coalesce((select jsonb_agg(to_jsonb(z) order by z.created_at desc) from (
    select i.id, i.title, i.slug, i.template_id, i.package_type, i.status, i.moderation, i.archived_at, i.expires_at, i.created_at, i.updated_at,
           i.public_url, i.guest_count, i.user_id, pr.full_name as owner_name, u.email::text as owner_email,
           public.inv_pay_status(i.id) as pay_status,
           case when i.archived_at is not null then 'arsip' else i.status end as pub_status
    from public.invitations i left join public.profiles pr on pr.id = i.user_id left join auth.users u on u.id = i.user_id
    order by i.created_at desc limit 5000) z), '[]'::jsonb);
end $$;

create or replace function public.admin_invitation_detail(p_id uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare res jsonb; tx boolean := public.has_perm('transactions.read');
begin
  if not public.has_perm('invitations.read') then raise exception 'forbidden' using errcode = '42501'; end if;
  if not exists (select 1 from public.invitations i where i.id = p_id) then raise exception 'undangan tidak ditemukan'; end if;
  select jsonb_build_object(
    'invitation', (select to_jsonb(z) from (
        select i.id, i.title, i.slug, i.category, i.event_type, i.template_id, i.package_type, i.experience, i.event_date, i.status, i.moderation, i.moderation_note,
               i.archived_at, i.public_url, i.expires_at, i.published_at, i.created_at, i.updated_at, i.guest_count, i.wish_count, i.user_id,
               public.inv_pay_status(i.id) as pay_status,
               case when i.archived_at is not null then 'arsip' else i.status end as pub_status,
               (select t.name from public.templates t where t.slug = i.template_id limit 1) as template_name,
               (select pl.name from public.plans pl where pl.id = coalesce(i.plan_id, i.package_type) limit 1) as plan_name
        from public.invitations i where i.id = p_id) z),
    'owner', (select jsonb_build_object('id', pr.id, 'full_name', pr.full_name, 'email', u.email, 'whatsapp', pr.whatsapp, 'status', pr.status)
              from public.invitations i join public.profiles pr on pr.id = i.user_id join auth.users u on u.id = i.user_id where i.id = p_id),
    'tx_visible', tx,
    'payments', case when tx then coalesce((select jsonb_agg(to_jsonb(z) order by z.created_at desc) from (
        select pm.order_id, pm.amount, pm.status, pm.payment_type, pm.created_at, pm.paid_at, pm.expires_at
        from public.payments pm where pm.invitation_id = p_id order by pm.created_at desc limit 20) z), '[]'::jsonb) else '[]'::jsonb end,
    'log', coalesce((select jsonb_agg(to_jsonb(z) order by z.created_at desc) from (
        select l.kind, l.from_value, l.to_value, l.note, l.created_at, l.actor_id, a.full_name as actor_name
        from public.invitation_moderation_log l left join public.profiles a on a.id = l.actor_id
        where l.invitation_id = p_id order by l.created_at desc limit 100) z), '[]'::jsonb)
  ) into res;
  return res;
end $$;

-- tindakan terkontrol: suspend | reactivate | archive | unarchive | flag | clear. Setiap perubahan tercatat oleh trigger (riwayat).
create or replace function public.admin_invitation_action(p_id uuid, p_action text, p_note text default null) returns void
language plpgsql security definer set search_path = public as $$
declare i public.invitations; nt text := nullif(btrim(coalesce(p_note, '')), '');
begin
  if not public.has_perm('invitations.write') then raise exception 'forbidden' using errcode = '42501'; end if;
  select * into i from public.invitations x where x.id = p_id for update;
  if not found then raise exception 'undangan tidak ditemukan'; end if;
  if p_action in ('suspend','flag') and char_length(coalesce(nt, '')) < 3 then raise exception 'alasan wajib diisi'; end if;
  perform set_config('nm.note', coalesce(nt, ''), true);
  if p_action = 'suspend' then
    update public.invitations set moderation = 'takedown', moderation_note = nt, status = case when status = 'aktif' then 'nonaktif' else status end, updated_at = now() where id = p_id;
  elsif p_action = 'flag' then
    update public.invitations set moderation = 'flagged', moderation_note = nt, updated_at = now() where id = p_id;
  elsif p_action = 'clear' then
    update public.invitations set moderation = 'ok', moderation_note = nt, updated_at = now() where id = p_id;
  elsif p_action = 'reactivate' then
    if i.archived_at is not null then raise exception 'masih_diarsipkan'; end if;
    if public.inv_pay_status(p_id) <> 'lunas' then raise exception 'belum_lunas'; end if;
    if i.expires_at is not null and i.expires_at <= now() then raise exception 'sudah_kedaluwarsa'; end if;
    update public.invitations set moderation = 'ok', moderation_note = nt, status = 'aktif', updated_at = now() where id = p_id;
  elsif p_action = 'archive' then
    update public.invitations set archived_at = now(), status = case when status = 'aktif' then 'nonaktif' else status end, updated_at = now() where id = p_id;
  elsif p_action = 'unarchive' then
    update public.invitations set archived_at = null, updated_at = now() where id = p_id;
  else raise exception 'tindakan tidak valid';
  end if;
  perform set_config('nm.note', '', true);
end $$;

----------------------------------------------------------------------------- 5. Hak akses
revoke execute on function public.admin_customer_set_status(uuid,text,text), public.admin_customer_log(uuid,text,text), public.admin_customer_detail(uuid),
  public.admin_list_invitations(), public.admin_invitation_detail(uuid), public.admin_invitation_action(uuid,text,text),
  public.admin_list_customers(), public.admin_set_customer_status(uuid,text) from public, anon;
grant execute on function public.admin_customer_set_status(uuid,text,text), public.admin_customer_log(uuid,text,text), public.admin_customer_detail(uuid),
  public.admin_list_invitations(), public.admin_invitation_detail(uuid), public.admin_invitation_action(uuid,text,text),
  public.admin_list_customers(), public.admin_set_customer_status(uuid,text) to authenticated;
