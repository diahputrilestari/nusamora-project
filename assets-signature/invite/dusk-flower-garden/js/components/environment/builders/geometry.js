import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { fbm, mulberry32 } from '../../../utils/random.js';
/**
 * Reusable sculpted geometry: blossoms, roses, leaves, foliage blobs and
 * classical lathe profiles. Everything is generated, so the project ships
 * with zero model downloads; any of these can be swapped for a GLB later.
 */
/** Normalise a geometry so it can be merged: non-indexed, position/normal/color only */
export function bake(geo, color) {
    let g = geo.index ? geo.toNonIndexed() : geo;
    if (g !== geo)
        geo.dispose();
    g.deleteAttribute('uv');
    if (!g.attributes.normal)
        g.computeVertexNormals();
    const pos = g.attributes.position;
    const cols = new Float32Array(pos.count * 3);
    const fixed = typeof color === 'function' ? null : new THREE.Color(color);
    for (let i = 0; i < pos.count; i++) {
        const c = fixed ?? color(pos.getY(i), i);
        cols[i * 3] = c.r;
        cols[i * 3 + 1] = c.g;
        cols[i * 3 + 2] = c.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    return g;
}
export function merge(geos) {
    const m = mergeGeometries(geos, false);
    geos.forEach((g) => g.dispose());
    return m;
}
/** Lathe from [radius, height] pairs */
export function lathe(profile, segments = 24, phiStart = 0, phiLength = Math.PI * 2) {
    return new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), segments, phiStart, phiLength);
}
/** Five-petal garden blossom head (~0.13 across), centred at origin */
export function blossomGeometry() {
    const parts = [];
    for (let k = 0; k < 5; k++) {
        const p = new THREE.SphereGeometry(0.045, 7, 5);
        p.scale(1, 0.32, 0.62);
        p.translate(0.048, 0.006, 0);
        p.rotateZ(0.28);
        p.rotateY((k / 5) * Math.PI * 2);
        parts.push(bake(p, '#ffffff'));
    }
    const c = new THREE.SphereGeometry(0.022, 8, 6);
    c.scale(1, 0.6, 1);
    c.translate(0, 0.016, 0);
    parts.push(bake(c, '#f1d27a'));
    return merge(parts);
}
/** Layered rosette rose (~0.12 across) — garlands, arches, bouquet */
export function roseGeometry(seed = 1) {
    const r = mulberry32(seed);
    const parts = [];
    const rings = [
        { s: 1, h: 0.75, rot: 0 },
        { s: 0.74, h: 0.95, rot: 0.6 },
        { s: 0.5, h: 1.08, rot: 1.3 },
        { s: 0.28, h: 1.12, rot: 2.1 },
    ];
    for (const ring of rings) {
        const g = lathe([
            [0.0, 0],
            [0.026, 0.004],
            [0.05, 0.022],
            [0.06, 0.045],
            [0.064, 0.058],
        ].map(([a, b]) => [a * ring.s * 1.05, b * ring.h]), 10);
        const pos = g.attributes.position;
        for (let i = 0; i < pos.count; i++) {
            const x = pos.getX(i);
            const z = pos.getZ(i);
            const a = Math.atan2(z, x) + ring.rot;
            const k = 1 + 0.16 * Math.sin(a * 5 + r());
            pos.setX(i, x * k);
            pos.setZ(i, z * k);
        }
        g.computeVertexNormals();
        parts.push(bake(g, '#ffffff'));
    }
    // sepal shadow underneath
    const s = new THREE.ConeGeometry(0.03, 0.03, 6);
    s.rotateX(Math.PI);
    s.translate(0, -0.012, 0);
    parts.push(bake(s, '#7b8a5c'));
    return merge(parts);
}
/** Almond leaf with a soft fold, pointing +X */
export function leafGeometry(len = 0.12, width = 0.05) {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.quadraticCurveTo(len * 0.45, width, len, 0);
    shape.quadraticCurveTo(len * 0.45, -width, 0, 0);
    const g = new THREE.ShapeGeometry(shape, 6);
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const y = pos.getY(i);
        pos.setZ(i, Math.abs(y) * 0.6 + (x / len) * (x / len) * 0.02);
    }
    g.rotateX(-Math.PI / 2);
    g.computeVertexNormals();
    return g;
}
/** Organic foliage blob: displaced icosphere with height-graded vertex colour */
export function foliageBlob(radius, seed, dark, light, detail = 3) {
    const g = new THREE.IcosahedronGeometry(radius, detail);
    const pos = g.attributes.position;
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
        v.fromBufferAttribute(pos, i);
        const n = v.clone().normalize();
        const d = fbm(n.x * 2.4 + seed, n.y * 2.4 + n.z * 1.7 - seed, 4) * 0.32 + fbm(n.x * 9 + seed, n.z * 9, 2) * 0.08;
        v.addScaledVector(n, d * radius);
        if (v.y < -radius * 0.3)
            v.y = -radius * 0.3 + (v.y + radius * 0.3) * 0.4; // flatter underside
        pos.setXYZ(i, v.x, v.y, v.z);
    }
    g.computeVertexNormals();
    const tmp = new THREE.Color();
    return bake(g, (y) => tmp.copy(dark).lerp(light, THREE.MathUtils.clamp((y / radius) * 0.6 + 0.5, 0, 1)));
}
/** Classical column profile (base, entasis shaft, capital) of given height & radius */
export function columnProfile(height, radius) {
    const r = radius;
    const h = height;
    return [
        [0, 0],
        [r * 1.45, 0],
        [r * 1.45, h * 0.035],
        [r * 1.32, h * 0.045],
        [r * 1.3, h * 0.06],
        [r * 1.18, h * 0.07],
        [r * 1.22, h * 0.085],
        [r * 1.05, h * 0.1],
        [r * 1.0, h * 0.12],
        [r * 1.02, h * 0.4],
        [r * 0.93, h * 0.86],
        [r * 0.95, h * 0.875],
        [r * 1.02, h * 0.885],
        [r * 0.98, h * 0.9],
        [r * 1.08, h * 0.92],
        [r * 1.28, h * 0.955],
        [r * 1.48, h * 0.965],
        [r * 1.48, h],
        [0, h],
    ];
}
/** Fluting: modulate lathe radius between two heights for vertical grooves */
export function flute(geo, y0, y1, grooves = 20, depth = 0.04) {
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
        const y = pos.getY(i);
        if (y < y0 || y > y1)
            continue;
        const x = pos.getX(i);
        const z = pos.getZ(i);
        const a = Math.atan2(z, x);
        const k = 1 - depth * Math.pow(Math.abs(Math.sin(a * grooves * 0.5)), 0.6);
        pos.setX(i, x * k);
        pos.setZ(i, z * k);
    }
    geo.computeVertexNormals();
    return geo;
}
/** Instances a geometry along a curve, with jitter — garlands, hedgerows */
export function scatterAlongCurve(curve, count, jitter, seed, scale) {
    const r = mulberry32(seed);
    const out = [];
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    for (let i = 0; i < count; i++) {
        const t = (i + r() * 0.8) / count;
        const p = curve.getPointAt(Math.min(1, t));
        p.x += (r() - 0.5) * jitter;
        p.y += (r() - 0.5) * jitter;
        p.z += (r() - 0.5) * jitter;
        e.set((r() - 0.5) * 2.4, r() * Math.PI * 2, (r() - 0.5) * 2.4);
        q.setFromEuler(e);
        const s = scale[0] + r() * (scale[1] - scale[0]);
        out.push(new THREE.Matrix4().compose(p, q, new THREE.Vector3(s, s, s)));
    }
    return out;
}
