-- Contoh tema: "Sakura" (merah muda, ungu, krem), jenis acara pernikahan. Aditif & idempoten.
-- NONAKTIF sampai admin mengunggah panorama + dekor + avatar (lihat sakura-wedding-dekor.zip) dan mengaktifkannya.
-- Jalankan SETELAH admin-live-theme.sql, admin-live-decor.sql dan admin-live-decor-avatars.sql.
insert into public.live_venues (key, name, event_type, areas, max_guests, active, sort, bg_pos, nm_theme)
select 'sakura-wedding', 'Sakura (pernikahan)', 'wedding', coalesce((select areas from public.live_venues where key = 'romantic-garden'), '[]'::jsonb), 300, false, 80, 'center 38%',
  $t${"name":"Sakura","orn":"blossom",
  "ui":{"ivory":"#FFF6F8","white":"#FFFFFF","soft":"#F8DCE8","soft2":"#E7A5C2","accent":"#C2477F","deep":"#6A2A55","ink":"#43183A","mute":"#9A6B88","line":"#F0CFDD","serif":"Fredoka,\"Cormorant Garamond\",sans-serif","sans":"Inter,system-ui,sans-serif","rad":18,"btnr":14,"btnt":"none","btnls":".02em"},
  "mono":{"font":"Fredoka,\"Cormorant Garamond\",sans-serif","it":0,"paper":"#FCEBF1","ink":"#43183A","accent":"#C2477F","gold":"#D9A21B","leaf":"#F6DCE6","hbg":"rgba(255,246,248,.94)","hline":"#E7A5C2","motif":"blossom"},
  "hud":{"bg":"rgba(106,42,85,.78)","acc":"#F2C23A","on":"#43183A"},"scr":{"wine":"#6A2A55","veil":"255,246,248"}}$t$::jsonb
where not exists (select 1 from public.live_venues where key = 'sakura-wedding');
