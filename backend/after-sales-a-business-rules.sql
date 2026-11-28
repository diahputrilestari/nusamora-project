-- NusaMora After-Sales Part A: aturan bisnis (refund sebagian, perpanjangan, pengingat pembayaran, konfigurasi notifikasi)
-- Dibangun di atas skema pembayaran landing-page (payment-schema, admin-plans, admin-transactions, admin-notifications, sandbox-separation).
-- Dijalankan SETELAH semua file lain (lihat ops/stack/apply-sql.sh). Rollback: after-sales-a-business-rules.rollback.sql
--
-- Prinsip:
--  * status pembayaran (payments.status) terpisah dari akses undangan (invitations.status/expires_at)
--      paid               -> undangan aktif
--      partially_refunded -> undangan TETAP aktif
--      refunded           -> undangan dinonaktifkan (aturan lama dipertahankan)
--  * refund dicatat sebagai TOTAL kumulatif (sama seperti refund_amount di Status API Midtrans): idempoten, tidak bisa melebihi jumlah bayar
--  * refunded final; partially_refunded hanya bisa naik ke partially_refunded/refunded; invoice "refund" tidak bisa kembali lunas
--  * perpanjangan hanya untuk paket yang sama (upgrade/downgrade belum didukung: butuh keputusan bisnis)
--  * tidak ada data pelanggan yang dihapus; tidak ada notifikasi yang diaktifkan; tidak ada scheduler yang dibuat

----------------------------------------------------------------------------- 1. Kolom & constraint
alter table public.payments drop constraint if exists payments_status_check;
alter table public.payments add constraint payments_status_check
  check (status in ('pending','paid','partially_refunded','failed','cancelled','expired','refunded'));
alter table public.payments add column if not exists refunded_amount bigint not null default 0;
alter table public.payments add column if not exists kind text not null default 'publish';
alter table public.payments add column if not exists period_start timestamptz;
alter table public.payments add column if not exists period_end timestamptz;
alter table public.payments add column if not exists reminder_queued_at timestamptz;
alter table public.payments drop constraint if exists payments_kind_check;
alter table public.payments add constraint payments_kind_check check (kind in ('publish','renewal'));
alter table public.payments drop constraint if exists payments_refunded_amount_check;
alter table public.payments add constraint payments_refunded_amount_check check (refunded_amount >= 0 and refunded_amount <= amount);

alter table public.invoices add column if not exists refunded_amount bigint not null default 0;
alter table public.invoices drop constraint if exists invoices_refunded_amount_check;
alter table public.invoices add constraint invoices_refunded_amount_check check (refunded_amount >= 0 and refunded_amount <= amount);

-- refund penuh lama: jumlah refund = jumlah bayar (hanya baris yang belum terisi; tidak mengubah status)
update public.payments set refunded_amount = amount where status = 'refunded' and refunded_amount = 0;
update public.invoices set refunded_amount = amount where status = 'refund' and refunded_amount = 0;

drop index if exists public.payments_paid_at_idx;
create index if not exists payments_paid_at_idx on public.payments (paid_at) where status in ('paid','partially_refunded','refunded');
create index if not exists payments_reminder_idx on public.payments (created_at) where status = 'pending' and reminder_queued_at is null;

-- view laporan (sandbox-separation) memakai p.* / i.*: dibuat ulang agar kolom baru ikut terbaca
create or replace view public.invoices_real with (security_invoker = true) as select * from public.invoices where not is_sandbox;
create or replace view public.payments_real with (security_invoker = true) as
  select p.* from public.payments p where not exists (select 1 from public.invoices i where i.id = p.invoice_id and i.is_sandbox);
revoke all on public.invoices_real, public.payments_real from anon, authenticated;

----------------------------------------------------------------------------- 2. Penjaga status (lapisan terakhir, berlaku untuk semua jalur)
create or replace function public.payments_status_guard() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.status = 'refunded' then new.refunded_amount := new.amount; end if;           -- refund penuh selalu = seluruh jumlah
  if tg_op = 'INSERT' then return new; end if;
  if old.status = 'refunded' and new.status <> 'refunded' then raise exception 'status_refund_final' using errcode = 'P0001'; end if;
  if old.status = 'partially_refunded' and new.status not in ('partially_refunded', 'refunded') then raise exception 'status_refund_final' using errcode = 'P0001'; end if;
  if new.refunded_amount < old.refunded_amount then raise exception 'refund_tidak_boleh_berkurang' using errcode = 'P0001'; end if;
  return new;
end $$;
drop trigger if exists payments_status_guard on public.payments;
create trigger payments_status_guard before insert or update on public.payments for each row execute function public.payments_status_guard();

create or replace function public.invoices_refund_guard() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.status = 'refund' then new.refunded_amount := new.amount; end if;
  if tg_op = 'INSERT' then return new; end if;
  if old.status = 'refund' and new.status <> 'refund' then raise exception 'invoice_refund_final' using errcode = 'P0001'; end if;
  if new.refunded_amount < old.refunded_amount then raise exception 'refund_tidak_boleh_berkurang' using errcode = 'P0001'; end if;
  return new;
