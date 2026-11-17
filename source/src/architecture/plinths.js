// Stepped temple plinths with a stair up the front, and the pairs of stone guardians (from statues.js) that sit
// beside the stairs. Parts are built in the monument's own frame: centred on the origin, front toward +x.
// Each solid piece is also listed in `solids` for walking collision. Guardians are dropped far away (lod.js).
// Depends on meshBuilder.js, lod.js, materials.js.

import { material } from '../look/materials.js';
import { detailGroup } from '../core/lod.js';

const stairRiseMetres = 0.21;
const stairTreadMetres = 0.3;
const tierCapThicknessMetres = 0.07; // stone coping along each tier's edge
const tierCapOverhangMetres = 0.04;
const guardianPedestalHeightMetres = 0.35;

function addSolidBox(solids, centreX, centreZ, alongFront, across, bottom, height) {
  solids.push({ x: centreX, z: centreZ, y: bottom, alongFront, across, height, shape: 'box' });
}

// Builds the tiers and the front stair. Returns the height of the top platform and the stair's footprint.
export function addSteppedPlinth(builder, solids, { width, depth, tierCount, tierRiseMetres, insetPerTier, tierMaterial = material.brick, stairWidth }) {
  for (let tier = 0; tier < tierCount; tier++) {
    const halfDepth = depth / 2 - tier * insetPerTier, halfWidth = width / 2 - tier * insetPerTier;
    const bottom = tier * tierRiseMetres, top = bottom + tierRiseMetres;
    builder.material(tierMaterial, 90 + tier * 20).occlusion(0.85);
    builder.addCentredBox(halfDepth, bottom, top - tierCapThicknessMetres, halfWidth);
    builder.material(material.stone, 120).occlusion(1);
    builder.addCentredBox(halfDepth + tierCapOverhangMetres, top - tierCapThicknessMetres, top, halfWidth + tierCapOverhangMetres);
    addSolidBox(solids, 0, 0, halfDepth * 2, halfWidth * 2, 0, top);
  }
  const platformHeight = tierCount * tierRiseMetres;
  const platformFront = depth / 2 - (tierCount - 1) * insetPerTier;
  const stairCount = Math.round(platformHeight / stairRiseMetres);
  const rise = platformHeight / stairCount;
  builder.material(material.stone, 140);
  for (let stair = 0; stair < stairCount; stair++) {
    // stair 0 is the top step, against the platform; the rest step down and out
    const top = platformHeight - stair * rise;
    const inner = platformFront + stair * stairTreadMetres, outer = inner + stairTreadMetres;
    builder.addBox(inner - 0.05, 0, -stairWidth / 2, outer, top, stairWidth / 2);
    addSolidBox(solids, (inner + outer) / 2, 0, outer - inner, stairWidth, 0, top);
  }
  return { platformHeight, platformFront, stairFoot: platformFront + stairCount * stairTreadMetres, rise };
}

// Pairs of guardians on both sides of the stair, climbing with it: the lowest pair beside the bottom step,
// each higher pair further up (the classic Newar stair of ever stronger guardians). Each sits on a
// pedestal block that rises from the ground to its step.
export function addStairGuardians(builder, solids, { stairWidth, plinth, pairCount, addGuardian, guardianSizeMetres }) {
  const stairCount = Math.round(plinth.platformHeight / plinth.rise);
  const stairsBetweenPairs = pairCount > 1 ? Math.floor((stairCount - 1) / (pairCount - 1)) : 0;
  for (let pair = 0; pair < pairCount; pair++) {
    const stair = stairCount - 1 - pair * stairsBetweenPairs;
    const stepTop = plinth.platformHeight - stair * plinth.rise;
    const x = plinth.platformFront + (stair + 0.5) * stairTreadMetres;
    const pedestalTop = stepTop + guardianPedestalHeightMetres;
    for (const side of [-1, 1]) {
      const z = side * (stairWidth / 2 + guardianSizeMetres * 0.25);
      builder.push().translate(x, 0, z);
      builder.material(material.stone, 110).addCentredBox(guardianSizeMetres * 0.3, 0, pedestalTop, guardianSizeMetres * 0.22);
      builder.translate(0, pedestalTop, 0).scale(guardianSizeMetres);
      builder.withDetail(detailGroup.nearAndMiddle, () => addGuardian(builder));
      builder.pop();
      addSolidBox(solids, x, z, guardianSizeMetres * 0.6, guardianSizeMetres * 0.44, 0, pedestalTop + guardianSizeMetres);
    }
  }
}
