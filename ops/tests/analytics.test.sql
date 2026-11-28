-- Uji DB analytics-schema.sql. Jalankan: psql "$DB_URL" -v ON_ERROR_STOP=1 -f ops/tests/analytics.test.sql
-- Semua dijalankan dalam satu transaksi lalu di-ROLLBACK: tidak meninggalkan data. Gagal = psql berhenti dengan galat "GAGAL: ...".
\set ON_ERROR_STOP on
\set QUIET on
\o /dev/null
begin;
create or replace function pg_temp.ok(name text, cond boolean) returns void language plpgsql as $$
begin if cond is not true then raise exception 'GAGAL: %', name; end if; raise notice 'LULUS  %', name; end $$;
create or replace function pg_temp.cnt(q text) returns bigint language plpgsql as $$ declare n bigint; begin execute q into n; return n; end $$;

-- ---------- A. Saklar mati = tidak mencatat apa pun
update public.analytics_settings set value = 'false'::jsonb where key = 'enabled';
do $$ declare r jsonb; begin
  r := public.analytics_ingest(jsonb_build_object('vid', gen_random_uuid(), 'sid', gen_random_uuid(), 'events', jsonb_build_array(jsonb_build_object('e', 'page_view', 'path', '/'))));
  perform pg_temp.ok('A1 saklar mati: ingest dilewati', r ->> 'skipped' = 'disabled');
  perform pg_temp.ok('A2 saklar mati: tidak ada baris tersimpan', pg_temp.cnt('select count(*) from public.analytics_events') = 0 and pg_temp.cnt('select count(*) from public.analytics_visitors') = 0);
end $$;

update public.analytics_settings set value = 'true'::jsonb where key = 'enabled';

-- ---------- B. Fungsi murni
select pg_temp.ok('B1 path: query, hash, huruf besar, garis miring penutup dibersihkan', public.analytics_clean_path('/Artikel/Tes/?utm_source=x#h') = '/artikel/tes');
select pg_temp.ok('B2 path: root tetap "/"', public.analytics_clean_path('/') = '/');
select pg_temp.ok('B3 path: tanpa garis miring awal ditolak', public.analytics_clean_path('https://evil.test/x') is null and public.analytics_clean_path('abc') is null);
select pg_temp.ok('B4 path: dipotong 200 karakter', length(public.analytics_clean_path('/' || repeat('a', 500))) = 200);
select pg_temp.ok('B5 sumber: direct', public.analytics_classify_source(null, null, null) = 'direct');
select pg_temp.ok('B6 sumber: organic Google', public.analytics_classify_source('www.google.com', null, null) = 'organic');
select pg_temp.ok('B7 sumber: social Pinterest/Instagram/TikTok/X/Facebook', (select bool_and(public.analytics_classify_source(h, null, null) = 'social') from unnest(array['id.pinterest.com', 'l.instagram.com', 'vm.tiktok.com', 't.co', 'm.facebook.com']) h));
select pg_temp.ok('B8 sumber: referral untuk domain lain', public.analytics_classify_source('blog.contoh.id', null, null) = 'referral');
select pg_temp.ok('B9 sumber: paid dan email menurut utm_medium', public.analytics_classify_source(null, 'cpc', 'google') = 'paid' and public.analytics_classify_source(null, 'email', 'newsletter') = 'email');
select pg_temp.ok('B10 sumber: utm tak dikenal = other; domain sendiri = direct', public.analytics_classify_source(null, 'foo', 'bar') = 'other' and public.analytics_classify_source('nusamora.com', null, null) = 'direct');
select pg_temp.ok('B11 grup halaman', public.analytics_page_group('/') = 'homepage' and public.analytics_page_group('/paket') = 'pricing' and public.analytics_page_group('/artikel/x') = 'blog' and public.analytics_page_group('/zzz') = 'other');
select pg_temp.ok('B12 hari memakai WIB: 16:59:59Z = 20 Nov, 17:00:00Z = 21 Nov', public.analytics_day('2026-11-20 16:59:59+00') = date '2026-11-20' and public.analytics_day('2026-11-20 17:00:00+00') = date '2026-11-21');

