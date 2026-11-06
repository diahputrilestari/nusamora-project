/** Konfigurasi publik Supabase. Gagal cepat dengan pesan jelas bila belum diisi (tanpa membocorkan nilai). */
export function publicEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_ANON_KEY belum diisi (lihat .env.example).");
  }
  return { url, anonKey };
}
