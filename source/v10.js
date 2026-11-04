// ===== v10: sidebar ringkas, semi-transparan, state aktif jelas, ikon konsisten, tanpa menu ganda =====
document.head.appendChild(Object.assign(document.createElement('style'),{textContent:`
#map{top:46px;left:10px;width:auto!important;padding:4px!important;background:rgba(22,20,52,.5)!important;border:1px solid rgba(255,255,255,.16)!important;border-radius:16px!important;backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);box-shadow:0 6px 20px rgba(0,0,0,.18)}
#map .ml{margin-top:2px}
#map .nv,#map #mt{display:flex!important;align-items:center;gap:8px;width:100%;margin:0 0 2px;padding:6px 11px 6px 8px;background:transparent!important;border:0!important;border-radius:11px;color:rgba(255,255,255,.88);font:600 12px Inter,system-ui,sans-serif;text-align:left;white-space:nowrap;backdrop-filter:none!important;position:relative;cursor:pointer;transition:background .15s,color .15s}
#map .nv:hover,#map #mt:hover{background:rgba(255,255,255,.16)!important;color:#fff}
#map .nv:focus-visible,#map #mt:focus-visible{outline:2px solid #f6c453;outline-offset:1px}
#map .nv.on{background:#f6c453!important;color:#2b2150;box-shadow:0 2px 10px rgba(246,196,83,.45)}
#map .nv.on::before{content:'';position:absolute;left:-7px;top:22%;bottom:22%;width:3px;border-radius:3px;background:#f6c453}
#map .ic{flex:none;display:block}#map .sep{height:1px;background:rgba(255,255,255,.2);margin:4px 6px}
#map #mt{font-weight:700;letter-spacing:.2px}#map #mt .chev{margin-left:auto;transition:transform .2s}#map.c #mt .chev{transform:rotate(-90deg)}
@media(max-width:700px){#map .tx{display:none}#map .nv{justify-content:center;padding:8px}#map #mt{justify-content:center;padding:8px}#map #mt .chev{display:none}}
`}));
(function(){const nv=$('#nav');if(nv)nv.remove();
const IC={menu:'M4 7h16M4 12h16M4 17h16',stage:'M4 20h16M6 20V10M18 20V10M3 10c0-4 4-7 9-7s9 3 9 7zM10 20v-5h4v5',resepsi:'M3 17h18M5 17a7 7 0 0 1 14 0M12 10V7M10 7h4',booth:'M4 8h3l2-2h6l2 2h3v11H4zM12 17a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z',galeri:'M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4M9 9.5h.01',video:'M3 6h13v12H3zM16 10l5-3v10l-5-3',buku:'M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3zM5 17a3 3 0 0 1 3-3h11',kuliner:'M7 3v8M5 3v5a2 2 0 0 0 4 0V3M7 11v10M17 3c-2 2-2.5 5-2.5 8h2.5v10',istirahat:'M5 11V8a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v3M3 13a2 2 0 0 1 4 0v2h10v-2a2 2 0 0 1 4 0v5H3zM6 18v2M18 18v2',lokasi:'M12 21s-6-5.5-6-10a6 6 0 0 1 12 0c0 4.5-6 10-6 10zM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',story:'M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.6-7 10-7 10z',chev:'M6 9l6 6 6-6'};
const LB={stage:'Panggung',resepsi:'Resepsi',booth:'Booth',galeri:'Galeri',video:'Video',buku:'Buku Tamu',kuliner:'Kuliner',istirahat:'Istirahat',lokasi:'Lokasi',story:'Story'};
const svg=(k,c)=>`<svg class="ic${c?' '+c:''}" viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${IC[k]}"/></svg>`;
const ml=$('#ml');ml.innerHTML='';
const add=(id,full,fn)=>{const b=document.createElement('button');b.className='nv';b.dataset.id=id;b.title=full;b.setAttribute('aria-label',full);b.innerHTML=svg(id)+'<span class="tx">'+LB[id]+'</span>';b.onclick=fn;ml.appendChild(b)};
['stage','resepsi','booth','galeri','video','buku','kuliner','istirahat'].forEach(id=>{const a=AREAS.find(a=>a.id==id);if(a)add(id,a.n,()=>goArea(id))});
const sp=document.createElement('div');sp.className='sep';ml.appendChild(sp);
add('lokasi','Lokasi Acara',()=>loc());add('story','Story Cinta',()=>story());
const mt=$('#mt');mt.className='';mt.setAttribute('aria-label','Menu navigasi');mt.innerHTML=svg('menu')+'<span class="tx">Menu</span>'+svg('chev','chev');
new MutationObserver(()=>{Array.from(ml.children).forEach(c=>{if(!c.classList.contains('nv')&&!c.classList.contains('sep'))c.remove()})}).observe(ml,{childList:true});
window.setNavActive=id=>{window.curNav=id;ml.querySelectorAll('.nv').forEach(b=>{const on=b.dataset.id==id;b.classList.toggle('on',on);if(on)b.setAttribute('aria-current','true');else b.removeAttribute('aria-current')})};
})();
{const ga=goArea;goArea=function(id){setNavActive(id);return ga.apply(this,arguments)};
const wr=(n,id)=>{const f=window[n];};
const g0=gallery;gallery=function(){setNavActive('galeri');return g0.apply(this,arguments)};
const v0=videos;videos=function(){setNavActive('video');return v0.apply(this,arguments)};
const b0=book;book=function(){setNavActive('buku');return b0.apply(this,arguments)};
const l0=loc;loc=function(){setNavActive('lokasi');return l0.apply(this,arguments)};
const s0=story;story=function(){setNavActive('story');return s0.apply(this,arguments)};
const c0=closeM;closeM=function(){if(window.curNav=='lokasi'||window.curNav=='story')setNavActive(null);return c0.apply(this,arguments)};
setInterval(()=>{const id=window.curNav;if(!id||id=='lokasi'||id=='story'||typeof P==='undefined'||!P||auto)return;const a=AREAS.find(a=>a.id==id);if(a&&Math.hypot(P.g.position.x-a.x,P.g.position.z-a.z)>2.6)setNavActive(null)},400)}
