import { defineTheme } from '../types.js';
/** Lavender-pink dusk, cherry blossoms, lilac hydrangeas, lantern light */
export default defineTheme({
    id: 'dusk-flower-garden',
    label: 'Taman Bunga Senja',
    description: 'Taman bunga prosedural saat senja: sakura, hortensia ungu, gazebo, lentera.',
    palette: {
        ivory: '#f7f1e6',
        champagne: '#e9d6b0',
        gold: '#c9a24e',
        blush: '#e8b8b0',
        sage: '#8a9a78',
        ink: '#2b2420',
        flowerPalette: ['#ffffff', '#fde6ee', '#f9c3d6', '#f29bbd', '#ffd6e2', '#fbeedd', '#ecc8f0'],
        blossom: ['#e58fb3', '#ffe3ee'],
        hydrangea: ['#b9a3ea', '#cdb9f4', '#e3d4fc', '#a690e0', '#f1c6e4'],
        sky: { zenith: '#8b84cc', mid: '#e3a8cf', horizon: '#ffcda6', sun: '#ffe7cc', fog: '#e9c6d3' },
        light: { sun: '#ffc6a0', sky: '#f4d8f0', ground: '#6f6a5a' },
        ground: { grassA: '#6f8f58', grassB: '#98ad66', lawn: '#86a35e', far: '#8f95a0', bladeBase: '#4f7038', bladeTip: '#a3c06a' },
    },
    world: { kind: 'garden' },
    characters: { coupleModelUrl: 'assets/themes/dusk-flower-garden/couple.glb', height: 1.7 },
});
