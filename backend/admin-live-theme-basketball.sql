-- Contoh tema: "Basketball All Star" (navy, oranye, krem), jenis acara ulang tahun. Aditif & idempoten.
-- NONAKTIF sampai admin mengunggah panorama + dekor + avatar (lihat little-basketball-dekor.zip) dan mengaktifkannya.
-- Jalankan SETELAH admin-live-theme.sql, admin-live-decor.sql dan admin-live-decor-avatars.sql.
insert into public.live_venues (key, name, event_type, areas, max_guests, active, sort, bg_pos, nm_theme)
select 'little-basketball', 'Basketball All Star (ulang tahun)', 'birthday', coalesce((select areas from public.live_venues where key = 'romantic-garden'), '[]'::jsonb), 300, false, 75, 'center 38%',
  $t${"name":"Basketball All Star","orn":"confetti",
  "ui":{"ivory":"#FBF4EA","white":"#FFFFFF","soft":"#D6DAEC","soft2":"#F3B57F","accent":"#E8681A","deep":"#16275A","ink":"#101C45","mute":"#5B6890","line":"#CBD1E6","serif":"Fredoka,\"Cormorant Garamond\",sans-serif","sans":"Inter,system-ui,sans-serif","rad":18,"btnr":14,"btnt":"none","btnls":".02em"},
  "mono":{"font":"Fredoka,\"Cormorant Garamond\",sans-serif","it":0,"paper":"#F6EEE0","ink":"#101C45","accent":"#E8681A","gold":"#F2B632","leaf":"#CBD6EE","hbg":"rgba(251,244,234,.94)","hline":"#F3B57F","motif":"confetti"},
  "hud":{"bg":"rgba(22,39,90,.78)","acc":"#F5A53A","on":"#101C45"},"scr":{"wine":"#16275A","veil":"251,244,234"}}$t$::jsonb
where not exists (select 1 from public.live_venues where key = 'little-basketball');
