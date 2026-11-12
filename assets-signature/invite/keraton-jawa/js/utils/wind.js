/** Shared clock uniform for every wind-swayed material. Tick it once per frame. */
export const windUniforms = {
    uTime: { value: 0 },
    uWindStrength: { value: 1 },
};
/**
 * Adds a vertex-shader sway to a standard material. Displacement grows with
 * local height (pow 2) so roots/trunks stay planted. Works for plain and
 * instanced meshes (phase is taken from the instance's world offset).
 */
export function applyWind(mat, opts) {
    const { amplitude, height, frequency = 1.6, gust = 0.35 } = opts;
    mat.onBeforeCompile = (shader) => {
        shader.uniforms.uTime = windUniforms.uTime;
        shader.uniforms.uWindStrength = windUniforms.uWindStrength;
        shader.vertexShader = shader.vertexShader
            .replace('#include <common>', `#include <common>
        uniform float uTime;
        uniform float uWindStrength;`)
            .replace('#include <begin_vertex>', `#include <begin_vertex>
        {
          vec3 base = vec3(0.0);
          #ifdef USE_INSTANCING
            base = vec3(instanceMatrix[3][0], 0.0, instanceMatrix[3][2]);
          #endif
          base += (modelMatrix * vec4(0.0,0.0,0.0,1.0)).xyz;
          float h = clamp(position.y / ${height.toFixed(3)}, 0.0, 1.0);
          float w = h * h;
          float phase = base.x * 0.35 + base.z * 0.22;
          float gustWave = sin(uTime * 0.35 + base.x * 0.04 + base.z * 0.03) * 0.5 + 0.5;
          float s = sin(uTime * ${frequency.toFixed(3)} + phase) + sin(uTime * ${(frequency * 2.3).toFixed(3)} + phase * 1.7) * 0.35;
          float amp = ${amplitude.toFixed(4)} * uWindStrength * (1.0 + gustWave * ${gust.toFixed(3)});
          transformed.x += s * amp * w;
          transformed.z += cos(uTime * ${(frequency * 0.8).toFixed(3)} + phase) * amp * 0.45 * w;
        }`);
    };
    mat.customProgramCacheKey = () => `wind-${amplitude}-${height}-${frequency}`;
    return mat;
}
