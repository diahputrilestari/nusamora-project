import * as THREE from 'three';
import { fbm, smoothstep } from '../../../utils/random.js';
/**
 * World layout. The whole invitation lives in one continuous estate that the
 * camera travels through, so scene-to-scene transitions are real camera moves
 * rather than cuts. Coordinates: +Y up, the story progresses along -Z.
 *
 *   z = 0     Grand floral gate                       (Scene 01)
 *   z = -6…-40  Cypress avenue, parterres, fountain   (Scene 02)
 *   z = -48   Marble pavilion with the couple          (Scene 03)
 *   x ≈ +24…  Lantern promenade beside the lake        (Scene 04)
 *   z = -100  Ceremony lawn: aisle, chairs, altar     (Scene 05/06)
 *   z = -230  Hilltop castle on the horizon
 */
export const LAYOUT = {
    gate: new THREE.Vector3(0, 0, 0),
    fountain: new THREE.Vector3(0, 0, -24),
    pavilion: new THREE.Vector3(0, 0, -50),
    lake: { center: new THREE.Vector2(46, -66), radius: new THREE.Vector2(24, 30), level: -0.35 },
    stations: [
        new THREE.Vector3(18.5, 0, -46),
        new THREE.Vector3(22.5, 0, -60),
        new THREE.Vector3(22, 0, -74),
        new THREE.Vector3(18, 0, -87),
    ],
    aisleStart: -88,
    altar: new THREE.Vector3(0, 0, -112),
    castle: new THREE.Vector3(-22, 0, -235),
    sunDirection: new THREE.Vector3(-0.42, 0.24, -1).normalize(),
};
/** 0 inside the lake ellipse, rising to 1 at the shore */
export function lakeMask(x, z) {
    const { center, radius } = LAYOUT.lake;
    const dx = (x - center.x) / radius.x;
    const dz = (z - center.y) / radius.y;
    const d = Math.sqrt(dx * dx + dz * dz);
    return smoothstep(0.82, 1.05, d);
}
/** How "manicured" a point is: 1 on paths/lawns, 0 in wild terrain */
export function flatMask(x, z) {
    // central avenue + venue
    const avenue = 1 - smoothstep(9, 16, Math.abs(x));
    const inAvenueZ = smoothstep(18, 10, z) * smoothstep(-132, -124, z);
    const promenade = 1 - smoothstep(6, 12, Math.abs(x - 15)); // lake promenade strip
    const inPromZ = smoothstep(-30, -38, z) * smoothstep(-102, -94, z);
    return Math.max(avenue * inAvenueZ, promenade * inPromZ);
}
/** Terrain height function shared by ground mesh and all scatter placement */
export function heightAt(x, z) {
    const rolling = fbm(x * 0.018, z * 0.018, 4) * 3.2 + fbm(x * 0.06, z * 0.06, 2) * 0.6;
    const dist = Math.sqrt(x * x + (z + 60) * (z + 60));
    const rise = smoothstep(70, 180, dist) * 10; // land climbs toward the horizon
    let h = rolling + rise;
    h *= 1 - flatMask(x, z) * 0.92;
    // lake basin
    const lm = lakeMask(x, z);
    h = h * lm + (LAYOUT.lake.level - 1.6) * (1 - lm);
    // castle hill
    const cdx = x - LAYOUT.castle.x;
    const cdz = z - LAYOUT.castle.z;
    const cd = Math.sqrt(cdx * cdx + cdz * cdz);
    h += (1 - smoothstep(10, 70, cd)) * 26;
    return h;
}
/** True if a point is free for vegetation (not on paths, water or structures) */
export function isOpenGround(x, z, margin = 0) {
    if (lakeMask(x, z) < 0.98)
        return false;
    // main path
    if (Math.abs(x) < 2.9 + margin && z < 8 && z > -122)
        return false;
    // fountain plaza
    if (Math.hypot(x - LAYOUT.fountain.x, z - LAYOUT.fountain.z) < 5.6 + margin)
        return false;
    // pavilion plaza
    if (Math.hypot(x - LAYOUT.pavilion.x, z - LAYOUT.pavilion.z) < 7.5 + margin)
        return false;
    // ceremony lawn
    if (Math.abs(x) < 9.5 + margin && z < -84 && z > -122)
        return false;
    // promenade path to lake
    if (Math.abs(x - 15) < 2.2 + margin && z < -40 && z > -92)
        return false;
    if (z < -44 && z > -52 && x > 2 && x < 16)
        return false;
    if (z < -86 && z > -92 && x > 2 && x < 16)
        return false;
    // gate
    if (Math.abs(x) < 6 + margin && Math.abs(z) < 2 + margin)
        return false;
    return true;
}
