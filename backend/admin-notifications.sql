-- NusaMora Admin: Notifikasi (menu L). ADITIF dan aman diulang. Tidak mengubah kontrak API yang ada.
-- Prasyarat: admin-schema.sql, customer-features.sql, payment-schema.sql, support-tickets.sql.
-- Prinsip:
--  * Pesan masuk antrean (notif_outbox). Pengirim (Edge Function notify-dispatch) mengambil antrean, memanggil provider, lalu mencatat hasil.
--  * Kunci provider TIDAK disimpan di database/repo: ada di Secrets Edge Function (RESEND_API_KEY, WA_TOKEN, ...).
--  * Status "terkirim" HANYA dipasang dari callback provider (notif_delivery). Panggilan API yang diterima provider = "diterima provider" (sent).
--  * Pemicu event tidak boleh menggagalkan pembayaran/tiket: semua dibungkus exception handler.
--  * Aturan event bawaan dibuat NONAKTIF; admin yang mengaktifkannya.

----------------------------------------------------------------------------- 1. Tabel
create table if not exists public.notif_settings (key text primary key, value jsonb not null default 'null'::jsonb, updated_at timestamptz not null default now());
insert into public.notif_settings (key, value) values
  ('email_from_name', '"NusaMora"'), ('email_from_address', '""'), ('email_reply_to', '""'),
  ('max_attempts', '3'), ('retry_base_minutes', '5'),
  ('internal_emails', '[]'), ('internal_whatsapp', '[]'),
  ('paused', 'false'), ('last_dispatch_at', 'null')
on conflict (key) do nothing;

create table if not exists public.notif_templates (
  id uuid primary key default gen_random_uuid(),
  key text not null, channel text not null check (channel in ('email','whatsapp')), lang text not null default 'id' check (lang in ('id','en')),
  name text not null check (char_length(name) between 2 and 100),
  subject text check (subject is null or char_length(subject) <= 150),
  body text not null check (char_length(body) between 1 and 4000),
  active boolean not null default true,
  updated_by uuid references auth.users(id) on delete set null, updated_at timestamptz not null default now(),
  unique (key, channel, lang));

create table if not exists public.notif_rules (
  event text not null, channel text not null check (channel in ('email','whatsapp')), recipient text not null check (recipient in ('customer','internal')),
  template_key text not null, enabled boolean not null default false, updated_at timestamptz not null default now(),
  primary key (event, channel, recipient));

create table if not exists public.notif_outbox (
  id uuid primary key default gen_random_uuid(),
  event text not null, channel text not null check (channel in ('email','whatsapp')),
  recipient_kind text not null default 'customer' check (recipient_kind in ('customer','internal')),
  user_id uuid references auth.users(id) on delete set null,
  to_address text, subject text, body text not null,
  announcement_id uuid references public.announcements(id) on delete set null,
  status text not null default 'pending' check (status in ('pending','sending','sent','delivered','failed','skipped','cancelled')),
  attempts int not null default 0, max_attempts int not null default 3,
  next_attempt_at timestamptz not null default now(),
  provider text, provider_message_id text, last_error text,
  dedupe_key text unique,
  created_at timestamptz not null default now(), sent_at timestamptz, delivered_at timestamptz, updated_at timestamptz not null default now());
create index if not exists notif_outbox_due_idx on public.notif_outbox (next_attempt_at) where status = 'pending';
create index if not exists notif_outbox_time_idx on public.notif_outbox (created_at desc);
create index if not exists notif_outbox_ann_idx on public.notif_outbox (announcement_id) where announcement_id is not null;
create index if not exists notif_outbox_pmid_idx on public.notif_outbox (provider_message_id) where provider_message_id is not null;

create table if not exists public.notif_attempts (
  id bigint generated always as identity primary key,
  outbox_id uuid not null references public.notif_outbox(id) on delete cascade,
  at timestamptz not null default now(), ok boolean not null, http_status int, error text);
create index if not exists notif_attempts_ob_idx on public.notif_attempts (outbox_id, at);

-- pengumuman: tambah status yang dihitung sistem
alter table public.announcements drop constraint if exists announcements_status_check;
alter table public.announcements add constraint announcements_status_check check (status in ('draft','terjadwal','mengirim','terkirim','gagal'));

----------------------------------------------------------------------------- 2. RLS (baca saja untuk admin; tulis lewat RPC)
alter table public.notif_settings enable row level security; alter table public.notif_templates enable row level security;
alter table public.notif_rules enable row level security; alter table public.notif_outbox enable row level security; alter table public.notif_attempts enable row level security;
do $$ declare t text; begin
  foreach t in array array['notif_settings','notif_templates','notif_rules','notif_outbox','notif_attempts'] loop
    execute format('drop policy if exists "admin baca" on public.%I', t);
    execute format('create policy "admin baca" on public.%I for select using (public.has_perm(%L))', t, 'notifications.read');
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant select on public.%I to authenticated', t);
  end loop; end $$;

