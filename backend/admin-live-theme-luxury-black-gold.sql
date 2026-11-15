-- Contoh tema: "Luxury Black Gold" (hitam, emas, krem), jenis acara pernikahan. Aditif & idempoten.
-- NONAKTIF sampai admin mengunggah panorama + dekor + avatar (lihat luxury-black-gold-dekor.zip) dan mengaktifkannya.
-- Jalankan SETELAH admin-live-theme.sql, admin-live-decor.sql dan admin-live-decor-avatars.sql.
insert into public.live_venues (key, name, event_type, areas, max_guests, active, sort, bg_pos, nm_theme)
select 'luxury-black-gold', 'Luxury Black Gold (pernikahan)', 'wedding', $a$[
 {"id":"stage","name":"Garden Utama","x":0,"z":-27,"icon":"💒","enabled":true},{"id":"resepsi","name":"Area Resepsi","x":0,"z":-0.5,"icon":"🍽️","enabled":true},
 {"id":"booth","name":"Photo Booth","x":-14,"z":-5.1,"icon":"📸","enabled":true},{"id":"galeri","name":"Galeri Foto","x":14,"z":-5.1,"icon":"📷","enabled":true},
 {"id":"video","name":"Video Ucapan","x":6.2,"z":-6.6,"icon":"🎬","enabled":true},{"id":"buku","name":"Buku Tamu","x":-4.6,"z":9.5,"icon":"📖","enabled":true},
 {"id":"kuliner","name":"Area Kuliner","x":-14,"z":-11,"icon":"🍢","enabled":true},{"id":"istirahat","name":"Area Istirahat","x":14,"z":5,"icon":"🛋️","enabled":true}]$a$::jsonb, 300, false, 86, 'center 38%',
  $t${"name":"Luxury Black Gold","orn":"diamond",
  "ui":{"ivory":"#0E0C09","white":"#FFFFFF","soft":"#3A3122","soft2":"#8C7336","accent":"#C9A24A","deep":"#E8CB7A","ink":"#F5EAD0","mute":"#A69673","line":"#3E3526","serif":"Fredoka,\"Cormorant Garamond\",sans-serif","sans":"Inter,system-ui,sans-serif","rad":18,"btnr":14,"btnt":"none","btnls":".02em"},
  "mono":{"font":"Fredoka,\"Cormorant Garamond\",sans-serif","it":0,"paper":"#1A1610","ink":"#F5EAD0","accent":"#C9A24A","gold":"#D9A21B","leaf":"#2A2318","hbg":"rgba(14,12,9,.94)","hline":"#8C7336","motif":"diamond"},
  "hud":{"bg":"rgba(232,203,122,.8)","acc":"#F2C23A","on":"#F5EAD0"},"scr":{"wine":"#E8CB7A","veil":"14,12,9"}}$t$::jsonb
where not exists (select 1 from public.live_venues where key = 'luxury-black-gold');
