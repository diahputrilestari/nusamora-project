import { defineTheme } from '../types.js';
/** The original look: champagne golden hour, green oaks, ivory roses */
export default defineTheme({
    id: 'golden-hour-estate',
    label: 'Golden Hour Estate',
    description: 'Estate prosedural golden hour: pohon ek hijau, mawar gading, kastil di bukit.',
    palette: {
        ivory: '#f7f1e6',
        champagne: '#e9d6b0',
        gold: '#c9a24e',
        blush: '#e8b8b0',
        sage: '#8a9a78',
        ink: '#2b2420',
        flowerPalette: ['#f6ece4', '#f2c9c0', '#e8a9a3', '#f4dcc3', '#ffffff', '#e9c6d6', '#f0d9a8'],
        blossom: ['#4f6340', '#a5ad6b'],
        hydrangea: ['#f4ecdf', '#ebdcc4', '#ffffff', '#e8d6b8', '#f2e3cf'],
        sky: { zenith: '#7d98bb', mid: '#dcb4ad', horizon: '#f6c99a', sun: '#fff1d2', fog: '#e6c8ab' },
        light: { sun: '#ffd29a', sky: '#ffe7cc', ground: '#6d6a4c' },
        ground: { grassA: '#7f8f5f', grassB: '#a3a56d', lawn: '#8f9f62', far: '#9a9a74', bladeBase: '#556a3c', bladeTip: '#a8b56c' },
    },
    world: { kind: 'garden' },
    characters: { coupleModelUrl: '/assets/themes/golden-hour-estate/couple.glb', height: 1.7 },
});
