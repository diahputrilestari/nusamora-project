-- NusaMora: Affiliate & Referral (menu H). Aditif dan idempoten. Jalankan SETELAH admin-schema, dashboard-schema, admin-roles.
--
-- Alur: pengunjung buka ?ref=KODE -> klik tercatat (IP di-hash) -> daftar/login -> aff_attach_referral memvalidasi klik dan jendela atribusi
-- -> invoice pertama lunas -> komisi dihitung (ditahan N hari, atau ditinjau bila ada indikasi fraud) -> masuk saldo bonus
-- -> affiliate ajukan penarikan ke rekening yang sudah diverifikasi -> admin transfer manual dan catat referensi.
-- Program DEFAULT MATI (Coming Soon). Perubahan angka uang hanya lewat fungsi di file ini (dijaga pemicu).

----------------------------------------------------------------------------- 1. Pengaturan program
create table if not exists public.aff_settings (
  key text primary key, value jsonb not null, updated_by uuid, updated_at timestamptz not null default now()
);
alter table public.aff_settings enable row level security;
revoke all on public.aff_settings from anon, authenticated;
grant select on public.aff_settings to authenticated;
drop policy if exists "admin baca" on public.aff_settings;
create policy "admin baca" on public.aff_settings for select to authenticated using (public.has_perm('affiliate.read') and key <> 'salt');

create or replace function public.aff_defaults() returns jsonb language sql immutable as $$
  select jsonb_build_object('program_enabled', false, 'auto_approve', false, 'commission_type', 'percent', 'commission_value', 10,
    'attribution_days', 30, 'hold_days', 14, 'min_withdrawal', 100000, 'require_bank_verified', true, 'fraud_ip_limit', 3, 'fraud_fast_minutes', 10) $$;
create or replace function public.aff_cfg(k text) returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce((select value from public.aff_settings where key = k), public.aff_defaults() -> k) $$;
revoke all on function public.aff_cfg(text) from public, anon, authenticated;

-- Hash sumber (IP/pengunjung) dengan garam acak yang tidak pernah keluar dari database; IP mentah tidak disimpan.
create or replace function public.aff_hash(v text) returns text language plpgsql volatile security definer set search_path = public as $$
declare s text;
begin
  select value #>> '{}' into s from public.aff_settings where key = 'salt';
  if s is null then
    s := encode(sha256(convert_to(gen_random_uuid()::text || clock_timestamp()::text, 'utf8')), 'hex');
    insert into public.aff_settings (key, value) values ('salt', to_jsonb(s)) on conflict (key) do nothing;
    select value #>> '{}' into s from public.aff_settings where key = 'salt';
  end if;
  return left(encode(sha256(convert_to(s || ':' || coalesce(v, ''), 'utf8')), 'hex'), 32);
end $$;
revoke all on function public.aff_hash(text) from public, anon, authenticated;

create or replace function public.aff_req_ip() returns text language sql stable as $$
  select nullif(btrim(coalesce(h ->> 'cf-connecting-ip', h ->> 'x-real-ip', split_part(coalesce(h ->> 'x-forwarded-for', ''), ',', 1))), '')
    from (select coalesce(nullif(current_setting('request.headers', true), ''), '{}')::jsonb h) q $$;
revoke all on function public.aff_req_ip() from public, anon, authenticated;

----------------------------------------------------------------------------- 2. Kolom & tabel
alter table public.affiliates add column if not exists bank_name text;
alter table public.affiliates add column if not exists bank_account_no text;
alter table public.affiliates add column if not exists bank_account_name text;
alter table public.affiliates add column if not exists bank_status text not null default 'none';
alter table public.affiliates add column if not exists bank_note text;
alter table public.affiliates add column if not exists bank_verified_at timestamptz;
alter table public.affiliates add column if not exists bank_verified_by uuid;
alter table public.affiliates add column if not exists commission_type text;
alter table public.affiliates add column if not exists commission_value numeric;
alter table public.affiliates add column if not exists applied_ip_hash text;
alter table public.affiliates add column if not exists status_reason text;
alter table public.affiliates add column if not exists approved_at timestamptz;
alter table public.affiliates add column if not exists approved_by uuid;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'affiliates_bank_status_check') then
    alter table public.affiliates add constraint affiliates_bank_status_check check (bank_status in ('none', 'pending', 'verified', 'rejected'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'affiliates_commission_type_check') then
    alter table public.affiliates add constraint affiliates_commission_type_check check (commission_type is null or commission_type in ('percent', 'fixed'));
  end if;
end $$;

create table if not exists public.affiliate_clicks (
  id uuid primary key default gen_random_uuid(),
  affiliate_id uuid not null references public.affiliates(id) on delete cascade,
  visitor_hash text not null, ip_hash text, landing text,
  created_at timestamptz not null default now()
);
create index if not exists affiliate_clicks_aff_idx on public.affiliate_clicks (affiliate_id, created_at desc);
create index if not exists affiliate_clicks_ip_idx on public.affiliate_clicks (ip_hash, created_at desc);
create index if not exists affiliate_clicks_vis_idx on public.affiliate_clicks (visitor_hash, created_at desc);
alter table public.affiliate_clicks enable row level security;
revoke all on public.affiliate_clicks from anon, authenticated;

alter table public.referrals add column if not exists click_id uuid references public.affiliate_clicks(id) on delete set null;
alter table public.referrals add column if not exists ip_hash text;
alter table public.referrals add column if not exists attributed_at timestamptz not null default now();
alter table public.referrals add column if not exists invoice_id uuid;
alter table public.referrals add column if not exists paid_at timestamptz;
alter table public.referrals add column if not exists commission_status text not null default 'none';
alter table public.referrals add column if not exists commission_base bigint;
alter table public.referrals add column if not exists commission_rate text;
alter table public.referrals add column if not exists commission_available_at timestamptz;
alter table public.referrals add column if not exists fraud_reasons text[] not null default '{}';
alter table public.referrals add column if not exists ledger_id uuid;
alter table public.referrals add column if not exists reviewed_by uuid;
alter table public.referrals add column if not exists reviewed_at timestamptz;
alter table public.referrals add column if not exists review_note text;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'referrals_commission_status_check') then
    alter table public.referrals add constraint referrals_commission_status_check check (commission_status in ('none', 'pending', 'review', 'approved', 'rejected', 'reversed'));
  end if;
end $$;
create unique index if not exists referrals_referred_uniq on public.referrals (referred_user_id) where referred_user_id is not null;
create index if not exists referrals_ip_idx on public.referrals (ip_hash, attributed_at desc);
create index if not exists referrals_cstatus_idx on public.referrals (commission_status, commission_available_at);

