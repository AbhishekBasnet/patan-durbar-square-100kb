// The tiered pagoda roof: one generator for every pagoda in the square. A hipped tile roof whose slope sags
// gently and whose corners lift, a wooden fascia and a dark soffit with rafters under the eave, the gilded
// finial (gajur), little bells along the eaves, and the long gilded banner (pataka) hanging down the front.
// Bells and rafters are near detail only (lod.js). Built in the monument's frame, front toward +x.
// Depends on meshBuilder.js, lod.js and materials.js.

import { material } from '../look/materials.js';
import { detailGroup } from '../core/lod.js';

const ringCount = 6; // rows of the roof surface from eave to top
const edgeSegmentCount = 8; // pieces along each edge, so the corner lift curves smoothly
const slopeSag = 1.3; // >1: the slope sags, steeper near the top
const fasciaHeightMetres = 0.14;
const rafterSpacingMetres = 0.32;
const bellChainLengthMetres = 0.22;
const bellHeightMetres = 0.16;
const bellLeafLengthMetres = 0.14;

// Point on the roof surface: ring parameter t (0 eave, 1 top) and position s (0..1) along one of four edges.
function roofPoint(roof, t, side, s) {
  const halfX = roof.eaveHalfX + (roof.topHalfX - roof.eaveHalfX) * t;
  const halfZ = roof.eaveHalfZ + (roof.topHalfZ - roof.eaveHalfZ) * t;
  const cornerness = Math.pow(Math.abs(2 * s - 1), 4);
  const y = roof.baseY + roof.height * Math.pow(t, slopeSag) + roof.cornerLift * (1 - t) * (1 - t) * cornerness;
  const along = 2 * s - 1;
  switch (side) {
    case 0: return [halfX, y, -along * halfZ]; // front (+x), from right to left as seen from outside
    case 1: return [-along * halfX, y, -halfZ];
    case 2: return [-halfX, y, along * halfZ];
    default: return [along * halfX, y, halfZ];
  }
}

// roof: eaveHalfX/Z (half size at the eave), topHalfX/Z, baseY (eave height), height, cornerLift,
// wallHalfX/Z (the wall the soffit runs back to).
export function addPagodaRoof(builder, roof) {
  builder.material(material.roofTile, 100 + Math.round(roof.baseY * 7) % 80).occlusion(1);
  for (let side = 0; side < 4; side++) {
    for (let ring = 0; ring < ringCount; ring++) {
      const t0 = ring / ringCount, t1 = (ring + 1) / ringCount;
      for (let segment = 0; segment < edgeSegmentCount; segment++) {
        const s0 = segment / edgeSegmentCount, s1 = (segment + 1) / edgeSegmentCount;
        builder.addQuad(roofPoint(roof, t0, side, s0), roofPoint(roof, t0, side, s1), roofPoint(roof, t1, side, s1), roofPoint(roof, t1, side, s0));
      }
    }
    // fascia: the wooden edge board below the eave line
    builder.material(material.wood, 45).occlusion(0.8);
    for (let segment = 0; segment < edgeSegmentCount; segment++) {
      const a = roofPoint(roof, 0, side, segment / edgeSegmentCount), b = roofPoint(roof, 0, side, (segment + 1) / edgeSegmentCount);
      builder.addQuad([a[0], a[1] - fasciaHeightMetres, a[2]], [b[0], b[1] - fasciaHeightMetres, b[2]], b, a);
    }
    builder.material(material.roofTile, 120).occlusion(1);
  }
  addSoffit(builder, roof);
}

// The underside of the eave, seen from below: dark boards back to the wall, crossed by rafters.
function addSoffit(builder, roof) {
  builder.material(material.wood, 20).occlusion(0.35);
  const y = roof.baseY - fasciaHeightMetres;
  const wallY = roof.baseY + roof.height * 0.25;
  const outer = [[roof.eaveHalfX, -roof.eaveHalfZ], [roof.eaveHalfX, roof.eaveHalfZ], [-roof.eaveHalfX, roof.eaveHalfZ], [-roof.eaveHalfX, -roof.eaveHalfZ]];
  const inner = [[roof.wallHalfX, -roof.wallHalfZ], [roof.wallHalfX, roof.wallHalfZ], [-roof.wallHalfX, roof.wallHalfZ], [-roof.wallHalfX, -roof.wallHalfZ]];
  for (let corner = 0; corner < 4; corner++) {
    const next = (corner + 1) % 4;
    builder.addQuad([outer[corner][0], y, outer[corner][1]], [outer[next][0], y, outer[next][1]], [inner[next][0], wallY, inner[next][1]], [inner[corner][0], wallY, inner[corner][1]]);
  }
  // rafters running out from the wall on the front and back (enough to read as rafters from below)
  builder.material(material.wood, 60).occlusion(0.45);
  const rafterCount = Math.floor(2 * roof.eaveHalfZ / rafterSpacingMetres);
  builder.withDetail(detailGroup.nearOnly, () => {
    for (let rafter = 0; rafter < rafterCount; rafter++) {
      const z = -roof.eaveHalfZ + (rafter + 0.5) * rafterSpacingMetres;
      for (const side of [-1, 1]) {
        builder.addTube([[side * roof.wallHalfX, wallY - 0.06, z], [side * roof.eaveHalfX, y - 0.06, z]], 0.035, 4);
      }
    }
  });
}

