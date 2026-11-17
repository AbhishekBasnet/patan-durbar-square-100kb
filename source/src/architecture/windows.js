// Newar windows: latticed screens (the dark diagonal lattice is drawn by wood.wgsl.js) inside carved frames
// whose lintels and sills reach out past the jambs, and the wide multi-bay windows of palace fronts.
// Built on a wall face at x = 0 looking along +x, bottom of the opening at y = 0.
// Depends on doorways.js (the shared frame), lod.js and materials.js.

import { material } from '../look/materials.js';
import { detailGroup } from '../core/lod.js';
import { addCarvedFrame } from './doorways.js';

const latticeSetBackMetres = 0.04;
const frameDepthMetres = 0.14;
const frameMemberWidthMetres = 0.1;
const lintelReachMetres = 0.18;

// frameMaterial: wood, or gilded for the palace's golden window.
export function addLatticedWindow(builder, { width, height, frameMaterial = material.wood }) {
  const halfWidth = width / 2;
  builder.material(material.wood, 60, 2).occlusion(0.8);
  builder.addBox(-0.05, 0, -halfWidth, frameDepthMetres - latticeSetBackMetres, height, halfWidth);
  // far away only the dark lattice panel is left
  builder.withDetail(detailGroup.nearAndMiddle, () => addCarvedFrame(builder, {
    halfWidth, bottom: 0, top: height, depth: frameDepthMetres, memberWidth: frameMemberWidthMetres, reach: lintelReachMetres, frameMaterial,
  }));
}

// A row of latticed bays under one long lintel (the palace's upper floors).
export function addWindowRow(builder, { bayCount, bayWidth, height, frameMaterial }) {
  const totalWidth = bayCount * bayWidth;
  for (let bay = 0; bay < bayCount; bay++) {
    builder.push().translate(0, 0, -totalWidth / 2 + (bay + 0.5) * bayWidth);
    addLatticedWindow(builder, { width: bayWidth - frameMemberWidthMetres * 2, height, frameMaterial });
    builder.pop();
  }
}