----------------------------------------------------------------------------- 3. Pengaman status pengumuman: hanya sistem yang boleh memasang mengirim/terkirim/gagal
create or replace function public.announcement_status_guard() returns trigger
language plpgsql set search_path = public as $$
begin
  -- berlaku untuk peran API (admin lewat PostgREST); service_role/migrasi/SQL Editor tidak dibatasi
  if current_user in ('authenticated','anon') and new.status in ('mengirim','terkirim','gagal') and coalesce(current_setting('nm.notif', true), '') <> '1'
     and (tg_op = 'INSERT' or old.status is distinct from new.status) then
    raise exception 'status_diatur_sistem' using errcode = '42501', hint = 'Status Terkirim/Mengirim/Gagal dipasang otomatis oleh sistem pengiriman.';
  end if;
  return new;
end $$;
drop trigger if exists announcements_status_guard on public.announcements;
create trigger announcements_status_guard before insert or update on public.announcements for each row execute function public.announcement_status_guard();

----------------------------------------------------------------------------- 4. Template & aturan bawaan (aturan NONAKTIF)
insert into public.notif_templates (key, channel, name, subject, body) values
 ('welcome','email','Selamat datang (email)','Selamat datang di NusaMora, {{nama}}','Halo {{nama}},\n\nTerima kasih sudah bergabung di NusaMora. Mulai buat undangan digital Anda dari dashboard.\n\nSalam,\nTim NusaMora'),
 ('welcome','whatsapp','Selamat datang (WhatsApp)',null,'Halo {{nama}}, selamat datang di NusaMora! Mulai buat undangan digital Anda dari dashboard.'),
 ('payment_paid','email','Pembayaran berhasil (email)','Pembayaran {{order_id}} berhasil','Halo {{nama}},\n\nPembayaran paket {{paket}} sebesar {{jumlah}} untuk undangan "{{judul}}" sudah kami terima (order {{order_id}}).\n\nSalam,\nTim NusaMora'),
 ('payment_paid','whatsapp','Pembayaran berhasil (WhatsApp)',null,'Halo {{nama}}, pembayaran {{jumlah}} untuk undangan "{{judul}}" (order {{order_id}}) sudah kami terima. Terima kasih!'),
 ('payment_failed','email','Pembayaran gagal/kedaluwarsa (email)','Pembayaran {{order_id}} belum berhasil','Halo {{nama}},\n\nPembayaran {{jumlah}} untuk undangan "{{judul}}" (order {{order_id}}) belum berhasil. Silakan coba lagi dari dashboard.\n\nSalam,\nTim NusaMora'),
 ('invitation_active','email','Undangan aktif (email)','Undangan "{{judul}}" sudah aktif','Halo {{nama}},\n\nUndangan "{{judul}}" sudah aktif dan siap dibagikan.\n{{link}}\n\nSalam,\nTim NusaMora'),
 ('invitation_active','whatsapp','Undangan aktif (WhatsApp)',null,'Halo {{nama}}, undangan "{{judul}}" sudah aktif: {{link}}'),
 ('ticket_reply','email','Balasan tiket (email)','Balasan untuk tiket "{{subjek}}"','Halo {{nama}},\n\nTim kami membalas tiket "{{subjek}}":\n\n{{balasan}}\n\nBalas langsung dari menu Bantuan di dashboard.\n\nSalam,\nTim NusaMora'),
 ('subscription_expiring','email','Langganan akan berakhir (email)','Langganan {{paket}} berakhir {{tanggal}}','Halo {{nama}},\n\nLangganan paket {{paket}} Anda akan berakhir pada {{tanggal}}. Perpanjang dari dashboard agar undangan tetap aktif.\n\nSalam,\nTim NusaMora'),
 ('subscription_expiring','whatsapp','Langganan akan berakhir (WhatsApp)',null,'Halo {{nama}}, langganan {{paket}} Anda berakhir {{tanggal}}. Perpanjang dari dashboard agar undangan tetap aktif.'),
 ('internal_payment_paid','email','Internal: pembayaran masuk','[NusaMora] Pembayaran masuk {{jumlah}}','Pembayaran masuk.\nPelanggan: {{nama}}\nPaket: {{paket}}\nJumlah: {{jumlah}}\nOrder: {{order_id}}'),
 ('internal_payment_paid','whatsapp','Internal: pembayaran masuk (WA)',null,'Pembayaran masuk {{jumlah}} dari {{nama}} (paket {{paket}}, order {{order_id}}).'),
 ('internal_ticket_new','email','Internal: tiket baru','[NusaMora] Tiket baru: {{subjek}}','Tiket baru dari {{nama}}\nKategori: {{kategori}}\nSubjek: {{subjek}}'),
 ('internal_ticket_new','whatsapp','Internal: tiket baru (WA)',null,'Tiket baru dari {{nama}} ({{kategori}}): {{subjek}}')
on conflict (key, channel, lang) do nothing;

