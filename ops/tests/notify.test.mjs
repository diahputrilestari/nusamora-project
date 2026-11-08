import { handleNotifyDispatch, handleNotifyWebhook, verifySvix, toHtml } from "../../supabase/functions/_shared/notify.ts";
let pass = 0, fail = 0; const ok = (n, c) => { if (c) { pass++; console.log("PASS ", n); } else { fail++; console.log("FAIL ", n); } };
const NOW = 1_800_000_000_000;
function mk(over = {}) {
  const st = { results: [], claims: [], fetches: [], delivery: [], rows: [], settings: { email_from_name: "NusaMora", email_from_address: "info@nusamora.test", email_reply_to: "" }, admin: true, ...over.st };
  const d = { env: { allowedOrigins: ["https://nusamora.com"], dispatchSecret: "rahasia-cron", resendKey: "re_KEY", waToken: "WA_TOKEN", webhookSecret: "whsec_" + btoa("kunci-webhook-uji"), ...over.env },
    async getUser(t) { return t === "tok" ? { id: "u-1" } : null; },
    async rpc(n, a) {
      if (n === "notif_is_admin") return { data: st.admin, error: null };
      if (n === "notif_setting") return { data: st.settings[a.p_key] ?? null, error: null };
      if (n === "notif_enqueue_due") return { data: { subscription_reminders: 0, announcements: 0 }, error: null };
      if (n === "notif_claim") { st.claims.push(a); const take = st.rows.filter((x) => !a.p_channels || a.p_channels.includes(x.channel)).slice(0, 20); st.rows = st.rows.filter((x) => !take.includes(x)); return { data: take, error: null }; }
      if (n === "notif_result") { st.results.push(a); return { data: a.p_ok ? "sent" : a.p_permanent ? "failed" : "pending", error: null }; }
      if (n === "notif_delivery") { st.delivery.push(a); return { data: "ok", error: null }; }
      return { data: { allowed: true }, error: null };
    },
    async fetch(u, i) { st.fetches.push({ u, i }); return over.fetch ? over.fetch(u, i) : new Response(JSON.stringify(u.includes("fonnte") ? { status: true, id: ["wa-1"] } : { id: "msg-1" }), { status: 200 }); }, now: () => NOW, ...over.d };
  return { d, st };
}
const call = (d, body = {}, h = {}) => handleNotifyDispatch(new Request("https://x/f", { method: "POST", headers: { "content-type": "application/json", origin: "https://nusamora.com", ...h }, body: JSON.stringify(body) }), d);
const row = (id, ch, extra = {}) => ({ id, channel: ch, to_address: ch === "email" ? "dina@x.id" : "6281234", subject: ch === "email" ? "Halo" : null, body: "Isi <b>pesan</b>\nbaris 2", ...extra });

let { d, st } = mk(); let r = await call(d, {}); ok("tanpa kredensial -> 401", r.status === 401);
({ d, st } = mk()); r = await call(d, {}, { authorization: "Bearer salah" }); ok("token salah -> 401", r.status === 401);
({ d, st } = mk({ st: { admin: false } })); r = await call(d, {}, { authorization: "Bearer tok" }); ok("bukan admin berhak -> 403 dan tanpa kirim", r.status === 403 && st.fetches.length === 0);
({ d, st } = mk()); r = await call(d, {}, { "x-dispatch-secret": "salah" }); ok("rahasia penjadwal salah -> 401", r.status === 401);
({ d, st } = mk({ env: { dispatchSecret: undefined } })); r = await call(d, {}, { "x-dispatch-secret": "apa-saja" }); ok("rahasia belum diatur di server -> 401 (bukan terbuka)", r.status === 401);
({ d, st } = mk()); r = await call(d, { action: "status" }, { authorization: "Bearer tok" }); let j = await r.json();
ok("status: konfigurasi terbaca tanpa membocorkan kunci", r.status === 200 && j.email.configured && j.whatsapp.configured && j.scheduler_secret && !JSON.stringify(j).includes("re_KEY") && !JSON.stringify(j).includes("WA_TOKEN"));
({ d, st } = mk({ env: { resendKey: undefined } })); r = await call(d, { action: "status" }, { authorization: "Bearer tok" }); j = await r.json(); ok("status: email belum terkonfigurasi bila kunci kosong", j.email.configured === false && j.email.has_key === false);

