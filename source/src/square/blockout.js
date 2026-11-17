// TEMPORARY (step 1 of the work order): rough massing of every monument as plain blocks, read from layout.js,
// so the square can be walked before the real generators exist. A monument with its own file in monuments/
// is skipped here; the rest are replaced in step 3. Depends on layout.js and blocks.js.

import { monumentLayout } from './layout.js';
import { createBlock, placeInMonument, blockColors } from './blocks.js';
import { monumentBuilders } from '../monuments/allMonuments.js';

const stepRiseMeters = 0.42; // a plinth step you can walk up
const roofOverhangMeters = 1.2;
const finialHeightMeters = 1.6;

// A stepped plinth of `stepCount` tiers, shrinking by `insetPerStep` on every side. Returns its top height.
function addSteppedPlinth(blocks, row, shape, alongFront, across, stepCount, insetPerStep, color) {
  for (let step = 0; step < stepCount; step++) {
    const inset = step * insetPerStep;
    blocks.push(placeInMonument(row, 0, 0, createBlock({
      shape, y: step * stepRiseMeters, alongFront: alongFront - 2 * inset, across: across - 2 * inset,
      height: stepRiseMeters, color, isSolid: true,
    })));
  }
  return stepCount * stepRiseMeters;
}

// A Newar pagoda temple: stepped plinth, then `tierCount` storeys of brick and wood, each under its own tile roof.
// baseY lifts the first storey, for towers that rise out of the palace roof.
function addPagodaMassing(blocks, row, { stepCount, tierCount, shape = 'box', baseY = 0 }) {
  const plinthInset = 0.35;
  const plinthTop = addSteppedPlinth(blocks, row, shape, row.depth, row.width, stepCount, plinthInset, blockColors.brickPlinth);
  let wallAlongFront = row.depth - 2 * stepCount * plinthInset - 1.2;
  let wallAcross = row.width - 2 * stepCount * plinthInset - 1.2;
  const tierHeight = (row.height - plinthTop - baseY - finialHeightMeters) / tierCount;
  let y = plinthTop + baseY;
  for (let tier = 0; tier < tierCount; tier++) {
    const wallHeight = tierHeight * (tier === 0 ? 0.62 : 0.5);
    blocks.push(placeInMonument(row, 0, 0, createBlock({
      shape, y, alongFront: wallAlongFront, across: wallAcross, height: wallHeight,
      color: tier === 0 ? blockColors.brickWall : blockColors.darkWood, isSolid: tier === 0,
    })));
    y += wallHeight;
    const roofHeight = tierHeight * (tier === 0 ? 0.38 : 0.5);
    const isTopRoof = tier === tierCount - 1;
    blocks.push(placeInMonument(row, 0, 0, createBlock({
      shape, y, alongFront: wallAlongFront + 2 * roofOverhangMeters, across: wallAcross + 2 * roofOverhangMeters,
      height: roofHeight, topScaleAlongFront: isTopRoof ? 0.05 : 0.45, topScaleAcross: isTopRoof ? 0.05 : 0.45,
      color: blockColors.roofTile,
    })));
    y += roofHeight * 0.55;
    wallAlongFront *= 0.68;
    wallAcross *= 0.68;
  }
  blocks.push(placeInMonument(row, 0, 0, createBlock({
    shape: 'cylinder', y: row.height - finialHeightMeters, alongFront: 0.5, across: 0.5,
    height: finialHeightMeters, topScaleAlongFront: 0.1, topScaleAcross: 0.1, color: blockColors.gilded,
  })));
}

// A stone shikhara temple: stepped plinth, storeys of open pavilions, then the tapering tower.
function addShikharaMassing(blocks, row, { stepCount, shape, pavilionLevels }) {
  const plinthTop = addSteppedPlinth(blocks, row, shape, row.depth, row.width, stepCount, 0.3, blockColors.stone);
  let size = row.width - 2 * stepCount * 0.3;
  let y = plinthTop;
  for (let level = 0; level < pavilionLevels; level++) {
    const levelHeight = 3.4 - level * 0.5;
    blocks.push(placeInMonument(row, 0, 0, createBlock({
      shape, y, alongFront: size, across: size, height: levelHeight, color: blockColors.stone, isSolid: level === 0,
    })));
    y += levelHeight;
    size *= 0.8;
  }
  blocks.push(placeInMonument(row, 0, 0, createBlock({
    shape, y, alongFront: size * 0.75, across: size * 0.75, height: row.height - y - finialHeightMeters,
    topScaleAlongFront: 0.15, topScaleAcross: 0.15, color: blockColors.stone,
  })));
  blocks.push(placeInMonument(row, 0, 0, createBlock({
    shape: 'cylinder', y: row.height - finialHeightMeters, alongFront: 0.6, across: 0.6,
    height: finialHeightMeters, topScaleAlongFront: 0.1, topScaleAcross: 0.1, color: blockColors.gilded,
  })));
}

