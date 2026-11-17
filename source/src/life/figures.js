// The figure generator: the vendors (people) and the pigeons, built from code. Every vertex says which colour
// slot it takes from its instance (skin, top, bottom, hat, accent, or a fixed colour), which body part it
// belongs to (so the GPU can move arms, heads and wings), and which optional accessory it is (shown only when
// the instance asks for it).
// Depends on meshBuilder.js; figure.wgsl.js reads the same numbers.

import { MeshBuilder } from '../core/meshBuilder.js';

// Colour slots (vertex material byte 0): the first five come from the instance, the rest are fixed.
export const colorSlot = { skin: 0, top: 1, bottom: 2, hat: 3, accent: 4, hair: 5, darkMetal: 6 };

// Moving parts (vertex material byte 2). Each kind of figure gives each part its own pivot (partPivots).
export const bodyPart = { fixed: 0, leftLeg: 1, rightLeg: 2, leftArm: 3, rightArm: 4, head: 5, leftWing: 6, rightWing: 7 };
export const bodyPartCount = 8;

// Optional accessories (vertex material byte 3): shown when bit n of the instance's accessory mask is set.
export const accessory = { always: 0, skirt: 1, dhakaTopi: 2, shawl: 3, hairBun: 4, foldedWings: 5, spreadWings: 6 };

export const figureKind = { person: 0, pigeon: 1 };
export const figureKindCount = 2;

// What a figure is doing (instance pose): vendors sit; pigeons peck or fly.
export const pose = { sit: 2, fly: 5, peck: 6 };

// Pivot of each moving part per kind: [x forward, y up, swing amplitude (radians), phase offset (radians)].
// A person is built 1 unit tall and scaled per instance; pigeons are built in metres.
export const partPivots = {
  [figureKind.person]: {
    [bodyPart.leftLeg]: [0, 0.5, 0.42, 0], [bodyPart.rightLeg]: [0, 0.5, 0.42, Math.PI],
    [bodyPart.leftArm]: [0, 0.81, 0.35, Math.PI], [bodyPart.rightArm]: [0, 0.81, 0.35, 0], [bodyPart.head]: [0, 0.86, 0.08, 0],
  },
  [figureKind.pigeon]: { [bodyPart.head]: [0.05, 0.14, 0.6, 0], [bodyPart.leftWing]: [0, 0.12, 1.1, 0], [bodyPart.rightWing]: [0, 0.12, 1.1, 0] },
};

// The flat pivot table for the shader: figureKindCount x bodyPartCount vec4s.
export function packPartPivots() {
  const table = [];
  for (let kind = 0; kind < figureKindCount; kind++) {
    for (let part = 0; part < bodyPartCount; part++) table.push(...(partPivots[kind]?.[part] ?? [0, 0, 0, 0]));
  }
  return table;
}

// Adds geometry made by `build` as one part with one colour slot and accessory. MeshBuilder writes 0 into the
// fourth material byte, so the accessory id is patched in afterwards.
export function part(builder, slot, partId, accessoryId, build) {
  const start = builder.vertexCount;
  builder.material(slot, 128, partId);
  build();
  for (let vertex = start; vertex < builder.vertexCount; vertex++) builder.materials[vertex * 4 + 3] = accessoryId;
}

// A person 1 unit tall, facing +x. `segments` sets how round the limbs are (8 near, 4 far).
// Vendors sit, so the legs and arms are posed by the shader (figure.wgsl.js).
export function buildPersonMesh(segments) {
  const builder = new MeshBuilder().beginChunk();
  const rings = Math.max(3, segments >> 1);
  for (const [legPart, side] of [[bodyPart.leftLeg, 1], [bodyPart.rightLeg, -1]]) {
    part(builder, colorSlot.bottom, legPart, accessory.always, () => {
      builder.addTube([[0, 0.5, side * 0.055], [0.01, 0.25, side * 0.06], [0, 0.04, side * 0.06]], 0.045, segments);
    });
    part(builder, colorSlot.skin, legPart, accessory.always, () => builder.addBox(-0.03, 0, side * 0.06 - 0.03, 0.08, 0.035, side * 0.06 + 0.03)); // feet
  }
  part(builder, colorSlot.bottom, bodyPart.fixed, accessory.skirt, () => {
    builder.addLathe([[0.2, 0.02], [0.16, 0.3], [0.13, 0.52], [0.0, 0.53]], segments); // sari, haku patasi, pinafore
  });
  part(builder, colorSlot.top, bodyPart.fixed, accessory.always, () => {
    builder.push().scale(0.9, 1, 1.25).addLathe([[0.0, 0.47], [0.11, 0.49], [0.13, 0.62], [0.12, 0.78], [0.08, 0.84], [0.0, 0.85]], segments).pop(); // torso
  });
  part(builder, colorSlot.accent, bodyPart.fixed, accessory.shawl, () => {
    builder.push().scale(0.95, 1, 1.3).addLathe([[0.135, 0.6], [0.145, 0.72], [0.12, 0.83], [0.05, 0.86]], segments).pop();
  });
  for (const [armPart, side] of [[bodyPart.leftArm, 1], [bodyPart.rightArm, -1]]) {
    part(builder, colorSlot.top, armPart, accessory.always, () => builder.addTube([[0, 0.81, side * 0.17], [0.01, 0.65, side * 0.19], [0.03, 0.5, side * 0.19]], 0.033, segments));
    part(builder, colorSlot.skin, armPart, accessory.always, () => builder.push().translate(0.03, 0.47, side * 0.19).scale(0.025, 0.035, 0.022).addSphere(segments, rings).pop());
  }
  part(builder, colorSlot.skin, bodyPart.head, accessory.always, () => {
    builder.addTube([[0, 0.84, 0], [0, 0.88, 0]], 0.03, segments); // neck
    builder.push().translate(0.005, 0.925, 0).scale(0.06, 0.07, 0.055).addSphere(segments, rings).pop();
  });
  part(builder, colorSlot.hair, bodyPart.head, accessory.always, () => builder.push().translate(-0.012, 0.94, 0).scale(0.058, 0.06, 0.058).addSphere(segments, rings).pop());
  part(builder, colorSlot.hair, bodyPart.head, accessory.hairBun, () => builder.push().translate(-0.06, 0.93, 0).scale(0.03).addSphere(segments, rings).pop());
  part(builder, colorSlot.hat, bodyPart.head, accessory.dhakaTopi, () => {
    builder.push().translate(-0.005, 0.965, 0).addPrism(4, 0.058, 0.05, 0.75, 0.9).pop(); // the dhaka topi, a little tilted box cap
  });
  return builder;
}
