// Batas Auth & lockout pada GoTrue NYATA. Config CI: sign_in_sign_ups=20 / 5 mnt per IP, email_sent=2, hook password_verification_attempt aktif.
import { check, info, finish, mk, svc, mkUser, URL_, ANON } from "./lib.mjs";
const PW = "Uji-Sandi-Panjang#2026", stamp = Date.now().toString(36), E = (n) => `${n}.${stamp}@uji.nusamora.test`;
const LIMIT = Number(process.env.SIGNIN_LIMIT || 20);
const L = await mkUser(E("lock"), PW), M = await mkUser(E("other"), PW);
const tryLogin = async (email, pw) => { const r = await mk().auth.signInWithPassword({ email, password: pw }); return r; };
// 1. brute-force per akun (hook): 4 gagal -> masih normal
let last;
for (let i = 1; i <= 4; i++) last = await tryLogin(E("lock"), "salah-" + i);
check("1 gagal ke-1..4: ditolak 'invalid credentials' biasa", !!last.error && /invalid/i.test(last.error.message), last.error?.message);
last = await tryLogin(E("lock"), "salah-5"); info("gagal ke-5", { msg: last.error?.message, status: last.error?.status, code: last.error?.code });
const correct = await tryLogin(E("lock"), PW);
check("1 setelah 5 gagal: password BENAR tetap ditolak (akun terkunci)", !!correct.error, correct.error?.message);
info("pesan penguncian dari hook", { message: correct.error?.message, code: correct.error?.code, status: correct.error?.status });
const ev = await svc.from("security_events").select("kind").eq("kind", "login_lockout"); check("1 kejadian login_lockout tercatat", (ev.data || []).length >= 1, JSON.stringify(ev.error));
// 2. akun lain dari IP yang sama tidak terdampak (kunci bukan per-IP)
const other = await tryLogin(E("other"), PW); check("2 akun lain dari IP sama tetap bisa login saat akun L terkunci", !other.error, other.error?.message);
// 3. pemulihan setelah kunci berakhir (waktu disimulasikan di DB)
await svc.from("login_attempts").update({ locked_until: new Date(Date.now() - 1000).toISOString() }).eq("user_id", L.id);
const rec = await tryLogin(E("lock"), PW); check("3 kunci berakhir -> login benar berhasil dan penghitung direset", !rec.error, rec.error?.message);
const la = (await svc.from("login_attempts").select("fails,locked_until").eq("user_id", L.id).single()).data; check("3 fails=0 setelah sukses", la?.fails === 0 && la?.locked_until === null, JSON.stringify(la));
// 4. IP bersama: banyak pengguna sah dalam satu IP
const users = []; for (let i = 0; i < 8; i++) users.push(await mkUser(E("office" + i), PW));
let okCount = 0; for (let i = 0; i < 8; i++) { const r = await tryLogin(E("office" + i), PW); if (!r.error) okCount++; }
check("4 8 pengguna sah dari satu IP (kantor) semua berhasil login", okCount === 8, okCount);
// 5. batas per IP: probe tiap endpoint (limit sign_in_sign_ups dikonfigurasi ${LIMIT} / 5 menit / IP). Mengukur yang SEBENARNYA dibatasi.
const is429 = (e) => e && (e.status === 429 || /rate limit|too many/i.test(e.message || ""));
async function probe(label, fnc, n = LIMIT + 25) { let first = null, c429 = 0; for (let i = 0; i < n; i++) { const r = await fnc(i); if (is429(r?.error)) { c429++; first ??= i + 1; } } info("5 probe " + label, { dikirim: n, diblokir429: c429, blokirMulaiKePermintaan: first }); return first; }
const pSignIn = await probe("signInWithPassword (kredensial salah)", (i) => tryLogin(E("flood" + (i % 3)), "x"));
const pRefresh = await probe("refreshSession (token tak valid)", () => mk().auth.refreshSession({ refresh_token: "tidak-valid-" + Math.random() }));
const pOtp = await probe("verifyOtp (kode salah)", () => mk().auth.verifyOtp({ email: E("office2"), token: "123456", type: "email" }));
const pSignUp = await probe("signUp (email baru)", (i) => mk().auth.signUp({ email: E("flsu" + i), password: PW }));
check("5 sedikitnya satu jenis permintaan dari satu IP dibatasi (429) pada konfigurasi ini", [pSignIn, pRefresh, pOtp, pSignUp].some((x) => x), JSON.stringify({ pSignIn, pRefresh, pOtp, pSignUp }));
const afterFlood = await tryLogin(E("office0"), PW); info("5 login sah SESAAT setelah banjir dari IP yang sama (efek IP bersama)", { diblokir: !!afterFlood.error, pesan: afterFlood.error?.message, status: afterFlood.error?.status });
// pencegah penguncian pengguna sah: login sah dari akun lain TIDAK boleh terkunci oleh banjir kredensial salah pada akun lain (kunci per-akun)
const stillOk = await tryLogin(E("other"), PW); info("5 akun 'other' (tak ikut diserang) setelah banjir", { diblokir: !!stillOk.error, pesan: stillOk.error?.message });
// 6. reset password
const rs = []; for (let i = 0; i < 4; i++) { const r = await mk().auth.resetPasswordForEmail(E("office1")); rs.push(r.error ? (r.error.status || r.error.message) : "ok"); }
info("6 reset password beruntun untuk satu email", rs);
check("6 reset password dibatasi setelah beberapa kali", rs.some((x) => x === 429 || /rate/i.test(String(x))), JSON.stringify(rs));
// 7. sign-up (email konfirmasi)
const su = []; for (let i = 0; i < 3; i++) { const r = await mk().auth.signUp({ email: E("su" + i), password: PW }); su.push(r.error ? (r.error.status || r.error.message) : "ok"); }
info("7 signUp berturut-turut", su);
finish();
