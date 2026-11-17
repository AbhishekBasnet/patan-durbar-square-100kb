// Char Narayan (Jagannarayan) Temple, 1565: the oldest temple on the square. Two tile roofs on carved struts
// over a brick sanctum with four carved doorways, raised on a tall five-tier brick plinth with lions on the
// stair. Only numbers here: the temple is assembled by pagodaTemple.js. Depends on pagodaTemple.js.

import { buildPagodaTemple } from '../architecture/pagodaTemple.js';

export const charNarayanTemple = {
  plinth: { width: 10, depth: 10, tierCount: 5, tierRiseMetres: 0.42, insetPerTier: 0.4, stairWidth: 1.6 },
  guardians: { kind: 'lion', pairCount: 2, sizeMetres: 0.95 },
  storeys: [
    { halfWidth: 2.5, halfDepth: 2.5, wallHeight: 5.8, eaveOverhang: 2.1, eaveDrop: 1.6, strutDrop: 1.3, strutsPerSide: 4 },
    { halfWidth: 1.9, halfDepth: 1.9, wallHeight: 2.6, eaveOverhang: 1.7, eaveDrop: 1.3, strutDrop: 1.15, strutsPerSide: 3 },
  ],
  doorway: { width: 1.0, height: 1.75 },
  topRoofRise: 2.0,
  finialHeight: 2.6,
  patakaWidth: 0.32,
};

export function buildCharNarayanTemple(builder, solids) {
  return buildPagodaTemple(builder, solids, charNarayanTemple);
}
