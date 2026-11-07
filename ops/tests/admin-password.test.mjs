import { handleAdminPassword, passwordPolicy, jwtAal } from "../../supabase/functions/_shared/adminpw.ts";
let pass = 0, fail = 0; const ok = (n, c) => { if (c) { pass++; console.log("PASS ", n); } else { fail++; console.log("FAIL ", n); } };
// kebijakan
ok("terlalu pendek ditolak", !passwordPolicy("Abc1!xyz").ok);
ok("hanya 2 jenis karakter ditolak", !passwordPolicy("abcdefghijklmnop1").ok);
ok("memuat bagian email (>=4 huruf) ditolak", !passwordPolicy("Xx-budisantoso-9!", "budisantoso@x.id").ok);
ok("kata umum/nama layanan ditolak", !passwordPolicy("NusaMora-Admin-2026!").ok);
ok("karakter berulang ditolak", !passwordPolicy("Aaaaa-bcdef-9876!").ok);
ok("lebih dari 72 karakter ditolak", !passwordPolicy("Aa1!".repeat(20)).ok);
ok("password kuat diterima", passwordPolicy("kopi-Hangat#Senja-4721", "x@x.id").ok);
// jwtAal
const b64 = (o) => btoa(JSON.stringify(o)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
ok("jwtAal membaca aal2", jwtAal(`h.${b64({ aal: "aal2" })}.s`) === "aal2");
ok("jwtAal token rusak -> null", jwtAal("bukan-jwt") === null && jwtAal("a.b.c") === null);
// handler
const store = { pw: null, marked: 0, events: [], aal: "aal2", admin: true };
const deps = (over = {}) => ({ env: { allowedOrigins: ["https://nusamora.com"] },
  async getUser(t) { return t === "tok" ? { id: "u-1234567", email: "dyah@x.id", aal: store.aal } : null; },
  async setPassword(uid, pw) { store.pw = pw; return true; },
  async rpc(n, a) { if (n === "is_admin_for_password") return { data: store.admin && (store.aal === "aal2"), error: null }; if (n === "admin_mark_password_ok") { store.marked++; return { data: null, error: null }; } if (n === "log_security_event") { store.events.push(a); return { data: null, error: null }; } return { data: { allowed: true }, error: null }; }, ...over });
const call = (body, tok = "tok", d = deps()) => handleAdminPassword(new Request("https://x/f", { method: "POST", headers: { authorization: "Bearer " + tok, origin: "https://nusamora.com", "content-type": "application/json" }, body: JSON.stringify(body) }), d);
let r = await call({ new_password: "kopi-Hangat#Senja-4721" }); ok("sukses -> 200, password diset, kebijakan dicatat", r.status === 200 && store.pw === "kopi-Hangat#Senja-4721" && store.marked === 1);
ok("event tidak memuat password", !JSON.stringify(store.events).includes("kopi") && store.events[0].p_kind === "admin_password_changed");
store.pw = null; r = await call({ new_password: "lemah" }); ok("lemah -> 422 dengan alasan; password tidak diset", r.status === 422 && store.pw === null && (await r.json()).problems.length > 0);
r = await call({ new_password: "kopi-Hangat#Senja-4721" }, "salah"); ok("tanpa sesi valid -> 401", r.status === 401);
store.aal = "aal1"; r = await call({ new_password: "kopi-Hangat#Senja-4721" }); ok("MFA wajib tetapi sesi aal1 -> 403", r.status === 403); store.aal = "aal2";
store.admin = false; r = await call({ new_password: "kopi-Hangat#Senja-4721" }); ok("bukan admin -> 403", r.status === 403); store.admin = true;
const lim = deps({ async rpc(n, a) { if (n === "rl_hit") return { data: { allowed: false, retry_after: 30 }, error: null }; return { data: true, error: null }; } });
r = await call({ new_password: "kopi-Hangat#Senja-4721" }, "tok", lim); ok("rate limit -> 429", r.status === 429 && r.headers.get("retry-after") === "30");
console.log(fail ? `GAGAL ${fail}` : `SEMUA LULUS (${pass})`); process.exit(fail ? 1 : 0);
