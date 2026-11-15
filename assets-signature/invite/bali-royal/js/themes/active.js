import { wedding } from '../data/wedding.config.js';
import { THEMES } from './index.js';
/** The theme chosen by `THEME` in wedding.config.ts */
export const activeTheme = THEMES[wedding.themeId];
