-- Demo venue publik: /live/?venue=<kunci> menampilkan tema, dekor, dan menu venue AKTIF tanpa token tamu. Hanya baca; aditif & idempoten.
-- Jalankan SETELAH admin-live-decor-avatars.sql dan admin-live-theme-*.sql.
create or replace function public.live_theme_demo(p_key text) returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v public.live_venues;
begin
  if coalesce(p_key, '') !~ '^[a-z0-9][a-z0-9-]{1,38}$' then return null; end if;
  select * into v from public.live_venues where key = p_key and active;
  if v.id is null or v.nm_theme is null then return null; end if;
  return jsonb_build_object('id', 'v-' || v.key, 'name', v.name, 'event', v.event_type, 'host', null, 'painting', v.background_url, 'pos', v.bg_pos, 'theme', v.nm_theme, 'decor', v.decor,
    'areas', (select coalesce(jsonb_agg(a), '[]'::jsonb) from jsonb_array_elements(coalesce(v.areas, '[]'::jsonb)) a where coalesce((a ->> 'enabled')::boolean, true)));
end $$;
revoke all on function public.live_theme_demo(text) from public; grant execute on function public.live_theme_demo(text) to anon, authenticated;
