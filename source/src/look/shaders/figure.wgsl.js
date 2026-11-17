// WGSL for the pigeons (animals.js builds the mesh): the vertex stage poses the head and wings about their
// pivots (pecking or flying); the fragment stage colours the bird from its instance and lights it like the
// buildings. Also each pigeon's long golden-hour shadow on the paving, cast only when it stands in sunlight,
// and a soft contact shadow under it.
// Depends on frameUniforms and lighting WGSL, and figures.js (part pivots).

import { frameUniformsWgsl } from './frameUniforms.wgsl.js';
import { lightingWgsl } from './lighting.wgsl.js';
import { packPartPivots, bodyPart, colorSlot, pose } from '../../life/figures.js';

const pivotTable = packPartPivots();
const pivotConstants = Array.from({ length: pivotTable.length / 4 }, (_, index) => 'vec4f(' + pivotTable.slice(index * 4, index * 4 + 4).map((value) => +value.toFixed(3)).join(',') + ')').join(',');
// how tall and wide a pigeon is, for its ground shadow: [height, width]
const shadowSizes = [[0.2, 0.18]]; // a pigeon
// (built here, not inside the WGSL: the build cannot see through a template literal nested in a WGSL one)
const shadowSizeConstants = shadowSizes.map(([height, width]) => 'vec2f(' + height + ',' + width + ')').join(',');

