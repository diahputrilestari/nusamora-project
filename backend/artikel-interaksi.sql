-- NusaMora: interaksi artikel (suka, komentar bersarang, reaksi komentar, simpan artikel, feedback, jumlah dibaca, profil penulis,
-- moderasi admin, notifikasi). ADITIF dan aman diulang. Jalankan SETELAH admin-schema.sql, security-schema.sql (rl_hit),
-- admin-content.sql, admin-notifications.sql, dan customer-features.sql.
-- Prinsip keamanan:
--  * Semua tabel memakai RLS dan TIDAK memberi akses langsung ke anon/authenticated. Semua lewat fungsi security definer yang memakai auth.uid().
--  * Duplikat dicegah oleh constraint database (primary key / unique), bukan hanya oleh kode.
--  * Teks pengguna disimpan apa adanya (tanpa HTML) dan WAJIB ditampilkan sebagai teks (textContent) oleh klien.
--  * Pembatasan laju (rl_hit), validasi panjang/karakter, deteksi tautan berlebih, kata terlarang, honeypot, dan laporan berulang menyembunyikan komentar otomatis.
--  * Identitas tamu (anon) hanyalah kode acak dari peramban: cukup untuk mencegah duplikat suka/feedback biasa, BUKAN bukti identitas.

----------------------------------------------------------------------------- 1. Penulis dan pengaturan
create table if not exists public.article_authors (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 2 and 80),
  bio text check (bio is null or char_length(bio) <= 600),
  avatar_url text check (avatar_url is null or avatar_url ~ '^(https://[^[:space:]"<>]+|/[^[:space:]"<>]*)$'),
  links jsonb not null default '[]'::jsonb check (jsonb_typeof(links) = 'array' and jsonb_array_length(links) <= 5),
  is_default boolean not null default false,
  created_at timestamptz not null default now());
create unique index if not exists article_authors_default_uniq on public.article_authors (is_default) where is_default;
alter table public.contents add column if not exists author_id uuid references public.article_authors(id) on delete set null;
insert into public.article_authors (name, bio, is_default)
select 'Tim Editorial NusaMora', 'Kami menulis panduan praktis seputar undangan digital, persiapan pernikahan, dan perayaan yang bermakna, agar pasangan dan keluarga dapat mempersiapkan hari bahagia dengan tenang.', true
where not exists (select 1 from public.article_authors where is_default);

create table if not exists public.article_settings (key text primary key, value jsonb not null, updated_at timestamptz not null default now());
insert into public.article_settings (key, value) values
  ('comments_enabled', 'true'), ('guest_comments', 'false'), ('premoderate', 'false'),
  ('max_links', '2'), ('blocked_words', '[]'), ('max_length', '2000')
on conflict (key) do nothing;

create table if not exists public.article_flags (content_id uuid primary key references public.contents(id) on delete cascade, comments_enabled boolean not null default true, updated_at timestamptz not null default now());

----------------------------------------------------------------------------- 2. Suka, simpan, feedback, jumlah dibaca
create table if not exists public.article_likes (
  content_id uuid not null references public.contents(id) on delete cascade,
  viewer text not null check (viewer ~ '^[ua]:[A-Za-z0-9_-]{16,64}$' or viewer ~ '^u:[0-9a-f-]{36}$'),
  user_id uuid references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (content_id, viewer));
create table if not exists public.article_saves (
  user_id uuid not null references auth.users(id) on delete cascade,
  content_id uuid not null references public.contents(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, content_id));
create index if not exists article_saves_user_idx on public.article_saves (user_id, created_at desc);
create table if not exists public.article_feedback (
  content_id uuid not null references public.contents(id) on delete cascade,
  viewer text not null check (viewer ~ '^[ua]:[A-Za-z0-9_-]{16,64}$' or viewer ~ '^u:[0-9a-f-]{36}$'),
  user_id uuid references auth.users(id) on delete cascade,
  value text not null check (value in ('helpful','somewhat','not_helpful')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  primary key (content_id, viewer));
create table if not exists public.article_stats (content_id uuid primary key references public.contents(id) on delete cascade, views bigint not null default 0);
create table if not exists public.article_view_log (
  content_id uuid not null references public.contents(id) on delete cascade, viewer text not null, day date not null default current_date,
  primary key (content_id, viewer, day));

----------------------------------------------------------------------------- 3. Komentar, reaksi, laporan
create table if not exists public.article_comments (
  id uuid primary key default gen_random_uuid(),
  content_id uuid not null references public.contents(id) on delete cascade,
  parent_id uuid references public.article_comments(id) on delete cascade,
  reply_to_id uuid references public.article_comments(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  guest_name text check (guest_name is null or char_length(guest_name) between 2 and 40),
  guest_anon text check (guest_anon is null or guest_anon ~ '^[A-Za-z0-9_-]{16,64}$'),
  body text not null check (char_length(body) between 2 and 2000),
  status text not null default 'pending' check (status in ('pending','approved','rejected','spam')),
  is_team boolean not null default false,
  like_count int not null default 0 check (like_count >= 0),
  edited_at timestamptz, deleted_at timestamptz,
  created_at timestamptz not null default now(),
  check (user_id is not null or (guest_name is not null and guest_anon is not null)));
create index if not exists article_comments_list_idx on public.article_comments (content_id, parent_id, status, created_at desc);
create index if not exists article_comments_parent_idx on public.article_comments (parent_id) where parent_id is not null;
create index if not exists article_comments_mod_idx on public.article_comments (status, created_at desc);
create table if not exists public.comment_reactions (
  comment_id uuid not null references public.article_comments(id) on delete cascade,
  viewer text not null check (viewer ~ '^[ua]:[A-Za-z0-9_-]{16,64}$' or viewer ~ '^u:[0-9a-f-]{36}$'),
  created_at timestamptz not null default now(),
  primary key (comment_id, viewer));
create table if not exists public.comment_reports (
  id bigint generated always as identity primary key,
  comment_id uuid not null references public.article_comments(id) on delete cascade,
  viewer text not null check (viewer ~ '^[ua]:[A-Za-z0-9_-]{16,64}$' or viewer ~ '^u:[0-9a-f-]{36}$'),
  reason text not null check (char_length(reason) between 3 and 300),
  status text not null default 'open' check (status in ('open','resolved')),
  created_at timestamptz not null default now(),
  unique (comment_id, viewer));
create index if not exists comment_reports_open_idx on public.comment_reports (status, created_at desc);

----------------------------------------------------------------------------- 4. Notifikasi dalam aplikasi
create table if not exists public.article_notifs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('reply','approved','reaction')),
  content_id uuid not null references public.contents(id) on delete cascade,
  comment_id uuid references public.article_comments(id) on delete cascade,
  actor_name text, created_at timestamptz not null default now(), read_at timestamptz);
