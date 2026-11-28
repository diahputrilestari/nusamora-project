-- Uji DB admin-analytics.sql (tahap 3). Jalankan: psql "$DB_URL" -v ON_ERROR_STOP=1 -f ops/tests/admin-analytics.test.sql
-- Prasyarat: analytics-schema.sql dan admin-analytics.sql sudah terpasang. Semua data uji dibuat di dalam satu transaksi lalu di-ROLLBACK
-- (tidak ada data tersisa). JANGAN dijalankan di produksi. Gagal = psql berhenti dengan galat "GAGAL: ...".
\set ON_ERROR_STOP on
\set QUIET on
\o /dev/null
begin;
create or replace function pg_temp.ok(name text, cond boolean) returns void language plpgsql as $$
begin if cond is not true then raise exception 'GAGAL: %', name; end if; raise notice 'LULUS  %', name; end $$;
create temp table _i (k text primary key, v text);
create or replace function pg_temp.id(k text) returns uuid language sql as $$ select v::uuid from _i where k = $1 $$;
-- Panggil ekspresi SQL sebagai pengguna tertentu (klaim JWT), tetap superuser agar bisa memeriksa hasil.
create or replace function pg_temp.rpc(who text, q text) returns jsonb language plpgsql as $$
declare j jsonb; begin
  perform set_config('request.jwt.claim.sub', coalesce((select v from _i where k = who), ''), true);
  execute 'select to_jsonb(' || q || ')' into j; return j; end $$;
-- Panggil dengan peran Postgres sungguhan (anon/authenticated) untuk menguji GRANT. Mengembalikan 'ok' atau sqlstate.
create or replace function pg_temp.try_as(r text, who text, q text) returns text language plpgsql as $$
declare o text; begin
  perform set_config('request.jwt.claim.sub', coalesce((select v from _i where k = who), ''), true);
  execute 'set local role ' || quote_ident(r);
  begin execute 'select ' || q; o := 'ok'; exception when others then o := sqlstate; end;
  reset role; return o; end $$;

-- ---------- Data uji (jendela W = 10-12 Maret 2026 WIB; periode sebelumnya = 7-9 Maret)
do $$ declare ad uuid := gen_random_uuid(); sp uuid := gen_random_uuid(); cu uuid := gen_random_uuid(); su uuid := gen_random_uuid();
  r0 uuid := gen_random_uuid(); r1 uuid := gen_random_uuid(); r2 uuid := gen_random_uuid(); r3 uuid := gen_random_uuid(); r4 uuid := gen_random_uuid();
  v1 uuid := gen_random_uuid(); v2 uuid := gen_random_uuid(); v3 uuid := gen_random_uuid(); v4 uuid := gen_random_uuid();
  s1a uuid := gen_random_uuid(); s1b uuid := gen_random_uuid(); s1c uuid := gen_random_uuid(); s2a uuid := gen_random_uuid(); s3a uuid := gen_random_uuid(); s3b uuid := gen_random_uuid(); s4a uuid := gen_random_uuid();
  cat uuid; d date;
