// Vishwanath Temple, 1627: Shiva's temple, two roofs over a richly carved brick sanctum on a tall plinth,
// with a stone elephant on each side of the east stair. Only numbers here; assembled by pagodaTemple.js.
// Depends on pagodaTemple.js.

import { buildPagodaTemple } from '../architecture/pagodaTemple.js';

export const vishwanathTemple = {
  plinth: { width: 9, depth: 9, tierCount: 5, tierRiseMetres: 0.42, insetPerTier: 0.35, stairWidth: 1.5 },
  guardians: { kind: 'elephant', pairCount: 1, sizeMetres: 1.5 },
  storeys: [
    { halfWidth: 2.5, halfDepth: 2.5, wallHeight: 5.6, eaveOverhang: 2.0, eaveDrop: 1.5, strutDrop: 1.25, strutsPerSide: 4 },
    { halfWidth: 1.9, halfDepth: 1.9, wallHeight: 2.4, eaveOverhang: 1.6, eaveDrop: 1.2, strutDrop: 1.05, strutsPerSide: 3 },
  ],
  doorway: { width: 0.95, height: 1.75 },
  topRoofRise: 2.0,
  finialHeight: 2.4,
  patakaWidth: 0.3,
};

export function buildVishwanathTemple(builder, solids) {
  return buildPagodaTemple(builder, solids, vishwanathTemple);
}
