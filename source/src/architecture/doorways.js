// Carved Newar doorways: nested wooden frames with carved relief, the lintel and sill reaching out past the
// jambs, closed dark door leaves, a stone threshold, and the semicircular torana above with its deity.
// Built on a wall face at x = 0 looking along +x, bottom at y = 0. No interiors: the doors stay shut.
// Depends on meshBuilder.js and materials.js.

import { material } from '../look/materials.js';

const frameCount = 3; // nested frames, each a step further out from the wall
const frameMemberWidthMetres = 0.13;
const frameStepOutMetres = 0.06;
const lintelReachMetres = 0.28; // how far lintels and sills run past the jambs
const thresholdHeightMetres = 0.16;
const toranaThicknessMetres = 0.07;
const toranaSegmentCount = 9;

// One rectangular frame around an opening: two jambs, a lintel and a sill (lintel and sill reach past).
export function addCarvedFrame(builder, { halfWidth, bottom, top, depth, memberWidth, reach, frameMaterial = material.wood }) {
  builder.material(frameMaterial, 70, 1).occlusion(0.9);
  for (const side of [-1, 1]) {
    builder.addBox(0, bottom, side * halfWidth - (side > 0 ? 0 : memberWidth), depth, top, side * halfWidth + (side > 0 ? memberWidth : 0));
  }
  builder.addBox(0, top, -halfWidth - memberWidth - reach, depth, top + memberWidth, halfWidth + memberWidth + reach);
  builder.addBox(0, bottom - memberWidth, -halfWidth - memberWidth - reach, depth, bottom, halfWidth + memberWidth + reach);
}

// The torana: a half-disc panel of carved wood standing on the lintel, with a seated figure at its centre.
export function addTorana(builder, { radius, y, isGilded }) {
  builder.push().translate(0.02, y, 0);
  builder.material(isGilded ? material.gilded : material.wood, 160, 1).occlusion(0.95);
  for (let segment = 0; segment < toranaSegmentCount; segment++) {
    const angleA = Math.PI * segment / toranaSegmentCount, angleB = Math.PI * (segment + 1) / toranaSegmentCount;
    const outer = (angle) => [0, Math.sin(angle) * radius, Math.cos(angle) * radius];
    const [, yA, zA] = outer(angleA), [, yB, zB] = outer(angleB);
    builder.addTriangle([toranaThicknessMetres, 0, 0], [toranaThicknessMetres, yB, zB], [toranaThicknessMetres, yA, zA]);
    builder.addQuad([0, yA, zA], [toranaThicknessMetres, yA, zA], [toranaThicknessMetres, yB, zB], [0, yB, zB]);
  }
  // the deity: body and head in relief, under a little halo
  builder.material(isGilded ? material.gilded : material.wood, 190, 1);
  builder.push().translate(toranaThicknessMetres, radius * 0.32, 0).scale(0.06, radius * 0.22, radius * 0.16).addSphere(6, 4).pop();
  builder.push().translate(toranaThicknessMetres + 0.02, radius * 0.62, 0).scale(radius * 0.09).addSphere(6, 4).pop();
  builder.push().translate(toranaThicknessMetres - 0.01, radius * 0.66, 0).scale(0.02, radius * 0.2, radius * 0.2).addSphere(8, 3).pop();
  builder.pop();
}

// A complete doorway of clear opening width x height.
// isGilded gilds the torana; frameMaterial can gild the frames too (the palace's golden gate).
export function addCarvedDoorway(builder, { width, height, hasTorana = true, isGilded = false, frameMaterial = material.wood }) {
  const halfWidth = width / 2;
  // closed door leaves, set back behind the frames, with the dark gap between them
  builder.material(material.wood, 40).occlusion(0.55);
  builder.addBox(-0.02, thresholdHeightMetres, -halfWidth, 0.03, height, halfWidth);
  builder.material(material.darkRecess).addBox(0.03, thresholdHeightMetres, -0.012, 0.035, height, 0.012);
  builder.material(material.stone, 150).occlusion(0.9);
  builder.addBox(0, 0, -halfWidth - 0.2, 0.32, thresholdHeightMetres, halfWidth + 0.2);
  for (let frame = 0; frame < frameCount; frame++) {
    const grow = frame * frameMemberWidthMetres;
    addCarvedFrame(builder, {
      halfWidth: halfWidth + grow, bottom: thresholdHeightMetres, top: height + grow,
      depth: 0.05 + (frameCount - frame) * frameStepOutMetres, memberWidth: frameMemberWidthMetres,
      reach: frame === frameCount - 1 ? lintelReachMetres : 0, frameMaterial,
    });
  }
  const outerTop = height + frameCount * frameMemberWidthMetres;
  if (hasTorana) addTorana(builder, { radius: halfWidth + 0.25, y: outerTop, isGilded });
  return outerTop + (hasTorana ? halfWidth + 0.25 : 0);
}
