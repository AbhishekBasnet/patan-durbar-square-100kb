// The figure part system, used for the pigeons: every vertex says which colour slot it takes from its instance
// (body, legs, wings, or the dark beak), which body part it belongs to (so the GPU can move the head and
// wings), and which optional accessory it is (shown only when the instance asks for it).
// Depends on nothing; figure.wgsl.js reads the same numbers, animals.js builds the mesh.

// Colour slots (vertex material byte 0): the first three come from the instance, the last is fixed.
export const colorSlot = { top: 0, bottom: 1, accent: 2, darkMetal: 3 };

// Moving parts (vertex material byte 2). Each kind of figure gives each part its own pivot (partPivots).
export const bodyPart = { fixed: 0, head: 1, leftWing: 2, rightWing: 3 };
export const bodyPartCount = 4;

// Optional accessories (vertex material byte 3): shown when bit n of the instance's accessory mask is set.
export const accessory = { always: 0, foldedWings: 1, spreadWings: 2 };

export const figureKind = { pigeon: 0 };
export const figureKindCount = 1;

// What a figure is doing (instance pose).
export const pose = { peck: 0, fly: 1 };

// Pivot of each moving part per kind: [x forward, y up, swing amplitude (radians), phase offset (radians)], in metres.
export const partPivots = {
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
