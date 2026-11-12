-- Contoh tema: "Little Firefighter" (merah, kuning, krem), jenis acara ulang tahun. Aditif & idempoten.
-- NONAKTIF sampai admin mengunggah panorama + dekor + avatar (lihat little-firefighter-dekor.zip) dan mengaktifkannya.
-- Jalankan SETELAH admin-live-theme.sql, admin-live-decor.sql dan admin-live-decor-avatars.sql.
insert into public.live_venues (key, name, event_type, areas, max_guests, active, sort, bg_pos, nm_theme)
select 'little-firefighter', 'Little Firefighter (ulang tahun)', 'birthday', coalesce((select areas from public.live_venues where key = 'romantic-garden'), '[]'::jsonb), 300, false, 68, 'center 38%',
  $t${"name":"Little Firefighter","orn":"diamond",
  "ui":{"ivory":"#FFF5EE","white":"#FFFFFF","soft":"#F7D4C8","soft2":"#E9A99A","accent":"#C8201E","deep":"#7A1010","ink":"#3A0D0D","mute":"#8A6A66","line":"#EFCFC6","serif":"Fredoka,\"Cormorant Garamond\",sans-serif","sans":"Inter,system-ui,sans-serif","rad":18,"btnr":14,"btnt":"none","btnls":".02em"},
  "mono":{"font":"Fredoka,\"Cormorant Garamond\",sans-serif","it":0,"paper":"#FFEFE6","ink":"#3A0D0D","accent":"#C8201E","gold":"#F5B800","leaf":"#F2C9BE","hbg":"rgba(255,245,238,.94)","hline":"#E9A99A","motif":"diamond"},
  "hud":{"bg":"rgba(122,16,16,.7)","acc":"#FFC62A","on":"#3A0D0D"},"scr":{"wine":"#B01E1E","veil":"255,245,238"}}$t$::jsonb
where not exists (select 1 from public.live_venues where key = 'little-firefighter');
