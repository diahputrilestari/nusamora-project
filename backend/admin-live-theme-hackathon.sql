-- Contoh tema: "Hackathon" (ungu, biru neon), jenis acara event. Aditif & idempoten.
-- NONAKTIF sampai admin mengunggah panorama + dekor + avatar (lihat hackathon-dekor.zip) dan mengaktifkannya.
-- Jalankan SETELAH admin-live-theme.sql, admin-live-decor.sql dan admin-live-decor-avatars.sql.
insert into public.live_venues (key, name, event_type, areas, max_guests, active, sort, bg_pos, nm_theme)
select 'hackathon', 'Hackathon (event)', 'corporate', coalesce((select areas from public.live_venues where key = 'romantic-garden'), '[]'::jsonb), 300, false, 81, 'center 38%',
  $t${"name":"Hackathon","orn":"line",
  "ui":{"ivory":"#F2F0FF","white":"#FFFFFF","soft":"#CFC9F7","soft2":"#8F86E0","accent":"#5B3FD6","deep":"#251A6B","ink":"#150F45","mute":"#6A62A8","line":"#D5D0F4","serif":"Fredoka,\"Cormorant Garamond\",sans-serif","sans":"Inter,system-ui,sans-serif","rad":18,"btnr":14,"btnt":"none","btnls":".02em"},
  "mono":{"font":"Fredoka,\"Cormorant Garamond\",sans-serif","it":0,"paper":"#E9E6FB","ink":"#150F45","accent":"#5B3FD6","gold":"#27C4E8","leaf":"#D9D4F8","hbg":"rgba(242,240,255,.94)","hline":"#8F86E0","motif":"line"},
  "hud":{"bg":"rgba(37,26,107,.82)","acc":"#35D0F0","on":"#150F45"},"scr":{"wine":"#251A6B","veil":"242,240,255"}}$t$::jsonb
where not exists (select 1 from public.live_venues where key = 'hackathon');
