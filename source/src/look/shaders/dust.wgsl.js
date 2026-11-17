// WGSL for the specks in the air: dust motes drifting around you, glinting only where the low sun reaches them
// and brightest when you look toward it, and thin incense smoke rising and curling from the shrines. Each
// particle is a small soft dot facing the camera; everything about it is worked out from its index, so nothing
// is stored or updated on the CPU. Depends on frameUniforms and lighting WGSL.

import { frameUniformsWgsl } from './frameUniforms.wgsl.js';
import { lightingWgsl } from './lighting.wgsl.js';

export const smokeSourceCapacity = 8;

export const dustWgsl = frameUniformsWgsl + lightingWgsl + /* wgsl */ `
struct ParticleSettings {
  smokeSources: array<vec4f, ${smokeSourceCapacity}>, // incense tips: x, y, z, 0
  counts: vec4f, // dust motes, smoke particles per source, smoke sources, 0
}
@group(1) @binding(0) var<uniform> particles: ParticleSettings;

const dustBoxMetres = vec3f(16.0, 6.0, 16.0); // the motes fill a box that travels with you
const dustDrift = vec3f(0.05, 0.012, 0.03); // metres per second
const dustColor = vec3f(1.0, 0.82, 0.55);
const dustBrightness = 0.55;
const dustSizeMetres = 0.005;
const dustSizePerMetre = 0.0011; // far motes are drawn a little larger, so they never shrink below a pixel
const smokeRiseMetres = 1.4; // how high a wisp climbs before it is gone
const smokeLifeSeconds = 6.0;
const smokeColor = vec3f(0.78, 0.74, 0.7);
const smokeOpacity = 0.22;

struct ParticleVaryings {
  @builtin(position) clipPosition: vec4f,
  @location(0) corner: vec2f,
  @location(1) @interpolate(flat) colorAndOpacity: vec4f, // premultiplied colour, and opacity (0 for dust: it adds light)
}

fn hashOfIndex(index: f32) -> f32 {
  return fract(sin(index * 12.9898 + 78.233) * 43758.5453);
}

@vertex fn particleVertex(@builtin(vertex_index) vertexIndex: u32, @builtin(instance_index) particleIndex: u32) -> ParticleVaryings {
  var output: ParticleVaryings;
  let corners = array<vec2f, 6>(vec2f(-1.0, -1.0), vec2f(1.0, -1.0), vec2f(1.0, 1.0), vec2f(-1.0, -1.0), vec2f(1.0, 1.0), vec2f(-1.0, 1.0));
  let corner = corners[vertexIndex];
  let time = frame.cameraPositionAndTime.w;
  let camera = frame.cameraPositionAndTime.xyz;
  let index = f32(particleIndex);
  var position: vec3f;
  var size: f32;
  if (index < particles.counts.x) {
    // a dust mote: a fixed spot in a box that wraps around the camera, drifting and wavering slowly
    let home = vec3f(hashOfIndex(index), hashOfIndex(index + 0.31), hashOfIndex(index + 0.67));
    let waver = vec3f(sin(time * 0.4 + index), sin(time * 0.3 + index * 1.7), cos(time * 0.35 + index)) * 0.15;
    position = camera + (fract(home + (dustDrift * time - camera) / dustBoxMetres) - 0.5) * dustBoxMetres + waver;
    let toMote = position - camera;
    let moteDistance = length(toMote);
    size = dustSizeMetres + moteDistance * dustSizePerMetre;
    // seen only in sunlight, and brightest against the light, as dust is
    let towardSun = pow(max(dot(toMote / moteDistance, frame.sunDirection.xyz), 0.0), 5.0);
    let lit = sunVisibility(position, vec3f(0.0, 1.0, 0.0)) * (0.12 + 0.88 * towardSun);
    let fadeNearAndFar = smoothstep(0.4, 1.2, moteDistance) * (1.0 - smoothstep(5.0, 8.0, moteDistance));
    output.colorAndOpacity = vec4f(dustColor * lit * dustBrightness * fadeNearAndFar * step(0.05, position.y), 0.0);
  } else {
    // a wisp of incense smoke: rising from its source, spreading and curling, fading as it goes
    let smokeIndex = index - particles.counts.x;
    let source = particles.smokeSources[min(u32(smokeIndex / particles.counts.y), ${smokeSourceCapacity - 1}u)].xyz;
    let age = fract(time / smokeLifeSeconds + hashOfIndex(smokeIndex));
    let curl = vec3f(sin(age * 9.0 + smokeIndex), 0.0, cos(age * 7.0 + smokeIndex * 1.3)) * 0.05 * age;
    position = source + curl + vec3f(0.02 * sin(time * 0.7), age * smokeRiseMetres, 0.0);
    size = 0.015 + age * 0.09;
    let opacity = smokeOpacity * (1.0 - age) * smoothstep(0.0, 0.08, age);
    let lit = 0.45 + 0.55 * sunVisibility(position, vec3f(0.0, 1.0, 0.0));
    output.colorAndOpacity = vec4f(smokeColor * lit * opacity, opacity);
  }
  // a square turned to face the camera
  let toCamera = normalize(camera - position);
  let right = normalize(cross(vec3f(0.0, 1.0, 0.0), toCamera));
  let up = cross(toCamera, right);
  output.clipPosition = frame.viewProjection * vec4f(position + (right * corner.x + up * corner.y) * size, 1.0);
  output.corner = corner;
  return output;
}

@fragment fn particleFragment(input: ParticleVaryings) -> @location(0) vec4f {
  let softness = 1.0 - smoothstep(0.3, 1.0, length(input.corner));
  return vec4f(input.colorAndOpacity.rgb * softness, input.colorAndOpacity.a * softness);
}
`;