insert into public.notif_rules (event, channel, recipient, template_key) values
 ('welcome','email','customer','welcome'), ('welcome','whatsapp','customer','welcome'),
 ('payment_paid','email','customer','payment_paid'), ('payment_paid','whatsapp','customer','payment_paid'),
 ('payment_paid','email','internal','internal_payment_paid'), ('payment_paid','whatsapp','internal','internal_payment_paid'),
 ('payment_failed','email','customer','payment_failed'),
 ('invitation_active','email','customer','invitation_active'), ('invitation_active','whatsapp','customer','invitation_active'),
 ('ticket_reply','email','customer','ticket_reply'),
 ('ticket_new','email','internal','internal_ticket_new'), ('ticket_new','whatsapp','internal','internal_ticket_new'),
 ('subscription_expiring','email','customer','subscription_expiring'), ('subscription_expiring','whatsapp','customer','subscription_expiring')
on conflict (event, channel, recipient) do nothing;

----------------------------------------------------------------------------- 5. Helper
create or replace function public.notif_render(p_text text, p_vars jsonb) returns text
language plpgsql immutable as $$
declare r text := coalesce(p_text, ''); kv record;
begin
  for kv in select key, value from jsonb_each_text(coalesce(p_vars, '{}'::jsonb)) loop
    r := replace(r, '{{' || kv.key || '}}', coalesce(kv.value, ''));
  end loop;
  return btrim(regexp_replace(r, '\{\{[a-zA-Z_]+\}\}', '', 'g'));
end $$;

create or replace function public.notif_setting(p_key text) returns jsonb
language sql stable security definer set search_path = public as $$ select value from public.notif_settings where key = p_key $$;
revoke all on function public.notif_setting(text) from public, anon, authenticated;
grant execute on function public.notif_setting(text) to service_role;

create or replace function public.notif_phone(p text) returns text
language sql immutable as $$
  select case when p is null or btrim(p) = '' then null
    when regexp_replace(p, '[^0-9]', '', 'g') ~ '^0' then '62' || substr(regexp_replace(p, '[^0-9]', '', 'g'), 2)
    else regexp_replace(p, '[^0-9]', '', 'g') end $$;

-- Satu pintu pembuat pesan dari sebuah event. Aman dipanggil berulang: dedupe_key mencegah dobel.
create or replace function public.notif_emit(p_event text, p_user uuid, p_vars jsonb, p_dedupe text default null) returns int
language plpgsql security definer set search_path = public as $$
declare r record; tpl public.notif_templates; addrs text[]; a text; n int := 0; v_max int; v_nm text; v_email text; v_wa text; v_vars jsonb := coalesce(p_vars, '{}'::jsonb); k text; v_sub text; v_body text; v_st text; v_err text; v_ins int;
begin
  v_max := coalesce((select (value)::text::int from public.notif_settings where key = 'max_attempts'), 3);
  if p_user is not null then
    select u.email::text, pr.full_name, pr.whatsapp into v_email, v_nm, v_wa from auth.users u left join public.profiles pr on pr.id = u.id where u.id = p_user;
    if not (v_vars ? 'nama') then v_vars := v_vars || jsonb_build_object('nama', coalesce(v_nm, 'Pelanggan')); end if;
  end if;
  for r in select * from public.notif_rules where event = p_event and enabled loop
    select * into tpl from public.notif_templates where key = r.template_key and channel = r.channel and lang = 'id' and active;
    if not found then continue; end if;
    v_sub := public.notif_render(tpl.subject, v_vars); v_body := public.notif_render(tpl.body, v_vars);
    if r.recipient = 'customer' then
      if p_user is null then continue; end if;
      addrs := array[case r.channel when 'email' then v_email else public.notif_phone(v_wa) end];
    else
      addrs := coalesce(array(select jsonb_array_elements_text(value) from public.notif_settings where key = case r.channel when 'email' then 'internal_emails' else 'internal_whatsapp' end), '{}');
      if r.channel = 'whatsapp' then addrs := coalesce(array(select public.notif_phone(x) from unnest(addrs) x), '{}'); end if;
    end if;
    foreach a in array addrs loop
      v_st := 'pending'; v_err := null;
      if a is null or a = '' then v_st := 'skipped'; v_err := case r.channel when 'email' then 'Penerima belum punya email' else 'Penerima belum punya nomor WhatsApp' end; end if;
      insert into public.notif_outbox (event, channel, recipient_kind, user_id, to_address, subject, body, status, max_attempts, last_error, dedupe_key)
        values (p_event, r.channel, r.recipient, case when r.recipient = 'customer' then p_user end, nullif(a, ''), nullif(v_sub, ''), v_body, v_st, v_max, v_err,
                coalesce(p_dedupe, gen_random_uuid()::text) || ':' || r.channel || ':' || r.recipient || ':' || coalesce(a, '-'))
        on conflict (dedupe_key) do nothing;
      get diagnostics v_ins = row_count; n := n + v_ins;
    end loop;
  end loop;
  return n;
end $$;
revoke all on function public.notif_emit(text, uuid, jsonb, text) from public, anon, authenticated;
grant execute on function public.notif_emit(text, uuid, jsonb, text) to service_role;

