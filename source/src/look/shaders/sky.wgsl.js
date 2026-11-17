// WGSL for the sky behind everything: one full-screen triangle that looks up the sky colour along each
// pixel's view ray, with soft clouds lit from below by the low sun, the green hills of the valley rim, and to
// the north the snow peaks of the Himalaya catching the last pink-gold light. Depends on frameUniforms.wgsl.js
// and noise.wgsl.js.

import { frameUniformsWgsl } from './frameUniforms.wgsl.js';
import { noiseWgsl } from './noise.wgsl.js';

export const skyWgsl = frameUniformsWgsl + noiseWgsl + /* wgsl */ `
const valleyRimHeight = 0.035; // the hills around the valley, as a share of the way up the sky
const valleyRimColor = vec3f(0.42, 0.36, 0.3);
const snowRangeHalfWidth = 0.9; // radians either side of north the snow range spans
const snowRangeHeight = 0.075; // its highest summits
const snowLitColor = vec3f(1.9, 1.15, 0.85); // snow in the low sun: pink-gold
const snowShadeColor = vec3f(0.55, 0.55, 0.7); // snow facing away from the sun: cool blue-grey
const rockColor = vec3f(0.35, 0.3, 0.3);
const cloudScale = vec2f(2.2, 9.0); // clouds: wide and flat
const cloudCover = 0.62; // higher means fewer clouds
const cloudBand = vec2f(0.04, 0.32); // how far up the sky the clouds float

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

// Height of the snow range (in sky units) at an angle from north: ridged noise for jagged summits, falling away
// toward both ends of the range.
fn snowRangeHeightAt(fromNorth: f32) -> f32 {
  let ridges = 1.0 - abs(valueNoise2D(vec2f(fromNorth * 9.0, 3.0)) * 2.0 - 1.0);
  let peaks = 0.55 * ridges + 0.45 * valueNoise2D(vec2f(fromNorth * 23.0, 7.0));
  return snowRangeHeight * peaks * (1.0 - smoothstep(snowRangeHalfWidth * 0.6, snowRangeHalfWidth, abs(fromNorth)));
}

@fragment fn skyFragment(input: SkyVaryings) -> @location(0) vec4f {
  let farPoint = frame.inverseViewProjection * vec4f(input.screenPoint, 0.5, 1.0);
  let direction = normalize(farPoint.xyz / farPoint.w - frame.cameraPositionAndTime.xyz);
  var color = skyRadiance(direction);
  let compass = atan2(direction.x, -direction.z); // 0 looking north, positive toward east
  let towardSun = max(dot(direction, frame.sunDirection.xyz), 0.0);

  // clouds: soft, flat and few, glowing warm on the sun's side and grey-violet on the other
  let cloudPoint = vec2f(compass, direction.y) * cloudScale + vec2f(frame.cameraPositionAndTime.w * 0.004, 0.0);
  let cloudDensity = smoothstep(cloudCover, 0.9, fractalNoise2D(cloudPoint)) * smoothstep(cloudBand.x, cloudBand.x + 0.06, direction.y) * (1.0 - smoothstep(cloudBand.y - 0.1, cloudBand.y, direction.y));
  let cloudColor = mix(vec3f(0.6, 0.55, 0.62), frame.sunColor.rgb * 0.55, 0.35 + 0.65 * pow(towardSun, 3.0));
  color = mix(color, cloudColor, cloudDensity * 0.85);

  // the snow range to the north, half lost in the haze at its foot
  let snowTop = snowRangeHeightAt(compass);
  if (direction.y < valleyRimHeight + snowTop && snowTop > 0.002) {
    let height = (direction.y - valleyRimHeight) / max(snowTop, 0.001);
    let snowLine = smoothstep(0.25, 0.55, height + 0.15 * valueNoise2D(vec2f(compass * 60.0, direction.y * 200.0)));
    let sunSide = 0.5 + 0.5 * sin(compass * 40.0 + valueNoise2D(vec2f(compass * 15.0, 1.0)) * 6.0); // gullies and faces
    let snow = mix(snowShadeColor, snowLitColor, sunSide);
    let mountain = mix(rockColor, snow, snowLine);
    color = mix(mountain, frame.hazeColorAndDensity.rgb * 0.9, 0.55 - 0.3 * height);
  }
  // the valley rim's hills in front of everything
  let hillHeight = valleyRimHeight + 0.02 * sin(compass * 3.0) + 0.01 * sin(compass * 11.0);
  if (direction.y < hillHeight) {
    color = mix(valleyRimColor, frame.hazeColorAndDensity.rgb * 0.75, 0.65);
  }
  return toneMapToDisplay(color);
}
`;
