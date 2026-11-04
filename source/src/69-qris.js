// ===== NM:module qris — QRIS mempelai: disimpan di database (invitations/{id}.qrisImage), tampil di popup Wedding Gift; unggah dari Dashboard =====
document.head.appendChild(Object.assign(document.createElement('style'),{textContent:`
.nm-qris{display:flex;flex-direction:column;align-items:center;gap:10px;border:1px solid var(--nm-line);background:var(--nm-white);border-radius:14px;padding:16px 16px 14px;margin-top:4px;text-align:center}
.nm-qris small{font:600 10px var(--nm-sans);letter-spacing:.14em;text-transform:uppercase;color:var(--nm-accent)}
.nm-qris img{display:block;width:min(260px,72vw);height:auto;background:#fff;padding:10px;border-radius:12px;border:1px solid var(--nm-line);image-rendering:auto}
.nm-qris span{font-size:12px;color:var(--nm-mute);max-width:300px}
.nm-qris a{text-decoration:none}
.dqr img{display:block;max-width:200px;width:100%;height:auto;background:#fff;padding:8px;border:1px solid var(--line,#eadcd8);border-radius:12px;margin:12px 0 0}
.dqr input[type=file]{padding:8px 10px}
`}));
const NMQR={ok:u=>typeof u==='string'&&/^(data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+\/=]+|https:\/\/[^\s"'<>]{4,1000})$/.test(u)&&u.length<900000,
 get(){let u=(typeof INVDATA!=='undefined'&&INVDATA&&INVDATA.qrisImage)||'';if(!u){try{u=JSON.parse(localStorage.getItem('nm:qris:'+curInv)||'null')||''}catch(e){}}return NMQR.ok(u)?u:''}};
// dipanggil oleh popup Wedding Gift (nmGift)
function nmQris(){const u=NMQR.get();if(!u)return'';const nm=NMID.pair||'mempelai',ext=/^data:image\/(\w+)/.exec(u);
 return `<div class="nm-qris"><small>QRIS</small><img src="${u}" alt="Kode QRIS ${esc(nm)}" decoding="async"><span>Scan dengan aplikasi e-wallet atau mobile banking apa pun.</span><button type="button" class="nm-btn sec sm nm-qdl" data-fn="QRIS-${esc(String(nm).replace(/[^\w-]+/g,'-'))}.${ext?(ext[1]==='jpeg'?'jpg':ext[1]):'png'}"><span class="nm-bl">Unduh QRIS</span></button></div>`}
// unduh QRIS: lewat kemampuan `downloads` (viewer artifact), cadangan tautan unduh biasa di hosting lain
document.addEventListener('click',async e=>{const b=e.target.closest&&e.target.closest('.nm-qdl');if(!b)return;const u=NMQR.get();if(!u)return;const fn=b.dataset.fn||'QRIS.png';
 const blob=await (await fetch(u)).blob();let done=false;
 try{const dl=window.claude&&claude.use?await claude.use('downloads'):null;if(dl){await dl.save({filename:fn,data:blob});done=true}}catch(er){if(er&&er.code==='declined')return}
 if(!done){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=fn;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},1000)}});
// perkecil gambar di sisi klien (maks 720px) agar muat di dokumen database; PNG dulu agar QR tetap tajam
function nmQrPrep(file){return new Promise((res,rej)=>{if(!file||!/^image\/(png|jpe?g|webp)$/.test(file.type)){rej(new Error('Format harus PNG, JPG, atau WebP.'));return}
 if(file.size>8e6){rej(new Error('Ukuran file terlalu besar (maks 8 MB).'));return}
 const im=new Image(),url=URL.createObjectURL(file);im.onerror=()=>{URL.revokeObjectURL(url);rej(new Error('Gambar tidak dapat dibaca.'))};
 im.onload=()=>{URL.revokeObjectURL(url);const k=Math.min(1,720/Math.max(im.width,im.height)),w=Math.max(1,Math.round(im.width*k)),h=Math.max(1,Math.round(im.height*k)),c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,w,h);x.drawImage(im,0,0,w,h);
  let o=c.toDataURL('image/png');if(o.length>650000)o=c.toDataURL('image/webp',.92);if(o.length>650000)o=c.toDataURL('image/jpeg',.9);
  if(!NMQR.ok(o)){rej(new Error('Gambar terlalu besar setelah dikompres. Gunakan gambar QRIS yang lebih sederhana.'));return}res(o)};im.src=url})}
