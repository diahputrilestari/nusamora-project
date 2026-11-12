import * as THREE from 'three';
import { gsap } from 'gsap';
export class CinematicDirector {
    constructor(camera, opts) {
        /** Base pose (without hold offsets) */
        this.pos = new THREE.Vector3();
        this.look = new THREE.Vector3();
        this.fov = 38;
        this.moving = false;
        this.tween = null;
        this.holdOrbit = 0.05;
        this.holdStart = 0;
        this.parallax = new THREE.Vector2();
        this.parallaxTarget = new THREE.Vector2();
        this.time = 0;
        this.listeners = new Set();
        this.camera = camera;
        this.opts = opts;
        this.pos.copy(camera.position);
    }
    setMobile(m) {
        this.opts.mobile = m;
    }
    onMoveChange(fn) {
        this.listeners.add(fn);
        return () => this.listeners.delete(fn);
    }
    /** Normalised pointer/gyro input in [-1, 1] */
    setParallax(x, y) {
        this.parallaxTarget.set(THREE.MathUtils.clamp(x, -1, 1), THREE.MathUtils.clamp(y, -1, 1));
    }
    /** Resolve a step into concrete path/look/fov for the current device */
    resolve(step) {
        const m = this.opts.mobile;
        let path = (m && step.mobile?.path) || step.path;
        const look = (m && step.mobile?.look) || step.look;
        const fov = (m ? step.mobile?.fov ?? step.mobileFov : undefined) ?? step.fov ?? 38;
        const k = m && !step.mobile?.path ? step.mobilePullback ?? 1.25 : 1;
        if (k !== 1) {
            path = path.map((p, i) => {
                const l = look[Math.min(i, look.length - 1)];
                return l.clone().add(p.clone().sub(l).multiplyScalar(k));
            });
        }
        return { path, look, fov };
    }
    /** Jump straight to the end pose of a step */
    cut(step) {
        const { path, look, fov } = this.resolve(step);
        this.tween?.kill();
        this.pos.copy(path[path.length - 1]);
        this.look.copy(look[look.length - 1]);
        this.fov = fov;
        this.holdOrbit = step.idleOrbit ?? 0.05;
        this.holdStart = this.time;
        this.setMoving(false);
    }
    /** Place at the first frame of a step (used for the opening shot) */
    cutToStart(step) {
        const { path, look, fov } = this.resolve(step);
        this.tween?.kill();
        this.pos.copy(path[0]);
        this.look.copy(look[0]);
        this.fov = fov;
        this.camera.fov = fov;
        this.camera.updateProjectionMatrix();
    }
    /**
     * Fly from wherever the camera is now through the step's path.
     * The first authored point is replaced by the live pose so moves can be
     * interrupted and re-targeted at any time without a jump.
     */
    play(step, opts = {}) {
        const { path, look, fov } = this.resolve(step);
        this.tween?.kill();
        const startPos = this.camera.position.clone();
        const startLook = this.currentAim();
        const pPts = [startPos, ...path.slice(1)];
        const lPts = [startLook, ...look.slice(1)];
        if (pPts.length === 1)
            pPts.push(path[0].clone());
        if (lPts.length === 1)
            lPts.push(look[0].clone());
        const pCurve = new THREE.CatmullRomCurve3(pPts, false, 'centripetal', 0.5);
        const lCurve = new THREE.CatmullRomCurve3(lPts, false, 'centripetal', 0.5);
        const fov0 = this.camera.fov;
        const state = { t: 0 };
        const dur = this.opts.reducedMotion ? Math.min(2.5, step.duration * 0.3) : step.duration / (opts.speed ?? 1);
        this.holdOrbit = step.idleOrbit ?? 0.05;
        this.setMoving(true);
        return new Promise((resolve) => {
            this.tween = gsap.to(state, {
                t: 1,
                duration: dur,
                ease: step.ease ?? 'power2.inOut',
                onUpdate: () => {
                    pCurve.getPointAt(state.t, this.pos);
                    lCurve.getPointAt(state.t, this.look);
                    this.fov = fov0 + (fov - fov0) * state.t;
                },
                onComplete: () => {
                    this.holdStart = this.time;
                    this.setMoving(false);
                    resolve();
                },
            });
        });
    }
    /** Where the lens is currently aimed (including hold offsets) */
    currentAim() {
        const dir = new THREE.Vector3();
        this.camera.getWorldDirection(dir);
        const dist = this.camera.position.distanceTo(this.look);
        return this.camera.position.clone().addScaledVector(dir, Math.max(dist, 0.1));
    }
    setMoving(m) {
        if (this.moving === m)
            return;
        this.moving = m;
        this.listeners.forEach((fn) => fn(m));
    }
    stop() {
        this.tween?.kill();
        this.setMoving(false);
    }
    update(dt) {
        this.time += dt;
        const t = this.time;
        this.parallax.lerp(this.parallaxTarget, 1 - Math.exp(-dt * 2.5));
        // hold blend fades in after each move so there is no snap
        const hold = this.moving ? 0 : THREE.MathUtils.smoothstep(t - this.holdStart, 0, 3);
        const rel = this.pos.clone().sub(this.look);
        const orbitA = Math.sin((t - this.holdStart) * 0.12) * this.holdOrbit * hold;
        rel.applyAxisAngle(new THREE.Vector3(0, 1, 0), orbitA);
        const p = this.look.clone().add(rel);
        // breathing + parallax (screen-space offsets, scaled by subject distance)
        const right = new THREE.Vector3().crossVectors(rel.clone().normalize().negate(), new THREE.Vector3(0, 1, 0)).normalize();
        const dist = rel.length();
        const px = this.opts.reducedMotion ? 0 : this.parallax.x * Math.min(0.6, dist * 0.045);
        const py = this.opts.reducedMotion ? 0 : this.parallax.y * Math.min(0.35, dist * 0.03);
        p.addScaledVector(right, px);
        p.y += py + Math.sin(t * 0.7) * 0.03 * (0.4 + hold * 0.6);
        this.camera.position.copy(p);
        this.camera.lookAt(this.look);
        if (Math.abs(this.camera.fov - this.fov) > 0.01) {
            this.camera.fov = this.fov;
            this.camera.updateProjectionMatrix();
        }
    }
    dispose() {
        this.tween?.kill();
        this.listeners.clear();
    }
}
