// Where the water is and what disturbs it: one big puddle left by the shower in front of Krishna Mandir, and
// Manga Hiti's knee-deep pool with the three streams pouring into it from the makara spouts. Ripple rings come
// from one fixed pool of events (no allocation while running): the streams' drops landing, and your feet.
// Depends on layout.js, blocks.js (placing), mangaHiti.js (its water) and math.js; drawn by water.wgsl.js.

import { monumentLayout } from './layout.js';
import { placeInMonument, createBlock, rotationForFacing } from './blocks.js';
import { describeMangaHitiWater } from '../monuments/mangaHiti.js';
import { createRandom } from '../core/math.js';

export const floatsPerWaterBody = 12;
const waterSeed = 1986;
const footstepStrideMetres = 0.75;
const footstepStrength = 1.6;
const streamLandingSeconds = 0.09; // time between drops of a stream hitting the water
const windGustStrength = 0.6; // easy tweak: 0 for still water
// The puddle: centre, half length and width (metres), turn (radians), depth look (0 muddy, 1 deep and clear).
const showcasePuddle = { x: 3.0, z: -20.5, halfX: 3.6, halfZ: 2.0, rotation: 0.7, depthLook: 0.85 };
const puddleSurfaceY = 0.006;

export function createWaterField(quality) {
  const random = createRandom(waterSeed);
  const row = monumentLayout.find((candidate) => candidate.name === 'mangaHiti');
  const turn = rotationForFacing(row.facingDegrees);
  const toWorld = (local) => placeInMonument(row, local.x, local.z, createBlock({}));
  const { streams: localStreams, pool } = describeMangaHitiWater();

  const poolCentre = toWorld(pool);
  const bodies = [
    { ...showcasePuddle, y: puddleSurfaceY, isBasin: false },
    { x: poolCentre.x, y: pool.y, z: poolCentre.z, rotation: turn, halfX: pool.halfX, halfZ: pool.halfZ, depthLook: 0.85, isBasin: true },
  ];
  // GPU instance data: centre, surface height, turn; half sizes, seed, depth look; basin shape, 0, 0, 0
  const bodyInstances = new Float32Array(bodies.length * floatsPerWaterBody);
  bodies.forEach((body, index) => bodyInstances.set([
    body.x, body.y, body.z, body.rotation, body.halfX, body.halfZ, random(), body.depthLook, body.isBasin ? 1 : 0, 0, 0, 0,
  ], index * floatsPerWaterBody));
  // a sphere around each body, so the renderer can mirror the nearest one in view and skip the rest
  const bodyBounds = new Float32Array(bodies.flatMap((body) => [body.x, body.y, body.z, Math.hypot(body.halfX, body.halfZ) * 1.3]));

  const streams = localStreams.map((stream) => {
    const spout = toWorld(stream);
    const fallSeconds = Math.sqrt(2 * stream.drop / 9.81), reach = stream.outflowMetresPerSecond * fallSeconds;
    return {
      spout: [spout.x, stream.y, spout.z], speed: stream.outflowMetresPerSecond, direction: [Math.cos(turn), Math.sin(turn)], drop: stream.drop,
      landing: [spout.x + Math.cos(turn) * reach, spout.z + Math.sin(turn) * reach], nextDrop: random(),
    };
  });
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

  // Are feet at (x, footY, z) in the water? (the puddle's outline is taken as its ellipse, near enough for feet)
  const isInWater = (x, z, footY) => {
    for (let index = 0; index < bodies.length; index++) {
      const body = bodies[index];
      if (footY > body.y || footY < body.y - 1) continue;
      const deltaX = x - body.x, deltaZ = z - body.z, cosine = Math.cos(body.rotation), sine = Math.sin(body.rotation);
      const along = (deltaX * cosine + deltaZ * sine) / body.halfX, across = (-deltaX * sine + deltaZ * cosine) / body.halfZ;
      if (body.isBasin ? Math.abs(along) < 1 && Math.abs(across) < 1 : along * along + across * across < 0.8) return true;
    }
    return false;
  };

  let lastStrideIndex = 0;
  return {
    bodyInstances, bodyCount: bodies.length, bodyBounds, streamInstances, streamCount: streams.length,
    rippleEvents, rippleCapacity, windGustStrength, startRipple,
    // Called once per frame: stream drops and footsteps start new rings.
    update(time, camera) {
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
        if (camera.isOnGround && isInWater(foot[0], foot[2], foot[1])) startRipple(foot[0], foot[2], time, footstepStrength);
      }
    },
  };
}
