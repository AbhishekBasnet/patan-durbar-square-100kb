// Degutale Temple: the tall three-roofed tower of the royal goddess, rising out of the palace roof between
// Mul Chowk and Keshav Narayan Chowk; and the octagonal Taleju tower at Mul Chowk's corner (drawn square,
// see REFERENCES.md). No plinth or doorway: they stand on the palace. Assembled by pagodaTemple.js.
// Depends on pagodaTemple.js.

import { buildPagodaTemple } from '../architecture/pagodaTemple.js';

const palaceRoofHeightMetres = 9;

export const degutaleTemple = {
  baseY: palaceRoofHeightMetres,
  storeys: [
    { halfWidth: 3.6, halfDepth: 3.6, wallHeight: 4.5, eaveOverhang: 1.8, eaveDrop: 1.4, strutDrop: 1.2, strutsPerSide: 4 },
    { halfWidth: 2.8, halfDepth: 2.8, wallHeight: 4.0, eaveOverhang: 1.6, eaveDrop: 1.3, strutDrop: 1.1, strutsPerSide: 4 },
    { halfWidth: 2.1, halfDepth: 2.1, wallHeight: 3.5, eaveOverhang: 1.4, eaveDrop: 1.2, strutDrop: 1.0, strutsPerSide: 3 },
  ],
  topRoofRise: 2.2,
  finialHeight: 2.6,
  patakaWidth: 0.3,
};

export const talejuOctagonalTower = {
  baseY: palaceRoofHeightMetres - 1,
  storeys: [
    { halfWidth: 2.6, halfDepth: 2.6, wallHeight: 3.4, eaveOverhang: 1.5, eaveDrop: 1.2, strutDrop: 1.05, strutsPerSide: 3 },
    { halfWidth: 2.0, halfDepth: 2.0, wallHeight: 2.9, eaveOverhang: 1.3, eaveDrop: 1.1, strutDrop: 0.95, strutsPerSide: 3 },
    { halfWidth: 1.5, halfDepth: 1.5, wallHeight: 2.4, eaveOverhang: 1.1, eaveDrop: 1.0, strutDrop: 0.85, strutsPerSide: 2 },
  ],
  topRoofRise: 1.8,
  finialHeight: 2.2,
};

export function buildDegutaleTemple(builder, solids) {
  return buildPagodaTemple(builder, solids, degutaleTemple);
}

export function buildTalejuOctagonalTower(builder, solids) {
  return buildPagodaTemple(builder, solids, talejuOctagonalTower);
}
