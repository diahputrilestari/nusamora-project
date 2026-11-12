import { createStore } from 'zustand/vanilla';
import { STORYBOARD, nextOf, prevOf } from '../data/storyboard.js';
import { wedding } from '../data/wedding.config.js';
function guestFromUrl() {
    if (typeof location === 'undefined')
        return '';
    const q = new URLSearchParams(location.search).get('to');
    const h = location.hash.replace(/^#/, '');
    if (!q && h === 'director')
        return '';
    const raw = q || h;
    return raw ? decodeURIComponent(raw).replace(/[-_+]/g, ' ').trim().slice(0, 60) : '';
}
export const experienceStore = createStore()((set, get) => ({
    phase: 'loading',
    progress: 0,
    progressLabel: 'Preparing the garden',
    scene: 0,
    step: 0,
    navId: 0,
    moving: false,
    autoplay: wedding.experience.autoplayDefault,
    muted: false,
    guestName: guestFromUrl(),
    setProgress: (progress, progressLabel) => set({ progress, progressLabel }),
    setPhase: (phase) => set({ phase }),
    setMoving: (moving) => set({ moving }),
    goTo: (scene, step = 0) => {
        const s = Math.max(0, Math.min(STORYBOARD.length - 1, scene));
        const st = Math.max(0, Math.min(STORYBOARD[s].steps.length - 1, step));
        set({ scene: s, step: st, navId: get().navId + 1 });
    },
    next: () => {
        const { scene, step } = get();
        const n = nextOf(scene, step);
        if (n)
            get().goTo(n[0], n[1]);
        else
            set({ autoplay: false });
    },
    prev: () => {
        const { scene, step } = get();
        const p = prevOf(scene, step);
        if (p)
            get().goTo(p[0], p[1]);
    },
    toggleAutoplay: () => set({ autoplay: !get().autoplay }),
    toggleMuted: () => set({ muted: !get().muted }),
}));
