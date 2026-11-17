// Stone shikhara architecture: the curving tower with stepped projections on each face, banded storeys,
// a ribbed amalaka cushion and a gilded pot (kalasha) on top; the octagonal stone pillars; open colonnaded
// storeys around a closed core; and the small pillared kiosks, each crowned by its own little shikhara.
// Built in the monument's frame, front toward +x. Depends on meshBuilder.js, materials.js, doorways.js.

import { material } from '../look/materials.js';
import { addCarvedDoorway } from './doorways.js';
import { onEachFace } from './brickWall.js';

const towerSegmentCount = 48; // around the tower: enough for crisp projections
const towerBandCount = 7; // storeys (bhumi) marked by ledges up the tower
const towerTaper = 0.62; // share of the base radius lost by the top
const towerCurve = 1.8; // >1: straight at the bottom, curving in toward the top
const amalakaRibCount = 28;
const pillarSideCount = 8;
const capitalHeightMetres = 0.22;
const entablatureHeightMetres = 0.42;

// Stepped square plan: the middle of each face pushed out twice (the ratha projections).
function steppedSquareRadius(angle, projection) {
  const cosine = Math.abs(Math.cos(angle)), sine = Math.abs(Math.sin(angle));
  const along = cosine > sine ? sine / cosine : cosine / sine; // 0 at a face's middle, 1 at the corner
  const pushOut = along < 0.3 ? 2 * projection : along < 0.62 ? projection : 0;
  return (1 / Math.max(cosine, sine)) * (1 + pushOut);
}

// The tower: `halfWidth` at the base, `height` tall, standing on y.
export function addShikharaTower(builder, { y, halfWidth, height, withAmalaka = true }) {
  const profile = [];
  for (let band = 0; band < towerBandCount; band++) {
    for (const [share, ledge] of [[0, 1.04], [0.12, 1.0], [1, 1.0]]) {
      const t = (band + share * 0.999) / towerBandCount;
      profile.push([halfWidth * (1 - towerTaper * Math.pow(t, towerCurve)) * ledge, t * height]);
    }
  }
  builder.material(material.stone, 128).occlusion(1);
  builder.push().translate(0, y, 0).addLathe(profile, towerSegmentCount, (angle) => steppedSquareRadius(angle, 0.07));
  const topRadius = halfWidth * (1 - towerTaper);
  if (withAmalaka) {
    // ribbed cushion, then the gilded pot and spike
    const amalakaProfile = [[topRadius * 0.7, height], [topRadius * 1.1, height + topRadius * 0.2], [topRadius * 1.05, height + topRadius * 0.4], [topRadius * 0.5, height + topRadius * 0.5]];
    builder.addLathe(amalakaProfile, amalakaRibCount * 2, (angle) => 1 + 0.06 * Math.cos(angle * amalakaRibCount));
    const potBase = height + topRadius * 0.5;
    const kalasha = [[0.28, 0], [0.42, 0.25], [0.3, 0.55], [0.14, 0.65], [0.2, 0.75], [0.06, 0.95], [0.08, 1.1], [0.01, 1.5]]
      .map(([radius, potY]) => [radius * topRadius * 1.2, potBase + potY * topRadius * 1.6]);
    builder.material(material.gilded, 150).addLathe(kalasha, 12);
  }
  builder.pop();
  return y + height;
}

// An octagonal stone pillar with a square base and a bracket capital. Also listed as a round solid.
export function addStonePillar(builder, solids, { x, z, y, height, radius }) {
  builder.material(material.stone, 115).occlusion(0.9);
  builder.push().translate(x, y, z);
  builder.addCentredBox(radius * 1.3, 0, 0.25, radius * 1.3);
  builder.addPrism(pillarSideCount, radius, height - capitalHeightMetres, 1, 1, false);
  builder.addCentredBox(radius * 1.6, height - capitalHeightMetres, height, radius * 1.6);
  builder.pop();
  solids.push({ x, z, y, alongFront: radius * 2, across: radius * 2, height, shape: 'cylinder' });
}

// An open storey: pillars round the edge of a square of `halfSize`, a stone entablature on top, and a closed
// stone core (halfSize `coreHalfSize`) inside with a dark doorway on each face. Returns the floor height above.
export function addColonnadeStorey(builder, solids, { y, halfSize, height, pillarsPerSide, coreHalfSize, doorway }) {
  const span = 2 * halfSize - 0.5;
  for (let side = 0; side < 4; side++) {
    for (let pillar = 0; pillar < pillarsPerSide; pillar++) {
      const along = -span / 2 + span * pillar / (pillarsPerSide - 1);
      const [x, z] = [[halfSize - 0.25, along], [along, halfSize - 0.25], [-halfSize + 0.25, -along], [-along, -halfSize + 0.25]][side];
      addStonePillar(builder, solids, { x, z, y, height, radius: 0.16 });
    }
  }
  builder.material(material.stone, 135).occlusion(0.95);
  builder.addCentredBox(halfSize, y + height, y + height + entablatureHeightMetres, halfSize);
  builder.material(material.stone, 100).occlusion(0.5);
  builder.addCentredBox(coreHalfSize, y, y + height, coreHalfSize);
  solids.push({ x: 0, z: 0, y, alongFront: coreHalfSize * 2, across: coreHalfSize * 2, height, shape: 'box' });
  if (doorway) onEachFace(builder, coreHalfSize, coreHalfSize, y, () => addCarvedDoorway(builder, { ...doorway, hasTorana: false }));
  return y + height + entablatureHeightMetres;
}

// A small kiosk (mandapa): four pillars, a slab, and a little shikhara roof.
export function addKiosk(builder, { x, z, y, halfSize, pillarHeight, roofHeight }) {
  builder.push().translate(x, 0, z);
  const ignoredSolids = [];
  for (const [cornerX, cornerZ] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
    addStonePillar(builder, ignoredSolids, { x: cornerX * (halfSize - 0.1), z: cornerZ * (halfSize - 0.1), y, height: pillarHeight, radius: 0.08 });
  }
  builder.material(material.stone, 140).addCentredBox(halfSize + 0.05, y + pillarHeight, y + pillarHeight + 0.18, halfSize + 0.05);
  addShikharaTower(builder, { y: y + pillarHeight + 0.18, halfWidth: halfSize * 0.85, height: roofHeight });
  builder.pop();
}
