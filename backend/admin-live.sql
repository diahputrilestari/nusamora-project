-- NusaMora: Live Guest (menu E). Aditif dan idempoten. Jalankan SETELAH admin-schema, guest-schema, admin-roles, admin-reports.
--
-- Isi: venue builder (area & koordinat), interaksi (sapa/reaksi), mini game, ruangan per undangan (buka/tutup, kapasitas, mode chat),
-- presence nyata (heartbeat), chat dengan moderasi (kata terlarang, mode moderasi, slow mode, bisukan/blokir), skor game, analitik.
-- Avatar, background, aset 3D tetap di tabel live_assets (tab admin yang sudah ada).
-- Tamu mengakses lewat RPC ber-token (live_*). Aplikasi Live Guest di live/index.html BELUM memanggilnya (PR berikutnya); fungsi live_log lama tidak diubah.
-- Menulis ke tabel hanya lewat fungsi; tabel dilindungi RLS (baca khusus admin berizin live.read).

----------------------------------------------------------------------------- 1. Tabel
create table if not exists public.live_venues (
  id uuid primary key default gen_random_uuid(),
  key text not null unique check (key ~ '^[a-z0-9][a-z0-9-]{1,38}$'),
  name text not null check (char_length(name) between 2 and 60),
  template text check (template is null or template ~ '^[a-z0-9-]{2,40}$'),
  background_url text check (background_url is null or char_length(background_url) <= 500),
  areas jsonb not null default '[]'::jsonb,
  max_guests int not null default 300 check (max_guests between 1 and 5000),
  active boolean not null default true, sort int not null default 0,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now());

create table if not exists public.live_interactions (
  key text primary key check (key ~ '^[a-z0-9_]{2,24}$'),
  label text not null check (char_length(label) between 2 and 40),
  emoji text not null check (char_length(emoji) between 1 and 8),
  kind text not null check (kind in ('sapa', 'reaksi')),
  enabled boolean not null default true,
  cooldown_seconds int not null default 3 check (cooldown_seconds between 0 and 60),
  sort int not null default 0);

create table if not exists public.live_games (
  id uuid primary key default gen_random_uuid(),
  key text not null unique check (key ~ '^[a-z0-9][a-z0-9-]{1,38}$'),
  name text not null check (char_length(name) between 2 and 60),
  kind text not null check (kind in ('trivia', 'tap', 'memory')),
  enabled boolean not null default false,
  points_max int not null default 100 check (points_max between 1 and 10000),
  config jsonb not null default '{}'::jsonb, sort int not null default 0,
  created_at timestamptz not null default now());

create table if not exists public.live_rooms (
  invitation_id uuid primary key references public.invitations(id) on delete cascade,
  venue_id uuid references public.live_venues(id) on delete set null,
  status text not null default 'open' check (status in ('open', 'closed')),
  max_guests int check (max_guests is null or max_guests between 1 and 5000),
  chat_mode text not null default 'open' check (chat_mode in ('open', 'moderated', 'off')),
  slow_seconds int not null default 3 check (slow_seconds between 0 and 120),
  updated_by uuid, updated_at timestamptz not null default now());

create table if not exists public.live_presence (
  invitation_id uuid not null references public.invitations(id) on delete cascade,
  guest_id uuid not null references public.invitation_guests(id) on delete cascade,
  guest_name text not null, last_seen timestamptz not null default now(),
  primary key (invitation_id, guest_id));
create index if not exists live_presence_seen_idx on public.live_presence (last_seen);

create table if not exists public.live_chat (
  id uuid primary key default gen_random_uuid(),
  invitation_id uuid not null references public.invitations(id) on delete cascade,
  guest_id uuid references public.invitation_guests(id) on delete set null,
  guest_name text not null,
  body text not null check (char_length(body) between 1 and 300),
  status text not null default 'visible' check (status in ('visible', 'pending', 'hidden', 'removed')),
  auto_flag text, note text, moderated_by uuid, moderated_at timestamptz,
  created_at timestamptz not null default now());
create index if not exists live_chat_inv_idx on public.live_chat (invitation_id, created_at desc);
create index if not exists live_chat_status_idx on public.live_chat (status, created_at desc);

create table if not exists public.live_mutes (
  invitation_id uuid not null references public.invitations(id) on delete cascade,
  guest_id uuid not null references public.invitation_guests(id) on delete cascade,
  kind text not null check (kind in ('mute', 'ban')),
  until timestamptz not null, reason text, created_by uuid, created_at timestamptz not null default now(),
  primary key (invitation_id, guest_id));

-- Pengaturan fitur Live Guest. Tab lama memakai app_settings, tetapi pagar app_settings (admin-settings.sql) menolak kunci live_*, jadi disimpan di sini.
create table if not exists public.live_settings (key text primary key, value jsonb not null, updated_at timestamptz not null default now());

create table if not exists public.live_words (
  word text primary key check (word = lower(word) and char_length(word) between 2 and 40),
  created_at timestamptz not null default now());

create table if not exists public.live_game_scores (
  game_id uuid not null references public.live_games(id) on delete cascade,
  guest_id uuid not null references public.invitation_guests(id) on delete cascade,
  invitation_id uuid not null references public.invitations(id) on delete cascade,
  guest_name text not null, score int not null check (score >= 0), plays int not null default 1,
  updated_at timestamptz not null default now(),
  primary key (game_id, guest_id));
create index if not exists live_scores_inv_idx on public.live_game_scores (invitation_id, game_id, score desc);

do $$ declare r record; t text; begin
  for r in select * from (values ('live_venues'), ('live_interactions'), ('live_games'), ('live_rooms'), ('live_presence'), ('live_chat'), ('live_mutes'), ('live_words'), ('live_game_scores'), ('live_settings')) as x(t) loop
    execute format('alter table public.%I enable row level security', r.t);
    execute format('drop policy if exists "admin baca" on public.%I', r.t);
    execute format('create policy "admin baca" on public.%I for select to authenticated using (public.has_perm(%L))', r.t, 'live.read');
    execute format('revoke all on public.%I from anon, authenticated', r.t);
    execute format('grant select on public.%I to authenticated', r.t);
  end loop;
  foreach t in array array['live_venues', 'live_interactions', 'live_games', 'live_rooms', 'live_words', 'live_mutes', 'live_settings'] loop
    execute format('drop trigger if exists audit_%1$s on public.%1$I', t);
    execute format('create trigger audit_%1$s after insert or update or delete on public.%1$I for each row execute function public.audit_row()', t);
  end loop;
end $$;

