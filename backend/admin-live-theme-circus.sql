-- Contoh tema: "Little Circus" (merah, krem, navy, emas), jenis acara ulang tahun. Aditif & idempoten.
-- NONAKTIF sampai admin mengunggah panorama + dekor + avatar (lihat little-circus-dekor.zip) dan mengaktifkannya.
-- Jalankan SETELAH admin-live-theme.sql, admin-live-decor.sql dan admin-live-decor-avatars.sql.
insert into public.live_venues (key, name, event_type, areas, max_guests, active, sort, bg_pos, nm_theme)
select 'little-circus', 'Little Circus (ulang tahun)', 'birthday', coalesce((select areas from public.live_venues where key = 'romantic-garden'), '[]'::jsonb), 300, false, 53, 'center 38%',
  $t${"name":"Little Circus","orn":"confetti",
  "ui":{"ivory":"#FFF6E8","white":"#FFFFFF","soft":"#F8E2C8","soft2":"#EDB98F","accent":"#C8262E","deep":"#1E2A5A","ink":"#1B2350","mute":"#7C6A74","line":"#F0D6B8","serif":"Fredoka,\"Cormorant Garamond\",sans-serif","sans":"Inter,system-ui,sans-serif","rad":18,"btnr":14,"btnt":"none","btnls":".02em"},
  "mono":{"font":"Fredoka,\"Cormorant Garamond\",sans-serif","it":0,"paper":"#FFF1DC","ink":"#1E2A5A","accent":"#C8262E","gold":"#E8B33A","leaf":"#2F4A9A","hbg":"rgba(255,246,232,.94)","hline":"#EDB98F","motif":"confetti"},
  "hud":{"bg":"rgba(30,42,90,.64)","acc":"#F3C65A","on":"#1B2350"},"scr":{"wine":"#C8262E","veil":"255,246,232"}}$t$::jsonb
where not exists (select 1 from public.live_venues where key = 'little-circus');
