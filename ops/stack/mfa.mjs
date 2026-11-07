// Skenario MFA pada GoTrue/PostgREST/Edge Runtime NYATA. Prasyarat: SQL skema + security-schema + security-mfa sudah diterapkan; fungsi admin ter-serve.
import { check, info, finish, mk, svc, mkUser, login, enrollTotp, elevate, jwtClaims, fn, URL_, ANON, SERVICE } from "./lib.mjs";
import { execFileSync } from "node:child_process";
const PW = "Uji-Sandi-Panjang#2026";
const stamp = Date.now().toString(36);
const E = (n) => `${n}.${stamp}@uji.nusamora.test`;
const [sa, ct, cust, nw] = await Promise.all([mkUser(E("sa"), PW), mkUser(E("ct"), PW), mkUser(E("cust"), PW), mkUser(E("new"), PW)]);
const addAdmin = async (u, role) => { const r = await svc.from("admin_users").insert({ user_id: u.id, role, active: true }); if (r.error) throw new Error("admin_users: " + r.error.message); };
await addAdmin(sa, "super_admin"); await addAdmin(ct, "content");
const AUD = async (c) => { const r = await c.from("audit_logs").select("id").limit(1); return r.error ? "ERR:" + r.error.code : r.data.length; };
await svc.from("audit_logs").insert({ actor_id: sa.id, action: "uji-stack" });

