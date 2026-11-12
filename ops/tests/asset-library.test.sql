-- Uji DB asset-library.sql: status Nonaktif, lisensi & sumber, versi aset, riwayat penggunaan, aset serupa, aksi massal, hak akses.
\set ON_ERROR_STOP on
\set QUIET on
delete from storage.objects where bucket_id = 'theme-assets' and name like 'incoming/al-%';
delete from public.template_assets where template_id in (select id from public.templates where slug like 'al-%');
delete from public.assets where file_path like '%/al-%';
delete from public.templates where slug like 'al-%';
delete from auth.users where email like 'al.%@uji.nusamora.test';
create or replace function pg_temp.as_user(u uuid) returns void language plpgsql as $$ begin reset role; perform set_config('request.jwt.claim.sub', u::text, false); perform set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated')::text, false); set role authenticated; end $$;
grant execute on function pg_temp.as_user(uuid) to public;
do $$ declare a uuid := gen_random_uuid(); sp uuid := gen_random_uuid(); c uuid := gen_random_uuid(); cat uuid; t1 uuid; t2 uuid; a1 uuid; a2 uuid; a3 uuid; a4 uuid; a5 uuid; begin
  insert into auth.users (id, email) values (a, 'al.admin@uji.nusamora.test'), (sp, 'al.support@uji.nusamora.test'), (c, 'al.cust@uji.nusamora.test');
  insert into public.profiles (id, full_name) values (a, 'Admin Uji'), (sp, 'Support Uji'), (c, 'Pelanggan Uji') on conflict (id) do update set full_name = excluded.full_name;
  insert into public.admin_users (user_id, role) values (a, 'super_admin'), (sp, 'support');
  select id into cat from public.asset_categories where package_type = 'essential' and slug = 'ornament';
  insert into public.templates (slug, name, package_type, categories, description, thumbnail_url, status) values ('al-pub', 'Template Terbit', 'essential', '{wedding}', 'Template untuk uji aset perpustakaan.', 'https://x.test/t.png', 'published') returning id into t1;
  insert into public.templates (slug, name, package_type, categories, description, thumbnail_url, status) values ('al-draft', 'Template Draft', 'essential', '{wedding}', 'Template draft untuk uji aset.', null, 'draft') returning id into t2;
  insert into public.assets (name, category_id, package_types, file_path, file_url, file_type, mime, file_size, width, height, checksum, tags) values
    ('Ornamen Emas', cat, '{essential}', 'incoming/al-1.png', 'https://x.test/incoming/al-1.png', 'png', 'image/png', 1000, 100, 100, repeat('1', 64), '{emas}') returning id into a1;
  insert into public.assets (name, category_id, package_types, file_path, file_url, file_type, mime, file_size, width, height, checksum) values
    ('Ornamen Perak', cat, '{essential}', 'incoming/al-2.png', 'https://x.test/incoming/al-2.png', 'png', 'image/png', 2000, 100, 100, repeat('2', 64)) returning id into a2;
  insert into public.assets (name, category_id, package_types, file_path, file_url, file_type, mime, file_size, width, height, checksum) values
    ('ornamen emas ', cat, '{essential}', 'incoming/al-3.png', 'https://x.test/incoming/al-3.png', 'png', 'image/png', 2000, 100, 100, repeat('3', 64)) returning id into a3;
  insert into public.assets (name, category_id, package_types, file_path, file_url, file_type, mime, file_size, width, height, checksum) values
    ('Bunga', cat, '{essential}', 'incoming/al-4.png', 'https://x.test/incoming/al-4.png', 'png', 'image/png', 3000, 50, 50, repeat('4', 64)) returning id into a4;
  insert into public.assets (name, category_id, package_types, file_path, file_url, file_type, mime, file_size, checksum) values
    ('AI Gen', cat, '{essential}', 'generated/al-5.png', 'https://x.test/generated/al-5.png', 'png', 'image/png', 1500, repeat('5', 64)) returning id into a5;
  perform set_config('al.admin', a::text, false); perform set_config('al.sp', sp::text, false); perform set_config('al.cust', c::text, false);
  perform set_config('al.t1', t1::text, false); perform set_config('al.t2', t2::text, false);
  perform set_config('al.a1', a1::text, false); perform set_config('al.a2', a2::text, false); perform set_config('al.a3', a3::text, false); perform set_config('al.a4', a4::text, false); perform set_config('al.a5', a5::text, false);
  perform set_config('al.cat', cat::text, false);
end $$;

