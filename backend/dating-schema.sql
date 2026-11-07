-- NusaMora: Cari Teman Kondangan (P0). Jalankan SETELAH security-schema.sql dan security-mfa.sql (butuh rl_hit, has_perm, audit_logs, invitations, plans, assets).
-- Prinsip: semua operasi sensitif lewat fungsi RPC security definer yang membaca auth.uid() dari JWT (TIDAK menerima user_id dari klien).
-- Klien tidak boleh insert/update langsung ke like, match, pesan, laporan. Status "single" adalah DEKLARASI pengguna, bukan terverifikasi.
-- Idempoten: aman dijalankan ulang. Tidak ada data contoh.

----------------------------------------------------------------------------- 1. Tabel
create table if not exists public.dating_profiles (
  id          uuid primary key default gen_random_uuid(),            -- id buram untuk klien (bukan auth.users.id)
  user_id     uuid not null unique references auth.users(id) on delete cascade,
  nickname    text not null check (char_length(nickname) between 2 and 30),
  birth_date  date not null check (birth_date <= (current_date - interval '18 years')::date and birth_date >= date '1900-01-01'),
  gender      text not null check (gender in ('pria','wanita','lainnya','tidak_menyebut')),
  city        text not null check (char_length(city) between 2 and 60),
  avatar_id   uuid references public.assets(id) on delete set null,
  bio         text not null default '' check (char_length(bio) <= 300),
  interests   text[] not null default '{}' check (cardinality(interests) <= 10),
  education   text check (education is null or char_length(education) <= 60),
  occupation  text check (occupation is null or char_length(occupation) <= 60),
  intent      text not null check (intent in ('teman_baru','teman_dekat','hubungan_serius')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists dating_profiles_city_idx on public.dating_profiles (lower(city));
create index if not exists dating_profiles_interests_idx on public.dating_profiles using gin (interests);

create table if not exists public.dating_consents (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  version          text not null,
  age_confirmed    boolean not null,
  single_declared  boolean not null,
  privacy_accepted boolean not null,
  ip_hash          text check (ip_hash is null or char_length(ip_hash) <= 128),
  accepted_at      timestamptz not null default now(),
  withdrawn_at     timestamptz
);
create index if not exists dating_consents_user_idx on public.dating_consents (user_id, accepted_at desc);

create table if not exists public.dating_event_settings (
  invitation_id      uuid primary key references public.invitations(id) on delete cascade,
  enabled            boolean not null default false,                   -- default MATI: pemilik undangan opt-in
  like_limit_per_day int not null default 30 check (like_limit_per_day between 1 and 500),
  profile_ttl_days   int not null default 7 check (profile_ttl_days between 1 and 90),
  updated_by         uuid references auth.users(id) on delete set null,
  updated_at         timestamptz not null default now()
);

create table if not exists public.dating_event_participants (
  id            uuid primary key default gen_random_uuid(),
  invitation_id uuid not null references public.invitations(id) on delete cascade,
  profile_id    uuid not null references public.dating_profiles(id) on delete cascade,
  status        text not null default 'aktif' check (status in ('aktif','jeda','sembunyi','ditangguhkan','keluar')),
  joined_at     timestamptz not null default now(),
  expires_at    timestamptz not null,
  unique (invitation_id, profile_id)
);
create index if not exists dating_participants_event_idx on public.dating_event_participants (invitation_id, status);

create table if not exists public.dating_likes (
  id            uuid primary key default gen_random_uuid(),
  invitation_id uuid not null references public.invitations(id) on delete cascade,
  from_profile  uuid not null references public.dating_profiles(id) on delete cascade,
  to_profile    uuid not null references public.dating_profiles(id) on delete cascade,
  kind          text not null check (kind in ('like','pass')),
  created_at    timestamptz not null default now(),
  unique (invitation_id, from_profile, to_profile),
  check (from_profile <> to_profile)
);
create index if not exists dating_likes_to_idx on public.dating_likes (invitation_id, to_profile, kind);
create index if not exists dating_likes_from_day_idx on public.dating_likes (invitation_id, from_profile, created_at desc);

create table if not exists public.dating_matches (
  id            uuid primary key default gen_random_uuid(),
  invitation_id uuid not null references public.invitations(id) on delete cascade,
  profile_a     uuid not null references public.dating_profiles(id) on delete cascade,
  profile_b     uuid not null references public.dating_profiles(id) on delete cascade,
  status        text not null default 'aktif' check (status in ('aktif','unmatch','diblokir')),
  matched_at    timestamptz not null default now(),
  unmatched_by  uuid references public.dating_profiles(id) on delete set null,
  unique (invitation_id, profile_a, profile_b),
  check (profile_a < profile_b)                                         -- pasangan berurutan: tidak bisa ada match ganda A-B dan B-A
);
create index if not exists dating_matches_a_idx on public.dating_matches (profile_a);
create index if not exists dating_matches_b_idx on public.dating_matches (profile_b);

create table if not exists public.dating_conversations (
  id              uuid primary key default gen_random_uuid(),
  match_id        uuid not null unique references public.dating_matches(id) on delete cascade,
  last_message_at timestamptz,
  created_at      timestamptz not null default now()
);

create table if not exists public.dating_messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.dating_conversations(id) on delete cascade,
  sender_profile  uuid references public.dating_profiles(id) on delete set null,     -- null = pesan sistem
  kind            text not null default 'user' check (kind in ('user','system')),
  body            text not null check (char_length(body) between 1 and 1000),        -- teks polos; klien wajib merender sebagai teks
  created_at      timestamptz not null default now(),
  read_at         timestamptz
);
create index if not exists dating_messages_conv_idx on public.dating_messages (conversation_id, created_at);

create table if not exists public.dating_blocks (
  blocker    uuid not null references public.dating_profiles(id) on delete cascade,
  blocked    uuid not null references public.dating_profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker, blocked),
  check (blocker <> blocked)
);
create index if not exists dating_blocks_blocked_idx on public.dating_blocks (blocked);

