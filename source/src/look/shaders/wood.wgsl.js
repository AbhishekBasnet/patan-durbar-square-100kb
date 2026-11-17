// WGSL for weathered sal wood: dark grain, carved relief that catches the low sun (bumps and shadowed hollows
// made by shading, used in the middle distance and on top of real geometry up close), and the diagonal
// lattice of window screens. Depends on noise.wgsl.js.

export const woodWgsl = /* wgsl */ `
const carvingPlain = 0u;
const carvingRelief = 1u;
const carvingLattice = 2u;
const latticeHoleSpacing = 0.075; // metres between lattice openings
const grainScale = vec2f(2.0, 40.0); // grain runs along the timber: long streaks, fine across
const carvingScale = 26.0; // relief motifs per metre
const carvingWarpScale = 5.0; // how fast the motifs bend
const carvingWarpAmount = 2.0;

struct WoodSample {
  albedo: vec3f,
  cavity: f32,
  bump: vec2f, // slope of the carved relief, in surface coordinates
}

fn weatheredWood(coordinates: vec2f, footprint: f32, baseColor: vec3f, carving: u32, variant: f32) -> WoodSample {
  var output: WoodSample;
  let grain = valueNoise2D(coordinates * grainScale + variant * 31.0);
  let detail = 1.0 - smoothstep(0.004, 0.03, footprint);
  // grey silvering where the rain reaches, near-black where it does not
  let silvering = smoothstep(0.35, 0.8, fractalNoise2D(coordinates * 0.9 + variant * 7.0));
  output.albedo = baseColor * mix(1.0, 0.75 + 0.5 * grain, detail) * mix(1.0, 1.9, silvering * 0.5);
  output.cavity = 1.0;
  output.bump = vec2f(0.0);
  if (carving == carvingRelief) {
    // interlocking scrolls and petals: two crossing ripple fields bent by noise
    let warped = coordinates * carvingScale + carvingWarpAmount * vec2f(valueNoise2D(coordinates * carvingWarpScale), valueNoise2D(coordinates * carvingWarpScale + 9.0));
    let height = sin(warped.x) * sin(warped.y * 1.3) + 0.5 * sin(warped.x * 2.1 + warped.y);
    output.bump = vec2f(cos(warped.x) * sin(warped.y * 1.3), sin(warped.x) * cos(warped.y * 1.3)) * 0.6 * detail;
    output.cavity = mix(1.0, 0.55 + 0.45 * smoothstep(-1.0, 1.0, height), detail);
  } else if (carving == carvingLattice) {
    let grid = fract(vec2f(coordinates.x + coordinates.y, coordinates.y - coordinates.x) / latticeHoleSpacing) - 0.5;
    let hole = 1.0 - smoothstep(0.2, 0.3, max(abs(grid.x), abs(grid.y)));
    // far away the screen reads as a dark see-through panel
    let opening = mix(0.55, hole, detail);
    output.albedo = mix(output.albedo, vec3f(0.006, 0.005, 0.004), opening);
    output.cavity = 1.0 - 0.6 * opening;
  }
  return output;
}
`;
