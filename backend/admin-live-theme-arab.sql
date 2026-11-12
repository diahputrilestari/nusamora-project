-- Contoh tema: "Little Putri Arab" (ungu, emas, krem), jenis acara ulang tahun. Aditif & idempoten.
-- NONAKTIF sampai admin mengunggah panorama + dekor + avatar (lihat little-arab-dekor.zip) dan mengaktifkannya.
-- Jalankan SETELAH admin-live-theme.sql, admin-live-decor.sql dan admin-live-decor-avatars.sql.
insert into public.live_venues (key, name, event_type, areas, max_guests, active, sort, bg_pos, nm_theme)
select 'little-arab', 'Little Putri Arab (ulang tahun)', 'birthday', coalesce((select areas from public.live_venues where key = 'romantic-garden'), '[]'::jsonb), 300, false, 59, 'center 38%',
  $t${"name":"Little Putri Arab","orn":"mandala",
  "ui":{"ivory":"#FFF6EC","white":"#FFFFFF","soft":"#F1DDF0","soft2":"#D9A9D6","accent":"#8E2B8C","deep":"#5C1A63","ink":"#3E1544","mute":"#85658C","line":"#E9CFE6","serif":"Fredoka,\"Cormorant Garamond\",sans-serif","sans":"Inter,system-ui,sans-serif","rad":18,"btnr":14,"btnt":"none","btnls":".02em"},
  "mono":{"font":"Fredoka,\"Cormorant Garamond\",sans-serif","it":0,"paper":"#FFF1DE","ink":"#5C1A63","accent":"#8E2B8C","gold":"#D9B15A","leaf":"#C9A24A","hbg":"rgba(255,246,236,.94)","hline":"#D9A9D6","motif":"mandala"},
  "hud":{"bg":"rgba(92,26,99,.66)","acc":"#F6D98A","on":"#3E1544"},"scr":{"wine":"#8E2B8C","veil":"255,246,236"}}$t$::jsonb
where not exists (select 1 from public.live_venues where key = 'little-arab');
