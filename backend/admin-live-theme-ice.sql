-- Contoh tema: "Little Putri Es" (biru es, perak, putih), jenis acara ulang tahun. Aditif & idempoten.
-- NONAKTIF sampai admin mengunggah panorama + dekor + avatar (lihat little-ice-dekor.zip) dan mengaktifkannya.
-- Jalankan SETELAH admin-live-theme.sql, admin-live-decor.sql dan admin-live-decor-avatars.sql.
insert into public.live_venues (key, name, event_type, areas, max_guests, active, sort, bg_pos, nm_theme)
select 'little-ice', 'Little Putri Es (ulang tahun)', 'birthday', coalesce((select areas from public.live_venues where key = 'romantic-garden'), '[]'::jsonb), 300, false, 60, 'center 38%',
  $t${"name":"Little Putri Es","orn":"diamond",
  "ui":{"ivory":"#F4F9FF","white":"#FFFFFF","soft":"#DCEBFA","soft2":"#A9CCF0","accent":"#3F86D8","deep":"#1F4F96","ink":"#173660","mute":"#6A82A0","line":"#CBE0F5","serif":"Fredoka,\"Cormorant Garamond\",sans-serif","sans":"Inter,system-ui,sans-serif","rad":18,"btnr":14,"btnt":"none","btnls":".02em"},
  "mono":{"font":"Fredoka,\"Cormorant Garamond\",sans-serif","it":0,"paper":"#EAF3FF","ink":"#1F4F96","accent":"#3F86D8","gold":"#B9D4F2","leaf":"#9CCBF2","hbg":"rgba(244,249,255,.94)","hline":"#A9CCF0","motif":"diamond"},
  "hud":{"bg":"rgba(31,79,150,.64)","acc":"#E6F3FF","on":"#173660"},"scr":{"wine":"#3F86D8","veil":"244,249,255"}}$t$::jsonb
where not exists (select 1 from public.live_venues where key = 'little-ice');
