-- NusaMora: Analytics & Visitor Intelligence, TAHAP 1 (database + pengumpul). ADITIF dan aman diulang.
-- Jalankan di Supabase SQL Editor SETELAH: admin-schema, payment-schema, package-schema, security-schema, admin-roles, sandbox-separation.
--
-- Prinsip:
--  * Tabel analytics TERTUTUP (RLS aktif, tanpa policy, hak anon/authenticated dicabut). Penulisan hanya lewat analytics_ingest()
--    yang dipanggil Edge Function `analytics-collect` (service_role). Pembacaan admin ditambahkan di tahap 3 (RPC admin_analytics_*).
--  * Saklar `analytics_settings.enabled` bawaan MATI: selama mati, ingest dan pemicu tidak mencatat apa pun.
--  * Tidak menyimpan IP, e-mail, nama, kata sandi, atau data pembayaran. Pengunjung hanya dikenali lewat UUID acak first-party.
--  * Hari dihitung memakai Asia/Jakarta (WIB) di database.
--  * Revenue/pesanan/pendaftaran dihitung dari tabel transaksi dan profil (invoices tidak sandbox berstatus lunas), bukan dari event browser,
--    sehingga tidak bisa ganda dan tidak bergantung pada persetujuan analitik. Event hanya dipakai untuk atribusi sumber.

----------------------------------------------------------------------------- 0. Pengaturan (tabel sendiri: daftar kunci app_settings terkunci oleh app_settings_guard)
create table if not exists public.analytics_settings (
  key text primary key check (key in ('enabled', 'retention_days')),
  value jsonb not null, updated_at timestamptz not null default now(), updated_by uuid
);
alter table public.analytics_settings enable row level security;
revoke all on public.analytics_settings from public, anon, authenticated;
grant all on public.analytics_settings to service_role;
insert into public.analytics_settings (key, value) values ('enabled', 'false'::jsonb), ('retention_days', '90'::jsonb) on conflict (key) do nothing;

create or replace function public.analytics_setting(p_key text, p_default jsonb) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce((select value from public.analytics_settings where key = p_key), p_default) $$;
revoke all on function public.analytics_setting(text, jsonb) from public, anon, authenticated;
grant execute on function public.analytics_setting(text, jsonb) to service_role;

create or replace function public.analytics_enabled() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select value = 'true'::jsonb from public.analytics_settings where key = 'enabled'), false) $$;
revoke all on function public.analytics_enabled() from public, anon, authenticated;
grant execute on function public.analytics_enabled() to service_role;

----------------------------------------------------------------------------- 1. Fungsi bantu murni
create or replace function public.analytics_day(p_ts timestamptz) returns date language sql immutable as $$
  select (p_ts at time zone 'Asia/Jakarta')::date $$;

-- Path dibersihkan: tanpa query/hash, huruf kecil, tanpa garis miring penutup, maksimal 200 karakter, wajib diawali "/".
create or replace function public.analytics_clean_path(p text) returns text language plpgsql immutable as $$
declare x text;
begin
  if p is null then return null; end if;
  x := lower(left(regexp_replace(split_part(split_part(p, '?', 1), '#', 1), '\s', '', 'g'), 200));
  if x not like '/%' then return null; end if;
  if length(x) > 1 then x := rtrim(x, '/'); end if;
  return nullif(x, '');
end $$;

create or replace function public.analytics_host_is(p_host text, variadic p_domains text[]) returns boolean language sql immutable as $$
  select exists (select 1 from unnest(p_domains) d where p_host = d or p_host like '%.' || d) $$;

