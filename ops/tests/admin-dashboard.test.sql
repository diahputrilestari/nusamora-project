-- Uji DB admin-dashboard.sql: pendapatan tidak menghitung pending/gagal, bersih = lunas, status undangan, deret waktu konsisten, hak akses.
\set ON_ERROR_STOP on
\set QUIET on
delete from auth.users where email like 'ad.%@uji.nusamora.test';
create or replace function pg_temp.as_user(u uuid) returns void language plpgsql as $$ begin reset role; perform set_config('request.jwt.claim.sub', u::text, false); perform set_config('request.jwt.claims', json_build_object('sub', u::text, 'role', 'authenticated')::text, false); set role authenticated; end $$;
grant execute on function pg_temp.as_user(uuid) to public;
do $$ declare a uuid := gen_random_uuid(); c uuid := gen_random_uuid(); o uuid := gen_random_uuid(); begin
  insert into auth.users (id, email) values (a, 'ad.admin@uji.nusamora.test'), (c, 'ad.cust@uji.nusamora.test'), (o, 'ad.owner@uji.nusamora.test');
  insert into public.admin_users (user_id, role) values (a, 'super_admin');
  insert into public.invoices (user_id, number, description, amount, status, created_at, paid_at) values
    (o, 'AD-1', 't', 100000, 'lunas', now() - interval '2 days', now() - interval '2 days'),
    (o, 'AD-2', 't', 50000,  'lunas', now() - interval '1 day',  now() - interval '1 day'),
    (o, 'AD-3', 't', 70000,  'menunggu', now() - interval '30 hours', null),
    (o, 'AD-4', 't', 30000,  'gagal', now() - interval '3 hours', null),
    (o, 'AD-5', 't', 20000,  'dibatalkan', now() - interval '3 hours', null),
    (o, 'AD-6', 't', 40000,  'refund', now() - interval '3 days', now() - interval '3 days'),
    (o, 'AD-7', 't', 999000, 'lunas', now() - interval '200 days', now() - interval '200 days');
  insert into public.invitations (user_id, title, status, slug, plan_id, expires_at, content, moderation) values
    (o, 'I1', 'aktif', 'ad-i1', 'essential', now() + interval '3 days', '{}', 'ok'),
    (o, 'I2', 'aktif', 'ad-i2', 'essential', now() + interval '60 days', '{}', 'flagged'),
    (o, 'I3', 'draft', 'ad-i3', 'essential', now() + interval '60 days', '{}', 'ok'),
    (o, 'I4', 'menunggu_pembayaran', 'ad-i4', 'essential', now() + interval '60 days', '{}', 'ok'),
    (o, 'I5', 'aktif', 'ad-i5', 'essential', now() - interval '2 days', '{}', 'ok'),
    (o, 'I6', 'nonaktif', 'ad-i6', 'essential', now() - interval '10 days', '{}', 'ok');
  insert into public.payment_events (order_id, event_key, source, transaction_status, result) values ('NMAD1', 'ad-ev-1', 'webhook', 'settlement', 'amount_mismatch');
  perform set_config('ad.admin', a::text, false); perform set_config('ad.cust', c::text, false);