-- 1. Sumber/lisensi otomatis untuk aset AI & versi awal
do $$ declare r record; n int; begin
  select source, license into r from public.assets where id = current_setting('al.a5')::uuid;
  if r.source <> 'ai_generator' or r.license <> 'ai_generated' then raise exception 'aset AI harus bertanda ai_generator: %', r; end if;
  select count(*) into n from public.asset_versions where asset_id = current_setting('al.a1')::uuid and version = 1;
  if n <> 1 then raise exception 'versi awal harus otomatis'; end if;
  raise notice 'OK aset AI otomatis bersumber ai_generator; versi awal terbentuk otomatis';
end $$;

-- 2. Lisensi & sumber
do $$ declare r jsonb; begin
  perform pg_temp.as_user(current_setting('al.admin')::uuid);
  if public.admin_asset_set_meta(current_setting('al.a1')::uuid, '{"license":"bebas"}')->>'error' <> 'lisensi_tidak_valid' then raise exception 'lisensi salah harus ditolak'; end if;
  if public.admin_asset_set_meta(current_setting('al.a1')::uuid, '{"license":"cc_by"}')->>'error' <> 'bukti_lisensi_kosong' then raise exception 'cc_by tanpa kredit harus ditolak'; end if;
  if public.admin_asset_set_meta(current_setting('al.a1')::uuid, '{"license":"cc0","source_url":"javascript:x"}')->>'error' <> 'url_tidak_valid' then raise exception 'URL berbahaya harus ditolak'; end if;
  if public.admin_asset_set_meta(current_setting('al.a1')::uuid, '{"license":"cc0","license_expires":"bukan-tanggal"}')->>'error' <> 'tanggal_tidak_valid' then raise exception 'tanggal salah harus ditolak'; end if;
  r := public.admin_asset_set_meta(current_setting('al.a1')::uuid, '{"license":"cc_by","source":"stok","credit":"Freepik / Nama Seniman","source_url":"https://freepik.test/x","license_expires":"2030-01-01"}');
  if (r->>'ok') <> 'true' or r#>>'{asset,license}' <> 'cc_by' or r#>>'{asset,credit}' <> 'Freepik / Nama Seniman' then raise exception 'simpan lisensi gagal: %', r; end if;
  perform pg_temp.as_user(current_setting('al.sp')::uuid);
  begin perform public.admin_asset_set_meta(current_setting('al.a1')::uuid, '{"license":"cc0"}'); raise exception 'support tanpa izin harus ditolak'; exception when insufficient_privilege then null; end;
  raise notice 'OK lisensi & sumber: validasi enum, URL, tanggal, bukti atribusi, izin';
end $$;

-- 3. Status Nonaktif: tidak bisa dipasang baru, penempatan lama tetap tampil; Arsip tidak tampil
do $$ declare r jsonb; g jsonb; begin
  perform pg_temp.as_user(current_setting('al.admin')::uuid);
  r := public.admin_save_template_mapping(current_setting('al.t1')::uuid, null, null, jsonb_build_array(jsonb_build_object('slot_key', 'ornamen', 'asset_id', current_setting('al.a1'))));
  if (r->>'ok') <> 'true' then raise exception 'pasang aset aktif gagal: %', r; end if;
  if public.admin_update_asset(current_setting('al.a1')::uuid, '{"status":"foo"}')->>'error' <> 'status_tidak_valid' then raise exception 'status salah harus ditolak'; end if;
  r := public.admin_update_asset(current_setting('al.a1')::uuid, '{"status":"inactive"}');
  if (r->>'ok') <> 'true' then raise exception 'nonaktifkan gagal: %', r; end if;
  g := public.get_template_assets('al-pub');
  if jsonb_array_length(g->'assets') <> 1 then raise exception 'aset nonaktif yang sudah terpasang harus tetap tampil: %', g; end if;
  r := public.admin_save_template_mapping(current_setting('al.t1')::uuid, null, null, jsonb_build_array(jsonb_build_object('slot_key', 'ornamen', 'asset_id', current_setting('al.a1'))));
  if (r->>'ok') <> 'true' then raise exception 'simpan ulang penempatan lama (nonaktif) harus lolos: %', r; end if;
  r := public.admin_save_template_mapping(current_setting('al.t2')::uuid, null, null, jsonb_build_array(jsonb_build_object('slot_key', 'ornamen', 'asset_id', current_setting('al.a1'))));
  if r->>'error' <> 'asset_tidak_tersedia' then raise exception 'aset nonaktif tidak boleh dipasang baru: %', r; end if;
  perform public.admin_update_asset(current_setting('al.a1')::uuid, '{"status":"archived"}');
  g := public.get_template_assets('al-pub');
  if jsonb_array_length(g->'assets') <> 0 then raise exception 'aset arsip tidak boleh tampil: %', g; end if;
  perform public.admin_update_asset(current_setting('al.a1')::uuid, '{"status":"active"}');
  raise notice 'OK Nonaktif: penempatan lama tetap tampil, tidak bisa dipasang baru; Arsip tidak tampil';
