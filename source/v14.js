// ===== v14: Dynamic Couple Identity — nama, inisial, monogram & tema dari data undangan =====
document.head.appendChild(Object.assign(document.createElement('link'),{rel:'stylesheet',href:'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;1,600&family=Cinzel:wght@500;600&display=swap'}));
const NMDEF='romantic-garden',NMSANS='Inter,system-ui,sans-serif';
const NMTH={
 'romantic-garden':{n:'Romantic Garden',font:'"Cormorant Garamond",Georgia,serif',it:1,paper:'#FFF9F5',ink:'#7A3550',accent:'#C76A86',gold:'#C9A45C',leaf:'#86A981',hbg:'rgba(255,250,246,.92)',hline:'#EBCFD3',motif:'garden'},
 'sakura':{n:'Sakura',font:'"Playfair Display",Georgia,serif',it:1,paper:'#FFF4F7',ink:'#8A3E5E',accent:'#E58BAE',gold:'#D9A9B8',leaf:'#F4B8CC',hbg:'rgba(255,244,247,.92)',hline:'#F3CAD8',motif:'sakura'},
 'luxury-gold':{n:'Luxury Gold',font:'Cinzel,"Times New Roman",serif',it:0,paper:'#1F1B16',ink:'#EFD79A',accent:'#C9A24A',gold:'#D4AF37',leaf:'#D4AF37',hbg:'rgba(28,24,20,.9)',hline:'#8A6F2F',motif:'gold'},
 'indian-royal':{n:'Indian Royal',font:'Cinzel,"Times New Roman",serif',it:0,paper:'#5A1428',ink:'#F6E0A6',accent:'#E2B455',gold:'#E2B455',leaf:'#B8405C',hbg:'rgba(84,18,38,.92)',hline:'#B98A3C',motif:'royal'},
 'rustic-boho':{n:'Rustic Boho',font:'"Cormorant Garamond",Georgia,serif',it:1,paper:'#F6EBDD',ink:'#7A4B34',accent:'#B5694B',gold:'#C79A62',leaf:'#8A9A6B',hbg:'rgba(247,238,225,.93)',hline:'#E0C9AC',motif:'boho'},
 'modern-minimal':{n:'Modern Minimal',font:'"Playfair Display",Georgia,serif',it:0,paper:'#FFFFFF',ink:'#262626',accent:'#262626',gold:'#9B9B9B',leaf:'#9B9B9B',hbg:'rgba(255,255,255,.94)',hline:'#DADADA',motif:'minimal'}};
const NMTITLE=/^(dr|dra|drg|drs|ir|prof|h|hj|ns|kh|raden|rd)\.?$/i;
const nmClean=s=>String(s==null?'':s).replace(/\s+/g,' ').trim().slice(0,60);
function nmCap(w){return w&&(w==w.toLowerCase()||w==w.toUpperCase())&&w.length>1?w.charAt(0).toLocaleUpperCase()+w.slice(1).toLocaleLowerCase():w}
function nmFirst(s){const t=nmClean(s).split(' ').filter(Boolean);while(t.length>1&&NMTITLE.test(t[0]))t.shift();return nmCap((t[0]||'').replace(/[,.;]+$/,''))}
const nmIni=w=>w?Array.from(w)[0].toLocaleUpperCase():'';
function nmSlugNames(sl){const t=String(sl||'').split(/[-_]+/).filter(Boolean);if(t.length==2)return[t[0],t[1]];if(t.length==3&&/^(dan|and|n|x|weds)$/i.test(t[1]))return[t[0],t[2]];return null}
function nmNames(gf,bf,order){const g=nmFirst(gf),b=nmFirst(bf),it=order=='bride'?[b,g]:[g,b],f=it.filter(Boolean);return{g,b,pair:f.join(' & '),mono:f.map(nmIni),tag:f.map(w=>w.replace(/[^\p{L}\p{N}]/gu,'')).join('')}}
let NMID={groom:'',bride:'',groomFull:'',brideFull:'',pair:'',mono:[],tag:'',order:'groom',theme:NMDEF,derived:false};
function nmCompute(){const src=Object.assign({},LS('ident:'+curInv)||{},INVDATA||{});let gf=nmClean(src.groomName),bf=nmClean(src.brideName),der=false;
 if(!gf&&!bf){const p=nmSlugNames(curInv);if(p){gf=nmCap(p[0]);bf=nmCap(p[1]);der=true}}
 const order=src.nameOrder=='bride'?'bride':'groom',n=nmNames(gf,bf,order);
 return{groom:n.g,bride:n.b,groomFull:gf,brideFull:bf,pair:n.pair,mono:n.mono,tag:n.tag,order,theme:NMTH[src.theme]?src.theme:NMDEF,derived:der}}
