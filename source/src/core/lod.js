// Distance levels of detail. The world is split into chunks (one per monument or house); every part inside a
// chunk is tagged with the levels it belongs to (near, middle, far). Each frame this file skips chunks outside
// the view, picks each chunk's level from its distance, and cross-fades between two levels over a short band
// with a dither pattern, so nothing pops. Lower quality presets pull the switching distances closer.
// Depends on nothing; meshBuilder.js tags the parts, renderer.js draws the list made here.

// Which levels a part is drawn at. Within a chunk the vertices are sorted in this order, so each level is one
// contiguous run: near = groups 0-2, middle = groups 1-3, far = groups 2-4.
export const detailGroup = {
  nearOnly: 0, // the finest carving: strut figures, bells, rafters
  nearAndMiddle: 1, // frames, statues, shutters: gone only far away
  allLevels: 2, // walls, roofs, plinths: always there
  middleAndFar: 3, // stand-ins for near-only carving (a plain strut board)
  farOnly: 4, // stand-ins seen only from far away
};
export const detailGroupCount = 5;

// Easy tweak: where each preset switches, in metres from the camera to the nearest point of a chunk.
const lodSwitchDistances = {
  high: { nearToMiddle: 34, middleToFar: 80 },
  medium: { nearToMiddle: 32, middleToFar: 70 },
  low: { nearToMiddle: 14, middleToFar: 34 },
};
const crossFadeBandMetres = 5;

const levelsPerChunk = 3; // near, middle, far

// chunks: Float32Array of [centreX, centreY, centreZ, radius] per chunk.
// levelRanges: Uint32Array of [first vertex, vertex count] for near, middle and far, per chunk.
// fixedLevel: always draw this level (the water reflection draws everything far).
export function createDetailSelector({ chunkBounds, levelRanges, quality, fixedLevel = -1 }) {
  const chunkCount = chunkBounds.length / 4;
  const switchDistances = lodSwitchDistances[quality.name];
  const frustumPlanes = new Float32Array(16);
  const chunkDistances = new Float32Array(chunkCount);
  const visibleOrder = new Uint32Array(chunkCount);
  // two draw lists of [first vertex, vertex count, fade slot]: whole chunks, and chunks half way through a
  // cross-fade (drawn with the dithering pipeline); at most two levels per chunk
  const solidDraws = new Uint32Array(chunkCount * 2 * 3), fadingDraws = new Uint32Array(chunkCount * 2 * 3);
  // fade per slot (chunk * 3 + level): >= 0 keep pixels whose dither value is below it, < 0 keep those above
  const fades = new Float32Array(chunkCount * levelsPerChunk);
  const selector = { solidDraws, solidDrawCount: 0, fadingDraws, fadingDrawCount: 0, fades };

  // The four side planes of the view (near and far are not needed: the far plane is at infinity).
  const extractFrustumPlanes = (viewProjection) => {
    for (let plane = 0; plane < 4; plane++) {
      const row = plane >> 1, sign = plane & 1 ? -1 : 1;
      let length = 0;
      for (let axis = 0; axis < 4; axis++) {
        const value = viewProjection[axis * 4 + 3] + sign * viewProjection[axis * 4 + row];
        frustumPlanes[plane * 4 + axis] = value;
        if (axis < 3) length += value * value;
      }
      length = Math.sqrt(length);
      for (let axis = 0; axis < 4; axis++) frustumPlanes[plane * 4 + axis] /= length;
    }
  };

  const isOutsideView = (x, y, z, radius) => {
    for (let plane = 0; plane < 4; plane++) {
      const offset = plane * 4;
      if (frustumPlanes[offset] * x + frustumPlanes[offset + 1] * y + frustumPlanes[offset + 2] * z + frustumPlanes[offset + 3] < -radius) return true;
    }
    return false;
  };

  const addDraw = (chunk, level, fade) => {
    const count = levelRanges[chunk * 6 + level * 2 + 1];
    if (!count) return;
    const isFading = fade !== 1;
    const list = isFading ? fadingDraws : solidDraws;
    const entry = (isFading ? selector.fadingDrawCount++ : selector.solidDrawCount++) * 3;
    list[entry] = levelRanges[chunk * 6 + level * 2];
    list[entry + 1] = count;
    list[entry + 2] = chunk * levelsPerChunk + level;
    fades[chunk * levelsPerChunk + level] = fade;
  };

  // Called once per frame, before drawing.
  selector.update = (eyePosition, viewProjection) => {
    extractFrustumPlanes(viewProjection);
    let visibleCount = 0;
    for (let chunk = 0; chunk < chunkCount; chunk++) {
      const offset = chunk * 4, radius = chunkBounds[offset + 3];
      const x = chunkBounds[offset], y = chunkBounds[offset + 1], z = chunkBounds[offset + 2];
      if (isOutsideView(x, y, z, radius)) continue;
      const distance = Math.hypot(x - eyePosition[0], y - eyePosition[1], z - eyePosition[2]) - radius;
      chunkDistances[chunk] = distance > 0 ? distance : 0;
      // insertion sort, nearest first: drawing near to far lets the depth test skip hidden pixels
      let slot = visibleCount++;
      while (slot > 0 && chunkDistances[visibleOrder[slot - 1]] > chunkDistances[chunk]) {
        visibleOrder[slot] = visibleOrder[slot - 1];
        slot--;
      }
      visibleOrder[slot] = chunk;
    }
    selector.solidDrawCount = selector.fadingDrawCount = 0;
    for (let index = 0; index < visibleCount; index++) {
      const chunk = visibleOrder[index], distance = chunkDistances[chunk];
      if (fixedLevel >= 0) {
        addDraw(chunk, fixedLevel, 1);
        continue;
      }
      const towardMiddle = Math.min(Math.max((distance - switchDistances.nearToMiddle) / crossFadeBandMetres, 0), 1);
      const towardFar = Math.min(Math.max((distance - switchDistances.middleToFar) / crossFadeBandMetres, 0), 1);
      if (towardMiddle < 1) addDraw(chunk, 0, towardMiddle > 0 ? -towardMiddle : 1);
      if (towardMiddle > 0 && towardFar < 1) addDraw(chunk, 1, towardMiddle < 1 ? towardMiddle : towardFar > 0 ? -towardFar : 1);
      if (towardFar > 0) addDraw(chunk, 2, towardFar < 1 ? towardFar : 1);
    }
  };
  // Is a sphere inside the view of the last update? (the water asks, to skip its reflection)
  selector.isSphereVisible = (x, y, z, radius) => !isOutsideView(x, y, z, radius);
  return selector;
}