create table if not exists public.dating_reports (
  id            uuid primary key default gen_random_uuid(),
  invitation_id uuid references public.invitations(id) on delete set null,
  reporter      uuid references public.dating_profiles(id) on delete set null,     -- laporan tetap ada walau profil dihapus (bukti keamanan)
  reported      uuid references public.dating_profiles(id) on delete set null,
  reason        text not null check (reason in ('pelecehan','penipuan','konten_tidak_pantas','akun_palsu','di_bawah_umur','spam','lainnya')),
  detail        text check (detail is null or char_length(detail) <= 500),
  status        text not null default 'baru' check (status in ('baru','ditinjau','peringatan','ditangguhkan','ditolak','selesai')),
  evidence      jsonb not null default '[]'::jsonb,                                  -- cuplikan pesan DIBEKUKAN saat lapor (admin tidak membaca seluruh chat)
  reviewer      uuid references auth.users(id) on delete set null,
  review_note   text check (review_note is null or char_length(review_note) <= 500),
  created_at    timestamptz not null default now(),
  resolved_at   timestamptz
);
create index if not exists dating_reports_status_idx on public.dating_reports (status, created_at desc);
create unique index if not exists dating_reports_open_uq on public.dating_reports (reporter, reported) where status in ('baru','ditinjau');

