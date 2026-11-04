(function(){
var d=document,$=function(s,r){return(r||d).querySelector(s)},$$=function(s,r){return Array.prototype.slice.call((r||d).querySelectorAll(s))};
d.documentElement.classList.add('js');
var APP={signup:'/daftar',login:'/masuk',whatsapp:''}; /* isi saat pendaftaran/login/WhatsApp siap; kosong = dialog informasi */
var PLAN={essential:['Essential',79000],signature:['Signature',149000],luxe:['Luxe',249000]};
var EVL={pernikahan:'Pernikahan',ulangtahun:'Ulang Tahun',wisuda:'Wisuda',seminar:'Seminar & Workshop',corporate:'Corporate Event',lainnya:'Lainnya'};
var TPL={'romantic-garden':'Romantic Garden','jawa-tengah':'Adat Jawa Tengah'};
function store(k,v){try{if(v===undefined)return JSON.parse(localStorage.getItem(k));localStorage.setItem(k,JSON.stringify(v))}catch(e){return null}}
/* menu mobile */
var burger=$('#burger'),menu=$('#menu');
function menuSet(o){menu.classList.toggle('open',o);burger.setAttribute('aria-expanded',o);burger.setAttribute('aria-label',o?'Tutup menu':'Buka menu')}
burger.addEventListener('click',function(){menuSet(!menu.classList.contains('open'))});
$$('#menu a').forEach(function(a){a.addEventListener('click',function(){menuSet(false)})});
d.addEventListener('keydown',function(e){if(e.key==='Escape')menuSet(false)});
/* nav aktif */
var secs=['beranda','fitur','template','harga','bantuan'].map(function(i){return d.getElementById(i)}).filter(Boolean),links=$$('[data-nav]');
function spy(){var y=innerHeight*.35,cur='beranda';secs.forEach(function(s){if(s.getBoundingClientRect().top<y)cur=s.id});links.forEach(function(a){a.classList.toggle('on',a.getAttribute('href')==='#'+cur)})}
addEventListener('scroll',spy,{passive:true});spy();
/* hero: pergantian tema */
var hs=$$('#hs img'),hp=$$('#hp img'),hn=$('#hn'),names=['Romantic Garden','Adat Jawa Tengah'],hi=0,hold=false;
function hero(i){hs.forEach(function(x,j){x.classList.toggle('on',j===i)});hp.forEach(function(x,j){x.classList.toggle('on',j===i)});hn.textContent=names[i]}
if(!matchMedia('(prefers-reduced-motion:reduce)').matches){var dv=$('.devs');dv.addEventListener('pointerenter',function(){hold=true});dv.addEventListener('pointerleave',function(){hold=false});setInterval(function(){if(hold||d.hidden)return;hi=(hi+1)%hs.length;hero(hi)},4200)}
/* filter template per jenis acara */
var tcards=$$('.tcard'),tcount=$('#tcount'),treset=$('#treset'),tnote=$('#tnote'),evb=$$('.ev'),flt=null;
function filt(id){flt=flt===id?null:id;evb.forEach(function(b){b.setAttribute('aria-pressed',b.dataset.ev===flt)});
 var n=0;tcards.forEach(function(c){var soon=c.classList.contains('soon'),match=!flt||c.dataset.ev.split(' ').indexOf(flt)>-1;if(!soon){c.classList.toggle('dim',!!flt&&!match);if(!flt||match)n++}else c.classList.remove('dim')});
 tcount.textContent=flt?(n?n+' template untuk '+EVL[flt]:'Belum ada template khusus '+EVL[flt]):'2 template tersedia';
 treset.hidden=!flt;tnote.hidden=!(flt&&!n);if(flt&&!n)tnote.textContent='Template khusus '+EVL[flt]+' sedang disiapkan. Anda tetap bisa memakai template yang ada dan menyesuaikan teksnya, atau beri tahu kami acara yang Anda rencanakan.';
 if(flt)$('#template').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'auto':'smooth'})}
