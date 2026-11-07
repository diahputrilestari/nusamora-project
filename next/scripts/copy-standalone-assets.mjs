// Mode `output: "standalone"` tidak menyalin `public/` dan `.next/static` ke folder standalone. Salin agar `node .next/standalone/server.js`
// (perintah start) menyajikan aset dengan benar, di Hostinger maupun lokal. Aman dijalankan berulang.
import { cpSync, existsSync, mkdirSync } from "node:fs";
const copy = (from, to) => { if (existsSync(from)) { mkdirSync(to, { recursive: true }); cpSync(from, to, { recursive: true }); } };
copy("public", ".next/standalone/public");
copy(".next/static", ".next/standalone/.next/static");
console.log("Aset standalone disalin.");
