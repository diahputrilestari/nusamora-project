-- Impor avatar tamu laki-laki template "Adat Jawa Tengah" (jawa-tengah) ke Asset Library + slot template.
-- Gambar sudah ada di situs: /assets/avatars/jawa-tengah/guest-male/*.webp (diekstrak dari data demo Live Guest).
-- Jalankan SETELAH asset-schema.sql. Idempoten: aman dijalankan ulang (tidak menggandakan aset/slot).
-- Hasil: 7 aset kategori "Guest avatars" (peran pria) dan 7 pemetaan di slot avatar_male (umum, semua tema).
do $$
declare cat uuid; tpl uuid; r record; n int := 0; aid uuid;
begin
  select id into cat from public.asset_categories where package_type = 'luxe' and slug = 'guest-avatar';
  if cat is null then raise exception 'Kategori luxe/guest-avatar belum ada: jalankan backend/asset-schema.sql dahulu.'; end if;
  select id into tpl from public.templates where slug = 'jawa-tengah';
  if tpl is null then raise notice 'Template jawa-tengah tidak ditemukan; tidak ada yang diimpor.'; return; end if;
  for r in select * from (values
    ('jgl0','Beskap Navy Sulam','jgl0.webp',58100,400,720,true,'174579aa8c855055b1b1e7c107fdb196df636564e6ce9d39654b8a0393331a39'),
    ('jgl1','Beskap Krem Selendang','jgl1.webp',59120,400,720,true,'72322c49f167036956f9522e6d2cb1158cb01f6570ea476415cd1a7e839e5e84'),
    ('jgl2','Beskap Hijau Zaitun','jgl2.webp',57292,400,720,true,'c93e36d030b38501eb700a1d964d84f82fcb9a82dac5360026f4b8ab552751da'),
    ('jgl3','Beskap Marun Sabuk','jgl3.webp',56594,400,720,true,'3a7102081a19ff0c9d7d3c0128b47de350f73f9cd2699737514b5beee75c3d8c'),
    ('jgl4','Beskap Abu Rantai','jgl4.webp',56194,400,720,true,'a5410a1c4c1debae2bd1349c692a16bb5eb4a75d2a145f7ce91cd64a65028736'),
    ('jgl5','Beskap Hitam Sulam','jgl5.webp',57366,400,720,true,'6bd709b50d3b8ad3ff9733c7c34195365d1dd5de5363ef36fe1884c1ee6eb991'),
    ('jgl6','Beskap Emas Cokelat','jgl6.webp',60014,400,720,true,'cc034b316d3e767f5abe6d395ee31f0d57f52cd9844daa9c3e8602c33d8c1e4b')
  ) as v(code, name, fn, size, w, h, alpha, sha) loop
    n := n + 1;
    insert into public.assets (name, description, category_id, package_types, theme_key, file_path, file_url, file_type, mime, file_size, width, height, tags, is_transparent, checksum, attrs)
    values (r.name, 'Avatar tamu laki-laki template Adat Jawa Tengah', cat, array['luxe'], null,
            'legacy/jawa-tengah/guest-male/' || r.fn, '/assets/avatars/jawa-tengah/guest-male/' || r.fn, 'webp', 'image/webp', r.size, r.w, r.h,
            array['jawa','beskap','tamu','pria'], r.alpha, r.sha, '{"avatar_role":"pria"}'::jsonb)
    on conflict (file_path) do nothing;
    select id into aid from public.assets where file_path = 'legacy/jawa-tengah/guest-male/' || r.fn and deleted_at is null;
    if aid is not null then
      insert into public.template_assets (template_id, theme_id, slot_key, section, asset_id, position, config)
      values (tpl, null, 'avatar_male', 'general', aid, n, '{}'::jsonb)
      on conflict do nothing;
    end if;
  end loop;
end $$;

select a.name, ta.slot_key, ta.position from public.template_assets ta join public.assets a on a.id = ta.asset_id
 join public.templates t on t.id = ta.template_id where t.slug = 'jawa-tengah' and ta.slot_key = 'avatar_male' order by ta.position;
