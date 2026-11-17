// The walking camera: eye height above the feet, a gentle head bob, a small hop, and collision with the
// ground, steps, plinths and walls (you step up anything lower than a stair and slide along everything else).
// Depends on math.js; reads input.js state; colliders come from the solid blocks (blocks.js), squareBounds and
// the ground holes (sunken pits, whose floor is below the paving).

import { clamp, degreesToRadians, gravityMetresPerSecondSquared } from './math.js';

const eyeHeightMetres = 1.6;
const bodyHeightMetres = 1.75;
const bodyRadiusMetres = 0.3;
const walkingSpeedMetresPerSecond = 4.5; // easy first tweak: a brisk walk
const fastWalkingSpeedMetresPerSecond = walkingSpeedMetresPerSecond * 1.3; // Shift: 30% faster
const accelerationRate = 10; // how quickly walking speed follows the keys, per second
const maximumStepUpMetres = 0.5; // anything lower is a stair you walk up
const hopSpeedMetresPerSecond = 3.2;
const eyeSmoothingRate = 14; // how quickly the eye follows the feet up and down steps, per second
const headBobAmplitudeMetres = 0.025;
export const headBobStrideMetres = 0.75; // also the footstep stride for ripples (water.js)
const maximumPitchRadians = 1.45;
const maximumSubstepMetres = 0.15; // shorter than the body radius, so thin posts are never skipped
const boundsMarginMetres = 0.4;

// Colliders are packed 9 floats each: shape (0 box, 1 circle), centre x, centre z, cos and sin of the rotation,
// half size along the front (or radius), half size across, bottom y, top y.
const floatsPerCollider = 9;

export function buildColliders(blocks) {
  const solidBlocks = blocks.filter((block) => block.isSolid);
  const colliders = new Float32Array(solidBlocks.length * floatsPerCollider);
  solidBlocks.forEach((block, index) => {
    const isRound = block.shape !== 'box';
    colliders.set([
      isRound ? 1 : 0, block.x, block.z, Math.cos(block.rotation), Math.sin(block.rotation),
      block.alongFront / 2, block.across / 2, block.y, block.y + block.height,
    ], index * floatsPerCollider);
  });
  return colliders;
}

