// ===== NM:module dashboard — form identitas acara: jenis event, nama, avatar panggung, tema (daftar tema mengikuti registri NM) =====
document.head.appendChild(Object.assign(document.createElement('style'),{textContent:`
.did{background:var(--card,#fff);border:1px solid var(--line,#eadcd8);border-radius:18px;padding:18px 20px;margin:0 0 18px}.did h2{margin:0 0 2px;font-size:24px;color:var(--wine)}.did .sub{margin:0 0 14px}
.dig{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px}.dig label,.did .lbl{display:flex;flex-direction:column;gap:5px;font-size:12px;font-weight:600;color:var(--mute,#8a7a7a)}
.dig input,.dig select{font:inherit;font-weight:400;font-size:14px;padding:10px 14px;border-radius:12px;border:1px solid var(--line,#eadcd8);background:var(--card,#fff);color:var(--ink);width:100%;box-sizing:border-box}
.idth{display:grid;grid-template-columns:repeat(auto-fill,minmax(108px,1fr));gap:10px;margin:12px 0 4px}
.idtb{display:flex;flex-direction:column;align-items:center;gap:6px;padding:10px 6px;border-radius:14px;border:2px solid var(--line,#eadcd8);background:var(--card,#fff);cursor:pointer;font:600 11px var(--nm-sans,Inter,sans-serif);color:var(--ink)}.idtb canvas{width:56px;height:56px}.idtb[aria-checked=true]{border-color:var(--wine,#c76a86)}.idtb:focus-visible{outline:2px solid var(--wine,#c76a86);outline-offset:2px}
.idpv{display:flex;align-items:center;gap:12px;margin:12px 0;padding:10px 14px;border-radius:14px;background:rgba(127,127,127,.1)}.idpv canvas{width:64px;height:64px;flex:none}.idpv small{display:block;font:600 10px var(--nm-sans,Inter,sans-serif);letter-spacing:.18em;text-transform:uppercase;color:var(--mute,#8a7a7a)}.idpv b{font-size:22px;font-weight:600}
.dig[hidden]{display:none}
@media(max-width:700px){.did{padding:16px}}
`}));
const NMHOSTLB={birthday:'Nama yang berulang tahun',sweet17:'Nama yang berulang tahun',corporate:'Nama acara / perusahaan'};
let NMDR=null,NMDRINV=null,NMDIRTY=false;
const nmDraftId=()=>nmFromFields({eventType:NMDR.e,groomName:NMDR.g,brideName:NMDR.b,nameOrder:NMDR.o,hostName:NMDR.h,stageAvatar:NMDR.s,theme:NMDR.t},'');
function nmBuildForm(){if($('#didform'))return;const w=$('.dwrap'),body=$('#dbody');if(!w||!body)return;const d=document.createElement('div');d.id='didform';d.className='did';
 d.innerHTML=`<h2 class="serif">Identitas Acara</h2><p class="sub">Jenis acara, nama, dan tema menentukan tampilan Live Guest (header, monogram, dekorasi, dan seluruh popup).</p>
 <div class="dig"><label>Jenis acara<select id="ide">${Object.keys(NM.events).map(k=>`<option value="${k}">${esc(NM.events[k].label)}</option>`).join('')}</select></label></div>
 <div class="dig" id="idc" style="margin-top:12px"><label>Nama mempelai pria<input id="idg" maxlength="60" autocomplete="off" placeholder="mis. Fajar Pratama"></label><label>Nama mempelai wanita<input id="idb" maxlength="60" autocomplete="off" placeholder="mis. Diah Lestari"></label><label>Urutan nama<select id="ido"><option value="groom">Pria &amp; Wanita</option><option value="bride">Wanita &amp; Pria</option></select></label></div>
 <div class="dig" id="ids" style="margin-top:12px"><label><span id="idhl">Nama</span><input id="idh2" maxlength="60" autocomplete="off"></label><label>Avatar di panggung<select id="idsa"><option value="bride">Perempuan</option><option value="groom">Laki-laki</option><option value="none">Tanpa avatar</option></select></label></div>
 <div class="lbl" style="margin-top:14px" id="idtl">Tema Live Guest</div><div class="idth" id="idths" role="radiogroup" aria-labelledby="idtl"></div>
 <div class="idpv" aria-live="polite"><canvas width="128" height="128"></canvas><div><small></small><b></b></div></div>
 <div class="row" style="justify-content:flex-start"><button class="btn" id="idsave" type="button">Simpan Identitas</button><button class="btn g" id="idreset" type="button">Batalkan</button></div><div class="dmsg" id="idmsg" role="status"></div>`;w.insertBefore(d,body);
 const upd=()=>{NMDIRTY=true;nmRenderForm()},on=(id,ev,f)=>d.querySelector(id).addEventListener(ev,f);
 on('#ide','change',e=>{NMDR.e=e.target.value;NMDR.t=NM.resolve({eventType:NMDR.e,theme:NMDR.t}).theme;if(!NMDR.sTouched)NMDR.s=NM.event(NMDR.e).stageDefault||'none';upd()});
 on('#idg','input',e=>{NMDR.g=e.target.value;upd()});on('#idb','input',e=>{NMDR.b=e.target.value;upd()});on('#ido','change',e=>{NMDR.o=e.target.value;upd()});
 on('#idh2','input',e=>{NMDR.h=e.target.value;upd()});on('#idsa','change',e=>{NMDR.s=e.target.value;NMDR.sTouched=1;upd()});
 on('#idths','click',e=>{const b=e.target.closest('[data-th]');if(b){NMDR.t=b.dataset.th;upd()}});on('#idsave','click',nmSave);on('#idreset','click',()=>{NMDIRTY=false;NMDR=null;nmIdMsg('');nmRenderForm()})}
