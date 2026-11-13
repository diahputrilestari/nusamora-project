import { defineTheme } from '../types.js';
import shots from './shots.json.js';
/**
 * BETAWI HERITAGE — "The Royal Wedding of Batavia".
 * Rumah Kebaya (teak, layered terracotta roof, gigi balang), palang pintu gate,
 * tanjidor, coconut palms; pelaminan on the terrace.
 *
 * Environment: rumah adat Meshy (extraModels) inside a procedural compound
 * (scripts/generators/betawi_world.py --no-house). The all-procedural venue is kept
 * as world.glb. Still to add: `characters: { coupleModelUrl, height }` for the avatar.
 */
export default defineTheme({
    id: 'betawi-heritage',
    label: 'Betawi Heritage',
    description: 'The Royal Wedding of Batavia: Rumah Kebaya, palang pintu, tanjidor, kelapa dan melati.',
    palette: {
        ivory: '#fbf1dc',
        champagne: '#ecd7a0',
        gold: '#d4a237',
        blush: '#e9b9a4',
        sage: '#3f7a52',
        ink: '#2a1a14',
        // melati, mawar merah, kenanga, kamboja
        flowerPalette: ['#ffffff', '#fff4d6', '#f6d36b', '#c4202c', '#a3202b', '#f2c6b6'],
        blossom: ['#2f6b43', '#7fae5b'],
        hydrangea: ['#c8322d', '#e8b53a', '#fff7e3', '#e2735a', '#f4d98a'],
        sky: { zenith: '#3f6fa8', mid: '#c4a392', horizon: '#ffc98a', sun: '#ffe2b0', fog: '#e8c9a0' },
        light: { sun: '#ffc487', sky: '#f3dfc8', ground: '#6a5236' },
        ground: { grassA: '#5c8a45', grassB: '#86b052', lawn: '#6f9a48', far: '#78906a', bladeBase: '#3b6a30', bladeTip: '#a2c862' },
    },
    world: {
        kind: 'glb',
        // compound (palang pintu, pagar, jalan, lampu, kelapa, tanjidor) from betawi_world.py --no-house
        modelUrl: '/assets/themes/betawi-heritage/compound.glb',
        // hero: rumah adat Betawi + pelaminan teras (Meshy remesh 147k tris, packed by scripts/generators/pack_glb.py)
        // model unit ≈ 1.9 × 1.0 × 1.4; scale 7.5; lifted so its garden slab is flush with the ground
        extraModels: [
            {
                url: '/assets/themes/betawi-heritage/rumah-betawi.glb',
                name: 'rumah-betawi',
                label: 'Mendirikan Rumah Kebaya dan pelaminan',
                position: [0, -0.435, 4.9],
                scale: 7.5,
                castShadow: false,
                singleSided: true,
            },
        ],
        footprint: { minX: -28, maxX: 28, minZ: -15, maxZ: 32 },
        road: { centerX: 0, halfWidth: 3.2, fromZ: 32, toZ: 160, color: '#b39a78' },
        // golden hour from the front-left so the gigi balang and terrace catch the light
        sunDirection: [-0.5, 0.38, 0.78],
        sunIntensity: 2.8,
        hemiIntensity: 0.95,
        terrain: { center: [0, 0, 8], flatRadius: 62, hillHeight: 14 },
        landmark: { type: 'none', position: [0, 0, -400] },
        trees: {
            count: 200,
            seed: 1619,
            canopies: [['#2c6a3c', '#76a850'], ['#255a34', '#5f9444'], ['#3a7440', '#92bd5a']],
            clearAxis: 8,
            radius: 230,
        },
        lampMaterial: 'lamp',
        lampColor: '#ffc06a',
        shinyMaterials: ['gold'],
        // warm lamplight on the terrace and pelaminan
        interiorLights: [
            { position: [0, 3.6, 6.4], color: '#ffc27a', intensity: 40, distance: 14 },
            { position: [0, 2.8, 11.0], color: '#ffd09a', intensity: 16, distance: 10 },
        ],
        // melati, kenanga, mawar merah
        petals: ['#ffffff', '#fdf6dd', '#f6d36b', '#c4202c'],
        props: [
            { type: 'welcomeEasel', pose: [5.4, 0, 35, 0.35], heading: 'SELAMAT DATANG' },
        ],
        labels: { model: 'Mendirikan Rumah Kebaya', surroundings: 'Memasang palang pintu dan pelaminan' },
    },
    characters: { coupleModelUrl: '/assets/themes/betawi-heritage/couple.glb', height: 1.7 },
    shots: shots,
});
