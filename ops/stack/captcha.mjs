// CAPTCHA pada GoTrue NYATA dengan secret uji Cloudflare Turnstile (selalu lolos). Memverifikasi: tanpa token ditolak, dengan token diterima.
import { check, info, finish, mk } from "./lib.mjs";
const PW = "Uji-Sandi-Panjang#2026", stamp = Date.now().toString(36), E = (n) => `${n}.${stamp}@uji.nusamora.test`;
let r = await mk().auth.signUp({ email: E("c1"), password: PW });
check("signUp TANPA captchaToken ditolak", !!r.error && /captcha/i.test(r.error.message), r.error?.message);
r = await mk().auth.signUp({ email: E("c2"), password: PW, options: { captchaToken: "XXXX.DUMMY.TOKEN.XXXX" } });
check("signUp DENGAN captchaToken diterima", !r.error, r.error?.message);
r = await mk().auth.signInWithPassword({ email: E("c2"), password: PW });
check("login TANPA captchaToken ditolak", !!r.error && /captcha/i.test(r.error.message), r.error?.message);
r = await mk().auth.signInWithPassword({ email: E("c2"), password: PW, options: { captchaToken: "XXXX.DUMMY.TOKEN.XXXX" } });
info("login dengan captchaToken (email mungkin belum terkonfirmasi)", { error: r.error?.message });
check("login dengan captchaToken melewati captcha (galat bukan captcha)", !r.error || !/captcha/i.test(r.error.message), r.error?.message);
r = await mk().auth.resetPasswordForEmail(E("c2"));
check("reset password TANPA captchaToken ditolak", !!r.error && /captcha/i.test(r.error.message), r.error?.message);
r = await mk().auth.resetPasswordForEmail(E("c2"), { captchaToken: "XXXX.DUMMY.TOKEN.XXXX" });
check("reset password DENGAN captchaToken diterima", !r.error, r.error?.message);
finish();