begin
  insert into _i values ('ad', ad::text), ('sp', sp::text), ('cu', cu::text), ('su', su::text), ('none', ''),
    ('v1', v1::text), ('v2', v2::text), ('v3', v3::text), ('v4', v4::text), ('s1a', s1a::text), ('s2a', s2a::text), ('s3b', s3b::text), ('r1', r1::text);
  insert into auth.users (id, email) select x, 'aa.' || n || '@uji.nusamora.test' from (values (ad,'ad'),(sp,'sp'),(cu,'cu'),(su,'su'),(r0,'r0'),(r1,'r1'),(r2,'r2'),(r3,'r3'),(r4,'r4')) v(x, n);
  insert into public.profiles (id, full_name, created_at) values
    (ad, 'AA admin', now() - interval '300 days'), (sp, 'AA support', now() - interval '300 days'), (cu, 'AA customer', now() - interval '300 days'), (su, 'AA super', now() - interval '300 days'),
    (r0, 'AA r0', '2026-03-09 16:59:59+00'), (r1, 'AA r1', '2026-03-09 17:00:00+00'), (r2, 'AA r2', '2026-03-10 16:59:59+00'),
    (r3, 'AA r3', '2026-03-10 17:00:00+00'), (r4, 'AA r4', '2026-03-12 17:00:00+00')
    on conflict (id) do update set full_name = excluded.full_name, created_at = excluded.created_at;   -- pemicu auth.users sudah membuat profil
  insert into public.admin_users (user_id, role) values (ad, 'admin'), (sp, 'support'), (su, 'super_admin');

  insert into public.invoices (user_id, number, description, amount, status, created_at, paid_at) values
    (r1, 'AA-1', 'uji', 150000, 'lunas', '2026-03-10 02:00:00+00', '2026-03-10 05:00:00+00'),
    (r2, 'AA-2', 'uji', 250000, 'menunggu', '2026-03-11 03:00:00+00', null),
    (r3, 'AA-3', 'uji sandbox', 99000, 'lunas', '2026-03-11 04:00:00+00', '2026-03-11 05:00:00+00'),
    (r1, 'AA-4', 'uji', 50000, 'lunas', '2026-03-12 10:00:00+00', '2026-03-12 16:59:59+00'),
    (r4, 'AA-5', 'uji', 70000, 'lunas', '2026-03-12 12:00:00+00', '2026-03-12 17:00:00+00');
  update public.invoices set is_sandbox = false where number in ('AA-1', 'AA-2', 'AA-4', 'AA-5');   -- AA-3 tetap sandbox (pemicu menandai semua invoice baru sebagai sandbox)

  insert into public.analytics_visitors (visitor_id, first_seen, last_seen, first_source, user_id) values (v1, '2026-03-10 03:00:00+00', '2026-03-11 03:00:00+00', 'organic', r1);
  insert into public.analytics_visitors (visitor_id, first_seen, last_seen) select x, '2026-03-10', '2026-03-10' from (values (v2), (v3), (v4)) q(x);
  insert into public.analytics_sessions (session_id, visitor_id, started_at, last_seen_at, landing_path, exit_path, referrer_host, source_group, utm_source, utm_medium, utm_campaign, country, device, browser, os, screen, pageviews, interactions, events, is_new_visitor) values
    (s1a, v1, '2026-03-10 03:00:00+00', '2026-03-10 03:02:00+00', '/', '/paket', 'www.google.com', 'organic', null, null, null, 'ID', 'mobile', 'Chrome', 'Android', '390x844', 3, 2, 5, true),
    (s1b, v1, '2026-03-10 09:00:00+00', '2026-03-10 09:00:00+00', '/', '/', 'www.google.com', 'organic', null, null, null, 'ID', 'mobile', 'Chrome', 'Android', '390x844', 1, 0, 1, false),
    (s1c, v1, '2026-03-11 03:00:00+00', '2026-03-11 03:05:00+00', '/paket', '/template', null, 'direct', null, null, null, 'ID', 'mobile', 'Chrome', 'Android', '390x844', 2, 1, 3, false),
    (s2a, v2, '2026-03-10 16:59:59+00', '2026-03-10 16:59:59+00', '/', '/', 'l.instagram.com', 'social', 'instagram', 'social', 'promo-nov', 'US', 'desktop', 'Firefox', 'Windows', '1920x1080', 1, 0, 1, true),
    (s3b, v3, '2026-03-11 17:00:00+00', '2026-03-11 17:10:00+00', '/template', '/akun', null, 'paid', 'google', 'cpc', 'promo-nov', 'ID', 'tablet', 'Safari', 'iOS', '820x1180', 4, 3, 7, true),
    (s3a, v3, '2026-03-12 17:00:00+00', '2026-03-12 17:00:30+00', '/', '/', null, 'direct', null, null, null, 'ID', 'tablet', 'Safari', 'iOS', '820x1180', 1, 0, 1, false),
    (s4a, v4, '2026-03-08 05:00:00+00', '2026-03-08 05:00:00+00', '/', '/', null, 'direct', null, null, null, 'ID', 'desktop', 'Chrome', 'Windows', '1366x768', 1, 0, 1, true);

  insert into public.analytics_events (ts, event, session_id, visitor_id, path, template_slug, amount, invoice_id) values
    ('2026-03-10 03:00:00+00', 'page_view', s1a, v1, '/', null, null, null), ('2026-03-10 03:00:30+00', 'page_view', s1a, v1, '/template', null, null, null), ('2026-03-10 03:01:00+00', 'page_view', s1a, v1, '/paket', null, null, null),
    ('2026-03-10 09:00:00+00', 'page_view', s1b, v1, '/', null, null, null),
    ('2026-03-11 03:00:00+00', 'page_view', s1c, v1, '/paket', null, null, null), ('2026-03-11 03:00:40+00', 'page_view', s1c, v1, '/template', null, null, null),
    ('2026-03-10 16:59:59+00', 'page_view', s2a, v2, '/', null, null, null),
    ('2026-03-11 17:00:00+00', 'page_view', s3b, v3, '/template', null, null, null), ('2026-03-11 17:00:20+00', 'page_view', s3b, v3, '/paket', null, null, null),
    ('2026-03-11 17:00:40+00', 'page_view', s3b, v3, '/akun', null, null, null), ('2026-03-11 17:01:00+00', 'page_view', s3b, v3, '/artikel/tips-undangan', null, null, null),
    ('2026-03-08 05:00:00+00', 'page_view', s4a, v4, '/', null, null, null),
    ('2026-03-10 03:00:10+00', 'template_view', s1a, v1, '/template', 'dino-kids', null, null), ('2026-03-10 03:00:20+00', 'template_preview', s1a, v1, '/preview', 'dino-kids', null, null),
    ('2026-03-11 03:00:50+00', 'template_view', s1c, v1, '/template', 'rose-gold', null, null), ('2026-03-11 03:01:00+00', 'template_select', s1c, v1, '/template', 'rose-gold', null, null),
    ('2026-03-11 17:00:10+00', 'template_view', s3b, v3, '/template', 'dino-kids', null, null),
    ('2026-03-08 05:00:10+00', 'template_view', s4a, v4, '/template', 'dino-kids', null, null),
    ('2026-03-10 02:30:00+00', 'signup_complete', s1a, v1, null, null, null, null), ('2026-03-10 16:59:59+00', 'signup_complete', s2a, v2, null, null, null, null),
    ('2026-03-10 05:00:00+00', 'purchase_complete', s1a, v1, null, null, 150000, (select id from public.invoices where number = 'AA-1'));

  insert into public.event_categories (name, slug) values ('Ulang Tahun AA', 'ulang-tahun-aa') returning id into cat;
  insert into public.templates (slug, name, category_id, package_type) values ('dino-kids', 'Dino Kids', cat, 'essential');

  for d in select generate_series(date '2026-03-07', date '2026-03-13', interval '1 day')::date loop perform public.analytics_aggregate(d); end loop;
end $$;

-- ---------- A. Hak akses (server-side)
do $$ declare f text; fns text[] := array[
  'public.admin_analytics_overview(date ''2026-03-10'', date ''2026-03-12'')', 'public.admin_analytics_series(date ''2026-03-10'', date ''2026-03-12'')',
  'public.admin_analytics_sources(date ''2026-03-10'', date ''2026-03-12'')', 'public.admin_analytics_pages(date ''2026-03-10'', date ''2026-03-12'')',
  'public.admin_analytics_templates(date ''2026-03-10'', date ''2026-03-12'')', 'public.admin_analytics_funnel(date ''2026-03-10'', date ''2026-03-12'')',
  'public.admin_analytics_audience(date ''2026-03-10'', date ''2026-03-12'')', 'public.admin_analytics_live()', 'public.admin_analytics_refresh(1)'];
  a int := 0; b int := 0; c int := 0; d int := 0; e int := 0; n int := 0;
