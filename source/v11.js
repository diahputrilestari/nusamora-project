// ===== v11: menu Dress Code (tamu laki-laki & perempuan) =====
document.head.appendChild(Object.assign(document.createElement('style'),{textContent:`
.dc-pal{display:flex;gap:10px;flex-wrap:wrap;margin:8px 0 14px}.dc-pal span{display:flex;flex-direction:column;align-items:center;gap:4px;font-size:11px;color:var(--mute);width:64px;text-align:center}.dc-pal i{width:40px;height:40px;border-radius:50%;border:2px solid #fff;box-shadow:0 0 0 1px var(--line),0 3px 8px rgba(0,0,0,.12)}
.dc-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}@media(max-width:620px){.dc-grid{grid-template-columns:1fr}}
.dc-card{border:1px solid var(--line);border-radius:16px;padding:12px;background:var(--bg)}.dc-card h3{margin:0 0 6px;font-size:22px;color:var(--wine)}
.dc-fig{display:flex;gap:6px;justify-content:center;align-items:flex-end;margin:6px 0 10px}.dc-fig figure{margin:0;text-align:center;flex:1;min-width:0}.dc-fig img{height:150px;max-width:100%;object-fit:contain;display:block;margin:0 auto}.dc-fig figcaption{font-size:11px;font-weight:600;margin-top:2px}
.dc-card ul{margin:6px 0;padding:0;list-style:none;font-size:13px;line-height:1.45}.dc-card li{padding-left:22px;position:relative;margin-bottom:3px}.dc-card li::before{position:absolute;left:0;top:0;font-weight:700}.dc-ok li::before{content:'✓';color:#3b8f5a}.dc-no li::before{content:'✕';color:#c0392b}.dc-card h4{margin:8px 0 2px;font-size:12px;text-transform:uppercase;letter-spacing:.6px;color:var(--mute)}
.dc-note{margin-top:12px;font-size:12px;background:rgba(246,196,83,.18);border-left:3px solid #f6c453;padding:8px 10px;border-radius:8px}
`}));
function dresscode(){setNavActive('dresscode');
 const pal=[['#F3E6D3','Krem'],['#E3A9B4','Dusty Rose'],['#A9B99A','Sage'],['#D4AF5F','Emas'],['#9C7A62','Cokelat Susu']],
 fig=(l,i)=>`<figure><img src="${(l[i]||{}).img||''}" alt=""><figcaption>${esc(NA[l==AV.L?'L':'P'][i]||'')}</figcaption></figure>`;
 openM('👔 Dress Code',`<p style="margin:0 0 4px"><b>Garden Romantic · Earth &amp; Blush</b><br><span style="color:var(--mute);font-size:13px">Sabtu, 12 Desember 2026 · 10.00 WIB · acara taman terbuka, siang hari</span></p>
 <div class="dc-pal">${pal.map(([c,n])=>`<span><i style="background:${c}"></i>${n}</span>`).join('')}</div>
 <div class="dc-grid">
 <div class="dc-card"><h3 class="serif">Tamu Laki-laki</h3><div class="dc-fig">${fig(AV.L,0)}${fig(AV.L,1)}${fig(AV.L,2)}</div>
 <h4>Disarankan</h4><div class="dc-ok"><ul><li>Batik atau kemeja lengan panjang tone krem, cokelat, atau sage</li><li>Blazer/jas ringan beige atau cokelat susu</li><li>Celana bahan atau chino rapi</li><li>Pantofel atau loafers yang nyaman di taman</li></ul></div>
 <h4>Hindari</h4><div class="dc-no"><ul><li>Setelan serba putih atau serba hitam</li><li>Kaos oblong, jeans sobek, sandal jepit</li></ul></div></div>
 <div class="dc-card"><h3 class="serif">Tamu Perempuan</h3><div class="dc-fig">${fig(AV.P,1)}${fig(AV.P,2)}${fig(AV.P,4)}</div>
 <h4>Disarankan</h4><div class="dc-ok"><ul><li>Kebaya, gamis, atau dress midi hingga maxi</li><li>Warna dusty rose, sage, krem, atau emas lembut; hijab senada</li><li>Motif bunga halus atau brokat tipis</li><li>Flat shoes atau wedges, karena lantai taman berpaving</li></ul></div>
 <h4>Hindari</h4><div class="dc-no"><ul><li>Gaun putih atau gading penuh</li><li>Warna neon, rok sangat pendek, hak tipis</li></ul></div></div>
 </div>
 <p class="dc-note">Putih dan gading kami khususkan untuk mempelai. Selain itu, pakaian bernuansa pastel atau earth tone lainnya tetap sangat diterima.</p>`)}
(function(){const ml=$('#ml'),b=document.createElement('button');b.className='nv';b.dataset.id='dresscode';b.title='Dress Code';b.setAttribute('aria-label','Dress Code');
 b.innerHTML='<svg class="ic" viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 7a2 2 0 1 0-2-2M12 7v3M3 18l9-8 9 8z"/></svg><span class="tx">Dress Code</span>';b.onclick=()=>dresscode();ml.appendChild(b)})();
{const c1=closeM;closeM=function(){if(window.curNav=='dresscode')setNavActive(null);return c1.apply(this,arguments)}}