-- Pengelompokan sumber traffic: paid, email, organic, social, referral, direct, other.
create or replace function public.analytics_classify_source(p_host text, p_medium text, p_source text) returns text
language plpgsql immutable as $$
declare h text := lower(coalesce(p_host, '')); m text := lower(coalesce(p_medium, '')); s text := lower(coalesce(p_source, ''));
begin
  if h in ('nusamora.com', 'www.nusamora.com') then h := ''; end if;
  if m in ('cpc', 'ppc', 'paid', 'paidsearch', 'paid_social', 'paidsocial', 'display', 'cpm', 'banner', 'ads', 'ad') then return 'paid'; end if;
  if m in ('email', 'e-mail', 'newsletter') or s in ('email', 'newsletter') then return 'email'; end if;
  if m = 'organic' then return 'organic'; end if;
  if m in ('social', 'social-network', 'social_media', 'sm') or s in ('instagram', 'facebook', 'pinterest', 'tiktok', 'x', 'twitter', 'threads', 'linkedin', 'youtube', 'whatsapp', 'telegram') then return 'social'; end if;
  if m = 'referral' then return 'referral'; end if;
  if h <> '' then
    if public.analytics_host_is(h, 'google.com', 'google.co.id', 'bing.com', 'yahoo.com', 'duckduckgo.com', 'yandex.com', 'yandex.ru', 'baidu.com', 'ecosia.org', 'search.brave.com', 'startpage.com') then return 'organic'; end if;
    if public.analytics_host_is(h, 'pinterest.com', 'pin.it', 'instagram.com', 'l.instagram.com', 'facebook.com', 'm.facebook.com', 'l.facebook.com', 'lm.facebook.com', 'fb.com', 'tiktok.com', 'vm.tiktok.com', 'x.com', 't.co', 'twitter.com', 'threads.net', 'linkedin.com', 'lnkd.in', 'youtube.com', 'youtu.be', 'wa.me', 'whatsapp.com', 't.me', 'telegram.org', 'line.me') then return 'social'; end if;
    return 'referral';
  end if;
  if m <> '' or s <> '' then return 'other'; end if;
  return 'direct';
end $$;

-- Kelompok halaman untuk analisis konten.
create or replace function public.analytics_page_group(p_path text) returns text language sql immutable as $$
  select case
    when p_path = '/' then 'homepage'
    when p_path = '/paket' then 'pricing'
    when p_path = '/template' then 'template_gallery'
    when p_path like '/artikel%' then 'blog'
    when p_path = '/preview' then 'product_detail'
    when p_path in ('/daftar', '/masuk', '/lupa-password', '/atur-password') then 'auth'
    when p_path in ('/buat', '/editor', '/pembayaran') then 'checkout_flow'
    when p_path in ('/kebijakan-privasi', '/syarat-ketentuan') then 'legal'
    when p_path like '/bantuan%' or p_path like '/tutorial%' then 'help'
    when p_path like '/portofolio%' then 'portfolio'
    else 'other' end $$;

----------------------------------------------------------------------------- 2. Tabel mentah (tertutup)
create table if not exists public.analytics_visitors (
  visitor_id uuid primary key,
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  first_source text not null default 'direct',
  first_medium text, first_campaign text, first_referrer text, first_landing text,
  country text check (country is null or country ~ '^[A-Z]{2}$'),
  device text,
  user_id uuid references auth.users(id) on delete set null
);
create index if not exists analytics_visitors_user_idx on public.analytics_visitors (user_id) where user_id is not null;
create index if not exists analytics_visitors_last_idx on public.analytics_visitors (last_seen);

create table if not exists public.analytics_sessions (
  session_id uuid primary key,
  visitor_id uuid not null,
  started_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  landing_path text not null default '/',
  exit_path text,
  referrer_host text,
  source_group text not null default 'direct',
  utm_source text, utm_medium text, utm_campaign text, utm_content text, utm_term text,
  country text, device text, browser text, os text, screen text,
  pageviews int not null default 0,
  interactions int not null default 0,
  events int not null default 0,
  is_new_visitor boolean not null default false
);
create index if not exists analytics_sessions_started_idx on public.analytics_sessions (started_at);
create index if not exists analytics_sessions_visitor_idx on public.analytics_sessions (visitor_id, started_at desc);

create table if not exists public.analytics_events (
  id bigint generated always as identity primary key,
  ts timestamptz not null default now(),
  event text not null check (event in ('page_view','session_start','template_view','template_preview','template_select','package_select','pricing_view','signup_start','signup_complete','checkout_start','purchase_complete','search','contact_click','whatsapp_click')),
  session_id uuid, visitor_id uuid,
  path text, template_slug text, term text, target text, package_type text,
  amount bigint, invoice_id uuid,
  idem_key text
);
create unique index if not exists analytics_events_idem_uq on public.analytics_events (idem_key) where idem_key is not null;
create index if not exists analytics_events_ts_idx on public.analytics_events (ts);
create index if not exists analytics_events_event_ts_idx on public.analytics_events (event, ts);
create index if not exists analytics_events_session_idx on public.analytics_events (session_id);
create index if not exists analytics_events_tpl_idx on public.analytics_events (template_slug, ts) where template_slug is not null;

create table if not exists public.analytics_live (
  session_id uuid primary key,
  visitor_id uuid not null,
  path text, source_group text, country text, device text,
  last_seen timestamptz not null default now()
);
create index if not exists analytics_live_seen_idx on public.analytics_live (last_seen);

