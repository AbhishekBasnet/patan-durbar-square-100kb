// Where the water lies an hour after the shower, and what disturbs it. Puddles sit at the feet of the temple
// plinths, under the dripping eaves of the palace and the houses, in worn dips of the paving and around
// Manga Hiti, whose spouts pour into their trough. Ripple rings come from one fixed pool of events (no
// allocation while running): eave drips at their own irregular rhythm, the streams landing, and your feet.
// Depends on layout.js, blocks.js (placing), mangaHiti.js (its water), math.js; drawn by water.wgsl.js.

import { monumentLayout } from './layout.js';
import { placeInMonument, createBlock, rotationForFacing } from './blocks.js';
import { describeMangaHitiWater } from '../monuments/mangaHiti.js';
import { createRandom } from '../core/math.js';

export const floatsPerPuddle = 12;
const puddleSeed = 1986;
const footstepStrideMetres = 0.75;
const footstepStrength = 1.6;
const dripStrength = 0.9;
const streamLandingSeconds = 0.09; // time between drops of a stream hitting the trough
const windGustStrength = 1.0; // easy tweak: 0 for a still afternoon

// Puddles beside monuments, in the monument's frame: [monument, metres in front, metres to the right,
// half length, half width, depth look (0 muddy, 1 deep), drip interval in seconds (0 none)].
const puddlesByMonument = [
  ['charNarayanTemple', 5.9, 2.3, 1.4, 0.8, 0.3, 0],
  ['krishnaMandir', 6.1, -3.0, 2.2, 1.0, 0.7, 0],
  ['hariShankarTemple', 4.8, 2.8, 0.7, 0.45, 0.2, 0],
  ['vishwanathTemple', 5.2, -2.6, 1.1, 0.7, 0.5, 0],
  ['bhimsenTemple', 7.2, 3.1, 0.9, 0.5, 0.4, 0],
  ['octagonalKrishnaTemple', 5.0, 0.8, 1.7, 1.1, 0.8, 0],
  // under the palace eaves the roofs still drip
  ['mulChowk', 16.3, -6.0, 0.6, 0.35, 0.3, 1.7],
  ['mulChowk', 16.4, 4.5, 1.2, 0.5, 0.5, 2.6],
  ['keshavNarayanChowk', 16.3, 9.0, 0.25, 0.18, 0.2, 1.1],
  ['sundariChowk', 16.3, -5.5, 0.9, 0.4, 0.4, 2.1],
];

// Puddles in worn dips of the open paving and under house eaves: [x, z, half length, half width, depth look, drip].
const puddlesInTheOpen = [
  [3.2, -21.5, 2.6, 1.3, 0.85, 0],
  [9.5, 3.0, 1.1, 0.8, 0.4, 0],
  [2.0, 13.5, 0.8, 0.5, 0.3, 0],
  [11.0, -49.0, 1.8, 0.9, 0.6, 0],
  [-14.2, -27.0, 0.5, 0.3, 0.3, 1.4],
  [-14.2, 6.0, 0.18, 0.15, 0.2, 0.9],
];

