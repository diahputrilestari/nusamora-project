// ===== NM:module nav — tombol menu Dress Code + pembersih state aktif (konten popup ada di modul ui) =====
(function(){const ml=$('#ml'),b=document.createElement('button');b.className='nv';b.dataset.id='dresscode';b.title='Dress Code';b.setAttribute('aria-label','Dress Code');
 b.innerHTML='<svg class="ic" viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 7a2 2 0 1 0-2-2M12 7v3M3 18l9-8 9 8z"/></svg><span class="tx">Dress Code</span>';b.onclick=()=>dresscode();ml.appendChild(b)})();
{const c1=closeM;closeM=function(){if(window.curNav=='dresscode')setNavActive(null);return c1.apply(this,arguments)}}
