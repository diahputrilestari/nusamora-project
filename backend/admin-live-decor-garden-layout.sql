-- Samakan penempatan dekor SEMUA venue dengan template Romantic Garden Live Guest.
-- Posisi, titik, dan jumlah dekor Romantic Garden = posisi bawaan tiap slot (live/live-bridge.js DECOR), jadi override
-- {w,x,z,mirror} per venue dihapus agar slot memakai titik bawaan itu. Satu pengecualian: papan Buku Tamu (slot easel)
-- ditaruh di titik papan "Welcome" Romantic Garden (depan kanan). Avatar (av_*) tidak disentuh.
-- Aman diulang (idempoten). Cadangan decor lama disimpan di live_venues_decor_backup untuk rollback.
-- Jalankan paling akhir, setelah semua admin-live-theme-*.sql.
create table if not exists public.live_venues_decor_backup (
  key text primary key,
  decor jsonb not null,
  saved_at timestamptz not null default now()
);
alter table public.live_venues_decor_backup enable row level security;

insert into public.live_venues_decor_backup (key, decor)
select v.key, v.decor from public.live_venues v
where v.decor is not null and v.decor <> '{}'::jsonb
on conflict (key) do nothing;

update public.live_venues v
set decor = (
  select coalesce(jsonb_object_agg(
    e.key,
    case
      when e.key = 'easel' and jsonb_typeof(e.value) = 'object' then (e.value - 'w' - 'x' - 'z' - 'mirror') || '{"w":3.0,"x":5.8,"z":9}'::jsonb
      when e.key like 'av\_%' or jsonb_typeof(e.value) <> 'object' then e.value
      else e.value - 'w' - 'x' - 'z' - 'mirror'
    end), '{}'::jsonb)
  from jsonb_each(v.decor) e
), updated_at = now()
where v.decor is not null and jsonb_typeof(v.decor) = 'object' and v.decor <> '{}'::jsonb;

-- Hardiknas & Kemerdekaan 17 Agustus: ukuran dekor disetel per sprite (posisi tetap bawaan Romantic Garden).
update public.live_venues v set decor = v.decor
  || jsonb_build_object('easel', (v.decor -> 'easel') || '{"w":2.8,"x":4.6,"z":8.2}'::jsonb)
  || jsonb_build_object('sign', (v.decor -> 'sign') || '{"w":2.0}'::jsonb)
  || jsonb_build_object('photobooth', (v.decor -> 'photobooth') || '{"w":5.6}'::jsonb)
  || jsonb_build_object('claw', (v.decor -> 'claw') || '{"w":4.4}'::jsonb)
  || jsonb_build_object('stall_drinks', (v.decor -> 'stall_drinks') || '{"w":4.8}'::jsonb)
  || jsonb_build_object('fountain', (v.decor -> 'fountain') || '{"w":5.8}'::jsonb),
  updated_at = now()
where v.key in ('hardiknas', 'kemerdekaan-17-agustus') and v.decor ? 'easel' and v.decor ? 'sign' and v.decor ? 'photobooth' and v.decor ? 'claw' and v.decor ? 'stall_drinks' and v.decor ? 'fountain';

-- Rollback (bila perlu):
-- update public.live_venues v set decor = b.decor, updated_at = now() from public.live_venues_decor_backup b where b.key = v.key;