begin
  foreach f in array fns loop
    n := n + 1;
    if pg_temp.try_as('anon', 'none', f) = '42501' then a := a + 1; end if;               -- pengunjung anonim: tidak punya hak EXECUTE
    if pg_temp.try_as('authenticated', 'cu', f) = '42501' then b := b + 1; end if;        -- pengguna biasa: ditolak izin
    if pg_temp.try_as('authenticated', 'sp', f) = '42501' then c := c + 1; end if;        -- admin tanpa analytics.read
    if pg_temp.try_as('authenticated', 'ad', f) = 'ok' then d := d + 1; end if;           -- admin dengan analytics.read
    if pg_temp.try_as('authenticated', 'su', f) = 'ok' then e := e + 1; end if;           -- super admin
  end loop;
  perform pg_temp.ok('A1 anon ditolak di semua ' || n || ' fungsi', a = n);
  perform pg_temp.ok('A2 pengguna biasa ditolak di semua fungsi', b = n);
  perform pg_temp.ok('A3 admin tanpa analytics.read (support) ditolak di semua fungsi', c = n);
  perform pg_temp.ok('A4 admin dengan analytics.read dapat memanggil semua fungsi', d = n);
  perform pg_temp.ok('A5 super_admin dapat memanggil semua fungsi', e = n);
end $$;
select pg_temp.ok('A6 tabel analytics tetap tertutup untuk authenticated (SELECT langsung ditolak)',
  pg_temp.try_as('authenticated', 'ad', 'count(*) from public.analytics_sessions') = '42501' and pg_temp.try_as('anon', 'none', 'count(*) from public.analytics_events') = '42501');
select pg_temp.ok('A7 fungsi internal tidak bisa dipanggil klien', pg_temp.try_as('authenticated', 'ad', 'public.analytics_kpi(date ''2026-03-10'', date ''2026-03-12'')') = '42501'
  and pg_temp.try_as('authenticated', 'ad', 'public.analytics_aggregate(date ''2026-03-10'')') = '42501');

-- ---------- B. Validasi tanggal
select pg_temp.ok('B1 tanggal null ditolak', pg_temp.try_as('authenticated', 'ad', 'public.admin_analytics_overview(null, date ''2026-03-12'')') <> 'ok');
select pg_temp.ok('B2 akhir sebelum awal ditolak', pg_temp.try_as('authenticated', 'ad', 'public.admin_analytics_overview(date ''2026-03-12'', date ''2026-03-10'')') <> 'ok');
select pg_temp.ok('B3 366 hari diterima, 367 hari ditolak', pg_temp.try_as('authenticated', 'ad', 'public.admin_analytics_overview(date ''2025-03-12'', date ''2026-03-12'')') = 'ok'
  and pg_temp.try_as('authenticated', 'ad', 'public.admin_analytics_overview(date ''2025-03-11'', date ''2026-03-12'')') <> 'ok');
select pg_temp.ok('B4 satu hari penuh diterima', pg_temp.try_as('authenticated', 'ad', 'public.admin_analytics_series(date ''2026-03-10'', date ''2026-03-10'')') = 'ok');

