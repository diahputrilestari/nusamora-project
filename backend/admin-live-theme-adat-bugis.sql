-- Contoh tema: "Adat Bugis" (merah marun, emas, krem), jenis acara pernikahan. Aditif & idempoten.
-- NONAKTIF sampai admin mengunggah panorama + dekor + avatar (lihat adat-bugis-dekor.zip) dan mengaktifkannya.
-- Jalankan SETELAH admin-live-theme.sql, admin-live-decor.sql dan admin-live-decor-avatars.sql.
insert into public.live_venues (key, name, event_type, areas, max_guests, active, sort, bg_pos, nm_theme)
select 'adat-bugis', 'Adat Bugis (pernikahan)', 'wedding', $a$[
 {"id":"stage","name":"Garden Utama","x":0,"z":-27,"icon":"💒","enabled":true},{"id":"resepsi","name":"Area Resepsi","x":0,"z":-0.5,"icon":"🍽️","enabled":true},
 {"id":"booth","name":"Photo Booth","x":-14,"z":-5.1,"icon":"📸","enabled":true},{"id":"galeri","name":"Galeri Foto","x":14,"z":-5.1,"icon":"📷","enabled":true},
 {"id":"video","name":"Video Ucapan","x":6.2,"z":-6.6,"icon":"🎬","enabled":true},{"id":"buku","name":"Buku Tamu","x":-4.6,"z":9.5,"icon":"📖","enabled":true},
 {"id":"kuliner","name":"Area Kuliner","x":-14,"z":-11,"icon":"🍢","enabled":true},{"id":"istirahat","name":"Area Istirahat","x":14,"z":5,"icon":"🛋️","enabled":true}]$a$::jsonb, 300, false, 83, 'center 38%',
  $t${"name":"Adat Bugis","orn":"diamond",
  "ui":{"ivory":"#FFF6E8","white":"#FFFFFF","soft":"#F3D9B0","soft2":"#D9A441","accent":"#A3162B","deep":"#5E0F1D","ink":"#3A0A12","mute":"#8A5B4A","line":"#EBD3B0","serif":"Fredoka,\"Cormorant Garamond\",sans-serif","sans":"Inter,system-ui,sans-serif","rad":18,"btnr":14,"btnt":"none","btnls":".02em"},
  "mono":{"font":"Fredoka,\"Cormorant Garamond\",sans-serif","it":0,"paper":"#F8EBD3","ink":"#3A0A12","accent":"#A3162B","gold":"#D9A21B","leaf":"#F4E4C8","hbg":"rgba(255,246,232,.94)","hline":"#D9A441","motif":"diamond"},
  "hud":{"bg":"rgba(94,15,29,.8)","acc":"#F2C23A","on":"#3A0A12"},"scr":{"wine":"#5E0F1D","veil":"255,246,232"}}$t$::jsonb
where not exists (select 1 from public.live_venues where key = 'adat-bugis');