----------------------------------------------------------------------------- 6. Pemicu event
create or replace function public.notif_trg_payment() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_title text; v_vars jsonb;
begin
  if new.status is distinct from old.status and new.status in ('paid','failed','expired') then
    select title into v_title from public.invitations where id = new.invitation_id;
    v_vars := jsonb_build_object('order_id', new.order_id, 'paket', new.plan_id, 'judul', coalesce(v_title, '-'), 'jumlah', 'Rp ' || replace(to_char(new.amount, 'FM999G999G999G999'), ',', '.'));
    perform public.notif_emit(case when new.status = 'paid' then 'payment_paid' else 'payment_failed' end, new.user_id, v_vars, 'pay:' || new.id || ':' || new.status);
  end if;
  return new;
exception when others then raise warning 'notif_trg_payment: %', sqlerrm; return new;
end $$;
drop trigger if exists notif_payment_trg on public.payments;
create trigger notif_payment_trg after update of status on public.payments for each row execute function public.notif_trg_payment();

create or replace function public.notif_trg_invitation() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'aktif' and old.status is distinct from 'aktif' then
    perform public.notif_emit('invitation_active', new.user_id, jsonb_build_object('judul', new.title, 'link', coalesce(new.public_url, '')), 'inv:' || new.id);
  end if;
  return new;
exception when others then raise warning 'notif_trg_invitation: %', sqlerrm; return new;
end $$;
drop trigger if exists notif_invitation_trg on public.invitations;
create trigger notif_invitation_trg after update of status on public.invitations for each row execute function public.notif_trg_invitation();

create or replace function public.notif_trg_reply() returns trigger
language plpgsql security definer set search_path = public as $$
declare t public.tickets;
begin
  if new.is_staff then
    select * into t from public.tickets where id = new.ticket_id;
    if t.user_id is not null then
      perform public.notif_emit('ticket_reply', t.user_id, jsonb_build_object('subjek', t.subject, 'balasan', left(new.body, 500)), 'reply:' || new.id);
    end if;
  end if;
  return new;
exception when others then raise warning 'notif_trg_reply: %', sqlerrm; return new;
end $$;
drop trigger if exists notif_reply_trg on public.ticket_replies;
create trigger notif_reply_trg after insert on public.ticket_replies for each row execute function public.notif_trg_reply();

create or replace function public.notif_trg_ticket() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_nm text;
begin
  select full_name into v_nm from public.profiles where id = new.user_id;
  perform public.notif_emit('ticket_new', null, jsonb_build_object('nama', coalesce(v_nm, 'Pelanggan'), 'subjek', new.subject, 'kategori', new.category), 'ticket:' || new.id);
  return new;
exception when others then raise warning 'notif_trg_ticket: %', sqlerrm; return new;
end $$;
drop trigger if exists notif_ticket_trg on public.tickets;
create trigger notif_ticket_trg after insert on public.tickets for each row execute function public.notif_trg_ticket();

create or replace function public.notif_trg_profile() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform public.notif_emit('welcome', new.id, jsonb_build_object('nama', new.full_name), 'welcome:' || new.id);
  return new;
exception when others then raise warning 'notif_trg_profile: %', sqlerrm; return new;
end $$;
drop trigger if exists notif_profile_trg on public.profiles;
create trigger notif_profile_trg after insert on public.profiles for each row execute function public.notif_trg_profile();

----------------------------------------------------------------------------- 7. Pengumuman -> antrean
create or replace function public.notif_announce(p_id uuid) returns int
language plpgsql security definer set search_path = public as $$
declare a public.announcements; n int := 0; v_max int; r record;
begin
  perform set_config('nm.notif', '1', true);
  select * into a from public.announcements where id = p_id for update;
  if not found then raise exception 'tidak_ditemukan'; end if;
  if a.status not in ('draft','terjadwal') then raise exception 'sudah_diproses'; end if;
  if a.channel = 'system' then update public.announcements set status = 'terkirim' where id = p_id; return 0; end if;
  v_max := coalesce((select (value)::text::int from public.notif_settings where key = 'max_attempts'), 3);
  for r in
    select p.id as uid, p.full_name, u.email::text as email, p.whatsapp from public.profiles p join auth.users u on u.id = p.id
     where (a.audience = 'semua')
        or (a.audience = 'pelanggan_aktif' and exists (select 1 from public.subscriptions s where s.user_id = p.id and s.status = 'aktif' and s.expires_at > now()))
        or (a.audience = 'affiliate' and exists (select 1 from public.affiliates f where f.user_id = p.id and f.status = 'aktif'))
        or (a.audience = 'admin' and exists (select 1 from public.admin_users m where m.user_id = p.id and m.active))
  loop
    insert into public.notif_outbox (event, channel, recipient_kind, user_id, to_address, subject, body, announcement_id, status, max_attempts, last_error, dedupe_key)
      values ('announcement', a.channel, 'customer', r.uid,
              case a.channel when 'email' then r.email else public.notif_phone(r.whatsapp) end,
              case a.channel when 'email' then a.title end,
              public.notif_render(a.body, jsonb_build_object('nama', r.full_name)), a.id,
              case when (case a.channel when 'email' then r.email else public.notif_phone(r.whatsapp) end) is null then 'skipped' else 'pending' end,
              v_max, case when (case a.channel when 'email' then r.email else public.notif_phone(r.whatsapp) end) is null then 'Penerima belum punya ' || case a.channel when 'email' then 'email' else 'nomor WhatsApp' end end,
              'ann:' || a.id || ':' || a.channel || ':' || r.uid)
      on conflict (dedupe_key) do nothing;
    n := n + 1;
  end loop;
  update public.announcements set status = case when n = 0 then 'gagal' else 'mengirim' end where id = p_id;
  perform public.notif_refresh_announcements(p_id);
  return n;
