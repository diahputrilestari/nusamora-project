import * as THREE from 'three';
import { LAYOUT } from '../components/environment/builders/layout.js';
import { activeTheme } from '../themes/active.js';
/**
 * STORYBOARD — the cinematic shot list.
 *
 * Each scene is a list of steps; each step is one camera move (a Catmull-Rom
 * dolly through `path` while the aim glides through `look`) followed by an
 * idle hold with gentle orbit/parallax. Retiming, reframing or reordering the
 * film happens here, never in scene code.
 *
 * Mobile framing: by default every point is pulled back from its look target
 * by `mobilePullback` and the lens widened to `mobileFov`. Give a step an
 * explicit `mobile` block when a shot needs a different composition.
 */
const v = (x, y, z) => new THREE.Vector3(x, y, z);
const S = LAYOUT.stations;
const stationEye = (i) => v(S[i].x - 4.6, 1.85, S[i].z + 3.6);
const stationAim = (i) => v(S[i].x + 1.2, 1.55, S[i].z - 0.9);
const COUPLE_PAV = v(0, 1.6, -50);
const ALTAR_COUPLE = v(0, 1.75, LAYOUT.altar.z + 0.7);
/** Shot list for the procedural flower-garden estate */
export const GARDEN_STORYBOARD = [
    {
        id: 'opening',
        label: 'Welcome',
        steps: [
            {
                path: [v(0, 2.2, 30), v(0.5, 2.6, 21)],
                look: [v(0, 5.2, 0), v(0, 5.0, 0)],
                duration: 16,
                ease: 'sine.out',
                fov: 36,
                mobileFov: 54,
                mobile: { path: [v(0, 2.4, 34), v(0.3, 2.8, 27)], look: [v(0, 6.2, 0), v(0, 6.0, 0)] },
                idleOrbit: 0.05,
                couple: 'pavilion',
                exposure: 0.828,
                petals: 0.8,
                ambience: { birds: 0.6, water: 0 },
            },
        ],
    },
    {
        id: 'intro',
        label: 'The Garden',
        steps: [
            {
                path: [v(0.5, 2.6, 21), v(0, 3.4, 8), v(0, 2.7, -3), v(2.8, 2.3, -13)],
                look: [v(0, 5.0, 0), v(0, 4.4, -6), v(0, 2.6, -20), v(0, 2.4, -24)],
                duration: 11,
                fov: 40,
                mobileFov: 58,
                idleOrbit: 0.06,
                exposure: 0.9,
                petals: 1,
                ambience: { birds: 0.8, water: 0.5 },
            },
            {
                path: [v(2.8, 2.3, -13), v(4.8, 3.4, -22), v(3.4, 5.6, -31)],
                look: [v(0, 2.4, -24), v(-2, 5, -70), v(-10, 30, -220)],
                duration: 11,
                fov: 40,
                mobileFov: 60,
                mobilePullback: 1,
                idleOrbit: 0.04,
                exposure: 0.918,
                petals: 0.9,
                ambience: { birds: 0.7, water: 0.3 },
            },
        ],
    },
    {
        id: 'couple',
        label: 'Bride & Groom',
        steps: [
            {
                path: [v(3.4, 5.6, -31), v(2.4, 3.0, -40), v(1.6, 2.0, -44.5), v(0.8, 1.72, -46.2)],
                look: [v(-10, 30, -220), v(0, 2.6, -50), v(0, 1.7, -50), COUPLE_PAV],
                duration: 10,
                fov: 34,
                mobileFov: 48,
                mobile: {
                    path: [v(3.4, 5.6, -31), v(2.4, 3.0, -39), v(1.4, 2.0, -43), v(0.9, 1.75, -45.2)],
                    look: [v(-10, 30, -220), v(0, 2.6, -50), v(0, 1.7, -50), v(0, 1.45, -50)],
                },
                idleOrbit: 0.32,
                couple: 'pavilion',
                exposure: 0.9,
                petals: 0.6,
                ambience: { birds: 0.6, water: 0.2 },
            },
        ],
    },
    {
        id: 'story',
        label: 'Our Story',
        steps: [
            {
                path: [v(0.8, 1.72, -46.2), v(3.6, 3.2, -43), v(10.5, 3.0, -41), stationEye(0)],
                look: [COUPLE_PAV, v(8, 2.2, -50), v(16, 2, -48), stationAim(0)],
                duration: 9,
                fov: 38,
                mobileFov: 56,
                idleOrbit: 0.08,
                couple: 'pavilion',
                exposure: 0.918,
                petals: 0.5,
                chapter: 0,
                ambience: { birds: 0.4, water: 1 },
            },
            ...[1, 2, 3].map((i) => ({
                path: [stationEye(i - 1), v((S[i - 1].x + S[i].x) / 2 - 6.2, 2.5, (S[i - 1].z + S[i].z) / 2 + 3.8), stationEye(i)],
                look: [stationAim(i - 1), v((S[i - 1].x + S[i].x) / 2 + 6, 1.8, (S[i - 1].z + S[i].z) / 2 - 2), stationAim(i)],
                duration: 6.5,
                fov: 38,
                mobileFov: 56,
                idleOrbit: 0.08,
                couple: 'altar',
                exposure: 0.94 + i * 0.015,
                petals: 0.5,
                chapter: i,
                ambience: { birds: 0.3, water: 1 },
            })),
        ],
    },
    {
        id: 'ceremony',
        label: 'The Ceremony',
        steps: [
            {
                path: [stationEye(3), v(12, 3.4, -84), v(4.5, 2.8, -82.5), v(0, 2.3, -84.5), v(0, 2.05, -90.5)],
                look: [stationAim(3), v(6, 2.2, -95), v(0, 2.6, -104), v(0, 2.8, -112), v(0, 2.7, -112)],
                duration: 12,
                fov: 40,
                mobileFov: 62,
                mobilePullback: 1.1,
                idleOrbit: 0.05,
                couple: 'altar',
                exposure: 0.972,
                petals: 0.9,
                ambience: { birds: 0.5, water: 0.1 },
            },
        ],
    },
    {
        id: 'closing',
        label: 'Celebrate',
        steps: [
            {
                path: [v(0, 2.05, -90.5), v(0.4, 1.95, -101), v(1.4, 1.8, -107.6)],
                look: [v(0, 2.7, -112), v(0, 2.0, -111.5), ALTAR_COUPLE],
                duration: 10,
                fov: 34,
                mobileFov: 50,
                mobile: { path: [v(0, 2.05, -90.5), v(0.4, 1.95, -100), v(1.3, 1.85, -106.6)], look: [v(0, 2.7, -112), v(0, 2.0, -111.5), v(0, 1.55, LAYOUT.altar.z + 0.7)] },
                idleOrbit: 0.22,
                couple: 'altar',
                exposure: 1.008,
                petals: 1.2,
                ambience: { birds: 0.4, water: 0 },
            },
            {
                path: [v(1.4, 1.8, -107.6), v(3.2, 4.0, -102), v(1.5, 8.0, -93), v(0, 10.5, -85)],
                look: [ALTAR_COUPLE, v(0, 2.4, -113), v(-3, 6, -150), v(-8, 15, -220)],
                duration: 15,
                ease: 'power1.inOut',
                fov: 42,
                mobileFov: 62,
                mobilePullback: 1,
                idleOrbit: 0.03,
                couple: 'altar',
                exposure: 1.044,
                petals: 1.4,
                ambience: { birds: 0.5, water: 0 },
            },
        ],
    },
];
const toV = (a) => a.map(([x, y, z]) => v(x, y, z));
export function storyboardFromShots(shots) {
    return shots.scenes.map((sc) => ({
        id: sc.id,
        label: sc.label,
        steps: sc.steps.map((st) => ({
            ...st,
            path: toV(st.path),
            look: toV(st.look),
            mobile: st.mobile && {
                fov: st.mobile.fov,
                path: st.mobile.path && toV(st.mobile.path),
                look: st.mobile.look && toV(st.mobile.look),
            },
        })),
    }));
}
const glbShots = activeTheme.world.kind === 'glb' ? activeTheme.shots : undefined;
if (activeTheme.world.kind === 'glb' && !glbShots)
    throw new Error(`Theme ${activeTheme.id}: glb worlds need a shots.json`);
/** Couple spots and story easels for the active GLB world (empty for the garden) */
export const WORLD_SPOTS = glbShots?.spots ?? {};
export const WORLD_STATIONS = glbShots?.stations ?? [];
/** The film for the active theme's world */
export const STORYBOARD = glbShots ? storyboardFromShots(glbShots) : GARDEN_STORYBOARD;
export function stepCount(scene) {
    return STORYBOARD[scene]?.steps.length ?? 0;
}
export function nextOf(scene, step) {
    if (step + 1 < stepCount(scene))
        return [scene, step + 1];
    if (scene + 1 < STORYBOARD.length)
        return [scene + 1, 0];
    return null;
}
export function prevOf(scene, step) {
    if (step > 0)
        return [scene, step - 1];
    if (scene > 1)
        return [scene - 1, stepCount(scene - 1) - 1];
    return null;
}
