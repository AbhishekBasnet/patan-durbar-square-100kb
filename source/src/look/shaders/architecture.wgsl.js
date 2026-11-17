// WGSL for all built geometry (monuments, paving): reads each vertex's material id, asks the matching
// material file for its look, then lights it (lighting.wgsl.js), hazes and tone-maps it. Also the depth-only
// vertex stage used to draw the sun shadow map and the sky occlusion map.
// Depends on frameUniforms, noise, brick, wood, stone, gold, tile and lighting WGSL, and materials.js.

import { frameUniformsWgsl } from './frameUniforms.wgsl.js';
import { noiseWgsl } from './noise.wgsl.js';
import { brickWgsl } from './brick.wgsl.js';
import { woodWgsl } from './wood.wgsl.js';
import { stoneWgsl } from './stone.wgsl.js';
import { goldWgsl } from './gold.wgsl.js';
import { tileWgsl } from './tile.wgsl.js';
import { lightingWgsl } from './lighting.wgsl.js';
import { material, materialTable } from '../materials.js';

// The material table becomes WGSL constants: two vec4f per material (colour + roughness, metalness + weathering).
const materialConstants = materialTable.map(([red, green, blue, roughness, metalness, weathering]) =>
  `vec4f(${red},${green},${blue},${roughness}),vec4f(${metalness},${weathering},0,0)`).join(',');

export const architectureWgsl = frameUniformsWgsl + noiseWgsl + brickWgsl + woodWgsl + stoneWgsl + goldWgsl + tileWgsl + lightingWgsl + /* wgsl */ `
const materialLooks = array<vec4f, ${materialTable.length * 2}>(${materialConstants});

// Level-of-detail cross-fade (lod.js): one value per chunk and level, read through the draw's instance index.
@group(0) @binding(4) var<storage, read> lodFades: array<f32>;
// Two pipelines are made from this shader: the cross-fading one dithers, the other never discards (a shader
// that can discard loses early depth testing on some integrated GPUs, even when it never does).
override isCrossFading: bool = false;
const ditherMatrix = array<f32, 16>(0.0, 8.0, 2.0, 10.0, 12.0, 4.0, 14.0, 6.0, 3.0, 11.0, 1.0, 9.0, 15.0, 7.0, 13.0, 5.0);

struct ArchitectureVaryings {
  @builtin(position) clipPosition: vec4f,
  @location(0) worldPosition: vec3f,
  @location(1) normalAndOcclusion: vec4f,
  @location(2) @interpolate(flat) materialData: vec4u, // id, variant, carving, spare
  @location(3) @interpolate(flat) lodFade: f32,
}

@vertex fn architectureVertex(
  @location(0) position: vec3f,
  @location(1) normalAndOcclusion: vec4f,
  @location(2) materialData: vec4u,
  @builtin(instance_index) drawSlot: u32,
) -> ArchitectureVaryings {
  var output: ArchitectureVaryings;
  output.lodFade = lodFades[drawSlot];
  output.clipPosition = frame.viewProjection * vec4f(position, 1.0);
  output.worldPosition = position;
  output.normalAndOcclusion = normalAndOcclusion;
  output.materialData = materialData;
  return output;
}

@fragment fn architectureFragment(input: ArchitectureVaryings) -> @location(0) vec4f {
  let footprint = length(fwidth(input.worldPosition)); // metres covered by one pixel
  // cross-fading between two detail levels: each keeps the pixels the other drops
  let pixel = vec2u(input.clipPosition.xy) % 4u;
  let ditherValue = (ditherMatrix[pixel.y * 4u + pixel.x] + 0.5) / 16.0;
  if (isCrossFading && ((input.lodFade >= 0.0 && ditherValue >= input.lodFade) || (input.lodFade < 0.0 && ditherValue < -input.lodFade))) { discard; }
  let geometricNormal = normalize(input.normalAndOcclusion.xyz);
  let materialId = input.materialData.x;
  let variant = f32(input.materialData.y) / 255.0;
  let carving = input.materialData.z;
  let colorAndRoughness = materialLooks[materialId * 2u];
  let metalnessAndWeathering = materialLooks[materialId * 2u + 1u];
  let tint = mix(0.85, 1.15, variant);
  let baseColor = colorAndRoughness.rgb * tint;
  let weathering = metalnessAndWeathering.y;
  let coordinates = surfaceCoordinates(input.worldPosition, geometricNormal);

  var surface: SurfaceLook;
  surface.albedo = baseColor;
  surface.roughness = colorAndRoughness.a;
  surface.metalness = metalnessAndWeathering.x;
  surface.occlusion = input.normalAndOcclusion.w;
  var normal = geometricNormal;

  switch materialId {
    case ${material.brick}u, ${material.glazedBrick}u: {
      let brick = brickWall(coordinates, footprint, baseColor, weathering);
      surface.albedo = brick.albedo;
      surface.occlusion *= brick.cavity;
    }
    case ${material.paving}u: {
      let paving = herringbonePaving(input.worldPosition.xz, footprint, baseColor);
      surface.albedo = paving.albedo;
      surface.occlusion *= paving.cavity;
    }
    case ${material.wood}u: {
      let wood = weatheredWood(coordinates, footprint, baseColor, carving, variant);
      surface.albedo = wood.albedo;
      surface.occlusion *= wood.cavity;
      // tilt the normal by the carved relief so it catches the low sun
      let across = normalize(vec3f(-geometricNormal.z, 0.0, geometricNormal.x) + vec3f(0.0001, 0.0, 0.0));
      let up = cross(geometricNormal, across);
      normal = normalize(geometricNormal + across * wood.bump.x + up * wood.bump.y);
    }
    case ${material.stone}u, ${material.carvedStone}u: {
      let stone = weatheredStone(coordinates, footprint, baseColor, weathering, materialId == ${material.stone}u);
      surface.albedo = stone.albedo;
      surface.occlusion *= stone.cavity;
    }
    case ${material.gilded}u, ${material.bronze}u: {
      let metal = gildedMetal(coordinates, baseColor, colorAndRoughness.a, weathering);
      surface.albedo = metal.albedo;
      surface.roughness = metal.roughness;
    }
    case ${material.roofTile}u: {
      let tiles = mossyRoofTiles(input.worldPosition, coordinates, geometricNormal, footprint, baseColor, weathering);
      surface.albedo = tiles.albedo;
      surface.occlusion *= tiles.cavity;
    }
    case ${material.plaster}u: {
      surface.albedo = patchedPlaster(coordinates, baseColor, weathering);
    }
    default: {}
  }

  let color = shadeSurface(surface, input.worldPosition, normal, geometricNormal);
  return toneMapToDisplay(applyHaze(color, input.worldPosition));
}

// Depth only, for the shadow and sky occlusion maps: frame.viewProjection holds the map's matrix there.
@vertex fn architectureDepthVertex(@location(0) position: vec3f) -> @builtin(position) vec4f {
  return frame.viewProjection * vec4f(position, 1.0);
}
`;
