# NusaMora

- `/` landing page (`index.html`, `assets/landing.css`, `assets/landing.js`), dibangun dari `builder/build_landing.py` (`python3 builder/build_landing.py project .`).
- `/live/` demo Live Guest tema Romantic Garden, `/live/jawa-tengah` tema Adat Jawa Tengah. Kode sumber Live Guest di `source/`.
- Konfigurasi CTA: di `assets/landing.js`, isi `APP.signup`, `APP.login`, `APP.whatsapp` bila sudah ada. Kosong = dialog informasi.
- Domain canonical dan OG memakai `https://nusamora.com` (ubah `SITE` di builder bila berbeda).
- Deploy: Vercel static, `cleanUrls` aktif.
