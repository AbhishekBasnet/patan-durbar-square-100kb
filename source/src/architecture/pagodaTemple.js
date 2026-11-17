// Assembles a complete Newar pagoda temple from the parts: stepped plinth with stair and guardians, brick
// sanctum with carved doorways, the storeys above with latticed windows, and for every storey a tile roof
// on carved struts with bells; finial and banner on top. Each pagoda monument file only supplies numbers.
// Depends on plinths.js, statues.js, brickWall.js, doorways.js, windows.js, roofStruts.js and pagodaRoof.js.

import { addSteppedPlinth, addStairGuardians } from './plinths.js';
import { addSeatedLion, addStoneElephant } from './statues.js';
import { addBrickCore, onEachFace } from './brickWall.js';
import { addCarvedDoorway } from './doorways.js';
import { addLatticedWindow } from './windows.js';
import { addStrutsAlongWall } from './roofStruts.js';
import { addPagodaRoof, addGajur, addEaveBells, addPataka } from './pagodaRoof.js';

const guardianBuilders = { lion: addSeatedLion, elephant: addStoneElephant };
const roofCornerLiftMetres = 0.35;
const bellSpacingMetres = 1.1;
const finialBaseHalfSizeMetres = 0.45;
const sideWindowWidthMetres = 0.9;

// temple: {
//   plinth: { width, depth, tierCount, tierRiseMetres, insetPerTier, stairWidth },
//   guardians: { kind: 'lion' | 'elephant', pairCount, sizeMetres },
//   storeys: [{ halfWidth, halfDepth, wallHeight, eaveOverhang, eaveDrop, strutDrop, strutsPerSide }], ground floor
//     first; strutDrop is how far below the eave the struts meet the wall,
//   doorway: { width, height }, topRoofRise, finialHeight, patakaWidth
// }
// A tower rising out of the palace roof has no plinth and no doorway: give baseY (metres) instead.
export function buildPagodaTemple(builder, solids, temple) {
  const plinth = temple.plinth ? addSteppedPlinth(builder, solids, temple.plinth) : { platformHeight: temple.baseY };
  if (temple.guardians) {
    addStairGuardians(builder, solids, {
      stairWidth: temple.plinth.stairWidth, plinth, pairCount: temple.guardians.pairCount,
      addGuardian: guardianBuilders[temple.guardians.kind], guardianSizeMetres: temple.guardians.sizeMetres,
    });
  }

  let y = plinth.platformHeight;
  const roofs = [];
  temple.storeys.forEach((storey, index) => {
    const isGroundFloor = index === 0, isTop = index === temple.storeys.length - 1;
    const wallTop = addBrickCore(builder, isGroundFloor && temple.plinth ? solids : [], {
      halfDepth: storey.halfDepth, halfWidth: storey.halfWidth, bottom: y, height: storey.wallHeight, variant: 110 + index * 30,
    });
    // ground floor: a carved doorway on every face (the front one with a gilded torana); upper floors: windows
    onEachFace(builder, storey.halfDepth, storey.halfWidth, y, (faceName) => {
      if (isGroundFloor && temple.doorway) addCarvedDoorway(builder, { ...temple.doorway, isGilded: faceName === 'front' });
      else {
        builder.translate(0, storey.wallHeight * 0.3, 0);
        addLatticedWindow(builder, { width: sideWindowWidthMetres, height: storey.wallHeight * 0.35 });
      }
    });

    const next = temple.storeys[index + 1];
    const roof = {
      eaveHalfX: storey.halfDepth + storey.eaveOverhang, eaveHalfZ: storey.halfWidth + storey.eaveOverhang,
      topHalfX: isTop ? finialBaseHalfSizeMetres : next.halfDepth, topHalfZ: isTop ? finialBaseHalfSizeMetres : next.halfWidth,
      baseY: wallTop - storey.eaveDrop, height: storey.eaveDrop + (isTop ? temple.topRoofRise : 0),
      cornerLift: roofCornerLiftMetres, wallHalfX: storey.halfDepth, wallHalfZ: storey.halfWidth,
    };
    addPagodaRoof(builder, roof);
    addEaveBells(builder, roof, bellSpacingMetres);
    onEachFace(builder, storey.halfDepth, storey.halfWidth, 0, (faceName, halfSpan) => {
      addStrutsAlongWall(builder, {
        count: storey.strutsPerSide, halfSpan: halfSpan - 0.3, wallX: 0,
        bottomY: roof.baseY - storey.strutDrop, eaveX: storey.eaveOverhang - 0.35, topY: roof.baseY - 0.2,
      });
    });
    roofs.unshift(roof);
    y = wallTop;
  });

  const peak = roofs[0].baseY + roofs[0].height;
  addGajur(builder, { y: peak - 0.05, height: temple.finialHeight });
  if (temple.patakaWidth) addPataka(builder, roofs, { topY: peak - 0.2, widthMetres: temple.patakaWidth, bottomY: roofs[roofs.length - 1].baseY - 0.9 });
  return { platformHeight: plinth.platformHeight, peak: peak + temple.finialHeight };
}
