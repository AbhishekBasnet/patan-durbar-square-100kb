// The royal palace along the east side of the square, as it was in the 1980s (before the north wing became
// the Patan Museum): three courtyard blocks of brick with carved windows and struts facing the square.
// Keshav Narayan Chowk (north) has the golden gate and golden window; Mul Chowk is in the middle; Sundari Chowk
// (south) is open: you walk in through its gate to the courtyard and the sunken Tusha Hiti bath.
// Built from newarBuilding.js. Depends on newarBuilding.js, doorways.js, windows.js, statues.js, lod.js, materials.js.

import { material } from '../look/materials.js';
import { detailGroup } from '../core/lod.js';
import { addNewarBuilding } from '../architecture/newarBuilding.js';
import { addCarvedDoorway, addCarvedFrame } from '../architecture/doorways.js';
import { addLatticedWindow } from '../architecture/windows.js';
import { addMakaraSpout } from '../architecture/statues.js';

const palaceStoreyHeights = [3.3, 2.4, 3.0, 2.2];
const palaceWing = {
  storeyHeights: palaceStoreyHeights, wallMaterial: material.brick, variant: 140, groundFloor: 'blank',
  windowRowStorey: 2, roofOverhang: 1.6, roofHeight: 3.4, carvedStruts: true, facadeBayMetres: 6, maximumWindowBays: 4,
};
const goldenGate = { width: 1.5, height: 2.4, windowWidth: 1.4, windowHeight: 1.5 };
const sundariChowk = { courtyardHalfSize: 8, gateWidth: 2.4, gateHeight: 3.0 };
const tushaHiti = { halfSize: 2.6, tierCount: 3, tierDrop: 0.5, tierWidth: 0.6 };

function placeWing(builder, solids, { x, z, halfDepth, halfWidth, detailedFaces }) {
  const wingSolids = [];
  builder.push().translate(x, 0, z);
  addNewarBuilding(builder, wingSolids, { ...palaceWing, halfDepth, halfWidth, detailedFaces });
  builder.pop();
  for (const solid of wingSolids) solids.push({ ...solid, x: solid.x + x, z: solid.z + z });
}

// A closed palace block: one wing filling the whole footprint, its square front and sides carved.
function buildClosedChowk(builder, solids, row, detailedFaces) {
  placeWing(builder, solids, { x: 0, z: 0, halfDepth: row.depth / 2, halfWidth: row.width / 2, detailedFaces });
}

export function buildKeshavNarayanChowk(builder, solids, holes, row) {
  buildClosedChowk(builder, solids, row, ['front', 'right']); // right: the north side, toward Manga Hiti
  // the golden gate, and the golden window above it
  builder.push().translate(row.depth / 2 + 0.02, 0, 0);
  addCarvedDoorway(builder, { width: goldenGate.width, height: goldenGate.height, isGilded: true, frameMaterial: material.gilded });
  builder.translate(0, palaceStoreyHeights[0] + palaceStoreyHeights[1] + 0.5, 0);
  addLatticedWindow(builder, { width: goldenGate.windowWidth, height: goldenGate.windowHeight, frameMaterial: material.gilded });
  builder.pop();
}

export function buildMulChowk(builder, solids, holes, row) {
  buildClosedChowk(builder, solids, row, ['front']);
  builder.push().translate(row.depth / 2 + 0.02, 0, 0);
  addCarvedDoorway(builder, { width: 1.3, height: 2.2, isGilded: true });
  builder.pop();
}

// Sundari Chowk: four wings round an open courtyard, a gate through the front wing, and Tusha Hiti in the middle.
export function buildSundariChowk(builder, solids, holes, row) {
  const halfDepth = row.depth / 2, halfWidth = row.width / 2, inner = sundariChowk.courtyardHalfSize;
  const wingHalf = (halfDepth - inner) / 2, wingCentre = inner + wingHalf;
  placeWing(builder, solids, { x: -wingCentre, z: 0, halfDepth: wingHalf, halfWidth, detailedFaces: ['front'] });
  placeWing(builder, solids, { x: 0, z: wingCentre, halfDepth: inner, halfWidth: wingHalf, detailedFaces: ['left'] });
  placeWing(builder, solids, { x: 0, z: -wingCentre, halfDepth: inner, halfWidth: wingHalf, detailedFaces: ['right'] });
  // the front wing in two halves either side of the gate passage, bridged above the passage
  const gateHalf = sundariChowk.gateWidth / 2, frontHalfWidth = (halfWidth - gateHalf) / 2;
  for (const side of [-1, 1]) {
    placeWing(builder, solids, { x: wingCentre, z: side * (gateHalf + frontHalfWidth), halfDepth: wingHalf, halfWidth: frontHalfWidth, detailedFaces: ['front', 'back'] });
  }
  const wallTop = palaceStoreyHeights.reduce((sum, height) => sum + height, 0);
  builder.material(material.brick, 140).occlusion(1);
  builder.addBox(inner, sundariChowk.gateHeight, -gateHalf, halfDepth, wallTop, gateHalf);
  builder.material(material.darkRecess).occlusion(0.3).addBox(inner, sundariChowk.gateHeight - 0.02, -gateHalf, halfDepth, sundariChowk.gateHeight, gateHalf);
  for (const faceX of [halfDepth, inner]) {
    builder.push().translate(faceX, 0, 0).rotateY(faceX === inner ? Math.PI : 0);
    addCarvedFrame(builder, { halfWidth: gateHalf, bottom: 0, top: sundariChowk.gateHeight, depth: 0.2, memberWidth: 0.16, reach: 0.3 });
    builder.pop();
  }
  addTushaHiti(builder, solids, holes);
}

// Tusha Hiti: a small sunken bath in rings of stone steps, with a spout on its west side.
function addTushaHiti(builder, solids, holes) {
  const bath = tushaHiti, floor = -bath.tierCount * bath.tierDrop;
  holes.push({ minX: -bath.halfSize, maxX: bath.halfSize, minZ: -bath.halfSize, maxZ: bath.halfSize, floorY: floor });
  builder.material(material.stone, 110).occlusion(0.7);
  const floorHalf = bath.halfSize - bath.tierCount * bath.tierWidth;
  builder.addQuad([-floorHalf, floor, -floorHalf], [-floorHalf, floor, floorHalf], [floorHalf, floor, floorHalf], [floorHalf, floor, -floorHalf]);
  for (let tier = 0; tier < bath.tierCount; tier++) {
    const outer = bath.halfSize - tier * bath.tierWidth, inner = outer - bath.tierWidth, top = -(tier + 1) * bath.tierDrop + bath.tierDrop;
    const ringTop = tier === 0 ? 0.1 : top; // the outermost ring is the curb, a little above the courtyard
    for (const [minX, maxX, minZ, maxZ] of [[-outer, outer, inner, outer], [-outer, outer, -outer, -inner], [inner, outer, -inner, inner], [-outer, -inner, -inner, inner]]) {
      builder.material(material.stone, 120 + tier * 15).addBox(minX, floor, minZ, maxX, ringTop, maxZ);
      solids.push({ x: (minX + maxX) / 2, z: (minZ + maxZ) / 2, y: floor, alongFront: maxX - minX, across: maxZ - minZ, height: ringTop - floor, shape: 'box' });
    }
  }
  builder.push().translate(-floorHalf, floor + 0.7, 0).scale(0.6);
  builder.withDetail(detailGroup.nearAndMiddle, () => addMakaraSpout(builder));
  builder.pop();
}
