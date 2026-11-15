import { wedding } from '../data/wedding.config.js';
import { loadRemote } from '../data/remote.js';
import { mountGuestPanel } from './guest.js';
import { experienceStore } from '../stores/experience.js';
import { detectQuality, hasWebGL } from '../utils/quality.js';
import { mountFallback, mountUI } from './ui.js';
import { startEngine } from './engine.js';
import { activeTheme } from '../themes/active.js';
/** Preview entry: same scenes, camera and audio as the React app, no build step. */
async function boot() {
    // customer data (?slug= / ?preview=) is applied to `wedding` before anything reads it
    if (!(await loadRemote()))
        return;
    const stage = document.getElementById('stage');
    const overlay = document.getElementById('overlay');
    const store = experienceStore.getState();
    if (!hasWebGL()) {
        store.setPhase('fallback');
        mountFallback(overlay, wedding);
        return;
    }
    const ui = mountUI(overlay, wedding);
    mountGuestPanel(overlay);
    // canvas text uses the web fonts, so wait for them before painting textures
    try {
        await Promise.race([
            Promise.all([
                document.fonts.load('80px "Pinyon Script"'),
                document.fonts.load('30px "Marcellus"'),
                document.fonts.load('italic 20px "Cormorant Garamond"'),
            ]),
            new Promise((r) => setTimeout(r, 3500)),
        ]);
    }
    catch {
        /* fall back to system fonts */
    }
    let engine;
    try {
        engine = await startEngine(stage, wedding, detectQuality());
    }
    catch (e) {
        console.error(e);
        store.setPhase('fallback');
        overlay.innerHTML = '';
        mountFallback(overlay, wedding);
        return;
    }
    const eng = engine;
    store.setPhase('ready');
    ui.hideLoader();
    ui.onOpen(async () => {
        store.setPhase('playing');
        if (activeTheme.opening) {
            // the themed cover parts like gate doors onto the opening shot, then the film moves in
            setTimeout(() => experienceStore.getState().goTo(1, 0), 2200);
        }
        else {
            eng.flash(0.85, 0.5);
            setTimeout(() => eng.flash(0, 1.6), 520);
            experienceStore.getState().goTo(1, 0);
        }
        // nudge autoplay timers on any interaction
        window.addEventListener('pointerdown', () => eng.controller.nudge());
        await eng.audio.start();
        eng.audio.setMuted(experienceStore.getState().muted);
    });
}
boot();
