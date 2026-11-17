// WGSL lighting shared by every lit surface: the sun with its soft shadow map, sky light dimmed under eaves
// (read from a top-down height map of the square), warm bounce light from the bricks, a sun highlight and
// sky reflections for metal. Both maps are drawn once at load, because the sun never moves.
// Depends on frameUniforms.wgsl.js (also binds the shadow and sky occlusion maps here).

export const lightingWgsl = /* wgsl */ `
@group(0) @binding(1) var sunShadowMap: texture_depth_2d;
@group(0) @binding(2) var shadowComparison: sampler_comparison;
@group(0) @binding(3) var skyOcclusionMap: texture_depth_2d;

const shadowSoftnessTexels = 1.5;
const skyOcclusionReachMetres = 1.2; // how far around a point we look for roofs overhead

// Sun visibility from the shadow map, 3 x 3 filtered taps for a soft edge.
fn sunVisibility(worldPosition: vec3f, normal: vec3f) -> f32 {
  let lifted = worldPosition + normal * 0.04;
  let shadowPoint = frame.sunShadowMatrix * vec4f(lifted, 1.0);
  let mapUv = shadowPoint.xy * vec2f(0.5, -0.5) + 0.5;
  let texelSize = 1.0 / f32(textureDimensions(sunShadowMap).x);
  var visible = 0.0;
  for (var tapY = -1; tapY <= 1; tapY++) {
    for (var tapX = -1; tapX <= 1; tapX++) {
      let offset = vec2f(f32(tapX), f32(tapY)) * texelSize * shadowSoftnessTexels;
      visible += textureSampleCompareLevel(sunShadowMap, shadowComparison, mapUv + offset, shadowPoint.z - 0.0015);
    }
  }
  return visible / 9.0;
}

// How much open sky a point sees: four taps of the top-down height map around it, pushed out along the
// normal so walls look past themselves. Under eaves and inside arcades this falls toward zero.
fn skyVisibility(worldPosition: vec3f, normal: vec3f) -> f32 {
  let probe = worldPosition + normal * 0.45 + vec3f(0.0, 0.05, 0.0);
  var open = 0.0;
  for (var tap = 0; tap < 4; tap++) {
    let angle = f32(tap) * 1.5708 + 0.6;
    let samplePoint = probe + vec3f(cos(angle), 0.0, sin(angle)) * skyOcclusionReachMetres * 0.5;
    let mapPoint = frame.skyOcclusionMatrix * vec4f(samplePoint, 1.0);
    open += textureSampleCompareLevel(skyOcclusionMap, shadowComparison, mapPoint.xy * vec2f(0.5, -0.5) + 0.5, mapPoint.z);
  }
  return mix(0.18, 1.0, open / 4.0);
}

struct SurfaceLook {
  albedo: vec3f,
  roughness: f32,
  metalness: f32,
  occlusion: f32, // baked and carved occlusion together
}

fn shadeSurface(surface: SurfaceLook, worldPosition: vec3f, normal: vec3f, geometricNormal: vec3f) -> vec3f {
  let toCamera = normalize(frame.cameraPositionAndTime.xyz - worldPosition);
  let sunDirection = frame.sunDirection.xyz;
  let sunVisible = sunVisibility(worldPosition, geometricNormal);
  let skyVisible = skyVisibility(worldPosition, geometricNormal) * surface.occlusion;
  let facingSun = max(dot(normal, sunDirection), 0.0);

  // diffuse: sun, sky dome, and warm light thrown back up by the sunlit bricks
  let skyDome = mix(frame.skyHorizonColor.rgb * 0.6, mix(frame.skyZenithColor.rgb, frame.skyHorizonColor.rgb, 0.35) * 1.2, normal.y * 0.5 + 0.5);
  let bounce = frame.groundBounceColor.rgb * (0.6 - 0.4 * normal.y);
  let diffuseLight = frame.sunColor.rgb * facingSun * sunVisible + (skyDome + bounce) * skyVisible;
  let diffuse = surface.albedo * (1.0 - surface.metalness) * diffuseLight;

  // specular: a normalised Blinn-Phong sun highlight and, for metal, the sky reflected
  let halfway = normalize(sunDirection + toCamera);
  // at least 1: pow(0, 0) is undefined in WGSL and turns fully rough surfaces black
  let shininess = max(2.0 / max(surface.roughness * surface.roughness * surface.roughness * surface.roughness, 0.002) - 2.0, 1.0);
  let reflectance = mix(vec3f(0.04), surface.albedo, surface.metalness);
  let viewFacing = max(dot(normal, toCamera), 0.0);
  let fresnel = reflectance + (1.0 - reflectance) * pow(1.0 - viewFacing, 5.0) * (1.0 - surface.roughness);
  let highlight = pow(max(dot(normal, halfway), 0.0), shininess) * (shininess + 8.0) / 25.0;
  let sunSpecular = frame.sunColor.rgb * fresnel * highlight * facingSun * sunVisible;
  let reflected = reflect(-toCamera, normal);
  // rough stone and brick barely mirror the sky; polished metal does fully
  let smoothness = 1.0 - surface.roughness;
  let skyReflection = skyRadiance(reflected) * fresnel * skyVisible * mix(smoothness * smoothness * 0.5, 1.0, surface.metalness);
  return diffuse + sunSpecular + skyReflection;
}
`;