const nmN=k=>{try{return NMID[k]||(k=='groom'?'Mempelai Pria':'Mempelai Wanita')}catch(e){return k=='groom'?'Mempelai Pria':'Mempelai Wanita'}};
const nmPair=()=>{try{return NMID.pair}catch(e){return''}};
const nmFor=()=>{const p=nmPair();return p?' untuk '+esc(p):''};
// ---- gambar monogram (satu fungsi untuk header, papan, medali, pratinjau dashboard) ----
function nmLeaf(x,px,py,a,l,w,col){x.save();x.translate(px,py);x.rotate(a);x.beginPath();x.ellipse(0,0,l,w,0,0,6.2832);x.fillStyle=col;x.fill();x.restore()}
function nmBlossom(x,px,py,r,col,ctr){for(let i=0;i<5;i++){x.save();x.translate(px,py);x.rotate(i*1.2566);x.beginPath();x.ellipse(0,-r*.62,r*.42,r*.62,0,0,6.2832);x.fillStyle=col;x.fill();x.restore()}x.beginPath();x.arc(px,py,r*.22,0,6.2832);x.fillStyle=ctr;x.fill()}
function nmDrawMono(x,S,th,mono){const c=S/2,R=S*.46,lw=Math.max(1,S*.012),P=Math.PI*2;
 x.beginPath();x.arc(c,c,R,0,P);x.fillStyle=th.paper;x.fill();x.lineWidth=lw;x.strokeStyle=th.accent;x.stroke();
 const at=(r,i,n,o)=>{const a=i/n*P+(o||0);return[c+Math.cos(a)*r,c+Math.sin(a)*r,a]};
 switch(th.motif){
  case'garden':for(let i=0;i<20;i++){const[px,py,a]=at(R*.905,i,20);nmLeaf(x,px,py,a+Math.PI/2+(i%2?.55:-.55),S*.032,S*.012,th.leaf)}for(let i=0;i<6;i++){const[px,py]=at(R*.905,i,6,.52);x.beginPath();x.arc(px,py,S*.024,0,P);x.fillStyle=th.accent;x.fill();x.beginPath();x.arc(px,py,S*.01,0,P);x.fillStyle=th.paper;x.fill()}break;
  case'sakura':for(let i=0;i<6;i++){const[px,py]=at(R*.9,i,6,-.5);nmBlossom(x,px,py,S*.05,th.accent,th.gold)}for(let i=0;i<12;i++){const[px,py]=at(R*.9,i,12,-.5+.26);x.beginPath();x.arc(px,py,S*.011,0,P);x.fillStyle=th.leaf;x.fill()}break;
  case'gold':x.beginPath();x.arc(c,c,R*.94,0,P);x.strokeStyle=th.gold;x.lineWidth=lw*.6;x.stroke();for(let i=0;i<48;i++){const[a1,b1,a]=at(R*.86,i,48),[a2,b2]=at(R*.9,i,48);x.beginPath();x.moveTo(a1,b1);x.lineTo(a2,b2);x.stroke()}for(let i=0;i<4;i++){const[px,py,a]=at(R*.9,i,4);x.save();x.translate(px,py);x.rotate(Math.PI/4);x.fillStyle=th.gold;x.fillRect(-S*.022,-S*.022,S*.044,S*.044);x.restore()}break;
  case'royal':x.strokeStyle=th.gold;x.lineWidth=lw*.8;for(let i=0;i<28;i++){const[px,py]=at(R*.98,i,28);x.beginPath();x.arc(px,py,S*.026,0,P);x.stroke()}for(let i=0;i<12;i++){const[px,py,a]=at(R*.86,i,12);nmLeaf(x,px,py,a+Math.PI/2,S*.034,S*.014,th.leaf);nmLeaf(x,px,py,a+Math.PI/2,S*.016,S*.007,th.gold)}break;
  case'boho':for(let k=0;k<2;k++){for(let i=0;i<9;i++){const t=-1.1+i/8*2.2,a=(k?-Math.PI/2:Math.PI/2)+t,r=R*.9,px=c+Math.cos(a)*r,py=c+Math.sin(a)*r;nmLeaf(x,px,py,a+Math.PI/2+(i%2?.7:-.7),S*.036,S*.013,i%3?th.leaf:th.accent)}}for(let i=0;i<4;i++){const[px,py]=at(R*.9,i,4,Math.PI/4*0+.0);x.beginPath();x.arc(px,py,S*.011,0,P);x.fillStyle=th.gold;x.fill()}break;
  default:x.beginPath();x.arc(c,c,R*.93,0,P);x.strokeStyle=th.gold;x.lineWidth=lw*.6;x.stroke()}
 x.beginPath();x.arc(c,c,R*.76,0,P);x.strokeStyle=th.gold;x.lineWidth=Math.max(.8,S*.006);x.stroke();
 const fs=S*.27,fi=(th.it?'italic ':'')+'600 ',L=mono.length?mono:null;x.textBaseline='alphabetic';
 if(!L){x.font=fi+(S*.3)+'px '+th.font;x.fillStyle=th.gold;x.textAlign='center';x.fillText('&',c,c+S*.1);return}
 x.font=fi+fs+'px '+th.font;const w=L.map(t=>x.measureText(t).width);let am=0;x.font='italic 600 '+(S*.16)+'px '+th.font;if(L.length>1)am=x.measureText('&').width;
 const gap=L.length>1?S*.03:0,tot=w[0]+(L.length>1?gap*2+am+w[1]:0);let px=c-tot/2;const by=c+fs*.33;x.textAlign='left';
 x.font=fi+fs+'px '+th.font;x.fillStyle=th.ink;x.fillText(L[0],px,by);
 if(L.length>1){x.font='italic 600 '+(S*.16)+'px '+th.font;x.fillStyle=th.gold;x.fillText('&',px+w[0]+gap,by-fs*.06);x.font=fi+fs+'px '+th.font;x.fillStyle=th.ink;x.fillText(L[1],px+w[0]+gap*2+am,by)}}