end $$;

-- 4. Versi aset
do $$ declare r jsonb; a public.assets; d jsonb; aid uuid := current_setting('al.a1')::uuid; u uuid := current_setting('al.admin')::uuid; begin
  reset role;
  insert into storage.objects (bucket_id, name, metadata) values ('theme-assets', 'incoming/al-v2.png', '{"size":1200}'), ('theme-assets', 'incoming/al-v2.webp', '{"size":1200}'), ('theme-assets', 'incoming/al-v3.png', '{"size":900}');
  if public.admin_register_asset_version(u, aid, 'incoming/al-v2.webp', 'x', jsonb_build_object('file_type','webp','mime','image/webp','size',1200,'checksum',repeat('a',64)))->>'error' <> 'tipe_berbeda' then raise exception 'ganti tipe file harus ditolak'; end if;
  if public.admin_register_asset_version(u, aid, 'incoming/al-v2.png', 'x', jsonb_build_object('file_type','png','mime','image/png','size',1200,'checksum',repeat('1',64)))->>'error' <> 'sama_dengan_versi_sekarang' then raise exception 'file sama harus ditolak'; end if;
  if public.admin_register_asset_version(u, aid, 'incoming/al-v2.png', 'x', jsonb_build_object('file_type','png','mime','image/png','size',1200,'checksum',repeat('2',64)))->>'error' <> 'duplikat' then raise exception 'checksum aset lain harus ditolak'; end if;
  if public.admin_register_asset_version(u, aid, 'incoming/al-v2.png', 'x', jsonb_build_object('file_type','png','mime','image/png','size',9999,'checksum',repeat('a',64)))->>'error' <> 'ukuran_tidak_cocok' then raise exception 'ukuran tidak cocok harus ditolak'; end if;
  r := public.admin_register_asset_version(u, aid, 'incoming/al-v2.png', 'Warna lebih terang', jsonb_build_object('file_type','png','mime','image/png','size',1200,'checksum',repeat('a',64),'width',200,'height',200,'public_base','https://x.test/'));
  if (r->>'ok') <> 'true' or (r->>'version')::int <> 2 or (r->>'dimensi_berubah') <> 'true' then raise exception 'versi baru gagal: %', r; end if;
  select * into a from public.assets where id = aid;
  if a.current_version <> 2 or a.file_path <> 'incoming/al-v2.png' or a.width <> 200 or a.file_url <> 'https://x.test/incoming/al-v2.png' then raise exception 'aset harus memakai file versi 2: %', to_jsonb(a); end if;
  if (select count(*) from public.template_assets where asset_id = aid) <> 1 then raise exception 'penempatan tidak boleh berubah'; end if;
  r := public.admin_register_asset_version(u, aid, 'incoming/al-v3.png', 'Kembali ke awal', jsonb_build_object('file_type','png','mime','image/png','size',900,'checksum',repeat('1',64)));
  if r->>'error' <> 'versi_sudah_ada' or (r->>'version')::int <> 1 then raise exception 'checksum versi lama harus diarahkan ke pulihkan: %', r; end if;
  perform pg_temp.as_user(u);
  r := public.admin_asset_restore_version(aid, 1);
  if (r->>'ok') <> 'true' or r#>>'{asset,file_path}' <> 'incoming/al-1.png' or (r#>>'{asset,current_version}')::int <> 1 then raise exception 'pulihkan versi 1 gagal: %', r; end if;
  if public.admin_asset_restore_version(aid, 1)->>'error' <> 'versi_sudah_aktif' then raise exception 'versi aktif tidak boleh dipulihkan lagi'; end if;
  if public.admin_asset_restore_version(aid, 9)->>'error' <> 'versi_tidak_ditemukan' then raise exception 'versi tidak ada harus ditolak'; end if;
  d := public.admin_asset_detail(aid);
  if jsonb_array_length(d->'versions') <> 2 or (select (x->>'version')::int from jsonb_array_elements(d->'versions') x where (x->>'current')::boolean) <> 1 then raise exception 'riwayat versi salah: %', d->'versions'; end if;
  raise notice 'OK versi aset: tipe tetap, duplikat/ukuran divalidasi, penempatan utuh, pulihkan versi lama';
end $$;

