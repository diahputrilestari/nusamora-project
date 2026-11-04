// ===== v12: panel chat collapsible, tinggi dibatasi, timestamp kecil, avatar mini, notifikasi pesan baru =====
document.head.appendChild(Object.assign(document.createElement('style'),{textContent:`
#chat{position:absolute;right:10px;bottom:10px;z-index:5;width:min(268px,40vw);background:rgba(22,20,52,.5);border:1px solid rgba(255,255,255,.16);border-radius:16px;backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);box-shadow:0 6px 20px rgba(0,0,0,.18);color:#fff}
#chh{display:flex;align-items:center;gap:8px;width:100%;padding:8px 11px;background:transparent;border:0;color:#fff;font:700 12px Inter,system-ui,sans-serif;cursor:pointer;border-radius:16px}
#chh:focus-visible{outline:2px solid #f6c453;outline-offset:-2px}#chh .chev{margin-left:auto;transition:transform .2s}#chat.c #chh .chev{transform:rotate(180deg)}
#chb{display:none;min-width:18px;height:18px;padding:0 5px;border-radius:99px;background:#ff4f7b;color:#fff;font-size:10px;line-height:18px;text-align:center}
#chat.c.un #chb{display:inline-block}#chat.c.un #chh{animation:chp 1.6s ease-in-out infinite}@keyframes chp{50%{background:rgba(246,196,83,.28)}}
#chat #log{position:static!important;right:auto;bottom:auto;display:block;width:100%!important;max-height:clamp(96px,28vh,200px)!important;overflow-y:auto;padding:2px 8px 8px!important;background:transparent!important;border:0!important;color:#fff;font-size:12px;backdrop-filter:none!important;scrollbar-width:thin;scrollbar-color:rgba(255,255,255,.35) transparent}
#chat.c #log{display:none!important}
#chat .m{display:flex;gap:7px;align-items:flex-start;margin:0 0 6px;padding:5px 7px;border-radius:10px;background:rgba(255,255,255,.09);animation:fi .25s}#chat .m.me{background:rgba(246,196,83,.16);box-shadow:inset 2px 0 #f6c453}
#chat .av24{width:26px;height:26px;border-radius:50%;overflow:hidden;flex:none;background:rgba(255,255,255,.75)}#chat .av24 img{width:100%!important;height:100%!important;display:block;margin:0!important}
#chat .mb{min-width:0;flex:1}#chat .mh{display:flex;align-items:baseline;gap:6px}#chat .mh b{display:block;font-size:11px;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}#chat time{font-size:9px;opacity:.6;font-weight:500;margin-left:auto;flex:none}
#chat .mt{font-size:12px;line-height:1.35;word-break:break-word;color:rgba(255,255,255,.94)}
#chtoast{position:absolute;right:0;bottom:calc(100% + 6px);max-width:100%;display:none;background:rgba(255,255,255,.96);color:#2b2150;border-radius:12px;padding:6px 10px;font-size:12px;box-shadow:0 4px 14px rgba(0,0,0,.22);cursor:pointer;animation:fi .25s}#chtoast b{margin-right:4px}#chat.c #chtoast.show{display:block}
@media(max-height:560px){#chat{width:min(230px,36vw)}}
`}));
(function(){const log=$('#log'),live=$('#live'),c=document.createElement('div');c.id='chat';
 const ic='<svg class="ic" viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5h16v11H9l-5 4z"/></svg>',ch='<svg class="ic chev" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>';
 c.innerHTML=`<div id="chtoast" role="status" aria-live="polite"></div><button id="chh" aria-expanded="true" aria-controls="log" aria-label="Chat">${ic}<span>Chat</span><span id="chb" aria-label="pesan baru">0</span>${ch}</button>`;
 live.insertBefore(c,log);c.appendChild(log);log.classList.remove('h','gb');log.setAttribute('role','log');
 window.chatUnread=0;let tt=0;
 const setC=on=>{c.classList.toggle('c',on);$('#chh').setAttribute('aria-expanded',String(!on));if(!on){chatUnread=0;$('#chb').textContent='0';c.classList.remove('un');$('#chtoast').classList.remove('show');log.scrollTop=log.scrollHeight}};
 window.setChatCollapsed=setC;$('#chh').onclick=()=>setC(!c.classList.contains('c'));$('#chtoast').onclick=()=>setC(false);
 if(innerWidth<700||innerHeight<560)c.classList.add('c');$('#chh').setAttribute('aria-expanded',String(!c.classList.contains('c')));
 window.chatNotify=(n,t)=>{if(!c.classList.contains('c'))return;chatUnread++;$('#chb').textContent=chatUnread>9?'9+':String(chatUnread);c.classList.add('un');const o=$('#chtoast');o.innerHTML='<b></b><span></span>';o.firstChild.textContent=n+':';o.lastChild.textContent=' '+(t.length>60?t.slice(0,57)+'…':t);o.classList.add('show');clearTimeout(tt);tt=setTimeout(()=>o.classList.remove('show'),3500)}})();
addChat=function(e,t){say(e,t);const l=$('#log'),d=document.createElement('div'),me=e===P;d.className='m'+(me?' me':'');
 const now=new Date(),hm=now.toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'}).replace('.',':');
 d.innerHTML=`<span class="av24">${svg(e.a,26)}</span><div class="mb"><div class="mh"><b></b><time datetime="${now.toISOString()}">${hm}</time></div><div class="mt"></div></div>`;
 d.querySelector('b').textContent=e.n;d.querySelector('.mt').textContent=t;l.appendChild(d);while(l.children.length>40)l.firstChild.remove();l.scrollTop=l.scrollHeight;if(!me)chatNotify(e.n,t)};
