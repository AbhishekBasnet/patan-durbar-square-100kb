// The ordinary Newar houses that close the square on every side: rows of narrow three- and four-storey
// houses with tile roofs, broken by a few alleys that end in more houses, so the edge of the world is
// never visible. Depends on layout.js (the bounds), blocks.js and math.js.

import { squareBounds } from './layout.js';
import { createBlock, rotationForFacing, blockColors } from './blocks.js';
import { createRandom, mix } from '../core/math.js';

const houseWidthMetres = [4, 7.5];
const houseDepthMetres = [7, 10];
const storeyHeightMetres = 2.6;
const storeyCountRange = [3, 5]; // 3 or 4 storeys
const roofHeightMetres = 1.9;
const roofOverhangMetres = 0.7;
const alleyBackHouseDistanceMetres = 9; // how far down an alley the closing house stands
const plasteredHouseShare = 0.3;
const surroundingsSeed = 1985;

const { west, east, north, south } = squareBounds;

// Each frontage is a straight row of house fronts. facingDegrees is the compass direction the fronts face
// (into the square); alleys are [distance from the start, width] in metres.
const frontages = [
  { startX: west, startZ: north, endX: west, endZ: south, facingDegrees: 90, alleys: [[45, 2.5], [97, 3]] },
  { startX: west - 9, startZ: north, endX: east, endZ: north, facingDegrees: 180, alleys: [[22, 4], [50, 2.5]] },
  { startX: west - 9, startZ: south, endX: east, endZ: south, facingDegrees: 0, alleys: [[30, 4]] },
  { startX: east, startZ: north, endX: east, endZ: south, facingDegrees: 270, alleys: [] },
];

function houseColor(random) {
  if (random() < plasteredHouseShare) {
    const fade = random.between(0.8, 1.05);
    return blockColors.plaster.map((channel) => channel * fade);
  }
  const shade = random.between(0.75, 1.15);
  return blockColors.brickWall.map((channel, index) => channel * shade * (index ? random.between(0.9, 1.1) : 1));
}

function addHouse(blocks, random, centreX, centreZ, facingDegrees, width, depth) {
  const storeyCount = Math.floor(random.between(...storeyCountRange));
  const wallHeight = storeyCount * storeyHeightMetres + random.between(0, 0.6);
  const rotation = rotationForFacing(facingDegrees);
  blocks.push(createBlock({
    x: centreX, z: centreZ, rotation, alongFront: depth, across: width, height: wallHeight,
    color: houseColor(random), isSolid: true,
  }));
  // tile roof with its ridge running along the street
  const roofShade = random.between(0.8, 1.2);
  blocks.push(createBlock({
    x: centreX, y: wallHeight, z: centreZ, rotation,
    alongFront: depth + 2 * roofOverhangMetres, across: width + 0.2, height: roofHeightMetres,
    topScaleAlongFront: 0.06, color: blockColors.roofTile.map((channel) => channel * roofShade),
  }));
}

function addFrontage(blocks, random, frontage) {
  const lengthX = frontage.endX - frontage.startX, lengthZ = frontage.endZ - frontage.startZ;
  const length = Math.hypot(lengthX, lengthZ);
  const alongX = lengthX / length, alongZ = lengthZ / length;
  // unit vector pointing out of the square, behind the house fronts
  const facingRadians = frontage.facingDegrees * Math.PI / 180;
  const backX = -Math.sin(facingRadians), backZ = Math.cos(facingRadians);
  let distance = 0;
  const addRowHouse = (width) => {
    const depth = random.between(...houseDepthMetres);
    const middle = distance + width / 2;
    addHouse(blocks, random, frontage.startX + alongX * middle + backX * depth / 2,
      frontage.startZ + alongZ * middle + backZ * depth / 2, frontage.facingDegrees, width, depth);
    distance += width;
  };
  while (distance < length) {
    const width = Math.min(random.between(...houseWidthMetres), length - distance);
    const nextAlley = frontage.alleys.find(([alleyStart]) => alleyStart >= distance);
    if (!nextAlley || distance + width < nextAlley[0]) {
      addRowHouse(width);
      continue;
    }
    // the house before the alley fills the space up to it, then the alley gap is closed further back by
    // one house wide enough to hide the ends of its neighbours
    const [alleyStart, alleyWidth] = nextAlley;
    if (alleyStart - distance > 1) addRowHouse(alleyStart - distance);
    const gapCentre = alleyStart + alleyWidth / 2;
    const backDistance = alleyBackHouseDistanceMetres + houseDepthMetres[1] / 2;
    addHouse(blocks, random, frontage.startX + alongX * gapCentre + backX * backDistance,
      frontage.startZ + alongZ * gapCentre + backZ * backDistance, frontage.facingDegrees, alleyWidth + 6, houseDepthMetres[1]);
    distance = alleyStart + alleyWidth;
  }
}

export function buildSurroundings() {
  const blocks = [];
  const random = createRandom(surroundingsSeed);
  for (const frontage of frontages) addFrontage(blocks, random, frontage);
  // the ground: one wide slab of brick paving under everything
  blocks.push(createBlock({
    x: mix(west, east, 0.5), y: -1, z: mix(north, south, 0.5), alongFront: 260, across: 260, height: 1,
    color: blockColors.paving, isSolid: false,
  }));
  return blocks;
}
