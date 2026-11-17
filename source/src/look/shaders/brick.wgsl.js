// WGSL for brick: running-bond walls with mortar lines and per-brick colour, the dark glazed "dachi apa"
// bricks, and the herringbone paving of the square. Detail fades to its average colour once a brick is
// smaller than a few pixels, so distant walls never shimmer. Depends on noise.wgsl.js.

export const brickWgsl = /* wgsl */ `
const wallBrickSize = vec2f(0.24, 0.062); // metres, mortar included: small Newar bricks
const pavingBrickWidth = 0.115; // metres: the short side of a paving brick
const mortarWidth = 0.12; // share of a brick's height taken by the mortar line

struct BrickSample {
  albedo: vec3f,
  cavity: f32, // 1 on the brick face, darker in the mortar joints
}

// Running bond: every other course shifted by half a brick.
fn brickWall(coordinates: vec2f, footprint: f32, baseColor: vec3f, weathering: f32) -> BrickSample {
  let course = floor(coordinates.y / wallBrickSize.y);
  let shifted = vec2f(coordinates.x / wallBrickSize.x + 0.5 * (course % 2.0), coordinates.y / wallBrickSize.y);
  let cell = floor(shifted);
  let inside = fract(shifted);
  let edge = min(min(inside.x, 1.0 - inside.x) * wallBrickSize.x / wallBrickSize.y, min(inside.y, 1.0 - inside.y));
  let detail = 1.0 - smoothstep(0.006, 0.02, footprint);
  let mortar = (1.0 - smoothstep(mortarWidth * 0.5, mortarWidth, edge)) * detail;
  let brickTone = mix(0.72, 1.18, hashOf2D(cell)) * mix(1.0, 0.9, hashOf2D(cell + 9.0) * detail);
  let stain = fractalNoise2D(coordinates * vec2f(0.6, 0.9));
  // rain streaks and soot darken the bricks downward from ledges and toward the ground
  let weatherDark = mix(1.0, 0.6 + 0.4 * stain, weathering);
  var output: BrickSample;
  output.albedo = mix(baseColor * mix(1.0, brickTone, detail) * weatherDark, vec3f(0.30, 0.26, 0.22) * weatherDark, mortar * 0.8);
  output.cavity = 1.0 - 0.45 * mortar;
  return output;
}

// Herringbone paving of 1 x 2 bricks. Cells are sorted into bricks by (column - row) mod 4: 0 and 1 are
// the two halves of a lying brick, 3 and 2 the lower and upper halves of a standing one.
fn herringbonePaving(groundPosition: vec2f, footprint: f32, baseColor: vec3f) -> BrickSample {
  let rotated = vec2f(groundPosition.x + groundPosition.y, groundPosition.y - groundPosition.x) * 0.7071 / pavingBrickWidth;
  let cell = floor(rotated);
  let kind = ((i32(cell.x) - i32(cell.y)) % 4 + 4) % 4;
  var origin = cell;
  var size = vec2f(2.0, 1.0);
  if (kind == 1) { origin.x -= 1.0; }
  if (kind >= 2) { size = vec2f(1.0, 2.0); }
  if (kind == 2) { origin.y -= 1.0; }
  let inside = rotated - origin;
  let edge = min(min(inside.x, size.x - inside.x), min(inside.y, size.y - inside.y));
  let detail = 1.0 - smoothstep(0.01, 0.035, footprint);
  let mortar = (1.0 - smoothstep(0.05, 0.11, edge)) * detail;
  let brickTone = mix(0.8, 1.12, hashOf2D(origin));
  // centuries of feet: worn smooth and darker along the busy paths, lighter dust at the edges
  let wear = fractalNoise2D(groundPosition * 0.15);
  var output: BrickSample;
  output.albedo = baseColor * mix(1.0, brickTone, detail) * mix(0.75, 1.1, wear);
  // the joints are packed with dust and sand, not dark mortar
  output.albedo = mix(output.albedo, vec3f(0.24, 0.17, 0.11), mortar * 0.75);
  output.cavity = 1.0 - 0.25 * mortar;
  return output;
}
`;
