// WGSL for grey stone: ashlar courses of uneven length, lichen and soot stains, and the dark streaks that
// rain leaves running down from every ledge. Depends on noise.wgsl.js.

export const stoneWgsl = /* wgsl */ `
const stoneCourseHeight = 0.32; // metres
const rainStreakScale = vec2f(3.0, 0.5); // streaks: narrow across, long down the wall
const lichenScale = 1.7; // patches per metre

struct StoneSample {
  albedo: vec3f,
  cavity: f32,
}

// hasJoints: false for statues and carvings, which are cut from one block.
fn weatheredStone(coordinates: vec2f, footprint: f32, baseColor: vec3f, weathering: f32, hasJoints: bool) -> StoneSample {
  let course = floor(coordinates.y / stoneCourseHeight);
  let blockLength = mix(0.5, 1.1, hashOf2D(vec2f(course, 3.0)));
  let blockCoordinate = vec2f(coordinates.x / blockLength + hashOf2D(vec2f(course, 7.0)), coordinates.y / stoneCourseHeight);
  let inside = fract(blockCoordinate);
  let edge = min(min(inside.x, 1.0 - inside.x) * blockLength, min(inside.y, 1.0 - inside.y) * stoneCourseHeight);
  let detail = 1.0 - smoothstep(0.008, 0.03, footprint);
  let joint = (1.0 - smoothstep(0.004, 0.012, edge)) * detail * select(0.0, 1.0, hasJoints);
  let blockTone = mix(0.85, 1.12, hashOf2D(floor(blockCoordinate)));
  let lichen = smoothstep(0.55, 0.85, fractalNoise2D(coordinates * lichenScale));
  let streaks = valueNoise2D(coordinates * rainStreakScale);
  var output: StoneSample;
  output.albedo = baseColor * mix(1.0, blockTone, detail * select(0.0, 1.0, hasJoints));
  output.albedo = mix(output.albedo, vec3f(0.22, 0.24, 0.17), lichen * 0.45 * weathering);
  output.albedo *= mix(1.0, 0.75 + 0.25 * streaks, weathering * 0.6);
  output.cavity = 1.0 - 0.5 * joint;
  return output;
}
`;
