// Uji Midtrans SANDBOX terhadap Edge Functions hosted staging. MODE=pay (otomatis, berhenti dengan tautan bayar) | MODE=verify (setelah Anda membayar manual).
// Env tambahan: MIDTRANS_SERVER_KEY (Server Key SANDBOX, hanya untuk menghitung signature uji & membaca status), MODE.
import { createHash } from "node:crypto";
import { check, info, finish, mk, svc, mkUser, login, fn, URL_, ANON, env } from "./lib.mjs";
const MODE = process.env.MODE || "pay", SK = env("MIDTRANS_SERVER_KEY"), PW = "Uji-Sandi-Panjang#2026";
// Pengaman: kunci harus diterima oleh API SANDBOX Midtrans (kunci Production ditolak dengan 401). Tidak bergantung pada awalan kunci.
{ const pr = await fetch("https://api.sandbox.midtrans.com/v2/nm-probe-" + Date.now() + "/status", { headers: { Accept: "application/json", Authorization: "Basic " + Buffer.from(SK + ":").toString("base64") } });
  const pj = await pr.json().catch(() => ({}));
  if (String(pj.status_code) === "401" || pr.status === 401) { console.error("Server Key DITOLAK oleh API Sandbox Midtrans (kemungkinan kunci Production atau salah). Dihentikan."); process.exit(2); }
  if (String(pj.status_code) !== "404") { console.error("Respons tak terduga dari Sandbox Midtrans: " + pr.status + " " + JSON.stringify(pj).slice(0, 120)); process.exit(2); }
  console.log("Server Key diterima oleh API Sandbox Midtrans (probe: order tidak ada = 404, wajar)."); }
const sha512 = (s) => createHash("sha512").update(s).digest("hex");
const SIGK = process.env.MIDTRANS_SIGNATURE_KEY || SK;   // kunci untuk menghitung signature uji (Signature Secret Key bila akun memakainya)
const sig = (o, s, g) => sha512(o + s + g + SIGK);
const hook = async (body) => { const r = await fetch(`${URL_}/functions/v1/midtrans-webhook`, { method: "POST", headers: { "Content-Type": "application/json", apikey: ANON }, body: JSON.stringify(body) }); let j = null; try { j = await r.json(); } catch {} return { status: r.status, body: j }; };
const mstatus = async (order) => (await fetch(`https://api.sandbox.midtrans.com/v2/${order}/status`, { headers: { Accept: "application/json", Authorization: "Basic " + Buffer.from(SK + ":").toString("base64") } })).json();
const EMAIL = (n) => `${n}@uji.nusamora.test`;