// ---- elemen dekoratif venue (sprite Three.js: medali monogram di lengkung pelaminan) ----
const NMC={medal:null,spr:[]};
function nmCanv(){if(!NMC.medal){NMC.medal=document.createElement('canvas');NMC.medal.width=NMC.medal.height=512}}
function nmDrawScene(){nmCanv();const th=NMTH[NMID.theme];nmDrawMono(NMC.medal.getContext('2d'),512,th,NMID.mono);const m=NMC.medal.getContext('2d');

 if(NMC.medal.t)NMC.medal.t.needsUpdate=true}
const NMPOS={medal:{x:0,y:21.4,z:-40.6,w:7.2}};
const _ill14=illustrate;illustrate=function(){const r=_ill14();nmCanv();nmDrawScene();NMC.spr.forEach(s=>sc.remove(s));NMC.spr=[];
  [['medal',NMC.medal]].forEach(([k,c])=>{const p=NMPOS[k],s=spr(c,p.w,p.w*c.height/c.width,p.x,p.y,p.z);s.name='nm-'+k;sc.add(s);NMC.spr.push(s)});return r};
// ---- header "The Wedding of …" + teks UI + label avatar ----
document.head.appendChild(Object.assign(document.createElement('style'),{textContent:`
#idh{top:8px;left:50%;transform:translateX(-50%);display:flex;align-items:center;gap:10px;max-width:min(540px,calc(100vw - 340px));padding:5px 20px 5px 6px;border-radius:999px;background:var(--hbg);border:1px solid var(--hline);color:var(--hink);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);pointer-events:none;font-family:var(--hfont)}
#idh canvas{width:44px;height:44px;flex:none;display:block}#idh .idt{min-width:0;display:flex;flex-direction:column;gap:3px}
#idh small{font:600 9.5px/1 ${NMSANS};letter-spacing:.2em;text-transform:uppercase;color:var(--hacc)}
#idh b{font:600 24px/1.1 var(--hfont);font-style:var(--hit);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;letter-spacing:.01em}
#idh[data-len=l] b{font-size:19px}#idh[data-len=xl] b{font-size:15.5px}
#hint{top:66px}
@media(max-width:700px){#idh{max-width:calc(100vw - 20px);padding:4px 16px 4px 5px;gap:8px}#idh canvas{width:34px;height:34px}#idh small{font-size:8px}#idh b{font-size:17px;white-space:normal;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;line-height:1.08}#idh[data-len=l] b{font-size:15px}#idh[data-len=xl] b{font-size:13px}}
.did{background:var(--card,#fff);border:1px solid var(--line,#eadcd8);border-radius:18px;padding:18px 20px;margin:0 0 18px}.did h2{margin:0 0 2px;font-size:22px;color:var(--wine)}.did .sub{margin:0 0 14px}
.dig{display:grid;grid-template-columns:1fr 1fr 170px;gap:12px}.dig label,.did .lbl{display:flex;flex-direction:column;gap:5px;font-size:12px;font-weight:600;color:var(--mute,#8a7a7a)}
.dig input,.dig select{font:inherit;font-weight:400;font-size:14px;padding:10px 14px;border-radius:12px;border:1px solid var(--line,#eadcd8);background:#fff;color:var(--ink);width:100%;box-sizing:border-box}
.idth{display:grid;grid-template-columns:repeat(auto-fill,minmax(108px,1fr));gap:10px;margin:12px 0 4px}
.idtb{display:flex;flex-direction:column;align-items:center;gap:6px;padding:10px 6px;border-radius:14px;border:2px solid var(--line,#eadcd8);background:#fff;cursor:pointer;font:600 11px ${NMSANS};color:var(--ink)}.idtb canvas{width:56px;height:56px}.idtb[aria-checked=true]{border-color:var(--wine,#c76a86)}.idtb:focus-visible{outline:2px solid var(--wine,#c76a86);outline-offset:2px}
.idpv{display:flex;align-items:center;gap:12px;margin:12px 0;padding:10px 14px;border-radius:14px;background:rgba(0,0,0,.035)}.idpv canvas{width:64px;height:64px;flex:none}.idpv small{display:block;font:600 10px ${NMSANS};letter-spacing:.18em;text-transform:uppercase;color:var(--mute,#8a7a7a)}.idpv b{font-size:22px;font-weight:600}
@media(max-width:700px){.dig{grid-template-columns:1fr}.did{padding:16px}}
`}));
const NMLB=()=>{};
function nmHeader(){let h=$('#idh');if(!h){h=document.createElement('div');h.id='idh';h.className='h';h.setAttribute('role','banner');h.innerHTML='<canvas width="88" height="88" aria-hidden="true"></canvas><div class="idt"><small></small><b></b></div>';$('#live').appendChild(h)}
 const th=NMTH[NMID.theme],s=h.style;s.setProperty('--hbg',th.hbg);s.setProperty('--hline',th.hline);s.setProperty('--hink',th.ink);s.setProperty('--hacc',th.accent);s.setProperty('--hfont',th.font);s.setProperty('--hit',th.it?'italic':'normal');
 const t=NMID.pair||'Wedding Celebration',full=[NMID.groomFull,NMID.brideFull];h.querySelector('small').textContent=NMID.pair?'The Wedding of':'Live Guest';h.querySelector('b').textContent=t;
 h.title=NMID.order=='bride'?full.slice().reverse().filter(Boolean).join(' & '):full.filter(Boolean).join(' & ');h.dataset.len=t.length>30?'xl':t.length>20?'l':'';
 h.setAttribute('aria-label',(NMID.pair?'The Wedding of ':'')+t);const cv=h.querySelector('canvas'),x=cv.getContext('2d');x.clearRect(0,0,88,88);nmDrawMono(x,88,th,NMID.mono)}