// Gilded finial (gajur): base plate, inverted lotus, bell-shaped body, umbrellas and a spike. `height` metres.
export function addGajur(builder, { y, height }) {
  const profile = [
    [0.5, 0], [0.5, 0.05], [0.32, 0.08], [0.38, 0.16], [0.42, 0.26], [0.3, 0.38], [0.16, 0.42], [0.2, 0.5],
    [0.14, 0.56], [0.24, 0.62], [0.1, 0.66], [0.17, 0.72], [0.07, 0.76], [0.1, 0.82], [0.03, 0.88], [0.01, 1],
  ].map(([radius, profileY]) => [radius * height * 0.55, profileY * height]);
  builder.material(material.gilded, 140).occlusion(1);
  builder.push().translate(0, y, 0).addLathe(profile, 12).pop();
}

// Small bronze bells hanging on chains along all four eaves, each with a gilded leaf as its clapper's sail.
export function addEaveBells(builder, roof, spacingMetres) {
  builder.withDetail(detailGroup.nearOnly, () => addEaveBellsAtAllLevels(builder, roof, spacingMetres));
}

function addEaveBellsAtAllLevels(builder, roof, spacingMetres) {
  const bellProfile = [[0.002, 0], [0.04, 0.01], [0.06, 0.05], [0.055, 0.1], [0.035, 0.15], [0.002, 0.16]]
    .map(([radius, profileY]) => [radius, profileY * bellHeightMetres / 0.16]);
  for (let side = 0; side < 4; side++) {
    const half = side % 2 ? roof.eaveHalfX : roof.eaveHalfZ;
    const count = Math.max(1, Math.floor(2 * half / spacingMetres));
    for (let bell = 0; bell < count; bell++) {
      const s = (bell + 0.5) / count;
      const [x, eaveY, z] = roofPoint(roof, 0, side, s);
      const inset = 0.08, length = Math.hypot(x, z);
      const hangX = x - x / length * inset, hangZ = z - z / length * inset;
      const top = eaveY - fasciaHeightMetres, bellTop = top - bellChainLengthMetres;
      builder.material(material.bronze, 90).occlusion(0.9);
      builder.addTube([[hangX, top, hangZ], [hangX, bellTop, hangZ]], 0.006, 3);
      builder.push().translate(hangX, bellTop - bellHeightMetres, hangZ).addLathe(bellProfile, 7).pop();
      builder.material(material.gilded, 170);
      const leafTop = bellTop - bellHeightMetres - 0.03;
      builder.push().translate(hangX, leafTop, hangZ).rotateY(Math.atan2(hangX, hangZ));
      builder.addTriangle([0, 0, 0], [-0.05, -bellLeafLengthMetres * 0.6, 0], [0, -bellLeafLengthMetres, 0]);
      builder.addTriangle([0, 0, 0], [0, -bellLeafLengthMetres, 0], [0.05, -bellLeafLengthMetres * 0.6, 0]);
      builder.addTriangle([0, 0, 0], [0, -bellLeafLengthMetres, 0], [-0.05, -bellLeafLengthMetres * 0.6, 0]);
      builder.addTriangle([0, 0, 0], [0.05, -bellLeafLengthMetres * 0.6, 0], [0, -bellLeafLengthMetres, 0]);
      builder.pop();
    }
  }
}

// The pataka: a long gilded metal banner hanging from the top of the temple down over every roof on the
// front. `roofs` are ordered top first; the banner follows each roof's slope, then drops to the next.
export function addPataka(builder, roofs, { topY, widthMetres, bottomY }) {
  const path = [[0.15, topY]];
  for (const roof of roofs) {
    const xAtTop = Math.max(path[path.length - 1][0], roof.topHalfX);
    // drop onto this roof's surface (or stay on it), then slide down to its eave
    for (let step = 0; step <= 4; step++) {
      const t = 1 - step / 4;
      const halfX = roof.eaveHalfX + (roof.topHalfX - roof.eaveHalfX) * t;
      if (halfX < xAtTop) continue;
      path.push([halfX + 0.05, roof.baseY + roof.height * Math.pow(t, slopeSag) + 0.04]);
    }
  }
  path.push([path[path.length - 1][0] + 0.05, bottomY]);
  builder.material(material.gilded, 200).occlusion(1);
  const half = widthMetres / 2;
  for (let index = 0; index < path.length - 1; index++) {
    const [xA, yA] = path[index], [xB, yB] = path[index + 1];
    builder.addQuad([xA, yA, -half], [xA, yA, half], [xB, yB, half], [xB, yB, -half]); // outer face
    builder.addQuad([xA - 0.01, yA, half], [xA - 0.01, yA, -half], [xB - 0.01, yB, -half], [xB - 0.01, yB, half]); // back face
  }
}
