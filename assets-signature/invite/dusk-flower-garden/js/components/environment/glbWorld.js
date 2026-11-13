import * as THREE from 'three';
import { buildClouds, buildMountains, buildSky } from './builders/landscape.js';
import { instanced, roundTreeGeometry } from './builders/vegetation.js';
import { lathe, leafGeometry } from './builders/geometry.js';
import { buildEasel, roseMound } from './builders/architecture.js';
import { disposeMaterials, materials } from './builders/materials.js';
import { buildCouple } from '../characters/couple.js';
import { buildMotes, buildPetals } from '../particles/petals.js';
import { WORLD_SPOTS, WORLD_STATIONS } from '../../data/storyboard.js';
import { activeTheme } from '../../themes/active.js';
import { fetchGLTF } from '../../utils/gltf.js';
import { fbm, mulberry32, range } from '../../utils/random.js';
import { applyWind, windUniforms } from '../../utils/wind.js';
import { disposeTextureCache, loadPhoto, monogramArt, softDotTexture } from '../../utils/textures.js';
import { coupleNames } from '../../data/wedding.config.js';
/**
 * GLB WORLD — the universal theme world. The film is shot inside any
 * environment model named by the active theme (theme.world.modelUrl); every
 * surrounding element is procedural and driven by the theme's data: sky,
 * terrain, horizon landmark, trees, approach road, props, story easels,
 * petals, lamplight and sun direction. No per-theme code lives here.
 *
 * GLB contract: Y-up, metres, ground at y = 0, main entrance facing +Z
 * (or corrected with world.transform). Camera paths and couple spots live in
 * the theme's shots.json.
 */
