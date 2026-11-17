// WGSL for the painted surface patterns (look/surfaceTextures.js): reading a layer with the right mipmap level
// and anisotropic filtering for the distance and slant, and the large-scale weathering that keeps walls from
// looking like one repeated tile: old repair patches, rain and soot streaks, and rising damp near the ground.
// Depends on noise.wgsl.js; binds the surface texture and its sampler.

import { surfaceLayer } from '../surfaceTextures.js';

const layerConstants = Object.entries(surfaceLayer).map(([name, index]) => 'const ' + name + 'Layer = ' + index + ';').join('\n');

export const surfaceTexturesWgsl = /* wgsl */ `
@group(0) @binding(5) var surfacePatterns: texture_2d_array<f32>;
@group(0) @binding(6) var surfacePatternSampler: sampler;
${layerConstants}

const repairPatchesPerMetre = vec2f(0.6, 0.9);
const repairPatchShare = 0.45; // share of the wall that has been patched with slightly different brick
const repairToneSpread = 0.16;
const streakScale = vec2f(2.5, 0.25); // rain and soot streaks: narrow across, long down the wall
const streakDarkening = 0.18;
const risingDampMetres = 0.7; // walls are darker up to this height above the ground
const risingDampDarkening = 0.22;

// One layer at surface coordinates (metres), repeating every tileMetres; the gradients choose the mipmap level.
fn samplePattern(layer: i32, coordinates: vec2f, tileMetres: vec2f, gradientX: vec2f, gradientY: vec2f) -> vec4f {
  return textureSampleGrad(surfacePatterns, surfacePatternSampler, coordinates / tileMetres, layer, gradientX / tileMetres, gradientY / tileMetres);
}

// A brightness factor that varies over metres, not centimetres: what a wall looks like from across the square.
fn weatherAtLargeScale(coordinates: vec2f, worldY: f32, weathering: f32) -> f32 {
  let patchCell = floor(coordinates * repairPatchesPerMetre);
  let isPatched = step(1.0 - repairPatchShare, hashOf2D(patchCell + 7.0));
  let repair = 1.0 + (hashOf2D(patchCell) - 0.5) * repairToneSpread * isPatched;
  let streaks = 1.0 - streakDarkening * smoothstep(0.45, 0.85, valueNoise2D(coordinates * streakScale));
  let damp = 1.0 - risingDampDarkening * (1.0 - smoothstep(0.0, risingDampMetres, worldY));
  return mix(1.0, repair * streaks * damp, weathering);
}
`;