create index if not exists article_notifs_user_idx on public.article_notifs (user_id, created_at desc);
create unique index if not exists article_notifs_reaction_uniq on public.article_notifs (user_id, comment_id) where kind = 'reaction';
create table if not exists public.article_notif_prefs (
  user_id uuid primary key references auth.users(id) on delete cascade,
  reply boolean not null default true, approved boolean not null default true, reaction boolean not null default true,
  updated_at timestamptz not null default now());

----------------------------------------------------------------------------- 5. RLS: tabel tertutup, akses lewat fungsi
do $$ declare t text; begin
  foreach t in array array['article_authors','article_settings','article_flags','article_likes','article_saves','article_feedback','article_stats','article_view_log','article_comments','comment_reactions','comment_reports','article_notifs','article_notif_prefs'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
  end loop;
end $$;
-- admin boleh membaca langsung (untuk panel); penulisan tetap lewat fungsi
do $$ declare t text; begin
  foreach t in array array['article_authors','article_settings','article_flags','article_comments','comment_reports'] loop
    execute format('drop policy if exists "admin baca" on public.%I', t);
    execute format('create policy "admin baca" on public.%I for select to authenticated using (public.has_perm(''content.read''))', t);
    execute format('grant select on public.%I to authenticated', t);
  end loop;
  foreach t in array array['article_authors','article_settings','article_flags','article_comments'] loop
    execute format('drop trigger if exists audit_%1$s on public.%1$I', t);
    execute format('create trigger audit_%1$s after insert or update or delete on public.%1$I for each row execute function public.audit_row()', t);
  end loop;
end $$;
-- penulis tampil di halaman publik: hanya baca data yang aman lewat fungsi, bukan tabel

----------------------------------------------------------------------------- 6. Pembantu internal (tidak diberikan ke klien)
create or replace function public.ai_setting(p_key text) returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce((select value from public.article_settings where key = p_key),
    case p_key when 'comments_enabled' then 'true'::jsonb when 'guest_comments' then 'false'::jsonb when 'premoderate' then 'false'::jsonb
      when 'max_links' then '2'::jsonb when 'blocked_words' then '[]'::jsonb when 'max_length' then '2000'::jsonb else 'null'::jsonb end) $$;

create or replace function public.ai_viewer(p_anon text) returns text language sql stable as $$
  select case when auth.uid() is not null then 'u:' || auth.uid()::text when p_anon ~ '^[A-Za-z0-9_-]{16,64}$' then 'a:' || p_anon else null end $$;

create or replace function public.ai_ip() returns text language sql stable as $$
  select nullif(btrim(split_part(coalesce((nullif(current_setting('request.headers', true), ''))::json ->> 'x-forwarded-for', ''), ',', 1)), '') $$;

create or replace function public.ai_content_id(p_slug text, p_lang text default 'id') returns uuid language sql stable security definer set search_path = public as $$
  select x.id from public.contents x where x.type = 'article' and x.slug = p_slug and x.lang = coalesce(p_lang, 'id') and x.status = 'published'
     and (x.publish_at is null or x.publish_at <= now()) and (x.unpublish_at is null or x.unpublish_at > now()) limit 1 $$;

create or replace function public.ai_comments_open(p_content uuid) returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((public.ai_setting('comments_enabled'))::text = 'true', true) and coalesce((select f.comments_enabled from public.article_flags f where f.content_id = p_content), true) $$;

create or replace function public.ai_name(p_user uuid, p_guest text, p_team boolean) returns text language sql stable security definer set search_path = public as $$
  select case when p_team then 'Tim NusaMora'
    when p_user is not null then coalesce((select case when array_length(w, 1) > 1 then w[1] || ' ' || left(w[array_length(w, 1)], 1) || '.' else w[1] end
        from (select regexp_split_to_array(btrim(pr.full_name), '\s+') as w from public.profiles pr where pr.id = p_user) x where w[1] <> ''), 'Pengguna')
    else coalesce(nullif(btrim(p_guest), ''), 'Tamu') end $$;

create or replace function public.ai_read_min(p_body text) returns int language sql immutable as $$
  select greatest(1, ceil(coalesce(array_length(regexp_split_to_array(nullif(btrim(coalesce(p_body, '')), ''), '\s+'), 1), 0) / 200.0)::int) $$;

create or replace function public.ai_clean(p_text text) returns text language sql immutable as $$
  select btrim(regexp_replace(regexp_replace(coalesce(p_text, ''), '[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]', '', 'g'), E'\n{3,}', E'\n\n', 'g')) $$;

create or replace function public.ai_rate(p_key text, p_limit int, p_secs int) returns boolean language plpgsql security definer set search_path = public as $$
declare r jsonb;
begin
  r := public.rl_hit(p_key, p_limit, p_secs, 'article_rate_limited');
  return coalesce((r ->> 'allowed')::boolean, true);
end $$;

-- notifikasi dalam aplikasi (+ email lewat aturan notif_rules bila admin mengaktifkannya)
create or replace function public.ai_notify(p_user uuid, p_kind text, p_content uuid, p_comment uuid, p_actor text) returns void
language plpgsql security definer set search_path = public as $$
declare ok boolean := true; v_title text; v_slug text;
begin
  if p_user is null then return; end if;
  select case p_kind when 'reply' then coalesce(p.reply, true) when 'approved' then coalesce(p.approved, true) else coalesce(p.reaction, true) end
    into ok from (select 1) d left join public.article_notif_prefs p on p.user_id = p_user;
  if not coalesce(ok, true) then return; end if;
  if p_kind = 'reaction' then
    insert into public.article_notifs (user_id, kind, content_id, comment_id, actor_name) values (p_user, p_kind, p_content, p_comment, p_actor)
      on conflict (user_id, comment_id) where kind = 'reaction' do update set read_at = null, created_at = now(), actor_name = excluded.actor_name;
  else
    insert into public.article_notifs (user_id, kind, content_id, comment_id, actor_name) values (p_user, p_kind, p_content, p_comment, p_actor);
  end if;
  if p_kind in ('reply', 'approved') then
    begin
      select title, slug into v_title, v_slug from public.contents where id = p_content;
      perform public.notif_emit('article_' || p_kind, p_user, jsonb_build_object('artikel', v_title, 'pelaku', coalesce(p_actor, 'Seseorang'), 'tautan', 'https://nusamora.com/artikel/' || v_slug), 'art:' || p_kind || ':' || p_comment::text || ':' || p_user::text);
    exception when others then null;  -- email tidak boleh menggagalkan komentar
    end;
  end if;
end $$;

-- pemicu: komentar tayang (baru atau disetujui) memberi tahu pemilik komentar induk; persetujuan memberi tahu penulis komentar
create or replace function public.ai_comment_trg() returns trigger language plpgsql security definer set search_path = public as $$
declare v_target uuid; v_actor text;
begin
  if new.status = 'approved' and (tg_op = 'INSERT' or old.status is distinct from 'approved') then
    v_actor := public.ai_name(new.user_id, new.guest_name, new.is_team);
    if new.parent_id is not null then
      select c.user_id into v_target from public.article_comments c where c.id = coalesce(new.reply_to_id, new.parent_id);
      if v_target is not null and v_target is distinct from new.user_id then perform public.ai_notify(v_target, 'reply', new.content_id, new.id, v_actor); end if;
    end if;
    if tg_op = 'UPDATE' and new.user_id is not null and not new.is_team then perform public.ai_notify(new.user_id, 'approved', new.content_id, new.id, null); end if;
  end if;
  return null;
end $$;
drop trigger if exists ai_comment_after on public.article_comments;
create trigger ai_comment_after after insert or update of status on public.article_comments for each row execute function public.ai_comment_trg();

create or replace function public.ai_reaction_trg() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then update public.article_comments set like_count = like_count + 1 where id = new.comment_id;
  else update public.article_comments set like_count = greatest(0, like_count - 1) where id = old.comment_id; end if;
  return null;
end $$;
drop trigger if exists ai_reaction_after on public.comment_reactions;
create trigger ai_reaction_after after insert or delete on public.comment_reactions for each row execute function public.ai_reaction_trg();

-- templat email (aturan bawaan NONAKTIF; admin yang mengaktifkannya di menu Notifikasi)
insert into public.notif_templates (key, channel, lang, name, subject, body) values
  ('article_reply', 'email', 'id', 'Balasan komentar (email)', 'Ada balasan untuk komentar Anda di NusaMora', E'Halo {{nama}},\n\n{{pelaku}} membalas komentar Anda pada artikel "{{artikel}}".\nBaca balasannya: {{tautan}}\n\nSalam,\nTim NusaMora'),
  ('article_approved', 'email', 'id', 'Komentar disetujui (email)', 'Komentar Anda sudah tayang di NusaMora', E'Halo {{nama}},\n\nKomentar Anda pada artikel "{{artikel}}" sudah disetujui dan tayang.\nLihat: {{tautan}}\n\nSalam,\nTim NusaMora')
on conflict (key, channel, lang) do nothing;
insert into public.notif_rules (event, channel, recipient, template_key, enabled) values
  ('article_reply', 'email', 'customer', 'article_reply', false), ('article_approved', 'email', 'customer', 'article_approved', false)
on conflict (event, channel, recipient) do nothing;

----------------------------------------------------------------------------- 7. Fungsi publik: ringkasan, jumlah dibaca, suka, simpan, feedback
create or replace function public.article_engagement(p_slug text, p_lang text default 'id', p_anon text default null) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v uuid := public.ai_content_id(p_slug, p_lang); me text := public.ai_viewer(p_anon); a public.article_authors; c public.contents; d uuid;
begin
  if v is null then return null; end if;
  select * into c from public.contents where id = v;
  select * into a from public.article_authors where id = coalesce(c.author_id, (select id from public.article_authors where is_default limit 1));
  d := (select id from public.article_authors where is_default limit 1);
  return jsonb_build_object(
    'id', v,
    'views', coalesce((select s.views from public.article_stats s where s.content_id = v), 0),
    'likes', (select count(*) from public.article_likes l where l.content_id = v),
    'liked', exists (select 1 from public.article_likes l where l.content_id = v and l.viewer = me),
    'comments', (select count(*) from public.article_comments k where k.content_id = v and k.status = 'approved' and k.deleted_at is null),
    'saved', case when auth.uid() is null then false else exists (select 1 from public.article_saves s where s.content_id = v and s.user_id = auth.uid()) end,
    'feedback', (select f.value from public.article_feedback f where f.content_id = v and f.viewer = me),
    'comments_open', public.ai_comments_open(v),
    'guest_comments', coalesce((public.ai_setting('guest_comments'))::text = 'true', false),
    'author', case when a.id is null then null else jsonb_build_object('id', a.id, 'name', a.name, 'bio', a.bio, 'avatar_url', a.avatar_url, 'links', a.links) end,
    'author_articles', coalesce((select jsonb_agg(jsonb_build_object('title', t.title, 'slug', t.slug, 'excerpt', t.excerpt, 'image_url', t.image_url, 'published_at', t.published_at, 'read_min', public.ai_read_min(t.body)) order by t.published_at desc nulls last)
        from (select x.* from public.contents x where x.type = 'article' and x.lang = c.lang and x.status = 'published' and x.id <> v
               and (x.publish_at is null or x.publish_at <= now()) and (x.unpublish_at is null or x.unpublish_at > now())
               and coalesce(x.author_id, d) = a.id order by x.published_at desc nulls last limit 3) t), '[]'::jsonb));
end $$;

create or replace function public.article_track_view(p_slug text, p_lang text default 'id', p_anon text default null) returns bigint
language plpgsql security definer set search_path = public as $$
declare v uuid := public.ai_content_id(p_slug, p_lang); me text := public.ai_viewer(p_anon); n int;
begin
  if v is null then return 0; end if;
  me := coalesce(me, 'ip:' || md5(coalesce(public.ai_ip(), 'x')));
  if public.ai_ip() is not null and not public.ai_rate('view-ip-' || md5(public.ai_ip()), 120, 3600) then
    return coalesce((select views from public.article_stats where content_id = v), 0);
  end if;
  insert into public.article_view_log (content_id, viewer) values (v, me) on conflict do nothing;
  get diagnostics n = row_count;
  if n > 0 then
    insert into public.article_stats (content_id, views) values (v, 1) on conflict (content_id) do update set views = public.article_stats.views + 1;
  end if;
  return coalesce((select views from public.article_stats where content_id = v), 0);
end $$;

create or replace function public.article_like_toggle(p_slug text, p_lang text default 'id', p_anon text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v uuid := public.ai_content_id(p_slug, p_lang); me text := public.ai_viewer(p_anon); liked boolean; n int;
begin
  if v is null then return jsonb_build_object('ok', false, 'error', 'tidak_ditemukan'); end if;
  if me is null then return jsonb_build_object('ok', false, 'error', 'identitas_tidak_valid'); end if;
  if not public.ai_rate('like-' || me, 40, 600) then return jsonb_build_object('ok', false, 'error', 'terlalu_banyak_permintaan'); end if;
  delete from public.article_likes where content_id = v and viewer = me;
  get diagnostics n = row_count;
  if n > 0 then liked := false;
  else
    insert into public.article_likes (content_id, viewer, user_id) values (v, me, auth.uid()) on conflict do nothing;
    liked := true;
  end if;
  return jsonb_build_object('ok', true, 'liked', liked, 'likes', (select count(*) from public.article_likes where content_id = v));
end $$;

create or replace function public.article_save_set(p_slug text, p_lang text default 'id', p_saved boolean default true) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v uuid := public.ai_content_id(p_slug, p_lang);
begin
  if auth.uid() is null then return jsonb_build_object('ok', false, 'error', 'login_diperlukan'); end if;
  if v is null then return jsonb_build_object('ok', false, 'error', 'tidak_ditemukan'); end if;
  if not public.ai_rate('save-' || auth.uid()::text, 60, 600) then return jsonb_build_object('ok', false, 'error', 'terlalu_banyak_permintaan'); end if;
  if p_saved then insert into public.article_saves (user_id, content_id) values (auth.uid(), v) on conflict do nothing;
  else delete from public.article_saves where user_id = auth.uid() and content_id = v; end if;
  return jsonb_build_object('ok', true, 'saved', coalesce(p_saved, true));
end $$;

create or replace function public.my_saved_articles(p_limit int default 50, p_offset int default 0) returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'tidak_diizinkan' using errcode = '28000'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('title', t.title, 'slug', t.slug, 'lang', t.lang, 'excerpt', t.excerpt, 'image_url', t.image_url, 'published_at', t.published_at, 'read_min', public.ai_read_min(t.body), 'saved_at', t.saved_at) order by t.saved_at desc)
    from (select x.*, s.created_at as saved_at from public.article_saves s join public.contents x on x.id = s.content_id
           where s.user_id = auth.uid() and x.type = 'article' and x.status = 'published' and (x.publish_at is null or x.publish_at <= now()) and (x.unpublish_at is null or x.unpublish_at > now())
           order by s.created_at desc limit least(greatest(coalesce(p_limit, 50), 1), 100) offset greatest(coalesce(p_offset, 0), 0)) t), '[]'::jsonb);
