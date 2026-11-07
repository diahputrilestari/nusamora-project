// Pustaka uji terhadap stack Supabase NYATA (lokal via `supabase start` di CI, atau staging berbasis env).
// Env: SUPABASE_URL (API), SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_DB_URL, ORIGIN (default http://localhost)
import { createClient } from "@supabase/supabase-js";
import { createHmac } from "node:crypto";
import { appendFileSync, mkdirSync } from "node:fs";
export const env = (k, d) => { const v = process.env[k] ?? d; if (v === undefined) { console.error("env wajib:", k); process.exit(2); } return v; };
export const URL_ = env("SUPABASE_URL").replace(/\/$/, ""), ANON = env("SUPABASE_ANON_KEY"), SERVICE = env("SUPABASE_SERVICE_ROLE_KEY");
export const ORIGIN = env("ORIGIN", "http://localhost");
export const mk = (key = ANON) => createClient(URL_, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
export const svc = mk(SERVICE);
// ---- TOTP (RFC 6238, SHA-1, 30 dtk, 6 digit)
const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
export function b32(s) { let bits = ""; for (const c of s.replace(/=+$/, "").toUpperCase()) bits += B32.indexOf(c).toString(2).padStart(5, "0"); const out = []; for (let i = 0; i + 8 <= bits.length; i += 8) out.push(parseInt(bits.slice(i, i + 8), 2)); return Buffer.from(out); }
export function totp(secret, t = Date.now()) { const c = Buffer.alloc(8); c.writeBigUInt64BE(BigInt(Math.floor(t / 30000))); const h = createHmac("sha1", b32(secret)).update(c).digest(); const o = h[19] & 15; return String(((h.readUInt32BE(o) & 0x7fffffff) % 1000000)).padStart(6, "0"); }
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// kode TOTP tidak boleh dipakai ulang dalam jendela yang sama pada GoTrue: tunggu jendela berikutnya bila perlu
let lastWindow = 0; export async function freshCode(secret) { let w = Math.floor(Date.now() / 30000); if (w <= lastWindow) { await sleep((w + 1) * 30000 - Date.now() + 500); w = Math.floor(Date.now() / 30000); } lastWindow = w; return totp(secret); }
export const jwtClaims = (t) => JSON.parse(Buffer.from(t.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"), "base64").toString());
// ---- pelaporan
mkdirSync("stack-results", { recursive: true });
const tag = process.argv[1].split("/").pop().replace(".mjs", "");
export const results = [];
export function check(name, cond, detail = "") { results.push({ name, ok: !!cond, detail: String(detail).slice(0, 300) }); console.log((cond ? "PASS " : "FAIL ") + name + (cond || !detail ? "" : "  -> " + String(detail).slice(0, 300))); return !!cond; }
export function info(name, data) { results.push({ name, info: data }); console.log("INFO ", name, JSON.stringify(data)); }
export function finish() { const f = results.filter((r) => r.ok === false).length; appendFileSync(`stack-results/${tag}.json`, JSON.stringify({ tag, at: new Date().toISOString(), failed: f, results }, null, 1)); console.log(f ? `GAGAL ${f}` : `SEMUA LULUS (${results.filter((r) => r.ok).length})`); process.exit(f ? 1 : 0); }
export async function mkUser(email, password, meta = {}) { const r = await svc.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: meta }); if (r.error) throw new Error("createUser " + email + ": " + r.error.message); return r.data.user; }
export async function login(email, password) { const c = mk(); const r = await c.auth.signInWithPassword({ email, password }); if (r.error) throw new Error("login " + email + ": " + r.error.message); return { c, session: r.data.session, token: r.data.session.access_token }; }
export async function enrollTotp(c, name = "uji") { const e = await c.auth.mfa.enroll({ factorType: "totp", friendlyName: name + "-" + Math.random().toString(36).slice(2, 7) }); if (e.error) throw new Error("enroll: " + e.error.message); const v = await c.auth.mfa.challengeAndVerify({ factorId: e.data.id, code: await freshCode(e.data.totp.secret) }); if (v.error) throw new Error("verify: " + v.error.message); return { factorId: e.data.id, secret: e.data.totp.secret }; }
export async function elevate(c, factor) { const v = await c.auth.mfa.challengeAndVerify({ factorId: factor.factorId, code: await freshCode(factor.secret) }); if (v.error) throw new Error("elevate: " + v.error.message); const s = await c.auth.getSession(); return s.data.session.access_token; }
export async function fn(name, token, body, extra = {}) { const r = await fetch(`${URL_}/functions/v1/${name}`, { method: "POST", headers: { "Content-Type": "application/json", apikey: ANON, Origin: ORIGIN, ...(token ? { Authorization: "Bearer " + token } : {}), ...extra }, body: JSON.stringify(body) }); let j = null; try { j = await r.json(); } catch {} return { status: r.status, body: j, headers: r.headers }; }
