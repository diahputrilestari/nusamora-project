import betawiHeritage from './betawi-heritage/theme.js';
import chineseImperial from './chinese-imperial/theme.js';
import koreanRoyal from './korean-royal/theme.js';
import duskFlowerGarden from './dusk-flower-garden/theme.js';
import goldenHourEstate from './golden-hour-estate/theme.js';
import keratonJawa from './keraton-jawa/theme.js';
import minangRoyal from './minang-royal/theme.js';
/**
 * THEME REGISTRY — every saved theme. To add one:
 *   1. copy src/themes/_template → src/themes/<your-id>
 *   2. fill theme.ts (palette + world) and shots.json (camera film)
 *   3. import it below and add it to THEMES
 *   4. set `THEME` in src/data/wedding.config.ts
 */
export const THEMES = {
    'betawi-heritage': betawiHeritage,
    'chinese-imperial': chineseImperial,
    'korean-royal': koreanRoyal,
    'dusk-flower-garden': duskFlowerGarden,
    'golden-hour-estate': goldenHourEstate,
    'keraton-jawa': keratonJawa,
    'minang-royal': minangRoyal,
};
