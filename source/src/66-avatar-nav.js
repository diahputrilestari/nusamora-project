// ===== NM:module avatar-nav — tombol kiri/kanan (+ panah keyboard & geser) untuk memilih avatar lain =====
document.head.appendChild(Object.assign(document.createElement('style'),{textContent:`
#avw{display:flex;align-items:center;justify-content:center;gap:10px;width:100%;max-width:min(900px,100%);margin:0 auto}
#avw #avs{flex:1 1 auto;min-width:0;margin:0;flex-wrap:nowrap;justify-content:center}#avc{text-align:center;font:600 12px var(--nm-sans);letter-spacing:.12em;color:var(--nm-mute);margin:2px 0 4px}
.avn{flex:none;width:46px;height:46px;border-radius:50%;border:1px solid var(--nm-accent);background:var(--nm-white);color:var(--nm-accent);font:600 22px/1 var(--nm-sans);cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;box-shadow:0 2px 8px rgba(0,0,0,.14);transition:transform .15s,background .15s,color .15s;-webkit-tap-highlight-color:transparent}
.avn:hover{background:var(--nm-accent);color:var(--nm-onaccent)}.avn:active{transform:scale(.92)}
.avn:focus-visible{outline:3px solid var(--nm-focus,var(--nm-accent));outline-offset:2px}
@media(max-width:520px){.avn{width:38px;height:38px;font-size:18px}#avw{gap:6px}}
@media(orientation:landscape) and (max-height:520px){.avn{width:36px;height:36px;font-size:17px}}
`}));
// tampilan pilih avatar: maksimal 3 kartu sekaligus (avatar terpilih di tengah); panah kiri/kanan menggeser ke avatar lain

function rAv(){const L=AV[S.g],n=L.length;if(!(S.i>=0&&S.i<n))S.i=0;
 const k=Math.min(3,n),off=k<3?0:-1,idx=[];for(let j=0;j<k;j++)idx.push(k<3?j:((S.i+off+j)%n+n)%n);
 $('#avs').innerHTML=idx.map(i=>`<div class="av ${i==S.i?'sel':''}" data-i="${i}" role="button" tabindex="0" aria-label="${NA[S.g][i]}">${svg(L[i])}<small>${NA[S.g][i]}</small></div>`).join('');
 $('#avs').querySelectorAll('.av').forEach(e=>{const pick=()=>{S.i=+e.dataset.i;rAv()};e.onclick=pick;e.onkeydown=ev=>{if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();pick()}}});
 $('#gL').className='btn '+(S.g=='L'?'on':'g');$('#gP').className='btn '+(S.g=='P'?'on':'g');
 const c=document.getElementById('avc');if(c)c.textContent=(S.i+1)+' / '+n;
 document.querySelectorAll('.avn').forEach(b=>b.style.visibility=n>1?'':'hidden')}
(function(){
 const avs=document.getElementById('avs');if(!avs||document.getElementById('avw'))return;
 const w=document.createElement('div');w.id='avw';avs.parentNode.insertBefore(w,avs);
 const mk=(d,t,c)=>{const b=document.createElement('button');b.type='button';b.className='avn';b.dataset.d=d;b.textContent=c;b.setAttribute('aria-label',t);return b};
 const L=mk(-1,'Avatar sebelumnya','‹'),R=mk(1,'Avatar berikutnya','›');
 w.append(L,avs,R);
 const cn=document.createElement('div');cn.id='avc';cn.setAttribute('aria-live','polite');w.parentNode.insertBefore(cn,w.nextSibling);
 // pilih avatar sebelumnya/berikutnya (berputar), sama efeknya dengan mengklik kartu
 function step(d){const n=AV[S.g].length;if(!n)return;S.i=((+S.i||0)+d+n)%n;rAv()}
 L.onclick=()=>step(-1);R.onclick=()=>step(1);
 document.addEventListener('keydown',e=>{if(e.key!=='ArrowLeft'&&e.key!=='ArrowRight')return;
  if(!document.getElementById('s1').classList.contains('on'))return;
  const t=e.target;if(t&&/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))return;
  e.preventDefault();step(e.key==='ArrowLeft'?-1:1)});
 // geser horizontal di area avatar
 let x0=null,y0=0;avs.addEventListener('touchstart',e=>{const t=e.touches[0];x0=t.clientX;y0=t.clientY},{passive:true});
 avs.addEventListener('touchend',e=>{if(x0==null)return;const t=e.changedTouches[0],dx=t.clientX-x0,dy=t.clientY-y0;x0=null;if(Math.abs(dx)>50&&Math.abs(dx)>Math.abs(dy)*1.5)step(dx<0?1:-1)},{passive:true});
})();

rAv();