function nmIdMsg(t,bad){const m=$('#idmsg');if(m){m.textContent=t;m.className='dmsg'+(bad?' bad':'')}}
function nmRenderForm(){nmBuildForm();const d=$('#didform');if(!d)return;
 if(!NMDR||NMDRINV!==curInv||!NMDIRTY){NMDR={e:NMID.event,g:NMID.groomFull,b:NMID.brideFull,o:NMID.order,h:NMID.hostFull,s:NMID.stageAvatar,t:NMID.themeId};NMDRINV=curInv;NMDIRTY=false}
 const ev=NM.event(NMDR.e),couple=ev.kind=='couple',set=(id,v)=>{const e=d.querySelector(id);if(e&&document.activeElement!==e&&e.value!==v)e.value=v};
 set('#ide',NMDR.e);set('#idg',NMDR.g||'');set('#idb',NMDR.b||'');set('#ido',NMDR.o);set('#idh2',NMDR.h||'');set('#idsa',NMDR.s);
 d.querySelector('#idc').hidden=!couple;d.querySelector('#ids').hidden=couple;d.querySelector('#idhl').textContent=NMHOSTLB[NMDR.e]||'Nama';
 const ids=NM.forEvent(NMDR.e);if(!ids.includes(NMDR.t))NMDR.t=NM.resolve({eventType:NMDR.e,theme:NMDR.t}).theme;
 const n=nmDraftId(),mono=n.mono.length?n.mono:['A',couple?'B':''].filter(Boolean),box=d.querySelector('#idths');
 if(box.dataset.sig!==ids.join()){box.dataset.sig=ids.join();box.innerHTML=ids.map(k=>`<button type="button" class="idtb" role="radio" aria-checked="false" data-th="${esc(k)}"><canvas width="112" height="112"></canvas><span>${esc(NM.themes[k].name)}</span></button>`).join('')}
 box.querySelectorAll('[data-th]').forEach(b=>{const k=b.dataset.th;b.setAttribute('aria-checked',k==NMDR.t);const x=b.querySelector('canvas').getContext('2d');x.clearRect(0,0,112,112);nmDrawMono(x,112,NM.themes[k].mono,mono,ev.conn)});
 const th=NM.themes[NMDR.t].mono,pc=d.querySelector('.idpv canvas').getContext('2d');pc.clearRect(0,0,128,128);nmDrawMono(pc,128,th,n.mono,ev.conn);
 d.querySelector('.idpv small').textContent=ev.eyebrow;const pb=d.querySelector('.idpv b');pb.textContent=n.pair||(couple?ev.label+' Celebration':ev.label);pb.style.fontFamily=th.font;pb.style.fontStyle=th.it?'italic':'normal';
 d.querySelector('#idsave').disabled=!NMDIRTY;d.querySelector('#idreset').disabled=!NMDIRTY}
async function nmSave(){if(!NMDR)return;const ev=NM.event(NMDR.e),couple=ev.kind=='couple',f={eventType:NMDR.e,theme:NMDR.t};
 if(couple){f.groomName=nmClean(NMDR.g);f.brideName=nmClean(NMDR.b);f.nameOrder=NMDR.o=='bride'?'bride':'groom';if(!f.groomName||!f.brideName){nmIdMsg('Isi nama kedua mempelai terlebih dahulu.',1);return}}
 else{f.hostName=nmClean(NMDR.h);f.stageAvatar=['bride','groom','none'].includes(NMDR.s)?NMDR.s:'none';if(!f.hostName){nmIdMsg('Isi nama acara atau nama yang berulang tahun terlebih dahulu.',1);return}}
 const done=()=>{NMDIRTY=false;NMDR=null};
 if(!DBH){LS('ident:'+curInv,f);done();applyIdentity();nmIdMsg('Tersimpan lokal (database tidak tersedia). Live Guest sudah diperbarui.',1);return}
 const sb=$('#idsave');if(sb)sb.disabled=true;
 try{const ref=DBH.doc('invitations/'+curInv),snap=await ref.get(),d=snap.exists?snap.data():null;
  if(d&&d.ownerId&&UID&&d.ownerId!==UID&&!ISADMIN){nmIdMsg('Undangan ini dimiliki pelanggan lain. Pilih id undangan yang berbeda.',1);return}
  const now=Date.now();if(d)await ref.update(Object.assign({updatedAt:now,updatedBy:UID||null},f));else await ref.set(Object.assign({title:curInv,ownerId:UID||null,createdAt:now,updatedAt:now,updatedBy:UID||null},f));
  LS('ident:'+curInv,null);done();INVDATA=Object.assign({},INVDATA||{},f);applyIdentity();nmIdMsg('Identitas tersimpan. Tema, header, monogram, dan popup Live Guest sudah diperbarui.',0)}
 catch(e){nmIdMsg('Gagal menyimpan ('+(e&&e.code||'error')+'). Anda mungkin tidak punya izin menulis.',1)}finally{nmRenderForm()}}
nmRenderForm();
