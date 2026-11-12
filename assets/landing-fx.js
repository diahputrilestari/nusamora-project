/* NusaMora landing: animasi & interaksi tambahan (progressive enhancement).
   Tidak memuat sumber eksternal, tidak memakai innerHTML dengan data pengguna.
   Tidak berjalan bila pengguna meminta gerak dikurangi; halaman tetap utuh tanpa file ini. */
(function(){
'use strict';
if(matchMedia('(prefers-reduced-motion:reduce)').matches)return;
var d=document,root=d.documentElement,$=function(s,r){return(r||d).querySelector(s)},$$=function(s,r){return Array.prototype.slice.call((r||d).querySelectorAll(s))};
var fine=matchMedia('(hover:hover) and (pointer:fine)').matches;
root.classList.add('fx');
function el(tag,cls){var e=d.createElement(tag);if(cls)e.className=cls;return e}
var NS='http://www.w3.org/2000/svg';

/* 1. progres scroll + header + tombol kembali ke atas */
var prog=el('div','fx-prog');prog.setAttribute('aria-hidden','true');d.body.appendChild(prog);
var top=el('button','fx-top');top.type='button';top.setAttribute('aria-label','Kembali ke atas');
var tsv=d.createElementNS(NS,'svg');tsv.setAttribute('viewBox','0 0 24 24');tsv.setAttribute('fill','none');tsv.setAttribute('stroke','currentColor');tsv.setAttribute('stroke-width','2');tsv.setAttribute('stroke-linecap','round');tsv.setAttribute('stroke-linejoin','round');tsv.setAttribute('aria-hidden','true');
var tp=d.createElementNS(NS,'path');tp.setAttribute('d','M6 14l6-6 6 6');tsv.appendChild(tp);top.appendChild(tsv);d.body.appendChild(top);
top.addEventListener('click',function(){scrollTo({top:0,behavior:'smooth'})});
var hdr=$('#top'),tick=false;
function onScroll(){if(tick)return;tick=true;requestAnimationFrame(function(){tick=false;
 var h=root.scrollHeight-innerHeight,y=scrollY;prog.style.transform='scaleX('+(h>0?Math.min(1,y/h):0)+')';
 if(hdr)hdr.classList.toggle('scrolled',y>24);top.classList.toggle('show',y>innerHeight*.9)})}
addEventListener('scroll',onScroll,{passive:true});onScroll();

/* 2. judul hero: kata masuk satu per satu */
var h1=$('#h-hero');
if(h1){var i=0;(function split(n){Array.prototype.slice.call(n.childNodes).forEach(function(c){
  if(c.nodeType===3){var parts=c.nodeValue.split(/(\s+)/),f=d.createDocumentFragment();
   parts.forEach(function(p){if(!p)return;if(/^\s+$/.test(p)){f.appendChild(d.createTextNode(p))}else{var s=el('span','w');s.style.setProperty('--i',i++);s.textContent=p;f.appendChild(s)}});
   n.replaceChild(f,c)}
  else if(c.nodeType===1)split(c)})})(h1)}

/* 3. stagger untuk kelompok kartu */
['.feats','.tgrid','.steps','.plans','.tms','.qs','.mini','.trustband'].forEach(function(sel){
 var g=$(sel);if(!g)return;$$(':scope > .rv, :scope > li.rv',g).forEach(function(c,k){c.style.setProperty('--i',k%4)})});
var steps=$('.steps');
if(steps&&'IntersectionObserver' in window){var so=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){steps.classList.add('on');so.disconnect()}})},{threshold:.3});so.observe(steps)}

/* 4. perangkat hero: melayang + tilt mengikuti pointer */
var devs=$('.devs');
if(devs){setTimeout(function(){devs.classList.add('float')},1200);
 if(fine){var lap=$('.laptop',devs),ph=$('.phone',devs),raf=0;
  devs.addEventListener('pointermove',function(e){var r=devs.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;
   cancelAnimationFrame(raf);raf=requestAnimationFrame(function(){
    lap.style.setProperty('--rx',(x*9).toFixed(2)+'deg');lap.style.setProperty('--ry',(-y*7).toFixed(2)+'deg');
    ph.style.setProperty('--px',(x*-16).toFixed(1)+'px');ph.style.setProperty('--py',(y*-12).toFixed(1)+'px')})});
  devs.addEventListener('pointerleave',function(){['--rx','--ry','--px','--py'].forEach(function(p){lap.style.removeProperty(p);ph.style.removeProperty(p)})})}}

/* 5. kelopak jatuh: hero dan CTA akhir (hanya saat terlihat, dijeda saat tab tersembunyi) */
function petals(host,n,cls){var c=el('div','fx-petals'+(cls?' '+cls:''));c.setAttribute('aria-hidden','true');
 for(var k=0;k<n;k++){var p=el('i');p.style.setProperty('--x',(Math.random()*100).toFixed(1)+'%');p.style.setProperty('--s',(8+Math.random()*10).toFixed(0)+'px');
  p.style.setProperty('--d',(9+Math.random()*9).toFixed(1)+'s');p.style.setProperty('--dl',(-Math.random()*14).toFixed(1)+'s');p.style.setProperty('--dx',((Math.random()-.5)*160).toFixed(0)+'px');c.appendChild(p)}
 host.insertBefore(c,host.firstChild);
 if('IntersectionObserver' in window){new IntersectionObserver(function(es){c.style.visibility=es[0].isIntersecting?'visible':'hidden';
  $$('i',c).forEach(function(p){p.style.animationPlayState=es[0].isIntersecting?'running':'paused'})}).observe(host)}}