export const figureWgsl = frameUniformsWgsl + lightingWgsl + /* wgsl */ `
const partPivots = array<vec4f, ${pivotTable.length / 4}>(${pivotConstants});
const shadowSizes = array<vec2f, ${shadowSizes.length}>(${shadowSizeConstants});
const beakColor = vec3f(0.04, 0.04, 0.045);

struct FigureInstance {
  @location(3) positionAndFacing: vec4f,
  @location(4) poseAndMotion: vec4f, // pose, phase, scale, 0
  @location(5) accessories: u32,
  @location(6) bodyColor: vec4f,
  @location(7) legColor: vec4f,
  @location(8) wingColor: vec4f,
}

struct FigureVaryings {
  @builtin(position) clipPosition: vec4f,
  @location(0) worldPosition: vec3f,
  @location(1) normalAndOcclusion: vec4f,
  @location(2) @interpolate(flat) color: vec3f,
}

// Turns point p about a pivot in the x-y plane (the head: +x toward +y) or, for wings,
// in the y-z plane.
fn turnAboutPivot(point: vec3f, pivot: vec2f, angle: f32, isWing: bool) -> vec3f {
  let cosine = cos(angle);
  let sine = sin(angle);
  if (isWing) {
    let relative = point.yz - vec2f(pivot.y, 0.0);
    return vec3f(point.x, pivot.y + relative.x * cosine - relative.y * sine, relative.x * sine + relative.y * cosine);
  }
  let relative = point.xy - pivot;
  return vec3f(pivot.x + relative.x * cosine - relative.y * sine, pivot.y + relative.x * sine + relative.y * cosine, point.z);
}

// The angle the head or a wing takes: wings beat in flight, the head pecks on the ground.
fn partAngle(part: u32, figurePose: u32, phase: f32, pivot: vec4f) -> f32 {
  if (figurePose == ${pose.fly}u) {
    if (part == ${bodyPart.leftWing}u) { return sin(phase) * pivot.z; }
    if (part == ${bodyPart.rightWing}u) { return -sin(phase) * pivot.z; }
    return 0.0;
  }
  if (part == ${bodyPart.head}u) { return -max(sin(phase), 0.0) * pivot.z; }
  return 0.0;
}

fn placeInWorld(local: vec3f, instance: FigureInstance) -> vec3f {
  let cosine = cos(instance.positionAndFacing.w);
  let sine = sin(instance.positionAndFacing.w);
  return instance.positionAndFacing.xyz + vec3f(local.x * cosine - local.z * sine, local.y, local.x * sine + local.z * cosine);
}

@vertex fn figureVertex(
  @location(0) position: vec3f,
  @location(1) normalAndOcclusion: vec4f,
  @location(2) materialData: vec4u, // colour slot, variant, body part, accessory
  instance: FigureInstance,
) -> FigureVaryings {
  var output: FigureVaryings;
  let accessoryId = materialData.w;
  // a part this bird is not showing (folded or spread wings) collapses to a point, which draws nothing
  if (accessoryId > 0u && (instance.accessories & (1u << accessoryId)) == 0u) {
    output.clipPosition = vec4f(0.0, 0.0, 0.0, 1.0);
    return output;
  }
  let figurePose = u32(instance.poseAndMotion.x);
  let phase = instance.poseAndMotion.y;
  let scale = instance.poseAndMotion.z;
  let part = materialData.z;
  let pivot = partPivots[part]; // the pigeon is the only kind: its pivots come first
  var local = position;
  var normal = normalAndOcclusion.xyz;
  if (part != ${bodyPart.fixed}u) {
    let angle = partAngle(part, figurePose, phase, pivot);
    let isWing = part == ${bodyPart.leftWing}u || part == ${bodyPart.rightWing}u;
    local = turnAboutPivot(local, pivot.xy, angle, isWing);
    normal = turnAboutPivot(normal, vec2f(0.0), angle, isWing);
  }
  local = local * scale;
  let worldPosition = placeInWorld(local, instance);
  output.worldPosition = worldPosition;
  output.clipPosition = frame.viewProjection * vec4f(worldPosition, 1.0);
  output.normalAndOcclusion = vec4f(placeInWorld(normal, instance) - instance.positionAndFacing.xyz, normalAndOcclusion.w);
  let slot = materialData.x;
  var color = beakColor;
  if (slot == ${colorSlot.top}u) { color = instance.bodyColor.rgb; }
  if (slot == ${colorSlot.bottom}u) { color = instance.legColor.rgb; }
  if (slot == ${colorSlot.accent}u) { color = instance.wingColor.rgb; }
  output.color = color;
  return output;
}

@fragment fn figureFragment(input: FigureVaryings) -> @location(0) vec4f {
  let normal = normalize(input.normalAndOcclusion.xyz);
  var surface: SurfaceLook;
  // colours are given in display terms (faded film colours); light works in linear light
  surface.albedo = pow(input.color, vec3f(2.2)) * 0.9;
  surface.roughness = 0.85;
  surface.metalness = 0.0;
  surface.occlusion = input.normalAndOcclusion.w;
  return toneMapToDisplay(applyHaze(shadeSurface(surface, input.worldPosition, normal, normal), input.worldPosition));
}

// ---- ground shadows: a long soft strip away from the sun, and a round contact shadow under the feet
struct ShadowVaryings {
  @builtin(position) clipPosition: vec4f,
  @location(0) along: vec2f, // across the strip (-1..1), along it (0 at the feet, 1 at the far end)
  @location(1) @interpolate(flat) strength: f32,
  @location(2) @interpolate(flat) isContact: f32,
}

const sunShadowStrength = 0.42;
const contactShadowStrength = 0.38;
const longestShadowMetres = 9.0;

@vertex fn figureShadowVertex(@builtin(vertex_index) vertexIndex: u32, instance: FigureInstance) -> ShadowVaryings {
  var output: ShadowVaryings;
  let size = shadowSizes[0] * vec2f(instance.poseAndMotion.z);
  let corners = array<vec2f, 6>(vec2f(-1.0, 0.0), vec2f(1.0, 0.0), vec2f(1.0, 1.0), vec2f(-1.0, 0.0), vec2f(1.0, 1.0), vec2f(-1.0, 1.0));
  let corner = corners[vertexIndex % 6u];
  let isContact = vertexIndex >= 6u;
  let feet = instance.positionAndFacing.xyz;
  // flying birds cast nothing on the paving
  if (size.x <= 0.0 || feet.y > 1.5) {
    output.clipPosition = vec4f(0.0, 0.0, 0.0, 1.0);
    return output;
  }
  let awayFromSun = -normalize(frame.sunDirection.xz);
  let side = vec2f(-awayFromSun.y, awayFromSun.x);
  var ground: vec2f;
  if (isContact) {
    ground = feet.xz + (corner.x * side + (corner.y * 2.0 - 1.0) * awayFromSun) * size.y * 0.75;
    output.strength = contactShadowStrength;
  } else {
    let stripLength = min(size.x / tan(asin(frame.sunDirection.y)), longestShadowMetres);
    ground = feet.xz + side * corner.x * size.y * 0.5 + awayFromSun * (corner.y * stripLength - size.y * 0.2);
    // only birds standing in sunlight throw a shadow of their own
    output.strength = sunShadowStrength * sunVisibility(feet + vec3f(0.0, size.x * 0.6, 0.0), vec3f(0.0, 1.0, 0.0));
  }
  output.clipPosition = frame.viewProjection * vec4f(ground.x, feet.y + 0.012, ground.y, 1.0);
  output.along = vec2f(corner.x, corner.y);
  output.isContact = select(0.0, 1.0, isContact);
  return output;
}

@fragment fn figureShadowFragment(input: ShadowVaryings) -> @location(0) vec4f {
  var amount: f32;
  if (input.isContact > 0.5) {
    amount = 1.0 - smoothstep(0.3, 1.0, length(vec2f(input.along.x, input.along.y * 2.0 - 1.0)));
  } else {
    // soft at the edges, fading toward the far end like a real shadow under a low sun
    amount = (1.0 - smoothstep(0.4, 1.0, abs(input.along.x))) * (1.0 - smoothstep(0.3, 1.0, input.along.y));
  }
  return vec4f(0.0, 0.0, 0.0, amount * input.strength);
}
`;