alter table public.withdrawals add column if not exists bank_name text;
alter table public.withdrawals add column if not exists bank_account_no text;
alter table public.withdrawals add column if not exists bank_account_name text;
alter table public.withdrawals add column if not exists bank_verified boolean not null default false;
alter table public.withdrawals add column if not exists note text;
alter table public.withdrawals add column if not exists payout_ref text;
alter table public.withdrawals add column if not exists processed_by uuid;
alter table public.withdrawals add column if not exists processed_at timestamptz;

----------------------------------------------------------------------------- 3. Penjaga integritas uang
-- Kolom uang/status hanya boleh berubah lewat fungsi resmi di file ini (yang menandai nm.aff_rpc), bukan lewat tulis langsung dari klien.
create or replace function public.aff_guard() returns trigger language plpgsql as $$
declare n jsonb := case when tg_op = 'DELETE' then null else to_jsonb(new) end; o jsonb := case when tg_op = 'INSERT' then null else to_jsonb(old) end; bad boolean := false;
begin
  if public.admin_api_call() and coalesce(current_setting('nm.aff_rpc', true), '') <> '1' then
    if tg_table_name = 'referrals' then
      bad := tg_op <> 'UPDATE' or n ->> 'commission' is distinct from o ->> 'commission' or n ->> 'commission_status' is distinct from o ->> 'commission_status' or n ->> 'status' is distinct from o ->> 'status';
    elsif tg_table_name = 'withdrawals' then
      bad := tg_op <> 'UPDATE' or n ->> 'status' is distinct from o ->> 'status' or n ->> 'amount' is distinct from o ->> 'amount';
    elsif tg_table_name = 'affiliates' then
      bad := tg_op <> 'UPDATE' or n ->> 'bank_status' is distinct from o ->> 'bank_status' or n ->> 'bank_account_no' is distinct from o ->> 'bank_account_no'
          or n ->> 'user_id' is distinct from o ->> 'user_id' or n ->> 'code' is distinct from o ->> 'code' or n ->> 'commission_value' is distinct from o ->> 'commission_value';
    end if;
    if bad then raise exception 'gunakan_menu_resmi'; end if;
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end $$;
do $$ declare t text; begin
  foreach t in array array['referrals', 'withdrawals', 'affiliates'] loop
    execute format('drop trigger if exists aff_guard_trg on public.%I', t);
    execute format('create trigger aff_guard_trg before insert or update or delete on public.%I for each row execute function public.aff_guard()', t);
  end loop;
end $$;