function nmTexts(){const p=NMID.pair;document.title=p?p+' · Wedding Live Guest':'Wedding Live Guest';
 const a=$('#s1 .serif'),b=$('#s1 .sub');if(a)a.textContent=p?'💍 '+p+' · Undangan Digital Interaktif':'💍 Undangan Digital Interaktif';if(b)b.textContent=p?'Masuk ke pernikahan virtual '+p+' sebagai tamu spesial':'Masuk ke pernikahan virtual sebagai tamu spesial';
 if(typeof ents!=='undefined'){const ce=coupleEnts();if(ce[0])coupleLabel(ce[0],nmN('bride')+' · Mempelai Wanita');if(ce[1])coupleLabel(ce[1],nmN('groom')+' · Mempelai Pria')}}
function applyIdentity(){try{NMID=nmCompute();nmHeader();nmTexts();nmDrawScene();nmRenderForm()}catch(e){console.warn('identity',e)}}
const nmSync=applyIdentity;
// ---- dashboard pelanggan: form identitas + pilihan tema + pratinjau langsung ----
let NMDR=null,NMDRINV=null,NMDIRTY=false;
function nmDraftNames(){return nmNames(NMDR.g,NMDR.b,NMDR.o)}
function nmBuildForm(){if($('#didform'))return;const w=$('.dwrap'),body=$('#dbody');if(!w||!body)return;const d=document.createElement('div');d.id='didform';d.className='did';
 d.innerHTML=`<h2 class="serif">Identitas Pasangan</h2><p class="sub">Nama, inisial, dan monogram tampil otomatis di header serta dekorasi venue Live Guest.</p>
 <div class="dig"><label>Nama mempelai pria<input id="idg" maxlength="60" autocomplete="off" placeholder="mis. Fajar Pratama"></label><label>Nama mempelai wanita<input id="idb" maxlength="60" autocomplete="off" placeholder="mis. Diah Lestari"></label><label>Urutan nama<select id="ido"><option value="groom">Pria &amp; Wanita</option><option value="bride">Wanita &amp; Pria</option></select></label></div>
 <div class="lbl" style="margin-top:14px" id="idtl">Tema Live Guest</div><div class="idth" role="radiogroup" aria-labelledby="idtl">${Object.keys(NMTH).map(k=>`<button type="button" class="idtb" role="radio" aria-checked="false" data-th="${k}"><canvas width="112" height="112"></canvas><span>${NMTH[k].n}</span></button>`).join('')}</div>
 <div class="idpv" aria-live="polite"><canvas width="128" height="128"></canvas><div><small>The Wedding of</small><b></b></div></div>
 <div class="row" style="justify-content:flex-start"><button class="btn" id="idsave" type="button">Simpan Identitas</button><button class="btn g" id="idreset" type="button">Batalkan</button></div><div class="dmsg" id="idmsg" role="status"></div>`;w.insertBefore(d,body);
 const upd=()=>{NMDIRTY=true;nmRenderForm()};
 d.querySelector('#idg').oninput=e=>{NMDR.g=e.target.value;upd()};d.querySelector('#idb').oninput=e=>{NMDR.b=e.target.value;upd()};d.querySelector('#ido').onchange=e=>{NMDR.o=e.target.value;upd()};
 d.querySelectorAll('[data-th]').forEach(b=>b.onclick=()=>{NMDR.t=b.dataset.th;upd()});d.querySelector('#idsave').onclick=nmSave;d.querySelector('#idreset').onclick=()=>{NMDIRTY=false;NMDR=null;nmIdMsg('');nmRenderForm()}}
