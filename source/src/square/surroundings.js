// What closes the square on every side: just beyond the invisible wall at its edge (squareBounds, which the
// walking camera cannot cross), a row of old mud houses faces in, each with its aangan yard and pidhi, with
// narrow lanes between them; a second row stands behind to close the view, so the edge of the world never
// shows. Depends on layout.js (the bounds), blocks.js, mudHouse.js and math.js.

import { squareBounds } from './layout.js';
import { addMudHouse } from '../architecture/mudHouse.js';
import { rotationForFacing } from './blocks.js';
import { createRandom } from '../core/math.js';

const houseWidthMetres = [6, 9.5];
const houseDepthMetres = [5, 6.5];
const laneWidthMetres = [0.8, 2.6]; // the gaps between neighbouring houses
const aanganDepthMetres = [3, 5];
const pidhiDepthMetres = 1.4; // as in mudHouse.js
const backRowDistanceMetres = 16; // how far behind the front row the second row stands
const twoStoreyShare = 0.7;
const tulsiShare = 0.4;
const surroundingsSeed = 1985;

const { west, east, north, south } = squareBounds;

// Each frontage is a straight row along one edge of the square; facingDegrees is the way the houses face
// (into the square). The rows reach past the corners so they meet.
const frontages = [
  { startX: west, startZ: north - 12, endX: west, endZ: south + 12, facingDegrees: 90 },
  { startX: west - 12, startZ: north, endX: east + 12, endZ: north, facingDegrees: 180 },
  { startX: west - 12, startZ: south, endX: east + 12, endZ: south, facingDegrees: 0 },
  { startX: east, startZ: north - 12, endX: east, endZ: south + 12, facingDegrees: 270 },
];

function addRow(builder, random, frontage, setback) {
  const lengthX = frontage.endX - frontage.startX, lengthZ = frontage.endZ - frontage.startZ;
  const length = Math.hypot(lengthX, lengthZ);
  const alongX = lengthX / length, alongZ = lengthZ / length;
  // unit vector pointing out of the square, behind the house fronts
  const facingRadians = frontage.facingDegrees * Math.PI / 180;
  const backX = -Math.sin(facingRadians), backZ = Math.cos(facingRadians);
  let distance = random.between(0, 3);
  while (distance < length - houseWidthMetres[0]) {
    const width = random.between(...houseWidthMetres), depth = random.between(...houseDepthMetres);
    const aanganDepth = random.between(...aanganDepthMetres);
    // the yard's open edge touches the square's edge; the house stands behind its yard and pidhi
    const behindEdge = setback + aanganDepth + pidhiDepthMetres + depth / 2, middle = distance + width / 2;
    builder.beginChunk().push();
    builder.translate(frontage.startX + alongX * middle + backX * behindEdge, 0, frontage.startZ + alongZ * middle + backZ * behindEdge);
    builder.rotateY(rotationForFacing(frontage.facingDegrees));
    addMudHouse(builder, {
      halfDepth: depth / 2, halfWidth: width / 2, aanganDepth, variant: Math.floor(random.between(60, 220)),
      storeyCount: random() < twoStoreyShare ? 2 : 1, hasTulsi: random() < tulsiShare,
    });
    builder.pop();
    distance += width + random.between(...laneWidthMetres);
  }
}

// Adds the houses to `builder` (world space). They lie beyond the invisible wall, so they need no collision.
export function buildSurroundings(builder) {
  const random = createRandom(surroundingsSeed);
  for (const frontage of frontages) {
    addRow(builder, random, frontage, 0);
    addRow(builder, random, frontage, backRowDistanceMetres);
  }
  return [];
}
