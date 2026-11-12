-- NusaMora: Live Guest, dekor tema (gambar PNG/WebP transparan per slot menggantikan dekor bawaan). Aditif dan idempoten. Jalankan SETELAH admin-live-theme.sql.
-- decor = {slot: {"url": "https://... atau /...", "w": lebar-opsional}}. Posisi tiap slot ditentukan template; admin hanya memilih gambar per slot.
-- Slot kosong = dekor bawaan tetap dipakai. Gambar harus dapat diambil lintas-origin (header CORS) atau berasal dari situs yang sama.

alter table public.live_venues add column if not exists decor jsonb;

create or replace function public.live_decor_ok(d jsonb) returns boolean language plpgsql immutable as $$
declare k text; v jsonb;
begin
  if d is null then return true; end if;
  if jsonb_typeof(d) <> 'object' or pg_column_size(d) > 8000 then return false; end if;
  for k, v in select * from jsonb_each(d) loop
    if k not in ('arch', 'sign', 'easel', 'balloons', 'gifts', 'fountain', 'stall_drinks', 'stall_snacks', 'stall_candy', 'claw', 'photobooth', 'speakers', 'bush', 'planter', 'lamp', 'banner', 'rope', 'table') then return false; end if;
    if jsonb_typeof(v) <> 'object' or (v - 'url' - 'w') <> '{}'::jsonb then return false; end if;
    if jsonb_typeof(v -> 'url') <> 'string' or char_length(v ->> 'url') > 500 or (v ->> 'url') !~ '^(https://|/)[^[:space:]"''<>]+$' or (v ->> 'url') ~ '^//' then return false; end if;
    if v ? 'w' and (jsonb_typeof(v -> 'w') <> 'number' or (v ->> 'w')::numeric not between 0.3 and 20) then return false; end if;
  end loop;
  return true;
end $$;
revoke all on function public.live_decor_ok(jsonb) from public;
grant execute on function public.live_decor_ok(jsonb) to authenticated;
alter table public.live_venues drop constraint if exists live_venues_decor_chk;
alter table public.live_venues add constraint live_venues_decor_chk check (public.live_decor_ok(decor));

-- Simpan venue: sama seperti admin-live-theme.sql + decor (opsional; bila kunci tidak dikirim, nilai lama dipertahankan).
create or replace function public.admin_live_venue_save(p jsonb) returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid := nullif(p ->> 'id', '')::uuid; th jsonb := nullif(p -> 'nm_theme', 'null'::jsonb); dc jsonb := nullif(p -> 'decor', 'null'::jsonb);
begin
  if not public.has_perm('live.write') then raise exception 'forbidden' using errcode = '42501'; end if;
  if not public.live_areas_ok(p -> 'areas') then raise exception 'area_tidak_valid'; end if;
  if char_length(coalesce(p ->> 'name', '')) not between 2 and 60 then raise exception 'nama_tidak_valid'; end if;
  if coalesce(p ->> 'key', '') !~ '^[a-z0-9][a-z0-9-]{1,38}$' then raise exception 'kunci_tidak_valid'; end if;
  if coalesce((p ->> 'max_guests')::int, 300) not between 1 and 5000 then raise exception 'kapasitas_tidak_valid'; end if;
  if p ->> 'background_url' is not null and p ->> 'background_url' !~ '^(https://|/)' then raise exception 'url_tidak_valid'; end if;
  if nullif(p ->> 'event_type', '') is not null and (p ->> 'event_type') not in ('wedding', 'engagement', 'birthday', 'sweet17', 'corporate') then raise exception 'jenis_acara_tidak_valid'; end if;
  if nullif(p ->> 'bg_pos', '') is not null and (p ->> 'bg_pos') !~ '^[a-z0-9 %.-]{3,30}$' then raise exception 'posisi_tidak_valid'; end if;
  if not public.live_theme_ok(th) then raise exception 'tema_tidak_valid'; end if;
  if not public.live_decor_ok(dc) then raise exception 'dekor_tidak_valid'; end if;
  if v_id is null then
    insert into public.live_venues (key, name, template, background_url, areas, max_guests, active, sort, event_type, nm_theme, bg_pos, decor)
    values (p ->> 'key', p ->> 'name', nullif(p ->> 'template', ''), nullif(p ->> 'background_url', ''), p -> 'areas', coalesce((p ->> 'max_guests')::int, 300), coalesce((p ->> 'active')::boolean, true), coalesce((p ->> 'sort')::int, 0),
      nullif(p ->> 'event_type', ''), th, nullif(p ->> 'bg_pos', ''), dc) returning id into v_id;
  else
    update public.live_venues set key = p ->> 'key', name = p ->> 'name', template = nullif(p ->> 'template', ''), background_url = nullif(p ->> 'background_url', ''), areas = p -> 'areas',
      max_guests = coalesce((p ->> 'max_guests')::int, 300), active = coalesce((p ->> 'active')::boolean, true), sort = coalesce((p ->> 'sort')::int, 0),
      event_type = case when p ? 'event_type' then nullif(p ->> 'event_type', '') else event_type end,
      nm_theme = case when p ? 'nm_theme' then th else nm_theme end,
      bg_pos = case when p ? 'bg_pos' then nullif(p ->> 'bg_pos', '') else bg_pos end,
      decor = case when p ? 'decor' then dc else decor end, updated_at = now() where id = v_id;
    if not found then raise exception 'venue_tidak_ditemukan'; end if;
  end if;
  return v_id;
exception when unique_violation then raise exception 'kunci_sudah_dipakai';
end $$;

-- Tema untuk tamu: sekarang menyertakan decor.
create or replace function public.live_theme(p_token text) returns jsonb language plpgsql stable security definer set search_path = public as $$
declare c record; rm public.live_rooms; v public.live_venues; ttl text; ev text;
begin
  select * into c from public._guest_ctx(p_token); if c.g is null then return null; end if;
  select * into rm from public.live_rooms where invitation_id = c.inv;
  select * into v from public.live_venues where id = coalesce(rm.venue_id, (select id from public.live_venues where key = (public.live_setting('default_theme') #>> '{}') and active), (select id from public.live_venues where active order by sort limit 1));
  if v.id is null or v.nm_theme is null then return null; end if;
  select left(title, 60), event_type into ttl, ev from public.invitations where id = c.inv;
  if v.event_type is not null then ev := v.event_type; end if;
  if ev is null or ev not in ('wedding', 'engagement', 'birthday', 'sweet17', 'corporate') then ev := null; end if;
  return jsonb_build_object('id', 'v-' || v.key, 'name', v.name, 'event', ev, 'host', ttl, 'painting', v.background_url, 'pos', v.bg_pos, 'theme', v.nm_theme, 'decor', v.decor);
end $$;

revoke all on function public.live_theme(text) from public; grant execute on function public.live_theme(text) to anon, authenticated;
