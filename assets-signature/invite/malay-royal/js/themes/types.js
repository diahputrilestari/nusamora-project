/**
 * THEME CONTRACT — a theme is pure data. Adding a new look never needs new
 * engine code: copy `src/themes/_template/`, fill these fields, register it in
 * `src/themes/index.ts` and set `THEME` in wedding.config.ts.
 *
 * Two kinds of world exist:
 *  - `garden`  the built-in procedural estate (gate, fountain, pavilion, lake,
 *              altar) re-coloured by the palette. Uses the built-in shot list.
 *  - `glb`     any environment model you supply (palace, villa, beach resort,
 *              ballroom…). The engine wraps it with sky, ground, distant hills,
 *              trees, props, petals and lighting described below, and the film
 *              follows the theme's own `shots.json`.
 */
export const defineTheme = (t) => t;
