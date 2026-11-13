import * as THREE from 'three';
import { Water } from 'three/examples/jsm/objects/Water.js';
import { LAYOUT, heightAt, lakeMask, flatMask } from './layout.js';
import { fbm, mulberry32, range } from '../../../utils/random.js';
import { cloudTexture, groundTexture, stoneTexture, waterNormalTexture } from '../../../utils/textures.js';
import { wedding } from '../../../data/wedding.config.js';
/* ───────────────────────────── Sky ───────────────────────────── */
export function buildSky(cfg = wedding) {
    const sky = cfg.theme.sky;
    const geo = new THREE.SphereGeometry(900, 48, 24);
    const mat = new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: {
            uSun: { value: LAYOUT.sunDirection.clone() },
            uZenith: { value: new THREE.Color(sky.zenith) },
            uMid: { value: new THREE.Color(sky.mid) },
            uHorizon: { value: new THREE.Color(sky.horizon) },
            uGround: { value: new THREE.Color(sky.fog) },
            uSunColor: { value: new THREE.Color(sky.sun) },
            uTime: { value: 0 },
        },
        vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        gl_Position = p.xyww;
      }`,
        fragmentShader: /* glsl */ `
      uniform vec3 uSun, uZenith, uMid, uHorizon, uGround, uSunColor;
      uniform float uTime;
      varying vec3 vDir;
      void main() {
        vec3 d = normalize(vDir);
        float h = d.y;
        float sunAmt = max(dot(d, normalize(uSun)), 0.0);
        vec3 col = mix(uHorizon, uMid, smoothstep(0.0, 0.18, h));
        col = mix(col, uZenith, smoothstep(0.16, 0.75, h));
        col = mix(col, uGround, smoothstep(0.0, -0.12, h));
        // warm the sky around the sun, cool it opposite
        col += vec3(0.35, 0.18, 0.04) * pow(sunAmt, 6.0) * (1.0 - smoothstep(0.1, 0.6, h));
        col = mix(col, col * vec3(0.92, 0.94, 1.04), (1.0 - sunAmt) * 0.25);
        // sun disc + halo
        col += uSunColor * pow(sunAmt, 900.0) * 2.5;
        col += uSunColor * pow(sunAmt, 64.0) * 0.3;
        col += vec3(1.0, 0.75, 0.45) * pow(sunAmt, 12.0) * 0.25;
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.frustumCulled = false;
    mesh.renderOrder = -10;
    mesh.name = 'sky';
    return {
        object: mesh,
        update: (_t, _dt, camera) => {
            mesh.position.copy(camera.position);
        },
    };
}
/* ─────────────────────────── Terrain ─────────────────────────── */
export function buildTerrain(q, cfg = wedding) {
    const gc = cfg.theme.ground;
    const seg = q.tier === 'high' ? 260 : q.tier === 'medium' ? 200 : 150;
    const size = 760;
    const geo = new THREE.PlaneGeometry(size, size, seg, seg);
    geo.rotateX(-Math.PI / 2);
    geo.translate(0, 0, -80);
    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const grassA = new THREE.Color(gc.grassA);
    const grassB = new THREE.Color(gc.grassB);
    const lawn = new THREE.Color(gc.lawn);
    const sand = new THREE.Color('#cdb894');
    const far = new THREE.Color(gc.far);
    const c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const z = pos.getZ(i);
        const h = heightAt(x, z);
        pos.setY(i, h);
        const n = fbm(x * 0.05, z * 0.05, 3) * 0.5 + 0.5;
        c.copy(grassA).lerp(grassB, n);
        c.lerp(lawn, flatMask(x, z) * 0.7);
        const lm = lakeMask(x, z);
        c.lerp(sand, (1 - lm) * 0.85);
        const d = Math.hypot(x, z + 60);
        c.lerp(far, THREE.MathUtils.smoothstep(d, 90, 260) * 0.6);
        colors[i * 3] = c.r;
        colors[i * 3 + 1] = c.g;
        colors[i * 3 + 2] = c.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    const map = groundTexture().clone();
    map.repeat.set(90, 90);
    map.needsUpdate = true;
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, map, roughness: 0.96, metalness: 0 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.receiveShadow = true;
    mesh.name = 'terrain';
    return { object: mesh };
}
/* ──────────────────────────── Paths ──────────────────────────── */
function conformingStrip(x0, z0, x1, z1, width, repeatPerUnit) {
    const len = Math.hypot(x1 - x0, z1 - z0);
    const segL = Math.max(2, Math.ceil(len / 1.5));
    const geo = new THREE.PlaneGeometry(width, len, 4, segL);
    geo.rotateX(-Math.PI / 2);
    const ang = Math.atan2(x1 - x0, z1 - z0);
    geo.rotateY(ang);
    geo.translate((x0 + x1) / 2, 0, (z0 + z1) / 2);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++)
        pos.setY(i, heightAt(pos.getX(i), pos.getZ(i)) + 0.04);
    const uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++)
        uv.setXY(i, uv.getX(i) * width * repeatPerUnit, uv.getY(i) * len * repeatPerUnit);
    geo.computeVertexNormals();
    return geo;
}
function conformingDisc(cx, cz, r, repeatPerUnit) {
    const geo = new THREE.CircleGeometry(r, 64, 0, Math.PI * 2);
    geo.rotateX(-Math.PI / 2);
    geo.translate(cx, 0, cz);
    const pos = geo.attributes.position;
    const uv = geo.attributes.uv;
    for (let i = 0; i < pos.count; i++) {
        pos.setY(i, heightAt(pos.getX(i), pos.getZ(i)) + 0.05);
        uv.setXY(i, pos.getX(i) * repeatPerUnit, pos.getZ(i) * repeatPerUnit);
    }
    geo.computeVertexNormals();
    return geo;
}
export function buildPaths() {
    const tex = stoneTexture();
    const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.88, color: '#efe4d2' });
    const group = new THREE.Group();
    group.name = 'paths';
    const add = (g) => {
        const m = new THREE.Mesh(g, mat);
        m.receiveShadow = true;
        group.add(m);
    };
    add(conformingStrip(0, 16, 0, -86, 5.2, 0.32));
    add(conformingDisc(LAYOUT.fountain.x, LAYOUT.fountain.z, 5.4, 0.32));
    add(conformingDisc(LAYOUT.pavilion.x, LAYOUT.pavilion.z, 7.2, 0.32));
    // side paths to the lake promenade and the promenade itself
    add(conformingStrip(2, -48, 15, -48, 3, 0.32));
    add(conformingStrip(15, -42, 15, -90, 3.2, 0.32));
    add(conformingStrip(15, -90, 2, -90, 3, 0.32));
    // ceremony lawn terrace (light stone)
    const terrace = conformingStrip(0, -86, 0, -118, 16, 0.25);
    const tm = new THREE.Mesh(terrace, new THREE.MeshStandardMaterial({ map: tex, color: '#f6efe3', roughness: 0.9 }));
    tm.receiveShadow = true;
    group.add(tm);
    return { object: group };
}
/* ──────────────────────────── Water ──────────────────────────── */
export function buildLake(q) {
    const { center, radius, level } = LAYOUT.lake;
    const geo = new THREE.CircleGeometry(1, 96);
    geo.rotateX(-Math.PI / 2);
    geo.scale(radius.x * 1.08, 1, radius.y * 1.08);
    const normals = waterNormalTexture();
    if (!q.mobile && q.tier !== 'low') {
        // Water expects an XY plane whose local +Z is the surface normal
        const wgeo = new THREE.CircleGeometry(1, 96);
        wgeo.scale(radius.x * 1.08, radius.y * 1.08, 1);
        const water = new Water(wgeo, {
            textureWidth: q.tier === 'high' ? 1024 : 512,
            textureHeight: q.tier === 'high' ? 1024 : 512,
            waterNormals: normals,
            sunDirection: LAYOUT.sunDirection.clone(),
            sunColor: 0xffe2b0,
            waterColor: 0x4f6f6a,
            distortionScale: 1.4,
            fog: true,
            alpha: 0.96,
        });
        water.rotation.x = -Math.PI / 2;
        water.position.set(center.x, level, center.y);
        water.name = 'lake';
        geo.dispose();
        const u = water.material.uniforms;
        u.size.value = 2.4;
        return {
            object: water,
            update: (_t, dt) => {
                u.time.value += dt * 0.35;
            },
        };
    }
    const tex = normals.clone();
    tex.repeat.set(10, 10);
    tex.needsUpdate = true;
    const mat = new THREE.MeshPhysicalMaterial({
        color: '#6f8f8a',
        roughness: 0.06,
        metalness: 0.1,
        normalMap: tex,
        normalScale: new THREE.Vector2(0.35, 0.35),
        envMapIntensity: 1.4,
        clearcoat: 1,
        transparent: true,
        opacity: 0.94,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(center.x, level, center.y);
    mesh.name = 'lake';
    return {
        object: mesh,
        update: (t) => {
            tex.offset.set(t * 0.006, t * 0.004);
        },
    };
}
/* ─────────────────────── Distant scenery ─────────────────────── */
export function buildMountains() {
    const group = new THREE.Group();
    group.name = 'mountains';
    const layers = [
        { r: 430, h: 70, col: '#a99abf', seed: 3 },
        { r: 560, h: 120, col: '#c2b0d0', seed: 9 },
    ];
    for (const L of layers) {
        const seg = 220;
        const geo = new THREE.BufferGeometry();
        const verts = [];
        const idx = [];
        for (let i = 0; i <= seg; i++) {
            const a = (i / seg) * Math.PI * 2;
            const x = Math.sin(a) * L.r;
            const z = Math.cos(a) * L.r - 80;
            const ridge = (fbm(i * 0.06 + L.seed, L.seed, 5) * 0.5 + 0.55) * L.h;
            verts.push(x, -10, z, x, ridge, z);
            if (i < seg) {
                const k = i * 2;
                idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3);
            }
        }
        geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
        geo.setIndex(idx);
        geo.computeVertexNormals();
        const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: L.col, side: THREE.DoubleSide, fog: true }));
        group.add(mesh);
    }
    return { object: group };
}
export function buildClouds(q) {
    const group = new THREE.Group();
    group.name = 'clouds';
    const tex = cloudTexture();
    const r = mulberry32(42);
    const n = q.mobile ? 14 : 24;
    const items = [];
    for (let i = 0; i < n; i++) {
        const mat = new THREE.SpriteMaterial({
            map: tex,
            color: new THREE.Color().setHSL(r() < 0.6 ? 0.92 + r() * 0.04 : 0.06 + r() * 0.03, 0.7, 0.84 + r() * 0.08),
            transparent: true,
            opacity: range(r, 0.45, 0.8),
            depthWrite: false,
            fog: false,
        });
        const s = new THREE.Sprite(mat);
        const a = range(r, -1.4, 1.4);
        const d = range(r, 380, 640);
        s.position.set(Math.sin(a) * d, range(r, 55, 150), -Math.cos(a) * d - 80);
        const w = range(r, 120, 260);
        s.scale.set(w, w * 0.42, 1);
        group.add(s);
        items.push({ s, speed: range(r, 0.6, 1.6) });
    }
    return {
        object: group,
        update: (_t, dt) => {
            for (const it of items) {
                it.s.position.x += it.speed * dt;
                if (it.s.position.x > 700)
                    it.s.position.x = -700;
            }
        },
    };
}
