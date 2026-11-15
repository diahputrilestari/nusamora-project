import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { STORYBOARD, WORLD_SPOTS } from '../../data/storyboard.js';
import { experienceStore } from '../../stores/experience.js';
import { activeTheme } from '../../themes/active.js';
/**
 * DIRECTOR MODE (open the invitation with #director) — the authoring tool
 * for new themes. Fly a free camera through the world, record keyframes,
 * preview them as a real cinematic move and copy the step JSON straight into
 * src/themes/<id>/shots.json.
 *
 *   drag / right-drag / wheel   orbit, pan, dolly (OrbitControls)
 *   W A S D, Q E, Shift         fly; Q/E down/up; Shift = fast
 *   K                           add keyframe (eye + target)
 *   Shift + click               pick a surface point → spot / easel pose
 *   P                           preview recorded keyframes
 *
 * Framework-agnostic: used by the preview engine and the R3F WorldRoot.
 */
export const isDirectorMode = () => typeof location !== 'undefined' && location.hash === '#director';
const r2 = (n) => Math.round(n * 100) / 100;
const r3 = (n) => Math.round(n * 1000) / 1000;
const vArr = (v) => [r2(v.x), r2(v.y), r2(v.z)];
const CSS = `
.dm{position:fixed;top:max(12px,env(safe-area-inset-top,0px));left:max(12px,env(safe-area-inset-left,0px));z-index:9999;width:min(340px,calc(100vw - 24px));max-height:calc(100dvh - 24px);overflow:auto;
background:rgba(22,18,16,.86);color:#f3ead9;font:12px/1.45 ui-monospace,SFMono-Regular,Menlo,monospace;border:1px solid rgba(233,214,176,.25);border-radius:10px;padding:12px;backdrop-filter:blur(8px)}
.dm h3{margin:0 0 6px;font:600 13px/1.2 system-ui,sans-serif;letter-spacing:.06em;text-transform:uppercase;color:#e9d6b0}
.dm .row{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0}
.dm button,.dm select,.dm input{font:inherit;color:#2b2420;background:#e9d6b0;border:0;border-radius:6px;padding:5px 8px;cursor:pointer}
.dm input{width:64px;cursor:text}
.dm button.ghost{background:transparent;color:#e9d6b0;border:1px solid rgba(233,214,176,.4)}
.dm pre{white-space:pre-wrap;word-break:break-all;background:rgba(0,0,0,.35);padding:6px;border-radius:6px;margin:6px 0;max-height:160px;overflow:auto}
.dm .muted{color:#b9ab93}
.dm-pick{position:fixed;width:14px;height:14px;margin:-7px 0 0 -7px;border:2px solid #ffd08a;border-radius:50%;pointer-events:none;z-index:9998}
html.director-mode #overlay{display:none!important}
`;
export function startDirectorMode(o) {
    const { camera, canvas, world, director, controller } = o;
    document.documentElement.classList.add('director-mode');
    const style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);
    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.12;
    controls.target.copy(director.look);
    controls.update();
    let free = true;
    const keys = new Set();
    const frames = [];
    let picked = null;
    const marker = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 8), new THREE.MeshBasicMaterial({ color: '#ffd08a', depthTest: false, toneMapped: false }));
    marker.renderOrder = 999;
    marker.visible = false;
    world.root.add(marker);
    const trail = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: '#ffd08a', depthTest: false }));
    trail.renderOrder = 998;
    world.root.add(trail);
    /* ───────────── panel ───────────── */
    const el = document.createElement('div');
    el.className = 'dm';
    el.innerHTML = `
    <h3>Director · ${activeTheme.label}</h3>
    <div class="muted">drag orbit · right-drag pan · wheel dolly · WASD/QE fly · K keyframe · P preview · Shift+click pick</div>
    <pre id="dmPose"></pre>
    <div class="row">
      <label class="muted">fov <input id="dmFov" type="number" min="15" max="90" step="1"></label>
      <label class="muted">dur <input id="dmDur" type="number" min="1" max="30" step="0.5" value="8"></label>
      <label class="muted"><input id="dmFade" type="checkbox" style="width:auto"> fade</label>
    </div>
    <div class="row">
      <button id="dmKey">+ Keyframe (K)</button>
      <button id="dmUndo" class="ghost">Undo</button>
      <button id="dmClear" class="ghost">Clear</button>
    </div>
    <div class="row">
      <button id="dmPlay">▶ Preview (P)</button>
      <button id="dmCopy">Copy step JSON</button>
    </div>
    <pre id="dmOut" class="muted">No keyframes yet.</pre>
    <h3>Pick</h3>
    <pre id="dmPick" class="muted">Shift+click a floor or stage.</pre>
    <div class="row">
      <button id="dmCopyPose" class="ghost">Copy pose [x,y,z,ry]</button>
      <button id="dmCouple" class="ghost">Put couple here</button>
    </div>
    <h3>Film</h3>
    <div class="row">
      <select id="dmScene">${STORYBOARD.map((s, i) => `<option value="${i}">${i}. ${s.id}</option>`).join('')}</select>
      <button id="dmWatch">Watch</button>
      <button id="dmFree" class="ghost">Free cam</button>
    </div>
    <div class="row">
      <select id="dmSpot">${Object.keys(WORLD_SPOTS).map((k) => `<option>${k}</option>`).join('') || '<option disabled>garden spots</option>'}</select>
      <button id="dmSpotGo" class="ghost">Couple → spot</button>
    </div>
    <div id="dmMsg" class="muted"></div>`;
    document.body.appendChild(el);
    const $ = (id) => el.querySelector('#' + id);
    const fovIn = $('dmFov');
    fovIn.value = String(Math.round(camera.fov));
    const msg = (t) => ($('dmMsg').textContent = t);
    const copy = async (text) => {
        try {
            await navigator.clipboard.writeText(text);
            msg('Copied to clipboard.');
        }
        catch {
            const ta = document.createElement('textarea');
            ta.value = text;
            el.appendChild(ta);
            ta.select();
            let ok = false;
            try {
                ok = document.execCommand('copy');
            }
            catch {
                /* ignore */
            }
            ta.remove();
            msg(ok ? 'Copied.' : 'Copy blocked — select the text above.');
        }
    };
    const stepJSON = () => {
        const step = {};
        if ($('dmFade').checked)
            step.transition = 'fade';
        step.path = frames.map((f) => vArr(f.eye));
        step.look = frames.map((f) => vArr(f.look));
        step.duration = Number($('dmDur').value) || 8;
        step.fov = Number(fovIn.value) || 38;
        step.mobileFov = Math.min(70, Math.round((Number(fovIn.value) || 38) * 1.45));
        step.idleOrbit = 0.08;
        return step;
    };
    const refresh = () => {
        $('dmOut').textContent = frames.length ? JSON.stringify(stepJSON()) : 'No keyframes yet.';
        trail.geometry.dispose();
        trail.geometry = new THREE.BufferGeometry().setFromPoints(frames.map((f) => f.eye));
    };
    const toStep = () => {
        if (frames.length < 1)
            return null;
        const path = frames.map((f) => f.eye.clone());
        const look = frames.map((f) => f.look.clone());
        if (path.length === 1) {
            path.unshift(camera.position.clone());
            look.unshift(controls.target.clone());
        }
        return { path, look, duration: Number($('dmDur').value) || 8, fov: Number(fovIn.value) || 38, idleOrbit: 0 };
    };
    const addKey = () => {
        frames.push({ eye: camera.position.clone(), look: controls.target.clone() });
        refresh();
    };
    const goFree = () => {
        free = true;
        controls.enabled = true;
        controls.target.copy(director.look);
        controls.update();
        msg('Free camera.');
    };
    const preview = () => {
        const step = toStep();
        if (!step)
            return msg('Add at least one keyframe.');
        free = false;
        controls.enabled = false;
        director.cutToStart(step);
        camera.position.copy(step.path[0]);
        director.play(step).then(() => {
            if (!free)
                goFree();
        });
        msg('Previewing…');
    };
    const watch = () => {
        free = false;
        controls.enabled = false;
        const s = experienceStore.getState();
        s.setPhase('playing');
        s.goTo(Number($('dmScene').value), 0);
        msg('Watching the film — press Free cam to take over.');
    };
    $('dmKey').onclick = addKey;
    $('dmUndo').onclick = () => {
        frames.pop();
        refresh();
    };
    $('dmClear').onclick = () => {
        frames.length = 0;
        refresh();
    };
    $('dmPlay').onclick = preview;
    $('dmCopy').onclick = () => (frames.length ? copy(JSON.stringify(stepJSON(), null, 1)) : msg('Add keyframes first.'));
    $('dmCopyPose').onclick = () => (picked ? copy(JSON.stringify([...vArr(picked.p), r3(picked.ry)])) : msg('Shift+click a point first.'));
    $('dmCouple').onclick = () => picked && world.couple.placeAt(picked.p.clone(), picked.ry);
    $('dmWatch').onclick = watch;
    $('dmFree').onclick = goFree;
    $('dmSpotGo').onclick = () => world.placeCouple($('dmSpot').value);
    fovIn.oninput = () => {
        camera.fov = Number(fovIn.value) || 38;
        camera.updateProjectionMatrix();
    };
    // the panel must not leak clicks/wheel into the film's navigation
    for (const t of ['pointerdown', 'wheel', 'touchstart', 'touchend', 'keydown'])
        el.addEventListener(t, (e) => e.stopPropagation());
    /* ───────────── input ───────────── */
    const ray = new THREE.Raycaster();
    const onPick = (e) => {
        e.stopPropagation();
        if (!e.shiftKey)
            return;
        const r = canvas.getBoundingClientRect();
        ray.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), camera);
        const hit = ray
            .intersectObject(world.root, true)
            .find((h) => h.object.isMesh && h.object !== marker && h.object.name !== 'sky' && h.distance < 800);
        if (!hit)
            return msg('Nothing under the cursor.');
        // couple/easel faces the camera
        const ry = Math.atan2(camera.position.x - hit.point.x, camera.position.z - hit.point.z);
        picked = { p: hit.point.clone(), ry };
        marker.position.copy(hit.point);
        marker.visible = true;
        $('dmPick').textContent = `point ${JSON.stringify(vArr(hit.point))}\nfacing camera ry ${r3(ry)}\nmesh "${hit.object.name || '(unnamed)'}"`;
    };
    const swallow = (e) => e.stopPropagation();
    canvas.addEventListener('pointerdown', onPick);
    for (const t of ['wheel', 'touchstart', 'touchend', 'pointerup'])
        canvas.addEventListener(t, swallow);
    const FLY = new Set(['w', 'a', 's', 'd', 'q', 'e', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', 'pagedown', 'pageup']);
    const onKeyDown = (e) => {
        const k = e.key.toLowerCase();
        if (e.target?.tagName === 'INPUT')
            return;
        if (FLY.has(k) || k === 'k' || k === 'p' || k === 'shift')
            e.stopImmediatePropagation();
        if (k === 'k' && !e.repeat)
            addKey();
        else if (k === 'p' && !e.repeat)
            preview();
        else
            keys.add(k);
    };
    const onKeyUp = (e) => keys.delete(e.key.toLowerCase());
    window.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('keyup', onKeyUp, true);
    const fwd = new THREE.Vector3();
    const right = new THREE.Vector3();
    const move = new THREE.Vector3();
    const poseEl = $('dmPose');
    let poseT = 0;
    return {
        get free() {
            return free;
        },
        update(dt) {
            poseT += dt;
            if (poseT > 0.1) {
                poseT = 0;
                poseEl.textContent = `eye    ${JSON.stringify(vArr(camera.position))}\ntarget ${JSON.stringify(vArr(free ? controls.target : director.look))}\nfov    ${Math.round(camera.fov)}  keys ${frames.length}`;
            }
            if (!free)
                return;
            move.set(0, 0, 0);
            camera.getWorldDirection(fwd);
            fwd.y = 0;
            fwd.normalize();
            right.crossVectors(fwd, camera.up).normalize();
            if (keys.has('w') || keys.has('arrowup'))
                move.add(fwd);
            if (keys.has('s') || keys.has('arrowdown'))
                move.sub(fwd);
            if (keys.has('d') || keys.has('arrowright'))
                move.add(right);
            if (keys.has('a') || keys.has('arrowleft'))
                move.sub(right);
            if (keys.has('e'))
                move.y += 1;
            if (keys.has('q'))
                move.y -= 1;
            if (move.lengthSq() > 0) {
                move.normalize().multiplyScalar(dt * (keys.has('shift') ? 18 : 5));
                camera.position.add(move);
                controls.target.add(move);
            }
            controls.update();
            // keep the cinematic director in sync so Watch/Preview start from here
            director.pos.copy(camera.position);
            director.look.copy(controls.target);
        },
        dispose() {
            controls.dispose();
            canvas.removeEventListener('pointerdown', onPick);
            for (const t of ['wheel', 'touchstart', 'touchend', 'pointerup'])
                canvas.removeEventListener(t, swallow);
            window.removeEventListener('keydown', onKeyDown, true);
            window.removeEventListener('keyup', onKeyUp, true);
            world.root.remove(marker, trail);
            marker.geometry.dispose();
            marker.material.dispose();
            trail.geometry.dispose();
            el.remove();
            style.remove();
            document.documentElement.classList.remove('director-mode');
            void controller;
        },
    };
}
