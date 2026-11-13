import { defineTheme } from '../types.js';
import shots from './shots.json.js';
/**
 * CHINESE IMPERIAL WEDDING — "The Palace of Eternal Prosperity".
 * A Ming/Qing-inspired imperial courtyard: gate, marble imperial way, red walls with moon
 * gates, wedding arch (paifang), royal wedding stage, lotus-pond garden with a red arched
 * bridge, plum / peach / willow / bamboo / pine.
 *
 * The world is procedural (scripts/generators/chinese_world.py → compound.glb) and does
 * not depend on any future model.
 *
 * REPLACEABLE ASSET SLOTS (all in this file, separate from wedding.config.ts; the
 * tooling reads these literals, so keep them as plain strings/numbers):
 *   MAIN_IMPERIAL_PALACE_MODEL      → world.extraModels  name 'imperial-palace'   (placeholder today)
 *   IMPERIAL_GARDEN_PAVILION_MODEL  → world.extraModels  name 'garden-pavilion'   (placeholder today)
 *   BRIDE_AVATAR + GROOM_AVATAR     → characters.coupleModelUrl  (one GLB with both)
 * Replace by changing `url` (+ position / rotationY / scale). Camera and storyboard are
 * untouched; verify with `npm run check:shots -- chinese-imperial`.
 * Model contract: .glb, Y-up, metres, ground y = 0, front facing +Z.
 * See docs/chinese-imperial-assets.md.
 */
export default defineTheme({
    id: 'chinese-imperial',
    label: 'Chinese Imperial Wedding',
    description: 'The Palace of Eternal Prosperity: imperial courtyard, lotus pond, red bridge, plum blossom and the royal wedding stage.',
    palette: {
        ivory: '#F5E9D4',
        champagne: '#DCC9A1',
        gold: '#C8A45D',
        blush: '#E9B6A6',
        sage: '#426B59',
        ink: '#2a1516',
        // plum, peach, lotus and imperial red
        flowerPalette: ['#ffffff', '#f4d8dd', '#ee9fb0', '#E9B6A6', '#C8A45D', '#9E1B32'],
        blossom: ['#2c5a3a', '#6f9a52'],
        hydrangea: ['#9E1B32', '#C8A45D', '#F5E9D4', '#E9B6A6', '#DCC9A1'],
        sky: { zenith: '#56699a', mid: '#d9a58e', horizon: '#ffc58a', sun: '#ffdca0', fog: '#e6c6a2' },
        light: { sun: '#ffc682', sky: '#f4dfc9', ground: '#6a4a3a' },
        ground: { grassA: '#5f8a4c', grassB: '#86ae56', lawn: '#6f9a4a', far: '#78906a', bladeBase: '#3b6a30', bladeTip: '#a2c862' },
    },
    world: {
        kind: 'glb',
        modelUrl: '/assets/themes/chinese-imperial/compound.glb',
        // replaceable hero slots (see ./assets.ts)
        extraModels: [
            // MAIN_IMPERIAL_PALACE_MODEL — placeholder origin = centre of its marble platform
            {
                url: '/assets/themes/chinese-imperial/palace-placeholder.glb',
                name: 'imperial-palace',
                label: 'Raising the Imperial Palace',
                position: [0, 0, -10],
                rotationY: 0,
                scale: 1,
            },
            // IMPERIAL_GARDEN_PAVILION_MODEL — north shore of the lotus pond
            {
                url: '/assets/themes/chinese-imperial/pavilion-placeholder.glb',
                name: 'garden-pavilion',
                label: 'Placing the garden pavilion',
                position: [-31, 0, 8],
                rotationY: 0,
                scale: 1,
            },
        ],
        footprint: { minX: -46, maxX: 46, minZ: -24, maxZ: 47 },
        road: { centerX: 0, halfWidth: 3.4, fromZ: 47, toZ: 170, color: '#b8a58a' },
        // warm golden afternoon from the front-left: roofs and red columns catch the light
        sunDirection: [-0.55, 0.4, 0.75],
        sunIntensity: 2.7,
        hemiIntensity: 0.95,
        terrain: { center: [0, 0, 12], flatRadius: 68, hillHeight: 16 },
        landmark: { type: 'none', position: [0, 0, -400] },
        trees: {
            count: 180,
            seed: 1368,
            canopies: [['#2c5a3a', '#6f9a52'], ['#3a6a44', '#86ae56'], ['#4a7a4c', '#a2c862']],
            clearAxis: 9,
            radius: 240,
        },
        lampMaterial: 'lamp',
        lampColor: '#ff8a4a',
        shinyMaterials: ['gold', 'water', 'glaze'],
        // lantern light on the stage and the gate
        interiorLights: [
            { position: [0, 4.2, 15.5], color: '#ffb872', intensity: 36, distance: 16 },
            { position: [0, 8, 41], color: '#ffb872', intensity: 30, distance: 18 },
            { position: [-31, 3, 22], color: '#ffc9a0', intensity: 14, distance: 14 },
        ],
        // plum (white / blush) and peach (pink) petals
        petals: ['#ffffff', '#f4d8dd', '#ee9fb0', '#E9B6A6'],
        props: [{ type: 'welcomeEasel', pose: [6, 0, 53, -0.35], heading: 'WELCOME TO THE PALACE' }],
        labels: { model: 'Raising the Imperial Palace', surroundings: 'Hanging the red lanterns' },
    },
    // BRIDE_AVATAR + GROOM_AVATAR: Meshy chibi Chinese couple (Hanfu), packed to 1024 px textures
    characters: { coupleModelUrl: '/assets/themes/chinese-imperial/couple.glb', height: 1.7 },
    shots: shots,
});
