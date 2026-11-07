-- NusaMora: fitur dashboard pelanggan (Notifikasi, Bantuan & Dukungan). Idempoten.
-- Jalankan SETELAH admin-schema.sql dan security-schema.sql (butuh tickets, ticket_replies, announcements, rl_hit, subscriptions).
-- Pelanggan TIDAK diberi akses langsung ke tickets/announcements (RLS admin tetap). Semua lewat RPC security definer
-- yang memakai auth.uid(), jadi pelanggan hanya melihat/menulis miliknya sendiri.

create table if not exists public.announcement_reads (
  user_id uuid not null references auth.users(id) on delete cascade,
  announcement_id uuid not null references public.announcements(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (user_id, announcement_id));
alter table public.announcement_reads enable row level security;
drop policy if exists "baca milik sendiri" on public.announcement_reads;
create policy "baca milik sendiri" on public.announcement_reads for select to authenticated using (auth.uid() = user_id);
revoke all on public.announcement_reads from anon, authenticated;
grant select on public.announcement_reads to authenticated;

-- Pengumuman untuk saya: hanya kanal 'system', status 'terkirim', audiens sesuai (semua / pelanggan_aktif bila punya langganan aktif).
create or replace function public.my_notifications() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare u uuid := auth.uid(); act boolean;
begin
  if u is null then raise exception 'tidak_diizinkan' using errcode = '28000'; end if;
  select exists (select 1 from public.subscriptions s where s.user_id = u and s.status = 'aktif' and s.expires_at > now()) into act;
  return coalesce((select jsonb_agg(x order by x.created_at desc) from (
    select a.id, a.title, a.body, a.created_at, (r.user_id is not null) as read
    from public.announcements a
    left join public.announcement_reads r on r.announcement_id = a.id and r.user_id = u
    where a.channel = 'system' and a.status = 'terkirim'
      and (a.audience = 'semua' or (a.audience = 'pelanggan_aktif' and act))
    order by a.created_at desc limit 50) x), '[]'::jsonb);
end $$;

create or replace function public.mark_notifications_read() returns int
language plpgsql security definer set search_path = public as $$
declare u uuid := auth.uid(); n int;
begin
  if u is null then raise exception 'tidak_diizinkan' using errcode = '28000'; end if;
  insert into public.announcement_reads (user_id, announcement_id)
    select u, (e->>'id')::uuid from jsonb_array_elements(public.my_notifications()) e where not (e->>'read')::boolean
  on conflict do nothing;
  get diagnostics n = row_count; return n;
end $$;

-- Bantuan: buat tiket (maks 5 per jam), lihat tiket saya beserta balasan, balas tiket saya.
create or replace function public.support_create_ticket(p_subject text, p_category text, p_message text) returns uuid
language plpgsql security definer set search_path = public as $$
declare u uuid := auth.uid(); id uuid; r jsonb; s text := btrim(coalesce(p_subject, '')); m text := btrim(coalesce(p_message, ''));
begin
  if u is null then raise exception 'tidak_diizinkan' using errcode = '28000'; end if;
  if char_length(s) < 3 or char_length(s) > 120 then raise exception 'subjek_tidak_valid'; end if;
  if char_length(m) < 5 or char_length(m) > 4000 then raise exception 'pesan_tidak_valid'; end if;
  if p_category not in ('bantuan','pembayaran','teknis','komplain','lainnya') then raise exception 'kategori_tidak_valid'; end if;
  r := public.rl_hit('support-' || u::text, 5, 3600, 'support_rate_limited');
  if not coalesce((r->>'allowed')::boolean, true) then raise exception 'terlalu_banyak_permintaan'; end if;
  insert into public.tickets (user_id, subject, category, message) values (u, s, p_category, m) returning tickets.id into id;
  return id;
end $$;

create or replace function public.support_my_tickets() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare u uuid := auth.uid();
begin
  if u is null then raise exception 'tidak_diizinkan' using errcode = '28000'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object(
      'id', t.id, 'subject', t.subject, 'category', t.category, 'status', t.status, 'message', t.message,
      'created_at', t.created_at, 'updated_at', t.updated_at,
      'replies', coalesce((select jsonb_agg(jsonb_build_object('body', r.body, 'is_staff', r.is_staff, 'created_at', r.created_at) order by r.created_at)
                           from public.ticket_replies r where r.ticket_id = t.id), '[]'::jsonb)) order by t.created_at desc)
    from (select * from public.tickets where user_id = u order by created_at desc limit 50) t), '[]'::jsonb);
end $$;

create or replace function public.support_reply(p_ticket uuid, p_body text) returns void
language plpgsql security definer set search_path = public as $$
declare u uuid := auth.uid(); b text := btrim(coalesce(p_body, '')); st text; r jsonb;
begin
  if u is null then raise exception 'tidak_diizinkan' using errcode = '28000'; end if;
  if char_length(b) < 1 or char_length(b) > 4000 then raise exception 'pesan_tidak_valid'; end if;
  select status into st from public.tickets where id = p_ticket and user_id = u;
  if not found then raise exception 'tidak_ditemukan'; end if;
  if st = 'ditutup' then raise exception 'tiket_ditutup'; end if;
  r := public.rl_hit('support-reply-' || u::text, 20, 3600, 'support_rate_limited');
  if not coalesce((r->>'allowed')::boolean, true) then raise exception 'terlalu_banyak_permintaan'; end if;
  insert into public.ticket_replies (ticket_id, author_id, is_staff, body) values (p_ticket, u, false, b);
  update public.tickets set updated_at = now(), status = case when status = 'selesai' then 'open' else status end where id = p_ticket;
end $$;

do $$ declare f text; begin
  foreach f in array array['my_notifications()','mark_notifications_read()','support_create_ticket(text,text,text)','support_my_tickets()','support_reply(uuid,text)'] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;
