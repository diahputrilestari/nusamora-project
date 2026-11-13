-- NusaMora Admin: Laporan & Analytics (menu I). ADITIF dan aman diulang; admin_reports(int) lama tidak diubah.
-- Prasyarat: admin-schema.sql, payment-schema.sql, admin-transactions.sql (payment_refunds), admin-templates.sql.
-- Semua angka dihitung di server (zona Asia/Jakarta). Pendapatan memakai pembayaran Midtrans yang benar-benar lunas (payments.status paid/refunded).
create index if not exists payments_paid_at_idx on public.payments (paid_at) where status in ('paid','refunded');
create index if not exists invitations_created_idx on public.invitations (created_at);
create index if not exists live_guest_events_created_idx on public.live_guest_events (created_at);

create or replace function public.admin_report(p_from timestamptz, p_to timestamptz) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare tz constant text := 'Asia/Jakarta'; gran text; step interval; g0 timestamp; g1 timestamp; res jsonb; fmt text;
begin
  if not public.has_perm('reports.read') then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_from is null or p_to is null or p_to <= p_from or p_to - p_from > interval '400 days' then raise exception 'periode_tidak_valid'; end if;
  gran := case when p_to - p_from <= interval '62 days' then 'day' else 'month' end;
  step := case gran when 'day' then interval '1 day' else interval '1 month' end;
  fmt := case gran when 'day' then 'YYYY-MM-DD' else 'YYYY-MM' end;
  g0 := date_trunc(gran, p_from at time zone tz); g1 := date_trunc(gran, (p_to - interval '1 millisecond') at time zone tz);

  with pay as (
    select y.*, date_trunc(gran, y.paid_at at time zone tz) as bucket from public.payments y
     where y.status in ('paid','refunded') and y.paid_at >= p_from and y.paid_at < p_to),
  firstpaid as (select user_id, min(paid_at) as first_at from public.payments where status in ('paid','refunded') group by user_id)
  select jsonb_build_object(
    'period', jsonb_build_object('from', p_from, 'to', p_to, 'gran', gran),
    'revenue', (select jsonb_build_object(
        'gross', coalesce(sum(amount), 0),
        'refund', coalesce(sum(amount) filter (where status = 'refunded'), 0),
        'net', coalesce(sum(amount) filter (where status = 'paid'), 0),
        'orders', count(*), 'refunded_orders', count(*) filter (where status = 'refunded'),
        'avg_order', coalesce(round(avg(amount)), 0),
        'refund_rate', case when count(*) = 0 then 0 else round(100.0 * count(*) filter (where status = 'refunded') / count(*), 1) end,
        'discount_total', coalesce(sum(base_amount - amount) filter (where base_amount is not null and base_amount > amount), 0),
        'discounted_orders', count(*) filter (where discount_id is not null)) from pay),
    'by_plan', coalesce((select jsonb_agg(t order by t.revenue desc) from (
        select pl.id as plan_id, pl.name as plan, count(p.id) as orders, coalesce(sum(p.amount) filter (where p.status = 'paid'), 0) as revenue,
               count(p.id) filter (where p.status = 'refunded') as refunded, coalesce(round(avg(p.amount)), 0) as avg_order
          from public.plans pl left join pay p on p.plan_id = pl.id group by pl.id, pl.name, pl.sort order by pl.sort) t), '[]'::jsonb),
    'series', coalesce((select jsonb_agg(x order by x.m) from (
        select to_char(g, fmt) as m,
          (select count(*) from public.profiles c where c.created_at >= p_from and c.created_at < p_to and date_trunc(gran, c.created_at at time zone tz) = g) as new_customers,
          (select count(*) from pay p where p.bucket = g) as orders,
          coalesce((select sum(p.amount) from pay p where p.bucket = g and p.status = 'paid'), 0) as revenue,
          coalesce((select sum(p.amount) from pay p where p.bucket = g and p.status = 'paid' and p.plan_id = 'essential'), 0) as essential,
          coalesce((select sum(p.amount) from pay p where p.bucket = g and p.status = 'paid' and p.plan_id = 'signature'), 0) as signature,
          coalesce((select sum(p.amount) from pay p where p.bucket = g and p.status = 'paid' and p.plan_id = 'luxe'), 0) as luxe
        from generate_series(g0, g1, step) g) x), '[]'::jsonb),
    'customers', (select jsonb_build_object(
        'total', (select count(*) from public.profiles),
        'new', (select count(*) from public.profiles where created_at >= p_from and created_at < p_to),
        'buyers', (select count(distinct user_id) from pay),
        'buyers_new', (select count(distinct p.user_id) from pay p join firstpaid f on f.user_id = p.user_id where f.first_at >= p_from),
        'buyers_returning', (select count(distinct p.user_id) from pay p join firstpaid f on f.user_id = p.user_id where f.first_at < p_from),
        'repeat_orders_share', (select case when count(*) = 0 then 0 else round(100.0 * count(*) filter (where p.paid_at > f.first_at) / count(*), 1) end from pay p join firstpaid f on f.user_id = p.user_id))),
    'funnel', (with c as (select id from public.profiles where created_at >= p_from and created_at < p_to)
        select jsonb_build_array(
          jsonb_build_object('step', 'Mendaftar', 'n', (select count(*) from c)),
          jsonb_build_object('step', 'Membuat undangan', 'n', (select count(*) from c where exists (select 1 from public.invitations i where i.user_id = c.id))),
          jsonb_build_object('step', 'Masuk checkout', 'n', (select count(*) from c where exists (select 1 from public.payments y where y.user_id = c.id))),
          jsonb_build_object('step', 'Membayar', 'n', (select count(*) from c where exists (select 1 from public.payments y where y.user_id = c.id and y.status in ('paid','refunded')))),
          jsonb_build_object('step', 'Undangan terbit', 'n', (select count(*) from c where exists (select 1 from public.invitations i where i.user_id = c.id and i.published_at is not null)))
        )),
    'top_templates', coalesce((select jsonb_agg(t) from (
        select coalesce(t.name, nullif(i.template_id, ''), '(tanpa template)') as template, i.template_id as slug, count(*) as invitations,
               count(*) filter (where exists (select 1 from public.payments y where y.invitation_id = i.id and y.status in ('paid','refunded'))) as paid,
               count(*) filter (where i.published_at is not null) as published
          from public.invitations i left join public.templates t on t.slug = i.template_id
         where i.created_at >= p_from and i.created_at < p_to group by 1, 2 order by invitations desc, paid desc limit 10) t), '[]'::jsonb),
    'categories', coalesce((select jsonb_agg(t) from (
        select coalesce(nullif(category, ''), nullif(event_type, ''), '(tanpa kategori)') as category, count(*) as invitations,
               count(*) filter (where exists (select 1 from public.payments y where y.invitation_id = i.id and y.status in ('paid','refunded'))) as paid
          from public.invitations i where created_at >= p_from and created_at < p_to group by 1 order by invitations desc limit 12) t), '[]'::jsonb),
    'affiliate', case when public.has_perm('affiliate.read') then (select jsonb_build_object(
        'affiliates_active', (select count(*) from public.affiliates where status = 'aktif'),
        'referrals', (select count(*) from public.referrals where created_at >= p_from and created_at < p_to),
        'referrals_paid', (select count(*) from public.referrals where created_at >= p_from and created_at < p_to and status = 'berbayar'),
        'commission', (select coalesce(sum(commission), 0) from public.referrals where created_at >= p_from and created_at < p_to and status = 'berbayar'),
        'withdrawals', (select coalesce(sum(amount), 0) from public.withdrawals where created_at >= p_from and created_at < p_to),
        'top', coalesce((select jsonb_agg(t) from (
            select a.code, count(r.id) as referrals, count(r.id) filter (where r.status = 'berbayar') as paid, coalesce(sum(r.commission) filter (where r.status = 'berbayar'), 0) as commission
              from public.affiliates a join public.referrals r on r.affiliate_id = a.id and r.created_at >= p_from and r.created_at < p_to
             group by a.code order by paid desc, referrals desc limit 10) t), '[]'::jsonb))) else null end,
    'live', (select jsonb_build_object(
        'events', count(*), 'rooms', count(distinct invitation_id), 'guests', count(distinct guest_id),
        'by_action', coalesce((select jsonb_agg(t) from (select action, count(*) as n from public.live_guest_events where created_at >= p_from and created_at < p_to group by action order by n desc limit 10) t), '[]'::jsonb),
        'top_rooms', coalesce((select jsonb_agg(t) from (
            select coalesce(i.title, '(undangan dihapus)') as title, count(*) as events, count(distinct e.guest_id) as guests
              from public.live_guest_events e left join public.invitations i on i.id = e.invitation_id where e.created_at >= p_from and e.created_at < p_to group by 1 order by events desc limit 10) t), '[]'::jsonb))
        from public.live_guest_events where created_at >= p_from and created_at < p_to)
  ) into res;
  return res;
end $$;

revoke execute on function public.admin_report(timestamptz, timestamptz) from public, anon;
grant execute on function public.admin_report(timestamptz, timestamptz) to authenticated;