-- 5. Riwayat penggunaan
do $$ declare d jsonb; n int; begin
  perform pg_temp.as_user(current_setting('al.admin')::uuid);
  d := public.admin_asset_detail(current_setting('al.a1')::uuid);
  if jsonb_array_length(d->'placements') <> 1 or d#>>'{placements,0,template}' <> 'Template Terbit' then raise exception 'penempatan salah: %', d->'placements'; end if;
  select count(*) into n from jsonb_array_elements(d->'usage_log') x where x->>'action' = 'dipasang';
  if n <> 1 then raise exception 'simpan ulang yang sama tidak boleh menambah riwayat (dipasang=%): %', n, d->'usage_log'; end if;
  perform public.admin_save_template_mapping(current_setting('al.t1')::uuid, null, null, '[]'::jsonb);
  d := public.admin_asset_detail(current_setting('al.a1')::uuid);
  if d#>>'{usage_log,0,action}' <> 'dilepas' or jsonb_array_length(d->'placements') <> 0 then raise exception 'pelepasan harus tercatat: %', d->'usage_log'; end if;
  reset role;
  insert into public.template_assets (template_id, slot_key, asset_id) values (current_setting('al.t2')::uuid, 'sementara', current_setting('al.a1')::uuid);
  delete from public.template_assets where template_id = current_setting('al.t2')::uuid;
  reset role;
  if (select count(*) from public.asset_usage_log where asset_id = current_setting('al.a1')::uuid and template_id = current_setting('al.t2')::uuid) <> 0 then
    raise notice 'catatan: pasang+lepas di transaksi terpisah dicatat dua kali (wajar)'; end if;
  raise notice 'OK riwayat penggunaan: pasang/lepas tercatat, simpan ulang tanpa perubahan tidak menambah catatan';
end $$;
do $$ declare n0 int; n1 int; begin
  -- dalam SATU transaksi: pasang lalu lepas slot yang sama saling meniadakan
  select count(*) into n0 from public.asset_usage_log where asset_id = current_setting('al.a2')::uuid;
  insert into public.template_assets (template_id, slot_key, asset_id) values (current_setting('al.t2')::uuid, 'sekejap', current_setting('al.a2')::uuid);
  delete from public.template_assets where template_id = current_setting('al.t2')::uuid and slot_key = 'sekejap';
  select count(*) into n1 from public.asset_usage_log where asset_id = current_setting('al.a2')::uuid;
  if n1 <> n0 then raise exception 'pasang+lepas dalam satu transaksi tidak boleh meninggalkan catatan (% vs %)', n0, n1; end if;
  raise notice 'OK pasang+lepas dalam satu transaksi tidak berisik';
end $$;

-- 6. Aset serupa
do $$ declare g jsonb; reasons text[]; d jsonb; begin
  perform pg_temp.as_user(current_setting('al.admin')::uuid);
  g := public.admin_asset_duplicates();
  select array_agg(x->>'reason') into reasons from jsonb_array_elements(g) x where (x::text like '%Ornamen Perak%' or x::text like '%Ornamen Emas%');
  if not ('ukuran_sama' = any (reasons)) or not ('nama_sama' = any (reasons)) then raise exception 'kelompok serupa tidak lengkap: %', reasons; end if;
  d := public.admin_asset_detail(current_setting('al.a2')::uuid);
  if not exists (select 1 from jsonb_array_elements(d->'similar') x where x->>'reason' = 'ukuran_sama') then raise exception 'aset serupa (ukuran) harus muncul di detail: %', d->'similar'; end if;
  raise notice 'OK deteksi aset serupa: nama sama dan ukuran sama';
end $$;

