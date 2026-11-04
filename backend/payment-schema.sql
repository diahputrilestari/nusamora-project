-- NusaMora: alur Publikasi & Pembayaran (Midtrans). Jalankan SETELAH dashboard-schema.sql, admin-schema.sql, dan invitation-schema.sql.
-- Prinsip: harga SELALU dihitung di sini dari tabel plans; status pembayaran HANYA diubah oleh apply_payment (dipanggil Edge Function
-- dengan service role setelah diverifikasi ke Midtrans). Klien tidak punya akses tulis ke payments / payment_events.

----------------------------------------------------------------------------- 1. Kemampuan per paket
do $$ begin
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'plans' and column_name = 'allow_3d') then
    alter table public.plans add column allow_3d boolean not null default false;
    alter table public.plans add column allow_live_guest boolean not null default false;
    update public.plans set allow_3d = true where id in ('signature', 'luxe');
    update public.plans set allow_live_guest = true where id = 'luxe';
  end if;
end $$;
-- Essential = 2D, Signature = 3D cinematic, Luxe = 3D + Live Guest
create or replace function public.plan_experience(p_plan text) returns text
language sql stable set search_path = public as $$
  select case when allow_live_guest then 'live' when allow_3d then '3d' else '2d' end from public.plans where id = p_plan
$$;

----------------------------------------------------------------------------- 2. Kolom & status undangan
alter table public.invitations add column if not exists plan_id text references public.plans(id);
alter table public.invitations add column if not exists experience text;
alter table public.invitations add column if not exists published_at timestamptz;
alter table public.invitations drop constraint if exists invitations_experience_check;
alter table public.invitations add constraint invitations_experience_check check (experience is null or experience in ('2d','3d','live'));
alter table public.invitations drop constraint if exists invitations_status_check;
alter table public.invitations add constraint invitations_status_check check (status in ('draft','menunggu_pembayaran','aktif','selesai','nonaktif'));

----------------------------------------------------------------------------- 3. Tabel pembayaran
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id text not null unique check (char_length(order_id) <= 50),
  user_id uuid not null references auth.users(id) on delete cascade,
  invitation_id uuid not null references public.invitations(id) on delete cascade,
  invoice_id uuid references public.invoices(id) on delete set null,
  plan_id text not null references public.plans(id),
  amount bigint not null check (amount > 0),
  duration_days int not null check (duration_days > 0),
  experience text not null check (experience in ('2d','3d','live')),
  status text not null default 'pending' check (status in ('pending','paid','failed','cancelled','expired','refunded')),
  snap_token text, redirect_url text,
  transaction_id text, payment_type text, midtrans_status text, fraud_status text,
  expires_at timestamptz not null, paid_at timestamptz, note text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists payments_user_idx on public.payments (user_id, created_at desc);
create index if not exists payments_inv_idx on public.payments (invitation_id);
-- satu undangan hanya boleh punya SATU pembayaran pending: mencegah transaksi ganda walau diklik berkali-kali / dari dua tab
create unique index if not exists payments_one_pending on public.payments (invitation_id) where status = 'pending';

-- riwayat setiap notifikasi/verifikasi dari Midtrans; event_key unik = kunci idempotensi
create table if not exists public.payment_events (
  id bigint generated always as identity primary key,
  order_id text not null,
  event_key text not null unique,
  source text not null check (source in ('webhook','sync','user','system')),
  transaction_status text, result text,
  payload jsonb,
  created_at timestamptz not null default now()
);
create index if not exists payment_events_order_idx on public.payment_events (order_id, created_at);

alter table public.payments enable row level security;
alter table public.payment_events enable row level security;
drop policy if exists "bayar sendiri: baca" on public.payments;
create policy "bayar sendiri: baca" on public.payments for select using (auth.uid() = user_id);
drop policy if exists "admin baca" on public.payments;
create policy "admin baca" on public.payments for select using (public.has_perm('transactions.read'));
drop policy if exists "admin baca" on public.payment_events;
create policy "admin baca" on public.payment_events for select using (public.has_perm('transactions.read'));
revoke insert, update, delete on public.payments, public.payment_events from anon, authenticated;
revoke all on public.payments, public.payment_events from anon;
grant select on public.payments, public.payment_events to authenticated;

