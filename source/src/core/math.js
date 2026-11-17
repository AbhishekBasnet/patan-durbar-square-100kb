// Small math library: scalar helpers, seeded random numbers, gravity and 4x4 matrices.
// Matrices are column-major Float32Arrays (the layout WGSL expects) and every function writes into an
// output array, so the frame loop never allocates. No dependencies.

export const degreesToRadians = Math.PI / 180;
export const gravityMetresPerSecondSquared = 9.81; // shared by walking and falling water

export function clamp(value, low, high) {
  return value < low ? low : value > high ? high : value;
}

export function mix(from, to, amount) {
  return from + (to - from) * amount;
}

// A seeded random number generator (mulberry32): the same seed always builds the same square.
export function createRandom(seed) {
  let state = seed >>> 0;
  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  next.between = (low, high) => low + (high - low) * next();
  return next;
}

// Reverse-Z perspective projection (depth 1 at the near plane, 0 at infinity): much better depth precision
// for a scene that runs from your feet to the far hills.
export function perspectiveReverseZ(out, verticalFieldOfView, aspect, near) {
  const focal = 1 / Math.tan(verticalFieldOfView / 2);
  out.fill(0);
  out[0] = focal / aspect;
  out[5] = focal;
  out[11] = -1;
  out[14] = near;
  return out;
}

// View matrix of a camera at `position` turned by yaw (0 looks north, along -z; positive turns east)
// and pitch (positive looks up).
const lookDirection = [0, 0, -1], worldUp = [0, 1, 0];
export function viewFromYawPitch(out, position, yaw, pitch) {
  lookDirection[0] = Math.sin(yaw) * Math.cos(pitch);
  lookDirection[1] = Math.sin(pitch);
  lookDirection[2] = -Math.cos(yaw) * Math.cos(pitch);
  return viewLookingAlong(out, position, lookDirection, worldUp);
}

// Orthographic projection of the box [left, right] x [bottom, top] x [-near, -far] in view space,
// with depth 0 at the near plane and 1 at the far plane (WebGPU clip space).
export function orthographic(out, left, right, bottom, top, near, far) {
  out.fill(0);
  out[0] = 2 / (right - left);
  out[5] = 2 / (top - bottom);
  out[10] = -1 / (far - near);
  out[12] = -(right + left) / (right - left);
  out[13] = -(top + bottom) / (top - bottom);
  out[14] = -near / (far - near);
  out[15] = 1;
  return out;
}

// View matrix of an eye looking along `direction`, with `up` roughly up on screen.
export function viewLookingAlong(out, eye, direction, up) {
  const length = Math.hypot(direction[0], direction[1], direction[2]);
  const backX = -direction[0] / length, backY = -direction[1] / length, backZ = -direction[2] / length;
  let rightX = up[1] * backZ - up[2] * backY, rightY = up[2] * backX - up[0] * backZ, rightZ = up[0] * backY - up[1] * backX;
  const rightLength = Math.hypot(rightX, rightY, rightZ);
  rightX /= rightLength; rightY /= rightLength; rightZ /= rightLength;
  const upX = backY * rightZ - backZ * rightY, upY = backZ * rightX - backX * rightZ, upZ = backX * rightY - backY * rightX;
  out[0] = rightX; out[1] = upX; out[2] = backX; out[3] = 0;
  out[4] = rightY; out[5] = upY; out[6] = backY; out[7] = 0;
  out[8] = rightZ; out[9] = upZ; out[10] = backZ; out[11] = 0;
  out[12] = -(rightX * eye[0] + rightY * eye[1] + rightZ * eye[2]);
  out[13] = -(upX * eye[0] + upY * eye[1] + upZ * eye[2]);
  out[14] = -(backX * eye[0] + backY * eye[1] + backZ * eye[2]);
  out[15] = 1;
  return out;
}

export function multiplyMatrices(out, left, right) {
  for (let column = 0; column < 4; column++) {
    const r0 = right[column * 4], r1 = right[column * 4 + 1], r2 = right[column * 4 + 2], r3 = right[column * 4 + 3];
    for (let row = 0; row < 4; row++) {
      out[column * 4 + row] = left[row] * r0 + left[4 + row] * r1 + left[8 + row] * r2 + left[12 + row] * r3;
    }
  }
  return out;
}

// General 4x4 inverse (cofactor expansion). Returns false for a singular matrix.
export function invertMatrix(out, m) {
  const [a00, a01, a02, a03, a10, a11, a12, a13, a20, a21, a22, a23, a30, a31, a32, a33] = m;
  const b00 = a00 * a11 - a01 * a10, b01 = a00 * a12 - a02 * a10, b02 = a00 * a13 - a03 * a10;
  const b03 = a01 * a12 - a02 * a11, b04 = a01 * a13 - a03 * a11, b05 = a02 * a13 - a03 * a12;
  const b06 = a20 * a31 - a21 * a30, b07 = a20 * a32 - a22 * a30, b08 = a20 * a33 - a23 * a30;
  const b09 = a21 * a32 - a22 * a31, b10 = a21 * a33 - a23 * a31, b11 = a22 * a33 - a23 * a32;
  let determinant = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
  if (!determinant) return false;
  determinant = 1 / determinant;
  out[0] = (a11 * b11 - a12 * b10 + a13 * b09) * determinant;
  out[1] = (a02 * b10 - a01 * b11 - a03 * b09) * determinant;
  out[2] = (a31 * b05 - a32 * b04 + a33 * b03) * determinant;
  out[3] = (a22 * b04 - a21 * b05 - a23 * b03) * determinant;
  out[4] = (a12 * b08 - a10 * b11 - a13 * b07) * determinant;
  out[5] = (a00 * b11 - a02 * b08 + a03 * b07) * determinant;
  out[6] = (a32 * b02 - a30 * b05 - a33 * b01) * determinant;
  out[7] = (a20 * b05 - a22 * b02 + a23 * b01) * determinant;
  out[8] = (a10 * b10 - a11 * b08 + a13 * b06) * determinant;
  out[9] = (a01 * b08 - a00 * b10 - a03 * b06) * determinant;
  out[10] = (a30 * b04 - a31 * b02 + a33 * b00) * determinant;
  out[11] = (a21 * b02 - a20 * b04 - a23 * b00) * determinant;
  out[12] = (a11 * b07 - a10 * b09 - a12 * b06) * determinant;
  out[13] = (a00 * b09 - a01 * b07 + a02 * b06) * determinant;
  out[14] = (a31 * b01 - a30 * b03 - a32 * b00) * determinant;
  out[15] = (a20 * b03 - a21 * b01 + a22 * b00) * determinant;
  return true;
}
