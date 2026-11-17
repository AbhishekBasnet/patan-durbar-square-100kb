// WGSL for grey stone: ashlar courses of uneven length (from the painted patterns, surfaceTextures.wgsl.js),
// lichen and soot stains, and the dark streaks rain leaves running down from every ledge.
// Depends on noise and surfaceTextures WGSL.

import { surfaceTileMetres } from '../surfaceTextures.js';

export const stoneWgsl = /* wgsl */ `
const stoneBlockTile = vec2f(${surfaceTileMetres.stoneBlocks.join(', ')}); // metres per repeat of the block pattern
const rainStreakScale = vec2f(3.0, 0.5); // streaks: narrow across, long down the wall
const lichenScale = 1.7; // patches per metre
const lichenColor = vec3f(0.22, 0.24, 0.17);
const blockToneRange = vec2f(0.7, 1.3);

struct StoneSample {
  albedo: vec3f,
  cavity: f32,
}

// hasJoints: false for statues and carvings, which are cut from one block.
fn weatheredStone(coordinates: vec2f, gradientX: vec2f, gradientY: vec2f, worldY: f32, baseColor: vec3f, weathering: f32, hasJoints: bool) -> StoneSample {
  var output: StoneSample;
  output.albedo = baseColor;
  output.cavity = 1.0;
  if (hasJoints) {
    let texel = samplePattern(stoneBlocksLayer, coordinates, stoneBlockTile, gradientX, gradientY);
    output.albedo = baseColor * mix(blockToneRange.x, blockToneRange.y, texel.r) * weatherAtLargeScale(coordinates, worldY, weathering);
    output.cavity = texel.a;
  }
  let lichen = smoothstep(0.55, 0.85, fractalNoise2D(coordinates * lichenScale));
  let streaks = valueNoise2D(coordinates * rainStreakScale);
  output.albedo = mix(output.albedo, lichenColor, lichen * 0.45 * weathering);
  output.albedo *= mix(1.0, 0.75 + 0.25 * streaks, weathering * 0.6);
  return output;
}
`;