----------------------------------------------------------------------------- 2. Data bawaan (sama dengan isi live/index.html saat ini)
insert into public.live_venues (key, name, template, areas, sort) values
 ('romantic-garden', 'Romantic Garden', 'romantic-garden', '[
   {"id":"stage","name":"Main Stage","x":0,"z":-7,"icon":"🏠","enabled":true},{"id":"resepsi","name":"Area Ucapan","x":-8,"z":2,"icon":"💬","enabled":true},
   {"id":"galeri","name":"Galeri Foto","x":-12,"z":-5,"icon":"📷","enabled":true},{"id":"booth","name":"Area Ruang Tamu","x":10,"z":5,"icon":"🛋️","enabled":true},
   {"id":"kuliner","name":"Area Ruang Makan","x":13,"z":10,"icon":"🍽️","enabled":true},{"id":"taman","name":"Area Taman","x":-13,"z":9,"icon":"🌳","enabled":true},
   {"id":"buku","name":"Buku Ucapan","x":0,"z":8,"icon":"📖","enabled":true},{"id":"hadiah","name":"Area Hadiah","x":-5,"z":-5.5,"icon":"🎁","enabled":true},
   {"id":"istirahat","name":"Area Relax","x":5,"z":10,"icon":"❤️","enabled":true},{"id":"video","name":"Video Ucapan","x":12,"z":-5,"icon":"🎬","enabled":true}]'::jsonb, 1),
 ('jawa-tengah', 'Adat Jawa Tengah', 'jawa-tengah', '[
   {"id":"stage","name":"Pendopo Utama","x":0,"z":-7,"icon":"🏛️","enabled":true},{"id":"resepsi","name":"Area Resepsi","x":-8,"z":2,"icon":"🍽️","enabled":true},
   {"id":"booth","name":"Area Booth","x":10,"z":5,"icon":"📸","enabled":true},{"id":"galeri","name":"Galeri Foto","x":-12,"z":-5,"icon":"🖼️","enabled":true},
   {"id":"video","name":"Video Ucapan","x":12,"z":-5,"icon":"🎬","enabled":true},{"id":"buku","name":"Buku Tamu","x":0,"z":8,"icon":"📖","enabled":true},
   {"id":"kuliner","name":"Area Kuliner","x":13,"z":10,"icon":"🍢","enabled":true},{"id":"istirahat","name":"Area Istirahat","x":-13,"z":9,"icon":"🛋️","enabled":true}]'::jsonb, 2)
on conflict (key) do nothing;
insert into public.live_interactions (key, label, emoji, kind, cooldown_seconds, sort) values
 ('sapa', 'Sapa', '👋', 'sapa', 5, 1), ('cinta', 'Cinta', '❤️', 'reaksi', 2, 2), ('tepuk', 'Tepuk tangan', '👏', 'reaksi', 2, 3),
 ('pesta', 'Pesta', '🎉', 'reaksi', 2, 4), ('kagum', 'Kagum', '😍', 'reaksi', 2, 5), ('tawa', 'Tertawa', '😂', 'reaksi', 2, 6)
on conflict (key) do nothing;

-- salin nilai lama (bila ada) dari app_settings
insert into public.live_settings (key, value) select substr(key, 6), value from public.app_settings
 where key in ('live_enabled', 'live_music', 'live_qris', 'live_gallery', 'live_guestbook', 'live_default_theme', 'live_max_guests') on conflict do nothing;

----------------------------------------------------------------------------- 3. Pembantu
create or replace function public.live_online(p_inv uuid) returns int language sql stable security definer set search_path = public as $$
  select count(*)::int from public.live_presence where invitation_id = p_inv and last_seen > now() - interval '90 seconds' $$;

create or replace function public.live_areas_ok(a jsonb) returns boolean language plpgsql immutable as $$
declare e jsonb; ids text[] := '{}'; i text;
begin
  if jsonb_typeof(a) <> 'array' or jsonb_array_length(a) > 40 then return false; end if;
  for e in select * from jsonb_array_elements(a) loop
    if jsonb_typeof(e) <> 'object' then return false; end if;
    i := e ->> 'id';
    if i is null or i !~ '^[a-z0-9_-]{2,24}$' or i = any (ids) then return false; end if;
    ids := array_append(ids, i);
    if char_length(coalesce(e ->> 'name', '')) not between 2 and 40 then return false; end if;
    if jsonb_typeof(e -> 'x') <> 'number' or jsonb_typeof(e -> 'z') <> 'number' then return false; end if;
    if (e ->> 'x')::numeric not between -40 and 40 or (e ->> 'z')::numeric not between -40 and 40 then return false; end if;
    if char_length(coalesce(e ->> 'icon', '')) > 8 then return false; end if;
    if e ? 'enabled' and jsonb_typeof(e -> 'enabled') <> 'boolean' then return false; end if;
  end loop;
  return true;
end $$;

create or replace function public.live_defaults() returns jsonb language sql immutable as $$
  select '{"enabled":true,"music":true,"qris":true,"gallery":true,"guestbook":true,"default_theme":"romantic-garden","max_guests":300}'::jsonb $$;
