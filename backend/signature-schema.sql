-- NusaMora: undangan Signature (3D) membaca data pelanggan dari database.
-- Paket Signature kini boleh menyimpan texts, couple, events, story, accounts (sebelumnya ditolak: konten_tidak_sesuai_paket).
-- Isi sama dengan pkg_keys di essential-schema.sql; file ini hanya jalan pintas bila essential-schema.sql tidak ingin dijalankan ulang.
-- Aman dijalankan ulang (idempoten). Jalankan di Supabase SQL Editor.

create or replace function public.pkg_keys(p text) returns text[] language sql immutable as $$
  select array['names','welcome','event','photos','music','features','gift','avatars'] || case p
    when 'essential' then array['design2d','texts','sections','couple','events','story','accounts']
    when 'signature' then array['scene','camera','anim','cinematic','texts','couple','events','story','accounts']
    when 'luxe' then array['scene','venue','live'] else array[]::text[] end
$$;