end $$;
revoke all on function public.notif_announce(uuid) from public, anon, authenticated;
grant execute on function public.notif_announce(uuid) to service_role;

-- terkirim = minimal satu penerima dikonfirmasi provider (delivered), dan tidak ada lagi yang menunggu/dikirim.
create or replace function public.notif_refresh_announcements(p_id uuid default null) returns void
language plpgsql security definer set search_path = public as $$
declare a record; c record;
begin
  perform set_config('nm.notif', '1', true);
  for a in select id from public.announcements where status = 'mengirim' and (p_id is null or id = p_id) loop
    select count(*) filter (where status in ('pending','sending')) as open_n, count(*) filter (where status = 'delivered') as dlv,
           count(*) filter (where status = 'sent') as snt, count(*) filter (where status in ('failed','skipped','cancelled')) as bad
      into c from public.notif_outbox where announcement_id = a.id;
    if c.open_n = 0 and c.dlv > 0 then update public.announcements set status = 'terkirim' where id = a.id;
    elsif c.open_n = 0 and c.snt = 0 and c.dlv = 0 then update public.announcements set status = 'gagal' where id = a.id;
    end if;
  end loop;
end $$;
revoke all on function public.notif_refresh_announcements(uuid) from public, anon, authenticated;
grant execute on function public.notif_refresh_announcements(uuid) to service_role;

----------------------------------------------------------------------------- 8. API pengirim (khusus service_role: dipanggil Edge Function)
drop function if exists public.notif_claim(int);
create or replace function public.notif_claim(p_limit int default 20, p_channels text[] default null) returns setof public.notif_outbox
language plpgsql security definer set search_path = public as $$
declare ids uuid[];
begin
  if coalesce((select (value)::text::boolean from public.notif_settings where key = 'paused'), false) then return; end if;
  -- pesan yang macet "sending" > 10 menit dikembalikan ke antrean
  update public.notif_outbox set status = 'pending', last_error = coalesce(last_error, 'Pengiriman terputus, dicoba ulang'), updated_at = now()
   where status = 'sending' and updated_at < now() - interval '10 minutes' and attempts < max_attempts;
  update public.notif_outbox set status = 'failed', last_error = 'Pengiriman terputus dan batas percobaan habis', updated_at = now()
   where status = 'sending' and updated_at < now() - interval '10 minutes' and attempts >= max_attempts;
  select coalesce(array_agg(id), '{}') into ids from (
    select id from public.notif_outbox where status = 'pending' and next_attempt_at <= now() and (p_channels is null or channel = any(p_channels))
     order by next_attempt_at limit greatest(1, least(coalesce(p_limit, 20), 100)) for update skip locked) q;
  return query update public.notif_outbox set status = 'sending', attempts = attempts + 1, updated_at = now() where id = any(ids) returning *;
end $$;
revoke all on function public.notif_claim(int, text[]) from public, anon, authenticated;
grant execute on function public.notif_claim(int, text[]) to service_role;

-- Dipakai Edge Function untuk memeriksa admin yang menekan "Kirim sekarang" (JWT sudah diverifikasi di sana).
create or replace function public.notif_is_admin(p_uid uuid, p_perm text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admin_users a where a.user_id = p_uid and a.active
    and (a.role = 'super_admin' or exists (select 1 from public.role_permissions r where r.role = a.role and r.permission = p_perm))) $$;
revoke all on function public.notif_is_admin(uuid, text) from public, anon, authenticated;
grant execute on function public.notif_is_admin(uuid, text) to service_role;

create or replace function public.notif_result(p_id uuid, p_ok boolean, p_provider text, p_message_id text, p_error text, p_http int, p_permanent boolean default false) returns text
language plpgsql security definer set search_path = public as $$
declare o public.notif_outbox; base int; st text; err text := left(p_error, 500);
begin
  select * into o from public.notif_outbox where id = p_id for update;
  if not found or o.status <> 'sending' then return 'diabaikan'; end if;
  insert into public.notif_attempts (outbox_id, ok, http_status, error) values (p_id, p_ok, p_http, case when p_ok then null else err end);
  if p_ok then
    update public.notif_outbox set status = 'sent', provider = p_provider, provider_message_id = p_message_id, sent_at = now(), last_error = null, updated_at = now() where id = p_id;
    st := 'sent';
  elsif p_permanent or o.attempts >= o.max_attempts then
    update public.notif_outbox set status = 'failed', provider = p_provider, last_error = err, updated_at = now() where id = p_id; st := 'failed';
  else
    base := greatest(1, coalesce((select (value)::text::int from public.notif_settings where key = 'retry_base_minutes'), 5));
    update public.notif_outbox set status = 'pending', provider = p_provider, last_error = err, next_attempt_at = now() + make_interval(mins => base * (power(2, o.attempts - 1))::int), updated_at = now() where id = p_id; st := 'pending';
  end if;
  if o.announcement_id is not null then perform public.notif_refresh_announcements(o.announcement_id); end if;
  return st;
