// Stone and gilded statues, each about 1 unit tall and facing +x (scale and place them): seated temple lions,
// elephants, Garuda kneeling with folded hands, King Yoganarendra kneeling under his cobra hood, and the
// makara (water monster) heads that pour water at the spouts. Depends on meshBuilder.js and materials.js.

import { material } from '../look/materials.js';

// A seated Newar temple lion (simha), 1 unit tall, facing +x: haunches, upright chest, curly mane, open jaw.
export function addSeatedLion(builder) {
  builder.material(material.carvedStone, 130);
  builder.push().translate(-0.08, 0.2, 0).scale(0.26, 0.2, 0.2).addSphere(8, 5).pop(); // haunches
  builder.push().translate(0.04, 0.42, 0).rotateZ(-0.35).scale(0.17, 0.26, 0.17).addSphere(8, 5).pop(); // chest
  for (const side of [-1, 1]) {
    builder.push().translate(0.16, 0, side * 0.08).addLathe([[0.045, 0], [0.04, 0.38], [0.0, 0.4]], 6).pop(); // front leg
    builder.push().translate(0.15, 0.02, side * 0.08).scale(0.07, 0.04, 0.05).addSphere(6, 3).pop(); // paw
  }
  builder.push().translate(0.1, 0.72, 0);
  builder.push().translate(-0.04, 0, 0).scale(0.12, 0.17, 0.2).addSphere(10, 5).pop(); // mane
  builder.material(material.carvedStone, 150);
  builder.push().scale(0.12, 0.12, 0.12).addSphere(8, 5).pop(); // head
  builder.push().translate(0.1, -0.02, 0).scale(0.07, 0.05, 0.065).addSphere(6, 4).pop(); // muzzle
  builder.material(material.darkRecess).addBox(0.12, -0.075, -0.04, 0.17, -0.045, 0.04); // open mouth
  builder.material(material.carvedStone, 130);
  for (const side of [-1, 1]) builder.push().translate(0.0, 0.11, side * 0.08).scale(0.035, 0.05, 0.03).addSphere(5, 3).pop(); // ears
  builder.pop();
  builder.addTube([[-0.3, 0.1, 0.05], [-0.38, 0.3, 0.08], [-0.3, 0.45, 0.1], [-0.24, 0.42, 0.1]], 0.025, 4); // curled tail
}

// A stone elephant, 1 unit tall at the back, facing +x: body, four legs, head, trunk curling down, flat ears.
export function addStoneElephant(builder) {
  builder.material(material.carvedStone, 120);
  builder.push().translate(-0.05, 0.62, 0).scale(0.42, 0.3, 0.26).addSphere(10, 6).pop(); // body
  for (const [legX, legZ] of [[0.22, 0.13], [0.22, -0.13], [-0.3, 0.13], [-0.3, -0.13]]) {
    builder.push().translate(legX, 0, legZ).addLathe([[0.085, 0], [0.08, 0.5], [0.07, 0.55]], 7).pop();
  }
  builder.push().translate(0.38, 0.78, 0);
  builder.push().scale(0.18, 0.2, 0.17).addSphere(8, 5).pop(); // head
  for (const side of [-1, 1]) {
    builder.push().translate(-0.04, 0.0, side * 0.17).rotateY(side * 0.3).scale(0.025, 0.17, 0.13).addSphere(6, 4).pop(); // ear
  }
  builder.addTube([[0.12, -0.05, 0], [0.2, -0.25, 0], [0.2, -0.5, 0], [0.26, -0.68, 0], [0.32, -0.66, 0]], 0.05, 6); // trunk
  builder.material(material.carvedStone, 200);
  for (const side of [-1, 1]) builder.addTube([[0.12, -0.12, side * 0.08], [0.22, -0.22, side * 0.1], [0.3, -0.2, side * 0.1]], 0.02, 4); // tusks
  builder.pop();
  // the saddle cloth, carved in stone
  builder.material(material.carvedStone, 90).push().translate(-0.05, 0.86, 0).scale(0.28, 0.06, 0.28).addSphere(8, 3).pop();
}

