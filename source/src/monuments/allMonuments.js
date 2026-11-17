// Builds every monument that has its own file into one world-space mesh, each placed and turned as layout.js
// says, and collects their solid parts as blocks for walking collision. Monuments without a file yet still
// come from the step-1 blockout. Depends on layout.js, blocks.js and the monument files.

import { monumentLayout } from '../square/layout.js';
import { createBlock, placeInMonument, rotationForFacing } from '../square/blocks.js';
import { buildCharNarayanTemple } from './charNarayanTemple.js';
import { buildKrishnaMandir } from './krishnaMandir.js';

export const monumentBuilders = {
  charNarayanTemple: buildCharNarayanTemple,
  krishnaMandir: buildKrishnaMandir,
};

// Adds the built monuments to `builder` (world space) and returns their collision blocks.
export function buildMonuments(builder) {
  const solidBlocks = [];
  for (const row of monumentLayout) {
    const buildMonument = monumentBuilders[row.name];
    if (!buildMonument) continue;
    const localSolids = [];
    builder.push().translate(row.x, 0, row.z).rotateY(rotationForFacing(row.facingDegrees));
    buildMonument(builder, localSolids);
    builder.pop();
    for (const solid of localSolids) {
      solidBlocks.push(placeInMonument(row, solid.x, solid.z, createBlock({
        shape: solid.shape, y: solid.y, alongFront: solid.alongFront, across: solid.across, height: solid.height, isSolid: true,
      })));
    }
  }
  return solidBlocks;
}
