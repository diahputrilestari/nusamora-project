import { STORYBOARD } from '../../data/storyboard.js';
import { wedding } from '../../data/wedding.config.js';
import { experienceStore } from '../../stores/experience.js';
/**
 * Glue between the store (what the viewer asked for) and the 3D runtime
 * (camera, couple placement, petals, exposure, ambience, autoplay).
 * Framework-agnostic: used by both the React Three Fiber app and the
 * standalone preview build.
 */
export class SceneController {
    constructor(world, director, audio) {
        this.world = world;
        this.director = director;
        this.audio = audio;
        this.exposure = 0.83;
        this.exposureTarget = 0.83;
        this.dwellTimer = null;
        this.lastNav = -1;
        this.enterToken = 0;
        this.fadeHandler = null;
        const first = STORYBOARD[0].steps[0];
        director.cutToStart(first);
        world.placeCouple(first.couple ?? 'pavilion');
        director.play(first);
        director.onMoveChange((moving) => {
            experienceStore.getState().setMoving(moving);
            if (moving)
                this.clearDwell();
            else
                this.armAutoplay();
        });
        this.unsub = experienceStore.subscribe((s, prev) => {
            if (s.navId !== this.lastNav) {
                this.lastNav = s.navId;
                this.enter(s.scene, s.step);
            }
            if (s.autoplay !== prev.autoplay) {
                if (s.autoplay)
                    this.armAutoplay();
                else
                    this.clearDwell();
            }
            if (s.muted !== prev.muted)
                this.audio?.setMuted(s.muted);
        });
    }
    /** Runtime supplies a screen dip (ivory flash) used by 'fade' transitions */
    setFadeHandler(fn) {
        this.fadeHandler = fn;
    }
    async enter(scene, stepIdx) {
        this.clearDwell();
        const token = ++this.enterToken;
        const step = STORYBOARD[scene].steps[stepIdx];
        this.world.petals.setIntensity(step.petals ?? 1);
        this.exposureTarget = step.exposure ?? 1;
        if (step.ambience)
            this.audio?.setAmbience(step.ambience);
        if (step.transition === 'fade') {
            // dip to ivory, cut while hidden, then reveal the new shot already moving
            if (this.fadeHandler)
                await this.fadeHandler(true);
            if (token !== this.enterToken)
                return;
            if (step.couple)
                this.world.placeCouple(step.couple);
            this.director.cutToStart(step);
            this.director.update(0);
            this.clearDwell();
            this.director.play(step);
            void this.fadeHandler?.(false);
            return;
        }
        if (step.couple)
            this.world.placeCouple(step.couple);
        this.director.play(step);
    }
    armAutoplay() {
        this.clearDwell();
        const s = experienceStore.getState();
        if (!s.autoplay || s.phase !== 'playing' || s.scene === 0)
            return;
        const isLast = s.scene === STORYBOARD.length - 1 && s.step === STORYBOARD[s.scene].steps.length - 1;
        if (isLast)
            return;
        // chapters with more text get a little longer to read
        const extra = s.scene === 3 || s.scene === 4 ? 3 : 0;
        this.dwellTimer = window.setTimeout(() => experienceStore.getState().next(), (wedding.experience.autoplayDwell + extra) * 1000);
    }
    /** Called whenever the viewer interacts, so autoplay never yanks them away mid-read */
    nudge() {
        if (this.dwellTimer !== null && !this.director.moving)
            this.armAutoplay();
    }
    clearDwell() {
        if (this.dwellTimer !== null)
            clearTimeout(this.dwellTimer);
        this.dwellTimer = null;
    }
    update(dt) {
        this.exposure += (this.exposureTarget - this.exposure) * (1 - Math.exp(-dt * 0.8));
        this.world.focusShadows(this.director.look);
    }
    focusDistance(camera) {
        return camera.position.distanceTo(this.director.look);
    }
    dispose() {
        this.unsub();
        this.clearDwell();
    }
}