// kirim email & WA sukses
({ d, st } = mk()); st.rows = [row("a", "email"), row("b", "whatsapp")];
r = await call(d, {}, { "x-dispatch-secret": "rahasia-cron" }); j = await r.json();
ok("run: email dan WA terkirim ke provider, hasil dicatat ok", r.status === 200 && j.claimed === 2 && j.sent === 2 && st.results.length === 2 && st.results.every((x) => x.p_ok === true));
const em = st.fetches.find((f) => f.u.includes("resend")), body = JSON.parse(em.i.body);
ok("email: header Authorization, dari/ke/subjek, teks asli + html ter-escape", em.i.headers.Authorization === "Bearer re_KEY" && body.from === "NusaMora <info@nusamora.test>" && body.to[0] === "dina@x.id" && body.text.includes("<b>pesan</b>") && body.html.includes("&lt;b&gt;pesan&lt;/b&gt;") && !body.html.includes("<b>pesan"));
const wa = st.fetches.find((f) => f.u.includes("fonnte"));
ok("WA: token di header (bukan di body/URL), target & pesan dikirim", wa.i.headers.Authorization === "WA_TOKEN" && wa.i.body.get("target") === "6281234" && !wa.u.includes("WA_TOKEN") && !String(wa.i.body).includes("WA_TOKEN"));
ok("pesan sukses dicatat dengan id provider; tidak ada status delivered di sini", st.results.find((x) => x.p_id === "a").p_message_id === "msg-1" && st.delivery.length === 0);
ok("rahasia tidak ada di respons", !JSON.stringify(j).includes("re_KEY"));

// kegagalan
const failFetch = (status, json) => () => new Response(JSON.stringify(json), { status });
({ d, st } = mk({ fetch: failFetch(422, { message: "Invalid `to` field" }) })); st.rows = [row("c", "email")];
r = await call(d, {}, { authorization: "Bearer tok" }); j = await r.json();
ok("422 dari provider -> galat permanen, tidak diulang", st.results[0].p_ok === false && st.results[0].p_permanent === true && j.failed === 1);
({ d, st } = mk({ fetch: failFetch(500, { message: "oops" }) })); st.rows = [row("d", "email")]; r = await call(d, {}, { authorization: "Bearer tok" }); j = await r.json();
ok("500 -> sementara (diulang)", st.results[0].p_permanent === false && j.retry === 1 && j.failed === 0);
({ d, st } = mk({ fetch: failFetch(429, { message: "rate" }) })); st.rows = [row("e", "email")]; await call(d, {}, { authorization: "Bearer tok" }); ok("429 -> sementara", st.results[0].p_permanent === false);
({ d, st } = mk({ fetch: failFetch(401, { message: "API key invalid" }) })); st.rows = [row("f", "email")]; await call(d, {}, { authorization: "Bearer tok" }); ok("401 kunci salah -> sementara (admin dapat memperbaiki kunci lalu dicoba lagi)", st.results[0].p_permanent === false && st.results[0].p_error.includes("invalid"));
({ d, st } = mk({ fetch: () => { throw new Error("ECONNRESET"); } })); st.rows = [row("g", "email")]; await call(d, {}, { authorization: "Bearer tok" }); ok("jaringan putus -> sementara", st.results[0].p_permanent === false && st.results[0].p_error.startsWith("Jaringan"));
({ d, st } = mk({ fetch: failFetch(200, { status: false, reason: "token invalid" }) })); st.rows = [row("h", "whatsapp")]; await call(d, {}, { authorization: "Bearer tok" }); ok("WA: status false (token) -> bukan terkirim, sementara", st.results[0].p_ok === false && st.results[0].p_permanent === false);
({ d, st } = mk({ fetch: failFetch(200, { status: false, reason: "target invalid number" }) })); st.rows = [row("i", "whatsapp")]; await call(d, {}, { authorization: "Bearer tok" }); ok("WA: nomor tidak valid -> permanen", st.results[0].p_permanent === true);
({ d, st } = mk({ fetch: failFetch(200, { status: true }) })); st.rows = [row("k", "whatsapp")]; await call(d, {}, { authorization: "Bearer tok" }); ok("WA: 200 tanpa id pesan tidak dianggap diterima", st.results[0].p_ok === false);
({ d, st } = mk({ fetch: failFetch(200, {}) })); st.rows = [row("l", "email")]; await call(d, {}, { authorization: "Bearer tok" }); ok("email: 200 tanpa id tidak dianggap diterima", st.results[0].p_ok === false);

