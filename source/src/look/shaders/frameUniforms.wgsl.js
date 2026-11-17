// WGSL shared by every scene shader: the per-frame uniforms (camera, sun, sky, haze, light maps) and the final
// colour steps (haze, tone mapping). The float layout must match renderer.js and lighting.js.
// Depends on nothing.

export const frameUniformsWgsl = /* wgsl */ `
struct FrameUniforms {
  viewProjection: mat4x4f,
  inverseViewProjection: mat4x4f,
  cameraPositionAndTime: vec4f,
  sunDirection: vec4f,
  sunColor: vec4f,
  skyZenithColor: vec4f,
  skyHorizonColor: vec4f,
  groundBounceColor: vec4f,
  hazeColorAndDensity: vec4f,
  screenSize: vec4f, // width, height, 1 / width, 1 / height
  sunShadowMatrix: mat4x4f, // world to the sun's shadow map
  skyOcclusionMatrix: mat4x4f, // world to the top-down height map
}
@group(0) @binding(0) var<uniform> frame: FrameUniforms;

// Sky colour seen along a view direction: blue overhead, warm toward the horizon, a glow around the sun.
fn skyRadiance(direction: vec3f) -> vec3f {
  let height = clamp(direction.y, -0.2, 1.0);
  let towardSun = max(dot(direction, frame.sunDirection.xyz), 0.0);
  var color = mix(frame.skyHorizonColor.rgb, frame.skyZenithColor.rgb, pow(max(height, 0.0), 0.55));
  color += frame.sunColor.rgb * (0.12 * pow(towardSun, 6.0) + 0.5 * pow(towardSun, 60.0));
  return color;
}

// Distance haze: the smoky late-afternoon air, lit by the sun from behind when you look toward it.
fn applyHaze(color: vec3f, worldPosition: vec3f) -> vec3f {
  let toPoint = worldPosition - frame.cameraPositionAndTime.xyz;
  let pointDistance = length(toPoint);
  let transmittance = exp(-pointDistance * frame.hazeColorAndDensity.w);
  let sunGlow = pow(max(dot(toPoint / pointDistance, frame.sunDirection.xyz), 0.0), 8.0);
  let haze = frame.hazeColorAndDensity.rgb * (0.8 + 0.6 * sunGlow);
  return mix(haze, color, transmittance);
}

// Filmic tone curve (ACES fit) and sRGB encoding for the canvas.
fn toneMapToDisplay(color: vec3f) -> vec4f {
  let exposed = color * 0.8;
  let mapped = clamp((exposed * (2.51 * exposed + 0.03)) / (exposed * (2.43 * exposed + 0.59) + 0.14), vec3f(0.0), vec3f(1.0));
  return vec4f(pow(mapped, vec3f(1.0 / 2.2)), 1.0);
}
`;
