// ===== v5: venue 3D bisa diputar 360 derajat (latar lukisan menjadi panorama silinder) =====
const PW=1672,CROPH=690,WR=42,THF=80*Math.PI/180,KB=.6;
CX=0;CY=0;
function paintURI(){const m=getComputedStyle(document.documentElement).getPropertyValue('--bgurl');const r=m.match(/url\(["']?(.*?)["']?\)\s*$/);return r&&r[1]}
function topFade(x,w,h,f){const g=x.createLinearGradient(0,0,0,h*f);g.addColorStop(0,'rgba(0,0,0,1)');g.addColorStop(1,'rgba(0,0,0,0)');x.save();x.globalCompositeOperation='destination-out';x.fillStyle=g;x.fillRect(0,0,w,h*f);x.restore()}
function flipped(src){const c=document.createElement('canvas');c.width=src.width;c.height=src.height;const x=c.getContext('2d');x.translate(c.width,0);x.scale(-1,1);x.drawImage(src,0,0);return c}
const EXT=170;
function paintCol(x,im,sx,sW,dx,dw,k,flip){x.save();if(flip){x.translate(dx+dw,0);x.scale(-1,1);dx=0}
 x.save();x.translate(0,EXT*k);x.scale(1,-1);x.drawImage(im,sx,0,sW,EXT,dx,0,dw,EXT*k);x.restore();
 x.drawImage(im,sx,0,sW,CROPH,dx,EXT*k,dw,CROPH*k);x.restore()}
function buildPano(im,tF,tB){
 const TH=CROPH+EXT,fc=document.createElement('canvas');fc.width=PW;fc.height=TH;const fx=fc.getContext('2d');paintCol(fx,im,0,PW,0,PW,1,false);topFade(fx,PW,TH,.12);
 const SW=420,WB=Math.round(PW*(2*Math.PI-THF)/THF*KB),half=Math.ceil(WB/2)+Math.round(170*KB),sw=SW*KB,hh=Math.round(TH*KB);
 const mkc=w=>{const c=document.createElement('canvas');c.width=w;c.height=hh;return c};
 const rc=mkc(half),rx=rc.getContext('2d'),lc=mkc(half),lx=lc.getContext('2d');
 for(let i=0;i*sw<half;i++){paintCol(rx,im,PW-SW,SW,i*sw,sw,KB,i%2==0);paintCol(lx,im,0,SW,half-(i+1)*sw,sw,KB,i%2==0)}
 const ov=2*half-WB,gr=rx.createLinearGradient(half-ov,0,half,0);gr.addColorStop(0,'rgba(0,0,0,1)');gr.addColorStop(1,'rgba(0,0,0,0)');rx.globalCompositeOperation='destination-in';rx.fillStyle=gr;rx.fillRect(0,0,half,hh);
 const bc=mkc(WB),bx=bc.getContext('2d');bx.drawImage(lc,WB-half,0);bx.drawImage(rc,0,0);topFade(bx,WB,hh,.12);
 const F=flipped(fc),B=flipped(bc);tF.image=F;tB.image=B;tF.needsUpdate=true;tB.needsUpdate=true}
function marble(){return cvs(256,256,(x,w,h)=>{x.fillStyle='#ecd5e2';x.fillRect(0,0,w,h);for(let r=0;r<4;r++)for(let c=0;c<2;c++){const o=(r%2)*64,l=88+Math.random()*10;x.fillStyle=`hsl(325,${30+Math.random()*10}%,${l}%)`;x.fillRect(c*128+o-128+2,r*64+2,124,60);x.fillRect(c*128+o+2,r*64+2,124,60)}x.strokeStyle='rgba(190,150,175,.55)';x.lineWidth=2;for(let r=0;r<=4;r++){x.beginPath();x.moveTo(0,r*64);x.lineTo(w,r*64);x.stroke()}for(let r=0;r<4;r++)for(let c=0;c<=2;c++){const xx=c*128+(r%2)*64;[xx,xx-128].forEach(v=>{x.beginPath();x.moveTo(v,r*64);x.lineTo(v,r*64+64);x.stroke()})}for(let i=0;i<14;i++){x.fillStyle=i%3?'rgba(246,176,198,.85)':'rgba(255,248,250,.9)';x.beginPath();x.ellipse(Math.random()*w,Math.random()*h,4,2.4,Math.random()*3,0,6.3);x.fill()}})}
const _ill5=illustrate;
illustrate=function(){const r=_ill5();
 const BM=(c,o)=>new THREE.MeshBasicMaterial(Object.assign({color:c},o||{}));
 sc.background=new THREE.CanvasTexture(cvs(8,256,(x,w,h)=>{const g=x.createLinearGradient(0,0,0,h);[['0','#b79be6'],['.45','#efb4d3'],['.8','#ffd9c9'],['1','#fff0d6']].forEach(s=>g.addColorStop(s[0],s[1]));x.fillStyle=g;x.fillRect(0,0,w,h)}));
 const arcH=WR*THF*(CROPH+EXT)/PW,tF=new THREE.Texture(),tB=new THREE.Texture();[tF,tB].forEach(t=>{t.minFilter=THREE.LinearFilter;t.generateMipmaps=false});
 const wm=t=>new THREE.MeshBasicMaterial({map:t,transparent:true,side:THREE.BackSide,depthWrite:false,fog:false});
 const wf=new THREE.Mesh(new THREE.CylinderGeometry(WR,WR,arcH,64,1,true,Math.PI-THF/2,THF),wm(tF)),wb=new THREE.Mesh(new THREE.CylinderGeometry(WR,WR,arcH,128,1,true,Math.PI+THF/2,2*Math.PI-THF),wm(tB));
 [wf,wb].forEach(m=>{m.position.y=arcH/2;m.renderOrder=-2;sc.add(m)});
 const u=paintURI();if(u){const im=new Image();im.onload=()=>buildPano(im,tF,tB);im.src=u}
 const dome=new THREE.Mesh(new THREE.SphereGeometry(250,32,16),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(cvs(8,256,(x,w,h)=>{const g=x.createLinearGradient(0,0,0,h);[['0','#7f66cf'],['.4','#a98be0'],['.5','#d9a6dc'],['.62','#f4b7cf'],['1','#ffe3cf']].forEach(s=>g.addColorStop(s[0],s[1]));x.fillStyle=g;x.fillRect(0,0,w,h)})),side:THREE.BackSide,fog:false,depthWrite:false}));dome.renderOrder=-5;sc.add(dome);
 const RING=['flowerbed','plant-palm','planter-box','plant-monstera','lamp-post','urn'],RW={'flowerbed':7.5,'plant-palm':3.6,'planter-box':5,'plant-monstera':3,'lamp-post':2.6,'urn':2.4};
 VL.ring=new THREE.Group();sc.add(VL.ring);let ri=0;for(let a=0;a<360;a+=7){const d=Math.min(Math.abs(a-180),360-Math.abs(a-180));if(d<38)continue;[[31,0],[36,3.5]].forEach(([rad,off],j)=>{const k=RING[(ri+j*2)%RING.length],c=dc(k),w=RW[k]*(1+((ri*37+j*11)%5)*.05),t=(a+off*2)*Math.PI/180,s=spr(c,w,w*c.height/c.width,Math.sin(t)*rad,0,Math.cos(t)*rad);VL.ring.add(s)});ri++}
 const mt=new THREE.CanvasTexture(marble());mt.wrapS=mt.wrapT=THREE.RepeatWrapping;mt.repeat.set(30,30);
 const gm=new THREE.Mesh(new THREE.CircleGeometry(WR+8,72),new THREE.MeshBasicMaterial({map:mt}));gm.rotation.x=-Math.PI/2;gm.position.y=-.01;gm.renderOrder=-3;sc.add(gm);
 const car=new THREE.Mesh(new THREE.PlaneGeometry(3.4,44),BM('#f4b6cb'));car.rotation.x=-Math.PI/2;car.position.set(0,.02,-9);sc.add(car);
 [-1.78,1.78].forEach(x=>{const e=new THREE.Mesh(new THREE.PlaneGeometry(.16,44),BM('#e8c46a'));e.rotation.x=-Math.PI/2;e.position.set(x,.025,-9);sc.add(e)});
 const SB=(w,h,d,x,y,z)=>{const side=BM('#ead5c8'),top=BM('#fbefe6'),m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),[side,side,top,side,side,side]);m.position.set(x,y,z);m.userData.area='stage';clk.push(m);sc.add(m);return m};
 SB(22,.45,11,0,.225,-34.5);SB(18,.9,8.4,0,.45,-35.8);SB(14,1.35,5.8,0,.675,-37.1);
 VL.deco.visible=true;VL.bg.visible=false;['gazebo0','arch0','pergola0','screen0'].forEach(id=>{if(VS[id])VS[id].visible=false});['board0','sign0','parasol0'].forEach(id=>{if(VS[id])VS[id].visible=true});
 const L=[['lamp0',-3.2,-9],['lamp1',3.2,-9],['lamp2',-3.2,-17],['lamp3',3.2,-17],['lamp4',-3.2,-25],['lamp5',3.2,-25],['lamp6',-17,-12],['lamp7',17,-12],
 ['urn0',-9,-30],['urn1',9,-30],['urn2',-5.6,-28.2],['urn3',5.6,-28.2],['lan10',-2.2,-28.4],['lan11',2.2,-28.4],['lan20',-6.6,-28.4],['lan21',6.6,-28.4],
 ['flowerbed0',-14,-22],['flowerbed1',14,-22],['flowerbed2',0,-31],['palm0',-13,-29],['palm1',13,-29],['palm2',-17,-4],['monst0',-17,3],['monst1',17,-1.5],['monst2',17.5,9],
 ['planter0',-18,11],['planter1',18,11],['planter2',-3.8,12],['planter3',3.8,12],['stanchion0',-3.4,7],['stanchion1',3.4,7],['board0',2.6,7.8],['sign0',-2.8,8.4],['parasol0',15.5,3]];
 L.forEach(([id,x,z])=>relayout(id,x,z));
 for(let i=tables.length-1;i>=0;i--)if(tables[i][1]<-14)tables.splice(i,1);
 const SET={stage:[0,-27],resepsi:[0,-.5],galeri:[-16,-6],video:[16,-6],buku:[0,6.5],booth:[3,5.5],istirahat:[14,5],kuliner:[-11,6]};AREAS.forEach(a=>{const p=SET[a.id];if(p){a.x=p[0];a.z=p[1]}});
 coupleEnts().forEach((e,i)=>{e.g.scale.setScalar(1.6);e.g.position.set(i?1.3:-1.3,1.35,-36.2);e.ly=4.5});
 return r};
