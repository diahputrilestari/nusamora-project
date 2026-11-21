import * as THREE from 'three';
import { LAYOUT, heightAt } from './layout.js';
import { bake, columnProfile, flute, lathe, leafGeometry, merge, roseGeometry, scatterAlongCurve } from './geometry.js';
import { instanced } from './vegetation.js';
import { materials } from './materials.js';
import { mulberry32, pick, range } from '../../../utils/random.js';
import { applyWind } from '../../../utils/wind.js';
import { softDotTexture, monogramArt, loadPhoto } from '../../../utils/textures.js';
import { coupleNames, monogram } from '../../../data/wedding.config.js';
const SCRIPT_FONT = '"Pinyon Script", "Great Vibes", cursive';
const CAPS_FONT = '"Marcellus", "Cinzel", Georgia, serif';
/* ───────────────────────── shared pieces ───────────────────────── */
let roseGeo = null;
let leafGeo = null;
const rose = () => (roseGeo ?? (roseGeo = roseGeometry(3)));
const leaf = () => (leafGeo ?? (leafGeo = leafGeometry(0.16, 0.06)));
/** Dense floral garland (roses + foliage) following a curve */
export function garland(cfg, curve, opts) {
    const r = mulberry32(opts.seed);
    const mats = materials(cfg);
    const palette = cfg.theme.flowerPalette.map((c) => new THREE.Color(c));
    const roseM = scatterAlongCurve(curve, opts.roses, opts.jitter, opts.seed, opts.scale ?? [1.4, 2.6]);
    const roseCols = roseM.map(() => pick(r, palette).clone().offsetHSL(0, 0, range(r, -0.05, 0.02)));
    const leafM = scatterAlongCurve(curve, opts.leaves, opts.jitter * 1.3, opts.seed + 1, [1.0, 2.0]);
    const g = new THREE.Group();
    const roses = instanced(rose(), mats.petals, roseM, roseCols);
    const leaves = instanced(leaf(), mats.leaves, leafM);
    roses.castShadow = leaves.castShadow = true;
    g.add(leaves, roses);
    return g;
}
/** Twinkling string lights along curves (additive points, bloom picks them up) */
export function fairyLights(curves, perCurve) {
    const pts = [];
    const phase = [];
    const r = mulberry32(5);
    for (const c of curves) {
        for (let i = 0; i <= perCurve; i++) {
            const p = c.getPoint(i / perCurve);
            pts.push(p.x, p.y, p.z);
            phase.push(r() * 6.28);
        }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    geo.setAttribute('aPhase', new THREE.Float32BufferAttribute(phase, 1));
    const mat = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: { uTime: { value: 0 }, uMap: { value: softDotTexture() }, uSize: { value: 26 } },
        vertexShader: /* glsl */ `
      attribute float aPhase;
      uniform float uTime, uSize;
      varying float vA;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vA = 0.65 + 0.35 * sin(uTime * 2.2 + aPhase);
        gl_PointSize = uSize * (0.8 + 0.2 * vA) / -mv.z;
        gl_Position = projectionMatrix * mv;
      }`,
        fragmentShader: /* glsl */ `
      uniform sampler2D uMap;
      varying float vA;
      void main() {
        vec4 t = texture2D(uMap, gl_PointCoord);
        gl_FragColor = vec4(vec3(1.0, 0.78, 0.45) * 2.2, t.a * vA);
      }`,
    });
    const points = new THREE.Points(geo, mat);
    points.frustumCulled = false;
    return {
        object: points,
        update: (t) => {
            mat.uniforms.uTime.value = t;
        },
    };
}
/** Catenary between two points */
export function catenary(a, b, sag) {
    const mid = a.clone().lerp(b, 0.5);
    mid.y -= sag;
    return new THREE.QuadraticBezierCurve3(a.clone(), mid, b.clone());
}
function classicalColumn(height, radius, mat, fluted = true) {
    const g = lathe(columnProfile(height, radius), 32);
    if (fluted)
        flute(g, height * 0.13, height * 0.85, 20, 0.05);
    const m = new THREE.Mesh(g, mat);
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
}
/** Square pedestal with mouldings: a 4-sided lathe rotated 45° */
function pedestal(w, h, mat) {
    const r = (w / 2) * Math.SQRT2;
    const g = lathe([
        [0, 0],
        [r * 1.12, 0],
        [r * 1.12, h * 0.12],
        [r, h * 0.18],
        [r, h * 0.82],
        [r * 1.1, h * 0.88],
        [r * 1.14, h],
        [0, h],
    ], 4, Math.PI / 4);
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, mat);
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
}
function urn(mat) {
    const g = lathe([
        [0, 0],
        [0.32, 0],
        [0.3, 0.08],
        [0.14, 0.16],
        [0.16, 0.3],
        [0.42, 0.55],
        [0.5, 0.78],
        [0.46, 0.9],
        [0.54, 0.96],
        [0.5, 1.0],
        [0, 0.95],
    ], 28);
    const m = new THREE.Mesh(g, mat);
    m.castShadow = true;
    return m;
}
/** Mound of roses for urns and posies */
export function roseMound(cfg, radius, count, seed) {
    const r = mulberry32(seed);
    const mats = materials(cfg);
    const palette = cfg.theme.flowerPalette.map((c) => new THREE.Color(c));
    const rm = [];
    const rc = [];
    const lm = [];
    const q = new THREE.Quaternion();
    const up = new THREE.Vector3(0, 1, 0);
    for (let i = 0; i < count; i++) {
        const n = new THREE.Vector3(range(r, -1, 1), range(r, 0.15, 1), range(r, -1, 1)).normalize();
        const p = n.clone().multiplyScalar(radius * range(r, 0.85, 1.05));
        p.y *= 0.75;
        q.setFromUnitVectors(up, n);
        const s = range(r, 1.6, 2.6);
        rm.push(new THREE.Matrix4().compose(p, q.clone(), new THREE.Vector3(s, s, s)));
        rc.push(pick(r, palette));
        if (i % 2 === 0) {
            const lp = p.clone().multiplyScalar(1.05);
            lp.y -= 0.05;
            const lq = new THREE.Quaternion().setFromEuler(new THREE.Euler(range(r, -0.6, 0.2), r() * 6.28, 0));
            lm.push(new THREE.Matrix4().compose(lp, lq, new THREE.Vector3(1.6, 1.6, 1.6)));
        }
    }
    const g = new THREE.Group();
    g.add(instanced(rose(), mats.petals, rm, rc), instanced(leaf(), mats.leaves, lm));
    return g;
}
function plaqueTexture(cfg) {
    const [a, b] = coupleNames(cfg);
    return monogramArt({
        key: 'gate-medallion',
        w: 512,
        h: 512,
        lines: [
            { text: monogram(cfg).split('').join(' & '), font: SCRIPT_FONT, size: 120, color: '#8a6a2c', gap: 10 },
            { text: `${a.toUpperCase()}  ·  ${b.toUpperCase()}`, font: CAPS_FONT, size: 26, color: '#5b4a3c', gap: 10 },
        ],
    });
}
/* ────────────────────────────── Gate ───────────────────────────── */
export function buildGate(cfg, q) {
    const mats = materials(cfg);
    const group = new THREE.Group();
    group.name = 'gate';
    const baseY = heightAt(0, 0);
    group.position.set(0, baseY, 0);
    const colH = 5.4;
    const pedH = 1.1;
    const springY = pedH + colH + 0.35;
    const span = 3.5;
    for (const s of [-1, 1]) {
        const ped = pedestal(1.25, pedH, mats.marbleWarm);
        ped.position.set(s * span, 0, 0);
        const col = classicalColumn(colH, 0.32, mats.marble);
        col.position.set(s * span, pedH, 0);
        // impost block
        const imp = pedestal(1.05, 0.35, mats.marbleWarm);
        imp.position.set(s * span, pedH + colH, 0);
        // flanking urns overflowing with roses
        const u = urn(mats.marbleWarm);
        u.position.set(s * (span + 1.6), 0, 0.9);
        u.scale.setScalar(1.15);
        const mound = roseMound(cfg, 0.55, q.mobile ? 40 : 70, 10 + s);
        mound.position.set(s * (span + 1.6), 1.12, 0.9);
        group.add(ped, col, imp, u, mound);
    }
    // the arch: marble archivolt + fine gold beading
    const archCurve = new THREE.EllipseCurve(0, springY, span, span * 0.92, 0, Math.PI, false, 0);
    const pts2 = archCurve.getPoints(64).map((p) => new THREE.Vector3(p.x, p.y, 0));
    const archPath = new THREE.CatmullRomCurve3(pts2);
    const archMesh = new THREE.Mesh(new THREE.TubeGeometry(archPath, 120, 0.3, 16), mats.marble);
    archMesh.scale.set(1, 1, 1.5);
    archMesh.castShadow = true;
    const outer = new THREE.CatmullRomCurve3(new THREE.EllipseCurve(0, springY, span + 0.42, span * 0.92 + 0.42, 0, Math.PI, false, 0)
        .getPoints(64)
        .map((p) => new THREE.Vector3(p.x, p.y, 0.32)));
    const bead = new THREE.Mesh(new THREE.TubeGeometry(outer, 120, 0.05, 8), mats.gold);
    const inner = new THREE.CatmullRomCurve3(new THREE.EllipseCurve(0, springY, span - 0.36, span * 0.92 - 0.36, 0, Math.PI, false, 0)
        .getPoints(64)
        .map((p) => new THREE.Vector3(p.x, p.y, 0.36)));
    const bead2 = new THREE.Mesh(new THREE.TubeGeometry(inner, 120, 0.035, 8), mats.gold);
    group.add(archMesh, bead, bead2);
    // keystone
    const key = pedestal(0.6, 0.9, mats.marbleWarm);
    key.position.set(0, springY + span * 0.92 - 0.45, 0);
    key.scale.set(1, 1, 1.4);
    group.add(key);
    // monogram medallion hanging under the crown of the arch
    const medR = 0.85;
    const medallion = new THREE.Mesh(new THREE.CircleGeometry(medR, 64), new THREE.MeshStandardMaterial({ map: plaqueTexture(cfg), roughness: 0.6 }));
    const rim = new THREE.Mesh(new THREE.TorusGeometry(medR, 0.05, 12, 96), mats.gold);
    const medY = springY + span * 0.92 - 1.55;
    medallion.position.set(0, medY, 0.06);
    rim.position.set(0, medY, 0.06);
    const back = medallion.clone();
    back.rotation.y = Math.PI;
    back.position.z = -0.06;
    const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.9, 6), mats.gold);
    chain.position.set(0, medY + medR + 0.45, 0);
    const medGroup = new THREE.Group();
    medGroup.add(medallion, back, rim, chain);
    group.add(medGroup);
    // cascading garland: across the arch and spilling down each column
    const garlandPath = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-span - 0.2, pedH + 1.6, 0.42),
        new THREE.Vector3(-span - 0.1, springY - 0.2, 0.45),
        ...new THREE.EllipseCurve(0, springY, span + 0.08, span * 0.92 + 0.08, Math.PI, 0, true, 0)
            .getPoints(24)
            .map((p) => new THREE.Vector3(p.x, p.y, 0.45)),
        new THREE.Vector3(span + 0.1, springY - 0.6, 0.45),
    ]);
    group.add(garland(cfg, garlandPath, {
        roses: q.mobile ? 220 : 420,
        leaves: q.mobile ? 260 : 520,
        jitter: 0.45,
        seed: 31,
        scale: [1.6, 3.0],
    }));
    // balustrade wings
    const baluster = lathe([
        [0, 0],
        [0.12, 0],
        [0.12, 0.08],
        [0.07, 0.14],
        [0.08, 0.26],
        [0.15, 0.42],
        [0.09, 0.62],
        [0.06, 0.7],
        [0.1, 0.76],
        [0.12, 0.82],
        [0, 0.82],
    ], 12);
    const bm = [];
    const railGeos = [];
    for (const s of [-1, 1]) {
        const x0 = span + 2.6;
        const x1 = span + 14;
        for (let x = x0; x < x1; x += 0.36) {
            const wx = s * x;
            const y = heightAt(wx, 0) - baseY;
            bm.push(new THREE.Matrix4().makeTranslation(wx, y + 0.12, 0));
        }
        const len = x1 - x0;
        const rail = new THREE.BoxGeometry(len, 0.12, 0.34);
        rail.translate(s * (x0 + len / 2), 1.0, 0);
        const plinth = new THREE.BoxGeometry(len, 0.14, 0.38);
        plinth.translate(s * (x0 + len / 2), 0.07, 0);
        railGeos.push(rail, plinth);
        for (const px of [x0 - 0.3, x1]) {
            const p = pedestal(0.5, 1.25, mats.marbleWarm);
            p.position.set(s * px, 0, 0);
            group.add(p);
        }
    }
    const balMesh = instanced(baluster, mats.marbleWarm, bm);
    balMesh.castShadow = true;
    const rails = new THREE.Mesh(merge(railGeos.map((g) => bake(g, '#ffffff'))), mats.marbleWarm);
    rails.castShadow = true;
    group.add(balMesh, rails);
    return {
        object: group,
        update: (t) => {
            medGroup.rotation.z = Math.sin(t * 0.9) * 0.015;
        },
    };
}
/* ──────────────────────────── Fountain ─────────────────────────── */
export function buildFountain(cfg, q) {
    const mats = materials(cfg);
    const group = new THREE.Group();
    group.name = 'fountain';
    const p = LAYOUT.fountain;
    group.position.set(p.x, heightAt(p.x, p.z), p.z);
    const basin = new THREE.Mesh(lathe([
        [3.0, 0],
        [3.55, 0],
        [3.6, 0.1],
        [3.48, 0.2],
        [3.5, 0.5],
        [3.62, 0.56],
        [3.58, 0.66],
        [3.3, 0.66],
        [3.28, 0.3],
        [0, 0.3],
    ], 64), mats.marbleWarm);
    basin.castShadow = basin.receiveShadow = true;
    const stem = new THREE.Mesh(lathe([
        [0.7, 0.3],
        [0.5, 0.5],
        [0.32, 0.8],
        [0.28, 1.6],
        [0.4, 1.8],
        [1.5, 1.95],
        [1.62, 2.1],
        [1.5, 2.18],
        [0.3, 2.1],
        [0.22, 2.4],
        [0.18, 2.9],
        [0.3, 3.05],
        [0.78, 3.15],
        [0.82, 3.25],
        [0.2, 3.25],
        [0.14, 3.5],
        [0.2, 3.7],
        [0.06, 3.95],
        [0, 3.98],
    ], 48), mats.marble);
    stem.castShadow = true;
    const finial = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 12), mats.gold);
    finial.position.y = 4.02;
    const waterMat = new THREE.MeshPhysicalMaterial({
        color: '#9fb7b0',
        roughness: 0.35, // a mirror finish catches the low sun and blooms into a white blob
        transparent: true,
        opacity: 0.85,
    });
    const pool = new THREE.Mesh(new THREE.CircleGeometry(3.3, 48), waterMat);
    pool.rotation.x = -Math.PI / 2;
    pool.position.y = 0.52;
    const bowlWater = new THREE.Mesh(new THREE.CircleGeometry(1.48, 32), waterMat);
    bowlWater.rotation.x = -Math.PI / 2;
    bowlWater.position.y = 2.12;
    group.add(basin, stem, finial, pool, bowlWater);
    // water jets: GPU-animated particle arcs from the top and the bowl rim
    const n = q.mobile ? 900 : 2200;
    const seeds = new Float32Array(n * 4);
    const r = mulberry32(9);
    for (let i = 0; i < n; i++) {
        const top = r() < 0.4;
        seeds[i * 4] = r() * Math.PI * 2; // angle
        seeds[i * 4 + 1] = r(); // phase
        seeds[i * 4 + 2] = top ? 1 : 0;
        seeds[i * 4 + 3] = r();
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 4));
    const jetMat = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: { uTime: { value: 0 }, uMap: { value: softDotTexture() } },
        vertexShader: /* glsl */ `
      attribute vec4 aSeed;
      uniform float uTime;
      varying float vA;
      void main() {
        float ang = aSeed.x;
        float top = aSeed.z;
        float life = top > 0.5 ? 1.15 : 0.9;
        float t = mod(uTime * 0.9 + aSeed.y * life, life);
        vec3 origin = top > 0.5 ? vec3(0.0, 3.98, 0.0) : vec3(cos(ang) * 1.55, 2.12, sin(ang) * 1.55);
        vec3 vel = top > 0.5 ? vec3(cos(ang) * 0.9, 2.2 + aSeed.w * 0.6, sin(ang) * 0.9) : vec3(cos(ang) * 1.25, 0.6, sin(ang) * 1.25);
        vec3 p = origin + vel * t + vec3(0.0, -4.9 * t * t, 0.0);
        if (p.y < 0.52) p.y = 0.52;
        vA = smoothstep(0.0, 0.08, t) * (1.0 - t / life) * (top > 0.5 ? 0.8 : 0.55);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = (top > 0.5 ? 6.0 : 4.5) * (0.6 + aSeed.w) / -mv.z * 7.0;
        gl_Position = projectionMatrix * mv;
      }`,
        fragmentShader: /* glsl */ `
      uniform sampler2D uMap;
      varying float vA;
      void main() {
        vec4 t = texture2D(uMap, gl_PointCoord);
        gl_FragColor = vec4(vec3(0.95, 0.95, 0.9), t.a * vA * 0.35);
      }`,
    });
    const jets = new THREE.Points(geo, jetMat);
    jets.frustumCulled = false;
    group.add(jets);
    return {
        object: group,
        update: (t) => {
            jetMat.uniforms.uTime.value = t;
        },
    };
}
/* ──────────────────────────── Pavilion ─────────────────────────── */
export function buildPavilion(cfg, q) {
    const mats = materials(cfg);
    const group = new THREE.Group();
    group.name = 'pavilion';
    const p = LAYOUT.pavilion;
    const baseY = heightAt(p.x, p.z);
    group.position.set(p.x, baseY, p.z);
    const sides = 8;
    const base = new THREE.Mesh(lathe([
        [0, 0],
        [5.4, 0],
        [5.4, 0.18],
        [5.05, 0.18],
        [5.05, 0.36],
        [4.7, 0.36],
        [4.7, 0.54],
        [0, 0.54],
    ], sides, Math.PI / sides), mats.marbleWarm);
    base.receiveShadow = base.castShadow = true;
    group.add(base);
    const colR = 4.1;
    const colH = 3.9;
    const colGeo = lathe(columnProfile(colH, 0.17), 20);
    flute(colGeo, colH * 0.13, colH * 0.85, 16, 0.05);
    const cm = [];
    const tops = [];
    for (let i = 0; i < sides; i++) {
        const a = (i / sides) * Math.PI * 2;
        // leave the front (facing +Z, the avenue) open between two columns
        const x = Math.sin(a + Math.PI / sides) * colR;
        const z = Math.cos(a + Math.PI / sides) * colR;
        cm.push(new THREE.Matrix4().makeTranslation(x, 0.54, z));
        tops.push(new THREE.Vector3(x, 0.54 + colH, z));
    }
    const cols = instanced(colGeo, mats.marble, cm);
    cols.castShadow = true;
    group.add(cols);
    // entablature ring
    const ring = new THREE.Mesh(lathe([
        [colR - 0.35, 0],
        [colR + 0.4, 0],
        [colR + 0.45, 0.1],
        [colR + 0.38, 0.32],
        [colR + 0.55, 0.42],
        [colR + 0.6, 0.55],
        [colR - 0.35, 0.55],
        [colR - 0.35, 0],
    ], 48), mats.marble);
    ring.position.y = 0.54 + colH;
    ring.castShadow = true;
    group.add(ring);
    // ogee dome with gold ribs and lantern finial
    const domeY = 0.54 + colH + 0.55;
    const domeProfile = [];
    for (let i = 0; i <= 24; i++) {
        const t = i / 24;
        const rr = (colR + 0.5) * (Math.cos(t * Math.PI * 0.5) * (1 - 0.18 * Math.sin(t * Math.PI))) + 0.0;
        const yy = Math.pow(t, 0.85) * 3.0 + Math.sin(t * Math.PI) * 0.25;
        domeProfile.push([Math.max(0.001, rr * (1 - t * 0.12)), yy]);
    }
    domeProfile.push([0, 3.0]);
    const dome = new THREE.Mesh(lathe(domeProfile, 48), mats.marble);
    dome.position.y = domeY;
    dome.castShadow = true;
    group.add(dome);
    for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
        const pts = domeProfile.slice(0, -1).map(([rr, yy]) => new THREE.Vector3(Math.sin(a) * (rr + 0.04), domeY + yy, Math.cos(a) * (rr + 0.04)));
        group.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.04, 6), mats.gold));
    }
    const finial = new THREE.Mesh(lathe([
        [0, 0],
        [0.22, 0.05],
        [0.12, 0.3],
        [0.2, 0.5],
        [0.06, 0.8],
        [0.03, 1.2],
        [0, 1.25],
    ], 16), mats.gold);
    finial.position.y = domeY + 2.95;
    group.add(finial);
    // garlands swagged between columns + string lights
    const curves = [];
    for (let i = 0; i < sides; i++) {
        if (i === sides - 1)
            continue; // open front bay stays clear
        const a = tops[i].clone().add(group.position);
        const b = tops[(i + 1) % sides].clone().add(group.position);
        a.y -= 0.15;
        b.y -= 0.15;
        curves.push(catenary(a, b, 0.75));
    }
    const garlands = new THREE.Group();
    curves.forEach((c, i) => garlands.add(garland(cfg, c, { roses: q.mobile ? 16 : 30, leaves: q.mobile ? 22 : 40, jitter: 0.2, seed: 50 + i, scale: [1.3, 2.2] })));
    const lights = fairyLights(curves.map((c) => {
        const pts = c.getPoints(20).map((v) => v.clone().add(new THREE.Vector3(0, -0.12, 0)));
        return new THREE.CatmullRomCurve3(pts);
    }), 18);
    // crystal chandelier under the dome, glowing like the reference
    const chandelier = new THREE.Group();
    const tiers = [
        { r: 0.62, y: 0, drops: 22 },
        { r: 0.42, y: 0.32, drops: 16 },
        { r: 0.22, y: 0.6, drops: 10 },
    ];
    const dropGeo = new THREE.OctahedronGeometry(0.035, 0);
    dropGeo.scale(1, 1.9, 1);
    const dropM = [];
    for (const t of tiers) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(t.r, 0.018, 6, 48), mats.gold);
        ring.rotation.x = Math.PI / 2;
        ring.position.y = t.y;
        chandelier.add(ring);
        for (let k = 0; k < t.drops; k++) {
            const a = (k / t.drops) * Math.PI * 2;
            for (let d = 0; d < 3; d++) {
                dropM.push(new THREE.Matrix4().makeTranslation(Math.cos(a) * t.r, t.y - 0.08 - d * 0.1 - (k % 2) * 0.05, Math.sin(a) * t.r));
            }
        }
    }
    const crystal = new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffe4b0').multiplyScalar(1.9), toneMapped: false });
    chandelier.add(instanced(dropGeo, crystal, dropM));
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 12), mats.glowWarm);
    core.position.y = 0.3;
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.8, 6), mats.gold);
    stem.position.y = 1.5;
    chandelier.add(core, stem);
    chandelier.position.set(0, domeY - 1.15, 0);
    group.add(chandelier);
    // flower crown wrapped around the entablature
    const crownY = 0.54 + colH + 0.32;
    const crown = new THREE.CatmullRomCurve3(Array.from({ length: 49 }, (_, i) => {
        const a = (i / 48) * Math.PI * 2;
        return new THREE.Vector3(Math.sin(a) * (colR + 0.68), crownY + Math.sin(a * 8) * 0.06, Math.cos(a) * (colR + 0.68)).add(group.position);
    }), true);
    garlands.add(garland(cfg, crown, { roses: q.mobile ? 260 : 520, leaves: q.mobile ? 200 : 420, jitter: 0.4, seed: 77, scale: [2.2, 3.6] }));
    // sheer drapes tied back at the open front bay
    const frontL = tops[sides - 1];
    const frontR = tops[0];
    const drapeGeo = new THREE.PlaneGeometry(1.5, colH - 0.1, 18, 24);
    const dp = drapeGeo.attributes.position;
    for (let i = 0; i < dp.count; i++) {
        const x = dp.getX(i);
        const y = dp.getY(i) / (colH - 0.1) + 0.5; // 0 bottom … 1 top
        // full width at the cornice, swept into a tie-back at 40 % height and
        // hanging narrow below it so the couple stays in clear view
        const pinch = y >= 0.4 ? 0.12 + 0.88 * Math.pow((y - 0.4) / 0.6, 1.6) : 0.12 + (0.4 - y) * 0.15;
        dp.setX(i, (x + 0.75) * pinch);
        dp.setZ(i, Math.sin(x * 10 + y * 3) * 0.05 * pinch);
    }
    drapeGeo.translate(0, (colH - 0.1) / 2 + 0.6, 0);
    drapeGeo.computeVertexNormals();
    const drapeMat = applyWind(mats.chiffon.clone(), { amplitude: 0.06, height: colH, frequency: 0.8 });
    drapeMat.color.set('#ffe9f0');
    drapeMat.opacity = 0.78;
    for (const [col, dir] of [
        [frontL, 1],
        [frontR, -1],
    ]) {
        const d = new THREE.Mesh(drapeGeo, drapeMat);
        d.position.set(col.x, 0, col.z + 0.25);
        d.scale.x = dir;
        group.add(d);
        const bow = roseMound(cfg, 0.16, 12, 600 + dir);
        bow.position.set(col.x + dir * 0.12, 0.54 + colH * 0.42, col.z + 0.3);
        group.add(bow);
    }
    const root = new THREE.Group();
    root.add(group, garlands);
    return { main: { object: root }, lights };
}
/* ──────────────────────────── Ceremony ─────────────────────────── */
function crossBackChair() {
    const parts = [];
    const box = (w, h, d, x, y, z, rx = 0, rz = 0) => {
        const g = new THREE.BoxGeometry(w, h, d);
        g.rotateX(rx);
        g.rotateZ(rz);
        g.translate(x, y, z);
        parts.push(bake(g, '#ffffff'));
    };
    const leg = 0.04;
    for (const x of [-0.2, 0.2]) {
        box(leg, 0.46, leg, x, 0.23, 0.2);
        box(leg, 0.96, leg, x, 0.48, -0.2, -0.04);
    }
    box(0.46, 0.05, 0.46, 0, 0.47, 0);
    box(0.44, 0.04, 0.03, 0, 0.94, -0.22);
    box(0.03, 0.5, 0.025, 0, 0.72, -0.21, 0, 0.72);
    box(0.03, 0.5, 0.025, 0, 0.72, -0.21, 0, -0.72);
    box(0.44, 0.03, 0.03, 0, 0.18, 0.2);
    // seat cushion
    const cushion = new THREE.BoxGeometry(0.42, 0.05, 0.42, 3, 1, 3);
    cushion.translate(0, 0.52, 0.01);
    parts.push(bake(cushion, '#fbf3e6'));
    return merge(parts);
}
export function buildCeremony(cfg, q) {
    const mats = materials(cfg);
    const group = new THREE.Group();
    group.name = 'ceremony';
    const r = mulberry32(17);
    const A = LAYOUT.altar;
    const y0 = heightAt(0, -100);
    // aisle runner
    const runner = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 22), mats.linen);
    runner.rotation.x = -Math.PI / 2;
    runner.position.set(0, y0 + 0.07, -98);
    runner.receiveShadow = true;
    group.add(runner);
    // chairs
    const chairGeo = crossBackChair();
    const chairMat = mats.wood.clone();
    chairMat.vertexColors = true;
    const cm = [];
    const aisleChairs = [];
    // chairs are modelled facing +Z; turn them to face the altar (-Z)
    const faceAltar = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI);
    for (let row = 0; row < 9; row++) {
        const z = -93 - row * 1.35;
        for (let k = 0; k < 4; k++) {
            for (const s of [-1, 1]) {
                const x = s * (1.35 + k * 0.62);
                cm.push(new THREE.Matrix4().compose(new THREE.Vector3(x, y0 + 0.05, z), faceAltar, new THREE.Vector3(1, 1, 1)));
                if (k === 0)
                    aisleChairs.push(new THREE.Vector3(x, y0 + 0.05, z));
            }
        }
    }
    const chairs = instanced(chairGeo, chairMat, cm);
    chairs.castShadow = chairs.receiveShadow = true;
    group.add(chairs);
    // aisle posies hung on aisle chairs
    for (const [i, c] of aisleChairs.entries()) {
        if (i % 2 === 1 && q.mobile)
            continue;
        const m = roseMound(cfg, 0.14, 9, 200 + i);
        m.position.set(c.x * 0.84, c.y + 0.86, c.z + 0.22);
        group.add(m);
    }
    // aisle lanterns with candles
    const lanternGeo = lathe([[0.0, 0], [0.13, 0], [0.13, 0.04], [0.11, 0.06], [0.11, 0.42], [0.14, 0.45], [0.08, 0.52], [0.02, 0.58], [0, 0.58]], 6);
    const lm = [];
    const flameM = [];
    for (let row = 0; row < 10; row += 1) {
        const z = -92.4 - row * 1.35;
        for (const s of [-1, 1]) {
            const x = s * 1.0;
            lm.push(new THREE.Matrix4().makeTranslation(x, y0 + 0.07, z));
            flameM.push(new THREE.Matrix4().compose(new THREE.Vector3(x, y0 + 0.28, z), new THREE.Quaternion(), new THREE.Vector3(1, 1.6, 1)));
        }
    }
    const lanterns = instanced(lanternGeo, mats.glass, lm);
    const flames = instanced(new THREE.SphereGeometry(0.035, 8, 6), mats.glowWarm, flameM);
    group.add(lanterns, flames);
    // scattered petals on the runner
    const petalGeo = new THREE.CircleGeometry(0.03, 6);
    petalGeo.scale(1, 0.6, 1);
    petalGeo.rotateX(-Math.PI / 2);
    const pm = [];
    const pc = [];
    const palette = cfg.theme.flowerPalette.map((c) => new THREE.Color(c));
    for (let i = 0; i < (q.mobile ? 300 : 700); i++) {
        const x = range(r, -0.85, 0.85) * (r() < 0.7 ? 1 : 0.6);
        const z = range(r, -88, -109);
        pm.push(new THREE.Matrix4().compose(new THREE.Vector3(x, y0 + 0.08, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, r() * 6.28, 0)), new THREE.Vector3(1, 1, 1).multiplyScalar(range(r, 0.8, 1.6))));
        pc.push(pick(r, palette));
    }
    const petalMat = new THREE.MeshStandardMaterial({ roughness: 0.6, side: THREE.DoubleSide });
    group.add(instanced(petalGeo, petalMat, pm, pc));
    // altar stage
    const stage = new THREE.Group();
    stage.position.set(A.x, y0, A.z);
    const plat = new THREE.Mesh(lathe([
        [0, 0],
        [5.2, 0],
        [5.2, 0.16],
        [4.85, 0.16],
        [4.85, 0.34],
        [4.5, 0.34],
        [4.5, 0.5],
        [0, 0.5],
    ], 64, 0, Math.PI * 2), mats.marbleWarm);
    plat.receiveShadow = plat.castShadow = true;
    plat.scale.set(1, 1, 0.62);
    stage.add(plat);
    // moon-gate floral arch
    const gateR = 2.75;
    const gateY = 0.5 + gateR + 0.05;
    const ringCurve = new THREE.CatmullRomCurve3(new THREE.EllipseCurve(0, gateY, gateR, gateR, 0, Math.PI * 2, false, 0).getPoints(96).map((p) => new THREE.Vector3(p.x, p.y, -0.9)), true);
    stage.add(new THREE.Mesh(new THREE.TubeGeometry(ringCurve, 200, 0.06, 10, true), mats.gold));
    const floralA = new THREE.CatmullRomCurve3(new THREE.EllipseCurve(0, gateY, gateR, gateR, Math.PI * 1.02, Math.PI * 1.72, false, 0).getPoints(30).map((p) => new THREE.Vector3(p.x, p.y, -0.8)));
    const floralB = new THREE.CatmullRomCurve3(new THREE.EllipseCurve(0, gateY, gateR, gateR, Math.PI * 0.12, Math.PI * 0.72, false, 0).getPoints(30).map((p) => new THREE.Vector3(p.x, p.y, -0.8)));
    stage.add(garland(cfg, floralA, { roses: q.mobile ? 160 : 300, leaves: q.mobile ? 160 : 320, jitter: 0.55, seed: 70, scale: [1.8, 3.4] }));
    stage.add(garland(cfg, floralB, { roses: q.mobile ? 130 : 240, leaves: q.mobile ? 140 : 280, jitter: 0.5, seed: 71, scale: [1.8, 3.4] }));
    // ground arrangements at the foot of the arch
    for (const s of [-1, 1]) {
        const m = roseMound(cfg, 0.75, q.mobile ? 60 : 110, 90 + s);
        m.position.set(s * 2.6, 0.55, -0.7);
        stage.add(m);
    }
    // chiffon drapes swept behind the moon gate
    const drapeGeo = new THREE.PlaneGeometry(2.6, 6.2, 24, 30);
    const dp = drapeGeo.attributes.position;
    for (let i = 0; i < dp.count; i++) {
        const x = dp.getX(i);
        const y = dp.getY(i);
        const gather = 1 - (y + 3.1) / 6.2; // tighter folds near the top
        dp.setZ(i, Math.sin(x * 9) * 0.08 * (1 - gather * 0.5) + Math.sin(x * 3.1) * 0.12);
        dp.setX(i, x * (0.55 + 0.45 * (1 - gather)));
    }
    drapeGeo.translate(0, 3.1, 0);
    drapeGeo.computeVertexNormals();
    const drapeMat = applyWind(mats.chiffon.clone(), { amplitude: 0.12, height: 6.2, frequency: 0.7 });
    for (const s of [-1, 1]) {
        const d = new THREE.Mesh(drapeGeo, drapeMat);
        d.position.set(s * 2.2, 0.5, -1.3);
        d.rotation.y = -s * 0.25;
        stage.add(d);
    }
    group.add(stage);
    // classical colonnade arc behind the altar
    const colH = 5.2;
    const colGeo = lathe(columnProfile(colH, 0.24), 20);
    flute(colGeo, colH * 0.13, colH * 0.85, 18, 0.05);
    const ccm = [];
    const arcR = 8.2;
    const tops = [];
    for (let i = 0; i < 9; i++) {
        const a = -1.25 + (i / 8) * 2.5;
        const x = A.x + Math.sin(a) * arcR;
        const z = A.z - 1.5 - Math.cos(a) * arcR * 0.55;
        const yy = heightAt(x, z);
        ccm.push(new THREE.Matrix4().makeTranslation(x, yy, z));
        tops.push(new THREE.Vector3(x, yy + colH, z));
    }
    const colonnade = instanced(colGeo, mats.marble, ccm);
    colonnade.castShadow = true;
    group.add(colonnade);
    const beamCurve = new THREE.CatmullRomCurve3(tops.map((t) => t.clone().add(new THREE.Vector3(0, 0.25, 0))));
    const beam = new THREE.Mesh(new THREE.TubeGeometry(beamCurve, 120, 0.28, 4), mats.marbleWarm);
    beam.scale.set(1, 1, 1);
    beam.castShadow = true;
    group.add(beam);
    const lightCurves = [];
    for (let i = 0; i < tops.length - 1; i++)
        lightCurves.push(catenary(tops[i], tops[i + 1], 0.9));
    // lights strung from colonnade to the moon gate
    const crown = new THREE.Vector3(A.x, y0 + gateY + gateR, A.z - 0.9);
    for (const i of [0, 2, 4, 6, 8])
        lightCurves.push(catenary(tops[i], crown, 1.4));
    const lights = fairyLights(lightCurves, q.mobile ? 18 : 30);
    // welcome easel at the head of the aisle
    const [n1, n2] = coupleNames(cfg);
    const welcome = monogramArt({
        key: 'welcome',
        lines: [
            { text: 'WELCOME TO THE WEDDING OF', font: CAPS_FONT, size: 22, color: '#6b5a4a', gap: 28 },
            { text: n1, font: SCRIPT_FONT, size: 92, color: '#8a6a2c', gap: 0 },
            { text: '&', font: SCRIPT_FONT, size: 60, color: '#b48d4a', gap: 0 },
            { text: n2, font: SCRIPT_FONT, size: 92, color: '#8a6a2c', gap: 30 },
            { text: cfg.weddingDateLabel.toUpperCase(), font: CAPS_FONT, size: 20, color: '#6b5a4a' },
        ],
    });
    const easel = buildEasel(cfg, loadPhoto(cfg.couplePhoto, welcome), 1.1, 1.38);
    easel.position.set(3.2, heightAt(3.2, -88), -88);
    easel.rotation.y = -0.35;
    group.add(easel);
    return { main: { object: group }, lights };
}
export function buildEasel(cfg, tex, w, h) {
    const mats = materials(cfg);
    const g = new THREE.Group();
    const legGeo = new THREE.CylinderGeometry(0.025, 0.03, 2.1, 6);
    for (const [x, z, rx, rz] of [
        [-0.42, 0.12, -0.1, 0.18],
        [0.42, 0.12, -0.1, -0.18],
        [0, -0.4, 0.32, 0],
    ]) {
        const l = new THREE.Mesh(legGeo, mats.gold);
        l.position.set(x, 1.0, z);
        l.rotation.set(rx, 0, rz);
        g.add(l);
    }
    const board = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7 }));
    board.position.set(0, 1.35, 0.2);
    board.rotation.x = -0.1;
    const frameShape = new THREE.Shape();
    frameShape.moveTo(-w / 2 - 0.06, -h / 2 - 0.06);
    frameShape.lineTo(w / 2 + 0.06, -h / 2 - 0.06);
    frameShape.lineTo(w / 2 + 0.06, h / 2 + 0.06);
    frameShape.lineTo(-w / 2 - 0.06, h / 2 + 0.06);
    const hole = new THREE.Path();
    hole.moveTo(-w / 2, -h / 2);
    hole.lineTo(-w / 2, h / 2);
    hole.lineTo(w / 2, h / 2);
    hole.lineTo(w / 2, -h / 2);
    frameShape.holes.push(hole);
    const frame = new THREE.Mesh(new THREE.ExtrudeGeometry(frameShape, { depth: 0.04, bevelEnabled: true, bevelSize: 0.015, bevelThickness: 0.015, bevelSegments: 2 }), mats.gold);
    frame.position.copy(board.position);
    frame.position.z -= 0.02;
    frame.rotation.copy(board.rotation);
    board.castShadow = true;
    g.add(board, frame);
    const ledge = new THREE.Mesh(new THREE.BoxGeometry(w + 0.2, 0.04, 0.12), mats.gold);
    ledge.position.set(0, 1.35 - h / 2 - 0.08, 0.24);
    g.add(ledge);
    return g;
}
/* ───────────────────── Love-story lantern stations ─────────────── */
export function buildStations(cfg, q) {
    const mats = materials(cfg);
    const group = new THREE.Group();
    group.name = 'stations';
    const postGeo = lathe([
        [0, 0],
        [0.22, 0],
        [0.22, 0.1],
        [0.12, 0.2],
        [0.07, 0.4],
        [0.05, 2.4],
        [0.09, 2.5],
        [0.05, 2.6],
        [0, 2.6],
    ], 12);
    const cageGeo = lathe([[0.0, 0], [0.2, 0.02], [0.24, 0.12], [0.2, 0.5], [0.26, 0.56], [0.12, 0.66], [0.03, 0.78], [0, 0.8]], 6);
    const glows = [];
    LAYOUT.stations.forEach((p, i) => {
        const s = new THREE.Group();
        s.position.set(p.x, heightAt(p.x, p.z), p.z);
        const post = new THREE.Mesh(postGeo, mats.iron);
        post.castShadow = true;
        const cage = new THREE.Mesh(cageGeo, mats.glass);
        cage.position.y = 2.6;
        const glow = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 8), mats.glowWarm.clone());
        glow.position.y = 2.88;
        glows.push(glow);
        s.add(post, cage, glow);
        const ch = cfg.story[i];
        if (ch) {
            const art = monogramArt({
                key: `story-${i}`,
                w: 512,
                h: 400,
                lines: [
                    { text: ch.year, font: CAPS_FONT, size: 30, color: '#9a7a3c', gap: 6 },
                    { text: ch.title, font: SCRIPT_FONT, size: 84, color: '#5a4636' },
                ],
            });
            const easel = buildEasel(cfg, loadPhoto(ch.image || cfg.gallery[i] || '', art), 1.05, 0.82);
            // to the right of the lamp post (as framed from the promenade) so the
            // chapter caption on the left never covers it
            easel.position.set(0.2, 0, 1.3);
            easel.rotation.y = -0.95;
            s.add(easel);
        }
        const mound = roseMound(cfg, 0.45, q.mobile ? 26 : 50, 300 + i);
        mound.position.set(-0.6, 0.1, 0.7);
        s.add(mound);
        group.add(s);
    });
    return {
        object: group,
        update: (t) => {
            glows.forEach((g, i) => {
                const k = 0.85 + Math.sin(t * 7.3 + i) * 0.05 + Math.sin(t * 13.1 + i * 2) * 0.04;
                g.scale.setScalar(k);
            });
        },
    };
}
/* ───────────────────── Floating lanterns on the lake ──────────── */
export function buildFloatingLanterns(cfg, q) {
    const mats = materials(cfg);
    const { center, radius, level } = LAYOUT.lake;
    const r = mulberry32(61);
    const n = q.floatingLanterns;
    const geo = merge([
        bake(lathe([[0, 0], [0.16, 0], [0.16, 0.04], [0, 0.04]], 8), '#e9d6b0'),
        bake(lathe([[0.0, 0.04], [0.11, 0.05], [0.13, 0.2], [0.09, 0.32], [0, 0.33]], 8), '#ffd79a'),
    ]);
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, emissive: '#ffae55', emissiveIntensity: 2.2, roughness: 0.7 });
    const items = Array.from({ length: n }, () => {
        const a = r() * Math.PI * 2;
        const d = Math.sqrt(r()) * 0.82;
        return {
            x: center.x + Math.cos(a) * radius.x * d,
            z: center.y + Math.sin(a) * radius.y * d,
            ph: r() * 6.28,
            s: range(r, 0.9, 1.4),
            vx: range(r, -0.08, 0.08),
        };
    });
    const mesh = new THREE.InstancedMesh(geo, mat, n);
    mesh.frustumCulled = false;
    const m = new THREE.Matrix4();
    const qn = new THREE.Quaternion();
    const e = new THREE.Euler();
    const v = new THREE.Vector3();
    const sc = new THREE.Vector3();
    return {
        object: mesh,
        update: (t) => {
            for (let i = 0; i < n; i++) {
                const it = items[i];
                e.set(Math.sin(t * 0.8 + it.ph) * 0.06, it.ph, Math.cos(t * 0.7 + it.ph) * 0.06);
                qn.setFromEuler(e);
                v.set(it.x + Math.sin(t * 0.05 + it.ph) * 1.5, level + 0.02 + Math.sin(t * 1.1 + it.ph) * 0.03, it.z + Math.cos(t * 0.04 + it.ph) * 1.5);
                sc.setScalar(it.s);
                m.compose(v, qn, sc);
                mesh.setMatrixAt(i, m);
            }
            mesh.instanceMatrix.needsUpdate = true;
        },
    };
}
/* ───────────────────────────── Castle ──────────────────────────── */
export function buildCastle(cfg) {
    const mats = materials(cfg);
    const group = new THREE.Group();
    group.name = 'castle';
    const C = LAYOUT.castle;
    group.position.set(C.x, heightAt(C.x, C.z) - 1, C.z);
    group.rotation.y = 0.25;
    const tower = (r, h, roofH) => {
        const t = new THREE.Group();
        const body = new THREE.Mesh(lathe([
            [0, 0],
            [r * 1.08, 0],
            [r, h * 0.1],
            [r, h * 0.92],
            [r * 1.14, h * 0.95],
            [r * 1.14, h],
            [0, h],
        ], 20), mats.stone);
        const roof = new THREE.Mesh(lathe([
            [r * 1.22, 0],
            [r * 1.05, roofH * 0.15],
            [r * 0.55, roofH * 0.6],
            [r * 0.12, roofH * 0.95],
            [0, roofH],
        ], 20), mats.roof);
        roof.position.y = h;
        const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, roofH * 0.25, 4), mats.gold);
        spire.position.y = h + roofH + roofH * 0.1;
        t.add(body, roof, spire);
        // warm windows
        for (let k = 0; k < 3; k++) {
            const win = new THREE.Mesh(new THREE.PlaneGeometry(r * 0.28, r * 0.55), mats.glowWarm);
            const a = (k / 3) * Math.PI * 2 + 0.4;
            win.position.set(Math.sin(a) * (r + 0.02), h * (0.45 + k * 0.14), Math.cos(a) * (r + 0.02));
            win.rotation.y = a;
            t.add(win);
        }
        return t;
    };
    const keep = tower(4.2, 26, 13);
    group.add(keep);
    const corners = [
        [-11, -8, 2.4, 16],
        [11, -8, 2.4, 17],
        [-12, 7, 2.8, 19],
        [12, 7, 2.8, 18],
        [-5, 9, 1.8, 22],
        [6, -10, 1.6, 21],
    ];
    for (const [x, z, r, h] of corners) {
        const t = tower(r, h, r * 3.1);
        t.position.set(x, 0, z);
        group.add(t);
    }
    // curtain walls with crenellations
    const wallPts = [
        [-11, -8],
        [11, -8],
        [12, 7],
        [-12, 7],
        [-11, -8],
    ];
    const crenGeo = [];
    for (let i = 0; i < wallPts.length - 1; i++) {
        const [x0, z0] = wallPts[i];
        const [x1, z1] = wallPts[i + 1];
        const len = Math.hypot(x1 - x0, z1 - z0);
        const ang = Math.atan2(x1 - x0, z1 - z0);
        const wall = new THREE.Mesh(new THREE.BoxGeometry(1.4, 11, len), mats.stone);
        wall.position.set((x0 + x1) / 2, 5.5, (z0 + z1) / 2);
        wall.rotation.y = ang;
        group.add(wall);
        const steps = Math.floor(len / 1.4);
        for (let k = 0; k < steps; k += 2) {
            const b = new THREE.BoxGeometry(1.5, 0.9, 0.7);
            const t = (k + 0.5) / steps;
            b.rotateY(ang);
            b.translate(x0 + (x1 - x0) * t, 11.45, z0 + (z1 - z0) * t);
            crenGeo.push(bake(b, '#ffffff'));
        }
    }
    group.add(new THREE.Mesh(merge(crenGeo), mats.stone));
    group.scale.setScalar(1.15);
    return { object: group };
}
