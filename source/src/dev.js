// Development tools, only in dev.html (npm run build:dev); the release build drops all of this.
//   F  walks the camera along the scripted 60 s path through the whole square
//   B  runs the same path as a benchmark and reports frame and GPU times (average, 99th percentile, worst)
// Depends on math.js; drives camera.js and reads renderer.js timings.

import { mix, clamp } from './core/math.js';

const walkThroughSeconds = 60;
const maximumLoggedFrames = 1 << 14;

// The scripted walk: points on the ground (x, z) and the compass direction to look, south to north and back
// along the palace front, through Sundari Chowk's gate.
const walkThroughPath = [
  [5, 34, 350], [3, 26, 330], [8, 16, 300], [10, 4, 270], [9, -8, 300], [10, -22, 285],
  [11, -36, 260], [10, -50, 240], [9, -64, 200], [12, -78, 120], [14, -60, 150], [13, -40, 140],
  [13, -20, 120], [12, 0, 110], [14, 11, 90], [22, 11, 90], [31, 14, 20], [31, 18, 300],
];

// Catmull-Rom spline through the path's points: `component` 0 x, 1 z, 2 look direction.
function pathValueAt(progress, component) {
  const segmentCount = walkThroughPath.length - 1;
  const position = clamp(progress, 0, 1) * segmentCount;
  const segment = Math.min(Math.floor(position), segmentCount - 1), t = position - segment;
  const point = (index) => walkThroughPath[clamp(index, 0, segmentCount)][component];
  const before = point(segment - 1), start = point(segment), end = point(segment + 1), after = point(segment + 2);
  return 0.5 * (2 * start + (end - before) * t + (2 * before - 5 * start + 4 * end - after) * t * t + (3 * start - before - 3 * end + after) * t * t * t);
}

function summarize(values, count) {
  const sorted = Array.from(values.subarray(0, count)).sort((a, b) => a - b);
  const average = sorted.reduce((sum, value) => sum + value, 0) / count;
  const format = (value) => value.toFixed(2);
  return `average ${format(average)}  p99 ${format(sorted[Math.min(count - 1, Math.floor(count * 0.99))])}  worst ${format(sorted[count - 1])} ms`;
}

export function startDevTools({ camera, renderer, statsLine, getQualityName }) {
  if (DEV_BUILD) {
    const frameLog = new Float32Array(maximumLoggedFrames), gpuLog = new Float32Array(maximumLoggedFrames);
    let isFlying = false, isBenchmark = false, pathSeconds = 0, frameCount = 0, gpuCount = 0;

    const stop = () => {
      isFlying = false;
      if (!isBenchmark) return;
      isBenchmark = false;
      statsLine.textContent = `Walk-through ${renderer.width}x${renderer.height}, ${getQualityName()}, ${frameCount} frames\n`
        + `frame  ${summarize(frameLog, frameCount)}\n`
        + `GPU    ${gpuCount ? summarize(gpuLog, gpuCount) : 'timestamp queries unavailable'}`;
    };

    addEventListener('keydown', (event) => {
      if (event.repeat || (event.code !== 'KeyF' && event.code !== 'KeyB')) return;
      if (isFlying) return stop();
      isFlying = true;
      isBenchmark = event.code === 'KeyB';
      pathSeconds = frameCount = gpuCount = 0;
      if (isBenchmark) {
        // the benchmark measures at the full resolution of the preset
        renderer.renderScale = 1;
        renderer.resize();
        statsLine.textContent = 'Benchmark running…';
      }
    });

    return {
      isFlying: () => isFlying,
      isBenchmarking: () => isBenchmark,
      update(secondsElapsed, frameMilliseconds) {
        if (!isFlying) return;
        pathSeconds += secondsElapsed;
        const progress = pathSeconds / walkThroughSeconds;
        // the look direction is eased a little ahead along the path, so turns start before the corner
        camera.standAt(pathValueAt(progress, 0), pathValueAt(progress, 1), pathValueAt(progress + 0.004, 2), mix(4, 8, Math.sin(progress * 9) * 0.5 + 0.5));
        if (isBenchmark && frameCount < maximumLoggedFrames) {
          frameLog[frameCount++] = frameMilliseconds;
          if (renderer.gpuMilliseconds > 0) gpuLog[gpuCount++] = renderer.gpuMilliseconds;
        }
        if (progress >= 1) stop();
      },
    };
  }
  return null;
}
