-- Uji DB admin-content.sql: validasi, slug unik per bahasa, jadwal tayang, riwayat revisi + pulihkan, terjemahan, media, fungsi publik, hak akses.
\set ON_ERROR_STOP on
\set QUIET on
delete from public.content_media where path like 'media/ct-%'; delete from storage.objects where bucket_id = 'site-assets' and name like 'media/ct-%';
delete from public.contents where title like 'CT %';
delete from auth.users where email like 'ct.%@uji.nusamora.test';
create or replace function pg_temp.as_user(u uuid) returns void language plpgsql as $$ begin reset role; perform set_config('request.jwt.claim.sub', u::text, false); perform set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated')::text, false); set role authenticated; end $$;
grant execute on function pg_temp.as_user(uuid) to public;
create or replace function pg_temp.as_anon() returns void language plpgsql as $$ begin reset role; perform set_config('request.jwt.claim.sub', '', false); perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, false); set role anon; end $$;
grant execute on function pg_temp.as_anon() to public;
do $$ declare c uuid := gen_random_uuid(); s uuid := gen_random_uuid(); n uuid := gen_random_uuid(); begin
  insert into auth.users (id, email) values (c, 'ct.cm@uji.nusamora.test'), (s, 'ct.sup@uji.nusamora.test'), (n, 'ct.cust@uji.nusamora.test');
  insert into public.profiles (id, full_name) values (c, 'Content Uji'), (s, 'Support Uji'), (n, 'Pelanggan Uji') on conflict (id) do update set full_name = excluded.full_name;
  insert into public.admin_users (user_id, role) values (c, 'content'), (s, 'support');
  perform set_config('ct.cm', c::text, false); perform set_config('ct.sup', s::text, false); perform set_config('ct.cust', n::text, false);
end $$;

-- 1. Validasi
do $$ declare r jsonb; begin
  perform pg_temp.as_user(current_setting('ct.cm')::uuid);
  r := public.admin_content_save(null, 'article', '{"title":"CT A","body":"isi"}'); if r ->> 'error' <> 'slug_wajib' then raise exception 'slug wajib: %', r; end if;
  r := public.admin_content_save(null, 'article', '{"title":"CT A","slug":"Judul Salah","body":"isi"}'); if r ->> 'error' <> 'slug_tidak_valid' then raise exception 'slug format: %', r; end if;
  r := public.admin_content_save(null, 'article', '{"title":"CT A","slug":"admin","body":"isi"}'); if r ->> 'error' <> 'slug_dicadangkan' then raise exception 'slug dicadangkan: %', r; end if;
  r := public.admin_content_save(null, 'article', '{"title":"C","slug":"ct-a"}'); if r ->> 'error' <> 'judul_tidak_valid' then raise exception 'judul: %', r; end if;
  r := public.admin_content_save(null, 'article', '{"title":"CT A","slug":"ct-a","canonical_url":"http://x.com/a"}'); if r ->> 'error' <> 'url_tidak_valid' then raise exception 'canonical https: %', r; end if;
  r := public.admin_content_save(null, 'article', '{"title":"CT A","slug":"ct-a","og_image_url":"javascript:alert(1)"}'); if r ->> 'error' <> 'url_tidak_valid' then raise exception 'og url: %', r; end if;
  r := public.admin_content_save(null, 'banner', '{"title":"CT B","link_url":"javascript:alert(1)"}'); if r ->> 'error' <> 'url_tidak_valid' then raise exception 'link berbahaya: %', r; end if;
  r := public.admin_content_save(null, 'article', jsonb_build_object('title','CT A','slug','ct-a','publish_at',now(),'unpublish_at',now() - interval '1 day')); if r ->> 'error' <> 'jadwal_tidak_valid' then raise exception 'jadwal: %', r; end if;
  r := public.admin_content_save(null, 'article', '{"title":"CT A","slug":"ct-a","status":"published"}'); if r ->> 'error' <> 'konten_belum_lengkap' then raise exception 'terbit tanpa isi: %', r; end if;
  r := public.admin_content_save(null, 'banner', '{"title":"CT B","status":"published"}'); if r ->> 'error' <> 'konten_belum_lengkap' then raise exception 'banner tanpa gambar: %', r; end if;
  r := public.admin_content_save(null, 'article', '{"title":"CT A","slug":"ct-a","lang":"fr"}'); if r ->> 'error' <> 'bahasa_tidak_valid' then raise exception 'bahasa: %', r; end if;
  raise notice 'OK validasi: slug (wajib/format/dicadangkan), judul, URL https, link berbahaya, jadwal, kelengkapan sebelum terbit';
end $$;

