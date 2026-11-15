-- Sandbox vs live separation for revenue reports (applied 2026-11-14)
-- Invoices created before app_settings.payment_live_since (or while it is unset) are flagged is_sandbox.
-- GO-LIVE: after switching Midtrans to production (MIDTRANS_IS_PRODUCTION + production keys), run:
--   insert into public.app_settings(key,value) values ('payment_live_since', to_jsonb(now()::text))
--   on conflict (key) do update set value = excluded.value;
-- Otherwise real revenue stays hidden from reports.

alter table public.invoices add column if not exists is_sandbox boolean not null default false;
update public.invoices set is_sandbox = true where is_sandbox = false;

create or replace function public.invoices_mark_sandbox() returns trigger language plpgsql set search_path = public as $$
declare v text;
begin
  select trim(both '"' from s.value::text) into v from public.app_settings s where s.key = 'payment_live_since';
  new.is_sandbox := (v is null or v in ('', 'null') or new.created_at < v::timestamptz);
  return new;
end $$;
drop trigger if exists invoices_mark_sandbox on public.invoices;
create trigger invoices_mark_sandbox before insert on public.invoices for each row execute function public.invoices_mark_sandbox();

create or replace view public.invoices_real with (security_invoker = true) as select * from public.invoices where not is_sandbox;
create or replace view public.payments_real with (security_invoker = true) as
  select p.* from public.payments p where not exists (select 1 from public.invoices i where i.id = p.invoice_id and i.is_sandbox);
revoke all on public.invoices_real, public.payments_real from anon, authenticated;

do $$ declare f text; d text; begin
  foreach f in array array['admin_dashboard','admin_reports','admin_report','admin_stats','admin_transactions_overview','admin_plans_overview'] loop
    for d in select pg_get_functiondef(p.oid) from pg_proc p where p.proname = f and p.pronamespace = 'public'::regnamespace loop
      d := regexp_replace(d, 'public\.invoices\M', 'public.invoices_real', 'g');
      d := regexp_replace(d, 'public\.payments\M', 'public.payments_real', 'g');
      execute d;
    end loop;
  end loop; end $$;
