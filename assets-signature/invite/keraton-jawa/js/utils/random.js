/** Deterministic PRNG + smooth value noise so every build of the garden is identical for a given seed. */
export function mulberry32(seed) {
    let a = seed >>> 0;
    return function rand() {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
export const range = (r, min, max) => min + (max - min) * r();
export const pick = (r, arr) => arr[Math.floor(r() * arr.length) % arr.length];
function hash2(x, y) {
    const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
    return s - Math.floor(s);
}
const fade = (t) => t * t * (3 - 2 * t);
/** 2D value noise in [-1, 1] */
export function noise2(x, y) {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const xf = x - xi;
    const yf = y - yi;
    const a = hash2(xi, yi);
    const b = hash2(xi + 1, yi);
    const c = hash2(xi, yi + 1);
    const d = hash2(xi + 1, yi + 1);
    const u = fade(xf);
    const v = fade(yf);
    return (a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v) * 2 - 1;
}
/** Fractal noise */
export function fbm(x, y, octaves = 4) {
    let sum = 0;
    let amp = 0.5;
    let f = 1;
    for (let i = 0; i < octaves; i++) {
        sum += noise2(x * f, y * f) * amp;
        f *= 2.03;
        amp *= 0.5;
    }
    return sum;
}
export const smoothstep = (e0, e1, x) => {
    const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
    return t * t * (3 - 2 * t);
};
export const lerp = (a, b, t) => a + (b - a) * t;
