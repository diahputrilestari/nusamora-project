// Memutar ulang notifikasi Midtrans ASLI (payload yang dikirim Midtrans) ke Edge Function staging, TANPA header autentikasi
// (Midtrans tidak mengirim apikey/Authorization). Hanya mencetak kode balasan + jejak; tidak mencetak kunci.
import { readFileSync } from "node:fs";
import { svc, URL_ } from "./lib.mjs";
const body = readFileSync(new URL("./fixtures/midtrans-notif-2.json", import.meta.url), "utf8");
const o = JSON.parse(body).order_id;
for (const [label, headers] of [["tanpa-header (seperti Midtrans)", { "Content-Type": "application/json" }], ["User-Agent ala Midtrans", { "Content-Type": "application/json", "User-Agent": "Midtrans" }]]) {
  const r = await fetch(`${URL_}/functions/v1/midtrans-webhook`, { method: "POST", headers, body });
  const t = await r.text();
  console.log("REPLAY", label, "-> HTTP", r.status, t.slice(0, 200));
}
const tr = await svc.from("security_events").select("at,kind,detail").in("kind", ["webhook_trace", "webhook_bad_signature"]).gte("at", new Date(Date.now() - 10 * 60e3).toISOString()).order("at", { ascending: false }).limit(10);
console.log("REPLAY jejak 10 menit terakhir:", JSON.stringify((tr.data || []).map((e) => ({ at: e.at, kind: e.kind, ...e.detail }))));
const ev = await svc.from("payment_events").select("source,transaction_status,result").eq("order_id", o);
console.log("REPLAY event pembayaran order:", JSON.stringify(ev.data));