function rs(){if(!R)return;const p=port();W=p?innerHeight:innerWidth;H=p?innerWidth:innerHeight;CX=0;CY=0;$('#cv').style.cssText='';R.setPixelRatio(Math.min(devicePixelRatio||1,W<900?1.5:2));R.setSize(W,H,false);cam.fov=50;cam.near=.1;cam.far=300;cam.aspect=W/H;cam.updateProjectionMatrix()}
function move(e,mx,mz,s){let x=e.g.position.x+mx*s,z=e.g.position.z+mz*s;x=Math.max(-19,Math.min(19,x));z=Math.max(-27.5,Math.min(12,z));for(const[tx,tz]of tables){const dx=x-tx,dz=z-tz,d=Math.hypot(dx,dz);if(d<1.9&&d>1e-4){x=tx+dx/d*1.9;z=tz+dz/d*1.9}}e.g.position.x=x;e.g.position.z=z;e.g.rotation.y=Math.atan2(mx,mz);e.mv=1}
function goArea(id){const a=AREAS.find(a=>a.id==id);if(!a)return;auto={x:a.x,z:a.z,id,t:0};yawT=0;closeM();if(innerHeight<560)$('#map').classList.add('c')}
function tick(){requestAnimationFrame(tick);const dt=Math.min(clock.getDelta(),.05),t=clock.elapsedTime;if(!R)return;
if(keys.q)yaw+=1.6*dt;if(keys.e)yaw-=1.6*dt;
let ix=(keys.d||keys.arrowright?1:0)-(keys.a||keys.arrowleft?1:0)+joy.x,iy=(keys.w||keys.arrowup?1:0)-(keys.s||keys.arrowdown?1:0)+joy.y;const L=Math.hypot(ix,iy);
if(L>.1){if(L>1){ix/=L;iy/=L}auto=null;move(P,-Math.sin(yaw)*iy+Math.cos(yaw)*ix,-Math.cos(yaw)*iy-Math.sin(yaw)*ix,5*dt)}
else if(auto){const dx=auto.x-P.g.position.x,dz=auto.z-P.g.position.z,d=Math.hypot(dx,dz);auto.t+=dt;if(d<.4||auto.t>12){const i=auto.id;auto=null;arrive(i)}else move(P,dx/d,dz/d,5*dt)}
bots.forEach(b=>{const dx=b.tx-b.g.position.x,dz=b.tz-b.g.position.z,d=Math.hypot(dx,dz);if(d<.4){if(Math.random()<.01){b.tx=(Math.random()-.5)*30;b.tz=Math.random()*20-8}}else move(b,dx/d,dz/d,1.5*dt)});
if(yawT!==null)yaw+=(yawT-yaw)*.04;
ents.forEach(e=>{const l=e.g.userData.legs;if(l&&l.length){const w=e.mv?Math.sin(t*10+(e.s||0))*.6:0;l[0].rotation.x+=(w-l[0].rotation.x)*.3;l[1].rotation.x+=(-w-l[1].rotation.x)*.3}if(!e.static)e.g.position.y=.1+(e.mv?Math.abs(Math.sin(t*10))*.08:Math.sin(t*2+(e.s||0))*.03);e.mv=0;
if(e.el){const v=new THREE.Vector3(e.g.position.x,e.g.position.y+(e.ly||2.5),e.g.position.z).project(cam);e.el.style.display=v.z>1?'none':'block';e.el.style.transform=`translate(${(v.x*.5+.5)*W}px,${(-v.y*.5+.5)*H}px) translate(-50%,-100%)`}});
const p=P.g.position,h=2.4+dist*.22;cam.position.lerp(new THREE.Vector3(p.x+Math.sin(yaw)*dist,h,p.z+Math.cos(yaw)*dist),.12);cam.lookAt(p.x,2.6,p.z);
R.render(sc,cam)}
function pick(e){const[lx,ly]=port()?[e.clientY,innerWidth-e.clientX]:[e.clientX,e.clientY];ray.setFromCamera({x:lx/W*2-1,y:-(ly/H*2-1)},cam);const h=ray.intersectObjects(ents.map(e=>e.g).concat(clk),true)[0];if(!h)return;let o=h.object;while(o){const en=ents.find(x=>x.g===o);if(en&&en!==P&&!en.static)return prof(en);if(o.userData.area)return goArea(o.userData.area);o=o.parent}}
document.head.appendChild(Object.assign(document.createElement('style'),{textContent:'#live{background:#2b2150!important}#hint{position:absolute;top:56px;left:50%;transform:translateX(-50%);z-index:6;pointer-events:none;background:rgba(30,30,70,.85);color:#fff;font:600 12px Inter,sans-serif;padding:6px 14px;border-radius:99px;transition:opacity 1s}'}));
{const h=document.createElement('div');h.id='hint';h.textContent='↔ Geser layar untuk memutar 360° · scroll untuk zoom';$('#live').appendChild(h);const hide=()=>{h.style.opacity=0};setTimeout(hide,7000);$('#live').addEventListener('pointermove',e=>{if(e.buttons)hide()},{once:false})}
