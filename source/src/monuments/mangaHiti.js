// Manga Hiti: the sunken stone water spout (dhunge dhara) at the north end, reached by a flight of steps, with
// three makara heads on its back wall pouring into knee-deep water; and the two Mani Mandap pavilions beside it,
// open wooden halls on raised stone platforms. The pit is listed in `holes` so the paving is cut away and
// you can walk down into it. Depends on statues.js, plinths.js, pagodaRoof.js, roofStruts.js, lod.js, materials.js.

import { material } from '../look/materials.js';
import { detailGroup } from '../core/lod.js';
import { addMakaraSpout } from '../architecture/statues.js';
import { addSteppedPlinth } from '../architecture/plinths.js';
import { addPagodaRoof } from '../architecture/pagodaRoof.js';
import { addStrutsAlongWall } from '../architecture/roofStruts.js';
import { onEachFace } from '../architecture/brickWall.js';

export const mangaHiti = {
  halfLength: 6, // along the steps (local x), metres
  halfWidth: 5,
  depth: 2.8,
  stairWidth: 2.6,
  stairCount: 11,
  stairTread: 0.35,
  wallThickness: 0.6,
  rimHeight: 0.12, // the stone curb around the edge
  ledgeHeight: 1.3, // a walkway ledge half way down, along the side walls
  ledgeWidth: 0.7,
  spoutHeightAboveFloor: 1.15,
  spoutSpacing: 2.2,
  waterDepth: 0.5, // knee deep: the lowest steps and the trough are under water
};

// The water, in the pit's own frame (square/water.js places it): a stream from each spout's pipe, and the
// knee-deep pool filling the floor of the pit.
export function describeMangaHitiWater() {
  const pit = mangaHiti, floor = -pit.depth, spoutPipeReach = 0.86 * 0.75, spoutY = floor + pit.spoutHeightAboveFloor - 0.03;
  const streams = [-1, 0, 1].map((spout) => ({
    x: -pit.halfLength + spoutPipeReach, y: spoutY, z: spout * pit.spoutSpacing,
    drop: spoutY - (floor + pit.waterDepth), outflowMetresPerSecond: 0.55,
  }));
  return { streams, pool: { x: 0, y: floor + pit.waterDepth, z: 0, halfX: pit.halfLength, halfZ: pit.halfWidth } };
}

export function buildMangaHiti(builder, solids, holes) {
  const pit = mangaHiti, floor = -pit.depth;
  holes.push({ minX: -pit.halfLength, maxX: pit.halfLength, minZ: -pit.halfWidth, maxZ: pit.halfWidth, floorY: floor });
  builder.material(material.stone, 100).occlusion(0.6);
  builder.addQuad([-pit.halfLength, floor, -pit.halfWidth], [-pit.halfLength, floor, pit.halfWidth], [pit.halfLength, floor, pit.halfWidth], [pit.halfLength, floor, -pit.halfWidth]);
  // retaining walls around the pit, their tops a stone curb you can walk along
  const outerX = pit.halfLength + pit.wallThickness, outerZ = pit.halfWidth + pit.wallThickness;
  const walls = [
    [pit.halfLength, outerX, -outerZ, outerZ], [-outerX, -pit.halfLength, -outerZ, outerZ],
    [-pit.halfLength, pit.halfLength, pit.halfWidth, outerZ], [-pit.halfLength, pit.halfLength, -outerZ, -pit.halfWidth],
  ];
  builder.material(material.stone, 120).occlusion(0.8);
  for (const [minX, maxX, minZ, maxZ] of walls) {
    builder.addBox(minX, floor, minZ, maxX, pit.rimHeight, maxZ);
    solids.push({ x: (minX + maxX) / 2, z: (minZ + maxZ) / 2, y: floor, alongFront: maxX - minX, across: maxZ - minZ, height: pit.depth + pit.rimHeight, shape: 'box' });
  }
  // ledges along the two side walls
  for (const side of [-1, 1]) {
    const inner = side * (pit.halfWidth - pit.ledgeWidth), outer = side * pit.halfWidth;
    const [minZ, maxZ] = side < 0 ? [outer, inner] : [inner, outer];
    builder.addBox(-pit.halfLength, floor, minZ, pit.halfLength - pit.stairCount * pit.stairTread, floor + pit.ledgeHeight, maxZ);
    solids.push({ x: 0, z: (minZ + maxZ) / 2, y: floor, alongFront: pit.halfLength * 2, across: pit.ledgeWidth, height: pit.ledgeHeight, shape: 'box' });
  }
  // the flight of steps down from the square
  const rise = pit.depth / pit.stairCount;
  builder.material(material.stone, 140).occlusion(0.85);
  for (let step = 1; step <= pit.stairCount; step++) {
    const top = -step * rise, outerEdge = pit.halfLength - (step - 1) * pit.stairTread, innerEdge = outerEdge - pit.stairTread;
    builder.addBox(innerEdge, floor, -pit.stairWidth / 2, outerEdge, top, pit.stairWidth / 2);
    solids.push({ x: (innerEdge + outerEdge) / 2, z: 0, y: floor, alongFront: pit.stairTread, across: pit.stairWidth, height: top - floor, shape: 'box' });
  }
  // three makara spouts on the back wall over a stone trough
  builder.material(material.stone, 90).occlusion(0.6).addBox(-pit.halfLength, floor, -3, -pit.halfLength + 0.6, floor + 0.4, 3);
  for (let spout = -1; spout <= 1; spout++) {
    builder.push().translate(-pit.halfLength, floor + pit.spoutHeightAboveFloor, spout * pit.spoutSpacing).scale(0.75);
    builder.withDetail(detailGroup.nearAndMiddle, () => addMakaraSpout(builder));
    builder.pop();
  }
}

