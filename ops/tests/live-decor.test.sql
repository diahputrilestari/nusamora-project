-- Uji DB admin-live-decor.sql: validasi dekor, simpan venue berdekor, live_theme menyertakan decor.
\set ON_ERROR_STOP on
\set QUIET on
do $$ declare ok1 boolean; begin
  if not public.live_decor_ok(null) or not public.live_decor_ok('{}') then raise exception 'null/kosong harus valid'; end if;
  if not public.live_decor_ok('{"table":{"url":"https://x.test/a.webp"},"lamp":{"url":"/aset/l.png","w":1.4}}') then raise exception 'dekor sah harus valid'; end if;
  if public.live_decor_ok('[]') or public.live_decor_ok('{"meja":{"url":"https://x.test/a.png"}}') then raise exception 'bentuk/slot salah harus ditolak'; end if;
  if public.live_decor_ok('{"table":{"url":"http://x.test/a.png"}}') or public.live_decor_ok('{"table":{"url":"//x.test/a.png"}}') or public.live_decor_ok('{"table":{"url":"javascript:alert(1)"}}') or public.live_decor_ok('{"table":{"url":"data:image/png;base64,AAAA"}}') then raise exception 'url tidak aman harus ditolak'; end if;
  if public.live_decor_ok('{"table":{"url":"https://x.test/a b.png"}}') or public.live_decor_ok('{"table":{"url":"https://x.test/a\"b.png"}}') then raise exception 'url dengan spasi/kutip harus ditolak'; end if;
  if public.live_decor_ok('{"table":{"url":"https://x.test/a.png","x":1}}') or public.live_decor_ok('{"table":{"url":"https://x.test/a.png","w":99}}') or public.live_decor_ok('{"table":{"url":"https://x.test/a.png","w":"1"}}') or public.live_decor_ok('{"table":"https://x.test/a.png"}') then raise exception 'kunci/lebar salah harus ditolak'; end if;
  begin insert into public.live_venues (key, name, areas, decor) values ('ld-bad', 'Bad', '[]', '{"hack":{"url":"https://x.test/a.png"}}'); raise exception 'constraint seharusnya menolak'; exception when check_violation then null; end;
  -- fungsi simpan & live_theme diwakili oleh live-theme.test.sql (dijalankan setelah rantai SQL ini); cek keberadaan kolom/fungsi
  if not exists (select 1 from information_schema.columns where table_name = 'live_venues' and column_name = 'decor') then raise exception 'kolom decor tidak ada'; end if;
  if pg_get_functiondef('public.live_theme(text)'::regprocedure) not like '%''decor'', v.decor%' then raise exception 'live_theme harus mengirim decor'; end if;
  if pg_get_functiondef('public.admin_live_venue_save(jsonb)'::regprocedure) not like '%live_decor_ok%' then raise exception 'simpan venue harus memeriksa decor'; end if;
  -- admin-live-theme-areas.sql: resepsi & video mati di midnight-party saja, area lain tetap
  if (select count(*) from public.live_venues v, jsonb_array_elements(v.areas) e where v.key = 'midnight-party' and e ->> 'id' in ('resepsi', 'video') and (e ->> 'enabled')::boolean) <> 0 then raise exception 'resepsi/video harus nonaktif di midnight-party'; end if;
  if (select count(*) from public.live_venues v, jsonb_array_elements(v.areas) e where v.key = 'midnight-party' and (e ->> 'enabled')::boolean) <> 6 then raise exception 'enam area lain harus tetap aktif'; end if;
  if (select count(*) from public.live_venues v, jsonb_array_elements(v.areas) e where v.key = 'romantic-garden' and e ->> 'id' in ('resepsi', 'video') and (e ->> 'enabled')::boolean) <> 2 then raise exception 'venue lain tidak boleh berubah'; end if;
  -- admin-live-theme-viking.sql: venue contoh valid, nonaktif, semua area tetap aktif
  if not exists (select 1 from public.live_venues where key = 'viking-feast' and event_type = 'birthday' and not active and public.live_theme_ok(nm_theme)) then raise exception 'venue viking-feast tidak ada / tema tidak valid'; end if;
  raise notice 'OK live_decor (validator)';
end $$;
