// Entry point: opens the GPU, picks the quality preset, builds the square from layout.js, then runs the
// frame loop and the start menu. Depends on every core/ module, square/ and look/lighting.js.

import { openGpu, createRenderer, frameUniformFloatCount, sunShadowMatrixOffset, skyOcclusionMatrixOffset } from './core/renderer.js';
import { pickQuality, storeQuality, qualityNames, createResolutionScaler } from './core/quality.js';
import { createDetailSelector } from './core/lod.js';
import { createInput } from './core/input.js';
import { createWalkingCamera, buildColliders } from './core/camera.js';
import { perspectiveReverseZ, viewFromYawPitch, multiplyMatrices, invertMatrix, degreesToRadians } from './core/math.js';
import { squareBounds, viewpoints } from './square/layout.js';
import { buildSurroundings } from './square/surroundings.js';
import { addPaving } from './square/paving.js';
import { createPuddleField } from './square/puddles.js';
import { buildMonuments } from './monuments/allMonuments.js';
import { MeshBuilder } from './core/meshBuilder.js';
import { writeLightingUniforms, computeLightMapMatrices } from './look/lighting.js';
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
  const architecture = new MeshBuilder();
  const { solidBlocks, groundHoles } = buildMonuments(architecture);
  const houseBlocks = buildSurroundings(architecture);
  addPaving(architecture, groundHoles);
  const camera = createWalkingCamera(buildColliders([...solidBlocks, ...houseBlocks]), squareBounds, groundHoles);
  const lightMapMatrices = computeLightMapMatrices();

  await showLoadingStep('Lighting the late afternoon…', 0.8);
  const { vertexData, chunkBounds, levelRanges } = architecture.toVertexData();
  const detailSelector = createDetailSelector({ chunkBounds, levelRanges, quality });
  const farDetailLevel = 2;
  const reflectionSelector = createDetailSelector({ chunkBounds, levelRanges, quality, fixedLevel: farDetailLevel });
  const puddleField = createPuddleField(quality);
  const renderer = createRenderer({
    device, canMeasureGpuTime, canvas, quality, lightMapMatrices, architectureVertexData: vertexData, detailSelector, reflectionSelector, puddleField,
  });
  renderer.measureGpuTime = canMeasureGpuTime; // always on: the resolution scaler reads it
  const resolutionScaler = createResolutionScaler({ quality, renderer, canMeasureGpuTime });
  addEventListener('resize', renderer.resize);

  // ---- per-frame state, all preallocated
  const frameUniforms = new Float32Array(frameUniformFloatCount);
  const projection = new Float32Array(16), view = new Float32Array(16), viewProjection = new Float32Array(16), inverseViewProjection = new Float32Array(16);
  // the same camera mirrored in the water plane (y = 0), for the puddle reflection
  const reflectionUniforms = new Float32Array(frameUniformFloatCount);
  const mirroredViewProjection = reflectionUniforms.subarray(0, 16), mirroredEye = new Float64Array(3);
  writeLightingUniforms(frameUniforms, 36);
  frameUniforms.set(lightMapMatrices.sunShadowMatrix, sunShadowMatrixOffset);
  frameUniforms.set(lightMapMatrices.skyOcclusionMatrix, skyOcclusionMatrixOffset);
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
    // mirroring y: the view-projection's y column and the inverse's y row change sign
    reflectionUniforms.set(frameUniforms);
    for (let index = 4; index < 8; index++) reflectionUniforms[index] = -reflectionUniforms[index];
    for (let index = 17; index < 32; index += 4) reflectionUniforms[index] = -reflectionUniforms[index];
    reflectionUniforms[33] = -reflectionUniforms[33];
    mirroredEye[0] = camera.eyePosition[0]; mirroredEye[1] = -camera.eyePosition[1]; mirroredEye[2] = camera.eyePosition[2];
  };

  const isAnyPuddleVisible = () => {
    const bounds = puddleField.puddleBounds;
    for (let offset = 0; offset < bounds.length; offset += 4) {
      if (detailSelector.isSphereVisible(bounds[offset], bounds[offset + 1], bounds[offset + 2], bounds[offset + 3])) return true;
    }
    return false;
  };

  const updateStats = (frameMilliseconds) => {
    statsFrames++;
    statsTimer += frameMilliseconds / 1000;
    if (frameMilliseconds > statsWorstMilliseconds) statsWorstMilliseconds = frameMilliseconds;
    if (statsTimer < statsRefreshSeconds) return;
    const gpu = canMeasureGpuTime ? `GPU ${renderer.gpuMilliseconds.toFixed(2)} ms` : 'GPU time unavailable';
    statsLine.textContent = `${Math.round(statsFrames / statsTimer)} fps · worst frame ${statsWorstMilliseconds.toFixed(1)} ms · ${gpu} · ${renderer.width}x${renderer.height} (${Math.round(renderer.renderScale * 100)}%) · ${quality.name}`;
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
    detailSelector.update(camera.eyePosition, viewProjection);
    const drawReflection = isAnyPuddleVisible();
    if (drawReflection) reflectionSelector.update(mirroredEye, mirroredViewProjection);
    puddleField.update(elapsedSeconds, camera);
    if (!dev?.isBenchmarking()) resolutionScaler.update(frameMilliseconds);
    renderer.render(frameUniforms, reflectionUniforms, drawReflection);
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
