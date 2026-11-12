-- Contoh tema: "Little Pilot" (biru langit, navy, emas), jenis acara ulang tahun. Aditif & idempoten.
-- NONAKTIF sampai admin mengunggah panorama + dekor + avatar (lihat little-pilot-dekor.zip) dan mengaktifkannya.
-- Jalankan SETELAH admin-live-theme.sql, admin-live-decor.sql dan admin-live-decor-avatars.sql.
insert into public.live_venues (key, name, event_type, areas, max_guests, active, sort, bg_pos, nm_theme)
select 'little-pilot', 'Little Pilot (ulang tahun)', 'birthday', coalesce((select areas from public.live_venues where key = 'romantic-garden'), '[]'::jsonb), 300, false, 69, 'center 38%',
  $t${"name":"Little Pilot","orn":"sparkle",
  "ui":{"ivory":"#F2F6FF","white":"#FFFFFF","soft":"#D3E0F7","soft2":"#9DB6E4","accent":"#2350B8","deep":"#14286E","ink":"#0F1D52","mute":"#6B7AA8","line":"#C5D3EE","serif":"Fredoka,\"Cormorant Garamond\",sans-serif","sans":"Inter,system-ui,sans-serif","rad":18,"btnr":14,"btnt":"none","btnls":".02em"},
  "mono":{"font":"Fredoka,\"Cormorant Garamond\",sans-serif","it":0,"paper":"#EAF1FF","ink":"#14286E","accent":"#2350B8","gold":"#E8B23A","leaf":"#C5D3EE","hbg":"rgba(242,246,255,.94)","hline":"#9DB6E4","motif":"sparkle"},
  "hud":{"bg":"rgba(20,40,110,.7)","acc":"#F5C242","on":"#0F1D52"},"scr":{"wine":"#2350B8","veil":"242,246,255"}}$t$::jsonb
where not exists (select 1 from public.live_venues where key = 'little-pilot');
