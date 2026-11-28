// Uji Edge handler after-sales A: aksi "renew" pada midtrans-checkout dan data refund dari Status API diteruskan ke apply_payment.
import { handleCheckout, handleSync } from "../../supabase/functions/_shared/handlers.ts";
let pass = 0, fail = 0; const ok = (n, c) => { if (c) { pass++; console.log("PASS ", n); } else { fail++; console.log("FAIL ", n); } };
const UUID = "11111111-2222-4333-8444-555555555555";
const mk = (prep, o = {}) => {
  const calls = [], snaps = [];
  const d = {
    env: { serverKey: "SB-Mid-server-TEST", isProd: false, allowedOrigins: ["https://nusamora.com"] },
    fetch: async (url, init) => { snaps.push({ url: String(url), body: init?.body ? JSON.parse(init.body) : null }); return new Response(JSON.stringify({ token: "tok", redirect_url: "https://app.sandbox.midtrans.com/snap/x" })); },
    async getUser(t) { return t === "u-own" ? { id: "user-own" } : null; }, async ownsOrder() { return null; },
    async rpc(n, a) { calls.push({ n, a }); if (n === "rl_hit") return { data: { allowed: true }, error: null }; if (n === "prepare_renewal" || n === "prepare_checkout") return { data: prep, error: null }; return { data: null, error: null }; },
    ...o,
  };
  return { d, calls, snaps };
};
const rq = (b, tok = "u-own") => new Request("https://x/f/midtrans-checkout", { method: "POST", headers: { "content-type": "application/json", origin: "https://nusamora.com", authorization: "Bearer " + tok }, body: JSON.stringify(b) });
const okPrep = { ok: true, reuse: false, kind: "renewal", order_id: "NM261128000000ABCDEF", amount: 79000, plan_id: "essential", plan_name: "Essential", duration_days: 90, title: "Undangan", email: "a@b.test", name: "A" };

// 1. renew memanggil prepare_renewal dengan user dari JWT, bukan dari body; harga dari database
let m = mk(okPrep);
let r = await handleCheckout(rq({ action: "renew", invitation_id: UUID, plan_id: "essential", amount: 1, user_id: "orang-lain" }), m.d);
let j = await r.json();
const pc = m.calls.find((c) => c.n === "prepare_renewal");
ok("renew -> prepare_renewal dengan user dari JWT", r.status === 200 && pc && pc.a.p_user === "user-own" && pc.a.p_invitation === UUID && !m.calls.some((c) => c.n === "prepare_checkout"));
const snap = m.snaps.find((s) => s.url.includes("/snap/v1/transactions"));
ok("Snap: jumlah dari database (bukan dari klien) dan nama item 'Perpanjangan'", snap && snap.body.transaction_details.gross_amount === 79000 && snap.body.item_details[0].name.startsWith("Perpanjangan NusaMora Essential") && j.order_id === okPrep.order_id);

// 2. publish biasa tetap memakai prepare_checkout tanpa label perpanjangan
m = mk({ ...okPrep, kind: undefined });
r = await handleCheckout(rq({ invitation_id: UUID, plan_id: "essential" }), m.d);
ok("checkout biasa tetap prepare_checkout", r.status === 200 && m.calls.some((c) => c.n === "prepare_checkout") && !m.snaps.find((s) => s.url.includes("/snap/"))?.body.item_details[0].name.startsWith("Perpanjangan"));

// 3. penolakan dari database dipetakan ke pesan yang jelas, tanpa memanggil Midtrans
for (const [err, code] of [["upgrade_belum_didukung", 409], ["tidak_dapat_diperpanjang", 409], ["ada_pembayaran_tertunda", 409], ["tidak_ditemukan", 404]]) {
  m = mk({ ok: false, error: err });
  r = await handleCheckout(rq({ action: "renew", invitation_id: UUID, plan_id: "luxe" }), m.d); j = await r.json();
  ok(`renew ditolak: ${err} -> ${code}`, r.status === code && j.error === err && typeof j.message === "string" && m.snaps.length === 0);
}

// 4. tanpa login / invitation_id tidak valid
m = mk(okPrep);
r = await handleCheckout(rq({ action: "renew", invitation_id: UUID, plan_id: "essential" }, "palsu"), m.d);
ok("renew tanpa sesi valid -> 401", r.status === 401 && !m.calls.some((c) => c.n === "prepare_renewal"));
r = await handleCheckout(rq({ action: "renew", invitation_id: "bukan-uuid", plan_id: "essential" }), m.d);
ok("renew dengan invitation_id tidak valid -> 400", r.status === 400 && !m.calls.some((c) => c.n === "prepare_renewal"));

// 5. refund sebagian: refund_amount dari Status API diteruskan ke apply_payment (tanpa data pribadi)
const applied = [];
const sd = {
  env: { serverKey: "SB-Mid-server-TEST", isProd: false, allowedOrigins: ["https://nusamora.com"] },
  fetch: async () => new Response(JSON.stringify({ order_id: "NM-123456", transaction_status: "partial_refund", status_code: "200", gross_amount: "149000.00", payment_type: "qris", transaction_id: "T1",
    refund_amount: "50000.00", refunds: [{ refund_chargeback_id: 1, refund_amount: "50000.00", created_at: "2026-11-28 10:00:00", reason: "Nama Pelanggan minta", refund_key: "rk1", bank_confirmed_at: null }] })),
  async getUser(t) { return { id: t }; }, async ownsOrder() { return { status: "paid" }; }, canSyncAll: async () => true,
  async rpc(n, a) { if (n === "apply_payment") applied.push(a); return { data: n === "rl_hit" ? { allowed: true } : { result: "applied", status: "partially_refunded" }, error: null }; },
};
r = await handleSync(new Request("https://x/f/midtrans-sync", { method: "POST", headers: { "content-type": "application/json", origin: "https://nusamora.com", authorization: "Bearer adm" }, body: JSON.stringify({ order_id: "NM-123456", admin: true }) }), sd);
const pl = applied[0]?.p_payload;
ok("refund_amount & refunds diteruskan ke apply_payment", pl && pl.refund_amount === "50000.00" && pl.refunds.length === 1 && pl.refunds[0].refund_amount === "50000.00");
ok("alasan refund (teks bebas) tidak ikut disimpan", pl && !("reason" in pl.refunds[0]));

console.log(`\n${pass} lulus, ${fail} gagal`); process.exit(fail ? 1 : 0);
