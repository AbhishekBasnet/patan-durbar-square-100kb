// The plain block: a box, octagon or cylinder that can taper toward its top, used for the step-1 massing
// and the surrounding houses. Also places blocks relative to a monument from layout.js and packs them
// into GPU instance data. Depends on math.js.

import { degreesToRadians } from '../core/math.js';

// Linear-light colours of the rough materials, until the real materials arrive in step 2.
export const blockColors = {
  brickWall: [0.36, 0.12, 0.07],
  brickPlinth: [0.30, 0.11, 0.07],
  plaster: [0.55, 0.48, 0.38],
  darkWood: [0.07, 0.04, 0.025],
  roofTile: [0.16, 0.09, 0.06],
  stone: [0.30, 0.28, 0.25],
  wetStone: [0.06, 0.06, 0.055],
  gilded: [0.75, 0.48, 0.15],
  bronze: [0.30, 0.20, 0.10],
  paving: [0.28, 0.13, 0.08],
};

export const blockShapes = ['box', 'octagon', 'cylinder'];
export const sidesPerShape = { box: 4, octagon: 8, cylinder: 16 };

// alongFront / across: full size along the monument's facing direction and across it, in metres.
// topScale*: how much of the base size is left at the top (1 straight walls, 0 a point).
export function createBlock({
  shape = 'box', x = 0, y = 0, z = 0, rotation = 0, alongFront, across, height,
  topScaleAlongFront = 1, topScaleAcross = 1, color, isSolid = false,
}) {
  return { shape, x, y, z, rotation, alongFront, across, height, topScaleAlongFront, topScaleAcross, color, isSolid };
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

export const floatsPerBlockInstance = 12;

// One Float32Array of instance data per shape; the layout matches the vertex attributes in blockout.wgsl.js.
export function packBlockInstances(blocks) {
  const instancesByShape = {};
  for (const shape of blockShapes) {
    const shapeBlocks = blocks.filter((block) => block.shape === shape);
    const data = new Float32Array(shapeBlocks.length * floatsPerBlockInstance);
    shapeBlocks.forEach((block, index) => {
      data.set([
        block.x, block.y, block.z, block.rotation,
        block.alongFront / 2, block.height, block.across / 2, block.topScaleAlongFront,
        block.topScaleAcross, ...block.color,
      ], index * floatsPerBlockInstance);
    });
    instancesByShape[shape] = data;
  }
  return instancesByShape;
}
