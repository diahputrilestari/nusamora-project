-- =====================================================================
-- NusaMora - Admin: Manajemen Transaksi (additive, idempoten)
-- Jalankan SETELAH payment-schema.sql & admin-schema.sql.
-- Prinsip: status LUNAS hanya berasal dari Midtrans (webhook / sinkronisasi ke API Midtrans
-- lewat Edge Function). Tidak ada fungsi di sini yang membuat invoice menjadi lunas.
-- =====================================================================

-- 1. Pemetaan status Midtrans -> status internal pembayaran (sama persis dengan apply_payment)
create or replace function public.map_midtrans_status(p_status text, p_fraud text default null) returns text
language sql immutable as $$
  select case lower(coalesce(p_status, ''))
    when 'settlement' then 'paid'
    when 'capture' then case when lower(coalesce(p_fraud, '')) in ('', 'accept') then 'paid' else 'pending' end
    when 'pending' then 'pending'
    when 'deny' then 'failed' when 'failure' then 'failed'
    when 'cancel' then 'cancelled'
    when 'expire' then 'expired'
    when 'refund' then 'refunded' when 'partial_refund' then 'refunded' when 'chargeback' then 'refunded' when 'partial_chargeback' then 'refunded'
    else null end
$$;
grant execute on function public.map_midtrans_status(text, text) to authenticated;

-- 2. Refund: permintaan + keputusan, lengkap dengan alasan & bukti
create table if not exists public.payment_refunds (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments(id) on delete cascade,
  invoice_id uuid references public.invoices(id) on delete set null,
  amount bigint not null check (amount > 0),
  reason text not null check (char_length(btrim(reason)) >= 5),
  status text not null default 'diajukan' check (status in ('diajukan', 'selesai', 'ditolak')),
  method text check (method in ('midtrans_dashboard', 'transfer_manual', 'lainnya')),
  proof_url text check (proof_url is null or proof_url ~* '^https?://'),
  proof_note text,
  requested_by uuid, requested_at timestamptz not null default now(),
  decided_by uuid, decided_at timestamptz, decision_note text
);
create unique index if not exists payment_refunds_one_open on public.payment_refunds (payment_id) where status = 'diajukan';
create index if not exists payment_refunds_inv_idx on public.payment_refunds (invoice_id);
alter table public.payment_refunds enable row level security;
drop policy if exists "admin baca" on public.payment_refunds;
create policy "admin baca" on public.payment_refunds for select using (public.has_perm('transactions.read'));
revoke all on public.payment_refunds from anon;
revoke insert, update, delete on public.payment_refunds from authenticated;
grant select on public.payment_refunds to authenticated;
drop trigger if exists audit_payment_refunds on public.payment_refunds;
create trigger audit_payment_refunds after insert or update or delete on public.payment_refunds for each row execute function public.audit_row();
drop trigger if exists audit_invoices on public.invoices;
create trigger audit_invoices after insert or update or delete on public.invoices for each row execute function public.audit_row();

-- 3. Daftar transaksi (satu baris per invoice, digabung dengan data pembayaran Midtrans)
create or replace function public.admin_list_transactions() returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.has_perm('transactions.read') then raise exception 'forbidden' using errcode = '42501'; end if;
  return coalesce((select jsonb_agg(to_jsonb(z) order by z.created_at desc) from (
    select i.id, i.number, i.description, i.amount, i.status, i.created_at, i.paid_at, i.refunded_at,
           coalesce(p.order_id, i.midtrans_order_id) as order_id, coalesce(p.midtrans_status, i.midtrans_status) as midtrans_status,
           p.status as pay_status, p.payment_type, p.transaction_id, p.fraud_status, p.plan_id,
           pr.full_name as owner_name, u.email as owner_email,
           (select r.status from public.payment_refunds r where r.payment_id = p.id order by r.requested_at desc limit 1) as refund_status,
           coalesce(p.note in ('jumlah_tidak_cocok', 'pembayaran_ganda_perlu_tinjauan', 'undangan_diturunkan_perlu_tinjauan'), false) as needs_review,
           case when i.status = 'refund' or exists (select 1 from public.payment_refunds r where r.payment_id = p.id and r.status = 'diajukan') then 'ya' else 'tidak' end as in_refund
      from public.invoices i
      left join public.payments p on p.invoice_id = i.id
      left join public.profiles pr on pr.id = i.user_id
      left join auth.users u on u.id = i.user_id) z), '[]'::jsonb);