end $$;
drop trigger if exists invoices_refund_guard on public.invoices;
create trigger invoices_refund_guard before insert or update on public.invoices for each row execute function public.invoices_refund_guard();

----------------------------------------------------------------------------- 3. Pencatat refund (internal; total kumulatif)
-- p_total = total refund kumulatif untuk pembayaran ini. Hasil: refunded | partially_refunded | duplicate | refund_exceeds | needs_review
create or replace function public.payment_record_refund(p_payment uuid, p_total bigint, p_ts text default null) returns text
language plpgsql security definer set search_path = public as $$
declare p public.payments; ns text;
begin
  select * into p from public.payments where id = p_payment for update;
  if not found then return 'needs_review'; end if;
  if p.status not in ('paid', 'partially_refunded', 'refunded') then
    update public.payments set note = 'refund_tanpa_pembayaran_perlu_tinjauan', updated_at = now() where id = p.id;
    return 'needs_review';
  end if;
  if p_total is null or p_total <= 0 then return 'needs_review'; end if;
  if p_total > p.amount then
    update public.payments set note = 'refund_melebihi_perlu_tinjauan', updated_at = now() where id = p.id;
    return 'refund_exceeds';
  end if;
  if p_total <= p.refunded_amount then return 'duplicate'; end if;      -- total sama/lebih kecil = sudah tercatat

  ns := case when p_total = p.amount then 'refunded' else 'partially_refunded' end;
  update public.payments set status = ns, refunded_amount = p_total, midtrans_status = coalesce(p_ts, midtrans_status), updated_at = now() where id = p.id;
  if ns = 'refunded' then
    update public.invoices set status = 'refund', refunded_amount = p_total, refunded_at = coalesce(refunded_at, now()), midtrans_status = coalesce(p_ts, midtrans_status) where id = p.invoice_id;
    -- aturan lama: refund penuh menonaktifkan undangan dengan paket yang sama
    update public.invitations set status = 'nonaktif', updated_at = now() where id = p.invitation_id and plan_id = p.plan_id and status <> 'nonaktif';
  else
    -- refund sebagian: invoice tetap lunas (laporan & komisi affiliate tidak berubah), undangan tidak disentuh
    update public.invoices set refunded_amount = p_total, midtrans_status = coalesce(p_ts, midtrans_status) where id = p.invoice_id;
  end if;
  return ns;
end $$;
revoke all on function public.payment_record_refund(uuid, bigint, text) from public, anon, authenticated;

