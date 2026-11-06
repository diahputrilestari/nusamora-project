-- NusaMora — Keamanan P0.3 (rate limit, cooldown, log kejadian mencurigakan) & P0.4 (MFA admin)
-- Jalankan TERAKHIR (setelah asset-schema.sql). Idempotent. BACKUP dulu (ops/backup/backup-db.sh).
-- Bagian MFA ada di backend/security-mfa.sql.

----------------------------------------------------------------------------- 1. Tabel
create table if not exists public.rate_limits (
  key          text primary key,                 -- sudah di-hash oleh pemanggil (tidak menyimpan IP/ID mentah)
  window_start timestamptz not null default now(),
  hits         int not null default 0,
  strikes      int not null default 0,           -- jumlah pelanggaran beruntun; memicu cooldown lebih panjang
  blocked_until timestamptz,
  updated_at   timestamptz not null default now()
);
create table if not exists public.security_events (
  id     bigint generated always as identity primary key,
  at     timestamptz not null default now(),
  kind   text not null,                          -- rate_limited | cooldown | webhook_bad_signature | login_lockout | mfa_required ...
  actor  text,                                   -- user id atau hash sumber; tidak pernah password/token/kartu
  detail jsonb not null default '{}'::jsonb
);
create index if not exists security_events_at_idx on public.security_events (at desc);
alter table public.rate_limits enable row level security;
alter table public.security_events enable row level security;
revoke all on public.rate_limits, public.security_events from anon, authenticated;
drop policy if exists "admin baca" on public.security_events;
create policy "admin baca" on public.security_events for select to authenticated using (public.has_perm('admins.read'));
grant select on public.security_events to authenticated;

