// The ordinary Newar houses that close the square on every side: rows of narrow three- and four-storey
// houses (shops on the ground floor, latticed windows above, tile roofs on struts), broken by a few alleys
// that end in more houses, so the edge of the world is never visible.
// Depends on layout.js (the bounds), blocks.js, newarBuilding.js, materials.js and math.js.

import { squareBounds } from './layout.js';
import { createBlock, placeInMonument, rotationForFacing } from './blocks.js';
import { addNewarBuilding } from '../architecture/newarBuilding.js';
import { material } from '../look/materials.js';
import { createRandom } from '../core/math.js';

const houseWidthMetres = [4, 7.5];
const houseDepthMetres = [7, 10];
const groundStoreyHeightMetres = [2.5, 3.0];
const upperStoreyHeightMetres = [2.1, 2.5];
const storeyCountRange = [3, 5]; // 3 or 4 storeys
const roofHeightMetres = 1.6;
const roofOverhangMetres = 0.75;
const shopShare = 0.6; // houses with a shop on the ground floor; the rest have a doorway
const alleyBackHouseDistanceMetres = 9; // how far down an alley the closing house stands
const plasteredHouseShare = 0.3;
const frontSetbackMetres = [0, 1.4]; // house fronts jog in and out instead of forming one flat wall
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

function addHouse(builder, solidBlocks, random, centreX, centreZ, facingDegrees, width, depth) {
  const storeyCount = Math.floor(random.between(...storeyCountRange));
  const storeyHeights = [random.between(...groundStoreyHeightMetres)];
  for (let storey = 1; storey < storeyCount; storey++) storeyHeights.push(random.between(...upperStoreyHeightMetres));
  const house = {
    halfDepth: depth / 2, halfWidth: width / 2, storeyHeights,
    wallMaterial: random() < plasteredHouseShare ? material.plaster : material.brick, variant: Math.floor(random.between(40, 220)),
    detailedFaces: ['front'], groundFloor: random() < shopShare ? 'shop' : 'door', windowRowStorey: 2,
    roofOverhang: roofOverhangMetres, roofHeight: roofHeightMetres, carvedStruts: false,
  };
  const localSolids = [];
  builder.push().translate(centreX, 0, centreZ).rotateY(rotationForFacing(facingDegrees));
  addNewarBuilding(builder, localSolids, house);
  builder.pop();
  const placement = { x: centreX, z: centreZ, facingDegrees };
  for (const solid of localSolids) {
    solidBlocks.push(placeInMonument(placement, solid.x, solid.z, createBlock({ y: solid.y, alongFront: solid.alongFront, across: solid.across, height: solid.height, isSolid: true })));
  }
}

function addFrontage(builder, solidBlocks, random, frontage) {
  const lengthX = frontage.endX - frontage.startX, lengthZ = frontage.endZ - frontage.startZ;
  const length = Math.hypot(lengthX, lengthZ);
  const alongX = lengthX / length, alongZ = lengthZ / length;
  // unit vector pointing out of the square, behind the house fronts
  const facingRadians = frontage.facingDegrees * Math.PI / 180;
  const backX = -Math.sin(facingRadians), backZ = Math.cos(facingRadians);
  let distance = 0;
  const addRowHouse = (width) => {
    const depth = random.between(...houseDepthMetres);
    const middle = distance + width / 2, setback = random.between(...frontSetbackMetres);
    addHouse(builder, solidBlocks, random, frontage.startX + alongX * middle + backX * (depth / 2 + setback),
      frontage.startZ + alongZ * middle + backZ * (depth / 2 + setback), frontage.facingDegrees, width, depth);
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
    addHouse(builder, solidBlocks, random, frontage.startX + alongX * gapCentre + backX * backDistance,
      frontage.startZ + alongZ * gapCentre + backZ * backDistance, frontage.facingDegrees, alleyWidth + 6, houseDepthMetres[1]);
    distance = alleyStart + alleyWidth;
  }
}

// Adds the houses to `builder` (world space) and returns their collision blocks.
export function buildSurroundings(builder) {
  const solidBlocks = [];
  const random = createRandom(surroundingsSeed);
  for (const frontage of frontages) addFrontage(builder, solidBlocks, random, frontage);
  return solidBlocks;
}
