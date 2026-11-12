-- Uji DB template-meta.sql: label budaya pada template awal, dan template_popularity() (hanya aktif & belum kedaluwarsa, hanya agregat, hak akses).
\set ON_ERROR_STOP on
\set QUIET on
delete from auth.users where email like 'tm.%@uji.nusamora.test';
delete from public.invitations where slug like 'tm-%';
create or replace function pg_temp.as_user(u uuid) returns void language plpgsql as $$ begin reset role; perform set_config('request.jwt.claim.sub', u::text, false); perform set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated')::text, false); set role authenticated; end $$;
create or replace function pg_temp.as_anon() returns void language plpgsql as $$ begin reset role; perform set_config('request.jwt.claim.sub', '', false); perform set_config('request.jwt.claims', '', false); set role anon; end $$;
grant execute on function pg_temp.as_user(uuid), pg_temp.as_anon() to public;

do $$ begin
  if (select capabilities->>'culture' from public.templates where slug = 'jawa-tengah-2d') is distinct from 'Jawa' then raise exception 'budaya Jawa tidak terpasang'; end if;
  if (select capabilities->>'culture' from public.templates where slug = 'romantic-garden-2d') is distinct from 'Umum' then raise exception 'budaya Umum tidak terpasang'; end if;
  if (select count(*) from public.templates where status = 'published' and slug in ('jawa-tengah-2d','romantic-garden-2d') and capabilities ? 'palettes') <> 2 then raise exception 'palet hilang (menimpa capabilities?)'; end if;
  raise notice 'OK budaya template awal + palet utuh';
end $$;
-- idempoten: jalankan ulang tidak mengubah apa pun
\i backend/template-meta.sql
do $$ begin if (select capabilities->>'culture' from public.templates where slug = 'jawa-tengah-2d') <> 'Jawa' then raise exception 'idempotensi'; end if; raise notice 'OK idempoten'; end $$;

do $$ declare o uuid := gen_random_uuid(); begin
  insert into auth.users (id, email) values (o, 'tm.owner@uji.nusamora.test');
  insert into public.invitations (user_id, title, status, slug, plan_id, template_id, expires_at, content) values
    (o, 'A1', 'aktif', 'tm-a1', 'essential', 'jawa-tengah-2d', now() + interval '30 days', '{}'),
    (o, 'A2', 'aktif', 'tm-a2', 'essential', 'jawa-tengah-2d', now() + interval '30 days', '{}'),
    (o, 'D1', 'draft', 'tm-d1', 'essential', 'jawa-tengah-2d', now() + interval '30 days', '{}'),
    (o, 'E1', 'aktif', 'tm-e1', 'essential', 'jawa-tengah-2d', now() - interval '1 day', '{}'),
    (o, 'R1', 'aktif', 'tm-r1', 'essential', 'romantic-garden-2d', now() + interval '30 days', '{}');
  perform set_config('tm.owner', o::text, false);
end $$;
do $$ declare r jsonb; begin
  perform pg_temp.as_user(current_setting('tm.owner')::uuid);
  r := public.template_popularity();
  reset role;
  if (r->>'jawa-tengah-2d')::int <> 2 then raise exception 'hitung jawa-tengah-2d harus 2 (aktif saja, tanpa draft/kedaluwarsa): %', r; end if;
  if (r->>'romantic-garden-2d')::int <> 1 then raise exception 'hitung romantic-garden-2d harus 1: %', r; end if;
  if r ? 'jawa-tengah-3d' then raise exception 'template tanpa undangan tidak boleh muncul: %', r; end if;
  if r::text ~* 'tm-a1|tm\.owner|Uji|A1' then raise exception 'bocor data undangan/pengguna: %', r; end if;
  raise notice 'OK popularitas: hanya aktif & belum kedaluwarsa, hanya agregat';
end $$;
do $$ begin
  perform pg_temp.as_anon();
  begin perform public.template_popularity(); raise exception 'anon seharusnya ditolak'; exception when insufficient_privilege then null; end;
  reset role; raise notice 'OK anon tidak bisa memanggil template_popularity';
end $$;
delete from auth.users where email like 'tm.%@uji.nusamora.test';
delete from public.invitations where slug like 'tm-%';
\echo SEMUA LULUS
