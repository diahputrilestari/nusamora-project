-- Contoh tema: "Little Samurai" (merah, navy, sakura), jenis acara ulang tahun. Aditif & idempoten.
-- NONAKTIF sampai admin mengunggah panorama + dekor + avatar (lihat little-samurai-dekor.zip) dan mengaktifkannya.
-- Jalankan SETELAH admin-live-theme.sql dan admin-live-decor.sql.
insert into public.live_venues (key, name, event_type, areas, max_guests, active, sort, bg_pos, nm_theme)
select 'little-samurai', 'Little Samurai (ulang tahun)', 'birthday', coalesce((select areas from public.live_venues where key = 'romantic-garden'), '[]'::jsonb), 300, false, 52, 'center 38%',
  $t${"name":"Little Samurai","orn":"blossom",
  "ui":{"ivory":"#FFF7EE","white":"#FFFFFF","soft":"#F8E3DC","soft2":"#EFB9B4","accent":"#C8102E","deep":"#1F2A5C","ink":"#1B2147","mute":"#7A6C80","line":"#F1D5D0","serif":"Fredoka,\"Cormorant Garamond\",sans-serif","sans":"Inter,system-ui,sans-serif","rad":18,"btnr":14,"btnt":"none","btnls":".02em"},
  "mono":{"font":"Fredoka,\"Cormorant Garamond\",sans-serif","it":0,"paper":"#FFF3E8","ink":"#1F2A5C","accent":"#C8102E","gold":"#E3B23C","leaf":"#F2A7B9","hbg":"rgba(255,247,238,.94)","hline":"#EFB9B4","motif":"blossom"},
  "hud":{"bg":"rgba(31,42,92,.62)","acc":"#F7B8C8","on":"#1B2147"},"scr":{"wine":"#C8102E","veil":"255,247,238"}}$t$::jsonb
where not exists (select 1 from public.live_venues where key = 'little-samurai');
