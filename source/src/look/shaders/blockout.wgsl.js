// TEMPORARY (step 1): WGSL for the plain massing blocks. Each instance stretches, tapers and turns the unit
// prism; faces are lit by the sun, the sky and the warm bounce from the bricks, then hazed.
// Replaced by the material shaders in step 2. Depends on frameUniforms.wgsl.js.

import { frameUniformsWgsl } from './frameUniforms.wgsl.js';

export const blockoutWgsl = frameUniformsWgsl + /* wgsl */ `
struct BlockVaryings {
  @builtin(position) clipPosition: vec4f,
  @location(0) worldPosition: vec3f,
  @location(1) baseColor: vec3f,
}

@vertex fn blockVertex(
  @location(0) unitCorner: vec3f,
  @location(1) positionAndRotation: vec4f,
  @location(2) halfSizesAndTaper: vec4f, // half size along the front, height, half size across, top scale along
  @location(3) taperAndColor: vec4f, // top scale across, red, green, blue
) -> BlockVaryings {
  let taper = mix(vec2f(1.0), vec2f(halfSizesAndTaper.w, taperAndColor.x), unitCorner.y);
  let localPoint = vec3f(unitCorner.x * halfSizesAndTaper.x * taper.x, unitCorner.y * halfSizesAndTaper.y, unitCorner.z * halfSizesAndTaper.z * taper.y);
  let cosine = cos(positionAndRotation.w);
  let sine = sin(positionAndRotation.w);
  let worldPosition = positionAndRotation.xyz + vec3f(localPoint.x * cosine - localPoint.z * sine, localPoint.y, localPoint.x * sine + localPoint.z * cosine);
  var output: BlockVaryings;
  output.clipPosition = frame.viewProjection * vec4f(worldPosition, 1.0);
  output.worldPosition = worldPosition;
  output.baseColor = taperAndColor.yzw;
  return output;
}

@fragment fn blockFragment(input: BlockVaryings) -> @location(0) vec4f {
  // flat face normal from the screen-space slope of the position, turned toward the camera
  var normal = normalize(cross(dpdx(input.worldPosition), dpdy(input.worldPosition)));
  let toCamera = frame.cameraPositionAndTime.xyz - input.worldPosition;
  if (dot(normal, toCamera) < 0.0) { normal = -normal; }

  var baseColor = input.baseColor;
  // a faint 1 m grid on the ground, to judge distances while walking the blockout
  if (normal.y > 0.9 && input.worldPosition.y < 0.01) {
    let grid = abs(fract(input.worldPosition.xz + 0.5) - 0.5);
    let gridLine = 1.0 - smoothstep(0.0, 0.03, min(grid.x, grid.y));
    baseColor *= 1.0 - 0.25 * gridLine;
  }

  let sunlight = frame.sunColor.rgb * max(dot(normal, frame.sunDirection.xyz), 0.0);
  let skyLight = mix(frame.groundBounceColor.rgb, frame.skyZenithColor.rgb * 1.6, normal.y * 0.5 + 0.5);
  let lit = baseColor * (sunlight + skyLight);
  return toneMapToDisplay(applyHaze(lit, input.worldPosition));
}
`;