end $$;
do $$ declare r jsonb; k jsonb; s jsonb; rev numeric; cu numeric; begin
  perform pg_temp.as_user(current_setting('ad.admin')::uuid);
  r := public.admin_dashboard(now() - interval '7 days', now() + interval '1 hour'); k := r->'kpi';
  if (k->>'revenue_net')::bigint <> 150000 then raise exception 'net harus 150000 (hanya lunas, tanpa pending/gagal/refund/di luar periode): %', k; end if;
  if (k->>'revenue_gross')::bigint <> 190000 then raise exception 'kotor harus lunas+refund=190000: %', k; end if;
  if (k->>'refund')::bigint <> 40000 or (k->>'tx_refund')::int <> 1 then raise exception 'refund salah: %', k; end if;
  if (k->>'tx_success')::int <> 2 or (k->>'tx_pending')::int <> 1 or (k->>'tx_failed')::int <> 2 then raise exception 'hitungan transaksi salah: %', k; end if;
  if (k->>'revenue_net')::bigint <> (k->>'revenue_gross')::bigint - (k->>'refund')::bigint then raise exception 'net <> kotor - refund'; end if;
  select sum((x->>'revenue')::numeric) into rev from jsonb_array_elements(r->'series') x; if rev <> 150000 then raise exception 'jumlah revenue grafik (%) harus sama dengan KPI net', rev; end if;
  if (r->'period'->>'gran') <> 'day' then raise exception 'rentang 7 hari harus harian'; end if;
  if jsonb_array_length(r->'series') not between 8 and 9 then raise exception 'jumlah titik harian salah: %', jsonb_array_length(r->'series'); end if;
  select sum((x->>'customers')::numeric) into cu from jsonb_array_elements(r->'series') x; if cu <> (r->'customers'->>'new')::numeric then raise exception 'pelanggan grafik <> KPI'; end if;
  s := r->'invitations';
  if (s->>'aktif')::int <> 2 or (s->>'draft')::int <> 1 or (s->>'menunggu_pembayaran')::int <> 1 or (s->>'kedaluwarsa')::int <> 2 then raise exception 'status undangan salah: %', s; end if;
  if (r->'alerts'->>'failed_7d')::int <> 1 or (r->'alerts'->>'pending_24h')::int <> 1 or (r->'alerts'->>'expiring_7d')::int <> 1 or (r->'alerts'->>'expired_7d')::int <> 1 or (r->'alerts'->>'flagged')::int <> 1 or (r->'alerts'->>'anomalies_7d')::int < 1 then raise exception 'peringatan salah: %', r->'alerts'; end if;
  r := public.admin_dashboard(now() - interval '1 day' - interval '1 hour', now() + interval '1 hour');
  if (r->'kpi'->>'revenue_net')::bigint <> 50000 then raise exception 'periode 1 hari harus 50000: %', r->'kpi'; end if;
  r := public.admin_dashboard(now() - interval '240 days', now() + interval '1 hour');
  if (r->'period'->>'gran') <> 'month' or (r->'kpi'->>'revenue_net')::bigint <> 1149000 then raise exception 'periode 8 bulan: %', r->'kpi'; end if;
  raise notice 'OK angka, konsistensi grafik-KPI, status undangan, peringatan';
end $$;
do $$ begin
  perform public.admin_dashboard(now(), now() - interval '1 day'); raise exception 'periode terbalik harus ditolak';
exception when others then if sqlerrm like 'periode_tidak_valid%' then raise notice 'OK periode terbalik ditolak'; else raise; end if;
end $$;
do $$ begin
  perform public.admin_dashboard(now() - interval '500 days', now()); raise exception 'rentang > 400 hari harus ditolak';
exception when others then if sqlerrm like 'periode_tidak_valid%' then raise notice 'OK rentang terlalu panjang ditolak'; else raise; end if;
end $$;
do $$ begin
  perform pg_temp.as_user(current_setting('ad.cust')::uuid);
  begin perform public.admin_dashboard(now() - interval '7 days', now()); raise exception 'pelanggan biasa harus ditolak';
  exception when others then if sqlerrm like 'forbidden%' then raise notice 'OK non-admin ditolak'; else raise; end if; end;
  reset role;
  set role anon;
  begin perform public.admin_dashboard(now() - interval '7 days', now()); raise exception 'anon harus ditolak';
  exception when insufficient_privilege then raise notice 'OK anon tidak punya hak eksekusi'; end;
  reset role;
end $$;
reset role;
delete from auth.users where email like 'ad.%@uji.nusamora.test';
delete from public.payment_events where event_key = 'ad-ev-1';
