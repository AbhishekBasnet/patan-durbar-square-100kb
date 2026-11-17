// The fixed late-afternoon light: a low warm sun in the west-south-west, a pale golden sky and haze.
// Writes these into the per-frame uniforms that every shader reads (frameUniforms.wgsl.js).
// Depends on math.js.

import { degreesToRadians } from '../core/math.js';

// Easy first tweaks: the sun's position and colours.
export const sunAzimuthDegrees = 248; // compass direction of the sun: just south of west, so it lights the palace front
export const sunElevationDegrees = 13; // low golden-hour sun: long shadows across the paving
export const goldenHourSunColor = [3.2, 2.15, 1.2]; // linear light, brighter than 1 (tone-mapped later)
export const skyZenithColor = [0.22, 0.34, 0.55];
export const skyHorizonColor = [1.05, 0.72, 0.45];
export const groundBounceColor = [0.32, 0.17, 0.10]; // warm light thrown back by the brick paving and walls
export const hazeColor = [0.95, 0.70, 0.48];
export const hazeDensityPerMetre = 0.0045; // smoky haze: houses at 100 m are softened, the far hills fade out

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
