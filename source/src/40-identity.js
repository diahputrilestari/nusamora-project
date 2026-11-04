// ===== NM:module identity — nama, inisial, monogram, header, dekorasi venue & avatar panggung (sadar jenis event & tema) =====
const NMTITLE=/^(dr|dra|drg|drs|ir|prof|h|hj|ns|kh|raden|rd)\.?$/i;
const nmClean=s=>String(s==null?'':s).replace(/\s+/g,' ').trim().slice(0,60);
function nmCap(w){return w&&(w==w.toLowerCase()||w==w.toUpperCase())&&w.length>1?w.charAt(0).toLocaleUpperCase()+w.slice(1).toLocaleLowerCase():w}
function nmFirst(s){const t=nmClean(s).split(' ').filter(Boolean);while(t.length>1&&NMTITLE.test(t[0]))t.shift();return nmCap((t[0]||'').replace(/[,.;]+$/,''))}
const nmIni=w=>w?Array.from(w)[0].toLocaleUpperCase():'';
function nmSlugNames(sl){const t=String(sl||'').split(/[-_]+/).filter(Boolean);if(t.length==2)return[t[0],t[1]];if(t.length==3&&/^(dan|and|n|x|weds)$/i.test(t[1]))return[t[0],t[2]];return null}
const nmTagOf=a=>a.map(w=>String(w).replace(/[^\p{L}\p{N}]/gu,'')).join('');
// satu fungsi murni: data undangan (+ id undangan sebagai cadangan) -> identitas tampilan
function nmFromFields(src,slugId){src=src||{};const r=NM.resolve(src),ev=NM.event(r.ev);let o;
 if(ev.kind=='couple'){let gf=nmClean(src.groomName),bf=nmClean(src.brideName),der=false;
  if(!gf&&!bf){const p=nmSlugNames(slugId);if(p){gf=nmCap(p[0]);bf=nmCap(p[1]);der=true}}
  const order=src.nameOrder=='bride'?'bride':'groom',g=nmFirst(gf),b=nmFirst(bf),it=(order=='bride'?[b,g]:[g,b]).filter(Boolean);
  o={groom:g,bride:b,groomFull:gf,brideFull:bf,host:'',hostFull:'',pair:it.join(' & '),mono:it.map(nmIni),tag:nmTagOf(it),order,derived:der}}
 else{let hf=nmClean(src.hostName),der=false;if(!hf){const w=String(slugId||'').split(/[-_]+/).filter(Boolean).map(nmCap).join(' ');if(w){hf=w.slice(0,60);der=true}}
  const nm=ev.full?hf:nmFirst(hf),words=hf.split(' ').filter(Boolean);let mono=ev.monoWords?[words.filter(w=>/^\p{L}/u.test(w)).slice(0,ev.monoWords).map(nmIni).join('')]:[nmIni(nmFirst(hf))];mono=mono.filter(Boolean);if(ev.suffix&&mono.length)mono.push(ev.suffix);
  o={groom:'',bride:'',groomFull:'',brideFull:'',host:nm,hostFull:hf,pair:nm,mono,tag:nmTagOf([nm]),order:'groom',derived:der}}
 const sa=['bride','groom','none'].includes(src.stageAvatar)?src.stageAvatar:(ev.stageDefault||'none');
 const items=Array.isArray(src.storyItems)?src.storyItems.slice(0,12).map(x=>Array.isArray(x)?x:[x&&x.t,x&&x.w,x&&x.d]).filter(x=>x[0]):null;
 return Object.assign(o,{event:r.ev,themeId:r.theme,stageAvatar:sa,items})}
