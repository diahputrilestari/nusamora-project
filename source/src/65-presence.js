// ===== NM:module presence — jumlah tamu yang sedang membuka undangan (pojok kanan atas Live Guest) =====
document.head.appendChild(Object.assign(document.createElement('style'),{textContent:`
#oc{top:calc(10px + env(safe-area-inset-top))!important;right:calc(10px + env(safe-area-inset-right))!important;left:auto!important;bottom:auto!important;display:flex;align-items:center;gap:6px;white-space:nowrap;z-index:6}
@media(orientation:landscape) and (max-height:520px){#oc{top:calc(6px + env(safe-area-inset-top))!important;padding:5px 11px;font-size:12px}}
`}));
// hitung palsu lama (412 acak) dimatikan; angka kini dari presence nyata
function tw(){}
const NMPR=(()=>{let room=null,unsub=null,live=false,last=1;
 const cnt=()=>document.getElementById('cnt'),oc=()=>document.getElementById('oc');
 const show=n=>{last=n;const c=cnt();if(c)c.textContent=n;const o=oc();if(o)o.title=room?'Tamu yang sedang membuka undangan ini':'Mode lokal: hanya Anda'};
 const count=ps=>{let n=0;(ps||[]).forEach(p=>{if(p.kind==='agent')return;const q=p.presence||{};if(q.live&&q.inv===curInv)n++});return Math.max(1,n)};
 const set=on=>{if(!room)return;try{room.presence(on?{live:1,inv:curInv}:{live:null,inv:null}).catch(()=>{})}catch(e){}};
 async function init(){try{if(window.claude&&claude.use)room=await claude.use('room')}catch(e){room=null}
  if(!room){show(1);return}
  try{unsub=room.onPeers(ch=>show(count(ch.peers)),()=>{room=null;show(1)})}catch(e){room=null;show(1);return}
  if(live)set(true)}
 function sync(){const l=document.getElementById('live');const on=!!l&&l.classList.contains('on');if(on===live)return;live=on;set(on);if(!on)return;show(room?count(room.peers()):1)}
 const l=document.getElementById('live');if(l)new MutationObserver(sync).observe(l,{attributes:true,attributeFilter:['class']});
 window.addEventListener('pagehide',()=>set(false));
 // undangan berganti (dashboard) -> perbarui presence & hitungan
 setInterval(()=>{if(live&&room){set(true);show(count(room.peers()))}},5000);
 show(1);init();return{show,count}})();