create table if not exists public.dating_notifications (                          -- disiapkan untuk P1 (belum diisi oleh P0)
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references public.dating_profiles(id) on delete cascade,
  kind        text not null check (char_length(kind) <= 40),
  data        jsonb not null default '{}'::jsonb,
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists dating_notifications_profile_idx on public.dating_notifications (profile_id, created_at desc);

----------------------------------------------------------------------------- 2. Hak akses & RLS (klien hanya boleh MEMBACA data miliknya; semua tulis lewat RPC)
do $$ declare t text; begin
  foreach t in array array['dating_profiles','dating_consents','dating_event_settings','dating_event_participants','dating_likes','dating_matches','dating_conversations','dating_messages','dating_blocks','dating_reports','dating_notifications'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
  end loop;
end $$;

-- id profil milik pemanggil (dipakai policy & RPC); tidak menerima parameter -> tidak bisa dimanipulasi
create or replace function public.dating_my_profile() returns uuid language sql stable security definer set search_path = public as $$
  select id from public.dating_profiles where user_id = auth.uid()
$$;
revoke all on function public.dating_my_profile() from public, anon;
grant execute on function public.dating_my_profile() to authenticated;

grant select on public.dating_profiles, public.dating_consents, public.dating_event_participants, public.dating_matches,
                public.dating_conversations, public.dating_messages, public.dating_blocks, public.dating_reports, public.dating_notifications to authenticated;
grant update (read_at) on public.dating_notifications to authenticated;

drop policy if exists "dating profil sendiri" on public.dating_profiles;
create policy "dating profil sendiri" on public.dating_profiles for select to authenticated using (user_id = auth.uid());
drop policy if exists "dating consent sendiri" on public.dating_consents;
create policy "dating consent sendiri" on public.dating_consents for select to authenticated using (user_id = auth.uid());
drop policy if exists "dating partisipasi sendiri" on public.dating_event_participants;
create policy "dating partisipasi sendiri" on public.dating_event_participants for select to authenticated using (profile_id = public.dating_my_profile());
drop policy if exists "dating match anggota" on public.dating_matches;
create policy "dating match anggota" on public.dating_matches for select to authenticated using (public.dating_my_profile() in (profile_a, profile_b));
drop policy if exists "dating percakapan anggota" on public.dating_conversations;
create policy "dating percakapan anggota" on public.dating_conversations for select to authenticated
  using (exists (select 1 from public.dating_matches m where m.id = match_id and public.dating_my_profile() in (m.profile_a, m.profile_b)));
drop policy if exists "dating pesan anggota" on public.dating_messages;                 -- dipakai juga oleh Realtime (postgres_changes menghormati RLS)
create policy "dating pesan anggota" on public.dating_messages for select to authenticated
  using (exists (select 1 from public.dating_conversations c join public.dating_matches m on m.id = c.match_id
                 where c.id = conversation_id and public.dating_my_profile() in (m.profile_a, m.profile_b)));
drop policy if exists "dating blokir sendiri" on public.dating_blocks;
create policy "dating blokir sendiri" on public.dating_blocks for select to authenticated using (blocker = public.dating_my_profile());
drop policy if exists "dating laporan sendiri" on public.dating_reports;
create policy "dating laporan sendiri" on public.dating_reports for select to authenticated using (reporter = public.dating_my_profile());
drop policy if exists "dating notifikasi sendiri" on public.dating_notifications;
create policy "dating notifikasi sendiri" on public.dating_notifications for select to authenticated using (profile_id = public.dating_my_profile());
drop policy if exists "dating notifikasi tandai baca" on public.dating_notifications;
create policy "dating notifikasi tandai baca" on public.dating_notifications for update to authenticated using (profile_id = public.dating_my_profile()) with check (profile_id = public.dating_my_profile());
-- dating_likes & dating_event_settings: TANPA policy untuk klien (hanya RPC) -> RLS menolak semua akses langsung.

-- Realtime pesan (hanya bila publikasi Supabase ada; di Postgres biasa dilewati)
do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'dating_messages') then
    alter publication supabase_realtime add table public.dating_messages;
  end if;
end $$;

----------------------------------------------------------------------------- 3. Helper internal (tidak diekspos ke klien)
create or replace function public.dating_consent_version() returns text language sql immutable as $$ select 'v1'::text $$;
revoke all on function public.dating_consent_version() from public, anon;
grant execute on function public.dating_consent_version() to authenticated;

create or replace function public._dating_uid() returns uuid language plpgsql stable as $$
declare u uuid := auth.uid();
begin if u is null then raise exception 'unauthorized' using errcode = '28000'; end if; return u; end $$;

create or replace function public._dating_age(d date) returns int language sql immutable as $$ select extract(year from age(current_date, d))::int $$;

create or replace function public._dating_clean(t text, maxlen int) returns text language sql immutable as $$
  select left(btrim(regexp_replace(coalesce(t, ''), '[\x00-\x08\x0b-\x1f\x7f]', '', 'g')), maxlen)
$$;

create or replace function public._dating_rl(k text, lim int, win int) returns void language plpgsql security definer set search_path = public as $$
declare r jsonb;
begin r := public.rl_hit(k, lim, win, 'dating_rate_limited');
  if not coalesce((r->>'allowed')::boolean, true) then raise exception 'terlalu_banyak_permintaan' using hint = coalesce(r->>'retry_after', '60'); end if;
end $$;

-- persetujuan terbaru yang masih berlaku untuk versi saat ini
create or replace function public._dating_consent_ok(u uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.dating_consents c where c.user_id = u and c.version = public.dating_consent_version()
                 and c.age_confirmed and c.single_declared and c.privacy_accepted and c.withdrawn_at is null)
$$;

-- acara layak: undangan aktif, belum kedaluwarsa, tidak diturunkan, paket Live Guest, fitur dinyalakan pemilik
create or replace function public._dating_event_ok(inv uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.invitations i
      join public.plans p on p.id = i.plan_id and p.allow_live_guest
      join public.dating_event_settings s on s.invitation_id = i.id and s.enabled
     where i.id = inv and i.status = 'aktif' and (i.expires_at is null or i.expires_at > now()) and i.moderation <> 'takedown')
$$;

create or replace function public._dating_blocked(a uuid, b uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.dating_blocks where (blocker = a and blocked = b) or (blocker = b and blocked = a))
$$;

-- peserta aktif (belum kedaluwarsa) pada acara
create or replace function public._dating_active(inv uuid, pid uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.dating_event_participants x where x.invitation_id = inv and x.profile_id = pid and x.status = 'aktif' and x.expires_at > now())
$$;

----------------------------------------------------------------------------- 4. Persetujuan, profil, partisipasi
create or replace function public.dating_accept_consent(p_age boolean, p_single boolean, p_privacy boolean, p_ip_hash text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare u uuid := public._dating_uid();
begin
  if not (coalesce(p_age, false) and coalesce(p_single, false) and coalesce(p_privacy, false)) then raise exception 'persetujuan_lengkap_wajib'; end if;
  perform public._dating_rl('dating-consent:' || u, 10, 3600);
  insert into public.dating_consents (user_id, version, age_confirmed, single_declared, privacy_accepted, ip_hash)
  values (u, public.dating_consent_version(), true, true, true, left(p_ip_hash, 128));
  return jsonb_build_object('ok', true, 'version', public.dating_consent_version());
end $$;

create or replace function public.dating_withdraw_consent() returns jsonb language plpgsql security definer set search_path = public as $$
declare u uuid := public._dating_uid();
begin
  update public.dating_consents set withdrawn_at = now() where user_id = u and withdrawn_at is null;
  update public.dating_event_participants set status = 'keluar' where profile_id = public.dating_my_profile();
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.dating_upsert_profile(p_nickname text, p_birth_date date, p_gender text, p_city text, p_avatar uuid, p_bio text,
  p_interests text[], p_education text, p_occupation text, p_intent text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare u uuid := public._dating_uid(); nick text := public._dating_clean(p_nickname, 30); cty text := public._dating_clean(p_city, 60);
        ints text[]; pid uuid;
begin
  if not public._dating_consent_ok(u) then raise exception 'persetujuan_wajib'; end if;
  perform public._dating_rl('dating-profile:' || u, 20, 3600);
  if p_birth_date is null then raise exception 'tanggal_lahir_wajib'; end if;
  if public._dating_age(p_birth_date) < 18 then raise exception 'usia_minimal_18'; end if;                          -- validasi usia di SERVER
  if p_birth_date < date '1900-01-01' then raise exception 'tanggal_lahir_tidak_valid'; end if;
  if char_length(nick) < 2 then raise exception 'nama_panggilan_tidak_valid'; end if;
  if char_length(cty) < 2 then raise exception 'kota_tidak_valid'; end if;
  if p_gender not in ('pria','wanita','lainnya','tidak_menyebut') then raise exception 'gender_tidak_valid'; end if;
  if p_intent not in ('teman_baru','teman_dekat','hubungan_serius') then raise exception 'tujuan_tidak_valid'; end if;
  select coalesce(array_agg(x), '{}') into ints from (select distinct left(btrim(regexp_replace(i, '[\x00-\x1f\x7f]', '', 'g')), 30) x
                                                       from unnest(coalesce(p_interests, '{}')) i where btrim(i) <> '' limit 10) q;
  if p_avatar is not null and not exists (select 1 from public.assets a join public.asset_categories c on c.id = a.category_id
        where a.id = p_avatar and c.slug = 'guest-avatar' and a.status = 'active' and a.deleted_at is null) then raise exception 'avatar_tidak_valid'; end if;
  insert into public.dating_profiles (user_id, nickname, birth_date, gender, city, avatar_id, bio, interests, education, occupation, intent)
  values (u, nick, p_birth_date, p_gender, cty, p_avatar, public._dating_clean(p_bio, 300), ints, nullif(public._dating_clean(p_education, 60), ''), nullif(public._dating_clean(p_occupation, 60), ''), p_intent)
  on conflict (user_id) do update set nickname = excluded.nickname, birth_date = excluded.birth_date, gender = excluded.gender, city = excluded.city,
    avatar_id = excluded.avatar_id, bio = excluded.bio, interests = excluded.interests, education = excluded.education, occupation = excluded.occupation,
    intent = excluded.intent, updated_at = now()
  returning id into pid;
  return jsonb_build_object('ok', true, 'profile_id', pid);
end $$;

-- pemilik undangan menyalakan/mematikan fitur untuk acaranya (paket Live Guest wajib); admin dapat mematikan lewat dating_admin_set_event
create or replace function public.dating_owner_set_event(p_inv uuid, p_enabled boolean, p_like_limit int default 30, p_ttl_days int default 7) returns jsonb
language plpgsql security definer set search_path = public as $$
declare u uuid := public._dating_uid();
begin
  if not exists (select 1 from public.invitations i join public.plans p on p.id = i.plan_id and p.allow_live_guest where i.id = p_inv and i.user_id = u) then raise exception 'tidak_diizinkan'; end if;
  if exists (select 1 from public.dating_event_settings where invitation_id = p_inv and enabled = false and updated_by is distinct from u) and coalesce(p_enabled, false) then
    raise exception 'dinonaktifkan_admin';                                                                     -- penonaktifan oleh admin tidak bisa dibatalkan pemilik
  end if;
  insert into public.dating_event_settings (invitation_id, enabled, like_limit_per_day, profile_ttl_days, updated_by)
  values (p_inv, coalesce(p_enabled, false), greatest(1, least(500, coalesce(p_like_limit, 30))), greatest(1, least(90, coalesce(p_ttl_days, 7))), u)
  on conflict (invitation_id) do update set enabled = excluded.enabled, like_limit_per_day = excluded.like_limit_per_day, profile_ttl_days = excluded.profile_ttl_days, updated_by = u, updated_at = now();
  return jsonb_build_object('ok', true);
end $$;

-- statistik landing: boleh dilihat tamu (tanpa data pribadi)
create or replace function public.dating_stats(p_inv uuid) returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('available', public._dating_event_ok(p_inv),
    'active_participants', case when public._dating_event_ok(p_inv) then (select count(*) from public.dating_event_participants x where x.invitation_id = p_inv and x.status = 'aktif' and x.expires_at > now()) else 0 end)
$$;

create or replace function public.dating_join(p_inv uuid) returns jsonb language plpgsql security definer set search_path = public as $$
declare u uuid := public._dating_uid(); pid uuid := public.dating_my_profile(); ttl int; ev date; exp timestamptz;
begin
  perform public._dating_rl('dating-join:' || u, 20, 3600);
  if not public._dating_consent_ok(u) then raise exception 'persetujuan_wajib'; end if;
  if pid is null then raise exception 'profil_wajib'; end if;
  if (select public._dating_age(birth_date) from public.dating_profiles where id = pid) < 18 then raise exception 'usia_minimal_18'; end if;
  if not public._dating_event_ok(p_inv) then raise exception 'acara_tidak_tersedia'; end if;
  if exists (select 1 from public.dating_event_participants where invitation_id = p_inv and profile_id = pid and status = 'ditangguhkan') then raise exception 'akses_ditangguhkan'; end if;
  select s.profile_ttl_days, i.event_date into ttl, ev from public.dating_event_settings s join public.invitations i on i.id = s.invitation_id where s.invitation_id = p_inv;
  exp := (coalesce(ev, current_date) + ttl)::timestamptz;
  if exp < now() then exp := now() + make_interval(days => ttl); end if;
  insert into public.dating_event_participants (invitation_id, profile_id, status, expires_at) values (p_inv, pid, 'aktif', exp)
  on conflict (invitation_id, profile_id) do update set status = 'aktif', expires_at = excluded.expires_at where public.dating_event_participants.status <> 'ditangguhkan';
  return jsonb_build_object('ok', true, 'expires_at', exp);
end $$;

create or replace function public.dating_set_status(p_inv uuid, p_status text) returns jsonb language plpgsql security definer set search_path = public as $$
declare pid uuid := public.dating_my_profile(); n int;
begin
  perform public._dating_uid();
  if p_status not in ('aktif','jeda','sembunyi','keluar') then raise exception 'status_tidak_valid'; end if;     -- 'ditangguhkan' hanya oleh moderasi
  if p_status = 'aktif' and not (public._dating_consent_ok(auth.uid()) and public._dating_event_ok(p_inv)) then raise exception 'acara_tidak_tersedia'; end if;
  update public.dating_event_participants set status = p_status where invitation_id = p_inv and profile_id = pid and status <> 'ditangguhkan';
  get diagnostics n = row_count; if n = 0 then raise exception 'tidak_ditemukan'; end if;
  return jsonb_build_object('ok', true, 'status', p_status);
end $$;

-- hapus profil & seluruh data turunannya (like, match, pesan, blokir, partisipasi); laporan tetap ada tanpa tautan profil
create or replace function public.dating_delete_my_profile() returns jsonb language plpgsql security definer set search_path = public as $$
declare u uuid := public._dating_uid();
begin
  delete from public.dating_profiles where user_id = u;
  update public.dating_consents set withdrawn_at = now() where user_id = u and withdrawn_at is null;
  return jsonb_build_object('ok', true);
end $$;

----------------------------------------------------------------------------- 5. Discover (kolom aman saja; tanpa tanggal lahir/email/telepon/auth id)
create or replace function public.dating_discover(p_inv uuid, p_filter jsonb default '{}'::jsonb, p_limit int default 20, p_offset int default 0)
returns table (profile_id uuid, nickname text, age int, gender text, city text, bio text, interests text[], education text, occupation text, intent text, avatar_url text)
language plpgsql security definer set search_path = public as $$
declare u uuid := public._dating_uid(); me uuid := public.dating_my_profile(); lim int := greatest(1, least(20, coalesce(p_limit, 20))); off int := greatest(0, least(200, coalesce(p_offset, 0)));
        f jsonb := coalesce(p_filter, '{}'::jsonb); g text[]; amin int; amax int; cty text; hob text[]; it text[];
begin
  if me is null or not public._dating_consent_ok(u) then raise exception 'persetujuan_wajib'; end if;
  if not public._dating_active(p_inv, me) then raise exception 'bukan_peserta'; end if;
  if not public._dating_event_ok(p_inv) then raise exception 'acara_tidak_tersedia'; end if;
  perform public._dating_rl('dating-discover:' || u, 60, 600);
  g := case when jsonb_typeof(f->'gender') = 'array' then array(select jsonb_array_elements_text(f->'gender')) end;
  it := case when jsonb_typeof(f->'intent') = 'array' then array(select jsonb_array_elements_text(f->'intent')) end;
  hob := case when jsonb_typeof(f->'interests') = 'array' then array(select lower(left(x, 30)) from jsonb_array_elements_text(f->'interests') x limit 10) end;
  amin := case when (f->>'age_min') ~ '^[0-9]{1,3}$' then (f->>'age_min')::int end;
  amax := case when (f->>'age_max') ~ '^[0-9]{1,3}$' then (f->>'age_max')::int end;
  cty := nullif(lower(left(btrim(coalesce(f->>'city', '')), 60)), '');
  return query
    select p.id, p.nickname, public._dating_age(p.birth_date), p.gender, p.city, p.bio, p.interests, p.education, p.occupation, p.intent, coalesce(a.thumbnail_url, a.file_url)
      from public.dating_event_participants x
      join public.dating_profiles p on p.id = x.profile_id
      left join public.assets a on a.id = p.avatar_id and a.status = 'active' and a.deleted_at is null
     where x.invitation_id = p_inv and x.status = 'aktif' and x.expires_at > now() and p.id <> me
       and public._dating_consent_ok(p.user_id)
       and not public._dating_blocked(me, p.id)
       and not exists (select 1 from public.dating_likes l where l.invitation_id = p_inv and l.from_profile = me and l.to_profile = p.id)
       and not exists (select 1 from public.dating_matches m where m.invitation_id = p_inv and m.profile_a = least(me, p.id) and m.profile_b = greatest(me, p.id))
       and (g is null or p.gender = any (g)) and (it is null or p.intent = any (it))
       and (amin is null or public._dating_age(p.birth_date) >= amin) and (amax is null or public._dating_age(p.birth_date) <= amax)
       and (cty is null or lower(p.city) = cty)
       and (hob is null or exists (select 1 from unnest(p.interests) i where lower(i) = any (hob)))
     order by md5(me::text || p.id::text), p.id
     limit lim offset off;
end $$;

----------------------------------------------------------------------------- 6. Like / pass / mutual match (atomik, tanpa duplikat)
create or replace function public.dating_like(p_inv uuid, p_to uuid) returns jsonb language plpgsql security definer set search_path = public as $$
declare u uuid := public._dating_uid(); me uuid := public.dating_my_profile(); a uuid; b uuid; lim int; used int; cur text; mid uuid; cid uuid; made boolean := false;
begin
  if me is null or not public._dating_consent_ok(u) then raise exception 'persetujuan_wajib'; end if;
  if p_to is null or p_to = me then raise exception 'target_tidak_valid'; end if;
  if not public._dating_event_ok(p_inv) then raise exception 'acara_tidak_tersedia'; end if;
  if not public._dating_active(p_inv, me) then raise exception 'bukan_peserta'; end if;
  if not public._dating_active(p_inv, p_to) or public._dating_blocked(me, p_to) then raise exception 'target_tidak_tersedia'; end if;
  perform public._dating_rl('dating-like:' || u, 60, 600);
  a := least(me, p_to); b := greatest(me, p_to);
  perform pg_advisory_xact_lock(hashtextextended(p_inv::text || a::text || b::text, 0));                      -- cegah balapan: dua like saling-silang tidak boleh sama-sama melewatkan match
  select kind into cur from public.dating_likes where invitation_id = p_inv and from_profile = me and to_profile = p_to;
  if cur = 'like' then
    select id into mid from public.dating_matches where invitation_id = p_inv and profile_a = a and profile_b = b;
    return jsonb_build_object('ok', true, 'duplicate', true, 'matched', mid is not null, 'match_id', mid);   -- like ganda: idempoten, tidak menghitung batas lagi
  end if;
  select like_limit_per_day into lim from public.dating_event_settings where invitation_id = p_inv;
  select count(*) into used from public.dating_likes where invitation_id = p_inv and from_profile = me and kind = 'like' and created_at > now() - interval '24 hours';
  if used >= lim then raise exception 'batas_like_harian'; end if;
  insert into public.dating_likes (invitation_id, from_profile, to_profile, kind) values (p_inv, me, p_to, 'like')
  on conflict (invitation_id, from_profile, to_profile) do update set kind = 'like', created_at = now();
  if exists (select 1 from public.dating_likes where invitation_id = p_inv and from_profile = p_to and to_profile = me and kind = 'like') then
    select id, status into mid, cur from public.dating_matches where invitation_id = p_inv and profile_a = a and profile_b = b;
    if mid is null then
      insert into public.dating_matches (invitation_id, profile_a, profile_b) values (p_inv, a, b) returning id into mid; made := true;
      insert into public.dating_conversations (match_id) values (mid) returning id into cid;
      insert into public.dating_messages (conversation_id, sender_profile, kind, body) values (cid, null, 'system', 'Kalian saling suka. Sapa dengan ramah dan sopan ya 💗');
      update public.dating_conversations set last_message_at = now() where id = cid;
    elsif cur <> 'aktif' then
      return jsonb_build_object('ok', true, 'matched', false);                                                -- pasangan yang sudah unmatch/diblokir tidak dicocokkan ulang
    end if;
    select id into cid from public.dating_conversations where match_id = mid;
    return jsonb_build_object('ok', true, 'matched', true, 'new_match', made, 'match_id', mid, 'conversation_id', cid);
  end if;
  return jsonb_build_object('ok', true, 'matched', false);
end $$;

create or replace function public.dating_pass(p_inv uuid, p_to uuid) returns jsonb language plpgsql security definer set search_path = public as $$
declare u uuid := public._dating_uid(); me uuid := public.dating_my_profile();
begin
  if me is null or not public._dating_consent_ok(u) then raise exception 'persetujuan_wajib'; end if;
  if p_to is null or p_to = me then raise exception 'target_tidak_valid'; end if;
  if not public._dating_active(p_inv, me) or not public._dating_active(p_inv, p_to) then raise exception 'bukan_peserta'; end if;
  perform public._dating_rl('dating-like:' || u, 60, 600);
  insert into public.dating_likes (invitation_id, from_profile, to_profile, kind) values (p_inv, me, p_to, 'pass') on conflict (invitation_id, from_profile, to_profile) do nothing;
  return jsonb_build_object('ok', true);
end $$;

----------------------------------------------------------------------------- 7. Daftar match & chat
create or replace function public.dating_my_matches() returns table (match_id uuid, conversation_id uuid, invitation_id uuid, other_profile uuid, nickname text, age int, avatar_url text,
  status text, matched_at timestamptz, last_body text, last_at timestamptz, last_mine boolean, unread int)
language plpgsql stable security definer set search_path = public as $$
declare me uuid := public.dating_my_profile();
begin
  perform public._dating_uid();
  return query
    select m.id, c.id, m.invitation_id, o.id, o.nickname, public._dating_age(o.birth_date), coalesce(a.thumbnail_url, a.file_url), m.status, m.matched_at,
           lm.body, lm.created_at, (lm.sender_profile = me),
           (select count(*)::int from public.dating_messages x where x.conversation_id = c.id and x.read_at is null and x.kind = 'user' and x.sender_profile <> me)
      from public.dating_matches m
      join public.dating_conversations c on c.match_id = m.id
      join public.dating_profiles o on o.id = case when m.profile_a = me then m.profile_b else m.profile_a end
      left join public.assets a on a.id = o.avatar_id and a.deleted_at is null
      left join lateral (select body, created_at, sender_profile from public.dating_messages z where z.conversation_id = c.id order by created_at desc limit 1) lm on true
     where me in (m.profile_a, m.profile_b) and m.status = 'aktif' and not public._dating_blocked(me, o.id)
     order by coalesce(lm.created_at, m.matched_at) desc;
end $$;

create or replace function public.dating_send_message(p_conversation uuid, p_body text) returns jsonb language plpgsql security definer set search_path = public as $$
declare u uuid := public._dating_uid(); me uuid := public.dating_my_profile(); m public.dating_matches; txt text := btrim(regexp_replace(coalesce(p_body, ''), '[\x00-\x08\x0b-\x1f\x7f]', '', 'g')); mid uuid;
begin
  if me is null or not public._dating_consent_ok(u) then raise exception 'persetujuan_wajib'; end if;
  if char_length(txt) < 1 or char_length(txt) > 1000 then raise exception 'pesan_tidak_valid'; end if;
  select mm.* into m from public.dating_conversations c join public.dating_matches mm on mm.id = c.match_id where c.id = p_conversation;
  if not found or me not in (m.profile_a, m.profile_b) then raise exception 'tidak_ditemukan'; end if;               -- chat hanya untuk anggota match
  if m.status <> 'aktif' or public._dating_blocked(m.profile_a, m.profile_b) then raise exception 'percakapan_ditutup'; end if;
  if exists (select 1 from public.dating_event_participants x where x.invitation_id = m.invitation_id and x.profile_id in (m.profile_a, m.profile_b) and x.status in ('ditangguhkan','keluar')) then raise exception 'percakapan_ditutup'; end if;
  perform public._dating_rl('dating-msg:' || u, 30, 60);
  insert into public.dating_messages (conversation_id, sender_profile, kind, body) values (p_conversation, me, 'user', txt) returning id into mid;
  update public.dating_conversations set last_message_at = now() where id = p_conversation;
  return jsonb_build_object('ok', true, 'message_id', mid);
end $$;

create or replace function public.dating_mark_read(p_conversation uuid) returns jsonb language plpgsql security definer set search_path = public as $$
declare me uuid := public.dating_my_profile(); n int;
begin
  perform public._dating_uid();
  if not exists (select 1 from public.dating_conversations c join public.dating_matches m on m.id = c.match_id where c.id = p_conversation and me in (m.profile_a, m.profile_b)) then raise exception 'tidak_ditemukan'; end if;
  update public.dating_messages set read_at = now() where conversation_id = p_conversation and read_at is null and kind = 'user' and sender_profile <> me;
  get diagnostics n = row_count; return jsonb_build_object('ok', true, 'read', n);
end $$;

create or replace function public.dating_unmatch(p_match uuid) returns jsonb language plpgsql security definer set search_path = public as $$
declare me uuid := public.dating_my_profile(); n int;
begin
  perform public._dating_uid();
  update public.dating_matches set status = 'unmatch', unmatched_by = me where id = p_match and me in (profile_a, profile_b) and status = 'aktif';
  get diagnostics n = row_count; if n = 0 then raise exception 'tidak_ditemukan'; end if;
  return jsonb_build_object('ok', true);
end $$;

----------------------------------------------------------------------------- 8. Blokir & laporan
create or replace function public.dating_block(p_profile uuid) returns jsonb language plpgsql security definer set search_path = public as $$
declare me uuid := public.dating_my_profile();
begin
  perform public._dating_uid();
  if me is null or p_profile is null or p_profile = me or not exists (select 1 from public.dating_profiles where id = p_profile) then raise exception 'target_tidak_valid'; end if;
  perform public._dating_rl('dating-block:' || auth.uid(), 30, 3600);
  insert into public.dating_blocks (blocker, blocked) values (me, p_profile) on conflict do nothing;
  update public.dating_matches set status = 'diblokir' where status = 'aktif' and profile_a = least(me, p_profile) and profile_b = greatest(me, p_profile);   -- menghentikan interaksi dua arah
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.dating_unblock(p_profile uuid) returns jsonb language plpgsql security definer set search_path = public as $$
declare me uuid := public.dating_my_profile();
begin perform public._dating_uid(); delete from public.dating_blocks where blocker = me and blocked = p_profile; return jsonb_build_object('ok', true); end $$;

create or replace function public.dating_report(p_inv uuid, p_profile uuid, p_reason text, p_detail text default null, p_block boolean default true) returns jsonb
language plpgsql security definer set search_path = public as $$
declare me uuid := public.dating_my_profile(); mid uuid; cid uuid; ev jsonb := '[]'::jsonb; rid uuid;
begin
  perform public._dating_uid();
  if me is null or p_profile is null or p_profile = me then raise exception 'target_tidak_valid'; end if;
  if p_reason not in ('pelecehan','penipuan','konten_tidak_pantas','akun_palsu','di_bawah_umur','spam','lainnya') then raise exception 'alasan_tidak_valid'; end if;
  perform public._dating_rl('dating-report:' || auth.uid(), 10, 3600);
  -- hanya pihak yang berbagi acara (sama-sama peserta) atau pernah match yang boleh melapor
  if not (exists (select 1 from public.dating_event_participants x where x.invitation_id = p_inv and x.profile_id = me)
          and exists (select 1 from public.dating_event_participants y where y.invitation_id = p_inv and y.profile_id = p_profile)) then raise exception 'tidak_diizinkan'; end if;
  select m.id, c.id into mid, cid from public.dating_matches m join public.dating_conversations c on c.match_id = m.id
   where m.invitation_id = p_inv and m.profile_a = least(me, p_profile) and m.profile_b = greatest(me, p_profile);
  if cid is not null then                                                                                              -- bekukan 20 pesan terakhir sebagai bukti
    select coalesce(jsonb_agg(jsonb_build_object('dari', case when s.sender_profile = me then 'pelapor' when s.sender_profile is null then 'sistem' else 'terlapor' end, 'pesan', s.body, 'waktu', s.created_at) order by s.created_at), '[]'::jsonb)
      into ev from (select * from public.dating_messages where conversation_id = cid order by created_at desc limit 20) s;
  end if;
  insert into public.dating_reports (invitation_id, reporter, reported, reason, detail, evidence) values (p_inv, me, p_profile, p_reason, nullif(public._dating_clean(p_detail, 500), ''), ev)
  on conflict (reporter, reported) where status in ('baru','ditinjau') do nothing returning id into rid;
  if rid is null then return jsonb_build_object('ok', true, 'duplicate', true); end if;
  if coalesce(p_block, true) then perform public.dating_block(p_profile); end if;
  return jsonb_build_object('ok', true, 'report_id', rid);
end $$;

----------------------------------------------------------------------------- 9. Moderasi minimal (antrean & keputusan; UI admin lengkap di P1)
insert into public.role_permissions (role, permission) values ('admin','dating.read'),('admin','dating.write'),('support','dating.read'),('support','dating.write') on conflict do nothing;

create or replace function public.dating_admin_reports(p_status text default 'baru', p_limit int default 50) returns table (id uuid, invitation_id uuid, reason text, detail text, status text, evidence jsonb, created_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.has_perm('dating.read') then raise exception 'forbidden' using errcode = '42501'; end if;
  return query select r.id, r.invitation_id, r.reason, r.detail, r.status, r.evidence, r.created_at from public.dating_reports r
    where (p_status is null or r.status = p_status) order by r.created_at desc limit greatest(1, least(200, coalesce(p_limit, 50)));
end $$;

create or replace function public.dating_admin_resolve_report(p_report uuid, p_action text, p_note text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare r public.dating_reports; st text;
begin
  if not public.has_perm('dating.write') then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_action not in ('ditinjau','peringatan','tangguhkan','tolak','selesai') then raise exception 'aksi_tidak_valid'; end if;
  select * into r from public.dating_reports where id = p_report for update;
  if not found then raise exception 'tidak_ditemukan'; end if;
  st := case p_action when 'tangguhkan' then 'ditangguhkan' when 'tolak' then 'ditolak' else p_action end;
  if p_action = 'tangguhkan' and r.reported is not null then
    update public.dating_event_participants set status = 'ditangguhkan' where profile_id = r.reported;            -- semua acara; berlaku segera
    update public.dating_matches set status = 'diblokir' where status = 'aktif' and r.reported in (profile_a, profile_b);
  end if;
  update public.dating_reports set status = st, reviewer = auth.uid(), review_note = nullif(public._dating_clean(p_note, 500), ''),
         resolved_at = case when st = 'ditinjau' then null else now() end where id = p_report;
  insert into public.audit_logs (actor_id, action, table_name, row_id, summary) values (auth.uid(), 'dating.report.' || p_action, 'dating_reports', p_report::text, jsonb_build_object('status', st));
  return jsonb_build_object('ok', true, 'status', st);
end $$;

create or replace function public.dating_admin_set_event(p_inv uuid, p_enabled boolean) returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not public.has_perm('dating.write') then raise exception 'forbidden' using errcode = '42501'; end if;
  insert into public.dating_event_settings (invitation_id, enabled, updated_by) values (p_inv, coalesce(p_enabled, false), auth.uid())
  on conflict (invitation_id) do update set enabled = excluded.enabled, updated_by = auth.uid(), updated_at = now();
  insert into public.audit_logs (actor_id, action, table_name, row_id, summary) values (auth.uid(), 'dating.event.set', 'dating_event_settings', p_inv::text, jsonb_build_object('enabled', coalesce(p_enabled, false)));
  return jsonb_build_object('ok', true);
end $$;

----------------------------------------------------------------------------- 10. Hak eksekusi (default PUBLIC dicabut; hanya pengguna masuk, kecuali statistik landing)
do $$ declare f text; begin
  foreach f in array array[
    'dating_accept_consent(boolean,boolean,boolean,text)','dating_withdraw_consent()','dating_upsert_profile(text,date,text,text,uuid,text,text[],text,text,text)',
    'dating_owner_set_event(uuid,boolean,int,int)','dating_join(uuid)','dating_set_status(uuid,text)','dating_delete_my_profile()',
    'dating_discover(uuid,jsonb,int,int)','dating_like(uuid,uuid)','dating_pass(uuid,uuid)','dating_my_matches()','dating_send_message(uuid,text)','dating_mark_read(uuid)',
    'dating_unmatch(uuid)','dating_block(uuid)','dating_unblock(uuid)','dating_report(uuid,uuid,text,text,boolean)',
    'dating_admin_reports(text,int)','dating_admin_resolve_report(uuid,text,text)','dating_admin_set_event(uuid,boolean)','dating_stats(uuid)'] loop
    execute format('revoke all on function public.%s from public, anon, authenticated', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
  grant execute on function public.dating_stats(uuid) to anon;
  -- helper internal: tidak untuk klien
  revoke all on function public._dating_uid(), public._dating_age(date), public._dating_clean(text,int), public._dating_rl(text,int,int), public._dating_consent_ok(uuid),
    public._dating_event_ok(uuid), public._dating_blocked(uuid,uuid), public._dating_active(uuid,uuid) from public, anon, authenticated;
end $$;