----------------------------------------------------------------------------- 3. Tabel agregat harian (hari WIB)
create table if not exists public.analytics_daily_overview (
  day date primary key,
  sessions int not null default 0, unique_visitors int not null default 0, pageviews int not null default 0,
  new_visitors int not null default 0, returning_visitors int not null default 0,
  bounced_sessions int not null default 0, duration_s bigint not null default 0,
  signups int not null default 0, checkouts int not null default 0, orders int not null default 0, revenue bigint not null default 0,
  template_previews int not null default 0, pricing_views int not null default 0, contact_clicks int not null default 0, whatsapp_clicks int not null default 0,
  computed_at timestamptz not null default now()
);
create table if not exists public.analytics_daily_source (
  day date not null, source_group text not null,
  utm_source text not null default '', utm_medium text not null default '', utm_campaign text not null default '', utm_content text not null default '', utm_term text not null default '',
  visitors int not null default 0, sessions int not null default 0, bounced_sessions int not null default 0,
  signups int not null default 0, orders int not null default 0, revenue bigint not null default 0,
  primary key (day, source_group, utm_source, utm_medium, utm_campaign, utm_content, utm_term)
);
create table if not exists public.analytics_daily_page (
  day date not null, path text not null, page_group text not null,
  pageviews int not null default 0, visitors int not null default 0, entrances int not null default 0, exits int not null default 0,
  bounced_entrances int not null default 0, time_total_s bigint not null default 0, time_samples int not null default 0, order_sessions int not null default 0,
  primary key (day, path)
);
create table if not exists public.analytics_daily_template (
  day date not null, template_slug text not null,
  views int not null default 0, previews int not null default 0, selects int not null default 0, checkouts int not null default 0, purchases int not null default 0, visitors int not null default 0,
  primary key (day, template_slug)
);
create table if not exists public.analytics_daily_audience (
  day date not null, dim text not null check (dim in ('country','device','browser','os','screen','visitor_type')), value text not null,
  visitors int not null default 0, sessions int not null default 0,
  primary key (day, dim, value)
);

