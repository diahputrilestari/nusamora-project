-- NusaMora: Live Guest, penyesuaian data bawaan venue. Aditif dan idempoten. Jalankan SETELAH admin-live.sql.
-- Data bawaan awal memakai daftar area dari lapisan lama live/index.html. Daftar yang benar-benar dipakai halaman sekarang adalah 8 area di bawah.
-- Hanya mengubah venue yang BELUM diedit admin (isi areanya masih sama persis dengan data bawaan awal).

update public.live_venues set updated_at = now(), areas = '[
 {"id":"stage","name":"Garden Utama","x":0,"z":-27,"icon":"💒","enabled":true},{"id":"resepsi","name":"Area Resepsi","x":0,"z":-0.5,"icon":"🍽️","enabled":true},
 {"id":"booth","name":"Photo Booth","x":-12.2,"z":-8.3,"icon":"📸","enabled":true},{"id":"galeri","name":"Galeri Foto","x":12.2,"z":-8.3,"icon":"📷","enabled":true},
 {"id":"video","name":"Video Ucapan","x":6.2,"z":-6.6,"icon":"🎬","enabled":true},{"id":"buku","name":"Buku Tamu","x":0,"z":6.5,"icon":"📖","enabled":true},
 {"id":"kuliner","name":"Area Kuliner","x":-11,"z":6,"icon":"🍢","enabled":true},{"id":"istirahat","name":"Area Istirahat","x":14,"z":5,"icon":"🛋️","enabled":true}]'::jsonb
 where key = 'romantic-garden' and md5(areas::text) = '668a79e9dc6bc47e42e0c018082eb69f';

update public.live_venues set updated_at = now(), areas = '[
 {"id":"stage","name":"Garden Utama","x":0,"z":-27,"icon":"💒","enabled":true},{"id":"resepsi","name":"Area Resepsi","x":0,"z":-0.5,"icon":"🍽️","enabled":true},
 {"id":"booth","name":"Photo Booth","x":-12.2,"z":-8.3,"icon":"📸","enabled":true},{"id":"galeri","name":"Galeri Foto","x":12.2,"z":-8.3,"icon":"📷","enabled":true},
 {"id":"video","name":"Video Ucapan","x":6.2,"z":-6.6,"icon":"🎬","enabled":true},{"id":"buku","name":"Buku Tamu","x":3.4,"z":6.4,"icon":"📖","enabled":true},
 {"id":"kuliner","name":"Area Kuliner","x":-11,"z":6,"icon":"🍢","enabled":true},{"id":"istirahat","name":"Area Istirahat","x":14,"z":5,"icon":"🛋️","enabled":true}]'::jsonb
 where key = 'jawa-tengah' and md5(areas::text) = 'e7045b1b181eed4b3bee9a4a09774722';
