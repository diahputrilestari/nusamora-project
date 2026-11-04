// ===== NM:module music — lagu latar (mp3) dari database `invitations/{id}.musicUrl`, tombol mute di pojok kanan atas Live Guest =====
document.head.appendChild(Object.assign(document.createElement('style'),{textContent:`
#nmmute{position:absolute;z-index:6;top:calc(10px + env(safe-area-inset-top));right:calc(10px + env(safe-area-inset-right));width:38px;height:38px;border-radius:50%;border:1px solid var(--nm-line);background:var(--nm-white);color:var(--nm-ink);display:flex;align-items:center;justify-content:center;padding:0;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.2);-webkit-tap-highlight-color:transparent;transition:transform .15s,opacity .2s}
#nmmute:active{transform:scale(.92)}#nmmute svg{width:20px;height:20px;display:block}
#nmmute:focus-visible{outline:3px solid var(--nm-focus,var(--nm-accent));outline-offset:2px}
#nmmute.nomusic{opacity:.55}
#nmmute .nm-wave{transform-origin:left center;animation:nmWv 1.4s ease-in-out infinite}#nmmute.playing .nm-wave{animation-play-state:running}#nmmute:not(.playing) .nm-wave{animation:none}
@keyframes nmWv{0%,100%{opacity:1}50%{opacity:.45}}
#oc{right:calc(56px + env(safe-area-inset-right))!important}
@media(orientation:landscape) and (max-height:520px){#nmmute{top:calc(6px + env(safe-area-inset-top));width:32px;height:32px}#nmmute svg{width:17px;height:17px}#oc{right:calc(50px + env(safe-area-inset-right))!important}}
#nmtoast{position:absolute;z-index:7;top:calc(58px + env(safe-area-inset-top));right:calc(10px + env(safe-area-inset-right));max-width:min(280px,calc(100vw - 24px));padding:9px 13px;border-radius:12px;background:var(--hud-bg2,rgba(30,30,70,.92));color:var(--hud-on,#fff);font:500 12.5px/1.4 var(--nm-sans);opacity:0;transform:translateY(-6px);pointer-events:none;transition:.25s}
#nmtoast.on{opacity:1;transform:none}
.dmus .dig{grid-template-columns:1fr}
`}));
const NMMUS=(()=>{
 const DEFAULT_TRACK={url:'audio/we-are.mp3',title:'We Are — Moavii',credit:'Music provided by Free To Use · freetouse.com'},KEY='nm:mute',au=new Audio();au.loop=true;au.preload='none';au.volume=.55;au.setAttribute('playsinline','');
 let url='',muted=false,liveOn=false,wantPlay=false,unlockBound=false,toastT=0;
 try{muted=localStorage.getItem(KEY)==='1'}catch(e){}
 const ICON=m=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z" fill="currentColor" fill-opacity=".15"/>${m?'<path d="M16 9.5l5 5M21 9.5l-5 5"/>':'<path class="nm-wave" d="M15.5 9a4.2 4.2 0 0 1 0 6"/><path class="nm-wave" d="M18 6.5a7.6 7.6 0 0 1 0 11"/>'}</svg>`;
 // hanya https / blob artifact / data audio; tolak skema lain (javascript:, http:, dsb)
 const ok=u=>typeof u==='string'&&/^(audio\/[A-Za-z0-9._-]{1,80}\.(mp3|ogg|wav|m4a)|https:\/\/[^\s"'<>]{4,1000}|\/_blob\/[A-Za-z0-9_-]{4,80}|data:audio\/(mpeg|mp3|ogg|wav|webm|mp4|aac);base64,[A-Za-z0-9+\/=]+)$/.test(u.trim());
 const btn=()=>{let b=document.getElementById('nmmute');if(!b){const l=document.getElementById('live');if(!l)return null;b=document.createElement('button');b.id='nmmute';b.type='button';b.className='h';b.onclick=toggle;l.appendChild(b);
  const t=document.createElement('div');t.id='nmtoast';t.setAttribute('role','status');l.appendChild(t)}return b};
 function toast(m){const t=document.getElementById('nmtoast');if(!t)return;t.textContent=m;t.classList.add('on');clearTimeout(toastT);toastT=setTimeout(()=>t.classList.remove('on'),3200)}
 function paint(){const b=btn();if(!b)return;b.innerHTML=ICON(muted||!url);b.classList.toggle('nomusic',!url);b.classList.toggle('playing',!!url&&!muted&&!au.paused);
  b.setAttribute('aria-pressed',String(muted));b.setAttribute('aria-label',!url?'Musik latar belum diatur':muted?'Nyalakan musik latar':'Matikan musik latar');b.title=b.getAttribute('aria-label')+(url===DEFAULT_TRACK.url?' · ♪ '+DEFAULT_TRACK.title:'')}
 function bindUnlock(){if(unlockBound)return;unlockBound=true;const f=()=>{unlockBound=false;['pointerdown','keydown','touchend'].forEach(e=>document.removeEventListener(e,f,true));if(wantPlay)tryPlay()};['pointerdown','keydown','touchend'].forEach(e=>document.addEventListener(e,f,true))}
 function tryPlay(){if(!url||muted||!liveOn||document.hidden){paint();return}
  const p=au.play();if(p&&p.catch)p.then(paint).catch(()=>{bindUnlock();paint()});else paint()}
 function stop(){try{au.pause()}catch(e){}paint()}
 function toggle(){if(!url){toast('Belum ada musik latar. Pemilik undangan dapat menambahkannya di Dashboard.');return}
  muted=!muted;try{localStorage.setItem(KEY,muted?'1':'0')}catch(e){}au.muted=muted;if(muted)stop();else{wantPlay=true;tryPlay()}paint()}
 function setSrc(u){u=ok(u)?u.trim():'';if(u===url)return;url=u;
  if(!url){wantPlay=false;stop();au.removeAttribute('src');try{au.load()}catch(e){}paint();return}
  au.src=url;au.load();wantPlay=true;if(liveOn)tryPlay();paint()}
 const source=()=>{let u=(typeof INVDATA!=='undefined'&&INVDATA&&INVDATA.musicUrl)||'';if(!u){try{u=JSON.parse(localStorage.getItem('nm:music:'+curInv)||'null')||''}catch(e){}}return u||DEFAULT_TRACK.url};
 function sync(){const l=document.getElementById('live'),on=!!l&&l.classList.contains('on');btn();
  if(on!==liveOn){liveOn=on;if(on){wantPlay=!!url;tryPlay()}else stop()}
  setSrc(source())}
 au.addEventListener('error',()=>{if(url){toast('Musik latar tidak dapat diputar. Periksa tautan mp3 di Dashboard.');paint()}});
 au.addEventListener('play',paint);au.addEventListener('pause',paint);
 document.addEventListener('visibilitychange',()=>{if(document.hidden){try{au.pause()}catch(e){}paint()}else if(liveOn&&wantPlay)tryPlay()});
 const l=document.getElementById('live');if(l)new MutationObserver(sync).observe(l,{attributes:true,attributeFilter:['class']});
 setInterval(sync,1500);
 return{sync,ok,get url(){return url},get isDefault(){return url===DEFAULT_TRACK.url},audio:au,toast}})();

// ---- Dashboard: kartu "Musik Latar" ----
function nmMusicForm(){if($('#dmusic'))return;const base=$('#didform');if(!base)return;const d=document.createElement('div');d.id='dmusic';d.className='did dmus';
 d.innerHTML=`<h2 class="serif">Musik Latar</h2><p class="sub">Tautan file mp3 yang diputar di Live Guest. Disimpan di database undangan (<code>musicUrl</code>), jadi setiap tamu mendengar lagu yang sama. Gunakan tautan <b>https</b> langsung ke file mp3 (mis. dari folder public hosting Anda). Bila dikosongkan, diputar lagu bawaan <b>We Are — Moavii</b> (Music provided by Free To Use · <a href="https://freetouse.com" target="_blank" rel="noopener">freetouse.com</a>).</p>
 <div class="dig"><label>Tautan mp3<input id="dmu" type="url" inputmode="url" maxlength="800" autocomplete="off" placeholder="https://contoh.com/lagu.mp3"></label></div>
 <div class="row" style="justify-content:flex-start;margin-top:12px"><button class="btn g" id="dmt" type="button">▶ Coba putar</button><button class="btn" id="dms" type="button">Simpan Musik</button><button class="btn g" id="dmx" type="button">Hapus Musik</button></div><div class="dmsg" id="dmm" role="status"></div>`;
 base.after(d);const msg=(t,bad)=>{const m=$('#dmm');m.textContent=t;m.className='dmsg'+(bad?' bad':'')},inp=$('#dmu');
 inp.value=NMMUS.isDefault?'':(NMMUS.url||'');
 $('#dmt').onclick=()=>{const u=inp.value.trim();if(!NMMUS.ok(u)){msg('Tautan harus diawali https:// dan mengarah ke file audio.',1);return}const a=new Audio(u);a.volume=.5;a.play().then(()=>{msg('Berhasil diputar (pratinjau 5 detik).');setTimeout(()=>a.pause(),5000)}).catch(()=>msg('Tidak dapat memutar tautan ini. Pastikan mengarah langsung ke file mp3 dan dapat diakses publik.',1))};
 const save=async u=>{const f={musicUrl:u};
  if(!DBH){try{localStorage.setItem('nm:music:'+curInv,JSON.stringify(u))}catch(e){}if(typeof INVDATA!=='undefined')INVDATA=Object.assign({},INVDATA||{},f);NMMUS.sync();msg('Tersimpan lokal (database tidak tersedia).',1);return}
  try{const ref=DBH.doc('invitations/'+curInv),snap=await ref.get(),x=snap.exists?snap.data():null;
   if(x&&x.ownerId&&UID&&x.ownerId!==UID&&!ISADMIN){msg('Undangan ini dimiliki pelanggan lain.',1);return}
   const now=Date.now();if(x)await ref.update(Object.assign({updatedAt:now,updatedBy:UID||null},f));else await ref.set(Object.assign({title:curInv,ownerId:UID||null,createdAt:now,updatedAt:now,updatedBy:UID||null},f));
   try{localStorage.removeItem('nm:music:'+curInv)}catch(e){}INVDATA=Object.assign({},INVDATA||{},f);NMMUS.sync();msg(u?'Musik tersimpan. Live Guest akan memutarnya.':'Musik dihapus. Lagu bawaan diputar kembali.')}
  catch(e){msg('Gagal menyimpan ('+(e&&e.code||'error')+'). Anda mungkin tidak punya izin menulis.',1)}};
 $('#dms').onclick=()=>{const u=inp.value.trim();if(!NMMUS.ok(u)){msg('Tautan harus diawali https:// dan mengarah ke file audio.',1);return}save(u)};
 $('#dmx').onclick=()=>{inp.value='';save('')}}
{const _r=nmRenderForm;nmRenderForm=function(){_r.apply(this,arguments);nmMusicForm();const i=$('#dmu');if(i&&document.activeElement!==i&&NMMUS.url&&!NMMUS.isDefault&&!i.value)i.value=NMMUS.url}}
nmMusicForm();
