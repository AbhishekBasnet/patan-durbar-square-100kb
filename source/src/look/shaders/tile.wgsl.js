// WGSL for the clay roof tiles: overlapping rows with a shadow under each, moss and grass growing where
// water lingers, and faded plaster. Depends on noise.wgsl.js.

export const tileWgsl = /* wgsl */ `
const tileRowHeight = 0.085; // metres of height per row of tiles
const tileWidth = 0.17;
const rainStainScale = vec2f(4.0, 0.3); // stains: narrow across, long down the wall
const plasterPatchScale = 0.8;

struct TileSample {
  albedo: vec3f,
  cavity: f32,
}

fn mossyRoofTiles(worldPosition: vec3f, coordinates: vec2f, normal: vec3f, footprint: f32, baseColor: vec3f, weathering: f32) -> TileSample {
  let row = worldPosition.y / tileRowHeight;
  let rowFraction = fract(row);
  let column = coordinates.x / tileWidth + 0.5 * floor(row);
  let detail = 1.0 - smoothstep(0.006, 0.025, footprint);
  // the lower edge of each row overhangs the next: a thin shadow line, and a rounded tile profile across
  let overlapShadow = smoothstep(0.0, 0.25, rowFraction);
  let tileProfile = 0.75 + 0.25 * sin(fract(column) * 3.14159);
  let tileTone = mix(0.75, 1.2, hashOf2D(vec2f(floor(column), floor(row))));
  var albedo = baseColor * mix(1.0, tileTone * tileProfile, detail);
  // moss and grass on surfaces that face up, thicker in damp patches
  let mossAmount = smoothstep(0.4, 0.75, fractalNoise2D(worldPosition.xz * 0.7 + worldPosition.y * 0.3)) * smoothstep(0.2, 0.6, normal.y) * weathering;
  albedo = mix(albedo, vec3f(0.11, 0.13, 0.04), mossAmount * 0.85);
  var output: TileSample;
  output.albedo = albedo;
  output.cavity = mix(1.0, 0.45 + 0.55 * overlapShadow, detail);
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
