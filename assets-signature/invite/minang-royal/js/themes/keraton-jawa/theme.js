import { defineTheme } from '../types.js';
import shots from './shots.json.js';
/** A Javanese keraton at sunset: carved teak halls, jasmine and janur, warm lamplight */
export default defineTheme({
    id: 'keraton-jawa',
    label: 'Keraton Jawa',
    description: 'Gerbang dengan janur kuning → pelataran → pendopo → bangsal → dalem, Merapi di cakrawala saat senja.',
    palette: {
        ivory: '#f7f1e6',
        champagne: '#e9d6b0',
        gold: '#c9a24e',
        blush: '#e8b8b0',
        sage: '#8a9a78',
        ink: '#2b2420',
        // melati (jasmine) white, kenanga yellow, a few red roses
        flowerPalette: ['#ffffff', '#fffaf0', '#f8efd6', '#f2c14e', '#e9b949', '#c8323a', '#fbe3d4'],
        blossom: ['#3d6533', '#8db45a'],
        hydrangea: ['#ffffff', '#fff6dc', '#f4d77a', '#e8c25a', '#f9ecd0'],
        sky: { zenith: '#47558c', mid: '#d4877c', horizon: '#ffb468', sun: '#ffdcaa', fog: '#d9a58a' },
        light: { sun: '#ffb47c', sky: '#ffd9c2', ground: '#5d5440' },
        ground: { grassA: '#55753e', grassB: '#7f9a4c', lawn: '#6d8a45', far: '#7d7f8f', bladeBase: '#466332', bladeTip: '#9cb560' },
    },
    world: {
        kind: 'glb',
        modelUrl: '/assets/themes/keraton-jawa/world.glb',
        footprint: { minX: -36, maxX: 36, minZ: -32, maxZ: 48 },
        road: { centerX: 0, halfWidth: 4, fromZ: 47, toZ: 160, color: '#b59a76' },
        // low western sun raking across the courtyards
        sunDirection: [-0.75, 0.32, -0.45],
        sunIntensity: 3.1,
        hemiIntensity: 0.85,
        terrain: { center: [0, 0, 8], flatRadius: 70, hillHeight: 18 },
        landmark: { type: 'volcano', position: [70, -6, -380], smoke: true },
        trees: {
            count: 380,
            seed: 4242,
            canopies: [['#3d6533', '#8db45a'], ['#355a2c', '#79a24c'], ['#4a6a33', '#a5b866']],
            clearAxis: 9,
            radius: 240,
        },
        lampMaterial: 'lamp',
        shinyMaterials: ['gold'],
        // melati (jasmine) petals
        petals: ['#ffffff', '#fffaf0', '#f8efd6', '#f2c14e'],
        props: [
            { type: 'janur', position: [0, 0, 51], spread: 3.6 },
            { type: 'welcomeEasel', pose: [5.6, 0, 54, 0.35], heading: 'SUGENG RAWUH' },
        ],
        labels: { model: 'Raising the pendopo and dalem', surroundings: 'Weaving the janur kuning' },
    },
    shots: shots,
    characters: { coupleModelUrl: '/assets/themes/keraton-jawa/couple.glb', height: 1.7 },
});
