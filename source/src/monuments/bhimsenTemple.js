// Bhimsen Temple, rebuilt 1682: the north end of the temple row. Unusually rectangular, three roofs, on a low
// brick plinth, with lions at the stair. Only numbers here; the temple is assembled by pagodaTemple.js.
// Depends on pagodaTemple.js.

import { buildPagodaTemple } from '../architecture/pagodaTemple.js';

export const bhimsenTemple = {
  plinth: { width: 9, depth: 12, tierCount: 2, tierRiseMetres: 0.42, insetPerTier: 0.4, stairWidth: 2.0 },
  guardians: { kind: 'lion', pairCount: 1, sizeMetres: 1.0 },
  storeys: [
    { halfWidth: 3.5, halfDepth: 4.9, wallHeight: 5.4, eaveOverhang: 1.8, eaveDrop: 1.5, strutDrop: 1.3, strutsPerSide: 5 },
    { halfWidth: 2.8, halfDepth: 3.9, wallHeight: 3.4, eaveOverhang: 1.6, eaveDrop: 1.3, strutDrop: 1.15, strutsPerSide: 4 },
    { halfWidth: 2.1, halfDepth: 2.9, wallHeight: 2.8, eaveOverhang: 1.4, eaveDrop: 1.2, strutDrop: 1.0, strutsPerSide: 3 },
  ],
  doorway: { width: 1.1, height: 1.9 },
  topRoofRise: 1.8,
  finialHeight: 2.4,
  patakaWidth: 0.34,
};

export function buildBhimsenTemple(builder, solids) {
  return buildPagodaTemple(builder, solids, bhimsenTemple);
}
