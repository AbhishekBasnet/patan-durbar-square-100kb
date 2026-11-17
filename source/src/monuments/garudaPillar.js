// The Garuda pillar: Vishnu's bird-man kneeling with folded hands on a short stone column, facing
// Krishna Mandir. Also the shared column (base, shaft, lotus capital) for the king's pillar.
// Depends on statues.js and materials.js.

import { material } from '../look/materials.js';
import { addKneelingGaruda } from '../architecture/statues.js';

export const garudaPillar = { baseHalfSize: 0.7, baseHeight: 0.55, columnHeight: 1.7, columnRadius: 0.24, statueHeight: 1.25 };

// A stepped base, an octagonal column and a lotus capital. Returns the height of the capital's top.
export function addColumnWithCapital(builder, solids, { baseHalfSize, baseHeight, columnHeight, columnRadius }) {
  builder.material(material.stone, 110).occlusion(0.9);
  builder.addCentredBox(baseHalfSize, 0, baseHeight * 0.5, baseHalfSize);
  builder.addCentredBox(baseHalfSize * 0.75, baseHeight * 0.5, baseHeight, baseHalfSize * 0.75);
  builder.material(material.stone, 140).occlusion(1);
  builder.push().translate(0, baseHeight, 0).addPrism(8, columnRadius, columnHeight, 1, 1, false).pop();
  const capitalBottom = baseHeight + columnHeight, lotusHeight = columnRadius * 1.6;
  builder.material(material.carvedStone, 150);
  builder.push().translate(0, capitalBottom, 0).addLathe([[columnRadius, 0], [columnRadius * 1.7, lotusHeight * 0.6], [columnRadius * 1.9, lotusHeight]], 10, (angle) => 1 + 0.08 * Math.cos(angle * 12)).pop();
  solids.push({ x: 0, z: 0, y: 0, alongFront: baseHalfSize * 2, across: baseHalfSize * 2, height: baseHeight, shape: 'box' });
  solids.push({ x: 0, z: 0, y: 0, alongFront: columnRadius * 2.2, across: columnRadius * 2.2, height: capitalBottom + lotusHeight, shape: 'cylinder' });
  return capitalBottom + lotusHeight;
}

export function buildGarudaPillar(builder, solids) {
  const top = addColumnWithCapital(builder, solids, garudaPillar);
  builder.push().translate(0, top, 0).scale(garudaPillar.statueHeight);
  addKneelingGaruda(builder);
  builder.pop();
}