let NMID=nmFromFields({}, '');
const nmCompute=()=>nmFromFields(Object.assign({},LS('ident:'+curInv)||{},INVDATA||{}),curInv);
const nmEv=()=>{try{return NM.event(NMID.event)}catch(e){return NM.event('wedding')}};
const nmN=k=>{const e=nmEv();try{return NMID[k]||(e.roles[k]||'')}catch(x){return''}};
const nmPair=()=>{try{return NMID.pair}catch(e){return''}};
const nmFmt=t=>String(t==null?'':t).replace(/\{n\}/g,NMID.pair||nmEv().label).replace(/\{groom\}/g,NMID.groom||'Mempelai Pria').replace(/\{bride\}/g,NMID.bride||'Mempelai Wanita');
const nmOrn=()=>{try{return NM.cur.theme.orn}catch(e){return'sprig'}};
const nmMono=()=>{try{return NM.cur.theme.mono}catch(e){return NM.theme('romantic-garden').mono}};
const nmTitleOf=()=>NMID.pair||(nmEv().kind=='couple'?nmEv().label+' Celebration':nmEv().label);
// ---- gambar monogram (satu fungsi untuk header, medali venue, pratinjau dashboard) ----
function nmLeaf(x,px,py,a,l,w,col){x.save();x.translate(px,py);x.rotate(a);x.beginPath();x.ellipse(0,0,l,w,0,0,6.2832);x.fillStyle=col;x.fill();x.restore()}
function nmBlossom(x,px,py,r,col,ctr){for(let i=0;i<5;i++){x.save();x.translate(px,py);x.rotate(i*1.2566);x.beginPath();x.ellipse(0,-r*.62,r*.42,r*.62,0,0,6.2832);x.fillStyle=col;x.fill();x.restore()}x.beginPath();x.arc(px,py,r*.22,0,6.2832);x.fillStyle=ctr;x.fill()}
function nmDrawMono(x,S,th,mono,conn){const c=S/2,R=S*.46,lw=Math.max(1,S*.012),P=Math.PI*2;
 x.beginPath();x.arc(c,c,R,0,P);x.fillStyle=th.paper;x.fill();x.lineWidth=lw;x.strokeStyle=th.accent;x.stroke();
 const at=(r,i,n,o)=>{const a=i/n*P+(o||0);return[c+Math.cos(a)*r,c+Math.sin(a)*r,a]};
 switch(th.motif){
  case'garden':for(let i=0;i<20;i++){const[px,py,a]=at(R*.905,i,20);nmLeaf(x,px,py,a+Math.PI/2+(i%2?.55:-.55),S*.032,S*.012,th.leaf)}for(let i=0;i<6;i++){const[px,py]=at(R*.905,i,6,.52);x.beginPath();x.arc(px,py,S*.024,0,P);x.fillStyle=th.accent;x.fill();x.beginPath();x.arc(px,py,S*.01,0,P);x.fillStyle=th.paper;x.fill()}break;
  case'batik':{x.strokeStyle=th.gold;x.lineWidth=lw*.8;const n=16;for(let i=0;i<n;i++){const[px,py,a]=at(R*.88,i,n);x.save();x.translate(px,py);x.rotate(a);x.beginPath();x.ellipse(0,0,S*.034,S*.016,0,0,P);x.stroke();x.beginPath();x.ellipse(0,0,S*.016,S*.034,0,0,P);x.stroke();x.restore()}for(let i=0;i<n;i++){const[px,py]=at(R*.97,i,n,.2);x.beginPath();x.arc(px,py,S*.007,0,P);x.fillStyle=th.accent;x.fill()}break}
  case'sakura':for(let i=0;i<6;i++){const[px,py]=at(R*.9,i,6,-.5);nmBlossom(x,px,py,S*.05,th.accent,th.gold)}for(let i=0;i<12;i++){const[px,py]=at(R*.9,i,12,-.5+.26);x.beginPath();x.arc(px,py,S*.011,0,P);x.fillStyle=th.leaf;x.fill()}break;
  case'gold':x.beginPath();x.arc(c,c,R*.94,0,P);x.strokeStyle=th.gold;x.lineWidth=lw*.6;x.stroke();for(let i=0;i<48;i++){const[a1,b1,a]=at(R*.86,i,48),[a2,b2]=at(R*.9,i,48);x.beginPath();x.moveTo(a1,b1);x.lineTo(a2,b2);x.stroke()}for(let i=0;i<4;i++){const[px,py,a]=at(R*.9,i,4);x.save();x.translate(px,py);x.rotate(Math.PI/4);x.fillStyle=th.gold;x.fillRect(-S*.022,-S*.022,S*.044,S*.044);x.restore()}break;
  case'royal':x.strokeStyle=th.gold;x.lineWidth=lw*.8;for(let i=0;i<28;i++){const[px,py]=at(R*.98,i,28);x.beginPath();x.arc(px,py,S*.026,0,P);x.stroke()}for(let i=0;i<12;i++){const[px,py,a]=at(R*.86,i,12);nmLeaf(x,px,py,a+Math.PI/2,S*.034,S*.014,th.leaf);nmLeaf(x,px,py,a+Math.PI/2,S*.016,S*.007,th.gold)}break;
  case'boho':for(let k=0;k<2;k++){for(let i=0;i<9;i++){const t=-1.1+i/8*2.2,a=(k?-Math.PI/2:Math.PI/2)+t,r=R*.9,px=c+Math.cos(a)*r,py=c+Math.sin(a)*r;nmLeaf(x,px,py,a+Math.PI/2+(i%2?.7:-.7),S*.036,S*.013,i%3?th.leaf:th.accent)}}for(let i=0;i<4;i++){const[px,py]=at(R*.9,i,4,Math.PI/4*0+.0);x.beginPath();x.arc(px,py,S*.011,0,P);x.fillStyle=th.gold;x.fill()}break;
  case'confetti':{const cl=[th.accent,th.gold,th.leaf,th.ink];for(let i=0;i<22;i++){const[px,py,a]=at(R*(.86+(i%3)*.04),i,22,i*.37);x.save();x.translate(px,py);x.rotate(i*1.3);x.fillStyle=cl[i%4];if(i%2){x.beginPath();x.arc(0,0,S*.014,0,P);x.fill()}else x.fillRect(-S*.016,-S*.008,S*.032,S*.016);x.restore()}}break;
  case'sparkle':for(let i=0;i<8;i++){const[px,py]=at(R*.9,i,8,.2),r=S*(i%2?.022:.036);x.fillStyle=i%2?th.gold:th.accent;x.beginPath();x.moveTo(px,py-r);x.quadraticCurveTo(px,py,px+r,py);x.quadraticCurveTo(px,py,px,py+r);x.quadraticCurveTo(px,py,px-r,py);x.quadraticCurveTo(px,py,px,py-r);x.fill()}break;
  case'rings':x.lineWidth=lw*1.1;x.strokeStyle=th.gold;for(let k=0;k<2;k++){x.beginPath();x.arc(c+(k?1:-1)*S*.04,c-R*.9+S*.02,S*.05,0,P);x.stroke()}x.fillStyle=th.leaf;for(let i=0;i<14;i++){const[px,py]=at(R*.9,i,14,.25);if(Math.abs(py-(c-R*.9))<S*.09&&px>c-S*.14&&px<c+S*.14)continue;x.beginPath();x.arc(px,py,S*.012,0,P);x.fill()}break;
  default:x.beginPath();x.arc(c,c,R*.93,0,P);x.strokeStyle=th.gold;x.lineWidth=lw*.6;x.stroke()}
 x.beginPath();x.arc(c,c,R*.76,0,P);x.strokeStyle=th.gold;x.lineWidth=Math.max(.8,S*.006);x.stroke();
 // teks: 1-2 bagian (inisial / sufiks) dengan penghubung; ukuran menyesuaikan panjang
 const fi=(th.it?'italic ':'')+'600 ',L=mono&&mono.length?mono:null;x.textBaseline='alphabetic';x.textAlign='left';
 if(!L){x.font=fi+(S*.3)+'px '+th.font;x.fillStyle=th.gold;x.textAlign='center';x.fillText(conn||'&',c,c+S*.1);return}
 const inner=S*.62,mx=Math.max(...L.map(t=>Array.from(t).length));let fs=S*(mx>2?.2:.27);
 const meas=()=>{x.font=fi+fs+'px '+th.font;const w=L.map(t=>x.measureText(t).width);x.font='italic 600 '+(fs*.6)+'px '+th.font;const am=L.length>1?x.measureText(conn||'&').width:0,gap=L.length>1?fs*.11:0;return{w,am,gap,tot:w[0]+(L.length>1?gap*2+am+w[1]:0)}};
 let M=meas();while(M.tot>inner&&fs>8){fs*=.92;M=meas()}
 let px=c-M.tot/2;const by=c+fs*.33;x.font=fi+fs+'px '+th.font;x.fillStyle=th.ink;x.fillText(L[0],px,by);
 if(L.length>1){x.font='italic 600 '+(fs*.6)+'px '+th.font;x.fillStyle=th.gold;x.fillText(conn||'&',px+M.w[0]+M.gap,by-fs*.06);x.font=fi+fs+'px '+th.font;x.fillStyle=th.ink;x.fillText(L[1],px+M.w[0]+M.gap*2+M.am,by)}}

