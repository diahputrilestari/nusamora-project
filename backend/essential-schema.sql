-- NusaMora: undangan 2D universal (engine /undangan): RSVP, ucapan tamu, moderasi, kunci konten tambahan, validasi foto tambahan.
-- Jalankan PALING AKHIR: setelah package-schema.sql dan asset-schema.sql (file ini menimpa pkg_keys dan save_invitation dari keduanya).
-- Jika package-schema.sql atau asset-schema.sql dijalankan ulang, jalankan file ini sekali lagi sesudahnya. Aman dijalankan ulang (idempoten).
-- Tamu (anon) TIDAK menulis tabel langsung: semua lewat RPC yang memeriksa undangan aktif dan fitur yang dinyalakan pemilik.

----------------------------------------------------------------------------- 1. Kunci konten paket Essential untuk engine 2D universal
-- Sama dengan versi asset-schema.sql, ditambah couple, events, story, accounts (dibaca engine; juga lolos filter get_public_invitation).
create or replace function public.pkg_keys(p text) returns text[] language sql immutable as $$
  select array['names','welcome','event','photos','music','features','gift','avatars'] || case p
    when 'essential' then array['design2d','texts','sections','couple','events','story','accounts']
    when 'signature' then array['scene','camera','anim','cinematic']
    when 'luxe' then array['scene','venue','live'] else array[]::text[] end
$$;

