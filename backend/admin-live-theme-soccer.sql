-- Contoh tema: "Sepakbola" (navy, emas, krem), jenis acara ulang tahun. Aditif & idempoten.
-- NONAKTIF sampai admin mengunggah panorama + dekor + avatar (lihat little-soccer-dekor.zip) dan mengaktifkannya.
-- Jalankan SETELAH admin-live-theme.sql, admin-live-decor.sql dan admin-live-decor-avatars.sql.
insert into public.live_venues (key, name, event_type, areas, max_guests, active, sort, bg_pos, nm_theme)
select 'little-soccer', 'Sepakbola (ulang tahun)', 'birthday', coalesce((select areas from public.live_venues where key = 'romantic-garden'), '[]'::jsonb), 300, false, 76, 'center 38%',
  $t${"name":"Sepakbola","orn":"confetti",
  "ui":{"ivory":"#F8F6EE","white":"#FFFFFF","soft":"#D5DDF0","soft2":"#E8C871","accent":"#D9A21B","deep":"#14275F","ink":"#0F1D49","mute":"#5A678F","line":"#CAD3E8","serif":"Fredoka,\"Cormorant Garamond\",sans-serif","sans":"Inter,system-ui,sans-serif","rad":18,"btnr":14,"btnt":"none","btnls":".02em"},
  "mono":{"font":"Fredoka,\"Cormorant Garamond\",sans-serif","it":0,"paper":"#F3F0E4","ink":"#0F1D49","accent":"#D9A21B","gold":"#E8B92E","leaf":"#CFE3C4","hbg":"rgba(248,246,238,.94)","hline":"#E8C871","motif":"confetti"},
  "hud":{"bg":"rgba(20,39,95,.78)","acc":"#F2C23A","on":"#0F1D49"},"scr":{"wine":"#14275F","veil":"248,246,238"}}$t$::jsonb
where not exists (select 1 from public.live_venues where key = 'little-soccer');
