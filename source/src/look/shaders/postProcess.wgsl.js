// WGSL for the film look (V toggles it): the finished frame with sunbeams streaming from the low sun between
// the temples and a soft glow around bright gilding, then through the warm, slightly faded colours of
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
const sunbeamSamples = 24;
const sunbeamReach = 0.45; // share of the way from a pixel to the sun that the beams are traced
const sunbeamThreshold = 0.82; // only the brightest sky feeds the beams
const sunbeamStrength = 0.32;
const sunbeamWarmth = vec3f(1.0, 0.78, 0.5);
const glowRadiusPixels = vec2f(4.0, 9.0); // two rings of taps around each pixel
const glowThreshold = 0.78;
const glowStrength = 0.22;

fn brightPart(color: vec3f, threshold: f32) -> vec3f {
  return max(color - vec3f(threshold), vec3f(0.0)) / (1.0 - threshold);
}

// Light shafts: walking from the pixel toward the sun on screen, adding up the bright sky in between; where
// a temple or roof is in the way the sum drops, and the shaft between them stands out.
fn sunbeams(pixel: vec2f) -> vec3f {
  let sunPoint = frame.viewProjection * vec4f(frame.cameraPositionAndTime.xyz + frame.sunDirection.xyz * 1000.0, 1.0);
  if (sunPoint.w <= 0.0) { return vec3f(0.0); }
  let sunScreen = (sunPoint.xy / sunPoint.w * vec2f(0.5, -0.5) + 0.5) * frame.screenSize.xy;
  // fades out as the sun leaves the screen
  let offScreen = max(abs(sunScreen.x * frame.screenSize.z - 0.5), abs(sunScreen.y * frame.screenSize.w - 0.5)) - 0.5;
  let visibility = 1.0 - smoothstep(0.0, 0.6, offScreen);
  if (visibility <= 0.0) { return vec3f(0.0); }
  let stepToSun = (sunScreen - pixel) * sunbeamReach / f32(sunbeamSamples);
  var light = 0.0;
  var weight = 1.0;
  for (var sampleIndex = 0; sampleIndex < sunbeamSamples; sampleIndex++) {
    let samplePixel = vec2i(clamp(pixel + stepToSun * f32(sampleIndex), vec2f(0.0), frame.screenSize.xy - 1.0));
    light += dot(brightPart(textureLoad(finishedFrame, samplePixel, 0).rgb, sunbeamThreshold), vec3f(0.333)) * weight;
    weight *= 0.96;
  }
  return sunbeamWarmth * light / f32(sunbeamSamples) * sunbeamStrength * visibility;
}

// A soft glow around the brightest things (gilded finials and roofs in the sun): two rings of eight taps.
fn glow(pixel: vec2f) -> vec3f {
  var sum = vec3f(0.0);
  for (var ring = 0; ring < 2; ring++) {
    for (var tap = 0; tap < 8; tap++) {
      let angle = f32(tap) * 0.7854 + f32(ring) * 0.39;
      let offset = vec2f(cos(angle), sin(angle)) * glowRadiusPixels[ring];
      let samplePixel = vec2i(clamp(pixel + offset, vec2f(0.0), frame.screenSize.xy - 1.0));
      sum += brightPart(textureLoad(finishedFrame, samplePixel, 0).rgb, glowThreshold);
    }
  }
  return sum / 16.0 * glowStrength;
}

@vertex fn postVertex(@builtin(vertex_index) vertexIndex: u32) -> @builtin(position) vec4f {
  let corner = vec2f(f32((vertexIndex << 1u) & 2u), f32(vertexIndex & 2u)) * 2.0 - 1.0;
  return vec4f(corner, 0.0, 1.0);
}

fn grainNoise(pixel: vec2f, time: f32) -> f32 {
  let seed = pixel + vec2f(fract(time * 7.13) * 431.0, fract(time * 3.71) * 271.0);
  return fract(sin(dot(seed, vec2f(12.9898, 78.233))) * 43758.5453) - 0.5;
}

@fragment fn postFragment(@builtin(position) pixel: vec4f) -> @location(0) vec4f {
  let unlit = textureLoad(finishedFrame, vec2i(pixel.xy), 0).rgb;
  let original = unlit + (sunbeams(pixel.xy) + glow(pixel.xy)) * filmLookStrength;
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
