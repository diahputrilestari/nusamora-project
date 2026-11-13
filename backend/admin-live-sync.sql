-- NusaMora: Live Guest, sinkron posisi tamu (agar tamu saling melihat di scene). Aditif dan idempoten. Jalankan SETELAH admin-live.sql.
-- live_sync menggantikan live_heartbeat sebagai denyut + kirim posisi, dan mengembalikan tamu lain yang aktif (maks. 60, 20 detik terakhir).
-- Yang dikirim ke tamu lain hanya: id acak pendek, nama tampilan, posisi x/z, dan pilihan avatar. Tidak ada token, nomor telepon, atau id tamu asli.

alter table public.live_presence add column if not exists x real, add column if not exists z real, add column if not exists av jsonb, add column if not exists moved_at timestamptz;

create or replace function public.live_sync(p_token text, p_x double precision default null, p_z double precision default null, p_av jsonb default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare c record; m public.live_mutes; nav jsonb := null; nx real; nz real; n int;
begin
  select * into c from public._guest_ctx(p_token); if c.g is null then return null; end if;
  perform public._rl('guest-live-sync-' || p_token, 2400, 3600);
  select * into m from public.live_mutes where invitation_id = c.inv and guest_id = c.g and kind = 'ban' and until > now();
  if found or exists (select 1 from public.live_rooms where invitation_id = c.inv and status = 'closed') or not public.live_enabled() then
    delete from public.live_presence where invitation_id = c.inv and guest_id = c.g; return jsonb_build_object('online', -1, 'peers', '[]'::jsonb); end if;
  if p_av is not null and jsonb_typeof(p_av) = 'object' and (p_av ->> 'g') in ('L', 'P') and (p_av ->> 'i') ~ '^[0-9]$' then nav := jsonb_build_object('g', p_av ->> 'g', 'i', (p_av ->> 'i')::int); end if;
  nx := case when p_x is not null and p_x between -40 and 40 then p_x::real end;
  nz := case when p_z is not null and p_z between -40 and 40 then p_z::real end;
  update public.live_presence set last_seen = now(), x = coalesce(nx, live_presence.x), z = coalesce(nz, live_presence.z), av = coalesce(nav, live_presence.av), moved_at = case when nx is not null or nz is not null then now() else live_presence.moved_at end
   where invitation_id = c.inv and guest_id = c.g;
  get diagnostics n = row_count; if n = 0 then return jsonb_build_object('online', -1, 'peers', '[]'::jsonb); end if;
  return jsonb_build_object('online', public.live_online(c.inv), 'peers', coalesce((select jsonb_agg(to_jsonb(t)) from (
    select left(md5(p.guest_id::text || p.invitation_id::text), 10) as id, p.guest_name as name, p.x, p.z, p.av from public.live_presence p
     where p.invitation_id = c.inv and p.guest_id <> c.g and p.last_seen > now() - interval '20 seconds' and p.x is not null and p.z is not null
     order by p.last_seen desc limit 60) t), '[]'::jsonb));
end $$;
revoke all on function public.live_sync(text, double precision, double precision, jsonb) from public;
grant execute on function public.live_sync(text, double precision, double precision, jsonb) to anon, authenticated;
