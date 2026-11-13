-- =====================================================================
-- NusaMora - Customer Support lengkap (additive, idempoten)
-- Jalankan SETELAH admin-schema.sql & customer-features.sql.
-- Status: open, diproses (In Progress), menunggu_pelanggan (Waiting for Customer), selesai (Resolved), ditutup (Closed).
-- Tiket hanya dibuat/dibalas pelanggan lewat RPC; staf lewat RPC admin_ticket_* (izin support.read/support.write).
-- =====================================================================

-- 1. Kolom & status
alter table public.tickets drop constraint if exists tickets_status_check;
alter table public.tickets add constraint tickets_status_check check (status in ('open','diproses','menunggu_pelanggan','selesai','ditutup'));
alter table public.tickets add column if not exists assigned_to uuid references auth.users(id) on delete set null;
alter table public.tickets add column if not exists first_response_at timestamptz;
alter table public.tickets add column if not exists due_at timestamptz;
alter table public.tickets add column if not exists resolved_at timestamptz;
alter table public.tickets add column if not exists closed_at timestamptz;
alter table public.ticket_replies add column if not exists is_internal boolean not null default false;
create index if not exists tickets_assigned_idx on public.tickets (assigned_to, status);
create index if not exists ticket_replies_ticket_idx on public.ticket_replies (ticket_id, created_at);

-- 2. SLA per prioritas (jam). Bisa disesuaikan lewat tabel ini.
create table if not exists public.support_sla (
  priority text primary key check (priority in ('rendah','normal','tinggi')),
  first_response_hours int not null check (first_response_hours > 0),
  resolution_hours int not null check (resolution_hours > 0));
insert into public.support_sla values ('tinggi', 4, 24), ('normal', 24, 72), ('rendah', 48, 120) on conflict (priority) do nothing;
alter table public.support_sla enable row level security;
drop policy if exists "staf baca" on public.support_sla;
create policy "staf baca" on public.support_sla for select using (public.has_perm('support.read'));
revoke all on public.support_sla from anon; revoke insert, update, delete on public.support_sla from authenticated; grant select on public.support_sla to authenticated;

-- 3. Prioritas otomatis & batas respons pertama
create or replace function public.tickets_sla() returns trigger
language plpgsql security definer set search_path = public as $$
declare h int;
begin
  if tg_op = 'INSERT' and new.priority = 'normal' and new.category in ('pembayaran', 'komplain') then new.priority := 'tinggi'; end if;
  if tg_op = 'INSERT' or new.priority is distinct from old.priority then
    select first_response_hours into h from public.support_sla where priority = new.priority;
    new.due_at := new.created_at + make_interval(hours => coalesce(h, 24));
  end if;
  return new;
end $$;
drop trigger if exists tickets_sla_trg on public.tickets;
create trigger tickets_sla_trg before insert or update of priority on public.tickets for each row execute function public.tickets_sla();
update public.tickets t set due_at = t.created_at + make_interval(hours => coalesce((select first_response_hours from public.support_sla s where s.priority = t.priority), 24)) where due_at is null;

-- 4. Lampiran screenshot (bucket privat; pelanggan hanya ke folder miliknya)
create table if not exists public.ticket_attachments (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  reply_id uuid references public.ticket_replies(id) on delete cascade,
  path text not null unique, file_name text not null, mime text not null check (mime in ('image/png','image/jpeg','image/webp')),
  size bigint not null check (size > 0 and size <= 3145728),
  uploaded_by uuid references auth.users(id) on delete set null, created_at timestamptz not null default now());
create index if not exists ticket_attachments_idx on public.ticket_attachments (ticket_id);
alter table public.ticket_attachments enable row level security;
drop policy if exists "staf baca" on public.ticket_attachments;
create policy "staf baca" on public.ticket_attachments for select using (public.has_perm('support.read'));
revoke all on public.ticket_attachments from anon; revoke insert, update, delete on public.ticket_attachments from authenticated; grant select on public.ticket_attachments to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('ticket-files', 'ticket-files', false, 3145728, array['image/png','image/jpeg','image/webp'])
on conflict (id) do update set public = false, file_size_limit = 3145728, allowed_mime_types = array['image/png','image/jpeg','image/webp'];
drop policy if exists "ticket-files tulis" on storage.objects;
create policy "ticket-files tulis" on storage.objects for insert to authenticated
  with check (bucket_id = 'ticket-files' and split_part(name, '/', 1) = auth.uid()::text);
