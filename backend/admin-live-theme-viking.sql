-- Contoh tema: "Viking Feast" (merah, kayu, emas), jenis acara ulang tahun. Aditif & idempoten.
-- NONAKTIF sampai admin mengunggah panorama + dekor (lihat viking-feast-dekor.zip) dan mengaktifkannya.
-- Jalankan SETELAH admin-live-theme.sql dan admin-live-decor.sql.
insert into public.live_venues (key, name, event_type, areas, max_guests, active, sort, bg_pos, nm_theme)
select 'viking-feast', 'Viking Feast (ulang tahun)', 'birthday', coalesce((select areas from public.live_venues where key = 'romantic-garden'), '[]'::jsonb), 300, false, 51, 'center 38%',
  $t${"name":"Viking Feast","orn":"diamond",
  "ui":{"ivory":"#FFF6E5","white":"#FFFFFF","soft":"#F6E3C3","soft2":"#E5C48F","accent":"#A3262A","deep":"#4A2A14","ink":"#3B2412","mute":"#8A6A4A","line":"#E8D2AE","serif":"Fredoka,\"Cormorant Garamond\",sans-serif","sans":"Inter,system-ui,sans-serif","rad":18,"btnr":14,"btnt":"none","btnls":".02em"},
  "mono":{"font":"Fredoka,\"Cormorant Garamond\",sans-serif","it":0,"paper":"#FFF3DC","ink":"#4A2A14","accent":"#A3262A","gold":"#E0A63A","leaf":"#6B8E4E","hbg":"rgba(255,246,229,.94)","hline":"#E5C48F","motif":"diamond"},
  "hud":{"bg":"rgba(59,36,18,.62)","acc":"#F2C25B","on":"#3B2412"},"scr":{"wine":"#A3262A","veil":"255,246,229"}}$t$::jsonb
where not exists (select 1 from public.live_venues where key = 'viking-feast');
