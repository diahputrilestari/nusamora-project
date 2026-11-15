-- Tema "Little Ballerina" (pastel pink-lilac, balet), jenis acara ulang tahun. Aditif & idempoten.
-- NONAKTIF sampai admin mengunggah panorama + dekor + avatar (lihat little-ballerina-dekor.zip) dan mengaktifkannya.
-- Jalankan SETELAH admin-live-theme.sql, admin-live-decor.sql dan admin-live-decor-avatars.sql.
insert into public.live_venues (key, name, event_type, areas, max_guests, active, sort, bg_pos, nm_theme)
select 'little-ballerina', 'Little Ballerina (ulang tahun)', 'birthday', $a$[
 {"id":"stage","name":"Panggung Utama","x":0,"z":-27,"icon":"🎈","enabled":true},{"id":"resepsi","name":"Area Pesta","x":0,"z":-0.5,"icon":"🎂","enabled":true},
 {"id":"booth","name":"Photo Booth","x":-14,"z":-5.1,"icon":"📸","enabled":true},{"id":"galeri","name":"Galeri Foto","x":14,"z":-5.1,"icon":"📷","enabled":true},
 {"id":"video","name":"Video Ucapan","x":6.2,"z":-6.6,"icon":"🎬","enabled":true},{"id":"buku","name":"Buku Ucapan","x":-4.6,"z":9.5,"icon":"🎁","enabled":true},
 {"id":"kuliner","name":"Area Kuliner","x":-14,"z":-11,"icon":"🍢","enabled":true},{"id":"istirahat","name":"Area Istirahat","x":14,"z":5,"icon":"🛋️","enabled":true}]$a$::jsonb, 300, false, 90, 'center 38%',
  $t${"name":"Little Ballerina","orn":"sparkle","ui":{"ivory":"#FFF7FB","white":"#FFFFFF","soft":"#F8E6F2","soft2":"#EBCBE2","accent":"#A83A83","deep":"#6E2A5C","ink":"#43213A","mute":"#8E6C86","line":"#F0D6E8","serif":"\"Cormorant Garamond\",serif","sans":"Inter,system-ui,sans-serif","rad":18,"btnr":14,"btnt":"none","btnls":".02em"},"mono":{"font":"\"Cormorant Garamond\",serif","it":0,"paper":"#FFF3F9","ink":"#6E2A5C","accent":"#A83A83","gold":"#D9A21B","leaf":"#C9A0DC","hbg":"rgba(255,247,251,.94)","hline":"#E7B8D6","motif":"sparkle"},"hud":{"bg":"rgba(95,40,85,.62)","acc":"#F6B8DA","on":"#4A1F42"},"scr":{"wine":"#A83A83","veil":"255,247,251"}}$t$::jsonb
where not exists (select 1 from public.live_venues where key = 'little-ballerina');