drop policy if exists "ticket-files baca" on storage.objects;
create policy "ticket-files baca" on storage.objects for select to authenticated
  using (bucket_id = 'ticket-files' and (split_part(name, '/', 1) = auth.uid()::text or public.has_perm('support.read')));

-- 5. RPC pelanggan
create or replace function public.support_my_tickets() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare u uuid := auth.uid();
begin
  if u is null then raise exception 'tidak_diizinkan' using errcode = '28000'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object(
      'id', t.id, 'subject', t.subject, 'category', t.category, 'status', t.status, 'message', t.message,
      'created_at', t.created_at, 'updated_at', t.updated_at, 'resolved_at', t.resolved_at,
      'replies', coalesce((select jsonb_agg(jsonb_build_object('id', r.id, 'body', r.body, 'is_staff', r.is_staff, 'created_at', r.created_at,
                             'files', coalesce((select jsonb_agg(jsonb_build_object('id', a.id, 'path', a.path, 'name', a.file_name) order by a.created_at) from public.ticket_attachments a where a.reply_id = r.id), '[]'::jsonb)) order by r.created_at)
                           from public.ticket_replies r where r.ticket_id = t.id and not r.is_internal), '[]'::jsonb),
      'files', coalesce((select jsonb_agg(jsonb_build_object('id', a.id, 'path', a.path, 'name', a.file_name) order by a.created_at) from public.ticket_attachments a where a.ticket_id = t.id and a.reply_id is null), '[]'::jsonb)) order by t.created_at desc)
    from (select * from public.tickets where user_id = u order by created_at desc limit 50) t), '[]'::jsonb);
end $$;

create or replace function public.support_reply_v2(p_ticket uuid, p_body text) returns uuid
language plpgsql security definer set search_path = public as $$
declare u uuid := auth.uid(); b text := btrim(coalesce(p_body, '')); st text; r jsonb; rid uuid;
begin
  if u is null then raise exception 'tidak_diizinkan' using errcode = '28000'; end if;
  if char_length(b) < 1 or char_length(b) > 4000 then raise exception 'pesan_tidak_valid'; end if;
  select status into st from public.tickets where id = p_ticket and user_id = u for update;
  if not found then raise exception 'tidak_ditemukan'; end if;
  if st = 'ditutup' then raise exception 'tiket_ditutup'; end if;
  r := public.rl_hit('support-reply-' || u::text, 20, 3600, 'support_rate_limited');
  if not coalesce((r->>'allowed')::boolean, true) then raise exception 'terlalu_banyak_permintaan'; end if;
  insert into public.ticket_replies (ticket_id, author_id, is_staff, body) values (p_ticket, u, false, b) returning id into rid;
  update public.tickets set updated_at = now(),
         status = case when status = 'selesai' then 'open' when status = 'menunggu_pelanggan' then 'diproses' else status end,
         resolved_at = case when status = 'selesai' then null else resolved_at end
   where id = p_ticket;
  return rid;
end $$;

create or replace function public.support_reply(p_ticket uuid, p_body text) returns void
language plpgsql security definer set search_path = public as $$
begin perform public.support_reply_v2(p_ticket, p_body); end $$;

create or replace function public.support_close(p_ticket uuid) returns void
language plpgsql security definer set search_path = public as $$
declare u uuid := auth.uid();
begin
  if u is null then raise exception 'tidak_diizinkan' using errcode = '28000'; end if;
  update public.tickets set status = 'ditutup', closed_at = now(), updated_at = now() where id = p_ticket and user_id = u and status <> 'ditutup';
  if not found then raise exception 'tidak_ditemukan'; end if;
end $$;