-- ---------- C. Ingest: visitor, sesi, event
create temp table _t (k text primary key, v text);
insert into _t values ('v1', gen_random_uuid()::text), ('s1', gen_random_uuid()::text), ('v2', gen_random_uuid()::text), ('s2', gen_random_uuid()::text);
do $$ declare v1 uuid := (select v from _t where k = 'v1'); s1 uuid := (select v from _t where k = 's1'); v2 uuid := (select v from _t where k = 'v2'); r jsonb; ev jsonb := '[]'::jsonb; i int; x record;
begin
  r := public.analytics_ingest(jsonb_build_object('vid', v1, 'sid', s1,
    'ctx', jsonb_build_object('ref', 'www.google.com', 'device', 'mobile', 'browser', 'Chrome', 'os', 'Android', 'screen', '390x844', 'country', 'ID', 'utm', jsonb_build_object('campaign', 'Promo-Nov')),
    'events', jsonb_build_array(jsonb_build_object('e', 'page_view', 'path', '/Template/?x=1'), jsonb_build_object('e', 'template_view', 'path', '/template', 'tpl', 'Dino_Kids!'))));
  perform pg_temp.ok('C1 ingest sukses, sesi baru', r ->> 'ok' = 'true' and r ->> 'new_session' = 'true' and (r ->> 'accepted')::int = 2);
  select * into x from public.analytics_sessions where session_id = s1;
  perform pg_temp.ok('C2 sesi: landing, sumber organic, campaign, perangkat', x.landing_path = '/template' and x.source_group = 'organic' and x.utm_campaign = 'promo-nov' and x.device = 'mobile' and x.country = 'ID' and x.screen = '390x844' and x.is_new_visitor);
  perform pg_temp.ok('C3 sesi: 1 pageview, 1 interaksi', x.pageviews = 1 and x.interactions = 1 and x.events = 2);
  perform pg_temp.ok('C4 slug template disaring ke [a-z0-9-]', pg_temp.cnt($q$select count(*) from public.analytics_events where template_slug = 'dinokids'$q$) = 1);
  perform pg_temp.ok('C5 session_start dibuat otomatis tepat sekali', pg_temp.cnt('select count(*) from public.analytics_events where event = ''session_start''') = 1);

  r := public.analytics_ingest(jsonb_build_object('vid', v1, 'sid', s1, 'events', jsonb_build_array(jsonb_build_object('e', 'page_view', 'path', '/paket'))));
  select * into x from public.analytics_sessions where session_id = s1;
  perform pg_temp.ok('C6 batch kedua: sesi sama bertambah, bukan sesi baru', r ->> 'new_session' = 'false' and x.pageviews = 2 and x.exit_path = '/paket' and pg_temp.cnt('select count(*) from public.analytics_sessions') = 1);
  perform pg_temp.ok('C7 session_start tidak ganda', pg_temp.cnt('select count(*) from public.analytics_events where event = ''session_start''') = 1);

  r := public.analytics_ingest(jsonb_build_object('vid', v2, 'sid', s1, 'events', jsonb_build_array(jsonb_build_object('e', 'page_view', 'path', '/'))));
  perform pg_temp.ok('C8 sesi tidak bisa dibajak visitor lain', r ->> 'ok' = 'false' and pg_temp.cnt('select count(*) from public.analytics_events where visitor_id = ''' || v2 || '''') = 0);

  r := public.analytics_ingest(jsonb_build_object('vid', 'bukan-uuid', 'sid', s1));
  perform pg_temp.ok('C9 ID tidak valid ditolak tanpa galat', r ->> 'ok' = 'false');

  r := public.analytics_ingest(jsonb_build_object('vid', v1, 'sid', s1, 'events', jsonb_build_array(
    jsonb_build_object('e', 'signup_complete'), jsonb_build_object('e', 'purchase_complete', 'amount', 99999999), jsonb_build_object('e', 'checkout_start'),
    jsonb_build_object('e', 'ngawur'), jsonb_build_object('e', 'page_view', 'path', 'tanpa-slash'))));
  perform pg_temp.ok('C10 event bisnis dari klien, event asing, path rusak: semua dibuang', (r ->> 'accepted')::int = 0 and (r ->> 'dropped')::int = 5);
  perform pg_temp.ok('C11 tidak ada event bisnis palsu tersimpan', pg_temp.cnt('select count(*) from public.analytics_events where event in (''signup_complete'', ''purchase_complete'', ''checkout_start'')') = 0);

  for i in 1 .. 40 loop ev := ev || jsonb_build_array(jsonb_build_object('e', 'search', 'term', 'kata ' || i)); end loop;
  r := public.analytics_ingest(jsonb_build_object('vid', v1, 'sid', s1, 'events', ev));
  perform pg_temp.ok('C12 maksimal 25 event per permintaan', (r ->> 'accepted')::int = 25);
  perform pg_temp.ok('C13 presence (live) terisi untuk sesi ini', pg_temp.cnt('select count(*) from public.analytics_live where session_id = ''' || s1 || '''') = 1);
end $$;

-- ---------- D. Hak akses: tabel dan fungsi tertutup untuk anon/authenticated
do $$ declare ok1 boolean := false; ok2 boolean := false; ok3 boolean := false; begin
  set local role anon;
  begin perform count(*) from public.analytics_events; exception when insufficient_privilege then ok1 := true; end;
  begin perform public.analytics_ingest('{}'::jsonb); exception when insufficient_privilege then ok2 := true; end;
  reset role; set local role authenticated;
  begin perform count(*) from public.analytics_sessions; exception when insufficient_privilege then ok3 := true; end;
  reset role;
  perform pg_temp.ok('D1 anon tidak bisa membaca event dan tidak bisa memanggil ingest', ok1 and ok2);
  perform pg_temp.ok('D2 authenticated tidak bisa membaca sesi', ok3);
end $$;

-- ---------- E. Pendaftaran dan transaksi (pemicu)
create temp table _u (k text primary key, id uuid);
do $$ declare v1 uuid := (select v from _t where k = 'v1'); s1 uuid := (select v from _t where k = 's1'); u1 uuid := gen_random_uuid(); u2 uuid := gen_random_uuid(); u3 uuid := gen_random_uuid(); r int;
begin
  insert into _u values ('u1', u1), ('u2', u2), ('u3', u3);
  insert into auth.users (id, email, raw_user_meta_data) values (u1, 'a.uji@analytics.test', jsonb_build_object('full_name', 'Uji A', 'nm_vid', v1, 'nm_sid', s1));
  perform pg_temp.ok('E1 pendaftaran dengan nm_vid mencatat signup_complete satu kali dan mengaitkan visitor', pg_temp.cnt('select count(*) from public.analytics_events where event = ''signup_complete'' and visitor_id = ''' || v1 || '''') = 1
    and (select user_id from public.analytics_visitors where visitor_id = v1) = u1 and (select session_id from public.analytics_events where event = 'signup_complete') = s1);
  insert into auth.users (id, email, raw_user_meta_data) values (u2, 'b.uji@analytics.test', jsonb_build_object('full_name', 'Uji B', 'nm_vid', 'bukan-uuid'));
  perform pg_temp.ok('E2 nm_vid rusak tidak menggagalkan pendaftaran', exists (select 1 from public.profiles where id = u2));
  insert into auth.users (id, email, raw_user_meta_data) values (u3, 'c.uji@analytics.test', jsonb_build_object('full_name', 'Uji C', 'nm_vid', v1));
  perform pg_temp.ok('E3 visitor yang sudah terkait akun tidak diklaim ulang', (select user_id from public.analytics_visitors where visitor_id = v1) = u1 and pg_temp.cnt('select count(*) from public.analytics_events where event = ''signup_complete''') = 1);