-- 2. Slug unik per bahasa, terjemahan, revisi
do $$ declare r jsonb; a uuid; e uuid; v int; rv record; begin
  perform pg_temp.as_user(current_setting('ct.cm')::uuid);
  r := public.admin_content_save(null, 'article', '{"title":"CT Artikel","slug":"ct-artikel","body":"Isi pertama","excerpt":"Ringkas","seo_title":"Judul SEO","seo_description":"Deskripsi"}', 'Draf awal');
  if (r ->> 'ok')::boolean is not true then raise exception 'simpan gagal: %', r; end if; a := (r ->> 'id')::uuid; perform set_config('ct.a', a::text, false);
  r := public.admin_content_save(null, 'article', '{"title":"CT Dup","slug":"ct-artikel","body":"x"}'); if r ->> 'error' <> 'slug_dipakai' then raise exception 'slug harus unik: %', r; end if;
  r := public.admin_content_save(null, 'page', '{"title":"CT Page","slug":"ct-artikel","body":"x"}'); if (r ->> 'ok')::boolean is not true then raise exception 'slug boleh sama pada jenis berbeda: %', r; end if;
  -- terjemahan
  r := public.admin_content_save(null, 'article', jsonb_build_object('title','CT Article','slug','ct-artikel','lang','en','translation_of',a,'body','First body')); if (r ->> 'ok')::boolean is not true then raise exception 'slug sama beda bahasa harus boleh: %', r; end if; e := (r ->> 'id')::uuid;
  r := public.admin_content_save(null, 'article', jsonb_build_object('title','CT Article 2','slug','ct-article-2','lang','en','translation_of',a,'body','x')); if r ->> 'error' <> 'terjemahan_sudah_ada' then raise exception 'terjemahan ganda: %', r; end if;
  r := public.admin_content_save(null, 'article', jsonb_build_object('title','CT Salah','slug','ct-salah','lang','id','translation_of',a,'body','x')); if r ->> 'error' <> 'terjemahan_tidak_valid' then raise exception 'terjemahan bahasa sama: %', r; end if;
  reset role;
  perform pg_temp.as_user(current_setting('ct.cm')::uuid);
  -- revisi
  r := public.admin_content_save(a, null, '{"body":"Isi kedua","seo_title":"Judul SEO baru"}', 'Perbaiki isi'); if (r ->> 'ok')::boolean is not true then raise exception 'ubah: %', r; end if;
  r := public.admin_content_save(a, null, '{"body":"Isi kedua"}'); -- tidak ada perubahan
  select max(version) into v from public.admin_content_revisions(a); if v <> 2 then raise exception 'tanpa perubahan tidak boleh membuat revisi (versi %)', v; end if;
  select * into rv from public.admin_content_revisions(a) where version = 2;
  if rv.note <> 'Perbaiki isi' or rv.actor_name <> 'Content Uji' or not (rv.changed @> array['body','seo_title']) or array_length(rv.changed, 1) <> 2 then raise exception 'revisi 2 salah: %', rv; end if;
  select * into rv from public.admin_content_revisions(a) where version = 1; if rv.snapshot ->> 'body' <> 'Isi pertama' or rv.note <> 'Draf awal' then raise exception 'revisi 1 salah'; end if;
  -- terbit, lalu pulihkan ke v1 : hasilnya draft
  r := public.admin_content_save(a, null, '{"status":"published"}'); if (r ->> 'ok')::boolean is not true then raise exception 'terbit: %', r; end if;
  if (select published_at from public.contents where id = a) is null then raise exception 'published_at harus terisi'; end if;
  r := public.admin_content_restore(a, 1); if (r ->> 'ok')::boolean is not true then raise exception 'pulihkan: %', r; end if;
  if (select body || '|' || status from public.contents where id = a) <> 'Isi pertama|draft' then raise exception 'pulihkan harus mengembalikan isi dan menjadikan draft'; end if;
  if (select note from public.admin_content_revisions(a) where version = (select max(version) from public.admin_content_revisions(a))) <> 'Dipulihkan dari versi 1' then raise exception 'catatan pulihkan'; end if;
  r := public.admin_content_restore(a, 99); if r ->> 'error' <> 'revisi_tidak_ditemukan' then raise exception 'versi tak ada: %', r; end if;
  raise notice 'OK slug unik per jenis+bahasa, terjemahan (satu per bahasa), revisi (siapa/apa/alasan), tanpa perubahan tanpa revisi, pulihkan = draft';
end $$;

