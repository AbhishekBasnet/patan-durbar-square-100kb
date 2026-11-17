// The fixed late-afternoon light: a low warm sun in the west-south-west, a pale golden sky and haze.
// Writes these into the per-frame uniforms that every shader reads (frameUniforms.wgsl.js).
// Depends on math.js.

import { degreesToRadians, orthographic, viewLookingAlong, multiplyMatrices } from '../core/math.js';

// Easy first tweaks: the sun's position and colours.
export const sunAzimuthDegrees = 236; // compass direction of the sun: south-west, so it lights the palace front and
// rakes along the south faces of the temples as you look up the square
export const sunElevationDegrees = 13; // low golden-hour sun: long shadows across the paving
export const goldenHourSunColor = [3.2, 2.15, 1.2]; // linear light, brighter than 1 (tone-mapped later)
export const skyZenithColor = [0.2, 0.36, 0.66];
export const skyHorizonColor = [1.05, 0.72, 0.45];
export const groundBounceColor = [0.32, 0.17, 0.10]; // warm light thrown back by the brick paving and walls
export const hazeColor = [0.95, 0.70, 0.48];
export const hazeDensityPerMetre = 0.0022; // smoky haze: houses at 100 m are softened, the far hills fade out

export function sunDirection() {
  const azimuth = sunAzimuthDegrees * degreesToRadians, elevation = sunElevationDegrees * degreesToRadians;
  // pointing from the ground toward the sun; x east, y up, z south
  return [Math.sin(azimuth) * Math.cos(elevation), Math.sin(elevation), -Math.cos(azimuth) * Math.cos(elevation)];
}

// Fills the lighting part of the frame uniforms, starting at `offset` floats (see FrameUniforms in WGSL).
export function writeLightingUniforms(uniforms, offset) {
  uniforms.set([...sunDirection(), 0], offset);
  uniforms.set([...goldenHourSunColor, 0], offset + 4);
  uniforms.set([...skyZenithColor, 0], offset + 8);
  uniforms.set([...skyHorizonColor, 0], offset + 12);
  uniforms.set([...groundBounceColor, 0], offset + 16);
  uniforms.set([...hazeColor, hazeDensityPerMetre], offset + 20);
}

// ---- the two light maps, drawn once at load (the sun never moves)
const lightMapCentre = [16, 0, -23]; // middle of the square
const sunShadowReachMetres = 82; // half size of the area the sun's shadow map covers
const skyOcclusionReachMetres = 82;
const skyOcclusionTopMetres = 60; // above the highest finial

// World to the sun's shadow map, and world to the top-down height map used for sky occlusion.
export function computeLightMapMatrices() {
  const sun = sunDirection();
  const view = new Float32Array(16), projection = new Float32Array(16);
  const sunEye = lightMapCentre.map((value, axis) => value + sun[axis] * 150);
  viewLookingAlong(view, sunEye, sun.map((value) => -value), [0, 1, 0]);
  orthographic(projection, -sunShadowReachMetres, sunShadowReachMetres, -sunShadowReachMetres, sunShadowReachMetres, 1, 300);
  const sunShadowMatrix = multiplyMatrices(new Float32Array(16), projection, view);
  viewLookingAlong(view, [lightMapCentre[0], skyOcclusionTopMetres, lightMapCentre[2]], [0, -1, 0], [0, 0, -1]);
  orthographic(projection, -skyOcclusionReachMetres, skyOcclusionReachMetres, -skyOcclusionReachMetres, skyOcclusionReachMetres, 0, skyOcclusionTopMetres + 5);
  const skyOcclusionMatrix = multiplyMatrices(new Float32Array(16), projection, view);
  return { sunShadowMatrix, skyOcclusionMatrix };
}