----------------------------------------------------------------------------- 4. Deteksi fraud
create or replace function public.aff_fraud_reasons(p_ref uuid) returns text[] language plpgsql stable security definer set search_path = public as $$
declare r public.referrals; a public.affiliates; out text[] := '{}'; v_lim int := coalesce((public.aff_cfg('fraud_ip_limit') #>> '{}')::int, 3); v_fast int := coalesce((public.aff_cfg('fraud_fast_minutes') #>> '{}')::int, 10);
        w_a text; w_r text;
begin
  select * into r from public.referrals where id = p_ref; if not found then return out; end if;
  select * into a from public.affiliates where id = r.affiliate_id;
  if a.status <> 'aktif' then out := array_append(out, 'affiliate_tidak_aktif'); end if;
  if r.ip_hash is not null and a.applied_ip_hash is not null and r.ip_hash = a.applied_ip_hash then out := array_append(out, 'ip_sama_dengan_affiliate'); end if;
  if r.ip_hash is not null and (select count(*) from public.referrals x where x.ip_hash = r.ip_hash and x.attributed_at > r.attributed_at - interval '24 hours' and x.attributed_at <= r.attributed_at) > v_lim then out := array_append(out, 'ip_banyak_pendaftar'); end if;
  if v_fast > 0 and r.paid_at is not null and r.paid_at < r.attributed_at + make_interval(mins => v_fast) then out := array_append(out, 'bayar_terlalu_cepat'); end if;
  if a.bank_account_no is not null and exists (select 1 from public.affiliates y where y.id <> a.id and y.bank_account_no = a.bank_account_no) then out := array_append(out, 'rekening_dipakai_banyak_affiliate'); end if;
  select regexp_replace(coalesce(whatsapp, ''), '\D', '', 'g') into w_a from public.profiles where id = a.user_id;
  select regexp_replace(coalesce(whatsapp, ''), '\D', '', 'g') into w_r from public.profiles where id = r.referred_user_id;
  if w_a <> '' and w_a = w_r then out := array_append(out, 'whatsapp_sama'); end if;
  if r.click_id is not null and (select count(*) from public.affiliate_clicks c where c.visitor_hash = (select visitor_hash from public.affiliate_clicks where id = r.click_id) and c.created_at > r.attributed_at - interval '1 hour' and c.created_at <= r.attributed_at) > 30 then out := array_append(out, 'klik_beruntun'); end if;
  return out;
end $$;
revoke all on function public.aff_fraud_reasons(uuid) from public, anon, authenticated;

----------------------------------------------------------------------------- 5. Komisi: konversi, pelepasan, refund
create or replace function public.aff_on_paid() returns trigger language plpgsql security definer set search_path = public as $$
declare r public.referrals; a public.affiliates; v_type text; v_val numeric; v_com bigint; reasons text[]; hold int := coalesce((public.aff_cfg('hold_days') #>> '{}')::int, 14);
begin
  begin
    perform set_config('nm.aff_rpc', '1', true);
    if new.status <> 'lunas' or coalesce(new.amount, 0) <= 0 then return new; end if;
    if tg_op = 'UPDATE' and old.status = 'lunas' then return new; end if;
    select * into r from public.referrals where referred_user_id = new.user_id and commission_status = 'none' for update;
    if not found then return new; end if;
    select * into a from public.affiliates where id = r.affiliate_id;
    v_type := coalesce(a.commission_type, public.aff_cfg('commission_type') #>> '{}');
    v_val := coalesce(a.commission_value, (public.aff_cfg('commission_value') #>> '{}')::numeric);
    v_com := case when v_type = 'percent' then floor(new.amount * v_val / 100) else least(v_val::bigint, new.amount) end;
    update public.referrals set status = 'berbayar', paid_at = coalesce(new.paid_at, now()), invoice_id = new.id, commission = greatest(v_com, 0), commission_base = new.amount,
      commission_rate = case when v_type = 'percent' then trim_scale(v_val)::text || '%' else 'Rp ' || v_val::bigint::text end where id = r.id;
    reasons := public.aff_fraud_reasons(r.id);
    update public.referrals set fraud_reasons = reasons,
      commission_status = case when v_com <= 0 then 'rejected' when cardinality(reasons) > 0 then 'review' else 'pending' end,
      commission_available_at = now() + make_interval(days => hold) where id = r.id;
    if cardinality(reasons) > 0 then
      insert into public.security_events (kind, actor, detail) values ('aff_fraud_flag', a.user_id::text, jsonb_build_object('referral', r.id, 'reasons', to_jsonb(reasons)));
    end if;
  exception when others then
    insert into public.security_events (kind, actor, detail) values ('aff_trigger_error', new.user_id::text, jsonb_build_object('fn', 'aff_on_paid', 'error', left(sqlerrm, 200)));
  end;
  return new;
end $$;
drop trigger if exists aff_paid_trg on public.invoices;
create trigger aff_paid_trg after insert or update of status on public.invoices for each row execute function public.aff_on_paid();

create or replace function public.aff_on_refund() returns trigger language plpgsql security definer set search_path = public as $$
declare r public.referrals; a public.affiliates;
begin
  begin
    perform set_config('nm.aff_rpc', '1', true);
    if new.status <> 'refund' or old.status = 'refund' then return new; end if;
    select * into r from public.referrals where invoice_id = new.id for update;
    if not found or r.commission_status in ('reversed', 'rejected', 'none') then return new; end if;
    if r.commission_status = 'approved' then
      select * into a from public.affiliates where id = r.affiliate_id;
      insert into public.bonus_history (user_id, description, amount) values (a.user_id, 'Pembatalan komisi referral (refund ' || new.number || ')', -r.commission);
    end if;
    update public.referrals set commission_status = 'reversed', status = 'batal', reviewed_at = now(), review_note = coalesce(review_note, 'Otomatis: pembayaran direfund') where id = r.id;
  exception when others then
    insert into public.security_events (kind, actor, detail) values ('aff_trigger_error', new.user_id::text, jsonb_build_object('fn', 'aff_on_refund', 'error', left(sqlerrm, 200)));
  end;
  return new;
end $$;
drop trigger if exists aff_refund_trg on public.invoices;
create trigger aff_refund_trg after update of status on public.invoices for each row execute function public.aff_on_refund();

-- Melepas komisi yang masa tahannya habis ke saldo bonus. Dipanggil malas (saat affiliate/admin membuka data) dan oleh tombol admin.
create or replace function public.aff_release_due(p_user uuid default null) returns int
language plpgsql security definer set search_path = public as $$
declare r record; n int := 0; v_uid uuid; lid uuid;
begin
  perform set_config('nm.aff_rpc', '1', true);
  for r in select rf.id, rf.commission, rf.affiliate_id, a.user_id, a.status as astatus, inv.status as istatus
             from public.referrals rf join public.affiliates a on a.id = rf.affiliate_id left join public.invoices inv on inv.id = rf.invoice_id
            where rf.commission_status = 'pending' and rf.commission_available_at <= now() and (p_user is null or a.user_id = p_user)
            order by rf.commission_available_at limit 200 for update of rf skip locked loop
    if r.istatus is distinct from 'lunas' then
      update public.referrals set commission_status = 'reversed', status = 'batal', review_note = 'Otomatis: invoice tidak lunas' where id = r.id;
    elsif r.astatus <> 'aktif' then
      update public.referrals set commission_status = 'review', fraud_reasons = array_append(fraud_reasons, 'affiliate_tidak_aktif') where id = r.id;
    else
      insert into public.bonus_history (user_id, description, amount) values (r.user_id, 'Komisi referral', r.commission) returning id into lid;
      update public.referrals set commission_status = 'approved', ledger_id = lid where id = r.id; n := n + 1;
    end if;
  end loop;
  return n;
end $$;
revoke all on function public.aff_release_due(uuid) from public, anon;
grant execute on function public.aff_release_due(uuid) to authenticated, service_role;

----------------------------------------------------------------------------- 6. Sisi publik / pelanggan
create or replace function public.aff_public_config() returns jsonb language plpgsql stable security definer set search_path = public as $$
declare t text := public.aff_cfg('commission_type') #>> '{}'; v numeric := (public.aff_cfg('commission_value') #>> '{}')::numeric;
begin
  return jsonb_build_object('enabled', coalesce((public.aff_cfg('program_enabled') #>> '{}')::boolean, false),
    'commission_label', case when t = 'percent' then trim_scale(v)::text || '%' else 'Rp ' || v::bigint::text end,
    'commission_type', t, 'attribution_days', (public.aff_cfg('attribution_days') #>> '{}')::int, 'hold_days', (public.aff_cfg('hold_days') #>> '{}')::int,
    'min_withdrawal', (public.aff_cfg('min_withdrawal') #>> '{}')::bigint, 'require_bank_verified', coalesce((public.aff_cfg('require_bank_verified') #>> '{}')::boolean, true));
end $$;
revoke all on function public.aff_public_config() from public;
grant execute on function public.aff_public_config() to anon, authenticated;

create or replace function public.aff_track_click(p_code text, p_visitor text, p_landing text default null) returns uuid
language plpgsql security definer set search_path = public as $$
declare a public.affiliates; ip text := public.aff_req_ip(); iph text; vh text; cid uuid;
begin
  perform set_config('nm.aff_rpc', '1', true);
  if not coalesce((public.aff_cfg('program_enabled') #>> '{}')::boolean, false) then return null; end if;
  if p_code is null or upper(p_code) !~ '^[A-Z0-9]{6,12}$' or p_visitor is null or p_visitor !~ '^[A-Za-z0-9-]{8,64}$' then return null; end if;
  select * into a from public.affiliates where code = upper(p_code) and status = 'aktif';
  if not found then return null; end if;
  iph := case when ip is null then null else public.aff_hash(ip) end; vh := public.aff_hash(p_visitor);
  if iph is not null and (select count(*) from public.affiliate_clicks where ip_hash = iph and created_at > now() - interval '1 hour') >= 200 then return null; end if;
  select id into cid from public.affiliate_clicks where affiliate_id = a.id and visitor_hash = vh and created_at > now() - interval '10 minutes' order by created_at desc limit 1;
  if cid is not null then return cid; end if;
  insert into public.affiliate_clicks (affiliate_id, visitor_hash, ip_hash, landing) values (a.id, vh, iph, left(regexp_replace(coalesce(p_landing, ''), '[^A-Za-z0-9/_.\-]', '', 'g'), 120)) returning id into cid;
  delete from public.affiliate_clicks where id in (select id from public.affiliate_clicks where created_at < now() - interval '180 days' limit 200);
  return cid;
end $$;
revoke all on function public.aff_track_click(text, text, text) from public;
grant execute on function public.aff_track_click(text, text, text) to anon, authenticated;

create or replace function public.aff_attach_referral(p_code text, p_click uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); a public.affiliates; c public.affiliate_clicks; u_created timestamptz; win int := (public.aff_cfg('attribution_days') #>> '{}')::int; iph text := null; ip text := public.aff_req_ip();
begin
  perform set_config('nm.aff_rpc', '1', true);
  if uid is null then return jsonb_build_object('ok', false, 'reason', 'belum_masuk'); end if;
  if not coalesce((public.aff_cfg('program_enabled') #>> '{}')::boolean, false) then return jsonb_build_object('ok', false, 'reason', 'program_belum_dibuka'); end if;
  if exists (select 1 from public.referrals where referred_user_id = uid) then return jsonb_build_object('ok', false, 'reason', 'sudah_tercatat'); end if;
  if p_code is null or upper(p_code) !~ '^[A-Z0-9]{6,12}$' or p_click is null then return jsonb_build_object('ok', false, 'reason', 'data_tidak_valid'); end if;
  select * into a from public.affiliates where code = upper(p_code) and status = 'aktif';
  if not found then return jsonb_build_object('ok', false, 'reason', 'kode_tidak_dikenal'); end if;
  if a.user_id = uid then return jsonb_build_object('ok', false, 'reason', 'tidak_boleh_diri_sendiri'); end if;
  select * into c from public.affiliate_clicks where id = p_click and affiliate_id = a.id;
  if not found then return jsonb_build_object('ok', false, 'reason', 'klik_tidak_ditemukan'); end if;
  if c.created_at < now() - make_interval(days => win) then return jsonb_build_object('ok', false, 'reason', 'di_luar_jendela_atribusi'); end if;
  select created_at into u_created from auth.users where id = uid;
  if u_created < c.created_at - interval '10 minutes' then return jsonb_build_object('ok', false, 'reason', 'bukan_pendaftar_baru'); end if;
  if exists (select 1 from public.invoices where user_id = uid and status = 'lunas') then return jsonb_build_object('ok', false, 'reason', 'sudah_pernah_membayar'); end if;
  if ip is not null then iph := public.aff_hash(ip); end if;
  insert into public.referrals (affiliate_id, referred_user_id, status, click_id, ip_hash, attributed_at) values (a.id, uid, 'terdaftar', c.id, iph, now());
  return jsonb_build_object('ok', true);
exception when unique_violation then return jsonb_build_object('ok', false, 'reason', 'sudah_tercatat');
end $$;
revoke all on function public.aff_attach_referral(text, uuid) from public, anon;
grant execute on function public.aff_attach_referral(text, uuid) to authenticated;

create or replace function public.aff_register() returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); a public.affiliates; cd text; i int := 0; ip text := public.aff_req_ip(); auto boolean := coalesce((public.aff_cfg('auto_approve') #>> '{}')::boolean, false);
        alpha text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
begin
  perform set_config('nm.aff_rpc', '1', true);
  if uid is null then raise exception 'forbidden' using errcode = '42501'; end if;
  if not coalesce((public.aff_cfg('program_enabled') #>> '{}')::boolean, false) then raise exception 'program_belum_dibuka'; end if;
  if not exists (select 1 from public.profiles where id = uid and status = 'aktif') then raise exception 'akun_tidak_aktif'; end if;
  select * into a from public.affiliates where user_id = uid;
  if found then return jsonb_build_object('code', a.code, 'status', a.status); end if;
  loop
    cd := (select string_agg(substr(alpha, 1 + floor(random() * 32)::int, 1), '') from generate_series(1, 8));
    exit when not exists (select 1 from public.affiliates where code = cd);
    i := i + 1; if i > 20 then raise exception 'gagal_membuat_kode'; end if;
  end loop;
  insert into public.affiliates (user_id, code, status, applied_ip_hash, approved_at) values (uid, cd, case when auto then 'aktif' else 'pending' end, case when ip is null then null else public.aff_hash(ip) end, case when auto then now() end)
  returning * into a;
  return jsonb_build_object('code', a.code, 'status', a.status);
end $$;
revoke all on function public.aff_register() from public, anon;
grant execute on function public.aff_register() to authenticated;

create or replace function public.aff_mask(v text) returns text language sql immutable as $$
  select case when v is null or v = '' then null else repeat('•', greatest(char_length(v) - 4, 0)) || right(v, 4) end $$;

create or replace function public.aff_me() returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); a public.affiliates; bal bigint;
begin
  if uid is null then raise exception 'forbidden' using errcode = '42501'; end if;
  select * into a from public.affiliates where user_id = uid;
  if not found then return jsonb_build_object('affiliate', null, 'config', public.aff_public_config()); end if;
  perform public.aff_release_due(uid);
  select coalesce(bonus_balance, 0) into bal from public.wallets where user_id = uid;
  return jsonb_build_object('config', public.aff_public_config(),
    'affiliate', jsonb_build_object('code', a.code, 'status', a.status, 'status_reason', a.status_reason, 'bank_status', a.bank_status, 'bank_name', a.bank_name,
      'bank_account_mask', public.aff_mask(a.bank_account_no), 'bank_account_name', a.bank_account_name, 'bank_note', case when a.bank_status = 'rejected' then a.bank_note end,
      'rate', case when a.commission_value is null then null else jsonb_build_object('type', a.commission_type, 'value', a.commission_value) end),
    'stats', jsonb_build_object('clicks', (select count(*) from public.affiliate_clicks where affiliate_id = a.id),
      'signups', (select count(*) from public.referrals where affiliate_id = a.id),
      'paid', (select count(*) from public.referrals where affiliate_id = a.id and status = 'berbayar'),
      'commission_pending', (select coalesce(sum(commission), 0) from public.referrals where affiliate_id = a.id and commission_status in ('pending', 'review')),
      'commission_approved', (select coalesce(sum(commission), 0) from public.referrals where affiliate_id = a.id and commission_status = 'approved')),
    'balance', coalesce(bal, 0),
    'recent', coalesce((select jsonb_agg(jsonb_build_object('at', x.attributed_at, 'status', x.status, 'commission', x.commission, 'commission_status', case when x.commission_status = 'review' then 'pending' else x.commission_status end,
        'available_at', x.commission_available_at, 'who', left(coalesce(p.full_name, 'Pengguna'), 1) || '***') order by x.attributed_at desc)
        from (select * from public.referrals where affiliate_id = a.id order by attributed_at desc limit 20) x left join public.profiles p on p.id = x.referred_user_id), '[]'::jsonb),
    'pending_withdrawal', exists (select 1 from public.withdrawals where user_id = uid and status = 'diproses'));
end $$;
revoke all on function public.aff_me() from public, anon;
grant execute on function public.aff_me() to authenticated;

create or replace function public.aff_save_bank(p_bank text, p_no text, p_name text) returns void language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); a public.affiliates;
begin
  perform set_config('nm.aff_rpc', '1', true);
  if uid is null then raise exception 'forbidden' using errcode = '42501'; end if;
  p_bank := btrim(coalesce(p_bank, '')); p_no := regexp_replace(coalesce(p_no, ''), '\s', '', 'g'); p_name := btrim(coalesce(p_name, ''));
  if char_length(p_bank) not between 2 and 40 then raise exception 'bank_tidak_valid'; end if;
  if p_no !~ '^[0-9]{6,24}$' then raise exception 'nomor_rekening_tidak_valid'; end if;
  if char_length(p_name) not between 2 and 60 then raise exception 'nama_rekening_tidak_valid'; end if;
  select * into a from public.affiliates where user_id = uid for update;
  if not found then raise exception 'bukan_affiliate'; end if;
  if exists (select 1 from public.withdrawals where user_id = uid and status = 'diproses') then raise exception 'ada_penarikan_berjalan'; end if;
  update public.affiliates set bank_name = p_bank, bank_account_no = p_no, bank_account_name = p_name, bank_status = 'pending', bank_note = null, bank_verified_at = null, bank_verified_by = null where id = a.id;
end $$;
revoke all on function public.aff_save_bank(text, text, text) from public, anon;
grant execute on function public.aff_save_bank(text, text, text) to authenticated;

create or replace function public.aff_request_withdrawal(p_amount bigint) returns uuid language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); a public.affiliates; bal bigint; minw bigint := (public.aff_cfg('min_withdrawal') #>> '{}')::bigint; need boolean := coalesce((public.aff_cfg('require_bank_verified') #>> '{}')::boolean, true); wid uuid;
begin
  perform set_config('nm.aff_rpc', '1', true);
  if uid is null then raise exception 'forbidden' using errcode = '42501'; end if;
  select * into a from public.affiliates where user_id = uid for update;
  if not found then raise exception 'bukan_affiliate'; end if;
  if a.status <> 'aktif' then raise exception 'affiliate_tidak_aktif'; end if;
  if a.bank_account_no is null then raise exception 'rekening_belum_diisi'; end if;
  if need and a.bank_status <> 'verified' then raise exception 'rekening_belum_terverifikasi'; end if;
  if p_amount is null or p_amount < minw then raise exception 'di_bawah_minimum'; end if;
  if exists (select 1 from public.withdrawals where user_id = uid and status = 'diproses') then raise exception 'ada_penarikan_berjalan'; end if;
  perform public.aff_release_due(uid);
  insert into public.wallets (user_id, bonus_balance) values (uid, 0) on conflict do nothing;
  select bonus_balance into bal from public.wallets where user_id = uid for update;
  if p_amount > coalesce(bal, 0) then raise exception 'saldo_tidak_cukup'; end if;
  insert into public.withdrawals (user_id, amount, destination, status, bank_name, bank_account_no, bank_account_name, bank_verified)
  values (uid, p_amount, a.bank_name || ' ' || public.aff_mask(a.bank_account_no) || ' a.n. ' || a.bank_account_name, 'diproses', a.bank_name, a.bank_account_no, a.bank_account_name, a.bank_status = 'verified') returning id into wid;
  insert into public.bonus_history (user_id, description, amount) values (uid, 'Penarikan saldo', -p_amount);
  return wid;
end $$;
revoke all on function public.aff_request_withdrawal(bigint) from public, anon;
grant execute on function public.aff_request_withdrawal(bigint) to authenticated;

----------------------------------------------------------------------------- 7. Admin
create or replace function public.admin_aff_settings_get() returns jsonb language plpgsql stable security definer set search_path = public as $$
declare k text; o jsonb := '{}'::jsonb;
begin
  if not public.has_perm('affiliate.read') then raise exception 'forbidden' using errcode = '42501'; end if;
  for k in select jsonb_object_keys(public.aff_defaults()) loop o := o || jsonb_build_object(k, public.aff_cfg(k)); end loop;
  return o;
end $$;

create or replace function public.admin_aff_settings_save(p_vals jsonb) returns void language plpgsql security definer set search_path = public as $$
declare k text; v jsonb; cur jsonb; ty text; cv numeric;
begin
  perform set_config('nm.aff_rpc', '1', true);
  if not public.has_perm('affiliate.write') then raise exception 'forbidden' using errcode = '42501'; end if;
  if jsonb_typeof(p_vals) <> 'object' then raise exception 'format_tidak_valid'; end if;
  for k, v in select * from jsonb_each(p_vals) loop
    if not public.aff_defaults() ? k then raise exception 'kunci_tidak_dikenal'; end if;
    if jsonb_typeof(v) <> jsonb_typeof(public.aff_defaults() -> k) and not (k = 'commission_value' and jsonb_typeof(v) = 'number') then raise exception '%_tidak_valid', k; end if;
    if k = 'commission_type' and (v #>> '{}') not in ('percent', 'fixed') then raise exception 'commission_type_tidak_valid'; end if;
    if k = 'attribution_days' and not (v #>> '{}')::numeric between 1 and 180 then raise exception 'attribution_days_tidak_valid'; end if;
    if k = 'hold_days' and not (v #>> '{}')::numeric between 0 and 90 then raise exception 'hold_days_tidak_valid'; end if;
    if k = 'min_withdrawal' and not (v #>> '{}')::numeric between 10000 and 10000000 then raise exception 'min_withdrawal_tidak_valid'; end if;
    if k = 'fraud_ip_limit' and not (v #>> '{}')::numeric between 1 and 50 then raise exception 'fraud_ip_limit_tidak_valid'; end if;
    if k = 'fraud_fast_minutes' and not (v #>> '{}')::numeric between 0 and 1440 then raise exception 'fraud_fast_minutes_tidak_valid'; end if;
    if k in ('attribution_days', 'hold_days', 'min_withdrawal', 'fraud_ip_limit', 'fraud_fast_minutes') and (v #>> '{}')::numeric <> floor((v #>> '{}')::numeric) then raise exception '%_tidak_valid', k; end if;
  end loop;
  ty := coalesce(p_vals #>> '{commission_type}', public.aff_cfg('commission_type') #>> '{}');
  cv := coalesce((p_vals #>> '{commission_value}')::numeric, (public.aff_cfg('commission_value') #>> '{}')::numeric);
  if ty = 'percent' and not cv between 0.5 and 50 then raise exception 'commission_value_tidak_valid'; end if;
  if ty = 'fixed' and not (cv between 1000 and 5000000 and cv = floor(cv)) then raise exception 'commission_value_tidak_valid'; end if;
  for k, v in select * from jsonb_each(p_vals) loop
    cur := public.aff_cfg(k);
    insert into public.aff_settings (key, value, updated_by) values (k, v, auth.uid()) on conflict (key) do update set value = excluded.value, updated_by = excluded.updated_by, updated_at = now();
    if cur is distinct from v then insert into public.audit_logs (actor_id, action, table_name, row_id, summary) values (auth.uid(), 'update', 'aff_settings', k, jsonb_build_object(k, jsonb_build_array(cur, v))); end if;
  end loop;
end $$;

create or replace function public.admin_aff_overview() returns jsonb language plpgsql security definer set search_path = public as $$
declare r jsonb;
begin
  if not public.has_perm('affiliate.read') then raise exception 'forbidden' using errcode = '42501'; end if;
  select jsonb_build_object('enabled', coalesce((public.aff_cfg('program_enabled') #>> '{}')::boolean, false),
    'affiliates', jsonb_build_object('aktif', count(*) filter (where status = 'aktif'), 'pending', count(*) filter (where status = 'pending'), 'suspended', count(*) filter (where status = 'suspended'),
       'bank_pending', count(*) filter (where bank_status = 'pending')))
    into r from public.affiliates;
  return r || jsonb_build_object(
    'clicks_30d', (select count(*) from public.affiliate_clicks where created_at > now() - interval '30 days'),
    'signups_30d', (select count(*) from public.referrals where attributed_at > now() - interval '30 days'),
    'paid_30d', (select count(*) from public.referrals where paid_at > now() - interval '30 days'),
    'commission', jsonb_build_object('pending', (select coalesce(sum(commission), 0) from public.referrals where commission_status = 'pending'),
       'review', (select coalesce(sum(commission), 0) from public.referrals where commission_status = 'review'),
       'approved', (select coalesce(sum(commission), 0) from public.referrals where commission_status = 'approved')),
    'review_count', (select count(*) from public.referrals where commission_status = 'review'),
    'withdrawals', jsonb_build_object('waiting', (select count(*) from public.withdrawals where status = 'diproses'), 'waiting_amount', (select coalesce(sum(amount), 0) from public.withdrawals where status = 'diproses'),
       'paid_amount', (select coalesce(sum(amount), 0) from public.withdrawals where status = 'berhasil')),
    'top', coalesce((select jsonb_agg(t) from (select a.code, count(rf.id) as signups, count(rf.id) filter (where rf.status = 'berbayar') as paid, coalesce(sum(rf.commission) filter (where rf.commission_status = 'approved'), 0) as commission
        from public.affiliates a left join public.referrals rf on rf.affiliate_id = a.id group by a.code order by paid desc, signups desc limit 5) t), '[]'::jsonb));
end $$;

create or replace function public.admin_aff_list(p_status text default null, p_bank text default null, p_q text default null, p_limit int default 25, p_offset int default 0) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare q text := nullif(btrim(coalesce(p_q, '')), ''); pat text; v_total bigint; v_rows jsonb;
begin
  if not public.has_perm('affiliate.read') then raise exception 'forbidden' using errcode = '42501'; end if;
  pat := case when q is null then null else '%' || replace(replace(replace(q, '\', '\\'), '%', '\%'), '_', '\_') || '%' end;
  select count(*) into v_total from public.affiliates a join public.profiles p on p.id = a.user_id join auth.users u on u.id = a.user_id
   where (p_status is null or a.status = p_status) and (p_bank is null or a.bank_status = p_bank) and (pat is null or a.code ilike pat or p.full_name ilike pat or u.email ilike pat);
  select coalesce(jsonb_agg(to_jsonb(z) order by z.created_at desc), '[]'::jsonb) into v_rows from (
    select a.id, a.code, a.status, a.bank_status, a.bank_name, public.aff_mask(a.bank_account_no) as bank_mask, a.created_at, p.full_name as name, u.email::text as email,
           (a.commission_value is not null) as custom_rate,
           (select count(*) from public.affiliate_clicks c where c.affiliate_id = a.id) as clicks,
           (select count(*) from public.referrals r where r.affiliate_id = a.id) as signups,
           (select count(*) from public.referrals r where r.affiliate_id = a.id and r.status = 'berbayar') as paid,
           (select coalesce(sum(r.commission), 0) from public.referrals r where r.affiliate_id = a.id and r.commission_status = 'approved') as commission,
           (select coalesce(bonus_balance, 0) from public.wallets w where w.user_id = a.user_id) as balance,
           (select count(*) from public.referrals r where r.affiliate_id = a.id and r.commission_status = 'review') as in_review
      from public.affiliates a join public.profiles p on p.id = a.user_id join auth.users u on u.id = a.user_id
     where (p_status is null or a.status = p_status) and (p_bank is null or a.bank_status = p_bank) and (pat is null or a.code ilike pat or p.full_name ilike pat or u.email ilike pat)
     order by a.created_at desc limit greatest(1, least(coalesce(p_limit, 25), 200)) offset greatest(0, coalesce(p_offset, 0))) z;
  return jsonb_build_object('total', v_total, 'rows', v_rows);
end $$;

create or replace function public.admin_aff_detail(p_id uuid) returns jsonb language plpgsql stable security definer set search_path = public as $$
declare a public.affiliates; v_full boolean := public.has_perm('affiliate.write'); p public.profiles; em text;
begin
  if not public.has_perm('affiliate.read') then raise exception 'forbidden' using errcode = '42501'; end if;
  select * into a from public.affiliates where id = p_id; if not found then raise exception 'affiliate_tidak_ditemukan'; end if;
  select * into p from public.profiles where id = a.user_id; select email::text into em from auth.users where id = a.user_id;
  return jsonb_build_object('id', a.id, 'code', a.code, 'status', a.status, 'status_reason', a.status_reason, 'created_at', a.created_at, 'approved_at', a.approved_at, 'name', p.full_name, 'email', em, 'whatsapp', p.whatsapp,
    'rate', jsonb_build_object('type', a.commission_type, 'value', a.commission_value),
    'bank', jsonb_build_object('status', a.bank_status, 'name', a.bank_name, 'account_no', case when v_full then a.bank_account_no else public.aff_mask(a.bank_account_no) end, 'mask', public.aff_mask(a.bank_account_no),
       'account_name', a.bank_account_name, 'note', a.bank_note, 'verified_at', a.bank_verified_at,
       'name_match', case when a.bank_account_name is null or p.full_name is null then null else lower(regexp_replace(a.bank_account_name, '\s+', ' ', 'g')) = lower(regexp_replace(p.full_name, '\s+', ' ', 'g')) end,
       'shared_with', (select count(*) from public.affiliates y where y.id <> a.id and a.bank_account_no is not null and y.bank_account_no = a.bank_account_no)),
    'stats', jsonb_build_object('clicks', (select count(*) from public.affiliate_clicks where affiliate_id = a.id), 'clicks_30d', (select count(*) from public.affiliate_clicks where affiliate_id = a.id and created_at > now() - interval '30 days'),
       'signups', (select count(*) from public.referrals where affiliate_id = a.id), 'paid', (select count(*) from public.referrals where affiliate_id = a.id and status = 'berbayar'),
       'commission_pending', (select coalesce(sum(commission), 0) from public.referrals where affiliate_id = a.id and commission_status in ('pending', 'review')),
       'commission_approved', (select coalesce(sum(commission), 0) from public.referrals where affiliate_id = a.id and commission_status = 'approved'),
       'withdrawn', (select coalesce(sum(amount), 0) from public.withdrawals where user_id = a.user_id and status = 'berhasil'),
       'balance', (select coalesce(bonus_balance, 0) from public.wallets where user_id = a.user_id)));
end $$;

create or replace function public.admin_aff_set_status(p_id uuid, p_status text, p_reason text default null) returns void language plpgsql security definer set search_path = public as $$
declare a public.affiliates;
begin
  perform set_config('nm.aff_rpc', '1', true);
  if not public.has_perm('affiliate.write') then raise exception 'forbidden' using errcode = '42501'; end if;
  select * into a from public.affiliates where id = p_id for update; if not found then raise exception 'affiliate_tidak_ditemukan'; end if;
  if p_status not in ('aktif', 'suspended') then raise exception 'status_tidak_valid'; end if;
  if p_status = 'suspended' and char_length(btrim(coalesce(p_reason, ''))) < 3 then raise exception 'alasan_wajib'; end if;
  update public.affiliates set status = p_status, status_reason = case when p_status = 'suspended' then left(btrim(p_reason), 200) end,
    approved_at = case when p_status = 'aktif' and approved_at is null then now() else approved_at end, approved_by = case when p_status = 'aktif' and approved_by is null then auth.uid() else approved_by end where id = p_id;
end $$;

create or replace function public.admin_aff_bank_review(p_id uuid, p_action text, p_note text default null) returns void language plpgsql security definer set search_path = public as $$
declare a public.affiliates;
begin
  perform set_config('nm.aff_rpc', '1', true);
  if not public.has_perm('affiliate.write') then raise exception 'forbidden' using errcode = '42501'; end if;
  select * into a from public.affiliates where id = p_id for update; if not found then raise exception 'affiliate_tidak_ditemukan'; end if;
  if a.bank_status <> 'pending' then raise exception 'rekening_tidak_menunggu'; end if;
  if p_action = 'verify' then
    update public.affiliates set bank_status = 'verified', bank_verified_at = now(), bank_verified_by = auth.uid(), bank_note = nullif(left(btrim(coalesce(p_note, '')), 200), '') where id = p_id;
  elsif p_action = 'reject' then
    if char_length(btrim(coalesce(p_note, ''))) < 3 then raise exception 'alasan_wajib'; end if;
    update public.affiliates set bank_status = 'rejected', bank_note = left(btrim(p_note), 200), bank_verified_at = null, bank_verified_by = null where id = p_id;
  else raise exception 'aksi_tidak_valid'; end if;
end $$;

create or replace function public.admin_aff_set_rate(p_id uuid, p_type text, p_value numeric) returns void language plpgsql security definer set search_path = public as $$
begin
  perform set_config('nm.aff_rpc', '1', true);
  if not public.has_perm('affiliate.write') then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_type is null and p_value is null then
    update public.affiliates set commission_type = null, commission_value = null where id = p_id;
  else
    if p_type not in ('percent', 'fixed') then raise exception 'commission_type_tidak_valid'; end if;
    if p_type = 'percent' and not p_value between 0.5 and 50 then raise exception 'commission_value_tidak_valid'; end if;
    if p_type = 'fixed' and not (p_value between 1000 and 5000000 and p_value = floor(p_value)) then raise exception 'commission_value_tidak_valid'; end if;
    update public.affiliates set commission_type = p_type, commission_value = p_value where id = p_id;
  end if;
  if not found then raise exception 'affiliate_tidak_ditemukan'; end if;
end $$;

create or replace function public.admin_aff_referrals(p_cstatus text default null, p_aff uuid default null, p_q text default null, p_limit int default 25, p_offset int default 0) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare q text := nullif(btrim(coalesce(p_q, '')), ''); pat text; v_total bigint; v_rows jsonb;
begin
  if not public.has_perm('affiliate.read') then raise exception 'forbidden' using errcode = '42501'; end if;
  pat := case when q is null then null else '%' || replace(replace(replace(q, '\', '\\'), '%', '\%'), '_', '\_') || '%' end;
  select count(*) into v_total from public.referrals r join public.affiliates a on a.id = r.affiliate_id left join public.profiles p on p.id = r.referred_user_id left join auth.users u on u.id = r.referred_user_id
   where (p_cstatus is null or r.commission_status = p_cstatus) and (p_aff is null or r.affiliate_id = p_aff) and (pat is null or a.code ilike pat or p.full_name ilike pat or u.email ilike pat);
  select coalesce(jsonb_agg(to_jsonb(z) order by z.attributed_at desc), '[]'::jsonb) into v_rows from (
    select r.id, r.status, r.commission, r.commission_status, r.commission_available_at, r.commission_base, r.commission_rate, r.fraud_reasons, r.attributed_at, r.paid_at, r.review_note, r.reviewed_at,
           a.code, a.id as affiliate_id, p.full_name as referred_name, u.email::text as referred_email
      from public.referrals r join public.affiliates a on a.id = r.affiliate_id left join public.profiles p on p.id = r.referred_user_id left join auth.users u on u.id = r.referred_user_id
     where (p_cstatus is null or r.commission_status = p_cstatus) and (p_aff is null or r.affiliate_id = p_aff) and (pat is null or a.code ilike pat or p.full_name ilike pat or u.email ilike pat)
     order by r.attributed_at desc limit greatest(1, least(coalesce(p_limit, 25), 200)) offset greatest(0, coalesce(p_offset, 0))) z;
  return jsonb_build_object('total', v_total, 'rows', v_rows);
end $$;

create or replace function public.admin_aff_referral_review(p_id uuid, p_action text, p_note text default null) returns void language plpgsql security definer set search_path = public as $$
declare r public.referrals; a public.affiliates; lid uuid;
begin
  perform set_config('nm.aff_rpc', '1', true);
  if not public.has_perm('affiliate.write') then raise exception 'forbidden' using errcode = '42501'; end if;
  select * into r from public.referrals where id = p_id for update; if not found then raise exception 'referral_tidak_ditemukan'; end if;
  if r.commission_status not in ('pending', 'review') then raise exception 'status_tidak_bisa_ditinjau'; end if;
  select * into a from public.affiliates where id = r.affiliate_id;
  if p_action = 'approve' then
    if a.status <> 'aktif' then raise exception 'affiliate_tidak_aktif'; end if;
    if r.commission_status = 'review' and char_length(btrim(coalesce(p_note, ''))) < 3 then raise exception 'alasan_wajib'; end if;
    if not exists (select 1 from public.invoices where id = r.invoice_id and status = 'lunas') then raise exception 'invoice_tidak_lunas'; end if;
    insert into public.bonus_history (user_id, description, amount) values (a.user_id, 'Komisi referral', r.commission) returning id into lid;
    update public.referrals set commission_status = 'approved', ledger_id = lid, reviewed_by = auth.uid(), reviewed_at = now(), review_note = nullif(left(btrim(coalesce(p_note, '')), 200), '') where id = p_id;
  elsif p_action = 'reject' then
    if char_length(btrim(coalesce(p_note, ''))) < 3 then raise exception 'alasan_wajib'; end if;
    update public.referrals set commission_status = 'rejected', status = 'batal', reviewed_by = auth.uid(), reviewed_at = now(), review_note = left(btrim(p_note), 200) where id = p_id;
  else raise exception 'aksi_tidak_valid'; end if;
end $$;

create or replace function public.admin_aff_withdrawals(p_status text default null, p_limit int default 25, p_offset int default 0) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v_total bigint; v_rows jsonb; v_full boolean := public.has_perm('affiliate.write');
begin
  if not public.has_perm('affiliate.read') then raise exception 'forbidden' using errcode = '42501'; end if;
  select count(*) into v_total from public.withdrawals where p_status is null or status = p_status;
  select coalesce(jsonb_agg(to_jsonb(z) order by z.created_at desc), '[]'::jsonb) into v_rows from (
    select w.id, w.amount, w.status, w.created_at, w.bank_name, case when v_full then w.bank_account_no else public.aff_mask(w.bank_account_no) end as bank_account_no, w.bank_account_name, w.bank_verified, w.note, w.payout_ref, w.processed_at,
           p.full_name as name, u.email::text as email, af.code,
           (select coalesce(bonus_balance, 0) from public.wallets x where x.user_id = w.user_id) as balance_now,
           (select count(*) from public.referrals r where r.affiliate_id = af.id and r.commission_status = 'review') as in_review
      from public.withdrawals w left join public.profiles p on p.id = w.user_id left join auth.users u on u.id = w.user_id left join public.affiliates af on af.user_id = w.user_id
     where p_status is null or w.status = p_status
     order by w.created_at desc limit greatest(1, least(coalesce(p_limit, 25), 200)) offset greatest(0, coalesce(p_offset, 0))) z;
  return jsonb_build_object('total', v_total, 'rows', v_rows);
end $$;

create or replace function public.admin_aff_withdrawal_process(p_id uuid, p_action text, p_ref text default null, p_note text default null) returns void language plpgsql security definer set search_path = public as $$
declare w public.withdrawals;
begin
  perform set_config('nm.aff_rpc', '1', true);
  if not public.has_perm('affiliate.write') then raise exception 'forbidden' using errcode = '42501'; end if;
  select * into w from public.withdrawals where id = p_id for update; if not found then raise exception 'penarikan_tidak_ditemukan'; end if;
  if w.status <> 'diproses' then raise exception 'penarikan_sudah_diproses'; end if;
  if p_action = 'paid' then
    if char_length(btrim(coalesce(p_ref, ''))) not between 3 and 80 then raise exception 'referensi_transfer_wajib'; end if;
    update public.withdrawals set status = 'berhasil', payout_ref = btrim(p_ref), note = nullif(left(btrim(coalesce(p_note, '')), 200), ''), processed_by = auth.uid(), processed_at = now() where id = p_id;
  elsif p_action = 'reject' then
    if char_length(btrim(coalesce(p_note, ''))) < 3 then raise exception 'alasan_wajib'; end if;
    update public.withdrawals set status = 'ditolak', note = left(btrim(p_note), 200), processed_by = auth.uid(), processed_at = now() where id = p_id;
    insert into public.bonus_history (user_id, description, amount) values (w.user_id, 'Pengembalian penarikan yang ditolak', w.amount);
  else raise exception 'aksi_tidak_valid'; end if;
end $$;

create or replace function public.admin_aff_fraud() returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not public.has_perm('affiliate.read') then raise exception 'forbidden' using errcode = '42501'; end if;
  return jsonb_build_object(
    'ip_clusters', coalesce((select jsonb_agg(t) from (select left(r.ip_hash, 8) as ip, count(*) as signups, count(distinct r.affiliate_id) as affiliates, array_agg(distinct a.code) as codes
        from public.referrals r join public.affiliates a on a.id = r.affiliate_id where r.ip_hash is not null and r.attributed_at > now() - interval '30 days' group by r.ip_hash having count(*) >= 3 order by count(*) desc limit 20) t), '[]'::jsonb),
    'shared_banks', coalesce((select jsonb_agg(t) from (select public.aff_mask(a.bank_account_no) as account, count(*) as affiliates, array_agg(a.code) as codes
        from public.affiliates a where a.bank_account_no is not null group by a.bank_account_no having count(*) > 1 order by count(*) desc limit 20) t), '[]'::jsonb),
    'click_bursts', coalesce((select jsonb_agg(t) from (select a.code, count(*) as clicks, count(distinct c.visitor_hash) as visitors
        from public.affiliate_clicks c join public.affiliates a on a.id = c.affiliate_id where c.created_at > now() - interval '24 hours' group by a.code having count(*) >= 100 or (count(*) >= 30 and count(distinct c.visitor_hash) <= 2) order by count(*) desc limit 20) t), '[]'::jsonb),
    'flagged', coalesce((select jsonb_agg(t) from (select r.id, a.code, r.fraud_reasons, r.commission, r.attributed_at from public.referrals r join public.affiliates a on a.id = r.affiliate_id
        where r.commission_status = 'review' order by r.attributed_at desc limit 50) t), '[]'::jsonb));
end $$;

create or replace function public.admin_aff_release_due() returns int language plpgsql security definer set search_path = public as $$
begin
  if not public.has_perm('affiliate.write') then raise exception 'forbidden' using errcode = '42501'; end if;
  return public.aff_release_due(null);
end $$;

----------------------------------------------------------------------------- 8. Hak eksekusi
-- aff_settings sengaja TIDAK diaudit oleh pemicu umum (memuat garam hash); perubahan dicatat eksplisit oleh admin_aff_settings_save.

do $$ declare f text; begin
  foreach f in array array[
    'admin_aff_settings_get()', 'admin_aff_settings_save(jsonb)', 'admin_aff_overview()', 'admin_aff_list(text,text,text,int,int)', 'admin_aff_detail(uuid)', 'admin_aff_set_status(uuid,text,text)',
    'admin_aff_bank_review(uuid,text,text)', 'admin_aff_set_rate(uuid,text,numeric)', 'admin_aff_referrals(text,uuid,text,int,int)', 'admin_aff_referral_review(uuid,text,text)',
    'admin_aff_withdrawals(text,int,int)', 'admin_aff_withdrawal_process(uuid,text,text,text)', 'admin_aff_fraud()', 'admin_aff_release_due()'] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;
