import { defineTheme } from '../types.js';
import shots from './shots.json.js';
/**
 * MALAY ROYAL WEDDING — "The Golden Palace of Nusantara".
 * A Riau-Malay inspired royal estate: a Rumah Selaso Jatuh Kembar style stilt hall (twin gables),
 * selembayung roof finials, carved lace-like fretwork (ukiran / tebuk), an entrance gate with
 * selembayung, carved-fretwork walls, an emerald-and-gold gapura, a royal pelaminan with songket
 * backdrop, emerald drapes and ceremonial umbrellas, a lotus pond with a wooden bridge, coconut
 * palms, banana, frangipani, jasmine, orchids, a fountain, a balai gazebo and a calm river with a
 * small stilt-house kampung on the far shore, at golden sunset.
 * Ceremony references are arranged as coherent stations, not scattered props: on the west table
 * tepak sirih and sirih junjung; on the east table tepung tawar and hantaran gift trays; a pair of
 * bunga manggar flanks the front steps.
 *
 * The world is procedural (scripts/generators/malay_world.py → compound.glb) and does
 * not depend on any future model.
 *
 * REPLACEABLE ASSET SLOTS (all in this file, separate from wedding.config.ts; the
 * tooling reads these literals, so keep them as plain strings/numbers):
 *   MAIN_MALAY_PALACE_MODEL       → world.extraModels  name 'malay-palace'   (placeholder today)
 *   MALAY_WEDDING_PAVILION_MODEL  → world.extraModels  name 'malay-pavilion' (placeholder today)
 *   BRIDE_AVATAR + GROOM_AVATAR   → characters.coupleModelUrl  (one GLB with both; Meshy Malay couple)
 * Replace by changing `url` (+ position / rotationY / scale). Camera and storyboard are
 * untouched; verify with `npm run check:shots -- malay-royal`.
 * Model contract: .glb, Y-up, metres, ground y = 0, front facing +Z.
 * See docs/malay-royal-assets.md.
 */
export default defineTheme({
    id: 'malay-royal',
    label: 'Malay Royal Wedding',
    description: 'The Golden Palace of Nusantara: Rumah Selaso Jatuh Kembar inspired palace, selembayung, emerald and gold songket pelaminan, lotus pond and golden sunset.',
    palette: {
        ivory: '#F5EBDD',
        champagne: '#D9C5A2',
        gold: '#C7A052',
        blush: '#E4BF67',
        sage: '#285A46',
        ink: '#183D31',
        // jasmine white, bright gold, yellow flowers, champagne, emerald
        flowerPalette: ['#FAF7EF', '#E4BF67', '#f1cf5e', '#D9C5A2', '#C7A052', '#F5EBDD'],
        blossom: ['#2f6a3a', '#6fa052'],
        hydrangea: ['#FAF7EF', '#E4BF67', '#F5EBDD', '#f1cf5e', '#D9C5A2'],
        sky: { zenith: '#4a5e86', mid: '#e8a070', horizon: '#ffc680', sun: '#ffd88a', fog: '#efcaa2' },
        light: { sun: '#ffc888', sky: '#f4e2c8', ground: '#4e4030' },
        ground: { grassA: '#4f8a44', grassB: '#78b04e', lawn: '#63983f', far: '#6f9a5e', bladeBase: '#2f6a2c', bladeTip: '#98c85a' },
    },
    world: {
        kind: 'glb',
        modelUrl: '/assets/themes/malay-royal/compound.glb',
        // replaceable hero slots
        extraModels: [
            // MAIN_MALAY_PALACE_MODEL — placeholder origin = centre of its stilted floor, at ground level
            {
                url: '/assets/themes/malay-royal/house-placeholder.glb',
                name: 'malay-palace',
                label: 'Raising the Malay royal palace',
                position: [0, 0, -10],
                rotationY: 0,
                scale: 1,
            },
            // MALAY_WEDDING_PAVILION_MODEL — north shore of the lotus pond
            {
                url: '/assets/themes/malay-royal/pavilion-placeholder.glb',
                name: 'malay-pavilion',
                label: 'Placing the wedding balai',
                position: [-31, 0, 8],
                rotationY: 0,
                scale: 1,
            },
        ],
        footprint: { minX: -46, maxX: 46, minZ: -24, maxZ: 47 },
        road: { centerX: 0, halfWidth: 3.4, fromZ: 47, toZ: 170, color: '#b09a7e' },
        // warm tropical golden afternoon from the front-left
        sunDirection: [-0.55, 0.36, 0.75],
        sunIntensity: 2.6,
        hemiIntensity: 0.95,
        terrain: { center: [0, 0, 12], flatRadius: 68, hillHeight: 3 },
        landmark: { type: 'volcano', position: [150, -8, -430], scale: 0.7 },
        trees: {
            count: 190,
            seed: 1957,
            canopies: [['#2f6a3a', '#6fa052'], ['#3a7a44', '#86b856'], ['#4a8a4c', '#a8d062']],
            clearAxis: 9,
            radius: 240,
        },
        lampMaterial: 'lamp',
        lampColor: '#ffa650',
        shinyMaterials: ['gold', 'bright_gold', 'water', 'sea'],
        // lantern light on the stage and the gate
        interiorLights: [
            { position: [0, 4.2, 15.5], color: '#ffc27a', intensity: 36, distance: 16 },
            { position: [0, 8, 41], color: '#ffc27a', intensity: 30, distance: 18 },
            { position: [-31, 3, 22], color: '#ffd7a8', intensity: 14, distance: 14 },
        ],
        // jasmine and yellow-flower petals
        petals: ['#FAF7EF', '#E4BF67', '#f1cf5e', '#F5EBDD'],
        props: [{ type: 'welcomeEasel', pose: [6, 0, 53, -0.35], heading: 'SELAMAT DATANG' }],
        labels: { model: 'Raising the Malay royal palace', surroundings: 'Lighting the lanterns' },
    },
    // BRIDE_AVATAR + GROOM_AVATAR: Meshy chibi Malay couple (baju kurung with hijab, baju Melayu with tanjak)
    characters: { coupleModelUrl: '/assets/themes/malay-royal/couple.glb', height: 1.7 },
    shots: shots,
});
