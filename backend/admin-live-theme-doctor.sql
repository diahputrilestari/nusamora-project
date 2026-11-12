-- Contoh tema: "Little Doctor" (biru, putih, merah), jenis acara ulang tahun. Aditif & idempoten.
-- NONAKTIF sampai admin mengunggah panorama + dekor + avatar (lihat little-doctor-dekor.zip) dan mengaktifkannya.
-- Jalankan SETELAH admin-live-theme.sql, admin-live-decor.sql dan admin-live-decor-avatars.sql.
insert into public.live_venues (key, name, event_type, areas, max_guests, active, sort, bg_pos, nm_theme)
select 'little-doctor', 'Little Doctor (ulang tahun)', 'birthday', coalesce((select areas from public.live_venues where key = 'romantic-garden'), '[]'::jsonb), 300, false, 55, 'center 38%',
  $t${"name":"Little Doctor","orn":"line",
  "ui":{"ivory":"#F6FAFF","white":"#FFFFFF","soft":"#DCE9F8","soft2":"#A9C6EC","accent":"#2F6FD0","deep":"#1F4E9A","ink":"#18365F","mute":"#6C7F99","line":"#CFE0F4","serif":"Fredoka,\"Cormorant Garamond\",sans-serif","sans":"Inter,system-ui,sans-serif","rad":18,"btnr":14,"btnt":"none","btnls":".02em"},
  "mono":{"font":"Fredoka,\"Cormorant Garamond\",sans-serif","it":0,"paper":"#EEF5FF","ink":"#1F4E9A","accent":"#2F6FD0","gold":"#E8A93A","leaf":"#5FAE6B","hbg":"rgba(246,250,255,.94)","hline":"#A9C6EC","motif":"line"},
  "hud":{"bg":"rgba(31,78,154,.66)","acc":"#FFD1D4","on":"#18365F"},"scr":{"wine":"#D8323A","veil":"246,250,255"}}$t$::jsonb
where not exists (select 1 from public.live_venues where key = 'little-doctor');
