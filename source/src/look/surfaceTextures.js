// Paints the small repeating surface patterns once at load, in code (no image files): running-bond wall brick,
// herringbone paving, stone blocks and clay roof tiles, each a seamless tile with all its smaller mipmap levels.
// The GPU then filters them by distance and angle, so bricks still read as bricks across the square without
// shimmering. Channels: red = tone of the brick, block or tile (0.5 is average); green = joint (mortar, gap);
// blue = a random number per brick (for hue); alpha = cavity (1 on the face, darker in joints and under tiles).
// Depends on math.js.

import { createRandom } from '../core/math.js';

export const surfaceTextureSize = 512; // texels per side of every layer
export const surfaceLayer = { wallBrick: 0, herringbone: 1, stoneBlocks: 2, roofTiles: 3 };
// metres covered by one repeat of each layer, across and up (the shaders divide surface coordinates by these)
export const surfaceTileMetres = {
  wallBrick: [1.92, 1.984], // 8 bricks of 24 cm across, 32 courses of 6.2 cm up
  herringbone: [1.84, 1.84], // 16 brick widths of 11.5 cm, in the pattern's own diagonal frame
  stoneBlocks: [2.4, 1.92], // 6 courses of 32 cm
  roofTiles: [1.7, 1.7], // 10 tiles of 17 cm across, 20 rows of 8.5 cm
};
const wallBricksAcross = 8, wallCourses = 32, wallMortarShare = 0.12;
const herringboneUnits = 16, herringboneMortarShare = 0.08;
const stoneCourses = 6, stoneJointShare = 0.025;
const tilesAcross = 10, tileRows = 20;
const textureSeed = 1986;

// Writes one layer: `texel(u, v)` gets coordinates in 0..1 across the tile and returns [tone, joint, hue, cavity].
function paintLayer(texel) {
  const size = surfaceTextureSize, pixels = new Uint8Array(size * size * 4);
  for (let row = 0; row < size; row++) {
    for (let column = 0; column < size; column++) {
      const values = texel((column + 0.5) / size, (row + 0.5) / size), offset = (row * size + column) * 4;
      for (let channel = 0; channel < 4; channel++) pixels[offset + channel] = Math.round(Math.max(0, Math.min(1, values[channel])) * 255);
    }
  }
  return pixels;
}

// Distance (in units of the joint) from a point inside a cell of the given size to the cell's nearest edge.
const edgeDistance = (insideX, insideY, width, height) => Math.min(insideX, width - insideX, insideY, height - insideY);
const jointAmount = (distance, jointHalfWidth) => 1 - Math.min(1, Math.max(0, (distance - jointHalfWidth * 0.5) / jointHalfWidth));

function paintWallBrick(random) {
  const tones = Array.from({ length: wallBricksAcross * wallCourses }, () => [random(), random()]);
  return paintLayer((u, v) => {
    const course = Math.floor(v * wallCourses), shifted = u * wallBricksAcross + (course % 2) * 0.5;
    const brick = Math.floor(shifted) % wallBricksAcross, insideX = shifted - Math.floor(shifted), insideY = v * wallCourses - course;
    // the joint, measured in brick heights so it is as wide across as it is up
    const distance = edgeDistance(insideX * (24 / 6.2), insideY, 24 / 6.2, 1);
    const joint = jointAmount(distance, wallMortarShare);
    const [tone, hue] = tones[course * wallBricksAcross + brick];
    return [0.3 + tone * 0.4, joint, hue, 1 - joint * 0.45];
  });
}

