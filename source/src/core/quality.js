// Quality presets (High / Medium / Low), the first-visit pick from the detected GPU and screen, and automatic
// resolution scaling: when the GPU falls behind, the render resolution drops in small steps; if that is not
// enough, the next visit starts one preset lower. The chosen preset is remembered in localStorage; the menu
// buttons change it and reload the page. Depends on nothing; main.js reads the preset before anything is built.

const storageKey = 'patanDurbarQuality';

// Every preset shows the same square; lower ones only remove fine detail and pixels.
export const qualityPresets = {
  high: {
    name: 'high',
    antialiasingSamples: 4,
    maximumRenderPixels: 2560 * 1440,
    shadowMapSize: 4096,
    skyOcclusionMapSize: 1024,
    shadowTapsPerAxis: 3,
    skyOcclusionTapCount: 4,
    reflectionScale: 0.5, // water reflections at half the render size, per side
    rippleEventCapacity: 32,
  },
  // the target: Intel Iris Xe (12th gen Core) and Radeon 680M at 1920x1080, 60 fps
  medium: {
    name: 'medium',
    antialiasingSamples: 4,
    maximumRenderPixels: 1920 * 1080,
    shadowMapSize: 2048,
    skyOcclusionMapSize: 1024,
    shadowTapsPerAxis: 3,
    skyOcclusionTapCount: 4,
    reflectionScale: 0.33,
    rippleEventCapacity: 16,
  },
  // older integrated graphics and phones: starts below full resolution
  low: {
    name: 'low',
    antialiasingSamples: 1,
    maximumRenderPixels: 1280 * 720,
    shadowMapSize: 1024,
    skyOcclusionMapSize: 512,
    shadowTapsPerAxis: 1,
    skyOcclusionTapCount: 2,
    reflectionScale: 0, // no reflection pass: water mirrors the sky and a tint of the buildings
    rippleEventCapacity: 8,
  },
};

export const qualityNames = ['low', 'medium', 'high'];

function readStoredQuality() {
  try {
    return localStorage[storageKey];
  } catch {
    return undefined; // storage blocked: pick again every visit
  }
}

export function storeQuality(name) {
  try {
    localStorage[storageKey] = name;
  } catch {
    // storage blocked: the choice lasts for this visit only
  }
}

// First visit: guess from the GPU. adapterInfo is GPUAdapter.info (vendor and architecture strings).
function guessQualityFromHardware(adapterInfo) {
  const isTouchDevice = matchMedia('(pointer:coarse)').matches;
  if (isTouchDevice) return 'low';
  const vendor = (adapterInfo.vendor || '').toLowerCase();
  const architecture = (adapterInfo.architecture || '').toLowerCase();
  if (vendor.includes('nvidia')) return 'high';
  // Radeon 780M and newer (RDNA 3) manage High; older AMD integrated graphics get the target preset
  if (vendor.includes('amd') && /rdna-?[34]/.test(architecture)) return 'high';
  return 'medium';
}

export function pickQuality(adapterInfo) {
  const stored = readStoredQuality();
  if (qualityPresets[stored]) return qualityPresets[stored];
  const guessed = guessQualityFromHardware(adapterInfo || {});
  storeQuality(guessed);
  return qualityPresets[guessed];
}

// ---- automatic resolution scaling
const gpuBudgetMilliseconds = 14; // above this the resolution steps down (the Medium target on Iris Xe)
const gpuRoomMilliseconds = 10; // below this it steps back up
const frameBudgetMilliseconds = 18; // used instead when the GPU cannot be timed
const scaleCheckSeconds = 1;
const scaleStepDown = 0.92; // per check, applied to each side of the image
const scaleStepUp = 1.04;
const minimumRenderScale = 0.7;
const slowChecksBeforePresetDrop = 5;

export function createResolutionScaler({ quality, renderer, canMeasureGpuTime }) {
  let secondsSinceCheck = 0, timeSum = 0, timeCount = 0, slowChecksAtMinimum = 0;
  return {
    // Called every frame (not while benchmarking: the benchmark holds the resolution fixed).
    update(frameMilliseconds) {
      if (frameMilliseconds > 250) return; // a stall (tab switch, loading) says nothing about the GPU
      timeSum += canMeasureGpuTime ? renderer.gpuMilliseconds : frameMilliseconds;
      timeCount++;
      secondsSinceCheck += frameMilliseconds / 1000;
      if (secondsSinceCheck < scaleCheckSeconds) return;
      const average = timeSum / timeCount, budget = canMeasureGpuTime ? gpuBudgetMilliseconds : frameBudgetMilliseconds;
      secondsSinceCheck = timeSum = timeCount = 0;
      let scale = renderer.renderScale;
      if (average > budget) scale = Math.max(minimumRenderScale, scale * scaleStepDown);
      else if (canMeasureGpuTime && average < gpuRoomMilliseconds) scale = Math.min(1, scale * scaleStepUp);
      if (scale !== renderer.renderScale) {
        renderer.renderScale = scale;
        renderer.resize();
      }
      // still too slow at the lowest resolution: start one preset lower next time
      slowChecksAtMinimum = scale === minimumRenderScale && average > budget ? slowChecksAtMinimum + 1 : 0;
      const lowerPreset = qualityNames[qualityNames.indexOf(quality.name) - 1];
      if (slowChecksAtMinimum >= slowChecksBeforePresetDrop && lowerPreset) storeQuality(lowerPreset);
    },
  };
}