var hero=$('#beranda'),fin=$('.fin');
if(hero)petals(hero,innerWidth<700?6:12);
if(fin)petals(fin,innerWidth<700?6:10,'in-fin');

/* 6. harga: hitung naik saat terlihat */
if('IntersectionObserver' in window){var po=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){var pr=$('.price',e.target);if(pr&&!pr.dataset.cu){pr.dataset.cu='1';
  var tn=Array.prototype.slice.call(pr.childNodes).filter(function(n){return n.nodeType===3}).pop();if(tn){var to=parseInt(tn.nodeValue.replace(/\D/g,''),10),t0=null,fin=tn.nodeValue;
   (function step(t){if(t0===null)t0=t;var p=Math.min(1,(t-t0)/1100),v=to*(1-Math.pow(1-p,3));tn.nodeValue=String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g,'.');if(p<1)requestAnimationFrame(step);else tn.nodeValue=fin})(performance.now?performance.now():0)}}
  po.unobserve(e.target)}})},{threshold:.4});$$('.plan').forEach(function(p){po.observe(p)})}

/* 7. tilt 3D + kilau pada kartu (hanya mouse) */
if(fine){$$('.feat,.plan,.tcard:not(.soon),.step').forEach(function(c){c.classList.add('tilt');var raf=0;
 c.addEventListener('pointermove',function(e){var r=c.getBoundingClientRect(),x=(e.clientX-r.left)/r.width,y=(e.clientY-r.top)/r.height;
  cancelAnimationFrame(raf);raf=requestAnimationFrame(function(){c.classList.add('tilting');c.style.setProperty('--ty',((x-.5)*7).toFixed(2)+'deg');c.style.setProperty('--tx',((.5-y)*6).toFixed(2)+'deg');c.style.setProperty('--mx',(x*100).toFixed(0)+'%');c.style.setProperty('--my',(y*100).toFixed(0)+'%')})});
 c.addEventListener('pointerleave',function(){cancelAnimationFrame(raf);c.classList.remove('tilting')})})}

/* 8. tombol: ripple + magnet (mouse) + hati saat CTA utama diklik */
d.addEventListener('pointerdown',function(e){var b=e.target.closest&&e.target.closest('.btn');if(!b)return;
 var r=b.getBoundingClientRect(),s=Math.max(r.width,r.height)*1.6,rp=el('span','fx-rip');rp.style.width=rp.style.height=s+'px';rp.style.left=(e.clientX-r.left-s/2)+'px';rp.style.top=(e.clientY-r.top-s/2)+'px';b.appendChild(rp);setTimeout(function(){rp.remove()},650);
 if(b.matches('[data-open="start"]')){for(var k=0;k<8;k++){(function(k){var h=d.createElementNS(NS,'svg');h.setAttribute('viewBox','0 0 24 24');h.setAttribute('class','fx-heart');h.setAttribute('aria-hidden','true');
  var p=d.createElementNS(NS,'path');p.setAttribute('d','M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z');p.setAttribute('fill','currentColor');h.appendChild(p);
  var a=(-Math.PI/2)+(Math.random()-.5)*2.2,dist=50+Math.random()*60;h.style.left=(e.clientX-7)+'px';h.style.top=(e.clientY-7)+'px';
  h.style.setProperty('--hx',(Math.cos(a)*dist).toFixed(0)+'px');h.style.setProperty('--hy',(Math.sin(a)*dist).toFixed(0)+'px');h.style.setProperty('--hr',((Math.random()-.5)*80).toFixed(0)+'deg');
  d.body.appendChild(h);setTimeout(function(){h.remove()},1050)})(k)}}});
if(fine){$$('.hero .btn.lg,.fin .btn.lg').forEach(function(b){b.classList.add('mag');
 b.addEventListener('pointermove',function(e){var r=b.getBoundingClientRect();b.style.transform='translate('+((e.clientX-r.left-r.width/2)*.18).toFixed(1)+'px,'+((e.clientY-r.top-r.height/2)*.25).toFixed(1)+'px)'});
 b.addEventListener('pointerleave',function(){b.style.transform=''})})}

/* 9. FAQ: buka-tutup dengan tinggi beranimasi (tetap <details> native) */
$$('details.q').forEach(function(q){var s=$('summary',q),body=Array.prototype.slice.call(q.children).filter(function(c){return c!==s});if(!s||!q.animate)return;
 var anim=null;
 s.addEventListener('click',function(e){e.preventDefault();if(anim){anim.cancel();anim=null}
  var h0=q.offsetHeight;
  if(!q.open){q.open=true;var h1=q.offsetHeight;anim=q.animate({height:[h0+'px',h1+'px']},{duration:320,easing:'cubic-bezier(.2,.7,.2,1)'});q.style.overflow='hidden';
   anim.onfinish=anim.oncancel=function(){anim=null;q.style.overflow=''}}
  else{var h1=s.offsetHeight+2;q.style.overflow='hidden';anim=q.animate({height:[h0+'px',h1+'px']},{duration:260,easing:'ease-in'});
   anim.onfinish=function(){q.open=false;anim=null;q.style.overflow=''};anim.oncancel=function(){q.style.overflow=''}}})});
})();
