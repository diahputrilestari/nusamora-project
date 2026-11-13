import * as THREE from 'three';
/**
 * Final film-look pass: warm highlight lift, soft vignette, fine grain and
 * a "dip to ivory" fade used by the opening transition. Runs after tone
 * mapping on display-referred colour.
 */
export const CinematicGradeShader = {
    uniforms: {
        tDiffuse: { value: null },
        uTime: { value: 0 },
        uVignette: { value: 0.32 },
        uGrain: { value: 0.035 },
        uFade: { value: 0 },
        uFadeColor: { value: new THREE.Vector3(0.98, 0.95, 0.9) },
        uWarmth: { value: 0.06 },
    },
    vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uTime, uVignette, uGrain, uFade, uWarmth;
    uniform vec3 uFadeColor;
    varying vec2 vUv;
    float rand(vec2 co) { return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453); }
    void main() {
      vec4 c = texture2D(tDiffuse, vUv);
      vec3 col = c.rgb;
      float l = dot(col, vec3(0.299, 0.587, 0.114));
      // split-tone: warm highlights, slightly rose shadows
      col += vec3(0.06, 0.03, -0.01) * smoothstep(0.45, 1.0, l) * (uWarmth / 0.06);
      col += vec3(0.025, 0.0, 0.035) * (1.0 - smoothstep(0.0, 0.4, l)); // lilac dusk shadows
      // gentle S-curve and +8% saturation so the haze never reads milky
      col = mix(col, col * col * (3.0 - 2.0 * col), 0.35);
      col = mix(vec3(dot(col, vec3(0.299, 0.587, 0.114))), col, 1.08);
      vec2 d = vUv - 0.5;
      float vig = smoothstep(0.85, 0.2, length(d * vec2(1.1, 1.0)));
      col *= mix(1.0 - uVignette, 1.0, vig);
      col += (rand(vUv * 731.0 + uTime) - 0.5) * uGrain;
      col = mix(col, uFadeColor, uFade);
      gl_FragColor = vec4(col, c.a);
    }`,
};
