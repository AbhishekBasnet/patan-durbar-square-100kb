// Hari Shankar Temple, 1704-05: three roofs, dedicated to the half-Vishnu, half-Shiva deity, on a four-tier
// plinth with lions at the stair. Only numbers here; assembled by pagodaTemple.js. Depends on pagodaTemple.js.

import { buildPagodaTemple } from '../architecture/pagodaTemple.js';

export const hariShankarTemple = {
  plinth: { width: 8.5, depth: 8.5, tierCount: 4, tierRiseMetres: 0.42, insetPerTier: 0.35, stairWidth: 1.4 },
  guardians: { kind: 'lion', pairCount: 1, sizeMetres: 0.9 },
  storeys: [
    { halfWidth: 2.3, halfDepth: 2.3, wallHeight: 4.9, eaveOverhang: 1.9, eaveDrop: 1.4, strutDrop: 1.2, strutsPerSide: 4 },
    { halfWidth: 1.8, halfDepth: 1.8, wallHeight: 2.6, eaveOverhang: 1.6, eaveDrop: 1.2, strutDrop: 1.05, strutsPerSide: 3 },
    { halfWidth: 1.35, halfDepth: 1.35, wallHeight: 2.0, eaveOverhang: 1.3, eaveDrop: 1.0, strutDrop: 0.9, strutsPerSide: 2 },
  ],
  doorway: { width: 0.9, height: 1.7 },
  topRoofRise: 1.6,
  finialHeight: 2.2,
  patakaWidth: 0.28,
};

export function buildHariShankarTemple(builder, solids) {
  return buildPagodaTemple(builder, solids, hariShankarTemple);
}
