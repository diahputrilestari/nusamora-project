import * as THREE from 'three';
import { mulberry32, pick, range } from '../../utils/random.js';
import { softDotTexture } from '../../utils/textures.js';
/**
 * Drifting rose petals. A volume of instanced, cupped petals that follows the
 * camera and wraps around it, so petals are always in shot without simulating
 * the whole estate. Flutter = per-petal spin + sinusoidal side drift.
 */
export function buildPetals(count, palette) {
    const geo = new THREE.CircleGeometry(0.05, 10);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const y = pos.getY(i);
        pos.setX(i, x * 0.8);
        pos.setZ(i, (x * x + y * y) * 6); // cupped
    }
    geo.computeVertexNormals();
    const mat = new THREE.MeshStandardMaterial({
        side: THREE.DoubleSide,
        roughness: 0.5,
        emissive: '#5a2a24',
        emissiveIntensity: 0.25,
        transparent: true,
        opacity: 0.95,
    });
    const mesh = new THREE.InstancedMesh(geo, mat, count);
    mesh.frustumCulled = false;
    mesh.castShadow = false;
    const r = mulberry32(99);
    const cols = palette.slice(0, 4).map((c) => new THREE.Color(c));
    const box = new THREE.Vector3(26, 14, 30);
    const items = Array.from({ length: count }, (_, i) => {
        mesh.setColorAt(i, pick(r, cols));
        return {
            p: new THREE.Vector3(range(r, -1, 1) * box.x, range(r, 0, 1) * box.y, range(r, -1, 1) * box.z),
            rot: new THREE.Euler(r() * 6, r() * 6, r() * 6),
            spin: new THREE.Vector3(range(r, -2, 2), range(r, -2, 2), range(r, -2, 2)),
            fall: range(r, 0.35, 0.8),
            sway: range(r, 0.4, 1.2),
            ph: r() * 6.28,
            s: range(r, 0.7, 1.4),
        };
    });
    if (mesh.instanceColor)
        mesh.instanceColor.needsUpdate = true;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const sc = new THREE.Vector3();
    const world = new THREE.Vector3();
    const origin = new THREE.Vector3();
    let intensity = 1;
    return {
        object: mesh,
        setIntensity: (k) => {
            intensity = k;
        },
        update: (t, dt, camera) => {
            // anchor the volume slightly ahead of the camera
            const fwd = new THREE.Vector3();
            camera.getWorldDirection(fwd);
            origin.copy(camera.position).addScaledVector(fwd, 10);
            origin.y = camera.position.y - 4;
            const visible = Math.min(count, Math.round(count * intensity));
            mesh.count = visible;
            for (let i = 0; i < visible; i++) {
                const it = items[i];
                it.p.y -= it.fall * dt;
                it.p.x += (Math.sin(t * it.sway + it.ph) * 0.5 + 0.35) * dt; // light breeze to +x
                it.p.z += Math.cos(t * it.sway * 0.7 + it.ph) * 0.3 * dt;
                it.rot.x += it.spin.x * dt;
                it.rot.y += it.spin.y * dt;
                it.rot.z += it.spin.z * dt;
                // petals live in world space; wrap any that leave the camera-anchored box
                world.copy(it.p).sub(origin);
                if (world.y < 0)
                    world.y += box.y;
                if (world.y > box.y)
                    world.y -= box.y;
                if (world.x > box.x)
                    world.x -= box.x * 2;
                if (world.x < -box.x)
                    world.x += box.x * 2;
                if (world.z > box.z)
                    world.z -= box.z * 2;
                if (world.z < -box.z)
                    world.z += box.z * 2;
                it.p.copy(world).add(origin);
                world.copy(it.p);
                q.setFromEuler(it.rot);
                sc.setScalar(it.s);
                m.compose(world, q, sc);
                mesh.setMatrixAt(i, m);
            }
            mesh.instanceMatrix.needsUpdate = true;
        },
    };
}
/** Golden motes of light hanging in the air (additive points with twinkle) */
export function buildMotes(count) {
    const r = mulberry32(5);
    const pos = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    const span = new THREE.Vector3(30, 9, 34);
    for (let i = 0; i < count; i++) {
        pos[i * 3] = range(r, -1, 1) * span.x;
        pos[i * 3 + 1] = r() * span.y;
        pos[i * 3 + 2] = range(r, -1, 1) * span.z;
        seeds[i] = r() * 100;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
    const mat = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
            uTime: { value: 0 },
            uMap: { value: softDotTexture() },
            uOrigin: { value: new THREE.Vector3() },
            uSpan: { value: span },
            uPixel: { value: Math.min(window.devicePixelRatio, 2) },
        },
        vertexShader: /* glsl */ `
      attribute float aSeed;
      uniform float uTime, uPixel;
      uniform vec3 uOrigin, uSpan;
      varying float vA;
      void main() {
        vec3 p = position;
        p.x += sin(uTime * 0.21 + aSeed) * 1.2;
        p.y += sin(uTime * 0.33 + aSeed * 1.7) * 0.8 + uTime * 0.08;
        p.z += cos(uTime * 0.17 + aSeed) * 1.2;
        // wrap around the camera-anchored origin
        vec3 rel = p - (uOrigin - vec3(0.0, uSpan.y * 0.3, 0.0));
        rel = mod(rel + uSpan, uSpan * vec3(2.0, 1.0, 2.0)) - vec3(uSpan.x, 0.0, uSpan.z);
        vec3 w = uOrigin - vec3(0.0, uSpan.y * 0.3, 0.0) + rel;
        vec4 mv = modelViewMatrix * vec4(w, 1.0);
        float tw = 0.5 + 0.5 * sin(uTime * (1.5 + fract(aSeed) * 2.0) + aSeed * 3.0);
        vA = tw * smoothstep(0.0, 1.5, rel.y) * smoothstep(uSpan.y, uSpan.y - 2.0, rel.y);
        gl_PointSize = (2.0 + fract(aSeed * 7.3) * 4.0) * uPixel * 18.0 / -mv.z;
        gl_Position = projectionMatrix * mv;
      }`,
        fragmentShader: /* glsl */ `
      uniform sampler2D uMap;
      varying float vA;
      void main() {
        float a = texture2D(uMap, gl_PointCoord).a;
        gl_FragColor = vec4(vec3(1.0, 0.83, 0.55) * 1.8, a * vA * 0.75);
      }`,
    });
    const points = new THREE.Points(geo, mat);
    points.frustumCulled = false;
    const fwd = new THREE.Vector3();
    return {
        object: points,
        update: (t, _dt, camera) => {
            mat.uniforms.uTime.value = t;
            camera.getWorldDirection(fwd);
            mat.uniforms.uOrigin.value.copy(camera.position).addScaledVector(fwd, 12);
        },
    };
}
