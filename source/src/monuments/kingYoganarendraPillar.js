// King Yoganarendra Malla's pillar, 1693: the gilded king kneeling under a cobra's hood on top of a tall stone
// column, facing the palace. Depends on garudaPillar.js (the column) and statues.js.

import { addColumnWithCapital } from './garudaPillar.js';
import { addKingUnderCobraHood } from '../architecture/statues.js';

export const kingYoganarendraPillar = { baseHalfSize: 1.1, baseHeight: 0.9, columnHeight: 6.9, columnRadius: 0.3, statueHeight: 1.75 };

export function buildKingYoganarendraPillar(builder, solids) {
  const top = addColumnWithCapital(builder, solids, kingYoganarendraPillar);
  builder.push().translate(0, top, 0).scale(kingYoganarendraPillar.statueHeight);
  addKingUnderCobraHood(builder);
  builder.pop();
}
