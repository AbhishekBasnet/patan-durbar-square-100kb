// The solid block used for walking collision: a box or a round post (octagon, cylinder) with a position,
// turn and size, placed relative to a monument from layout.js. camera.js turns these into colliders.
// Depends on math.js.

import { degreesToRadians } from '../core/math.js';

// alongFront / across: full size along the monument's facing direction and across it, in metres.
export function createBlock({ shape = 'box', x = 0, y = 0, z = 0, rotation = 0, alongFront, across, height, isSolid = false }) {
  return { shape, x, y, z, rotation, alongFront, across, height, isSolid };
}

// Rotation that turns a block's front (its local +x) toward a compass direction.
export function rotationForFacing(facingDegrees) {
  return (facingDegrees - 90) * degreesToRadians;
}

// Moves a block to a spot given in the monument's own frame (metres in front of and to the right of its centre).
export function placeInMonument(row, localAlongFront, localAcross, block) {
  const rotation = rotationForFacing(row.facingDegrees);
  const cosine = Math.cos(rotation), sine = Math.sin(rotation);
  block.x = row.x + localAlongFront * cosine - localAcross * sine;
  block.z = row.z + localAlongFront * sine + localAcross * cosine;
  block.rotation = rotation;
  return block;
}
