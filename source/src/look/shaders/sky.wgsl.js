// WGSL for the sky behind everything: one full-screen triangle that looks up the sky colour along each
// pixel's view ray. Depends on frameUniforms.wgsl.js.

import { frameUniformsWgsl } from './frameUniforms.wgsl.js';

export const skyWgsl = frameUniformsWgsl + /* wgsl */ `
struct SkyVaryings {
  @builtin(position) clipPosition: vec4f,
  @location(0) screenPoint: vec2f,
}

@vertex fn skyVertex(@builtin(vertex_index) vertexIndex: u32) -> SkyVaryings {
  let corner = vec2f(f32((vertexIndex << 1u) & 2u), f32(vertexIndex & 2u)) * 2.0 - 1.0;
  var output: SkyVaryings;
  output.clipPosition = vec4f(corner, 0.0, 1.0);
  output.screenPoint = corner;
  return output;
}

@fragment fn skyFragment(input: SkyVaryings) -> @location(0) vec4f {
  let farPoint = frame.inverseViewProjection * vec4f(input.screenPoint, 0.5, 1.0);
  let direction = normalize(farPoint.xyz / farPoint.w - frame.cameraPositionAndTime.xyz);
  var color = skyRadiance(direction);
  // the far hills of the valley rim, lost in haze
  let hillHeight = 0.035 + 0.02 * sin(atan2(direction.x, direction.z) * 3.0) + 0.01 * sin(atan2(direction.x, direction.z) * 11.0);
  if (direction.y < hillHeight) {
    color = mix(color, frame.hazeColorAndDensity.rgb * 0.75, 0.6);
  }
  return toneMapToDisplay(color);
}
`;