export function createWalkingCamera(colliders, bounds, groundHoles) {
  const camera = {
    footPosition: new Float64Array(3),
    eyePosition: new Float64Array(3),
    yaw: 0, pitch: 0,
    velocityX: 0, velocityZ: 0, verticalSpeed: 0,
    isOnGround: true,
    smoothedFootY: 0,
    bobDistance: 0,
  };
  const colliderCount = colliders.length / floatsPerCollider;

  // Is the point (x, z) over this collider's footprint, grown by `margin`?
  const footprintContains = (offset, x, z, margin) => {
    const deltaX = x - colliders[offset + 1], deltaZ = z - colliders[offset + 2];
    if (colliders[offset] === 1) {
      const reach = colliders[offset + 5] + margin;
      return deltaX * deltaX + deltaZ * deltaZ < reach * reach;
    }
    const cosine = colliders[offset + 3], sine = colliders[offset + 4];
    const along = deltaX * cosine + deltaZ * sine, across = -deltaX * sine + deltaZ * cosine;
    return Math.abs(along) < colliders[offset + 5] + margin && Math.abs(across) < colliders[offset + 6] + margin;
  };

  // The bare ground: the paving at 0, or the floor of a sunken pit.
  const groundHeightAt = (x, z) => {
    for (let index = 0; index < groundHoles.length; index++) {
      const hole = groundHoles[index];
      if (x > hole.minX && x < hole.maxX && z > hole.minZ && z < hole.maxZ) return hole.floorY;
    }
    return 0;
  };

  // Height of the highest surface under (x, z) that feet at footY can stand on (step up included).
  const supportHeightAt = (x, z, footY) => {
    let support = groundHeightAt(x, z);
    for (let index = 0; index < colliderCount; index++) {
      const offset = index * floatsPerCollider, top = colliders[offset + 8];
      if (top > support && top <= footY + maximumStepUpMetres && footprintContains(offset, x, z, 0)) support = top;
    }
    return support;
  };

  // Pushes the body (a circle at the feet) out of every collider too tall to step onto.
  const pushOutOfWalls = (position) => {
    const footY = position[1];
    for (let index = 0; index < colliderCount; index++) {
      const offset = index * floatsPerCollider;
      if (colliders[offset + 8] <= footY + maximumStepUpMetres || colliders[offset + 7] >= footY + bodyHeightMetres) continue;
      const deltaX = position[0] - colliders[offset + 1], deltaZ = position[2] - colliders[offset + 2];
      if (colliders[offset] === 1) {
        const reach = colliders[offset + 5] + bodyRadiusMetres, distance = Math.hypot(deltaX, deltaZ);
        if (distance < reach && distance > 1e-6) {
          position[0] += deltaX / distance * (reach - distance);
          position[2] += deltaZ / distance * (reach - distance);
        }
        continue;
      }
      const cosine = colliders[offset + 3], sine = colliders[offset + 4];
      const halfAlong = colliders[offset + 5], halfAcross = colliders[offset + 6];
      const along = deltaX * cosine + deltaZ * sine, across = -deltaX * sine + deltaZ * cosine;
      const nearestAlong = clamp(along, -halfAlong, halfAlong), nearestAcross = clamp(across, -halfAcross, halfAcross);
      let pushAlong = along - nearestAlong, pushAcross = across - nearestAcross;
      let gap = Math.hypot(pushAlong, pushAcross);
      if (gap >= bodyRadiusMetres) continue;
      if (gap < 1e-6) {
        // the centre is inside the box: leave through the nearest side
        const outAlong = halfAlong - Math.abs(along), outAcross = halfAcross - Math.abs(across);
        if (outAlong < outAcross) { pushAlong = Math.sign(along) || 1; pushAcross = 0; gap = -outAlong; }
        else { pushAlong = 0; pushAcross = Math.sign(across) || 1; gap = -outAcross; }
      } else {
        pushAlong /= gap; pushAcross /= gap;
      }
      const pushDistance = bodyRadiusMetres - gap;
      position[0] += (pushAlong * cosine - pushAcross * sine) * pushDistance;
      position[2] += (pushAlong * sine + pushAcross * cosine) * pushDistance;
    }
    position[0] = clamp(position[0], bounds.west + boundsMarginMetres, bounds.east - boundsMarginMetres);
    position[2] = clamp(position[2], bounds.north + boundsMarginMetres, bounds.south - boundsMarginMetres);
  };

  const updateEye = () => {
    const bob = Math.sin(camera.bobDistance / headBobStrideMetres * Math.PI) * headBobAmplitudeMetres;
    camera.eyePosition[0] = camera.footPosition[0];
    camera.eyePosition[1] = camera.smoothedFootY + eyeHeightMetres + bob;
    camera.eyePosition[2] = camera.footPosition[2];
  };

  camera.standAt = (x, z, yawDegrees, pitchDegrees) => {
    const foot = camera.footPosition;
    foot[0] = x; foot[1] = 0; foot[2] = z;
    foot[1] = supportHeightAt(x, z, 0);
    camera.smoothedFootY = foot[1];
    camera.yaw = yawDegrees * degreesToRadians;
    camera.pitch = pitchDegrees * degreesToRadians;
    camera.velocityX = camera.velocityZ = camera.verticalSpeed = 0;
    updateEye();
  };

  camera.update = (secondsElapsed, input) => {
    camera.yaw += input.lookYaw;
    camera.pitch = clamp(camera.pitch + input.lookPitch, -maximumPitchRadians, maximumPitchRadians);
    input.lookYaw = input.lookPitch = 0;

    // walking direction on the ground from the keys (or a finger on the screen), relative to where you look
    const forwardX = Math.sin(camera.yaw), forwardZ = -Math.cos(camera.yaw);
    const forwardAmount = input.forward - input.backward + input.touchForward;
    const sideAmount = input.right - input.left + input.touchSide;
    let wishX = forwardX * forwardAmount - forwardZ * sideAmount;
    let wishZ = forwardZ * forwardAmount + forwardX * sideAmount;
    const wishLength = Math.hypot(wishX, wishZ);
    const speed = input.fast ? fastWalkingSpeedMetresPerSecond : walkingSpeedMetresPerSecond;
    // full speed for keys; the joystick walks slower when pushed only part way
    if (wishLength > 1e-6) { const scale = speed * Math.min(1, wishLength) / wishLength; wishX *= scale; wishZ *= scale; }
    const follow = 1 - Math.exp(-secondsElapsed * accelerationRate);
    camera.velocityX += (wishX - camera.velocityX) * follow;
    camera.velocityZ += (wishZ - camera.velocityZ) * follow;

    // move in short substeps, stepping up and sliding along walls after each
    const foot = camera.footPosition;
    const moveX = camera.velocityX * secondsElapsed, moveZ = camera.velocityZ * secondsElapsed;
    const substeps = Math.max(1, Math.ceil(Math.hypot(moveX, moveZ) / maximumSubstepMetres));
    const startX = foot[0], startZ = foot[2];
    for (let step = 0; step < substeps; step++) {
      foot[0] += moveX / substeps;
      foot[2] += moveZ / substeps;
      pushOutOfWalls(foot);
      const support = supportHeightAt(foot[0], foot[2], foot[1]);
      // walking: step up, or stay on stairs going down; in the air: only land
      if (camera.isOnGround ? support > foot[1] - maximumStepUpMetres : support > foot[1]) {
        foot[1] = support;
        camera.isOnGround = true;
        camera.verticalSpeed = 0;
      } else {
        camera.isOnGround = false;
      }
    }

    // hop and fall
    if (input.jumpRequested && camera.isOnGround) {
      camera.verticalSpeed = hopSpeedMetresPerSecond;
      camera.isOnGround = false;
    }
    input.jumpRequested = false;
    if (!camera.isOnGround) {
      camera.verticalSpeed -= gravityMetresPerSecondSquared * secondsElapsed;
      foot[1] += camera.verticalSpeed * secondsElapsed;
      const support = supportHeightAt(foot[0], foot[2], foot[1]);
      if (foot[1] <= support) {
        foot[1] = support;
        camera.verticalSpeed = 0;
        camera.isOnGround = true;
      }
    }

    camera.smoothedFootY += (foot[1] - camera.smoothedFootY) * (1 - Math.exp(-secondsElapsed * eyeSmoothingRate));
    if (camera.isOnGround) camera.bobDistance += Math.hypot(foot[0] - startX, foot[2] - startZ);
    updateEye();
  };

  return camera;
}