function nmQrisForm(){if($('#dqris'))return;const base=$('#dmusic')||$('#didform');if(!base)return;const d=document.createElement('div');d.id='dqris';d.className='did dqr';
 d.innerHTML=`<h2 class="serif">QRIS Mempelai</h2><p class="sub">Unggah gambar QRIS milik mempelai. Gambar ditampilkan di popup <b>Wedding Gift</b> dan disimpan di database undangan (<code>qrisImage</code>). Pastikan QRIS yang diunggah adalah milik mempelai sendiri.</p>
 <div class="dig"><label>Gambar QRIS (PNG / JPG / WebP)<input id="dqf" type="file" accept="image/png,image/jpeg,image/webp"></label></div><div id="dqp"></div>
 <div class="row" style="justify-content:flex-start;margin-top:12px"><button class="btn" id="dqs" type="button" disabled>Simpan QRIS</button><button class="btn g" id="dqx" type="button">Hapus QRIS</button></div><div class="dmsg" id="dqm" role="status"></div>`;
 base.after(d);let pend=null;const msg=(t,bad)=>{const m=$('#dqm');m.textContent=t;m.className='dmsg'+(bad?' bad':'')},prev=u=>{$('#dqp').innerHTML=u?`<img src="${u}" alt="Pratinjau QRIS">`:''};
 const show=()=>{if(pend===null)prev(NMQR.get())};show();
 $('#dqf').onchange=async e=>{const f=e.target.files[0];pend=null;$('#dqs').disabled=true;if(!f){show();return}
  try{pend=await nmQrPrep(f);prev(pend);$('#dqs').disabled=false;msg('Pratinjau siap. Klik "Simpan QRIS" untuk menerapkan.')}catch(er){pend=null;show();msg(er.message,1)}};
 const save=async u=>{const f={qrisImage:u};
  if(!DBH){try{localStorage.setItem('nm:qris:'+curInv,JSON.stringify(u))}catch(e){msg('Penyimpanan lokal penuh. Database tidak tersedia.',1);return}INVDATA=Object.assign({},INVDATA||{},f);pend=null;show();msg('Tersimpan lokal (database tidak tersedia).',1);return}
  try{const ref=DBH.doc('invitations/'+curInv),snap=await ref.get(),x=snap.exists?snap.data():null;
   if(x&&x.ownerId&&UID&&x.ownerId!==UID&&!ISADMIN){msg('Undangan ini dimiliki pelanggan lain.',1);return}
   const now=Date.now();if(x)await ref.update(Object.assign({updatedAt:now,updatedBy:UID||null},f));else await ref.set(Object.assign({title:curInv,ownerId:UID||null,createdAt:now,updatedAt:now,updatedBy:UID||null},f));
   try{localStorage.removeItem('nm:qris:'+curInv)}catch(e){}INVDATA=Object.assign({},INVDATA||{},f);pend=null;$('#dqf').value='';$('#dqs').disabled=true;show();msg(u?'QRIS tersimpan. Popup Wedding Gift sudah menampilkannya.':'QRIS dihapus.')}
  catch(e){msg('Gagal menyimpan ('+(e&&e.code||'error')+'). Anda mungkin tidak punya izin menulis, atau gambar terlalu besar.',1)}};
 $('#dqs').onclick=()=>{if(pend)save(pend)};$('#dqx').onclick=()=>{pend=null;$('#dqf').value='';save('')}}
{const _r=nmRenderForm;nmRenderForm=function(){_r.apply(this,arguments);nmQrisForm()}}
nmQrisForm();
