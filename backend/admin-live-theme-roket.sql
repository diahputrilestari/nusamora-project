-- Contoh tema: "Little Penjelajah Roket" (navy, emas, oranye), jenis acara ulang tahun. Aditif & idempoten.
-- NONAKTIF sampai admin mengunggah panorama + dekor + avatar (lihat little-roket-dekor.zip) dan mengaktifkannya.
-- Jalankan SETELAH admin-live-theme.sql, admin-live-decor.sql dan admin-live-decor-avatars.sql.
insert into public.live_venues (key, name, event_type, areas, max_guests, active, sort, bg_pos, nm_theme)
select 'little-roket', 'Little Penjelajah Roket (ulang tahun)', 'birthday', coalesce((select areas from public.live_venues where key = 'romantic-garden'), '[]'::jsonb), 300, false, 71, 'center 38%',
  $t${"name":"Little Penjelajah Roket","orn":"sparkle",
  "ui":{"ivory":"#F3F1FF","white":"#FFFFFF","soft":"#D5D2F3","soft2":"#A8A3DE","accent":"#27348B","deep":"#14194F","ink":"#0E1240","mute":"#6E72A8","line":"#CBC8EE","serif":"Fredoka,\"Cormorant Garamond\",sans-serif","sans":"Inter,system-ui,sans-serif","rad":18,"btnr":14,"btnt":"none","btnls":".02em"},
  "mono":{"font":"Fredoka,\"Cormorant Garamond\",sans-serif","it":0,"paper":"#ECE9FF","ink":"#14194F","accent":"#27348B","gold":"#E8B23A","leaf":"#CBC8EE","hbg":"rgba(243,241,255,.94)","hline":"#A8A3DE","motif":"sparkle"},
  "hud":{"bg":"rgba(20,25,79,.72)","acc":"#F5C242","on":"#0E1240"},"scr":{"wine":"#27348B","veil":"243,241,255"}}$t$::jsonb
where not exists (select 1 from public.live_venues where key = 'little-roket');
