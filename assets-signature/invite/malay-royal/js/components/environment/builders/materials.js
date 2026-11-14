import * as THREE from 'three';
import { marbleTexture } from '../../../utils/textures.js';
let lib = null;
export function materials(cfg) {
    if (lib)
        return lib;
    const marbleMap = marbleTexture().clone();
    marbleMap.repeat.set(1.5, 3);
    marbleMap.needsUpdate = true;
    lib = {
        marble: new THREE.MeshStandardMaterial({ color: '#f8f2e8', map: marbleMap, roughness: 0.32, metalness: 0 }),
        marbleWarm: new THREE.MeshStandardMaterial({ color: '#efe2cf', map: marbleMap, roughness: 0.42 }),
        gold: new THREE.MeshStandardMaterial({ color: cfg.theme.gold, metalness: 1, roughness: 0.28, envMapIntensity: 1.3 }),
        iron: new THREE.MeshStandardMaterial({ color: '#2f2a27', metalness: 0.6, roughness: 0.45 }),
        wood: new THREE.MeshStandardMaterial({ color: '#d9c3a0', roughness: 0.55, metalness: 0.05 }),
        linen: new THREE.MeshStandardMaterial({ color: '#fbf6ee', roughness: 0.9 }),
        chiffon: new THREE.MeshStandardMaterial({
            color: '#fff8f0',
            roughness: 0.8,
            transparent: true,
            opacity: 0.55,
            side: THREE.DoubleSide,
            depthWrite: false,
        }),
        stone: new THREE.MeshStandardMaterial({ color: '#eadbc6', roughness: 0.85 }),
        roof: new THREE.MeshStandardMaterial({ color: '#a98f9b', roughness: 0.6, metalness: 0.1 }),
        glowWarm: new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffc978').multiplyScalar(3.2), toneMapped: false }),
        petals: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, emissive: '#2a1810', emissiveIntensity: 0.12 }),
        leaves: new THREE.MeshStandardMaterial({ color: '#6f8458', roughness: 0.75, side: THREE.DoubleSide }),
        glass: new THREE.MeshPhysicalMaterial({
            color: '#fff4e0',
            roughness: 0.1,
            transparent: true,
            opacity: 0.55,
            emissive: '#ffb860',
            emissiveIntensity: 0.6,
        }),
    };
    return lib;
}
export function disposeMaterials() {
    if (!lib)
        return;
    Object.values(lib).forEach((m) => {
        ;
        m.map?.dispose();
        m.dispose();
    });
    lib = null;
}