-- ---------- C. KPI (periode W = 10-12 Maret)
do $$ declare o jsonb := pg_temp.rpc('ad', $q$public.admin_analytics_overview('2026-03-10', '2026-03-12')$q$); c jsonb := o -> 'current'; p jsonb := o -> 'previous'; m jsonb := o -> 'meta'; begin
  perform pg_temp.ok('C1 sesi = 5 (sesi 03-13 WIB dan periode lain tidak ikut)', (c ->> 'sessions')::int = 5);
  perform pg_temp.ok('C2 pengunjung unik = 3 dan pengunjung-hari = 4', (c ->> 'unique_visitors')::int = 3 and (c ->> 'visitor_days')::int = 4);
  perform pg_temp.ok('C3 page views = 11, halaman per sesi = 2.20', (c ->> 'pageviews')::int = 11 and (c ->> 'pages_per_session')::numeric = 2.20);
  perform pg_temp.ok('C4 bounce rate = 40.0 (2 dari 5 sesi)', (c ->> 'bounce_rate')::numeric = 40.0);
  perform pg_temp.ok('C5 rata-rata durasi = 204 detik', (c ->> 'avg_duration_s')::int = 204);
  perform pg_temp.ok('C6 pendaftaran = 3 (batas WIB: 00:00 masuk, 23:59:59 sehari sebelumnya tidak)', (c ->> 'registrations')::int = 3);
  perform pg_temp.ok('C7 pesanan lunas = 2 dan revenue = 200000 (sandbox AA-3 dan invoice 13 Maret diabaikan)', (c ->> 'paid_orders')::int = 2 and (c ->> 'revenue')::bigint = 200000);
  perform pg_temp.ok('C8 periode sebelumnya (7-9 Maret): 1 sesi, 1 pengunjung, 1 pendaftaran, 0 revenue', (p ->> 'sessions')::int = 1 and (p ->> 'unique_visitors')::int = 1 and (p ->> 'registrations')::int = 1 and (p ->> 'revenue')::bigint = 0);
  perform pg_temp.ok('C9 rentang periode sebelumnya benar', o #>> '{period,prev_from}' = '2026-03-07' and o #>> '{period,prev_to}' = '2026-03-09' and (o #>> '{period,days}')::int = 3);
  perform pg_temp.ok('C10 meta: payment_live false, 1 invoice sandbox di periode, 3 hari rekap', (m ->> 'payment_live')::boolean = false and (m ->> 'sandbox_invoices')::int = 1 and (m ->> 'rollup_days')::int = 3);
end $$;

-- ---------- D. Zona waktu
do $$ begin
  perform pg_temp.ok('D1 hari 10 Maret saja: 2 pendaftaran (r1, r2)', (pg_temp.rpc('ad', $q$public.admin_analytics_overview('2026-03-10', '2026-03-10')$q$) #>> '{current,registrations}')::int = 2);
  perform pg_temp.ok('D2 hari 11 Maret saja: 1 pendaftaran (r3, 00:00 WIB)', (pg_temp.rpc('ad', $q$public.admin_analytics_overview('2026-03-11', '2026-03-11')$q$) #>> '{current,registrations}')::int = 1);
  perform pg_temp.ok('D3 sesi 23:59:59 WIB masuk 10 Maret, sesi 00:00 WIB masuk 12 Maret',
    (pg_temp.rpc('ad', $q$public.admin_analytics_overview('2026-03-10', '2026-03-10')$q$) #>> '{current,sessions}')::int = 3
    and (pg_temp.rpc('ad', $q$public.admin_analytics_overview('2026-03-12', '2026-03-12')$q$) #>> '{current,sessions}')::int = 1);
  perform pg_temp.ok('D4 invoice dibayar 23:59:59 WIB 12 Maret masuk, 00:00 WIB 13 Maret tidak',
    (pg_temp.rpc('ad', $q$public.admin_analytics_overview('2026-03-12', '2026-03-12')$q$) #>> '{current,revenue}')::bigint = 50000
    and (pg_temp.rpc('ad', $q$public.admin_analytics_overview('2026-03-13', '2026-03-13')$q$) #>> '{current,revenue}')::bigint = 70000);
end $$;

-- ---------- E. Tren
do $$ declare s jsonb := pg_temp.rpc('ad', $q$public.admin_analytics_series('2026-03-10', '2026-03-12')$q$); r jsonb := s -> 'rows'; z jsonb; w jsonb; mth jsonb; bad int; begin
  perform pg_temp.ok('E1 3 hari = granularitas harian, 3 baris', s ->> 'gran' = 'day' and jsonb_array_length(r) = 3);
  perform pg_temp.ok('E2 10 Maret: 2 pengunjung, 3 sesi, 5 pageview, 2 daftar, 1 checkout, 1 pesanan, 150000',
    (r -> 0 ->> 'visitors')::int = 2 and (r -> 0 ->> 'sessions')::int = 3 and (r -> 0 ->> 'pageviews')::int = 5 and (r -> 0 ->> 'registrations')::int = 2 and (r -> 0 ->> 'checkouts')::int = 1 and (r -> 0 ->> 'orders')::int = 1 and (r -> 0 ->> 'revenue')::bigint = 150000);
  perform pg_temp.ok('E3 11 Maret: 1 pengunjung, 1 daftar, 1 checkout (invoice menunggu), 0 pesanan', (r -> 1 ->> 'visitors')::int = 1 and (r -> 1 ->> 'registrations')::int = 1 and (r -> 1 ->> 'checkouts')::int = 1 and (r -> 1 ->> 'orders')::int = 0);
  perform pg_temp.ok('E4 12 Maret: 1 pengunjung, 4 pageview, 1 pesanan 50000', (r -> 2 ->> 'visitors')::int = 1 and (r -> 2 ->> 'pageviews')::int = 4 and (r -> 2 ->> 'orders')::int = 1 and (r -> 2 ->> 'revenue')::bigint = 50000);
  perform pg_temp.ok('E5 jumlah tren konsisten dengan KPI (sesi, pageview, pendaftaran, revenue)',
    (select sum((x ->> 'sessions')::int) = 5 and sum((x ->> 'pageviews')::int) = 11 and sum((x ->> 'registrations')::int) = 3 and sum((x ->> 'revenue')::bigint) = 200000 from jsonb_array_elements(r) x));
  z := pg_temp.rpc('ad', $q$public.admin_analytics_series('2026-03-10', '2026-03-16')$q$);
  perform pg_temp.ok('E6 tanggal tanpa aktivitas tetap muncul bernilai nol (7 baris, 3 hari terakhir nol)', jsonb_array_length(z -> 'rows') = 7
    and (select count(*) from jsonb_array_elements(z -> 'rows') x where (x ->> 'sessions')::int = 0 and (x ->> 'registrations')::int = 0 and (x ->> 'revenue')::int = 0) = 3);
  w := pg_temp.rpc('ad', $q$public.admin_analytics_series('2026-01-05', '2026-03-15')$q$);
  select count(*) into bad from jsonb_array_elements(w -> 'rows') x where extract(isodow from (x ->> 'bucket')::date) <> 1;
  perform pg_temp.ok('E7 70 hari = mingguan, bucket selalu hari Senin', w ->> 'gran' = 'week' and bad = 0 and jsonb_array_length(w -> 'rows') = 10);
  mth := pg_temp.rpc('ad', $q$public.admin_analytics_series('2025-12-01', '2026-03-15')$q$);
  perform pg_temp.ok('E8 105 hari = mingguan; 181+ hari = bulanan', mth ->> 'gran' = 'week' and pg_temp.rpc('ad', $q$public.admin_analytics_series('2025-09-15', '2026-03-15')$q$) ->> 'gran' = 'month');
  perform pg_temp.ok('E9 batas: 62 hari harian, 63 hari mingguan, 180 mingguan, 181 bulanan',
    pg_temp.rpc('ad', $q$public.admin_analytics_series('2026-01-01', '2026-03-03')$q$) ->> 'gran' = 'day' and pg_temp.rpc('ad', $q$public.admin_analytics_series('2026-01-01', '2026-03-04')$q$) ->> 'gran' = 'week'
    and pg_temp.rpc('ad', $q$public.admin_analytics_series('2025-10-01', '2026-03-29')$q$) ->> 'gran' = 'week' and pg_temp.rpc('ad', $q$public.admin_analytics_series('2025-10-01', '2026-03-30')$q$) ->> 'gran' = 'month');
end $$;

-- ---------- F. Sumber traffic dan UTM
do $$ declare s jsonb := pg_temp.rpc('ad', $q$public.admin_analytics_sources('2026-03-10', '2026-03-12')$q$); g jsonb := s -> 'groups'; begin
  perform pg_temp.ok('F1 organic: 2 sesi, 1 pengunjung, 1 bounce; direct 1; social 1; paid 1',
    (select (x ->> 'sessions')::int = 2 and (x ->> 'visitors')::int = 1 and (x ->> 'bounced')::int = 1 from jsonb_array_elements(g) x where x ->> 'source_group' = 'organic')
    and (select (x ->> 'sessions')::int = 1 from jsonb_array_elements(g) x where x ->> 'source_group' = 'direct')
    and (select (x ->> 'sessions')::int = 1 from jsonb_array_elements(g) x where x ->> 'source_group' = 'social')
    and (select (x ->> 'sessions')::int = 1 from jsonb_array_elements(g) x where x ->> 'source_group' = 'paid'));
  perform pg_temp.ok('F2 atribusi organic: 1 pendaftaran, 1 pesanan, 150000 (dari tautan sesi)', (select (x ->> 'signups')::int = 1 and (x ->> 'orders')::int = 1 and (x ->> 'revenue')::bigint = 150000 from jsonb_array_elements(g) x where x ->> 'source_group' = 'organic'));
  perform pg_temp.ok('F3 atribusi social: 1 pendaftaran dan tanpa pesanan', (select (x ->> 'signups')::int = 1 and (x ->> 'orders')::int = 0 from jsonb_array_elements(g) x where x ->> 'source_group' = 'social'));
  perform pg_temp.ok('F4 yang tidak terbukti asalnya masuk "unattributed" (1 pendaftaran, 1 pesanan, 50000), bukan dikarang',
    (select (x ->> 'signups')::int = 1 and (x ->> 'orders')::int = 1 and (x ->> 'revenue')::bigint = 50000 and (x ->> 'sessions')::int = 0 from jsonb_array_elements(g) x where x ->> 'source_group' = 'unattributed'));
  perform pg_temp.ok('F5 atribusi + unattributed = total transaksi/pendaftaran periode (3 daftar, 2 pesanan, 200000)',
    (select sum((x ->> 'signups')::int) = 3 and sum((x ->> 'orders')::int) = 2 and sum((x ->> 'revenue')::bigint) = 200000 from jsonb_array_elements(g) x));
  perform pg_temp.ok('F6 kampanye promo-nov: 2 sesi, 2 pengunjung, 1 pendaftaran', (select (x ->> 'sessions')::int = 2 and (x ->> 'visitors')::int = 2 and (x ->> 'signups')::int = 1 from jsonb_array_elements(s -> 'by_campaign') x where x ->> 'k' = 'promo-nov'));
  perform pg_temp.ok('F7 per source (instagram, google) dan per medium (social, cpc)', (select count(*) from jsonb_array_elements(s -> 'by_source') x where x ->> 'k' in ('instagram', 'google')) = 2
    and (select count(*) from jsonb_array_elements(s -> 'by_medium') x where x ->> 'k' in ('social', 'cpc')) = 2);
  perform pg_temp.ok('F8 referrer: www.google.com 2 sesi dan l.instagram.com 1 sesi', (select (x ->> 'sessions')::int from jsonb_array_elements(s -> 'referrers') x where x ->> 'host' = 'www.google.com') = 2);
  perform pg_temp.ok('F9 cakupan rekap dilaporkan (3 dari 3 hari)', (s #>> '{attribution,rollup_days}')::int = 3 and (s #>> '{attribution,days_in_range}')::int = 3);
  perform pg_temp.ok('F10 sesi campaign = 2', (s ->> 'campaign_sessions')::int = 2);
end $$;

-- ---------- G. Halaman populer
do $$ declare p jsonb := pg_temp.rpc('ad', $q$public.admin_analytics_pages('2026-03-10', '2026-03-12')$q$); r jsonb := p -> 'rows'; x jsonb; begin
  perform pg_temp.ok('G1 total view publik = 10 dan 4 baris (halaman /akun disembunyikan)', (p ->> 'total_views')::int = 10 and (p ->> 'total_rows')::int = 4 and not exists (select 1 from jsonb_array_elements(r) y where y ->> 'path' like '/akun%'));
  perform pg_temp.ok('G2 urutan: views desc lalu path ("/" , /paket, /template, artikel)', r -> 0 ->> 'path' = '/' and r -> 1 ->> 'path' = '/paket' and r -> 2 ->> 'path' = '/template' and r -> 3 ->> 'path' = '/artikel/tips-undangan');
  perform pg_temp.ok('G3 halaman "/": 3 view, kontribusi 30.0%, 3 entrance, bounce 66.7%, view periode lalu 1', (r -> 0 ->> 'views')::int = 3 and (r -> 0 ->> 'share')::numeric = 30.0 and (r -> 0 ->> 'entrances')::int = 3 and (r -> 0 ->> 'bounce_rate')::numeric = 66.7 and (r -> 0 ->> 'prev_views')::int = 1);
  perform pg_temp.ok('G4 kelompok halaman', r -> 1 ->> 'group' = 'pricing' and r -> 2 ->> 'group' = 'template_gallery' and r -> 3 ->> 'group' = 'blog');
  x := pg_temp.rpc('ad', $q$public.admin_analytics_pages('2026-03-10', '2026-03-12', 'TEM')$q$);
  perform pg_temp.ok('G5 pencarian (tidak peka huruf besar): "TEM" -> /template saja', (x ->> 'total_rows')::int = 1 and x #>> '{rows,0,path}' = '/template');
  perform pg_temp.ok('G6 pencarian "%" diperlakukan literal (0 hasil)', (pg_temp.rpc('ad', $q$public.admin_analytics_pages('2026-03-10', '2026-03-12', '%')$q$) ->> 'total_rows')::int = 0);
  perform pg_temp.ok('G7 injeksi SQL pada pencarian dan urutan tidak berefek (tanpa galat, tabel utuh)',
    (pg_temp.rpc('ad', $q$public.admin_analytics_pages('2026-03-10', '2026-03-12', '''; drop table public.analytics_events; --')$q$) ->> 'total_rows')::int = 0
    and (pg_temp.rpc('ad', $q$public.admin_analytics_pages('2026-03-10', '2026-03-12', null, 'views; drop table public.analytics_events')$q$) ->> 'total_rows')::int = 4
    and exists (select 1 from pg_class where relname = 'analytics_events'));
  x := pg_temp.rpc('ad', $q$public.admin_analytics_pages('2026-03-10', '2026-03-12', null, 'views', 2, 0)$q$);
  perform pg_temp.ok('G8 paginasi halaman 1: 2 baris dari 4', jsonb_array_length(x -> 'rows') = 2 and (x ->> 'total_rows')::int = 4);
  x := pg_temp.rpc('ad', $q$public.admin_analytics_pages('2026-03-10', '2026-03-12', null, 'views', 2, 2)$q$);
  perform pg_temp.ok('G9 paginasi halaman 2: /template dan artikel', x #>> '{rows,0,path}' = '/template' and x #>> '{rows,1,path}' = '/artikel/tips-undangan');
  perform pg_temp.ok('G10 batas baris: minta 9999 -> 200; ekspor -> 5000', (pg_temp.rpc('ad', $q$public.admin_analytics_pages('2026-03-10', '2026-03-12', null, 'views', 9999, 0)$q$) ->> 'limit')::int = 200
    and (pg_temp.rpc('ad', $q$public.admin_analytics_pages('2026-03-10', '2026-03-12', null, 'views', 25, 0, true)$q$) ->> 'limit')::int = 5000);
  perform pg_temp.ok('G11 urut berdasarkan perubahan: "/" (naik +2) paling atas', pg_temp.rpc('ad', $q$public.admin_analytics_pages('2026-03-10', '2026-03-12', null, 'change')$q$) #>> '{rows,0,path}' in ('/', '/paket', '/template'));
  perform pg_temp.ok('G12 path berisi UUID atau @ disembunyikan', not public.analytics_path_public('/x/123e4567-e89b-12d3-a456-426614174000') and not public.analytics_path_public('/u/a@b.id')
    and not public.analytics_path_public('/admin') and not public.analytics_path_public('/undangan/rina-dan-budi') and public.analytics_path_public('/paket'));
end $$;

-- ---------- H. Template
do $$ declare t jsonb := pg_temp.rpc('ad', $q$public.admin_analytics_templates('2026-03-10', '2026-03-12')$q$); dk jsonb; rg jsonb; begin
  select x into dk from jsonb_array_elements(t -> 'rows') x where x ->> 'slug' = 'dino-kids'; select x into rg from jsonb_array_elements(t -> 'rows') x where x ->> 'slug' = 'rose-gold';
  perform pg_temp.ok('H1 dino-kids: 2 view, 1 preview, nama dan kategori dari katalog', (dk ->> 'views')::int = 2 and (dk ->> 'previews')::int = 1 and dk ->> 'name' = 'Dino Kids' and dk ->> 'category' = 'Ulang Tahun AA');
  perform pg_temp.ok('H2 view periode sebelumnya tercatat (dino-kids 1) untuk tren', (dk ->> 'prev_views')::int = 1);
  perform pg_temp.ok('H3 rose-gold (tidak ada di katalog): nama = slug, kategori "Tidak diketahui", 1 select', rg ->> 'name' = 'rose-gold' and rg ->> 'category' = 'Tidak diketahui' and (rg ->> 'selects')::int = 1);
  perform pg_temp.ok('H4 urutan: template paling banyak dilihat di atas', t #>> '{rows,0,slug}' = 'dino-kids');
  perform pg_temp.ok('H5 kategori diringkas (Ulang Tahun AA 2 view)', (select (x ->> 'views')::int = 2 from jsonb_array_elements(t -> 'categories') x where x ->> 'category' = 'Ulang Tahun AA'));
  perform pg_temp.ok('H6 tren harian 3 hari (view 1 per hari)', jsonb_array_length(t -> 'trend') = 3 and (select bool_and((x ->> 'views')::int = 1) from jsonb_array_elements(t -> 'trend') x));
end $$;

-- ---------- I. Funnel
do $$ declare f jsonb := pg_temp.rpc('ad', $q$public.admin_analytics_funnel('2026-03-10', '2026-03-12')$q$); st jsonb := f -> 'stages'; begin
  perform pg_temp.ok('I1 tahap: 3 pengunjung, 3 pendaftar, 2 checkout, 1 bayar', (st -> 0 ->> 'n')::int = 3 and (st -> 1 ->> 'n')::int = 3 and (st -> 2 ->> 'n')::int = 2 and (st -> 3 ->> 'n')::int = 1);
  perform pg_temp.ok('I2 invoice sandbox (AA-3, r3) tidak dihitung di checkout maupun bayar', (st -> 2 ->> 'n')::int = 2);
  perform pg_temp.ok('I3 pendaftar terhubung ke pengunjung dilaporkan terpisah (1)', (f ->> 'linked_registrations')::int = 1);
  perform pg_temp.ok('I4 status sampel kecil (<30 pendaftar)', f ->> 'status' = 'sampel_kecil');
  perform pg_temp.ok('I5 total periode: 4 invoice checkout (AA-1, AA-2, AA-4, AA-5 dibuat 12 Maret WIB), 2 pesanan lunas', (f #>> '{period_totals,checkout_invoices}')::int = 4 and (f #>> '{period_totals,paid_orders}')::int = 2);
  perform pg_temp.ok('I6 tren funnel ikut dikembalikan (3 baris harian)', f ->> 'gran' = 'day' and jsonb_array_length(f -> 'trend') = 3);
  perform pg_temp.ok('I7 tanpa pendaftar -> status "tidak_ada_pendaftar"', pg_temp.rpc('ad', $q$public.admin_analytics_funnel('2025-01-01', '2025-01-07')$q$) ->> 'status' = 'tidak_ada_pendaftar');
  perform pg_temp.ok('I8 ada pendaftar tanpa data pengunjung -> "tanpa_data_pengunjung"', pg_temp.rpc('ad', $q$public.admin_analytics_funnel('2026-03-09', '2026-03-09')$q$) ->> 'status' = 'tanpa_data_pengunjung');
end $$;

-- ---------- J. Audiens
do $$ declare a jsonb := pg_temp.rpc('ad', $q$public.admin_analytics_audience('2026-03-10', '2026-03-12')$q$); dm jsonb := a -> 'dims'; begin
  perform pg_temp.ok('J1 total sesi 5', (a ->> 'total_sessions')::int = 5);
  perform pg_temp.ok('J2 negara: ID 4 sesi (2 pengunjung), US 1', (select (x ->> 'sessions')::int = 4 and (x ->> 'visitors')::int = 2 from jsonb_array_elements(dm -> 'country') x where x ->> 'value' = 'ID') and (select (x ->> 'sessions')::int = 1 from jsonb_array_elements(dm -> 'country') x where x ->> 'value' = 'US'));
  perform pg_temp.ok('J3 perangkat: mobile 3, desktop 1, tablet 1', (select (x ->> 'sessions')::int from jsonb_array_elements(dm -> 'device') x where x ->> 'value' = 'mobile') = 3 and jsonb_array_length(dm -> 'device') = 3);
  perform pg_temp.ok('J4 browser dan OS tersedia', jsonb_array_length(dm -> 'browser') = 3 and jsonb_array_length(dm -> 'os') = 3);
  perform pg_temp.ok('J5 kelas layar: kecil 3, sedang 1, sangat besar 1', (select (x ->> 'sessions')::int from jsonb_array_elements(dm -> 'screen') x where x ->> 'value' = 'Kecil (<640 px)') = 3 and exists (select 1 from jsonb_array_elements(dm -> 'screen') x where x ->> 'value' = 'Sangat besar (1440+ px)') and exists (select 1 from jsonb_array_elements(dm -> 'screen') x where x ->> 'value' = 'Sedang (640-1023 px)'));
  perform pg_temp.ok('J6 pengunjung baru 3, kembali 2', (select (x ->> 'sessions')::int from jsonb_array_elements(dm -> 'visitor_type') x where x ->> 'value' = 'new') = 3 and (select (x ->> 'sessions')::int from jsonb_array_elements(dm -> 'visitor_type') x where x ->> 'value' = 'returning') = 2);
end $$;

-- ---------- K. Real-time
do $$ declare l jsonb; begin
  insert into public.analytics_live (session_id, visitor_id, path, source_group, country, device, last_seen) values
    (gen_random_uuid(), gen_random_uuid(), '/paket', 'organic', 'ID', 'mobile', now() - interval '1 minute'),
    (gen_random_uuid(), gen_random_uuid(), '/akun', 'direct', 'ID', 'desktop', now() - interval '4 minutes'),
    (gen_random_uuid(), gen_random_uuid(), '/', 'social', 'US', 'desktop', now() - interval '10 minutes'),
    (gen_random_uuid(), gen_random_uuid(), '/template', 'direct', 'ID', 'mobile', now() - interval '2 hours');
  l := pg_temp.rpc('ad', 'public.admin_analytics_live()');
  perform pg_temp.ok('K1 sesi aktif = 2 (aktivitas <= 5 menit), 10 menit dan 2 jam lalu tidak dihitung', (l ->> 'active_sessions')::int = 2 and (l ->> 'active_visitors')::int = 2 and (l ->> 'window_s')::int = 300);
  perform pg_temp.ok('K2 halaman aktif hanya yang publik (/akun tidak muncul)', jsonb_array_length(l -> 'by_page') = 1 and l #>> '{by_page,0,path}' = '/paket');
  perform pg_temp.ok('K3 aktivitas terbaru 30 menit: 3 baris, /akun disamarkan, urut terbaru', jsonb_array_length(l -> 'recent') = 3 and l #>> '{recent,0,path}' = '/paket' and l #>> '{recent,1,path}' = '(halaman privat)');
  perform pg_temp.ok('K4 tanpa identitas: tidak ada visitor_id/session_id', l::text !~ 'visitor_id|session_id|user_id');
end $$;

-- ---------- L. Rekap manual
do $$ declare a jsonb; b jsonb; begin
  delete from public.analytics_daily_overview where day = public.analytics_day(now());   -- bersihkan jejak panggilan di bagian A agar throttle teruji dari nol
  a := pg_temp.rpc('ad', 'public.admin_analytics_refresh(1)'); b := pg_temp.rpc('ad', 'public.admin_analytics_refresh(1)');
  perform pg_temp.ok('L1 rekap pertama berjalan', a ->> 'ok' = 'true' and a ->> 'skipped' is null);
  perform pg_temp.ok('L2 rekap kedua dalam 60 detik dilewati (tidak membebani DB)', b ->> 'skipped' = 'baru_saja');
  perform pg_temp.ok('L3 jumlah hari dibatasi 1..90', (pg_temp.rpc('ad', 'public.admin_analytics_refresh(5000)') ->> 'days')::int = 90 and (pg_temp.rpc('ad', 'public.admin_analytics_refresh(0)') ->> 'days') is null);
end $$;

-- ---------- M. Data kosong (tidak ada data pada periode)
do $$ declare o jsonb := pg_temp.rpc('ad', $q$public.admin_analytics_overview('2025-01-01', '2025-01-07')$q$); c jsonb := o -> 'current'; begin
  perform pg_temp.ok('M1 KPI kosong: sesi 0, rasio (bounce, durasi, halaman/sesi) = null (bukan angka karangan)', (c ->> 'sessions')::int = 0 and c -> 'bounce_rate' = 'null'::jsonb and c -> 'avg_duration_s' = 'null'::jsonb and c -> 'pages_per_session' = 'null'::jsonb);
  perform pg_temp.ok('M2 pendaftaran, pesanan, revenue = 0', (c ->> 'registrations')::int = 0 and (c ->> 'paid_orders')::int = 0 and (c ->> 'revenue')::int = 0);
  perform pg_temp.ok('M3 halaman/template/sumber/audiens kosong tanpa galat',
    jsonb_array_length(pg_temp.rpc('ad', $q$public.admin_analytics_pages('2025-01-01', '2025-01-07')$q$) -> 'rows') = 0
    and jsonb_array_length(pg_temp.rpc('ad', $q$public.admin_analytics_templates('2025-01-01', '2025-01-07')$q$) -> 'rows') = 0
    and jsonb_array_length(pg_temp.rpc('ad', $q$public.admin_analytics_sources('2025-01-01', '2025-01-07')$q$) -> 'groups') = 0
    and pg_temp.rpc('ad', $q$public.admin_analytics_audience('2025-01-01', '2025-01-07')$q$) -> 'dims' = '{}'::jsonb);
  perform pg_temp.ok('M4 tren kosong = 7 baris nol', jsonb_array_length(pg_temp.rpc('ad', $q$public.admin_analytics_series('2025-01-01', '2025-01-07')$q$) -> 'rows') = 7);
  perform pg_temp.ok('M5 saklar analytics terbaca mati (collecting=false) dan belum ada sesi di database kosong', (o #>> '{meta,collecting}')::boolean = false);
end $$;

-- ---------- N. Privasi: tidak ada identitas di keluaran apa pun
do $$ declare txt text; ids text[] := array(select v from _i where k in ('v1', 'v2', 'v3', 'v4', 's1a', 's2a', 's3b', 'r1')); x text; begin
  txt := concat_ws(' ', pg_temp.rpc('ad', $q$public.admin_analytics_overview('2026-03-10', '2026-03-12')$q$)::text, pg_temp.rpc('ad', $q$public.admin_analytics_series('2026-03-10', '2026-03-12')$q$)::text,
    pg_temp.rpc('ad', $q$public.admin_analytics_sources('2026-03-10', '2026-03-12')$q$)::text, pg_temp.rpc('ad', $q$public.admin_analytics_pages('2026-03-10', '2026-03-12', null, 'views', 25, 0, true)$q$)::text,
    pg_temp.rpc('ad', $q$public.admin_analytics_templates('2026-03-10', '2026-03-12')$q$)::text, pg_temp.rpc('ad', $q$public.admin_analytics_funnel('2026-03-10', '2026-03-12')$q$)::text,
    pg_temp.rpc('ad', $q$public.admin_analytics_audience('2026-03-10', '2026-03-12')$q$)::text, pg_temp.rpc('ad', 'public.admin_analytics_live()')::text);
  perform pg_temp.ok('N1 keluaran tidak memuat satu pun ID pengunjung/sesi/pengguna', not exists (select 1 from unnest(ids) i where position(i in txt) > 0));
  perform pg_temp.ok('N2 keluaran tidak memuat kunci visitor_id/session_id/user_id/email/ip', txt !~* '"(visitor_id|session_id|user_id|email|ip|ip_address)"' and txt !~ '@uji\.nusamora');
end $$;

-- ---------- O. Performa (30.000 sesi sintetis di jendela lain, dibuang saat ROLLBACK)
do $$ declare t0 timestamptz; ms numeric; plan text; begin
  insert into public.analytics_sessions (session_id, visitor_id, started_at, last_seen_at, landing_path, source_group, device, country, pageviews, interactions, events, is_new_visitor)
  select gen_random_uuid(), ('00000000-0000-4000-8000-' || lpad((g % 4000)::text, 12, '0'))::uuid, '2025-10-01'::timestamptz + (g * interval '260 seconds'), '2025-10-01'::timestamptz + (g * interval '260 seconds') + interval '40 seconds', '/', 'direct', 'mobile', 'ID', 1 + g % 4, g % 3, 2, g % 5 = 0
    from generate_series(1, 30000) g;
  analyze public.analytics_sessions;
  t0 := clock_timestamp(); perform pg_temp.rpc('ad', $q$public.admin_analytics_overview('2025-10-01', '2025-12-31')$q$); ms := extract(epoch from clock_timestamp() - t0) * 1000;
  perform pg_temp.ok('O1 ringkasan 92 hari atas 30.000 sesi selesai < 2000 ms (' || round(ms) || ' ms)', ms < 2000);
  t0 := clock_timestamp(); perform pg_temp.rpc('ad', $q$public.admin_analytics_audience('2025-10-01', '2025-12-31')$q$); ms := extract(epoch from clock_timestamp() - t0) * 1000;
  perform pg_temp.ok('O2 audiens 92 hari < 2000 ms (' || round(ms) || ' ms)', ms < 2000);
  execute 'explain (format json, costs off) select count(*), count(distinct visitor_id) from public.analytics_sessions where started_at >= ''2025-11-10''::timestamptz and started_at < ''2025-11-17''::timestamptz' into plan;
  perform pg_temp.ok('O3 rentang sempit memakai indeks started_at, bukan seq scan', plan ~ 'Index Scan|Index Only Scan|Bitmap Index Scan' and plan !~ 'Seq Scan');
end $$;

rollback;
\o
\echo SELESAI: semua uji admin-analytics lulus (transaksi di-ROLLBACK)
