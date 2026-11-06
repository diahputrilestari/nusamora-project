set role service_role;
do $$ declare r jsonb; i int; ok int := 0; blocked int := 0; ev int; begin
  -- 1. batas 5/60s
  for i in 1..8 loop r := public.rl_hit('keytest-aaaa1111', 5, 60); if (r->>'allowed')::boolean then ok := ok+1; else blocked := blocked+1; end if; end loop;
  assert ok = 5 and blocked = 3, format('batas: ok=%s blocked=%s', ok, blocked);
  assert (r->>'retry_after')::int between 1 and 60, 'retry_after';
  select count(*) into ev from public.security_events where actor = 'keytest-aaaa1111'; assert ev = 1, 'log sekali per jendela: '||ev;
  -- 2. kunci berbeda tidak saling memengaruhi
  assert (public.rl_hit('keytest-bbbb2222', 5, 60)->>'allowed')::boolean, 'isolasi kunci';
  -- 3. jendela baru setelah berakhir (simulasi) dan jendela bersih mereset
  update public.rate_limits set window_start = now() - interval '2 minutes', blocked_until = null where key = 'keytest-bbbb2222';
  assert (public.rl_hit('keytest-bbbb2222', 5, 60)->>'allowed')::boolean, 'jendela baru';
  update public.rate_limits set window_start = now() - interval '2 minutes', blocked_until = null where key = 'keytest-aaaa1111';
  r := public.rl_hit('keytest-aaaa1111', 5, 60); assert (r->>'allowed')::boolean, 'diizinkan lagi setelah blok berakhir';
  -- 4. eskalasi: 3 jendela berturut-turut melanggar -> cooldown
  for i in 1..3 loop
    update public.rate_limits set window_start = now() - interval '2 minutes', blocked_until = null where key = 'keytest-cccc3333';
    for ok in 1..7 loop r := public.rl_hit('keytest-cccc3333', 5, 60); end loop;
  end loop;
  assert (select strikes from public.rate_limits where key='keytest-cccc3333') >= 3, 'strikes';
  assert (r->>'retry_after')::int > 60, 'cooldown lebih panjang dari jendela: '||(r->>'retry_after');
  assert exists (select 1 from public.security_events where kind='cooldown' and actor='keytest-cccc3333'), 'event cooldown';
  -- 5. argumen tak valid tidak memblokir
  assert (public.rl_hit('x', 5, 60)->>'allowed')::boolean, 'kunci pendek';
  raise notice 'RL fungsional OK';
end $$;
reset role;
-- 6. hak akses
set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
do $$ begin begin perform public.rl_hit('keytest-dddd4444', 5, 60); raise exception 'SEHARUSNYA DITOLAK'; exception when insufficient_privilege then null; end;
 begin perform count(*) from public.rate_limits; raise exception 'SEHARUSNYA DITOLAK'; exception when insufficient_privilege then null; end;
 begin perform public.log_security_event('x','y'); raise exception 'SEHARUSNYA DITOLAK'; exception when insufficient_privilege then null; end;
 assert (select count(*) from public.security_events) = 0, 'pengguna biasa tidak melihat event';
 raise notice 'Hak akses OK'; end $$;
reset role; set role anon;
do $$ begin begin perform public.rl_hit('keytest-eeee5555', 5, 60); raise exception 'SEHARUSNYA DITOLAK'; exception when insufficient_privilege then null; end; raise notice 'anon ditolak OK'; end $$;
reset role;
-- 7. hook lockout
do $$ declare u uuid := gen_random_uuid(); r jsonb; i int; begin
  for i in 1..4 loop r := public.hook_password_verification_attempt(jsonb_build_object('user_id', u, 'valid', false)); assert r->>'decision' = 'continue', 'gagal ke-'||i; end loop;
  r := public.hook_password_verification_attempt(jsonb_build_object('user_id', u, 'valid', false)); assert r->>'decision' = 'reject', 'kunci pada gagal ke-5';
  r := public.hook_password_verification_attempt(jsonb_build_object('user_id', u, 'valid', true)); assert r->>'decision' = 'reject', 'password benar tetap ditolak saat dikunci';
  update public.login_attempts set locked_until = now() - interval '1 second' where user_id = u;
  r := public.hook_password_verification_attempt(jsonb_build_object('user_id', u, 'valid', true)); assert r->>'decision' = 'continue', 'berhasil setelah kunci berakhir';
  assert (select fails from public.login_attempts where user_id = u) = 0, 'reset setelah sukses';
  assert exists (select 1 from public.security_events where kind='login_lockout' and actor=u::text), 'log lockout';
  raise notice 'Hook lockout OK'; end $$;
