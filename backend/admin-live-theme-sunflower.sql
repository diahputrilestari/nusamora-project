-- Tema "Sunflower" (kuning bunga matahari, kebun), jenis acara ulang tahun. Aditif & idempoten.
-- NONAKTIF sampai admin mengunggah panorama + dekor + avatar (lihat sunflower-dekor.zip) dan mengaktifkannya.
-- Jalankan SETELAH admin-live-theme.sql, admin-live-decor.sql dan admin-live-decor-avatars.sql.
insert into public.live_venues (key, name, event_type, areas, max_guests, active, sort, bg_pos, nm_theme)
select 'sunflower', 'Sunflower (ulang tahun)', 'birthday', $a$[
 {"id":"stage","name":"Panggung Utama","x":0,"z":-27,"icon":"🎈","enabled":true},{"id":"resepsi","name":"Area Pesta","x":0,"z":-0.5,"icon":"🎂","enabled":true},
 {"id":"booth","name":"Photo Booth","x":-14,"z":-5.1,"icon":"📸","enabled":true},{"id":"galeri","name":"Galeri Foto","x":14,"z":-5.1,"icon":"📷","enabled":true},
 {"id":"video","name":"Video Ucapan","x":6.2,"z":-6.6,"icon":"🎬","enabled":true},{"id":"buku","name":"Buku Ucapan","x":-4.6,"z":9.5,"icon":"🎁","enabled":true},
 {"id":"kuliner","name":"Area Kuliner","x":-14,"z":-11,"icon":"🍢","enabled":true},{"id":"istirahat","name":"Area Istirahat","x":14,"z":5,"icon":"🛋️","enabled":true}]$a$::jsonb, 300, false, 89, 'center 38%',
  $t${"name":"Sunflower","orn":"sprig","ui":{"ivory":"#FFFAEB","white":"#FFFFFF","soft":"#FBEFC8","soft2":"#F2DB8E","accent":"#B87A00","deep":"#6B4A0E","ink":"#4A3410","mute":"#8A7447","line":"#F0E0A8","serif":"\"Cormorant Garamond\",serif","sans":"Inter,system-ui,sans-serif","rad":18,"btnr":14,"btnt":"none","btnls":".02em"},"mono":{"font":"\"Cormorant Garamond\",serif","it":0,"paper":"#FFF6D6","ink":"#6B4A0E","accent":"#D49A10","gold":"#E8B320","leaf":"#6E8F2E","hbg":"rgba(255,250,235,.94)","hline":"#E8CB6A","motif":"sprig"},"hud":{"bg":"rgba(90,62,12,.62)","acc":"#F7CE4A","on":"#3A2806"},"scr":{"wine":"#B87A00","veil":"255,250,235"}}$t$::jsonb
where not exists (select 1 from public.live_venues where key = 'sunflower');
