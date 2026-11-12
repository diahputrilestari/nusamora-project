import { gsap } from 'gsap';
import { experienceStore } from '../stores/experience.js';
import { STORYBOARD } from '../data/storyboard.js';
import { coupleNames, monogram } from '../data/wedding.config.js';
import { calendarUrl, countdownParts } from '../utils/calendar.js';
import { activeTheme } from '../themes/active.js';
import { mountThemedOpening } from '../components/ui/themedOpening.js';
/**
 * DOM overlay for the preview build: loader, opening card, cinematic
 * captions per step, navigation, music/autoplay controls, letterbox.
 * Mirrors src/components/ui/* in the React app.
 */
const esc = (s) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const ICON = {
    note: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18V5l11-2v13" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="6.5" cy="18" r="2.5" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="17.5" cy="16" r="2.5" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>',
    mute: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18V5l11-2v13" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="6.5" cy="18" r="2.5" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="17.5" cy="16" r="2.5" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M3 3l18 18" stroke="currentColor" stroke-width="1.5"/></svg>',
    play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5l11 7-11 7z" fill="currentColor"/></svg>',
    pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" fill="currentColor"/></svg>',
    prev: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>',
    next: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>',
    pin: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-6.5-6.2-6.5-11a6.5 6.5 0 0113 0c0 4.8-6.5 11-6.5 11z" fill="none" stroke="currentColor" stroke-width="1.4"/><circle cx="12" cy="10" r="2.2" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>',
    cal: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5.5" width="16" height="14.5" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4" stroke="currentColor" stroke-width="1.4"/></svg>',
    replay: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 12a7.5 7.5 0 102.2-5.3M4.5 4v4.5H9" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>',
};
function eventBlock(ev, cfg) {
    return `
    <article class="event" data-reveal>
      <h3 class="event__title">${esc(ev.title)}</h3>
      <p class="event__date">${esc(ev.dateLabel)}</p>
      <p class="event__time">${esc(ev.timeLabel)}</p>
      <p class="event__venue">${esc(ev.venue)}</p>
      <p class="event__addr">${esc(ev.address)}</p>
      <div class="event__actions">
        <a class="chip" href="${esc(ev.mapsUrl)}" target="_blank" rel="noopener">${ICON.pin}<span>${esc(cfg.text.mapButton)}</span></a>
        <a class="chip" href="${esc(calendarUrl(ev, cfg))}" target="_blank" rel="noopener">${ICON.cal}<span>${esc(cfg.text.calendarButton)}</span></a>
      </div>
    </article>`;
}
/** Caption markup for a given scene/step */
function caption(cfg, scene, step) {
    const [a, b] = coupleNames(cfg);
    const id = STORYBOARD[scene].id;
    switch (id) {
        case 'intro':
            return step === 0
                ? {
                    pos: 'top',
                    html: `<p class="verse" data-reveal>${esc(cfg.text.introVerse)}</p><p class="cap-small" data-reveal>${esc(cfg.text.introVerseSource)}</p>`,
                }
                : {
                    pos: 'center',
                    html: `<p class="cap-small" data-reveal>${esc(cfg.text.introInvite)}</p>
                   <h2 class="names names--xl" data-split>${esc(a)}<span class="amp">&amp;</span>${esc(b)}</h2>
                   <p class="cap-small" data-reveal>${esc(cfg.location.city)} · ${esc(cfg.location.region)}</p>`,
                };
        case 'couple': {
            const person = (p) => `
        <div class="person" data-reveal>
          <h3 class="names names--md">${esc(p.nickname)}</h3>
          <p class="person__full">${esc(p.fullName)}</p>
          <p class="person__parents">${esc(p.parentsLabel)}<br>${esc(p.father)}<br>&amp; ${esc(p.mother)}</p>
          ${p.instagram ? `<p class="person__ig">${esc(p.instagram)}</p>` : ''}
        </div>`;
            const first = cfg.nameOrder === 'bride-first' ? cfg.bride : cfg.groom;
            const second = cfg.nameOrder === 'bride-first' ? cfg.groom : cfg.bride;
            return {
                pos: 'split',
                html: `<p class="cap-small cap-small--center" data-reveal>${esc(cfg.text.coupleEyebrow)}</p>
               <div class="pair">${person(first)}<span class="pair__amp" data-reveal>&amp;</span>${person(second)}</div>`,
            };
        }
        case 'story': {
            const ch = cfg.story[step];
            if (!ch)
                return { pos: 'left', html: '' };
            return {
                pos: 'left',
                html: `<p class="cap-small" data-reveal>${esc(cfg.text.storyEyebrow)} · Chapter ${step + 1} of ${cfg.story.length}</p>
               <p class="year" data-reveal>${esc(ch.year)}</p>
               <h2 class="names names--lg" data-split>${esc(ch.title)}</h2>
               <p class="story-text" data-reveal>${esc(ch.text)}</p>`,
            };
        }
        case 'ceremony':
            return {
                pos: 'bottom',
                html: `<p class="cap-small cap-small--center" data-reveal>${esc(cfg.text.ceremonyEyebrow)}</p>
               <div class="events">${eventBlock(cfg.ceremony, cfg)}<span class="events__rule" aria-hidden="true"></span>${eventBlock(cfg.reception, cfg)}</div>
               <div class="countdown" data-reveal aria-label="${esc(cfg.text.countdownLabel)}">
                 <span><b data-cd="days">0</b><i>days</i></span>
                 <span><b data-cd="hours">0</b><i>hours</i></span>
                 <span><b data-cd="minutes">0</b><i>minutes</i></span>
                 <span><b data-cd="seconds">0</b><i>seconds</i></span>
               </div>`,
            };
        case 'closing':
            return step === 0
                ? { pos: 'top', html: `<h2 class="closing-title" data-reveal>${esc(cfg.text.closingTitle)}</h2>` }
                : {
                    pos: 'center',
                    html: `<p class="closing-text" data-reveal>${esc(cfg.text.closingText)}</p>
                   <p class="cap-small" data-reveal>${esc(cfg.text.closingSignoff)}</p>
                   <h2 class="names names--xl" data-split>${esc(a)}<span class="amp">&amp;</span>${esc(b)}</h2>
                   <button class="btn btn--ghost" id="replay" data-reveal>${ICON.replay}<span>${esc(cfg.text.replayButton)}</span></button>`,
                };
        default:
            return { pos: 'center', html: '' };
    }
}
function splitLetters(el) {
    const walk = (node) => {
        if (node.nodeType === 3) {
            const frag = document.createDocumentFragment();
            for (const ch of node.textContent ?? '') {
                const s = document.createElement('span');
                s.className = 'ch';
                s.textContent = ch;
                frag.appendChild(s);
            }
            node.parentNode.replaceChild(frag, node);
        }
        else
            node.childNodes.forEach((c) => walk(c));
    };
    Array.from(el.childNodes).forEach(walk);
}
export function mountUI(host, cfg) {
    const [a, b] = coupleNames(cfg);
    const store = experienceStore;
    const guest = store.getState().guestName || cfg.text.defaultGuest;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    host.insertAdjacentHTML('beforeend', `
    <div class="letterbox" aria-hidden="true"><i></i><i></i></div>

    <section class="loader" id="loader" role="status" aria-live="polite">
      <div class="loader__mono">${esc(monogram(cfg).split('').join(' & '))}</div>
      <div class="loader__bar"><i id="loaderFill"></i></div>
      <p class="loader__label"><span id="loaderLabel">Preparing the garden</span> · <span id="loaderPct">0%</span></p>
    </section>

    <section class="opening" id="opening" hidden>
      <p class="opening__guest" data-o>${esc(cfg.text.guestGreeting)} <em>${esc(guest)}</em></p>
      <p class="cap-small" data-o>${esc(cfg.text.eyebrow)}</p>
      <h1 class="names names--hero" data-o>${esc(a)}<span class="amp">&amp;</span>${esc(b)}</h1>
      <p class="opening__date" data-o>${esc(cfg.weddingDateLabel)}</p>
      <button class="btn btn--gold" id="openBtn" data-o><span>${esc(cfg.text.openButton)}</span></button>
    </section>

    <section class="captions" id="captions" aria-live="polite"></section>

    <nav class="hud" id="hud" hidden aria-label="Invitation controls">
      <div class="hud__top">
        <button class="icon-btn" id="autoBtn" aria-label="Pause autoplay"></button>
        <button class="icon-btn icon-btn--disc" id="musicBtn" aria-label="Mute music"></button>
      </div>
      <div class="hud__bottom">
        <button class="icon-btn" id="prevBtn" aria-label="Previous scene">${ICON.prev}</button>
        <ol class="dots" id="dots">
          ${STORYBOARD.slice(1)
        .map((s, i) => `<li><button data-scene="${i + 1}" aria-label="${esc(s.label)}"><i></i><span>${esc(s.label)}</span></button></li>`)
        .join('')}
        </ol>
        <button class="icon-btn" id="nextBtn" aria-label="Next scene">${ICON.next}</button>
      </div>
    </nav>
  `);
    const $ = (id) => host.querySelector('#' + id);
    const loader = $('loader');
    const opening = $('opening');
    const captions = $('captions');
    const hud = $('hud');
    const letterbox = host.querySelector('.letterbox');
    // loader progress
    const unsubProgress = store.subscribe((s) => {
        $('loaderFill').style.transform = `scaleX(${s.progress})`;
        $('loaderLabel').textContent = s.progressLabel;
        $('loaderPct').textContent = `${Math.round(s.progress * 100)}%`;
    });
    let openHandler = () => { };
    // a theme may bring its own dark cover screen instead of the light title card
    const themed = activeTheme.opening ? mountThemedOpening(host, cfg, activeTheme.opening) : null;
    if (themed) {
        loader.hidden = true;
        themed.onOpen(() => {
            openHandler();
            hud.hidden = false;
            gsap.fromTo(hud, { opacity: 0 }, { opacity: 1, duration: 1.5, delay: 2.4 });
        });
    }
    const hideLoader = () => {
        if (themed)
            return themed.ready();
        gsap.to(loader, { opacity: 0, duration: 1.2, ease: 'power2.inOut', onComplete: () => (loader.hidden = true) });
        opening.hidden = false;
        gsap.fromTo(opening.querySelectorAll('[data-o]'), { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 1.6, stagger: 0.18, delay: 0.6, ease: 'power3.out' });
    };
    $('openBtn').addEventListener('click', () => {
        gsap.to(opening.querySelectorAll('[data-o]'), {
            opacity: 0,
            y: -14,
            duration: 0.8,
            stagger: 0.06,
            ease: 'power2.in',
            onComplete: () => (opening.hidden = true),
        });
        openHandler();
        hud.hidden = false;
        gsap.fromTo(hud, { opacity: 0 }, { opacity: 1, duration: 1.5, delay: 1.2 });
    });
    // captions: crossfade per step
    let cdTimer = null;
    let current = null;
    const showCaption = (scene, step) => {
        if (cdTimer)
            clearInterval(cdTimer);
        if (current) {
            const old = current;
            gsap.to(old, { opacity: 0, y: -10, duration: 0.7, ease: 'power2.in', onComplete: () => old.remove() });
        }
        const { html, pos } = caption(cfg, scene, step);
        if (!html) {
            current = null;
            return;
        }
        const el = document.createElement('div');
        el.className = `caption caption--${pos} caption--${STORYBOARD[scene].id}`;
        el.innerHTML = html;
        captions.appendChild(el);
        current = el;
        el.querySelectorAll('[data-split]').forEach(splitLetters);
        // reveal after the camera has started moving, timed to land with the shot
        const delay = scene === 1 && step === 0 ? 2.2 : 1.4;
        const tl = gsap.timeline({ delay: reduced ? 0.2 : delay });
        tl.fromTo(el.querySelectorAll('[data-reveal]'), { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 1.4, stagger: 0.16, ease: 'power3.out' }, 0);
        tl.fromTo(el.querySelectorAll('.ch'), { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 1.3, stagger: 0.03, ease: 'power3.out' }, 0.2);
        el.querySelector('#replay')?.addEventListener('click', () => {
            experienceStore.setState({ autoplay: true });
            store.getState().goTo(1, 0);
        });
        if (STORYBOARD[scene].id === 'ceremony') {
            const tickCd = () => {
                const p = countdownParts(cfg.weddingDateISO);
                el.querySelectorAll('[data-cd]').forEach((n) => {
                    n.textContent = String(p[n.dataset.cd]);
                });
            };
            tickCd();
            cdTimer = window.setInterval(tickCd, 1000);
        }
    };
    const renderControls = () => {
        const s = store.getState();
        $('musicBtn').innerHTML = s.muted ? ICON.mute : ICON.note;
        $('musicBtn').setAttribute('aria-label', s.muted ? 'Play music' : 'Mute music');
        $('musicBtn').classList.toggle('is-on', !s.muted);
        $('autoBtn').innerHTML = s.autoplay ? ICON.pause : ICON.play;
        $('autoBtn').setAttribute('aria-label', s.autoplay ? 'Pause autoplay' : 'Play automatically');
        host.querySelectorAll('#dots button').forEach((btn) => {
            const idx = Number(btn.dataset.scene);
            btn.classList.toggle('is-active', idx === s.scene);
            btn.classList.toggle('is-past', idx < s.scene);
            btn.setAttribute('aria-current', idx === s.scene ? 'step' : 'false');
        });
        $('prevBtn').disabled = s.scene <= 1 && s.step === 0;
        $('nextBtn').disabled = s.scene === STORYBOARD.length - 1 && s.step === STORYBOARD[s.scene].steps.length - 1;
        letterbox.classList.toggle('is-on', s.moving && s.phase === 'playing');
    };
    let lastNav = -1;
    const unsub = store.subscribe((s) => {
        if (s.navId !== lastNav) {
            lastNav = s.navId;
            if (s.phase === 'playing')
                showCaption(s.scene, s.step);
        }
        renderControls();
    });
    renderControls();
    // controls
    $('musicBtn').addEventListener('click', () => store.getState().toggleMuted());
    $('autoBtn').addEventListener('click', () => store.getState().toggleAutoplay());
    $('prevBtn').addEventListener('click', () => store.getState().prev());
    $('nextBtn').addEventListener('click', () => store.getState().next());
    host.querySelectorAll('#dots button').forEach((btn) => btn.addEventListener('click', () => store.getState().goTo(Number(btn.dataset.scene), 0)));
    // keyboard / wheel / swipe navigation (scroll-independent: gestures step the film, never scrub it)
    let lock = 0;
    const step = (dir) => {
        const now = performance.now();
        if (now - lock < 900 || store.getState().phase !== 'playing')
            return;
        lock = now;
        dir > 0 ? store.getState().next() : store.getState().prev();
    };
    const onKey = (e) => {
        if (['ArrowRight', 'ArrowDown', 'PageDown', ' '].includes(e.key)) {
            if (e.key === ' ' && e.target.tagName === 'BUTTON')
                return;
            e.preventDefault();
            step(1);
        }
        else if (['ArrowLeft', 'ArrowUp', 'PageUp'].includes(e.key)) {
            e.preventDefault();
            step(-1);
        }
        else if (e.key.toLowerCase() === 'm')
            store.getState().toggleMuted();
    };
    const onWheel = (e) => {
        if (Math.abs(e.deltaY) > 30)
            step(e.deltaY > 0 ? 1 : -1);
    };
    let touchY = 0;
    let touchX = 0;
    const onTouchStart = (e) => {
        touchY = e.touches[0].clientY;
        touchX = e.touches[0].clientX;
    };
    const onTouchEnd = (e) => {
        const dy = touchY - e.changedTouches[0].clientY;
        const dx = touchX - e.changedTouches[0].clientX;
        const d = Math.abs(dx) > Math.abs(dy) ? dx : dy;
        if (Math.abs(d) > 50)
            step(d > 0 ? 1 : -1);
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('wheel', onWheel, { passive: true });
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    return {
        root: host,
        onOpen: (fn) => (openHandler = fn),
        hideLoader,
        dispose: () => {
            unsub();
            unsubProgress();
            if (cdTimer)
                clearInterval(cdTimer);
            window.removeEventListener('keydown', onKey);
            window.removeEventListener('wheel', onWheel);
            window.removeEventListener('touchstart', onTouchStart);
            window.removeEventListener('touchend', onTouchEnd);
        },
    };
}
/** Static invitation shown when WebGL is unavailable */
export function mountFallback(host, cfg) {
    const [a, b] = coupleNames(cfg);
    host.innerHTML = `
    <main class="fallback">
      <p class="cap-small">${esc(cfg.text.eyebrow)}</p>
      <h1 class="names names--hero">${esc(a)}<span class="amp">&amp;</span>${esc(b)}</h1>
      <p class="opening__date">${esc(cfg.weddingDateLabel)}</p>
      <p class="verse">${esc(cfg.text.introVerse)}</p>
      <div class="events">${eventBlock(cfg.ceremony, cfg)}${eventBlock(cfg.reception, cfg)}</div>
      <ol class="fallback__story">${cfg.story.map((s) => `<li><b>${esc(s.year)}</b> ${esc(s.title)}<br><span>${esc(s.text)}</span></li>`).join('')}</ol>
      <h2 class="closing-title">${esc(cfg.text.closingTitle)}</h2>
      <p class="closing-text">${esc(cfg.text.closingText)}</p>
      <p class="fallback__note">This device can't display the 3D invitation, so here is the full invitation as a page.</p>
    </main>`;
}
