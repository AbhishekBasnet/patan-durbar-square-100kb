// WGSL for gilded copper and bronze: bright where the gilding survives, brown-green tarnish in patches and
// recesses, a little hammered roughness. The glow itself comes from the sun and sky reflections in
// lighting.wgsl.js. Depends on noise.wgsl.js.

export const goldWgsl = /* wgsl */ `
const tarnishScale = 3.0; // patches per metre
const tarnishedRoughness = 0.75;
const hammeredRoughness = 0.08; // the small dents of beaten copper
const hammerMarkScale = 40.0;

struct MetalSample {
  albedo: vec3f,
  roughness: f32,
}

fn gildedMetal(coordinates: vec2f, baseColor: vec3f, roughness: f32, weathering: f32) -> MetalSample {
  let tarnish = smoothstep(0.45, 0.8, fractalNoise2D(coordinates * tarnishScale)) * weathering;
  var output: MetalSample;
  output.albedo = mix(baseColor, vec3f(0.18, 0.15, 0.08), tarnish);
  output.roughness = mix(roughness, tarnishedRoughness, tarnish) + hammeredRoughness * valueNoise2D(coordinates * hammerMarkScale);
  return output;
}
`;
