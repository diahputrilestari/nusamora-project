-- Contoh tema: "Luxury Maroon" (merah marun, krem, emas), jenis acara pernikahan. Aditif & idempoten.
-- NONAKTIF sampai admin mengunggah panorama + dekor + avatar (lihat luxury-maroon-dekor.zip) dan mengaktifkannya.
-- Jalankan SETELAH admin-live-theme.sql, admin-live-decor.sql dan admin-live-decor-avatars.sql.
insert into public.live_venues (key, name, event_type, areas, max_guests, active, sort, bg_pos, nm_theme)
select 'luxury-maroon', 'Luxury Maroon (pernikahan)', 'wedding', $a$[
 {"id":"stage","name":"Garden Utama","x":0,"z":-27,"icon":"💒","enabled":true},{"id":"resepsi","name":"Area Resepsi","x":0,"z":-0.5,"icon":"🍽️","enabled":true},
 {"id":"booth","name":"Photo Booth","x":-14,"z":-5.1,"icon":"📸","enabled":true},{"id":"galeri","name":"Galeri Foto","x":14,"z":-5.1,"icon":"📷","enabled":true},
 {"id":"video","name":"Video Ucapan","x":6.2,"z":-6.6,"icon":"🎬","enabled":true},{"id":"buku","name":"Buku Tamu","x":-4.6,"z":9.5,"icon":"📖","enabled":true},
 {"id":"kuliner","name":"Area Kuliner","x":-14,"z":-11,"icon":"🍢","enabled":true},{"id":"istirahat","name":"Area Istirahat","x":14,"z":5,"icon":"🛋️","enabled":true}]$a$::jsonb, 300, false, 85, 'center 38%',
  $t${"name":"Luxury Maroon","orn":"diamond",
  "ui":{"ivory":"#FBF3EC","white":"#FFFFFF","soft":"#EBCFC6","soft2":"#C98A8F","accent":"#7E1230","deep":"#4A0A1B","ink":"#2E0610","mute":"#8A5A5E","line":"#E6CFC8","serif":"Fredoka,\"Cormorant Garamond\",sans-serif","sans":"Inter,system-ui,sans-serif","rad":18,"btnr":14,"btnt":"none","btnls":".02em"},
  "mono":{"font":"Fredoka,\"Cormorant Garamond\",sans-serif","it":0,"paper":"#F6E6DE","ink":"#2E0610","accent":"#7E1230","gold":"#D9A21B","leaf":"#EFD9D2","hbg":"rgba(251,243,236,.94)","hline":"#C98A8F","motif":"diamond"},
  "hud":{"bg":"rgba(74,10,27,.8)","acc":"#F2C23A","on":"#2E0610"},"scr":{"wine":"#4A0A1B","veil":"251,243,236"}}$t$::jsonb
where not exists (select 1 from public.live_venues where key = 'luxury-maroon');