-- 3. Jadwal tayang dan fungsi publik
do $$ declare r jsonb; a uuid := current_setting('ct.a')::uuid; p jsonb; n int; begin
  perform pg_temp.as_user(current_setting('ct.cm')::uuid);
  r := public.admin_content_save(a, null, jsonb_build_object('status','published','publish_at', now() + interval '2 days'));
  perform pg_temp.as_anon();
  if public.public_content('article', 'ct-artikel', 'id') is not null then raise exception 'konten terjadwal belum boleh tayang'; end if;
  select count(*) into n from public.contents where id = a; if n <> 0 then raise exception 'RLS: anon tidak boleh membaca konten terjadwal'; end if;
  perform pg_temp.as_user(current_setting('ct.cm')::uuid);
  r := public.admin_content_save(a, null, jsonb_build_object('publish_at', now() - interval '1 hour', 'unpublish_at', now() + interval '1 day', 'og_image_url', 'https://x.test/og.png'));
  perform pg_temp.as_anon();
  p := public.public_content('article', 'ct-artikel', 'id');
  if p is null or p ->> 'title' <> 'CT Artikel' or p ->> 'og_image_url' <> 'https://x.test/og.png' then raise exception 'konten dalam jadwal harus tayang: %', p; end if;
  if p ? 'created_by' or p ? 'updated_by' then raise exception 'data internal tidak boleh bocor'; end if;
  if jsonb_array_length(p -> 'alternates') <> 0 then raise exception 'terjemahan yang belum terbit tidak boleh jadi alternatif: %', p -> 'alternates'; end if;
  -- terjemahan EN belum terbit: tidak jadi alternatif; setelah terbit ya
  perform pg_temp.as_user(current_setting('ct.cm')::uuid);
  r := public.admin_content_save((select id from public.contents where title = 'CT Article'), null, '{"status":"published"}');
  perform pg_temp.as_anon();
  p := public.public_content('article', 'ct-artikel', 'en'); if p ->> 'title' <> 'CT Article' or p #>> '{alternates,0,lang}' <> 'id' then raise exception 'alternates terbalik: %', p; end if;
  if public.public_content('article', 'ct-artikel', 'id') #>> '{alternates,0,lang}' <> 'en' then raise exception 'alternates sisi ID harus memuat en'; end if;
  perform pg_temp.as_user(current_setting('ct.cm')::uuid);
  r := public.admin_content_save(a, null, jsonb_build_object('unpublish_at', now() - interval '1 minute', 'publish_at', now() - interval '2 hours'));
  perform pg_temp.as_anon();
  if public.public_content('article', 'ct-artikel', 'id') is not null then raise exception 'konten yang sudah berakhir tidak boleh tayang'; end if;
  if public.public_content('article', 'ct-artikel', 'fr') is not null then raise exception 'bahasa lain tidak boleh cocok'; end if;
  -- daftar publik: faq membawa isi, artikel tidak
  reset role; perform pg_temp.as_user(current_setting('ct.cm')::uuid);
  perform public.admin_content_save(null, 'faq', '{"title":"CT Tanya","body":"Jawaban","status":"published","sort":1}');
  perform public.admin_content_save(null, 'article', '{"title":"CT Artikel Terbit","slug":"ct-terbit","body":"Isi panjang","excerpt":"ringkas","status":"published","noindex":true}');
  perform pg_temp.as_anon();
  p := public.public_content_list('faq', 'id', 50); if not exists (select 1 from jsonb_array_elements(p) x where x ->> 'title' = 'CT Tanya' and x ->> 'body' = 'Jawaban') then raise exception 'daftar FAQ: %', p; end if;
  p := public.public_content_list('article', 'id', 50); if exists (select 1 from jsonb_array_elements(p) x where x ? 'body' and x ->> 'body' is not null) then raise exception 'daftar artikel tidak boleh membawa isi'; end if;
  -- sitemap: noindex dan arsip tidak ikut
  p := public.public_sitemap(); if exists (select 1 from jsonb_array_elements(p) x where x ->> 'slug' = 'ct-terbit') then raise exception 'noindex tidak boleh masuk sitemap'; end if;
  reset role;
  raise notice 'OK jadwal tayang (belum mulai / dalam jadwal / berakhir), RLS publik, alternates hreflang, daftar publik, sitemap tanpa noindex';
end $$;

