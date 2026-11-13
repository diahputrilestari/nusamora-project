import * as THREE from 'three';
import { LAYOUT, heightAt } from './builders/layout.js';
import { buildClouds, buildLake, buildMountains, buildPaths, buildSky, buildTerrain } from './builders/landscape.js';
import { buildFlowerBeds, buildGrass, buildHedges, buildTrees } from './builders/vegetation.js';
import { buildCastle, buildCeremony, buildFloatingLanterns, buildFountain, buildGate, buildPavilion, buildStations, } from './builders/architecture.js';
import { disposeMaterials, materials } from './builders/materials.js';
import { buildGlbWorld } from './glbWorld.js';
import { activeTheme } from '../../themes/active.js';
import { buildAvenueLights, buildHydrangeas, buildLanternPosts, buildPetalCarpet } from './builders/blossoms.js';
import { buildCouple } from '../characters/couple.js';
import { buildMotes, buildPetals } from '../particles/petals.js';
import { windUniforms } from '../../utils/wind.js';
import { disposeTextureCache } from '../../utils/textures.js';
import { wedding } from '../../data/wedding.config.js';
export const FOG_COLOR = wedding.theme.sky.fog;
export const FOG_DENSITY = 0.0024;
/** Yield to the browser so the loading bar can paint between heavy build steps */
const tick = () => new Promise((r) => requestAnimationFrame(() => r()));
export async function buildWorld(cfg, q, onProgress) {
    // the active theme decides which world the film is shot in
    if (activeTheme.world.kind === 'glb')
        return buildGlbWorld(cfg, q, onProgress);
    const root = new THREE.Group();
    root.name = 'world';
    const updatables = [];
    const add = (u) => {
        root.add(u.object);
        updatables.push(u);
    };
    materials(cfg);
    const steps = [
        ['Painting the sky', () => add(buildSky(cfg))],
        ['Shaping the hills', () => add(buildTerrain(q, cfg))],
        ['Laying the stone paths', () => add(buildPaths())],
        ['Filling the lake', () => add(buildLake(q))],
        ['Raising distant mountains', () => {
                add(buildMountains());
                add(buildClouds(q));
            }],
        ['Planting blossom trees', () => add(buildTrees(q, cfg))],
        ['Trimming the hedges', () => add(buildHedges(q))],
        ['Growing the meadow', () => add(buildGrass(q, cfg))],
        ['Arranging the flower beds', () => add(buildFlowerBeds(q, cfg.theme.flowerPalette))],
        ['Planting hydrangeas', () => add(buildHydrangeas(cfg, q))],
        ['Scattering rose petals', () => add(buildPetalCarpet(cfg, q))],
        ['Building the floral gate', () => add(buildGate(cfg, q))],
        ['Lighting the lanterns', () => {
                add(buildLanternPosts(cfg, q));
                add(buildAvenueLights(q));
            }],
        ['Starting the fountain', () => add(buildFountain(cfg, q))],
        ['Carving the pavilion', () => {
                const p = buildPavilion(cfg, q);
                add(p.main);
                add(p.lights);
            }],
        ['Lighting the lantern walk', () => {
                add(buildStations(cfg, q));
                add(buildFloatingLanterns(cfg, q));
            }],
        ['Setting the ceremony', () => {
                const c = buildCeremony(cfg, q);
                add(c.main);
                add(c.lights);
            }],
        ['Building the castle', () => add(buildCastle(cfg))],
    ];
    for (let i = 0; i < steps.length; i++) {
        onProgress(i / (steps.length + 2), steps[i][0]);
        await tick();
        steps[i][1]();
    }
    onProgress(steps.length / (steps.length + 2), 'Dressing the bride and groom');
    await tick();
    const couple = buildCouple(cfg);
    root.add(couple.object);
    // wait for any GLB characters so they are in place before the curtain lifts
    await Promise.race([couple.ready, new Promise((r) => setTimeout(r, 20000))]);
    couple.object.traverse((o) => {
        if (o.isMesh)
            o.castShadow = q.shadows;
    });
    const petals = buildPetals(q.petals, cfg.theme.flowerPalette);
    add(petals);
    add(buildMotes(q.motes));
    // lighting: low golden-hour sun behind the castle, warm sky fill
    const hemi = new THREE.HemisphereLight(cfg.theme.light.sky, cfg.theme.light.ground, 0.9);
    root.add(hemi);
    const sun = new THREE.DirectionalLight(cfg.theme.light.sun, 3.0);
    sun.castShadow = q.shadows;
    sun.shadow.mapSize.set(q.shadowMapSize, q.shadowMapSize);
    const sc = sun.shadow.camera;
    sc.left = -24;
    sc.right = 24;
    sc.top = 24;
    sc.bottom = -24;
    sc.near = 1;
    sc.far = 160;
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.03;
    sun.shadow.radius = 4;
    root.add(sun, sun.target);
    // rim light from the camera side so faces are never in full shadow
    const fill = new THREE.DirectionalLight('#ffe2c4', 0.7);
    fill.position.set(10, 12, 40);
    root.add(fill);
    const focusShadows = (p) => {
        sun.target.position.copy(p);
        sun.position.copy(p).addScaledVector(LAYOUT.sunDirection, 80);
    };
    focusShadows(new THREE.Vector3(0, 0, 0));
    const placeCouple = (spot) => {
        if (spot === 'pavilion') {
            const p = LAYOUT.pavilion;
            couple.placeAt(new THREE.Vector3(p.x, heightAt(p.x, p.z) + 0.54, p.z), 0);
        }
        else {
            const a = LAYOUT.altar;
            couple.placeAt(new THREE.Vector3(a.x, heightAt(0, -100) + 0.5, a.z + 0.7), 0);
        }
    };
    placeCouple('pavilion');
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