// provider belum dikonfigurasi -> tidak diklaim
({ d, st } = mk({ env: { resendKey: undefined } })); st.rows = [row("m", "email")]; r = await call(d, {}, { authorization: "Bearer tok" }); j = await r.json();
ok("email belum dikonfigurasi: pesan email tidak diklaim/diproses (tetap menunggu)", st.claims.every((c) => !c.p_channels.includes("email")) && st.fetches.length === 0 && j.skipped_channels.includes("email"));
({ d, st } = mk({ env: { resendKey: undefined, waToken: undefined } })); r = await call(d, {}, { authorization: "Bearer tok" }); j = await r.json(); ok("tanpa provider sama sekali: nol klaim", st.claims.length === 0 && j.claimed === 0);
({ d, st } = mk({ st: { settings: { email_from_name: "A", email_from_address: "", email_reply_to: "" } } })); st.rows = [row("n", "email")]; await call(d, {}, { authorization: "Bearer tok" }); ok("alamat pengirim kosong: email tidak dikirim", st.fetches.length === 0);
({ d, st } = mk({ st: { settings: { email_from_name: "Evil\r\nBcc: x@y.z", email_from_address: "info@nusamora.test", email_reply_to: "" } } })); st.rows = [row("o", "email", { subject: "Judul\r\nBcc: z@z.z" })]; await call(d, {}, { authorization: "Bearer tok" });
{ const b = JSON.parse(st.fetches[0].i.body); ok("injeksi header di nama pengirim/subjek dinetralkan", !/[\r\n]/.test(b.from) && !/[\r\n]/.test(b.subject)); }
({ d, st } = mk()); st.rows = [row("p", "email", { to_address: null })]; await call(d, {}, { authorization: "Bearer tok" }); ok("alamat kosong -> gagal permanen tanpa memanggil provider", st.fetches.length === 0 && st.results[0].p_permanent === true);
ok("toHtml meng-escape", toHtml("<script>").includes("&lt;script&gt;"));
r = await handleNotifyDispatch(new Request("https://x/f", { method: "OPTIONS", headers: { origin: "https://nusamora.com" } }), mk().d); ok("OPTIONS -> 204 dengan CORS hanya untuk origin diizinkan", r.status === 204 && r.headers.get("access-control-allow-origin") === "https://nusamora.com");
r = await handleNotifyDispatch(new Request("https://x/f", { method: "GET" }), mk().d); ok("GET -> 405", r.status === 405);

// webhook
const secret = "whsec_" + btoa("kunci-webhook-uji");
async function sign(id, ts, body, sec = secret) { const key = await crypto.subtle.importKey("raw", Uint8Array.from(atob(sec.slice(6)), (c) => c.charCodeAt(0)), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]); const m = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${id}.${ts}.${body}`))); let s = ""; for (const x of m) s += String.fromCharCode(x); return "v1," + btoa(s); }
const wh = async (d, ev, o = {}) => { const body = JSON.stringify(ev), ts = String(o.ts ?? NOW / 1000), id = "evt_1"; const sig = o.sig ?? await sign(id, ts, body); return handleNotifyWebhook(new Request("https://x/w", { method: "POST", headers: { "svix-id": id, "svix-timestamp": ts, "svix-signature": sig }, body }), d); };
({ d, st } = mk()); r = await wh(d, { type: "email.delivered", data: { email_id: "msg-1" } });
ok("webhook sah: delivered diteruskan ke notif_delivery", r.status === 200 && st.delivery.length === 1 && st.delivery[0].p_provider_message_id === "msg-1" && st.delivery[0].p_status === "delivered");
({ d, st } = mk()); r = await wh(d, { type: "email.bounced", data: { email_id: "msg-2", bounce: { message: "mailbox penuh" } } }); ok("bounce diteruskan dengan alasan", st.delivery[0].p_status === "bounced" && st.delivery[0].p_error === "mailbox penuh");
({ d, st } = mk()); r = await wh(d, { type: "email.delivered", data: { email_id: "x" } }, { sig: "v1,AAAA" }); ok("tanda tangan salah -> 401, tidak mengubah status", r.status === 401 && st.delivery.length === 0);
({ d, st } = mk()); r = await wh(d, { type: "email.delivered", data: { email_id: "x" } }, { ts: NOW / 1000 - 3600 }); ok("cap waktu kedaluwarsa (replay) -> 401", r.status === 401 && st.delivery.length === 0);
({ d, st } = mk({ env: { webhookSecret: undefined } })); r = await wh(d, { type: "email.delivered", data: { email_id: "x" } }); ok("secret webhook belum diatur -> 401 (bukan terbuka)", r.status === 401 && st.delivery.length === 0);
({ d, st } = mk()); r = await wh(d, { type: "email.opened", data: { email_id: "x" } }); ok("tipe lain diabaikan tanpa mengubah status", r.status === 200 && st.delivery.length === 0);
({ d, st } = mk()); r = await wh(d, { type: "email.delivered", data: { email_id: "x" } }, { sig: await sign("evt_1", String(NOW / 1000), "{}", "whsec_" + btoa("kunci-lain")) }); ok("tanda tangan dari kunci lain ditolak", r.status === 401);
ok("verifySvix menolak input kosong", !(await verifySvix("", "", "", "", "", NOW)));
console.log(fail ? `GAGAL ${fail}` : `SEMUA LULUS (${pass})`); process.exit(fail ? 1 : 0);