create or replace function public.support_add_attachment(p_ticket uuid, p_reply uuid, p_path text, p_name text, p_mime text, p_size bigint) returns uuid
language plpgsql security definer set search_path = public as $$
declare u uuid := auth.uid(); new_id uuid; n_all int; n_msg int;
begin
  if u is null then raise exception 'tidak_diizinkan' using errcode = '28000'; end if;
  if not exists (select 1 from public.tickets where id = p_ticket and user_id = u and status <> 'ditutup') then raise exception 'tidak_ditemukan'; end if;
  if p_reply is not null and not exists (select 1 from public.ticket_replies where id = p_reply and ticket_id = p_ticket and author_id = u and not is_staff) then raise exception 'tidak_ditemukan'; end if;
  if p_mime not in ('image/png','image/jpeg','image/webp') then raise exception 'lampiran_tidak_valid'; end if;
  if p_size is null or p_size <= 0 or p_size > 3145728 then raise exception 'lampiran_terlalu_besar'; end if;
  if left(coalesce(p_path, ''), char_length(u::text || '/' || p_ticket::text || '/')) <> u::text || '/' || p_ticket::text || '/' or p_path ~ '\.\.' then raise exception 'lampiran_tidak_valid'; end if;
  if not exists (select 1 from storage.objects where bucket_id = 'ticket-files' and name = p_path) then raise exception 'lampiran_tidak_ditemukan'; end if;
  select count(*) into n_all from public.ticket_attachments where ticket_id = p_ticket;
  select count(*) into n_msg from public.ticket_attachments where ticket_id = p_ticket and reply_id is not distinct from p_reply;
  if n_all >= 10 or n_msg >= 3 then raise exception 'lampiran_terlalu_banyak'; end if;
  insert into public.ticket_attachments (ticket_id, reply_id, path, file_name, mime, size, uploaded_by)
  values (p_ticket, p_reply, p_path, left(regexp_replace(coalesce(p_name, 'screenshot'), '[^A-Za-z0-9._ -]', '_', 'g'), 80), p_mime, p_size, u) returning ticket_attachments.id into new_id;
  update public.tickets set updated_at = now() where id = p_ticket;
  return new_id;
end $$;

-- 6. Helper & RPC staf
create or replace function public.ticket_staff(p_user uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admin_users a where a.user_id = p_user and a.active
                 and (a.role = 'super_admin' or exists (select 1 from public.role_permissions r where r.role = a.role and r.permission = 'support.write')))
$$;

create or replace function public.ticket_sla_state(t public.tickets) returns text
language sql stable set search_path = public as $$
  select case
    when t.first_response_at is not null then case when t.first_response_at <= t.due_at then 'terpenuhi' else 'terlambat_dibalas' end
    when t.status in ('selesai', 'ditutup') then 'selesai'
    when now() > t.due_at then 'terlambat'
    else 'berjalan' end
$$;

create or replace function public.admin_list_tickets() returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.has_perm('support.read') then raise exception 'forbidden' using errcode = '42501'; end if;
  return coalesce((select jsonb_agg(to_jsonb(z) order by z.updated_at desc) from (
    select t.id, t.subject, t.category, t.priority, t.status, t.created_at, t.updated_at, t.due_at, t.first_response_at,
           public.ticket_sla_state(t) as sla, t.assigned_to,
           (t.assigned_to = auth.uid()) as mine, (t.assigned_to is null) as unassigned,
           (select coalesce(pa.full_name, ua.email) from auth.users ua left join public.profiles pa on pa.id = ua.id where ua.id = t.assigned_to) as assigned_name,
           pr.full_name as owner_name, u.email as owner_email,
           (select count(*) from public.ticket_replies r where r.ticket_id = t.id and not r.is_internal) as reply_count,
           (select count(*) from public.ticket_attachments a where a.ticket_id = t.id) as file_count
      from public.tickets t left join public.profiles pr on pr.id = t.user_id left join auth.users u on u.id = t.user_id) z), '[]'::jsonb);
end $$;

