// Geometry helpers that turn shapes into vertex arrays for the GPU.
// A mesh here is a flat list of triangle corners (x, y, z); normals are worked out in the fragment
// shader, so a mesh can be stretched and tapered per instance and still light correctly. Depends on nothing.

// A unit prism standing on y = 0 and reaching y = 1, with `sideCount` flat sides whose centres lie
// 1 unit from the axis (so a 4-sided prism is the box from -1 to 1). Instances scale and taper it into
// plinth tiers, walls, roofs and towers.
export function createPrismMesh(sideCount) {
  const cornerRadius = 1 / Math.cos(Math.PI / sideCount);
  const cornerX = [], cornerZ = [];
  for (let side = 0; side < sideCount; side++) {
    const angle = (side + 0.5) * (2 * Math.PI / sideCount);
    cornerX.push(Math.cos(angle) * cornerRadius);
    cornerZ.push(Math.sin(angle) * cornerRadius);
  }
  const corners = [];
  const addTriangle = (a, b, c) => corners.push(...a, ...b, ...c);
  for (let side = 0; side < sideCount; side++) {
    const next = (side + 1) % sideCount;
    const bottomA = [cornerX[side], 0, cornerZ[side]], bottomB = [cornerX[next], 0, cornerZ[next]];
    const topA = [cornerX[side], 1, cornerZ[side]], topB = [cornerX[next], 1, cornerZ[next]];
    // wall, wound counter-clockwise seen from outside
    addTriangle(bottomA, topB, bottomB);
    addTriangle(bottomA, topA, topB);
    // top and bottom caps as fans around the axis
    addTriangle([0, 1, 0], topB, topA);
    addTriangle([0, 0, 0], bottomA, bottomB);
  }
  return new Float32Array(corners);
}
