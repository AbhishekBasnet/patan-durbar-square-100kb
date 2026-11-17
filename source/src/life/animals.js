// The square's pigeons: flocks pecking on the paving that burst into the air when you come close, circle the
// square for a while and glide back down. The mesh comes from the same part system as people (figures.js).
// Depends on meshBuilder.js, figures.js and math.js.

import { MeshBuilder } from '../core/meshBuilder.js';
import { part, colorSlot, bodyPart, accessory, figureKind, pose } from './figures.js';
import { createRandom } from '../core/math.js';

const pigeonLengthMetres = 0.3;
const pigeonHeightMetres = 0.16;
const pigeonWingSpanMetres = 0.6;
const pigeonLegMetres = 0.04;
const pigeonScareDistanceMetres = 3.5;
const pigeonFlightSeconds = [6, 10];
const pigeonCircleRadiusMetres = 7;
const pigeonFlightHeightMetres = [5, 10];
const wingBeatsPerSecond = 2.2;
const pigeonSeed = 1984;
const foldedWingsMask = 1 << accessory.foldedWings;
const spreadWingsMask = 1 << accessory.spreadWings;
// flocks: centre x, z, and their share of the preset's flock size
const pigeonFlocks = [[7.5, -24.5, 1], [13.0, -12.0, 0.8], [11.5, -66.0, 0.7]];

// A pigeon in metres, facing +x: body, head and beak, wings folded along its sides or spread for flight.
export function buildPigeonMesh() {
  const builder = new MeshBuilder().beginChunk();
  const length = pigeonLengthMetres, height = pigeonHeightMetres, legs = pigeonLegMetres;
  part(builder, colorSlot.top, bodyPart.fixed, accessory.always, () => builder.push().translate(0, legs + height * 0.45, 0).scale(length * 0.5, height * 0.45, length * 0.28).addSphere(7, 4).pop());
  part(builder, colorSlot.top, bodyPart.head, accessory.always, () => builder.push().translate(length * 0.45, legs + height * 0.95, 0).scale(length * 0.17).addSphere(6, 4).pop());
  part(builder, colorSlot.darkMetal, bodyPart.head, accessory.always, () => builder.addTube([[length * 0.58, legs + height * 0.95, 0], [length * 0.72, legs + height * 0.9, 0]], length * 0.03, 3));
  for (const [wingPart, side] of [[bodyPart.leftWing, 1], [bodyPart.rightWing, -1]]) {
    part(builder, colorSlot.accent, wingPart, accessory.spreadWings, () => builder.push().translate(-length * 0.05, legs + height * 0.6, side * pigeonWingSpanMetres * 0.25).scale(length * 0.38, height * 0.08, pigeonWingSpanMetres * 0.25).addSphere(6, 3).pop());
    part(builder, colorSlot.accent, bodyPart.fixed, accessory.foldedWings, () => builder.push().translate(-length * 0.12, legs + height * 0.55, side * length * 0.2).rotateZ(0.2).scale(length * 0.42, height * 0.22, length * 0.07).addSphere(6, 3).pop());
    part(builder, colorSlot.bottom, bodyPart.fixed, accessory.always, () => builder.addTube([[0, legs, side * length * 0.08], [0.01, 0, side * length * 0.08]], length * 0.025, 3));
  }
  return builder;
}

export function createPigeons(quality, addFigure) {
  const random = createRandom(pigeonSeed);
  const flocks = [];
  for (const [centreX, centreZ, share] of pigeonFlocks) {
    const flock = { centreX, centreZ, isFlying: false, flightSeconds: 0, flightLength: 0, birds: [] };
    for (let index = 0; index < Math.round(quality.pigeonsPerFlock * share); index++) {
      const grey = random.between(0.35, 0.55);
      const figure = addFigure({
        kind: figureKind.pigeon, x: centreX, z: centreZ, facing: random.between(0, 6.28), scale: random.between(0.9, 1.1),
        colors: { top: [grey, grey, grey * 1.1], bottom: [0.6, 0.3, 0.3], accent: [grey * 0.8, grey * 0.8, grey * 0.85] }, accessories: foldedWingsMask,
      });
      flock.birds.push({ figure, offsetX: random.between(-2.5, 2.5), offsetZ: random.between(-2.5, 2.5), angle: random.between(0, 6.28), height: random.between(...pigeonFlightHeightMetres), peckRate: random.between(2.5, 4.5) });
    }
    flocks.push(flock);
  }

  return {
    update(secondsElapsed, eyePosition) {
      for (let flockIndex = 0; flockIndex < flocks.length; flockIndex++) {
        const flock = flocks[flockIndex];
        if (!flock.isFlying && Math.hypot(eyePosition[0] - flock.centreX, eyePosition[2] - flock.centreZ) < pigeonScareDistanceMetres) {
          flock.isFlying = true;
          flock.flightSeconds = 0;
          flock.flightLength = random.between(...pigeonFlightSeconds);
        }
        if (flock.isFlying) flock.flightSeconds += secondsElapsed;
        // rising over the first second, circling, gliding back down over the last two
        const climb = flock.isFlying ? Math.min(1, flock.flightSeconds) * Math.min(1, (flock.flightLength - flock.flightSeconds) / 2) : 0;
        if (flock.isFlying && flock.flightSeconds > flock.flightLength) flock.isFlying = false;
        for (let birdIndex = 0; birdIndex < flock.birds.length; birdIndex++) {
          const bird = flock.birds[birdIndex], figure = bird.figure;
          if (climb > 0) {
            bird.angle += secondsElapsed * 0.6;
            const radius = pigeonCircleRadiusMetres * climb;
            figure.x = flock.centreX + bird.offsetX * (1 - climb) + Math.cos(bird.angle) * radius;
            figure.z = flock.centreZ + bird.offsetZ * (1 - climb) + Math.sin(bird.angle) * radius;
            figure.y = bird.height * climb;
            figure.facing = bird.angle + Math.PI / 2;
            figure.pose = pose.fly;
            figure.accessories = spreadWingsMask;
            figure.phase += secondsElapsed * wingBeatsPerSecond * 6.2832;
          } else {
            figure.x = flock.centreX + bird.offsetX;
            figure.z = flock.centreZ + bird.offsetZ;
            figure.y = 0;
            figure.pose = pose.peck;
            figure.accessories = foldedWingsMask;
            figure.phase += secondsElapsed * bird.peckRate;
          }
        }
      }
    },
  };
}