-- 7. Aksi massal
do $$ declare r jsonb; ids uuid[]; tg text[]; begin
  perform pg_temp.as_user(current_setting('al.admin')::uuid);
  ids := array[current_setting('al.a2')::uuid, current_setting('al.a3')::uuid, current_setting('al.a4')::uuid];
  r := public.admin_assets_bulk(ids, 'add_tags', '{"tags":["Floral","emas"]}');
  if (r->>'done')::int <> 3 or jsonb_array_length(r->'failed') <> 0 then raise exception 'tambah tag massal gagal: %', r; end if;
  reset role; select tags into tg from public.assets where id = current_setting('al.a2')::uuid; if not (tg @> array['floral','emas']) then raise exception 'tag belum bertambah: %', tg; end if;
  perform pg_temp.as_user(current_setting('al.admin')::uuid);
  r := public.admin_assets_bulk(ids, 'remove_tags', '{"tags":["FLORAL"]}');
  reset role; select tags into tg from public.assets where id = current_setting('al.a2')::uuid; if tg @> array['floral'] then raise exception 'tag belum terhapus: %', tg; end if;
  perform pg_temp.as_user(current_setting('al.admin')::uuid);
  r := public.admin_assets_bulk(ids, 'status', '{"status":"inactive"}');
  if (r->>'done')::int <> 3 then raise exception 'nonaktifkan massal gagal: %', r; end if;
  r := public.admin_assets_bulk(array[current_setting('al.a2')::uuid], 'status', '{"status":"nonsense"}');
  if (r->>'done')::int <> 0 or jsonb_array_length(r->'failed') <> 1 then raise exception 'status salah harus gagal tapi tidak membatalkan hal lain: %', r; end if;
  -- aset terpasang di template TERBIT: arsip butuh konfirmasi (force)
  perform public.admin_save_template_mapping(current_setting('al.t1')::uuid, null, null, jsonb_build_array(jsonb_build_object('slot_key', 'bunga', 'asset_id', current_setting('al.a4'))));
  perform public.admin_update_asset(current_setting('al.a4')::uuid, '{"status":"active"}');
  perform public.admin_save_template_mapping(current_setting('al.t1')::uuid, null, null, jsonb_build_array(jsonb_build_object('slot_key', 'bunga', 'asset_id', current_setting('al.a4'))));
  r := public.admin_assets_bulk(array[current_setting('al.a4')::uuid, current_setting('al.a2')::uuid], 'status', '{"status":"archived"}');
  if (r->>'done')::int <> 1 or r#>>'{failed,0,error}' <> 'dipakai_template_terbit' then raise exception 'arsip aset terpasang di template terbit harus diblokir tanpa force: %', r; end if;
  r := public.admin_assets_bulk(array[current_setting('al.a4')::uuid], 'status', '{"status":"archived"}', true);
  if (r->>'done')::int <> 1 then raise exception 'arsip dengan force harus berhasil: %', r; end if;
  r := public.admin_assets_bulk(array[current_setting('al.a3')::uuid], 'meta', '{"license":"milik_sendiri","source":"klien"}');
  if (r->>'done')::int <> 1 then raise exception 'lisensi massal gagal: %', r; end if;
  r := public.admin_assets_bulk(array[current_setting('al.a3')::uuid], 'packages', '{"package_types":["luxe"]}');
  perform pg_temp.as_user(current_setting('al.admin')::uuid);
  r := public.admin_assets_bulk(array[current_setting('al.a3')::uuid], 'delete'); if (r->>'done')::int <> 1 then raise exception 'hapus massal gagal: %', r; end if;
  r := public.admin_assets_bulk(array[current_setting('al.a3')::uuid], 'restore'); if (r->>'done')::int <> 1 then raise exception 'pulihkan massal gagal: %', r; end if;
  if public.admin_assets_bulk('{}', 'status')->>'error' <> 'tidak_ada_aset' or public.admin_assets_bulk(ids, 'hapus_semua')->>'error' <> 'aksi_tidak_valid' then raise exception 'validasi masukan massal salah'; end if;
  raise notice 'OK aksi massal: tag, status, lisensi, hapus/pulihkan; kegagalan per aset dilaporkan; arsip aset terpasang butuh force';
end $$;

-- 8. Hak akses
do $$ begin
  perform pg_temp.as_user(current_setting('al.sp')::uuid);
  begin perform public.admin_assets_bulk(array[current_setting('al.a1')::uuid], 'delete'); raise exception 'support harus ditolak'; exception when insufficient_privilege then null; end;
  perform pg_temp.as_user(current_setting('al.cust')::uuid);
  begin perform public.admin_asset_detail(current_setting('al.a1')::uuid); raise exception 'pelanggan harus ditolak'; exception when insufficient_privilege then null; end;
  begin perform public.admin_asset_duplicates(); raise exception 'pelanggan harus ditolak'; exception when insufficient_privilege then null; end;
  begin perform public.admin_register_asset_version(current_setting('al.cust')::uuid, current_setting('al.a1')::uuid, 'incoming/x.png', null, '{}'); raise exception 'fungsi service_role harus ditolak'; exception when insufficient_privilege then null; end;
  raise notice 'OK hak akses: support/pelanggan ditolak; fungsi versi hanya service_role';
end $$;
reset role;
delete from storage.objects where bucket_id = 'theme-assets' and name like 'incoming/al-%';
delete from public.template_assets where template_id in (select id from public.templates where slug like 'al-%');
delete from public.assets where file_path like '%/al-%';
delete from public.templates where slug like 'al-%';
delete from auth.users where email like 'al.%@uji.nusamora.test';
\echo SELESAI asset-library
