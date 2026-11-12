-- Contoh tema: "Little Polisi Patroli" (biru tua, emas, putih), jenis acara ulang tahun. Aditif & idempoten.
-- NONAKTIF sampai admin mengunggah panorama + dekor + avatar (lihat little-police-dekor.zip) dan mengaktifkannya.
-- Jalankan SETELAH admin-live-theme.sql, admin-live-decor.sql dan admin-live-decor-avatars.sql.
insert into public.live_venues (key, name, event_type, areas, max_guests, active, sort, bg_pos, nm_theme)
select 'little-police', 'Little Polisi Patroli (ulang tahun)', 'birthday', coalesce((select areas from public.live_venues where key = 'romantic-garden'), '[]'::jsonb), 300, false, 66, 'center 38%',
  $t${"name":"Little Polisi Patroli","orn":"diamond",
  "ui":{"ivory":"#F4F7FF","white":"#FFFFFF","soft":"#DDE3F4","soft2":"#AEB9DE","accent":"#1F3F9E","deep":"#16245E","ink":"#121C4A","mute":"#6F7AA0","line":"#CBD3EC","serif":"Fredoka,\"Cormorant Garamond\",sans-serif","sans":"Inter,system-ui,sans-serif","rad":18,"btnr":14,"btnt":"none","btnls":".02em"},
  "mono":{"font":"Fredoka,\"Cormorant Garamond\",sans-serif","it":0,"paper":"#EEF2FF","ink":"#16245E","accent":"#1F3F9E","gold":"#F2B84B","leaf":"#C9D3F2","hbg":"rgba(244,247,255,.94)","hline":"#AEB9DE","motif":"diamond"},
  "hud":{"bg":"rgba(22,36,94,.68)","acc":"#F2B51E","on":"#121C4A"},"scr":{"wine":"#1F3F9E","veil":"244,247,255"}}$t$::jsonb
where not exists (select 1 from public.live_venues where key = 'little-police');
