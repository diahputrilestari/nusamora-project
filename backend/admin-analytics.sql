-- NusaMora: Admin Analytics & Visitor Intelligence, TAHAP 3 (RPC baca untuk dashboard admin). ADITIF dan aman diulang.
-- Prasyarat: analytics-schema.sql (tahap 1), sandbox-separation.sql, admin-roles.sql.
--
-- Prinsip keamanan:
--  * Tabel analytics tetap TERTUTUP. Dashboard hanya membaca lewat fungsi di bawah (security definer, search_path terkunci).
--  * Setiap fungsi memeriksa has_perm('analytics.read') DI SERVER; anon tidak punya hak EXECUTE sama sekali.
--  * Tanggal divalidasi (satu hari = hari WIB, maksimal 366 hari), jumlah baris dibatasi, tidak ada SQL dinamis dari input pengguna
--    (urutan memakai daftar putih, pencarian memakai strpos bukan LIKE).
--  * Tidak ada identitas pengunjung yang dikembalikan (tanpa visitor_id, session_id, IP, user_id, e-mail).
--  * Pesanan dan revenue hanya dari invoices tidak-sandbox berstatus lunas. Pendaftaran dari profiles.
--
-- Sumber data:
--  * KPI, tren, sumber (lalu lintas), audiens: analytics_sessions (tabel sesi ringkas, retensi 395 hari, indeks started_at).
--  * Atribusi sumber (pendaftaran/pesanan/revenue), halaman, template: rekap harian (analytics_daily_*). Rekap dijalankan oleh
--    pg_cron bila aktif; bila belum, admin memakai admin_analytics_refresh() (tombol "Rekap sekarang").
--  * Real-time: analytics_live (presence, dibuang setelah 1 hari).

create index if not exists invoices_real_created_idx on public.invoices (created_at) where not is_sandbox;
create index if not exists invoices_real_paid_idx on public.invoices ((coalesce(paid_at, created_at))) where not is_sandbox and status = 'lunas';
create index if not exists profiles_created_idx on public.profiles (created_at);

----------------------------------------------------------------------------- Fungsi bantu internal (tanpa hak untuk klien)
create or replace function public.analytics_bucket(d date, g text) returns date language sql immutable as $$
  select case g when 'day' then d when 'week' then date_trunc('week', d)::date else date_trunc('month', d)::date end $$;

create or replace function public.analytics_path_public(p text) returns boolean language sql immutable as $$
  select p is not null
     and p !~ '^/(admin|akun|atur-password|lupa-password|undangan|live|cari-teman)(/|$)'
     and p !~ '[0-9a-f]{8}-[0-9a-f]{4}-' and position('@' in p) = 0 $$;

create or replace function public.analytics_screen_class(s text) returns text language sql immutable as $$
  select case when s is null or s !~ '^[0-9]{3,5}x[0-9]{3,5}$' then 'Tidak diketahui'
    when split_part(s, 'x', 1)::int < 640 then 'Kecil (<640 px)'
    when split_part(s, 'x', 1)::int < 1024 then 'Sedang (640-1023 px)'
    when split_part(s, 'x', 1)::int < 1440 then 'Besar (1024-1439 px)'
    else 'Sangat besar (1440+ px)' end $$;

-- Periksa izin dan rentang tanggal. Dipanggil di awal setiap fungsi admin_analytics_*.
create or replace function public.analytics_admin_guard(p_from date, p_to date) returns void
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.has_perm('analytics.read') then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_from is null or p_to is null or p_to < p_from or p_to - p_from > 365 then raise exception 'periode_tidak_valid'; end if;
end $$;

create or replace function public.analytics_kpi(p_from date, p_to date) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare s timestamptz := p_from::timestamp at time zone 'Asia/Jakarta'; e timestamptz := (p_to + 1)::timestamp at time zone 'Asia/Jakarta'; r jsonb; reg bigint; ord bigint; rev bigint;
begin
  select count(*) into reg from public.profiles where created_at >= s and created_at < e;
  select count(*), coalesce(sum(amount), 0) into ord, rev from public.invoices
    where not is_sandbox and status = 'lunas' and coalesce(paid_at, created_at) >= s and coalesce(paid_at, created_at) < e;
  select jsonb_build_object(
    'sessions', count(*),
    'unique_visitors', count(distinct visitor_id),
    'visitor_days', count(distinct (visitor_id, public.analytics_day(started_at))),
    'pageviews', coalesce(sum(pageviews), 0),
    'pages_per_session', round(coalesce(sum(pageviews), 0)::numeric / nullif(count(*), 0), 2),
    'avg_duration_s', round(avg(least(extract(epoch from last_seen_at - started_at), 3600))),
    'bounce_rate', round(100.0 * count(*) filter (where interactions = 0 and pageviews <= 1) / nullif(count(*), 0), 1))
    into r from public.analytics_sessions where started_at >= s and started_at < e;
  return r || jsonb_build_object('registrations', reg, 'paid_orders', ord, 'revenue', rev);
