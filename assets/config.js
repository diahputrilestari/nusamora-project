/* Konfigurasi publik. Isi dari Supabase: Project Settings > API.
   anon key aman dipublikasikan (dilindungi Row Level Security); JANGAN pernah menaruh service_role key di sini. */
window.NM_CONFIG = {
  SUPABASE_URL: "https://ixzmogwaaajkyltcnwaf.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_46VcmgwQ7nEbccpFKf-58w_kJKvSWPQ",
  ANALYTICS_ON: false,   /* analitik first-party (assets/nm-track.js). Nyalakan (true) hanya setelah SQL analytics-schema, Edge Function analytics-collect, dan saklar database aktif */
  GA4_ID: "",   /* Google Analytics 4: isi ID pengukuran "G-XXXXXXXXXX" untuk mengaktifkan; kosong = analitik mati */
  SITE_URL: ""   /* kosong = pakai domain yang sedang dibuka; isi "https://nusamora.com" setelah pindah domain */
};
