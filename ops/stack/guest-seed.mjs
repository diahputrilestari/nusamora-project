// Menyiapkan / membersihkan SATU undangan uji di STAGING agar halaman publik Next.js bisa diuji dari browser.
// Pakai: node guest-seed.mjs seed | clean. Slug tetap (uji-nusamora-staging). Tanpa data pribadi. Tanpa login (service_role).
import { check, finish, svc, mkUser } from "./lib.mjs";
const SLUG = "uji-nusamora-staging", EMAIL = "seed.owner@uji.nusamora.test", mode = process.argv[2];
const find = async () => (await svc.from("invitations").select("id,user_id").eq("slug", SLUG).maybeSingle()).data;
const users = async () => (await svc.auth.admin.listUsers({ page: 1, perPage: 1000 })).data?.users?.filter((u) => u.email === EMAIL) || [];
if (mode === "clean") {
  const inv = await find(); if (inv) await svc.from("invitations").delete().eq("id", inv.id);
  for (const u of await users()) await svc.auth.admin.deleteUser(u.id);
  check("undangan uji & pemilik dihapus", !(await find()) && (await users()).length === 0);
  finish();
} else if (mode === "seed") {
  if (await find()) { console.log("sudah ada; jalankan clean dulu"); process.exit(1); }
  const owner = await mkUser(EMAIL, "Uji-Sandi-Panjang#" + Date.now());
  const content = { names: { a: "Uji", b: "Staging" }, welcome: "Undangan uji NusaMora (akan dihapus).", event: { venue: "Gedung Uji", address: "Jl. Contoh 1, Semarang", start: "2030-01-01 10:00", tz: "WIB" } };
  const i = await svc.from("invitations").insert({ user_id: owner.id, title: "Uji Staging", category: "wedding", slug: SLUG, status: "aktif", plan_id: "signature",
    expires_at: new Date(Date.now() + 2 * 864e5).toISOString(), event_date: "2030-01-01", content }).select("id").single();
  check("undangan uji dibuat", !i.error, i.error?.message);
  const g = await svc.from("invitation_guests").insert({ invitation_id: i.data.id, name: "Tamu Uji" }).select("token").single();
  check("tamu uji dibuat", !g.error, g.error?.message);
  console.log("TOKEN_UJI=" + g.data?.token);
  finish();
} else { console.log("mode: seed|clean"); process.exit(2); }
