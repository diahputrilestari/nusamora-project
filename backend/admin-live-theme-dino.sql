-- Contoh tema: "Little Dino Friends" (hijau, krem, oranye), jenis acara ulang tahun. Aditif & idempoten.
-- NONAKTIF sampai admin mengunggah panorama + dekor + avatar (lihat little-dino-dekor.zip) dan mengaktifkannya.
-- Jalankan SETELAH admin-live-theme.sql, admin-live-decor.sql dan admin-live-decor-avatars.sql.
insert into public.live_venues (key, name, event_type, areas, max_guests, active, sort, bg_pos, nm_theme)
select 'little-dino', 'Little Dino Friends (ulang tahun)', 'birthday', coalesce((select areas from public.live_venues where key = 'romantic-garden'), '[]'::jsonb), 300, false, 72, 'center 38%',
  $t${"name":"Little Dino Friends","orn":"leaf",
  "ui":{"ivory":"#FBF7E8","white":"#FFFFFF","soft":"#DCE6BC","soft2":"#A9C27A","accent":"#4C8A2B","deep":"#2F4F1B","ink":"#2A3A16","mute":"#7A8260","line":"#D8DDB8","serif":"Fredoka,\"Cormorant Garamond\",sans-serif","sans":"Inter,system-ui,sans-serif","rad":18,"btnr":14,"btnt":"none","btnls":".02em"},
  "mono":{"font":"Fredoka,\"Cormorant Garamond\",sans-serif","it":0,"paper":"#F6F2D8","ink":"#2A3A16","accent":"#4C8A2B","gold":"#E89A2B","leaf":"#C9D9A0","hbg":"rgba(251,247,232,.94)","hline":"#A9C27A","motif":"leaf"},
  "hud":{"bg":"rgba(47,79,27,.72)","acc":"#F5B942","on":"#2A3A16"},"scr":{"wine":"#4C8A2B","veil":"251,247,232"}}$t$::jsonb
where not exists (select 1 from public.live_venues where key = 'little-dino');
