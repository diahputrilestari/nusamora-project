-- Contoh tema: "Hackathon" (ungu, biru neon), jenis acara event. Aditif & idempoten.
-- Menu: area Resepsi & Video dimatikan; nama/label area disesuaikan untuk event (label = teks pendek tombol menu, perlu live-bridge.js terbaru).
-- NONAKTIF sampai admin mengunggah panorama + dekor + avatar (lihat hackathon-dekor.zip) dan mengaktifkannya.
-- Jalankan SETELAH admin-live-theme.sql, admin-live-decor.sql dan admin-live-decor-avatars.sql.
insert into public.live_venues (key, name, event_type, areas, max_guests, active, sort, bg_pos, nm_theme)
select 'hackathon', 'Hackathon (event)', 'corporate', $a$[
 {"id":"stage","name":"Main Stage","label":"Main Stage","x":0,"z":-27,"icon":"🎤","enabled":true},{"id":"resepsi","name":"Area Resepsi","x":0,"z":-0.5,"icon":"🍽️","enabled":false},
 {"id":"booth","name":"Photo Booth","label":"Photo Booth","x":-15,"z":-6.1,"icon":"📸","enabled":true},{"id":"galeri","name":"Galeri Foto Acara","label":"Galeri Foto","x":15,"z":-6.1,"icon":"📷","enabled":true},
 {"id":"video","name":"Video Ucapan","x":6.2,"z":-6.6,"icon":"🎬","enabled":false},{"id":"buku","name":"Guest Book","label":"Guest Book","x":-4.8,"z":9.5,"icon":"📖","enabled":true},
 {"id":"kuliner","name":"Food & Drink","label":"Food & Drink","x":-14,"z":-11,"icon":"🥤","enabled":true},{"id":"istirahat","name":"Networking Lounge","label":"Networking","x":9.5,"z":-19,"icon":"🤝","enabled":true}]$a$::jsonb, 300, false, 81, 'center 38%',
  $t${"name":"Hackathon","orn":"line",
  "ui":{"ivory":"#F2F0FF","white":"#FFFFFF","soft":"#CFC9F7","soft2":"#8F86E0","accent":"#5B3FD6","deep":"#251A6B","ink":"#150F45","mute":"#6A62A8","line":"#D5D0F4","serif":"Fredoka,\"Cormorant Garamond\",sans-serif","sans":"Inter,system-ui,sans-serif","rad":18,"btnr":14,"btnt":"none","btnls":".02em"},
  "mono":{"font":"Fredoka,\"Cormorant Garamond\",sans-serif","it":0,"paper":"#E9E6FB","ink":"#150F45","accent":"#5B3FD6","gold":"#27C4E8","leaf":"#D9D4F8","hbg":"rgba(242,240,255,.94)","hline":"#8F86E0","motif":"line"},
  "hud":{"bg":"rgba(37,26,107,.82)","acc":"#35D0F0","on":"#150F45"},"scr":{"wine":"#251A6B","veil":"242,240,255"}}$t$::jsonb
where not exists (select 1 from public.live_venues where key = 'hackathon');