function nmIdMsg(t,bad){const m=$('#idmsg');if(m){m.textContent=t;m.className='dmsg'+(bad?' bad':'')}}
function nmRenderForm(){nmBuildForm();const d=$('#didform');if(!d)return;if(!NMDR||NMDRINV!==curInv||!NMDIRTY){NMDR={g:NMID.groomFull,b:NMID.brideFull,o:NMID.order,t:NMID.theme};NMDRINV=curInv;NMDIRTY=false}
 const set=(id,v)=>{const e=d.querySelector(id);if(e&&document.activeElement!==e&&e.value!==v)e.value=v};set('#idg',NMDR.g);set('#idb',NMDR.b);set('#ido',NMDR.o);
 const n=nmDraftNames(),mono=n.mono.length?n.mono:['A','B'];
 d.querySelectorAll('[data-th]').forEach(b=>{const k=b.dataset.th;b.setAttribute('aria-checked',k==NMDR.t);const x=b.querySelector('canvas').getContext('2d');x.clearRect(0,0,112,112);nmDrawMono(x,112,NMTH[k],mono)});
 const pc=d.querySelector('.idpv canvas').getContext('2d');pc.clearRect(0,0,128,128);nmDrawMono(pc,128,NMTH[NMDR.t],n.mono);const pb=d.querySelector('.idpv b');pb.textContent=n.pair||'Wedding Celebration';pb.style.fontFamily=NMTH[NMDR.t].font;pb.style.fontStyle=NMTH[NMDR.t].it?'italic':'normal';
 d.querySelector('#idsave').disabled=!NMDIRTY;d.querySelector('#idreset').disabled=!NMDIRTY}
