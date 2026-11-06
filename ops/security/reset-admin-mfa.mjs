// Prosedur pemulihan: hapus SEMUA faktor MFA seorang admin yang kehilangan perangkat (agar bisa mendaftar ulang).
// Dijalankan oleh pemilik proyek / super admin lain dari komputer tepercaya. BELUM diuji terhadap Supabase sungguhan
// (hanya terhadap mock) — coba dulu pada proyek staging. Alternatif tanpa skrip: Dashboard Supabase > Authentication > Users.
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node ops/security/reset-admin-mfa.mjs <email-admin> [--yes]
import { createClient } from "@supabase/supabase-js"; // npm i @supabase/supabase-js (di mesin operator)
const email = (process.argv[2] || "").toLowerCase(), yes = process.argv.includes("--yes");
const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!email || !url || !key) { console.error("pakai: node reset-admin-mfa.mjs <email-admin> [--yes]  (env SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)"); process.exit(2); }
const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
let user = null; for (let page = 1; !user && page <= 20; page++) { const r = await sb.auth.admin.listUsers({ page, perPage: 200 }); if (r.error) { console.error("gagal membaca pengguna:", r.error.message); process.exit(1); } user = r.data.users.find((u) => (u.email || "").toLowerCase() === email); if (r.data.users.length < 200) break; }
if (!user) { console.error("pengguna tidak ditemukan"); process.exit(1); }
const f = await sb.auth.admin.mfa.listFactors({ userId: user.id }); if (f.error) { console.error("gagal membaca faktor:", f.error.message); process.exit(1); }
console.log(`${email}: ${f.data.factors.length} faktor (${f.data.factors.map((x) => x.status).join(", ") || "-"})`);
if (!yes) { console.log("Tambahkan --yes untuk menghapus semua faktor tersebut."); process.exit(0); }
for (const x of f.data.factors) { const d = await sb.auth.admin.mfa.deleteFactor({ userId: user.id, id: x.id }); if (d.error) { console.error("gagal menghapus", x.id, d.error.message); process.exit(1); } }
await sb.rpc("log_security_event", { p_kind: "admin_mfa_reset", p_actor: user.id, p_detail: { by: "operator-script" } });
console.log("Selesai. Admin harus mendaftar ulang MFA di /admin-keamanan. Catat insiden ini (INCIDENT_RESPONSE.md).");