// S1. login hanya password
let A = await login(E("sa"), PW);
check("S1 login password -> klaim aal1", jwtClaims(A.token).aal === "aal1", jwtClaims(A.token).aal);
let me = (await A.c.rpc("my_admin")).data;
check("S1 penegakan mati: admin aal1 punya perms & needed=false", me?.perms?.length > 0 && me.mfa.needed === false && me.mfa.enrolled === false, JSON.stringify(me?.mfa));
// S2. enrollment + verifikasi TOTP
const fSa = await enrollTotp(A.c, "sa");
const t2 = (await A.c.auth.getSession()).data.session.access_token;
check("S2 setelah verifikasi TOTP -> klaim aal2 & amr totp", jwtClaims(t2).aal === "aal2" && JSON.stringify(jwtClaims(t2).amr).includes("totp"), JSON.stringify(jwtClaims(t2)));
const lvl = (await A.c.auth.mfa.getAuthenticatorAssuranceLevel()).data;
check("S2 getAuthenticatorAssuranceLevel: current=aal2", lvl.currentLevel === "aal2", JSON.stringify(lvl));
// kode salah ditolak
const bad = await A.c.auth.mfa.challengeAndVerify({ factorId: fSa.factorId, code: "000000" });
check("S2 kode TOTP salah ditolak", !!bad.error, bad.error?.message);
// S3. prasyarat pengaktifan: ct belum punya faktor
let r = await A.c.rpc("admin_set_security", { p_mfa: true, p_password: false });
check("S3 aktivasi ditolak selama ada admin tanpa faktor", !!r.error && /belum mendaftarkan MFA/.test(r.error.message), r.error?.message);
const C = await login(E("ct"), PW); const fCt = await enrollTotp(C.c, "ct");
r = await A.c.rpc("admin_set_security", { p_mfa: true, p_password: false });
check("S3 setelah semua admin punya faktor & pemanggil aal2 -> aktif", !r.error && r.data?.mfa_required === true, r.error?.message);
// S4. penegakan
A = await login(E("sa"), PW);      // sesi baru = aal1
check("S4 login ulang hanya password -> aal1", jwtClaims(A.token).aal === "aal1");
me = (await A.c.rpc("my_admin")).data;
check("S4 aal1: my_admin needed=true, perms kosong, role tetap terbaca", me.mfa.needed === true && me.perms.length === 0 && me.role === "super_admin", JSON.stringify(me));
check("S4 aal1: RLS menyembunyikan audit_logs", (await AUD(A.c)) === 0, await AUD(A.c));
r = await A.c.rpc("security_status"); check("S4 aal1: security_status ditolak (42501)", r.error?.code === "42501", r.error?.message);
r = await A.c.from("templates").insert({ name: "x", slug: "x-" + stamp, package_type: "essential" }); check("S4 aal1: tulis templates ditolak RLS", !!r.error, r.error?.message);
r = await A.c.rpc("admin_set_security", { p_mfa: false, p_password: false }); check("S4 aal1 tidak bisa mematikan penegakan", r.error?.code === "42501", r.error?.message);
const tok1 = A.token, tok2 = await elevate(A.c, fSa);
check("S4 setelah TOTP: klaim aal2", jwtClaims(tok2).aal === "aal2");
me = (await A.c.rpc("my_admin")).data; check("S4 aal2: needed=false & perms ada", me.mfa.needed === false && me.perms.length > 0, JSON.stringify(me.mfa));
check("S4 aal2: audit_logs terbaca", (await AUD(A.c)) >= 1, await AUD(A.c));
// S5. Edge Function
const p = { path: `incoming/${sa.id}/tidak-ada.png` };
let f = await fn("asset-register", null, p); check("S5 edge: tanpa token -> 401", f.status === 401, f.status);
f = await fn("asset-register", tok1, p); check("S5 edge: admin aal1 -> 403", f.status === 403, JSON.stringify(f));
const Cu = await login(E("cust"), PW); f = await fn("asset-register", Cu.token, p); check("S5 edge: pelanggan biasa -> 403", f.status === 403, f.status);
f = await fn("asset-register", tok2, p); check("S5 edge: admin aal2 lolos otorisasi (404 file tidak ada)", f.status === 404, JSON.stringify(f.body));
f = await fn("asset-generate", tok1, { action: "generate" }); check("S5 edge generate: aal1 -> 403", f.status === 403, JSON.stringify(f.body));
// S6. faktor pertama admin baru = tidak dipercaya sampai disetujui
await addAdmin(nw, "super_admin");
const N = await login(E("new"), PW); const fNw = await enrollTotp(N.c, "new"); const tokN = (await N.c.auth.getSession()).data.session.access_token;
check("S6 admin baru aal2 TAPI belum disetujui -> needed=true", (await N.c.rpc("my_admin")).data.mfa.needed === true && (await AUD(N.c)) === 0);
f = await fn("asset-register", tokN, p); check("S6 edge: admin baru belum disetujui -> 403", f.status === 403, f.status);
r = await N.c.rpc("admin_approve_mfa", { p_user: nw.id }); check("S6 tidak bisa menyetujui diri sendiri", !!r.error, r.error?.message);
r = await C.c.rpc("admin_approve_mfa", { p_user: nw.id }); check("S6 admin non-super tidak bisa menyetujui", !!r.error, r.error?.message);
r = await A.c.rpc("admin_approve_mfa", { p_user: nw.id }); check("S6 super admin lain (aal2) bisa menyetujui", !r.error, r.error?.message);
check("S6 setelah disetujui admin baru berfungsi", (await N.c.rpc("my_admin")).data.mfa.needed === false);
// S7. tidak bisa mendaftarkan/menghapus faktor akun lain
const before = (await svc.auth.admin.mfa.listFactors({ userId: sa.id })).data?.factors?.length;
const x1 = await fetch(`${URL_}/auth/v1/admin/users/${sa.id}/factors`, { headers: { apikey: ANON, Authorization: "Bearer " + Cu.token } });
check("S7 pelanggan tak bisa membaca faktor admin via Admin API", x1.status >= 400, x1.status);
const x2 = await fetch(`${URL_}/auth/v1/admin/users/${sa.id}/factors/${fSa.factorId}`, { method: "DELETE", headers: { apikey: ANON, Authorization: "Bearer " + Cu.token } });
check("S7 pelanggan tak bisa menghapus faktor admin via Admin API", x2.status >= 400, x2.status);
const un = await Cu.c.auth.mfa.unenroll({ factorId: fSa.factorId }); check("S7 unenroll faktor milik akun lain ditolak", !!un.error, un.error?.message);
const en = await Cu.c.auth.mfa.enroll({ factorType: "totp" }); const afterSa = (await svc.auth.admin.mfa.listFactors({ userId: sa.id })).data?.factors?.length;
check("S7 enroll oleh pelanggan hanya untuk dirinya sendiri (faktor admin tak berubah)", afterSa === before && !en.error, `before=${before} after=${afterSa}`);
r = await Cu.c.rpc("admin_approve_mfa", { p_user: sa.id }); check("S7 pelanggan tak bisa memanggil admin_approve_mfa", !!r.error, r.error?.message);
r = await Cu.c.rpc("admin_mfa_reset_mark", { uid: sa.id }); check("S7 pelanggan tak bisa memanggil admin_mfa_reset_mark", !!r.error, r.error?.message);
r = await Cu.c.rpc("rl_hit", { p_key: "x".repeat(20), p_limit: 1, p_window_secs: 1 }); check("S7 pelanggan tak bisa memanggil rl_hit", !!r.error, r.error?.message);
// sesi dengan password sama tetapi MFA wajib: admin tanpa faktor pertama (belum enroll) hanya bisa enroll — tetap tak punya akses
const un2 = await mkUser(E("un"), PW); await addAdmin(un2, "content"); const U = await login(E("un"), PW);
check("S7b admin aktif tanpa faktor: tidak punya akses data admin walau login berhasil", (await U.c.rpc("my_admin")).data.mfa.needed === true && (await AUD(U.c)) === 0);
// S8. reset MFA oleh operator + pemulihan
const env = { ...process.env, SUPABASE_URL: URL_, SUPABASE_SERVICE_ROLE_KEY: SERVICE };
const out = execFileSync("node", ["../security/reset-admin-mfa.mjs", E("ct"), "--yes"], { env, encoding: "utf8" });
info("S8 keluaran skrip reset", out.trim().split("\n"));
check("S8 faktor admin ct terhapus", ((await svc.auth.admin.mfa.listFactors({ userId: ct.id })).data?.factors?.length ?? -1) === 0);
const C2 = await login(E("ct"), PW); check("S8 ct login password -> tanpa akses (persetujuan dicabut, tak punya faktor)", (await C2.c.rpc("my_admin")).data.mfa.needed === true && (await AUD(C2.c)) === 0);
await enrollTotp(C2.c, "ct2"); check("S8 ct daftar ulang tapi belum disetujui -> masih tanpa akses", (await C2.c.rpc("my_admin")).data.mfa.needed === true);
r = await A.c.rpc("admin_approve_mfa", { p_user: ct.id }); check("S8 super admin menyetujui ulang", !r.error, r.error?.message);
check("S8 ct kembali berfungsi", (await C2.c.rpc("my_admin")).data.mfa.needed === false);
// S9. break-glass: matikan penegakan lewat SQL (pemilik DB)
await svc.from("security_settings").update({ value: false }).eq("key", "admin_mfa_required");
const A3 = await login(E("sa"), PW); check("S9 break-glass: penegakan mati -> admin aal1 kembali bisa (pemulihan darurat)", (await A3.c.rpc("my_admin")).data.mfa.needed === false);
await svc.from("security_settings").update({ value: true }).eq("key", "admin_mfa_required");
const A4 = await login(E("sa"), PW); check("S9 dinyalakan lagi -> aal1 ditolak", (await A4.c.rpc("my_admin")).data.mfa.needed === true);
// S10. kebijakan password admin lewat Edge Function nyata
await svc.from("security_settings").update({ value: true }).eq("key", "admin_mfa_required");
f = await fn("admin-password", tok2, { new_password: "lemah" }); check("S10 password lemah -> 422", f.status === 422, JSON.stringify(f.body));
f = await fn("admin-password", tok1, { new_password: "kopi-Hangat#Senja-4721" }); check("S10 sesi aal1 (MFA wajib) -> 403", f.status === 403, JSON.stringify(f.body));
f = await fn("admin-password", Cu.token, { new_password: "kopi-Hangat#Senja-4721" }); check("S10 pelanggan -> 403", f.status === 403, f.status);
f = await fn("admin-password", tok2, { new_password: "kopi-Hangat#Senja-4721" }); check("S10 password kuat oleh admin aal2 -> 200", f.status === 200, JSON.stringify(f.body));
const row = (await svc.from("admin_users").select("password_policy_at").eq("user_id", sa.id).single()).data; check("S10 password_policy_at tercatat", !!row?.password_policy_at);
const ok2 = await mk().auth.signInWithPassword({ email: E("sa"), password: "kopi-Hangat#Senja-4721" }); check("S10 login dengan password baru berhasil", !ok2.error, ok2.error?.message);
const ev = await svc.from("security_events").select("kind").in("kind", ["admin_password_changed", "admin_mfa_approved", "admin_mfa_reset", "security_settings_changed"]); info("event keamanan tercatat", [...new Set((ev.data || []).map((e) => e.kind))]);
finish();
