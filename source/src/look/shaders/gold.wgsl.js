// WGSL for gilded copper and bronze: bright where the gilding survives, brown-green tarnish in patches and
// recesses, a little hammered roughness. The glow itself comes from the sun and sky reflections in
// lighting.wgsl.js. Depends on noise.wgsl.js.

export const goldWgsl = /* wgsl */ `
struct MetalSample {
  albedo: vec3f,
  roughness: f32,
}

fn gildedMetal(coordinates: vec2f, baseColor: vec3f, roughness: f32, weathering: f32) -> MetalSample {
  let tarnish = smoothstep(0.45, 0.8, fractalNoise2D(coordinates * 3.0)) * weathering;
  var output: MetalSample;
  output.albedo = mix(baseColor, vec3f(0.18, 0.15, 0.08), tarnish);
  output.roughness = mix(roughness, 0.75, tarnish) + 0.08 * valueNoise2D(coordinates * 40.0);
  return output;
}
`;
