// WGSL for all water: the puddle left by the shower and Manga Hiti's pool (a soft irregular outline or a
// stone basin, a dark wet rim, Fresnel reflections of the square and sky, muddy or clear depth, rings from
// the streams and footsteps, wind ripples in gusts, a floating petal or leaf), and the streams from the spouts.
// Depends on frameUniforms, noise and lighting WGSL.

import { frameUniformsWgsl } from './frameUniforms.wgsl.js';
import { noiseWgsl } from './noise.wgsl.js';
import { lightingWgsl } from './lighting.wgsl.js';

export const rippleEventCapacity = 32; // the largest pool any preset uses (quality.js)

export const waterWgsl = frameUniformsWgsl + noiseWgsl + lightingWgsl + /* wgsl */ `
struct WaterUniforms {
  rippleEvents: array<vec4f, ${rippleEventCapacity}>, // x, z, start time, strength
  rippleCountAndWind: vec4f, // events in use, wind gust strength, height of the mirrored water, 1 if mirrored this frame
}
@group(1) @binding(0) var<uniform> water: WaterUniforms;
@group(1) @binding(1) var reflectionImage: texture_2d<f32>;
@group(1) @binding(2) var reflectionSampler: sampler;

override hasPlanarReflection: bool = true; // false on Low: sky and a blurred tint of the buildings instead

const rippleSpeedMetresPerSecond = 0.32;
const rippleWavelengthMetres = 0.05;
const rippleLifeSeconds = 2.6;
const rippleFadePerSecond = 1.6;
const windRippleScale = 16.0; // waves per metre in a gust
const windSlopeStrength = 0.35; // how much a full gust tilts the surface
const rimWidth = 0.32; // share of the puddle size the wet rim reaches beyond the water

// ---- water bodies: one quad each
struct WaterBodyVaryings {
  @builtin(position) clipPosition: vec4f,
  @location(0) worldPosition: vec3f,
  @location(1) localPoint: vec2f, // -1..1 across the water, more for the rim
  @location(2) @interpolate(flat) seedDepthShape: vec4f, // random seed, depth (0 shallow, 1 deep), shape (0 organic, 1 basin), surface height
}

@vertex fn waterBodyVertex(
  @builtin(vertex_index) vertexIndex: u32,
  @location(0) centreAndRotation: vec4f, // x, surface y, z, rotation
  @location(1) halfSizeAndLook: vec4f, // half size x, half size z, seed, depth
  @location(2) shapeAndSpare: vec4f, // shape, 0, 0, 0
) -> WaterBodyVaryings {
  let corners = array<vec2f, 6>(vec2f(-1.0, -1.0), vec2f(1.0, -1.0), vec2f(1.0, 1.0), vec2f(-1.0, -1.0), vec2f(1.0, 1.0), vec2f(-1.0, 1.0));
  let reach = select(1.0 + rimWidth * 1.5, 1.0, shapeAndSpare.x > 0.5);
  let corner = corners[vertexIndex] * reach;
  let cosine = cos(centreAndRotation.w);
  let sine = sin(centreAndRotation.w);
  let offset = corner * halfSizeAndLook.xy;
  let worldPosition = vec3f(centreAndRotation.x + offset.x * cosine - offset.y * sine, centreAndRotation.y, centreAndRotation.z + offset.x * sine + offset.y * cosine);
  var output: WaterBodyVaryings;
  output.clipPosition = frame.viewProjection * vec4f(worldPosition, 1.0);
  output.worldPosition = worldPosition;
  output.localPoint = corner;
  output.seedDepthShape = vec4f(halfSizeAndLook.zw, shapeAndSpare.x, centreAndRotation.y);
  return output;
}

// Slope of the water surface (d height / dx, d height / dz) from every live ripple ring and the wind.
fn waterSlope(groundPoint: vec2f) -> vec2f {
  let time = frame.cameraPositionAndTime.w;
  var slope = vec2f(0.0);
  let eventCount = i32(water.rippleCountAndWind.x);
  for (var index = 0; index < eventCount; index++) {
    let event = water.rippleEvents[index];
    let age = time - event.z;
    if (age < 0.0 || age > rippleLifeSeconds) { continue; }
    let toPoint = groundPoint - event.xy;
    let pointDistance = length(toPoint) + 0.0001;
    let behindFront = pointDistance - age * rippleSpeedMetresPerSecond;
    // a short train of crests around the expanding front, fading with age and spreading thinner with distance
    let envelope = exp(-behindFront * behindFront / 0.004) * exp(-age * rippleFadePerSecond) * event.w / (1.0 + pointDistance * 6.0);
    let waveSlope = cos(behindFront * 6.2832 / rippleWavelengthMetres) * envelope * 0.35;
    slope += toPoint / pointDistance * waveSlope;
  }
  // wind: gusts drift across the square; in a gust fine ripples break up the reflection, then it settles
  let gust = smoothstep(0.6, 0.9, valueNoise2D(groundPoint * 0.04 + vec2f(time * 0.09, time * 0.03))) * water.rippleCountAndWind.y;
  if (gust > 0.001) {
    let wavePoint = groundPoint * windRippleScale + vec2f(time * 2.1, time * 1.3);
    let here = valueNoise2D(wavePoint);
    slope += vec2f(valueNoise2D(wavePoint + vec2f(0.15, 0.0)) - here, valueNoise2D(wavePoint + vec2f(0.0, 0.15)) - here) * gust * windSlopeStrength;
  }
  return slope;
}

// What the water mirrors: the scene drawn upside down (the planar reflection), or the sky with a warm
// brick tint toward the horizon where the buildings would be.
fn reflectedColor(screenUv: vec2f, slope: vec2f, reflectedDirection: vec3f, usesPlanar: bool) -> vec3f {
  if (hasPlanarReflection && usesPlanar) {
    let distortedUv = clamp(screenUv + slope * vec2f(0.08, -0.08), vec2f(0.001), vec2f(0.999));
    return textureSampleLevel(reflectionImage, reflectionSampler, distortedUv, 0.0).rgb;
  }
  let sky = toneMapToDisplay(skyRadiance(reflectedDirection)).rgb;
  let buildingTint = vec3f(0.36, 0.2, 0.13);
  return mix(buildingTint, sky, smoothstep(0.05, 0.45, reflectedDirection.y));
}

// A marigold petal, a leaf or a bit of straw on each water body, drifting and bobbing on the ripples.
fn floatingThing(localPoint: vec2f, seed: f32, slope: vec2f) -> vec4f {
  let time = frame.cameraPositionAndTime.w;
  let kind = floor(fract(seed * 7.13) * 3.0);
  let home = vec2f(fract(seed * 3.7), fract(seed * 5.3)) * 0.9 - 0.45;
  let drift = vec2f(sin(time * 0.13 + seed * 9.0), cos(time * 0.11 + seed * 5.0)) * 0.08 + slope * 0.3;
  let toThing = localPoint - home - drift;
  let angle = seed * 6.0 + time * 0.05;
  let turned = vec2f(toThing.x * cos(angle) + toThing.y * sin(angle), -toThing.x * sin(angle) + toThing.y * cos(angle));
  var size = vec2f(0.06, 0.04);
  var color = vec3f(0.95, 0.45, 0.04); // marigold
  if (kind == 1.0) { size = vec2f(0.09, 0.04); color = vec3f(0.22, 0.24, 0.07); } // leaf
  if (kind == 2.0) { size = vec2f(0.12, 0.008); color = vec3f(0.7, 0.58, 0.3); } // straw
  let inside = 1.0 - smoothstep(0.8, 1.0, length(turned / size));
  return vec4f(color, inside);
}

@fragment fn waterBodyFragment(input: WaterBodyVaryings) -> @location(0) vec4f {
  let seed = input.seedDepthShape.x;
  let depthLook = input.seedDepthShape.y;
  let isBasin = input.seedDepthShape.z > 0.5;
  // organic outline: the distance from the centre bent by noise, so the puddle is no circle
  let bend = fractalNoise2D(input.localPoint * 1.4 + seed * 37.0) - 0.5;
  let shapeDistance = select(length(input.localPoint) + bend * 0.55, max(abs(input.localPoint.x), abs(input.localPoint.y)), isBasin);
  let waterAmount = 1.0 - smoothstep(0.86, 1.0, shapeDistance);
  let rimAmount = (1.0 - smoothstep(1.0, 1.0 + rimWidth, shapeDistance)) * (1.0 - waterAmount);

  let toCamera = normalize(frame.cameraPositionAndTime.xyz - input.worldPosition);
  let slope = waterSlope(input.worldPosition.xz);
  let normal = normalize(vec3f(-slope.x, 1.0, -slope.y));
  let facing = max(dot(normal, toCamera), 0.0);
  // Schlick's Fresnel, a little stronger than clean water's: a film of water on brick mirrors well at low angles
  let fresnel = 0.04 + 0.96 * pow(1.0 - facing, 4.0);
  let reflectedDirection = reflect(-toCamera, normal);
  let screenUv = input.clipPosition.xy * frame.screenSize.zw;
  // only the water lying on the plane mirrored this frame can use the reflection image
  let isMirroredThisFrame = water.rippleCountAndWind.w > 0.5 && abs(input.seedDepthShape.w - water.rippleCountAndWind.z) < 0.05;
  var mirrored = reflectedColor(screenUv, slope, reflectedDirection, isMirroredThisFrame);
  // the low sun glints off the ripples
  let glint = pow(max(dot(reflectedDirection, frame.sunDirection.xyz), 0.0), 600.0) * sunVisibility(input.worldPosition, vec3f(0.0, 1.0, 0.0));
  mirrored += toneMapToDisplay(frame.sunColor.rgb * glint * 3.0).rgb;
  // shallow water is muddy and brown, deep water darker and clearer
  let murk = mix(0.45, 0.15, depthLook);
  let bottomTint = mix(vec3f(0.2, 0.12, 0.06), vec3f(0.03, 0.03, 0.025), depthLook);
  let waterColor = mirrored * fresnel + bottomTint * murk * (1.0 - fresnel);
  let waterAlpha = fresnel + murk * (1.0 - fresnel);

  // premultiplied: the bricks below show through, darkened as if wet
  var color = waterColor * waterAmount;
  var alpha = waterAlpha * waterAmount + rimAmount * 0.28;
  let floater = floatingThing(input.localPoint, seed, slope) * waterAmount;
  color = mix(color, floater.rgb * 0.6, floater.a);
  alpha = mix(alpha, 1.0, floater.a);
  return vec4f(color, alpha);
}

// ---- streams: a ribbon facing the camera, following the arc of water falling from a spout
struct StreamVaryings {
  @builtin(position) clipPosition: vec4f,
  @location(0) along: f32, // 0 at the spout, 1 where it lands
  @location(1) across: f32, // -1..1 over the ribbon's width
  @location(2) worldPosition: vec3f,
}

const streamSegmentCount = 12u;
const streamWidthMetres = 0.045;

@vertex fn streamVertex(
  @builtin(vertex_index) vertexIndex: u32,
  @location(0) spoutAndSpeed: vec4f, // spout tip x, y, z, outflow speed
  @location(1) directionAndDrop: vec4f, // outflow direction x, z, drop height, 0
) -> StreamVaryings {
  let segment = vertexIndex / 6u;
  let corner = array<vec2f, 6>(vec2f(0.0, -1.0), vec2f(1.0, -1.0), vec2f(1.0, 1.0), vec2f(0.0, -1.0), vec2f(1.0, 1.0), vec2f(0.0, 1.0))[vertexIndex % 6u];
  let along = (f32(segment) + corner.x) / f32(streamSegmentCount);
  // time to fall the drop height, and the point on the arc at this share of it
  let fallTime = sqrt(2.0 * directionAndDrop.z / 9.81);
  let time = along * fallTime;
  let point = spoutAndSpeed.xyz + vec3f(directionAndDrop.x * spoutAndSpeed.w * time, -4.905 * time * time, directionAndDrop.y * spoutAndSpeed.w * time);
  let tangent = normalize(vec3f(directionAndDrop.x * spoutAndSpeed.w, -9.81 * time, directionAndDrop.y * spoutAndSpeed.w));
  let side = normalize(cross(tangent, frame.cameraPositionAndTime.xyz - point));
  let width = streamWidthMetres * (1.0 - along * 0.35);
  let worldPosition = point + side * corner.y * width;
  var output: StreamVaryings;
  output.clipPosition = frame.viewProjection * vec4f(worldPosition, 1.0);
  output.along = along;
  output.across = corner.y;
  output.worldPosition = worldPosition;
  return output;
}

@fragment fn streamFragment(input: StreamVaryings) -> @location(0) vec4f {
  let time = frame.cameraPositionAndTime.w;
  // streaks rushing down the stream, brighter at its core
  let streaks = valueNoise2D(vec2f(input.across * 3.0, input.along * 9.0 - time * 7.0));
  let core = 1.0 - abs(input.across);
  let sky = toneMapToDisplay(skyRadiance(vec3f(0.0, 0.6, 0.8))).rgb;
  let color = mix(vec3f(0.32, 0.3, 0.26), sky, 0.4 + 0.5 * streaks) * core;
  let alpha = core * (0.45 + 0.4 * streaks);
  return vec4f(color * alpha, alpha);
}
`;
