// WGSL for the clay roof tiles: overlapping rows with a shadow under each (from the painted patterns,
// surfaceTextures.wgsl.js), moss and grass growing where water lingers, and faded plaster.
// Depends on noise and surfaceTextures WGSL.

import { surfaceTileMetres } from '../surfaceTextures.js';

export const tileWgsl = /* wgsl */ `
const roofTileTile = vec2f(${surfaceTileMetres.roofTiles.join(', ')}); // metres per repeat of the tile pattern
const rainStainScale = vec2f(4.0, 0.3); // stains: narrow across, long down the wall
const plasterPatchScale = 0.8;
const mossColor = vec3f(0.11, 0.13, 0.04);
const tileToneRange = vec2f(0.55, 1.45);

struct TileSample {
  albedo: vec3f,
  cavity: f32,
}

// Rows run level around the roof: across is the surface's horizontal coordinate, up is the height.
fn mossyRoofTiles(worldPosition: vec3f, along: vec2f, gradientX: vec2f, gradientY: vec2f, normal: vec3f, baseColor: vec3f, weathering: f32) -> TileSample {
  let texel = samplePattern(roofTilesLayer, along, roofTileTile, gradientX, gradientY);
  var albedo = baseColor * mix(tileToneRange.x, tileToneRange.y, texel.r);
  // moss and grass on surfaces that face up, thicker in damp patches
  let mossAmount = smoothstep(0.4, 0.75, fractalNoise2D(worldPosition.xz * 0.7 + worldPosition.y * 0.3)) * smoothstep(0.2, 0.6, normal.y) * weathering;
  albedo = mix(albedo, mossColor, mossAmount * 0.85);
  var output: TileSample;
  output.albedo = albedo;
  output.cavity = texel.a * (1.0 - 0.4 * texel.g);
  return output;
}

// Whitewash over brick: patched, faded, and stained by rain.
fn patchedPlaster(coordinates: vec2f, baseColor: vec3f, weathering: f32) -> vec3f {
  let patches = fractalNoise2D(coordinates * plasterPatchScale);
  let rainStains = valueNoise2D(coordinates * rainStainScale);
  var albedo = baseColor * mix(0.8, 1.08, patches);
  albedo *= mix(1.0, 0.65 + 0.35 * rainStains, weathering * 0.8);
  // where the plaster has fallen off, the brick shows through
  let bareBrick = smoothstep(0.72, 0.78, fractalNoise2D(coordinates * 1.3 + 5.0));
  return mix(albedo, vec3f(0.33, 0.12, 0.07), bareBrick * weathering);
}
`;
