-- Avatar tamu bertema: slot tambahan di kolom decor (av_l1..av_l5 laki-laki, av_p1..av_p5 perempuan, av_host = tokoh yang berulang tahun di panggung; di acara pasangan = foto berdua mempelai), masing-masing {url, name?}.
-- Dekor juga boleh membawa posisi {x, z, mirror?} agar tiap tema bisa menata sendiri. Aditif: hanya memperluas validator live_decor_ok; kolom, constraint, admin_live_venue_save, dan live_theme tidak berubah.
-- Jalankan SETELAH admin-live-decor.sql.
create or replace function public.live_decor_ok(d jsonb) returns boolean language plpgsql immutable as $$
declare k text; v jsonb;
begin
  if d is null then return true; end if;
  if jsonb_typeof(d) <> 'object' or pg_column_size(d) > 8000 then return false; end if;
  for k, v in select * from jsonb_each(d) loop
    if k not in ('arch', 'sign', 'easel', 'balloons', 'gifts', 'fountain', 'stall_drinks', 'stall_snacks', 'stall_candy', 'claw', 'photobooth', 'speakers', 'bush', 'planter', 'lamp', 'banner', 'rope', 'table')
       and k !~ '^av_([lp][1-5]|host)$' then return false; end if;
    if jsonb_typeof(v) <> 'object' or (v - 'url' - 'w' - 'name' - 'x' - 'z' - 'mirror') <> '{}'::jsonb then return false; end if;
    if jsonb_typeof(v -> 'url') <> 'string' or char_length(v ->> 'url') > 500 or (v ->> 'url') !~ '^(https://|/)[^[:space:]"''<>]+$' or (v ->> 'url') ~ '^//' then return false; end if;
    if v ? 'w' and (k ~ '^av_' or jsonb_typeof(v -> 'w') <> 'number' or (v ->> 'w')::numeric not between 0.3 and 20) then return false; end if;
    -- posisi opsional untuk dekor (bukan avatar): x & z harus berpasangan; mirror = salinan cermin di -x
    if v ? 'x' or v ? 'z' or v ? 'mirror' then
      if k ~ '^av_' then return false; end if;
      if v ? 'mirror' and jsonb_typeof(v -> 'mirror') <> 'boolean' then return false; end if;
      if v ? 'mirror' and not (v ? 'x' and v ? 'z') then return false; end if;
      if (v ? 'x') <> (v ? 'z') then return false; end if;
      if v ? 'x' and (jsonb_typeof(v -> 'x') <> 'number' or jsonb_typeof(v -> 'z') <> 'number' or (v ->> 'x')::numeric not between -19 and 19 or (v ->> 'z')::numeric not between -27.5 and 12) then return false; end if;
    end if;
    if v ? 'name' and (k !~ '^av_' or jsonb_typeof(v -> 'name') <> 'string' or (v ->> 'name') !~ '^[[:alnum:]][[:alnum:] .''-]{0,23}$') then return false; end if;
  end loop;
  return true;
end $$;

revoke all on function public.live_decor_ok(jsonb) from public;
grant execute on function public.live_decor_ok(jsonb) to authenticated;
