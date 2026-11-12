# Minangkabau Royal Heritage — rencana bertahap

Tema `minang-royal` dibangun di atas template tema universal (src/themes/).
Data pasangan tetap di `src/data/wedding.config.ts`; tidak ada data pribadi di
komponen 3D.

## Analisis aset referensi
Gambar referensi pelaminan belum terlampir. Tahap 1 memakai pakem pelaminan
Minang yang umum: latar bertingkat merah–emas (songket + ukiran), mahkota
bergonjong di tiang, langik-langik (kain langit-langit bergaris merah, emas,
hitam, hijau), dua kursi pelaminan, banta gadang (tumpukan bantal songket),
carano emas, tirai merah berumbai emas, lampu gantung. Saat referensi
dilampirkan, proporsi dan ornamen disesuaikan di `scripts/generators/minang_world.py`.

## Tahap 1 — lingkungan 3D (selesai)
- `public/assets/themes/minang-royal/world.glb` (≈58k segitiga, 3.6 MB, tekstur JPEG/PNG):
  gerbang bergonjong dengan pintu ukir, pagar, jalan batu, bendera marawa,
  dua rangkiang, rumah gadang bertiang dengan dinding melebar, enam gonjong
  (atap tiga susun + anjung depan), tangga besar, ruang pelaminan terbuka.
- Dibuat oleh `scripts/generators/minang_world.py` (+ `minang_textures.py`,
  `glbkit.py`): tekstur ukiran (pucuak rabuang, kaluak paku, itiak pulang
  patang), songket (saik galamai), ijuk, kayu, beludru, langik-langik — semua
  dengan normal map dan ORM (benang emas metalik).
- Node yang siap dianimasikan: `gate_door_L/R` (rotasi Y, 0 = tertutup),
  `curtain_L/R` (skala X, 1 = tertutup, ekspor 0.16 = tersibak),
  `photo_slot` (bidang foto mempelai di panel tengah pelaminan).
- `src/themes/minang-royal/theme.ts`: palet brief, Gunung Marapi, pepohonan,
  lampu interior hangat (fitur baru `interiorLights` di template), lentera,
  rangkaian bunga, kuda-kuda cerita.
- `shots.json`: film sementara 6 adegan memakai engine yang ada; `npm run check:shots` → 0 masalah.

## Aset Meshy (rumah gadang + pelaminan)
- Dipakai: `Meshy_AI_Minangkabau_Pavilion_…_texture.glb` (hasil Remesh Meshy, 147.600 segitiga,
  tekstur 4K PNG, 65 MB) → `scripts/generators/pack_glb.py in.glb out.glb 2048`
  → `public/assets/themes/minang-royal/rumah-gadang-pelaminan.glb` (9,4 MB, geometri & UV utuh,
  tekstur 2K JPEG, KHR_mesh_quantization, lantai di y = 0).
- Pelajaran: model Meshy beresolusi penuh (5,7 jt segitiga) tidak bisa dikecilkan dengan
  vertex clustering tanpa merusak tekstur (7.193 pulau UV). Selalu Remesh di Meshy
  (Triangle, 150–200 rb) sebelum diunduh, lalu `pack_glb.py`.
- Dipasang lewat `world.extraModels` (skala 12: ±23 × 11 × 11,5 m; panggung 1,66 m; tanpa
  bayangan, satu sisi) di dalam `compound.glb` (`minang_world.py --no-house`).
- Spot pengantin: tepi depan pelaminan `[0, 1.66, 3.3]`.

## Avatar pengantin
- `Meshy_AI_Chibi_Minangkabau_Cou_…_texture.glb` (154.503 segitiga, satu model berisi kedua
  mempelai berbaju adat, menghadap +Z) → `pack_glb.py` → `public/assets/themes/minang-royal/couple.glb` (8,3 MB).
- Dipasang lewat `theme.characters.coupleModelUrl` (tinggi 1,7 m, di tepi depan pelaminan);
  model bride/groom dari config tidak dimuat untuk tema ini (hemat 18 MB, ±450 rb segitiga).
- Belum beranimasi (Meshy tanpa rig); hanya gerak "bernapas" halus.

## Struktur komponen (target)
| Modul | Lokasi | Status |
|---|---|---|
| 3D environment | `themes/minang-royal/` + `components/environment/glbWorld.ts` | Tahap 1 |
| Lighting | `glbWorld.ts` (sun, hemi, interiorLights, lamp glow) | Tahap 1 |
| Camera controller | `components/camera/CinematicDirector.ts`, `DirectorMode.ts` | ada |
| Animation controller | `components/animation/` — pintu gerbang, tirai, partikel emas | Tahap 2 |
| Scene components | 8 adegan: opening, entering, pelaminan, couple, info, story+gallery, RSVP+gift, closing | Tahap 2–5 |
| Character models | `components/characters/` — GLB baju adat Minang (suntiang, saluak) | Tahap 3 |
| UI overlay | `components/ui/`, tipografi merah–emas, panel ukiran | Tahap 3–4 |
| Wedding information | panel acara + Maps + countdown | Tahap 4 |
| Gallery | foto/video berbingkai songket | Tahap 4 |
| RSVP & gift | form + Supabase (tabel rsvp, wishes) | Tahap 5 |
| Audio controller | `components/audio/AudioEngine.ts` + SFX pintu | Tahap 6 |

## Tahap berikutnya
2. Opening sinematik: layar gelap + partikel emas, dolly ke gerbang, pintu
   terbuka (animasi node), "The Wedding of", nama, tombol "Buka Undangan";
   alur 8 adegan menggantikan 6 adegan sementara.
3. Pengantin + tipografi: tirai tersibak, model GLB pakaian adat (butuh aset
   atau placeholder proporsional), foto di `photo_slot`.
4. Informasi acara + galeri. 5. RSVP + wedding gift (Supabase). 6. Audio, optimasi, responsif.
