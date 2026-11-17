// Entry point: opens the GPU, picks the quality preset, builds the square from layout.js, then runs the
// frame loop and the start menu. Depends on every core/ module, square/ and look/lighting.js.

import { openGpu, createRenderer, frameUniformFloatCount } from './core/renderer.js';
import { pickQuality, storeQuality, qualityNames } from './core/quality.js';
import { createInput } from './core/input.js';
import { createWalkingCamera, buildColliders } from './core/camera.js';
import { perspectiveReverseZ, viewFromYawPitch, multiplyMatrices, invertMatrix, degreesToRadians } from './core/math.js';
import { squareBounds, viewpoints } from './square/layout.js';
import { buildMonumentBlockout } from './square/blockout.js';
import { buildSurroundings } from './square/surroundings.js';
import { packBlockInstances } from './square/blocks.js';
import { writeLightingUniforms } from './look/lighting.js';
import { startDevTools } from './dev.js';

const verticalFieldOfViewDegrees = 62;
const nearPlaneMetres = 0.05;
const longestFrameSeconds = 0.1; // a stalled frame never moves the camera further than this
const statsRefreshSeconds = 0.5;

const element = (id) => document.getElementById(id);
const canvas = element('scene');
const statsLine = element('stats');

function showLoadingStep(message, shareDone) {
  element('loading-message').textContent = message;
  element('loading-bar').style.transform = `scaleX(${shareDone})`;
  // let the page paint the new step before the next piece of work blocks the thread
  return new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve)));
}

async function start() {
  await showLoadingStep('Opening the graphics card…', 0.1);
  const { adapter, device, canMeasureGpuTime } = await openGpu();
  const quality = pickQuality(adapter.info);
  device.lost.then((lost) => {
    if (lost.reason !== 'destroyed') showFailure('The graphics device was lost. Reload the page to try again.');
  });

  await showLoadingStep('Laying out the square…', 0.4);
  const blocks = [...buildMonumentBlockout(), ...buildSurroundings()];
  const camera = createWalkingCamera(buildColliders(blocks), squareBounds);

  await showLoadingStep('Lighting the late afternoon…', 0.8);
  const renderer = createRenderer({ device, canMeasureGpuTime, canvas, quality, blockInstancesByShape: packBlockInstances(blocks) });
  addEventListener('resize', renderer.resize);

  // ---- per-frame state, all preallocated
  const frameUniforms = new Float32Array(frameUniformFloatCount);
  const projection = new Float32Array(16), view = new Float32Array(16), viewProjection = new Float32Array(16), inverseViewProjection = new Float32Array(16);
  writeLightingUniforms(frameUniforms, 36);
  let lastTimestamp = 0, elapsedSeconds = 0;
  let statsVisible = false, statsTimer = 0, statsFrames = 0, statsWorstMilliseconds = 0;
  let menuOpen = true;

  const jumpToViewpoint = (index) => {
    const viewpoint = viewpoints[index];
    camera.standAt(viewpoint.x, viewpoint.z, viewpoint.yawDegrees, viewpoint.pitchDegrees);
  };

  const input = createInput(canvas, {
    onAnyInput: () => {},
    toggleStats: () => {
      statsVisible = !statsVisible;
      renderer.measureGpuTime = statsVisible;
      statsLine.textContent = '';
    },
    toggleSound: () => {}, // sound arrives in step 6
    toggleFilmLook: () => {}, // the film look arrives in step 7
    openMenu: () => setMenuOpen(true),
    jumpToViewpoint,
  });

  const writeCameraUniforms = () => {
    perspectiveReverseZ(projection, verticalFieldOfViewDegrees * degreesToRadians, renderer.width / renderer.height, nearPlaneMetres);
    viewFromYawPitch(view, camera.eyePosition, camera.yaw, camera.pitch);
    multiplyMatrices(viewProjection, projection, view);
    invertMatrix(inverseViewProjection, viewProjection);
    frameUniforms.set(viewProjection, 0);
    frameUniforms.set(inverseViewProjection, 16);
    frameUniforms[32] = camera.eyePosition[0];
    frameUniforms[33] = camera.eyePosition[1];
    frameUniforms[34] = camera.eyePosition[2];
    frameUniforms[35] = elapsedSeconds;
    frameUniforms[60] = renderer.width;
    frameUniforms[61] = renderer.height;
    frameUniforms[62] = 1 / renderer.width;
    frameUniforms[63] = 1 / renderer.height;
  };

  const updateStats = (frameMilliseconds) => {
    statsFrames++;
    statsTimer += frameMilliseconds / 1000;
    if (frameMilliseconds > statsWorstMilliseconds) statsWorstMilliseconds = frameMilliseconds;
    if (statsTimer < statsRefreshSeconds) return;
    const gpu = canMeasureGpuTime ? `GPU ${renderer.gpuMilliseconds.toFixed(2)} ms` : 'GPU time unavailable';
    statsLine.textContent = `${Math.round(statsFrames / statsTimer)} fps · worst frame ${statsWorstMilliseconds.toFixed(1)} ms · ${gpu} · ${renderer.width}x${renderer.height} · ${quality.name}`;
    statsTimer = statsFrames = statsWorstMilliseconds = 0;
  };

  const dev = startDevTools({ camera, renderer, statsLine, getQualityName: () => quality.name });

  const frame = (timestamp) => {
    requestAnimationFrame(frame);
    const frameMilliseconds = timestamp - lastTimestamp;
    lastTimestamp = timestamp;
    const secondsElapsed = Math.min(frameMilliseconds / 1000, longestFrameSeconds);
    elapsedSeconds += secondsElapsed;
    input.applyTouchJoystick(secondsElapsed);
    if (!dev?.isFlying()) camera.update(menuOpen ? 0 : secondsElapsed, input);
    dev?.update(secondsElapsed, frameMilliseconds);
    writeCameraUniforms();
    renderer.render(frameUniforms);
    if (statsVisible) updateStats(frameMilliseconds);
  };

  // ---- the menu: Esc, losing the mouse or the corner button open it; the scene keeps drawing behind it
  const enterButton = element('enter');
  const setMenuOpen = (open) => {
    menuOpen = open;
    input.enabled = !open;
    document.body.className = open ? 'menu' : 'walking';
    if (open) {
      input.releaseEverything();
      setTimeout(() => menuOpen && enterButton.focus(), 100);
    }
  };
  enterButton.onclick = () => {
    enterButton.textContent = 'Resume';
    setMenuOpen(false);
    input.capturePointer();
  };
  element('menu-button').onclick = () => setMenuOpen(true);
  document.addEventListener('pointerlockchange', () => {
    if (!document.pointerLockElement && !matchMedia('(pointer:coarse)').matches) setMenuOpen(true);
  });
  element('quality').querySelectorAll('button').forEach((button, index) => {
    if (qualityNames[index] === quality.name) button.className = 'chosen';
    else button.onclick = () => { storeQuality(qualityNames[index]); location.reload(); };
  });

  jumpToViewpoint(0);
  await showLoadingStep('Welcome to Patan', 1);
  setMenuOpen(true);
  requestAnimationFrame((timestamp) => { lastTimestamp = timestamp; requestAnimationFrame(frame); });
}

function showFailure(message) {
  document.body.className = 'loading failed';
  element('loading-message').textContent = message;
}

start().catch((error) => {
  console.error(error);
  showFailure(error.cause ? error.message : 'Failed to start: ' + error.message);
});
