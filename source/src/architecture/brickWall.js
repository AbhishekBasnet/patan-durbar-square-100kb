// Brick wall pieces: a rectangular brick core (the brick bond itself is drawn by brick.wgsl.js) wrapped
// in bands of dark glazed "dachi apa" brick at the base and in stepped cornices at the top.
// Built in the monument's frame, front toward +x. Depends on meshBuilder.js and materials.js.

import { material } from '../look/materials.js';

const baseBandHeightMetres = 0.18;
const baseBandProtrusionMetres = 0.05;
const corniceCourseHeightMetres = 0.12;
const corniceStepOutMetres = 0.06; // each course of the cornice sticks out this much more than the one below

// A glazed band all around a rectangular core: a slightly larger box.
export function addGlazedBand(builder, halfDepth, halfWidth, bottom, height, protrusion) {
  builder.material(material.glazedBrick, 128).occlusion(0.95);
  builder.addCentredBox(halfDepth + protrusion, bottom, bottom + height, halfWidth + protrusion);
}

// A brick core from `bottom` up `height` metres, with a glazed base band and a stepped glazed cornice.
// Returns the height of its top.
export function addBrickCore(builder, solids, { halfDepth, halfWidth, bottom, height, corniceCourses = 2, variant = 128 }) {
  builder.material(material.brick, variant).occlusion(1);
  builder.addCentredBox(halfDepth, bottom, bottom + height, halfWidth);
  addGlazedBand(builder, halfDepth, halfWidth, bottom, baseBandHeightMetres, baseBandProtrusionMetres);
  for (let course = 0; course < corniceCourses; course++) {
    const courseBottom = bottom + height - (corniceCourses - course) * corniceCourseHeightMetres;
    addGlazedBand(builder, halfDepth, halfWidth, courseBottom, corniceCourseHeightMetres, (course + 1) * corniceStepOutMetres);
  }
  solids.push({ x: 0, z: 0, y: bottom, alongFront: halfDepth * 2, across: halfWidth * 2, height, shape: 'box' });
  return bottom + height;
}

// Runs `addFeature` once on each of the four faces of a rectangular core, with the builder turned so the face
// looks along +x and the origin sits on the face at the given height.
export function onEachFace(builder, halfDepth, halfWidth, y, addFeature) {
  const faces = [[0, halfDepth, 'front'], [Math.PI, halfDepth, 'back'], [Math.PI / 2, halfWidth, 'right'], [-Math.PI / 2, halfWidth, 'left']];
  for (const [angle, distance, faceName] of faces) {
    builder.push().rotateY(angle).translate(distance, y, 0);
    addFeature(faceName, angle === 0 || angle === Math.PI ? halfWidth : halfDepth);
    builder.pop();
  }
}
