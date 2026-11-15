import { defineTheme } from '../types.js';
import shots from './shots.json.js';
/**
 * BALI ROYAL WEDDING — "The Enchanted Island of Love".
 * A Puri-style Balinese royal estate: Candi Bentar split gate in red brick and carved volcanic
 * stone, brick estate walls, Kori Agung ceremonial gateway, a wedding bale with carved backdrop
 * and tedung umbrellas, fountains, a lotus pond with a stone bridge, frangipani, coconut palms,
 * heliconia and orchids. No sacred shrines are modelled: this is a wedding venue.
 *
 * The world is procedural (scripts/generators/bali_world.py → compound.glb) and does
 * not depend on any future model.
 *
 * REPLACEABLE ASSET SLOTS (all in this file, separate from wedding.config.ts; the
 * tooling reads these literals, so keep them as plain strings/numbers):
 *   MAIN_BALINESE_PALACE_MODEL    → world.extraModels  name 'balinese-palace'  (placeholder today)
 *   BALE_WEDDING_PAVILION_MODEL   → world.extraModels  name 'bale-pavilion'    (placeholder today)
 *   BRIDE_AVATAR + GROOM_AVATAR   → characters.coupleModelUrl  (one GLB with both; Meshy Balinese couple)
 * Replace by changing `url` (+ position / rotationY / scale). Camera and storyboard are
 * untouched; verify with `npm run check:shots -- bali-royal`.
 * Model contract: .glb, Y-up, metres, ground y = 0, front facing +Z.
 * See docs/bali-royal-assets.md.
 */
export default defineTheme({
    id: 'bali-royal',
    label: 'Bali Royal Wedding',
    description: 'The Enchanted Island of Love: Candi Bentar gate, Balinese royal estate, lotus pond, frangipani and the royal wedding bale.',
    palette: {
        ivory: '#F5EAD7',
        champagne: '#E6D3AA',
        gold: '#C7A052',
        blush: '#EFB79C',
        sage: '#315B42',
        ink: '#2a1a16',
        // frangipani white / yellow / pink, heliconia
        flowerPalette: ['#F5F0E4', '#f3c75c', '#EFB79C', '#ee9fa8', '#C7A052', '#d8482e'],
        blossom: ['#2f6a3a', '#6fa052'],
        hydrangea: ['#76232B', '#C7A052', '#F5EAD7', '#EFB79C', '#d8482e'],
        sky: { zenith: '#5a6a9a', mid: '#e6a48c', horizon: '#ffbb82', sun: '#ffd89a', fog: '#efc8a4' },
        light: { sun: '#ffbf80', sky: '#f4dfc9', ground: '#5e4636' },
        ground: { grassA: '#4f8a44', grassB: '#78b04e', lawn: '#63983f', far: '#6f9a5e', bladeBase: '#2f6a2c', bladeTip: '#98c85a' },
    },
    world: {
        kind: 'glb',
        modelUrl: '/assets/themes/bali-royal/compound.glb',
        // replaceable hero slots
        extraModels: [
            // MAIN_BALINESE_PALACE_MODEL — placeholder origin = centre of its stone plinth
            {
                url: '/assets/themes/bali-royal/palace-placeholder.glb',
                name: 'balinese-palace',
                label: 'Raising the Puri palace',
                position: [0, 0, -10],
                rotationY: 0,
                scale: 1,
            },
            // BALE_WEDDING_PAVILION_MODEL — north shore of the lotus pond
            {
                url: '/assets/themes/bali-royal/pavilion-placeholder.glb',
                name: 'bale-pavilion',
                label: 'Placing the wedding bale',
                position: [-31, 0, 8],
                rotationY: 0,
                scale: 1,
            },
        ],
        footprint: { minX: -46, maxX: 46, minZ: -24, maxZ: 47 },
        road: { centerX: 0, halfWidth: 3.4, fromZ: 47, toZ: 170, color: '#b09a7e' },
        // warm tropical golden afternoon from the front-left
        sunDirection: [-0.55, 0.4, 0.75],
        sunIntensity: 2.7,
        hemiIntensity: 0.95,
        terrain: { center: [0, 0, 12], flatRadius: 68, hillHeight: 16 },
        landmark: { type: 'none', position: [0, 0, -400] },
        trees: {
            count: 190,
            seed: 1945,
            canopies: [['#2f6a3a', '#6fa052'], ['#3a7a44', '#86b856'], ['#4a8a4c', '#a8d062']],
            clearAxis: 9,
            radius: 240,
        },
        lampMaterial: 'lamp',
        lampColor: '#ff9a4a',
        shinyMaterials: ['gold', 'water'],
        // lantern light on the stage and the gate
        interiorLights: [
            { position: [0, 4.2, 15.5], color: '#ffb872', intensity: 36, distance: 16 },
            { position: [0, 8, 41], color: '#ffb872', intensity: 30, distance: 18 },
            { position: [-31, 3, 22], color: '#ffc9a0', intensity: 14, distance: 14 },
        ],
        // frangipani petals: white, yellow, blush
        petals: ['#F5F0E4', '#f3c75c', '#EFB79C', '#ee9fa8'],
        props: [{ type: 'welcomeEasel', pose: [6, 0, 53, -0.35], heading: 'OM SWASTYASTU' }],
        labels: { model: 'Raising the Puri palace', surroundings: 'Lighting the garden lamps' },
    },
    // BRIDE_AVATAR + GROOM_AVATAR: Meshy chibi Balinese couple (Payas Agung), packed to 1024 px textures
    characters: { coupleModelUrl: '/assets/themes/bali-royal/couple.glb', height: 1.7 },
    shots: shots,
});
