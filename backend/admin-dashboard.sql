-- Dashboard admin: ringkasan per periode (hari ini, 7 hari, 30 hari, 3 bulan, 6 bulan, custom).
-- Tambahan saja: admin_stats / admin_reports tidak diubah (kontrak API lama tetap). Prasyarat: admin-schema.sql, payment-schema.sql.
--
-- Aturan angka (satu sumber untuk KPI dan grafik):
--   * Tanggal transaksi = paid_at, atau created_at bila belum dibayar. Seluruh angka transaksi/pendapatan memakai tanggal ini.
--   * Pendapatan kotor  = invoice lunas + invoice refund dalam periode (uang yang pernah masuk).
--   * Refund            = invoice berstatus refund dalam periode.
--   * Pendapatan bersih = kotor - refund = invoice lunas. Transaksi menunggu/gagal/dibatalkan TIDAK PERNAH dihitung.
--     Biaya gateway Midtrans tidak tercatat di sistem, jadi belum dikurangkan.
--   * Hari/bulan dihitung menurut zona Asia/Jakarta. Rentang [p_from, p_to) maksimal 400 hari.
create or replace function public.admin_dashboard(p_from timestamptz, p_to timestamptz) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare gran text; step interval; tz constant text := 'Asia/Jakarta'; res jsonb; g0 timestamp; g1 timestamp;
begin
  if not public.has_perm('dashboard.read') then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_from is null or p_to is null or p_to <= p_from or p_to - p_from > interval '400 days' then raise exception 'periode_tidak_valid'; end if;
  gran := case when p_to - p_from <= interval '62 days' then 'day' else 'month' end;
  step := case gran when 'day' then interval '1 day' else interval '1 month' end;
  g0 := date_trunc(gran, p_from at time zone tz); g1 := date_trunc(gran, (p_to - interval '1 millisecond') at time zone tz);
  select jsonb_build_object(
    'period', jsonb_build_object('from', p_from, 'to', p_to, 'gran', gran),
    'kpi', (select jsonb_build_object(
        'revenue_gross', coalesce(sum(amount) filter (where status in ('lunas','refund')), 0),
        'refund',        coalesce(sum(amount) filter (where status = 'refund'), 0),
        'revenue_net',   coalesce(sum(amount) filter (where status = 'lunas'), 0),
        'tx_success', count(*) filter (where status = 'lunas'),
        'tx_pending', count(*) filter (where status = 'menunggu'),
        'tx_failed',  count(*) filter (where status in ('gagal','dibatalkan')),
        'tx_refund',  count(*) filter (where status = 'refund'),
        'val_pending', coalesce(sum(amount) filter (where status = 'menunggu'), 0),
        'val_failed',  coalesce(sum(amount) filter (where status in ('gagal','dibatalkan')), 0))
      from public.invoices where coalesce(paid_at, created_at) >= p_from and coalesce(paid_at, created_at) < p_to),
    'customers', jsonb_build_object(
        'new', (select count(*) from public.profiles where created_at >= p_from and created_at < p_to),
        'total', (select count(*) from public.profiles)),
    'invitations', jsonb_build_object(
        'aktif', (select count(*) from public.invitations where status = 'aktif' and (expires_at is null or expires_at > now())),
        'draft', (select count(*) from public.invitations where status = 'draft'),
        'menunggu_pembayaran', (select count(*) from public.invitations where status = 'menunggu_pembayaran'),
        'kedaluwarsa', (select count(*) from public.invitations where status = 'nonaktif' or (status = 'aktif' and expires_at <= now())),
        'total', (select count(*) from public.invitations),
        'new', (select count(*) from public.invitations where created_at >= p_from and created_at < p_to)),
    'series', coalesce((select jsonb_agg(x order by x.m) from (
        select to_char(g, case gran when 'day' then 'YYYY-MM-DD' else 'YYYY-MM' end) as m,
          (select count(*) from public.profiles p where p.created_at >= p_from and p.created_at < p_to and date_trunc(gran, p.created_at at time zone tz) = g) as customers,
          (select count(*) from public.invitations i where i.created_at >= p_from and i.created_at < p_to and date_trunc(gran, i.created_at at time zone tz) = g) as invitations,
          coalesce((select sum(v.amount) from public.invoices v where v.status = 'lunas' and coalesce(v.paid_at, v.created_at) >= p_from and coalesce(v.paid_at, v.created_at) < p_to
                      and date_trunc(gran, coalesce(v.paid_at, v.created_at) at time zone tz) = g), 0) as revenue
        from generate_series(g0, g1, step) g) x), '[]'::jsonb),
    -- peringatan operasional: jendela tetap (bukan mengikuti periode)
    'alerts', jsonb_build_object(
        'failed_7d', (select count(*) from public.invoices where status = 'gagal' and created_at > now() - interval '7 days'),
        'pending_24h', (select count(*) from public.invoices where status = 'menunggu' and created_at < now() - interval '24 hours'),
        'expiring_7d', (select count(*) from public.invitations where status = 'aktif' and expires_at > now() and expires_at <= now() + interval '7 days'),
        'expired_7d', (select count(*) from public.invitations where (status = 'nonaktif' or (status = 'aktif' and expires_at <= now())) and expires_at > now() - interval '7 days' and expires_at <= now()),
        'flagged', (select count(*) from public.invitations where moderation = 'flagged'),
        'anomalies_7d', (select count(*) from public.payment_events where created_at > now() - interval '7 days' and result in ('amount_mismatch','order_tidak_ditemukan')))
  ) into res;
  return res;
end $$;
revoke execute on function public.admin_dashboard(timestamptz, timestamptz) from public, anon;
grant execute on function public.admin_dashboard(timestamptz, timestamptz) to authenticated;
