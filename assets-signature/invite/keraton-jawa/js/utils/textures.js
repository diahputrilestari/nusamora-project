import * as THREE from 'three';
import { mulberry32, fbm } from './random.js';
/**
 * Procedural textures painted on <canvas>. They keep the experience fully
 * self-contained (no texture downloads) and are cached so each is built once.
 */
const cache = new Map();
function canvas(w, h = w) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    return [c, c.getContext('2d')];
}
function finish(key, c, srgb = true, repeat = false) {
    const t = new THREE.CanvasTexture(c);
    if (srgb)
        t.colorSpace = THREE.SRGBColorSpace;
    if (repeat)
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 4;
    t.needsUpdate = true;
    cache.set(key, t);
    return t;
}
/** Soft round sprite used by glow motes and fairy lights */
export function softDotTexture() {
    const key = 'softdot';
    if (cache.has(key))
        return cache.get(key);
    const [c, g] = canvas(64);
    const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grd.addColorStop(0, 'rgba(255,255,255,1)');
    grd.addColorStop(0.25, 'rgba(255,244,220,0.85)');
    grd.addColorStop(0.6, 'rgba(255,224,170,0.18)');
    grd.addColorStop(1, 'rgba(255,220,160,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, 64, 64);
    return finish(key, c);
}
/** Billowy cloud puff for distant cloud sprites */
export function cloudTexture() {
    const key = 'cloud';
    if (cache.has(key))
        return cache.get(key);
    const [c, g] = canvas(256, 128);
    const r = mulberry32(7);
    for (let i = 0; i < 26; i++) {
        const x = 40 + r() * 176;
        const y = 50 + r() * 40 - Math.abs(x - 128) * 0.12;
        const rad = 18 + r() * 34;
        const grd = g.createRadialGradient(x, y, 0, x, y, rad);
        grd.addColorStop(0, 'rgba(255,255,255,0.55)');
        grd.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = grd;
        g.beginPath();
        g.arc(x, y, rad, 0, Math.PI * 2);
        g.fill();
    }
    return finish(key, c);
}
/** Veined Carrara-style marble, warm tinted */
export function marbleTexture() {
    const key = 'marble';
    if (cache.has(key))
        return cache.get(key);
    const S = 256;
    const [c, g] = canvas(S);
    const img = g.createImageData(S, S);
    for (let y = 0; y < S; y++) {
        for (let x = 0; x < S; x++) {
            const n = fbm(x / 48, y / 48, 5);
            const vein = Math.abs(Math.sin((x + y * 0.6) / 22 + n * 6));
            const v = Math.pow(vein, 0.35);
            const i = (y * S + x) * 4;
            img.data[i] = 236 + v * 14;
            img.data[i + 1] = 228 + v * 16;
            img.data[i + 2] = 216 + v * 20;
            img.data[i + 3] = 255;
        }
    }
    g.putImageData(img, 0, 0);
    const t = finish(key, c, true, true);
    return t;
}
/** Mottled grass/soil colour used as a detail map on terrain */
export function groundTexture() {
    const key = 'ground';
    if (cache.has(key))
        return cache.get(key);
    const S = 256;
    const [c, g] = canvas(S);
    const img = g.createImageData(S, S);
    for (let y = 0; y < S; y++) {
        for (let x = 0; x < S; x++) {
            const n = fbm(x / 20, y / 20, 4) * 0.5 + 0.5;
            const n2 = fbm(x / 4 + 9, y / 4, 2) * 0.5 + 0.5;
            const v = 0.8 + n * 0.25 + n2 * 0.1;
            const i = (y * S + x) * 4;
            img.data[i] = 255 * Math.min(1, v * 0.98);
            img.data[i + 1] = 255 * Math.min(1, v);
            img.data[i + 2] = 255 * Math.min(1, v * 0.92);
            img.data[i + 3] = 255;
        }
    }
    g.putImageData(img, 0, 0);
    return finish(key, c, true, true);
}
/** Flagstone path */
export function stoneTexture() {
    const key = 'stone';
    if (cache.has(key))
        return cache.get(key);
    const S = 256;
    const [c, g] = canvas(S);
    g.fillStyle = '#cdbfa8';
    g.fillRect(0, 0, S, S);
    const r = mulberry32(31);
    for (let row = 0; row < 4; row++) {
        let x = row % 2 ? -32 : 0;
        while (x < S) {
            const w = 48 + r() * 40;
            const shade = 200 + r() * 30;
            g.fillStyle = `rgb(${shade + 18},${shade + 8},${shade - 8})`;
            g.fillRect(x + 2, row * 64 + 2, w - 4, 60);
            x += w;
        }
    }
    const img = g.getImageData(0, 0, S, S);
    for (let i = 0; i < img.data.length; i += 4) {
        const n = (r() - 0.5) * 14;
        img.data[i] += n;
        img.data[i + 1] += n;
        img.data[i + 2] += n;
    }
    g.putImageData(img, 0, 0);
    return finish(key, c, true, true);
}
/** Tiling ripple normal map for the lake */
export function waterNormalTexture() {
    const key = 'waternormal';
    if (cache.has(key))
        return cache.get(key);
    const S = 256;
    const [c, g] = canvas(S);
    const img = g.createImageData(S, S);
    const h = (x, y) => Math.sin((x / S) * Math.PI * 8 + Math.sin((y / S) * Math.PI * 4) * 1.5) * 0.5 +
        Math.sin((y / S) * Math.PI * 10 + (x / S) * Math.PI * 2) * 0.35 +
        fbm((x / S) * 8, (y / S) * 8, 3) * 0.4;
    for (let y = 0; y < S; y++) {
        for (let x = 0; x < S; x++) {
            const dx = h(x + 1, y) - h(x - 1, y);
            const dy = h(x, y + 1) - h(x, y - 1);
            const i = (y * S + x) * 4;
            img.data[i] = 128 + dx * 90;
            img.data[i + 1] = 128 + dy * 90;
            img.data[i + 2] = 255;
            img.data[i + 3] = 255;
        }
    }
    g.putImageData(img, 0, 0);
    return finish(key, c, false, true);
}
/** Gold-foil monogram plaque / easel art. Used when no photo URL is given. */
export function monogramArt(opts) {
    if (cache.has(opts.key))
        return cache.get(opts.key);
    const W = opts.w ?? 512;
    const H = opts.h ?? 640;
    const [c, g] = canvas(W, H);
    const bg = g.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, opts.bg ?? '#fbf6ee');
    bg.addColorStop(1, '#efe3cf');
    g.fillStyle = bg;
    g.fillRect(0, 0, W, H);
    // fine double border
    g.strokeStyle = opts.border ?? '#c9a24e';
    g.lineWidth = 3;
    g.strokeRect(22, 22, W - 44, H - 44);
    g.lineWidth = 1;
    g.strokeRect(34, 34, W - 68, H - 68);
    // botanical corner sprigs
    g.strokeStyle = 'rgba(138,154,120,0.7)';
    g.lineWidth = 2;
    for (const [cx, cy, sx, sy] of [
        [46, 46, 1, 1],
        [W - 46, 46, -1, 1],
        [46, H - 46, 1, -1],
        [W - 46, H - 46, -1, -1],
    ]) {
        g.beginPath();
        g.moveTo(cx, cy);
        g.quadraticCurveTo(cx + 40 * sx, cy + 6 * sy, cx + 80 * sx, cy + 30 * sy);
        g.stroke();
        for (let k = 1; k < 5; k++) {
            const px = cx + k * 16 * sx;
            const py = cy + k * k * 1.6 * sy;
            g.beginPath();
            g.ellipse(px, py + 7 * sy, 3, 7, 0.6 * sx * sy, 0, Math.PI * 2);
            g.stroke();
        }
    }
    const total = opts.lines.reduce((s, l) => s + l.size + (l.gap ?? 18), 0);
    let y = H / 2 - total / 2;
    g.textAlign = 'center';
    g.textBaseline = 'top';
    for (const l of opts.lines) {
        g.font = `${l.size}px ${l.font}`;
        g.fillStyle = l.color ?? '#3a2f28';
        g.fillText(l.text, W / 2, y);
        y += l.size + (l.gap ?? 18);
    }
    return finish(opts.key, c);
}
/** Load an image URL as a texture, falling back to `fallback` if it fails. */
export function loadPhoto(url, fallback) {
    if (!url)
        return fallback;
    const tex = new THREE.TextureLoader().load(url, (t) => {
        t.colorSpace = THREE.SRGBColorSpace;
        t.needsUpdate = true;
    }, undefined, () => {
        tex.image = fallback.image;
        tex.needsUpdate = true;
    });
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
}
export function disposeTextureCache() {
    cache.forEach((t) => t.dispose());
    cache.clear();
}