// ---- Mani Mandap: a three-tier stone platform carrying an open hall of wooden posts under one tile roof
const maniMandap = { postHeight: 2.5, postHalfSize: 0.13, postsAlong: 2, postsAcross: 4, roofOverhang: 1.0, roofHeight: 1.6 };

export function buildManiMandap(builder, solids, holes, row) {
  const plinth = addSteppedPlinth(builder, solids, {
    width: row.width, depth: row.depth, tierCount: 3, tierRiseMetres: 0.42, insetPerTier: 0.3, stairWidth: 1.6, tierMaterial: material.stone,
  });
  const hall = maniMandap, top = plinth.platformHeight;
  const halfX = row.depth / 2 - 0.9 - hall.postHalfSize, halfZ = row.width / 2 - 0.9 - hall.postHalfSize;
  builder.material(material.wood, 60).occlusion(0.8);
  for (let along = 0; along < hall.postsAlong; along++) {
    for (let across = 0; across < hall.postsAcross; across++) {
      const x = -halfX + 2 * halfX * along / (hall.postsAlong - 1), z = -halfZ + 2 * halfZ * across / (hall.postsAcross - 1);
      builder.push().translate(x, top, z).addCentredBox(hall.postHalfSize, 0, hall.postHeight, hall.postHalfSize).pop();
      solids.push({ x, z, y: top, alongFront: hall.postHalfSize * 2, across: hall.postHalfSize * 2, height: hall.postHeight, shape: 'box' });
    }
  }
  const beamTop = top + hall.postHeight + 0.25;
  builder.addCentredBox(halfX + 0.15, top + hall.postHeight, beamTop, halfZ + 0.15);
  const roof = {
    eaveHalfX: halfX + hall.roofOverhang, eaveHalfZ: halfZ + hall.roofOverhang, topHalfX: 0.15, topHalfZ: halfZ * 0.6,
    baseY: beamTop - 0.2, height: hall.roofHeight, cornerLift: 0.25, wallHalfX: halfX, wallHalfZ: halfZ,
  };
  addPagodaRoof(builder, roof);
  onEachFace(builder, halfX, halfZ, 0, (faceName, halfSpan) => addStrutsAlongWall(builder, {
    count: faceName === 'front' || faceName === 'back' ? 3 : 2, halfSpan: halfSpan - 0.4, wallX: 0,
    bottomY: beamTop - 1.0, eaveX: hall.roofOverhang - 0.25, topY: roof.baseY - 0.1,
  }));
}
