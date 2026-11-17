// An old Nepali mud house of the kind that stood around the valley's squares: thick earthen walls limewashed
// white above a band of red clay, small wooden windows, a low doorway, a tile roof; in front, the pidhi (a
// raised clay platform under a lean-to roof on wooden posts, where people sit) and the aangan (a swept earthen
// yard between low mud walls, sometimes with a tulsi plant on its pedestal).
// Built in the house's frame: centred on its walls, front toward +x. Depends on windows.js, doorways.js,
// pagodaRoof.js and materials.js.

import { material } from '../look/materials.js';
import { addLatticedWindow } from './windows.js';
import { addCarvedFrame } from './doorways.js';
import { addPagodaRoof } from './pagodaRoof.js';

const storeyHeightMetres = 2.3;
const redClayBandMetres = 1.0; // the red clay reaches this high above the pidhi
const pidhiHeightMetres = 0.5;
const pidhiDepthMetres = 1.4;
const pidhiPostSpacingMetres = 2.2;
const leanToOverhangMetres = 0.35;
const doorWidthMetres = 0.85;
const doorHeightMetres = 1.65;
const windowSizeMetres = [0.6, 0.7];
const roofHeightMetres = 1.5;
const aanganWallHeightMetres = 0.85;
const aanganWallThicknessMetres = 0.25;

// house: { halfDepth, halfWidth, storeyCount, aanganDepth, hasTulsi, variant }
export function addMudHouse(builder, house) {
  const { halfDepth, halfWidth, storeyCount, aanganDepth, variant } = house;
  const wallTop = storeyCount * storeyHeightMetres + pidhiHeightMetres;
  const front = halfDepth;

  // walls: limewash over the whole house, the red clay band around its foot, a timber band at each floor
  builder.material(material.plaster, variant).occlusion(1).addCentredBox(halfDepth, 0, wallTop, halfWidth);
  builder.material(material.redClay, variant).addCentredBox(halfDepth + 0.02, 0, pidhiHeightMetres + redClayBandMetres, halfWidth + 0.02);
  for (let storey = 1; storey < storeyCount; storey++) {
    builder.material(material.wood, 60).addCentredBox(halfDepth + 0.04, pidhiHeightMetres + storey * storeyHeightMetres - 0.12, pidhiHeightMetres + storey * storeyHeightMetres, halfWidth + 0.04);
  }

  // the front: a low doorway in the middle, small windows on either side and above
  builder.push().translate(front, pidhiHeightMetres, 0);
  builder.material(material.darkRecess).occlusion(0.4).addBox(0, 0, -doorWidthMetres / 2, 0.02, doorHeightMetres, doorWidthMetres / 2);
  builder.material(material.wood, 40).addBox(-0.02, 0, -doorWidthMetres / 2, 0.01, doorHeightMetres, doorWidthMetres / 2 - 0.4); // one leaf half open
  addCarvedFrame(builder, { halfWidth: doorWidthMetres / 2, bottom: 0, top: doorHeightMetres, depth: 0.08, memberWidth: 0.09, reach: 0.12 });
  const windowSpots = [[0.9, -halfWidth * 0.55], [0.9, halfWidth * 0.55]];
  for (let storey = 1; storey < storeyCount; storey++) windowSpots.push([storey * storeyHeightMetres + 0.7, -halfWidth * 0.45], [storey * storeyHeightMetres + 0.7, 0], [storey * storeyHeightMetres + 0.7, halfWidth * 0.45]);
  for (const [height, across] of windowSpots) {
    builder.push().translate(0, height, across);
    addLatticedWindow(builder, { width: windowSizeMetres[0], height: windowSizeMetres[1] });
    builder.pop();
  }
  builder.pop();

  // the pidhi: a clay platform along the front, under a lean-to roof of tiles on wooden posts
  builder.material(material.redClay, variant + 20).occlusion(0.9).addBox(front, 0, -halfWidth, front + pidhiDepthMetres, pidhiHeightMetres, halfWidth);
  const postTop = pidhiHeightMetres + storeyHeightMetres - 0.35, postCount = Math.max(2, Math.round(halfWidth * 2 / pidhiPostSpacingMetres) + 1);
  builder.material(material.wood, 50).occlusion(0.85);
  for (let post = 0; post < postCount; post++) {
    const z = -halfWidth + 0.15 + post * (halfWidth * 2 - 0.3) / (postCount - 1);
    builder.addBox(front + pidhiDepthMetres - 0.22, pidhiHeightMetres, z - 0.07, front + pidhiDepthMetres - 0.08, postTop, z + 0.07);
  }
  const leanToEdge = front + pidhiDepthMetres + leanToOverhangMetres, wallJoin = pidhiHeightMetres + storeyHeightMetres + 0.1;
  builder.material(material.roofTile, variant).occlusion(1);
  builder.addQuad([front, wallJoin, halfWidth + 0.2], [leanToEdge, postTop - 0.05, halfWidth + 0.2], [leanToEdge, postTop - 0.05, -halfWidth - 0.2], [front, wallJoin, -halfWidth - 0.2]);
  builder.material(material.wood, 30).occlusion(0.5);
  builder.addQuad([front, wallJoin - 0.08, -halfWidth - 0.2], [leanToEdge, postTop - 0.13, -halfWidth - 0.2], [leanToEdge, postTop - 0.13, halfWidth + 0.2], [front, wallJoin - 0.08, halfWidth + 0.2]);

  // the main roof
  addPagodaRoof(builder, {
    eaveHalfX: halfDepth + 0.5, eaveHalfZ: halfWidth + 0.4, topHalfX: 0.1, topHalfZ: Math.max(0.1, halfWidth - halfDepth * 0.6),
    baseY: wallTop - 0.3, height: roofHeightMetres, cornerLift: 0.05, wallHalfX: halfDepth, wallHalfZ: halfWidth,
  });

  // the aangan: swept earth between low mud walls, open toward the square
  const yardStart = front + pidhiDepthMetres, yardEnd = yardStart + aanganDepth, yardHalf = halfWidth + 0.4;
  builder.material(material.earth, variant).occlusion(1).addBox(yardStart, 0, -yardHalf, yardEnd, 0.015, yardHalf);
  for (const side of [-1, 1]) {
    builder.material(material.redClay, variant + 40).occlusion(0.9);
    builder.addBox(yardStart, 0, side * yardHalf - aanganWallThicknessMetres / 2, yardEnd, aanganWallHeightMetres, side * yardHalf + aanganWallThicknessMetres / 2);
    builder.material(material.plaster, variant).addBox(yardStart, aanganWallHeightMetres, side * yardHalf - 0.15, yardEnd, aanganWallHeightMetres + 0.06, side * yardHalf + 0.15);
  }
  if (house.hasTulsi) {
    // the tulsi pedestal (tulsi math): a little limewashed stand with the sacred basil on top
    const x = yardStart + aanganDepth * 0.45, z = halfWidth * 0.4;
    builder.material(material.plaster, 200).occlusion(1).push().translate(x, 0, z).addPrism(4, 0.3, 0.8, 0.8, 0.8).pop();
    builder.material(material.greenery, 128);
    for (let leaf = 0; leaf < 5; leaf++) builder.push().translate(x + Math.cos(leaf * 1.3) * 0.08, 0.92 + (leaf % 2) * 0.07, z + Math.sin(leaf * 1.3) * 0.08).scale(0.1, 0.12, 0.1).addSphere(5, 3).pop();
  }
  return { wallTop, frontOfYard: yardEnd };
}