if (MODE === "pay") {
  const stamp = Date.now().toString(36), em = EMAIL("mid." + stamp), em2 = EMAIL("mid2." + stamp);
  const u = await mkUser(em, PW), u2 = await mkUser(em2, PW);
  const inv = await svc.from("invitations").insert({ user_id: u.id, title: "Uji Midtrans " + stamp, category: "wedding", slug: "uji-" + stamp, event_date: "2027-01-15", status: "draft",
    content: { names: { a: "Andi", b: "Sari" }, event: { start: "10:00", venue: "Gedung Uji" }, photos: { cover: "https://example.test/cover.webp", gallery: [] }, design2d: { palette: "rose" } } }).select().single();
  check("data uji: undangan lengkap dibuat", !inv.error, inv.error?.message);
  const A = await login(em, PW), B = await login(em2, PW);

  let r = await fn("midtrans-checkout", null, { invitation_id: inv.data.id, plan_id: "essential" });
  check("checkout tanpa token -> 401", r.status === 401, r.status);
  r = await fn("midtrans-checkout", A.token, { invitation_id: inv.data.id, plan_id: "platinum" });
  check("checkout paket tidak dikenal -> 400", r.status === 400, r.status);
  r = await fn("midtrans-checkout", B.token, { invitation_id: inv.data.id, plan_id: "essential" });
  check("pengguna lain tak bisa checkout undangan orang lain -> 404", r.status === 404, r.status + " " + JSON.stringify(r.body));
  r = await fn("midtrans-checkout", A.token, { invitation_id: inv.data.id, plan_id: "essential", amount: 1, gross_amount: 1 });
  check("checkout sah -> 200 dengan tautan Snap SANDBOX", r.status === 200 && /^https:\/\/app\.sandbox\.midtrans\.com\//.test(r.body?.redirect_url || ""), r.status + " " + JSON.stringify(r.body)?.slice(0, 200));
  const order = r.body?.order_id; if (!order) { finish(); }
  check("harga ditentukan server (79000), bukan dari klien (amount:1 diabaikan)", Number(r.body.amount) === 79000, r.body.amount);
  const r2 = await fn("midtrans-checkout", A.token, { invitation_id: inv.data.id, plan_id: "essential" });
  check("checkout ulang memakai ulang transaksi yang sama (tidak membuat ganda)", r2.status === 200 && r2.body?.reuse === true && r2.body.order_id === order, JSON.stringify(r2.body)?.slice(0, 160));
  const pay = (await svc.from("payments").select("status,amount,plan_id").eq("order_id", order).single()).data;
  check("DB: pembayaran pending dengan harga dari server", pay?.status === "pending" && Number(pay.amount) === 79000, JSON.stringify(pay));

  let w = await hook({ order_id: order, status_code: "200", gross_amount: "79000.00", transaction_status: "settlement", signature_key: "0".repeat(128) });
  check("webhook signature salah -> 401", w.status === 401, w.status);
  w = await hook({ order_id: "bukan valid!", status_code: "200", gross_amount: "1", signature_key: "x" });
  check("webhook order_id tidak valid -> 401", w.status === 401, w.status);
  w = await hook({ order_id: order, status_code: "200", gross_amount: "79000.00", transaction_status: "settlement", signature_key: sig(order, "200", "79000.00") });
  info("webhook 'settlement' palsu dengan signature VALID (tetapi belum dibayar)", { status: w.status, body: w.body });
  const after = (await svc.from("payments").select("status").eq("order_id", order).single()).data;
  check("settlement palsu TIDAK mengubah status (status diverifikasi ke Midtrans, bukan dari isi notifikasi)", after?.status === "pending", JSON.stringify(after));
  const c = await fn("midtrans-checkout", B.token, { action: "cancel", order_id: order });
  check("pengguna lain tak bisa membatalkan pembayaran orang lain -> 404", c.status === 404, c.status);
  const sy = await fn("midtrans-sync", A.token, { order_id: order });
  check("sync sebelum dibayar -> tetap pending", sy.status === 200 && sy.body?.status === "pending", JSON.stringify(sy.body));

  console.log("\n===== LANGKAH MANUAL =====");
  console.log("ORDER_ID: " + order + "  |  email uji: " + em);
  console.log("Buka tautan pembayaran SANDBOX ini, bayar dengan kartu uji, lalu jalankan phase midtrans-verify:");
  console.log("PAY_URL: " + r.body.redirect_url);
  console.log("Kartu uji (Sandbox): 4811 1111 1111 1114, exp 12/30, CVV 123, OTP 112233");
  console.log("==========================");
  finish();
} else {
  // verify: cari pembayaran uji terbaru
  const pays = (await svc.from("payments").select("order_id,status,user_id,invitation_id,amount,created_at").order("created_at", { ascending: false }).limit(20)).data || [];
  const users = new Map(); for (const p of pays) { const g = await svc.auth.admin.getUserById(p.user_id); users.set(p.user_id, g.data?.user?.email || ""); }
  const mine = pays.find((p) => /^mid\.[a-z0-9]+@uji\.nusamora\.test$/.test(users.get(p.user_id) || ""));
  if (!mine) { console.error("Tidak ada pembayaran uji ditemukan. Jalankan phase midtrans-pay dulu."); process.exit(2); }
  const order = mine.order_id, email = users.get(mine.user_id); info("pembayaran uji", { order, statusSebelumSync: mine.status });
  const ms = await mstatus(order); info("status di Midtrans Sandbox", { transaction_status: ms.transaction_status, status_code: ms.status_code, gross_amount: ms.gross_amount, payment_type: ms.payment_type });
  check("Midtrans mencatat transaksi lunas (settlement/capture)", ["settlement", "capture"].includes(ms.transaction_status), ms.transaction_status + " " + ms.status_message);
  const ev0 = (await svc.from("payment_events").select("source,transaction_status,result").eq("order_id", order)).data || [];
  info("event pembayaran sebelum sync", ev0);
  { const since = new Date(Date.now() - 6 * 3600e3).toISOString();
    const r = await svc.from("security_events").select("kind,at,detail").eq("kind", "webhook_bad_signature").gte("at", since).order("at", { ascending: false }).limit(20);
    if (r.error) info("DIAGNOSTIK: gagal membaca security_events", { error: r.error.message });
    else info("DIAGNOSTIK: webhook ber-signature salah tercatat 6 jam terakhir (>0 = Midtrans MENGIRIM tetapi ditolak 401)", { jumlah: r.data.length, terbaru: r.data.slice(0, 5).map((e) => ({ at: e.at, ...e.detail })) }); }
  { const t = await svc.from("security_events").select("at,detail").eq("kind", "webhook_trace").gte("at", new Date(Date.now() - 6 * 3600e3).toISOString()).order("at", { ascending: false }).limit(20);
    info("JEJAK webhook yang diterima fungsi (6 jam terakhir; http = balasan fungsi)", t.error ? { error: t.error.message } : (t.data || []).filter((e) => e.detail?.order === order).map((e) => ({ at: e.at, ...e.detail }))); }
  const viaWebhook = ev0.some((e) => e.source === "webhook" && ["settlement", "capture"].includes(e.transaction_status));
  check("webhook Midtrans -> Edge Function benar-benar diterima (Notification URL dikonfigurasi benar)", viaWebhook, viaWebhook ? "ya" : "TIDAK: periksa Notification URL di dashboard Sandbox");
  const A = await login(email, PW);
  const sy = await fn("midtrans-sync", A.token, { order_id: order });
  check("sync -> status paid", sy.status === 200 && sy.body?.status === "paid", JSON.stringify(sy.body));
  const p = (await svc.from("payments").select("status,paid_at,payment_type,midtrans_status").eq("order_id", order).single()).data;
  check("DB: pembayaran paid + data Midtrans tercatat", p?.status === "paid" && !!p.paid_at, JSON.stringify(p));
  const i = (await svc.from("invitations").select("status,expires_at,plan_id").eq("id", mine.invitation_id).single()).data;
  const days = i?.expires_at ? Math.round((new Date(i.expires_at) - Date.now()) / 864e5) : null;
  check("undangan aktif dengan masa berlaku 90 hari (paket Essential)", i?.status === "aktif" && days >= 89 && days <= 90, JSON.stringify({ ...i, days }));
  const inv = (await svc.from("invoices").select("status").eq("midtrans_order_id", order).single()).data; check("invoice lunas", inv?.status === "lunas", JSON.stringify(inv));
  const s0 = (await svc.from("subscriptions").select("id").eq("user_id", mine.user_id)).data?.length;
  const exp0 = i.expires_at;
  // idempotensi: kirim ulang notifikasi bertanda tangan sah berkali-kali dan paralel
  const body = { order_id: order, status_code: ms.status_code, gross_amount: ms.gross_amount, transaction_status: ms.transaction_status, signature_key: sig(order, ms.status_code, ms.gross_amount) };
  const rs = await Promise.all([hook(body), hook(body), hook(body), hook(body)]);
  check("notifikasi ganda (paralel x4) semuanya 200", rs.every((x) => x.status === 200), JSON.stringify(rs.map((x) => x.body?.result)));
  const s1 = (await svc.from("subscriptions").select("id").eq("user_id", mine.user_id)).data?.length;
  const i1 = (await svc.from("invitations").select("expires_at").eq("id", mine.invitation_id).single()).data;
  check("idempotensi: langganan tidak bertambah & masa berlaku tidak diperpanjang", s1 === s0 && i1.expires_at === exp0, `langganan ${s0}->${s1}`);
  const cx = await fn("midtrans-checkout", A.token, { action: "cancel", order_id: order });
  check("pembatalan setelah lunas tidak mengubah status (tetap paid)", cx.status === 200 && cx.body?.status === "paid", JSON.stringify(cx.body));
  finish();
}
