// The street life manager: starts the pigeons, moves them each frame, and packs the ones in view into one
// preallocated instance array for drawing. No allocation while running. Depends on animals.js.

import { createPigeons, buildPigeonMesh } from './animals.js';

export const floatsPerFigureInstance = 12; // see FigureInstance in figure.wgsl.js
const pigeonBoundingRadiusMetres = 0.3;

const packColor = ([red, green, blue]) => {
  const byte = (value) => Math.max(0, Math.min(255, Math.round(value * 255)));
  return (byte(red) | (byte(green) << 8) | (byte(blue) << 16) | (255 << 24)) >>> 0;
};

export function createStreetLife(quality) {
  const figures = [];
  const addFigure = ({ x, y = 0, z, facing, scale, colors, accessories }) => {
    const figure = { x, y, z, facing, scale, pose: 0, phase: 0, accessories, packedColors: [colors.top, colors.bottom, colors.accent].map(packColor) };
    figures.push(figure);
    return figure;
  };
  const pigeons = createPigeons(quality, addFigure);
  const instances = new Float32Array(Math.max(1, figures.length) * floatsPerFigureInstance);
  const pigeonGroup = { vertexData: buildPigeonMesh().toVertexData().vertexData, instances, instanceWords: new Uint32Array(instances.buffer), count: 0 };

  return {
    groups: [pigeonGroup],
    // Moves the pigeons, then lists the ones in view (detailSelector answers what is in view).
    update(secondsElapsed, eyePosition, detailSelector) {
      pigeons.update(secondsElapsed, eyePosition);
      pigeonGroup.count = 0;
      for (let index = 0; index < figures.length; index++) {
        const figure = figures[index], radius = pigeonBoundingRadiusMetres * figure.scale;
        if (!detailSelector.isSphereVisible(figure.x, figure.y + radius, figure.z, radius)) continue;
        const offset = pigeonGroup.count * floatsPerFigureInstance, words = pigeonGroup.instanceWords;
        instances[offset] = figure.x; instances[offset + 1] = figure.y; instances[offset + 2] = figure.z; instances[offset + 3] = figure.facing;
        instances[offset + 4] = figure.pose; instances[offset + 5] = figure.phase; instances[offset + 6] = figure.scale; instances[offset + 7] = 0;
        words[offset + 8] = figure.accessories;
        for (let color = 0; color < 3; color++) words[offset + 9 + color] = figure.packedColors[color];
        pigeonGroup.count++;
      }
    },
  };
}