end $$;

create or replace function public.analytics_series_core(p_from date, p_to date) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare s timestamptz := p_from::timestamp at time zone 'Asia/Jakarta'; e timestamptz := (p_to + 1)::timestamp at time zone 'Asia/Jakarta';
        g text := case when p_to - p_from + 1 <= 62 then 'day' when p_to - p_from + 1 <= 180 then 'week' else 'month' end; rows jsonb;
begin
  with b as (select distinct public.analytics_bucket(d::date, g) bk from generate_series(p_from, p_to, interval '1 day') d),
  sa as (select public.analytics_bucket(public.analytics_day(started_at), g) bk, count(*) sessions, count(distinct visitor_id) visitors, coalesce(sum(pageviews), 0) pageviews
           from public.analytics_sessions where started_at >= s and started_at < e group by 1),
  pr as (select public.analytics_bucket(public.analytics_day(created_at), g) bk, count(*) n from public.profiles where created_at >= s and created_at < e group by 1),
  iv as (select public.analytics_bucket(public.analytics_day(created_at), g) bk, count(*) n from public.invoices where not is_sandbox and created_at >= s and created_at < e group by 1),
  po as (select public.analytics_bucket(public.analytics_day(coalesce(paid_at, created_at)), g) bk, count(*) n, coalesce(sum(amount), 0) rev from public.invoices
           where not is_sandbox and status = 'lunas' and coalesce(paid_at, created_at) >= s and coalesce(paid_at, created_at) < e group by 1)
  select coalesce(jsonb_agg(jsonb_build_object('bucket', b.bk, 'visitors', coalesce(sa.visitors, 0), 'sessions', coalesce(sa.sessions, 0), 'pageviews', coalesce(sa.pageviews, 0),
           'registrations', coalesce(pr.n, 0), 'checkouts', coalesce(iv.n, 0), 'orders', coalesce(po.n, 0), 'revenue', coalesce(po.rev, 0)) order by b.bk), '[]'::jsonb)
    into rows from b left join sa on sa.bk = b.bk left join pr on pr.bk = b.bk left join iv on iv.bk = b.bk left join po on po.bk = b.bk;
  return jsonb_build_object('gran', g, 'rows', rows);
end $$;

revoke all on function public.analytics_bucket(date, text), public.analytics_path_public(text), public.analytics_screen_class(text),
  public.analytics_admin_guard(date, date), public.analytics_kpi(date, date), public.analytics_series_core(date, date) from public, anon, authenticated;

----------------------------------------------------------------------------- 1. Ringkasan KPI (+ periode sebelumnya)
create or replace function public.admin_analytics_overview(p_from date, p_to date) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare len int; pf date; pt date; s timestamptz := p_from::timestamp at time zone 'Asia/Jakarta'; e timestamptz := (p_to + 1)::timestamp at time zone 'Asia/Jakarta';
begin
  perform public.analytics_admin_guard(p_from, p_to);
  len := p_to - p_from + 1; pf := p_from - len; pt := p_from - 1;
  return jsonb_build_object(
    'period', jsonb_build_object('from', p_from, 'to', p_to, 'days', len, 'prev_from', pf, 'prev_to', pt),
    'current', public.analytics_kpi(p_from, p_to),
    'previous', public.analytics_kpi(pf, pt),
    'meta', jsonb_build_object(
      'collecting', public.analytics_enabled(),
      'payment_live', exists (select 1 from public.app_settings where key = 'payment_live_since' and nullif(trim(both '"' from value::text), '') is not null and value::text <> 'null'),
      'sandbox_invoices', (select count(*) from public.invoices where is_sandbox and created_at >= s and created_at < e),
      'rollup_days', (select count(*) from public.analytics_daily_overview where day between p_from and p_to),
      'last_rollup', (select max(computed_at) from public.analytics_daily_overview),
      'first_session', (select min(started_at) from public.analytics_sessions)));
