// The ground of the square: one wide sheet of brick paving (its herringbone pattern and worn paths are drawn
// by brick.wgsl.js), split into tiles so distant parts stay precise, with the sunken pits (Manga Hiti,
// Tusha Hiti) cut out of it. Drains and puddle dips come in step 5.
// Depends on materials.js and layout.js.

import { material } from '../look/materials.js';
import { squareBounds } from './layout.js';

const pavingTileMetres = 12;
const pavingMarginMetres = 72; // paving runs on under the houses and out of sight

// What is left of rectangle `piece` after cutting `hole` out of it: up to four rectangles.
function subtractRectangle(piece, hole) {
  if (hole.maxX <= piece.minX || hole.minX >= piece.maxX || hole.maxZ <= piece.minZ || hole.minZ >= piece.maxZ) return [piece];
  const left = [];
  if (hole.minX > piece.minX) left.push({ ...piece, maxX: hole.minX });
  if (hole.maxX < piece.maxX) left.push({ ...piece, minX: hole.maxX });
  const middleMinX = Math.max(piece.minX, hole.minX), middleMaxX = Math.min(piece.maxX, hole.maxX);
  if (hole.minZ > piece.minZ) left.push({ minX: middleMinX, maxX: middleMaxX, minZ: piece.minZ, maxZ: hole.minZ });
  if (hole.maxZ < piece.maxZ) left.push({ minX: middleMinX, maxX: middleMaxX, minZ: hole.maxZ, maxZ: piece.maxZ });
  return left;
}

export function addPaving(builder, groundHoles) {
  const { west, east, north, south } = squareBounds;
  builder.material(material.paving, 128).occlusion(1);
  for (let x = west - pavingMarginMetres; x < east + pavingMarginMetres; x += pavingTileMetres) {
    for (let z = north - pavingMarginMetres; z < south + pavingMarginMetres; z += pavingTileMetres) {
      let pieces = [{ minX: x, maxX: x + pavingTileMetres, minZ: z, maxZ: z + pavingTileMetres }];
      for (const hole of groundHoles) pieces = pieces.flatMap((piece) => subtractRectangle(piece, hole));
      for (const { minX, maxX, minZ, maxZ } of pieces) {
        builder.addQuad([minX, 0, minZ], [minX, 0, maxZ], [maxX, 0, maxZ], [maxX, 0, minZ]);
      }
    }
  }
}