----------------------------------------------------------------------------- 2. Log kejadian
create or replace function public.log_security_event(p_kind text, p_actor text, p_detail jsonb default '{}'::jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.security_events(kind, actor, detail)
  values (left(coalesce(p_kind, 'unknown'), 60), left(p_actor, 80), coalesce(p_detail, '{}'::jsonb));
end $$;
revoke all on function public.log_security_event(text, text, jsonb) from public, anon, authenticated;
grant execute on function public.log_security_event(text, text, jsonb) to service_role;

----------------------------------------------------------------------------- 3. rl_hit — penghitung jendela tetap atomik + cooldown eskalatif
-- Hasil: {allowed, remaining, retry_after}. Pelanggaran 1–2: blok sampai jendela berakhir. Pelanggaran >=3 berturut-turut
-- (tanpa jendela bersih di antaranya): cooldown min(3600, window * strikes) detik. Jendela bersih mereset strikes.
create or replace function public.rl_hit(p_key text, p_limit int, p_window_secs int, p_kind text default 'rate_limited')
returns jsonb language plpgsql security definer set search_path = public as $$
declare r public.rate_limits; v_now timestamptz := clock_timestamp(); v_retry int; v_block boolean := false;
begin
  if p_key is null or length(p_key) < 8 or p_limit < 1 or p_window_secs < 1 then
    return jsonb_build_object('allowed', true, 'remaining', 0, 'retry_after', 0);  -- argumen tak valid: jangan memblokir
  end if;
  insert into public.rate_limits(key, window_start, hits, updated_at) values (p_key, v_now, 0, v_now) on conflict (key) do nothing;
  select * into r from public.rate_limits where key = p_key for update;           -- kunci baris: atomik antar-permintaan
  if r.blocked_until is not null and r.blocked_until > v_now then
    return jsonb_build_object('allowed', false, 'remaining', 0, 'retry_after', ceil(extract(epoch from r.blocked_until - v_now))::int);
  end if;
  if v_now >= r.window_start + make_interval(secs => p_window_secs) then          -- jendela baru
    if r.hits <= p_limit then r.strikes := 0; end if;                             -- jendela sebelumnya bersih -> reset
    r.window_start := v_now; r.hits := 0; r.blocked_until := null;
  end if;
  r.hits := r.hits + 1;
  if r.hits > p_limit then
    v_block := true;
    if r.hits = p_limit + 1 then r.strikes := r.strikes + 1; end if;              -- satu pelanggaran per jendela
    if r.strikes >= 3 then r.blocked_until := v_now + make_interval(secs => least(3600, p_window_secs * r.strikes));
    else r.blocked_until := r.window_start + make_interval(secs => p_window_secs); end if;
    v_retry := greatest(1, ceil(extract(epoch from r.blocked_until - v_now))::int);
    if r.hits = p_limit + 1 then                                                  -- catat sekali per jendela (anti banjir log)
      insert into public.security_events(kind, actor, detail)
      values (case when r.strikes >= 3 then 'cooldown' else p_kind end, left(p_key, 80), jsonb_build_object('limit', p_limit, 'window', p_window_secs, 'strikes', r.strikes, 'retry_after', v_retry));
    end if;
  end if;
  update public.rate_limits set window_start = r.window_start, hits = r.hits, strikes = r.strikes, blocked_until = r.blocked_until, updated_at = v_now where key = p_key;
  if random() < 0.01 then                                                          -- pembersihan oportunistik
    delete from public.rate_limits where updated_at < now() - interval '2 days';
    delete from public.security_events where at < now() - interval '90 days';
  end if;
  if v_block then return jsonb_build_object('allowed', false, 'remaining', 0, 'retry_after', v_retry); end if;
  return jsonb_build_object('allowed', true, 'remaining', p_limit - r.hits, 'retry_after', 0);
end $$;
revoke all on function public.rl_hit(text, int, int, text) from public, anon, authenticated;
grant execute on function public.rl_hit(text, int, int, text) to service_role;

----------------------------------------------------------------------------- 4. Batas unggah pelanggan (bucket invitation-media)
-- Unggah langsung dari browser ke Storage (tidak lewat server kita), jadi dibatasi di kebijakan Storage:
-- maks 40 berkas / jam dan 400 berkas total per pengguna. Ukuran (3 MB) & MIME sudah dibatasi di bucket.
drop policy if exists "invitation-media unggah sendiri" on storage.objects;
create policy "invitation-media unggah sendiri" on storage.objects for insert to authenticated with check (
  bucket_id = 'invitation-media' and (storage.foldername(name))[1] = auth.uid()::text
  and (select count(*) from storage.objects o where o.bucket_id = 'invitation-media' and o.name like auth.uid()::text || '/%' and o.created_at > now() - interval '1 hour') < 40
  and (select count(*) from storage.objects o where o.bucket_id = 'invitation-media' and o.name like auth.uid()::text || '/%') < 400
);

----------------------------------------------------------------------------- 5. Hook verifikasi password (brute-force login) — Supabase Auth Hook
-- Aktifkan di Dashboard > Authentication > Hooks > "Password verification attempt" -> pilih fungsi ini. Ketersediaan hook
-- bergantung paket Supabase [VERIFIKASI]. Aturan: 5 kegagalan dalam 15 menit -> tolak login 15 menit (sukses mereset).
create table if not exists public.login_attempts (
  user_id uuid primary key, fails int not null default 0, first_fail timestamptz, locked_until timestamptz
);
alter table public.login_attempts enable row level security;
revoke all on public.login_attempts from anon, authenticated;
create or replace function public.hook_password_verification_attempt(event jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := nullif(event->>'user_id', '')::uuid; ok boolean := coalesce((event->>'valid')::boolean, false); a public.login_attempts; v_now timestamptz := now();
begin
  if uid is null then return jsonb_build_object('decision', 'continue'); end if;
  insert into public.login_attempts(user_id) values (uid) on conflict do nothing;
  select * into a from public.login_attempts where user_id = uid for update;
  if a.locked_until is not null and a.locked_until > v_now then
    return jsonb_build_object('decision', 'reject', 'message', 'Terlalu banyak percobaan masuk. Coba lagi beberapa menit lagi.');
  end if;
  if ok then
    update public.login_attempts set fails = 0, first_fail = null, locked_until = null where user_id = uid;
    return jsonb_build_object('decision', 'continue');
  end if;
  if a.first_fail is null or a.first_fail < v_now - interval '15 minutes' then a.fails := 0; a.first_fail := v_now; end if;
  a.fails := a.fails + 1;
  if a.fails >= 5 then
    update public.login_attempts set fails = a.fails, first_fail = a.first_fail, locked_until = v_now + interval '15 minutes' where user_id = uid;
    insert into public.security_events(kind, actor, detail) values ('login_lockout', uid::text, jsonb_build_object('fails', a.fails));
    return jsonb_build_object('decision', 'reject', 'message', 'Terlalu banyak percobaan masuk. Coba lagi dalam 15 menit.');
  end if;
  update public.login_attempts set fails = a.fails, first_fail = a.first_fail where user_id = uid;
  return jsonb_build_object('decision', 'continue');
end $$;
revoke all on function public.hook_password_verification_attempt(jsonb) from public, anon, authenticated;
grant execute on function public.hook_password_verification_attempt(jsonb) to supabase_auth_admin;
