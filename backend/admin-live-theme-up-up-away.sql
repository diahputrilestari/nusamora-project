-- Tema "Up Up & Away" (pastel ungu-pink, balon udara), jenis acara pernikahan. Aditif & idempoten.
-- NONAKTIF sampai admin mengunggah panorama + dekor + avatar (lihat up-up-away-dekor.zip) dan mengaktifkannya.
-- Jalankan SETELAH admin-live-theme.sql, admin-live-decor.sql dan admin-live-decor-avatars.sql.
insert into public.live_venues (key, name, event_type, areas, max_guests, active, sort, bg_pos, nm_theme)
select 'up-up-away', 'Up Up & Away (pernikahan)', 'wedding', $a$[
 {"id":"stage","name":"Garden Utama","x":0,"z":-27,"icon":"💒","enabled":true},{"id":"resepsi","name":"Area Resepsi","x":0,"z":-0.5,"icon":"🍽️","enabled":true},
 {"id":"booth","name":"Photo Booth","x":-14,"z":-5.1,"icon":"📸","enabled":true},{"id":"galeri","name":"Galeri Foto","x":14,"z":-5.1,"icon":"📷","enabled":true},
 {"id":"video","name":"Video Ucapan","x":6.2,"z":-6.6,"icon":"🎬","enabled":true},{"id":"buku","name":"Buku Tamu","x":-4.6,"z":9.5,"icon":"📖","enabled":true},
 {"id":"kuliner","name":"Area Kuliner","x":-14,"z":-11,"icon":"🍢","enabled":true},{"id":"istirahat","name":"Area Istirahat","x":14,"z":5,"icon":"🛋️","enabled":true}]$a$::jsonb, 300, false, 88, 'center 38%',
  $t${"name":"Up Up & Away","orn":"blossom","ui":{"ivory":"#FBF5FF","white":"#FFFFFF","soft":"#EFE3FA","soft2":"#DCC8F2","accent":"#8E63C9","deep":"#5B3A91","ink":"#3A2A55","mute":"#8576A3","line":"#E6D8F5","serif":"\"Cormorant Garamond\",serif","sans":"Inter,system-ui,sans-serif","rad":18,"btnr":14,"btnt":"none","btnls":".02em"},"mono":{"font":"\"Cormorant Garamond\",serif","it":0,"paper":"#FFF8FD","ink":"#5B3A91","accent":"#8E63C9","gold":"#D9A21B","leaf":"#B9A0DC","hbg":"rgba(255,248,253,.94)","hline":"#D9C3F0","motif":"blossom"},"hud":{"bg":"rgba(70,40,110,.62)","acc":"#F4B6D8","on":"#3A1F5C"},"scr":{"wine":"#8E63C9","veil":"251,245,255"}}$t$::jsonb
where not exists (select 1 from public.live_venues where key = 'up-up-away');