// ---- medali monogram di lengkung pelaminan (sprite Three.js) ----
const NMC={medal:null,spr:[]};
function nmDrawScene(){if(!NMC.medal){NMC.medal=document.createElement('canvas');NMC.medal.width=NMC.medal.height=512}nmDrawMono(NMC.medal.getContext('2d'),512,nmMono(),NMID.mono,nmEv().conn);if(NMC.medal.t)NMC.medal.t.needsUpdate=true}
const NMPOS={medal:{x:0,y:21.4,z:-40.6,w:7.2}};
const _ill14=illustrate;illustrate=function(){const r=_ill14();nmDrawScene();NMC.spr.forEach(s=>sc.remove(s));NMC.spr=[];
 const p=NMPOS.medal,c=NMC.medal,s=spr(c,p.w,p.w*c.height/c.width,p.x,p.y,p.z);s.name='nm-medal';sc.add(s);NMC.spr.push(s);nmTexts();nmStage();return r};
// ---- header, teks UI, avatar panggung ----
document.head.appendChild(Object.assign(document.createElement('style'),{textContent:`
.nm-hid{display:none!important}
#idh{top:8px;left:50%;transform:translateX(-50%);display:flex;align-items:center;gap:10px;max-width:min(540px,calc(100vw - 340px));padding:5px 20px 5px 6px;border-radius:999px;background:var(--hbg);border:1px solid var(--hline);color:var(--hink);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);pointer-events:none;font-family:var(--hfont)}
#idh canvas{width:44px;height:44px;flex:none;display:block}#idh .idt{min-width:0;display:flex;flex-direction:column;gap:3px}
#idh small{font:600 9.5px/1 var(--nm-sans);letter-spacing:.2em;text-transform:uppercase;color:var(--hacc)}
#idh b{font:600 24px/1.1 var(--hfont);font-style:var(--hit);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;letter-spacing:.01em}
#idh[data-len=l] b{font-size:19px}#idh[data-len=xl] b{font-size:15.5px}
#hint{top:66px}
`}));
function nmHeader(){let h=$('#idh');if(!h){h=document.createElement('div');h.id='idh';h.className='h';h.setAttribute('role','banner');h.innerHTML='<canvas width="88" height="88" aria-hidden="true"></canvas><div class="idt"><small></small><b></b></div>';$('#live').appendChild(h)}
 const th=nmMono(),s=h.style,ev=nmEv();s.setProperty('--hbg',th.hbg);s.setProperty('--hline',th.hline);s.setProperty('--hink',th.ink);s.setProperty('--hacc',th.accent);s.setProperty('--hfont',th.font);s.setProperty('--hit',th.it?'italic':'normal');
 const t=nmTitleOf();h.querySelector('small').textContent=NMID.pair?ev.eyebrow:'Live Guest';h.querySelector('b').textContent=t;
 h.title=ev.kind=='couple'?(NMID.order=='bride'?[NMID.brideFull,NMID.groomFull]:[NMID.groomFull,NMID.brideFull]).filter(Boolean).join(' & '):NMID.hostFull;h.dataset.len=t.length>30?'xl':t.length>20?'l':'';
 h.setAttribute('aria-label',(NMID.pair?ev.eyebrow+' ':'')+t);const x=h.querySelector('canvas').getContext('2d');x.clearRect(0,0,88,88);nmDrawMono(x,88,th,NMID.mono,ev.conn)}
