-- Uji DB admin-templates.sql: kelengkapan sebelum terbit, status, kompatibilitas, duplikasi, versi, penggunaan, hak akses.
\set ON_ERROR_STOP on
\set QUIET on
delete from auth.users where email like 'at.%@uji.nusamora.test';
delete from public.templates where slug like 'at-%';
delete from public.assets where file_path like 'incoming/at-%';
create or replace function pg_temp.as_user(u uuid) returns void language plpgsql as $$ begin reset role; perform set_config('request.jwt.claim.sub', u::text, false); perform set_config('request.jwt.claims', json_build_object('sub', u::text, 'role', 'authenticated')::text, false); set role authenticated; end $$;
grant execute on function pg_temp.as_user(uuid) to public;
do $$ declare a uuid := gen_random_uuid(); sp uuid := gen_random_uuid(); c uuid := gen_random_uuid(); t1 uuid; t2 uuid; cat uuid; ac1 uuid; ac2 uuid; ac3 uuid; a1 uuid; a2 uuid; a3 uuid; a4 uuid; begin
  insert into auth.users (id, email) values (a, 'at.admin@uji.nusamora.test'), (sp, 'at.support@uji.nusamora.test'), (c, 'at.cust@uji.nusamora.test');
  insert into public.profiles (id, full_name) values (a, 'Admin T'), (sp, 'Support T'), (c, 'Pelanggan T') on conflict (id) do update set full_name = excluded.full_name;
  insert into public.admin_users (user_id, role) values (a, 'super_admin'), (sp, 'support');
  insert into public.templates (slug, name, package_type, categories, description, thumbnail_url, status) values
    ('at-luxe', 'Luxe Uji', 'luxe', '{wedding}', 'Template Luxe untuk pengujian kelengkapan aset.', 'https://x.test/t.png', 'draft') returning id into t1;
  insert into public.templates (slug, name, package_type, categories, description, thumbnail_url, status) values
    ('at-ess', 'Essential Uji', 'essential', '{birthday}', 'pendek', null, 'draft') returning id into t2;
  select id into ac1 from public.asset_categories where package_type = 'luxe' and slug = 'virtual-environment';
  select id into ac2 from public.asset_categories where package_type = 'luxe' and slug = 'couple-avatar';
  insert into public.assets (name, category_id, package_types, file_path, file_url, file_type, mime, file_size, attrs, checksum) values
    ('Venue', ac1, '{luxe}', 'incoming/at-venue.png', 'u', 'png', 'image/png', 1000, '{}', repeat('a', 64)) returning id into a1;
  insert into public.assets (name, category_id, package_types, file_path, file_url, file_type, mime, file_size, attrs, checksum) values
    ('Pria', ac2, '{luxe}', 'incoming/at-pria.png', 'u', 'png', 'image/png', 1000, '{"avatar_role":"pengantin_pria"}', repeat('b', 64)) returning id into a2;
  insert into public.assets (name, category_id, package_types, file_path, file_url, file_type, mime, file_size, attrs, checksum) values
    ('Wanita', ac2, '{luxe}', 'incoming/at-wanita.png', 'u', 'png', 'image/png', 1000, '{"avatar_role":"pengantin_wanita"}', repeat('c', 64)) returning id into a3;
  perform set_config('at.admin', a::text, false); perform set_config('at.support', sp::text, false); perform set_config('at.cust', c::text, false);
  perform set_config('at.t1', t1::text, false); perform set_config('at.t2', t2::text, false);
  perform set_config('at.a1', a1::text, false); perform set_config('at.a2', a2::text, false); perform set_config('at.a3', a3::text, false);
end $$;

-- 1. belum lengkap: ditolak, daftar kekurangan jelas
do $$ declare rd jsonb; begin
  perform pg_temp.as_user(current_setting('at.admin')::uuid);
  begin perform public.admin_template_action(current_setting('at.t1')::uuid, 'publish'); raise exception 'harus ditolak';
  exception when others then if sqlerrm = 'template_belum_lengkap' then raise notice 'OK terbit ditolak saat aset belum lengkap'; else raise; end if; end;
  reset role; -- identitas tetap admin (jwt sub); uji pemicu pada jalur update langsung
  begin update public.templates set status = 'published' where id = current_setting('at.t1')::uuid; raise exception 'update langsung harus ditolak';
  exception when others then if sqlerrm = 'template_belum_lengkap' then raise notice 'OK jalur update langsung (formulir) juga ditolak'; else raise; end if; end;
  perform pg_temp.as_user(current_setting('at.admin')::uuid);
  rd := (public.admin_template_detail(current_setting('at.t1')::uuid))->'readiness';
  if (rd->>'ready')::boolean or not exists (select 1 from jsonb_array_elements(rd->'checks') e where e->>'key' = 'venue' and not (e->>'ok')::boolean and (e->>'required')::boolean)
     or not exists (select 1 from jsonb_array_elements(rd->'checks') e where e->>'key' = 'avatar_groom' and (e->>'required')::boolean) then raise exception 'readiness salah: %', rd; end if;
  raise notice 'OK indikator: venue & avatar mempelai wajib untuk Luxe pernikahan';
  begin perform public.admin_template_action(current_setting('at.t2')::uuid, 'publish'); raise exception 'essential harus ditolak';
  exception when others then if sqlerrm = 'template_belum_lengkap' then null; else raise; end if; end;