const SCRIPT_FONT = '"Pinyon Script", "Great Vibes", cursive';
const CAPS_FONT = '"Marcellus", "Cinzel", Georgia, serif';
/** Beyond this (m) the couple is skipped; every film reaches them through a fade */
const COUPLE_DRAW_DISTANCE = 20;
const tick = () => new Promise((r) => requestAnimationFrame(() => r()));
function spec() {
    if (activeTheme.world.kind !== 'glb')
        throw new Error('buildGlbWorld needs a glb theme');
    return activeTheme.world;
}
function insideFootprint(W, x, z, pad = 0) {
    const F = W.footprint;
    return x > F.minX - pad && x < F.maxX + pad && z > F.minZ - pad && z < F.maxZ + pad;
}
/** Terrain height outside the footprint: flat near the model, rolling hills beyond */
function terrainHeight(W, x, z) {
    const c = W.terrain?.center ?? [0, 0, 0];
    const flat = W.terrain?.flatRadius ?? 70;
    const hill = W.terrain?.hillHeight ?? 18;
    const d = Math.hypot(x - c[0], z - c[2]);
    return THREE.MathUtils.smoothstep(d, flat, flat + 190) * (fbm(x * 0.012, z * 0.012, 4) * hill + hill * 0.55);
}
/* ───────────────────────── surroundings ───────────────────────── */
function buildGround(cfg, q, W) {
    const g = cfg.theme.ground;
    const seg = q.tier === 'low' ? 120 : 200;
    const size = W.terrain?.size ?? 900;
    const c0 = W.terrain?.center ?? [0, 0, 0];
    const geo = new THREE.PlaneGeometry(size, size, seg, seg);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    const cols = new Float32Array(pos.count * 3);
    const a = new THREE.Color(g.grassA);
    const b = new THREE.Color(g.grassB);
    const far = new THREE.Color(g.far);
    const R = W.road;
    const road = new THREE.Color(R?.color ?? '#b59a76');
    const c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const z = pos.getZ(i);
        const d = Math.hypot(x - c0[0], z - c0[2]);
        pos.setY(i, insideFootprint(W, x, z, 2) ? -0.06 : terrainHeight(W, x, z) - 0.06);
        c.copy(a).lerp(b, fbm(x * 0.05, z * 0.05, 3) * 0.5 + 0.5);
        // the approach road toward the entrance
        if (R && Math.abs(x - R.centerX) < R.halfWidth && z > R.fromZ && z < R.toZ)
            c.lerp(road, 1 - THREE.MathUtils.smoothstep(Math.abs(x - R.centerX), R.halfWidth * 0.65, R.halfWidth));
        c.lerp(far, THREE.MathUtils.smoothstep(d, 120, 320) * 0.7);
        cols.set([c.r, c.g, c.b], i * 3);
    }
    geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.97 }));
    mesh.receiveShadow = true;
    mesh.name = 'ground';
    return { object: mesh };
}
/** A volcano on the horizon (Merapi in keraton-jawa) */
function buildVolcano(cfg, at, scale = 1, withSmoke = true) {
    const prof = [];
    for (let i = 0; i <= 30; i++) {
        const t = i / 30;
        prof.push([Math.max(0.01, 260 * Math.pow(1 - t, 1.6) + 16), t * 150]);
    }
    prof.push([0, 152]);
    const geo = lathe(prof, 64);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const z = pos.getZ(i);
        const y = pos.getY(i);
        const n = fbm(Math.atan2(z, x) * 3, y * 0.03, 4);
        const k = 1 + n * 0.12 * (1 - y / 160);
        pos.setXYZ(i, x * k, y + (y > 140 ? -n * 6 : 0), z * k);
    }
    geo.computeVertexNormals();
    const mat = new THREE.MeshStandardMaterial({ color: new THREE.Color(cfg.theme.sky.zenith).lerp(new THREE.Color('#5a4e66'), 0.5), roughness: 1 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(...at);
    mesh.scale.setScalar(scale);
    mesh.name = 'landmark-volcano';
    if (!withSmoke)
        return { object: mesh };
    // thin smoke plume
    const smoke = new THREE.Sprite(new THREE.SpriteMaterial({ map: softDotTexture(), color: '#e8d2c8', transparent: true, opacity: 0.35, depthWrite: false, fog: false }));
    smoke.scale.set(60, 80, 1);
    smoke.position.set(0, 190, 0);
    mesh.add(smoke);
    return { object: mesh, update: (t) => (smoke.material.rotation = Math.sin(t * 0.05) * 0.1) };
}
/** Trees outside the footprint, keeping the entrance axis and road clear */
function buildOutsideTrees(cfg, q, W) {
    const T = W.trees;
    const r = mulberry32(T.seed ?? 4242);
    const canopies = T.canopies?.length ? T.canopies : [cfg.theme.blossom];
    const variants = canopies.map(([d, l], i) => roundTreeGeometry(11 + i, new THREE.Color(d), new THREE.Color(l)));
    const buckets = variants.map(() => []);
    const radius = T.radius ?? 240;
    const c0 = W.terrain?.center ?? [0, 0, 0];
    const axisX = W.road?.centerX ?? 0;
    const target = Math.round(T.count * q.trees);
    let tries = 0;
    while (buckets.flat().length < target && tries < target * 40) {
        tries++;
        const x = c0[0] + range(r, -radius, radius);
        const z = c0[2] + range(r, -radius, radius);
        if (insideFootprint(W, x, z, 5))
            continue;
        if (T.clearAxis && Math.abs(x - axisX) < T.clearAxis && z > W.footprint.maxZ - 8)
            continue; // entrance axis and road
        const d = Math.hypot(x - c0[0], z - c0[2]);
        if (d > radius)
            continue;
        if (r() > fbm(x * 0.02, z * 0.02, 3) * 0.5 + 0.75)
            continue;
        const s = range(r, 0.9, 1.5) * (d > 90 ? 1.5 : 1.1);
        const y = terrainHeight(W, x, z) - 0.3;
        buckets[Math.floor(r() * buckets.length)].push(new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, r() * 6.28, 0)), new THREE.Vector3(s, s * range(r, 0.9, 1.2), s)));
    }
    const mat = applyWind(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 }), { amplitude: 0.1, height: 7, frequency: 0.8 });
    const g = new THREE.Group();
    variants.forEach((geo, i) => {
        const m = instanced(geo, mat, buckets[i]);
        m.castShadow = q.shadows;
        g.add(m);
    });
    return { object: g };
}
/** Janur kuning: curved young-coconut-leaf poles that announce a Javanese wedding */
function buildJanur(q, P) {
    const g = new THREE.Group();
    g.name = 'janur';
    const [px, , pz] = P.position;
    const sp = P.spread;
    const hk = (P.height ?? 8.6) / 8.6;
    const yellow = new THREE.MeshStandardMaterial({ color: P.color ?? '#f1d36b', roughness: 0.55, side: THREE.DoubleSide, emissive: '#5a4310', emissiveIntensity: 0.25 });
    const bamboo = new THREE.MeshStandardMaterial({ color: '#c9a35c', roughness: 0.6 });
    const strip = leafGeometry(0.9, 0.05);
    strip.rotateZ(-Math.PI / 2); // hang downward
    const r = mulberry32(17);
    for (const s of [-1, 1]) {
        const k = sp / 3.6;
        const root = new THREE.Vector3(px + s * sp, P.position[1], pz);
        const curve = new THREE.CatmullRomCurve3([
            root.clone(),
            new THREE.Vector3(px + s * sp, root.y + 4.5 * hk, pz),
            new THREE.Vector3(px + s * 3.3 * k, root.y + 7.4 * hk, pz + 0.2),
            new THREE.Vector3(px + s * 2.0 * k, root.y + 8.6 * hk, pz + 0.6),
            new THREE.Vector3(px + s * 0.9 * k, root.y + 7.8 * hk, pz + 0.8),
        ]);
        const pole = new THREE.Mesh(new THREE.TubeGeometry(curve, 64, 0.06, 8), bamboo);
        pole.castShadow = q.shadows;
        g.add(pole);
        // woven leaf crown wrapped along the curve + hanging ribbons
        const m = [];
        for (let i = 0; i < 140; i++) {
            const t = 0.35 + (i / 140) * 0.65;
            const p = curve.getPointAt(t);
            const tan = curve.getTangentAt(t);
            const q2 = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), tan);
            q2.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), (i % 8) * 0.785));
            q2.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), range(r, 0.6, 1.4)));
            m.push(new THREE.Matrix4().compose(p, q2, new THREE.Vector3(1, range(r, 0.5, 1.1), 1).multiplyScalar(0.55)));
        }
        for (let i = 0; i < 16; i++) {
            const p = curve.getPointAt(0.93 + (i / 16) * 0.07);
            m.push(new THREE.Matrix4().compose(p, new THREE.Quaternion().setFromEuler(new THREE.Euler(range(r, -0.2, 0.2), r() * 6.28, range(r, -0.15, 0.15))), new THREE.Vector3(1, range(r, 1.4, 2.6), 1)));
        }
        const leaves = instanced(strip, applyWind(yellow.clone(), { amplitude: 0.05, height: -1, frequency: 1.4 }), m);
        g.add(leaves);
    }
    return { object: g };
}
/** Warm glows over every oil lamp in the model (bloom does the rest) */
function buildLampGlows(points, color = '#ffc46a') {
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const mat = new THREE.PointsMaterial({
        map: softDotTexture(),
        color: new THREE.Color(color).multiplyScalar(2.2),
        size: 1.4,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
    });
    const p = new THREE.Points(geo, mat);
    return { object: p, update: (t) => (mat.opacity = 0.8 + Math.sin(t * 6.1) * 0.06 + Math.sin(t * 13.7) * 0.04) };
}
function storyEasels(cfg) {
    const g = new THREE.Group();
    WORLD_STATIONS.forEach(({ easel: [x, y, z, ry] }, i) => {
        const ch = cfg.story[i];
        if (!ch)
            return;
        const art = monogramArt({
            key: `story-${i}`,
            w: 512,
            h: 400,
            lines: [
                { text: ch.year, font: CAPS_FONT, size: 30, color: '#9a7a3c', gap: 6 },
                { text: ch.title, font: SCRIPT_FONT, size: 84, color: '#5a4636' },
            ],
        });
        const e = buildEasel(cfg, loadPhoto(ch.image || cfg.gallery[i] || '', art), 1.05, 0.82);
        e.position.set(x, y, z);
        e.rotation.y = ry;
        g.add(e);
    });
    return { object: g };
}
function welcomeEasel(cfg, P) {
    const [n1, n2] = coupleNames(cfg);
    const welcome = monogramArt({
        key: 'welcome',
        lines: [
            { text: P.heading, font: CAPS_FONT, size: 26, color: '#6b5a4a', gap: 24 },
            { text: n1, font: SCRIPT_FONT, size: 92, color: '#8a6a2c', gap: 0 },
            { text: '&', font: SCRIPT_FONT, size: 60, color: '#b48d4a', gap: 0 },
            { text: n2, font: SCRIPT_FONT, size: 92, color: '#8a6a2c', gap: 30 },
            { text: cfg.weddingDateLabel.toUpperCase(), font: CAPS_FONT, size: 20, color: '#6b5a4a' },
        ],
    });
    const w = buildEasel(cfg, loadPhoto(cfg.couplePhoto, welcome), P.width ?? 1.1, P.height ?? 1.38);
    w.position.set(P.pose[0], P.pose[1], P.pose[2]);
    w.rotation.y = P.pose[3];
    return { object: w };
}
/** Simple lantern posts: dark post, glowing flame, soft halo */
function lanterns(q, P) {
    const h = P.height ?? 1.1;
    const g = new THREE.Group();
    g.name = 'lanterns';
    const post = new THREE.CylinderGeometry(0.035, 0.05, h, 6);
    post.translate(0, h / 2, 0);
    const head = lathe([[0, 0], [0.11, 0], [0.11, 0.22], [0.05, 0.3], [0, 0.31]], 6);
    const postMat = new THREE.MeshStandardMaterial({ color: '#3a2e24', roughness: 0.6, metalness: 0.3 });
    const glowMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(P.color ?? '#ffd08a').multiplyScalar(2.4), toneMapped: false });
    const mP = P.positions.map(([x, y, z]) => new THREE.Matrix4().makeTranslation(x, y, z));
    const mH = P.positions.map(([x, y, z]) => new THREE.Matrix4().makeTranslation(x, y + h, z));
    const posts = instanced(post, postMat, mP);
    posts.castShadow = q.shadows;
    g.add(posts, instanced(head, glowMat, mH));
    const halo = buildLampGlows(P.positions.map(([x, y, z]) => new THREE.Vector3(x, y + h + 0.15, z)), P.color ?? '#ffc46a');
    g.add(halo.object);
    return { object: g, update: halo.update };
}
function flowerMounds(cfg, P) {
    const g = new THREE.Group();
    g.name = 'flower-mounds';
    P.positions.forEach(([x, y, z], i) => {
        const m = roseMound(cfg, P.radius ?? 0.45, 70, 900 + i);
        m.position.set(x, y + (P.radius ?? 0.45) * 0.4, z);
        g.add(m);
    });
    return { object: g };
}
function buildProp(cfg, q, P) {
    switch (P.type) {
        case 'janur':
            return buildJanur(q, P);
        case 'welcomeEasel':
            return welcomeEasel(cfg, P);
        case 'lanterns':
            return lanterns(q, P);
        case 'flowerMounds':
            return flowerMounds(cfg, P);
    }
}
/* ───────────────────────────── world ───────────────────────────── */
export async function buildGlbWorld(cfg, q, onProgress) {
    const root = new THREE.Group();
    root.name = `world-${activeTheme.id}`;
    const W = spec();
    const updatables = [];
    const add = (u) => {
        root.add(u.object);
        updatables.push(u);
    };
    materials(cfg);
    onProgress(0.05, 'Opening the gates');
    await tick();
    // start the big download first; build the surroundings while it streams
    const modelP = fetchGLTF(W.modelUrl);
    const extraP = (W.extraModels ?? []).map((e) => fetchGLTF(e.url));
    const steps = [
        ['Painting the evening sky', () => add(buildSky(cfg))],
        ['Laying the grounds', () => add(buildGround(cfg, q, W))],
        ['Raising the horizon', () => {
                if (W.landmark?.type === 'volcano')
                    add(buildVolcano(cfg, W.landmark.position, W.landmark.scale, W.landmark.smoke ?? true));
                if (W.distantHills !== false) {
                    add(buildMountains());
                    add(buildClouds(q));
                }
            }],
        ['Planting the trees', () => W.trees && W.trees.count > 0 && add(buildOutsideTrees(cfg, q, W))],
        [W.labels?.surroundings ?? 'Setting the decorations', () => (W.props ?? []).forEach((p) => add(buildProp(cfg, q, p)))],
        ['Placing the story easels', () => add(storyEasels(cfg))],
    ];
    for (let i = 0; i < steps.length; i++) {
        onProgress(0.08 + (i / steps.length) * 0.4, steps[i][0]);
        await tick();
        steps[i][1]();
    }
    onProgress(0.55, W.labels?.model ?? 'Raising the venue');
    const lampName = W.lampMaterial ?? 'lamp';
    const shiny = new Set(W.shinyMaterials ?? []);
    const lampPts = [];
    const placeModel = (model, name, t) => {
        model.name = name;
        if (t) {
            if (t.position)
                model.position.set(...t.position);
            if (t.rotationY)
                model.rotation.y = t.rotationY;
            if (t.scale)
                model.scale.setScalar(t.scale);
        }
        model.traverse((o) => {
            const m = o;
            if (!m.isMesh)
                return;
            m.castShadow = q.shadows && t?.castShadow !== false;
            m.receiveShadow = true;
            const mats = Array.isArray(m.material) ? m.material : [m.material];
            for (const mat of mats) {
                if (t?.singleSided)
                    mat.side = THREE.FrontSide;
                if (mat.name === lampName) {
                    mat.emissiveIntensity = 3.2;
                    mat.toneMapped = false;
                }
                if (shiny.has(mat.name))
                    mat.envMapIntensity = 1.4;
            }
        });
        // lamp positions: centres of the emissive 'lamp' primitives
        model.updateMatrixWorld(true);
        model.traverse((o) => {
            const m = o;
            if (!m.isMesh || m.material.name !== lampName)
                return;
            const pos = m.geometry.attributes.position;
            const cells = new Map();
            const v = new THREE.Vector3();
            for (let i = 0; i < pos.count; i++) {
                v.fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld);
                const k = `${Math.round(v.x / 1.5)},${Math.round(v.z / 1.5)}`;
                if (!cells.has(k))
                    cells.set(k, []);
                cells.get(k).push(v.clone());
            }
            cells.forEach((pts) => {
                const c = pts.reduce((a, b) => a.add(b), new THREE.Vector3()).divideScalar(pts.length);
                lampPts.push(c);
            });
        });
        root.add(model);
    };
    placeModel((await modelP).scene, 'venue', W.transform);
    // hero models (e.g. a sculpted rumah gadang) placed into the compound
    for (let i = 0; i < extraP.length; i++) {
        const e = W.extraModels[i];
        onProgress(0.6 + (0.18 * (i + 1)) / extraP.length, e.label ?? 'Placing the centrepiece');
        placeModel((await extraP[i]).scene, e.name ?? `hero-${i}`, e);
    }
    if (lampPts.length)
        add(buildLampGlows(lampPts, W.lampColor));
    onProgress(0.8, 'Dressing the bride and groom');
    await tick();
    const couple = buildCouple(cfg);
    root.add(couple.object);
    await Promise.race([couple.ready, new Promise((r) => setTimeout(r, 20000))]);
    couple.object.traverse((o) => {
        if (o.isMesh)
            o.castShadow = q.shadows;
    });
    const petals = buildPetals(q.petals, W.petals ?? cfg.theme.flowerPalette);
    add(petals);
    add(buildMotes(q.motes));
    const hemi = new THREE.HemisphereLight(cfg.theme.light.sky, cfg.theme.light.ground, W.hemiIntensity ?? 0.85);
    root.add(hemi);
    const sun = new THREE.DirectionalLight(cfg.theme.light.sun, W.sunIntensity ?? 3.1);
    const sunDir = new THREE.Vector3(...W.sunDirection).normalize();
    sun.castShadow = q.shadows;
    sun.shadow.mapSize.set(q.shadowMapSize, q.shadowMapSize);
    const sc = sun.shadow.camera;
    sc.left = -26;
    sc.right = 26;
    sc.top = 26;
    sc.bottom = -26;
    sc.near = 1;
    sc.far = 180;
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.04;
    root.add(sun, sun.target);
    for (const L of W.interiorLights ?? []) {
        const pl = new THREE.PointLight(L.color ?? '#ffc27a', L.intensity, L.distance ?? 12, 2);
        pl.position.set(...L.position);
        root.add(pl);
    }
    const fill = new THREE.DirectionalLight('#ffe2c4', 0.6);
    fill.position.set(20, 18, 60);
    root.add(fill);
    const focusShadows = (p) => {
        sun.target.position.copy(p);
        sun.position.copy(p).addScaledVector(sunDir, 90);
    };
    focusShadows(new THREE.Vector3(0, 0, 20));
    const spotNames = Object.keys(WORLD_SPOTS);
    const placeCouple = (spot) => {
        const s = WORLD_SPOTS[spot] ?? WORLD_SPOTS[spotNames[0]] ?? [0, 0, 0, 0];
        couple.placeAt(new THREE.Vector3(s[0], s[1], s[2]), s[3]);
    };
    placeCouple(spotNames[0]);
    onProgress(1, 'Ready');
    return {
        root,
        sun,
        hemi,
        couple,
        petals,
        focusShadows,
        placeCouple,
        update: (t, dt, camera) => {
            windUniforms.uTime.value = t;
            for (const u of updatables)
                u.update?.(t, dt, camera);
            // the character models are heavy (hundreds of thousands of triangles);
            // from far away they are a few pixels tall, so only draw them up close
            const near = camera.position.distanceTo(couple.object.position) < COUPLE_DRAW_DISTANCE;
            couple.object.visible = near;
            if (near)
                couple.update(t, dt);
        },
        dispose: () => {
            root.traverse((o) => {
                const m = o;
                if (m.geometry)
                    m.geometry.dispose();
                const mat = m.material;
                if (mat)
                    (Array.isArray(mat) ? mat : [mat]).forEach((x) => x.dispose());
            });
            couple.dispose();
            disposeMaterials();
            disposeTextureCache();
        },
    };
}
