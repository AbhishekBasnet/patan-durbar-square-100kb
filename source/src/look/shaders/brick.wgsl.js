// WGSL for brick: running-bond walls with mortar lines and per-brick colour, the dark glazed "dachi apa"
// bricks, and the herringbone paving of the square. The bricks come from the painted patterns
// (surfaceTextures.wgsl.js), so they stay visible far away without shimmering; the colour of each brick and
// the weathering over whole walls are worked out here. Depends on noise and surfaceTextures WGSL.

import { surfaceTileMetres } from '../surfaceTextures.js';

const vector = ([across, up]) => 'vec2f(' + across + ', ' + up + ')';

export const brickWgsl = /* wgsl */ `
const wallBrickTile = ${vector(surfaceTileMetres.wallBrick)}; // metres per repeat of the brick pattern
const herringboneTile = ${vector(surfaceTileMetres.herringbone)};
const mortarColor = vec3f(0.22, 0.18, 0.15); // lime mortar darkened by a century of soot
const pavingJointColor = vec3f(0.24, 0.17, 0.11); // the joints are packed with dust and sand, not dark mortar
const brickToneRange = vec2f(0.5, 1.3); // darkest and lightest brick against the average
const brickHueWarm = vec3f(1.05, 0.96, 0.9); // bricks fired a little hotter or cooler
const brickHueCool = vec3f(0.95, 1.0, 1.05);
const pavingWearScale = 0.15; // worn paths: patches per metre

struct BrickSample {
  albedo: vec3f,
  cavity: f32, // 1 on the brick face, darker in the mortar joints
}

// Running bond: every other course shifted by half a brick.
fn brickWall(coordinates: vec2f, gradientX: vec2f, gradientY: vec2f, worldY: f32, baseColor: vec3f, weathering: f32) -> BrickSample {
  let texel = samplePattern(wallBrickLayer, coordinates, wallBrickTile, gradientX, gradientY);
  let tone = mix(brickToneRange.x, brickToneRange.y, texel.r);
  let brickColor = baseColor * tone * mix(brickHueWarm, brickHueCool, texel.b);
  var output: BrickSample;
  output.albedo = mix(brickColor, mortarColor, texel.g * 0.6) * weatherAtLargeScale(coordinates, worldY, weathering);
  output.cavity = texel.a;
  return output;
}

// Herringbone paving, laid at 45 degrees to the square.
fn herringbonePaving(groundPosition: vec2f, gradientX: vec2f, gradientY: vec2f, baseColor: vec3f) -> BrickSample {
  let turn = mat2x2f(0.7071, -0.7071, 0.7071, 0.7071);
  let texel = samplePattern(herringboneLayer, turn * groundPosition, herringboneTile, turn * gradientX, turn * gradientY);
  let brickColor = baseColor * mix(brickToneRange.x, brickToneRange.y, texel.r) * mix(brickHueWarm, brickHueCool, texel.b);
  // centuries of feet: worn smooth and darker along the busy paths, lighter dust at the edges
  let wear = fractalNoise2D(groundPosition * pavingWearScale);
  var output: BrickSample;
  output.albedo = mix(brickColor * mix(0.75, 1.1, wear), pavingJointColor, texel.g * 0.75);
  output.cavity = texel.a;
  return output;
}
`;
