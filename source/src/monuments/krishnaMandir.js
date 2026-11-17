// Krishna Mandir, 1637: the stone shikhara temple. Two open colonnaded storeys around a closed sanctum,
// small kiosks with their own shikharas on the terraces (21 pinnacles in all), and the tall central tower.
// Only numbers here; the parts come from shikhara.js and plinths.js. Depends on those two files.

import { addSteppedPlinth } from '../architecture/plinths.js';
import { addColonnadeStorey, addKiosk, addShikharaTower } from '../architecture/shikhara.js';
import { material } from '../look/materials.js';

const krishnaMandirShikharaTiers = {
  plinth: { width: 10.5, depth: 10.5, tierCount: 3, tierRiseMetres: 0.42, insetPerTier: 0.35, stairWidth: 2.2, tierMaterial: material.stone },
  groundColonnade: { halfSize: 4.5, height: 3.0, pillarsPerSide: 6, coreHalfSize: 2.6, doorway: { width: 0.9, height: 1.8 } },
  upperColonnade: { halfSize: 3.0, height: 2.5, pillarsPerSide: 5, coreHalfSize: 2.0 },
  groundTerraceKiosks: { halfSize: 0.65, pillarHeight: 1.5, roofHeight: 2.1 },
  upperTerraceKiosks: { halfSize: 0.5, pillarHeight: 1.2, roofHeight: 1.7 },
  sanctumTower: { baseHeight: 1.5, halfWidth: 1.7, height: 8.8 },
};

// Kiosks stand at the corners and the middle of each side of a terrace.
function addTerraceKiosks(builder, terraceHalfSize, y, kiosk, withMiddles) {
  const reach = terraceHalfSize - kiosk.halfSize - 0.1;
  const spots = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
  if (withMiddles) spots.push([1, 0], [-1, 0], [0, 1], [0, -1]);
  for (const [x, z] of spots) addKiosk(builder, { x: x * reach, z: z * reach, y, ...kiosk });
}

export function buildKrishnaMandir(builder, solids) {
  const tiers = krishnaMandirShikharaTiers;
  const plinth = addSteppedPlinth(builder, solids, tiers.plinth);
  const firstTerrace = addColonnadeStorey(builder, solids, { y: plinth.platformHeight, ...tiers.groundColonnade });
  addTerraceKiosks(builder, tiers.groundColonnade.halfSize, firstTerrace, tiers.groundTerraceKiosks, true);
  const secondTerrace = addColonnadeStorey(builder, [], { y: firstTerrace, ...tiers.upperColonnade });
  addTerraceKiosks(builder, tiers.upperColonnade.halfSize, secondTerrace, tiers.upperTerraceKiosks, false);
  const tower = tiers.sanctumTower;
  builder.material(material.stone, 120).addCentredBox(tower.halfWidth * 1.05, secondTerrace, secondTerrace + tower.baseHeight, tower.halfWidth * 1.05);
  const peak = addShikharaTower(builder, { y: secondTerrace + tower.baseHeight, halfWidth: tower.halfWidth, height: tower.height });
  return { platformHeight: plinth.platformHeight, peak };
}