end $$;
revoke all on function public.notif_result(uuid, boolean, text, text, text, int, boolean) from public, anon, authenticated;
grant execute on function public.notif_result(uuid, boolean, text, text, text, int, boolean) to service_role;

-- callback provider: delivered / bounced / failed. Hanya pesan yang pernah diterima provider (punya provider_message_id).
create or replace function public.notif_delivery(p_provider_message_id text, p_status text, p_error text default null) returns text
language plpgsql security definer set search_path = public as $$
declare o public.notif_outbox;
begin
  select * into o from public.notif_outbox where provider_message_id = p_provider_message_id for update;
  if not found then return 'tidak_ditemukan'; end if;
  if p_status = 'delivered' then
    if o.status in ('sent','failed') then update public.notif_outbox set status = 'delivered', delivered_at = now(), last_error = null, updated_at = now() where id = o.id; end if;
  elsif p_status in ('failed','bounced') then
    if o.status in ('sent','delivered') then update public.notif_outbox set status = 'failed', last_error = coalesce(left(p_error, 500), 'Ditolak/bounce oleh provider'), updated_at = now() where id = o.id; end if;
  else return 'status_tidak_dikenal'; end if;
  insert into public.notif_attempts (outbox_id, ok, error) values (o.id, p_status = 'delivered', case when p_status = 'delivered' then null else left(p_error, 500) end);
  if o.announcement_id is not null then perform public.notif_refresh_announcements(o.announcement_id); end if;
  return 'ok';
end $$;
revoke all on function public.notif_delivery(text, text, text) from public, anon, authenticated;
grant execute on function public.notif_delivery(text, text, text) to service_role;

-- dijalankan tiap putaran pengirim: pengingat langganan H-7, pengumuman terjadwal, detak jantung.
create or replace function public.notif_enqueue_due() returns jsonb
language plpgsql security definer set search_path = public as $$
declare s record; a record; n_sub int := 0; n_ann int := 0; k int;
begin
  for s in select sb.id, sb.user_id, sb.plan, sb.expires_at from public.subscriptions sb
            where sb.status = 'aktif' and (sb.expires_at at time zone 'Asia/Jakarta')::date = ((now() + interval '7 days') at time zone 'Asia/Jakarta')::date loop
    k := public.notif_emit('subscription_expiring', s.user_id, jsonb_build_object('paket', s.plan, 'tanggal', to_char(s.expires_at at time zone 'Asia/Jakarta', 'DD-MM-YYYY')), 'subexp:' || s.id || ':' || to_char(s.expires_at, 'YYYYMMDD'));
    n_sub := n_sub + k;
  end loop;
  for a in select id from public.announcements where status = 'terjadwal' and scheduled_at is not null and scheduled_at <= now() loop
    perform public.notif_announce(a.id); n_ann := n_ann + 1;
  end loop;
  perform public.notif_refresh_announcements(null);
  update public.notif_settings set value = to_jsonb(now()), updated_at = now() where key = 'last_dispatch_at';
  return jsonb_build_object('subscription_reminders', n_sub, 'announcements', n_ann);
end $$;
revoke all on function public.notif_enqueue_due() from public, anon, authenticated;
grant execute on function public.notif_enqueue_due() to service_role;