----------------------------------------------------------------------------- 4. apply_payment (webhook/sync; hanya service_role)
create or replace function public.apply_payment(p_order text, p_tx_status text, p_fraud text, p_payment_type text, p_tx_id text, p_gross text, p_status_code text, p_source text, p_payload jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare p public.payments; i public.invitations; ekey text; ins int; ns text; ts text := lower(coalesce(p_tx_status, '')); fr text := lower(coalesce(p_fraud, ''));
        is_refund boolean; v_total bigint; v_raw text; rr text; base timestamptz;
begin
  select * into p from public.payments where order_id = p_order for update;       -- kunci baris: webhook paralel diproses berurutan
  if not found then return jsonb_build_object('result', 'order_tidak_ditemukan'); end if;

  is_refund := ts in ('refund', 'partial_refund', 'chargeback', 'partial_chargeback');
  if is_refund then
    -- total refund kumulatif dari Status API Midtrans (bukan dari isi notifikasi: Edge Function selalu memanggil Status API)
    v_raw := coalesce(p_payload ->> 'refund_amount', '');
    v_total := case when v_raw ~ '^[0-9]+(\.[0-9]+)?$' then round(v_raw::numeric)::bigint
                    when ts in ('refund', 'chargeback') then p.amount          -- refund penuh tanpa angka = seluruh jumlah
                    else null end;
  end if;

  ekey := p_order || '|' || ts || '|' || fr || '|' || coalesce(p_status_code, '') || '|' || coalesce(p_tx_id, '') || '|' || coalesce(p_gross, '')
          || case when is_refund then '|r' || coalesce(v_total::text, '?') else '' end;
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

  if is_refund then
    if v_total is null then
      update public.payments set note = 'refund_sebagian_perlu_tinjauan', updated_at = now() where id = p.id;
      update public.payment_events set result = 'needs_review' where event_key = ekey;
      return jsonb_build_object('result', 'needs_review', 'status', p.status);
    end if;
    update public.payments set payment_type = coalesce(p_payment_type, payment_type), transaction_id = coalesce(p_tx_id, transaction_id), updated_at = now() where id = p.id;
    rr := public.payment_record_refund(p.id, v_total, ts);
    update public.payment_events set result = case when rr in ('refunded', 'partially_refunded') then 'applied' else rr end where event_key = ekey;
    select status into ns from public.payments where id = p.id;
    return jsonb_build_object('result', case when rr in ('refunded', 'partially_refunded') then 'applied' else rr end, 'status', ns);
  end if;

  ns := case
    when ts = 'settlement' then 'paid'
    when ts = 'capture' and fr in ('', 'accept') then 'paid'
    when ts = 'capture' then 'pending'                                              -- fraud challenge: tunggu keputusan
    when ts = 'pending' then 'pending'
    when ts in ('deny', 'failure') then 'failed'
    when ts = 'cancel' then 'cancelled'
    when ts = 'expire' then 'expired'
    else null end;
  if ns is null then update public.payment_events set result = 'ignored' where event_key = ekey; return jsonb_build_object('result', 'ignored', 'status', p.status); end if;

  -- status tidak boleh mundur: paid/partially_refunded/refunded tidak ditimpa status non-refund; pending tidak menimpa status akhir
  if p.status in ('paid', 'partially_refunded', 'refunded') or (ns = 'pending' and p.status <> 'pending')
     or (p.status <> 'pending' and ns <> 'paid' and ns <> p.status) then
    update public.payment_events set result = 'ignored' where event_key = ekey;
    return jsonb_build_object('result', 'ignored', 'status', p.status);
  end if;

  update public.payments set midtrans_status = ts, fraud_status = nullif(fr, ''), payment_type = coalesce(p_payment_type, payment_type), transaction_id = coalesce(p_tx_id, transaction_id), updated_at = now() where id = p.id;
  select * into i from public.invitations where id = p.invitation_id for update;

  if ns = 'pending' then
    if p.kind = 'publish' then
      update public.invitations set status = 'menunggu_pembayaran', updated_at = now() where id = p.invitation_id and status in ('draft', 'menunggu_pembayaran');
    end if;
    update public.invoices set midtrans_status = ts where id = p.invoice_id;

  elsif ns = 'paid' and p.kind = 'renewal' then
    update public.payments set status = 'paid', paid_at = now(), updated_at = now() where id = p.id;
    update public.invoices set status = 'lunas', paid_at = now(), midtrans_status = ts where id = p.invoice_id;
    if i.moderation = 'takedown' then
      update public.payments set note = 'undangan_diturunkan_perlu_tinjauan' where id = p.id;
    elsif i.status = 'aktif' and i.expires_at is not null and i.expires_at > now() then
      base := i.expires_at;                                                        -- masih aktif: lanjut dari masa aktif sebelumnya
    elsif i.status in ('aktif', 'nonaktif', 'selesai') and (i.expires_at is null or i.expires_at <= now()) then
      base := now();                                                               -- sudah habis: mulai dari tanggal pembayaran berhasil
    else
      update public.payments set note = 'perpanjangan_perlu_tinjauan' where id = p.id;   -- mis. dinonaktifkan admin sebelum habis
    end if;
    if base is not null then
      update public.invitations set status = 'aktif', expires_at = base + make_interval(days => p.duration_days),
             public_url = coalesce(public_url, 'https://nusamora.com/' || i.slug), updated_at = now() where id = p.invitation_id;
      update public.payments set period_start = base, period_end = base + make_interval(days => p.duration_days) where id = p.id;
      update public.subscriptions set status = 'kedaluwarsa' where user_id = p.user_id and status = 'aktif' and expires_at <= now();
      insert into public.subscriptions (user_id, plan, status, started_at, expires_at) values (p.user_id, p.plan_id, 'aktif', base, base + make_interval(days => p.duration_days));
    end if;

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
      update public.payments set period_start = now(), period_end = now() + make_interval(days => p.duration_days) where id = p.id;
      update public.subscriptions set status = 'kedaluwarsa' where user_id = p.user_id and status = 'aktif' and expires_at <= now();
      insert into public.subscriptions (user_id, plan, status, started_at, expires_at) values (p.user_id, p.plan_id, 'aktif', now(), now() + make_interval(days => p.duration_days));
    end if;

  elsif ns in ('failed', 'cancelled', 'expired') then
    update public.payments set status = ns, updated_at = now() where id = p.id;
    update public.invoices set status = case when ns = 'cancelled' then 'dibatalkan' else 'gagal' end, midtrans_status = ts where id = p.invoice_id and status = 'menunggu';
    update public.invitations set status = 'draft', updated_at = now()
      where id = p.invitation_id and status = 'menunggu_pembayaran' and not exists (select 1 from public.payments x where x.invitation_id = p.invitation_id and x.status = 'pending' and x.id <> p.id);
  end if;

  return jsonb_build_object('result', 'applied', 'status', ns);
end $$;
revoke all on function public.apply_payment(text, text, text, text, text, text, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.apply_payment(text, text, text, text, text, text, text, text, jsonb) to service_role;

----------------------------------------------------------------------------- 5. Refund oleh admin (jumlah boleh sebagian)
create or replace function public.admin_refund_request(p_invoice uuid, p_reason text, p_amount bigint) returns jsonb
language plpgsql security definer set search_path = public as $$
declare p public.payments; rid uuid; remaining bigint; v_amt bigint;
begin
  if not public.has_perm('transactions.write') then raise exception 'forbidden' using errcode = '42501'; end if;
  select * into p from public.payments where invoice_id = p_invoice for update;
  if not found then return jsonb_build_object('error', 'pembayaran_tidak_ada'); end if;
  if p.status not in ('paid', 'partially_refunded') then return jsonb_build_object('error', 'belum_lunas'); end if;
  if char_length(btrim(coalesce(p_reason, ''))) < 5 then return jsonb_build_object('error', 'alasan_terlalu_pendek'); end if;
  if exists (select 1 from public.payment_refunds where payment_id = p.id and status = 'diajukan') then return jsonb_build_object('error', 'refund_sudah_diajukan'); end if;
  remaining := p.amount - p.refunded_amount;
  v_amt := coalesce(p_amount, remaining);
  if v_amt <= 0 or v_amt > remaining then return jsonb_build_object('error', 'jumlah_refund_tidak_valid', 'max', remaining); end if;
  insert into public.payment_refunds (payment_id, invoice_id, amount, reason, requested_by) values (p.id, p_invoice, v_amt, btrim(p_reason), auth.uid()) returning id into rid;
  return jsonb_build_object('ok', true, 'id', rid, 'amount', v_amt, 'partial', v_amt < remaining or p.refunded_amount > 0);
end $$;

-- versi lama (2 argumen) tetap ada untuk UI: mengajukan sisa jumlah yang belum direfund
create or replace function public.admin_refund_request(p_invoice uuid, p_reason text) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  return public.admin_refund_request(p_invoice, p_reason, null::bigint);
end $$;

create or replace function public.admin_refund_decide(p_refund uuid, p_decision text, p_method text default null, p_proof_url text default null, p_proof_note text default null, p_note text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare r public.payment_refunds; p public.payments; rr text;
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
  if p.status in ('paid', 'partially_refunded') then
    if p.refunded_amount + r.amount > p.amount then return jsonb_build_object('error', 'jumlah_refund_tidak_valid', 'max', p.amount - p.refunded_amount); end if;
    rr := public.payment_record_refund(p.id, p.refunded_amount + r.amount, null);
    if rr not in ('refunded', 'partially_refunded') then return jsonb_build_object('error', 'refund_tidak_dapat_dicatat', 'detail', rr); end if;
    update public.payments set note = 'refund_dicatat_admin' where id = p.id;
    insert into public.payment_events (order_id, event_key, source, transaction_status, result)
    values (p.order_id, p.order_id || '|refund-admin|' || r.id, 'system', case when rr = 'refunded' then 'refund' else 'partial_refund' end, 'applied') on conflict do nothing;
  end if;
  update public.payment_refunds set status = 'selesai', method = p_method, proof_url = nullif(btrim(coalesce(p_proof_url, '')), ''), proof_note = nullif(btrim(coalesce(p_proof_note, '')), ''),
         decided_by = auth.uid(), decided_at = now(), decision_note = nullif(btrim(coalesce(p_note, '')), '') where id = r.id;
  return jsonb_build_object('ok', true, 'status', 'selesai', 'payment_status', coalesce(rr, p.status));
end $$;
revoke all on function public.admin_refund_request(uuid, text, bigint) from public, anon;
grant execute on function public.admin_refund_request(uuid, text, bigint) to authenticated;

-- status bayar turunan untuk daftar undangan admin: refund sebagian tetap dihitung lunas
create or replace function public.inv_pay_status(p_inv uuid) returns text
language sql stable security definer set search_path = public as $$
  select case
    when exists (select 1 from public.payments x where x.invitation_id = p_inv and x.status in ('paid', 'partially_refunded')) then 'lunas'
    when exists (select 1 from public.payments x where x.invitation_id = p_inv and x.status = 'pending' and x.expires_at > now()) then 'menunggu'
    when exists (select 1 from public.payments x where x.invitation_id = p_inv and x.status = 'refunded') then 'refund'
    when exists (select 1 from public.payments x where x.invitation_id = p_inv) then 'gagal'
    else 'belum_bayar' end
$$;
revoke all on function public.inv_pay_status(uuid) from public, anon, authenticated;

-- laporan: pendapatan bersih = jumlah bayar - jumlah refund (refund penuh lama sudah diisi refunded_amount = amount)
do $$ declare f text; d text; d0 text; begin
  foreach f in array array['admin_report', 'admin_plans_overview'] loop
    for d in select pg_get_functiondef(p.oid) from pg_proc p where p.proname = f and p.pronamespace = 'public'::regnamespace loop
      if position('refunded_amount' in d) > 0 then continue; end if;        -- sudah dipasang (migration dijalankan ulang)
      d0 := d;
      d := replace(d, $q$status in ('paid','refunded')$q$, $q$status in ('paid','partially_refunded','refunded')$q$);
      d := replace(d, $q$'refund', coalesce(sum(amount) filter (where status = 'refunded'), 0)$q$, $q$'refund', coalesce(sum(refunded_amount), 0)$q$);
      d := replace(d, $q$'net', coalesce(sum(amount) filter (where status = 'paid'), 0)$q$, $q$'net', coalesce(sum(amount - refunded_amount), 0)$q$);
      d := replace(d, $q$coalesce(sum(p.amount) filter (where p.status = 'paid'), 0) as revenue$q$, $q$coalesce(sum(p.amount - p.refunded_amount), 0) as revenue$q$);
      d := replace(d, $q$sum(p.amount) from pay p where p.bucket = g and p.status = 'paid'$q$, $q$sum(p.amount - p.refunded_amount) from pay p where p.bucket = g$q$);
      d := replace(d, $q$y.status = 'paid')$q$, $q$y.status in ('paid','partially_refunded'))$q$);
      d := replace(d, $q$y.status = 'paid' and$q$, $q$y.status in ('paid','partially_refunded') and$q$);
      d := replace(d, $q$sum(y.amount), 0) from public.payments_real y where y.plan_id = p.id and y.status in ('paid','partially_refunded'))$q$, $q$sum(y.amount - y.refunded_amount), 0) from public.payments_real y where y.plan_id = p.id and y.status in ('paid','partially_refunded'))$q$);
      if d = d0 then raise exception 'after_sales_a: pola laporan % tidak ditemukan', f; end if;
      execute d;
    end loop;
  end loop; end $$;