end $$;

-- 2. dilengkapi lalu terbit
do $$ declare rd jsonb; ps timestamptz; begin
  reset role;
  insert into public.template_assets (template_id, slot_key, asset_id) values (current_setting('at.t1')::uuid, 'virtual_venue', current_setting('at.a1')::uuid), (current_setting('at.t1')::uuid, 'avatar_groom', current_setting('at.a2')::uuid), (current_setting('at.t1')::uuid, 'avatar_bride', current_setting('at.a3')::uuid);
  perform pg_temp.as_user(current_setting('at.admin')::uuid);
  rd := (public.admin_template_detail(current_setting('at.t1')::uuid))->'readiness';
  if not (rd->>'ready')::boolean then raise exception 'seharusnya siap: %', rd; end if;
  perform public.admin_template_action(current_setting('at.t1')::uuid, 'publish');
  reset role; select published_at into ps from public.templates where id = current_setting('at.t1')::uuid;
  if ps is null or (select status from public.templates where id = current_setting('at.t1')::uuid) <> 'published' then raise exception 'terbit gagal'; end if;
  raise notice 'OK template lengkap bisa terbit, tanggal terbit tercatat';
end $$;

-- 3. aset rusak (diarsipkan) membatalkan kelengkapan untuk terbit berikutnya
do $$ begin
  reset role; update public.assets set status = 'archived' where id = current_setting('at.a1')::uuid;
  perform pg_temp.as_user(current_setting('at.admin')::uuid);
  if (((public.admin_template_detail(current_setting('at.t1')::uuid))->'readiness')->>'ready')::boolean then raise exception 'aset arsip harus membuat tidak siap'; end if;
  reset role; update public.assets set status = 'active' where id = current_setting('at.a1')::uuid;
  raise notice 'OK aset terpasang yang diarsipkan terdeteksi';
end $$;

-- 4. terbit paksa: alasan wajib + tercatat
do $$ begin
  perform pg_temp.as_user(current_setting('at.admin')::uuid);
  begin perform public.admin_template_action(current_setting('at.t2')::uuid, 'publish', null, true); raise exception 'tanpa alasan harus ditolak';
  exception when others then if sqlerrm like 'alasan wajib%' then null; else raise; end if; end;
  perform public.admin_template_action(current_setting('at.t2')::uuid, 'publish', 'Template bawaan tanpa aset', true);
  reset role;
  if not exists (select 1 from public.audit_logs where action = 'template_terbit_paksa' and row_id = current_setting('at.t2')) then raise exception 'audit paksa tidak ada'; end if;
  if coalesce(current_setting('nm.force_publish', true), '') = '1' then raise exception 'flag paksa bocor'; end if;
  perform pg_temp.as_user(current_setting('at.admin')::uuid);
  perform public.admin_template_action(current_setting('at.t2')::uuid, 'unpublish');
  begin perform public.admin_template_action(current_setting('at.t2')::uuid, 'publish'); raise exception 'publish ulang tanpa paksa harus ditolak';
  exception when others then if sqlerrm = 'template_belum_lengkap' then null; else raise; end if; end;
  raise notice 'OK terbit paksa butuh alasan, tercatat audit, tidak bocor ke terbit berikutnya';
end $$;