----------------------------------------------------------------------------- 9. API admin
create or replace function public.admin_notif_overview() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare lastrun timestamptz;
begin
  if not public.has_perm('notifications.read') then raise exception 'forbidden' using errcode = '42501'; end if;
  select nullif(value #>> '{}', '')::timestamptz into lastrun from public.notif_settings where key = 'last_dispatch_at' and jsonb_typeof(value) = 'string';
  return jsonb_build_object(
    'paused', coalesce((select (value)::text::boolean from public.notif_settings where key = 'paused'), false),
    'last_dispatch_at', lastrun,
    'by_status', coalesce((select jsonb_object_agg(status, n) from (select status, count(*) n from public.notif_outbox where created_at > now() - interval '30 days' group by status) q), '{}'::jsonb),
    'backlog', (select count(*) from public.notif_outbox where status in ('pending','sending')),
    'oldest_pending', (select min(next_attempt_at) from public.notif_outbox where status = 'pending'));
end $$;

create or replace function public.admin_notif_settings_save(p jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare k text; v jsonb; x text;
begin
  if not public.has_perm('notifications.write') then raise exception 'forbidden' using errcode = '42501'; end if;
  for k, v in select * from jsonb_each(p) loop
    if k not in ('email_from_name','email_from_address','email_reply_to','max_attempts','retry_base_minutes','internal_emails','internal_whatsapp','paused') then raise exception 'kunci_tidak_dikenal: %', k; end if;
    if k in ('max_attempts') and (jsonb_typeof(v) <> 'number' or (v)::text::numeric not between 1 and 10 or (v)::text::numeric <> trunc((v)::text::numeric)) then raise exception 'max_attempts_tidak_valid'; end if;
    if k in ('retry_base_minutes') and (jsonb_typeof(v) <> 'number' or (v)::text::numeric not between 1 and 1440 or (v)::text::numeric <> trunc((v)::text::numeric)) then raise exception 'retry_base_minutes_tidak_valid'; end if;
    if k = 'paused' and jsonb_typeof(v) <> 'boolean' then raise exception 'paused_tidak_valid'; end if;
    if k in ('email_from_name','email_from_address','email_reply_to') then
      if jsonb_typeof(v) <> 'string' or char_length(v #>> '{}') > 120 or (v #>> '{}') ~ '[\r\n<>]' then raise exception '%_tidak_valid', k; end if;
      if k <> 'email_from_name' and (v #>> '{}') <> '' and (v #>> '{}') !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception '%_tidak_valid', k; end if;
    end if;
    if k = 'internal_emails' then
      if jsonb_typeof(v) <> 'array' or jsonb_array_length(v) > 20 then raise exception 'internal_emails_tidak_valid'; end if;
      for x in select jsonb_array_elements_text(v) loop if x !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or char_length(x) > 120 then raise exception 'internal_emails_tidak_valid'; end if; end loop;
    end if;
    if k = 'internal_whatsapp' then
      if jsonb_typeof(v) <> 'array' or jsonb_array_length(v) > 20 then raise exception 'internal_whatsapp_tidak_valid'; end if;
      for x in select jsonb_array_elements_text(v) loop if x !~ '^\+?[0-9]{8,15}$' then raise exception 'internal_whatsapp_tidak_valid'; end if; end loop;
    end if;
    insert into public.notif_settings (key, value) values (k, v) on conflict (key) do update set value = excluded.value, updated_at = now();
  end loop;
  insert into public.audit_logs (actor_id, action, table_name, row_id, summary) values (auth.uid(), 'update', 'notif_settings', 'settings', jsonb_build_object('keys', (select jsonb_agg(key) from jsonb_each(p))));
end $$;

create or replace function public.admin_notif_template_save(p_id uuid, p_key text, p_channel text, p_name text, p_subject text, p_body text, p_active boolean) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_id uuid := p_id;
begin
  if not public.has_perm('notifications.write') then raise exception 'forbidden' using errcode = '42501'; end if;
  if coalesce(p_key, '') !~ '^[a-z][a-z0-9_]{1,40}$' then raise exception 'kunci_tidak_valid'; end if;
  if p_channel not in ('email','whatsapp') then raise exception 'kanal_tidak_valid'; end if;
  if char_length(btrim(coalesce(p_name, ''))) < 2 then raise exception 'nama_wajib'; end if;
  if char_length(btrim(coalesce(p_body, ''))) < 1 then raise exception 'isi_wajib'; end if;
  if p_channel = 'email' and char_length(btrim(coalesce(p_subject, ''))) < 1 then raise exception 'subjek_wajib'; end if;
  if p_subject ~ '[\r\n]' then raise exception 'subjek_tidak_valid'; end if;
  if v_id is null then
    insert into public.notif_templates (key, channel, name, subject, body, active, updated_by) values (p_key, p_channel, btrim(p_name), case when p_channel = 'email' then btrim(p_subject) end, p_body, coalesce(p_active, true), auth.uid()) returning id into v_id;
  else
    update public.notif_templates set name = btrim(p_name), subject = case when channel = 'email' then btrim(p_subject) end, body = p_body, active = coalesce(p_active, true), updated_by = auth.uid(), updated_at = now() where id = v_id;
    if not found then raise exception 'tidak_ditemukan'; end if;
  end if;
  insert into public.audit_logs (actor_id, action, table_name, row_id, summary) values (auth.uid(), case when p_id is null then 'insert' else 'update' end, 'notif_templates', v_id::text, jsonb_build_object('key', p_key, 'channel', p_channel));
  return v_id;
exception when unique_violation then raise exception 'template_sudah_ada';
end $$;

create or replace function public.admin_notif_rule_set(p_event text, p_channel text, p_recipient text, p_enabled boolean) returns void
language plpgsql security definer set search_path = public as $$
declare tk text;
begin
  if not public.has_perm('notifications.write') then raise exception 'forbidden' using errcode = '42501'; end if;
  select template_key into tk from public.notif_rules where event = p_event and channel = p_channel and recipient = p_recipient;
  if not found then raise exception 'aturan_tidak_ditemukan'; end if;
  if p_enabled and not exists (select 1 from public.notif_templates where key = tk and channel = p_channel and lang = 'id' and active) then raise exception 'template_tidak_aktif'; end if;
  update public.notif_rules set enabled = coalesce(p_enabled, false), updated_at = now() where event = p_event and channel = p_channel and recipient = p_recipient;
  insert into public.audit_logs (actor_id, action, table_name, row_id, summary) values (auth.uid(), 'update', 'notif_rules', p_event || '/' || p_channel || '/' || p_recipient, jsonb_build_object('enabled', p_enabled));
end $$;

create or replace function public.admin_notif_retry(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.has_perm('notifications.write') then raise exception 'forbidden' using errcode = '42501'; end if;
  update public.notif_outbox set status = 'pending', attempts = 0, next_attempt_at = now(), last_error = null, updated_at = now()
   where id = p_id and status in ('failed','cancelled') and to_address is not null;
  if not found then raise exception 'tidak_bisa_dicoba_ulang'; end if;
  insert into public.audit_logs (actor_id, action, table_name, row_id, summary) values (auth.uid(), 'update', 'notif_outbox', p_id::text, jsonb_build_object('aksi', 'retry'));
end $$;

create or replace function public.admin_notif_cancel(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.has_perm('notifications.write') then raise exception 'forbidden' using errcode = '42501'; end if;
  update public.notif_outbox set status = 'cancelled', last_error = 'Dibatalkan admin', updated_at = now() where id = p_id and status = 'pending';
  if not found then raise exception 'tidak_bisa_dibatalkan'; end if;
  insert into public.audit_logs (actor_id, action, table_name, row_id, summary) values (auth.uid(), 'update', 'notif_outbox', p_id::text, jsonb_build_object('aksi', 'cancel'));
end $$;

create or replace function public.admin_notif_attempts(p_id uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.has_perm('notifications.read') then raise exception 'forbidden' using errcode = '42501'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('at', at, 'ok', ok, 'http', http_status, 'error', error) order by at) from public.notif_attempts where outbox_id = p_id), '[]'::jsonb);
end $$;

create or replace function public.admin_announcement_send(p_id uuid) returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if not public.has_perm('notifications.write') then raise exception 'forbidden' using errcode = '42501'; end if;
  n := public.notif_announce(p_id);
  insert into public.audit_logs (actor_id, action, table_name, row_id, summary) values (auth.uid(), 'update', 'announcements', p_id::text, jsonb_build_object('aksi', 'kirim', 'penerima', n));
  return n;
end $$;

-- pesan uji ke satu alamat (untuk memastikan provider terhubung); tidak lewat aturan event
create or replace function public.admin_notif_test(p_channel text, p_to text) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_to text := btrim(coalesce(p_to, '')); v_max int;
begin
  if not public.has_perm('notifications.write') then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_channel = 'email' and v_to !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'alamat_tidak_valid'; end if;
  if p_channel = 'whatsapp' then v_to := public.notif_phone(v_to); if v_to is null or v_to !~ '^[0-9]{8,15}$' then raise exception 'alamat_tidak_valid'; end if; end if;
  if p_channel not in ('email','whatsapp') then raise exception 'kanal_tidak_valid'; end if;
  v_max := coalesce((select (value)::text::int from public.notif_settings where key = 'max_attempts'), 3);
  insert into public.notif_outbox (event, channel, recipient_kind, to_address, subject, body, max_attempts, dedupe_key)
    values ('test', p_channel, 'internal', v_to, case p_channel when 'email' then '[NusaMora] Pesan uji notifikasi' end, 'Ini pesan uji dari panel admin NusaMora. Jika Anda menerima ini, pengiriman berfungsi.', v_max, 'test:' || gen_random_uuid())
    returning id into v_id;
  return v_id;
end $$;

-- pratinjau template dengan data contoh
create or replace function public.admin_notif_preview(p_subject text, p_body text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v jsonb := jsonb_build_object('nama','Dina Pratama','order_id','NM-20261108-0001','paket','signature','judul','Pernikahan Dina & Raka','jumlah','Rp 349.000','link','https://nusamora.com/u/dina-raka','subjek','Pertanyaan pembayaran','balasan','Terima kasih, pembayaran Anda sudah kami cek.','kategori','pembayaran','tanggal','15-11-2026');
begin
  if not public.has_perm('notifications.read') then raise exception 'forbidden' using errcode = '42501'; end if;
  return jsonb_build_object('subject', public.notif_render(p_subject, v), 'body', public.notif_render(p_body, v));
end $$;

do $$ declare f text; begin
  foreach f in array array['admin_notif_overview()','admin_notif_settings_save(jsonb)','admin_notif_template_save(uuid,text,text,text,text,text,boolean)','admin_notif_rule_set(text,text,text,boolean)','admin_notif_retry(uuid)','admin_notif_cancel(uuid)','admin_notif_attempts(uuid)','admin_announcement_send(uuid)','admin_notif_test(text,text)','admin_notif_preview(text,text)'] loop
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop; end $$;