// A stone column on a small base with a gilded figure on top.
function addPillarMassing(blocks, row, { baseHeight, statueHeight }) {
  blocks.push(placeInMonument(row, 0, 0, createBlock({
    y: 0, alongFront: row.depth, across: row.width, height: baseHeight, color: blockColors.stone, isSolid: true,
  })));
  const columnTop = row.height - statueHeight;
  blocks.push(placeInMonument(row, 0, 0, createBlock({
    shape: 'cylinder', y: baseHeight, alongFront: 0.7, across: 0.7, height: columnTop - baseHeight,
    color: blockColors.stone, isSolid: true,
  })));
  blocks.push(placeInMonument(row, 0, 0, createBlock({
    y: columnTop, alongFront: 1, across: 1.2, height: statueHeight, topScaleAlongFront: 0.6, topScaleAcross: 0.6,
    color: blockColors.gilded,
  })));
}

function addTalejuBellMassing(blocks, row) {
  const plinthHeight = 0.6, postHeight = row.height - plinthHeight - 0.5;
  blocks.push(placeInMonument(row, 0, 0, createBlock({
    y: 0, alongFront: row.depth, across: row.width, height: plinthHeight, color: blockColors.stone, isSolid: true,
  })));
  for (const side of [-1, 1]) {
    blocks.push(placeInMonument(row, 0, side * (row.width / 2 - 0.5), createBlock({
      y: plinthHeight, alongFront: 0.5, across: 0.5, height: postHeight, color: blockColors.stone, isSolid: true,
    })));
  }
  blocks.push(placeInMonument(row, 0, 0, createBlock({
    y: plinthHeight + postHeight, alongFront: 0.7, across: row.width, height: 0.5, color: blockColors.stone,
  })));
  blocks.push(placeInMonument(row, 0, 0, createBlock({
    shape: 'cylinder', y: plinthHeight + postHeight - 1.6, alongFront: 1.1, across: 1.1, height: 1.5,
    topScaleAlongFront: 0.55, topScaleAcross: 0.55, color: blockColors.bronze,
  })));
}

// Mani Mandap: a raised stone platform carrying an open wooden pavilion under one tile roof.
function addPavilionMassing(blocks, row) {
  const platformTop = addSteppedPlinth(blocks, row, 'box', row.depth, row.width, 3, 0.3, blockColors.stone);
  const postHeight = 2.4;
  const postInsetAlong = row.depth / 2 - 1.2, postInsetAcross = row.width / 2 - 1.2;
  for (const along of [-1, 1]) {
    for (const across of [-1, 1]) {
      blocks.push(placeInMonument(row, along * postInsetAlong, across * postInsetAcross, createBlock({
        y: platformTop, alongFront: 0.3, across: 0.3, height: postHeight, color: blockColors.darkWood, isSolid: true,
      })));
    }
  }
  blocks.push(placeInMonument(row, 0, 0, createBlock({
    y: platformTop + postHeight, alongFront: row.depth, across: row.width, height: row.height - platformTop - postHeight,
    topScaleAlongFront: 0.08, topScaleAcross: 0.6, color: blockColors.roofTile,
  })));
}

// Manga Hiti for now: a dark patch marking where the sunken spout basin will be dug (step 5).
function addSunkenSpoutMarker(blocks, row) {
  blocks.push(placeInMonument(row, 0, 0, createBlock({
    y: -0.05, alongFront: row.depth, across: row.width, height: 0.08, color: blockColors.wetStone,
  })));
}