end $$;

----------------------------------------------------------------------------- 2. Tren (harian / mingguan / bulanan menurut rentang)
create or replace function public.admin_analytics_series(p_from date, p_to date) returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin perform public.analytics_admin_guard(p_from, p_to); return public.analytics_series_core(p_from, p_to); end $$;

----------------------------------------------------------------------------- 3. Sumber traffic dan UTM
-- Lalu lintas (pengunjung, sesi, bounce) dari sesi. Atribusi (pendaftaran, pesanan, revenue) dari rekap harian; baris "unattributed" = yang tidak terbukti berasal dari sumber tertentu.
create or replace function public.admin_analytics_sources(p_from date, p_to date) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare s timestamptz := p_from::timestamp at time zone 'Asia/Jakarta'; e timestamptz := (p_to + 1)::timestamp at time zone 'Asia/Jakarta'; res jsonb;
begin
  perform public.analytics_admin_guard(p_from, p_to);
  with ss as (select source_group, nullif(utm_source, '') us, nullif(utm_medium, '') um, nullif(utm_campaign, '') uc, nullif(utm_content, '') ue, nullif(utm_term, '') ut, visitor_id, interactions, pageviews, referrer_host
                from public.analytics_sessions where started_at >= s and started_at < e),
  ds as (select source_group, nullif(utm_source, '') us, nullif(utm_medium, '') um, nullif(utm_campaign, '') uc, nullif(utm_content, '') ue, nullif(utm_term, '') ut, signups, orders, revenue
           from public.analytics_daily_source where day between p_from and p_to)
  select jsonb_build_object(
    'groups', coalesce((select jsonb_agg(x order by x.sessions desc) from (
        select t.g as source_group, coalesce(a.visitors, 0) visitors, coalesce(a.sessions, 0) sessions, coalesce(a.bounced, 0) bounced,
               coalesce(d.signups, 0) signups, coalesce(d.orders, 0) orders, coalesce(d.revenue, 0) revenue
          from (select source_group g from ss union select source_group from ds) t
          left join (select source_group g, count(distinct visitor_id) visitors, count(*) sessions, count(*) filter (where interactions = 0 and pageviews <= 1) bounced from ss group by 1) a on a.g = t.g
          left join (select source_group g, sum(signups) signups, sum(orders) orders, sum(revenue) revenue from ds group by 1) d on d.g = t.g) x), '[]'::jsonb),
    'campaign_sessions', (select count(*) from ss where uc is not null),
    'referrers', coalesce((select jsonb_agg(x order by x.sessions desc) from (select referrer_host host, count(*) sessions, count(distinct visitor_id) visitors from ss where referrer_host is not null group by 1 order by 2 desc limit 20) x), '[]'::jsonb),
    'by_source', coalesce((select jsonb_agg(x order by x.sessions desc) from (select v.k, v.visitors, v.sessions, coalesce(d.signups, 0) signups, coalesce(d.orders, 0) orders, coalesce(d.revenue, 0) revenue from
        (select us k, count(distinct visitor_id) visitors, count(*) sessions from ss where us is not null group by 1) v
        left join (select us k, sum(signups) signups, sum(orders) orders, sum(revenue) revenue from ds where us is not null group by 1) d on d.k = v.k order by v.sessions desc limit 50) x), '[]'::jsonb),
    'by_medium', coalesce((select jsonb_agg(x order by x.sessions desc) from (select v.k, v.visitors, v.sessions, coalesce(d.signups, 0) signups, coalesce(d.orders, 0) orders, coalesce(d.revenue, 0) revenue from
        (select um k, count(distinct visitor_id) visitors, count(*) sessions from ss where um is not null group by 1) v
        left join (select um k, sum(signups) signups, sum(orders) orders, sum(revenue) revenue from ds where um is not null group by 1) d on d.k = v.k order by v.sessions desc limit 50) x), '[]'::jsonb),
    'by_campaign', coalesce((select jsonb_agg(x order by x.sessions desc) from (select v.k, v.visitors, v.sessions, coalesce(d.signups, 0) signups, coalesce(d.orders, 0) orders, coalesce(d.revenue, 0) revenue from
        (select uc k, count(distinct visitor_id) visitors, count(*) sessions from ss where uc is not null group by 1) v
        left join (select uc k, sum(signups) signups, sum(orders) orders, sum(revenue) revenue from ds where uc is not null group by 1) d on d.k = v.k order by v.sessions desc limit 50) x), '[]'::jsonb),
    'by_content', coalesce((select jsonb_agg(x order by x.sessions desc) from (select ue k, count(distinct visitor_id) visitors, count(*) sessions from ss where ue is not null group by 1 order by 3 desc limit 50) x), '[]'::jsonb),
    'by_term', coalesce((select jsonb_agg(x order by x.sessions desc) from (select ut k, count(distinct visitor_id) visitors, count(*) sessions from ss where ut is not null group by 1 order by 3 desc limit 50) x), '[]'::jsonb),
    'attribution', jsonb_build_object(
        'days_in_range', p_to - p_from + 1,
        'rollup_days', (select count(*) from public.analytics_daily_overview where day between p_from and p_to),
        'unattributed', (select jsonb_build_object('signups', coalesce(sum(signups), 0), 'orders', coalesce(sum(orders), 0), 'revenue', coalesce(sum(revenue), 0)) from public.analytics_daily_source where day between p_from and p_to and source_group = 'unattributed')))
    into res;
  return res;
