import * as THREE from 'three';
import { LAYOUT, heightAt, isOpenGround } from './layout.js';
import { bake, foliageBlob, lathe, merge } from './geometry.js';
import { instanced } from './vegetation.js';
import { materials } from './materials.js';
import { catenary, fairyLights } from './architecture.js';
import { mulberry32, pick, range } from '../../../utils/random.js';
import { applyWind } from '../../../utils/wind.js';
/**
 * Dusk flower-garden dressing: hydrangea bushes, glowing lantern pedestals,
 * a carpet of fallen petals over the paths and string lights across the
 * avenue. All instanced; counts follow the device profile.
 */
const tmpQ = new THREE.Quaternion();
const tmpE = new THREE.Euler();
/* ───────────────────────── Hydrangeas ───────────────────────── */
export function buildHydrangeas(cfg, q) {
    const r = mulberry32(808);
    const spots = [];
    const add = (x, z, s = 1) => spots.push({ x, z, s: s * range(r, 0.8, 1.2) });
    // in front of the avenue hedges
    for (let z = -3; z > -43; z -= 2.6) {
        if (Math.abs(z - LAYOUT.fountain.z) < 6.5)
            continue;
        add(-5.3 + range(r, -0.2, 0.2), z);
        add(5.3 + range(r, -0.2, 0.2), z);
    }
    // ring around the pavilion plaza
    for (let k = 0; k < 18; k++) {
        const a = (k / 18) * Math.PI * 2;
        if (Math.cos(a) > 0.82)
            continue; // keep the avenue entrance open
        add(LAYOUT.pavilion.x + Math.sin(a) * 8.3, LAYOUT.pavilion.z + Math.cos(a) * 8.3, 1.15);
    }
    // ceremony lawn borders
    for (let z = -87; z > -118; z -= 2.4) {
        add(-8.9, z, 1.1);
        add(8.9, z, 1.1);
    }
    // gate approach
    for (const s of [-1, 1])
        for (let x = 9; x < 17; x += 1.8)
            add(s * x, 1.4, 1.2);
    // lakeside meadow clusters
    for (let i = 0; i < (q.mobile ? 20 : 45); i++) {
        const x = range(r, 6, 30);
        const z = range(r, -40, -94);
        if (isOpenGround(x, z, 1))
            add(x, z, 0.9);
    }
    const leafGeo = foliageBlob(0.5, 3, new THREE.Color('#3f5c33'), new THREE.Color('#79a05a'), 2);
    leafGeo.scale(1, 0.62, 1);
    const headGeo = foliageBlob(0.2, 11, new THREE.Color('#d9d0e6'), new THREE.Color('#ffffff'), 3);
    const leafM = [];
    const headM = [];
    const headC = [];
    const palette = cfg.theme.hydrangea.map((c) => new THREE.Color(c));
    for (const sp of spots) {
        const y = heightAt(sp.x, sp.z);
        tmpQ.setFromEuler(tmpE.set(0, r() * 6.28, 0));
        leafM.push(new THREE.Matrix4().compose(new THREE.Vector3(sp.x, y + 0.22 * sp.s, sp.z), tmpQ.clone(), new THREE.Vector3(sp.s, sp.s, sp.s)));
        const base = pick(r, palette);
        const heads = 5 + Math.floor(r() * 3);
        for (let h = 0; h < heads; h++) {
            const a = (h / heads) * Math.PI * 2 + r();
            const d = h === 0 ? 0 : range(r, 0.22, 0.36);
            const p = new THREE.Vector3(sp.x + Math.cos(a) * d * sp.s, y + (0.48 + range(r, -0.06, 0.08) - d * 0.35) * sp.s, sp.z + Math.sin(a) * d * sp.s);
            const s = range(r, 0.8, 1.15) * sp.s;
            headM.push(new THREE.Matrix4().compose(p, tmpQ.setFromEuler(tmpE.set(r(), r() * 6, r())).clone(), new THREE.Vector3(s, s * 0.85, s)));
            headC.push(base.clone().offsetHSL(range(r, -0.02, 0.02), 0, range(r, -0.05, 0.05)));
        }
    }
    const leafMat = applyWind(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 }), { amplitude: 0.03, height: 0.6, frequency: 1.3 });
    const headMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, emissive: '#3a2a4a', emissiveIntensity: 0.18 });
    const g = new THREE.Group();
    g.name = 'hydrangeas';
    const leaves = instanced(leafGeo, leafMat, leafM);
    const flowers = instanced(headGeo, headMat, headM, headC);
    leaves.castShadow = flowers.castShadow = q.shadows;
    leaves.receiveShadow = true;
    g.add(leaves, flowers);
    return { object: g };
}
/* ─────────────────────── Lantern pedestals ─────────────────────── */
export function buildLanternPosts(cfg, q) {
    const mats = materials(cfg);
    const spots = [];
    for (let z = -2; z > -44; z -= 6) {
        if (Math.abs(z - LAYOUT.fountain.z) < 6)
            continue;
        spots.push(new THREE.Vector3(-3.1, 0, z), new THREE.Vector3(3.1, 0, z));
    }
    // pavilion front steps and ceremony stage, like the reference's lanterns on plinths
    const P = LAYOUT.pavilion;
    spots.push(new THREE.Vector3(P.x - 2.1, 0, P.z + 6.1), new THREE.Vector3(P.x + 2.1, 0, P.z + 6.1));
    spots.push(new THREE.Vector3(P.x - 3.6, 0, P.z + 5.4), new THREE.Vector3(P.x + 3.6, 0, P.z + 5.4));
    const A = LAYOUT.altar;
    spots.push(new THREE.Vector3(-5.6, 0, A.z + 2.6), new THREE.Vector3(5.6, 0, A.z + 2.6));
    spots.push(new THREE.Vector3(-1.4, 0, -88.3), new THREE.Vector3(1.4, 0, -88.3));
    const plinth = lathe([[0, 0], [0.24, 0], [0.24, 0.06], [0.19, 0.1], [0.17, 0.62], [0.22, 0.68], [0.23, 0.74], [0, 0.74]], 4, Math.PI / 4);
    const cage = merge([
        bake(lathe([[0, 0], [0.17, 0], [0.17, 0.04], [0.15, 0.06], [0, 0.06]], 6), '#c9a24e'),
        bake(lathe([[0.15, 0.44], [0.2, 0.47], [0.1, 0.56], [0.02, 0.62], [0, 0.63]], 6), '#c9a24e'),
    ]);
    const glass = lathe([[0.0, 0.06], [0.13, 0.06], [0.13, 0.44], [0, 0.44]], 6);
    const flame = new THREE.SphereGeometry(0.075, 10, 8);
    flame.scale(1, 1.4, 1);
    const mP = [];
    const mC = [];
    const mF = [];
    for (const s of spots) {
        const y = heightAt(s.x, s.z);
        mP.push(new THREE.Matrix4().makeTranslation(s.x, y, s.z));
        mC.push(new THREE.Matrix4().makeTranslation(s.x, y + 0.74, s.z));
        mF.push(new THREE.Matrix4().makeTranslation(s.x, y + 0.98, s.z));
    }
    const goldV = new THREE.MeshStandardMaterial({ vertexColors: true, metalness: 1, roughness: 0.3 });
    const glow = new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffd08a').multiplyScalar(2.6), toneMapped: false });
    const g = new THREE.Group();
    g.name = 'lanterns';
    const plinths = instanced(plinth, mats.marbleWarm, mP);
    plinths.castShadow = q.shadows;
    const glassMat = new THREE.MeshStandardMaterial({ color: '#fff1d6', emissive: '#ffbf6a', emissiveIntensity: 1.4, transparent: true, opacity: 0.6 });
    g.add(plinths, instanced(cage, goldV, mC), instanced(glass, glassMat, mC), instanced(flame, glow, mF));
    return { object: g };
}
/* ───────────────────────── Petal carpet ───────────────────────── */
export function buildPetalCarpet(cfg, q) {
    const r = mulberry32(515);
    const geo = new THREE.CircleGeometry(0.045, 7);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const y = pos.getY(i);
        pos.setY(i, y * 0.62);
        pos.setZ(i, (x * x + y * y) * 4);
    }
    geo.rotateX(-Math.PI / 2);
    geo.computeVertexNormals();
    const palette = ['#ffffff', '#fde4ec', '#f7b6cf', '#f29bbd', '#ffd3df'].map((c) => new THREE.Color(c));
    const mats = [];
    const cols = [];
    const n = q.mobile ? 1200 : 3200;
    const P = LAYOUT.pavilion;
    for (let i = 0; i < n; i++) {
        let x;
        let z;
        const zone = r();
        if (zone < 0.45) {
            x = range(r, -2.5, 2.5);
            z = range(r, 12, -84);
        }
        else if (zone < 0.7) {
            const a = r() * Math.PI * 2;
            const d = Math.sqrt(r()) * 7;
            x = P.x + Math.cos(a) * d;
            z = P.z + Math.sin(a) * d;
        }
        else if (zone < 0.82) {
            const a = r() * Math.PI * 2;
            const d = Math.sqrt(r()) * 5.2;
            x = LAYOUT.fountain.x + Math.cos(a) * d;
            z = LAYOUT.fountain.z + Math.sin(a) * d;
            if (d < 3.7)
                continue; // not in the basin
        }
        else {
            x = range(r, -7.5, 7.5);
            z = range(r, -86, -106);
        }
        const s = range(r, 0.7, 1.5);
        mats.push(new THREE.Matrix4().compose(new THREE.Vector3(x, heightAt(x, z) + 0.065 + r() * 0.01, z), tmpQ.setFromEuler(tmpE.set(range(r, -0.2, 0.2), r() * 6.28, range(r, -0.2, 0.2))).clone(), new THREE.Vector3(s, s, s)));
        cols.push(pick(r, palette));
    }
    const mat = new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 0.6, emissive: '#4a2030', emissiveIntensity: 0.12 });
    const mesh = instanced(geo, mat, mats, cols);
    mesh.receiveShadow = true;
    mesh.name = 'petal-carpet';
    return { object: mesh };
}
/* ─────────────────── String lights over the avenue ─────────────────── */
export function buildAvenueLights(q) {
    const curves = [];
    for (const z of [-4, -11, -31, -38, -45]) {
        const y = heightAt(0, z);
        curves.push(catenary(new THREE.Vector3(-7.6, y + 5.6, z), new THREE.Vector3(7.6, y + 5.6, z), 1.1));
    }
    // along each side, cypress to cypress
    for (const s of [-1, 1]) {
        for (let z = -6; z > -41; z -= 6.5) {
            if (Math.abs(z - LAYOUT.fountain.z) < 5 || Math.abs(z - 6.5 - LAYOUT.fountain.z) < 5)
                continue;
            curves.push(catenary(new THREE.Vector3(s * 7.6, 4.8, z), new THREE.Vector3(s * 7.6, 4.8, z - 6.5), 0.8));
        }
    }
    return fairyLights(curves, q.mobile ? 16 : 26);
}
