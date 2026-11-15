/**
 * Device profiling. Decides counts and render features up-front; the runtime
 * performance monitor can then step quality down further (never up past this).
 */
export function detectQuality() {
    const w = typeof window !== 'undefined' ? window.innerWidth : 1280;
    const h = typeof window !== 'undefined' ? window.innerHeight : 800;
    const coarse = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;
    const mobile = coarse || Math.min(w, h) < 680;
    const cores = (typeof navigator !== 'undefined' && navigator.hardwareConcurrency) || 4;
    const mem = (typeof navigator !== 'undefined' && navigator.deviceMemory) || 4;
    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio : 1;
    let tier = 'high';
    if (mobile)
        tier = cores >= 6 && mem >= 4 ? 'medium' : 'low';
    else if (cores <= 4 || mem <= 4)
        tier = 'medium';
    const presets = {
        high: {
            // post-processing runs per pixel: 1.5× is visually sharp and ~45% cheaper than 2×
            maxDpr: Math.min(dpr, 1.5),
            shadows: true,
            shadowMapSize: 2048,
            bloom: true,
            dof: true,
            grass: 26000,
            flowers: 5200,
            trees: 1,
            petals: 420,
            motes: 650,
            floatingLanterns: 60,
        },
        medium: {
            maxDpr: Math.min(dpr, 1.35),
            shadows: true,
            shadowMapSize: 1024,
            bloom: true,
            dof: !mobile,
            grass: 13000,
            flowers: 3000,
            trees: 0.8,
            petals: 240,
            motes: 360,
            floatingLanterns: 40,
        },
        low: {
            maxDpr: Math.min(dpr, 1),
            shadows: false,
            shadowMapSize: 512,
            bloom: true,
            dof: false,
            grass: 6500,
            flowers: 1600,
            trees: 0.6,
            petals: 130,
            motes: 200,
            floatingLanterns: 24,
        },
    };
    return { tier, mobile, portrait: h > w, ...presets[tier] };
}
export function hasWebGL() {
    try {
        const c = document.createElement('canvas');
        return !!(c.getContext('webgl2') || c.getContext('webgl'));
    }
    catch {
        return false;
    }
}
