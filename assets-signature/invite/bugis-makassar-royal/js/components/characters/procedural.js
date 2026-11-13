import * as THREE from 'three';
import { bake, lathe, merge, roseGeometry, leafGeometry } from '../environment/builders/geometry.js';
import { applyWind } from '../../utils/wind.js';
import { mulberry32, pick, range } from '../../utils/random.js';
const SKIN = '#f2d4c0';
function skinMat() {
    return new THREE.MeshPhysicalMaterial({ color: SKIN, roughness: 0.5, sheen: 0.6, sheenColor: new THREE.Color('#ffd9c9'), clearcoat: 0.25, clearcoatRoughness: 0.6 });
}
function sculptHead(radius, jaw = 0.22) {
    const g = new THREE.SphereGeometry(radius, 40, 28);
    const pos = g.attributes.position;
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
        v.fromBufferAttribute(pos, i);
        const ny = v.y / radius;
        v.y *= 1.12;
        if (ny < 0) {
            const k = 1 - Math.pow(-ny, 1.4) * jaw;
            v.x *= k;
            v.z *= k;
            if (v.z > 0)
                v.z += -ny * radius * 0.06; // chin forward
        }
        if (v.z < 0 && ny > -0.2)
            v.z *= 1.08; // cranium
        pos.setXYZ(i, v.x, v.y, v.z);
    }
    g.computeVertexNormals();
    return g;
}
function face(radius, lash, lips) {
    const g = new THREE.Group();
    const dark = new THREE.MeshStandardMaterial({ color: lash, roughness: 0.6 });
    for (const s of [-1, 1]) {
        // closed, smiling eyes
        const arc = new THREE.EllipseCurve(0, 0, radius * 0.17, radius * 0.1, Math.PI * 1.08, Math.PI * 1.92, false, 0);
        const pts = arc.getPoints(12).map((p) => new THREE.Vector3(p.x, -p.y, 0));
        const eye = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, radius * 0.022, 5), dark);
        eye.position.set(s * radius * 0.36, radius * 0.12, radius * 0.93);
        eye.rotation.y = s * 0.35;
        g.add(eye);
        // cheek blush
        const blush = new THREE.Mesh(new THREE.CircleGeometry(radius * 0.17, 20), new THREE.MeshBasicMaterial({ color: '#f2a6a0', transparent: true, opacity: 0.32, depthWrite: false }));
        blush.position.set(s * radius * 0.5, -radius * 0.12, radius * 0.86);
        blush.rotation.y = s * 0.5;
        g.add(blush);
    }
    const nose = new THREE.Mesh(new THREE.SphereGeometry(radius * 0.09, 12, 8), skinMat());
    nose.scale.set(0.8, 1, 0.9);
    nose.position.set(0, -radius * 0.04, radius * 1.0);
    const mouth = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(new THREE.EllipseCurve(0, 0, radius * 0.14, radius * 0.06, Math.PI * 1.15, Math.PI * 1.85, false, 0)
        .getPoints(10)
        .map((p) => new THREE.Vector3(p.x, p.y, 0))), 12, radius * 0.03, 6), new THREE.MeshStandardMaterial({ color: lips, roughness: 0.45 }));
    mouth.position.set(0, -radius * 0.3, radius * 0.94);
    g.add(nose, mouth);
    return g;
}
function limb(points, radius, mat) {
    const curve = new THREE.CatmullRomCurve3(points);
    const geo = new THREE.TubeGeometry(curve, 24, radius, 10);
    // taper toward the wrist
    const pos = geo.attributes.position;
    const segs = 25;
    const ring = 11;
    const center = new THREE.Vector3();
    const v = new THREE.Vector3();
    for (let i = 0; i < segs; i++) {
        const t = i / (segs - 1);
        curve.getPoint(t, center);
        const k = 1 - t * 0.35;
        for (let j = 0; j < ring; j++) {
            const idx = i * ring + j;
            v.fromBufferAttribute(pos, idx).sub(center).multiplyScalar(k).add(center);
            pos.setXYZ(idx, v.x, v.y, v.z);
        }
    }
    geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, mat);
    m.castShadow = true;
    return m;
}
/** Hand-tied bouquet: roses, buds and trailing ribbon */
function bouquet(cfg) {
    const r = mulberry32(404);
    const palette = cfg.theme.flowerPalette.map((c) => new THREE.Color(c));
    const parts = [];
    const rose = roseGeometry(9);
    for (let i = 0; i < 17; i++) {
        const n = new THREE.Vector3(range(r, -1, 1), range(r, 0.3, 1.2), range(r, -1, 1)).normalize();
        const g = rose.clone();
        const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), n);
        g.applyQuaternion(q);
        const s = range(r, 0.75, 1.0);
        g.scale(s, s, s);
        const p = n.multiplyScalar(0.075);
        g.translate(p.x, p.y * 0.8, p.z);
        const c = pick(r, palette);
        const cols = g.attributes.color;
        for (let k = 0; k < cols.count; k++)
            cols.setXYZ(k, cols.getX(k) * c.r, cols.getY(k) * c.g, cols.getZ(k) * c.b);
        parts.push(g);
    }
    for (let i = 0; i < 14; i++) {
        const l = bake(leafGeometry(0.09, 0.03), '#6f8458');
        l.rotateZ(range(r, -0.6, 0.3));
        l.rotateY((i / 14) * Math.PI * 2);
        l.translate(0, 0.02, 0);
        parts.push(l);
    }
    const stems = bake(new THREE.CylinderGeometry(0.025, 0.018, 0.16, 8).translate(0, -0.08, 0), '#7b8a5c');
    parts.push(stems);
    const wrap = bake(new THREE.CylinderGeometry(0.03, 0.03, 0.06, 10).translate(0, -0.06, 0), '#f6efe6');
    parts.push(wrap);
    const mesh = new THREE.Mesh(merge(parts), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, side: THREE.DoubleSide }));
    mesh.castShadow = true;
    rose.dispose();
    return mesh;
}
/* ─────────────────────────────── Bride ─────────────────────────────── */
export function buildBride(cfg) {
    const root = new THREE.Group();
    root.name = 'bride';
    const torso = new THREE.Group();
    const skin = skinMat();
    const satin = new THREE.MeshPhysicalMaterial({
        color: '#fbf5ec',
        roughness: 0.42,
        sheen: 1,
        sheenRoughness: 0.35,
        sheenColor: new THREE.Color(cfg.theme.blush),
        clearcoat: 0.15,
    });
    const lace = new THREE.MeshPhysicalMaterial({ color: '#fffaf3', roughness: 0.6, sheen: 0.8, sheenColor: new THREE.Color('#ffffff') });
    // skirt: soft A-line ball gown with ruffled hem and a chapel train
    const skirtProfile = [];
    for (let i = 0; i <= 28; i++) {
        const t = i / 28; // 0 = hem, 1 = waist
        const y = t * 1.0;
        const rr = 0.125 + (1 - t) * (1 - t) * 0.5 + (1 - t) * 0.04;
        skirtProfile.push([rr, y]);
    }
    skirtProfile.unshift([0.0, 0.0]);
    const skirt = lathe(skirtProfile, 72);
    const sp = skirt.attributes.position;
    for (let i = 0; i < sp.count; i++) {
        const x = sp.getX(i);
        const y = sp.getY(i);
        let z = sp.getZ(i);
        const a = Math.atan2(z, x);
        const low = 1 - y;
        const ruffle = 1 + Math.sin(a * 22) * 0.025 * low * low + Math.sin(a * 7 + 1) * 0.02 * low;
        let nx = x * ruffle;
        z *= ruffle;
        if (z < 0)
            z -= low * low * low * 0.55 * Math.pow(Math.max(0, -z / Math.max(0.12, Math.hypot(x, z))), 1.5); // train
        nx *= 1.05;
        sp.setXYZ(i, nx, y, z);
    }
    skirt.computeVertexNormals();
    const skirtMesh = new THREE.Mesh(skirt, satin);
    skirtMesh.castShadow = true;
    skirtMesh.receiveShadow = true;
    root.add(skirtMesh);
    // lace overskirt layer (slightly larger, translucent)
    const over = new THREE.Mesh(skirt.clone().scale(1.025, 0.99, 1.025), new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: 0.7, transparent: true, opacity: 0.28, sheen: 1, sheenColor: new THREE.Color('#fff'), depthWrite: false }));
    root.add(over);
    // bodice
    const bodice = new THREE.Mesh(lathe([
        [0, 0.98],
        [0.125, 0.98],
        [0.118, 1.06],
        [0.13, 1.16],
        [0.15, 1.24],
        [0.142, 1.3],
        [0.0, 1.3],
    ], 32), lace);
    bodice.scale.set(1.18, 1, 0.82);
    bodice.castShadow = true;
    torso.add(bodice);
    const sash = new THREE.Mesh(new THREE.TorusGeometry(0.128, 0.012, 8, 40), new THREE.MeshStandardMaterial({ color: cfg.theme.champagne, metalness: 0.5, roughness: 0.35 }));
    sash.rotation.x = Math.PI / 2;
    sash.scale.set(1.18, 0.82, 1);
    sash.position.y = 1.0;
    torso.add(sash);
    // shoulders, neck
    const shoulders = new THREE.Mesh(lathe([
        [0.0, 1.28],
        [0.142, 1.28],
        [0.165, 1.33],
        [0.15, 1.37],
        [0.07, 1.41],
        [0.045, 1.43],
        [0.043, 1.5],
        [0, 1.5],
    ], 28), skin);
    shoulders.scale.set(1.25, 1, 0.78);
    shoulders.castShadow = true;
    torso.add(shoulders);
    // arms cradling the bouquet
    for (const s of [-1, 1]) {
        torso.add(limb([
            new THREE.Vector3(s * 0.19, 1.34, -0.01),
            new THREE.Vector3(s * 0.22, 1.2, 0.0),
            new THREE.Vector3(s * 0.2, 1.08, 0.08),
            new THREE.Vector3(s * 0.08, 1.02, 0.17),
        ], 0.03, skin));
        const hand = new THREE.Mesh(new THREE.SphereGeometry(0.025, 12, 8), skin);
        hand.scale.set(1, 0.8, 1.3);
        hand.position.set(s * 0.055, 1.02, 0.18);
        torso.add(hand);
    }
    const bq = bouquet(cfg);
    bq.position.set(0, 1.06, 0.2);
    bq.rotation.x = 0.35;
    torso.add(bq);
    // head
    const head = new THREE.Group();
    head.position.set(0, 1.585, 0);
    const R = 0.105;
    const headMesh = new THREE.Mesh(sculptHead(R), skin);
    headMesh.castShadow = true;
    head.add(headMesh, face(R, '#3b2a22', '#d98c8a'));
    const hairMat = new THREE.MeshPhysicalMaterial({ color: '#3a2a22', roughness: 0.45, sheen: 0.5, sheenColor: new THREE.Color('#8a6a52') });
    const cap = new THREE.Mesh(new THREE.SphereGeometry(R * 1.07, 36, 20, 0, Math.PI * 2, 0, 1.25), hairMat);
    cap.scale.set(1, 1.12, 1.04);
    cap.rotation.x = -0.25;
    const back = new THREE.Mesh(new THREE.SphereGeometry(R * 1.06, 32, 20, Math.PI * 0.55, Math.PI * 0.9, 0, 2.1), hairMat);
    back.scale.set(1, 1.12, 1.05);
    const bun = new THREE.Mesh(new THREE.TorusKnotGeometry(R * 0.38, R * 0.17, 64, 10, 2, 3), hairMat);
    bun.position.set(0, R * 0.25, -R * 1.05);
    bun.scale.set(1, 0.8, 0.7);
    const tiara = new THREE.Mesh(new THREE.TorusGeometry(R * 0.95, R * 0.04, 6, 48, Math.PI), new THREE.MeshStandardMaterial({ color: cfg.theme.gold, metalness: 1, roughness: 0.2 }));
    tiara.position.set(0, R * 0.7, -R * 0.1);
    tiara.rotation.x = -0.35;
    head.add(cap, back, bun, tiara);
    // cathedral veil from the bun to the floor
    const veilProfile = [
        [0.05, 0.0],
        [0.12, -0.05],
        [0.18, -0.25],
        [0.24, -0.6],
        [0.38, -1.05],
        [0.58, -1.45],
        [0.8, -1.62],
    ];
    const veilGeo = lathe(veilProfile, 40, Math.PI - 1.7, 3.4);
    const veilMat = applyWind(new THREE.MeshPhysicalMaterial({
        color: '#ffffff',
        roughness: 0.6,
        transparent: true,
        opacity: 0.32,
        side: THREE.DoubleSide,
        depthWrite: false,
        sheen: 1,
        sheenColor: new THREE.Color('#fff4ea'),
    }), { amplitude: -0.05, height: -1.6, frequency: 1.1 });
    const veil = new THREE.Mesh(veilGeo, veilMat);
    veil.position.set(0, R * 0.25, -R * 1.05);
    veil.scale.set(1, 1, 1.15);
    head.add(veil);
    torso.add(head);
    root.add(torso);
    return {
        object: root,
        head,
        torso,
        update: (t) => {
            const b = Math.sin(t * 1.4) * 0.004;
            torso.scale.set(1 + b * 0.5, 1 + b, 1 + b * 0.5);
            head.rotation.z = 0.12 + Math.sin(t * 0.6) * 0.03;
            head.rotation.y = 0.18 + Math.sin(t * 0.43) * 0.05;
            head.rotation.x = 0.06 + Math.sin(t * 0.5) * 0.02;
        },
    };
}
/* ─────────────────────────────── Groom ─────────────────────────────── */
export function buildGroom(cfg) {
    const root = new THREE.Group();
    root.name = 'groom';
    const torso = new THREE.Group();
    const skin = skinMat();
    const wool = new THREE.MeshPhysicalMaterial({ color: '#2d3243', roughness: 0.62, sheen: 0.6, sheenColor: new THREE.Color('#6d7590') });
    const satinLapel = new THREE.MeshStandardMaterial({ color: '#1f2330', roughness: 0.25, metalness: 0.2 });
    const shirt = new THREE.MeshStandardMaterial({ color: '#fbf8f2', roughness: 0.6 });
    // legs & shoes
    for (const s of [-1, 1]) {
        const leg = new THREE.Mesh(lathe([
            [0, 0.06],
            [0.072, 0.06],
            [0.07, 0.3],
            [0.074, 0.55],
            [0.085, 0.8],
            [0.09, 0.93],
            [0, 0.93],
        ], 20), wool);
        leg.position.x = s * 0.085;
        leg.castShadow = true;
        const shoe = new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 10), new THREE.MeshStandardMaterial({ color: '#141416', roughness: 0.2, metalness: 0.3 }));
        shoe.scale.set(0.9, 0.55, 1.9);
        shoe.position.set(s * 0.09, 0.035, 0.04);
        root.add(leg, shoe);
    }
    // jacket body
    const jacket = new THREE.Mesh(lathe([
        [0, 0.78],
        [0.165, 0.78],
        [0.16, 0.9],
        [0.15, 1.04],
        [0.17, 1.18],
        [0.19, 1.3],
        [0.205, 1.4],
        [0.17, 1.45],
        [0.09, 1.48],
        [0, 1.48],
    ], 36), wool);
    jacket.scale.set(1.22, 1, 0.78);
    jacket.castShadow = true;
    torso.add(jacket);
    // shirt front + lapels + bow tie
    const vShape = new THREE.Shape();
    vShape.moveTo(-0.06, 0.24);
    vShape.lineTo(0.06, 0.24);
    vShape.lineTo(0, 0);
    vShape.lineTo(-0.06, 0.24);
    const shirtV = new THREE.Mesh(new THREE.ShapeGeometry(vShape), shirt);
    shirtV.position.set(0, 1.2, 0.163);
    shirtV.rotation.x = -0.18;
    torso.add(shirtV);
    for (const s of [-1, 1]) {
        const lap = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
            new THREE.Vector3(s * 0.065, 1.45, 0.13),
            new THREE.Vector3(s * 0.085, 1.36, 0.165),
            new THREE.Vector3(s * 0.04, 1.24, 0.175),
            new THREE.Vector3(s * 0.005, 1.17, 0.172),
        ]), 20, 0.017, 6), satinLapel);
        lap.scale.set(1, 1, 1);
        torso.add(lap);
        const bow = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.05, 10), satinLapel);
        bow.rotation.z = (s * Math.PI) / 2;
        bow.position.set(s * 0.025, 1.445, 0.16);
        torso.add(bow);
    }
    const knot = new THREE.Mesh(new THREE.SphereGeometry(0.011, 8, 6), satinLapel);
    knot.position.set(0, 1.445, 0.163);
    torso.add(knot);
    // buttons
    for (const y of [1.08, 1.0]) {
        const b = new THREE.Mesh(new THREE.SphereGeometry(0.009, 8, 6), satinLapel);
        b.position.set(0, y, 0.162);
        torso.add(b);
    }
    // boutonnière
    const bout = new THREE.Mesh(roseGeometry(4), new THREE.MeshStandardMaterial({ vertexColors: true, color: cfg.theme.blush, roughness: 0.5 }));
    bout.position.set(-0.11, 1.34, 0.15);
    bout.rotation.x = 1.2;
    bout.scale.setScalar(0.45);
    torso.add(bout);
    // arms: his right arm reaches toward the bride, left relaxed
    torso.add(limb([
        new THREE.Vector3(0.235, 1.4, -0.01),
        new THREE.Vector3(0.27, 1.2, -0.01),
        new THREE.Vector3(0.26, 1.02, 0.03),
        new THREE.Vector3(0.25, 0.86, 0.05),
    ], 0.05, wool), limb([
        new THREE.Vector3(-0.235, 1.4, -0.01),
        new THREE.Vector3(-0.27, 1.2, -0.02),
        new THREE.Vector3(-0.3, 1.04, -0.08),
        new THREE.Vector3(-0.42, 1.0, -0.14),
    ], 0.05, wool));
    const handR = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 8), skin);
    handR.position.set(0.25, 0.83, 0.05);
    handR.scale.set(0.9, 1.2, 0.9);
    torso.add(handR);
    // neck & head
    const neck = new THREE.Mesh(lathe([[0, 1.44], [0.055, 1.44], [0.052, 1.56], [0, 1.56]], 16), skin);
    torso.add(neck);
    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.058, 0.014, 6, 24), shirt);
    collar.rotation.x = Math.PI / 2;
    collar.position.y = 1.47;
    torso.add(collar);
    const head = new THREE.Group();
    head.position.set(0, 1.675, 0);
    const R = 0.112;
    const headMesh = new THREE.Mesh(sculptHead(R, 0.16), skin);
    headMesh.castShadow = true;
    head.add(headMesh, face(R, '#2a1f1a', '#c98a80'));
    // ears
    for (const s of [-1, 1]) {
        const ear = new THREE.Mesh(new THREE.SphereGeometry(R * 0.2, 10, 8), skin);
        ear.scale.set(0.5, 1, 0.8);
        ear.position.set(s * R * 0.98, 0, -R * 0.05);
        head.add(ear);
    }
    const hairMat = new THREE.MeshPhysicalMaterial({ color: '#221a17', roughness: 0.5, sheen: 0.4, sheenColor: new THREE.Color('#5a463c') });
    const hair = new THREE.Mesh(new THREE.SphereGeometry(R * 1.1, 36, 20, 0, Math.PI * 2, 0, 1.3), hairMat);
    hair.scale.set(1, 1.08, 1.06);
    hair.rotation.x = -0.32;
    const quiff = new THREE.Mesh(new THREE.SphereGeometry(R * 0.55, 20, 12), hairMat);
    quiff.scale.set(1.5, 0.55, 1);
    quiff.position.set(R * 0.2, R * 0.9, R * 0.45);
    quiff.rotation.z = -0.2;
    const backHair = new THREE.Mesh(new THREE.SphereGeometry(R * 1.07, 32, 16, Math.PI * 0.6, Math.PI * 0.8, 0, 1.95), hairMat);
    backHair.scale.set(1, 1.08, 1.04);
    head.add(hair, quiff, backHair);
    torso.add(head);
    root.add(torso);
    return {
        object: root,
        head,
        torso,
        update: (t) => {
            const b = Math.sin(t * 1.3 + 1) * 0.004;
            torso.scale.set(1 + b * 0.5, 1 + b, 1 + b * 0.5);
            head.rotation.z = -0.08 + Math.sin(t * 0.55 + 1) * 0.025;
            head.rotation.y = -0.22 + Math.sin(t * 0.37) * 0.05;
            head.rotation.x = 0.08;
        },
    };
}
