-- NusaMora Admin: Pengaturan Sistem (menu M). ADITIF dan aman diulang. Tidak mengubah kontrak API yang ada.
-- Prasyarat: admin-schema.sql, admin-notifications.sql, security-schema.sql.
-- Isi: validasi app_settings, public_settings() (hanya kunci aman), mode pemeliharaan yang ditegakkan DB,
--      kesehatan sistem, log backup, ekspor/impor konfigurasi, webhook keluar bertanda tangan (antrean + retry).

----------------------------------------------------------------------------- 1. Validasi app_settings
create or replace function public.app_setting_check(p_key text, p_val jsonb) returns text
language plpgsql immutable as $$
declare s text := case when jsonb_typeof(p_val) = 'string' then p_val #>> '{}' else null end;
begin
  if p_key in ('maintenance_mode') then
    if jsonb_typeof(p_val) = 'boolean' or s in ('true','false','') then return null; end if; return 'maintenance_mode_tidak_valid';
  end if;
  if p_key in ('max_upload_mb','smtp_port') then
    if jsonb_typeof(p_val) = 'number' or s = '' or s ~ '^[0-9]{1,5}$' then
      if p_key = 'max_upload_mb' and coalesce(s, p_val #>> '{}') <> '' and (coalesce(s, p_val #>> '{}'))::numeric not between 1 and 20 then return 'max_upload_mb_tidak_valid'; end if;
      return null;
    end if; return p_key || '_tidak_valid';
  end if;
  if s is null then return p_key || '_tidak_valid'; end if;
  if s = '' then return null; end if;
  if p_key in ('platform_name') and char_length(s) not between 2 and 60 then return 'platform_name_tidak_valid'; end if;
  if p_key in ('platform_tagline','maintenance_message','seo_description') and char_length(s) > (case p_key when 'seo_description' then 170 else 300 end) then return p_key || '_terlalu_panjang'; end if;
  if p_key = 'seo_title' and char_length(s) > 70 then return 'seo_title_terlalu_panjang'; end if;
  if p_key in ('support_email','email_sender_address') and s !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then return p_key || '_tidak_valid'; end if;
  if p_key = 'support_whatsapp' and s !~ '^\+?[0-9]{8,15}$' then return 'support_whatsapp_tidak_valid'; end if;
  if p_key in ('brand_primary','brand_deep') and s !~ '^#[0-9a-fA-F]{6}$' then return p_key || '_tidak_valid'; end if;
  if p_key in ('logo_url','favicon_url','og_image') and s !~* '^(https://[^\s]+|/[^\s/][^\s]*)$' then return p_key || '_tidak_valid'; end if;
  if p_key like 'social\_%' and s !~* '^https://[a-z0-9.-]+\.[a-z]{2,}(/[^\s]*)?$' then return p_key || '_tidak_valid'; end if;
  if p_key = 'default_lang' and s not in ('id','en') then return 'default_lang_tidak_valid'; end if;
  if p_key = 'timezone' and s not in ('Asia/Jakarta','Asia/Makassar','Asia/Jayapura') then return 'timezone_tidak_valid'; end if;
  if p_key = 'midtrans_mode' and s not in ('sandbox','production') then return 'midtrans_mode_tidak_valid'; end if;
  if p_key in ('domain_primary','domain_staging') and s !~* '^[a-z0-9]([a-z0-9.-]*[a-z0-9])?\.[a-z]{2,}$' then return p_key || '_tidak_valid'; end if;
  if p_key in ('email_sender_name','smtp_host','midtrans_merchant_id','midtrans_client_key','bank_transfer_info','storage_bucket') and char_length(s) > 500 then return p_key || '_terlalu_panjang'; end if;
  return null;
end $$;

create or replace function public.app_setting_known(p_key text) returns boolean language sql immutable as $$
  select p_key in ('platform_name','platform_tagline','support_email','support_whatsapp','maintenance_mode','maintenance_message','logo_url','favicon_url','brand_primary','brand_deep',
    'midtrans_mode','midtrans_merchant_id','midtrans_client_key','bank_transfer_info','email_sender_name','email_sender_address','smtp_host','smtp_port','storage_bucket','max_upload_mb',
    'domain_primary','domain_staging','seo_title','seo_description','og_image','default_lang','timezone',
    'social_instagram','social_tiktok','social_facebook','social_youtube','social_x','social_linkedin') $$;

create or replace function public.app_settings_guard() returns trigger
language plpgsql set search_path = public as $$
declare e text;
begin
  if not public.app_setting_known(new.key) then raise exception 'kunci_tidak_dikenal: %', new.key using errcode = '22023'; end if;
  e := public.app_setting_check(new.key, new.value);
  if e is not null then raise exception '%', e using errcode = '22023'; end if;
  return new;
end $$;
drop trigger if exists app_settings_guard on public.app_settings;
create trigger app_settings_guard before insert or update on public.app_settings for each row execute function public.app_settings_guard();

create or replace function public.app_setting_on(p_key text) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select case when jsonb_typeof(value) = 'boolean' then (value)::text::boolean else (value #>> '{}') = 'true' end from public.app_settings where key = p_key), false) $$;
revoke all on function public.app_setting_on(text) from public, anon, authenticated;
grant execute on function public.app_setting_on(text) to service_role;

----------------------------------------------------------------------------- 2. Pengaturan publik (allowlist, tanpa rahasia)
create or replace function public.app_setting_on_pub(p_key text) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select case when jsonb_typeof(value) = 'boolean' then (value)::text::boolean else (value #>> '{}') = 'true' end from public.app_settings where key = p_key), false) $$;
create or replace function public.public_settings() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce((select jsonb_object_agg(key, value) from public.app_settings
   where key in ('platform_name','platform_tagline','support_email','support_whatsapp','maintenance_message','logo_url','favicon_url','brand_primary','brand_deep',
                 'seo_title','seo_description','og_image','default_lang','timezone',
                 'social_instagram','social_tiktok','social_facebook','social_youtube','social_x','social_linkedin') and value <> '""'::jsonb), '{}'::jsonb)
         || jsonb_build_object('maintenance_mode', public.app_setting_on_pub('maintenance_mode')) $$;
revoke all on function public.public_settings(), public.app_setting_on_pub(text) from public;
grant execute on function public.public_settings() to anon, authenticated;
revoke execute on function public.app_setting_on_pub(text) from anon, authenticated;

----------------------------------------------------------------------------- 3. Mode pemeliharaan ditegakkan di database
-- Memblokir pembuatan undangan dan pembayaran BARU oleh pelanggan. Admin, service_role (webhook Midtrans), dan SQL langsung tidak diblokir,
-- jadi pembayaran yang sedang berjalan tetap tercatat.
create or replace function public.maintenance_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and public.app_setting_on('maintenance_mode')
     and not exists (select 1 from public.admin_users a where a.user_id = auth.uid() and a.active) then
    raise exception 'maintenance' using errcode = 'P0001', hint = 'Sistem sedang dalam pemeliharaan.';
  end if;
  return new;
end $$;
drop trigger if exists maintenance_inv_trg on public.invitations;
create trigger maintenance_inv_trg before insert on public.invitations for each row execute function public.maintenance_guard();
drop trigger if exists maintenance_pay_trg on public.payments;
create trigger maintenance_pay_trg before insert on public.payments for each row execute function public.maintenance_guard();

----------------------------------------------------------------------------- 4. Log backup (diisi skrip ops/backup, bukan dari browser)
create table if not exists public.backup_log (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  kind text not null check (kind in ('db','storage','restore','config')),
  ok boolean not null, size_bytes bigint, detail text);
alter table public.backup_log enable row level security;
drop policy if exists "admin baca" on public.backup_log;
create policy "admin baca" on public.backup_log for select using (public.has_perm('settings.read'));
revoke all on public.backup_log from anon, authenticated; grant select on public.backup_log to authenticated;

----------------------------------------------------------------------------- 5. Kesehatan sistem
create or replace function public.admin_system_health() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare so bigint := 0; sc bigint := 0; lastdisp timestamptz; r jsonb;
begin
  if not public.has_perm('settings.read') then raise exception 'forbidden' using errcode = '42501'; end if;
  begin select count(*), coalesce(sum((metadata ->> 'size')::bigint), 0) into sc, so from storage.objects; exception when others then sc := null; so := null; end;
  select nullif(value #>> '{}', '')::timestamptz into lastdisp from public.notif_settings where key = 'last_dispatch_at' and jsonb_typeof(value) = 'string';
  r := jsonb_build_object(
    'checked_at', now(),
    'db_size_bytes', pg_database_size(current_database()),
    'storage_objects', sc, 'storage_bytes', so,
    'customers', (select count(*) from public.profiles),
    'invitations_active', (select count(*) from public.invitations where status = 'aktif'),
    'payments_stuck', (select count(*) from public.payments where status = 'pending' and created_at < now() - interval '1 day' and expires_at > now() - interval '7 days'),
    'notif_pending', (select count(*) from public.notif_outbox where status in ('pending','sending')),
    'notif_failed_24h', (select count(*) from public.notif_outbox where status = 'failed' and updated_at > now() - interval '24 hours'),
    'notif_last_dispatch', lastdisp,
    'webhook_pending', (select count(*) from public.webhook_deliveries where status in ('pending','sending')),
    'webhook_failed_24h', (select count(*) from public.webhook_deliveries where status = 'failed' and created_at > now() - interval '24 hours'),
    'security_24h', coalesce((select jsonb_object_agg(kind, n) from (select kind, count(*) n from public.security_events where at > now() - interval '24 hours' group by kind order by n desc limit 8) q), '{}'::jsonb),
    'maintenance', public.app_setting_on_pub('maintenance_mode'),
    'last_backup', (select jsonb_build_object('at', at, 'ok', ok, 'size_bytes', size_bytes, 'detail', detail) from public.backup_log where kind = 'db' order by at desc limit 1),
    'last_backup_ok', (select max(at) from public.backup_log where kind = 'db' and ok));
  return r;
end $$;

----------------------------------------------------------------------------- 6. Ekspor / impor konfigurasi
create or replace function public.admin_config_export() returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.has_perm('settings.read') then raise exception 'forbidden' using errcode = '42501'; end if;
  return jsonb_build_object('format', 'nusamora-config', 'version', 1, 'exported_at', now(),
    'app_settings', coalesce((select jsonb_object_agg(key, value) from public.app_settings), '{}'::jsonb),
    'notif_settings', coalesce((select jsonb_object_agg(key, value) from public.notif_settings where key not in ('last_dispatch_at','paused')), '{}'::jsonb),
    'notif_templates', coalesce((select jsonb_agg(jsonb_build_object('key', key, 'channel', channel, 'lang', lang, 'name', name, 'subject', subject, 'body', body, 'active', active) order by key, channel) from public.notif_templates), '[]'::jsonb),
    'notif_rules', coalesce((select jsonb_agg(jsonb_build_object('event', event, 'channel', channel, 'recipient', recipient, 'template_key', template_key, 'enabled', enabled) order by event, channel, recipient) from public.notif_rules), '[]'::jsonb));
end $$;

-- p_apply=false: hanya memeriksa (dry-run). Semua atau tidak sama sekali: satu galat membatalkan seluruh impor.
create or replace function public.admin_config_import(p jsonb, p_apply boolean default false) returns jsonb
language plpgsql security definer set search_path = public as $$
declare k text; v jsonb; t jsonb; e text; probs jsonb := '[]'::jsonb; n_set int := 0; n_not int := 0; n_tpl int := 0; n_rule int := 0;
begin
  if not public.has_perm('settings.write') then raise exception 'forbidden' using errcode = '42501'; end if;
  if p is null or jsonb_typeof(p) <> 'object' or p ->> 'format' <> 'nusamora-config' or (p ->> 'version') <> '1' then raise exception 'format_tidak_dikenal'; end if;
  if pg_column_size(p) > 1048576 then raise exception 'berkas_terlalu_besar'; end if;
  for k, v in select * from jsonb_each(coalesce(p -> 'app_settings', '{}'::jsonb)) loop
    if not public.app_setting_known(k) then probs := probs || to_jsonb('app_settings.' || k || ': kunci tidak dikenal'); continue; end if;
    e := public.app_setting_check(k, v); if e is not null then probs := probs || to_jsonb('app_settings.' || k || ': ' || e); continue; end if;
    n_set := n_set + 1; if p_apply and jsonb_array_length(probs) = 0 then insert into public.app_settings (key, value, updated_at) values (k, v, now()) on conflict (key) do update set value = excluded.value, updated_at = now(); end if;
  end loop;
  for k, v in select * from jsonb_each(coalesce(p -> 'notif_settings', '{}'::jsonb)) loop
    if k not in ('email_from_name','email_from_address','email_reply_to','max_attempts','retry_base_minutes','internal_emails','internal_whatsapp') then probs := probs || to_jsonb('notif_settings.' || k || ': kunci tidak dikenal'); continue; end if;
    n_not := n_not + 1;
    if p_apply and jsonb_array_length(probs) = 0 then
      begin perform public.admin_notif_settings_save(jsonb_build_object(k, v)); exception when others then probs := probs || to_jsonb('notif_settings.' || k || ': ' || sqlerrm); end;
    end if;
  end loop;
  for t in select * from jsonb_array_elements(coalesce(p -> 'notif_templates', '[]'::jsonb)) loop
    n_tpl := n_tpl + 1;
    if (t ->> 'channel') not in ('email','whatsapp') or coalesce(t ->> 'key', '') !~ '^[a-z][a-z0-9_]{1,40}$' or coalesce(t ->> 'lang', 'id') not in ('id','en') or char_length(coalesce(t ->> 'name', '')) < 2 or char_length(coalesce(t ->> 'body', '')) not between 1 and 4000 or char_length(coalesce(t ->> 'subject', '')) > 150 or coalesce(t ->> 'subject', '') ~ '[\r\n]' then
      probs := probs || to_jsonb('notif_templates.' || coalesce(t ->> 'key', '?') || ': tidak valid'); continue; end if;
    if p_apply and jsonb_array_length(probs) = 0 then
      insert into public.notif_templates (key, channel, lang, name, subject, body, active, updated_by) values (t ->> 'key', t ->> 'channel', coalesce(t ->> 'lang', 'id'), t ->> 'name', nullif(t ->> 'subject', ''), t ->> 'body', coalesce((t ->> 'active')::boolean, true), auth.uid())
        on conflict (key, channel, lang) do update set name = excluded.name, subject = excluded.subject, body = excluded.body, active = excluded.active, updated_by = auth.uid(), updated_at = now();
    end if;
  end loop;
  for t in select * from jsonb_array_elements(coalesce(p -> 'notif_rules', '[]'::jsonb)) loop
    n_rule := n_rule + 1;
    if not exists (select 1 from public.notif_rules r where r.event = t ->> 'event' and r.channel = t ->> 'channel' and r.recipient = t ->> 'recipient') then probs := probs || to_jsonb('notif_rules.' || coalesce(t ->> 'event', '?') || ': aturan tidak ada'); continue; end if;
    if p_apply and jsonb_array_length(probs) = 0 then update public.notif_rules set enabled = coalesce((t ->> 'enabled')::boolean, false), updated_at = now() where event = t ->> 'event' and channel = t ->> 'channel' and recipient = t ->> 'recipient'; end if;
  end loop;
  if p_apply and jsonb_array_length(probs) > 0 then raise exception 'impor_dibatalkan: %', probs ->> 0; end if;
  if p_apply then
    insert into public.audit_logs (actor_id, action, table_name, row_id, summary) values (auth.uid(), 'update', 'config', 'import', jsonb_build_object('app_settings', n_set, 'notif_settings', n_not, 'notif_templates', n_tpl, 'notif_rules', n_rule));
    insert into public.backup_log (kind, ok, detail) values ('config', true, 'Impor konfigurasi: ' || n_set || ' pengaturan, ' || n_tpl || ' template, ' || n_rule || ' aturan');
  end if;
  return jsonb_build_object('applied', p_apply, 'valid', jsonb_array_length(probs) = 0, 'problems', probs, 'counts', jsonb_build_object('app_settings', n_set, 'notif_settings', n_not, 'notif_templates', n_tpl, 'notif_rules', n_rule));
end $$;

----------------------------------------------------------------------------- 7. Webhook keluar
create table if not exists public.webhook_endpoints (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 80),
  url text not null check (char_length(url) <= 300),
  events text[] not null default '{}',
  enabled boolean not null default true,
  fail_streak int not null default 0, disabled_reason text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists public.webhook_secrets (endpoint_id uuid primary key references public.webhook_endpoints(id) on delete cascade, secret text not null);
create table if not exists public.webhook_deliveries (
  id uuid primary key default gen_random_uuid(),
  endpoint_id uuid not null references public.webhook_endpoints(id) on delete cascade,
  event text not null, payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending','sending','delivered','failed','cancelled')),
  attempts int not null default 0, max_attempts int not null default 6,
  next_attempt_at timestamptz not null default now(),
  http_status int, last_error text, response_ms int,
  dedupe_key text unique,
  created_at timestamptz not null default now(), delivered_at timestamptz, updated_at timestamptz not null default now());
create index if not exists webhook_deliveries_due_idx on public.webhook_deliveries (next_attempt_at) where status = 'pending';
create index if not exists webhook_deliveries_ep_idx on public.webhook_deliveries (endpoint_id, created_at desc);

alter table public.webhook_endpoints enable row level security; alter table public.webhook_secrets enable row level security; alter table public.webhook_deliveries enable row level security;
drop policy if exists "admin baca" on public.webhook_endpoints; create policy "admin baca" on public.webhook_endpoints for select using (public.has_perm('settings.read'));
drop policy if exists "admin baca" on public.webhook_deliveries; create policy "admin baca" on public.webhook_deliveries for select using (public.has_perm('settings.read'));
revoke all on public.webhook_endpoints, public.webhook_secrets, public.webhook_deliveries from anon, authenticated;
grant select on public.webhook_endpoints, public.webhook_deliveries to authenticated;

create or replace function public.webhook_events() returns text[] language sql immutable as $$ select array['payment_paid','payment_failed','invitation_active','customer_created','ticket_new'] $$;

-- Hanya https, host bernama (bukan IP/localhost/internal), tanpa userinfo, port 443.
create or replace function public.webhook_url_ok(u text) returns boolean language plpgsql immutable as $$
declare host text;
begin
  if u is null or char_length(u) > 300 or u !~* '^https://[a-z0-9]([a-z0-9.-]*[a-z0-9])?(:443)?(/[^\s]*)?$' then return false; end if;
  host := lower(substring(u from '^https://([^/:]+)'));
  if host !~ '\.' or host ~ '^[0-9.]+$' or host in ('localhost') or host ~ '\.(local|localhost|internal|lan|home|test|invalid|example|onion)$' then return false; end if;
  return true;
end $$;

create or replace function public.webhook_emit(p_event text, p_payload jsonb, p_dedupe text) returns int
language plpgsql security definer set search_path = public as $$
declare ep record; n int := 0; c int;
begin
  for ep in select id from public.webhook_endpoints where enabled and p_event = any(events) loop
    insert into public.webhook_deliveries (endpoint_id, event, payload, dedupe_key) values (ep.id, p_event, coalesce(p_payload, '{}'::jsonb), p_dedupe || ':' || ep.id) on conflict (dedupe_key) do nothing;
    get diagnostics c = row_count; n := n + c;
  end loop;
  return n;
end $$;
revoke all on function public.webhook_emit(text, jsonb, text) from public, anon, authenticated; grant execute on function public.webhook_emit(text, jsonb, text) to service_role;

create or replace function public.wh_trg_payment() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status is distinct from old.status and new.status in ('paid','failed','expired') then
    perform public.webhook_emit(case when new.status = 'paid' then 'payment_paid' else 'payment_failed' end,
      jsonb_build_object('payment_id', new.id, 'order_id', new.order_id, 'user_id', new.user_id, 'invitation_id', new.invitation_id, 'plan', new.plan_id, 'amount', new.amount, 'status', new.status), 'pay:' || new.id || ':' || new.status);
  end if; return new;
exception when others then raise warning 'wh_trg_payment: %', sqlerrm; return new; end $$;
drop trigger if exists wh_payment_trg on public.payments; create trigger wh_payment_trg after update of status on public.payments for each row execute function public.wh_trg_payment();

create or replace function public.wh_trg_invitation() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'aktif' and old.status is distinct from 'aktif' then
    perform public.webhook_emit('invitation_active', jsonb_build_object('invitation_id', new.id, 'user_id', new.user_id, 'slug', new.slug, 'category', new.category), 'inv:' || new.id);
  end if; return new;
exception when others then raise warning 'wh_trg_invitation: %', sqlerrm; return new; end $$;
drop trigger if exists wh_invitation_trg on public.invitations; create trigger wh_invitation_trg after update of status on public.invitations for each row execute function public.wh_trg_invitation();

create or replace function public.wh_trg_profile() returns trigger language plpgsql security definer set search_path = public as $$
begin perform public.webhook_emit('customer_created', jsonb_build_object('user_id', new.id), 'cust:' || new.id); return new;
exception when others then raise warning 'wh_trg_profile: %', sqlerrm; return new; end $$;
drop trigger if exists wh_profile_trg on public.profiles; create trigger wh_profile_trg after insert on public.profiles for each row execute function public.wh_trg_profile();

create or replace function public.wh_trg_ticket() returns trigger language plpgsql security definer set search_path = public as $$
begin perform public.webhook_emit('ticket_new', jsonb_build_object('ticket_id', new.id, 'user_id', new.user_id, 'category', new.category), 'ticket:' || new.id); return new;
exception when others then raise warning 'wh_trg_ticket: %', sqlerrm; return new; end $$;
drop trigger if exists wh_ticket_trg on public.tickets; create trigger wh_ticket_trg after insert on public.tickets for each row execute function public.wh_trg_ticket();

-- API admin
create or replace function public.admin_webhook_save(p_id uuid, p_name text, p_url text, p_events text[], p_enabled boolean) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_id uuid := p_id; v_secret text; ev text;
begin
  if not public.has_perm('settings.write') then raise exception 'forbidden' using errcode = '42501'; end if;
  if char_length(btrim(coalesce(p_name, ''))) < 2 or char_length(p_name) > 80 then raise exception 'nama_tidak_valid'; end if;
  if not public.webhook_url_ok(btrim(p_url)) then raise exception 'url_tidak_valid'; end if;
  if p_events is null or cardinality(p_events) = 0 then raise exception 'event_wajib'; end if;
  foreach ev in array p_events loop if not (ev = any(public.webhook_events())) then raise exception 'event_tidak_dikenal'; end if; end loop;
  if v_id is null then
    if (select count(*) from public.webhook_endpoints) >= 10 then raise exception 'batas_endpoint'; end if;
    insert into public.webhook_endpoints (name, url, events, enabled, created_by) values (btrim(p_name), btrim(p_url), (select array_agg(distinct x) from unnest(p_events) x), coalesce(p_enabled, true), auth.uid()) returning id into v_id;
    v_secret := 'whsec_' || replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
    insert into public.webhook_secrets (endpoint_id, secret) values (v_id, v_secret);
  else
    update public.webhook_endpoints set name = btrim(p_name), url = btrim(p_url), events = (select array_agg(distinct x) from unnest(p_events) x), enabled = coalesce(p_enabled, true),
      fail_streak = case when coalesce(p_enabled, true) and not enabled then 0 else fail_streak end, disabled_reason = case when coalesce(p_enabled, true) then null else disabled_reason end, updated_at = now() where id = v_id;
    if not found then raise exception 'tidak_ditemukan'; end if;
  end if;
  insert into public.audit_logs (actor_id, action, table_name, row_id, summary) values (auth.uid(), case when p_id is null then 'insert' else 'update' end, 'webhook_endpoints', v_id::text, jsonb_build_object('name', btrim(p_name), 'events', p_events));
  return jsonb_build_object('id', v_id, 'secret', v_secret);
end $$;

create or replace function public.admin_webhook_rotate_secret(p_id uuid) returns text
language plpgsql security definer set search_path = public as $$
declare s text := 'whsec_' || replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
begin
  if not public.has_perm('settings.write') then raise exception 'forbidden' using errcode = '42501'; end if;
  if not exists (select 1 from public.webhook_endpoints where id = p_id) then raise exception 'tidak_ditemukan'; end if;
  insert into public.webhook_secrets (endpoint_id, secret) values (p_id, s) on conflict (endpoint_id) do update set secret = excluded.secret;
  insert into public.audit_logs (actor_id, action, table_name, row_id, summary) values (auth.uid(), 'update', 'webhook_endpoints', p_id::text, jsonb_build_object('aksi', 'rotate_secret'));
  return s;
end $$;

create or replace function public.admin_webhook_delete(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.has_perm('settings.write') then raise exception 'forbidden' using errcode = '42501'; end if;
  delete from public.webhook_endpoints where id = p_id; if not found then raise exception 'tidak_ditemukan'; end if;
  insert into public.audit_logs (actor_id, action, table_name, row_id, summary) values (auth.uid(), 'delete', 'webhook_endpoints', p_id::text, '{}'::jsonb);
end $$;

create or replace function public.admin_webhook_test(p_id uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare v uuid;
begin
  if not public.has_perm('settings.write') then raise exception 'forbidden' using errcode = '42501'; end if;
  if not exists (select 1 from public.webhook_endpoints where id = p_id) then raise exception 'tidak_ditemukan'; end if;
  insert into public.webhook_deliveries (endpoint_id, event, payload, dedupe_key) values (p_id, 'ping', jsonb_build_object('message', 'Uji webhook dari NusaMora'), 'ping:' || gen_random_uuid()) returning id into v;
  return v;
end $$;

create or replace function public.admin_webhook_retry(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.has_perm('settings.write') then raise exception 'forbidden' using errcode = '42501'; end if;
  update public.webhook_deliveries set status = 'pending', attempts = 0, next_attempt_at = now(), last_error = null, updated_at = now() where id = p_id and status in ('failed','cancelled');
  if not found then raise exception 'tidak_bisa_dicoba_ulang'; end if;
end $$;

create or replace function public.admin_webhook_deliveries(p_endpoint uuid, p_limit int default 30) returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.has_perm('settings.read') then raise exception 'forbidden' using errcode = '42501'; end if;
  return coalesce((select jsonb_agg(to_jsonb(q)) from (select id, event, status, attempts, max_attempts, http_status, last_error, response_ms, created_at, delivered_at, next_attempt_at, payload
    from public.webhook_deliveries where endpoint_id = p_endpoint order by created_at desc limit greatest(1, least(coalesce(p_limit, 30), 100))) q), '[]'::jsonb);
end $$;

-- Khusus pengirim (service_role)
create or replace function public.webhook_claim(p_limit int default 20) returns table (id uuid, endpoint_id uuid, event text, payload jsonb, url text, secret text, attempts int, created_at timestamptz)
language plpgsql security definer set search_path = public as $$
declare ids uuid[];
begin
  update public.webhook_deliveries d set status = 'pending', last_error = coalesce(d.last_error, 'Pengiriman terputus, dicoba ulang'), updated_at = now() where d.status = 'sending' and d.updated_at < now() - interval '10 minutes' and d.attempts < d.max_attempts;
  update public.webhook_deliveries d set status = 'failed', last_error = 'Pengiriman terputus dan batas percobaan habis', updated_at = now() where d.status = 'sending' and d.updated_at < now() - interval '10 minutes' and d.attempts >= d.max_attempts;
  select coalesce(array_agg(q.id), '{}') into ids from (select d.id from public.webhook_deliveries d join public.webhook_endpoints e on e.id = d.endpoint_id
    where d.status = 'pending' and d.next_attempt_at <= now() and e.enabled order by d.next_attempt_at limit greatest(1, least(coalesce(p_limit, 20), 100)) for update of d skip locked) q;
  return query update public.webhook_deliveries d set status = 'sending', attempts = d.attempts + 1, updated_at = now() from public.webhook_endpoints e, public.webhook_secrets s
    where d.id = any(ids) and e.id = d.endpoint_id and s.endpoint_id = d.endpoint_id returning d.id, d.endpoint_id, d.event, d.payload, e.url, s.secret, d.attempts, d.created_at;
end $$;
revoke all on function public.webhook_claim(int) from public, anon, authenticated; grant execute on function public.webhook_claim(int) to service_role;

-- "delivered" = endpoint penerima menjawab 2xx. Gagal beruntun >= 20 -> endpoint dinonaktifkan otomatis.
create or replace function public.webhook_result(p_id uuid, p_ok boolean, p_http int, p_error text, p_ms int, p_permanent boolean default false) returns text
language plpgsql security definer set search_path = public as $$
declare o public.webhook_deliveries; st text;
begin
  select * into o from public.webhook_deliveries where id = p_id for update;
  if not found or o.status <> 'sending' then return 'diabaikan'; end if;
  if p_ok then
    update public.webhook_deliveries set status = 'delivered', http_status = p_http, response_ms = p_ms, delivered_at = now(), last_error = null, updated_at = now() where id = p_id;
    update public.webhook_endpoints set fail_streak = 0 where id = o.endpoint_id; st := 'delivered';
  else
    if p_permanent or o.attempts >= o.max_attempts then
      update public.webhook_deliveries set status = 'failed', http_status = p_http, response_ms = p_ms, last_error = left(p_error, 300), updated_at = now() where id = p_id; st := 'failed';
      update public.webhook_endpoints set fail_streak = fail_streak + 1 where id = o.endpoint_id;
      update public.webhook_endpoints set enabled = false, disabled_reason = 'Dinonaktifkan otomatis: 20 pengiriman gagal beruntun', updated_at = now() where id = o.endpoint_id and fail_streak >= 20 and enabled;
    else
      update public.webhook_deliveries set status = 'pending', http_status = p_http, response_ms = p_ms, last_error = left(p_error, 300), next_attempt_at = now() + make_interval(mins => 2 * (power(2, o.attempts - 1))::int), updated_at = now() where id = p_id; st := 'pending';
    end if;
  end if;
  return st;
end $$;
revoke all on function public.webhook_result(uuid, boolean, int, text, int, boolean) from public, anon, authenticated; grant execute on function public.webhook_result(uuid, boolean, int, text, int, boolean) to service_role;

do $$ declare f text; begin
  foreach f in array array['admin_system_health()','admin_config_export()','admin_config_import(jsonb,boolean)','admin_webhook_save(uuid,text,text,text[],boolean)','admin_webhook_rotate_secret(uuid)','admin_webhook_delete(uuid)','admin_webhook_test(uuid)','admin_webhook_retry(uuid)','admin_webhook_deliveries(uuid,int)'] loop
    execute format('revoke execute on function public.%s from public, anon', f); execute format('grant execute on function public.%s to authenticated', f);
  end loop; end $$;
