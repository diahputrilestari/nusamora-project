import { gsap } from 'gsap';
import { experienceStore } from '../../stores/experience.js';
import { coupleNames } from '../../data/wedding.config.js';
const esc = (s) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const CSS = `
.to{position:fixed;inset:0;z-index:6;pointer-events:auto;color:var(--to-text);overflow:hidden;font-family:var(--font-body);
  --to-base:#120708;--to-glow:#7a1d22;--to-gold:#e2b552;--to-text:#fff2da}
.to__door{position:absolute;top:0;bottom:0;width:50.5%;overflow:hidden;background:var(--to-base);will-change:transform}
.to__door--l{left:0;transform-origin:left center}
.to__door--r{right:0;transform-origin:right center}
.to__door::before{content:"";position:absolute;inset:0;width:198%;background-image:var(--to-bg);background-size:cover;background-position:center 40%;
  filter:brightness(.16) saturate(1.2) blur(2px)}
.to__door--r::before{left:auto;right:0}
.to__door::after{content:"";position:absolute;inset:0;width:198%;
  background:radial-gradient(70% 55% at 50% 46%,color-mix(in srgb,var(--to-glow) 55%,transparent) 0%,transparent 70%),
             radial-gradient(120% 95% at 50% 50%,rgba(0,0,0,.15) 35%,rgba(0,0,0,.88) 100%)}
.to__door--r::after{left:auto;right:0}
.to__seam{position:absolute;top:0;bottom:0;left:50%;width:2px;margin-left:-1px;background:linear-gradient(transparent,rgba(226,181,82,.55) 30%,rgba(226,181,82,.55) 70%,transparent);opacity:.0}
.to canvas{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;mix-blend-mode:screen}
.to__corner{position:absolute;width:clamp(96px,22vw,190px);pointer-events:none;opacity:.92;filter:drop-shadow(0 0 14px rgba(226,181,82,.25))}
.to__corner--tl{top:max(6px,env(safe-area-inset-top,0px));left:max(4px,env(safe-area-inset-left,0px));transform:scaleX(-1)}
.to__corner--tr{top:max(6px,env(safe-area-inset-top,0px));right:max(4px,env(safe-area-inset-right,0px))}
.to__corner--bl{bottom:max(6px,env(safe-area-inset-bottom,0px));left:max(4px,env(safe-area-inset-left,0px));transform:scale(-1,-1)}
.to__corner--br{bottom:max(6px,env(safe-area-inset-bottom,0px));right:max(4px,env(safe-area-inset-right,0px));transform:scaleY(-1)}
.to__lantern{position:absolute;top:0;width:clamp(42px,8vw,72px);transform-origin:50% 0;animation:to-swing 5.6s ease-in-out infinite;pointer-events:none}
.to__lantern img{width:100%;display:block;filter:drop-shadow(0 0 18px rgba(255,190,90,.65))}
.to__lantern::after{content:"";position:absolute;left:50%;top:48%;width:260%;aspect-ratio:1;transform:translate(-50%,-50%);
  background:radial-gradient(circle,rgba(255,196,106,.35),rgba(255,160,70,.08) 45%,transparent 70%);pointer-events:none;animation:to-flicker 2.3s ease-in-out infinite}
.to__lantern--l{left:clamp(64px,17vw,230px);margin-top:-2%}
.to__lantern--r{right:clamp(64px,17vw,230px);animation-delay:-2.1s;margin-top:-4%}
@keyframes to-swing{0%,100%{transform:rotate(3.2deg)}50%{transform:rotate(-3.2deg)}}
@keyframes to-flicker{0%,100%{opacity:.85}45%{opacity:1}60%{opacity:.75}}
.to__stage{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:clamp(.35rem,1.4vh,.8rem);text-align:center;
  padding-block:max(18px,env(safe-area-inset-top,0px)) max(18px,env(safe-area-inset-bottom,0px));
  padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px))}
.to__guest{margin:0;font-size:clamp(.92rem,2.4vw,1.08rem);color:rgba(255,242,218,.78)}
.to__guest b{display:block;font-weight:600;font-style:italic;color:var(--to-text);font-size:1.12em;margin-top:.15rem}
.to__couple{display:flex;align-items:flex-end;justify-content:center;gap:clamp(2px,1vw,10px);height:clamp(108px,19vh,190px);margin-top:.4rem}
.to__couple img{height:100%;width:auto;filter:drop-shadow(0 6px 18px rgba(0,0,0,.55))}
.to__couple img:last-child{height:89%}
.to__eyebrow{margin:.2rem 0 0;font-family:var(--font-caps);letter-spacing:.34em;text-transform:uppercase;font-size:clamp(.7rem,1.9vw,.86rem);color:var(--to-gold)}
.to__names{display:flex;align-items:center;justify-content:center;gap:clamp(.4rem,2vw,1.2rem);width:100%;max-width:760px}
.to__names img{width:clamp(34px,8vw,64px);flex:none;filter:drop-shadow(0 0 10px rgba(226,181,82,.3))}
.to__names h1{margin:0;font-family:var(--font-script);font-weight:400;line-height:1.02;font-size:clamp(2.7rem,10.5vw,5.6rem);min-width:0;text-wrap:balance;
  background:linear-gradient(180deg,#fff3cf 0%,#f0cd78 45%,#c99434 75%,#f6dc95 100%);-webkit-background-clip:text;background-clip:text;color:transparent;
  filter:drop-shadow(0 2px 14px rgba(214,166,58,.35))}
.to__names h1 span{display:block;font-size:.5em;line-height:1.2;-webkit-text-fill-color:currentColor;color:var(--to-gold)}
.to__date{margin:0;font-family:var(--font-caps);letter-spacing:.3em;text-transform:uppercase;font-size:clamp(.74rem,2vw,.92rem);color:var(--to-text)}
.to__rule{width:min(220px,50vw);height:1px;background:linear-gradient(90deg,transparent,var(--to-gold),transparent);opacity:.7}
.to__env{position:relative;width:clamp(170px,min(52vw,30vh),320px);margin-top:.5rem;filter:drop-shadow(0 18px 30px rgba(0,0,0,.6))}
.to__env img{width:100%;display:block}
.to__env i{position:absolute;left:50%;top:60%;width:34%;aspect-ratio:1;border-radius:50%;transform:translate(-50%,-50%);
  background:radial-gradient(circle,rgba(255,226,140,.55),transparent 65%);opacity:.0;pointer-events:none}
.to__cta{min-height:56px;display:grid;place-items:center;margin-top:.4rem}
.to__bar{width:min(220px,56vw);display:grid;gap:.5rem;justify-items:center}
.to__bar div{width:100%;height:2px;background:rgba(226,181,82,.2);overflow:hidden;border-radius:2px}
.to__bar div i{display:block;height:100%;background:linear-gradient(90deg,#b88932,#f3d27d);transform-origin:left;transform:scaleX(0);transition:transform .45s ease}
.to__bar p{margin:0;font-family:var(--font-caps);font-size:.66rem;letter-spacing:.24em;text-transform:uppercase;color:rgba(255,242,218,.62);font-variant-numeric:tabular-nums}
.to__btn{appearance:none;border:0;cursor:pointer;position:relative;padding:.95rem 2.1rem;border-radius:999px;font-family:var(--font-caps);letter-spacing:.24em;text-transform:uppercase;font-size:.8rem;color:#3a1408;
  background:linear-gradient(180deg,#fbe6a6,#e2b552 55%,#b88932);box-shadow:0 0 0 1px rgba(255,236,180,.6) inset,0 10px 30px rgba(214,166,58,.35),0 0 40px rgba(214,166,58,.25);
  display:inline-flex;align-items:center;gap:.7rem}
.to__btn::before{content:"";position:absolute;inset:-6px;border-radius:inherit;border:1px solid rgba(226,181,82,.5);animation:to-pulse 2.4s ease-out infinite}
.to__btn svg{width:18px;height:18px}
.to__btn:focus-visible{outline:2px solid #fff2da;outline-offset:6px}
@keyframes to-pulse{0%{opacity:.9;transform:scale(1)}100%{opacity:0;transform:scale(1.18)}}
.to__hint{margin:.2rem 0 0;font-size:.82rem;font-style:italic;color:rgba(255,242,218,.55)}
@media (max-width:600px){.to__lantern{width:34px}.to__lantern--l{left:40px}.to__lantern--r{right:40px}.to__stage{padding-top:max(40px,env(safe-area-inset-top,0px))}}
@media (max-height:640px){.to__couple{height:84px}.to__env{width:170px}.to__names h1{font-size:clamp(2.3rem,9vw,3.6rem)}}
@media (min-width:900px){.to__names h1 span{display:inline;margin:0 .25em;font-size:.6em}.to__couple{height:clamp(96px,16vh,170px)}.to__names h1{font-size:clamp(3rem,7vw,5.4rem)}}
@media (prefers-reduced-motion:reduce){.to__lantern,.to__lantern::after,.to__btn::before{animation:none}}
`;
let cssInjected = false;
export function mountThemedOpening(host, cfg, spec) {
    if (!cssInjected) {
        const st = document.createElement('style');
        st.textContent = CSS;
        document.head.appendChild(st);
        cssInjected = true;
    }
    const store = experienceStore;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const [a, b] = coupleNames(cfg);
    const L = {
        eyebrow: spec.labels?.eyebrow ?? cfg.text.eyebrow,
        button: spec.labels?.button ?? cfg.text.openButton,
        guest: spec.labels?.guest ?? cfg.text.guestGreeting,
        loading: spec.labels?.loading ?? 'Loading',
        hint: spec.labels?.hint ?? '',
    };
    const guest = store.getState().guestName || spec.labels?.defaultGuest || cfg.text.defaultGuest;
    const el = document.createElement('section');
    el.className = 'to';
    el.setAttribute('aria-label', `${L.eyebrow} ${a} & ${b}`);
    const c = spec.colors ?? {};
    if (c.base)
        el.style.setProperty('--to-base', c.base);
    if (c.glow)
        el.style.setProperty('--to-glow', c.glow);
    if (c.gold)
        el.style.setProperty('--to-gold', c.gold);
    if (c.text)
        el.style.setProperty('--to-text', c.text);
    if (spec.background)
        el.style.setProperty('--to-bg', `url("${spec.background}")`);
    const img = (src, cls = '', alt = '') => (src ? `<img src="${esc(src)}" class="${cls}" alt="${esc(alt)}" decoding="async">` : '');
    el.innerHTML = `
    <div class="to__door to__door--l"></div><div class="to__door to__door--r"></div><div class="to__seam"></div>
    <canvas aria-hidden="true"></canvas>
    ${spec.corner ? ['tl', 'tr', 'bl', 'br'].map((k) => img(spec.corner, `to__corner to__corner--${k}`)).join('') : ''}
    ${spec.lantern ? `<div class="to__lantern to__lantern--l" aria-hidden="true">${img(spec.lantern)}</div><div class="to__lantern to__lantern--r" aria-hidden="true">${img(spec.lantern)}</div>` : ''}
    <div class="to__stage">
      <p class="to__guest" data-in>${esc(L.guest)}<b>${esc(guest)}</b></p>
      ${spec.couple ? `<div class="to__couple" data-in>${img(spec.couple[0], '', '')}${img(spec.couple[1], '', '')}</div>` : ''}
      <p class="to__eyebrow" data-in>${esc(L.eyebrow)}</p>
      <div class="to__names" data-in>
        ${img(spec.ornamentLeft, '', '')}
        <h1>${esc(a)}<span>&amp;</span>${esc(b)}</h1>
        ${img(spec.ornamentRight, '', '')}
      </div>
      <div class="to__rule" data-in></div>
      <p class="to__date" data-in>${esc(cfg.weddingDateLabel)}</p>
      <div class="to__env" data-in>${img(spec.envelope, '', '')}<i></i></div>
      <div class="to__cta" data-in>
        <div class="to__bar" role="status" aria-live="polite"><div><i></i></div><p><span class="to__lbl">${esc(L.loading)}</span> · <span class="to__pct">0%</span></p></div>
      </div>
      ${L.hint ? `<p class="to__hint" data-in>${esc(L.hint)}</p>` : ''}
    </div>`;
    host.appendChild(el);
    const q = (s) => el.querySelector(s);
    /* ───────── gold particles ───────── */
    const cv = q('canvas');
    const ctx = cv.getContext('2d');
    let W = 0;
    let H = 0;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const resize = () => {
        W = el.clientWidth;
        H = el.clientHeight;
        cv.width = W * dpr;
        cv.height = H * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);
    const count = reduced ? 24 : W < 600 ? 70 : 120;
    const P = Array.from({ length: count }, () => ({
        x: Math.random(),
        y: Math.random(),
        r: 0.6 + Math.random() * 2.2,
        v: 0.006 + Math.random() * 0.02,
        sway: Math.random() * Math.PI * 2,
        tw: Math.random() * Math.PI * 2,
    }));
    let burst = 0;
    let raf = 0;
    let last = performance.now();
    const draw = (now) => {
        raf = requestAnimationFrame(draw);
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        ctx.clearRect(0, 0, W, H);
        ctx.globalCompositeOperation = 'lighter';
        for (const p of P) {
            if (!reduced) {
                p.y -= p.v * dt * (1 + burst * 6);
                p.sway += dt * 0.6;
                p.tw += dt * (1.5 + p.r);
                if (p.y < -0.02) {
                    p.y = 1.02;
                    p.x = Math.random();
                }
            }
            const x = (p.x + Math.sin(p.sway) * 0.012) * W;
            const y = p.y * H;
            const a = (0.35 + 0.65 * (0.5 + 0.5 * Math.sin(p.tw))) * (0.55 + burst * 0.45);
            const r = p.r * (1 + burst);
            const g = ctx.createRadialGradient(x, y, 0, x, y, r * 4);
            g.addColorStop(0, `rgba(255,232,160,${a})`);
            g.addColorStop(0.35, `rgba(226,181,82,${a * 0.45})`);
            g.addColorStop(1, 'rgba(226,181,82,0)');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(x, y, r * 4, 0, Math.PI * 2);
            ctx.fill();
        }
    };
    raf = requestAnimationFrame(draw);
    /* ───────── intro reveal ───────── */
    const items = el.querySelectorAll('[data-in]');
    if (reduced)
        gsap.set(items, { opacity: 1 });
    else
        gsap.fromTo(items, { opacity: 0, y: 16, filter: 'blur(8px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 1.4, stagger: 0.14, delay: 0.35, ease: 'power3.out' });
    /* ───────── loading → button ───────── */
    const fill = q('.to__bar div i');
    const lbl = q('.to__lbl');
    const pct = q('.to__pct');
    const unsub = store.subscribe((s) => {
        fill.style.transform = `scaleX(${s.progress})`;
        if (s.progressLabel)
            lbl.textContent = s.progressLabel;
        pct.textContent = `${Math.round(s.progress * 100)}%`;
    });
    let openFn = () => { };
    let opened = false;
    const cta = q('.to__cta');
    const ready = () => {
        const bar = q('.to__bar');
        gsap.to(bar, {
            opacity: 0,
            duration: 0.4,
            onComplete: () => {
                bar.remove();
                cta.insertAdjacentHTML('beforeend', `<button class="to__btn" type="button"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 7.5h17v11h-17zM3.5 7.5l8.5 6 8.5-6" fill="none" stroke="currentColor" stroke-width="1.5"/></svg><span>${esc(L.button)}</span></button>`);
                const btn = q('.to__btn');
                gsap.fromTo(btn, { opacity: 0, y: 10, scale: 0.96 }, { opacity: 1, y: 0, scale: 1, duration: 0.9, ease: 'back.out(1.6)' });
                btn.addEventListener('click', open);
                q('.to__env').addEventListener('click', open);
                q('.to__env').style.cursor = 'pointer';
            },
        });
    };
    function open() {
        if (opened)
            return;
        opened = true;
        openFn();
        const env = q('.to__env');
        const doors = el.querySelectorAll('.to__door');
        const tl = gsap.timeline({
            onComplete: () => dispose(),
        });
        if (reduced) {
            tl.to(el, { opacity: 0, duration: 0.8 });
            return;
        }
        tl.to(env.querySelector('i'), { opacity: 1, scale: 1.6, duration: 0.5, ease: 'power2.out' }, 0)
            .to(env, { scale: 1.08, duration: 0.35, ease: 'power2.out' }, 0)
            .to(env, { y: -30, scale: 1.4, opacity: 0, duration: 0.7, ease: 'power2.in' }, 0.35)
            .to(el.querySelectorAll('.to__stage > *:not(.to__env)'), { opacity: 0, y: -14, duration: 0.6, stagger: 0.04, ease: 'power2.in' }, 0.3)
            .to(burstState, { v: 1, duration: 0.6, onUpdate: () => (burst = burstState.v) }, 0.2)
            .to(el.querySelectorAll('.to__corner, .to__lantern'), { opacity: 0, duration: 0.6 }, 0.5)
            .to(q('.to__seam'), { opacity: 1, duration: 0.3 }, 0.8)
            // the cover parts like a pair of carved gate doors
            .to(doors[0], { xPercent: -102, rotateY: 18, duration: 1.7, ease: 'power3.inOut' }, 1.0)
            .to(doors[1], { xPercent: 102, rotateY: -18, duration: 1.7, ease: 'power3.inOut' }, 1.0)
            .to(q('.to__seam'), { opacity: 0, duration: 0.4 }, 1.1)
            .to(cv, { opacity: 0, duration: 1.2 }, 1.6);
    }
    const burstState = { v: 0 };
    el.style.perspective = '1400px';
    function dispose() {
        cancelAnimationFrame(raf);
        window.removeEventListener('resize', resize);
        unsub();
        el.remove();
    }
    return { ready, onOpen: (fn) => (openFn = fn), dispose };
}
