// An ordinary Newar building, used for the palace wings and for every house around the square: a brick or
// plastered core of several storeys with glazed bands between them, a shop front or doorway on the ground
// floor, small latticed windows and a wide window row on the floors above, and a tile roof on struts.
// Only the faces you can see from the square get windows. Built in the frame of its centre, front toward +x.
// Depends on brickWall.js, doorways.js, windows.js, roofStruts.js, pagodaRoof.js, lod.js and materials.js.

import { material } from '../look/materials.js';
import { detailGroup } from '../core/lod.js';
import { addGlazedBand, onEachFace } from './brickWall.js';
import { addCarvedDoorway } from './doorways.js';
import { addLatticedWindow, addWindowRow } from './windows.js';
import { addPlainStruts, addStrutsAlongWall } from './roofStruts.js';
import { addPagodaRoof } from './pagodaRoof.js';

const smallWindowWidthMetres = 0.7;
const smallWindowHeightMetres = 0.85;
const smallWindowSpacingMetres = 2.2;
const windowRowBayWidthMetres = 0.95;
const shopOpeningHeightMetres = 2.0;
const shopShutterBoardMetres = 0.24;
const roofEaveBelowWallTopMetres = 0.6;
const strutSpacingMetres = 1.4;
const storeyBandHeightMetres = 0.1;

// A shop front: a wide dark opening, its wooden frame, and a few shutter boards left standing in it.
function addShopFront(builder, width, variant) {
  const halfWidth = width / 2;
  builder.material(material.darkRecess).occlusion(0.4).addBox(-0.02, 0.35, -halfWidth, 0.02, shopOpeningHeightMetres, halfWidth);
  builder.material(material.wood, variant).occlusion(0.8);
  builder.addBox(0, 0, -halfWidth - 0.12, 0.12, 0.35, halfWidth + 0.12); // the raised sill people sit on
  builder.addBox(0, shopOpeningHeightMetres, -halfWidth - 0.12, 0.12, shopOpeningHeightMetres + 0.16, halfWidth + 0.12);
  const boardCount = Math.floor(width / shopShutterBoardMetres * 0.35);
  builder.withDetail(detailGroup.nearAndMiddle, () => {
    for (let board = 0; board < boardCount; board++) {
      const z = halfWidth - (board + 0.5) * shopShutterBoardMetres;
      builder.addBox(0.0, 0.35, z - shopShutterBoardMetres / 2 + 0.01, 0.05, shopOpeningHeightMetres, z + shopShutterBoardMetres / 2 - 0.01);
    }
  });
}

// One face's features, storey by storey. halfSpan: half the face's width.
function addFacade(builder, building, halfSpan) {
  const span = halfSpan * 2;
  let storeyBase = 0;
  building.storeyHeights.forEach((storeyHeight, storey) => {
    builder.push().translate(0, storeyBase, 0);
    if (storey === 0) {
      if (building.groundFloor === 'shop') addShopFront(builder, Math.min(span - 1.2, 3.2), building.variant);
      else if (building.groundFloor === 'door') addCarvedDoorway(builder, { width: 0.85, height: 1.7, hasTorana: span > 5 });
    } else if (storey === building.windowRowStorey) {
      const bayCount = Math.max(2, Math.min(building.maximumWindowBays ?? 5, Math.floor((span - 1) / windowRowBayWidthMetres)));
      builder.translate(0, storeyHeight * 0.25, 0);
      addWindowRow(builder, { bayCount, bayWidth: windowRowBayWidthMetres, height: storeyHeight * 0.5, frameMaterial: building.windowFrameMaterial });
    } else {
      const windowCount = Math.max(1, Math.floor(span / smallWindowSpacingMetres));
      for (let window = 0; window < windowCount; window++) {
        builder.push().translate(0, storeyHeight * 0.3, -halfSpan + (window + 0.5) * span / windowCount);
        addLatticedWindow(builder, { width: smallWindowWidthMetres, height: smallWindowHeightMetres });
        builder.pop();
      }
    }
    builder.pop();
    storeyBase += storeyHeight;
  });
}

// building: { halfDepth, halfWidth, storeyHeights: [metres, ground floor first], wallMaterial, variant,
//   detailedFaces: ['front', 'back', 'left', 'right'], groundFloor: 'shop' | 'door' | 'blank',
//   windowRowStorey, roofOverhang, roofHeight, carvedStruts, windowFrameMaterial, maximumWindowBays,
//   facadeBayMetres (repeat the facade every so many metres along long faces) }
export function addNewarBuilding(builder, solids, building) {
  const { halfDepth, halfWidth } = building;
  const wallTop = building.storeyHeights.reduce((sum, height) => sum + height, 0);
  builder.material(building.wallMaterial, building.variant).occlusion(1);
  builder.addCentredBox(halfDepth, 0, wallTop, halfWidth);
  solids.push({ x: 0, z: 0, y: 0, alongFront: halfDepth * 2, across: halfWidth * 2, height: wallTop, shape: 'box' });
  // dark glazed bands mark the floors
  let bandY = 0;
  for (const storeyHeight of building.storeyHeights.slice(0, -1)) {
    bandY += storeyHeight;
    addGlazedBand(builder, halfDepth, halfWidth, bandY - storeyBandHeightMetres, storeyBandHeightMetres, 0.04);
  }

  const roof = {
    eaveHalfX: halfDepth + building.roofOverhang, eaveHalfZ: halfWidth + building.roofOverhang,
    topHalfX: 0.15, topHalfZ: Math.max(0.15, halfWidth - halfDepth * 0.7),
    baseY: wallTop - roofEaveBelowWallTopMetres, height: building.roofHeight, cornerLift: 0.08,
    wallHalfX: halfDepth, wallHalfZ: halfWidth,
  };
  addPagodaRoof(builder, roof);

  onEachFace(builder, halfDepth, halfWidth, 0, (faceName, halfSpan) => {
    if (!building.detailedFaces.includes(faceName)) return;
    // long fronts repeat the facade in bays (the palace); a house is one bay
    const bayCount = Math.max(1, Math.round(halfSpan * 2 / (building.facadeBayMetres ?? Infinity)));
    for (let bay = 0; bay < bayCount; bay++) {
      builder.push().translate(0, 0, -halfSpan + (bay + 0.5) * halfSpan * 2 / bayCount);
      addFacade(builder, building, halfSpan / bayCount);
      builder.pop();
    }
    const struts = {
      count: Math.max(2, Math.floor(halfSpan * 2 / strutSpacingMetres)), halfSpan: halfSpan - 0.3,
      bottomY: roof.baseY - 1.0, eaveX: building.roofOverhang - 0.25, topY: roof.baseY - 0.15, wallX: 0,
    };
    if (building.carvedStruts) addStrutsAlongWall(builder, struts);
    else addPlainStruts(builder, struts);
  });
  return wallTop;
}