end $$;

----------------------------------------------------------------------------- 4. Halaman populer (rekap harian; paginasi, pencarian, urutan daftar putih)
create or replace function public.admin_analytics_pages(p_from date, p_to date, p_q text default null, p_sort text default 'views', p_limit int default 25, p_offset int default 0, p_export boolean default false)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare len int := p_to - p_from + 1; pf date; pt date; lim int; off int := greatest(coalesce(p_offset, 0), 0); q text := nullif(lower(btrim(coalesce(p_q, ''))), ''); srt text := coalesce(p_sort, 'views'); res jsonb;
begin
  perform public.analytics_admin_guard(p_from, p_to);
  if srt not in ('views', 'visitors', 'entrances', 'change') then srt := 'views'; end if;
  lim := case when p_export then 5000 else greatest(1, least(coalesce(p_limit, 25), 200)) end;
  pf := p_from - len; pt := p_from - 1;
  with cur as (select path, max(page_group) page_group, sum(pageviews) views, sum(visitors) visitors, sum(entrances) entrances, sum(exits) exits, sum(bounced_entrances) bounced, sum(time_total_s) tt, sum(time_samples) tn
                 from public.analytics_daily_page where day between p_from and p_to and public.analytics_path_public(path) group by path),
  prv as (select path, sum(pageviews) views from public.analytics_daily_page where day between pf and pt and public.analytics_path_public(path) group by path),
  tot as (select coalesce(sum(views), 0) v from cur),
  fl as (select c.*, coalesce(p.views, 0) prev_views from cur c left join prv p on p.path = c.path where q is null or strpos(c.path, q) > 0)
  select jsonb_build_object('total_rows', (select count(*) from fl), 'total_views', (select v from tot), 'limit', lim, 'offset', off,
    'rows', coalesce((select jsonb_agg(jsonb_build_object('path', x.path, 'group', x.page_group, 'views', x.views, 'visitors', x.visitors, 'entrances', x.entrances, 'exits', x.exits,
          'bounce_rate', round(100.0 * x.bounced / nullif(x.entrances, 0), 1), 'avg_time_s', round(x.tt::numeric / nullif(x.tn, 0)),
          'share', round(100.0 * x.views / nullif((select v from tot), 0), 1), 'prev_views', x.prev_views) order by x.ord) from (
        select f.*, row_number() over (order by case srt when 'views' then f.views when 'visitors' then f.visitors when 'entrances' then f.entrances else f.views - f.prev_views end desc, f.path) ord
          from fl f order by ord limit lim offset off) x), '[]'::jsonb)) into res;
  return res;
end $$;

