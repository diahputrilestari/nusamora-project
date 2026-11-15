-- Contoh tema: "Arabian Knight" (ungu, emas, krem), jenis acara pernikahan. Aditif & idempoten.
-- NONAKTIF sampai admin mengunggah panorama + dekor + avatar (lihat arabian-knight-dekor.zip) dan mengaktifkannya.
-- Jalankan SETELAH admin-live-theme.sql, admin-live-decor.sql dan admin-live-decor-avatars.sql.
insert into public.live_venues (key, name, event_type, areas, max_guests, active, sort, bg_pos, nm_theme)
select 'arabian-knight', 'Arabian Knight (pernikahan)', 'wedding', coalesce((select areas from public.live_venues where key = 'romantic-garden'), '[]'::jsonb), 300, false, 79, 'center 38%',
  $t${"name":"Arabian Knight","orn":"mandala",
  "ui":{"ivory":"#FAF3EA","white":"#FFFFFF","soft":"#E6D2EC","soft2":"#B98FC6","accent":"#8A2F7E","deep":"#4A1A57","ink":"#2F0F3A","mute":"#7E5F8A","line":"#DCC6E3","serif":"Fredoka,\"Cormorant Garamond\",sans-serif","sans":"Inter,system-ui,sans-serif","rad":18,"btnr":14,"btnt":"none","btnls":".02em"},
  "mono":{"font":"Fredoka,\"Cormorant Garamond\",sans-serif","it":0,"paper":"#F4E9F0","ink":"#2F0F3A","accent":"#8A2F7E","gold":"#D9A21B","leaf":"#EAD9EE","hbg":"rgba(250,243,234,.94)","hline":"#B98FC6","motif":"mandala"},
  "hud":{"bg":"rgba(74,26,87,.8)","acc":"#F2C23A","on":"#2F0F3A"},"scr":{"wine":"#4A1A57","veil":"250,243,234"}}$t$::jsonb
where not exists (select 1 from public.live_venues where key = 'arabian-knight');
