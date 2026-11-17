// WGSL for the film look (V toggles it): the finished frame through the warm, slightly faded colours of
// mid-1980s colour negative film: lifted blacks, softened highlights, a warm cast, a touch less saturation,
// fine moving grain strongest in the mid-tones, and a soft vignette. Never strong enough to hide detail.
// Depends on frameUniforms.wgsl.js (time, screen size).

import { frameUniformsWgsl } from './frameUniforms.wgsl.js';

export const postProcessWgsl = frameUniformsWgsl + /* wgsl */ `
@group(1) @binding(0) var finishedFrame: texture_2d<f32>;

// Easy tweak: 0 is no film look at all, 1 the intended look.
override filmLookStrength: f32 = 1.0;
const grainAmount = 0.035;
const vignetteAmount = 0.16;
const warmCast = vec3f(1.035, 1.0, 0.9);
const liftedBlack = vec3f(0.035, 0.026, 0.018);
const keptSaturation = 0.86;

@vertex fn postVertex(@builtin(vertex_index) vertexIndex: u32) -> @builtin(position) vec4f {
  let corner = vec2f(f32((vertexIndex << 1u) & 2u), f32(vertexIndex & 2u)) * 2.0 - 1.0;
  return vec4f(corner, 0.0, 1.0);
}

fn grainNoise(pixel: vec2f, time: f32) -> f32 {
  let seed = pixel + vec2f(fract(time * 7.13) * 431.0, fract(time * 3.71) * 271.0);
  return fract(sin(dot(seed, vec2f(12.9898, 78.233))) * 43758.5453) - 0.5;
}

@fragment fn postFragment(@builtin(position) pixel: vec4f) -> @location(0) vec4f {
  let original = textureLoad(finishedFrame, vec2i(pixel.xy), 0).rgb;
  let luma = dot(original, vec3f(0.299, 0.587, 0.114));
  var film = mix(vec3f(luma), original, keptSaturation) * warmCast;
  // the film's soft shoulder: highlights roll off instead of clipping, and blacks never go fully black
  film = liftedBlack + film * (1.0 - liftedBlack) * (1.0 - 0.12 * film);
  let midTones = 1.0 - abs(luma * 2.0 - 1.0);
  film += grainNoise(pixel.xy, frame.cameraPositionAndTime.w) * grainAmount * (0.4 + 0.6 * midTones);
  let fromCentre = (pixel.xy * frame.screenSize.zw - 0.5) * vec2f(frame.screenSize.x * frame.screenSize.w, 1.0);
  film *= 1.0 - vignetteAmount * dot(fromCentre, fromCentre) * 1.6;
  return vec4f(mix(original, film, filmLookStrength), 1.0);
}
`;
