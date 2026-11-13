-- NusaMora: Live Guest, tema venue dari database (palet, jenis acara, lukisan venue). Aditif dan idempoten. Jalankan SETELAH admin-live.sql.
-- Satu template Live Guest universal; tema = data venue. Tema didaftarkan ke mesin tema halaman (NM) oleh live/live-bridge.js lewat live_theme().
-- Gambar lukisan venue (1672x941) memakai kolom background_url yang sudah ada.

alter table public.live_venues add column if not exists event_type text, add column if not exists nm_theme jsonb, add column if not exists bg_pos text;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'live_venues_event_type_chk') then
    alter table public.live_venues add constraint live_venues_event_type_chk check (event_type is null or event_type in ('wedding', 'engagement', 'birthday', 'sweet17', 'corporate')); end if;
  if not exists (select 1 from pg_constraint where conname = 'live_venues_bg_pos_chk') then
    alter table public.live_venues add constraint live_venues_bg_pos_chk check (bg_pos is null or bg_pos ~ '^[a-z0-9 %.-]{3,30}$'); end if;
end $$;

-- Validasi konfigurasi tema (cermin sanitasi di mesin tema halaman): objek kecil, hanya kunci yang dikenal, nilai teks aman (tanpa url()/expression/@import).
create or replace function public.live_theme_ok(t jsonb) returns boolean language plpgsql immutable as $$
declare k text; v jsonb; kk text; vv jsonb; col text;
begin
  if t is null then return true; end if;
  if jsonb_typeof(t) <> 'object' or pg_column_size(t) > 4096 then return false; end if;
  for k, v in select * from jsonb_each(t) loop
    if k not in ('name', 'orn', 'dark', 'ui', 'mono', 'hud', 'scr') then return false; end if;
    if k = 'name' and (jsonb_typeof(v) <> 'string' or char_length(v #>> '{}') not between 2 and 40) then return false; end if;
    if k = 'orn' and (v #>> '{}') not in ('sprig', 'blossom', 'diamond', 'mandala', 'leaf', 'line', 'confetti', 'sparkle', 'rings') then return false; end if;
    if k = 'dark' and jsonb_typeof(v) <> 'boolean' then return false; end if;
    if k in ('ui', 'mono', 'hud', 'scr') then
      if jsonb_typeof(v) <> 'object' then return false; end if;
      for kk, vv in select * from jsonb_each(v) loop
        if jsonb_typeof(vv) = 'number' then continue; end if;
        if jsonb_typeof(vv) <> 'string' then return false; end if;
        if char_length(vv #>> '{}') >= 160 or (vv #>> '{}') !~ '^[#A-Za-z0-9_[:space:]().,%"''+-]*$' or (vv #>> '{}') ~* '(url|expression|import)' then return false; end if;
      end loop;
    end if;
  end loop;
  for col in select unnest(array['ivory', 'white', 'soft', 'soft2', 'accent', 'deep', 'ink', 'mute', 'line']) loop
    if t -> 'ui' ->> col is not null and (t -> 'ui' ->> col) !~ '^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$' then return false; end if;
  end loop;
  return true;
end $$;

alter table public.live_venues drop constraint if exists live_venues_nm_theme_chk;
alter table public.live_venues add constraint live_venues_nm_theme_chk check (public.live_theme_ok(nm_theme));

-- Simpan venue: sama seperti sebelumnya + event_type, nm_theme, bg_pos (opsional; bila kunci tidak dikirim, nilai lama dipertahankan).
create or replace function public.admin_live_venue_save(p jsonb) returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid := nullif(p ->> 'id', '')::uuid; th jsonb := nullif(p -> 'nm_theme', 'null'::jsonb);
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
  if v_id is null then
    insert into public.live_venues (key, name, template, background_url, areas, max_guests, active, sort, event_type, nm_theme, bg_pos)
    values (p ->> 'key', p ->> 'name', nullif(p ->> 'template', ''), nullif(p ->> 'background_url', ''), p -> 'areas', coalesce((p ->> 'max_guests')::int, 300), coalesce((p ->> 'active')::boolean, true), coalesce((p ->> 'sort')::int, 0),
      nullif(p ->> 'event_type', ''), th, nullif(p ->> 'bg_pos', '')) returning id into v_id;
  else
    update public.live_venues set key = p ->> 'key', name = p ->> 'name', template = nullif(p ->> 'template', ''), background_url = nullif(p ->> 'background_url', ''), areas = p -> 'areas',
      max_guests = coalesce((p ->> 'max_guests')::int, 300), active = coalesce((p ->> 'active')::boolean, true), sort = coalesce((p ->> 'sort')::int, 0),
      event_type = case when p ? 'event_type' then nullif(p ->> 'event_type', '') else event_type end,
      nm_theme = case when p ? 'nm_theme' then th else nm_theme end,
      bg_pos = case when p ? 'bg_pos' then nullif(p ->> 'bg_pos', '') else bg_pos end, updated_at = now() where id = v_id;
    if not found then raise exception 'venue_tidak_ditemukan'; end if;
  end if;
  return v_id;
exception when unique_violation then raise exception 'kunci_sudah_dipakai';
end $$;

-- Tema untuk tamu: venue ruangan (atau default) + judul undangan. Null bila token salah atau venue tidak punya tema.
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
  return jsonb_build_object('id', 'v-' || v.key, 'name', v.name, 'event', ev, 'host', ttl, 'painting', v.background_url, 'pos', v.bg_pos, 'theme', v.nm_theme);
end $$;
revoke all on function public.live_theme(text) from public;
grant execute on function public.live_theme(text) to anon, authenticated;
revoke all on function public.live_theme_ok(jsonb) from public;
grant execute on function public.live_theme_ok(jsonb) to authenticated;

-- Contoh tema: "Midnight Party" (ungu, pink, gelap), jenis acara ulang tahun. NONAKTIF sampai admin mengunggah lukisan venue dan mengaktifkannya.
insert into public.live_venues (key, name, event_type, areas, max_guests, active, sort, bg_pos, nm_theme)
select 'midnight-party', 'Midnight Party (ungu)', 'birthday', coalesce((select areas from public.live_venues where key = 'romantic-garden'), '[]'::jsonb), 300, false, 50, 'center 38%',
  $t${"name":"Midnight Party","orn":"sparkle",
  "ui":{"ivory":"#F7F1FF","white":"#FFFFFF","soft":"#EDE2FF","soft2":"#D9C6F5","accent":"#6D3FC0","deep":"#3A2160","ink":"#2A1B3D","mute":"#7F6A9E","line":"#E1D4F5","serif":"Fredoka,\"Cormorant Garamond\",sans-serif","sans":"Inter,system-ui,sans-serif","rad":24,"btnr":999,"btnt":"none","btnls":".02em"},
  "mono":{"font":"Fredoka,\"Cormorant Garamond\",sans-serif","it":0,"paper":"#FBF6FF","ink":"#3A2160","accent":"#F28AC4","gold":"#F5C451","leaf":"#B9A0E8","hbg":"rgba(251,246,255,.94)","hline":"#D9C6F5","motif":"sparkle"},
  "hud":{"bg":"rgba(42,27,61,.6)","acc":"#F7A8D4","on":"#2A1B3D"},"scr":{"wine":"#6D3FC0","veil":"251,246,255"}}$t$::jsonb
where not exists (select 1 from public.live_venues where key = 'midnight-party');
