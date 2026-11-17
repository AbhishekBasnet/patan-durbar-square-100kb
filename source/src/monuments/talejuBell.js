// The Taleju Bell, 1736: a big bronze bell hung from a stone beam between two stone posts, on a low platform
// in front of the palace. Depends on materials.js.

import { material } from '../look/materials.js';

export const talejuBell = { platformHeight: 0.5, postHeight: 3.6, postHalfSize: 0.24, beamHeight: 0.4, bellRadius: 0.55, bellHeight: 1.0 };

export function buildTalejuBell(builder, solids) {
  const bell = talejuBell, halfAcross = 2.2, halfAlong = 1.3;
  builder.material(material.stone, 110).occlusion(0.9);
  builder.addCentredBox(halfAlong, 0, bell.platformHeight, halfAcross);
  solids.push({ x: 0, z: 0, y: 0, alongFront: halfAlong * 2, across: halfAcross * 2, height: bell.platformHeight, shape: 'box' });
  const postTop = bell.platformHeight + bell.postHeight, postOffset = halfAcross - 0.5;
  builder.material(material.stone, 140).occlusion(1);
  for (const side of [-1, 1]) {
    builder.push().translate(0, 0, side * postOffset);
    builder.addCentredBox(bell.postHalfSize, bell.platformHeight, postTop, bell.postHalfSize);
    builder.pop();
    solids.push({ x: 0, z: side * postOffset, y: 0, alongFront: bell.postHalfSize * 2, across: bell.postHalfSize * 2, height: postTop, shape: 'box' });
  }
  builder.addBox(-0.3, postTop, -postOffset - 0.35, 0.3, postTop + bell.beamHeight, postOffset + 0.35);
  // the bell: a waisted bronze shape with a flared lip, hanging on a short iron loop
  const bellTop = postTop - 0.25, bellBottom = bellTop - bell.bellHeight;
  builder.material(material.bronze, 100);
  builder.addTube([[0, postTop, 0], [0, bellTop, 0]], 0.04, 4);
  builder.push().translate(0, bellBottom, 0).addLathe([
    [bell.bellRadius * 1.05, 0], [bell.bellRadius, 0.08], [bell.bellRadius * 0.8, 0.4], [bell.bellRadius * 0.7, 0.75], [bell.bellRadius * 0.45, 0.95], [0.02, 1.0],
  ].map(([radius, share]) => [radius, share * bell.bellHeight]), 16).pop();
}
