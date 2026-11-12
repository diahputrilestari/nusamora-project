-- Contoh tema: "Little Hutan Ajaib" (hijau hutan, krem, emas), jenis acara ulang tahun. Aditif & idempoten.
-- NONAKTIF sampai admin mengunggah panorama + dekor + avatar (lihat little-forest-dekor.zip) dan mengaktifkannya.
-- Jalankan SETELAH admin-live-theme.sql, admin-live-decor.sql dan admin-live-decor-avatars.sql.
insert into public.live_venues (key, name, event_type, areas, max_guests, active, sort, bg_pos, nm_theme)
select 'little-forest', 'Little Hutan Ajaib (ulang tahun)', 'birthday', coalesce((select areas from public.live_venues where key = 'romantic-garden'), '[]'::jsonb), 300, false, 61, 'center 38%',
  $t${"name":"Little Hutan Ajaib","orn":"leaf",
  "ui":{"ivory":"#FFF8EA","white":"#FFFFFF","soft":"#F1E6C8","soft2":"#D9C48F","accent":"#5E8A34","deep":"#3E5A24","ink":"#3A2A14","mute":"#8A7653","line":"#E8D9AE","serif":"Fredoka,\"Cormorant Garamond\",sans-serif","sans":"Inter,system-ui,sans-serif","rad":18,"btnr":14,"btnt":"none","btnls":".02em"},
  "mono":{"font":"Fredoka,\"Cormorant Garamond\",sans-serif","it":0,"paper":"#FFF3DC","ink":"#3E5A24","accent":"#5E8A34","gold":"#E0A63A","leaf":"#8DB35A","hbg":"rgba(255,248,234,.94)","hline":"#D9C48F","motif":"leaf"},
  "hud":{"bg":"rgba(62,90,36,.64)","acc":"#FFE9B0","on":"#3A2A14"},"scr":{"wine":"#5E8A34","veil":"255,248,234"}}$t$::jsonb
where not exists (select 1 from public.live_venues where key = 'little-forest');
