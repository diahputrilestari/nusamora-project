-- Contoh tema: "Little Prince" (navy, krem, emas), jenis acara ulang tahun. Aditif & idempoten.
-- NONAKTIF sampai admin mengunggah panorama + dekor + avatar (lihat little-prince-dekor.zip) dan mengaktifkannya.
-- Jalankan SETELAH admin-live-theme.sql, admin-live-decor.sql dan admin-live-decor-avatars.sql.
insert into public.live_venues (key, name, event_type, areas, max_guests, active, sort, bg_pos, nm_theme)
select 'little-prince', 'Little Prince (ulang tahun)', 'birthday', coalesce((select areas from public.live_venues where key = 'romantic-garden'), '[]'::jsonb), 300, false, 54, 'center 38%',
  $t${"name":"Little Prince","orn":"sparkle",
  "ui":{"ivory":"#FFF8EA","white":"#FFFFFF","soft":"#E6E2F3","soft2":"#B9B8E0","accent":"#27357F","deep":"#1E2A6B","ink":"#1B2358","mute":"#6F6C8F","line":"#DAD6EE","serif":"Fredoka,\"Cormorant Garamond\",sans-serif","sans":"Inter,system-ui,sans-serif","rad":18,"btnr":14,"btnt":"none","btnls":".02em"},
  "mono":{"font":"Fredoka,\"Cormorant Garamond\",sans-serif","it":0,"paper":"#FFF3DC","ink":"#1E2A6B","accent":"#27357F","gold":"#D9A93A","leaf":"#6B8E4E","hbg":"rgba(255,248,234,.94)","hline":"#B9B8E0","motif":"sparkle"},
  "hud":{"bg":"rgba(30,42,107,.66)","acc":"#F3C65A","on":"#1B2358"},"scr":{"wine":"#27357F","veil":"255,248,234"}}$t$::jsonb
where not exists (select 1 from public.live_venues where key = 'little-prince');