-- 4. Media
do $$ declare r jsonb; m jsonb; begin
  reset role;
  insert into storage.objects (bucket_id, name, metadata) values ('site-assets', 'media/ct-a.png', '{"mimetype":"image/png","size":2048}'), ('site-assets', 'media/ct-b.svg', '{"mimetype":"image/svg+xml","size":500}'), ('site-assets', 'media/ct-c.png', '{"mimetype":"image/png","size":9999999}') on conflict do nothing;
  perform pg_temp.as_user(current_setting('ct.cm')::uuid);
  r := public.admin_media_register('banners/x.png'); if r ->> 'error' <> 'path_tidak_valid' then raise exception 'folder media saja: %', r; end if;
  r := public.admin_media_register('media/ct-ghost.png'); if r ->> 'error' <> 'berkas_tidak_ditemukan' then raise exception 'berkas harus ada di storage: %', r; end if;
  r := public.admin_media_register('media/ct-b.svg'); if r ->> 'error' <> 'tipe_tidak_didukung' then raise exception 'svg ditolak: %', r; end if;
  r := public.admin_media_register('media/ct-c.png'); if r ->> 'error' <> 'berkas_terlalu_besar' then raise exception 'ukuran: %', r; end if;
  r := public.admin_media_register('media/ct-a.png', 'Logo uji', 300, 200); if (r ->> 'ok')::boolean is not true then raise exception 'daftar media: %', r; end if;
  if (select size_bytes from public.content_media where path = 'media/ct-a.png') <> 2048 then raise exception 'ukuran harus dari storage, bukan klien'; end if;
  perform public.admin_content_save(null, 'banner', '{"title":"CT Banner","image_url":"https://x.test/storage/v1/object/public/site-assets/media/ct-a.png","status":"published"}');
  m := public.admin_media_list();
  if jsonb_array_length((select x -> 'used_in' from jsonb_array_elements(m) x where x ->> 'path' = 'media/ct-a.png')) <> 1 then raise exception 'pemakaian media salah: %', m; end if;
  r := public.admin_media_delete('media/ct-a.png'); if r ->> 'error' <> 'media_dipakai' then raise exception 'media terpakai tidak boleh dihapus: %', r; end if;
  r := public.admin_media_set_alt('media/ct-a.png', 'Alt baru'); if (r ->> 'ok')::boolean is not true then raise exception 'alt: %', r; end if;
  reset role; update public.contents set image_url = null, status = 'draft' where title = 'CT Banner';
  raise notice 'OK media: hanya folder media/, ukuran+tipe dari storage, svg ditolak, pemakaian terlacak, terpakai tidak dihapus';
end $$;
do $$ declare r jsonb; begin
  reset role; perform pg_temp.as_user(current_setting('ct.cm')::uuid);
  -- update langsung diblokir, banner tanpa gambar kini hanya draft
  update public.contents set status = 'draft' where title = 'CT Banner';
exception when insufficient_privilege then
  perform pg_temp.as_user(current_setting('ct.cm')::uuid);
  r := public.admin_media_delete('media/ct-a.png'); if (r ->> 'ok')::boolean is not true then raise exception 'media tidak terpakai harus bisa dihapus: %', r; end if;
  raise notice 'OK tulis langsung ke contents ditolak; media tidak terpakai bisa dihapus';
end $$;

-- 5. Hak akses dan hapus
do $$ declare r jsonb; ok boolean; id1 uuid; begin
  reset role; perform pg_temp.as_user(current_setting('ct.sup')::uuid);
  if jsonb_typeof(public.admin_media_list()) <> 'array' then raise exception 'support (baca) harus bisa melihat media'; end if;
  begin perform public.admin_content_save(null, 'faq', '{"title":"CT X","body":"y"}'); ok := false; exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'support tidak boleh menulis konten'; end if;
  perform pg_temp.as_user(current_setting('ct.cust')::uuid);
  begin perform public.admin_content_revisions(current_setting('ct.a')::uuid); ok := false; exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'pelanggan tidak boleh melihat revisi'; end if;
  perform pg_temp.as_anon();
  begin perform public.admin_content_save(null, 'faq', '{"title":"CT X","body":"y"}'); ok := false; exception when others then ok := true; end;
  reset role; if not ok then raise exception 'anon tidak boleh menyimpan'; end if;
  perform pg_temp.as_user(current_setting('ct.cm')::uuid);
  r := public.admin_content_delete((select id from public.contents where title = 'CT Tanya')); if r ->> 'error' <> 'arsipkan_dulu' then raise exception 'terbit tidak boleh dihapus: %', r; end if;
  r := public.admin_content_save((select id from public.contents where title = 'CT Tanya'), null, '{"status":"archived"}');
  r := public.admin_content_delete((select id from public.contents where title = 'CT Tanya')); if (r ->> 'ok')::boolean is not true then raise exception 'arsip harus bisa dihapus: %', r; end if;
  -- slug arsip bisa dipakai ulang
  r := public.admin_content_save((select id from public.contents where title = 'CT Artikel Terbit'), null, '{"status":"archived"}');
  r := public.admin_content_save(null, 'article', '{"title":"CT Pakai Ulang","slug":"ct-terbit","body":"x"}'); if (r ->> 'ok')::boolean is not true then raise exception 'slug arsip dipakai ulang: %', r; end if;
  reset role;
  raise notice 'OK hak akses (support baca saja, pelanggan/anon ditolak), hapus hanya yang tidak tayang, slug arsip dipakai ulang';
end $$;

reset role;
delete from public.content_media where path like 'media/ct-%'; delete from storage.objects where bucket_id = 'site-assets' and name like 'media/ct-%';
delete from public.contents where title like 'CT %';
delete from auth.users where email like 'ct.%@uji.nusamora.test';