-- detail transaksi admin: tampilkan jumlah refund, jenis pembayaran, dan periode
do $$ declare d text; d0 text; begin
  select pg_get_functiondef(p.oid) into d from pg_proc p where p.proname = 'admin_transaction_detail' and p.pronamespace = 'public'::regnamespace;
  if d is null or position('refunded_amount' in d) > 0 then return; end if;
  d0 := d;
  d := replace(d, $q$'fraud_status', p.fraud_status,$q$, $q$'fraud_status', p.fraud_status, 'refunded_amount', p.refunded_amount, 'kind', p.kind, 'period_start', p.period_start, 'period_end', p.period_end,$q$);
  if d = d0 then raise exception 'after_sales_a: pola admin_transaction_detail tidak ditemukan'; end if;
  execute d;
end $$;

----------------------------------------------------------------------------- 6. Perpanjangan undangan (hanya service_role; user_id dari JWT yang diverifikasi Edge Function)
create or replace function public.prepare_renewal(p_user uuid, p_invitation uuid, p_plan text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare i public.invitations; pl public.plans; fp record; pend public.payments; cur text; s_cur int; s_new int; oid text; inv_id uuid; pay public.payments; v_email text; v_name text;
begin
  -- kepemilikan: undangan harus milik pengguna yang login
  select * into i from public.invitations where id = p_invitation and user_id = p_user for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'tidak_ditemukan'); end if;
  if exists (select 1 from public.profiles where id = p_user and status = 'suspended') then return jsonb_build_object('ok', false, 'error', 'akun_ditangguhkan'); end if;
  perform public.expire_stale_payments(p_user);
  select * into i from public.invitations where id = p_invitation;
  if i.moderation = 'takedown' then return jsonb_build_object('ok', false, 'error', 'tidak_dapat_diperpanjang'); end if;
  -- aktif (masih berlaku) atau sudah habis masa aktifnya; nonaktif karena refund/admin sebelum habis = tidak bisa
  if not ((i.status = 'aktif' and i.expires_at is not null) or (i.status in ('nonaktif', 'selesai') and i.expires_at is not null and i.expires_at <= now()))
     or not exists (select 1 from public.payments x where x.invitation_id = i.id and x.status in ('paid', 'partially_refunded')) then
    return jsonb_build_object('ok', false, 'error', 'tidak_dapat_diperpanjang');
  end if;

  cur := coalesce(i.plan_id, i.package_type);
  if cur is null or p_plan is null then return jsonb_build_object('ok', false, 'error', 'paket_tidak_valid'); end if;
  if p_plan <> cur then
    select sort into s_cur from public.plans where id = cur;
    select sort into s_new from public.plans where id = p_plan;
    if s_new is null then return jsonb_build_object('ok', false, 'error', 'paket_tidak_valid'); end if;
    -- upgrade belum didukung: paket terkait jenis template (package_type) dan belum ada aturan kapan upgrade berlaku
    return jsonb_build_object('ok', false, 'error', case when s_new > s_cur then 'upgrade_belum_didukung' else 'downgrade_tidak_diizinkan' end, 'current_plan', cur);
  end if;

  select * into pl from public.plans where id = cur and active;
  if not found then return jsonb_build_object('ok', false, 'error', 'paket_tidak_valid'); end if;
  select * into fp from public.plan_effective(cur);                              -- harga & diskon terjadwal dari database
  if fp.price is null or fp.price <= 0 then return jsonb_build_object('ok', false, 'error', 'harga_tidak_valid'); end if;

  select u.email into v_email from auth.users u where u.id = p_user;
  select pr.full_name into v_name from public.profiles pr where pr.id = p_user;

  select * into pend from public.payments where invitation_id = p_invitation and status = 'pending' for update;
  if found then
    if pend.kind = 'renewal' and pend.plan_id = cur and pend.expires_at > now() then
      return jsonb_build_object('ok', true, 'reuse', true, 'kind', 'renewal', 'order_id', pend.order_id, 'amount', pend.amount, 'plan_id', pend.plan_id, 'plan_name', pl.name,
        'duration_days', pend.duration_days, 'snap_token', pend.snap_token, 'redirect_url', pend.redirect_url, 'expires_at', pend.expires_at, 'title', i.title, 'email', v_email, 'name', v_name);
    end if;
    return jsonb_build_object('ok', false, 'error', 'ada_pembayaran_tertunda');
  end if;

  oid := 'NM' || to_char(now() at time zone 'utc', 'YYMMDDHH24MISS') || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
  insert into public.invoices (user_id, number, description, amount, status, midtrans_order_id)
  values (p_user, 'INV-' || to_char(now() at time zone 'utc', 'YYMMDD') || '-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6)),
          'Perpanjangan Paket ' || pl.name || ' - ' || i.title || case when fp.discount_id is not null then ' (promo ' || fp.discount_name || ')' else '' end, fp.price, 'menunggu', oid) returning id into inv_id;
  insert into public.payments (order_id, user_id, invitation_id, invoice_id, plan_id, amount, duration_days, experience, status, expires_at, kind)
  values (oid, p_user, p_invitation, inv_id, cur, fp.price, pl.duration_days, coalesce(i.experience, public.plan_experience(cur)), 'pending', now() + interval '24 hours', 'renewal') returning * into pay;
  update public.payments set base_amount = fp.base, discount_id = fp.discount_id, discount_name = fp.discount_name where id = pay.id returning * into pay;
  -- undangan TIDAK diubah: masa aktif hanya bertambah setelah pembayaran terverifikasi
  insert into public.payment_events (order_id, event_key, source, transaction_status, result) values (oid, oid || '|dibuat-perpanjangan', 'system', 'created', 'applied') on conflict do nothing;

  return jsonb_build_object('ok', true, 'reuse', false, 'kind', 'renewal', 'order_id', oid, 'amount', pay.amount, 'plan_id', cur, 'plan_name', pl.name, 'duration_days', pay.duration_days,
    'expires_at', pay.expires_at, 'current_expires_at', i.expires_at, 'title', i.title, 'email', v_email, 'name', v_name);
