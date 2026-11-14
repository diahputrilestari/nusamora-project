import { defineTheme } from '../types.js';
import shots from './shots.json.js';
/**
 * SUNDANESE ROYAL WEDDING — "The Enchanted Garden of Priangan".
 * A West Javan highland wedding estate: a teak Gapura gate with a Julang Ngapak roof, bamboo
 * and river-stone estate walls, a floral bamboo arch, an open wedding pendopo with a kisi
 * (carved lattice) backdrop and batik drapes, payung umbrellas, a lotus pond with a wooden
 * bridge and cascade, jasmine, frangipani, roses, hydrangea, orchids, tree ferns, bamboo
 * groves and tea terraces under a soft morning-to-sunset mist.
 * Ceremony references (Mapag Panganten, Sungkeman, Saweran, Huap Lingkung, Nincak Endog) appear
 * only as respectful decor (egg stand, cushions, petal bowls, angklung racks).
 *
 * The world is procedural (scripts/generators/sundanese_world.py → compound.glb) and does
 * not depend on any future model.
 *
 * REPLACEABLE ASSET SLOTS (all in this file, separate from wedding.config.ts; the
 * tooling reads these literals, so keep them as plain strings/numbers):
 *   MAIN_SUNDANESE_HOUSE_MODEL   → world.extraModels  name 'sundanese-house'    (placeholder today)
 *   SUNDANESE_PENDOPO_MODEL      → world.extraModels  name 'sundanese-pendopo'  (placeholder today)
 *   BRIDE_AVATAR + GROOM_AVATAR  → characters.coupleModelUrl  (one GLB with both; Meshy Sundanese couple)
 * Replace by changing `url` (+ position / rotationY / scale). Camera and storyboard are
 * untouched; verify with `npm run check:shots -- sundanese-royal`.
 * Model contract: .glb, Y-up, metres, ground y = 0, front facing +Z.
 * See docs/sundanese-royal-assets.md.
 */
export default defineTheme({
    id: 'sundanese-royal',
    label: 'Sundanese Royal Wedding',
    description: 'The Enchanted Garden of Priangan: Gapura gate, Julang Ngapak house, bamboo and teak pendopo, tea terraces, jasmine and misty highland gardens.',
    palette: {
        ivory: '#F5EFE3',
        champagne: '#E4D6B4',
        gold: '#C5A46D',
        blush: '#E8C5C1',
        sage: '#A7B99A',
        ink: '#1f2f26',
        // jasmine white, blossom pink, champagne, sage, Priangan emerald
        flowerPalette: ['#FAF8F0', '#E8C5C1', '#C5A46D', '#A7B99A', '#d98a95', '#a9b8e6'],
        blossom: ['#3f7a45', '#7fb06a'],
        hydrangea: ['#a9b8e6', '#e6b6cf', '#FAF8F0', '#E8C5C1', '#A7B99A'],
        sky: { zenith: '#6a86a8', mid: '#e6c3a6', horizon: '#ffdcb0', sun: '#ffe6b8', fog: '#d9e0d0' },
        light: { sun: '#ffd9a6', sky: '#e8eedf', ground: '#4a5a3c' },
        ground: { grassA: '#3f7a48', grassB: '#6aa457', lawn: '#559547', far: '#5d8a62', bladeBase: '#2a6a34', bladeTip: '#8cc467' },
    },
    world: {
        kind: 'glb',
        modelUrl: '/assets/themes/sundanese-royal/compound.glb',
        // replaceable hero slots
        extraModels: [
            // MAIN_SUNDANESE_HOUSE_MODEL — placeholder origin = centre of its stilted floor, at ground level
            {
                url: '/assets/themes/sundanese-royal/house-placeholder.glb',
                name: 'sundanese-house',
                label: 'Raising the Julang Ngapak house',
                position: [0, 0, -10],
                rotationY: 0,
                scale: 1,
            },
            // SUNDANESE_PENDOPO_MODEL — north shore of the lotus pond
            {
                url: '/assets/themes/sundanese-royal/pendopo-placeholder.glb',
                name: 'sundanese-pendopo',
                label: 'Placing the garden pendopo',
                position: [-31, 0, 8],
                rotationY: 0,
                scale: 1,
            },
        ],
        footprint: { minX: -46, maxX: 46, minZ: -24, maxZ: 47 },
        road: { centerX: 0, halfWidth: 3.4, fromZ: 47, toZ: 170, color: '#a89a7e' },
        // soft warm highland light from the front-left, gentle mist
        sunDirection: [-0.5, 0.38, 0.78],
        sunIntensity: 2.3,
        hemiIntensity: 1.05,
        terrain: { center: [0, 0, 12], flatRadius: 68, hillHeight: 22 },
        landmark: { type: 'volcano', position: [-130, -8, -430], scale: 0.9 },
        trees: {
            count: 210,
            seed: 1977,
            canopies: [['#2a5a40', '#5f9a5a'], ['#2f6a46', '#78ad62'], ['#3d7a4e', '#9bc474']],
            clearAxis: 9,
            radius: 240,
        },
        lampMaterial: 'lamp',
        lampColor: '#ffb066',
        shinyMaterials: ['gold', 'water'],
        // lantern light on the stage and the gate
        interiorLights: [
            { position: [0, 4.2, 15.5], color: '#ffc27a', intensity: 34, distance: 16 },
            { position: [0, 8, 41], color: '#ffc27a', intensity: 28, distance: 18 },
            { position: [-31, 3, 22], color: '#ffd7a8', intensity: 14, distance: 14 },
        ],
        // jasmine and blossom petals drifting through the mist
        petals: ['#FAF8F0', '#E8C5C1', '#FAF8F0', '#C5A46D'],
        props: [{ type: 'welcomeEasel', pose: [6, 0, 53, -0.35], heading: 'RAMPES SUMPING' }],
        labels: { model: 'Raising the Julang Ngapak house', surroundings: 'Lighting the bamboo lanterns' },
    },
    // BRIDE_AVATAR + GROOM_AVATAR: Meshy chibi Sundanese couple, packed to 1024 px textures
    characters: { coupleModelUrl: '/assets/themes/sundanese-royal/couple.glb', height: 1.7 },
    shots: shots,
});