-- 5. pengaturan: unggulan, bahasa, kompatibilitas paket
do $$ declare t public.templates; begin
  perform pg_temp.as_user(current_setting('at.admin')::uuid);
  begin perform public.admin_template_settings(current_setting('at.t2')::uuid, '{"featured":true}'); raise exception 'draft tidak boleh unggulan';
  exception when others then if sqlerrm = 'hanya_template_terbit' then null; else raise; end if; end;
  perform public.admin_template_settings(current_setting('at.t1')::uuid, '{"featured":true,"recommended":true,"languages":["id","en"],"default_language":"en"}');
  reset role; select * into t from public.templates where id = current_setting('at.t1')::uuid;
  if not (t.featured and t.recommended) or t.languages <> '{en,id}' or t.default_language <> 'en' then raise exception 'pengaturan tidak tersimpan'; end if;
  perform pg_temp.as_user(current_setting('at.admin')::uuid);
  begin perform public.admin_template_settings(current_setting('at.t1')::uuid, '{"languages":["id"],"default_language":"en"}'); raise exception 'bahasa utama harus termasuk';
  exception when others then if sqlerrm like 'bahasa utama%' then null; else raise; end if; end;
  begin perform public.admin_template_settings(current_setting('at.t1')::uuid, '{"languages":["xx"],"default_language":"xx"}'); raise exception 'kode liar harus ditolak';
  exception when check_violation then null; end;
  begin perform public.admin_template_settings(current_setting('at.t1')::uuid, '{"package_type":"signature"}'); raise exception 'paket tidak boleh berubah saat terbit/terpasang';
  exception when others then if sqlerrm in ('aset_terpasang','masih_terbit','template_dipakai') then null; else raise; end if; end;
  perform public.admin_template_action(current_setting('at.t1')::uuid, 'unpublish');
  reset role; select featured, recommended into t.featured, t.recommended from public.templates where id = current_setting('at.t1')::uuid;
  if t.featured or t.recommended then raise exception 'unggulan harus reset saat ditarik'; end if;
  perform pg_temp.as_user(current_setting('at.admin')::uuid);
  perform public.admin_template_settings(current_setting('at.t2')::uuid, '{"package_type":"signature"}');
  raise notice 'OK unggulan/rekomendasi hanya untuk terbit, bahasa tervalidasi, paket aman diubah hanya saat belum dipakai';
end $$;

-- 6. duplikasi
do $$ declare nid uuid; n int; begin
  perform pg_temp.as_user(current_setting('at.admin')::uuid);
  begin perform public.admin_template_duplicate(current_setting('at.t1')::uuid, 'Salinan', 'at-luxe'); raise exception 'slug kembar harus ditolak';
  exception when others then if sqlerrm = 'slug_sudah_dipakai' then null; else raise; end if; end;
  nid := public.admin_template_duplicate(current_setting('at.t1')::uuid, 'Luxe Uji Salinan', 'at-luxe-salinan');
  reset role; select count(*) into n from public.template_assets where template_id = nid;
  if n <> 3 or (select status from public.templates where id = nid) <> 'draft' or (select featured from public.templates where id = nid) or (select version from public.templates where id = nid) <> 1 then raise exception 'salinan salah'; end if;
  raise notice 'OK duplikasi: draft, aset ikut tersalin, tanpa unggulan';
end $$;

-- 7. versi
do $$ declare n int; r jsonb; d jsonb; begin
  perform pg_temp.as_user(current_setting('at.admin')::uuid);
  n := public.admin_template_save_version(current_setting('at.t1')::uuid, 'Awal');
  if n <> 1 then raise exception 'versi pertama harus 1'; end if;
  begin perform public.admin_template_save_version(current_setting('at.t1')::uuid); raise exception 'tanpa perubahan harus ditolak';
  exception when others then if sqlerrm = 'tidak_ada_perubahan' then null; else raise; end if; end;
  reset role; update public.templates set description = 'Deskripsi diubah untuk uji versi kedua.' where id = current_setting('at.t1')::uuid;
  delete from public.template_assets where template_id = current_setting('at.t1')::uuid and slot_key = 'avatar_bride';
  perform pg_temp.as_user(current_setting('at.admin')::uuid);
  d := public.admin_template_detail(current_setting('at.t1')::uuid);
  if not (d->>'dirty')::boolean then raise exception 'harus terdeteksi ada perubahan'; end if;
  n := public.admin_template_save_version(current_setting('at.t1')::uuid, 'Ubah deskripsi');
  if n <> 2 then raise exception 'versi kedua harus 2'; end if;
  reset role; update public.templates set description = 'Perubahan belum disimpan sebagai versi apa pun.' where id = current_setting('at.t1')::uuid;
  perform pg_temp.as_user(current_setting('at.admin')::uuid);
  r := public.admin_template_restore_version(current_setting('at.t1')::uuid, 1);
  reset role;
  if (select description from public.templates where id = current_setting('at.t1')::uuid) <> 'Template Luxe untuk pengujian kelengkapan aset.' then raise exception 'deskripsi tidak dipulihkan'; end if;
  if (select count(*) from public.template_assets where template_id = current_setting('at.t1')::uuid) <> 3 then raise exception 'aset tidak dipulihkan'; end if;
  if (select count(*) from public.template_versions where template_id = current_setting('at.t1')::uuid) <> 3 then raise exception 'cadangan otomatis harus ada (v3)'; end if;
  perform pg_temp.as_user(current_setting('at.admin')::uuid);
  d := public.admin_template_detail(current_setting('at.t1')::uuid);
  if (d->>'matches_version')::int <> 1 or (d->>'dirty')::boolean or jsonb_array_length(d->'versions') <> 3 then raise exception 'status versi salah: %', d - 'readiness'; end if;
  raise notice 'OK versi: simpan, tolak tanpa perubahan, deteksi perubahan, pulihkan dengan cadangan otomatis';
  perform public.admin_template_action(current_setting('at.t1')::uuid, 'archive');
  perform public.admin_template_action(current_setting('at.t1')::uuid, 'unarchive');
  perform public.admin_template_action(current_setting('at.t1')::uuid, 'publish');
  begin perform public.admin_template_restore_version(current_setting('at.t1')::uuid, 1); raise exception 'terbit tidak boleh dipulihkan';
  exception when others then if sqlerrm = 'masih_terbit' then raise notice 'OK arsip/pulihkan/terbit; pemulihan versi ditolak saat terbit'; else raise; end if; end;