// A figure kneeling on one knee with hands joined in front of the chest, 1 unit tall, facing +x.
// Shared by Garuda and the king; `materialId` picks stone or gilding.
export function addKneelingFigure(builder, materialId) {
  builder.material(materialId, 140);
  builder.push().translate(-0.05, 0.16, 0).scale(0.22, 0.16, 0.2).addSphere(8, 4).pop(); // folded legs and hips
  builder.push().translate(0.12, 0.08, 0.09).scale(0.16, 0.08, 0.07).addSphere(6, 3).pop(); // forward knee
  builder.push().translate(0, 0.48, 0).scale(0.13, 0.22, 0.17).addSphere(8, 5).pop(); // chest
  for (const side of [-1, 1]) {
    builder.addTube([[0, 0.62, side * 0.15], [0.1, 0.48, side * 0.12], [0.17, 0.56, side * 0.02]], 0.04, 5); // arm
  }
  builder.push().translate(0.19, 0.6, 0).scale(0.05, 0.07, 0.03).addSphere(5, 3).pop(); // joined hands
  builder.push().translate(0.02, 0.8, 0).scale(0.1, 0.12, 0.1).addSphere(8, 5).pop(); // head
}

// Garuda, the sun bird who carries Vishnu: the kneeling figure with a beaked face and folded wings.
export function addKneelingGaruda(builder) {
  addKneelingFigure(builder, material.carvedStone);
  builder.push().translate(0.12, 0.79, 0).rotateZ(-0.5).addLathe([[0.035, 0], [0.02, 0.06], [0, 0.1]], 5).pop(); // beak
  for (const side of [-1, 1]) {
    builder.push().translate(-0.12, 0.5, side * 0.16).rotateY(side * 0.35).scale(0.05, 0.3, 0.17).addSphere(7, 4).pop(); // wing
  }
  builder.push().translate(0.02, 0.92, 0).addLathe([[0.08, 0], [0.05, 0.08], [0, 0.15]], 6).pop(); // crown
}

// King Yoganarendra Malla: gilded, kneeling, with the cobra rising behind him and spreading its hood over his
// head, and a small bird on the cobra's head.
export function addKingUnderCobraHood(builder) {
  addKneelingFigure(builder, material.gilded);
  builder.push().translate(0.02, 0.9, 0).addLathe([[0.1, 0], [0.08, 0.08], [0.03, 0.18], [0, 0.22]], 7).pop(); // crown
  builder.addTube([[-0.18, 0.1, 0], [-0.22, 0.5, 0], [-0.2, 0.9, 0], [-0.14, 1.05, 0]], 0.045, 6); // cobra body
  builder.push().translate(-0.08, 1.08, 0).rotateZ(0.25).scale(0.05, 0.26, 0.3).addSphere(10, 5).pop(); // spread hood
  builder.push().translate(-0.06, 1.38, 0).scale(0.06, 0.05, 0.04).addSphere(6, 3).pop(); // the bird
}

// A makara head spout: a curling snout with a gaping mouth, from which the water runs. Length 1 unit along +x.
export function addMakaraSpout(builder) {
  builder.material(material.carvedStone, 150);
  builder.push().translate(0.2, 0, 0).scale(0.25, 0.16, 0.15).addSphere(8, 5).pop(); // head
  builder.addTube([[0.35, 0.05, 0], [0.7, 0.0, 0], [0.92, 0.1, 0], [1.0, 0.25, 0]], 0.06, 6); // curled upper snout
  builder.addTube([[0.35, -0.08, 0], [0.75, -0.12, 0]], 0.05, 6); // lower jaw
  for (const side of [-1, 1]) builder.push().translate(0.25, 0.1, side * 0.12).scale(0.04).addSphere(5, 3).pop(); // eyes
  builder.material(material.bronze, 120).addTube([[0.4, -0.03, 0], [0.86, -0.04, 0]], 0.025, 5); // the metal spout pipe
}