end $$;

-- 4. Ringkasan
create or replace function public.admin_transactions_overview() returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.has_perm('transactions.read') then raise exception 'forbidden' using errcode = '42501'; end if;
  return jsonb_build_object(
    'paid_count', (select count(*) from public.invoices where status = 'lunas'),
    'paid_sum', (select coalesce(sum(amount), 0) from public.invoices where status = 'lunas'),
    'pending_count', (select count(*) from public.invoices where status = 'menunggu'),
    'failed_count', (select count(*) from public.invoices where status in ('gagal', 'dibatalkan')),
    'refund_count', (select count(*) from public.invoices where status = 'refund'),
    'refund_open', (select count(*) from public.payment_refunds where status = 'diajukan'),
    'review', (select count(*) from public.payments where note in ('jumlah_tidak_cocok', 'pembayaran_ganda_perlu_tinjauan', 'undangan_diturunkan_perlu_tinjauan')));
end $$;

-- 5. Detail invoice
create or replace function public.admin_transaction_detail(p_invoice uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare i public.invoices; p public.payments; res jsonb;
begin
  if not public.has_perm('transactions.read') then raise exception 'forbidden' using errcode = '42501'; end if;
  select * into i from public.invoices where id = p_invoice;
  if not found then raise exception 'transaksi tidak ditemukan'; end if;
  select * into p from public.payments where invoice_id = p_invoice order by created_at desc limit 1;
  res := jsonb_build_object(
    'invoice', jsonb_build_object('id', i.id, 'number', i.number, 'description', i.description, 'amount', i.amount, 'status', i.status,
                'created_at', i.created_at, 'paid_at', i.paid_at, 'refunded_at', i.refunded_at, 'midtrans_order_id', i.midtrans_order_id, 'midtrans_status', i.midtrans_status),
    'customer', (select jsonb_build_object('id', pr.id, 'full_name', pr.full_name, 'email', u.email, 'whatsapp', pr.whatsapp)
                   from public.profiles pr left join auth.users u on u.id = pr.id where pr.id = i.user_id),
    'payment', case when p.id is null then null else jsonb_build_object('id', p.id, 'order_id', p.order_id, 'status', p.status, 'transaction_id', p.transaction_id,
                'payment_type', p.payment_type, 'midtrans_status', p.midtrans_status, 'fraud_status', p.fraud_status,
                'mapped_status', public.map_midtrans_status(p.midtrans_status, p.fraud_status), 'plan_id', p.plan_id, 'duration_days', p.duration_days,
                'experience', p.experience, 'paid_at', p.paid_at, 'expires_at', p.expires_at, 'note', p.note, 'created_at', p.created_at, 'updated_at', p.updated_at) end,
    'invitation', case when p.id is null then null else (select jsonb_build_object('id', v.id, 'title', v.title, 'status', v.status, 'expires_at', v.expires_at) from public.invitations v where v.id = p.invitation_id) end,
    'events', case when p.id is null then '[]'::jsonb else coalesce((select jsonb_agg(jsonb_build_object('at', e.created_at, 'source', e.source, 'status', e.transaction_status, 'result', e.result,
                'payment_type', e.payload->>'payment_type', 'transaction_id', e.payload->>'transaction_id', 'gross', e.payload->>'gross_amount') order by e.created_at desc, e.id desc)
                from public.payment_events e where e.order_id = p.order_id), '[]'::jsonb) end,
    'history', coalesce((select jsonb_agg(h order by (h->>'at') desc) from (
        select jsonb_build_object('at', a.created_at, 'kind', 'admin', 'action', a.action, 'table', a.table_name,
               'by', (select coalesce(pa.full_name, ua.email) from auth.users ua left join public.profiles pa on pa.id = ua.id where ua.id = a.actor_id),
               'change', coalesce(a.summary->'status', a.summary->'catatan', a.summary)) as h
          from public.audit_logs a
         where (a.table_name = 'invoices' and a.row_id = i.id::text) or (p.id is not null and a.table_name = 'payments' and a.row_id = p.id::text)
            or (a.table_name = 'transaksi' and a.row_id = i.id::text)
        union all
        select jsonb_build_object('at', e.created_at, 'kind', e.source, 'action', e.transaction_status, 'result', e.result)
          from public.payment_events e where p.id is not null and e.order_id = p.order_id and e.result = 'applied') q), '[]'::jsonb),
    'refunds', case when p.id is null then '[]'::jsonb else coalesce((select jsonb_agg(jsonb_build_object('id', r.id, 'amount', r.amount, 'reason', r.reason, 'status', r.status, 'method', r.method,
                'proof_url', r.proof_url, 'proof_note', r.proof_note, 'requested_at', r.requested_at, 'decided_at', r.decided_at, 'decision_note', r.decision_note,
                'requested_by', (select coalesce(x.full_name, 'admin') from public.profiles x where x.id = r.requested_by),
                'decided_by', (select coalesce(x.full_name, 'admin') from public.profiles x where x.id = r.decided_by)) order by r.requested_at desc)
                from public.payment_refunds r where r.payment_id = p.id), '[]'::jsonb) end);
  return res;
end $$;

-- 6. Catatan admin pada transaksi (jejak audit)
create or replace function public.admin_transaction_note(p_invoice uuid, p_note text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.has_perm('transactions.write') then raise exception 'forbidden' using errcode = '42501'; end if;
  if char_length(btrim(coalesce(p_note, ''))) < 2 then raise exception 'catatan_kosong'; end if;
  if not exists (select 1 from public.invoices where id = p_invoice) then raise exception 'transaksi tidak ditemukan'; end if;
  insert into public.audit_logs (actor_id, action, table_name, row_id, summary) values (auth.uid(), 'catatan', 'transaksi', p_invoice::text, jsonb_build_object('catatan', btrim(p_note)));
end $$;

-- 7. Ajukan refund (hanya untuk pembayaran yang LUNAS menurut Midtrans)
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

-- 8. Putuskan refund. Selesai WAJIB menyertakan metode + bukti (URL atau catatan).
--    Dana dikembalikan di luar sistem ini (dashboard Midtrans / transfer); di sini hanya dicatat.
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

-- 9. Ekspor laporan (filter tanggal & status); admin harus punya izin transactions.read
create or replace function public.admin_export_transactions(p_from date default null, p_to date default null, p_status text default null) returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.has_perm('transactions.read') then raise exception 'forbidden' using errcode = '42501'; end if;
  return coalesce((select jsonb_agg(to_jsonb(z) order by z.dibuat desc) from (
    select i.number as invoice, to_char(i.created_at at time zone 'Asia/Jakarta', 'YYYY-MM-DD HH24:MI') as dibuat,
           pr.full_name as pelanggan, u.email as email, i.description as keterangan, p.plan_id as paket, i.amount as jumlah,
           i.status as status_internal, p.midtrans_status as status_midtrans, p.fraud_status as fraud, p.payment_type as metode,
           p.order_id as order_id, p.transaction_id as transaction_id,
           to_char(coalesce(p.paid_at, i.paid_at) at time zone 'Asia/Jakarta', 'YYYY-MM-DD HH24:MI') as dibayar,
           to_char(i.refunded_at at time zone 'Asia/Jakarta', 'YYYY-MM-DD HH24:MI') as direfund
      from public.invoices i left join public.payments p on p.invoice_id = i.id
      left join public.profiles pr on pr.id = i.user_id left join auth.users u on u.id = i.user_id
     where (p_from is null or (i.created_at at time zone 'Asia/Jakarta')::date >= p_from)
       and (p_to is null or (i.created_at at time zone 'Asia/Jakarta')::date <= p_to)
       and (nullif(p_status, '') is null or i.status = p_status)) z), '[]'::jsonb);
end $$;

-- 10. Hak eksekusi
revoke execute on function public.admin_list_transactions(), public.admin_transactions_overview(), public.admin_transaction_detail(uuid), public.admin_transaction_note(uuid, text),
  public.admin_refund_request(uuid, text), public.admin_refund_decide(uuid, text, text, text, text, text), public.admin_export_transactions(date, date, text) from public, anon;
grant execute on function public.admin_list_transactions(), public.admin_transactions_overview(), public.admin_transaction_detail(uuid), public.admin_transaction_note(uuid, text),
  public.admin_refund_request(uuid, text), public.admin_refund_decide(uuid, text, text, text, text, text), public.admin_export_transactions(date, date, text) to authenticated;