function nmTexts(){const ev=nmEv(),p=NMID.pair;{const th=NM.themes[NMID.themeId]||{},cp=th.copy||{},h=$('#s2 h1'),sb=$('#s2 .sub');if(h){if(h.dataset.d0==null)h.dataset.d0=h.textContent;h.textContent=cp.s2h||h.dataset.d0}if(sb){if(sb.dataset.d0==null)sb.dataset.d0=sb.textContent;sb.textContent=cp.s2s||sb.dataset.d0}}
 document.title=(p?p+' · ':'')+ev.label+' Live Guest';
 const a=$('#s1 .serif'),b=$('#s1 .sub');if(a)a.textContent=p?nmFmt(ev.s1):'💍 Undangan Digital Interaktif';if(b)b.textContent=p?nmFmt(ev.welcome):'Masuk ke acara virtual sebagai tamu spesial';
 const sn=document.querySelector('#ml .nv[data-id=story]');if(sn){const tx=sn.querySelector('.tx');if(tx)tx.textContent=ev.story.nav;sn.title=sn.ariaLabel=nmFmt(ev.story.title)}
 nmStage()}
/* jarak pengantin: setengah jarak antar-pusat (satuan dunia); label dinaikkan bergantian agar tidak bertumpuk */
const NMCOUPLE={gap:.58};
document.head.appendChild(Object.assign(document.createElement('style'),{textContent:'.lb[data-k=bride] .nm{transform:translateY(-26px)}.lb[data-k=groom] .nm{transform:translateY(0)}'}));
function nmStage(){if(typeof ents==='undefined'||typeof coupleEnts!=='function')return;const ce=coupleEnts();if(ce.length<2)return;const ev=nmEv(),E={bride:ce[0],groom:ce[1]},want=ev.kind=='couple'?['bride','groom']:(NMID.stageAvatar=='none'?[]:[NMID.stageAvatar]);
 ['bride','groom'].forEach(k=>{const e=E[k],on=want.includes(k);let t=k=='bride'?nmN('bride')+' · '+ev.roles.bride:nmN('groom')+' · '+ev.roles.groom;
  if(ev.kind!='couple')t=(NMID.host||ev.label)+' · '+ev.roles.host;
  if(on)coupleLabel(e,t);e.g.visible=on;if(e.el)e.el.classList.toggle('nm-hid',!on);e.g.position.x=want.length==1?0:(k=='groom'?NMCOUPLE.gap:-NMCOUPLE.gap);if(e.el){e.el.dataset.k=want.length==1?'solo':k}})}
function applyIdentity(){try{NMID=nmCompute();NM.apply(NMID.themeId,NMID.event);nmHeader();nmTexts();nmDrawScene();if(typeof nmRenderForm==='function')nmRenderForm()}catch(e){console.warn('identity',e)}}
const nmSync=applyIdentity;NM.on(applyIdentity);
{const fam=f=>(String(f).split(',')[0]||'').trim();const load=()=>{const t=NM.cur&&NM.cur.theme;if(!t||!document.fonts||!document.fonts.load)return;Promise.all([t.mono.font,t.ui.serif].map(f=>document.fonts.load('italic 600 40px '+fam(f)).catch(()=>0))).then(()=>{try{nmHeader();nmDrawScene()}catch(e){}},()=>{})};NM.on(load);window.addEventListener('load',load)}