evb.forEach(function(b){b.addEventListener('click',function(){filt(b.dataset.ev)})});treset.addEventListener('click',function(){filt(flt)});
/* pratinjau desktop / ponsel */
$$('.tcard .vt').forEach(function(g){var tv=g.parentNode,img=$('img',tv);$$('button',g).forEach(function(b){b.addEventListener('click',function(){var m=b.dataset.v==='m';$$('button',g).forEach(function(x){x.classList.toggle('on',x===b)});img.src=m?img.dataset.m:img.dataset.d;tv.classList.toggle('ph',m)})})});
/* dialog */
var dlg=$('#dlg'),pS=$('#pane-start'),pI=$('#pane-info'),fEv=$('#f-ev'),fTp=$('#f-tp'),sum=$('#sum'),okm=$('#okmsg'),bGo=$('#b-go'),bWa=$('#b-wa'),note=$('#appnote');
function plan(){var r=$('input[name=plan]:checked');return r?r.value:'signature'}
function summary(){var p=PLAN[plan()],t=fTp.value?TPL[fTp.value]:'Belum memilih';var s='Jenis acara: '+EVL[fEv.value]+'\nTemplate: '+t+'\nPaket: '+p[0]+' (Rp'+p[1].toLocaleString('id-ID')+')';return s}
function render(){var p=PLAN[plan()],t=fTp.value?TPL[fTp.value]:'Belum memilih';sum.innerHTML='<b>Ringkasan</b><br>Acara: '+EVL[fEv.value]+'<br>Template: '+t+'<br>Paket: '+p[0]+' &middot; Rp'+p[1].toLocaleString('id-ID');okm.textContent='';
 store('nm:pilihan',{ev:fEv.value,tpl:fTp.value,plan:plan()});
 var q='?acara='+encodeURIComponent(fEv.value)+'&template='+encodeURIComponent(fTp.value)+'&paket='+plan();
 if(APP.signup){bGo.hidden=false;bGo.href=APP.signup+q;note.hidden=true}else{bGo.hidden=true;note.hidden=false}
 if(APP.whatsapp){bWa.hidden=false;bWa.href='https://wa.me/'+APP.whatsapp+'?text='+encodeURIComponent('Halo NusaMora, saya ingin membuat undangan.\n'+summary())}else bWa.hidden=true}
function show(mode,o){o=o||{};
 if(mode==='login'&&APP.login){location.href=APP.login;return}
 if(mode==='start'){pS.hidden=false;pI.hidden=true;var s=store('nm:pilihan')||{};fEv.value=o.ev||s.ev||'pernikahan';fTp.value=o.tpl!==undefined?o.tpl:(s.tpl||'');var pl=o.plan||s.plan||'signature',r=$('input[name=plan][value='+pl+']');if(r)r.checked=true;render()}
 else{pS.hidden=true;pI.hidden=false;if(mode==='login'){$('#it').textContent='Masuk ke dashboard';$('#ib').textContent='Login dashboard pelanggan dibuka bersamaan dengan pendaftaran akun, yang sedang kami siapkan. Sementara ini Anda bisa mencoba demo template tanpa login.'}else{$('#it').textContent=o.doc||'Dokumen';$('#ib').textContent=(o.doc||'Dokumen')+' sedang disusun dan akan dipublikasikan sebelum pelanggan pertama menggunakan layanan. Dokumen ini wajib ada karena undangan menyimpan data pribadi tamu.'}}
 if(typeof dlg.showModal==='function'){if(!dlg.open)dlg.showModal()}else dlg.setAttribute('open','')}
d.addEventListener('click',function(e){var t=e.target.closest('[data-open]');if(!t)return;e.preventDefault();var m=t.dataset.open;show(m,{tpl:t.dataset.tpl,plan:t.dataset.plan,doc:t.dataset.doc,ev:t.closest('.tcard')&&t.dataset.tpl?(TPL_EV[t.dataset.tpl]||undefined):undefined})});
var TPL_EV={'romantic-garden':'pernikahan','jawa-tengah':'pernikahan'};
[fEv,fTp].forEach(function(x){x.addEventListener('change',render)});$$('input[name=plan]').forEach(function(x){x.addEventListener('change',render)});
$('#b-close').addEventListener('click',function(){dlg.close()});
dlg.addEventListener('click',function(e){if(e.target===dlg)dlg.close()});
$('#b-copy').addEventListener('click',function(){var txt='NusaMora - rencana undangan\n'+summary();
 function done(){okm.textContent='Ringkasan disalin.'}function fb(){var ta=d.createElement('textarea');ta.value=txt;ta.setAttribute('readonly','');ta.style.cssText='position:fixed;opacity:0';d.body.appendChild(ta);ta.select();try{d.execCommand('copy')?done():okm.textContent='Salin manual: '+txt.replace(/\n/g,' | ')}catch(er){okm.textContent='Salin manual: '+txt.replace(/\n/g,' | ')}ta.remove()}
 try{navigator.clipboard.writeText(txt).then(done,fb)}catch(er){fb()}});
/* muncul halus saat scroll */
if('IntersectionObserver' in window&&!matchMedia('(prefers-reduced-motion:reduce)').matches){var io=new IntersectionObserver(function(es){es.forEach(function(en){if(en.isIntersecting){en.target.classList.remove('pre');io.unobserve(en.target)}})},{rootMargin:'0px 0px -6% 0px'});
 $$('.rv').forEach(function(el){if(el.getBoundingClientRect().top>innerHeight){el.classList.add('pre');io.observe(el)}})}
/* bar CTA mobile disembunyikan saat CTA akhir terlihat */
var mb=$('#mbar'),fin=$('.fin');if(mb&&fin&&'IntersectionObserver' in window){new IntersectionObserver(function(es){mb.classList.toggle('hide',es[0].isIntersecting)}).observe(fin)}
})();
