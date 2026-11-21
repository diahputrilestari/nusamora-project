# Football Champions Birthday — slot aset

Tema `football-champions` ("Night of the Champions"), stadion internasional malam. Konfigurasi di `src/themes/football-champions/theme.ts`.

## Status
- Dunia **placeholder procedural** (`npm run gen:football` → `public/assets/themes/football-champions/compound.glb`, ±26rb segitiga, 3 MB): lapangan bergaris, 2 gawang+jaring, tribun penuh, 4 tiang lampu sorot, scoreboard LED, panggung juara (tangga LED, emblem, backdrop "FOOTBALL CHAMPIONS", sofa putih-emas, lampu marquee), 2 piala emas, bola, jersey gantung, bintang emas, kado, 8 kios area, gerbang masuk.
- Film kamera memakai `shots.json` yang sama dengan tema lain (versi malam: eksposur +25%). `check:shots` bersih (desktop + ponsel).

## Slot yang menyusul
| Slot | Cara ganti |
|---|---|
| VENUE_MODEL | ganti `world.modelUrl` ke GLB venue (Y-up, meter, tanah y=0, depan +Z); panggung wajib di z 8..18, tribun di luar x ±46 / z < -26; jalankan `npm run check:shots -- football-champions` |
| CHILD_AVATAR | **Terpasang**: avatar kiriman pelanggan (`avatar.glb`, hasil `pack_glb.py`, 5,5 MB, geometri/UV tidak diubah, menghadap +Z, tinggi 1,6 m). Ganti dengan mengubah `characters.coupleModelUrl` |

## Belum ada di Signature
Chat, penghitung tamu online, kontrol karakter, area interaktif, dan mini game adalah fitur Live Guest (Luxe). Kios area di dunia ini hanya dekor.
