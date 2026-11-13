-- Contoh tema: "Little Pirates" (cokelat, merah, krem), jenis acara ulang tahun. Aditif & idempoten.
-- NONAKTIF sampai admin mengunggah panorama + dekor + avatar (lihat little-pirates-dekor.zip) dan mengaktifkannya.
-- Jalankan SETELAH admin-live-theme.sql, admin-live-decor.sql dan admin-live-decor-avatars.sql.
insert into public.live_venues (key, name, event_type, areas, max_guests, active, sort, bg_pos, nm_theme)
select 'little-pirates', 'Little Pirates (ulang tahun)', 'birthday', coalesce((select areas from public.live_venues where key = 'romantic-garden'), '[]'::jsonb), 300, false, 77, 'center 38%',
  $t${"name":"Little Pirates","orn":"confetti",
  "ui":{"ivory":"#FBF3E4","white":"#FFFFFF","soft":"#E8D3B0","soft2":"#C9A06A","accent":"#B5252B","deep":"#4A2616","ink":"#2E170C","mute":"#7A5A44","line":"#E0CBA6","serif":"Fredoka,\"Cormorant Garamond\",sans-serif","sans":"Inter,system-ui,sans-serif","rad":18,"btnr":14,"btnt":"none","btnls":".02em"},
  "mono":{"font":"Fredoka,\"Cormorant Garamond\",sans-serif","it":0,"paper":"#F6EAD2","ink":"#2E170C","accent":"#B5252B","gold":"#D9A21B","leaf":"#E4D2AE","hbg":"rgba(251,243,228,.94)","hline":"#C9A06A","motif":"confetti"},
  "hud":{"bg":"rgba(74,38,22,.8)","acc":"#F2C23A","on":"#2E170C"},"scr":{"wine":"#4A2616","veil":"251,243,228"}}$t$::jsonb
where not exists (select 1 from public.live_venues where key = 'little-pirates');
