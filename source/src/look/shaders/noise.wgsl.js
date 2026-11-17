// WGSL noise shared by every material: a cheap hash, smooth value noise and a three-octave fractal of it.
// Depends on nothing.

export const noiseWgsl = /* wgsl */ `
// three octaves of value noise: their weights, and how each is scaled and shifted off the one before
const octaveWeights = vec3f(0.55, 0.3, 0.15);
const octaveScales = vec2f(2.13, 4.37);
const octaveShifts = vec2f(17.1, 3.7);

fn hashOf2D(point: vec2f) -> f32 {
  var mixed = fract(point * vec2f(127.34, 311.71));
  mixed += dot(mixed, mixed + 34.53);
  return fract(mixed.x * mixed.y);
}

fn valueNoise2D(point: vec2f) -> f32 {
  let cell = floor(point);
  let inside = fract(point);
  let blend = inside * inside * (3.0 - 2.0 * inside);
  let bottom = mix(hashOf2D(cell), hashOf2D(cell + vec2f(1.0, 0.0)), blend.x);
  let top = mix(hashOf2D(cell + vec2f(0.0, 1.0)), hashOf2D(cell + vec2f(1.0, 1.0)), blend.x);
  return mix(bottom, top, blend.y);
}

fn fractalNoise2D(point: vec2f) -> f32 {
  return octaveWeights.x * valueNoise2D(point) + octaveWeights.y * valueNoise2D(point * octaveScales.x + octaveShifts.x) + octaveWeights.z * valueNoise2D(point * octaveScales.y + octaveShifts.y);
}

// Surface coordinates in metres: across and up a wall, or across the ground for flat surfaces.
fn surfaceCoordinates(worldPosition: vec3f, normal: vec3f) -> vec2f {
  if (abs(normal.y) > 0.7) { return worldPosition.xz; }
  let across = normalize(vec2f(-normal.z, normal.x));
  return vec2f(dot(worldPosition.xz, across), worldPosition.y);
}
`;
