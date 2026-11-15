# Undangan Signature (3D): sumber data

Undangan 3D membaca data pelanggan dari database, sama seperti undangan 2D.

| Alur | Penjelasan |
|---|---|
| Editor | `assets/flow.js` (`pkg = signature`) menyimpan `invitations.content` lewat RPC `save_invitation` |
| Kunci yang diizinkan | `pkg_keys('signature')` di `backend/essential-schema.sql` (jalan pintas: `backend/signature-schema.sql`) |
| Link publik | `nusamora.com/<slug>` memuat `undangan.html`; `assets/invite/core/data.js` mengalihkan ke `/assets-signature/invite/index?slug=<slug>&theme=<theme_key>&to=<tamu>` bila `experience = 3d` |
| Pratinjau pemilik | `/assets-signature/invite/index?preview=<id>&theme=<theme_key>` (butuh sesi login, baca tabel `invitations` dengan token pemilik) |
| Build 3D | `src/data/remote.ts` memetakan `content` ke konfigurasi undangan sebelum engine mulai; `src/preview/guest.ts` = panel RSVP, ucapan, hadiah |
| Demo | `?demo=1&theme=<id>` tetap memakai data contoh |

## Peta field

| content | Tampil di 3D |
|---|---|
| `names.a / b`, `couple.order` | nama mempelai dan urutannya |
| `couple.<side>.full / parents / ig` | adegan Mempelai (orang tua = teks bebas) |
| `event` + `events[0]` | dua kartu acara, tombol peta, tombol kalender, hitung mundur (zona waktu WIB/WITA/WIT) |
| `story[0..3]` | 4 easel cerita (bab kosong memakai judul bawaan tanpa teks) |
| `photos.cover` / `photos.gallery` | foto easel sambutan / easel cerita yang tidak punya foto sendiri |
| `welcome` / `texts.opening` | kalimat undangan pembuka |
| `texts.quote / quoteSource / closing` | ayat dan penutup |
| `camera.speed` | lama setiap adegan (`12 - speed` detik) |
| `music.enabled` | mati = film mulai dalam keadaan bisu |
| `features.countdown / rsvp / guestbook / gift`, `gift`, `accounts` | hitung mundur, panel RSVP, panel ucapan, panel hadiah |

Tidak ditampilkan di 3D (ditetapkan oleh tema): `scene`, `anim`, `cinematic`, pilihan lagu (hanya satu), foto potret mempelai, avatar per mempelai
(semua tema 3D memakai satu berkas pasangan). Bagian editor untuk itu disembunyikan.

## Urutan rilis

1. Jalankan `backend/signature-schema.sql` di Supabase SQL Editor (idempoten). Tanpa ini penyimpanan editor signature ditolak (`konten_tidak_sesuai_paket`).
2. Gabungkan PR (editor, pengalihan link, build 3D baru untuk 11 tema).
