// ===== v11: menu Dress Code (tamu laki-laki & perempuan) — memakai komponen modal NusaMora =====
function dresscode(){setNavActive('dresscode');
 const pal=[['#F3E6D3','Krem'],['#E3A9B4','Dusty Rose'],['#A9B99A','Sage'],['#D4AF5F','Emas'],['#9C7A62','Cokelat Susu']],
 fig=(l,k,i)=>`<figure><img src="${(l[i]||{}).img||''}" alt=""><figcaption>${esc(NA[k][i]||'')}</figcaption></figure>`,
 li=a=>a.map(t=>`<li>${t}</li>`).join('');
 openM('Dress Code',`<p class="nm-p"><b>Garden Romantic · Earth &amp; Blush</b><br><span class="nm-mute">Sabtu, 12 Desember 2026 · 10.00 WIB · acara taman terbuka, siang hari</span></p>
 <div class="nm-pal">${pal.map(([c,n])=>`<span><i style="background:${c}"></i>${n}</span>`).join('')}</div>
 <div class="nm-two">
 <section class="nm-card"><h3 class="serif">Tamu Laki-laki</h3><div class="nm-figs">${fig(AV.L,'L',0)}${fig(AV.L,'L',1)}${fig(AV.L,'L',2)}</div>
 <h4 class="nm-lb">Disarankan</h4><ul class="nm-ul ok">${li(['Batik atau kemeja lengan panjang tone krem, cokelat, atau sage','Blazer atau jas ringan beige atau cokelat susu','Celana bahan atau chino rapi','Pantofel atau loafers yang nyaman di taman'])}</ul>
 <h4 class="nm-lb">Hindari</h4><ul class="nm-ul no">${li(['Setelan serba putih atau serba hitam','Kaos oblong, jeans sobek, sandal jepit'])}</ul></section>
 <section class="nm-card"><h3 class="serif">Tamu Perempuan</h3><div class="nm-figs">${fig(AV.P,'P',1)}${fig(AV.P,'P',2)}${fig(AV.P,'P',4)}</div>
 <h4 class="nm-lb">Disarankan</h4><ul class="nm-ul ok">${li(['Kebaya, gamis, atau dress midi hingga maxi','Dusty rose, sage, krem, atau emas lembut; hijab senada','Motif bunga halus atau brokat tipis','Flat shoes atau wedges, karena lantai taman berpaving'])}</ul>
 <h4 class="nm-lb">Hindari</h4><ul class="nm-ul no">${li(['Gaun putih atau gading penuh','Warna neon, rok sangat pendek, hak tipis'])}</ul></section></div>
 <p class="nm-note">Putih dan gading kami khususkan untuk mempelai. Selain itu, pakaian bernuansa pastel atau earth tone lainnya tetap sangat diterima.</p>`,{eyebrow:'Tata Busana'})}
(function(){const ml=$('#ml'),b=document.createElement('button');b.className='nv';b.dataset.id='dresscode';b.title='Dress Code';b.setAttribute('aria-label','Dress Code');
 b.innerHTML='<svg class="ic" viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 7a2 2 0 1 0-2-2M12 7v3M3 18l9-8 9 8z"/></svg><span class="tx">Dress Code</span>';b.onclick=()=>dresscode();ml.appendChild(b)})();
{const c1=closeM;closeM=function(){if(window.curNav=='dresscode')setNavActive(null);return c1.apply(this,arguments)}}
