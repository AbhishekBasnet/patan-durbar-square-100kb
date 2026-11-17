// The ground of the square: one wide sheet of brick paving (its herringbone pattern and worn paths are drawn
// by brick.wgsl.js), split into tiles so distant parts stay precise. Drains and puddle dips come in step 5.
// Depends on meshBuilder.js, materials.js and layout.js.

import { material } from '../look/materials.js';
import { squareBounds } from './layout.js';

const pavingTileMetres = 12;
const pavingMarginMetres = 72; // paving runs on under the houses and out of sight

export function addPaving(builder) {
  const { west, east, north, south } = squareBounds;
  builder.material(material.paving, 128).occlusion(1);
  for (let x = west - pavingMarginMetres; x < east + pavingMarginMetres; x += pavingTileMetres) {
    for (let z = north - pavingMarginMetres; z < south + pavingMarginMetres; z += pavingTileMetres) {
      const x1 = x + pavingTileMetres, z1 = z + pavingTileMetres;
      builder.addQuad([x, 0, z], [x, 0, z1], [x1, 0, z1], [x1, 0, z]);
    }
  }
}
