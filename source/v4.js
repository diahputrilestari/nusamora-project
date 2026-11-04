// ===== v4: background-driven venue (fixed camera), table sets, groom dashboard =====
const BGW=1672,BGH=941,CAMH=9.35,CAMZ=30.85,CAMPITCH=-0.0481;
var CX=0,CY=0,ZMAX=12,VIS={x0:0,x1:BGW,y0:0,y1:BGH};
function camSetup(){cam.fov=48;cam.aspect=BGW/BGH;cam.near=5;cam.far=140;cam.position.set(0,CAMH,CAMZ);cam.rotation.set(CAMPITCH,0,0);cam.updateProjectionMatrix();cam.updateMatrixWorld(true)}
function scr(x,y,z){const v=new THREE.Vector3(x,y,z).project(cam);return[(v.x*.5+.5)*BGW,(-v.y*.5+.5)*BGH]}
function xlim(z){const a=scr(0,0,z)[0],b=scr(1,0,z)[0],cpu=b-a;if(!(cpu>0))return 15;const m=Math.min((a-(VIS.x0+22))/cpu,((VIS.x1-22)-a)/cpu);return Math.max(3,Math.min(32,m))}
function calcBounds(){let z=12;while(z>-8&&scr(0,0,z)[1]>VIS.y1-34)z-=.25;ZMAX=Math.max(z,-7)}
function clampAll(){ents.forEach(e=>{if(e.static||!e.g)return;const z=Math.min(e.g.position.z,ZMAX),xl=xlim(z);e.g.position.z=z;e.g.position.x=Math.max(-xl,Math.min(xl,e.g.position.x))})}
function rs(){if(!R)return;const p=port(),vw=p?innerHeight:innerWidth,vh=p?innerWidth:innerHeight,k=Math.max(vw/BGW,vh/BGH),Wc=BGW*k,Hc=BGH*k;
CX=(vw-Wc)*.5;CY=(vh-Hc)*.5;W=Wc;H=Hc;R.setPixelRatio(Math.min(devicePixelRatio||1,2,3200/Wc));R.setSize(Wc,Hc,false);
$('#cv').style.cssText='position:absolute;display:block;left:'+CX+'px;top:'+CY+'px;width:'+Wc+'px;height:'+Hc+'px';
camSetup();VIS={x0:-CX/k,x1:(vw-CX)/k,y0:-CY/k,y1:(vh-CY)/k};calcBounds();if(typeof P!=='undefined'&&P)clampAll()}
function move(e,mx,mz,s){let x=e.g.position.x+mx*s,z=e.g.position.z+mz*s;z=Math.max(-9.3,Math.min(ZMAX,z));const xl=xlim(z);x=Math.max(-xl,Math.min(xl,x));
for(const[tx,tz]of tables){const dx=x-tx,dz=z-tz,d=Math.hypot(dx,dz);if(d<1.9&&d>1e-4){x=tx+dx/d*1.9;z=tz+dz/d*1.9}}
e.g.position.x=x;e.g.position.z=z;e.g.rotation.y=Math.atan2(mx,mz);e.mv=1}
function goArea(id){const a=AREAS.find(a=>a.id==id);if(!a)return;const z=Math.min(a.z,ZMAX),xl=xlim(z);auto={x:Math.max(-xl,Math.min(xl,a.x)),z,id,t:0};closeM();if(innerHeight<560)$('#map').classList.add('c')}
function tick(){requestAnimationFrame(tick);const dt=Math.min(clock.getDelta(),.05),t=clock.elapsedTime;if(!R)return;
let ix=(keys.d||keys.arrowright?1:0)-(keys.a||keys.arrowleft?1:0)+joy.x,iy=(keys.w||keys.arrowup?1:0)-(keys.s||keys.arrowdown?1:0)+joy.y;const L=Math.hypot(ix,iy);
if(L>.1){if(L>1){ix/=L;iy/=L}auto=null;move(P,ix,-iy,5*dt)}
else if(auto){const dx=auto.x-P.g.position.x,dz=auto.z-P.g.position.z,d=Math.hypot(dx,dz);auto.t+=dt;if(d<.4||auto.t>9){const i=auto.id;auto=null;arrive(i)}else move(P,dx/d,dz/d,4.5*dt)}
bots.forEach(b=>{const dx=b.tx-b.g.position.x,dz=b.tz-b.g.position.z,d=Math.hypot(dx,dz);if(d<.4){if(Math.random()<.01){b.tx=(Math.random()-.5)*28;b.tz=Math.random()*18-8}}else move(b,dx/d,dz/d,1.5*dt)});
ents.forEach(e=>{const l=e.g.userData.legs;if(l&&l.length){const w=e.mv?Math.sin(t*10+(e.s||0))*.6:0;l[0].rotation.x+=(w-l[0].rotation.x)*.3;l[1].rotation.x+=(-w-l[1].rotation.x)*.3}e.g.position.y=.1+(e.mv?Math.abs(Math.sin(t*10))*.08:Math.sin(t*2+(e.s||0))*.03);e.mv=0;
if(e.el){const v=new THREE.Vector3(e.g.position.x,e.ly||2.5,e.g.position.z).project(cam);e.el.style.display=v.z>1?'none':'block';e.el.style.transform=`translate(${(v.x*.5+.5)*W+CX}px,${(-v.y*.5+.5)*H+CY}px) translate(-50%,-100%)`}});
trees.forEach((tr,i)=>tr.rotation.z=Math.sin(t+i)*.02);R.render(sc,cam)}
function pick(e){const[lx,ly]=port()?[e.clientY,innerWidth-e.clientX]:[e.clientX,e.clientY];ray.setFromCamera({x:(lx-CX)/W*2-1,y:-((ly-CY)/H*2-1)},cam);const h=ray.intersectObjects(ents.map(e=>e.g).concat(clk),true)[0];if(!h)return;let o=h.object;while(o){const en=ents.find(x=>x.g===o);if(en&&en!==P&&!en.static)return prof(en);if(o.userData.area)return goArea(o.userData.area);o=o.parent}}
// ---- table sets: every part is its own PNG sprite and its own LAYOUT entry ----
const MEJA=__MEJA__,MCV={};
function mc(k){if(MCV[k])return MCV[k];const d=MEJA[k],c=cvs(d[1],d[2],()=>{}),im=new Image();im.onload=()=>{c.getContext('2d').drawImage(im,0,0);if(c.t)c.t.needsUpdate=true};im.src=d[0];return MCV[k]=c}
Object.keys(MEJA).forEach(mc);
const TS=1/380,TX=767,TY=930,TOFF={'kursi-belakang-kiri':-.12,'kursi-belakang-kanan':-.12,'meja-bundar':-.04,'lilin-kiri':0,'lilin-kanan':0,'gelas-kiri':.01,'gelas-kanan':.01,'lentera-kiri':.02,'lentera-kanan':.02,'rangkaian-bunga':.04,'kursi-depan-kiri':.12,'kursi-depan-kanan':.12};
function relayout(id,x,z,w,y){const o=LAYOUT.find(o=>o.id==id),s=VS[id];if(!o||!s)return;if(x!=null)o.x=x;if(z!=null)o.z=z;if(w!=null)o.w=w;if(y!=null)o.y=y;const c=o.m?mc(o.k):o.kul?kc(o.k):dc(o.k);s.position.set(o.x,o.y||0,o.z);s.scale.set(o.w,o.w*c.height/c.width,1)}
function placeSet(n,cx,cz){Object.keys(TOFF).forEach(k=>{const d=MEJA[k];relayout('set'+n+'-'+k,cx+((d[3]+d[1]/2)-TX)*TS,cz+TOFF[k],d[1]*TS,(TY-(d[4]+d[2]))*TS)})}
// ---- groom catalog (extensible: built-ins + docs in db collection avatarCatalog) ----
const GIMG=__GROOM__;
const GBUILT=[
{id:'klasik-krem-emas',name:'Klasik Krem Emas',hair:'Ikal bergelombang cokelat',skin:'Sawo terang',acc:'Dasi emas, boutonniere mawar',outfit:'Tuxedo krem sulam emas',uri:GIMG.groom1},
{id:'beige-berkacamata',name:'Beige Berkacamata',hair:'Sisir samping cokelat',skin:'Sawo terang',acc:'Kacamata, dasi kupu-kupu emas',outfit:'Setelan beige dengan rompi bersulam',uri:GIMG.groom2},
{id:'dusty-rose',name:'Dusty Rose',hair:'Ikal berombak cokelat tembaga',skin:'Sawo terang',acc:'Pin emas, boutonniere mawar',outfit:'Setelan dusty rose berekor',uri:GIMG.groom3},
{id:'tradisional-emas',name:'Tradisional Emas',hair:'Spike pendek cokelat',skin:'Sawo terang',acc:'Kancing emas, pita mawar',outfit:'Jas tradisional krem sulam emas',uri:GIMG.groom4},
{id:'sherwani-emas',name:'Sherwani Emas',hair:'Cepol rendah cokelat',skin:'Sawo terang',acc:'Sabuk emas, boutonniere mawar',outfit:'Sherwani krem berhias emas',uri:GIMG.groom5}];
let GCAT=GBUILT.slice(),GSEL=GBUILT[0].id,GSAVED=null,INVDATA=null,CUSTOM=[];
const catById=id=>GCAT.find(a=>a.id==id);
function rebuildCat(){GCAT=GBUILT.concat(CUSTOM.filter(c=>c.uri&&!GBUILT.some(b=>b.id==c.id)))}
function coupleEnts(){return ents.filter(e=>e.static)}
function applyGroom(id){const a=catById(id);if(!a)return false;GSEL=a.id;const ce=coupleEnts(),gE=ce[1];if(!gE)return false;
gE.g.children.slice().forEach(c=>gE.g.remove(c));gE.g.add(spr(chibiC({img:a.uri,id:'gm-'+a.id}),1.45,2.6,0,0,0));gE.a={img:a.uri};return true}
function coupleLabel(e,txt){if(e.el)e.el.querySelector('.nm').textContent=txt;else{const el=document.createElement('div');el.className='lb';el.innerHTML='<div class="nm"></div>';el.firstChild.textContent=txt;$('#lbls').appendChild(el);e.el=el}}
// ---- scene wrapper: transparent canvas over the background image ----
const _ill4=illustrate;
illustrate=function(){const r=_ill4();R.setClearColor(0x000000,0);sc.background=null;sc.fog=null;
sc.traverse(o=>{if(o.isMesh||o.isPoints)o.visible=false});
const kill=[[11,14],[5,6.5],[5.5,7],[3.8,3.3],[18,7],[14,10.5]];
sc.children.filter(o=>o.isSprite&&kill.some(([w,h])=>Math.abs(o.scale.x-w)<.01&&Math.abs(o.scale.y-h)<.01)).forEach(o=>sc.remove(o));
['gazebo0','arch0','lamp0','lamp1'].forEach(id=>{if(VS[id])VS[id].visible=false});
VL.meja=new THREE.Group();VL.meja.name='meja';sc.add(VL.meja);
tables.slice(0,6).slice().forEach(([x,z],n)=>{Object.keys(TOFF).forEach(k=>{const d=MEJA[k],c=mc(k),o={id:'set'+n+'-'+k,k,x:0,z:0,w:1,y:0,l:'meja',m:1};LAYOUT.push(o);const s=spr(c,1,1,0,0,0);s.userData.area='resepsi';clk.push(s);VS[o.id]=s;VL.meja.add(s)});placeSet(n,x,z)});
relayout('fountain0',-6.2,9.0,4.4);relayout('parasol0',-11.6,6.4);relayout('board0',1.2,11.6);relayout('sign0',4.4,11.4);relayout('monst2',15.2,3.0);
['planter0','planter1','planter2','planter3','flowerbed1','flowerbed2'].forEach(id=>relayout(id,null,11.6));
for(let i=tables.length-1;i>=0;i--)if(Math.abs(tables[i][0]+5.4)<.01&&Math.abs(tables[i][1]-12.8)<.01)tables.splice(i,1);tables.push([-6.2,9.0]);
document.querySelectorAll('#live > img').forEach(i=>i.remove());
const ce=coupleEnts();ce.forEach((e,i)=>{e.g.scale.setScalar(2.2);e.g.position.set(i?1.1:-1.1,0,-16.4);e.ly=5.8});
applyGroom(GSAVED||GSEL);const nm=(INVDATA&&INVDATA.groomName)||'Raka',nb=(INVDATA&&INVDATA.brideName)||'Sinta';
if(ce[0])coupleLabel(ce[0],nb+' · Mempelai Wanita');if(ce[1])coupleLabel(ce[1],nm+' · Mempelai Pria');
const ka=AREAS.find(a=>a.id=='kuliner');if(ka){ka.x=10.4;ka.z=Math.min(ka.z,11)}
return r};
// ---- Dashboard Pelanggan ----
const INV0=(()=>{try{return new URLSearchParams(location.search).get('inv')||'raka-sinta'}catch(e){return'raka-sinta'}})();
let curInv=INV0,DBH=null,UID=null,ISADMIN=false,PEND=null,DMSG='',DERR='',MYINV=[],unsubInv=null,unsubCat=null,unsubMy=null;
const slug=s=>String(s||'').toLowerCase().replace(/[^a-z0-9_-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,60);
function dmsg(t,bad){DMSG=t;DERR=bad?1:0;const m=$('#dmsg');if(m){m.textContent=t;m.className='dmsg'+(bad?' bad':'')}}
function subInv(){if(unsubInv){unsubInv();unsubInv=null}INVDATA=null;GSAVED=LS('groom:'+curInv)||null;if(GSAVED&&!catById(GSAVED))GSAVED=null;if(PEND===null)PEND=GSAVED||GSEL;
if(!DBH){renderDash();return}
unsubInv=DBH.doc('invitations/'+curInv).onSnapshot(s=>{INVDATA=s.exists?s.data():null;const id=INVDATA&&INVDATA.groomAvatarId;if(id){GSAVED=id;LS('groom:'+curInv,id);if(catById(id))applyGroom(id)}if(PEND===null&&id)PEND=id;
  if(typeof ents!=='undefined'&&coupleEnts().length){const ce=coupleEnts();if(INVDATA){if(ce[1])coupleLabel(ce[1],(INVDATA.groomName||'Raka')+' · Mempelai Pria');if(ce[0])coupleLabel(ce[0],(INVDATA.brideName||'Sinta')+' · Mempelai Wanita')}}
  renderDash()},e=>{dmsg('Database tidak dapat dibaca ('+e.code+').',1);renderDash()})}
async function initDB(){try{if(!window.claude||!claude.use){return}DBH=await claude.use('db');const u=await claude.use('user');if(u){try{UID=await u.id()}catch(e){}try{ISADMIN=!!(u.canEdit&&u.canEdit())}catch(e){}}
if(!DBH){dmsg('Database tidak tersedia di tampilan ini. Pilihan disimpan lokal di perangkat ini.',1);renderDash();return}
unsubCat=DBH.collection('avatarCatalog').onSnapshot(s=>{CUSTOM=s.docs.map(d=>Object.assign({id:d.id},d.data()));rebuildCat();if(GSAVED&&catById(GSAVED)&&typeof ents!=='undefined')applyGroom(GSAVED);renderDash()},()=>{});
let q=DBH.collection('invitations');if(!ISADMIN&&UID)q=q.where('ownerId','==',UID);
unsubMy=q.onSnapshot(s=>{MYINV=s.docs.map(d=>d.id);renderDash()},()=>{});subInv()}catch(e){dmsg('Gagal menyiapkan database.',1)}}
function canWriteHere(){return!!DBH}
async function saveGroom(){const id=PEND;if(!catById(id))return;
if(!DBH){LS('groom:'+curInv,id);GSAVED=id;if(typeof ents!=='undefined')applyGroom(id);dmsg('Tersimpan lokal (database tidak tersedia).',1);renderDash();return}
const btn=$('#dsave');if(btn)btn.disabled=true;
try{const ref=DBH.doc('invitations/'+curInv),snap=await ref.get(),d=snap.exists?snap.data():null;
if(d&&d.ownerId&&UID&&d.ownerId!==UID&&!ISADMIN){dmsg('Undangan ini dimiliki pelanggan lain. Pilih id undangan yang berbeda.',1);return}
const now=Date.now();if(d)await ref.update({groomAvatarId:id,updatedAt:now,updatedBy:UID||null});else await ref.set({title:curInv,ownerId:UID||null,groomAvatarId:id,createdAt:now,updatedAt:now,updatedBy:UID||null});
LS('groom:'+curInv,id);GSAVED=id;applyGroom(id);dmsg('Pilihan tersimpan. Mempelai pria di Live Guest sudah diperbarui.',0)}
catch(e){dmsg('Gagal menyimpan ('+(e&&e.code||'error')+'). Anda mungkin tidak punya izin menulis.',1)}finally{const b=$('#dsave');if(b)b.disabled=false;renderDash()}}
function renderDash(){const root=$('#dbody');if(!root)return;PEND=PEND||GSAVED||GSEL;const cur=catById(PEND)||GCAT[0],sv=GSAVED&&catById(GSAVED);
const opts=Array.from(new Set([curInv].concat(MYINV))).map(i=>`<option value="${esc(i)}" ${i==curInv?'selected':''}>${esc(i)}</option>`).join('');
root.innerHTML=`<div class="dinv"><label for="dsel">Undangan</label><select id="dsel">${opts}</select><input id="dnew" maxlength="40" placeholder="id undangan baru"><button class="btn g chip" id="dopen">Buka / Buat</button></div>
<div class="dgrid2"><div><div class="dcards">${GCAT.map(a=>`<button class="dcard${a.id==PEND?' sel':''}" data-id="${esc(a.id)}" aria-pressed="${a.id==PEND}"><span class="dim"><img src="${a.uri}" alt="${esc(a.name)}"></span><b>${esc(a.name)}</b><small>Rambut: ${esc(a.hair||'-')}<br>Kulit: ${esc(a.skin||'-')}<br>Aksesori: ${esc(a.acc||'-')}<br>Pakaian: ${esc(a.outfit||'-')}</small>${a.id==GSAVED?'<i class="tag">Tersimpan</i>':''}</button>`).join('')}</div></div>
<aside class="dprev"><div class="pv"><img src="${cur.uri}" alt=""><span>Pelaminan</span></div><h3 class="serif">${esc(cur.name)}</h3><p class="sub" style="margin:0 0 8px">${sv?('Tersimpan: '+esc(sv.name)):'Belum ada pilihan tersimpan'}</p>
<div class="row" style="justify-content:flex-start"><button class="btn" id="dsave" ${PEND==GSAVED?'disabled':''}>Simpan Pilihan</button><button class="btn g" id="dreset" ${PEND==GSAVED?'disabled':''}>Batalkan</button><button class="btn g" id="dlive">Lihat di Live Guest</button></div><div class="dmsg${DERR?' bad':''}" id="dmsg" role="status">${esc(DMSG)}</div></aside></div>
${ISADMIN&&DBH?`<details class="dadd"><summary>Tambah avatar baru ke koleksi (admin)</summary><div class="dform"><input id="an" placeholder="Nama avatar"><input id="ah" placeholder="Rambut"><input id="as" placeholder="Warna kulit"><input id="aa" placeholder="Aksesori"><input id="ao" placeholder="Gaya pakaian"><input id="af" type="file" accept="image/png,image/webp"><button class="btn chip" id="aadd">Tambah</button></div></details>`:''}`}
function setPend(id){PEND=id;renderDash()}
document.addEventListener('click',e=>{const c=e.target.closest&&e.target.closest('.dcard');if(c){setPend(c.dataset.id);return}
const t=e.target.id;if(t=='dsave')saveGroom();else if(t=='dreset'){PEND=GSAVED||GSEL;dmsg('');renderDash()}
else if(t=='dopen'){const v=slug($('#dnew').value)||$('#dsel').value;if(v){curInv=v;PEND=null;dmsg('');if(DBH)subInv();else{subInv()}}}
else if(t=='dlive'){go('s1');$('#s1').classList.add('on')}
else if(t=='aadd')addAvatar()});
document.addEventListener('change',e=>{if(e.target.id=='dsel'){curInv=e.target.value;PEND=null;dmsg('');subInv()}});
async function addAvatar(){const f=$('#af').files[0],n=$('#an').value.trim();if(!f||!n){dmsg('Isi nama dan pilih file PNG/WebP transparan.',1);return}
try{const url=URL.createObjectURL(f),im=new Image();await new Promise((ok,no)=>{im.onload=ok;im.onerror=no;im.src=url});const c=cvs(320,576,()=>{}),x=c.getContext('2d'),s=Math.min(312/im.width,560/im.height);x.drawImage(im,(320-im.width*s)/2,568-im.height*s,im.width*s,im.height*s);
const uri=c.toDataURL('image/webp',.92),id=slug(n)+'-'+Date.now().toString(36);await DBH.doc('avatarCatalog/'+id).set({name:n,hair:$('#ah').value.trim(),skin:$('#as').value.trim(),acc:$('#aa').value.trim(),outfit:$('#ao').value.trim(),uri,createdAt:Date.now()});dmsg('Avatar baru ditambahkan ke koleksi.',0)}
catch(e){dmsg('Gagal menambah avatar ('+(e&&e.code||'error')+').',1)}}
(function buildDash(){const s=document.createElement('section');s.id='dash';s.className='scr';s.innerHTML='<div class="dwrap"><div class="dtop"><button class="btn g chip" id="dback">← Kembali</button><h1 class="serif">Dashboard Pelanggan</h1></div><p class="sub">Pilih karakter mempelai pria yang tampil di pelaminan Live Guest</p><div id="dbody"></div></div>';document.body.insertBefore(s,$('#live'));
const b=document.createElement('button');b.className='btn g chip';b.id='dopenbtn';b.textContent='⚙ Dashboard Pelanggan';b.style.cssText='position:absolute;top:12px;right:12px';$('#s1').appendChild(b);
b.onclick=()=>{go('dash');renderDash()};$('#dback').onclick=()=>go('s1')})();
GSAVED=LS('groom:'+curInv)||null;if(GSAVED&&!catById(GSAVED))GSAVED=null;PEND=GSAVED||GSEL;renderDash();initDB();