do $$ declare t text; begin
  foreach t in array array['analytics_visitors','analytics_sessions','analytics_events','analytics_live','analytics_daily_overview','analytics_daily_source','analytics_daily_page','analytics_daily_template','analytics_daily_audience'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from public, anon, authenticated', t);
    execute format('grant all on public.%I to service_role', t);
  end loop;
end $$;

----------------------------------------------------------------------------- 4. Ingest (dipanggil Edge Function dengan service_role)
-- Payload: {vid, sid, ctx:{ref, utm:{source,medium,campaign,content,term}, device, browser, os, screen, country, landing}, events:[{e, path, tpl, term, target, pkg}]}
-- Event bisnis (signup_complete, checkout_start, purchase_complete) DITOLAK dari klien; hanya dibuat oleh pemicu di bawah.
create or replace function public.analytics_ingest(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  c jsonb := coalesce(p -> 'ctx', '{}'::jsonb); u jsonb := coalesce(c -> 'utm', '{}'::jsonb);
  v_vid uuid; v_sid uuid; v_now timestamptz := clock_timestamp();
  ev jsonb; v_e text; v_path text; rows jsonb := '[]'::jsonb;
  n_pv int := 0; n_acc int := 0; n_drop int := 0; v_last_pv text; v_first_pv text;
  v_ref text; v_us text; v_um text; v_uc text; v_ut text; v_ue text; v_src text; v_land text;
  v_country text; v_device text; v_browser text; v_os text; v_screen text;
  v_new_vis boolean; v_new_ses boolean; v_cnt int;
  allowed text[] := array['page_view','template_view','template_preview','template_select','package_select','pricing_view','signup_start','search','contact_click','whatsapp_click'];
begin
  if not public.analytics_enabled() then return jsonb_build_object('ok', true, 'skipped', 'disabled'); end if;
  begin v_vid := (p ->> 'vid')::uuid; v_sid := (p ->> 'sid')::uuid;
  exception when others then return jsonb_build_object('ok', false, 'error', 'id_tidak_valid'); end;
  if v_vid is null or v_sid is null then return jsonb_build_object('ok', false, 'error', 'id_tidak_valid'); end if;

  select events into v_cnt from public.analytics_sessions where session_id = v_sid;
  if coalesce(v_cnt, 0) >= 1000 then return jsonb_build_object('ok', true, 'skipped', 'batas_sesi'); end if;

  for ev in select value from jsonb_array_elements(case when jsonb_typeof(p -> 'events') = 'array' then p -> 'events' else '[]'::jsonb end) limit 25 loop
    v_e := ev ->> 'e';
    if v_e is null or v_e <> all (allowed) then n_drop := n_drop + 1; continue; end if;
    v_path := public.analytics_clean_path(ev ->> 'path');
    if v_e = 'page_view' and v_path is null then n_drop := n_drop + 1; continue; end if;
    rows := rows || jsonb_build_array(jsonb_build_object('e', v_e, 'path', v_path,
      'tpl', nullif(left(regexp_replace(lower(coalesce(ev ->> 'tpl', '')), '[^a-z0-9-]', '', 'g'), 80), ''),
      'term', nullif(left(btrim(regexp_replace(coalesce(ev ->> 'term', ''), '[[:cntrl:]]', ' ', 'g')), 80), ''),
      'target', nullif(left(regexp_replace(coalesce(ev ->> 'target', ''), '[^a-z0-9_./:-]', '', 'gi'), 80), ''),
      'pkg', case when ev ->> 'pkg' in ('essential', 'signature', 'luxe') then ev ->> 'pkg' end));
    n_acc := n_acc + 1;
    if v_e = 'page_view' then n_pv := n_pv + 1; v_last_pv := v_path; v_first_pv := coalesce(v_first_pv, v_path); end if;
  end loop;

  v_ref := nullif(left(lower(regexp_replace(coalesce(c ->> 'ref', ''), '[^a-zA-Z0-9.-]', '', 'g')), 100), '');
  if v_ref in ('nusamora.com', 'www.nusamora.com') then v_ref := null; end if;
  v_us := nullif(left(lower(btrim(coalesce(u ->> 'source', ''))), 60), ''); v_um := nullif(left(lower(btrim(coalesce(u ->> 'medium', ''))), 60), '');
  v_uc := nullif(left(lower(btrim(coalesce(u ->> 'campaign', ''))), 80), ''); v_ue := nullif(left(lower(btrim(coalesce(u ->> 'content', ''))), 80), '');
  v_ut := nullif(left(lower(btrim(coalesce(u ->> 'term', ''))), 80), '');
  v_src := public.analytics_classify_source(v_ref, v_um, v_us);
  v_land := coalesce(v_first_pv, public.analytics_clean_path(c ->> 'landing'), '/');
  v_country := case when c ->> 'country' ~ '^[A-Z]{2}$' then c ->> 'country' end;
  v_device := case when c ->> 'device' in ('desktop', 'mobile', 'tablet') then c ->> 'device' else 'other' end;
  v_browser := nullif(left(regexp_replace(coalesce(c ->> 'browser', ''), '[^A-Za-z0-9 ._-]', '', 'g'), 40), '');
  v_os := nullif(left(regexp_replace(coalesce(c ->> 'os', ''), '[^A-Za-z0-9 ._-]', '', 'g'), 40), '');
  v_screen := case when c ->> 'screen' ~ '^[0-9]{3,5}x[0-9]{3,5}$' then c ->> 'screen' end;

  insert into public.analytics_visitors (visitor_id, first_seen, last_seen, first_source, first_medium, first_campaign, first_referrer, first_landing, country, device)
  values (v_vid, v_now, v_now, v_src, v_um, v_uc, v_ref, v_land, v_country, v_device)
  on conflict (visitor_id) do update set last_seen = excluded.last_seen, country = coalesce(public.analytics_visitors.country, excluded.country)
  returning (xmax = 0) into v_new_vis;

  insert into public.analytics_sessions as s (session_id, visitor_id, started_at, last_seen_at, landing_path, exit_path, referrer_host, source_group,
    utm_source, utm_medium, utm_campaign, utm_content, utm_term, country, device, browser, os, screen, pageviews, interactions, events, is_new_visitor)
  values (v_sid, v_vid, v_now, v_now, v_land, v_last_pv, v_ref, v_src, v_us, v_um, v_uc, v_ue, v_ut, v_country, v_device, v_browser, v_os, v_screen,
    n_pv, n_acc - n_pv, n_acc, coalesce(v_new_vis, false))
  on conflict (session_id) do update set last_seen_at = v_now, exit_path = coalesce(v_last_pv, s.exit_path),
    pageviews = s.pageviews + n_pv, interactions = s.interactions + (n_acc - n_pv), events = s.events + n_acc
    where s.visitor_id = excluded.visitor_id
  returning (xmax = 0) into v_new_ses;
  if v_new_ses is null then return jsonb_build_object('ok', false, 'error', 'sesi_tidak_cocok'); end if;

  if v_new_ses then
    insert into public.analytics_events (ts, event, session_id, visitor_id, path) values (v_now, 'session_start', v_sid, v_vid, v_land);
  end if;
  insert into public.analytics_events (ts, event, session_id, visitor_id, path, template_slug, term, target, package_type)
  select v_now, r ->> 'e', v_sid, v_vid, r ->> 'path', r ->> 'tpl', r ->> 'term', r ->> 'target', r ->> 'pkg' from jsonb_array_elements(rows) r;

  insert into public.analytics_live (session_id, visitor_id, path, source_group, country, device, last_seen)
  values (v_sid, v_vid, coalesce(v_last_pv, v_land), v_src, v_country, v_device, v_now)
  on conflict (session_id) do update set last_seen = v_now, path = coalesce(v_last_pv, public.analytics_live.path)
    where public.analytics_live.visitor_id = excluded.visitor_id;

  return jsonb_build_object('ok', true, 'accepted', n_acc, 'dropped', n_drop, 'new_session', v_new_ses);
end $$;
revoke all on function public.analytics_ingest(jsonb) from public, anon, authenticated;
grant execute on function public.analytics_ingest(jsonb) to service_role;

-- Hak pengunjung: hapus semua jejak satu visitor_id (dipanggil saat persetujuan dicabut / permintaan hapus).
create or replace function public.analytics_forget(p_vid uuid) returns int
language plpgsql security definer set search_path = public as $$
declare n int := 0; k int;
begin
  delete from public.analytics_events where visitor_id = p_vid; get diagnostics k = row_count; n := n + k;
  delete from public.analytics_live where visitor_id = p_vid; get diagnostics k = row_count; n := n + k;
  delete from public.analytics_sessions where visitor_id = p_vid; get diagnostics k = row_count; n := n + k;
  delete from public.analytics_visitors where visitor_id = p_vid; get diagnostics k = row_count; n := n + k;
  return n;
end $$;
revoke all on function public.analytics_forget(uuid) from public, anon, authenticated;
grant execute on function public.analytics_forget(uuid) to service_role;

----------------------------------------------------------------------------- 5. Pemicu event bisnis (tidak boleh pernah menggagalkan pendaftaran/pembayaran)
create or replace function public.analytics_link_session(p_user uuid, out o_vid uuid, out o_sid uuid)
language plpgsql security definer set search_path = public as $$
begin
  select visitor_id into o_vid from public.analytics_visitors where user_id = p_user order by last_seen desc limit 1;
  if o_vid is not null then
    select session_id into o_sid from public.analytics_sessions where visitor_id = o_vid order by started_at desc limit 1;
  end if;
end $$;
revoke all on function public.analytics_link_session(uuid) from public, anon, authenticated;

create or replace function public.analytics_trg_signup() returns trigger
language plpgsql security definer set search_path = public as $$
declare m jsonb; v_vid uuid; v_sid uuid;
begin
  begin
    if not public.analytics_enabled() then return new; end if;
    select raw_user_meta_data into m from auth.users where id = new.id;
    v_vid := nullif(m ->> 'nm_vid', '')::uuid;
    if v_vid is null or not exists (select 1 from public.analytics_visitors where visitor_id = v_vid and user_id is null) then return new; end if;
    begin v_sid := nullif(m ->> 'nm_sid', '')::uuid; exception when others then v_sid := null; end;
    if v_sid is not null and not exists (select 1 from public.analytics_sessions where session_id = v_sid and visitor_id = v_vid) then v_sid := null; end if;
    update public.analytics_visitors set user_id = new.id where visitor_id = v_vid;
    insert into public.analytics_events (event, session_id, visitor_id, idem_key) values ('signup_complete', v_sid, v_vid, 'signup:' || new.id) on conflict do nothing;
  exception when others then null;
  end;
  return new;
end $$;
drop trigger if exists analytics_signup on public.profiles;
create trigger analytics_signup after insert on public.profiles for each row execute function public.analytics_trg_signup();

create or replace function public.analytics_trg_invoice() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_vid uuid; v_sid uuid; v_tpl text; v_pkg text;
begin
  begin
    if new.is_sandbox or not public.analytics_enabled() then return new; end if;
    select l.o_vid, l.o_sid into v_vid, v_sid from public.analytics_link_session(new.user_id) l;
    select i.template_id, i.package_type into v_tpl, v_pkg from public.payments p join public.invitations i on i.id = p.invitation_id where p.invoice_id = new.id limit 1;
    if tg_op = 'INSERT' then
      insert into public.analytics_events (event, session_id, visitor_id, template_slug, package_type, invoice_id, idem_key)
      values ('checkout_start', v_sid, v_vid, v_tpl, v_pkg, new.id, 'checkout:' || new.id) on conflict do nothing;
    end if;
    if new.status = 'lunas' and (tg_op = 'INSERT' or old.status is distinct from 'lunas') then
      insert into public.analytics_events (ts, event, session_id, visitor_id, template_slug, package_type, amount, invoice_id, idem_key)
      values (coalesce(new.paid_at, now()), 'purchase_complete', v_sid, v_vid, v_tpl, v_pkg, new.amount, new.id, 'purchase:' || new.id) on conflict do nothing;
    end if;
  exception when others then null;
  end;
  return new;
end $$;
drop trigger if exists analytics_invoice on public.invoices;
create trigger analytics_invoice after insert or update of status on public.invoices for each row execute function public.analytics_trg_invoice();

----------------------------------------------------------------------------- 6. Agregasi harian (idempoten, hitung ulang satu hari WIB)
create or replace function public.analytics_aggregate(p_day date) returns void
language plpgsql security definer set search_path = public as $$
declare s timestamptz := p_day::timestamp at time zone 'Asia/Jakarta'; e timestamptz := (p_day + 1)::timestamp at time zone 'Asia/Jakarta';
        t_signups int; t_orders int; t_revenue bigint; a_signups int; a_orders int; a_revenue bigint;
begin
  select count(*) into t_signups from public.profiles where created_at >= s and created_at < e;
  select count(*), coalesce(sum(amount), 0) into t_orders, t_revenue from public.invoices
    where not is_sandbox and status = 'lunas' and coalesce(paid_at, created_at) >= s and coalesce(paid_at, created_at) < e;

  delete from public.analytics_daily_overview where day = p_day;
  insert into public.analytics_daily_overview (day, sessions, unique_visitors, pageviews, new_visitors, returning_visitors, bounced_sessions, duration_s,
    signups, checkouts, orders, revenue, template_previews, pricing_views, contact_clicks, whatsapp_clicks)
  select p_day,
    (select count(*) from public.analytics_sessions where started_at >= s and started_at < e),
    (select count(distinct visitor_id) from public.analytics_sessions where started_at >= s and started_at < e),
    (select count(*) from public.analytics_events where event = 'page_view' and ts >= s and ts < e),
    (select count(distinct visitor_id) from public.analytics_sessions where started_at >= s and started_at < e and is_new_visitor),
    (select count(distinct visitor_id) from public.analytics_sessions x where x.started_at >= s and x.started_at < e
       and not exists (select 1 from public.analytics_sessions y where y.visitor_id = x.visitor_id and y.started_at >= s and y.started_at < e and y.is_new_visitor)),
    (select count(*) from public.analytics_sessions where started_at >= s and started_at < e and interactions = 0 and pageviews <= 1),
    (select coalesce(sum(least(extract(epoch from last_seen_at - started_at), 3600)), 0)::bigint from public.analytics_sessions where started_at >= s and started_at < e),
    t_signups,
    (select count(*) from public.invoices where not is_sandbox and created_at >= s and created_at < e),
    t_orders, t_revenue,
    (select count(*) from public.analytics_events where event = 'template_preview' and ts >= s and ts < e),
    (select count(*) from public.analytics_events where event = 'pricing_view' and ts >= s and ts < e),
    (select count(*) from public.analytics_events where event = 'contact_click' and ts >= s and ts < e),
    (select count(*) from public.analytics_events where event = 'whatsapp_click' and ts >= s and ts < e);

  delete from public.analytics_daily_source where day = p_day;
  insert into public.analytics_daily_source (day, source_group, utm_source, utm_medium, utm_campaign, utm_content, utm_term, visitors, sessions, bounced_sessions, signups, orders, revenue)
  select p_day, g, us, um, uc, ue, ut, sum(v)::int, sum(se)::int, sum(b)::int, sum(sg)::int, sum(o)::int, sum(r)::bigint from (
    select source_group g, coalesce(utm_source, '') us, coalesce(utm_medium, '') um, coalesce(utm_campaign, '') uc, coalesce(utm_content, '') ue, coalesce(utm_term, '') ut,
           count(distinct visitor_id) v, count(*) se, count(*) filter (where interactions = 0 and pageviews <= 1) b, 0 sg, 0 o, 0::bigint r
      from public.analytics_sessions where started_at >= s and started_at < e group by 1, 2, 3, 4, 5, 6
    union all
    select x.source_group, coalesce(x.utm_source, ''), coalesce(x.utm_medium, ''), coalesce(x.utm_campaign, ''), coalesce(x.utm_content, ''), coalesce(x.utm_term, ''), 0, 0, 0, count(*), 0, 0::bigint
      from public.analytics_events ev join public.analytics_sessions x on x.session_id = ev.session_id
      where ev.event = 'signup_complete' and ev.ts >= s and ev.ts < e group by 1, 2, 3, 4, 5, 6
    union all
    select x.source_group, coalesce(x.utm_source, ''), coalesce(x.utm_medium, ''), coalesce(x.utm_campaign, ''), coalesce(x.utm_content, ''), coalesce(x.utm_term, ''), 0, 0, 0, 0, count(*), coalesce(sum(ev.amount), 0)::bigint
      from public.analytics_events ev join public.analytics_sessions x on x.session_id = ev.session_id
      where ev.event = 'purchase_complete' and ev.ts >= s and ev.ts < e group by 1, 2, 3, 4, 5, 6
  ) q group by g, us, um, uc, ue, ut;
  select coalesce(sum(signups), 0), coalesce(sum(orders), 0), coalesce(sum(revenue), 0) into a_signups, a_orders, a_revenue from public.analytics_daily_source where day = p_day;
  if t_signups > a_signups or t_orders > a_orders or t_revenue > a_revenue then
    insert into public.analytics_daily_source (day, source_group, signups, orders, revenue)
    values (p_day, 'unattributed', greatest(t_signups - a_signups, 0), greatest(t_orders - a_orders, 0), greatest(t_revenue - a_revenue, 0))
    on conflict (day, source_group, utm_source, utm_medium, utm_campaign, utm_content, utm_term) do update
      set signups = excluded.signups, orders = excluded.orders, revenue = excluded.revenue;
  end if;

  delete from public.analytics_daily_page where day = p_day;
  insert into public.analytics_daily_page (day, path, page_group, pageviews, visitors, entrances, exits, bounced_entrances, time_total_s, time_samples, order_sessions)
  select p_day, path, public.analytics_page_group(path), sum(pv)::int, sum(vis)::int, sum(en)::int, sum(ex)::int, sum(be)::int, sum(tt)::bigint, sum(ts_n)::int, sum(os)::int from (
    select path, count(*) pv, count(distinct visitor_id) vis, 0 en, 0 ex, 0 be, 0::bigint tt, 0 ts_n, 0 os
      from public.analytics_events where event = 'page_view' and ts >= s and ts < e and path is not null group by path
    union all
    select landing_path, 0, 0, count(*), 0, count(*) filter (where interactions = 0 and pageviews <= 1), 0, 0, 0
      from public.analytics_sessions where started_at >= s and started_at < e group by landing_path
    union all
    select exit_path, 0, 0, 0, count(*), 0, 0, 0, 0 from public.analytics_sessions where started_at >= s and started_at < e and exit_path is not null group by exit_path
    union all
    select path, 0, 0, 0, 0, 0, sum(d)::bigint, count(*) filter (where d is not null), 0 from (
      select path, least(extract(epoch from lead(ts) over (partition by session_id order by ts) - ts), 1800) d
        from public.analytics_events where event = 'page_view' and ts >= s and ts < e and path is not null) w where d is not null group by path
    union all
    select pv.path, 0, 0, 0, 0, 0, 0, 0, count(distinct pv.session_id)
      from public.analytics_events pv where pv.event = 'page_view' and pv.ts >= s and pv.ts < e and pv.path is not null
        and exists (select 1 from public.analytics_events b where b.session_id = pv.session_id and b.event = 'purchase_complete') group by pv.path
  ) q where path is not null group by path;

  delete from public.analytics_daily_template where day = p_day;
  insert into public.analytics_daily_template (day, template_slug, views, previews, selects, checkouts, purchases, visitors)
  select p_day, template_slug, count(*) filter (where event = 'template_view'), count(*) filter (where event = 'template_preview'),
         count(*) filter (where event = 'template_select'), count(*) filter (where event = 'checkout_start'), count(*) filter (where event = 'purchase_complete'),
         count(distinct visitor_id)
    from public.analytics_events where template_slug is not null and ts >= s and ts < e group by template_slug;

  delete from public.analytics_daily_audience where day = p_day;
  insert into public.analytics_daily_audience (day, dim, value, visitors, sessions)
  select p_day, dim, value, count(distinct visitor_id), count(*) from (
    select 'country' dim, coalesce(country, 'unknown') value, visitor_id from public.analytics_sessions where started_at >= s and started_at < e
    union all select 'device', coalesce(device, 'other'), visitor_id from public.analytics_sessions where started_at >= s and started_at < e
    union all select 'browser', coalesce(browser, 'unknown'), visitor_id from public.analytics_sessions where started_at >= s and started_at < e
    union all select 'os', coalesce(os, 'unknown'), visitor_id from public.analytics_sessions where started_at >= s and started_at < e
    union all select 'screen', coalesce(screen, 'unknown'), visitor_id from public.analytics_sessions where started_at >= s and started_at < e
    union all select 'visitor_type', case when is_new_visitor then 'new' else 'returning' end, visitor_id from public.analytics_sessions where started_at >= s and started_at < e
  ) q group by dim, value;
end $$;
revoke all on function public.analytics_aggregate(date) from public, anon, authenticated;
grant execute on function public.analytics_aggregate(date) to service_role;

create or replace function public.analytics_aggregate_recent(p_days int default 2) returns void
language plpgsql security definer set search_path = public as $$
declare d date := public.analytics_day(now()); i int;
begin
  for i in 0 .. greatest(p_days, 1) - 1 loop perform public.analytics_aggregate(d - i); end loop;
end $$;
revoke all on function public.analytics_aggregate_recent(int) from public, anon, authenticated;
grant execute on function public.analytics_aggregate_recent(int) to service_role;

----------------------------------------------------------------------------- 7. Retensi
-- Event mentah: analytics_settings.retention_days (bawaan 90). Sesi dan visitor: 13 bulan. Agregat harian: tanpa batas. Presence: 1 hari.
create or replace function public.analytics_purge() returns jsonb
language plpgsql security definer set search_path = public as $$
declare d int := greatest(30, least(730, coalesce((public.analytics_setting('retention_days', '90'::jsonb) #>> '{}')::int, 90)));
        a int; b int; c int; k int;
begin
  perform public.analytics_aggregate_recent(3);   -- pastikan hari terakhir sudah terangkum sebelum data mentah dibuang
  delete from public.analytics_events where ts < now() - make_interval(days => d); get diagnostics a = row_count;
  delete from public.analytics_live where last_seen < now() - interval '1 day'; get diagnostics k = row_count;
  delete from public.analytics_sessions where started_at < now() - interval '395 days'; get diagnostics b = row_count;
  delete from public.analytics_visitors v where v.last_seen < now() - interval '395 days' and not exists (select 1 from public.analytics_sessions s where s.visitor_id = v.visitor_id); get diagnostics c = row_count;
  return jsonb_build_object('events', a, 'sessions', b, 'visitors', c, 'live', k, 'retention_days', d);
end $$;
revoke all on function public.analytics_purge() from public, anon, authenticated;
grant execute on function public.analytics_purge() to service_role;

----------------------------------------------------------------------------- 8. Penjadwalan (hanya bila ekstensi pg_cron tersedia; bila tidak, jadwalkan manual atau lewat Edge Function)
do $$ begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid) from cron.job where jobname in ('analytics-aggregate', 'analytics-purge');
    perform cron.schedule('analytics-aggregate', '*/10 * * * *', 'select public.analytics_aggregate_recent(2)');
    perform cron.schedule('analytics-purge', '0 19 * * *', 'select public.analytics_purge()');   -- 19:00 UTC = 02:00 WIB
  else
    raise notice 'pg_cron belum aktif: aktifkan di Database > Extensions lalu jalankan ulang berkas ini, atau panggil analytics_aggregate_recent() secara berkala.';
  end if;
end $$;

----------------------------------------------------------------------------- 9. Izin admin: modul baru "analytics"
do $$ declare cur text[]; begin
  cur := public.admin_perm_modules();
  if not ('analytics' = any (cur)) then
    execute format('create or replace function public.admin_perm_modules() returns text[] language sql immutable as $f$ select %L::text[] $f$', cur || array['analytics']);
  end if;
end $$;
insert into public.role_permissions (role, permission) values ('admin', 'analytics.read') on conflict do nothing;
