import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
/**
 * Shared glTF loading.
 *
 * `url` may be a normal path/URL to a .glb, or `module:<path>` pointing at an
 * ES module whose default export is the GLB as base64. The module form lets
 * hosts that only allow script files (like the zero-install preview) ship models.
 */
let gltfLoader = null;
export function gltf() {
    if (gltfLoader)
        return gltfLoader;
    gltfLoader = new GLTFLoader();
    const draco = new DRACOLoader();
    draco.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');
    gltfLoader.setDRACOLoader(draco);
    return gltfLoader;
}
export async function fetchGLTF(url) {
    if (url.startsWith('module:')) {
        const mod = await import(/* @vite-ignore */ new URL(url.slice(7), document.baseURI).href);
        const bin = atob(mod.default);
        const buf = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++)
            buf[i] = bin.charCodeAt(i);
        return gltf().parseAsync(buf.buffer, '');
    }
    return gltf().loadAsync(url);
}
