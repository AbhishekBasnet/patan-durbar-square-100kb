// Builds every monument into one world-space mesh, each placed and turned as layout.js says, and collects
// their solid parts as blocks for walking collision and their sunken pits (Manga Hiti, Tusha Hiti) as holes
// in the ground. Depends on layout.js, blocks.js and every monument file.

import { monumentLayout } from '../square/layout.js';
import { createBlock, placeInMonument, rotationForFacing } from '../square/blocks.js';
import { buildBhimsenTemple } from './bhimsenTemple.js';
import { buildVishwanathTemple } from './vishwanathTemple.js';
import { buildKrishnaMandir } from './krishnaMandir.js';
import { buildCharNarayanTemple } from './charNarayanTemple.js';
import { buildHariShankarTemple } from './hariShankarTemple.js';
import { buildOctagonalKrishnaTemple } from './octagonalKrishnaTemple.js';
import { buildGarudaPillar } from './garudaPillar.js';
import { buildKingYoganarendraPillar } from './kingYoganarendraPillar.js';
import { buildTalejuBell } from './talejuBell.js';
import { buildMangaHiti, buildManiMandap } from './mangaHiti.js';
import { buildKeshavNarayanChowk, buildMulChowk, buildSundariChowk } from './royalPalace.js';
import { buildDegutaleTemple, buildTalejuOctagonalTower } from './degutaleTemple.js';

// Each builder is called as (builder, solids, holes, row) in the monument's own frame, front toward +x.
const monumentBuilders = {
  bhimsenTemple: buildBhimsenTemple,
  vishwanathTemple: buildVishwanathTemple,
  krishnaMandir: buildKrishnaMandir,
  charNarayanTemple: buildCharNarayanTemple,
  hariShankarTemple: buildHariShankarTemple,
  octagonalKrishnaTemple: buildOctagonalKrishnaTemple,
  garudaPillar: buildGarudaPillar,
  kingYoganarendraPillar: buildKingYoganarendraPillar,
  talejuBell: buildTalejuBell,
  mangaHiti: buildMangaHiti,
  maniMandapNorth: buildManiMandap,
  maniMandapSouth: buildManiMandap,
  keshavNarayanChowk: buildKeshavNarayanChowk,
  mulChowk: buildMulChowk,
  sundariChowk: buildSundariChowk,
  degutaleTemple: buildDegutaleTemple,
  talejuOctagonalTower: buildTalejuOctagonalTower,
};

// A local rectangle turned with its monument, as a world-space rectangle (monuments turn in near-right angles,
// so the bounding rectangle of the turned corners is close enough for a pit).
function holeToWorld(row, hole) {
  const corners = [[hole.minX, hole.minZ], [hole.maxX, hole.minZ], [hole.minX, hole.maxZ], [hole.maxX, hole.maxZ]]
    .map(([x, z]) => placeInMonument(row, x, z, createBlock({ alongFront: 0, across: 0, height: 0 })));
  const xs = corners.map((corner) => corner.x), zs = corners.map((corner) => corner.z);
  return { minX: Math.min(...xs), maxX: Math.max(...xs), minZ: Math.min(...zs), maxZ: Math.max(...zs), floorY: hole.floorY };
}

// Adds every monument to `builder` (world space). Returns their collision blocks and ground holes.
export function buildMonuments(builder) {
  const solidBlocks = [], groundHoles = [];
  for (const row of monumentLayout) {
    const localSolids = [], localHoles = [];
    builder.beginChunk().push().translate(row.x, 0, row.z).rotateY(rotationForFacing(row.facingDegrees));
    monumentBuilders[row.name](builder, localSolids, localHoles, row);
    builder.pop();
    for (const solid of localSolids) {
      solidBlocks.push(placeInMonument(row, solid.x, solid.z, createBlock({
        shape: solid.shape, y: solid.y, alongFront: solid.alongFront, across: solid.across, height: solid.height, isSolid: true,
      })));
    }
    for (const hole of localHoles) groundHoles.push(holeToWorld(row, hole));
  }
  return { solidBlocks, groundHoles };
}
