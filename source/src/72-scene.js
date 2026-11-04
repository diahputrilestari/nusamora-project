// ===== NM:module scene — aset 3D khusus lingkungan (mis. pelaminan & meja makan tema Jawa Tengah) =====
// Data: NM_SCENES[env] di 10-config.js. Env tanpa scene = Live Guest bawaan (tidak diubah sama sekali).
(function(){
 const SCN=typeof NM_SCENES!=='undefined'?NM_SCENES:{};
 // 1) Latar Live Guest mengikuti lukisan env aktif (aturan CSS lama bisa menimpa menjadi polos; ini memastikannya terlihat)
 document.head.appendChild(Object.assign(document.createElement('style'),{textContent:'#live{background:#000 var(--bgurl) center/cover no-repeat!important}'}));
 let BG0=null;try{BG0=getComputedStyle(document.documentElement).getPropertyValue('--bgurl')||null}catch(e){}
 const CV={};
 function img(env,k){const key=env+':'+k;if(CV[key])return CV[key];const d=SCN[env].imgs[k],c=cvs(d.w,d.h,()=>{}),im=new Image();
  im.onload=()=>{c.getContext('2d').drawImage(im,0,0);if(c.t)c.t.needsUpdate=true};im.src=d.uri;return CV[key]=c}
 let added=[],removed=[],areaOld=[],brideOrig=null;           // sprite tambahan & sprite bawaan yang disembunyikan (dengan status klik)
 function hide(s){if(!s||s.__nmh)return;s.__nmh=1;s.visible=false;const i=clk.indexOf(s);removed.push([s,i>=0]);if(i>=0)clk.splice(i,1)}
 function restore(){if(brideOrig){const e=coupleEnts()[0];if(e){e.g.children.slice().forEach(c=>e.g.remove(c));brideOrig.kids.forEach(c=>e.g.add(c));e.a=brideOrig.a}brideOrig=null}areaOld.forEach(([a,x,z])=>{a.x=x;a.z=z});areaOld=[];removed.forEach(([s,wasClk])=>{s.visible=true;delete s.__nmh;if(wasClk&&clk.indexOf(s)<0)clk.push(s)});removed=[];
  added.forEach(s=>{if(s.parent)s.parent.remove(s);const i=clk.indexOf(s);if(i>=0)clk.splice(i,1)});added=[];
  const ce=coupleEnts();ce.forEach(e=>{e.g.scale.setScalar(3.4);e.g.position.z=-24;e.ly=9.2})}
 function add(c,w,x,y,z,area){const h=w*c.height/c.width,s=spr(c,w,h,x,y,z);if(area){s.userData.area=area;clk.push(s)}sc.add(s);added.push(s);return s}
 // avatar tamu per-tema (mis. kebaya & hijab untuk Jawa Tengah); tema lain kembali ke avatar bawaan
 const AV0={},NA0={};
 function guests(def){
  ['L','P'].forEach(g=>{
   const src=def&&def.guests&&def.guests[g];
   if(src&&src.length){if(!AV0[g]){AV0[g]=AV[g];NA0[g]=NA[g]}AV[g]=src.map(o=>({img:o.uri,id:o.id}));NA[g]=src.map(o=>o.name);AV[g].forEach(a=>chibiC(a))}
   else if(AV0[g]){AV[g]=AV0[g];NA[g]=NA0[g];delete AV0[g];delete NA0[g]}
  });
  try{if(!(S.i>=0&&S.i<AV[S.g].length))S.i=0;rAv()}catch(e){}
 }
 // katalog pengantin pria per-tema: GCAT dibangun dari daftar tema (+ avatar kustom dari database)
 let NMGR=null;const _rc=rebuildCat;
 rebuildCat=function(){if(NMGR){GCAT=NMGR.concat(CUSTOM.filter(c=>c.uri&&!NMGR.some(b=>b.id==c.id)))}else _rc()};
 function grooms(def){const list=def&&def.grooms&&def.grooms.length?def.grooms:null;
  const had=!!NMGR;NMGR=list;if(!list&&!had)return;
  rebuildCat();GSEL=(list||GBUILT)[0].id;if(GSAVED&&!catById(GSAVED))GSAVED=null;PEND=null;
  try{if(typeof ents!=='undefined'&&coupleEnts()[1])applyGroom(GSAVED||GSEL)}catch(e){}
  try{renderDash()}catch(e){}}
 const TPS=[[-11.5,-3],[-5.2,-3],[5.2,-3],[11.5,-3],[-9,3.2],[9,3.2]];
 function apply(){
  let th=null;try{th=NM.cur&&NM.cur.theme}catch(e){}
  const env=th&&th.env,def=env&&SCN[env];
  try{const e2=env&&NM.envs[env];document.documentElement.style.setProperty('--bgurl',e2&&e2.painting?`url("${e2.painting}")`:(BG0||''))}catch(e){}
  try{guests(def)}catch(e){console.warn('guests',e)}
  try{grooms(def)}catch(e){console.warn('grooms',e)}
  if(typeof R==='undefined'||!R||!VL.meja)return;
  restore();
  if(!def)return;
  try{
   (def.hideLayers||['pelaminan','meja']).forEach(n=>{const g=VL[n];if(g)g.children.forEach(s=>{if(s.isSprite)hide(s)})});
   (def.hide||[]).forEach(id=>hide(VS[id]));
   const st=def.stage;if(st)add(img(env,st.k),st.w,st.x,st.y||0,st.z,'stage');
   const tb=def.table;if(tb)TPS.forEach(([x,z])=>add(img(env,tb.k),tb.w,x,tb.y||0,z,'resepsi'));
   Object.keys(def.areas||{}).forEach(id=>{const a=AREAS.find(a=>a.id==id);if(a){areaOld.push([a,a.x,a.z]);a.x=def.areas[id][0];a.z=def.areas[id][1]}});
   (def.items||[]).forEach(o=>add(img(env,o.k),o.w,o.x,o.y||0,o.z,o.area));
   if(def.brides&&def.brides.length){const e=coupleEnts()[0],b=def.brides[def.brideSel||0]||def.brides[0];
    if(e&&b){brideOrig={kids:e.g.children.slice(),a:e.a};e.g.children.slice().forEach(c=>e.g.remove(c));e.g.add(spr(chibiC({img:b.uri,id:b.id}),1.45,2.6,0,0,0));e.a={img:b.uri}}}
   const cp=def.couple;if(cp)coupleEnts().forEach(e=>{e.g.scale.setScalar(cp.scale);e.g.position.z=cp.z;e.ly=cp.ly});
  }catch(e){console.warn('scene',e)}
 }
 const _ill=illustrate;
 illustrate=function(){const r=_ill.apply(this,arguments);try{apply()}catch(e){console.warn('scene',e)}return r};
 NM.on(apply);window.NMSC={added:()=>added.length,hidden:()=>removed.length,apply};
})();
