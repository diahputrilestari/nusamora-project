import * as THREE from 'three';
import { fetchGLTF } from '../../utils/gltf.js';
import { activeTheme } from '../../themes/active.js';
import { buildBride, buildGroom } from './procedural.js';
export async function loadCharacterGLB(url, scale, idleClip) {
    const gltf = await fetchGLTF(url);
    const obj = gltf.scene;
    obj.scale.setScalar(scale);
    obj.traverse((o) => {
        const m = o;
        if (m.isMesh) {
            m.castShadow = true;
            m.receiveShadow = true;
        }
    });
    let mixer = null;
    if (gltf.animations.length) {
        mixer = new THREE.AnimationMixer(obj);
        const clip = THREE.AnimationClip.findByName(gltf.animations, idleClip) ?? gltf.animations[0];
        mixer.clipAction(clip).play();
    }
    return { obj, mixer };
}
export function buildCouple(cfg, onProgress) {
    const root = new THREE.Group();
    root.name = 'couple';
    const bride = buildBride(cfg);
    const groom = buildGroom(cfg);
    bride.object.position.set(-0.3, 0, 0.02);
    bride.object.rotation.y = 0.22;
    groom.object.position.set(0.32, 0, -0.04);
    groom.object.rotation.y = -0.2;
    root.add(bride.object, groom.object);
    const mixers = [];
    // models without an idle clip still breathe a little so they never look frozen
    const stills = [];
    const swap = (slot, url) => {
        if (!url)
            return Promise.resolve();
        onProgress?.(`Loading ${slot} model`);
        return loadCharacterGLB(url, cfg.characters.modelScale, cfg.characters.idleClip)
            .then(({ obj, mixer }) => {
            const target = slot === 'bride' ? bride.object : groom.object;
            obj.position.copy(target.position);
            obj.rotation.copy(target.rotation);
            // wide gowns: step outward so the couple never intersects
            const half = new THREE.Box3().setFromObject(obj).getSize(new THREE.Vector3()).x / 2;
            const side = slot === 'bride' ? -1 : 1;
            obj.position.x += side * Math.max(0, half - 0.3);
            obj.name = slot;
            root.remove(target);
            root.add(obj);
            if (mixer)
                mixers.push(mixer);
            else
                stills.push({ obj, base: obj.scale.y, phase: slot === 'bride' ? 0 : 1.3 });
            if (slot === 'bride')
                bride.update = () => { };
            else
                groom.update = () => { };
        })
            .catch((e) => console.warn(`[couple] ${slot} GLB failed, keeping procedural figure`, e));
    };
    // a theme can bring one model holding both avatars (traditional dress)
    const themed = activeTheme.characters;
    const swapCouple = (url, height, rotY) => {
        onProgress?.('Loading couple model');
        return fetchGLTF(url)
            .then((gltf) => {
            const obj = gltf.scene;
            const box = new THREE.Box3().setFromObject(obj);
            const size = box.getSize(new THREE.Vector3());
            const k = height / size.y;
            obj.scale.setScalar(k);
            const c = box.getCenter(new THREE.Vector3());
            obj.position.set(-c.x * k, -box.min.y * k, -c.z * k);
            const holder = new THREE.Group();
            holder.name = 'couple-avatar';
            holder.rotation.y = rotY;
            holder.add(obj);
            obj.traverse((o) => {
                const m = o;
                if (m.isMesh) {
                    m.castShadow = true;
                    m.receiveShadow = true;
                    (Array.isArray(m.material) ? m.material : [m.material]).forEach((mat) => (mat.side = THREE.FrontSide));
                }
            });
            root.remove(bride.object, groom.object);
            root.add(holder);
            stills.push({ obj: holder, base: 1, phase: 0 });
            bride.update = () => { };
            groom.update = () => { };
        })
            .catch((e) => console.warn('[couple] theme couple GLB failed, keeping procedural figures', e));
    };
    const ready = (themed?.coupleModelUrl
        ? swapCouple(themed.coupleModelUrl, themed.height ?? 1.6, themed.rotationY ?? 0)
        : Promise.all([swap('bride', cfg.characters.brideModelUrl), swap('groom', cfg.characters.groomModelUrl)])).then(() => undefined);
    return {
        object: root,
        update: (t, dt) => {
            bride.update(t);
            groom.update(t);
            mixers.forEach((m) => m.update(dt));
            for (const s of stills)
                s.obj.scale.y = s.base * (1 + Math.sin(t * 1.4 + s.phase) * 0.004);
        },
        ready,
        placeAt: (p, rotY) => {
            root.position.copy(p);
            root.rotation.y = rotY;
        },
        dispose: () => {
            root.traverse((o) => {
                const m = o;
                if (m.isMesh) {
                    m.geometry.dispose();
                    (Array.isArray(m.material) ? m.material : [m.material]).forEach((mat) => mat.dispose());
                }
            });
        },
    };
}
