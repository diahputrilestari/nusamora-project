-- Contoh tema: "Little Putri Pink" (merah muda mewah, emas), jenis acara ulang tahun. Aditif & idempoten.
-- NONAKTIF sampai admin mengunggah panorama + dekor + avatar (lihat little-pink-dekor.zip) dan mengaktifkannya.
-- Jalankan SETELAH admin-live-theme.sql, admin-live-decor.sql dan admin-live-decor-avatars.sql.
insert into public.live_venues (key, name, event_type, areas, max_guests, active, sort, bg_pos, nm_theme)
select 'little-pink', 'Little Putri Pink (ulang tahun)', 'birthday', coalesce((select areas from public.live_venues where key = 'romantic-garden'), '[]'::jsonb), 300, false, 58, 'center 38%',
  $t${"name":"Little Putri Pink","orn":"blossom",
  "ui":{"ivory":"#FFF5FA","white":"#FFFFFF","soft":"#FBDDEE","soft2":"#F4B3D3","accent":"#E0559C","deep":"#A02A6E","ink":"#5A1E45","mute":"#9A6A86","line":"#F6CFE3","serif":"Fredoka,\"Cormorant Garamond\",sans-serif","sans":"Inter,system-ui,sans-serif","rad":18,"btnr":14,"btnt":"none","btnls":".02em"},
  "mono":{"font":"Fredoka,\"Cormorant Garamond\",sans-serif","it":0,"paper":"#FFEFF7","ink":"#A02A6E","accent":"#E0559C","gold":"#D9B15A","leaf":"#9CC98F","hbg":"rgba(255,245,250,.94)","hline":"#F4B3D3","motif":"blossom"},
  "hud":{"bg":"rgba(160,42,110,.62)","acc":"#FFE3F1","on":"#5A1E45"},"scr":{"wine":"#E0559C","veil":"255,245,250"}}$t$::jsonb
where not exists (select 1 from public.live_venues where key = 'little-pink');
