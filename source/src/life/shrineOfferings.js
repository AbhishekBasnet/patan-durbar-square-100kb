// Offerings at the temple doors, as on any ordinary day: a marigold garland sagging across each doorway, two
// butter lamps whose flames flicker on the top step, loose flowers, rice and red tika powder, and incense sticks
// whose smoke rises from smokeSources (drawn by dust.wgsl.js). Built into the scene once.
// Depends on materials.js, lod.js, layout.js, blocks.js, the temple tables and math.js.

import { material } from '../look/materials.js';
import { detailGroup } from '../core/lod.js';
import { monumentLayout } from '../square/layout.js';
import { placeInMonument, createBlock, rotationForFacing } from '../square/blocks.js';
import { charNarayanTemple } from '../monuments/charNarayanTemple.js';
import { hariShankarTemple } from '../monuments/hariShankarTemple.js';
import { vishwanathTemple } from '../monuments/vishwanathTemple.js';
import { bhimsenTemple } from '../monuments/bhimsenTemple.js';
import { createRandom } from '../core/math.js';

const offeringSeed = 1988;
const garlandFlowerCount = 22;
const garlandSagMetres = 0.35;
const doorFramesHeightMetres = 0.39; // the carved frames above a doorway's opening (doorways.js)
const lampOffsetMetres = 0.45; // either side of the door
const incenseHeightMetres = 0.22;
const flowersPerSpot = 9;

// Each pagoda's front door: in front of its brick core, on top of its plinth.
const pagodas = [['charNarayanTemple', charNarayanTemple], ['hariShankarTemple', hariShankarTemple], ['vishwanathTemple', vishwanathTemple], ['bhimsenTemple', bhimsenTemple]];

function doorSpots() {
  const rowsByName = Object.fromEntries(monumentLayout.map((row) => [row.name, row]));
  return pagodas.map(([name, temple]) => ({
    row: rowsByName[name],
    doorFront: temple.storeys[0].halfDepth,
    floor: temple.plinth.tierCount * temple.plinth.tierRiseMetres,
    doorWidth: temple.doorway.width,
    lintel: temple.doorway.height + doorFramesHeightMetres,
  }));
}

// Where each incense stick's smoke starts, in world space: [x, y, z] per stick.
export function incenseSmokeSources() {
  return doorSpots().map(({ row, doorFront, floor }) => {
    const spot = placeInMonument(row, doorFront + 0.32, 0.12, createBlock({}));
    return [spot.x, floor + incenseHeightMetres, spot.z];
  });
}

export function addShrineOfferings(builder) {
  const random = createRandom(offeringSeed);
  for (const { row, doorFront, floor, doorWidth, lintel } of doorSpots()) {
    builder.beginChunk().push().translate(row.x, 0, row.z).rotateY(rotationForFacing(row.facingDegrees)).translate(doorFront, floor, 0);
    builder.withDetail(detailGroup.nearAndMiddle, () => {
      // the garland, from one corner of the door frame to the other
      const halfSpan = doorWidth / 2 + 0.35;
      builder.material(material.marigold, 128);
      for (let flower = 0; flower < garlandFlowerCount; flower++) {
        const t = flower / (garlandFlowerCount - 1), z = -halfSpan + t * halfSpan * 2;
        const y = lintel + 0.1 - Math.sin(t * Math.PI) * garlandSagMetres;
        builder.push().translate(0.36, y, z).scale(0.045).addSphere(5, 3).pop();
      }
      // butter lamps: brass dishes with their flames
      for (const side of [-1, 1]) {
        builder.material(material.bronze, 140).push().translate(0.5, 0, side * lampOffsetMetres).addLathe([[0.045, 0], [0.055, 0.025], [0.0, 0.02]], 8).pop();
        builder.material(material.flame, 128).push().translate(0.5, 0.025, side * lampOffsetMetres).addLathe([[0.012, 0], [0.01, 0.025], [0, 0.05]], 6).pop();
      }
    });
    builder.withDetail(detailGroup.nearOnly, () => {
      for (let flower = 0; flower < flowersPerSpot; flower++) {
        builder.material(flower % 4 ? material.marigold : material.redClay, Math.floor(random() * 255));
        builder.push().translate(random.between(0.25, 0.6), 0.02, random.between(-0.4, 0.4)).scale(0.035, 0.022, 0.035).addSphere(5, 3).pop();
      }
      builder.material(material.plaster, 230).push().translate(0.62, 0, 0.25).addLathe([[0.06, 0], [0, 0.03]], 6).pop(); // rice
      builder.material(material.redClay, 200).push().translate(0.62, 0, -0.25).addLathe([[0.045, 0], [0, 0.025]], 6).pop(); // tika powder
      builder.material(material.wood, 30).addTube([[0.32, 0, 0.12], [0.32, incenseHeightMetres, 0.12]], 0.004, 3); // incense
    });
    builder.pop();
  }
}
