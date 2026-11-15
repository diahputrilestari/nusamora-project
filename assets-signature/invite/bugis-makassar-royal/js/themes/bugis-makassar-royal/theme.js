import { defineTheme } from '../types.js';
import shots from './shots.json.js';
/**
 * BUGIS-MAKASSAR ROYAL WEDDING — "The Golden Heritage of Celebes".
 * A South Sulawesi ceremonial estate: Bola Ugi (Bugis) and Balla Lompoa (Makassar) inspired
 * wooden stilt architecture with layered gable screens (timpa laja), an entrance gate, lattice
 * walls, a maroon-and-gold ceremonial arch, a royal wedding platform with Lipa Sabbe plaid silks
 * and black-gold carved panels, a tropical garden (coconut palms, banana, bamboo, frangipani,
 * red and white hibiscus), a lotus pond with a wooden bridge, and a distant sea with a small
 * Phinisi ship at golden sunset.
 * The two ceremonies are kept apart on the stage: Mappacci (Bugis, pacci leaves, candle, cushions)
 * on the west side, Akkorontigi (Makassar, gold tray, ornamental bowls, silk) on the east side.
 *
 * The world is procedural (scripts/generators/bugis_world.py → compound.glb) and does
 * not depend on any future model.
 *
 * REPLACEABLE ASSET SLOTS (all in this file, separate from wedding.config.ts; the
 * tooling reads these literals, so keep them as plain strings/numbers):
 *   MAIN_BUGIS_MAKASSAR_HOUSE_MODEL → world.extraModels  name 'bugis-makassar-house' (placeholder today)
 *   ROYAL_WEDDING_PAVILION_MODEL    → world.extraModels  name 'royal-pavilion'       (placeholder today)
 *   BRIDE_AVATAR + GROOM_AVATAR     → characters.coupleModelUrl  (one GLB with both)
 * Replace by changing `url` (+ position / rotationY / scale). Camera and storyboard are
 * untouched; verify with `npm run check:shots -- bugis-makassar-royal`.
 * Model contract: .glb, Y-up, metres, ground y = 0, front facing +Z.
 * See docs/bugis-makassar-royal-assets.md.
 */
export default defineTheme({
    id: 'bugis-makassar-royal',
    label: 'Bugis-Makassar Royal Wedding',
    description: 'The Golden Heritage of Celebes: Bola Ugi and Balla Lompoa inspired royal estate, Lipa Sabbe silks, tropical garden and a golden Sulawesi sunset.',
    palette: {
        ivory: '#F5EBDD',
        champagne: '#E3C98E',
        gold: '#C69A45',
        blush: '#A95C43',
        sage: '#365A42',
        ink: '#211F1C',
        // maroon, bright gold, ivory, red hibiscus, white frangipani, terracotta
        flowerPalette: ['#F5EBDD', '#E3B958', '#c8323c', '#761C2C', '#FAF6EC', '#A95C43'],
        blossom: ['#2f6a3a', '#6fa052'],
        hydrangea: ['#761C2C', '#C69A45', '#F5EBDD', '#c8323c', '#E3B958'],
        sky: { zenith: '#46588a', mid: '#e8956a', horizon: '#ffc178', sun: '#ffd27a', fog: '#efc19a' },
        light: { sun: '#ffbd78', sky: '#f4dcc4', ground: '#5a4030' },
        ground: { grassA: '#4f8a44', grassB: '#78b04e', lawn: '#63983f', far: '#6f9a5e', bladeBase: '#2f6a2c', bladeTip: '#98c85a' },
    },
    world: {
        kind: 'glb',
        modelUrl: 'assets/themes/bugis-makassar-royal/compound.glb',
        // replaceable hero slots
        extraModels: [
            // MAIN_BUGIS_MAKASSAR_HOUSE_MODEL — placeholder origin = centre of its stilted floor, at ground level
            {
                url: 'assets/themes/bugis-makassar-royal/house-placeholder.glb',
                name: 'bugis-makassar-house',
                label: 'Raising the royal Bugis-Makassar house',
                position: [0, 0, -10],
                rotationY: 0,
                scale: 1,
            },
            // ROYAL_WEDDING_PAVILION_MODEL — north shore of the lotus pond
            {
                url: 'assets/themes/bugis-makassar-royal/pavilion-placeholder.glb',
                name: 'royal-pavilion',
                label: 'Placing the wedding pavilion',
                position: [-31, 0, 8],
                rotationY: 0,
                scale: 1,
            },
        ],
        footprint: { minX: -46, maxX: 46, minZ: -24, maxZ: 47 },
        road: { centerX: 0, halfWidth: 3.4, fromZ: 47, toZ: 170, color: '#b09a7e' },
        // warm tropical golden afternoon from the front-left
        sunDirection: [-0.55, 0.36, 0.75],
        sunIntensity: 2.7,
        hemiIntensity: 0.95,
        terrain: { center: [0, 0, 12], flatRadius: 68, hillHeight: 3 },
        landmark: { type: 'volcano', position: [-150, -8, -430], scale: 0.8 },
        trees: {
            count: 170,
            seed: 1945,
            canopies: [['#2f6a3a', '#6fa052'], ['#3a7a44', '#86b856'], ['#4a8a4c', '#a8d062']],
            clearAxis: 9,
            radius: 240,
        },
        lampMaterial: 'lamp',
        lampColor: '#ff9a4a',
        shinyMaterials: ['gold', 'bright_gold', 'water', 'sea'],
        // lantern light on the stage and the gate
        interiorLights: [
            { position: [0, 4.2, 15.5], color: '#ffb872', intensity: 36, distance: 16 },
            { position: [0, 8, 41], color: '#ffb872', intensity: 30, distance: 18 },
            { position: [-31, 3, 22], color: '#ffc9a0', intensity: 14, distance: 14 },
        ],
        // frangipani and hibiscus petals
        petals: ['#FAF6EC', '#E3B958', '#c8323c', '#F5EBDD'],
        props: [{ type: 'welcomeEasel', pose: [6, 0, 53, -0.35], heading: 'SALAMA TOPPA' }],
        labels: { model: 'Raising the royal Bugis-Makassar house', surroundings: 'Lighting the lanterns' },
    },
    // BRIDE_AVATAR + GROOM_AVATAR: Meshy chibi couple supplied by the client, packed to 1024 px textures
    characters: { coupleModelUrl: 'assets/themes/bugis-makassar-royal/couple.glb', height: 1.7 },
    shots: shots,
});
