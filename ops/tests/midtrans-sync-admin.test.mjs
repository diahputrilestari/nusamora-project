import { handleSync } from "../../supabase/functions/_shared/handlers.ts";
let pass=0,fail=0; const ok=(n,c)=>{ if(c){pass++;console.log("PASS ",n)}else{fail++;console.log("FAIL ",n)} };
const applied=[]; let mid=0;
const mk=(o={})=>({ env:{serverKey:"SB-Mid-server-TEST",isProd:false,allowedOrigins:["https://nusamora.com"]},
  fetch:async()=>{mid++; return new Response(JSON.stringify({order_id:"NM-123456",transaction_status:"settlement",status_code:"200",gross_amount:"149000.00",payment_type:"qris",transaction_id:"T1"}))},
  async getUser(t){return {id:t}}, async ownsOrder(){return {status:"paid"}},
  async rpc(n,a){ if(n==="apply_payment")applied.push(a); return {data:{result:"applied",status:"paid"},error:null}; }, ...o });
const rq=(b)=>new Request("https://x/f/midtrans-sync",{method:"POST",headers:{"content-type":"application/json",origin:"https://nusamora.com",authorization:"Bearer u1"},body:JSON.stringify(b)});
let r=await handleSync(rq({order_id:"NM-123456"}),mk()); ok("pelanggan: status sudah akhir -> tidak menghubungi Midtrans",(await r.json()).status==="paid"&&mid===0);
r=await handleSync(rq({order_id:"NM-123456",admin:true}),mk()); ok("admin tanpa izin ditolak 403",r.status===403&&mid===0);
r=await handleSync(rq({order_id:"NM-123456",admin:true}),mk({canSyncAll:async()=>false})); ok("izin ditolak -> 403",r.status===403);
r=await handleSync(rq({order_id:"NM-123456",admin:true}),mk({canSyncAll:async()=>true})); const j=await r.json();
ok("admin berizin: status diverifikasi ke Midtrans lalu diterapkan lewat apply_payment (sumber sync)",r.status===200&&mid===1&&applied.length===1&&applied[0].p_source==="sync"&&j.verified===true);
console.log(`\n${pass} lulus, ${fail} gagal`); process.exit(fail?1:0);
