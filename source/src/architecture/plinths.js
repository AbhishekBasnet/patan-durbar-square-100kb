// Stepped temple plinths with a stair up the front, and the stone guardians (lions, elephants) that sit in
// pairs beside the stairs. Parts are built in the monument's own frame: centred on the origin, front toward +x.
// Each solid piece is also listed in `solids` for walking collision. Depends on meshBuilder.js, materials.js.

import { material } from '../look/materials.js';

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
      addGuardian(builder);
      builder.pop();
      addSolidBox(solids, x, z, guardianSizeMetres * 0.6, guardianSizeMetres * 0.44, 0, pedestalTop + guardianSizeMetres);
    }
  }
}

// A seated Newar temple lion (simha), 1 unit tall, facing +x: haunches, upright chest, curly mane, open jaw.
export function addSeatedLion(builder) {
  builder.material(material.carvedStone, 130);
  builder.push().translate(-0.08, 0.2, 0).scale(0.26, 0.2, 0.2).addSphere(8, 5).pop(); // haunches
  builder.push().translate(0.04, 0.42, 0).rotateZ(-0.35).scale(0.17, 0.26, 0.17).addSphere(8, 5).pop(); // chest
  for (const side of [-1, 1]) {
    builder.push().translate(0.16, 0, side * 0.08).addLathe([[0.045, 0], [0.04, 0.38], [0.0, 0.4]], 6).pop(); // front leg
    builder.push().translate(0.15, 0.02, side * 0.08).scale(0.07, 0.04, 0.05).addSphere(6, 3).pop(); // paw
  }
  builder.push().translate(0.1, 0.72, 0);
  builder.push().translate(-0.04, 0, 0).scale(0.12, 0.17, 0.2).addSphere(10, 5).pop(); // mane
  builder.material(material.carvedStone, 150);
  builder.push().scale(0.12, 0.12, 0.12).addSphere(8, 5).pop(); // head
  builder.push().translate(0.1, -0.02, 0).scale(0.07, 0.05, 0.065).addSphere(6, 4).pop(); // muzzle
  builder.material(material.darkRecess).addBox(0.12, -0.075, -0.04, 0.17, -0.045, 0.04); // open mouth
  builder.material(material.carvedStone, 130);
  for (const side of [-1, 1]) builder.push().translate(0.0, 0.11, side * 0.08).scale(0.035, 0.05, 0.03).addSphere(5, 3).pop(); // ears
  builder.pop();
  builder.addTube([[-0.3, 0.1, 0.05], [-0.38, 0.3, 0.08], [-0.3, 0.45, 0.1], [-0.24, 0.42, 0.1]], 0.025, 4); // curled tail
}

// A stone elephant, 1 unit tall at the back, facing +x: body, four legs, head, trunk curling down, flat ears.
export function addStoneElephant(builder) {
  builder.material(material.carvedStone, 120);
  builder.push().translate(-0.05, 0.62, 0).scale(0.42, 0.3, 0.26).addSphere(10, 6).pop(); // body
  for (const [legX, legZ] of [[0.22, 0.13], [0.22, -0.13], [-0.3, 0.13], [-0.3, -0.13]]) {
    builder.push().translate(legX, 0, legZ).addLathe([[0.085, 0], [0.08, 0.5], [0.07, 0.55]], 7).pop();
  }
  builder.push().translate(0.38, 0.78, 0);
  builder.push().scale(0.18, 0.2, 0.17).addSphere(8, 5).pop(); // head
  for (const side of [-1, 1]) {
    builder.push().translate(-0.04, 0.0, side * 0.17).rotateY(side * 0.3).scale(0.025, 0.17, 0.13).addSphere(6, 4).pop(); // ear
  }
  builder.addTube([[0.12, -0.05, 0], [0.2, -0.25, 0], [0.2, -0.5, 0], [0.26, -0.68, 0], [0.32, -0.66, 0]], 0.05, 6); // trunk
  builder.material(material.carvedStone, 200);
  for (const side of [-1, 1]) builder.addTube([[0.12, -0.12, side * 0.08], [0.22, -0.22, side * 0.1], [0.3, -0.2, side * 0.1]], 0.02, 4); // tusks
  builder.pop();
  // the saddle cloth, carved in stone
  builder.material(material.carvedStone, 90).push().translate(-0.05, 0.86, 0).scale(0.28, 0.06, 0.28).addSphere(8, 3).pop();
}
