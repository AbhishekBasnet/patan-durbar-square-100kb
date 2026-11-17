// Carved roof struts (tunala): the slanting wooden posts that hold up every eave, each carved with a
// many-armed deity standing on a small attendant, under a leafy canopy. A strut of a given length is
// carved once and then copied around every roof; from further away a plain board stands in for it.
// Depends on meshBuilder.js, lod.js and materials.js.

import { MeshBuilder } from '../core/meshBuilder.js';
import { material } from '../look/materials.js';
import { detailGroup } from '../core/lod.js';

const boardWidthMetres = 0.3;
const boardThicknessMetres = 0.11;
const figureShare = 0.62; // share of the strut's length taken by the deity
const armPairCount = 2;

const carvedStrutsByLength = new Map();

// Carves a strut `length` metres long, lying along +y from the origin, its carved face toward +x.
export function carveRoofStrut(length) {
  const key = length.toFixed(2);
  if (carvedStrutsByLength.has(key)) return carvedStrutsByLength.get(key);
  const strut = new MeshBuilder();
  const halfBoard = boardWidthMetres / 2;
  // the board, with a capital block at the top where it meets the eave beam
  strut.material(material.wood, 50, 1).occlusion(0.75);
  strut.addBox(-boardThicknessMetres, 0, -halfBoard, 0, length, halfBoard);
  strut.material(material.wood, 30).addBox(-boardThicknessMetres - 0.02, length - 0.14, -halfBoard - 0.03, 0.05, length, halfBoard + 0.03);

  // the attendant at the foot: a squat crouching figure
  const footHeight = length * 0.16;
  strut.material(material.wood, 80, 1).occlusion(0.7);
  strut.push().translate(0.04, footHeight * 0.5, 0).scale(0.07, footHeight * 0.5, 0.12).addSphere(6, 4).pop();
  strut.push().translate(0.08, footHeight * 0.95, 0).scale(0.055).addSphere(6, 4).pop();

  // the deity, standing, slightly forward of the board so it throws its own shadow
  const figureBottom = footHeight * 1.2, figureHeight = length * figureShare;
  const unit = figureHeight / 7; // the figure is about seven heads tall
  strut.push().translate(0.02, figureBottom, 0);
  strut.material(material.wood, 90, 0).occlusion(0.85);
  for (const side of [-1, 1]) {
    strut.addTube([[0.05, 0, side * unit * 0.25], [0.07, unit * 1.6, side * unit * 0.3], [0.05, unit * 3.2, side * unit * 0.2]], unit * 0.22, 4); // legs
  }
  strut.push().translate(0.07, unit * 4.1, 0).scale(unit * 0.55, unit * 1.0, unit * 0.75).addSphere(7, 4).pop(); // torso
  strut.push().translate(0.07, unit * 3.3, 0).scale(unit * 0.5, unit * 0.35, unit * 0.8).addSphere(7, 3).pop(); // skirt
  for (let pair = 0; pair < armPairCount; pair++) {
    const raise = (pair - 0.5) * 0.9;
    for (const side of [-1, 1]) {
      const shoulder = [0.08, unit * 4.7, side * unit * 0.6];
      const elbow = [0.12, unit * (4.5 + raise), side * unit * (1.15 + pair * 0.2)];
      const hand = [0.16, unit * (5.0 + raise * 1.5), side * unit * (1.4 + pair * 0.25)];
      strut.addTube([shoulder, elbow, hand], unit * 0.13, 4);
      strut.push().translate(...hand).scale(unit * 0.15).addSphere(5, 3).pop(); // a held attribute
    }
  }
  strut.material(material.wood, 110).push().translate(0.09, unit * 5.6, 0).scale(unit * 0.42).addSphere(7, 4).pop(); // head
  strut.push().translate(0.09, unit * 6.0, 0).addLathe([[unit * 0.32, 0], [unit * 0.2, unit * 0.5], [0, unit * 0.9]], 6).pop(); // crown
  strut.material(material.wood, 60, 1).push().translate(0.01, unit * 5.7, 0).scale(0.02, unit * 1.0, unit * 0.95).addSphere(9, 3).pop(); // halo
  strut.pop();

  // the leafy canopy over the deity's head
  const canopyY = figureBottom + figureHeight + 0.04;
  strut.material(material.wood, 70, 1).occlusion(0.7);
  strut.addBox(0, canopyY, -halfBoard * 0.9, 0.09, canopyY + length * 0.08, halfBoard * 0.9);
  carvedStrutsByLength.set(key, strut);
  return strut;
}

// Struts under one side of a roof: `count` evenly spaced along a wall of half length `halfSpan`,
// from the wall face (x = wallX, y = bottomY) leaning out to the eave beam (x = eaveX, y = topY).
// Corner struts, at 45 degrees, are added by the caller.
export function addStrutsAlongWall(builder, { count, halfSpan, wallX, bottomY, eaveX, topY }) {
  const run = eaveX - wallX, rise = topY - bottomY;
  const length = Math.hypot(run, rise), lean = Math.atan2(run, rise);
  const strut = carveRoofStrut(length);
  for (let index = 0; index < count; index++) {
    const z = count === 1 ? 0 : -halfSpan + (index + 0.5) * (2 * halfSpan / count);
    builder.push().translate(wallX, bottomY, z).rotateZ(-lean);
    // carved up close; from further away a plain board with carved relief drawn by the wood shader
    builder.withDetail(detailGroup.nearOnly, () => builder.addMesh(strut));
    builder.withDetail(detailGroup.middleAndFar, () => {
      builder.material(material.wood, 70, 1).occlusion(0.75).addBox(-boardThicknessMetres, 0, -boardWidthMetres / 2, 0.06, length, boardWidthMetres / 2);
    });
    builder.pop();
  }
}

// Plain struts for ordinary houses: a square wooden post from the wall to the eave, no carving.
export function addPlainStruts(builder, { count, halfSpan, bottomY, eaveX, topY }) {
  builder.material(material.wood, 40).occlusion(0.7);
  builder.withDetail(detailGroup.nearAndMiddle, () => {
    for (let index = 0; index < count; index++) {
      const z = count === 1 ? 0 : -halfSpan + (index + 0.5) * (2 * halfSpan / count);
      builder.addTube([[0.06, bottomY, z], [eaveX, topY, z]], 0.06, 4);
    }
  });
}