end $$;
revoke all on function public.prepare_renewal(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.prepare_renewal(uuid, uuid, text) to service_role;

----------------------------------------------------------------------------- 7. Pengingat pembayaran tertunda (tanpa scheduler)
insert into public.notif_settings (key, value) values
  ('pending_reminder_enabled', 'false'::jsonb), ('pending_reminder_after_minutes', '60'::jsonb), ('support_email', '""'::jsonb)
on conflict (key) do nothing;

insert into public.notif_templates (key, channel, name, subject, body) values
 ('payment_pending_reminder', 'email', 'Pengingat pembayaran (email)', 'Pembayaran {{order_id}} belum selesai',
  'Halo {{nama}},\n\nPembayaran paket {{paket}} sebesar {{jumlah}} untuk undangan "{{judul}}" (order {{order_id}}) belum selesai. Batas pembayaran: {{batas}} WIB.\n\nSilakan lanjutkan dari dashboard NusaMora. Abaikan email ini bila Anda sudah membayar.\n\nButuh bantuan? Hubungi {{support_email}}.\n\nSalam,\nTim NusaMora')
on conflict (key, channel, lang) do nothing;
insert into public.notif_rules (event, channel, recipient, template_key) values ('payment_pending_reminder', 'email', 'customer', 'payment_pending_reminder')
on conflict (event, channel, recipient) do nothing;                              -- default nonaktif

create or replace function public.enqueue_pending_payment_reminders(p_limit int default 100) returns int
language plpgsql security definer set search_path = public as $$
declare mins int; r public.payments; n int := 0; k int; v_title text; v_sup text;
begin
  if not coalesce((select (value #>> '{}')::boolean from public.notif_settings where key = 'pending_reminder_enabled' and jsonb_typeof(value) = 'boolean'), false) then return 0; end if;
  if coalesce((select (value #>> '{}')::boolean from public.notif_settings where key = 'paused' and jsonb_typeof(value) = 'boolean'), false) then return 0; end if;
  mins := greatest(5, least(1380, coalesce((select (value #>> '{}')::int from public.notif_settings where key = 'pending_reminder_after_minutes' and jsonb_typeof(value) = 'number'), 60)));
  select nullif(value #>> '{}', '') into v_sup from public.notif_settings where key = 'support_email' and jsonb_typeof(value) = 'string';
  for r in select * from public.payments
            where status = 'pending' and reminder_queued_at is null and expires_at > now() and created_at <= now() - make_interval(mins => mins)
            order by created_at limit greatest(1, least(coalesce(p_limit, 100), 500)) for update skip locked loop
    -- periksa ulang status terbaru tepat sebelum mengantre
    if r.status <> 'pending' or r.expires_at <= now() then continue; end if;
    select title into v_title from public.invitations where id = r.invitation_id;
    k := public.notif_emit('payment_pending_reminder', r.user_id, jsonb_build_object('order_id', r.order_id, 'paket', r.plan_id, 'judul', coalesce(v_title, '-'),
           'jumlah', 'Rp ' || replace(to_char(r.amount, 'FM999G999G999G999'), ',', '.'), 'batas', to_char(r.expires_at at time zone 'Asia/Jakarta', 'DD-MM-YYYY HH24:MI'),
           'support_email', coalesce(v_sup, 'tim NusaMora melalui menu Bantuan')), 'payrem:' || r.id);
    if k > 0 then update public.payments set reminder_queued_at = now() where id = r.id; end if;
    n := n + k;
  end loop;
  return n;
end $$;
revoke all on function public.enqueue_pending_payment_reminders(int) from public, anon, authenticated;
grant execute on function public.enqueue_pending_payment_reminders(int) to service_role;

-- status pembayaran berubah dari pending: pengingat yang belum terkirim dibatalkan
create or replace function public.notif_cancel_payment_reminder() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if old.status = 'pending' and new.status <> 'pending' then
    update public.notif_outbox set status = 'cancelled', last_error = 'Pembayaran tidak lagi menunggu', updated_at = now()
     where event = 'payment_pending_reminder' and status = 'pending' and dedupe_key like 'payrem:' || new.id::text || ':%';
  end if;
  return new;
exception when others then raise warning 'notif_cancel_payment_reminder: %', sqlerrm; return new;
end $$;
drop trigger if exists notif_cancel_reminder_trg on public.payments;
create trigger notif_cancel_reminder_trg after update of status on public.payments for each row execute function public.notif_cancel_payment_reminder();

-- notif_claim: sama seperti sebelumnya + cek ulang status pembayaran untuk pengingat tepat sebelum dikirim
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
  -- pengingat pembayaran: hanya dikirim bila pembayaran masih pending dan belum kedaluwarsa
  update public.notif_outbox o set status = 'cancelled', last_error = 'Pembayaran tidak lagi menunggu', updated_at = now()
   where o.event = 'payment_pending_reminder' and o.status = 'pending'
     and not exists (select 1 from public.payments p where p.id::text = split_part(o.dedupe_key, ':', 2) and p.status = 'pending' and p.expires_at > now());
  select coalesce(array_agg(id), '{}') into ids from (
    select id from public.notif_outbox where status = 'pending' and next_attempt_at <= now() and (p_channels is null or channel = any(p_channels))
     order by next_attempt_at limit greatest(1, least(coalesce(p_limit, 20), 100)) for update skip locked) q;
  return query update public.notif_outbox set status = 'sending', attempts = attempts + 1, updated_at = now() where id = any(ids) returning *;
end $$;
revoke all on function public.notif_claim(int, text[]) from public, anon, authenticated;
grant execute on function public.notif_claim(int, text[]) to service_role;

----------------------------------------------------------------------------- 8. Konfigurasi notifikasi pembayaran (admin)
-- impor konfigurasi (admin-settings) mengenali kunci baru agar ekspor -> impor tetap utuh
do $$ declare d text; d0 text; begin
  select pg_get_functiondef(p.oid) into d from pg_proc p where p.proname = 'admin_config_import' and p.pronamespace = 'public'::regnamespace;
  if d is null or position('pending_reminder_enabled' in d) > 0 then return; end if;
  d0 := d;
  d := replace(d, $q$'internal_emails','internal_whatsapp') then probs$q$, $q$'internal_emails','internal_whatsapp','support_email','pending_reminder_enabled','pending_reminder_after_minutes') then probs$q$);
  if d = d0 then raise exception 'after_sales_a: pola admin_config_import tidak ditemukan'; end if;
  execute d;
end $$;

create or replace function public.admin_notif_settings_save(p jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare k text; v jsonb; x text;
begin
  if not public.has_perm('notifications.write') then raise exception 'forbidden' using errcode = '42501'; end if;
  for k, v in select * from jsonb_each(p) loop
    if k not in ('email_from_name','email_from_address','email_reply_to','max_attempts','retry_base_minutes','internal_emails','internal_whatsapp','paused',
                 'support_email','pending_reminder_enabled','pending_reminder_after_minutes') then raise exception 'kunci_tidak_dikenal: %', k; end if;
    if k in ('max_attempts') and (jsonb_typeof(v) <> 'number' or (v)::text::numeric not between 1 and 10 or (v)::text::numeric <> trunc((v)::text::numeric)) then raise exception 'max_attempts_tidak_valid'; end if;
    if k in ('retry_base_minutes') and (jsonb_typeof(v) <> 'number' or (v)::text::numeric not between 1 and 1440 or (v)::text::numeric <> trunc((v)::text::numeric)) then raise exception 'retry_base_minutes_tidak_valid'; end if;
    if k = 'pending_reminder_after_minutes' and (jsonb_typeof(v) <> 'number' or (v)::text::numeric not between 5 and 1380 or (v)::text::numeric <> trunc((v)::text::numeric)) then raise exception 'pending_reminder_after_minutes_tidak_valid'; end if;
    if k in ('paused', 'pending_reminder_enabled') and jsonb_typeof(v) <> 'boolean' then raise exception '%_tidak_valid', k; end if;
    if k in ('email_from_name','email_from_address','email_reply_to','support_email') then
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

-- kesiapan notifikasi pembayaran: apa yang sudah aktif dan konfigurasi apa yang masih kosong (tidak mengarang alamat)
create or replace function public.admin_notif_payment_readiness() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v_from text; v_sup text; miss text[] := '{}';
begin
  if not public.has_perm('notifications.read') then raise exception 'forbidden' using errcode = '42501'; end if;
  select coalesce(value #>> '{}', '') into v_from from public.notif_settings where key = 'email_from_address' and jsonb_typeof(value) = 'string';
  select coalesce(value #>> '{}', '') into v_sup from public.notif_settings where key = 'support_email' and jsonb_typeof(value) = 'string';
  if coalesce(v_from, '') = '' then miss := array_append(miss, 'email_from_address'); end if;
  if coalesce(v_sup, '') = '' then miss := array_append(miss, 'support_email'); end if;
  return jsonb_build_object(
    'ready', cardinality(miss) = 0,
    'missing_config', to_jsonb(miss),
    'manual_checks', jsonb_build_array('Domain pengirim terverifikasi di provider email (Resend)', 'Secret provider email terpasang di Edge Function', 'Alamat support_email aktif dan dipantau tim'),
    'rules', coalesce((select jsonb_agg(jsonb_build_object('event', event, 'channel', channel, 'recipient', recipient, 'enabled', enabled) order by event, channel, recipient)
                        from public.notif_rules where event in ('payment_paid', 'payment_failed', 'payment_pending_reminder')), '[]'::jsonb),
    'pending_reminder', jsonb_build_object(
        'enabled', coalesce((select (value #>> '{}')::boolean from public.notif_settings where key = 'pending_reminder_enabled' and jsonb_typeof(value) = 'boolean'), false),
        'after_minutes', coalesce((select (value #>> '{}')::int from public.notif_settings where key = 'pending_reminder_after_minutes' and jsonb_typeof(value) = 'number'), 60),
        'scheduler', 'belum_ada'));
end $$;

-- preset: aktifkan/nonaktifkan email pelanggan payment_paid & payment_failed. Menolak bila konfigurasi belum lengkap.
create or replace function public.admin_notif_payment_preset(p_enable boolean) returns jsonb
language plpgsql security definer set search_path = public as $$
declare rd jsonb;
begin
  if not public.has_perm('notifications.write') then raise exception 'forbidden' using errcode = '42501'; end if;
  rd := public.admin_notif_payment_readiness();
  if coalesce(p_enable, false) and not (rd ->> 'ready')::boolean then
    return jsonb_build_object('ok', false, 'error', 'perlu_konfigurasi', 'missing', rd -> 'missing_config');
  end if;
  perform public.admin_notif_rule_set('payment_paid', 'email', 'customer', coalesce(p_enable, false));
  perform public.admin_notif_rule_set('payment_failed', 'email', 'customer', coalesce(p_enable, false));
  return jsonb_build_object('ok', true, 'enabled', coalesce(p_enable, false));
end $$;
revoke all on function public.admin_notif_payment_readiness(), public.admin_notif_payment_preset(boolean) from public, anon;
grant execute on function public.admin_notif_payment_readiness(), public.admin_notif_payment_preset(boolean) to authenticated;

-- pelanggan: riwayat periode per pembayaran (hanya milik sendiri lewat auth.uid())
create or replace function public.my_invitation_periods(p_invitation uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('order_id', p.order_id, 'kind', p.kind, 'plan_id', p.plan_id, 'status', p.status, 'amount', p.amount, 'refunded_amount', p.refunded_amount,
           'paid_at', p.paid_at, 'period_start', p.period_start, 'period_end', p.period_end) order by p.created_at desc), '[]'::jsonb)
    from public.payments p join public.invitations i on i.id = p.invitation_id
   where p.invitation_id = p_invitation and i.user_id = auth.uid() and p.user_id = auth.uid()
$$;
revoke all on function public.my_invitation_periods(uuid) from public, anon;
grant execute on function public.my_invitation_periods(uuid) to authenticated;
