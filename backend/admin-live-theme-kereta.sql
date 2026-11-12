-- Contoh tema: "Little Petualangan Kereta Api" (merah marun, cokelat, emas), jenis acara ulang tahun. Aditif & idempoten.
-- NONAKTIF sampai admin mengunggah panorama + dekor + avatar (lihat little-kereta-dekor.zip) dan mengaktifkannya.
-- Jalankan SETELAH admin-live-theme.sql, admin-live-decor.sql dan admin-live-decor-avatars.sql.
insert into public.live_venues (key, name, event_type, areas, max_guests, active, sort, bg_pos, nm_theme)
select 'little-kereta', 'Little Petualangan Kereta Api (ulang tahun)', 'birthday', coalesce((select areas from public.live_venues where key = 'romantic-garden'), '[]'::jsonb), 300, false, 70, 'center 38%',
  $t${"name":"Little Petualangan Kereta Api","orn":"diamond",
  "ui":{"ivory":"#FFF6EC","white":"#FFFFFF","soft":"#EBCFB0","soft2":"#C99B6B","accent":"#9E1B2E","deep":"#4A2A18","ink":"#2E1A10","mute":"#8A6F5A","line":"#E2CBB0","serif":"Fredoka,\"Cormorant Garamond\",sans-serif","sans":"Inter,system-ui,sans-serif","rad":18,"btnr":14,"btnt":"none","btnls":".02em"},
  "mono":{"font":"Fredoka,\"Cormorant Garamond\",sans-serif","it":0,"paper":"#FFF0DD","ink":"#2E1A10","accent":"#9E1B2E","gold":"#D9A62E","leaf":"#E2CBB0","hbg":"rgba(255,246,236,.94)","hline":"#C99B6B","motif":"diamond"},
  "hud":{"bg":"rgba(46,26,16,.72)","acc":"#F0C25A","on":"#2E1A10"},"scr":{"wine":"#7A1424","veil":"255,246,236"}}$t$::jsonb
where not exists (select 1 from public.live_venues where key = 'little-kereta');
