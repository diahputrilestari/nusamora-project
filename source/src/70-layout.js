// ===== NM:module layout — halaman persiapan responsif (portrait & landscape), HUD Live Guest landscape-first, warna HUD dari tema =====
document.head.appendChild(Object.assign(document.createElement('style'),{textContent:`
/* --- halaman persiapan: avatar, nama tamu, dashboard (semua ukuran & orientasi) --- */
.scr{min-height:100vh;min-height:100dvh;box-sizing:border-box;padding:max(24px,env(safe-area-inset-top)) max(16px,env(safe-area-inset-right)) max(24px,env(safe-area-inset-bottom)) max(16px,env(safe-area-inset-left))}
#s1,#s2{position:relative;isolation:isolate;background:var(--nm-env-bg,var(--bgurl)) var(--nm-env-pos,center 38%)/cover no-repeat,var(--bg,#f6dfe8)!important;font-family:var(--nm-sans)}
#s1::before,#s2::before{content:'';position:absolute;inset:0;z-index:-1;pointer-events:none;background:radial-gradient(ellipse 62% 78% at 50% 52%,rgba(var(--nm-veil),.82) 0,rgba(var(--nm-veil),.7) 55%,rgba(var(--nm-veil),.06) 100%)}
#s1 h1,#s2 h1,#s1 .serif{font-family:var(--nm-serif);font-weight:600;letter-spacing:.005em}
#s1 h1,#s2 h1{font-size:clamp(36px,7.5vw,62px);line-height:1.05}
#s1 .serif{font-size:clamp(18px,3.4vw,26px)!important;font-style:italic}
#s1 .sub,#s2 .sub{color:var(--mute);font:400 15px/1.5 var(--nm-sans)}
#s1 .btn,#s2 .btn,#s2 input,#s1 small{font-family:var(--nm-sans)}
#s1 .btn:not(.g):not(.on),#s2 .btn:not(.g){border-radius:var(--nm-btnr);text-transform:var(--nm-btnt);letter-spacing:var(--nm-btnls)}
#avs{max-width:min(760px,100%)}
#s1 .btn.on{background:var(--wine)!important;color:var(--nm-onaccent)!important}#s1 .btn.g{background:var(--nm-white);color:var(--nm-ink);border:1px solid var(--nm-line)}
#s1 .av{background:#fffdf9;border-color:var(--nm-line)}#s1 .av.sel{border-color:var(--wine)}#s1 .av small{color:#6b5560}
@media(max-width:700px){#s1{padding-top:max(60px,env(safe-area-inset-top))}#s1::before,#s2::before{background:rgba(var(--nm-veil),.76)}#s1,#s2{background-position:50% 30%}}
@media(max-width:380px){.av{width:92px}#s1 h1,#s2 h1{font-size:34px}}
@media(orientation:landscape) and (max-height:520px){
 .scr{justify-content:flex-start;padding-top:max(12px,env(safe-area-inset-top));padding-bottom:12px}#s1{padding-top:max(46px,env(safe-area-inset-top))}
 #s1 h1,#s2 h1{font-size:clamp(26px,9vh,40px)}#s1 .serif{font-size:16px!important;margin-bottom:2px!important}.sub{margin:2px 0 8px!important}
 .av{width:84px;padding:6px 6px 2px;border-radius:14px}.av svg{height:min(76px,17vh);width:auto}.av small{font-size:11px}#prev svg{height:min(90px,20vh);width:auto}
 .row{margin:4px 0}.btn{padding:8px 18px}#dopenbtn{top:8px!important}}
/* --- HUD Live Guest: warna dari tema, safe-area, landscape pendek --- */
#map{left:calc(10px + env(safe-area-inset-left));max-height:calc(100vh - 58px);max-height:calc(100dvh - 58px);overflow-y:auto;overscroll-behavior:contain;scrollbar-width:none}#map::-webkit-scrollbar{display:none}
#chat{right:calc(10px + env(safe-area-inset-right));bottom:calc(10px + env(safe-area-inset-bottom))}
#joy{left:calc(18px + env(safe-area-inset-left));bottom:calc(18px + env(safe-area-inset-bottom))}
.pill{background:var(--nm-white)!important;color:var(--nm-ink)!important;border:1px solid var(--nm-line)!important}#cnt{color:inherit!important}
#rxs,#bar{background:var(--hud-bg2)!important;border-color:rgba(255,255,255,.16)!important}#bar input{background:var(--nm-white);color:var(--nm-ink)}
@media(max-width:900px){#idh{max-width:calc(100vw - 280px)}}
@media(max-width:560px){#idh{max-width:calc(100vw - 20px)}}
@media(orientation:landscape) and (max-height:520px){
 #map{top:8px;padding:3px!important}#map .nv,#map #mt{padding:4px 9px 4px 7px!important;font-size:11px!important}#map .ic{width:15px;height:15px}
 #joy{width:92px;height:92px;bottom:calc(10px + env(safe-area-inset-bottom))}#knob{left:28px;top:28px;width:36px;height:36px}
 #idh{top:6px;padding:3px 14px 3px 4px;gap:8px}#idh canvas{width:32px;height:32px}#idh b{font-size:17px}#idh[data-len=l] b{font-size:15px}#idh[data-len=xl] b{font-size:13px}#idh small{font-size:8px}
 #hint{display:none}
 #bar{bottom:8px;width:min(340px,40vw)}#bar input{padding:6px 10px}#bar .btn{padding:6px 12px}#rxs{bottom:46px;padding:2px 8px}
 #chat{width:min(210px,32vw);bottom:8px}#chat.c{width:auto;min-width:92px}#chat #log{max-height:34vh!important}}
@media(orientation:landscape) and (max-height:360px){#s1 .serif,#s1 .sub{display:none}#s1{padding-top:44px}.av svg{height:min(68px,17vh)}}
@media(orientation:landscape) and (max-height:520px) and (max-width:700px){#map .tx{display:none}#idh small{display:none}}
`}));
