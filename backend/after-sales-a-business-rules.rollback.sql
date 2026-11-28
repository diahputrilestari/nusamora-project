-- Rollback NusaMora After-Sales Part A (after-sales-a-business-rules.sql)
-- Aman untuk data: rollback DITOLAK bila sudah ada pembayaran berstatus partially_refunded atau pembayaran perpanjangan,
-- karena skema lama tidak bisa mewakili data itu. Tidak ada baris pembayaran/invoice/undangan yang dihapus.
do $$ begin
  if exists (select 1 from public.payments where status = 'partially_refunded' or kind = 'renewal') then
    raise exception 'rollback_ditolak: sudah ada pembayaran partially_refunded atau perpanjangan; perlu keputusan manual';
  end if;
end $$;

-- laporan: kembalikan rumus lama
do $$ declare f text; d text; d0 text; begin
  foreach f in array array['admin_report', 'admin_plans_overview'] loop
    for d in select pg_get_functiondef(p.oid) from pg_proc p where p.proname = f and p.pronamespace = 'public'::regnamespace loop
      d0 := d;
      d := replace(d, $q$sum(y.amount - y.refunded_amount), 0) from public.payments_real y where y.plan_id = p.id and y.status in ('paid','partially_refunded'))$q$, $q$sum(y.amount), 0) from public.payments_real y where y.plan_id = p.id and y.status in ('paid','partially_refunded'))$q$);
      d := replace(d, $q$y.status in ('paid','partially_refunded') and$q$, $q$y.status = 'paid' and$q$);
      d := replace(d, $q$y.status in ('paid','partially_refunded'))$q$, $q$y.status = 'paid')$q$);
      d := replace(d, $q$sum(p.amount - p.refunded_amount) from pay p where p.bucket = g$q$, $q$sum(p.amount) from pay p where p.bucket = g and p.status = 'paid'$q$);
      d := replace(d, $q$coalesce(sum(p.amount - p.refunded_amount), 0) as revenue$q$, $q$coalesce(sum(p.amount) filter (where p.status = 'paid'), 0) as revenue$q$);
      d := replace(d, $q$'net', coalesce(sum(amount - refunded_amount), 0)$q$, $q$'net', coalesce(sum(amount) filter (where status = 'paid'), 0)$q$);
      d := replace(d, $q$'refund', coalesce(sum(refunded_amount), 0)$q$, $q$'refund', coalesce(sum(amount) filter (where status = 'refunded'), 0)$q$);
      d := replace(d, $q$status in ('paid','partially_refunded','refunded')$q$, $q$status in ('paid','refunded')$q$);
      if d <> d0 then execute d; end if;
    end loop;
  end loop; end $$;

do $$ declare d text; d0 text; begin
  select pg_get_functiondef(p.oid) into d from pg_proc p where p.proname = 'admin_config_import' and p.pronamespace = 'public'::regnamespace;
  if d is null then return; end if;
  d0 := d;
  d := replace(d, $q$'internal_emails','internal_whatsapp','support_email','pending_reminder_enabled','pending_reminder_after_minutes') then probs$q$, $q$'internal_emails','internal_whatsapp') then probs$q$);
  if d <> d0 then execute d; end if;
end $$;

do $$ declare d text; d0 text; begin
  select pg_get_functiondef(p.oid) into d from pg_proc p where p.proname = 'admin_transaction_detail' and p.pronamespace = 'public'::regnamespace;
  if d is null then return; end if;
  d0 := d;
  d := replace(d, $q$'fraud_status', p.fraud_status, 'refunded_amount', p.refunded_amount, 'kind', p.kind, 'period_start', p.period_start, 'period_end', p.period_end,$q$, $q$'fraud_status', p.fraud_status,$q$);
  if d <> d0 then execute d; end if;
end $$;

-- fungsi baru
drop function if exists public.my_invitation_periods(uuid);
drop function if exists public.admin_notif_payment_preset(boolean);
drop function if exists public.admin_notif_payment_readiness();
drop trigger if exists notif_cancel_reminder_trg on public.payments;
drop function if exists public.notif_cancel_payment_reminder();
drop function if exists public.enqueue_pending_payment_reminders(int);
drop function if exists public.prepare_renewal(uuid, uuid, text);
drop function if exists public.admin_refund_request(uuid, text, bigint);
drop trigger if exists payments_status_guard on public.payments;
drop function if exists public.payments_status_guard();
drop trigger if exists invoices_refund_guard on public.invoices;
drop function if exists public.invoices_refund_guard();

-- pengingat yang masih antre dibatalkan (riwayat outbox tetap disimpan); aturan & template pengingat dihapus
update public.notif_outbox set status = 'cancelled', last_error = 'Rollback after-sales A', updated_at = now() where event = 'payment_pending_reminder' and status in ('pending', 'sending');
delete from public.notif_rules where event = 'payment_pending_reminder';
delete from public.notif_templates where key = 'payment_pending_reminder';
delete from public.notif_settings where key in ('pending_reminder_enabled', 'pending_reminder_after_minutes', 'support_email');