end $$;

create or replace function public.article_feedback_set(p_slug text, p_value text, p_lang text default 'id', p_anon text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v uuid := public.ai_content_id(p_slug, p_lang); me text := public.ai_viewer(p_anon);
begin
  if p_value not in ('helpful', 'somewhat', 'not_helpful') then return jsonb_build_object('ok', false, 'error', 'nilai_tidak_valid'); end if;
  if v is null then return jsonb_build_object('ok', false, 'error', 'tidak_ditemukan'); end if;
  if me is null then return jsonb_build_object('ok', false, 'error', 'identitas_tidak_valid'); end if;
  if not public.ai_rate('fb-' || me, 20, 600) then return jsonb_build_object('ok', false, 'error', 'terlalu_banyak_permintaan'); end if;
  insert into public.article_feedback (content_id, viewer, user_id, value) values (v, me, auth.uid(), p_value)
    on conflict (content_id, viewer) do update set value = excluded.value, updated_at = now();
  return jsonb_build_object('ok', true, 'value', p_value);
end $$;

----------------------------------------------------------------------------- 8. Komentar: daftar, tulis, ubah, hapus, suka, lapor
create or replace function public.article_comments_list(p_slug text, p_lang text default 'id', p_sort text default 'newest', p_limit int default 10, p_offset int default 0, p_anon text default null) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v uuid := public.ai_content_id(p_slug, p_lang); me text := public.ai_viewer(p_anon); u uuid := auth.uid(); an text := case when p_anon ~ '^[A-Za-z0-9_-]{16,64}$' then p_anon end;
  lim int := least(greatest(coalesce(p_limit, 10), 1), 30); off int := greatest(coalesce(p_offset, 0), 0); tot int; items jsonb;
begin
  if v is null then return jsonb_build_object('total', 0, 'items', '[]'::jsonb); end if;
  -- baris tampak: disetujui, atau milik sendiri yang masih menunggu
  select count(*) into tot from public.article_comments c
   where c.content_id = v and c.parent_id is null
     and (c.status = 'approved' or (c.status = 'pending' and ((u is not null and c.user_id = u) or (an is not null and c.guest_anon = an))))
     and (c.deleted_at is null or exists (select 1 from public.article_comments r where r.parent_id = c.id and r.status = 'approved'));
  select coalesce(jsonb_agg(x.j order by x.rk), '[]'::jsonb) into items from (
    select row_number() over (order by case when p_sort = 'liked' then c.like_count end desc nulls last, case when p_sort = 'oldest' then c.created_at end asc, c.created_at desc) as rk,
      jsonb_build_object('id', c.id, 'name', case when c.deleted_at is null then public.ai_name(c.user_id, c.guest_name, c.is_team) else null end,
        'guest', c.user_id is null, 'team', c.is_team, 'body', case when c.deleted_at is null then c.body else null end, 'deleted', c.deleted_at is not null,
        'created_at', c.created_at, 'edited_at', c.edited_at, 'likes', c.like_count, 'status', c.status,
        'liked', exists (select 1 from public.comment_reactions r where r.comment_id = c.id and r.viewer = me),
        'mine', (u is not null and c.user_id = u) or (an is not null and c.guest_anon = an),
        'replies', coalesce((select jsonb_agg(jsonb_build_object('id', r.id, 'name', public.ai_name(r.user_id, r.guest_name, r.is_team), 'guest', r.user_id is null, 'team', r.is_team, 'body', r.body,
            'created_at', r.created_at, 'edited_at', r.edited_at, 'likes', r.like_count, 'status', r.status,
            'reply_to', case when r.reply_to_id is not null and r.reply_to_id <> c.id then (select public.ai_name(q.user_id, q.guest_name, q.is_team) from public.article_comments q where q.id = r.reply_to_id) end,
            'liked', exists (select 1 from public.comment_reactions rr where rr.comment_id = r.id and rr.viewer = me),
            'mine', (u is not null and r.user_id = u) or (an is not null and r.guest_anon = an)) order by r.created_at)
          from (select * from public.article_comments r0 where r0.parent_id = c.id and r0.deleted_at is null
                  and (r0.status = 'approved' or (r0.status = 'pending' and ((u is not null and r0.user_id = u) or (an is not null and r0.guest_anon = an)))) order by r0.created_at limit 100) r), '[]'::jsonb)) as j
    from public.article_comments c
    where c.content_id = v and c.parent_id is null
      and (c.status = 'approved' or (c.status = 'pending' and ((u is not null and c.user_id = u) or (an is not null and c.guest_anon = an))))
      and (c.deleted_at is null or exists (select 1 from public.article_comments r where r.parent_id = c.id and r.status = 'approved'))
    order by rk limit lim offset off) x;
  return jsonb_build_object('total', tot, 'items', items, 'comments_open', public.ai_comments_open(v));
end $$;

create or replace function public.article_comment_add(p_slug text, p_body text, p_lang text default 'id', p_parent uuid default null, p_guest_name text default null, p_anon text default null, p_hp text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v uuid := public.ai_content_id(p_slug, p_lang); u uuid := auth.uid(); an text := case when p_anon ~ '^[A-Za-z0-9_-]{16,64}$' then p_anon end;
  b text := public.ai_clean(p_body); gn text := nullif(btrim(regexp_replace(coalesce(p_guest_name, ''), '[[:cntrl:]]', '', 'g')), ''); me text := public.ai_viewer(p_anon);
  par public.article_comments; root uuid; rto uuid; st text := 'approved'; links int; maxl int; ipk text := public.ai_ip(); nid uuid;
begin
  if coalesce(p_hp, '') <> '' then return jsonb_build_object('ok', true, 'status', 'pending'); end if;  -- honeypot terisi: bot, pura-pura berhasil
  if v is null then return jsonb_build_object('ok', false, 'error', 'tidak_ditemukan'); end if;
  if not public.ai_comments_open(v) then return jsonb_build_object('ok', false, 'error', 'komentar_ditutup'); end if;
  if u is null then
    if not coalesce((public.ai_setting('guest_comments'))::text = 'true', false) then return jsonb_build_object('ok', false, 'error', 'login_diperlukan'); end if;
    if an is null then return jsonb_build_object('ok', false, 'error', 'identitas_tidak_valid'); end if;
    if gn is null or char_length(gn) not between 2 and 40 then return jsonb_build_object('ok', false, 'error', 'nama_tidak_valid'); end if;
    st := 'pending';  -- komentar tamu selalu dimoderasi
  end if;
  maxl := least(coalesce((public.ai_setting('max_length'))::text::int, 2000), 2000);
  if char_length(b) < 2 then return jsonb_build_object('ok', false, 'error', 'komentar_terlalu_pendek'); end if;
  if char_length(b) > maxl then return jsonb_build_object('ok', false, 'error', 'komentar_terlalu_panjang'); end if;
  if u is not null then
    if not public.ai_rate('cmt-u-' || u::text, 6, 600) then return jsonb_build_object('ok', false, 'error', 'terlalu_banyak_permintaan'); end if;
  else
    if not public.ai_rate('cmt-g-' || an, 3, 600) then return jsonb_build_object('ok', false, 'error', 'terlalu_banyak_permintaan'); end if;
    if ipk is not null and not public.ai_rate('cmt-ip-' || md5(ipk), 8, 3600) then return jsonb_build_object('ok', false, 'error', 'terlalu_banyak_permintaan'); end if;
  end if;
  if exists (select 1 from public.article_comments c where c.content_id = v and c.created_at > now() - interval '10 minutes' and c.body = b
             and ((u is not null and c.user_id = u) or (u is null and c.guest_anon = an))) then return jsonb_build_object('ok', false, 'error', 'komentar_duplikat'); end if;
  if p_parent is not null then
    select * into par from public.article_comments where id = p_parent and content_id = v and status = 'approved' and deleted_at is null;
    if not found then return jsonb_build_object('ok', false, 'error', 'komentar_induk_tidak_valid'); end if;
    root := coalesce(par.parent_id, par.id); rto := par.id;  -- utas dua tingkat: balasan selalu di bawah komentar utama
  end if;
  links := (select count(*) from regexp_matches(lower(b), 'https?://|www\.', 'g'));
  if links > coalesce((public.ai_setting('max_links'))::text::int, 2) then st := 'pending'; end if;
  if exists (select 1 from jsonb_array_elements_text(public.ai_setting('blocked_words')) w where char_length(w) > 1 and position(lower(w) in lower(b)) > 0) then st := 'spam'; end if;
  if st = 'approved' and coalesce((public.ai_setting('premoderate'))::text = 'true', false) then st := 'pending'; end if;
  insert into public.article_comments (content_id, parent_id, reply_to_id, user_id, guest_name, guest_anon, body, status)
    values (v, root, rto, u, case when u is null then gn end, case when u is null then an end, b, st) returning id into nid;
  return jsonb_build_object('ok', true, 'id', nid, 'status', st);
end $$;

create or replace function public.article_comment_edit(p_id uuid, p_body text, p_anon text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare c public.article_comments; u uuid := auth.uid(); an text := case when p_anon ~ '^[A-Za-z0-9_-]{16,64}$' then p_anon end; b text := public.ai_clean(p_body); st text; links int;
begin
  select * into c from public.article_comments where id = p_id and deleted_at is null;
  if not found or c.is_team and not public.has_perm('content.write') then return jsonb_build_object('ok', false, 'error', 'tidak_ditemukan'); end if;
  if not ((u is not null and c.user_id = u) or (u is null and an is not null and c.guest_anon = an)) then return jsonb_build_object('ok', false, 'error', 'tidak_diizinkan'); end if;
  if char_length(b) < 2 then return jsonb_build_object('ok', false, 'error', 'komentar_terlalu_pendek'); end if;
  if char_length(b) > least(coalesce((public.ai_setting('max_length'))::text::int, 2000), 2000) then return jsonb_build_object('ok', false, 'error', 'komentar_terlalu_panjang'); end if;
  if not public.ai_rate('cmt-edit-' || coalesce(u::text, an), 10, 600) then return jsonb_build_object('ok', false, 'error', 'terlalu_banyak_permintaan'); end if;
  st := c.status;
  links := (select count(*) from regexp_matches(lower(b), 'https?://|www\.', 'g'));
  if c.status = 'approved' and not c.is_team and (u is null or links > coalesce((public.ai_setting('max_links'))::text::int, 2) or coalesce((public.ai_setting('premoderate'))::text = 'true', false)) then st := 'pending'; end if;
  if exists (select 1 from jsonb_array_elements_text(public.ai_setting('blocked_words')) w where char_length(w) > 1 and position(lower(w) in lower(b)) > 0) then st := 'spam'; end if;
  update public.article_comments set body = b, edited_at = now(), status = st where id = p_id;
  return jsonb_build_object('ok', true, 'status', st);
end $$;

create or replace function public.article_comment_delete(p_id uuid, p_anon text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare c public.article_comments; u uuid := auth.uid(); an text := case when p_anon ~ '^[A-Za-z0-9_-]{16,64}$' then p_anon end; has_rep boolean;
begin
  select * into c from public.article_comments where id = p_id;
  if not found then return jsonb_build_object('ok', false, 'error', 'tidak_ditemukan'); end if;
  if not ((u is not null and c.user_id = u) or (u is null and an is not null and c.guest_anon = an)) then return jsonb_build_object('ok', false, 'error', 'tidak_diizinkan'); end if;
  has_rep := exists (select 1 from public.article_comments r where r.parent_id = c.id);
  if has_rep and c.parent_id is null then
    update public.article_comments set deleted_at = now(), body = '[dihapus]' where id = p_id;  -- pertahankan utas, kosongkan isi
  else delete from public.article_comments where id = p_id; end if;
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.comment_like_toggle(p_id uuid, p_anon text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare c public.article_comments; me text := public.ai_viewer(p_anon); n int; liked boolean;
begin
  if me is null then return jsonb_build_object('ok', false, 'error', 'identitas_tidak_valid'); end if;
  select * into c from public.article_comments where id = p_id and status = 'approved' and deleted_at is null;
  if not found then return jsonb_build_object('ok', false, 'error', 'tidak_ditemukan'); end if;
  if not public.ai_rate('clike-' || me, 60, 600) then return jsonb_build_object('ok', false, 'error', 'terlalu_banyak_permintaan'); end if;
  delete from public.comment_reactions where comment_id = p_id and viewer = me;
  get diagnostics n = row_count;
  if n > 0 then liked := false;
  else
    insert into public.comment_reactions (comment_id, viewer) values (p_id, me) on conflict do nothing;
    liked := true;
    if auth.uid() is not null and c.user_id is not null and c.user_id <> auth.uid() then
      perform public.ai_notify(c.user_id, 'reaction', c.content_id, c.id, public.ai_name(auth.uid(), null, false));
    elsif c.user_id is not null and auth.uid() is null then
      perform public.ai_notify(c.user_id, 'reaction', c.content_id, c.id, 'Pembaca');
    end if;
  end if;
  return jsonb_build_object('ok', true, 'liked', liked, 'likes', (select like_count from public.article_comments where id = p_id));
end $$;

create or replace function public.comment_report(p_id uuid, p_reason text, p_anon text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare c public.article_comments; me text := public.ai_viewer(p_anon); r text := public.ai_clean(p_reason); n int;
begin
  if me is null then return jsonb_build_object('ok', false, 'error', 'identitas_tidak_valid'); end if;
  if char_length(r) < 3 or char_length(r) > 300 then return jsonb_build_object('ok', false, 'error', 'alasan_tidak_valid'); end if;
  select * into c from public.article_comments where id = p_id and status = 'approved' and deleted_at is null;
  if not found then return jsonb_build_object('ok', false, 'error', 'tidak_ditemukan'); end if;
  if not public.ai_rate('report-' || me, 10, 3600) then return jsonb_build_object('ok', false, 'error', 'terlalu_banyak_permintaan'); end if;
  insert into public.comment_reports (comment_id, viewer, reason) values (p_id, me, r) on conflict do nothing;
  select count(*) into n from public.comment_reports where comment_id = p_id and status = 'open';
  if n >= 3 and not c.is_team then update public.article_comments set status = 'pending' where id = p_id; end if;  -- sembunyikan otomatis sampai ditinjau
  return jsonb_build_object('ok', true);
end $$;

----------------------------------------------------------------------------- 9. Notifikasi pengguna
create or replace function public.my_article_notifs(p_limit int default 30) returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'tidak_diizinkan' using errcode = '28000'; end if;
  return jsonb_build_object(
    'unread', (select count(*) from public.article_notifs n where n.user_id = auth.uid() and n.read_at is null),
    'items', coalesce((select jsonb_agg(jsonb_build_object('id', t.id, 'kind', t.kind, 'actor', t.actor_name, 'title', t.title, 'slug', t.slug, 'created_at', t.created_at, 'read', t.read_at is not null) order by t.created_at desc)
      from (select n.*, x.title, x.slug from public.article_notifs n join public.contents x on x.id = n.content_id where n.user_id = auth.uid() order by n.created_at desc limit least(greatest(coalesce(p_limit, 30), 1), 100)) t), '[]'::jsonb));
end $$;
create or replace function public.article_notifs_read() returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if auth.uid() is null then raise exception 'tidak_diizinkan' using errcode = '28000'; end if;
  update public.article_notifs set read_at = now() where user_id = auth.uid() and read_at is null;
  get diagnostics n = row_count; return n;
end $$;
create or replace function public.article_notif_prefs_get() returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'tidak_diizinkan' using errcode = '28000'; end if;
  return coalesce((select jsonb_build_object('reply', p.reply, 'approved', p.approved, 'reaction', p.reaction) from public.article_notif_prefs p where p.user_id = auth.uid()), jsonb_build_object('reply', true, 'approved', true, 'reaction', true));
end $$;
create or replace function public.article_notif_prefs_set(p_reply boolean, p_approved boolean, p_reaction boolean) returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'tidak_diizinkan' using errcode = '28000'; end if;
  insert into public.article_notif_prefs (user_id, reply, approved, reaction) values (auth.uid(), coalesce(p_reply, true), coalesce(p_approved, true), coalesce(p_reaction, true))
    on conflict (user_id) do update set reply = excluded.reply, approved = excluded.approved, reaction = excluded.reaction, updated_at = now();
  return public.article_notif_prefs_get();
end $$;

----------------------------------------------------------------------------- 10. Admin: moderasi, laporan, pengaturan, statistik, penulis
create or replace function public.admin_comments_list(p_status text default null, p_q text default null, p_content uuid default null, p_limit int default 30, p_offset int default 0) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare tot int; items jsonb; q text := nullif(btrim(coalesce(p_q, '')), '');
begin
  if not public.has_perm('content.read') then raise exception 'tidak_diizinkan' using errcode = '42501'; end if;
  select count(*) into tot from public.article_comments c where (p_status is null or c.status = p_status) and (p_content is null or c.content_id = p_content)
     and (q is null or c.body ilike '%' || q || '%' or coalesce(c.guest_name, '') ilike '%' || q || '%');
  select coalesce(jsonb_agg(t.j order by t.at desc), '[]'::jsonb) into items from (
    select c.created_at as at, jsonb_build_object('id', c.id, 'content_id', c.content_id, 'title', x.title, 'slug', x.slug, 'parent_id', c.parent_id, 'name', public.ai_name(c.user_id, c.guest_name, c.is_team),
      'full_name', (select pr.full_name from public.profiles pr where pr.id = c.user_id), 'guest', c.user_id is null, 'team', c.is_team, 'body', c.body, 'status', c.status, 'likes', c.like_count,
      'deleted', c.deleted_at is not null, 'reports', (select count(*) from public.comment_reports r where r.comment_id = c.id and r.status = 'open'), 'created_at', c.created_at, 'edited_at', c.edited_at) as j
    from public.article_comments c join public.contents x on x.id = c.content_id
    where (p_status is null or c.status = p_status) and (p_content is null or c.content_id = p_content)
      and (q is null or c.body ilike '%' || q || '%' or coalesce(c.guest_name, '') ilike '%' || q || '%')
    order by c.created_at desc limit least(greatest(coalesce(p_limit, 30), 1), 100) offset greatest(coalesce(p_offset, 0), 0)) t;
  return jsonb_build_object('total', tot, 'items', items,
    'counts', (select coalesce(jsonb_object_agg(s.status, s.n), '{}'::jsonb) from (select status, count(*) n from public.article_comments group by status) s));
end $$;

create or replace function public.admin_comment_set_status(p_id uuid, p_status text) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not public.has_perm('content.write') then raise exception 'tidak_diizinkan' using errcode = '42501'; end if;
  if p_status not in ('pending', 'approved', 'rejected', 'spam') then return jsonb_build_object('ok', false, 'error', 'status_tidak_valid'); end if;
  update public.article_comments set status = p_status where id = p_id;
  if not found then return jsonb_build_object('ok', false, 'error', 'tidak_ditemukan'); end if;
  if p_status in ('approved', 'rejected', 'spam') then update public.comment_reports set status = 'resolved' where comment_id = p_id and status = 'open'; end if;
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.admin_comment_delete(p_id uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not public.has_perm('content.delete') then raise exception 'tidak_diizinkan' using errcode = '42501'; end if;
  delete from public.article_comments where id = p_id;
  if not found then return jsonb_build_object('ok', false, 'error', 'tidak_ditemukan'); end if;
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.admin_comment_reply(p_id uuid, p_body text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare par public.article_comments; b text := public.ai_clean(p_body); nid uuid;
begin
  if not public.has_perm('content.write') then raise exception 'tidak_diizinkan' using errcode = '42501'; end if;
  if char_length(b) < 2 or char_length(b) > 2000 then return jsonb_build_object('ok', false, 'error', 'komentar_tidak_valid'); end if;
  select * into par from public.article_comments where id = p_id and deleted_at is null;
  if not found then return jsonb_build_object('ok', false, 'error', 'tidak_ditemukan'); end if;
  if par.status <> 'approved' then update public.article_comments set status = 'approved' where id = p_id; end if;
  insert into public.article_comments (content_id, parent_id, reply_to_id, user_id, body, status, is_team)
    values (par.content_id, coalesce(par.parent_id, par.id), par.id, auth.uid(), b, 'approved', true) returning id into nid;
  update public.comment_reports set status = 'resolved' where comment_id = p_id and status = 'open';
  return jsonb_build_object('ok', true, 'id', nid);
end $$;

create or replace function public.admin_reports_list(p_limit int default 30) returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.has_perm('content.read') then raise exception 'tidak_diizinkan' using errcode = '42501'; end if;
  return coalesce((select jsonb_agg(t.j order by t.first_at desc) from (
    select min(r.created_at) as first_at, jsonb_build_object('comment_id', c.id, 'body', c.body, 'status', c.status, 'name', public.ai_name(c.user_id, c.guest_name, c.is_team), 'title', x.title, 'slug', x.slug,
      'count', count(*), 'reasons', (array_agg(r.reason order by r.created_at))[1:5], 'first_at', min(r.created_at)) as j
    from public.comment_reports r join public.article_comments c on c.id = r.comment_id join public.contents x on x.id = c.content_id
    where r.status = 'open' group by c.id, x.title, x.slug order by min(r.created_at) desc limit least(greatest(coalesce(p_limit, 30), 1), 100)) t), '[]'::jsonb);
end $$;

create or replace function public.admin_report_resolve(p_comment uuid, p_action text) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not public.has_perm('content.write') then raise exception 'tidak_diizinkan' using errcode = '42501'; end if;
  if p_action not in ('dismiss', 'reject', 'spam', 'delete') then return jsonb_build_object('ok', false, 'error', 'aksi_tidak_valid'); end if;
  if p_action = 'delete' then
    if not public.has_perm('content.delete') then raise exception 'tidak_diizinkan' using errcode = '42501'; end if;
    delete from public.article_comments where id = p_comment; return jsonb_build_object('ok', true);
  end if;
  update public.article_comments set status = case p_action when 'dismiss' then 'approved' when 'reject' then 'rejected' else 'spam' end where id = p_comment;
  update public.comment_reports set status = 'resolved' where comment_id = p_comment and status = 'open';
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.admin_article_stats() returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.has_perm('content.read') then raise exception 'tidak_diizinkan' using errcode = '42501'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('id', x.id, 'title', x.title, 'slug', x.slug, 'lang', x.lang, 'status', x.status, 'author_id', x.author_id,
      'views', coalesce(s.views, 0), 'likes', (select count(*) from public.article_likes l where l.content_id = x.id),
      'comments', (select count(*) from public.article_comments c where c.content_id = x.id and c.status = 'approved' and c.deleted_at is null),
      'pending', (select count(*) from public.article_comments c where c.content_id = x.id and c.status = 'pending'),
      'fb_helpful', (select count(*) from public.article_feedback f where f.content_id = x.id and f.value = 'helpful'),
      'fb_somewhat', (select count(*) from public.article_feedback f where f.content_id = x.id and f.value = 'somewhat'),
      'fb_not', (select count(*) from public.article_feedback f where f.content_id = x.id and f.value = 'not_helpful'),
      'comments_enabled', coalesce(fl.comments_enabled, true)) order by x.published_at desc nulls last)
    from public.contents x left join public.article_stats s on s.content_id = x.id left join public.article_flags fl on fl.content_id = x.id where x.type = 'article' and x.status <> 'archived'), '[]'::jsonb);
end $$;

create or replace function public.admin_article_flag_set(p_content uuid, p_enabled boolean) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not public.has_perm('content.write') then raise exception 'tidak_diizinkan' using errcode = '42501'; end if;
  if not exists (select 1 from public.contents where id = p_content and type = 'article') then return jsonb_build_object('ok', false, 'error', 'tidak_ditemukan'); end if;
  insert into public.article_flags (content_id, comments_enabled) values (p_content, coalesce(p_enabled, true))
    on conflict (content_id) do update set comments_enabled = excluded.comments_enabled, updated_at = now();
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.admin_article_settings_get() returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not public.has_perm('content.read') then raise exception 'tidak_diizinkan' using errcode = '42501'; end if;
  return jsonb_build_object('comments_enabled', public.ai_setting('comments_enabled'), 'guest_comments', public.ai_setting('guest_comments'), 'premoderate', public.ai_setting('premoderate'),
    'max_links', public.ai_setting('max_links'), 'blocked_words', public.ai_setting('blocked_words'), 'max_length', public.ai_setting('max_length'));
end $$;
create or replace function public.admin_article_settings_set(p_key text, p_value jsonb) returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not public.has_perm('content.write') then raise exception 'tidak_diizinkan' using errcode = '42501'; end if;
  if p_key in ('comments_enabled', 'guest_comments', 'premoderate') then
    if jsonb_typeof(p_value) <> 'boolean' then return jsonb_build_object('ok', false, 'error', 'nilai_tidak_valid'); end if;
  elsif p_key = 'max_links' then
    if jsonb_typeof(p_value) <> 'number' or (p_value)::text::numeric not between 0 and 10 or (p_value)::text::numeric <> trunc((p_value)::text::numeric) then return jsonb_build_object('ok', false, 'error', 'nilai_tidak_valid'); end if;
  elsif p_key = 'max_length' then
    if jsonb_typeof(p_value) <> 'number' or (p_value)::text::numeric not between 100 and 2000 or (p_value)::text::numeric <> trunc((p_value)::text::numeric) then return jsonb_build_object('ok', false, 'error', 'nilai_tidak_valid'); end if;
  elsif p_key = 'blocked_words' then
    if jsonb_typeof(p_value) <> 'array' or jsonb_array_length(p_value) > 100 or exists (select 1 from jsonb_array_elements(p_value) e where jsonb_typeof(e) <> 'string' or char_length(e #>> '{}') > 40) then return jsonb_build_object('ok', false, 'error', 'nilai_tidak_valid'); end if;
  else return jsonb_build_object('ok', false, 'error', 'kunci_tidak_valid'); end if;
  insert into public.article_settings (key, value) values (p_key, p_value) on conflict (key) do update set value = excluded.value, updated_at = now();
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.admin_author_list() returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not public.has_perm('content.read') then raise exception 'tidak_diizinkan' using errcode = '42501'; end if;
  return coalesce((select jsonb_agg(to_jsonb(a) order by a.is_default desc, a.name) from public.article_authors a), '[]'::jsonb);
end $$;
create or replace function public.admin_author_save(p_id uuid, p_name text, p_bio text, p_avatar text, p_links jsonb, p_default boolean default false) returns jsonb
language plpgsql security definer set search_path = public as $$
declare nid uuid; lk jsonb := coalesce(p_links, '[]'::jsonb);
begin
  if not public.has_perm('content.write') then raise exception 'tidak_diizinkan' using errcode = '42501'; end if;
  if char_length(btrim(coalesce(p_name, ''))) not between 2 and 80 then return jsonb_build_object('ok', false, 'error', 'nama_tidak_valid'); end if;
  if char_length(coalesce(p_bio, '')) > 600 then return jsonb_build_object('ok', false, 'error', 'bio_terlalu_panjang'); end if;
  if nullif(btrim(coalesce(p_avatar, '')), '') is not null and btrim(p_avatar) !~ '^(https://[^[:space:]"<>]+|/[^[:space:]"<>]*)$' then return jsonb_build_object('ok', false, 'error', 'url_tidak_valid'); end if;
  if jsonb_typeof(lk) <> 'array' or jsonb_array_length(lk) > 5 or exists (select 1 from jsonb_array_elements(lk) e where jsonb_typeof(e) <> 'object' or char_length(coalesce(e ->> 'label', '')) not between 1 and 30 or coalesce(e ->> 'url', '') !~ '^https://[^[:space:]"<>]+$') then
    return jsonb_build_object('ok', false, 'error', 'tautan_tidak_valid'); end if;
  if p_default then update public.article_authors set is_default = false where is_default and id is distinct from p_id; end if;
  if p_id is null then
    insert into public.article_authors (name, bio, avatar_url, links, is_default) values (btrim(p_name), nullif(btrim(coalesce(p_bio, '')), ''), nullif(btrim(coalesce(p_avatar, '')), ''), lk, coalesce(p_default, false)) returning id into nid;
  else
    update public.article_authors set name = btrim(p_name), bio = nullif(btrim(coalesce(p_bio, '')), ''), avatar_url = nullif(btrim(coalesce(p_avatar, '')), ''), links = lk, is_default = coalesce(p_default, is_default) where id = p_id returning id into nid;
    if nid is null then return jsonb_build_object('ok', false, 'error', 'tidak_ditemukan'); end if;
  end if;
  return jsonb_build_object('ok', true, 'id', nid);
end $$;
create or replace function public.admin_author_delete(p_id uuid) returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not public.has_perm('content.delete') then raise exception 'tidak_diizinkan' using errcode = '42501'; end if;
  if exists (select 1 from public.article_authors where id = p_id and is_default) then return jsonb_build_object('ok', false, 'error', 'penulis_bawaan'); end if;
  delete from public.article_authors where id = p_id;
  return jsonb_build_object('ok', true);
end $$;
create or replace function public.admin_article_set_author(p_content uuid, p_author uuid) returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not public.has_perm('content.write') then raise exception 'tidak_diizinkan' using errcode = '42501'; end if;
  if p_author is not null and not exists (select 1 from public.article_authors where id = p_author) then return jsonb_build_object('ok', false, 'error', 'penulis_tidak_ditemukan'); end if;
  update public.contents set author_id = p_author where id = p_content and type = 'article';
  if not found then return jsonb_build_object('ok', false, 'error', 'tidak_ditemukan'); end if;
  return jsonb_build_object('ok', true);
end $$;

----------------------------------------------------------------------------- 11. Hak eksekusi
do $$ declare f text; begin
  foreach f in array array['ai_setting(text)','ai_viewer(text)','ai_ip()','ai_content_id(text,text)','ai_comments_open(uuid)','ai_name(uuid,text,boolean)','ai_read_min(text)','ai_clean(text)','ai_rate(text,integer,integer)','ai_notify(uuid,text,uuid,uuid,text)','ai_comment_trg()','ai_reaction_trg()'] loop
    execute format('revoke all on function public.%s from public, anon, authenticated', f);
  end loop;
  foreach f in array array['article_engagement(text,text,text)','article_track_view(text,text,text)','article_like_toggle(text,text,text)','article_feedback_set(text,text,text,text)',
    'article_comments_list(text,text,text,integer,integer,text)','article_comment_add(text,text,text,uuid,text,text,text)','article_comment_edit(uuid,text,text)','article_comment_delete(uuid,text)',
    'comment_like_toggle(uuid,text)','comment_report(uuid,text,text)'] loop
    execute format('revoke all on function public.%s from public', f);
    execute format('grant execute on function public.%s to anon, authenticated', f);
  end loop;
  foreach f in array array['article_save_set(text,text,boolean)','my_saved_articles(integer,integer)','my_article_notifs(integer)','article_notifs_read()','article_notif_prefs_get()','article_notif_prefs_set(boolean,boolean,boolean)',
    'admin_comments_list(text,text,uuid,integer,integer)','admin_comment_set_status(uuid,text)','admin_comment_delete(uuid)','admin_comment_reply(uuid,text)','admin_reports_list(integer)','admin_report_resolve(uuid,text)',
    'admin_article_stats()','admin_article_flag_set(uuid,boolean)','admin_article_settings_get()','admin_article_settings_set(text,jsonb)','admin_author_list()','admin_author_save(uuid,text,text,text,jsonb,boolean)',
    'admin_author_delete(uuid)','admin_article_set_author(uuid,uuid)'] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;