// Herringbone of 1 x 2 bricks: cells sorted by (column - row) mod 4, as in the paving of the square.
function paintHerringbone(random) {
  const tones = Array.from({ length: herringboneUnits * herringboneUnits }, () => [random(), random()]);
  return paintLayer((u, v) => {
    const x = u * herringboneUnits, y = v * herringboneUnits, cellX = Math.floor(x), cellY = Math.floor(y);
    const kind = (((cellX - cellY) % 4) + 4) % 4;
    let originX = cellX, originY = cellY, width = 2, height = 1;
    if (kind === 1) originX -= 1;
    if (kind >= 2) { width = 1; height = 2; }
    if (kind === 2) originY -= 1;
    const joint = jointAmount(edgeDistance(x - originX, y - originY, width, height), herringboneMortarShare);
    const index = (((originY % herringboneUnits) + herringboneUnits) % herringboneUnits) * herringboneUnits + (((originX % herringboneUnits) + herringboneUnits) % herringboneUnits);
    const [tone, hue] = tones[index];
    return [0.32 + tone * 0.36, joint, hue, 1 - joint * 0.3];
  });
}

function paintStoneBlocks(random) {
  // each course is cut into blocks of uneven length that still add up to the tile's width
  const courses = Array.from({ length: stoneCourses }, () => {
    const cuts = [0];
    while (cuts[cuts.length - 1] < 0.8) cuts.push(cuts[cuts.length - 1] + 0.18 + random() * 0.24);
    cuts[cuts.length - 1] = 1;
    return { cuts, tones: cuts.map(() => [random(), random()]) };
  });
  return paintLayer((u, v) => {
    const courseIndex = Math.floor(v * stoneCourses), course = courses[courseIndex], insideY = v * stoneCourses - courseIndex;
    let block = 0;
    while (u > course.cuts[block + 1]) block++;
    const across = Math.min(u - course.cuts[block], course.cuts[block + 1] - u) * stoneCourses * 2.4 / 1.92;
    const joint = jointAmount(Math.min(across, insideY, 1 - insideY), stoneJointShare);
    const [tone, hue] = course.tones[block];
    return [0.38 + tone * 0.24, joint, hue, 1 - joint * 0.5];
  });
}

function paintRoofTiles(random) {
  const tones = Array.from({ length: tilesAcross * tileRows }, () => random());
  return paintLayer((u, v) => {
    const row = Math.floor(v * tileRows), rowFraction = v * tileRows - row;
    const along = u * tilesAcross + (row % 2) * 0.5, tile = Math.floor(along) % tilesAcross, acrossTile = along - Math.floor(along);
    // rounded across each tile, and in the shadow of the row above near its top
    const profile = 0.75 + 0.25 * Math.sin(acrossTile * Math.PI);
    const overlapShadow = Math.min(1, rowFraction / 0.25);
    const gap = jointAmount(Math.min(acrossTile, 1 - acrossTile) * 2, 0.06);
    return [(0.3 + tones[row * tilesAcross + tile] * 0.4) * profile, gap, tones[row * tilesAcross + tile], 0.45 + 0.55 * overlapShadow];
  });
}

// Halves a layer by averaging 2 x 2 texels, for the next mipmap level.
function halve(pixels, size) {
  const half = size / 2, smaller = new Uint8Array(half * half * 4);
  for (let row = 0; row < half; row++) {
    for (let column = 0; column < half; column++) {
      for (let channel = 0; channel < 4; channel++) {
        const at = (r, c) => pixels[((row * 2 + r) * size + column * 2 + c) * 4 + channel];
        smaller[(row * half + column) * 4 + channel] = (at(0, 0) + at(0, 1) + at(1, 0) + at(1, 1) + 2) >> 2;
      }
    }
  }
  return smaller;
}

// All layers with all their mipmap levels: levels[level][layer] is a Uint8Array of RGBA texels.
export function paintSurfaceTextures() {
  const random = createRandom(textureSeed);
  const layers = [paintWallBrick(random), paintHerringbone(random), paintStoneBlocks(random), paintRoofTiles(random)];
  const levels = [layers];
  for (let size = surfaceTextureSize; size > 1; size /= 2) levels.push(levels[levels.length - 1].map((pixels) => halve(pixels, size)));
  return levels;
}
