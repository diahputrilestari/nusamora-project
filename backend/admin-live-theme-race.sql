-- Contoh tema: "Little Racing Champion" (merah, hitam, emas), jenis acara ulang tahun. Aditif & idempoten.
-- NONAKTIF sampai admin mengunggah panorama + dekor + avatar (lihat little-race-dekor.zip) dan mengaktifkannya.
-- Jalankan SETELAH admin-live-theme.sql, admin-live-decor.sql dan admin-live-decor-avatars.sql.
insert into public.live_venues (key, name, event_type, areas, max_guests, active, sort, bg_pos, nm_theme)
select 'little-race', 'Little Racing Champion (ulang tahun)', 'birthday', coalesce((select areas from public.live_venues where key = 'romantic-garden'), '[]'::jsonb), 300, false, 65, 'center 38%',
  $t${"name":"Little Racing Champion","orn":"diamond",
  "ui":{"ivory":"#FFF6EC","white":"#FFFFFF","soft":"#E9E4E0","soft2":"#C9C2BE","accent":"#D3202A","deep":"#1E1E26","ink":"#1A1A22","mute":"#7A7478","line":"#DDD5D0","serif":"Fredoka,\"Cormorant Garamond\",sans-serif","sans":"Inter,system-ui,sans-serif","rad":18,"btnr":14,"btnt":"none","btnls":".02em"},
  "mono":{"font":"Fredoka,\"Cormorant Garamond\",sans-serif","it":0,"paper":"#FFF1E4","ink":"#1E1E26","accent":"#D3202A","gold":"#F2B84B","leaf":"#2A2A33","hbg":"rgba(255,246,236,.94)","hline":"#C9C2BE","motif":"diamond"},
  "hud":{"bg":"rgba(30,30,38,.7)","acc":"#F2B51E","on":"#1A1A22"},"scr":{"wine":"#D3202A","veil":"255,246,236"}}$t$::jsonb
where not exists (select 1 from public.live_venues where key = 'little-race');