// A palace wing block around an open courtyard. `courtyardSize` 0 makes it solid (no walkable courtyard yet).
function addPalaceQuadrangle(blocks, row, { courtyardSize, entranceWidth, roofHeight }) {
  const wallHeight = row.height - roofHeight;
  const addWing = (alongOffset, acrossOffset, alongFront, across, ridgeAlongFront) => {
    blocks.push(placeInMonument(row, alongOffset, acrossOffset, createBlock({
      y: 0, alongFront, across, height: wallHeight, color: blockColors.brickWall, isSolid: true,
    })));
    blocks.push(placeInMonument(row, alongOffset, acrossOffset, createBlock({
      y: wallHeight, alongFront: alongFront + 1.6, across: across + 1.6, height: roofHeight,
      topScaleAlongFront: ridgeAlongFront ? 1 : 0.06, topScaleAcross: ridgeAlongFront ? 0.06 : 1,
      color: blockColors.roofTile,
    })));
  };
  if (!courtyardSize) {
    addWing(0, 0, row.depth, row.width, false);
    return;
  }
  const wingThickness = (row.depth - courtyardSize) / 2;
  const sideOffset = row.depth / 2 - wingThickness / 2;
  // back and side wings
  addWing(-sideOffset, 0, wingThickness, row.width, false);
  for (const side of [-1, 1]) {
    addWing(0, side * (row.width / 2 - wingThickness / 2), courtyardSize, wingThickness, true);
  }
  // front wing facing the square, split by the entrance passage; a lintel block bridges it above head height
  const halfFront = (row.width - entranceWidth) / 2;
  for (const side of [-1, 1]) {
    addWing(sideOffset, side * (entranceWidth / 2 + halfFront / 2), wingThickness, halfFront, false);
  }
  const passageHeight = 3.2;
  blocks.push(placeInMonument(row, sideOffset, 0, createBlock({
    y: passageHeight, alongFront: wingThickness, across: entranceWidth, height: wallHeight - passageHeight,
    color: blockColors.brickWall, isSolid: true,
  })));
}

const massingByMonument = {
  bhimsenTemple: (blocks, row) => addPagodaMassing(blocks, row, { stepCount: 2, tierCount: 3 }),
  vishwanathTemple: (blocks, row) => addPagodaMassing(blocks, row, { stepCount: 5, tierCount: 2 }),
  charNarayanTemple: (blocks, row) => addPagodaMassing(blocks, row, { stepCount: 6, tierCount: 2 }),
  hariShankarTemple: (blocks, row) => addPagodaMassing(blocks, row, { stepCount: 4, tierCount: 3 }),
  krishnaMandir: (blocks, row) => addShikharaMassing(blocks, row, { stepCount: 3, shape: 'box', pavilionLevels: 3 }),
  octagonalKrishnaTemple: (blocks, row) => addShikharaMassing(blocks, row, { stepCount: 3, shape: 'octagon', pavilionLevels: 2 }),
  garudaPillar: (blocks, row) => addPillarMassing(blocks, row, { baseHeight: 0.9, statueHeight: 1.3 }),
  kingYoganarendraPillar: (blocks, row) => addPillarMassing(blocks, row, { baseHeight: 1.2, statueHeight: 2.2 }),
  talejuBell: addTalejuBellMassing,
  mangaHiti: addSunkenSpoutMarker,
  maniMandapNorth: addPavilionMassing,
  maniMandapSouth: addPavilionMassing,
  keshavNarayanChowk: (blocks, row) => addPalaceQuadrangle(blocks, row, { courtyardSize: 0, roofHeight: 2.2 }),
  mulChowk: (blocks, row) => addPalaceQuadrangle(blocks, row, { courtyardSize: 0, roofHeight: 2.2 }),
  sundariChowk: (blocks, row) => addPalaceQuadrangle(blocks, row, { courtyardSize: 16, entranceWidth: 2.4, roofHeight: 2.2 }),
  degutaleTemple: (blocks, row) => addPagodaMassing(blocks, row, { stepCount: 0, tierCount: 3, baseY: 9 }),
  talejuOctagonalTower: (blocks, row) => addPagodaMassing(blocks, row, { stepCount: 0, tierCount: 3, shape: 'octagon', baseY: 8 }),
};

export function buildMonumentBlockout() {
  const blocks = [];
  for (const row of monumentLayout) {
    if (!monumentBuilders[row.name]) massingByMonument[row.name](blocks, row);
  }
  return blocks;
}
