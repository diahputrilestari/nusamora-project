// ===== NM:module orientation — Live Guest wajib landscape: kunci otomatis bila didukung, overlay "putar perangkat" bila tidak =====
document.head.appendChild(Object.assign(document.createElement('style'),{textContent:`
#nmrot{position:fixed;inset:0;z-index:99999;display:none;align-items:center;justify-content:center;padding:24px;box-sizing:border-box;text-align:center;background:color-mix(in srgb,var(--nm-ivory) 94%,transparent);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);color:var(--nm-ink);font-family:var(--nm-sans)}
html.nm-rot #nmrot{display:flex}
#nmrot .nr-c{max-width:340px;display:flex;flex-direction:column;align-items:center;gap:14px}
#nmrot svg{width:92px;height:92px;color:var(--nm-accent)}#nmrot .nr-ph{transform-origin:50% 50%;animation:nrRot 2.6s ease-in-out infinite}
@keyframes nrRot{0%,18%{transform:rotate(0)}55%,82%{transform:rotate(-90deg)}100%{transform:rotate(0)}}
#nmrot h2{margin:0;font:600 clamp(26px,7vw,34px)/1.1 var(--nm-serif);color:var(--nm-deep)}#nmrot p{margin:0;font-size:14px;line-height:1.55;color:var(--nm-mute)}
#nmrot button{min-height:44px;padding:0 22px;border-radius:var(--nm-btnr);border:1px solid var(--nm-accent);background:var(--nm-accent);color:var(--nm-onaccent);font:600 13px var(--nm-sans);letter-spacing:var(--nm-btnls);text-transform:var(--nm-btnt);cursor:pointer}
#nmrot button[hidden]{display:none}
@media(prefers-reduced-motion:reduce){#nmrot .nr-ph{animation:none;transform:rotate(-90deg)}}
`}));
const NMO=(()=>{const live=$('#live'),root=document.documentElement,el=document.createElement('div');el.id='nmrot';el.setAttribute('role','alertdialog');el.setAttribute('aria-live','assertive');el.setAttribute('aria-labelledby','nmrot-t');
 el.innerHTML='<div class="nr-c"><svg viewBox="0 0 96 96" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><g class="nr-ph"><rect x="30" y="12" width="36" height="72" rx="7"/><path d="M44 77h8"/></g><path d="M80 30c4 5 6 10 6 16M80 30l-1 8M80 30l8 1" opacity=".55"/></svg><h2 id="nmrot-t">Putar perangkat Anda</h2><p id="nmrot-p"></p><button type="button" hidden>Kunci mode landscape</button></div>';document.body.appendChild(el);
 const btn=el.querySelector('button'),pt=el.querySelector('#nmrot-p');let fsByUs=false,lastBlock=null,compact=false;
 const isLive=()=>live.classList.contains('on'),portrait=()=>innerHeight>innerWidth,touch=()=>matchMedia('(pointer:coarse)').matches,canLock=()=>touch()&&!!(screen.orientation&&screen.orientation.lock);
 async function lock(){if(!touch())return false;try{if(!document.fullscreenElement&&document.documentElement.requestFullscreen){await document.documentElement.requestFullscreen();fsByUs=true}if(screen.orientation&&screen.orientation.lock){await screen.orientation.lock('landscape');return true}}catch(e){}return false}
 function release(){try{screen.orientation&&screen.orientation.unlock&&screen.orientation.unlock()}catch(e){}if(fsByUs&&document.fullscreenElement)document.exitFullscreen().catch(()=>{});fsByUs=false}
 const resize=()=>{[60,350].forEach(t=>setTimeout(()=>{if(typeof rs==='function'&&isLive())try{rs()}catch(e){}},t))};
 function update(){const blk=isLive()&&portrait();root.classList.toggle('nm-rot',blk);el.hidden=false;live.inert=blk;
  pt.textContent=touch()?'Live Guest dirancang untuk mode landscape. Putar perangkat ke posisi horizontal untuk melanjutkan.':'Live Guest dirancang untuk layar landscape. Perlebar jendela browser atau putar perangkat untuk melanjutkan.';btn.hidden=!(blk&&canLock());
  const short=isLive()&&!portrait()&&innerHeight<520;if(short&&!compact){compact=true;try{window.setChatCollapsed&&setChatCollapsed(true);const m=$('#map');m&&m.classList.add('c')}catch(e){}}else if(!short)compact=false;
  if(lastBlock!==blk){lastBlock=blk;if(isLive())resize()}}
 btn.onclick=async()=>{await lock();update()};
 addEventListener('resize',()=>{update();resize()});addEventListener('orientationchange',()=>{setTimeout(update,80);resize()});if(window.visualViewport)visualViewport.addEventListener('resize',update);
 try{matchMedia('(orientation:portrait)').addEventListener('change',()=>{update();resize()})}catch(e){}
 document.addEventListener('fullscreenchange',()=>{if(!document.fullscreenElement)fsByUs=false});
 new MutationObserver(()=>{const on=isLive();if(on){update();resize()}else{release();update()}}).observe(live,{attributes:true,attributeFilter:['class']});
 update();return{lock,release,update}})();
