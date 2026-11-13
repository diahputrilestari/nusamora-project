-- Contoh tema: "K-Pop Birthday" (ulang tahun idol, ungu & pink neon), jenis acara event. Aditif & idempoten.
-- Menu: area Resepsi & Video dimatikan; nama/label area disesuaikan untuk event (label = teks pendek tombol menu, perlu live-bridge.js terbaru).
-- NONAKTIF sampai admin mengunggah panorama + dekor + avatar (lihat kpop-birthday-dekor.zip) dan mengaktifkannya.
-- Jalankan SETELAH admin-live-theme.sql, admin-live-decor.sql dan admin-live-decor-avatars.sql.
insert into public.live_venues (key, name, event_type, areas, max_guests, active, sort, bg_pos, nm_theme)
select 'kpop-birthday', 'K-Pop Birthday (event)', 'corporate', $a$[
 {"id":"stage","name":"Konser Utama","label":"Main Stage","x":0,"z":-27,"icon":"🎤","enabled":true},{"id":"resepsi","name":"Area Resepsi","x":0,"z":-0.5,"icon":"🍽️","enabled":false},
 {"id":"booth","name":"Photo Booth","label":"Photo Booth","x":-15,"z":-6.1,"icon":"📸","enabled":true},{"id":"galeri","name":"Galeri Foto","label":"Galeri Foto","x":15,"z":-6.1,"icon":"📷","enabled":true},
 {"id":"video","name":"Video Ucapan","x":6.2,"z":-6.6,"icon":"🎬","enabled":false},{"id":"buku","name":"Guest Book","label":"Guest Book","x":-4.8,"z":9.5,"icon":"📖","enabled":true},
 {"id":"kuliner","name":"Food & Drink","label":"Food & Drink","x":-14,"z":-11,"icon":"🥤","enabled":true},{"id":"istirahat","name":"Networking","label":"Networking","x":9.5,"z":-19,"icon":"🤝","enabled":true}]$a$::jsonb, 300, false, 82, 'center 38%',
  $t${"name":"K-Pop Birthday","orn":"sparkle",
  "ui":{"ivory":"#FBF3FF","white":"#FFFFFF","soft":"#E8D4FF","soft2":"#B98CF2","accent":"#9B4FE6","deep":"#3C1D7C","ink":"#2A1358","mute":"#8466B8","line":"#EAD9FA","serif":"Fredoka,\"Cormorant Garamond\",sans-serif","sans":"Inter,system-ui,sans-serif","rad":18,"btnr":14,"btnt":"none","btnls":".02em"},
  "mono":{"font":"Fredoka,\"Cormorant Garamond\",sans-serif","it":0,"paper":"#F3E6FD","ink":"#2A1358","accent":"#9B4FE6","gold":"#FF7ACB","leaf":"#EFDDFC","hbg":"rgba(251,243,255,.94)","hline":"#B98CF2","motif":"line"},
  "hud":{"bg":"rgba(60,29,124,.82)","acc":"#FF8AD6","on":"#2A1358"},"scr":{"wine":"#3C1D7C","veil":"251,243,255"}}$t$::jsonb
where not exists (select 1 from public.live_venues where key = 'kpop-birthday');
