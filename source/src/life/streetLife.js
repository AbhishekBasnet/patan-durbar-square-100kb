// The street life manager: builds the figure meshes, seats the vendors, starts the pigeons, moves the pigeons
// each frame, and packs the figures in view into one preallocated instance array per mesh (vendors near the
// camera get the detailed mesh, the rest the simple one). No allocation while running.
// Depends on figures.js, vendors.js, animals.js and lod.js.

import { buildPersonMesh, figureKind } from './figures.js';
import { createVendors } from './vendors.js';
import { createPigeons, buildPigeonMesh } from './animals.js';
import { figureDetailDistances } from '../core/lod.js';

export const floatsPerFigureInstance = 17; // see FigureInstance in figure.wgsl.js
const nearPersonSegments = 8;
const farPersonSegments = 4;
const boundingRadiusByKind = [1.0, 0.3];

const packColor = ([red = 0, green = 0, blue = 0]) => {
  const byte = (value) => Math.max(0, Math.min(255, Math.round(value * 255)));
  return (byte(red) | (byte(green) << 8) | (byte(blue) << 16) | (255 << 24)) >>> 0;
};

export function createStreetLife(quality) {
  const figures = [];
  const addFigure = ({ kind, x, y = 0, z, facing, scale, colors, accessories = 0 }) => {
    const figure = {
      kind, x, y, z, facing, scale, pose: 0, phase: 0, accessories,
      packedColors: [colors.top, colors.bottom, colors.hat, colors.accent, colors.skin].map((color) => packColor(color ?? [0, 0, 0])),
    };
    figures.push(figure);
    return figure;
  };
  createVendors(quality, addFigure);
  const pigeons = createPigeons(quality, addFigure);

  const createGroup = (mesh) => {
    const instances = new Float32Array(Math.max(1, figures.length) * floatsPerFigureInstance);
    return { vertexData: mesh.toVertexData().vertexData, instances, instanceWords: new Uint32Array(instances.buffer), count: 0 };
  };
  const nearPeople = createGroup(buildPersonMesh(nearPersonSegments));
  const farPeople = createGroup(buildPersonMesh(farPersonSegments));
  const pigeonGroup = createGroup(buildPigeonMesh());
  const groups = [nearPeople, farPeople, pigeonGroup];
  const nearPersonDistance = figureDetailDistances[quality.name];

  const writeInstance = (group, figure) => {
    const offset = group.count * floatsPerFigureInstance, floats = group.instances, words = group.instanceWords;
    floats[offset] = figure.x; floats[offset + 1] = figure.y; floats[offset + 2] = figure.z; floats[offset + 3] = figure.facing;
    floats[offset + 4] = figure.pose; floats[offset + 5] = figure.phase; floats[offset + 6] = figure.scale; floats[offset + 7] = 0;
    words[offset + 8] = figure.kind; words[offset + 9] = figure.accessories;
    for (let color = 0; color < 5; color++) words[offset + 12 + color] = figure.packedColors[color];
    group.count++;
  };

  return {
    groups,
    // Moves the pigeons, then lists the figures in view (detailSelector answers what is in view).
    update(secondsElapsed, eyePosition, detailSelector) {
      pigeons.update(secondsElapsed, eyePosition);
      for (let index = 0; index < groups.length; index++) groups[index].count = 0;
      for (let index = 0; index < figures.length; index++) {
        const figure = figures[index], radius = boundingRadiusByKind[figure.kind] * figure.scale;
        if (!detailSelector.isSphereVisible(figure.x, figure.y + radius, figure.z, radius)) continue;
        let group = pigeonGroup;
        if (figure.kind === figureKind.person) {
          group = Math.hypot(figure.x - eyePosition[0], figure.z - eyePosition[2]) < nearPersonDistance ? nearPeople : farPeople;
        }
        writeInstance(group, figure);
      }
    },
  };
}
