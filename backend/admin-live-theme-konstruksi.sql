-- Contoh tema: "Little Zona Konstruksi" (kuning, hitam, abu), jenis acara ulang tahun. Aditif & idempoten.
-- NONAKTIF sampai admin mengunggah panorama + dekor + avatar (lihat little-konstruksi-dekor.zip) dan mengaktifkannya.
-- Jalankan SETELAH admin-live-theme.sql, admin-live-decor.sql dan admin-live-decor-avatars.sql.
insert into public.live_venues (key, name, event_type, areas, max_guests, active, sort, bg_pos, nm_theme)
select 'little-konstruksi', 'Little Zona Konstruksi (ulang tahun)', 'birthday', coalesce((select areas from public.live_venues where key = 'romantic-garden'), '[]'::jsonb), 300, false, 67, 'center 38%',
  $t${"name":"Little Zona Konstruksi","orn":"line",
  "ui":{"ivory":"#FFFAE8","white":"#FFFFFF","soft":"#F3E3A8","soft2":"#D9C06A","accent":"#E8A500","deep":"#2B2B2B","ink":"#1E1E1E","mute":"#7A7258","line":"#E6D9A6","serif":"Fredoka,\"Cormorant Garamond\",sans-serif","sans":"Inter,system-ui,sans-serif","rad":18,"btnr":14,"btnt":"none","btnls":".02em"},
  "mono":{"font":"Fredoka,\"Cormorant Garamond\",sans-serif","it":0,"paper":"#FFF6D6","ink":"#1E1E1E","accent":"#E8A500","gold":"#F7C21B","leaf":"#E6D9A6","hbg":"rgba(255,250,232,.94)","hline":"#D9C06A","motif":"line"},
  "hud":{"bg":"rgba(30,30,30,.72)","acc":"#F7C21B","on":"#1E1E1E"},"scr":{"wine":"#3A3A3A","veil":"255,250,232"}}$t$::jsonb
where not exists (select 1 from public.live_venues where key = 'little-konstruksi');