create or replace function public.live_setting(k text) returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce((select value from public.live_settings where key = k), public.live_defaults() -> k) $$;
create or replace function public.live_enabled() returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((public.live_setting('enabled') #>> '{}')::boolean, true) $$;

create or replace function public.admin_live_settings_get() returns jsonb language plpgsql stable security definer set search_path = public as $$
declare k text; o jsonb := '{}'::jsonb;
begin
  if not public.has_perm('live.read') then raise exception 'forbidden' using errcode = '42501'; end if;
  for k in select jsonb_object_keys(public.live_defaults()) loop o := o || jsonb_build_object(k, public.live_setting(k)); end loop;
  return o;
end $$;

create or replace function public.admin_live_settings_save(p_vals jsonb) returns void language plpgsql security definer set search_path = public as $$
declare k text; v jsonb; cur jsonb;
begin
  if not public.has_perm('live.write') then raise exception 'forbidden' using errcode = '42501'; end if;
  if jsonb_typeof(p_vals) <> 'object' then raise exception 'format_tidak_valid'; end if;
  for k, v in select * from jsonb_each(p_vals) loop
    if not public.live_defaults() ? k then raise exception 'kunci_tidak_dikenal'; end if;
    if jsonb_typeof(v) <> jsonb_typeof(public.live_defaults() -> k) then raise exception '%_tidak_valid', k; end if;
    if k = 'max_guests' and ((v #>> '{}')::numeric not between 1 and 5000 or (v #>> '{}')::numeric <> floor((v #>> '{}')::numeric)) then raise exception 'max_guests_tidak_valid'; end if;
    if k = 'default_theme' and not exists (select 1 from public.live_venues where key = v #>> '{}') then raise exception 'default_theme_tidak_valid'; end if;
  end loop;
  for k, v in select * from jsonb_each(p_vals) loop
    cur := public.live_setting(k);
    insert into public.live_settings (key, value) values (k, v) on conflict (key) do update set value = excluded.value, updated_at = now();
    if cur is distinct from v then insert into public.audit_logs (actor_id, action, table_name, row_id, summary) values (auth.uid(), 'update', 'live_settings', k, jsonb_build_object(k, jsonb_build_array(cur, v))); end if;
  end loop;
end $$;

----------------------------------------------------------------------------- 4. Fungsi tamu (token undangan)
create or replace function public.live_config(p_token text) returns jsonb language plpgsql stable security definer set search_path = public as $$
declare c record; rm public.live_rooms; v public.live_venues;
begin
  select * into c from public._guest_ctx(p_token); if c.g is null then return null; end if;
  select * into rm from public.live_rooms where invitation_id = c.inv;
  select * into v from public.live_venues where id = coalesce(rm.venue_id, (select id from public.live_venues where key = (public.live_setting('default_theme') #>> '{}') and active), (select id from public.live_venues where active order by sort limit 1));
  return jsonb_build_object('enabled', public.live_enabled(),
    'features', jsonb_build_object('music', public.live_setting('music'), 'qris', public.live_setting('qris'), 'gallery', public.live_setting('gallery'), 'guestbook', public.live_setting('guestbook')),
    'room', jsonb_build_object('status', coalesce(rm.status, 'open'), 'chat_mode', coalesce(rm.chat_mode, 'open'), 'slow_seconds', coalesce(rm.slow_seconds, 3),
      'max_guests', coalesce(rm.max_guests, v.max_guests, (public.live_setting('max_guests') #>> '{}')::int), 'online', public.live_online(c.inv)),
    'venue', case when v.id is null then null else jsonb_build_object('key', v.key, 'name', v.name, 'template', v.template, 'background_url', v.background_url,
      'areas', coalesce((select jsonb_agg(x) from jsonb_array_elements(v.areas) x where coalesce((x ->> 'enabled')::boolean, true)), '[]'::jsonb)) end,
    'interactions', coalesce((select jsonb_agg(jsonb_build_object('key', key, 'label', label, 'emoji', emoji, 'kind', kind, 'cooldown_seconds', cooldown_seconds) order by sort) from public.live_interactions where enabled), '[]'::jsonb),
    'games', coalesce((select jsonb_agg(jsonb_build_object('key', g.key, 'name', g.name, 'kind', g.kind, 'points_max', g.points_max,
        'config', case when g.kind = 'trivia' then jsonb_build_object('questions', coalesce((select jsonb_agg(jsonb_build_object('q', q ->> 'q', 'options', q -> 'options')) from jsonb_array_elements(g.config -> 'questions') q), '[]'::jsonb)) else g.config end) order by g.sort) from public.live_games g where g.enabled), '[]'::jsonb),
    'avatars', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'name', name, 'url', url, 'theme', theme, 'config', config) order by sort) from public.live_assets where kind = 'avatar' and active), '[]'::jsonb));
end $$;

create or replace function public.live_join(p_token text) returns jsonb language plpgsql security definer set search_path = public as $$
declare c record; rm public.live_rooms; mx int; m public.live_mutes;
begin
  select * into c from public._guest_ctx(p_token); if c.g is null then return jsonb_build_object('ok', false, 'reason', 'token_tidak_valid'); end if;
  perform public._rl('guest-live-join-' || p_token, 60, 3600);
  if not public.live_enabled() then return jsonb_build_object('ok', false, 'reason', 'dimatikan'); end if;
  select * into rm from public.live_rooms where invitation_id = c.inv;
  if found and rm.status = 'closed' then return jsonb_build_object('ok', false, 'reason', 'ruangan_ditutup'); end if;
  select * into m from public.live_mutes where invitation_id = c.inv and guest_id = c.g and kind = 'ban' and until > now();
  if found then return jsonb_build_object('ok', false, 'reason', 'diblokir'); end if;
  mx := coalesce(rm.max_guests, (select max_guests from public.live_venues where id = rm.venue_id), (public.live_setting('max_guests') #>> '{}')::int);
  if not exists (select 1 from public.live_presence where invitation_id = c.inv and guest_id = c.g and last_seen > now() - interval '90 seconds')
     and public.live_online(c.inv) >= mx then return jsonb_build_object('ok', false, 'reason', 'penuh'); end if;
  insert into public.live_presence (invitation_id, guest_id, guest_name, last_seen) values (c.inv, c.g, c.gname, now())
    on conflict (invitation_id, guest_id) do update set last_seen = now(), guest_name = excluded.guest_name;
  insert into public.live_guest_events (invitation_id, guest_id, guest_name, action) values (c.inv, c.g, c.gname, 'masuk');
  return jsonb_build_object('ok', true, 'online', public.live_online(c.inv));
end $$;

create or replace function public.live_heartbeat(p_token text) returns int language plpgsql security definer set search_path = public as $$
declare c record; m public.live_mutes;
begin
  select * into c from public._guest_ctx(p_token); if c.g is null then return null; end if;
  perform public._rl('guest-live-hb-' || p_token, 240, 3600);
  select * into m from public.live_mutes where invitation_id = c.inv and guest_id = c.g and kind = 'ban' and until > now();
  if found or exists (select 1 from public.live_rooms where invitation_id = c.inv and status = 'closed') then
    delete from public.live_presence where invitation_id = c.inv and guest_id = c.g; return -1; end if;
  update public.live_presence set last_seen = now() where invitation_id = c.inv and guest_id = c.g;
  if not found then return -1; end if;
  return public.live_online(c.inv);
end $$;

create or replace function public.live_leave(p_token text) returns boolean language plpgsql security definer set search_path = public as $$
declare c record;
begin
  select * into c from public._guest_ctx(p_token); if c.g is null then return false; end if;
  if public.delete_presence(c.inv, c.g) then insert into public.live_guest_events (invitation_id, guest_id, guest_name, action) values (c.inv, c.g, c.gname, 'keluar'); end if;
  return true;
end $$;

create or replace function public.delete_presence(p_inv uuid, p_g uuid) returns boolean language plpgsql security definer set search_path = public as $$
declare n int; begin delete from public.live_presence where invitation_id = p_inv and guest_id = p_g; get diagnostics n = row_count; return n > 0; end $$;

create or replace function public.live_interact(p_token text, p_key text) returns jsonb language plpgsql security definer set search_path = public as $$
declare c record; it public.live_interactions; last timestamptz;
begin
  select * into c from public._guest_ctx(p_token); if c.g is null then return jsonb_build_object('ok', false, 'reason', 'token_tidak_valid'); end if;
  select * into it from public.live_interactions where key = p_key and enabled;
  if not found then return jsonb_build_object('ok', false, 'reason', 'interaksi_tidak_aktif'); end if;
  if not exists (select 1 from public.live_presence where invitation_id = c.inv and guest_id = c.g and last_seen > now() - interval '90 seconds') then return jsonb_build_object('ok', false, 'reason', 'belum_masuk'); end if;
  perform public._rl('guest-live-act-' || p_token, 240, 3600);
  select max(created_at) into last from public.live_guest_events where guest_id = c.g and action = it.kind and detail = it.key;
  if last is not null and last > now() - make_interval(secs => it.cooldown_seconds) then return jsonb_build_object('ok', false, 'reason', 'terlalu_cepat'); end if;
  insert into public.live_guest_events (invitation_id, guest_id, guest_name, action, detail) values (c.inv, c.g, c.gname, it.kind, it.key);
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.live_chat_send(p_token text, p_body text) returns jsonb language plpgsql security definer set search_path = public as $$
declare c record; rm public.live_rooms; b text := btrim(regexp_replace(coalesce(p_body, ''), '\s+', ' ', 'g')); st text := 'visible'; fl text; m public.live_mutes; lastc timestamptz; sl int; id uuid;
begin
  select * into c from public._guest_ctx(p_token); if c.g is null then return jsonb_build_object('ok', false, 'reason', 'token_tidak_valid'); end if;
  if char_length(b) not between 1 and 300 then return jsonb_build_object('ok', false, 'reason', 'pesan_tidak_valid'); end if;
  select * into rm from public.live_rooms where invitation_id = c.inv;
  if coalesce(rm.status, 'open') = 'closed' then return jsonb_build_object('ok', false, 'reason', 'ruangan_ditutup'); end if;
  if coalesce(rm.chat_mode, 'open') = 'off' then return jsonb_build_object('ok', false, 'reason', 'chat_nonaktif'); end if;
  select * into m from public.live_mutes where invitation_id = c.inv and guest_id = c.g and until > now();
  if found then return jsonb_build_object('ok', false, 'reason', case when m.kind = 'ban' then 'diblokir' else 'dibisukan' end); end if;
  if not exists (select 1 from public.live_presence where invitation_id = c.inv and guest_id = c.g and last_seen > now() - interval '90 seconds') then return jsonb_build_object('ok', false, 'reason', 'belum_masuk'); end if;
  perform public._rl('guest-live-chat-' || p_token, 120, 3600);
  sl := coalesce(rm.slow_seconds, 3);
  select max(created_at) into lastc from public.live_chat where invitation_id = c.inv and guest_id = c.g;
  if lastc is not null and lastc > now() - make_interval(secs => sl) then return jsonb_build_object('ok', false, 'reason', 'terlalu_cepat'); end if;
  if exists (select 1 from public.live_words w where lower(b) like '%' || replace(replace(replace(w.word, '\', '\\'), '%', '\%'), '_', '\_') || '%') then st := 'hidden'; fl := 'kata_terlarang';
  elsif b ~* 'https?://|www\.' then st := 'hidden'; fl := 'tautan';
  elsif coalesce(rm.chat_mode, 'open') = 'moderated' then st := 'pending'; end if;
  insert into public.live_chat (invitation_id, guest_id, guest_name, body, status, auto_flag) values (c.inv, c.g, c.gname, b, st, fl) returning live_chat.id into id;
  return jsonb_build_object('ok', true, 'id', id, 'status', st);
end $$;

create or replace function public.live_chat_list(p_token text, p_since timestamptz default null) returns jsonb language plpgsql stable security definer set search_path = public as $$
declare c record;
begin
  select * into c from public._guest_ctx(p_token); if c.g is null then return null; end if;
  return coalesce((select jsonb_agg(to_jsonb(t) order by t.created_at) from (select id, guest_name as name, body, status, created_at from public.live_chat
     where invitation_id = c.inv and (p_since is null or created_at > p_since) and created_at > now() - interval '6 hours' and (status = 'visible' or (guest_id = c.g and status in ('pending', 'hidden')))
     order by created_at desc limit 60) t), '[]'::jsonb);
end $$;

create or replace function public.live_game_submit(p_token text, p_game text, p_score int default null, p_answers int[] default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare c record; g public.live_games; sc int; n int; i int; right_n int := 0; best int; q jsonb;
begin
  select * into c from public._guest_ctx(p_token); if c.g is null then return jsonb_build_object('ok', false, 'reason', 'token_tidak_valid'); end if;
  select * into g from public.live_games where key = p_game and enabled; if not found then return jsonb_build_object('ok', false, 'reason', 'game_tidak_aktif'); end if;
  perform public._rl('guest-live-game-' || p_token, 60, 3600);
  if g.kind = 'trivia' then
    n := jsonb_array_length(coalesce(g.config -> 'questions', '[]'::jsonb));
    if n = 0 or p_answers is null or coalesce(array_length(p_answers, 1), 0) <> n then return jsonb_build_object('ok', false, 'reason', 'jawaban_tidak_valid'); end if;
    for i in 0 .. n - 1 loop
      q := (g.config -> 'questions') -> i;
      if p_answers[i + 1] = (q ->> 'answer')::int then right_n := right_n + 1; end if;
    end loop;
    sc := (g.points_max * right_n) / n;
  else
    if p_score is null or p_score < 0 or p_score > g.points_max then return jsonb_build_object('ok', false, 'reason', 'skor_tidak_valid'); end if;
    sc := p_score;
  end if;
  insert into public.live_game_scores (game_id, guest_id, invitation_id, guest_name, score) values (g.id, c.g, c.inv, c.gname, sc)
    on conflict (game_id, guest_id) do update set score = greatest(public.live_game_scores.score, excluded.score), plays = public.live_game_scores.plays + 1, updated_at = now()
    returning score into best;
  return jsonb_build_object('ok', true, 'score', sc, 'best', best);
end $$;

create or replace function public.live_leaderboard(p_token text, p_game text) returns jsonb language plpgsql stable security definer set search_path = public as $$
declare c record;
begin
  select * into c from public._guest_ctx(p_token); if c.g is null then return null; end if;
  return coalesce((select jsonb_agg(to_jsonb(t)) from (select s.guest_name as name, s.score from public.live_game_scores s join public.live_games g on g.id = s.game_id
     where g.key = p_game and s.invitation_id = c.inv order by s.score desc, s.updated_at limit 10) t), '[]'::jsonb);
end $$;

----------------------------------------------------------------------------- 5. Fungsi admin
create or replace function public.admin_live_overview() returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not public.has_perm('live.read') then raise exception 'forbidden' using errcode = '42501'; end if;
  return jsonb_build_object('enabled', public.live_enabled(),
    'online_now', (select count(*) from public.live_presence where last_seen > now() - interval '90 seconds'),
    'rooms_live', (select count(distinct invitation_id) from public.live_presence where last_seen > now() - interval '90 seconds'),
    'rooms_closed', (select count(*) from public.live_rooms where status = 'closed'),
    'joins_24h', (select count(*) from public.live_guest_events where action = 'masuk' and created_at > now() - interval '24 hours'),
    'chat_pending', (select count(*) from public.live_chat where status = 'pending'),
    'chat_flagged_24h', (select count(*) from public.live_chat where auto_flag is not null and created_at > now() - interval '24 hours'),
    'mutes_active', (select count(*) from public.live_mutes where until > now()),
    'games_enabled', (select count(*) from public.live_games where enabled), 'venues_active', (select count(*) from public.live_venues where active));
end $$;

create or replace function public.admin_live_rooms(p_q text default null, p_limit int default 25, p_offset int default 0) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare q text := nullif(btrim(coalesce(p_q, '')), ''); pat text; v_total bigint; v_rows jsonb;
begin
  if not public.has_perm('live.read') then raise exception 'forbidden' using errcode = '42501'; end if;
  pat := case when q is null then null else '%' || replace(replace(replace(q, '\', '\\'), '%', '\%'), '_', '\_') || '%' end;
  with ids as (select i.id from public.invitations i where (pat is null or i.title ilike pat or i.public_url ilike pat)
     and (exists (select 1 from public.live_rooms r where r.invitation_id = i.id) or exists (select 1 from public.live_presence p where p.invitation_id = i.id and p.last_seen > now() - interval '90 seconds')
          or exists (select 1 from public.live_guest_events e where e.invitation_id = i.id and e.created_at > now() - interval '7 days') or exists (select 1 from public.live_chat c where c.invitation_id = i.id and c.created_at > now() - interval '7 days')))
  select count(*) into v_total from ids;
  select coalesce(jsonb_agg(to_jsonb(z) order by z.online desc, z.events_24h desc), '[]'::jsonb) into v_rows from (
    select i.id, i.title, i.public_url, coalesce(r.status, 'open') as status, coalesce(r.chat_mode, 'open') as chat_mode, r.max_guests, coalesce(r.slow_seconds, 3) as slow_seconds,
           r.venue_id, v.name as venue, public.live_online(i.id) as online,
           (select count(*) from public.live_guest_events e where e.invitation_id = i.id and e.created_at > now() - interval '24 hours') as events_24h,
           (select count(*) from public.live_chat c where c.invitation_id = i.id and c.status = 'pending') as chat_pending,
           (select count(*) from public.live_mutes m where m.invitation_id = i.id and m.until > now()) as mutes
      from public.invitations i left join public.live_rooms r on r.invitation_id = i.id left join public.live_venues v on v.id = r.venue_id
     where (pat is null or i.title ilike pat or i.public_url ilike pat)
       and (r.invitation_id is not null or exists (select 1 from public.live_presence p where p.invitation_id = i.id and p.last_seen > now() - interval '90 seconds')
          or exists (select 1 from public.live_guest_events e where e.invitation_id = i.id and e.created_at > now() - interval '7 days') or exists (select 1 from public.live_chat c where c.invitation_id = i.id and c.created_at > now() - interval '7 days'))
     order by public.live_online(i.id) desc, i.created_at desc limit greatest(1, least(coalesce(p_limit, 25), 200)) offset greatest(0, coalesce(p_offset, 0))) z;
  return jsonb_build_object('total', v_total, 'rows', v_rows);
end $$;

create or replace function public.admin_live_room_set(p_inv uuid, p_status text, p_chat_mode text, p_slow int, p_max int, p_venue uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.has_perm('live.write') then raise exception 'forbidden' using errcode = '42501'; end if;
  if not exists (select 1 from public.invitations where id = p_inv) then raise exception 'undangan_tidak_ditemukan'; end if;
  if p_status not in ('open', 'closed') then raise exception 'status_tidak_valid'; end if;
  if p_chat_mode not in ('open', 'moderated', 'off') then raise exception 'mode_chat_tidak_valid'; end if;
  if p_slow is null or p_slow not between 0 and 120 then raise exception 'slow_mode_tidak_valid'; end if;
  if p_max is not null and p_max not between 1 and 5000 then raise exception 'kapasitas_tidak_valid'; end if;
  if p_venue is not null and not exists (select 1 from public.live_venues where id = p_venue) then raise exception 'venue_tidak_ditemukan'; end if;
  insert into public.live_rooms (invitation_id, venue_id, status, max_guests, chat_mode, slow_seconds, updated_by) values (p_inv, p_venue, p_status, p_max, p_chat_mode, p_slow, auth.uid())
    on conflict (invitation_id) do update set venue_id = excluded.venue_id, status = excluded.status, max_guests = excluded.max_guests, chat_mode = excluded.chat_mode, slow_seconds = excluded.slow_seconds, updated_by = excluded.updated_by, updated_at = now();
  if p_status = 'closed' then delete from public.live_presence where invitation_id = p_inv; end if;
end $$;

create or replace function public.admin_live_guests(p_inv uuid) returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not public.has_perm('live.read') then raise exception 'forbidden' using errcode = '42501'; end if;
  return jsonb_build_object('online', coalesce((select jsonb_agg(jsonb_build_object('guest_id', p.guest_id, 'name', p.guest_name, 'last_seen', p.last_seen,
        'mute', (select m.kind from public.live_mutes m where m.invitation_id = p.invitation_id and m.guest_id = p.guest_id and m.until > now())) order by p.guest_name)
      from public.live_presence p where p.invitation_id = p_inv and p.last_seen > now() - interval '90 seconds'), '[]'::jsonb),
    'mutes', coalesce((select jsonb_agg(jsonb_build_object('guest_id', m.guest_id, 'name', g.name, 'kind', m.kind, 'until', m.until, 'reason', m.reason) order by m.created_at desc)
      from public.live_mutes m join public.invitation_guests g on g.id = m.guest_id where m.invitation_id = p_inv and m.until > now()), '[]'::jsonb));
end $$;

create or replace function public.admin_live_mute(p_inv uuid, p_guest uuid, p_kind text, p_minutes int, p_reason text default null) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.has_perm('live.write') then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_kind not in ('mute', 'ban') then raise exception 'jenis_tidak_valid'; end if;
  if p_minutes is null or p_minutes not between 1 and 10080 then raise exception 'durasi_tidak_valid'; end if;
  if char_length(btrim(coalesce(p_reason, ''))) < 3 then raise exception 'alasan_wajib'; end if;
  if not exists (select 1 from public.invitation_guests where id = p_guest and invitation_id = p_inv) then raise exception 'tamu_tidak_ditemukan'; end if;
  insert into public.live_mutes (invitation_id, guest_id, kind, until, reason, created_by) values (p_inv, p_guest, p_kind, now() + make_interval(mins => p_minutes), left(btrim(p_reason), 200), auth.uid())
    on conflict (invitation_id, guest_id) do update set kind = excluded.kind, until = excluded.until, reason = excluded.reason, created_by = excluded.created_by, created_at = now();
  if p_kind = 'ban' then delete from public.live_presence where invitation_id = p_inv and guest_id = p_guest; end if;
end $$;

create or replace function public.admin_live_unmute(p_inv uuid, p_guest uuid) returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.has_perm('live.write') then raise exception 'forbidden' using errcode = '42501'; end if;
  delete from public.live_mutes where invitation_id = p_inv and guest_id = p_guest;
end $$;

create or replace function public.admin_live_kick(p_inv uuid, p_guest uuid) returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.has_perm('live.write') then raise exception 'forbidden' using errcode = '42501'; end if;
  delete from public.live_presence where invitation_id = p_inv and guest_id = p_guest;
end $$;

create or replace function public.admin_live_chat(p_status text default null, p_inv uuid default null, p_q text default null, p_limit int default 25, p_offset int default 0) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare q text := nullif(btrim(coalesce(p_q, '')), ''); pat text; v_total bigint; v_rows jsonb;
begin
  if not public.has_perm('live.read') then raise exception 'forbidden' using errcode = '42501'; end if;
  pat := case when q is null then null else '%' || replace(replace(replace(q, '\', '\\'), '%', '\%'), '_', '\_') || '%' end;
  select count(*) into v_total from public.live_chat c where (p_status is null or c.status = p_status) and (p_inv is null or c.invitation_id = p_inv) and (pat is null or c.body ilike pat or c.guest_name ilike pat);
  select coalesce(jsonb_agg(to_jsonb(z) order by z.created_at desc), '[]'::jsonb) into v_rows from (
    select c.id, c.invitation_id, c.guest_id, c.guest_name, c.body, c.status, c.auto_flag, c.note, c.created_at, c.moderated_at, i.title as invitation
      from public.live_chat c join public.invitations i on i.id = c.invitation_id
     where (p_status is null or c.status = p_status) and (p_inv is null or c.invitation_id = p_inv) and (pat is null or c.body ilike pat or c.guest_name ilike pat)
     order by c.created_at desc limit greatest(1, least(coalesce(p_limit, 25), 200)) offset greatest(0, coalesce(p_offset, 0))) z;
  return jsonb_build_object('total', v_total, 'rows', v_rows);
end $$;

create or replace function public.admin_live_chat_mod(p_id uuid, p_action text, p_note text default null) returns void language plpgsql security definer set search_path = public as $$
declare c public.live_chat; ns text;
begin
  if not public.has_perm('live.write') then raise exception 'forbidden' using errcode = '42501'; end if;
  select * into c from public.live_chat where id = p_id for update; if not found then raise exception 'pesan_tidak_ditemukan'; end if;
  ns := case p_action when 'approve' then 'visible' when 'hide' then 'hidden' when 'remove' then 'removed' else null end;
  if ns is null then raise exception 'aksi_tidak_valid'; end if;
  if p_action <> 'approve' and char_length(btrim(coalesce(p_note, ''))) < 3 then raise exception 'alasan_wajib'; end if;
  update public.live_chat set status = ns, note = nullif(left(btrim(coalesce(p_note, '')), 200), ''), moderated_by = auth.uid(), moderated_at = now() where id = p_id;
  insert into public.audit_logs (actor_id, action, table_name, row_id, summary) values (auth.uid(), 'update', 'live_chat', p_id::text, jsonb_build_object('status', jsonb_build_array(c.status, ns), 'note', left(coalesce(p_note, ''), 200)));
end $$;

create or replace function public.admin_live_words() returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not public.has_perm('live.read') then raise exception 'forbidden' using errcode = '42501'; end if;
  return coalesce((select jsonb_agg(word order by word) from public.live_words), '[]'::jsonb);
end $$;

create or replace function public.admin_live_word_set(p_word text, p_on boolean) returns void language plpgsql security definer set search_path = public as $$
declare w text := lower(btrim(coalesce(p_word, '')));
begin
  if not public.has_perm('live.write') then raise exception 'forbidden' using errcode = '42501'; end if;
  if char_length(w) not between 2 and 40 then raise exception 'kata_tidak_valid'; end if;
  if p_on then insert into public.live_words (word) values (w) on conflict do nothing; else delete from public.live_words where word = w; end if;
end $$;

create or replace function public.admin_live_venues() returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not public.has_perm('live.read') then raise exception 'forbidden' using errcode = '42501'; end if;
  return coalesce((select jsonb_agg(to_jsonb(v) || jsonb_build_object('rooms', (select count(*) from public.live_rooms r where r.venue_id = v.id)) order by v.sort, v.name) from public.live_venues v), '[]'::jsonb);
end $$;

create or replace function public.admin_live_venue_save(p jsonb) returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid := nullif(p ->> 'id', '')::uuid;
begin
  if not public.has_perm('live.write') then raise exception 'forbidden' using errcode = '42501'; end if;
  if not public.live_areas_ok(p -> 'areas') then raise exception 'area_tidak_valid'; end if;
  if char_length(coalesce(p ->> 'name', '')) not between 2 and 60 then raise exception 'nama_tidak_valid'; end if;
  if coalesce(p ->> 'key', '') !~ '^[a-z0-9][a-z0-9-]{1,38}$' then raise exception 'kunci_tidak_valid'; end if;
  if coalesce((p ->> 'max_guests')::int, 300) not between 1 and 5000 then raise exception 'kapasitas_tidak_valid'; end if;
  if p ->> 'background_url' is not null and p ->> 'background_url' !~ '^(https://|/)' then raise exception 'url_tidak_valid'; end if;
  if v_id is null then
    insert into public.live_venues (key, name, template, background_url, areas, max_guests, active, sort)
    values (p ->> 'key', p ->> 'name', nullif(p ->> 'template', ''), nullif(p ->> 'background_url', ''), p -> 'areas', coalesce((p ->> 'max_guests')::int, 300), coalesce((p ->> 'active')::boolean, true), coalesce((p ->> 'sort')::int, 0)) returning id into v_id;
  else
    update public.live_venues set key = p ->> 'key', name = p ->> 'name', template = nullif(p ->> 'template', ''), background_url = nullif(p ->> 'background_url', ''), areas = p -> 'areas',
      max_guests = coalesce((p ->> 'max_guests')::int, 300), active = coalesce((p ->> 'active')::boolean, true), sort = coalesce((p ->> 'sort')::int, 0), updated_at = now() where id = v_id;
    if not found then raise exception 'venue_tidak_ditemukan'; end if;
  end if;
  return v_id;
exception when unique_violation then raise exception 'kunci_sudah_dipakai';
end $$;

create or replace function public.admin_live_venue_delete(p_id uuid) returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.has_perm('live.delete') then raise exception 'forbidden' using errcode = '42501'; end if;
  if exists (select 1 from public.live_rooms where venue_id = p_id) then raise exception 'venue_dipakai'; end if;
  delete from public.live_venues where id = p_id;
end $$;

create or replace function public.admin_live_interactions() returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not public.has_perm('live.read') then raise exception 'forbidden' using errcode = '42501'; end if;
  return coalesce((select jsonb_agg(to_jsonb(i) || jsonb_build_object('uses_7d', (select count(*) from public.live_guest_events e where e.action = i.kind and e.detail = i.key and e.created_at > now() - interval '7 days')) order by i.sort) from public.live_interactions i), '[]'::jsonb);
end $$;

create or replace function public.admin_live_interaction_save(p_key text, p_label text, p_emoji text, p_kind text, p_enabled boolean, p_cooldown int, p_sort int) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.has_perm('live.write') then raise exception 'forbidden' using errcode = '42501'; end if;
  if coalesce(p_key, '') !~ '^[a-z0-9_]{2,24}$' then raise exception 'kunci_tidak_valid'; end if;
  if char_length(coalesce(p_label, '')) not between 2 and 40 or char_length(coalesce(p_emoji, '')) not between 1 and 8 then raise exception 'isian_tidak_valid'; end if;
  if p_kind not in ('sapa', 'reaksi') then raise exception 'jenis_tidak_valid'; end if;
  if p_cooldown is null or p_cooldown not between 0 and 60 then raise exception 'jeda_tidak_valid'; end if;
  insert into public.live_interactions (key, label, emoji, kind, enabled, cooldown_seconds, sort) values (p_key, btrim(p_label), btrim(p_emoji), p_kind, coalesce(p_enabled, true), p_cooldown, coalesce(p_sort, 0))
    on conflict (key) do update set label = excluded.label, emoji = excluded.emoji, kind = excluded.kind, enabled = excluded.enabled, cooldown_seconds = excluded.cooldown_seconds, sort = excluded.sort;
end $$;

create or replace function public.admin_live_interaction_delete(p_key text) returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.has_perm('live.delete') then raise exception 'forbidden' using errcode = '42501'; end if;
  delete from public.live_interactions where key = p_key;
end $$;

create or replace function public.live_game_cfg_ok(p_kind text, p_cfg jsonb) returns boolean language plpgsql immutable as $$
declare q jsonb; n int;
begin
  if jsonb_typeof(p_cfg) <> 'object' then return false; end if;
  if p_kind = 'trivia' then
    if jsonb_typeof(p_cfg -> 'questions') <> 'array' then return false; end if;
    n := jsonb_array_length(p_cfg -> 'questions'); if n < 1 or n > 20 then return false; end if;
    for q in select * from jsonb_array_elements(p_cfg -> 'questions') loop
      if jsonb_typeof(q) <> 'object' or char_length(coalesce(q ->> 'q', '')) not between 3 and 200 then return false; end if;
      if jsonb_typeof(q -> 'options') <> 'array' or jsonb_array_length(q -> 'options') not between 2 and 6 then return false; end if;
      if jsonb_typeof(q -> 'answer') <> 'number' or (q ->> 'answer')::numeric <> floor((q ->> 'answer')::numeric) or (q ->> 'answer')::int not between 0 and jsonb_array_length(q -> 'options') - 1 then return false; end if;
    end loop;
  elsif p_kind = 'tap' then
    if p_cfg ? 'seconds' and (jsonb_typeof(p_cfg -> 'seconds') <> 'number' or (p_cfg ->> 'seconds')::numeric not between 5 and 120) then return false; end if;
  elsif p_kind = 'memory' then
    if p_cfg ? 'pairs' and (jsonb_typeof(p_cfg -> 'pairs') <> 'number' or (p_cfg ->> 'pairs')::numeric not between 2 and 12) then return false; end if;
  end if;
  return true;
end $$;

create or replace function public.admin_live_games() returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not public.has_perm('live.read') then raise exception 'forbidden' using errcode = '42501'; end if;
  return coalesce((select jsonb_agg(to_jsonb(g) || jsonb_build_object('players', (select count(*) from public.live_game_scores s where s.game_id = g.id), 'plays', (select coalesce(sum(plays), 0) from public.live_game_scores s where s.game_id = g.id)) order by g.sort, g.name) from public.live_games g), '[]'::jsonb);
end $$;

create or replace function public.admin_live_game_save(p jsonb) returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid := nullif(p ->> 'id', '')::uuid; k text := p ->> 'kind';
begin
  if not public.has_perm('live.write') then raise exception 'forbidden' using errcode = '42501'; end if;
  if coalesce(p ->> 'key', '') !~ '^[a-z0-9][a-z0-9-]{1,38}$' then raise exception 'kunci_tidak_valid'; end if;
  if char_length(coalesce(p ->> 'name', '')) not between 2 and 60 then raise exception 'nama_tidak_valid'; end if;
  if k not in ('trivia', 'tap', 'memory') then raise exception 'jenis_tidak_valid'; end if;
  if coalesce((p ->> 'points_max')::int, 100) not between 1 and 10000 then raise exception 'poin_tidak_valid'; end if;
  if not public.live_game_cfg_ok(k, coalesce(p -> 'config', '{}'::jsonb)) then raise exception 'konfigurasi_game_tidak_valid'; end if;
  if v_id is null then
    insert into public.live_games (key, name, kind, enabled, points_max, config, sort) values (p ->> 'key', p ->> 'name', k, coalesce((p ->> 'enabled')::boolean, false), coalesce((p ->> 'points_max')::int, 100), coalesce(p -> 'config', '{}'::jsonb), coalesce((p ->> 'sort')::int, 0)) returning id into v_id;
  else
    update public.live_games set key = p ->> 'key', name = p ->> 'name', kind = k, enabled = coalesce((p ->> 'enabled')::boolean, false), points_max = coalesce((p ->> 'points_max')::int, 100), config = coalesce(p -> 'config', '{}'::jsonb), sort = coalesce((p ->> 'sort')::int, 0) where id = v_id;
    if not found then raise exception 'game_tidak_ditemukan'; end if;
  end if;
  return v_id;
exception when unique_violation then raise exception 'kunci_sudah_dipakai';
end $$;

create or replace function public.admin_live_game_delete(p_id uuid) returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.has_perm('live.delete') then raise exception 'forbidden' using errcode = '42501'; end if;
  delete from public.live_games where id = p_id;
end $$;

create or replace function public.admin_live_game_scores(p_game uuid, p_limit int default 20) returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not public.has_perm('live.read') then raise exception 'forbidden' using errcode = '42501'; end if;
  return coalesce((select jsonb_agg(to_jsonb(t)) from (select s.guest_name as name, s.score, s.plays, i.title as invitation from public.live_game_scores s join public.invitations i on i.id = s.invitation_id
     where s.game_id = p_game order by s.score desc, s.updated_at limit greatest(1, least(coalesce(p_limit, 20), 100))) t), '[]'::jsonb);
end $$;

create or replace function public.admin_live_analytics(p_from timestamptz, p_to timestamptz) returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not public.has_perm('live.read') then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_from is null or p_to is null or p_to <= p_from or p_to - p_from > interval '366 days' then raise exception 'rentang_tidak_valid'; end if;
  return jsonb_build_object(
    'joins', (select count(*) from public.live_guest_events where action = 'masuk' and created_at >= p_from and created_at < p_to),
    'unique_guests', (select count(distinct guest_id) from public.live_guest_events where action = 'masuk' and created_at >= p_from and created_at < p_to),
    'rooms', (select count(distinct invitation_id) from public.live_guest_events where action = 'masuk' and created_at >= p_from and created_at < p_to),
    'interactions', (select count(*) from public.live_guest_events where action in ('sapa', 'reaksi') and created_at >= p_from and created_at < p_to),
    'chat_total', (select count(*) from public.live_chat where created_at >= p_from and created_at < p_to),
    'chat_hidden', (select count(*) from public.live_chat where status in ('hidden', 'removed') and created_at >= p_from and created_at < p_to),
    'game_plays', (select coalesce(sum(plays), 0) from public.live_game_scores where updated_at >= p_from and updated_at < p_to),
    'daily', coalesce((select jsonb_agg(t order by t.day) from (select to_char(date_trunc('day', created_at at time zone 'Asia/Jakarta'), 'YYYY-MM-DD') as day, count(*) filter (where action = 'masuk') as joins,
        count(*) filter (where action in ('sapa', 'reaksi')) as interactions from public.live_guest_events where created_at >= p_from and created_at < p_to group by 1) t), '[]'::jsonb),
    'by_interaction', coalesce((select jsonb_agg(t order by t.n desc) from (select e.detail as key, coalesce(i.label, e.detail) as label, count(*) as n from public.live_guest_events e left join public.live_interactions i on i.key = e.detail
        where e.action in ('sapa', 'reaksi') and e.detail is not null and e.created_at >= p_from and e.created_at < p_to group by 1, 2 limit 20) t), '[]'::jsonb),
    'top_rooms', coalesce((select jsonb_agg(t order by t.joins desc) from (select i.title, count(*) filter (where e.action = 'masuk') as joins, count(distinct e.guest_id) as guests from public.live_guest_events e join public.invitations i on i.id = e.invitation_id
        where e.created_at >= p_from and e.created_at < p_to group by i.id, i.title order by 2 desc limit 10) t), '[]'::jsonb));
end $$;

create or replace function public.admin_live_cleanup() returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if not public.has_perm('live.write') then raise exception 'forbidden' using errcode = '42501'; end if;
  delete from public.live_presence where last_seen < now() - interval '1 day'; get diagnostics n = row_count;
  delete from public.live_chat where created_at < now() - interval '30 days';
  delete from public.live_mutes where until < now() - interval '30 days';
  return n;
end $$;

----------------------------------------------------------------------------- 6. Hak eksekusi
do $$ declare f text; begin
  foreach f in array array['live_online(uuid)', 'live_areas_ok(jsonb)', 'live_enabled()', 'live_defaults()', 'live_setting(text)', 'delete_presence(uuid,uuid)', 'live_game_cfg_ok(text,jsonb)'] loop
    execute format('revoke all on function public.%s from public, anon, authenticated', f); end loop;
  foreach f in array array['live_config(text)', 'live_join(text)', 'live_heartbeat(text)', 'live_leave(text)', 'live_interact(text,text)', 'live_chat_send(text,text)', 'live_chat_list(text,timestamptz)',
    'live_game_submit(text,text,int,int[])', 'live_leaderboard(text,text)'] loop
    execute format('revoke all on function public.%s from public', f);
    execute format('grant execute on function public.%s to anon, authenticated', f); end loop;
  foreach f in array array['admin_live_settings_get()', 'admin_live_settings_save(jsonb)', 'admin_live_overview()', 'admin_live_rooms(text,int,int)', 'admin_live_room_set(uuid,text,text,int,int,uuid)', 'admin_live_guests(uuid)', 'admin_live_mute(uuid,uuid,text,int,text)',
    'admin_live_unmute(uuid,uuid)', 'admin_live_kick(uuid,uuid)', 'admin_live_chat(text,uuid,text,int,int)', 'admin_live_chat_mod(uuid,text,text)', 'admin_live_words()', 'admin_live_word_set(text,boolean)',
    'admin_live_venues()', 'admin_live_venue_save(jsonb)', 'admin_live_venue_delete(uuid)', 'admin_live_interactions()', 'admin_live_interaction_save(text,text,text,text,boolean,int,int)',
    'admin_live_interaction_delete(text)', 'admin_live_games()', 'admin_live_game_save(jsonb)', 'admin_live_game_delete(uuid)', 'admin_live_game_scores(uuid,int)', 'admin_live_analytics(timestamptz,timestamptz)', 'admin_live_cleanup()'] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f); end loop;
end $$;
