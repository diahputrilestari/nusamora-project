-- Contoh tema: "Wizard Academy" (ungu, emas, krem), jenis acara ulang tahun. Aditif & idempoten.
-- NONAKTIF sampai admin mengunggah panorama + dekor + avatar (lihat little-wizard-dekor.zip) dan mengaktifkannya.
-- Jalankan SETELAH admin-live-theme.sql, admin-live-decor.sql dan admin-live-decor-avatars.sql.
insert into public.live_venues (key, name, event_type, areas, max_guests, active, sort, bg_pos, nm_theme)
select 'little-wizard', 'Wizard Academy (ulang tahun)', 'birthday', coalesce((select areas from public.live_venues where key = 'romantic-garden'), '[]'::jsonb), 300, false, 78, 'center 38%',
  $t${"name":"Wizard Academy","orn":"sparkle",
  "ui":{"ivory":"#F7F0FA","white":"#FFFFFF","soft":"#E2D2EE","soft2":"#B48FCF","accent":"#8E3FB5","deep":"#3F1A5C","ink":"#2A1040","mute":"#7A5E92","line":"#D8C4E6","serif":"Fredoka,\"Cormorant Garamond\",sans-serif","sans":"Inter,system-ui,sans-serif","rad":18,"btnr":14,"btnt":"none","btnls":".02em"},
  "mono":{"font":"Fredoka,\"Cormorant Garamond\",sans-serif","it":0,"paper":"#F1E6F6","ink":"#2A1040","accent":"#8E3FB5","gold":"#D9A21B","leaf":"#E6D6F0","hbg":"rgba(247,240,250,.94)","hline":"#B48FCF","motif":"sparkle"},
  "hud":{"bg":"rgba(63,26,92,.8)","acc":"#F2C23A","on":"#2A1040"},"scr":{"wine":"#3F1A5C","veil":"247,240,250"}}$t$::jsonb
where not exists (select 1 from public.live_venues where key = 'little-wizard');
