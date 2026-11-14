-- Konten undangan Luxe -> Live Guest. Aditif; aman dijalankan ulang. Jalankan SETELAH admin-live-decor-avatars.sql, guest-schema.sql, dan admin-live-theme-*.sql.
-- 1) Venue otomatis mengikuti template undangan (templates.theme_key = live_venues.key) bila admin belum menetapkan venue ruangan.
-- 2) live_invitation(p_token): isi undangan (nama, acara, foto, hadiah, fitur, sambutan, RSVP & ucapan milik tamu) untuk halaman Live Guest.

create or replace function public._live_venue_id(p_inv uuid) returns uuid language sql stable security definer set search_path = public as $$
  select coalesce(
    (select r.venue_id from public.live_rooms r where r.invitation_id = p_inv),
    (select v.id from public.invitations i join public.templates t on t.slug = i.template_id join public.live_venues v on v.key = t.theme_key and v.active where i.id = p_inv),
    (select id from public.live_venues where key = (public.live_setting('default_theme') #>> '{}') and active),
    (select id from public.live_venues where active order by sort limit 1));
$$;
revoke all on function public._live_venue_id(uuid) from public, anon, authenticated;

create or replace function public.live_config(p_token text) returns jsonb language plpgsql stable security definer set search_path = public as $$
declare c record; rm public.live_rooms; v public.live_venues;
begin
  select * into c from public._guest_ctx(p_token); if c.g is null then return null; end if;
  select * into rm from public.live_rooms where invitation_id = c.inv;
  select * into v from public.live_venues where id = public._live_venue_id(c.inv);
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

create or replace function public.live_theme(p_token text) returns jsonb language plpgsql stable security definer set search_path = public as $$
declare c record; rm public.live_rooms; v public.live_venues; ttl text; ev text;
begin
  select * into c from public._guest_ctx(p_token); if c.g is null then return null; end if;
  select * into rm from public.live_rooms where invitation_id = c.inv;
  select * into v from public.live_venues where id = public._live_venue_id(c.inv);
  if v.id is null or v.nm_theme is null then return null; end if;
  select left(title, 60), event_type into ttl, ev from public.invitations where id = c.inv;
  if v.event_type is not null then ev := v.event_type; end if;
  if ev is null or ev not in ('wedding', 'engagement', 'birthday', 'sweet17', 'corporate') then ev := null; end if;
  return jsonb_build_object('id', 'v-' || v.key, 'name', v.name, 'event', ev, 'host', ttl, 'painting', v.background_url, 'pos', v.bg_pos, 'theme', v.nm_theme, 'decor', v.decor);
end $$;

revoke all on function public.live_config(text) from public; grant execute on function public.live_config(text) to anon, authenticated;
revoke all on function public.live_theme(text) from public; grant execute on function public.live_theme(text) to anon, authenticated;

create or replace function public.live_invitation(p_token text) returns jsonb language plpgsql stable security definer set search_path = public as $$
declare c record; i public.invitations; ct jsonb; r public.invitation_rsvps;
begin
  select * into c from public._guest_ctx(p_token); if c.g is null then return null; end if;
  select * into i from public.invitations where id = c.inv;
  ct := coalesce(i.content, '{}'::jsonb);
  select * into r from public.invitation_rsvps where guest_id = c.g;
  return jsonb_build_object('title', i.title, 'category', i.category, 'event_date', i.event_date,
    'names', coalesce(ct -> 'names', '{}'::jsonb), 'welcome', ct ->> 'welcome', 'event', coalesce(ct -> 'event', '{}'::jsonb), 'photos', coalesce(ct -> 'photos', '{}'::jsonb),
    'features', coalesce(ct -> 'features', '{}'::jsonb), 'live', coalesce(ct -> 'live', '{}'::jsonb), 'music', coalesce(ct -> 'music', '{}'::jsonb),
    'gift', case when coalesce((ct #>> '{features,gift}')::boolean, false) then coalesce(ct -> 'gift', '{}'::jsonb) else null end,
    'guest', jsonb_build_object('name', c.gname),
    'rsvp', case when r.id is null then null else jsonb_build_object('status', r.status, 'pax', r.pax, 'message', r.message) end,
    'wishes', (select coalesce(jsonb_agg(jsonb_build_object('name', w.name, 'message', w.message, 'at', w.created_at) order by w.created_at desc), '[]'::jsonb)
               from (select name, message, created_at from public.guestbook_entries where invitation_id = c.inv and visible order by created_at desc limit 30) w));
end $$;
revoke all on function public.live_invitation(text) from public; grant execute on function public.live_invitation(text) to anon, authenticated;
