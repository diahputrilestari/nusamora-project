import { notFound } from "next/navigation";

// Menangkap semua URL tak dikenal di bawah /[locale] agar 404 dirender oleh layout locale secara dinamis
// (sehingga nonce CSP ikut diterapkan, bukan halaman 404 statis bawaan Next).
export default function CatchAll() {
  notFound();
}