-- fungsi lama dipulihkan apa adanya (disalin dari file sumber)
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
revoke all on function public.apply_payment(text, text, text, text, text, text, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.apply_payment(text, text, text, text, text, text, text, text, jsonb) to service_role;
drop function if exists public.payment_record_refund(uuid, bigint, text);
create or replace function public.admin_refund_request(p_invoice uuid, p_reason text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare p public.payments; rid uuid;
begin
  if not public.has_perm('transactions.write') then raise exception 'forbidden' using errcode = '42501'; end if;
  select * into p from public.payments where invoice_id = p_invoice for update;
  if not found then return jsonb_build_object('error', 'pembayaran_tidak_ada'); end if;
  if p.status <> 'paid' then return jsonb_build_object('error', 'belum_lunas'); end if;
  if char_length(btrim(coalesce(p_reason, ''))) < 5 then return jsonb_build_object('error', 'alasan_terlalu_pendek'); end if;
  if exists (select 1 from public.payment_refunds where payment_id = p.id and status = 'diajukan') then return jsonb_build_object('error', 'refund_sudah_diajukan'); end if;
  insert into public.payment_refunds (payment_id, invoice_id, amount, reason, requested_by) values (p.id, p_invoice, p.amount, btrim(p_reason), auth.uid()) returning id into rid;
  return jsonb_build_object('ok', true, 'id', rid);
end $$;
create or replace function public.admin_refund_decide(p_refund uuid, p_decision text, p_method text default null, p_proof_url text default null, p_proof_note text default null, p_note text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare r public.payment_refunds; p public.payments;
begin
  if not public.has_perm('transactions.write') then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_decision not in ('selesai', 'ditolak') then raise exception 'keputusan tidak valid'; end if;
  select * into r from public.payment_refunds where id = p_refund for update;
  if not found then return jsonb_build_object('error', 'tidak_ditemukan'); end if;
  if r.status <> 'diajukan' then return jsonb_build_object('error', 'sudah_diputuskan'); end if;
  if p_decision = 'ditolak' then
    if char_length(btrim(coalesce(p_note, ''))) < 3 then return jsonb_build_object('error', 'alasan_penolakan_kosong'); end if;
    update public.payment_refunds set status = 'ditolak', decided_by = auth.uid(), decided_at = now(), decision_note = btrim(p_note) where id = r.id;
    return jsonb_build_object('ok', true, 'status', 'ditolak');
  end if;
  if p_method is null or p_method not in ('midtrans_dashboard', 'transfer_manual', 'lainnya') then return jsonb_build_object('error', 'metode_belum_dipilih'); end if;
  if nullif(btrim(coalesce(p_proof_url, '')), '') is null and nullif(btrim(coalesce(p_proof_note, '')), '') is null then return jsonb_build_object('error', 'bukti_belum_ada'); end if;
  if nullif(btrim(coalesce(p_proof_url, '')), '') is not null and btrim(p_proof_url) !~* '^https?://' then return jsonb_build_object('error', 'bukti_url_tidak_valid'); end if;
  select * into p from public.payments where id = r.payment_id for update;
  if p.status = 'paid' then
    update public.payments set status = 'refunded', note = 'refund_dicatat_admin', updated_at = now() where id = p.id;
    update public.invoices set status = 'refund', refunded_at = now() where id = p.invoice_id;
    update public.invitations set status = 'nonaktif', updated_at = now() where id = p.invitation_id and plan_id = p.plan_id and status = 'aktif';
    insert into public.payment_events (order_id, event_key, source, transaction_status, result)
    values (p.order_id, p.order_id || '|refund-admin|' || r.id, 'system', 'refund', 'applied') on conflict do nothing;
  end if;
  update public.payment_refunds set status = 'selesai', method = p_method, proof_url = nullif(btrim(coalesce(p_proof_url, '')), ''), proof_note = nullif(btrim(coalesce(p_proof_note, '')), ''),
         decided_by = auth.uid(), decided_at = now(), decision_note = nullif(btrim(coalesce(p_note, '')), '') where id = r.id;
  return jsonb_build_object('ok', true, 'status', 'selesai');
end $$;
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

-- kolom & constraint (tidak ada data pembayaran baru yang bisa hilang: sudah dicek di awal)
drop view if exists public.payments_real;
drop view if exists public.invoices_real;
drop index if exists public.payments_reminder_idx;
drop index if exists public.payments_paid_at_idx;
create index if not exists payments_paid_at_idx on public.payments (paid_at) where status in ('paid','refunded');
alter table public.payments drop constraint if exists payments_refunded_amount_check;
alter table public.payments drop constraint if exists payments_kind_check;
alter table public.payments drop column if exists reminder_queued_at, drop column if exists period_end, drop column if exists period_start, drop column if exists kind, drop column if exists refunded_amount;
alter table public.invoices drop constraint if exists invoices_refunded_amount_check;
alter table public.invoices drop column if exists refunded_amount;
alter table public.payments drop constraint if exists payments_status_check;
alter table public.payments add constraint payments_status_check check (status in ('pending','paid','failed','cancelled','expired','refunded'));
create or replace view public.invoices_real with (security_invoker = true) as select * from public.invoices where not is_sandbox;
create or replace view public.payments_real with (security_invoker = true) as
  select p.* from public.payments p where not exists (select 1 from public.invoices i where i.id = p.invoice_id and i.is_sandbox);
revoke all on public.invoices_real, public.payments_real from anon, authenticated;
