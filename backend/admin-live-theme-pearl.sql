-- Contoh tema: "Little Mutiara Laut" (ungu mutiara, biru laut, krem), jenis acara ulang tahun. Aditif & idempoten.
-- NONAKTIF sampai admin mengunggah panorama + dekor + avatar (lihat little-pearl-dekor.zip) dan mengaktifkannya.
-- Jalankan SETELAH admin-live-theme.sql, admin-live-decor.sql dan admin-live-decor-avatars.sql.
insert into public.live_venues (key, name, event_type, areas, max_guests, active, sort, bg_pos, nm_theme)
select 'little-pearl', 'Little Mutiara Laut (ulang tahun)', 'birthday', coalesce((select areas from public.live_venues where key = 'romantic-garden'), '[]'::jsonb), 300, false, 64, 'center 38%',
  $t${"name":"Little Mutiara Laut","orn":"rings",
  "ui":{"ivory":"#F7F4FF","white":"#FFFFFF","soft":"#E6DFF8","soft2":"#BFB2EA","accent":"#7A64D0","deep":"#3E3A8C","ink":"#2C2A66","mute":"#7C78A8","line":"#D9D2F2","serif":"Fredoka,\"Cormorant Garamond\",sans-serif","sans":"Inter,system-ui,sans-serif","rad":18,"btnr":14,"btnt":"none","btnls":".02em"},
  "mono":{"font":"Fredoka,\"Cormorant Garamond\",sans-serif","it":0,"paper":"#F2EEFF","ink":"#3E3A8C","accent":"#7A64D0","gold":"#F2B84B","leaf":"#8FC9E8","hbg":"rgba(247,244,255,.94)","hline":"#BFB2EA","motif":"rings"},
  "hud":{"bg":"rgba(62,58,140,.64)","acc":"#F6E6B8","on":"#2C2A66"},"scr":{"wine":"#7A64D0","veil":"247,244,255"}}$t$::jsonb
where not exists (select 1 from public.live_venues where key = 'little-pearl');