----------------------------------------------------------------------------- 4. Validasi kelengkapan (dipakai server sebelum membuat transaksi)
create or replace function public.publish_issues(i public.invitations, p_plan text) returns text[]
language plpgsql stable set search_path = public as $$
declare m text[] := '{}'; c jsonb := coalesce(i.content, '{}'::jsonb); lim int; g int;
begin
  if coalesce(trim(c #>> '{names,a}'), '') = '' then m := array_append(m, 'Nama acara'::text); end if;
  if i.category in ('wedding','engagement') and coalesce(trim(c #>> '{names,b}'), '') = '' then m := array_append(m, 'Nama pasangan'::text); end if;
  if i.event_date is null then m := array_append(m, 'Tanggal acara'::text); end if;
  if coalesce(c #>> '{event,start}', '') = '' then m := array_append(m, 'Jam mulai'::text); end if;
  if coalesce(trim(c #>> '{event,venue}'), '') = '' then m := array_append(m, 'Nama lokasi'::text); end if;
  if coalesce(c #>> '{photos,cover}', '') = '' then m := array_append(m, 'Foto sampul'::text); end if;
  select gallery_limit into lim from public.plans where id = p_plan;
  g := case when jsonb_typeof(c #> '{photos,gallery}') = 'array' then jsonb_array_length(c #> '{photos,gallery}') else 0 end;
  if lim is not null and g > lim then m := array_append(m, ('Galeri maksimal ' || lim || ' foto untuk paket ini')::text); end if;
  return m;
end $$;

----------------------------------------------------------------------------- 5. Kedaluwarsa pembayaran (lazy, dipanggil dari fungsi lain)
create or replace function public.expire_stale_payments(p_user uuid default null) returns void
language plpgsql security definer set search_path = public as $$
declare r record;
begin
  for r in select id, order_id, invitation_id, invoice_id from public.payments
           where status = 'pending' and expires_at <= now() and (p_user is null or user_id = p_user) for update loop
    update public.payments set status = 'expired', midtrans_status = coalesce(midtrans_status, 'expire'), updated_at = now() where id = r.id;
    update public.invoices set status = 'gagal' where id = r.invoice_id and status = 'menunggu';
    update public.invitations set status = 'draft', updated_at = now() where id = r.invitation_id and status = 'menunggu_pembayaran';
    insert into public.payment_events (order_id, event_key, source, transaction_status, result) values (r.order_id, r.order_id || '|lazy-expire', 'system', 'expire', 'applied') on conflict do nothing;
  end loop;
end $$;

----------------------------------------------------------------------------- 6. Siapkan checkout (hanya service role; user_id berasal dari JWT yang sudah diverifikasi Edge Function)
create or replace function public.prepare_checkout(p_user uuid, p_invitation uuid, p_plan text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare i public.invitations; pl public.plans; pend public.payments; oid text; inv_id uuid; miss text[]; pay public.payments; v_email text; v_name text; cancel_order text;
begin
  select * into i from public.invitations where id = p_invitation and user_id = p_user for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'tidak_ditemukan'); end if;
  if exists (select 1 from public.profiles where id = p_user and status = 'suspended') then return jsonb_build_object('ok', false, 'error', 'akun_ditangguhkan'); end if;
  perform public.expire_stale_payments(p_user);
  select * into i from public.invitations where id = p_invitation;
  if i.moderation = 'takedown' then return jsonb_build_object('ok', false, 'error', 'tidak_dapat_dipublikasi'); end if;
  if i.status = 'aktif' and (i.expires_at is null or i.expires_at > now()) then return jsonb_build_object('ok', false, 'error', 'sudah_aktif'); end if;
  if i.status not in ('draft', 'menunggu_pembayaran') then return jsonb_build_object('ok', false, 'error', 'tidak_dapat_dipublikasi'); end if;
  select * into pl from public.plans where id = p_plan and active;
  if not found then return jsonb_build_object('ok', false, 'error', 'paket_tidak_valid'); end if;
  if pl.price <= 0 then return jsonb_build_object('ok', false, 'error', 'harga_tidak_valid'); end if;
  miss := public.publish_issues(i, p_plan);
  if array_length(miss, 1) > 0 then return jsonb_build_object('ok', false, 'error', 'data_belum_lengkap', 'missing', to_jsonb(miss)); end if;

  select u.email into v_email from auth.users u where u.id = p_user;
  select pr.full_name into v_name from public.profiles pr where pr.id = p_user;

  select * into pend from public.payments where invitation_id = p_invitation and status = 'pending' for update;
  if found then
    if pend.plan_id = p_plan and pend.expires_at > now() then
      return jsonb_build_object('ok', true, 'reuse', true, 'order_id', pend.order_id, 'amount', pend.amount, 'plan_id', pend.plan_id, 'plan_name', pl.name,
        'duration_days', pend.duration_days, 'experience', pend.experience, 'snap_token', pend.snap_token, 'redirect_url', pend.redirect_url,
        'expires_at', pend.expires_at, 'title', i.title, 'email', v_email, 'name', v_name);
    end if;
    -- ganti paket: pembayaran lama dibatalkan (Edge Function juga membatalkannya di Midtrans)
    cancel_order := pend.order_id;
    update public.payments set status = 'cancelled', note = 'ganti_paket', updated_at = now() where id = pend.id;
    update public.invoices set status = 'dibatalkan' where id = pend.invoice_id and status = 'menunggu';
    insert into public.payment_events (order_id, event_key, source, transaction_status, result) values (pend.order_id, pend.order_id || '|ganti-paket', 'user', 'cancel', 'applied') on conflict do nothing;
  end if;

  oid := 'NM' || to_char(now() at time zone 'utc', 'YYMMDDHH24MISS') || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
  insert into public.invoices (user_id, number, description, amount, status, midtrans_order_id)
  values (p_user, 'INV-' || to_char(now() at time zone 'utc', 'YYMMDD') || '-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6)),
          'Paket ' || pl.name || ' - ' || i.title, pl.price, 'menunggu', oid) returning id into inv_id;
  insert into public.payments (order_id, user_id, invitation_id, invoice_id, plan_id, amount, duration_days, experience, status, expires_at)
  values (oid, p_user, p_invitation, inv_id, p_plan, pl.price, pl.duration_days, public.plan_experience(p_plan), 'pending', now() + interval '24 hours') returning * into pay;
  update public.invitations set status = 'menunggu_pembayaran', updated_at = now() where id = p_invitation;
  insert into public.payment_events (order_id, event_key, source, transaction_status, result) values (oid, oid || '|dibuat', 'system', 'created', 'applied') on conflict do nothing;

  return jsonb_build_object('ok', true, 'reuse', false, 'order_id', oid, 'amount', pay.amount, 'plan_id', p_plan, 'plan_name', pl.name, 'duration_days', pay.duration_days,
    'experience', pay.experience, 'expires_at', pay.expires_at, 'title', i.title, 'email', v_email, 'name', v_name, 'cancel_order', cancel_order);
end $$;

create or replace function public.payment_set_snap(p_order text, p_token text, p_url text) returns void
language sql security definer set search_path = public as $$
  update public.payments set snap_token = p_token, redirect_url = p_url, updated_at = now() where order_id = p_order and status = 'pending'
$$;

-- jika pembuatan token di Midtrans gagal: lepaskan kembali supaya pelanggan bisa mencoba lagi
create or replace function public.payment_abort(p_order text) returns void
language plpgsql security definer set search_path = public as $$
declare r public.payments;
begin
  select * into r from public.payments where order_id = p_order and status = 'pending' and snap_token is null for update;
  if not found then return; end if;
  update public.payments set status = 'failed', note = 'gagal_membuat_transaksi', updated_at = now() where id = r.id;
  update public.invoices set status = 'gagal' where id = r.invoice_id and status = 'menunggu';
  update public.invitations set status = 'draft', updated_at = now() where id = r.invitation_id and status = 'menunggu_pembayaran';
end $$;

----------------------------------------------------------------------------- 7. Terapkan status pembayaran (IDEMPOTEN). Hanya service role.
create or replace function public.apply_payment(p_order text, p_tx_status text, p_fraud text, p_payment_type text, p_tx_id text, p_gross text, p_status_code text, p_source text, p_payload jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare p public.payments; i public.invitations; ekey text; ins int; ns text; ts text := lower(coalesce(p_tx_status, '')); fr text := lower(coalesce(p_fraud, ''));
        keep_pending boolean := false;
begin
  select * into p from public.payments where order_id = p_order for update;       -- kunci baris: webhook paralel diproses berurutan
  if not found then return jsonb_build_object('result', 'order_tidak_ditemukan'); end if;

  ekey := p_order || '|' || ts || '|' || fr || '|' || coalesce(p_status_code, '') || '|' || coalesce(p_tx_id, '') || '|' || coalesce(p_gross, '');
  insert into public.payment_events (order_id, event_key, source, transaction_status, result, payload)
  values (p_order, ekey, case when p_source in ('webhook','sync','user','system') then p_source else 'system' end, ts, 'applied', p_payload) on conflict (event_key) do nothing;
  get diagnostics ins = row_count;
  if ins = 0 then return jsonb_build_object('result', 'duplicate', 'status', p.status); end if;

  -- jumlah dari Midtrans harus sama persis dengan harga di database
  if p_gross is not null and p_gross ~ '^[0-9]+(\.[0-9]+)?$' and p_gross::numeric <> p.amount then
    update public.payments set note = 'jumlah_tidak_cocok', updated_at = now() where id = p.id;
    update public.payment_events set result = 'amount_mismatch' where event_key = ekey;
    return jsonb_build_object('result', 'amount_mismatch', 'status', p.status);
  end if;

  ns := case
    when ts = 'settlement' then 'paid'
    when ts = 'capture' and fr in ('', 'accept') then 'paid'
    when ts = 'capture' then 'pending'                                              -- fraud challenge: tunggu keputusan
    when ts = 'pending' then 'pending'
    when ts in ('deny', 'failure') then 'failed'
    when ts = 'cancel' then 'cancelled'
    when ts = 'expire' then 'expired'
    when ts in ('refund', 'partial_refund', 'chargeback', 'partial_chargeback') then 'refunded'
    else null end;
  if ns is null then update public.payment_events set result = 'ignored' where event_key = ekey; return jsonb_build_object('result', 'ignored', 'status', p.status); end if;

  -- status tidak boleh mundur: paid hanya bisa menjadi refunded; refunded final; pending tidak menimpa status akhir
  if (p.status = 'refunded') or (p.status = 'paid' and ns <> 'refunded') or (ns = 'pending' and p.status <> 'pending') or (p.status <> 'pending' and p.status <> 'paid' and ns not in ('paid', 'refunded') and ns <> p.status) then
    update public.payment_events set result = 'ignored' where event_key = ekey;
    return jsonb_build_object('result', 'ignored', 'status', p.status);
  end if;

  update public.payments set midtrans_status = ts, fraud_status = nullif(fr, ''), payment_type = coalesce(p_payment_type, payment_type), transaction_id = coalesce(p_tx_id, transaction_id), updated_at = now() where id = p.id;
  select * into i from public.invitations where id = p.invitation_id for update;

  if ns = 'pending' then
    update public.invitations set status = 'menunggu_pembayaran', updated_at = now() where id = p.invitation_id and status in ('draft', 'menunggu_pembayaran');
    update public.invoices set midtrans_status = ts where id = p.invoice_id;

  elsif ns = 'paid' then
    update public.payments set status = 'paid', paid_at = now(), updated_at = now() where id = p.id;
    update public.invoices set status = 'lunas', paid_at = now(), midtrans_status = ts where id = p.invoice_id;
    if i.status = 'aktif' and i.expires_at > now() then
      update public.payments set note = 'pembayaran_ganda_perlu_tinjauan' where id = p.id;       -- undangan sudah aktif dari pembayaran lain
    elsif i.moderation = 'takedown' then
      update public.payments set note = 'undangan_diturunkan_perlu_tinjauan' where id = p.id;
    else
      update public.invitations set status = 'aktif', plan_id = p.plan_id, experience = p.experience, published_at = now(),
             expires_at = now() + make_interval(days => p.duration_days), public_url = 'https://nusamora.com/' || i.slug, updated_at = now() where id = p.invitation_id;
      update public.subscriptions set status = 'kedaluwarsa' where user_id = p.user_id and status = 'aktif' and expires_at <= now();
      insert into public.subscriptions (user_id, plan, status, started_at, expires_at) values (p.user_id, p.plan_id, 'aktif', now(), now() + make_interval(days => p.duration_days));
    end if;

  elsif ns in ('failed', 'cancelled', 'expired') then
    update public.payments set status = ns, updated_at = now() where id = p.id;
    update public.invoices set status = case when ns = 'cancelled' then 'dibatalkan' else 'gagal' end, midtrans_status = ts where id = p.invoice_id and status = 'menunggu';
    update public.invitations set status = 'draft', updated_at = now()
      where id = p.invitation_id and status = 'menunggu_pembayaran' and not exists (select 1 from public.payments x where x.invitation_id = p.invitation_id and x.status = 'pending' and x.id <> p.id);

  elsif ns = 'refunded' then
    update public.payments set status = 'refunded', updated_at = now() where id = p.id;
    update public.invoices set status = 'refund', refunded_at = now(), midtrans_status = ts where id = p.invoice_id;
    update public.invitations set status = 'nonaktif', updated_at = now() where id = p.invitation_id and i.plan_id = p.plan_id;
  end if;

  return jsonb_build_object('result', 'applied', 'status', ns);
end $$;

----------------------------------------------------------------------------- 8. Status pembayaran untuk pelanggan (halaman hasil pembayaran)
create or replace function public.my_payment(p_order text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); p public.payments; i public.invitations; pl public.plans; inv_no text;
begin
  if uid is null then raise exception 'unauthorized' using errcode = '28000'; end if;
  perform public.expire_stale_payments(uid);
  select * into p from public.payments where order_id = p_order and user_id = uid;
  if not found then return jsonb_build_object('error', 'tidak_ditemukan'); end if;
  select * into i from public.invitations where id = p.invitation_id;
  select * into pl from public.plans where id = p.plan_id;
  select number into inv_no from public.invoices where id = p.invoice_id;
  return jsonb_build_object('order_id', p.order_id, 'status', p.status, 'amount', p.amount, 'plan_id', p.plan_id, 'plan_name', pl.name, 'duration_days', p.duration_days,
    'experience', p.experience, 'paid_at', p.paid_at, 'expires_at', p.expires_at, 'payment_type', p.payment_type, 'invoice_number', inv_no,
    'redirect_url', case when p.status = 'pending' then p.redirect_url end,
    'invitation', jsonb_build_object('id', i.id, 'title', i.title, 'slug', i.slug, 'status', i.status, 'public_url', i.public_url, 'expires_at', i.expires_at, 'published_at', i.published_at));
end $$;

----------------------------------------------------------------------------- 9. Akses fitur sesuai paket: data publik undangan
-- Tamu hanya menerima undangan yang aktif, belum kedaluwarsa, dan tidak diturunkan. Fitur Live Guest dibuang bila paket tidak memilikinya.
create or replace function public.get_public_invitation(p_slug text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare i public.invitations; c jsonb;
begin
  select * into i from public.invitations where lower(slug) = lower(coalesce(p_slug, '')) and status = 'aktif' and moderation <> 'takedown' and expires_at > now();
  if not found then return jsonb_build_object('error', 'tidak_tersedia'); end if;
  c := coalesce(i.content, '{}'::jsonb);
  if i.experience is distinct from 'live' then c := c #- '{features,liveGuest}'; end if;
  return jsonb_build_object('title', i.title, 'template_id', i.template_id, 'category', i.category, 'event_date', i.event_date, 'experience', coalesce(i.experience, '2d'),
    'features3d', i.experience in ('3d', 'live'), 'liveGuest', i.experience = 'live', 'content', c, 'expires_at', i.expires_at);
end $$;

----------------------------------------------------------------------------- 10. Nonaktifkan undangan yang masa aktifnya habis (jalankan berkala, mis. pg_cron / Supabase Scheduled Function)
create or replace function public.expire_invitations() returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  update public.invitations set status = 'nonaktif', updated_at = now() where status = 'aktif' and expires_at is not null and expires_at <= now();
  get diagnostics n = row_count;
  update public.subscriptions set status = 'kedaluwarsa' where status = 'aktif' and expires_at <= now();
  return n;
end $$;

----------------------------------------------------------------------------- 11. Hak eksekusi
revoke execute on function public.prepare_checkout(uuid,uuid,text), public.payment_set_snap(text,text,text), public.payment_abort(text),
  public.apply_payment(text,text,text,text,text,text,text,text,jsonb), public.expire_stale_payments(uuid), public.expire_invitations() from public, anon, authenticated;
grant execute on function public.prepare_checkout(uuid,uuid,text), public.payment_set_snap(text,text,text), public.payment_abort(text),
  public.apply_payment(text,text,text,text,text,text,text,text,jsonb), public.expire_stale_payments(uuid), public.expire_invitations() to service_role;
revoke execute on function public.my_payment(text) from public, anon;
grant execute on function public.my_payment(text) to authenticated;
grant execute on function public.get_public_invitation(text) to anon, authenticated;
grant execute on function public.plan_experience(text), public.publish_issues(public.invitations, text) to authenticated, service_role;

do $$ declare t text; begin
  foreach t in array array['payments'] loop
    execute format('drop trigger if exists audit_%1$s on public.%1$I', t);
    execute format('create trigger audit_%1$s after insert or update or delete on public.%1$I for each row execute function public.audit_row()', t);
  end loop;
end $$;