create or replace function public.admin_support_overview() returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.has_perm('support.read') then raise exception 'forbidden' using errcode = '42501'; end if;
  return jsonb_build_object(
    'open', (select count(*) from public.tickets where status in ('open', 'diproses', 'menunggu_pelanggan')),
    'unassigned', (select count(*) from public.tickets where assigned_to is null and status in ('open', 'diproses', 'menunggu_pelanggan')),
    'overdue', (select count(*) from public.tickets t where public.ticket_sla_state(t) = 'terlambat'),
    'resolved_30d', (select count(*) from public.tickets where resolved_at > now() - interval '30 days'),
    'avg_first_response_hours', (select round((avg(extract(epoch from (first_response_at - created_at))) / 3600)::numeric, 1) from public.tickets where first_response_at is not null and created_at > now() - interval '30 days'));
end $$;

create or replace function public.admin_support_admins() returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.has_perm('support.read') then raise exception 'forbidden' using errcode = '42501'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('id', a.user_id, 'name', coalesce(pr.full_name, u.email), 'role', a.role) order by coalesce(pr.full_name, u.email))
                     from public.admin_users a join auth.users u on u.id = a.user_id left join public.profiles pr on pr.id = a.user_id
                    where a.active and public.ticket_staff(a.user_id)), '[]'::jsonb);
end $$;

