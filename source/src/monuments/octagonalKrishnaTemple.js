// The octagonal Krishna Temple (Chyasim Deval), 1723, at the south end of the square: an octagonal stone
// colonnade around the sanctum, and an octagonal shikhara above. Only numbers here; the parts come from
// shikhara.js and plinths.js. Depends on those two files.

import { addSteppedPlinth } from '../architecture/plinths.js';
import { addColonnadeStorey, addShikharaTower } from '../architecture/shikhara.js';
import { material } from '../look/materials.js';

const octagon = 8;

export const chyasimDeval = {
  plinth: { width: 8.5, depth: 8.5, tierCount: 3, tierRiseMetres: 0.42, insetPerTier: 0.35, stairWidth: 1.6, tierMaterial: material.stone },
  colonnade: { halfSize: 3.5, height: 2.8, pillarsPerSide: 3, coreHalfSize: 2.2, doorway: { width: 0.85, height: 1.7 }, sideCount: octagon },
  tower: { baseHeight: 0.8, halfWidth: 1.75, height: 6.8 },
};

export function buildOctagonalKrishnaTemple(builder, solids) {
  const plinth = addSteppedPlinth(builder, solids, chyasimDeval.plinth);
  const terrace = addColonnadeStorey(builder, solids, { y: plinth.platformHeight, ...chyasimDeval.colonnade });
  const { tower } = chyasimDeval;
  builder.material(material.stone, 120).push().translate(0, terrace, 0).addPrism(octagon, tower.halfWidth * 1.08, tower.baseHeight).pop();
  addShikharaTower(builder, { y: terrace + tower.baseHeight, halfWidth: tower.halfWidth, height: tower.height, sideCount: octagon });
}
