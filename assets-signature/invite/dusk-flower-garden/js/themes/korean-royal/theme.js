import { defineTheme } from '../types.js';
import shots from './shots.json.js';
/**
 * KOREAN ROYAL WEDDING — "The Palace of Eternal Love".
 * A Joseon-inspired palace: stone-based gate with a two-tier tower, granite courtyard with a
 * raised royal path and rank stones, plaster walls with side gates, hongsalmun wedding arch,
 * royal wedding stage (folding screen, cheongsachorong lanterns, ceremonial table), a
 * rectangular lotus pond with an island and stone bridge, plum / cherry / willow / pine / bamboo.
 *
 * The world is procedural (scripts/generators/korean_world.py → compound.glb) and does
 * not depend on any future model.
 *
 * REPLACEABLE ASSET SLOTS (all in this file, separate from wedding.config.ts; the
 * tooling reads these literals, so keep them as plain strings/numbers):
 *   MAIN_HANOK_PALACE_MODEL  → world.extraModels  name 'hanok-palace'    (placeholder today)
 *   ROYAL_PAVILION_MODEL     → world.extraModels  name 'royal-pavilion'  (placeholder today)
 *   BRIDE_AVATAR + GROOM_AVATAR → characters.coupleModelUrl  (one GLB with both; Meshy hanbok couple)
 * Replace by changing `url` (+ position / rotationY / scale). Camera and storyboard are
 * untouched; verify with `npm run check:shots -- korean-royal`.
 * Model contract: .glb, Y-up, metres, ground y = 0, front facing +Z.
 * See docs/korean-royal-assets.md.
 */
export default defineTheme({
    id: 'korean-royal',
    label: 'Korean Royal Wedding',
    description: 'The Palace of Eternal Love: Joseon palace courtyard, lotus pond, stone bridge, cherry blossom and the royal wedding stage.',
    palette: {
        ivory: '#F5EBD8',
        champagne: '#E4D3AE',
        gold: '#C5A15B',
        blush: '#E9B7B8',
        sage: '#9BAE91',
        ink: '#2a1a1e',
        // plum, cherry blossom, lotus, crimson
        flowerPalette: ['#ffffff', '#f6dfe0', '#E9B7B8', '#d98a96', '#C5A15B', '#8E2637'],
        blossom: ['#2f5d42', '#6f9a52'],
        hydrangea: ['#8E2637', '#C5A15B', '#F5EBD8', '#E9B7B8', '#415B79'],
        sky: { zenith: '#52679a', mid: '#d8a894', horizon: '#ffc88e', sun: '#ffdca2', fog: '#e4c8a8' },
        light: { sun: '#ffc888', sky: '#f2e1cc', ground: '#6a4a3a' },
        ground: { grassA: '#5f8a4c', grassB: '#86ae56', lawn: '#6f9a4a', far: '#78906a', bladeBase: '#3b6a30', bladeTip: '#a2c862' },
    },
    world: {
        kind: 'glb',
        modelUrl: '/assets/themes/korean-royal/compound.glb',
        // replaceable hero slots
        extraModels: [
            // MAIN_HANOK_PALACE_MODEL — placeholder origin = centre of its stone platform
            {
                url: '/assets/themes/korean-royal/palace-placeholder.glb',
                name: 'hanok-palace',
                label: 'Raising the Hanok Palace',
                position: [0, 0, -10],
                rotationY: 0,
                scale: 1,
            },
            // ROYAL_PAVILION_MODEL — north shore of the lotus pond
            {
                url: '/assets/themes/korean-royal/pavilion-placeholder.glb',
                name: 'royal-pavilion',
                label: 'Placing the royal pavilion',
                position: [-31, 0, 8],
                rotationY: 0,
                scale: 1,
            },
        ],
        footprint: { minX: -46, maxX: 46, minZ: -24, maxZ: 47 },
        road: { centerX: 0, halfWidth: 3.4, fromZ: 47, toZ: 170, color: '#b8a98f' },
        // warm golden afternoon from the front-left: grey roofs and red columns catch the light
        sunDirection: [-0.55, 0.4, 0.75],
        sunIntensity: 2.7,
        hemiIntensity: 0.95,
        terrain: { center: [0, 0, 12], flatRadius: 68, hillHeight: 16 },
        landmark: { type: 'none', position: [0, 0, -400] },
        trees: {
            count: 180,
            seed: 1392,
            canopies: [['#2f5d42', '#6f9a52'], ['#3a6a44', '#86ae56'], ['#4a7a4c', '#a2c862']],
            clearAxis: 9,
            radius: 240,
        },
        lampMaterial: 'lamp',
        lampColor: '#ff8a4a',
        shinyMaterials: ['gold', 'water', 'giwa'],
        // lantern light on the stage and the gate
        interiorLights: [
            { position: [0, 4.2, 15.5], color: '#ffb872', intensity: 36, distance: 16 },
            { position: [0, 8, 41], color: '#ffb872', intensity: 30, distance: 18 },
            { position: [-31, 3, 22], color: '#ffc9a0', intensity: 14, distance: 14 },
        ],
        // cherry blossom (pink / white) petals
        petals: ['#ffffff', '#f6dfe0', '#E9B7B8', '#d98a96'],
        props: [{ type: 'welcomeEasel', pose: [6, 0, 53, -0.35], heading: 'WELCOME TO THE PALACE' }],
        labels: { model: 'Raising the Hanok Palace', surroundings: 'Hanging the silk lanterns' },
    },
    // BRIDE_AVATAR + GROOM_AVATAR: Meshy chibi hanbok couple, packed to 1024 px textures
    characters: { coupleModelUrl: '/assets/themes/korean-royal/couple.glb', height: 1.7 },
    shots: shots,
});
