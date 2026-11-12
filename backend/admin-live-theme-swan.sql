-- Contoh tema: "Little Putri Swan" (merah muda, ungu, emas), jenis acara ulang tahun. Aditif & idempoten.
-- NONAKTIF sampai admin mengunggah panorama + dekor + avatar (lihat little-swan-dekor.zip) dan mengaktifkannya.
-- Jalankan SETELAH admin-live-theme.sql, admin-live-decor.sql dan admin-live-decor-avatars.sql.
insert into public.live_venues (key, name, event_type, areas, max_guests, active, sort, bg_pos, nm_theme)
select 'little-swan', 'Little Putri Swan (ulang tahun)', 'birthday', coalesce((select areas from public.live_venues where key = 'romantic-garden'), '[]'::jsonb), 300, false, 57, 'center 38%',
  $t${"name":"Little Putri Swan","orn":"rings",
  "ui":{"ivory":"#FFF7FB","white":"#FFFFFF","soft":"#F6E3F0","soft2":"#E3B9D6","accent":"#C77FB3","deep":"#7A3E78","ink":"#4A2850","mute":"#8E7396","line":"#F0D4E6","serif":"Fredoka,\"Cormorant Garamond\",sans-serif","sans":"Inter,system-ui,sans-serif","rad":18,"btnr":14,"btnt":"none","btnls":".02em"},
  "mono":{"font":"Fredoka,\"Cormorant Garamond\",sans-serif","it":0,"paper":"#FFF1F8","ink":"#7A3E78","accent":"#C77FB3","gold":"#D9B15A","leaf":"#A5CFA0","hbg":"rgba(255,247,251,.94)","hline":"#E3B9D6","motif":"rings"},
  "hud":{"bg":"rgba(122,62,120,.62)","acc":"#FFE3F1","on":"#4A2850"},"scr":{"wine":"#C77FB3","veil":"255,247,251"}}$t$::jsonb
where not exists (select 1 from public.live_venues where key = 'little-swan');
