-- Contoh tema: "Beige Elegant" (beige, krem, emas), jenis acara pernikahan. Aditif & idempoten.
-- NONAKTIF sampai admin mengunggah panorama + dekor + avatar (lihat beige-elegant-dekor.zip) dan mengaktifkannya.
-- Jalankan SETELAH admin-live-theme.sql, admin-live-decor.sql dan admin-live-decor-avatars.sql.
insert into public.live_venues (key, name, event_type, areas, max_guests, active, sort, bg_pos, nm_theme)
select 'beige-elegant', 'Beige Elegant (pernikahan)', 'wedding', $a$[
 {"id":"stage","name":"Garden Utama","x":0,"z":-27,"icon":"💒","enabled":true},{"id":"resepsi","name":"Area Resepsi","x":0,"z":-0.5,"icon":"🍽️","enabled":true},
 {"id":"booth","name":"Photo Booth","x":-14,"z":-5.1,"icon":"📸","enabled":true},{"id":"galeri","name":"Galeri Foto","x":14,"z":-5.1,"icon":"📷","enabled":true},
 {"id":"video","name":"Video Ucapan","x":6.2,"z":-6.6,"icon":"🎬","enabled":true},{"id":"buku","name":"Buku Tamu","x":-4.6,"z":9.5,"icon":"📖","enabled":true},
 {"id":"kuliner","name":"Area Kuliner","x":-14,"z":-11,"icon":"🍢","enabled":true},{"id":"istirahat","name":"Area Istirahat","x":14,"z":5,"icon":"🛋️","enabled":true}]$a$::jsonb, 300, false, 84, 'center 38%',
  $t${"name":"Beige Elegant","orn":"blossom",
  "ui":{"ivory":"#FBF5EA","white":"#FFFFFF","soft":"#EBD9BC","soft2":"#C9A877","accent":"#B08A4E","deep":"#6B4A2B","ink":"#3F2A16","mute":"#8E7456","line":"#E8D8BE","serif":"Fredoka,\"Cormorant Garamond\",sans-serif","sans":"Inter,system-ui,sans-serif","rad":18,"btnr":14,"btnt":"none","btnls":".02em"},
  "mono":{"font":"Fredoka,\"Cormorant Garamond\",sans-serif","it":0,"paper":"#F6ECD9","ink":"#3F2A16","accent":"#B08A4E","gold":"#D9A21B","leaf":"#E9E0C8","hbg":"rgba(251,245,234,.94)","hline":"#C9A877","motif":"blossom"},
  "hud":{"bg":"rgba(107,74,43,.8)","acc":"#F2C23A","on":"#3F2A16"},"scr":{"wine":"#6B4A2B","veil":"251,245,234"}}$t$::jsonb
where not exists (select 1 from public.live_venues where key = 'beige-elegant');
