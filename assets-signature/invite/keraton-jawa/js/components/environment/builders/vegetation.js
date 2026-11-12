import * as THREE from 'three';
import { LAYOUT, heightAt, isOpenGround } from './layout.js';
import { bake, blossomGeometry, foliageBlob, lathe, leafGeometry, merge } from './geometry.js';
import { fbm, mulberry32, pick, range } from '../../../utils/random.js';
import { applyWind } from '../../../utils/wind.js';
const tmpM = new THREE.Matrix4();
const tmpQ = new THREE.Quaternion();
const tmpS = new THREE.Vector3();
const tmpP = new THREE.Vector3();
const tmpE = new THREE.Euler();
const tmpC = new THREE.Color();
function instanced(geo, mat, mats, colors) {
    const mesh = new THREE.InstancedMesh(geo, mat, Math.max(1, mats.length));
    mats.forEach((m, i) => mesh.setMatrixAt(i, m));
    if (colors)
        colors.forEach((c, i) => mesh.setColorAt(i, c));
    mesh.count = mats.length;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor)
        mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
    return mesh;
}
/* ───────────────────────────── Trees ───────────────────────────── */
export function roundTreeGeometry(seed, dark, light) {
    const r = mulberry32(seed);
    const parts = [];
    const trunk = lathe([
        [0.42, 0],
        [0.3, 0.3],
        [0.24, 1.2],
        [0.2, 2.6],
        [0.12, 3.6],
        [0, 3.7],
    ], 9);
    parts.push(bake(trunk, '#6b5442'));
    for (let b = 0; b < 3; b++) {
        const a = (b / 3) * Math.PI * 2 + r();
        const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(0, 2.2, 0), new THREE.Vector3(Math.cos(a) * 0.6, 3.0, Math.sin(a) * 0.6), new THREE.Vector3(Math.cos(a) * 1.4, 3.9, Math.sin(a) * 1.4));
        parts.push(bake(new THREE.TubeGeometry(curve, 6, 0.09, 5), '#6b5442'));
    }
    const blobs = 6 + Math.floor(r() * 3);
    for (let i = 0; i < blobs; i++) {
        const a = r() * Math.PI * 2;
        const d = i === 0 ? 0 : range(r, 0.9, 1.7);
        const rad = i === 0 ? 1.9 : range(r, 1.05, 1.5);
        const g = foliageBlob(rad, seed * 10 + i, dark, light, 2);
        g.translate(Math.cos(a) * d, 3.7 + range(r, -0.5, 0.9) + (i === 0 ? 0.4 : 0), Math.sin(a) * d);
        parts.push(g);
    }
    return merge(parts);
}
export function cypressGeometry(seed) {
    const parts = [];
    parts.push(bake(lathe([[0.18, 0], [0.12, 0.8], [0, 0.9]], 6), '#5d4a3b'));
    const g = lathe([
        [0.0, 0.5],
        [0.55, 0.8],
        [0.92, 1.8],
        [0.95, 3.0],
        [0.78, 4.6],
        [0.46, 6.2],
        [0.18, 7.3],
        [0.0, 7.8],
    ], 14);
    // subdivide feel with noise bumps
    const pos = g.attributes.position;
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
        v.fromBufferAttribute(pos, i);
        const a = Math.atan2(v.z, v.x);
        const n = fbm(Math.cos(a) * 1.6 + seed, v.y * 0.9 + Math.sin(a) * 1.6, 3);
        const k = 1 + n * 0.28;
        pos.setXYZ(i, v.x * k, v.y, v.z * k);
    }
    g.computeVertexNormals();
    const dark = new THREE.Color('#3b4d34');
    const light = new THREE.Color('#7d8a55');
    parts.push(bake(g, (y) => tmpC.copy(dark).lerp(light, THREE.MathUtils.clamp(y / 8, 0, 1) * 0.8)));
    return merge(parts);
}
export function buildTrees(q, cfg) {
    const group = new THREE.Group();
    group.name = 'trees';
    const r = mulberry32(77);
    // cypress avenue + ceremony lawn frame
    const cyp = [];
    const addCyp = (x, z, s) => {
        tmpP.set(x, heightAt(x, z) - 0.1, z);
        tmpQ.setFromEuler(tmpE.set(0, r() * 6.28, 0));
        tmpS.set(s, s * range(r, 0.95, 1.12), s);
        cyp.push(new THREE.Matrix4().compose(tmpP.clone(), tmpQ.clone(), tmpS.clone()));
    };
    for (let z = -6; z > -42; z -= 6.5) {
        if (Math.abs(z - LAYOUT.fountain.z) < 5)
            continue;
        addCyp(-7.8, z, 0.9);
        addCyp(7.8, z, 0.9);
    }
    for (let z = -86; z > -120; z -= 6) {
        addCyp(-11.5, z, 1.05);
        addCyp(11.5, z, 1.05);
    }
    addCyp(-5, -120, 1.2);
    addCyp(5, -120, 1.2);
    const cypMat = applyWind(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 }), {
        amplitude: 0.12,
        height: 8,
        frequency: 0.9,
    });
    const cypMesh = instanced(cypressGeometry(5), cypMat, cyp);
    cypMesh.castShadow = q.shadows;
    cypMesh.receiveShadow = q.shadows;
    group.add(cypMesh);
    // round trees: three silhouettes, scattered by density field
    // two blossom canopies (deep and pale pink) and one green for depth
    const bDark = new THREE.Color(cfg.theme.blossom[0]);
    const bLight = new THREE.Color(cfg.theme.blossom[1]);
    const variants = [
        roundTreeGeometry(1, bDark, bLight),
        roundTreeGeometry(2, bDark.clone().lerp(bLight, 0.45), new THREE.Color('#ffffff')),
        roundTreeGeometry(3, new THREE.Color('#4f6a40'), new THREE.Color('#a9b86e')),
    ];
    const buckets = [[], [], []];
    const tints = [[], [], []];
    const target = Math.round(520 * q.trees);
    let tries = 0;
    let placed = 0;
    while (placed < target && tries < target * 30) {
        tries++;
        const x = range(r, -190, 190);
        const z = range(r, 60, -260);
        const dx = x;
        const dz = z + 60;
        const dist = Math.hypot(dx, dz);
        if (!isOpenGround(x, z, 3.5))
            continue;
        // keep lawns open near the avenue, thicken toward the edges and lakeshore
        if (Math.abs(x) < 24 && z > -8)
            continue; // keep the gate approach clear for the opening shot
        const nearAvenue = Math.abs(x) < 20 && z > -125 && z < 10;
        if (nearAvenue && r() > 0.12)
            continue;
        const forest = fbm(x * 0.02, z * 0.02, 3) * 0.5 + 0.5;
        if (r() > forest * 1.1 + (dist > 90 ? 0.2 : 0))
            continue;
        if (dist > 230)
            continue;
        const v = Math.floor(r() * 3);
        const s = range(r, 0.8, 1.35) * (dist > 120 ? 1.4 : 1);
        tmpP.set(x, heightAt(x, z) - 0.2, z);
        tmpQ.setFromEuler(tmpE.set(0, r() * 6.28, 0));
        tmpS.set(s, s * range(r, 0.9, 1.15), s);
        buckets[v].push(new THREE.Matrix4().compose(tmpP.clone(), tmpQ.clone(), tmpS.clone()));
        tints[v].push(new THREE.Color().setHSL(range(r, 0.9, 1.0), range(r, 0.1, 0.3), range(r, 0.9, 1)));
        placed++;
    }
    const treeMat = applyWind(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92 }), {
        amplitude: 0.1,
        height: 7,
        frequency: 0.8,
    });
    variants.forEach((geo, i) => {
        const m = instanced(geo, treeMat, buckets[i], tints[i]);
        m.castShadow = q.shadows;
        m.receiveShadow = q.shadows;
        group.add(m);
    });
    return { object: group };
}
/* ───────────────────────────── Hedges ───────────────────────────── */
export function buildHedges(q) {
    const g = new THREE.BoxGeometry(1, 1, 1, 10, 5, 4);
    const pos = g.attributes.position;
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
        v.fromBufferAttribute(pos, i);
        // round the edges then add leafy noise
        const rx = Math.abs(v.x) > 0.42 ? 0.06 : 0;
        const ry = v.y > 0.42 ? 0.05 : 0;
        const n = fbm(v.x * 6, v.y * 6 + v.z * 6, 3) * 0.06;
        v.x *= 1 - ry * 0.8;
        v.z *= 1 - ry * 1.2 - rx * 0.6;
        v.y += 0.5 + n;
        v.x += Math.sign(v.x) * n * 0.6;
        v.z += Math.sign(v.z) * n;
        pos.setXYZ(i, v.x, v.y, v.z);
    }
    g.computeVertexNormals();
    const dark = new THREE.Color('#465a3a');
    const light = new THREE.Color('#7f8d58');
    const geo = bake(g, (y) => tmpC.copy(dark).lerp(light, y));
    const mats = [];
    const add = (x, z, len, rotY = 0, h = 1.05) => {
        tmpP.set(x, heightAt(x, z) - 0.05, z);
        tmpQ.setFromEuler(tmpE.set(0, rotY, 0));
        tmpS.set(len, h, 0.95);
        mats.push(new THREE.Matrix4().compose(tmpP.clone(), tmpQ.clone(), tmpS.clone()));
    };
    for (let z = -4; z > -43; z -= 4.2) {
        if (Math.abs(z - LAYOUT.fountain.z) < 6)
            continue;
        add(-6.1, z, 4, Math.PI / 2);
        add(6.1, z, 4, Math.PI / 2);
    }
    // low box hedges framing the ceremony lawn
    for (let z = -88; z > -118; z -= 3.6) {
        add(-9.7, z, 3.4, Math.PI / 2, 0.7);
        add(9.7, z, 3.4, Math.PI / 2, 0.7);
    }
    // fountain ring
    for (let k = 0; k < 14; k++) {
        const a = (k / 14) * Math.PI * 2;
        if (Math.abs(Math.sin(a)) < 0.3)
            continue; // openings for the avenue
        add(LAYOUT.fountain.x + Math.sin(a) * 7.3, LAYOUT.fountain.z + Math.cos(a) * 7.3, 3.1, a + Math.PI / 2, 0.8);
    }
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 });
    const mesh = instanced(geo, mat, mats);
    mesh.castShadow = q.shadows;
    mesh.receiveShadow = true;
    mesh.name = 'hedges';
    return { object: mesh };
}
/* ───────────────────────────── Grass ───────────────────────────── */
export function buildGrass(q, cfg) {
    const tip = new THREE.Color(cfg.theme.ground.bladeTip);
    const blade = new THREE.PlaneGeometry(0.05, 0.3, 1, 4);
    blade.translate(0, 0.15, 0);
    const pos = blade.attributes.position;
    for (let i = 0; i < pos.count; i++) {
        const y = pos.getY(i) / 0.3;
        pos.setX(i, pos.getX(i) * (1 - y * 0.92));
        pos.setZ(i, y * y * 0.07);
    }
    blade.computeVertexNormals();
    const geo = bake(blade, (y) => tmpC.set(cfg.theme.ground.bladeBase).lerp(tip, y / 0.3));
    const mat = applyWind(new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.85 }), { amplitude: 0.08, height: 0.3, frequency: 2.1 });
    const r = mulberry32(11);
    const mats = [];
    const cols = [];
    let tries = 0;
    while (mats.length < q.grass && tries < q.grass * 8) {
        tries++;
        // concentrate blades where the camera travels
        const zone = r();
        let x;
        let z;
        if (zone < 0.62) {
            x = range(r, -18, 18);
            z = range(r, 12, -124);
        }
        else {
            x = range(r, 3, 30);
            z = range(r, -36, -96);
        }
        if (!isOpenGround(x, z, 0.1))
            continue;
        const s = range(r, 0.6, 1.35);
        tmpP.set(x, heightAt(x, z), z);
        tmpQ.setFromEuler(tmpE.set(range(r, -0.2, 0.2), r() * 6.28, range(r, -0.2, 0.2)));
        tmpS.set(s, s * range(r, 0.6, 1.2), s);
        mats.push(new THREE.Matrix4().compose(tmpP.clone(), tmpQ.clone(), tmpS.clone()));
        cols.push(new THREE.Color().setHSL(range(r, 0.2, 0.28), range(r, 0.25, 0.45), range(r, 0.75, 1)));
    }
    const mesh = instanced(geo, mat, mats, cols);
    mesh.receiveShadow = q.shadows;
    mesh.name = 'grass';
    return { object: mesh };
}
/* ──────────────────────────── Flowers ──────────────────────────── */
export function buildFlowerBeds(q, palette) {
    const group = new THREE.Group();
    group.name = 'flowers';
    const r = mulberry32(23);
    const heads = [];
    const headCols = [];
    const stems = [];
    const paletteCols = palette.map((p) => new THREE.Color(p));
    const plant = (x, z, scale = 1) => {
        const ground = heightAt(x, z);
        const h = range(r, 0.28, 0.6) * scale;
        const s = range(r, 0.8, 1.3) * scale;
        tmpQ.setFromEuler(tmpE.set(range(r, -0.25, 0.25), r() * 6.28, range(r, -0.25, 0.25)));
        tmpP.set(x, ground, z);
        tmpS.set(s, h / 0.4, s);
        stems.push(new THREE.Matrix4().compose(tmpP.clone(), tmpQ.clone(), tmpS.clone()));
        tmpP.set(x, ground + h, z);
        tmpS.set(s, s, s);
        heads.push(new THREE.Matrix4().compose(tmpP.clone(), tmpQ.clone(), tmpS.clone()));
        const c = pick(r, paletteCols).clone();
        c.offsetHSL(range(r, -0.01, 0.01), 0, range(r, -0.04, 0.03));
        headCols.push(c);
    };
    const budget = q.flowers;
    // 1. parterre beds along the avenue
    for (let i = 0; i < budget * 0.38; i++) {
        const side = r() < 0.5 ? -1 : 1;
        const x = side * range(r, 3.2, 5.4);
        const z = range(r, -3, -43);
        if (!isOpenGround(x, z))
            continue;
        plant(x, z);
    }
    // 2. rings around the fountain and pavilion
    for (let i = 0; i < budget * 0.2; i++) {
        const center = r() < 0.45 ? LAYOUT.fountain : LAYOUT.pavilion;
        const r0 = center === LAYOUT.fountain ? 5.7 : 7.6;
        const a = r() * Math.PI * 2;
        const d = r0 + range(r, 0, 1.4);
        const x = center.x + Math.sin(a) * d;
        const z = center.z + Math.cos(a) * d;
        if (Math.abs(x) < 2.8)
            continue;
        plant(x, z);
    }
    // 3. ceremony lawn borders
    for (let i = 0; i < budget * 0.18; i++) {
        const side = r() < 0.5 ? -1 : 1;
        const x = side * range(r, 8.4, 9.2);
        const z = range(r, -86, -118);
        plant(x, z, 0.9);
    }
    // 4. wildflower meadow by the lake and across the lawns
    for (let i = 0; i < budget * 0.24; i++) {
        const x = range(r, 4, 34);
        const z = range(r, -34, -98);
        if (!isOpenGround(x, z, 0.2))
            continue;
        if (fbm(x * 0.15, z * 0.15, 2) < -0.05)
            continue;
        plant(x, z, 0.8);
    }
    const stemGeo = merge([
        bake(new THREE.CylinderGeometry(0.006, 0.009, 0.4, 4, 1).translate(0, 0.2, 0), '#6c7f4b'),
        bake(leafGeometry(0.1, 0.035).translate(0, 0.12, 0), '#7a8f55'),
        bake(leafGeometry(0.09, 0.03).rotateY(2.5).translate(0, 0.22, 0), '#7a8f55'),
    ]);
    const stemMat = applyWind(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, side: THREE.DoubleSide }), {
        amplitude: 0.06,
        height: 0.4,
        frequency: 2.0,
    });
    const headMat = applyWind(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, emissive: '#3a2418', emissiveIntensity: 0.15 }), { amplitude: 0.06, height: 0.4, frequency: 2.0 });
    // heads sway like their stems: shift sway pivot by using a tall virtual height
    headMat.onBeforeCompile = ((orig) => (shader, renderer) => {
        orig(shader, renderer);
        shader.vertexShader = shader.vertexShader.replace('float h = clamp(position.y / 0.400, 0.0, 1.0);', 'float h = 1.0;');
    })(headMat.onBeforeCompile);
    headMat.customProgramCacheKey = () => 'flower-head';
    const stemMesh = instanced(stemGeo, stemMat, stems);
    const headMesh = instanced(blossomGeometry(), headMat, heads, headCols);
    headMesh.castShadow = false;
    group.add(stemMesh, headMesh);
    return { object: group };
}
export { instanced };