async function nmSave(){if(!NMDR)return;const f={groomName:nmClean(NMDR.g),brideName:nmClean(NMDR.b),nameOrder:NMDR.o=='bride'?'bride':'groom',theme:NMTH[NMDR.t]?NMDR.t:NMDEF};
 if(!f.groomName||!f.brideName){nmIdMsg('Isi nama kedua mempelai terlebih dahulu.',1);return}
 const done=()=>{NMDIRTY=false;NMDR=null};
 if(!DBH){LS('ident:'+curInv,f);done();applyIdentity();nmIdMsg('Tersimpan lokal (database tidak tersedia). Live Guest sudah diperbarui.',1);return}
 const sb=$('#idsave');if(sb)sb.disabled=true;
 try{const ref=DBH.doc('invitations/'+curInv),snap=await ref.get(),d=snap.exists?snap.data():null;
  if(d&&d.ownerId&&UID&&d.ownerId!==UID&&!ISADMIN){nmIdMsg('Undangan ini dimiliki pelanggan lain. Pilih id undangan yang berbeda.',1);return}
  const now=Date.now();if(d)await ref.update(Object.assign({updatedAt:now,updatedBy:UID||null},f));else await ref.set(Object.assign({title:curInv,ownerId:UID||null,createdAt:now,updatedAt:now,updatedBy:UID||null},f));
  LS('ident:'+curInv,null);done();INVDATA=Object.assign({},INVDATA||{},f);applyIdentity();nmIdMsg('Identitas tersimpan. Header, monogram, dan dekorasi Live Guest sudah diperbarui.',0)}
 catch(e){nmIdMsg('Gagal menyimpan ('+(e&&e.code||'error')+'). Anda mungkin tidak punya izin menulis.',1)}finally{nmRenderForm()}}
if(document.fonts&&document.fonts.load)Promise.all(['italic 600 40px "Cormorant Garamond"','italic 600 40px "Playfair Display"','600 40px Cinzel'].map(f=>document.fonts.load(f))).then(()=>applyIdentity(),()=>{});
applyIdentity();

// ---- halaman pemilihan avatar & nama tamu: latar lukisan venue + font sama dengan Live Guest ----
document.head.appendChild(Object.assign(document.createElement('style'),{textContent:`
#s1,#s2{position:relative;isolation:isolate;background:var(--bgurl) center 38%/cover no-repeat,#f6dfe8!important;font-family:Inter,system-ui,sans-serif}
#s1::before,#s2::before{content:'';position:absolute;inset:0;z-index:-1;pointer-events:none;background:radial-gradient(ellipse 62% 78% at 50% 52%,rgba(255,250,246,.82) 0,rgba(255,250,246,.7) 55%,rgba(255,250,246,.06) 100%)}
#s1 h1,#s2 h1,#s1 .serif{font-family:"Cormorant Garamond",Georgia,serif;font-weight:600;letter-spacing:.005em}
#s1 h1,#s2 h1{font-size:clamp(40px,7.5vw,62px);line-height:1.05}
#s1 .serif{font-size:clamp(20px,3.4vw,26px)!important;font-style:italic}
#s1 .sub,#s2 .sub{color:#6b5560;font:400 15px/1.5 Inter,system-ui,sans-serif}
#s1 .btn,#s2 .btn,#s2 input,#s1 small{font-family:Inter,system-ui,sans-serif}
@media(max-width:700px){#s1{padding-top:60px}#s1,#s2{background-position:50% 30%}#s1::before,#s2::before{background:rgba(255,250,246,.74)}}
`}));