end $$;

alter table public.invoices disable trigger invoices_mark_sandbox;
do $$ declare u1 uuid := (select id from _u where k = 'u1'); u2 uuid := (select id from _u where k = 'u2'); v1 uuid := (select v from _t where k = 'v1'); s1 uuid := (select v from _t where k = 's1'); i1 uuid := gen_random_uuid(); i2 uuid := gen_random_uuid(); i3 uuid := gen_random_uuid(); i4 uuid := gen_random_uuid();
begin
  insert into public.invoices (id, user_id, number, description, amount, status, is_sandbox) values (i1, u1, 'T-SANDBOX-1', 'x', 79000, 'lunas', true);
  perform pg_temp.ok('E4 invoice sandbox tidak mencatat event', pg_temp.cnt('select count(*) from public.analytics_events where invoice_id = ''' || i1 || '''') = 0);

  insert into public.invoices (id, user_id, number, description, amount, status, is_sandbox) values (i2, u1, 'T-REAL-1', 'x', 79000, 'menunggu', false);
  perform pg_temp.ok('E5 invoice nyata: checkout_start tercatat dan terkait sesi', pg_temp.cnt('select count(*) from public.analytics_events where event = ''checkout_start'' and invoice_id = ''' || i2 || ''' and session_id = ''' || s1 || '''') = 1);
  update public.invoices set status = 'lunas', paid_at = now() where id = i2;
  perform pg_temp.ok('E6 lunas: purchase_complete tepat satu kali dengan jumlah benar', pg_temp.cnt('select count(*) from public.analytics_events where event = ''purchase_complete'' and invoice_id = ''' || i2 || ''' and amount = 79000') = 1);
  update public.invoices set midtrans_status = 'settlement' where id = i2;
  update public.invoices set status = 'menunggu' where id = i2; update public.invoices set status = 'lunas' where id = i2;   -- invoice refund kini final (after-sales A)
  perform pg_temp.ok('E7 pembaruan berulang tidak menggandakan purchase_complete', pg_temp.cnt('select count(*) from public.analytics_events where event = ''purchase_complete'' and invoice_id = ''' || i2 || '''') = 1);

  insert into public.invoices (id, user_id, number, description, amount, status, is_sandbox, paid_at) values (i3, u2, 'T-REAL-2', 'x', 149000, 'lunas', false, now());
  perform pg_temp.ok('E8 pembeli tanpa visitor terkait: purchase tercatat tanpa sesi', pg_temp.cnt('select count(*) from public.analytics_events where event = ''purchase_complete'' and invoice_id = ''' || i3 || ''' and session_id is null') = 1);
  insert into public.invoices (id, user_id, number, description, amount, status, is_sandbox) values (i4, u2, 'T-GAGAL-1', 'x', 249000, 'gagal', false);
  perform pg_temp.ok('E9 invoice gagal tidak menjadi pembelian', pg_temp.cnt('select count(*) from public.analytics_events where event = ''purchase_complete'' and invoice_id = ''' || i4 || '''') = 0);
end $$;

-- ---------- F. Agregasi
do $$ declare d date := public.analytics_day(now()); o record; n1 int; n2 int; q record; v3 uuid := gen_random_uuid(); s3 uuid := gen_random_uuid(); v1 uuid := (select v from _t where k = 'v1');
begin
  -- visitor kedua yang kembali (bukan baru) dan sesi kedua milik v1 pada hari yang sama
  insert into public.analytics_visitors (visitor_id, first_seen, last_seen) values (v3, now() - interval '5 days', now());
  insert into public.analytics_sessions (session_id, visitor_id, started_at, last_seen_at, landing_path, exit_path, source_group, pageviews, interactions, events, is_new_visitor) values (s3, v3, now(), now() + interval '90 seconds', '/', '/', 'direct', 1, 0, 1, false);
  insert into public.analytics_sessions (session_id, visitor_id, started_at, last_seen_at, landing_path, exit_path, source_group, pageviews, interactions, events, is_new_visitor) values (gen_random_uuid(), v1, now(), now(), '/paket', '/paket', 'direct', 1, 0, 1, false);
  perform public.analytics_aggregate(d);
  select * into o from public.analytics_daily_overview where day = d;
  perform pg_temp.ok('F1 pengunjung unik berbeda dari jumlah sesi', o.unique_visitors = 2 and o.sessions = 3 and o.unique_visitors <> o.sessions);
  perform pg_temp.ok('F2 pengunjung baru vs kembali', o.new_visitors = 1 and o.returning_visitors = 1);
  perform pg_temp.ok('F3 bounce: sesi satu halaman tanpa interaksi', o.bounced_sessions = 2);
  perform pg_temp.ok('F4 durasi sesi terjumlah (maks 1 jam per sesi)', o.duration_s >= 90 and o.duration_s < 3600);
  perform pg_temp.ok('F5 pendaftaran dari tabel profil (tiga akun uji)', o.signups = 3);
  perform pg_temp.ok('F6 pesanan dan revenue hanya dari invoice nyata berstatus lunas (sandbox, gagal, menunggu tidak ikut)', o.orders = 2 and o.revenue = 79000 + 149000);
  perform pg_temp.ok('F7 checkout dihitung dari invoice nyata (sandbox tidak ikut)', o.checkouts = 3);
  select coalesce(sum(orders), 0), coalesce(sum(revenue), 0) into n1, n2 from public.analytics_daily_source where day = d;
  perform pg_temp.ok('F8 total pesanan dan revenue per sumber sama dengan ringkasan (selisih = unattributed)', n1 = o.orders and n2 = o.revenue);
  perform pg_temp.ok('F9 pesanan terkait sesi memakai sumber sesi; sisanya unattributed', (select orders from public.analytics_daily_source where day = d and source_group = 'organic' and utm_campaign = 'promo-nov') = 1
    and (select orders from public.analytics_daily_source where day = d and source_group = 'unattributed') = 1);
  perform pg_temp.ok('F10 pendaftaran per sumber: 1 terkait, 2 unattributed', (select sum(signups) from public.analytics_daily_source where day = d and source_group = 'organic') = 1 and (select signups from public.analytics_daily_source where day = d and source_group = 'unattributed') = 2);
  select * into q from public.analytics_daily_page where day = d and path = '/paket';
  perform pg_temp.ok('F11 halaman: pageview, pengunjung, entrance, exit dihitung', q.pageviews = 1 and q.visitors = 1 and q.entrances = 1 and q.exits >= 1 and q.page_group = 'pricing');
  perform pg_temp.ok('F12 template: view tercatat per slug', (select views from public.analytics_daily_template where day = d and template_slug = 'dinokids') = 1);
  perform pg_temp.ok('F13 audiens: perangkat dan jenis pengunjung terisi', (select sessions from public.analytics_daily_audience where day = d and dim = 'device' and value = 'mobile') = 1 and exists (select 1 from public.analytics_daily_audience where day = d and dim = 'visitor_type' and value = 'new'));
  perform public.analytics_aggregate(d);
  perform pg_temp.ok('F14 agregasi idempoten (jalankan ulang tidak menggandakan)', (select count(*) from public.analytics_daily_overview where day = d) = 1 and (select orders from public.analytics_daily_overview where day = d) = 2);
end $$;

-- ---------- G. Batas hari WIB pada agregasi
do $$ declare a uuid := gen_random_uuid(); b uuid := gen_random_uuid(); va uuid := gen_random_uuid(); vb uuid := gen_random_uuid();
begin
  insert into public.analytics_sessions (session_id, visitor_id, started_at, last_seen_at, source_group) values
    (a, va, '2020-03-10 16:59:59+00', '2020-03-10 16:59:59+00', 'direct'), (b, vb, '2020-03-10 17:00:00+00', '2020-03-10 17:00:00+00', 'direct');
  perform public.analytics_aggregate(date '2020-03-10'); perform public.analytics_aggregate(date '2020-03-11');
  perform pg_temp.ok('G1 sesi 23:59:59 WIB masuk tanggal 10, 00:00:00 WIB masuk tanggal 11', (select sessions from public.analytics_daily_overview where day = '2020-03-10') = 1 and (select sessions from public.analytics_daily_overview where day = '2020-03-11') = 1);
end $$;

-- ---------- H. Izin admin
do $$ declare ua uuid := gen_random_uuid(); us uuid := gen_random_uuid(); up uuid := gen_random_uuid(); r1 boolean; r2 boolean; r3 boolean;
begin
  insert into auth.users (id, email) values (ua, 'adm.uji@analytics.test'), (us, 'sup.uji@analytics.test'), (up, 'spr.uji@analytics.test');
  insert into public.admin_users (user_id, role, active) values (ua, 'admin', true), (us, 'support', true), (up, 'super_admin', true);
  perform set_config('request.jwt.claim.sub', ua::text, true); r1 := public.has_perm('analytics.read');
  perform set_config('request.jwt.claim.sub', us::text, true); r2 := public.has_perm('analytics.read');
  perform set_config('request.jwt.claim.sub', up::text, true); r3 := public.has_perm('analytics.read');
  perform set_config('request.jwt.claim.sub', '', true);
  perform pg_temp.ok('H1 izin analytics.read: admin ya, support tidak, super admin ya', r1 and not r2 and r3);
  perform pg_temp.ok('H2 modul analytics terdaftar di katalog izin', 'analytics' = any (public.admin_perm_modules()));
end $$;

-- ---------- I. Retensi dan hak hapus
do $$ declare r jsonb; vf uuid := gen_random_uuid(); sf uuid := gen_random_uuid(); n int; d date := public.analytics_day(now() - interval '120 days');
begin
  insert into public.analytics_visitors (visitor_id, first_seen, last_seen) values (vf, now() - interval '120 days', now() - interval '120 days');
  insert into public.analytics_sessions (session_id, visitor_id, started_at, last_seen_at, source_group) values (sf, vf, now() - interval '120 days', now() - interval '120 days', 'direct');
  insert into public.analytics_events (ts, event, session_id, visitor_id, path) values (now() - interval '120 days', 'page_view', sf, vf, '/lama');
  perform public.analytics_aggregate(d);
  insert into public.analytics_live (session_id, visitor_id, last_seen) values (gen_random_uuid(), vf, now() - interval '3 days');
  r := public.analytics_purge();
  perform pg_temp.ok('I1 purge menghapus event mentah > 90 hari, event baru tetap', (r ->> 'events')::int >= 1 and pg_temp.cnt($q$select count(*) from public.analytics_events where path = '/lama'$q$) = 0 and pg_temp.cnt('select count(*) from public.analytics_events where ts > now() - interval ''1 day''') > 0);
  perform pg_temp.ok('I2 agregat harian tetap ada setelah purge', (select sessions from public.analytics_daily_overview where day = d) = 1);
  perform pg_temp.ok('I3 presence lama dibuang', pg_temp.cnt('select count(*) from public.analytics_live where last_seen < now() - interval ''1 day''') = 0);
  update public.analytics_settings set value = '30'::jsonb where key = 'retention_days';
  insert into public.analytics_events (ts, event, path) values (now() - interval '45 days', 'page_view', '/empatlima');
  perform public.analytics_purge();
  perform pg_temp.ok('I4 retensi dapat diubah (30 hari menghapus event 45 hari)', pg_temp.cnt($q$select count(*) from public.analytics_events where path = '/empatlima'$q$) = 0);
  update public.analytics_settings set value = '90'::jsonb where key = 'retention_days';
  n := public.analytics_forget((select v::uuid from _t where k = 'v1'));
  perform pg_temp.ok('I5 hak hapus: semua jejak satu visitor dihapus', n > 0 and pg_temp.cnt('select count(*) from public.analytics_events where visitor_id = (select v::uuid from _t where k = ''v1'')') = 0
    and pg_temp.cnt('select count(*) from public.analytics_sessions where visitor_id = (select v::uuid from _t where k = ''v1'')') = 0 and pg_temp.cnt('select count(*) from public.analytics_visitors where visitor_id = (select v::uuid from _t where k = ''v1'')') = 0);
end $$;

rollback;
\o
\echo SEMUA UJI ANALYTICS LULUS
