-- Contoh tema: "Little Farm" (merah, krem, hijau), jenis acara ulang tahun. Aditif & idempoten.
-- NONAKTIF sampai admin mengunggah panorama + dekor + avatar (lihat little-farm-dekor.zip) dan mengaktifkannya.
-- Jalankan SETELAH admin-live-theme.sql, admin-live-decor.sql dan admin-live-decor-avatars.sql.
insert into public.live_venues (key, name, event_type, areas, max_guests, active, sort, bg_pos, nm_theme)
select 'little-farm', 'Little Farm (ulang tahun)', 'birthday', coalesce((select areas from public.live_venues where key = 'romantic-garden'), '[]'::jsonb), 300, false, 73, 'center 38%',
  $t${"name":"Little Farm","orn":"confetti",
  "ui":{"ivory":"#FFF7EA","white":"#FFFFFF","soft":"#F6D9C4","soft2":"#E3A98A","accent":"#C8372D","deep":"#7A2A1E","ink":"#3E1F14","mute":"#8E6F5E","line":"#EBCDB8","serif":"Fredoka,\"Cormorant Garamond\",sans-serif","sans":"Inter,system-ui,sans-serif","rad":18,"btnr":14,"btnt":"none","btnls":".02em"},
  "mono":{"font":"Fredoka,\"Cormorant Garamond\",sans-serif","it":0,"paper":"#FFF0DC","ink":"#3E1F14","accent":"#C8372D","gold":"#E8A92B","leaf":"#DDE3B0","hbg":"rgba(255,247,234,.94)","hline":"#E3A98A","motif":"confetti"},
  "hud":{"bg":"rgba(122,42,30,.72)","acc":"#F5C242","on":"#3E1F14"},"scr":{"wine":"#B02E26","veil":"255,247,234"}}$t$::jsonb
where not exists (select 1 from public.live_venues where key = 'little-farm');
