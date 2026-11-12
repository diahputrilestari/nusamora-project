const TEX_KEYS = ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap', 'aoMap', 'alphaMap', 'bumpMap'];
/**
 * Upload every texture in the scene to the GPU now. three.js otherwise uploads
 * a texture the first time its mesh is drawn, which freezes the film for a
 * moment whenever the camera first sees the house, the couple or a new prop.
 */
export function warmTextures(renderer, scene) {
    const seen = new Set();
    scene.traverse((o) => {
        const mat = o.material;
        if (!mat)
            return;
        for (const m of Array.isArray(mat) ? mat : [mat]) {
            for (const k of TEX_KEYS) {
                const t = m[k];
                if (t && !seen.has(t)) {
                    seen.add(t);
                    renderer.initTexture(t);
                }
            }
        }
    });
    return seen.size;
}