----------------------------------------------------------------------------- 2. Tabel RSVP & ucapan
create table if not exists public.rsvps (
  id uuid primary key default gen_random_uuid(),
  invitation_id uuid not null references public.invitations(id) on delete cascade,
  guest_name text not null check (char_length(guest_name) between 1 and 60),
  attendance text not null check (attendance in ('hadir','tidak','ragu')),
  pax int not null default 1 check (pax between 0 and 10),
  note text check (note is null or char_length(note) <= 300),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists rsvps_guest_uq on public.rsvps (invitation_id, lower(guest_name));

create table if not exists public.wishes (
  id uuid primary key default gen_random_uuid(),
  invitation_id uuid not null references public.invitations(id) on delete cascade,
  guest_name text not null check (char_length(guest_name) between 1 and 60),
  message text not null check (char_length(message) between 1 and 500),
  attendance text check (attendance is null or attendance in ('hadir','tidak','ragu')),
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists wishes_inv_idx on public.wishes (invitation_id, created_at desc);

alter table public.rsvps enable row level security;
alter table public.wishes enable row level security;
-- pemilik undangan boleh MEMBACA; tidak ada policy tulis untuk klien
drop policy if exists "pemilik baca rsvp" on public.rsvps;
create policy "pemilik baca rsvp" on public.rsvps for select using (exists (select 1 from public.invitations i where i.id = invitation_id and i.user_id = auth.uid()));
drop policy if exists "pemilik baca ucapan" on public.wishes;
create policy "pemilik baca ucapan" on public.wishes for select using (exists (select 1 from public.invitations i where i.id = invitation_id and i.user_id = auth.uid()));

----------------------------------------------------------------------------- 3. Helper: undangan publik yang aktif
create or replace function public._public_inv(p_slug text) returns public.invitations
language sql stable security definer set search_path = public as $$
  select * from public.invitations
   where lower(slug) = lower(coalesce(p_slug, '')) and status = 'aktif' and moderation <> 'takedown'
     and expires_at > now()
   limit 1
$$;
revoke execute on function public._public_inv(text) from public, anon, authenticated;

create or replace function public._clean(p text, n int) returns text
language sql immutable as $$ select nullif(left(regexp_replace(trim(coalesce(p, '')), '[[:cntrl:]]', ' ', 'g'), n), '') $$;

----------------------------------------------------------------------------- 4. RSVP (upsert per nama tamu)
create or replace function public.submit_rsvp(p_slug text, p_name text, p_attendance text, p_pax int, p_note text) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare i public.invitations; nm text := public._clean(p_name, 60); nt text := public._clean(p_note, 300); px int; tot int;
begin
  i := public._public_inv(p_slug);
  if i.id is null then return jsonb_build_object('ok', false, 'error', 'tidak_tersedia'); end if;
  if coalesce((i.content #>> '{features,rsvp}')::boolean, true) is not true then return jsonb_build_object('ok', false, 'error', 'fitur_nonaktif'); end if;
  if nm is null then return jsonb_build_object('ok', false, 'error', 'nama_wajib'); end if;
  if p_attendance not in ('hadir','tidak','ragu') then return jsonb_build_object('ok', false, 'error', 'kehadiran_tidak_valid'); end if;
  px := case when p_attendance = 'tidak' then 0 else greatest(1, least(coalesce(p_pax, 1), 10)) end;
  if (select count(*) from public.rsvps where invitation_id = i.id) >= 3000
     and not exists (select 1 from public.rsvps where invitation_id = i.id and lower(guest_name) = lower(nm)) then
    return jsonb_build_object('ok', false, 'error', 'batas_tercapai');
  end if;
  insert into public.rsvps (invitation_id, guest_name, attendance, pax, note) values (i.id, nm, p_attendance, px, nt)
  on conflict (invitation_id, lower(guest_name)) do update set attendance = excluded.attendance, pax = excluded.pax, note = excluded.note, updated_at = now();
  select coalesce(sum(pax), 0) into tot from public.rsvps where invitation_id = i.id and attendance = 'hadir';
  update public.invitations set guest_count = tot where id = i.id;
  return jsonb_build_object('ok', true, 'attendance', p_attendance, 'pax', px);
end $$;

----------------------------------------------------------------------------- 5. Ucapan tamu
create or replace function public.submit_wish(p_slug text, p_name text, p_message text, p_attendance text default null) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare i public.invitations; nm text := public._clean(p_name, 60); msg text := public._clean(p_message, 500); w public.wishes;
begin
  i := public._public_inv(p_slug);
  if i.id is null then return jsonb_build_object('ok', false, 'error', 'tidak_tersedia'); end if;
  if coalesce((i.content #>> '{features,guestbook}')::boolean, true) is not true then return jsonb_build_object('ok', false, 'error', 'fitur_nonaktif'); end if;
  if nm is null or msg is null then return jsonb_build_object('ok', false, 'error', 'isi_wajib'); end if;
  -- rem spam sederhana: ucapan identik, banjir dari satu nama, dan batas total
  if exists (select 1 from public.wishes where invitation_id = i.id and lower(guest_name) = lower(nm) and message = msg) then
    return jsonb_build_object('ok', false, 'error', 'duplikat');
  end if;
  if (select count(*) from public.wishes where invitation_id = i.id and lower(guest_name) = lower(nm) and created_at > now() - interval '1 minute') >= 2 then
    return jsonb_build_object('ok', false, 'error', 'terlalu_cepat');
  end if;
  if (select count(*) from public.wishes where invitation_id = i.id) >= 3000 then return jsonb_build_object('ok', false, 'error', 'batas_tercapai'); end if;
  insert into public.wishes (invitation_id, guest_name, message, attendance)
  values (i.id, nm, msg, case when p_attendance in ('hadir','tidak','ragu') then p_attendance end) returning * into w;
  update public.invitations set wish_count = (select count(*) from public.wishes where invitation_id = i.id and not hidden) where id = i.id;
  return jsonb_build_object('ok', true, 'wish', jsonb_build_object('id', w.id, 'name', w.guest_name, 'message', w.message, 'attendance', w.attendance, 'created_at', w.created_at));
end $$;

create or replace function public.list_wishes(p_slug text, p_before timestamptz default null, p_limit int default 20) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare i public.invitations; rows jsonb; total int;
begin
  i := public._public_inv(p_slug);
  if i.id is null then return jsonb_build_object('error', 'tidak_tersedia'); end if;
  select count(*) into total from public.wishes where invitation_id = i.id and not hidden;
  select coalesce(jsonb_agg(x order by x.created_at desc), '[]'::jsonb) into rows from (
    select id, guest_name as name, message, attendance, created_at from public.wishes
     where invitation_id = i.id and not hidden and (p_before is null or created_at < p_before)
     order by created_at desc limit greatest(1, least(coalesce(p_limit, 20), 50))
  ) x;
  return jsonb_build_object('total', total, 'items', rows);
end $$;

----------------------------------------------------------------------------- 6. Moderasi ucapan oleh pemilik
create or replace function public.set_wish_hidden(p_id uuid, p_hidden boolean) returns boolean
language plpgsql volatile security definer set search_path = public as $$
declare inv uuid;
begin
  if auth.uid() is null then raise exception 'unauthorized' using errcode = '28000'; end if;
  select w.invitation_id into inv from public.wishes w join public.invitations i on i.id = w.invitation_id where w.id = p_id and i.user_id = auth.uid();
  if inv is null then raise exception 'tidak_ditemukan'; end if;
  update public.wishes set hidden = coalesce(p_hidden, false) where id = p_id;
  update public.invitations set wish_count = (select count(*) from public.wishes where invitation_id = inv and not hidden) where id = inv;
  return true;
end $$;

----------------------------------------------------------------------------- 7. save_invitation: versi asset-schema.sql + validasi foto mempelai & love story
create or replace function public.save_invitation(p_id uuid, p_title text, p_event_date date, p_content jsonb) returns timestamptz
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); r public.invitations; u text; pref text; g jsonb; caps jsonb; iss text; sd text; v text; ok boolean; s jsonb;
begin
  if uid is null then raise exception 'unauthorized' using errcode = '28000'; end if;
  select * into r from public.invitations where id = p_id and user_id = uid for update;
  if not found then raise exception 'tidak_ditemukan'; end if;
  if r.status not in ('draft','aktif') or r.moderation = 'takedown' then raise exception 'tidak_dapat_diubah'; end if;
  if jsonb_typeof(p_content) <> 'object' or length(p_content::text) > 60000 then raise exception 'konten_tidak_valid'; end if;
  select capabilities into caps from public.templates where slug = r.template_id;
  iss := public.content_issue(r.package_type, coalesce(caps, '{}'::jsonb), p_content);
  if iss is not null then raise exception '%', iss; end if;
  pref := '%/storage/v1/object/public/invitation-media/' || uid::text || '/%';
  foreach u in array array[coalesce(p_content #>> '{photos,cover}', ''), coalesce(p_content #>> '{photos,groom}', ''), coalesce(p_content #>> '{photos,bride}', '')] loop
    if u <> '' and u not like pref then raise exception 'foto_tidak_valid'; end if;
  end loop;
  g := p_content #> '{photos,gallery}';
  if g is not null and g <> 'null'::jsonb then
    if jsonb_typeof(g) <> 'array' or jsonb_array_length(g) > 40 then raise exception 'foto_tidak_valid'; end if;
    for u in select jsonb_array_elements_text(g) loop
      if u not like pref then raise exception 'foto_tidak_valid'; end if;
    end loop;
  end if;
  foreach sd in array array['events','story','accounts'] loop
    g := p_content -> sd;
    if g is not null and g <> 'null'::jsonb and (jsonb_typeof(g) <> 'array' or jsonb_array_length(g) > 12) then raise exception 'konten_tidak_valid'; end if;
  end loop;
  if jsonb_typeof(p_content -> 'story') = 'array' then
    for s in select jsonb_array_elements(p_content -> 'story') loop
      u := coalesce(s ->> 'photo', '');
      if u <> '' and u not like pref then raise exception 'foto_tidak_valid'; end if;
    end loop;
  end if;
  if p_content ? 'avatars' then
    if jsonb_typeof(p_content->'avatars') <> 'object' then raise exception 'avatar_tidak_valid'; end if;
    foreach sd in array array['groom','bride'] loop
      v := coalesce(p_content #>> array['avatars', sd], '');
      if v <> '' and v is distinct from coalesce(r.content #>> array['avatars', sd], '') then
        select exists (select 1 from jsonb_array_elements(public.template_avatar_options(r.template_id, r.theme_key)) o where o->>'slot' = v and o->>'side' = sd) into ok;
        if not ok then raise exception 'avatar_tidak_valid'; end if;
      end if;
    end loop;
  end if;
  update public.invitations
     set title = left(coalesce(nullif(trim(p_title), ''), title), 160), event_date = p_event_date, content = p_content, updated_at = now()
   where id = p_id;
  return now();
end $$;

----------------------------------------------------------------------------- 8. Hak eksekusi
revoke execute on function public._clean(text,int) from public;
grant execute on function public._clean(text,int) to anon, authenticated;
revoke execute on function public.submit_rsvp(text,text,text,int,text), public.submit_wish(text,text,text,text), public.list_wishes(text,timestamptz,int) from public;
grant execute on function public.submit_rsvp(text,text,text,int,text), public.submit_wish(text,text,text,text), public.list_wishes(text,timestamptz,int) to anon, authenticated;
revoke execute on function public.set_wish_hidden(uuid,boolean) from public, anon;
grant execute on function public.set_wish_hidden(uuid,boolean) to authenticated;
revoke execute on function public.save_invitation(uuid,text,date,jsonb) from public, anon;
grant execute on function public.save_invitation(uuid,text,date,jsonb) to authenticated;
