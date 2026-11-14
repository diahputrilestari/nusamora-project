-- Contoh tema: "Luxury Emerald" (hitam, emas, krem), jenis acara pernikahan. Aditif & idempoten.
-- NONAKTIF sampai admin mengunggah panorama + dekor + avatar (lihat luxury-emerald-dekor.zip) dan mengaktifkannya.
-- Jalankan SETELAH admin-live-theme.sql, admin-live-decor.sql dan admin-live-decor-avatars.sql.
insert into public.live_venues (key, name, event_type, areas, max_guests, active, sort, bg_pos, nm_theme)
select 'luxury-emerald', 'Luxury Emerald (pernikahan)', 'wedding', $a$[
 {"id":"stage","name":"Garden Utama","x":0,"z":-27,"icon":"💒","enabled":true},{"id":"resepsi","name":"Area Resepsi","x":0,"z":-0.5,"icon":"🍽️","enabled":true},
 {"id":"booth","name":"Photo Booth","x":-14,"z":-5.1,"icon":"📸","enabled":true},{"id":"galeri","name":"Galeri Foto","x":14,"z":-5.1,"icon":"📷","enabled":true},
 {"id":"video","name":"Video Ucapan","x":6.2,"z":-6.6,"icon":"🎬","enabled":true},{"id":"buku","name":"Buku Tamu","x":-4.6,"z":9.5,"icon":"📖","enabled":true},
 {"id":"kuliner","name":"Area Kuliner","x":-14,"z":-11,"icon":"🍢","enabled":true},{"id":"istirahat","name":"Area Istirahat","x":14,"z":5,"icon":"🛋️","enabled":true}]$a$::jsonb, 300, false, 87, 'center 38%',
  $t${"name":"Luxury Emerald","orn":"diamond","ui":{"ivory":"#0A1F18","white":"#FFFFFF","soft":"#1F3B2E","soft2":"#3F7A5E","accent":"#C9A24A","deep":"#E8CB7A","ink":"#F3EBD3","mute":"#9DB8A8","line":"#24493A","serif":"\"Cormorant Garamond\",serif","sans":"Inter,system-ui,sans-serif","rad":18,"btnr":14,"btnt":"none","btnls":".02em"},"mono":{"font":"\"Cormorant Garamond\",serif","it":0,"paper":"#12291F","ink":"#F3EBD3","accent":"#C9A24A","gold":"#D9A21B","leaf":"#16382A","hbg":"rgba(10,31,24,.94)","hline":"#B8913A","motif":"diamond"},"hud":{"bg":"rgba(232,203,122,.82)","acc":"#F2C23A","on":"#10241B"},"scr":{"wine":"#E8CB7A","veil":"10,31,24"}}$t$::jsonb
where not exists (select 1 from public.live_venues where key = 'luxury-emerald');
