-- Contoh tema: "Baseball League" (navy, merah, krem), jenis acara ulang tahun. Aditif & idempoten.
-- NONAKTIF sampai admin mengunggah panorama + dekor + avatar (lihat little-baseball-dekor.zip) dan mengaktifkannya.
-- Jalankan SETELAH admin-live-theme.sql, admin-live-decor.sql dan admin-live-decor-avatars.sql.
insert into public.live_venues (key, name, event_type, areas, max_guests, active, sort, bg_pos, nm_theme)
select 'little-baseball', 'Baseball League (ulang tahun)', 'birthday', coalesce((select areas from public.live_venues where key = 'romantic-garden'), '[]'::jsonb), 300, false, 74, 'center 38%',
  $t${"name":"Baseball League","orn":"confetti",
  "ui":{"ivory":"#FBF6EC","white":"#FFFFFF","soft":"#D5DCEC","soft2":"#8FA2C8","accent":"#C8272D","deep":"#1B2F5E","ink":"#14224A","mute":"#5E6C8E","line":"#C9D2E6","serif":"Fredoka,\"Cormorant Garamond\",sans-serif","sans":"Inter,system-ui,sans-serif","rad":18,"btnr":14,"btnt":"none","btnls":".02em"},
  "mono":{"font":"Fredoka,\"Cormorant Garamond\",sans-serif","it":0,"paper":"#F4EFE3","ink":"#14224A","accent":"#C8272D","gold":"#E8A92B","leaf":"#CBD6EE","hbg":"rgba(251,246,236,.94)","hline":"#8FA2C8","motif":"confetti"},
  "hud":{"bg":"rgba(27,47,94,.76)","acc":"#F5C242","on":"#14224A"},"scr":{"wine":"#1B2F5E","veil":"251,246,236"}}$t$::jsonb
where not exists (select 1 from public.live_venues where key = 'little-baseball');