end $$;

-- 8. penggunaan & penanda pelanggan
do $$ declare o jsonb; f jsonb; c uuid := current_setting('at.cust')::uuid; begin
  reset role;
  insert into public.invitations (user_id, title, slug, template_id, status, content) values (c, 'U1', 'at-u1', 'at-luxe', 'aktif', '{}'), (c, 'U2', 'at-u2', 'at-luxe', 'draft', '{}'), (c, 'U3', 'at-u3', 'at-luxe', 'aktif', '{}');
  perform pg_temp.as_user(current_setting('at.admin')::uuid);
  o := (public.admin_templates_overview())->(current_setting('at.t1'));
  if (o->>'usage_total')::int <> 3 or (o->>'usage_active')::int <> 2 or not (o->>'ready')::boolean then raise exception 'penggunaan salah: %', o; end if;
  if ((public.admin_template_detail(current_setting('at.t1')::uuid))->'usage'->>'draft')::int <> 1 then raise exception 'rincian penggunaan salah'; end if;
  perform public.admin_template_settings(current_setting('at.t1')::uuid, '{"featured":true}');
  reset role; set role anon; f := public.template_flags(); reset role;
  if not (f->'at-luxe'->>'featured')::boolean or f ? 'at-ess' then raise exception 'penanda pelanggan salah: %', f; end if;
  perform pg_temp.as_user(current_setting('at.admin')::uuid);
  begin perform public.admin_template_settings(current_setting('at.t1')::uuid, '{"package_type":"essential"}'); raise exception 'dipakai undangan harus ditolak';
  exception when others then if sqlerrm in ('template_dipakai','aset_terpasang','masih_terbit') then null; else raise; end if; end;
  raise notice 'OK jumlah penggunaan (total, aktif, draft) & penanda publik hanya template terbit';
end $$;

-- 9. hak akses
do $$ begin
  perform pg_temp.as_user(current_setting('at.support')::uuid);
  begin perform public.admin_template_detail(current_setting('at.t1')::uuid); raise exception 'support tidak punya izin templates';
  exception when others then if sqlerrm like 'forbidden%' then null; else raise; end if; end;
  begin perform public.admin_template_action(current_setting('at.t1')::uuid, 'archive'); raise exception 'support tidak boleh menulis';
  exception when others then if sqlerrm like 'forbidden%' then null; else raise; end if; end;
  perform pg_temp.as_user(current_setting('at.cust')::uuid);
  begin perform public.admin_template_detail(current_setting('at.t1')::uuid); raise exception 'pelanggan harus ditolak';
  exception when others then if sqlerrm like 'forbidden%' then null; else raise; end if; end;
  begin perform public.admin_templates_overview(); raise exception 'pelanggan harus ditolak';
  exception when others then if sqlerrm like 'forbidden%' then null; else raise; end if; end;
  begin perform public.tpl_readiness(current_setting('at.t1')::uuid); raise exception 'helper internal tidak boleh dipanggil';
  exception when insufficient_privilege then null; end;
  if exists (select 1 from public.template_versions) then raise exception 'pelanggan tidak boleh membaca versi'; end if;
  reset role; set role anon;
  begin perform public.admin_template_action(current_setting('at.t1')::uuid, 'archive'); raise exception 'anon harus ditolak';
  exception when insufficient_privilege then null; end;
  reset role;
  raise notice 'OK hak akses: peran tanpa izin templates, pelanggan & anon ditolak';
end $$;
reset role;
delete from public.invitations where slug like 'at-u%';
delete from public.templates where slug like 'at-%';
delete from public.assets where file_path like 'incoming/at-%';
delete from auth.users where email like 'at.%@uji.nusamora.test';
