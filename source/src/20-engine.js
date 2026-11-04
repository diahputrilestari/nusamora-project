// ===== NM:module engine — registri tema/event/environment, token CSS turunan, penerapan tema otomatis, tema dari database =====
document.head.appendChild(Object.assign(document.createElement('link'),{rel:'stylesheet',href:'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;1,600&family=Cinzel:wght@500;600&family=Fredoka:wght@500;600&display=swap'}));
const NM=(()=>{
 const ORN=['sprig','blossom','diamond','mandala','leaf','line','confetti','sparkle','rings','batik'],COLORS=['ivory','white','soft','soft2','accent','deep','ink','mute','line'],OKS=/^[#\w\s().,%"'\-+]*$/;
 const clean=v=>typeof v=='string'&&v.length<160&&OKS.test(v)&&!/url\s*\(|expression|@import/i.test(v);
 const hex=h=>{h=String(h).trim();let m=h.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);if(!m)return null;h=m[1];if(h.length==3)h=h.replace(/./g,'$&$&');return[0,2,4].map(i=>parseInt(h.substr(i,2),16))};
 const toHex=a=>'#'+a.map(v=>Math.max(0,Math.min(255,Math.round(v))).toString(16).padStart(2,'0')).join('');
 const mix=(a,b,t)=>{const x=hex(a),y=hex(b);return x&&y?toHex(x.map((v,i)=>v*(1-t)+y[i]*t)):a};
 const lum=h=>{const c=hex(h);return c?(.2126*c[0]+.7152*c[1]+.0722*c[2])/255:.5};
 const rgbs=h=>(hex(h)||[0,0,0]).join(',');
 const alpha=(c,a)=>{const m=String(c).match(/rgba?\(([^)]+)\)/);if(!m)return c;const p=m[1].split(',').map(s=>s.trim());return`rgba(${p[0]},${p[1]},${p[2]},${a})`};
 const S={themes:{},events:{},envs:{},cur:null,subs:[],dbIds:new Set()};
 const def=()=>S.themes['romantic-garden'];
 function regEnv(id,c){if(!/^[\w-]{1,40}$/.test(id)||!c)return;const p=c.painting;S.envs[id]={name:String(c.name||id).slice(0,40),painting:typeof p=='string'&&/^(data:image\/(png|webp|jpeg);base64,|https:\/\/)/.test(p)?p:null,pos:clean(c.pos)?c.pos:'center 38%'}}
 function regEvent(id,c){if(!/^[\w-]{1,40}$/.test(id)||!c||typeof c!='object')return;S.events[id]=c}
 function regTheme(id,c){if(!/^[\w-]{1,48}$/.test(id)||!c||typeof c!='object')return false;const b=S.themes['romantic-garden']||{ui:{},mono:{},hud:{},scr:{}};
  const pick=(src,base)=>{const o=Object.assign({},base);Object.keys(src||{}).forEach(k=>{const v=src[k];if(typeof v=='number'&&isFinite(v))o[k]=v;else if(typeof v=='string'&&clean(v))o[k]=v});return o};
  const ui=pick(c.ui,b.ui);COLORS.forEach(k=>{if(!hex(ui[k]))ui[k]=b.ui[k]});ui.rad=Math.max(0,Math.min(40,+ui.rad||20));ui.btnr=Math.max(0,Math.min(999,+ui.btnr||0));ui.btnt=ui.btnt=='uppercase'?'uppercase':'none';
  const evs=(Array.isArray(c.events)?c.events:[]).filter(e=>S.events[e]);
  S.themes[id]={id,name:String(c.name||id).slice(0,40),events:evs.length?evs:Object.keys(S.events),env:S.envs[c.env]?c.env:'garden',orn:ORN.includes(c.orn)?c.orn:'line',dark:!!c.dark||lum(ui.ivory)<.35,ui,mono:pick(c.mono,b.mono),hud:pick(c.hud,b.hud),scr:pick(c.scr,b.scr),copy:(c.copy&&typeof c.copy=='object')?{s2h:String(c.copy.s2h||'').slice(0,40),s2s:String(c.copy.s2s||'').slice(0,60)}:{}};return true}
 const api={themes:S.themes,events:S.events,envs:S.envs,ORN,hex,mix,lum,alpha,
  registerEnv:regEnv,registerEvent:regEvent,registerTheme(id,c){const ok=regTheme(id,c);if(ok)api.refresh();return ok},
  unregisterTheme(id){if(id!='romantic-garden'&&S.themes[id]){delete S.themes[id];api.refresh()}},
  event(id){return S.events[id]||S.events.wedding},eventId(id){return S.events[id]?id:'wedding'},
  theme(id){return S.themes[id]||null},
  forEvent(ev){return Object.keys(S.themes).filter(k=>S.themes[k].events.includes(ev))},
  resolve(src){src=src||{};const ev=api.eventId(src.eventType),e=S.events[ev];let t=S.themes[src.theme]&&S.themes[src.theme].events.includes(ev)?src.theme:null;if(!t)t=S.themes[e.defaultTheme]?e.defaultTheme:'romantic-garden';return{ev,theme:t}},
  on(fn){S.subs.push(fn)},refresh(){S.subs.forEach(f=>{try{f()}catch(e){console.warn('NM',e)}})},
  tokens(id){const th=S.themes[id]||def(),u=th.ui,d=th.dark,m=th.mono,h=th.hud,sc=th.scr,env=S.envs[th.env]||S.envs.garden,T={};
   T['--nm-ivory']=u.ivory;T['--nm-white']=u.white;T['--nm-soft']=u.soft;T['--nm-soft2']=u.soft2;T['--nm-accent']=u.accent;T['--nm-deep']=u.deep;T['--nm-ink']=u.ink;T['--nm-mute']=u.mute;T['--nm-line']=u.line;
   T['--nm-serif']=u.serif;T['--nm-sans']=u.sans;T['--nm-rad']=u.rad+'px';T['--nm-btnr']=u.btnr+'px';T['--nm-btnt']=u.btnt;T['--nm-btnls']=u.btnls||'.03em';
   T['--nm-onaccent']=lum(u.accent)>.6?'#1a1a1a':'#ffffff';T['--nm-err']=d?'#F08AA8':'#A24B6A';T['--nm-ok']=d?'#8FD0A4':'#4F735E';T['--nm-errbg']=d?'#3A1F2A':'#F6E9EE';T['--nm-okbg']=d?'#1E3326':'#EAF1EC';
   T['--nm-overlay']=d?'rgba(0,0,0,.62)':`rgba(${rgbs(u.ink)},.38)`;T['--nm-focus']=d?u.accent:mix(u.accent,'#ffffff',.5);T['--nm-focus2']=mix(u.accent,u.ivory,.7);
   T['--nm-t0']=u.t0&&hex(u.t0)?u.t0:u.soft;T['--nm-t1']=u.t1&&hex(u.t1)?u.t1:mix(u.soft2,u.ivory,.55);T['--nm-t2']=u.t2&&hex(u.t2)?u.t2:mix(u.soft,u.soft2,.5);
   T['--hud-bg']=h.bg;T['--hud-bg2']=alpha(h.bg,.88);T['--hud-acc']=h.acc;T['--hud-on']=h.on;
   T['--wine']=sc.wine||u.accent;T['--gold']=h.acc;T['--bg']=u.ivory;T['--card']=u.white;T['--ink']=u.ink;T['--mute']=u.mute;T['--line']=u.line;
   T['--nm-veil']=sc.veil||rgbs(u.ivory);T['--nm-env-pos']=env.pos;T['--nm-env-bg']=env.painting?`url("${env.painting}")`:'var(--bgurl)';return T},
  apply(themeId,evId){const T=api.tokens(themeId),r=document.documentElement,th=S.themes[themeId]||def();Object.keys(T).forEach(k=>r.style.setProperty(k,T[k]));
   const env=S.envs[th.env]||S.envs.garden;if(env.painting&&typeof R==='undefined')r.style.setProperty('--bgurl',`url("${env.painting}")`);
   r.dataset.nmTheme=themeId;r.dataset.nmEvent=evId;r.dataset.nmDark=th.dark?'1':'0';S.cur={themeId,evId,theme:th,event:api.event(evId)};return S.cur},
  get cur(){return S.cur},
  // tema tambahan dari database (koleksi `liveThemes`, tulis: admin). Dokumen = objek tema yang sama dengan NM_THEMES.
  bindDB(db){try{db.collection('liveThemes').onSnapshot(snap=>{const seen=new Set();snap.docs.forEach(d=>{if(regTheme(d.id,d.data())){seen.add(d.id);S.dbIds.add(d.id)}});S.dbIds.forEach(id=>{if(!seen.has(id)){delete S.themes[id];S.dbIds.delete(id)}});api.refresh()},()=>{})}catch(e){}}};
 Object.keys(NM_ENVS).forEach(k=>regEnv(k,NM_ENVS[k]));Object.keys(NM_EVENTS).forEach(k=>regEvent(k,NM_EVENTS[k]));
 Object.keys(NM_THEMES).forEach(k=>{if(k=='romantic-garden'){const c=NM_THEMES[k];S.themes[k]={id:k,name:c.name,events:c.events,env:c.env,orn:c.orn,dark:false,ui:c.ui,mono:c.mono,hud:c.hud,scr:c.scr}}});
 Object.keys(NM_THEMES).forEach(k=>{if(k!='romantic-garden')regTheme(k,NM_THEMES[k])});
 // tema bawaan: pastikan daftar event tidak hilang bila tema merujuk event kustom yang belum terdaftar
 return api})();
window.NM=NM;
// bind koleksi liveThemes begitu database siap (tidak mengubah initDB)
{let n=0;const t=setInterval(()=>{if(typeof DBH!=='undefined'&&DBH){clearInterval(t);NM.bindDB(DBH)}else if(++n>60)clearInterval(t)},400)}