create or replace function public.admin_ticket_detail(p_id uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare t public.tickets;
begin
  if not public.has_perm('support.read') then raise exception 'forbidden' using errcode = '42501'; end if;
  select * into t from public.tickets where id = p_id;
  if not found then raise exception 'tiket tidak ditemukan'; end if;
  return jsonb_build_object(
    'ticket', jsonb_build_object('id', t.id, 'subject', t.subject, 'category', t.category, 'priority', t.priority, 'status', t.status, 'message', t.message,
              'created_at', t.created_at, 'updated_at', t.updated_at, 'due_at', t.due_at, 'first_response_at', t.first_response_at, 'resolved_at', t.resolved_at, 'closed_at', t.closed_at,
              'sla', public.ticket_sla_state(t), 'assigned_to', t.assigned_to,
              'assigned_name', (select coalesce(pa.full_name, ua.email) from auth.users ua left join public.profiles pa on pa.id = ua.id where ua.id = t.assigned_to)),
    'customer', (select jsonb_build_object('id', pr.id, 'full_name', pr.full_name, 'email', u.email, 'whatsapp', pr.whatsapp,
                   'ticket_count', (select count(*) from public.tickets x where x.user_id = t.user_id))
                   from public.profiles pr left join auth.users u on u.id = pr.id where pr.id = t.user_id),
    'replies', coalesce((select jsonb_agg(jsonb_build_object('id', r.id, 'body', r.body, 'is_staff', r.is_staff, 'is_internal', r.is_internal, 'created_at', r.created_at,
                   'author', case when r.is_staff then (select coalesce(pa.full_name, ua.email) from auth.users ua left join public.profiles pa on pa.id = ua.id where ua.id = r.author_id) else null end,
                   'files', coalesce((select jsonb_agg(jsonb_build_object('id', a.id, 'path', a.path, 'name', a.file_name, 'size', a.size)) from public.ticket_attachments a where a.reply_id = r.id), '[]'::jsonb)) order by r.created_at)
                   from public.ticket_replies r where r.ticket_id = t.id), '[]'::jsonb),
    'files', coalesce((select jsonb_agg(jsonb_build_object('id', a.id, 'path', a.path, 'name', a.file_name, 'size', a.size)) from public.ticket_attachments a where a.ticket_id = t.id and a.reply_id is null), '[]'::jsonb),
    'history', coalesce((select jsonb_agg(jsonb_build_object('at', a.created_at, 'action', a.action, 'change', a.summary,
                   'by', (select coalesce(pa.full_name, ua.email) from auth.users ua left join public.profiles pa on pa.id = ua.id where ua.id = a.actor_id)) order by a.created_at desc)
                   from public.audit_logs a where a.table_name = 'tickets' and a.row_id = t.id::text), '[]'::jsonb));
end $$;

create or replace function public.admin_ticket_reply(p_id uuid, p_body text, p_internal boolean default false, p_status text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare t public.tickets; b text := btrim(coalesce(p_body, '')); rid uuid; ns text;
begin
  if not public.has_perm('support.write') then raise exception 'forbidden' using errcode = '42501'; end if;
  if char_length(b) < 1 or char_length(b) > 4000 then return jsonb_build_object('error', 'pesan_tidak_valid'); end if;
  if p_status is not null and p_status not in ('open', 'diproses', 'menunggu_pelanggan', 'selesai', 'ditutup') then return jsonb_build_object('error', 'status_tidak_valid'); end if;
  select * into t from public.tickets where id = p_id for update;
  if not found then return jsonb_build_object('error', 'tidak_ditemukan'); end if;
  if t.status = 'ditutup' then return jsonb_build_object('error', 'tiket_ditutup'); end if;
  insert into public.ticket_replies (ticket_id, author_id, is_staff, is_internal, body) values (p_id, auth.uid(), true, coalesce(p_internal, false), b) returning id into rid;
  if coalesce(p_internal, false) then return jsonb_build_object('ok', true, 'id', rid); end if;
  ns := coalesce(p_status, case when t.status in ('open', 'diproses') then 'menunggu_pelanggan' else t.status end);
  update public.tickets set status = ns, updated_at = now(), first_response_at = coalesce(first_response_at, now()),
         assigned_to = coalesce(assigned_to, auth.uid()),
         resolved_at = case when ns = 'selesai' then coalesce(resolved_at, now()) else resolved_at end,
         closed_at = case when ns = 'ditutup' then now() else closed_at end where id = p_id;
  return jsonb_build_object('ok', true, 'id', rid, 'status', ns);
end $$;

create or replace function public.admin_ticket_set_status(p_id uuid, p_status text) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not public.has_perm('support.write') then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_status not in ('open', 'diproses', 'menunggu_pelanggan', 'selesai', 'ditutup') then return jsonb_build_object('error', 'status_tidak_valid'); end if;
  update public.tickets set status = p_status, updated_at = now(),
         resolved_at = case when p_status = 'selesai' then coalesce(resolved_at, now()) when p_status in ('open', 'diproses', 'menunggu_pelanggan') then null else resolved_at end,
         closed_at = case when p_status = 'ditutup' then coalesce(closed_at, now()) else null end where id = p_id;
  if not found then return jsonb_build_object('error', 'tidak_ditemukan'); end if;
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.admin_ticket_set_priority(p_id uuid, p_priority text) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not public.has_perm('support.write') then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_priority not in ('rendah', 'normal', 'tinggi') then return jsonb_build_object('error', 'prioritas_tidak_valid'); end if;
  update public.tickets set priority = p_priority, updated_at = now() where id = p_id;
  if not found then return jsonb_build_object('error', 'tidak_ditemukan'); end if;
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.admin_ticket_assign(p_id uuid, p_admin uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not public.has_perm('support.write') then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_admin is not null and not public.ticket_staff(p_admin) then return jsonb_build_object('error', 'admin_tidak_valid'); end if;
  update public.tickets set assigned_to = p_admin, updated_at = now(), status = case when p_admin is not null and status = 'open' then 'diproses' else status end where id = p_id;
  if not found then return jsonb_build_object('error', 'tidak_ditemukan'); end if;
  return jsonb_build_object('ok', true);
end $$;

-- 7. Hak eksekusi
do $$ declare f text; begin
  foreach f in array array['support_my_tickets()', 'support_reply_v2(uuid,text)', 'support_reply(uuid,text)', 'support_close(uuid)', 'support_add_attachment(uuid,uuid,text,text,text,bigint)',
      'admin_list_tickets()', 'admin_support_overview()', 'admin_support_admins()', 'admin_ticket_detail(uuid)', 'admin_ticket_reply(uuid,text,boolean,text)',
      'admin_ticket_set_status(uuid,text)', 'admin_ticket_set_priority(uuid,text)', 'admin_ticket_assign(uuid,uuid)'] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
  revoke all on function public.ticket_staff(uuid), public.tickets_sla() from public, anon, authenticated;
  grant execute on function public.ticket_sla_state(public.tickets) to authenticated;
end $$;