export function createPuddleField(quality) {
  const random = createRandom(puddleSeed);
  const puddles = [];
  const addPuddle = (x, y, z, rotation, halfX, halfZ, depthLook, dripSeconds, { isBasin = false, usesPlanarReflection = y > -0.1 } = {}) => {
    puddles.push({ x, y, z, rotation, halfX, halfZ, depthLook, dripSeconds, isBasin, usesPlanarReflection, seed: random(), nextDrip: random() * 3 });
  };
  const rowsByName = Object.fromEntries(monumentLayout.map((row) => [row.name, row]));
  for (const [name, along, across, halfX, halfZ, depthLook, dripSeconds] of puddlesByMonument) {
    const row = rowsByName[name], spot = placeInMonument(row, along, across, createBlock({}));
    addPuddle(spot.x, 0.006, spot.z, spot.rotation + random.between(-0.6, 0.6), halfX, halfZ, depthLook, dripSeconds);
  }
  for (const [x, z, halfX, halfZ, depthLook, dripSeconds] of puddlesInTheOpen) {
    addPuddle(x, 0.006, z, random.between(0, Math.PI), halfX, halfZ, depthLook, dripSeconds);
  }

  // Manga Hiti: the trough pool, the spilled water, and the three streams
  const mangaHitiRow = rowsByName.mangaHiti, pitWater = describeMangaHitiWater();
  const toWorld = (local) => placeInMonument(mangaHitiRow, local.x, local.z, createBlock({}));
  const trough = toWorld(pitWater.trough), spill = toWorld(pitWater.spill);
  addPuddle(trough.x, pitWater.trough.y, trough.z, rotationForFacing(mangaHitiRow.facingDegrees), pitWater.trough.halfX, pitWater.trough.halfZ, 0.9, 0, { isBasin: true });
  addPuddle(spill.x, pitWater.spill.y, spill.z, rotationForFacing(mangaHitiRow.facingDegrees), pitWater.spill.halfX, pitWater.spill.halfZ, 0.1, 0);
  const outflowAngle = rotationForFacing(mangaHitiRow.facingDegrees);
  const streams = pitWater.streams.map((stream) => {
    const spout = toWorld(stream);
    const fallSeconds = Math.sqrt(2 * stream.drop / 9.81), reach = stream.outflowMetresPerSecond * fallSeconds;
    return {
      spout: [spout.x, stream.y, spout.z], speed: stream.outflowMetresPerSecond, direction: [Math.cos(outflowAngle), Math.sin(outflowAngle)], drop: stream.drop,
      landing: [spout.x + Math.cos(outflowAngle) * reach, spout.z + Math.sin(outflowAngle) * reach], nextDrop: random(),
    };
  });

  // GPU instance data
  const puddleInstances = new Float32Array(puddles.length * floatsPerPuddle);
  puddles.forEach((puddle, index) => puddleInstances.set([
    puddle.x, puddle.y, puddle.z, puddle.rotation, puddle.halfX, puddle.halfZ, puddle.seed, puddle.depthLook,
    puddle.isBasin ? 1 : 0, puddle.usesPlanarReflection ? 1 : 0, 0, 0,
  ], index * floatsPerPuddle));
  const streamInstances = new Float32Array(streams.length * 8);
  streams.forEach((stream, index) => streamInstances.set([...stream.spout, stream.speed, ...stream.direction, stream.drop, 0], index * 8));

  // ---- the ripple event pool: a ring buffer the shader reads whole; old events simply fade out
  const rippleCapacity = quality.rippleEventCapacity;
  const rippleEvents = new Float32Array(rippleCapacity * 4).fill(-100); // start times far in the past
  let nextRippleSlot = 0;
  const startRipple = (x, z, time, strength) => {
    const offset = nextRippleSlot * 4;
    rippleEvents[offset] = x; rippleEvents[offset + 1] = z; rippleEvents[offset + 2] = time; rippleEvents[offset + 3] = strength;
    nextRippleSlot = (nextRippleSlot + 1) % rippleCapacity;
  };

  // Is (x, z) on the water of a puddle? (the outline's ellipse, near enough for feet)
  const puddleAt = (x, z, y) => {
    for (let index = 0; index < puddles.length; index++) {
      const puddle = puddles[index];
      if (Math.abs(puddle.y - y) > 0.3) continue;
      const deltaX = x - puddle.x, deltaZ = z - puddle.z, cosine = Math.cos(puddle.rotation), sine = Math.sin(puddle.rotation);
      const along = (deltaX * cosine + deltaZ * sine) / puddle.halfX, across = (-deltaX * sine + deltaZ * cosine) / puddle.halfZ;
      if (along * along + across * across < 0.8) return puddle;
    }
    return null;
  };

  let lastStrideIndex = 0;
  return {
    puddleInstances, puddleCount: puddles.length, streamInstances, streamCount: streams.length,
    rippleEvents, rippleCapacity, windGustStrength,
    // Bounding spheres, so the renderer can skip the reflection when no puddle is in view.
    puddleBounds: new Float32Array(puddles.flatMap((puddle) => [puddle.x, puddle.y, puddle.z, Math.max(puddle.halfX, puddle.halfZ) * 1.5])),
    startRipple,
    // Called once per frame: drips, stream drops and footsteps start new rings.
    update(time, camera) {
      for (let index = 0; index < puddles.length; index++) {
        const puddle = puddles[index];
        if (!puddle.dripSeconds || time < puddle.nextDrip) continue;
        startRipple(puddle.x + random.between(-0.15, 0.15), puddle.z + random.between(-0.15, 0.15), time, dripStrength);
        puddle.nextDrip = time + puddle.dripSeconds * random.between(0.4, 1.6);
      }
      for (let index = 0; index < streams.length; index++) {
        const stream = streams[index];
        if (time < stream.nextDrop) continue;
        startRipple(stream.landing[0] + random.between(-0.03, 0.03), stream.landing[1] + random.between(-0.03, 0.03), time, 0.7);
        stream.nextDrop = time + streamLandingSeconds * random.between(0.5, 1.5);
      }
      const strideIndex = Math.floor(camera.bobDistance / footstepStrideMetres);
      if (strideIndex !== lastStrideIndex) {
        lastStrideIndex = strideIndex;
        const foot = camera.footPosition;
        if (camera.isOnGround && puddleAt(foot[0], foot[2], foot[1])) startRipple(foot[0], foot[2], time, footstepStrength);
      }
    },
  };
}
