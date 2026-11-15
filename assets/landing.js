(function(){
var d=document,$=function(s,r){return(r||d).querySelector(s)},$$=function(s,r){return Array.prototype.slice.call((r||d).querySelectorAll(s))};
d.documentElement.classList.add('js');
var APP={signup:'/daftar',login:'/masuk',email:'support@nusamora.com'}; /* isi saat pendaftaran/login/WhatsApp siap; kosong = dialog informasi */
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
function totalTxt(){return $$('.tcard:not(.soon)').length+' template tersedia'}
var tcount=$('#tcount'),treset=$('#treset'),tnote=$('#tnote'),evb=$$('.ev'),flt=null;
function filt(id){flt=flt===id?null:id;evb.forEach(function(b){b.setAttribute('aria-pressed',b.dataset.ev===flt)});
 var n=0;$$('.tcard').forEach(function(c){var soon=c.classList.contains('soon'),match=!flt||c.dataset.ev.split(' ').indexOf(flt)>-1;if(!soon){c.classList.toggle('dim',!!flt&&!match);if(!flt||match)n++}else c.classList.remove('dim')});
 tcount.textContent=flt?(n?n+' template untuk '+EVL[flt]:'Belum ada template khusus '+EVL[flt]):totalTxt();
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
 if(bWa){bWa.hidden=false;bWa.textContent='Hubungi via Email';bWa.removeAttribute('target');bWa.removeAttribute('rel');bWa.href='mailto:'+APP.email+'?subject='+encodeURIComponent('Pertanyaan undangan NusaMora')+'&body='+encodeURIComponent('Halo NusaMora, saya ingin membuat undangan.\n'+summary())}}
function show(mode,o){o=o||{};
 if(mode==='login'&&APP.login){location.href=APP.login;return}
 if(mode==='start'){pS.hidden=false;pI.hidden=true;var s=store('nm:pilihan')||{};fEv.value=o.ev||s.ev||'pernikahan';fTp.value=o.tpl!==undefined?o.tpl:(s.tpl||'');var pl=o.plan||s.plan||'signature',r=$('input[name=plan][value='+pl+']');if(r)r.checked=true;render()}
 else{pS.hidden=true;pI.hidden=false;if(mode==='login'){$('#it').textContent='Masuk ke dashboard';$('#ib').textContent='Login dashboard pelanggan dibuka bersamaan dengan pendaftaran akun, yang sedang kami siapkan. Sementara ini Anda bisa mencoba demo template tanpa login.'}else{$('#it').textContent=o.doc||'Dokumen';$('#ib').textContent=(o.doc||'Dokumen')+' sedang disusun dan akan dipublikasikan sebelum pelanggan pertama menggunakan layanan. Dokumen ini wajib ada karena undangan menyimpan data pribadi tamu.'}}
 if(typeof dlg.showModal==='function'){if(!dlg.open)dlg.showModal()}else dlg.setAttribute('open','')}
/* CTA "Buat Undangan" / "Gunakan Template" / "Pilih paket": langsung ke pendaftaran (belum masuk) atau ke pemilihan paket & katalog (sudah masuk), tanpa dialog */
function loggedIn(){try{for(var i=0;i<localStorage.length;i++){var k=localStorage.key(i);if(/^sb-.*-auth-token$/.test(k)&&localStorage.getItem(k))return true}}catch(e){}return false}
function goStart(t){var qs=[];if(t.dataset.tpl)qs.push('template='+encodeURIComponent(t.dataset.tpl));if(t.dataset.plan&&PLAN[t.dataset.plan])qs.push('paket='+encodeURIComponent(t.dataset.plan));
 location.href=(loggedIn()?'/paket':(APP.signup||'/daftar'))+(qs.length?'?'+qs.join('&'):'')}
d.addEventListener('click',function(e){var t=e.target.closest('[data-open]');if(!t)return;e.preventDefault();var m=t.dataset.open;
 if(m==='start'&&!t.closest('.tcard.soon')){goStart(t);return}
 show(m,{tpl:t.dataset.tpl,plan:t.dataset.plan,doc:t.dataset.doc,ev:t.closest('.tcard')&&t.dataset.tpl?(TPL_EV[t.dataset.tpl]||undefined):undefined})});
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
/* kontak resmi: email bisnis (menggantikan WhatsApp) */
(function(){var M=APP.email;
 if(bWa){bWa.textContent='Hubungi via Email';bWa.removeAttribute('target');bWa.removeAttribute('rel');bWa.href='mailto:'+M;bWa.hidden=false}
 $$('#bantuan p').forEach(function(p){if(/Kanal bantuan resmi/.test(p.textContent)){p.textContent='Pertanyaan di luar daftar ini? Hubungi kami lewat email di ';var a=d.createElement('a');a.href='mailto:'+M;a.textContent=M;p.appendChild(a);p.appendChild(d.createTextNode('.'))}});
 /* Kebijakan Privasi & Syarat Layanan: tombol modal diganti tautan ke halaman dokumen */
 $$('[data-open=legal]').forEach(function(b){var doc=b.getAttribute('data-doc')||'',u=/privasi/i.test(doc)?'/kebijakan-privasi':/syarat/i.test(doc)?'/syarat-ketentuan':'';if(!u||b.tagName==='A')return;var a=d.createElement('a');a.href=u;a.textContent=b.textContent;a.className=b.className;b.parentNode.replaceChild(a,b)});
 /* tautan Artikel di menu atas dan footer */
 var mn=$('#menu');if(mn&&!$('a[href="/artikel"]',mn)){var aa=d.createElement('a');aa.href='/artikel';aa.textContent='Artikel';var mob=$('.mob-acts',mn);mob?mn.insertBefore(aa,mob):mn.appendChild(aa)}
 var fp=$('footer nav[aria-label=Produk]');if(fp&&!$('a[href="/artikel"]',fp)){var af=d.createElement('a');af.href='/artikel';af.textContent='Artikel';fp.appendChild(af)}
 var fn=$('footer nav[aria-label=Bantuan]');if(fn&&!$('a[href^="mailto:"]',fn)){var a2=d.createElement('a');a2.href='mailto:'+M;a2.textContent=M;fn.appendChild(a2)}
})();
/* Katalog template di landing: SATU kartu per paket (template unggulan, atau yang urutannya paling atas) + tombol "Lihat Katalog" ke /template?paket=... */
(function(){var C=window.NM_CONFIG;if(!C||!C.SUPABASE_URL||!C.SUPABASE_ANON_KEY||!window.fetch)return;
var EVMAP={wedding:'pernikahan',engagement:'pernikahan',birthday:'ulangtahun',graduation:'wisuda',aqiqah:'lainnya',seminar:'seminar',corporate:'corporate',other:'lainnya'},
 CATL={wedding:'Pernikahan',engagement:'Pertunangan',birthday:'Ulang Tahun',graduation:'Wisuda',aqiqah:'Aqiqah',seminar:'Seminar & Workshop',corporate:'Corporate Event',other:'Lainnya'},
 PKN={essential:'Essential 2D',signature:'Signature 3D',luxe:'Luxe Live Guest'},PKL={essential:'Essential',signature:'Signature',luxe:'Luxe'},
 PKD={essential:'Undangan website 2D yang cepat, ringan, dan mudah dibagikan.',signature:'Pembuka sinematik 3D dengan kamera dan animasi.',luxe:'Pengalaman Live Guest 3D yang interaktif.'},PKS=['essential','signature','luxe'];
var grid=$('#tgrid');if(!grid)return;
function mk(tag,cls,txt){var e=d.createElement(tag);if(cls)e.className=cls;if(txt!=null)e.textContent=txt;return e}
/* alamat lama di database (domain sementara Hostinger, folder assets-essential) dipetakan ke lokasi yang aktif */
function fixUrl(u){u=String(u||'').replace(/^https?:\/\/[a-z0-9-]+\.hostingersite\.com(?=\/)/i,'').replace(/^\/assets-essential\/invite\//,'/assets/invite/');return /^(https:\/\/|\/)/.test(u)&&u.indexOf('//')!==0?u:''}
function card(pk,r,list){var cats=[];list.forEach(function(x){(x.categories||[]).forEach(function(c){if(cats.indexOf(c)<0)cats.push(c)})});
 var ev=cats.map(function(c){return EVMAP[c]}).filter(Boolean).filter(function(x,i,a){return a.indexOf(x)===i}).join(' ')||'lainnya';
 var a=mk('article','tcard');a.dataset.ev=ev;a.dataset.id=r?r.slug:'paket-'+pk;a.dataset.pkg=pk;
 var tv=mk('div','tv'),img=r?fixUrl(r.thumbnail_url):'';
 function ph(){tv.innerHTML='';var p=mk('div',null,PKN[pk]);p.style.cssText='aspect-ratio:16/9;display:grid;place-items:center;font:700 15px var(--sans);color:var(--mute);background:linear-gradient(120deg,var(--soft),var(--soft2))';tv.appendChild(p)}
 if(img){var im=d.createElement('img');im.width=960;im.height=540;im.loading='lazy';im.decoding='async';im.alt='Pratinjau template undangan digital '+(r.name||'');im.onerror=ph;im.src=img;tv.appendChild(im)}else ph();
 var tb=mk('div','tb'),tg=mk('div','tags');tg.appendChild(mk('span','tag',PKN[pk]));if(list.length>1)tg.appendChild(mk('span','tag',list.length+' template'));
 tb.appendChild(mk('h3',null,r?r.name:'Template '+PKL[pk]));tb.appendChild(tg);tb.appendChild(mk('p',null,(r&&r.description)||PKD[pk]));
 if(r){var two=mk('div','two'),demo=pk==='essential'?'/preview?demo='+encodeURIComponent(r.slug):(fixUrl(r.preview_url)||'/preview?demo='+encodeURIComponent(r.slug));
  var da=mk('a','btn o','Coba Demo');da.href=demo;da.target='_blank';da.rel='noopener';two.appendChild(da);
  var bt=mk('button','btn','Gunakan Template Ini');bt.type='button';bt.dataset.open='start';bt.dataset.tpl=r.slug;bt.dataset.plan=pk;two.appendChild(bt);tb.appendChild(two)}
 var kt=mk('a','btn full'+(r?' o':''),'Lihat Katalog '+PKL[pk]);kt.href='/template?paket='+pk;kt.style.marginTop='10px';tb.appendChild(kt);
 a.appendChild(tv);a.appendChild(tb);return a}
function render(rows){var frag=d.createDocumentFragment();
 PKS.forEach(function(pk){var list=rows.filter(function(r){return r&&r.package_type===pk&&/^[a-z0-9-]{1,60}$/.test(r.slug||'')});var pick=list.filter(function(r){return r.featured})[0]||list[0]||null;frag.appendChild(card(pk,pick,list))});
 grid.innerHTML='';grid.appendChild(frag);var n=$('#tcount');if(n&&!flt)n.textContent=PKS.length+' paket, masing-masing dengan katalog template';totalTxt=function(){return PKS.length+' paket, masing-masing dengan katalog template'}}
function load(sel){return fetch(C.SUPABASE_URL+'/rest/v1/templates?select='+sel+'&status=eq.published&order='+(sel.indexOf('featured')>-1?'featured.desc,':'')+'sort.asc,created_at.asc',{headers:{apikey:C.SUPABASE_ANON_KEY,Authorization:'Bearer '+C.SUPABASE_ANON_KEY}}).then(function(r){return r.ok?r.json():null})}
var BASE='slug,name,description,thumbnail_url,preview_url,package_type,categories';
/* gagal memuat = kartu bawaan tetap tampil; tombol katalog di bawah dipastikan ada */
load(BASE+',featured').then(function(rows){return Array.isArray(rows)?rows:load(BASE)}).then(function(rows){if(Array.isArray(rows)&&rows.length)render(rows);else render([])}).catch(function(){render([])});
})();
})();
