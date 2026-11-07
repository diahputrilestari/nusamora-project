import { handleCheckout, handleSync, handleWebhook } from "../../supabase/functions/_shared/handlers.ts";
let pass=0,fail=0; const ok=(n,c)=>{ if(c){pass++;console.log("PASS ",n)}else{fail++;console.log("FAIL ",n)} };
const counters=new Map(), events=[]; let rlDown=false, getUserCalls=0;
const mkDeps=(over={})=>({ env:{serverKey:"SB-Mid-server-TEST",isProd:false,allowedOrigins:["https://nusamora.com"]}, fetch:async()=>new Response("{}"),
  async getUser(t){getUserCalls++; return t.startsWith("tok-")?{id:t.slice(4)}:null}, async ownsOrder(){return null},
  async rpc(name,a){ if(rlDown&&name==="rl_hit")return {data:null,error:{message:"db down"}};
    if(name==="rl_hit"){ const c=(counters.get(a.p_key)||0)+1; counters.set(a.p_key,c); return {data: c>a.p_limit?{allowed:false,retry_after:42}:{allowed:true}, error:null}; }
    if(name==="log_security_event"){events.push(a);return {data:null,error:null}} return {data:null,error:null}; }, ...over });
const req=(url,body,h={})=>new Request("https://x.supabase.co/functions/v1/"+url,{method:"POST",headers:{"content-type":"application/json",origin:"https://nusamora.com",...h},body:JSON.stringify(body)});
const cancel={action:"cancel",order_id:"NM-123456"};
// 1. batas per pengguna 20/10 menit
let codes=[]; for(let i=0;i<24;i++){ const r=await handleCheckout(req("midtrans-checkout",cancel,{authorization:"Bearer tok-userA","cf-connecting-ip":"1.1.1.1"}),mkDeps()); codes.push(r.status); }
ok("20 permintaan pertama diproses (404 = pesanan tak ada), sisanya 429", codes.slice(0,20).every(c=>c===404) && codes.slice(20).every(c=>c===429));
const r429=await handleCheckout(req("midtrans-checkout",cancel,{authorization:"Bearer tok-userA","cf-connecting-ip":"1.1.1.1"}),mkDeps());
const j=await r429.json();
ok("429: header Retry-After, kode error, pesan Indonesia, tanpa cache", r429.headers.get("retry-after")==="42"&&j.error==="terlalu_banyak_permintaan"&&/Terlalu banyak/.test(j.message)&&r429.headers.get("cache-control")==="no-store");
ok("429: CORS untuk origin yang diizinkan (agar browser bisa membaca pesan)", r429.headers.get("access-control-allow-origin")==="https://nusamora.com");
// 2. pengguna lain dari IP yang sama tidak terkena batas pengguna A (batas IP longgar)
const rB=await handleCheckout(req("midtrans-checkout",cancel,{authorization:"Bearer tok-userB","cf-connecting-ip":"1.1.1.1"}),mkDeps());
ok("pengguna B di IP yang sama (WiFi bersama) tetap dilayani", rB.status===404);
// 3. banjir tanpa token dari satu IP: dihentikan sebelum memanggil Auth
counters.clear(); getUserCalls=0; codes=[];
for(let i=0;i<130;i++){ const r=await handleCheckout(req("midtrans-checkout",cancel,{authorization:"Bearer salah","cf-connecting-ip":"9.9.9.9"}),mkDeps()); codes.push(r.status); }
ok("tanpa token: 120 pertama 401, sisanya 429", codes.slice(0,120).every(c=>c===401)&&codes.slice(120).every(c=>c===429));
ok("setelah batas IP, Auth tidak lagi dipanggil (hemat & lindungi Auth)", getUserCalls===120);
// 4. IP berbeda tidak saling memengaruhi
const rOther=await handleCheckout(req("midtrans-checkout",cancel,{authorization:"Bearer salah","cf-connecting-ip":"8.8.8.8"}),mkDeps()); ok("IP lain tidak terblokir",rOther.status===401);
// 5. gagal-buka bila database limiter bermasalah
rlDown=true; const rd=await handleCheckout(req("midtrans-checkout",cancel,{authorization:"Bearer tok-userC","cf-connecting-ip":"2.2.2.2"}),mkDeps()); rlDown=false;
ok("limiter error -> permintaan tetap dilayani (fail-open)", rd.status===404);
// 6. sync
counters.clear(); codes=[]; for(let i=0;i<33;i++){ const r=await handleSync(req("midtrans-sync",{order_id:"NM-123456"},{authorization:"Bearer tok-userS"}),mkDeps()); codes.push(r.status); }
ok("sync: 30 pertama 404, berikutnya 429", codes.slice(0,30).every(c=>c===404)&&codes.slice(30).every(c=>c===429));
// 7. webhook signature palsu dicatat (maks 5/10 menit/IP), tetap 401, tanpa rahasia di event
counters.clear(); events.length=0; codes=[];
for(let i=0;i<12;i++){ const r=await handleWebhook(req("midtrans-webhook",{order_id:"NM-123456",status_code:"200",gross_amount:"100000.00",signature_key:"palsu".padEnd(128,"0")},{"cf-connecting-ip":"6.6.6.6"}),mkDeps()); codes.push(r.status); }
ok("webhook palsu selalu 401", codes.every(c=>c===401));
ok("kejadian dicatat paling banyak 5 (anti banjir log)", events.length===5&&events[0].p_kind==="webhook_bad_signature");
ok("event tidak memuat signature/Server Key", !JSON.stringify(events).includes("palsu")&&!JSON.stringify(events).includes("SB-Mid"));
ok("kunci limiter ter-hash (tanpa IP/ID mentah)", [...counters.keys()].every(k=>!k.includes("6.6.6.6")&&!k.includes("userA")));
// 8. webhook valid tetapi API status Midtrans belum mengenali order: order NM -> 503 (dikirim ulang), order asing -> 200
{ const sha=async t=>Array.from(new Uint8Array(await crypto.subtle.digest("SHA-512",new TextEncoder().encode(t)))).map(x=>x.toString(16).padStart(2,"0")).join("");
  const wh=async oid=>{ const b={order_id:oid,status_code:"200",gross_amount:"79000.00",transaction_status:"capture"}; b.signature_key=await sha(oid+"200"+"79000.00"+"SB-Mid-server-TEST");
    return handleWebhook(req("midtrans-webhook",b,{"cf-connecting-ip":"7.7.7.7"}),mkDeps({fetch:async()=>new Response(JSON.stringify({status_code:"404"}))})); };
  const a=await wh("NM2611070454432778D8"); ok("webhook valid + status belum tersedia (order NM) -> 503 agar Midtrans kirim ulang", a.status===503);
  const b=await wh("XYZ-ORDER-LAIN"); ok("order bukan milik NusaMora -> tetap 200", b.status===200); }
console.log(fail?`GAGAL ${fail}`:`SEMUA LULUS (${pass})`); process.exit(fail?1:0);