----------------------------------------------------------------------------- 5. Template (identitas = slug template; nama/kategori dari katalog bila ada)
create or replace function public.admin_analytics_templates(p_from date, p_to date) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare len int := p_to - p_from + 1; pf date; pt date; res jsonb;
begin
  perform public.analytics_admin_guard(p_from, p_to);
  pf := p_from - len; pt := p_from - 1;
  with cur as (select template_slug slug, sum(views) views, sum(previews) previews, sum(selects) selects, sum(checkouts) checkouts, sum(purchases) purchases, sum(visitors) visitors
                 from public.analytics_daily_template where day between p_from and p_to group by 1),
  prv as (select template_slug slug, sum(views) views, sum(previews) previews from public.analytics_daily_template where day between pf and pt group by 1),
  j as (select c.*, coalesce(p.views, 0) prev_views, coalesce(p.previews, 0) prev_previews, coalesce(t.name, c.slug) name, coalesce(ec.name, 'Tidak diketahui') category
          from cur c left join prv p on p.slug = c.slug left join public.templates t on t.slug = c.slug left join public.event_categories ec on ec.id = t.category_id)
  select jsonb_build_object(
    'rows', coalesce((select jsonb_agg(to_jsonb(x) order by x.views desc, x.previews desc, x.slug) from (select * from j order by views desc, previews desc, slug limit 100) x), '[]'::jsonb),
    'categories', coalesce((select jsonb_agg(x order by x.views desc) from (select category, sum(views) views, sum(previews) previews, sum(selects) selects, count(*) templates from j group by 1) x), '[]'::jsonb),
    'trend', coalesce((select jsonb_agg(x order by x.day) from (select day, sum(views) views, sum(previews) previews, sum(selects) selects from public.analytics_daily_template where day between p_from and p_to group by 1) x), '[]'::jsonb),
    'rollup_days', (select count(*) from public.analytics_daily_overview where day between p_from and p_to),
    'days_in_range', len) into res;
  return res;
end $$;

----------------------------------------------------------------------------- 6. Funnel konversi
-- Tahap: Pengunjung (sesi analitik, perlu persetujuan) -> Pendaftaran (profiles) -> Checkout (invoice tidak-sandbox dibuat) -> Bayar sukses (invoice lunas tidak-sandbox).
-- Tahap 2-4 adalah kohort: pengguna yang mendaftar pada periode, dilihat sampai sekarang. Pengunjung anonim tidak dihubungkan ke pengguna kecuali lewat tautan
-- yang tercatat saat pendaftaran dengan persetujuan (analytics_visitors.user_id); jumlah yang terhubung dilaporkan terpisah.
create or replace function public.admin_analytics_funnel(p_from date, p_to date) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare s timestamptz := p_from::timestamp at time zone 'Asia/Jakarta'; e timestamptz := (p_to + 1)::timestamp at time zone 'Asia/Jakarta';
        vis bigint; reg bigint; chk bigint; pay bigint; linked bigint; st text; ser jsonb;
begin
  perform public.analytics_admin_guard(p_from, p_to);
  select count(distinct visitor_id) into vis from public.analytics_sessions where started_at >= s and started_at < e;
  select count(*) into reg from public.profiles where created_at >= s and created_at < e;
  select count(distinct i.user_id) filter (where true), count(distinct i.user_id) filter (where i.status = 'lunas') into chk, pay
    from public.invoices i join public.profiles p on p.id = i.user_id where p.created_at >= s and p.created_at < e and not i.is_sandbox;
  select count(*) into linked from public.profiles p where p.created_at >= s and p.created_at < e and exists (select 1 from public.analytics_visitors v where v.user_id = p.id);
  st := case when reg = 0 then 'tidak_ada_pendaftar' when vis = 0 then 'tanpa_data_pengunjung' when reg < 30 then 'sampel_kecil' else 'ok' end;
  ser := public.analytics_series_core(p_from, p_to);
  return jsonb_build_object('status', st, 'stages', jsonb_build_array(
      jsonb_build_object('key', 'visitors', 'n', vis), jsonb_build_object('key', 'registrations', 'n', reg),
      jsonb_build_object('key', 'checkout', 'n', chk), jsonb_build_object('key', 'paid', 'n', pay)),
    'linked_registrations', linked,
    'period_totals', jsonb_build_object('checkout_invoices', (select count(*) from public.invoices where not is_sandbox and created_at >= s and created_at < e),
      'paid_orders', (select count(*) from public.invoices where not is_sandbox and status = 'lunas' and coalesce(paid_at, created_at) >= s and coalesce(paid_at, created_at) < e)),
    'gran', ser -> 'gran', 'trend', ser -> 'rows');
end $$;

