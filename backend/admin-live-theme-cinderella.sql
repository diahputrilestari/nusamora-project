-- Contoh tema: "Little Cinderella" (biru muda, putih, emas), jenis acara ulang tahun. Aditif & idempoten.
-- NONAKTIF sampai admin mengunggah panorama + dekor + avatar (lihat little-cinderella-dekor.zip) dan mengaktifkannya.
-- Jalankan SETELAH admin-live-theme.sql, admin-live-decor.sql dan admin-live-decor-avatars.sql.
insert into public.live_venues (key, name, event_type, areas, max_guests, active, sort, bg_pos, nm_theme)
select 'little-cinderella', 'Little Cinderella (ulang tahun)', 'birthday', coalesce((select areas from public.live_venues where key = 'romantic-garden'), '[]'::jsonb), 300, false, 56, 'center 38%',
  $t${"name":"Little Cinderella","orn":"blossom",
  "ui":{"ivory":"#F7F7FF","white":"#FFFFFF","soft":"#E4EAFA","soft2":"#B7C8EE","accent":"#4A70C9","deep":"#2E4A9A","ink":"#26396F","mute":"#767FA3","line":"#D6DFF5","serif":"Fredoka,\"Cormorant Garamond\",sans-serif","sans":"Inter,system-ui,sans-serif","rad":18,"btnr":14,"btnt":"none","btnls":".02em"},
  "mono":{"font":"Fredoka,\"Cormorant Garamond\",sans-serif","it":0,"paper":"#F1F3FF","ink":"#2E4A9A","accent":"#4A70C9","gold":"#D9B15A","leaf":"#8FB0E4","hbg":"rgba(247,247,255,.94)","hline":"#B7C8EE","motif":"blossom"},
  "hud":{"bg":"rgba(46,74,154,.64)","acc":"#FFE9B0","on":"#26396F"},"scr":{"wine":"#4A70C9","veil":"247,247,255"}}$t$::jsonb
where not exists (select 1 from public.live_venues where key = 'little-cinderella');
