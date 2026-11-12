-- Contoh tema: "Little Strawberry" (merah stroberi, krem, hijau), jenis acara ulang tahun. Aditif & idempoten.
-- NONAKTIF sampai admin mengunggah panorama + dekor + avatar (lihat little-straw-dekor.zip) dan mengaktifkannya.
-- Jalankan SETELAH admin-live-theme.sql, admin-live-decor.sql dan admin-live-decor-avatars.sql.
insert into public.live_venues (key, name, event_type, areas, max_guests, active, sort, bg_pos, nm_theme)
select 'little-straw', 'Little Strawberry (ulang tahun)', 'birthday', coalesce((select areas from public.live_venues where key = 'romantic-garden'), '[]'::jsonb), 300, false, 63, 'center 38%',
  $t${"name":"Little Strawberry","orn":"blossom",
  "ui":{"ivory":"#FFF6F0","white":"#FFFFFF","soft":"#FBDDD8","soft2":"#F2A9A9","accent":"#D9344A","deep":"#9E2336","ink":"#5A1E28","mute":"#9A6A6A","line":"#F6CFC9","serif":"Fredoka,\"Cormorant Garamond\",sans-serif","sans":"Inter,system-ui,sans-serif","rad":18,"btnr":14,"btnt":"none","btnls":".02em"},
  "mono":{"font":"Fredoka,\"Cormorant Garamond\",sans-serif","it":0,"paper":"#FFF0E8","ink":"#9E2336","accent":"#D9344A","gold":"#F2B84B","leaf":"#6FA04A","hbg":"rgba(255,246,240,.94)","hline":"#F2A9A9","motif":"blossom"},
  "hud":{"bg":"rgba(158,35,54,.62)","acc":"#FFE3DD","on":"#5A1E28"},"scr":{"wine":"#D9344A","veil":"255,246,240"}}$t$::jsonb
where not exists (select 1 from public.live_venues where key = 'little-straw');