----------------------------------------------------------------------------- 7. Audiens (hanya dimensi yang memang dikumpulkan: negara, perangkat, browser, OS, kelas layar, baru/kembali)
create or replace function public.admin_analytics_audience(p_from date, p_to date) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare s timestamptz := p_from::timestamp at time zone 'Asia/Jakarta'; e timestamptz := (p_to + 1)::timestamp at time zone 'Asia/Jakarta'; res jsonb;
begin
  perform public.analytics_admin_guard(p_from, p_to);
  with ss as (select visitor_id, country, device, browser, os, screen, is_new_visitor from public.analytics_sessions where started_at >= s and started_at < e),
  d as (select 'country' dim, coalesce(country, 'unknown') v, visitor_id from ss union all select 'device', coalesce(device, 'other'), visitor_id from ss
        union all select 'browser', coalesce(browser, 'Tidak diketahui'), visitor_id from ss union all select 'os', coalesce(os, 'Tidak diketahui'), visitor_id from ss
        union all select 'screen', public.analytics_screen_class(screen), visitor_id from ss union all select 'visitor_type', case when is_new_visitor then 'new' else 'returning' end, visitor_id from ss),
  g as (select dim, v, count(distinct visitor_id) visitors, count(*) sessions from d group by dim, v),
  r as (select g.*, row_number() over (partition by dim order by sessions desc, v) rn from g)
  select coalesce(jsonb_object_agg(dim, rows), '{}'::jsonb) into res from (
    select dim, jsonb_agg(jsonb_build_object('value', v, 'visitors', visitors, 'sessions', sessions) order by rn) rows from r where rn <= 15 group by dim) z;
  return jsonb_build_object('dims', res, 'total_sessions', (select count(*) from public.analytics_sessions where started_at >= s and started_at < e));
end $$;

----------------------------------------------------------------------------- 8. Real-time (sesi aktif = aktivitas dalam 5 menit terakhir)
create or replace function public.admin_analytics_live() returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.has_perm('analytics.read') then raise exception 'forbidden' using errcode = '42501'; end if;
  return jsonb_build_object('window_s', 300, 'now', now(), 'collecting', public.analytics_enabled(),
    'active_sessions', (select count(*) from public.analytics_live where last_seen >= now() - interval '5 minutes'),
    'active_visitors', (select count(distinct visitor_id) from public.analytics_live where last_seen >= now() - interval '5 minutes'),
    'by_page', coalesce((select jsonb_agg(x order by x.n desc) from (select path, count(*) n from public.analytics_live where last_seen >= now() - interval '5 minutes' and public.analytics_path_public(path) group by 1 order by 2 desc limit 10) x), '[]'::jsonb),
    'by_device', coalesce((select jsonb_agg(x order by x.n desc) from (select coalesce(device, 'other') device, count(*) n from public.analytics_live where last_seen >= now() - interval '5 minutes' group by 1) x), '[]'::jsonb),
    'recent', coalesce((select jsonb_agg(x order by x.ago_s) from (select case when public.analytics_path_public(path) then path else '(halaman privat)' end path, coalesce(device, 'other') device, country, source_group,
        extract(epoch from now() - last_seen)::int ago_s from public.analytics_live where last_seen >= now() - interval '30 minutes' order by last_seen desc limit 25) x), '[]'::jsonb));
end $$;

----------------------------------------------------------------------------- 9. Rekap sekarang (tanpa pg_cron). Idempoten; hanya menulis tabel rekap.
create or replace function public.admin_analytics_refresh(p_days int default 2) returns jsonb
language plpgsql security definer set search_path = public as $$
declare n int := greatest(1, least(coalesce(p_days, 2), 90)); last_at timestamptz;
begin
  if not public.has_perm('analytics.read') then raise exception 'forbidden' using errcode = '42501'; end if;
  select max(computed_at) into last_at from public.analytics_daily_overview where day = public.analytics_day(now());
  if n <= 2 and last_at is not null and last_at > now() - interval '60 seconds' then return jsonb_build_object('ok', true, 'skipped', 'baru_saja', 'last', last_at); end if;
  perform public.analytics_aggregate_recent(n);
  return jsonb_build_object('ok', true, 'days', n, 'at', now());
end $$;

----------------------------------------------------------------------------- Hak akses: hanya pengguna login; izin diperiksa di dalam fungsi
do $$ declare f text; begin
  foreach f in array array[
    'admin_analytics_overview(date,date)', 'admin_analytics_series(date,date)', 'admin_analytics_sources(date,date)',
    'admin_analytics_pages(date,date,text,text,integer,integer,boolean)', 'admin_analytics_templates(date,date)', 'admin_analytics_funnel(date,date)',
    'admin_analytics_audience(date,date)', 'admin_analytics_live()', 'admin_analytics_refresh(integer)'] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;
